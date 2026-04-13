from datetime import datetime, timedelta, timezone
from sqlalchemy import func

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from .. import db
from ..models.diet import DietEntry, DietItem
from ..models.user import User
from ..services.diet_coat_service import analyze_food_image, generate_diet_coach_feedback


diet_bp = Blueprint('diet', __name__)
KST = timezone(timedelta(hours=9))


def _now_kst_naive():
    return datetime.now(KST).replace(tzinfo=None)


def _today_kst():
    return datetime.now(KST).date()


def _to_int(value, default=0):
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def _to_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _parse_items(raw_items):
    items = []
    for index, raw in enumerate(raw_items or [], start=1):
        name = (raw.get('name') or '').strip()
        if not name:
            continue
        items.append({
            'name': name,
            'calories': _to_int(raw.get('calories'), 0),
            'protein': _to_float(raw.get('protein'), 0),
            'carbs': _to_float(raw.get('carbs'), 0),
            'fat': _to_float(raw.get('fat'), 0),
            'sort_order': _to_int(raw.get('sort_order'), index),
        })
    return items


def _upsert_items(entry, parsed_items):
    entry.items.clear()
    for item in parsed_items:
        entry.items.append(DietItem(
            food_name=item['name'],
            calories=item['calories'],
            protein_g=item['protein'],
            carbs_g=item['carbs'],
            fat_g=item['fat'],
            sort_order=item['sort_order'],
        ))


def _find_entry_or_404(user_id, entry_id):
    entry = DietEntry.query.filter_by(id=entry_id, user_id=user_id).first()
    if not entry:
        return None, (jsonify({'message': '식단을 찾을 수 없습니다.'}), 404)
    return entry, None


@diet_bp.route('/entries', methods=['GET'])
@jwt_required()
def get_entries():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    query = DietEntry.query.filter_by(user_id=user_id)
    if request.args.get('all') != '1':
        date_str = request.args.get('date')
        if date_str:
            try:
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'message': 'date 파라미터 형식이 올바르지 않습니다. YYYY-MM-DD 형식을 사용하세요.'}), 400
        else:
            target_date = _today_kst()
        query = query.filter(func.date(DietEntry.recorded_at) == target_date)
    entries = query.order_by(DietEntry.recorded_at.desc(), DietEntry.id.desc()).all()
    food_name_rows = (
        db.session.query(
            DietItem.food_name,
            func.max(DietItem.updated_at).label('last_used_at')
        )
        .group_by(DietItem.food_name)
        .order_by(func.max(DietItem.updated_at).desc())
        .limit(25)
        .all()
    )
    food_name_suggestions = [row.food_name for row in food_name_rows]
    goals = {
        'calories': int(getattr(user, 'goal_calories', 2000) or 2000),
        'protein': int(getattr(user, 'goal_protein', 100) or 100),
        'carbs': int(getattr(user, 'goal_carbs', 300) or 300),
        'fat': int(getattr(user, 'goal_fat', 60) or 60),
    }
    return jsonify({'entries': [entry.to_dict() for entry in entries], 'goals': goals, 'food_name_suggestions': food_name_suggestions}), 200


@diet_bp.route('/goals', methods=['PATCH'])
@jwt_required()
def update_goals():
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    user = User.query.get(user_id)
    if not user:
        return jsonify({'message': '사용자 정보를 찾을 수 없습니다.'}), 404

    calories = _to_int(data.get('calories'), user.goal_calories)
    protein = _to_int(data.get('protein'), user.goal_protein)
    carbs = _to_int(data.get('carbs'), user.goal_carbs)
    fat = _to_int(data.get('fat'), user.goal_fat)
    if calories <= 0 or protein < 0 or carbs < 0 or fat < 0:
        return jsonify({'message': '목표치 값이 올바르지 않습니다.'}), 400

    try:
        user.goal_calories = calories
        user.goal_protein = protein
        user.goal_carbs = carbs
        user.goal_fat = fat
        db.session.commit()
        return jsonify({'message': '영양 목표가 수정되었습니다.', 'goals': {
            'calories': int(user.goal_calories),
            'protein': int(user.goal_protein),
            'carbs': int(user.goal_carbs),
            'fat': int(user.goal_fat),
        }}), 200
    except Exception as error:
        db.session.rollback()
        return jsonify({'message': f'서버 오류가 발생했습니다: {str(error)}'}), 500


@diet_bp.route('/entries', methods=['POST'])
@jwt_required()
def create_entry():
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    title = (data.get('title') or '').strip() or _now_kst_naive().strftime('%Y-%m-%d %H시')
    recorded_at = _now_kst_naive()
    recorded_date = (data.get('recorded_date') or '').strip()
    if recorded_date:
        try:
            selected_date = datetime.strptime(recorded_date, '%Y-%m-%d').date()
            now_kst = _now_kst_naive()
            recorded_at = datetime.combine(selected_date, now_kst.time())
        except ValueError:
            return jsonify({'message': 'recorded_date 형식이 올바르지 않습니다. YYYY-MM-DD 형식을 사용하세요.'}), 400
    parsed_items = _parse_items(data.get('items'))

    if not parsed_items:
        return jsonify({'message': '최소 1개 이상의 음식 item이 필요합니다.'}), 400

    try:
        entry = DietEntry(
            user_id=user_id,
            title=title,
            recorded_at=recorded_at,
            is_favorite=bool(data.get('is_favorite', False)),
        )
        _upsert_items(entry, parsed_items)
        db.session.add(entry)
        db.session.commit()
        return jsonify({'message': '식단이 생성되었습니다.', 'entry': entry.to_dict()}), 201
    except Exception as error:
        db.session.rollback()
        return jsonify({'message': f'서버 오류가 발생했습니다: {str(error)}'}), 500


@diet_bp.route('/entries/<int:entry_id>', methods=['PUT'])
@jwt_required()
def update_entry(entry_id):
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    entry, error = _find_entry_or_404(user_id, entry_id)
    if error:
        return error

    parsed_items = _parse_items(data.get('items'))
    title = (data.get('title') or '').strip() or entry.title

    if not parsed_items:
        return jsonify({'message': '최소 1개 이상의 음식 item이 필요합니다.'}), 400

    try:
        entry.title = title
        if 'is_favorite' in data:
            entry.is_favorite = bool(data.get('is_favorite'))
        _upsert_items(entry, parsed_items)
        db.session.commit()
        return jsonify({'message': '식단이 수정되었습니다.', 'entry': entry.to_dict()}), 200
    except Exception as error:
        db.session.rollback()
        return jsonify({'message': f'서버 오류가 발생했습니다: {str(error)}'}), 500


@diet_bp.route('/entries/<int:entry_id>', methods=['DELETE'])
@jwt_required()
def delete_entry(entry_id):
    user_id = int(get_jwt_identity())
    entry, error = _find_entry_or_404(user_id, entry_id)
    if error:
        return error

    try:
        db.session.delete(entry)
        db.session.commit()
        return jsonify({'message': '식단이 삭제되었습니다.'}), 200
    except Exception as error:
        db.session.rollback()
        return jsonify({'message': f'서버 오류가 발생했습니다: {str(error)}'}), 500


@diet_bp.route('/entries/<int:entry_id>/favorite', methods=['PATCH'])
@jwt_required()
def toggle_favorite(entry_id):
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}

    entry, error = _find_entry_or_404(user_id, entry_id)
    if error:
        return error

    try:
        if 'is_favorite' in data:
            entry.is_favorite = bool(data.get('is_favorite'))
        else:
            entry.is_favorite = not bool(entry.is_favorite)
        db.session.commit()
        return jsonify({'message': '즐겨찾기 상태가 변경되었습니다.', 'entry': entry.to_dict()}), 200
    except Exception as error:
        db.session.rollback()
        return jsonify({'message': f'서버 오류가 발생했습니다: {str(error)}'}), 500


@diet_bp.route('/entries/<int:entry_id>/analyze', methods=['POST'])
@jwt_required()
def analyze_entry(entry_id):
    return jsonify({'message': '이 엔드포인트는 더 이상 사용되지 않습니다.', 'use': '/api/diet/ai/analyze-image'}), 410


@diet_bp.route('/ai/analyze-image', methods=['POST'])
@jwt_required()
def analyze_image():
    file = request.files.get('image')
    if not file:
        return jsonify({'message': 'image 파일이 필요합니다.'}), 400

    image_bytes = file.read()
    if not image_bytes:
        return jsonify({'message': '업로드된 이미지가 비어 있습니다.'}), 400

    try:
        result = analyze_food_image(
            image_bytes=image_bytes,
            mime_type=(file.mimetype or 'image/jpeg'),
            filename=(file.filename or 'upload.jpg'),
        )
        return jsonify({'message': 'AI 이미지 분석이 완료되었습니다.', 'items': result.get('items', [])}), 200
    except ValueError as error:
        return jsonify({'message': str(error)}), 400
    except Exception as error:
        return jsonify({'message': f'AI 이미지 분석 중 오류가 발생했습니다: {str(error)}'}), 500


@diet_bp.route('/ai/coach', methods=['POST'])
@jwt_required()
def diet_coach():
    payload = request.get_json(silent=True) or {}
    try:
        result = generate_diet_coach_feedback(payload)
        analyzed_at = _now_kst_naive()
        analyzed_date = (payload.get('selected_date') or '').strip() or _today_kst().strftime('%Y-%m-%d')
        return jsonify({
            'message': 'AI 코치 분석이 완료되었습니다.',
            'feedback': result.get('feedback', ''),
            'analyzed_at': analyzed_at.isoformat(),
            'analyzed_at_label': analyzed_at.strftime('%Y.%m.%d. %H:%M KST'),
            'analyzed_date': analyzed_date,
        }), 200
    except ValueError as error:
        return jsonify({'message': str(error)}), 400
    except Exception as error:
        return jsonify({'message': f'AI 코치 분석 중 오류가 발생했습니다: {str(error)}'}), 500



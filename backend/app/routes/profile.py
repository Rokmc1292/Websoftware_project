from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required
from sqlalchemy.exc import IntegrityError

from .. import db
from ..models.profile import UserProfile
from ..models.social_identity import SocialIdentity
from ..models.user import User


profile_bp = Blueprint('profile', __name__)


def _get_user_and_profile():
    identity = get_jwt_identity()
    user_id = identity.get('id') if isinstance(identity, dict) else identity
    user_id = int(user_id)
    user = User.query.get(user_id)
    if not user:
        return None, None
    if not user.profile:
        user.profile = UserProfile(profile_note='')
        db.session.flush()
    return user, user.profile


def _parse_optional_number(value, field_name):
    if value in (None, ''):
        return None
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        raise ValueError(field_name)
    if parsed < 0:
        raise ValueError(field_name)
    return parsed


@profile_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    user, _profile = _get_user_and_profile()
    if not user:
        return jsonify({'message': '사용자 정보를 찾을 수 없습니다.'}), 404
    db.session.commit()
    return jsonify({'user': user.to_dict()}), 200


@profile_bp.route('/me', methods=['PUT'])
@jwt_required()
def update_me():
    user, profile = _get_user_and_profile()
    if not user:
        return jsonify({'message': '사용자 정보를 찾을 수 없습니다.'}), 404

    data = request.get_json(silent=True) or {}
    has_username = 'username' in data
    has_profile_note = 'profile_note' in data
    has_height_cm = 'height_cm' in data
    has_weight_kg = 'weight_kg' in data
    has_skeletal_muscle_kg = 'skeletal_muscle_kg' in data
    has_body_fat_kg = 'body_fat_kg' in data
    username = (data.get('username') or '').strip()
    profile_note = (data.get('profile_note') or '').strip()
    height_cm = data.get('height_cm')
    weight_kg = data.get('weight_kg')
    skeletal_muscle_kg = data.get('skeletal_muscle_kg')
    body_fat_kg = data.get('body_fat_kg')

    if not any([has_username, has_profile_note, has_height_cm, has_weight_kg, has_skeletal_muscle_kg, has_body_fat_kg]):
        return jsonify({'message': '수정할 정보가 없습니다.'}), 400
    if has_username and not username:
        return jsonify({'message': '닉네임은 필수입니다.'}), 400
    if has_username and len(username) < 2:
        return jsonify({'message': '닉네임은 최소 2자 이상이어야 합니다.'}), 400
    if has_profile_note and len(profile_note) > 150:
        return jsonify({'message': '개인 맞춤 정보는 최대 150자까지 입력할 수 있습니다.'}), 400

    try:
        parsed_height_cm = _parse_optional_number(height_cm, 'height_cm') if has_height_cm else None
        parsed_weight_kg = _parse_optional_number(weight_kg, 'weight_kg') if has_weight_kg else None
        parsed_skeletal_muscle_kg = _parse_optional_number(skeletal_muscle_kg, 'skeletal_muscle_kg') if has_skeletal_muscle_kg else None
        parsed_body_fat_kg = _parse_optional_number(body_fat_kg, 'body_fat_kg') if has_body_fat_kg else None
    except ValueError as error:
        return jsonify({'message': f'{str(error)} 값이 올바르지 않습니다.'}), 400

    try:
        if has_username:
            user.username = username
        if has_profile_note:
            profile.profile_note = profile_note
        if has_height_cm:
            profile.height_cm = parsed_height_cm
        if has_weight_kg:
            profile.weight_kg = parsed_weight_kg
        if has_skeletal_muscle_kg:
            profile.skeletal_muscle_kg = parsed_skeletal_muscle_kg
        if has_body_fat_kg:
            profile.body_fat_kg = parsed_body_fat_kg
        db.session.commit()
        return jsonify({'message': '프로필이 수정되었습니다.', 'user': user.to_dict()}), 200
    except IntegrityError:
        db.session.rollback()
        return jsonify({'message': '이미 사용 중인 닉네임일 수 있습니다.'}), 409
    except Exception as error:
        db.session.rollback()
        return jsonify({'message': f'서버 오류가 발생했습니다: {str(error)}'}), 500


@profile_bp.route('/me', methods=['DELETE'])
@jwt_required()
def delete_me():
    user, _profile = _get_user_and_profile()
    if not user:
        return jsonify({'message': '사용자 정보를 찾을 수 없습니다.'}), 404

    data = request.get_json(silent=True) or {}
    current_password = data.get('current_password', '')
    username = (data.get('username') or '').strip()
    email = (data.get('email') or '').strip()
    identities = SocialIdentity.query.filter_by(user_id=user.id).all()
    is_social_only_user = bool(identities) and all(identity.is_social_only for identity in identities)

    if not is_social_only_user and not current_password:
        return jsonify({'message': '계정 삭제를 위해 현재 비밀번호를 입력해주세요.'}), 400
    if not username or not email:
        return jsonify({'message': '계정 삭제를 위해 닉네임과 이메일을 모두 입력해주세요.'}), 400
    if username != (user.username or ''):
        return jsonify({'message': '닉네임이 현재 계정 정보와 일치하지 않습니다.'}), 400
    if email != (user.email or ''):
        return jsonify({'message': '이메일이 현재 계정 정보와 일치하지 않습니다.'}), 400
    if not is_social_only_user and not user.check_password(current_password):
        return jsonify({'message': '현재 비밀번호가 올바르지 않습니다.'}), 400

    try:
        db.session.delete(user)
        db.session.commit()
        return jsonify({'message': '계정이 삭제되었습니다.'}), 200
    except Exception as error:
        db.session.rollback()
        return jsonify({'message': f'서버 오류가 발생했습니다: {str(error)}'}), 500


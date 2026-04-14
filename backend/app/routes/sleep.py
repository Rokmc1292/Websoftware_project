from datetime import datetime
from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity

from app import db
from app.models.sleep_record import SleepRecord
from app.services.sleep_coach_service import generate_sleep_coach_feedback

sleep_bp = Blueprint("sleep", __name__)

# Temporary policy (Option B):
# - 현재 sleep 라우트/모델은 사용자 스코프(FK/JWT 기반 필터)를 완전 적용하지 않은 상태다.
# - 계정 삭제 시 수면 데이터의 사용자별 완전 정리는 별도 마이그레이션 이슈로 진행한다.
# - 본 정책은 수면 도메인 사용자 스코프 개편 완료 시 제거/대체한다.


def _validate_required_keys(payload, required_keys):
    for key in required_keys:
        if key not in payload:
            return key
    return None


def _parse_record_date(date_text):
    return datetime.strptime(date_text, "%Y-%m-%d").date()


def _get_current_user_id():
    identity = get_jwt_identity()
    if isinstance(identity, dict):
        identity = identity.get("id")
    if identity is None:
        raise ValueError("JWT identity is missing")
    identity_value = str(identity)
    return int(identity_value)


@sleep_bp.route("/sleep-records", methods=["GET"])
@jwt_required()
def get_sleep_records():
    try:
        user_id = _get_current_user_id()

        records = (
            SleepRecord.query
            .filter_by(user_id=user_id)
            .order_by(SleepRecord.record_date.asc())
            .all()
        )

        return jsonify({
            "success": True,
            "records": [record.to_dict() for record in records]
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"조회 실패: {str(e)}"
        }), 500


@sleep_bp.route("/sleep-records/<string:record_date>", methods=["GET"])
@jwt_required()
def get_sleep_record_by_date(record_date):
    try:
        user_id = _get_current_user_id()
        parsed_date = _parse_record_date(record_date)

        record = SleepRecord.query.filter_by(
            user_id=user_id,
            record_date=parsed_date
        ).first()

        if not record:
            return jsonify({
                "success": True,
                "record": None
            }), 200

        return jsonify({
            "success": True,
            "record": record.to_dict()
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "message": f"조회 실패: {str(e)}"
        }), 500


@sleep_bp.route("/sleep-records", methods=["POST"])
@jwt_required()
def save_sleep_record():
    try:
        user_id = _get_current_user_id()
        payload = request.get_json() or {}

        required_keys = [
            "date",
            "bedHour",
            "bedMinute",
            "wakeHour",
            "wakeMinute",
            "sleepHours",
            "satisfaction",
            "memo",
            "sleepQuality",
            "freshness",
            "growth",
            "missionRate",
            "goals",
        ]

        missing_key = _validate_required_keys(payload, required_keys)
        if missing_key:
            return jsonify({
                "success": False,
                "message": f"필수 값이 없습니다: {missing_key}"
            }), 400

        parsed_date = _parse_record_date(payload["date"])

        record = SleepRecord.query.filter_by(
            user_id=user_id,
            record_date=parsed_date
        ).first()

        if record:
            record.bed_hour = int(payload["bedHour"])
            record.bed_minute = int(payload["bedMinute"])
            record.wake_hour = int(payload["wakeHour"])
            record.wake_minute = int(payload["wakeMinute"])
            record.sleep_hours = float(payload["sleepHours"])
            record.satisfaction = float(payload["satisfaction"])
            record.memo = payload.get("memo", "")
            record.sleep_quality = int(payload["sleepQuality"])
            record.freshness = int(payload["freshness"])
            record.growth = int(payload["growth"])
            record.mission_rate = int(payload["missionRate"])
            record.set_goals(payload.get("goals", []))
        else:
            record = SleepRecord(
                user_id=user_id,
                record_date=parsed_date,
                bed_hour=int(payload["bedHour"]),
                bed_minute=int(payload["bedMinute"]),
                wake_hour=int(payload["wakeHour"]),
                wake_minute=int(payload["wakeMinute"]),
                sleep_hours=float(payload["sleepHours"]),
                satisfaction=float(payload["satisfaction"]),
                memo=payload.get("memo", ""),
                sleep_quality=int(payload["sleepQuality"]),
                freshness=int(payload["freshness"]),
                growth=int(payload["growth"]),
                mission_rate=int(payload["missionRate"]),
            )
            record.set_goals(payload.get("goals", []))
            db.session.add(record)

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "수면 기록이 저장되었습니다.",
            "record": record.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({
            "success": False,
            "message": f"저장 실패: {str(e)}"
        }), 500


@sleep_bp.route("/sleep-coach", methods=["POST"])
@jwt_required()
def sleep_coach():
    try:
        payload = request.get_json() or {}

        required_keys = [
            "sleepHours",
            "satisfaction",
            "memo",
            "missionRate",
            "sleepQuality",
            "freshness",
            "growth",
            "bedHour",
            "bedMinute",
            "wakeHour",
            "wakeMinute",
        ]

        missing_key = _validate_required_keys(payload, required_keys)
        if missing_key:
            return jsonify({
                "success": False,
                "coachComment": f"필수 값이 없습니다: {missing_key}"
            }), 400

        if not current_app.config.get("GIL_ANTHROPIC_API_KEY"):
            return jsonify({
                "success": False,
                "coachComment": "GIL_ANTHROPIC_API_KEY가 설정되지 않았습니다."
            }), 500

        result = generate_sleep_coach_feedback(current_app.config, payload)

        recommended_workout = result.get("recommended_workout", [])
        avoid_workout = result.get("avoid_workout", [])

        recommended_text = "\n- " + "\n- ".join(recommended_workout) if recommended_workout else "\n- 없음"
        avoid_text = "\n- " + "\n- ".join(avoid_workout) if avoid_workout else "\n- 없음"

        coach_comment = (
            f"오늘 상태 요약: {result.get('summary', '')}\n\n"
            f"추천 운동 강도: {result.get('exercise_intensity', '')}\n\n"
            f"추천 운동:{recommended_text}\n\n"
            f"피해야 할 운동:{avoid_text}\n\n"
            f"수면 피드백:\n{result.get('sleep_feedback', '')}\n\n"
            f"코치 한마디:\n{result.get('coach_message', '')}\n\n"
            f"오늘 실천할 것:\n{result.get('today_action', '')}"
        )

        if result.get("warning_note"):
            coach_comment += f"\n\n주의:\n{result['warning_note']}"

        return jsonify({
            "success": True,
            "coachComment": coach_comment,
            "coachData": result
        }), 200

    except Exception as e:
        print("sleep_coach error:", str(e))
        return jsonify({
            "success": False,
            "coachComment": f"서버 오류: {str(e)}"
        }), 500
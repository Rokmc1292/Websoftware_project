# stats.py — 통계 조회 API 엔드포인트 정의
# 이 파일은 /api/stats/* 경로를 담당하는 Flask 블루프린트
#
# 엔드포인트 목록:
#   GET /api/stats/monthly?year=YYYY&month=MM
#       → 특정 월의 날짜별 운동/식단/수면 기록 존재 여부 반환 (캘린더용)
#   GET /api/stats/daily?date=YYYY-MM-DD
#       → 특정 날짜의 운동/식단/수면 상세 기록 모두 반환 (날짜 클릭 상세보기용)

from flask import Blueprint, request, jsonify  # Flask 핵심 도구
# Blueprint : URL 그룹을 모듈로 나누는 도구
# request  : 클라이언트의 요청 데이터(쿼리스트링, Body 등) 접근
# jsonify  : Python 딕셔너리 → JSON HTTP 응답으로 변환

from flask_jwt_extended import jwt_required, get_jwt_identity
# jwt_required    : 이 데코레이터가 붙은 API는 JWT 토큰이 없으면 401 응답
# get_jwt_identity: 현재 로그인한 사용자의 identity(user.id 문자열) 추출

from datetime import date, timedelta  # 날짜·시간 처리 도구
# date      : 날짜만 다루는 클래스 (예: 2024-06-01)
# timedelta : 날짜 간격을 나타내는 클래스 (예: 하루 = timedelta(days=1))

import calendar  # 달력 관련 유틸리티 — monthrange()로 월의 마지막 날 계산

# SQLAlchemy의 func : SQL 함수(DATE(), COUNT() 등)를 Python에서 호출하기 위한 도구
from sqlalchemy import func

# db : SQLAlchemy 객체 — DB 세션 관리 (조회, 커밋, 롤백 등)
from .. import db

# 각 기능의 DB 모델 클래스를 불러옴
from ..models.workout import WorkoutSession  # 운동 세션 모델
from ..models.diet import DietEntry          # 식단 기록 모델
from ..models.sleep_record import SleepRecord  # 수면 기록 모델

# ─────────────────────────────────────────────
# 블루프린트 생성
# ─────────────────────────────────────────────
# 'stats'라는 이름의 블루프린트 생성
# app/__init__.py에서 url_prefix='/api/stats'로 등록됨
# 예: @stats_bp.route('/monthly') → 실제 URL: /api/stats/monthly
stats_bp = Blueprint('stats', __name__)


def _get_current_user_id():
    identity = get_jwt_identity()
    if isinstance(identity, dict):
        identity = identity.get('id')
    if identity is None:
        raise ValueError('JWT identity is missing')
    return int(identity)


# =============================================================================
# 월별 기록 존재 여부 조회 API
# GET /api/stats/monthly?year=2024&month=6
# =============================================================================
# 캘린더에서 각 날짜에 점(dot)을 표시하기 위해 필요한 데이터
# 해당 월의 모든 날짜를 순회하며 운동/식단/수면 기록이 있는지 확인
# 반환 예시:
# {
#   "year": 2024, "month": 6,
#   "days": {
#     "2024-06-01": { "workout": true, "diet": true, "sleep": false },
#     "2024-06-02": { "workout": false, "diet": true, "sleep": true },
#     ...
#   }
# }
@stats_bp.route('/monthly', methods=['GET'])  # GET 요청만 허용
@jwt_required()  # JWT 토큰이 없으면 자동으로 401 응답 — 로그인 필수
def get_monthly_stats():
    """
    특정 월의 날짜별 기록 존재 여부를 반환 (로그인한 사용자 본인 데이터만)
    캘린더 각 날짜에 운동/식단/수면 점(dot) 표시용 데이터
    """

    # get_jwt_identity() : JWT 토큰에서 현재 로그인한 사용자 ID를 문자열로 추출
    # int()으로 변환해 정수 user_id로 사용
    user_id = _get_current_user_id()

    # ── 쿼리스트링 파라미터 읽기 ──
    # request.args.get('year') : URL의 ?year=2024 에서 '2024'를 문자열로 읽음
    # 파라미터가 없으면 현재 연도·월을 기본값으로 사용
    today = date.today()  # 오늘 날짜 (예: 2024-06-15)

    try:
        # int() : 문자열 '2024'를 정수 2024로 변환
        year = int(request.args.get('year', today.year))
        month = int(request.args.get('month', today.month))
    except ValueError:
        # 정수로 변환할 수 없는 값이 들어왔을 때 400 에러 응답
        return jsonify({'success': False, 'message': '연도와 월은 숫자여야 합니다.'}), 400

    # 월 범위 검사 (1 ≤ month ≤ 12)
    if not (1 <= month <= 12):
        return jsonify({'success': False, 'message': '월은 1~12 사이여야 합니다.'}), 400

    # ── 해당 월의 첫날과 마지막 날 계산 ──
    first_day = date(year, month, 1)  # 예: 2024-06-01
    # calendar.monthrange(year, month)[1] : 해당 월의 마지막 날짜 숫자
    # 예: 6월→30, 2월→28 또는 29(윤년 자동 계산)
    last_day = date(year, month, calendar.monthrange(year, month)[1])  # 예: 2024-06-30

    # ── 운동 기록이 있는 날짜 집합 조회 ──
    # 오류가 발생해도 500을 반환하지 않고 빈 집합으로 안전하게 처리
    try:
        # .with_entities(WorkoutSession.session_date) : 날짜 컬럼만 선택 (데이터 최소화)
        # .filter(user_id == user_id) : 로그인한 사용자의 기록만 필터링
        # .between(first_day, last_day) : 해당 월 범위만 필터링 (SQL BETWEEN)
        # .distinct() : 같은 날짜에 여러 세션이 있어도 날짜 하나만 남김
        workout_dates = set(
            row[0]  # 조회 결과 tuple에서 날짜만 추출
            for row in WorkoutSession.query
                .with_entities(WorkoutSession.session_date)
                .filter(
                    WorkoutSession.user_id == user_id,  # 현재 로그인 사용자 것만
                    WorkoutSession.session_date.between(first_day, last_day),
                )
                .distinct()
                .all()
        )
    except Exception as e:
        # DB 오류(컬럼명 불일치, 연결 오류 등)가 발생해도 운동 점만 안 뜨게 처리
        print(f'[stats/monthly] 운동 조회 오류: {e}')
        workout_dates = set()

    # ── 식단 기록이 있는 날짜 집합 조회 ──
    # DietEntry.recorded_at 은 DateTime(날짜+시간) 타입
    # func.date() : SQL의 DATE() 함수 — DateTime에서 날짜(YYYY-MM-DD)만 추출
    try:
        diet_date_rows = (
            db.session.query(func.date(DietEntry.recorded_at))
            .filter(
                DietEntry.user_id == user_id,  # 현재 로그인 사용자 것만
                func.date(DietEntry.recorded_at) >= first_day,
                func.date(DietEntry.recorded_at) <= last_day,
            )
            .distinct()
            .all()
        )

        # MySQL의 DATE() 함수 반환값이 문자열('2024-06-01')일 수도 있고
        # date 객체일 수도 있어서 통일하여 집합으로 만듦
        diet_dates = set()
        for row in diet_date_rows:
            val = row[0]       # ('2024-06-01',) 튜플에서 첫 번째 요소 추출
            if val is None:
                continue       # NULL 값이면 건너뜀
            # 문자열이면 date 객체로 변환, 이미 date 이면 그대로 사용
            diet_dates.add(
                date.fromisoformat(val) if isinstance(val, str) else val
            )
    except Exception as e:
        print(f'[stats/monthly] 식단 조회 오류: {e}')
        diet_dates = set()

    # ── 수면 기록이 있는 날짜 집합 조회 ──
    try:
        sleep_dates = set(
            row[0]
            for row in SleepRecord.query
                .with_entities(SleepRecord.record_date)
                .filter(
                    SleepRecord.user_id == user_id,
                    SleepRecord.record_date.between(first_day, last_day)
                )
                .all()
        )
    except Exception as e:
        print(f'[stats/monthly] 수면 조회 오류: {e}')
        sleep_dates = set()

    # ── 날짜별 기록 존재 여부 딕셔너리 구성 ──
    # 해당 월의 첫날부터 마지막 날까지 하루씩 순회하며 딕셔너리를 만듦
    days_data = {}  # 결과 딕셔너리 (키: '2024-06-01', 값: {workout, diet, sleep})

    current = first_day  # 순회 시작 날짜를 해당 월 1일로 설정
    while current <= last_day:
        date_str = current.isoformat()  # date 객체 → '2024-06-01' 문자열 변환

        days_data[date_str] = {
            # 해당 날짜가 집합 안에 있으면 True, 없으면 False
            # True → 캘린더에 해당 색깔 점이 표시됨
            'workout': current in workout_dates,
            'diet': current in diet_dates,
            'sleep': current in sleep_dates,
        }

        current += timedelta(days=1)  # 하루씩 앞으로 이동 (timedelta = 날짜 간격)

    # ── 성공 응답 반환 ──
    return jsonify({
        'success': True,
        'year': year,       # 조회한 연도
        'month': month,     # 조회한 월
        'days': days_data,  # 날짜별 기록 존재 여부 딕셔너리
    }), 200


# =============================================================================
# 특정 날짜 상세 기록 조회 API
# GET /api/stats/daily?date=2024-06-01
# =============================================================================
# 캘린더에서 날짜를 클릭했을 때 해당 날짜의 상세 기록을 모두 반환
# 운동 세션 목록 + 식단 기록 목록 + 수면 기록을 한 번에 반환
@stats_bp.route('/daily', methods=['GET'])  # GET 요청만 허용
@jwt_required()  # JWT 토큰이 없으면 401 응답
def get_daily_stats():
    """
    특정 날짜의 운동/식단/수면 상세 기록을 반환 (로그인한 사용자 본인 데이터만)
    캘린더에서 날짜를 클릭했을 때 팝업(모달)에 표시되는 데이터
    """

    # get_jwt_identity() : JWT 토큰에서 현재 로그인한 사용자 ID 추출
    user_id = _get_current_user_id()

    # ── 쿼리스트링에서 날짜 파라미터 읽기 ──
    date_str = request.args.get('date')  # ?date=2024-06-01 에서 '2024-06-01' 추출

    # 날짜 파라미터가 없으면 400 에러 응답
    if not date_str:
        return jsonify({
            'success': False,
            'message': 'date 파라미터가 필요합니다. (예: ?date=2024-06-01)'
        }), 400

    try:
        # 문자열 '2024-06-01' → Python date 객체로 변환
        target_date = date.fromisoformat(date_str)
    except ValueError:
        # 날짜 형식이 올바르지 않을 때 (예: '2024-13-01', 'abcd')
        return jsonify({
            'success': False,
            'message': '날짜 형식이 올바르지 않습니다. YYYY-MM-DD 형식으로 입력해주세요.'
        }), 400

    # ── 해당 날짜의 운동 세션 조회 ──
    try:
        # WorkoutSession.session_date == target_date : 날짜가 일치하는 세션만
        # WorkoutSession.user_id == user_id          : 현재 로그인 사용자 것만
        workout_sessions = (
            WorkoutSession.query
            .filter(
                WorkoutSession.user_id == user_id,
                WorkoutSession.session_date == target_date,
            )
            .order_by(WorkoutSession.created_at.asc())  # 생성 순서대로 정렬
            .all()
        )
    except Exception as e:
        print(f'[stats/daily] 운동 조회 오류: {e}')
        workout_sessions = []  # 오류 시 빈 리스트 반환

    # ── 해당 날짜의 식단 기록 조회 ──
    try:
        # func.date(DietEntry.recorded_at) : DateTime → DATE 변환 후 날짜 비교
        diet_entries = (
            DietEntry.query
            .filter(
                DietEntry.user_id == user_id,
                func.date(DietEntry.recorded_at) == target_date,
            )
            .order_by(DietEntry.recorded_at.asc())  # 기록 시간 순서대로 정렬
            .all()
        )
    except Exception as e:
        print(f'[stats/daily] 식단 조회 오류: {e}')
        diet_entries = []  # 오류 시 빈 리스트 반환

    # ── 해당 날짜의 수면 기록 조회 ──
    try:
        # 수면 기록은 날짜당 하나 (unique=True)이므로 .first() 사용
        sleep_record = (
            SleepRecord.query
            .filter(
                SleepRecord.user_id == user_id,
                SleepRecord.record_date == target_date
            )
            .first()  # 없으면 None 반환
        )
    except Exception as e:
        print(f'[stats/daily] 수면 조회 오류: {e}')
        sleep_record = None  # 오류 시 수면 기록 없음으로 처리

    # ── 성공 응답 반환 ──
    return jsonify({
        'success': True,
        'date': date_str,  # 조회한 날짜 문자열

        # 운동 세션 목록 — 각 세션을 to_dict()로 딕셔너리 변환 (기록 없으면 [])
        'workout': [session.to_dict() for session in workout_sessions],

        # 식단 기록 목록 — 각 항목을 to_dict()로 딕셔너리 변환 (기록 없으면 [])
        'diet': [entry.to_dict() for entry in diet_entries],

        # 수면 기록 — 하나이거나 없음 (없으면 null)
        'sleep': sleep_record.to_dict() if sleep_record else None,
    }), 200

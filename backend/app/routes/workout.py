# workout.py — 운동 기록 관련 API 엔드포인트 정의
# Flask 블루프린트를 사용해 /api/workout/* 경로를 모듈화
#
# 엔드포인트 목록:
#   GET    /api/workout/sessions              — 내 모든 세션 목록 조회 (검색/필터/페이지네이션)
#   POST   /api/workout/sessions              — 새 세션 + 세트 생성
#   GET    /api/workout/sessions/<id>         — 특정 세션 상세 조회
#   PUT    /api/workout/sessions/<id>         — 특정 세션 수정
#   DELETE /api/workout/sessions/<id>         — 특정 세션 삭제
#   POST   /api/workout/sessions/<id>/analyze — 특정 세션 AI 분석 요청
#   POST   /api/workout/sessions/<id>/favorite — 즐겨찾기 토글
#   GET    /api/workout/exercises             — 내가 했던 운동 이름 목록 (자동완성용)
#   GET    /api/workout/exercises/<name>/best — 특정 운동의 개인 최고 기록 조회

from flask import Blueprint, request, jsonify  # Flask 핵심 도구
# Blueprint : URL 그룹화 도구
# request  : 클라이언트 요청 데이터(Body, Header 등) 접근
# jsonify  : Python 딕셔너리 → JSON HTTP 응답 변환

# jwt_required : 이 데코레이터가 붙은 API는 JWT 토큰 없이 접근 불가
# get_jwt_identity : 현재 로그인한 사용자의 identity (user.id 문자열) 추출
from flask_jwt_extended import jwt_required, get_jwt_identity

# db : SQLAlchemy 객체 — DB 세션 관리 (commit, rollback 등)
from .. import db

# WorkoutSession, WorkoutSet : DB 모델 클래스
from ..models.workout import WorkoutSession, WorkoutSet

# analyze_workout : Claude AI 분석 함수 (services/ai_coach.py에 정의)
from ..services.ai_coach import analyze_workout

# date : 날짜 전용 클래스 (datetime.date) — session_date 저장에 사용
from datetime import date

# sqlalchemy 함수 임포트 — 집계(func.max)와 개별 컬럼 조회(distinct)에 사용
from sqlalchemy import func, distinct

# ─────────────────────────────────────────────
# 블루프린트 생성
# ─────────────────────────────────────────────
# Blueprint('workout', __name__) : 'workout'이라는 이름의 블루프린트 생성
# app/__init__.py에서 url_prefix='/api/workout'으로 등록됨
workout_bp = Blueprint('workout', __name__)


# =============================================================================
# 세션 목록 조회 API
# GET /api/workout/sessions
# =============================================================================
@workout_bp.route('/sessions', methods=['GET'])  # GET 요청 — 데이터 조회
@jwt_required()  # JWT 토큰이 없으면 자동으로 401 응답 반환
def get_sessions():
    """
    현재 로그인한 사용자의 모든 운동 세션을 최신순으로 반환
    성공 응답(200): { "sessions": [ {...}, {...}, ... ] }
    """

    # get_jwt_identity() : 로그인 시 발급된 JWT 토큰에서 사용자 ID를 추출
    # create_access_token(identity=str(user.id)) 로 발급했으므로 문자열 반환
    current_user_id = int(get_jwt_identity())  # 문자열 → 정수로 변환

    # DB에서 이 사용자의 모든 세션을 날짜 내림차순(최신순)으로 조회
    # filter_by() : user_id가 일치하는 행만 선택
    # order_by() : session_date 기준 내림차순(.desc()) 정렬
    sessions = WorkoutSession.query.filter_by(user_id=current_user_id)\
        .order_by(WorkoutSession.session_date.desc())\
        .all()  # .all() : 조건에 맞는 모든 행을 리스트로 반환

    # 각 세션 객체를 딕셔너리로 변환해 JSON 응답으로 반환
    return jsonify({
        'sessions': [s.to_dict() for s in sessions]
        # 리스트 컴프리헨션: sessions의 각 요소(s)를 s.to_dict()로 변환한 새 리스트 생성
    }), 200  # HTTP 200 : OK (성공적인 조회)


# =============================================================================
# 세션 생성 API
# POST /api/workout/sessions
# =============================================================================
@workout_bp.route('/sessions', methods=['POST'])  # POST 요청 — 새 데이터 생성
@jwt_required()  # JWT 토큰 필수
def create_session():
    """
    새 운동 세션과 해당 세션의 세트들을 한 번에 저장
    요청 Body(JSON):
    {
        "session_date": "2024-06-01",  # 필수
        "title": "등·이두 데이",        # 선택
        "memo": "오늘 컨디션 좋음",      # 선택
        "duration_min": 60,            # 선택
        "exercises": [                 # 선택 (없으면 빈 세션만 생성)
            {
                "name": "벤치프레스",
                "sets": [
                    { "weight_kg": 60, "reps": 10 },
                    { "weight_kg": 65, "reps": 8 }
                ]
            }
        ]
    }
    성공 응답(201): { "message": "...", "session": {...} }
    """

    # 현재 로그인한 사용자 ID 추출
    current_user_id = int(get_jwt_identity())

    # 요청 Body를 Python 딕셔너리로 파싱
    data = request.get_json(silent=True)  # silent=True : 파싱 실패 시 예외 대신 None 반환

    # 요청 Body가 없거나 JSON 형식이 아닌 경우
    if not data:
        return jsonify({'message': '요청 데이터가 올바르지 않습니다.'}), 400

    # 필수 항목: session_date 검증
    session_date_str = data.get('session_date', '')  # 날짜 문자열 (예: "2024-06-01")

    if not session_date_str:
        # 날짜가 없으면 저장 불가 — 오류 반환
        return jsonify({'message': '운동 날짜(session_date)는 필수입니다.'}), 400

    try:
        # "2024-06-01" 형식의 문자열을 Python date 객체로 변환
        # fromisoformat() : ISO 8601 형식 문자열을 date 객체로 파싱
        session_date = date.fromisoformat(session_date_str)

    except ValueError:
        # 날짜 형식이 잘못된 경우 (예: "06-01-2024", "오늘" 등)
        return jsonify({'message': '날짜 형식이 올바르지 않습니다. YYYY-MM-DD 형식으로 입력해주세요.'}), 400

    try:
        # ─────────────────────────────────────────────
        # 1단계: WorkoutSession 객체 생성 및 저장
        # ─────────────────────────────────────────────

        # 새 WorkoutSession 객체 생성 — 아직 DB에 저장되지 않은 상태
        new_session = WorkoutSession(
            user_id=current_user_id,  # 현재 로그인한 사용자의 세션
            session_date=session_date,  # 운동 날짜
            title=data.get('title'),  # 제목 (없으면 None)
            memo=data.get('memo'),  # 메모 (없으면 None)
            duration_min=data.get('duration_min'),  # 운동 시간(분) (없으면 None)
        )

        # DB 세션에 추가 — 아직 실제 DB에 쓰지 않음 (commit 전)
        db.session.add(new_session)

        # flush() : DB에 INSERT SQL을 실행하지만 트랜잭션은 열린 상태로 유지
        # 이 시점에 new_session.id가 자동 할당되어 세트 생성 시 참조 가능
        db.session.flush()

        # ─────────────────────────────────────────────
        # 2단계: 각 종목(exercise)과 세트(set) 저장
        # ─────────────────────────────────────────────

        # exercises : 요청 Body의 운동 종목 목록 (없으면 빈 리스트)
        exercises = data.get('exercises', [])

        for exercise in exercises:
            # 종목 이름 추출 — 없거나 빈 문자열이면 이 종목은 건너뜀
            exercise_name = exercise.get('name', '').strip()

            if not exercise_name:
                continue  # 종목 이름이 없으면 다음 종목으로 넘어감

            # 이 종목의 세트 목록
            sets = exercise.get('sets', [])

            # muscle_group : 이 종목의 운동 부위 (종목 단위로 지정, 세트마다 동일)
            muscle_group = exercise.get('muscle_group')

            for set_index, set_data in enumerate(sets):
                # enumerate() : 인덱스와 값을 같이 반환
                # set_index=0이면 1세트, 1이면 2세트 ...

                # set_number : 1부터 시작하는 세트 번호 (인덱스 + 1)
                set_number = set_index + 1

                # 새 WorkoutSet 객체 생성
                new_set = WorkoutSet(
                    session_id=new_session.id,  # flush()로 할당된 세션 ID 참조
                    exercise_name=exercise_name,  # 종목 이름
                    set_number=set_number,  # 세트 번호

                    # weight_kg : 중량 (없으면 None — 맨몸 운동)
                    # set_data.get()은 키가 없어도 오류 없이 None 반환
                    weight_kg=set_data.get('weight_kg'),

                    # reps : 반복 횟수
                    reps=set_data.get('reps'),

                    # duration_sec : 시간 기반 운동의 지속 시간(초)
                    duration_sec=set_data.get('duration_sec'),

                    # rest_sec : 휴식 시간(초)
                    rest_sec=set_data.get('rest_sec'),

                    # muscle_group : 운동 부위 (종목 단위 — 각 세트에 동일하게 적용)
                    muscle_group=muscle_group,
                )

                # DB 세션에 새 세트 추가
                db.session.add(new_set)

        # ─────────────────────────────────────────────
        # 3단계: 모든 변경사항을 DB에 최종 저장 (커밋)
        # ─────────────────────────────────────────────

        # commit() : 세션과 세트 INSERT를 포함한 모든 변경사항을 DB에 영구 저장
        db.session.commit()

        # 성공 응답 반환 — 생성된 세션 정보(세트 포함) 반환
        # HTTP 201 : Created (새 리소스가 성공적으로 생성됨)
        return jsonify({
            'message': '운동 세션이 저장되었습니다.',
            'session': new_session.to_dict(),  # 생성된 세션 정보 (세트 포함)
        }), 201

    except Exception as error:
        # 예상치 못한 서버 오류 발생 시 트랜잭션 롤백 후 오류 응답
        db.session.rollback()  # DB를 이전 상태로 되돌림 — 부분 저장 방지
        return jsonify({'message': f'서버 오류가 발생했습니다: {str(error)}'}), 500


# =============================================================================
# 세션 상세 조회 API
# GET /api/workout/sessions/<session_id>
# =============================================================================
@workout_bp.route('/sessions/<int:session_id>', methods=['GET'])  # <int:session_id> : URL에서 정수형 ID 추출
@jwt_required()
def get_session(session_id):
    """
    특정 운동 세션의 상세 정보를 반환 (세트 목록 포함)
    성공 응답(200): { "session": {...} }
    실패 응답(404): { "message": "세션을 찾을 수 없습니다." }
    """

    current_user_id = int(get_jwt_identity())  # 현재 사용자 ID 추출

    # DB에서 session_id로 세션 조회
    # .get() : 기본 키로 빠르게 조회 — 없으면 None 반환
    session = WorkoutSession.query.get(session_id)

    # 세션이 없거나 다른 사람의 세션인 경우
    if not session or session.user_id != current_user_id:
        # HTTP 404 : Not Found — 요청한 리소스가 존재하지 않음
        return jsonify({'message': '운동 세션을 찾을 수 없습니다.'}), 404

    # 세션 정보를 딕셔너리로 변환해 반환
    return jsonify({'session': session.to_dict()}), 200


# =============================================================================
# 세션 삭제 API
# DELETE /api/workout/sessions/<session_id>
# =============================================================================
@workout_bp.route('/sessions/<int:session_id>', methods=['DELETE'])  # DELETE 요청 — 데이터 삭제
@jwt_required()
def delete_session(session_id):
    """
    특정 운동 세션을 삭제 (관련 세트도 cascade로 자동 삭제됨)
    성공 응답(200): { "message": "삭제되었습니다." }
    실패 응답(404): { "message": "세션을 찾을 수 없습니다." }
    """

    current_user_id = int(get_jwt_identity())  # 현재 사용자 ID 추출

    # 삭제할 세션 조회
    session = WorkoutSession.query.get(session_id)

    # 세션이 없거나 다른 사람의 세션인 경우 — 삭제 불가
    if not session or session.user_id != current_user_id:
        return jsonify({'message': '운동 세션을 찾을 수 없습니다.'}), 404

    try:
        # db.session.delete() : 이 세션을 DB 세션에서 삭제 대상으로 표시
        db.session.delete(session)

        # commit() : 실제 DELETE SQL 실행 — workout_sets도 CASCADE로 함께 삭제됨
        db.session.commit()

        return jsonify({'message': '운동 세션이 삭제되었습니다.'}), 200

    except Exception as error:
        db.session.rollback()  # 오류 시 롤백
        return jsonify({'message': f'서버 오류가 발생했습니다: {str(error)}'}), 500


# =============================================================================
# AI 분석 요청 API
# POST /api/workout/sessions/<session_id>/analyze
# =============================================================================
@workout_bp.route('/sessions/<int:session_id>/analyze', methods=['POST'])  # POST 요청 — AI 분석 트리거
@jwt_required()
def analyze_session(session_id):
    """
    특정 운동 세션을 Claude AI로 분석하고 결과를 DB에 저장
    AI 분석 결과는 session.ai_feedback 컬럼에 저장됨
    성공 응답(200): { "ai_feedback": "분석 결과 텍스트" }
    실패 응답(404): { "message": "세션을 찾을 수 없습니다." }
    """

    current_user_id = int(get_jwt_identity())  # 현재 사용자 ID 추출

    # 분석할 세션 조회
    session = WorkoutSession.query.get(session_id)

    # 세션이 없거나 다른 사람의 세션인 경우
    if not session or session.user_id != current_user_id:
        return jsonify({'message': '운동 세션을 찾을 수 없습니다.'}), 404

    try:
        # 세션 데이터를 딕셔너리로 변환해 AI 분석 함수에 전달
        # to_dict()는 세션 정보 + 세트 목록을 포함한 딕셔너리를 반환
        session_data = session.to_dict()

        # analyze_workout() : Claude AI에게 운동 데이터를 보내고 분석 결과를 받음
        # services/ai_coach.py에 정의된 함수
        feedback = analyze_workout(session_data)

        # 분석 결과를 DB의 ai_feedback 컬럼에 저장
        session.ai_feedback = feedback

        # commit() : 변경사항을 DB에 영구 저장
        db.session.commit()

        # 분석 결과를 클라이언트(React)에 반환
        return jsonify({'ai_feedback': feedback}), 200

    except Exception as error:
        db.session.rollback()  # 오류 시 롤백
        return jsonify({'message': f'AI 분석 중 오류가 발생했습니다: {str(error)}'}), 500


# =============================================================================
# 내가 했던 운동 이름 목록 조회 API (자동완성용)
# GET /api/workout/exercises
# =============================================================================
@workout_bp.route('/exercises', methods=['GET'])  # GET 요청 — 데이터 조회
@jwt_required()  # JWT 토큰 필수
def get_exercises():
    """
    현재 로그인한 사용자가 한 번이라도 기록한 모든 운동 종목 이름을 반환
    프론트엔드 자동완성(datalist)에 활용됨
    성공 응답(200): { "exercises": ["벤치프레스", "스쿼트", ...] }
    """
    current_user_id = int(get_jwt_identity())  # 현재 사용자 ID 추출

    # DB에서 이 사용자의 모든 세션에 포함된 운동 이름을 중복 없이 가져옴
    # WorkoutSet.exercise_name : 운동 종목 이름 컬럼
    # distinct() : 중복 제거 — 같은 종목을 여러 번 했어도 이름은 한 번만 반환
    # join(WorkoutSession) : workout_sets 테이블과 workout_sessions 테이블을 JOIN해 user_id 필터 적용
    rows = (
        db.session.query(distinct(WorkoutSet.exercise_name))  # 중복 없는 종목 이름 선택
        .join(WorkoutSession, WorkoutSet.session_id == WorkoutSession.id)  # 세션 테이블과 조인
        .filter(WorkoutSession.user_id == current_user_id)  # 내 세션만 필터링
        .order_by(WorkoutSet.exercise_name)  # 가나다순 정렬 (자동완성 목록용)
        .all()  # 모든 결과 가져오기
    )

    # rows : [('벤치프레스',), ('스쿼트',), ...] 형태의 튜플 리스트
    # r[0] : 각 튜플의 첫 번째 요소(운동 이름 문자열)만 추출해 리스트로 변환
    exercise_names = [r[0] for r in rows]

    return jsonify({'exercises': exercise_names}), 200  # 운동 이름 목록 반환


# =============================================================================
# 특정 운동의 개인 최고 기록 조회 API
# GET /api/workout/exercises/<exercise_name>/best
# =============================================================================
@workout_bp.route('/exercises/<string:exercise_name>/best', methods=['GET'])
@jwt_required()
def get_exercise_best(exercise_name):
    """
    특정 운동 종목에서 이 사용자의 최고 중량과 최고 횟수를 반환
    SessionForm에서 "+/−" 버튼의 기준값으로 활용됨
    성공 응답(200): { "best_weight_kg": 100.0, "best_reps": 12 }
    """
    current_user_id = int(get_jwt_identity())  # 현재 사용자 ID

    # func.max() : SQL의 MAX() 집계 함수 — 가장 큰 값을 반환
    # 이 사용자의 해당 운동에서 가장 높은 중량(best_weight)과 횟수(best_reps)를 구함
    result = (
        db.session.query(
            func.max(WorkoutSet.weight_kg),  # 최고 중량
            func.max(WorkoutSet.reps),       # 최고 횟수
        )
        .join(WorkoutSession, WorkoutSet.session_id == WorkoutSession.id)
        .filter(
            WorkoutSession.user_id == current_user_id,      # 내 세션만
            WorkoutSet.exercise_name == exercise_name        # 해당 운동만
        )
        .first()  # 집계 결과는 항상 1행이므로 .first()로 가져옴
    )

    # result : (max_weight, max_reps) 튜플 또는 (None, None) — 기록이 없을 때
    best_weight = float(result[0]) if result[0] is not None else None  # Decimal → float 변환
    best_reps   = result[1] if result[1] is not None else None          # 정수 또는 None

    return jsonify({
        'exercise_name': exercise_name,  # 조회한 운동 이름
        'best_weight_kg': best_weight,   # 최고 중량 (kg)
        'best_reps': best_reps,          # 최고 횟수 (회)
    }), 200


# =============================================================================
# 세션 수정 API
# PUT /api/workout/sessions/<session_id>
# =============================================================================
@workout_bp.route('/sessions/<int:session_id>', methods=['PUT'])  # PUT 요청 — 데이터 수정
@jwt_required()
def update_session(session_id):
    """
    특정 운동 세션의 기본 정보와 세트를 수정
    기존 세트를 모두 삭제하고 새 세트로 교체하는 방식(replace all)
    요청 Body(JSON): 세션 생성 API와 동일한 형식
    성공 응답(200): { "message": "...", "session": {...} }
    """
    current_user_id = int(get_jwt_identity())  # 현재 사용자 ID

    # 수정할 세션 조회
    session = WorkoutSession.query.get(session_id)

    # 세션이 없거나 다른 사람의 세션 — 수정 불가
    if not session or session.user_id != current_user_id:
        return jsonify({'message': '운동 세션을 찾을 수 없습니다.'}), 404

    # 요청 Body 파싱
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'message': '요청 데이터가 올바르지 않습니다.'}), 400

    # session_date 파싱 (변경된 경우)
    session_date_str = data.get('session_date', '')
    if not session_date_str:
        return jsonify({'message': '운동 날짜(session_date)는 필수입니다.'}), 400

    try:
        session_date = date.fromisoformat(session_date_str)  # "YYYY-MM-DD" → date 객체
    except ValueError:
        return jsonify({'message': '날짜 형식이 올바르지 않습니다. YYYY-MM-DD 형식으로 입력해주세요.'}), 400

    try:
        # ── 세션 기본 정보 업데이트 ──
        session.session_date = session_date           # 날짜 변경
        session.title        = data.get('title')      # 제목 변경 (없으면 None)
        session.memo         = data.get('memo')       # 메모 변경
        session.duration_min = data.get('duration_min')  # 운동 시간 변경

        # ── 기존 세트 전체 삭제 후 새 세트로 교체 ──
        # 세션에 속한 모든 세트를 삭제 — relationship의 cascade가 아닌 명시적 삭제
        WorkoutSet.query.filter_by(session_id=session_id).delete()

        # 새 세트 삽입 (세션 생성 API와 동일한 로직)
        exercises = data.get('exercises', [])  # 요청 Body의 종목 목록

        for exercise in exercises:
            exercise_name = exercise.get('name', '').strip()  # 종목 이름 추출
            if not exercise_name:
                continue  # 이름 없는 종목 건너뜀

            sets = exercise.get('sets', [])  # 이 종목의 세트 목록
            muscle_group = exercise.get('muscle_group')  # 근육 부위 (선택)

            for set_index, set_data in enumerate(sets):
                new_set = WorkoutSet(
                    session_id=session_id,                    # 이 세션에 속함
                    exercise_name=exercise_name,              # 종목 이름
                    set_number=set_index + 1,                 # 세트 번호 (1부터 시작)
                    weight_kg=set_data.get('weight_kg'),      # 중량
                    reps=set_data.get('reps'),                # 횟수
                    duration_sec=set_data.get('duration_sec'), # 지속 시간(초)
                    rest_sec=set_data.get('rest_sec'),         # 휴식 시간(초)
                    muscle_group=muscle_group,                # 근육 부위
                )
                db.session.add(new_set)  # 새 세트를 DB 세션에 추가

        db.session.commit()  # 변경사항 최종 저장

        # 수정된 세션 반환 (sets를 다시 로드하기 위해 DB에서 재조회)
        db.session.refresh(session)  # refresh() : DB에서 최신 데이터로 갱신

        return jsonify({
            'message': '운동 세션이 수정되었습니다.',
            'session': session.to_dict(),  # 수정된 세션 정보 반환
        }), 200

    except Exception as error:
        db.session.rollback()  # 오류 시 롤백
        return jsonify({'message': f'서버 오류가 발생했습니다: {str(error)}'}), 500


# =============================================================================
# 즐겨찾기(루틴 저장) 토글 API
# POST /api/workout/sessions/<session_id>/favorite
# =============================================================================
@workout_bp.route('/sessions/<int:session_id>/favorite', methods=['POST'])
@jwt_required()
def toggle_favorite(session_id):
    """
    특정 세션의 즐겨찾기 상태를 토글 (즐겨찾기 추가 ↔ 해제)
    성공 응답(200): { "is_favorite": true/false }
    """
    current_user_id = int(get_jwt_identity())  # 현재 사용자 ID

    # 즐겨찾기 토글할 세션 조회
    session = WorkoutSession.query.get(session_id)

    if not session or session.user_id != current_user_id:
        return jsonify({'message': '운동 세션을 찾을 수 없습니다.'}), 404

    try:
        # is_favorite : 현재 즐겨찾기 상태를 반전 (True → False, False → True)
        session.is_favorite = not bool(session.is_favorite)  # bool() : None이면 False로 처리
        db.session.commit()  # 변경사항 저장
        return jsonify({'is_favorite': session.is_favorite}), 200  # 새 상태 반환

    except Exception as error:
        db.session.rollback()
        return jsonify({'message': f'서버 오류가 발생했습니다: {str(error)}'}), 500


# =============================================================================
# 즐겨찾기 세션 목록 조회 API
# GET /api/workout/favorites
# =============================================================================
@workout_bp.route('/favorites', methods=['GET'])
@jwt_required()
def get_favorites():
    """
    현재 사용자의 즐겨찾기로 저장된 세션 목록을 반환
    '루틴 불러오기' 기능에서 사용됨
    성공 응답(200): { "sessions": [...] }
    """
    current_user_id = int(get_jwt_identity())  # 현재 사용자 ID

    # is_favorite=True인 세션만 필터링해 최신순으로 반환
    sessions = (
        WorkoutSession.query
        .filter_by(user_id=current_user_id, is_favorite=True)
        .order_by(WorkoutSession.session_date.desc())
        .all()
    )

    return jsonify({'sessions': [s.to_dict() for s in sessions]}), 200

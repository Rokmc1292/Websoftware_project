# auth.py — 인증(로그인·회원가입) 관련 API 엔드포인트 정의
# Flask 블루프린트를 사용해 URL 경로를 그룹화하고 모듈화

from flask import Blueprint, request, jsonify  # Flask의 핵심 도구들
# Blueprint : URL 그룹화 도구 — 나중에 app/__init__.py에서 등록
# request : 클라이언트가 보낸 HTTP 요청 데이터(Body, Header 등)에 접근
# jsonify : Python 딕셔너리를 JSON HTTP 응답으로 변환

from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required  # JWT 액세스 토큰 발급/검증
from .. import db  # 상위 패키지(app)의 db 객체 — DB 세션 커밋, 롤백 등에 사용
from ..models.user import User  # User 모델 클래스 — DB 조회/삽입에 사용
from ..models.profile import UserProfile
from sqlalchemy.exc import IntegrityError  # DB 무결성 오류 — 이메일 중복 등

# ─────────────────────────────────────────────
# 블루프린트 생성
# ─────────────────────────────────────────────
# Blueprint('이름', __name__) : 'auth'라는 이름의 블루프린트 생성
# __name__ : 현재 모듈 이름 — Blueprint가 경로를 찾을 때 기준으로 사용
auth_bp = Blueprint('auth', __name__)


def _get_current_user():
    identity = get_jwt_identity()
    user_id = identity.get('id') if isinstance(identity, dict) else identity
    user_id = int(user_id)
    return User.query.get(user_id)


# ─────────────────────────────────────────────
# 회원가입 API
# POST /api/auth/register
# ─────────────────────────────────────────────
@auth_bp.route('/register', methods=['POST'])  # '/register' 경로에 POST 요청이 오면 이 함수 실행
def register():
    """
    새 사용자 계정을 생성하는 API
    요청 Body(JSON): { "username": "닉네임", "email": "이메일", "password": "비밀번호" }
    성공 응답(201): { "message": "...", "user": {...} }
    실패 응답(400/409/500): { "message": "오류 설명" }
    """

    # request.get_json() : 클라이언트가 보낸 요청 Body를 Python 딕셔너리로 파싱
    # silent=True : JSON 파싱 실패 시 예외 대신 None을 반환
    data = request.get_json(silent=True)

    # 요청 Body가 없거나 JSON이 아닌 경우
    if not data:
        # jsonify() : Python 딕셔너리를 JSON 응답으로 변환
        # HTTP 상태코드 400 : Bad Request — 클라이언트의 요청 형식이 잘못됨
        return jsonify({'message': '요청 데이터가 올바르지 않습니다.'}), 400

    # 필수 필드 추출 — dict.get()은 키가 없어도 에러 없이 None을 반환
    username = data.get('username', '').strip()  # strip() : 앞뒤 공백 제거
    email = data.get('email', '').strip().lower()  # lower() : 이메일을 소문자로 통일
    password = data.get('password', '')

    # 필수 필드 검증 — 하나라도 비어 있으면 오류 반환
    if not username or not email or not password:
        return jsonify({'message': '닉네임, 이메일, 비밀번호는 모두 필수입니다.'}), 400

    # 닉네임 길이 검증
    if len(username) < 2:
        return jsonify({'message': '닉네임은 최소 2자 이상이어야 합니다.'}), 400

    # 비밀번호 길이 검증 — 8자 미만은 보안상 위험
    if len(password) < 8:
        return jsonify({'message': '비밀번호는 최소 8자 이상이어야 합니다.'}), 400

    try:
        # 새 User 객체 생성 — 아직 DB에 저장되지 않은 상태
        new_user = User(username=username, email=email)

        # set_password() : 비밀번호를 bcrypt로 해싱해 new_user.password_hash에 저장
        # 평문 비밀번호는 이 시점 이후로 어디에도 저장되지 않음
        new_user.set_password(password)

        # db.session.add() : 새 User를 DB 세션(작업 단위)에 추가 — 아직 DB에 쓰지 않음
        db.session.add(new_user)
        db.session.flush()
        new_user.profile = UserProfile(profile_note='')

        # db.session.commit() : 세션에 쌓인 변경사항을 실제 DB에 저장 (트랜잭션 완료)
        db.session.commit()

        # 성공 응답 반환 — HTTP 상태코드 201 : Created (새 리소스가 성공적으로 생성됨)
        return jsonify({
            'message': '회원가입이 완료되었습니다.',
            'user': new_user.to_dict(),  # 비밀번호 해시 제외한 사용자 정보
        }), 201

    except IntegrityError:
        # IntegrityError : DB 제약 조건 위반 — 주로 email unique 제약 위반 (중복 이메일)
        db.session.rollback()  # 실패한 트랜잭션을 취소하고 DB를 이전 상태로 되돌림
        # HTTP 상태코드 409 : Conflict — 이미 존재하는 리소스와 충돌
        return jsonify({'message': '이미 사용 중인 이메일입니다.'}), 409

    except Exception as error:
        # 예상치 못한 서버 오류 — 모든 예외를 잡아서 500 에러 반환
        db.session.rollback()  # 안전을 위해 트랜잭션 롤백
        # HTTP 상태코드 500 : Internal Server Error — 서버 내부 오류
        return jsonify({'message': f'서버 오류가 발생했습니다: {str(error)}'}), 500


# ─────────────────────────────────────────────
# 로그인 API
# POST /api/auth/login
# ─────────────────────────────────────────────
@auth_bp.route('/login', methods=['POST'])  # '/login' 경로에 POST 요청이 오면 이 함수 실행
def login():
    """
    이메일과 비밀번호로 로그인하는 API — 성공 시 JWT 토큰 반환
    요청 Body(JSON): { "email": "이메일", "password": "비밀번호" }
    성공 응답(200): { "access_token": "JWT토큰", "user": {...} }
    실패 응답(400/401/500): { "message": "오류 설명" }
    """

    data = request.get_json(silent=True)  # 요청 Body를 Python 딕셔너리로 파싱

    if not data:
        return jsonify({'message': '요청 데이터가 올바르지 않습니다.'}), 400

    # 이메일과 비밀번호 추출
    email = data.get('email', '').strip().lower()  # 이메일 소문자로 통일 (가입 시와 동일하게)
    password = data.get('password', '')

    # 필수 필드 검증
    if not email or not password:
        return jsonify({'message': '이메일과 비밀번호를 모두 입력해주세요.'}), 400

    try:
        # DB에서 이메일로 사용자 검색
        # User.query.filter_by() : 조건에 맞는 행을 조회하는 SQLAlchemy 쿼리
        # .first() : 첫 번째 결과만 반환, 없으면 None 반환
        user = User.query.filter_by(email=email).first()

        # 사용자가 없거나 비밀번호가 틀린 경우
        # 보안상 "이메일이 없다", "비밀번호가 틀렸다"를 구분하지 않고 동일한 메시지 반환
        # (이메일 존재 여부를 공격자에게 알리지 않기 위함)
        if not user or not user.check_password(password):
            # HTTP 상태코드 401 : Unauthorized — 인증 실패
            return jsonify({'message': '이메일 또는 비밀번호가 올바르지 않습니다.'}), 401

        # JWT 액세스 토큰 발급
        # identity : 토큰에 포함할 사용자 식별 정보 — user.id를 문자열로 변환해 저장
        # 이 토큰을 가진 클라이언트는 인증된 사용자로 처리됨
        access_token = create_access_token(identity=str(user.id))

        # 성공 응답 반환 — HTTP 상태코드 200 : OK (기본값이므로 생략 가능하지만 명시적으로 작성)
        return jsonify({
            'access_token': access_token,  # 클라이언트가 이후 요청에 사용할 JWT 토큰
            'user': user.to_dict(),        # 비밀번호 해시 제외한 사용자 정보
        }), 200

    except Exception as error:
        # 예상치 못한 서버 오류
        return jsonify({'message': f'서버 오류가 발생했습니다: {str(error)}'}), 500


# ─────────────────────────────────────────────
# 상태 확인 API (Health Check)
# GET /api/auth/health
# ─────────────────────────────────────────────
@auth_bp.route('/health', methods=['GET'])  # GET 요청 — 서버 상태 확인용
def health_check():
    """
    서버가 정상적으로 실행 중인지 확인하는 API
    React에서 서버 연결 여부를 테스트할 때 사용
    """
    return jsonify({'status': 'ok', 'message': '서버가 정상적으로 실행 중입니다.'}), 200


@auth_bp.route('/password', methods=['PUT'])
@jwt_required()
def change_password():
    user = _get_current_user()
    if not user:
        return jsonify({'message': '사용자 정보를 찾을 수 없습니다.'}), 404

    data = request.get_json(silent=True) or {}
    current_password = data.get('current_password', '')
    new_password = data.get('new_password', '')
    confirm_password = data.get('confirm_password', '')

    if not current_password or not new_password or not confirm_password:
        return jsonify({'message': '현재 비밀번호, 새 비밀번호, 비밀번호 확인을 모두 입력해주세요.'}), 400
    if not user.check_password(current_password):
        return jsonify({'message': '현재 비밀번호가 올바르지 않습니다.'}), 422
    if len(new_password) < 8:
        return jsonify({'message': '새 비밀번호는 최소 8자 이상이어야 합니다.'}), 400
    if new_password != confirm_password:
        return jsonify({'message': '새 비밀번호와 확인 비밀번호가 일치하지 않습니다.'}), 400

    try:
        user.set_password(new_password)
        db.session.commit()
        return jsonify({'message': '비밀번호가 변경되었습니다.'}), 200
    except Exception as error:
        db.session.rollback()
        return jsonify({'message': f'서버 오류가 발생했습니다: {str(error)}'}), 500



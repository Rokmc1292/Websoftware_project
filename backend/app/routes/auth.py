import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import requests
from flask import Blueprint, current_app, jsonify, redirect, request  # Flask의 핵심 도구들
# Blueprint : URL 그룹화 도구 — 나중에 app/__init__.py에서 등록
# request : 클라이언트가 보낸 HTTP 요청 데이터(Body, Header 등)에 접근
# jsonify : Python 딕셔너리를 JSON HTTP 응답으로 변환

from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required  # JWT 액세스 토큰 발급/검증
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from .. import db  # 상위 패키지(app)의 db 객체 — DB 세션 커밋, 롤백 등에 사용
from ..models.social_identity import SocialIdentity
from ..models.user import User  # User 모델 클래스 — DB 조회/삽입에 사용
from ..models.profile import UserProfile
from sqlalchemy.exc import IntegrityError  # DB 무결성 오류 — 이메일 중복 등

# ─────────────────────────────────────────────
# 블루프린트 생성
# ─────────────────────────────────────────────
# Blueprint('이름', __name__) : 'auth'라는 이름의 블루프린트 생성
# __name__ : 현재 모듈 이름 — Blueprint가 경로를 찾을 때 기준으로 사용
auth_bp = Blueprint('auth', __name__)

_SOCIAL_EXCHANGE_TTL_SECONDS = 180
_used_social_exchange_nonces = {}


def _get_current_user() -> User | None:
    identity = get_jwt_identity()
    raw_user_id = identity.get('id') if isinstance(identity, dict) else identity
    if raw_user_id in (None, ''):
        return None
    user_id = int(str(raw_user_id))
    return User.query.get(user_id)


def _oauth_serializer():
    return URLSafeTimedSerializer(current_app.config['SECRET_KEY'], salt='social-auth')


def _social_exchange_serializer():
    return URLSafeTimedSerializer(current_app.config['SECRET_KEY'], salt='social-exchange')


def _prune_used_social_nonces():
    now = datetime.now(timezone.utc)
    expired = [nonce for nonce, expires_at in _used_social_exchange_nonces.items() if expires_at <= now]
    for nonce in expired:
        _used_social_exchange_nonces.pop(nonce, None)


def _social_frontend_redirect(params):
    frontend_url = (current_app.config.get('FRONTEND_URL') or 'http://localhost:5173').rstrip('/')
    return redirect(f"{frontend_url}/login?{urlencode(params)}")


def _get_oauth_provider_config(provider):
    provider_map = {
        'google': {
            'client_id': current_app.config.get('GOOGLE_CLIENT_ID', ''),
            'client_secret': current_app.config.get('GOOGLE_CLIENT_SECRET', ''),
            'redirect_uri': current_app.config.get('GOOGLE_REDIRECT_URI', ''),
            'auth_url': 'https://accounts.google.com/o/oauth2/v2/auth',
            'token_url': 'https://oauth2.googleapis.com/token',
            'userinfo_url': 'https://openidconnect.googleapis.com/v1/userinfo',
            'scope': 'openid email profile',
        },
        'kakao': {
            'client_id': current_app.config.get('KAKAO_CLIENT_ID', ''),
            'client_secret': current_app.config.get('KAKAO_CLIENT_SECRET', ''),
            'redirect_uri': current_app.config.get('KAKAO_REDIRECT_URI', ''),
            'auth_url': 'https://kauth.kakao.com/oauth/authorize',
            'token_url': 'https://kauth.kakao.com/oauth/token',
            'userinfo_url': 'https://kapi.kakao.com/v2/user/me',
            'scope': 'profile_nickname account_email',
        },
        'facebook': {
            'client_id': current_app.config.get('FACEBOOK_CLIENT_ID', ''),
            'client_secret': current_app.config.get('FACEBOOK_CLIENT_SECRET', ''),
            'redirect_uri': current_app.config.get('FACEBOOK_REDIRECT_URI', ''),
            'auth_url': 'https://www.facebook.com/v19.0/dialog/oauth',
            'token_url': 'https://graph.facebook.com/v19.0/oauth/access_token',
            'userinfo_url': 'https://graph.facebook.com/me',
            'scope': 'email,public_profile',
        },
    }
    return provider_map.get(provider)


def _build_unique_username(base_username):
    safe_base = (base_username or 'social_user').strip()[:30]
    if not safe_base:
        safe_base = 'social_user'
    candidate = safe_base
    suffix = 1
    while User.query.filter_by(username=candidate).first() is not None:
        candidate = f"{safe_base[:26]}_{suffix}"
        suffix += 1
    return candidate


def _upsert_social_user(provider, social_id, email, name):
    identity = SocialIdentity.query.filter_by(provider=provider, provider_user_id=social_id).first()
    if identity:
        user = identity.user
        if user and not user.profile:
            user.profile = UserProfile(profile_note='')
            db.session.commit()
        return user

    normalized_email = (email or '').strip().lower()
    if not normalized_email:
        normalized_email = f"{provider}_{social_id}@social.local"

    user = User.query.filter_by(email=normalized_email).first()
    if user:
        if not user.profile:
            user.profile = UserProfile(profile_note='')
        existing_identities = list(user.social_identities or [])
        is_existing_social_only_user = bool(existing_identities) and all(i.is_social_only for i in existing_identities)
        if SocialIdentity.query.filter_by(user_id=user.id, provider=provider, provider_user_id=social_id).first() is None:
            db.session.add(SocialIdentity(
                user_id=user.id,
                provider=provider,
                provider_user_id=social_id,
                is_social_only=is_existing_social_only_user,
            ))
        db.session.commit()
        return user

    username = _build_unique_username(name or f"{provider}_{social_id[-6:]}")
    user = User(username=username, email=normalized_email)
    user.set_password(secrets.token_urlsafe(24))
    db.session.add(user)
    db.session.flush()
    user.profile = UserProfile(profile_note='')
    db.session.add(SocialIdentity(
        user_id=user.id,
        provider=provider,
        provider_user_id=social_id,
        is_social_only=True,
    ))
    db.session.commit()
    return user


def _is_social_only_user(user: User | None) -> bool:
    if not user or not hasattr(user, 'social_identities'):
        return False
    identities = list(user.social_identities or [])
    if not identities:
        return False
    return all(identity.is_social_only for identity in identities)


def _exchange_token(provider, provider_config, code):
    payload = {
        'client_id': provider_config['client_id'],
        'redirect_uri': provider_config['redirect_uri'],
        'code': code,
        'grant_type': 'authorization_code',
    }
    if provider_config.get('client_secret'):
        payload['client_secret'] = provider_config['client_secret']
    if provider == 'facebook':
        response = requests.get(provider_config['token_url'], params=payload, timeout=20)
    else:
        response = requests.post(provider_config['token_url'], data=payload, timeout=20)
    response.raise_for_status()
    token_data = response.json()
    return token_data.get('access_token', '')


def _fetch_social_profile(provider, provider_config, access_token):
    if provider == 'facebook':
        response = requests.get(
            provider_config['userinfo_url'],
            params={'fields': 'id,name,email', 'access_token': access_token},
            timeout=20,
        )
    else:
        response = requests.get(
            provider_config['userinfo_url'],
            headers={'Authorization': f'Bearer {access_token}'},
            timeout=20,
        )
    response.raise_for_status()
    data = response.json()

    if provider == 'google':
        return {
            'social_id': str(data.get('sub') or ''),
            'name': (data.get('name') or '').strip(),
            'email': (data.get('email') or '').strip().lower(),
        }
    if provider == 'kakao':
        account = data.get('kakao_account') or {}
        profile = account.get('profile') or {}
        return {
            'social_id': str(data.get('id') or ''),
            'name': (profile.get('nickname') or '').strip(),
            'email': (account.get('email') or '').strip().lower(),
        }
    return {
        'social_id': str(data.get('id') or ''),
        'name': (data.get('name') or '').strip(),
        'email': (data.get('email') or '').strip().lower(),
    }


@auth_bp.route('/social/<string:provider>/start', methods=['GET'])
def social_login_start(provider):
    provider = (provider or '').strip().lower()
    provider_config = _get_oauth_provider_config(provider)
    if not provider_config:
        return jsonify({'message': '지원하지 않는 소셜 로그인입니다.'}), 400

    if not provider_config['client_id'] or not provider_config['redirect_uri']:
        return jsonify({'message': f'{provider} 소셜 로그인 환경변수가 설정되지 않았습니다.'}), 500

    state_payload = {'provider': provider, 'nonce': secrets.token_urlsafe(16)}
    state = _oauth_serializer().dumps(state_payload)

    params = {
        'client_id': provider_config['client_id'],
        'redirect_uri': provider_config['redirect_uri'],
        'response_type': 'code',
        'state': state,
        'scope': provider_config['scope'],
    }

    if provider == 'kakao':
        params['scope'] = provider_config['scope']
    if provider == 'facebook':
        params['scope'] = provider_config['scope']

    return redirect(f"{provider_config['auth_url']}?{urlencode(params)}")


@auth_bp.route('/social/<string:provider>/callback', methods=['GET'])
def social_login_callback(provider):
    provider = (provider or '').strip().lower()
    provider_config = _get_oauth_provider_config(provider)
    if not provider_config:
        return _social_frontend_redirect({'social': 'error', 'message': '지원하지 않는 소셜 로그인입니다.'})

    code = request.args.get('code', '')
    state = request.args.get('state', '')
    error = request.args.get('error', '')
    if error:
        return _social_frontend_redirect({'social': 'error', 'message': f'{provider} 로그인 실패: {error}'})
    if not code or not state:
        return _social_frontend_redirect({'social': 'error', 'message': '소셜 로그인 응답이 올바르지 않습니다.'})

    try:
        state_data = _oauth_serializer().loads(state, max_age=600)
        if state_data.get('provider') != provider:
            return _social_frontend_redirect({'social': 'error', 'message': '잘못된 인증 상태입니다.'})
    except SignatureExpired:
        return _social_frontend_redirect({'social': 'error', 'message': '소셜 로그인 요청이 만료되었습니다.'})
    except BadSignature:
        return _social_frontend_redirect({'social': 'error', 'message': '소셜 로그인 요청 검증에 실패했습니다.'})

    try:
        access_token = _exchange_token(provider, provider_config, code)
        if not access_token:
            return _social_frontend_redirect({'social': 'error', 'message': '소셜 토큰 발급에 실패했습니다.'})

        profile_data = _fetch_social_profile(provider, provider_config, access_token)
        social_id = profile_data.get('social_id') or ''
        if not social_id:
            return _social_frontend_redirect({'social': 'error', 'message': '소셜 사용자 정보를 읽지 못했습니다.'})

        user = _upsert_social_user(
            provider=provider,
            social_id=social_id,
            email=profile_data.get('email') or '',
            name=profile_data.get('name') or '',
        )
        exchange_code = _social_exchange_serializer().dumps({
            'uid': str(user.id),
            'provider': provider,
            'nonce': secrets.token_urlsafe(16),
        })
        return _social_frontend_redirect({'social': 'success', 'code': exchange_code})
    except Exception as error_message:
        return _social_frontend_redirect({'social': 'error', 'message': f'소셜 로그인 처리 실패: {str(error_message)}'})


@auth_bp.route('/social/exchange', methods=['POST'])
def social_exchange_code():
    data = request.get_json(silent=True) or {}
    code = data.get('code', '')
    if not code:
        return jsonify({'message': '교환 코드가 필요합니다.'}), 400

    try:
        payload = _social_exchange_serializer().loads(code, max_age=_SOCIAL_EXCHANGE_TTL_SECONDS)
    except SignatureExpired:
        return jsonify({'message': '소셜 로그인 코드가 만료되었습니다.'}), 401
    except BadSignature:
        return jsonify({'message': '소셜 로그인 코드 검증에 실패했습니다.'}), 401

    nonce = str(payload.get('nonce') or '').strip()
    user_id = str(payload.get('uid') or '').strip()
    if not nonce or not user_id:
        return jsonify({'message': '소셜 로그인 코드 형식이 올바르지 않습니다.'}), 400

    _prune_used_social_nonces()
    if nonce in _used_social_exchange_nonces:
        return jsonify({'message': '이미 사용된 소셜 로그인 코드입니다.'}), 409

    user = User.query.get(int(user_id)) if user_id.isdigit() else None
    if not user:
        return jsonify({'message': '사용자 정보를 찾을 수 없습니다.'}), 404

    _used_social_exchange_nonces[nonce] = datetime.now(timezone.utc) + timedelta(seconds=_SOCIAL_EXCHANGE_TTL_SECONDS)
    access_jwt = create_access_token(identity=str(user.id))
    return jsonify({'access_token': access_jwt, 'user': user.to_dict()}), 200


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
    if _is_social_only_user(user):
        return jsonify({'message': '소셜 전용 계정은 비밀번호를 변경할 수 없습니다. 소셜 로그인으로 이용해주세요.'}), 403

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



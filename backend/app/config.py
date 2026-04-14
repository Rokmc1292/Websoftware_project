# config.py — Flask 앱의 환경 설정값 모음
# DB 연결 정보, 시크릿 키 등 민감한 정보를 .env 파일에서 읽어와 Python 클래스로 관리

import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / '.env', override=False)


class Config:
    """
    Flask 앱 전체에 적용되는 설정 클래스
    app/__init__.py에서 app.config.from_object(Config)로 사용됨
    """

    # ─────────────────────────────────────────────
    # 보안 관련 설정
    # ─────────────────────────────────────────────
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    JWT_ACCESS_TOKEN_EXPIRES = False

    # ─────────────────────────────────────────────
    # 데이터베이스 연결 설정
    # ─────────────────────────────────────────────
    # DATABASE_URL이 있으면 그 값을 사용
    # 없으면 SQLite 파일 DB를 사용
    # 개발 단계에서는 SQLite가 가장 간단함
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL',
        'sqlite:///sleep_app.db'
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # ─────────────────────────────────────────────
    # Claude AI API 설정
    # ─────────────────────────────────────────────
    TAE_ANTHROPIC_API_KEY = os.getenv('TAE_ANTHROPIC_API_KEY', '')
    TAE_ANTHROPIC_MODEL = os.getenv('TAE_ANTHROPIC_MODEL', '')

    GIL_ANTHROPIC_API_KEY = os.getenv('GIL_ANTHROPIC_API_KEY', '')
    GIL_ANTHROPIC_MODEL = os.getenv('GIL_ANTHROPIC_MODEL', '')

    SUNG_GOOGLE_AI_API_KEY = os.getenv('SUNG_GOOGLE_AI_API_KEY', '')
    SUNG_GOOGLE_AI_IMAGE_MODEL = os.getenv('SUNG_GOOGLE_AI_IMAGE_MODEL', '')
    SUNG_GOOGLE_AI_COACH_MODEL = os.getenv('SUNG_GOOGLE_AI_COACH_MODEL', '')

    # ─────────────────────────────────────────────
    # 🔥 Fitbit API 설정 (추가)
    # ─────────────────────────────────────────────
    FITBIT_CLIENT_ID = os.getenv('FITBIT_CLIENT_ID')
    FITBIT_CLIENT_SECRET = os.getenv('FITBIT_CLIENT_SECRET')
    FITBIT_REDIRECT_URI = os.getenv('FITBIT_REDIRECT_URI')

    GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', '')
    GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET', '')
    GOOGLE_REDIRECT_URI = os.getenv('GOOGLE_REDIRECT_URI', '')

    KAKAO_CLIENT_ID = os.getenv('KAKAO_CLIENT_ID', '')
    KAKAO_CLIENT_SECRET = os.getenv('KAKAO_CLIENT_SECRET', '')
    KAKAO_REDIRECT_URI = os.getenv('KAKAO_REDIRECT_URI', '')

    FACEBOOK_CLIENT_ID = os.getenv('FACEBOOK_CLIENT_ID', '')
    FACEBOOK_CLIENT_SECRET = os.getenv('FACEBOOK_CLIENT_SECRET', '')
    FACEBOOK_REDIRECT_URI = os.getenv('FACEBOOK_REDIRECT_URI', '')

    # 프론트 주소 (OAuth redirect 후 돌아갈 곳)
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')
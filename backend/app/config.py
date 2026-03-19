# config.py — Flask 앱의 환경 설정값 모음
# DB 연결 정보, 시크릿 키 등 민감한 정보를 .env 파일에서 읽어와 Python 클래스로 관리

import os  # os 모듈 — 환경변수(os.getenv)와 파일 경로(os.path)를 다룰 때 사용
from dotenv import load_dotenv  # python-dotenv 패키지 — .env 파일을 자동으로 읽어 환경변수로 등록

# .env 파일의 내용을 환경변수로 로드
# load_dotenv()를 호출하면 .env 파일에 적힌 KEY=VALUE 들이 os.environ에 등록됨
load_dotenv()


class Config:
    """
    Flask 앱 전체에 적용되는 설정 클래스
    app/__init__.py에서 app.config.from_object(Config)로 사용됨
    """

    # ─────────────────────────────────────────────
    # 보안 관련 설정
    # ─────────────────────────────────────────────

    # SECRET_KEY : Flask의 세션, 쿠키 등을 암호화할 때 사용하는 비밀 키
    # .env에 없으면 기본값 'dev-secret-key'를 사용 (실제 운영에서는 반드시 강력한 랜덤 키 설정 필요)
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')

    # JWT_SECRET_KEY : JWT 토큰을 서명(암호화)하고 검증할 때 사용하는 비밀 키
    # 이 키가 유출되면 누구든 가짜 토큰을 만들 수 있으므로 절대 노출 금지
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')

    # JWT_ACCESS_TOKEN_EXPIRES : 액세스 토큰 만료 시간 설정
    # False = 만료되지 않음 (개발 편의용) — 실제 운영에서는 timedelta(hours=1) 등으로 설정
    JWT_ACCESS_TOKEN_EXPIRES = False

    # ─────────────────────────────────────────────
    # 데이터베이스 연결 설정 (MySQL)
    # ─────────────────────────────────────────────

    # 각 환경변수를 .env 파일에서 읽어옴 — 없으면 오른쪽 기본값 사용
    DB_HOST = os.getenv('DB_HOST', 'localhost')       # MySQL 서버 주소
    DB_PORT = os.getenv('DB_PORT', '3306')             # MySQL 포트
    DB_NAME = os.getenv('DB_NAME', 'nsns_db')          # 사용할 데이터베이스 이름
    DB_USER = os.getenv('DB_USER', 'root')             # MySQL 사용자명
    DB_PASSWORD = os.getenv('DB_PASSWORD', '')         # MySQL 비밀번호

    # SQLALCHEMY_DATABASE_URI : SQLAlchemy가 MySQL에 연결할 때 사용하는 연결 문자열
    # 형식: mysql+pymysql://사용자명:비밀번호@주소:포트/데이터베이스명
    # pymysql : Python ↔ MySQL 연결 드라이버 (requirements.txt에 포함)
    SQLALCHEMY_DATABASE_URI = (
        f'mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}'
        '?charset=utf8mb4'  # utf8mb4 : 한글과 이모지를 모두 저장할 수 있는 인코딩
    )

    # SQLALCHEMY_TRACK_MODIFICATIONS : 객체 변경 추적 기능
    # False로 설정 — 메모리 낭비를 줄이고 Flask 경고 메시지 제거
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # ─────────────────────────────────────────────
    # Claude AI API 설정
    # ─────────────────────────────────────────────

    # ANTHROPIC_API_KEY : Claude API 인증에 사용하는 비밀 키
    # https://console.anthropic.com 에서 발급
    ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY', '')

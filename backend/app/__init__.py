# __init__.py — Flask 앱 팩토리 함수 정의
# 'app' 폴더를 Python 패키지로 인식시키고, Flask 앱 객체를 생성하는 함수를 정의

from flask import Flask  # Flask 클래스 — 웹 앱의 핵심 객체를 만드는 클래스
from flask_sqlalchemy import SQLAlchemy  # SQLAlchemy — ORM(객체-관계 매핑) 라이브러리
from flask_migrate import Migrate  # Migrate — DB 스키마 변경을 버전 관리해주는 도구
from flask_jwt_extended import JWTManager  # JWTManager — JWT 토큰 발급/검증 관리자
from flask_cors import CORS  # CORS — 다른 출처(도메인/포트)의 요청을 허용하는 미들웨어

from .config import Config  # 같은 패키지의 config.py에서 Config 클래스를 불러옴

# ─────────────────────────────────────────────
# 확장 객체 초기화 (앱 없이 먼저 생성)
# ─────────────────────────────────────────────
# Flask 확장들은 먼저 객체를 만들고, 나중에 init_app(app)으로 앱과 연결하는 패턴을 사용
# 이 방법을 쓰면 여러 앱 인스턴스를 만들 때 확장을 재사용할 수 있음

db = SQLAlchemy()  # SQLAlchemy 확장 객체 — 모델(Model)과 DB 세션 관리
migrate = Migrate()  # Migrate 확장 객체 — 'flask db migrate' 명령 처리
jwt = JWTManager()  # JWTManager 확장 객체 — JWT 토큰 발급/검증


def create_app():
    """
    Flask 앱 팩토리 함수
    앱 객체를 생성하고 모든 확장과 블루프린트를 연결한 뒤 반환
    """

    # Flask 앱 객체 생성
    # __name__ : 현재 모듈(패키지)의 이름 — Flask가 정적 파일, 템플릿 경로를 찾을 때 기준
    app = Flask(__name__)

    # ── 설정 로드 ──
    # Config 클래스에 정의된 모든 설정값을 Flask 앱에 적용
    app.config.from_object(Config)

    # ── 확장 초기화 ──
    # 앞서 생성한 확장 객체를 Flask 앱과 실제로 연결
    db.init_app(app)  # SQLAlchemy를 이 앱에 연결 — 이제 db.session 등을 사용 가능
    migrate.init_app(app, db)  # Migrate를 이 앱과 db에 연결 — flask db 명령 사용 가능
    jwt.init_app(app)  # JWTManager를 이 앱에 연결 — JWT 토큰 발급/검증 가능

    # CORS 설정 — React 개발 서버(포트 5173)에서 오는 요청을 허용
    # resources : CORS를 적용할 URL 패턴 (r'/api/*' = /api/로 시작하는 모든 경로)
    # origins : 허용할 출처(도메인:포트) — 개발 환경에서는 React 개발 서버만 허용
    CORS(app, resources={r'/api/*': {'origins': 'http://localhost:5173'}})

    # ── 블루프린트 등록 ──
    # 블루프린트(Blueprint) : URL 경로 그룹을 모듈화하는 Flask 기능
    from .routes.auth import auth_bp  # auth.py에 정의된 블루프린트를 불러옴
    # url_prefix='/api/auth' : 이 블루프린트의 모든 라우트 앞에 '/api/auth'가 붙음
    # 예: @auth_bp.route('/login') → 실제 URL은 /api/auth/login
    app.register_blueprint(auth_bp, url_prefix='/api/auth')

    from .routes.workout import workout_bp  # workout.py에 정의된 블루프린트를 불러옴
    # url_prefix='/api/workout' : 이 블루프린트의 모든 라우트 앞에 '/api/workout'가 붙음
    # 예: @workout_bp.route('/sessions') → 실제 URL은 /api/workout/sessions
    app.register_blueprint(workout_bp, url_prefix='/api/workout')

    from .routes.diet import diet_bp
    app.register_blueprint(diet_bp, url_prefix='/api/diet')

    from .routes.profile import profile_bp
    app.register_blueprint(profile_bp, url_prefix='/api/profile')

    from .routes.sleep import sleep_bp
    app.register_blueprint(sleep_bp, url_prefix='/api')

    # stats 블루프린트 등록 — /api/stats/* 경로 담당
    # 예: GET /api/stats/monthly?year=2024&month=6
    #     GET /api/stats/daily?date=2024-06-01
    from .routes.stats import stats_bp
    app.register_blueprint(stats_bp, url_prefix='/api/stats')

    # Fitbit 블루프린트 등록 (/api/fitbit/*)
    from .routes.fitbit import fitbit_bp
    app.register_blueprint(fitbit_bp)

    # DB 스키마는 database/schema.sql을 단일 진실원으로 관리합니다.
    # 앱 시작 시점에 자동 ALTER/CREATE를 수행하지 않습니다.

    return app  # 완성된 Flask 앱 객체를 반환 — run.py에서 이 객체를 받아 서버를 실행

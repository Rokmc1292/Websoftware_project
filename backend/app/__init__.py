from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_cors import CORS

from .config import Config

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()


def create_app():
    app = Flask(__name__)

    app.config.from_object(Config)
    app.config['JSON_AS_ASCII'] = False

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    CORS(app, resources={r'/api/*': {'origins': 'http://localhost:5173'}})

    from .routes.auth import auth_bp
    from .routes.sleep import sleep_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(sleep_bp, url_prefix='/api')

    with app.app_context():
        db.create_all()

    return app
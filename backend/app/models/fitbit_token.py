from datetime import datetime
from sqlalchemy.dialects.mysql import INTEGER
from app import db


class FitbitToken(db.Model):
    __tablename__ = "fitbit_tokens"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(INTEGER(unsigned=True), db.ForeignKey("users.id"), nullable=False, unique=True)

    fitbit_user_id = db.Column(db.String(100))
    access_token = db.Column(db.Text, nullable=False)
    refresh_token = db.Column(db.Text, nullable=False)
    scope = db.Column(db.String(255))
    token_type = db.Column(db.String(50))
    expires_at = db.Column(db.DateTime)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def is_expired(self):
        if not self.expires_at:
            return True
        return datetime.utcnow() >= self.expires_at
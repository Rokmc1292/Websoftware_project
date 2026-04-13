from datetime import datetime, timezone
from sqlalchemy.dialects.mysql import INTEGER

from .. import db


class UserProfile(db.Model):
    __tablename__ = 'user_profiles'

    id = db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    user_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True, index=True)
    profile_note = db.Column(db.String(150), nullable=False, default='')
    height_cm = db.Column(db.Numeric(5, 2), nullable=True)
    weight_kg = db.Column(db.Numeric(5, 2), nullable=True)
    skeletal_muscle_kg = db.Column(db.Numeric(5, 2), nullable=True)
    body_fat_kg = db.Column(db.Numeric(5, 2), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    @staticmethod
    def _to_float(value):
        return float(value) if value is not None else None

    def to_dict(self):
        return {
            'profile_note': self.profile_note or '',
            'height_cm': self._to_float(self.height_cm),
            'weight_kg': self._to_float(self.weight_kg),
            'skeletal_muscle_kg': self._to_float(self.skeletal_muscle_kg),
            'body_fat_kg': self._to_float(self.body_fat_kg),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


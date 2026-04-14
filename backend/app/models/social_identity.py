from datetime import datetime, timezone

from sqlalchemy import UniqueConstraint
from sqlalchemy.dialects.mysql import INTEGER

from .. import db


class SocialIdentity(db.Model):
    __tablename__ = 'social_identities'
    __table_args__ = (
        UniqueConstraint('provider', 'provider_user_id', name='uq_social_provider_user_id'),
    )

    id = db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    user_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    provider = db.Column(db.String(20), nullable=False)
    provider_user_id = db.Column(db.String(120), nullable=False)
    is_social_only = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    def to_dict(self):
        return {
            'provider': self.provider,
            'provider_user_id': self.provider_user_id,
            'is_social_only': bool(self.is_social_only),
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


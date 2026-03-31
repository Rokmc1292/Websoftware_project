from datetime import datetime, date
import json

from app import db


class SleepRecord(db.Model):
    __tablename__ = "sleep_records"

    id = db.Column(db.Integer, primary_key=True)
    record_date = db.Column(db.Date, nullable=False, unique=True)

    bed_hour = db.Column(db.Integer, nullable=False)
    bed_minute = db.Column(db.Integer, nullable=False)
    wake_hour = db.Column(db.Integer, nullable=False)
    wake_minute = db.Column(db.Integer, nullable=False)

    sleep_hours = db.Column(db.Float, nullable=False)
    satisfaction = db.Column(db.Float, nullable=False, default=0)
    memo = db.Column(db.Text, nullable=True, default="")

    sleep_quality = db.Column(db.Integer, nullable=False, default=0)
    freshness = db.Column(db.Integer, nullable=False, default=0)
    growth = db.Column(db.Integer, nullable=False, default=0)
    mission_rate = db.Column(db.Integer, nullable=False, default=0)

    goals_json = db.Column(db.Text, nullable=False, default="[]")

    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
    )
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )

    def get_goals(self):
        try:
            parsed = json.loads(self.goals_json or "[]")
            return parsed if isinstance(parsed, list) else []
        except Exception:
            return []

    def set_goals(self, goals):
        safe_goals = goals if isinstance(goals, list) else []
        self.goals_json = json.dumps(safe_goals, ensure_ascii=False)

    def _date_to_string(self):
        if isinstance(self.record_date, date):
            return self.record_date.isoformat()
        return str(self.record_date)

    def to_dict(self):
        return {
            "id": self.id,
            "date": self._date_to_string(),
            "bedHour": self.bed_hour,
            "bedMinute": self.bed_minute,
            "wakeHour": self.wake_hour,
            "wakeMinute": self.wake_minute,
            "sleepHours": self.sleep_hours,
            "satisfaction": self.satisfaction,
            "memo": self.memo,
            "sleepQuality": self.sleep_quality,
            "freshness": self.freshness,
            "growth": self.growth,
            "missionRate": self.mission_rate,
            "goals": self.get_goals(),
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }
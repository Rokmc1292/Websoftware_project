from datetime import datetime, timedelta, timezone
from sqlalchemy.dialects.mysql import DECIMAL, INTEGER, SMALLINT
from .. import db

KST = timezone(timedelta(hours=9))


def now_kst_naive():
    return datetime.now(KST).replace(tzinfo=None)


class DietEntry(db.Model):
    __tablename__ = 'diet_entries'

    id = db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    user_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    title = db.Column(db.String(100), nullable=False)
    recorded_at = db.Column(db.DateTime, nullable=False, default=now_kst_naive)
    is_favorite = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=now_kst_naive)
    updated_at = db.Column(db.DateTime, nullable=False, default=now_kst_naive, onupdate=now_kst_naive)

    items = db.relationship(
        'DietItem',
        backref='entry',
        lazy=True,
        cascade='all, delete-orphan',
        order_by='DietItem.sort_order.asc(), DietItem.id.asc()'
    )

    def totals(self):
        calories = sum(int(item.calories or 0) for item in self.items)
        protein = sum(float(item.protein_g or 0) for item in self.items)
        carbs = sum(float(item.carbs_g or 0) for item in self.items)
        fat = sum(float(item.fat_g or 0) for item in self.items)
        return {
            'calories': calories,
            'protein': round(protein),
            'carbs': round(carbs),
            'fat': round(fat),
        }

    def to_dict(self):
        data = {
            'id': self.id,
            'title': self.title,
            'time': self.recorded_at.strftime('%Y.%m.%d. %H:%M') if self.recorded_at else None,
            'recorded_at': self.recorded_at.isoformat() if self.recorded_at else None,
            'is_favorite': bool(self.is_favorite),
            'items': [item.to_dict() for item in self.items],
        }
        data.update(self.totals())
        return data


class DietItem(db.Model):
    __tablename__ = 'diet_items'

    id = db.Column(INTEGER(unsigned=True), primary_key=True, autoincrement=True)
    entry_id = db.Column(INTEGER(unsigned=True), db.ForeignKey('diet_entries.id', ondelete='CASCADE'), nullable=False, index=True)
    food_name = db.Column(db.String(150), nullable=False)
    calories = db.Column(SMALLINT(unsigned=True), nullable=False, default=0)
    carbs_g = db.Column(DECIMAL(6, 2), nullable=False, default=0)
    protein_g = db.Column(DECIMAL(6, 2), nullable=False, default=0)
    fat_g = db.Column(DECIMAL(6, 2), nullable=False, default=0)
    sort_order = db.Column(SMALLINT(unsigned=True), nullable=False, default=1)
    created_at = db.Column(db.DateTime, nullable=False, default=now_kst_naive)
    updated_at = db.Column(db.DateTime, nullable=False, default=now_kst_naive, onupdate=now_kst_naive)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.food_name,
            'calories': int(self.calories or 0),
            'protein': float(self.protein_g or 0),
            'carbs': float(self.carbs_g or 0),
            'fat': float(self.fat_g or 0),
            'sort_order': self.sort_order,
        }



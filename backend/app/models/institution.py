"""
Institution model for schools and colleges
"""

from app import db
from datetime import datetime


class Institution(db.Model):
    """Educational institution (school or college)"""
    __tablename__ = 'institutions'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    type = db.Column(db.String(50), nullable=False)  # 'school' or 'college'
    address = db.Column(db.Text)
    city = db.Column(db.String(100))
    state = db.Column(db.String(100))
    country = db.Column(db.String(100), default='India')
    pincode = db.Column(db.String(20))
    phone = db.Column(db.String(20))
    email = db.Column(db.String(120))
    website = db.Column(db.String(200))
    
    # Subscription details
    student_count = db.Column(db.Integer, default=0)
    subscription_tier = db.Column(db.String(50))  # 'basic', 'standard', 'premium'
    subscription_start = db.Column(db.DateTime)
    subscription_end = db.Column(db.DateTime)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    users = db.relationship('User', back_populates='institution', lazy='dynamic')
    pricing_plans = db.relationship('PricingPlan', back_populates='institution', lazy='dynamic')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'type': self.type,
            'address': self.address,
            'city': self.city,
            'state': self.state,
            'country': self.country,
            'student_count': self.student_count,
            'subscription_tier': self.subscription_tier,
            'subscription_start': self.subscription_start.isoformat() if self.subscription_start else None,
            'subscription_end': self.subscription_end.isoformat() if self.subscription_end else None,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

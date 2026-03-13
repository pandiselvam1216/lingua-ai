"""
PricingPlan model for institution pricing
"""

from app import db
from datetime import datetime


class PricingPlan(db.Model):
    """Pricing plans for institutions"""
    __tablename__ = 'pricing_plans'
    
    id = db.Column(db.Integer, primary_key=True)
    institution_id = db.Column(db.Integer, db.ForeignKey('institutions.id'))
    
    # Plan details
    name = db.Column(db.String(100), nullable=False)
    tier = db.Column(db.String(50), nullable=False)  # 'basic', 'standard', 'premium', 'enterprise'
    type = db.Column(db.String(50), nullable=False)  # 'school' or 'college'
    
    # Pricing
    monthly_price_per_student = db.Column(db.Float, nullable=False)
    yearly_price_per_student = db.Column(db.Float, nullable=False)
    setup_fee = db.Column(db.Float, default=0)
    
    # Limits
    min_students = db.Column(db.Integer, default=50)
    max_students = db.Column(db.Integer)
    
    # Features
    features = db.Column(db.JSON)  # List of included features
    
    # Discounts
    yearly_discount_percent = db.Column(db.Float, default=20)
    volume_discount_tiers = db.Column(db.JSON)  # e.g., [{min: 100, discount: 10}, {min: 500, discount: 20}]
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    is_custom = db.Column(db.Boolean, default=False)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    institution = db.relationship('Institution', back_populates='pricing_plans')
    
    def to_dict(self):
        return {
            'id': self.id,
            'institution_id': self.institution_id,
            'name': self.name,
            'tier': self.tier,
            'type': self.type,
            'monthly_price_per_student': self.monthly_price_per_student,
            'yearly_price_per_student': self.yearly_price_per_student,
            'setup_fee': self.setup_fee,
            'min_students': self.min_students,
            'max_students': self.max_students,
            'features': self.features,
            'yearly_discount_percent': self.yearly_discount_percent,
            'volume_discount_tiers': self.volume_discount_tiers,
            'is_active': self.is_active,
            'is_custom': self.is_custom
        }
    
    def calculate_price(self, student_count, billing_cycle='yearly'):
        """Calculate total price for given student count"""
        if billing_cycle == 'yearly':
            base_price = self.yearly_price_per_student * student_count
        else:
            base_price = self.monthly_price_per_student * student_count
        
        # Apply volume discount
        discount = 0
        if self.volume_discount_tiers:
            for tier in sorted(self.volume_discount_tiers, key=lambda x: x.get('min', 0), reverse=True):
                if student_count >= tier.get('min', 0):
                    discount = tier.get('discount', 0)
                    break
        
        discounted_price = base_price * (1 - discount / 100)
        
        return {
            'base_price': base_price,
            'discount_percent': discount,
            'discounted_price': discounted_price,
            'setup_fee': self.setup_fee,
            'total': discounted_price + self.setup_fee
        }
    
    @staticmethod
    def get_default_plans():
        return [
            {
                'name': 'School Basic',
                'tier': 'basic',
                'type': 'school',
                'monthly_price_per_student': 99,
                'yearly_price_per_student': 79,
                'setup_fee': 5000,
                'min_students': 50,
                'max_students': 200,
                'features': ['Listening', 'Reading', 'Grammar', 'Vocabulary', 'Basic Analytics'],
                'volume_discount_tiers': [{'min': 100, 'discount': 5}, {'min': 150, 'discount': 10}]
            },
            {
                'name': 'School Standard',
                'tier': 'standard',
                'type': 'school',
                'monthly_price_per_student': 149,
                'yearly_price_per_student': 119,
                'setup_fee': 10000,
                'min_students': 100,
                'max_students': 500,
                'features': ['All Modules', 'Speaking Assessment', 'Writing Feedback', 'Full Analytics', 'Teacher Dashboard'],
                'volume_discount_tiers': [{'min': 200, 'discount': 10}, {'min': 400, 'discount': 15}]
            },
            {
                'name': 'School Premium',
                'tier': 'premium',
                'type': 'school',
                'monthly_price_per_student': 199,
                'yearly_price_per_student': 159,
                'setup_fee': 15000,
                'min_students': 200,
                'max_students': None,
                'features': ['All Modules', 'Advanced AI Scoring', 'Custom Content', 'Priority Support', 'Admin Panel', 'API Access'],
                'volume_discount_tiers': [{'min': 500, 'discount': 15}, {'min': 1000, 'discount': 25}]
            },
            {
                'name': 'College Basic',
                'tier': 'basic',
                'type': 'college',
                'monthly_price_per_student': 149,
                'yearly_price_per_student': 119,
                'setup_fee': 10000,
                'min_students': 100,
                'max_students': 500,
                'features': ['All Modules', 'Speaking Assessment', 'Basic Analytics'],
                'volume_discount_tiers': [{'min': 250, 'discount': 10}, {'min': 400, 'discount': 15}]
            },
            {
                'name': 'College Standard',
                'tier': 'standard',
                'type': 'college',
                'monthly_price_per_student': 199,
                'yearly_price_per_student': 159,
                'setup_fee': 20000,
                'min_students': 250,
                'max_students': 2000,
                'features': ['All Modules', 'Advanced AI Scoring', 'Placement Readiness', 'Full Analytics', 'API Access'],
                'volume_discount_tiers': [{'min': 500, 'discount': 15}, {'min': 1000, 'discount': 20}]
            },
            {
                'name': 'College Enterprise',
                'tier': 'enterprise',
                'type': 'college',
                'monthly_price_per_student': 249,
                'yearly_price_per_student': 199,
                'setup_fee': 50000,
                'min_students': 500,
                'max_students': None,
                'features': ['All Modules', 'Custom AI Models', 'White Label', 'Dedicated Support', 'SLA Guarantee', 'On-Premise Option'],
                'volume_discount_tiers': [{'min': 1000, 'discount': 20}, {'min': 5000, 'discount': 30}]
            }
        ]

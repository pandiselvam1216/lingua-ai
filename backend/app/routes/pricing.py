"""
Pricing module routes
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app import db
from app.models.pricing import PricingPlan
from app.utils.decorators import role_required

pricing_bp = Blueprint('pricing', __name__)


@pricing_bp.route('/plans', methods=['GET'])
def get_plans():
    """Get all pricing plans (public)"""
    plan_type = request.args.get('type')  # 'school' or 'college'
    
    query = PricingPlan.query.filter_by(is_active=True, is_custom=False)
    if plan_type:
        query = query.filter_by(type=plan_type)
    
    plans = query.all()
    return jsonify({'plans': [p.to_dict() for p in plans]}), 200


@pricing_bp.route('/calculate', methods=['POST'])
def calculate_price():
    """Calculate price for institution"""
    data = request.get_json()
    
    plan_id = data.get('plan_id')
    student_count = data.get('student_count', 100)
    billing_cycle = data.get('billing_cycle', 'yearly')
    
    plan = db.session.get(PricingPlan, plan_id)
    if not plan:
        return jsonify({'error': 'Plan not found'}), 404
    
    pricing = plan.calculate_price(student_count, billing_cycle)
    
    return jsonify({
        'plan': plan.to_dict(),
        'student_count': student_count,
        'billing_cycle': billing_cycle,
        'pricing': pricing
    }), 200


@pricing_bp.route('/plans', methods=['POST'])
@jwt_required()
@role_required('admin')
def create_plan():
    """Create pricing plan (admin only)"""
    data = request.get_json()
    
    plan = PricingPlan(
        name=data.get('name'),
        tier=data.get('tier'),
        type=data.get('type'),
        monthly_price_per_student=data.get('monthly_price'),
        yearly_price_per_student=data.get('yearly_price'),
        setup_fee=data.get('setup_fee', 0),
        min_students=data.get('min_students', 50),
        max_students=data.get('max_students'),
        features=data.get('features', [])
    )
    
    db.session.add(plan)
    db.session.commit()
    
    return jsonify({'plan': plan.to_dict()}), 201

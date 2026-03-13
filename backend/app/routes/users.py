"""
User management routes
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user import User, Role
from app.models.attempt import Attempt, Score
from app.models.module import Module
from app.utils.decorators import role_required

users_bp = Blueprint('users', __name__)


@users_bp.route('/me', methods=['GET'])
@jwt_required()
def get_profile():
    """Get current user profile"""
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({'user': user.to_dict()}), 200


@users_bp.route('/me', methods=['PUT'])
@jwt_required()
def update_profile():
    """Update current user profile"""
    user_id = get_jwt_identity()
    user = db.session.get(User, user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    
    if 'full_name' in data:
        user.full_name = data['full_name']
    if 'phone' in data:
        user.phone = data['phone']
    if 'avatar_url' in data:
        user.avatar_url = data['avatar_url']
    
    db.session.commit()
    
    return jsonify({'user': user.to_dict()}), 200


@users_bp.route('/me/progress', methods=['GET'])
@jwt_required()
def get_progress():
    """Get user's overall progress across all modules"""
    user_id = get_jwt_identity()
    
    # Get all modules
    modules = Module.query.filter_by(is_active=True).order_by(Module.order).all()
    
    progress = []
    overall_score = 0
    module_count = 0
    
    for module in modules:
        # Get attempts for this module
        attempts = Attempt.query.join(Attempt.question).filter(
            Attempt.user_id == user_id,
            Attempt.is_completed == True
        ).all()
        
        module_attempts = [a for a in attempts if a.question.module_id == module.id]
        
        if module_attempts:
            # Calculate average score for this module
            scores = [a.score.total_score for a in module_attempts if a.score]
            avg_score = sum(scores) / len(scores) if scores else 0
            
            progress.append({
                'module': module.to_dict(),
                'attempts': len(module_attempts),
                'average_score': round(avg_score, 1),
                'last_attempt': max([a.completed_at for a in module_attempts if a.completed_at], default=None)
            })
            
            overall_score += avg_score
            module_count += 1
        else:
            progress.append({
                'module': module.to_dict(),
                'attempts': 0,
                'average_score': 0,
                'last_attempt': None
            })
    
    overall_average = overall_score / module_count if module_count > 0 else 0
    
    return jsonify({
        'progress': progress,
        'overall_score': round(overall_average, 1),
        'total_attempts': sum(p['attempts'] for p in progress),
        'modules_attempted': module_count
    }), 200


@users_bp.route('/', methods=['GET'])
@jwt_required()
@role_required('admin', 'teacher')
def list_users():
    """List all users (admin/teacher only)"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    role = request.args.get('role')
    
    query = User.query
    
    if role:
        query = query.join(Role).filter(Role.name == role)
    
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'users': [u.to_dict() for u in pagination.items],
        'total': pagination.total,
        'page': page,
        'pages': pagination.pages
    }), 200


@users_bp.route('/<int:user_id>', methods=['GET'])
@jwt_required()
@role_required('admin', 'teacher')
def get_user(user_id):
    """Get specific user (admin/teacher only)"""
    user = db.session.get(User, user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    return jsonify({'user': user.to_dict()}), 200


@users_bp.route('/<int:user_id>/progress', methods=['GET'])
@jwt_required()
@role_required('admin', 'teacher')
def get_user_progress(user_id):
    """Get specific user's progress (admin/teacher only)"""
    user = db.session.get(User, user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Get all completed attempts with scores
    attempts = Attempt.query.filter_by(
        user_id=user_id,
        is_completed=True
    ).order_by(Attempt.completed_at.desc()).limit(50).all()
    
    return jsonify({
        'user': user.to_dict(),
        'attempts': [a.to_dict() for a in attempts],
        'total_attempts': Attempt.query.filter_by(user_id=user_id, is_completed=True).count()
    }), 200

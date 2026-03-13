"""
Admin routes for user management and analytics
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user import User, Role
from app.models.attempt import Attempt, Score
from app.models.module import Module
from app.utils.decorators import role_required
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta
from sqlalchemy import func

admin_bp = Blueprint('admin', __name__)


@admin_bp.route('/analytics', methods=['GET'])
@jwt_required()
@role_required('admin')
def get_analytics():
    """Get platform analytics overview"""
    # Total users by role
    total_students = User.query.join(Role).filter(Role.name == 'student').count()
    total_teachers = User.query.join(Role).filter(Role.name == 'teacher').count()
    total_admins = User.query.join(Role).filter(Role.name == 'admin').count()
    
    # Active users (logged in within last 7 days)
    week_ago = datetime.utcnow() - timedelta(days=7)
    active_students = User.query.join(Role).filter(
        Role.name == 'student',
        User.last_login >= week_ago
    ).count() if hasattr(User, 'last_login') else total_students
    
    # Total attempts and scores
    total_attempts = Attempt.query.filter_by(is_completed=True).count()
    
    # Average score across all attempts
    avg_score = db.session.query(func.avg(Score.total_score)).scalar() or 0
    
    # Attempts per module
    modules = Module.query.filter_by(is_active=True).all()
    module_stats = []
    for module in modules:
        attempts = Attempt.query.join(Attempt.question).filter(
            Attempt.is_completed == True
        ).count()
        module_stats.append({
            'module': module.to_dict(),
            'attempts': attempts
        })
    
    # Recent activity (last 30 days)
    month_ago = datetime.utcnow() - timedelta(days=30)
    recent_attempts = Attempt.query.filter(
        Attempt.is_completed == True,
        Attempt.completed_at >= month_ago
    ).count()
    
    return jsonify({
        'users': {
            'total': total_students + total_teachers + total_admins,
            'students': total_students,
            'teachers': total_teachers,
            'admins': total_admins,
            'active_this_week': active_students
        },
        'attempts': {
            'total': total_attempts,
            'recent_month': recent_attempts,
            'average_score': round(float(avg_score), 1)
        },
        'modules': module_stats
    }), 200


@admin_bp.route('/students', methods=['GET'])
@jwt_required()
@role_required('admin')
def get_students():
    """Get all students with their stats"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search', '')
    status = request.args.get('status', '')
    
    query = User.query.join(Role).filter(Role.name == 'student')
    
    if search:
        query = query.filter(
            (User.full_name.ilike(f'%{search}%')) |
            (User.email.ilike(f'%{search}%'))
        )
    
    if status == 'active':
        query = query.filter(User.is_active == True)
    elif status == 'inactive':
        query = query.filter(User.is_active == False)
    
    pagination = query.order_by(User.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    students = []
    for user in pagination.items:
        # Get attempt stats
        attempt_count = Attempt.query.filter_by(
            user_id=user.id, is_completed=True
        ).count()
        
        # Get average score
        avg_score = db.session.query(func.avg(Score.total_score)).join(
            Attempt
        ).filter(
            Attempt.user_id == user.id,
            Attempt.is_completed == True
        ).scalar() or 0
        
        students.append({
            **user.to_dict(),
            'stats': {
                'attempts': attempt_count,
                'average_score': round(float(avg_score), 1)
            }
        })
    
    return jsonify({
        'students': students,
        'total': pagination.total,
        'page': page,
        'pages': pagination.pages
    }), 200


@admin_bp.route('/students', methods=['POST'])
@jwt_required()
@role_required('admin')
def create_student():
    """Create a new student"""
    data = request.get_json()
    
    if not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email and password are required'}), 400
    
    # Check if user exists
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 409
    
    # Get student role
    student_role = Role.query.filter_by(name='student').first()
    if not student_role:
        return jsonify({'error': 'Student role not found'}), 500
    
    # Create user
    user = User(
        email=data['email'],
        password_hash=generate_password_hash(data['password']),
        full_name=data.get('full_name', ''),
        role_id=student_role.id,
        is_active=data.get('is_active', True)
    )
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify({
        'message': 'Student created successfully',
        'user': user.to_dict()
    }), 201


@admin_bp.route('/students/<int:user_id>', methods=['PUT'])
@jwt_required()
@role_required('admin')
def update_student(user_id):
    """Update student details"""
    user = db.session.get(User, user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    data = request.get_json()
    
    if 'full_name' in data:
        user.full_name = data['full_name']
    if 'email' in data:
        # Check if email is taken
        existing = User.query.filter_by(email=data['email']).first()
        if existing and existing.id != user_id:
            return jsonify({'error': 'Email already in use'}), 409
        user.email = data['email']
    if 'is_active' in data:
        user.is_active = data['is_active']
    if 'password' in data and data['password']:
        user.password_hash = generate_password_hash(data['password'])
    
    db.session.commit()
    
    return jsonify({
        'message': 'Student updated successfully',
        'user': user.to_dict()
    }), 200


@admin_bp.route('/students/<int:user_id>', methods=['DELETE'])
@jwt_required()
@role_required('admin')
def delete_student(user_id):
    """Delete a student"""
    user = db.session.get(User, user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    # Check if trying to delete an admin
    if user.role.name == 'admin':
        return jsonify({'error': 'Cannot delete admin users'}), 403
    
    # Delete user's attempts first
    Attempt.query.filter_by(user_id=user_id).delete()
    
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({'message': 'Student deleted successfully'}), 200


@admin_bp.route('/reports', methods=['GET'])
@jwt_required()
@role_required('admin')
def get_reports():
    """Get student performance reports"""
    # Get all students with their performance
    students = User.query.join(Role).filter(Role.name == 'student').all()
    
    reports = []
    for student in students:
        # Get attempts by module
        modules = Module.query.filter_by(is_active=True).all()
        module_scores = {}
        
        for module in modules:
            scores = db.session.query(func.avg(Score.total_score)).join(
                Attempt
            ).join(
                Attempt.question
            ).filter(
                Attempt.user_id == student.id,
                Attempt.is_completed == True
            ).scalar() or 0
            
            module_scores[module.name] = round(float(scores), 1)
        
        # Overall stats
        total_attempts = Attempt.query.filter_by(
            user_id=student.id, is_completed=True
        ).count()
        
        overall_avg = db.session.query(func.avg(Score.total_score)).join(
            Attempt
        ).filter(
            Attempt.user_id == student.id,
            Attempt.is_completed == True
        ).scalar() or 0
        
        reports.append({
            'student': {
                'id': student.id,
                'full_name': student.full_name,
                'email': student.email
            },
            'total_attempts': total_attempts,
            'overall_average': round(float(overall_avg), 1),
            'module_scores': module_scores
        })
    
    # Sort by overall average
    reports.sort(key=lambda x: x['overall_average'], reverse=True)
    
    return jsonify({'reports': reports}), 200


@admin_bp.route('/activity', methods=['GET'])
@jwt_required()
@role_required('admin')
def get_activity():
    """Get recent platform activity"""
    limit = request.args.get('limit', 20, type=int)
    
    # Get recent attempts
    recent_attempts = Attempt.query.filter_by(
        is_completed=True
    ).order_by(
        Attempt.completed_at.desc()
    ).limit(limit).all()
    
    activities = []
    for attempt in recent_attempts:
        user = db.session.get(User, attempt.user_id)
        if user:
            activities.append({
                'type': 'attempt',
                'user': {
                    'id': user.id,
                    'full_name': user.full_name,
                    'email': user.email
                },
                'score': attempt.score.total_score if attempt.score else 0,
                'timestamp': attempt.completed_at.isoformat() if attempt.completed_at else None
            })
    
    return jsonify({'activities': activities}), 200

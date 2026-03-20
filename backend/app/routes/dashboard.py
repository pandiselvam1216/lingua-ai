"""
Dashboard routes for analytics and statistics
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from sqlalchemy import func
from app import db
from app.models.user import User
from app.models.module import Module, Question
from app.models.attempt import Attempt, Score
from app.utils.decorators import role_required

dashboard_bp = Blueprint('dashboard', __name__)


@dashboard_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_stats():
    """Get dashboard statistics for current user"""
    user_id = int(get_jwt_identity())
    
    # Total attempts
    total_attempts = Attempt.query.filter_by(user_id=user_id, is_completed=True).count()
    
    # This week's attempts
    week_ago = datetime.utcnow() - timedelta(days=7)
    weekly_attempts = Attempt.query.filter(
        Attempt.user_id == user_id,
        Attempt.is_completed == True,
        Attempt.completed_at >= week_ago
    ).count()
    
    # Average score
    scores = db.session.query(func.avg(Score.total_score)).join(Attempt).filter(
        Attempt.user_id == user_id,
        Attempt.is_completed == True
    ).scalar() or 0
    
    # Module breakdown
    modules = Module.query.filter_by(is_active=True).order_by(Module.order).all()
    module_stats = []
    # Query module stats using a single database query grouped by module ID
    module_stats_data = db.session.query(
        Question.module_id,
        func.count(Attempt.id).label('attempts'),
        func.avg(Score.total_score).label('avg_score')
    ).select_from(Attempt).join(Question).outerjoin(Score).filter(
        Attempt.user_id == user_id,
        Attempt.is_completed == True
    ).group_by(Question.module_id).all()
    
    # Convert to easily searchable dictionary
    stats_map = {
        data.module_id: {
            'attempts': data.attempts,
            'avg_score': data.avg_score or 0
        } for data in module_stats_data
    }
    
    for module in modules:
        stats = stats_map.get(module.id, {'attempts': 0, 'avg_score': 0})
        
        module_stats.append({
            'id': module.id,
            'name': module.name,
            'slug': module.slug,
            'icon': module.icon,
            'color': module.color,
            'attempts': stats['attempts'],
            'average_score': round(stats['avg_score'], 1)
        })
    
    return jsonify({
        'total_attempts': total_attempts,
        'weekly_attempts': weekly_attempts,
        'average_score': round(scores, 1),
        'modules': module_stats
    }), 200


@dashboard_bp.route('/readiness', methods=['GET'])
@jwt_required()
def get_readiness():
    """Get overall readiness score"""
    user_id = int(get_jwt_identity())
    
    modules = Module.query.filter_by(is_active=True).all()
    
    readiness_scores = []
    for module in modules:
        # Get latest 5 attempts for each module
        recent_scores = db.session.query(Score.total_score).join(Attempt).join(Attempt.question).filter(
            Attempt.user_id == user_id,
            Attempt.question.has(module_id=module.id),
            Attempt.is_completed == True
        ).order_by(Attempt.completed_at.desc()).limit(5).all()
        
        if recent_scores:
            avg = sum(s[0] for s in recent_scores) / len(recent_scores)
            readiness_scores.append({
                'module': module.name,
                'score': round(avg, 1),
                'weight': 1.0 / len(modules)
            })
        else:
            readiness_scores.append({
                'module': module.name,
                'score': 0,
                'weight': 1.0 / len(modules)
            })
    
    # Calculate weighted readiness
    overall_readiness = sum(s['score'] * s['weight'] for s in readiness_scores)
    
    # Determine level
    if overall_readiness >= 80:
        level = 'Advanced'
        message = 'Excellent! You are well-prepared for professional communication.'
    elif overall_readiness >= 60:
        level = 'Intermediate'
        message = 'Good progress! Continue practicing to reach advanced level.'
    elif overall_readiness >= 40:
        level = 'Developing'
        message = 'You are making progress. Focus on your weaker areas.'
    else:
        level = 'Beginner'
        message = 'Keep practicing! Regular practice will improve your skills.'
    
    return jsonify({
        'overall_readiness': round(overall_readiness, 1),
        'level': level,
        'message': message,
        'breakdown': readiness_scores
    }), 200


@dashboard_bp.route('/activity', methods=['GET'])
@jwt_required()
def get_activity():
    """Get recent activity and trends"""
    user_id = int(get_jwt_identity())
    days = request.args.get('days', 30, type=int)
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Daily activity
    daily_activity = db.session.query(
        func.date(Attempt.completed_at).label('date'),
        func.count(Attempt.id).label('attempts'),
        func.avg(Score.total_score).label('avg_score')
    ).join(Score).filter(
        Attempt.user_id == user_id,
        Attempt.is_completed == True,
        Attempt.completed_at >= start_date
    ).group_by(func.date(Attempt.completed_at)).order_by(func.date(Attempt.completed_at)).all()
    
    activity_data = [{
        'date': str(a.date),
        'attempts': a.attempts,
        'average_score': round(a.avg_score or 0, 1)
    } for a in daily_activity]
    
    # Recent attempts
    recent_attempts = Attempt.query.filter(
        Attempt.user_id == user_id,
        Attempt.is_completed == True
    ).order_by(Attempt.completed_at.desc()).limit(10).all()
    
    return jsonify({
        'daily_activity': activity_data,
        'recent_attempts': [a.to_dict() for a in recent_attempts]
    }), 200


@dashboard_bp.route('/admin/overview', methods=['GET'])
@jwt_required()
@role_required('admin')
def admin_overview():
    """Admin dashboard overview"""
    # User stats
    total_users = User.query.count()
    active_users = User.query.filter_by(is_active=True).count()
    
    # Get users by role
    from app.models.user import Role
    role_stats = db.session.query(
        Role.name,
        func.count(User.id)
    ).join(User).group_by(Role.name).all()
    
    # Attempt stats
    total_attempts = Attempt.query.filter_by(is_completed=True).count()
    today = datetime.utcnow().date()
    today_attempts = Attempt.query.filter(
        Attempt.is_completed == True,
        func.date(Attempt.completed_at) == today
    ).count()
    
    # Module usage
    module_usage = db.session.query(
        Module.name,
        func.count(Attempt.id)
    ).join(Attempt.question).join(Module).filter(
        Attempt.is_completed == True
    ).group_by(Module.name).all()
    
    return jsonify({
        'users': {
            'total': total_users,
            'active': active_users,
            'by_role': {r[0]: r[1] for r in role_stats}
        },
        'attempts': {
            'total': total_attempts,
            'today': today_attempts
        },
        'module_usage': {m[0]: m[1] for m in module_usage}
    }), 200

"""
Admin routes for user management and analytics
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user import User, Role
from app.models.attempt import Attempt, Score
from app.models.module import Module, Question, ListeningModule
from app.utils.decorators import role_required
import uuid
from werkzeug.security import generate_password_hash
from datetime import datetime, timedelta
from sqlalchemy import func
import json

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
    
    # Attempts per module (Optimized query)
    module_stats_query = db.session.query(
        Module, 
        func.count(Attempt.id)
    ).join(Question, Question.module_id == Module.id)\
     .join(Attempt, Attempt.question_id == Question.id)\
     .filter(Attempt.is_completed == True)\
     .group_by(Module.id).all()
    
    module_stats = []
    for module, count in module_stats_query:
        module_stats.append({
            'module': module.to_dict(),
            'attempts': count
        })
    
    # Recent activity (last 30 days)
    month_ago = datetime.utcnow() - timedelta(days=30)
    recent_attempts = Attempt.query.filter(
        Attempt.is_completed == True,
        Attempt.completed_at >= month_ago
    ).count()

    # Generate real chart data (attempts per day for the last 7 days)
    chart_data = []
    for i in range(6, -1, -1):
        day = datetime.utcnow().date() - timedelta(days=i)
        count = Attempt.query.filter(
            func.date(Attempt.completed_at) == day,
            Attempt.is_completed == True
        ).count()
        chart_data.append({
            'label': day.strftime('%a'),
            'value': count
        })
    
    # New students this month
    new_students = User.query.join(Role).filter(
        Role.name == 'student',
        User.created_at >= month_ago
    ).count()

    # Completion rate
    all_attempts = Attempt.query.count()
    completion_rate = round((total_attempts / all_attempts * 100), 1) if all_attempts > 0 else 0
    
    return jsonify({
        'users': {
            'total': total_students + total_teachers + total_admins,
            'students': total_students,
            'teachers': total_teachers,
            'admins': total_admins,
            'active_this_week': active_students,
            'new_students_this_month': new_students
        },
        'attempts': {
            'total': total_attempts,
            'recent_month': recent_attempts,
            'average_score': round(float(avg_score), 1),
            'completion_rate': completion_rate
        },
        'modules': module_stats,
        'chart': {
            'data7': chart_data,
            'data30': [], 
            'data90': []
        }
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


@admin_bp.route('/questions', methods=['GET'])
@jwt_required()
@role_required('admin')
def get_all_questions():
    """Get all questions (including unpublished) for admin management"""
    module_slug = request.args.get('module')
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    
    query = Question.query.order_by(Question.created_at.desc())
    
    if module_slug:
        # Handle both 'critical-thinking' and 'critical_thinking' formats
        normalized_slug = module_slug.replace('_', '-')
        module = Module.query.filter_by(slug=normalized_slug).first()
        if not module:
            return jsonify({'error': 'Module not found'}), 404
        query = query.filter_by(module_id=module.id)
    
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'questions': [q.to_dict(include_answer=True) for q in pagination.items],
        'total': pagination.total,
        'page': page,
        'pages': pagination.pages
    }), 200


@admin_bp.route('/questions', methods=['POST'])
@jwt_required()
@role_required('admin')
def create_question():
    """Create a new question"""
    data = request.get_json()
    
    if not data or not data.get('module_id') or not data.get('content'):
        return jsonify({'error': 'Module ID and content are required'}), 400
    
    module = db.session.get(Module, data['module_id'])
    if not module:
        return jsonify({'error': 'Module not found'}), 404
    
    question = Question(
        module_id=data['module_id'],
        type=data.get('type', 'mcq'),
        title=data.get('title'),
        content=data['content'],
        media_url=data.get('media_url'),
        passage_text=data.get('passage_text'),
        options=data.get('options'),
        correct_answer=data.get('correct_answer'),
        explanation=data.get('explanation'),
        difficulty=data.get('difficulty', 1),
        points=data.get('points', 10),
        time_limit=data.get('time_limit'),
        tags=data.get('tags'),
        pdf_name=data.get('pdf_name'),
        is_active=data.get('is_active', True),
        is_published=data.get('is_published', True),  # Default to published so questions appear on user pages
        listening_module_id=data.get('listening_module_id'),
        category=data.get('category'),
        tts_config=json.dumps(data.get('tts_config')) if data.get('tts_config') else None
    )
    
    db.session.add(question)
    db.session.commit()
    
    return jsonify({
        'message': 'Question created successfully',
        'question': question.to_dict(include_answer=True)
    }), 201


@admin_bp.route('/questions/<int:question_id>', methods=['PUT'])
@jwt_required()
@role_required('admin')
def update_question(question_id):
    """Update a question"""
    question = db.session.get(Question, question_id)
    
    if not question:
        return jsonify({'error': 'Question not found'}), 404
    
    data = request.get_json()
    
    # Update fields if provided
    if 'title' in data:
        question.title = data['title']
    if 'content' in data:
        question.content = data['content']
    if 'type' in data:
        question.type = data['type']
    if 'media_url' in data:
        question.media_url = data['media_url']
    if 'passage_text' in data:
        question.passage_text = data['passage_text']
    if 'options' in data:
        question.options = data['options']
    if 'correct_answer' in data:
        question.correct_answer = data['correct_answer']
    if 'explanation' in data:
        question.explanation = data['explanation']
    if 'difficulty' in data:
        question.difficulty = data['difficulty']
    if 'points' in data:
        question.points = data['points']
    if 'time_limit' in data:
        question.time_limit = data['time_limit']
    if 'tags' in data:
        question.tags = data['tags']
    if 'is_active' in data:
        question.is_active = data['is_active']
    if 'is_published' in data:
        question.is_published = data['is_published']
    if 'pdf_name' in data:
        question.pdf_name = data['pdf_name']
    if 'listening_module_id' in data:
        question.listening_module_id = data['listening_module_id']
    if 'category' in data:
        question.category = data['category']
    if 'tts_config' in data:
        question.tts_config = json.dumps(data['tts_config']) if data['tts_config'] else None
    
    question.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'message': 'Question updated successfully',
        'question': question.to_dict(include_answer=True)
    }), 200


@admin_bp.route('/questions/<int:question_id>/publish', methods=['PUT'])
@jwt_required()
@role_required('admin')
def toggle_publish_question(question_id):
    """Publish or unpublish a question"""
    question = db.session.get(Question, question_id)
    
    if not question:
        return jsonify({'error': 'Question not found'}), 404
    
    data = request.get_json()
    question.is_published = data.get('is_published', not question.is_published)
    question.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'message': f"Question {'published' if question.is_published else 'unpublished'} successfully",
        'question': question.to_dict(include_answer=True)
    }), 200


@admin_bp.route('/questions/<int:question_id>', methods=['DELETE'])
@jwt_required()
@role_required('admin')
def delete_question(question_id):
    """Delete a question"""
    question = db.session.get(Question, question_id)
    
    if not question:
        return jsonify({'error': 'Question not found'}), 404
    
    db.session.delete(question)
    db.session.commit()
    
    return jsonify({'message': 'Question deleted successfully'}), 200


@admin_bp.route('/modules', methods=['GET'])
@jwt_required()
@role_required('admin')
def get_modules():
    """Get all available modules for question management"""
    modules = Module.query.filter_by(is_active=True).all()
    return jsonify([module.to_dict() for module in modules]), 200


# --- Listening Module Content Management ---

@admin_bp.route('/listening', methods=['GET'])
@admin_bp.route('/listening-modules', methods=['GET'])
@jwt_required()
@role_required('admin')
def admin_get_listening_content():
    """Get all listening content for management"""
    content = ListeningModule.query.order_by(ListeningModule.created_at.desc()).all()
    return jsonify({'modules': [c.to_dict() for c in content]}), 200


@admin_bp.route('/listening', methods=['POST'])
@jwt_required()
@role_required('admin')
def admin_create_listening_content():
    """Create new listening content"""
    data = request.get_json()
    
    if not data or not data.get('title') or not data.get('content'):
        return jsonify({'error': 'Title and content are required'}), 400
    
    import json
    new_item = ListeningModule(
        id=str(uuid.uuid4()),
        title=data['title'],
        content=data['content'],
        category=data.get('category'),
        audio_url=data.get('audio_url'),
        tts_config=json.dumps(data.get('tts_config')) if data.get('tts_config') else None
    )
    
    db.session.add(new_item)
    db.session.commit()
    
    return jsonify({
        'message': 'Listening content created successfully',
        'item': new_item.to_dict()
    }), 201


@admin_bp.route('/listening/<string:item_id>', methods=['PUT'])
@jwt_required()
@role_required('admin')
def admin_update_listening_content(item_id):
    """Update listening content"""
    item = db.session.get(ListeningModule, item_id)
    if not item:
        return jsonify({'error': 'Content not found'}), 404
        
    data = request.get_json()
    if 'title' in data:
        item.title = data['title']
    if 'content' in data:
        item.content = data['content']
    if 'category' in data:
        item.category = data['category']
    if 'audio_url' in data:
        item.audio_url = data['audio_url']
    if 'tts_config' in data:
        import json
        item.tts_config = json.dumps(data['tts_config']) if data['tts_config'] else None
        
    db.session.commit()
    
    return jsonify({
        'message': 'Listening content updated successfully',
        'item': item.to_dict()
    }), 200


@admin_bp.route('/listening/<string:item_id>', methods=['DELETE'])
@jwt_required()
@role_required('admin')
def admin_delete_listening_content(item_id):
    """Delete listening content"""
    item = db.session.get(ListeningModule, item_id)
    if not item:
        return jsonify({'error': 'Content not found'}), 404
        
    db.session.delete(item)
    db.session.commit()
    
    return jsonify({'message': 'Listening content deleted successfully'}), 200

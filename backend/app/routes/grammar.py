"""
Grammar module routes
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app import db
from app.models.module import Module, Question
from app.models.attempt import Attempt, Score
from app.services.scoring_service import ScoringService

grammar_bp = Blueprint('grammar', __name__)


@grammar_bp.route('/questions', methods=['GET'])
@jwt_required()
def get_questions():
    """Get grammar questions"""
    difficulty = request.args.get('difficulty', type=int)
    limit = request.args.get('limit', 10, type=int)
    tags = request.args.get('tags')  # Comma-separated tags
    
    module = Module.query.filter_by(slug='grammar').first()
    if not module:
        return jsonify({'error': 'Module not found'}), 404
    
    query = Question.query.filter_by(module_id=module.id, is_active=True)
    
    if difficulty:
        query = query.filter_by(difficulty=difficulty)
    
    questions = query.limit(limit).all()
    
    return jsonify({
        'questions': [q.to_dict(include_answer=True) for q in questions],
        'total': len(questions)
    }), 200


@grammar_bp.route('/questions/<int:question_id>', methods=['GET'])
@jwt_required()
def get_question(question_id):
    """Get specific grammar question"""
    question = db.session.get(Question, question_id)
    
    if not question:
        return jsonify({'error': 'Question not found'}), 404
    
    return jsonify({'question': question.to_dict(include_answer=True)}), 200


@grammar_bp.route('/submit', methods=['POST'])
@jwt_required()
def submit_answer():
    """Submit answer for grammar question"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    question_id = data.get('question_id')
    user_answer = data.get('answer')
    time_taken = data.get('time_taken', 0)
    
    question = db.session.get(Question, question_id)
    if not question:
        return jsonify({'error': 'Question not found'}), 404
    
    # Score the answer
    score_result = ScoringService.score_grammar(
        user_answer,
        question.correct_answer,
        question.type
    )
    
    # Create attempt
    attempt = Attempt(
        user_id=user_id,
        question_id=question_id,
        user_answer=user_answer,
        time_taken=time_taken,
        is_correct=score_result['is_correct'],
        is_completed=True,
        completed_at=datetime.utcnow()
    )
    db.session.add(attempt)
    db.session.flush()
    
    # Create score
    score = Score(
        attempt_id=attempt.id,
        total_score=score_result['score'],
        max_score=100,
        percentage=score_result['score'],
        feedback='Correct!' if score_result['is_correct'] else f'The correct answer is: {question.correct_answer}'
    )
    db.session.add(score)
    db.session.commit()
    
    return jsonify({
        'attempt': attempt.to_dict(),
        'is_correct': score_result['is_correct'],
        'correct_answer': question.correct_answer,
        'explanation': question.explanation
    }), 201


@grammar_bp.route('/batch-submit', methods=['POST'])
@jwt_required()
def batch_submit():
    """Submit multiple grammar answers at once"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data or 'answers' not in data:
        return jsonify({'error': 'No answers provided'}), 400
    
    answers = data.get('answers', [])
    total_time = data.get('total_time', 0)
    
    results = []
    correct_count = 0
    
    for answer_data in answers:
        question_id = answer_data.get('question_id')
        user_answer = answer_data.get('answer')
        
        question = db.session.get(Question, question_id)
        if not question:
            continue
        
        score_result = ScoringService.score_grammar(
            user_answer,
            question.correct_answer,
            question.type
        )
        
        if score_result['is_correct']:
            correct_count += 1
        
        # Create attempt
        attempt = Attempt(
            user_id=user_id,
            question_id=question_id,
            user_answer=user_answer,
            is_correct=score_result['is_correct'],
            is_completed=True,
            completed_at=datetime.utcnow()
        )
        db.session.add(attempt)
        db.session.flush()
        
        # Create score
        score = Score(
            attempt_id=attempt.id,
            total_score=score_result['score'],
            max_score=100,
            percentage=score_result['score']
        )
        db.session.add(score)
        
        results.append({
            'question_id': question_id,
            'is_correct': score_result['is_correct'],
            'correct_answer': question.correct_answer
        })
    
    db.session.commit()
    
    total = len(results)
    percentage = (correct_count / total * 100) if total > 0 else 0
    
    return jsonify({
        'results': results,
        'summary': {
            'correct': correct_count,
            'total': total,
            'percentage': round(percentage, 1)
        }
    }), 201


@grammar_bp.route('/attempts', methods=['GET'])
@jwt_required()
def get_attempts():
    """Get user's grammar attempts"""
    user_id = get_jwt_identity()
    limit = request.args.get('limit', 20, type=int)
    
    module = Module.query.filter_by(slug='grammar').first()
    if not module:
        return jsonify({'error': 'Module not found'}), 404
    
    attempts = Attempt.query.join(Question).filter(
        Attempt.user_id == user_id,
        Question.module_id == module.id,
        Attempt.is_completed == True
    ).order_by(Attempt.completed_at.desc()).limit(limit).all()
    
    return jsonify({
        'attempts': [a.to_dict() for a in attempts]
    }), 200

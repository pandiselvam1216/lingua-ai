"""
Listening module routes
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app import db
from app.models.module import Module, Question
from app.models.attempt import Attempt, Score

listening_bp = Blueprint('listening', __name__)


@listening_bp.route('/questions', methods=['GET'])
@jwt_required()
def get_questions():
    """Get listening questions"""
    difficulty = request.args.get('difficulty', type=int)
    limit = request.args.get('limit', 10, type=int)
    
    module = Module.query.filter_by(slug='listening').first()
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


@listening_bp.route('/questions/<int:question_id>', methods=['GET'])
@jwt_required()
def get_question(question_id):
    """Get specific listening question"""
    question = db.session.get(Question, question_id)
    
    if not question:
        return jsonify({'error': 'Question not found'}), 404
    
    return jsonify({'question': question.to_dict(include_answer=True)}), 200


@listening_bp.route('/submit', methods=['POST'])
@jwt_required()
def submit_answer():
    """Submit answer for listening question"""
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
    
    # Check if answer is correct
    is_correct = False
    if question.type == 'mcq':
        is_correct = str(user_answer).lower().strip() == str(question.correct_answer).lower().strip()
    else:
        # For short answers, check for keyword match
        correct_keywords = question.correct_answer.lower().split()
        user_keywords = user_answer.lower().split()
        match_count = sum(1 for kw in correct_keywords if kw in user_keywords)
        is_correct = match_count >= len(correct_keywords) * 0.7  # 70% match threshold
    
    # Create attempt
    attempt = Attempt(
        user_id=user_id,
        question_id=question_id,
        user_answer=user_answer,
        time_taken=time_taken,
        is_correct=is_correct,
        is_completed=True,
        completed_at=datetime.utcnow()
    )
    db.session.add(attempt)
    db.session.flush()
    
    # Create score
    score_value = question.points if is_correct else 0
    score = Score(
        attempt_id=attempt.id,
        total_score=score_value,
        max_score=question.points,
        percentage=(score_value / question.points * 100) if question.points else 0,
        feedback='Correct!' if is_correct else f'The correct answer was: {question.correct_answer}'
    )
    db.session.add(score)
    db.session.commit()
    
    return jsonify({
        'attempt': attempt.to_dict(),
        'is_correct': is_correct,
        'correct_answer': question.correct_answer,
        'explanation': question.explanation
    }), 201


@listening_bp.route('/attempts', methods=['GET'])
@jwt_required()
def get_attempts():
    """Get user's listening attempts"""
    user_id = get_jwt_identity()
    limit = request.args.get('limit', 20, type=int)
    
    module = Module.query.filter_by(slug='listening').first()
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

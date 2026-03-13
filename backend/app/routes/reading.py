"""
Reading module routes
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app import db
from app.models.module import Module, Question
from app.models.attempt import Attempt, Score
from app.services.scoring_service import ScoringService

reading_bp = Blueprint('reading', __name__)


@reading_bp.route('/passages', methods=['GET'])
@jwt_required()
def get_passages():
    """Get reading passages with questions"""
    difficulty = request.args.get('difficulty', type=int)
    limit = request.args.get('limit', 10, type=int)
    
    module = Module.query.filter_by(slug='reading').first()
    if not module:
        return jsonify({'error': 'Module not found'}), 404
    
    query = Question.query.filter_by(module_id=module.id, is_active=True)
    
    if difficulty:
        query = query.filter_by(difficulty=difficulty)
    
    passages = query.limit(limit).all()
    
    return jsonify({
        'passages': [p.to_dict() for p in passages],
        'total': len(passages)
    }), 200


@reading_bp.route('/passages/<int:passage_id>', methods=['GET'])
@jwt_required()
def get_passage(passage_id):
    """Get specific passage with questions"""
    passage = db.session.get(Question, passage_id)
    
    if not passage:
        return jsonify({'error': 'Passage not found'}), 404
    
    return jsonify({'passage': passage.to_dict()}), 200


@reading_bp.route('/submit', methods=['POST'])
@jwt_required()
def submit_answers():
    """Submit answers for reading comprehension"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    passage_id = data.get('passage_id')
    answers = data.get('answers', [])  # List of {question_index, answer}
    time_taken = data.get('time_taken', 0)
    
    passage = db.session.get(Question, passage_id)
    if not passage:
        return jsonify({'error': 'Passage not found'}), 404
    
    # Get correct answers from passage options
    correct_answers = passage.options if passage.options else []
    
    # Score answers
    score_result = ScoringService.score_reading(
        [{'answer': a.get('answer', '')} for a in answers],
        [{'answer': c.get('correct_answer', '')} for c in correct_answers]
    )
    
    # Create attempt
    attempt = Attempt(
        user_id=user_id,
        question_id=passage_id,
        user_answer=str(answers),
        time_taken=time_taken,
        is_correct=score_result['percentage'] >= 70,
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
        percentage=score_result['percentage'],
        breakdown={
            'correct': score_result['correct'],
            'total': score_result['total']
        },
        feedback=score_result.get('feedback', '')
    )
    db.session.add(score)
    db.session.commit()
    
    return jsonify({
        'attempt': attempt.to_dict(),
        'score': score.to_dict(),
        'correct_answers': correct_answers
    }), 201


@reading_bp.route('/attempts', methods=['GET'])
@jwt_required()
def get_attempts():
    """Get user's reading attempts"""
    user_id = get_jwt_identity()
    limit = request.args.get('limit', 20, type=int)
    
    module = Module.query.filter_by(slug='reading').first()
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

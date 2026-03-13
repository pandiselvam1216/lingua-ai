"""
Critical Thinking (JAM) module routes
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app import db
from app.models.module import Module, Question
from app.models.attempt import Attempt, Score
from app.services.scoring_service import ScoringService

critical_thinking_bp = Blueprint('critical_thinking', __name__)


@critical_thinking_bp.route('/prompts', methods=['GET'])
@jwt_required()
def get_prompts():
    """Get JAM prompts"""
    module = Module.query.filter_by(slug='critical-thinking').first()
    if not module:
        return jsonify({'error': 'Module not found'}), 404
    
    prompts = Question.query.filter_by(module_id=module.id, is_active=True).limit(10).all()
    return jsonify({'prompts': [p.to_dict() for p in prompts]}), 200


@critical_thinking_bp.route('/submit', methods=['POST'])
@jwt_required()
def submit_response():
    """Submit JAM response"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    prompt_id = data.get('prompt_id')
    response_text = data.get('response', '')
    response_type = data.get('type', 'written')
    time_taken = data.get('time_taken', 0)
    
    if not response_text:
        return jsonify({'error': 'No response provided'}), 400
    
    prompt = db.session.get(Question, prompt_id) if prompt_id else None
    keywords = prompt.tags if prompt else []
    
    score_result = ScoringService.score_critical_thinking(response_text, keywords)
    
    attempt = Attempt(
        user_id=user_id,
        question_id=prompt_id,
        user_answer=response_text,
        transcript=response_text if response_type == 'spoken' else None,
        time_taken=time_taken,
        is_completed=True,
        completed_at=datetime.utcnow()
    )
    db.session.add(attempt)
    db.session.flush()
    
    score = Score(
        attempt_id=attempt.id,
        total_score=score_result['overall'],
        max_score=100,
        percentage=score_result['overall'],
        breakdown={
            'content': score_result['content'],
            'structure': score_result['structure'],
            'argument': score_result['argument']
        },
        feedback=score_result['feedback']
    )
    db.session.add(score)
    db.session.commit()
    
    return jsonify({
        'attempt': attempt.to_dict(),
        'score': score.to_dict(),
        'analysis': {
            'word_count': score_result.get('word_count', 0),
            'sentence_count': score_result.get('sentence_count', 0)
        }
    }), 201


@critical_thinking_bp.route('/attempts', methods=['GET'])
@jwt_required()
def get_attempts():
    """Get JAM attempts"""
    user_id = get_jwt_identity()
    module = Module.query.filter_by(slug='critical-thinking').first()
    
    if not module:
        return jsonify({'attempts': []}), 200
    
    attempts = Attempt.query.join(Question).filter(
        Attempt.user_id == user_id,
        Question.module_id == module.id
    ).order_by(Attempt.completed_at.desc()).limit(20).all()
    
    return jsonify({'attempts': [a.to_dict() for a in attempts]}), 200

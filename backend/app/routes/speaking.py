"""
Speaking module routes
Uses browser Web Speech API on frontend, transcript sent to backend for scoring
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app import db
from app.models.module import Module, Question
from app.models.attempt import Attempt, Score
from app.services.scoring_service import ScoringService
from app.services.feedback_trainer import FeedbackTrainer

speaking_bp = Blueprint('speaking', __name__)


@speaking_bp.route('/prompts', methods=['GET'])
@jwt_required()
def get_prompts():
    """Get speaking prompts"""
    difficulty = request.args.get('difficulty', type=int)
    limit = request.args.get('limit', 10, type=int)
    
    module = Module.query.filter_by(slug='speaking').first()
    if not module:
        return jsonify({'error': 'Module not found'}), 404
    
    query = Question.query.filter_by(module_id=module.id, is_active=True)
    
    if difficulty:
        query = query.filter_by(difficulty=difficulty)
    
    prompts = query.limit(limit).all()
    
    return jsonify({
        'prompts': [p.to_dict() for p in prompts],
        'total': len(prompts)
    }), 200


@speaking_bp.route('/prompts/<int:prompt_id>', methods=['GET'])
@jwt_required()
def get_prompt(prompt_id):
    """Get specific speaking prompt"""
    prompt = db.session.get(Question, prompt_id)
    
    if not prompt:
        return jsonify({'error': 'Prompt not found'}), 404
    
    return jsonify({'prompt': prompt.to_dict()}), 200


@speaking_bp.route('/submit', methods=['POST'])
@jwt_required()
def submit_speech():
    """Submit speech transcript for scoring"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    prompt_id = data.get('prompt_id')
    transcript = data.get('transcript', '')
    duration = data.get('duration', 0)  # Speech duration in seconds
    
    if not transcript:
        return jsonify({'error': 'No transcript provided'}), 400
    
    # Get prompt (optional - can score without specific prompt)
    prompt = None
    if prompt_id:
        prompt = db.session.get(Question, prompt_id)
    
    # Score the transcript
    score_result = ScoringService.score_speaking(transcript, duration)
    
    # Create attempt
    attempt = Attempt(
        user_id=user_id,
        question_id=prompt_id if prompt else None,
        transcript=transcript,
        time_taken=duration,
        is_completed=True,
        completed_at=datetime.utcnow()
    )
    db.session.add(attempt)
    db.session.flush()
    
    # Create score
    score = Score(
        attempt_id=attempt.id,
        total_score=score_result['overall'],
        max_score=100,
        percentage=score_result['overall'],
        breakdown={
            'fluency': score_result['fluency'],
            'clarity': score_result['clarity'],
            'vocabulary': score_result['vocabulary'],
            'confidence': score_result['confidence']
        },
        feedback=score_result['feedback'],
        suggestions=[
            'Practice speaking more slowly and clearly',
            'Reduce filler words like "um" and "uh"',
            'Use more varied vocabulary',
            'Structure your response with clear beginning, middle, and end'
        ] if score_result['overall'] < 70 else ['Great job! Keep practicing!']
    )
    db.session.add(score)
    db.session.commit()
    
    return jsonify({
        'attempt_id': attempt.id,
        'score': score.to_dict(),
        'analysis': {
            'word_count': score_result.get('word_count', 0),
            'sentence_count': score_result.get('sentence_count', 0),
            'filler_count': score_result.get('filler_count', 0)
        }
    }), 201


@speaking_bp.route('/score', methods=['POST'])
@jwt_required()
def score_transcript():
    """Score a transcript without saving (for practice mode)"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    transcript = data.get('transcript', '')
    
    if not transcript:
        return jsonify({'error': 'No transcript provided'}), 400
    
    score_result = ScoringService.score_speaking(transcript)
    
    return jsonify({
        'score': score_result
    }), 200


@speaking_bp.route('/attempts', methods=['GET'])
@jwt_required()
def get_attempts():
    """Get user's speaking attempts"""
    user_id = get_jwt_identity()
    limit = request.args.get('limit', 20, type=int)
    
    module = Module.query.filter_by(slug='speaking').first()
    
    if module:
        attempts = Attempt.query.join(Question).filter(
            Attempt.user_id == user_id,
            Question.module_id == module.id,
            Attempt.is_completed == True
        ).order_by(Attempt.completed_at.desc()).limit(limit).all()
    else:
        # Get attempts without question (free practice)
        attempts = Attempt.query.filter(
            Attempt.user_id == user_id,
            Attempt.transcript.isnot(None),
            Attempt.is_completed == True
        ).order_by(Attempt.completed_at.desc()).limit(limit).all()
    
    return jsonify({
        'attempts': [a.to_dict() for a in attempts]
    }), 200

@speaking_bp.route('/feedback/train', methods=['POST'])
@jwt_required()
def train_feedback():
    """Add or update a feedback rule for the speaking module."""
    data = request.get_json()
    if not data or 'keyword' not in data or 'feedback' not in data:
        return jsonify({'error': 'keyword and feedback required'}), 400
    FeedbackTrainer.save_rule(data['keyword'], data['feedback'])
    return jsonify({'message': 'Feedback rule saved'}), 200

@speaking_bp.route('/feedback/rules', methods=['GET'])
@jwt_required()
def get_feedback_rules():
    """Retrieve all feedback rules for the speaking module."""
    rules = FeedbackTrainer.load_rules()
    return jsonify({'rules': rules}), 200

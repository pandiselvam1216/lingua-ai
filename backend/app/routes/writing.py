"""
Writing module routes
Uses LanguageTool API for grammar checking
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app import db
from app.models.module import Module, Question
from app.models.attempt import Attempt, Score, Essay, GrammarCorrection
from app.services.scoring_service import ScoringService
from app.services.external_api import ExternalAPIService

writing_bp = Blueprint('writing', __name__)


@writing_bp.route('/prompts', methods=['GET'])
@jwt_required()
def get_prompts():
    """Get writing prompts"""
    difficulty = request.args.get('difficulty', type=int)
    limit = request.args.get('limit', 10, type=int)
    
    module = Module.query.filter_by(slug='writing').first()
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


@writing_bp.route('/check', methods=['POST'])
@jwt_required()
def check_grammar():
    """Check grammar using LanguageTool API (without saving)"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    text = data.get('text', '')
    
    if not text:
        return jsonify({'error': 'No text provided'}), 400
    
    result = ExternalAPIService.check_grammar(text)
    
    return jsonify(result), 200


@writing_bp.route('/submit', methods=['POST'])
@jwt_required()
def submit_essay():
    """Submit essay for evaluation"""
    user_id = get_jwt_identity()
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    prompt_id = data.get('prompt_id')
    text = data.get('text', '')
    time_taken = data.get('time_taken', 0)
    
    if not text or len(text.strip()) < 50:
        return jsonify({'error': 'Essay must be at least 50 characters'}), 400
    
    # Check grammar with LanguageTool
    grammar_result = ExternalAPIService.check_grammar(text)
    grammar_issues = grammar_result.get('issues', []) if grammar_result.get('success') else []
    
    # Score the essay
    score_result = ScoringService.score_essay(text, grammar_issues)
    
    # Create attempt
    attempt = Attempt(
        user_id=user_id,
        question_id=prompt_id if prompt_id else None,
        user_answer=text,
        time_taken=time_taken,
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
            'grammar': score_result['grammar'],
            'clarity': score_result['clarity'],
            'vocabulary': score_result['vocabulary'],
            'structure': score_result['structure']
        },
        feedback=score_result['feedback']
    )
    db.session.add(score)
    
    # Create essay record
    essay = Essay(
        attempt_id=attempt.id,
        original_text=text,
        word_count=score_result.get('word_count', 0),
        grammar_score=score_result['grammar'],
        clarity_score=score_result['clarity'],
        vocabulary_score=score_result['vocabulary'],
        structure_score=score_result['structure'],
        overall_score=score_result['overall']
    )
    db.session.add(essay)
    db.session.flush()
    
    # Save grammar corrections
    for issue in grammar_issues[:20]:  # Limit to first 20 issues
        correction = GrammarCorrection(
            essay_id=essay.id,
            error_type=issue.get('type', 'unknown'),
            original_text=issue.get('context', ''),
            suggested_text=issue.get('replacements', [''])[0] if issue.get('replacements') else '',
            message=issue.get('message', ''),
            offset=issue.get('offset', 0),
            length=issue.get('length', 0)
        )
        db.session.add(correction)
    
    db.session.commit()
    
    return jsonify({
        'attempt': attempt.to_dict(),
        'essay': essay.to_dict(),
        'grammar_issues': grammar_issues[:20],
        'analysis': {
            'word_count': score_result.get('word_count', 0),
            'sentence_count': score_result.get('sentence_count', 0),
            'paragraph_count': score_result.get('paragraph_count', 0)
        }
    }), 201


@writing_bp.route('/attempts', methods=['GET'])
@jwt_required()
def get_attempts():
    """Get user's writing attempts"""
    user_id = get_jwt_identity()
    limit = request.args.get('limit', 20, type=int)
    
    module = Module.query.filter_by(slug='writing').first()
    
    attempts = Attempt.query.filter(
        Attempt.user_id == user_id,
        Attempt.is_completed == True
    ).order_by(Attempt.completed_at.desc()).limit(limit).all()
    
    # Filter to writing attempts (those with essays)
    writing_attempts = [a for a in attempts if a.essay]
    
    return jsonify({
        'attempts': [a.to_dict() for a in writing_attempts]
    }), 200


@writing_bp.route('/essays/<int:essay_id>', methods=['GET'])
@jwt_required()
def get_essay(essay_id):
    """Get specific essay with corrections"""
    user_id = get_jwt_identity()
    
    essay = db.session.get(Essay, essay_id)
    
    if not essay:
        return jsonify({'error': 'Essay not found'}), 404
    
    # Verify ownership
    if essay.attempt.user_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    return jsonify({'essay': essay.to_dict()}), 200

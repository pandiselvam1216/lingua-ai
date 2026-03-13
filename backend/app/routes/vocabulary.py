"""
Vocabulary module routes - Free Dictionary API
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from app import db
from app.models.vocabulary import SavedVocabulary
from app.services.external_api import ExternalAPIService

vocabulary_bp = Blueprint('vocabulary', __name__)


@vocabulary_bp.route('/search', methods=['GET'])
@jwt_required()
def search_word():
    """Search for word definition"""
    word = request.args.get('word', '').strip()
    if not word:
        return jsonify({'error': 'No word provided'}), 400
    
    result = ExternalAPIService.get_word_definition(word)
    return jsonify(result), 200 if result.get('success') else 404


@vocabulary_bp.route('/saved', methods=['GET'])
@jwt_required()
def get_saved_words():
    """Get user's saved words"""
    user_id = get_jwt_identity()
    words = SavedVocabulary.query.filter_by(user_id=user_id).order_by(
        SavedVocabulary.created_at.desc()
    ).limit(50).all()
    
    return jsonify({'words': [w.to_dict() for w in words]}), 200


@vocabulary_bp.route('/saved', methods=['POST'])
@jwt_required()
def save_word():
    """Save a word"""
    user_id = get_jwt_identity()
    data = request.get_json()
    word = data.get('word', '').strip().lower()
    
    if not word:
        return jsonify({'error': 'No word provided'}), 400
    
    existing = SavedVocabulary.query.filter_by(user_id=user_id, word=word).first()
    if existing:
        return jsonify({'word': existing.to_dict()}), 409
    
    definition = ExternalAPIService.get_word_definition(word)
    
    saved = SavedVocabulary(user_id=user_id, word=word)
    if definition.get('success') and definition.get('meanings'):
        m = definition['meanings'][0]
        saved.part_of_speech = m.get('part_of_speech', '')
        if m.get('definitions'):
            saved.definition = m['definitions'][0].get('definition', '')
            saved.example = m['definitions'][0].get('example', '')
    
    db.session.add(saved)
    db.session.commit()
    return jsonify({'word': saved.to_dict()}), 201


@vocabulary_bp.route('/saved/<int:word_id>', methods=['DELETE'])
@jwt_required()
def delete_word(word_id):
    """Delete saved word"""
    user_id = get_jwt_identity()
    word = SavedVocabulary.query.filter_by(id=word_id, user_id=user_id).first()
    if not word:
        return jsonify({'error': 'Not found'}), 404
    
    db.session.delete(word)
    db.session.commit()
    return jsonify({'message': 'Deleted'}), 200

"""
SavedVocabulary model for user's saved words
"""

from app import db
from datetime import datetime


class SavedVocabulary(db.Model):
    """User's saved vocabulary words"""
    __tablename__ = 'saved_vocabulary'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    
    # Word details
    word = db.Column(db.String(100), nullable=False)
    phonetic = db.Column(db.String(100))
    part_of_speech = db.Column(db.String(50))
    definition = db.Column(db.Text)
    example = db.Column(db.Text)
    synonyms = db.Column(db.JSON)
    antonyms = db.Column(db.JSON)
    audio_url = db.Column(db.String(500))
    
    # Learning status
    is_learned = db.Column(db.Boolean, default=False)
    review_count = db.Column(db.Integer, default=0)
    last_reviewed = db.Column(db.DateTime)
    
    # Notes
    user_notes = db.Column(db.Text)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', back_populates='saved_vocabulary')
    
    # Unique constraint: user can't save the same word twice
    __table_args__ = (
        db.UniqueConstraint('user_id', 'word', name='unique_user_word'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'word': self.word,
            'phonetic': self.phonetic,
            'part_of_speech': self.part_of_speech,
            'definition': self.definition,
            'example': self.example,
            'synonyms': self.synonyms,
            'antonyms': self.antonyms,
            'audio_url': self.audio_url,
            'is_learned': self.is_learned,
            'review_count': self.review_count,
            'last_reviewed': self.last_reviewed.isoformat() if self.last_reviewed else None,
            'user_notes': self.user_notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

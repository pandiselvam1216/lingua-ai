"""
Attempt, Score, Essay models for tracking user progress
"""

from app import db
from datetime import datetime


class Attempt(db.Model):
    """User attempts on questions"""
    __tablename__ = 'attempts'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    question_id = db.Column(db.Integer, db.ForeignKey('questions.id'), nullable=False, index=True)
    
    # User's response
    user_answer = db.Column(db.Text)
    transcript = db.Column(db.Text)  # For speaking responses
    
    # Timing
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    time_taken = db.Column(db.Integer)  # Seconds
    
    # Status
    is_correct = db.Column(db.Boolean)
    is_completed = db.Column(db.Boolean, default=False)
    
    # Relationships
    user = db.relationship('User', back_populates='attempts')
    question = db.relationship('Question', back_populates='attempts')
    score = db.relationship('Score', back_populates='attempt', uselist=False)
    essay = db.relationship('Essay', back_populates='attempt', uselist=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'question_id': self.question_id,
            'user_answer': self.user_answer,
            'transcript': self.transcript,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'time_taken': self.time_taken,
            'is_correct': self.is_correct,
            'is_completed': self.is_completed,
            'score': self.score.to_dict() if self.score else None
        }


class Score(db.Model):
    """Detailed scoring for attempts"""
    __tablename__ = 'scores'
    
    id = db.Column(db.Integer, primary_key=True)
    attempt_id = db.Column(db.Integer, db.ForeignKey('attempts.id'), nullable=False, unique=True)
    
    # Overall score
    total_score = db.Column(db.Float, nullable=False)
    max_score = db.Column(db.Float, default=100)
    percentage = db.Column(db.Float)
    
    # Detailed breakdown (stored as JSON)
    breakdown = db.Column(db.JSON)  # e.g., {'fluency': 80, 'grammar': 75, 'vocabulary': 85}
    
    # Feedback
    feedback = db.Column(db.Text)
    suggestions = db.Column(db.JSON)  # List of improvement suggestions
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    attempt = db.relationship('Attempt', back_populates='score')
    
    def to_dict(self):
        return {
            'id': self.id,
            'attempt_id': self.attempt_id,
            'total_score': self.total_score,
            'max_score': self.max_score,
            'percentage': self.percentage,
            'breakdown': self.breakdown,
            'feedback': self.feedback,
            'suggestions': self.suggestions,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Essay(db.Model):
    """Essay submissions with grammar corrections"""
    __tablename__ = 'essays'
    
    id = db.Column(db.Integer, primary_key=True)
    attempt_id = db.Column(db.Integer, db.ForeignKey('attempts.id'), nullable=False, unique=True)
    
    # Original and corrected text
    original_text = db.Column(db.Text, nullable=False)
    corrected_text = db.Column(db.Text)
    word_count = db.Column(db.Integer)
    
    # Analysis
    grammar_score = db.Column(db.Float)
    clarity_score = db.Column(db.Float)
    vocabulary_score = db.Column(db.Float)
    structure_score = db.Column(db.Float)
    overall_score = db.Column(db.Float)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    attempt = db.relationship('Attempt', back_populates='essay')
    corrections = db.relationship('GrammarCorrection', back_populates='essay', lazy='dynamic')
    
    def to_dict(self):
        return {
            'id': self.id,
            'attempt_id': self.attempt_id,
            'original_text': self.original_text,
            'corrected_text': self.corrected_text,
            'word_count': self.word_count,
            'grammar_score': self.grammar_score,
            'clarity_score': self.clarity_score,
            'vocabulary_score': self.vocabulary_score,
            'structure_score': self.structure_score,
            'overall_score': self.overall_score,
            'corrections': [c.to_dict() for c in self.corrections],
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class GrammarCorrection(db.Model):
    """Individual grammar corrections for essays"""
    __tablename__ = 'grammar_corrections'
    
    id = db.Column(db.Integer, primary_key=True)
    essay_id = db.Column(db.Integer, db.ForeignKey('essays.id'), nullable=False)
    
    # Error details
    error_type = db.Column(db.String(100))  # 'spelling', 'grammar', 'punctuation', 'style'
    original_text = db.Column(db.Text)
    suggested_text = db.Column(db.Text)
    message = db.Column(db.Text)  # Explanation
    
    # Position in text
    offset = db.Column(db.Integer)
    length = db.Column(db.Integer)
    
    # Relationships
    essay = db.relationship('Essay', back_populates='corrections')
    
    def to_dict(self):
        return {
            'id': self.id,
            'error_type': self.error_type,
            'original_text': self.original_text,
            'suggested_text': self.suggested_text,
            'message': self.message,
            'offset': self.offset,
            'length': self.length
        }

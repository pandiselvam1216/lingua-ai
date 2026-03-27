"""
Module and Question models
"""

from app import db
from datetime import datetime


class Module(db.Model):
    """Learning modules (Listening, Speaking, Reading, etc.)"""
    __tablename__ = 'modules'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    slug = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.Text)
    icon = db.Column(db.String(50))
    color = db.Column(db.String(20))
    order = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    submodules = db.relationship('Submodule', backref='module', lazy='dynamic')
    questions = db.relationship('Question', back_populates='module', lazy='dynamic')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'slug': self.slug,
            'description': self.description,
            'icon': self.icon,
            'color': self.color,
            'order': self.order,
            'is_active': self.is_active
        }
    
    @staticmethod
    def get_default_modules():
        return [
            {'name': 'Listening', 'slug': 'listening', 'description': 'Audio comprehension exercises', 'icon': 'headphones', 'color': '#6366F1', 'order': 1},
            {'name': 'Speaking', 'slug': 'speaking', 'description': 'Speech and pronunciation practice', 'icon': 'mic', 'color': '#8B5CF6', 'order': 2},
            {'name': 'Reading', 'slug': 'reading', 'description': 'Reading comprehension passages', 'icon': 'book-open', 'color': '#06B6D4', 'order': 3},
            {'name': 'Writing', 'slug': 'writing', 'description': 'Essay and composition writing', 'icon': 'edit-3', 'color': '#10B981', 'order': 4},
            {'name': 'Grammar', 'slug': 'grammar', 'description': 'Grammar rules and exercises', 'icon': 'check-square', 'color': '#F59E0B', 'order': 5},
            {'name': 'Vocabulary', 'slug': 'vocabulary', 'description': 'Word meanings and usage', 'icon': 'book', 'color': '#EF4444', 'order': 6},
            {'name': 'Critical Thinking', 'slug': 'critical-thinking', 'description': 'JAM sessions and analytical skills', 'icon': 'brain', 'color': '#EC4899', 'order': 7}
        ]


class Submodule(db.Model):
    """Sub-categories within a module (e.g., Grammar -> Tenses)"""
    __tablename__ = 'submodules'
    
    id = db.Column(db.Integer, primary_key=True)
    module_id = db.Column(db.Integer, db.ForeignKey('modules.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    slug = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    topics = db.relationship('Topic', backref='submodule', lazy='dynamic')
    questions = db.relationship('Question', backref='submodule_obj', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'module_id': self.module_id,
            'name': self.name,
            'slug': self.slug,
            'description': self.description
        }


class Topic(db.Model):
    """Specific topics within a submodule (e.g., Tenses -> Present Perfect)"""
    __tablename__ = 'topics'
    
    id = db.Column(db.Integer, primary_key=True)
    submodule_id = db.Column(db.Integer, db.ForeignKey('submodules.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    slug = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    questions = db.relationship('Question', backref='topic_obj', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id,
            'submodule_id': self.submodule_id,
            'name': self.name,
            'slug': self.slug,
            'description': self.description
        }


class ListeningModule(db.Model):
    """Structured listening content (referenced as a topic context in UI)"""
    __tablename__ = 'listening_modules'
    
    id = db.Column(db.String(36), primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(100), nullable=True)
    audio_url = db.Column(db.Text, nullable=True)
    tts_config = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship to questions (Legacy link)
    questions = db.relationship('Question', backref='listening_module', lazy='dynamic')
    
    def to_dict(self):
        import json
        return {
            'id': self.id,
            'title': self.title,
            'content': self.content,
            'category': self.category,
            'audio_url': self.audio_url,
            'tts_config': json.loads(self.tts_config) if self.tts_config else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Question(db.Model):
    """Questions for all modules"""
    __tablename__ = 'questions'
    
    id = db.Column(db.Integer, primary_key=True)
    module_id = db.Column(db.Integer, db.ForeignKey('modules.id'), nullable=False)
    submodule_id = db.Column(db.Integer, db.ForeignKey('submodules.id'), nullable=True)
    topic_id = db.Column(db.Integer, db.ForeignKey('topics.id'), nullable=True)
    
    # Legacy link for listening
    listening_module_id = db.Column(db.String(36), db.ForeignKey('listening_modules.id'), nullable=True)
    
    # Question content
    type = db.Column(db.String(50), nullable=False)
    category = db.Column(db.String(100), nullable=True) # Legacy category
    title = db.Column(db.String(200))
    content = db.Column(db.Text, nullable=False)
    
    # Media
    media_url = db.Column(db.Text)
    passage_text = db.Column(db.Text)
    pdf_name = db.Column(db.String(255))
    
    # Options
    options = db.Column(db.JSON)
    correct_answer = db.Column(db.Text)
    explanation = db.Column(db.Text)
    
    # Metadata
    difficulty = db.Column(db.Integer, default=1)
    points = db.Column(db.Integer, default=10)
    time_limit = db.Column(db.Integer)
    tags = db.Column(db.JSON)
    tts_config = db.Column(db.Text, nullable=True)
    
    # Sub-module specific
    sub_module = db.Column(db.String(50)) # Legacy submodule
    word_limit = db.Column(db.Integer, default=150)
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    is_published = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    module = db.relationship('Module', back_populates='questions')
    attempts = db.relationship('Attempt', back_populates='question', lazy='dynamic')
    
    def to_dict(self, include_answer=False):
        import json
        data = {
            'id': self.id,
            'module_id': self.module_id,
            'submodule_id': self.submodule_id,
            'topic_id': self.topic_id,
            'listening_module_id': self.listening_module_id,
            'type': self.type,
            'category': self.category,
            'title': self.title,
            'content': self.content,
            'media_url': self.media_url,
            'passage_text': self.passage_text,
            'options': self.options,
            'difficulty': self.difficulty,
            'points': self.points,
            'time_limit': self.time_limit,
            'tags': self.tags,
            'tts_config': json.loads(self.tts_config) if self.tts_config and isinstance(self.tts_config, str) else self.tts_config,
            'pdf_name': self.pdf_name,
            'sub_module': self.sub_module,
            'word_limit': self.word_limit,
            'is_active': self.is_active,
            'is_published': self.is_published
        }
        if include_answer:
            data['correct_answer'] = self.correct_answer
            data['explanation'] = self.explanation
        return data

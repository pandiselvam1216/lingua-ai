"""
User and Role models
"""

from app import db
from datetime import datetime
import bcrypt


class Role(db.Model):
    """User roles: Student, Teacher, Admin"""
    __tablename__ = 'roles'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)
    description = db.Column(db.String(200))
    permissions = db.Column(db.JSON, default=dict)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    users = db.relationship('User', back_populates='role', lazy='dynamic')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'permissions': self.permissions
        }
    
    @staticmethod
    def get_default_roles():
        return [
            {'name': 'student', 'description': 'Student user', 'permissions': {'access_modules': True}},
            {'name': 'teacher', 'description': 'Teacher user', 'permissions': {'access_modules': True, 'view_students': True, 'manage_content': True}},
            {'name': 'admin', 'description': 'Administrator', 'permissions': {'access_modules': True, 'view_students': True, 'manage_content': True, 'manage_users': True, 'manage_pricing': True}}
        ]


class User(db.Model):
    """User model for authentication and profile"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(128), nullable=False)
    full_name = db.Column(db.String(100), nullable=False)
    avatar_url = db.Column(db.String(500))
    phone = db.Column(db.String(20))
    
    # Foreign keys
    role_id = db.Column(db.Integer, db.ForeignKey('roles.id'), nullable=False)
    institution_id = db.Column(db.Integer, db.ForeignKey('institutions.id'))
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    is_verified = db.Column(db.Boolean, default=False)
    
    # Relationships
    role = db.relationship('Role', back_populates='users')
    institution = db.relationship('Institution', back_populates='users')
    attempts = db.relationship('Attempt', back_populates='user', lazy='dynamic')
    saved_vocabulary = db.relationship('SavedVocabulary', back_populates='user', lazy='dynamic')
    
    def set_password(self, password):
        """Hash and set password"""
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    def check_password(self, password):
        """Verify password"""
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
    
    def to_dict(self, include_sensitive=False):
        data = {
            'id': self.id,
            'email': self.email,
            'full_name': self.full_name,
            'avatar_url': self.avatar_url,
            'phone': self.phone,
            'role': self.role.to_dict() if self.role else None,
            'institution_id': self.institution_id,
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'last_login': self.last_login.isoformat() if self.last_login else None
        }
        return data
    
    def has_permission(self, permission):
        """Check if user has a specific permission"""
        if not self.role or not self.role.permissions:
            return False
        return self.role.permissions.get(permission, False)

"""
Authentication service
"""

from datetime import datetime
from flask_jwt_extended import create_access_token, create_refresh_token
from app import db
from app.models.user import User, Role
from app.utils.validators import validate_email, validate_password, validate_name


class AuthService:
    """Service for authentication operations"""
    
    @staticmethod
    def register(email: str, password: str, full_name: str, role_name: str = 'student') -> dict:
        """Register a new user"""
        # Validate inputs
        valid, error = validate_email(email)
        if not valid:
            return {'success': False, 'error': error}
        
        valid, error = validate_password(password)
        if not valid:
            return {'success': False, 'error': error}
        
        valid, error = validate_name(full_name)
        if not valid:
            return {'success': False, 'error': error}
        
        # Check if email exists
        if User.query.filter_by(email=email.lower()).first():
            return {'success': False, 'error': 'Email already registered'}
        
        # Get role
        role = Role.query.filter_by(name=role_name).first()
        if not role:
            return {'success': False, 'error': 'Invalid role'}
        
        # Create user
        user = User(
            email=email.lower(),
            full_name=full_name,
            role_id=role.id
        )
        user.set_password(password)
        
        db.session.add(user)
        db.session.commit()
        
        # Generate tokens
        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))
        
        return {
            'success': True,
            'user': user.to_dict(),
            'access_token': access_token,
            'refresh_token': refresh_token
        }
    
    @staticmethod
    def login(email: str, password: str) -> dict:
        """Authenticate user and return tokens"""
        if not email or not password:
            return {'success': False, 'error': 'Email and password are required'}
        
        user = User.query.filter_by(email=email.lower()).first()
        
        if not user:
            return {'success': False, 'error': 'Invalid email or password'}
        
        if not user.check_password(password):
            return {'success': False, 'error': 'Invalid email or password'}
        
        if not user.is_active:
            return {'success': False, 'error': 'Account is deactivated'}
        
        # Update last login
        user.last_login = datetime.utcnow()
        db.session.commit()
        
        # Generate tokens
        access_token = create_access_token(identity=str(user.id))
        refresh_token = create_refresh_token(identity=str(user.id))
        
        return {
            'success': True,
            'user': user.to_dict(),
            'access_token': access_token,
            'refresh_token': refresh_token
        }
    
    @staticmethod
    def refresh_token(user_id: int) -> dict:
        """Generate new access token"""
        user = db.session.get(User, user_id)
        
        if not user:
            return {'success': False, 'error': 'User not found'}
        
        if not user.is_active:
            return {'success': False, 'error': 'Account is deactivated'}
        
        access_token = create_access_token(identity=str(user.id))
        
        return {
            'success': True,
            'access_token': access_token
        }
    
    @staticmethod
    def get_user_by_id(user_id) -> User:
        """Get user by ID"""
        return db.session.get(User, int(user_id))

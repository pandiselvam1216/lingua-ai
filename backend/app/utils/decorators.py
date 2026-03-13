"""
Utility decorators for route protection
"""

from functools import wraps
from flask import jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from app import db
from app.models.user import User


def role_required(*roles):
    """Decorator to require specific role(s) for route access"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            user = db.session.get(User, user_id)
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            if not user.role or user.role.name not in roles:
                return jsonify({'error': 'Insufficient permissions'}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def permission_required(permission):
    """Decorator to require specific permission for route access"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            user = db.session.get(User, user_id)
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            if not user.has_permission(permission):
                return jsonify({'error': 'Permission denied'}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def get_current_user():
    """Get the current authenticated user"""
    user_id = get_jwt_identity()
    return db.session.get(User, user_id)

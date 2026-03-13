"""
Authentication routes
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.services.auth_service import AuthService

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    result = AuthService.register(
        email=data.get('email', ''),
        password=data.get('password', ''),
        full_name=data.get('full_name', ''),
        role_name=data.get('role', 'student')
    )
    
    if result.get('success'):
        return jsonify(result), 201
    else:
        return jsonify({'error': result.get('error')}), 400


@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate user and return tokens"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    result = AuthService.login(
        email=data.get('email', ''),
        password=data.get('password', '')
    )
    
    if result.get('success'):
        return jsonify(result), 200
    else:
        return jsonify({'error': result.get('error')}), 401


@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token"""
    user_id = get_jwt_identity()
    result = AuthService.refresh_token(user_id)
    
    if result.get('success'):
        return jsonify(result), 200
    else:
        return jsonify({'error': result.get('error')}), 401


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current authenticated user"""
    user_id = get_jwt_identity()
    user = AuthService.get_user_by_id(user_id)
    
    if user:
        return jsonify({'user': user.to_dict()}), 200
    else:
        return jsonify({'error': 'User not found'}), 404


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout user (client should delete tokens)"""
    # In a stateless JWT setup, logout is handled client-side
    # For enhanced security, you could implement token blacklisting
    return jsonify({'message': 'Logged out successfully'}), 200

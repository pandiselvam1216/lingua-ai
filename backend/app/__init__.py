"""
NeuraLingua - AI-Powered English Communication Platform
A NeuraGlobal Product
"""

from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from datetime import timedelta
import os

db = SQLAlchemy()
jwt = JWTManager()


def create_app(config_name=None):
    """Application factory pattern"""
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-key-change-in-production')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)
    
    # Database configuration
    database_url = os.getenv('DATABASE_URL', 'sqlite:///neuralingua.db')
    app.config['SQLALCHEMY_DATABASE_URI'] = database_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    # CORS Configuration
    # Allow specific origins from environment variable, or default to localhost for development
    cors_origins = os.getenv('CORS_ORIGINS', 'http://localhost:5173,http://localhost:3000').split(',')
    CORS(app, resources={r"/api/*": {"origins": cors_origins}}, supports_credentials=True)
    
    # JWT error handlers
    @jwt.invalid_token_loader
    def invalid_token_callback(error_string):
        return {'error': 'Invalid token', 'message': error_string}, 401
    
    @jwt.unauthorized_loader
    def missing_token_callback(error_string):
        return {'error': 'Authorization required', 'message': error_string}, 401
    
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return {'error': 'Token has expired'}, 401
    
    @jwt.token_verification_failed_loader
    def token_verification_failed_callback(jwt_header, jwt_payload):
        return {'error': 'Token verification failed'}, 401
    
    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.users import users_bp
    from app.routes.dashboard import dashboard_bp
    from app.routes.listening import listening_bp
    from app.routes.speaking import speaking_bp
    from app.routes.reading import reading_bp
    from app.routes.writing import writing_bp
    from app.routes.grammar import grammar_bp
    from app.routes.vocabulary import vocabulary_bp
    from app.routes.critical_thinking import critical_thinking_bp
    from app.routes.pricing import pricing_bp
    from app.routes.admin import admin_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(listening_bp, url_prefix='/api/listening')
    app.register_blueprint(speaking_bp, url_prefix='/api/speaking')
    app.register_blueprint(reading_bp, url_prefix='/api/reading')
    app.register_blueprint(writing_bp, url_prefix='/api/writing')
    app.register_blueprint(grammar_bp, url_prefix='/api/grammar')
    app.register_blueprint(vocabulary_bp, url_prefix='/api/vocabulary')
    app.register_blueprint(critical_thinking_bp, url_prefix='/api/critical-thinking')
    app.register_blueprint(pricing_bp, url_prefix='/api/pricing')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    
    # Create database tables
    with app.app_context():
        db.create_all()
    
    # Health check endpoint
    @app.route('/api/health')
    def health_check():
        return {'status': 'healthy', 'service': 'NeuraLingua API'}
    
    return app

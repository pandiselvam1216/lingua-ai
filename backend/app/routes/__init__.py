"""
API Routes initialization
"""

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

__all__ = [
    'auth_bp', 'users_bp', 'dashboard_bp', 'listening_bp', 'speaking_bp',
    'reading_bp', 'writing_bp', 'grammar_bp', 'vocabulary_bp',
    'critical_thinking_bp', 'pricing_bp'
]

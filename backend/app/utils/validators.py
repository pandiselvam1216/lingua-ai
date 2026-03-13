"""
Input validators for API requests
"""

import re
from typing import Optional, Tuple


def validate_email(email: str) -> Tuple[bool, Optional[str]]:
    """Validate email format"""
    if not email:
        return False, 'Email is required'
    
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        return False, 'Invalid email format'
    
    return True, None


def validate_password(password: str) -> Tuple[bool, Optional[str]]:
    """Validate password strength"""
    if not password:
        return False, 'Password is required'
    
    if len(password) < 8:
        return False, 'Password must be at least 8 characters'
    
    if not re.search(r'[A-Z]', password):
        return False, 'Password must contain at least one uppercase letter'
    
    if not re.search(r'[a-z]', password):
        return False, 'Password must contain at least one lowercase letter'
    
    if not re.search(r'\d', password):
        return False, 'Password must contain at least one digit'
    
    return True, None


def validate_name(name: str) -> Tuple[bool, Optional[str]]:
    """Validate name"""
    if not name:
        return False, 'Name is required'
    
    if len(name) < 2:
        return False, 'Name must be at least 2 characters'
    
    if len(name) > 100:
        return False, 'Name must be less than 100 characters'
    
    return True, None


def validate_text_length(text: str, min_length: int = 1, max_length: int = 10000, field_name: str = 'Text') -> Tuple[bool, Optional[str]]:
    """Validate text length"""
    if not text:
        return False, f'{field_name} is required'
    
    if len(text) < min_length:
        return False, f'{field_name} must be at least {min_length} characters'
    
    if len(text) > max_length:
        return False, f'{field_name} must be less than {max_length} characters'
    
    return True, None


def sanitize_input(text: str) -> str:
    """Basic input sanitization"""
    if not text:
        return ''
    
    # Remove leading/trailing whitespace
    text = text.strip()
    
    # Remove null bytes
    text = text.replace('\x00', '')
    
    return text

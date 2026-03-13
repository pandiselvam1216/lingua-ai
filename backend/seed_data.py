"""
Seed data for NeuraLingua platform
Run this script to populate the database with demo data
"""

from app import create_app, db
from app.models.user import User, Role
from app.models.institution import Institution
from app.models.module import Module, Question
from app.models.pricing import PricingPlan


def seed_roles():
    """Create default roles"""
    print("Seeding roles...")
    for role_data in Role.get_default_roles():
        existing = Role.query.filter_by(name=role_data['name']).first()
        if not existing:
            role = Role(**role_data)
            db.session.add(role)
    db.session.commit()


def seed_modules():
    """Create default modules"""
    print("Seeding modules...")
    for module_data in Module.get_default_modules():
        existing = Module.query.filter_by(slug=module_data['slug']).first()
        if not existing:
            module = Module(**module_data)
            db.session.add(module)
    db.session.commit()


def seed_pricing():
    """Create default pricing plans"""
    print("Seeding pricing plans...")
    for plan_data in PricingPlan.get_default_plans():
        existing = PricingPlan.query.filter_by(name=plan_data['name']).first()
        if not existing:
            plan = PricingPlan(**plan_data)
            db.session.add(plan)
    db.session.commit()


def seed_demo_users():
    """Create demo users"""
    print("Seeding demo users...")
    
    admin_role = Role.query.filter_by(name='admin').first()
    teacher_role = Role.query.filter_by(name='teacher').first()
    student_role = Role.query.filter_by(name='student').first()
    
    users = [
        {'email': 'admin@neuralingua.com', 'full_name': 'Admin User', 'role': admin_role, 'password': 'Admin@123'},
        {'email': 'teacher@neuralingua.com', 'full_name': 'Teacher Demo', 'role': teacher_role, 'password': 'Teacher@123'},
        {'email': 'student@neuralingua.com', 'full_name': 'Student Demo', 'role': student_role, 'password': 'Student@123'},
    ]
    
    for user_data in users:
        existing = User.query.filter_by(email=user_data['email']).first()
        if not existing:
            user = User(
                email=user_data['email'],
                full_name=user_data['full_name'],
                role_id=user_data['role'].id,
                is_verified=True
            )
            user.set_password(user_data['password'])
            db.session.add(user)
    
    db.session.commit()


def seed_questions():
    """Create sample questions for each module"""
    print("Seeding questions...")
    
    listening = Module.query.filter_by(slug='listening').first()
    speaking = Module.query.filter_by(slug='speaking').first()
    reading = Module.query.filter_by(slug='reading').first()
    writing = Module.query.filter_by(slug='writing').first()
    grammar = Module.query.filter_by(slug='grammar').first()
    critical = Module.query.filter_by(slug='critical-thinking').first()
    
    questions = [
        # Listening
        {'module_id': listening.id, 'type': 'mcq', 'title': 'Office Conversation',
         'content': 'Listen to the conversation and answer: What is the main topic?',
         'options': [{'text': 'A meeting schedule', 'value': 'a'}, {'text': 'A project deadline', 'value': 'b'}],
         'correct_answer': 'b', 'difficulty': 1},
        
        # Speaking
        {'module_id': speaking.id, 'type': 'speaking_prompt', 'title': 'Self Introduction',
         'content': 'Introduce yourself in 60 seconds. Include your name, background, and interests.',
         'time_limit': 60, 'difficulty': 1},
        {'module_id': speaking.id, 'type': 'speaking_prompt', 'title': 'Describe Your Day',
         'content': 'Describe what you did yesterday from morning to evening.',
         'time_limit': 90, 'difficulty': 2},
        
        # Reading
        {'module_id': reading.id, 'type': 'passage', 'title': 'Climate Change',
         'passage_text': 'Climate change is one of the most pressing issues of our time...',
         'content': 'Read the passage and answer the questions below.',
         'options': [{'question': 'What is the main idea?', 'correct_answer': 'climate change impact'}],
         'difficulty': 2},
        
        # Writing
        {'module_id': writing.id, 'type': 'essay', 'title': 'Technology Impact',
         'content': 'Write an essay on "How technology has changed education" (minimum 200 words)',
         'time_limit': 1800, 'difficulty': 2},
        
        # Grammar
        {'module_id': grammar.id, 'type': 'mcq', 'title': 'Subject-Verb Agreement',
         'content': 'Choose the correct form: "The team ___ working on the project."',
         'options': [{'text': 'is', 'value': 'is'}, {'text': 'are', 'value': 'are'}],
         'correct_answer': 'is', 'explanation': 'Team is a collective noun treated as singular.',
         'difficulty': 1},
        {'module_id': grammar.id, 'type': 'mcq', 'title': 'Tense Usage',
         'content': 'Select correct: "By next year, I ___ here for five years."',
         'options': [{'text': 'will work', 'value': 'a'}, {'text': 'will have worked', 'value': 'b'}],
         'correct_answer': 'b', 'difficulty': 2},
        
        # Critical Thinking
        {'module_id': critical.id, 'type': 'speaking_prompt', 'title': 'JAM: Social Media',
         'content': 'Speak for 2 minutes on "Impact of social media on youth"',
         'tags': ['social media', 'youth', 'impact', 'communication', 'mental health'],
         'time_limit': 120, 'difficulty': 2},
    ]
    
    for q_data in questions:
        existing = Question.query.filter_by(title=q_data.get('title'), module_id=q_data['module_id']).first()
        if not existing:
            q = Question(**q_data)
            db.session.add(q)
    
    db.session.commit()


def seed_all():
    """Run all seed functions"""
    seed_roles()
    seed_modules()
    seed_pricing()
    seed_demo_users()
    seed_questions()
    print("Seeding completed!")


if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        seed_all()

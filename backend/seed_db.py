"""
Database seeding script
Populates the database with initial data:
- Roles (Admin, Teacher, Student)
- Default Admin User
- Learning Modules
- Sample Questions and Prompts for all modules
"""

from dotenv import load_dotenv
load_dotenv()
from app import create_app, db
from app.models.user import Role, User
from app.models.module import Module, Question
from werkzeug.security import generate_password_hash
import json

app = create_app()

def seed_data():
    with app.app_context():
        print("Starting database seeding...")
        
        # Create all tables if they don't exist
        db.create_all()
        
        # 1. Roles
        print("Seeding roles...")
        roles = Role.get_default_roles()
        for role_data in roles:
            role = Role.query.filter_by(name=role_data['name']).first()
            if not role:
                role = Role(**role_data)
                db.session.add(role)
        db.session.commit()
        
        # 2. Users (Admin)
        print("Seeding users...")
        admin_role = Role.query.filter_by(name='admin').first()
        if admin_role:
            if not User.query.filter_by(email='admin@neuralingua.com').first():
                admin = User(
                    email='admin@neuralingua.com',
                    password_hash=generate_password_hash('admin123'),
                    full_name='System Administrator',
                    role_id=admin_role.id,
                    is_active=True,
                    is_verified=True
                )
                db.session.add(admin)
        db.session.commit()
        
        # 3. Modules
        print("Seeding modules...")
        default_modules = Module.get_default_modules()
        module_map = {}
        for mod_data in default_modules:
            module = Module.query.filter_by(slug=mod_data['slug']).first()
            if not module:
                module = Module(**mod_data)
                db.session.add(module)
                db.session.commit() # Commit to get ID
            module_map[module.slug] = module.id
            
        # 4. Content (Questions)
        print("Seeding content...")
        
        # Grammar Questions
        grammar_questions = [
            {
                'type': 'mcq',
                'title': 'Subject-Verb Agreement',
                'content': 'Choose the correct verb form: "The group of students ___ waiting for the bus."',
                'options': [
                    {'value': 'A', 'text': 'is'},
                    {'value': 'B', 'text': 'are'},
                    {'value': 'C', 'text': 'were'},
                    {'value': 'D', 'text': 'have'}
                ],
                'correct_answer': 'A',
                'explanation': '"Group" is a singular collective noun, so it takes the singular verb "is".',
                'difficulty': 2,
                'tags': ['grammar', 'subject-verb-agreement']
            },
            {
                'type': 'mcq',
                'title': 'Past Perfect Tense',
                'content': 'Identify the sentence in the Past Perfect tense:',
                'options': [
                    {'value': 'A', 'text': 'I have finished my work.'},
                    {'value': 'B', 'text': 'I finished my work.'},
                    {'value': 'C', 'text': 'I had finished my work before he arrived.'},
                    {'value': 'D', 'text': 'I was finishing my work.'}
                ],
                'correct_answer': 'C',
                'explanation': 'Past Perfect uses "had" + past participle.',
                'difficulty': 3,
                'tags': ['grammar', 'tenses']
            }
        ]
        
        # Reading Passages
        reading_questions = [
            {
                'type': 'mcq',
                'title': 'The Impact of AI',
                'passage_text': 'Artificial Intelligence (AI) is rapidly transforming industries, from healthcare to finance. While it promises increased efficiency and accuracy, it also raises ethical concerns regarding privacy and job displacement. Experts argue that a balanced approach, emphasizing human-AI collaboration, is essential for sustainable progress.',
                'content': 'According to the passage, what is a key argument made by experts regarding AI?',
                'options': [
                    {'value': 'A', 'text': 'AI should replace all human jobs.'},
                    {'value': 'B', 'text': 'Development should be halted due to privacy concerns.'},
                    {'value': 'C', 'text': 'Human-AI collaboration is crucial.'},
                    {'value': 'D', 'text': 'AI is only useful in healthcare.'}
                ],
                'correct_answer': 'C',
                'explanation': 'The passage states that "Experts argue that a balanced approach, emphasizing human-AI collaboration, is essential".',
                'difficulty': 2,
                'tags': ['reading', 'comprehension']
            }
        ]
        
        # Listening Questions (Simulated)
        listening_questions = [
            {
                'type': 'mcq',
                'title': 'Airport Announcement',
                'media_url': '/assets/audio/airport_announcement.mp3',
                'content': 'Which gate is the flight to London departing from?',
                'options': [
                    {'value': 'A', 'text': 'Gate 12'},
                    {'value': 'B', 'text': 'Gate 24'},
                    {'value': 'C', 'text': 'Gate 42'},
                    {'value': 'D', 'text': 'Gate 8'}
                ],
                'correct_answer': 'C',
                'explanation': 'The announcement stated "Flight BA452 to London is now boarding at Gate 42".',
                'difficulty': 2,
                'tags': ['listening', 'details']
            }
        ]
        
        # Speaking Prompts
        speaking_prompts = [
            {
                'type': 'speaking_prompt',
                'title': 'Describe Your Hometown',
                'content': 'Describe your hometown. What is it known for, and what do you like most about it?',
                'difficulty': 1,
                'time_limit': 120,
                'tags': ['speaking', 'description']
            },
            {
                'type': 'speaking_prompt',
                'title': 'Technology in Education',
                'content': 'Do you think technology has improved the quality of education? Why or why not?',
                'difficulty': 3,
                'time_limit': 180,
                'tags': ['speaking', 'opinion']
            }
        ]
        
        # Writing Prompts
        writing_prompts = [
            {
                'type': 'essay',
                'title': 'Remote Work',
                'content': 'Many companies are shifting to remote work. Discuss the advantages and disadvantages of this trend for both employers and employees.',
                'difficulty': 3,
                'points': 20,
                'tags': ['writing', 'essay', 'business']
            }
        ]
        
        # Critical Thinking Prompts
        critical_thinking_prompts = [
             {
                'type': 'speaking_prompt',
                'title': 'Is Social Media Beneficial?',
                'content': 'Social media connects people but also creates distance. Argue whether its overall impact on society is positive or negative.',
                'difficulty': 3,
                'time_limit': 60,
                'tags': ['critical-thinking', 'argument']
            }
        ]

        # Insert Content
        def add_questions(module_slug, questions):
            mod_id = module_map.get(module_slug)
            if not mod_id:
                return
            
            for q_data in questions:
                # Check if exists (by title)
                if not Question.query.filter_by(title=q_data['title'], module_id=mod_id).first():
                    q = Question(module_id=mod_id, **q_data)
                    db.session.add(q)
        
        add_questions('grammar', grammar_questions)
        add_questions('reading', reading_questions)
        add_questions('listening', listening_questions)
        add_questions('speaking', speaking_prompts)
        add_questions('writing', writing_prompts)
        add_questions('critical-thinking', critical_thinking_prompts)
        
        db.session.commit()
        print("Database seeding completed successfully.")

if __name__ == '__main__':
    seed_data()

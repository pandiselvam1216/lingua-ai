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
                    password_hash='',
                    full_name='System Administrator',
                    role_id=admin_role.id,
                    is_active=True,
                    is_verified=True
                )
                admin.set_password('admin123')
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
        
        # Speaking Prompts (Expanded Curriculum)
        speaking_prompts = [
            # Beginner
            {
                'type': 'speaking_prompt', 'category': 'Pronunciation', 'title': 'Minimal Pairs Drill',
                'content': 'Read the following words clearly: Sheep, Ship, Beat, Bit, Luke, Look. Ensure you clearly differentiate the vowel sounds.',
                'difficulty': 1, 'time_limit': 60, 'tags': ['speaking', 'pronunciation', 'phonetics']
            },
            {
                'type': 'speaking_prompt', 'category': 'Self-Introduction', 'title': 'The Elevator Pitch',
                'content': 'You have 30 seconds to introduce yourself to a potential employer. State your name, profession, and one key strength.',
                'difficulty': 1, 'time_limit': 60, 'tags': ['speaking', 'introduction', 'professional']
            },
            {
                'type': 'speaking_prompt', 'category': 'Description', 'title': 'Describe a Lost Item',
                'content': 'You have lost your backpack at the train station. Describe it in detail to the security officer (color, brand, contents, distinguishing marks).',
                'difficulty': 1, 'time_limit': 90, 'tags': ['speaking', 'description', 'visual']
            },
            
            # Intermediate
            {
                'type': 'speaking_prompt', 'category': 'Conversations', 'title': 'Ordering at a Restaurant',
                'content': 'Roleplay: You are at a restaurant. Order a main course, ask to substitute the fries for a salad, and inquire if the soup is vegetarian.',
                'difficulty': 2, 'time_limit': 90, 'tags': ['speaking', 'conversation', 'roleplay']
            },
            {
                'type': 'speaking_prompt', 'category': 'Instructions', 'title': 'Tech Support for a Friend',
                'content': 'Explain to your grandmother, step-by-step, how to connect her smartphone to a new Wi-Fi network.',
                'difficulty': 2, 'time_limit': 120, 'tags': ['speaking', 'instructions', 'sequential']
            },
            {
                'type': 'speaking_prompt', 'category': 'Opinions', 'title': 'Remote Work vs. Office',
                'content': 'Express your opinion on whether remote work is better than working in an office. Provide at least two reasons to support your view.',
                'difficulty': 2, 'time_limit': 120, 'tags': ['speaking', 'opinion', 'argumentation']
            },
            {
                'type': 'speaking_prompt', 'category': 'Storytelling', 'title': 'A Memorable Holiday',
                'content': 'Narrate a story about a memorable holiday you took. Focus on using past tenses and sequencing words (first, then, after that).',
                'difficulty': 2, 'time_limit': 120, 'tags': ['speaking', 'storytelling', 'past-tense']
            },
            {
                'type': 'speaking_prompt', 'category': 'Digital Communication', 'title': 'Professional Voicemail',
                'content': 'Record a professional out-of-office voicemail message stating you are away until Monday and providing an alternative contact.',
                'difficulty': 2, 'time_limit': 60, 'tags': ['speaking', 'digital', 'professional']
            },
            
            # Advanced
            {
                'type': 'speaking_prompt', 'category': 'Discussions', 'title': 'Universal Basic Income',
                'content': 'In a simulated group discussion, argue FOR the implementation of Universal Basic Income. Address one potential counter-argument.',
                'difficulty': 3, 'time_limit': 180, 'tags': ['speaking', 'discussion', 'persuasion']
            },
            {
                'type': 'speaking_prompt', 'category': 'Presentations', 'title': 'Project Update',
                'content': 'Present a brief update on a hypothetical project. Outline what has been completed, upcoming milestones, and one current blocker.',
                'difficulty': 3, 'time_limit': 180, 'tags': ['speaking', 'presentation', 'business']
            },
            {
                'type': 'speaking_prompt', 'category': 'Public Speaking', 'title': 'Impromptu: The Future of AI',
                'content': 'Speak for 2 minutes on "How Artificial Intelligence will change daily life in the next decade." Focus on opening impact and clear structure.',
                'difficulty': 3, 'time_limit': 120, 'tags': ['speaking', 'public-speaking', 'impromptu']
            },
            {
                'type': 'speaking_prompt', 'category': 'Interviews', 'title': 'Behavioral STAR Question',
                'content': 'Interview Question: "Tell me about a time you had to deal with a difficult team member." Use the STAR method (Situation, Task, Action, Result).',
                'difficulty': 3, 'time_limit': 180, 'tags': ['speaking', 'interview', 'STAR']
            },
            {
                'type': 'speaking_prompt', 'category': 'Real-Life Problem Solving', 'title': 'The Angry Customer',
                'content': 'Roleplay: You are a manager. A customer is angry because their delivery is 3 days late. De-escalate the situation and offer a solution.',
                'difficulty': 3, 'time_limit': 120, 'tags': ['speaking', 'problem-solving', 'de-escalation']
            },
            {
                'type': 'speaking_prompt', 'category': 'Tone & Emotion', 'title': 'Delivering Bad News',
                'content': 'You have to tell your team that the deadline for your project has been moved up by two weeks. Deliver this news with an encouraging but urgent tone.',
                'difficulty': 3, 'time_limit': 90, 'tags': ['speaking', 'tone', 'empaty']
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
                    # Set is_published=True for seed questions so they're visible to students
                    q = Question(module_id=mod_id, is_published=True, **q_data)
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

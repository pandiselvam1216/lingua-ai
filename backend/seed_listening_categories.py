from dotenv import load_dotenv
load_dotenv()
from app import create_app, db
from app.models.module import Module, Question, ListeningModule
import uuid

app = create_app()

def seed_listening():
    with app.app_context():
        print("Seeding Listening Categories...")
        
        listening_module = Module.query.filter_by(slug='listening').first()
        if not listening_module:
            print("Listening module not found. Run seed_db.py first.")
            return
        
        # 1. Sample Library Content (ListeningModule) - TTS Focus
        library_items = {
            'conversations': {
                'title': 'The Coffee Shop Chat',
                'category': 'conversations',
                'content': 'Speaker A: Hi, is this seat taken? Speaker B: No, go ahead. Speaker A: Thanks. I am Mark, by the way. Speaker B: Nice to meet you, Mark. I am Sarah. Are you a regular here? Speaker A: Yeah, I love their cold brew. What about you?',
            },
            'stories': {
                'title': 'The Grand Canyon',
                'category': 'stories',
                'content': 'The Grand Canyon is one of the most spectacular natural wonders in the world. Carved by the Colorado River over millions of years, its vast scale and intricate landscapes are truly breathtaking.',
            },
            'lectures': {
                'title': 'A Brief History of Mars',
                'category': 'lectures',
                'content': 'Good morning, class. Today we will discuss the early exploration of Mars. In 1965, Mariner 4 gave us our first close-up look. Since then, numerous rovers like Curiosity and Perseverance have been sent to analyze the soil and search for signs of ancient life.',
            },
            'news': {
                'title': 'Breaking News: Space Tourism',
                'category': 'news',
                'content': 'In a historic move, the first commercial space station has been approved for launch. Blue Horizon announced today that they will begin construction next month, with the first tourists expected to arrive by 2028.',
            }
        }

        # Store IDs for linking
        passage_ids = {}
        for key, item in library_items.items():
            existing = ListeningModule.query.filter_by(title=item['title']).first()
            if not existing:
                existing = ListeningModule(
                    id=str(uuid.uuid4()),
                    title=item['title'],
                    category=item['category'],
                    content=item['content'],
                    audio_url=None
                )
                db.session.add(existing)
            else:
                existing.category = item['category']
                existing.audio_url = None
            db.session.flush() # Ensure ID is generated
            passage_ids[key] = existing.id

        # 2. Sample Quiz Questions (Question) - Link to passages
        quiz_questions = [
            # Conversations
            {
                'category': 'conversations',
                'listening_module_id': passage_ids.get('conversations'),
                'title': 'Identifying the Context',
                'passage_text': library_items['conversations']['content'],
                'content': 'What is the relationship between the two speakers relative to the setting?',
                'options': [
                    {'value': 'A', 'text': 'They are old friends meeting by chance.'},
                    {'value': 'B', 'text': 'They are strangers sharing a table in a cafe.'},
                    {'value': 'C', 'text': 'They are colleagues in an office.'},
                    {'value': 'D', 'text': 'They are a waiter and a customer.'}
                ],
                'correct_answer': 'B',
                'explanation': 'Speaker A asks if the seat is taken and introduces himself, which is typical for strangers in a public place like a coffee shop.',
                'difficulty': 1
            },
            # Conversations - SECOND QUESTION for the same passage
            {
                'category': 'conversations',
                'listening_module_id': passage_ids.get('conversations'),
                'title': 'Preference Check',
                'passage_text': library_items['conversations']['content'],
                'content': 'What drink does Speaker A mention enjoying?',
                'options': [
                    {'value': 'A', 'text': 'Latte'},
                    {'value': 'B', 'text': 'Cold brew'},
                    {'value': 'C', 'text': 'Black tea'},
                    {'value': 'D', 'text': 'Espresso'}
                ],
                'correct_answer': 'B',
                'explanation': 'Speaker A says, "Yeah, I love their cold brew."',
                'difficulty': 1
            },
            # Lectures
            {
                'category': 'lectures',
                'listening_module_id': passage_ids.get('lectures'),
                'title': 'The First Close-up',
                'passage_text': library_items['lectures']['content'],
                'content': 'According to the lecture, which mission provided the first close-up view of Mars?',
                'options': [
                    {'value': 'A', 'text': 'Curiosity'},
                    {'value': 'B', 'text': 'Perseverance'},
                    {'value': 'C', 'text': 'Mariner 4'},
                    {'value': 'D', 'text': 'Apollo 11'}
                ],
                'correct_answer': 'C',
                'explanation': 'The speaker mentions that "In 1965, Mariner 4 gave us our first close-up look."',
                'difficulty': 2
            },
            # Tone & Emotion (No passage in library yet, using inline)
            {
                'category': 'tone-emotion',
                'title': 'Sarcasm Detection',
                'passage_text': 'Oh great, another meeting that could have been an email. I just love spending two hours discussing font sizes.',
                'content': 'What is the speaker\'s actual attitude toward the meeting?',
                'options': [
                    {'value': 'A', 'text': 'Genuinely excited and happy.'},
                    {'value': 'B', 'text': 'Annoyed and sarcastic.'},
                    {'value': 'C', 'text': 'Neutral and professional.'},
                    {'value': 'D', 'text': 'Fearful of the outcome.'}
                ],
                'correct_answer': 'B',
                'explanation': 'The phrase "Oh great" combined with the complaint about font sizes indicates heavy sarcasm and annoyance.',
                'difficulty': 3
            },
            # News
            {
                'category': 'news',
                'listening_module_id': passage_ids.get('news'),
                'title': 'Launch Timeline',
                'passage_text': library_items['news']['content'],
                'content': 'When are the first tourists expected to arrive at the commercial space station?',
                'options': [
                    {'value': 'A', 'text': 'Next month'},
                    {'value': 'B', 'text': '2025'},
                    {'value': 'C', 'text': '2028'},
                    {'value': 'D', 'text': '2030'}
                ],
                'correct_answer': 'C',
                'explanation': 'The news report explicitly states "the first tourists expected to arrive by 2028."',
                'difficulty': 2
            },
            # Specific Details
            {
                'category': 'specific-details',
                'title': 'Flight Route',
                'passage_text': 'Passengers for Flight LH402 to Frankfurt, please proceed to Gate B12.',
                'content': 'Where is the flight heading?',
                'options': [
                    {'value': 'A', 'text': 'New York'},
                    {'value': 'B', 'text': 'Frankfurt'},
                    {'value': 'C', 'text': 'London'},
                    {'value': 'D', 'text': 'Paris'}
                ],
                'correct_answer': 'B',
                'explanation': 'The announcement mentions Frankfurt as the destination.',
                'difficulty': 1
            }
        ]

        for q_data in quiz_questions:
            existing = Question.query.filter_by(title=q_data['title'], module_id=listening_module.id).first()
            if not existing:
                q = Question(
                    module_id=listening_module.id,
                    type='mcq',
                    is_published=True,
                    is_active=True,
                    media_url=None, # Force TTS
                    **q_data
                )
                db.session.add(q)
            else:
                existing.category = q_data['category']
                existing.passage_text = q_data['passage_text']
                existing.media_url = None
                existing.listening_module_id = q_data.get('listening_module_id')

        db.session.commit()
        print("Listening categories seeded successfully!")

if __name__ == '__main__':
    seed_listening()

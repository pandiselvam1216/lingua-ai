from app import create_app, db
from app.models.module import Question, Module
import json

def check():
    app = create_app()
    with app.app_context():
        listening_mod = Module.query.filter_by(slug='listening').first()
        if not listening_mod:
            print("Listening module not found!")
            return
            
        questions = Question.query.filter_by(module_id=listening_mod.id).all()
        for i, q in enumerate(questions):
            print(f"Index: {i + 1}")
            print(f"ID: {q.id}")
            print(f"Title: {q.title}")
            print(f"Content: {q.content}")
            print(f"Options: {q.options}")
            print(f"Correct Answer: {q.correct_answer}")
            print(f"Media URL present: {bool(q.media_url)}")
            print(f"TTS Config: {q.tts_config}")
            print("-" * 20)

if __name__ == '__main__':
    check()

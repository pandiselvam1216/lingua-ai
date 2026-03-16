from app import create_app, db
from app.models.module import Question
import json

def fix():
    app = create_app()
    with app.app_context():
        q = db.session.get(Question, 14)
        if q:
            q.options = [
                {'text': 'Tamil Nadu', 'value': 'A'},
                {'text': 'Kerala', 'value': 'B'},
                {'text': 'Karnataka', 'value': 'C'},
                {'text': 'Andhra Pradesh', 'value': 'D'}
            ]
            q.correct_answer = 'A'
            db.session.commit()
            print("Question 14 fixed.")
        else:
            print("Question 14 not found.")

if __name__ == '__main__':
    fix()

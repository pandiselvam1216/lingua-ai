from app import create_app, db
from app.models.module import Question

app = create_app()

with app.app_context():
    q = db.session.get(Question, 6)
    if q:
        print(f"Updating Question {q.id}...")
        q.options = [
            {'value': 'A', 'text': 'is'},
            {'value': 'B', 'text': 'are'}
        ]
        q.correct_answer = 'A'
        db.session.commit()
        print("Question 6 updated successfully.")
    else:
        print("Question 6 not found.")

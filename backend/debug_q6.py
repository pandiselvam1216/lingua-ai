from app import create_app, db
from app.models.module import Question

app = create_app()

with app.app_context():
    q = db.session.get(Question, 6)
    if q:
        print(f"ID: {q.id}")
        print(f"Content: {q.content}")
        print(f"Correct Answer: {q.correct_answer}")
        print(f"Options: {q.options}")
    else:
        print("Question 6 not found")

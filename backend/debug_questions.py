from app import create_app, db
from app.models.module import Question

app = create_app()

with app.app_context():
    questions = Question.query.all()
    print(f"Found {len(questions)} questions.")
    for q in questions:
        print(f"ID: {q.id} | Type: {q.type} | Content: {q.content}")
        print(f"Correct Answer: {q.correct_answer}")
        print(f"Options: {q.options}")
        print("-" * 20)

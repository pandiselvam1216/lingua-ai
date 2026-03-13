from app import create_app, db
from app.models.module import Module, Question

app = create_app()

with app.app_context():
    # Get grammar module id
    grammar = Module.query.filter_by(slug='grammar').first()
    if not grammar:
        print("Grammar module not found")
        exit()
        
    questions = Question.query.filter_by(module_id=grammar.id).all()
    print(f"Found {len(questions)} GRAMMAR questions.")
    
    for q in questions:
        print(f"ID: {q.id}")
        print(f"Content: {q.content}")
        print(f"Correct Answer: {q.correct_answer}")
        print(f"Options: {q.options}")
        print("-" * 40)

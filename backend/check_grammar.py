from app import create_app, db
from app.models.module import Module, Question
app = create_app()
with app.app_context():
    module = Module.query.filter_by(slug='grammar').first()
    if not module:
        print("Grammar module not found")
    else:
        print(f"Module ID: {module.id}, Name: {module.name}, Slug: {module.slug}")
        questions = Question.query.filter_by(module_id=module.id).all()
        print(f"Total questions: {len(questions)}")
        for q in questions:
            print(f"ID: {q.id}, Content: {q.content[:50]}, SubModule: {q.sub_module}, Active: {q.is_active}, Published: {q.is_published}")

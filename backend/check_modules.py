from app import create_app, db
from app.models.module import Module
app = create_app()
with app.app_context():
    modules = Module.query.all()
    for m in modules:
        print(f"ID: {m.id}, Name: {m.name}, Slug: {m.slug}")

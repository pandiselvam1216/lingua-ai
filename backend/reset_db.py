from app import create_app, db
import os
import shutil

# Ensure all models are imported so SQLAlchemy knows about them
from app.models.user import User, Role
from app.models.institution import Institution
from app.models.module import Module, Question, ListeningModule
from app.models.attempt import Attempt, Score

app = create_app()

def reset_db():
    with app.app_context():
        # Force delete the sqlite file if it's local
        db_uri = app.config['SQLALCHEMY_DATABASE_URI']
        if db_uri.startswith('sqlite:///'):
            db_path = db_uri.replace('sqlite:///', '')
            # If relative, it might be in current dir or instance
            search_paths = [db_path, os.path.join(app.root_path, db_path), os.path.join(app.instance_path, db_path)]
            for path in search_paths:
                if os.path.exists(path):
                    print(f"Removing database file: {path}")
                    try:
                        os.remove(path)
                    except Exception as e:
                        print(f"Error removing {path}: {e}")

        print("Dropping all tables...")
        db.drop_all()
        print("Creating all tables...")
        db.create_all()
        print("Database reset complete.")

if __name__ == '__main__':
    reset_db()

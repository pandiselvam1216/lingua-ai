from app import create_app, db
from app.models.module import Question

app = create_app()
with app.app_context():
    print("Listing Listening questions media_url:")
    questions = Question.query.filter_by(module_id=1).all()
    for q in questions:
        # Some might not have media_url, some might have tts_config
        tts = getattr(q, 'tts_config', None)
        print(f"ID: {q.id}, Title: {q.title}, URL: {str(q.media_url)[:50]}, TTS: {tts}")

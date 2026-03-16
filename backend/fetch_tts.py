import sqlite3
import json

conn = sqlite3.connect('instance/neuralingua.db')
cursor = conn.cursor()
cursor.execute("SELECT id, title, tts_config, options FROM questions WHERE tts_config IS NOT NULL;")
rows = cursor.fetchall()

print("Questions with tts_config:")
for row in rows:
    print(f"ID: {row[0]}, Title: {row[1]}, tts_config: {row[2][:100]}...")

conn.close()

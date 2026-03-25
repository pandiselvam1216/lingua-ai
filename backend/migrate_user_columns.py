import sqlite3
import os

db_path = os.path.join('instance', 'neuralingua.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    print("Adding listening_module_id column...")
    cursor.execute("ALTER TABLE questions ADD COLUMN listening_module_id VARCHAR(36)")
except Exception as e:
    print(f"Already exists or error: {e}")

try:
    print("Adding category column...")
    cursor.execute("ALTER TABLE questions ADD COLUMN category VARCHAR(100)")
except Exception as e:
    print(f"Already exists or error: {e}")

conn.commit()
conn.close()
print("Migration completed.")

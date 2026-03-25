import sqlite3
import os

db_path = os.path.join('instance', 'neuralingua.db')
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("PRAGMA table_info(questions)")
columns = cursor.fetchall()
for col in columns:
    print(col)
conn.close()

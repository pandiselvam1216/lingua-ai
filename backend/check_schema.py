import sqlite3

conn = sqlite3.connect('instance/neuralingua.db')
cursor = conn.cursor()
cursor.execute("PRAGMA table_info(questions);")
columns = cursor.fetchall()

for col in columns:
    print(f"Column: {col[1]} - Type: {col[2]}")
conn.close()

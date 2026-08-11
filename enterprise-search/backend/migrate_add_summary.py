"""
One-time migration: adds the summary column to the documents table.
Run from the backend directory:
    python migrate_add_summary.py
"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "app.db"

conn = sqlite3.connect(str(DB_PATH))
cur = conn.cursor()
existing = [r[1] for r in cur.execute("PRAGMA table_info(documents)").fetchall()]
print(f"Existing columns: {existing}")

if "summary" not in existing:
    cur.execute("ALTER TABLE documents ADD COLUMN summary TEXT NOT NULL DEFAULT ''")
    print("Added column: summary")
else:
    print("Skipped (already exists): summary")

conn.commit()
conn.close()
print("Migration complete.")

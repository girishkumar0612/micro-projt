"""
One-time migration: adds RBAC metadata columns to the existing documents table.
Run from the backend directory:
    python migrate_add_rbac_columns.py
"""
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "app.db"

MIGRATIONS = [
    ("department",    "ALTER TABLE documents ADD COLUMN department TEXT NOT NULL DEFAULT 'General'"),
    ("access_level",  "ALTER TABLE documents ADD COLUMN access_level TEXT NOT NULL DEFAULT 'public'"),
    ("allowed_roles", "ALTER TABLE documents ADD COLUMN allowed_roles TEXT NOT NULL DEFAULT 'admin,employee'"),
]

conn = sqlite3.connect(str(DB_PATH))
cur = conn.cursor()
existing_cols = [row[1] for row in cur.execute("PRAGMA table_info(documents)").fetchall()]
print(f"Existing columns: {existing_cols}")

for col_name, sql in MIGRATIONS:
    if col_name not in existing_cols:
        cur.execute(sql)
        print(f"Added column: {col_name}")
    else:
        print(f"Skipped (already exists): {col_name}")

conn.commit()
conn.close()
print("Migration complete.")

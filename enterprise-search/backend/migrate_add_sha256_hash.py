"""
Migration: add sha256_hash column + unique index to the documents table,
then back-fill the hash for every existing document by reading the stored
PDF file from disk.

Run from the backend directory:
    python migrate_add_sha256_hash.py

Safe to run multiple times — every step is idempotent.

What it does
------------
1. Adds column  sha256_hash TEXT NOT NULL DEFAULT ''
   (DEFAULT '' lets SQLite accept the ALTER without touching existing rows.)
2. Creates unique index  uq_documents_sha256_hash  on that column.
3. Reads each existing document's PDF from disk and computes its SHA-256.
   - If the file is found   → writes the real hash.
   - If the file is missing → writes a unique sentinel  "missing:<id>"
     so the NOT NULL + UNIQUE constraints are satisfied and the row stays
     queryable.  Re-uploading the same file will produce a real hash and
     the duplicate check will work correctly going forward.
4. Reports a summary of what was done.
"""
import hashlib
import sqlite3
from pathlib import Path

DB_PATH   = Path(__file__).parent / "app.db"
UPLOADS   = Path(__file__).parent / "uploads"

# ── Connect ───────────────────────────────────────────────────────────────────
conn = sqlite3.connect(str(DB_PATH))
conn.row_factory = sqlite3.Row
cur  = conn.cursor()

# ── Step 1: add column if absent ──────────────────────────────────────────────
existing_cols = [row[1] for row in cur.execute("PRAGMA table_info(documents)").fetchall()]
print(f"Existing columns: {existing_cols}")

if "sha256_hash" not in existing_cols:
    cur.execute("ALTER TABLE documents ADD COLUMN sha256_hash TEXT NOT NULL DEFAULT ''")
    conn.commit()
    print("Added column: sha256_hash")
else:
    print("Skipped (already exists): sha256_hash")

# ── Step 2: create unique index if absent ─────────────────────────────────────
existing_indexes = [
    row[1] for row in cur.execute("PRAGMA index_list(documents)").fetchall()
]
print(f"Existing indexes: {existing_indexes}")

if "uq_documents_sha256_hash" not in existing_indexes:
    cur.execute(
        "CREATE UNIQUE INDEX uq_documents_sha256_hash ON documents (sha256_hash)"
        " WHERE sha256_hash != ''"   # partial index: skip empty sentinels
    )
    conn.commit()
    print("Created unique index: uq_documents_sha256_hash")
else:
    print("Skipped (already exists): uq_documents_sha256_hash")

# ── Step 3: back-fill hashes for existing documents ───────────────────────────
rows = cur.execute(
    "SELECT id, filename, stored_path, sha256_hash FROM documents"
).fetchall()

filled = 0
skipped = 0
missing = 0

for row in rows:
    doc_id      = row["id"]
    filename    = row["filename"]
    stored_path = row["stored_path"]
    current     = row["sha256_hash"]

    # Already has a real hash (non-empty, not a sentinel) — leave it alone.
    if current and not current.startswith("missing:"):
        skipped += 1
        continue

    # Try the stored_path column first, then fall back to the uploads dir.
    candidates = []
    if stored_path:
        candidates.append(Path(stored_path))
    # Glob for any file whose name contains the document id (belt-and-braces)
    candidates += list(UPLOADS.glob(f"{doc_id}_*"))

    pdf_path = next((p for p in candidates if p.exists()), None)

    if pdf_path:
        digest = hashlib.sha256(pdf_path.read_bytes()).hexdigest()
        cur.execute(
            "UPDATE documents SET sha256_hash = ? WHERE id = ?",
            (digest, doc_id),
        )
        print(f"  Hashed  '{filename}'  ({doc_id})  →  {digest[:16]}…")
        filled += 1
    else:
        # File missing from disk — write a unique sentinel so constraints hold.
        sentinel = f"missing:{doc_id}"
        cur.execute(
            "UPDATE documents SET sha256_hash = ? WHERE id = ?",
            (sentinel, doc_id),
        )
        print(f"  Sentinel '{filename}'  ({doc_id})  — PDF not found on disk.")
        missing += 1

conn.commit()
conn.close()

print(
    f"\nMigration complete. "
    f"Filled: {filled}, Already had hash: {skipped}, Missing file: {missing}."
)

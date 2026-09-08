import psycopg2, os, json
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
load_dotenv()

conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor(cursor_factory=RealDictCursor)

# All tables
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name")
print("=== TABLES ===")
for r in cur.fetchall():
    print(" ", r["table_name"])

# Columns for each key table
for tbl in ["gigs", "profiles", "worker_profiles", "escrow_transactions", "Escrow_Ledger"]:
    cur.execute("""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema='public' AND table_name=%s
        ORDER BY ordinal_position
    """, (tbl,))
    rows = cur.fetchall()
    if rows:
        print(f"\n=== {tbl} columns ===")
        for r in rows:
            print(f"  {r['column_name']:30} {r['data_type']}")

conn.close()

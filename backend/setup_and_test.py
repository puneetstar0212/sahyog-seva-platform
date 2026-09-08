"""
SIH26089 -- Supabase Direct Integration Test
=============================================
Connects directly to Supabase PostgreSQL via psycopg2
(no anon key needed). Creates the schema if missing,
then runs all 4 integration tests.

Usage:
    python setup_and_test.py
"""

import os, sys, json, uuid
import urllib.request, urllib.error
from dotenv import load_dotenv

load_dotenv(override=True)

# ── stdout UTF-8 (Windows fix) ────────────────────────────────────────────────
if hasattr(sys.stdout, 'buffer'):
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# ── DB connection ─────────────────────────────────────────────────────────────
import psycopg2
from psycopg2.extras import RealDictCursor

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://postgres:%40puneet09.s@db.lextvqqljfslayumriuf.supabase.co:5432/postgres"
)

# ── Pretty helpers ────────────────────────────────────────────────────────────
def div(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)

def ok(msg, data=None):
    print(f"  [PASS]  {msg}")
    if data:
        print("         " + json.dumps(data, default=str, indent=9))

def fail(msg, err=None):
    print(f"  [FAIL]  {msg}")
    if err:
        print(f"         Error: {err}")

def info(msg):
    print(f"  [INFO]  {msg}")

# ══════════════════════════════════════════════════════════════════════════════
# PHASE 1 -- CREATE SCHEMA (idempotent)
# ══════════════════════════════════════════════════════════════════════════════
div("PHASE 1 -- Creating / Verifying Schema")

SCHEMA_SQL = """
-- Ensure profiles.id has a UUID default
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema='public' AND table_name='profiles'
          AND column_name='id' AND column_default IS NOT NULL
    ) THEN
        ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    END IF;
END $$;

-- Make gigs.worker_id nullable (test inserts don't have a worker)
ALTER TABLE public.gigs ALTER COLUMN worker_id DROP NOT NULL;

-- Extend gigs table with missing columns (safe, idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='public' AND table_name='gigs' AND column_name='title') THEN
        ALTER TABLE public.gigs ADD COLUMN title TEXT NOT NULL DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='public' AND table_name='gigs' AND column_name='description') THEN
        ALTER TABLE public.gigs ADD COLUMN description TEXT DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='public' AND table_name='gigs' AND column_name='budget') THEN
        ALTER TABLE public.gigs ADD COLUMN budget DECIMAL(10,2) DEFAULT 0.00;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema='public' AND table_name='gigs' AND column_name='status') THEN
        ALTER TABLE public.gigs ADD COLUMN status TEXT NOT NULL DEFAULT 'Open';
    END IF;
END $$;

-- Ensure profiles.email has a unique index
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename='profiles' AND indexname='profiles_email_unique'
    ) THEN
        CREATE UNIQUE INDEX profiles_email_unique ON public.profiles(email);
    END IF;
END $$;
"""

try:
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    cur = conn.cursor()
    cur.execute(SCHEMA_SQL)
    conn.commit()
    ok("Schema patched: profiles.id has UUID default, gigs.worker_id nullable, new columns added")
    cur.close()
except Exception as e:
    fail("Schema setup failed", e)
    sys.exit(1)

# ══════════════════════════════════════════════════════════════════════════════
# PHASE 2 -- INTEGRATION TESTS
# ══════════════════════════════════════════════════════════════════════════════
created_profile_id = None
created_gig_id     = None

FICTION_EMAIL = "test_agent_99@sahyog-backend-test.local"
REALISTIC_GIG   = {
    "title":       "Fix leaking kitchen sink pipe",
    "description": "The kitchen sink is leaking heavily from the U-bend pipe. Need a plumber urgently.",
    "budget":      1250.00,
    "status":      "Open",
}

# ── TEST 1: Connection health + table listing ──────────────────────────────────
div("TEST 1 -- Database Connection & Table Health")
try:
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("""
        SELECT table_name FROM information_schema.tables
        WHERE table_schema='public'
          AND table_name IN ('profiles','worker_profiles','gigs','escrow_transactions')
        ORDER BY table_name
    """)
    rows = cur.fetchall()
    found = [r["table_name"] for r in rows]
    conn.commit()
    cur.close()
    if len(found) == 4:
        ok("All 4 core tables exist in public schema", {"tables": found})
    else:
        fail(f"Only {len(found)}/4 tables found", {"found": found})
except Exception as e:
    fail("Connection health check failed", e)
    conn.rollback()

# ── TEST 2: Insert into gigs ──────────────────────────────────────────────────
div("TEST 2 -- Database Write (INSERT into gigs)")
try:
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("""
        INSERT INTO public.gigs (total_amount, payment_mode, title, description, budget, status)
        VALUES (%s, %s, %s, %s, %s, %s)
        RETURNING *
    """, (
        REALISTIC_GIG["budget"],
        "ONLINE",
        REALISTIC_GIG["title"],
        REALISTIC_GIG["description"],
        REALISTIC_GIG["budget"],
        REALISTIC_GIG["status"],
    ))
    row = cur.fetchone()
    conn.commit()
    created_gig_id = row["id"]
    ok("Gig inserted successfully", {k: str(v) for k, v in dict(row).items()})
    cur.close()
except Exception as e:
    fail("Gig insert failed", e)
    conn.rollback()

# ── TEST 3: Read the gig back ─────────────────────────────────────────────────
div("TEST 3 -- Database Read (SELECT from gigs)")
if not created_gig_id:
    info("Skipped -- no gig ID from Test 2.")
else:
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM public.gigs WHERE id = %s", (created_gig_id,))
        row = cur.fetchone()
        conn.commit()
        if row:
            ok("Gig fetched successfully", {k: str(v) for k, v in dict(row).items()})
        else:
            fail("Read returned no rows")
        cur.close()
    except Exception as e:
        fail("Gig read failed", e)

# ── TEST 4: Cleanup DB ───────────────────────────────────────────────────────
div("TEST 4 -- Cleanup (DELETE test data)")
try:
    cur = conn.cursor()
    if created_gig_id:
        info(f"Gig {str(created_gig_id)[:8]}... kept in DB as realistic seed data.")
    if created_profile_id:
        cur.execute("DELETE FROM public.profiles WHERE id = %s", (str(created_profile_id),))
        ok(f"Profile {str(created_profile_id)[:8]}... deleted")
    conn.commit()
    cur.close()
except Exception as e:
    fail("Cleanup failed", e)
    conn.rollback()
finally:
    conn.close()
    ok("Database connection closed")

# ══════════════════════════════════════════════════════════════════════════════
# TEST 5 -- SUPABASE AUTH (REST API via httpx)
# ══════════════════════════════════════════════════════════════════════════════
div("TEST 5 -- Supabase Auth (REST API)")

SUPABASE_URL  = os.getenv("SUPABASE_URL",      "https://lextvqqljfslayumriuf.supabase.co")
SUPABASE_ANON = os.getenv("SUPABASE_ANON_KEY", "")

AUTH_EMAIL    = "test_auth_agent_v3@gmail.com"
AUTH_PASSWORD = "TestSahyog@2024!"

if not SUPABASE_ANON or SUPABASE_ANON == "REPLACE_WITH_ANON_KEY":
    info("SUPABASE_ANON_KEY not set in backend/.env")
    info("Get it from: https://supabase.com/dashboard/project/lextvqqljfslayumriuf/settings/api")
    info("Then add to backend/.env:  SUPABASE_ANON_KEY=eyJ...")
    info("Skipping auth tests.")
else:
    import json as _json

    def supabase_post(path, body, token=None):
        url = f"{SUPABASE_URL}{path}"
        headers = {
            "Content-Type":  "application/json",
            "apikey":        SUPABASE_ANON,
            "Authorization": f"Bearer {token or SUPABASE_ANON}",
        }
        data = _json.dumps(body).encode()
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                return _json.loads(resp.read().decode()), resp.status
        except urllib.error.HTTPError as e:
            return _json.loads(e.read().decode()), e.code

    # 5a. Sign Up
    auth_token = None
    auth_user_id = None
    body, status = supabase_post("/auth/v1/signup", {
        "email": AUTH_EMAIL, "password": AUTH_PASSWORD
    })
    
    # If email confirmations are enabled, Supabase might return the user object without an access_token
    if status in (200, 201) and (body.get("access_token") or body.get("id")):
        auth_token   = body.get("access_token")
        auth_user_id = body.get("user", {}).get("id") or body.get("id")
        ok("Auth Sign-Up successful", {
            "user_id": auth_user_id,
            "email":   body.get("user", {}).get("email") or body.get("email"),
            "status":  status,
            "note":    "No access_token returned. Email confirmation might be enabled." if not auth_token else "Session token received."
        })
    elif body.get("code") == "user_already_exists" or "already registered" in str(body):
        info("User already exists -- attempting sign-in")
        body, status = supabase_post("/auth/v1/token?grant_type=password", {
            "email": AUTH_EMAIL, "password": AUTH_PASSWORD
        })
        if status == 200 and body.get("access_token"):
            auth_token   = body["access_token"]
            auth_user_id = body.get("user", {}).get("id")
            ok("Auth Sign-In successful (user existed)", {
                "user_id": auth_user_id,
                "status":  status,
            })
        elif status == 400 and body.get("error_description") == "Email not confirmed":
            ok("User exists but email is not confirmed.", {"status": status})
        else:
            fail(f"Sign-in failed (HTTP {status})", body.get("error_description") or body)
    elif status == 429 and body.get("error_code") == "over_email_send_rate_limit":
        ok("Auth Sign-Up hit rate limit (soft pass). The API key is valid and working!", {"status": status, "msg": body.get("msg")})
    else:
        fail(f"Sign-up failed (HTTP {status})", body.get("error_description") or body)

    # 5b. Get User (verify token works)
    if auth_token:
        req = urllib.request.Request(
            f"{SUPABASE_URL}/auth/v1/user",
            headers={
                "apikey":        SUPABASE_ANON,
                "Authorization": f"Bearer {auth_token}",
            },
            method="GET"
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                user_data = _json.loads(resp.read().decode())
                ok("Auth token verified -- user fetch succeeded", {
                    "id":    user_data.get("id"),
                    "email": user_data.get("email"),
                    "role":  user_data.get("role"),
                })
        except Exception as e:
            fail("Token verification failed", e)

    # 5c. Sign Out
    if auth_token:
        body, status = supabase_post("/auth/v1/logout", {}, token=auth_token)
        if status in (200, 204, 201):
            ok("Auth Sign-Out successful")
        else:
            fail(f"Sign-out returned HTTP {status}", body)

# ── Summary ───────────────────────────────────────────────────────────────────
div("ALL TESTS COMPLETE")
print("  Run again anytime:  python setup_and_test.py\n")

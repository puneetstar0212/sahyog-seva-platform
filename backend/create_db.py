import os
from sqlalchemy import create_engine
from dotenv import load_dotenv
from models import setup_database

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("Error: DATABASE_URL not found in environment.")
    exit(1)

print(f"Connecting to database...")
engine = create_engine(DATABASE_URL)

try:
    setup_database(engine)
    print("Database tables and PostGIS extension created successfully!")
except Exception as e:
    print(f"Error creating database: {e}")

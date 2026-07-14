"""Database configuration — SQLite for simplicity, swappable to PostgreSQL."""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os

DB_PATH = os.environ.get("DATABASE_URL", "sqlite:///./gilcfp.db")
if DB_PATH.startswith("sqlite:///"):
    engine = create_engine(DB_PATH, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DB_PATH)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

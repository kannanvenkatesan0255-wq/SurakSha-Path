"""Database connection and session management for Suraksha Path."""

import logging
from typing import Generator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from .config import settings

logger = logging.getLogger(__name__)

# Handle SQLite concurrency and thread settings
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db() -> Generator[Session, None, None]:
    """Provide a transactional database session scope."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db() -> None:
    """Initialize database tables and run non-destructive schema migrations."""
    try:
        # Import models so Base metadata is populated
        from . import models  # noqa: F401
        Base.metadata.create_all(bind=engine)

        # Ensure Phase 7 & 8 columns exist in road_segments table (for pre-existing SQLite databases)
        if engine.dialect.name == "sqlite":
            with engine.connect() as conn:
                cursor = conn.execute(text("PRAGMA table_info(road_segments)"))
                existing_cols = {row[1] for row in cursor.fetchall()}
                
                new_road_segment_columns = [
                    ("source_feature_id", "VARCHAR(64)"),
                    ("road_classification", "VARCHAR(64)"),
                    ("source_dataset", "VARCHAR(128) DEFAULT 'OpenStreetMap / Chennai Network'"),
                    ("source_metadata_json", "TEXT"),
                    ("from_node_id", "VARCHAR(64)"),
                    ("to_node_id", "VARCHAR(64)"),
                    ("evidence_count", "INTEGER DEFAULT 0"),
                    ("assessment_status", "VARCHAR(32) DEFAULT 'UNASSESSED'"),
                ]
                for col_name, col_type in new_road_segment_columns:
                    if col_name not in existing_cols:
                        conn.execute(text(f"ALTER TABLE road_segments ADD COLUMN {col_name} {col_type}"))
                        logger.info(f"Added column {col_name} to road_segments table.")

                # Ensure Phase 8 columns exist in evidence_items table
                evd_cursor = conn.execute(text("PRAGMA table_info(evidence_items)"))
                existing_evd_cols = {row[1] for row in evd_cursor.fetchall()}
                
                new_evidence_columns = [
                    ("evidence_id", "VARCHAR(64)"),
                    ("segment_code", "VARCHAR(64)"),
                    ("category", "VARCHAR(64) DEFAULT 'INFRASTRUCTURE'"),
                    ("source_name", "VARCHAR(128) DEFAULT 'OpenStreetMap Contributors'"),
                    ("source_reference", "VARCHAR(255)"),
                    ("latitude", "FLOAT"),
                    ("longitude", "FLOAT"),
                    ("observed_at", "DATETIME"),
                    ("ingested_at", "DATETIME"),
                    ("attributes_json", "TEXT"),
                    ("verification_status", "VARCHAR(32) DEFAULT 'UNVERIFIED'"),
                ]
                for col_name, col_type in new_evidence_columns:
                    if col_name not in existing_evd_cols:
                        conn.execute(text(f"ALTER TABLE evidence_items ADD COLUMN {col_name} {col_type}"))
                        logger.info(f"Added column {col_name} to evidence_items table.")

                # Ensure Phase 9 columns exist in community_reports table
                rep_cursor = conn.execute(text("PRAGMA table_info(community_reports)"))
                existing_rep_cols = {row[1] for row in rep_cursor.fetchall()}
                
                new_report_columns = [
                    ("report_id", "VARCHAR(64)"),
                    ("segment_code", "VARCHAR(64)"),
                    ("title", "VARCHAR(128)"),
                    ("location_name", "VARCHAR(255)"),
                    ("dispute_count", "INTEGER DEFAULT 0"),
                    ("flag_count", "INTEGER DEFAULT 0"),
                    ("status_notes", "TEXT"),
                    ("observed_at", "DATETIME"),
                    ("moderated_at", "DATETIME"),
                    ("moderated_by", "VARCHAR(64)"),
                    ("expires_at", "DATETIME"),
                    ("effective_trust_weight", "FLOAT DEFAULT 0.5"),
                    ("safety_score_impact", "FLOAT DEFAULT 0.0"),
                ]
                for col_name, col_type in new_report_columns:
                    if col_name not in existing_rep_cols:
                        conn.execute(text(f"ALTER TABLE community_reports ADD COLUMN {col_name} {col_type}"))
                        logger.info(f"Added column {col_name} to community_reports table.")

                conn.commit()

        logger.info("Database tables initialized successfully.")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise

def check_db_connection() -> dict:
    """Perform a lightweight database connectivity check."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {
            "status": "connected",
            "database_type": engine.dialect.name,
            "connected": True,
            "error": None,
        }
    except Exception as exc:
        logger.error(f"Database connectivity check failed: {exc}")
        return {
            "status": "disconnected",
            "database_type": engine.dialect.name,
            "connected": False,
            "error": str(exc),
        }

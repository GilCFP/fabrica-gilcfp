"""SQLAlchemy models for GilCFP content factory."""
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, JSON
from datetime import datetime
from database import Base


class Script(Base):
    __tablename__ = "scripts"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    hook = Column(Text, nullable=False)
    body = Column(Text, nullable=False)
    cta = Column(String(200), nullable=False)
    cta_keyword = Column(String(50), default="CODE")
    category = Column(String(50), default="ferramentas")
    content_format = Column(String(50), default="reel_60")
    visual_format = Column(Text, default="")
    source_usa = Column(String(200), default="")
    adaptation_note = Column(Text, default="")
    caption = Column(Text, default="")
    hashtags = Column(String(500), default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    times_copied = Column(Integer, default=0)

    # Rastreabilidade da fonte viral
    trend_id = Column(Integer, nullable=True)
    angle_index = Column(Integer, nullable=True)
    source_url = Column(String(500), default="")
    source_platform = Column(String(50), default="")
    generation_mode = Column(String(50), default="manual")
    status = Column(String(50), default="draft")


class Trend(Base):
    __tablename__ = "trends"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(300), nullable=False)
    source = Column(String(100), nullable=False)
    channel = Column(String(200), default="")
    url = Column(String(500), default="")
    summary = Column(Text, default="")
    brazil_adaptation = Column(Text, default="")
    adaptation_angle = Column(String(300), default="")
    suggested_format = Column(String(100), default="")
    priority_score = Column(Integer, default=50)
    is_new = Column(Integer, default=1)
    scraped_at = Column(DateTime, default=datetime.utcnow)

    # Campos novos para discovery de conteúdo viral
    external_id = Column(String(200), default="")
    platform = Column(String(50), default="")
    raw_metadata = Column(JSON, default=dict)
    engagement_score = Column(Float, default=0)
    content_age_hours = Column(Integer, default=0)
    transcript_summary = Column(Text, default="")
    angles_generated = Column(JSON, default=list)
    used_in_script_id = Column(Integer, nullable=True)


class Video(Base):
    __tablename__ = "videos"
    id = Column(Integer, primary_key=True, index=True)
    original_filename = Column(String(200), nullable=False)
    processed_filename = Column(String(200), default="")
    status = Column(String(50), default="uploaded")
    file_size_mb = Column(Float, default=0)
    duration_seconds = Column(Integer, default=0)
    transcript = Column(Text, default="")
    srt_content = Column(Text, default="")
    settings = Column(JSON, default=dict)
    error_message = Column(String(500), default="")
    script_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    # Edição externalizada (OpusClip)
    editor_type = Column(String(50), default="local")
    opusclip_job_id = Column(String(200), default="")
    opusclip_status = Column(String(50), default="")
    opusclip_result_url = Column(String(500), default="")


class CalendarEvent(Base):
    __tablename__ = "calendar_events"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(300), nullable=False)
    event_date = Column(DateTime, nullable=False)
    content_format = Column(String(50), default="reel_30")
    platform = Column(String(50), default="instagram")
    status = Column(String(50), default="draft")
    script_id = Column(Integer, nullable=True)
    video_id = Column(Integer, nullable=True)
    processed_at = Column(DateTime, nullable=True)
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

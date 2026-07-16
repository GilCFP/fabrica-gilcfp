"""Calendar router — CRUD for editorial calendar."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import extract
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from database import get_db
from models import CalendarEvent, Video

router = APIRouter(prefix="/api/calendar", tags=["calendar"])

class EventCreate(BaseModel):
    title: str
    event_date: datetime
    content_format: str = "reel_30"
    platform: str = "instagram"
    status: str = "draft"
    script_id: Optional[int] = None
    video_id: Optional[int] = None
    notes: str = ""

@router.get("/")
def list_events(db: Session = Depends(get_db), month: int = None, year: int = None):
    query = db.query(CalendarEvent)
    if year:
        query = query.filter(extract("year", CalendarEvent.event_date) == year)
    if month:
        query = query.filter(extract("month", CalendarEvent.event_date) == month)
    events = query.order_by(CalendarEvent.event_date).all()
    scheduled = sum(1 for e in events if e.status == "scheduled")
    drafts = sum(1 for e in events if e.status == "draft")
    published = sum(1 for e in events if e.status == "published")
    return {"events": [{"id": e.id, "title": e.title, "event_date": e.event_date.isoformat() if e.event_date else None, "content_format": e.content_format, "platform": e.platform, "status": e.status, "script_id": e.script_id, "video_id": e.video_id, "processed_at": e.processed_at.isoformat() if e.processed_at else None, "notes": e.notes} for e in events], "summary": {"scheduled": scheduled, "drafts": drafts, "published": published, "total": len(events)}}

@router.post("/")
def create_event(event: EventCreate, db: Session = Depends(get_db)):
    db_event = CalendarEvent(**event.dict())
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return {"id": db_event.id, "message": "Event created"}

@router.post("/{event_id}/attach-video/{video_id}")
def attach_video_to_event(event_id: int, video_id: int, db: Session = Depends(get_db)):
    db_event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    if video.status != "completed":
        raise HTTPException(status_code=400, detail="Video is not processed yet")
    db_event.video_id = video.id
    db_event.processed_at = video.completed_at
    db.commit()
    return {"message": "Video attached to event", "event_id": event_id, "video_id": video_id}

@router.delete("/{event_id}")
def delete_event(event_id: int, db: Session = Depends(get_db)):
    db_event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
    db.delete(db_event)
    db.commit()
    return {"message": "Event deleted"}

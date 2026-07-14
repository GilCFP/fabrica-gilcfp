"""Calendar router — CRUD for editorial calendar."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from database import get_db
from models import CalendarEvent

router = APIRouter(prefix="/api/calendar", tags=["calendar"])

class EventCreate(BaseModel):
    title: str
    event_date: datetime
    content_format: str = "reel_30"
    platform: str = "instagram"
    status: str = "draft"
    script_id: Optional[int] = None
    notes: str = ""

@router.get("/")
def list_events(db: Session = Depends(get_db), month: int = None, year: int = None):
    query = db.query(CalendarEvent)
    if year:
        query = query.filter(CalendarEvent.event_date.year == year)
    if month:
        query = query.filter(CalendarEvent.event_date.month == month)
    events = query.order_by(CalendarEvent.event_date).all()
    scheduled = sum(1 for e in events if e.status == "scheduled")
    drafts = sum(1 for e in events if e.status == "draft")
    published = sum(1 for e in events if e.status == "published")
    return {"events": [{"id": e.id, "title": e.title, "event_date": e.event_date.isoformat() if e.event_date else None, "content_format": e.content_format, "platform": e.platform, "status": e.status, "script_id": e.script_id, "notes": e.notes} for e in events], "summary": {"scheduled": scheduled, "drafts": drafts, "published": published, "total": len(events)}}

@router.post("/")
def create_event(event: EventCreate, db: Session = Depends(get_db)):
    db_event = CalendarEvent(**event.dict())
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return {"id": db_event.id, "message": "Event created"}

@router.delete("/{event_id}")
def delete_event(event_id: int, db: Session = Depends(get_db)):
    db_event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")
    db.delete(db_event)
    db.commit()
    return {"message": "Event deleted"}

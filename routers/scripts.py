"""Scripts router — CRUD + AI generation."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import Script
from services.ai_writer import generate_script

router = APIRouter(prefix="/api/scripts", tags=["scripts"])

class AIGenerateRequest(BaseModel):
    topic: str
    category: str = "ferramentas"

@router.get("/")
def list_scripts(db: Session = Depends(get_db), category: str = None, search: str = None):
    query = db.query(Script)
    if category and category != "todas":
        query = query.filter(Script.category == category)
    if search:
        query = query.filter(Script.title.contains(search) | Script.body.contains(search))
    scripts = query.order_by(Script.created_at.desc()).all()
    return {"scripts": [{"id": s.id, "title": s.title, "hook": s.hook, "body": s.body, "cta": s.cta, "cta_keyword": s.cta_keyword, "category": s.category, "content_format": s.content_format, "visual_format": s.visual_format, "source_usa": s.source_usa, "adaptation_note": s.adaptation_note, "caption": s.caption, "hashtags": s.hashtags, "created_at": s.created_at.isoformat() if s.created_at else None, "times_copied": s.times_copied} for s in scripts], "count": len(scripts)}

@router.post("/generate-ai")
async def generate_script_ai(req: AIGenerateRequest, db: Session = Depends(get_db)):
    try:
        result = await generate_script(req.topic, req.category)
        script = Script(title=result["title"], hook=result["hook"], body=result["body"], cta=result["cta"], cta_keyword=result["cta_keyword"], category=req.category, visual_format=result["visual_format"], source_usa=result["source_usa"], adaptation_note=result["adaptation_note"], caption=result["caption"], hashtags=result["hashtags"])
        db.add(script)
        db.commit()
        db.refresh(script)
        return {"id": script.id, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")

@router.post("/{script_id}/copy")
def copy_script(script_id: int, db: Session = Depends(get_db)):
    script = db.query(Script).filter(Script.id == script_id).first()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    script.times_copied += 1
    db.commit()
    return {"title": script.title, "hook": script.hook, "body": script.body, "cta": script.cta, "cta_keyword": script.cta_keyword, "visual_format": script.visual_format, "caption": script.caption, "hashtags": script.hashtags}

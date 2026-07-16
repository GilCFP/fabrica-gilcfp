"""Scripts router — CRUD + AI generation."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import Script, Trend
from services.ai_writer import generate_script, generate_script_from_angle

router = APIRouter(prefix="/api/scripts", tags=["scripts"])


class AIGenerateRequest(BaseModel):
    topic: str
    category: str = "ferramentas"


class ApproveScriptRequest(BaseModel):
    status: str


@router.get("/")
def list_scripts(db: Session = Depends(get_db), category: str = None, search: str = None):
    query = db.query(Script)
    if category and category != "todas":
        query = query.filter(Script.category == category)
    if search:
        query = query.filter(Script.title.contains(search) | Script.body.contains(search))
    scripts = query.order_by(Script.created_at.desc()).all()
    return {
        "scripts": [
            {
                "id": s.id,
                "title": s.title,
                "hook": s.hook,
                "body": s.body,
                "cta": s.cta,
                "cta_keyword": s.cta_keyword,
                "category": s.category,
                "content_format": s.content_format,
                "visual_format": s.visual_format,
                "source_usa": s.source_usa,
                "adaptation_note": s.adaptation_note,
                "caption": s.caption,
                "hashtags": s.hashtags,
                "status": s.status,
                "source_platform": s.source_platform,
                "source_url": s.source_url,
                "created_at": s.created_at.isoformat() if s.created_at else None,
                "times_copied": s.times_copied,
            }
            for s in scripts
        ],
        "count": len(scripts),
    }


@router.post("/generate-ai")
async def generate_script_ai(req: AIGenerateRequest, db: Session = Depends(get_db)):
    """Gera roteiro manualmente a partir de um tema (modo legado)."""
    try:
        result = await generate_script(req.topic, req.category)
        script = Script(
            title=result["title"],
            hook=result["hook"],
            body=result["body"],
            cta=result["cta"],
            cta_keyword=result["cta_keyword"],
            category=req.category,
            visual_format=result["visual_format"],
            source_usa=result["source_usa"],
            adaptation_note=result["adaptation_note"],
            caption=result["caption"],
            hashtags=result["hashtags"],
            generation_mode="manual",
            source_platform="manual",
        )
        db.add(script)
        db.commit()
        db.refresh(script)
        return {"id": script.id, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")


@router.post("/from-trend/{trend_id}")
async def generate_script_from_trend(trend_id: int, angle_index: int = 0, db: Session = Depends(get_db)):
    """Gera roteiro a partir de uma tendência e um ângulo escolhido."""
    trend = db.query(Trend).filter(Trend.id == trend_id).first()
    if not trend:
        raise HTTPException(status_code=404, detail="Trend not found")

    angles = trend.angles_generated or []
    if not angles:
        raise HTTPException(status_code=400, detail="Trend has no generated angles. Call POST /api/trends/{id}/angles first.")

    try:
        angle = angles[angle_index]
    except IndexError:
        raise HTTPException(status_code=400, detail=f"Invalid angle_index. Trend has {len(angles)} angles.")

    source = {
        "platform": trend.platform,
        "external_id": trend.external_id,
        "title": trend.title,
        "url": trend.url,
        "transcript_summary": trend.transcript_summary or trend.summary,
    }

    try:
        result = await generate_script_from_angle(source, angle)
        script = Script(
            title=result["title"],
            hook=result["hook"],
            body=result["body"],
            cta=result["cta"],
            cta_keyword=result["cta_keyword"],
            category="ferramentas",
            visual_format=result["visual_format"],
            source_usa=result["source_usa"],
            adaptation_note=result["adaptation_note"],
            caption=result["caption"],
            hashtags=result["hashtags"],
            trend_id=trend_id,
            angle_index=angle_index,
            source_url=trend.url,
            source_platform=trend.platform,
            generation_mode="from_trend",
            status="draft",
        )
        db.add(script)
        db.commit()
        db.refresh(script)
        trend.used_in_script_id = script.id
        db.commit()
        return {
            "id": script.id,
            "trend_id": trend_id,
            "angle_index": angle_index,
            "source_platform": script.source_platform,
            "source_url": script.source_url,
            **result,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Script generation failed: {str(e)}")


@router.post("/{script_id}/approve")
def approve_script(script_id: int, req: ApproveScriptRequest, db: Session = Depends(get_db)):
    """Aprova, rejeita ou marca um roteiro como gravado."""
    script = db.query(Script).filter(Script.id == script_id).first()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    if req.status not in ("draft", "approved", "rejected", "recorded", "scheduled", "published"):
        raise HTTPException(status_code=400, detail="Invalid status")
    script.status = req.status
    db.commit()
    return {"id": script.id, "status": script.status}


@router.post("/{script_id}/copy")
def copy_script(script_id: int, db: Session = Depends(get_db)):
    script = db.query(Script).filter(Script.id == script_id).first()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    script.times_copied += 1
    db.commit()
    return {
        "title": script.title,
        "hook": script.hook,
        "body": script.body,
        "cta": script.cta,
        "cta_keyword": script.cta_keyword,
        "visual_format": script.visual_format,
        "caption": script.caption,
        "hashtags": script.hashtags,
    }

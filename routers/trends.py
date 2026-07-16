"""Trends router — discovery + intelligence endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Trend
from services.discovery import discover_all
from services.filtering import rank_items
from services.transcription import summarize_source
from services.angle_generator import generate_angles

router = APIRouter(prefix="/api/trends", tags=["trends"])


@router.get("/")
def list_trends(db: Session = Depends(get_db)):
    trends = db.query(Trend).order_by(Trend.engagement_score.desc()).all()
    return {
        "trends": [
            {
                "id": t.id,
                "title": t.title,
                "platform": t.platform,
                "source": t.source,
                "channel": t.channel,
                "url": t.url,
                "summary": t.summary,
                "engagement_score": t.engagement_score,
                "content_age_hours": t.content_age_hours,
                "angles_generated": t.angles_generated,
                "used_in_script_id": t.used_in_script_id,
                "scraped_at": t.scraped_at.isoformat() if t.scraped_at else None,
            }
            for t in trends
        ],
        "count": len(trends),
    }


@router.post("/refresh")
async def refresh_trends(db: Session = Depends(get_db)):
    """Dispara discovery em YouTube + Hacker News, filtra e persiste tendências."""
    try:
        items = await discover_all(max_results_per_source=5, published_after_days=14)
        ranked = rank_items(items)

        for item in ranked[:20]:
            # Evita duplicar por external_id + platform
            existing = (
                db.query(Trend)
                .filter(Trend.external_id == item.get("external_id", ""))
                .filter(Trend.platform == item.get("platform", ""))
                .first()
            )
            if existing:
                continue

            trend = Trend(
                title=item.get("title", ""),
                platform=item.get("platform", ""),
                source=item.get("platform", ""),
                channel=item.get("channel", ""),
                url=item.get("url", ""),
                summary=item.get("summary", ""),
                external_id=item.get("external_id", ""),
                raw_metadata=item.get("raw_metadata", {}),
                engagement_score=item.get("engagement_score", 0),
                content_age_hours=item.get("content_age_hours", 0),
                priority_score=min(100, int(item.get("engagement_score", 0))),
            )
            db.add(trend)

        db.commit()
        return {"message": "Trends refreshed", "count": len(ranked[:20])}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Trend refresh failed: {str(e)}")


@router.post("/{trend_id}/angles")
async def generate_trend_angles(trend_id: int, db: Session = Depends(get_db)):
    """Gera 2 ângulos de adaptação para uma tendência."""
    trend = db.query(Trend).filter(Trend.id == trend_id).first()
    if not trend:
        raise HTTPException(status_code=404, detail="Trend not found")

    if not trend.transcript_summary:
        item = {
            "platform": trend.platform,
            "external_id": trend.external_id,
            "title": trend.title,
            "url": trend.url,
            "summary": trend.summary,
        }
        trend.transcript_summary = await summarize_source(item)

    source = {
        "platform": trend.platform,
        "external_id": trend.external_id,
        "title": trend.title,
        "url": trend.url,
        "transcript_summary": trend.transcript_summary,
    }
    angles = await generate_angles(source)
    trend.angles_generated = angles
    db.commit()
    return {"trend_id": trend_id, "angles": angles}

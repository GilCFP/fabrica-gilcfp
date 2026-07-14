"""Trends router — scraping + intelligence endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Trend
from services.apify_scraper import scrape_with_apify, enrich_with_ai

router = APIRouter(prefix="/api/trends", tags=["trends"])

@router.get("/")
async def list_trends(db: Session = Depends(get_db), force_refresh: bool = False):
    if force_refresh:
        try:
            scraped = await scrape_with_apify()
            enriched = await enrich_with_ai(scraped)
            for item in enriched:
                db.add(Trend(
                    title=item["title"], source=item["source"], channel=item.get("channel", ""),
                    url=item.get("url", ""), summary=item.get("summary", ""),
                    brazil_adaptation=item.get("brazil_adaptation", ""),
                    adaptation_angle=item.get("adaptation_angle", ""),
                    suggested_format=item.get("suggested_format", "Reel 60s"),
                    priority_score=item.get("priority_score", 50),
                ))
            db.commit()
        except Exception as e:
            print(f"[Trends] Scrape error: {e}")
    trends = db.query(Trend).order_by(Trend.priority_score.desc()).all()
    return {"trends": [{"id": t.id, "title": t.title, "source": t.source, "channel": t.channel, "url": t.url, "summary": t.summary, "brazil_adaptation": t.brazil_adaptation, "adaptation_angle": t.adaptation_angle, "suggested_format": t.suggested_format, "priority_score": t.priority_score, "scraped_at": t.scraped_at.isoformat() if t.scraped_at else None} for t in trends], "count": len(trends), "sources_monitored": 24}

@router.post("/refresh")
async def refresh_trends(db: Session = Depends(get_db)):
    return await list_trends(db=db, force_refresh=True)

"""Videos router — upload + processing pipeline."""
import os
import shutil
import asyncio
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import Video, Script, CalendarEvent
from services.video_pipeline import process_video, get_video_info
from services.opusclip_client import submit_clip_job, get_job_status
from datetime import datetime

router = APIRouter(prefix="/api/videos", tags=["videos"])
UPLOAD_DIR = "./uploads"
OUTPUT_DIR = "./outputs"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

@router.post("/upload")
async def upload_video(
    file: UploadFile = File(...),
    settings: str = Form('{"cut_hesitations": true, "jump_cuts": true, "add_subtitles": true}'),
    script_id: int = Form(None),
    editor_type: str = Form("local"),
    db: Session = Depends(get_db),
):
    import json
    try:
        settings_dict = json.loads(settings)
    except:
        settings_dict = {"cut_hesitations": True, "jump_cuts": True, "add_subtitles": True}

    if editor_type not in ("local", "opusclip"):
        raise HTTPException(status_code=400, detail="editor_type must be 'local' or 'opusclip'")

    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    info = get_video_info(file_path)
    video = Video(
        original_filename=file.filename,
        file_size_mb=info["file_size_mb"],
        duration_seconds=info["duration_seconds"],
        status="processing",
        settings=settings_dict,
        script_id=script_id,
        editor_type=editor_type,
    )
    db.add(video)
    db.commit()
    db.refresh(video)

    if editor_type == "opusclip":
        # OpusClip é processado sob demanda via POST /edit-opusclip
        video.status = "uploaded"
        db.commit()
        return {"id": video.id, "filename": file.filename, "status": "uploaded", "message": "Upload successful. Send to OpusClip via POST /api/videos/{id}/edit-opusclip.", "editor_type": editor_type}

    asyncio.create_task(process_video(video.id))
    return {"id": video.id, "filename": file.filename, "status": "processing", "message": "Upload successful. Local processing started.", "estimated_time_seconds": 25, "editor_type": editor_type}

@router.get("/{video_id}/status")
def get_video_status(video_id: int, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    return {"id": video.id, "filename": video.original_filename, "status": video.status, "file_size_mb": video.file_size_mb, "duration_seconds": video.duration_seconds, "error_message": video.error_message, "created_at": video.created_at.isoformat() if video.created_at else None}

@router.get("/{video_id}/download")
def download_video(video_id: int, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video or video.status != "completed":
        raise HTTPException(status_code=404, detail="Video not available")
    output_path = os.path.join(OUTPUT_DIR, video.processed_filename)
    if not os.path.exists(output_path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(output_path, filename=f"gilcfp_{video.original_filename}", media_type="video/mp4")

@router.get("/{video_id}/preview")
def preview_video(video_id: int, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    input_path = os.path.join(UPLOAD_DIR, video.original_filename)
    if not os.path.exists(input_path):
        raise HTTPException(status_code=404, detail="Original file not found")
    return FileResponse(input_path, filename=video.original_filename, media_type="video/mp4")

class ScheduleRequest(BaseModel):
    event_date: datetime
    platform: str = "instagram"
    content_format: str = "reel_30"

@router.post("/{video_id}/schedule")
def schedule_video(video_id: int, payload: ScheduleRequest, db: Session = Depends(get_db)):
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    if video.status != "completed":
        raise HTTPException(status_code=400, detail="Video is not processed yet")

    title = video.original_filename
    notes = ""
    if video.script_id:
        script = db.query(Script).filter(Script.id == video.script_id).first()
        if script:
            title = script.title or video.original_filename
            notes = f"{script.caption}\n\n{script.hashtags}".strip()

    event = CalendarEvent(
        title=title,
        event_date=payload.event_date,
        platform=payload.platform,
        content_format=payload.content_format,
        status="draft",
        script_id=video.script_id,
        video_id=video.id,
        notes=notes,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return {"id": event.id, "message": "Event scheduled", "video_id": video.id}

@router.post("/{video_id}/edit-opusclip")
async def edit_with_opusclip(video_id: int, db: Session = Depends(get_db)):
    """Envia vídeo bruto para edição na OpusClip."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    input_path = os.path.join(UPLOAD_DIR, video.original_filename)
    if not os.path.exists(input_path):
        raise HTTPException(status_code=404, detail="Original file not found")

    try:
        result = await submit_clip_job(input_path)
        video.opusclip_job_id = result.get("id") or result.get("job_id", "")
        video.opusclip_status = result.get("status", "pending")
        video.status = "processing"
        db.commit()
        return {"id": video.id, "opusclip_job_id": video.opusclip_job_id, "status": video.opusclip_status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpusClip submission failed: {str(e)}")


@router.get("/{video_id}/edit-status")
async def opusclip_status(video_id: int, db: Session = Depends(get_db)):
    """Consulta status do job OpusClip vinculado ao vídeo."""
    video = db.query(Video).filter(Video.id == video_id).first()
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    if not video.opusclip_job_id:
        raise HTTPException(status_code=400, detail="Video has no OpusClip job")

    try:
        result = await get_job_status(video.opusclip_job_id)
        video.opusclip_status = result.get("status", video.opusclip_status)
        video.opusclip_result_url = result.get("result_url", video.opusclip_result_url)
        if result.get("status") == "completed":
            video.status = "completed"
        elif result.get("status") in ("failed", "error"):
            video.status = "error"
            video.error_message = result.get("error", "OpusClip job failed")
        db.commit()
        return {"id": video.id, "opusclip_job_id": video.opusclip_job_id, "opusclip_status": video.opusclip_status, "opusclip_result_url": video.opusclip_result_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OpusClip status check failed: {str(e)}")


@router.get("/")
def list_videos(db: Session = Depends(get_db)):
    videos = db.query(Video).order_by(Video.created_at.desc()).all()
    return {"videos": [{"id": v.id, "filename": v.original_filename, "status": v.status, "file_size_mb": v.file_size_mb, "duration_seconds": v.duration_seconds, "error_message": v.error_message, "editor_type": v.editor_type, "opusclip_job_id": v.opusclip_job_id, "opusclip_status": v.opusclip_status, "created_at": v.created_at.isoformat() if v.created_at else None} for v in videos]}

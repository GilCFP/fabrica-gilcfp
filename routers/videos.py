"""Videos router — upload + processing pipeline."""
import os
import shutil
import asyncio
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from database import get_db
from models import Video
from services.video_pipeline import transcribe_with_whisper, get_video_info

router = APIRouter(prefix="/api/videos", tags=["videos"])
UPLOAD_DIR = "./uploads"
OUTPUT_DIR = "./outputs"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

@router.post("/upload")
async def upload_video(file: UploadFile = File(...), settings: str = Form('{"cut_hesitations": true, "jump_cuts": true, "add_subtitles": true}'), db: Session = Depends(get_db)):
    import json
    try:
        settings_dict = json.loads(settings)
    except:
        settings_dict = {"cut_hesitations": True, "jump_cuts": True, "add_subtitles": True}
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    info = get_video_info(file_path)
    video = Video(original_filename=file.filename, file_size_mb=info["file_size_mb"], duration_seconds=info["duration_seconds"], status="uploaded", settings=settings_dict)
    db.add(video)
    db.commit()
    db.refresh(video)
    return {"id": video.id, "filename": file.filename, "status": "uploaded", "message": "Upload successful. Processing started.", "estimated_time_seconds": 25}

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

@router.get("/")
def list_videos(db: Session = Depends(get_db)):
    videos = db.query(Video).order_by(Video.created_at.desc()).all()
    return {"videos": [{"id": v.id, "filename": v.original_filename, "status": v.status, "file_size_mb": v.file_size_mb, "duration_seconds": v.duration_seconds, "error_message": v.error_message, "created_at": v.created_at.isoformat() if v.created_at else None} for v in videos]}

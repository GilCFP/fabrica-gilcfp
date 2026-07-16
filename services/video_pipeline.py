"""Video processing pipeline using OpenAI Whisper API + FFmpeg.

Pipeline:
1. Receive uploaded video file
2. Send audio to OpenAI Whisper API for transcription
3. Parse transcript to find hesitations and long pauses
4. Use FFmpeg to cut out hesitations and apply jump cuts
5. Generate SRT subtitle file
6. Burn subtitles into video with FFmpeg
7. Export final video (9:16, 1080x1920, 30fps)

Costs: ~$0.006/min with OpenAI Whisper API.
"""
import asyncio
import os
import re
import json
import subprocess
import httpx
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple, Optional

from database import SessionLocal
from models import Video, CalendarEvent, Script
from services.subtitles_hormozi import generate_ass_from_transcript

HESITATION_WORDS = ["eh", "ah", "hum", "tah", "mmm", "nnn", "um", "er", "hmm"]

# Global lock so only one video is processed at a time on SQLite.
_processing_lock = asyncio.Lock()


def extract_audio(video_path: str, output_audio: str) -> bool:
    try:
        result = subprocess.run(
            ["ffmpeg", "-y", "-i", video_path, "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1", output_audio],
            capture_output=True, text=True, timeout=120,
        )
        return result.returncode == 0
    except Exception as e:
        print(f"[FFmpeg] Audio extraction error: {e}")
        return False


async def transcribe_with_whisper(audio_path: str) -> Dict:
    openai_api_key = os.environ.get("OPENAI_API_KEY", "")
    if not openai_api_key:
        raise ValueError("OPENAI_API_KEY not configured")
    async with httpx.AsyncClient(timeout=120.0) as client:
        with open(audio_path, "rb") as f:
            response = await client.post(
                "https://api.openai.com/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {openai_api_key}"},
                files={"file": ("audio.wav", f, "audio/wav")},
                data={"model": "whisper-1", "language": "pt", "response_format": "verbose_json", "timestamp_granularities[]": "word"},
            )
        if response.status_code != 200:
            raise RuntimeError(f"Whisper API error: {response.status_code} - {response.text}")
        return response.json()


def find_cuts(transcript: Dict) -> Tuple[List[Tuple[float, float]], List[Tuple[float, float]]]:
    words = transcript.get("words", [])
    hesitation_cuts = []
    pause_cuts = []
    for word_info in words:
        word_text = word_info.get("word", "").strip().lower().rstrip(".,!?:;")
        if word_text in HESITATION_WORDS:
            start = max(0, word_info.get("start", 0) - 0.1)
            end = word_info.get("end", start + 0.5) + 0.1
            hesitation_cuts.append((start, end))
    hesitation_cuts = merge_intervals(hesitation_cuts)
    for i in range(len(words) - 1):
        current_end = words[i].get("end", 0)
        next_start = words[i + 1].get("start", current_end)
        gap = next_start - current_end
        if gap > 1.5:
            pause_cuts.append((current_end + 0.2, next_start))
    pause_cuts = merge_intervals(pause_cuts)
    return hesitation_cuts, pause_cuts


def merge_intervals(intervals: List[Tuple[float, float]]) -> List[Tuple[float, float]]:
    if not intervals:
        return []
    sorted_intervals = sorted(intervals, key=lambda x: x[0])
    merged = [sorted_intervals[0]]
    for current in sorted_intervals[1:]:
        last = merged[-1]
        if current[0] <= last[1]:
            merged[-1] = (last[0], max(last[1], current[1]))
        else:
            merged.append(current)
    return merged


def generate_srt(transcript: Dict, max_words: int = 8) -> str:
    words = transcript.get("words", [])
    if not words:
        return ""
    subtitles = []
    current_words = []
    current_start = None
    for word_info in words:
        word = word_info.get("word", "").strip()
        if not word:
            continue
        if current_start is None:
            current_start = word_info.get("start", 0)
        current_words.append(word)
        if len(current_words) >= max_words:
            subtitles.append({"start": current_start, "end": word_info.get("end", current_start + 2), "text": " ".join(current_words)})
            current_words = []
            current_start = None
    if current_words:
        subtitles.append({"start": current_start or 0, "end": words[-1].get("end", current_start + 2) if words else current_start + 2, "text": " ".join(current_words)})
    srt_lines = []
    for i, sub in enumerate(subtitles):
        srt_lines.append(f"{i + 1}")
        srt_lines.append(f"{_fmt_srt_time(sub['start'])} --> {_fmt_srt_time(sub['end'])}")
        srt_lines.append(sub["text"])
        srt_lines.append("")
    return "\n".join(srt_lines)


def _fmt_srt_time(seconds: float) -> str:
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def process_video_with_ffmpeg(input_path: str, output_path: str, cuts: List[Tuple[float, float]], srt_path: Optional[str] = None) -> bool:
    try:
        if not cuts:
            filters = "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black"
            if srt_path and os.path.exists(srt_path):
                ext = os.path.splitext(srt_path)[1].lower()
                sub_filter = f"ass={srt_path}" if ext == ".ass" else f"subtitles={srt_path}"
                filters = f"{filters},{sub_filter}"
            result = subprocess.run(
                ["ffmpeg", "-y", "-i", input_path, "-vf", filters, "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "aac", "-b:a", "128k", "-r", "30", "-movflags", "+faststart", output_path],
                capture_output=True, text=True, timeout=300,
            )
            return result.returncode == 0
        duration_cmd = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", input_path], capture_output=True, text=True)
        total_duration = float(duration_cmd.stdout.strip())
        segments = []
        last_end = 0
        for start, end in sorted(cuts):
            if start > last_end:
                segments.append((last_end, start))
            last_end = end
        if last_end < total_duration:
            segments.append((last_end, total_duration))
        if not segments:
            segments = [(0, total_duration)]
        segment_files = []
        for i, (seg_start, seg_end) in enumerate(segments):
            seg_path = output_path + f".seg{i}.mp4"
            seg_duration = seg_end - seg_start
            result = subprocess.run(["ffmpeg", "-y", "-i", input_path, "-ss", str(seg_start), "-t", str(seg_duration), "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black", "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "aac", "-b:a", "128k", "-r", "30", "-avoid_negative_ts", "make_zero", seg_path], capture_output=True, text=True, timeout=120)
            if result.returncode == 0:
                segment_files.append(seg_path)
        if not segment_files:
            return False
        concat_path = output_path + ".concat.txt"
        with open(concat_path, "w") as f:
            for seg_file in segment_files:
                # Use absolute paths so the concat demuxer resolves them
                # correctly regardless of the output directory.
                f.write(f"file '{os.path.abspath(seg_file)}'\n")
        concat_result = subprocess.run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", concat_path, "-c", "copy", output_path + ".temp.mp4"], capture_output=True, text=True, timeout=120)
        final_output = output_path + ".temp.mp4"
        if srt_path and os.path.exists(srt_path) and concat_result.returncode == 0:
            _burn_subtitles(final_output, output_path, srt_path)
        elif concat_result.returncode == 0:
            os.rename(final_output, output_path)
        for seg_file in segment_files:
            try:
                os.remove(seg_file)
            except:
                pass
        try:
            os.remove(concat_path)
            os.remove(output_path + ".temp.mp4")
        except:
            pass
        return os.path.exists(output_path) and os.path.getsize(output_path) > 0
    except Exception as e:
        print(f"[FFmpeg] Processing error: {e}")
        return False


def _burn_subtitles(input_path: str, output_path: str, subtitle_path: str) -> bool:
    """Queima legendas SRT ou ASS no vídeo final."""
    try:
        ext = os.path.splitext(subtitle_path)[1].lower()
        if ext == ".ass":
            vf = f"ass={subtitle_path}"
        else:
            vf = f"subtitles={subtitle_path}:force_style='FontSize=24,PrimaryColour=&H00FFFF00,OutlineColour=&H00000000,Outline=2,Alignment=2,MarginV=50'"
        result = subprocess.run(
            ["ffmpeg", "-y", "-i", input_path, "-vf", vf, "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "copy", "-movflags", "+faststart", output_path],
            capture_output=True, text=True, timeout=300,
        )
        if result.returncode != 0:
            print(f"[FFmpeg] Subtitle burn error: {result.stderr}")
        return result.returncode == 0
    except Exception as e:
        print(f"[FFmpeg] Subtitle burn error: {e}")
        return False


def get_video_info(video_path: str) -> Dict:
    try:
        result = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration,size", "-of", "json", video_path], capture_output=True, text=True, timeout=30)
        info = json.loads(result.stdout)
        duration = float(info.get("format", {}).get("duration", 0))
        size_bytes = int(info.get("format", {}).get("size", 0))
        return {"duration_seconds": int(duration), "file_size_mb": round(size_bytes / (1024 * 1024), 2)}
    except Exception as e:
        print(f"[FFprobe] Error: {e}")
        return {"duration_seconds": 0, "file_size_mb": 0}


def _create_calendar_event_for_video(db, video: Video) -> None:
    """Create a draft calendar event from a completed video with a script."""
    try:
        title = video.original_filename
        notes = ""
        script = db.query(Script).filter(Script.id == video.script_id).first()
        if script:
            title = script.title or video.original_filename
            notes = f"{script.caption}\n\n{script.hashtags}".strip()
        event = CalendarEvent(
            title=title,
            event_date=video.completed_at or datetime.utcnow(),
            platform="instagram",
            content_format="reel_30",
            status="draft",
            script_id=video.script_id,
            video_id=video.id,
            processed_at=video.completed_at,
            notes=notes,
        )
        db.add(event)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"[VideoPipeline] Failed to create calendar event for video {video.id}: {e}")


async def process_video(video_id: int) -> None:
    """Process a uploaded video in background.

    Runs FFmpeg/Whisper in threads and keeps only one video processing at a
    time to avoid SQLite database-is-locked errors.
    """
    UPLOAD_DIR = "./uploads"
    OUTPUT_DIR = "./outputs"

    async with _processing_lock:
        db = SessionLocal()
        try:
            video = db.query(Video).filter(Video.id == video_id).first()
            if not video:
                print(f"[VideoPipeline] Video {video_id} not found")
                return

            video.status = "processing"
            db.commit()

            input_path = os.path.join(UPLOAD_DIR, video.original_filename)
            processed_filename = f"{video.id}_processed.mp4"
            output_path = os.path.join(OUTPUT_DIR, processed_filename)

            audio_path = os.path.join(OUTPUT_DIR, f"{video.id}_audio.wav")
            srt_path = os.path.join(OUTPUT_DIR, f"{video.id}_subs.srt")
            ass_path = os.path.join(OUTPUT_DIR, f"{video.id}_subs.ass")

            temp_files = [audio_path, srt_path, ass_path]

            try:
                # 1. Extract audio on a worker thread so the event loop stays free.
                extracted = await asyncio.to_thread(extract_audio, input_path, audio_path)
                if not extracted:
                    raise RuntimeError("Failed to extract audio with FFmpeg")

                # 2. Transcribe with Whisper.
                transcript = await transcribe_with_whisper(audio_path)
                video.transcript = transcript.get("text", "")

                # 3. Generate subtitles (SRT default or ASS for Hormozi style).
                settings = video.settings or {}
                add_subtitles = bool(settings.get("add_subtitles") or settings.get("autoSubtitles", True))
                subtitle_style = settings.get("subtitleStyle") or settings.get("subtitle_style", "tiktok")
                srt_content = ""
                subtitle_path = None

                if add_subtitles:
                    if subtitle_style == "hormozi":
                        subtitle_path = generate_ass_from_transcript(
                            transcript, ass_path, video_width=1080, video_height=1920
                        )
                        video.srt_content = ""  # ASS não é texto legível no campo SRT
                    else:
                        srt_content = generate_srt(transcript)
                        video.srt_content = srt_content
                        if srt_content:
                            with open(srt_path, "w", encoding="utf-8") as f:
                                f.write(srt_content)
                            subtitle_path = srt_path

                # 4. Find hesitation / pause cuts.
                hesitation_cuts, pause_cuts = find_cuts(transcript)
                all_cuts = merge_intervals(hesitation_cuts + pause_cuts)

                apply_cuts = bool(
                    settings.get("cut_hesitations") or settings.get("cutHesitations", True)
                    or settings.get("jump_cuts") or settings.get("jumpCuts", True)
                )
                cuts = all_cuts if apply_cuts else []
                burn_subtitles = bool(add_subtitles and subtitle_path and os.path.exists(subtitle_path))

                # 5. Process video with FFmpeg on a worker thread.
                processed = await asyncio.to_thread(
                    process_video_with_ffmpeg,
                    input_path,
                    output_path,
                    cuts,
                    subtitle_path if burn_subtitles else None,
                )
                if not processed:
                    raise RuntimeError("Failed to process video with FFmpeg")

                video.processed_filename = processed_filename
                video.status = "completed"
                video.completed_at = datetime.utcnow()
                db.commit()

                # Optionally create a draft calendar event when the video is
                # linked to a script, so the editorial calendar stays clean for
                # freestyle recordings without a script.
                if video.script_id:
                    _create_calendar_event_for_video(db, video)

            except Exception as e:
                error_msg = str(e)[:500]
                print(f"[VideoPipeline] Error processing video {video_id}: {error_msg}")
                video.status = "error"
                video.error_message = error_msg
                db.commit()
            finally:
                # Cleanup all known temporary files.
                temp_files.extend([
                    output_path + ".concat.txt",
                    output_path + ".temp.mp4",
                ])
                for temp_file in temp_files:
                    try:
                        if os.path.exists(temp_file):
                            os.remove(temp_file)
                    except Exception:
                        pass
                # Cleanup segment files produced by FFmpeg.
                try:
                    for fname in os.listdir(OUTPUT_DIR):
                        if fname.startswith(f"{video.id}_processed.mp4.seg") and fname.endswith(".mp4"):
                            os.remove(os.path.join(OUTPUT_DIR, fname))
                except Exception:
                    pass
        finally:
            db.close()

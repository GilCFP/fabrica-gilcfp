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
import os
import re
import json
import subprocess
import httpx
from pathlib import Path
from typing import Dict, List, Tuple, Optional

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
HESITATION_WORDS = ["eh", "ah", "hum", "tah", "mmm", "nnn", "um", "er", "hmm"]


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
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY not configured")
    async with httpx.AsyncClient(timeout=120.0) as client:
        with open(audio_path, "rb") as f:
            response = await client.post(
                "https://api.openai.com/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
                files={"file": ("audio.mp3", f, "audio/mpeg")},
                data={"model": "whisper-1", "language": "pt", "response_format": "verbose_json", "timestamp_granularities[]": "word"},
            )
        if response.status_code != 200:
            raise RuntimeError(f"Whisper API error: {response.status_code}")
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
            if srt_path and os.path.exists(srt_path):
                return _burn_subtitles(input_path, output_path, srt_path)
            result = subprocess.run(["ffmpeg", "-y", "-i", input_path, "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black", "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "aac", "-b:a", "128k", "-r", "30", "-movflags", "+faststart", output_path], capture_output=True, text=True, timeout=300)
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
                f.write(f"file '{seg_file}'\n")
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


def _burn_subtitles(input_path: str, output_path: str, srt_path: str) -> bool:
    try:
        result = subprocess.run(["ffmpeg", "-y", "-i", input_path, "-vf", f"subtitles={srt_path}:force_style='FontSize=24,PrimaryColour=&H00FFFF00,OutlineColour=&H00000000,Outline=2,Alignment=2,MarginV=50'", "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "copy", "-movflags", "+faststart", output_path], capture_output=True, text=True, timeout=300)
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

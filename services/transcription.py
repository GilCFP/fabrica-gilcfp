"""Transcription / summarization for discovered sources."""
from typing import Dict
from youtube_transcript_api import YouTubeTranscriptApi


async def summarize_source(item: Dict) -> str:
    """Extrai ou resume o conteúdo de uma fonte descoberta.

    - YouTube: tenta obter legendas em inglês/português; fallback no summary.
    - Hacker News: usa summary (título + texto).
    """
    platform = item.get("platform", "")

    if platform == "youtube":
        video_id = item.get("external_id", "")
        if video_id:
            try:
                transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
                text = " ".join([seg.get("text", "") for seg in transcript_list])
                if len(text) > 2000:
                    text = text[:2000] + "..."
                return text
            except Exception as e:
                print(f"[Transcription] YouTube transcript error for {video_id}: {e}")
        return item.get("summary", "")

    if platform == "hackernews":
        return item.get("summary", "")

    return item.get("summary", "")

"""YouTube Data API discovery for viral short-form content."""
import os
from datetime import datetime, timedelta, timezone
from typing import Dict, List
import httpx

YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
YOUTUBE_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"

# Palavras-chave padrão do nicho GilCFP
DEFAULT_KEYWORDS = [
    "Claude Code",
    "vibe coding",
    "n8n automation",
    "AI agents",
    "AI automation",
    "product management",
]


def _parse_published_at(published_at: str) -> datetime:
    try:
        return datetime.fromisoformat(published_at.replace("Z", "+00:00"))
    except Exception:
        return datetime.now(timezone.utc)


def _hours_since(dt: datetime) -> int:
    now = datetime.now(timezone.utc)
    return max(0, int((now - dt).total_seconds() // 3600))


async def search_youtube(
    keywords: List[str] = None,
    max_results_per_query: int = 5,
    published_after_days: int = 30,
) -> List[Dict]:
    """Busca vídeos recentes no YouTube Data API v3.

    Retorna itens normalizados no schema comum de discovery.
    """
    api_key = os.environ.get("YOUTUBE_API_KEY", "")
    if not api_key:
        print("[YouTube Discovery] YOUTUBE_API_KEY not configured")
        return []

    keywords = keywords or DEFAULT_KEYWORDS
    published_after = (datetime.now(timezone.utc) - timedelta(days=published_after_days)).isoformat()

    video_ids = []
    metadata_by_id = {}

    async with httpx.AsyncClient(timeout=30.0) as client:
        for query in keywords:
            try:
                response = await client.get(
                    YOUTUBE_SEARCH_URL,
                    params={
                        "part": "snippet",
                        "q": query,
                        "type": "video",
                        "videoDuration": "short",
                        "order": "viewCount",
                        "publishedAfter": published_after,
                        "maxResults": max_results_per_query,
                        "key": api_key,
                    },
                )
                response.raise_for_status()
                data = response.json()
                for item in data.get("items", []):
                    video_id = item["id"]["videoId"]
                    video_ids.append(video_id)
                    snippet = item.get("snippet", {})
                    metadata_by_id[video_id] = {
                        "title": snippet.get("title", ""),
                        "channel": snippet.get("channelTitle", ""),
                        "published_at": snippet.get("publishedAt", ""),
                        "description": snippet.get("description", ""),
                        "query": query,
                    }
            except Exception as e:
                print(f"[YouTube Discovery] Search error for '{query}': {e}")
                continue

        if not video_ids:
            return []

        # Busca estatísticas em batch
        try:
            stats_response = await client.get(
                YOUTUBE_VIDEOS_URL,
                params={
                    "part": "statistics,contentDetails",
                    "id": ",".join(video_ids),
                    "key": api_key,
                },
            )
            stats_response.raise_for_status()
            stats_data = stats_response.json()
        except Exception as e:
            print(f"[YouTube Discovery] Stats error: {e}")
            stats_data = {"items": []}

    results = []
    for item in stats_data.get("items", []):
        video_id = item["id"]
        meta = metadata_by_id.get(video_id, {})
        stats = item.get("statistics", {})
        published_at = _parse_published_at(meta.get("published_at", ""))
        results.append({
            "external_id": video_id,
            "platform": "youtube",
            "title": meta.get("title", ""),
            "url": f"https://www.youtube.com/watch?v={video_id}",
            "channel": meta.get("channel", ""),
            "summary": meta.get("description", ""),
            "published_at": meta.get("published_at", ""),
            "content_age_hours": _hours_since(published_at),
            "metrics": {
                "views": int(stats.get("viewCount", 0) or 0),
                "likes": int(stats.get("likeCount", 0) or 0),
                "comments": int(stats.get("commentCount", 0) or 0),
            },
            "raw_metadata": {
                "query": meta.get("query", ""),
                "duration": item.get("contentDetails", {}).get("duration", ""),
            },
        })

    return results

"""Hacker News discovery via Algolia API."""
from datetime import datetime, timezone
from typing import Dict, List
import httpx

HN_SEARCH_URL = "https://hn.algolia.com/api/v1/search_by_date"

DEFAULT_KEYWORDS = [
    "Claude Code",
    "vibe coding",
    "n8n",
    "AI agents",
    "AI automation",
    "product management",
]


def _hours_since_timestamp(timestamp: int) -> int:
    now = datetime.now(timezone.utc)
    item_time = datetime.fromtimestamp(timestamp, tz=timezone.utc)
    return max(0, int((now - item_time).total_seconds() // 3600))


def _format_published_at(timestamp: int) -> str:
    return datetime.fromtimestamp(timestamp, tz=timezone.utc).isoformat()


async def search_hackernews(
    keywords: List[str] = None,
    max_results_per_query: int = 5,
    published_after_days: int = 14,
) -> List[Dict]:
    """Busca stories recentes no Hacker News via Algolia.

    Retorna itens normalizados no schema comum de discovery.
    """
    keywords = keywords or DEFAULT_KEYWORDS
    since_timestamp = int((datetime.now(timezone.utc).timestamp()) - (published_after_days * 86400))

    results = []
    seen_ids = set()

    async with httpx.AsyncClient(timeout=30.0) as client:
        for query in keywords:
            try:
                response = await client.get(
                    HN_SEARCH_URL,
                    params={
                        "query": query,
                        "tags": "story",
                        "numericFilters": f"created_at_i>{since_timestamp}",
                        "hitsPerPage": max_results_per_query,
                    },
                )
                response.raise_for_status()
                data = response.json()
                for hit in data.get("hits", []):
                    story_id = hit.get("objectID")
                    if not story_id or story_id in seen_ids:
                        continue
                    seen_ids.add(story_id)

                    title = hit.get("title", "")
                    url = hit.get("url") or f"https://news.ycombinator.com/item?id={story_id}"
                    points = hit.get("points", 0) or 0
                    num_comments = hit.get("num_comments", 0) or 0
                    created_at_i = hit.get("created_at_i", 0) or 0

                    results.append({
                        "external_id": story_id,
                        "platform": "hackernews",
                        "title": title,
                        "url": url,
                        "channel": "Hacker News",
                        "summary": hit.get("story_text", "")[:500] or title,
                        "published_at": _format_published_at(created_at_i),
                        "content_age_hours": _hours_since_timestamp(created_at_i),
                        "metrics": {
                            "upvotes": points,
                            "comments": num_comments,
                        },
                        "raw_metadata": {
                            "query": query,
                            "author": hit.get("author", ""),
                        },
                    })
            except Exception as e:
                print(f"[HackerNews Discovery] Search error for '{query}': {e}")
                continue

    return results

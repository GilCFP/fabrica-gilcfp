"""Aggregator that combines discovery sources and normalizes items."""
from typing import Dict, List

from .youtube import search_youtube
from .hackernews import search_hackernews


# Keywords padrão do nicho GilCFP. Podem ser parametrizadas no futuro.
DEFAULT_KEYWORDS = [
    "Claude Code",
    "vibe coding",
    "n8n automation",
    "AI agents",
    "AI automation",
    "product management",
]


async def discover_all(
    keywords: List[str] = None,
    max_results_per_source: int = 5,
    published_after_days: int = 14,
) -> List[Dict]:
    """Descobre conteúdo viral em múltiplas fontes e retorna lista normalizada.

    Schema comum de cada item:
    {
        "external_id": str,
        "platform": str,
        "title": str,
        "url": str,
        "channel": str,
        "summary": str,
        "published_at": str (ISO),
        "content_age_hours": int,
        "metrics": dict,
        "raw_metadata": dict,
    }
    """
    keywords = keywords or DEFAULT_KEYWORDS

    youtube_items = await search_youtube(
        keywords=keywords,
        max_results_per_query=max_results_per_source,
        published_after_days=published_after_days,
    )
    hackernews_items = await search_hackernews(
        keywords=keywords,
        max_results_per_query=max_results_per_source,
        published_after_days=published_after_days,
    )

    all_items = youtube_items + hackernews_items

    # Deduplicação por URL
    seen_urls = set()
    deduped = []
    for item in all_items:
        url = item.get("url", "")
        if url and url in seen_urls:
            continue
        seen_urls.add(url)
        deduped.append(item)

    return deduped

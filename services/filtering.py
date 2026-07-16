"""Filtering and ranking for discovered viral content."""
from typing import Dict, List


def _extract_views(metrics: Dict) -> int:
    return metrics.get("views", 0) or metrics.get("upvotes", 0)


def _extract_engagement(metrics: Dict) -> int:
    return (
        metrics.get("views", 0)
        + (metrics.get("likes", 0) * 10)
        + (metrics.get("upvotes", 0) * 10)
        + (metrics.get("comments", 0) * 5)
    )


def rank_items(items: List[Dict], keywords: List[str] = None) -> List[Dict]:
    """Calcula engagement_score e ordena itens por relevância + viralidade.

    Fórmula simples: score = engagement / (idade em horas + 2) * relevância_keyword
    """
    keywords = keywords or []
    keyword_set = {k.lower() for k in keywords}

    for item in items:
        metrics = item.get("metrics", {})
        engagement = _extract_engagement(metrics)
        age = max(1, item.get("content_age_hours", 1))

        title_lower = item.get("title", "").lower()
        summary_lower = item.get("summary", "").lower()
        relevance = 1.0
        for kw in keyword_set:
            if kw in title_lower or kw in summary_lower:
                relevance += 0.5

        item["engagement_score"] = round((engagement / (age + 2)) * relevance, 2)

    return sorted(items, key=lambda x: x.get("engagement_score", 0), reverse=True)

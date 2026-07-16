"""Tests for services/discovery modules."""
import pytest
from unittest.mock import AsyncMock, patch

from services.discovery.youtube import search_youtube
from services.discovery.hackernews import search_hackernews
from services.discovery.aggregator import discover_all


@pytest.mark.asyncio
async def test_search_youtube_returns_normalized_items(monkeypatch):
    monkeypatch.setenv("YOUTUBE_API_KEY", "test-key")

    fake_search = {
        "items": [
            {
                "id": {"videoId": "abc123"},
                "snippet": {
                    "title": "Claude Code tutorial",
                    "channelTitle": "Tech Channel",
                    "publishedAt": "2026-07-10T00:00:00Z",
                    "description": "Learn Claude Code",
                },
            }
        ]
    }
    fake_videos = {
        "items": [
            {
                "id": "abc123",
                "statistics": {"viewCount": "10000", "likeCount": "500", "commentCount": "50"},
                "contentDetails": {"duration": "PT30S"},
            }
        ]
    }

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = [
            AsyncMock(raise_for_status=lambda: None, json=lambda: fake_search),
            AsyncMock(raise_for_status=lambda: None, json=lambda: fake_videos),
        ]
        results = await search_youtube(keywords=["Claude Code"], max_results_per_query=1)

    assert len(results) == 1
    assert results[0]["external_id"] == "abc123"
    assert results[0]["platform"] == "youtube"
    assert results[0]["metrics"]["views"] == 10000
    assert results[0]["metrics"]["likes"] == 500


@pytest.mark.asyncio
async def test_search_youtube_missing_key_returns_empty():
    with patch.dict("os.environ", {"YOUTUBE_API_KEY": ""}):
        results = await search_youtube()
    assert results == []


@pytest.mark.asyncio
async def test_search_hackernews_returns_normalized_items():
    fake_data = {
        "hits": [
            {
                "objectID": "12345",
                "title": "Ask HN: What are you building with AI?",
                "url": "https://example.com",
                "points": 150,
                "num_comments": 40,
                "created_at_i": 1752600000,
                "author": "user1",
            }
        ]
    }

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = AsyncMock(raise_for_status=lambda: None, json=lambda: fake_data)
        results = await search_hackernews(keywords=["AI"], max_results_per_query=1)

    assert len(results) == 1
    assert results[0]["external_id"] == "12345"
    assert results[0]["platform"] == "hackernews"
    assert results[0]["metrics"]["upvotes"] == 150


@pytest.mark.asyncio
async def test_aggregator_deduplicates_by_url():
    youtube_items = [
        {"url": "https://youtube.com/watch?v=abc", "title": "A", "platform": "youtube"},
    ]
    hn_items = [
        {"url": "https://youtube.com/watch?v=abc", "title": "A", "platform": "hackernews"},
        {"url": "https://example.com/xyz", "title": "B", "platform": "hackernews"},
    ]

    with patch("services.discovery.aggregator.search_youtube", new_callable=AsyncMock, return_value=youtube_items), \
         patch("services.discovery.aggregator.search_hackernews", new_callable=AsyncMock, return_value=hn_items):
        results = await discover_all()

    assert len(results) == 2
    urls = [r["url"] for r in results]
    assert "https://youtube.com/watch?v=abc" in urls
    assert "https://example.com/xyz" in urls

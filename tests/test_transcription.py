"""Tests for services/transcription.py"""
import pytest
from unittest.mock import patch

from services.transcription import summarize_source


@pytest.mark.asyncio
async def test_summarize_youtube_uses_transcript():
    source = {
        "platform": "youtube",
        "external_id": "abc123",
        "summary": "fallback summary",
    }

    with patch("services.transcription.YouTubeTranscriptApi.get_transcript", return_value=[
        {"text": "Hello"},
        {"text": "world"},
    ]):
        result = await summarize_source(source)

    assert result == "Hello world"


@pytest.mark.asyncio
async def test_summarize_youtube_fallback_on_error():
    source = {
        "platform": "youtube",
        "external_id": "abc123",
        "summary": "fallback summary",
    }

    with patch("services.transcription.YouTubeTranscriptApi.get_transcript", side_effect=Exception("No transcript")):
        result = await summarize_source(source)

    assert result == "fallback summary"


@pytest.mark.asyncio
async def test_summarize_hackernews_uses_summary():
    source = {
        "platform": "hackernews",
        "summary": "HN story summary",
    }
    result = await summarize_source(source)
    assert result == "HN story summary"

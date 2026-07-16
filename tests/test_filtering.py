"""Tests for services/filtering.py"""
import pytest
from services.filtering import rank_items


def test_rank_items_sorts_by_engagement_and_recency():
    items = [
        {
            "title": "Old but viral",
            "summary": "",
            "metrics": {"views": 1000000},
            "content_age_hours": 100,
        },
        {
            "title": "Fresh small hit",
            "summary": "",
            "metrics": {"views": 10000},
            "content_age_hours": 1,
        },
        {
            "title": "Niche match",
            "summary": "Claude Code vibe coding",
            "metrics": {"views": 50000},
            "content_age_hours": 10,
        },
    ]

    ranked = rank_items(items, keywords=["Claude Code"])

    # Niche match should win due to keyword relevance
    assert ranked[0]["title"] == "Niche match"
    assert ranked[0]["engagement_score"] > 0

    # Fresh small hit should have higher score than old viral due to recency
    fresh_index = next(i for i, r in enumerate(ranked) if r["title"] == "Fresh small hit")
    old_index = next(i for i, r in enumerate(ranked) if r["title"] == "Old but viral")
    assert fresh_index < old_index


def test_rank_items_empty_list():
    assert rank_items([]) == []

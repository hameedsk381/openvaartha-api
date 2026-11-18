import json
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest

from app.services import ai_service


@pytest.mark.asyncio
@pytest.mark.parametrize("model", ["openai/gpt-oss-120b", "llama-3.3-70b-versatile"])
async def test_explainer_uses_groq_and_model_compatible_options(monkeypatch, model):
    monkeypatch.setattr(ai_service.settings, "GROQ_API_KEY", "test-key")
    monkeypatch.setattr(ai_service.settings, "GROQ_MODEL", model)
    response = httpx.Response(
        200,
        json={"choices": [{"message": {"content": " A plain summary. ", "reasoning": "Internal text"}}]},
        request=httpx.Request("POST", "https://api.groq.com/openai/v1/chat/completions"),
    )
    client = MagicMock()
    client.__aenter__.return_value.post = AsyncMock(return_value=response)
    monkeypatch.setattr(ai_service.httpx, "AsyncClient", MagicMock(return_value=client))

    assert await ai_service.explain_article_in_plain_language("Article body.") == "A plain summary."
    request = client.__aenter__.return_value.post.call_args
    assert request.args[0] == "https://api.groq.com/openai/v1/chat/completions"
    assert request.kwargs["json"]["model"] == model
    if model == "openai/gpt-oss-120b":
        assert request.kwargs["json"]["reasoning_effort"] == "low"
        assert request.kwargs["json"]["include_reasoning"] is False
    else:
        assert "reasoning_effort" not in request.kwargs["json"]


@pytest.mark.asyncio
async def test_claim_review_records_model_and_excludes_generated_citations(monkeypatch):
    completion = AsyncMock(return_value=json.dumps({
        "claims": [{"claim": "A proposal was announced.", "assessment": "Needs a source.",
                    "source_url": "https://example.com/unverified"}],
        "bias_rating": "Neutral",
        "confidence_score": 70,
        "summary": "Check the source.",
    }))
    monkeypatch.setattr(ai_service, "_groq_completion", completion)
    monkeypatch.setattr(ai_service.settings, "GROQ_MODEL", "openai/gpt-oss-120b")

    result = await ai_service.analyze_article_facts("A proposal was announced.")
    assert result["model"] == "Groq"
    assert result["model_version"] == "openai/gpt-oss-120b"
    assert result["review_status"] == "automated_unverified"
    assert result["claims"][0]["source_url"] is None

import json
import logging
from typing import List, Optional
import asyncio
from datetime import datetime, timezone
import httpx
from duckduckgo_search import DDGS

from app.config import settings
from app.core.sanitize import sanitize_html, sanitize_text

logger = logging.getLogger(__name__)

# Shared HTTP client for all Groq API calls to prevent connection thrashing
_http_client = httpx.AsyncClient()

_BASE_SYSTEM_PROMPT = """You are a senior news editor at Open Vaartha, an independent, youth-led news initiative
operated by Gen Z — an open news platform built for the liberation of digital spaces.
You have decades of experience crafting compelling, well-structured news articles.

This is an English-only publication. Always write in clear, contemporary English regardless
of the language of any source material — translate and rewrite as needed, never quote or
reproduce source text in another language.

Rules for article structure:
- title: compelling, accurate, not clickbait — front-page quality
- summary: 2-3 punchy sentences that make readers want to read more
- body: {body_rule} Include context, analysis, and background. This is the CORE of the article — do NOT skip or skimp on this.
- tldr: a sharp one-line takeaway
- points: 3-5 bullet-point key facts (as a list of strings)
- timeline: an array of chronological events extracted from the content (e.g., [{{"date": "YYYY-MM-DD", "event": "..."}}]). Leave empty if not applicable.
- explainer: an array of 2-3 FAQ-style questions and answers (e.g., [{{"question": "...", "answer": "..."}}]). Provide deep context.
- tags: an array of 3-5 relevant SEO keywords/tags (e.g., ["politics", "election"]).
- read_time: estimated reading time in minutes as a string (e.g., "4 min").

Additional rules:
- CRITICAL: If source material is provided, you MUST include ALL information, facts, quotes, figures, and context from the source material. Do not omit, truncate, or summarize away any details. The generated article must be comprehensive and cover the given content in its entirety. Do not invent details outside it.
- If only a topic is given, use ONLY facts from the web research context provided. Do NOT invent specific figures, statistics, dates, or locations that are not in the source material. If insufficient data is available, acknowledge the limitation rather than fabricating details.
- Use "said" attribution sparingly and only when justified.
- Write in neutral, third-person journalistic tone.
- Return ONLY valid JSON — no markdown fences, no commentary outside the JSON."""


async def generate_article(
    topic: str,
    source_content: Optional[str] = None,
    style: str = "standard",
    tone: str = "neutral",
    length: str = "standard",
    web_search: bool = True,
) -> Optional[dict]:
    """Generate a complete article draft from a topic prompt using Groq."""
    theme_guide = {
        "standard": "Balanced news reporting with context and analysis.",
        "investigative": "Detail-oriented with background, data points, and sourcing.",
        "briefing": "Concise, scannable format ideal for morning briefings.",
        "opinion": "Analytical with commentary and perspective.",
    }

    style_guide = theme_guide.get(style, theme_guide["standard"])
    tone_guide = {
        "neutral": "Neutral, objective, fact-based journalism.",
        "analytical": "Analytical, data-driven with expert context.",
        "narrative": "Storytelling style with scene-setting and narrative flow.",
    }.get(tone, "Neutral, objective, fact-based journalism.")

    length_rules = {
        "short": "Concise summary format. Cover ALL key facts from the source material in ~3-4 short paragraphs (markdown, no H1). Do not omit crucial details.",
        "standard": "Comprehensive format. You MUST include ALL facts, quotes, and nuances from the source material in rich paragraphs (markdown, no H1). Do not artificially truncate.",
        "long": "Extensive format. Provide incredibly detailed coverage including ALL facts, quotes, data, and nuances from the source material (markdown, no H1).",
    }
    body_rule = length_rules.get(length, length_rules["standard"])

    search_context = ""
    if web_search:
        try:
            loop = asyncio.get_running_loop()
            results = await loop.run_in_executor(
                None, lambda: DDGS().text(topic, max_results=3)
            )
            if results:
                search_context = "\nWeb Research context:\n" + "\n".join(f"- {r['title']}: {r['body']}" for r in results)
        except Exception as e:
            logger.warning(f"Web search failed for topic '{topic}': {e}")

    combined_source = (source_content or "") + "\n" + search_context
    source_block = ""
    if combined_source.strip():
        source_block = f"""
Source material to base the article on (extract facts, quotes, and details from this):
{combined_source.strip()}
"""

    current_date = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    prompt = f"""Today's date and time is: {current_date}
Topic: {topic}
Style: {style_guide}
Tone: {tone_guide}{source_block}

Generate a complete news article with this exact JSON structure:
{{"title": "", "summary": "", "body": "", "tldr": "", "points": [], "category_id": "", "timeline": [], "explainer": []}}"""

    if not settings.GROQ_API_KEY:
        return None

    try:
        headers = {
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": settings.GROQ_MODEL,
            "messages": [
                {"role": "system", "content": _BASE_SYSTEM_PROMPT.format(body_rule=body_rule)},
                {"role": "user", "content": prompt},
            ],
            "response_format": {"type": "json_object"},
            "temperature": settings.AI_TEMPERATURE,
            "max_tokens": settings.AI_MAX_OUTPUT_TOKENS,
        }

        response = await _http_client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=settings.AI_TIMEOUT,
        )
        response.raise_for_status()
        res_data = response.json()

        content = res_data["choices"][0]["message"]["content"]
        if not content:
            return None

        data = json.loads(content.strip())

        if not all(k in data for k in ("title", "summary", "body", "tldr", "points")):
            logger.warning(f"AI response missing keys, got: {list(data.keys())}")
            return None

        def safe_str(val):
            res = sanitize_text(val if val is not None else "")
            return res if res is not None else ""

        def safe_html(val):
            res = sanitize_html(val if val is not None else "")
            return res if res is not None else ""

        pts = data.get("points")
        if not isinstance(pts, list):
            pts = []

        return {
            "title": safe_str(data.get("title")),
            "summary": safe_str(data.get("summary")),
            "body": safe_html(data.get("body")),
            "tldr": safe_str(data.get("tldr")),
            "points": [safe_str(p) for p in pts[:settings.AI_MAX_POINTS] if p],
            "category_id": safe_str(data.get("category_id")),
            "tags": [safe_str(t) for t in (data.get("tags") or []) if t],
            "read_time": safe_str(data.get("read_time")),
            "timeline": [
                {"date": safe_str(t.get("date")), "event": safe_str(t.get("event"))}
                for t in (data.get("timeline") or []) if isinstance(t, dict)
            ],
            "explainer": [
                {"question": safe_str(e.get("question")), "answer": safe_str(e.get("answer"))}
                for e in (data.get("explainer") or []) if isinstance(e, dict)
            ],
        }

    except Exception as e:
        logger.error(f"Groq AI generation failed: {e}", exc_info=True)
        return None


async def classify_category(text: str, categories: List[dict]) -> Optional[str]:
    """Pick the best-fit category_id for a short piece of text (e.g. a
    standalone dispatch with no linked article to derive a category from)."""
    if not settings.GROQ_API_KEY or not categories:
        return None

    options = "\n".join(f'- id "{c["_id"]}": {c["name"]}' for c in categories)
    prompt = f"""Categories:
{options}

Text: "{text.strip()}"

Pick the single best-fit category for this text. Return ONLY JSON: {{"category_id": "<id from the list above>"}}"""

    try:
        headers = {
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": settings.GROQ_MODEL,
            "messages": [
                {"role": "system", "content": "You are a news editor sorting short headlines into existing categories. Always pick one of the exact ids provided, never invent a new one."},
                {"role": "user", "content": prompt},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0,
            "max_tokens": 100,
        }

        response = await _http_client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=settings.AI_TIMEOUT,
        )
        response.raise_for_status()
        res_data = response.json()

        content = res_data["choices"][0]["message"]["content"]
        if not content:
            return None

        data = json.loads(content.strip())
        category_id = data.get("category_id")
        valid_ids = {c["_id"] for c in categories}
        return category_id if category_id in valid_ids else None

    except Exception as e:
        logger.error(f"Groq category classification failed: {e}", exc_info=True)
        return None


async def ai_assist_editor(action: str, text: str, context: Optional[str] = None) -> Optional[dict]:
    """AI assistant tools for existing editorial copy (headlines, improve, shorten, points)."""
    if not settings.GROQ_API_KEY or not text.strip():
        return None

    if action == "headlines":
        system = "You are a senior news editor. Generate 5 compelling, accurate, punchy alternative headlines for the provided text. Return ONLY JSON: {\"headlines\": [\"...\", \"...\", ...]}"
        prompt = f"Article Topic/Summary:\n{text.strip()}\n\nFull Context:\n{context or ''}"
    elif action == "improve":
        system = "You are a senior news editor. Polish and rewrite the provided article copy for maximum clarity, journalistic tone, active voice, and flow while keeping all facts unchanged. Return ONLY JSON: {\"improved_text\": \"...\"}"
        prompt = f"Original Copy:\n{text.strip()}"
    elif action == "shorten":
        system = "You are a senior news editor. Condense the provided text into a tight, scannable version (~50% shorter) without losing any key facts. Return ONLY JSON: {\"shortened_text\": \"...\"}"
        prompt = f"Original Text:\n{text.strip()}"
    elif action == "points":
        system = "You are a news editor. Extract 3-5 sharp, high-impact bullet points summarizing the core facts of the text. Return ONLY JSON: {\"points\": [\"...\", \"...\", ...]}"
        prompt = f"Article Content:\n{text.strip()}"
    else:
        return None

    try:
        headers = {
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": settings.GROQ_MODEL,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.3,
            "max_tokens": 1500,
        }

        response = await _http_client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=settings.AI_TIMEOUT,
        )
        response.raise_for_status()
        res_data = response.json()

        content = res_data["choices"][0]["message"]["content"]
        if not content:
            return None

        return json.loads(content.strip())
    except Exception as e:
        logger.error(f"AI assist failed for action '{action}': {e}", exc_info=True)
        return None


async def generate_digest_overview(articles_data: List[dict]) -> Optional[dict]:
    """Generate a cohesive daily digest overview from a list of articles."""
    if not settings.GROQ_API_KEY or not articles_data:
        return None

    articles_text = "\n\n".join([
        f"Article {i+1}: {a['title']}\nSummary: {a['summary']}" 
        for i, a in enumerate(articles_data)
    ])

    prompt = f"""Based on the following top news articles of the day, generate a compelling, Gen-Z friendly Daily Digest overview.
The overview should read like a morning briefing from a smart, witty editor.
Group related themes if possible, and give a cohesive narrative of what's happening today.

Articles:
{articles_text}

Return ONLY valid JSON in this exact format:
{{"title": "A catchy title for today's digest", "overview": "The generated overview text (can use markdown)"}}"""

    try:
        headers = {
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": settings.GROQ_MODEL,
            "messages": [
                {"role": "system", "content": "You are the editor-in-chief of Open Vaartha, a Gen-Z news platform. Write engaging, crisp, and insightful daily briefings."},
                {"role": "user", "content": prompt},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.7,
            "max_tokens": 1000,
        }

        response = await _http_client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=settings.AI_TIMEOUT,
        )
        response.raise_for_status()
        res_data = response.json()

        content = res_data["choices"][0]["message"]["content"]
        if not content:
            return None

        data = json.loads(content.strip())
        return {
            "title": sanitize_text(data.get("title", "")),
            "overview": sanitize_html(data.get("overview", "")),
        }
    except Exception as e:
        logger.error(f"Groq digest generation failed: {e}", exc_info=True)
        return None


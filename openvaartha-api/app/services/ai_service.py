import json
import logging
from typing import Optional

from google import genai
from google.genai import types

from app.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a senior news editor at Open Vaartha, a premier South Indian news platform.
You have decades of experience crafting compelling, well-structured news articles.
You are fluent in all major South Indian languages (Telugu, Tamil, Kannada, Malayalam) as well as English.

When given source material, write the article in THE SAME LANGUAGE as the source material.
For Telugu content, write in natural, journalistic Telugu that would be at home in Eenadu or Sakshi.
For Tamil content, write in natural Tamil befitting Dinamalar or The Hindu Tamil.
For content in Indian languages, use proper grammar, idioms, and journalistic conventions of that language.
If no source material is given, write in Indian English.

Rules for article structure:
- title: compelling, accurate, not clickbait — front-page quality
- summary: 2-3 punchy sentences that make readers want to read more
- body: 4-6 rich paragraphs of ~60-80 words each (markdown, no H1). Include context, analysis, and background. This is the CORE of the article — do NOT skip or skimp on this.
- tldr: a sharp one-line takeaway
- points: 3-5 bullet-point key facts (as a list of strings)

Additional rules:
- If source material is provided, base the article strictly on it — extract facts, figures, quotes, and context. Do not invent details outside it.
- If only a topic is given, generate realistic specifics (figures, dates, locations from South India) but never fabricate quotes.
- Use "said" attribution sparingly and only when justified.
- Write in neutral, third-person journalistic tone.
- Return ONLY valid JSON — no markdown fences, no commentary outside the JSON."""


async def generate_article(
    topic: str,
    source_content: Optional[str] = None,
    style: str = "standard",
    tone: str = "neutral",
) -> Optional[dict]:
    """Generate a complete article draft from a topic prompt using Gemini."""
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

    source_block = ""
    if source_content and source_content.strip():
        source_block = f"""
Source material to base the article on (extract facts, quotes, and details from this):
{source_content.strip()}
"""

    prompt = f"""Topic: {topic}
Style: {style_guide}
Tone: {tone_guide}{source_block}

Generate a complete news article with this exact JSON structure:
{{"title": "", "summary": "", "body": "", "tldr": "", "points": [], "category_id": ""}}"""

    if not settings.GEMINI_API_KEY:
        return None

    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        response = await client.aio.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",
                temperature=settings.AI_TEMPERATURE,
                max_output_tokens=settings.AI_MAX_OUTPUT_TOKENS,
            ),
        )

        content = response.text
        if not content:
            return None

        data = json.loads(content.strip())

        if not all(k in data for k in ("title", "summary", "body", "tldr", "points")):
            logger.warning(f"AI response missing keys, got: {list(data.keys())}")
            return None

        if isinstance(data.get("points"), str):
            data["points"] = [p.strip().strip("-* ") for p in data["points"].split("\n") if p.strip()]

        return {
            "title": data["title"],
            "summary": data["summary"],
            "body": data["body"],
            "tldr": data["tldr"],
            "points": data["points"][:settings.AI_MAX_POINTS],
            "category_id": data.get("category_id", ""),
        }

    except Exception as e:
        logger.error(f"Gemini AI generation failed: {e}", exc_info=True)
        return None

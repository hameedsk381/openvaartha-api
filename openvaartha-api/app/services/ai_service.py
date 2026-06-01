import json
from typing import Optional

from google import genai
from google.genai import types

from app.config import settings

SYSTEM_PROMPT = """You are a professional South Indian news journalist writing for Open Vaartha.
Write factual, well-structured news articles in Indian English.

Given a topic and optional source material, generate a complete news article with:
- title: compelling but not clickbait
- summary: 2-3 sentences for article cards
- body: 4-6 short paragraphs of ~60 words each (markdown format, no H1)
- tldr: one-line takeaway
- points: 3-5 bullet-point key facts (as a list of strings)
- category_id: "" (leave empty, user chooses)

Rules:
- If source material is provided, base the article strictly on it — extract facts,
  figures, quotes, and context from the source. Do not invent details outside it.
- If only a topic is given, generate realistic specifics (figures, dates, locations
  from South India) but never fabricate quotes.
- Use "said" attribution sparingly and only when justified by source material.
- Write in neutral, third-person journalistic tone.
- Return ONLY valid JSON, no markdown fences, no extra text."""


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
        source_block = f"""Source material to base the article on (extract facts, quotes, and details from this):
{source_content.strip()}

"""

    prompt = f"""Topic: {topic}
Style: {style_guide}
Tone: {tone_guide}
{source_block}Generate a complete news article as JSON with keys: title, summary, body, tldr, points, category_id."""

    if not settings.GEMINI_API_KEY:
        return None

    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        response = await client.aio.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=f"{SYSTEM_PROMPT}\n\n{prompt}",
            config=types.GenerateContentConfig(
                temperature=0.7,
                max_output_tokens=2048,
            ),
        )

        content = response.text
        if not content:
            return None

        # Strip markdown fences if the model wraps JSON in ```json ... ```
        cleaned = content.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[-1]
            cleaned = cleaned.rsplit("```", 1)[0].strip()

        data = json.loads(cleaned)

        if not all(k in data for k in ("title", "summary", "body", "tldr", "points")):
            return None

        if isinstance(data.get("points"), str):
            data["points"] = [p.strip().strip("-* ") for p in data["points"].split("\n") if p.strip()]

        return {
            "title": data["title"],
            "summary": data["summary"],
            "body": data["body"],
            "tldr": data["tldr"],
            "points": data["points"][:8],
            "category_id": data.get("category_id", ""),
        }

    except Exception:
        return None

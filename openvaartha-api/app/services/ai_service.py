import json
from typing import Optional

from openai import AsyncOpenAI

from app.config import settings

SYSTEM_PROMPT = """You are a professional South Indian news journalist writing for Open Vaartha.
Write factual, well-structured news articles in Indian English.

Given a topic, generate a complete news article with:
- title: compelling but not clickbait
- summary: 2-3 sentences for article cards
- body: 4-6 short paragraphs of ~60 words each (markdown format, no H1)
- tldr: one-line takeaway
- points: 3-5 bullet-point key facts (as a list of strings)
- category_id: "" (leave empty, user chooses)

Rules:
- Be specific — use realistic figures, dates, locations from South India
- Never invent quotes. Use "said" attribution sparingly
- Write in neutral, third-person journalistic tone
- Return ONLY valid JSON, no markdown fences, no extra text"""


async def generate_article(
    topic: str,
    style: str = "standard",
    tone: str = "neutral",
) -> Optional[dict]:
    """Generate a complete article draft from a topic prompt using OpenAI."""
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

    prompt = f"""Topic: {topic}
Style: {style_guide}
Tone: {tone_guide}

Generate a complete news article as JSON with keys: title, summary, body, tldr, points, category_id."""

    if not settings.OPENAI_API_KEY:
        return None

    try:
        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
            max_tokens=2048,
        )

        content = response.choices[0].message.content
        if not content:
            return None

        data = json.loads(content)

        # Ensure minimum required fields
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

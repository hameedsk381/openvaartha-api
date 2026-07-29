import json
import logging
from typing import Optional
import google.generativeai as genai

from app.config import settings

logger = logging.getLogger(__name__)


def _init_gemini():
    """Initialize the Gemini client with the API key from settings."""
    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY is not set. Gemini features will be disabled.")
        return False
    genai.configure(api_key=settings.GEMINI_API_KEY)
    return True


async def analyze_article_facts(article_text: str) -> Optional[dict]:
    """
    Analyzes an article's text using Gemini to extract claims, assess bias,
    and output a structured fact-check JSON.
    """
    if not _init_gemini():
        return None

    try:
        model = genai.GenerativeModel(
            model_name=settings.GEMINI_MODEL,
            generation_config={"response_mime_type": "application/json"}
        )
        
        prompt = f"""
        You are an expert, impartial fact-checker and journalist.
        Please analyze the following article text and provide a structured fact-check and bias report.

        Article Text:
        {article_text}

        Extract exactly 3 to 5 distinct, major factual claims made in the text.
        For each claim, provide a brief assessment (e.g. "Supported by general consensus", "Disputed", "Needs more context", "True"). 
        Provide a hypothetical or real source URL if one exists, otherwise null.

        Also assess the overall bias rating of the text (e.g., "Neutral", "Left-leaning", "Right-leaning", "Sensationalist", "Pro-establishment").
        Assign a confidence score (0-100) reflecting how confident you are in your overall assessment.
        Finally, write a 1-2 sentence summary of your findings.

        Return ONLY a JSON object exactly matching this schema, with no additional text or formatting:
        {{
            "claims": [
                {{
                    "claim": "string",
                    "assessment": "string",
                    "source_url": "string or null"
                }}
            ],
            "bias_rating": "string",
            "confidence_score": 0,
            "summary": "string"
        }}
        """

        response = await model.generate_content_async(prompt)
        
        if not response.text:
            return None
            
        data = json.loads(response.text)
        
        # Ensure it has the right keys
        if "claims" not in data or "bias_rating" not in data or "summary" not in data:
            logger.warning(f"Gemini response missing keys, got: {list(data.keys())}")
            return None
            
        return data

    except Exception as e:
        logger.error(f"Gemini fact checking failed: {e}", exc_info=True)
        return None

async def generate_embedding(text: str) -> Optional[list[float]]:
    """Generates a text embedding using Gemini."""
    if not _init_gemini():
        return None
    try:
        result = await genai.embed_content_async(
            model="models/text-embedding-004",
            content=text,
            task_type="retrieval_document"
        )
        return result['embedding']
    except Exception as e:
        logger.error(f"Gemini embedding failed: {e}", exc_info=True)
        return None

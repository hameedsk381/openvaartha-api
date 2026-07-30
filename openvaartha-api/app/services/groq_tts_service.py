import os
import httpx
from fastapi import HTTPException

class GroqTTSService:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        self.api_url = "https://api.groq.com/openai/v1/audio/speech"

    async def generate_speech(self, text: str) -> httpx.Response:
        if not self.api_key:
            raise HTTPException(status_code=500, detail="GROQ_API_KEY is not set")
            
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        # Max character limit for most TTS APIs is around 4096. 
        # We might need to chunk it, but for a prototype, let's truncate or just send it.
        # Groq might have a higher limit, but let's be safe.
        safe_text = text[:4000]
        
        payload = {
            "model": "canopylabs/orpheus-v1-english", # Standard Groq TTS model
            "input": safe_text,
            "voice": "troy" # Using an english voice for now
        }
        
        # Using httpx for async streaming support
        client = httpx.AsyncClient()
        response = await client.post(
            self.api_url, 
            json=payload, 
            headers=headers,
            timeout=30.0
        )
        
        if response.status_code != 200:
            print(f"Groq TTS Error: {response.text}")
            raise HTTPException(status_code=response.status_code, detail="TTS generation failed")
            
        return response

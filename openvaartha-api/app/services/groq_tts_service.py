import asyncio
import base64
import hashlib
import io
import logging
import os
import struct

import httpx
from fastapi import HTTPException

from app.core.cache import get_redis

logger = logging.getLogger(__name__)

_TTS_CACHE_TTL = 60 * 60 * 24 * 7  # 7 days


class GroqTTSService:
    """TTS via Groq's Orpheus model.

    Orpheus has a hard 200-character input limit and only outputs
    44-byte-header PCM WAV. Long articles are split into <=200-char chunks,
    each rendered separately, and the WAV bodies are concatenated into one
    streamable file (header bytes from the first chunk, data appended).
    """

    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        self.api_url = "https://api.groq.com/openai/v1/audio/speech"
        self.model = "canopylabs/orpheus-v1-english"
        self.voice = "troy"
        self.chunk_size = 200
        self.max_retries = 3
        self.retry_delay = 2.0  # seconds; doubles on each retry

    async def _generate_chunk(self, client: httpx.AsyncClient, text: str) -> bytes:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "input": text,
            "voice": self.voice,
            "response_format": "wav",
        }
        for attempt in range(self.max_retries):
            response = await client.post(
                self.api_url,
                json=payload,
                headers=headers,
                timeout=60.0,
            )
            if response.status_code == 200:
                return response.content

            # 429 (rate limit) and 5xx (transient) get a short backoff; 4xx
            # errors are permanent so fail fast.
            retryable = response.status_code == 429 or response.status_code >= 500
            if retryable and attempt < self.max_retries - 1:
                delay = self.retry_delay * (2 ** attempt)
                logger.warning(
                    "Groq TTS retry %s/%s after %s (status %s)",
                    attempt + 1, self.max_retries, delay, response.status_code,
                )
                await asyncio.sleep(delay)
                continue

            raise HTTPException(
                status_code=response.status_code,
                detail=f"TTS generation failed: {response.text[:200]}",
            )
        raise HTTPException(status_code=502, detail="TTS generation failed")

    def _chunk_text(self, text: str) -> list[str]:
        """Split into <=200-char pieces on whitespace where possible."""
        text = text.strip()
        chunks: list[str] = []
        current = ""
        for word in text.split():
            # A single word longer than the budget gets hard-split.
            while len(word) > self.chunk_size:
                if current:
                    chunks.append(current)
                    current = ""
                chunks.append(word[: self.chunk_size])
                word = word[self.chunk_size :]
            if len(current) + len(word) + 1 > self.chunk_size:
                if current:
                    chunks.append(current)
                current = word
            else:
                current = f"{current} {word}".strip() if current else word
        if current:
            chunks.append(current)
        return chunks or [""]

    @staticmethod
    def _merge_wavs(files: list[bytes]) -> bytes:
        """Concatenate PCM WAVs (44-byte header each) into a single valid WAV.
        Keeps the first file's header; appends the raw data of the rest and
        patches the RIFF/data sizes."""
        if not files:
            return b""
        if len(files) == 1:
            return files[0]

        header_size = 44
        data_payloads = [f[header_size:] for f in files]
        total_data = sum(len(p) for p in data_payloads)

        head = bytearray(files[0][:header_size])
        riff_size = total_data + 36  # 4 (WAVE) + 24 (fmt) + 8 (data hdr) + data
        struct.pack_into("<I", head, 4, riff_size)
        struct.pack_into("<I", head, 40, total_data)

        out = io.BytesIO()
        out.write(bytes(head))
        for payload in data_payloads:
            out.write(payload)
        return out.getvalue()

    async def generate_speech(self, text: str) -> bytes:
        if not self.api_key:
            raise HTTPException(status_code=500, detail="GROQ_API_KEY is not set")

        # Identical text (same article, unchanged body) reuses the rendered
        # audio instead of re-billing Groq on every play.
        key = "tts:" + hashlib.sha256(text.encode()).hexdigest()
        redis = await get_redis()
        if redis is not None:
            try:
                cached = await redis.get(key)
                if cached:
                    return base64.b64decode(cached)
            except Exception:
                pass  # cache is best-effort; fall through to generation

        chunks = self._chunk_text(text)
        semaphore = asyncio.Semaphore(2)  # keep burst low to dodge rate limits

        async def _render(chunk: str) -> bytes:
            async with semaphore:
                async with httpx.AsyncClient() as client:
                    return await self._generate_chunk(client, chunk)

        wavs = await asyncio.gather(*(_render(chunk) for chunk in chunks))
        merged = self._merge_wavs(wavs)

        if redis is not None:
            try:
                await redis.set(key, base64.b64encode(merged).decode(), ex=_TTS_CACHE_TTL)
            except Exception:
                pass
        return merged
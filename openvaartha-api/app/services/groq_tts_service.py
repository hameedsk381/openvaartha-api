import asyncio
import io
import os
import struct

import httpx
from fastapi import HTTPException


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
        response = await client.post(
            self.api_url,
            json=payload,
            headers=headers,
            timeout=60.0,
        )
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail=f"TTS generation failed: {response.text[:200]}",
            )
        return response.content

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

        chunks = self._chunk_text(text)
        semaphore = asyncio.Semaphore(3)  # cap concurrent renders to dodge rate limits

        async def _render(chunk: str) -> bytes:
            async with semaphore:
                async with httpx.AsyncClient() as client:
                    return await self._generate_chunk(client, chunk)

        wavs = await asyncio.gather(*(_render(chunk) for chunk in chunks))
        return self._merge_wavs(wavs)
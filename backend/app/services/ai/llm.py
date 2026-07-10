from collections.abc import AsyncGenerator

from google import genai

from app.core.config import settings

_client = genai.Client(api_key=settings.GOOGLE_GENERATIVE_AI_API_KEY)


def _build_contents(messages: list[dict]) -> list[dict]:
    """Convert UI messages ({role, parts:[{text}]}) to Gemini contents."""
    contents = []
    for m in messages:
        text = " ".join(
            p.get("text", "") for p in m.get("parts", []) if p.get("type") == "text"
        )
        if not text:
            continue
        role = "user" if m["role"] == "user" else "model"
        contents.append({"role": role, "parts": [{"text": text}]})
    return contents


async def stream_answer(system_prompt: str, messages: list[dict]) -> AsyncGenerator[str, None]:
    """Yield text tokens as they stream from Gemini."""
    stream = await _client.aio.models.generate_content_stream(
        model=settings.CHAT_MODEL,
        contents=_build_contents(messages),
        config={"system_instruction": system_prompt},
    )
    async for chunk in stream:
        if chunk.text:
            yield chunk.text
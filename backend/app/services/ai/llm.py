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


class LLMStreamError(Exception):
    """Raised when the model call fails or returns nothing usable."""


async def stream_answer(system_prompt: str, messages: list[dict]) -> AsyncGenerator[str, None]:
    """Yield text tokens as they stream from Gemini.

    Raises LLMStreamError on any failure so callers can send a clean
    fallback to the client instead of the connection just dying.
    """
    contents = _build_contents(messages)
    if not contents:
        raise LLMStreamError("No usable message content to send to the model")

    got_any_text = False
    try:
        stream = await _client.aio.models.generate_content_stream(
            model=settings.CHAT_MODEL,
            contents=contents,
            config={"system_instruction": system_prompt},
        )
        async for chunk in stream:
            # A chunk can be blocked/empty (safety filters, no candidates, etc.)
            # without raising — check explicitly rather than assuming chunk.text exists.
            text = getattr(chunk, "text", None)
            if text:
                got_any_text = True
                yield text
    except Exception as e:  # noqa: BLE001
        print("Gemini stream error:", repr(e))
        raise LLMStreamError(str(e)) from e

    if not got_any_text:
        # Stream completed with zero content — likely blocked by safety filters
        # or a genuinely empty response. Treat as a failure so the caller can
        # show something instead of leaving a blank bubble.
        raise LLMStreamError("Model returned an empty response")
from collections.abc import AsyncGenerator

import ollama

from app.core.config import settings

_client = ollama.AsyncClient(host=settings.OLLAMA_BASE_URL)


def _build_messages(system_prompt: str, messages: list[dict]) -> list[dict]:
    """Convert UI messages ({role, parts:[{text}]}) into Ollama chat messages."""
    out = [{"role": "system", "content": system_prompt}]
    for m in messages:
        text = " ".join(
            p.get("text", "") for p in m.get("parts", []) if p.get("type") == "text"
        )
        if not text:
            continue
        role = "user" if m["role"] == "user" else "assistant"
        out.append({"role": role, "content": text})
    return out


class LLMStreamError(Exception):
    """Raised when the model call fails or returns nothing usable."""


async def stream_answer(system_prompt: str, messages: list[dict]) -> AsyncGenerator[str, None]:
    """Yield text tokens as they stream from the local Ollama model."""
    chat_messages = _build_messages(system_prompt, messages)
    if len(chat_messages) <= 1:
        raise LLMStreamError("No usable message content to send to the model")

    got_any_text = False
    try:
        stream = await _client.chat(
            model=settings.CHAT_MODEL,
            messages=chat_messages,
            stream=True,
        )
        async for chunk in stream:
            text = chunk.get("message", {}).get("content")
            if text:
                got_any_text = True
                yield text
    except Exception as e:  # noqa: BLE001
        print("Ollama stream error:", repr(e))
        raise LLMStreamError(str(e)) from e

    if not got_any_text:
        raise LLMStreamError("Model returned an empty response")
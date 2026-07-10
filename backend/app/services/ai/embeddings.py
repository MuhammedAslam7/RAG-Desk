from google import genai

from app.core.config import settings

_client = genai.Client(api_key=settings.GOOGLE_GENERATIVE_AI_API_KEY)


async def embed_query(text: str) -> list[float]:
    """Embed a search query (RETRIEVAL_QUERY task type)."""
    result = await _client.aio.models.embed_content(
        model=settings.EMBED_MODEL,
        contents=text,
        config={"task_type": "RETRIEVAL_QUERY",
                "output_dimensionality": settings.EMBED_DIM},
    )
    return list(result.embeddings[0].values)


async def embed_document(text: str) -> list[float]:
    """Embed a document chunk (RETRIEVAL_DOCUMENT task type)."""
    result = await _client.aio.models.embed_content(
        model=settings.EMBED_MODEL,
        contents=text,
        config={"task_type": "RETRIEVAL_DOCUMENT",
                "output_dimensionality": settings.EMBED_DIM},
    )
    return list(result.embeddings[0].values)
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import settings
from app.services.ai.embeddings import EmbeddingRateLimitError

app = FastAPI(title="AI Support Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN, settings.ADMIN_FRONTEND_ORIGIN],  # tighten in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/static", StaticFiles(directory="app/static"), name="static")
app.include_router(api_router)


@app.exception_handler(EmbeddingRateLimitError)
async def _embedding_rate_limit_handler(request, exc: EmbeddingRateLimitError) -> JSONResponse:
    """The embedding API stayed rate-limited even after internal retries; tell
    the user to wait instead of returning a raw 500 stack trace."""
    seconds = max(1, round(exc.retry_after)) if exc.retry_after else 60
    return JSONResponse(
        status_code=429,
        content={
            "detail": (
                f"The embedding service is temporarily rate-limited. "
                f"Please wait about {seconds}s and try again — your file was not saved. "
                f"If this keeps happening, check your API plan's request quota."
            )
        },
    )


@app.get("/health")
async def health():
    return {"ok": True}


@app.get("/health")
async def health():
    return {"ok": True}
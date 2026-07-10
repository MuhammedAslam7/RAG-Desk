import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import Organization
from app.services.ai.llm import stream_answer
from app.services.facts.service import get_active_facts
from app.services.rag.prompt import build_system_prompt
from app.services.rag.retrieval import (
    get_relevant_chunks,
    rank_by_relevance_and_recency,
)

router = APIRouter()


class WidgetChatRequest(BaseModel):
    org: str  # organization slug from data-org
    message: str


@router.post("/chat")
async def widget_chat(
    body: WidgetChatRequest,
    db: AsyncSession = Depends(get_db),
):
    org = (
        await db.execute(
            select(Organization).where(Organization.slug == body.org)
        )
    ).scalars().first()

    if org is None:
        raise HTTPException(status_code=404, detail="Unknown organization")

    ranked = rank_by_relevance_and_recency(
        await get_relevant_chunks(db, body.message, org.id)
    )

    facts = await get_active_facts(db, org.id)
    system_prompt = build_system_prompt(ranked, facts)

    messages = [
        {
            "role": "user",
            "parts": [
                {
                    "type": "text",
                    "text": body.message,
                }
            ],
        }
    ]

    async def event_stream():
        async for token in stream_answer(system_prompt, messages):
            yield f"data: {json.dumps({'text': token})}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
    )
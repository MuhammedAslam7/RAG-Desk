from fastapi import APIRouter

from app.api.v1.endpoints import chat, facts, knowledge, widget, onboarding

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(facts.router, prefix="/facts", tags=["facts"])
api_router.include_router(knowledge.router, prefix="/knowledge", tags=["knowledge"])
api_router.include_router(widget.router, prefix="/widget", tags=["widget"])
api_router.include_router(onboarding.router, prefix="/org", tags=["org"])
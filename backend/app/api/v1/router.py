# backend/app/api/v1/router.py
from fastapi import APIRouter

from app.api.v1.endpoints import chat, dashboard, facts, knowledge, onboarding, settings, team, widget

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(facts.router, prefix="/facts", tags=["facts"])
api_router.include_router(knowledge.router, prefix="/knowledge", tags=["knowledge"])
api_router.include_router(widget.router, prefix="/widget", tags=["widget"])
api_router.include_router(onboarding.router, prefix="/org", tags=["org"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(team.router, prefix="/team", tags=["team"])
# backend/app/api/v1/endpoints/dashboard.py
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_org
from app.core.database import get_db
from app.models import (
    Chat,
    Fact,
    Invitation,
    KnowledgeChunk,
    KnowledgeSource,
    Message,
    Organization,
    OrganizationSettings,
    User,
)

router = APIRouter()


@router.get("/summary")
async def dashboard_summary(
    user: User = Depends(require_org),
    db: AsyncSession = Depends(get_db),
):
    org_id = user.organizationId

    total_conversations = (
        await db.execute(select(func.count(Chat.id)).where(Chat.organizationId == org_id))
    ).scalar_one()

    total_visitors = (
        await db.execute(
            select(func.count(func.distinct(Chat.visitorId))).where(
                Chat.organizationId == org_id,
                Chat.source == "widget",
                Chat.visitorId.isnot(None),
            )
        )
    ).scalar_one()

    ai_responses = (
        await db.execute(
            select(func.count(Message.id))
            .join(Chat, Chat.id == Message.chatId)
            .where(Chat.organizationId == org_id, Message.sender == "ai")
        )
    ).scalar_one()

    sources_by_type_rows = (
        await db.execute(
            select(KnowledgeSource.type, func.count(KnowledgeSource.id))
            .where(KnowledgeSource.organizationId == org_id)
            .group_by(KnowledgeSource.type)
        )
    ).all()

    total_chunks = (
        await db.execute(
            select(func.count(KnowledgeChunk.id)).where(KnowledgeChunk.organizationId == org_id)
        )
    ).scalar_one()

    total_facts = (
        await db.execute(
            select(func.count(Fact.id)).where(
                Fact.organizationId == org_id, Fact.active.is_(True)
            )
        )
    ).scalar_one()

    team_count = (
        await db.execute(select(func.count(User.id)).where(User.organizationId == org_id))
    ).scalar_one()

    pending_invites = (
        await db.execute(
            select(func.count(Invitation.id)).where(
                Invitation.organizationId == org_id, Invitation.status == "pending"
            )
        )
    ).scalar_one()

    # Last 7 days of conversation volume, bucketed by day
    since = datetime.now(timezone.utc) - timedelta(days=7)
    daily_rows = (
        await db.execute(
            select(func.date(Chat.createdAt), func.count(Chat.id))
            .where(Chat.organizationId == org_id, Chat.createdAt >= since)
            .group_by(func.date(Chat.createdAt))
            .order_by(func.date(Chat.createdAt))
        )
    ).all()
    daily_conversations = [{"date": str(d), "conversations": c} for d, c in daily_rows]

    last_source_created = (
        await db.execute(
            select(KnowledgeSource.createdAt)
            .where(KnowledgeSource.organizationId == org_id)
            .order_by(KnowledgeSource.createdAt.desc())
            .limit(1)
        )
    ).scalar_one_or_none()

    recent_chats = (
        await db.execute(
            select(Chat)
            .where(Chat.organizationId == org_id, Chat.source == "widget")
            .order_by(Chat.createdAt.desc())
            .limit(5)
        )
    ).scalars().all()

    recent_conversations = []
    for c in recent_chats:
        last_msg = (
            await db.execute(
                select(Message)
                .where(Message.chatId == c.id)
                .order_by(Message.createdAt.desc())
                .limit(1)
            )
        ).scalars().first()
        recent_conversations.append(
            {
                "chatId": c.id,
                "visitorId": c.visitorId,
                "lastMessage": last_msg.content if last_msg else None,
                "lastSender": last_msg.sender if last_msg else None,
                "createdAt": c.createdAt,
            }
        )

    recent_sources = (
        await db.execute(
            select(KnowledgeSource)
            .where(KnowledgeSource.organizationId == org_id)
            .order_by(KnowledgeSource.createdAt.desc())
            .limit(6)
        )
    ).scalars().all()

    org = await db.get(Organization, org_id)
    settings = (
        await db.execute(
            select(OrganizationSettings).where(OrganizationSettings.organizationId == org_id)
        )
    ).scalars().first()

    return {
        "orgName": org.name if org else "",
        "kpis": {
            "totalConversations": total_conversations,
            "totalVisitors": total_visitors,
            "aiResponses": ai_responses,
            "knowledgeChunks": total_chunks,
            "teamMembers": team_count,
            "pendingInvitations": pending_invites,
            "facts": total_facts,
        },
        "sourcesByType": {t: n for t, n in sources_by_type_rows},
        "dailyConversations": daily_conversations,
        "lastKnowledgeUpdate": last_source_created,
        "recentConversations": recent_conversations,
        "recentSources": [
            {"id": s.id, "title": s.title, "type": s.type, "createdAt": s.createdAt}
            for s in recent_sources
        ],
        "widget": {
            "status": org.status if org else "active",
            "color": settings.widgetColor if settings else None,
            "greeting": settings.widgetGreeting if settings else None,
            "position": settings.widgetPosition if settings else "bottom-right",
            "allowedDomains": settings.allowedDomains if settings else None,
        },
    }
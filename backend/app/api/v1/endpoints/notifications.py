from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_org
from app.core.database import get_db
from app.models import Notification, User
from app.services.realtime import sse_stream, user_channel

router = APIRouter()


@router.get("/events")
async def notification_events(
    user: User = Depends(require_org),
):
    """SSE stream of real-time notifications for the current user.

    Emits ``notification`` events (with the new unread count and payload)
    whenever any teammate adds knowledge. EventSource reconnects on drop.
    """
    return StreamingResponse(
        sse_stream(user_channel(user.id)),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("")
async def list_notifications(
    user: User = Depends(require_org),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """List the current user's notifications newest-first, plus unread count."""
    actor_name = (
        select(func.coalesce(User.name, User.email))
        .where(User.id == Notification.actorId)
        .scalar_subquery()
    )
    total = (
        await db.execute(
            select(func.count(Notification.id)).where(Notification.userId == user.id)
        )
    ).scalar_one()
    unread = (
        await db.execute(
            select(func.count(Notification.id)).where(
                Notification.userId == user.id, Notification.read.is_(False)
            )
        )
    ).scalar_one()
    rows = (
        await db.execute(
            select(Notification, actor_name.label("actorName"))
            .where(Notification.userId == user.id)
            .order_by(Notification.createdAt.desc())
            .limit(limit)
            .offset(offset)
        )
    ).all()
    return {
        "items": [
            {
                "id": n.id,
                "type": n.type,
                "title": n.title,
                "message": n.message,
                "sourceId": n.sourceId,
                "read": n.read,
                "createdAt": n.createdAt,
                "actorName": actor_name_value,
            }
            for n, actor_name_value in rows
        ],
        "total": total,
        "unreadCount": unread,
    }


@router.get("/unread-count")
async def unread_count(
    user: User = Depends(require_org),
    db: AsyncSession = Depends(get_db),
):
    unread = (
        await db.execute(
            select(func.count(Notification.id)).where(
                Notification.userId == user.id, Notification.read.is_(False)
            )
        )
    ).scalar_one()
    return {"unreadCount": unread}


@router.post("/read-all")
async def mark_all_read(
    user: User = Depends(require_org),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(Notification)
        .where(Notification.userId == user.id, Notification.read.is_(False))
        .values(read=True)
    )
    await db.commit()
    return {"success": True}


@router.post("/{notification_id}/read")
async def mark_read(
    notification_id: str,
    user: User = Depends(require_org),
    db: AsyncSession = Depends(get_db),
):
    n = (
        await db.execute(
            select(Notification).where(
                Notification.id == notification_id,
                Notification.userId == user.id,
            )
        )
    ).scalars().first()
    if n is None:
        raise HTTPException(404, "Notification not found")
    n.read = True
    await db.commit()
    return {"success": True}

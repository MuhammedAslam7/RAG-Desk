"""Org-wide notifications (e.g. a teammate added a knowledge source).

Each notification row targets one user; ``notify_org`` fans a single event
out to every member of an organization. Recipients with an open SSE stream
(``GET /api/v1/notifications/events``) get the payload pushed immediately, so
their unread badge updates without a page refresh.
"""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Notification, User
from app.services.realtime import hub, user_channel


async def notify_org(
    db: AsyncSession,
    *,
    org_id: str,
    actor_id: str | None,
    type_: str = "knowledge",
    title: str,
    message: str | None = None,
    source_id: str | None = None,
) -> None:
    """Create a notification for every user in the org and push a real-time
    event to each recipient (with their fresh unread count)."""
    user_ids = (
        await db.execute(select(User.id).where(User.organizationId == org_id))
    ).scalars().all()
    if not user_ids:
        return

    actor_name = None
    if actor_id:
        actor_name = (
            await db.execute(
                select(func.coalesce(User.name, User.email)).where(User.id == actor_id)
            )
        ).scalar_one_or_none()

    notifications = [
        Notification(
            organizationId=org_id,
            userId=uid,
            actorId=actor_id,
            type=type_,
            title=title,
            message=message,
            sourceId=source_id,
        )
        for uid in user_ids
    ]
    db.add_all(notifications)
    await db.commit()

    for n in notifications:
        unread = (
            await db.execute(
                select(func.count(Notification.id)).where(
                    Notification.userId == n.userId,
                    Notification.read.is_(False),
                )
            )
        ).scalar_one()
        await hub.publish(
            user_channel(n.userId),
            {
                "type": "notification",
                "userId": n.userId,
                "unreadCount": unread,
                "notification": {
                    "id": n.id,
                    "type": n.type,
                    "title": n.title,
                    "message": n.message,
                    "sourceId": n.sourceId,
                    "read": n.read,
                    "createdAt": n.createdAt.isoformat() if n.createdAt else None,
                    "actorName": actor_name,
                },
            },
        )

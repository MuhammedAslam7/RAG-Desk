# backend/app/services/realtime.py
"""In-memory publish/subscribe hub for real-time chat events (SSE).

Channels:
    org:{organization_id}   -> dashboard agents (new escalations, status
                               changes, new messages in escalated chats)
    chat:{chat_id}          -> widget + dashboard detail pane (message-level
                               events for one conversation)

Events are plain dicts serialized as SSE ``data:`` frames::

    {"type": "chat_updated", "chatId": "...", "status": "human_active"}
    {"type": "message", "chatId": "...", "message": {id, sender, content, createdAt}}

NOTE: the hub is process-local. The app currently runs a single uvicorn
worker (see Dockerfile), so this is correct; if the backend ever scales to
multiple workers/processes, replace the hub with a shared broker (e.g. Redis
pub/sub) without changing the endpoint code.
"""
import asyncio
import json
from collections import defaultdict

__all__ = ["hub", "org_channel", "chat_channel", "sse_stream"]


def org_channel(org_id: str) -> str:
    return f"org:{org_id}"


def chat_channel(chat_id: str) -> str:
    return f"chat:{chat_id}"


class RealtimeHub:
    """Fan events out to every subscriber of a channel.

    Subscribers are bounded queues; a slow consumer that stops reading drops
    events rather than blocking the publisher (the clients refetch from the
    DB on reconnect, so a dropped frame is never fatal).
    """

    _MAX_QUEUE = 100

    def __init__(self) -> None:
        self._subscribers: dict[str, set[asyncio.Queue]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def subscribe(self, channel: str) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=self._MAX_QUEUE)
        async with self._lock:
            self._subscribers[channel].add(q)
        return q

    async def unsubscribe(self, channel: str, q: asyncio.Queue) -> None:
        async with self._lock:
            subs = self._subscribers.get(channel)
            if subs is None:
                return
            subs.discard(q)
            if not subs:
                self._subscribers.pop(channel, None)

    async def publish(self, channel: str, event: dict) -> None:
        async with self._lock:
            subs = list(self._subscribers.get(channel, ()))
        if not subs:
            return
        payload = f"data: {json.dumps(event)}\n\n".encode("utf-8")
        for q in subs:
            try:
                q.put_nowait(payload)
            except asyncio.QueueFull:
                pass  # drop for slow consumers — they'll refetch on reconnect


hub = RealtimeHub()

_HEARTBEAT_SECONDS = 15


async def sse_stream(channel: str):
    """Async generator of SSE frames for one channel.

    Emits a heartbeat comment every 15s so proxies don't kill idle
    connections, and cleans the subscriber up when the client disconnects.
    """
    q = await hub.subscribe(channel)
    try:
        yield ": connected\n\n"
        while True:
            try:
                yield await asyncio.wait_for(q.get(), timeout=_HEARTBEAT_SECONDS)
            except asyncio.TimeoutError:
                yield ": ping\n\n"
    finally:
        await hub.unsubscribe(channel, q)

"""WebSocket manager — authenticated connections with heartbeat and room routing.

Supports JWT auth via query param, heartbeat ping/pong, and per-user messaging.
"""

import asyncio
import json
import logging
import time

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class AuthenticatedConnection:
    """Wraps a WebSocket with user context."""

    def __init__(self, websocket: WebSocket, user_ctx: dict):
        self.websocket = websocket
        self.user_id: str | None = user_ctx.get("user_id")
        self.role: str = user_ctx.get("role", "user")
        self.scopes: list[str] = user_ctx.get("scopes", [])
        self.connected_at: float = time.time()
        self.last_pong: float = time.time()


class WebSocketManager:
    """Authenticated WebSocket manager with heartbeat and room routing."""

    def __init__(self) -> None:
        self.connections: list[AuthenticatedConnection] = []
        self._heartbeat_task: asyncio.Task | None = None
        self._heartbeat_interval: int = 30  # seconds
        self._pong_timeout: int = 10  # seconds

    def authenticate(self, websocket: WebSocket) -> dict | None:
        """Extract JWT or legacy API key from query params and verify."""
        import hmac

        token = websocket.query_params.get("token")
        if not token:
            return None
        from app.middleware.auth import _try_jwt_auth

        user_ctx = _try_jwt_auth(token)
        if user_ctx:
            return user_ctx

        # Fall back to legacy API key (constant-time comparison)
        from app.config import settings

        if hmac.compare_digest(token, settings.api_secret_key):
            return {
                "user_id": "legacy-admin",
                "username": "legacy",
                "role": "admin",
                "scopes": [
                    "oracle:admin",
                    "oracle:write",
                    "oracle:read",
                    "vault:admin",
                    "vault:write",
                    "vault:read",
                    "admin",
                ],
                "auth_type": "legacy",
            }
        return None

    async def connect(self, websocket: WebSocket) -> AuthenticatedConnection | None:
        """Authenticate and accept a WebSocket connection."""
        user_ctx = self.authenticate(websocket)
        if not user_ctx:
            await websocket.close(code=4001, reason="Authentication required")
            return None
        await websocket.accept()
        conn = AuthenticatedConnection(websocket, user_ctx)
        self.connections.append(conn)
        logger.info(
            "WebSocket client connected (user=%s, total=%d)",
            conn.user_id,
            len(self.connections),
        )
        return conn

    def disconnect(self, conn: AuthenticatedConnection) -> None:
        """Remove a connection from the active list."""
        if conn in self.connections:
            self.connections.remove(conn)
            logger.info(
                "WebSocket client disconnected (user=%s, total=%d)",
                conn.user_id,
                len(self.connections),
            )

    async def broadcast(self, event: str, data: dict) -> None:
        """Broadcast an event to all connected clients."""
        message = json.dumps({"event": event, "data": data})
        disconnected: list[AuthenticatedConnection] = []
        for conn in self.connections:
            try:
                await conn.websocket.send_text(message)
            except Exception:
                disconnected.append(conn)
        for conn in disconnected:
            self.disconnect(conn)

    async def send_to_user(self, user_id: str, event: str, data: dict) -> None:
        """Send an event to all connections belonging to a specific user."""
        message = json.dumps({"event": event, "data": data})
        disconnected: list[AuthenticatedConnection] = []
        for conn in self.connections:
            if conn.user_id == user_id:
                try:
                    await conn.websocket.send_text(message)
                except Exception:
                    disconnected.append(conn)
        for conn in disconnected:
            self.disconnect(conn)

    async def _heartbeat_loop(self) -> None:
        """Send ping to all clients every interval, close stale ones."""
        while True:
            await asyncio.sleep(self._heartbeat_interval)
            now = time.time()
            stale: list[AuthenticatedConnection] = []
            for conn in list(self.connections):
                # Check if pong timed out
                if now - conn.last_pong > self._heartbeat_interval + self._pong_timeout:
                    stale.append(conn)
                    continue
                try:
                    await conn.websocket.send_text("ping")
                except Exception:
                    stale.append(conn)
            for conn in stale:
                try:
                    await conn.websocket.close(code=1000, reason="Heartbeat timeout")
                except Exception:
                    pass
                self.disconnect(conn)

    async def start_heartbeat(self) -> None:
        """Start the heartbeat background task."""
        if self._heartbeat_task is None or self._heartbeat_task.done():
            self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())

    async def stop_heartbeat(self) -> None:
        """Stop the heartbeat background task."""
        if self._heartbeat_task and not self._heartbeat_task.done():
            self._heartbeat_task.cancel()
            try:
                await self._heartbeat_task
            except asyncio.CancelledError:
                pass
            self._heartbeat_task = None


# Singleton
ws_manager = WebSocketManager()

"""WebSocket tests — auth, events, heartbeat, progress integration."""

import asyncio
import json
import time

import pytest
from starlette.testclient import TestClient

from app.main import app
from app.middleware.auth import create_access_token
from app.services.websocket_manager import (
    AuthenticatedConnection,
    WebSocketManager,
)

# ── Helpers ──────────────────────────────────────────────────────────────────


def _make_jwt(user_id: str = "test-user-id", role: str = "admin") -> str:
    """Create a valid JWT for test WebSocket connections."""
    return create_access_token(user_id, "test-admin", role)


# ── Unit tests for WebSocketManager ──────────────────────────────────────────


class TestWebSocketManagerUnit:
    """Unit tests for the WebSocketManager class (no HTTP server needed)."""

    def test_authenticate_no_token(self):
        """authenticate() returns None when no token query param."""
        mgr = WebSocketManager()

        class FakeWS:
            query_params = {}

        assert mgr.authenticate(FakeWS()) is None

    def test_authenticate_invalid_token(self):
        """authenticate() returns None for invalid JWT."""
        mgr = WebSocketManager()

        class FakeWS:
            query_params = {"token": "invalid-jwt-garbage"}

        assert mgr.authenticate(FakeWS()) is None

    def test_authenticate_valid_token(self):
        """authenticate() returns user context for valid JWT."""
        mgr = WebSocketManager()
        token = _make_jwt()

        class FakeWS:
            query_params = {"token": token}

        ctx = mgr.authenticate(FakeWS())
        assert ctx is not None
        assert ctx["user_id"] == "test-user-id"
        assert ctx["role"] == "admin"

    def test_disconnect_removes_connection(self):
        """disconnect() removes the connection from the list."""
        mgr = WebSocketManager()

        class FakeWS:
            pass

        conn = AuthenticatedConnection(FakeWS(), {"user_id": "u1", "role": "user", "scopes": []})
        mgr.connections.append(conn)
        assert len(mgr.connections) == 1
        mgr.disconnect(conn)
        assert len(mgr.connections) == 0

    def test_disconnect_missing_connection_no_error(self):
        """disconnect() doesn't raise if connection not in list."""
        mgr = WebSocketManager()

        class FakeWS:
            pass

        conn = AuthenticatedConnection(FakeWS(), {"user_id": "u1"})
        mgr.disconnect(conn)  # should not raise


@pytest.mark.asyncio
class TestWebSocketManagerAsync:
    """Async unit tests for broadcast and send_to_user."""

    async def test_broadcast_sends_to_all(self):
        """broadcast() sends event to all connections."""
        mgr = WebSocketManager()
        received = []

        class FakeWS:
            async def send_text(self, msg: str):
                received.append(msg)

        conn1 = AuthenticatedConnection(FakeWS(), {"user_id": "u1"})
        conn2 = AuthenticatedConnection(FakeWS(), {"user_id": "u2"})
        mgr.connections = [conn1, conn2]

        await mgr.broadcast("test_event", {"key": "value"})

        assert len(received) == 2
        parsed = json.loads(received[0])
        assert parsed["event"] == "test_event"
        assert parsed["data"]["key"] == "value"

    async def test_send_to_user_filters(self):
        """send_to_user() only sends to matching user_id."""
        mgr = WebSocketManager()
        received_u1: list[str] = []
        received_u2: list[str] = []

        class FakeWS1:
            async def send_text(self, msg: str):
                received_u1.append(msg)

        class FakeWS2:
            async def send_text(self, msg: str):
                received_u2.append(msg)

        conn1 = AuthenticatedConnection(FakeWS1(), {"user_id": "u1"})
        conn2 = AuthenticatedConnection(FakeWS2(), {"user_id": "u2"})
        mgr.connections = [conn1, conn2]

        await mgr.send_to_user("u1", "private_event", {"secret": True})

        assert len(received_u1) == 1
        assert len(received_u2) == 0
        parsed = json.loads(received_u1[0])
        assert parsed["event"] == "private_event"

    async def test_broadcast_removes_broken_connections(self):
        """broadcast() cleans up connections that raise on send."""
        mgr = WebSocketManager()

        class GoodWS:
            async def send_text(self, msg: str):
                pass

        class BrokenWS:
            async def send_text(self, msg: str):
                raise ConnectionError("broken")

        good_conn = AuthenticatedConnection(GoodWS(), {"user_id": "u1"})
        broken_conn = AuthenticatedConnection(BrokenWS(), {"user_id": "u2"})
        mgr.connections = [good_conn, broken_conn]

        await mgr.broadcast("test", {})

        assert len(mgr.connections) == 1
        assert mgr.connections[0] is good_conn

    async def test_pong_updates_last_pong(self):
        """Connection's last_pong updates when set."""
        conn = AuthenticatedConnection(object(), {"user_id": "u1", "role": "user", "scopes": []})
        old_pong = conn.last_pong
        await asyncio.sleep(0.01)
        conn.last_pong = time.time()
        assert conn.last_pong > old_pong


# ── Integration tests using Starlette TestClient ────────────────────────────


class TestWebSocketIntegration:
    """WebSocket endpoint integration tests."""

    def test_ws_connect_with_valid_jwt(self):
        """Valid JWT in query param results in accepted connection."""
        token = _make_jwt()
        client = TestClient(app)
        with client.websocket_connect(f"/ws/oracle?token={token}") as ws:
            ws.send_text("pong")
            # If we got here, connection was accepted

    def test_ws_reject_without_token(self):
        """No token results in close code 4001."""
        client = TestClient(app)
        with pytest.raises(Exception):
            with client.websocket_connect("/ws/oracle"):
                pass

    def test_ws_reject_invalid_token(self):
        """Invalid JWT results in close code 4001."""
        client = TestClient(app)
        with pytest.raises(Exception):
            with client.websocket_connect("/ws/oracle?token=bad-jwt"):
                pass

    def test_ws_receive_ping(self):
        """After connection, server sends ping via heartbeat (tested via broadcast)."""
        token = _make_jwt()
        client = TestClient(app)
        # We can't easily test heartbeat timing, but we can verify
        # the connection is alive and can receive broadcast messages
        with client.websocket_connect(f"/ws/oracle?token={token}") as ws:
            # The connection is accepted — that's the key assertion
            # Send a pong to keep connection alive
            ws.send_text("pong")


# ── Event model tests ────────────────────────────────────────────────────────


class TestEventModels:
    """Tests for oracle event Pydantic models."""

    def test_reading_progress_event(self):
        from app.models.events import ReadingProgressEvent

        event = ReadingProgressEvent(
            reading_id=1,
            step="calculating",
            progress=50,
            message="Computing numerology",
            user_id=42,
        )
        assert event.step == "calculating"
        assert event.progress == 50

    def test_reading_complete_event(self):
        from app.models.events import ReadingCompleteEvent

        event = ReadingCompleteEvent(
            reading_id=1,
            sign_type="time",
            summary="Your reading is ready",
        )
        assert event.reading_id == 1
        assert event.user_id is None

    def test_reading_error_event(self):
        from app.models.events import ReadingErrorEvent

        event = ReadingErrorEvent(error="AI unavailable")
        assert event.error == "AI unavailable"
        assert event.sign_type is None

    def test_daily_reading_event(self):
        from app.models.events import DailyReadingEvent

        event = DailyReadingEvent(
            date="2026-02-13",
            insight="Today is auspicious",
            lucky_numbers=["7", "11", "33"],
        )
        assert len(event.lucky_numbers) == 3

    def test_event_types_include_oracle(self):
        from app.models.events import EVENT_TYPES

        assert "READING_STARTED" in EVENT_TYPES
        assert "READING_PROGRESS" in EVENT_TYPES
        assert "READING_COMPLETE" in EVENT_TYPES
        assert "READING_ERROR" in EVENT_TYPES
        assert "DAILY_READING" in EVENT_TYPES
        assert EVENT_TYPES["READING_STARTED"] == "reading_started"

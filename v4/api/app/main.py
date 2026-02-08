"""NPS V4 API — FastAPI application entry point."""

import logging

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.middleware.rate_limit import RateLimitMiddleware
from app.routers import (
    auth,
    health,
    learning,
    location,
    oracle,
    scanner,
    translation,
    vault,
)
from app.services.security import init_encryption
from app.services.websocket_manager import websocket_endpoint

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic."""
    # Initialize encryption service
    init_encryption(settings)
    logger.info("Encryption service initialized")

    # Verify database connection
    try:
        from sqlalchemy import text
        from app.database import engine

        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Database connection verified")
    except Exception as exc:
        logger.error("Database connection failed: %s", exc)

    # Connect to Redis (graceful fallback)
    app.state.redis = None
    try:
        import redis.asyncio as aioredis

        app.state.redis = aioredis.from_url(
            settings.redis_url, decode_responses=True, socket_timeout=5
        )
        await app.state.redis.ping()
        logger.info("Redis connection established")
    except Exception as exc:
        logger.warning("Redis unavailable (non-fatal): %s", exc)
        app.state.redis = None

    # Probe Oracle gRPC channel (graceful fallback)
    app.state.oracle_channel = None
    try:
        import grpc

        channel = grpc.insecure_channel(
            f"{settings.oracle_grpc_host}:{settings.oracle_grpc_port}"
        )
        grpc.channel_ready_future(channel).result(timeout=3)
        app.state.oracle_channel = channel
        logger.info("Oracle gRPC channel established")
    except Exception as exc:
        logger.info("Oracle gRPC unavailable, using direct V3 imports: %s", exc)
        app.state.oracle_channel = None

    yield

    # Cleanup
    if app.state.redis:
        await app.state.redis.close()
        logger.info("Redis connection closed")
    if app.state.oracle_channel:
        app.state.oracle_channel.close()
        logger.info("Oracle gRPC channel closed")


app = FastAPI(
    title="NPS V4 API",
    description="Numerology Puzzle Solver — REST API + WebSocket",
    version="4.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting
app.add_middleware(RateLimitMiddleware)

# Routers
app.include_router(health.router, prefix="/api/health", tags=["health"])
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(scanner.router, prefix="/api/scanner", tags=["scanner"])
app.include_router(oracle.router, prefix="/api/oracle", tags=["oracle"])
app.include_router(vault.router, prefix="/api/vault", tags=["vault"])
app.include_router(learning.router, prefix="/api/learning", tags=["learning"])
app.include_router(translation.router, prefix="/api/translation", tags=["translation"])
app.include_router(location.router, prefix="/api/location", tags=["location"])

# WebSocket
app.add_api_websocket_route("/ws", websocket_endpoint)

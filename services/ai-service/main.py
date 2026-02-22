"""
Romy AI Service — Main FastAPI Application
Handles AI-powered spot extraction from social media URLs and screenshots.
"""

import os
import json
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import redis.asyncio as aioredis
import psycopg2
from dotenv import load_dotenv

from routes.extract import router as extract_router
from routes.places import router as places_router

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    app.state.redis = aioredis.from_url(
        os.getenv("REDIS_URL", "redis://localhost:6379"),
        decode_responses=True
    )
    logger.info("AI Service started")
    yield
    # Shutdown
    await app.state.redis.close()


app = FastAPI(
    title="Romy AI Service",
    description="AI-powered location extraction from social media content",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3001").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(extract_router, prefix="/extract", tags=["extraction"])
app.include_router(places_router, prefix="/places", tags=["places"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-service"}

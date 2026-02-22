"""
AI Orchestrator — Main FastAPI Application
Hosts the three-agent LangGraph pipeline:
  1. Researcher  — finds POIs and events
  2. Optimizer   — clusters neighborhoods and sequences stops
  3. Concierge   — personalizes via Traveler DNA
"""

import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import redis.asyncio as aioredis
from dotenv import load_dotenv

from routes.generate import router as generate_router
from routes.reoptimize import router as reoptimize_router
from routes.budget import router as budget_router

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.redis = aioredis.from_url(
        os.getenv("REDIS_URL", "redis://localhost:6379"),
        decode_responses=True
    )
    logger.info("🤖 AI Orchestrator started")
    yield
    await app.state.redis.close()


app = FastAPI(
    title="Romy AI Orchestrator",
    description="Three-agent LangChain pipeline for intelligent itinerary generation",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3001").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(generate_router, prefix="/itinerary", tags=["generation"])
app.include_router(reoptimize_router, prefix="/itinerary", tags=["re-optimization"])
app.include_router(budget_router, prefix="/budget", tags=["budget"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai-orchestrator", "agents": ["researcher", "optimizer", "concierge"]}

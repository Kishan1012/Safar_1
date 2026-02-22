"""
AI Extraction Route — core logic for turning social media content into spots
"""

import os
import base64
import json
import re
import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, HttpUrl
import httpx
from openai import AsyncOpenAI
from google.cloud import vision
import asyncio

logger = logging.getLogger(__name__)
router = APIRouter()
openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


# ─── Request / Response Models ────────────────────────────────────────────────
class ExtractRequest(BaseModel):
    url: Optional[str] = None
    screenshot_base64: Optional[str] = None
    platform: Optional[str] = None
    job_id: Optional[str] = None


class ExtractionResult(BaseModel):
    success: bool
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    location_query: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    confidence: float = 0.0
    raw_text: Optional[str] = None
    error: Optional[str] = None


# ─── LLM Extraction Prompt ───────────────────────────────────────────────────
EXTRACTION_PROMPT = """You are a travel location extraction specialist. 
Given text from a social media post (Instagram, TikTok, etc.), extract location information.

Return a JSON object with these exact fields:
{
  "name": "exact name of the place (restaurant, cafe, hotel, attraction name)",
  "description": "brief description from the post",
  "category": one of: "cafe", "restaurant", "hotel", "museum", "attraction", "bar", "shopping", "outdoors", "beach", "viewpoint", "other",
  "location_query": "full search query for Google Places like 'Cafe Name, City, Country'",
  "city": "city name",
  "country": "country name",
  "confidence": 0.0 to 1.0 (how confident you are this is a real place),
  "notes": "any additional context"
}

If no valid travel location is found, set confidence to 0 and name to null.
Only return the JSON object, no other text."""


# ─── Step 1: Fetch URL Metadata (Open Graph / oEmbed) ────────────────────────
async def fetch_url_metadata(url: str) -> dict:
    """Extract Open Graph metadata from a URL."""
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; RomyBot/1.0; +https://romy.travel)"
    }
    try:
        async with httpx.AsyncClient(timeout=10.0, follow_redirects=True) as client:
            response = await client.get(url, headers=headers)
            html = response.text

        # Extract Open Graph tags
        og_data = {}
        og_tags = re.findall(r'<meta[^>]+property="og:([^"]+)"[^>]+content="([^"]*)"', html)
        for prop, content in og_tags:
            og_data[prop] = content

        # Also get title and description
        title_match = re.search(r'<title[^>]*>(.*?)</title>', html, re.IGNORECASE | re.DOTALL)
        if title_match:
            og_data.setdefault('title', title_match.group(1).strip())

        # Extract text content (simplified)
        text_parts = []
        if og_data.get('title'):
            text_parts.append(og_data['title'])
        if og_data.get('description'):
            text_parts.append(og_data['description'])

        return {
            "og_data": og_data,
            "text": " | ".join(text_parts)
        }
    except Exception as e:
        logger.error(f"Failed to fetch URL metadata: {e}")
        return {"og_data": {}, "text": ""}


# ─── Step 2: OCR from screenshot using Google Vision ─────────────────────────
async def ocr_screenshot(image_base64: str) -> str:
    """Extract text from a screenshot using Google Vision API."""
    try:
        client = vision.ImageAnnotatorClient()
        image_content = base64.b64decode(image_base64)
        image = vision.Image(content=image_content)

        # Run in thread pool since Vision client is sync
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: client.text_detection(image=image)
        )

        if response.error.message:
            raise ValueError(response.error.message)

        texts = response.text_annotations
        return texts[0].description if texts else ""
    except Exception as e:
        logger.warning(f"OCR failed, proceeding without: {e}")
        return ""


# ─── Step 3: GPT-4o Extraction ───────────────────────────────────────────────
async def extract_with_llm(text: str) -> dict:
    """Use GPT-4o to extract structured location data from text."""
    if not text.strip():
        return {"confidence": 0, "name": None}

    try:
        response = await openai_client.chat.completions.create(
            model=os.getenv("OPENAI_MODEL", "gpt-4o"),
            messages=[
                {"role": "system", "content": EXTRACTION_PROMPT},
                {"role": "user", "content": f"Extract travel location from:\n\n{text[:2000]}"}
            ],
            response_format={"type": "json_object"},
            max_tokens=400,
            temperature=0.1,
        )

        content = response.choices[0].message.content
        return json.loads(content)
    except Exception as e:
        logger.error(f"LLM extraction failed: {e}")
        return {"confidence": 0, "name": None, "error": str(e)}


# ─── Step 4: Google Places API enrichment ────────────────────────────────────
async def enrich_with_google_places(location_query: str) -> Optional[dict]:
    """Search Google Places API to verify and enrich the extracted location."""
    api_key = os.getenv("GOOGLE_PLACES_API_KEY")
    if not api_key or not location_query:
        return None

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Text Search
            response = await client.get(
                "https://maps.googleapis.com/maps/api/place/textsearch/json",
                params={"query": location_query, "key": api_key}
            )
            data = response.json()

        if data.get("status") != "OK" or not data.get("results"):
            return None

        place = data["results"][0]

        # Fetch place details for hours, phone, website
        details_response = await httpx.AsyncClient().get(
            "https://maps.googleapis.com/maps/api/place/details/json",
            params={
                "place_id": place["place_id"],
                "fields": "name,formatted_address,geometry,opening_hours,rating,price_level,photos,website,types",
                "key": api_key
            }
        )
        details = details_response.json().get("result", {})

        lat = place["geometry"]["location"]["lat"]
        lng = place["geometry"]["location"]["lng"]

        return {
            "google_place_id": place["place_id"],
            "name": details.get("name", place.get("name")),
            "address": details.get("formatted_address", place.get("formatted_address")),
            "coordinates": {"lat": lat, "lng": lng},
            "rating": details.get("rating"),
            "price_level": details.get("price_level"),
            "hours": details.get("opening_hours"),
            "website": details.get("website"),
            "google_types": details.get("types", []),
        }
    except Exception as e:
        logger.error(f"Places API enrichment failed: {e}")
        return None


# ─── Main Extraction Orchestration ─────────────────────────────────────────────
async def run_extraction_pipeline(url: Optional[str], screenshot_base64: Optional[str]) -> ExtractionResult:
    """
    Full pipeline:
    URL/Screenshot → metadata/OCR → LLM → Google Places → ExtractionResult
    """
    raw_text = ""

    # Get text from URL
    if url:
        metadata = await fetch_url_metadata(url)
        raw_text = metadata.get("text", "")
        logger.info(f"Fetched URL metadata, text length: {len(raw_text)}")

    # Get text from screenshot via OCR
    if screenshot_base64:
        ocr_text = await ocr_screenshot(screenshot_base64)
        raw_text = f"{raw_text} {ocr_text}".strip()
        logger.info(f"OCR extracted text, total length: {len(raw_text)}")

    if not raw_text:
        return ExtractionResult(
            success=False,
            confidence=0,
            error="Could not extract any text from the provided input"
        )

    # LLM extraction
    llm_result = await extract_with_llm(raw_text)
    logger.info(f"LLM extraction confidence: {llm_result.get('confidence', 0)}")

    if not llm_result.get("name") or llm_result.get("confidence", 0) < 0.3:
        return ExtractionResult(
            success=False,
            confidence=llm_result.get("confidence", 0),
            raw_text=raw_text[:500],
            error="Could not identify a travel location in the content"
        )

    # Google Places enrichment
    places_data = None
    if llm_result.get("location_query"):
        places_data = await enrich_with_google_places(llm_result["location_query"])

    return ExtractionResult(
        success=True,
        name=places_data.get("name") if places_data else llm_result.get("name"),
        description=llm_result.get("description"),
        category=llm_result.get("category", "other"),
        location_query=llm_result.get("location_query"),
        city=llm_result.get("city"),
        country=llm_result.get("country"),
        confidence=float(llm_result.get("confidence", 0.8)),
        raw_text=raw_text[:300],
    )


# ─── API Endpoints ─────────────────────────────────────────────────────────────
@router.post("/", response_model=ExtractionResult)
async def extract_location(request: ExtractRequest):
    """
    Extract travel location data from a social media URL or screenshot.
    Runs the full AI pipeline synchronously (use /async for background processing).
    """
    if not request.url and not request.screenshot_base64:
        raise HTTPException(status_code=400, detail="Provide either a URL or screenshot_base64")

    result = await run_extraction_pipeline(request.url, request.screenshot_base64)
    return result


@router.get("/job/{job_id}")
async def get_job_status(job_id: str):
    """Check the status of a background extraction job."""
    return {"job_id": job_id, "status": "check Redis/DB for status"}

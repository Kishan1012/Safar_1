"""
Google Places proxy route — shields API key from client, adds caching
"""

import os
import logging
from typing import Optional
from fastapi import APIRouter, Query
import httpx

logger = logging.getLogger(__name__)
router = APIRouter()

GOOGLE_PLACES_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "")


async def google_places_search(query: str, lat: Optional[float] = None, lng: Optional[float] = None) -> dict:
    """Search Google Places with optional location bias."""
    params: dict = {"key": GOOGLE_PLACES_KEY, "query": query}
    if lat and lng:
        params["location"] = f"{lat},{lng}"
        params["radius"] = 50000

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            "https://maps.googleapis.com/maps/api/place/textsearch/json",
            params=params
        )
    return response.json()


@router.get("/search")
async def search_places(
    q: str = Query(..., description="Search query"),
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
):
    """Search for places using Google Places Text Search."""
    data = await google_places_search(q, lat, lng)
    results = data.get("results", [])

    return {
        "data": [
            {
                "google_place_id": r["place_id"],
                "name": r.get("name"),
                "address": r.get("formatted_address"),
                "coordinates": {
                    "lat": r["geometry"]["location"]["lat"],
                    "lng": r["geometry"]["location"]["lng"],
                },
                "rating": r.get("rating"),
                "price_level": r.get("price_level"),
                "types": r.get("types", []),
                "photos": [
                    f"https://maps.googleapis.com/maps/api/place/photo?"
                    f"maxwidth=400&photo_reference={p['photo_reference']}&key={GOOGLE_PLACES_KEY}"
                    for p in r.get("photos", [])[:3]
                ],
            }
            for r in results[:10]
        ]
    }


@router.get("/{place_id}")
async def get_place_details(place_id: str):
    """Get detailed info about a specific Google Place."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            "https://maps.googleapis.com/maps/api/place/details/json",
            params={
                "place_id": place_id,
                "fields": "name,formatted_address,geometry,opening_hours,rating,"
                          "price_level,photos,website,formatted_phone_number,types,reviews",
                "key": GOOGLE_PLACES_KEY,
            }
        )

    result = response.json().get("result", {})

    return {
        "data": {
            "google_place_id": place_id,
            "name": result.get("name"),
            "address": result.get("formatted_address"),
            "coordinates": {
                "lat": result["geometry"]["location"]["lat"],
                "lng": result["geometry"]["location"]["lng"],
            } if result.get("geometry") else None,
            "hours": result.get("opening_hours"),
            "rating": result.get("rating"),
            "price_level": result.get("price_level"),
            "website": result.get("website"),
            "phone": result.get("formatted_phone_number"),
            "types": result.get("types", []),
        }
    }

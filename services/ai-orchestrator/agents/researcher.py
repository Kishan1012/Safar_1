"""
Researcher Agent
Finds real-time POIs, local events, opening hours, and ratings.
Uses Google Places API + web scraping for current data.
"""

from typing import Any
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langchain_core.messages import HumanMessage, SystemMessage
from langchain.agents import create_openai_tools_agent, AgentExecutor
from langchain_core.prompts import ChatPromptTemplate
import httpx
import os
import json


# ─── Tools ───────────────────────────────────────────────────────────────────
@tool
async def search_google_places(query: str, location: str, radius_meters: int = 2000) -> str:
    """Search Google Places API for POIs near a location. Returns name, address, opening hours, rating."""
    api_key = os.getenv("GOOGLE_PLACES_API_KEY")
    async with httpx.AsyncClient() as client:
        geo = await client.get(
            "https://maps.googleapis.com/maps/api/geocode/json",
            params={"address": location, "key": api_key}
        )
        coords = geo.json()["results"][0]["geometry"]["location"]

        resp = await client.get(
            "https://maps.googleapis.com/maps/api/place/nearbysearch/json",
            params={
                "location": f"{coords['lat']},{coords['lng']}",
                "radius": radius_meters,
                "keyword": query,
                "key": api_key,
                "language": "en",
                "fields": "name,rating,opening_hours,price_level,types,formatted_address,geometry"
            }
        )
    places = resp.json().get("results", [])[:10]
    return json.dumps([{
        "name": p.get("name"),
        "address": p.get("vicinity"),
        "rating": p.get("rating"),
        "price_level": p.get("price_level"),
        "open_now": p.get("opening_hours", {}).get("open_now"),
        "lat": p["geometry"]["location"]["lat"],
        "lng": p["geometry"]["location"]["lng"],
        "types": p.get("types", [])[:3],
    } for p in places])


@tool
async def get_local_events(city: str, date: str) -> str:
    """Fetch local events happening in the city on the given date (YYYY-MM-DD)."""
    # In production: call Ticketmaster / Eventbrite / local scraper
    # Mocked structure for architecture demonstration
    return json.dumps([
        {"name": f"Local Market at {city} Town Square", "time": "09:00-13:00", "cost": 0, "category": "market"},
        {"name": f"{city} Food Festival", "time": "12:00-21:00", "cost": 150, "category": "food"},
    ])


@tool
async def check_travel_time(origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float, mode: str = "transit") -> str:
    """Calculate travel time and distance between two coordinates using Google Maps API."""
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://maps.googleapis.com/maps/api/distancematrix/json",
            params={
                "origins": f"{origin_lat},{origin_lng}",
                "destinations": f"{dest_lat},{dest_lng}",
                "mode": mode,
                "key": api_key,
            }
        )
    element = resp.json()["rows"][0]["elements"][0]
    return json.dumps({
        "duration_minutes": element["duration"]["value"] // 60,
        "distance_km": round(element["distance"]["value"] / 1000, 2),
        "mode": mode,
    })


RESEARCHER_TOOLS = [search_google_places, get_local_events, check_travel_time]

RESEARCHER_SYSTEM_PROMPT = """You are the Researcher Agent in an AI travel planning system.

Your job is to discover the BEST points of interest (POIs) for a traveler visiting a city.

Guidelines:
- Search for attractions, restaurants, cafes, hidden gems, local events
- ALWAYS restrict your search strictly to a 50km radius around the explicitly provided Indian city.
- UNDER NO CIRCUMSTANCES should you return international data or locations.
- Always check opening hours and verify they match the travel date
- Return a ranked list of places with coordinates, timing, cost, and category
- Focus on quality over quantity — maximum 8-10 POIs per city per day
- Always include 2 restaurant options per half-day (breakfast/lunch, afternoon snack, dinner)
- For each POI include estimated visit duration in minutes

Output format: Return a JSON array of POI objects.
"""


def create_researcher_agent() -> AgentExecutor:
    llm = ChatOpenAI(model="gpt-4o", temperature=0.2, max_tokens=4096)
    prompt = ChatPromptTemplate.from_messages([
        ("system", RESEARCHER_SYSTEM_PROMPT),
        ("human", "{input}"),
        ("placeholder", "{agent_scratchpad}"),
    ])
    agent = create_openai_tools_agent(llm, RESEARCHER_TOOLS, prompt)
    return AgentExecutor(agent=agent, tools=RESEARCHER_TOOLS, verbose=True, max_iterations=8)


async def run_researcher(city: str, dates: list[str], interests: list[str], budget_tier: str, must_sees: str = "") -> dict[str, Any]:
    agent = create_researcher_agent()
    
    must_sees_block = f"Ensure the following must-sees are incorporated: {must_sees}" if must_sees else ""

    query = f"""
    Find the best POIs for a traveler visiting {city} on dates {dates}.
    Traveler interests: {', '.join(interests)}.
    Budget tier: {budget_tier} (backpacker=₹₹, mid_range=₹₹₹, luxury=₹₹₹₹).
    {must_sees_block}
    
    For each day, find:
    1. Morning attraction (opens before 10am)
    2. Midday restaurant (local, highly rated)
    3. Afternoon activity (2-5pm slot)
    4. Evening experience (sunset or evening spot)
    5. Dinner restaurant
    
    Also check for any local events on those dates.
    """
    result = await agent.ainvoke({"input": query})
    return {"city": city, "pois": result["output"]}

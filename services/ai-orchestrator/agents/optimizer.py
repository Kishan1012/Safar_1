"""
Optimizer Agent
Takes the Researcher's raw POI list and produces a logistically
sound, neighborhood-clustered day-by-day schedule.

Key constraints enforced:
  - Neighborhood clustering: all "Old Delhi" spots on same day
  - Travel time sanity: no <45 min gap when transit time is 40 min
  - Opening hours: no visits before open / after close
  - Visit duration: realistic time blocks per category
  - Meal slot injection: breakfast/lunch/dinner at appropriate times
"""

from typing import Any
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langchain_core.prompts import ChatPromptTemplate
from langchain.agents import create_openai_tools_agent, AgentExecutor
import json
import math


# ─── Neighborhood Clustering (pure Python, no API call needed) ────────────────
def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance in km between two lat/lng points."""
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng/2)**2
    return R * 2 * math.asin(math.sqrt(a))


def cluster_pois_by_neighborhood(pois: list[dict], radius_km: float = 1.5) -> list[list[dict]]:
    """
    Greedy geographic clustering.
    Returns list of clusters — each cluster goes to a different day.
    Prevents ping-ponging across the city.
    """
    unassigned = list(range(len(pois)))
    clusters: list[list[dict]] = []

    while unassigned:
        # Start new cluster from first unassigned POI
        seed_idx = unassigned[0]
        cluster = [pois[seed_idx]]
        unassigned.remove(seed_idx)

        seed_lat = pois[seed_idx]["lat"]
        seed_lng = pois[seed_idx]["lng"]

        # Add nearby POIs
        still_unassigned = []
        for idx in unassigned:
            dist = haversine_km(seed_lat, seed_lng, pois[idx]["lat"], pois[idx]["lng"])
            if dist <= radius_km:
                cluster.append(pois[idx])
            else:
                still_unassigned.append(idx)
        unassigned = still_unassigned
        clusters.append(cluster)

    return clusters


def check_schedule_sanity(schedule: list[dict]) -> list[str]:
    """
    Validate a day's schedule for logical sanity.
    Returns list of warnings/violations.
    """
    warnings = []
    for i in range(1, len(schedule)):
        prev = schedule[i - 1]
        curr = schedule[i]

        prev_departure = prev.get("scheduled_departure")
        curr_arrival = curr.get("scheduled_arrival")
        travel_mins = curr.get("travel_time_mins", 0)

        if prev_departure and curr_arrival:
            prev_h, prev_m = map(int, prev_departure.split(":"))
            curr_h, curr_m = map(int, curr_arrival.split(":"))
            gap_mins = (curr_h * 60 + curr_m) - (prev_h * 60 + prev_m)

            if gap_mins < travel_mins:
                warnings.append(
                    f"⚠️ TIMING CONFLICT: Travel from '{prev['name']}' to '{curr['name']}' "
                    f"takes {travel_mins} min but only {gap_mins} min allocated."
                )

        # Check opening hours
        open_time = curr.get("opening_time")
        if open_time and curr_arrival:
            open_h, open_m = map(int, open_time.split(":"))
            arr_h, arr_m = map(int, curr_arrival.split(":"))
            if arr_h * 60 + arr_m < open_h * 60 + open_m:
                warnings.append(f"⚠️ OPENING HOURS: '{curr['name']}' opens at {open_time} but arrival is {curr_arrival}.")

    return warnings


@tool
def validate_schedule_tool(schedule_json: str) -> str:
    """
    Validate a day's schedule JSON for timing conflicts and opening hour violations.
    Input: JSON string of schedule array. Returns warnings list.
    """
    schedule = json.loads(schedule_json)
    warnings = check_schedule_sanity(schedule)
    return json.dumps({"valid": len(warnings) == 0, "warnings": warnings})


@tool
def cluster_pois_tool(pois_json: str, days_available: int) -> str:
    """
    Group POIs by geographic proximity into neighborhood clusters.
    Each cluster is assigned to a different day to prevent ping-ponging.
    Input: JSON array of POIs with lat/lng. Returns clustered assignment.
    """
    pois = json.loads(pois_json)
    clusters = cluster_pois_by_neighborhood(pois)

    result = []
    for i, cluster in enumerate(clusters):
        day = (i % days_available) + 1
        # Find cluster center
        center_lat = sum(p["lat"] for p in cluster) / len(cluster)
        center_lng = sum(p["lng"] for p in cluster) / len(cluster)

        result.append({
            "day": day,
            "neighborhood_center": {"lat": center_lat, "lng": center_lng},
            "radius_km": 1.5,
            "pois": [p["name"] for p in cluster],
            "poi_count": len(cluster),
        })
    return json.dumps(result)


OPTIMIZER_TOOLS = [validate_schedule_tool, cluster_pois_tool]

OPTIMIZER_SYSTEM_PROMPT = """You are the Optimizer Agent in an AI travel planning pipeline.

You receive a raw list of POIs from the Researcher and must produce a logistically perfect day-by-day schedule.

STRICT RULES:
1. NEIGHBORHOOD CLUSTERING: Use the cluster_pois_tool to group nearby places. All spots in the same neighborhood go on the same day. NEVER schedule Asakusa in the morning and Shibuya at 11:30am without checking travel time.
2. TRAVEL TIME SANITY: Always account for realistic travel times. If transit takes 45 minutes between stops, ensure at least 50 minutes of buffer.
3. OPENING HOURS: Schedule visits only during opening hours. Morning museums before 10am, evening bars after 7pm.
4. VISIT DURATIONS:
   - Major landmark: 90-120 min
   - Museum: 120-180 min  
   - Restaurant (meal): 60-90 min
   - Cafe/quick stop: 20-30 min
   - Viewpoint / photo spot: 15-30 min
5. MEAL SPACING: Inject a proper meal stop every 3-4 hours. Breakfast 8-9am, Lunch 12:30-1:30pm, Dinner 7-8:30pm.
6. VALIDATE: After constructing each day, call validate_schedule_tool. Fix any violations.

Output: Return a structured JSON with days array, each containing ordered schedule with times.
"""


def create_optimizer_agent() -> AgentExecutor:
    llm = ChatOpenAI(model="gpt-4o", temperature=0, max_tokens=8192)
    prompt = ChatPromptTemplate.from_messages([
        ("system", OPTIMIZER_SYSTEM_PROMPT),
        ("human", "{input}"),
        ("placeholder", "{agent_scratchpad}"),
    ])
    agent = create_openai_tools_agent(llm, OPTIMIZER_TOOLS, prompt)
    return AgentExecutor(agent=agent, tools=OPTIMIZER_TOOLS, verbose=True, max_iterations=12)


async def run_optimizer(pois_data: dict, num_days: int, start_time: str, end_time: str) -> dict[str, Any]:
    agent = create_optimizer_agent()
    pois_json = json.dumps(pois_data.get("pois", []))

    query = f"""
    I have {num_days} days available in {pois_data['city']}.
    Traveler's preferred daily window: {start_time} to {end_time}.
    
    Raw POIs: {pois_json}
    
    Steps:
    1. First call cluster_pois_tool to group POIs by neighborhood and assign to days
    2. For each day's cluster, build a time-ordered schedule with arrival/departure times
    3. Ensure no timing conflicts (travel time + visit duration must fit within the window)
    4. Call validate_schedule_tool on each day's schedule and fix any warnings
    5. Return the final multi-day schedule as structured JSON
    
    The schedule for each stop must include:
    - name, category, lat, lng
    - scheduled_arrival (HH:MM), scheduled_departure (HH:MM)
    - travel_mode, travel_time_mins from previous stop
    - estimated_cost, currency
    - neighborhood name
    """
    result = await agent.ainvoke({"input": query})
    return {"city": pois_data["city"], "schedule": result["output"]}

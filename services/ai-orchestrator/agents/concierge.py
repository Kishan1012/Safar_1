"""
Concierge Agent
Personalizes the optimized itinerary against the user's Traveler DNA.
Handles dynamic re-optimization when a user rejects a stop.

Traveler DNA dimensions:
  - Pace: slow | moderate | fast
  - Budget: backpacker | mid_range | business | luxury
  - Interests: history, foodie, adventure, art, wellness, nightlife, ...
  - Age bracket: teen | adult | senior | family
  - Special: avoid_crowds, needs_accessibility
"""

from typing import Any
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langchain_core.prompts import ChatPromptTemplate
from langchain.agents import create_openai_tools_agent, AgentExecutor
import json


# ─── Traveler DNA Model ───────────────────────────────────────────────────────
class TravelerDNA:
    def __init__(self, profile: dict):
        self.pace = profile.get("pace", "moderate")           # slow/moderate/fast
        self.budget_tier = profile.get("budget_tier", "mid_range")
        self.interests = profile.get("interests", [])
        self.age_bracket = profile.get("age_bracket", "adult")
        self.avoid_crowds = profile.get("avoid_crowds", False)
        self.accessibility = profile.get("needs_accessibility", False)
        self.max_stops = profile.get("max_stops_per_day", 5)
        self.start_time = profile.get("preferred_start_time", "09:00")
        self.end_time = profile.get("preferred_end_time", "21:00")

    def stops_per_day(self) -> int:
        """Map pace to recommended stops."""
        return {"slow": 3, "moderate": 5, "fast": 7}.get(self.pace, 5)

    def budget_multiplier(self) -> float:
        """For cost filtering."""
        return {"backpacker": 0.3, "mid_range": 1.0, "business": 2.5, "luxury": 5.0}.get(self.budget_tier, 1.0)

    def to_prompt_context(self) -> str:
        return f"""
TRAVELER DNA:
- Pace: {self.pace.upper()} — schedule max {self.stops_per_day()} major stops per day
- Budget: {self.budget_tier.upper()} (multiplier: {self.budget_multiplier()}x mid-range)
- Interests: {', '.join(self.interests) or 'general sightseeing'}
- Age bracket: {self.age_bracket}
- Avoid crowds: {'YES — prefer off-peak hours and less-visited alternatives' if self.avoid_crowds else 'NO'}
- Accessibility required: {'YES — ensure step-free access, ramps, elevators' if self.accessibility else 'NO'}
- Daily window: {self.start_time} to {self.end_time}
"""


# ─── Tools ────────────────────────────────────────────────────────────────────
@tool
def score_poi_for_dna(poi_json: str, dna_json: str) -> str:
    """
    Score a single POI against the traveler's DNA profile.
    Returns a score 0-1 and a recommendation string.
    """
    poi = json.loads(poi_json)
    dna = json.loads(dna_json)

    score = 0.5  # baseline
    reasons = []

    # Interest matching
    poi_types = poi.get("types", []) + [poi.get("category", "")]
    interests = dna.get("interests", [])

    interest_map = {
        "history": ["museum", "historic_site", "heritage", "temple", "fort", "palace"],
        "foodie": ["restaurant", "cafe", "food", "bakery", "bar", "street_food"],
        "adventure": ["activity", "trek", "adventure", "climbing", "cycling", "kayaking"],
        "art": ["art_gallery", "museum", "theater", "dance", "music"],
        "wellness": ["spa", "yoga", "meditation", "ashram", "nature", "wellness"],
        "nightlife": ["bar", "club", "nightlife", "lounge", "cocktail"],
        "nature": ["nature", "park", "garden", "beach", "viewpoint", "forest"],
    }

    for interest in interests:
        keywords = interest_map.get(interest, [])
        if any(kw in " ".join(poi_types).lower() for kw in keywords):
            score += 0.2
            reasons.append(f"Matches {interest} interest")

    # Budget check
    price_level = poi.get("price_level", 2)
    budget = dna.get("budget_tier", "mid_range")
    budget_map = {"backpacker": 1, "mid_range": 2, "business": 3, "luxury": 4}
    budget_level = budget_map.get(budget, 2)
    if abs(price_level - budget_level) > 1:
        score -= 0.2
        reasons.append(f"Price level {price_level} mismatches budget tier {budget}")

    # Crowd avoidance
    if dna.get("avoid_crowds") and poi.get("rating", 3) > 4.5:
        score -= 0.1
        reasons.append("Popular spot — may be crowded")

    score = max(0.0, min(1.0, score))
    return json.dumps({"score": round(score, 2), "reasons": reasons})


@tool
def find_replacement_poi(rejected_poi_json: str, neighborhood_context: str, dna_json: str) -> str:
    """
    Suggest a replacement POI when user rejects a stop.
    Returns an alternative POI in the same neighborhood that better matches DNA.
    This tool returns a prompt for the LLM to process further.
    """
    rejected = json.loads(rejected_poi_json)
    dna = json.loads(dna_json)

    prompt = f"""
The user rejected: {rejected['name']} ({rejected.get('category')})
Reason: {rejected.get('rejection_reason', 'not specified')}
Neighborhood: {neighborhood_context}
Traveler DNA: {json.dumps(dna)}

Suggest 3 alternative places in the same neighborhood that:
1. Are in a similar time slot (same half of the day)
2. Better match the traveler's interests and budget
3. Don't require significant travel from nearby stops
4. Are open at the same time
"""
    return prompt  # LLM will process this


CONCIERGE_TOOLS = [score_poi_for_dna, find_replacement_poi]

CONCIERGE_SYSTEM_PROMPT = """You are the Concierge Agent — the final personalizer in the AI travel planning pipeline.

You receive an optimized schedule from the Optimizer and must tune it to the user's specific Traveler DNA.

Your responsibilities:
1. SCORING: Use score_poi_for_dna to evaluate every POI against the traveler's profile
2. CULLING: Remove low-scoring POIs (score < 0.4) and replace with better alternatives
3. PACING: 
   - "slow" traveler: max 3 stops per day, more leisure time built in
   - "fast" traveler: compact 6-7 stops, minimal breaks
4. BUDGET ALIGNMENT: Remove options above the budget tier, suggest alternatives
5. PERSONALIZATION NOTES: Add a personalized note for each stop explaining WHY it matches the traveler
6. RE-OPTIMIZATION: When given a rejected POI, call find_replacement_poi and update the schedule

Always output the final itinerary as valid structured JSON.
"""


def create_concierge_agent() -> AgentExecutor:
    llm = ChatOpenAI(model="gpt-4o", temperature=0.3, max_tokens=8192)
    prompt = ChatPromptTemplate.from_messages([
        ("system", CONCIERGE_SYSTEM_PROMPT),
        ("human", "{input}"),
        ("placeholder", "{agent_scratchpad}"),
    ])
    agent = create_openai_tools_agent(llm, CONCIERGE_TOOLS, prompt)
    return AgentExecutor(agent=agent, tools=CONCIERGE_TOOLS, verbose=True, max_iterations=10)


async def run_concierge(
    schedule_data: dict,
    traveler_profile: dict,
    rejection: dict | None = None
) -> dict[str, Any]:
    agent = create_concierge_agent()
    dna = TravelerDNA(traveler_profile)

    if rejection:
        query = f"""
        The user rejected a stop: {json.dumps(rejection)}
        Current full schedule: {json.dumps(schedule_data)}
        {dna.to_prompt_context()}
        
        1. Call find_replacement_poi for the rejected stop
        2. Choose the best alternative based on DNA scoring
        3. Rebuild the affected day's schedule with the replacement
        4. Ensure timing/travel constraints are still satisfied
        5. Return the updated full schedule JSON
        """
    else:
        query = f"""
        Personalize this itinerary for the traveler:
        Schedule: {json.dumps(schedule_data)}
        {dna.to_prompt_context()}
        
        1. Score each POI with score_poi_for_dna
        2. Remove low-scoring stops (< 0.4) — replace with better alternatives if needed  
        3. Trim stops per day to {dna.stops_per_day()} based on pace = {dna.pace}
        4. Add a 'why_you_ll_love_it' field to each stop (1 sentence, personalized to their interests)
        5. Add a 'concierge_tip' field with a local insight or pro tip
        6. Ensure budget alignment — flag any stops above their {dna.budget_tier} tier
        7. Return the final personalized schedule as structured JSON
        """

    result = await agent.ainvoke({"input": query})
    return {"personalized_schedule": result["output"]}


async def handle_rejection(
    trip_id: str,
    day_number: int,
    rejected_poi: dict,
    current_schedule: dict,
    traveler_profile: dict,
    reason: str
) -> dict[str, Any]:
    """Entry point for dynamic re-optimization after user rejection."""
    rejection = {
        "poi": rejected_poi,
        "day": day_number,
        "reason": reason,
        "trip_id": trip_id
    }
    return await run_concierge(current_schedule, traveler_profile, rejection=rejection)

"""
LangGraph Orchestration Pipeline
Connects Researcher → Optimizer → Concierge in a stateful graph.
Each node is one agent; edges carry the cumulative context forward.
"""

from typing import TypedDict, Annotated
from langgraph.graph import StateGraph, END
import operator
import asyncio
import json

from agents.researcher import run_researcher
from agents.optimizer import run_optimizer
from agents.concierge import run_concierge


# ─── State Schema ──────────────────────────────────────────────────────────────
class TripPlanState(TypedDict):
    # Input
    trip_id: str
    city: str
    dates: list[str]
    num_days: int
    traveler_profile: dict

    # Agent outputs (append-only via operator.add)
    agent_logs: Annotated[list[str], operator.add]

    # Data flowing through the pipeline
    raw_pois: dict             # Researcher output
    optimized_schedule: dict   # Optimizer output
    final_itinerary: dict      # Concierge output

    # Progress tracking
    current_stage: str
    error: str | None


# ─── Node Functions ────────────────────────────────────────────────────────────
async def researcher_node(state: TripPlanState) -> dict:
    """Node 1: Discover POIs and local events."""
    profile = state["traveler_profile"]
    result = await run_researcher(
        city=state["city"],
        dates=state["dates"],
        interests=profile.get("interests", []),
        budget_tier=profile.get("budget_tier", "mid_range"),
        must_sees=profile.get("mustSees", "")
    )
    return {
        "raw_pois": result,
        "current_stage": "optimizing",
        "agent_logs": [f"✅ Researcher: Found POIs for {state['city']}"]
    }


async def optimizer_node(state: TripPlanState) -> dict:
    """Node 2: Cluster and schedule POIs into days."""
    profile = state["traveler_profile"]
    result = await run_optimizer(
        pois_data=state["raw_pois"],
        num_days=state["num_days"],
        start_time=profile.get("preferred_start_time", "09:00"),
        end_time=profile.get("preferred_end_time", "21:00")
    )
    return {
        "optimized_schedule": result,
        "current_stage": "personalizing",
        "agent_logs": [f"✅ Optimizer: Clustered {state['num_days']} days without ping-ponging"]
    }


async def concierge_node(state: TripPlanState) -> dict:
    """Node 3: Personalize to Traveler DNA."""
    result = await run_concierge(
        schedule_data=state["optimized_schedule"],
        traveler_profile=state["traveler_profile"]
    )
    return {
        "final_itinerary": result,
        "current_stage": "completed",
        "agent_logs": [f"✅ Concierge: Personalized for {state['traveler_profile'].get('pace')} pace traveler"]
    }


def should_continue(state: TripPlanState) -> str:
    """Edge routing based on current pipeline stage."""
    stage = state.get("current_stage", "researching")
    if state.get("error"):
        return END
    routing = {
        "researching": "optimizer",
        "optimizing": "concierge",
        "personalizing": "concierge",
        "completed": END,
    }
    return routing.get(stage, END)


# ─── Build Graph ───────────────────────────────────────────────────────────────
def build_planner_graph() -> StateGraph:
    graph = StateGraph(TripPlanState)

    graph.add_node("researcher", researcher_node)
    graph.add_node("optimizer", optimizer_node)
    graph.add_node("concierge", concierge_node)

    graph.set_entry_point("researcher")

    graph.add_edge("researcher", "optimizer")
    graph.add_edge("optimizer", "concierge")
    graph.add_edge("concierge", END)

    return graph.compile()


PLANNER_GRAPH = build_planner_graph()


# ─── Public Interface ──────────────────────────────────────────────────────────
async def run_full_pipeline(
    trip_id: str,
    city: str,
    dates: list[str],
    traveler_profile: dict
) -> dict:
    """
    Execute the full Researcher → Optimizer → Concierge pipeline.
    Returns the final personalized itinerary.
    """
    initial_state: TripPlanState = {
        "trip_id": trip_id,
        "city": city,
        "dates": dates,
        "num_days": len(dates),
        "traveler_profile": traveler_profile,
        "agent_logs": ["🚀 Pipeline started"],
        "raw_pois": {},
        "optimized_schedule": {},
        "final_itinerary": {},
        "current_stage": "researching",
        "error": None,
    }
    final_state = await PLANNER_GRAPH.ainvoke(initial_state)
    return {
        "trip_id": trip_id,
        "itinerary": final_state["final_itinerary"],
        "agent_logs": final_state["agent_logs"],
        "stages_completed": ["researcher", "optimizer", "concierge"],
    }

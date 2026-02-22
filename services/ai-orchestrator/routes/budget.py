"""
Budget Tracker Engine + Routes
GET  /budget/{trip_id}              — total trip cost breakdown
POST /budget/{trip_id}/update       — log actual expense
GET  /budget/{trip_id}/comparison   — estimate vs actual per category
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from decimal import Decimal

router = APIRouter()


# ─── Models ───────────────────────────────────────────────────────────────────
class BudgetEstimate(BaseModel):
    flights_inr: float = 0
    hotels_inr: float = 0
    activities_inr: float = 0
    food_inr: float = 0
    transport_inr: float = 0
    miscellaneous_inr: float = 0


class ActualExpense(BaseModel):
    category: str    # flight | hotel | activity | food | transport | shopping | misc
    label: str
    amount_inr: float
    day_number: int | None = None
    poi_id: str | None = None


# ─── Budget Estimation Engine ─────────────────────────────────────────────────
BUDGET_TIER_MULTIPLIERS = {
    "backpacker": {"hotel_per_night": 600,  "meal": 150,  "activity": 200},
    "mid_range":  {"hotel_per_night": 2500, "meal": 600,  "activity": 800},
    "business":   {"hotel_per_night": 7000, "meal": 2000, "activity": 2500},
    "luxury":     {"hotel_per_night": 20000,"meal": 6000, "activity": 8000},
}

COUNTRY_FOOD_INDEX = {
    # Multiplier vs India baseline (1.0)
    "india": 1.0, "thailand": 1.2, "japan": 3.5, "italy": 3.0,
    "france": 3.5, "usa": 4.0, "singapore": 2.8, "uk": 4.5,
    "bali": 1.5,
}


def estimate_trip_budget(
    num_nights: int,
    num_days: int,
    cities: list[dict],         # [{city, country}]
    budget_tier: str,
    include_flights: bool = True
) -> dict:
    tier = BUDGET_TIER_MULTIPLIERS.get(budget_tier, BUDGET_TIER_MULTIPLIERS["mid_range"])

    # Flight estimation (domestic India vs international)
    flight_cost = 0
    if include_flights:
        international_cities = [c for c in cities if c.get("country", "India").lower() != "india"]
        domestic_cities = [c for c in cities if c.get("country", "India").lower() == "india"]
        flight_cost = len(international_cities) * 45000 + len(domestic_cities) * 5000

    # Hotel estimation
    hotel_cost = tier["hotel_per_night"] * num_nights

    # Food estimation (adjusts per country)
    food_per_day = 0
    for i, city in enumerate(cities):
        country_key = city.get("country", "india").lower()
        multiplier = COUNTRY_FOOD_INDEX.get(country_key, 2.0)
        # 3 meals per day
        food_per_day += tier["meal"] * 3 * multiplier
    food_cost = food_per_day / max(len(cities), 1) * num_days

    # Activities (avg 2 paid activities per day)
    activity_cost = tier["activity"] * 2 * num_days

    # Transport (intra-city: taxis, metro, auto-rickshaw etc.)
    transport_per_day = {"backpacker": 200, "mid_range": 500, "business": 1500, "luxury": 4000}
    transport_cost = transport_per_day.get(budget_tier, 500) * num_days

    # Miscellaneous (shopping, tips, surprises) = 15% of subtotal
    subtotal = hotel_cost + food_cost + activity_cost + transport_cost
    misc_cost = subtotal * 0.15

    total = flight_cost + subtotal + misc_cost

    return {
        "currency": "INR",
        "breakdown": {
            "flights": round(flight_cost),
            "hotels": round(hotel_cost),
            "food": round(food_cost),
            "activities": round(activity_cost),
            "transport": round(transport_cost),
            "miscellaneous": round(misc_cost),
        },
        "total_estimated": round(total),
        "per_day_average": round(total / max(num_days, 1)),
        "budget_tier": budget_tier,
        "notes": [
            f"Hotel: ₹{tier['hotel_per_night']:,}/night ({budget_tier} tier)",
            f"Meals: ~₹{tier['meal'] * 3:,}/day (3 meals)",
            "Flights estimated based on city count",
            "Add 15% buffer for spontaneous expenses",
        ]
    }


# ─── Endpoints ────────────────────────────────────────────────────────────────
@router.get("/{trip_id}")
async def get_trip_budget(trip_id: str, budget_tier: str = "mid_range"):
    """
    Get the full budget breakdown for a trip.
    In production: fetches from budget_items table and aggregates.
    """
    # Mock: in production load from DB
    estimate = estimate_trip_budget(
        num_nights=4,
        num_days=5,
        cities=[{"city": "Jaipur", "country": "India"}, {"city": "Udaipur", "country": "India"}],
        budget_tier=budget_tier,
    )
    return {
        "trip_id": trip_id,
        "estimate": estimate,
        "actual": {
            "total_spent": 0,
            "breakdown": {"flights": 0, "hotels": 0, "food": 0, "activities": 0, "transport": 0, "miscellaneous": 0},
        },
        "remaining_budget": estimate["total_estimated"],
    }


@router.post("/{trip_id}/update")
async def log_expense(trip_id: str, expense: ActualExpense):
    """Log an actual expense against the trip budget."""
    # In production: INSERT INTO budget_items
    return {
        "trip_id": trip_id,
        "logged": True,
        "expense": expense.model_dump(),
        "message": f"Logged ₹{expense.amount_inr:,.0f} for {expense.label}"
    }


@router.get("/{trip_id}/comparison")
async def get_budget_comparison(trip_id: str):
    """Compare estimated vs actual spend by category."""
    return {
        "trip_id": trip_id,
        "categories": [
            {"category": "flights",    "estimated": 10000, "actual": 9500,  "variance": -500,   "over_budget": False},
            {"category": "hotels",     "estimated": 10000, "actual": 0,     "variance": -10000, "over_budget": False},
            {"category": "food",       "estimated": 9000,  "actual": 1200,  "variance": -7800,  "over_budget": False},
            {"category": "activities", "estimated": 8000,  "actual": 1500,  "variance": -6500,  "over_budget": False},
            {"category": "transport",  "estimated": 2500,  "actual": 600,   "variance": -1900,  "over_budget": False},
        ],
        "total_estimated": 39500,
        "total_actual": 12800,
        "percentage_spent": 32.4,
    }


@router.post("/estimate")
async def estimate_budget(
    cities: list[dict],
    num_days: int,
    budget_tier: str = "mid_range",
    include_flights: bool = True
):
    """Quick budget estimate before generating an itinerary."""
    estimate = estimate_trip_budget(
        num_nights=max(num_days - 1, 1),
        num_days=num_days,
        cities=cities,
        budget_tier=budget_tier,
        include_flights=include_flights,
    )
    return estimate

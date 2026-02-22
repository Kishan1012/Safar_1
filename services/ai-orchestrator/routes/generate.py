"""
Generate Itinerary Route
POST /itinerary/generate   — triggers the full 3-agent pipeline
GET  /itinerary/{trip_id}  — poll status
GET  /itinerary/{trip_id}/days/{day_number} — fetch a single day
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Request
from pydantic import BaseModel, Field
import uuid
import json
import os
from datetime import datetime

from pipeline import run_full_pipeline

router = APIRouter()


# ─── Request / Response Models ────────────────────────────────────────────────
class TravelerDNAInput(BaseModel):
    pace: str = Field("moderate", pattern="^(slow|moderate|fast)$")
    budget_tier: str = Field("mid_range", pattern="^(backpacker|mid_range|business|luxury)$")
    interests: list[str] = []
    age_bracket: str = "adult"
    avoid_crowds: bool = False
    needs_accessibility: bool = False
    preferred_start_time: str = "09:00"
    preferred_end_time: str = "21:00"
    max_stops_per_day: int = Field(5, ge=2, le=10)


class GenerateItineraryRequest(BaseModel):
    trip_id: str | None = None        # If None, creates a new trip
    cities: list[dict]                # [{city, country, arrival_date, departure_date}]
    natural_language_prompt: str      # e.g. "5 days in Rome, I love history and pasta"
    traveler_dna: TravelerDNAInput
    total_budget_inr: float | None = None
    include_flights: bool = True
    include_hotels: bool = True


class GenerateItineraryResponse(BaseModel):
    job_id: str
    trip_id: str
    status: str
    message: str


# ─── File-backed job store ────────────────────────────────────────────────
JB_FILE = "jobs_db.json"

def _load_jobs() -> dict:
    if not os.path.exists(JB_FILE):
        return {}
    with open(JB_FILE, "r") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return {}

def _save_jobs(jobs: dict):
    with open(JB_FILE, "w") as f:
        json.dump(jobs, f, indent=2)

def _store_job(job_id: str, status: str, data: dict = {}) -> None:
    jobs = _load_jobs()
    if job_id not in jobs:
        jobs[job_id] = {}
    jobs[job_id].update({"status": status, "updated_at": datetime.utcnow().isoformat(), **data})
    _save_jobs(jobs)


# ─── Background pipeline task ─────────────────────────────────────────────────
async def _run_generation(job_id: str, trip_id: str, request: GenerateItineraryRequest):
    try:
        _store_job(job_id, "researching")

        # Collect all city data
        all_results = []
        for city_leg in request.cities:
            dates = [city_leg["arrival_date"]]  # expand date range in production

            result = await run_full_pipeline(
                trip_id=trip_id,
                city=f"{city_leg['city']}, {city_leg['country']}",
                dates=dates,
                traveler_profile=request.traveler_dna.model_dump()
            )
            all_results.append(result)

        _store_job(job_id, "completed", {
            "trip_id": trip_id,
            "itinerary": all_results,
            "prompt": request.natural_language_prompt,
        })

    except Exception as e:
        _store_job(job_id, "failed", {"error": str(e)})


# ─── Endpoints ────────────────────────────────────────────────────────────────
@router.post("/generate", response_model=GenerateItineraryResponse, status_code=202)
async def generate_itinerary(
    body: GenerateItineraryRequest,
    background_tasks: BackgroundTasks
):
    """
    Trigger the 3-agent pipeline (Researcher → Optimizer → Concierge).
    Returns immediately with a job_id. Poll /itinerary/{trip_id}/status.
    ---
    Agent flow:
    1. Researcher  — scrapes POIs + events for each city
    2. Optimizer   — clusters by neighborhood, validates schedules
    3. Concierge   — personalizes with Traveler DNA
    """
    trip_id = body.trip_id or str(uuid.uuid4())
    job_id = str(uuid.uuid4())

    _store_job(job_id, "queued", {"trip_id": trip_id})

    background_tasks.add_task(_run_generation, job_id, trip_id, body)

    return GenerateItineraryResponse(
        job_id=job_id,
        trip_id=trip_id,
        status="queued",
        message=f"Pipeline queued for {len(body.cities)} city legs. Poll /itinerary/{trip_id}/status"
    )


@router.get("/{trip_id}/status")
async def get_generation_status(trip_id: str):
    """Poll the status of an AI generation job."""
    jobs = _load_jobs()
    job = next((j for j in jobs.values() if j.get("trip_id") == trip_id), None)
    if not job:
        raise HTTPException(status_code=404, detail="Trip not found")

    return {
        "trip_id": trip_id,
        "status": job["status"],
        "updated_at": job["updated_at"],
        "itinerary": job.get("itinerary"),  # None until completed
        "error": job.get("error"),
    }


@router.get("/{trip_id}/days/{day_number}")
async def get_day_schedule(trip_id: str, day_number: int):
    """Fetch the schedule for a specific day of the trip."""
    jobs = _load_jobs()
    job = next((j for j in jobs.values() if j.get("trip_id") == trip_id), None)
    if not job or job["status"] != "completed":
        raise HTTPException(status_code=404, detail="Itinerary not yet ready")

    all_days = []
    for city_result in job.get("itinerary", []):
        schedule = city_result.get("itinerary", {}).get("personalized_schedule", {})
        if isinstance(schedule, str):
            try:
                schedule = json.loads(schedule)
            except Exception:
                pass
        days = schedule.get("days", []) if isinstance(schedule, dict) else []
        all_days.extend(days)

    if day_number < 1 or day_number > len(all_days):
        raise HTTPException(status_code=404, detail=f"Day {day_number} not found")

    return {"trip_id": trip_id, "day": all_days[day_number - 1]}

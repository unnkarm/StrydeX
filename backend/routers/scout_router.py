from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db

router = APIRouter(prefix="/scout", tags=["scout"])


@router.get("/search", response_model=List[schemas.ScoutResult])
def search_athletes(
    sport: Optional[str] = None,
    position: Optional[str] = None,
    region: Optional[str] = None,
    age_min: Optional[int] = None,
    age_max: Optional[int] = None,
    verified_only: bool = False,
    db: Session = Depends(get_db),
):
    q = db.query(models.AthleteProfile).filter(models.AthleteProfile.visibility != "private")
    if sport:
        q = q.filter(models.AthleteProfile.sport.ilike(f"%{sport}%"))
    if position:
        q = q.filter(models.AthleteProfile.position.ilike(f"%{position}%"))
    if region:
        q = q.filter(models.AthleteProfile.region.ilike(f"%{region}%"))
    if age_min is not None:
        q = q.filter(models.AthleteProfile.age >= age_min)
    if age_max is not None:
        q = q.filter(models.AthleteProfile.age <= age_max)
    if verified_only:
        q = q.filter(models.AthleteProfile.verified == True)  # noqa: E712

    athletes = q.limit(100).all()
    results = []
    for a in athletes:
        score = 60.0
        if sport and a.sport and sport.lower() in a.sport.lower():
            score += 10.0
        if position and a.position and position.lower() in a.position.lower():
            score += 10.0
        if region and a.region and region.lower() in a.region.lower():
            score += 10.0
        if a.verified:
            score += 5.0

        # Performance contribution: average video score or default
        perf_boost = 3.0
        if a.videos:
            valid_scores = [v.score_overall for v in a.videos if v.score_overall is not None]
            if valid_scores:
                perf_boost = (sum(valid_scores) / len(valid_scores)) / 100.0 * 5.0
        score += perf_boost

        # Progress / Verification boost
        score = round(min(100.0, score), 1)

        results.append({
            "username": a.username,
            "name": a.name,
            "sport": a.sport,
            "position": a.position,
            "age": a.age,
            "region": a.region,
            "verified": a.verified,
            "match_pct": score,
        })

    # Sort descending by match percentage
    results.sort(key=lambda x: x["match_pct"], reverse=True)
    return results


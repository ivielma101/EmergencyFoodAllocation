from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List

from solver import solve_food_survival_buckets_with_waste

app = FastAPI(title="Food Allocation Optimizer")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class Bucket(BaseModel):
    name:     str
    calories: float = Field(..., gt=0)
    last_day: Optional[int] = Field(None, ge=1)

class OptimizeRequest(BaseModel):
    buckets:             List[Bucket]
    people:              int   = Field(..., ge=1)
    calories_per_person: float = Field(..., gt=0)
    H:                   int   = Field(365, ge=1)
    enforce_no_waste:    bool  = True

@app.post("/optimize")
def optimize(req: OptimizeRequest):
    if not req.buckets:
        raise HTTPException(status_code=400, detail="At least one bucket is required.")

    result = solve_food_survival_buckets_with_waste(
        buckets             = [b.dict() for b in req.buckets],
        people              = req.people,
        calories_per_person = req.calories_per_person,
        H                   = req.H,
        enforce_no_waste    = req.enforce_no_waste,
    )

    if result["status"] not in ("Optimal", "Feasible"):
        raise HTTPException(status_code=422, detail=f"Solver returned: {result['status']}")

    return result

@app.get("/health")
def health():
    return {"status": "ok"}
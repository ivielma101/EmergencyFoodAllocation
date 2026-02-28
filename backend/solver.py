#copy and past of Ians code
import json
from collections import defaultdict
import pulp as pl


def solve_food_survival_buckets_with_waste(
    buckets,                   # [{"name": str, "calories": float, "last_day": int | None}]
    people,
    calories_per_person,
    H=365,
    enforce_no_waste=True,     # if True, no consumption on days you don't survive
    solver_msg=False,
):
    D    = people * calories_per_person
    days = range(1, H + 1)
    B    = range(len(buckets))

    m = pl.LpProblem("EmergencyFoodAllocation", pl.LpMaximize)

    x = pl.LpVariable.dicts("x", (B, days), lowBound=0)
    y = pl.LpVariable.dicts("y", days, cat="Binary")

    m += pl.lpSum(y[t] for t in days)

    for t in days:
        m += pl.lpSum(x[b][t] for b in B) >= D * y[t], f"daily_min_{t}"
        if enforce_no_waste:
            m += pl.lpSum(x[b][t] for b in B) <= D * y[t], f"daily_max_{t}"

    for t in range(1, H):
        m += y[t] >= y[t + 1], f"consecutive_{t}"

    for b in B:
        Qb = float(buckets[b]["calories"])
        Lb = buckets[b]["last_day"]
        m += pl.lpSum(x[b][t] for t in days) <= Qb, f"inventory_{b}"
        if Lb is not None:
            for t in days:
                if t > int(Lb):
                    m += x[b][t] == 0, f"expiry_b{b}_t{t}"

    m.solve(pl.PULP_CBC_CMD(msg=solver_msg))
    status_str = pl.LpStatus[m.status]

    if status_str not in ("Optimal", "Feasible"):
        return {
            "status": status_str,
            "max_days": 0,
            "schedule": [],
            "waste_by_day": [],
            "total_waste_by_bucket": {},
        }

    max_days = int(round(sum(pl.value(y[t]) for t in days)))

    # --- schedule ---
    schedule = []
    consumed_by_bucket          = {b: 0.0 for b in B}
    consumed_cum_by_day_bucket  = {b: {}  for b in B}

    for t in days:
        row   = {"day": t, "survived": int(round(pl.value(y[t])))}
        total = 0.0
        for b in B:
            val              = float(pl.value(x[b][t]))
            row[buckets[b]["name"]] = round(val, 4)
            total           += val
            consumed_by_bucket[b]          += val
            consumed_cum_by_day_bucket[b][t] = consumed_by_bucket[b]
        row["total"] = round(total, 4)
        schedule.append(row)

    # --- waste by day ---
    waste_day_totals    = defaultdict(float)
    waste_day_breakdown = defaultdict(dict)
    total_waste_by_bucket = {}

    for b in B:
        name = buckets[b]["name"]
        Qb   = float(buckets[b]["calories"])
        Lb   = buckets[b]["last_day"]

        if Lb is None:
            total_waste_by_bucket[name] = 0.0
            continue

        Lb              = int(Lb)
        consumed        = consumed_cum_by_day_bucket[b].get(min(Lb, max_days), 0.0)
        waste           = max(0.0, Qb - consumed)

        total_waste_by_bucket[name]   = round(waste, 4)
        waste_day_totals[Lb]         += waste
        waste_day_breakdown[Lb][name] = round(waste, 4)

    waste_by_day = []
    for t in days:
        if waste_day_totals.get(t, 0.0) > 0:
            row = {"day": t, "waste_total": round(float(waste_day_totals[t]), 4)}
            row.update({k: float(v) for k, v in waste_day_breakdown[t].items()})
            waste_by_day.append(row)

    return {
        "status":                status_str,
        "max_days":              max_days,
        "schedule":              schedule,
        "waste_by_day":          waste_by_day,
        "total_waste_by_bucket": total_waste_by_bucket,
    }
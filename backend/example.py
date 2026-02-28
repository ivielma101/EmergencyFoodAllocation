#copy and paste of ians example
import json
import argparse
from solver import solve_food_survival_buckets_with_waste

buckets = [
    {"name": "exp_1d", "calories": 500_000, "last_day": 1},
    {"name": "exp_3d", "calories": 150_000, "last_day": 3},
    {"name": "exp_7d", "calories": 350_000, "last_day": 7},
    {"name": "never",  "calories": 500_000, "last_day": None},
]

people            = 50
calories_per_person = 2_000
H                 = 60

res = solve_food_survival_buckets_with_waste(
    buckets             = buckets,
    people              = people,
    calories_per_person = calories_per_person,
    H                   = H,
    enforce_no_waste    = True,
)

parser = argparse.ArgumentParser()
parser.add_argument("--json", action="store_true", help="Print raw JSON output")
args, _ = parser.parse_known_args()

if args.json:
    print(json.dumps(res, indent=2))
else:
    print(f"Status   : {res['status']}")
    print(f"Max days : {res['max_days']}")

    print("\nSchedule (survived days only):")
    for row in res["schedule"][: res["max_days"]]:
        print(" ", row)

    print("\nTotal waste by bucket:")
    for name, cal in res["total_waste_by_bucket"].items():
        print(f"  {name}: {cal:,.0f} cal")

    print("\nWaste by day (nonzero rows):")
    for row in res["waste_by_day"]:
        print(" ", row)


############ EXPECTED RESULT ###############
# Status: Optimal
# Max survived days: 11
# {'day': 1, 'survived': 1, 'exp_1d': 100000.0, 'exp_3d': 0.0, 'exp_7d': 0.0, 'never': 0.0, 'total': 100000.0}
# {'day': 2, 'survived': 1, 'exp_1d': 0.0, 'exp_3d': 50000.0, 'exp_7d': 50000.0, 'never': 0.0, 'total': 100000.0}
# {'day': 3, 'survived': 1, 'exp_1d': 0.0, 'exp_3d': 100000.0, 'exp_7d': 0.0, 'never': 0.0, 'total': 100000.0}
# {'day': 4, 'survived': 1, 'exp_1d': 0.0, 'exp_3d': 0.0, 'exp_7d': -4.8520071e-11, 'never': 100000.0, 'total': 99999.99999999996}
# {'day': 5, 'survived': 1, 'exp_1d': 0.0, 'exp_3d': 0.0, 'exp_7d': 100000.0, 'never': 0.0, 'total': 100000.0}
# {'day': 6, 'survived': 1, 'exp_1d': 0.0, 'exp_3d': 0.0, 'exp_7d': 100000.0, 'never': 0.0, 'total': 100000.0}
# {'day': 7, 'survived': 1, 'exp_1d': -3.5950935e-11, 'exp_3d': 0.0, 'exp_7d': 100000.0, 'never': 0.0, 'total': 99999.99999999997}
# {'day': 8, 'survived': 1, 'exp_1d': 0.0, 'exp_3d': 0.0, 'exp_7d': 0.0, 'never': 100000.0, 'total': 100000.0}
# {'day': 9, 'survived': 1, 'exp_1d': 0.0, 'exp_3d': 0.0, 'exp_7d': 0.0, 'never': 100000.0, 'total': 100000.0}
# {'day': 10, 'survived': 1, 'exp_1d': 0.0, 'exp_3d': 0.0, 'exp_7d': 0.0, 'never': 100000.0, 'total': 100000.0}
# {'day': 11, 'survived': 1, 'exp_1d': 0.0, 'exp_3d': 0.0, 'exp_7d': 0.0, 'never': 100000.0, 'total': 100000.0}

# Total waste by bucket:
#   exp_1d: 400,000 calories
#   exp_3d: 0 calories
#   exp_7d: 0 calories
#   never: 0 calories

# Waste by day (nonzero rows):
# {'day': 1, 'waste_total': 400000.0, 'exp_1d': 400000.0}
# {'day': 7, 'waste_total': 5.820766091346741e-11, 'exp_7d': 5.820766091346741e-11}


#!/usr/bin/env python3
"""Build Average Winning Distance analytics from the stored race records."""

import json
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def average(values):
    return round(sum(values) / len(values), 1) if values else None


def percentile(values, value):
    if len(values) <= 1:
        return 0.5
    below = sum(item < value for item in values)
    equal = sum(item == value for item in values)
    return (below + (equal - 1) / 2) / (len(values) - 1)


def main():
    horses = json.loads((ROOT / "data" / "horses.json").read_text())
    by_id = {str(horse["id"]): horse for horse in horses}
    all_distances = []
    surface_distances = defaultdict(list)
    crop_distances = defaultdict(lambda: defaultdict(list))
    horse_rows = []

    for path in sorted((ROOT / "data" / "horses").glob("*.json"), key=lambda item: int(item.stem)):
        detail = json.loads(path.read_text())
        horse = by_id.get(path.stem, detail.get("horse", {}))
        wins = [
            race for race in detail.get("races", [])
            if race.get("finish") == 1
            and race.get("surface") in {"芝", "ダ"}
            and isinstance(race.get("distance_m"), (int, float))
            and race.get("distance_m") > 0
        ]
        distances = [race["distance_m"] for race in wins]
        turf = [race["distance_m"] for race in wins if race["surface"] == "芝"]
        dirt = [race["distance_m"] for race in wins if race["surface"] == "ダ"]
        all_distances.extend(distances)
        surface_distances["芝"].extend(turf)
        surface_distances["ダ"].extend(dirt)
        crop = str(horse.get("birth_year") or "")
        crop_distances[crop]["overall"].extend(distances)
        crop_distances[crop]["turf"].extend(turf)
        crop_distances[crop]["dirt"].extend(dirt)
        if len(distances) >= 2 and horse.get("dosage_index") is not None and horse.get("center_of_distribution") is not None:
            horse_rows.append({
                "horse_id": horse.get("id"),
                "name": horse.get("name"),
                "hkjc_name_zh": horse.get("hkjc_name_zh"),
                "wins": len(distances),
                "overall_awd": average(distances),
                "turf_awd": average(turf),
                "dirt_awd": average(dirt),
                "di": horse.get("dosage_index"),
                "cd": horse.get("center_of_distribution"),
            })

    awds = [row["overall_awd"] for row in horse_rows]
    inverse_dis = [-float(row["di"]) for row in horse_rows]
    inverse_cds = [-float(row["cd"]) for row in horse_rows]
    for row in horse_rows:
        race_stamina = percentile(awds, row["overall_awd"])
        pedigree_stamina = (
            percentile(inverse_dis, -float(row["di"]))
            + percentile(inverse_cds, -float(row["cd"]))
        ) / 2
        row["race_stamina_percentile"] = round(race_stamina, 3)
        row["pedigree_stamina_percentile"] = round(pedigree_stamina, 3)
        row["stamina_gap"] = round(race_stamina - pedigree_stamina, 2)

    horse_rows.sort(key=lambda row: (-abs(row["stamina_gap"]), -row["wins"], row["name"]))
    output = {
        "summary": {
            "overall_awd": average(all_distances),
            "turf_awd": average(surface_distances["芝"]),
            "dirt_awd": average(surface_distances["ダ"]),
            "overall_wins": len(all_distances),
            "turf_wins": len(surface_distances["芝"]),
            "dirt_wins": len(surface_distances["ダ"]),
        },
        "by_crop": [
            {
                "label": crop,
                "overall_awd": average(values["overall"]),
                "turf_awd": average(values["turf"]),
                "dirt_awd": average(values["dirt"]),
                "wins": len(values["overall"]),
            }
            for crop, values in sorted(crop_distances.items()) if crop
        ],
        "discrepancies": horse_rows[:30],
        "method": "AWD is the arithmetic mean of recorded flat-race winning distances. The discrepancy compares percentile ranks for AWD and the inverse of DI/CD among horses with at least two wins.",
    }
    (ROOT / "data" / "analytics" / "awd.json").write_text(
        json.dumps(output, ensure_ascii=False, indent=2) + "\n"
    )


if __name__ == "__main__":
    main()

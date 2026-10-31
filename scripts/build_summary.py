"""Rebuild only catalogue-owned summary counts and filter facets."""
from __future__ import annotations

import copy
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any, Callable

ROOT = Path(__file__).resolve().parents[1]
CURRENT_FACET_FIELDS = (
    "breeders",
    "broodmareSires",
    "femaleFamilies",
    "damAgeBuckets",
    "bmsLines",
    "achievements",
    "breeding",
    "colors",
    "regions",
)


def read(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write(path: Path, value: Any) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def dam_age_bucket(horse: dict[str, Any]) -> str:
    age = horse.get("dam_age_at_foaling")
    if age is None or age == "":
        return "未知"
    number = int(age)
    if number <= 6:
        return "3-6"
    if number <= 10:
        return "7-10"
    if number <= 14:
        return "11-14"
    if number <= 18:
        return "15-18"
    return "19+"


def counted_facet(
    horses: list[dict[str, Any]],
    value_for: Callable[[dict[str, Any]], Any],
    previous_rows: list[dict[str, Any]] | None = None,
) -> list[dict[str, Any]]:
    counter = Counter()
    for horse in horses:
        value = value_for(horse)
        if value is None or value == "":
            continue
        counter[str(value)] += 1
    current = {
        value: {"value": value, "count": count}
        for value, count in counter.items()
    }
    ordered = [
        current[str(row.get("value"))]
        for row in previous_rows or []
        if isinstance(row, dict) and str(row.get("value")) in current
    ]
    existing_values = {row["value"] for row in ordered}
    ordered.extend(
        {"value": value, "count": count}
        for value, count in sorted(counter.items(), key=lambda item: -item[1])
        if value not in existing_values
    )
    return ordered


def owned_summary_fields(
    horses: list[dict[str, Any]],
    previous: dict[str, Any],
) -> dict[str, Any]:
    previous_facets = previous.get("facets") if isinstance(previous.get("facets"), dict) else {}
    current_facets = {
        "breeders": counted_facet(horses, lambda horse: horse.get("breeder"), previous_facets.get("breeders")),
        "broodmareSires": counted_facet(horses, lambda horse: horse.get("broodmare_sire"), previous_facets.get("broodmareSires")),
        "femaleFamilies": counted_facet(horses, lambda horse: horse.get("female_family"), previous_facets.get("femaleFamilies")),
        "damAgeBuckets": counted_facet(horses, dam_age_bucket, previous_facets.get("damAgeBuckets")),
        "bmsLines": counted_facet(horses, lambda horse: horse.get("bms_line"), previous_facets.get("bmsLines")),
        "achievements": counted_facet(horses, lambda horse: horse.get("achievement_class"), previous_facets.get("achievements")),
        "breeding": counted_facet(horses, lambda horse: horse.get("breeding_role"), previous_facets.get("breeding")),
        "colors": counted_facet(horses, lambda horse: horse.get("color"), previous_facets.get("colors")),
        "regions": counted_facet(horses, lambda horse: horse.get("trainer_region"), previous_facets.get("regions")),
    }
    years = sorted(
        {
            int(horse["birth_year"])
            for horse in horses
            if str(horse.get("birth_year") or "").isdigit()
        },
        reverse=True,
    )
    sex_counts = Counter(
        str(horse["sex"])
        for horse in horses
        if horse.get("sex") not in (None, "")
    )
    return {
        "horses": len(horses),
        "jbis_horses": sum(
            bool(re.fullmatch(r"\d+", str(horse.get("jbis_id") or "")))
            for horse in horses
        ),
        "netkeiba_horses": sum(
            bool(re.fullmatch(r"\d+", str(horse.get("netkeiba_id") or "")))
            for horse in horses
        ),
        "min_year": min(years) if years else None,
        "max_year": max(years) if years else None,
        "sexes": [
            {"sex": sex, "count": count}
            for sex, count in sorted(sex_counts.items(), key=lambda item: (-item[1], item[0]))
        ],
        "facets": {
            **previous_facets,
            "years": years,
            **current_facets,
        },
    }


def build_summary(previous: dict[str, Any], horses: list[dict[str, Any]]) -> dict[str, Any]:
    """Return a summary with only catalogue-owned fields replaced."""
    result = copy.deepcopy(previous)
    result.update(owned_summary_fields(horses, previous))
    return result


def summary_mismatches(summary: dict[str, Any], horses: list[dict[str, Any]]) -> list[str]:
    expected = owned_summary_fields(horses, summary)
    mismatches = []
    for key in ("horses", "jbis_horses", "netkeiba_horses", "min_year", "max_year", "sexes"):
        if summary.get(key) != expected[key]:
            mismatches.append(key)
    expected_facets = expected["facets"]
    actual_facets = summary.get("facets") or {}
    if actual_facets.get("years") != expected_facets["years"]:
        mismatches.append("facets.years")
    for key in CURRENT_FACET_FIELDS:
        if actual_facets.get(key) != expected_facets[key]:
            mismatches.append(f"facets.{key}")
    return mismatches


def build(root: Path = ROOT) -> None:
    data = root / "data"
    horses = read(data / "horses.json")
    summary_path = data / "summary.json"
    previous = read(summary_path)
    write(summary_path, build_summary(previous, horses))


if __name__ == "__main__":
    build()

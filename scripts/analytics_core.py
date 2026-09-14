from __future__ import annotations

import json
import re
import statistics
import unicodedata
from collections import Counter, defaultdict
from datetime import date, datetime
from itertools import combinations
from pathlib import Path
from typing import Any


GRADED_CLASSES = {"G1", "G2", "G3"}
STAKES_CLASSES = {"G1", "G2", "G3", "Listed"}
BMS_CATEGORIES = [
    "Sunday Silence",
    "Turn-to",
    "Northern Dancer",
    "Nasrullah",
    "Native Dancer",
    "Hampton",
    "St. Simon",
    "Other",
]
ROOT = Path(__file__).resolve().parents[1]
LEADING_SIRE_PATH = ROOT / ".github" / "sync" / "leading_sire_rankings.json"
JRA_COURSES = ["札幌", "函館", "福島", "新潟", "東京", "中山", "中京", "京都", "阪神", "小倉"]
NAR_COURSES = [
    "門別", "盛岡", "水沢", "浦和", "船橋", "大井", "川崎", "金沢", "笠松", "名古屋",
    "園田", "姫路", "高知", "佐賀",
]
OVERSEAS_COURSE_MAP = {
    "ロンシャン": "ParisLongchamp",
    "ParisLongchamp": "ParisLongchamp",
    "アスコット": "Ascot",
    "Ascot": "Ascot",
    "メイダン": "Meydan",
    "Meydan": "Meydan",
    "シャティン": "Sha Tin",
    "Sha Tin": "Sha Tin",
    "ドーヴィル": "Deauville",
    "Deauville": "Deauville",
    "キングアブドゥル": "King Abdulaziz",
    "King Abdulaziz": "King Abdulaziz",
    "Terang": "Terang",
    "Ballarat Synthetic": "Ballarat Synthetic",
    "Seymour": "Seymour",
    "Cranbourne": "Cranbourne",
    "Flemington": "Flemington",
    "Sandown-Lakeside": "Sandown-Lakeside",
    "Pakenham Synthetic": "Pakenham Synthetic",
    "Bendigo": "Bendigo",
}
BREEDER_ALIASES = {
    "ノーザンF": "ノーザンファーム",
    "ノーザンファーム": "ノーザンファーム",
    "Northern Farm": "ノーザンファーム",
    "社台F": "社台ファーム",
    "社台ファーム": "社台ファーム",
    "Shadai Farm": "社台ファーム",
    "白老ファーム": "社台コーポレーション白老ファーム",
    "社台コーポレーション白老ファーム": "社台コーポレーション白老ファーム",
    "追分F": "追分ファーム",
    "追分ファーム": "追分ファーム",
}


def row_to_dict(row: Any) -> dict[str, Any]:
    return {key: row[key] for key in row.keys()}


def clean_group(value: Any, fallback: str = "未分類") -> str:
    text = str(value or "").strip()
    return text if text else fallback


def safe_number(value: Any) -> float:
    if value is None:
        return 0.0
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def normalize_text(value: Any) -> str:
    return unicodedata.normalize("NFKC", str(value or "").strip())


def canonical_breeder(value: Any) -> str:
    text = normalize_text(value)
    if not text:
        return "未分類"
    return BREEDER_ALIASES.get(text, text)


def breeder_group(value: Any) -> str:
    breeder = canonical_breeder(value)
    if breeder in {"ノーザンファーム", "社台ファーム", "社台コーポレーション白老ファーム", "追分ファーム"}:
        return "社台系"
    return "Other"


def canonical_racecourse(value: Any) -> tuple[str, str, str]:
    text = normalize_text(value)
    if not text:
        return "Unknown", "Unknown", "Unknown"
    for course in JRA_COURSES:
        if course in text:
            return course, "JRA", "Japan"
    for course in NAR_COURSES:
        if course in text:
            return course, "NAR", "Japan"
    for key, course in OVERSEAS_COURSE_MAP.items():
        if key in text:
            return course, "Overseas", "Overseas"
    return text, "Other", "Unknown"


def is_valid_start(race: dict[str, Any]) -> bool:
    return isinstance(race.get("finish"), int) and race.get("finish") > 0


def distance_bucket(distance: Any) -> str:
    distance_m = int(distance or 0)
    if not distance_m:
        return "Unknown"
    if distance_m <= 1200:
        return "1200以下"
    if distance_m <= 1600:
        return "1400-1600"
    if distance_m <= 2000:
        return "1800-2000"
    if distance_m <= 2400:
        return "2200-2400"
    return "2500以上"


def parse_career(value: str | None) -> tuple[int, int]:
    text = value or ""
    starts_match = re.search(r"(\d+)戦", text)
    starts = int(starts_match.group(1)) if starts_match else 0
    record_match = re.search(r"\[\s*(\d+)-", text)
    wins = int(record_match.group(1)) if record_match else 0
    return starts, wins


def parse_race_year(value: Any) -> int | None:
    text = str(value or "").strip()
    if not text:
        return None
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y.%m.%d"):
        try:
            return datetime.strptime(text, fmt).year
        except ValueError:
            pass
    match = re.search(r"(20\d{2}|19\d{2})", text)
    return int(match.group(1)) if match else None


def median(values: list[float]) -> float | None:
    return round(statistics.median(values), 1) if values else None


def quantile(values: list[float], fraction: float) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    index = (len(ordered) - 1) * fraction
    low = int(index)
    high = min(low + 1, len(ordered) - 1)
    if low == high:
        return round(ordered[low], 1)
    return round(ordered[low] + (ordered[high] - ordered[low]) * (index - low), 1)


def rate(numerator: int | float, denominator: int | float) -> float | None:
    return round(float(numerator) / float(denominator), 4) if denominator else None


def blank_metrics(label: str) -> dict[str, Any]:
    return {
        "label": label,
        "foals": 0,
        "runners": 0,
        "winners": 0,
        "graded_winners": 0,
        "stakes_winners": 0,
        "g1_winners": 0,
        "total_earnings": 0.0,
        "earnings_values": [],
        "runner_earnings_values": [],
        "representatives": [],
    }


def add_horse(metrics: dict[str, Any], horse: dict[str, Any]) -> None:
    starts, wins = parse_career(horse.get("career_summary"))
    earnings = safe_number(horse.get("earnings_netkeiba") if horse.get("earnings_netkeiba") is not None else horse.get("earnings_jbis"))
    achievement = clean_group(horse.get("achievement_class"), "")
    is_runner = starts > 0 or horse.get("race_count", 0) > 0
    is_winner = wins > 0

    metrics["foals"] += 1
    metrics["total_earnings"] += earnings
    metrics["earnings_values"].append(earnings)
    if is_runner:
        metrics["runners"] += 1
        metrics["runner_earnings_values"].append(earnings)
    if is_winner:
        metrics["winners"] += 1
    if achievement in GRADED_CLASSES:
        metrics["graded_winners"] += 1
    if achievement in STAKES_CLASSES:
        metrics["stakes_winners"] += 1
    if achievement == "G1":
        metrics["g1_winners"] += 1
    if achievement in STAKES_CLASSES:
        metrics["representatives"].append({
            "name": horse.get("name"),
            "hkjc_name_zh": horse.get("hkjc_name_zh"),
            "achievement_class": achievement,
            "major_win": horse.get("major_win"),
            "earnings": earnings,
        })


def finalize_metrics(metrics: dict[str, Any]) -> dict[str, Any]:
    foals = metrics["foals"]
    runners = metrics["runners"]
    winners = metrics["winners"]
    runner_earnings = metrics.pop("runner_earnings_values")
    earnings_values = metrics.pop("earnings_values")
    reps = sorted(metrics["representatives"], key=lambda row: row.get("earnings") or 0, reverse=True)[:5]
    metrics["representatives"] = reps
    metrics["total_earnings"] = round(metrics["total_earnings"], 1)
    metrics["runner_rate"] = rate(runners, foals)
    metrics["winner_foal_rate"] = rate(winners, foals)
    metrics["winner_runner_rate"] = rate(winners, runners)
    metrics["graded_foal_rate"] = rate(metrics["graded_winners"], foals)
    metrics["graded_runner_rate"] = rate(metrics["graded_winners"], runners)
    metrics["g1_foal_rate"] = rate(metrics["g1_winners"], foals)
    metrics["avg_earnings_per_foal"] = round(metrics["total_earnings"] / foals, 1) if foals else None
    metrics["avg_earnings_per_runner"] = round(metrics["total_earnings"] / runners, 1) if runners else None
    metrics["median_earnings_per_runner"] = median(runner_earnings)
    metrics["earnings_q25"] = quantile(earnings_values, 0.25)
    metrics["earnings_q75"] = quantile(earnings_values, 0.75)
    metrics["max_earnings"] = round(max(earnings_values), 1) if earnings_values else None
    return metrics


def load_horses(conn: Any) -> list[dict[str, Any]]:
    horses = [row_to_dict(row) for row in conn.execute(
        """
        select id, name, name_en, hkjc_name_zh, sex, birth_year, birth_date, color, dam,
               broodmare_sire, bms_line, female_family, pedigree_crosses,
               career_summary, major_win, achievement_class,
               earnings_netkeiba, earnings_jbis, breeder,
               dam_birth_date, dam_birth_year, foal_birth_date, dam_age_at_foaling,
               dam_age_precision, foal_order, dam_netkeiba_id, dam_jbis_id,
               dam_biological_parity, dam_registered_foal_order, dam_covering_sequence,
               dam_parity_basis, parity_confidence, parity_source_name, parity_source_url,
               dam_career_summary, dam_earnings, dam_major_win, dam_known_foals,
               dam_known_winners, dam_known_graded_winners, dam_siblings_json,
               dam_other_sire_foals_json, dam_metadata_source, dam_metadata_status
        from horses
        """
    )]
    race_counts = {
        row["horse_id"]: row["race_count"]
        for row in conn.execute("select horse_id, count(*) as race_count from race_results group by horse_id")
    }
    for horse in horses:
        horse["race_count"] = race_counts.get(horse["id"], 0)
    return horses


def load_races(conn: Any) -> list[dict[str, Any]]:
    return [row_to_dict(row) for row in conn.execute(
        """
        select rr.horse_id, h.name, h.hkjc_name_zh, h.sex, h.birth_year, h.breeder,
               rr.race_date,
               rr.meeting, rr.race_name, rr.race_url, rr.finish, rr.surface, rr.distance_m, rr.prize
        from race_results rr
        join horses h on h.id = rr.horse_id
        """
    )]


def grouped_metrics(horses: list[dict[str, Any]], key: str, fallback: str = "未分類") -> list[dict[str, Any]]:
    groups: dict[str, dict[str, Any]] = {}
    for horse in horses:
        label = clean_group(horse.get(key), fallback)
        groups.setdefault(label, blank_metrics(label))
        add_horse(groups[label], horse)
    return sorted((finalize_metrics(group) for group in groups.values()), key=lambda row: (-row["foals"], row["label"]))


def bms_line_metrics(horses: list[dict[str, Any]]) -> list[dict[str, Any]]:
    groups = {label: blank_metrics(label) for label in BMS_CATEGORIES}
    for horse in horses:
        label = clean_group(horse.get("bms_line"), "Other")
        if label not in groups:
            label = "Other"
        add_horse(groups[label], horse)
    return [finalize_metrics(groups[label]) for label in BMS_CATEGORIES]


def clean_ancestor(value: str) -> str:
    text = re.sub(r"\s+", " ", value).strip(" ,、;；")
    return text


def split_positions(value: str) -> list[str]:
    return re.findall(r"[SM]\d+", value.replace("×", "x"))


def canonical_positions(positions: list[str]) -> list[str]:
    return sorted(positions, key=lambda item: (0 if item[0] == "S" else 1, int(item[1:])))


def canonical_pattern(positions: list[str]) -> str:
    return "x".join(canonical_positions(positions))


def pair_patterns(positions: list[str]) -> list[str]:
    pairs = []
    for left, right in combinations(canonical_positions(positions), 2):
        pairs.append(f"{left}x{right}")
    return pairs


def cross_intensity(positions: list[str]) -> str:
    generations = [int(position[1:]) for position in positions]
    if not generations:
        return "Unknown"
    ordered = sorted(generations)
    return "x".join(str(value) for value in ordered)


def parse_crosses(text: str | None) -> list[dict[str, Any]]:
    raw = text or ""
    entry_re = re.compile(r"([^：:]+?)\s*[：:]\s*((?:[SM]\d+(?:[×x][SM]\d+)+))")
    entries = []
    for match in entry_re.finditer(raw):
        ancestor = clean_ancestor(match.group(1))
        positions = split_positions(match.group(2))
        if not ancestor or len(positions) < 2:
            continue
        country_match = re.search(r"\(([A-Z]{2,3})\)$", ancestor)
        entries.append({
            "ancestor": ancestor,
            "ancestor_country": country_match.group(1) if country_match else "",
            "positions": canonical_positions(positions),
            "canonical_pattern": canonical_pattern(positions),
            "pair_patterns": pair_patterns(positions),
            "branch_count": len(positions),
            "intensity": cross_intensity(positions),
        })
    return entries


def add_unique_horse(groups: dict[str, dict[str, Any]], label: str, horse: dict[str, Any]) -> None:
    group = groups.setdefault(label, {"metrics": blank_metrics(label), "horse_ids": set()})
    if horse["id"] in group["horse_ids"]:
        return
    group["horse_ids"].add(horse["id"])
    add_horse(group["metrics"], horse)


def finish_grouped_metrics(groups: dict[str, dict[str, Any]], *, limit: int | None = None) -> list[dict[str, Any]]:
    rows = [finalize_metrics(group["metrics"]) for group in groups.values()]
    rows.sort(key=lambda row: (-row["foals"], -row["graded_winners"], -row["total_earnings"], row["label"]))
    return rows[:limit] if limit else rows


def cross_summary(horses: list[dict[str, Any]]) -> dict[str, Any]:
    ancestor_groups: dict[str, dict[str, Any]] = {}
    combo_groups: dict[str, dict[str, Any]] = {}
    structure_groups: dict[str, dict[str, Any]] = {}
    pair_groups: dict[str, dict[str, Any]] = {}
    sm_structure_groups: dict[str, dict[str, Any]] = {}
    sm_structure_ancestors: dict[str, dict[str, Any]] = defaultdict(lambda: {"ancestors": Counter(), "representatives": []})
    parsed_entries = 0
    horses_with_cross = 0
    for horse in horses:
        entries = parse_crosses(horse.get("pedigree_crosses"))
        if entries:
            horses_with_cross += 1
        for entry in entries:
            parsed_entries += 1
            ancestor = entry["ancestor"]
            pattern = entry["canonical_pattern"]
            add_unique_horse(ancestor_groups, ancestor, horse)
            add_unique_horse(combo_groups, f"{ancestor}|{pattern}", horse)
            combo_groups[f"{ancestor}|{pattern}"]["metrics"]["ancestor"] = ancestor
            combo_groups[f"{ancestor}|{pattern}"]["metrics"]["pattern"] = pattern
            combo_groups[f"{ancestor}|{pattern}"]["metrics"]["branch_count"] = entry["branch_count"]
            combo_groups[f"{ancestor}|{pattern}"]["metrics"]["intensity"] = entry["intensity"]
            add_unique_horse(structure_groups, pattern, horse)
            structure_groups[pattern]["metrics"]["branch_count"] = entry["branch_count"]
            structure_groups[pattern]["metrics"]["intensity"] = entry["intensity"]
            for pair in entry["pair_patterns"]:
                add_unique_horse(pair_groups, pair, horse)
            sire_positions = [pos for pos in entry["positions"] if pos.startswith("S")]
            dam_positions = [pos for pos in entry["positions"] if pos.startswith("M")]
            for sire_pos in sire_positions:
                for dam_pos in dam_positions:
                    if sire_pos not in {"S2", "S3", "S4", "S5"} or dam_pos not in {"M2", "M3", "M4", "M5"}:
                        continue
                    sm_key = f"{sire_pos}x{dam_pos}"
                    add_unique_horse(sm_structure_groups, sm_key, horse)
                    sm_structure_ancestors[sm_key]["ancestors"][ancestor] += 1
                    if horse.get("achievement_class") in STAKES_CLASSES:
                        sm_structure_ancestors[sm_key]["representatives"].append({
                            "name": horse.get("name"),
                            "achievement_class": horse.get("achievement_class"),
                            "earnings": safe_number(horse.get("earnings_netkeiba") if horse.get("earnings_netkeiba") is not None else horse.get("earnings_jbis")),
                        })

    sm_rows = finish_grouped_metrics(sm_structure_groups, limit=None)
    for row in sm_rows:
        extra = sm_structure_ancestors[row["label"]]
        row["sire_generation"] = row["label"].split("x")[0]
        row["dam_generation"] = row["label"].split("x")[1]
        row["ancestors"] = [
            {"ancestor": name, "foals": count}
            for name, count in extra["ancestors"].most_common(12)
        ]
        row["representatives"] = sorted(
            row["representatives"] + extra["representatives"],
            key=lambda item: item.get("earnings") or 0,
            reverse=True,
        )[:5]

    return {
        "summary": {
            "horses": len(horses),
            "horses_with_cross": horses_with_cross,
            "parsed_entries": parsed_entries,
            "note": "Cross groups are non-mutually exclusive; one horse can contribute to multiple ancestor and pattern groups.",
        },
        "ancestors": finish_grouped_metrics(ancestor_groups, limit=80),
        "ancestor_patterns": sorted(
            finish_grouped_metrics(combo_groups, limit=120),
            key=lambda row: (-row["foals"], -row["graded_winners"], -row["total_earnings"], row.get("ancestor", ""), row.get("pattern", "")),
        ),
        "structures": finish_grouped_metrics(structure_groups, limit=80),
        "pair_patterns": finish_grouped_metrics(pair_groups, limit=80),
        "sm_structures": sm_rows,
    }


def pedigree_chart_payload(cross: dict[str, Any], female_families: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "cross_bubble": cross["ancestors"],
        "structure_heatmap": cross["sm_structures"],
        "ancestor_form_comparison": cross["ancestor_patterns"],
        "female_family_scatter": female_families,
        "defaults": {
            "min_foals": 5,
            "small_sample": 5,
            "metrics": ["graded_foal_rate", "winner_foal_rate", "median_earnings_per_runner", "avg_earnings_per_foal"],
        },
        "source": "Cross资料结合JBIS血统信息与马匹成绩整理。",
        "updated_at": date.today().isoformat(),
    }


def overview(horses: list[dict[str, Any]], races: list[dict[str, Any]]) -> dict[str, Any]:
    metrics = blank_metrics("Duramente")
    for horse in horses:
        add_horse(metrics, horse)
    finished = finalize_metrics(metrics)
    winning_distances = [race["distance_m"] for race in races if race.get("finish") == 1 and race.get("distance_m")]
    finished["awd"] = round(sum(winning_distances) / len(winning_distances), 1) if winning_distances else None
    finished["winning_distance_count"] = len(winning_distances)
    finished["generation_range"] = f"{min(h['birth_year'] for h in horses)}-{max(h['birth_year'] for h in horses)}"
    bms_counter = Counter(clean_group(horse.get("broodmare_sire"), "未分類") for horse in horses)
    finished["most_common_broodmare_sire"] = {
        "name": bms_counter.most_common(1)[0][0],
        "count": bms_counter.most_common(1)[0][1],
    }
    return {
        "summary": finished,
        "last_updated": date.today().isoformat(),
    }


def crop_metrics(horses: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows = grouped_metrics(horses, "birth_year", "未分類")
    return sorted(rows, key=lambda row: row["label"], reverse=True)


def horse_win_count(horse: dict[str, Any]) -> int:
    return parse_career(horse.get("career_summary"))[1]


def add_sire_horse_metrics(row: dict[str, Any], horse: dict[str, Any]) -> None:
    starts, wins = parse_career(horse.get("career_summary"))
    earnings = safe_number(horse.get("earnings_netkeiba") if horse.get("earnings_netkeiba") is not None else horse.get("earnings_jbis"))
    achievement = clean_group(horse.get("achievement_class"), "")
    row["foals"] += 1
    row["runners"] += 1 if starts > 0 or horse.get("race_count", 0) > 0 else 0
    row["winners"] += 1 if wins > 0 else 0
    row["two_win_horses"] += 1 if wins >= 2 else 0
    row["three_win_horses"] += 1 if wins >= 3 else 0
    row["g1_horses"] += 1 if achievement == "G1" else 0
    row["g2_horses"] += 1 if achievement == "G2" else 0
    row["g3_horses"] += 1 if achievement == "G3" else 0
    row["graded_winners"] += 1 if achievement in GRADED_CLASSES else 0
    row["total_earnings"] += earnings
    row["earnings_values"].append(earnings)


def blank_sire_crop(label: str) -> dict[str, Any]:
    return {
        "label": label,
        "foals": 0,
        "runners": 0,
        "winners": 0,
        "two_win_horses": 0,
        "three_win_horses": 0,
        "graded_winners": 0,
        "g1_horses": 0,
        "g2_horses": 0,
        "g3_horses": 0,
        "total_earnings": 0.0,
        "earnings_values": [],
        "starts": 0,
        "wins_starts": 0,
        "turf_winning_distances": [],
        "dirt_winning_distances": [],
        "representatives": [],
    }


def finalize_sire_crop(row: dict[str, Any]) -> dict[str, Any]:
    earnings_values = row.pop("earnings_values")
    turf_distances = row.pop("turf_winning_distances")
    dirt_distances = row.pop("dirt_winning_distances")
    foals = row["foals"]
    runners = row["runners"]
    starts = row["starts"]
    row["total_earnings"] = round(row["total_earnings"], 1)
    row["earnings_per_foal"] = round(row["total_earnings"] / foals, 1) if foals else None
    row["debut_rate"] = rate(runners, foals)
    row["winner_foal_rate"] = rate(row["winners"], foals)
    row["graded_foal_rate"] = rate(row["graded_winners"], foals)
    row["two_win_rate"] = rate(row["two_win_horses"], foals)
    row["three_win_rate"] = rate(row["three_win_horses"], foals)
    row["start_win_rate"] = rate(row["wins_starts"], starts)
    row["avg_starts_per_runner"] = round(starts / runners, 1) if runners else None
    row["turf_awd"] = round(sum(turf_distances) / len(turf_distances), 1) if turf_distances else None
    row["dirt_awd"] = round(sum(dirt_distances) / len(dirt_distances), 1) if dirt_distances else None
    row["median_earnings"] = median([value for value in earnings_values if value > 0])
    row["earnings_q25"] = quantile(earnings_values, 0.25)
    row["earnings_q75"] = quantile(earnings_values, 0.75)
    row["representatives"] = sorted(row["representatives"], key=lambda horse: horse.get("earnings") or 0, reverse=True)[:5]
    return row


def sire_market_history() -> dict[str, Any]:
    rows = [
        {"year": 2017, "season_label": "第1年", "mares_covered": 284, "shadai_avg_mares_covered": 197, "stud_fee": 400, "shadai_avg_stud_fee": 343},
        {"year": 2018, "season_label": "第2年", "mares_covered": 294, "shadai_avg_mares_covered": 180, "stud_fee": 400, "shadai_avg_stud_fee": 341},
        {"year": 2019, "season_label": "第3年", "mares_covered": 184, "shadai_avg_mares_covered": 155, "stud_fee": 600, "shadai_avg_stud_fee": 358},
        {"year": 2020, "season_label": "第4年", "mares_covered": 178, "shadai_avg_mares_covered": 153, "stud_fee": 700, "shadai_avg_stud_fee": 354},
        {"year": 2021, "season_label": "第5年", "mares_covered": 131, "shadai_avg_mares_covered": 164, "stud_fee": 1000, "shadai_avg_stud_fee": 554},
    ]
    return {
        "rows": rows,
        "summary": {
            "max_mares_covered": max(row["mares_covered"] for row in rows),
            "max_stud_fee": max(row["stud_fee"] for row in rows),
            "updated_at": date.today().isoformat(),
        },
        "source": "用户提供的配种数与种付费整理图；同期平均为社台种牡马前五年平均值。",
        "retrieved_at": date.today().isoformat(),
    }


def graded_race_group(race_name: Any) -> tuple[str | None, str | None]:
    text = str(race_name or "").upper().replace("Ｇ", "G").replace("Ⅰ", "I").replace("Ⅱ", "II").replace("Ⅲ", "III")
    match = re.search(r"\((J?GIII|J?GII|J?GI)\)|\b(J?G3|J?G2|J?G1)\b", text)
    if not match:
        return None, None
    grade = match.group(1) or match.group(2)
    group = {
        "GI": "G1", "JGI": "G1", "G1": "G1", "JG1": "G1",
        "GII": "G2", "JGII": "G2", "G2": "G2", "JG2": "G2",
        "GIII": "G3", "JGIII": "G3", "G3": "G3", "JG3": "G3",
    }.get(grade)
    return group, grade


def sire_profile(horses: list[dict[str, Any]], races: list[dict[str, Any]]) -> dict[str, Any]:
    crops: dict[int, dict[str, Any]] = {}
    total = blank_sire_crop("通算")
    horse_by_id = {horse["id"]: horse for horse in horses}
    for horse in horses:
        crop = int(horse.get("birth_year") or 0)
        crops.setdefault(crop, blank_sire_crop(str(crop)))
        for row in (total, crops[crop]):
            add_sire_horse_metrics(row, horse)
        achievement = clean_group(horse.get("achievement_class"), "")
        if achievement in STAKES_CLASSES:
            rep = {
                "name": horse.get("name"),
                "hkjc_name_zh": horse.get("hkjc_name_zh"),
                "achievement_class": achievement,
                "major_win": horse.get("major_win"),
                "earnings": safe_number(horse.get("earnings_netkeiba") if horse.get("earnings_netkeiba") is not None else horse.get("earnings_jbis")),
            }
            total["representatives"].append(rep)
            crops[crop]["representatives"].append(rep)

    development: dict[tuple[int, int], dict[str, Any]] = defaultdict(lambda: {"starts": 0, "wins": 0})
    surface_distance: dict[tuple[str, str], dict[str, Any]] = defaultdict(lambda: {"starts": 0, "wins": 0, "top3": 0})
    sex_stats: dict[str, dict[str, Any]] = defaultdict(lambda: {"starts": 0, "wins": 0, "top3": 0})
    graded_wins_timeline: list[dict[str, Any]] = []
    for race in races:
        if not is_valid_start(race):
            continue
        horse = horse_by_id.get(race["horse_id"])
        if not horse:
            continue
        crop = int(horse.get("birth_year") or 0)
        finish = int(race["finish"])
        distance = int(race.get("distance_m") or 0)
        surface = clean_group(race.get("surface"), "Unknown")
        bucket = distance_bucket(distance)
        target_rows = [total]
        if crop in crops:
            target_rows.append(crops[crop])
        for row in target_rows:
            row["starts"] += 1
            if finish == 1:
                row["wins_starts"] += 1
                if surface == "芝" and distance:
                    row["turf_winning_distances"].append(distance)
                if surface == "ダ" and distance:
                    row["dirt_winning_distances"].append(distance)
        if finish == 1:
            surface_distance[(surface, bucket)]["wins"] += 1
        if finish <= 3:
            surface_distance[(surface, bucket)]["top3"] += 1
        surface_distance[(surface, bucket)]["starts"] += 1
        sex = clean_group(horse.get("sex"), "Unknown")
        sex_stats[sex]["starts"] += 1
        if finish == 1:
            sex_stats[sex]["wins"] += 1
        if finish <= 3:
            sex_stats[sex]["top3"] += 1

        if finish == 1:
            grade_group, grade_label = graded_race_group(race.get("race_name"))
            if grade_group:
                graded_wins_timeline.append({
                    "race_date": race.get("race_date"),
                    "horse": race.get("name"),
                    "race_name": race.get("race_name"),
                    "race_url": race.get("race_url"),
                    "meeting": race.get("meeting"),
                    "grade": grade_label,
                    "grade_group": grade_group,
                })

        race_year = parse_race_year(race.get("race_date"))
        if race_year and crop:
            age = max(2, min(6, race_year - crop))
            development[(crop, age)]["starts"] += 1
            if finish == 1:
                development[(crop, age)]["wins"] += 1

    crop_rows = [finalize_sire_crop(crops[crop]) for crop in sorted(crops.keys()) if crop]
    total_row = finalize_sire_crop(total)
    best_crop = sorted(crop_rows, key=lambda row: (row["graded_winners"], row["total_earnings"], row["winners"]), reverse=True)[0]

    cumulative_rows = []
    for crop in sorted(crops.keys()):
        if not crop:
            continue
        crop_row = crops[crop]
        max_observed_age = min(6, max(2, date.today().year - crop))
        starts_sum = 0
        wins_sum = 0
        for age in range(2, 7):
            reached_age = age <= max_observed_age
            item = development[(crop, age)] if reached_age else {"starts": None, "wins": None}
            if reached_age:
                starts_sum += item["starts"]
                wins_sum += item["wins"]
            cumulative_rows.append({
                "crop": crop,
                "age": "6+" if age == 6 else age,
                "starts": item["starts"],
                "wins": item["wins"],
                "cumulative_starts": starts_sum if reached_age else None,
                "cumulative_wins": wins_sum if reached_age else None,
                "cumulative_wins_per_100_foals": round(wins_sum / crop_row["foals"] * 100, 1) if reached_age and crop_row["foals"] else None,
                "cumulative_wins_per_100_runners": round(wins_sum / crop_row["runners"] * 100, 1) if reached_age and crop_row["runners"] else None,
                "cumulative_win_rate": rate(wins_sum, starts_sum) if reached_age else None,
            })

    heatmap_rows = []
    for (surface, bucket), row in surface_distance.items():
        heatmap_rows.append({
            "surface": surface,
            "distance": bucket,
            "starts": row["starts"],
            "wins": row["wins"],
            "top3": row["top3"],
            "win_rate": rate(row["wins"], row["starts"]),
            "top3_rate": rate(row["top3"], row["starts"]),
            "small_sample": row["starts"] < 20,
        })

    return {
        "summary": total_row,
        "evaluation_cards": [
            {"label": "总奖金", "value": total_row["total_earnings"], "unit": "万円", "note": "产驹累计奖金"},
            {"label": "胜上率", "value": total_row["winner_foal_rate"], "unit": "rate", "note": f"{total_row['winners']}/{total_row['foals']}"},
            {"label": "2胜以上率", "value": total_row["two_win_rate"], "unit": "rate", "note": f"{total_row['two_win_horses']}/{total_row['foals']}"},
            {"label": "3胜以上率", "value": total_row["three_win_rate"], "unit": "rate", "note": f"{total_row['three_win_horses']}/{total_row['foals']}"},
            {"label": "重赏胜马", "value": total_row["graded_winners"], "unit": "count", "note": f"G1 {total_row['g1_horses']} / G2 {total_row['g2_horses']} / G3 {total_row['g3_horses']}"},
            {"label": "最佳世代", "value": best_crop["label"], "unit": "text", "note": f"{best_crop['graded_winners']}匹重赏胜马"},
            {"label": "芝平均胜距", "value": total_row["turf_awd"], "unit": "m", "note": "胜场平均"},
            {"label": "泥地平均胜距", "value": total_row["dirt_awd"], "unit": "m", "note": "胜场平均"},
        ],
        "crops": crop_rows,
        "crop_development": cumulative_rows,
        "graded_wins_timeline": sorted(graded_wins_timeline, key=lambda row: row.get("race_date") or ""),
        "surface_distance": heatmap_rows,
        "surface_distance_metrics": ["win_rate", "top3_rate", "starts"],
        "sex_performance": [
            {
                "label": sex,
                "starts": row["starts"],
                "wins": row["wins"],
                "top3": row["top3"],
                "win_rate": rate(row["wins"], row["starts"]),
                "top3_rate": rate(row["top3"], row["starts"]),
            }
            for sex, row in sorted(sex_stats.items(), key=lambda item: -item[1]["starts"])
        ],
        "reference_model": {
            "source": "netkeiba Owners sire_crop_result",
            "observed_layout": "上方为总奖金、重赏等级、胜上率、平均奖金、芝/泥平均胜距等评价指标；下方为生产年度表和组合图。",
            "leading_sire_note": "Leading Sire榜单采用公开排行资料；暂缺分类不会用本站产驹资料代替推算。",
        },
    }


def race_breakdowns(races: list[dict[str, Any]]) -> dict[str, Any]:
    by_surface: dict[str, dict[str, Any]] = defaultdict(lambda: {"starts": 0, "wins": 0, "win_distances": []})
    by_sex: dict[str, dict[str, Any]] = defaultdict(lambda: {"starts": 0, "wins": 0, "win_distances": []})
    by_distance: dict[str, dict[str, Any]] = defaultdict(lambda: {"starts": 0, "wins": 0})
    for race in races:
        if not is_valid_start(race):
            continue
        surface = clean_group(race.get("surface"), "Unknown")
        sex = clean_group(race.get("sex"), "Unknown")
        distance = int(race.get("distance_m") or 0)
        distance_label = (
            "短距離" if distance and distance < 1600 else
            "マイル" if distance and distance < 1900 else
            "中距離" if distance and distance < 2400 else
            "長距離" if distance else "Unknown"
        )
        for bucket in (by_surface[surface], by_sex[sex]):
            bucket["starts"] += 1
            if race.get("finish") == 1:
                bucket["wins"] += 1
                bucket["win_distances"].append(distance)
        by_distance[distance_label]["starts"] += 1
        if race.get("finish") == 1:
            by_distance[distance_label]["wins"] += 1

    def finalize_bucket(label: str, row: dict[str, Any]) -> dict[str, Any]:
        return {
            "label": label,
            "starts": row["starts"],
            "wins": row["wins"],
            "win_rate": rate(row["wins"], row["starts"]),
            "awd": round(sum(row["win_distances"]) / len(row["win_distances"]), 1) if row["win_distances"] else None,
        }

    return {
        "by_surface": sorted((finalize_bucket(k, v) for k, v in by_surface.items()), key=lambda row: -row["starts"]),
        "by_sex": sorted((finalize_bucket(k, v) for k, v in by_sex.items()), key=lambda row: -row["starts"]),
        "by_distance": sorted(
            ({"label": k, "starts": v["starts"], "wins": v["wins"], "win_rate": rate(v["wins"], v["starts"])} for k, v in by_distance.items()),
            key=lambda row: ["短距離", "マイル", "中距離", "長距離", "Unknown"].index(row["label"]),
        ),
    }


def pedigree_summary(horses: list[dict[str, Any]]) -> dict[str, Any]:
    cross = cross_summary(horses)
    female_families = grouped_metrics(horses, "female_family", "未分類")[:80]
    return {
        "cross": cross,
        "female_families": female_families,
        "charts": pedigree_chart_payload(cross, female_families),
    }


def blank_start_stats() -> dict[str, Any]:
    return {
        "starts": 0,
        "wins_starts": 0,
        "seconds": 0,
        "thirds": 0,
        "top3": 0,
        "surface": defaultdict(lambda: {"starts": 0, "wins": 0, "top3": 0}),
        "distance": defaultdict(lambda: {"starts": 0, "wins": 0, "top3": 0}),
    }


def add_start(stats: dict[str, Any], race: dict[str, Any]) -> None:
    if not is_valid_start(race):
        return
    finish = int(race["finish"])
    stats["starts"] += 1
    if finish == 1:
        stats["wins_starts"] += 1
    if finish == 2:
        stats["seconds"] += 1
    if finish == 3:
        stats["thirds"] += 1
    if finish <= 3:
        stats["top3"] += 1
    surface = clean_group(race.get("surface"), "Unknown")
    distance = distance_bucket(race.get("distance_m"))
    for bucket in (stats["surface"][surface], stats["distance"][distance]):
        bucket["starts"] += 1
        if finish == 1:
            bucket["wins"] += 1
        if finish <= 3:
            bucket["top3"] += 1


def finalize_start_stats(stats: dict[str, Any]) -> dict[str, Any]:
    starts = stats["starts"]
    return {
        "starts": starts,
        "wins_starts": stats["wins_starts"],
        "seconds": stats["seconds"],
        "thirds": stats["thirds"],
        "top3": stats["top3"],
        "win_start_rate": rate(stats["wins_starts"], starts),
        "quinella_rate": rate(stats["wins_starts"] + stats["seconds"], starts),
        "top3_rate": rate(stats["top3"], starts),
        "surface": {
            label: {
                "starts": row["starts"],
                "wins": row["wins"],
                "top3": row["top3"],
                "win_rate": rate(row["wins"], row["starts"]),
                "top3_rate": rate(row["top3"], row["starts"]),
            }
            for label, row in stats["surface"].items()
        },
        "distance": {
            label: {
                "starts": row["starts"],
                "wins": row["wins"],
                "top3": row["top3"],
                "win_rate": rate(row["wins"], row["starts"]),
                "top3_rate": rate(row["top3"], row["starts"]),
            }
            for label, row in stats["distance"].items()
        },
    }


def breeder_analysis(horses: list[dict[str, Any]], races: list[dict[str, Any]]) -> dict[str, Any]:
    groups: dict[str, dict[str, Any]] = {}
    for horse in horses:
        breeder = canonical_breeder(horse.get("breeder"))
        group = groups.setdefault(breeder, {
            "metrics": blank_metrics(breeder),
            "starts": blank_start_stats(),
            "raw_names": Counter(),
            "breeder_group": breeder_group(breeder),
            "crops": Counter(),
        })
        group["raw_names"][clean_group(horse.get("breeder"), "未分類")] += 1
        group["crops"][str(horse.get("birth_year") or "未分類")] += 1
        add_horse(group["metrics"], horse)

    for race in races:
        breeder = canonical_breeder(race.get("breeder"))
        if breeder in groups:
            add_start(groups[breeder]["starts"], race)

    rows = []
    for breeder, group in groups.items():
        row = finalize_metrics(group["metrics"])
        row.update(finalize_start_stats(group["starts"]))
        row["breeder_group"] = group["breeder_group"]
        row["raw_names"] = [name for name, _count in group["raw_names"].most_common(5)]
        row["crop_counts"] = dict(sorted(group["crops"].items()))
        rows.append(row)
    rows.sort(key=lambda row: (-row["foals"], -row["winners"], row["label"]))

    return {
        "top_foals": rows[:40],
        "winner_rates": sorted((row for row in rows if row["foals"] >= 5), key=lambda row: (-(row["winner_foal_rate"] or 0), -row["foals"], row["label"]))[:40],
        "graded_sources": sorted((row for row in rows if row["graded_winners"] > 0), key=lambda row: (-row["graded_winners"], -row["g1_winners"], -row["foals"], row["label"])),
        "crop_composition": rows[:30],
        "scatter": rows,
        "table": rows,
        "method": "勝馬率（対産駒）= winners / foals; 勝率（対出走）= first-place starts / valid starts.",
    }


def racecourse_analysis(races: list[dict[str, Any]]) -> dict[str, Any]:
    groups: dict[str, dict[str, Any]] = {}
    for race in races:
        course, jurisdiction, country = canonical_racecourse(race.get("meeting"))
        group = groups.setdefault(course, {
            "label": course,
            "jurisdiction": jurisdiction,
            "country": country,
            "raw_meetings": Counter(),
            "starts": blank_start_stats(),
        })
        group["raw_meetings"][clean_group(race.get("meeting"), "Unknown")] += 1
        add_start(group["starts"], race)

    rows = []
    for group in groups.values():
        stats = finalize_start_stats(group["starts"])
        rows.append({
            "label": group["label"],
            "jurisdiction": group["jurisdiction"],
            "country": group["country"],
            "raw_meetings": [name for name, _count in group["raw_meetings"].most_common(5)],
            **stats,
        })
    rows.sort(key=lambda row: (-row["starts"], row["label"]))
    main_rows = [row for row in rows if row["starts"] >= 30]
    return {
        "summary": {
            "valid_starts": sum(row["starts"] for row in rows),
            "courses": len(rows),
            "main_chart_min_starts": 30,
        },
        "table": rows,
        "main_chart": sorted(main_rows, key=lambda row: (-(row["win_start_rate"] or 0), -row["starts"], row["label"])),
        "surface_heatmap": main_rows,
        "distance_heatmap": main_rows,
        "method": "取消、除外和中止等没有正式名次的记录不计入胜率、连对率和前三率。",
    }


def prize_quality(races: list[dict[str, Any]]) -> dict[str, Any]:
    total = len(races)
    non_empty = [race for race in races if safe_number(race.get("prize")) > 0]
    return {
        "race_rows": total,
        "nonzero_prize_rows": len(non_empty),
        "coverage_rate": rate(len(non_empty), total),
        "sum_raw_prize": round(sum(safe_number(race.get("prize")) for race in races), 1),
        "decision": "单场比赛奖金资料覆盖不足，因此本站暂不展示按赛次汇总的奖金图表。",
    }


def race_date_key(value: Any) -> tuple[int, int, int, str]:
    text = str(value or "").strip()
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y.%m.%d"):
        try:
            parsed = datetime.strptime(text, fmt)
            return parsed.year, parsed.month, parsed.day, text
        except ValueError:
            pass
    year = parse_race_year(text) or 9999
    return year, 12, 31, text


def leading_overall_earnings_by_year() -> dict[int, dict[str, Any]]:
    if not LEADING_SIRE_PATH.exists():
        return {}
    try:
        source = json.loads(LEADING_SIRE_PATH.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}
    rows = {}
    for row in source.get("records", []):
        if row.get("category") != "jra_nar_overall":
            continue
        if row.get("sire") != "ドゥラメンテ" and row.get("sire_id") not in {"2012104511", "0001151936"}:
            continue
        year = int(row.get("year") or 0)
        if not year:
            continue
        earnings = safe_number(row.get("earnings"))
        rows[year] = {
            "earnings": round(earnings, 1) if earnings > 0 else None,
            "source_url": row.get("source_url"),
            "source_name": row.get("source_name") or "JBISサーチ 種牡馬ランキング",
            "retrieved_at": row.get("retrieved_at"),
            "rank": row.get("rank"),
        }
    return rows


def annual_progeny_performance(horses: list[dict[str, Any]], races: list[dict[str, Any]]) -> dict[str, Any]:
    horse_by_id = {horse["id"]: horse for horse in horses}
    leading_earnings = leading_overall_earnings_by_year()
    years: dict[int, dict[str, Any]] = defaultdict(lambda: {
        "year": 0,
        "starts": 0,
        "wins": 0,
        "top3": 0,
        "runners": set(),
        "winners": set(),
        "jra_wins": 0,
        "nar_wins": 0,
        "overseas_wins": 0,
        "other_wins": 0,
        "graded_wins": 0,
        "g1_wins": 0,
        "g2_wins": 0,
        "g3_wins": 0,
        "earnings": 0.0,
        "prize_rows": 0,
    })
    win_events: list[dict[str, Any]] = []

    for race in races:
        if not is_valid_start(race):
            continue
        race_year = parse_race_year(race.get("race_date"))
        if not race_year:
            continue
        horse = horse_by_id.get(race["horse_id"], {})
        finish = int(race["finish"])
        course, jurisdiction, country = canonical_racecourse(race.get("meeting"))
        prize = safe_number(race.get("prize"))
        row = years[race_year]
        row["year"] = race_year
        row["starts"] += 1
        row["runners"].add(race["horse_id"])
        if finish <= 3:
            row["top3"] += 1
        if prize > 0:
            row["earnings"] += prize
            row["prize_rows"] += 1
        if finish == 1:
            row["wins"] += 1
            row["winners"].add(race["horse_id"])
            if jurisdiction == "JRA":
                row["jra_wins"] += 1
            elif jurisdiction == "NAR":
                row["nar_wins"] += 1
            elif jurisdiction == "Overseas":
                row["overseas_wins"] += 1
            else:
                row["other_wins"] += 1
            grade_group, grade_label = graded_race_group(race.get("race_name"))
            if grade_group:
                row["graded_wins"] += 1
                if grade_group == "G1":
                    row["g1_wins"] += 1
                elif grade_group == "G2":
                    row["g2_wins"] += 1
                elif grade_group == "G3":
                    row["g3_wins"] += 1
            win_events.append({
                "race_date": race.get("race_date"),
                "year": race_year,
                "horse_id": race["horse_id"],
                "horse": race.get("name") or horse.get("name"),
                "hkjc_name_zh": race.get("hkjc_name_zh") or horse.get("hkjc_name_zh"),
                "race_name": race.get("race_name"),
                "race_url": race.get("race_url"),
                "meeting": course,
                "raw_meeting": race.get("meeting"),
                "jurisdiction": jurisdiction,
                "country": country,
                "grade": grade_label,
                "grade_group": grade_group,
                "prize": prize,
            })

    annual_rows = []
    for year in sorted(years):
        row = years[year]
        starts = row["starts"]
        wins = row["wins"]
        runners = len(row["runners"])
        winners = len(row["winners"])
        race_earnings = round(row["earnings"], 1)
        leading_row = leading_earnings.get(year)
        if leading_row and leading_row.get("earnings") is not None:
            earnings = leading_row["earnings"]
            earnings_status = "partial" if year >= date.today().year else "complete"
            earnings_source = f"{leading_row.get('source_name')}（进行中）" if earnings_status == "partial" else leading_row.get("source_name")
            earnings_source_url = leading_row.get("source_url")
            earnings_rank = leading_row.get("rank")
        elif race_earnings > 0:
            earnings = race_earnings
            earnings_status = "partial"
            earnings_source = "本站逐场比赛记录"
            earnings_source_url = None
            earnings_rank = None
        else:
            earnings = None
            earnings_status = "missing"
            earnings_source = None
            earnings_source_url = None
            earnings_rank = None
        annual_rows.append({
            "year": year,
            "starts": starts,
            "runners": runners,
            "wins": wins,
            "winners": winners,
            "jra_wins": row["jra_wins"],
            "nar_wins": row["nar_wins"],
            "overseas_wins": row["overseas_wins"],
            "other_wins": row["other_wins"],
            "top3": row["top3"],
            "win_rate": rate(wins, starts),
            "top3_rate": rate(row["top3"], starts),
            "winner_runner_rate": rate(winners, runners),
            "graded_wins": row["graded_wins"],
            "g1_wins": row["g1_wins"],
            "g2_wins": row["g2_wins"],
            "g3_wins": row["g3_wins"],
            "earnings": earnings,
            "race_prize_earnings": race_earnings,
            "earnings_status": earnings_status,
            "earnings_source": earnings_source,
            "earnings_source_url": earnings_source_url,
            "earnings_rank": earnings_rank,
            "prize_rows": row["prize_rows"],
        })

    cumulative = 0
    split_wins = {"JRA": 0, "NAR": 0, "Overseas": 0, "Other": 0}
    milestones = []
    win_events_sorted = sorted(win_events, key=lambda row: race_date_key(row.get("race_date")))
    for event in win_events_sorted:
        cumulative += 1
        jurisdiction = event.get("jurisdiction") or "Other"
        split_wins[jurisdiction if jurisdiction in split_wins else "Other"] += 1
        event["cumulative_wins"] = cumulative
        if cumulative % 100 == 0:
            milestones.append(dict(event))

    return {
        "summary": {
            "total_wins": cumulative,
            "jra_wins": split_wins["JRA"],
            "nar_wins": split_wins["NAR"],
            "overseas_wins": split_wins["Overseas"],
            "other_wins": split_wins["Other"],
            "years": [row["year"] for row in annual_rows],
            "updated_at": date.today().isoformat(),
        },
        "annual": annual_rows,
        "win_events": win_events_sorted,
        "milestones": milestones,
        "method": "年度成绩按比赛发生年份统计；胜场拆分以赛马场所属系统归类。",
    }


def load_leading_sire_source() -> dict[str, Any]:
    if not LEADING_SIRE_PATH.exists():
        return {
            "records": [],
            "categories": [],
            "retrieved_at": None,
            "status": "missing_source_file",
        }
    return json.loads(LEADING_SIRE_PATH.read_text(encoding="utf-8"))


def leading_sire_payloads() -> tuple[dict[str, Any], dict[str, Any], dict[str, Any]]:
    source = load_leading_sire_source()
    records = source.get("records", [])
    categories = source.get("categories", [])
    duramente = [
        row for row in records
        if row.get("sire_id") == "2012104511" or row.get("sire") == "ドゥラメンテ"
    ]
    leaders = {}
    for row in records:
        key = (row.get("year"), row.get("category"))
        if row.get("rank") == 1:
            leaders[key] = row
    history = []
    for row in sorted(duramente, key=lambda item: (item.get("category", ""), item.get("year", 0))):
        leader = leaders.get((row.get("year"), row.get("category")))
        leader_earnings = leader.get("earnings") if leader else None
        item = dict(row)
        item["leader_sire"] = leader.get("sire") if leader else None
        item["leader_earnings"] = leader_earnings
        item["earnings_gap_to_leader"] = round((leader_earnings or 0) - (row.get("earnings") or 0), 1) if leader_earnings is not None and row.get("earnings") is not None else None
        history.append(item)
    top10_rows = [
        row for row in records
        if row.get("rank") is not None and row.get("rank") <= 10
    ]
    return (
        {
            "target_sire": "ドゥラメンテ",
            "target_sire_id": "2012104511",
            "history": history,
            "source_status": source.get("status", "ok"),
            "retrieved_at": source.get("retrieved_at"),
        },
        {
            "target_sire": "ドゥラメンテ",
            "target_sire_id": "2012104511",
            "rows": sorted(top10_rows, key=lambda item: (item.get("category", ""), item.get("year", 0), item.get("rank", 999))),
            "retrieved_at": source.get("retrieved_at"),
        },
        {
            "categories": categories,
            "retrieved_at": source.get("retrieved_at"),
            "note": "暂缺可靠公开榜单的分类不自行推算。",
        },
    )


def dam_age_bucket(age: Any) -> str:
    if age is None:
        return "unknown"
    age_int = int(age)
    if age_int <= 6:
        return "3-6"
    if age_int <= 10:
        return "7-10"
    if age_int <= 14:
        return "11-14"
    if age_int <= 18:
        return "15-18"
    return "19+"


def dam_age_analysis(horses: list[dict[str, Any]]) -> dict[str, Any]:
    groups = {label: blank_metrics(label) for label in ["3-6", "7-10", "11-14", "15-18", "19+", "unknown"]}
    biological_heatmap: dict[tuple[str, str], dict[str, Any]] = defaultdict(lambda: {"foals": 0, "winners": 0, "graded_winners": 0, "total_earnings": 0.0, "horses": []})
    registered_heatmap: dict[tuple[str, str], dict[str, Any]] = defaultdict(lambda: {"foals": 0, "winners": 0, "graded_winners": 0, "total_earnings": 0.0, "horses": []})
    precision_counter = Counter(clean_group(horse.get("dam_age_precision"), "unknown") for horse in horses)
    biological_confirmed = 0
    registered_confirmed = 0

    def order_bucket(value: Any) -> str:
        if value is None or value == "":
            return "unknown"
        order_int = int(value)
        return str(order_int) if order_int > 0 else "unknown"

    def add_order_row(target: dict[tuple[str, str], dict[str, Any]], horse: dict[str, Any], bucket: str, order: str) -> None:
        _, wins = parse_career(horse.get("career_summary"))
        row = target[(bucket, order)]
        row["foals"] += 1
        if wins > 0:
            row["winners"] += 1
        if horse.get("achievement_class") in GRADED_CLASSES:
            row["graded_winners"] += 1
        row["total_earnings"] += safe_number(horse.get("earnings_netkeiba") if horse.get("earnings_netkeiba") is not None else horse.get("earnings_jbis"))
        row["horses"].append({
            "id": horse.get("id"),
            "name": horse.get("name"),
            "hkjc_name_zh": horse.get("hkjc_name_zh"),
            "birth_year": horse.get("birth_year"),
            "achievement_class": horse.get("achievement_class"),
        })

    for horse in horses:
        bucket = dam_age_bucket(horse.get("dam_age_at_foaling"))
        add_horse(groups[bucket], horse)
        biological_order = horse.get("dam_biological_parity")
        registered_order = horse.get("dam_registered_foal_order")
        if biological_order:
            biological_confirmed += 1
        if registered_order:
            registered_confirmed += 1
        add_order_row(biological_heatmap, horse, bucket, order_bucket(biological_order))
        add_order_row(registered_heatmap, horse, bucket, order_bucket(registered_order))

    bucket_rows = [finalize_metrics(groups[label]) for label in ["3-6", "7-10", "11-14", "15-18", "19+", "unknown"]]
    def heatmap_rows(source: dict[tuple[str, str], dict[str, Any]]) -> list[dict[str, Any]]:
        rows = []
        for (age_bucket, order_bucket_label), row in source.items():
            rows.append({
            "age_bucket": age_bucket,
            "foal_order": order_bucket_label,
            "foals": row["foals"],
            "winners": row["winners"],
            "graded_winners": row["graded_winners"],
            "winner_rate": rate(row["winners"], row["foals"]),
            "graded_rate": rate(row["graded_winners"], row["foals"]),
            "total_earnings": round(row["total_earnings"], 1),
            "horses": row["horses"][:40],
        })
        return sorted(rows, key=lambda row: (row["age_bucket"], row["foal_order"]))

    biological_rows = heatmap_rows(biological_heatmap)
    registered_rows = heatmap_rows(registered_heatmap)
    return {
        "summary": {
            "total": len(horses),
            "exact": precision_counter.get("exact", 0),
            "year_only": precision_counter.get("year_only", 0),
            "unknown": precision_counter.get("unknown", 0),
            "exact_rate": rate(precision_counter.get("exact", 0), len(horses)),
            "year_only_rate": rate(precision_counter.get("year_only", 0), len(horses)),
            "unknown_rate": rate(precision_counter.get("unknown", 0), len(horses)),
            "biological_parity_confirmed": biological_confirmed,
            "registered_foal_order_confirmed": registered_confirmed,
            "biological_parity_rate": rate(biological_confirmed, len(horses)),
            "registered_foal_order_rate": rate(registered_confirmed, len(horses)),
            "updated_at": date.today().isoformat(),
        },
        "buckets": bucket_rows,
        "histogram": [
            {"age": age, "foals": count}
            for age, count in sorted(Counter(horse.get("dam_age_at_foaling") for horse in horses if horse.get("dam_age_at_foaling") is not None).items())
        ],
        "foal_order_heatmap": biological_rows,
        "parity_modes": {
            "biological": {
                "label": "真实生产胎次",
                "confirmed": biological_confirmed,
                "total": len(horses),
                "heatmap": biological_rows,
            },
            "registered": {
                "label": "登记产驹序次",
                "confirmed": registered_confirmed,
                "total": len(horses),
                "heatmap": registered_rows,
            },
        },
        "source": "生产胎次优先采用可确认完整生产结果的公开血统书页面；仅列登记产驹的来源只用于登记产驹序次。",
    }


def methodology(races: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "population": "收录对象为2018-2022年出生的ドゥラメンテ产驹。",
        "foals": "产驹数按已登记且能够确认父系为ドゥラメンテ的马匹统计。",
        "runners": "出赛马指已有正式比赛记录的产驹。",
        "winners": "胜马指生涯至少取得一场胜利的独立产驹。",
        "graded_winners": "重赏胜马包括G1、G2、G3胜马；Listed马另行保留，不并入重赏胜马。",
        "earnings": "奖金优先采用netkeiba资料，必要时以JBIS资料补充；金额单位为万円。",
        "cross": "Cross统计按祖先和代际位置归纳；同一匹马可能同时进入多个祖先或形式分组。",
        "breeder": "牧场名称尽量保持原始登记写法，常见写法差异会合并到同一牧场名下。",
        "racecourse": "赛马场成绩以已取得正式名次的出赛为基础，统计胜率、连对率和前三率。",
        "awd": "平均胜距只统计已取得胜利且能够确认距离的比赛。",
        "race_prize_quality": prize_quality(races),
        "missing_data": "CI、AEI和部分全体种马分类榜仍待补充；全日本榜单只采用可靠公开来源。",
        "last_updated": date.today().isoformat(),
    }


def build_analytics(conn: Any) -> dict[str, Any]:
    horses = load_horses(conn)
    races = load_races(conn)
    leading_history, leading_top10, sire_categories = leading_sire_payloads()
    return {
        "overview": overview(horses, races),
        "sire_profile": sire_profile(horses, races),
        "annual_progeny_performance": annual_progeny_performance(horses, races),
        "sire_market": sire_market_history(),
        "leading_sire_history": leading_history,
        "leading_sire_top10": leading_top10,
        "sire_category_rankings": sire_categories,
        "crops": crop_metrics(horses),
        "bms_lines": bms_line_metrics(horses),
        "broodmare_sires": grouped_metrics(horses, "broodmare_sire", "未分類"),
        "distance_surface": race_breakdowns(races),
        "pedigree": pedigree_summary(horses),
        "dam_age": dam_age_analysis(horses),
        "breeders": breeder_analysis(horses, races),
        "racecourses": racecourse_analysis(races),
        "methodology": methodology(races),
    }

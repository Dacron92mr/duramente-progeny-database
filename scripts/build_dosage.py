#!/usr/bin/env python3
"""Build DP, DI and CD from cached JBIS pedigrees.

The calculation never mutates the cached pedigree HTML. Chef classifications are
versioned separately and can be rebuilt from a PedigreeQuery validation export.
"""

from __future__ import annotations

import argparse
import html as html_module
import json
import math
import re
import shutil
import tempfile
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path
from typing import Any


CATEGORIES = ("B", "I", "C", "S", "P")
GENERATION_WEIGHT = {1: 16, 2: 8, 3: 4, 4: 2}
NODE_RE = re.compile(
    r'<div class="data-3__(male|female)">\s*<div>\s*'
    r'<a href="/horse/([^/]+)/"[^>]*>(.*?)</a>',
    re.S,
)
NETKEIBA_CELL_RE = re.compile(
    r'<td\b(?P<attrs>[^>]*)class="(?P<class>b_ml|b_fml)"[^>]*>'
    r"(?P<body>.*?)</td>",
    re.S,
)


def clean_name(raw: str) -> str:
    text = re.sub(r"<[^>]+>", " ", raw)
    return re.sub(r"\s+", " ", html_module.unescape(text)).strip()


def normalize_name(value: str | None) -> str:
    value = (value or "").upper().replace("’", "'").replace("‐", "-")
    value = re.sub(r"\s*\([A-Z]{3}\)\s*$", "", value)
    value = re.sub(r"[^A-Z0-9]+", "", value)
    return re.sub(r"\d+$", "", value)


def normalize_search_label(value: str | None) -> str:
    value = html_module.unescape(value or "").upper().replace("’", "'").replace("‐", "-")
    value = re.sub(r"\s*[\(（][^()（）]+[\)）]\s*$", "", value)
    return re.sub(r"[^\w]+", "", value)


NAME_EQUIVALENTS = {
    "NIJINSKY": "NIJINSKYII",
    "SADLERSWELLS": "SADLERSWELLS",
    "UNBRIDLEDSSONG": "UNBRIDLEDSSONG",
}


def atomic_json(path: Path, payload: Any, *, compact: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as fh:
        if compact:
            json.dump(payload, fh, ensure_ascii=False, separators=(",", ":"))
        else:
            json.dump(payload, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
        temp = Path(fh.name)
    temp.replace(path)


def parse_jbis_nodes(html: str) -> list[dict[str, Any]]:
    nodes = []
    for index, match in enumerate(NODE_RE.finditer(html)):
        # JBIS emits the complete sire half (31 nodes) before the dam half.
        # Each half is breadth-first: root, two parents, four grandparents, ...
        local_index = index % 31
        generation = int(math.floor(math.log2(local_index + 1))) + 1
        level_start = (2 ** (generation - 1)) - 1
        branch_offset = 0 if index < 31 else 2 ** (generation - 1)
        position = branch_offset + local_index - level_start
        nodes.append(
            {
                "index": index,
                "sex": match.group(1),
                "jbis_id": match.group(2),
                "name": clean_name(match.group(3)),
                "generation": generation,
                "position": position,
            }
        )
    return nodes


def dosage_sires(nodes: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return sorted(
        [n for n in nodes if n["generation"] <= 4 and n["sex"] == "male"],
        key=lambda n: (n["generation"], n["position"]),
    )


def parse_netkeiba_sires(
    html: str,
    chef_ids_by_name: dict[str, str],
) -> list[dict[str, Any]]:
    nodes = []
    for match in NETKEIBA_CELL_RE.finditer(html):
        if match.group("class") != "b_ml":
            continue
        rowspan_match = re.search(r'rowspan="(\d+)"', match.group("attrs"))
        rowspan = int(rowspan_match.group(1)) if rowspan_match else 1
        if rowspan not in (2, 4, 8, 16):
            continue
        generation = 5 - int(math.log2(rowspan))
        anchor = re.search(r"<a\b[^>]*>(.*?)</a>", match.group("body"), re.S)
        if not anchor:
            continue
        name = clean_name(anchor.group(1))
        chef_id = chef_ids_by_name.get(normalize_search_label(name))
        nodes.append(
            {
                "index": len(nodes),
                "sex": "male",
                "jbis_id": chef_id or f"netkeiba:{normalize_search_label(name)}",
                "name": name,
                "generation": generation,
                "position": len(nodes),
            }
        )
    return nodes


def cache_path(cache_dir: Path, jbis_id: str) -> Path | None:
    matches = list(cache_dir.glob(f"*horse_{jbis_id}_pedigree_.html"))
    return matches[0] if matches else None


def exact_search_result_id(
    search_html: str,
    name: str,
    expected_sire: str | None = None,
) -> str | None:
    pattern = re.compile(
        r'<a href="/horse/(\d+)/" class="txt-link">'
        + re.escape(name)
        + r"</a>"
    )
    candidates = list(pattern.finditer(search_html))
    if expected_sire and len(candidates) > 1:
        sire_key = normalize_search_label(expected_sire)
        narrowed = []
        for index, match in enumerate(candidates):
            end = candidates[index + 1].start() if index + 1 < len(candidates) else match.end() + 1800
            if sire_key in normalize_search_label(search_html[match.end() : end]):
                narrowed.append(match)
        candidates = narrowed
    matches = {match.group(1) for match in candidates}
    return next(iter(matches)) if len(matches) == 1 else None


def dam_pedigree_path(
    cache_dir: Path,
    horse: dict[str, Any],
    fetched_dam_ids: dict[str, str] | None = None,
) -> tuple[Path | None, str | None]:
    lookup_dir = cache_dir / "female_family_lookup"
    dam_id = str(
        horse.get("dam_jbis_id")
        or (fetched_dam_ids or {}).get(str(horse.get("id")))
        or ""
    )
    dam_name = str(horse.get("dam") or "")
    expected_sire = str(horse.get("broodmare_sire") or "")
    if not dam_id and dam_name and lookup_dir.exists():
        for search_path in lookup_dir.glob("search_*.html"):
            matched = exact_search_result_id(
                search_path.read_text(encoding="utf-8", errors="ignore"),
                dam_name,
                expected_sire,
            )
            if matched:
                dam_id = matched
                break
    if not dam_id:
        return None, None
    path = lookup_dir / f"dam_{dam_id}_pedigree.html"
    return (path if path.exists() else None), dam_id


def sire_half_template(horses: list[dict[str, Any]], cache_dir: Path) -> list[dict[str, Any]]:
    for horse in horses:
        path = cache_path(cache_dir, str(horse.get("jbis_id") or ""))
        if not path:
            continue
        nodes = parse_jbis_nodes(path.read_text(encoding="utf-8"))
        if len(nodes) >= 62:
            return [
                node
                for node in dosage_sires(nodes)
                if node["position"] < 2 ** (node["generation"] - 1)
            ]
    raise RuntimeError("No complete Duramente progeny pedigree cache found")


def dosage_sires_from_dam(
    dam_path: Path,
    sire_template: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    dam_nodes = parse_jbis_nodes(dam_path.read_text(encoding="utf-8"))
    if len(dam_nodes) < 62:
        return []
    dam_sires = []
    for node in dosage_sires(dam_nodes):
        if node["generation"] > 3:
            continue
        shifted = dict(node)
        shifted["generation"] = node["generation"] + 1
        # Positions are informational only; keep dam-side slots disjoint.
        shifted["position"] = node["position"] + 2 ** (shifted["generation"] - 1)
        dam_sires.append(shifted)
    return [*sire_template, *dam_sires]


def split_points(weight: int, code: str) -> list[float]:
    points = [0.0] * 5
    for letter in code:
        points[CATEGORIES.index(letter)] += weight / len(code)
    return points


def round_half_up(value: float, places: int = 2) -> float:
    quantum = Decimal("1").scaleb(-places)
    return float(Decimal(str(value)).quantize(quantum, rounding=ROUND_HALF_UP))


def calculate(sires: list[dict[str, Any]], chefs_by_id: dict[str, str]) -> dict[str, Any]:
    profile = [0.0] * 5
    contributions = []
    for sire in sires:
        code = chefs_by_id.get(sire["jbis_id"])
        if not code:
            continue
        weight = GENERATION_WEIGHT[sire["generation"]]
        points = split_points(weight, code)
        profile = [a + b for a, b in zip(profile, points)]
        contributions.append({**sire, "chef": code, "weight": weight, "points": points})
    profile = [int(x) if x.is_integer() else x for x in profile]
    b, i, c, s, p = profile
    total = sum(profile)
    denominator = s + p + c / 2
    numerator = b + i + c / 2
    di = None if denominator == 0 else round_half_up(numerator / denominator)
    cd = None if total == 0 else round_half_up((2 * b + i - s - 2 * p) / total)
    return {
        "dosage_profile": profile,
        "dosage_profile_text": "-".join(str(x) for x in profile),
        "dosage_points": total,
        "dosage_index": di,
        "center_of_distribution": cd,
        "contributions": contributions,
    }


def profile_from_text(value: str) -> list[int]:
    return [int(part) for part in value.split("-")]


def sample_lookup(samples: list[dict[str, Any]]) -> dict[str, Any]:
    exact = {(normalize_name(x["name"]), int(x["year"])): x for x in samples}
    grouped: dict[str, list[dict[str, Any]]] = {}
    for item in samples:
        grouped.setdefault(normalize_name(item["name"]), []).append(item)
    return {
        "exact": exact,
        "by_name": {key: values[0] for key, values in grouped.items() if len(values) == 1},
    }


def match_sample(horse: dict[str, Any], lookup: dict[str, Any]) -> dict[str, Any] | None:
    candidates = [horse.get("name_en"), horse.get("name")]
    for name in candidates:
        normalized = normalize_name(name)
        hit = lookup["exact"].get((normalized, int(horse["birth_year"])))
        if hit:
            return hit
        hit = lookup["by_name"].get(normalized)
        if hit:
            return hit
    return None


def derive_chefs(
    horses: list[dict[str, Any]], samples: list[dict[str, Any]], cache_dir: Path
) -> tuple[dict[str, str], dict[str, dict[str, Any]], list[dict[str, Any]]]:
    lookup = sample_lookup(samples)
    chefs_by_id: dict[str, str] = {}
    chef_meta: dict[str, dict[str, Any]] = {}
    issues: list[dict[str, Any]] = []
    for horse in horses:
        sample = match_sample(horse, lookup)
        if not sample:
            continue
        path = cache_path(cache_dir, str(horse.get("jbis_id") or ""))
        if not path:
            issues.append({"horse": horse["name"], "issue": "missing_jbis_cache"})
            continue
        local_sires = dosage_sires(parse_jbis_nodes(path.read_text(encoding="utf-8")))
        remote_sires = sample.get("sires") or []
        if len(local_sires) != 15 or len(remote_sires) != 15:
            issues.append(
                {
                    "horse": horse["name"],
                    "issue": "pedigree_shape",
                    "local": len(local_sires),
                    "remote": len(remote_sires),
                }
            )
            continue
        local_by_slot = {(x["generation"], x["position"]): x for x in local_sires}
        for remote in remote_sires:
            local = local_by_slot.get((remote.get("generation"), remote.get("position")))
            if not local:
                issues.append(
                    {
                        "horse": horse["name"],
                        "issue": "pedigree_slot_missing",
                        "generation": remote.get("generation"),
                        "position": remote.get("position"),
                    }
                )
                continue
            code = remote.get("code")
            if not code:
                continue
            jbis_id = local["jbis_id"]
            previous = chefs_by_id.get(jbis_id)
            if previous and previous != code:
                issues.append(
                    {
                        "horse": horse["name"],
                        "issue": "chef_conflict",
                        "jbis_id": jbis_id,
                        "old": previous,
                        "new": code,
                    }
                )
                continue
            chefs_by_id[jbis_id] = code
            chef_meta[jbis_id] = {
                "jbis_id": jbis_id,
                "name_jbis": local["name"],
                "name_pedigreequery": remote["name"],
                "classification": code,
                "source_url": sample["url"],
            }
    return chefs_by_id, chef_meta, issues


def supplement_chefs_from_list(
    horses: list[dict[str, Any]],
    cache_dir: Path,
    list_payload: dict[str, Any],
    chefs_by_id: dict[str, str],
    chef_meta: dict[str, dict[str, Any]],
) -> None:
    classifications = {
        normalize_name(x["name"]): x for x in list_payload["classifications"]
    }
    for horse in horses:
        path = cache_path(cache_dir, str(horse.get("jbis_id") or ""))
        if not path:
            continue
        for sire in dosage_sires(parse_jbis_nodes(path.read_text(encoding="utf-8"))):
            key = normalize_name(sire["name"])
            key = NAME_EQUIVALENTS.get(key, key)
            item = classifications.get(key)
            if not item or sire["jbis_id"] in chefs_by_id:
                continue
            chefs_by_id[sire["jbis_id"]] = item["classification"]
            chef_meta[sire["jbis_id"]] = {
                "jbis_id": sire["jbis_id"],
                "name_jbis": sire["name"],
                "name_pedigreequery": item["name"],
                "classification": item["classification"],
                "source_url": list_payload["source_url"],
            }


def compare(calc: dict[str, Any], sample: dict[str, Any]) -> tuple[bool, dict[str, Any]]:
    expected = {
        "dosage_profile": profile_from_text(sample["dp"]),
        "dosage_points": sample["points"],
        "dosage_index": sample["di"],
        "center_of_distribution": sample["cd"],
    }
    matches = (
        calc["dosage_profile"] == expected["dosage_profile"]
        and calc["dosage_points"] == expected["dosage_points"]
        and calc["dosage_index"] == expected["dosage_index"]
        and calc["center_of_distribution"] == expected["center_of_distribution"]
    )
    return matches, expected


def main() -> None:
    parser = argparse.ArgumentParser()
    root_default = Path(__file__).resolve().parents[1]
    workspace_default = root_default.parents[1]
    parser.add_argument("--root", type=Path, default=root_default)
    parser.add_argument("--workspace", type=Path, default=workspace_default)
    parser.add_argument("--sample", type=Path, default=root_default / "data/sources/dosage_validation_samples.json")
    parser.add_argument(
        "--reference",
        type=Path,
        default=root_default / "data/sources/pedigreequery_dosage_reference.json",
    )
    parser.add_argument(
        "--chef-list",
        type=Path,
        default=root_default / "data/sources/chef_de_race_international_2026.json",
    )
    parser.add_argument("--validate-only", action="store_true")
    args = parser.parse_args()

    horses_path = args.root / "data/horses.json"
    cache_dir = args.workspace / "work/duramente_db/cache"
    horses = json.loads(horses_path.read_text(encoding="utf-8"))
    sample_payload = json.loads(args.sample.read_text(encoding="utf-8"))
    samples = sample_payload["samples"]
    reference_payload = json.loads(args.reference.read_text(encoding="utf-8"))
    full_chef_list = json.loads(args.chef_list.read_text(encoding="utf-8"))
    references = reference_payload["records"]
    fetch_progress_path = args.root / "data/sources/dosage_pedigree_fetch_progress.json"
    fetch_progress = (
        json.loads(fetch_progress_path.read_text(encoding="utf-8")).get("records", {})
        if fetch_progress_path.exists()
        else {}
    )
    fetched_dam_ids = {
        str(horse_id): str(record["dam_jbis_id"])
        for horse_id, record in fetch_progress.items()
        if record.get("status") == "downloaded" and record.get("dam_jbis_id")
    }
    chefs_by_id, chef_meta, derivation_issues = derive_chefs(horses, references, cache_dir)
    supplement_chefs_from_list(horses, cache_dir, full_chef_list, chefs_by_id, chef_meta)
    chef_ids_by_name = {}
    for jbis_id, meta in chef_meta.items():
        for name in (meta.get("name_jbis"), meta.get("name_pedigreequery")):
            if name:
                chef_ids_by_name[normalize_search_label(name)] = jbis_id

    sample_map = sample_lookup(samples)
    validation = []
    matched_samples = 0
    for horse in horses:
        sample = match_sample(horse, sample_map)
        if not sample:
            continue
        path = cache_path(cache_dir, str(horse.get("jbis_id") or ""))
        if not path:
            continue
        matched_samples += 1
        calc = calculate(dosage_sires(parse_jbis_nodes(path.read_text(encoding="utf-8"))), chefs_by_id)
        ok, expected = compare(calc, sample)
        validation.append(
            {
                "horse_id": horse["id"],
                "name": horse["name"],
                "name_en": horse.get("name_en"),
                "source_url": sample["url"],
                "status": "verified" if ok else "review",
                "expected": expected,
                "calculated": {k: calc[k] for k in expected},
            }
        )

    version = full_chef_list["version"]
    chef_payload = {
        "version": version,
        "source": full_chef_list["source_url"],
        "retrieved_at": sample_payload["retrieved_at"],
        "formula": {
            "generation_weights": GENERATION_WEIGHT,
            "profile_order": list(CATEGORIES),
            "di": "(B + I + C/2) / (S + P + C/2)",
            "cd": "(2B + I - S - 2P) / total_points",
        },
        "chefs": sorted(chef_meta.values(), key=lambda x: (x["name_pedigreequery"], x["jbis_id"])),
        "derivation_issues": derivation_issues,
    }
    atomic_json(args.root / "data/sources/chef_de_race.json", chef_payload)
    atomic_json(
        args.root / "data/sources/ancestor_name_aliases.json",
        {
            "version": chef_payload["version"],
            "aliases": [
                {
                    "jbis_id": x["jbis_id"],
                    "canonical": x["name_pedigreequery"],
                    "aliases": sorted({x["name_pedigreequery"], x["name_jbis"]}),
                }
                for x in chef_payload["chefs"]
            ],
        },
    )
    if args.validate_only:
        return

    reference_map = sample_lookup(references)
    sire_template = sire_half_template(horses, cache_dir)
    dosage_records = []
    reviews = []
    updated_horses = []
    for horse in horses:
        updated = dict(horse)
        path = cache_path(cache_dir, str(horse.get("jbis_id") or ""))
        dam_path, dam_id = dam_pedigree_path(cache_dir, horse, fetched_dam_ids)
        sire_nodes = None
        pedigree_basis = None
        if path:
            sire_nodes = dosage_sires(parse_jbis_nodes(path.read_text(encoding="utf-8")))
            pedigree_basis = "foal_jbis_pedigree"
        elif dam_path:
            sire_nodes = dosage_sires_from_dam(dam_path, sire_template)
            pedigree_basis = "duramente_plus_dam_jbis_pedigree"
        else:
            netkeiba_id = str(horse.get("netkeiba_id") or "")
            netkeiba_path = cache_dir / f"netkeiba_pedigree_{netkeiba_id}.html"
            if netkeiba_id and netkeiba_path.exists():
                sire_nodes = parse_netkeiba_sires(
                    netkeiba_path.read_text(encoding="utf-8"),
                    chef_ids_by_name,
                )
                pedigree_basis = "netkeiba_five_generation_pedigree"
        if not sire_nodes:
            result = {
                "horse_id": horse["id"],
                "name": horse["name"],
                "name_en": horse.get("name_en"),
                "status": "review",
                "reason": "missing_jbis_pedigree_cache",
                "dam_jbis_id": dam_id,
            }
            reviews.append(result)
            dosage_records.append(result)
            updated_horses.append(updated)
            continue
        calc = calculate(sire_nodes, chefs_by_id)
        reference = match_sample(horse, reference_map)
        status = "calculated"
        source_url = None
        expected = None
        if reference:
            same, expected = compare(calc, reference)
            status = "verified" if same else "review"
            source_url = reference["url"]
        record = {
            "horse_id": horse["id"],
            "name": horse["name"],
            "name_en": horse.get("name_en"),
            "birth_year": horse.get("birth_year"),
            "status": status,
            "source_url": source_url,
            "pedigree_basis": pedigree_basis,
            "pedigree_source_url": (
                f"https://www.jbis.or.jp/horse/{horse['jbis_id']}/pedigree/"
                if pedigree_basis == "foal_jbis_pedigree"
                else (
                    f"https://www.jbis.or.jp/horse/{dam_id}/pedigree/"
                    if pedigree_basis == "duramente_plus_dam_jbis_pedigree"
                    else f"https://db.netkeiba.com/horse/ped/{horse['netkeiba_id']}/"
                )
            ),
            **{k: calc[k] for k in (
                "dosage_profile",
                "dosage_profile_text",
                "dosage_points",
                "dosage_index",
                "center_of_distribution",
            )},
        }
        if status == "review":
            reviews.append({**record, "expected": expected})
        dosage_records.append(record)
        updated.update(
            {
                "dosage_profile": calc["dosage_profile_text"],
                "dosage_points": calc["dosage_points"],
                "dosage_index": calc["dosage_index"],
                "center_of_distribution": calc["center_of_distribution"],
                "dosage_status": status,
                "dosage_source_url": source_url,
                "dosage_chef_version": chef_payload["version"],
            }
        )
        updated_horses.append(updated)

    di_values = [x["dosage_index"] for x in dosage_records if x.get("dosage_index") is not None]
    cd_values = [x["center_of_distribution"] for x in dosage_records if x.get("center_of_distribution") is not None]
    status_counts = {key: sum(x.get("status") == key for x in dosage_records) for key in ("verified", "calculated", "review")}
    analytics = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "chef_version": chef_payload["version"],
        "sources": [
            {
                "name": "PedigreeQuery",
                "url": reference_payload["source"],
                "retrieved_at": reference_payload["retrieved_at"],
            },
            {
                "name": "JBIS五代血统缓存",
                "url": "https://www.jbis.or.jp/horse/",
            },
        ],
        "formula": chef_payload["formula"],
        "coverage": {
            "horses": len(horses),
            **status_counts,
            "with_values": len(di_values),
        },
        "summary": {
            "di_average": round_half_up(sum(di_values) / len(di_values)) if di_values else None,
            "di_median": sorted(di_values)[len(di_values) // 2] if di_values else None,
            "cd_average": round_half_up(sum(cd_values) / len(cd_values)) if cd_values else None,
            "cd_median": sorted(cd_values)[len(cd_values) // 2] if cd_values else None,
        },
        "records": dosage_records,
    }
    atomic_json(horses_path, updated_horses, compact=True)
    atomic_json(args.root / "data/analytics/dosage.json", analytics)
    atomic_json(args.root / "data/dosage_review.json", {"count": len(reviews), "records": reviews})

    details_dir = args.root / "data/horses"
    for horse in updated_horses:
        detail_path = details_dir / f"{horse['id']}.json"
        if not detail_path.exists():
            continue
        detail = json.loads(detail_path.read_text(encoding="utf-8"))
        detail_horse = detail.get("horse") or {}
        for key in (
            "dosage_profile",
            "dosage_points",
            "dosage_index",
            "center_of_distribution",
            "dosage_status",
            "dosage_source_url",
            "dosage_chef_version",
        ):
            if key in horse:
                detail_horse[key] = horse[key]
        detail["horse"] = detail_horse
        atomic_json(detail_path, detail, compact=True)

    print(
        json.dumps(
            {
                "horses": len(updated_horses),
                **status_counts,
                "review_records": len(reviews),
                "chef_count": len(chefs_by_id),
            },
            ensure_ascii=False,
        )
    )
    atomic_json(
        args.root / "data/sources/dosage_validation_results.json",
        {
            "sample_count": len(samples),
            "matched_sample_count": matched_samples,
            "verified_count": sum(x["status"] == "verified" for x in validation),
            "review_count": sum(x["status"] == "review" for x in validation),
            "records": validation,
        },
    )
    print(
        json.dumps(
            {
                "samples": len(samples),
                "matched": matched_samples,
                "chefs": len(chefs_by_id),
                "verified": sum(x["status"] == "verified" for x in validation),
                "review": sum(x["status"] == "review" for x in validation),
                "issues": len(derivation_issues),
            },
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()

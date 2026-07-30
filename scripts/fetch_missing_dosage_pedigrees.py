#!/usr/bin/env python3
"""Fetch only missing JBIS dam pedigrees needed by the dosage build."""

from __future__ import annotations

import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

from build_dosage import (
    atomic_json,
    exact_search_result_id,
    normalize_search_label,
)


ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT.parents[1]
CACHE = WORKSPACE / "work/duramente_db/cache"
LOOKUP = CACHE / "female_family_lookup"
PROGRESS = ROOT / "data/sources/dosage_pedigree_fetch_progress.json"
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"


def safe_name(value: str) -> str:
    return re.sub(r"[^\w]+", "_", value)


def fetch(url: str, target: Path, encoding: str | None = None) -> str:
    if target.exists() and target.stat().st_size > 10_000:
        return target.read_text(encoding="utf-8", errors="ignore")
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                body = response.read()
                response_encoding = response.headers.get_content_charset()
            text = body.decode(encoding or response_encoding or "utf-8", errors="ignore")
            if len(text) < 10_000:
                raise ValueError(f"unexpected response length: {len(text)}")
            target.parent.mkdir(parents=True, exist_ok=True)
            temporary = target.with_suffix(target.suffix + ".tmp")
            temporary.write_text(text, encoding="utf-8")
            temporary.replace(target)
            return text
        except (OSError, urllib.error.URLError, ValueError) as exc:
            last_error = exc
            time.sleep(2 ** attempt)
    raise RuntimeError(f"{url}: {last_error}")


def search_dam_id(horse: dict) -> tuple[str | None, str]:
    known = str(horse.get("dam_jbis_id") or "")
    if known:
        return known, "horse_record"
    dam = str(horse.get("dam") or "")
    sire = str(horse.get("broodmare_sire") or "")
    query = urllib.parse.urlencode(
        {"sid": "horse", "keyword": dam, "match": "prefix"}
    )
    url = f"https://www.jbis.or.jp/horse/result/?{query}"
    path = LOOKUP / f"search_{safe_name(dam)}.html"
    page = fetch(url, path)
    dam_id = exact_search_result_id(page, dam, sire)
    if dam_id:
        return dam_id, "jbis_search_exact_name_and_sire"
    # Foreign names occasionally differ only in spaces/punctuation.
    anchors = re.findall(
        r'<a href="/horse/(\d+)/" class="txt-link">([^<]+)</a>',
        page,
    )
    name_key = normalize_search_label(dam)
    matches = {horse_id for horse_id, name in anchors if normalize_search_label(name) == name_key}
    return (next(iter(matches)), "jbis_search_normalized_name") if len(matches) == 1 else (None, "ambiguous")


def main() -> int:
    horses = json.loads((ROOT / "data/horses.json").read_text(encoding="utf-8"))
    by_id = {str(horse["id"]): horse for horse in horses}
    review = json.loads((ROOT / "data/dosage_review.json").read_text(encoding="utf-8"))["records"]
    progress = (
        json.loads(PROGRESS.read_text(encoding="utf-8"))
        if PROGRESS.exists()
        else {"records": {}}
    )
    records = progress.setdefault("records", {})
    for item in review:
        horse = by_id[str(item["horse_id"])]
        key = str(horse["id"])
        if records.get(key, {}).get("status") in {"downloaded", "downloaded_netkeiba"}:
            continue
        dam = str(horse.get("dam") or "")
        try:
            dam_id, basis = search_dam_id(horse)
            if not dam_id:
                netkeiba_id = str(horse.get("netkeiba_id") or "")
                if not netkeiba_id:
                    records[key] = {
                        "horse": horse["name"],
                        "dam": dam,
                        "status": "not_found",
                        "basis": basis,
                    }
                else:
                    url = f"https://db.netkeiba.com/horse/ped/{netkeiba_id}/"
                    target = CACHE / f"netkeiba_pedigree_{netkeiba_id}.html"
                    fetch(url, target, encoding="euc_jp")
                    records[key] = {
                        "horse": horse["name"],
                        "dam": dam,
                        "status": "downloaded_netkeiba",
                        "basis": "netkeiba_five_generation_pedigree",
                        "source_url": url,
                    }
            else:
                url = f"https://www.jbis.or.jp/horse/{dam_id}/pedigree/"
                target = LOOKUP / f"dam_{dam_id}_pedigree.html"
                fetch(url, target)
                records[key] = {
                    "horse": horse["name"],
                    "dam": dam,
                    "dam_jbis_id": dam_id,
                    "status": "downloaded",
                    "basis": basis,
                    "source_url": url,
                }
        except Exception as exc:
            records[key] = {
                "horse": horse["name"],
                "dam": dam,
                "status": "failed",
                "error": str(exc),
            }
        atomic_json(PROGRESS, progress)
        time.sleep(1)
    counts = {}
    for record in records.values():
        counts[record["status"]] = counts.get(record["status"], 0) + 1
    print(json.dumps(counts, ensure_ascii=False))
    return 0 if not counts.get("failed") else 1


if __name__ == "__main__":
    sys.exit(main())

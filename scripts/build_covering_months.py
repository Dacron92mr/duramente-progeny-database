#!/usr/bin/env python3
"""Build aggregate covering-month analytics from Japan Stud Book.

The source page contains one row per mare covered by Duramente in each season.
Only aggregate month/sex/performance counts are written; source rows are not
republished. Requests are sequential and deliberately rate-limited.
"""

from __future__ import annotations

import argparse
import http.client
import json
import re
import time
import unicodedata
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import date
from pathlib import Path

from lxml import html


SOURCE_URL = "https://www.studbook.jp/users/ja/SearchChichiShushibaList"
STALLION_ID = "3171846768480"
PAGE_COUNT = 54
COUNTRY_SUFFIX = re.compile(r"[（(][A-ZＡ-Ｚ]{2,3}[）)]$")


def normalize_name(value: str | None) -> str:
    text = unicodedata.normalize("NFKC", value or "")
    text = COUNTRY_SUFFIX.sub("", text.strip())
    return re.sub(r"[\s・･]", "", text)


def parse_covering_rows(body: bytes) -> list[dict]:
    document = html.fromstring(body)
    rows = []
    for tr in document.xpath("//table[contains(concat(' ', normalize-space(@class), ' '), ' table_result ')]/tr"):
        cells = tr.xpath("./td")
        if len(cells) != 4:
            continue
        mare_links = cells[0].xpath(".//a[contains(@href, '/Honba?hid=')]")
        dates = re.findall(r"\b(20\d{2})/(\d{2})/(\d{2})\b", " ".join(cells[3].itertext()))
        if not mare_links or not dates:
            continue
        covering_year, month, day = map(int, dates[0])
        rows.append({
            "mare": normalize_name("".join(mare_links[0].itertext())),
            "covering_date": date(covering_year, month, day),
        })
    return rows


def fetch_page(page: int, delay: float) -> bytes:
    query = urllib.parse.urlencode({"hid": STALLION_ID, "page": page})
    request = urllib.request.Request(
        f"{SOURCE_URL}?{query}",
        headers={"User-Agent": "DuramenteProgenyDatabase/1.0 (non-commercial aggregate research)"},
    )
    if page > 1:
        time.sleep(delay)
    last_error = None
    for attempt in range(1, 4):
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                return response.read()
        except (OSError, TimeoutError, http.client.HTTPException) as error:
            last_error = error
            if attempt < 3:
                time.sleep(delay * attempt)
    raise RuntimeError(f"Failed to fetch page {page} after 3 attempts") from last_error


def is_graded(horse: dict) -> bool:
    return horse.get("achievement_class") in {"G1", "G2", "G3"}


def wins(horse: dict) -> int:
    match = re.search(r"(\d+)勝", str(horse.get("career_summary") or ""))
    return int(match.group(1)) if match else 0


def build(horses: list[dict], delay: float) -> dict:
    source_rows = []
    for page in range(1, PAGE_COUNT + 1):
        page_rows = parse_covering_rows(fetch_page(page, delay))
        if not page_rows:
            raise RuntimeError(f"No covering rows found on page {page}")
        source_rows.extend(page_rows)
        print(f"page {page:02d}/{PAGE_COUNT}: {len(page_rows)} rows", flush=True)

    by_mare_year: dict[tuple[str, int], list[date]] = defaultdict(list)
    for row in source_rows:
        by_mare_year[(row["mare"], row["covering_date"].year)].append(row["covering_date"])

    aggregate = {
        month: {"male": {"foals": 0, "winners": 0, "graded_winners": 0},
                "female": {"foals": 0, "winners": 0, "graded_winners": 0}}
        for month in range(1, 13)
    }
    unmatched = []
    ambiguous = []
    for horse in horses:
        key = (normalize_name(horse.get("dam")), int(horse["birth_year"]) - 1)
        dates = by_mare_year.get(key, [])
        if not dates:
            unmatched.append({"horse_id": horse["id"], "name": horse["name"], "dam": horse.get("dam"), "birth_year": horse["birth_year"]})
            continue
        if len(dates) > 1:
            ambiguous.append({"horse_id": horse["id"], "name": horse["name"], "dates": [item.isoformat() for item in dates]})
        covering_date = sorted(dates)[-1]
        sex = "female" if horse.get("sex") == "牝" else "male"
        bucket = aggregate[covering_date.month][sex]
        bucket["foals"] += 1
        bucket["winners"] += int(wins(horse) > 0)
        bucket["graded_winners"] += int(is_graded(horse))

    matched = len(horses) - len(unmatched)
    return {
        "source": SOURCE_URL + "?hid=" + STALLION_ID + "&kid=",
        "source_name": "Japan Stud Book / 種雄馬別種付け雌馬一覧",
        "retrieved_at": date.today().isoformat(),
        "definition": "実際の種付年月日の月。セン馬は牡に合算。勝馬率・重賞馬率は独立産駒数ベース。",
        "coverage": {
            "horses": len(horses),
            "matched": matched,
            "rate": round(matched / len(horses), 4),
            "source_rows": len(source_rows),
            "ambiguous": len(ambiguous),
            "unmatched": len(unmatched),
        },
        "months": [{"month": month, **aggregate[month]} for month in range(1, 13)],
        "review": {"unmatched": unmatched, "ambiguous": ambiguous},
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--delay", type=float, default=2.0, help="seconds between source requests")
    parser.add_argument("--horses", type=Path, default=Path("data/horses.json"))
    parser.add_argument("--output", type=Path, default=Path("data/analytics/covering_months.json"))
    args = parser.parse_args()
    horses = json.loads(args.horses.read_text(encoding="utf-8"))
    result = build(horses, args.delay)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result["coverage"], ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()

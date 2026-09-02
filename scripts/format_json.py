#!/usr/bin/env python3
"""Format repository JSON files for human-readable editing."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATA_DIR = ROOT / "data"


def json_files(paths: list[str]) -> list[Path]:
    if not paths:
        return sorted(DEFAULT_DATA_DIR.rglob("*.json"))

    files: set[Path] = set()
    for raw_path in paths:
        path = (ROOT / raw_path).resolve()
        if path.is_dir():
            files.update(path.rglob("*.json"))
        elif path.suffix.lower() == ".json":
            files.add(path)
        else:
            raise ValueError(f"Not a JSON file or directory: {raw_path}")
    return sorted(files)


def formatted_json(path: Path) -> str:
    with path.open("r", encoding="utf-8") as source:
        data = json.load(source)
    return json.dumps(data, ensure_ascii=False, indent=2) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Format data JSON using UTF-8 and two-space indentation."
    )
    parser.add_argument(
        "paths",
        nargs="*",
        help="JSON files or directories relative to the repository root (default: data/)",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Report files that need formatting without changing them.",
    )
    args = parser.parse_args()

    changed: list[Path] = []
    try:
        files = json_files(args.paths)
        for path in files:
            current = path.read_text(encoding="utf-8")
            formatted = formatted_json(path)
            if current == formatted:
                continue
            changed.append(path)
            if not args.check:
                path.write_text(formatted, encoding="utf-8", newline="\n")
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"JSON formatting failed: {error}", file=sys.stderr)
        return 2

    action = "need formatting" if args.check else "formatted"
    for path in changed:
        print(f"{action}: {path.relative_to(ROOT)}")
    print(f"Checked {len(files)} JSON files; {len(changed)} {action}.")
    return 1 if args.check and changed else 0


if __name__ == "__main__":
    raise SystemExit(main())

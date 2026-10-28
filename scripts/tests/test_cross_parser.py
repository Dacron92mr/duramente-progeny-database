import hashlib
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from analytics_core import parse_crosses

ROOT = Path(__file__).resolve().parents[2]


class CrossParserTests(unittest.TestCase):
    def test_multiple_patterns_for_one_ancestor_using_comma(self):
        entries = parse_crosses(
            "Mr. Prospector: S4×M4, S4×M5\n"
            "Northern Dancer: S5×M5"
        )
        self.assertEqual(
            [(entry["ancestor"], entry["canonical_pattern"]) for entry in entries],
            [
                ("Mr. Prospector", "S4xM4"),
                ("Mr. Prospector", "S4xM5"),
                ("Northern Dancer", "S5xM5"),
            ],
        )

    def test_japanese_punctuation_never_joins_pattern_to_ancestor(self):
        entries = parse_crosses(
            "Mr. Prospector：S4×M4、S4×M5；"
            "Northern Dancer：S5×M5"
        )
        self.assertEqual([entry["ancestor"] for entry in entries], [
            "Mr. Prospector",
            "Mr. Prospector",
            "Northern Dancer",
        ])
        for entry in entries:
            self.assertNotRegex(entry["ancestor"], r"[SM]\d|[×,，;；、]")

    def test_existing_whitespace_separated_format_is_unchanged(self):
        entries = parse_crosses(
            "Halo(USA) ：S4×M4 Northern Dancer(CAN) ：M5×M5"
        )
        self.assertEqual(
            [(entry["ancestor"], entry["ancestor_country"], entry["canonical_pattern"]) for entry in entries],
            [
                ("Halo(USA)", "USA", "S4xM4"),
                ("Northern Dancer(CAN)", "CAN", "M5xM5"),
            ],
        )

    def test_current_726_horse_parse_snapshot_is_unchanged(self):
        horses = json.loads((ROOT / "data/horses.json").read_text())
        payload = {
            str(horse["id"]): parse_crosses(horse.get("pedigree_crosses"))
            for horse in horses
        }
        encoded = json.dumps(
            payload,
            sort_keys=True,
            ensure_ascii=False,
            separators=(",", ":"),
        ).encode()
        self.assertEqual(
            hashlib.sha256(encoded).hexdigest(),
            "5129648a685cb019981dbe567daee736fce564c82d5e32fa9751d0b433211d63",
        )


if __name__ == "__main__":
    unittest.main()

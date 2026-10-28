import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from build_summary import build_summary, summary_mismatches

ROOT = Path(__file__).resolve().parents[2]


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


class SummaryConsistencyTests(unittest.TestCase):
    def test_published_summary_matches_owned_catalogue_fields(self):
        horses = read(ROOT / "data/horses.json")
        summary = read(ROOT / "data/summary.json")
        self.assertEqual(summary_mismatches(summary, horses), [])

    def test_builder_updates_only_owned_fields(self):
        horses = [
            {
                "id": 1,
                "sex": "牝",
                "birth_year": 2022,
                "color": "鹿毛",
                "trainer_region": "美浦",
                "breeder": "A",
                "broodmare_sire": "B",
                "female_family": "9",
                "dam_age_at_foaling": 10,
                "bms_line": "Northern Dancer",
                "achievement_class": "G1",
                "breeding_role": "Progeny Record",
                "jbis_id": "123",
                "netkeiba_id": "456",
            }
        ]
        previous = {
            "horses": 999,
            "sources": [{"source": "curated", "count": 7}],
            "facets": {
                "trainers": [{"value": "历史练马师", "region": "地方", "count": 2}],
                "owners": [{"value": "历史马主", "count": 2}],
                "customFacet": [{"value": "保留", "count": 1}],
            },
        }
        result = build_summary(previous, horses)
        self.assertEqual(result["horses"], 1)
        self.assertEqual(result["sources"], previous["sources"])
        self.assertEqual(result["facets"]["trainers"], previous["facets"]["trainers"])
        self.assertEqual(result["facets"]["owners"], previous["facets"]["owners"])
        self.assertEqual(result["facets"]["customFacet"], previous["facets"]["customFacet"])
        self.assertEqual(result["facets"]["regions"], [{"value": "美浦", "count": 1}])

    def test_mismatch_detection_catches_counts_and_facets(self):
        horses = read(ROOT / "data/horses.json")
        summary = read(ROOT / "data/summary.json")
        broken = json.loads(json.dumps(summary))
        broken["horses"] -= 1
        broken["facets"]["colors"][0]["count"] += 1
        mismatches = summary_mismatches(broken, horses)
        self.assertIn("horses", mismatches)
        self.assertIn("facets.colors", mismatches)


if __name__ == "__main__":
    unittest.main()

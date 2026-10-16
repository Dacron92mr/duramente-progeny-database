import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts'))
from analytics_core import effective_surface, canonical_racecourse, racecourse_analysis


class SurfaceClassificationTests(unittest.TestCase):
    def test_catalog_matches_rules_and_source_is_immutable(self):
        catalog = json.loads((ROOT / 'data/surface_classifications.json').read_text())
        for course, expected in catalog['courses'].items():
            source = {'meeting': course, 'surface': '芝'}
            self.assertEqual(effective_surface(source), expected)
            self.assertEqual(source['surface'], '芝')
        self.assertEqual(effective_surface({'meeting': 'Ballarat', 'surface': '芝'}), '芝')
        self.assertEqual(canonical_racecourse('ソウル')[:2], ('Seoul', 'Overseas'))
        self.assertEqual(canonical_racecourse('ヨーク')[:2], ('York', 'Overseas'))

    def test_published_course_totals_reconcile_with_every_original_race(self):
        horses = json.loads((ROOT / 'data/horses.json').read_text())
        races = []
        for horse in horses:
            rows = json.loads((ROOT / 'data/horses' / f"{horse['id']}.json").read_text())['races']
            races.extend({**r, 'horse_id': horse['id'], 'name': horse['name']} for r in rows)
        generated = racecourse_analysis(races)
        published = json.loads((ROOT / 'data/analytics/racecourses.json').read_text())
        self.assertEqual(generated['table'], published['table'])
        self.assertEqual(generated['summary'], published['summary'])
        self.assertEqual(len(generated['overseas_history']), 32)
        self.assertEqual(sum(r['surface'] == '合成' for r in generated['overseas_history']), 4)
        self.assertEqual(sum(r['finish'] == 1 and r['surface'] == '合成' for r in generated['overseas_history']), 1)


if __name__ == '__main__':
    unittest.main()

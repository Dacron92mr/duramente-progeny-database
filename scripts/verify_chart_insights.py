"""Check independent accounting invariants for the added analytical views."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
def read(name):
    return json.loads((ROOT / 'data/analytics' / (name + '.json')).read_text())
insights, profile, awd = read('chart_insights'), read('sire_profile'), read('awd')
for row in insights['concentrations']:
    crop = next(c for c in profile['crops'] if int(c['label']) == row['year'])
    assert abs(sum(row['values']) - row['total']) < 0.2
    assert abs(row['total'] - crop['total_earnings']) < 0.2, row
    assert row['foals'] == crop['foals']
    assert all(v >= 0 for v in row['values'])
for key, summary_key in [('turf', 'turf_wins'), ('dirt', 'dirt_wins')]:
    assert sum(r[key] for r in insights['distances']) == awd['summary'][summary_key]
    weighted = sum(r[key] * r['distance'] for r in insights['distances']) / awd['summary'][summary_key]
    assert abs(weighted - awd['summary'][key + '_awd']) < 0.11
assert [r['distance'] for r in insights['distances']] == sorted(set(r['distance'] for r in insights['distances']))
print('Verified five cohort totals, earnings partitions, and both surface win totals and weighted distances.')

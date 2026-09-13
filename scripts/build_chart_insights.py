"""Derive chart inputs from existing horse totals and recorded turf/dirt wins."""
import json
from collections import Counter
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
def build():
    horses = json.loads((ROOT / 'data/horses.json').read_text())
    concentrations = []
    for year in range(2018, 2023):
        rows = [h for h in horses if h.get('birth_year') == year]
        amounts = sorted([float(h.get('earnings_netkeiba') if h.get('earnings_netkeiba') is not None else h.get('earnings_jbis') or 0) for h in rows], reverse=True)
        total = round(sum(amounts), 1)
        concentrations.append(dict(year=year, total=total, foals=len(rows), values=[round(sum(amounts[:1]),1), round(sum(amounts[1:3]),1), round(sum(amounts[3:]),1)]))
    counts = {'芝': Counter(), 'ダ': Counter()}
    for path in (ROOT / 'data/horses').glob('*.json'):
        for race in json.loads(path.read_text()).get('races', []):
            surface, distance = race.get('surface'), race.get('distance_m')
            if race.get('finish') == 1 and surface in counts and isinstance(distance, (int, float)) and distance > 0:
                counts[surface][int(distance)] += 1
    distances = sorted(set(counts['芝']) | set(counts['ダ']))
    result = dict(concentrations=concentrations, distances=[dict(distance=d, turf=counts['芝'][d], dirt=counts['ダ'][d]) for d in distances])
    (ROOT / 'data/analytics/chart_insights.json').write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
    return result
if __name__ == '__main__':
    build()

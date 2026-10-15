"""Link published course aggregates to their underlying horses, using the same valid-start rule."""
import json
from pathlib import Path
from collections import defaultdict
from analytics_core import canonical_racecourse, is_valid_start

def build(root):
    courses = defaultdict(lambda: {'horse_ids': set(), 'starts': 0, 'wins': 0, 'top3': 0})
    for horse in json.loads((root/'data/horses.json').read_text()):
        detail = json.loads((root/'data/horses'/f"{horse['id']}.json").read_text())
        for race in detail.get('races', []):
            if not is_valid_start(race):
                continue
            name, _, _ = canonical_racecourse(race.get('meeting'))
            row = courses[name]
            row['horse_ids'].add(str(horse['id']))
            row['starts'] += 1
            row['wins'] += race['finish'] == 1
            row['top3'] += race['finish'] <= 3
    output = {'method': 'Distinct horse IDs with at least one positive integer finish at each course; canonicalization and valid-start rule from analytics_core.', 'courses': {key: {**row, 'horse_ids': sorted(row['horse_ids'], key=int)} for key, row in sorted(courses.items())}}
    path = root/'data/analytics/racecourse_population.json'
    path.write_text(json.dumps(output, ensure_ascii=False, indent=2)+'\n')
    return output

if __name__ == '__main__':
    build(Path(__file__).resolve().parents[1])

"""Index public netkeiba photo references; never download or republish image files.

Only photo IDs actually listed on the matching horse profile are accepted.
Failed requests retain existing references; a profile without photos is recorded
separately from a fetch failure. Run manually when refreshing the photo catalog.
"""
import concurrent.futures
import html
import json
import re
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def photo_ids(text, horse_id):
    pattern = rf'show_photo\.php\?horse_id={re.escape(horse_id)}&no=(\d+)'
    return list(dict.fromkeys(re.findall(pattern, html.unescape(text))))[:10]


def fetch(horse):
    horse_id = str(horse.get('netkeiba_id') or '')
    if not re.fullmatch(r'\d{10}', horse_id):
        return horse_id, None
    request = urllib.request.Request(f'https://db.netkeiba.com/horse/{horse_id}/',
                                     headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            text = response.read().decode('euc-jp', errors='replace')
        # Do not overwrite the cache with a block / challenge / unrelated page.
        if f'/horse/{horse_id}/' not in text or 'HorseMainPhoto' not in text and 'horse_photo' not in text:
            return horse_id, None
        return horse_id, photo_ids(text, horse_id)
    except (urllib.error.URLError, TimeoutError, OSError):
        return horse_id, None
    finally:
        time.sleep(0.8)


def main():
    path = ROOT / 'data/horse_photos.json'
    catalog = json.loads(path.read_text()) if path.exists() else {'horses': {}}
    horses = json.loads((ROOT / 'data/horses.json').read_text())
    success = failed = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        for index, (horse_id, photos) in enumerate(pool.map(fetch, horses), 1):
            if photos is None:
                failed += 1
            else:
                catalog['horses'][horse_id] = photos
                success += 1
            if index % 30 == 0:
                print(f'{index}/{len(horses)} profiles; {success} checked; {failed} unavailable', flush=True)
                path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')
    catalog['updated_at'] = datetime.now(timezone.utc).isoformat()
    catalog['source'] = 'Photo IDs listed on each public netkeiba horse profile; images remain hosted by netkeiba.'
    path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n')
    print(f'Finished: {success} checked, {failed} unavailable, {sum(bool(v) for v in catalog["horses"].values())} with photos', flush=True)


if __name__ == '__main__':
    main()

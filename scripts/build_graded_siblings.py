"""Cache verified same-dam graded winners from public representative-progeny tables.
Keep source links and explicit winning race labels; this is not an exhaustive pedigree census.
"""
import concurrent.futures
import json
import re
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from html import unescape

ROOT = Path(__file__).resolve().parents[1]
GRADE = re.compile(r'\((?:J[・.]?)?(?:G[123ⅠⅡⅢ]?|Jpn[123ⅠⅡⅢ])\)', re.I)

def parse(text, dam_id):
    if f'mare_id={dam_id}' not in text:
        raise ValueError('Missing matching dam identity')
    table = re.search(r'<table[^>]*summary="代表産駒"[^>]*>(.*?)</table>', text, re.S)
    result = []
    if not table:
        return result
    for row in re.findall(r'<tr[^>]*>(.*?)</tr>', table[1], re.S):
        links = [(unescape(url), unescape(re.sub(r'<[^>]+>', '', label)).strip())
                 for url, label in re.findall(r'<a[^>]*href="([^"]+)"[^>]*>(.*?)</a>', row, re.S)]
        horse = next(((url, label) for url, label in links if re.search(r'/horse/\d{10}/$', url)), None)
        wins = [label for url, label in links if '/race/' in url and GRADE.search(label)]
        if not horse or not wins:
            continue
        sire = next((label for url, label in links if '/horse/sire/' in url), '')
        horse_id = re.search(r'/horse/(\d{10})/', horse[0])[1]
        result.append({'name': horse[1], 'netkeiba_id': horse_id, 'sire': sire,
                       'birth_year': int(horse_id[:4]), 'major_win': ' / '.join(wins),
                       'source_url': f'https://db.netkeiba.com/horse/{dam_id}/'})
    return result

def fetch(dam_id):
    url = f'https://db.netkeiba.com/horse/ajax_horse_breeding.html?input=UTF-8&output=json&id={dam_id}'
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=20) as response:
            payload = json.load(response)
        if payload.get('status') != 'OK':
            raise ValueError('Unavailable profile')
        return dam_id, parse(payload['data'], dam_id)
    except Exception as error:
        return dam_id, None
    finally:
        time.sleep(.4)

def main():
    path = ROOT / 'data/graded_siblings.json'
    catalog = json.loads(path.read_text()) if path.exists() else {'dams': {}}
    horses = json.loads((ROOT / 'data/horses.json').read_text())
    dams = sorted({str(h['dam_netkeiba_id']) for h in horses if re.fullmatch(r'\d{10}', str(h.get('dam_netkeiba_id', '')))})
    pending = [d for d in dams if d not in catalog['dams']]
    failed = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        for index, (dam, siblings) in enumerate(pool.map(fetch, pending), 1):
            if siblings is not None:
                catalog['dams'][dam] = siblings
            else:
                failed.append(dam)
            if index % 40 == 0:
                path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2)+'\n')
                print(f'{index}/{len(pending)} checked; unavailable: {len(failed)}', flush=True)
    catalog.update(updated_at=datetime.now(timezone.utc).isoformat(), unavailable=failed,
                   scope='Verified graded wins in netkeiba representative progeny tables, supplemented in the UI by database horses sharing the same dam ID. Not exhaustive.')
    path.write_text(json.dumps(catalog, ensure_ascii=False, indent=2)+'\n')
    print(f'Completed {len(catalog["dams"])} dams; {sum(len(v) for v in catalog["dams"].values())} winner references; {len(failed)} unavailable', flush=True)

if __name__ == '__main__':
    main()

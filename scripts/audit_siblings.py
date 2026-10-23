"""Resumable, evidence-only same-dam census. Never infer absence from failed requests.
Public list rows establish identity; full race records establish qualification.
Cached HTML stays outside the repository. Honors robots and stops on restrictions.
"""
import argparse,json,re,hashlib,time
from pathlib import Path
from datetime import datetime,timezone
from urllib.parse import urljoin
from sync_sources import Tables,clean,parse_races,identity
from weekly_sync import Client,SourceUnavailable
from analytics_core import canonical_racecourse

def parse_offspring(page,dam):
 p=Tables();p.feed(page)
 t=next((t for t in p.tables if t['attrs'].get('summary')=='競走馬検索結果'),None)
 if not t:raise ValueError('complete offspring table unavailable')
 rows=[]
 for row in t['rows'][1:]:
  if len(row)<8:raise ValueError('offspring columns changed')
  links=[u for c in row for u in c['links']]
  if not any('mare_id='+dam in u for u in row[7]['links']):raise ValueError('maternal identity mismatch')
  match=next((re.search(r'/horse/([0-9a-z]+)/?$',u) for u in row[1]['links'] if re.search(r'/horse/([0-9a-z]+)/?$',u)),None)
  if not match:raise ValueError('offspring identity missing')
  rows.append({'netkeiba_id':match[1],'name':clean(row[1]['text']),'birth_year':clean(row[3]['text'])})
 # Most dams have fewer than 20 progeny. Refuse to silently accept truncated lists.
 if re.search(r'>\s*次[への]|rel=["\']next',page):raise ValueError('pagination needs review')
 if not rows:raise ValueError('empty list is not proof of absence')
 return rows

def evidence(races):
 confirmed=[];regional=[]
 for r in races:
  if not isinstance(r.get('finish'),int) or not 1<=r['finish']<=3:continue
  n=r.get('race_name','');g=re.search(r'\((G(?:III|II|I|[123])|Jpn(?:III|II|I|[123])|L|OP)\)',n)
  if not g:continue
  grade=g[1];jurisdiction=canonical_racecourse(r.get('meeting'))[1]
  e={'date':r['race_date'],'race':n,'grade':grade,'finish':r['finish'],'source_url':r['race_url']}
  if jurisdiction=='JRA' and r.get('surface') in ['芝','ダ'] and r['race_date']>='2007/01/01' and (grade.startswith('G') or grade=='L'):confirmed.append(e)
  else:regional.append(e) # International/NAR designation requires race-year catalogue review.
 return confirmed,regional

def run(args):
 import threading,concurrent.futures
 root=Path(__file__).resolve().parents[1];horses=json.loads((root/'data/horses.json').read_text());byid={h['netkeiba_id']:h for h in horses if h.get('netkeiba_id')}
 path=args.output;out=json.loads(path.read_text()) if path.exists() else {'dams':{},'checked_horses':{},'failures':{}}
 cache=args.cache;cache.mkdir(parents=True,exist_ok=True)
 local=threading.local();lock=threading.Lock();clock=[0];stopped=threading.Event()
 def fetch(url):
  p=cache/(hashlib.sha256(url.encode()).hexdigest()+'.html')
  if p.exists():return p.read_text()
  if args.offline:raise SourceUnavailable('source not cached; no offline inference')
  if stopped.is_set():raise SourceUnavailable('audit stopped after source restriction')
  if not hasattr(local,'client'):local.client=Client(min_interval=args.interval)
  for attempt in range(2):
   try:
    with lock:
     wait=clock[0]-time.monotonic()
     if wait>0:time.sleep(wait)
     clock[0]=time.monotonic()+max(1,args.interval)
    content=local.client.get(url);tmp=p.with_suffix('.tmp');tmp.write_text(content);tmp.replace(p);return content
   except (OSError,SourceUnavailable):
    if local.client.blocked:stopped.set();raise
    if attempt:raise
 def save():
  out['checked_at']=datetime.now(timezone.utc).isoformat();out['population']=len(horses);out['unique_dams']=len(dams);out['unresolved_horses']=[h['id'] for h in horses if not h.get('dam_netkeiba_id')]
  path.parent.mkdir(parents=True,exist_ok=True);tmp=path.with_suffix('.tmp');tmp.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n');tmp.replace(path)
 dams=list(dict.fromkeys(h['dam_netkeiba_id'] for h in horses if h.get('dam_netkeiba_id')))
 def maternal(dam):
  url=f'https://db.netkeiba.com/horse/list.html?mare_id={dam}'
  rows=parse_offspring(fetch(url),dam)
  if not {h['netkeiba_id'] for h in horses if h.get('dam_netkeiba_id')==dam}.issubset({r['netkeiba_id'] for r in rows}):raise ValueError('source list misses database offspring')
  return {'identity_source':url,'offspring':rows}
 def phase(keys,worker,bucket,prefix):
  with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
   pending={pool.submit(worker,k):k for k in keys}
   for index,f in enumerate(concurrent.futures.as_completed(pending),1):
    key=pending[f]
    try:out[bucket][key]=f.result();out['failures'].pop(prefix+key,None)
    except (ValueError,OSError,SourceUnavailable) as e:
     out['failures'][prefix+key]=str(e)
     if 'challenge or access limit' in str(e):stopped.set()
    if index%10==0:save();print(prefix,index,'/',len(keys),'verified',len(out[bucket]),'errors',len(out['failures']),flush=True)
    if stopped.is_set():
     for task in pending:task.cancel()
     break
  save()
 phase([d for d in dams if d not in out['dams']],maternal,'dams','dam:')
 candidates={r['netkeiba_id']:r for d in out['dams'].values() for r in d['offspring']}
 legacy=json.loads((root/'data/graded_siblings.json').read_text())['dams'];priority={r['netkeiba_id'] for rs in legacy.values() for r in rs}
 def history(key):
  h=candidates[key]
  if key in byid:
   races=json.loads((root/'data/horses'/f"{byid[key]['id']}.json").read_text())['races'];source='local sourced records'
  else:
   source=f'https://db.netkeiba.com/horse/result/{key}/';page=fetch(source);identity(page,h)
   if '競走データがありません' in page:
    return {'name':h['name'],'evidence':[],'regional_review':[],'source':source,'source_status':'no-race-data'}
   races=parse_races(page,h,check_sectionals=False) # Sectional times do not determine black-type placings.
  confirmed,regional=evidence(races)
  return {'name':h['name'],'evidence':confirmed,'regional_review':regional,'source':source}
 if not stopped.is_set():phase(sorted([k for k in candidates if args.reclassify or k not in out['checked_horses']],key=lambda k:(k not in priority,k)),history,'checked_horses','horse:')
 print('DONE',len(out['dams']),len(out['checked_horses']),len(out['failures']),flush=True)
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--cache',type=Path,required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--interval',type=float,default=4);p.add_argument('--offline',action='store_true');p.add_argument('--reclassify',action='store_true');run(p.parse_args())

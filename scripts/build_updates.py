"""Build a source-backed editorial feed from accepted data; publish with the same site revision."""
import hashlib,json
from datetime import datetime,timezone
from pathlib import Path

def read(p,default):return json.loads(p.read_text()) if p.exists() else default
def digest(v):return hashlib.sha256(json.dumps(v,sort_keys=True,ensure_ascii=False).encode()).hexdigest()
def build(root,today=None):
 today=today or datetime.now(timezone.utc).date().isoformat();data=root/'data'
 state_path=data/'updates_state.json';old=read(state_path,{})
 feed=read(data/'updates.json',{'events':[]});known={e['id'] for e in feed['events']};new={}
 careers=read(data/'post_racing_careers.json',{'horses':{}})['horses'];history=read(data/'career_history_verified.json',{'horses':{}})['horses'];affiliations=read(data/'career_history.json',{'horses':{}})['horses']
 def add(h,kind,key,date,title,source,featured=False):
  eid=f"{h['id']}:{kind}:{key}"
  if eid in known or not source or not source.startswith('https://'):return
  date=(date or '').replace('/','-')
  historical=not date or date[:4]!=today[:4] or (len(date)==10 and (datetime.fromisoformat(today)-datetime.fromisoformat(date)).days>30)
  feed['events'].append(dict(id=eid,horse_id=h['id'],horse_name=h['name'],type=kind,event_date=date or None,recorded_at=today,title=title,source_url=source,historical=historical,featured=featured));known.add(eid)
 for h in read(data/'horses.json',[]):
  hid=str(h['id']);detail=read(data/'horses'/f'{hid}.json',{});before=old.get(hid,{})
  races={str(r.get('race_id') or digest([r.get('race_date'),r.get('race_name')])):digest(r) for r in detail.get('races',[])}
  for r in detail.get('races',[]):
   key=str(r.get('race_id') or digest([r.get('race_date'),r.get('race_name')]))
   if before and before.get('races',{}).get(key)!=races[key]:
    title=f"{r.get('race_name','赛果')} · {str(r['finish'])+'着' if r.get('finish') else '赛果补充'}"
    add(h,'race',key+':'+races[key][:8],r.get('race_date'),title,r.get('race_url'),r.get('finish')==1)
  stud=detail.get('stud',[]);stud_hash=digest(stud)
  if before and before.get('stud')!=stud_hash and stud:
   add(h,'breeding',stud_hash,None,'繁殖资料补充',next((p.get('studbook_url') for p in stud if p.get('studbook_url')),None),True)
  for e in careers.get(hid,{}).get('events',[]):add(h,'career',digest(e)[:12],e.get('date'),e['summary'],e['source_url'],True)
  for e in history.get(hid,{}).get('registration',[]):add(h,'registration',digest(e)[:12],e.get('date'),e['title']+' · '+e['summary'],e['source_url'],True)
  # A single explicitly verified recent result seeds the initial editorial feed.
  if not old and hid=='40':
   for r in detail.get('races',[]):
    if r.get('race_date')=='2026/10/17' and r.get('finish')==1:add(h,'race',str(r['race_id'])+':'+digest(r)[:8],r['race_date'],r['race_name']+'夺冠',r['race_url'],True)
  entries=affiliations.get(hid,{}).get('affiliations',[]);aff_hash=digest(entries)
  if before.get('affiliations') and before['affiliations']!=aff_hash and entries:
   latest=max(entries,key=lambda e:e.get('date') or e.get('observed_at') or '')
   add(h,'affiliation',aff_hash,latest.get('date'),'所属资料补充 · '+ ' / '.join(v for v in [latest.get('trainer'),latest.get('owner')] if v),latest.get('source_url'),True)
  new[hid]={'races':races,'stud':stud_hash,'affiliations':aff_hash}
 feed['events'].sort(key=lambda e:(e['recorded_at'],e.get('event_date') or ''),reverse=True)
 feed['date_note']='事件日期与资料收录日期分别保存。记录随对应网站版本发布；不把生成时间视为部署成功时间。'
 for path,value in [(state_path,new),(data/'updates.json',feed)]:path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
 return feed
if __name__=='__main__':build(Path(__file__).resolve().parents[1])

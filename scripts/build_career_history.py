"""Append source-dated affiliation observations; never infer tenure from race venues."""
import json
from pathlib import Path

def read(p,default): return json.loads(p.read_text()) if p.exists() else default
def normalize(value): return ''.join(str(value or '').split())
def build(root):
 data=root/'data';path=data/'career_history.json';catalog=read(path,{'horses':{}})
 manual=read(data/'career_history_verified.json',{'horses':{}})['horses']
 for horse in read(data/'horses.json',[]):
  hid=str(horse['id']);detail=read(data/'horses'/f'{hid}.json',{})
  entry=catalog['horses'].setdefault(hid,{'netkeiba_id':horse.get('netkeiba_id'),'affiliations':[],'registration':[]})
  if entry.get('netkeiba_id')!=horse.get('netkeiba_id'):raise ValueError('horse identity changed; preserve history for manual review')
  events=entry['affiliations']
  for source in detail.get('sources',[]):
   raw=source.get('data') or {};date=str(source.get('fetched_at') or '')[:10]
   expected=horse.get('netkeiba_id' if source.get('source')=='netkeiba' else 'jbis_id')
   if not expected or str(source.get('source_horse_id'))!=str(expected) or not date or not source.get('url','').startswith('https://'):continue
   fields={k:normalize(raw.get(k)) for k in ['trainer','owner','affiliation']}
   if not fields['trainer'] and not fields['owner']:continue
   # Different typography is not a transfer. Keep an independently sourced observation.
   if any(e.get('trainer')==fields['trainer'] and e.get('owner')==fields['owner'] for e in events):continue
   events.append({**fields,'observed_at':date,'source_url':source['url'],'source_name':source['source'],'kind':'observation'})
  verified=manual.get(hid,{})
  for event in verified.get('affiliations',[]):
   if event not in events:events.append(event)
  entry['registration']=verified.get('registration',entry.get('registration',[]))
  entry['race_attributions']=verified.get('race_attributions',entry.get('race_attributions',[]))
 catalog['scope']='Dated source observations and verified events; observations do not establish continuous tenure. Race credit requires explicit race attribution.'
 path.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n')
 return catalog
if __name__=='__main__':build(Path(__file__).resolve().parents[1])

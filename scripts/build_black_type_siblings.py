"""Build evidence-backed local JRA flat black type; legacy summaries are not eligibility evidence."""
import json,re
from pathlib import Path
from analytics_core import canonical_racecourse

def build(root):
 horses=json.loads((root/'data/horses.json').read_text());dams={}
 for h in horses:
  if not h.get('dam_netkeiba_id'):continue
  records=json.loads((root/'data/horses'/f"{h['id']}.json").read_text())['races'];evidence=[]
  for r in records:
   grade=re.search(r'[（(](G(?:III|II|I|[123])|L)[）)]',r.get('race_name') or '')
   if grade and isinstance(r.get('finish'),int) and 1<=r['finish']<=3 and canonical_racecourse(r.get('meeting'))[1]=='JRA' and r.get('surface') in ['芝','ダ'] and str(r.get('race_date',''))>='2007' and r.get('race_url'):
    evidence.append({'date':r['race_date'],'race':r['race_name'],'grade':{'GI':'G1','GII':'G2','GIII':'G3'}.get(grade[1],grade[1]),'finish':r['finish'],'source_url':r['race_url']})
  if evidence:dams.setdefault(h['dam_netkeiba_id'],[]).append({'name':h['name'],'netkeiba_id':h['netkeiba_id'],'localId':h['id'],'evidence':sorted(evidence,key=lambda e:(e['grade'],e['finish'],e['date']))})
 # Independently checked JRA result and JBIS maternal identity; placed, not a graded winner.
 dams.setdefault('000a012f78',[]).append({'name':'ルージュスティリア','netkeiba_id':'2019104982','jbis_id':'0001312182','identity_source':'https://www.jbis.or.jp/horse/0001312182/broodmare/info/','evidence':[{'date':'2023/07/23','race':'中京記念','grade':'G3','finish':3,'source_url':'https://jra.jp/datafile/seiseki/replay/2023/064.html'}]})
 # External same-dam identities and results are audited separately and survive weekly rebuilds.
 verified=root/'data/verified_siblings.json'
 if verified.exists():
  for dam,entries in json.loads(verified.read_text()).get('dams',{}).items():
   target=dams.setdefault(dam,[])
   known={r.get('netkeiba_id'):r for r in target if r.get('netkeiba_id')}
   for entry in entries:
    if entry.get('netkeiba_id') in known:
     row=known[entry['netkeiba_id']];row['identity_source']=entry['identity_source']
     keys={(e['date'],e['finish']) for e in row['evidence']}
     row['evidence'].extend(e for e in entry['evidence'] if (e['date'],e['finish']) not in keys)
    else:target.append(entry)
 out={'coverage':json.loads(verified.read_text()).get('coverage',{}) if verified.exists() else {},'checked_at':json.loads(verified.read_text()).get('checked_at') if verified.exists() else None,'scope':'Verified JRA flat Group/Listed top-three since 2007, plus independently checked dated international designations and same-dam lists. Not a comprehensive black-type catalogue. Legacy graded_siblings.json is retained separately.','definition_source':'https://www.tjcis.com/pdf/icsc24/FrontMaterial2024.pdf','dams':dams}
 (root/'data/black_type_siblings.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
 return out
if __name__=='__main__':build(Path(__file__).resolve().parents[1])

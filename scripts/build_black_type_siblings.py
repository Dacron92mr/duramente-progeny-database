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
   grade=re.search(r'[（(](G[123]|L)[）)]',r.get('race_name') or '')
   if grade and isinstance(r.get('finish'),int) and 1<=r['finish']<=3 and canonical_racecourse(r.get('meeting'))[1]=='JRA' and r.get('surface') in ['芝','ダ'] and str(r.get('race_date',''))>='2007' and r.get('race_url'):
    evidence.append({'date':r['race_date'],'race':r['race_name'],'grade':grade[1],'finish':r['finish'],'source_url':r['race_url']})
  if evidence:dams.setdefault(h['dam_netkeiba_id'],[]).append({'name':h['name'],'netkeiba_id':h['netkeiba_id'],'localId':h['id'],'evidence':sorted(evidence,key=lambda e:(e['grade'],e['finish'],e['date']))})
 # Independently checked JRA result and JBIS maternal identity; placed, not a graded winner.
 dams.setdefault('000a012f78',[]).append({'name':'ルージュスティリア','jbis_id':'0001312182','identity_source':'https://www.jbis.or.jp/horse/0001312182/broodmare/info/','evidence':[{'date':'2023/07/23','race':'中京記念','grade':'G3','finish':3,'source_url':'https://jra.jp/datafile/seiseki/replay/2023/064.html'}]})
 out={'scope':'Verified JRA flat Group/Listed top-three from sourced local records since 2007, plus individually checked additions. Not a comprehensive black-type catalogue. Legacy graded_siblings.json is retained separately.','definition_source':'https://www.tjcis.com/pdf/icsc24/FrontMaterial2024.pdf','dams':dams}
 (root/'data/black_type_siblings.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
 return out
if __name__=='__main__':build(Path(__file__).resolve().parents[1])

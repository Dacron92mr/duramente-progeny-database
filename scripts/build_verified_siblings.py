"""Publish only positive sourced findings; retain per-progeny audit coverage."""
import argparse,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def build(audit):
 rules=json.loads((ROOT/'data/sibling_race_designations.json').read_text())['races']
 def reviewed(checked):
  output=[]
  for event in checked['regional_review']:
   rule=next((r for r in rules if r['date']==event['date'] and event['race'].startswith(r['race_prefix'])),None)
   if rule:output.append({**event,'catalogue_designation':rule['designation'],'designation_source':rule['source_url']})
  return output
 horses=json.loads((ROOT/'data/horses.json').read_text());local={h['netkeiba_id']:h['id'] for h in horses if h.get('netkeiba_id')};dams={};coverage={}
 for dam,record in audit['dams'].items():
  entries=[]
  for child in record['offspring']:
   key=child['netkeiba_id'];checked=audit['checked_horses'].get(key)
   if not checked:continue
   findings=checked['evidence']+reviewed(checked)
   if not findings:continue
   evidence=[{**e,'grade':{'GI':'G1','GII':'G2','GIII':'G3'}.get(e['grade'],e['grade'])} for e in findings]
   entry={**child,'identity_source':record['identity_source'],'evidence':evidence}
   if key in local:entry['localId']=local[key]
   entries.append(entry)
  if entries:dams[dam]=entries
 for horse in horses:
  record=audit['dams'].get(horse.get('dam_netkeiba_id'));siblings=[c for c in record['offspring'] if c['netkeiba_id']!=horse.get('netkeiba_id')] if record else []
  checked=[audit['checked_horses'][c['netkeiba_id']] for c in siblings if c['netkeiba_id'] in audit['checked_horses']]
  coverage[str(horse['id'])]={'identity_source':record['identity_source'] if record else None,'siblings_listed':len(siblings) if record else None,'histories_checked':sum(c.get('source_status')!='no-race-data' for c in checked),'source_no_records':sum(c.get('source_status')=='no-race-data' for c in checked),'histories_unavailable':len(siblings)-len(checked) if record else None,'designation_review':sum(len(c['regional_review'])>len(reviewed(c)) and not c['evidence'] and not reviewed(c) for c in checked),'status':'source-bounded' if record else 'identity-unresolved'}
 notes=ROOT/'data/sibling_audit_notes.json'
 if notes.exists():
  for id,note in json.loads(notes.read_text())['horses'].items():
   if id in coverage:coverage[id].update(note)
 out={'checked_at':audit['checked_at'],'scope':'JRA flat Group/Listed top-three since 2007 plus individually dated international designations. Every database horse has an audit status; unavailable histories and non-JRA/historical designation reviews are not negative findings.','dams':dams,'coverage':coverage}
 (ROOT/'data/verified_siblings.json').write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n')
 return out
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('audit',type=Path);a=p.parse_args();build(json.loads(a.audit.read_text()))

import json,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scripts'))
from audit_siblings import evidence,parse_offspring
class SiblingAuditTests(unittest.TestCase):
 def race(self,**extra):
  return {'finish':3,'race_name':'中京記念(GIII)','meeting':'3中京8','surface':'芝','race_date':'2023/07/23','race_url':'https://db.netkeiba.com/race/202307030811/',**extra}
 def test_placed_blacktype_is_included_but_fourth_is_not(self):
  self.assertEqual(len(evidence([self.race()])[0]),1)
  self.assertEqual(evidence([self.race(finish=4)]),([],[]))
 def test_regional_grade_needs_separate_designation_review(self):
  confirmed,pending=evidence([self.race(race_name='JBCレディスクラシック(JpnI)',meeting='大井',surface='ダ')])
  self.assertEqual(confirmed,[]);self.assertEqual(len(pending),1)
 def test_op_is_a_review_candidate_not_automatic_blacktype(self):
  confirmed,pending=evidence([self.race(race_name='テスト(OP)')])
  self.assertEqual(confirmed,[]);self.assertEqual(len(pending),1)
 def test_sectional_anomaly_does_not_hide_independently_valid_placing(self):
  from test_weekly_sync import page,HORSE,VALUES
  from sync_sources import parse_races
  values=VALUES.copy();values[-2]='114'
  with self.assertRaises(ValueError):parse_races(page(values=values),HORSE)
  self.assertEqual(parse_races(page(values=values),HORSE,check_sectionals=False)[0]['finish'],1)
 def test_wrong_maternal_link_rejected(self):
  html='<table summary="競走馬検索結果"><tr><th>Header</th></tr><tr>'+''.join('<td>x</td>' for _ in range(8))+'</tr></table>'
  with self.assertRaisesRegex(ValueError,'maternal identity'):parse_offspring(html,'123')
 def test_built_catalogue_does_not_duplicate_placed_race(self):
  from build_black_type_siblings import build
  import tempfile,shutil
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);shutil.copytree(ROOT/'data',root/'data')
   catalog=build(root)
   for entries in catalog['dams'].values():
    for entry in entries:
     keys=[(e['date'],e['finish']) for e in entry['evidence']]
     self.assertEqual(len(keys),len(set(keys)),entry['name'])
 def test_published_coverage_includes_every_horse(self):
  horses=json.loads((ROOT/'data/horses.json').read_text());catalog=json.loads((ROOT/'data/verified_siblings.json').read_text())
  self.assertEqual(set(catalog['coverage']),{str(h['id']) for h in horses})
  for dam,entries in catalog['dams'].items():
   self.assertEqual(len(entries),len({e['netkeiba_id'] for e in entries}))
   for entry in entries:
    self.assertIn('mare_id='+dam,entry['identity_source'])
    self.assertTrue(entry['evidence'])
    for race in entry['evidence']:
     self.assertIn(race['finish'],[1,2,3]);self.assertTrue(race['source_url'].startswith('https://'))
if __name__=='__main__':unittest.main()

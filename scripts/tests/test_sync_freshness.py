import json,sys,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from sync_sources import reconcile_race_sources,parse_dynamic_races,verify_known_winners,parse_jra_winners
class FreshnessTests(unittest.TestCase):
 def race(self,id,finish=1,note=None):return {'race_id':id,'race_date':'2026/10/17','finish':finish,'finish_note':note,'distance_m':1600}
 def test_static_snapshot_missing_latest_win_is_completed(self):
  a=self.race('old');b=self.race('new')
  self.assertEqual(len(reconcile_race_sources([a],[b,a],'2戦2勝')),2)
 def test_missing_dynamic_prize_preserves_static_prize(self):
  a={**self.race('r'),'prize':5998};b={**a,'prize':None}
  self.assertEqual(reconcile_race_sources([a],[b],'1戦1勝')[0]['prize'],5998)
 def test_neither_source_has_expected_start_is_rejected(self):
  with self.assertRaisesRegex(ValueError,'count mismatch'):reconcile_race_sources([self.race('old')],[self.race('old')],'2戦2勝')
 def test_conflicting_result_is_never_silently_replaced(self):
  with self.assertRaisesRegex(ValueError,'disagree'):reconcile_race_sources([self.race('r')],[self.race('r',2)],'1戦1勝')
 def test_withdrawal_not_counted_but_dnf_is_counted(self):
  rows=[self.race('a'),self.race('b',None,'取消'),self.race('c',None,'中止')]
  self.assertEqual(len(reconcile_race_sources(rows,rows,'2戦1勝')),3)
 def test_missing_or_wrong_dynamic_identity_is_rejected(self):
  for payload in [{'status':'ERROR','data':''},{'status':'OK','data':'<table summary="別の馬の競走戦績"></table>'}]:
   with self.assertRaises(ValueError):parse_dynamic_races(json.dumps(payload),{'name':'シュガークン'})
 def test_official_results_headers_and_scheduled_rows(self):
  headers=['優勝馬','月日','レース名','結果','競馬場']
  values=['シュガークン','10月17日','富士ステークス','<a href="/datafile/seiseki/replay/2026/095.html">結果</a>','東京']
  table='<table><tr>'+''.join('<th>'+s+'</th>' for s in headers)+'</tr><tr>'+''.join('<td>'+s+'</td>' for s in values)+'</tr></table>'
  result=parse_jra_winners(table,2026)
  self.assertEqual(result[0]['date'],'2026/10/17');self.assertEqual(result[0]['name'],'シュガークン')
  self.assertEqual(parse_jra_winners(table.replace('シュガークン','—'),2026),[])
  with self.assertRaises(ValueError):parse_jra_winners(table.replace('優勝馬','変更済'),2026)
 def test_official_win_detects_two_agreeing_but_stale_sources(self):
  winners=[{'name':'シュガークン','date':'2026/10/17','course':'東京','source_url':'https://www.jra.go.jp/datafile/seiseki/replay/2026/095.html'}]
  horses=[{'id':40,'name':'シュガークン'}]
  with self.assertRaisesRegex(ValueError,'official graded win missing'):
   verify_known_winners(winners,horses,lambda id:{'races':[]})
  self.assertEqual(len(verify_known_winners(winners,horses,lambda id:{'races':[{'race_date':'2026/10/17','finish':1,'meeting':'4東京6'}]})),1)
if __name__=='__main__':unittest.main()

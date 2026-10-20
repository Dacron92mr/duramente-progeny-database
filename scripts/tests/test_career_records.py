import json,sys,tempfile,unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from build_career_history import build
from build_updates import build as updates
from weekly_sync import merge
class CareerTests(unittest.TestCase):
 def test_history_observation_preserved_and_deduplicated(self):
  horse={'id':1,'name':'A','netkeiba_id':'123','trainer':'Old'};detail={'horse':horse,'sources':[]}
  new,record=merge(horse,detail,{'trainer':'New','owner':'Owner','affiliation':'栗東'})
  self.assertEqual(new['trainer'],'New');self.assertEqual(detail['sources'],[])
  _,again=merge(new,record,{'trainer':'New','owner':'Owner','affiliation':'栗東'})
  self.assertEqual(len(again['sources']),1)
 def test_update_feed_idempotent_and_historical_dates_separate(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);data=root/'data';(data/'horses').mkdir(parents=True)
   def write(name,value):(data/name).write_text(json.dumps(value))
   write('horses.json',[{'id':1,'name':'A','netkeiba_id':'123'}]);write('horses/1.json',{'races':[],'stud':[],'sources':[]})
   write('post_racing_careers.json',{'horses':{'1':{'events':[{'date':'2024-01-01','summary':'乘马','source_url':'https://example.org/evidence'}]}}})
   first=updates(root,'2026-10-20');second=updates(root,'2026-10-21');self.assertEqual(first['events'],second['events']);self.assertTrue(first['events'][0]['historical']);self.assertEqual(first['events'][0]['recorded_at'],'2026-10-20')
   build(root);self.assertEqual(json.loads((data/'career_history.json').read_text())['horses']['1']['affiliations'],[])
if __name__=='__main__':unittest.main()

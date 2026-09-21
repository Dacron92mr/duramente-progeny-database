import copy
from pathlib import Path
import sys
import unittest
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from sync_sources import parse_races,parse_profile,money
from weekly_sync import merge, Client, SourceUnavailable, is_domestic_race, jbis_cycle
from unittest.mock import patch
from urllib.error import HTTPError
from http.client import IncompleteRead
from urllib.robotparser import RobotFileParser
from rebuild_synced_analytics import preserve_extra

HORSE={'id':1,'name':'テストホース','netkeiba_id':'123','earnings_netkeiba':100.1,'achievement_class':'G3'}
HEADERS=['日付','開催','レース名','隠し指数','着順','距離','頭数','騎手','斤量','馬体重','上り','賞金']
VALUES=['2023/12/24','5中山8','<a href="/race/202306050811/">有馬記念(GI)</a>','999','1','芝2500','16','騎手A','58','474(-2)','36.2','13,048.6']
def page(headers=HEADERS,values=VALUES):
    return '<title>テストホース | 競走馬</title><table summary="テストホースの競走戦績"><tr>'+''.join('<th>'+h+'</th>' for h in headers)+'</tr><tr>'+''.join('<td>'+v+'</td>' for v in values)+'</tr></table>'
class ParserTests(unittest.TestCase):
    def test_header_mapping_ignores_hidden_column(self):
        row=parse_races(page(),HORSE)[0]
        self.assertEqual((row['last_3f'],row['body_weight'],row['prize']),(36.2,'474(-2)',13048.6))
    def test_reordered_columns(self):
        row=parse_races(page(HEADERS[::-1],VALUES[::-1]),HORSE)[0]
        self.assertEqual(row['finish'],1);self.assertEqual(row['distance_m'],2500)
    def test_missing_header_rejected(self):
        with self.assertRaises(ValueError): parse_races(page(HEADERS[:-1],VALUES[:-1]),HORSE)
    def test_wrong_identity_rejected(self):
        with self.assertRaises(ValueError): parse_races(page().replace('テストホース','別の馬'),HORSE)
    def test_block_page_rejected(self):
        with self.assertRaises(ValueError): parse_races(page()+'<div>captcha</div>',HORSE)
    def test_shifted_numeric_field_rejected(self):
        values=VALUES.copy();values[-2]='114'
        with self.assertRaises(ValueError): parse_races(page(values=values),HORSE)
    def test_missing_overseas_field_size_is_unknown(self):
        values=VALUES.copy();values[6]='';values[4]='2'
        row=parse_races(page(values=values),HORSE)[0]
        self.assertIsNone(row['field_size']);self.assertEqual(row['finish'],2)
    def test_finish_above_known_field_size_rejected(self):
        values=VALUES.copy();values[4]='17'
        with self.assertRaises(ValueError):parse_races(page(values=values),HORSE)
    def test_blank_finish_does_not_drop_other_race_fields(self):
        values=VALUES.copy();values[4]='';values[-1]=''
        row=parse_races(page(values=values),HORSE)[0]
        self.assertIsNone(row['finish']);self.assertIsNone(row['prize'])
    def test_jump_last_3f_uses_jump_scale(self):
        values=VALUES.copy();values[5]='障3900';values[-2]='13.7'
        row=parse_races(page(values=values),HORSE)[0]
        self.assertEqual(row['last_3f'],13.7)
    def test_money_units(self):
        self.assertEqual(money('10億6,875万円'),106875)
        self.assertEqual(money('106875.1万円'),106875.1)
        with self.assertRaises(ValueError):money('unknown')
    def test_jbis_profile(self):
        result=parse_profile('<title>テストホース｜JBIS</title><dl><dt>総賞金</dt><dd>123.4万円</dd></dl>',HORSE,'jbis')
        self.assertEqual(result,{'earnings_jbis':123.4})
    def test_rounding_keeps_precision(self):
        updated,_=merge(HORSE,{'horse':HORSE,'races':[]},{'earnings_netkeiba':100})
        self.assertEqual(updated['earnings_netkeiba'],100.1)
    def test_earnings_drop_preserves_old_value(self):
        updated,_=merge(HORSE,{'horse':HORSE,'races':[]},{'earnings_netkeiba':10})
        self.assertEqual(updated['earnings_netkeiba'],100.1)
    def test_incomplete_history_rejected(self):
        detail={'horse':HORSE,'races':[{'source':'netkeiba','race_id':'older'}]}
        with self.assertRaises(ValueError):merge(HORSE,detail,{},parse_races(page(),HORSE))
    def test_other_source_retained_and_grade_promoted(self):
        other={'source':'jbis','race_id':'other'}
        updated,detail=merge(HORSE,{'horse':HORSE,'races':[other]}, {},parse_races(page(),HORSE))
        self.assertIn(other,detail['races']);self.assertEqual(updated['achievement_class'],'G1')
    def test_blank_prize_never_erases_known_domestic_prize(self):
        old=parse_races(page(),HORSE)[0]
        fresh=copy.deepcopy(old);fresh['prize']=None
        _horse,detail=merge(HORSE,{'horse':HORSE,'races':[old]}, {},[fresh])
        self.assertEqual(detail['races'][0]['prize'],13048.6)
        self.assertEqual(detail['races'][0]['data']['prize'],13048.6)
    def test_domestic_race_id_and_monthly_cycle(self):
        from datetime import date
        self.assertTrue(is_domestic_race({'race_id':'202306050811'}))
        self.assertFalse(is_domestic_race({'race_id':'2025J0010108'}))
        self.assertEqual(jbis_cycle(date(2026,9,1)),jbis_cycle(date(2026,9,30)))
    def test_curated_extra_fields_retained(self):
        self.assertEqual(preserve_extra([{'label':'2018','manual':'keep','wins':1}],[{'label':'2018','wins':2}]),[{'label':'2018','manual':'keep','wins':2}])
    def test_inputs_not_mutated(self):
        before=copy.deepcopy(HORSE);merge(HORSE,{'horse':HORSE,'races':[]},{'earnings_netkeiba':1010});self.assertEqual(HORSE,before)
class ClientTests(unittest.TestCase):
    def test_jbis_initial_and_between_request_delay(self):
        clock=[0];requests=[]
        class Response:
            headers=type('Headers',(),{'get_content_charset':lambda self:'utf-8'})()
            def __init__(self,url): self.url=url
            def read(self,*args): return b'User-agent: *\nCrawl-delay: 600\n' if self.url.endswith('robots.txt') else b'<html>public</html>'
        def fetch(request,**kwargs): requests.append((request.full_url,clock[0]));return Response(request.full_url)
        with patch('weekly_sync.urlopen',side_effect=fetch), patch('weekly_sync.time.monotonic',side_effect=lambda:clock[0]), patch('weekly_sync.time.sleep',side_effect=lambda seconds:clock.__setitem__(0,clock[0]+seconds)):
            client=Client();client.get('https://www.jbis.or.jp/horse/1/');client.get('https://www.jbis.or.jp/horse/2/')
        self.assertEqual([t for url,t in requests if '/horse/' in url],[600,1200])
    def test_interrupted_response_retains_existing_record(self):
        client=Client();rules=RobotFileParser();rules.parse(['User-agent: *','Disallow:'])
        client.rules['db.netkeiba.com']=rules
        response=type('Response',(),{'url':'https://db.netkeiba.com/horse/1/', 'read':lambda self,n:(_ for _ in ()).throw(IncompleteRead(b'partial'))})()
        with patch('weekly_sync.urlopen',return_value=response):
            with self.assertRaisesRegex(SourceUnavailable,'incomplete source response'):
                client.get(response.url)
    def test_access_restriction_stops_source(self):
        with patch('weekly_sync.urlopen',side_effect=HTTPError('https://db.netkeiba.com/robots.txt',403,'Forbidden',{},None)) as fetch:
            client=Client()
            with self.assertRaises(SourceUnavailable):client.get('https://db.netkeiba.com/horse/1/')
            with self.assertRaises(SourceUnavailable):client.get('https://db.netkeiba.com/horse/2/')
            self.assertEqual(fetch.call_count,1)
if __name__=='__main__':unittest.main()

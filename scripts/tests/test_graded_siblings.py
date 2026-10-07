import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from build_graded_siblings import parse

class SiblingTests(unittest.TestCase):
    def test_explicit_winning_race_and_dam(self):
        html = '''<a href="/horse/list.html?mare_id=2000100001">4頭</a><table summary="代表産駒">
<tr><th><a href="https://db.netkeiba.com/horse/2015100001/">Winner</a></th><td><a href="/horse/sire/1/">Sire</a></td><td>勝ち鞍：<a href="/race/1/">Cup(G2)</a></td></tr>
<tr><th><a href="https://db.netkeiba.com/horse/2015100002/">Placed</a></th><td><a href="/race/2/">Allowance(3勝)</a></td></tr></table>'''
        rows=parse(html,'2000100001')
        self.assertEqual([r['name'] for r in rows],['Winner'])
        self.assertEqual(rows[0]['netkeiba_id'],'2015100001')
        with self.assertRaises(ValueError): parse(html,'2000100002')

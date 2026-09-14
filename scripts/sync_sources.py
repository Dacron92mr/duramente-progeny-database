"""Public-page adapters. No positional scraping, authentication or challenge bypass."""
from html.parser import HTMLParser
import html
import re
import unicodedata
from datetime import datetime, timezone
from urllib.parse import urljoin

def clean(value):
    return re.sub(r'\s+', '', unicodedata.normalize('NFKC', html.unescape(str(value or ''))))

def text(value):
    return html.unescape(re.sub('<[^>]+>', '', value)).strip()

class Tables(HTMLParser):
    def __init__(self):
        super().__init__(); self.tables=[]; self.stack=[]; self.cell=None; self.row=None
    def handle_starttag(self, tag, attrs):
        attrs=dict(attrs)
        if tag == 'table':
            table={'attrs':attrs,'rows':[]}; self.tables.append(table); self.stack.append(table)
        elif tag == 'tr' and self.stack: self.row=[]
        elif tag in ('td','th') and self.row is not None:
            self.cell={'text':'','links':[]}; self.row.append(self.cell)
        elif tag == 'a' and self.cell is not None: self.cell['links'].append(attrs.get('href',''))
    def handle_data(self, data):
        if self.cell is not None: self.cell['text'] += data
    def handle_endtag(self, tag):
        if tag in ('td','th'): self.cell=None
        elif tag == 'tr' and self.stack and self.row is not None:
            self.stack[-1]['rows'].append(self.row); self.row=None
        elif tag == 'table' and self.stack: self.stack.pop()

def identity(page, horse):
    title=re.search(r'<title[^>]*>(.*?)</title>',page,re.S|re.I)
    if not title or clean(horse['name']) not in clean(text(title.group(1))):
        raise ValueError('horse identity missing or mismatched')
    if re.search(r'captcha|cf-chl-|アクセスが集中|アクセス制限',page,re.I):
        raise ValueError('source challenge or access limit; preserve existing data')

def money(value):
    value=clean(value).replace(',','')
    if value in ('','-','--'): return None
    if not re.fullmatch(r'(?:\d+(?:\.\d+)?億)?(?:\d+(?:\.\d+)?万)?(?:\d+(?:\.\d+)?)?円',value):
        raise ValueError('unrecognized earnings unit')
    result=0.0
    for unit,multiplier in [('億',10000),('万',1)]:
        match=re.search(r'(\d+(?:\.\d+)?)'+unit,value)
        if match: result += float(match.group(1))*multiplier
    if '億' not in value and '万' not in value: result=float(value[:-1])/10000
    return round(result,4)

def parse_profile(page, horse, source):
    identity(page,horse)
    if source == 'jbis':
        match=re.search(r'<dt>\s*総賞金\s*</dt>\s*<dd[^>]*>(.*?)</dd>',page,re.S)
        if not match: raise ValueError('JBIS earnings field missing')
        amount=money(text(match.group(1)))
        if amount is None: raise ValueError('JBIS earnings empty')
        return {'earnings_jbis':amount}
    parser=Tables();parser.feed(page)
    tables=[t for t in parser.tables if 'プロフィール' in t['attrs'].get('summary','')]
    if not tables: raise ValueError('netkeiba profile table missing')
    fields={clean(row[0]['text']): text(row[1]['text']) for table in tables for row in table['rows'] if len(row)==2}
    result={}
    for label,key in [('通算成績','career_summary'),('主な勝鞍','major_win')]:
        if fields.get(label): result[key]=fields[label]
    amounts=[money(v) for k,v in fields.items() if k.startswith('獲得賞金')]
    if not amounts or any(v is None for v in amounts): raise ValueError('earnings fields incomplete')
    result['earnings_netkeiba']=round(sum(amounts),4)
    return result

def parse_races(page, horse):
    identity(page,horse)
    parser=Tables();parser.feed(page)
    table=next((t for t in parser.tables if '競走戦績' in t['attrs'].get('summary','')),None)
    if not table or not table['rows']: raise ValueError('race table missing')
    headers=[clean(c['text']) for c in table['rows'][0]]
    required=['日付','開催','レース名','着順','距離','頭数','騎手','斤量','馬体重','上り','賞金']
    if any(headers.count(k)!=1 for k in required): raise ValueError('race headers changed')
    output=[]
    for cells in table['rows'][1:]:
        if len(cells)!=len(headers): raise ValueError('race row/header length mismatch')
        row={key:cells[i] for i,key in enumerate(headers)}
        get=lambda key: text(row.get(key,{}).get('text',''))
        date=get('日付')
        parsed=datetime.strptime(date,'%Y/%m/%d').date()
        if parsed > datetime.now(timezone.utc).date(): raise ValueError('future race result')
        race_id=next((re.search(r'/race/([0-9A-Za-z]+)/',u).group(1) for u in row['レース名']['links'] if re.search(r'/race/([0-9A-Za-z]+)/',u)),None)
        if not race_id: raise ValueError('race ID missing')
        finish_text=get('着順');finish=int(finish_text) if finish_text.isdigit() else None
        if finish is None and finish_text not in ('取消','除外','中止','失格','取','除','中','失'): raise ValueError('invalid finish')
        distance=clean(get('距離'));match=re.fullmatch(r'([芝ダ障])([0-9]+)',distance)
        if not match: raise ValueError('invalid distance')
        numeric=lambda key: float(get(key).replace(',','')) if re.fullmatch(r'[\d,]+(?:\.\d+)?',get(key)) else None
        result={'source':'netkeiba','race_id':race_id,'race_url':f'https://db.netkeiba.com/race/{race_id}/','race_date':date,
            'race_name':get('レース名'),'meeting':get('開催'),'finish':finish,'surface':match[1],'distance_m':int(match[2]),'distance':distance,
            'field_size':int(numeric('頭数')) if numeric('頭数') is not None else None,'jockey':get('騎手'),'carried_weight':numeric('斤量'),
            'body_weight':get('馬体重'),'last_3f':numeric('上り'),'corners':get('通過'),'pace':get('ペース'),
            'prize':numeric('賞金'),'time':get('タイム'),'margin':get('着差'),'track_condition':get('馬場'),
            'weather':get('天気'),'race_no':int(numeric('R') or 0),'odds':numeric('オッズ'),'popularity':numeric('人気'),
            'bracket':numeric('枠番'),'horse_number':numeric('馬番'),'winner_or_runner_up':get('勝ち馬(2着馬)')}
        if not 400<=result['distance_m']<=8000: raise ValueError('distance outside supported range')
        if result['field_size'] is not None and not 1<=result['field_size']<=100: raise ValueError('invalid field size')
        if finish is not None and (finish<1 or (result['field_size'] is not None and finish>result['field_size'])): raise ValueError('finish exceeds field size')
        if result['last_3f'] is not None and not 20<=result['last_3f']<=65: raise ValueError('last 3f outside supported range')
        output.append(result)
    if len({r['race_id'] for r in output}) != len(output): raise ValueError('duplicate race IDs')
    return output

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

class JbisSireIndexGrids(HTMLParser):
    """Read JBIS' div-based generation and racing-year grids by hierarchy."""
    def __init__(self):
        super().__init__(); self.depth=0; self.target=None; self.target_depth=None; self.inner_depth=None
        self.row=None; self.row_depth=None; self.cell=None; self.cell_depth=None
        self.rows={'crops':[],'annual':[]}
    def handle_starttag(self, tag, attrs):
        if tag!='div': return
        self.depth+=1; classes=set(dict(attrs).get('class','').split())
        if 'data-7-1' in classes or 'data-7-2' in classes:
            self.target='crops' if 'data-7-1' in classes else 'annual';self.target_depth=self.depth
        elif self.target and 'data-7__inner' in classes:
            self.inner_depth=self.depth
        elif self.inner_depth and self.depth==self.inner_depth+1:
            self.row=[];self.row_depth=self.depth
        elif self.row is not None and self.depth==self.row_depth+1:
            self.cell=[];self.cell_depth=self.depth
    def handle_data(self, data):
        if self.cell is not None: self.cell.append(data)
    def handle_endtag(self, tag):
        if tag!='div': return
        if self.cell_depth==self.depth:
            self.row.append(clean(''.join(self.cell)));self.cell=None;self.cell_depth=None
        if self.row_depth==self.depth:
            self.rows[self.target].append(self.row);self.row=None;self.row_depth=None
        if self.inner_depth==self.depth: self.inner_depth=None
        if self.target_depth==self.depth: self.target=None;self.target_depth=None
        self.depth-=1

def _integer(value):
    value=clean(value).replace(',','')
    if not re.fullmatch(r'\d+',value): raise ValueError('invalid JBIS integer')
    return int(value)

def _decimal(value):
    value=clean(value)
    if not re.fullmatch(r'\d+(?:\.\d+)?',value): raise ValueError('invalid JBIS index')
    return float(value)

def _yen(value):
    value=clean(value).replace(',','')
    if not re.fullmatch(r'\d+円',value): raise ValueError('invalid JBIS yen amount')
    return int(value[:-1])

def parse_jbis_sire_indices(page, sire_name='ドゥラメンテ'):
    """Parse official weekly AEI/CPI values without deriving missing denominators."""
    identity(page,{'name':sire_name})
    parser=JbisSireIndexGrids();parser.feed(page)
    crop_rows=parser.rows['crops'];annual_rows=parser.rows['annual']
    crop_header=['種付年度','種付頭数','生産頭数','血統登録頭数','出走頭数','勝馬頭数','入着頭数','2歳勝馬頭数','重賞勝馬頭数','収得賞金']
    annual_header=['年度','出走頭数','出走回数','勝馬頭数','勝鞍回数','重賞勝馬','重賞勝鞍','1着賞金','重賞賞金','収得賞金']
    if not crop_rows or crop_rows[0][:10]!=crop_header or not crop_rows[0][10].startswith('AEI'):
        raise ValueError('JBIS crop index headers changed')
    if not annual_rows or annual_rows[0][:10]!=annual_header or not annual_rows[0][10].startswith('AEI') or annual_rows[0][11]!='重賞AEI':
        raise ValueError('JBIS annual index headers changed')
    crops=[]
    for row in crop_rows[1:]:
        if not row or not re.fullmatch(r'\d{4}',row[0]): continue
        if len(row)!=11: raise ValueError('JBIS crop index row changed')
        crops.append({'covering_year':_integer(row[0]),'birth_year':_integer(row[0])+1,'mares':_integer(row[1]),
            'foals':_integer(row[2]),'registrations':_integer(row[3]),'starters':_integer(row[4]),
            'winners':_integer(row[5]),'placers':_integer(row[6]),'two_year_old_winners':_integer(row[7]),
            'graded_winners':_integer(row[8]),'earnings_yen':_yen(row[9]),'aei':_decimal(row[10])})
    crop_total=next((row for row in crop_rows if row and row[0]=='合計'),None)
    if not crop_total or len(crop_total)!=9: raise ValueError('JBIS crop total row changed')
    annual=[]
    for row in annual_rows[1:]:
        if not row or not re.fullmatch(r'\d{4}',row[0]): continue
        if len(row)!=12: raise ValueError('JBIS annual index row changed')
        annual.append({'year':_integer(row[0]),'starters':_integer(row[1]),'starts':_integer(row[2]),
            'winners':_integer(row[3]),'wins':_integer(row[4]),'graded_winners':_integer(row[5]),
            'graded_wins':_integer(row[6]),'first_prize_yen':_yen(row[7]),'graded_prize_yen':_yen(row[8]),
            'earnings_yen':_yen(row[9]),'aei':_decimal(row[10]),'graded_aei':_decimal(row[11])})
    annual_total=next((row for row in annual_rows if row and row[0]=='合計'),None)
    if not annual_total or len(annual_total)!=12: raise ValueError('JBIS annual total row changed')
    cpi_values=[_decimal(value) for value in re.findall(r'CPI.*?=\s*(\d+(?:\.\d+)?)',page,re.S)]
    if not cpi_values or len(set(cpi_values))!=1: raise ValueError('JBIS CPI missing or inconsistent')
    date_match=re.search(r'中央：\s*(\d{4})年(\d{1,2})月(\d{1,2})日現在',page)
    if not date_match: raise ValueError('JBIS update date missing')
    source_date=f'{int(date_match[1]):04d}-{int(date_match[2]):02d}-{int(date_match[3]):02d}'
    crop_aei=_decimal(crop_total[-1]);annual_aei=_decimal(annual_total[-2]);cpi=cpi_values[0]
    crop_earnings=_yen(crop_total[-2]);annual_earnings=_yen(annual_total[9])
    if len(crops)<5 or len(annual)<2 or crop_earnings!=annual_earnings: raise ValueError('JBIS index totals failed validation')
    if any(not 0<=row['aei']<=20 for row in crops+annual) or not 0<cpi<=20: raise ValueError('JBIS index outside expected range')
    return {
        'source':{'name':'JBIS-Search','url':'https://www.jbis.or.jp/horse/0001151936/sire/generation/thorough_c/','updated_at':source_date},
        'summary':{'crop_aei':crop_aei,'annual_aei':annual_aei,'cpi':cpi,
            'aei_cpi_ratio':round(crop_aei/cpi,2),'starters':_integer(crop_total[2]),'earnings_yen':crop_earnings},
        'crops':crops,'annual':annual,
        'definitions':{
            'aei':'产驹平均收得奖金与同期全部出赛马平均收得奖金之比；1.00为同期平均。',
            'cpi':'配种母马与其他种牡马所生兄弟马的平均收得奖金与同期全部出赛马平均收得奖金之比。',
            'ratio':'AEI÷CPI，由本站根据JBIS公布值计算，用于并列观察产驹表现与母群质量。'
        }
    }

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
        finish_text=get('着順');finish_match=re.match(r'^(\d+)',finish_text)
        finish=int(finish_match.group(1)) if finish_match else None
        distance=clean(get('距離'));match=re.fullmatch(r'([芝ダ障])([0-9]+)',distance)
        if not match: raise ValueError('invalid distance')
        numeric=lambda key: float(get(key).replace(',','')) if re.fullmatch(r'[\d,]+(?:\.\d+)?',get(key)) else None
        result={'source':'netkeiba','race_id':race_id,'race_url':f'https://db.netkeiba.com/race/{race_id}/','race_date':date,
            'race_name':get('レース名'),'meeting':get('開催'),'finish':finish,'surface':match[1],'distance_m':int(match[2]),'distance':distance,
            'field_size':int(numeric('頭数')) if numeric('頭数') is not None else None,'jockey':get('騎手'),'carried_weight':numeric('斤量'),
            'body_weight':get('馬体重'),'last_3f':numeric('上り'),'corners':get('通過'),'pace':get('ペース'),
            'prize':numeric('賞金'),'time':get('タイム'),'margin':get('着差'),'track_condition':get('馬場'),
            'weather':get('天気'),'race_no':int(numeric('R') or 0),'odds':numeric('オッズ'),'popularity':numeric('人気'),
            'bracket':numeric('枠番'),'horse_number':numeric('馬番'),'winner_or_runner_up':get('勝ち馬(2着馬)'),
            'finish_note':finish_text if finish is None and finish_text else None}
        if not 400<=result['distance_m']<=8000: raise ValueError('distance outside supported range')
        if result['field_size'] is not None and not 1<=result['field_size']<=100: raise ValueError('invalid field size')
        if finish is not None and (finish<1 or (result['field_size'] is not None and finish>result['field_size'])): raise ValueError('finish exceeds field size')
        last_3f_min=10 if result['surface']=='障' else 20
        if result['last_3f'] is not None and not last_3f_min<=result['last_3f']<=65: raise ValueError('last 3f outside supported range')
        output.append(result)
    if len({r['race_id'] for r in output}) != len(output): raise ValueError('duplicate race IDs')
    return output

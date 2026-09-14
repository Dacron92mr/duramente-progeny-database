"""Weekly, rate-limited data refresh; stage, validate, then apply. Standard library only."""
from __future__ import annotations
import argparse
import copy
import json
import os
from pathlib import Path
import re
import shutil
import tempfile
import time
from datetime import datetime, timezone, timedelta
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from urllib.robotparser import RobotFileParser
from urllib.parse import urlsplit
from sync_sources import parse_profile, parse_races
from rebuild_synced_analytics import rebuild, read, write

ROOT=Path(__file__).resolve().parents[1]
AGENT='DuramenteDatabaseSync/1.0 (+https://github.com/Dacron92mr/duramente-progeny-database)'
class SourceUnavailable(RuntimeError): pass
class Client:
    def __init__(self): self.rules={};self.next_request={};self.blocked=set()
    def get(self,url):
        host=urlsplit(url).netloc
        if host in self.blocked: raise SourceUnavailable('source stopped after access restriction')
        if host not in self.rules:
            rules=RobotFileParser();rules.set_url(f'https://{host}/robots.txt')
            try:
                response=urlopen(Request(rules.url,headers={'User-Agent':AGENT}),timeout=30)
                rules.parse(response.read().decode('utf-8').splitlines())
            except HTTPError as exc:
                if exc.code==404: rules.parse(['User-agent: *','Disallow:'])
                else: self.blocked.add(host);raise SourceUnavailable('robots unavailable; skipped source') from exc
            except OSError as exc:
                self.blocked.add(host);raise SourceUnavailable('robots unavailable; skipped source') from exc
            self.rules[host]=rules
            if host=='www.jbis.or.jp': self.next_request[host]=time.monotonic()+max(rules.crawl_delay(AGENT) or 0,600)
        rules=self.rules[host]
        if not rules.can_fetch(AGENT,url):
            self.blocked.add(host);raise SourceUnavailable('robots disallow this endpoint')
        delay=max(rules.crawl_delay(AGENT) or 0,600 if host=='www.jbis.or.jp' else 4)
        wait=self.next_request.get(host,0)-time.monotonic()
        if wait>0: time.sleep(wait)
        self.next_request[host]=time.monotonic()+delay
        try:
            response=urlopen(Request(url,headers={'User-Agent':AGENT,'Accept':'text/html'}),timeout=35)
            if urlsplit(response.url).netloc != host: raise SourceUnavailable('unexpected redirect')
            body=response.read(3_000_001)
            if len(body)>3_000_000: raise SourceUnavailable('response too large')
            encoding=response.headers.get_content_charset() or ('euc-jp' if host=='db.netkeiba.com' else 'utf-8')
            return body.decode(encoding,errors='strict')
        except HTTPError as exc:
            if exc.code in (401,403,429): self.blocked.add(host)
            raise SourceUnavailable(f'HTTP {exc.code}; old data retained') from exc

def merge(horse,detail,patch,races=None):
    """Guard against identity/history loss and rounded or decreasing lifetime earnings."""
    result=copy.deepcopy(horse);updated=copy.deepcopy(detail)
    for key,value in patch.items():
        if key.startswith('earnings'):
            old=float(result.get(key) or 0)
            if value<0 or value>100_000_000: raise ValueError('earnings outside expected range')
            if value < old-1: raise ValueError('lifetime earnings decreased; retain old record')
            # Profile pages round lifetime earnings; retain finer existing figures.
            if abs(value-old)<1: continue
        if value is not None and value!='': result[key]=value
    if races is not None:
        prior={str(r['race_id']):r for r in updated.get('races',[]) if r.get('race_id') and r.get('source')=='netkeiba'}
        fresh={str(r['race_id']):r for r in races}
        if not set(prior).issubset(fresh): raise ValueError('incomplete race history; retain old record')
        merged=[]
        for race in races:
            old=prior.get(str(race['race_id']),{})
            row={**old,**race}
            row['data']={**old.get('data',{}),**race,'horse_id':horse['id'],'horse_name':horse['name'],'netkeiba_id':horse.get('netkeiba_id')}
            row['data'].pop('raw',None)
            merged.append(row)
        # Preserve other-source and manually entered results.
        merged.extend(r for r in updated.get('races',[]) if r.get('source')!='netkeiba' or not r.get('race_id'))
        updated['races']=sorted(merged,key=lambda r:r.get('race_date') or '',reverse=True)
        # Only promote recognized graded achievements, never erase curated classifications.
        from analytics_core import graded_race_group
        ranks={'G1':3,'G2':2,'G3':1}
        for race in races:
            grade=graded_race_group(race.get('race_name'))[0] if race.get('finish')==1 else None
            if ranks.get(grade,0)>ranks.get(result.get('achievement_class'),0): result['achievement_class']=grade
    updated['horse']={**updated.get('horse',{}),**result}
    return result,updated

def validate(stage,original):
    horses=read(stage/'data/horses.json');old=read(original/'data/horses.json')
    assert {h['id'] for h in horses}=={h['id'] for h in old},'horse inventory changed'
    for h in horses:
        detail=read(stage/'data/horses'/f"{h['id']}.json")
        assert detail['horse']['name']==h['name'],'list/detail mismatch'
    insights=read(stage/'data/analytics/chart_insights.json');crops=read(stage/'data/analytics/sire_profile.json')['crops'];awd=read(stage/'data/analytics/awd.json')
    for row in insights['concentrations']:
        crop=next(c for c in crops if str(c['label'])==str(row['year']))
        assert abs(row['total']-crop['total_earnings'])<0.2,'cohort earnings mismatch'
        assert abs(sum(row['values'])-row['total'])<0.2,'earnings partition mismatch'
    for key in ('turf','dirt'):
        assert sum(r[key] for r in insights['distances'])==awd['summary'][key+'_wins'],'surface win mismatch'
    for name in ('sire_market','leading_sire_history','leading_sire_top10','sire_category_rankings','dosage','pedigree'):
        assert (stage/f'data/analytics/{name}.json').read_bytes()==(original/f'data/analytics/{name}.json').read_bytes(),'curated source changed'

def run(args):
    root=args.root.resolve();state_path=root/'.github/sync/state.json';state=read(state_path) if state_path.exists() else {'jbis_cursor':0}
    horses=read(root/'data/horses.json');original_count=len(horses)
    report={'started_at':datetime.now(timezone.utc).isoformat(),'netkeiba_ok':0,'jbis_ok':0,'errors':[],'changed_horses':[],'applied':False}
    client=Client()
    with tempfile.TemporaryDirectory(prefix='duramente-sync-') as temp:
        stage=Path(temp);shutil.copytree(root/'data',stage/'data')
        candidates=[h for h in horses if re.fullmatch(r'\d+',str(h.get('netkeiba_id') or ''))]
        if args.source=='jbis': candidates=[]
        if args.limit: candidates=candidates[:args.limit]
        consecutive_failures=0
        for i,horse in enumerate(candidates):
            if 'db.netkeiba.com' in client.blocked: break
            print(f'netkeiba {i+1}/{len(candidates)} id={horse["id"]}',flush=True)
            try:
                base=f'https://db.netkeiba.com/horse/{horse["netkeiba_id"]}/'
                patch=parse_profile(client.get(base),horse,'netkeiba')
                races=[] if re.match(r'^0戦',patch.get('career_summary','')) else parse_races(client.get(f'https://db.netkeiba.com/horse/result/{horse["netkeiba_id"]}/'),horse)
                path=stage/'data/horses'/f"{horse['id']}.json";detail=read(path)
                updated,new_detail=merge(horse,detail,patch,races)
                if updated!=horse or new_detail!=detail:
                    horse.update(updated);write(path,new_detail);report['changed_horses'].append(horse['id'])
                report['netkeiba_ok']+=1
                consecutive_failures=0
            except (ValueError,OSError,SourceUnavailable) as exc:
                report['errors'].append({'source':'netkeiba','horse_id':horse['id'],'reason':str(exc)})
                # Multiple schema failures indicate a source change; don't hammer the site.
                consecutive_failures+=1
                if consecutive_failures>=5: break
        jbis=[h for h in horses if re.fullmatch(r'\d+',str(h.get('jbis_id') or ''))]
        today=datetime.now(timezone.utc).date()
        cycle=(today-timedelta(days=today.weekday())).isoformat()
        if state.get('jbis_cycle')!=cycle: state.update(jbis_cycle=cycle,jbis_cursor=0)
        cursor=min(state.get('jbis_cursor',0),len(jbis))
        count=0 if args.source=='netkeiba' else min(args.jbis_limit,len(jbis)-cursor)
        if not candidates and count==0:
            report.update(batch_acceptable=True,skipped='weekly JBIS cycle complete')
            args.report.parent.mkdir(parents=True,exist_ok=True);write(args.report,report);return
        for i in range(count):
            if 'www.jbis.or.jp' in client.blocked: break
            horse=jbis[(cursor+i)%len(jbis)];print(f'JBIS {i+1}/{count} id={horse["id"]}',flush=True)
            try:
                patch=parse_profile(client.get(f'https://www.jbis.or.jp/horse/{horse["jbis_id"]}/'),horse,'jbis')
                path=stage/'data/horses'/f"{horse['id']}.json";detail=read(path)
                updated,new_detail=merge(horse,detail,patch)
                if updated!=horse or new_detail!=detail: horse.update(updated);write(path,new_detail);report['changed_horses'].append(horse['id'])
                report['jbis_ok']+=1
            except (ValueError,OSError,SourceUnavailable) as exc:
                report['errors'].append({'source':'jbis','horse_id':horse['id'],'reason':str(exc)})
            state['jbis_cursor']=cursor+i+1
        total=len(candidates)+count
        success=report['netkeiba_ok']+report['jbis_ok']
        # Never publish a mostly failed batch; all modifications exist only in staging.
        acceptable=total>0 and success/total>=0.9
        report['changed_horses']=sorted(set(report['changed_horses']))
        if acceptable and report['changed_horses']:
            write(stage/'data/horses.json',horses);rebuild(stage);validate(stage,root)
            if candidates and report['netkeiba_ok']==len(candidates) and not args.limit:
                path=stage/'data/analytics/methodology.json';method=read(path);method['last_updated']=datetime.now(timezone.utc).date().isoformat();write(path,method)
            if args.apply:
                for path in (stage/'data').rglob('*.json'):
                    target=root/path.relative_to(stage)
                    if path.read_bytes()!=target.read_bytes():
                        temporary=target.with_suffix('.json.tmp');shutil.copyfile(path,temporary);temporary.replace(target)
                index=root/'index.html';html=index.read_text();stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S')
                index.write_text(re.sub(r'window.STATIC_DATA_VERSION = "[^"]+"',f'window.STATIC_DATA_VERSION = "{stamp}"',html))
                report['applied']=True
        if acceptable and args.apply:
            state_path.parent.mkdir(parents=True,exist_ok=True);write(state_path,state)
        report['finished_at']=datetime.now(timezone.utc).isoformat();report['batch_acceptable']=acceptable
        args.report.parent.mkdir(parents=True,exist_ok=True);write(args.report,report)
        print(json.dumps({k:v for k,v in report.items() if k!='errors'},ensure_ascii=False),flush=True)
        if not acceptable: raise SystemExit('Sync batch failed validation; existing dataset preserved.')

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--root',type=Path,default=ROOT);parser.add_argument('--limit',type=int,default=0);parser.add_argument('--jbis-limit',type=int,default=12);parser.add_argument('--source',choices=['both','netkeiba','jbis'],default='both');parser.add_argument('--apply',action='store_true');parser.add_argument('--report',type=Path,default=Path('sync-report.json'));args=parser.parse_args()
    if args.limit<0 or not 0<=args.jbis_limit<=32: parser.error('invalid batch limits')
    run(args)

"""Refresh the single JBIS sire-index page; validate before replacing public data."""
from __future__ import annotations
import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
import re

from rebuild_synced_analytics import read, write
from sync_sources import parse_jbis_sire_indices
from weekly_sync import AGENT, Client

ROOT=Path(__file__).resolve().parents[1]
URL='https://www.jbis.or.jp/horse/0001151936/sire/generation/thorough_c/'

def apply_payload(root: Path, payload: dict, apply: bool) -> bool:
    target=root/'data/analytics/sire_indices.json'
    old=read(target) if target.exists() else None
    if old and payload['source']['updated_at'] < old['source']['updated_at']:
        raise ValueError('JBIS sire index page is older than stored data')
    changed=old!=payload
    if changed and apply:
        target.parent.mkdir(parents=True,exist_ok=True)
        temporary=target.with_suffix('.json.tmp');write(temporary,payload);temporary.replace(target)
        index=root/'index.html';html=index.read_text();stamp=datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S')
        updated=re.sub(r'window.STATIC_DATA_VERSION = "[^"]+"',f'window.STATIC_DATA_VERSION = "{stamp}"',html)
        if updated==html: raise ValueError('STATIC_DATA_VERSION marker missing')
        temporary=index.with_suffix('.html.tmp');temporary.write_text(updated);temporary.replace(index)
    return changed

def run(args):
    root=args.root.resolve();report={'started_at':datetime.now(timezone.utc).isoformat(),'source':URL,'user_agent':AGENT,'errors':[],'applied':False}
    try:
        page=Path(args.page_file).read_text() if args.page_file else Client().get(URL)
        payload=parse_jbis_sire_indices(page)
        changed=apply_payload(root,payload,args.apply)
        report.update(source_updated_at=payload['source']['updated_at'],summary=payload['summary'],changed=changed,applied=bool(changed and args.apply),batch_acceptable=True)
    except Exception as exc:
        report.update(errors=[str(exc)],batch_acceptable=False)
    report['finished_at']=datetime.now(timezone.utc).isoformat();args.report.parent.mkdir(parents=True,exist_ok=True);write(args.report,report)
    print(json.dumps(report,ensure_ascii=False),flush=True)
    if not report['batch_acceptable']: raise SystemExit('Sire index refresh failed validation; existing dataset preserved.')

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--root',type=Path,default=ROOT);parser.add_argument('--page-file');parser.add_argument('--apply',action='store_true');parser.add_argument('--report',type=Path,default=Path('sire-index-report.json'));run(parser.parse_args())

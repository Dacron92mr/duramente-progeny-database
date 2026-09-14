"""Rebuild derived metrics without replacing manually curated market/ranking/pedigree data."""
import copy
import json
from pathlib import Path
import analytics_core as core
import build_awd_analysis
import build_chart_insights

def read(path): return json.loads(path.read_text())
def write(path, data): path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')

def preserve_extra(old, new):
    if isinstance(old,dict) and isinstance(new,dict):
        return {**old, **{k:preserve_extra(old.get(k),v) for k,v in new.items()}}
    if isinstance(old,list) and isinstance(new,list) and new and isinstance(new[0],dict):
        key=next((k for k in ['label','year','horse_id'] if all(k in r for r in new) and len({str(r[k]) for r in new})==len(new)),None)
        if key:
            known={str(r[key]):r for r in old if isinstance(r,dict) and key in r}
            return [preserve_extra(known.get(str(row[key])),row) for row in new]
    return new

def rebuild(root):
    data=root/'data';horses=read(data/'horses.json');races=[]
    for horse in horses:
        detail=read(data/'horses'/f"{horse['id']}.json")
        horse['race_count']=len(detail.get('races',[]))
        races.extend([{**r,**{k:horse.get(k) for k in ['name','hkjc_name_zh','sex','birth_year','breeder']},'horse_id':horse['id']} for r in detail.get('races',[])])
    # Only aggregates tied to synchronized profiles and race records are regenerated.
    builders={'overview':lambda:core.overview(horses,races),'sire_profile':lambda:core.sire_profile(horses,races),
      'crops':lambda:core.crop_metrics(horses),'bms_lines':lambda:core.bms_line_metrics(horses),
      'broodmare_sires':lambda:core.grouped_metrics(horses,'broodmare_sire','未分類'),
      'breeders':lambda:core.breeder_analysis(horses,races),'racecourses':lambda:core.racecourse_analysis(races),
      'distance_surface':lambda:core.race_breakdowns(races),'dam_age':lambda:core.dam_age_analysis(horses)}
    for name,build in builders.items():
        path=data/'analytics'/f'{name}.json';write(path,preserve_extra(read(path),build()))
    path=data/'analytics/annual_progeny_performance.json';old=read(path)
    annual=core.annual_progeny_performance(horses,races)
    # Ranking-based annual earnings are a separate authoritative series, not race prize sums.
    old_rows={r['year']:r for r in old.get('annual',[])}
    for row in annual.get('annual',[]):
        prior=old_rows.get(row['year'],{})
        for key,value in prior.items():
            if key.startswith('earnings'): row[key]=value
    write(path,preserve_extra(old,annual))
    build_awd_analysis.ROOT=root;build_awd_analysis.main()
    build_chart_insights.ROOT=root;build_chart_insights.build()
    for horse in horses: horse.pop('race_count',None)
    return len(races)

if __name__=='__main__': rebuild(Path(__file__).resolve().parents[1])

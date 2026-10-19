import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createDetailContent} from '../src/detail-content.mjs';
import {classifiedRace} from '../src/race-surfaces.mjs';
import {createProfileModel} from '../src/profile-model.mjs';
import {scopeRows,surfaceSample} from '../src/racecourse-analysis.mjs';
import {renderPostRacing,renderBlackType} from '../src/horse-profile.mjs';
const read=p=>JSON.parse(fs.readFileSync(new URL('../data/'+p,import.meta.url)));
test('four synthetic starts and one win are corrected without changing source records',()=>{
 const detail=read('horses/2371.json'),before=JSON.stringify(detail),vm=createProfileModel(detail);
 const rows=vm.racing.records.filter(r=>r.surface==='合成');
 assert.equal(rows.length,4);assert.equal(rows.filter(r=>r.finish===1).length,1);
 assert(rows.every(r=>r.source_surface==='芝'));
 assert.equal(JSON.stringify(detail),before);
 const display=createDetailContent({finishBadge:()=>''}).raceRows(rows,detail.horse);assert.match(display,/合成跑道 1600m/);assert.doesNotMatch(display,/芝地/);
 const awd=read('analytics/awd.json').summary;assert.equal(awd.overall_wins,awd.turf_wins+awd.dirt_wins+awd.synthetic_wins);const wins=read('horses.json').flatMap(h=>read(`horses/${h.id}.json`).races||[]).filter(r=>r.finish===1&&['芝','ダ','合成'].includes(classifiedRace(r).surface)&&Number(r.distance_m)>0);assert.equal(awd.overall_wins,wins.length);
 for(const [meeting,surface] of Object.entries(read('surface_classifications.json').courses))assert.equal(classifiedRace({meeting,surface:'芝'}).surface,surface);
 const turf={meeting:'東京',surface:'芝'};assert.equal(classifiedRace(turf),turf);
});
test('jurisdiction counts reconcile and each surface has its own minimum sample',()=>{
 const data=read('analytics/racecourses.json');
 const groups=['JRA','NAR','Overseas'].map(s=>scopeRows(data.table,s));
 assert.equal(groups.flat().length,data.table.length);
 assert.equal(scopeRows(data.table,'All').reduce((n,r)=>n+r.starts,0),groups.flat().reduce((n,r)=>n+r.starts,0));
 const row={surface:{芝:{starts:1,wins:1},ダ:{starts:30,wins:3}}};
 assert.equal(surfaceSample(row,'芝',30),null);assert.equal(surfaceSample(row,'芝',1).rate,100);
 assert.equal(surfaceSample(row,'ダ',30).rate,10);assert.equal(surfaceSample(row,'合成',1),null);
 assert.equal(data.overseas_history.length,32);assert(data.overseas_history.every(r=>r.country&&r.race_url&&r.horse_id));
 for(const name of ['Pakenham Synthetic','Ballarat Synthetic'])assert.deepEqual(Object.keys(data.table.find(r=>r.label===name).surface),['合成']);
});
test('dated careers match horse identity, distinguish plans and need no breeding record',()=>{
 const careers=read('post_racing_careers.json').horses;
 assert.deepEqual(Object.keys(careers),['14','17','591','677','689']);
 for(const [id,row] of Object.entries(careers)){
  const horse=read('horses/'+id+'.json').horse;
  assert.equal(row.netkeiba_id,horse.netkeiba_id);assert.equal(row.name,horse.name);
  assert(row.events.every(e=>/^https:\/\//.test(e.source_url)&&/^\d{4}-\d{2}-\d{2}$/.test(e.date)));
  assert.match(renderPostRacing(row.events),/退役后去向/);
 }
 assert.match(renderPostRacing(careers[17].events),/当时公布的计划/);
 assert.match(renderPostRacing(careers[17].events),/已确认记录/);
 assert.equal(renderPostRacing([]),'');
});
test('black type includes a verified placed sibling and retains event-level evidence',()=>{
 const catalog=read('black_type_siblings.json');
 const sister=catalog.dams['000a012f78'].find(s=>s.name==='ルージュスティリア');
 assert.equal(sister.evidence[0].finish,3);assert.equal(sister.evidence[0].grade,'G3');
 assert.match(renderBlackType([sister]),/第3名/);
 for(const siblings of Object.values(catalog.dams))for(const sibling of siblings)for(const e of sibling.evidence){
  assert(['G1','G2','G3','L'].includes(e.grade));assert(e.finish>=1&&e.finish<=3);assert(e.source_url);
 }
});

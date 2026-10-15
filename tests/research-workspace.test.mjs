import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createProfileModel,racingBreakdown} from '../src/profile-model.mjs';
import {populationGroups,completedAgeRows} from '../src/research-workbench.mjs';
import {clusterPoints,MAP_REGIONS} from '../src/racecourse-map.mjs';
const read=async path=>JSON.parse(await readFile(new URL('../'+path,import.meta.url),'utf8'));
test('performance rates exclude absent, unfinished and string finishes without dropping raw records',()=>{
 const races=[{finish:1,race_date:'2020/1/1',surface:'芝',distance_m:1200},{finish:3,race_date:'2020/2/1',surface:'芝',distance_m:1600},{finish:null,finish_note:'中',surface:'ダ'},{finish:0},{finish:'1'}];
 const result=racingBreakdown(races);assert.equal(result.total,5);assert.equal(result.valid,2);assert.equal(result.victories.length,1);assert.equal(result.year[0].n,2);assert.equal(result.year[0].winRate,.5);assert.equal(result.surface.find(r=>r.key==='泥地').winRate,null);assert.equal(result.distance.reduce((n,r)=>n+r.records.length,0),5);assert.equal(races[2].finish,null);
});
test('structured profiles retain source records and only resolve siblings by netkeiba ID',async()=>{
 const data=await read('data/horses/1.json');const before=JSON.stringify(data);const vm=createProfileModel(data,[{name:'同名',netkeiba_id:'1234567890'}],[{id:99,name:'其他名',netkeiba_id:'1234567890'}]);
 assert.equal(vm.pedigree.siblings[0].localId,99);assert.equal(vm.racing.records,data.races);assert.equal(vm.breeding.records,data.stud);assert.equal(vm.pedigree.dam.age,data.horse.dam_age_at_foaling);assert.equal(JSON.stringify(data),before);
 const src=await readFile(new URL('../src/horse-profile.mjs',import.meta.url),'utf8');assert(!src.includes('.detail-grid'));assert(!src.includes('firstElementChild.textContent'));
});
test('population grouping and drill-down IDs exactly match sex and cohort intersection',async()=>{
 const horses=await read('data/horses.json');const rows=populationGroups(horses,'broodmare_sire',{year:'2019',sex:'牝'});
 for(const row of rows){const sample=horses.filter(h=>String(h.birth_year)==='2019'&&h.sex==='牝'&&h.broodmare_sire===row.key);assert.deepEqual(row.ids,sample.map(h=>String(h.id)));assert.equal(row.n,sample.length);assert.equal(row.winners,sample.filter(h=>Number(h.career_summary?.match(/(\d+)勝/)?.[1])>0).length);}
 assert.equal(populationGroups([{id:1,broodmare_sire:'A',career_summary:''}],'broodmare_sire')[0].unknown,1);
});
test('same-age comparison excludes the current incomplete age year and uses existing values',()=>{
 const profile={crop_development:[{crop:2022,age:4,cumulative_wins:12,cumulative_wins_per_100_foals:3.2},{crop:2021,age:4,cumulative_wins:10,cumulative_wins_per_100_foals:8}]};assert.deepEqual(completedAgeRows(profile,4,2026),[{key:'2021',wins:10,value:8}]);
});
test('screen clustering preserves every member, merges transitive overlaps and separates after zoom',()=>{
 const points=[{x:0},{x:20},{x:40},{x:100}];assert.deepEqual(clusterPoints(points,p=>[p.x,0]).map(g=>g.length),[3,1]);assert.equal(clusterPoints(points,p=>[p.x*3,0]).length,4);assert(MAP_REGIONS.east.test({lon:139.5,lat:35.6}));assert(!MAP_REGIONS.east.test({lon:141,lat:43}));
});
test('course population index reconciles starts, wins and top-three with existing aggregate',async()=>{
 const index=await read('data/analytics/racecourse_population.json'),stats=await read('data/analytics/racecourses.json'),horses=await read('data/horses.json');const ids=new Set(horses.map(h=>String(h.id)));
 for(const row of stats.table){const found=index.courses[row.label];if(!row.starts){assert(!found);continue;}assert.equal(found.starts,row.starts,row.label);assert.equal(found.wins,row.wins_starts,row.label);assert.equal(found.top3,row.top3,row.label);assert.equal(new Set(found.horse_ids).size,found.horse_ids.length);assert(found.horse_ids.every(id=>ids.has(id)));}
});

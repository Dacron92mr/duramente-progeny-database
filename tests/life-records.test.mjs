import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {breedingOutcome,renderBreedingYears,historyNames} from '../src/life-records.mjs';
import {filterAndSortHorses} from '../src/filtering.mjs';
import {raceJurisdiction,renderRaceHistory} from '../src/race-history.mjs';
import {filterUpdates,updateRows} from '../src/updates.mjs';
test('breeding results never infer infertility or birth from missing forecasts',()=>{
 const c={cover_year:2025,stallion_name:'A'};
 assert.equal(breedingOutcome(c,[]).label,'尚无结果报告');
 for(const [text,label] of [['不受胎','未受孕'],['流産','流产'],['死産','死产'],['生後直死','出生后死亡'],['報告なし','尚无报告']])assert.equal(breedingOutcome(c,[{result_year:2026,sire_name:'A',birth_date:text}]).label,label);
 assert.equal(breedingOutcome(c,[{result_year:2026,sire_name:'A',birth_date:'2026. 3.14'}]).label,'已确认生产');
 assert.equal(breedingOutcome({...c,due_date:'2026.3.14'},[]).label,'有预产记录 · 结果待报告');
 const profile={role:'broodmare',coverings:[c],foals:[{result_year:2026,sire_name:'B',birth_date:'死産'}]};const html=renderBreedingYears(profile);assert.match(html,/2025 配种年度/);assert.match(html,/2026 生产记录/);assert.doesNotMatch(html,/已确认生产/);
});
test('verified historical trainer and owner filters include a horse once',()=>{
 const horse={id:9,name:'Dura',trainer:'B',owner:'Y',affiliation_history:[{trainer:'A',owner:'X'},{trainer:'A',owner:'X'}]};
 assert.deepEqual(historyNames(horse,'trainer'),['B','A']);
 for(const query of ['trainer=A','trainer=B','owner=X','owner=Y','q=A'])assert.equal(filterAndSortHorses([horse],new URLSearchParams(query)).length,1);
 assert.equal(filterAndSortHorses([horse],new URLSearchParams('trainer=C')).length,0);
});
test('mixed race history stays chronological and classification is per race',()=>{
 const races=[{race_date:'2023/12/29',meeting:'大井',race_name:'東京大賞典',finish:3},{race_date:'2024/03/30',meeting:'メイダン',race_name:'Dubai',finish:5},{race_date:'2024/12/01',meeting:'4中京2',race_name:'Champions',finish:3}];
 assert.deepEqual(races.map(raceJurisdiction),['NAR','海外','JRA']);const before=JSON.stringify(races);
 const html=renderRaceHistory(races,{finishBadge:v=>String(v),raceDistanceText:()=>'',overseasPrize:()=>''});assert(html.indexOf('2024/12/01')<html.indexOf('2024/03/30'));assert.equal(JSON.stringify(races),before);assert.match(html,/负磅/);assert.match(html,/马体重/);assert.match(html,/race-mobile-row/);
});
test('updates filter collection date independently of historical event date',()=>{
 const events=[{id:'a',horse_id:9,horse_name:'Dura',recorded_at:'2026-10-20',event_date:'2025-12-11',historical:true,type:'registration',title:'注销',source_url:'https://jra.jp/'}];
 assert.equal(filterUpdates(events,{date:'2026-10-20',horse:9,type:'registration'}).length,1);assert.equal(filterUpdates(events,{date:'2025-12-11'}).length,0);assert.match(updateRows(events),/新增历史资料/);assert.match(updateRows(events),/2025/);
});
test('Dura Erede history separates deregistration, later racing and trainer attribution',()=>{
 const history=JSON.parse(fs.readFileSync(new URL('../data/career_history.json',import.meta.url))).horses['9'];assert(history.affiliations.some(e=>e.trainer==='池添学'));assert(history.affiliations.some(e=>e.trainer==='藤田輝信'));assert.equal(history.registration.length,2);assert.equal(history.race_attributions.find(e=>e.date==='2023-12-29').trainer,'池添学');
});

test('stallion yearly cards preserve genuine zero counts',()=>{const html=renderBreedingYears({role:'stallion',fees:[{year:2026,fee_text:'100万円',bred_count:0}],stallion_stats:[{year:2026,births:0,registered_total:0}]});assert.match(html,/<dt>出生<\/dt><dd>0<\/dd>/);});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { filterAndSortHorses, staticHorseList, matchesQuickFilter } from '../src/filtering.mjs';
import { createRouter } from '../src/router.mjs';
import { state as defaults } from '../src/state.mjs';
import { money, formatNumber } from '../src/format.mjs';
import { horseName } from '../src/progeny-renderer.mjs';
import { csvCell, horsesCsv, CSV_COLUMNS } from '../src/csv.mjs';
import { createDataClient } from '../src/data.mjs';

const fixtures = [
  {id:1,name:'タイトルホルダー',name_en:'Titleholder',hkjc_name_zh:'領銜',search_aliases:'领衔',birth_year:2018,sex:'牡',achievement_class:'G1',earnings_netkeiba:100,breeding_role:'Stud Record',dam_age_at_foaling:9},
  {id:2,name:'試験馬A',name_en:'Example A',birth_year:2019,sex:'牝',achievement_class:'G3',earnings_netkeiba:0,breeding_role:'Progeny Record',dam_age_at_foaling:12},
  {id:3,name:'試験馬B',birth_year:2019,sex:'牝',achievement_class:'Jpn1',earnings_netkeiba:null,breeding_role:'なし'},
  {id:4,name:'試験馬C',birth_year:2020,sex:'牡',achievement_class:'地方・その他',earnings_netkeiba:50},
];
const query = (values={}) => new URLSearchParams(values);
test('Japanese, English, official Chinese and existing aliases resolve the same identity', () => {
  for (const q of ['タイトルホルダー','TITLEHOLDER','領銜','领衔']) assert.deepEqual(filterAndSortHorses(fixtures,query({q})).map(h=>h.id),[1]);
});
test('quick filters intersect existing filters and never reinterpret Jpn/local classes', () => {
  assert.deepEqual(filterAndSortHorses(fixtures,query({quick:'graded',sex:'牝',year:'2019',dam_age_bucket:'11-14'})).map(h=>h.id),[2]);
  assert.equal(matchesQuickFilter(fixtures[2],'g1'),false);
  assert.equal(matchesQuickFilter(fixtures[2],'graded'),false);
  assert.equal(filterAndSortHorses(fixtures,query({quick:'hkjc'})).length,1);
  assert.equal(filterAndSortHorses(fixtures,query({quick:'breeding'})).length,2);
});
test('stable sorting, pagination and empty results preserve input records', () => {
  const before=JSON.stringify(fixtures);
  assert.deepEqual(filterAndSortHorses(fixtures,query()).map(h=>h.id),[1,4,2,3]);
  assert.deepEqual(staticHorseList(fixtures,query({limit:'2',offset:'2'})).items.map(h=>h.id),[2,3]);
  assert.equal(staticHorseList(fixtures,query({q:'no-match'})).total,0);
  assert.equal(staticHorseList(fixtures,query({limit:'NaN',offset:'Infinity'})).items.length,4);
  assert.equal(JSON.stringify(fixtures),before);
});
test('unknown earnings and absent translations stay unknown', () => {
  assert.equal(money(null),'—');assert.equal(money(''),'—');assert.equal(formatNumber(null),'—');
  assert.equal(money(0),'0 万日元');
  const name=horseName(fixtures[2]);assert(!name.includes('undefined'));assert(!name.includes('香港'));assert(!name.includes('horse-name-secondary'));
  assert(horseName(fixtures[0]).includes('Titleholder · 領銜'));
});
test('URL state round-trips under a GitHub Pages subpath', () => {
  const location={pathname:'/duramente-progeny-database/',search:'?q=領銜&limit=20&offset=40&quick=g1&horse=1',hash:''};
  const state={...defaults};const router=createRouter(state,location,{});router.readUrlState();
  assert.equal(state.limit,20);assert.equal(state.offset,40);assert.equal(state.horse,'1');
  const url=new URL(router.urlForState(),'https://example.com');assert.equal(url.pathname,location.pathname);assert.equal(url.searchParams.get('q'),'領銜');assert.equal(url.searchParams.get('quick'),'g1');
  location.search='?view=invalid&sort=invalid&limit=500&offset=Infinity&quick=invalid';router.readUrlState();
  assert.equal(state.view,'progeny');assert.equal(state.limit,50);assert.equal(state.offset,0);assert.equal(state.quick,'');
});
test('CSV escapes Unicode, commas, quotes, newlines and spreadsheet formulas', () => {
  for(const value of ['=1+1',' +SUM(A1)','\t@cmd','\r-2']) assert(csvCell(value).startsWith('"\''));
  assert.equal(csvCell('A,"B"\nC'),'"A,""B""\nC"');assert.equal(csvCell(null),'""');assert.equal(csvCell(0),'"0"');
  const csv=horsesCsv([fixtures[0]]);assert(csv.startsWith('\uFEFF'));assert(csv.includes('領銜'));assert.equal(csv.split('\r\n').length,3);assert(CSV_COLUMNS.some(([key])=>key==='earnings_jbis'));
});
test('concurrent requests share one fetch and failed requests can retry', async () => {
  const oldWindow=globalThis.window,oldFetch=globalThis.fetch;
  globalThis.window={STATIC_DATA_BASE:'data',STATIC_DATA_VERSION:'fixture',location:{href:'https://example.com/repo/'}};
  let calls=0;
  globalThis.fetch=async()=>{calls++;return {ok:true,json:async()=>fixtures};};
  try {
    const client=createDataClient();const [a,b]=await Promise.all([client.getStaticHorses(),client.getStaticHorses()]);
    assert.equal(calls,2);assert.equal(a,b);
    globalThis.fetch=async()=>{calls++;throw new Error('fixture failure');};
    await assert.rejects(client.fetchStaticData('retry.json'));
    globalThis.fetch=async()=>{calls++;return {ok:true,json:async()=>({ok:true})};};
    assert.deepEqual(await client.fetchStaticData('retry.json'),{ok:true});assert.equal(calls,6);
  } finally {globalThis.window=oldWindow;globalThis.fetch=oldFetch;}
});
test('real list/detail inventory and verified names remain consistent without a frozen count', () => {
  const horses=JSON.parse(fs.readFileSync(new URL('../data/horses.json',import.meta.url)));
  assert(horses.length>0);assert.equal(new Set(horses.map(h=>h.id)).size,horses.length);
  for(const horse of horses){
    const detail=JSON.parse(fs.readFileSync(new URL(`../data/horses/${horse.id}.json`,import.meta.url))).horse;
    assert.equal(detail.id,horse.id);assert.equal(detail.name,horse.name);assert.equal(detail.name_en || '',horse.name_en || '');assert.equal(detail.hkjc_name_zh || '',horse.hkjc_name_zh || '');
  }
});

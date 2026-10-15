import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {raceLabel,majorWinLabel} from '../src/racing-ui.mjs';
import {selectionSeries} from '../src/research-workbench.mjs';
import {courseBubbleSize,clusterPoints} from '../src/racecourse-map.mjs';
import {renderProgenyRows,renderHorseCards} from '../src/progeny-renderer.mjs';
const data=async p=>JSON.parse(await readFile(new URL('../'+p,import.meta.url),'utf8'));
test('major win badges retain explicit race systems and reconcile two summaries to winning records',async()=>{
 for(const code of ['G1','G2','G3','JpnI','JpnII','JpnIII','J.G2','J.GIII'])assert.match(raceLabel(`Race(${code})`),new RegExp(`>${code.replace('.','\\.')}<`));
 for(const text of ['',null,'Race(OP)','Race','Race(G)'])assert(!majorWinLabel(text).includes('grade-pill'));
 for(const [id,grade] of [[15,'JpnIII'],[18,'JpnI']]){
  const detail=await data(`data/horses/${id}.json`);assert(detail.races.some(r=>r.finish===1&&r.race_name.includes(`(${grade})`)));
  assert(majorWinLabel(detail.horse.major_win).includes(`>${grade}<`));
 }
});
test('list and mobile card render only the major-win badge, never infer grade from achievement',()=>{
 const h={id:1,name:'Test',major_win:'Race',achievement_class:'G1'};
 const helpers={regionBadge:()=>'',lineageBadge:()=>'',ownerCell:()=>''};
 for(const render of [h=>renderProgenyRows([h],helpers),h=>renderHorseCards([h])]){
  assert(!render(h).includes('grade-pill'));assert(!render(h).includes('achievement-cell'));
  assert.equal((render({...h,major_win:'Race(G2)'}).match(/grade-pill/g)||[]).length,1);
 }
});
test('A/B overlays retain coincident coordinates and non-color identity',()=>{
 const rows=[{key:'one',n:10,winners:4},{key:'two',n:10,winners:4}];const original=JSON.stringify(rows);
 const selections=selectionSeries(rows,'one','two','winners',{a:'#900',b:'#009'});
 assert.deepEqual(selections.map(s=>s.data[0].value),[[10,40],[10,40]]);
 assert.deepEqual(selections.map(s=>s.data[0].label.formatter),['A','B']);
 assert.notEqual(selections[0].symbolSize,selections[1].symbolSize);
 assert.notEqual(selections[0].data[0].label.position,selections[1].data[0].label.position);
 assert.equal(JSON.stringify(rows),original);assert.equal(selectionSeries(rows,'missing','two','winners',{})[0].data.length,0);
});
test('bubble area has a visible zero and scales monotonically with wins on a fixed range',()=>{
 const sizes=[0,1,10,100].map(w=>courseBubbleSize(w,100));assert.equal(sizes[0],14);assert.equal(sizes[3],46);
 assert(sizes.every((d,i)=>!i||d>sizes[i-1]));
 assert(Math.abs((sizes[2]**2-14**2)/(46**2-14**2)-.1)<1e-10);
 assert.equal(courseBubbleSize(0,0),14);assert.equal(courseBubbleSize(200,100),46);
 const points=[{x:0,size:46},{x:40,size:46},{x:100,size:14}];
 assert.deepEqual(clusterPoints(points,p=>[p.x,0],(a,b)=>(a.size+b.size)/2+6).map(g=>g.length),[2,1]);
});

test('all existing achievement filters preserve the exact 726-horse population',async()=>{
 const {filterAndSortHorses}=await import('../src/filtering.mjs');
 const horses=await data('data/horses.json');assert.equal(horses.length,726);
 for(const grade of new Set(horses.map(h=>h.achievement_class).filter(Boolean))){
  const expected=horses.filter(h=>h.achievement_class===grade).map(h=>h.id).sort((a,b)=>a-b);
  const actual=filterAndSortHorses(horses,new URLSearchParams({achievement:grade})).map(h=>h.id).sort((a,b)=>a-b);
  assert.deepEqual(actual,expected);
 }
});

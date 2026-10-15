import test from 'node:test';
import assert from 'node:assert/strict';
import { comparisonText, studyTitle, metricLabel, conceptIntro } from '../src/ux-copy.mjs';
import { populationGroups } from '../src/research-workbench.mjs';
const a={key:'甲',n:10,value:75},b={key:'乙',n:20,value:50};
test('comparison summaries handle higher, lower, tie, same, missing, empty and small samples',()=>{
 assert.match(comparisonText(a,b),/甲.*高出 25 个百分点/);
 assert.match(comparisonText(b,a),/甲.*高出 25 个百分点/);
 assert.match(comparisonText(a,{...b,value:75}),/相同/);
 assert.match(comparisonText(a,a),/同一组/);
 assert.match(comparisonText(a,{...b,value:null}),/尚未收录/);
 assert.match(comparisonText(a,{...b,value:NaN}),/尚未收录/);
 assert.match(comparisonText(null,b),/不足/);
 assert.match(comparisonText(a,{...b,n:0}),/不足/);
 assert.match(comparisonText(a,{...b,n:2}),/较少/);
 assert.match(comparisonText(a,b,{metric:'wins'}),/每100匹累计胜场高出 25 胜/);
});
test('titles follow both field and metric; concept references never claim to be data sources',()=>{
 assert.equal(studyTitle('bms_line','graded'),'不同母父系的重赏马比例');
 assert.match(studyTitle('female_family','winners'),/牝系.*胜马率/);
 assert.match(conceptIntro('dosage'),/Wikipedia/);assert(!conceptIntro('dosage').includes('数据来源'));
});
test('unknown careers remain unknown and stay in the denominator without becoming winners',()=>{
 const horses=['12戦2勝','0戦0勝','6戦0勝','',null,'尚未收录'].map((career_summary,id)=>({id,career_summary,broodmare_sire:'A'}));
 const row=populationGroups(horses,'broodmare_sire')[0];assert.equal(row.n,6);assert.equal(row.winners,1);assert.equal(row.unknown,3);
});

test('winner rate copy follows career coverage without changing calculation',()=>{
 assert.equal(metricLabel('winners'),'胜马率');
 assert.equal(metricLabel('winners',{incomplete:true}),'已确认胜马比例');
 assert.match(studyTitle('broodmare_sire','winners',{incomplete:true}),/已确认胜马比例/);
 assert.match(comparisonText(a,b,{incomplete:true}),/已确认胜马比例/);
});

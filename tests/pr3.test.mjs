import test from 'node:test';import assert from 'node:assert/strict';
import {majorWinLabel,raceLabel} from '../src/racing-ui.mjs';
test('class levels use compact labels and retain unrelated race parentheses',()=>{
 for(const level of ['1勝クラス','2勝クラス','3勝クラス','L','OP']){
  const s=majorWinLabel(`古都S(${level})`);assert.match(s,/grade-pill/);assert(!s.includes(`(${level})`));
 }
 assert.match(raceLabel('天皇賞(春)(GI)'),/天皇賞\(春\)/);
 assert.match(raceLabel('富士S(GII)'),/>G2<\/span>/);
 assert.doesNotMatch(majorWinLabel('条件不明'),/grade-pill/);
});
test('Icon Taylor JBC annotation is specific to verified horse/race',()=>{
 assert.match(majorWinLabel('JBCレディスクラシック',{id:8}),/JpnI/);
 assert.doesNotMatch(majorWinLabel('JBCレディスクラシック',{id:99}),/grade-pill/);
});
import {renderNotableSiblings} from '../src/horse-profile.mjs';
import fs from 'node:fs';
test('Melody Lane is a sourced notable sibling, not an invented black-type winner',()=>{
 const cat=JSON.parse(fs.readFileSync(new URL('../data/notable_siblings.json',import.meta.url)));
 const html=renderNotableSiblings(cat.dams['2008110046']);assert.match(html,/其他知名同母马/);assert.match(html,/不据此标注国际黑体资格/);assert.match(html,/JBIS|jbis/);
});

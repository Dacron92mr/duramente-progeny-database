import test from 'node:test';
import assert from 'node:assert/strict';
import {references,researchTopics,renderResearch} from '../src/research-references.mjs';
test('all topic citations have verified metadata and distinct purpose',()=>{
 const used=new Set();
 for(const [key,t] of Object.entries(researchTopics)){
  assert(t.text.length<150,key);assert(t.method);
  assert.equal(new Set(t.refs).size,t.refs.length);
  const markup=renderResearch(key);
  assert.match(markup,/<details class="research-disclosure">/);
  assert.doesNotMatch(markup,/<details[^>]* open/);
  assert.equal((markup.match(/data-reference-id=/g)||[]).length,t.refs.length);
  for(const id of t.refs){used.add(id);const r=references[id];assert(r,id);for(const field of ['authors','title','publisher','type','summary','limitations','verifiedAt'])assert(r[field],`${id}: ${field}`);assert.equal(new URL(r.url).protocol,'https:');if(r.type==='同行评审研究'){assert(r.year);assert.match(r.doi,/^10\./);} }
 }
 assert.equal(used.size,Object.keys(references).length);
 assert.throws(()=>renderResearch('unknown'),/Unknown research topic/);
});
test('conflicting maternal evidence and distinct outcomes stay explicit',()=>{
 assert.deepEqual(researchTopics.maternalAge.refs,['inoue2022','sharman2022']);
 assert.match(references.inoue2022.summary,/减弱/);assert.match(references.sharman2022.summary,/下降/);
 assert.match(references.jairs2017.limitations,/非同行评审/);
 assert.match(references.jairs2017.summary,/日后/);
 assert.match(references.onoda2014.limitations,/不是胜率/);
 assert.match(researchTopics.awd.method,/不能.*基因型/);
 assert.match(researchTopics.nicking.method,/不计算 TrueNicks/);
});
test('references are research context rather than original data provenance',()=>{
 const markup=renderResearch('indices');
 assert.match(markup,/data-link-purpose="research"/);
 assert.doesNotMatch(markup,/data-link-purpose="source"/);
 assert.match(markup,/target="_blank" rel="noopener noreferrer"/);
 assert.match(renderResearch('dosage'),/16、8、4、2/);
 assert.match(renderResearch('cross'),/SNP.*ROH/);
});

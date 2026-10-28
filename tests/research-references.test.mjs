import test from 'node:test';
import assert from 'node:assert/strict';
import {references,researchTopics} from '../src/research-references.mjs';
import {renderResearchSection} from '../src/research-rendering.mjs';
test('all topic citations have verified metadata and distinct purpose',()=>{
 const used=new Set();
 for(const [key,t] of Object.entries(researchTopics)){
  assert(t.context.length<150,key);assert(t.method);
  assert.equal(new Set(t.refs).size,t.refs.length);
  const markup=renderResearchSection(key);
  assert.match(markup,/<details class="research-disclosure">/);
  assert.doesNotMatch(markup,/<details[^>]* open/);
  assert.equal((markup.match(/data-reference-id=/g)||[]).length,t.refs.length);
  assert.equal((markup.match(/class="research-citation reference-mobile-link"/g)||[]).length,t.refs.length);
  assert.equal((markup.match(/class="reference-desktop"/g)||[]).length,t.refs.length);
  for(const id of t.refs){used.add(id);const r=references[id];assert(r,id);for(const field of ['authors','title','publisher','type','summary','limitations','verifiedAt'])assert(r[field],`${id}: ${field}`);for(const field of ['authors','title','publisher'])assert(r.mobile[field],`${id}: mobile ${field}`);assert(r.mobile.title.length<=16,id);assert.equal(new URL(r.url).protocol,'https:');assert(markup.includes(r.title),`${id}: full title`);if(r.type==='同行评审研究'){assert(r.year);assert.match(r.doi,/^10\./);} }
  assert.match(markup,new RegExp(`深入研究依据 <span>· ${t.refs.length} 篇</span>`));
  assert.equal((markup.match(/class="reference-detail-item"/g)||[]).length,t.refs.length);
 }
 assert.equal(used.size,Object.keys(references).length);
 assert.throws(()=>renderResearchSection('unknown'),/Unknown research topic/);
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
 const markup=renderResearchSection('indices');
 assert.match(markup,/data-link-purpose="research"/);
 assert.doesNotMatch(markup,/data-link-purpose="source"/);
 assert.match(markup,/target="_blank"\s+rel="noopener noreferrer"/);
 assert.match(renderResearchSection('dosage'),/16、8、4、2/);
 assert.match(renderResearchSection('cross'),/SNP.*ROH/);
});
test('mobile citations preserve full-title access while defaulting to compact metadata',()=>{
 const markup=renderResearchSection('maternalAge');
 assert.match(markup,/Inoue，2022/);
 assert.match(markup,/母龄与子代赛绩/);
 assert.match(markup,/Sharman et al\.，2022/);
 assert.match(markup,/Royal Soc\. Open Sci\./);
 assert.doesNotMatch(renderResearchSection('indices'),/JBIS—/);
 assert.match(markup,/aria-label="[^"]*Influence of broodmare aging[^"]*在新窗口打开/);
 assert.match(markup,/reference-detail-item[^>]*data-reference-detail="inoue2022"/);
 assert.match(markup,/研究发现<\/strong>.*研究局限<\/strong>/s);
 assert.doesNotMatch(markup,/<details class="research-details" open/);
});

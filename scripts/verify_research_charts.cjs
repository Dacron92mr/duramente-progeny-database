const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {distribution,wilson} = require('../chart-analysis.js');
// Known independent examples: zero is a real observation; unknown is not zero.
const sample = [0,10,20,30,100].map((earnings_netkeiba,id)=>({id,earnings_netkeiba}));
sample.push({id:99,earnings_netkeiba:null,earnings_jbis:null});
assert.deepEqual(distribution(sample).box,[0,10,20,30,30]);
assert.equal(distribution(sample).total,160);
assert.equal(distribution(sample).missing,1);
assert.equal(distribution([]).box,null);
assert.equal(wilson(0,0),null);
assert(Math.abs(wilson(5,10)[0]-23.659)<.001);
assert(Math.abs(wilson(5,10)[1]-76.341)<.001);
assert(wilson(5,5)[0]<60);
assert(wilson(0,5)[1]>40);
const root=path.join(__dirname,'..');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const horses=read('data/horses.json');
const profile=read('data/analytics/sire_profile.json');
for(const c of profile.crops) {
  const d=distribution(horses.filter(h=>String(h.birth_year)===String(c.label)));
  assert.equal(d.horses.length,c.foals);
  assert(Math.abs(d.total-c.total_earnings)<.2);
  assert(d.box.every((v,i,a)=>i===0||v>=a[i-1]));
}
const photos=read('data/horse_photos.json');
const ids=new Set(horses.map(h=>String(h.netkeiba_id)));
for(const [id,refs] of Object.entries(photos.horses)) {
  assert(ids.has(id));
  assert(refs.every(p=>/^\d+$/.test(p)));
  assert.equal(new Set(refs).size,refs.length);
}
console.log('Verified distribution accounting, zero/missing handling, Wilson intervals and horse/photo identity references.');

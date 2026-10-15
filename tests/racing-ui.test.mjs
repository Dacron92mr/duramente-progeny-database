import test from 'node:test';
import assert from 'node:assert/strict';
import { gradeClass, raceLabel, affiliationBadge } from '../src/racing-ui.mjs';
import { chartContext } from '../src/chart-context.mjs';
import { createRouter } from '../src/router.mjs';
import { state as defaults } from '../src/state.mjs';
test('explicit race grades never turn participation or local codes into horse achievements', () => {
  assert.equal(gradeClass('GⅠ'),'grade-g1');
  for(const value of ['Jpn1','J.G1','Unknown','参加G1','Listed']) assert.equal(gradeClass(value),'grade-other');
  assert.match(raceLabel('有馬記念(GI)'),/赛事等级；不代表本马获胜/);
  assert(!raceLabel('日本ダービー').includes('grade-g1'));
  assert.match(raceLabel('<script>(GIII)'),/&lt;script&gt;/);
  assert.match(affiliationBadge('美浦'),/miho/); assert.match(affiliationBadge('栗東'),/ritto/);
  assert.match(affiliationBadge('海外'),/overseas/);
});
test('full profile round trips on Pages and disappears when the horse closes',()=>{
  const state={...defaults}; const location={pathname:'/duramente-progeny-database/',search:'?horse=1&profile=full',hash:''};
  const router=createRouter(state,location,{});router.readUrlState(); assert.equal(state.profile,'full');
  assert.match(router.urlForState(),/profile=full/);state.horse='';assert(!router.urlForState().includes('profile='));
});
test('chart reading contexts distinguish race starts from independent progeny and AEI',()=>{
  assert.match(chartContext('racecourseSurfaceChart')[1],/正式名次的出赛/);
  assert.match(chartContext('sireAnnualIndexChart')[1],/同期全部出赛马/);
  assert.match(chartContext('bmsSireEfficiencyChart')[1],/各组产驹数/);
});

test('racing badges retain readable text in both themes', async()=>{
  const {readFile}=await import('node:fs/promises');
  const css=await readFile(new URL('../styles/racing.css',import.meta.url),'utf8');
  const luminance=hex=>{const c=hex.match(/[0-9a-f]{2}/gi).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;};
  const ratio=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
  for(const theme of css.matchAll(/:root[^\{]*\{([^}]+)\}/g)){
    const tokens=Object.fromEntries([...theme[1].matchAll(/--([\w-]+):\s*(#[\da-f]{6})/gi)].map(m=>[m[1],m[2]]));
    for(const key of Object.keys(tokens).filter(k=>k.endsWith('-bg')))assert(ratio(tokens[key],tokens[key.replace(/-bg$/,'-ink')])>=4.5,key);
  }
  for(const [bg,fg] of [['#2f6fa7','#ffffff'],['#c73545','#ffffff'],['#3f8f68','#101113']])assert(ratio(bg,fg)>=4.5);
});

const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await (process.env.TEST_BROWSER==='webkit'?webkit:chromium).launch(process.env.TEST_BROWSER==='webkit'?{}:{executablePath:process.env.CHROME_PATH});
 const page=await browser.newPage({reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8765/',out=process.env.TEST_OUTPUT_DIR||'test-results';fs.mkdirSync(out,{recursive:true});
 // Public QA screenshots exclude third-party photos; photo networking has a separate suite.
 await page.route('**/show_photo.php?**',r=>r.abort());
 const badges=async selector=>{
  for(const badge of await page.locator(selector).all())if(await badge.isVisible()){
   const b=await badge.boundingBox();assert(b.width<85&&b.height<32,JSON.stringify(b));
   assert.equal(await badge.evaluate(e=>getComputedStyle(e).display),'inline-flex');
  }
 };
 for(const width of [390,430,768,1440])for(const theme of ['light','dark']){
  await page.setViewportSize({width,height:1000});await page.goto(base);await page.locator('#horseRows [data-id]').first().waitFor({state:'attached'});await page.selectOption('#themeMode',theme);
  assert.equal(await page.locator('.progeny-table th').filter({hasText:'最高成就'}).count(),0);
  for(const mode of ['compact','detailed']){
   await page.locator(`button[data-display-mode="${mode}"]`).click();
   await badges('#horseRows .grade-pill, #horseCards .grade-pill');assert.equal(await page.locator('.achievement-cell, .horse-card-head .grade-pill').count(),0);
   if(width===1440&&theme==='light'){
    if(mode==='detailed')await page.locator('.progeny-table-wrap').evaluate(e=>e.scrollLeft=e.scrollWidth);
    await page.screenshot({path:`${out}/list-${mode}.png`});
   }
  }
  await page.goto(base+'?view=pedigree');await page.locator('.comparison-tool > summary').click();await page.locator('[data-study-result]').waitFor();await page.selectOption('#themeMode',theme);
  const chartState=()=>page.evaluate(()=>window.echarts.getInstanceByDom(document.querySelector('#pedigreeInvestigationChart')).getOption());
  const state=await chartState(),groups=state.series.find(s=>s.id==='groups').data;
  const coincident=groups.find(d=>groups.some(other=>other.key!==d.key&&String(other.value)===String(d.value)));
  if(coincident){
   const other=groups.find(d=>d.key!==coincident.key&&String(d.value)===String(coincident.value));
   await page.selectOption('[data-compare="a"]',coincident.key);await page.selectOption('[data-compare="b"]',other.key);
   const pair=(await chartState()).series.filter(s=>s.id.startsWith('selection-'));
   assert.deepEqual(pair[0].data[0].value,pair[1].data[0].value);assert.notEqual(pair[0].data[0].key,pair[1].data[0].key);
   assert.deepEqual(pair.map(s=>s.data[0].label.formatter),['A','B']);
  }
  const chosen=groups[2].key;await page.selectOption('[data-compare="a"]',chosen);
  let updated=await chartState();assert.equal(updated.series.find(s=>s.id==='selection-a').data[0].key,chosen);assert((await page.locator('.comparison-a').innerText()).includes(chosen));
  await page.selectOption('[data-compare="b"]',chosen);updated=await chartState();
  assert.deepEqual(updated.series.find(s=>s.id==='selection-a').data[0].value,updated.series.find(s=>s.id==='selection-b').data[0].value);
  assert.equal(await page.locator('[data-selection-key] .selection-key').count(),2);
  await page.selectOption('[data-compare="a"]',groups[0].key);await page.selectOption('[data-compare="b"]',groups[1].key);
  const target=groups.find(d=>d.key!==groups[0].key&&d.key!==groups[1].key&&groups.filter(x=>String(x.value)===String(d.value)).length===1);
  const chart=page.locator('#pedigreeInvestigationChart');await chart.scrollIntoViewIfNeeded();const box=await chart.boundingBox();
  const pixel=await page.evaluate(value=>window.echarts.getInstanceByDom(document.querySelector('#pedigreeInvestigationChart')).convertToPixel({seriesIndex:0},value),target.value);
  await page.mouse.click(box.x+pixel[0],box.y+pixel[1]);assert.equal(await page.locator('[data-compare="a"]').inputValue(),target.key);
  assert.equal((await chartState()).series.find(s=>s.id==='selection-a').data[0].key,target.key);
  await page.mouse.move(0,0);await page.evaluate(()=>window.echarts.getInstanceByDom(document.querySelector('#pedigreeInvestigationChart')).dispatchAction({type:'hideTip'}));
  await page.setViewportSize({width,height:1400});await page.locator('[data-compare="b"]').focus();await page.evaluate(()=>window.echarts.getInstanceByDom(document.querySelector('#pedigreeInvestigationChart')).dispatchAction({type:'hideTip'}));await page.waitForTimeout(250);await page.locator('.study-evidence').screenshot({path:`${out}/comparison-${width}-${theme}.png`});
  await page.setViewportSize({width,height:1000});await page.goto(base+'?view=racecourse');await page.locator('#racecourseContent[data-loaded]').waitFor();await page.selectOption('#themeMode',theme);
  await page.waitForFunction(()=>window.echarts.getInstanceByDom(document.querySelector('#racecourseJapanMap')).getOption().series[0].data.length>0);
  const courseState=()=>page.evaluate(()=>window.echarts.getInstanceByDom(document.querySelector('#racecourseJapanMap')).getOption());
  let map=await courseState();assert(map.series[0].data.every(d=>d.symbol==='circle'));
  const singles=map.series[0].data.filter(d=>d.kind==='course').sort((a,b)=>a.wins-b.wins);
  assert(singles.every((d,i)=>!i||d.symbolSize>=singles[i-1].symbolSize));
  const cluster=map.series[0].data.find(d=>d.kind==='cluster');
  if(cluster){
   assert.equal(cluster.wins,null);assert.equal(cluster.courseCount,cluster.members.length);assert.equal(cluster.label.formatter,String(cluster.members.length));
   const canvas=page.locator('#racecourseJapanMap');await canvas.scrollIntoViewIfNeeded();const r=await canvas.boundingBox();
   const p=await page.evaluate(value=>window.echarts.getInstanceByDom(document.querySelector('#racecourseJapanMap')).convertToPixel({geoIndex:0},value),cluster.value);
   await page.mouse.click(r.x+p[0],r.y+p[1]);await page.locator('[data-cluster-course]').first().waitFor();assert.equal(await page.locator('[data-cluster-course]').count(),cluster.members.length);
   await page.locator('[data-cluster-course]').first().click();assert(await page.locator('[data-course-population]').isVisible());
  }
  await page.selectOption('#mapRegion','east');await page.locator('[data-course-name="東京"]').click();assert((await page.locator('.map-detail').innerText()).includes('東京'));
  await page.locator('#mapReset').click();await page.setViewportSize({width,height:1400});await page.locator('.map-stage').screenshot({path:`${out}/map-${width}-${theme}.png`});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));console.log('PASS grades, A/B and circular map',width,theme);
 }
 // Seven data cases, both list modes and profile modes, on desktop and mobile.
 for(const width of [1440,390])for(const id of [1,20,17,15,11,10,202]){
  await page.setViewportSize({width,height:1000});
  const horse=JSON.parse(fs.readFileSync(require('node:path').join(__dirname,`../data/horses/${id}.json`))).horse;
  await page.goto(base+`?q=${encodeURIComponent(horse.name)}`);await page.locator(`#horseRows [data-id="${id}"]`).waitFor({state:'attached'});
  const expected={1:'G1',20:'G2',17:'G3',15:'JpnIII',11:'J.G2',10:'OP',202:null}[id];
  for(const display of ['compact','detailed']){
    await page.locator(`button[data-display-mode="${display}"]`).click();await badges('#horseRows .grade-pill, #horseCards .grade-pill');
    const badge=page.locator(`#horseRows tr[data-horse-row="${id}"] .record-cell .grade-pill`);
    assert.equal(await badge.count(),expected?1:0);if(expected)assert.equal(await badge.innerText(),expected);
  }
  await page.goto(base+`?horse=${id}`);await page.locator('#drawer.open').waitFor();
  for(const mode of ['quick','full']){
   await page.locator(`button[data-profile="${mode}"]`).click();assert.equal(await page.locator('#drawerPanel dt').filter({hasText:'最高成就'}).count(),0);
   await badges('#drawerPanel .profile-group .grade-pill');
   if(id===1&&((width===390&&mode==='quick')||(width===1440&&mode==='full'))){await page.locator('#horsePhoto .photo-empty').waitFor();await page.screenshot({path:`${out}/profile-${mode}.png`});}
  }
 }
 assert.deepEqual(errors,[]);console.log('PASS seven grade cases and no runtime errors');await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

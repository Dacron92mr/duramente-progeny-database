const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await (process.env.TEST_BROWSER==='webkit'?webkit:chromium).launch(process.env.TEST_BROWSER==='webkit'?{}:{executablePath:process.env.CHROME_PATH});
 const page=await browser.newPage(),errors=[],out=process.env.TEST_OUTPUT_DIR||'test-results';fs.mkdirSync(out,{recursive:true});
 const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8765/';page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/show_photo.php?**',r=>r.abort());
 const snap=async name=>page.screenshot({path:path.join(out,name+'.png')});
 for(const view of ['sire','pedigree','production']){
  await page.setViewportSize({width:1440,height:900});await page.goto(base+'?view='+view);await page.locator('#'+view+'Content[data-loaded]').waitFor();
  assert.equal(await page.locator('.research-evidence').count(),0);assert.equal(await page.locator('.comparison-tool').getAttribute('open'),null);
  const buttons=page.locator(`[data-${view}-section]`);assert.equal(await buttons.count(),view==='production'?3:4);
  for(const b of await buttons.all()){assert(await b.isVisible());await b.click();await page.locator('#'+view+'Content canvas:visible, #'+view+'Content .graded-timeline-list:visible').first().waitFor();}
  await buttons.first().click();if(view==='sire')assert.match(await page.locator('.career-honour').innerText(),/2022.*两岁马种牡马冠军/);
  await page.evaluate(()=>scrollTo(0,0));await snap('hierarchy-'+view);
 }
 await page.goto(base);await page.locator('#horseRows tr').first().waitFor();
 const density=await page.locator('#horseRows tr').evaluateAll(rows=>rows.map(r=>r.getBoundingClientRect()).filter(r=>r.top>=0&&r.bottom<=Math.min(innerHeight,document.querySelector('.progeny-table-wrap').getBoundingClientRect().bottom)).map(r=>r.height));
 assert(density.length>=7);assert(density.every(h=>h>=64&&h<=76));console.log('Compact 1440×900:',density.length,'fully visible rows;',density[0],'px');await snap('compact');
 for(const width of [390,430,768,1440])for(const theme of ['light','dark']){
  await page.setViewportSize({width,height:900});await page.goto(base+'?view=racecourse');await page.locator('#racecourseContent[data-loaded]').waitFor();await page.selectOption('#themeMode',theme);
  assert.equal(await page.locator('.jurisdiction-cards article').count(),3);
  for(const scope of ['JRA','NAR','Overseas','All','JRA']){
   await page.locator(`#racecourseScope [data-scope="${scope}"]`).click();assert.equal(await page.locator('#racecourseDynamic').getAttribute('data-scope'),scope);
   if(['JRA','NAR'].includes(scope)){
    assert.equal(await page.locator('#courseMinStarts').inputValue(),'30');
    const option=await page.locator('#racecourseSurfaceChart').evaluate(el=>window.echarts.getInstanceByDom(el).getOption());
    assert.equal(option.xAxis[0].max,100);assert.equal(option.series.length,scope==='JRA'?2:1);
    assert(option.series.flatMap(s=>s.data).filter(Boolean).every(d=>d.starts>=30));
    await page.selectOption('#courseMinStarts','1');await page.selectOption('#courseMinStarts','30');
    if(scope==='NAR')assert(await page.locator('.morioka-turf').isVisible());
   }else if(scope==='Overseas'){
    assert.equal(await page.locator('.overseas-horse li').count(),32);assert.equal(await page.locator('#racecourseSurfaceChart').count(),0);
    assert(!(await page.locator('.race-map-block').isVisible()));assert.match(await page.locator('.overseas-history').innerText(),/合成跑道/);
   }
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  await page.locator('#racecourseDynamic').scrollIntoViewIfNeeded();if(width===390||width===1440)await snap(`course-${width}-${theme}`);
  console.log('PASS jurisdiction switching',width,theme);
 }
 for(const width of [390,1440])for(const id of [14,17,591,677,689]){
  await page.setViewportSize({width,height:900});await page.goto(base+'?horse='+id+'&profile=full');await page.locator('.profile-columns').waitFor();
  assert(await page.locator('.profile-columns .post-racing').isVisible());
  await page.locator('.profile-sections a[href="#profile-racing"]').click();await page.waitForTimeout(250);
  const positions=await page.evaluate(()=>({header:document.querySelector('#drawerHeader').getBoundingClientRect().bottom,section:document.querySelector('#profile-racing').getBoundingClientRect().top}));
  assert(positions.section>=positions.header-2,JSON.stringify(positions));assert(await page.locator('#drawerCompactName').isVisible());
  if(id===689)await snap('career-'+width);
  await page.locator('[data-profile="quick"]').click();assert(await page.locator('.profile-quick .post-racing').isVisible());
 }
 await page.goto(base+'?horse=689&profile=full');await page.locator('.profile-columns').waitFor();assert.match(await page.locator('#profile-identity').innerText(),/ルージュスティリア/);
 await page.goto(base+'?horse=2371&profile=full');await page.locator('.profile-columns').waitFor();await page.selectOption('[data-racing-dimension]','surface');await page.getByRole('button',{name:'查看合成跑道的4场比赛'}).click();assert.equal(await page.locator('[data-race-records] tbody tr').count(),4);assert.match(await page.locator('[data-race-records]').innerText(),/合成跑道/);
 assert.deepEqual(errors,[]);console.log('PASS post-racing, black type, sticky header and runtime');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

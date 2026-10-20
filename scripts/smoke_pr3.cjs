const{chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await(process.env.TEST_BROWSER==='webkit'?webkit:chromium).launch(process.env.TEST_BROWSER==='webkit'?{}:{executablePath:process.env.CHROME_PATH});const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8767/duramente-progeny-database/',out=process.env.TEST_OUTPUT_DIR||'/private/tmp/duramente-pr3/final';fs.mkdirSync(out,{recursive:true});await page.route('**/show_photo.php?**',r=>r.abort());
 for(const width of [390,430,768,1440])for(const theme of ['light','dark']){
  await page.setViewportSize({width,height:900});await page.goto(base+'?view=sire');await page.locator('#sireContent[data-loaded]').waitFor();await page.selectOption('#themeMode',theme);assert.equal(await page.locator('.career-honour').count(),3);assert.equal(await page.locator('#sireLeadingJuvenileYear').inputValue(),'2022');
  await page.locator('.career-honours').scrollIntoViewIfNeeded();if([390,1440].includes(width))await page.screenshot({path:`${out}/honours-${width}-${theme}.png`});
  await page.selectOption('#sireLeadingJuvenileYear','2023');assert.equal(await page.locator('#sireLeadingJuvenileYear').inputValue(),'2023');await page.selectOption('#sireLeadingJuvenileYear','2022');
  for(const id of ['jraMilestoneTimeline','narMilestoneTimeline','cumulativeMilestoneTimeline']){
   const target=page.locator('#'+id);await target.locator('[data-milestone-index]').first().click();assert.match(await target.locator('.milestone-detail').innerText(),/第100胜/);await target.locator('[data-milestone-index]').last().click();assert.equal(await target.locator('[aria-pressed="true"]').count(),1);
  }
  if(width===1440){await page.locator('#jraMilestoneTimeline').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/milestones-${theme}.png`});}
  await page.goto(base+'?view=production&production=club');await page.locator('#productionContent[data-loaded]').waitFor();assert.equal(await page.locator('#clubSankeyOwner').inputValue(),'all');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.goto(base+'?horse=8&profile=full');await page.locator('.profile-columns').waitFor();assert.match(await page.locator('#profile-racing .grade-pill').first().innerText(),/JpnI/);
  await page.goto(base+'?horse=1&profile=full');await page.locator('.notable-siblings').waitFor();assert.match(await page.locator('.notable-siblings').innerText(),/Melody Lane/);
  await page.goto(base+'?horse=40');await page.locator('.profile-quick').waitFor();assert.match(await page.locator('#detail').innerText(),/富士/);
  assert(await page.locator('#drawerPanel').evaluate(e=>e.scrollWidth<=e.clientWidth));
  console.log('PASS PR3',width,theme);
 }
 await page.setViewportSize({width:1440,height:900});await page.goto(base+'?view=pedigree');await page.locator('#pedigreeContent[data-loaded]').waitFor();const reps=page.locator('.representative-horse-item:visible');assert(await reps.count()>0);assert.equal(await reps.first().evaluate(e=>getComputedStyle(e).borderRadius),'0px');await reps.first().scrollIntoViewIfNeeded();await page.screenshot({path:out+'/representatives.png'});
 assert.deepEqual(errors,[]);console.log('PASS no runtime errors');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

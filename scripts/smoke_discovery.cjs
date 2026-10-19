const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await(process.env.TEST_BROWSER==='webkit'?webkit:chromium).launch(process.env.TEST_BROWSER==='webkit'?{}:{executablePath:process.env.CHROME_PATH});
 const page=await browser.newPage(),errors=[],base=process.env.TEST_BASE_URL||'http://127.0.0.1:8767/duramente-progeny-database/',out=process.env.TEST_OUTPUT_DIR||'/private/tmp/duramente-discovery';fs.mkdirSync(out,{recursive:true});
 page.on('pageerror',e=>errors.push(e.message));
 for(const width of [390,430,768,1440])for(const theme of ['light','dark']){
  await page.setViewportSize({width,height:900});await page.goto(base);await page.locator('.discovery-overview').waitFor();await page.selectOption('#themeMode',theme);await page.waitForTimeout(250);
  const h=(await page.locator('.discovery-overview').boundingBox()).height;if(width===1440)assert(h>=220&&h<=300);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(width===390||width===1440)await page.screenshot({path:`${out}/home-${width}-${theme}.png`});
  await page.locator('.discovery-paths a').first().click();await page.locator('#horseRows tr').first().waitFor({state:'attached'});assert(new URL(page.url()).searchParams.get('quick')==='g1');
  await page.locator('.discovery-overview > summary').click();await page.locator('[data-display-mode="detailed"]').click();await page.locator('[data-display-mode="compact"]').click();
  if(width===1440)await page.screenshot({path:`${out}/list-${theme}.png`});
 }
 for(const view of ['sire','pedigree','production']){
  await page.goto(base+'?view='+view);await page.locator('#'+view+'Content[data-loaded]').waitFor();
  for(const button of await page.locator(`[data-${view}-section]`).all()){
   await button.click();await page.waitForTimeout(300);
   const sections=page.locator('.further-exploration:visible');
   for(const d of await sections.all()){
    assert.equal(await d.getAttribute('open'),null);await d.locator('summary').click();await page.waitForTimeout(300);
    const sizes=await d.locator('.chart-canvas').evaluateAll(es=>es.map(e=>({id:e.id,width:e.clientWidth,canvas:!!e.querySelector('canvas')})));
    assert(sizes.every(s=>s.width>100&&s.canvas),JSON.stringify(sizes));await d.locator('summary').click();
   }
  }
 }
 for(const width of [390,1440])for(const theme of ['light','dark']){
  await page.setViewportSize({width,height:900});await page.goto(base+'?view=sire&sire=crop');await page.locator('#sireContent[data-loaded]').waitFor();await page.selectOption('#themeMode',theme);await page.waitForTimeout(300);
  assert(await page.locator('#sireSameAgeChart').isVisible());assert(await page.locator('#sireCropGradedChart').isVisible());assert(!(await page.locator('#sireCropEarningsChart').isVisible()));
  await page.locator('#sireSameAgeChart').scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/crop-${width}-${theme}.png`});
 }
 assert.deepEqual(errors,[]);console.log('PASS overview, navigation, themes, density controls and every secondary chart');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

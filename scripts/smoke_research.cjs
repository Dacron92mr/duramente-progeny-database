const {chromium,webkit}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
const browser=await (process.env.TEST_BROWSER==='webkit'?webkit:chromium).launch(process.env.TEST_BROWSER==='webkit'?{}:{executablePath:process.env.CHROME_PATH});const page=await browser.newPage();const out=process.env.TEST_OUTPUT_DIR||'test-results';fs.mkdirSync(out,{recursive:true});const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8765/';const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/show_photo.php?**',r=>r.abort());
for(const width of [390,430])for(const theme of ['light','dark']){
 await page.setViewportSize({width,height:844});await page.goto(base+'?view=racecourse');await page.locator('#racecourseContent[data-loaded]').waitFor({timeout:30000});await page.selectOption('#themeMode',theme);
 await page.waitForFunction(()=>window.echarts.getInstanceByDom(document.querySelector('#racecourseJapanMap')).getOption().series[0].data.length>0);
 const initial=await page.evaluate(()=>window.echarts.getInstanceByDom(document.querySelector('#racecourseJapanMap')).getOption().geo[0].zoom);
 await page.getByRole('button',{name:'放大地图',exact:true}).click();assert((await page.evaluate(()=>window.echarts.getInstanceByDom(document.querySelector('#racecourseJapanMap')).getOption().geo[0].zoom))>initial);
 await page.locator('#mapReset').click();assert.equal(await page.locator('#mapRegion').inputValue(),'east');
 await page.selectOption('#mapRegion','all');await page.locator('[data-map-scope="JRA"]').click();assert.equal(await page.locator('[data-course-name]').count(),10);
 await page.locator('[data-map-scope="NAR"]').click();assert((await page.locator('[data-course-name]').count())>0);
 await page.locator('[data-map-scope="All"]').click();await page.selectOption('#mapRegion','east');
 const map=page.locator('#racecourseJapanMap');await map.scrollIntoViewIfNeeded();
 const beforePan=await page.evaluate(()=>window.echarts.getInstanceByDom(document.querySelector('#racecourseJapanMap')).getOption().geo[0].center);
 const panBox=await map.boundingBox();await page.mouse.move(panBox.x+40,panBox.y+50);await page.mouse.down();await page.mouse.move(panBox.x+100,panBox.y+95,{steps:6});await page.mouse.up();
 assert.notDeepEqual(await page.evaluate(()=>window.echarts.getInstanceByDom(document.querySelector('#racecourseJapanMap')).getOption().geo[0].center),beforePan);
 await page.locator('#mapReset').click();await map.scrollIntoViewIfNeeded();
 const marker=await page.evaluate(()=>{const c=window.echarts.getInstanceByDom(document.querySelector('#racecourseJapanMap'));const d=c.getOption().series[0].data.find(d=>d.members.length===1);return {name:d.members[0],pixel:c.convertToPixel({geoIndex:0},d.value)};});
 const box=await map.boundingBox();await page.mouse.click(box.x+marker.pixel[0],box.y+marker.pixel[1]);await page.locator('.map-detail [data-course-population]').waitFor();assert((await page.locator('.map-detail').innerText()).includes(marker.name));
 await page.locator('[data-course-name="東京"]').click();assert((await page.locator('.map-detail').innerText()).includes(String(JSON.parse(fs.readFileSync(path.join(__dirname,'../data/analytics/racecourses.json'))).table.find(r=>r.label==='東京').starts)));
 await page.locator('[data-course-population]').click();await page.locator('[data-map-horse]').first().waitFor();assert((await page.locator('[data-map-horse]').count())>1);
 await page.locator('[data-map-horse]').first().click();await page.locator('#drawer.open .profile-quick').waitFor();await page.keyboard.press('Escape');
 await page.locator('.map-canvas-card').evaluate(el=>el.scrollIntoView({block:'start'}));await page.screenshot({path:path.join(out,`map-${width}-${theme}.png`)});await page.locator('.map-detail').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,`map-detail-${width}-${theme}.png`)});
 await page.locator('[data-map-mode="list"]').click();assert(!(await map.isVisible()));await page.locator('[data-course-name="中山"]').click();assert((await page.locator('.map-detail').innerText()).includes('中山'));await page.locator('.map-list').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,`map-list-${width}-${theme}.png`)});
 await page.locator('[data-map-mode="map"]').click();assert(await map.isVisible());
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));console.log('PASS map',width,theme);
}
for(const kind of ['sire','pedigree','production'])for(const width of [390,1440]){
 await page.setViewportSize({width,height:900});await page.goto(base+'?view='+kind);await page.locator('#'+kind+'Content[data-loaded]').waitFor({timeout:30000});
 await page.locator('.comparison-tool > summary').click(); const work=page.locator('[data-workbench]');if(kind==='sire'){await work.locator('[data-study-age]').selectOption('5');assert(!(await work.locator('[data-compare="a"] option').evaluateAll(options=>options.map(o=>o.value))).includes('2022'));}else{await work.locator('[data-study-year]').selectOption('2019');await work.locator('[data-study-sex]').selectOption('牝');await work.locator('[data-study-min]').selectOption('1');}
 const canvas=work.locator('.study-chart');await canvas.scrollIntoViewIfNeeded();
 const datum=await canvas.evaluate(el=>{const c=window.echarts.getInstanceByDom(el),o=c.getOption(),d=o.series[0].data.at(-1),index=o.series[0].data.length-1;return {key:d.key,pixel:c.convertToPixel({seriesIndex:0},o.series[0].type==='bar'?[d.value,index]:d.value)};});
 const cb=await canvas.boundingBox();await page.mouse.click(cb.x+datum.pixel[0]-(kind==='sire'?3:0),cb.y+datum.pixel[1]);assert.equal(await work.locator('[data-compare="a"]').inputValue(),datum.key);
 await work.locator('[data-compare="a"]').selectOption({index:0});const selected=await work.locator('[data-compare="a"]').inputValue();
 for(const theme of ['light','dark']){await page.selectOption('#themeMode',theme);await work.screenshot({path:path.join(out,`study-${kind}-${width}-${theme}.png`)});}
 const link=work.locator('[data-open-population]').first();const n=Number((await link.innerText()).match(/\d+/)[0]);await link.click();await page.locator('#horseRows [data-id]').first().waitFor({state:'attached'});assert((await page.locator('#resultCount').innerText()).includes(String(n)));assert.equal(new URL(page.url()).searchParams.get(kind==='sire'?'year':kind==='pedigree'?'broodmare_sire':'breeder'),selected);console.log('PASS research',kind,width);
}
for(const id of [1,4]){
 await page.goto(base+`?horse=${id}&profile=full`);await page.locator('.profile-columns').waitFor();const total=JSON.parse(fs.readFileSync(path.join(__dirname,`../data/horses/${id}.json`))).races.length;assert.equal(await page.locator('[data-race-records] tbody tr').count(),total);
 await page.selectOption('[data-racing-dimension]','surface');await page.locator('[data-race-group]').first().click();assert((await page.locator('[data-race-records] tbody tr').count())<=total);await page.locator('.race-reset').click();assert.equal(await page.locator('[data-race-records] tbody tr').count(),total);
 for(const key of ['broodmare_sire','female_family','breeder']){if(!await page.locator('#drawer.open').count()){await page.goto(base+`?horse=${id}&profile=full`);await page.locator('.profile-columns').waitFor();}const b=page.locator(`.profile-columns [data-profile-filter="${key}"]`).first();const v=await b.getAttribute('data-value');await b.click();await page.locator('#horseRows [data-id]').first().waitFor({state:'attached'});assert.equal(new URL(page.url()).searchParams.get(key),v);assert.equal(await page.locator('#drawer').getAttribute('aria-hidden'),'true');}
 console.log('PASS profile source and navigation',id);
}
await page.goto(base+'?horse=47&profile=full');await page.locator('.profile-columns').waitFor();await page.locator('summary').filter({hasText:'原有同母重赏资料'}).click();await page.locator('[data-related-horse="9"]').last().click();await page.waitForFunction(()=>document.querySelector('#drawerTitle')?.textContent==='ドゥラエレーデ');console.log('PASS verified sibling profile navigation');
assert.deepEqual(errors,[]);console.log('PASS no runtime errors');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});

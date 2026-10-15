const {webkit,devices}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await webkit.launch();
 const context=await browser.newContext({...devices['iPhone 13']});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8765/';
 await page.route('**/show_photo.php?**',r=>r.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#888"/></svg>'}));
 for(const width of [390,430])for(const theme of ['light','dark']){
  await page.setViewportSize({width,height:844});await page.goto(base+'?horse=1');
  await page.waitForFunction(()=>document.querySelector('#horsePhoto img')?.naturalWidth>0);
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  assert(await page.evaluate(()=>matchMedia('(pointer: coarse)').matches));
  const first=await page.locator('#horsePhoto img').getAttribute('src');
  await page.getByRole('button',{name:'换一张'}).tap();
  const next=await page.locator('#horsePhoto img').getAttribute('src');assert.notEqual(first,next);
  await page.getByRole('button',{name:'完整资料',exact:true}).tap();
  assert.equal(await page.locator('#profile-identity #horsePhoto img').getAttribute('src'),next);
  assert(await page.locator('#drawerPanel').evaluate(e=>e.scrollWidth<=e.clientWidth));
  assert.equal(await page.locator('#horsePhoto img').evaluate(e=>getComputedStyle(e).objectFit),'contain');
  await page.getByRole('button',{name:'快速查看',exact:true}).tap();assert.equal(await page.locator('#horsePhoto img').getAttribute('src'),next);
  await page.goto(base+'?view=racecourse');await page.locator('#racecourseContent[data-loaded]').waitFor();
  await page.selectOption('#themeMode',theme);
  await page.waitForFunction(()=>window.echarts?.getInstanceByDom(document.querySelector('#racecourseJapanMap'))?.getOption().series[0].data.length>0);
  const zoom=()=>page.evaluate(()=>window.echarts.getInstanceByDom(document.querySelector('#racecourseJapanMap')).getOption().geo[0].zoom);
  const before=await zoom();await page.getByRole('button',{name:'放大地图',exact:true}).tap();assert(await zoom()>before);
  await page.locator('[data-course-name="東京"]').tap();await page.locator('[data-course-population]').tap();
  await page.locator('[data-map-horse]').first().tap();await page.locator('#drawer.open').waitFor();
  assert(await page.locator('#drawerPanel').evaluate(e=>e.scrollWidth<=e.clientWidth));
  console.log('PASS touch WebKit',width,theme,'photo, Quick/Full, map zoom and horse navigation');
 }
 assert.deepEqual(errors,[]);await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

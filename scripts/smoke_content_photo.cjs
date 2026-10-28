const { chromium, webkit }=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const out=process.env.TEST_OUTPUT_DIR||'test-results';fs.mkdirSync(out,{recursive:true});
 const browser=await (process.env.TEST_BROWSER==='webkit'?webkit:chromium).launch(process.env.TEST_BROWSER==='webkit'?{}:{executablePath:process.env.CHROME_PATH});
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base=process.env.TEST_BASE_URL||'http://127.0.0.1:8765/';
 // Try real, existing photo URLs for screenshots. Do not save or copy source images.
 await page.setViewportSize({width:1440,height:1000});await page.goto(base+'?horse=1');
 await page.locator('#horsePhoto img, #horsePhoto .photo-empty').waitFor();
 await page.waitForFunction(()=>{const p=document.querySelector('#horsePhoto');return p?.querySelector('.photo-empty')||p?.querySelector('img')?.naturalWidth>0;},{},{timeout:20000});
 const realLoaded=await page.locator('#horsePhoto img').evaluateAll(imgs=>imgs.some(i=>i.naturalWidth>0));
 for(const width of [1440,390])for(const theme of ['light','dark'])for(const mode of ['quick','full']){
  await page.setViewportSize({width,height:width===390?844:1000});
  await page.evaluate(t=>document.documentElement.dataset.theme=t,theme);
  await page.locator(`button[data-profile="${mode}"]`).click();
  await page.locator('#drawerPanel').evaluate(el=>el.scrollTop=0);
  assert(await page.locator('#horsePhoto').isVisible());
  const box=await page.locator('#horsePhoto').boundingBox();assert(box.y<500,`photo too low: ${box.y}`);
  assert(await page.locator('#drawerPanel').evaluate(el=>el.scrollWidth<=el.clientWidth));
  if(mode==='full')assert.equal(await page.locator('#profile-identity #horsePhoto').count(),1);
  await page.screenshot({path:`${out}/photo-${mode}-${width}-${theme}.png`});
 }
 console.log('Real external photo loaded:',realLoaded);
 // Controlled image responses test interaction independently from external restrictions.
 let requests=0;await page.route('**/show_photo.php?**',route=>{requests++;return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300"><rect width="600" height="300" fill="#c3cdd2"/><text x="100" y="150">Photo interaction test fixture</text></svg>'});});
 await page.goto(base+'?horse=1');await page.waitForFunction(()=>document.querySelector('#horsePhoto img')?.naturalWidth>0);
 const urls=[];for(let i=0;i<4;i++){urls.push(await page.locator('#horsePhoto img').getAttribute('src'));await page.getByRole('button',{name:'换一张'}).click();await page.waitForFunction(()=>document.querySelector('#horsePhoto img')?.complete);}
 assert(urls.every((v,i)=>i===0||v!==urls[i-1]));
 const before=await page.locator('#horsePhoto img').getAttribute('src'),count=requests;
 await page.locator('button[data-profile="full"]').click();await page.locator('button[data-profile="quick"]').click();
 assert.equal(await page.locator('#horsePhoto img').getAttribute('src'),before);assert.equal(requests,count);
 const link=page.getByRole('link',{name:'在 netkeiba 查看全部照片'});assert.equal(await link.getAttribute('href'),'https://db.netkeiba.com/photo/list.html?id=2018103559');
 // Follow the actual link in a new tab; tolerate provider restrictions but record status.
 const popupPromise=page.waitForEvent('popup');await link.click();const popup=await popupPromise;
 await popup.waitForLoadState('domcontentloaded').catch(()=>{});assert(popup.url().startsWith('https://db.netkeiba.com/photo/list.html?id=2018103559'));console.log('Photo source popup:',popup.url());await popup.close();
 await page.unroute('**/show_photo.php?**');await page.route('**/show_photo.php?**',r=>r.abort());
 await page.goto(base+'?horse=1');await page.locator('#horsePhoto .photo-empty').waitFor();assert.match(await page.locator('#horsePhoto').innerText(),/暂时无法加载/);assert(await page.locator('#horsePhoto a').isVisible());await page.screenshot({path:`${out}/photo-error.png`});
 await page.route('**/horse_photos.json*',r=>r.fulfill({json:{horses:{}}}));await page.goto(base+'?horse=1');await page.locator('#horsePhoto .photo-empty').waitFor();assert.match(await page.locator('#horsePhoto').innerText(),/暂无/);assert((await page.locator('#horsePhoto').boundingBox()).height<100);
 for(const view of ['sire','pedigree','production']){
  await page.setViewportSize({width:1440,height:1000});await page.goto(base+`?view=${view}`);await page.locator('.comparison-tool > summary').click();await page.locator('[data-study-result]').waitFor();
  assert(!/\.json|战绩未解析|A − B/.test(await page.locator('.research-workbench').innerText()));
  if(view!=='sire'){await page.locator('[data-study-metric]').selectOption('graded');assert.match(await page.locator('[data-study-title]').innerText(),/重赏马比例/);await page.locator('[data-study-metric]').selectOption('winners');}
  await page.screenshot({path:`${out}/comparison-${view}.png`});
  if(view==='pedigree'){
   await page.locator('[data-pedigree-section="dosage"]').click();await page.locator('#pedigree-dosage').evaluate(el=>el.scrollIntoView({block:'start'}));
   await page.locator('#pedigree-dosage [data-research-topic="dosage"] summary').click();
   assert(await page.locator('#pedigree-dosage a[href="https://www.brisnet.com/cgi-bin/static.cgi?page=expdosage"]').isVisible());assert.match(await page.locator('#pedigree-dosage').innerText(),/Brilliant.*Professional/s);await page.screenshot({path:`${out}/dosage.png`});
  }
 }
 await page.route('**/horses.json*',async route=>{const response=await route.fetch();const horses=await response.json();horses[0].career_summary=null;await route.fulfill({json:horses});});
 await page.goto(base+'?view=pedigree');await page.locator('.comparison-tool > summary').click();await page.locator('[data-study-min]').selectOption('1');
 assert(await page.locator('[data-study-missing]').isVisible());assert.match(await page.locator('[data-study-title]').innerText(),/已确认胜马比例/);assert.match(await page.locator('[data-study-missing]').innerText(),/1 匹/);
 await page.locator('[data-study-metric]').selectOption('graded');assert(!await page.locator('[data-study-missing]').isVisible());
 assert.deepEqual(errors,[]);console.log('PASS photo position, themes, responsive layout, 4 switches, mode state, external link, error, empty catalogue, dynamic copy and verified dosage reference');
 fs.writeFileSync(`${out}/photo-test-result.json`,JSON.stringify({realLoaded,success:true,switches:4,modeReloads:0,errors},null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

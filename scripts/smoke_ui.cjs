/* Run against a local static server; never mutates research data. */
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const horses = JSON.parse(fs.readFileSync(path.join(root, 'data/horses.json')));
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:8765/';
const output = process.env.TEST_OUTPUT_DIR || path.join(root, 'test-results');
fs.mkdirSync(output, { recursive: true });
const browserErrors = [];
const failures = [];
const report = [];
let browser;
async function check(name, run) {
  try { await run(); report.push({ name, passed: true }); console.log('PASS', name); }
  catch (error) { failures.push({ name, error: error.message }); console.error('FAIL', name, error.message); }
}
(async () => {
  browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('pageerror', error => browserErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !message.text().includes('Failed to load resource')) browserErrors.push(message.text()); });
  const requests=[];page.on('request',request=>requests.push(request.url()));
  async function list(query='') {
    await page.goto(base + query);
    await page.locator('#horseRows [data-id]').first().waitFor({ state: 'attached' });
  }
  async function setTheme(theme) {
    await page.selectOption('#themeMode', theme);
    await page.waitForFunction(theme => {
      const body = getComputedStyle(document.body);
      return document.documentElement.dataset.theme === theme && body.backgroundColor === (theme === 'dark' ? 'rgb(32, 32, 36)' : 'rgb(246, 246, 248)') && body.color === (theme === 'dark' ? 'rgb(238, 238, 241)' : 'rgb(36, 36, 39)');
    }, theme);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  }
  const ids=()=>page.locator('#horseRows [data-id]').evaluateAll(rows=>rows.map(row=>row.dataset.id));
  const waitIds=expected=>page.waitForFunction(ids=>JSON.stringify([...document.querySelectorAll('#horseRows [data-id]')].map(row=>row.dataset.id))===JSON.stringify(ids),expected);
  await check('initial count and deferred chart library', async()=>{
    await list();assert((await page.locator('#resultCount').innerText()).includes(String(horses.length)));assert.equal((await ids()).length,50);assert(!requests.some(url=>url.includes('echarts')));
    assert.equal(requests.filter(url=>url.includes('/data/horses.json')).length,1);
  });
  await check('search Japanese, English, Chinese and aliases',async()=>{
    for(const query of ['タイトルホルダー','Titleholder','領銜','领衔']){
      await page.fill('#mobileSearch',query);await waitIds([String(horses.find(h=>h.name_en==='Titleholder').id)]);
    }
    await page.click('#clearSearch');await page.waitForFunction(()=>document.querySelectorAll('#horseRows [data-id]').length===50);
  });
  await check('combined filters, chips and quick filters',async()=>{
    await page.click('[data-quick="graded"]');await page.click('#filterOpen');await page.selectOption('#sex','牝');await page.selectOption('#year','2019');await page.keyboard.press('Escape');
    const expected=horses.filter(h=>['G1','G2','G3'].includes(h.achievement_class)&&h.sex==='牝'&&h.birth_year===2019).sort((a,b)=>b.earnings_netkeiba-a.earnings_netkeiba).map(h=>String(h.id));await waitIds(expected);
    await page.click('[data-remove-filter="year"]');assert(!new URL(page.url()).searchParams.has('year'));
    await page.click('[data-quick=""]');await page.waitForFunction(()=>document.querySelectorAll('#horseRows [data-id]').length===50);
  });
  await check('display preference, page sizes, sorting and URL restoration',async()=>{
    await page.click('[data-display-mode="detailed"]');await page.reload();await page.locator('#horseRows [data-id]').first().waitFor();assert.equal(await page.locator('#progenyView').getAttribute('data-display'),'detailed');
    await page.click('[data-display-mode="compact"]');
    for(const n of [20,100,50]) {await page.selectOption('#pageSize',String(n));await page.waitForFunction(n=>document.querySelectorAll('#horseRows [data-id]').length===n,n);}
    await page.selectOption('#pageSize','20');await page.click('#next');await page.waitForFunction(()=>new URL(location.href).searchParams.get('offset')==='20');const before=await ids();await page.reload();await waitIds(before);assert.equal(await page.inputValue('#pageSize'),'20');
    await page.selectOption('#sort','name');const sorted=horses.toSorted((a,b)=>a.name.localeCompare(b.name,'ja')).slice(0,20).map(h=>String(h.id));await waitIds(sorted);
  });
  await check('detail, adjacent navigation, focus trap and history',async()=>{
    await list();const opener=page.locator('#horseRows [data-id]').first();await opener.click();await page.waitForFunction(()=>document.querySelector('#drawerTitle')?.textContent==='タイトルホルダー');
    await page.keyboard.press('Shift+Tab');assert(await page.evaluate(()=>document.querySelector('#drawerPanel').contains(document.activeElement)));
    await page.click('#nextHorse');await page.waitForFunction(()=>document.querySelector('#drawerTitle')?.textContent==='スターズオンアース');
    await page.click('#previousHorse');await page.waitForFunction(()=>document.querySelector('#drawerTitle')?.textContent==='タイトルホルダー');
    assert(await page.locator('.race-table').count());assert(await page.locator('.stud-section').count());assert(await page.locator('.source-section a').count());
    await page.keyboard.press('Escape');assert.equal(await page.locator('#drawer').getAttribute('aria-hidden'),'true');assert.equal(await opener.evaluate(el=>el===document.activeElement),true);
    await page.goBack();await page.waitForFunction(()=>document.querySelector('#drawer').classList.contains('open'));await page.goForward();await page.waitForFunction(()=>!document.querySelector('#drawer').classList.contains('open'));
  });
  await check('CSV exports all filtered rows, including beyond current page',async()=>{
    await list('?sex=牝&limit=20');const downloadPromise=page.waitForEvent('download');await page.click('#exportCsv');const download=await downloadPromise;const file=await download.path();const csv=fs.readFileSync(file,'utf8');assert(csv.startsWith('\uFEFF'));assert.equal(csv.trimEnd().split('\r\n').length,1+horses.filter(h=>h.sex==='牝').length);
  });
  await check('empty results and recovery',async()=>{
    await page.fill('#mobileSearch','NONEXISTENT-HORSE-XYZ');await page.locator('.progeny-table .empty-state').waitFor();await page.locator('.progeny-table [data-clear-filters]').click();await page.waitForFunction(()=>document.querySelectorAll('#horseRows [data-id]').length===20);
  });
  await check('detailed table scroll keeps name and header fixed; filter inspector',async()=>{
    await list();await page.click('[data-display-mode="detailed"]');
    const wrap=page.locator('.progeny-table-wrap');const first=page.locator('#horseRows .horse-column').first();
    const before=await first.boundingBox();await wrap.evaluate(el=>{el.scrollLeft=500;el.scrollTop=200;});
    const after=await first.boundingBox();assert(Math.abs(before.x-after.x)<2);
    assert(await page.locator('.sticky-horse-head').evaluate(el=>getComputedStyle(el).position==='sticky'));
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:path.join(output,'detailed-1440-light.png')});
    await page.click('#filterOpen');await page.screenshot({path:path.join(output,'filters-1440-light.png')});await page.keyboard.press('Escape');
    await page.click('[data-display-mode="compact"]');
  });
  await check('blocked external photo shows source fallback',async()=>{
    await page.route('https://db.netkeiba.com/show_photo.php?**',route=>route.abort());
    await page.locator('#horseRows [data-id]').first().click();await page.locator('#horsePhoto .photo-empty').waitFor({timeout:15000});
    assert((await page.locator('#horsePhoto a').getAttribute('href')).startsWith('https://db.netkeiba.com/photo/'));
    await page.screenshot({path:path.join(output,'detail-1440-light.png')});await page.keyboard.press('Escape');
    await page.unroute('https://db.netkeiba.com/show_photo.php?**');
  });
  for(const width of [1440,1280,768,390])for(const theme of ['light','dark'])await check(`layout ${width} ${theme}`,async()=>{
    await page.setViewportSize({width,height:900});await list();await setTheme(theme);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    if(width>=768)assert(await page.locator('.progeny-table-wrap').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
    await page.screenshot({path:path.join(output,`after-${width}-${theme}.png`)});
    if(width===390){
      await page.click('#sidebarToggle');await page.locator('.main-nav').waitFor({state:'visible',timeout:3000});assert(await page.locator('.main-nav').isVisible());await page.click('[data-view="progeny"]');
      await page.click('#filterOpen');await page.keyboard.press('Shift+Tab');assert(await page.evaluate(()=>document.querySelector('#filtersPanel').contains(document.activeElement)));await page.keyboard.press('Escape');
      await page.locator('#horseCards [data-id]').first().click();await page.waitForFunction(()=>document.querySelector('#drawerTitle')?.textContent==='タイトルホルダー');assert(await page.locator('#drawerPanel').evaluate(el=>el.scrollWidth<=el.clientWidth));await page.screenshot({path:path.join(output,`detail-${width}-${theme}.png`)});await page.keyboard.press('Escape');
    }
  });
  for(const width of [1440,390])for(const view of ['sire','pedigree','production','racecourse'])await check(`analysis ${view} at ${width}`,async()=>{
    await page.setViewportSize({width,height:900});await page.goto(`${base}?view=${view}`);await page.locator(`#${view}Content[data-loaded]`).waitFor({timeout:30000});
    const attr={sire:'sire',pedigree:'pedigree',production:'production'}[view];
    const buttons=attr?await page.locator(`[data-${attr}-section]`).all():[];
    for(const button of buttons){await button.click();await page.locator(`#${view}Content canvas:visible`).first().waitFor({timeout:10000});}
    if(buttons.length){
      await buttons[0].focus();await page.keyboard.press('ArrowRight');assert.equal(await buttons[1].getAttribute('aria-selected'),'true');
      await page.keyboard.press('End');assert.equal(await buttons.at(-1).getAttribute('aria-selected'),'true');
      await page.keyboard.press('Home');assert.equal(await buttons[0].getAttribute('aria-selected'),'true');
      await buttons.at(-1).click();
    }
    for(const theme of ['light','dark']){
      await setTheme(theme);await page.locator(`#${view}Content[data-loaded]`).waitFor();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert((await page.locator(`#${view}Content canvas:visible`).count())>0);
      await page.screenshot({path:path.join(output,`${view}-${width}-${theme}.png`)});
      const zoom=page.locator(`#${view}Content .chart-actions button:visible`).first();
      if(await zoom.count()){
        await zoom.click();await page.locator('.chart-dialog[open] canvas').first().waitFor();
        assert(await page.locator('.chart-dialog').evaluate(el=>el.getBoundingClientRect().width<=innerWidth));
        await page.keyboard.press('Escape');assert(await zoom.evaluate(el=>el===document.activeElement));
      }
    }
  });
  await check('no JavaScript runtime errors',async()=>assert.deepEqual(browserErrors,[]));
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({base,passed:report.length,failures,browserErrors},null,2));
  console.log(`${report.length} passed; ${failures.length} failed`);
  if(failures.length)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>browser?.close());

const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
  const page = await browser.newPage();
  const output = process.env.TEST_OUTPUT_DIR || 'test-results'; fs.mkdirSync(output, {recursive:true});
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.route('**/show_photo.php?**', route => route.abort());
  for (const width of [1440,390]) for (const theme of ['light','dark']) for (const id of [1,4]) {
    await page.setViewportSize({width,height:width===390?844:1000});
    await page.goto(`${process.env.TEST_BASE_URL || 'http://127.0.0.1:8765/'}?horse=${id}&profile=full`);
    await page.locator('.profile-columns').waitFor();
    await page.evaluate(theme => {document.documentElement.dataset.theme=theme;},theme);
    const columns = await page.locator('.profile-columns').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);
    assert.equal(columns,width===390?1:id===1?3:2);
    assert(await page.locator('#drawerPanel').evaluate(el=>el.scrollWidth<=el.clientWidth));
    assert.equal(await page.locator('[data-profile="full"][aria-pressed="true"]').count(),1);
    const grade = page.locator('.race-table .grade-g1').first(); assert(await grade.count());
    await page.screenshot({path:path.join(output,`profile-${id}-${width}-${theme}.png`)});
    await page.getByRole('link',{name:'竞赛生涯',exact:true}).click();
    assert.equal(await page.evaluate(()=>document.activeElement.id),'profile-racing');
    await page.screenshot({path:path.join(output,`racing-${id}-${width}-${theme}.png`)});
    await page.getByRole('button',{name:'快速查看',exact:true}).click();
    assert(!new URL(page.url()).searchParams.has('profile'));
    await page.getByRole('button',{name:'完整资料',exact:true}).click();
    await page.reload(); await page.locator('.profile-columns').waitFor();
    assert.equal(await page.locator('#drawerPanel').getAttribute('data-profile'),'full');
    await page.keyboard.press('Escape'); assert(!new URL(page.url()).searchParams.has('horse'));
    console.log('PASS profile',id,width,theme);
  }
  assert.deepEqual(errors,[]); await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});

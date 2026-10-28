const { chromium, webkit } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

(async () => {
  const browserType = process.env.TEST_BROWSER === 'webkit' ? webkit : chromium;
  const browser = await browserType.launch(
    process.env.TEST_BROWSER === 'webkit' ? {} : { executablePath: process.env.CHROME_PATH },
  );
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:8769/';
  const output = process.env.TEST_OUTPUT_DIR || '/private/tmp/duramente-citations';
  fs.mkdirSync(output, { recursive: true });

  const cases = [
    { view: 'pedigree', topics: ['bms'] },
    { view: 'pedigree', tab: '[data-pedigree-section="family"]', topics: ['family'] },
    { view: 'pedigree', tab: '[data-pedigree-section="inbreeding"]', topics: ['cross', 'nicking'] },
    { view: 'pedigree', tab: '[data-pedigree-section="dosage"]', topics: ['dosage'] },
    { view: 'production', topics: ['farm'] },
    {
      view: 'production',
      tab: '[data-production-section="broodmare"]',
      topics: ['birthMonth', 'maternalAge', 'parity', 'reproduction'],
    },
    { view: 'sire', tab: '[data-sire-section="crop"]', topics: ['cohort', 'awd'] },
    { view: 'sire', tab: '[data-sire-section="annual"]', topics: ['indices'] },
    { view: 'racecourse', topics: ['racecourse'] },
  ];

  for (const width of [390, 430, 768, 1440]) {
    for (const theme of ['light', 'dark']) {
      await page.setViewportSize({ width, height: 900 });
      for (const testCase of cases) {
        await page.goto(`${base}?view=${testCase.view}`);
        await page.locator('[data-research-topic]').first().waitFor({ state: 'attached' });
        await page.selectOption('#themeMode', theme);
        if (testCase.tab) await page.locator(testCase.tab).click();

        for (const topic of testCase.topics) {
          const section = page.locator(`[data-research-topic="${topic}"]:visible`).first();
          await section.waitFor();
          const disclosure = section.locator('.research-disclosure');
          assert.equal(await disclosure.getAttribute('open'), null, `${topic} should start closed`);
          assert.match(await section.locator(':scope > p').first().innerText(), /\S/, `${topic} caveat`);
          await disclosure.locator(':scope > summary').click();
          assert(await disclosure.locator('.reference-list').isVisible(), `${topic} references should open`);
          const linkCount = await disclosure.locator('.reference-list > li').count();
          const mobile = width < 600;
          const detailDisclosure = section.locator('.research-details');
          if (mobile) {
            assert.equal(await disclosure.locator('.reference-desktop:visible').count(), 0, `${topic} desktop rows`);
            assert.equal(await disclosure.locator('.reference-summary:visible').count(), 0, `${topic} summaries`);
            assert.equal(await disclosure.locator('.reference-limit:visible').count(), 0, `${topic} limits`);
            assert.equal(await disclosure.locator('.reference-mobile-link:visible').count(), linkCount, `${topic} mobile rows`);
            assert.equal(await detailDisclosure.getAttribute('open'), null);
            assert(await detailDisclosure.locator('summary').isVisible(), `${topic} deeper reading entry`);
            for (const row of await disclosure.locator('.reference-mobile-link:visible').all()) {
              const box = await row.boundingBox();
              assert(box.height >= 48 && box.height <= 64, `${topic} compact row height ${box.height}`);
              assert.match(await row.getAttribute('aria-label'), /在新窗口打开/);
            }
          } else {
            assert.equal(await disclosure.locator('.reference-mobile-link:visible').count(), 0, `${topic} compact rows`);
            assert.equal(await disclosure.locator('.reference-desktop:visible').count(), linkCount, `${topic} desktop rows`);
            assert.equal(await disclosure.locator('.reference-summary:visible').count(), linkCount, `${topic} summaries`);
            assert.equal(await disclosure.locator('.reference-limit:visible').count(), linkCount, `${topic} limits`);
            assert(!(await detailDisclosure.isVisible()), `${topic} secondary reading link`);
          }
          for (const link of await disclosure.locator('a.research-citation:visible').all()) {
            assert.match(await link.getAttribute('href'), /^https:\/\//);
            assert.equal(await link.getAttribute('target'), '_blank');
            assert.match(await link.getAttribute('rel'), /noopener/);
            assert.equal(await link.getAttribute('data-link-purpose'), 'research');
            assert.match(await link.innerText(), /↗/);
            assert.equal((await link.innerText()).match(/↗/g)?.length, 1, `${topic} single external arrow`);
          }
          if (mobile) {
            await detailDisclosure.locator(':scope > summary').click();
            assert(await detailDisclosure.getAttribute('open') !== null);
            assert.equal(await detailDisclosure.locator('.reference-detail-item:visible').count(), linkCount);
            assert.match(await detailDisclosure.locator('.reference-detail-item').first().innerText(), /研究发现[\s\S]*研究局限/);
            await detailDisclosure.locator(':scope > summary').click();
          }
          await section.scrollIntoViewIfNeeded();
          assert(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
            `${testCase.view}/${topic} overflow at ${width}px`,
          );
          if ((width === 390 || width === 1440) && ['maternalAge', 'dosage', 'indices'].includes(topic)) {
            await page.screenshot({ path: path.join(output, `${topic}-${width}-${theme}.png`) });
          }
          await disclosure.locator(':scope > summary').click();
          assert.equal(await disclosure.getAttribute('open'), null, `${topic} references should close`);
        }
      }
      console.log('PASS references', width, theme);
    }
  }

  // Exercise real internal actions while ignoring controls in inactive panels.
  await page.goto(`${base}?view=pedigree&pedigree=family`);
  await page.locator('.comparison-tool > summary').click();
  const drill = page.locator('[data-open-population]:visible').first();
  await drill.waitFor();
  assert.equal(await drill.getAttribute('data-link-purpose'), 'drill');
  assert.doesNotMatch(await drill.innerText(), /↗/);
  assert.match(await drill.innerText(), /→/);
  await drill.click();
  await page.locator('#horseRows').waitFor();
  assert.match(page.url(), /broodmare_sire|bms_line|female_family/);

  // Representative-card and update-history links are dynamic internal actions.
  await page.goto(`${base}?view=pedigree`);
  const representative = page.locator('.representative-horse-item:visible').first();
  await representative.waitFor();
  assert.equal(await representative.getAttribute('data-link-purpose'), 'drill');
  assert.match(await representative.innerText(), /→/);
  assert.doesNotMatch(await representative.innerText(), /↗/);

  await page.goto(`${base}?view=sire`);
  const chartAction = page.locator('.chart-actions button:visible').first();
  await chartAction.waitFor();
  assert.equal(await chartAction.getAttribute('data-link-purpose'), 'drill');
  assert.match(await chartAction.innerText(), /→/);
  assert.doesNotMatch(await chartAction.innerText(), /↗/);

  await page.goto(`${base}updates.html`);
  const updateHorse = page.locator('.update-horse:visible').first();
  const updateSource = page.locator('.update-source:visible').first();
  await updateHorse.waitFor();
  await updateSource.waitFor();
  assert.equal(await updateHorse.getAttribute('data-link-purpose'), 'drill');
  assert.match(await updateHorse.innerText(), /→/);
  assert.doesNotMatch(await updateHorse.innerText(), /↗/);
  assert.equal(await updateSource.getAttribute('data-link-purpose'), 'source');
  assert.match(await updateSource.innerText(), /↗/);
  assert.equal(await updateSource.evaluate((link) => getComputedStyle(link).textDecorationStyle), 'dotted');

  // Drawer content is inserted after installation; the observer must classify it.
  await page.goto(`${base}?horse=1&profile=full`);
  await page.locator('.profile-columns').waitFor();
  const profileDrill = page.locator('.profile-explore:visible').first();
  await profileDrill.waitFor();
  assert.equal(await profileDrill.getAttribute('data-link-purpose'), 'drill');
  assert.match(await profileDrill.innerText(), /→/);
  const profileSources = page.locator('.source-section a:visible');
  for (const link of await profileSources.all()) {
    assert.equal(await link.getAttribute('data-link-purpose'), 'source');
    assert.match(await link.getAttribute('rel'), /noopener/);
  }

  assert.deepEqual(errors, []);
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

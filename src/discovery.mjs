import { matchesQuickFilter } from './filtering.mjs';

export function discoveryStats(horses) {
  const years = [...new Set(horses.map(h => Number(h.birth_year)).filter(year => Number.isInteger(year) && year > 0))].sort();
  return { total: horses.length, years, graded: horses.filter(h => matchesQuickFilter(h, 'graded')).length };
}

export function mountDiscovery(host, horses, fetchData) {
  if (!host || host.childElementCount) return;
  const { total, years, graded } = discoveryStats(horses);
  host.innerHTML = `<details class="discovery-overview" open>
    <summary><span>大鸣大放产驹数据库</span><span class="overview-toggle"><span class="when-open">收起总览</span><span class="when-closed">展开总览</span> ↕</span></summary>
    <div class="discovery-body">
      <div class="discovery-intro"><div><p class="discovery-name" lang="ja">ドゥラメンテ</p><h1>从一匹马，探索五个世代。</h1><p>血统、竞赛成绩与繁殖生涯，沿着你感兴趣的线索继续阅读。</p></div>
      <dl class="discovery-stats"><div><dt>收录产驹</dt><dd>${total}<small> 匹</small></dd></div><div><dt>出生世代</dt><dd>${years.length}<small> 代</small></dd><span>${years[0] ?? '—'}–${years.at(-1) ?? '—'}</span></div><div><dt>重赏冠军</dt><dd><a data-link-purpose="drill" href="?quick=graded">${graded}<small> 匹 →</small></a></dd></div></dl></div>
      <nav class="discovery-paths" aria-label="探索数据库"><a href="?quick=g1"><strong>认识代表产驹 →</strong><span>从 G1 冠军开始</span></a><a href="?view=sire&sire=crop"><strong>比较五个世代 →</strong><span>同龄胜场与重赏表现</span></a><a href="?view=pedigree"><strong>探索血统与配合 →</strong><span>母父、牝系与近交</span></a></nav>
    </div>
  </details>`;
}

// Move existing cards with their controls and listeners; never replace their data.
const SECONDARY_GROUPS = [
  ['年度表现：出赛、重赏与奖金', ['annualPerformance-starts', 'annualPerformance-graded', 'annualPerformance-earnings']],
  ['世代成绩：胜马、奖金与 AEI', ['sireCropWinnersChart', 'sireCropEarningsChart', 'sireCropIndexChart', 'sireConcentrationChart']],
  ['距离适性与成长', ['sireDistanceDistributionChart', 'sireAchievementStepChart', 'sireAwdDumbbellChart', 'sireDevelopmentChart']],
  ['母父系的性别与世代构成', ['bmsSexPerformanceChart', 'bmsCropShareChart']],
  ['具体母父的奖金贡献', ['bmsSireContributionChart']],
  ['牧场的出生世代构成', ['breederCropChart']],
  ['母龄与胎次的进一步比较', ['damAgeGradedRateChart', 'damFoalOrderChart']],
  ['俱乐部马的分性别胜马率', ['clubWinCompare-牡', 'clubWinCompare-牝', 'clubWinCompare-セン']],
];

export function organizeAnalysis(root, render) {
  if (root.dataset.organized) return;
  root.dataset.organized = 'true';
  for (const [label, ids] of SECONDARY_GROUPS) {
    const cards = ids.map(id => root.querySelector(`[id="${id}"]`)?.closest('.chart-card')).filter(Boolean);
    if (!cards.length) continue;
    const source = cards[0].parentElement;
    const details = document.createElement('details');
    details.className = 'further-exploration';
    const summary = document.createElement('summary');
    summary.textContent = `进一步探索 · ${label}`;
    const grid = document.createElement('div');
    grid.className = 'chart-grid';
    details.append(summary, grid);
    source.after(details);
    for (const card of cards) grid.append(card);
    if (!source.children.length) source.remove();
    details.addEventListener('toggle', () => {
      if (details.open) requestAnimationFrame(() => { render(); window.dispatchEvent(new Event('resize')); });
    });
  }
  const core = root.querySelector('#sireSameAgeChart')?.closest('.chart-card');
  if (core) core.parentElement.prepend(core);
  // Keep full source tables reachable without competing with the main charts.
  for (const block of root.querySelectorAll('.analysis-block')) {
    const heading = block.querySelector(':scope > .analysis-block-head > h2');
    if (!heading || !/综合表|分组明细|出生世代明细/.test(heading.textContent)) continue;
    const details = document.createElement('details');
    details.className = 'analysis-data-details';
    const summary = document.createElement('summary');
    summary.textContent = `查看完整数据 · ${heading.textContent}`;
    block.before(details); details.append(summary, block);
  }
}

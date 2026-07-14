const state = {
  q: "",
  sex: "",
  year: "",
  color: "",
  region: "",
  trainer: "",
  broodmare_sire: "",
  female_family: "",
  bms_line: "",
  achievement: "",
  breeding: "",
  sort: "earnings_netkeiba",
  dir: "desc",
  limit: 50,
  offset: 0,
  total: 0,
};

const els = {
  search: document.querySelector("#search"),
  year: document.querySelector("#year"),
  sex: document.querySelector("#sex"),
  color: document.querySelector("#color"),
  region: document.querySelector("#region"),
  trainer: document.querySelector("#trainer"),
  broodmareSire: document.querySelector("#broodmareSire"),
  femaleFamily: document.querySelector("#femaleFamily"),
  bmsLine: document.querySelector("#bmsLine"),
  achievement: document.querySelector("#achievement"),
  breeding: document.querySelector("#breeding"),
  sort: document.querySelector("#sort"),
  direction: document.querySelector("#direction"),
  resultCount: document.querySelector("#resultCount"),
  horseRows: document.querySelector("#horseRows"),
  prev: document.querySelector("#prev"),
  next: document.querySelector("#next"),
  pageLabel: document.querySelector("#pageLabel"),
  drawer: document.querySelector("#drawer"),
  detail: document.querySelector("#detail"),
  closeDrawer: document.querySelector("#closeDrawer"),
  closeBackdrop: document.querySelector("#closeBackdrop"),
  navButtons: document.querySelectorAll(".main-nav button"),
  views: document.querySelectorAll(".view"),
  sireContent: document.querySelector("#sireContent"),
  bmsContent: document.querySelector("#bmsContent"),
  pedigreeContent: document.querySelector("#pedigreeContent"),
  breederContent: document.querySelector("#breederContent"),
  racecourseContent: document.querySelector("#racecourseContent"),
  methodContent: document.querySelector("#methodContent"),
};

function fmt(value) {
  if (value === null || value === undefined || value === "") return "—";
  return value;
}

function money(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return `${Number(value).toLocaleString("ja-JP", { maximumFractionDigits: 1 })} 万円`;
}

function prize(horse) {
  return money(horse.earnings_netkeiba ?? horse.earnings_jbis);
}

function escapeHtml(value) {
  return String(fmt(value))
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const staticData = {
  summary: null,
  horses: null,
  analytics: new Map(),
  details: new Map(),
};

function staticBase() {
  return String(window.STATIC_DATA_BASE || "").replace(/\/$/, "");
}

function isStaticMode() {
  return Boolean(staticBase());
}

async function fetchStaticData(path) {
  const response = await fetch(`${staticBase()}/${path}`);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

async function getStaticSummary() {
  if (!staticData.summary) staticData.summary = await fetchStaticData("summary.json");
  return staticData.summary;
}

async function getStaticHorses() {
  if (!staticData.horses) staticData.horses = await fetchStaticData("horses.json");
  return staticData.horses;
}

function searchText(horse) {
  return [
    horse.name,
    horse.name_en,
    horse.hkjc_name_zh,
    horse.search_aliases,
    horse.dam,
    horse.broodmare_sire,
    horse.trainer,
    horse.breeder,
  ].filter(Boolean).join(" ").toLowerCase();
}

function staticSortValue(horse, sort) {
  if (sort === "birth_year") return Number(horse.birth_year || -1);
  if (sort === "sex") return horse.sex || "";
  if (sort === "earnings_jbis") return Number(horse.earnings_jbis ?? -1);
  if (sort === "earnings_netkeiba") return Number(horse.earnings_netkeiba ?? -1);
  return horse.name || "";
}

function staticHorseList(horses, params) {
  const search = (params.get("q") || "").trim().toLowerCase();
  const sort = params.get("sort") || "earnings_netkeiba";
  const direction = params.get("dir") === "asc" ? "asc" : "desc";
  const limit = Math.max(1, Math.min(100, Number(params.get("limit") || 50)));
  const offset = Math.max(0, Number(params.get("offset") || 0));

  const checks = [
    ["sex", "sex"],
    ["year", "birth_year"],
    ["color", "color"],
    ["region", "trainer_region"],
    ["trainer", "trainer"],
    ["broodmare_sire", "broodmare_sire"],
    ["female_family", "female_family"],
    ["bms_line", "bms_line"],
    ["achievement", "achievement_class"],
    ["breeding", "breeding_role"],
  ];

  const filtered = horses.filter((horse) => {
    if (search && !searchText(horse).includes(search)) return false;
    return checks.every(([param, field]) => {
      const value = params.get(param);
      return !value || String(horse[field] ?? "") === value;
    });
  });

  filtered.sort((left, right) => {
    const a = staticSortValue(left, sort);
    const b = staticSortValue(right, sort);
    let result = 0;
    if (typeof a === "number" && typeof b === "number") {
      result = a - b;
    } else {
      result = String(a).localeCompare(String(b), "ja");
    }
    if (result !== 0) return direction === "asc" ? result : -result;
    return String(left.name || "").localeCompare(String(right.name || ""), "ja");
  });

  return {
    total: filtered.length,
    items: filtered.slice(offset, offset + limit),
  };
}

async function getStaticJson(url) {
  const parsed = new URL(url, window.location.href);
  if (parsed.pathname === "/api/summary") return getStaticSummary();
  if (parsed.pathname === "/api/horses") return staticHorseList(await getStaticHorses(), parsed.searchParams);
  if (parsed.pathname === "/api/horse") {
    const id = parsed.searchParams.get("id");
    if (!staticData.details.has(id)) {
      staticData.details.set(id, await fetchStaticData(`horses/${encodeURIComponent(id)}.json`));
    }
    return staticData.details.get(id);
  }
  if (parsed.pathname.startsWith("/data/analytics/")) {
    return fetchStaticData(parsed.pathname.replace(/^\/data\//, ""));
  }
  throw new Error(`Static route not found: ${parsed.pathname}`);
}

async function getJson(url) {
  if (isStaticMode()) return getStaticJson(url);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return response.json();
}

async function getAnalytics(name) {
  if (!staticData.analytics.has(name)) {
    staticData.analytics.set(name, await getJson(`/data/analytics/${encodeURIComponent(name)}.json`));
  }
  return staticData.analytics.get(name);
}

function debounce(fn, wait = 220) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

function fillFacet(select, rows) {
  for (const row of rows) {
    const option = document.createElement("option");
    option.value = row.value;
    option.textContent = `${row.value} (${row.count})`;
    select.appendChild(option);
  }
}

function updateDirectionButton() {
  const descendingOnScreen = state.sort === "name" ? state.dir === "asc" : state.dir === "desc";
  els.direction.textContent = descendingOnScreen ? "↓" : "↑";
}

async function loadSummary() {
  const summary = await getJson("/api/summary");

  for (const year of summary.facets.years) {
    const option = document.createElement("option");
    option.value = String(year);
    option.textContent = String(year);
    els.year.appendChild(option);
  }
  fillFacet(els.sex, summary.facets.sexes);
  fillFacet(els.color, summary.facets.colors);
  fillFacet(els.region, summary.facets.regions);
  window.trainerFacets = summary.facets.trainers;
  fillTrainerFacet();
  fillFacet(els.broodmareSire, summary.facets.broodmareSires || []);
  fillFacet(els.femaleFamily, summary.facets.femaleFamilies);
  fillFacet(els.bmsLine, summary.facets.bmsLines);
  fillFacet(els.achievement, summary.facets.achievements);
  fillFacet(els.breeding, summary.facets.breeding);
}

function fillTrainerFacet() {
  const selected = state.trainer;
  els.trainer.innerHTML = `<option value="">すべて</option>`;
  const rows = (window.trainerFacets || []).filter((row) => !state.region || row.region === state.region);
  for (const row of rows) {
    const option = document.createElement("option");
    option.value = row.value;
    option.textContent = `${row.value} (${row.count})`;
    els.trainer.appendChild(option);
  }
  if ([...els.trainer.options].some((option) => option.value === selected)) {
    els.trainer.value = selected;
  } else {
    state.trainer = "";
  }
}

function formatNumber(value, digits = 0) {
  if (value === null || value === undefined || value === "") return "—";
  return Number(value).toLocaleString("ja-JP", { maximumFractionDigits: digits });
}

function formatRate(value) {
  if (value === null || value === undefined) return "—";
  return `${(Number(value) * 100).toFixed(1)}%`;
}

function representativeNames(row) {
  const reps = row.representatives || [];
  if (!reps.length) return "—";
  return reps.map((rep) => [rep.name, rep.hkjc_name_zh ? `(${rep.hkjc_name_zh})` : "", rep.achievement_class].filter(Boolean).join(" ")).join(" / ");
}

function metricCard(label, value, sub = "") {
  return `
    <article class="metric-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      ${sub ? `<small>${escapeHtml(sub)}</small>` : ""}
    </article>
  `;
}

function rateWithCount(value, numerator, denominator) {
  return `${formatRate(value)} (${formatNumber(numerator)}/${formatNumber(denominator)})`;
}

function barList(rows, labelFn, valueFn, subFn = () => "", maxValue = null) {
  const max = maxValue ?? Math.max(...rows.map((row) => Number(valueFn(row)) || 0), 1);
  return `
    <div class="bar-list">
      ${rows.map((row) => {
        const value = Number(valueFn(row)) || 0;
        return `
          <div class="bar-row">
            <div class="bar-label">${labelFn(row)}</div>
            <div class="bar-track"><span style="width:${Math.max(3, (value / max) * 100)}%"></span></div>
            <div class="bar-value">${escapeHtml(subFn(row) || formatNumber(value))}</div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function heatCell(row, bucket, type) {
  const stats = row.surface?.[bucket] || row.distance?.[bucket] || {};
  const rateValue = stats[`${type}_rate`];
  const numerator = type === "win" ? stats.wins : stats.top3;
  const denominator = stats.starts || 0;
  const alpha = rateValue ? Math.min(0.9, 0.12 + rateValue * 1.7) : 0;
  const label = denominator ? `${formatRate(rateValue)} (${formatNumber(numerator)}/${formatNumber(denominator)})` : "—";
  return `<span class="heat-cell" style="background: rgba(18, 107, 90, ${alpha})">${escapeHtml(label)}</span>`;
}

function analysisTable(columns, rows, options = {}) {
  const limit = options.limit || rows.length;
  return `
    <div class="analysis-table-wrap">
      <table class="analysis-table">
        <thead>
          <tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows.slice(0, limit).map((row) => `
            <tr>
              ${columns.map((column) => `<td>${column.html ? column.value(row) : escapeHtml(column.value(row))}</td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function sectionBlock(title, lead, body) {
  return `
    <section class="analysis-block">
      <div class="analysis-block-head">
        <h2>${escapeHtml(title)}</h2>
        ${lead ? `<p>${escapeHtml(lead)}</p>` : ""}
      </div>
      ${body}
    </section>
  `;
}

function bmsFilterButton(label) {
  return `<button class="link-button" type="button" data-bms-filter="${escapeHtml(label)}">${escapeHtml(label)}</button>`;
}

function broodmareSireFilterButton(label) {
  return `<button class="link-button" type="button" data-broodmare-sire-filter="${escapeHtml(label)}">${escapeHtml(label)}</button>`;
}

function setSelectValue(select, value) {
  if ([...select.options].some((option) => option.value === value)) {
    select.value = value;
    return true;
  }
  return false;
}

function applyBmsFilter(value) {
  state.bms_line = value;
  setSelectValue(els.bmsLine, value);
  state.offset = 0;
  showView("progeny");
  loadHorses();
}

function applyBroodmareSireFilter(value) {
  state.broodmare_sire = value;
  setSelectValue(els.broodmareSire, value);
  state.offset = 0;
  showView("progeny");
  loadHorses();
}

function wireAnalysisFilters(container) {
  for (const button of container.querySelectorAll("[data-bms-filter]")) {
    button.addEventListener("click", () => applyBmsFilter(button.dataset.bmsFilter));
  }
  for (const button of container.querySelectorAll("[data-broodmare-sire-filter]")) {
    button.addEventListener("click", () => applyBroodmareSireFilter(button.dataset.broodmareSireFilter));
  }
}

async function renderSireAnalysis() {
  if (els.sireContent.dataset.loaded) return;
  const [overview, crops, distanceSurface] = await Promise.all([
    getAnalytics("overview"),
    getAnalytics("crops"),
    getAnalytics("distance_surface"),
  ]);
  const summary = overview.summary;
  els.sireContent.innerHTML = `
    <div class="analysis-title">
      <p class="kicker">Sire Analysis</p>
      <h1>種牡馬成績</h1>
      <p>現在の静的スナップショット内で計算できる産駒成績を、世代・馬場・距離・性別に分けて表示します。</p>
    </div>
    <div class="metric-grid">
      ${metricCard("Foals", formatNumber(summary.foals), summary.generation_range)}
      ${metricCard("Runners", formatNumber(summary.runners), `出走率 ${formatRate(summary.runner_rate)}`)}
      ${metricCard("Winners", formatNumber(summary.winners), `勝馬率 ${formatRate(summary.winner_foal_rate)}`)}
      ${metricCard("Graded winners", formatNumber(summary.graded_winners), `対産駒 ${formatRate(summary.graded_foal_rate)}`)}
      ${metricCard("G1 winners", formatNumber(summary.g1_winners), `対産駒 ${formatRate(summary.g1_foal_rate)}`)}
      ${metricCard("AWD", summary.awd ? `${formatNumber(summary.awd)} m` : "—", `${formatNumber(summary.winning_distance_count)} 勝から算出`)}
    </div>
    ${sectionBlock("Crop-by-crop", "世代ごとの出走率、勝馬率、重賞勝馬数、賞金の比較です。",
      analysisTable([
        { label: "生年", value: (row) => row.label },
        { label: "Foals", value: (row) => formatNumber(row.foals) },
        { label: "Runners", value: (row) => `${formatNumber(row.runners)} (${formatRate(row.runner_rate)})` },
        { label: "Winners", value: (row) => `${formatNumber(row.winners)} (${formatRate(row.winner_foal_rate)})` },
        { label: "重賞勝馬", value: (row) => formatNumber(row.graded_winners) },
        { label: "総賞金", value: (row) => money(row.total_earnings) },
        { label: "平均賞金", value: (row) => money(row.avg_earnings_per_foal) },
        { label: "中央値", value: (row) => money(row.median_earnings_per_runner) },
      ], crops)
    )}
    ${sectionBlock("Surface / Distance / Sex", "race_resultsに入っている全走レベルの集計です。",
      `<div class="analysis-split">
        ${analysisTable([
          { label: "馬場", value: (row) => row.label },
          { label: "出走", value: (row) => formatNumber(row.starts) },
          { label: "勝利", value: (row) => formatNumber(row.wins) },
          { label: "勝率", value: (row) => formatRate(row.win_rate) },
          { label: "AWD", value: (row) => row.awd ? `${formatNumber(row.awd)} m` : "—" },
        ], distanceSurface.by_surface)}
        ${analysisTable([
          { label: "区分", value: (row) => row.label },
          { label: "出走", value: (row) => formatNumber(row.starts) },
          { label: "勝利", value: (row) => formatNumber(row.wins) },
          { label: "勝率", value: (row) => formatRate(row.win_rate) },
        ], distanceSurface.by_distance)}
      </div>`
    )}
    ${sectionBlock("Sex Split", "牡牝別の出走数・勝利数・勝率です。赛次奖金字段覆盖率不足，本表不展示赛次奖金汇总。",
      analysisTable([
        { label: "性", value: (row) => row.label },
        { label: "出走", value: (row) => formatNumber(row.starts) },
        { label: "勝利", value: (row) => formatNumber(row.wins) },
        { label: "勝率", value: (row) => formatRate(row.win_rate) },
      ], distanceSurface.by_sex)
    )}
  `;
  els.sireContent.dataset.loaded = "true";
}

async function renderBmsAnalysis() {
  if (els.bmsContent.dataset.loaded) return;
  const [overview, bmsLines, broodmareSires] = await Promise.all([
    getAnalytics("overview"),
    getAnalytics("bms_lines"),
    getAnalytics("broodmare_sires"),
  ]);
  const totalFoals = overview.summary.foals || 0;
  els.bmsContent.innerHTML = `
    <div class="analysis-title">
      <p class="kicker">Broodmare Sire Analysis</p>
      <h1>母父分析</h1>
      <p>母父大系の構成比と、具体的な母父別リーダーボードです。各行から産駒一覧へ戻って絞り込めます。</p>
    </div>
    <div class="lineage-summary">
      ${bmsLines.map((row) => `
        <article class="lineage-card">
          <div>${bmsFilterButton(row.label)}</div>
          <strong>${formatNumber(row.foals)}</strong>
          <span>${formatRate(row.foals / totalFoals)} / 勝馬 ${formatNumber(row.winners)}</span>
        </article>
      `).join("")}
    </div>
    ${sectionBlock("BMS Line Composition", "8分類の母父系ごとの標本数、勝馬率、重賞勝馬率です。",
      analysisTable([
        { label: "母父系", value: (row) => bmsFilterButton(row.label), html: true },
        { label: "Foals", value: (row) => formatNumber(row.foals) },
        { label: "構成比", value: (row) => formatRate(row.foals / totalFoals) },
        { label: "Runners", value: (row) => `${formatNumber(row.runners)} (${formatRate(row.runner_rate)})` },
        { label: "Winners", value: (row) => `${formatNumber(row.winners)} (${formatRate(row.winner_foal_rate)})` },
        { label: "重賞勝馬", value: (row) => `${formatNumber(row.graded_winners)} (${formatRate(row.graded_foal_rate)})` },
        { label: "代表馬", value: representativeNames },
      ], bmsLines)
    )}
    ${sectionBlock("Broodmare Sire Leaderboard", "母父名そのもののランキングです。標本数が小さい行は率を読むときに注意が必要です。",
      analysisTable([
        { label: "母父", value: (row) => broodmareSireFilterButton(row.label), html: true },
        { label: "Foals", value: (row) => formatNumber(row.foals) },
        { label: "Runners", value: (row) => `${formatNumber(row.runners)} (${formatRate(row.runner_rate)})` },
        { label: "Winners", value: (row) => `${formatNumber(row.winners)} (${formatRate(row.winner_foal_rate)})` },
        { label: "重賞勝馬", value: (row) => formatNumber(row.graded_winners) },
        { label: "総賞金", value: (row) => money(row.total_earnings) },
        { label: "中央値", value: (row) => money(row.median_earnings_per_runner) },
        { label: "代表馬", value: representativeNames },
      ], broodmareSires, { limit: 80 })
    )}
  `;
  wireAnalysisFilters(els.bmsContent);
  els.bmsContent.dataset.loaded = "true";
}

async function renderPedigreeAnalysis() {
  if (els.pedigreeContent.dataset.loaded) return;
  const pedigree = await getAnalytics("pedigree");
  const cross = pedigree.cross;
  els.pedigreeContent.innerHTML = `
    <div class="analysis-title">
      <p class="kicker">Pedigree Analysis</p>
      <h1>血統分析</h1>
      <p>Crossは修正済みパーサーで「祖先＋位置」を分解し、同一グループ内では独立産駒数で数えます。複数Crossを持つ馬は複数グループに入るため、総賞金は合算不可です。</p>
    </div>
    <div class="metric-grid compact-metrics">
      ${metricCard("Horses with cross", formatNumber(cross.summary.horses_with_cross), `${formatNumber(cross.summary.horses)} foals`)}
      ${metricCard("Parsed entries", formatNumber(cross.summary.parsed_entries), "ancestor-pattern rows")}
      ${metricCard("Ancestor groups", formatNumber(cross.ancestors.length), "distinct ancestors")}
      ${metricCard("Pattern groups", formatNumber(cross.ancestor_patterns.length), "ancestor + pattern")}
    </div>
    ${sectionBlock("Cross Ancestors", "祖先ごとの独立産駒数、勝馬率、重賞馬率、馬匹級生涯賞金です。",
      analysisTable([
        { label: "祖先", value: (row) => row.label },
        { label: "Foals", value: (row) => formatNumber(row.foals) },
        { label: "Runners", value: (row) => `${formatNumber(row.runners)} (${formatRate(row.runner_rate)})` },
        { label: "Winners", value: (row) => `${formatNumber(row.winners)} (${formatRate(row.winner_foal_rate)})` },
        { label: "重賞勝馬", value: (row) => `${formatNumber(row.graded_winners)} (${formatRate(row.graded_foal_rate)})` },
        { label: "G1", value: (row) => formatNumber(row.g1_winners) },
        { label: "総賞金", value: (row) => money(row.total_earnings) },
        { label: "平均", value: (row) => money(row.avg_earnings_per_foal) },
        { label: "中央値", value: (row) => money(row.median_earnings_per_runner) },
        { label: "代表馬", value: representativeNames },
      ], cross.ancestors)
    )}
    ${sectionBlock("Ancestor + Pattern", "具体的なCross形式ごとのランキングです。どの祖先のどの形が多いか、成績がよいかを見ます。",
      analysisTable([
        { label: "祖先", value: (row) => row.ancestor || row.label.split("|")[0] },
        { label: "Cross形式", value: (row) => row.pattern || row.label.split("|")[1] },
        { label: "Foals", value: (row) => formatNumber(row.foals) },
        { label: "勝馬率", value: (row) => rateWithCount(row.winner_foal_rate, row.winners, row.foals) },
        { label: "重賞馬率", value: (row) => rateWithCount(row.graded_foal_rate, row.graded_winners, row.foals) },
        { label: "総賞金", value: (row) => money(row.total_earnings) },
        { label: "平均", value: (row) => money(row.avg_earnings_per_foal) },
        { label: "中央値", value: (row) => money(row.median_earnings_per_runner) },
        { label: "Max", value: (row) => money(row.max_earnings) },
        { label: "代表馬", value: representativeNames },
      ], cross.ancestor_patterns)
    )}
    ${sectionBlock("Structure Only", "祖先名を外し、S/M位置だけで見た近交構造です。",
      analysisTable([
        { label: "Pattern", value: (row) => row.label },
        { label: "Foals", value: (row) => formatNumber(row.foals) },
        { label: "勝馬率", value: (row) => rateWithCount(row.winner_foal_rate, row.winners, row.foals) },
        { label: "重賞馬率", value: (row) => rateWithCount(row.graded_foal_rate, row.graded_winners, row.foals) },
        { label: "総賞金", value: (row) => money(row.total_earnings) },
        { label: "代表馬", value: representativeNames },
      ], cross.structures)
    )}
    ${sectionBlock("Female Family Performance", "牝系ごとの産駒数と成績。未分類は今後の再調査対象です。",
      analysisTable([
        { label: "牝系", value: (row) => row.label },
        { label: "Foals", value: (row) => formatNumber(row.foals) },
        { label: "Winners", value: (row) => `${formatNumber(row.winners)} (${formatRate(row.winner_foal_rate)})` },
        { label: "重賞勝馬", value: (row) => formatNumber(row.graded_winners) },
        { label: "総賞金", value: (row) => money(row.total_earnings) },
        { label: "代表馬", value: representativeNames },
      ], pedigree.female_families)
    )}
  `;
  els.pedigreeContent.dataset.loaded = "true";
}

async function renderBreederAnalysis() {
  if (els.breederContent.dataset.loaded) return;
  const breeders = await getAnalytics("breeders");
  els.breederContent.innerHTML = `
    <div class="analysis-title">
      <p class="kicker">Breeder Analysis</p>
      <h1>牧場分析</h1>
      <p>牧場ごとの産駒数、勝馬率（対産駒）、勝率（対出走）、重賞馬の分布を分けて表示します。主表は原牧場単位で、集团层は補助情報です。</p>
    </div>
    ${sectionBlock("Foals by Breeder", "Dora産駒数Top20。これは規模を見る図で、効率指標ではありません。",
      barList(
        breeders.top_foals.slice(0, 20),
        (row) => escapeHtml(row.label),
        (row) => row.foals,
        (row) => `${formatNumber(row.foals)} foals`
      )
    )}
    ${sectionBlock("Winner Rate by Breeder", "Foals≥5の牧場だけを表示。ラベルは必ず分子/分母つきです。",
      barList(
        breeders.winner_rates.slice(0, 20),
        (row) => escapeHtml(row.label),
        (row) => row.winner_foal_rate || 0,
        (row) => rateWithCount(row.winner_foal_rate, row.winners, row.foals),
        1
      )
    )}
    ${sectionBlock("Graded Winner Sources", "重賞勝馬を出した牧場。独立馬匹数で、重賞勝利数ではありません。",
      analysisTable([
        { label: "牧場", value: (row) => row.label },
        { label: "Foals", value: (row) => formatNumber(row.foals) },
        { label: "重賞馬", value: (row) => formatNumber(row.graded_winners) },
        { label: "G1馬", value: (row) => formatNumber(row.g1_winners) },
        { label: "勝馬率/Foal", value: (row) => rateWithCount(row.winner_foal_rate, row.winners, row.foals) },
        { label: "総賞金", value: (row) => money(row.total_earnings) },
        { label: "代表馬", value: representativeNames },
      ], breeders.graded_sources)
    )}
    ${sectionBlock("Breeder Performance Table", breeders.method,
      analysisTable([
        { label: "牧場", value: (row) => row.label },
        { label: "Foals", value: (row) => formatNumber(row.foals) },
        { label: "Runners", value: (row) => `${formatNumber(row.runners)} (${formatRate(row.runner_rate)})` },
        { label: "Winners", value: (row) => `${formatNumber(row.winners)} (${formatRate(row.winner_foal_rate)})` },
        { label: "総出走", value: (row) => formatNumber(row.starts) },
        { label: "総勝場", value: (row) => formatNumber(row.wins_starts) },
        { label: "勝率/出走", value: (row) => rateWithCount(row.win_start_rate, row.wins_starts, row.starts) },
        { label: "複勝率", value: (row) => rateWithCount(row.top3_rate, row.top3, row.starts) },
        { label: "重賞馬", value: (row) => formatNumber(row.graded_winners) },
        { label: "G1馬", value: (row) => formatNumber(row.g1_winners) },
        { label: "総賞金", value: (row) => money(row.total_earnings) },
        { label: "中央値", value: (row) => money(row.median_earnings_per_runner) },
        { label: "代表馬", value: representativeNames },
      ], breeders.table, { limit: 120 })
    )}
  `;
  els.breederContent.dataset.loaded = "true";
}

async function renderRacecourseAnalysis() {
  if (els.racecourseContent.dataset.loaded) return;
  const data = await getAnalytics("racecourses");
  const surfaceColumns = ["芝", "ダ", "障"];
  const distanceColumns = ["1200以下", "1400-1600", "1800-2000", "2200-2400", "2500以上"];
  els.racecourseContent.innerHTML = `
    <div class="analysis-title">
      <p class="kicker">Racecourse Analysis</p>
      <h1>競馬場分析</h1>
      <p>meetingを競馬場単位に標準化し、finishが数値の有効出走だけで勝率・連対率・複勝率を計算します。JRA/NAR/海外は表内で区分します。</p>
    </div>
    <div class="metric-grid compact-metrics">
      ${metricCard("Valid starts", formatNumber(data.summary.valid_starts), "finish numeric")}
      ${metricCard("Racecourses", formatNumber(data.summary.courses), "canonical")}
      ${metricCard("Chart threshold", `${formatNumber(data.summary.main_chart_min_starts)}+`, "starts")}
    </div>
    ${sectionBlock("Win Rate / Show Rate", "出走30以上の競馬場。勝率と複勝率を分けて表示します。",
      `<div class="analysis-split">
        ${barList(
          data.main_chart.slice(0, 25),
          (row) => `${escapeHtml(row.label)} <small>${escapeHtml(row.jurisdiction)}</small>`,
          (row) => row.win_start_rate || 0,
          (row) => rateWithCount(row.win_start_rate, row.wins_starts, row.starts),
          1
        )}
        ${barList(
          [...data.main_chart].sort((a, b) => (b.top3_rate || 0) - (a.top3_rate || 0)).slice(0, 25),
          (row) => `${escapeHtml(row.label)} <small>${escapeHtml(row.jurisdiction)}</small>`,
          (row) => row.top3_rate || 0,
          (row) => rateWithCount(row.top3_rate, row.top3, row.starts),
          1
        )}
      </div>`
    )}
    ${sectionBlock("Racecourse Table", data.method,
      analysisTable([
        { label: "競馬場", value: (row) => row.label },
        { label: "区分", value: (row) => row.jurisdiction },
        { label: "出走", value: (row) => formatNumber(row.starts) },
        { label: "1着", value: (row) => formatNumber(row.wins_starts) },
        { label: "2着", value: (row) => formatNumber(row.seconds) },
        { label: "3着", value: (row) => formatNumber(row.thirds) },
        { label: "勝率", value: (row) => rateWithCount(row.win_start_rate, row.wins_starts, row.starts) },
        { label: "連対率", value: (row) => rateWithCount(row.quinella_rate, row.wins_starts + row.seconds, row.starts) },
        { label: "複勝率", value: (row) => rateWithCount(row.top3_rate, row.top3, row.starts) },
        { label: "芝勝率", value: (row) => rateWithCount(row.surface?.["芝"]?.win_rate, row.surface?.["芝"]?.wins || 0, row.surface?.["芝"]?.starts || 0) },
        { label: "ダ勝率", value: (row) => rateWithCount(row.surface?.["ダ"]?.win_rate, row.surface?.["ダ"]?.wins || 0, row.surface?.["ダ"]?.starts || 0) },
      ], data.table, { limit: 120 })
    )}
    ${sectionBlock("Racecourse x Surface", "色の濃さは率、セル内は分子/分母です。",
      analysisTable([
        { label: "競馬場", value: (row) => row.label },
        ...surfaceColumns.flatMap((surface) => [
          { label: `${surface}勝率`, value: (row) => heatCell(row, surface, "win"), html: true },
          { label: `${surface}複勝率`, value: (row) => heatCell(row, surface, "top3"), html: true },
        ]),
      ], data.surface_heatmap)
    )}
    ${sectionBlock("Racecourse x Distance", "距離区間別の勝率です。",
      analysisTable([
        { label: "競馬場", value: (row) => row.label },
        ...distanceColumns.map((bucket) => ({ label: bucket, value: (row) => heatCell(row, bucket, "win"), html: true })),
      ], data.distance_heatmap)
    )}
  `;
  els.racecourseContent.dataset.loaded = "true";
}

async function renderMethodology() {
  if (els.methodContent.dataset.loaded) return;
  const method = await getAnalytics("methodology");
  const methodEntries = Object.entries(method).filter(([key]) => key !== "last_updated" && key !== "race_prize_quality");
  const prize = method.race_prize_quality || {};
  els.methodContent.innerHTML = `
    <div class="analysis-title">
      <p class="kicker">Data & Method</p>
      <h1>データ・方法</h1>
      <p>この公開静的版での計算口径と、まだ外部データが必要な項目です。</p>
    </div>
    <section class="analysis-block">
      <div class="method-list">
        ${methodEntries.map(([key, value]) => `
          <article>
            <strong>${escapeHtml(key)}</strong>
            <p>${escapeHtml(value)}</p>
          </article>
        `).join("")}
      </div>
      <div class="quality-panel">
        <h2>Race Prize Quality Check</h2>
        <div class="metric-grid compact-metrics">
          ${metricCard("Race rows", formatNumber(prize.race_rows), "race_results")}
          ${metricCard("Nonzero prize rows", formatNumber(prize.nonzero_prize_rows), `coverage ${formatRate(prize.coverage_rate)}`)}
          ${metricCard("Raw prize sum", money(prize.sum_raw_prize), "unit not trusted")}
        </div>
        <p>${escapeHtml(prize.decision || "")}</p>
      </div>
      <p class="method-updated">Last updated: ${escapeHtml(method.last_updated)}</p>
    </section>
  `;
  els.methodContent.dataset.loaded = "true";
}

async function showView(name) {
  for (const view of els.views) {
    const active = view.id === `${name}View`;
    view.hidden = !active;
    view.classList.toggle("active", active);
  }
  for (const button of els.navButtons) {
    button.classList.toggle("active", button.dataset.view === name);
  }
  if (name === "sire") await renderSireAnalysis();
  if (name === "bms") await renderBmsAnalysis();
  if (name === "pedigree") await renderPedigreeAnalysis();
  if (name === "breeder") await renderBreederAnalysis();
  if (name === "racecourse") await renderRacecourseAnalysis();
  if (name === "method") await renderMethodology();
}

function horseQuery() {
  const params = new URLSearchParams({
    q: state.q,
    sex: state.sex,
    year: state.year,
    color: state.color,
    region: state.region,
    trainer: state.trainer,
    broodmare_sire: state.broodmare_sire,
    female_family: state.female_family,
    bms_line: state.bms_line,
    achievement: state.achievement,
    breeding: state.breeding,
    sort: state.sort,
    dir: state.dir,
    limit: String(state.limit),
    offset: String(state.offset),
  });
  return `/api/horses?${params.toString()}`;
}

function regionBadge(region) {
  if (!region) return "—";
  const cls = region === "美浦" ? "miho" : region === "栗東" ? "ritto" : "local";
  return `<span class="region ${cls}">${escapeHtml(region)}</span>`;
}

function lineageBadge(value) {
  if (!value || value === "未分類") return "";
  const key = String(value).toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");
  return `<span class="lineage lineage-${key}">${escapeHtml(value)}</span>`;
}

function crossItems(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const pattern = /(.+?)\s*[:：]\s*([SM]\d+[×x][SM]\d+(?:\s*,\s*[SM]\d+[×x][SM]\d+)*)/g;
  const items = [];
  let match;
  while ((match = pattern.exec(text)) !== null) {
    items.push(`<span class="cross-item">${escapeHtml(match[1].trim())}: ${escapeHtml(match[2].trim().replaceAll("×", "x"))}</span>`);
  }
  if (!items.length) return escapeHtml(text);
  return `<span class="cross-list">${items.join("")}</span>`;
}

function finishBadge(finish) {
  if (!finish) return "—";
  const cls = finish === 1 ? "first" : finish === 2 ? "second" : finish === 3 ? "third" : "";
  return `<span class="finish ${cls}">${escapeHtml(finish)}</span>`;
}

async function loadHorses() {
  els.horseRows.innerHTML = `<tr><td colspan="11" class="muted">Loading...</td></tr>`;
  const data = await getJson(horseQuery());
  state.total = data.total;
  els.resultCount.textContent = `${data.total.toLocaleString("ja-JP")} 件`;
  els.horseRows.innerHTML = data.items.map((horse) => `
    <tr data-id="${horse.id}">
      <td class="horse-column">
        <div class="horse-name">${escapeHtml(horse.name)}</div>
        ${horse.hkjc_name_zh ? `<div class="hk-name">${escapeHtml(horse.hkjc_name_zh)}</div>` : ""}
      </td>
      <td>${escapeHtml(horse.birth_year)}</td>
      <td class="sex-cell">${escapeHtml(horse.sex)}</td>
      <td class="color-name">${escapeHtml(horse.color)}</td>
      <td>${regionBadge(horse.trainer_region)}</td>
      <td class="dam-name">${escapeHtml(horse.dam)}</td>
      <td>${lineageBadge(horse.female_family)}</td>
      <td class="bms-cell">
        <div class="bms-name">${escapeHtml(horse.broodmare_sire)}</div>
        <div class="tag-row compact">
          ${lineageBadge(horse.bms_line)}
        </div>
      </td>
      <td class="trainer-name">${escapeHtml(horse.trainer)}</td>
      <td class="money">${escapeHtml(prize(horse))}</td>
      <td class="record-cell">
        <div>${escapeHtml(horse.major_win)}</div>
        <div class="muted">${escapeHtml(horse.career_summary || "")}</div>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="11" class="muted">No results</td></tr>`;

  for (const row of els.horseRows.querySelectorAll("tr[data-id]")) {
    row.addEventListener("click", () => openHorse(row.dataset.id));
  }
  updatePager();
}

function updatePager() {
  const start = state.total === 0 ? 0 : state.offset + 1;
  const end = Math.min(state.offset + state.limit, state.total);
  els.pageLabel.textContent = `${start}-${end} / ${state.total}`;
  els.prev.disabled = state.offset === 0;
  els.next.disabled = state.offset + state.limit >= state.total;
}

function sourceSummary(source) {
  const data = source.data || {};
  const pairs = Object.entries(data)
    .filter(([key, value]) => !["raw", "source", "source_url"].includes(key) && value !== null && value !== "")
    .slice(0, 22);
  return pairs.map(([key, value]) => `
    <dt>${escapeHtml(key)}</dt>
    <dd>${escapeHtml(value)}</dd>
  `).join("");
}

function raceRows(races) {
  if (!races.length) {
    return `<p class="muted race-empty">戦績データなし</p>`;
  }
  return `
    <div class="race-table-wrap">
      <table class="race-table">
        <thead>
          <tr>
            <th>日付</th>
            <th>開催</th>
            <th>R</th>
            <th>着</th>
            <th>レース</th>
            <th>距離</th>
            <th>騎手</th>
            <th>人気</th>
            <th>時計</th>
            <th>賞金</th>
          </tr>
        </thead>
        <tbody>
          ${races.map((race) => `
            <tr>
              <td>${escapeHtml(race.race_date)}</td>
              <td>${escapeHtml(race.meeting)}</td>
              <td>${escapeHtml(race.race_no)}</td>
              <td>${finishBadge(race.finish)}</td>
              <td>${race.race_url ? `<a href="${escapeHtml(race.race_url)}" target="_blank" rel="noreferrer">${escapeHtml(race.race_name)}</a>` : escapeHtml(race.race_name)}</td>
              <td>${escapeHtml(race.distance)} ${escapeHtml(race.track_condition)}</td>
              <td>${escapeHtml(race.jockey)}</td>
              <td>${escapeHtml(race.popularity)}</td>
              <td>${escapeHtml(race.time)}</td>
              <td>${escapeHtml(money(race.prize))}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function studTitle(studProfiles) {
  if (studProfiles.some((profile) => profile.role === "stallion")) return "Stud Record";
  return "Progeny";
}

function studLinkName(profile, horse) {
  return horse?.name || profile.name || "馬";
}

function studbookHref(profile) {
  return "https://www.studbook.jp/";
}

function normalizedStudName(value) {
  return String(value || "").replace(/[\s　]/g, "").replace(/（/g, "(").replace(/）/g, ")");
}

function coveringResult(covering, foals) {
  if (!covering.due_date) return "不受胎";
  const sire = normalizedStudName(covering.stallion_name);
  const expectedYear = Number(covering.cover_year) + 1;
  const foal = (foals || []).find((row) => Number(row.result_year) === expectedYear && normalizedStudName(row.sire_name) === sire);
  if (foal?.birth_date && String(foal.birth_date).includes("不受胎")) return "不受胎";
  if (foal) return "出生";
  return "生産予定";
}

function studSection(studProfiles, horse) {
  if (!studProfiles || !studProfiles.length) return "";
  return `
    <section class="stud-section">
      <h2>${escapeHtml(studTitle(studProfiles))}</h2>
      ${studProfiles.map((profile) => `
        <div class="stud-profile">
          <div class="stud-head">
            <div class="stud-links">
              <a class="stud-chip" href="${escapeHtml(studbookHref(profile))}" target="_blank" rel="noreferrer">血統書Studbook</a>
              ${profile.own_netkeiba_url ? `<a class="stud-chip" href="${escapeHtml(profile.own_netkeiba_url)}" target="_blank" rel="noreferrer">Netkeiba Owners</a>` : ""}
            </div>
          </div>
          ${profile.note ? `<p class="muted stud-note">${escapeHtml(profile.note)}</p>` : ""}
          ${profile.fees.length ? `
            <h3>種付料推移</h3>
            <div class="stud-table-wrap">
              <table class="stud-table">
                <thead>
                  <tr><th>年度</th><th>供用</th><th>種付料</th><th>種付け</th><th>登録</th><th>出走</th><th>勝馬</th><th>代表産駒</th></tr>
                </thead>
                <tbody>
                  ${profile.fees.map((row) => `
                    <tr>
                      <td>${escapeHtml(row.year)}</td>
                      <td>${escapeHtml(row.service_year)}</td>
                      <td>${escapeHtml(row.fee_text)}</td>
                      <td>${escapeHtml(row.bred_count)}</td>
                      <td>${escapeHtml(row.registered_count)}</td>
                      <td>${escapeHtml(row.runners_count)}</td>
                      <td>${escapeHtml(row.winners_count)}</td>
                      <td>${escapeHtml(row.representative)}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          ` : ""}
          ${profile.stallion_stats.length ? `
            <h3>配種・生産</h3>
            <div class="stud-table-wrap">
              <table class="stud-table">
                <thead>
                  <tr><th>年</th><th>種付</th><th>サラ系</th><th>出生</th><th>国内登録</th><th>産駒なし等</th><th>配合変更</th></tr>
                </thead>
                <tbody>
                  ${profile.stallion_stats.map((row) => `
                    <tr>
                      <td>${escapeHtml(row.year)}</td>
                      <td>${escapeHtml(row.bred_total)}</td>
                      <td>${escapeHtml(row.bred_thoroughbred)}</td>
                      <td>${escapeHtml(row.births)}</td>
                      <td>${escapeHtml(row.registered_total)}</td>
                      <td>${escapeHtml(row.no_foal)}</td>
                      <td>${escapeHtml(row.changed_mating)}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          ` : ""}
          ${profile.coverings.length ? `
            <h3>種付情報</h3>
            <div class="stud-table-wrap">
              <table class="stud-table">
                <thead><tr><th>年</th><th>種付日</th><th>生産予定</th><th>種付雄馬</th><th>結果</th><th>飼養者</th></tr></thead>
                <tbody>
                  ${profile.coverings.map((row) => `
                    <tr>
                      <td>${escapeHtml(row.cover_year)}</td>
                      <td>${escapeHtml(row.cover_date)}</td>
                      <td>${escapeHtml(row.due_date)}</td>
                      <td>${escapeHtml(row.stallion_name)}</td>
                      <td>${escapeHtml(coveringResult(row, profile.foals))}</td>
                      <td>${escapeHtml([row.keeper_location, row.keeper_name].filter(Boolean).join(" / "))}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          ` : ""}
          ${profile.foals.length ? `
            <h3>繁殖成績</h3>
            <div class="stud-table-wrap">
              <table class="stud-table">
                <thead><tr><th>年</th><th>出生日</th><th>毛色</th><th>性</th><th>馬名</th><th>父</th><th>備考</th></tr></thead>
                <tbody>
                  ${profile.foals.map((row) => `
                    <tr>
                      <td>${escapeHtml(row.result_year)}</td>
                      <td>${escapeHtml(row.birth_date)}</td>
                      <td>${escapeHtml(row.color)}</td>
                      <td>${escapeHtml(row.sex)}</td>
                      <td>${escapeHtml(row.foal_name)}</td>
                      <td>${escapeHtml(row.sire_name)}</td>
                      <td>${escapeHtml(row.note)}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>
          ` : ""}
        </div>
      `).join("")}
    </section>
  `;
}

async function openHorse(id) {
  const data = await getJson(`/api/horse?id=${encodeURIComponent(id)}`);
  const horse = data.horse;
  window.currentDetailHorse = horse;
  els.detail.innerHTML = `
    <div class="detail-head">
      <p class="kicker">${escapeHtml(horse.sire || "Duramente")}</p>
      <h2>${escapeHtml(horse.name)}</h2>
      ${horse.name_en ? `<div class="english-name">${escapeHtml(horse.name_en)}</div>` : ""}
      ${horse.hkjc_name_zh ? `<div class="hk-name detail-hk">${escapeHtml(horse.hkjc_name_zh)}</div>` : ""}
      <div class="tag-row">
        <span class="tag">${escapeHtml(horse.birth_year)}</span>
        <span class="tag">${escapeHtml(horse.sex)}</span>
        <span class="tag">${escapeHtml(horse.color)}</span>
        ${regionBadge(horse.trainer_region)}
        ${lineageBadge(horse.female_family)}
      </div>
      <div class="external-links">
        ${horse.netkeiba_id ? `<a href="https://db.netkeiba.com/horse/${escapeHtml(horse.netkeiba_id)}/" target="_blank" rel="noreferrer">netkeiba</a>` : ""}
        ${horse.jbis_id ? `<a href="https://www.jbis.or.jp/horse/${escapeHtml(horse.jbis_id)}/" target="_blank" rel="noreferrer">JBIS</a>` : ""}
      </div>
    </div>

    <div class="detail-grid">
      <div class="fact"><span>母</span><strong>${escapeHtml(horse.dam)}</strong></div>
      <div class="fact"><span>母父</span><strong>${escapeHtml(horse.broodmare_sire)}</strong></div>
      <div class="fact"><span>母父系</span><strong>${escapeHtml(horse.bms_line || "Other")}</strong></div>
      <div class="fact"><span>牝系</span><strong>${escapeHtml(horse.female_family || "未分類")}</strong></div>
      <div class="fact fact-cross"><span>クロス</span><strong>${crossItems(horse.pedigree_crosses)}</strong></div>
      <div class="fact"><span>調教師</span><strong>${escapeHtml(horse.trainer)}</strong></div>
      <div class="fact"><span>生産牧場</span><strong>${escapeHtml(horse.breeder)}</strong></div>
      <div class="fact"><span>産地</span><strong>${escapeHtml(horse.birthplace)}</strong></div>
      <div class="fact"><span>通算成績</span><strong>${escapeHtml(horse.career_summary)}</strong></div>
      <div class="fact"><span>最高戦績</span><strong>${escapeHtml(horse.achievement_class)}</strong></div>
      <div class="fact"><span>賞金</span><strong>${escapeHtml(prize(horse))}</strong></div>
      <div class="fact"><span>主な勝鞍</span><strong>${escapeHtml(horse.major_win)}</strong></div>
    </div>

    <details class="race-section" open>
      <summary>Race Results</summary>
      ${raceRows(data.races)}
    </details>
    ${studSection(data.stud, horse)}
  `;
  els.drawer.classList.add("open");
  els.drawer.setAttribute("aria-hidden", "false");
}

function closeDrawer() {
  els.drawer.classList.remove("open");
  els.drawer.setAttribute("aria-hidden", "true");
}

function bindControls() {
  const refresh = () => {
    state.offset = 0;
    loadHorses();
  };
  els.search.addEventListener("input", debounce(() => {
    state.q = els.search.value.trim();
    refresh();
  }));
  els.year.addEventListener("change", () => {
    state.year = els.year.value;
    refresh();
  });
  els.sex.addEventListener("change", () => {
    state.sex = els.sex.value;
    refresh();
  });
  els.color.addEventListener("change", () => {
    state.color = els.color.value;
    refresh();
  });
  els.region.addEventListener("change", () => {
    state.region = els.region.value;
    fillTrainerFacet();
    refresh();
  });
  els.trainer.addEventListener("change", () => {
    state.trainer = els.trainer.value;
    refresh();
  });
  els.broodmareSire.addEventListener("change", () => {
    state.broodmare_sire = els.broodmareSire.value;
    refresh();
  });
  els.femaleFamily.addEventListener("change", () => {
    state.female_family = els.femaleFamily.value;
    refresh();
  });
  els.bmsLine.addEventListener("change", () => {
    state.bms_line = els.bmsLine.value;
    refresh();
  });
  els.achievement.addEventListener("change", () => {
    state.achievement = els.achievement.value;
    refresh();
  });
  els.breeding.addEventListener("change", () => {
    state.breeding = els.breeding.value;
    refresh();
  });
  els.sort.addEventListener("change", () => {
    state.sort = els.sort.value;
    state.dir = state.sort === "name" ? "asc" : "desc";
    updateDirectionButton();
    refresh();
  });
  els.direction.addEventListener("click", () => {
    state.dir = state.dir === "desc" ? "asc" : "desc";
    updateDirectionButton();
    refresh();
  });
  els.prev.addEventListener("click", () => {
    state.offset = Math.max(0, state.offset - state.limit);
    loadHorses();
  });
  els.next.addEventListener("click", () => {
    state.offset += state.limit;
    loadHorses();
  });
  els.closeDrawer.addEventListener("click", closeDrawer);
  els.closeBackdrop.addEventListener("click", closeDrawer);
  for (const button of els.navButtons) {
    button.addEventListener("click", () => {
      showView(button.dataset.view).catch((error) => {
        const content = els[`${button.dataset.view}Content`];
        if (content) content.innerHTML = `<p class="muted">${escapeHtml(error.message)}</p>`;
      });
    });
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDrawer();
  });
}

async function init() {
  bindControls();
  await loadSummary();
  await loadHorses();
}

init().catch((error) => {
  els.horseRows.innerHTML = `<tr><td colspan="11">${escapeHtml(error.message)}</td></tr>`;
});

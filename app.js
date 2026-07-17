const state = {
  q: "",
  sex: "",
  year: "",
  color: "",
  region: "",
  trainer: "",
  owner: "",
  breeder: "",
  broodmare_sire: "",
  female_family: "",
  dam_age_bucket: "",
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
  resetFilters: document.querySelector("#resetFilters"),
  year: document.querySelector("#year"),
  sex: document.querySelector("#sex"),
  color: document.querySelector("#color"),
  region: document.querySelector("#region"),
  trainer: document.querySelector("#trainer"),
  owner: document.querySelector("#owner"),
  breeder: document.querySelector("#breeder"),
  broodmareSire: document.querySelector("#broodmareSire"),
  femaleFamily: document.querySelector("#femaleFamily"),
  damAgeBucket: document.querySelector("#damAgeBucket"),
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
  pedigreeContent: document.querySelector("#pedigreeContent"),
  productionContent: document.querySelector("#productionContent"),
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

let tableCounter = 0;
const chartRegistry = new Map();
let chartResizeBound = false;
const COLORS = {
  duramente: "#9b315d",
  plum: "#542544",
  rose: "#d94b68",
  coral: "#e96c4c",
  gold: "#f0b45f",
  raceLine: "#2f6fa7",
  average: "#c95d77",
  blue: "#6d335f",
  muted: "#d9d1c8",
  soft: "#f6efe9",
  gray: "#d8d5cf",
};
const CROP_COLORS = {
  "2018": "#542544",
  "2019": "#9b315d",
  "2020": "#d94b68",
  "2021": "#e96c4c",
  "2022": "#f0b45f",
};

const LEADING_CATEGORY_CATALOG = [
  {
    category: "jra_overall",
    label: "年度别中央（JRA）",
    source_url: "https://db.netkeiba.com/horse/sire_leading_jra.html",
  },
  {
    category: "jra_nar_overall",
    label: "年度别全部（JRA+NAR）",
    source_url: "https://www.jbis.or.jp/ranking/result/?ranking=1&kind=1&division=1&racetype1=1&racetype2=1&condition=1&horse=&match=prefix",
  },
  {
    category: "two_year_all",
    label: "两岁全部",
    source_url: "https://www.jbis.or.jp/ranking/result/?ranking=2&racetype1=1&racetype2=1",
  },
  {
    category: "two_year_jra",
    label: "两岁中央",
    source_url: "https://www.jbis.or.jp/ranking/result/?ranking=2&kind=1&division=2&racetype1=1&racetype2=1&condition=1&horse=&match=prefix",
  },
  {
    category: "first_crop_all",
    label: "初年度全部",
    source_url: "https://www.jbis.or.jp/ranking/result/?ranking=3&kind=1&division=1&racetype1=1&racetype2=1&condition=1&horse=&match=prefix",
  },
  {
    category: "first_crop_jra",
    label: "初年度中央",
    source_url: "https://www.jbis.or.jp/ranking/result/?ranking=3&kind=1&division=2&racetype1=1&racetype2=1&condition=1&horse=&match=prefix",
  },
];
const ANNUAL_LEADING_CATEGORIES = new Set(["jra_overall", "jra_nar_overall", "two_year_jra", "two_year_all"]);
const FIRST_CROP_LEADING_CATEGORIES = new Set(["first_crop_all", "first_crop_jra"]);

function normalizeLeadingCategories(payload) {
  const existing = new Map((payload.categories || []).map((row) => [row.category, row]));
  return {
    ...payload,
    categories: LEADING_CATEGORY_CATALOG.map((item) => {
      const current = existing.get(item.category);
      return {
        ...item,
        ...current,
        label: item.label,
        source_url: current?.source_url || item.source_url,
        status: current?.status || (item.category === "jra_overall" ? "available" : "missing"),
        note: current?.note || (item.category === "jra_overall" ? "" : "该分类暂无可解析排行；不使用本库自行推算全日本排名。"),
      };
    }),
  };
}

function isLeadingYearVisible(category, year) {
  const numericYear = Number(year);
  if (category === "jra_overall") return numericYear >= 2020 && numericYear <= 2025;
  if (category === "two_year_all" || category === "two_year_jra") return numericYear <= 2024;
  return true;
}

function cropColor(crop) {
  return CROP_COLORS[String(crop)] || COLORS.gray;
}

function horizontalGrid(top = 20, bottom = 34, right = 40) {
  return { left: 12, right, top, bottom, containLabel: true };
}

function longCategoryAxis(labels, options = {}) {
  return {
    type: "category",
    inverse: options.inverse !== false,
    data: labels,
    axisLabel: {
      width: options.width || 190,
      overflow: "break",
      lineHeight: 16,
    },
  };
}

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
    horse.pedigree_crosses,
    horse.broodmare_sire,
    horse.owner,
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
    ["owner", "owner"],
    ["breeder", "breeder"],
    ["broodmare_sire", "broodmare_sire"],
    ["female_family", "female_family"],
    ["bms_line", "bms_line"],
    ["achievement", "achievement_class"],
    ["breeding", "breeding_role"],
  ];

  const filtered = horses.filter((horse) => {
    if (search && !searchText(horse).includes(search)) return false;
    const damAgeBucket = params.get("dam_age_bucket");
    if (damAgeBucket && horseDamAgeBucket(horse) !== damAgeBucket) return false;
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
  fillFacet(els.owner, summary.facets.owners || []);
  fillFacet(els.breeder, summary.facets.breeders || []);
  fillFacet(els.broodmareSire, summary.facets.broodmareSires || []);
  fillFacet(els.femaleFamily, summary.facets.femaleFamilies);
  fillFacet(els.damAgeBucket, summary.facets.damAgeBuckets || []);
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

function horseDamAgeBucket(horse) {
  const age = horse.dam_age_at_foaling;
  if (age === null || age === undefined || age === "") return "unknown";
  const n = Number(age);
  if (n <= 6) return "3-6";
  if (n <= 10) return "7-10";
  if (n <= 14) return "11-14";
  if (n <= 18) return "15-18";
  return "19+";
}

function representativeNames(row) {
  const reps = row.representatives || [];
  if (!reps.length) return "—";
  return reps.map((rep) => [rep.name, rep.hkjc_name_zh ? `(${rep.hkjc_name_zh})` : "", rep.achievement_class].filter(Boolean).join(" ")).join(" / ");
}

function methodLabel(key) {
  const labels = {
    population: "收录范围",
    foals: "产驹数",
    runners: "出赛马",
    winners: "胜马",
    graded_winners: "重赏胜马",
    earnings: "奖金口径",
    cross: "Cross口径",
    breeder: "牧场口径",
    racecourse: "赛马场口径",
    awd: "平均胜距",
    missing_data: "暂未计算的数据",
  };
  return labels[key] || key;
}

function chartShell(id) {
  return `<div class="chart-canvas" id="${escapeHtml(id)}"></div>`;
}

function renderChart(id, option) {
  const el = document.getElementById(id);
  if (!el) return null;
  if (!window.echarts) {
    el.innerHTML = `<div class="chart-fallback">图表库加载失败，表格数据仍可查看。</div>`;
    return null;
  }
  if (chartRegistry.has(id)) chartRegistry.get(id).dispose();
  const chart = window.echarts.init(el);
  chart.setOption(option);
  chartRegistry.set(id, chart);
  if (!chartResizeBound) {
    window.addEventListener("resize", () => {
      for (const item of chartRegistry.values()) item.resize();
    });
    chartResizeBound = true;
  }
  return chart;
}

function chartBlock(title, lead, id) {
  return `
    <article class="chart-card">
      <div class="chart-card-head">
        <h3>${escapeHtml(title)}</h3>
        ${lead ? `<p>${escapeHtml(lead)}</p>` : ""}
      </div>
      ${chartShell(id)}
    </article>
  `;
}

function controlledChartBlock(title, lead, id, controls) {
  return `
    <article class="chart-card">
      <div class="chart-card-head with-controls">
        <div>
          <h3>${escapeHtml(title)}</h3>
          ${lead ? `<p>${escapeHtml(lead)}</p>` : ""}
        </div>
        <div class="analysis-controls inline-controls">${controls}</div>
      </div>
      ${chartShell(id)}
    </article>
  `;
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

function groupedBarList(rows, labelFn, bars) {
  return `
    <div class="bar-list grouped-bars">
      ${rows.map((row) => `
        <div class="bar-row grouped-bar-row">
          <div class="bar-label">${labelFn(row)}</div>
          <div class="multi-bars">
            ${bars.map((bar) => {
              const value = Number(bar.value(row)) || 0;
              return `
                <div class="multi-bar-line">
                  <span class="multi-bar-name">${escapeHtml(bar.label)}</span>
                  <div class="bar-track"><span class="${escapeHtml(bar.className || "")}" style="width:${Math.max(3, value * 100)}%"></span></div>
                  <span class="bar-value">${escapeHtml(bar.text(row))}</span>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `).join("")}
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
  return `<span class="heat-cell" style="background: rgba(143, 29, 44, ${alpha})">${escapeHtml(label)}</span>`;
}

function analysisTable(columns, rows, options = {}) {
  const limit = options.limit || rows.length;
  const visibleLimit = options.initialLimit ?? (limit > 20 ? 20 : limit);
  const tableId = `analysis-table-${++tableCounter}`;
  const shownRows = rows.slice(0, limit);
  const hasMore = shownRows.length > visibleLimit;
  return `
    <div class="analysis-table-wrap">
      <table class="analysis-table">
        <thead>
          <tr>${columns.map((column) => `<th class="${escapeHtml(column.className || "")}">${escapeHtml(column.label)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${shownRows.map((row, index) => `
            <tr data-table-id="${tableId}" class="${hasMore && index >= visibleLimit ? "is-hidden" : ""}">
              ${columns.map((column) => `<td class="${escapeHtml(column.className || "")}">${column.html ? column.value(row) : escapeHtml(column.value(row))}</td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
    ${hasMore ? `
      <div class="table-toggle-row">
        <button class="table-toggle" type="button" data-expand-table="${tableId}" data-visible-limit="${visibleLimit}" data-expanded="false" data-open-label="展开全部 ${shownRows.length} 条" data-close-label="收起到 ${visibleLimit} 条">展开全部 ${shownRows.length} 条</button>
      </div>
    ` : ""}
  `;
}

function wireExpandableTables(container) {
  for (const button of container.querySelectorAll("[data-expand-table]")) {
    button.addEventListener("click", () => {
      const id = button.dataset.expandTable;
      const expanded = button.dataset.expanded === "true";
      const visibleLimit = Number(button.dataset.visibleLimit || 20);
      const rows = [...container.querySelectorAll(`tr[data-table-id="${id}"]`)];
      for (const [index, row] of rows.entries()) {
        if (index >= visibleLimit) row.classList.toggle("is-hidden", expanded);
      }
      button.dataset.expanded = expanded ? "false" : "true";
      button.textContent = expanded ? button.dataset.openLabel : button.dataset.closeLabel;
    });
  }
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

function applySearchFilter(value) {
  state.q = value;
  els.search.value = value;
  state.offset = 0;
  showView("progeny");
  loadHorses();
}

function applyFemaleFamilyFilter(value) {
  state.female_family = value;
  setSelectValue(els.femaleFamily, value);
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
  for (const button of container.querySelectorAll("[data-search-filter]")) {
    button.addEventListener("click", () => applySearchFilter(button.dataset.searchFilter));
  }
  for (const button of container.querySelectorAll("[data-female-family-filter]")) {
    button.addEventListener("click", () => applyFemaleFamilyFilter(button.dataset.femaleFamilyFilter));
  }
}

function sireCropMetricMeta(metric) {
  const map = {
    total_earnings: { label: "总奖金", unit: "万円", format: money },
    earnings_per_foal: { label: "每匹平均奖金", unit: "万円/匹", format: money },
    winners: { label: "胜马数", unit: "匹", format: (value) => formatNumber(value) },
    winner_foal_rate: { label: "胜马率", unit: "%", format: formatRate },
    graded_winners: { label: "重赏胜马数", unit: "匹", format: (value) => formatNumber(value) },
    graded_foal_rate: { label: "重赏马率", unit: "%", format: formatRate },
  };
  return map[metric] || map.total_earnings;
}

function renderSireCharts(profile, market, leadingHistory, leadingTop10, categories) {
  const crops = [...profile.crops].sort((a, b) => Number(a.label) - Number(b.label));
  const cropLabels = crops.map((row) => row.label);
  const marketRows = market.rows || [];

  renderChart("sireMaresCoveredChart", {
    color: [COLORS.duramente, COLORS.average],
    tooltip: { trigger: "axis" },
    legend: { top: 0, data: ["ドゥラメンテ", "同期社台平均"] },
    grid: { left: 48, right: 28, top: 54, bottom: 42 },
    xAxis: { type: "category", data: marketRows.map((row) => `${row.year}\n${row.season_label}`) },
    yAxis: { type: "value", name: "配种牝马数" },
    series: [
      { name: "ドゥラメンテ", type: "line", smooth: false, symbolSize: 9, label: { show: true, formatter: "{c}", position: "top" }, data: marketRows.map((row) => row.mares_covered) },
      { name: "同期社台平均", type: "line", smooth: false, symbolSize: 8, label: { show: true, formatter: "{c}", position: "bottom" }, data: marketRows.map((row) => row.shadai_avg_mares_covered) },
    ],
  });

  renderChart("sireStudFeeChart", {
    color: [COLORS.duramente, COLORS.gold],
    tooltip: { trigger: "axis" },
    legend: { top: 0, data: ["ドゥラメンテ", "同期社台平均"] },
    grid: { left: 56, right: 28, top: 54, bottom: 42 },
    xAxis: { type: "category", data: marketRows.map((row) => row.year) },
    yAxis: { type: "value", name: "万円" },
    series: [
      { name: "ドゥラメンテ", type: "line", smooth: false, symbolSize: 9, label: { show: true, formatter: "{c}", position: "top" }, data: marketRows.map((row) => row.stud_fee) },
      { name: "同期社台平均", type: "line", smooth: false, symbolSize: 8, label: { show: true, formatter: "{c}", position: "bottom" }, data: marketRows.map((row) => row.shadai_avg_stud_fee) },
    ],
  });

  const cropTooltip = (items) => {
    const row = items[0]?.data?.raw;
    if (!row) return "";
    return [
      `${row.label}年生`,
      `Foals：${formatNumber(row.foals)} / Runners：${formatNumber(row.runners)}`,
      `总奖金：${money(row.total_earnings)}`,
      `每匹平均奖金：${money(row.earnings_per_foal)}`,
      `胜马：${formatNumber(row.winners)} (${formatRate(row.winner_foal_rate)})`,
      `重赏胜马：${formatNumber(row.graded_winners)} (${formatRate(row.graded_foal_rate)})`,
    ].join("<br>");
  };
  const cropMetric = document.querySelector("#sireCropMetric")?.value || "total_earnings";
  const cropMeta = sireCropMetricMeta(cropMetric);
  const cropIsRate = cropMetric.includes("rate");
  renderChart("sireCropMetricChart", {
    color: [COLORS.duramente],
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, formatter: cropTooltip },
    grid: { left: 46, right: 34, top: 26, bottom: 38, containLabel: true },
    xAxis: { type: "category", data: cropLabels },
    yAxis: { type: "value", name: cropMeta.unit },
    series: [{
      name: cropMeta.label,
      type: "bar",
      barMaxWidth: 28,
      data: crops.map((row) => ({
        value: cropIsRate ? Number(((row[cropMetric] || 0) * 100).toFixed(1)) : Number(row[cropMetric] || 0),
        raw: row,
      })),
      label: {
        show: true,
        position: "top",
        formatter: (params) => {
          const row = params.data.raw;
          if (cropMetric === "winner_foal_rate") return `${params.value}%\n${row.winners}/${row.foals}`;
          if (cropMetric === "graded_foal_rate") return `${params.value}%\n${row.graded_winners}/${row.foals}`;
          return `${formatNumber(params.value, cropMetric.includes("earnings") ? 1 : 0)}\nn=${row.foals}`;
        },
      },
    }],
  });

  const ages = ["2", "3", "4", "5", "6+"];
  const cropSet = [...new Set(profile.crop_development.map((row) => String(row.crop)))].sort();
  const developmentMetric = document.querySelector("#sireDevelopmentMetric")?.value || "cumulative_wins";
  const developmentLabels = {
    cumulative_wins: "原始累计胜场",
    cumulative_wins_per_100_foals: "每100匹产驹累计胜场",
    cumulative_wins_per_100_runners: "每100匹出赛马累计胜场",
  };
  renderChart("sireDevelopmentChart", {
    color: cropSet.map(cropColor),
    tooltip: { trigger: "axis" },
    legend: { top: 0, type: "scroll" },
    grid: { left: 42, right: 22, top: 52, bottom: 40 },
    xAxis: { type: "category", name: "年龄", data: ages },
    yAxis: { type: "value", name: developmentLabels[developmentMetric] },
    series: cropSet.map((crop) => ({
      name: crop,
      type: "line",
      smooth: true,
      connectNulls: false,
      itemStyle: { color: cropColor(crop) },
      lineStyle: { color: cropColor(crop), width: crop === "2022" ? 3 : 2 },
      data: ages.map((age) => {
        const row = profile.crop_development.find((item) => String(item.crop) === crop && String(item.age) === age);
        return row ? row[developmentMetric] : null;
      }),
    })),
  });

  const timelineRows = profile.graded_wins_timeline || [];
  const timelineYears = [2020, 2021, 2022, 2023, 2024, 2025, 2026];
  const gradeSeries = ["G1", "G2", "G3"];
  const countsByYear = new Map(timelineYears.map((year) => [year, { G1: 0, G2: 0, G3: 0, total: 0 }]));
  for (const row of timelineRows) {
    const year = Number(String(row.race_date || "").slice(0, 4));
    const grade = row.grade_group;
    if (!countsByYear.has(year) || !gradeSeries.includes(grade)) continue;
    countsByYear.get(year)[grade] += 1;
    countsByYear.get(year).total += 1;
  }
  let cumulative = 0;
  const cumulativeRows = timelineYears.map((year) => {
    cumulative += countsByYear.get(year)?.total || 0;
    return cumulative;
  });
  renderChart("gradedWinsTimelineChart", {
    color: [COLORS.plum, COLORS.rose, COLORS.coral, COLORS.gold],
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (items) => {
        const year = items[0]?.axisValue;
        const stats = countsByYear.get(Number(year)) || {};
        return [
          `${year}${year === 2026 ? "（截至2026-07-16）" : ""}`,
          `G1：${formatNumber(stats.G1 || 0)}`,
          `G2：${formatNumber(stats.G2 || 0)}`,
          `G3：${formatNumber(stats.G3 || 0)}`,
          `当年合计：${formatNumber(stats.total || 0)}`,
          `累计：${formatNumber(cumulativeRows[timelineYears.indexOf(Number(year))] || 0)}`,
        ].join("<br>");
      },
    },
    legend: { top: 0, data: ["G1", "G2", "G3", "累计重赏胜场"] },
    grid: { left: 46, right: 54, top: 54, bottom: 40, containLabel: true },
    xAxis: { type: "category", name: "年", data: timelineYears },
    yAxis: [
      { type: "value", name: "重赏胜场数", minInterval: 1 },
      { type: "value", name: "累计", minInterval: 1 },
    ],
    series: [
      ...gradeSeries.map((grade) => ({
        name: grade,
        type: "bar",
        stack: "graded",
        barMaxWidth: 34,
        data: timelineYears.map((year) => countsByYear.get(year)?.[grade] || 0),
      })),
      {
        name: "累计重赏胜场",
        type: "line",
        yAxisIndex: 1,
        symbolSize: 8,
        data: cumulativeRows,
      },
      {
        name: "当年合计",
        type: "bar",
        stack: "graded",
        silent: true,
        itemStyle: { color: "transparent" },
        data: timelineYears.map((year) => ({
          value: 0,
          label: {
            show: true,
            position: "top",
            formatter: () => formatNumber(countsByYear.get(year)?.total || 0),
          },
        })),
      },
    ],
  });
  const eventTarget = document.querySelector("#gradedWinsEventList");
  if (eventTarget) {
    eventTarget.innerHTML = analysisTable([
      { label: "日期", value: (row) => row.race_date },
      { label: "级别", value: (row) => row.grade_group || row.grade },
      { label: "赛事", className: "name-column", value: (row) => row.race_url ? `<a href="${escapeHtml(row.race_url)}" target="_blank" rel="noreferrer">${escapeHtml(row.race_name)}</a>` : escapeHtml(row.race_name), html: true },
      { label: "胜马", className: "name-column", value: (row) => row.horse },
      { label: "赛马场", className: "entity-column", value: (row) => row.meeting || "—" },
    ], [...timelineRows].sort((a, b) => String(b.race_date || "").localeCompare(String(a.race_date || ""))), { initialLimit: 12 });
    wireExpandableTables(eventTarget);
  }

  const category = document.querySelector("#sireLeadingCategory")?.value || "jra_overall";
  const activeCategory = ANNUAL_LEADING_CATEGORIES.has(category) ? category : "jra_overall";
  const categoryInfo = (categories.categories || []).find((item) => item.category === activeCategory);
  const leadingRowsForCategory = (leadingHistory.history || []).filter((row) => (
    row.category === activeCategory && isLeadingYearVisible(activeCategory, row.year)
  ));
  const history = leadingRowsForCategory
    .sort((a, b) => Number(a.year) - Number(b.year));
  const availableYears = [...new Set([
    ...((leadingTop10.rows || [])
      .filter((row) => row.category === activeCategory)
      .map((row) => Number(row.year))),
    ...history.map((row) => Number(row.year)),
  ])]
    .filter((year) => !Number.isNaN(year) && isLeadingYearVisible(activeCategory, year))
    .sort((a, b) => b - a);
  const rankYears = [...availableYears].sort((a, b) => a - b);
  const historyByYear = new Map(history.map((row) => [Number(row.year), row]));
  const yearSelect = document.querySelector("#sireTop10Year");
  const defaultYear = activeCategory === "jra_overall" && availableYears.includes(2023) ? 2023 : availableYears[0];
  const previousYear = Number(yearSelect?.value || defaultYear);
  const selectedYear = availableYears.includes(previousYear) ? previousYear : defaultYear;
  if (yearSelect) {
    const nextOptions = availableYears.map((year) => `<option value="${year}" ${year === selectedYear ? "selected" : ""}>${year}</option>`).join("");
    if (yearSelect.dataset.category !== activeCategory || yearSelect.innerHTML !== nextOptions) {
      yearSelect.innerHTML = nextOptions;
      yearSelect.dataset.category = activeCategory;
    }
    if (selectedYear) yearSelect.value = String(selectedYear);
  }
  const missing = categoryInfo && categoryInfo.status !== "available";
  const missingBox = document.querySelector("#leadingMissingMessage");
  if (missingBox) {
    const messages = [];
    if (missing) messages.push("该分类暂无可靠来源。");
    if (availableYears.includes(2026)) messages.push("2026年为进行中数据，截至2026-07-16。");
    if (rankYears.length === 1) messages.push("该分类仅有单年度数据，不绘制趋势线。");
    missingBox.textContent = messages.join(" ");
  }
  const rankEmptyTitle = missing ? "该分类暂无可靠来源" : "ドゥラメンテ未进入该分类排行";
  renderChart("sireLeadingRankChart", (missing || !rankYears.length) ? { title: { text: rankEmptyTitle, left: "center", top: "middle" } } : {
    color: [COLORS.duramente],
    tooltip: {
      trigger: "axis",
      formatter: (items) => {
        const item = items.find((entry) => entry.seriesName === "ドゥラメンテ排名") || items[0];
        return `${item.axisValue}<br>ドゥラメンテ排名：${item.value == null ? "—" : item.value}`;
      },
    },
    grid: { left: 44, right: 24, top: 68, bottom: 36, containLabel: true },
    xAxis: { type: "category", name: "年份", data: rankYears },
    yAxis: { type: "value", name: "排名", inverse: true, min: 1 },
    series: [
      {
        name: "ドゥラメンテ排名",
        type: "line",
        smooth: true,
        symbolSize: 7,
        connectNulls: false,
        data: rankYears.map((year) => historyByYear.get(year)?.rank ?? null),
        markArea: history.some((row) => Number(row.rank) === 1) ? {
          silent: true,
          itemStyle: { color: "rgba(216, 155, 43, 0.10)" },
          data: history
            .filter((row) => Number(row.rank) === 1)
            .map((row) => ([{ xAxis: String(row.year) }, { xAxis: String(row.year) }])),
        } : undefined,
        markPoint: history.some((row) => Number(row.rank) === 1) ? {
          symbol: "circle",
          symbolSize: 22,
          itemStyle: { color: COLORS.gold },
          label: {
            show: true,
            formatter: (params) => `${params.data.year}\n第1位`,
            position: "top",
            color: COLORS.gold,
            fontWeight: 900,
            lineHeight: 16,
          },
          data: history
            .filter((row) => Number(row.rank) === 1)
            .map((row) => ({ coord: [String(row.year), row.rank], value: row.rank, year: row.year })),
        } : undefined,
      },
    ],
  });
  const topRows = (leadingTop10.rows || []).filter((row) => row.category === activeCategory && Number(row.year) === selectedYear);
  const durRow = history.find((row) => Number(row.year) === selectedYear);
  const sortedTopRows = [...topRows]
    .sort((a, b) => Number(a.rank || 999) - Number(b.rank || 999))
    .slice(0, 10);
  const chartRows = durRow && !sortedTopRows.some((row) => row.sire === "ドゥラメンテ")
    ? [...sortedTopRows, durRow].sort((a, b) => Number(a.rank || 999) - Number(b.rank || 999))
    : sortedTopRows;
  const topMetric = chartRows.some((row) => row.earnings != null)
    ? { key: "earnings", label: "賞金", unit: "万円" }
    : chartRows.some((row) => row.wins != null)
      ? { key: "wins", label: "胜利回数", unit: "胜" }
      : { key: "runners", label: "出走头数", unit: "头" };
  renderChart("sireTop10Chart", (missing || !chartRows.length) ? { title: { text: missing ? "该分类暂无可靠来源" : "该年份暂无Top10数据", left: "center", top: "middle" } } : {
    color: [COLORS.muted],
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (items) => {
        const item = items[0];
        const row = item.data.raw;
        return [
          `${row.year} ${row.category_label || row.category}`,
          `${row.rank}位 ${escapeHtml(row.sire)}`,
          `${topMetric.label}：${formatNumber(row[topMetric.key], 1)} ${topMetric.unit}`,
          `出走头数：${formatNumber(row.runners || 0)}`,
          `胜马：${formatNumber(row.winners || 0)} / 胜利：${formatNumber(row.wins || 0)}`,
          `重赏胜马：${formatNumber(row.graded_winners || 0)}`,
          `代表产驹：${escapeHtml(row.representative || "—")}`,
        ].join("<br>");
      },
    },
    grid: horizontalGrid(22, 26, 40),
    xAxis: { type: "value", name: topMetric.unit },
    yAxis: longCategoryAxis(chartRows.map((row) => `${row.rank}. ${row.sire}`)),
    series: [{
      name: topMetric.label,
      type: "bar",
      data: chartRows.map((row) => ({
        value: row[topMetric.key] || 0,
        raw: row,
        itemStyle: row.sire === "ドゥラメンテ"
          ? { color: Number(row.rank) === 1 ? COLORS.gold : COLORS.rose }
          : { color: COLORS.muted },
      })),
      label: { show: true, position: "right", formatter: (params) => formatNumber(params.value, 1) },
    }],
  });
}

async function renderSireAnalysis() {
  if (els.sireContent.dataset.loaded) return;
  const [overview, sireProfile, market, leadingHistory, leadingTop10, rawCategories] = await Promise.all([
    getAnalytics("overview"),
    getAnalytics("sire_profile"),
    getAnalytics("sire_market"),
    getAnalytics("leading_sire_history"),
    getAnalytics("leading_sire_top10"),
    getAnalytics("sire_category_rankings"),
  ]);
  const categories = normalizeLeadingCategories(rawCategories);
  const profile = sireProfile.summary;
  const years = [...new Set((leadingHistory.history || [])
    .filter((row) => Number(row.year) >= 2020 && Number(row.year) <= 2025)
    .map((row) => Number(row.year)))]
    .sort((a, b) => b - a);
  const firstCropRows = (leadingHistory.history || [])
    .filter((row) => FIRST_CROP_LEADING_CATEGORIES.has(row.category) && (row.sire === "ドゥラメンテ" || row.sire_id === "2012104511"))
    .sort((a, b) => String(a.category).localeCompare(String(b.category), "ja"));
  els.sireContent.innerHTML = `
    <div class="analysis-title">
      <p class="kicker">种牡马分析</p>
      <h1>種牡馬成績</h1>
      <p>从配种数量、种付费和各出生世代表现观察ドゥラメンテ的种马生涯。</p>
    </div>
    ${sectionBlock("配种与市场评价", "前两个配种年度数量明显高于同期社台平均，2019年后种付费快速上升。",
      `<div class="chart-grid">
        ${chartBlock("配种规模变化", "Duramente每年配种牝马数与同期社台种牡马平均值。", "sireMaresCoveredChart")}
        ${chartBlock("市场定价变化", "种付费单位为万円；对照同期社台种牡马前五年平均值。", "sireStudFeeChart")}
      </div>
      <p class="source-note">配种与种付费来源：${escapeHtml(market.source)}；更新：${escapeHtml(market.retrieved_at)}</p>`
    )}
    ${sectionBlock("出生世代表现", "比较各出生世代的当前成绩和年龄发展轨迹。",
      `<div class="chart-grid cohort-grid">
        ${controlledChartBlock("各出生世代表现", "每次只看一个指标；图中保留样本量。", "sireCropMetricChart", `
          <label><span>指标</span><select id="sireCropMetric">
            <option value="total_earnings">总奖金</option>
            <option value="earnings_per_foal">每匹平均奖金</option>
            <option value="winners">胜马数</option>
            <option value="winner_foal_rate">胜马率</option>
            <option value="graded_winners">重赏胜马数</option>
            <option value="graded_foal_rate">重赏马率</option>
          </select></label>
        `)}
        ${controlledChartBlock("产驹成长曲线", "未达到的年龄使用缺失值，线条直接停止。", "sireDevelopmentChart", `
          <label><span>标准化</span><select id="sireDevelopmentMetric">
            <option value="cumulative_wins">原始累计胜场</option>
            <option value="cumulative_wins_per_100_foals">每100匹产驹</option>
            <option value="cumulative_wins_per_100_runners">每100匹出赛马</option>
          </select></label>
        `)}
      </div>`
    )}
    ${sectionBlock("Leading Sire Career", "",
      `<div class="analysis-controls">
        <label><span>分类</span><select id="sireLeadingCategory">
          ${(categories.categories || []).filter((row) => ANNUAL_LEADING_CATEGORIES.has(row.category)).map((row) => `<option value="${escapeHtml(row.category)}">${escapeHtml(row.label)}${row.status === "available" ? "" : "（缺失）"}</option>`).join("")}
        </select></label>
        <label><span>Top10年份</span><select id="sireTop10Year">
          ${years.map((year) => `<option value="${year}" ${year === 2023 ? "selected" : ""}>${year}</option>`).join("")}
        </select></label>
      </div>
      <p class="source-note" id="leadingMissingMessage"></p>
      <div class="chart-grid">
        ${chartBlock("年度Leading Sire排名", "", "sireLeadingRankChart")}
        ${chartBlock("分类Top10", "", "sireTop10Chart")}
      </div>
      <details class="analysis-block">
        <summary>首年度荣誉</summary>
        ${analysisTable([
          { label: "分类", className: "name-column", value: (row) => row.category_label || row.category },
          { label: "年份", value: (row) => row.year },
          { label: "排名", value: (row) => row.rank },
          { label: "出赛马", value: (row) => formatNumber(row.runners) },
          { label: "胜马", value: (row) => formatNumber(row.winners) },
          { label: "奖金", value: (row) => money(row.earnings) },
          { label: "EI", value: (row) => row.ei == null ? "—" : formatNumber(row.ei, 2) },
          { label: "来源", value: (row) => `<a href="${escapeHtml(row.source_url)}" target="_blank" rel="noreferrer">来源</a>`, html: true },
        ], firstCropRows, { initialLimit: 6 })}
      </details>
      ${analysisTable([
        { label: "年份", value: (row) => row.year },
        { label: "分类", value: (row) => row.category_label || row.category },
        { label: "排名", value: (row) => row.rank },
        { label: "种马", value: (row) => row.sire },
        { label: "奖金", value: (row) => money(row.earnings) },
        { label: "榜首", value: (row) => row.leader_sire || "—" },
        { label: "距榜首差距", value: (row) => row.earnings_gap_to_leader == null ? "—" : money(row.earnings_gap_to_leader) },
        { label: "来源", value: (row) => `<a href="${escapeHtml(row.source_url)}" target="_blank" rel="noreferrer">来源</a>`, html: true },
      ], (leadingHistory.history || []), { initialLimit: 8 })}`
    )}
    <div class="metric-grid compact-metrics">
      ${metricCard("累计总奖金", money(profile.total_earnings), "马匹级累计")}
      ${metricCard("Foals", formatNumber(profile.foals), "当前静态库")}
      ${metricCard("Winners", `${formatNumber(profile.winners)} (${formatRate(profile.winner_foal_rate)})`, "胜马/产驹")}
      ${metricCard("重赏胜马", formatNumber(profile.graded_winners), `G1 ${formatNumber(profile.g1_horses)}`)}
    </div>
    ${sectionBlock("重賞勝利の推移｜重赏胜利时间线", "按年度查看ドゥラメンテ产驹的G1、G2和G3胜场分布。这里统计的是重赏胜场数，同一匹马多次获胜会重复计入。",
      `${chartBlock("年度重赏胜场数", "2026为进行中数据，截至2026-07-16。", "gradedWinsTimelineChart")}
      <article class="chart-card">
        <div class="chart-card-head">
          <h3>重赏胜利事件列表</h3>
        </div>
        <div id="gradedWinsEventList"></div>
      </article>`
    )}
    ${sectionBlock("生产年度明细", "按出生年份比较出赛率、胜马率、2胜/3胜率、重赏胜马、平均奖金与芝/泥平均胜距。",
      analysisTable([
        { label: "生年", value: (row) => row.label },
        { label: "Foals", value: (row) => formatNumber(row.foals) },
        { label: "出赛马", value: (row) => `${formatNumber(row.runners)} (${formatRate(row.debut_rate)})` },
        { label: "Winners", value: (row) => `${formatNumber(row.winners)} (${formatRate(row.winner_foal_rate)})` },
        { label: "2胜以上", value: (row) => `${formatNumber(row.two_win_horses)} (${formatRate(row.two_win_rate)})` },
        { label: "3胜以上", value: (row) => `${formatNumber(row.three_win_horses)} (${formatRate(row.three_win_rate)})` },
        { label: "重赏胜马", value: (row) => formatNumber(row.graded_winners) },
        { label: "G1/G2/G3", value: (row) => `${formatNumber(row.g1_horses)}/${formatNumber(row.g2_horses)}/${formatNumber(row.g3_horses)}` },
        { label: "总奖金", value: (row) => money(row.total_earnings) },
        { label: "每匹平均", value: (row) => money(row.earnings_per_foal) },
        { label: "芝AWD", value: (row) => row.turf_awd ? `${formatNumber(row.turf_awd)} m` : "—" },
        { label: "泥AWD", value: (row) => row.dirt_awd ? `${formatNumber(row.dirt_awd)} m` : "—" },
        { label: "代表马", value: representativeNames },
      ], sireProfile.crops, { initialLimit: 10 })
    )}
  `;
  wireExpandableTables(els.sireContent);
  const rerender = () => renderSireCharts(sireProfile, market, leadingHistory, leadingTop10, categories);
  for (const id of ["sireCropMetric", "sireDevelopmentMetric", "sireLeadingCategory", "sireTop10Year"]) {
    els.sireContent.querySelector(`#${id}`)?.addEventListener("change", rerender);
  }
  renderSireCharts(sireProfile, market, leadingHistory, leadingTop10, categories);
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
      <p class="kicker">母父分析</p>
      <h1>母父分析</h1>
      <p>这里同时看母父大系统构成和具体母父排名。母父名可以点击回到产驹列表筛选。</p>
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
    ${sectionBlock("母父大系统构成", "8个母父大系统的样本数、胜马率和重赏胜马率。",
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
    ${sectionBlock("具体母父排行榜", "默认按产驹数量排序，也可以切换成总奖金、胜马率、重赏率或中位奖金。小样本的百分比要结合Foals一起看。",
      `<div class="analysis-controls">
        <label>
          <span>排序</span>
          <select id="broodmareSireSort">
            <option value="foals">产驹数</option>
            <option value="total_earnings">总奖金</option>
            <option value="winner_foal_rate">胜马率</option>
            <option value="graded_foal_rate">重赏率</option>
            <option value="median_earnings_per_runner">中位奖金</option>
          </select>
        </label>
      </div>
      <div id="broodmareSireLeaderboard"></div>`
    )}
  `;
  const renderBroodmareSireLeaderboard = () => {
    const sortKey = els.bmsContent.querySelector("#broodmareSireSort")?.value || "foals";
    const sorted = [...broodmareSires].sort((left, right) => {
      const a = Number(left[sortKey] ?? 0);
      const b = Number(right[sortKey] ?? 0);
      if (b !== a) return b - a;
      if (right.foals !== left.foals) return right.foals - left.foals;
      return String(left.label).localeCompare(String(right.label), "ja");
    });
    els.bmsContent.querySelector("#broodmareSireLeaderboard").innerHTML = analysisTable([
      { label: "母父", value: (row) => broodmareSireFilterButton(row.label), html: true },
      { label: "Foals", value: (row) => formatNumber(row.foals) },
      { label: "Runners", value: (row) => `${formatNumber(row.runners)} (${formatRate(row.runner_rate)})` },
      { label: "Winners", value: (row) => `${formatNumber(row.winners)} (${formatRate(row.winner_foal_rate)})` },
      { label: "重赏胜马", value: (row) => formatNumber(row.graded_winners) },
      { label: "总奖金", value: (row) => money(row.total_earnings) },
      { label: "中位数", value: (row) => money(row.median_earnings_per_runner) },
      { label: "代表马", value: representativeNames },
    ], sorted, { initialLimit: 20 });
    wireAnalysisFilters(els.bmsContent);
    wireExpandableTables(els.bmsContent);
  };
  els.bmsContent.querySelector("#broodmareSireSort").addEventListener("change", renderBroodmareSireLeaderboard);
  renderBroodmareSireLeaderboard();
  wireAnalysisFilters(els.bmsContent);
  wireExpandableTables(els.bmsContent);
  els.bmsContent.dataset.loaded = "true";
}

function metricValue(row, metric) {
  if (metric === "foals") return row.foals || 0;
  if (metric === "total_earnings") return row.total_earnings || 0;
  return row[metric] || 0;
}

function chartMetricDisplay(row, metric) {
  const value = metricValue(row, metric);
  if (metric.includes("rate")) return value == null ? null : Number((value * 100).toFixed(1));
  return value;
}

function paddedAxisMax(value) {
  const max = Number(value?.max || 0);
  if (!max) return 1;
  return Math.ceil(max * 1.14);
}

function renderPedigreeCharts(pedigree, bmsLines) {
  const charts = pedigree.charts || {};
  const ancestorRows = [...(charts.cross_bubble || [])].sort((a, b) => b.foals - a.foals);
  const topAncestors = ancestorRows.slice(0, 15);
  const otherFoals = ancestorRows.slice(15).reduce((sum, row) => sum + (row.foals || 0), 0);
  const countRows = otherFoals ? [...topAncestors, { label: "其他", foals: otherFoals, representatives: [] }] : topAncestors;
  const countChart = renderChart("crossAncestorCountChart", {
    color: [COLORS.duramente],
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: horizontalGrid(18, 34, 86),
    xAxis: { type: "value", name: "Foals", max: paddedAxisMax },
    yAxis: longCategoryAxis(countRows.map((row) => row.label)),
    series: [{
      type: "bar",
      barMaxWidth: 18,
      data: countRows.map((row) => ({ value: row.foals, raw: row })),
      label: { show: true, position: "right", formatter: (params) => `${formatNumber(params.value)}匹` },
    }],
  });
  countChart?.on("click", (params) => params.data.raw.label !== "其他" && applySearchFilter(params.data.raw.label));

  const minFoals = Number(document.querySelector("#crossMinFoals")?.value || 10);
  const crossMetric = document.querySelector("#crossPerformanceMetric")?.value || "winner_foal_rate";
  const performanceRows = ancestorRows
    .filter((row) => row.foals >= minFoals)
    .sort((a, b) => (chartMetricDisplay(b, crossMetric) || 0) - (chartMetricDisplay(a, crossMetric) || 0))
    .slice(0, 15);
  const performanceChart = renderChart("crossAncestorPerformanceChart", {
    color: [COLORS.duramente],
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (items) => {
        const row = items[0].data.raw;
        return `${escapeHtml(row.label)}<br>Foals ${row.foals}<br>Winners ${row.winners} / 重赏 ${row.graded_winners}<br>胜马率 ${formatRate(row.winner_foal_rate)} / 重赏率 ${formatRate(row.graded_foal_rate)}<br>中位奖金 ${money(row.median_earnings_per_runner)}<br>代表马 ${escapeHtml(representativeNames(row))}`;
      },
    },
    grid: horizontalGrid(18, 34, 104),
    xAxis: { type: "value", name: crossMetric.includes("rate") ? "%" : "万円", max: crossMetric.includes("rate") ? 110 : paddedAxisMax },
    yAxis: longCategoryAxis(performanceRows.map((row) => row.label)),
    series: [{
      type: "bar",
      barMaxWidth: 18,
      data: performanceRows.map((row) => ({ value: chartMetricDisplay(row, crossMetric), raw: row })),
      label: { show: true, position: "right", formatter: (params) => {
        const row = params.data.raw;
        if (crossMetric.includes("rate")) {
          const numerator = crossMetric === "graded_foal_rate" ? row.graded_winners : row.winners;
          return `${params.value}% (${numerator}/${row.foals})`;
        }
        return `${formatNumber(params.value, 1)} n=${row.foals}`;
      } },
    }],
  });
  performanceChart?.on("click", (params) => applySearchFilter(params.data.raw.label));

  const ancestorSelect = document.querySelector("#ancestorSelect");
  const ancestor = ancestorSelect?.value || (charts.ancestor_form_comparison || [])[0]?.ancestor;
  const formMetric = document.querySelector("#ancestorFormMetric")?.value || "foals";
  const formRows = (charts.ancestor_form_comparison || [])
    .filter((row) => row.ancestor === ancestor)
    .sort((a, b) => (chartMetricDisplay(b, formMetric) || 0) - (chartMetricDisplay(a, formMetric) || 0))
    .slice(0, 8);
  const formIsRate = formMetric.includes("rate");
  const formChart = renderChart("ancestorFormChart", {
    color: [COLORS.duramente],
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: horizontalGrid(18, 30, 92),
    xAxis: {
      type: "value",
      name: formMetric === "foals" ? "Foals" : formIsRate ? "%" : "万円",
      max: formIsRate ? 110 : undefined,
    },
    yAxis: longCategoryAxis(formRows.map((row) => row.pattern || row.label.split("|")[1]), { width: 120 }),
    series: [{
      type: "bar",
      barMaxWidth: 14,
      data: formRows.map((row) => ({ value: chartMetricDisplay(row, formMetric), raw: row })),
      label: { show: true, position: "right", formatter: (params) => {
        const row = params.data.raw;
        if (formIsRate) {
          const numerator = formMetric === "graded_foal_rate" ? row.graded_winners : row.winners;
          return `${params.value}% (${numerator}/${row.foals})`;
        }
        return `${formatNumber(params.value, 1)} n=${row.foals}`;
      } },
    }],
  });
  formChart?.on("click", (params) => applySearchFilter(`${params.data.raw.ancestor} ${params.data.raw.pattern}`));

  renderPedigreeLineageTab(pedigree, bmsLines);
}

function renderPedigreeLineageTab(pedigree, bmsLines) {
  const target = document.querySelector("#pedigreeLineagePanel");
  if (!target) return;
  const active = document.querySelector("#pedigreeLineageTab button.active")?.dataset.tab || "bms";
  if (active === "bms") {
    const metric = document.querySelector("#bmsLineMetric")?.value || "foals";
    const rows = [...bmsLines].sort((a, b) => (metricValue(b, metric) || 0) - (metricValue(a, metric) || 0));
    target.innerHTML = `${chartShell("bmsLineChart")}`;
    const chart = renderChart("bmsLineChart", {
      color: [COLORS.duramente],
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
      grid: horizontalGrid(18, 34, 86),
      xAxis: { type: "value", name: metric.includes("rate") ? "%" : metric === "total_earnings" ? "万円" : "匹", max: metric.includes("rate") ? 110 : paddedAxisMax },
      yAxis: longCategoryAxis(rows.map((row) => row.label)),
      series: [{
        type: "bar",
        barMaxWidth: 18,
        data: rows.map((row) => ({ value: metric.includes("rate") ? Number(((row[metric] || 0) * 100).toFixed(1)) : row[metric], raw: row })),
        label: { show: true, position: "right", formatter: (params) => {
          const row = params.data.raw;
          if (metric.includes("rate")) {
            const numerator = metric === "graded_foal_rate" ? row.graded_winners : row.winners;
            return `${params.value}% (${numerator}/${row.foals})`;
          }
          return metric === "total_earnings" ? `${formatNumber(params.value, 1)}万円` : `${formatNumber(params.value, 1)}匹`;
        } },
      }],
    });
    chart?.on("click", (params) => applyBmsFilter(params.data.raw.label));
    return;
  }
  const metric = document.querySelector("#familyMetric")?.value || "foals";
  const rows = [...(pedigree.female_families || [])].slice(0, 15).sort((a, b) => (metricValue(b, metric) || 0) - (metricValue(a, metric) || 0));
  target.innerHTML = `${chartShell("femaleFamilyChart")}`;
  const chart = renderChart("femaleFamilyChart", {
    color: [COLORS.blue],
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: horizontalGrid(18, 34, 86),
    xAxis: { type: "value", name: metric.includes("rate") ? "%" : metric === "total_earnings" ? "万円" : "匹", max: metric.includes("rate") ? 110 : paddedAxisMax },
    yAxis: longCategoryAxis(rows.map((row) => row.label), { width: 120 }),
    series: [{
      type: "bar",
      barMaxWidth: 18,
      data: rows.map((row) => ({ value: metric.includes("rate") ? Number(((row[metric] || 0) * 100).toFixed(1)) : row[metric], raw: row })),
      label: { show: true, position: "right", formatter: (params) => {
        const row = params.data.raw;
        if (metric === "foals") return `${formatNumber(params.value)}匹`;
        if (metric === "total_earnings") return `${formatNumber(params.value, 1)}万円`;
        if (metric === "winner_foal_rate") return `${params.value}% (${row.winners}/${row.foals})`;
        if (metric === "graded_foal_rate") return `${params.value}% (${row.graded_winners}/${row.foals})`;
        return formatNumber(params.value, 1);
      } },
    }],
  });
  chart?.on("click", (params) => applyFemaleFamilyFilter(params.data.raw.label));
}

function renderDamAgeCharts(damAge) {
  renderChart("damAgeHistogramChart", {
    color: [COLORS.duramente],
    tooltip: { trigger: "axis" },
    grid: { left: 48, right: 22, top: 24, bottom: 36 },
    xAxis: { type: "category", name: "母龄", data: damAge.histogram.map((row) => row.age) },
    yAxis: { type: "value", name: "Foals" },
    series: [{ type: "bar", data: damAge.histogram.map((row) => row.foals) }],
  });
  renderChart("damAgePerformanceChart", {
    color: [COLORS.duramente, COLORS.gold, COLORS.coral],
    tooltip: { trigger: "axis" },
    legend: { top: 0, data: ["出赛率", "胜马率", "重赏马率"] },
    grid: { left: 48, right: 22, top: 52, bottom: 36 },
    xAxis: { type: "category", data: damAge.buckets.map((row) => row.label) },
    yAxis: { type: "value", name: "Rate", axisLabel: { formatter: (value) => `${value}%` } },
    series: [
      { name: "出赛率", type: "bar", data: damAge.buckets.map((row) => Number(((row.runner_rate || 0) * 100).toFixed(1))) },
      { name: "胜马率", type: "bar", data: damAge.buckets.map((row) => Number(((row.winner_foal_rate || 0) * 100).toFixed(1))) },
      { name: "重赏马率", type: "bar", data: damAge.buckets.map((row) => Number(((row.graded_foal_rate || 0) * 100).toFixed(1))) },
    ],
  });
  const ageBuckets = ["3-6", "7-10", "11-14", "15-18", "19+", "unknown"];
  const orders = ["1", "2", "3", "4", "5", "6", "7+", "unknown"];
  const heatData = [];
  for (const [y, age] of ageBuckets.entries()) {
    for (const [x, order] of orders.entries()) {
      const row = damAge.foal_order_heatmap.find((item) => item.age_bucket === age && item.foal_order === order);
      heatData.push([x, y, row?.foals || 0, row?.winners || 0, row?.graded_winners || 0]);
    }
  }
  renderChart("damAgeOrderHeatChart", {
    tooltip: { formatter: (params) => {
      const [x, y, foals, winners, graded] = params.value;
      return `母龄 ${ageBuckets[y]} / 胎次 ${orders[x]}<br>Foals ${foals}<br>胜马 ${winners} / 重赏 ${graded}`;
    } },
    grid: { left: 70, right: 24, top: 24, bottom: 54 },
    xAxis: { type: "category", data: orders, name: "胎次" },
    yAxis: { type: "category", data: ageBuckets, name: "母龄" },
    visualMap: { min: 0, max: Math.max(...heatData.map((row) => row[2]), 1), orient: "horizontal", left: "center", bottom: 0, inRange: { color: [COLORS.soft, COLORS.gold, COLORS.duramente] } },
    series: [{ type: "heatmap", data: heatData, label: { show: true, formatter: (params) => params.value[2] || "—" } }],
  });
}

async function renderPedigreeAnalysis() {
  if (els.pedigreeContent.dataset.loaded) return;
  const [pedigree, bmsLines, broodmareSires] = await Promise.all([
    getAnalytics("pedigree"),
    getAnalytics("bms_lines"),
    getAnalytics("broodmare_sires"),
  ]);
  const cross = pedigree.cross;
  const ancestorOptions = [...new Set((pedigree.charts?.ancestor_form_comparison || []).map((row) => row.ancestor).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "ja"));
  els.pedigreeContent.innerHTML = `
    <div class="analysis-title">
      <p class="kicker">血统分析</p>
      <h1>血統分析</h1>
      <p>从Cross祖先、具体Cross形式、母父系和牝系观察ドゥラメンテ的主要血统组合。</p>
    </div>
    <div class="chart-grid">
      ${chartBlock("最常见的Cross祖先", "按具有该Cross的独立产驹数排序；同一匹马在同一祖先组只计一次。", "crossAncestorCountChart")}
      ${sectionBlock("主要Cross祖先的产驹表现", "只显示样本量充足的祖先；百分比旁边保留分子/分母。",
        `<div class="analysis-controls">
          <label><span>指标</span><select id="crossPerformanceMetric">
            <option value="winner_foal_rate">胜马率</option>
            <option value="graded_foal_rate">重赏马率</option>
            <option value="median_earnings_per_runner">中位奖金</option>
            <option value="avg_earnings_per_foal">平均奖金</option>
          </select></label>
          <label><span>最低Foals</span><input id="crossMinFoals" type="number" min="1" max="50" value="10"></label>
        </div>
        ${chartShell("crossAncestorPerformanceChart")}`
      )}
    </div>
    ${sectionBlock("具体Cross形式与结构", "",
      `<div class="cross-detail-grid">
        ${controlledChartBlock("具体Cross形式比较", "最多显示8个形式。", "ancestorFormChart", `
          <label><span>祖先</span><select id="ancestorSelect">
            ${ancestorOptions.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("")}
          </select></label>
          <label><span>指标</span><select id="ancestorFormMetric">
            <option value="foals">Foals</option>
            <option value="winner_foal_rate">胜马率</option>
            <option value="graded_foal_rate">重赏率</option>
            <option value="median_earnings_per_runner">中位奖金</option>
            <option value="total_earnings">总奖金</option>
          </select></label>
        `)}
        <article class="chart-card compact-table-card">
          <div class="chart-card-head">
            <h3>Cross结构分布</h3>
            <p>同一结构按独立产驹数统计。</p>
          </div>
          ${analysisTable([
            { label: "Cross结构", className: "cross-column", value: (row) => row.label },
            { label: "Foals", value: (row) => formatNumber(row.foals) },
            { label: "胜马率", value: (row) => rateWithCount(row.winner_foal_rate, row.winners, row.foals) },
            { label: "重赏率", value: (row) => rateWithCount(row.graded_foal_rate, row.graded_winners, row.foals) },
            { label: "代表马", value: representativeNames },
          ], cross.structures, { initialLimit: 10 })}
        </article>
      </div>`
    )}
    ${sectionBlock("母父系与牝系", "母父系看八大系统构成，牝系看主要牝系贡献。点击柱子可回到产驹检索。",
      `<div class="segment-control" id="pedigreeLineageTab">
        <button class="active" type="button" data-tab="bms">母父系</button>
        <button type="button" data-tab="family">牝系</button>
      </div>
      <div class="analysis-controls">
        <label><span>母父系指标</span><select id="bmsLineMetric">
          <option value="foals">产驹数</option>
          <option value="winner_foal_rate">胜马率</option>
          <option value="graded_foal_rate">重赏马率</option>
          <option value="total_earnings">总奖金</option>
        </select></label>
        <label><span>牝系指标</span><select id="familyMetric">
          <option value="foals">产驹数</option>
          <option value="total_earnings">总奖金</option>
          <option value="winner_foal_rate">胜马率</option>
          <option value="graded_foal_rate">重赏马率</option>
        </select></label>
      </div>
      <div id="pedigreeLineagePanel"></div>`
    )}
    <details class="analysis-block">
      <summary>查看完整Cross数据</summary>
      <div class="detail-table-stack">
        <h3>Cross祖先明细</h3>
        ${analysisTable([
          { label: "祖先", className: "name-column", value: (row) => row.label },
          { label: "Foals", value: (row) => formatNumber(row.foals) },
          { label: "Runners", value: (row) => `${formatNumber(row.runners)} (${formatRate(row.runner_rate)})` },
          { label: "Winners", value: (row) => `${formatNumber(row.winners)} (${formatRate(row.winner_foal_rate)})` },
          { label: "重賞勝馬", value: (row) => `${formatNumber(row.graded_winners)} (${formatRate(row.graded_foal_rate)})` },
          { label: "G1", value: (row) => formatNumber(row.g1_winners) },
          { label: "総賞金", value: (row) => money(row.total_earnings) },
          { label: "平均", value: (row) => money(row.avg_earnings_per_foal) },
          { label: "中央値", value: (row) => money(row.median_earnings_per_runner) },
          { label: "代表馬", value: representativeNames },
        ], cross.ancestors, { initialLimit: 10 })}
        <h3>祖先 + 具体Cross形式明细</h3>
        ${analysisTable([
          { label: "祖先", className: "name-column", value: (row) => row.ancestor || row.label.split("|")[0] },
          { label: "Cross形式", className: "cross-column", value: (row) => row.pattern || row.label.split("|")[1] },
          { label: "Foals", value: (row) => formatNumber(row.foals) },
          { label: "勝馬率", value: (row) => rateWithCount(row.winner_foal_rate, row.winners, row.foals) },
          { label: "重賞馬率", value: (row) => rateWithCount(row.graded_foal_rate, row.graded_winners, row.foals) },
          { label: "総賞金", value: (row) => money(row.total_earnings) },
          { label: "平均", value: (row) => money(row.avg_earnings_per_foal) },
          { label: "中央値", value: (row) => money(row.median_earnings_per_runner) },
          { label: "Max", value: (row) => money(row.max_earnings) },
          { label: "代表馬", value: representativeNames },
        ], cross.ancestor_patterns, { initialLimit: 10 })}
      </div>
    </details>
    <details class="analysis-block">
      <summary>查看牝系详细表</summary>
      ${analysisTable([
        { label: "牝系", className: "entity-column", value: (row) => row.label },
        { label: "Foals", value: (row) => formatNumber(row.foals) },
        { label: "Winners", value: (row) => `${formatNumber(row.winners)} (${formatRate(row.winner_foal_rate)})` },
        { label: "重賞勝馬", value: (row) => formatNumber(row.graded_winners) },
        { label: "総賞金", value: (row) => money(row.total_earnings) },
        { label: "代表馬", value: representativeNames },
      ], pedigree.female_families, { initialLimit: 10 })}
    </details>
  `;
  wireExpandableTables(els.pedigreeContent);
  const rerender = () => renderPedigreeCharts(pedigree, bmsLines);
  for (const id of ["crossPerformanceMetric", "crossMinFoals", "ancestorSelect", "ancestorFormMetric", "bmsLineMetric", "familyMetric"]) {
    els.pedigreeContent.querySelector(`#${id}`)?.addEventListener("change", rerender);
    els.pedigreeContent.querySelector(`#${id}`)?.addEventListener("input", debounce(rerender));
  }
  for (const button of els.pedigreeContent.querySelectorAll("#pedigreeLineageTab button")) {
    button.addEventListener("click", () => {
      for (const peer of els.pedigreeContent.querySelectorAll("#pedigreeLineageTab button")) peer.classList.toggle("active", peer === button);
      renderPedigreeLineageTab(pedigree, bmsLines);
    });
  }
  renderPedigreeCharts(pedigree, bmsLines);
  els.pedigreeContent.dataset.loaded = "true";
}

function renderBreederCharts(breeders) {
  const topRows = [...(breeders.top_foals || [])].slice(0, 15);
  renderChart("breederMainChart", {
    color: [COLORS.duramente, COLORS.blue],
    tooltip: { trigger: "axis" },
    legend: { top: 0, data: ["Foals", "胜马率"] },
    grid: { left: 56, right: 58, top: 54, bottom: 86 },
    xAxis: { type: "category", data: topRows.map((row) => row.label), axisLabel: { rotate: 35 } },
    yAxis: [
      { type: "value", name: "Foals" },
      { type: "value", name: "胜马率", axisLabel: { formatter: (value) => `${value}%` } },
    ],
    series: [
      { name: "Foals", type: "bar", data: topRows.map((row) => row.foals), label: { show: true, position: "top" } },
      { name: "胜马率", type: "line", yAxisIndex: 1, smooth: true, data: topRows.map((row) => Number(((row.winner_foal_rate || 0) * 100).toFixed(1))), label: { show: true, formatter: "{c}%" } },
    ],
  });
  const gradedRows = [...(breeders.graded_sources || [])].slice(0, 12);
  renderChart("breederGradedChart", {
    color: [COLORS.duramente, COLORS.gold],
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: { top: 0, data: ["重赏马", "G1马"] },
    grid: horizontalGrid(52, 30, 40),
    xAxis: { type: "value", name: "匹" },
    yAxis: longCategoryAxis(gradedRows.map((row) => row.label)),
    series: [
      { name: "重赏马", type: "bar", data: gradedRows.map((row) => row.graded_winners), label: { show: true, position: "right" } },
      { name: "G1马", type: "bar", data: gradedRows.map((row) => row.g1_winners), label: { show: true, position: "right" } },
    ],
  });
  const cropRows = [...(breeders.crop_composition || [])].slice(0, 10);
  const years = ["2018", "2019", "2020", "2021", "2022"];
  renderChart("breederCropChart", {
    color: years.map(cropColor),
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: { top: 0, data: years },
    grid: horizontalGrid(52, 30, 40),
    xAxis: { type: "value", name: "Foals" },
    yAxis: longCategoryAxis(cropRows.map((row) => row.label)),
    series: years.map((year) => ({
      name: year,
      type: "bar",
      stack: "crop",
      itemStyle: { color: cropColor(year) },
      data: cropRows.map((row) => row.crop_counts?.[year] || 0),
    })),
  });
}

function renderDamAgeProductionCharts(damAge) {
  renderChart("damAgeHistogramChart", {
    color: [COLORS.duramente],
    tooltip: { trigger: "axis" },
    grid: { left: 48, right: 22, top: 24, bottom: 36 },
    xAxis: { type: "category", name: "母龄", data: damAge.histogram.map((row) => row.age) },
    yAxis: { type: "value", name: "Foals" },
    series: [{ type: "bar", data: damAge.histogram.map((row) => row.foals), label: { show: true, position: "top" } }],
  });
  renderChart("damAgeWinRateChart", {
    color: [COLORS.duramente],
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: horizontalGrid(24, 36, 40),
    xAxis: { type: "value", name: "%" },
    yAxis: longCategoryAxis(damAge.buckets.map((row) => row.label), { width: 90 }),
    series: [{ type: "bar", data: damAge.buckets.map((row) => ({ value: Number(((row.winner_foal_rate || 0) * 100).toFixed(1)), raw: row })), label: { show: true, position: "right", formatter: (params) => {
      const row = params.data.raw;
      return `${params.value}% (${row.winners}/${row.foals})`;
    } } }],
  });
  renderChart("damAgeGradedRateChart", {
    color: [COLORS.gold],
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: horizontalGrid(24, 36, 40),
    xAxis: { type: "value", name: "%" },
    yAxis: longCategoryAxis(damAge.buckets.map((row) => row.label), { width: 90 }),
    series: [{ type: "bar", data: damAge.buckets.map((row) => ({ value: Number(((row.graded_foal_rate || 0) * 100).toFixed(1)), raw: row })), label: { show: true, position: "right", formatter: (params) => {
      const row = params.data.raw;
      return `${params.value}% (${row.graded_winners}/${row.foals})`;
    } } }],
  });
  const orders = ["1", "2", "3", "4", "5", "6", "7+", "unknown"];
  const orderRows = orders.map((order) => {
    const items = damAge.foal_order_heatmap.filter((row) => row.foal_order === order);
    const foals = items.reduce((sum, row) => sum + row.foals, 0);
    const winners = items.reduce((sum, row) => sum + row.winners, 0);
    const graded = items.reduce((sum, row) => sum + row.graded_winners, 0);
    return { label: order, foals, winners, graded, winner_rate: foals ? winners / foals : null, graded_rate: foals ? graded / foals : null };
  });
  renderChart("damFoalOrderChart", {
    color: [COLORS.duramente, COLORS.gold],
    tooltip: { trigger: "axis" },
    legend: { top: 0, data: ["Foals", "胜马率"] },
    grid: { left: 48, right: 58, top: 52, bottom: 36 },
    xAxis: { type: "category", name: "胎次", data: orderRows.map((row) => row.label) },
    yAxis: [
      { type: "value", name: "Foals" },
      { type: "value", name: "胜马率", axisLabel: { formatter: (value) => `${value}%` } },
    ],
    series: [
      { name: "Foals", type: "bar", data: orderRows.map((row) => row.foals), label: { show: true, position: "top" } },
      { name: "胜马率", type: "line", yAxisIndex: 1, data: orderRows.map((row) => row.winner_rate == null ? null : Number((row.winner_rate * 100).toFixed(1))), label: { show: true, formatter: "{c}%" } },
    ],
  });
}

async function renderProductionAnalysis() {
  if (els.productionContent.dataset.loaded) return;
  const [breeders, damAge] = await Promise.all([
    getAnalytics("breeders"),
    getAnalytics("dam_age"),
  ]);
  els.productionContent.innerHTML = `
    <div class="analysis-title">
      <p class="kicker">生産・繁殖</p>
      <h1>生産・繁殖｜牧场与繁殖母马</h1>
      <p>观察ドゥラメンテ产驹主要由哪些牧场生产，以及繁殖牝马年龄和胎次与产驹表现的关系。</p>
    </div>
    <div class="segment-control" id="productionTab">
      <button class="active" type="button" data-tab="breeder">牧場分析</button>
      <button type="button" data-tab="dam">繁殖牝馬分析</button>
    </div>
    <div id="productionPanel"></div>
  `;
  const renderTab = (tab) => {
    const panel = els.productionContent.querySelector("#productionPanel");
    if (tab === "dam") {
      panel.innerHTML = `
        <div class="chart-grid">
          ${chartBlock("母马生产本胎时的年龄", "横轴为母龄，纵轴为产驹数。", "damAgeHistogramChart")}
          ${chartBlock("不同母龄组的产驹胜马率", "显示Winners/Foals。", "damAgeWinRateChart")}
        </div>
        <div class="chart-grid">
          ${chartBlock("不同母龄组的重赏马率", "显示重赏马/Foals。", "damAgeGradedRateChart")}
          ${chartBlock("胎次与表现", "柱为Foals，线为胜马率。", "damFoalOrderChart")}
        </div>
        ${sectionBlock("母龄分组明细", "按生产本胎时母马年龄分组。",
          analysisTable([
            { label: "母龄组", value: (row) => row.label },
            { label: "Foals", value: (row) => formatNumber(row.foals) },
            { label: "Runners", value: (row) => `${formatNumber(row.runners)} (${formatRate(row.runner_rate)})` },
            { label: "Winners", value: (row) => `${formatNumber(row.winners)} (${formatRate(row.winner_foal_rate)})` },
            { label: "重赏马", value: (row) => `${formatNumber(row.graded_winners)} (${formatRate(row.graded_foal_rate)})` },
            { label: "平均奖金", value: (row) => money(row.avg_earnings_per_foal) },
            { label: "中位奖金", value: (row) => money(row.median_earnings_per_runner) },
            { label: "代表马", value: representativeNames },
          ], damAge.buckets)
        )}
      `;
      wireExpandableTables(els.productionContent);
      renderDamAgeProductionCharts(damAge);
      return;
    }
    panel.innerHTML = `
      <div class="chart-grid">
        ${chartBlock("主要生产牧场", "柱形表示产驹数量，折线表示产驹胜马率。", "breederMainChart")}
        ${chartBlock("重赏胜马生产牧场分布", "按独立重赏马匹数统计，不按重赏胜场数重复计算。", "breederGradedChart")}
      </div>
      <div class="chart-grid single-chart">
        ${chartBlock("各牧场出生世代构成", "颜色为2018-2022出生世代。", "breederCropChart")}
      </div>
      ${sectionBlock("牧场综合表", "胜马率（对产驹）=胜马/产驹；胜率（对出走）=1着次数/有效出走次数。",
        analysisTable([
          { label: "牧場", value: (row) => row.label },
          { label: "Foals", value: (row) => formatNumber(row.foals) },
          { label: "Runners", value: (row) => `${formatNumber(row.runners)} (${formatRate(row.runner_rate)})` },
          { label: "Winners", value: (row) => `${formatNumber(row.winners)} (${formatRate(row.winner_foal_rate)})` },
          { label: "重赏马", value: (row) => formatNumber(row.graded_winners) },
          { label: "G1马", value: (row) => formatNumber(row.g1_winners) },
          { label: "总奖金", value: (row) => money(row.total_earnings) },
          { label: "代表马", value: representativeNames },
        ], breeders.table, { initialLimit: 15 })
      )}
    `;
    wireExpandableTables(els.productionContent);
    renderBreederCharts(breeders);
  };
  for (const button of els.productionContent.querySelectorAll("#productionTab button")) {
    button.addEventListener("click", () => {
      for (const peer of els.productionContent.querySelectorAll("#productionTab button")) peer.classList.toggle("active", peer === button);
      renderTab(button.dataset.tab);
    });
  }
  renderTab("breeder");
  els.productionContent.dataset.loaded = "true";
}

async function renderRacecourseAnalysis() {
  if (els.racecourseContent.dataset.loaded) return;
  const data = await getAnalytics("racecourses");
  const surfaceColumns = ["芝", "ダ", "障"];
  const distanceColumns = ["1200以下", "1400-1600", "1800-2000", "2200-2400", "2500以上"];
  els.racecourseContent.innerHTML = `
    <div class="analysis-title">
      <p class="kicker">赛马场分析</p>
      <h1>競馬場分析</h1>
      <p>把 meeting 标准化到赛马场层级，只用 finish 为有效数字的出走计算胜率、连对率和前三率。默认显示 JRA，可以切换 NAR、海外或全部。</p>
    </div>
    <div class="metric-grid compact-metrics">
      ${metricCard("有效出走", formatNumber(data.summary.valid_starts), "finish为数字")}
      ${metricCard("赛马场数", formatNumber(data.summary.courses), "标准化后")}
      ${metricCard("图表门槛", `${formatNumber(data.summary.main_chart_min_starts)}+`, "出走次数")}
    </div>
    <div class="segment-control" id="racecourseScope">
      <button class="active" type="button" data-scope="JRA">JRA</button>
      <button type="button" data-scope="NAR">NAR</button>
      <button type="button" data-scope="Overseas">海外</button>
      <button type="button" data-scope="All">全部</button>
    </div>
    <div id="racecourseDynamic"></div>
  `;
  const renderRacecourseScope = (scope) => {
    const rows = data.table
      .filter((row) => scope === "All" || row.jurisdiction === scope)
      .sort((a, b) => b.starts - a.starts || String(a.label).localeCompare(String(b.label), "ja"));
    const chartMinStarts = scope === "Overseas" ? 1 : data.summary.main_chart_min_starts;
    const winRows = rows
      .filter((row) => row.starts >= chartMinStarts)
      .sort((a, b) => b.wins_starts - a.wins_starts || b.starts - a.starts)
      .slice(0, 10);
    const startRows = rows
      .filter((row) => row.starts >= chartMinStarts)
      .sort((a, b) => b.starts - a.starts)
      .slice(0, 10);
    const surfaceRows = rows
      .filter((row) => row.starts >= chartMinStarts)
      .sort((a, b) => b.starts - a.starts)
      .slice(0, 10);
    els.racecourseContent.querySelector("#racecourseDynamic").innerHTML = `
      <div class="chart-grid">
        ${chartBlock("各赛马场胜场数与胜率", "柱为胜场数，线为胜率；只显示有效出赛达到门槛的赛马场。", "racecourseWinsChart")}
        ${chartBlock("出赛数与前三率", "柱为有效出赛次数，线为前三率。", "racecourseStartsChart")}
      </div>
      <div class="chart-grid">
        ${chartBlock("草地与泥地表现", "小样本请结合Tooltip中的分子/分母查看。", "racecourseSurfaceChart")}
        ${sectionBlock("主要距离表现", "选择赛马场后查看不同距离区间的胜率、前三率和出赛次数。",
          `<div class="analysis-controls">
            <label><span>赛马场</span><select id="racecourseDistanceCourse">
              ${rows.slice(0, 30).map((row) => `<option value="${escapeHtml(row.label)}">${escapeHtml(row.label)}</option>`).join("")}
            </select></label>
          </div>
          ${chartShell("racecourseDistanceChart")}`
        )}
      </div>
      ${sectionBlock("赛马场综合表", "胜率=1着/有效出走；连对率=(1着+2着)/有效出走；前三率=(1-3着)/有效出走。",
        analysisTable([
          { label: "赛马场", value: (row) => row.label },
          { label: "区分", value: (row) => row.jurisdiction },
          { label: "出走", value: (row) => formatNumber(row.starts) },
          { label: "1着", value: (row) => formatNumber(row.wins_starts) },
          { label: "2着", value: (row) => formatNumber(row.seconds) },
          { label: "3着", value: (row) => formatNumber(row.thirds) },
          { label: "胜率", value: (row) => rateWithCount(row.win_start_rate, row.wins_starts, row.starts) },
          { label: "连对率", value: (row) => rateWithCount(row.quinella_rate, row.wins_starts + row.seconds, row.starts) },
          { label: "前三率", value: (row) => rateWithCount(row.top3_rate, row.top3, row.starts) },
          { label: "芝胜率", value: (row) => rateWithCount(row.surface?.["芝"]?.win_rate, row.surface?.["芝"]?.wins || 0, row.surface?.["芝"]?.starts || 0) },
          { label: "泥地胜率", value: (row) => rateWithCount(row.surface?.["ダ"]?.win_rate, row.surface?.["ダ"]?.wins || 0, row.surface?.["ダ"]?.starts || 0) },
        ], rows, { initialLimit: 20 })
      )}
    `;
    renderChart("racecourseWinsChart", {
      color: [COLORS.coral, COLORS.raceLine],
      tooltip: { trigger: "axis" },
      legend: { top: 0, data: ["胜场数", "胜率"] },
      grid: { left: 48, right: 58, top: 54, bottom: 54 },
      xAxis: { type: "category", data: winRows.map((row) => row.label), axisLabel: { rotate: 25 } },
      yAxis: [
        { type: "value", name: "胜场数" },
        { type: "value", name: "胜率", axisLabel: { formatter: (value) => `${value}%` } },
      ],
      series: [
        { name: "胜场数", type: "bar", barMaxWidth: 34, data: winRows.map((row) => row.wins_starts), label: { show: true, position: "top" } },
        {
          name: "胜率",
          type: "line",
          yAxisIndex: 1,
          symbolSize: 8,
          itemStyle: { color: COLORS.raceLine, borderColor: "#fff", borderWidth: 2 },
          lineStyle: { color: COLORS.raceLine, width: 3 },
          data: winRows.map((row) => Number(((row.win_start_rate || 0) * 100).toFixed(1))),
          label: { show: true, formatter: "{c}%" },
        },
      ],
    });
    renderChart("racecourseStartsChart", {
      color: [COLORS.gold, COLORS.raceLine],
      tooltip: { trigger: "axis" },
      legend: { top: 0, data: ["有效出赛", "前三率"] },
      grid: { left: 56, right: 58, top: 54, bottom: 54 },
      xAxis: { type: "category", data: startRows.map((row) => row.label), axisLabel: { rotate: 25 } },
      yAxis: [
        { type: "value", name: "出赛" },
        { type: "value", name: "前三率", axisLabel: { formatter: (value) => `${value}%` } },
      ],
      series: [
        { name: "有效出赛", type: "bar", barMaxWidth: 34, data: startRows.map((row) => row.starts), label: { show: true, position: "top" } },
        {
          name: "前三率",
          type: "line",
          yAxisIndex: 1,
          symbolSize: 8,
          itemStyle: { color: COLORS.raceLine, borderColor: "#fff", borderWidth: 2 },
          lineStyle: { color: COLORS.raceLine, width: 3 },
          data: startRows.map((row) => Number(((row.top3_rate || 0) * 100).toFixed(1))),
          label: { show: true, formatter: "{c}%" },
        },
      ],
    });
    renderChart("racecourseSurfaceChart", {
      color: [COLORS.duramente, COLORS.blue],
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (items) => items.map((item) => {
          const row = item.data.raw;
          const surface = item.seriesName === "草地胜率" ? "芝" : "ダ";
          const stats = row.surface?.[surface] || {};
          return `${item.marker}${item.seriesName}: ${item.value}% (${formatNumber(stats.wins || 0)}/${formatNumber(stats.starts || 0)})`;
        }).join("<br>"),
      },
      legend: { top: 0, data: ["草地胜率", "泥地胜率"] },
      grid: { left: 56, right: 28, top: 54, bottom: 74 },
      xAxis: { type: "category", data: surfaceRows.map((row) => row.label), axisLabel: { rotate: 35 } },
      yAxis: { type: "value", name: "%", axisLabel: { formatter: (value) => `${value}%` } },
      series: [
        { name: "草地胜率", type: "bar", data: surfaceRows.map((row) => ({ value: Number(((row.surface?.["芝"]?.win_rate || 0) * 100).toFixed(1)), raw: row })) },
        { name: "泥地胜率", type: "bar", data: surfaceRows.map((row) => ({ value: Number(((row.surface?.["ダ"]?.win_rate || 0) * 100).toFixed(1)), raw: row })) },
      ],
    });
    const renderDistanceChart = () => {
      const selected = els.racecourseContent.querySelector("#racecourseDistanceCourse")?.value || rows[0]?.label;
      const row = rows.find((item) => item.label === selected) || rows[0];
      const buckets = distanceColumns.map((bucket) => ({ label: bucket, ...(row?.distance?.[bucket] || { starts: 0, wins: 0, top3: 0, win_rate: null, top3_rate: null }) }));
      renderChart("racecourseDistanceChart", {
        color: [COLORS.duramente, COLORS.blue, COLORS.gold],
        tooltip: { trigger: "axis" },
        legend: { top: 0, data: ["胜率", "前三率", "出赛次数"] },
        grid: { left: 58, right: 58, top: 54, bottom: 42 },
        xAxis: { type: "category", data: buckets.map((item) => item.label) },
        yAxis: [
          { type: "value", name: "%" },
          { type: "value", name: "出赛", position: "right" },
        ],
        series: [
          { name: "胜率", type: "bar", data: buckets.map((item) => Number(((item.win_rate || 0) * 100).toFixed(1))), label: { show: true, position: "top", formatter: "{c}%" } },
          { name: "前三率", type: "bar", data: buckets.map((item) => Number(((item.top3_rate || 0) * 100).toFixed(1))) },
          { name: "出赛次数", type: "line", yAxisIndex: 1, data: buckets.map((item) => item.starts || 0), label: { show: true, formatter: "{c}" } },
        ],
      });
    };
    els.racecourseContent.querySelector("#racecourseDistanceCourse")?.addEventListener("change", renderDistanceChart);
    renderDistanceChart();
    wireExpandableTables(els.racecourseContent);
  };
  for (const button of els.racecourseContent.querySelectorAll("#racecourseScope button")) {
    button.addEventListener("click", () => {
      for (const peer of els.racecourseContent.querySelectorAll("#racecourseScope button")) peer.classList.toggle("active", peer === button);
      renderRacecourseScope(button.dataset.scope);
    });
  }
  renderRacecourseScope("JRA");
  els.racecourseContent.dataset.loaded = "true";
}

async function renderMethodology() {
  if (els.methodContent.dataset.loaded) return;
  const method = await getAnalytics("methodology");
  const methodEntries = Object.entries(method).filter(([key]) => key !== "last_updated" && key !== "race_prize_quality");
  const prize = method.race_prize_quality || {};
  els.methodContent.innerHTML = `
    <div class="analysis-title">
      <p class="kicker">数据口径</p>
      <h1>データ・方法</h1>
      <p>这里说明公开静态版的计算口径，以及哪些数据目前还不能安全计算。</p>
    </div>
    <section class="analysis-block">
      <div class="method-list">
        ${methodEntries.map(([key, value]) => `
          <article>
            <strong>${escapeHtml(methodLabel(key))}</strong>
            <p>${escapeHtml(value)}</p>
          </article>
        `).join("")}
      </div>
      <div class="quality-panel">
        <h2>赛次奖金质量检查</h2>
        <div class="metric-grid compact-metrics">
          ${metricCard("比赛记录", formatNumber(prize.race_rows), "race_results")}
          ${metricCard("非零奖金记录", formatNumber(prize.nonzero_prize_rows), `覆盖率 ${formatRate(prize.coverage_rate)}`)}
          ${metricCard("原始奖金合计", money(prize.sum_raw_prize), "单位未验证")}
        </div>
        <p>${escapeHtml(prize.decision || "")}</p>
      </div>
      <p class="method-updated">最后更新：${escapeHtml(method.last_updated)}</p>
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
  if (name === "pedigree") await renderPedigreeAnalysis();
  if (name === "production") await renderProductionAnalysis();
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
    owner: state.owner,
    breeder: state.breeder,
    broodmare_sire: state.broodmare_sire,
    female_family: state.female_family,
    dam_age_bucket: state.dam_age_bucket,
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

function damAgeText(horse) {
  if (horse.dam_age_at_foaling === null || horse.dam_age_at_foaling === undefined) return "unknown";
  return `${horse.dam_age_at_foaling}岁`;
}

function isLocalHorse(horse) {
  return horse.trainer_region === "地方" || String(horse.affiliation || "").includes("地方");
}

function ownerCell(horse) {
  const owner = escapeHtml(horse.owner || "—");
  const colorUrl = horse.owner_color_url && !isLocalHorse(horse) ? String(horse.owner_color_url) : "";
  return `
    <div class="owner-cell">
      ${colorUrl ? `<img class="owner-silk" src="${escapeHtml(colorUrl)}" alt="${owner}">` : ""}
      <span>${owner}</span>
    </div>
  `;
}

function finishBadge(finish) {
  if (!finish) return "—";
  const cls = finish === 1 ? "first" : finish === 2 ? "second" : finish === 3 ? "third" : "";
  return `<span class="finish ${cls}">${escapeHtml(finish)}</span>`;
}

async function loadHorses() {
  els.horseRows.innerHTML = `<tr><td colspan="12" class="muted">Loading...</td></tr>`;
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
      <td class="dam-name">
        <div>${escapeHtml(horse.dam)}</div>
      </td>
      <td>${lineageBadge(horse.female_family)}</td>
      <td class="bms-cell">
        <div class="bms-name">${escapeHtml(horse.broodmare_sire)}</div>
        <div class="tag-row compact">
          ${lineageBadge(horse.bms_line)}
        </div>
      </td>
      <td class="owner-name">${ownerCell(horse)}</td>
      <td class="trainer-name">${escapeHtml(horse.trainer)}</td>
      <td class="money">${escapeHtml(prize(horse))}</td>
      <td class="record-cell">
        <div>${escapeHtml(horse.major_win)}</div>
        <div class="muted">${escapeHtml(horse.career_summary || "")}</div>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="12" class="muted">No results</td></tr>`;

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
  return "Progeny Record";
}

function studLinkName(profile, horse) {
  return horse?.name || profile.name || "馬";
}

function studbookHref(profile) {
  return "https://www.studbook.jp/";
}

function profileExternalLinks(profile) {
  const raw = profile?.external_links_json;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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
              ${profileExternalLinks(profile).map((link) => `
                <a class="stud-chip aus-chip" href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label || "Australia")}</a>
              `).join("")}
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
      <div class="fact"><span>母出生年</span><strong>${escapeHtml(horse.dam_birth_year || "unknown")}</strong></div>
      <div class="fact"><span>产本胎年龄</span><strong>${escapeHtml(damAgeText(horse))}</strong></div>
      <div class="fact"><span>胎次</span><strong>${escapeHtml(horse.foal_order || "unknown")}</strong></div>
      <div class="fact"><span>母父</span><strong>${escapeHtml(horse.broodmare_sire)}</strong></div>
      <div class="fact"><span>母父系</span><strong>${escapeHtml(horse.bms_line || "Other")}</strong></div>
      <div class="fact"><span>牝系</span><strong>${escapeHtml(horse.female_family || "未分類")}</strong></div>
      <div class="fact fact-cross"><span>クロス</span><strong>${crossItems(horse.pedigree_crosses)}</strong></div>
      <div class="fact"><span>馬主</span><strong>${ownerCell(horse)}</strong></div>
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
  const resetFilters = () => {
    for (const key of ["q", "sex", "year", "color", "region", "trainer", "owner", "breeder", "broodmare_sire", "female_family", "dam_age_bucket", "bms_line", "achievement", "breeding"]) {
      state[key] = "";
    }
    state.offset = 0;
    els.search.value = "";
    els.year.value = "";
    els.sex.value = "";
    els.color.value = "";
    els.region.value = "";
    els.owner.value = "";
    els.breeder.value = "";
    els.broodmareSire.value = "";
    els.femaleFamily.value = "";
    els.damAgeBucket.value = "";
    els.bmsLine.value = "";
    els.achievement.value = "";
    els.breeding.value = "";
    fillTrainerFacet();
    els.trainer.value = "";
    loadHorses();
  };
  els.resetFilters?.addEventListener("click", resetFilters);
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
  els.owner.addEventListener("change", () => {
    state.owner = els.owner.value;
    refresh();
  });
  els.breeder.addEventListener("change", () => {
    state.breeder = els.breeder.value;
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
  els.damAgeBucket.addEventListener("change", () => {
    state.dam_age_bucket = els.damAgeBucket.value;
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

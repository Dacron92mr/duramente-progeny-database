const state = {
  q: "",
  sex: "",
  year: "",
  color: "",
  region: "",
  trainer: "",
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
  year: document.querySelector("#year"),
  sex: document.querySelector("#sex"),
  color: document.querySelector("#color"),
  region: document.querySelector("#region"),
  trainer: document.querySelector("#trainer"),
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

let tableCounter = 0;
const chartRegistry = new Map();
let chartResizeBound = false;

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
  return `<span class="heat-cell" style="background: rgba(18, 107, 90, ${alpha})">${escapeHtml(label)}</span>`;
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
          <tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${shownRows.map((row, index) => `
            <tr data-table-id="${tableId}" class="${hasMore && index >= visibleLimit ? "is-hidden" : ""}">
              ${columns.map((column) => `<td>${column.html ? column.value(row) : escapeHtml(column.value(row))}</td>`).join("")}
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

function renderSireCharts(profile, leadingHistory, leadingTop10, categories) {
  const crops = [...profile.crops].sort((a, b) => Number(a.label) - Number(b.label));
  const cropLabels = crops.map((row) => row.label);
  renderChart("sireCropEarningsChart", {
    color: ["#126b5a", "#b1842f"],
    tooltip: { trigger: "axis" },
    legend: { top: 0, data: ["总奖金", "每匹平均"] },
    grid: { left: 70, right: 48, top: 52, bottom: 40 },
    xAxis: { type: "category", data: cropLabels },
    yAxis: [
      { type: "value", name: "总奖金(亿円)", axisLabel: { formatter: (value) => `${(value / 10000).toFixed(0)}` } },
      { type: "value", name: "每匹(万円)", position: "right" },
    ],
    series: [
      { name: "总奖金", type: "bar", data: crops.map((row) => row.total_earnings), yAxisIndex: 0 },
      { name: "每匹平均", type: "bar", data: crops.map((row) => row.earnings_per_foal), yAxisIndex: 1 },
    ],
  });

  renderChart("sireCropCountChart", {
    color: ["#386fa4", "#126b5a", "#9a3f2f"],
    tooltip: { trigger: "axis" },
    legend: { top: 0, data: ["出赛马", "胜马", "重赏胜马"] },
    grid: { left: 48, right: 24, top: 52, bottom: 40 },
    xAxis: { type: "category", data: cropLabels },
    yAxis: { type: "value", name: "匹" },
    series: [
      { name: "出赛马", type: "line", data: crops.map((row) => row.runners), smooth: true },
      { name: "胜马", type: "line", data: crops.map((row) => row.winners), smooth: true },
      { name: "重赏胜马", type: "bar", data: crops.map((row) => row.graded_winners) },
    ],
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
    color: ["#126b5a", "#b1842f", "#9a3f2f", "#386fa4", "#6f5aa7"],
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
      data: ages.map((age) => {
        const row = profile.crop_development.find((item) => String(item.crop) === crop && String(item.age) === age);
        return row ? row[developmentMetric] : null;
      }),
    })),
  });

  const surfaces = ["芝", "ダ", "障"];
  const distances = ["1200以下", "1400-1600", "1800-2000", "2200-2400", "2500以上"];
  const heatMetric = document.querySelector("#sireHeatMetric")?.value || "win_rate";
  const heatData = [];
  for (const [y, surface] of surfaces.entries()) {
    for (const [x, distance] of distances.entries()) {
      const row = profile.surface_distance.find((item) => item.surface === surface && item.distance === distance);
      const metricValue = heatMetric === "starts" ? (row?.starts || 0) : Number((((row?.[heatMetric]) || 0) * 100).toFixed(1));
      heatData.push({
        value: [x, y, metricValue, row?.starts || 0, row?.wins || 0, row?.top3 || 0, row?.small_sample || false],
        itemStyle: row?.small_sample ? { color: "#d8d5cf" } : undefined,
      });
    }
  }
  renderChart("sireSurfaceDistanceChart", {
    tooltip: {
      formatter: (params) => {
        const [x, y, value, starts, wins, top3, small] = params.value;
        const label = heatMetric === "starts" ? `出赛 ${value}` : `${heatMetric === "win_rate" ? "胜率" : "前三率"} ${value}%`;
        return `${surfaces[y]} / ${distances[x]}<br>${label}<br>出赛 ${starts} / 胜场 ${wins} / 前三 ${top3}${small ? "<br>小样本：starts < 20" : ""}`;
      },
    },
    grid: { left: 72, right: 24, top: 24, bottom: 54 },
    xAxis: { type: "category", data: distances, axisLabel: { rotate: 25 } },
    yAxis: { type: "category", data: surfaces },
    visualMap: { min: 0, max: heatMetric === "starts" ? Math.max(...heatData.map((item) => item.value[2]), 1) : 40, calculable: true, orient: "horizontal", left: "center", bottom: 0, inRange: { color: ["#f3eee6", "#b1842f", "#126b5a"] } },
    series: [{ type: "heatmap", data: heatData, label: { show: true, formatter: (params) => {
      const [, , , starts, wins, top3] = params.value;
      if (!starts) return "—";
      if (heatMetric === "starts") return String(starts);
      return heatMetric === "win_rate" ? `${wins}/${starts}` : `${top3}/${starts}`;
    } } }],
  });

  renderChart("sireSexChart", {
    color: ["#126b5a", "#b1842f"],
    tooltip: { trigger: "axis" },
    legend: { top: 0, data: ["胜率", "前三率"] },
    grid: { left: 48, right: 22, top: 52, bottom: 34 },
    xAxis: { type: "category", data: profile.sex_performance.map((row) => row.label) },
    yAxis: { type: "value", axisLabel: { formatter: (value) => `${value}%` } },
    series: [
      { name: "胜率", type: "bar", data: profile.sex_performance.map((row) => Number(((row.win_rate || 0) * 100).toFixed(1))) },
      { name: "前三率", type: "bar", data: profile.sex_performance.map((row) => Number(((row.top3_rate || 0) * 100).toFixed(1))) },
    ],
  });

  const category = document.querySelector("#sireLeadingCategory")?.value || "jra_overall";
  const categoryInfo = (categories.categories || []).find((item) => item.category === category);
  const history = (leadingHistory.history || []).filter((row) => row.category === category);
  const missing = categoryInfo && categoryInfo.status !== "available";
  const missingBox = document.querySelector("#leadingMissingMessage");
  if (missingBox) missingBox.textContent = missing ? `${categoryInfo.label}：${categoryInfo.note || "暂无可靠来源。"} ` : "";
  renderChart("sireLeadingRankChart", missing ? { title: { text: "该分类暂无可靠来源", left: "center", top: "middle" } } : {
    color: ["#126b5a"],
    tooltip: { trigger: "axis" },
    grid: { left: 44, right: 24, top: 24, bottom: 36 },
    xAxis: { type: "category", name: "年份", data: history.map((row) => row.year) },
    yAxis: { type: "value", name: "排名", inverse: true, min: 1 },
    series: [{ name: "ドゥラメンテ排名", type: "line", smooth: true, data: history.map((row) => row.rank) }],
  });
  renderChart("sireLeadingGapChart", missing ? { title: { text: "该分类暂无可靠来源", left: "center", top: "middle" } } : {
    color: ["#126b5a", "#b1842f"],
    tooltip: { trigger: "axis" },
    legend: { top: 0, data: ["ドゥラメンテ奖金", "距榜首差距"] },
    grid: { left: 70, right: 26, top: 52, bottom: 36 },
    xAxis: { type: "category", name: "年份", data: history.map((row) => row.year) },
    yAxis: { type: "value", name: "万円" },
    series: [
      { name: "ドゥラメンテ奖金", type: "bar", data: history.map((row) => row.earnings) },
      { name: "距榜首差距", type: "line", smooth: true, data: history.map((row) => row.earnings_gap_to_leader) },
    ],
  });
  const yearSelect = document.querySelector("#sireTop10Year");
  const selectedYear = Number(yearSelect?.value || history.at(-1)?.year || 2026);
  const topRows = (leadingTop10.rows || []).filter((row) => row.category === category && Number(row.year) === selectedYear);
  const durRow = history.find((row) => Number(row.year) === selectedYear);
  const chartRows = durRow && !topRows.some((row) => row.sire === "ドゥラメンテ") ? [...topRows, durRow] : topRows;
  chartRows.sort((a, b) => (b.earnings || 0) - (a.earnings || 0));
  renderChart("sireTop10Chart", missing ? { title: { text: "该分类暂无可靠来源", left: "center", top: "middle" } } : {
    color: ["#c9b07a"],
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: 128, right: 26, top: 22, bottom: 26 },
    xAxis: { type: "value", name: "万円" },
    yAxis: { type: "category", inverse: true, data: chartRows.map((row) => `${row.rank}. ${row.sire}`) },
    series: [{
      name: "入着賞金",
      type: "bar",
      data: chartRows.map((row) => ({
        value: row.earnings || 0,
        itemStyle: row.sire === "ドゥラメンテ" ? { color: "#126b5a" } : { color: "#c9b07a" },
      })),
      label: { show: true, position: "right", formatter: (params) => formatNumber(params.value, 1) },
    }],
  });
}

async function renderSireAnalysis() {
  if (els.sireContent.dataset.loaded) return;
  const [overview, sireProfile, leadingHistory, leadingTop10, categories] = await Promise.all([
    getAnalytics("overview"),
    getAnalytics("sire_profile"),
    getAnalytics("leading_sire_history"),
    getAnalytics("leading_sire_top10"),
    getAnalytics("sire_category_rankings"),
  ]);
  const summary = overview.summary;
  const profile = sireProfile.summary;
  const years = [...new Set((leadingHistory.history || []).map((row) => row.year))].sort((a, b) => b - a);
  els.sireContent.innerHTML = `
    <div class="analysis-title">
      <p class="kicker">种牡马分析</p>
      <h1>種牡馬成績</h1>
      <p>先回答ドゥラメンテ在同期种马中的排名变化，再看本库产驹的生产年度、年龄曲线、场地距离和性别表现。全日本分类榜只使用可靠来源，缺失分类不自行推算。</p>
    </div>
    <div class="sire-hero">
      <div>
        <p class="kicker">Career overview</p>
        <h2>ドゥラメンテ产驹画像</h2>
        <p>收录 ${formatNumber(profile.foals)} 匹产驹，出赛 ${formatNumber(profile.runners)} 匹，胜马 ${formatNumber(profile.winners)} 匹。重赏胜马 ${formatNumber(profile.graded_winners)} 匹，其中 G1 马 ${formatNumber(profile.g1_horses)} 匹。</p>
      </div>
      <div class="sire-hero-stats">
        <strong>${money(profile.total_earnings)}</strong>
        <span>马匹级累计总奖金</span>
      </div>
    </div>
    <div class="metric-grid sire-eval-grid">
      ${sireProfile.evaluation_cards.map((card) => {
        const value = card.unit === "rate" ? formatRate(card.value) :
          card.unit === "万円" ? money(card.value) :
          card.unit === "m" ? `${formatNumber(card.value)} m` :
          formatNumber(card.value);
        return metricCard(card.label, value, card.note);
      }).join("")}
    </div>
    ${sectionBlock("Leading Sire 年度排名", "来源：netkeiba JRA種牡馬リーディング。排名图纵轴越上代表排名越高；缺失分类会明确提示。",
      `<div class="analysis-controls">
        <label><span>分类</span><select id="sireLeadingCategory">
          ${(categories.categories || []).map((row) => `<option value="${escapeHtml(row.category)}">${escapeHtml(row.label)}${row.status === "available" ? "" : "（缺失）"}</option>`).join("")}
        </select></label>
        <label><span>Top10年份</span><select id="sireTop10Year">
          ${years.map((year) => `<option value="${year}">${year}</option>`).join("")}
        </select></label>
      </div>
      <p class="source-note" id="leadingMissingMessage"></p>
      <div class="chart-grid">
        ${chartBlock("年度排名变化", "JRA Leading Sire 名次，1位在最上方。", "sireLeadingRankChart")}
        ${chartBlock("年度奖金与榜首差距", "单位：万円。折线为与当年榜首的奖金差。", "sireLeadingGapChart")}
      </div>
      <div class="chart-grid single-chart">
        ${chartBlock("年度Top10横向榜", "Duramente不在Top10时也追加显示并高亮。", "sireTop10Chart")}
      </div>`
    )}
    <div class="chart-grid">
      ${chartBlock("生产年度奖金", "总奖金与每匹平均奖金拆轴显示，避免数量级互相压扁。", "sireCropEarningsChart")}
      ${chartBlock("生产年度头数", "出赛马、胜马、重赏胜马按出生年度对比。", "sireCropCountChart")}
    </div>
    <div class="analysis-controls">
      <label><span>年龄曲线指标</span><select id="sireDevelopmentMetric">
        <option value="cumulative_wins">原始累计胜场</option>
        <option value="cumulative_wins_per_100_foals">每100匹产驹</option>
        <option value="cumulative_wins_per_100_runners">每100匹出赛马</option>
      </select></label>
      <label><span>热图指标</span><select id="sireHeatMetric">
        <option value="win_rate">胜率</option>
        <option value="top3_rate">前三率</option>
        <option value="starts">出赛次数</option>
      </select></label>
    </div>
    <div class="chart-grid">
      ${chartBlock("年龄累计胜场曲线", "年轻世代未达到的年龄用空值截断；不会补0。", "sireDevelopmentChart")}
      ${chartBlock("场地 × 距离热图", "小样本 starts < 20 置灰；格内显示分子/分母。", "sireSurfaceDistanceChart")}
    </div>
    <div class="chart-grid single-chart">
      ${chartBlock("性别表现", "胜率与前三率并列比较。", "sireSexChart")}
    </div>
    ${sectionBlock("Leading Sire 来源明细", "每条记录保留来源URL和抓取时间。JBIS维护或缺失的分类不会出现在本表。",
      analysisTable([
        { label: "年份", value: (row) => row.year },
        { label: "分类", value: (row) => row.category_label || row.category },
        { label: "排名", value: (row) => row.rank },
        { label: "种马", value: (row) => row.sire },
        { label: "出赛头数", value: (row) => formatNumber(row.runners) },
        { label: "胜马", value: (row) => formatNumber(row.winners) },
        { label: "胜场", value: (row) => formatNumber(row.wins) },
        { label: "重赏胜", value: (row) => formatNumber(row.graded_winners) },
        { label: "奖金", value: (row) => money(row.earnings) },
        { label: "代表马", value: (row) => row.representative || "—" },
        { label: "来源", value: (row) => `<a href="${escapeHtml(row.source_url)}" target="_blank" rel="noreferrer">netkeiba</a>`, html: true },
      ], [...(leadingTop10.rows || []), ...(leadingHistory.history || []).filter((row) => row.rank > 10)], { initialLimit: 20 })
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
    <div class="sire-note">${escapeHtml(sireProfile.reference_model.leading_sire_note)}</div>
  `;
  wireExpandableTables(els.sireContent);
  const rerender = () => renderSireCharts(sireProfile, leadingHistory, leadingTop10, categories);
  for (const id of ["sireLeadingCategory", "sireTop10Year", "sireDevelopmentMetric", "sireHeatMetric"]) {
    els.sireContent.querySelector(`#${id}`)?.addEventListener("change", rerender);
  }
  renderSireCharts(sireProfile, leadingHistory, leadingTop10, categories);
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

function renderPedigreeCharts(pedigree) {
  const charts = pedigree.charts || {};
  const minFoals = Number(document.querySelector("#crossMinFoals")?.value || 5);
  const crossMetric = document.querySelector("#crossBubbleMetric")?.value || "graded_foal_rate";
  const crossRows = (charts.cross_bubble || []).filter((row) => row.foals >= minFoals);
  const crossChart = renderChart("crossBubbleChart", {
    color: ["#126b5a"],
    tooltip: {
      formatter: (params) => {
        const row = params.data.raw;
        return `${escapeHtml(row.label)}<br>Foals ${row.foals} / Runners ${row.runners}<br>Winners ${row.winners} / 重赏 ${row.graded_winners} / G1 ${row.g1_winners}<br>胜马率 ${formatRate(row.winner_foal_rate)} / 重赏率 ${formatRate(row.graded_foal_rate)}<br>中位奖金 ${money(row.median_earnings_per_runner)}<br>代表马 ${escapeHtml(representativeNames(row))}`;
      },
    },
    grid: { left: 58, right: 36, top: 24, bottom: 48 },
    xAxis: { type: "value", name: "Foals" },
    yAxis: { type: "value", name: crossMetric === "graded_foal_rate" ? "重赏马率" : crossMetric === "winner_foal_rate" ? "胜马率" : "万円" },
    series: [{
      type: "scatter",
      symbolSize: (value) => Math.max(8, Math.min(48, Math.sqrt(value[2] || 0) / 12)),
      data: crossRows.map((row) => ({
        value: [row.foals, metricValue(row, crossMetric), row.total_earnings],
        name: row.label,
        raw: row,
      })),
      label: { show: true, formatter: "{b}", position: "right" },
    }],
  });
  crossChart?.on("click", (params) => applySearchFilter(params.data.raw.label));

  const structureMetric = document.querySelector("#structureMetric")?.value || "foals";
  const sx = ["M2", "M3", "M4", "M5"];
  const sy = ["S2", "S3", "S4", "S5"];
  const structureRows = charts.structure_heatmap || [];
  const structureData = [];
  for (const [y, s] of sy.entries()) {
    for (const [x, m] of sx.entries()) {
      const row = structureRows.find((item) => item.sire_generation === s && item.dam_generation === m);
      structureData.push({
        value: [x, y, row ? metricValue(row, structureMetric) : 0],
        raw: row || { label: `${s}x${m}`, ancestors: [], representatives: [] },
      });
    }
  }
  const structureChart = renderChart("crossStructureChart", {
    tooltip: {
      formatter: (params) => {
        const row = params.data.raw;
        return `${row.label}<br>Foals ${row.foals || 0}<br>胜马率 ${formatRate(row.winner_foal_rate)}<br>重赏率 ${formatRate(row.graded_foal_rate)}<br>中位奖金 ${money(row.median_earnings_per_runner)}<br>祖先 ${escapeHtml((row.ancestors || []).slice(0, 5).map((item) => `${item.ancestor}(${item.foals})`).join(" / ") || "—")}`;
      },
    },
    grid: { left: 50, right: 24, top: 22, bottom: 52 },
    xAxis: { type: "category", data: sx },
    yAxis: { type: "category", data: sy },
    visualMap: { min: 0, max: Math.max(...structureData.map((item) => Number(item.value[2]) || 0), 1), orient: "horizontal", left: "center", bottom: 0, inRange: { color: ["#f3eee6", "#b1842f", "#126b5a"] } },
    series: [{ type: "heatmap", data: structureData, label: { show: true, formatter: (params) => String(params.value[2] || "—") } }],
  });
  structureChart?.on("click", (params) => {
    const detail = document.querySelector("#structureDetail");
    const row = params.data.raw;
    if (detail) {
      detail.innerHTML = `<strong>${escapeHtml(row.label)}</strong>：${escapeHtml((row.ancestors || []).map((item) => `${item.ancestor} ${item.foals}`).join(" / ") || "暂无祖先明细")}；代表马：${escapeHtml(representativeNames(row))}`;
    }
  });

  const ancestorSelect = document.querySelector("#ancestorSelect");
  const ancestor = ancestorSelect?.value || (charts.ancestor_form_comparison || [])[0]?.ancestor;
  const formMetric = document.querySelector("#ancestorFormMetric")?.value || "foals";
  const formRows = (charts.ancestor_form_comparison || []).filter((row) => row.ancestor === ancestor);
  const formChart = renderChart("ancestorFormChart", {
    color: ["#126b5a"],
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: 82, right: 24, top: 24, bottom: 36 },
    xAxis: { type: "value", name: formMetric === "foals" ? "Foals" : formMetric.includes("rate") ? "Rate" : "万円" },
    yAxis: { type: "category", inverse: true, data: formRows.map((row) => row.pattern || row.label.split("|")[1]) },
    series: [{
      type: "bar",
      data: formRows.map((row) => ({ value: metricValue(row, formMetric), raw: row })),
      label: { show: true, position: "right", formatter: (params) => `n=${params.data.raw.foals}` },
    }],
  });
  formChart?.on("click", (params) => applySearchFilter(`${params.data.raw.ancestor} ${params.data.raw.pattern}`));

  const familyMin = Number(document.querySelector("#familyMinFoals")?.value || 5);
  const familyMetric = document.querySelector("#familyMetric")?.value || "graded_foal_rate";
  const familyRows = (charts.female_family_scatter || []).filter((row) => row.foals >= familyMin);
  const familyChart = renderChart("femaleFamilyScatterChart", {
    color: ["#386fa4"],
    tooltip: {
      formatter: (params) => {
        const row = params.data.raw;
        return `${escapeHtml(row.label)}<br>Foals ${row.foals}<br>G1 ${row.g1_winners} / 重赏 ${row.graded_winners}<br>胜马率 ${formatRate(row.winner_foal_rate)} / 重赏率 ${formatRate(row.graded_foal_rate)}<br>中位奖金 ${money(row.median_earnings_per_runner)}<br>代表马 ${escapeHtml(representativeNames(row))}`;
      },
    },
    grid: { left: 58, right: 36, top: 24, bottom: 48 },
    xAxis: { type: "value", name: "Foals" },
    yAxis: { type: "value", name: familyMetric === "graded_foal_rate" ? "重赏马率" : "胜马率" },
    series: [{
      type: "scatter",
      symbolSize: (value) => Math.max(8, Math.min(46, Math.sqrt(value[2] || 0) / 12)),
      data: familyRows.map((row) => ({ value: [row.foals, metricValue(row, familyMetric), row.total_earnings], name: row.label, raw: row })),
      label: { show: true, formatter: "{b}", position: "right" },
    }],
  });
  familyChart?.on("click", (params) => applyFemaleFamilyFilter(params.data.raw.label));
}

function renderDamAgeCharts(damAge) {
  renderChart("damAgeHistogramChart", {
    color: ["#126b5a"],
    tooltip: { trigger: "axis" },
    grid: { left: 48, right: 22, top: 24, bottom: 36 },
    xAxis: { type: "category", name: "母龄", data: damAge.histogram.map((row) => row.age) },
    yAxis: { type: "value", name: "Foals" },
    series: [{ type: "bar", data: damAge.histogram.map((row) => row.foals) }],
  });
  renderChart("damAgePerformanceChart", {
    color: ["#126b5a", "#b1842f", "#9a3f2f"],
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
    visualMap: { min: 0, max: Math.max(...heatData.map((row) => row[2]), 1), orient: "horizontal", left: "center", bottom: 0, inRange: { color: ["#f3eee6", "#b1842f", "#126b5a"] } },
    series: [{ type: "heatmap", data: heatData, label: { show: true, formatter: (params) => params.value[2] || "—" } }],
  });
}

async function renderPedigreeAnalysis() {
  if (els.pedigreeContent.dataset.loaded) return;
  const [pedigree, damAge] = await Promise.all([
    getAnalytics("pedigree"),
    getAnalytics("dam_age"),
  ]);
  const cross = pedigree.cross;
  const ancestorOptions = [...new Set((pedigree.charts?.ancestor_form_comparison || []).map((row) => row.ancestor).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "ja"));
  els.pedigreeContent.innerHTML = `
    <div class="analysis-title">
      <p class="kicker">血统分析</p>
      <h1>血統分析</h1>
      <p>Cross 已按“祖先 + 位置”重新解析；同一组内按独立产驹数统计。同一匹马可能进入多个 Cross 组，所以各组奖金不能相加当总奖金。</p>
    </div>
    <div class="metric-grid compact-metrics">
      ${metricCard("有Cross产驹", formatNumber(cross.summary.horses_with_cross), `共 ${formatNumber(cross.summary.horses)} 匹`)}
      ${metricCard("解析条目", formatNumber(cross.summary.parsed_entries), "祖先 + 位置")}
      ${metricCard("祖先组", formatNumber(cross.ancestors.length), "不同祖先")}
      ${metricCard("具体形式组", formatNumber(cross.ancestor_patterns.length), "祖先 + Cross")}
    </div>
    ${sectionBlock("Cross祖先规模—效率气泡图", "X轴为Foals，Y轴可切换重赏马率、胜马率、中位奖金和平均奖金；气泡大小为总奖金。点击祖先可筛选产驹列表。",
      `<div class="analysis-controls">
        <label><span>Y轴指标</span><select id="crossBubbleMetric">
          <option value="graded_foal_rate">重赏马率</option>
          <option value="winner_foal_rate">胜马率</option>
          <option value="median_earnings_per_runner">中位奖金</option>
          <option value="avg_earnings_per_foal">平均奖金</option>
        </select></label>
        <label><span>最低Foals</span><input id="crossMinFoals" type="number" min="1" max="50" value="5"></label>
      </div>
      ${chartShell("crossBubbleChart")}
      <p class="source-note">来源：${escapeHtml(pedigree.charts?.source || "当前静态数据库")}；更新：${escapeHtml(pedigree.charts?.updated_at || "—")}</p>`
    )}
    <div class="chart-grid">
      ${sectionBlock("S代 × M代 Cross结构热图", "指标可切换；点击单元格会在图下显示该结构下的具体祖先和代表产驹。",
        `<div class="analysis-controls">
          <label><span>指标</span><select id="structureMetric">
            <option value="foals">产驹数</option>
            <option value="winner_foal_rate">胜马率</option>
            <option value="graded_foal_rate">重赏马率</option>
            <option value="median_earnings_per_runner">中位奖金</option>
          </select></label>
        </div>
        ${chartShell("crossStructureChart")}
        <p class="source-note" id="structureDetail">点击热图单元格查看祖先明细。</p>`
      )}
      ${sectionBlock("指定祖先Cross形式比较", "选择祖先后比较S3×M3、S3×M4、S4×M4、S4×M5和多重Cross等具体形式。",
        `<div class="analysis-controls">
          <label><span>祖先</span><select id="ancestorSelect">
            ${ancestorOptions.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join("")}
          </select></label>
          <label><span>指标</span><select id="ancestorFormMetric">
            <option value="foals">Foals</option>
            <option value="winner_foal_rate">胜马率</option>
            <option value="graded_foal_rate">重赏率</option>
            <option value="median_earnings_per_runner">中位奖金</option>
          </select></label>
        </div>
        ${chartShell("ancestorFormChart")}`
      )}
    </div>
    ${sectionBlock("牝系规模—表现散点图", "X轴为Foals，Y轴可切换重赏马率或胜马率；气泡大小为总奖金。点击牝系可筛选列表。",
      `<div class="analysis-controls">
        <label><span>Y轴指标</span><select id="familyMetric">
          <option value="graded_foal_rate">重赏马率</option>
          <option value="winner_foal_rate">胜马率</option>
        </select></label>
        <label><span>最低Foals</span><input id="familyMinFoals" type="number" min="1" max="50" value="5"></label>
      </div>
      ${chartShell("femaleFamilyScatterChart")}`
    )}
    ${sectionBlock("母马生产年龄分析", "母龄按精确日期或年份推算；unknown 不填0。每项同时保留分子和分母。",
      `<div class="metric-grid compact-metrics">
        ${metricCard("精确母龄", formatNumber(damAge.summary.exact), formatRate(damAge.summary.exact_rate))}
        ${metricCard("年份推算", formatNumber(damAge.summary.year_only), formatRate(damAge.summary.year_only_rate))}
        ${metricCard("未知", formatNumber(damAge.summary.unknown), formatRate(damAge.summary.unknown_rate))}
      </div>
      <div class="chart-grid">
        ${chartBlock("母龄分布", "单位：匹。", "damAgeHistogramChart")}
        ${chartBlock("母龄组表现", "出赛率、胜马率、重赏马率。", "damAgePerformanceChart")}
      </div>
      <div class="chart-grid single-chart">
        ${chartBlock("母龄 × 胎次热图", "颜色为样本数；Tooltip显示胜马和重赏马。", "damAgeOrderHeatChart")}
      </div>`
    )}
    ${sectionBlock("母龄分组明细", "母龄分组的出赛率、胜马率、重赏马率、平均和中位奖金。",
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
    ${sectionBlock("Cross祖先", "按祖先统计独立产驹数、胜马率、重赏率和马匹级生涯奖金。",
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
    ${sectionBlock("祖先 + 具体Cross形式", "查看哪一个祖先的哪一种Cross形式数量最多、成绩更好。",
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
    ${sectionBlock("纯结构层", "去掉祖先名，只看S/M位置组合。",
      analysisTable([
        { label: "Pattern", value: (row) => row.label },
        { label: "Foals", value: (row) => formatNumber(row.foals) },
        { label: "勝馬率", value: (row) => rateWithCount(row.winner_foal_rate, row.winners, row.foals) },
        { label: "重賞馬率", value: (row) => rateWithCount(row.graded_foal_rate, row.graded_winners, row.foals) },
        { label: "総賞金", value: (row) => money(row.total_earnings) },
        { label: "代表馬", value: representativeNames },
      ], cross.structures)
    )}
    ${sectionBlock("牝系表现", "按牝系统计产驹数和成绩，未分类仍是后续需要继续查证的部分。",
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
  wireExpandableTables(els.pedigreeContent);
  const rerender = () => renderPedigreeCharts(pedigree);
  for (const id of ["crossBubbleMetric", "crossMinFoals", "structureMetric", "ancestorSelect", "ancestorFormMetric", "familyMetric", "familyMinFoals"]) {
    els.pedigreeContent.querySelector(`#${id}`)?.addEventListener("change", rerender);
    els.pedigreeContent.querySelector(`#${id}`)?.addEventListener("input", debounce(rerender));
  }
  renderPedigreeCharts(pedigree);
  renderDamAgeCharts(damAge);
  els.pedigreeContent.dataset.loaded = "true";
}

async function renderBreederAnalysis() {
  if (els.breederContent.dataset.loaded) return;
  const breeders = await getAnalytics("breeders");
  els.breederContent.innerHTML = `
    <div class="analysis-title">
      <p class="kicker">牧场分析</p>
      <h1>牧場分析</h1>
      <p>按牧场查看ドゥラメンテ产驹数量、产驹胜马率、赛次胜率、前三率和重赏马来源。集团层只作为补充信息，不替代原牧场口径。</p>
    </div>
    ${sectionBlock("牧场产驹数", "ドゥラメンテ产驹数Top20。这里只看规模，不代表效率。",
      barList(
        breeders.top_foals.slice(0, 20),
        (row) => escapeHtml(row.label),
        (row) => row.foals,
        (row) => `${formatNumber(row.foals)} 匹`
      )
    )}
    ${sectionBlock("牧场胜马率", "只显示Foals ≥ 5的牧场，百分比旁边保留分子/分母。",
      barList(
        breeders.winner_rates.slice(0, 20),
        (row) => escapeHtml(row.label),
        (row) => row.winner_foal_rate || 0,
        (row) => rateWithCount(row.winner_foal_rate, row.winners, row.foals),
        1
      )
    )}
    ${sectionBlock("重赏胜马来源", "这里统计的是独立重赏马匹数，不是重赏胜场数。",
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
    ${sectionBlock("牧场综合表", "胜马率（对产驹）= 胜马 / 产驹；胜率（对出走）= 1着次数 / 有效出走次数。",
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
  wireExpandableTables(els.breederContent);
  els.breederContent.dataset.loaded = "true";
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
    const chartRows = rows
      .filter((row) => row.starts >= data.summary.main_chart_min_starts)
      .sort((a, b) => (b.win_start_rate || 0) - (a.win_start_rate || 0) || b.starts - a.starts);
    els.racecourseContent.querySelector("#racecourseDynamic").innerHTML = `
      ${sectionBlock("胜率 / 前三率", "出走30以上的赛马场。绿色是胜率，金色是前三率，右侧保留分子/分母。",
        groupedBarList(
          chartRows.slice(0, 20),
          (row) => `${escapeHtml(row.label)} <small>${escapeHtml(row.jurisdiction)}</small>`,
          [
            { label: "胜率", className: "win-bar", value: (row) => row.win_start_rate || 0, text: (row) => rateWithCount(row.win_start_rate, row.wins_starts, row.starts) },
            { label: "前三率", className: "show-bar", value: (row) => row.top3_rate || 0, text: (row) => rateWithCount(row.top3_rate, row.top3, row.starts) },
          ]
        )
      )}
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
      ${sectionBlock("赛马场 x 场地", "颜色越深代表比例越高，单元格内显示分子/分母。",
        analysisTable([
          { label: "赛马场", value: (row) => row.label },
          ...surfaceColumns.flatMap((surface) => [
            { label: `${surface}胜率`, value: (row) => heatCell(row, surface, "win"), html: true },
            { label: `${surface}前三率`, value: (row) => heatCell(row, surface, "top3"), html: true },
          ]),
        ], rows.filter((row) => row.starts >= data.summary.main_chart_min_starts), { initialLimit: 20 })
      )}
      ${sectionBlock("赛马场 x 距离", "按距离区间查看胜率。",
        analysisTable([
          { label: "赛马场", value: (row) => row.label },
          ...distanceColumns.map((bucket) => ({ label: bucket, value: (row) => heatCell(row, bucket, "win"), html: true })),
        ], rows.filter((row) => row.starts >= data.summary.main_chart_min_starts), { initialLimit: 20 })
      )}
    `;
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
  const suffix = horse.dam_age_precision === "exact" ? "精确日期" : horse.dam_age_precision === "year_only" ? "按年份估算" : "unknown";
  return `${horse.dam_age_at_foaling}岁（${suffix}）`;
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
      <td class="dam-name">
        <div>${escapeHtml(horse.dam)}</div>
        <div class="muted">${horse.dam_age_at_foaling === null || horse.dam_age_at_foaling === undefined ? "母龄 unknown" : `母龄 ${escapeHtml(horse.dam_age_at_foaling)}岁`}</div>
      </td>
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
      <div class="fact"><span>母出生年</span><strong>${escapeHtml(horse.dam_birth_year || "unknown")}</strong></div>
      <div class="fact"><span>产本胎年龄</span><strong>${escapeHtml(damAgeText(horse))}</strong></div>
      <div class="fact"><span>胎次</span><strong>${escapeHtml(horse.foal_order || "unknown")}</strong></div>
      <div class="fact"><span>母父</span><strong>${escapeHtml(horse.broodmare_sire)}</strong></div>
      <div class="fact"><span>母父系</span><strong>${escapeHtml(horse.bms_line || "Other")}</strong></div>
      <div class="fact"><span>牝系</span><strong>${escapeHtml(horse.female_family || "未分類")}</strong></div>
      <div class="fact fact-cross"><span>クロス</span><strong>${crossItems(horse.pedigree_crosses)}</strong></div>
      <div class="fact"><span>調教師</span><strong>${escapeHtml(horse.trainer)}</strong></div>
      <div class="fact"><span>生産牧場</span><strong>${escapeHtml(horse.breeder)}</strong></div>
      <div class="fact"><span>産地</span><strong>${escapeHtml(horse.birthplace)}</strong></div>
      <div class="fact"><span>通算成績</span><strong>${escapeHtml(horse.career_summary)}</strong></div>
      <div class="fact"><span>母马成绩</span><strong>${escapeHtml(horse.dam_career_summary || "unknown")}</strong></div>
      <div class="fact"><span>母马奖金</span><strong>${escapeHtml(money(horse.dam_earnings))}</strong></div>
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

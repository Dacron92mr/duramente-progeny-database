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
  duramente: "#A92F5D",
  primary: "#A92F5D",
  secondary: "#D85C67",
  plum: "#6F4768",
  rose: "#D85C67",
  coral: "#E56B45",
  gold: "#F0B44D",
  jra: "#9F2D55",
  nar: "#E56B45",
  overseas: "#F2B84B",
  raceLine: "#2f6fa7",
  average: "#c95d77",
  blue: "#6d335f",
  muted: "#D8D0C6",
  soft: "#f6efe9",
  gray: "#d8d5cf",
  negative: "#76657B",
};
const CROP_COLORS = {
  "2018": "#542544",
  "2019": "#9b315d",
  "2020": "#d94b68",
  "2021": "#e96c4c",
  "2022": "#f0b45f",
};

const RACECOURSE_COORDINATES = {
  東京: { lon: 139.485, lat: 35.6625, system: "JRA", prefecture: "東京都", aliases: ["東京競馬場"] },
  中山: { lon: 139.9625, lat: 35.72555556, system: "JRA", prefecture: "千葉県", aliases: ["中山競馬場"] },
  阪神: { lon: 135.363, lat: 34.781083333, system: "JRA", prefecture: "兵庫県", aliases: ["阪神競馬場"] },
  京都: { lon: 135.725, lat: 34.906666666, system: "JRA", prefecture: "京都府", aliases: ["京都競馬場"] },
  中京: { lon: 136.98944444, lat: 35.06673611, system: "JRA", prefecture: "愛知県", aliases: ["中京競馬場"] },
  新潟: { lon: 139.186452, lat: 37.947638, system: "JRA", prefecture: "新潟県", aliases: ["新潟競馬場"] },
  福島: { lon: 140.48252778, lat: 37.76455556, system: "JRA", prefecture: "福島県", aliases: ["福島競馬場"] },
  小倉: { lon: 130.87275, lat: 33.843, system: "JRA", prefecture: "福岡県", aliases: ["小倉競馬場"] },
  札幌: { lon: 141.32555556, lat: 43.07777778, system: "JRA", prefecture: "北海道", aliases: ["札幌競馬場"] },
  函館: { lon: 140.77533333, lat: 41.78063889, system: "JRA", prefecture: "北海道", aliases: ["函館競馬場"] },
  名古屋: { lon: 136.783733348, lat: 35.05244857, system: "NAR", prefecture: "愛知県", aliases: ["名古屋競馬場"] },
  門別: { lon: 142.002972, lat: 42.537944, system: "NAR", prefecture: "北海道", aliases: ["門別競馬場"] },
  園田: { lon: 135.445194, lat: 34.766583, system: "NAR", prefecture: "兵庫県", aliases: ["園田競馬場"] },
  高知: { lon: 133.530556, lat: 33.503194, system: "NAR", prefecture: "高知県", aliases: ["高知競馬場"] },
  大井: { lon: 139.74260833, lat: 35.59133889, system: "NAR", prefecture: "東京都", aliases: ["大井競馬場"] },
  盛岡: { lon: 141.220067, lat: 39.690822, system: "NAR", prefecture: "岩手県", aliases: ["盛岡競馬場"] },
  笠松: { lon: 136.767527777, lat: 35.372166666, system: "NAR", prefecture: "岐阜県", aliases: ["笠松競馬場"] },
  佐賀: { lon: 130.470861, lat: 33.349361, system: "NAR", prefecture: "佐賀県", aliases: ["佐賀競馬場"] },
  金沢: { lon: 136.67475, lat: 36.636444444, system: "NAR", prefecture: "石川県", aliases: ["金沢競馬場"] },
  水沢: { lon: 141.170333, lat: 39.129944, system: "NAR", prefecture: "岩手県", aliases: ["水沢競馬場"] },
  川崎: { lon: 139.710667, lat: 35.532361, system: "NAR", prefecture: "神奈川県", aliases: ["川崎競馬場"] },
  船橋: { lon: 139.99777778, lat: 35.68472222, system: "NAR", prefecture: "千葉県", aliases: ["船橋競馬場"] },
  浦和: { lon: 139.670389, lat: 35.857806, system: "NAR", prefecture: "埼玉県", aliases: ["浦和競馬場"] },
  姫路: { lon: 134.701222, lat: 34.856278, system: "NAR", prefecture: "兵庫県", aliases: ["姫路競馬場"] },
};

const RACECOURSE_LABEL_LAYOUT = {
  東京: { position: "left", offset: [-10, 0], leader: [-0.23, 0.03] },
  中山: { position: "right", offset: [8, 8], leader: [0.23, 0.05] },
  札幌: { position: "top", offset: [0, -6] },
  函館: { position: "bottom", offset: [0, 8] },
  福島: { position: "right", offset: [8, -4] },
  新潟: { position: "left", offset: [-8, 0] },
  中京: { position: "right", offset: [8, 4], leader: [0.22, 0.03] },
  京都: { position: "top", offset: [0, -8], leader: [0.17, 0.08] },
  阪神: { position: "bottom", offset: [0, 8], leader: [-0.16, -0.07] },
  小倉: { position: "left", offset: [-8, 0] },
  大井: { position: "bottom", offset: [0, 8], leader: [-0.18, -0.1] },
  川崎: { position: "left", offset: [-8, 2], leader: [-0.25, -0.02] },
  船橋: { position: "right", offset: [8, -2], leader: [0.25, 0.02] },
  浦和: { position: "top", offset: [0, -8], leader: [-0.16, 0.14] },
  園田: { position: "right", offset: [8, 6], leader: [0.19, -0.04] },
  姫路: { position: "left", offset: [-8, 0], leader: [-0.17, 0.04] },
};

const RACECOURSE_ALIAS_TO_CANONICAL = Object.fromEntries(
  Object.entries(RACECOURSE_COORDINATES).flatMap(([name, info]) => [
    [name, name],
    [`${name}競馬場`, name],
    ...((info.aliases || []).map((alias) => [alias, name])),
  ]),
);

let japanGeoJsonPromise = null;

const JAPAN_RACING_MAP_BOUNDS = {
  west: 128,
  south: 30,
  east: 146.5,
  north: 46.2,
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
        note: current?.note || (item.category === "jra_overall" ? "" : "该分类暂缺可靠公开榜单。"),
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
  if (age === null || age === undefined || age === "") return "未知";
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

function representativeGradeClass(value) {
  const grade = String(value || "").toLowerCase();
  if (grade.includes("g1") || grade === "gⅠ".toLowerCase()) return "grade-g1";
  if (grade.includes("g2") || grade === "gⅡ".toLowerCase()) return "grade-g2";
  if (grade.includes("g3") || grade === "gⅢ".toLowerCase()) return "grade-g3";
  if (grade.includes("listed")) return "grade-listed";
  return "grade-other";
}

function representativeNameText(rep) {
  return [rep.name, rep.hkjc_name_zh ? `（${rep.hkjc_name_zh}）` : ""].filter(Boolean).join("");
}

function representativeItem(rep) {
  const grade = rep.achievement_class || rep.grade || "";
  return `
    <span class="representative-horse-item">
      <span class="representative-horse-name">${escapeHtml(representativeNameText(rep))}</span>
      ${grade ? `<span class="grade-pill ${representativeGradeClass(grade)}">${escapeHtml(grade)}</span>` : ""}
    </span>
  `;
}

function renderRepresentativeHorses(reps, options = {}) {
  const rows = Array.isArray(reps) ? reps : [];
  if (!rows.length) return "—";
  const limit = options.limit ?? 2;
  const first = rows.slice(0, limit).map(representativeItem).join("");
  const rest = rows.slice(limit).map(representativeItem).join("");
  if (!rest) return `<span class="rep-list representative-list">${first}</span>`;
  const id = `rep-${++tableCounter}`;
  return `
    <span class="rep-list representative-list" id="${id}">
      ${first}
      <span class="rep-more" hidden>${rest}</span>
      <button class="rep-toggle rep-toggle-pill" type="button" data-rep-toggle="${id}" aria-expanded="false" data-open-label="+${rows.length - limit}" data-close-label="收起">+${rows.length - limit}</button>
    </span>
  `;
}

function representativeCell(row) {
  const reps = row.representatives || [];
  if (!reps.length) return "—";
  return renderRepresentativeHorses(reps);
}

function compactRepresentativeCell(row) {
  return representativeCell(row);
}

function crossPatternText(pattern) {
  return String(pattern || "—").replaceAll("x", "×");
}

function percentText(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return `${Number(value).toFixed(1)}%`;
}

function sortedRepresentativesForHorses(horses) {
  return [...horses]
    .sort((a, b) => Number(b.earnings_netkeiba || b.earnings_jbis || 0) - Number(a.earnings_netkeiba || a.earnings_jbis || 0))
    .slice(0, 6)
    .map((horse) => ({
      name: horse.name,
      hkjc_name_zh: horse.hkjc_name_zh,
      achievement_class: horse.achievement_class,
      major_win: horse.major_win,
      earnings: horse.earnings_netkeiba ?? horse.earnings_jbis,
    }));
}

async function broodmareRowsFromLoadedHorses() {
  const horses = isStaticMode()
    ? await getStaticHorses()
    : (await getJson("/api/horses?limit=1000&offset=0")).horses || [];
  const groups = new Map();
  for (const horse of horses) {
    const dam = horse.dam || "—";
    if (!dam || dam === "—") continue;
    if (!groups.has(dam)) {
      groups.set(dam, {
        label: dam,
        foals: 0,
        runners: 0,
        winners: 0,
        graded_winners: 0,
        g1_winners: 0,
        total_earnings: 0,
        broodmare_sire: horse.broodmare_sire || "—",
        representatives: [],
        _horses: [],
      });
    }
    const group = groups.get(dam);
    group.foals += 1;
    const summary = String(horse.career_summary || "");
    const winsMatch = summary.match(/(\d+)勝/);
    const wins = winsMatch ? Number(winsMatch[1]) : 0;
    if (summary || Number(horse.earnings_netkeiba || horse.earnings_jbis || 0) > 0) group.runners += 1;
    if (wins > 0) group.winners += 1;
    if (["G1", "G2", "G3"].includes(horse.achievement_class)) group.graded_winners += 1;
    if (horse.achievement_class === "G1") group.g1_winners += 1;
    group.total_earnings += Number(horse.earnings_netkeiba ?? horse.earnings_jbis ?? 0);
    group._horses.push(horse);
  }
  return [...groups.values()]
    .map((row) => {
      row.winner_foal_rate = row.foals ? row.winners / row.foals : 0;
      row.graded_foal_rate = row.foals ? row.graded_winners / row.foals : 0;
      row.representatives = sortedRepresentativesForHorses(row._horses);
      delete row._horses;
      return row;
    })
    .sort((a, b) => b.foals - a.foals || b.total_earnings - a.total_earnings)
    .slice(0, 30);
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
    missing_data: "数据局限",
  };
  return labels[key] || key;
}

function chartShell(id) {
  return `<div class="chart-canvas" id="${escapeHtml(id)}"><div class="chart-loading">图表加载中</div></div>`;
}

function renderChart(id, option) {
  const el = document.getElementById(id);
  if (!el) return null;
  el.classList.remove("is-rendered");
  if (!window.echarts) {
    el.innerHTML = `<div class="chart-fallback">图表暂时无法显示，可先查看下方表格。</div>`;
    return null;
  }
  if (chartRegistry.has(id)) chartRegistry.get(id).dispose();
  const chart = window.echarts.init(el);
  chart.setOption({ animationDuration: 450, ...option });
  el.classList.add("is-rendered");
  chartRegistry.set(id, chart);
  if (!chartResizeBound) {
    window.addEventListener("resize", () => {
      for (const item of chartRegistry.values()) item.resize();
    });
    chartResizeBound = true;
  }
  return chart;
}

function canonicalRacecourseName(value) {
  const text = String(value || "").replace(/\s+/g, "").replace(/\(.*?\)/g, "");
  return RACECOURSE_ALIAS_TO_CANONICAL[text] || RACECOURSE_ALIAS_TO_CANONICAL[text.replace(/競馬場$/, "")] || text;
}

function racecourseCoordinate(row) {
  return RACECOURSE_COORDINATES[canonicalRacecourseName(row.label)];
}

function racecourseSymbolDiameter(wins, maxWins) {
  const minRadius = 4.5;
  const scaleRange = 17;
  return (minRadius + Math.sqrt(Math.max(Number(wins) || 0, 0) / Math.max(maxWins, 1)) * scaleRange) * 2;
}

function racecoursePoint(row, maxWins, options = {}) {
  const name = canonicalRacecourseName(row.label);
  const coord = RACECOURSE_COORDINATES[name];
  if (!coord) return null;
  const wins = Number(row.wins_starts || 0);
  const winRate = Number(((row.win_start_rate || 0) * 100).toFixed(1));
  const top3Rate = Number(((row.top3_rate || 0) * 100).toFixed(1));
  const layout = RACECOURSE_LABEL_LAYOUT[name] || {};
  return {
    name,
    value: [coord.lon, coord.lat, wins, winRate, Number(row.starts || 0), Number(row.top3 || 0), top3Rate],
    symbolSize: racecourseSymbolDiameter(wins, maxWins),
    raw: row,
    system: coord.system,
    prefecture: coord.prefecture,
    leader: options.showLabel && layout.leader ? layout.leader : null,
    label: {
      show: Boolean(options.showLabel && !layout.leader),
      position: layout.position || "right",
      offset: layout.offset || [6, 0],
    },
  };
}

async function getJapanGeoJson() {
  if (!japanGeoJsonPromise) {
    const base = window.STATIC_DATA_BASE || "/data";
    japanGeoJsonPromise = fetch(`${base}/japan-prefectures.geojson`).then((response) => {
      if (!response.ok) throw new Error("地图数据暂时无法加载");
      return response.json();
    });
  }
  return japanGeoJsonPromise;
}

function coordinateInRacingMapBounds(coord) {
  const [lon, lat] = coord;
  return lon >= JAPAN_RACING_MAP_BOUNDS.west
    && lon <= JAPAN_RACING_MAP_BOUNDS.east
    && lat >= JAPAN_RACING_MAP_BOUNDS.south
    && lat <= JAPAN_RACING_MAP_BOUNDS.north;
}

function ringTouchesRacingMapBounds(ring) {
  return Array.isArray(ring) && ring.some(coordinateInRacingMapBounds);
}

function polygonTouchesRacingMapBounds(polygon) {
  return Array.isArray(polygon) && polygon.some(ringTouchesRacingMapBounds);
}

function geometryForRacingMap(geometry) {
  if (!geometry) return null;
  if (geometry.type === "Polygon") {
    return polygonTouchesRacingMapBounds(geometry.coordinates) ? geometry : null;
  }
  if (geometry.type === "MultiPolygon") {
    const polygons = geometry.coordinates.filter(polygonTouchesRacingMapBounds);
    return polygons.length ? { ...geometry, coordinates: polygons } : null;
  }
  return null;
}

function racingMapGeoJson(geoJson) {
  return {
    ...geoJson,
    features: geoJson.features
      .map((feature) => ({ ...feature, geometry: geometryForRacingMap(feature.geometry) }))
      .filter((feature) => feature.geometry),
  };
}

function racecourseMapTooltip(params) {
  if (params.seriesType !== "scatter" || params.seriesName.includes("外环")) return params.name || "";
  const [, , wins, winRate, starts, top3, top3Rate] = params.value;
  const system = params.data?.system || "—";
  return [
    `<strong>${escapeHtml(params.name)}競馬場</strong>`,
    `所属系统：${escapeHtml(system)}`,
    `勝場数：${formatNumber(wins)}`,
    `出赛：${formatNumber(starts)}`,
    `胜率：${formatNumber(winRate, 1)}%`,
    `前三率：${formatNumber(top3Rate, 1)}%（${formatNumber(top3)}/${formatNumber(starts)}）`,
  ].join("<br>");
}

function mapGeoComponent(name, layout) {
  return {
    map: "japan-racing-main",
    name,
    roam: false,
    layoutCenter: layout.layoutCenter,
    layoutSize: layout.layoutSize,
    center: layout.center,
    zoom: layout.zoom,
    label: { show: false },
    itemStyle: {
      areaColor: "#f4f0eb",
      borderColor: "#d8d0c8",
      borderWidth: 0.55,
    },
    emphasis: {
      disabled: true,
      label: { show: false },
      itemStyle: { areaColor: "#eee7e0" },
    },
  };
}

function racecourseScatterSeries(name, geoIndex, points, options = {}) {
  return {
    name,
    type: "scatter",
    coordinateSystem: "geo",
    geoIndex,
    data: points,
    zlevel: options.zlevel || 2,
    silent: Boolean(options.silent),
    symbol: "circle",
    symbolSize(value, params) {
      return params?.data?.symbolSize || racecourseSymbolDiameter(value?.[2], options.maxWins || 1);
    },
    itemStyle: options.itemStyle || {
      borderColor: "#fff",
      borderWidth: 1.6,
    },
    label: options.label || {
      formatter: "{b}",
      color: "#302a27",
      fontSize: 11,
      fontWeight: 800,
      textBorderColor: "#fff",
      textBorderWidth: 3,
    },
    emphasis: {
      scale: true,
      label: {
        show: true,
        formatter: "{b}",
        color: "#1f1f1f",
        fontWeight: 900,
        textBorderColor: "#fff",
        textBorderWidth: 4,
      },
    },
  };
}

function racecourseLeaderLabelPoints(points) {
  return points.filter((point) => point.leader).map((point) => {
    const [lon, lat, wins, winRate, starts, top3, top3Rate] = point.value;
    const [dx, dy] = point.leader;
    return {
      ...point,
      value: [lon + dx, lat + dy, wins, winRate, starts, top3, top3Rate],
      symbolSize: 0,
      label: {
        show: true,
        formatter: "{b}",
        color: "#302a27",
        fontSize: 11,
        fontWeight: 850,
        textBorderColor: "#fff",
        textBorderWidth: 3,
      },
      itemStyle: { color: "rgba(0,0,0,0)" },
    };
  });
}

function racecourseLeaderLineSeries(name, geoIndex, points) {
  const data = points.filter((point) => point.leader).map((point) => {
    const [lon, lat] = point.value;
    const [dx, dy] = point.leader;
    return { coords: [[lon, lat], [lon + dx, lat + dy]], name: point.name };
  });
  return {
    name,
    type: "lines",
    coordinateSystem: "geo",
    geoIndex,
    data,
    zlevel: 1,
    silent: true,
    symbol: ["none", "none"],
    lineStyle: {
      color: "rgba(94, 82, 75, 0.42)",
      width: 0.8,
      type: "solid",
    },
  };
}

function renderRacecourseMapLegend(scope, rows, maxWins, maxWinRate) {
  const visibleRows = rows.filter((row) => ["JRA", "NAR"].includes(row.jurisdiction) && racecourseCoordinate(row));
  const rankRows = visibleRows.slice()
    .sort((a, b) => b.wins_starts - a.wins_starts || b.starts - a.starts)
    .slice(0, 8);
  const legendWins = [10, 50, 100].filter((value) => value <= Math.max(maxWins, 10));
  if (!legendWins.includes(maxWins) && maxWins < 100) legendWins.push(maxWins);
  const label = scope === "All" ? "全部" : scope;
  const totalWins = visibleRows.reduce((sum, row) => sum + Number(row.wins_starts || 0), 0);
  const totalStarts = visibleRows.reduce((sum, row) => sum + Number(row.starts || 0), 0);
  const totalTop3 = visibleRows.reduce((sum, row) => sum + Number(row.top3 || 0), 0);
  const top = rankRows[0];
  const panel = document.querySelector("#racecourseMapLegend");
  if (!panel) return;
  panel.innerHTML = `
    <div class="race-map-panel-section">
      <span class="mini-label">显示范围</span>
      <strong>${escapeHtml(label)}</strong>
      <p>${formatNumber(visibleRows.length)} 个赛马场，${formatNumber(totalWins)} 胜 / ${formatNumber(totalStarts)} 出赛。</p>
    </div>
    <div class="race-map-panel-section">
      <span class="mini-label">圆圈面积</span>
      <div class="size-legend">
        ${legendWins.map((wins) => {
          const diameter = racecourseSymbolDiameter(wins, maxWins);
          return `<span><i style="width:${diameter}px;height:${diameter}px"></i>${formatNumber(wins)}胜</span>`;
        }).join("")}
      </div>
    </div>
    <div class="race-map-panel-section">
      <span class="mini-label">胜率色阶</span>
      <div class="rate-legend"><span></span></div>
      <div class="legend-scale"><small>0%</small><small>${formatNumber(maxWinRate, 1)}%</small></div>
    </div>
    <div class="race-map-panel-section">
      <span class="mini-label">系统标记</span>
      <div class="system-legend">
        <span><i class="jra-dot"></i>JRA</span>
        <span><i class="nar-dot"></i>NAR 外环</span>
      </div>
    </div>
    <div class="race-map-panel-section">
      <span class="mini-label">胜场排行</span>
      <ol class="race-map-ranking">
        ${rankRows.map((row) => `<li><span>${escapeHtml(row.label)}</span><strong>${formatNumber(row.wins_starts)}</strong><small>${formatRate(row.win_start_rate)}</small></li>`).join("")}
      </ol>
      ${top ? `<p class="source-note">最多胜场：${escapeHtml(top.label)}，${formatNumber(top.wins_starts)}胜。</p>` : ""}
    </div>
  `;
}

async function renderRacecourseMap(scope, rows, allRows) {
  const geoJson = await getJapanGeoJson();
  if (!window.echarts) return renderChart("racecourseJapanMap", {});
  window.echarts.registerMap("japan-racing-main", racingMapGeoJson(geoJson));

  const allJapanRows = allRows.filter((row) => ["JRA", "NAR"].includes(row.jurisdiction) && racecourseCoordinate(row));
  const maxWins = Math.max(...allJapanRows.map((row) => Number(row.wins_starts || 0)), 1);
  const maxWinRate = Math.max(...allJapanRows.map((row) => Number((row.win_start_rate || 0) * 100)), 1);
  const visibleRows = rows.filter((row) => ["JRA", "NAR"].includes(row.jurisdiction) && racecourseCoordinate(row));
  const topNames = new Set(visibleRows.slice().sort((a, b) => b.wins_starts - a.wins_starts).slice(0, 7).map((row) => canonicalRacecourseName(row.label)));
  const mainPoints = visibleRows.map((row) => {
    const name = canonicalRacecourseName(row.label);
    const showLabel = window.innerWidth > 760 && (scope === "JRA" || RACECOURSE_COORDINATES[name]?.system === "JRA" || topNames.has(name));
    return racecoursePoint(row, maxWins, { showLabel });
  }).filter(Boolean);
  const narPoints = (points) => points.filter((point) => point.system === "NAR").map((point) => ({
    ...point,
    symbolSize: (point.symbolSize || 0) + 5,
    itemStyle: { color: "rgba(0,0,0,0)", borderColor: "#5c2d4d", borderWidth: 1.4 },
    label: { show: false },
  }));
  const chart = renderChart("racecourseJapanMap", {
    tooltip: { trigger: "item", formatter: racecourseMapTooltip },
    visualMap: {
      min: 0,
      max: Math.ceil(maxWinRate),
      dimension: 3,
      seriesIndex: [1],
      orient: "vertical",
      right: 22,
      bottom: 26,
      itemWidth: 10,
      itemHeight: 92,
      text: ["高胜率", "低胜率"],
      textGap: 8,
      textStyle: { color: "#675c56", fontWeight: 700, fontSize: 11 },
      inRange: { color: ["#FDE7A9", "#F7C65D", "#F39A3D", "#E85D3F", "#A92F4F"] },
      calculable: false,
    },
    geo: mapGeoComponent("日本", {
      layoutCenter: ["48%", "52%"],
      layoutSize: "96%",
    }),
    series: [
      racecourseScatterSeries("NAR外环", 0, narPoints(mainPoints), { maxWins, silent: true, zlevel: 1, itemStyle: { color: "rgba(0,0,0,0)", borderColor: "#5c2d4d", borderWidth: 1.4 }, label: { show: false } }),
      racecourseScatterSeries("赛马场", 0, mainPoints, { maxWins }),
      racecourseLeaderLineSeries("全国标签引导线", 0, mainPoints),
      racecourseScatterSeries("全国标签", 0, racecourseLeaderLabelPoints(mainPoints), { maxWins, silent: true, zlevel: 3, itemStyle: { color: "rgba(0,0,0,0)" } }),
    ],
  });
  if (chart) {
    chart.off("click");
    chart.on("click", (params) => {
      if (params.seriesType === "scatter" && !params.seriesName.includes("外环")) {
        console.log("racecourse-map-click", params.name);
      }
    });
  }
  renderRacecourseMapLegend(scope, visibleRows, maxWins, maxWinRate);
  return { maxWins, maxWinRate, visibleRows };
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

function weightedRate(rows, numeratorKey, denominatorKey) {
  const numerator = rows.reduce((sum, row) => sum + Number(row[numeratorKey] || 0), 0);
  const denominator = rows.reduce((sum, row) => sum + Number(row[denominatorKey] || 0), 0);
  return denominator ? numerator / denominator : 0;
}

function minimumSampleFilter(rows, minFoals) {
  return rows.filter((row) => Number(row.foals || 0) >= Number(minFoals || 0));
}

function sqrtSymbolSize(value, maxValue, minSize = 10, maxSize = 44) {
  const max = Math.max(Number(maxValue || 0), 1);
  const current = Math.max(Number(value || 0), 0);
  return minSize + Math.sqrt(current / max) * (maxSize - minSize);
}

function ratioLine(value, label, axis = "xAxis") {
  return {
    silent: true,
    symbol: "none",
    lineStyle: { color: COLORS.muted, type: "dashed", width: 1.2 },
    label: { formatter: label, color: "#6b625b", fontSize: 11, fontWeight: 800 },
    data: [{ [axis]: Number((value * 100).toFixed(1)) }],
  };
}

function rateTooltip(label, value, numerator, denominator) {
  return `${label}：${formatRate(value)}（${formatNumber(numerator)}/${formatNumber(denominator)}匹产驹）`;
}

function rankingMetricMeta(metric) {
  const map = {
    foals: { label: "产驹数", unit: "匹", type: "bar", value: (row) => row.foals || 0, formatter: (value) => `${formatNumber(value)}匹` },
    total_earnings: { label: "总奖金", unit: "万円", type: "bar", value: (row) => row.total_earnings || 0, formatter: money },
    winner_foal_rate: { label: "胜马率", unit: "%", type: "point", value: (row) => Number(((row.winner_foal_rate || 0) * 100).toFixed(1)), formatter: (value, row) => rateTooltip("胜马率", row.winner_foal_rate, row.winners, row.foals), numeratorKey: "winners" },
    graded_foal_rate: { label: "重赏马率", unit: "%", type: "point", value: (row) => Number(((row.graded_foal_rate || 0) * 100).toFixed(1)), formatter: (value, row) => rateTooltip("重赏马率", row.graded_foal_rate, row.graded_winners, row.foals), numeratorKey: "graded_winners" },
    graded_winners: { label: "重赏胜马数", unit: "匹", type: "bar", value: (row) => row.graded_winners || 0, formatter: (value) => `${formatNumber(value)}匹` },
    median_earnings_per_runner: { label: "中位奖金", unit: "万円", type: "point", value: (row) => row.median_earnings_per_runner || 0, formatter: money },
  };
  return map[metric] || map.foals;
}

function rankingChartHeight(rows, minHeight = 320) {
  return Math.max(minHeight, Math.min(640, rows.length * 28 + 96));
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
    if (button.dataset.tableWired === "true") continue;
    button.dataset.tableWired = "true";
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
  wireAnalysisFilters(container);
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

function renderLeadingSourceDetails(rows) {
  const seen = new Set();
  const items = (rows || [])
    .filter((row) => row.source_url)
    .map((row) => ({
      year: row.year,
      category: row.category_label || row.category,
      source_url: row.source_url,
      retrieved_at: row.retrieved_at,
    }))
    .filter((row) => {
      const key = `${row.year}|${row.category}|${row.source_url}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => Number(a.year) - Number(b.year) || String(a.category).localeCompare(String(b.category), "ja"));
  if (!items.length) return "";
  return `
    <details class="source-details">
      <summary>数据来源与口径</summary>
      <div class="analysis-table-wrap source-detail-table">
        <table class="analysis-table">
          <thead><tr><th>年份</th><th>分类</th><th>来源</th><th>更新</th></tr></thead>
          <tbody>
            ${items.map((row) => `
              <tr>
                <td>${escapeHtml(row.year)}</td>
                <td>${escapeHtml(row.category)}</td>
                <td><a href="${escapeHtml(row.source_url)}" target="_blank" rel="noreferrer">查看来源</a></td>
                <td>${escapeHtml(row.retrieved_at || "—")}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    </details>
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

function applyBreederFilter(value) {
  state.breeder = value;
  setSelectValue(els.breeder, value);
  state.offset = 0;
  showView("progeny");
  loadHorses();
}

async function openHorseDetailFromChart(name) {
  const query = String(name || "").trim();
  if (!query) return;
  const result = await getJson(`/api/horses?q=${encodeURIComponent(query)}&limit=20&offset=0`);
  const horses = result.horses || [];
  const exact = horses.find((horse) => [horse.name, horse.name_en, horse.hkjc_name_zh].filter(Boolean).some((item) => String(item) === query));
  const target = exact || horses[0];
  if (target?.id) {
    openHorse(target.id);
  } else {
    applySearchFilter(query);
  }
}

function wireAnalysisFilters(container) {
  for (const button of container.querySelectorAll("[data-bms-filter]")) {
    if (button.dataset.bmsWired === "true") continue;
    button.dataset.bmsWired = "true";
    button.addEventListener("click", () => applyBmsFilter(button.dataset.bmsFilter));
  }
  for (const button of container.querySelectorAll("[data-broodmare-sire-filter]")) {
    if (button.dataset.broodmareSireWired === "true") continue;
    button.dataset.broodmareSireWired = "true";
    button.addEventListener("click", () => applyBroodmareSireFilter(button.dataset.broodmareSireFilter));
  }
  for (const button of container.querySelectorAll("[data-search-filter]")) {
    if (button.dataset.searchWired === "true") continue;
    button.dataset.searchWired = "true";
    button.addEventListener("click", () => applySearchFilter(button.dataset.searchFilter));
  }
  for (const button of container.querySelectorAll("[data-female-family-filter]")) {
    if (button.dataset.familyWired === "true") continue;
    button.dataset.familyWired = "true";
    button.addEventListener("click", () => applyFemaleFamilyFilter(button.dataset.femaleFamilyFilter));
  }
  for (const button of container.querySelectorAll("[data-breeder-filter]")) {
    if (button.dataset.breederWired === "true") continue;
    button.dataset.breederWired = "true";
    button.addEventListener("click", () => applyBreederFilter(button.dataset.breederFilter));
  }
  for (const button of container.querySelectorAll("[data-horse-name]")) {
    if (button.dataset.horseWired === "true") continue;
    button.dataset.horseWired = "true";
    button.addEventListener("click", () => openHorseDetailFromChart(button.dataset.horseName));
  }
  for (const button of container.querySelectorAll("[data-rep-toggle]")) {
    if (button.dataset.repWired === "true") continue;
    button.dataset.repWired = "true";
    button.addEventListener("click", () => {
      const target = container.querySelector(`#${CSS.escape(button.dataset.repToggle)}`);
      const more = target?.querySelector(".rep-more");
      if (!more) return;
      const expanded = button.getAttribute("aria-expanded") === "true";
      more.hidden = expanded;
      button.setAttribute("aria-expanded", expanded ? "false" : "true");
      button.textContent = expanded ? button.dataset.openLabel : button.dataset.closeLabel;
    });
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

function renderCropComboChart(id, crops, config) {
  const labels = crops.map((row) => row.label);
  const barValues = crops.map((row) => Number(row[config.barKey] || 0));
  const lineValues = crops.map((row) => {
    const value = Number(row[config.lineKey] || 0);
    return config.lineRate ? Number((value * 100).toFixed(1)) : Number(value.toFixed ? value.toFixed(1) : value);
  });
  renderChart(id, {
    color: [config.barColor || COLORS.coral, config.lineColor || COLORS.raceLine],
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (items) => {
        const row = items[0]?.data?.raw;
        if (!row) return "";
        return [
          `${row.label}年生`,
          `产驹数：${formatNumber(row.foals)} / 出赛马：${formatNumber(row.runners)}`,
          `${config.barName}：${config.barFormatter(row[config.barKey])}`,
          `${config.lineName}：${config.lineFormatter(row[config.lineKey], row)}`,
        ].join("<br>");
      },
    },
    legend: { top: 0, data: [config.barName, config.lineName] },
    grid: { left: 46, right: 58, top: 54, bottom: 38, containLabel: true },
    xAxis: { type: "category", data: labels },
    yAxis: [
      { type: "value", name: config.barUnit, minInterval: config.barInteger ? 1 : undefined },
      { type: "value", name: config.lineUnit, axisLabel: { formatter: config.lineRate ? (value) => `${value}%` : undefined } },
    ],
    series: [
      {
        name: config.barName,
        type: "bar",
        barMaxWidth: 24,
        data: crops.map((row, index) => ({ value: barValues[index], raw: row })),
        label: { show: true, position: "top", formatter: (params) => config.barLabel(params.data.raw) },
      },
      {
        name: config.lineName,
        type: "line",
        yAxisIndex: 1,
        symbolSize: 8,
        lineStyle: { width: 3 },
        data: crops.map((row, index) => ({ value: lineValues[index], raw: row })),
        label: { show: true, formatter: (params) => config.lineLabel(params.data.raw), color: "#1f1e18" },
      },
    ],
  });
}

function renderCropAchievementChart(crops) {
  const stages = [
    { key: "foals", label: "产驹", count: (row) => row.foals || 0 },
    { key: "runners", label: "出赛", count: (row) => row.runners || 0 },
    { key: "winners", label: "胜马", count: (row) => row.winners || 0 },
    { key: "two_win_horses", label: "2胜以上", count: (row) => row.two_win_horses || 0 },
    { key: "three_win_horses", label: "3胜以上", count: (row) => row.three_win_horses || 0 },
    { key: "graded_winners", label: "重赏马", count: (row) => row.graded_winners || 0 },
    { key: "g1_horses", label: "G1马", count: (row) => row.g1_horses || 0 },
  ];
  renderChart("sireAchievementStepChart", {
    color: crops.map((row) => cropColor(row.label)),
    tooltip: {
      trigger: "axis",
      formatter: (items) => {
        const stage = items[0]?.data?.stage;
        if (!stage) return "";
        return [
          stage.label,
          ...items.map((item) => {
            const row = item.data.raw;
            const count = stage.count(row);
            const foalRate = row.foals ? count / row.foals : 0;
            const runnerRate = row.runners ? count / row.runners : null;
            const runnerText = stage.key !== "foals" && row.runners ? ` / 占出赛马 ${formatRate(runnerRate)}` : "";
            return `${item.marker}${row.label}年生：${formatNumber(count)}匹 / 占产驹 ${formatRate(foalRate)}${runnerText}`;
          }),
        ].join("<br>");
      },
    },
    legend: { top: 0, type: "scroll" },
    grid: { left: 48, right: 24, top: 52, bottom: 42, containLabel: true },
    xAxis: { type: "category", data: stages.map((stage) => stage.label) },
    yAxis: { type: "value", name: "%", axisLabel: { formatter: (value) => `${value}%` } },
    series: crops.map((row) => ({
      name: row.label,
      type: "line",
      step: "middle",
      symbolSize: 8,
      itemStyle: { color: cropColor(row.label) },
      lineStyle: { color: cropColor(row.label), width: 2.2 },
      data: stages.map((stage) => ({
        value: row.foals ? Number(((stage.count(row) / row.foals) * 100).toFixed(1)) : 0,
        raw: row,
        stage,
      })),
    })),
  });
}

function renderCropAwdDumbbellChart(crops) {
  const rows = crops.filter((row) => row.turf_awd || row.dirt_awd);
  const turfColor = "#4f8a62";
  const dirtColor = "#9a6b45";
  renderChart("sireAwdDumbbellChart", {
    color: [turfColor, dirtColor],
    tooltip: {
      trigger: "item",
      formatter: (params) => {
        const row = params.data.raw;
        return [
          `${row.label}年生`,
          `芝平均胜距：${row.turf_awd ? `${formatNumber(row.turf_awd, 0)}m` : "—"}`,
          `泥地平均胜距：${row.dirt_awd ? `${formatNumber(row.dirt_awd, 0)}m` : "—"}`,
        ].join("<br>");
      },
    },
    legend: { top: 0, data: ["芝", "泥地"] },
    grid: { left: 58, right: 44, top: 52, bottom: 40, containLabel: true },
    xAxis: { type: "value", name: "m", min: (value) => Math.max(0, Math.floor((value.min || 0) / 100) * 100 - 100) },
    yAxis: { type: "category", data: rows.map((row) => row.label) },
    series: [
      {
        name: "芝泥差",
        type: "custom",
        silent: true,
        data: rows.map((row) => ({ value: [row.turf_awd || row.dirt_awd || 0, row.dirt_awd || row.turf_awd || 0, row.label], raw: row })),
        renderItem: (params, api) => {
          const turf = api.value(0);
          const dirt = api.value(1);
          const label = api.value(2);
          const p1 = api.coord([turf, label]);
          const p2 = api.coord([dirt, label]);
          return {
            type: "line",
            shape: { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1] },
            style: { stroke: "#d5cbc1", lineWidth: 3, lineCap: "round" },
          };
        },
      },
      {
        name: "芝",
        type: "scatter",
        symbolSize: 12,
        itemStyle: { color: turfColor },
        data: rows.map((row) => ({ value: [row.turf_awd || null, row.label], raw: row })),
        label: { show: true, position: "left", formatter: (params) => params.value[0] ? `${formatNumber(params.value[0], 0)}m` : "" },
      },
      {
        name: "泥地",
        type: "scatter",
        symbolSize: 12,
        itemStyle: { color: dirtColor },
        data: rows.map((row) => ({ value: [row.dirt_awd || null, row.label], raw: row })),
        label: { show: true, position: "right", formatter: (params) => params.value[0] ? `${formatNumber(params.value[0], 0)}m` : "" },
      },
    ],
  });
}

function gradedClass(grade) {
  const value = String(grade || "").toUpperCase();
  if (value.includes("G1")) return "grade-g1";
  if (value.includes("G2")) return "grade-g2";
  return "grade-g3";
}

function renderGradedWinsTimelineList(rows, mode = "year") {
  const target = document.querySelector("#gradedWinsEventList");
  if (!target) return;
  const sorted = [...rows].sort((a, b) => String(a.race_date || "").localeCompare(String(b.race_date || "")));
  const groups = new Map();
  for (const row of sorted) {
    const key = mode === "horse" ? row.horse || "—" : String(row.race_date || "").slice(0, 4) || "—";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  const groupRows = [...groups.entries()].sort((a, b) => mode === "horse" ? b[1].length - a[1].length || a[0].localeCompare(b[0], "ja") : Number(b[0]) - Number(a[0]));
  const showAll = target.dataset.timelineShowAll === "true";
  const defaultLimit = mode === "year" ? 2 : 6;
  const visibleGroups = showAll ? groupRows : groupRows.slice(0, defaultLimit);
  const toggleText = mode === "year"
    ? (showAll ? "收起较早年份" : "查看全部年份")
    : (showAll ? "收起更多胜马" : "查看全部胜马");
  target.innerHTML = `
    <div class="graded-timeline-list">
      ${visibleGroups.map(([group, events], index) => `
        <details class="graded-timeline-group" ${mode === "year" && index < 2 ? "open" : ""}>
          <summary aria-expanded="${mode === "year" && index < 2 ? "true" : "false"}">
            <span>${escapeHtml(group)}</span>
            <em>${formatNumber(events.length)}胜</em>
          </summary>
          <div class="graded-events">
            ${events.map((row) => `
              <article class="graded-event">
                <span class="grade-pill ${gradedClass(row.grade_group || row.grade)}">${escapeHtml(row.grade_group || row.grade || "G")}</span>
                <span class="event-date">${escapeHtml(row.race_date)}</span>
                <span class="event-race">${row.race_url ? `<a href="${escapeHtml(row.race_url)}" target="_blank" rel="noreferrer">${escapeHtml(row.race_name)}</a>` : escapeHtml(row.race_name)}</span>
                <button type="button" class="link-button event-horse" data-horse-name="${escapeHtml(row.horse)}">${escapeHtml(row.horse)}</button>
                <span class="event-meeting">${escapeHtml(row.distance_m ? `${row.meeting || "—"} ${row.distance_m}m` : row.meeting || "—")}</span>
              </article>
            `).join("")}
          </div>
        </details>
      `).join("")}
    </div>
    ${groupRows.length > defaultLimit ? `
      <div class="table-toggle-row">
        <button class="table-toggle" type="button" data-toggle-graded-events aria-expanded="${showAll ? "true" : "false"}">${toggleText}</button>
      </div>
    ` : ""}
  `;
  for (const details of target.querySelectorAll(".graded-timeline-group")) {
    details.addEventListener("toggle", () => {
      details.querySelector("summary")?.setAttribute("aria-expanded", details.open ? "true" : "false");
    });
  }
  target.querySelector("[data-toggle-graded-events]")?.addEventListener("click", (event) => {
    target.dataset.timelineShowAll = target.dataset.timelineShowAll === "true" ? "false" : "true";
    event.currentTarget.setAttribute("aria-expanded", target.dataset.timelineShowAll);
    renderGradedWinsTimelineList(rows, mode);
  });
  wireAnalysisFilters(target);
}

function renderAnnualPerformanceCharts(annualPerformance) {
  const rows = [...(annualPerformance?.annual || [])].sort((a, b) => Number(a.year) - Number(b.year));
  const metric = document.querySelector("#annualPerformanceMetric button.active")?.dataset.metric || "wins";
  const metricMeta = {
    wins: { barKey: "wins", lineKey: "win_rate", barName: "胜场数", lineName: "胜率", barUnit: "胜", lineRate: true, barColor: COLORS.coral },
    starts: { barKey: "starts", lineKey: "top3_rate", barName: "出赛数", lineName: "前三率", barUnit: "次", lineRate: true, barColor: COLORS.gold },
    graded: { barKey: "graded_wins", lineKey: "g1_wins", barName: "重赏胜场", lineName: "G1胜场", barUnit: "胜", lineUnit: "胜", barColor: COLORS.duramente },
    earnings: { barKey: "earnings", lineKey: "wins", barName: "奖金", lineName: "胜场数", barUnit: "万円", lineUnit: "胜", barColor: COLORS.rose },
  }[metric];
  renderChart("annualPerformanceChart", {
    color: [metricMeta.barColor, COLORS.raceLine],
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (items) => {
        const row = items[0]?.data?.raw || {};
        return [
          `${row.year}年`,
          `出赛：${formatNumber(row.starts)}次`,
          `胜场：${formatNumber(row.wins)}（JRA ${formatNumber(row.jra_wins)} / NAR ${formatNumber(row.nar_wins)} / 海外 ${formatNumber(row.overseas_wins)}）`,
          `胜率：${formatRate(row.win_rate)} / 前三率：${formatRate(row.top3_rate)}`,
          `重赏：${formatNumber(row.graded_wins)}（G1 ${formatNumber(row.g1_wins)} / G2 ${formatNumber(row.g2_wins)} / G3 ${formatNumber(row.g3_wins)}）`,
          `奖金：${money(row.earnings)}`,
        ].join("<br>");
      },
    },
    legend: { top: 0, data: [metricMeta.barName, metricMeta.lineName] },
    grid: { left: 56, right: 56, top: 54, bottom: 38, containLabel: true },
    xAxis: { type: "category", name: "年", data: rows.map((row) => row.year) },
    yAxis: [
      { type: "value", name: metricMeta.barUnit },
      { type: "value", name: metricMeta.lineRate ? "%" : metricMeta.lineUnit || metricMeta.barUnit, axisLabel: { formatter: metricMeta.lineRate ? (value) => `${value}%` : undefined } },
    ],
    series: [
      {
        name: metricMeta.barName,
        type: "bar",
        barMaxWidth: 26,
        itemStyle: { borderRadius: [4, 4, 0, 0] },
        data: rows.map((row) => ({ value: row[metricMeta.barKey] || 0, raw: row })),
        label: { show: true, position: "top", formatter: (params) => formatNumber(params.value, metric === "earnings" ? 0 : 0) },
      },
      {
        name: metricMeta.lineName,
        type: "line",
        yAxisIndex: 1,
        symbolSize: 8,
        data: rows.map((row) => {
          const value = row[metricMeta.lineKey];
          return metricMeta.lineRate && value != null ? Number((value * 100).toFixed(1)) : value;
        }),
        label: {
          show: true,
          position: "top",
          formatter: (params) => metricMeta.lineRate ? `${params.value}%` : formatNumber(params.value),
        },
      },
    ],
  });

  const events = annualPerformance?.win_events || [];
  const milestones = annualPerformance?.milestones || [];
  const points = milestones.length ? milestones : events.filter((row) => row.cumulative_wins % 50 === 0);
  renderChart("cumulativeMilestoneChart", {
    color: [COLORS.duramente, COLORS.gold],
    tooltip: {
      trigger: "item",
      formatter: (params) => {
        const row = params.data.raw;
        return [
          `${formatNumber(row.cumulative_wins)}胜`,
          `${escapeHtml(row.race_date || "")} ${escapeHtml(row.meeting || "")}`,
          `${escapeHtml(row.race_name || "")}`,
          `胜马：${escapeHtml(row.horse || "")}${row.hkjc_name_zh ? `（${escapeHtml(row.hkjc_name_zh)}）` : ""}`,
        ].join("<br>");
      },
    },
    grid: { left: 46, right: 28, top: 34, bottom: 42, containLabel: true },
    xAxis: { type: "category", name: "里程碑", data: points.map((row) => `${row.cumulative_wins}胜`) },
    yAxis: { type: "value", show: false, min: 0, max: 1 },
    series: [{
      name: "累计胜场",
      type: "scatter",
      symbolSize: 18,
      data: points.map((row) => ({ value: [String(row.cumulative_wins) + "胜", 0.5], raw: row })),
      label: {
        show: true,
        position: "top",
        formatter: (params) => {
          const row = params.data.raw;
          return `${row.race_date}\n${row.horse || ""}`;
        },
      },
    }],
  });

  const tableTarget = document.querySelector("#annualPerformanceTable");
  if (tableTarget) {
    tableTarget.innerHTML = analysisTable([
      { label: "年份", value: (row) => row.year },
      { label: "出赛", value: (row) => formatNumber(row.starts) },
      { label: "胜场", value: (row) => `${formatNumber(row.wins)}（JRA ${formatNumber(row.jra_wins)} / NAR ${formatNumber(row.nar_wins)} / 海外 ${formatNumber(row.overseas_wins)}）` },
      { label: "胜率", value: (row) => formatRate(row.win_rate) },
      { label: "前三率", value: (row) => formatRate(row.top3_rate) },
      { label: "重赏", value: (row) => `${formatNumber(row.graded_wins)}（G1 ${formatNumber(row.g1_wins)} / G2 ${formatNumber(row.g2_wins)} / G3 ${formatNumber(row.g3_wins)}）` },
      { label: "奖金", value: (row) => money(row.earnings) },
    ], [...rows].reverse(), { initialLimit: 10 });
    wireExpandableTables(tableTarget);
  }
}

function renderSireCharts(profile, market, leadingHistory, leadingTop10, categories, annualPerformance) {
  const crops = [...profile.crops].sort((a, b) => Number(a.label) - Number(b.label));
  const cropLabels = crops.map((row) => row.label);
  const marketRows = market.rows || [];
  renderAnnualPerformanceCharts(annualPerformance);

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

  renderCropComboChart("sireCropEarningsChart", crops, {
    barKey: "total_earnings",
    lineKey: "earnings_per_foal",
    barName: "总奖金",
    lineName: "每匹平均奖金",
    barUnit: "万円",
    lineUnit: "万円/匹",
    barColor: COLORS.coral,
    lineColor: COLORS.raceLine,
    barFormatter: money,
    lineFormatter: money,
    barLabel: (row) => formatNumber(row.total_earnings, 0),
    lineLabel: (row) => formatNumber(row.earnings_per_foal, 0),
  });
  renderCropComboChart("sireCropWinnersChart", crops, {
    barKey: "winners",
    lineKey: "winner_foal_rate",
    barName: "胜马数",
    lineName: "胜马率",
    barUnit: "匹",
    lineUnit: "胜马率",
    lineRate: true,
    barInteger: true,
    barColor: COLORS.coral,
    lineColor: COLORS.raceLine,
    barFormatter: (value) => `${formatNumber(value)}匹`,
    lineFormatter: (value, row) => `${formatRate(value)} (${formatNumber(row.winners)}/${formatNumber(row.foals)})`,
    barLabel: (row) => formatNumber(row.winners),
    lineLabel: (row) => formatRate(row.winner_foal_rate),
  });
  renderCropComboChart("sireCropGradedChart", crops, {
    barKey: "graded_winners",
    lineKey: "graded_foal_rate",
    barName: "重赏胜马数",
    lineName: "重赏马率",
    barUnit: "匹",
    lineUnit: "重赏马率",
    lineRate: true,
    barInteger: true,
    barColor: COLORS.gold,
    lineColor: COLORS.raceLine,
    barFormatter: (value) => `${formatNumber(value)}匹`,
    lineFormatter: (value, row) => `${formatRate(value)} (${formatNumber(row.graded_winners)}/${formatNumber(row.foals)})`,
    barLabel: (row) => formatNumber(row.graded_winners),
    lineLabel: (row) => formatRate(row.graded_foal_rate),
  });
  renderCropAchievementChart(crops);
  renderCropAwdDumbbellChart(crops);

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
    const activeMode = document.querySelector("#gradedWinsEventMode button.active")?.dataset.mode || "year";
    renderGradedWinsTimelineList(timelineRows, activeMode);
    for (const button of document.querySelectorAll("#gradedWinsEventMode button")) {
      button.onclick = () => {
        for (const peer of document.querySelectorAll("#gradedWinsEventMode button")) peer.classList.toggle("active", peer === button);
        eventTarget.dataset.timelineShowAll = "false";
        renderGradedWinsTimelineList(timelineRows, button.dataset.mode);
      };
    }
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
    if (missing) messages.push("该分类暂缺可靠公开榜单。");
    if (availableYears.includes(2026)) messages.push("2026年赛季仍在进行，排名会继续变化。");
    if (rankYears.length === 1) messages.push("该分类目前只有单年资料。");
    missingBox.textContent = messages.join(" ");
  }
  const rankEmptyTitle = missing ? "该分类暂缺公开榜单" : "ドゥラメンテ未进入该分类排行";
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
  renderChart("sireTop10Chart", (missing || !chartRows.length) ? { title: { text: missing ? "该分类暂缺公开榜单" : "该年份暂缺榜单资料", left: "center", top: "middle" } } : {
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
  const [overview, sireProfile, annualPerformance, market, leadingHistory, leadingTop10, rawCategories] = await Promise.all([
    getAnalytics("overview"),
    getAnalytics("sire_profile"),
    getAnalytics("annual_progeny_performance"),
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
  els.sireContent.innerHTML = `
    <div class="analysis-title">
      <p class="kicker">种牡马分析</p>
      <h1>種牡馬成績</h1>
      <p>从配种数量、种付费和各出生世代表现观察ドゥラメンテ的种马生涯。</p>
    </div>
    <div class="metric-grid compact-metrics sire-metrics">
      ${metricCard("累计总奖金", money(profile.total_earnings), "产驹累计")}
      ${metricCard("产驹数", formatNumber(profile.foals), "收录马匹")}
      ${metricCard("累计胜场", formatNumber(annualPerformance.summary?.total_wins || 0), `JRA ${formatNumber(annualPerformance.summary?.jra_wins || 0)} / NAR ${formatNumber(annualPerformance.summary?.nar_wins || 0)} / 海外 ${formatNumber(annualPerformance.summary?.overseas_wins || 0)}`)}
      ${metricCard("重赏胜马", formatNumber(profile.graded_winners), `G1 ${formatNumber(profile.g1_horses)}`)}
    </div>
    ${sectionBlock("年度別産駒成績｜年度产驹成绩", "按比赛年份观察胜场、出赛和重赏表现。",
      `<article class="chart-card">
        <div class="chart-card-head with-controls">
          <div>
            <h3>年度产驹成绩</h3>
            <p>比赛发生年份与出生世代分开统计。</p>
          </div>
          <div class="segment-control compact-control" id="annualPerformanceMetric">
            <button class="active" type="button" data-metric="wins">胜场</button>
            <button type="button" data-metric="starts">出赛</button>
            <button type="button" data-metric="graded">重赏</button>
            <button type="button" data-metric="earnings">奖金</button>
          </div>
        </div>
        ${chartShell("annualPerformanceChart")}
      </article>
      <div class="chart-grid">
        ${chartBlock("累计胜场里程碑", "每100胜的代表节点。", "cumulativeMilestoneChart")}
        <article class="chart-card table-card">
          <div class="chart-card-head"><h3>年度明细</h3></div>
          <div id="annualPerformanceTable"></div>
        </article>
      </div>`
    )}
    ${sectionBlock("Leading Sire Career", "",
      `<div class="analysis-controls">
        <label><span>分类</span><select id="sireLeadingCategory">
          ${(categories.categories || []).filter((row) => ANNUAL_LEADING_CATEGORIES.has(row.category)).map((row) => `<option value="${escapeHtml(row.category)}">${escapeHtml(row.label)}${row.status === "available" ? "" : "（暂无）"}</option>`).join("")}
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
      ${analysisTable([
        { label: "年份", value: (row) => row.year },
        { label: "分类", value: (row) => row.category_label || row.category },
        { label: "排名", value: (row) => row.rank },
        { label: "种马", value: (row) => row.sire },
        { label: "奖金", value: (row) => money(row.earnings) },
        { label: "榜首", value: (row) => row.leader_sire || "—" },
        { label: "距榜首差距", value: (row) => row.earnings_gap_to_leader == null ? "—" : money(row.earnings_gap_to_leader) },
      ], (leadingHistory.history || []), { initialLimit: 8 })}
      ${renderLeadingSourceDetails(leadingHistory.history || [])}`
    )}
    ${sectionBlock("出生世代表现", "比较各出生世代的成绩积累与成长轨迹。",
      `<div class="chart-grid cohort-grid">
        ${chartBlock("奖金表现", "比较各世代的总奖金与平均表现。", "sireCropEarningsChart")}
        ${chartBlock("胜马表现", "比较各世代的胜马数量与比例。", "sireCropWinnersChart")}
        ${chartBlock("重赏表现", "观察重赏马在各世代中的分布。", "sireCropGradedChart")}
        ${chartBlock("各出生世代的成就转化", "观察各世代从出赛到高水平胜出的过程。", "sireAchievementStepChart")}
        ${chartBlock("各世代的芝・泥平均胜距", "比较各出生世代在不同场地的距离倾向。", "sireAwdDumbbellChart")}
        ${controlledChartBlock("产驹成长曲线", "观察各世代从两岁起的胜场积累。", "sireDevelopmentChart", `
          <label><span>标准化</span><select id="sireDevelopmentMetric">
            <option value="cumulative_wins">原始累计胜场</option>
            <option value="cumulative_wins_per_100_foals">每100匹产驹</option>
            <option value="cumulative_wins_per_100_runners">每100匹出赛马</option>
          </select></label>
        `)}
      </div>`
      + `<p class="source-note">较年轻世代的成绩仍在积累中。</p>`
    )}
    ${sectionBlock("配种与市场评价", "前两个配种年度数量明显高于同期社台平均，2019年后种付费快速上升。",
      `<div class="chart-grid">
        ${chartBlock("配种规模变化", "比较配种热度与同期社台平均水平。", "sireMaresCoveredChart")}
        ${chartBlock("市场定价变化", "观察种付费随市场评价的变化。", "sireStudFeeChart")}
      </div>
      <p class="source-note">配种与种付费来源：${escapeHtml(market.source)}；更新：${escapeHtml(market.retrieved_at)}</p>`
    )}
    ${sectionBlock("重賞勝利の推移｜重赏胜利时间线", "按年度查看G1、G2和G3胜利的出现节奏。",
      `${chartBlock("年度重赏胜场数", "观察重赏胜利随年份的积累。", "gradedWinsTimelineChart")}
      <article class="chart-card">
        <div class="chart-card-head with-controls">
          <div>
            <h3>重赏胜利时间轴</h3>
            <p>按年份或胜马查看每一场重赏胜利。</p>
          </div>
          <div class="segment-control compact-control" id="gradedWinsEventMode">
            <button class="active" type="button" data-mode="year">按年份</button>
            <button type="button" data-mode="horse">按胜马</button>
          </div>
        </div>
        <div id="gradedWinsEventList"></div>
      </article>`
    )}
    ${sectionBlock("生产年度明细", "按出生年份查看各世代成绩。",
      analysisTable([
        { label: "生年", value: (row) => row.label },
        { label: "产驹数", value: (row) => formatNumber(row.foals) },
        { label: "出赛马", value: (row) => `${formatNumber(row.runners)} (${formatRate(row.debut_rate)})` },
        { label: "胜马", value: (row) => `${formatNumber(row.winners)} (${formatRate(row.winner_foal_rate)})` },
        { label: "2胜以上", value: (row) => `${formatNumber(row.two_win_horses)} (${formatRate(row.two_win_rate)})` },
        { label: "3胜以上", value: (row) => `${formatNumber(row.three_win_horses)} (${formatRate(row.three_win_rate)})` },
        { label: "重赏胜马", value: (row) => formatNumber(row.graded_winners) },
        { label: "G1/G2/G3", value: (row) => `${formatNumber(row.g1_horses)}/${formatNumber(row.g2_horses)}/${formatNumber(row.g3_horses)}` },
        { label: "总奖金", value: (row) => money(row.total_earnings) },
        { label: "每匹平均", value: (row) => money(row.earnings_per_foal) },
        { label: "芝平均胜距", value: (row) => row.turf_awd ? `${formatNumber(row.turf_awd)} m` : "—" },
        { label: "泥平均胜距", value: (row) => row.dirt_awd ? `${formatNumber(row.dirt_awd)} m` : "—" },
        { label: "代表马", className: "name-column", value: representativeCell, html: true },
      ], sireProfile.crops, { initialLimit: 10 })
    )}
  `;
  wireExpandableTables(els.sireContent);
  const rerender = () => renderSireCharts(sireProfile, market, leadingHistory, leadingTop10, categories, annualPerformance);
  for (const id of ["sireDevelopmentMetric", "sireLeadingCategory", "sireTop10Year"]) {
    els.sireContent.querySelector(`#${id}`)?.addEventListener("change", rerender);
  }
  for (const button of els.sireContent.querySelectorAll("#annualPerformanceMetric button")) {
    button.addEventListener("click", () => {
      for (const peer of els.sireContent.querySelectorAll("#annualPerformanceMetric button")) peer.classList.toggle("active", peer === button);
      renderAnnualPerformanceCharts(annualPerformance);
    });
  }
  renderSireCharts(sireProfile, market, leadingHistory, leadingTop10, categories, annualPerformance);
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
  const overallWinnerRate = overview.summary.winner_foal_rate || weightedRate(bmsLines, "winners", "foals");
  const topLine = [...bmsLines].sort((a, b) => b.foals - a.foals)[0];
  const highLine = [...bmsLines].filter((row) => row.foals >= 20).sort((a, b) => (b.winner_foal_rate || 0) - (a.winner_foal_rate || 0))[0];
  const topSire = [...broodmareSires].sort((a, b) => b.foals - a.foals)[0];
  const highSire = [...broodmareSires].filter((row) => row.foals >= 10).sort((a, b) => (b.winner_foal_rate || 0) - (a.winner_foal_rate || 0))[0];
  els.bmsContent.innerHTML = `
    <div class="analysis-title">
      <p class="kicker">母父分析</p>
      <h1>母父分析</h1>
      <p>比较母父大系统与具体母父对ドゥラメンテ产驹表现的影响。</p>
    </div>
    <div class="metric-grid compact-metrics">
      ${metricCard("最大母父系", topLine?.label || "—", `${formatNumber(topLine?.foals || 0)}匹`)}
      ${metricCard("最高胜马率母父系", highLine?.label || "—", `${formatRate(highLine?.winner_foal_rate)}（${formatNumber(highLine?.winners || 0)}/${formatNumber(highLine?.foals || 0)}）`)}
      ${metricCard("最多具体母父", topSire?.label || "—", `${formatNumber(topSire?.foals || 0)}匹`)}
      ${metricCard("高效率母父", highSire?.label || "—", `${formatRate(highSire?.winner_foal_rate)}（${formatNumber(highSire?.winners || 0)}/${formatNumber(highSire?.foals || 0)}）`)}
    </div>
    ${sectionBlock("母父系构成", "观察八大母父系的规模与胜马表现。",
      `<div class="chart-grid">
        ${chartBlock("母父系产驹规模", "比较主要母父系的构成。", "bmsLineScaleChart")}
        ${chartBlock("相对整体胜马率", "观察各母父系相对整体水平的位置。", "bmsLineRelativeChart")}
      </div>`
    )}
    ${sectionBlock("具体母父表现", "比较具体母父的贡献与效率。",
      `<div class="chart-grid">
        ${chartBlock("奖金贡献", "按总奖金查看主要母父。", "bmsSireContributionChart")}
        ${chartBlock("胜马效率", "比较样本充足母父的胜马率。", "bmsSireEfficiencyChart")}
      </div>
      ${analysisTable([
        { label: "母父", className: "name-column", value: (row) => broodmareSireFilterButton(row.label), html: true },
        { label: "产驹数", value: (row) => formatNumber(row.foals) },
        { label: "出赛马", value: (row) => `${formatNumber(row.runners)} (${formatRate(row.runner_rate)})` },
        { label: "胜马", value: (row) => `${formatNumber(row.winners)} (${formatRate(row.winner_foal_rate)})` },
        { label: "重赏胜马", value: (row) => `${formatNumber(row.graded_winners)} (${formatRate(row.graded_foal_rate)})` },
        { label: "总奖金", value: (row) => money(row.total_earnings) },
        { label: "中位数", value: (row) => money(row.median_earnings_per_runner) },
        { label: "代表马", className: "name-column", value: representativeCell, html: true },
      ], [...broodmareSires].sort((a, b) => b.foals - a.foals), { initialLimit: 20 })}`
    )}
  `;
  renderBmsOverviewCharts(bmsLines, broodmareSires, totalFoals, overallWinnerRate);
  wireAnalysisFilters(els.bmsContent);
  wireExpandableTables(els.bmsContent);
  els.bmsContent.dataset.loaded = "true";
}

function renderBmsOverviewCharts(bmsLines, broodmareSires, totalFoals, overallWinnerRate) {
  const lineRows = [...bmsLines].sort((a, b) => b.foals - a.foals);
  renderChart("bmsLineScaleChart", {
    color: [COLORS.duramente],
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (items) => {
        const row = items[0].data.raw;
        return `${escapeHtml(row.label)}<br>产驹数：${formatNumber(row.foals)}<br>构成比：${formatRate(row.foals / totalFoals)}<br>胜马：${formatNumber(row.winners)}<br>重赏胜马：${formatNumber(row.graded_winners)}`;
      },
    },
    grid: horizontalGrid(18, 42, 130),
    xAxis: { type: "value", name: "匹" },
    yAxis: longCategoryAxis(lineRows.map((row) => row.label), { width: 150 }),
    series: [{
      name: "产驹数",
      type: "bar",
      barMaxWidth: 16,
      data: lineRows.map((row) => ({ value: row.foals, raw: row })),
      label: { show: true, position: "right", formatter: (params) => `${formatNumber(params.value)}匹` },
    }],
  })?.on("click", (params) => applyBmsFilter(params.data.raw.label));

  const relativeRows = lineRows.map((row) => ({
    ...row,
    diff: Number((((row.winner_foal_rate || 0) - overallWinnerRate) * 100).toFixed(1)),
  })).sort((a, b) => b.diff - a.diff);
  renderChart("bmsLineRelativeChart", {
    color: [COLORS.coral],
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (items) => {
        const row = items[0].data.raw;
        return `${escapeHtml(row.label)}<br>胜马率：${formatRate(row.winner_foal_rate)}（${formatNumber(row.winners)}/${formatNumber(row.foals)}）<br>相对整体：${row.diff > 0 ? "+" : ""}${row.diff}%`;
      },
    },
    grid: horizontalGrid(18, 44, 130),
    xAxis: { type: "value", name: "百分点", axisLabel: { formatter: (value) => `${value > 0 ? "+" : ""}${value}` } },
    yAxis: longCategoryAxis(relativeRows.map((row) => row.label), { width: 150 }),
    series: [{
      name: "相对整体胜马率",
      type: "bar",
      barMaxWidth: 16,
      data: relativeRows.map((row) => ({ value: row.diff, raw: row, itemStyle: { color: row.diff >= 0 ? COLORS.coral : COLORS.muted } })),
      markLine: { silent: true, symbol: "none", lineStyle: { color: COLORS.negative, width: 1 }, data: [{ xAxis: 0 }] },
      label: { show: true, position: "right", formatter: (params) => `${params.value > 0 ? "+" : ""}${params.value}%` },
    }],
  })?.on("click", (params) => applyBmsFilter(params.data.raw.label));

  const contributionRows = [...broodmareSires].sort((a, b) => b.total_earnings - a.total_earnings).slice(0, 15);
  renderChart("bmsSireContributionChart", {
    color: [COLORS.duramente],
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, formatter: (items) => {
      const row = items[0].data.raw;
      return `${escapeHtml(row.label)}<br>总奖金：${money(row.total_earnings)}<br>产驹：${formatNumber(row.foals)}匹<br>胜马率：${formatRate(row.winner_foal_rate)}<br>代表马：${escapeHtml(representativeNames(row))}`;
    } },
    grid: horizontalGrid(18, 48, 142),
    xAxis: { type: "value", name: "万円" },
    yAxis: longCategoryAxis(contributionRows.map((row) => row.label), { width: 150 }),
    series: [{
      name: "总奖金",
      type: "bar",
      barMaxWidth: 16,
      data: contributionRows.map((row) => ({ value: row.total_earnings || 0, raw: row })),
      label: { show: true, position: "right", formatter: (params) => formatNumber(params.value, 0) },
    }],
  })?.on("click", (params) => applyBroodmareSireFilter(params.data.raw.label));

  const efficiencyRows = [...broodmareSires].filter((row) => row.foals >= 10)
    .sort((a, b) => (b.winner_foal_rate || 0) - (a.winner_foal_rate || 0) || b.foals - a.foals)
    .slice(0, 15);
  renderChart("bmsSireEfficiencyChart", {
    color: [COLORS.gold],
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, formatter: (items) => {
      const row = items[0].data.raw;
      return `${escapeHtml(row.label)}<br>胜马率：${formatRate(row.winner_foal_rate)}（${formatNumber(row.winners)}/${formatNumber(row.foals)}）<br>重赏率：${formatRate(row.graded_foal_rate)}（${formatNumber(row.graded_winners)}/${formatNumber(row.foals)}）`;
    } },
    grid: horizontalGrid(18, 48, 142),
    xAxis: { type: "value", name: "%", max: 100 },
    yAxis: longCategoryAxis(efficiencyRows.map((row) => row.label), { width: 150 }),
    series: [{
      name: "胜马率",
      type: "bar",
      barMaxWidth: 16,
      data: efficiencyRows.map((row) => ({ value: Number(((row.winner_foal_rate || 0) * 100).toFixed(1)), raw: row })),
      label: { show: true, position: "right", formatter: (params) => `${params.value}%` },
    }],
  })?.on("click", (params) => applyBroodmareSireFilter(params.data.raw.label));
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
    xAxis: { type: "value", name: "产驹数", max: paddedAxisMax },
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
        return `${escapeHtml(row.label)}<br>产驹数 ${row.foals}<br>胜马 ${row.winners} / 重赏 ${row.graded_winners}<br>胜马率 ${formatRate(row.winner_foal_rate)} / 重赏率 ${formatRate(row.graded_foal_rate)}<br>中位奖金 ${money(row.median_earnings_per_runner)}<br>代表马 ${escapeHtml(representativeNames(row))}`;
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
        return `${formatNumber(params.value, 1)}（${row.foals}匹）`;
      } },
    }],
  });
  performanceChart?.on("click", (params) => applySearchFilter(params.data.raw.label));

  renderAncestorGroupedTable(charts);

  renderPedigreeLineageTab(pedigree, bmsLines);
}

function ancestorMetricLabel(row, metric) {
  if (metric === "winner_foal_rate") return rateWithCount(row.winner_foal_rate, row.winners, row.foals);
  if (metric === "graded_foal_rate") return rateWithCount(row.graded_foal_rate, row.graded_winners, row.foals);
  if (metric === "median_earnings_per_runner") return money(row.median_earnings_per_runner);
  if (metric === "total_earnings") return money(row.total_earnings);
  return `${formatNumber(row.foals)}匹`;
}

function ancestorDetailValue(row, key, total) {
  if (key === "share") return total ? (row.foals || 0) / total : 0;
  if (key === "winner") return Number(row.winner_foal_rate || 0);
  if (key === "graded") return Number(row.graded_foal_rate || 0);
  if (key === "median") return Number(row.median_earnings_per_runner || 0);
  return Number(row.foals || 0);
}

function ancestorSummarySegments(rows, total, visibleRows = rows) {
  const visible = [];
  for (const [index, row] of visibleRows.slice(0, 3).entries()) {
    visible.push({
      label: crossPatternText(row.pattern),
      foals: row.foals || 0,
      share: total ? ((row.foals || 0) / total) * 100 : 0,
      className: `segment-${index + 1}`,
    });
  }
  const visibleFoals = visible.reduce((sum, item) => sum + item.foals, 0);
  const restFoals = Math.max(0, (total || 0) - visibleFoals);
  if (restFoals > 0) {
    visible.push({
      label: "其他",
      foals: restFoals,
      share: total ? (restFoals / total) * 100 : 0,
      className: "segment-other",
    });
  }
  return visible;
}

function renderAncestorGroupedTable(charts) {
  const target = document.querySelector("#ancestorGroupedTable");
  if (!target) return;
  const search = (document.querySelector("#ancestorGroupSearch")?.value || "").trim().toLowerCase();
  const sortMode = target.dataset.sortMode || "foals";
  const showSmall = document.querySelector("#ancestorShowSmall")?.checked || false;
  const showAll = target.dataset.showAll === "true" || Boolean(search);
  const expanded = new Set(String(target.dataset.expanded || "").split(",").filter(Boolean));
  const detailSort = target.dataset.detailSort || "share_desc";
  const [detailKey, detailDir] = detailSort.split("_");
  const ancestorStats = new Map((charts.cross_bubble || []).map((row) => [row.label, row]));
  const groups = new Map();
  for (const row of charts.ancestor_form_comparison || []) {
    const ancestor = row.ancestor || row.label?.split("|")[0] || "—";
    if (search && !ancestor.toLowerCase().includes(search)) continue;
    if (!groups.has(ancestor)) {
      const stats = ancestorStats.get(ancestor) || {};
      groups.set(ancestor, {
        ancestor,
        stats,
        totalFoals: stats.foals || 0,
        rows: [],
      });
    }
    groups.get(ancestor).rows.push(row);
  }
  for (const group of groups.values()) {
    group.rows.sort((a, b) => (b.foals || 0) - (a.foals || 0));
    group.totalFoals = group.totalFoals || group.rows.reduce((sum, row) => sum + (row.foals || 0), 0);
    group.formCount = group.rows.length;
    group.topShare = group.totalFoals ? (group.rows[0]?.foals || 0) / group.totalFoals : 0;
  }
  const sortedGroups = [...groups.values()].sort((a, b) => {
    if (sortMode === "concentration") return (b.topShare || 0) - (a.topShare || 0) || (b.totalFoals || 0) - (a.totalFoals || 0);
    if (sortMode === "forms") return (b.formCount || 0) - (a.formCount || 0) || (b.totalFoals || 0) - (a.totalFoals || 0);
    return (b.totalFoals || 0) - (a.totalFoals || 0);
  });
  const visibleGroups = showAll ? sortedGroups : sortedGroups.slice(0, 10);
  target.innerHTML = `
    <div class="ancestor-group-table">
      ${visibleGroups.map((group) => {
        const key = encodeURIComponent(group.ancestor);
        const total = group.totalFoals || 1;
        const allRows = [...group.rows].sort((a, b) => (b.foals || 0) - (a.foals || 0));
        const detailRows = allRows
          .filter((row) => showSmall || Number(row.foals || 0) >= 5)
          .sort((a, b) => {
            const diff = ancestorDetailValue(b, detailKey, total) - ancestorDetailValue(a, detailKey, total);
            return detailDir === "asc" ? -diff : diff;
          });
        const summaryRows = showSmall ? allRows : allRows.filter((row) => Number(row.foals || 0) >= 5);
        const segments = ancestorSummarySegments(allRows, total, summaryRows);
        const isOpen = expanded.has(key);
        return `
          <article class="ancestor-group${isOpen ? " is-open" : ""}" data-ancestor-key="${key}">
            <button class="ancestor-summary" type="button" data-toggle-ancestor="${key}" aria-expanded="${isOpen ? "true" : "false"}">
              <span class="ancestor-info">
                <strong>${escapeHtml(group.ancestor)}</strong>
                <em>${formatNumber(total)}匹 · ${formatNumber(allRows.length)}种形式</em>
              </span>
              <span class="ancestor-composition">
                <span class="ancestor-stack" aria-label="${escapeHtml(group.ancestor)} Cross构成">
                  ${segments.map((segment) => `
                    <span class="${segment.className}" style="width:${segment.share}%" title="${escapeHtml(segment.label)}：${formatNumber(segment.foals)}匹，${percentText(segment.share)}"></span>
                  `).join("")}
                </span>
                <span class="ancestor-segment-summary">
                  ${segments.map((segment) => `${escapeHtml(segment.label)} ${percentText(segment.share)}`).join(" · ")}
                </span>
              </span>
              <span class="ancestor-toggle-label">${isOpen ? "收起" : "展开"}⌄</span>
            </button>
            <div class="ancestor-detail" ${isOpen ? "" : "hidden"}>
              ${detailRows.length ? `
                <table class="ancestor-detail-table">
                  <thead>
                    <tr>
                      ${[
                        ["pattern", "Cross形式"],
                        ["foals", "产驹数"],
                        ["share", "构成比"],
                        ["winner", "胜马率"],
                        ["graded", "重赏率"],
                        ["median", "中位奖金"],
                        ["representatives", "代表马"],
                      ].map(([keyName, label]) => `<th>${["pattern", "representatives"].includes(keyName) ? escapeHtml(label) : `<button type="button" data-ancestor-detail-sort="${keyName}">${escapeHtml(label)}</button>`}</th>`).join("")}
                    </tr>
                  </thead>
                  <tbody>
                    ${detailRows.map((row) => {
                      const share = total ? ((row.foals || 0) / total) * 100 : 0;
                      return `
                        <tr>
                          <td><button type="button" class="link-button" data-cross-search="${escapeHtml(`${group.ancestor} ${row.pattern || ""}`)}">${escapeHtml(crossPatternText(row.pattern))}</button>${Number(row.foals || 0) < 10 ? `<em class="sample-badge">n&lt;10</em>` : ""}</td>
                          <td>${formatNumber(row.foals)}</td>
                          <td class="share-cell"><span class="mini-share"><i style="width:${Math.max(2, share)}%"></i></span><strong>${percentText(share)}</strong></td>
                          <td>${rateWithCount(row.winner_foal_rate, row.winners, row.foals)}</td>
                          <td>${rateWithCount(row.graded_foal_rate, row.graded_winners, row.foals)}</td>
                          <td>${money(row.median_earnings_per_runner)}</td>
                          <td>${compactRepresentativeCell(row)}</td>
                        </tr>
                      `;
                    }).join("")}
                  </tbody>
                </table>
              ` : `<p class="ancestor-empty">小样本组合已合并到摘要中的“其他”。</p>`}
            </div>
          </article>
        `;
      }).join("")}
    </div>
    ${!search && sortedGroups.length > 10 ? `
      <div class="table-toggle-row">
        <button class="table-toggle" type="button" data-toggle-ancestors aria-expanded="${showAll ? "true" : "false"}">${showAll ? "收起" : "显示全部祖先"}</button>
      </div>
    ` : ""}
  `;
  for (const button of target.querySelectorAll("[data-cross-search]")) {
    button.addEventListener("click", () => applySearchFilter(button.dataset.crossSearch));
  }
  for (const button of target.querySelectorAll("[data-toggle-ancestor]")) {
    button.addEventListener("click", () => {
      const key = button.dataset.toggleAncestor;
      const current = new Set(String(target.dataset.expanded || "").split(",").filter(Boolean));
      if (current.has(key)) current.delete(key); else current.add(key);
      target.dataset.expanded = [...current].join(",");
      renderAncestorGroupedTable(charts);
    });
  }
  for (const button of target.querySelectorAll("[data-ancestor-detail-sort]")) {
    button.addEventListener("click", () => {
      const key = button.dataset.ancestorDetailSort;
      const [currentKey, currentDir] = (target.dataset.detailSort || "share_desc").split("_");
      const nextDir = currentKey === key && currentDir === "desc" ? "asc" : "desc";
      target.dataset.detailSort = `${key}_${nextDir}`;
      renderAncestorGroupedTable(charts);
    });
  }
  target.querySelector("[data-toggle-ancestors]")?.addEventListener("click", (event) => {
    target.dataset.showAll = target.dataset.showAll === "true" ? "false" : "true";
    event.currentTarget.setAttribute("aria-expanded", target.dataset.showAll);
    renderAncestorGroupedTable(charts);
  });
  wireExpandableTables(target);
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
  const minFoals = Number(document.querySelector("#familyMinFoals")?.value || 5);
  const meta = rankingMetricMeta(metric);
  const needsSample = metric === "winner_foal_rate" || metric === "graded_foal_rate";
  const isPoint = needsSample || metric === "median_earnings_per_runner";
  const rateAverage = metric === "winner_foal_rate"
    ? weightedRate(pedigree.female_families || [], "winners", "foals")
    : metric === "graded_foal_rate"
      ? weightedRate(pedigree.female_families || [], "graded_winners", "foals")
      : null;
  const rows = [...(pedigree.female_families || [])]
    .filter((row) => !needsSample || Number(row.foals || 0) >= minFoals)
    .sort((a, b) => (meta.value(b) || 0) - (meta.value(a) || 0))
    .slice(0, 20);
  target.innerHTML = `${chartShell("femaleFamilyChart")}`;
  const el = document.querySelector("#femaleFamilyChart");
  if (el) el.style.height = `${rankingChartHeight(rows, 360)}px`;
  const chart = renderChart("femaleFamilyChart", {
    color: [isPoint ? COLORS.gold : COLORS.blue],
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (items) => {
        const row = items[0].data.raw;
        return [
          escapeHtml(row.label),
          `产驹数：${formatNumber(row.foals)}`,
          `胜马率：${formatRate(row.winner_foal_rate)}（${formatNumber(row.winners)}/${formatNumber(row.foals)}）`,
          `重赏马率：${formatRate(row.graded_foal_rate)}（${formatNumber(row.graded_winners)}/${formatNumber(row.foals)}）`,
          `总奖金：${money(row.total_earnings)}`,
          `代表马：${escapeHtml(representativeNames(row))}`,
        ].join("<br>");
      },
    },
    grid: horizontalGrid(18, 34, 86),
    xAxis: { type: "value", name: meta.unit, max: metric.includes("rate") ? 110 : paddedAxisMax },
    yAxis: longCategoryAxis(rows.map((row) => row.label), { width: 120 }),
    series: [{
      type: isPoint ? "scatter" : "bar",
      symbolSize: isPoint ? 12 : undefined,
      barMaxWidth: 18,
      data: rows.map((row) => ({ value: isPoint ? [meta.value(row), row.label] : meta.value(row), raw: row })),
      itemStyle: isPoint ? { color: COLORS.gold, borderColor: "#fff", borderWidth: 1.5 } : undefined,
      markLine: rateAverage == null ? undefined : ratioLine(rateAverage, "整体平均", "xAxis"),
      label: { show: true, position: "right", formatter: (params) => {
        const row = params.data.raw;
        const value = Array.isArray(params.value) ? params.value[0] : params.value;
        if (metric === "foals") return `${formatNumber(value)}匹`;
        if (metric === "total_earnings") return `${formatNumber(value, 1)}万円`;
        if (metric === "graded_winners") return `${formatNumber(value)}匹`;
        if (metric === "median_earnings_per_runner") return money(value);
        if (metric === "winner_foal_rate") return `${value}% (${row.winners}/${row.foals})`;
        if (metric === "graded_foal_rate") return `${value}% (${row.graded_winners}/${row.foals})`;
        return formatNumber(value, 1);
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
    yAxis: { type: "value", name: "产驹数" },
    series: [{ type: "bar", data: damAge.histogram.map((row) => row.foals) }],
  });
  renderChart("damAgePerformanceChart", {
    color: [COLORS.duramente, COLORS.gold, COLORS.coral],
    tooltip: { trigger: "axis" },
    legend: { top: 0, data: ["出赛率", "胜马率", "重赏马率"] },
    grid: { left: 48, right: 22, top: 52, bottom: 36 },
    xAxis: { type: "category", data: damAge.buckets.map((row) => row.label) },
    yAxis: { type: "value", name: "比例", axisLabel: { formatter: (value) => `${value}%` } },
    series: [
      { name: "出赛率", type: "bar", data: damAge.buckets.map((row) => Number(((row.runner_rate || 0) * 100).toFixed(1))) },
      { name: "胜马率", type: "bar", data: damAge.buckets.map((row) => Number(((row.winner_foal_rate || 0) * 100).toFixed(1))) },
      { name: "重赏马率", type: "bar", data: damAge.buckets.map((row) => Number(((row.graded_foal_rate || 0) * 100).toFixed(1))) },
    ],
  });
  const ageBuckets = ["3-6", "7-10", "11-14", "15-18", "19+"];
  const orders = ["1", "2", "3", "4", "5", "6", "7+"];
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
      return `母龄 ${ageBuckets[y]} / 胎次 ${orders[x]}<br>产驹数 ${foals}<br>胜马 ${winners} / 重赏 ${graded}`;
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
      <p>从交叉祖先、母父系和牝系观察ドゥラメンテ的主要血统组合。</p>
    </div>
    <div class="chart-grid">
      ${chartBlock("最常见的Cross祖先", "观察哪些祖先最常出现在交叉组合中。", "crossAncestorCountChart")}
      ${sectionBlock("主要Cross祖先的产驹表现", "比较主要交叉祖先的成绩表现。",
        `<div class="analysis-controls">
          <label><span>指标</span><select id="crossPerformanceMetric">
            <option value="winner_foal_rate">胜马率</option>
            <option value="graded_foal_rate">重赏马率</option>
            <option value="median_earnings_per_runner">中位奖金</option>
            <option value="avg_earnings_per_foal">平均奖金</option>
          </select></label>
          <label><span>样本下限</span><input id="crossMinFoals" type="number" min="1" max="50" value="10"></label>
        </div>
        ${chartShell("crossAncestorPerformanceChart")}`
      )}
    </div>
    ${sectionBlock("具体Cross形式与结构", "",
      `<div class="cross-detail-grid">
        <article class="chart-card compact-table-card">
          <div class="chart-card-head with-controls">
            <div>
              <h3>祖先分组Cross表</h3>
              <p>按祖先归纳常见交叉形式。</p>
            </div>
            <div class="analysis-controls inline-controls">
              <label><span>搜索祖先</span><input id="ancestorGroupSearch" type="search" list="ancestorOptions" placeholder="Northern Dancer"></label>
              <datalist id="ancestorOptions">
                ${ancestorOptions.map((name) => `<option value="${escapeHtml(name)}"></option>`).join("")}
              </datalist>
              <div class="segmented-sort" id="ancestorSortButtons" aria-label="祖先排列">
                <button class="active" type="button" data-ancestor-sort="foals">产驹数</button>
                <button type="button" data-ancestor-sort="concentration">最高集中度</button>
                <button type="button" data-ancestor-sort="forms">形式数</button>
              </div>
              <label class="inline-check"><input id="ancestorShowSmall" type="checkbox" checked>显示小样本组合</label>
            </div>
          </div>
          <div id="ancestorGroupedTable"></div>
        </article>
        <article class="chart-card compact-table-card">
          <div class="chart-card-head">
            <h3>Cross结构分布</h3>
            <p>比较常见结构的成绩表现。</p>
          </div>
          ${analysisTable([
            { label: "Cross结构", className: "cross-column", value: (row) => row.label },
            { label: "产驹数", value: (row) => formatNumber(row.foals) },
            { label: "胜马率", value: (row) => rateWithCount(row.winner_foal_rate, row.winners, row.foals) },
            { label: "重赏率", value: (row) => rateWithCount(row.graded_foal_rate, row.graded_winners, row.foals) },
            { label: "代表马", className: "name-column", value: representativeCell, html: true },
          ], cross.structures, { initialLimit: 10 })}
        </article>
      </div>`
    )}
    ${sectionBlock("母父系与牝系", "从母父系统和牝系观察血统来源。",
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
          <option value="graded_winners">重赏胜马数</option>
          <option value="graded_foal_rate">重赏马率</option>
          <option value="median_earnings_per_runner">中位奖金</option>
        </select></label>
        <label><span>牝系样本</span><select id="familyMinFoals">
          <option value="5" selected>5匹以上</option>
          <option value="10">10匹以上</option>
          <option value="20">20匹以上</option>
        </select></label>
      </div>
      <div id="pedigreeLineagePanel"></div>`
    )}
    <details class="analysis-block">
      <summary>查看完整Cross明细</summary>
      <div class="detail-table-stack">
        <h3>Cross祖先明细</h3>
        ${analysisTable([
          { label: "祖先", className: "name-column", value: (row) => row.label },
          { label: "产驹数", value: (row) => formatNumber(row.foals) },
          { label: "出赛马", value: (row) => `${formatNumber(row.runners)} (${formatRate(row.runner_rate)})` },
          { label: "胜马", value: (row) => `${formatNumber(row.winners)} (${formatRate(row.winner_foal_rate)})` },
          { label: "重賞勝馬", value: (row) => `${formatNumber(row.graded_winners)} (${formatRate(row.graded_foal_rate)})` },
          { label: "G1", value: (row) => formatNumber(row.g1_winners) },
          { label: "総賞金", value: (row) => money(row.total_earnings) },
          { label: "平均", value: (row) => money(row.avg_earnings_per_foal) },
          { label: "中央値", value: (row) => money(row.median_earnings_per_runner) },
          { label: "代表馬", className: "name-column", value: representativeCell, html: true },
        ], cross.ancestors, { initialLimit: 10 })}
        <h3>祖先 + 具体Cross形式明细</h3>
        ${analysisTable([
          { label: "祖先", className: "name-column", value: (row) => row.ancestor || row.label.split("|")[0] },
          { label: "Cross形式", className: "cross-column", value: (row) => row.pattern || row.label.split("|")[1] },
          { label: "产驹数", value: (row) => formatNumber(row.foals) },
          { label: "勝馬率", value: (row) => rateWithCount(row.winner_foal_rate, row.winners, row.foals) },
          { label: "重賞馬率", value: (row) => rateWithCount(row.graded_foal_rate, row.graded_winners, row.foals) },
          { label: "総賞金", value: (row) => money(row.total_earnings) },
          { label: "平均", value: (row) => money(row.avg_earnings_per_foal) },
          { label: "中央値", value: (row) => money(row.median_earnings_per_runner) },
          { label: "Max", value: (row) => money(row.max_earnings) },
          { label: "代表馬", className: "name-column", value: representativeCell, html: true },
        ], cross.ancestor_patterns, { initialLimit: 10 })}
      </div>
    </details>
    <details class="analysis-block">
      <summary>查看牝系详细表</summary>
      ${analysisTable([
        { label: "牝系", className: "entity-column", value: (row) => row.label },
        { label: "产驹数", value: (row) => formatNumber(row.foals) },
        { label: "胜马", value: (row) => `${formatNumber(row.winners)} (${formatRate(row.winner_foal_rate)})` },
        { label: "重賞勝馬", value: (row) => formatNumber(row.graded_winners) },
        { label: "総賞金", value: (row) => money(row.total_earnings) },
        { label: "代表馬", className: "name-column", value: representativeCell, html: true },
      ], pedigree.female_families, { initialLimit: 10 })}
    </details>
  `;
  wireExpandableTables(els.pedigreeContent);
  const rerender = () => renderPedigreeCharts(pedigree, bmsLines);
  for (const id of ["crossPerformanceMetric", "crossMinFoals", "ancestorGroupSearch", "ancestorShowSmall", "bmsLineMetric", "familyMetric", "familyMinFoals"]) {
    els.pedigreeContent.querySelector(`#${id}`)?.addEventListener("change", rerender);
    els.pedigreeContent.querySelector(`#${id}`)?.addEventListener("input", debounce(rerender));
  }
  for (const button of els.pedigreeContent.querySelectorAll("[data-ancestor-sort]")) {
    button.addEventListener("click", () => {
      const target = els.pedigreeContent.querySelector("#ancestorGroupedTable");
      if (target) target.dataset.sortMode = button.dataset.ancestorSort || "foals";
      for (const peer of els.pedigreeContent.querySelectorAll("[data-ancestor-sort]")) peer.classList.toggle("active", peer === button);
      renderAncestorGroupedTable(pedigree.charts || {});
    });
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
    legend: { top: 0, data: ["产驹数", "胜马率"] },
    grid: { left: 56, right: 58, top: 54, bottom: 86 },
    xAxis: { type: "category", data: topRows.map((row) => row.label), axisLabel: { rotate: 35 } },
    yAxis: [
      { type: "value", name: "产驹数" },
      { type: "value", name: "胜马率", axisLabel: { formatter: (value) => `${value}%` } },
    ],
    series: [
      { name: "产驹数", type: "bar", data: topRows.map((row) => row.foals), label: { show: true, position: "top" } },
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
    xAxis: { type: "value", name: "产驹数" },
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
  const bucketRows = (damAge.buckets || []).filter((row) => row.label !== "unknown" && Number(row.foals || 0) > 0);
  renderChart("damAgeHistogramChart", {
    color: [COLORS.duramente],
    tooltip: { trigger: "axis" },
    grid: { left: 48, right: 22, top: 24, bottom: 36 },
    xAxis: { type: "category", name: "母龄", data: damAge.histogram.map((row) => row.age) },
    yAxis: { type: "value", name: "产驹数" },
    series: [{ type: "bar", data: damAge.histogram.map((row) => row.foals), label: { show: true, position: "top" } }],
  });
  renderChart("damAgeWinRateChart", {
    color: [COLORS.duramente],
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: horizontalGrid(24, 36, 40),
    xAxis: { type: "value", name: "%" },
    yAxis: longCategoryAxis(bucketRows.map((row) => row.label), { width: 90 }),
    series: [{ type: "bar", data: bucketRows.map((row) => ({ value: Number(((row.winner_foal_rate || 0) * 100).toFixed(1)), raw: row })), label: { show: true, position: "right", formatter: (params) => {
      const row = params.data.raw;
      return `${params.value}% (${row.winners}/${row.foals})`;
    } } }],
  });
  renderChart("damAgeGradedRateChart", {
    color: [COLORS.gold],
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: horizontalGrid(24, 36, 40),
    xAxis: { type: "value", name: "%" },
    yAxis: longCategoryAxis(bucketRows.map((row) => row.label), { width: 90 }),
    series: [{ type: "bar", data: bucketRows.map((row) => ({ value: Number(((row.graded_foal_rate || 0) * 100).toFixed(1)), raw: row })), label: { show: true, position: "right", formatter: (params) => {
      const row = params.data.raw;
      return `${params.value}% (${row.graded_winners}/${row.foals})`;
    } } }],
  });
  const orders = ["1", "2", "3", "4", "5", "6", "7+"];
  const orderRows = orders.map((order) => {
    const items = damAge.foal_order_heatmap.filter((row) => row.foal_order === order);
    const foals = items.reduce((sum, row) => sum + row.foals, 0);
    const winners = items.reduce((sum, row) => sum + row.winners, 0);
    const graded = items.reduce((sum, row) => sum + row.graded_winners, 0);
    return { label: order, foals, winners, graded, winner_rate: foals ? winners / foals : null, graded_rate: foals ? graded / foals : null };
  }).filter((row) => row.foals > 0);
  renderChart("damFoalOrderChart", {
    color: [COLORS.duramente, COLORS.gold],
    tooltip: { trigger: "axis" },
    legend: { top: 0, data: ["产驹数", "胜马率"] },
    grid: { left: 48, right: 58, top: 52, bottom: 36 },
    xAxis: { type: "category", name: "胎次", data: orderRows.map((row) => row.label) },
    yAxis: [
      { type: "value", name: "产驹数" },
      { type: "value", name: "胜马率", axisLabel: { formatter: (value) => `${value}%` } },
    ],
    series: [
      { name: "产驹数", type: "bar", data: orderRows.map((row) => row.foals), label: { show: true, position: "top" } },
      { name: "胜马率", type: "line", yAxisIndex: 1, data: orderRows.map((row) => row.winner_rate == null ? null : Number((row.winner_rate * 100).toFixed(1))), label: { show: true, formatter: "{c}%" } },
    ],
  });
}

async function renderProductionAnalysis() {
  if (els.productionContent.dataset.loaded) return;
  const [breeders, damAge, broodmares] = await Promise.all([
    getAnalytics("breeders"),
    getAnalytics("dam_age"),
    broodmareRowsFromLoadedHorses(),
  ]);
  const damAgeBucketRows = (damAge.buckets || []).filter((row) => row.label !== "unknown" && Number(row.foals || 0) > 0);
  els.productionContent.innerHTML = `
    <div class="analysis-title">
      <p class="kicker">生産・繁殖</p>
      <h1>生産・繁殖｜牧场与繁殖母马</h1>
      <p>观察ドゥラメンテ产驹主要由哪些牧场生产，以及繁殖牝马年龄和胎次与产驹表现的关系。</p>
    </div>
    <nav class="page-anchor-nav" aria-label="生産・繁殖页面导航">
      <a href="#farm-analysis">牧场分析</a>
      <a href="#broodmare-analysis">繁殖牝马分析</a>
    </nav>
    <section class="analysis-block production-section" id="farm-analysis">
      <div class="section-heading">
        <h2>牧場分析｜牧场分析</h2>
        <p>比较主要牧场的产驹规模、重赏马来源和出生世代构成。</p>
      </div>
      <div class="chart-grid">
        ${chartBlock("主要生产牧场", "比较主要牧场的产驹规模和胜马表现。", "breederMainChart")}
        ${chartBlock("重赏胜马生产牧场分布", "观察重赏胜马来自哪些牧场。", "breederGradedChart")}
      </div>
      <div class="chart-grid single-chart">
        ${chartBlock("各牧场出生世代构成", "观察主要牧场的世代分布。", "breederCropChart")}
      </div>
      ${sectionBlock("牧场综合表", "详细查看各牧场产驹成绩。",
        analysisTable([
          { label: "牧場", value: (row) => row.label },
          { label: "产驹数", value: (row) => formatNumber(row.foals) },
          { label: "出赛马", value: (row) => `${formatNumber(row.runners)} (${formatRate(row.runner_rate)})` },
          { label: "胜马", value: (row) => `${formatNumber(row.winners)} (${formatRate(row.winner_foal_rate)})` },
          { label: "重赏马", value: (row) => formatNumber(row.graded_winners) },
          { label: "G1马", value: (row) => formatNumber(row.g1_winners) },
          { label: "总奖金", value: (row) => money(row.total_earnings) },
          { label: "代表马", className: "name-column", value: representativeCell, html: true },
        ], breeders.table, { initialLimit: 15 })
      )}
      <p class="source-note">${escapeHtml(breeders.method || "牧场统计根据产驹资料汇总。")}</p>
    </section>
    <section class="analysis-block production-section" id="broodmare-analysis">
      <div class="section-heading">
        <h2>繁殖牝馬分析｜繁殖牝马分析</h2>
        <p>从生产时母龄、胎次及繁殖牝马个体观察ドゥラメンテ产驹的生产结构与成绩表现。</p>
      </div>
      <div class="chart-grid">
        ${chartBlock("母马生产本胎时的年龄", "观察产驹集中出生在哪些母龄段。", "damAgeHistogramChart")}
        ${chartBlock("不同母龄组的产驹胜马率", "比较不同母龄组的胜马表现。", "damAgeWinRateChart")}
      </div>
      <div class="chart-grid">
        ${chartBlock("不同母龄组的重赏马率", "观察重赏马在母龄组中的分布。", "damAgeGradedRateChart")}
        ${chartBlock("胎次与表现", "比较不同胎次的规模与胜马表现。", "damFoalOrderChart")}
      </div>
      ${sectionBlock("母龄分组明细", "按生产本胎时母马年龄分组。",
        analysisTable([
          { label: "母龄组", value: (row) => row.label },
          { label: "产驹数", value: (row) => formatNumber(row.foals) },
          { label: "出赛马", value: (row) => `${formatNumber(row.runners)} (${formatRate(row.runner_rate)})` },
          { label: "胜马", value: (row) => `${formatNumber(row.winners)} (${formatRate(row.winner_foal_rate)})` },
          { label: "重赏马", value: (row) => `${formatNumber(row.graded_winners)} (${formatRate(row.graded_foal_rate)})` },
          { label: "平均奖金", value: (row) => money(row.avg_earnings_per_foal) },
          { label: "中位奖金", value: (row) => money(row.median_earnings_per_runner) },
          { label: "代表马", className: "name-column", value: representativeCell, html: true },
        ], damAgeBucketRows)
      )}
      ${sectionBlock("繁殖牝马明细", "按母马汇总ドゥラメンテ产驹。",
        analysisTable([
          { label: "繁殖牝马", className: "name-column", value: (row) => row.label },
          { label: "母父", className: "name-column", value: (row) => row.broodmare_sire },
          { label: "产驹数", value: (row) => formatNumber(row.foals) },
          { label: "出赛马", value: (row) => formatNumber(row.runners) },
          { label: "胜马", value: (row) => `${formatNumber(row.winners)} (${formatRate(row.winner_foal_rate)})` },
          { label: "重赏马", value: (row) => formatNumber(row.graded_winners) },
          { label: "G1马", value: (row) => formatNumber(row.g1_winners) },
          { label: "总奖金", value: (row) => money(row.total_earnings) },
          { label: "代表产驹", className: "name-column", value: representativeCell, html: true },
        ], broodmares, { initialLimit: 15 })
      )}
      <p class="source-note">${escapeHtml(damAge.source || "母马年龄和胎次根据已整理产驹资料汇总。")}</p>
    </section>
  `;
  wireExpandableTables(els.productionContent);
  renderBreederCharts(breeders);
  renderDamAgeProductionCharts(damAge);
  els.productionContent.dataset.loaded = "true";
}

async function renderRacecourseAnalysis() {
  if (els.racecourseContent.dataset.loaded) return;
  const data = await getAnalytics("racecourses");
  const surfaceColumns = ["芝", "ダ", "障"];
  const distanceColumns = ["1200以下", "1400-1600", "1800-2000", "2200-2400", "2500以上"];
  const topRacecourse = [...(data.table || [])].sort((a, b) => b.wins_starts - a.wins_starts)[0];
  els.racecourseContent.innerHTML = `
    <div class="analysis-title">
      <p class="kicker">赛马场分析</p>
      <h1>競馬場分析</h1>
      <p>比较ドゥラメンテ产驹在不同赛马场的胜场、胜率和上名表现。</p>
    </div>
    <div class="metric-grid compact-metrics">
      ${metricCard("总出赛", formatNumber(data.summary.valid_starts), "比赛记录")}
      ${metricCard("赛马场数", formatNumber(data.summary.courses), "国内外合计")}
      ${metricCard("胜场最多", topRacecourse ? `${escapeHtml(topRacecourse.label)} ${formatNumber(topRacecourse.wins_starts)}胜` : "—", "赛马场")}
    </div>
    <section class="analysis-block race-map-block">
      <div class="section-heading">
        <h2>日本赛马场胜场分布</h2>
        <p>观察JRA与地方赛马场的胜场集中度和取胜效率。</p>
      </div>
      <div class="segment-control compact-control" id="racecourseMapScope">
        <button class="active" type="button" data-map-scope="All">全部</button>
        <button type="button" data-map-scope="JRA">JRA</button>
        <button type="button" data-map-scope="NAR">NAR</button>
      </div>
      <div class="race-map-layout">
        <article class="chart-card race-map-card">
          <div class="chart-card-head">
            <h3>日本全国地图</h3>
            <p>以赛马场所在地呈现全国分布。</p>
          </div>
          ${chartShell("racecourseJapanMap")}
        </article>
        <aside class="race-map-panel" id="racecourseMapLegend" aria-label="赛马场地图图例"></aside>
      </div>
    </section>
    <div class="segment-control" id="racecourseScope">
      <button class="active" type="button" data-scope="JRA">JRA</button>
      <button type="button" data-scope="NAR">NAR</button>
      <button type="button" data-scope="Overseas">海外</button>
      <button type="button" data-scope="All">全部</button>
    </div>
    <div id="racecourseDynamic"></div>
  `;
  const renderMapScope = async (scope) => {
    const mapRows = data.table
      .filter((row) => ["JRA", "NAR"].includes(row.jurisdiction) && (scope === "All" || row.jurisdiction === scope))
      .sort((a, b) => b.wins_starts - a.wins_starts || b.starts - a.starts);
    await renderRacecourseMap(scope, mapRows, data.table);
  };
  for (const button of els.racecourseContent.querySelectorAll("#racecourseMapScope button")) {
    button.addEventListener("click", () => {
      for (const peer of els.racecourseContent.querySelectorAll("#racecourseMapScope button")) {
        peer.classList.toggle("active", peer === button);
      }
      renderMapScope(button.dataset.mapScope).catch((error) => {
        console.error(error);
        const panel = document.querySelector("#racecourseMapLegend");
        if (panel) panel.innerHTML = `<p class="source-note">地图暂时无法显示，请稍后再试。</p>`;
      });
    });
  }
  await renderMapScope("All");
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
        ${chartBlock("各赛马场胜场数与胜率", "比较赛场胜利积累与取胜效率。", "racecourseWinsChart")}
        ${chartBlock("出赛数与前三率", "观察出赛集中度与上名稳定性。", "racecourseStartsChart")}
      </div>
      <div class="chart-grid">
        ${chartBlock("草地与泥地表现", "比较不同场地条件下的取胜表现。", "racecourseSurfaceChart")}
        ${sectionBlock("主要距离表现", "选择赛马场查看距离适性。",
          `<div class="analysis-controls">
            <label><span>赛马场</span><select id="racecourseDistanceCourse">
              ${rows.slice(0, 30).map((row) => `<option value="${escapeHtml(row.label)}">${escapeHtml(row.label)}</option>`).join("")}
            </select></label>
          </div>
          ${chartShell("racecourseDistanceChart")}`
        )}
      </div>
      ${sectionBlock("赛马场综合表", "详细查看各赛马场成绩。",
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
      legend: { top: 0, data: ["出赛次数", "前三率"] },
      grid: { left: 56, right: 58, top: 54, bottom: 54 },
      xAxis: { type: "category", data: startRows.map((row) => row.label), axisLabel: { rotate: 25 } },
      yAxis: [
        { type: "value", name: "出赛" },
        { type: "value", name: "前三率", axisLabel: { formatter: (value) => `${value}%` } },
      ],
      series: [
        { name: "出赛次数", type: "bar", barMaxWidth: 34, data: startRows.map((row) => row.starts), label: { show: true, position: "top" } },
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
      <p>说明收录范围、统计口径和当前数据仍需留意的地方。</p>
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
        <h2>单场奖金资料</h2>
        <div class="metric-grid compact-metrics">
          ${metricCard("已收录赛果", formatNumber(prize.race_rows), "比赛记录")}
          ${metricCard("含奖金记录", formatNumber(prize.nonzero_prize_rows), `占比 ${formatRate(prize.coverage_rate)}`)}
          ${metricCard("可核对奖金", money(prize.sum_raw_prize), "暂不展示图表")}
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
  if (horse.dam_age_at_foaling === null || horse.dam_age_at_foaling === undefined) return "未知";
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
  els.horseRows.innerHTML = `<tr><td colspan="12" class="muted">正在载入产驹资料...</td></tr>`;
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
  `).join("") || `<tr><td colspan="12" class="muted">没有找到符合条件的产驹。</td></tr>`;

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

function horseDamCell(horse) {
  const dam = escapeHtml(horse.dam);
  if (horse.dam_jbis_id) {
    return `<a href="https://www.jbis.jp/horse/${escapeHtml(horse.dam_jbis_id)}/" target="_blank" rel="noreferrer">${dam}</a>`;
  }
  if (horse.dam_netkeiba_id) {
    return `<a href="https://db.netkeiba.com/horse/${escapeHtml(horse.dam_netkeiba_id)}/" target="_blank" rel="noreferrer">${dam}</a>`;
  }
  return dam;
}

function isOverseasRaceSet(races, horse) {
  return horse?.trainer_region === "海外" || races.some((race) => race.source === "breednet");
}

function overseasPrize(race) {
  if (race.prize === null || race.prize === undefined || race.prize === "") return "—";
  const currency = race.data?.currency || (race.source === "breednet" ? "AUD" : "");
  return `${currency === "AUD" ? "A$" : ""}${formatNumber(race.prize)}`;
}

function raceClassText(race) {
  return race.data?.class || race.race_class || "—";
}

function raceSpText(race) {
  return race.data?.sp || race.data?.odds_text || race.odds || "—";
}

function raceRows(races) {
  if (!races.length) {
    return `<p class="muted race-empty">戦績データなし</p>`;
  }
  const overseas = isOverseasRaceSet(races, window.currentDetailHorse);
  if (overseas) {
    return `
      <div class="race-table-wrap">
        <table class="race-table race-table-overseas">
          <thead>
            <tr>
              <th>日付</th>
              <th>開催</th>
              <th>R</th>
              <th>着</th>
              <th>レース</th>
              <th>Class</th>
              <th>頭数</th>
              <th>距離</th>
              <th>騎手</th>
              <th>負磅</th>
              <th>馬番</th>
              <th>SP</th>
              <th>時計</th>
              <th>着差</th>
              <th>頭馬</th>
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
                <td>${escapeHtml(raceClassText(race))}</td>
                <td>${escapeHtml(race.field_size)}</td>
                <td>${escapeHtml(race.distance)} ${escapeHtml(race.track_condition)}</td>
                <td>${escapeHtml(race.jockey)}</td>
                <td>${escapeHtml(race.carried_weight)}</td>
                <td>${escapeHtml(race.horse_number)}</td>
                <td>${escapeHtml(raceSpText(race))}</td>
                <td>${escapeHtml(race.time)}</td>
                <td>${escapeHtml(race.margin)}</td>
                <td>${escapeHtml(race.winner_or_runner_up)}</td>
                <td>${escapeHtml(overseasPrize(race))}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
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

function detailSources(sources) {
  if (!sources || !sources.length) return "";
  const items = sources.map((source) => {
    const label = source.source === "jbis_dam"
      ? `${source.name || "母"} JBIS`
      : source.source === "breednet"
        ? "Daiya Breednet"
        : source.source;
    return `<li><a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a></li>`;
  }).join("");
  return `
    <section class="detail-source-section">
      <h2>资料来源</h2>
      <ul>${items}</ul>
    </section>
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
      <div class="fact"><span>母</span><strong>${horseDamCell(horse)}</strong></div>
      <div class="fact"><span>母出生年</span><strong>${escapeHtml(horse.dam_birth_year || "未知")}</strong></div>
      <div class="fact"><span>产本胎年龄</span><strong>${escapeHtml(damAgeText(horse))}</strong></div>
      <div class="fact"><span>胎次</span><strong>${escapeHtml(horse.foal_order || "未知")}</strong></div>
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
    ${detailSources(data.sources)}
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
  els.horseRows.innerHTML = `<tr><td colspan="11">资料暂时无法载入，请稍后再试。</td></tr>`;
});

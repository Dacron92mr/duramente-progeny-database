const state = {
  view: "progeny",
  pedigree: "bms",
  sire: "annual",
  production: "farm",
  horse: "",
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
  allTotal: 0,
};

const FILTER_META = {
  q: { label: "搜索", element: "search" },
  year: { label: "出生年", element: "year" },
  sex: { label: "性别", element: "sex" },
  color: { label: "毛色", element: "color" },
  region: { label: "所属", element: "region" },
  trainer: { label: "练马师", element: "trainer" },
  owner: { label: "马主", element: "owner" },
  breeder: { label: "生产牧场", element: "breeder" },
  broodmare_sire: { label: "母父", element: "broodmareSire" },
  female_family: { label: "牝系", element: "femaleFamily" },
  dam_age_bucket: { label: "母龄", element: "damAgeBucket" },
  bms_line: { label: "母父系", element: "bmsLine" },
  achievement: { label: "最高成就", element: "achievement" },
  breeding: { label: "退役后与繁殖", element: "breeding" },
};

const UI_VALUE_LABELS = {
  sex: {
    牡: "牡马",
    牝: "牝马",
    セン: "骟马",
    セ: "骟马",
    "♂": "牡马",
    "♀": "牝马",
  },
  achievement: {
    "3勝クラス": "3胜级",
    "2勝クラス": "2胜级",
    "1勝クラス": "1胜级",
    "地方・その他": "地方／其他",
    "未勝利・新馬": "未胜利／新马",
    未勝利: "未胜利",
  },
  breeding: {
    "Stud Record": "种牡马记录",
    "Progeny Record": "繁殖记录",
    なし: "无繁殖记录",
  },
};

function uiValue(value, type) {
  const text = String(value ?? "");
  return UI_VALUE_LABELS[type]?.[text] || text;
}

function careerSummaryText(value) {
  return String(value || "").replaceAll("戦", "战").replaceAll("勝", "胜");
}
const FILTER_KEYS = Object.keys(FILTER_META);
const VALID_VIEWS = new Set(["progeny", "sire", "pedigree", "production", "racecourse", "method"]);
const VALID_PEDIGREE_SECTIONS = new Set(["bms", "family", "inbreeding", "dosage"]);
const VALID_SIRE_SECTIONS = new Set(["annual", "crop", "graded", "market"]);
const VALID_PRODUCTION_SECTIONS = new Set(["farm", "broodmare"]);

const els = {
  search: document.querySelector("#search"),
  mobileSearch: document.querySelector("#mobileSearch"),
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
  activeFilters: document.querySelector("#activeFilters"),
  horseRows: document.querySelector("#horseRows"),
  horseCards: document.querySelector("#horseCards"),
  prev: document.querySelector("#prev"),
  next: document.querySelector("#next"),
  pageLabel: document.querySelector("#pageLabel"),
  drawer: document.querySelector("#drawer"),
  drawerPanel: document.querySelector("#drawerPanel"),
  detail: document.querySelector("#detail"),
  closeDrawer: document.querySelector("#closeDrawer"),
  closeBackdrop: document.querySelector("#closeBackdrop"),
  previousHorse: document.querySelector("#previousHorse"),
  nextHorse: document.querySelector("#nextHorse"),
  filtersPanel: document.querySelector("#filtersPanel"),
  filterOpen: document.querySelector("#filterOpen"),
  filterClose: document.querySelector("#filterClose"),
  filterBackdrop: document.querySelector("#filterBackdrop"),
  filterCountBadge: document.querySelector("#filterCountBadge"),
  tableSortButtons: document.querySelectorAll("[data-table-sort]"),
  navButtons: document.querySelectorAll(".main-nav button"),
  views: document.querySelectorAll(".view"),
  sireContent: document.querySelector("#sireContent"),
  pedigreeContent: document.querySelector("#pedigreeContent"),
  productionContent: document.querySelector("#productionContent"),
  racecourseContent: document.querySelector("#racecourseContent"),
  methodContent: document.querySelector("#methodContent"),
  themeMode: document.querySelector("#themeMode"),
};

function fmt(value) {
  if (value === null || value === undefined || value === "") return "—";
  return value;
}

function money(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return `${Number(value).toLocaleString("zh-CN", { maximumFractionDigits: 1 })} 万日元`;
}

function raceDateValue(value) {
  const text = String(value || "").replaceAll("/", "-").replaceAll(".", "-");
  const parsed = Date.parse(text);
  return Number.isNaN(parsed) ? NaN : parsed;
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
let pedigreeRuntime = null;
let sireRuntime = null;
let productionRuntime = null;
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
  teal: "#4F9F8D",
  green: "#3F8F68",
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
    label: "年度中央（JRA）",
    source_url: "https://db.netkeiba.com/horse/sire_leading_jra.html",
  },
  {
    category: "jra_nar_overall",
    label: "年度综合（JRA+NAR）",
    source_url: "https://www.jbis.or.jp/ranking/result/?ranking=1&kind=1&division=1&racetype1=1&racetype2=1&condition=1&horse=&match=prefix",
  },
  {
    category: "two_year_all",
    label: "两岁马综合",
    source_url: "https://www.jbis.or.jp/ranking/result/?ranking=2&racetype1=1&racetype2=1",
  },
  {
    category: "two_year_jra",
    label: "两岁马中央",
    source_url: "https://www.jbis.or.jp/ranking/result/?ranking=2&kind=1&division=2&racetype1=1&racetype2=1&condition=1&horse=&match=prefix",
  },
  {
    category: "first_crop_all",
    label: "首批产驹综合",
    source_url: "https://www.jbis.or.jp/ranking/result/?ranking=3&kind=1&division=1&racetype1=1&racetype2=1&condition=1&horse=&match=prefix",
  },
  {
    category: "first_crop_jra",
    label: "首批产驹中央",
    source_url: "https://www.jbis.or.jp/ranking/result/?ranking=3&kind=1&division=2&racetype1=1&racetype2=1&condition=1&horse=&match=prefix",
  },
];
const ANNUAL_LEADING_CATEGORIES = new Set(["jra_overall", "jra_nar_overall", "two_year_jra", "two_year_all"]);
const FIRST_CROP_LEADING_CATEGORIES = new Set(["first_crop_all", "first_crop_jra"]);

function leadingCategoryLabel(category, fallback = "") {
  return LEADING_CATEGORY_CATALOG.find((item) => item.category === category)?.label || fallback || category;
}

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

function chartViewportWidth() {
  return Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
}

function getResponsiveGrid(options = {}) {
  const width = chartViewportWidth();
  const horizontal = Boolean(options.horizontal);
  const top = options.top ?? (horizontal ? 24 : 36);
  const bottom = options.bottom ?? (horizontal ? 34 : 42);
  const minRight = horizontal ? (width < 520 ? 28 : 92) : (width < 520 ? 22 : 40);
  const right = Math.max(options.right ?? 40, minRight);
  return {
    left: options.left ?? 12,
    right,
    top,
    bottom,
    containLabel: true,
  };
}

function horizontalGrid(top = 20, bottom = 34, right = 40) {
  return getResponsiveGrid({ horizontal: true, top, bottom, right });
}

function longCategoryAxis(labels, options = {}) {
  const width = chartViewportWidth();
  return {
    type: "category",
    inverse: options.inverse !== false,
    data: labels,
    axisLabel: {
      width: options.width || (width < 520 ? 118 : 190),
      overflow: "break",
      lineHeight: 16,
    },
  };
}

function safeHorizontalBarLabel(formatter, options = {}) {
  return {
    show: true,
    position: "right",
    distance: 8,
    color: options.color || (document.documentElement.dataset.theme === "dark" ? "#f2e9ed" : "#3b3530"),
    fontSize: chartViewportWidth() < 520 ? 10 : 11,
    fontWeight: options.fontWeight || 650,
    formatter(params) {
      return Number(params.value) === 0 ? "" : formatter(params);
    },
  };
}

function safeTopBarLabel(formatter = (params) => formatNumber(params.value), options = {}) {
  return {
    show: true,
    position: "top",
    distance: 6,
    color: options.color || (document.documentElement.dataset.theme === "dark" ? "#f2e9ed" : "#3b3530"),
    fontSize: chartViewportWidth() < 520 ? 10 : 11,
    fontWeight: options.fontWeight || 650,
    formatter,
  };
}

function safeAverageMarkLine(value, label = "总体", axis = "xAxis", options = {}) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return undefined;
  const display = options.isPercent === false ? numeric : Number(numeric.toFixed(1));
  const color = options.color || COLORS.plum;
  return {
    silent: true,
    symbol: ["none", "none"],
    lineStyle: {
      type: "dashed",
      width: 1.5,
      color,
    },
    label: {
      show: options.showLabel !== false,
      formatter: options.formatter || `${label} ${display}${options.unit ?? "%"}`,
      position: axis === "xAxis" ? "insideEndTop" : "end",
      rotate: 0,
      distance: 8,
      padding: [4, 7],
      borderRadius: 4,
      backgroundColor: "rgba(255,255,255,0.92)",
      color,
      fontSize: 12,
      fontWeight: 700,
    },
    data: [{ [axis]: display }],
  };
}

function lineEndpointLabel(count, formatter) {
  return {
    show: false,
    position: "bottom",
    distance: 10,
    formatter(params) {
      if (params.dataIndex === 0 || params.dataIndex === count - 1) {
        return formatter(params);
      }
      return "";
    },
    color: document.documentElement.dataset.theme === "dark" ? "#f2e9ed" : "#3b3530",
    backgroundColor: document.documentElement.dataset.theme === "dark" ? "rgba(33,24,32,.9)" : "rgba(255,255,255,0.88)",
    borderRadius: 3,
    padding: [2, 4],
    fontSize: chartViewportWidth() < 520 ? 10 : 11,
    fontWeight: 650,
  };
}

function fixedHorizontalGrid(labelWidth = 150, top = 48, bottom = 34, right = 54) {
  return {
    left: chartViewportWidth() < 520 ? Math.min(labelWidth, 118) : labelWidth,
    right,
    top,
    bottom,
    containLabel: false,
  };
}

function staticBase() {
  return String(window.STATIC_DATA_BASE || "").replace(/\/$/, "");
}

function isStaticMode() {
  return Boolean(staticBase());
}

async function fetchStaticData(path) {
  const version = String(window.STATIC_DATA_VERSION || "");
  let lastError;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const query = version ? `?v=${encodeURIComponent(version)}${attempt ? `-${attempt}` : ""}` : "";
    try {
      const response = await fetch(`${staticBase()}/${path}${query}`, {
        cache: attempt === 0 ? "default" : "reload",
      });
      if (!response.ok) throw new Error(`Request failed: ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
    }
  }

  throw lastError;
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

function urlForState() {
  const params = new URLSearchParams();
  if (state.view !== "progeny") params.set("view", state.view);
  if (state.view === "pedigree" && state.pedigree !== "bms") params.set("pedigree", state.pedigree);
  if (state.view === "sire" && state.sire !== "annual") params.set("sire", state.sire);
  if (state.view === "production" && state.production !== "farm") params.set("production", state.production);
  for (const key of FILTER_KEYS) {
    if (state[key]) params.set(key === "horse" ? "horse" : key, state[key]);
  }
  if (state.sort !== "earnings_netkeiba") params.set("sort", state.sort);
  if (state.dir !== (state.sort === "name" ? "asc" : "desc")) params.set("dir", state.dir);
  if (state.offset) params.set("offset", String(state.offset));
  if (state.horse) params.set("horse", String(state.horse));
  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
}

function writeUrlState(mode = "push") {
  const url = urlForState();
  if (`${window.location.pathname}${window.location.search}${window.location.hash}` === url) return;
  window.history[mode === "replace" ? "replaceState" : "pushState"]({ duramente: true }, "", url);
}

function readUrlState() {
  const params = new URLSearchParams(window.location.search);
  state.view = VALID_VIEWS.has(params.get("view")) ? params.get("view") : "progeny";
  state.pedigree = VALID_PEDIGREE_SECTIONS.has(params.get("pedigree")) ? params.get("pedigree") : "bms";
  state.sire = VALID_SIRE_SECTIONS.has(params.get("sire")) ? params.get("sire") : "annual";
  state.production = VALID_PRODUCTION_SECTIONS.has(params.get("production")) ? params.get("production") : "farm";
  for (const key of FILTER_KEYS) state[key] = params.get(key) || "";
  state.sort = ["earnings_netkeiba", "birth_year", "name"].includes(params.get("sort")) ? params.get("sort") : "earnings_netkeiba";
  state.dir = ["asc", "desc"].includes(params.get("dir")) ? params.get("dir") : (state.sort === "name" ? "asc" : "desc");
  state.offset = Math.max(0, Number(params.get("offset") || 0));
  state.horse = params.get("horse") || "";
}

function syncControlsFromState() {
  els.search.value = state.q;
  els.mobileSearch.value = state.q;
  for (const [key, meta] of Object.entries(FILTER_META)) {
    if (key === "q") continue;
    const select = els[meta.element];
    if (select) setSelectValue(select, state[key]);
  }
  fillTrainerFacet();
  setSelectValue(els.trainer, state.trainer);
  els.sort.value = state.sort;
  updateDirectionButton();
  renderActiveFilters();
}

function resolvedTheme(preference) {
  if (preference === "dark" || preference === "light") return preference;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function refreshChartTheme() {
  const dark = document.documentElement.dataset.theme === "dark";
  const text = dark ? "#eadfe4" : "#4f4a45";
  const muted = dark ? "#a997a0" : "#817970";
  const line = dark ? "#473540" : "#e8dfd7";
  const tooltipBackground = dark ? "rgba(34, 24, 30, .97)" : "rgba(255, 255, 255, .97)";
  for (const chart of chartRegistry.values()) {
    const option = chart.getOption();
    const axisTheme = (axes = []) => axes.map(() => ({
      axisLabel: { color: muted },
      axisLine: { lineStyle: { color: line } },
      splitLine: { lineStyle: { color: line } },
      nameTextStyle: { color: muted },
    }));
    chart.setOption({
      textStyle: { color },
      legend: (option.legend || []).map(() => ({ textStyle: { color } })),
      xAxis: axisTheme(option.xAxis),
      yAxis: axisTheme(option.yAxis),
      tooltip: (option.tooltip || []).map(() => ({
        backgroundColor: tooltipBackground,
        borderColor: line,
        textStyle: { color },
      })),
      series: (option.series || []).map(() => ({
        label: { color },
        endLabel: { color },
        markLine: { label: { color, backgroundColor: tooltipBackground } },
      })),
    });
    chart.resize();
  }
}

function applyTheme(preference, { persist = true } = {}) {
  const next = ["system", "light", "dark"].includes(preference) ? preference : "system";
  document.documentElement.dataset.themePreference = next;
  document.documentElement.dataset.theme = resolvedTheme(next);
  if (persist) localStorage.setItem("duramente-theme", next);
  if (els.themeMode) els.themeMode.value = next;
  requestAnimationFrame(refreshChartTheme);
  if (state.view === "racecourse" && els.racecourseContent?.dataset.loaded) {
    delete els.racecourseContent.dataset.loaded;
    renderRacecourseAnalysis().catch(console.error);
  }
}

function activeFilterCount() {
  return FILTER_KEYS.filter((key) => Boolean(state[key])).length;
}

function renderActiveFilters() {
  const active = FILTER_KEYS.filter((key) => state[key]);
  els.filterCountBadge.textContent = String(active.length);
  els.filterOpen?.classList.toggle("has-filters", active.length > 0);
  els.activeFilters.innerHTML = active.map((key) => `
    <button class="filter-chip" type="button" data-remove-filter="${key}" title="移除${escapeHtml(FILTER_META[key].label)}筛选">
      ${escapeHtml(FILTER_META[key].label)}: ${escapeHtml(uiValue(state[key], key))}
    </button>
  `).join("") + (active.length ? `<button class="clear-filter-chips" type="button" data-clear-filters>清除全部</button>` : "");
}

function clearAllFilters() {
  for (const key of FILTER_KEYS) state[key] = "";
  state.offset = 0;
  syncControlsFromState();
}

function removeFilter(key) {
  if (!FILTER_META[key]) return;
  state[key] = "";
  state.offset = 0;
  if (key === "region") fillTrainerFacet();
  syncControlsFromState();
  writeUrlState("push");
  loadHorses();
}

function fillFacet(select, rows) {
  const valueType = {
    sex: "sex",
    color: "color",
    achievement: "achievement",
    breeding: "breeding",
  }[select.id];
  for (const row of rows) {
    const option = document.createElement("option");
    option.value = row.value;
    option.textContent = `${uiValue(row.value, valueType)} (${row.count})`;
    select.appendChild(option);
  }
}

function updateDirectionButton() {
  const arrow = state.dir === "asc" ? "↑" : "↓";
  els.direction.textContent = arrow;
  els.direction.setAttribute("aria-label", `排序方向：${state.dir === "asc" ? "升序" : "降序"}`);
  for (const button of els.tableSortButtons) {
    const active = button.dataset.tableSort === state.sort;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
    button.querySelector("span").textContent = active ? arrow : "";
  }
}

async function loadSummary() {
  const summary = await getJson("/api/summary");
  state.allTotal = Number(summary.horses || 0);

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
  els.trainer.innerHTML = `<option value="">全部</option>`;
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
  return Number(value).toLocaleString("zh-CN", { maximumFractionDigits: digits });
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
  const horse = (staticData.horses || []).find((item) => item.name === rep.name);
  const content = `
      <span class="representative-horse-name">${escapeHtml(representativeNameText(rep))}</span>
      ${grade ? `<span class="grade-pill ${representativeGradeClass(grade)}">${escapeHtml(uiValue(grade, "achievement"))}</span>` : ""}
  `;
  return `
    ${horse
      ? `<a class="representative-horse-item" href="${escapeHtml(`${window.location.pathname}?horse=${horse.id}`)}" title="查看${escapeHtml(rep.name)}的产驹资料">${content}</a>`
      : `<span class="representative-horse-item">${content}</span>`}
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
    cross: "Cross 口径",
    dosage: "剂量理论",
    breeder: "生产牧场口径",
    racecourse: "赛马场口径",
    awd: "平均胜距",
    missing_data: "数据局限",
  };
  return labels[key] || key;
}

function chartShell(id) {
  return `<div class="chart-canvas" id="${escapeHtml(id)}"><div class="chart-loading">图表加载中</div></div>`;
}

const CHART_DRILLDOWNS = {
  sireCropEarningsChart: (params) => ({ year: params.name }),
  sireCropWinnersChart: (params) => ({ year: params.name }),
  sireCropGradedChart: (params) => ({ year: params.name }),
  sireAchievementStepChart: (params) => ({ year: params.name }),
  sireAwdDumbbellChart: (params) => ({ year: params.name }),
  bmsLineScaleChart: (params) => ({ bms_line: params.name }),
  bmsLineRelativeChart: (params) => ({ bms_line: params.name }),
  bmsLineChart: (params) => ({ bms_line: params.name }),
  bmsSireContributionChart: (params) => ({ broodmare_sire: params.name }),
  bmsSireEfficiencyChart: (params) => ({ broodmare_sire: params.name }),
  nickingLineChart: (params) => ({ bms_line: params.name }),
  nickingSireChart: (params) => ({ broodmare_sire: params.name }),
  breederMainChart: (params) => ({ breeder: params.name }),
  breederGradedChart: (params) => ({ breeder: params.name }),
  breederCropChart: (params) => ({ breeder: params.name, year: params.seriesName }),
  clubSexShareChart: (params) => ({ year: params.name }),
  "clubWinCompare-牡": (params) => ({ year: params.name, sex: "牡" }),
  "clubWinCompare-牝": (params) => ({ year: params.name, sex: "牝" }),
  "clubWinCompare-セン": (params) => ({ year: params.name, sex: "セン" }),
};

function renderChart(id, option) {
  const el = document.getElementById(id);
  if (!el) return null;
  el.classList.remove("is-rendered");
  if (!window.echarts) {
    el.innerHTML = `<div class="chart-fallback">图表暂时无法显示，可先查看下方表格。</div>`;
    return null;
  }
  if (chartRegistry.has(id)) {
    const oldChart = chartRegistry.get(id);
    oldChart.__resizeObserver?.disconnect?.();
    oldChart.dispose();
  }
  const chart = window.echarts.init(el);
  const valueAxisFormatter = (value) => Number.isInteger(Number(value)) ? formatNumber(value, 0) : formatNumber(value, 2);
  const normalizeAxes = (axes) => {
    const rows = Array.isArray(axes) ? axes : axes ? [axes] : [];
    const normalized = rows.map((axis) => axis?.type === "value" && !axis.axisLabel?.formatter
      ? { ...axis, axisLabel: { ...(axis.axisLabel || {}), formatter: valueAxisFormatter } }
      : axis);
    return Array.isArray(axes) ? normalized : normalized[0];
  };
  const normalizedOption = { ...option, xAxis: normalizeAxes(option.xAxis), yAxis: normalizeAxes(option.yAxis) };
  const normalizedSeries = (normalizedOption.series || []).map((item) => item.type === "bar" ? {
    ...item,
    barMaxWidth: Math.min(Number(item.barMaxWidth || 24), 24),
    barCategoryGap: item.barCategoryGap || "48%",
  } : item);
  const series = window.DuramenteAnimation?.enhanceEChartsSeries(normalizedSeries) || normalizedSeries;
  const axes = window.DuramenteAnimation?.enhanceEChartsAxes(normalizedOption) || {};
  const tooltip = normalizedOption.tooltip ? { confine: true, ...normalizedOption.tooltip } : undefined;
  const grid = Array.isArray(normalizedOption.grid)
    ? normalizedOption.grid.map((item) => ({ containLabel: true, ...item }))
    : normalizedOption.grid ? { containLabel: true, ...normalizedOption.grid } : normalizedOption.grid;
  chart.setOption({ animation: true, animationDurationUpdate: 300, ...normalizedOption, ...axes, grid, tooltip, series });
  chartRegistry.set(id, chart);
  refreshChartTheme();
  const drilldown = CHART_DRILLDOWNS[id];
  if (drilldown) {
    el.classList.add("is-drilldown");
    chart.on("click", (params) => {
      const filters = drilldown(params);
      if (filters && Object.values(filters).some(Boolean)) navigateToProgeny(filters);
    });
  }
  el.classList.add("is-rendered");
  if (!el.dataset.resizeObserved && window.ResizeObserver) {
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(el);
    el.dataset.resizeObserved = "true";
    chart.__resizeObserver = observer;
  }
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
    `<strong>${escapeHtml(params.name)}赛马场</strong>`,
    `赛事体系：${escapeHtml(system)}`,
    `胜场：${formatNumber(wins)}`,
    `出赛：${formatNumber(starts)}`,
    `胜率：${formatNumber(winRate, 1)}%`,
    `前三率：${formatNumber(top3Rate, 1)}%（${formatNumber(top3)}/${formatNumber(starts)}）`,
  ].join("<br>");
}

function mapGeoComponent(name, layout) {
  const dark = document.documentElement.dataset.theme === "dark";
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
      areaColor: dark ? "#2c2329" : "#f4f0eb",
      borderColor: dark ? "#55434d" : "#d8d0c8",
      borderWidth: 0.55,
    },
    emphasis: {
      disabled: true,
      label: { show: false },
      itemStyle: { areaColor: dark ? "#392b33" : "#eee7e0" },
    },
  };
}

function racecourseScatterSeries(name, geoIndex, points, options = {}) {
  const dark = document.documentElement.dataset.theme === "dark";
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
      borderColor: dark ? "#171116" : "#fff",
      borderWidth: 1.6,
    },
    label: options.label || {
      formatter: "{b}",
      color: dark ? "#f2e9ed" : "#302a27",
      fontSize: 11,
      fontWeight: 800,
      textBorderColor: dark ? "#171116" : "#fff",
      textBorderWidth: 3,
    },
    emphasis: {
      scale: true,
      label: {
        show: true,
        formatter: "{b}",
        color: dark ? "#fff" : "#1f1f1f",
        fontWeight: 900,
        textBorderColor: dark ? "#171116" : "#fff",
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

function metricCard(label, value, sub = "", href = "") {
  const tag = href ? "a" : "div";
  const link = href ? ` href="${escapeHtml(href)}"` : "";
  return `
    <${tag} class="metric-stat${href ? " metric-stat-link" : ""}"${link}>
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      ${sub ? `<small>${escapeHtml(sub)}</small>` : ""}
      ${href ? `<i aria-hidden="true">↗</i>` : ""}
    </${tag}>
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
  return safeAverageMarkLine(Number(value || 0) * 100, label, axis, { color: COLORS.muted });
}

function rateTooltip(label, value, numerator, denominator) {
  return `${label}：${formatRate(value)}（${formatNumber(numerator)}/${formatNumber(denominator)}匹产驹）`;
}

function rankingMetricMeta(metric) {
  const map = {
    foals: { label: "产驹数", unit: "匹", type: "bar", value: (row) => row.foals || 0, formatter: (value) => `${formatNumber(value)}匹` },
    total_earnings: { label: "总奖金", unit: "万日元", type: "bar", value: (row) => row.total_earnings || 0, formatter: money },
    winner_foal_rate: { label: "胜马率", unit: "%", type: "point", value: (row) => Number(((row.winner_foal_rate || 0) * 100).toFixed(1)), formatter: (value, row) => rateTooltip("胜马率", row.winner_foal_rate, row.winners, row.foals), numeratorKey: "winners" },
    graded_foal_rate: { label: "重赏马率", unit: "%", type: "point", value: (row) => Number(((row.graded_foal_rate || 0) * 100).toFixed(1)), formatter: (value, row) => rateTooltip("重赏马率", row.graded_foal_rate, row.graded_winners, row.foals), numeratorKey: "graded_winners" },
    graded_winners: { label: "重赏胜马数", unit: "匹", type: "bar", value: (row) => row.graded_winners || 0, formatter: (value) => `${formatNumber(value)}匹` },
    median_earnings_per_runner: { label: "中位奖金", unit: "万日元", type: "point", value: (row) => row.median_earnings_per_runner || 0, formatter: money },
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

function sectionBlock(title, lead, body, kicker = "") {
  return `
    <section class="analysis-block">
      <div class="analysis-block-head">
        ${kicker ? `<p class="kicker">${escapeHtml(kicker)}</p>` : ""}
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
      category: leadingCategoryLabel(row.category, row.category_label),
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

function progenyFilterButton(key, value, label = value) {
  return `<button class="link-button" type="button" data-progeny-filter-key="${escapeHtml(key)}" data-progeny-filter-value="${escapeHtml(value)}">${escapeHtml(label)}</button>`;
}

function setSelectValue(select, value) {
  if ([...select.options].some((option) => option.value === value)) {
    select.value = value;
    return true;
  }
  return false;
}

function closeFilters() {
  els.filtersPanel?.classList.remove("open");
  els.filterBackdrop?.classList.remove("open");
  if (els.filterBackdrop) els.filterBackdrop.hidden = true;
  els.filterOpen?.setAttribute("aria-expanded", "false");
}

function navigateToProgeny(filters = {}) {
  for (const key of FILTER_KEYS) state[key] = "";
  for (const [key, value] of Object.entries(filters)) {
    if (FILTER_META[key] && value !== null && value !== undefined) state[key] = String(value);
  }
  state.view = "progeny";
  state.horse = "";
  state.offset = 0;
  syncControlsFromState();
  closeFilters();
  writeUrlState("push");
  showView("progeny", { updateHistory: false });
  loadHorses();
}

window.navigateToProgeny = navigateToProgeny;

function applyBmsFilter(value) {
  navigateToProgeny({ bms_line: value });
}

function applyBroodmareSireFilter(value) {
  navigateToProgeny({ broodmare_sire: value });
}

function applySearchFilter(value) {
  navigateToProgeny({ q: value });
}

function applyFemaleFamilyFilter(value) {
  navigateToProgeny({ female_family: value });
}

function applyBreederFilter(value) {
  navigateToProgeny({ breeder: value });
}

async function openHorseDetailFromChart(name) {
  const query = String(name || "").trim();
  if (!query) return;
  const result = await getJson(`/api/horses?q=${encodeURIComponent(query)}&limit=20&offset=0`);
  const horses = result.horses || result.items || [];
  const exact = horses.find((horse) => [horse.name, horse.name_en, horse.hkjc_name_zh].filter(Boolean).some((item) => String(item) === query));
  const target = exact || horses[0];
  if (target?.id) {
    openHorse(target.id);
  } else {
    applySearchFilter(query);
  }
}

function wireAnalysisFilters(container) {
  for (const button of container.querySelectorAll("[data-progeny-filter-key]")) {
    if (button.dataset.progenyFilterWired === "true") continue;
    button.dataset.progenyFilterWired = "true";
    button.addEventListener("click", () => navigateToProgeny({
      [button.dataset.progenyFilterKey]: button.dataset.progenyFilterValue,
    }));
  }
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
    total_earnings: { label: "总奖金", unit: "万日元", format: money },
    earnings_per_foal: { label: "每匹平均奖金", unit: "万日元/匹", format: money },
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
          `${row.label}年出生`,
          `产驹数：${formatNumber(row.foals)} / 出赛马：${formatNumber(row.runners)}`,
          `${config.barName}：${config.barFormatter(row[config.barKey])}`,
          `${config.lineName}：${config.lineFormatter(row[config.lineKey], row)}`,
        ].join("<br>");
      },
    },
    legend: { top: 0, data: [config.barName, config.lineName] },
    grid: getResponsiveGrid({ left: 46, right: 70, top: 58, bottom: 38 }),
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
        label: safeTopBarLabel((params) => config.barLabel(params.data.raw)),
      },
      {
        name: config.lineName,
        type: "line",
        yAxisIndex: 1,
        symbolSize: 8,
        lineStyle: { width: 3 },
        data: crops.map((row, index) => ({ value: lineValues[index], raw: row })),
        label: { show: false },
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
            return `${item.marker}${row.label}年出生：${formatNumber(count)}匹 / 占产驹 ${formatRate(foalRate)}${runnerText}`;
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

function renderCropAwdDumbbellChart(awd) {
  const rows = awd.by_crop || [];
  const overallColor = COLORS.duramente;
  const turfColor = "#4f8a62";
  const dirtColor = "#9a6b45";
  renderChart("sireAwdDumbbellChart", {
    color: [overallColor, turfColor, dirtColor],
    tooltip: {
      trigger: "axis",
      formatter: (items) => {
        const row = items[0]?.data.raw;
        return [
          `${row.label}年出生`,
          `Overall AWD：${row.overall_awd ? `${formatNumber(row.overall_awd, 0)}m` : "—"}`,
          `Turf AWD：${row.turf_awd ? `${formatNumber(row.turf_awd, 0)}m` : "—"}`,
          `Dirt AWD：${row.dirt_awd ? `${formatNumber(row.dirt_awd, 0)}m` : "—"}`,
          `胜场：${formatNumber(row.wins)}`,
        ].join("<br>");
      },
    },
    legend: { top: 0, data: ["Overall", "Turf", "Dirt"] },
    grid: { left: 48, right: 24, top: 52, bottom: 40, containLabel: true },
    xAxis: { type: "category", name: "出生年", data: rows.map((row) => row.label) },
    yAxis: { type: "value", name: "m", min: (value) => Math.max(0, Math.floor((value.min || 0) / 100) * 100 - 100) },
    series: [
      { name: "Overall", type: "line", symbolSize: 9, itemStyle: { color: overallColor }, data: rows.map((row) => ({ value: row.overall_awd, raw: row })) },
      { name: "Turf", type: "line", symbolSize: 8, itemStyle: { color: turfColor }, data: rows.map((row) => ({ value: row.turf_awd, raw: row })) },
      { name: "Dirt", type: "line", symbolSize: 8, itemStyle: { color: dirtColor }, data: rows.map((row) => ({ value: row.dirt_awd, raw: row })) },
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

function annualEarningsStatusLabel(row) {
  if (row.earnings_status === "complete") return "JBIS年度榜";
  if (row.earnings_status === "partial") return "部分数据";
  return "—";
}

function annualEarningsHtml(row) {
  const value = row.earnings == null ? "—" : money(row.earnings);
  const status = annualEarningsStatusLabel(row);
  const statusClass = row.earnings_status === "partial" ? "status-partial" : "status-complete";
  return `${escapeHtml(value)}${status !== "—" ? ` <span class="mini-status ${statusClass}">${escapeHtml(status)}</span>` : ""}`;
}

function annualChartTooltip(metric, row) {
  const lines = [`${row.year}年`];
  if (metric === "wins") {
    lines.push(`胜场：${formatNumber(row.wins)}（JRA ${formatNumber(row.jra_wins)} / NAR ${formatNumber(row.nar_wins)} / 海外 ${formatNumber(row.overseas_wins)}）`);
  } else if (metric === "starts") {
    lines.push(`出赛：${formatNumber(row.starts)}次`, `出赛马：${formatNumber(row.runners)}匹`);
  } else if (metric === "graded") {
    lines.push(`重赏：${formatNumber(row.graded_wins)}（G1 ${formatNumber(row.g1_wins)} / G2 ${formatNumber(row.g2_wins)} / G3 ${formatNumber(row.g3_wins)}）`);
  } else {
    lines.push(`奖金：${row.earnings == null ? "—" : money(row.earnings)}`);
    if (row.earnings_source) lines.push(`来源：${escapeHtml(row.earnings_source)}`);
    if (row.earnings_status === "partial") lines.push("该年度仍在进行中。");
  }
  return lines.join("<br>");
}

function milestonePoints(events, jurisdiction) {
  const rows = [...(events || [])]
    .filter((row) => !jurisdiction || row.jurisdiction === jurisdiction)
    .sort((a, b) => raceDateValue(a.race_date) - raceDateValue(b.race_date));
  return rows
    .map((row, index) => ({ ...row, cumulative_wins: index + 1 }))
    .filter((row) => row.cumulative_wins % 100 === 0);
}

function renderMilestoneTimeline(targetId, inputPoints) {
  const target = document.querySelector(`#${targetId}`);
  if (!target) return;
  const points = [...(inputPoints || [])].sort((a, b) => raceDateValue(a.race_date) - raceDateValue(b.race_date));
  if (!points.length) {
    target.innerHTML = `<p class="empty-note">暂无累计胜场里程碑。</p>`;
    return;
  }
  const dates = points.map((row) => raceDateValue(row.race_date)).filter((value) => Number.isFinite(value));
  const minDate = Math.min(...dates);
  const maxDate = Math.max(...dates);
  const span = Math.max(maxDate - minDate, 1);
  const compact = target.closest(".milestone-compact-card");
  const width = Math.max(compact ? 520 : 860, points.length * (compact ? 118 : 138));
  const nodes = points.map((row, index) => {
    const left = 54 + ((raceDateValue(row.race_date) - minDate) / span) * (width - 108);
    const side = index % 2 === 0 ? "above" : "below";
    return `
      <button class="milestone-node ${side}" type="button" style="left:${left}px;" data-milestone-index="${index}" aria-label="第${formatNumber(row.cumulative_wins)}胜 ${escapeHtml(row.race_date || "")}">
        <span class="milestone-dot"></span>
        <span class="milestone-label">第${formatNumber(row.cumulative_wins)}胜<br><small>${escapeHtml(row.race_date || "")}</small></span>
      </button>
    `;
  }).join("");
  target.innerHTML = `
    <div class="milestone-scroll" role="group" aria-label="累计胜场里程碑时间轴">
      <div class="milestone-track" style="width:${width}px">
        <div class="milestone-axis"></div>
        ${nodes}
      </div>
    </div>
    <div class="milestone-detail" id="milestoneDetail" aria-live="polite"></div>
  `;
  const detail = target.querySelector("#milestoneDetail");
  const renderDetail = (row) => {
    if (!detail || !row) return;
    const horse = `${escapeHtml(row.horse || "")}${row.hkjc_name_zh ? `（${escapeHtml(row.hkjc_name_zh)}）` : ""}`;
    detail.innerHTML = `
      <strong>第${formatNumber(row.cumulative_wins)}胜</strong>
      <span>${escapeHtml(row.race_date || "")} · ${escapeHtml(row.meeting || row.raw_meeting || "")} · ${escapeHtml(row.jurisdiction || "")}</span>
      <span>${escapeHtml(row.race_name || "")}</span>
      <span>胜马：${horse}</span>
      ${row.race_url ? `<a href="${escapeHtml(row.race_url)}" target="_blank" rel="noreferrer">赛事链接</a>` : ""}
    `;
  };
  renderDetail(points[0]);
  for (const button of target.querySelectorAll("[data-milestone-index]")) {
    button.addEventListener("click", () => {
      target.querySelector(".milestone-node.is-active")?.classList.remove("is-active");
      button.classList.add("is-active");
      renderDetail(points[Number(button.dataset.milestoneIndex)]);
    });
  }
  target.querySelector("[data-milestone-index]")?.classList.add("is-active");
}

function renderAnnualMilestoneTimeline(annualPerformance) {
  const events = annualPerformance?.win_events || [];
  renderMilestoneTimeline("jraMilestoneTimeline", milestonePoints(events, "JRA"));
  renderMilestoneTimeline("narMilestoneTimeline", milestonePoints(events, "NAR"));
  renderMilestoneTimeline("cumulativeMilestoneTimeline", annualPerformance?.milestones || milestonePoints(events));
}

function annualSeriesForMetric(metric, rows) {
  const barBase = {
    type: "bar",
    barMaxWidth: 24,
    itemStyle: { borderRadius: [4, 4, 0, 0] },
  };
  if (metric === "earnings") {
    return {
      legend: ["年度奖金"],
      yAxis: [{ type: "value", name: "万日元" }],
      series: [{
        ...barBase,
        name: "年度奖金",
        data: rows.map((row) => ({
          value: row.earnings == null ? null : Number(row.earnings),
          raw: row,
          itemStyle: { color: row.earnings_status === "partial" ? COLORS.gold : COLORS.duramente },
        })),
        label: { show: true, position: "top", formatter: (params) => params.value == null ? "" : formatNumber(params.value, 0) },
      }],
    };
  }
  if (metric === "starts") {
    return {
      legend: ["出赛次数", "出赛马"],
      yAxis: [{ type: "value", name: "次数 / 匹" }],
      series: [
        { ...barBase, name: "出赛次数", itemStyle: { color: COLORS.teal, borderRadius: [4, 4, 0, 0] }, data: rows.map((row) => ({ value: row.starts, raw: row })) },
        { ...barBase, name: "出赛马", itemStyle: { color: COLORS.gold, borderRadius: [4, 4, 0, 0] }, data: rows.map((row) => ({ value: row.runners, raw: row })) },
      ],
    };
  }
  if (metric === "graded") {
    return {
      legend: ["G1", "G2", "G3"],
      yAxis: [{ type: "value", name: "胜场" }],
      series: [
        { ...barBase, name: "G1", stack: "graded", itemStyle: { color: COLORS.raceLine, borderRadius: [0, 0, 0, 0] }, data: rows.map((row) => ({ value: row.g1_wins, raw: row })) },
        { ...barBase, name: "G2", stack: "graded", itemStyle: { color: COLORS.duramente, borderRadius: [0, 0, 0, 0] }, data: rows.map((row) => ({ value: row.g2_wins, raw: row })) },
        { ...barBase, name: "G3", stack: "graded", itemStyle: { color: COLORS.green, borderRadius: [4, 4, 0, 0] }, data: rows.map((row) => ({ value: row.g3_wins, raw: row })) },
      ],
    };
  }
  return {
    legend: ["JRA", "NAR", "海外"],
    yAxis: [{ type: "value", name: "胜场" }],
    series: [
      { ...barBase, name: "JRA", stack: "wins", itemStyle: { color: COLORS.duramente, borderRadius: [0, 0, 0, 0] }, data: rows.map((row) => ({ value: row.jra_wins, raw: row })) },
      { ...barBase, name: "NAR", stack: "wins", itemStyle: { color: COLORS.coral, borderRadius: [0, 0, 0, 0] }, data: rows.map((row) => ({ value: row.nar_wins, raw: row })) },
      { ...barBase, name: "海外", stack: "wins", itemStyle: { color: COLORS.gold, borderRadius: [4, 4, 0, 0] }, data: rows.map((row) => ({ value: row.overseas_wins, raw: row })) },
    ],
  };
}

function renderAnnualPerformanceCharts(annualPerformance) {
  const rows = [...(annualPerformance?.annual || [])].sort((a, b) => Number(a.year) - Number(b.year));
  for (const metric of ["wins", "starts", "graded", "earnings"]) {
    const config = annualSeriesForMetric(metric, rows);
    renderChart(`annualPerformance-${metric}`, {
      color: config.legend.map((name) => ({
        JRA: COLORS.duramente, NAR: COLORS.coral, 海外: COLORS.gold,
        G1: COLORS.raceLine, G2: COLORS.duramente, G3: COLORS.green,
        年度奖金: COLORS.duramente, 出赛次数: COLORS.teal, 出赛马: COLORS.gold,
      }[name] || COLORS.duramente)),
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, confine: true, formatter: (items) => annualChartTooltip(metric, items[0]?.data?.raw || {}) },
      legend: { top: 0, data: config.legend, itemWidth: 12, itemHeight: 8, textStyle: { fontSize: 10 } },
      grid: { left: 38, right: 12, top: 48, bottom: 32, containLabel: true },
      xAxis: { type: "category", data: rows.map((row) => row.year), axisLabel: { fontSize: 10 } },
      yAxis: config.yAxis.map((axis) => ({ ...axis, name: "", axisLabel: { ...(axis.axisLabel || {}), fontSize: 10 } })),
      series: config.series.map((item) => ({ ...item, label: { ...(item.label || {}), fontSize: 9 }, labelLayout: { hideOverlap: true, moveOverlap: "shiftY" } })),
    });
  }

  renderAnnualMilestoneTimeline(annualPerformance);

  const tableTarget = document.querySelector("#annualPerformanceTable");
  if (tableTarget) {
    tableTarget.innerHTML = analysisTable([
      { label: "年份", value: (row) => row.year },
      { label: "出赛", value: (row) => formatNumber(row.starts) },
      { label: "胜场", value: (row) => `${formatNumber(row.wins)}（JRA ${formatNumber(row.jra_wins)} / NAR ${formatNumber(row.nar_wins)} / 海外 ${formatNumber(row.overseas_wins)}）` },
      { label: "胜率", value: (row) => formatRate(row.win_rate) },
      { label: "前三率", value: (row) => formatRate(row.top3_rate) },
      { label: "重赏", value: (row) => `${formatNumber(row.graded_wins)}（G1 ${formatNumber(row.g1_wins)} / G2 ${formatNumber(row.g2_wins)} / G3 ${formatNumber(row.g3_wins)}）` },
      { label: "奖金", value: annualEarningsHtml, html: true },
    ], [...rows].reverse(), { initialLimit: 10 });
    wireExpandableTables(tableTarget);
  }
}

function renderSireCharts(profile, market, leadingHistory, leadingTop10, categories, annualPerformance, awd) {
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
    yAxis: { type: "value", name: "配种母马数" },
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
    yAxis: { type: "value", name: "万日元" },
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
    barUnit: "万日元",
    lineUnit: "万日元/匹",
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
  renderCropAwdDumbbellChart(awd);

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
            formatter: (params) => `${params.data.year}\n第1名`,
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
    ? { key: "earnings", label: "奖金", unit: "万日元" }
    : chartRows.some((row) => row.wins != null)
      ? { key: "wins", label: "胜场", unit: "场" }
      : { key: "runners", label: "出赛马", unit: "匹" };
  renderChart("sireTop10Chart", (missing || !chartRows.length) ? { title: { text: missing ? "该分类暂缺公开榜单" : "该年份暂缺榜单资料", left: "center", top: "middle" } } : {
    color: [COLORS.muted],
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (items) => {
        const item = items[0];
        const row = item.data.raw;
        return [
          `${row.year} ${leadingCategoryLabel(row.category, row.category_label)}`,
          `第${row.rank}名 ${escapeHtml(row.sire)}`,
          `${topMetric.label}：${formatNumber(row[topMetric.key], 1)} ${topMetric.unit}`,
          `出赛马：${formatNumber(row.runners || 0)}匹`,
          `胜马：${formatNumber(row.winners || 0)}匹 / 胜场：${formatNumber(row.wins || 0)}场`,
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
      label: safeHorizontalBarLabel((params) => formatNumber(params.value, 1)),
    }],
  });
}

function activateSireSection(section, { updateHistory = true } = {}) {
  const next = VALID_SIRE_SECTIONS.has(section) ? section : "annual";
  state.sire = next;
  for (const button of els.sireContent.querySelectorAll("[data-sire-section]")) {
    const active = button.dataset.sireSection === next;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
    button.tabIndex = active ? 0 : -1;
  }
  for (const panel of els.sireContent.querySelectorAll("[data-sire-panel]")) panel.hidden = panel.dataset.sirePanel !== next;
  if (updateHistory) writeUrlState("push");
  if (sireRuntime) requestAnimationFrame(() => renderSireCharts(...sireRuntime));
}

async function renderSireAnalysis() {
  if (els.sireContent.dataset.loaded) return;
  const [overview, sireProfile, annualPerformance, market, leadingHistory, leadingTop10, rawCategories, awd] = await Promise.all([
    getAnalytics("overview"),
    getAnalytics("sire_profile"),
    getAnalytics("annual_progeny_performance"),
    getAnalytics("sire_market"),
    getAnalytics("leading_sire_history"),
    getAnalytics("leading_sire_top10"),
    getAnalytics("sire_category_rankings"),
    getAnalytics("awd"),
  ]);
  const categories = normalizeLeadingCategories(rawCategories);
  const profile = sireProfile.summary;
  const years = [...new Set((leadingHistory.history || [])
    .filter((row) => Number(row.year) >= 2020 && Number(row.year) <= 2025)
    .map((row) => Number(row.year)))]
    .sort((a, b) => b - a);
  els.sireContent.innerHTML = `
    <div class="analysis-title">
      <p class="kicker">SIRE CAREER</p>
      <h1>种牡马生涯</h1>
      <p>从年度成绩、出生世代、配种规模和重赏胜利，观察ドゥラメンテ作为种牡马的整体表现。</p>
    </div>
    <div class="metric-grid compact-metrics sire-metrics">
      ${metricCard("累计总奖金", money(profile.total_earnings), "查看奖金排序", `${window.location.pathname}?sort=earnings_netkeiba`)}
      ${metricCard("产驹数", formatNumber(profile.foals), "查看全部产驹", window.location.pathname)}
      ${metricCard("累计胜场", formatNumber(annualPerformance.summary?.total_wins || 0), `JRA ${formatNumber(annualPerformance.summary?.jra_wins || 0)} / NAR ${formatNumber(annualPerformance.summary?.nar_wins || 0)} / 海外 ${formatNumber(annualPerformance.summary?.overseas_wins || 0)}`, `${window.location.pathname}?view=sire&sire=annual`)}
      ${metricCard("重赏胜马", formatNumber(profile.graded_winners), `G1 ${formatNumber(profile.g1_horses)}`, `${window.location.pathname}?view=sire&sire=graded`)}
    </div>
    <div class="pedigree-section-nav section-card-nav" role="tablist" aria-label="种牡马生涯分类">
      <button type="button" role="tab" data-sire-section="annual"><span>01</span><strong>年度相关</strong><small>胜场与 Leading Sire</small></button>
      <button type="button" role="tab" data-sire-section="crop"><span>02</span><strong>出生世代</strong><small>表现、成长与 AWD</small></button>
      <button type="button" role="tab" data-sire-section="graded"><span>03</span><strong>重赏里程碑</strong><small>G1・G2・G3 累计</small></button>
      <button type="button" role="tab" data-sire-section="market"><span>04</span><strong>配种市场</strong><small>配种费与配种数量</small></button>
    </div>
    <div class="analysis-subpanel" data-sire-panel="annual">
    ${sectionBlock("年度表现", "按比赛年份查看胜场、出赛马、重赏胜利和奖金变化。",
      `<div class="mini-chart-grid annual-mini-grid">
        ${chartBlock("胜场", "JRA／NAR／海外", "annualPerformance-wins")}
        ${chartBlock("出赛", "出赛次数／出赛马", "annualPerformance-starts")}
        ${chartBlock("重赏", "G1／G2／G3", "annualPerformance-graded")}
        ${chartBlock("奖金", "年度奖金（万日元）", "annualPerformance-earnings")}
      </div>
      <article class="chart-card table-card">
        <div class="chart-card-head"><h3>年度明细</h3></div>
        <div id="annualPerformanceTable"></div>
      </article>
      <div class="milestone-grid">
        <article class="chart-card milestone-timeline-card milestone-compact-card">
          <div class="chart-card-head"><h3>JRA 累计胜场</h3><p>每100胜的代表节点。</p></div>
          <div id="jraMilestoneTimeline"></div>
        </article>
        <article class="chart-card milestone-timeline-card milestone-compact-card">
          <div class="chart-card-head"><h3>NAR 累计胜场</h3><p>每100胜的代表节点。</p></div>
          <div id="narMilestoneTimeline"></div>
        </article>
      </div>
      <details class="analysis-block milestone-total-details">
        <summary>查看总累计胜场（含海外）</summary>
        <article class="chart-card milestone-timeline-card">
          <div class="chart-card-head"><h3>全部累计胜场</h3><p>JRA、NAR及海外合计，每100胜的代表节点。</p></div>
          <div id="cumulativeMilestoneTimeline"></div>
        </article>
      </details>`
    , "ANNUAL PERFORMANCE")}
    ${sectionBlock("年度种牡马排名", "查看ドゥラメンテ在不同榜单中的年度排名，并与同年头部种牡马比较。",
      `<div class="analysis-controls">
        <label><span>分类</span><select id="sireLeadingCategory">
          ${(categories.categories || []).filter((row) => ANNUAL_LEADING_CATEGORIES.has(row.category)).map((row) => `<option value="${escapeHtml(row.category)}">${escapeHtml(row.label)}${row.status === "available" ? "" : "（暂无）"}</option>`).join("")}
        </select></label>
        <label><span>Top 10 年份</span><select id="sireTop10Year">
          ${years.map((year) => `<option value="${year}" ${year === 2023 ? "selected" : ""}>${year}</option>`).join("")}
        </select></label>
      </div>
      <p class="source-note" id="leadingMissingMessage"></p>
      <div class="chart-grid">
        ${chartBlock("年度排名", "排名数字越小表示位置越高。", "sireLeadingRankChart")}
        ${chartBlock("同年 Top 10", "比较同一分类中的头部种牡马。", "sireTop10Chart")}
      </div>
      ${analysisTable([
        { label: "年份", value: (row) => row.year },
        { label: "分类", value: (row) => leadingCategoryLabel(row.category, row.category_label) },
        { label: "排名", value: (row) => row.rank },
        { label: "种牡马", value: (row) => row.sire },
        { label: "奖金", value: (row) => money(row.earnings) },
        { label: "榜首", value: (row) => row.leader_sire || "—" },
        { label: "距榜首差距", value: (row) => row.earnings_gap_to_leader == null ? "—" : money(row.earnings_gap_to_leader) },
      ], (leadingHistory.history || []), { initialLimit: 8 })}
      ${renderLeadingSourceDetails(leadingHistory.history || [])}`
    , "LEADING SIRE")}
    </div>
    <div class="analysis-subpanel" data-sire-panel="crop">
    ${sectionBlock("出生世代表现", "比较不同出生世代的奖金、胜马和重赏表现。",
      `<div class="chart-grid cohort-grid">
        ${chartBlock("奖金表现", "比较各世代的总奖金与平均表现。", "sireCropEarningsChart")}
        ${chartBlock("胜马表现", "比较各世代的胜马数量与比例。", "sireCropWinnersChart")}
        ${chartBlock("重赏表现", "观察重赏马在各世代中的分布。", "sireCropGradedChart")}
        ${chartBlock("各出生世代的成就转化", "观察各世代从出赛到高水平胜出的过程。", "sireAchievementStepChart")}
        ${chartBlock("各出生世代的平均胜距", "比较 Overall、Turf 与 Dirt AWD。", "sireAwdDumbbellChart")}
        ${controlledChartBlock("产驹成长曲线", "观察各世代从两岁起的胜场积累。", "sireDevelopmentChart", `
          <label><span>标准化</span><select id="sireDevelopmentMetric">
            <option value="cumulative_wins">原始累计胜场</option>
            <option value="cumulative_wins_per_100_foals">每100匹产驹</option>
            <option value="cumulative_wins_per_100_runners">每100匹出赛马</option>
          </select></label>
        `)}
      </div>`
    , "CROP PERFORMANCE")}
    ${sectionBlock("平均胜距（AWD）", "AWD 来自实际获胜距离；DI 与 CD 描述血统中的速度与耐力结构。", `
      <div class="metric-grid compact-metrics awd-metrics">
        ${metricCard("Overall AWD", `${formatNumber(awd.summary?.overall_awd, 0)} m`, `${formatNumber(awd.summary?.overall_wins)} 场胜利`)}
        ${metricCard("Turf AWD", `${formatNumber(awd.summary?.turf_awd, 0)} m`, `${formatNumber(awd.summary?.turf_wins)} 场胜利`)}
        ${metricCard("Dirt AWD", `${formatNumber(awd.summary?.dirt_awd, 0)} m`, `${formatNumber(awd.summary?.dirt_wins)} 场胜利`)}
      </div>
      <h3>实际表现与血统参数差异</h3>
      <p class="section-inline-note">以 AWD 与 DI／CD 的耐力倾向百分位比较，正值表示实际胜距比血统参数所示更长。</p>
      ${analysisTable([
        { label: "马名", className: "name-column", value: (row) => `<button type="button" class="link-button" data-open-horse="${row.horse_id}">${escapeHtml(row.name)}</button>`, html: true },
        { label: "胜场", value: (row) => formatNumber(row.wins) },
        { label: "Overall AWD", value: (row) => `${formatNumber(row.overall_awd, 0)} m` },
        { label: "DI", value: (row) => formatNumber(row.di, 2) },
        { label: "CD", value: (row) => formatNumber(row.cd, 2) },
        { label: "倾向差", value: (row) => `${row.stamina_gap > 0 ? "+" : ""}${formatNumber(row.stamina_gap, 2)}` },
      ], awd.discrepancies || [], { initialLimit: 10 })}
    `, "AVERAGE WINNING DISTANCE")}
    </div>
    <div class="analysis-subpanel" data-sire-panel="market">
    ${sectionBlock("配种规模与市场评价", "通过配种母马数和配种费变化，观察市场对种牡马的需求与定价。",
      `<div class="chart-grid">
        ${chartBlock("配种规模变化", "比较配种热度与同期社台平均水平。", "sireMaresCoveredChart")}
        ${chartBlock("市场定价变化", "观察配种费随市场评价的变化。", "sireStudFeeChart")}
      </div>`
    , "BREEDING MARKET")}
    </div>
    <div class="analysis-subpanel" data-sire-panel="graded">
    ${sectionBlock("重赏胜利", "按年份和胜马查看每一场 G1、G2、G3 胜利，以及重赏成绩的累计过程。",
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
    , "GRADED WINS")}
    </div>
    <div class="analysis-subpanel" data-sire-panel="crop">
    ${sectionBlock("出生世代明细", "按出生年份汇总产驹规模、成绩转化、奖金和距离适性。",
      analysisTable([
        { label: "出生年", value: (row) => progenyFilterButton("year", row.label), html: true },
        { label: "产驹数", value: (row) => formatNumber(row.foals) },
        { label: "出赛马", value: (row) => `${formatNumber(row.runners)} (${formatRate(row.debut_rate)})` },
        { label: "胜马", value: (row) => `${formatNumber(row.winners)} (${formatRate(row.winner_foal_rate)})` },
        { label: "2胜以上", value: (row) => `${formatNumber(row.two_win_horses)} (${formatRate(row.two_win_rate)})` },
        { label: "3胜以上", value: (row) => `${formatNumber(row.three_win_horses)} (${formatRate(row.three_win_rate)})` },
        { label: "重赏胜马", value: (row) => formatNumber(row.graded_winners) },
        { label: "G1/G2/G3", value: (row) => `${formatNumber(row.g1_horses)}/${formatNumber(row.g2_horses)}/${formatNumber(row.g3_horses)}` },
        { label: "总奖金", value: (row) => money(row.total_earnings) },
        { label: "每匹平均", value: (row) => money(row.earnings_per_foal) },
        { label: "芝地平均胜距", value: (row) => row.turf_awd ? `${formatNumber(row.turf_awd)} m` : "—" },
        { label: "泥地平均胜距", value: (row) => row.dirt_awd ? `${formatNumber(row.dirt_awd)} m` : "—" },
        { label: "代表马", className: "name-column", value: representativeCell, html: true },
      ], sireProfile.crops, { initialLimit: 10 })
    , "CROP DETAILS")}
    </div>
  `;
  wireAnalysisFilters(els.sireContent);
  wireExpandableTables(els.sireContent);
  sireRuntime = [sireProfile, market, leadingHistory, leadingTop10, categories, annualPerformance, awd];
  const rerender = () => renderSireCharts(...sireRuntime);
  for (const id of ["sireDevelopmentMetric", "sireLeadingCategory", "sireTop10Year"]) {
    els.sireContent.querySelector(`#${id}`)?.addEventListener("change", rerender);
  }
  for (const button of els.sireContent.querySelectorAll("[data-sire-section]")) button.addEventListener("click", () => activateSireSection(button.dataset.sireSection));
  for (const button of els.sireContent.querySelectorAll("[data-open-horse]")) button.addEventListener("click", () => openHorse(button.dataset.openHorse));
  activateSireSection(state.sire, { updateHistory: false });
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
      <p class="kicker">BROODMARE SIRE</p>
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
      label: safeHorizontalBarLabel((params) => `${formatNumber(params.value)}匹`),
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
      markLine: safeAverageMarkLine(0, "", "xAxis", { isPercent: false, unit: "", showLabel: false, color: COLORS.negative }),
      label: safeHorizontalBarLabel((params) => `${params.value > 0 ? "+" : ""}${params.value}%`),
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
    xAxis: { type: "value", name: "万日元" },
    yAxis: longCategoryAxis(contributionRows.map((row) => row.label), { width: 150 }),
    series: [{
      name: "总奖金",
      type: "bar",
      barMaxWidth: 16,
      data: contributionRows.map((row) => ({ value: row.total_earnings || 0, raw: row })),
      label: safeHorizontalBarLabel((params) => formatNumber(params.value, 0)),
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
      label: safeHorizontalBarLabel((params) => `${params.value}%`),
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

const PEDIGREE_SEXES = ["牡", "牝", "セン"];
const BMS_PRIMARY_LINES = ["Northern Dancer", "Sunday Silence", "Native Dancer", "Nasrullah", "Turn-to", "Other"];
const BMS_CATEGORY_COLORS = {
  "Northern Dancer": "#8d59ad",
  "Sunday Silence": "#42a9b8",
  "Native Dancer": "#e7a34d",
  Nasrullah: "#d85c9e",
  "Turn-to": "#78b95f",
  Other: "#8b8580",
};

function horseStarts(horse) {
  return Number(String(horse.career_summary || "").match(/(\d+)戦/)?.[1] || 0);
}

function emptyPerformanceStats() {
  return { foals: 0, runners: 0, winners: 0, graded_winners: 0, total_earnings: 0 };
}

function addHorseToStats(stats, horse) {
  stats.foals += 1;
  if (horseStarts(horse) > 0) stats.runners += 1;
  if (horseWins(horse) > 0) stats.winners += 1;
  if (horseIsGraded(horse)) stats.graded_winners += 1;
  stats.total_earnings += Number(horse.earnings_netkeiba ?? horse.earnings_jbis ?? 0);
}

function finishPerformanceStats(stats) {
  return {
    ...stats,
    runner_rate: stats.foals ? stats.runners / stats.foals : 0,
    winner_foal_rate: stats.foals ? stats.winners / stats.foals : 0,
    graded_foal_rate: stats.foals ? stats.graded_winners / stats.foals : 0,
  };
}

function lineagePerformanceRows(horses, key) {
  const groups = new Map();
  for (const horse of horses) {
    const label = String(horse[key] || (key === "bms_line" ? "Other" : "未分类"));
    if (!groups.has(label)) {
      groups.set(label, {
        label,
        stats: emptyPerformanceStats(),
        sexes: Object.fromEntries(PEDIGREE_SEXES.map((sex) => [sex, emptyPerformanceStats()])),
        horses: [],
      });
    }
    const group = groups.get(label);
    addHorseToStats(group.stats, horse);
    if (group.sexes[horse.sex]) addHorseToStats(group.sexes[horse.sex], horse);
    group.horses.push(horse);
  }
  return [...groups.values()].map((group) => ({
    label: group.label,
    ...finishPerformanceStats(group.stats),
    sexes: Object.fromEntries(Object.entries(group.sexes).map(([sex, stats]) => [sex, finishPerformanceStats(stats)])),
    representatives: sortedRepresentativesForHorses(group.horses),
  }));
}

function pedigreeRateMetric(stats, metric) {
  return metric === "graded_foal_rate" ? stats.graded_foal_rate : stats.winner_foal_rate;
}

function pedigreeRateCount(stats, metric) {
  return metric === "graded_foal_rate" ? stats.graded_winners : stats.winners;
}

function bmsTrendInsight(horses) {
  const years = [...new Set(horses.map((horse) => Number(horse.birth_year)).filter(Boolean))].sort((a, b) => a - b);
  if (years.length < 2) return "世代数据不足，暂时无法比较构成变化。";
  const shares = (year) => {
    const rows = horses.filter((horse) => Number(horse.birth_year) === year && BMS_PRIMARY_LINES.includes(horse.bms_line || "Other"));
    return Object.fromEntries(BMS_PRIMARY_LINES.map((line) => [line, rows.length ? rows.filter((horse) => (horse.bms_line || "Other") === line).length / rows.length : 0]));
  };
  const first = shares(years[0]);
  const last = shares(years.at(-1));
  const changes = BMS_PRIMARY_LINES.map((line) => ({ line, change: (last[line] - first[line]) * 100 }));
  const increase = [...changes].sort((a, b) => b.change - a.change)[0];
  const decrease = [...changes].sort((a, b) => a.change - b.change)[0];
  const signed = (value) => `${value > 0 ? "+" : ""}${value.toFixed(1)}pt`;
  return `${years[0]}→${years.at(-1)}年：${increase.line} ${signed(increase.change)}、${decrease.line} ${signed(decrease.change)}，显示母父系构成的主要转移。`;
}

function renderBmsSectionCharts(horses, broodmareSires) {
  const allRows = lineagePerformanceRows(horses, "bms_line");
  const rows = BMS_PRIMARY_LINES.map((line) => allRows.find((row) => row.label === line)).filter(Boolean);
  renderChart("bmsCategoryScaleChart", {
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, formatter: (items) => {
      const row = items[0].data.raw;
      return `${escapeHtml(row.label)}<br>产驹：${row.foals}匹<br>胜马率：${rateWithCount(row.winner_foal_rate, row.winners, row.foals)}<br>重赏马率：${rateWithCount(row.graded_foal_rate, row.graded_winners, row.foals)}`;
    } },
    grid: horizontalGrid(18, 38, 112),
    xAxis: { type: "value", name: "产驹数" },
    yAxis: longCategoryAxis(rows.map((row) => row.label), { width: 130 }),
    series: [{ type: "bar", data: rows.map((row) => ({ value: row.foals, raw: row, itemStyle: { color: BMS_CATEGORY_COLORS[row.label] } })), label: safeHorizontalBarLabel((params) => `${params.value}匹`) }],
  })?.on("click", (params) => applyBmsFilter(params.data.raw.label));

  const metric = document.querySelector("#bmsSexMetric")?.value || "winner_foal_rate";
  renderChart("bmsSexPerformanceChart", {
    color: [COLORS.duramente, COLORS.blue, COLORS.rose, COLORS.gold],
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, formatter: (items) => `${escapeHtml(items[0]?.axisValue || "")}<br>${items.map((item) => {
      const stats = item.data.raw;
      return `${item.marker}${item.seriesName}: ${formatRate(pedigreeRateMetric(stats, metric))}（${pedigreeRateCount(stats, metric)}/${stats.foals}）`;
    }).join("<br>")}` },
    legend: { top: 0 },
    grid: getResponsiveGrid({ left: 54, right: 24, top: 52, bottom: 82 }),
    xAxis: { type: "category", data: rows.map((row) => row.label), axisLabel: { interval: 0, rotate: 24 } },
    yAxis: { type: "value", name: metric === "graded_foal_rate" ? "重赏马率" : "胜马率", max: 100, axisLabel: { formatter: "{value}%" } },
    series: [
      { name: "总体", type: "line", smooth: true, symbolSize: 8, data: rows.map((row) => ({ value: ratePercent(pedigreeRateCount(row, metric), row.foals), raw: row })) },
      ...PEDIGREE_SEXES.map((sex) => ({ name: uiValue(sex, "sex"), type: "bar", data: rows.map((row) => ({ value: ratePercent(pedigreeRateCount(row.sexes[sex], metric), row.sexes[sex].foals), raw: row.sexes[sex] })) })),
    ],
  });

  const years = [...new Set(horses.map((horse) => Number(horse.birth_year)).filter(Boolean))].sort((a, b) => a - b);
  const trendRows = years.map((year) => {
    const yearHorses = horses.filter((horse) => Number(horse.birth_year) === year && BMS_PRIMARY_LINES.includes(horse.bms_line || "Other"));
    return { year, total: yearHorses.length, counts: Object.fromEntries(BMS_PRIMARY_LINES.map((line) => [line, yearHorses.filter((horse) => (horse.bms_line || "Other") === line).length])) };
  });
  renderChart("bmsCropShareChart", {
    color: BMS_PRIMARY_LINES.map((line) => BMS_CATEGORY_COLORS[line]),
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, formatter: (items) => `${items[0].axisValue}年（${items[0].data.raw.total}匹）<br>${items.map((item) => `${item.marker}${item.seriesName}: ${item.value}%（${item.data.count}匹）`).join("<br>")}` },
    legend: { top: 0, type: "scroll" },
    grid: getResponsiveGrid({ left: 48, right: 22, top: 76, bottom: 42 }),
    xAxis: { type: "category", data: years.map(String) },
    yAxis: { type: "value", max: 100, name: "世代内占比", axisLabel: { formatter: "{value}%" } },
    series: BMS_PRIMARY_LINES.map((line) => ({ name: line, type: "bar", stack: "share", itemStyle: { color: BMS_CATEGORY_COLORS[line] }, data: trendRows.map((row) => ({ value: ratePercent(row.counts[line], row.total), count: row.counts[line], raw: row })) })),
  });

  const totalFoals = rows.reduce((sum, row) => sum + row.foals, 0);
  const totalWinners = rows.reduce((sum, row) => sum + row.winners, 0);
  renderBmsOverviewCharts(rows, broodmareSires, totalFoals, totalFoals ? totalWinners / totalFoals : 0);
}

function renderFemaleFamilyCharts(horses) {
  const allRows = lineagePerformanceRows(horses, "female_family").filter((row) => row.label !== "未分類");
  const metric = document.querySelector("#familyMetric")?.value || "winner_foal_rate";
  const minFoals = Number(document.querySelector("#familyMinFoals")?.value || 5);
  const meta = rankingMetricMeta(metric);
  const rows = allRows.filter((row) => row.foals >= minFoals).sort((a, b) => meta.value(b) - meta.value(a) || b.foals - a.foals).slice(0, 18);
  const chart = renderChart("femaleFamilyOverallChart", {
    color: [COLORS.duramente],
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, formatter: (items) => {
      const row = items[0].data.raw;
      return `${row.label}<br>产驹：${row.foals}匹<br>胜马率：${rateWithCount(row.winner_foal_rate, row.winners, row.foals)}<br>重赏马率：${rateWithCount(row.graded_foal_rate, row.graded_winners, row.foals)}<br>代表马：${escapeHtml(representativeNames(row))}`;
    } },
    grid: horizontalGrid(18, 42, 78),
    xAxis: { type: "value", name: meta.unit, max: metric.includes("rate") ? 100 : paddedAxisMax },
    yAxis: longCategoryAxis(rows.map((row) => row.label), { width: 88 }),
    series: [{ type: "bar", data: rows.map((row) => ({ value: meta.value(row), raw: row })), label: safeHorizontalBarLabel((params) => meta.formatter(params.value, params.data.raw)) }],
  });
  chart?.on("click", (params) => applyFemaleFamilyFilter(params.data.raw.label));
  const overallEl = document.querySelector("#femaleFamilyOverallChart");
  if (overallEl) overallEl.style.height = `${rankingChartHeight(rows, 360)}px`;

  const sexMetric = document.querySelector("#familySexMetric")?.value || "winner_foal_rate";
  const sexRows = [...allRows].filter((row) => row.foals >= minFoals).sort((a, b) => b.foals - a.foals).slice(0, 15);
  const sexEl = document.querySelector("#femaleFamilySexChart");
  if (sexEl) sexEl.style.height = `${rankingChartHeight(sexRows, 360)}px`;
  renderChart("femaleFamilySexChart", {
    color: [COLORS.blue, COLORS.rose, COLORS.gold],
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, formatter: (items) => `${items[0]?.axisValue || ""}<br>${items.map((item) => {
      const stats = item.data.raw;
      return `${item.marker}${item.seriesName}: ${formatRate(pedigreeRateMetric(stats, sexMetric))}（${pedigreeRateCount(stats, sexMetric)}/${stats.foals}）`;
    }).join("<br>")}` },
    legend: { top: 0 },
    grid: fixedHorizontalGrid(84, 34, 44, 46),
    xAxis: { type: "value", max: 100, name: sexMetric === "graded_foal_rate" ? "重赏马率" : "胜马率", axisLabel: { formatter: "{value}%" } },
    yAxis: longCategoryAxis(sexRows.map((row) => row.label), { width: 88 }),
    series: PEDIGREE_SEXES.map((sex) => ({ name: uiValue(sex, "sex"), type: "bar", data: sexRows.map((row) => ({ value: ratePercent(pedigreeRateCount(row.sexes[sex], sexMetric), row.sexes[sex].foals), raw: row.sexes[sex], family: row.label })) })),
  })?.on("click", (params) => applyFemaleFamilyFilter(params.data.family));
}

function nickingPerformanceRows(rows, overall) {
  const baseWinner = Number(overall.winner_foal_rate || 0);
  const baseGraded = Number(overall.graded_foal_rate || 0);
  const baseEarnings = Number(overall.avg_earnings_per_foal || 0);
  return rows.map((row) => {
    const winnerComponent = baseWinner ? Number(row.winner_foal_rate || 0) / baseWinner : 0;
    const gradedComponent = baseGraded ? Number(row.graded_foal_rate || 0) / baseGraded : 0;
    const earningsComponent = baseEarnings ? Number(row.avg_earnings_per_foal || 0) / baseEarnings : 0;
    return { ...row, nicking_index: Number((winnerComponent * 0.5 + gradedComponent * 0.3 + earningsComponent * 0.2).toFixed(2)) };
  });
}

function renderNickingCharts(bmsLines, broodmareSires, overall) {
  const lineRows = nickingPerformanceRows(bmsLines, overall).filter((row) => row.foals >= 10).sort((a, b) => b.nicking_index - a.nicking_index);
  const sireRows = nickingPerformanceRows(broodmareSires, overall).filter((row) => row.foals >= 5).sort((a, b) => b.nicking_index - a.nicking_index).slice(0, 15);
  for (const [id, rows, filterLabel] of [["nickingLineChart", lineRows, "母父系"], ["nickingSireChart", sireRows, "母父"]]) {
    renderChart(id, {
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, formatter: (items) => {
        const row = items[0].data.raw;
        return `${escapeHtml(row.label)}<br>相对表现指数：${row.nicking_index.toFixed(2)}<br>产驹：${formatNumber(row.foals)}匹<br>胜马率：${formatRate(row.winner_foal_rate)}<br>重赏马率：${formatRate(row.graded_foal_rate)}<br>每匹平均奖金：${money(row.avg_earnings_per_foal)}`;
      } },
      grid: horizontalGrid(18, 46, 142),
      xAxis: { type: "value", name: "指数", min: 0 },
      yAxis: longCategoryAxis(rows.map((row) => row.label), { width: 150 }),
      series: [{
        name: `${filterLabel}相对表现`, type: "bar", barMaxWidth: 17,
        data: rows.map((row) => ({ value: row.nicking_index, raw: row, itemStyle: { color: row.nicking_index >= 1 ? COLORS.duramente : COLORS.muted } })),
        markLine: safeAverageMarkLine(1, "全体 1.00", "xAxis", { isPercent: false, unit: "", color: COLORS.gold }),
        label: safeHorizontalBarLabel((params) => Number(params.value).toFixed(2)),
      }],
    });
  }
}

function renderPedigreeCharts(pedigree, bmsLines, broodmareSires, dosage, horses, overview) {
  if (state.pedigree === "bms") {
    renderBmsSectionCharts(horses, broodmareSires);
    return;
  }
  if (state.pedigree === "family") {
    renderFemaleFamilyCharts(horses);
    return;
  }
  if (state.pedigree === "dosage") {
    renderDosageCharts(dosage);
    return;
  }
  renderNickingCharts(bmsLines, broodmareSires, overview.summary || {});
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
      label: safeHorizontalBarLabel((params) => `${formatNumber(params.value)}匹`),
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
    xAxis: { type: "value", name: crossMetric.includes("rate") ? "%" : "万日元", max: crossMetric.includes("rate") ? 110 : paddedAxisMax },
    yAxis: longCategoryAxis(performanceRows.map((row) => row.label)),
    series: [{
      type: "bar",
      barMaxWidth: 18,
      data: performanceRows.map((row) => ({ value: chartMetricDisplay(row, crossMetric), raw: row })),
      label: safeHorizontalBarLabel((params) => {
        const row = params.data.raw;
        if (crossMetric.includes("rate")) {
          const numerator = crossMetric === "graded_foal_rate" ? row.graded_winners : row.winners;
          return `${params.value}% (${numerator}/${row.foals})`;
        }
        return `${formatNumber(params.value, 1)}（${row.foals}匹）`;
      }),
    }],
  });
  performanceChart?.on("click", (params) => applySearchFilter(params.data.raw.label));

  renderAncestorGroupedTable(charts);
}

function dosageStatusLabel(status) {
  if (status === "verified") return "已核验";
  if (status === "calculated") return "计算值";
  return "待复核";
}

function renderDosageCharts(dosage) {
  const records = (dosage?.records || []).filter((row) => row.dosage_index != null && row.center_of_distribution != null);
  const scatter = renderChart("dosageScatterChart", {
    color: [COLORS.duramente],
    tooltip: {
      trigger: "item",
      formatter: (params) => {
        const row = params.data.raw;
        return `${escapeHtml(row.name)}${row.name_en ? ` / ${escapeHtml(row.name_en)}` : ""}<br>DP ${escapeHtml(row.dosage_profile_text)} (${row.dosage_points})<br>DI ${formatNumber(row.dosage_index, 2)} / CD ${formatNumber(row.center_of_distribution, 2)}<br>${dosageStatusLabel(row.status)}`;
      },
    },
    grid: { left: 62, right: 28, top: 28, bottom: 54, containLabel: true },
    xAxis: { type: "value", name: "DI", nameLocation: "middle", nameGap: 34, scale: true },
    yAxis: { type: "value", name: "CD", nameLocation: "middle", nameGap: 44, scale: true },
    series: [{
      type: "scatter",
      data: records.map((row) => ({
        value: [row.dosage_index, row.center_of_distribution, row.dosage_points],
        raw: row,
        symbolSize: Math.max(7, Math.min(24, 5 + Math.sqrt(row.dosage_points || 0) * 2.4)),
        itemStyle: { opacity: row.status === "verified" ? 0.86 : 0.55 },
      })),
    }],
  });
  scatter?.on("click", (params) => openHorse(params.data.raw.horse_id));

  const labels = ["B", "I", "C", "S", "P"];
  const totals = labels.map((_, index) => records.reduce((sum, row) => sum + Number(row.dosage_profile?.[index] || 0), 0));
  renderChart("dosageProfileChart", {
    color: [COLORS.duramente, COLORS.coral, COLORS.gold, COLORS.blue, COLORS.plum],
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: 52, right: 24, top: 24, bottom: 48, containLabel: true },
    xAxis: { type: "category", data: labels, name: "DP 分类" },
    yAxis: { type: "value", name: "平均点数" },
    series: [{
      type: "bar",
      barMaxWidth: 42,
      data: totals.map((value) => records.length ? Number((value / records.length).toFixed(2)) : 0),
      itemStyle: { color: (params) => [COLORS.duramente, COLORS.coral, COLORS.gold, COLORS.blue, COLORS.plum][params.dataIndex] },
      label: safeTopBarLabel((params) => formatNumber(params.value, 2)),
    }],
  });
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
  const showAll = true;
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
  const visibleGroups = showAll ? sortedGroups : sortedGroups.slice(0, 6);
  target.innerHTML = `
    <div class="ancestor-group-table">
      ${visibleGroups.map((group) => {
        const key = encodeURIComponent(group.ancestor);
        const total = group.totalFoals || 1;
        const allRows = [...group.rows].sort((a, b) => (b.foals || 0) - (a.foals || 0));
        const detailRows = allRows.sort((a, b) => {
            const diff = ancestorDetailValue(b, detailKey, total) - ancestorDetailValue(a, detailKey, total);
            return detailDir === "asc" ? -diff : diff;
          });
        const segments = ancestorSummarySegments(allRows, total, allRows);
        const isOpen = expanded.has(key);
        return `
          <article class="ancestor-group${isOpen ? " is-open" : ""}" data-ancestor-key="${key}">
            <button class="ancestor-summary" type="button" data-toggle-ancestor="${key}" aria-expanded="${isOpen ? "true" : "false"}">
              <span class="ancestor-info">
                <strong>${escapeHtml(group.ancestor)}</strong>
                <em>${formatNumber(total)}匹 · ${formatNumber(allRows.length)}种形式</em>
              </span>
              <span class="ancestor-composition">
                <span class="ancestor-stack" aria-label="${escapeHtml(group.ancestor)} Cross 构成">
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
                        ["pattern", "Cross 形式"],
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
              ` : `<p class="ancestor-empty">没有可显示的 Cross 形式。</p>`}
            </div>
          </article>
        `;
      }).join("")}
    </div>
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
      xAxis: { type: "value", name: metric.includes("rate") ? "%" : metric === "total_earnings" ? "万日元" : "匹", max: metric.includes("rate") ? 110 : paddedAxisMax },
      yAxis: longCategoryAxis(rows.map((row) => row.label)),
      series: [{
        type: "bar",
        barMaxWidth: 18,
        data: rows.map((row) => ({ value: metric.includes("rate") ? Number(((row[metric] || 0) * 100).toFixed(1)) : row[metric], raw: row })),
        label: safeHorizontalBarLabel((params) => {
          const row = params.data.raw;
          if (metric.includes("rate")) {
            const numerator = metric === "graded_foal_rate" ? row.graded_winners : row.winners;
            return `${params.value}% (${numerator}/${row.foals})`;
          }
          return metric === "total_earnings" ? `${formatNumber(params.value, 1)}万日元` : `${formatNumber(params.value, 1)}匹`;
        }),
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
      label: safeHorizontalBarLabel((params) => {
        const row = params.data.raw;
        const value = Array.isArray(params.value) ? params.value[0] : params.value;
        if (metric === "foals") return `${formatNumber(value)}匹`;
        if (metric === "total_earnings") return `${formatNumber(value, 1)}万日元`;
        if (metric === "graded_winners") return `${formatNumber(value)}匹`;
        if (metric === "median_earnings_per_runner") return money(value);
        if (metric === "winner_foal_rate") return `${value}% (${row.winners}/${row.foals})`;
        if (metric === "graded_foal_rate") return `${value}% (${row.graded_winners}/${row.foals})`;
        return formatNumber(value, 1);
      }),
    }],
  });
  chart?.on("click", (params) => applyFemaleFamilyFilter(params.data.raw.label));
}

const ACHIEVEMENT_STAGES = ["未出道", "未胜利", "1胜", "2胜", "3胜＋", "OP／L", "重赏"];
const ACHIEVEMENT_STAGE_COLORS = ["#d8d5cf", "#a9a1a4", "#7b8fa8", "#4f9f8d", "#f0b44d", "#e56b45", "#a92f5d"];

function horseAchievementStage(horse) {
  const summary = String(horse.career_summary || "");
  const starts = Number(summary.match(/(\d+)戦/)?.[1] || 0);
  const wins = Number(summary.match(/(\d+)勝/)?.[1] || 0);
  if (!starts) return "未出道";
  if (["G1", "G2", "G3"].includes(horse.achievement_class)) return "重赏";
  if (["Open", "Listed"].includes(horse.achievement_class)) return "OP／L";
  if (!wins) return "未胜利";
  if (wins === 1) return "1胜";
  if (wins === 2) return "2胜";
  return "3胜＋";
}

function lineageStageRows(horses, key, minFoals) {
  const groups = new Map();
  for (const horse of horses) {
    const label = horse[key] || (key === "bms_line" ? "Other" : "未分类");
    if (!groups.has(label)) groups.set(label, Object.fromEntries(ACHIEVEMENT_STAGES.map((stage) => [stage, 0])));
    groups.get(label)[horseAchievementStage(horse)] += 1;
  }
  return [...groups.entries()]
    .map(([label, stages]) => ({ label, stages, foals: Object.values(stages).reduce((sum, value) => sum + value, 0) }))
    .filter((row) => row.foals >= minFoals)
    .sort((a, b) => b.foals - a.foals)
    .slice(0, 20);
}

function renderLineageStageChart(id, horses, key, minFoals) {
  const rows = lineageStageRows(horses, key, minFoals);
  const el = document.getElementById(id);
  if (el) el.style.height = `${Math.max(400, rows.length * 34 + 120)}px`;
  const chart = renderChart(id, {
    color: ACHIEVEMENT_STAGE_COLORS,
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (items) => `${escapeHtml(items[0]?.axisValue || "")}<br>${items.map((item) => `${item.marker}${item.seriesName}: ${item.value}匹`).join("<br>")}`,
    },
    legend: { top: 0, data: ACHIEVEMENT_STAGES },
    grid: fixedHorizontalGrid(key === "female_family" ? 118 : 164, 56, 34, 54),
    xAxis: { type: "value", name: "产驹数" },
    yAxis: longCategoryAxis(rows.map((row) => row.label), { width: key === "female_family" ? 92 : 118 }),
    series: ACHIEVEMENT_STAGES.map((stage, index) => ({
      name: stage,
      type: "bar",
      stack: "achievement",
      barMaxWidth: 22,
      itemStyle: { color: ACHIEVEMENT_STAGE_COLORS[index] },
      data: rows.map((row) => ({ value: row.stages[stage], raw: row })),
    })),
  });
  chart?.on("click", (params) => key === "bms_line" ? applyBmsFilter(params.data.raw.label) : applyFemaleFamilyFilter(params.data.raw.label));
}

function renderDamAgeCharts(damAge) {
  renderChart("damAgeHistogramChart", {
    color: [COLORS.duramente],
    tooltip: { trigger: "axis" },
    grid: getResponsiveGrid({ left: 48, right: 24, top: 38, bottom: 36 }),
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
  const orders = [...new Set((damAge.foal_order_heatmap || [])
    .map((row) => String(row.foal_order || "unknown"))
    .filter((value) => value && value !== "unknown"))]
    .sort((a, b) => Number(a) - Number(b));
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

function familySexRateCell(row, sex, metric = "winner_foal_rate") {
  const stats = row.sexes[sex];
  return rateWithCount(pedigreeRateMetric(stats, metric), pedigreeRateCount(stats, metric), stats.foals);
}

function activatePedigreeSection(section, { updateHistory = true } = {}) {
  const next = VALID_PEDIGREE_SECTIONS.has(section) ? section : "bms";
  state.pedigree = next;
  let activeButton = null;
  for (const button of els.pedigreeContent.querySelectorAll("[data-pedigree-section]")) {
    const active = button.dataset.pedigreeSection === next;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
    button.tabIndex = active ? 0 : -1;
    if (active) activeButton = button;
  }
  for (const panel of els.pedigreeContent.querySelectorAll("[data-pedigree-panel]")) {
    panel.hidden = panel.dataset.pedigreePanel !== next;
  }
  if (updateHistory) writeUrlState("push");
  if (activeButton && window.matchMedia("(max-width: 640px)").matches) {
    requestAnimationFrame(() => activeButton.scrollIntoView({ block: "nearest", inline: "center" }));
  }
  if (pedigreeRuntime) {
    requestAnimationFrame(() => renderPedigreeCharts(
      pedigreeRuntime.pedigree,
      pedigreeRuntime.bmsLines,
      pedigreeRuntime.broodmareSires,
      pedigreeRuntime.dosage,
      pedigreeRuntime.horses,
      pedigreeRuntime.overview,
    ));
  }
}

async function renderPedigreeAnalysis() {
  if (els.pedigreeContent.dataset.loaded) return;
  const [pedigree, bmsLines, broodmareSires, dosage, horses, overview] = await Promise.all([
    getAnalytics("pedigree"),
    getAnalytics("bms_lines"),
    getAnalytics("broodmare_sires"),
    getAnalytics("dosage"),
    getStaticHorses(),
    getAnalytics("overview"),
  ]);
  pedigreeRuntime = { pedigree, bmsLines, broodmareSires, dosage, horses, overview };
  const cross = pedigree.cross;
  const ancestorOptions = [...new Set((pedigree.charts?.ancestor_form_comparison || []).map((row) => row.ancestor).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "ja"));
  const bmsRows = lineagePerformanceRows(horses, "bms_line");
  const primaryBmsRows = BMS_PRIMARY_LINES.map((line) => bmsRows.find((row) => row.label === line)).filter(Boolean);
  const broodmareSireLines = new Map();
  for (const horse of horses) {
    if (horse.broodmare_sire && horse.bms_line && !broodmareSireLines.has(horse.broodmare_sire)) {
      broodmareSireLines.set(horse.broodmare_sire, horse.bms_line);
    }
  }
  const familyRows = lineagePerformanceRows(horses, "female_family")
    .filter((row) => row.label !== "未分類")
    .sort((a, b) => b.foals - a.foals);
  const sexLimitedFamilies = familyRows
    .map((row) => ({ ...row, winningSexes: PEDIGREE_SEXES.filter((sex) => row.sexes[sex].winners > 0) }))
    .filter((row) => row.foals >= 5 && row.winners > 0 && row.winningSexes.length === 1)
    .sort((a, b) => b.winners - a.winners || b.foals - a.foals)
    .slice(0, 8);
  const nickingLines = nickingPerformanceRows(bmsLines, overview.summary || {}).sort((a, b) => b.nicking_index - a.nicking_index);
  const nickingSires = nickingPerformanceRows(broodmareSires, overview.summary || {})
    .filter((row) => row.foals >= 5)
    .sort((a, b) => b.nicking_index - a.nicking_index);
  const nickingHighlights = [
    ...nickingLines.filter((row) => row.foals >= 20).slice(0, 2).map((row) => ({ ...row, filter: "bms_line", type: "母父系" })),
    ...nickingSires.filter((row) => row.foals >= 10).slice(0, 2).map((row) => ({ ...row, filter: "broodmare_sire", type: "母父" })),
    ...nickingSires.filter((row) => row.foals >= 5 && row.foals < 10 && (row.graded_winners > 0 || row.g1_winners > 0)).slice(0, 2).map((row) => ({ ...row, filter: "broodmare_sire", type: "小样本亮点" })),
  ];

  els.pedigreeContent.innerHTML = `
    <div class="analysis-title pedigree-title">
      <p class="kicker">PEDIGREE</p>
      <h1>血统分析</h1>
      <p>从母父、牝系、五代血统表内近交和剂量理论参数，观察ドゥラメンテ产驹的血统结构与成绩表现。</p>
    </div>
    <div class="pedigree-section-nav" role="tablist" aria-label="血统分析分类">
      <button type="button" role="tab" data-pedigree-section="bms" aria-controls="pedigree-bms"><span>01</span><strong>母父</strong><small>六大母父系与具体母父</small></button>
      <button type="button" role="tab" data-pedigree-section="family" aria-controls="pedigree-family"><span>02</span><strong>牝系</strong><small>整体及性别表现</small></button>
      <button type="button" role="tab" data-pedigree-section="inbreeding" aria-controls="pedigree-inbreeding"><span>03</span><strong>近交</strong><small>五代血统表内 Cross</small></button>
      <button type="button" role="tab" data-pedigree-section="dosage" aria-controls="pedigree-dosage"><span>04</span><strong>DP・DI・CD</strong><small>剂量理论血统参数</small></button>
    </div>

    <div id="pedigree-bms" class="pedigree-panel" role="tabpanel" data-pedigree-panel="bms">
      <div class="pedigree-panel-intro">
        <p class="kicker">BROODMARE SIRE</p>
        <h2>母父分析</h2>
        <p>比较六大母父系的规模、胜马率和重赏马率，并按性别与出生世代观察表现差异。</p>
      </div>
      <div class="bms-family-grid">
        ${primaryBmsRows.map((row) => `
          <button type="button" class="bms-family-card" data-bms-filter="${escapeHtml(row.label)}" style="--lineage-color:${BMS_CATEGORY_COLORS[row.label]}">
            <span class="bms-family-swatch"></span>
            <strong>${escapeHtml(row.label)}</strong>
            <em>${formatNumber(row.foals)}匹</em>
            <small>胜马 ${rateWithCount(row.winner_foal_rate, row.winners, row.foals)} · 重赏 ${rateWithCount(row.graded_foal_rate, row.graded_winners, row.foals)}</small>
            <span class="card-action">查看产驹 →</span>
          </button>
        `).join("")}
      </div>
      <p class="source-note">六大分类共 ${formatNumber(primaryBmsRows.reduce((sum, row) => sum + row.foals, 0))} 匹。</p>
      <div class="chart-grid pedigree-feature-grid">
        ${chartBlock("六大母父系规模", "比较各母父系的产驹数量。", "bmsCategoryScaleChart")}
        ${controlledChartBlock("按性别表现", "比较同一母父系中牡马、牝马和骟马的成绩；比例以各性别产驹数为分母。", "bmsSexPerformanceChart", `
          <label><span>指标</span><select id="bmsSexMetric"><option value="winner_foal_rate">胜马率</option><option value="graded_foal_rate">重赏马率</option></select></label>
        `)}
        ${chartBlock("五个出生世代的母父系构成", "各年份合计为100%，用来观察配种选择的相对变化。", "bmsCropShareChart")}
        <article class="chart-card strategy-card">
          <div class="chart-card-head"><p class="kicker">BREEDING SHIFT</p><h3>配种策略线索</h3></div>
          <p>${escapeHtml(bmsTrendInsight(horses))}</p>
        </article>
      </div>
      ${sectionBlock("具体母父表现", "比较具体母父对产驹规模、奖金和成绩转化的贡献。", `
        <div class="chart-grid">
          ${chartBlock("奖金贡献", "按总奖金查看主要母父。", "bmsSireContributionChart")}
          ${chartBlock("胜马效率", "样本10匹以上的具体母父。", "bmsSireEfficiencyChart")}
        </div>
        ${analysisTable([
          { label: "母父", className: "name-column", value: (row) => broodmareSireFilterButton(row.label), html: true },
          { label: "母父系", value: (row) => broodmareSireLines.get(row.label) || "—" },
          { label: "产驹数", value: (row) => formatNumber(row.foals) },
          { label: "胜马率", value: (row) => rateWithCount(row.winner_foal_rate, row.winners, row.foals) },
          { label: "重赏马率", value: (row) => rateWithCount(row.graded_foal_rate, row.graded_winners, row.foals) },
          { label: "总奖金", value: (row) => money(row.total_earnings) },
          { label: "代表马", className: "name-column", value: representativeCell, html: true },
        ], [...broodmareSires].sort((a, b) => b.foals - a.foals), { initialLimit: 15 })}
      `)}
    </div>

    <div id="pedigree-family" class="pedigree-panel" role="tabpanel" data-pedigree-panel="family" hidden>
      <div class="pedigree-panel-intro">
        <p class="kicker">FEMALE FAMILY</p>
        <h2>牝系分析</h2>
        <p>按牝系编号观察整体表现，以及成绩是否集中在某一性别。</p>
      </div>
      <div class="chart-grid">
        ${controlledChartBlock("牝系整体表现", "按产驹规模、奖金、胜马率或重赏马率比较主要牝系。", "femaleFamilyOverallChart", `
          <label><span>指标</span><select id="familyMetric"><option value="winner_foal_rate">胜马率</option><option value="graded_foal_rate">重赏马率</option><option value="foals">产驹数</option><option value="total_earnings">总奖金</option></select></label>
          <label><span>样本下限</span><select id="familyMinFoals"><option value="3">3匹</option><option value="5" selected>5匹</option><option value="10">10匹</option></select></label>
        `)}
        ${controlledChartBlock("按性别表现", "优先显示样本较大的牝系，对比牡马、牝马和骟马的成绩转化。", "femaleFamilySexChart", `
          <label><span>指标</span><select id="familySexMetric"><option value="winner_foal_rate">胜马率</option><option value="graded_foal_rate">重赏马率</option></select></label>
        `)}
      </div>
      ${sectionBlock("成绩集中于单一性别的牝系", "列出产驹5匹以上、已有胜马且目前只有一个性别出现胜马的牝系。", `
        <div class="family-signal-grid">
          ${sexLimitedFamilies.length ? sexLimitedFamilies.map((row) => {
            const sex = row.winningSexes[0];
            const stats = row.sexes[sex];
            return `<button type="button" class="family-signal-card" data-progeny-filter-key="female_family" data-progeny-filter-value="${escapeHtml(row.label)}"><strong>${escapeHtml(row.label)}</strong><span>目前胜马仅见于${uiValue(sex, "sex")}</span><small>${formatNumber(stats.winners)}匹胜马 / ${formatNumber(stats.foals)}匹该性别产驹 · 全系 ${formatNumber(row.foals)}匹</small><em>查看产驹 →</em></button>`;
          }).join("") : "<p>当前样本门槛下没有符合条件的牝系。</p>"}
        </div>
      `)}
      <details class="analysis-block family-detail-table">
        <summary>查看牝系完整表现表</summary>
        ${analysisTable([
          { label: "牝系", className: "entity-column", value: (row) => progenyFilterButton("female_family", row.label), html: true },
          { label: "产驹数", value: (row) => formatNumber(row.foals) },
          { label: "总体胜马率", value: (row) => rateWithCount(row.winner_foal_rate, row.winners, row.foals) },
          { label: "牡马", value: (row) => familySexRateCell(row, "牡") },
          { label: "牝马", value: (row) => familySexRateCell(row, "牝") },
          { label: "骟马", value: (row) => familySexRateCell(row, "セン") },
          { label: "重赏马率", value: (row) => rateWithCount(row.graded_foal_rate, row.graded_winners, row.foals) },
          { label: "代表马", className: "name-column", value: representativeCell, html: true },
        ], familyRows, { initialLimit: 15 })}
      </details>
    </div>

    <div id="pedigree-inbreeding" class="pedigree-panel" role="tabpanel" data-pedigree-panel="inbreeding" hidden>
      <div class="pedigree-panel-intro">
        <p class="kicker">INBREEDING</p>
        <h2>近交与 Cross</h2>
        <p>近交观察五代血统表内反复出现的祖先，Cross 形式显示祖先在父母两侧出现的位置。</p>
        <a class="inline-reference" href="https://en.wikipedia.org/wiki/Thoroughbred_breeding_theories" target="_blank" rel="noopener noreferrer">参考：Wikipedia — Thoroughbred breeding theories ↗</a>
      </div>
      ${sectionBlock("配合相性", "Nicking 观察种牡马父系与母父系之间反复产生优秀产驹的配合倾向。", `
        <p class="section-inline-note">相对表现指数以ドゥラメンテ全体为 1.00：胜马率占50%，重赏马率占30%，每匹平均奖金占20%。</p>
        <div class="nicking-highlight-grid">
          ${nickingHighlights.map((row) => `<article class="nicking-entity-card"><span>${row.type}</span><button type="button" class="nicking-filter-link" data-progeny-filter-key="${row.filter}" data-progeny-filter-value="${escapeHtml(row.label)}">${escapeHtml(row.label)}</button><em>${row.nicking_index.toFixed(2)}</em><small>${formatNumber(row.foals)}匹 · 胜马 ${formatRate(row.winner_foal_rate)} · 重赏 ${formatRate(row.graded_foal_rate)}</small><div class="nicking-representatives">${renderRepresentativeHorses(row.representatives || [], { limit: 5 })}</div></article>`).join("")}
        </div>
        <div class="chart-grid">
          ${chartBlock("Duramente × 母父系", "比较主要母父系的相对表现。", "nickingLineChart")}
          ${chartBlock("Duramente × 具体母父", "展示产驹5匹以上的主要组合。", "nickingSireChart")}
        </div>
        ${analysisTable([
          { label: "母父", className: "name-column", value: (row) => broodmareSireFilterButton(row.label), html: true },
          { label: "产驹数", value: (row) => formatNumber(row.foals) },
          { label: "胜马率", value: (row) => formatRate(row.winner_foal_rate) },
          { label: "重赏马率", value: (row) => formatRate(row.graded_foal_rate) },
          { label: "总奖金", value: (row) => money(row.total_earnings) },
          { label: "相对表现", value: (row) => row.nicking_index.toFixed(2) },
          { label: "代表产驹", className: "name-column", value: representativeCell, html: true },
        ], nickingSires, { initialLimit: 15 })}
      `, "NICKING")}
      <div class="chart-grid">
        ${chartBlock("最常见的 Cross 祖先", "比较五代血统表内常见祖先的产驹数量。", "crossAncestorCountChart")}
        ${controlledChartBlock("主要 Cross 祖先的产驹表现", "比较主要祖先组合的胜马率、重赏马率和奖金表现。", "crossAncestorPerformanceChart", `
          <label><span>指标</span><select id="crossPerformanceMetric"><option value="winner_foal_rate">胜马率</option><option value="graded_foal_rate">重赏马率</option><option value="median_earnings_per_runner">中位奖金</option><option value="avg_earnings_per_foal">平均奖金</option></select></label>
          <label><span>样本下限</span><input id="crossMinFoals" type="number" min="1" max="50" value="10"></label>
        `)}
      </div>
      <details class="analysis-block pedigree-explorer">
        <summary><span><strong>打开 Cross 探索器</strong><small>搜索祖先、切换排序，并逐项展开具体 Cross 形式</small></span><em>展开 →</em></summary>
        <div class="analysis-controls pedigree-explorer-controls">
          <label><span>搜索祖先</span><input id="ancestorGroupSearch" type="search" list="ancestorOptions" placeholder="Northern Dancer"></label>
          <datalist id="ancestorOptions">${ancestorOptions.map((name) => `<option value="${escapeHtml(name)}"></option>`).join("")}</datalist>
          <div class="segmented-sort" id="ancestorSortButtons" aria-label="祖先排列"><button class="active" type="button" data-ancestor-sort="foals">产驹最多</button><button type="button" data-ancestor-sort="concentration">主要形式占比最高</button><button type="button" data-ancestor-sort="forms">Cross 组合最多</button></div>
        </div>
        <div id="ancestorGroupedTable"></div>
      </details>
      <details class="analysis-block compact-detail">
        <summary>查看 Cross 结构与完整明细</summary>
        <div class="detail-table-stack">
          <h3>Cross 结构分布</h3>
          ${analysisTable([
            { label: "Cross 结构", className: "cross-column", value: (row) => row.label },
            { label: "产驹数", value: (row) => formatNumber(row.foals) },
            { label: "胜马率", value: (row) => rateWithCount(row.winner_foal_rate, row.winners, row.foals) },
            { label: "重赏率", value: (row) => rateWithCount(row.graded_foal_rate, row.graded_winners, row.foals) },
            { label: "代表马", className: "name-column", value: representativeCell, html: true },
          ], cross.structures, { initialLimit: 8 })}
          <h3>Cross 祖先明细</h3>
          ${analysisTable([
            { label: "祖先", className: "name-column", value: (row) => row.label },
            { label: "产驹数", value: (row) => formatNumber(row.foals) },
            { label: "胜马率", value: (row) => rateWithCount(row.winner_foal_rate, row.winners, row.foals) },
            { label: "重赏马率", value: (row) => rateWithCount(row.graded_foal_rate, row.graded_winners, row.foals) },
            { label: "中位奖金", value: (row) => money(row.median_earnings_per_runner) },
            { label: "代表马", className: "name-column", value: representativeCell, html: true },
          ], cross.ancestors, { initialLimit: 8 })}
          <h3>祖先 + 具体 Cross 形式</h3>
          ${analysisTable([
            { label: "祖先", className: "name-column", value: (row) => row.ancestor || row.label.split("|")[0] },
            { label: "Cross 形式", className: "cross-column", value: (row) => row.pattern || row.label.split("|")[1] },
            { label: "产驹数", value: (row) => formatNumber(row.foals) },
            { label: "胜马率", value: (row) => rateWithCount(row.winner_foal_rate, row.winners, row.foals) },
            { label: "重赏马率", value: (row) => rateWithCount(row.graded_foal_rate, row.graded_winners, row.foals) },
            { label: "代表马", className: "name-column", value: representativeCell, html: true },
          ], cross.ancestor_patterns, { initialLimit: 8 })}
        </div>
      </details>
    </div>

    <div id="pedigree-dosage" class="pedigree-panel" role="tabpanel" data-pedigree-panel="dosage" hidden>
      <div class="pedigree-panel-intro dosage-intro">
        <p class="kicker">DOSAGE THEORY</p>
        <h2>剂量理论血统参数｜DP・DI・CD</h2>
        <p>DP（Dosage Profile）把前四代父系祖先的影响分配到 Brilliant、Intermediate、Classic、Solid、Professional 五类；DI 是偏速度端与偏耐力端的比值，CD 表示分布中心。一般而言，数值较高偏向速度与较短距离，较低偏向耐力与较长距离。它适合用作血统描述坐标，而非单独的能力预测。</p>
        <a class="inline-reference" href="https://en.wikipedia.org/wiki/Dosage_Index" target="_blank" rel="noopener noreferrer">参考：Wikipedia — Dosage Index ↗</a>
      </div>
      <div class="metric-grid dosage-metrics">
        ${metricCard("已计算", formatNumber(dosage.coverage?.with_values || 0), `全库 ${formatNumber(dosage.coverage?.horses || 0)} 匹`, `${window.location.pathname}?view=pedigree&pedigree=dosage#dosage-records`)}
        ${metricCard("外部核验", formatNumber(dosage.coverage?.verified || 0), "查看核验记录", `${window.location.pathname}?view=pedigree&pedigree=dosage#dosage-records`)}
        ${metricCard("DI 中位数", formatNumber(dosage.summary?.di_median, 2), "查看参数分布", `${window.location.pathname}?view=pedigree&pedigree=dosage#dosage-charts`)}
        ${metricCard("CD 中位数", formatNumber(dosage.summary?.cd_median, 2), "查看参数分布", `${window.location.pathname}?view=pedigree&pedigree=dosage#dosage-charts`)}
      </div>
      <div class="chart-grid" id="dosage-charts">
        ${chartBlock("DI 与 CD 分布", "每个点代表一匹产驹，点大小反映 DP 总点数；点击可打开详情。", "dosageScatterChart")}
        ${chartBlock("平均 DP 构成", "比较 B、I、C、S、P 五类的平均点数。", "dosageProfileChart")}
      </div>
      <details class="analysis-block dosage-detail-table" id="dosage-records">
        <summary>查看 DP・DI・CD 明细</summary>
        ${analysisTable([
          { label: "马名", className: "name-column", value: (row) => `<button type="button" class="link-button" data-open-horse="${row.horse_id}">${escapeHtml(row.name)}</button>`, html: true },
          { label: "English", className: "name-column", value: (row) => row.name_en || "—" },
          { label: "DP", value: (row) => row.dosage_profile_text || "—" },
          { label: "总点数", value: (row) => row.dosage_points ?? "—" },
          { label: "DI", value: (row) => row.dosage_index == null ? "—" : formatNumber(row.dosage_index, 2) },
          { label: "CD", value: (row) => row.center_of_distribution == null ? "—" : formatNumber(row.center_of_distribution, 2) },
          { label: "状态", value: (row) => dosageStatusLabel(row.status) },
          { label: "核验", value: (row) => row.source_url ? `<a href="${escapeHtml(row.source_url)}" target="_blank" rel="noopener noreferrer">PedigreeQuery</a>` : "—", html: true },
        ], dosage.records || [], { initialLimit: 10 })}
      </details>
      <p class="chart-note">Chef-de-Race ${escapeHtml(dosage.chef_version || "")}；计算方式及数据状态见“数据与方法”。</p>
    </div>
  `;

  wireAnalysisFilters(els.pedigreeContent);
  wireExpandableTables(els.pedigreeContent);
  const rerender = () => activatePedigreeSection(state.pedigree, { updateHistory: false });
  for (const id of ["crossPerformanceMetric", "crossMinFoals", "bmsSexMetric", "familyMetric", "familyMinFoals", "familySexMetric"]) {
    els.pedigreeContent.querySelector(`#${id}`)?.addEventListener("change", rerender);
  }
  els.pedigreeContent.querySelector("#ancestorGroupSearch")?.addEventListener("input", debounce(rerender));
  for (const button of els.pedigreeContent.querySelectorAll("[data-pedigree-section]")) {
    button.addEventListener("click", () => activatePedigreeSection(button.dataset.pedigreeSection));
    button.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const buttons = [...els.pedigreeContent.querySelectorAll("[data-pedigree-section]")];
      const current = buttons.indexOf(button);
      const next = buttons[(current + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length];
      next.focus();
      activatePedigreeSection(next.dataset.pedigreeSection);
    });
  }
  for (const button of els.pedigreeContent.querySelectorAll("[data-ancestor-sort]")) {
    button.addEventListener("click", () => {
      const target = els.pedigreeContent.querySelector("#ancestorGroupedTable");
      if (target) target.dataset.sortMode = button.dataset.ancestorSort || "foals";
      for (const peer of els.pedigreeContent.querySelectorAll("[data-ancestor-sort]")) peer.classList.toggle("active", peer === button);
      renderAncestorGroupedTable(pedigree.charts || {});
    });
  }
  for (const button of els.pedigreeContent.querySelectorAll("[data-open-horse]")) {
    button.addEventListener("click", () => openHorse(button.dataset.openHorse));
  }
  els.pedigreeContent.dataset.loaded = "true";
}

function renderBreederCharts(breeders) {
  const topRows = [...(breeders.top_foals || [])].slice(0, 15);
  renderChart("breederMainChart", {
    color: [COLORS.duramente, COLORS.blue],
    tooltip: { trigger: "axis" },
    legend: { top: 0, data: ["产驹数", "胜马率"] },
    grid: getResponsiveGrid({ left: 56, right: 64, top: 58, bottom: 86 }),
    xAxis: { type: "category", data: topRows.map((row) => row.label), axisLabel: { rotate: 35 } },
    yAxis: [
      { type: "value", name: "产驹数" },
      { type: "value", name: "胜马率", axisLabel: { formatter: (value) => `${value}%` } },
    ],
    series: [
      { name: "产驹数", type: "bar", data: topRows.map((row) => row.foals), label: safeTopBarLabel((params) => formatNumber(params.value)) },
      { name: "胜马率", type: "line", yAxisIndex: 1, smooth: true, data: topRows.map((row) => Number(((row.winner_foal_rate || 0) * 100).toFixed(1))), label: lineEndpointLabel(topRows.length, (params) => `${params.value}%`) },
    ],
  });
  const gradedRows = [...(breeders.graded_sources || [])].slice(0, 12);
  renderChart("breederGradedChart", {
    color: [COLORS.duramente, COLORS.gold],
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: { top: 0, data: ["重赏马", "G1马"] },
    grid: fixedHorizontalGrid(164, 52, 34, 48),
    xAxis: { type: "value", name: "匹" },
    yAxis: longCategoryAxis(gradedRows.map((row) => row.label)),
    series: [
      { name: "重赏马", type: "bar", data: gradedRows.map((row) => row.graded_winners), label: safeHorizontalBarLabel((params) => formatNumber(params.value)) },
      { name: "G1马", type: "bar", data: gradedRows.map((row) => row.g1_winners), label: safeHorizontalBarLabel((params) => formatNumber(params.value)) },
    ],
  });
  const cropRows = [...(breeders.crop_composition || [])].slice(0, 10);
  const years = ["2018", "2019", "2020", "2021", "2022"];
  renderChart("breederCropChart", {
    color: years.map(cropColor),
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: { top: 0, data: years },
    grid: fixedHorizontalGrid(164, 52, 34, 48),
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
  const parityModes = damAge.parity_modes || {};
  const parityButtons = document.querySelectorAll("[data-parity-mode]");
  let currentParityMode = [...parityButtons].find((button) => button.classList.contains("active"))?.dataset.parityMode || "biological";
  if (!parityModes[currentParityMode]) currentParityMode = "biological";
  const bucketRows = (damAge.buckets || []).filter((row) => row.label !== "unknown" && Number(row.foals || 0) > 0);
  const totalFoals = bucketRows.reduce((sum, row) => sum + Number(row.foals || 0), 0);
  const totalWinners = bucketRows.reduce((sum, row) => sum + Number(row.winners || 0), 0);
  const overallWinnerRate = totalFoals ? Number(((totalWinners / totalFoals) * 100).toFixed(1)) : null;
  renderChart("damAgeHistogramChart", {
    color: [COLORS.duramente],
    tooltip: { trigger: "axis" },
    grid: { left: 48, right: 22, top: 24, bottom: 36 },
    xAxis: { type: "category", name: "母龄", data: damAge.histogram.map((row) => row.age) },
    yAxis: { type: "value", name: "产驹数" },
    series: [{ type: "bar", data: damAge.histogram.map((row) => row.foals), label: safeTopBarLabel((params) => formatNumber(params.value)) }],
  });
  renderChart("damAgeWinRateChart", {
    color: [COLORS.coral],
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: fixedHorizontalGrid(96, 36, 42, 132),
    xAxis: { type: "value", name: "%" },
    yAxis: longCategoryAxis(bucketRows.map((row) => row.label), { width: 90 }),
    series: [{
      type: "bar",
      data: bucketRows.map((row) => ({ value: Number(((row.winner_foal_rate || 0) * 100).toFixed(1)), raw: row })),
      itemStyle: { color: COLORS.coral },
      label: safeHorizontalBarLabel((params) => {
        const row = params.data.raw;
        return `${params.value}% (${row.winners}/${row.foals})`;
      }),
      markLine: safeAverageMarkLine(overallWinnerRate, "总体", "xAxis", { color: COLORS.plum }),
    }],
  });
  renderChart("damAgeGradedRateChart", {
    color: [COLORS.gold],
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    grid: fixedHorizontalGrid(96, 36, 42, 132),
    xAxis: { type: "value", name: "%" },
    yAxis: longCategoryAxis(bucketRows.map((row) => row.label), { width: 90 }),
    series: [{ type: "bar", data: bucketRows.map((row) => ({ value: Number(((row.graded_foal_rate || 0) * 100).toFixed(1)), raw: row })), label: safeHorizontalBarLabel((params) => {
      const row = params.data.raw;
      return `${params.value}% (${row.graded_winners}/${row.foals})`;
    }) }],
  });
  const orderSort = (label) => label === "unknown" ? 99 : Number(label || 0);
  const selectedParity = parityModes[currentParityMode] || { heatmap: damAge.foal_order_heatmap || [], label: "真实生产胎次", confirmed: 0, total: damAge.summary?.total || 0 };
  const heatmap = selectedParity.heatmap || damAge.foal_order_heatmap || [];
  const orders = [...new Set(heatmap.map((row) => row.foal_order))]
    .filter((label) => label !== undefined && label !== null)
    .sort((a, b) => orderSort(a) - orderSort(b));
  const orderRows = orders.map((order) => {
    const items = heatmap.filter((row) => row.foal_order === order);
    const foals = items.reduce((sum, row) => sum + row.foals, 0);
    const winners = items.reduce((sum, row) => sum + row.winners, 0);
    const graded = items.reduce((sum, row) => sum + row.graded_winners, 0);
    const horses = items.flatMap((row) => row.horses || []);
    return { label: order, foals, winners, graded, winner_rate: foals ? winners / foals : null, graded_rate: foals ? graded / foals : null, horses };
  }).filter((row) => row.foals > 0);
  const chartNode = document.querySelector("#damFoalOrderChart");
  if (chartNode && !document.querySelector("#damParityCoverage")) {
    chartNode.insertAdjacentHTML("afterend", `
      <p class="source-note" id="damParityCoverage"></p>
    `);
  }
  const coverageNode = document.querySelector("#damParityCoverage");
  if (coverageNode) {
    const confirmed = Number(selectedParity.confirmed || 0);
    const total = Number(selectedParity.total || damAge.summary?.total || 0);
    const label = selectedParity.label || "胎次";
    coverageNode.textContent = `数据覆盖率：已确认 ${formatNumber(confirmed)} / 总计 ${formatNumber(total)}。${label === "登记产驹序次" ? "该口径不等同于真实生产胎次。" : "空胎、流产和未配种不计入生产胎次。"}`;
  }
  for (const button of parityButtons) {
    if (button.dataset.parityWired === "true") continue;
    button.dataset.parityWired = "true";
    button.addEventListener("click", () => {
      for (const item of parityButtons) item.classList.toggle("active", item === button);
      renderDamAgeProductionCharts(damAge);
    });
  }
  renderChart("damFoalOrderChart", {
    color: [COLORS.teal, COLORS.coral],
    tooltip: { trigger: "axis", formatter: (items) => {
      const row = items[0]?.data?.raw;
      if (!row) return "";
      return [
        `${escapeHtml(selectedParity.label || "胎次")}：${escapeHtml(row.label === "unknown" ? "未知" : row.label)}`,
        `产驹数：${formatNumber(row.foals)}`,
        `胜马：${formatNumber(row.winners)}`,
        `重赏马：${formatNumber(row.graded)}`,
        `胜马率：${formatRate(row.winner_rate)}`,
        `重赏率：${formatRate(row.graded_rate)}`,
      ].join("<br>");
    } },
    legend: { top: 0, data: ["产驹数", "胜马率"] },
    grid: getResponsiveGrid({ left: 48, right: 70, top: 58, bottom: 36 }),
    xAxis: { type: "category", name: selectedParity.label || "胎次", data: orderRows.map((row) => row.label === "unknown" ? "未知" : row.label) },
    yAxis: [
      { type: "value", name: "产驹数" },
      { type: "value", name: "胜马率", axisLabel: { formatter: (value) => `${value}%` } },
    ],
    series: [
      { name: "产驹数", type: "bar", itemStyle: { color: COLORS.teal }, data: orderRows.map((row) => ({ value: row.foals, raw: row })), label: safeTopBarLabel((params) => formatNumber(params.value)) },
      { name: "胜马率", type: "line", yAxisIndex: 1, itemStyle: { color: COLORS.coral }, lineStyle: { color: COLORS.coral }, data: orderRows.map((row) => ({ value: row.winner_rate == null ? null : Number((row.winner_rate * 100).toFixed(1)), raw: row })), label: lineEndpointLabel(orderRows.length, (params) => `${params.value}%`) },
    ],
  });
}

function renderProductionCharts() {
  if (!productionRuntime) return;
  const { breeders, damAge, horses, coveringMonths } = productionRuntime;
  if (state.production === "farm") {
    renderBreederCharts(breeders);
    renderClubSexChart(horses);
    renderClubWinChart(horses);
    return;
  }
  renderDamAgeProductionCharts(damAge);
  const metric = els.productionContent.querySelector("#monthMetric")?.value || "winner";
  renderMonthChart("coverMonthChart", coveringMonths.months || [], metric);
  renderMonthChart("foalMonthChart", monthPerformanceRows(horses), metric);
}

function activateProductionSection(section, { updateHistory = true } = {}) {
  const next = VALID_PRODUCTION_SECTIONS.has(section) ? section : "farm";
  state.production = next;
  for (const button of els.productionContent.querySelectorAll("[data-production-section]")) {
    const active = button.dataset.productionSection === next;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
    button.tabIndex = active ? 0 : -1;
  }
  for (const panel of els.productionContent.querySelectorAll("[data-production-panel]")) panel.hidden = panel.dataset.productionPanel !== next;
  if (updateHistory) writeUrlState("push");
  requestAnimationFrame(renderProductionCharts);
}

async function renderProductionAnalysis() {
  if (els.productionContent.dataset.loaded) return;
  const [breeders, damAge, broodmares, horses, coveringMonths] = await Promise.all([
    getAnalytics("breeders"),
    getAnalytics("dam_age"),
    broodmareRowsFromLoadedHorses(),
    getStaticHorses(),
    getAnalytics("covering_months"),
  ]);
  const clubHorses = horses.filter(isClubHorse);
  const matchedOwners = [...new Set(clubHorses.map((horse) => horse.owner))].sort((a, b) => a.localeCompare(b, "ja"));
  const damAgeBucketRows = (damAge.buckets || []).filter((row) => row.label !== "unknown" && Number(row.foals || 0) > 0);
  els.productionContent.innerHTML = `
    <div class="analysis-title">
      <p class="kicker">BREEDING &amp; PRODUCTION</p>
      <h1>生产与繁殖</h1>
      <p>从生产牧场、繁殖母马、母龄和胎次，观察ドゥラメンテ产驹的生产结构与成绩表现。</p>
    </div>
    <div class="pedigree-section-nav production-section-nav" role="tablist" aria-label="生产与繁殖分类">
      <button type="button" role="tab" data-production-section="farm"><span>01</span><strong>生产牧场</strong><small>牧场规模与成绩</small></button>
      <button type="button" role="tab" data-production-section="broodmare"><span>02</span><strong>繁殖母马</strong><small>母龄、胎次与生产记录</small></button>
    </div>
    <section class="analysis-block production-section analysis-subpanel" data-production-panel="farm" id="farm-analysis">
      <div class="section-heading">
        <p class="kicker">BREEDING FARM</p>
        <h2>生产牧场</h2>
        <p>比较主要生产牧场的产驹规模、胜马率、重赏马来源和出生世代构成。</p>
      </div>
      <div class="chart-grid">
        ${chartBlock("主要生产牧场", "比较主要牧场的产驹规模和胜马表现。", "breederMainChart")}
        ${chartBlock("重赏胜马生产牧场分布", "观察重赏胜马来自哪些牧场。", "breederGradedChart")}
      </div>
      <div class="chart-grid single-chart">
        ${chartBlock("各牧场出生世代构成", "观察主要牧场的世代分布。", "breederCropChart")}
      </div>
      ${sectionBlock("俱乐部马", "比较俱乐部马的规模、性别构成和胜马率，并与全部产驹的表现对照。",
        `<div class="metric-grid compact-metrics club-summary-metrics">
          ${metricCard("俱乐部马", formatNumber(clubHorses.length), `全库 ${formatNumber(horses.length)} 匹`)}
          ${metricCard("俱乐部占比", formatRate(clubHorses.length / horses.length), `${matchedOwners.length} 个匹配马主名`)}
          ${metricCard("俱乐部胜马率", formatRate(clubHorses.filter((horse) => horseWins(horse) > 0).length / clubHorses.length), "独立胜马／俱乐部马")}
        </div>
        <div class="mini-chart-grid club-analysis-grid">
          ${chartBlock("五个出生世代的性别构成", "比较牡马、牝马和骟马在各出生世代中的占比。", "clubSexShareChart")}
          ${chartBlock("牡马", "比较俱乐部马与全部产驹的胜马率。", "clubWinCompare-牡")}
          ${chartBlock("牝马", "比较俱乐部马与全部产驹的胜马率。", "clubWinCompare-牝")}
          ${chartBlock("骟马", "比较俱乐部马与全部产驹的胜马率。", "clubWinCompare-セン")}
        </div>
        <p class="source-note">俱乐部范围参考 <a href="https://ja.wikipedia.org/wiki/%E4%B8%80%E5%8F%A3%E9%A6%AC%E4%B8%BB" target="_blank" rel="noopener noreferrer">Wikipedia：一口马主俱乐部列表</a>，按中央与地方现存俱乐部法人的马主登记名匹配。</p>`
      , "CLUB OWNERSHIP")}
      ${sectionBlock("生产牧场综合表", "汇总各生产牧场的产驹数量、成绩和代表马。",
        analysisTable([
          { label: "生产牧场", value: (row) => progenyFilterButton("breeder", row.label), html: true },
          { label: "产驹数", value: (row) => formatNumber(row.foals) },
          { label: "出赛马", value: (row) => `${formatNumber(row.runners)} (${formatRate(row.runner_rate)})` },
          { label: "胜马", value: (row) => `${formatNumber(row.winners)} (${formatRate(row.winner_foal_rate)})` },
          { label: "重赏马", value: (row) => formatNumber(row.graded_winners) },
          { label: "G1马", value: (row) => formatNumber(row.g1_winners) },
          { label: "总奖金", value: (row) => money(row.total_earnings) },
          { label: "代表马", className: "name-column", value: representativeCell, html: true },
        ], breeders.table, { initialLimit: 15 })
      , "FARM TABLE")}
    </section>
    <section class="analysis-block production-section analysis-subpanel" data-production-panel="broodmare" id="broodmare-analysis">
      <div class="section-heading">
        <p class="kicker">BROODMARE</p>
        <h2>繁殖母马</h2>
        <p>比较繁殖母马生产本胎时的年龄、胎次和具体繁殖母马的产驹表现。</p>
      </div>
      ${sectionBlock("配种与生产月份", "比较实际配种月份与登记出生月份的成绩分布。",
        `<div class="analysis-controls"><label><span>指标</span><select id="monthMetric"><option value="winner">胜马率</option><option value="graded">重赏马率</option></select></label></div>
        <div class="chart-grid">${chartBlock("实际配种月份", `Japan Stud Book 匹配 ${formatNumber(coveringMonths.coverage?.matched || 0)} / ${formatNumber(coveringMonths.coverage?.horses || 0)} 匹。`, "coverMonthChart")}${chartBlock("生产月份", "按登记出生日期统计。", "foalMonthChart")}</div>`
      , "BREEDING CALENDAR")}
      <div class="chart-grid">
        ${chartBlock("母马生产本胎时的年龄", "观察产驹集中出生在哪些母龄段。", "damAgeHistogramChart")}
        ${chartBlock("不同母龄组的产驹胜马率", "比较不同母龄组的胜马表现。", "damAgeWinRateChart")}
      </div>
      <div class="chart-grid">
        ${chartBlock("不同母龄组的重赏马率", "观察重赏马在母龄组中的分布。", "damAgeGradedRateChart")}
        ${controlledChartBlock("胎次与表现", "比较母马生产履历与产驹表现。", "damFoalOrderChart", `
          <div class="segmented-sort" aria-label="胎次口径">
            <button type="button" class="active" data-parity-mode="biological">真实生产胎次</button>
            <button type="button" data-parity-mode="registered">登记产驹序次</button>
          </div>
        `)}
      </div>
      ${sectionBlock("母龄分组明细", "按繁殖母马生产本胎时的年龄汇总产驹成绩。",
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
      , "DAM AGE TABLE")}
      ${sectionBlock("繁殖母马明细", "按繁殖母马汇总ドゥラメンテ产驹的规模、成绩和奖金。",
        analysisTable([
          { label: "繁殖母马", className: "name-column", value: (row) => row.label },
          { label: "母父", className: "name-column", value: (row) => broodmareSireFilterButton(row.broodmare_sire), html: true },
          { label: "产驹数", value: (row) => formatNumber(row.foals) },
          { label: "出赛马", value: (row) => formatNumber(row.runners) },
          { label: "胜马", value: (row) => `${formatNumber(row.winners)} (${formatRate(row.winner_foal_rate)})` },
          { label: "重赏马", value: (row) => formatNumber(row.graded_winners) },
          { label: "G1马", value: (row) => formatNumber(row.g1_winners) },
          { label: "总奖金", value: (row) => money(row.total_earnings) },
          { label: "代表产驹", className: "name-column", value: representativeCell, html: true },
        ], broodmares, { initialLimit: 15 })
      , "BROODMARE TABLE")}
    </section>
  `;
  wireAnalysisFilters(els.productionContent);
  wireExpandableTables(els.productionContent);
  productionRuntime = { breeders, damAge, horses, coveringMonths };
  for (const button of els.productionContent.querySelectorAll("[data-production-section]")) button.addEventListener("click", () => activateProductionSection(button.dataset.productionSection));
  els.productionContent.querySelector("#monthMetric")?.addEventListener("change", renderProductionCharts);
  activateProductionSection(state.production, { updateHistory: false });
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
      <p class="kicker">RACECOURSE</p>
      <h1>赛马场表现</h1>
      <p>比较ドゥラメンテ产驹在不同赛马场的出赛、胜场、胜率、前三率和距离适性。</p>
    </div>
    <div class="metric-grid compact-metrics">
      ${metricCard("总出赛", formatNumber(data.summary.valid_starts), "查看赛马场明细", `${window.location.pathname}?view=racecourse#racecourse-results`)}
      ${metricCard("赛马场数", formatNumber(data.summary.courses), "查看全国分布", `${window.location.pathname}?view=racecourse#racecourse-map`)}
      ${metricCard("胜场最多", topRacecourse ? `${escapeHtml(topRacecourse.label)} ${formatNumber(topRacecourse.wins_starts)}胜` : "—", "查看赛马场明细", `${window.location.pathname}?view=racecourse#racecourse-results`)}
    </div>
    <section class="analysis-block race-map-block" id="racecourse-map">
      <div class="section-heading">
        <p class="kicker">RACECOURSE MAP</p>
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
    <span id="racecourse-results" class="anchor-target" aria-hidden="true"></span>
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
        ${chartBlock("芝地与泥地表现", "比较不同场地条件下的取胜表现。", "racecourseSurfaceChart")}
        ${sectionBlock("主要距离表现", "按赛马场比较不同距离区间的胜率、前三率和出赛次数。",
          `<div class="analysis-controls">
            <label><span>赛马场</span><select id="racecourseDistanceCourse">
              ${rows.slice(0, 30).map((row) => `<option value="${escapeHtml(row.label)}">${escapeHtml(row.label)}</option>`).join("")}
            </select></label>
          </div>
          ${chartShell("racecourseDistanceChart")}`
        , "DISTANCE PROFILE")}
      </div>
      ${sectionBlock("赛马场综合表", "汇总各赛马场的出赛、名次和场地胜率。",
        analysisTable([
          { label: "赛马场", value: (row) => row.label },
          { label: "赛事体系", value: (row) => row.jurisdiction },
          { label: "出赛", value: (row) => formatNumber(row.starts) },
          { label: "第1名", value: (row) => formatNumber(row.wins_starts) },
          { label: "第2名", value: (row) => formatNumber(row.seconds) },
          { label: "第3名", value: (row) => formatNumber(row.thirds) },
          { label: "胜率", value: (row) => rateWithCount(row.win_start_rate, row.wins_starts, row.starts) },
          { label: "连对率", value: (row) => rateWithCount(row.quinella_rate, row.wins_starts + row.seconds, row.starts) },
          { label: "前三率", value: (row) => rateWithCount(row.top3_rate, row.top3, row.starts) },
          { label: "芝地胜率", value: (row) => rateWithCount(row.surface?.["芝"]?.win_rate, row.surface?.["芝"]?.wins || 0, row.surface?.["芝"]?.starts || 0) },
          { label: "泥地胜率", value: (row) => rateWithCount(row.surface?.["ダ"]?.win_rate, row.surface?.["ダ"]?.wins || 0, row.surface?.["ダ"]?.starts || 0) },
        ], rows, { initialLimit: 20 })
      , "COURSE TABLE")}
    `;
    renderChart("racecourseWinsChart", {
      color: [COLORS.coral, COLORS.raceLine],
      tooltip: { trigger: "axis" },
      legend: { top: 0, data: ["胜场数", "胜率"] },
      grid: getResponsiveGrid({ left: 48, right: 64, top: 58, bottom: 54 }),
      xAxis: { type: "category", data: winRows.map((row) => row.label), axisLabel: { rotate: 25 } },
      yAxis: [
        { type: "value", name: "胜场数" },
        { type: "value", name: "胜率", axisLabel: { formatter: (value) => `${value}%` } },
      ],
      series: [
        { name: "胜场数", type: "bar", barMaxWidth: 34, data: winRows.map((row) => row.wins_starts), label: safeTopBarLabel((params) => formatNumber(params.value)) },
        {
          name: "胜率",
          type: "line",
          yAxisIndex: 1,
          symbolSize: 8,
          itemStyle: { color: COLORS.raceLine, borderColor: "#fff", borderWidth: 2 },
          lineStyle: { color: COLORS.raceLine, width: 3 },
          data: winRows.map((row) => Number(((row.win_start_rate || 0) * 100).toFixed(1))),
          label: lineEndpointLabel(winRows.length, (params) => `${params.value}%`),
        },
      ],
    });
    renderChart("racecourseStartsChart", {
      color: [COLORS.gold, COLORS.raceLine],
      tooltip: { trigger: "axis" },
      legend: { top: 0, data: ["出赛次数", "前三率"] },
      grid: getResponsiveGrid({ left: 56, right: 64, top: 58, bottom: 54 }),
      xAxis: { type: "category", data: startRows.map((row) => row.label), axisLabel: { rotate: 25 } },
      yAxis: [
        { type: "value", name: "出赛" },
        { type: "value", name: "前三率", axisLabel: { formatter: (value) => `${value}%` } },
      ],
      series: [
        { name: "出赛次数", type: "bar", barMaxWidth: 34, data: startRows.map((row) => row.starts), label: safeTopBarLabel((params) => formatNumber(params.value)) },
        {
          name: "前三率",
          type: "line",
          yAxisIndex: 1,
          symbolSize: 8,
          itemStyle: { color: COLORS.raceLine, borderColor: "#fff", borderWidth: 2 },
          lineStyle: { color: COLORS.raceLine, width: 3 },
          data: startRows.map((row) => Number(((row.top3_rate || 0) * 100).toFixed(1))),
          label: lineEndpointLabel(startRows.length, (params) => `${params.value}%`),
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
          const surface = item.seriesName === "芝地胜率" ? "芝" : "ダ";
          const stats = row.surface?.[surface] || {};
          return `${item.marker}${item.seriesName}: ${item.value}% (${formatNumber(stats.wins || 0)}/${formatNumber(stats.starts || 0)})`;
        }).join("<br>"),
      },
      legend: { top: 0, data: ["芝地胜率", "泥地胜率"] },
      grid: { left: 56, right: 28, top: 54, bottom: 74 },
      xAxis: { type: "category", data: surfaceRows.map((row) => row.label), axisLabel: { rotate: 35 } },
      yAxis: { type: "value", name: "%", axisLabel: { formatter: (value) => `${value}%` } },
      series: [
        { name: "芝地胜率", type: "bar", data: surfaceRows.map((row) => ({ value: Number(((row.surface?.["芝"]?.win_rate || 0) * 100).toFixed(1)), raw: row })) },
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
        grid: getResponsiveGrid({ left: 58, right: 64, top: 58, bottom: 42 }),
        xAxis: { type: "category", data: buckets.map((item) => item.label) },
        yAxis: [
          { type: "value", name: "%" },
          { type: "value", name: "出赛", position: "right" },
        ],
        series: [
          { name: "胜率", type: "bar", data: buckets.map((item) => Number(((item.win_rate || 0) * 100).toFixed(1))), label: safeTopBarLabel((params) => `${params.value}%`) },
          { name: "前三率", type: "bar", data: buckets.map((item) => Number(((item.top3_rate || 0) * 100).toFixed(1))) },
          { name: "出赛次数", type: "line", yAxisIndex: 1, data: buckets.map((item) => item.starts || 0), label: lineEndpointLabel(buckets.length, (params) => formatNumber(params.value)) },
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
      <p class="kicker">DATA &amp; METHODS</p>
      <h1>数据与方法</h1>
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

const CLUB_OWNER_NAMES = [
  "インゼルレーシング", "ウイン", "キャロットファーム", "京都ホースレーシング", "グリーンファーム",
  "ゴールドレーシング", "ライオンレースホース", "社台レースホース", "サンデーレーシング", "シルクレーシング",
  "G1レーシング", "ターフ・スポート", "大樹ファーム", "DMMドリームクラブ", "東京ホースレーシング",
  "ノルマンディーサラブレッドレーシング", "広尾レース", "Blooming Racing", "友駿ホースクラブ",
  "ヒダカ・ブリーダーズ・ユニオン", "サラブレッドクラブ・ラフィアン", "ロードホースクラブ",
  "ローレルレーシング", "YGGホースクラブ", "フクキタル",
];

function normalizedOwnerName(value) {
  return String(value || "").normalize("NFKC").replaceAll(" ", "").toUpperCase();
}

const CLUB_OWNER_SET = new Set(CLUB_OWNER_NAMES.map(normalizedOwnerName));

function isClubHorse(horse) {
  return CLUB_OWNER_SET.has(normalizedOwnerName(horse.owner));
}

function horseWins(horse) {
  return Number(String(horse.career_summary || "").match(/(\d+)勝/)?.[1] || 0);
}

function horseIsGraded(horse) {
  return ["G1", "G2", "G3"].includes(horse.achievement_class);
}

function parseFoalDate(horse) {
  const value = horse.foal_birth_date || String(horse.birth_date || "").replace(/年|月/g, "-").replace("日", "");
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthPerformanceRows(horses) {
  const rows = [];
  for (let month = 1; month <= 12; month += 1) {
    const item = { month, male: [], female: [] };
    rows.push(item);
  }
  for (const horse of horses) {
    const foalDate = parseFoalDate(horse);
    if (!foalDate) continue;
    const date = foalDate;
    const sex = horse.sex === "牝" ? "female" : "male";
    rows[date.getMonth()][sex].push(horse);
  }
  return rows;
}

function ratePercent(numerator, denominator) {
  return denominator ? Number((numerator / denominator * 100).toFixed(1)) : 0;
}

function renderClubSexChart(horses) {
  const years = [2018, 2019, 2020, 2021, 2022];
  const sexes = ["牡", "牝", "セン"];
  const rows = years.map((year) => {
    const club = horses.filter((horse) => Number(horse.birth_year) === year && isClubHorse(horse));
    return { year, total: club.length, counts: Object.fromEntries(sexes.map((sex) => [sex, club.filter((horse) => horse.sex === sex).length])) };
  });
  renderChart("clubSexShareChart", {
    color: [COLORS.blue, COLORS.rose, COLORS.gold],
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, formatter: (items) => `${items[0].axisValue}年（俱乐部马 ${items[0].data.raw.total}匹）<br>${items.map((item) => `${item.marker}${item.seriesName}: ${item.data.count}匹 / ${item.value}%`).join("<br>")}` },
    legend: { top: 0 },
    grid: getResponsiveGrid({ left: 48, right: 24, top: 52, bottom: 42 }),
    xAxis: { type: "category", data: years.map(String) },
    yAxis: { type: "value", max: 100, name: "俱乐部马性别占比", axisLabel: { formatter: "{value}%" } },
    series: sexes.map((sex) => ({ name: uiValue(sex, "sex"), type: "bar", stack: "share", data: rows.map((row) => ({ value: ratePercent(row.counts[sex], row.total), count: row.counts[sex], raw: row })) })),
  });
}

function renderClubWinChart(horses) {
  const sexes = ["牡", "牝", "セン"];
  for (const sex of sexes) {
    const years = [2018, 2019, 2020, 2021, 2022];
    const values = (clubOnly) => years.map((year) => {
      const rows = horses.filter((horse) => Number(horse.birth_year) === year && horse.sex === sex && (!clubOnly || isClubHorse(horse)));
      const winners = rows.filter((horse) => horseWins(horse) > 0).length;
      return { value: ratePercent(winners, rows.length), winners, total: rows.length };
    });
    renderChart(`clubWinCompare-${sex}`, {
      color: [COLORS.duramente, COLORS.muted],
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, formatter: (items) => `${items[0].axisValue}年<br>${items.map((item) => `${item.marker}${item.seriesName}: ${item.value}%（${item.data.winners}/${item.data.total}）`).join("<br>")}` },
      legend: { top: 0, itemWidth: 14, itemHeight: 9 },
      grid: getResponsiveGrid({ left: 38, right: 12, top: 48, bottom: 32 }),
      xAxis: { type: "category", data: years },
      yAxis: { type: "value", max: 100, axisLabel: { formatter: "{value}%" } },
      series: [{ name: "俱乐部马", type: "bar", data: values(true) }, { name: "全产驹", type: "bar", data: values(false) }],
    });
  }
}

function renderMonthChart(id, rows, metric) {
  const isGraded = metric === "graded";
  const seriesFor = (sex) => rows.map((row) => {
    if (Array.isArray(row[sex])) {
      const horses = row[sex];
      const hits = horses.filter((horse) => isGraded ? horseIsGraded(horse) : horseWins(horse) > 0).length;
      return { value: ratePercent(hits, horses.length), hits, total: horses.length };
    }
    const counts = row[sex] || {};
    const hits = Number(isGraded ? counts.graded_winners : counts.winners) || 0;
    const total = Number(counts.foals) || 0;
    return { value: ratePercent(hits, total), hits, total };
  });
  renderChart(id, {
    color: [COLORS.blue, COLORS.rose],
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, formatter: (items) => `${items[0].axisValue}月<br>${items.map((item) => `${item.marker}${item.seriesName}: ${item.value}%（${item.data.hits}/${item.data.total}）`).join("<br>")}` },
    legend: { top: 0 },
    grid: getResponsiveGrid({ left: 50, right: 22, top: 52, bottom: 42 }),
    xAxis: { type: "category", data: rows.map((row) => `${row.month}月`) },
    yAxis: { type: "value", max: isGraded ? undefined : 100, name: isGraded ? "重赏马率" : "胜马率", axisLabel: { formatter: "{value}%" } },
    series: [{ name: "牡＋骟", type: "bar", data: seriesFor("male") }, { name: "牝", type: "bar", data: seriesFor("female") }],
  });
}

async function showView(name, { updateHistory = true } = {}) {
  if (!VALID_VIEWS.has(name)) name = "progeny";
  state.view = name;
  if (name !== "progeny" && state.horse) closeDrawer({ updateHistory: false });
  for (const view of els.views) {
    const active = view.id === `${name}View`;
    view.hidden = !active;
    view.classList.toggle("active", active);
  }
  for (const button of els.navButtons) {
    button.classList.toggle("active", button.dataset.view === name);
    button.setAttribute("aria-current", button.dataset.view === name ? "page" : "false");
  }
  if (updateHistory) writeUrlState("push");
  if (name === "sire") {
    await renderSireAnalysis();
    activateSireSection(state.sire, { updateHistory: false });
  }
  if (name === "pedigree") {
    await renderPedigreeAnalysis();
    activatePedigreeSection(state.pedigree, { updateHistory: false });
  }
  if (name === "production") {
    await renderProductionAnalysis();
    activateProductionSection(state.production, { updateHistory: false });
  }
  if (name === "racecourse") await renderRacecourseAnalysis();
  if (name === "method") await renderMethodology();
  if (window.location.hash) requestAnimationFrame(() => document.querySelector(window.location.hash)?.scrollIntoView({ block: "start" }));
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

let currentHorseIds = [];
let horseSequenceCache = { key: "", ids: [] };
let lastFocusedElement = null;

function horseSequenceKey() {
  const params = new URL(horseQuery(), window.location.href).searchParams;
  params.delete("limit");
  params.delete("offset");
  return params.toString();
}

async function ensureHorseSequence() {
  const key = horseSequenceKey();
  if (horseSequenceCache.key === key && horseSequenceCache.ids.length) return horseSequenceCache.ids;
  const ids = [];
  let offset = 0;
  let total = Infinity;
  while (offset < total) {
    const params = new URLSearchParams(key);
    params.set("limit", "100");
    params.set("offset", String(offset));
    const data = await getJson(`/api/horses?${params.toString()}`);
    const items = data.items || data.horses || [];
    total = Number(data.total ?? items.length);
    ids.push(...items.map((horse) => String(horse.id)));
    if (!items.length) break;
    offset += items.length;
  }
  horseSequenceCache = { key, ids };
  currentHorseIds = ids;
  updateHorseNavigation();
  return ids;
}

function bindHorseOpeners(container) {
  for (const target of container.querySelectorAll("[data-id]")) {
    const activate = () => openHorse(target.dataset.id, { trigger: target });
    target.addEventListener("click", activate);
    if (target.tagName === "BUTTON") continue;
    target.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      activate();
    });
  }
}

async function loadHorses() {
  els.horseRows.innerHTML = `<tr><td colspan="12" class="muted">正在载入产驹资料...</td></tr>`;
  els.horseCards.innerHTML = `<p class="muted">正在载入产驹资料...</p>`;
  const data = await getJson(horseQuery());
  const items = data.items || data.horses || [];
  state.total = data.total;
  if (state.offset >= state.total && state.total > 0) {
    state.offset = Math.max(0, Math.floor((state.total - 1) / state.limit) * state.limit);
    writeUrlState("replace");
    return loadHorses();
  }
  els.resultCount.textContent = `${Number(data.total).toLocaleString("zh-CN")} / ${Number(state.allTotal || data.total).toLocaleString("zh-CN")} 匹`;
  renderActiveFilters();
  els.horseRows.innerHTML = items.map((horse) => `
    <tr data-id="${horse.id}" tabindex="0" role="button" aria-label="查看${escapeHtml(horse.name)}的详情">
      <td class="horse-column">
        <div class="horse-name">${escapeHtml(horse.name)}</div>
        ${horse.hkjc_name_zh ? `<div class="hk-name">${escapeHtml(horse.hkjc_name_zh)}</div>` : ""}
      </td>
      <td>${escapeHtml(horse.birth_year)}</td>
      <td class="sex-cell">${escapeHtml(uiValue(horse.sex, "sex"))}</td>
      <td class="color-name">${escapeHtml(uiValue(horse.color, "color"))}</td>
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
        <div class="muted">${escapeHtml(careerSummaryText(horse.career_summary))}</div>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="12" class="muted">没有找到符合条件的产驹。</td></tr>`;
  els.horseCards.innerHTML = items.map((horse) => `
    <button class="horse-card" type="button" data-id="${horse.id}" aria-label="查看${escapeHtml(horse.name)}的详情">
      <span class="horse-card-head">
        <span><span class="horse-card-name">${escapeHtml(horse.name)}</span>${horse.hkjc_name_zh ? `<span class="horse-card-hk">${escapeHtml(horse.hkjc_name_zh)}</span>` : ""}</span>
        ${regionBadge(horse.trainer_region)}
      </span>
      <span class="horse-card-meta"><span>${escapeHtml(horse.birth_year)}年</span><span>${escapeHtml(uiValue(horse.sex, "sex"))}</span><span>${escapeHtml(uiValue(horse.color, "color"))}</span></span>
      <span class="horse-card-pedigree">
        <span><small>母马</small><strong>${escapeHtml(horse.dam)}</strong></span>
        <span><small>母父</small><strong>${escapeHtml(horse.broodmare_sire)}</strong></span>
      </span>
      <span class="horse-card-footer">
        <span class="horse-card-summary"><small>主要胜鞍 / 生涯战绩</small><span>${escapeHtml(horse.major_win || careerSummaryText(horse.career_summary) || "—")}</span>${horse.major_win && horse.career_summary ? `<span class="muted">${escapeHtml(careerSummaryText(horse.career_summary))}</span>` : ""}</span>
        <span class="horse-card-prize">${escapeHtml(prize(horse))}</span>
      </span>
    </button>
  `).join("") || `<p class="muted">没有找到符合条件的产驹。</p>`;

  currentHorseIds = items.map((horse) => String(horse.id));
  horseSequenceCache = { key: "", ids: [] };
  bindHorseOpeners(els.horseRows);
  bindHorseOpeners(els.horseCards);
  ensureHorseSequence().catch((error) => console.warn("Unable to prepare detail sequence", error));
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

function raceDistanceText(value) {
  const text = String(value || "");
  const match = text.match(/^(芝|ダ|障)(\d+)$/);
  if (!match) return text;
  const surface = { 芝: "芝地", ダ: "泥地", 障: "障碍" }[match[1]];
  return `${surface} ${match[2]}m`;
}

function raceRows(races) {
  if (!races.length) {
    return `<p class="muted race-empty">暂无比赛记录</p>`;
  }
  const overseas = isOverseasRaceSet(races, window.currentDetailHorse);
  if (overseas) {
    return `
      <div class="race-table-wrap">
        <table class="race-table race-table-overseas">
          <thead>
            <tr>
              <th>日期</th>
              <th>赛马场</th>
              <th>场次</th>
              <th>名次</th>
              <th>赛事</th>
              <th>级别</th>
              <th>参赛马</th>
              <th>距离</th>
              <th>骑师</th>
              <th>负磅</th>
              <th>马号</th>
              <th>SP</th>
              <th>用时</th>
              <th>胜负距离</th>
              <th>头马</th>
              <th>奖金</th>
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
                <td>${escapeHtml(raceDistanceText(race.distance))} ${escapeHtml(race.track_condition)}</td>
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
            <th>日期</th>
            <th>赛马场</th>
            <th>场次</th>
            <th>名次</th>
            <th>赛事</th>
            <th>距离</th>
            <th>骑师</th>
            <th>人气</th>
            <th>用时</th>
            <th>奖金</th>
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
              <td>${escapeHtml(raceDistanceText(race.distance))} ${escapeHtml(race.track_condition)}</td>
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
  return "";
}

function studTitle(studProfiles) {
  if (studProfiles.some((profile) => profile.role === "stallion")) return "种牡马记录";
  return "繁殖记录";
}

function studLinkName(profile, horse) {
  return horse?.name || profile.name || "马";
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

function localizedRecordText(value) {
  return String(value ?? "")
    .replaceAll("供用種雄馬。", "现役供用种牡马。")
    .replaceAll("父ドゥラメンテの繁殖登録馬。", "已登记为繁殖马，父系为ドゥラメンテ。")
    .replaceAll("繁殖牝馬。2025年にエピファネイアを種付、2026年に牡馬を出産。", "繁殖母马。2025年与エピファネイア配种，2026年产下牡驹。")
    .replaceAll("産駒は血統登録申込をされていません", "该产驹尚未申请血统登记")
    .replaceAll("ASB mare produce: foal deceased after birth.", "ASB 繁殖记录：产驹出生后死亡。")
    .replaceAll("ASB mare produce: missed.", "ASB 繁殖记录：未受孕。")
    .replaceAll("ASB mare produce: parentage verified.", "ASB 繁殖记录：血统关系已核验。")
    .replaceAll("Breednet public proof; ASB mare page is the profile link.", "Breednet 公开资料；详情链接指向 ASB 繁殖母马页面。")
    .replaceAll("Breednet/Racing NSW public proof; ASB mare page is the profile link.", "Breednet／Racing NSW 公开资料；详情链接指向 ASB 繁殖母马页面。")
    .replaceAll("報告なし", "暂无报告")
    .replaceAll("生産予定", "预计生产")
    .replaceAll("種付せず", "未配种")
    .replaceAll("双子流産", "双胎流产")
    .replaceAll("流産", "流产")
    .replaceAll("死産", "死产")
    .replaceAll("生後直死", "出生后死亡")
    .replaceAll("不受胎", "未受孕")
    .replaceAll("不明", "不明")
    .replaceAll("万円", "万日元")
    .replace(/^(\d+)年目$/, "第$1年");
}

function coveringResult(covering, foals) {
  if (!covering.due_date) return "未受孕";
  const sire = normalizedStudName(covering.stallion_name);
  const expectedYear = Number(covering.cover_year) + 1;
  const foal = (foals || []).find((row) => Number(row.result_year) === expectedYear && normalizedStudName(row.sire_name) === sire);
  if (foal?.birth_date && String(foal.birth_date).includes("不受胎")) return "未受孕";
  if (foal) return "出生";
  return "预计生产";
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
              <a class="stud-chip" href="${escapeHtml(studbookHref(profile))}" target="_blank" rel="noreferrer">Studbook 血统书</a>
              ${profileExternalLinks(profile).map((link) => `
                <a class="stud-chip aus-chip" href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">${escapeHtml(link.label || "Australia")}</a>
              `).join("")}
              ${profile.own_netkeiba_url ? `<a class="stud-chip" href="${escapeHtml(profile.own_netkeiba_url)}" target="_blank" rel="noreferrer">Netkeiba Owners</a>` : ""}
            </div>
          </div>
          ${profile.note ? `<p class="muted stud-note">${escapeHtml(localizedRecordText(profile.note))}</p>` : ""}
          ${profile.fees.length ? `
            <h3>配种费变化</h3>
            <div class="stud-table-wrap">
              <table class="stud-table">
                <thead>
                  <tr><th>年份</th><th>服役年</th><th>配种费</th><th>配种数</th><th>登记产驹</th><th>出赛马</th><th>胜马</th><th>代表产驹</th></tr>
                </thead>
                <tbody>
                  ${profile.fees.map((row) => `
                    <tr>
                      <td>${escapeHtml(row.year)}</td>
                      <td>${escapeHtml(localizedRecordText(row.service_year))}</td>
                      <td>${escapeHtml(localizedRecordText(row.fee_text))}</td>
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
            <h3>配种与生产</h3>
            <div class="stud-table-wrap">
              <table class="stud-table">
                <thead>
                  <tr><th>年份</th><th>配种总数</th><th>纯血马</th><th>出生</th><th>国内登记</th><th>无产驹等</th><th>改配</th></tr>
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
            <h3>配种记录</h3>
            <div class="stud-table-wrap">
              <table class="stud-table">
                <thead><tr><th>年份</th><th>配种日期</th><th>预产日期</th><th>种牡马</th><th>结果</th><th>饲养者</th></tr></thead>
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
            <h3>繁殖记录</h3>
            <div class="stud-table-wrap">
              <table class="stud-table">
                <thead><tr><th>年份</th><th>出生日期</th><th>毛色</th><th>性别</th><th>马名</th><th>父系</th><th>备注</th></tr></thead>
                <tbody>
                  ${profile.foals.map((row) => `
                    <tr>
                      <td>${escapeHtml(row.result_year)}</td>
                      <td>${escapeHtml(localizedRecordText(row.birth_date))}</td>
                      <td>${escapeHtml(uiValue(row.color, "color"))}</td>
                      <td>${escapeHtml(uiValue(row.sex, "sex"))}</td>
                      <td>${escapeHtml(row.foal_name)}</td>
                      <td>${escapeHtml(row.sire_name)}</td>
                      <td>${escapeHtml(localizedRecordText(row.note))}</td>
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

function updateHorseNavigation() {
  const index = currentHorseIds.indexOf(String(state.horse));
  els.previousHorse.disabled = index <= 0;
  els.nextHorse.disabled = index < 0 || index >= currentHorseIds.length - 1;
  els.previousHorse.title = index > 0 ? `${index} / ${currentHorseIds.length}` : "已经是第一匹产驹";
  els.nextHorse.title = index >= 0 && index < currentHorseIds.length - 1 ? `${index + 2} / ${currentHorseIds.length}` : "已经是最后一匹产驹";
}

async function openAdjacentHorse(direction) {
  const ids = await ensureHorseSequence();
  const index = ids.indexOf(String(state.horse));
  const nextId = ids[index + direction];
  if (nextId) openHorse(nextId, { preserveFocus: true });
}

async function openHorse(id, { trigger = null, updateHistory = true, preserveFocus = false } = {}) {
  if (!id) return;
  const requestedId = String(id);
  const wasOpen = els.drawer.classList.contains("open");
  if (!preserveFocus && !wasOpen) lastFocusedElement = trigger || document.activeElement;
  state.horse = String(id);
  if (updateHistory) writeUrlState("push");
  els.detail.innerHTML = `<p class="muted">正在加载马匹详情...</p>`;
  els.drawer.classList.add("open");
  els.drawer.setAttribute("aria-hidden", "false");
  document.body.classList.add("drawer-open");
  updateHorseNavigation();
  if (!preserveFocus && !wasOpen) els.drawerPanel.focus();
  const data = await getJson(`/api/horse?id=${encodeURIComponent(id)}`);
  if (state.horse !== requestedId) return;
  const horse = data.horse;
  window.currentDetailHorse = horse;
  els.detail.innerHTML = `
    <div class="detail-head">
      <p class="kicker">${escapeHtml(horse.sire || "Duramente")}</p>
      <h2 id="drawerTitle">${escapeHtml(horse.name)}</h2>
      ${horse.name_en ? `<div class="english-name">${escapeHtml(horse.name_en)}</div>` : ""}
      ${horse.hkjc_name_zh ? `<div class="hk-name detail-hk">${escapeHtml(horse.hkjc_name_zh)}</div>` : ""}
      <div class="tag-row">
        <span class="tag">${escapeHtml(horse.birth_year)}</span>
        <span class="tag">${escapeHtml(uiValue(horse.sex, "sex"))}</span>
        <span class="tag">${escapeHtml(uiValue(horse.color, "color"))}</span>
        ${regionBadge(horse.trainer_region)}
        ${lineageBadge(horse.female_family)}
      </div>
      <div class="external-links">
        ${horse.netkeiba_id ? `<a href="https://db.netkeiba.com/horse/${escapeHtml(horse.netkeiba_id)}/" target="_blank" rel="noreferrer">netkeiba</a>` : ""}
        ${horse.jbis_id ? `<a href="https://www.jbis.or.jp/horse/${escapeHtml(horse.jbis_id)}/" target="_blank" rel="noreferrer">JBIS</a>` : ""}
      </div>
    </div>

    <div class="detail-grid">
      <div class="fact"><span>母马</span><strong>${horseDamCell(horse)}</strong></div>
      <div class="fact"><span>母马出生年</span><strong>${escapeHtml(horse.dam_birth_year || "未知")}</strong></div>
      <div class="fact"><span>生产本胎时母龄</span><strong>${escapeHtml(damAgeText(horse))}</strong></div>
      ${horse.dam_biological_parity != null ? `<div class="fact"><span>真实生产胎次</span><strong>母马第 ${escapeHtml(horse.dam_biological_parity)} 次生产</strong></div>` : ""}
      ${horse.dam_registered_foal_order != null ? `<div class="fact"><span>登记产驹序次</span><strong>第 ${escapeHtml(horse.dam_registered_foal_order)} 匹登记产驹</strong></div>` : ""}
      ${horse.parity_source_url ? `<div class="fact"><span>胎次来源</span><strong><a href="${escapeHtml(horse.parity_source_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(horse.parity_source_name || "来源")}</a></strong></div>` : ""}
      <div class="fact"><span>母父</span><strong>${escapeHtml(horse.broodmare_sire)}</strong></div>
      <div class="fact"><span>母父系</span><strong>${escapeHtml(horse.bms_line || "Other")}</strong></div>
      <div class="fact"><span>牝系</span><strong>${escapeHtml(horse.female_family || "未分类")}</strong></div>
      <div class="fact fact-cross"><span>Cross</span><strong>${crossItems(horse.pedigree_crosses)}</strong></div>
      ${horse.dosage_profile ? `<div class="fact"><span>DP</span><strong>${escapeHtml(horse.dosage_profile)} (${escapeHtml(horse.dosage_points)})</strong></div>` : ""}
      ${horse.dosage_index != null ? `<div class="fact"><span>DI</span><strong>${escapeHtml(formatNumber(horse.dosage_index, 2))}</strong></div>` : ""}
      ${horse.center_of_distribution != null ? `<div class="fact"><span>CD</span><strong>${escapeHtml(formatNumber(horse.center_of_distribution, 2))}</strong></div>` : ""}
      ${horse.dosage_profile ? `<div class="fact"><span>Dosage 数据状态</span><strong>${horse.dosage_source_url ? `<a href="${escapeHtml(horse.dosage_source_url)}" target="_blank" rel="noopener noreferrer">${dosageStatusLabel(horse.dosage_status)}</a>` : dosageStatusLabel(horse.dosage_status)}</strong></div>` : ""}
      <div class="fact"><span>马主</span><strong>${ownerCell(horse)}</strong></div>
      <div class="fact"><span>练马师</span><strong>${escapeHtml(horse.trainer)}</strong></div>
      <div class="fact"><span>生产牧场</span><strong>${escapeHtml(horse.breeder)}</strong></div>
      <div class="fact"><span>产地</span><strong>${escapeHtml(horse.birthplace)}</strong></div>
      <div class="fact"><span>生涯战绩</span><strong>${escapeHtml(careerSummaryText(horse.career_summary))}</strong></div>
      <div class="fact"><span>最高成就</span><strong>${escapeHtml(uiValue(horse.achievement_class, "achievement"))}</strong></div>
      <div class="fact"><span>奖金</span><strong>${escapeHtml(prize(horse))}</strong></div>
      <div class="fact"><span>主要胜鞍</span><strong>${escapeHtml(horse.major_win)}</strong></div>
    </div>

    <details class="race-section" open>
      <summary>比赛记录</summary>
      ${raceRows(data.races)}
    </details>
    ${studSection(data.stud, horse)}
    ${detailSources(data.sources)}
  `;
  updateHorseNavigation();
}

function closeDrawer({ updateHistory = true, restoreFocus = true } = {}) {
  if (!els.drawer.classList.contains("open") && !state.horse) return;
  els.drawer.classList.remove("open");
  els.drawer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("drawer-open");
  state.horse = "";
  if (updateHistory) writeUrlState("push");
  if (restoreFocus && lastFocusedElement?.isConnected) lastFocusedElement.focus();
}

function bindControls() {
  els.themeMode?.addEventListener("change", () => applyTheme(els.themeMode.value));
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (document.documentElement.dataset.themePreference === "system") applyTheme("system", { persist: false });
  });
  const refresh = () => {
    state.offset = 0;
    renderActiveFilters();
    writeUrlState("push");
    loadHorses();
  };
  const resetFilters = () => {
    clearAllFilters();
    writeUrlState("push");
    loadHorses();
  };
  els.resetFilters?.addEventListener("click", resetFilters);
  const updateSearch = debounce((value, peer) => {
    state.q = value.trim();
    peer.value = value;
    refresh();
  });
  els.search.addEventListener("input", () => updateSearch(els.search.value, els.mobileSearch));
  els.mobileSearch.addEventListener("input", () => updateSearch(els.mobileSearch.value, els.search));
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
    writeUrlState("push");
    loadHorses();
  });
  els.next.addEventListener("click", () => {
    state.offset += state.limit;
    writeUrlState("push");
    loadHorses();
  });
  for (const button of els.tableSortButtons) {
    button.addEventListener("click", () => {
      const sort = button.dataset.tableSort;
      if (state.sort === sort) state.dir = state.dir === "asc" ? "desc" : "asc";
      else {
        state.sort = sort;
        state.dir = sort === "name" ? "asc" : "desc";
      }
      els.sort.value = state.sort;
      updateDirectionButton();
      refresh();
    });
  }
  els.activeFilters.addEventListener("click", (event) => {
    const remove = event.target.closest("[data-remove-filter]");
    if (remove) removeFilter(remove.dataset.removeFilter);
    if (event.target.closest("[data-clear-filters]")) resetFilters();
  });
  els.filterOpen.addEventListener("click", () => {
    els.filtersPanel.classList.add("open");
    els.filterBackdrop.hidden = false;
    els.filterBackdrop.classList.add("open");
    els.filterOpen.setAttribute("aria-expanded", "true");
    els.filterClose.focus();
  });
  els.filterClose.addEventListener("click", closeFilters);
  els.filterBackdrop.addEventListener("click", closeFilters);
  els.closeDrawer.addEventListener("click", () => closeDrawer());
  els.closeBackdrop.addEventListener("click", () => closeDrawer());
  els.previousHorse.addEventListener("click", () => openAdjacentHorse(-1));
  els.nextHorse.addEventListener("click", () => openAdjacentHorse(1));
  for (const button of els.navButtons) {
    button.addEventListener("click", () => {
      showView(button.dataset.view).catch((error) => {
        console.error(error);
        const content = els[`${button.dataset.view}Content`];
        if (content) content.innerHTML = `<div class="load-error">本页资料暂时无法载入，请稍后重试。</div>`;
      });
    });
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (els.filtersPanel.classList.contains("open")) closeFilters();
      else if (els.drawer.classList.contains("open")) closeDrawer();
      return;
    }
    if (!els.drawer.classList.contains("open")) return;
    if (event.key === "ArrowLeft" && !event.target.matches("input, select, textarea")) openAdjacentHorse(-1);
    if (event.key === "ArrowRight" && !event.target.matches("input, select, textarea")) openAdjacentHorse(1);
    if (event.key !== "Tab") return;
    const focusable = [...els.drawerPanel.querySelectorAll('button:not([disabled]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter((element) => !element.hidden && element.getClientRects().length);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  window.addEventListener("popstate", restoreFromUrl);
}

async function restoreFromUrl() {
  readUrlState();
  syncControlsFromState();
  await showView(state.view, { updateHistory: false });
  if (state.view === "progeny") await loadHorses();
  if (state.horse) await openHorse(state.horse, { updateHistory: false });
  else closeDrawer({ updateHistory: false, restoreFocus: false });
}

async function init() {
  applyTheme(localStorage.getItem("duramente-theme") || "system", { persist: false });
  bindControls();
  await loadSummary();
  readUrlState();
  syncControlsFromState();
  writeUrlState("replace");
  await showView(state.view, { updateHistory: false });
  if (state.view === "progeny") await loadHorses();
  if (state.horse) await openHorse(state.horse, { updateHistory: false });
}

init().catch((error) => {
  console.error("Database load failed", error);
  els.horseRows.innerHTML = `<tr><td colspan="11"><div class="load-error">资料暂时无法载入。<button class="reset-filters" type="button" onclick="window.location.reload()">重新载入</button></div></td></tr>`;
  els.horseCards.innerHTML = `<div class="load-error">资料暂时无法载入。</div>`;
});

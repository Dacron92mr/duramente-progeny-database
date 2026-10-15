import { FILTER_KEYS, VALID_VIEWS, VALID_PEDIGREE_SECTIONS, VALID_SIRE_SECTIONS, VALID_PRODUCTION_SECTIONS } from "./state.mjs";

export function createRouter(state, location = window.location, history = window.history) {
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
    if (state.limit !== 50) params.set("limit", String(state.limit));
    if (state.offset) params.set("offset", String(state.offset));
    if (state.horse) params.set("horse", String(state.horse));
    if (state.horse && state.profile === "full") params.set("profile", "full");
    const query = params.toString();
    return `${location.pathname}${query ? `?${query}` : ""}${location.hash}`;
  }

  function writeUrlState(mode = "push") {
    const url = urlForState();
    if (`${location.pathname}${location.search}${location.hash}` === url) return;
    history[mode === "replace" ? "replaceState" : "pushState"]({ duramente: true }, "", url);
  }

  function readUrlState() {
    const params = new URLSearchParams(location.search);
    state.view = VALID_VIEWS.has(params.get("view")) ? params.get("view") : "progeny";
    state.pedigree = VALID_PEDIGREE_SECTIONS.has(params.get("pedigree")) ? params.get("pedigree") : "bms";
    state.sire = VALID_SIRE_SECTIONS.has(params.get("sire")) ? params.get("sire") : "annual";
    state.production = VALID_PRODUCTION_SECTIONS.has(params.get("production")) ? params.get("production") : "farm";
    for (const key of FILTER_KEYS) state[key] = params.get(key) || "";
    state.sort = ["earnings_netkeiba", "birth_year", "name"].includes(params.get("sort")) ? params.get("sort") : "earnings_netkeiba";
    state.dir = ["asc", "desc"].includes(params.get("dir")) ? params.get("dir") : (state.sort === "name" ? "asc" : "desc");
    state.limit = [20, 50, 100].includes(Number(params.get('limit'))) ? Number(params.get('limit')) : 50;
    const offset = Number(params.get('offset') || 0);
    state.offset = Number.isSafeInteger(offset) ? Math.max(0, Math.floor(offset / state.limit) * state.limit) : 0;
    if (!['g1', 'graded', 'hkjc', 'breeding'].includes(state.quick)) state.quick = '';
    state.horse = params.get("horse") || "";
    state.profile = state.horse && params.get("profile") === "full" ? "full" : "quick";
  }

  return { urlForState, writeUrlState, readUrlState };
}

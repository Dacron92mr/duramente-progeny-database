import { staticHorseList } from "./filtering.mjs";

export function createDataClient() {
  const staticData = {
    summary: null,
    horses: null,
    analytics: new Map(),
    details: new Map(),
  };

  const pending = new Map();
  let horsesRequest;
  function fetchStaticData(path) {
    if (!pending.has(path)) {
      const request = fetchUncached(path).catch(error => { pending.delete(path); throw error; });
      pending.set(path, request);
    }
    return pending.get(path);
  }
  function staticBase() {
    return String(window.STATIC_DATA_BASE || "").replace(/\/$/, "");
  }

  function isStaticMode() {
    return Boolean(staticBase());
  }

  async function fetchUncached(path) {
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
    if (staticData.horses) return staticData.horses;
    horsesRequest ||= Promise.all([fetchStaticData("horses.json"),fetchStaticData('career_history.json')]).then(([horses,history])=>{
      staticData.horses=horses.map(h=>({...h,affiliation_history:history.horses?.[String(h.id)]?.affiliations||[]}));
      return staticData.horses;
    }).catch(error=>{horsesRequest=null;throw error;});
    return horsesRequest;
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


  return { staticData, isStaticMode, fetchStaticData, getStaticHorses, getJson, getAnalytics };
}

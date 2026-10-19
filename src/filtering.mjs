import { horseDamAgeBucket } from "./format.mjs";

export function searchText(horse) {
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

export function staticSortValue(horse, sort) {
  if (sort === "birth_year") return Number(horse.birth_year || -1);
  if (sort === "sex") return horse.sex || "";
  if (sort === "earnings_jbis") return Number(horse.earnings_jbis ?? -1);
  if (sort === "earnings_netkeiba") return Number(horse.earnings_netkeiba ?? -1);
  return horse.name || "";
}

export const QUICK_FILTER_LABELS = {
  g1: 'G1 冠军', graded: '重赏冠军（含 G1）', hkjc: '有香港官方译名', breeding: '有繁殖记录',
};
export function matchesQuickFilter(horse, quick) {
  if (quick === 'g1') return horse.achievement_class === 'G1';
  if (quick === 'graded') return ['G1', 'G2', 'G3'].includes(horse.achievement_class);
  if (quick === 'hkjc') return Boolean(horse.hkjc_name_zh?.trim());
  if (quick === 'breeding') return ['Stud Record', 'Progeny Record'].includes(horse.breeding_role);
  return true;
}
export function filterAndSortHorses(horses, params) {
  const search = (params.get("q") || "").trim().toLowerCase();
  const sort = params.get("sort") || "earnings_netkeiba";
  const direction = params.get("dir") === "asc" ? "asc" : "desc";

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
    if (!matchesQuickFilter(horse, params.get("quick"))) return false;
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

  return filtered;
}

export function staticHorseList(horses, params) {
  const filtered = filterAndSortHorses(horses, params);
  const rawLimit = Number(params.get('limit') || 50);
  const rawOffset = Number(params.get('offset') || 0);
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(100, Math.floor(rawLimit))) : 50;
  const offset = Number.isFinite(rawOffset) ? Math.max(0, Math.floor(rawOffset)) : 0;
  return { total: filtered.length, items: filtered.slice(offset, offset + limit) };
}

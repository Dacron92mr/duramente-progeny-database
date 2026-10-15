export const state = {
  view: "progeny",
  pedigree: "bms",
  sire: "annual",
  production: "farm",
  horse: "",
  profile: "quick",
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
  quick: "",
  display: "compact",
  sort: "earnings_netkeiba",
  dir: "desc",
  limit: 50,
  offset: 0,
  total: 0,
  allTotal: 0,
};

export const FILTER_META = {
  quick: { label: "快捷筛选", element: null },
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

export const FILTER_KEYS = Object.keys(FILTER_META);
export const VALID_VIEWS = new Set(["progeny", "sire", "pedigree", "production", "racecourse"]);
export const VALID_PEDIGREE_SECTIONS = new Set(["bms", "family", "inbreeding", "dosage"]);
export const VALID_SIRE_SECTIONS = new Set(["annual", "crop", "graded", "market"]);
export const VALID_PRODUCTION_SECTIONS = new Set(["farm", "broodmare", "club"]);

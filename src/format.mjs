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

export function uiValue(value, type) {
  const text = String(value ?? "");
  return UI_VALUE_LABELS[type]?.[text] || text;
}

export function careerSummaryText(value) {
  return String(value || "").replaceAll("戦", "战").replaceAll("勝", "胜");
}
export function fmt(value) {
  if (value === null || value === undefined || value === "") return "—";
  return value;
}

export function money(value) {
  if (value === null || value === undefined || value === "" || Number.isNaN(Number(value))) return "—";
  return `${Number(value).toLocaleString("zh-CN", { maximumFractionDigits: 1 })} 万日元`;
}

export function raceDateValue(value) {
  const text = String(value || "").replaceAll("/", "-").replaceAll(".", "-");
  const parsed = Date.parse(text);
  return Number.isNaN(parsed) ? NaN : parsed;
}

export function prize(horse) {
  return money(horse.earnings_netkeiba ?? horse.earnings_jbis);
}

export function escapeHtml(value) {
  return String(fmt(value))
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


export function formatNumber(value, digits = 0) {
  if (value === null || value === undefined || value === "") return "—";
  return Number(value).toLocaleString("zh-CN", { maximumFractionDigits: digits });
}

export function formatRate(value) {
  if (value === null || value === undefined) return "—";
  return `${(Number(value) * 100).toFixed(1)}%`;
}

export function horseDamAgeBucket(horse) {
  const age = horse.dam_age_at_foaling;
  if (age === null || age === undefined || age === "") return "未知";
  const n = Number(age);
  if (n <= 6) return "3-6";
  if (n <= 10) return "7-10";
  if (n <= 14) return "11-14";
  if (n <= 18) return "15-18";
  return "19+";
}

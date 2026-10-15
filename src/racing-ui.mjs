import { escapeHtml as html } from './format.mjs';

// Only explicit grade codes qualify; Jpn and jumping codes keep their own identity.
export function gradeClass(value) {
  const normalized = String(value || '').normalize('NFKC').toUpperCase();
  const code = { GI: 'G1', GII: 'G2', GIII: 'G3' }[normalized] || normalized;
  return /^G[123]$/.test(code) ? `grade-${code.toLowerCase()}` : 'grade-other';
}
export function affiliationBadge(value) {
  if (!value) return '—';
  const type = value === '美浦' ? 'miho' : value === '栗東' ? 'ritto' : value === '海外' ? 'overseas' : 'local';
  return `<span class="region ${type}" aria-label="所属：${html(value)}">${html(value)}</span>`;
}
export function raceLabel(value) {
  const text = String(value || '—');
  // Display an explicitly supplied annotation, never infer the horse's achievement.
  return html(text).replace(/[（(](G[123]|GIII|GII|GI|GⅠ|GⅡ|GⅢ|Jpn[123ⅠⅡⅢ]|J[.]G[123])[）)]/gi,
    (_, grade) => ` <span class="grade-pill ${gradeClass(grade)}" title="赛事等级；不代表本马获胜">${grade}</span>`);
}

export function achievementBadge(value, label = value) {
  return `<span class="achievement grade-pill ${gradeClass(value)}" title="最高成就：数据库原分类；具体赛事体系见比赛记录">${html(label || '—')}</span>`;
}

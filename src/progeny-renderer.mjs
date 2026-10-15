import { affiliationBadge, raceLabel, achievementBadge } from './racing-ui.mjs';
import { escapeHtml as html, uiValue, careerSummaryText, formatNumber, prize } from './format.mjs';

export function horseName(horse) {
  const secondary = [horse.name_en, horse.hkjc_name_zh].filter(Boolean);
  return `<span class="horse-name" lang="ja">${html(horse.name)}</span>${secondary.length ? `<span class="horse-name-secondary">${secondary.map(html).join(' · ')}</span>` : ''}`;
}
function achievement(horse) { return achievementBadge(horse.achievement_class, uiValue(horse.achievement_class, 'achievement')); }
export function renderProgenyRows(items, { regionBadge, lineageBadge, ownerCell }) {
  return items.map(horse => `<tr data-horse-row="${html(horse.id)}">
    <td class="horse-column"><button class="horse-open" type="button" data-id="${html(horse.id)}" aria-label="查看${html(horse.name)}的详情">${horseName(horse)}</button><span class="compact-affiliation">${affiliationBadge(horse.trainer_region)}</span></td>
    <td class="year-cell">${html(horse.birth_year)}</td>
    <td class="sex-cell">${html(uiValue(horse.sex, 'sex'))}</td>
    <td class="achievement-cell">${achievement(horse)}</td>
    <td class="detail-only color-name">${html(horse.color)}</td>
    <td class="detail-only">${regionBadge(horse.trainer_region)}</td>
    <td class="detail-only dam-name">${html(horse.dam)}</td>
    <td class="detail-only">${lineageBadge(horse.female_family)}</td>
    <td class="detail-only bms-cell">${html(horse.broodmare_sire)}<div class="tag-row compact">${lineageBadge(horse.bms_line)}</div></td>
    <td class="detail-only owner-name">${ownerCell(horse)}</td>
    <td class="detail-only trainer-name">${regionBadge(horse.trainer_region)} ${html(horse.trainer)}</td>
    <td class="money">${formatNumber(horse.earnings_netkeiba ?? horse.earnings_jbis, 1)}</td>
    <td class="record-cell"><span>${raceLabel(horse.major_win)}</span><span class="muted detail-only">${html(careerSummaryText(horse.career_summary))}</span></td>
  </tr>`).join('');
}
export function renderHorseCards(items) {
  return items.map(horse => `<button class="horse-card" type="button" data-id="${html(horse.id)}" aria-label="查看${html(horse.name)}的详情">
    <span class="horse-card-head"><span>${horseName(horse)}</span>${achievement(horse)}</span>
    <span class="horse-card-meta">${html(horse.birth_year)} · ${html(uiValue(horse.sex, 'sex'))} · ${affiliationBadge(horse.trainer_region)}</span>
    <span class="horse-card-pedigree detail-only"><span><small>母马</small>${html(horse.dam)}</span><span><small>母父</small>${html(horse.broodmare_sire)}</span></span>
    <span class="horse-card-footer"><span class="horse-card-summary">${raceLabel(horse.major_win || careerSummaryText(horse.career_summary) || '—')}</span><span class="horse-card-prize">${html(prize(horse))}</span></span>
  </button>`).join('');
}

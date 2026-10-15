import { escapeHtml, uiValue, careerSummaryText, prize, formatNumber } from './format.mjs';
import { enhanceProfile } from './horse-profile.mjs';
import { setBackgroundInert } from './dialog.mjs';

/** Owns drawer lifecycle, async identity checks and focus restoration. */
export function createHorseDrawer({ state, els, writeUrlState, getHorseIds, ensureHorseSequence,
  fetchStaticData, getStaticHorses, getJson, horseDamCell, raceRows, studSection, detailSources,
  regionBadge, lineageBadge, damAgeText, crossItems, ownerCell }) {
  let lastFocusedElement = null;
  function updateHorseNavigation() {
    const index = getHorseIds().indexOf(String(state.horse));
    els.previousHorse.disabled = index <= 0;
    els.nextHorse.disabled = index < 0 || index >= getHorseIds().length - 1;
    els.previousHorse.title = index > 0 ? `${index} / ${getHorseIds().length}` : "已经是第一匹产驹";
    els.nextHorse.title = index >= 0 && index < getHorseIds().length - 1 ? `${index + 2} / ${getHorseIds().length}` : "已经是最后一匹产驹";
  }

  async function openAdjacentHorse(direction) {
    const ids = await ensureHorseSequence();
    const index = ids.indexOf(String(state.horse));
    const nextId = ids[index + direction];
    if (nextId) openHorse(nextId, { preserveFocus: true });
  }

  let gradedSiblingCatalog;

  async function openHorse(id, { trigger = null, updateHistory = true, preserveFocus = false } = {}) {
    if (!id) return;
    const requestedId = String(id);
    const wasOpen = els.drawer.classList.contains("open");
    if (!preserveFocus && !wasOpen) lastFocusedElement = trigger || document.activeElement;
    state.horse = String(id);
    if (updateHistory) writeUrlState("push");
    els.detail.innerHTML = `<h2 id="drawerTitle">马匹详情</h2><p class="muted" role="status">正在加载马匹详情…</p>`;
    els.drawer.classList.add("open");
    els.drawer.setAttribute("aria-hidden", "false");
    document.body.classList.add("drawer-open");
    setBackgroundInert(els.drawer, true);
    els.drawerPanel.scrollTop = 0;
    updateHorseNavigation();
    if (!preserveFocus && !wasOpen) els.drawerPanel.focus();
    gradedSiblingCatalog ||= fetchStaticData("graded_siblings.json").catch(() => { gradedSiblingCatalog = null; return { dams: {} }; });
    let result;
    try { result = await Promise.all([
      getJson(`/api/horse?id=${encodeURIComponent(id)}`), gradedSiblingCatalog, getStaticHorses(),
    ]); } catch (error) {
      if (state.horse !== requestedId) return;
      els.detail.innerHTML = '<h2 id="drawerTitle">马匹详情</h2><div class="load-error" role="alert">详情暂时无法载入。<button type="button" id="retryDetail">重试</button></div>';
      els.detail.querySelector('#retryDetail').addEventListener('click', () => openHorse(requestedId, { updateHistory: false }));
      return;
    }
    if (state.horse !== requestedId) return;
    const [data, relatives, allHorses] = result;
    const horse = data.horse;
    const siblings = window.DuramenteRelatives.gradedSiblings(horse, allHorses, relatives);
    els.detail.innerHTML = `
      <div class="detail-head">
        <p class="kicker">${escapeHtml(horse.sire || "Duramente")}</p>
        <h2 id="drawerTitle">${escapeHtml(horse.name)}</h2>
        ${horse.name_en ? `<div class="english-name">${escapeHtml(horse.name_en)}</div>` : ""}
        ${horse.hkjc_name_zh ? `<div class="hk-name detail-hk">${escapeHtml(horse.hkjc_name_zh)}</div>` : ""}
        <div class="tag-row">
          <span class="tag">${escapeHtml(horse.birth_date || horse.birth_year)}</span>
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

      ${horse.netkeiba_id ? '<figure class="horse-photo" id="horsePhoto" aria-label="产驹照片"></figure>' : ''}
      <div class="detail-grid">
        <div class="fact"><span>父马</span><strong>${escapeHtml(horse.sire || "ドゥラメンテ")}</strong></div>
        <div class="fact"><span>母马</span><strong>${horseDamCell(horse)}</strong></div>
        <div class="fact"><span>母马出生年</span><strong>${escapeHtml(horse.dam_birth_year || "未知")}</strong></div>
        <div class="fact"><span>生产本胎时母龄</span><strong>${escapeHtml(damAgeText(horse))}</strong></div>
        ${horse.dam_biological_parity != null ? `<div class="fact"><span>真实生产胎次</span><strong>母马第 ${escapeHtml(horse.dam_biological_parity)} 次生产</strong></div>` : ""}
        ${horse.dam_registered_foal_order != null ? `<div class="fact"><span>登记产驹序次</span><strong>第 ${escapeHtml(horse.dam_registered_foal_order)} 匹登记产驹</strong></div>` : ""}
        <div class="fact"><span>母父</span><strong>${escapeHtml(horse.broodmare_sire)}</strong></div>
        <div class="fact"><span>母父系</span><strong>${escapeHtml(horse.bms_line || "Other")}</strong></div>
        <div class="fact"><span>牝系</span><strong>${escapeHtml(horse.female_family || "未分类")}</strong></div>
        <div class="fact fact-cross"><span>Cross</span><strong>${crossItems(horse.pedigree_crosses)}</strong></div>
        ${horse.dosage_profile ? `<div class="fact"><span>DP</span><strong>${escapeHtml(horse.dosage_profile)} (${escapeHtml(horse.dosage_points)})</strong></div>` : ""}
        ${horse.dosage_index != null ? `<div class="fact"><span>DI</span><strong>${escapeHtml(formatNumber(horse.dosage_index, 2))}</strong></div>` : ""}
        ${horse.center_of_distribution != null ? `<div class="fact"><span>CD</span><strong>${escapeHtml(formatNumber(horse.center_of_distribution, 2))}</strong></div>` : ""}
        <div class="fact"><span>马主</span><strong>${ownerCell(horse)}</strong></div>
        <div class="fact"><span>练马师</span><strong>${escapeHtml(horse.trainer)}</strong></div>
        <div class="fact"><span>生产牧场</span><strong>${escapeHtml(horse.breeder)}</strong></div>
        <div class="fact"><span>产地</span><strong>${escapeHtml(horse.birthplace)}</strong></div>
        <div class="fact"><span>生涯战绩</span><strong>${escapeHtml(careerSummaryText(horse.career_summary))}</strong></div>
        <div class="fact"><span>最高成就</span><strong>${escapeHtml(uiValue(horse.achievement_class, "achievement"))}</strong></div>
        <div class="fact"><span>奖金</span><strong>${escapeHtml(prize(horse))}</strong></div>
        <div class="fact"><span>主要胜鞍</span><strong>${escapeHtml(horse.major_win)}</strong></div>
        ${siblings.length ? `<div class="fact fact-siblings"><span>同母兄弟姐妹 · 重赏冠军</span><strong>${siblings.map(sibling => `<a href="https://db.netkeiba.com/horse/${escapeHtml(sibling.netkeiba_id)}/" target="_blank" rel="noopener noreferrer" title="${escapeHtml(sibling.major_win || sibling.achievement_class)}">${escapeHtml(sibling.name)}</a>`).join("")}</strong></div>` : ""}
      </div>

      <details class="race-section" open>
        <summary>比赛记录</summary>
        ${raceRows(data.races, horse)}
      </details>
      ${studSection(data.stud, horse)}
      ${detailSources(data.sources)}
    `;
    enhanceProfile(els.detail, els.drawerPanel, state, writeUrlState);
    window.DuramenteAnalysis.horsePhoto(horse, document.getElementById("horsePhoto"));
    updateHorseNavigation();
  }

  function closeDrawer({ updateHistory = true, restoreFocus = true } = {}) {
    if (!els.drawer.classList.contains("open") && !state.horse) return;
    els.drawer.classList.remove("open");
    els.drawer.setAttribute("aria-hidden", "true");
    document.body.classList.remove("drawer-open");
    setBackgroundInert(els.drawer, false);
    state.horse = "";
    state.profile = "quick";
    if (updateHistory) writeUrlState("push");
    if (restoreFocus && lastFocusedElement?.isConnected) lastFocusedElement.focus();
  }

  return { openHorse, closeDrawer, openAdjacentHorse, updateHorseNavigation };
}

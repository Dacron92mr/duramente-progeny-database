import { createProfileModel } from './profile-model.mjs';
import { renderProfile, bindProfile } from './horse-profile.mjs';
import { setBackgroundInert } from './dialog.mjs';

/** Owns drawer lifecycle, async identity checks and focus restoration. */
export function createHorseDrawer({ state, els, writeUrlState, getHorseIds, ensureHorseSequence,
  fetchStaticData, getStaticHorses, getJson, horseDamCell, raceRows, studSection, detailSources,
  damAgeText, crossItems, ownerCell, navigateToProgeny }) {
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
    const vm = createProfileModel(data, siblings, allHorses);
    const helpers = { horseDamCell, raceRows, studSection, detailSources, damAgeText, crossItems, ownerCell };
    const profile = renderProfile(vm, helpers);
    els.detail.innerHTML = profile.html;
    els.drawerPanel.classList.toggle('has-breeding', profile.hasBreeding);
    bindProfile(els.detail, els.drawerPanel, state, writeUrlState, vm, helpers, {
      openHorse,
      explore(filters) { closeDrawer({ updateHistory: false, restoreFocus: false }); navigateToProgeny(filters); },
    });
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

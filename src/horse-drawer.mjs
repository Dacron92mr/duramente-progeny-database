import { createProfileModel } from './profile-model.mjs';
import { renderProfile, bindProfile } from './horse-profile.mjs';
import { setBackgroundInert } from './dialog.mjs';

/** Owns drawer lifecycle, async identity checks and focus restoration. */
export function createHorseDrawer({ state, els, writeUrlState, getHorseIds, ensureHorseSequence,
  fetchStaticData, getStaticHorses, getJson, horseDamCell, raceRows, studSection, detailSources,
  damAgeText, crossItems, ownerCell, navigateToProgeny }) {
  let lastFocusedElement = null;
  let notableCatalog;
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
  let careerCatalog,blackTypeCatalog;

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
    careerCatalog ||= fetchStaticData('post_racing_careers.json').catch(()=>{careerCatalog=null;return {horses:{}};});
    blackTypeCatalog ||= fetchStaticData('black_type_siblings.json').catch(()=>{blackTypeCatalog=null;return {dams:{}};});
    notableCatalog ||= fetchStaticData('notable_siblings.json').catch(()=>{notableCatalog=null;return {dams:{}};});
    let result;
    try { result = await Promise.all([
      getJson(`/api/horse?id=${encodeURIComponent(id)}`), gradedSiblingCatalog, getStaticHorses(), careerCatalog, blackTypeCatalog, notableCatalog,
    ]); } catch (error) {
      if (state.horse !== requestedId) return;
      els.detail.innerHTML = '<h2 id="drawerTitle">马匹详情</h2><div class="load-error" role="alert">详情暂时无法载入。<button type="button" id="retryDetail">重试</button></div>';
      els.detail.querySelector('#retryDetail').addEventListener('click', () => openHorse(requestedId, { updateHistory: false }));
      return;
    }
    if (state.horse !== requestedId) return;
    const [data, relatives, allHorses, careers, blackTypes, notables] = result;
    const horse = data.horse;
    const siblings = window.DuramenteRelatives.gradedSiblings(horse, allHorses, relatives);
    const vm = createProfileModel(data, siblings, allHorses);
    const career=careers.horses[String(id)];
    vm.postRacing=career?.netkeiba_id===horse.netkeiba_id?career.events:[];
    vm.siblingAudit=blackTypes.coverage?.[String(horse.id)];
    vm.blackType=(blackTypes.dams[horse.dam_netkeiba_id]||[]).filter(s=>s.netkeiba_id!==horse.netkeiba_id);
    vm.notableSiblings=(notables.dams[horse.dam_netkeiba_id]||[]).filter(s=>s.netkeiba_id!==horse.netkeiba_id);
    const helpers = { horseDamCell, raceRows, studSection, detailSources, damAgeText, crossItems, ownerCell };
    const profile = renderProfile(vm, helpers);
    els.detail.innerHTML = profile.html;
    const header=els.drawerPanel.querySelector('#drawerHeader');
    header.querySelector('.profile-controls')?.remove();
    header.append(els.detail.querySelector('.profile-controls'));
    header.querySelector('#drawerCompactName').textContent=horse.name;
    els.drawerPanel.onscroll=()=>header.classList.toggle('is-scrolled',els.drawerPanel.scrollTop>100);
    header.classList.remove('is-scrolled');
    if(!header._resize){header._resize=new ResizeObserver(()=>els.drawerPanel.style.setProperty('--profile-header-height',`${header.offsetHeight+24}px`));header._resize.observe(header);}
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

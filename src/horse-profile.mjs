import { raceLabel, achievementBadge } from './racing-ui.mjs';
/** Groups existing source-backed facts without duplicating or changing their values. */
export function enhanceProfile(root, panel, state, writeUrlState) {
  const grid = root.querySelector('.detail-grid');
  const facts = new Map([...grid.children].map(node => [node.firstElementChild.textContent, node]));
  const achievement = facts.get('最高成就')?.querySelector('strong');
  if (achievement) achievement.innerHTML = achievementBadge(achievement.textContent);
  const major = facts.get('主要胜鞍')?.querySelector('strong');
  if (major) major.innerHTML = raceLabel(major.textContent);
  const trainer = facts.get('练马师')?.querySelector('strong');
  const region = root.querySelector('.tag-row .region');
  if (trainer && region) trainer.prepend(region.cloneNode(true), document.createTextNode(' '));
  const layout = document.createElement('div');
  layout.className = 'profile-columns';
  const section = (key, title) => {
    const node = document.createElement('section');
    node.className = 'profile-section'; node.id = `profile-${key}`; node.dataset.section = key;
    const heading = document.createElement('h3'); heading.textContent = title; node.append(heading);
    layout.append(node); return node;
  };
  const identity = section('identity', '身份与血统');
  const racing = section('racing', '竞赛生涯');
  const group = (target, title, labels, relationship) => {
    const card = document.createElement('div'); card.className = 'profile-group';
    const heading = document.createElement('h4'); heading.textContent = title;
    if (relationship) heading.className = `relationship relationship-${relationship}`;
    card.append(heading);
    for (const label of labels) if (facts.has(label)) { card.append(facts.get(label)); facts.delete(label); }
    target.append(card);
  };
  group(identity, '父 / Sire', ['父马'], 'sire');
  group(identity, '母系与血统 · Dam', ['母马','母马出生年','生产本胎时母龄','真实生产胎次','登记产驹序次','同母兄弟姐妹 · 重赏冠军'], 'dam');
  group(identity, '母父 / Broodmare Sire', ['母父','母父系'], 'bms');
  group(identity, '牝系与血统结构', ['牝系','Cross','DP','DI','CD']);
  group(identity, '马主、厩舍与生产', ['马主','练马师','生产牧场','产地']);
  group(racing, '赛绩概览', ['生涯战绩','最高成就','主要胜鞍','奖金']);
  const note = document.createElement('p'); note.className = 'muted';
  note.textContent = '最高成就沿用数据库分类；比赛记录中的等级只说明赛事级别，请结合名次阅读。'; racing.append(note);
  racing.append(root.querySelector('.race-section'));
  const stud = root.querySelector('.stud-section');
  if (stud) section('breeding', '繁殖生涯').append(stud);
  panel.classList.toggle('has-breeding', Boolean(stud));
  // Unknown future fields remain visible instead of being silently discarded.
  if (facts.size) group(identity, '其他资料', [...facts.keys()]);
  grid.replaceWith(layout);
  const photo = root.querySelector('.horse-photo'); if (photo) identity.append(photo);
  const controls = document.createElement('div'); controls.className = 'profile-controls';
  controls.innerHTML = '<div class="profile-modes" role="group" aria-label="资料显示方式"><button type="button" data-profile="quick">快速查看</button><button type="button" data-profile="full">完整资料</button></div><nav class="profile-sections" aria-label="资料分段"></nav>';
  root.querySelector('.detail-head').after(controls);
  const setMode = mode => {
    state.profile = mode; panel.dataset.profile = mode;
    controls.querySelectorAll('[data-profile]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.profile === mode)));
  };
  setMode(state.profile || 'quick');
  controls.querySelectorAll('[data-profile]').forEach(button => button.addEventListener('click', () => { setMode(button.dataset.profile); writeUrlState('replace'); }));
  for (const section of layout.children) {
    const link = document.createElement('a'); link.href = `#${section.id}`; link.textContent = section.firstElementChild.textContent;
    link.addEventListener('click', event => { event.preventDefault(); section.scrollIntoView({ behavior: 'instant', block: 'start' }); section.tabIndex = -1; section.focus({ preventScroll: true }); });
    controls.querySelector('nav').append(link);
  }
}

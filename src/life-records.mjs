import {escapeHtml as h, uiValue} from './format.mjs';
const norm=s=>String(s||'').replace(/[\s　]/g,'').replaceAll('（','(').replaceAll('）',')');
const recordText=v=>String(v||'').replaceAll('不受胎','未受孕').replaceAll('流産','流产').replaceAll('死産','死产').replaceAll('生後直死','出生后死亡').replaceAll('報告なし','暂无报告').replaceAll('生産予定','预计生产').replaceAll('種付せず','未配种').replaceAll('産駒は血統登録申込をされていません','该产驹尚未申请血统登记').replaceAll('ASB mare produce: foal deceased after birth.','产驹出生后死亡。').replaceAll('ASB mare produce: missed.','未受孕。').replaceAll('ASB mare produce: parentage verified.','血统关系已核验。');
const row=(name,value)=>`<div><dt>${h(name)}</dt><dd>${h(value===null||value===undefined||value===''?'—':value)}</dd></div>`;
export function breedingOutcome(covering,foals=[]) {
 const matches=foals.filter(f=>Number(f.result_year)===Number(covering.cover_year)+1&&norm(f.sire_name)===norm(covering.stallion_name));
 const foal=matches.length===1?matches[0]:null;
 const text=[foal?.birth_date,foal?.note,covering.result,covering.note].filter(Boolean).join(' ');
 const statuses=[[/生後直死|deceased after birth|出生后死亡/i,'出生后死亡'],[/死産|死产|stillborn/i,'死产'],[/流産|流产|aborted/i,'流产'],[/不受胎|未受孕|\bmissed\b/i,'未受孕'],[/種付せず|未配种/,'未配种'],[/報告なし|暂无报告/,'尚无报告']];
 for(const [pattern,label] of statuses)if(pattern.test(text))return {label,foal};
 if(foal && /^\d{4}[.\/-]\s*\d{1,2}[.\/-]\s*\d{1,2}/.test(foal.birth_date||''))return {label:'已确认生产',foal};
 if(/生産予定|预计生产/.test(text))return {label:'预计生产',foal};
 // A due date is a forecast, never proof of pregnancy loss or of birth.
 return {label:covering.due_date?'有预产记录 · 结果待报告':'尚无结果报告',foal};
}
export function renderBreedingYears(profile) {
 if(profile.role==='stallion') {
  const years=[...new Set([...(profile.fees||[]),...(profile.stallion_stats||[])].map(r=>r.year))].sort((a,b)=>b-a);
  return `<div class="breeding-years">${years.map((year,i)=>{const fee=profile.fees.find(r=>r.year===year)||{},stat=profile.stallion_stats.find(r=>r.year===year)||{};return `<details ${i===0?'open':''}><summary><strong>${h(year)} 供用年度</strong><span>${h(fee.fee_text||'年度记录')}</span></summary><dl>${row('配种费',fee.fee_text)}${row('配种数',stat.bred_total??fee.bred_count)}${row('出生',stat.births)}${row('登记产驹',stat.registered_total??fee.registered_count)}</dl></details>`;}).join('')}</div>`;
 }
 const coverings=[...(profile.coverings||[])].sort((a,b)=>b.cover_year-a.cover_year);
 const linked=new Set();
 const cards=coverings.map((c,i)=>{const {label,foal}=breedingOutcome(c,profile.foals);if(foal)linked.add(foal);return `<details ${i===0?'open':''}><summary><strong>${h(c.cover_year)} 配种年度</strong><span>${h(label)}</span></summary><dl>${row('配种对象',c.stallion_name)}${row('配种日期',c.cover_date)}${foal?`${row(`${foal.result_year} 生产结果`,[label,uiValue(foal.sex,'sex'),uiValue(foal.color,'color')].filter(Boolean).join(' · '))}${row('出生／记录日期',recordText(foal.birth_date))}${foalIdentity(foal)}`:`${row('预产日期',c.due_date)}`}${row('当时饲养者',[c.keeper_location,c.keeper_name].filter(Boolean).join(' · '))}</dl></details>`;});
 // Unpaired reports are displayed in their actual production year, never assigned a guessed mating year.
 for(const f of [...(profile.foals||[])].sort((a,b)=>b.result_year-a.result_year))if(!linked.has(f))cards.push(`<details><summary><strong>${h(f.result_year)} 生产记录</strong><span>查看记录</span></summary><dl>${row('父马',f.sire_name)}${row('出生／结果',recordText(f.birth_date))}${row('性别／毛色',[uiValue(f.sex,'sex'),uiValue(f.color,'color')].filter(Boolean).join(' · '))}${foalIdentity(f)}${row('备注',recordText(f.note))}</dl></details>`);
 return cards.length?`<div class="breeding-years">${cards.join('')}</div>`:'';
}
function foalIdentity(f){const url=f.source_url||f.foal_url||f.jbis_url;return `<div><dt>产驹登记</dt><dd>${f.horse_id?`<a href="?horse=${encodeURIComponent(f.horse_id)}&profile=full">${h(f.foal_name||'查看产驹')} →</a>`:/^https:\/\//.test(url||'')?`<a href="${h(url)}" target="_blank" rel="noreferrer">${h(f.foal_name||'查看登记')} ↗</a>`:h(f.foal_name||'暂无登记马名')}</dd></div>`;}
export function historyNames(horse,field){return [...new Set([horse[field],...(horse.affiliation_history||[]).map(e=>e[field])].filter(Boolean))];}
export function attributionCounts(records=[]) {
 const groups=new Map();for(const r of records){if(!r.trainer||!r.source_url)continue;const g=groups.get(r.trainer)||new Map();g.set(r.race_id||r.date,r);groups.set(r.trainer,g);}
 return [...groups].map(([trainer,rows])=>({trainer,races:rows.size,wins:[...rows.values()].filter(r=>r.finish===1).length}));
}
const affiliationName=value=>{
 const name=norm(value).replace(/[()]/g,'');
 return ({'西':'栗東','東':'美浦'})[name]||name;
};
// Collapse compatible observations, never a confirmed change or a different owner.
export function affiliationChanges(events=[]) {
 const groups=[];
 for(const original of [...events].sort((a,b)=>(a.date||a.observed_at||'').localeCompare(b.date||b.observed_at||''))) {
  const e={...original,trainer:norm(original.trainer),owner:norm(original.owner),affiliation:affiliationName(original.affiliation)};
  const previous=groups.at(-1);
  const compatible=previous && ['trainer','owner','affiliation'].every(k=>!previous[k]||!e[k]||previous[k]===e[k]);
  if(compatible && !(e.kind==='transfer'||e.kind==='ownership_change')) {
   for(const k of ['trainer','owner','affiliation'])if(e[k])previous[k]=e[k];
   previous.sources.push(original);
  } else groups.push({...e,sources:[original]});
 }
 return groups.reverse();
}
export function renderAffiliations(events=[],records=[]) {
 const changes=affiliationChanges(events);
 // A single unchanged affiliation already appears under People and Breeder.
 if(changes.length<2)return '';
 return `<section class="profile-group affiliation-history"><h4>所属变动</h4><ul class="affiliation-changes">${changes.map(e=>`<li><strong>${h([e.trainer,e.affiliation].filter(Boolean).join(' · '))}</strong>${e.owner?`<span>马主：${h(e.owner)}</span>`:''}</li>`).join('')}</ul><details class="profile-method"><summary>来源与成绩归属</summary>${records.length?`<p>已核实的任职赛果（部分记录）：${attributionCounts(records).map(r=>`${h(r.trainer)} ${r.wins}胜 / ${r.races}场`).join('；')}。</p>`:''}<p>筛选包含已核实的历任练马师与马主。资料确认日不代表转厩日；未确认任职期间的赛果不归于最后一任。</p>${changes.map(e=>`<p>${h(e.trainer||e.owner)}：${[...new Map(e.sources.filter(s=>s.source_url).map(s=>[s.source_url,s])).values()].map(s=>`<a href="${h(s.source_url)}" target="_blank" rel="noreferrer">${h(s.source_name||'来源')} ↗</a>`).join(' · ')}</p>`).join('')}</details></section>`;
}
export function renderRegistration(vm) {
 const events=(vm.registration||[]).filter(e=>!((e.status==='confirmed' && /退役/.test(e.title) && !/注销|抹消|转籍/.test(e.title)) && (vm.postRacing||[]).some(c=>c.source_url && c.source_url===e.source_url && c.date===e.date && /已退役|确认退役|公布退役/.test(c.summary)))).sort((a,b)=>b.date.localeCompare(a.date)),last=[...vm.racing.records].sort((a,b)=>String(b.race_date).localeCompare(String(a.race_date)))[0];
 if(!events.length)return '';
 return `<section class="profile-group registration-history"><h4>竞赛与登记履历</h4>${last?`<p>最近出赛：${h(last.race_date)} · ${h(last.race_name)} · ${h(last.finish?`${last.finish}着`:last.finish_note||'名次未详')}</p>`:''}${events.length?`<ol class="life-timeline">${events.map(e=>`<li><time>${h(e.date)}</time><strong>${h(e.title)}</strong><details class="profile-method"><summary>查看记录与来源</summary><p>${h(e.summary)}</p><a href="${h(e.source_url)}" target="_blank" rel="noreferrer">${h(e.source_name)} ↗</a></details></li>`).join('')}</ol>`:'<p class="muted">暂无单独核实的登记变更记录。</p>'}</section>`;
}

import {escapeHtml as h} from './format.mjs';
import {raceLabel} from './racing-ui.mjs';
const types={news:'竞赛近况',race:'竞赛成绩',career:'退役后经历',registration:'登记履历',breeding:'繁殖记录',affiliation:'所属履历'};
export function filterUpdates(events,{date='',horse='',type=''}={}){return events.filter(e=>(!date||e.recorded_at===date)&&(!horse||String(e.horse_id)===String(horse))&&(!type||e.type===type));}
export function updateRows(events){return events.map(e=>{const date=e.event_date?.split('-');return `<article class="update-row"><div class="update-date">${date&&date.length===3?`<small>${h(date[0])}<br>${Number(date[1])}月</small><strong>${Number(date[2])}</strong>`:'<span>资料<br>补充</span>'}</div><div><a class="update-horse" data-link-purpose="drill" href="./?horse=${encodeURIComponent(e.horse_id)}&profile=full">${h(e.horse_name)} ↗</a><p>${raceLabel(e.title)}</p><small>${e.status==='announced'?'已公布计划 · ':''}${e.historical?'新增历史资料 · ':''}${h(types[e.type]||'资料更新')} · ${h(e.recorded_at)} 收录</small><a class="update-source" href="${h(e.source_url)}" target="_blank" rel="noreferrer">来源 ↗</a></div></article>`;}).join('')||'<p class="muted">没有符合条件的更新。</p>';}
export function recentEvents(events) {
 const seen=new Set();
 return [...events].filter(e=>e.featured).sort((a,b)=>b.recorded_at.localeCompare(a.recorded_at)||(b.event_date||'').localeCompare(a.event_date||'')).filter(e=>{if(seen.has(e.horse_id))return false;seen.add(e.horse_id);return true;}).slice(0,3);
}
export async function mountRecentUpdates(host,fetchData) {
 if(!host||host.dataset.loaded)return;
 host.dataset.loaded='true';
 try {
  const {events}=await fetchData('updates.json');
  host.innerHTML=`<h2>最近动态</h2><ul>${recentEvents(events).map(e=>`<li><a data-link-purpose="drill" href="./?horse=${encodeURIComponent(e.horse_id)}&profile=full"><span>${h(e.horse_name)}</span><small>${h(e.title)}</small></a></li>`).join('')}</ul><a class="updates-all" data-link-purpose="drill" href="updates.html">全部动态 ↗</a>`;
 } catch {host.dataset.loaded='';host.innerHTML='<a data-link-purpose="drill" href="updates.html">查看更新履历 ↗</a>';}
}
export function mountUpdateHistory(host,data){const events=data.events||[],horses=[...new Map(events.map(e=>[String(e.horse_id),e.horse_name]))];host.innerHTML=`<h1>更新履历</h1><p class="muted">按收录日期查阅新增资料；每条记录另列事件发生时间。</p><div class="updates-filters"><label>收录日期 <input type="date" name="date"></label><label>产驹 <select name="horse"><option value="">全部</option>${horses.map(([id,name])=>`<option value="${h(id)}">${h(name)}</option>`).join('')}</select></label><label>类型 <select name="type"><option value="">全部</option>${Object.entries(types).map(([v,n])=>`<option value="${v}">${n}</option>`).join('')}</select></label></div><p data-update-count role="status"></p><div data-update-list></div>`;const render=()=>{const options=Object.fromEntries([...host.querySelectorAll('input,select')].map(x=>[x.name,x.value]));const selected=filterUpdates(events,options);host.querySelector('[data-update-list]').innerHTML=updateRows(selected);host.querySelector('[data-update-count]').textContent=`${selected.length} 条更新`;};host.querySelectorAll('input,select').forEach(el=>el.addEventListener('change',render));render();}

import {escapeHtml as h,money} from './format.mjs';
import {raceLabel} from './racing-ui.mjs';
const jra=/札幌|函館|福島|新潟|東京|中山|中京|京都|阪神|小倉/;
const nar=/門別|帯広|盛岡|水沢|浦和|船橋|大井|川崎|金沢|笠松|名古屋|園田|姫路|高知|佐賀|荒尾|福山/;
export function raceJurisdiction(r){const course=String(r.meeting||'');if(r.source==='breednet')return '海外';if(jra.test(course))return 'JRA';if(nar.test(course))return 'NAR';return course?'海外':'体系未详';}
export function renderRaceHistory(races,{finishBadge,raceDistanceText,overseasPrize}){
 if(!races.length)return '<p class="muted race-empty">暂无比赛记录</p>';
 const rows=[...races].sort((a,b)=>String(b.race_date||'').replaceAll('/','-').localeCompare(String(a.race_date||'').replaceAll('/','-')));
 const value=v=>h(v===null||v===undefined||v===''?'—':v);
 const prize=r=>r.source==='breednet'||r.data?.currency?overseasPrize(r):money(r.prize);
 const detail=r=>[['场次',r.race_no],['参赛马',r.field_size],['负磅',r.carried_weight],['马体重',r.body_weight],['马号',r.horse_number],['枠番',r.bracket],['人气',r.popularity],['赔率／SP',r.data?.sp||r.data?.odds_text||r.odds],['用时',r.time],['胜负距离',r.margin],['上3F',r.last_3f],['通过顺序',r.corners],['步速',r.pace],['天气',r.weather],['奖金',prize(r)],['头马／次名',r.winner_or_runner_up],['级别',r.data?.class||r.race_class],['名次说明',r.finish_note]];
 const details=r=>`<dl class="race-detail-fields">${detail(r).map(([k,v])=>`<div><dt>${h(k)}</dt><dd>${value(v)}</dd></div>`).join('')}</dl>${r.race_url?`<a href="${h(r.race_url)}" target="_blank" rel="noreferrer">原始赛果 ↗</a>`:''}`;
 const mobile=`<div class="race-mobile">${rows.map(r=>`<details class="race-mobile-row"><summary><span class="race-mobile-meta">${value(r.race_date)} · ${value(r.meeting)} · ${value(raceDistanceText(r.distance,r))} <small>${raceJurisdiction(r)}</small></span><strong class="race-mobile-name">${raceLabel(r.race_name)}</strong><span class="race-mobile-finish">${finishBadge(r.finish)}${r.finish?"着":""}</span><span class="race-mobile-sub">${value(r.jockey)} · ${value(r.track_condition)}</span><span class="race-mobile-expand">赛果详情 ⌄</span></summary>${details(r)}</details>`).join('')}</div>`;
 const desktop=`<div class="race-table-wrap race-desktop"><table class="race-table"><thead><tr>${['日期','体系','赛马场','名次','赛事','距离','骑师','人气','用时','奖金','完整赛果'].map(k=>`<th>${k}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr><td>${value(r.race_date)}</td><td>${raceJurisdiction(r)}</td><td>${value(r.meeting)}</td><td>${finishBadge(r.finish)}</td><td>${r.race_url?`<a href="${h(r.race_url)}" target="_blank" rel="noreferrer">${raceLabel(r.race_name)}</a>`:raceLabel(r.race_name)}</td><td>${value(raceDistanceText(r.distance,r))} ${value(r.track_condition)}</td><td>${value(r.jockey)}</td><td>${value(r.popularity)}</td><td>${value(r.time)}</td><td>${value(prize(r))}</td><td><details><summary>展开</summary>${details(r)}</details></td></tr>`).join('')}</tbody></table></div>`;
 return desktop+mobile;
}

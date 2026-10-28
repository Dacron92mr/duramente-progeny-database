import {renderResearch} from './research-references.mjs';
import { escapeHtml as html } from './format.mjs';
export const labels = Object.freeze({career:'生涯战绩',history:'出赛记录',performance:'竞技表现',year:'年度表现',methodology:'统计说明',sources:'资料说明'});
export const concepts = Object.freeze(Object.fromEntries(Object.entries({dosage:'剂量理论｜DP · DI · CD',indices:'奖金指数｜AEI · CPI',awd:'平均胜距｜AWD',bms:'母父｜Broodmare Sire',family:'牝系｜Female Family',cross:'近交｜Cross',nicking:'配合相性｜Nicking'}).map(([key,title])=>[key,{title}])));
export function conceptIntro(key,{heading=true}={}) {const c=concepts[key];return `<div class="concept-intro">${heading?`<h3>${html(c.title)}</h3>`:''}${renderResearch(key)}</div>`; }
export const dosageCategories='<p class="dosage-categories">从速度到耐力：B · Brilliant（速度型） → I · Intermediate（中间型） → C · Classic（经典型） → S · Solid（耐力型） → P · Professional（长途型）。</p>';
export function metricLabel(metric,{incomplete=false}={}){return metric==='graded'?'重赏马比例':metric==='wins'?'每100匹累计胜场':incomplete?'已确认胜马比例':'胜马率';}
export function studyTitle(field,metric,options){const group={broodmare_sire:'母父',bms_line:'母父系',female_family:'牝系',breeder:'生产牧场',dam_age_bucket:'母龄组'}[field]||'群体';return `不同${group}的${metricLabel(metric,options)}`;}
const number=n=>Number(n.toFixed(1)).toString();
export function comparisonText(a,b,{metric='winners',incomplete=false}={}) {
 if(!a||!b||!a.n||!b.n)return '当前资料不足以比较，请调整筛选条件。';
 if(a.key===b.key)return '当前选择了同一组产驹，请选择另一组进行比较。';
 if(!Number.isFinite(a.value)||!Number.isFinite(b.value))return '部分比较资料尚未收录，暂时无法计算差异。';
 const label=metricLabel(metric,{incomplete}),unit=metric==='wins'?'胜':'个百分点';
 const diff=a.value-b.value;
 const main=Math.abs(diff)<0.05?`${a.key}与${b.key}的${label}相同（按显示精度）。`:`${diff>0?a.key:b.key}的${label}高出 ${number(Math.abs(diff))} ${unit}。`;
 return `${main}两组分别收录 ${a.n} 匹与 ${b.n} 匹产驹。${Math.min(a.n,b.n)<5?'其中一组产驹较少，结果仅供参考。':''}`;
}

import { escapeHtml as html } from './format.mjs';
export const labels = Object.freeze({career:'生涯战绩',history:'出赛记录',performance:'竞技表现',year:'年度表现',methodology:'统计说明',sources:'资料说明'});
const jra='https://www.jra.go.jp/kouza/yougo/c10080_list.html';
export const concepts = Object.freeze({
 dosage:{title:'剂量理论｜DP · DI · CD',text:'DP 将前四代血统中特定种牡马祖先的影响，按速度到耐力分为五类。DI（剂量指数）与 CD（重心值）概括这些倾向：数值较高通常偏向速度，较低偏向耐力。它们用于描述血统，不能单独预测赛马能力。',url:'https://en.wikipedia.org/wiki/Dosage_Index',reference:'Wikipedia — Dosage Index'},
 indices:{title:'奖金指数｜AEI · CPI',text:'AEI 比较产驹的平均奖金与同期整体水平，1.00 代表基准水平。CPI 参考这些母马与其他种牡马所生产驹的成绩，帮助理解配种母群的背景。',url:'https://dir.netkeiba.com/keibamatome/detail.html?no=3422',reference:'netkeiba — AEI 与 CPI'},
 awd:{title:'平均胜距｜AWD',text:'AWD 是产驹获胜比赛距离的平均值。数值较短说明胜场更集中在短途，较长则偏向长途。',url:'https://www.twinspires.com/edge/racing/how-to-understand-and-use-average-winning-distance-statistics/',reference:'TwinSpires — Average Winning Distance'},
 bms:{title:'母父｜Broodmare Sire',text:'母父就是母马的父亲。将母父归入父系支系后，可以从更大的母父系群体观察配合表现。',url:'https://www.drf.com/glossary',reference:'Daily Racing Form — Glossary'},
 family:{title:'牝系｜Female Family',text:'牝系沿着母亲、外祖母这一条母系向上追溯。相同编号表示共同的母系源头，字母用于区分分支。',url:jra,reference:'JRA — 竞马用语辞典'},
 cross:{title:'近交｜Cross',text:'Cross 表示同一祖先在血统表中重复出现，例如 3×4 表示出现在第三代与第四代。这里观察五代内的重复祖先与产驹表现。',url:jra,reference:'JRA — 竞马用语辞典'},
 nicking:{title:'配合相性｜Nicking',text:'Nicking 观察种牡马与特定母父或母父系配合时，产驹是否较常取得好成绩。可从胜马与重赏马表现寻找值得继续研究的组合。',url:'https://toba.org/owner-education/',reference:'TOBA — 配种与血统入门'},
});
export function conceptIntro(key,{heading=true}={}) { const c=concepts[key];return `<div class="concept-intro">${heading?`<h3>${c.title}</h3>`:''}<p>${c.text}</p><a class="inline-reference" href="${c.url}" target="_blank" rel="noopener noreferrer">了解更多：${c.reference} ↗</a></div>`; }
export const dosageCategories='<p class="dosage-categories">从速度到耐力：B · Brilliant（速度型） → I · Intermediate（中间型） → C · Classic（经典型） → S · Solid（耐力型） → P · Professional（长途型）。</p>';
export function metricLabel(metric){return metric==='graded'?'重赏马比例':metric==='wins'?'每100匹累计胜场':'已确认胜马比例';}
export function studyTitle(field,metric){const group={broodmare_sire:'母父',bms_line:'母父系',female_family:'牝系',breeder:'生产牧场',dam_age_bucket:'母龄组'}[field]||'群体';return `不同${group}的${metricLabel(metric)}`;}
const number=n=>Number(n.toFixed(1)).toString();
export function comparisonText(a,b,{metric='winners'}={}) {
 if(!a||!b||!a.n||!b.n)return '当前资料不足以比较，请调整筛选条件。';
 if(a.key===b.key)return '当前选择了同一组产驹，请选择另一组进行比较。';
 if(!Number.isFinite(a.value)||!Number.isFinite(b.value))return '部分比较资料尚未收录，暂时无法计算差异。';
 const label=metricLabel(metric),unit=metric==='wins'?'胜':'个百分点';
 const diff=a.value-b.value;
 const main=Math.abs(diff)<0.05?`${a.key}与${b.key}的${label}相同（按显示精度）。`:`${diff>0?a.key:b.key}的${label}高出 ${number(Math.abs(diff))} ${unit}。`;
 return `${main}两组分别收录 ${a.n} 匹与 ${b.n} 匹产驹。${Math.min(a.n,b.n)<5?'其中一组产驹较少，结果仅供参考。':''}`;
}

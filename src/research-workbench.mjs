import { escapeHtml as html, horseDamAgeBucket } from './format.mjs';
export function populationGroups(horses,field,{year='',sex=''}={}) {
  const groups=new Map();
  for(const h of horses){
    if(year&&String(h.birth_year)!==String(year)||sex&&h.sex!==sex)continue;
    const value=field==='dam_age_bucket'?horseDamAgeBucket(h):field==='year'?h.birth_year:h[field];
    if(value==null||value==='')continue;
    const key=String(value);const row=groups.get(key)||{key,n:0,winners:0,graded:0,unknown:0,ids:[]};
    const wins=String(h.career_summary||'').match(/(\d+)勝/);
    row.n++;row.ids.push(String(h.id));row.winners+=wins&&Number(wins[1])>0?1:0;row.unknown+=wins?0:1;row.graded+=['G1','G2','G3'].includes(h.achievement_class)?1:0;
    groups.set(key,row);
  }
  return [...groups.values()].sort((a,b)=>b.n-a.n||a.key.localeCompare(b.key,'ja'));
}
export function completedAgeRows(profile,age,asOfYear){
  return (profile.crop_development||[]).filter(r=>Number(r.age)===age&&Number(r.crop)+age<asOfYear).map(r=>({key:String(r.crop),value:r.cumulative_wins_per_100_foals,wins:r.cumulative_wins}));
}
const config={
 sire:{title:'在相同年龄结束时，哪个世代积累了更多胜场？',fields:[['year','出生世代']],evidence:'补充证据：年度指数、奖金分布、距离与重赏胜利'},
 pedigree:{title:'母父与牝系的表现差异，有多大的样本支持？',fields:[['broodmare_sire','具体母父'],['bms_line','六大母父系'],['female_family','牝系']],evidence:'补充证据：母父系、牝系、Cross 与 Dosage'},
 production:{title:'生产规模与胜马转化，是否指向相同的群体？',fields:[['breeder','生产牧场'],['dam_age_bucket','母龄组']],evidence:'补充证据：牧场、母龄胎次、月份与俱乐部'},
};
export function mountResearchWorkbench(container,{kind,horses,profile,asOf,renderChart,navigate,onEvidence}) {
  const cfg=config[kind];const title=container.querySelector('.analysis-title');
  const evidence=document.createElement('details');evidence.className='research-evidence';evidence.innerHTML=`<summary>${cfg.evidence}</summary>`;
  for(const node of [...container.children])if(node!==title)evidence.append(node);
  const host=document.createElement('section');host.className='research-workbench';host.dataset.workbench=kind;
  title.after(host);container.append(evidence);
  evidence.addEventListener('toggle',()=>{if(evidence.open)requestAnimationFrame(onEvidence);});
  const chartId=`${kind}InvestigationChart`;
  host.innerHTML=`<h2>${cfg.title}</h2><p class="study-scope">${kind==='sire'?'固定截至年龄，只纳入完整经历该年龄年度的世代。每100匹胜场允许大于100，不是胜马率。':'横轴看样本规模，纵轴看已确认胜马或重赏马比例；点选一组，再与另一组对照。'}</p><div class="study-controls"><label>分组<select data-study-field>${cfg.fields.map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></label>${kind==='sire'?'<label>截至年龄<select data-study-age><option value="3">3岁末</option><option value="4">4岁末</option><option value="5">5岁末</option></select></label>':`<label>出生世代<select data-study-year><option value="">全部世代</option>${[...new Set(horses.map(h=>h.birth_year))].sort().map(y=>`<option>${y}</option>`).join('')}</select></label><label>性别<select data-study-sex><option value="">全部</option><option value="牡">牡</option><option value="牝">牝</option><option value="セン">骟</option></select></label><label>指标<select data-study-metric><option value="winners">已确认胜马率</option><option value="graded">重赏马率</option></select></label><label>最少产驹<select data-study-min><option value="5">5</option><option value="1">1</option><option value="10">10</option><option value="20">20</option></select></label>`}</div><p data-study-coverage class="muted"></p><div class="study-evidence"><article class="chart-card"><div class="chart-card-head"><h3>${kind==='sire'?'同龄累计胜场':'规模 × 表现'}</h3><p>${kind==='sire'?'横轴每100匹累计胜场；点击世代选择比较。':'点的大小固定；颜色不是排名。点击一个点选择比较 A；重合的组可用下方选择器逐一查看。'}</p></div><div id="${chartId}" class="chart study-chart"></div></article><section class="study-comparison" aria-label="研究分组比较"><h3>对照并核对产驹</h3><div class="study-pair"><label>比较 A<select data-compare="a"></select></label><label>比较 B<select data-compare="b"></select></label></div><div data-study-result></div></section></div><p class="study-limit">${kind==='sire'?`数据截点 ${html(asOf)}。排除未完整结束的年龄年度；同龄控制不消除赛事环境差异。`:'比例以所选组全部收录产驹为分母；没有可解析生涯战绩的记录单独计数，不推断已获胜。可用同一出生世代缩小观察年限差异。分组非随机，结果仅用于探索。'}</p><p class="study-source">来源：${kind==='sire'?'sire_profile.crop_development 原有累计胜场及每100匹指标':'horses.json 原始生涯战绩与最高成就分类'}；原口径与更多证据见下方。点击“打开产驹”保留本次分组、世代与性别条件。</p>`;
  let rows=[],field=cfg.fields[0][0],year='',sex='',metric='winners',ageRows=[];
  const query=selector=>host.querySelector(selector);
  function filters(key){return {[field]:key,...(year?{year}:{}),...(sex?{sex}:{})};}
  function value(row){return kind==='sire'?ageRows.find(r=>r.key===row.key)?.value:100*row[metric]/row.n;}
  function comparison(){
    const a=rows.find(r=>r.key===query('[data-compare="a"]').value),b=rows.find(r=>r.key===query('[data-compare="b"]').value);
    if(!a||!b){query('[data-study-result]').innerHTML='<p>当前条件无可比较的群体。降低最少样本量或修改筛选。</p>';return;}
    query('[data-study-result]').innerHTML=`<div class="comparison-values">${[a,b].map((r,i)=>`<section><h4>${i?'B':'A'} · ${html(r.key)}</h4><strong>${value(r)==null?'—':value(r).toFixed(1)}${kind==='sire'?' 胜/100匹':'%'}</strong><p>${kind==='sire'?`${ageRows.find(a=>a.key===r.key)?.wins} 累计胜场 / ${r.n} 产驹`:`${r[metric]} / ${r.n} 产驹 · 战绩未解析 ${r.unknown} 匹`}</p><button type="button" data-open-population="${html(r.key)}">打开 ${r.n} 匹产驹 ↗</button></section>`).join('')}</div><p class="comparison-difference">A − B：${(value(a)-value(b)).toFixed(1)} ${kind==='sire'?'胜/100匹':'个百分点'}。${a.key===b.key?'当前为同一群体。':'差值不是因果效应。'}</p>`;
    host.querySelectorAll('[data-open-population]').forEach(b=>b.onclick=()=>navigate(filters(b.dataset.openPopulation)));
  }
  function update(){
    field=query('[data-study-field]').value;year=query('[data-study-year]')?.value||'';sex=query('[data-study-sex]')?.value||'';metric=query('[data-study-metric]')?.value||'winners';
    const all=populationGroups(horses,field,{year,sex});
    if(kind==='sire'){ageRows=completedAgeRows(profile,Number(query('[data-study-age]').value),Number(String(asOf).slice(0,4)));rows=all.filter(r=>ageRows.some(a=>a.key===r.key)).sort((a,b)=>a.key.localeCompare(b.key));}
    else rows=all.filter(r=>r.n>=Number(query('[data-study-min]').value));
    query('[data-study-coverage]').textContent=`显示 ${rows.length} / ${all.length} 组，合计 ${rows.reduce((n,r)=>n+r.n,0)} 匹产驹${kind==='sire'?'；未完整经历所选年龄的世代不显示':'；低于最少样本量的组未显示'}。`;
    for(const [i,select] of [...host.querySelectorAll('[data-compare]')].entries()){const prev=select.value;select.innerHTML=rows.map(r=>`<option value="${html(r.key)}">${html(r.key)} · n=${r.n}</option>`).join('');select.value=rows.some(r=>r.key===prev)?prev:rows[Math.min(i,rows.length-1)]?.key||'';select.onchange=comparison;}
    if(rows.length>1 && query('[data-compare="a"]').value===query('[data-compare="b"]').value) query('[data-compare="b"]').value=rows.find(r=>r.key!==query('[data-compare="a"]').value).key;
    comparison();
    const chart=renderChart(chartId,kind==='sire'?{research:true,grid:{left:10,right:20,top:45,bottom:40,containLabel:true},tooltip:{trigger:'item',formatter:p=>`${html(p.data.key)} · ${p.value} 胜/100匹`},xAxis:{type:'value',name:'每100匹累计胜场',nameLocation:'middle',nameGap:26},yAxis:{type:'category',data:rows.map(r=>r.key)},series:[{type:'bar',barMaxWidth:22,data:rows.map(r=>({key:r.key,value:value(r),itemStyle:{color:window.DuramenteColors.crops[r.key]},label:{show:true,position:'right'}}))}]}:{research:true,grid:{left:12,right:20,top:40,bottom:42,containLabel:true},tooltip:{trigger:'item',formatter:p=>`${html(p.data.key)}<br>${p.data.n} 匹产驹 · ${p.data.count} 匹${metric==='winners'?'已确认胜马':'重赏马'}<br>${p.value[1].toFixed(1)}%`},xAxis:{type:'value',name:'产驹数 n',min:0,nameLocation:'middle',nameGap:28},yAxis:{type:'value',min:0,max:100,name:'比例 %'},series:[{type:'scatter',symbolSize:14,data:rows.map(r=>({key:r.key,n:r.n,count:r[metric],value:[r.n,value(r)],itemStyle:{color:field==='bms_line'?window.DuramenteColors.bms[r.key]:window.DuramenteColors.ui.primary,borderWidth:1,borderColor:'#777'}}))}]});
    chart?.on('click',p=>{if(p.data?.key){query('[data-compare="a"]').value=p.data.key;comparison();}});
  }
  host.querySelectorAll('.study-controls select').forEach(s=>s.onchange=update);update();
}

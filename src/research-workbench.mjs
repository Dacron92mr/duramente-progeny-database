import { conceptIntro, studyTitle, metricLabel, comparisonText } from './ux-copy.mjs';
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
/** Selection overlays preserve the original coordinates, including coincident A/B. */
export function selectionSeries(rows,a,b,metric,palette) {
  return [a,b].map((key,index)=>{
    const row=rows.find(r=>r.key===key),letter=index?'B':'A',color=index?palette.b:palette.a;
    return {id:`selection-${letter.toLowerCase()}`,name:letter,type:'scatter',z:10+index,symbol:'circle',symbolSize:index?32:22,
      data:row?[{key:row.key,n:row.n,count:row[metric],value:[row.n,100*row[metric]/row.n],
        itemStyle:{color:index?'transparent':color,borderColor:index?color:'#fff',borderWidth:index?3:2,opacity:1},
        label:{show:true,formatter:letter,position:index?'bottom':'top',distance:5,color:'#fff',backgroundColor:color,padding:[3,6],borderRadius:4,fontWeight:700}}]:[]};
  });
}
const config={
 sire:{title:'在相同年龄结束时，哪个世代积累了更多胜场？',fields:[['year','出生世代']],evidence:'补充证据：年度指数、奖金分布、距离与重赏胜利'},
 pedigree:{title:'比较母父与牝系的产驹表现',fields:[['broodmare_sire','具体母父'],['bms_line','六大母父系'],['female_family','牝系']],evidence:'补充证据：母父系、牝系、Cross 与 Dosage'},
 production:{title:'比较不同牧场与母龄的产驹表现',fields:[['breeder','生产牧场'],['dam_age_bucket','母龄组']],evidence:'补充证据：牧场、母龄胎次、月份与俱乐部'},
};
export function mountResearchWorkbench(container,{kind,horses,profile,asOf,renderChart,navigate,onEvidence}) {
  const cfg=config[kind];const title=container.querySelector('.analysis-title');
  const evidence=document.createElement('details');evidence.className='research-evidence';evidence.innerHTML=`<summary>${cfg.evidence}</summary>`;
  for(const node of [...container.children])if(node!==title)evidence.append(node);
  const host=document.createElement('section');host.className='research-workbench';host.dataset.workbench=kind;
  title.after(host);container.append(evidence);
  evidence.addEventListener('toggle',()=>{if(evidence.open)requestAnimationFrame(onEvidence);});
  const chartId=`${kind}InvestigationChart`;
  const palette=window.DuramenteColors.comparison;
  host.style.setProperty('--compare-a',palette.a);host.style.setProperty('--compare-b',palette.b);
  host.innerHTML=`<h2>${cfg.title}</h2><p class="study-scope">${kind==='sire'?'比较各世代在相同年龄末的累计胜场；每匹马可以贡献多场胜利。':'选择分组与指标，查看产驹表现，再比较感兴趣的两组。'}</p>${kind==='pedigree'?'<div data-study-concept></div>':''}<div class="study-controls"><label>分组<select data-study-field>${cfg.fields.map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></label>${kind==='sire'?'<label>截至年龄<select data-study-age><option value="3">3岁末</option><option value="4">4岁末</option><option value="5">5岁末</option></select></label>':`<label>出生世代<select data-study-year><option value="">全部世代</option>${[...new Set(horses.map(h=>h.birth_year))].sort().map(y=>`<option>${y}</option>`).join('')}</select></label><label>性别<select data-study-sex><option value="">全部</option><option value="牡">牡</option><option value="牝">牝</option><option value="セン">骟</option></select></label><label>指标<select data-study-metric><option value="winners">胜马率</option><option value="graded">重赏马比例</option></select></label><label>最少产驹<select data-study-min><option value="5">5</option><option value="1">1</option><option value="10">10</option><option value="20">20</option></select></label>`}</div><p data-study-coverage class="muted"></p><div class="study-evidence"><article class="chart-card"><div class="chart-card-head"><h3 data-study-title></h3><p data-study-reading>${kind==='sire'?'横轴每100匹累计胜场；点击世代选择比较。':'每个圆点代表一组产驹。点击圆点，查看或比较对应产驹。'}</p></div><div class="study-selection" data-selection-key aria-live="polite"></div><div id="${chartId}" class="chart study-chart"></div></article><section class="study-comparison" aria-label="研究分组比较"><h3>比较两组产驹</h3><div class="study-pair"><label>比较 A<select data-compare="a"></select></label><label>比较 B<select data-compare="b"></select></label></div><div data-study-result></div></section></div><p data-study-missing class="study-limit" hidden></p><details class="study-method"><summary>统计说明</summary><p>${kind==='sire'?`截至 ${html(asOf)}，只比较完整经历所选年龄年度的世代。累计胜场除以该世代全部产驹数，再换算为每100匹；一匹马可多次获胜。`:'胜马率：生涯至少一胜的马匹，占所选组全部收录产驹的比例。资料不完整时标为「已确认胜马比例」。尚未收录战绩的马匹保留在分母中，因此不能把它们视为未胜马。重赏马比例：最高成就为 G1、G2 或 G3 的独立马匹，占该组全部产驹的比例。'}</p><p>各组的年龄、参赛机会与配种背景可能不同；比较用于观察差异，不代表单一因素的影响。查看产驹会保留当前分组、世代与性别条件。</p></details>`;
  if(kind==='pedigree'){
    const shortcuts=document.createElement('nav');shortcuts.className='study-topics';shortcuts.setAttribute('aria-label','血统专题');
    shortcuts.innerHTML='<span>继续探索</span>'+[['bms','母父系'],['family','牝系'],['inbreeding','近交与配合相性'],['dosage','DP · DI · CD']].map(([key,label])=>`<button type="button" data-topic="${key}">${label} ↓</button>`).join('');
    host.append(shortcuts);shortcuts.querySelectorAll('button').forEach(button=>button.onclick=()=>{evidence.open=true;const tab=evidence.querySelector(`[data-pedigree-section="${button.dataset.topic}"]`);tab.click();requestAnimationFrame(()=>evidence.querySelector(`#pedigree-${button.dataset.topic}`).scrollIntoView({block:'start'}));});
  }
  let rows=[],field=cfg.fields[0][0],year='',sex='',metric='winners',ageRows=[],incomplete=false,chart=null;
  const query=selector=>host.querySelector(selector);
  function filters(key){return {[field]:key,...(year?{year}:{}),...(sex?{sex}:{})};}
  function value(row){return kind==='sire'?ageRows.find(r=>r.key===row.key)?.value:100*row[metric]/row.n;}
  function syncScatterSelection(){
    if(kind==='sire'||!chart||chart.isDisposed())return;
    chart.setOption({series:selectionSeries(rows,query('[data-compare="a"]').value,query('[data-compare="b"]').value,metric,palette)});
  }
  function comparison(){
    const a=rows.find(r=>r.key===query('[data-compare="a"]').value),b=rows.find(r=>r.key===query('[data-compare="b"]').value);
    if(!a||!b){query('[data-selection-key]').innerHTML='';syncScatterSelection();query('[data-study-result]').innerHTML='<p>当前条件下没有可比较的产驹，请调整筛选。</p>';return;}
    query('[data-selection-key]').innerHTML=kind==='sire'?'':[a,b].map((r,i)=>`<span class="selection-key selection-${i?'b':'a'}"><b>${i?'B':'A'}</b> · ${html(r.key)}</span>`).join('');
    query('[data-study-result]').innerHTML=`<div class="comparison-values">${[a,b].map((r,i)=>`<section class="comparison-${i?'b':'a'}"><h4><span class="compare-token">${i?'B':'A'}</span> · ${html(r.key)}</h4><strong>${value(r)==null?'—':value(r).toFixed(1)}${kind==='sire'?' 胜/100匹':'%'}</strong><p>${kind==='sire'?`${ageRows.find(a=>a.key===r.key)?.wins} 累计胜场 / ${r.n} 产驹`:`${r[metric]} 匹${metric==='winners'?(incomplete?'已确认胜马':'胜马'):'重赏马'} / ${r.n} 匹产驹`}</p><button type="button" data-open-population="${html(r.key)}">查看 ${r.n} 匹产驹 ↗</button></section>`).join('')}</div><p class="comparison-difference">${html(comparisonText({...a,value:value(a)},{...b,value:value(b)},{metric:kind==='sire'?'wins':metric,incomplete:!!(a.unknown||b.unknown)}))}</p>`;
    syncScatterSelection();
    host.querySelectorAll('[data-open-population]').forEach(b=>b.onclick=()=>navigate(filters(b.dataset.openPopulation)));
  }
  function update(){
    field=query('[data-study-field]').value;year=query('[data-study-year]')?.value||'';sex=query('[data-study-sex]')?.value||'';metric=query('[data-study-metric]')?.value||'winners';
    const all=populationGroups(horses,field,{year,sex});
    if(kind==='sire'){ageRows=completedAgeRows(profile,Number(query('[data-study-age]').value),Number(String(asOf).slice(0,4)));rows=all.filter(r=>ageRows.some(a=>a.key===r.key)).sort((a,b)=>a.key.localeCompare(b.key));}
    else rows=all.filter(r=>r.n>=Number(query('[data-study-min]').value));
    incomplete=rows.some(row=>row.unknown>0);
    const winnerOption=query('[data-study-metric] option[value="winners"]');if(winnerOption)winnerOption.textContent=metricLabel('winners',{incomplete});
    query('[data-study-title]').textContent=kind==='sire'?`各世代截至${query('[data-study-age]').value}岁末的累计胜场`:studyTitle(field,metric,{incomplete});
    query('[data-study-reading]').textContent=kind==='sire'?'点击世代，查看或比较对应产驹。':`每个圆点代表一组产驹。越往右，产驹越多；越往上，${metricLabel(metric,{incomplete})}越高。点击圆点或使用下方选单进行比较。`;
    const concept=query('[data-study-concept]');if(concept)concept.innerHTML=conceptIntro(field==='female_family'?'family':'bms');
    const missing=rows.reduce((n,r)=>n+r.unknown,0),notice=query('[data-study-missing]');notice.hidden=kind==='sire'||metric!=='winners'||!missing;notice.textContent=missing?`部分马匹赛绩尚未收录（${missing} 匹）；已确认胜马比例可能低于实际胜马比例。`:'';
    query('[data-study-coverage]').textContent=`显示 ${rows.length} 组，共 ${rows.reduce((n,r)=>n+r.n,0)} 匹产驹${kind==='sire'?'；未完整经历所选年龄的世代不显示':'；低于最少样本量的组未显示'}。`;
    for(const [i,select] of [...host.querySelectorAll('[data-compare]')].entries()){const prev=select.value;select.innerHTML=rows.map(r=>`<option value="${html(r.key)}">${html(r.key)} · ${r.n} 匹</option>`).join('');select.value=rows.some(r=>r.key===prev)?prev:rows[Math.min(i,rows.length-1)]?.key||'';select.onchange=comparison;}
    if(rows.length>1 && query('[data-compare="a"]').value===query('[data-compare="b"]').value) query('[data-compare="b"]').value=rows.find(r=>r.key!==query('[data-compare="a"]').value).key;
    chart=null;comparison();
    chart=renderChart(chartId,kind==='sire'?{research:true,grid:{left:10,right:20,top:45,bottom:40,containLabel:true},tooltip:{trigger:'item',formatter:p=>`${html(p.data.key)} · ${p.value} 胜/100匹`},xAxis:{type:'value',name:'每100匹累计胜场',nameLocation:'middle',nameGap:26},yAxis:{type:'category',data:rows.map(r=>r.key)},series:[{type:'bar',barMaxWidth:22,data:rows.map(r=>({key:r.key,value:value(r),itemStyle:{color:window.DuramenteColors.crops[r.key]},label:{show:true,position:'right'}}))}]}:{research:true,grid:{left:12,right:20,top:40,bottom:42,containLabel:true},tooltip:{trigger:'item',formatter:p=>`${html(p.data.key)}<br>${p.data.n} 匹产驹 · ${p.data.count} 匹${metric==='winners'?(incomplete?'已确认胜马':'胜马'):'重赏马'}<br>${p.value[1].toFixed(1)}%`},xAxis:{type:'value',name:'产驹数（匹）',min:0,nameLocation:'middle',nameGap:28},yAxis:{type:'value',min:0,max:100,name:`${metricLabel(metric,{incomplete})}（%）`,nameTextStyle:{align:'left'}},series:[{id:'groups',type:'scatter',symbolSize:12,data:rows.map(r=>({key:r.key,n:r.n,count:r[metric],value:[r.n,value(r)],itemStyle:{color:field==='bms_line'?window.DuramenteColors.bms[r.key]:palette.neutral,opacity:field==='bms_line'?.85:.55,borderWidth:1,borderColor:'#777'}}))}]});
    syncScatterSelection();
    chart?.on('click',p=>{if(p.data?.key){query('[data-compare="a"]').value=p.data.key;comparison();}});
  }
  host.querySelectorAll('.study-controls select').forEach(s=>s.onchange=update);update();
}

/* Every chart gets a layout chosen for its comparison; original records stay attached. */
(function(root) {
  'use strict';
  const dots=new Set(['sireSameAgeChart','sireCropIndexChart','bmsLineRelativeChart','bmsSireContributionChart','bmsCategoryScaleChart','bmsLineScaleChart','femaleFamilyOverallChart','crossAncestorCountChart','crossAncestorPerformanceChart','breederMainChart','dosageProfileChart','sireLeadingAnnualTop10Chart','sireLeadingJuvenileTop10Chart','firstSeasonSireChart']);
  const comparisons=new Set(['bmsSexPerformanceChart','femaleFamilySexChart','breederGradedChart','racecourseSurfaceChart','damAgeWinRateChart','damAgeGradedRateChart','damAgePerformanceChart','coverMonthChart','foalMonthChart','sireAwdDumbbellChart']);
  const split=new Set(['sireCropWinnersChart','sireCropGradedChart','annualPerformance-starts','damFoalOrderChart','racecourseDistanceChart']);
  const compositions=new Set(['sireConcentrationChart','bmsCropShareChart','clubSexShareChart','breederCropChart','bmsStageChart','femaleFamilyStageChart']);
  const scalar=d=>d && typeof d==='object' && !Array.isArray(d) ? d.value : d;
  const record=d=>d && typeof d==='object' && !Array.isArray(d) ? d : {value:d};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number=v=>v==null?'—':Number(v).toLocaleString('zh-CN',{maximumFractionDigits:1});
  const list=v=>Array.isArray(v)?v:v?[v]:[];
  const original=p=>({...p,value:p.data&&Object.hasOwn(p.data,'originalValue')?p.data.originalValue:p.value,data:{...p.data,value:p.data&&Object.hasOwn(p.data,'originalValue')?p.data.originalValue:p.value},axisValue:p.data?.category??p.axisValue,name:p.data?.category??p.name});
  function kind(id,o) {
    if(o.research)return 'pilot';
    if(id==='nickingSireChart')return 'profile';
    if(split.has(id))return 'panels';
    if(compositions.has(id))return 'composition';
    if(comparisons.has(id)||id.startsWith('clubWinCompare-'))return 'comparison';
    if(dots.has(id))return 'dot';
    if(o.series?.some(s=>s.type==='sankey'))return 'flow';
    if(o.geo)return 'map';
    if(o.series?.some(s=>s.type==='heatmap'))return 'matrix';
    if(o.series?.some(s=>s.stack))return 'stacked';
    if(o.series?.some(s=>s.type==='line'))return 'trend';
    if(o.series?.some(s=>s.type==='scatter'))return 'scatter';
    return 'distribution';
  }
  function sample(d,name,id) {
    if(d.total!=null)return [d.hits??d.winners,d.total];
    const r=d.raw;if(!r)return null;
    if(id==='racecourseSurfaceChart'){const s=r.surface?.[name.includes('芝')?'芝':'ダ'];return s?[s.wins,s.starts]:null;}
    const n=r.foals;
    if(n==null)return null;
    const graded=id==='damAgeGradedRateChart'||name.includes('重赏')||(r.graded_winners!=null&&Math.abs(Number(d.value)-r.graded_winners/n*100)<.11&&Math.abs(Number(d.value)-r.winners/n*100)>.11);
    const k=graded?(r.graded_winners??r.graded):r.winners;
    return k==null?null:[k,n];
  }
  function segment(color,offset=0) {
    return (_,api)=>{const a=api.coord([api.value(0),api.value(2)]),b=api.coord([api.value(1),api.value(2)]);return {type:'line',shape:{x1:a[0],y1:a[1]+offset,x2:b[0],y2:b[1]+offset},style:{stroke:color,lineWidth:2,opacity:.38}};};
  }
  function prepare(id,input,ctx) {
    const type=kind(id,input), small=ctx.width<500, theme=ctx.theme;
    const option={...input};let height=360,note='';
    if(type==='pilot')return {option,height:null,type,note};
    const colors=input.color||ctx.colors;
    const series=(input.series||[]).map(s=>({...s,itemStyle:{...s.itemStyle},label:['bar','line'].includes(s.type)?{...s.label,show:false}:s.label,labelLayout:{hideOverlap:true}}));
    option.series=series;
    option.color=colors;
    option.animationDuration=220;
    option.textStyle={fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',fontSize:12,color:theme.text};
    option.legend=input.legend?{...input.legend,top:0,left:0,right:0,type:'scroll',itemWidth:12,itemHeight:8,itemGap:16,textStyle:{color:theme.text,fontSize:11}}:undefined;
    option.tooltip={confine:true,...input.tooltip};
    const axes=v=>list(v).map(a=>({...a,...(a.type==='value'&&/匹|次数|胜场|产驹数|母马数|排名/.test(a.name||'')?{minInterval:1}:{}),axisLine:{show:false},axisTick:{show:false},splitLine:{show:a.type==='value',lineStyle:{color:theme.line,type:'dashed',opacity:.55}},axisLabel:{...a.axisLabel,color:theme.muted,fontSize:11,hideOverlap:true},nameTextStyle:{color:theme.muted,fontSize:11,fontWeight:400},nameGap:a.nameLocation==='middle'?(a.nameGap||40):(a.type==='category'?32:18),...(a.type==='category'?{nameLocation:'middle'}:{})}));
    option.xAxis=axes(input.xAxis);option.yAxis=axes(input.yAxis);
    let xa=option.xAxis[0],ya=option.yAxis[0];
    const horizontal=ya?.type==='category';
    option.grid={left:8,right:22,top:56,bottom:input.dataZoom?76:56,containLabel:true};
    for(const s of series){
      s.animationDuration=220;
      if(s.type==='line'){s.smooth=false;s.symbolSize=6;s.showSymbol=true;s.lineStyle={...s.lineStyle,width:2};s.connectNulls=false;s.endLabel={show:false};}
      if(s.type==='bar'){s.barMaxWidth=20;s.itemStyle.borderRadius=0;s.barCategoryGap='40%';}
    }
    if(type==='dot'||type==='comparison') {
      const categories=(horizontal?ya:xa)?.data||[];
      const valAxis=horizontal?xa:ya;
      const rate=/%|率|比例/.test(valAxis?.name||'')||valAxis?.max===100;
      option.xAxis=[{...valAxis,type:'value',min:rate?0:valAxis?.min,max:rate?100:valAxis?.max,...(rate?{interval:small?25:20}:{}),nameLocation:'middle',nameGap:30,axisLabel:{...valAxis?.axisLabel,formatter:rate?'{value}%':v=>number(v),fontSize:11,color:theme.muted},splitNumber:small?3:5}];
      option.yAxis=[{type:'category',data:categories,inverse:true,axisLine:{show:false},axisTick:{show:false},axisLabel:{color:theme.muted,fontSize:11,interval:0,width:small?94:Math.min(175,ctx.width*.29),overflow:'truncate',margin:12}}];
      option.grid={left:8,right:rate?22:58,top:56,bottom:48,containLabel:true};
      height=Math.max(360,categories.length*42+112);
      const extra=[];
      option.series=series.map((s,j)=>{
        const offset=type==='comparison'?(j-(series.length-1)/2)*8:0;
        const color=s.itemStyle?.color && typeof s.itemStyle.color==='string'?s.itemStyle.color:colors[j%colors.length];
        const intervals=[];
        const data=(s.data||[]).map((datum,i)=>{
          const d=record(datum),value=scalar(datum),counts=rate?sample(d,(s.name||'')+' '+(valAxis?.name||''),id):null;
          const valid=counts ? counts[1]>0 : value!=null;
          if(valid&&counts&&counts[0]!=null){const ci=ctx.wilson(...counts);if(ci)intervals.push([...ci,i]);}
          const style={...d.itemStyle};
          if(style.color && typeof style.color==='object')style.color=style.color.colorStops?.at(-1)?.color||color;
          return {...d,name:String(categories[i]),category:categories[i],originalValue:valid?value:null,counts,value:[valid?value:null,i],itemStyle:style};
        });
        if(intervals.length)extra.push({type:'custom',silent:true,renderItem:segment(type==='dot'?theme.muted:color,offset),encode:{x:[0,1],y:2},data:intervals});
        return {...s,type:'scatter',symbol:['circle','diamond','rect','triangle'][j%4],symbolSize:9,symbolOffset:[0,offset],itemStyle:{...s.itemStyle,color:typeof s.itemStyle?.color==='object'?color:s.itemStyle?.color||color,opacity:.95},encode:{x:0,y:1},data,
          markPoint:undefined,label:{show:type==='dot'&&!rate,position:'right',distance:8,color:theme.text,fontSize:11,formatter:p=>number(p.data.originalValue)},markLine:s.markLine?{...s.markLine,data:s.markLine.data?.map(m=>!horizontal&&m.yAxis!=null?{...m,xAxis:m.yAxis,yAxis:undefined}:m)}:undefined};
      }).concat(extra);
      option.tooltip={trigger:'item',confine:true,formatter:p=>{
        if(!p.data||p.seriesType==='custom')return '';
        const d=p.data,pp=original(p);
        let text=input.tooltip?.formatter?input.tooltip.formatter(input.tooltip.trigger==='axis'?[pp]:pp):`${esc(d.category)}<br>${esc(p.seriesName)}：${number(d.originalValue)}${rate?'%':''}`;
        if(d.originalValue==null)return `${esc(d.category)} · ${esc(p.seriesName)}<br>无有效样本`;
        if(d.counts){const ci=ctx.wilson(...d.counts);text+=`<br>样本 ${d.counts[0]}/${d.counts[1]}${ci?` · 95% Wilson区间 ${ci.map(number).join('–')}%`:''}`;}
        return text;
      }};
      note=rate?'点为实际比例；有分子分母时细线为95% Wilson区间。无样本留空，比例统一为0–100%。':type==='comparison'?'同一行比较同一对象；用点的位置读取差异，点选查看数值。':'按位置比较数值；点选查看原始数据与样本信息。';
      if(id==='sireAwdDumbbellChart')note='每行一个世代，比较整体、草地与泥地的平均胜距；横轴为米。';
    } else if(type==='panels') {
      let groups=option.yAxis.map((axis,i)=>({axis,index:i,series:series.filter(s=>(s.yAxisIndex||0)===i)}));
      if(id==='annualPerformance-starts')groups=series.map((s,i)=>({axis:{type:'value',name:s.name+(i?'（匹）':'（次）')},index:i,series:[s]}));
      groups=groups.filter(g=>g.series.length);
      const count=groups.length; height=count*195+55;
      option.grid=[];option.xAxis=[];option.yAxis=[];option.series=[];
      groups.forEach((g,i)=>{
        const top=52+i*195;
        option.grid.push({left:48,right:18,top,height:124,containLabel:false});
        option.xAxis.push({...xa,gridIndex:i,axisLabel:{...xa?.axisLabel,rotate:0,fontSize:10,hideOverlap:true,...(id==='racecourseDistanceChart'?{interval:0,formatter:v=>String(v).replace('-', '\n–').replace('以下','\n以下').replace('以上','\n以上')}:{} )},axisLine:{show:false},axisTick:{show:false},name:'',boundaryGap:true});
        const rate=/%|率/.test(g.axis.name||'')||g.series.some(s=>/率/.test(s.name||''));
        option.yAxis.push({...g.axis,gridIndex:i,position:'left',min:0,...(rate?{max:100,interval:25}:{}),name:g.axis.name||g.series.map(s=>s.name).join(' / '),nameGap:13,splitNumber:3,nameTextStyle:{color:theme.muted,fontSize:11},axisLabel:{color:theme.muted,fontSize:10,formatter:rate?'{value}%':v=>number(v)},splitLine:{lineStyle:{color:theme.line,type:'dashed',opacity:.55}}});
        g.series.forEach(s=>option.series.push({...s,xAxisIndex:i,yAxisIndex:i,type:rate?'scatter':s.type,symbolSize:8,encode:rate?{x:0,y:1}:undefined,
          data:rate?(s.data||[]).map((datum,k)=>{const d=record(datum),v=id==='racecourseDistanceChart'&&s.name==='前三率'&&!scalar(input.series[0].data[k])?null:scalar(datum);return {...d,name:String(xa.data[k]),category:xa.data[k],originalValue:v,value:[String(xa.data[k]),v]};}):s.data,label:{show:false}}));
      });
      option.legend=groups.some(g=>g.series.length>1)?{top:0,left:0,type:'scroll',textStyle:{color:theme.text,fontSize:11}}:undefined;
      option.axisPointer={link:[{xAxisIndex:'all'}]};
      if(input.tooltip?.formatter)option.tooltip={...option.tooltip,formatter:ps=>input.tooltip.formatter(ps.map(original))};
      note='上下共用分类顺序，各自使用独立标尺；数量与比例分开阅读，避免双轴造成误判。';
    } else if(type==='composition') {
      const categories=(horizontal?ya:xa)?.data||[];
      const normalize=id==='breederCropChart'||id.endsWith('StageChart');
      option.xAxis=[{type:'value',min:0,max:100,axisLabel:{formatter:'{value}%',color:theme.muted},splitLine:{show:false}}];
      option.yAxis=[{type:'category',inverse:true,data:categories,axisLine:{show:false},axisTick:{show:false},axisLabel:{fontSize:11,color:theme.muted,width:small?95:170,overflow:'truncate'}}];
      height=Math.max(330,categories.length*39+110);
      option.series=series.map((s,j)=>({...s,barMaxWidth:22,data:(s.data||[]).map((datum,i)=>{
        const d=record(datum),value=scalar(datum),total=series.reduce((n,ss)=>n+Number(scalar(ss.data[i])||0),0);
        return {...d,name:String(categories[i]),category:categories[i],originalValue:value,value:normalize?(total?value/total*100:0):(d.count!=null&&d.raw?.total?d.count/d.raw.total*100:value)};
      }),label:{show:false}}));
      option.tooltip={trigger:'axis',confine:true,axisPointer:{type:'shadow'},formatter:ps=>`${esc(ps[0]?.axisValue)}<br>`+ps.map(p=>`${p.marker}${esc(p.seriesName)}：${number(p.value)}%${normalize?`（${number(p.data.originalValue)}匹）`:''}`).join('<br>')};
      note=normalize?'每行合计100%，比较组成而非规模；点选查看比例与实际匹数。':'每行合计100%；相同位置与色彩对应同一类别，便于横向比较。';
      if(id==='sireConcentrationChart'){option.tooltip=input.tooltip;note='每行合计100%；区分最高1匹、第2–3匹与其余产驹的奖金贡献。';}
    } else if(type==='profile') {
      const rows=(series[0]?.data||[]).map(d=>d.raw);
      const metrics=[['胜马率','winner_foal_rate','%'],['重赏马率','graded_foal_rate','%'],['每匹奖金','avg_earnings_per_foal','万日元']];
      const all=ctx.baseline||{};
      option.xAxis=[{type:'category',data:metrics.map(m=>m[0]),position:'top',axisLine:{show:false},axisTick:{show:false},axisLabel:{fontSize:11,color:theme.muted}}];
      option.yAxis=[{type:'category',inverse:true,data:rows.map(r=>r.label),axisLabel:{fontSize:11,color:theme.muted,width:small?95:170,overflow:'truncate'},axisLine:{show:false},axisTick:{show:false}}];
      option.grid={left:8,right:10,top:32,bottom:62,containLabel:true};
      option.legend=undefined;
      option.visualMap={min:0,max:3,dimension:2,orient:'horizontal',left:'center',bottom:0,itemWidth:10,itemHeight:120,text:['≥3倍全库','0倍'],inRange:{color:ctx.sequential||['#f5f5f7','#d8a0a6','#a51d30']}};
      const data=rows.flatMap((r,y)=>metrics.map((m,x)=>({value:[x,y,all[m[1]]?r[m[1]]/all[m[1]]:null],raw:r,name:r.label,metric:m,label:{color:all[m[1]]&&r[m[1]]/all[m[1]]>1.8?'#fff':'#202024'}})));
      option.series=[{type:'heatmap',data,itemStyle:{borderColor:theme.surface,borderWidth:3},label:{show:true,fontSize:11,formatter:p=>p.value[2]==null?'—':`${number(p.value[2])}×`}}];
      option.tooltip={trigger:'item',confine:true,formatter:p=>`${esc(p.data.raw.label)} · ${p.data.raw.foals}匹<br>${p.data.metric[0]}：${number(p.data.raw[p.data.metric[1]]*(p.data.metric[2]==='%'?100:1))}${p.data.metric[2]}<br>相对全库 ${p.value[2]==null?'无基线':number(p.value[2])+'倍'}`};
      height=Math.max(420,rows.length*34+100);
      note='按样本量选取并排序，分别比较三项原始指标相对全库的倍数；不再合成为主观加权分数。颜色上限3倍，点选查看真实值。';
    } else {
      if(horizontal&&ya){ya.axisLabel={...ya.axisLabel,width:small?96:Math.min(170,ctx.width*.3),overflow:'truncate',interval:0};height=Math.max(360,(ya.data?.length||0)*34+100);}
      if(type==='trend')note='沿时间或年龄读取变化；缺失值保留断点，未结束年度以原始说明为准。';
      if(type==='stacked')note='柱高表示总量，分段表示来源；同一分类使用固定色彩，点选查看明细。';
      if(type==='distribution')note='按有序区间读取分布；柱从零开始，点选查看精确数量。';
      if(type==='scatter'){height=430;option.series=series.map(s=>({...s,itemStyle:{...s.itemStyle,opacity:.48,borderWidth:.5},data:(s.data||[]).map(d=>({...d,symbolSize:Math.max(5,Math.min(18,Math.sqrt(d.raw?.dosage_points||1)*2))}))}));option.grid={left:40,right:28,top:input.legend?60:24,bottom:58,containLabel:true};note='每点一匹；点选查看详情。坐标与点大小各自对应标题说明中的指标。';}
      if(type==='flow'){option.series=series.map(s=>({...s,label:input.series.find(x=>x.type==='sankey')?.label||s.label}));height=null;delete option.xAxis;delete option.yAxis;delete option.grid;note='连线宽度表示匹数；类别使用固定颜色，可横向滑动查看完整关系。';}
      if(type==='map'){height=null;delete option.xAxis;delete option.yAxis;delete option.grid;}
      if(type==='matrix'){height=420;option.visualMap={...input.visualMap,inRange:{color:ctx.sequential||['#f5f5f7','#d8a0a6','#a51d30']}};}
      if(id==='damAgeHistogramChart')series.forEach(s=>{s.barCategoryGap='8%';s.barMaxWidth=40;});
      if(id==='annualPerformance-earnings'){option.series=series.map(s=>({...s,type:'line',symbolSize:7,lineStyle:{width:2},areaStyle:{opacity:.06},connectNulls:false}));note='年度奖金走势；未完整数据保留原有状态标注，点选查看金额。';}
      if(id==='sireStudFeeChart')option.series=series.map(s=>({...s,type:'line',step:'end',symbolSize:7,lineStyle:{width:2},areaStyle:undefined}));
      if(id==='sireDistanceDistributionChart'){height=400;option.grid.bottom=76;}
    }
    return {option:{...option,research:true},height,note:series.length?note:'',type};
  }
  const api={prepare,kind,sample};root.DuramenteDesign=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

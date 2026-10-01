/* Purpose-specific views for the first six analytical chart redesigns. */
(function (root) {
  'use strict';
  const quantile = (sorted, p) => {
    if (!sorted.length) return null;
    const at = (sorted.length - 1) * p, low = Math.floor(at);
    return sorted[low] + (sorted[Math.ceil(at)] - sorted[low]) * (at - low);
  };
  function distribution(horses) {
    const valid = horses.filter(h => {
      const amount = h.earnings_netkeiba ?? h.earnings_jbis;
      return amount != null && Number.isFinite(Number(amount)) && Number(amount) >= 0;
    });
    const values = valid.map(h => Number(h.earnings_netkeiba ?? h.earnings_jbis)).sort((a,b) => a-b);
    if (!values.length) return { horses: [], box: null, total: 0, missing: horses.length };
    const q1 = quantile(values, .25), median = quantile(values, .5), q3 = quantile(values, .75);
    const spread = (q3-q1) * 1.5;
    const inside = values.filter(v => v >= q1-spread && v <= q3+spread);
    return { horses: valid, box: [inside[0],q1,median,q3,inside.at(-1)],
      total: values.reduce((a,b)=>a+b,0), missing: horses.length-valid.length };
  }
  function wilson(hits, total) {
    if (!total) return null;
    const p=hits/total, z=1.959963984540054, d=1+z*z/total;
    const center=(p+z*z/(2*total))/d;
    const half=z*Math.sqrt(p*(1-p)/total+z*z/(4*total*total))/d;
    return [Math.max(0,center-half)*100,Math.min(1,center+half)*100];
  }
  function card(id, height) {
    const node=document.getElementById(id);
    if (!node) return;
    node.style.height=`${height}px`;
    node.closest('.chart-card')?.classList.add('research-chart');
  }
  // Custom segments use data coordinates: they retain position on resize/zoom.
  function segment(color, cap=false) {
    return (params, api) => {
      const a=api.coord([api.value(0),api.value(2)]), b=api.coord([api.value(1),api.value(2)]);
      const children=[{type:'line',shape:{x1:a[0],y1:a[1],x2:b[0],y2:b[1]},style:{stroke:color,lineWidth:2,opacity:.65}}];
      if(cap) for(const pt of [a,b]) children.push({type:'line',shape:{x1:pt[0],y1:pt[1]-4,x2:pt[0],y2:pt[1]+4},style:{stroke:color,lineWidth:1.5}});
      return {type:'group',children};
    };
  }
  const categories = labels => ({type:'category',data:labels,inverse:true,axisLine:{show:false},axisTick:{show:false},axisLabel:{color:chartThemeColors().text,fontSize:12}});
  function earnings(crops, horses) {
    const id='sireCropEarningsChart'; card(id,430);
    const rows=crops.map(c=>({crop:c.label,...distribution(horses.filter(h=>String(h.birth_year)===String(c.label)))}));
    const node=document.getElementById(id);
    let summary=node.previousElementSibling;
    if(!summary?.classList.contains('distribution-summary')) {
      summary=document.createElement('div');summary.className='distribution-summary';node.before(summary);
    }
    summary.innerHTML=rows.map(r=>`<div><span>${escapeHtml(r.crop)} · ${r.horses.length}匹</span><strong>${money(r.box?.[2])}</strong><small>中位数 · 总计 ${formatNumber(r.total/10000,1)}亿${r.missing ? ` · 缺失 ${r.missing}匹` : ''}</small></div>`).join('');
    // log1p includes genuine zero earnings; both boxes and dots use the same transform.
    const transform=v=>Math.log10(1+v);
    const dots=rows.flatMap((r,i)=>r.horses.map(h=>({name:h.name,value:[transform(Number(h.earnings_netkeiba??h.earnings_jbis)),i],raw:h,
      symbolOffset:[0,((Number(h.id)*37)%19)-9],itemStyle:{color:cropColor(r.crop)}})));
    renderChart(id,{ research:true, animation:false,
      grid:{left:52,right:24,top:30,bottom:52,containLabel:true},
      xAxis:{type:'value',name:'奖金（万日元 · log10(1+奖金)）',nameLocation:'middle',nameGap:32,min:0,max:Math.max(...dots.map(d=>d.value[0]))*1.06,
        interval:1,axisLabel:{formatter:v=>formatNumber(Math.pow(10,v)-1,0)}},
      yAxis:categories(rows.map(r=>`${r.crop}年`)),
      tooltip:{trigger:'item',formatter:p=>p.seriesType==='scatter'
        ? `${escapeHtml(p.data.raw.name)}<br>${prize(p.data.raw)}<br>点选查看产驹`
        : `${rows[p.dataIndex].crop}年 · ${rows[p.dataIndex].horses.length}匹<br>中位数 ${money(rows[p.dataIndex].box[2])}<br>中间50% ${money(rows[p.dataIndex].box[1])} – ${money(rows[p.dataIndex].box[3])}`},
      series:[{name:'每匹产驹',type:'scatter',symbolSize:4,data:dots,itemStyle:{opacity:.55},z:3},
        {name:'中间50%与中位数',type:'boxplot',layout:'horizontal',boxWidth:[16,26],z:1,
          data:rows.map(r=>({value:r.box?.map(transform),itemStyle:{color:root.DuramenteColors.tint(cropColor(r.crop),.88),borderColor:cropColor(r.crop),borderWidth:2}}))}]
    })?.on('click',p=>{if(p.data?.raw?.id)openHorse(p.data.raw.id);});
  }
  function achievement(crops) {
    const stages=[['runners','出赛'],['winners','胜马'],['two_win_horses','2胜以上'],['three_win_horses','3胜以上'],['graded_winners','重赏马'],['g1_horses','G1马']];
    const total=crops.reduce((s,c)=>s+c.foals,0);
    const bases=stages.map(([key])=>crops.reduce((s,c)=>s+(c[key]||0),0)/total);
    const data=crops.flatMap((c,x)=>stages.map(([key,label],y)=>{
      const rate=(c[key]||0)/c.foals*100, delta=rate-bases[y]*100;
      return {value:[x,y,delta],rate,count:c[key]||0,total:c.foals,crop:c.label,stage:label,base:bases[y]*100};
    }));
    const extent=Math.max(1,...data.map(d=>Math.abs(d.value[2])));
    for (const d of data) {
      const colors=root.DuramenteColors.research.diverging, t=d.value[2]/extent;
      const a=colors[t<0?0:1], b=colors[t<0?1:2], f=t<0?t+1:t;
      const rgb=c=>c.slice(1).match(/../g).map(v=>parseInt(v,16));
      const aa=rgb(a),bb=rgb(b),hex='#'+aa.map((v,i)=>Math.round(v+(bb[i]-v)*f).toString(16).padStart(2,'0')).join('');
      d.label={color:root.DuramenteColors.ink(hex)};
    }
    card('sireAchievementStepChart',410);
    renderChart('sireAchievementStepChart',{research:true,
      grid:{left:12,right:12,top:20,bottom:72,containLabel:true},
      xAxis:{type:'category',data:crops.map(c=>c.label),axisLine:{show:false},axisTick:{show:false}},
      yAxis:categories(stages.map(s=>s[1])),
      visualMap:{min:-extent,max:extent,orient:'horizontal',left:'center',bottom:4,itemWidth:12,itemHeight:160,
        text:['高于全库','低于全库'],calculable:false,inRange:{color:root.DuramenteColors.research.diverging}},
      tooltip:{formatter:p=>`${p.data.crop}年 · ${p.data.stage}<br>${p.data.rate.toFixed(1)}%（${p.data.count}/${p.data.total}）<br>全库 ${p.data.base.toFixed(1)}%<br>差值 ${p.data.value[2]>=0?'+':''}${p.data.value[2].toFixed(1)} 个百分点`},
      series:[{type:'heatmap',data,label:{show:true,fontSize:12,formatter:p=>`${p.data.rate.toFixed(1)}%`},
        itemStyle:{borderWidth:3,borderColor:chartThemeColors().surface}}]
    })?.on('click',p=>{if(p.data?.crop)navigateToProgeny({year:p.data.crop});});
  }
  function milestones(events) {
    const rows=[...events].filter(r=>r.race_date).sort((a,b)=>a.race_date.localeCompare(b.race_date));
    const horses=[...new Set(rows.map(r=>r.horse))];
    card('gradedWinsTimelineChart',Math.max(420,horses.length*34+100));
    const gradeColors=root.DuramenteColors.research.grades;
    renderChart('gradedWinsTimelineChart',{research:true,
      legend:{top:0,data:['G1','G2','G3']},
      grid:{left:12,right:24,top:88,bottom:24,containLabel:true},
      xAxis:{type:'time',position:'top',axisLabel:{formatter:chartViewportWidth()<520?'{yy}年':'{yyyy}',hideOverlap:true},splitNumber:chartViewportWidth()<520?3:6,splitLine:{show:true,lineStyle:{type:'dashed'}},min:Date.UTC(Number(rows[0]?.race_date.slice(0,4)||2020),0,1),max:Date.UTC(Number(rows.at(-1)?.race_date.slice(0,4)||2026)+1,0,1)},yAxis:categories(horses),
      tooltip:{trigger:'item',formatter:p=>`${escapeHtml(p.data.raw.horse)}<br>${p.data.raw.race_date} · ${p.data.raw.grade_group}<br>${escapeHtml(p.data.raw.race_name)}<br>点选查看赛事`},
      series:['G1','G2','G3'].map(grade=>({name:grade,type:'scatter',symbol:grade==='G1'?'diamond':'circle',symbolSize:grade==='G1'?14:10,
        itemStyle:{color:gradeColors[grade],borderWidth:1,borderColor:chartThemeColors().surface},
        data:rows.filter(r=>r.grade_group===grade).map(r=>({value:[Date.parse(r.race_date.replaceAll('/','-')+'T12:00:00Z'),horses.indexOf(r.horse)],raw:r}))}))
    })?.on('click',p=>{
      const url=p.data?.raw?.race_url;
      if(/^https:\/\/db\.netkeiba\.com\/race\/\d+\/$/.test(url||'')) window.open(url,'_blank','noopener,noreferrer');
    });
  }
  function efficiency(rows, baseline) {
    card('bmsSireEfficiencyChart',Math.max(380,rows.length*35+95));
    const data=rows.map((r,i)=>({value:[r.winner_foal_rate*100,i],raw:r,name:r.label}));
    const intervals=rows.map((r,i)=>[...wilson(r.winners,r.foals),i]);
    const theme=chartThemeColors();
    renderChart('bmsSireEfficiencyChart',{research:true,
      grid:{left:12,right:94,top:30,bottom:42,containLabel:true},
      xAxis:{type:'value',min:0,max:100,name:'胜马率',axisLabel:{formatter:'{value}%'}},yAxis:categories(rows.map(r=>r.label)),
      tooltip:{trigger:'item',formatter:p=>{const r=p.data.raw;if(!r)return '';const ci=wilson(r.winners,r.foals);return `${escapeHtml(r.label)}<br>${formatRate(r.winner_foal_rate)}（${r.winners}/${r.foals}）<br>95% Wilson区间 ${ci[0].toFixed(1)}–${ci[1].toFixed(1)}%<br>区间用于探索性比较，不表示因果关系。`;}},
      series:[{type:'custom',renderItem:segment(COLORS.muted,true),silent:true,data:intervals,encode:{x:[0,1],y:2}},
        {type:'scatter',symbolSize:9,itemStyle:{color:COLORS.duramente},data,
          label:{show:true,position:'right',distance:10,color:theme.text,backgroundColor:theme.surface,padding:[2,3],formatter:p=>`${p.data.raw.winners}/${p.data.raw.foals}`},
          markLine:{silent:true,symbol:'none',label:{show:false},lineStyle:{color:COLORS.muted,type:'dashed'},data:[{xAxis:baseline*100}]}}]
    })?.on('click',p=>{if(p.data?.raw)applyBroodmareSireFilter(p.data.raw.label);});
  }
  function clubs(first, second, metrics) {
    card('clubComparisonChart',400);
    const value=(s,key)=>s.foals ? s[key]/s.foals*100 : null;
    const pairs=metrics.map((m,i)=>[value(first,m.key),value(second,m.key),i]).filter(d=>d[0]!=null&&d[1]!=null);
    renderChart('clubComparisonChart',{research:true,
      legend:{top:0,data:[first.owner,second.owner]},grid:{left:10,right:68,top:66,bottom:38,containLabel:true},
      xAxis:{type:'value',min:0,max:100,axisLabel:{formatter:'{value}%'}},yAxis:categories(metrics.map(m=>m.label)),
      tooltip:{trigger:'item',formatter:p=>{const m=metrics[p.dataIndex];return `${m.label}<br>${escapeHtml(first.owner)}：${first[m.key]}/${first.foals}<br>${escapeHtml(second.owner)}：${second[m.key]}/${second.foals}<br>A − B：${(value(first,m.key)-value(second,m.key)).toFixed(1)} 个百分点`;}},
      series:[{type:'custom',silent:true,renderItem:segment(COLORS.muted),data:pairs,encode:{x:[0,1],y:2}},
        ...[first,second].map((s,j)=>({name:s.owner,type:'scatter',symbol:j?'diamond':'circle',symbolSize:11,
          itemStyle:{color:j?COLORS.teal:COLORS.duramente},data:metrics.map((m,i)=>[value(s,m.key),i])})),
        {type:'scatter',symbolSize:0,silent:true,data:metrics.map((m,i)=>({value:[100,i],delta:first.foals&&second.foals?value(first,m.key)-value(second,m.key):null})),
          label:{show:true,position:'right',distance:12,formatter:p=>p.data.delta==null?'—':`${p.data.delta>=0?'+':''}${p.data.delta.toFixed(1)}pt`}}]
    });
  }
  function racecourses(rows, minStarts, target) {
    const node=document.getElementById(target);if(!node)return;
    const main=rows.filter(r=>r.starts>=minStarts);
    const maxStarts=Math.max(1,...main.map(r=>r.starts)),maxWins=Math.max(1,...main.map(r=>r.wins_starts));
    node.innerHTML=`<div class="course-plot-controls"><label>排列 <select aria-label="赛马场比较排序"><option value="starts">出赛次数</option><option value="wins_starts">胜场</option><option value="win_start_rate">胜率</option><option value="top3_rate">前三率</option></select></label><span>至少 ${minStarts} 次出赛 · ${main.length} 个赛马场</span></div><div class="course-plot-scroll"><table class="course-plot-table"><thead><tr><th>赛马场</th><th>出赛次数</th><th>胜场</th><th>胜率</th><th>前三率</th></tr><tr class="plot-scale"><th></th><th>0 — ${formatNumber(maxStarts)}</th><th>0 — ${maxWins}</th><th>0 — 100%</th><th>0 — 100%</th></tr></thead><tbody></tbody></table></div><p class="research-note">每列独立标尺；比例按有效出赛次数计算。横向滑动查看完整比较。</p>`;
    const draw=key=>{
      node.querySelector('tbody').innerHTML=[...main].sort((a,b)=>b[key]-a[key]||b.starts-a.starts).map(r=>{
        const bar=(v,max)=>`<span class="table-bar"><i style="width:${v/max*100}%"></i><b>${formatNumber(v)}</b></span>`;
        const dot=(hits,total)=>{const rate=total?hits/total*100:null;return `<span class="table-dot" title="${hits}/${total}"><i style="left:${rate??0}%"></i><b>${rate==null?'—':rate.toFixed(1)+'%'}</b></span>`;};
        return `<tr><th>${escapeHtml(r.label)}<small>${escapeHtml(r.jurisdiction)}</small></th><td>${bar(r.starts,maxStarts)}</td><td>${bar(r.wins_starts,maxWins)}</td><td>${dot(r.wins_starts,r.starts)}</td><td>${dot(r.top3,r.starts)}</td></tr>`;
      }).join('');
    };
    draw('starts');node.querySelector('select').onchange=e=>draw(e.target.value);
  }
  let photoCatalog;
  const previousPhoto=new Map();
  async function horsePhoto(horse, container) {
    if(!container||!/^\d{10}$/.test(String(horse.netkeiba_id||'')))return;
    const id=String(horse.netkeiba_id), source=`https://db.netkeiba.com/photo/list.html?id=${id}`;
    container.innerHTML='<p class="muted">正在加载照片…</p>';
    try {
      photoCatalog ||= fetchStaticData('horse_photos.json').catch(e=>{photoCatalog=null;throw e;});
      const catalog=await photoCatalog;
      if(!container.isConnected)return;
      const photos=(catalog.horses[id]||[]).filter(p=>/^\d+$/.test(p));
      if(!photos.length){container.innerHTML=`<p class="photo-empty">暂无可展示照片 · <a href="${source}" target="_blank" rel="noreferrer">在 netkeiba 查看</a></p>`;return;}
      container.innerHTML=`<a class="horse-photo-link" href="${source}" target="_blank" rel="noreferrer"><img alt="${escapeHtml(horse.name)}的照片" referrerpolicy="no-referrer" decoding="async"></a><figcaption><a href="${source}" target="_blank" rel="noreferrer">照片来源：netkeiba ↗</a><button type="button" ${photos.length<2?'hidden':''}>换一张</button></figcaption>`;
      const img=container.querySelector('img');let remaining=[...photos];
      const show=()=>{
        const candidates=remaining.filter(p=>p!==previousPhoto.get(id));
        const pool=candidates.length?candidates:remaining;
        if(!pool.length){container.innerHTML=`<p class="photo-empty">照片暂时无法加载 · <a href="${source}" target="_blank" rel="noreferrer">在 netkeiba 查看</a></p>`;return;}
        const no=pool[Math.floor(Math.random()*pool.length)];previousPhoto.set(id,no);
        img.dataset.photo=no;img.src=`https://db.netkeiba.com/show_photo.php?horse_id=${id}&no=${no}&tn=no&tmp=no`;
      };
      img.onerror=()=>{remaining=remaining.filter(p=>p!==img.dataset.photo);show();};
      container.querySelector('button').onclick=show;show();
    } catch {if(container.isConnected)container.innerHTML=`<p class="photo-empty">照片暂时无法加载 · <a href="${source}" target="_blank" rel="noreferrer">在 netkeiba 查看</a></p>`;}
  }
  function openDatum(id,p) {
    if(id==='sireCropEarningsChart'&&p.data?.raw?.id)openHorse(p.data.raw.id);
    if(id==='sireAchievementStepChart'&&p.data?.crop)navigateToProgeny({year:p.data.crop});
    if(id==='bmsSireEfficiencyChart'&&p.data?.raw)applyBroodmareSireFilter(p.data.raw.label);
    if(id==='gradedWinsTimelineChart') {
      const url=p.data?.raw?.race_url;
      if(/^https:\/\/db\.netkeiba\.com\/race\/\d+\/$/.test(url||''))window.open(url,'_blank','noopener,noreferrer');
    }
  }
  const api={openDatum,quantile,distribution,wilson,earnings,achievement,milestones,efficiency,clubs,racecourses,horsePhoto};
  root.DuramenteAnalysis=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

import { escapeHtml as html } from './format.mjs';
export const MAP_REGIONS = {
  north: { label:'北海道・东北', center:[141,41], zoom:2.4, test:c=>c.lat>=37.5 },
  east: { label:'关东', center:[139.85,35.72], zoom:16, test:c=>c.lon>=138 && c.lat<37.5 },
  central: { label:'中部・近畿', center:[136.3,35.3], zoom:5.5, test:c=>c.lon>=134 && c.lon<138 },
  west: { label:'四国・九州', center:[132,33.6], zoom:4.5, test:c=>c.lon<134 },
  all: { label:'全国', center:[136.5,37.4], zoom:1, test:()=>true },
};
/** Transitive screen-space clusters; no racecourse coordinates are displaced. */
export function clusterPoints(points,project,radius=30) {
  const groups=[];
  for(const point of points){
    const pixel=project(point); if(!pixel || !pixel.every(Number.isFinite)) continue;
    const matches=groups.filter(g=>g.some(p=>Math.hypot(p.pixel[0]-pixel[0],p.pixel[1]-pixel[1])<(typeof radius==='function'?radius(p.point,point):radius)));
    const merged=[{point,pixel},...matches.flat()];
    for(const match of matches)groups.splice(groups.indexOf(match),1);
    groups.push(merged);
  }
  return groups.map(g=>g.map(p=>p.point));
}
/** Circle area above a visible minimum is proportional to wins; fixed all-course scale. */
export function courseBubbleSize(wins,maxWins,min=14,max=46) {
  const share=maxWins>0?Math.max(0,Math.min(1,Number(wins)/maxWins)):0;
  return Math.sqrt(min*min+(max*max-min*min)*share);
}
export async function mountRacecourseMap(root,{rows,coordinates,canonicalName,geoJson,renderChart,onSelect,getPopulation,openHorse}) {
  let scope='All',region=innerWidth<=600?'east':'all',mode='map',selected=null,chart,signature='',frame;
  const points=rows.filter(r=>['JRA','NAR'].includes(r.jurisdiction)).map(row=>({row,name:canonicalName(row.label),coord:coordinates[canonicalName(row.label)]})).filter(p=>p.coord);
  const maxWins=Math.max(0,...points.map(p=>p.row.wins_starts));
  const diameter=p=>courseBubbleSize(p.row.wins_starts,maxWins);
  root.innerHTML=`<div class="map-workbench"><div class="map-tools"><div role="group" aria-label="地图赛事体系">${['All','JRA','NAR'].map(s=>`<button type="button" data-map-scope="${s}" aria-pressed="${s==='All'}">${s==='All'?'全部':s}</button>`).join('')}</div><label>区域 <select id="mapRegion">${Object.entries(MAP_REGIONS).map(([key,r])=>`<option value="${key}"${key===region?' selected':''}>${r.label}</option>`).join('')}</select></label><div role="group" aria-label="地图或列表"><button type="button" data-map-mode="map" aria-pressed="true">地图</button><button type="button" data-map-mode="list" aria-pressed="false">列表</button></div></div><div class="map-stage"><article class="chart-card map-canvas-card"><div class="chart-card-head"><h3>产驹胜场分布</h3><p>圆圈大小代表胜场数量；点击赛马场查看详细成绩。</p></div><div class="map-zoom" role="group" aria-label="地图导航"><button type="button" data-map-zoom="1.6" aria-label="放大地图">＋</button><button type="button" data-map-zoom="0.625" aria-label="缩小地图">−</button><button type="button" id="mapReset">重置视图</button></div><div id="racecourseJapanMap" class="chart"></div><p class="map-key">数字表示附近赛马场数量 · 点击可展开</p></article><aside class="map-detail" aria-label="所选赛马场" aria-live="polite"></aside></div><div class="map-list" aria-label="同步赛马场列表"><div class="map-list-heading"><h3>当前区域赛马场</h3><span data-map-count></span></div><div class="map-list-rows"></div></div></div>`;
  window.echarts.registerMap('japan-research-map',geoJson);
  const visible=()=>points.filter(p=>(scope==='All'||p.row.jurisdiction===scope)&&MAP_REGIONS[region].test(p.coord));
  const ratio=(a,n)=>n?`${(100*a/n).toFixed(1)}%`:'—';
  function select(point,focus=false){
    selected=point?.name||null;
    const panel=root.querySelector('.map-detail');
    if(!point){panel.innerHTML='<h3>选择赛马场</h3><p>点选地图标记或下方列表，查看出赛次数、胜率与前三率。</p>';return;}
    const r=point.row;
    panel.innerHTML=`<h3>${html(point.name)} <small>${html(r.jurisdiction)}</small></h3><dl><div><dt>正式出赛</dt><dd>${r.starts}</dd></div><div><dt>胜场</dt><dd>${r.wins_starts}</dd></div><div><dt>胜率</dt><dd>${ratio(r.wins_starts,r.starts)}</dd></div><div><dt>前三率</dt><dd>${ratio(r.top3,r.starts)} <small>(${r.top3}/${r.starts})</small></dd></div></dl><p>按有正式名次的比赛统计。${r.starts<30?'样本少于30场，比例波动较大。':''}</p><button type="button" data-course-population>查看对应产驹 ↗</button><div data-course-horses></div><button type="button" data-course-analysis>查看场地与距离表现 ↓</button>`;
    panel.querySelector('[data-course-analysis]').onclick=()=>onSelect(r);
    panel.querySelector('[data-course-population]').onclick=async event=>{
      const button=event.currentTarget;button.disabled=true;button.textContent='正在载入产驹…';
      try {
        const population=await getPopulation(r.label);
        if(selected!==point.name)return;
        button.textContent=`${population.length} 匹独立产驹`;
        const target=panel.querySelector('[data-course-horses]');
        target.innerHTML=`<p>以下产驹曾在此取得正式名次。</p><div class="course-horse-list">${population.map(h=>`<button type="button" data-map-horse="${html(h.id)}">${html(h.name)}</button>`).join('')}</div>`;
        target.querySelectorAll('[data-map-horse]').forEach(b=>b.onclick=()=>openHorse(b.dataset.mapHorse));
      }catch(error){if(selected===point.name){button.disabled=false;button.textContent='载入失败，点此重试';}}
    };
    root.querySelectorAll('[data-course-name]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.courseName===selected)));
    signature='';recluster();
    if(focus){panel.tabIndex=-1;panel.focus({preventScroll:true});panel.scrollIntoView({block:'nearest'});}
  }
  function renderList(){
    const list=visible().sort((a,b)=>b.row.starts-a.row.starts);
    root.querySelector('[data-map-count]').textContent=`${list.length} 场 · 与区域及赛事体系同步`;
    root.querySelector('.map-list-rows').innerHTML=list.length?list.map(p=>`<button type="button" data-course-name="${html(p.name)}" aria-pressed="${p.name===selected}"><strong>${html(p.name)} <small>${p.row.jurisdiction}</small></strong><span>${p.row.starts} 场 · ${p.row.wins_starts} 胜</span><span>胜率 ${ratio(p.row.wins_starts,p.row.starts)}</span></button>`).join(''):'<p>当前区域没有此赛事体系的记录。请选择其他区域。</p>';
    root.querySelectorAll('[data-course-name]').forEach(b=>b.onclick=()=>select(list.find(p=>p.name===b.dataset.courseName),true));
  }
  function recluster(){
    if(!chart || chart.isDisposed() || mode==='list')return;
    const groups=clusterPoints(visible(),p=>chart.convertToPixel({geoIndex:0},[p.coord.lon,p.coord.lat]),(a,b)=>(diameter(a)+diameter(b))/2+6);
    const next=JSON.stringify(groups.map(g=>g.map(p=>p.name)))+selected+document.documentElement.dataset.theme;
    if(next===signature)return;signature=next;
    const css=getComputedStyle(document.documentElement),dark=document.documentElement.dataset.theme==='dark';
    const ink=css.getPropertyValue('--ink').trim(),panel=css.getPropertyValue('--panel').trim(),muted=css.getPropertyValue('--muted').trim();
    chart.setOption({series:[{id:'courses',data:groups.map(group=>{
      const clustered=group.length>1,active=group.some(p=>p.name===selected);
      return {name:clustered?`${group.length} 个赛马场`:group[0].name,members:group.map(p=>p.name),
        kind:clustered?'cluster':'course',courseCount:group.length,wins:clustered?null:group[0].row.wins_starts,
        value:[group.reduce((n,p)=>n+p.coord.lon,0)/group.length,group.reduce((n,p)=>n+p.coord.lat,0)/group.length],
        symbol:'circle',symbolSize:clustered?38:diameter(group[0]),
        itemStyle:{color:clustered?panel:dark?'#c18095':'#a65b70',opacity:1,borderWidth:active?3:2,borderColor:active?ink:clustered?muted:panel,borderType:clustered?'dashed':'solid'},
        label:{show:true,position:clustered?'inside':'right',formatter:clustered?String(group.length):group[0].name,fontWeight:clustered||active?700:400,fontSize:12,color:ink,textBorderColor:panel,textBorderWidth:clustered?0:3}};
    })}]});
  }
  function focusRegion(){const r=MAP_REGIONS[region];chart.setOption({geo:{center:r.center,zoom:r.zoom}});signature='';recluster();renderList();if(selected&&!visible().some(p=>p.name===selected))select(null);}
  chart=renderChart('racecourseJapanMap',{research:true,animation:false,tooltip:{show:false},geo:{map:'japan-research-map',roam:true,scaleLimit:{min:1,max:60},center:MAP_REGIONS[region].center,zoom:MAP_REGIONS[region].zoom,left:10,right:10,top:10,bottom:10,label:{show:false},emphasis:{disabled:true},itemStyle:{areaColor:'#f0f0f3',borderColor:'#a7a7af',borderWidth:.7}},series:[{id:'courses',type:'scatter',coordinateSystem:'geo',data:[],labelLayout:{hideOverlap:true},emphasis:{scale:false}}]});
  chart.on('finished',()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(recluster);});
  chart.on('georoam',()=>{signature='';recluster();});
  chart.on('click',event=>{
    const members=event.data?.members;if(!members)return;
    if(members.length===1){select(points.find(p=>p.name===members[0]),true);return;}
    const geo=chart.getOption().geo[0];chart.setOption({geo:{center:event.data.value,zoom:Math.min(60,geo.zoom*2)}});signature='';recluster();
    root.querySelector('.map-detail').innerHTML=`<h3>相邻赛马场</h3><p>已放大该区域，也可直接选择：</p>${members.map(name=>`<button type="button" data-cluster-course="${html(name)}">${html(name)}</button>`).join('')}`;
    root.querySelectorAll('[data-cluster-course]').forEach(b=>b.onclick=()=>select(points.find(p=>p.name===b.dataset.clusterCourse),true));
  });
  root.querySelectorAll('[data-map-scope]').forEach(b=>b.onclick=()=>{scope=b.dataset.mapScope;root.querySelectorAll('[data-map-scope]').forEach(p=>p.setAttribute('aria-pressed',String(p===b)));signature='';recluster();renderList();if(selected&&!visible().some(p=>p.name===selected))select(null);});
  root.querySelector('#mapRegion').onchange=e=>{region=e.target.value;focusRegion();};
  root.querySelector('#mapReset').onclick=()=>{region=innerWidth<=600?'east':'all';root.querySelector('#mapRegion').value=region;focusRegion();};
  root.querySelectorAll('[data-map-zoom]').forEach(b=>b.onclick=()=>{const geo=chart.getOption().geo[0];chart.setOption({geo:{zoom:Math.max(1,Math.min(60,geo.zoom*Number(b.dataset.mapZoom)))}});signature='';recluster();});
  root.querySelectorAll('[data-map-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mapMode;root.querySelectorAll('[data-map-mode]').forEach(p=>p.setAttribute('aria-pressed',String(p===b)));root.querySelector('.map-canvas-card').hidden=mode==='list';root.classList.toggle('list-mode',mode==='list');if(mode==='map'){chart.resize();signature='';recluster();}});
  renderList();select(null);recluster();
  return {chart};
}

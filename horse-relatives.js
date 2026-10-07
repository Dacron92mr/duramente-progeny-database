(function(root) {
  'use strict';
  function sameDam(a,b) {
    if(a.dam_netkeiba_id && b.dam_netkeiba_id) return String(a.dam_netkeiba_id)===String(b.dam_netkeiba_id);
    return Boolean(a.dam_jbis_id && b.dam_jbis_id && String(a.dam_jbis_id)===String(b.dam_jbis_id));
  }
  function gradedSiblings(horse,horses,catalog) {
    const external=catalog?.dams?.[horse.dam_netkeiba_id]||[];
    const local=horses.filter(h=>sameDam(horse,h)&&['G1','G2','G3'].includes(h.achievement_class));
    const byId=new Map();
    for(const sibling of [...external,...local]) {
      const id=String(sibling.netkeiba_id||'');
      if(!/^\d{10}$/.test(id)||id===String(horse.netkeiba_id)||(sibling.id!=null && sibling.id===horse.id)||sibling.name===horse.name)continue;
      byId.set(id,sibling);
    }
    return [...byId.values()].sort((a,b)=>(a.birth_year||0)-(b.birth_year||0)||a.name.localeCompare(b.name));
  }
  const api={sameDam,gradedSiblings};root.DuramenteRelatives=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

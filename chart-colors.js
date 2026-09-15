(function (root) {
  'use strict';
  const crops = Object.freeze({2018:'#742c46',2019:'#b84c78',2020:'#db8990',2021:'#dfa064',2022:'#e4c568'});
  const clamp = n => Math.max(0, Math.min(1, n));
  function tint(hex, amount) {
    const channels = hex.replace('#','').match(/../g).map(v => parseInt(v,16));
    return '#'+channels.map(v => Math.round(v+(255-v)*clamp(amount)).toString(16).padStart(2,'0')).join('');
  }
  function hsl(h,s,l) {
    s/=100;l/=100;
    const a=s*Math.min(l,1-l), f=n=>{const k=(n+h/30)%12;return l-a*Math.max(-1,Math.min(k-3,9-k,1));};
    return '#'+[0,8,4].map(n=>Math.round(f(n)*255).toString(16).padStart(2,'0')).join('');
  }
  function familyIdentity(label) {
    const m=String(label).trim().match(/^([A-Z]*)(\d+)(?:-([a-z]+))?$/i);
    return m ? {prefix:(m[1]||'F').toUpperCase(),number:Number(m[2]),branch:(m[3]||'').toLowerCase()} : null;
  }
  function family(label) {
    const id=familyIdentity(label);if(!id)return '#a5a0a4';
    // Fixed numbering keeps colours stable when filters or rankings change.
    const sequence=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,19,20,21,22,23,25,26,31,52];
    const index=sequence.indexOf(id.number);
    const hue=id.prefix==='F' ? (index>=0 ? 290*index/(sequence.length-1) : 290*Math.min(id.number-1,51)/51) : ({A:22,B:190,C:270}[id.prefix]??320);
    const variation=id.branch ? (id.branch.charCodeAt(0)-97)%5-2 : 0;
    return hsl(hue,43,49+variation*1.4);
  }
  function ink(hex) {
    const c=hex.slice(1).match(/../g).map(v=>{const n=parseInt(v,16)/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;});
    return .2126*c[0]+.7152*c[1]+.0722*c[2]>.179?'#29242a':'#ffffff';
  }
  const api={crops,tint,family,familyIdentity,ink};
  root.DuramenteColors=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);

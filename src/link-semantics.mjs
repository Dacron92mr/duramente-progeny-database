/** Classify by declared action/context, never by <a> vs <button> alone. */
const internal='[data-open-population],[data-open-horse],[data-horse-name],[data-progeny-filter-key],[data-bms-filter],[data-broodmare-sire-filter],[data-female-family-filter],[data-breeder-filter],[data-search-filter],[data-course-population],[data-progeny-filter],[data-profile-filter],[data-related-horse],[data-horse-id],[data-overseas-horse],[data-jurisdiction],[data-explore],a[href^="?"],a[href^="index.html?"],a[href="updates.html"],[data-link-purpose="drill"]';
const sources='.source-section a,.stud-chip,.source-note a,.external-links a,.detail-sources a,.chart-context a,.post-racing a,.horse-news a,.life-timeline a,.profile-siblings a,.notable-siblings a,.race-detail-fields a,.race-table a,.overseas-history a,.horse-photo a,.source-links a,.sources-list a,.study-method a,.update-source,[data-link-purpose="source"]';
const research='.research-citation,[data-link-purpose="research"],.inline-reference:not(.source-note .inline-reference)';
function matches(root,selector){return [...(root.matches?.(selector)?[root]:[]),...root.querySelectorAll(selector)];}
function arrow(el,value){
 const walker=el.ownerDocument.createTreeWalker(el,4);let text;while((text=walker.nextNode()))if(/[↗→]/.test(text.data))text.data=text.data.replace(/[↗→]/g,value);
 if(!/[↗→]/.test(el.textContent)) {const mark=el.ownerDocument.createElement('span');mark.setAttribute('aria-hidden','true');mark.textContent=` ${value}`;el.append(mark);}
}
export function applyLinkSemantics(root){
 for(const el of matches(root,internal)) {
  if(el.tagName!=='A'&&el.tagName!=='BUTTON')continue;
  if(el.tagName==='A'&&/^https?:/.test(el.getAttribute('href')||''))continue;
  el.classList.add('data-drill-link');el.dataset.linkPurpose='drill';arrow(el,'→');
 }
 for(const el of matches(root,research))if(el.tagName==='A'&&/^https:\/\//.test(el.getAttribute('href')||'')){
  el.classList.add('research-citation');el.dataset.linkPurpose='research';el.target='_blank';el.rel='noopener noreferrer';arrow(el,'↗');
 }
 for(const el of matches(root,sources))if(el.tagName==='A'&&/^https:\/\//.test(el.getAttribute('href')||'')&&!el.closest('.reference-list')){
  el.classList.remove('research-citation');el.classList.add('data-source-link');el.dataset.linkPurpose='source';el.target='_blank';el.rel='noopener noreferrer';arrow(el,'↗');
 }
 // External destinations without an explicit research role are provenance.
 // This keeps newly added source links distinct from internal drill-downs.
 for(const el of matches(root,'a[href^="https://"]')){
  if(el.dataset.linkPurpose||el.closest('.reference-list'))continue;
  el.classList.add('data-source-link');el.dataset.linkPurpose='source';el.target='_blank';el.rel='noopener noreferrer';arrow(el,'↗');
 }
 for(const el of matches(root,'[data-link-purpose="research"],[data-link-purpose="source"]')){
  if(!el.querySelector('.sr-only')){const note=el.ownerDocument.createElement('span');note.className='sr-only';note.textContent='（新窗口）';el.append(note);}
 }
}
export function installLinkSemantics(root=document.body){
 applyLinkSemantics(root);
 const observer=new MutationObserver(changes=>{
  const added=new Set(changes.flatMap(c=>[...c.addedNodes]).filter(n=>n.nodeType===1));
  for(const node of added)if(node.isConnected)applyLinkSemantics(node);
 });
 observer.observe(root,{childList:true,subtree:true});return ()=>observer.disconnect();
}

/* Progressive enhancement only. Navigation remains fully usable without JS. */
(()=>{
'use strict';
const links=[...document.querySelectorAll('.signal-path[href^="#"]')];
const status=document.getElementById('signal-index-status');
if(!links.length||!status)return;
const destinations=new Map(links.map(link=>[link.getAttribute('href').slice(1),link]));
function activate(id){
  for(const link of links){
    if(link.getAttribute('href')==='#'+id)link.setAttribute('aria-current','location');
    else link.removeAttribute('aria-current');
  }
  const label={projects:'BUILD / SELECTED WORK',beyond:'CREATE / LIFE BEYOND',creative:'EXPLORE / FEATURED FILM'}[id];
  status.textContent=label||'SELECT A PATH TO BEGIN';
}
links.forEach(link=>link.addEventListener('click',()=>activate(link.hash.slice(1))));
const update=()=>activate(location.hash.slice(1));
window.addEventListener('hashchange',update,{passive:true});
update();
if('IntersectionObserver' in window){
 const observer=new IntersectionObserver(entries=>{
   const best=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
   if(best)activate(best.target.id);
 },{rootMargin:'-15% 0px -58% 0px',threshold:[0,.25,.5]});
 for(const id of destinations.keys()){
   const element=document.getElementById(id);
   if(element)observer.observe(element);
 }
}
})();
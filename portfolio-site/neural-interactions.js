/* Shared, bounded neural interactions. Works only on interactive cards.
   No timers, audio, tracking, or persistent animation loop. */
(()=>{
'use strict';
const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
const fine=window.matchMedia('(hover: hover) and (pointer: fine)');
const host=document.querySelector('.signal-index');
const cards=[...document.querySelectorAll('.signal-path,.beyond .hobby-card')];
if(!cards.length)return;
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
let frame=0,pending=null;
function position(target,event){
 const rect=target.getBoundingClientRect();
 const x=clamp((event.clientX-rect.left)/Math.max(1,rect.width)*100,0,100);
 const y=clamp((event.clientY-rect.top)/Math.max(1,rect.height)*100,0,100);
 target.style.setProperty('--neural-x',x.toFixed(1)+'%');
 target.style.setProperty('--neural-y',y.toFixed(1)+'%');
}
function flush(){
 frame=0;
 if(pending)position(pending.target,pending.event);
 pending=null;
}
if(host){
 // Decorative SVG traces form subtle connective tissue behind the three entry paths.
 const ns='http://www.w3.org/2000/svg';
 const svg=document.createElementNS(ns,'svg');
 svg.setAttribute('class','signal-index-trace');
 svg.setAttribute('viewBox','0 0 1000 400');
 svg.setAttribute('preserveAspectRatio','none');
 svg.setAttribute('aria-hidden','true');
 const path=document.createElementNS(ns,'path');
 path.setAttribute('d','M90 310 Q300 65 510 205 T930 95 M150 110 Q490 365 850 315');
 svg.append(path);
 for(const [x,y] of [[90,310],[510,205],[930,95],[150,110],[850,315]]){
  const dot=document.createElementNS(ns,'circle');
  dot.setAttribute('cx',String(x));dot.setAttribute('cy',String(y));dot.setAttribute('r','2.5');
  svg.append(dot);
 }
 host.insertBefore(svg,host.firstChild);
 host.addEventListener('pointermove',e=>{
   if(!fine.matches||reduce.matches)return;
   const rect=host.getBoundingClientRect();
   host.style.setProperty('--signal-focus-x',((e.clientX-rect.left)/Math.max(1,rect.width)*100).toFixed(1)+'%');
   host.style.setProperty('--signal-focus-y',((e.clientY-rect.top)/Math.max(1,rect.height)*100).toFixed(1)+'%');
   host.style.setProperty('--neural-intensity','1');
 },{passive:true});
 host.addEventListener('pointerleave',()=>host.style.setProperty('--neural-intensity','0'),{passive:true});
}
for(const card of cards){
 const glow=document.createElement('span');
 glow.className='neural-reactive-glow';glow.setAttribute('aria-hidden','true');
 card.insertBefore(glow,card.firstChild);
 card.addEventListener('pointermove',event=>{
  if(!fine.matches||reduce.matches)return;
  pending={target:card,event:{clientX:event.clientX,clientY:event.clientY}};
  if(!frame)frame=requestAnimationFrame(flush);
 },{passive:true});
 card.addEventListener('pointerleave',()=>{
  card.style.removeProperty('--neural-x');
  card.style.removeProperty('--neural-y');
 },{passive:true});
 card.addEventListener('pointerdown',event=>{
  if(!fine.matches||reduce.matches)return;
  position(card,event);
  const ring=document.createElement('span');
  ring.className='neural-tap-ring';ring.setAttribute('aria-hidden','true');
  card.append(ring);
  if(ring.animate){
    const animation=ring.animate([
      {opacity:.72,transform:'scale(.45)'},{opacity:0,transform:'scale(5)'}
    ],{duration:500,easing:'ease-out'});
    animation.finished.then(()=>ring.remove()).catch(()=>ring.remove());
  }else ring.remove();
 },{passive:true});
}
})();

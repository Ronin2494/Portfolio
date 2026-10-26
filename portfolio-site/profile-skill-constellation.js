/* Profile and skill theater: explicit clicks only, all content readable without animation. */
(()=>{
'use strict';
const root=document.getElementById('identity-lab');
if(!root)return;
const tabs=[...root.querySelectorAll('[data-profile-tab]')];
const panels=[...root.querySelectorAll('[data-profile-panel]')];
function showTab(index,focus=false){
 tabs.forEach((tab,i)=>{
  const chosen=i===index;tab.setAttribute('aria-selected',String(chosen));
  tab.tabIndex=chosen?0:-1;panels[i].hidden=!chosen;
 });
 if(focus)tabs[index].focus();
}
tabs.forEach((tab,index)=>{
 tab.addEventListener('click',()=>showTab(index));
 tab.addEventListener('keydown',event=>{
  const keys=['ArrowRight','ArrowLeft','Home','End'];
  if(!keys.includes(event.key))return;
  event.preventDefault();
  const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:
   (index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
  showTab(next,true);
 });
});
showTab(0);
const slides=[...root.querySelectorAll('.skill-slide')];
const next=root.querySelector('[data-skill-next]');
const previous=root.querySelector('[data-skill-prev]');
const counter=root.querySelector('[data-skill-counter]');
let active=0;
function display(){
 const size=slides.length;
 slides.forEach((slide,index)=>{
  const depth=(index-active+size)%size;
  slide.dataset.position=String(depth);
  slide.style.setProperty('--skill-depth',String(Math.min(depth,2)));
  slide.hidden=depth>2;
  slide.setAttribute('aria-hidden',String(depth!==0));
  slide.querySelectorAll('a,button').forEach(a=>a.tabIndex=depth===0?0:-1);
 });
 counter.textContent=String(active+1).padStart(2,'0')+' / '+String(size).padStart(2,'0');
}
next.addEventListener('click',()=>{active=(active+1)%slides.length;display();});
previous.addEventListener('click',()=>{active=(active-1+slides.length)%slides.length;display();});
const theater=root.querySelector('.skill-theater');
theater.addEventListener('keydown',event=>{
 if(!['ArrowRight','ArrowLeft'].includes(event.key)||event.target.closest('a,input,textarea'))return;
 event.preventDefault();
 active=(active+(event.key==='ArrowRight'?1:-1)+slides.length)%slides.length;
 display();
});
let swipe=null;
theater.addEventListener('pointerdown',e=>{if(e.target.closest('button,a'))return;swipe={x:e.clientX,y:e.clientY};});
theater.addEventListener('pointerup',e=>{
 if(!swipe)return;
 const dx=e.clientX-swipe.x,dy=e.clientY-swipe.y;swipe=null;
 if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy)*1.3){
  active=(active+(dx<0?1:-1)+slides.length)%slides.length;display();
 }
});
theater.addEventListener('pointercancel',()=>{swipe=null;});
display();
})();
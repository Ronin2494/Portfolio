// Ambient starlight and gentle mouse/scroll parallax for the cinematic scene.
(()=>{
const stage=document.querySelector('.cinematic-scene');
if(!stage)return;
const sky=stage.querySelector('#scene-starlight');
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
// Deterministic positions keep visual continuity between builds.
let seed=6619;const rand=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
for(let i=0;i<38;i++){
 const star=document.createElement('i');star.className='scene-star';
 const sz=1+rand()*3;star.style.setProperty('--sz',sz.toFixed(1)+'px');
 star.style.setProperty('--top',(5+rand()*88).toFixed(2)+'%');
 star.style.setProperty('--left',(31+rand()*67).toFixed(2)+'%');
 star.style.setProperty('--dur',(2.9+rand()*5).toFixed(2)+'s');
 star.style.setProperty('--delay',(-rand()*6).toFixed(2)+'s');
 star.style.setProperty('--tone',rand()>.4?'#ffd7a1':'#a6d1ff');
 sky.appendChild(star);
}
let mx=0,my=0,tx=0,ty=0,scroll=.0,frame=0;
stage.addEventListener('pointermove',e=>{
 if(reduced.matches)return;
 const r=stage.getBoundingClientRect();
 tx=((e.clientX-r.left)/r.width-.5)*-18;
 ty=((e.clientY-r.top)/r.height-.5)*-10;
},{passive:true});
stage.addEventListener('pointerleave',()=>{tx=0;ty=0;},{passive:true});
const draw=()=>{
 frame=requestAnimationFrame(draw);
 if(reduced.matches || document.hidden)return;
 mx+=(tx-mx)*.045;my+=(ty-my)*.045;
 const r=stage.getBoundingClientRect();
 if(r.bottom<0 || r.top>innerHeight)return;
 const progress=Math.max(0,Math.min(1,(innerHeight-r.top)/(innerHeight+r.height)));
 scroll=((progress-.5)*-21);
 stage.style.setProperty('--scene-x',mx.toFixed(1)+'px');
 stage.style.setProperty('--scene-y',my.toFixed(1)+'px');
 stage.style.setProperty('--scroll-parallax',scroll.toFixed(1)+'px');
};
frame=requestAnimationFrame(draw);
})();
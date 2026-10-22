/* Procedural synapse volume: bounded canvas, infinite deterministic cell field. */
(()=>{
'use strict';
const canvas=document.getElementById('neural-field');
const stage=document.getElementById('portal-stage');
if(!canvas||!stage)return;
const ctx=canvas.getContext('2d',{alpha:false});
if(!ctx)return;
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const smooth=n=>n*n*(3-2*n);
const rand=(x,y,s=0)=>{
  let h=Math.imul(x^Math.imul(s+17,374761393),668265263)^Math.imul(y^Math.imul(s+41,1274126177),2246822519);
  h=Math.imul(h^(h>>>13),1274126177);
  return ((h^(h>>>16))>>>0)/4294967296;
};
let width=0,height=0,dpr=1,phase=0,last=0,lastDraw=0,lastProgress=-1;
function resize(){
  width=Math.max(1,canvas.clientWidth);height=Math.max(1,canvas.clientHeight);
  dpr=Math.min(window.devicePixelRatio||1,window.innerWidth<700?1.25:1.5);
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);lastProgress=-1;
}
const cellNode=(x,y,space,dx,dy,seed)=>{
 const rx=(rand(x,y,seed)-.5)*.5,ry=(rand(x,y,seed+1)-.5)*.5;
 return {x:width*.5+(x+rx+dx)*space,y:height*.48+(y+ry+dy)*space,
 energy:rand(x,y,seed+11),tone:rand(x,y,seed+15)};
};
function layer(level,p,t){
 const space=[19,50,126][level]*(1+smooth(p)*[2.5,5,8][level]);
 const dx=Math.sin(p*3.4+level*.7)*(.08+p*.65);
 const dy=Math.cos(p*2.3+level*.8)*(.08+p*.5);
 const left=Math.floor(-width/(space*2)-dx)-2,right=Math.ceil(width/(space*2)-dx)+2;
 const top=Math.floor(-height/(space*2)-dy)-2,bottom=Math.ceil(height/(space*2)-dy)+2;
 const opacity=[.19,.32,.46][level]*(1-p*.16);
 const budget=window.innerWidth<700?1450:3100;
 let count=0;
 for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){
   if(++count>budget)return;
   if(level===0&&rand(x,y,19)<.26)continue;
   const a=cellNode(x,y,space,dx,dy,level*51+11);
   if(a.x< -space||a.x>width+space||a.y< -space||a.y>height+space)continue;
   const n=rand(x,y,level+64);
   for(let c=0;c<(level===0?1:n>.33?2:1);c++){
     const b=cellNode(x+1,y+(c===1?1:n>.5?0:-1),space,dx,dy,level*51+11);
     const controlX=(a.x+b.x)*.5+(a.energy-.5)*space*.15;
     const controlY=(a.y+b.y)*.5+(a.tone-.5)*space*.15;
     ctx.strokeStyle='rgba(151,181,224,'+(opacity*.56)+')';ctx.lineWidth=level===2?.9:.55;
     ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo(controlX,controlY,b.x,b.y);ctx.stroke();
     if(level>0&&a.energy>.91&&!reduced.matches){
       const pos=(t*.082+rand(x,y,c+82))%1,inv=1-pos;
       const bx=inv*inv*a.x+2*inv*pos*controlX+pos*pos*b.x;
       const by=inv*inv*a.y+2*inv*pos*controlY+pos*pos*b.y;
       ctx.beginPath();ctx.fillStyle='rgba(193,235,223,'+(.12+pos*.31)+')';
       ctx.arc(bx,by,level===2?1.4:1,0,Math.PI*2);ctx.fill();
     }
   }
   ctx.beginPath();
   ctx.fillStyle=a.tone>.84?'rgba(170,240,220,'+(opacity+.2)+')':'rgba(207,202,255,'+(opacity+.2)+')';
   ctx.arc(a.x,a.y,(level===2?2:level===1?1.35:.7)*(1+p*.14),0,Math.PI*2);ctx.fill();
   if(level===2&&a.energy>.88){
     ctx.beginPath();ctx.strokeStyle='rgba(175,216,245,'+(opacity*.36)+')';
     ctx.lineWidth=.8;ctx.arc(a.x,a.y,6,0,Math.PI*2);ctx.stroke();
   }
 }
}
function draw(p){
 ctx.fillStyle='#030711';ctx.fillRect(0,0,width,height);
 const fog=ctx.createRadialGradient(width*.5,height*.45,4,width*.5,height*.45,Math.max(width,height)*.75);
 fog.addColorStop(0,'rgba(27,32,70,.20)');fog.addColorStop(.5,'rgba(12,18,43,.29)');
 fog.addColorStop(1,'rgba(1,3,11,.87)');ctx.fillStyle=fog;ctx.fillRect(0,0,width,height);
 for(let i=0;i<3;i++)layer(i,p,phase);
 const vignette=ctx.createRadialGradient(width*.5,height*.45,Math.min(width,height)*.12,width*.5,height*.45,Math.max(width,height)*.75);
 vignette.addColorStop(0,'rgba(3,5,12,.02)');vignette.addColorStop(1,'rgba(0,2,9,.88)');
 ctx.fillStyle=vignette;ctx.fillRect(0,0,width,height);
}
function frame(time){
 if(!canvas.isConnected)return;
 requestAnimationFrame(frame);
 if(document.hidden)return;
 const p=clamp(Number(stage.dataset.neuralProgress)||0,0,1);
 const frozen=reduced.matches||stage.dataset.neuralPaused==='true';
 if(!frozen)phase+=last?Math.min(40,time-last)/1000:0;
 last=time;
 if(frozen&&Math.abs(p-lastProgress)<.001)return;
 if(!frozen&&time-lastDraw<30)return;
 lastDraw=time;draw(p);lastProgress=p;
}
resize();window.addEventListener('resize',resize,{passive:true});
draw(0);requestAnimationFrame(frame);
window.PortfolioNeural={resize};
})();
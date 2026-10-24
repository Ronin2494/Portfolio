const journey=document.getElementById('portal-journey');
const stage=document.getElementById('portal-stage');
const canvas=document.getElementById('universe');
const portalCopy=document.getElementById('portal-copy');
const handoff=document.querySelector('.portal-handoff');
const motionButton=document.getElementById('motion-toggle');
const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
const coarse=window.matchMedia('(pointer: coarse)').matches;
let progress=0, target=0, paused=false, scene=null;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const ease=(a,b,t)=>a+(b-a)*t;

// Desktop scroll scrubbing: keep the opening fixed until its last frame has
// been rendered. Mobile/touch and reduced-motion users keep native scrolling.
const virtualPortal=!coarse&&!reduceMotion.matches&&window.matchMedia('(min-width: 800px) and (hover: hover) and (pointer: fine)').matches;
const htmlRoot=document.documentElement;
let introReleased=false, finalFrameStartedAt=0;
let lastScrollY=window.scrollY;
const portalHeight=()=>Math.max(1,journey.offsetHeight);
const isPortalStartHash=()=>location.hash==='#portal-journey'||location.hash==='#universe';
if(virtualPortal){
  htmlRoot.classList.add('portal-virtual-scroll');
  const directLink=location.hash&&!isPortalStartHash();
  if(directLink||window.scrollY>2){
    introReleased=true;target=progress=1;
  }else{
    htmlRoot.classList.add('portal-scroll-locked');
  }
}
function advanceIntro(delta){
  // A trackpad fling or a large wheel notch must not skip the cinematic frames.
  const travel=Math.max(1800,window.innerHeight*2.25);
  target=clamp(target+clamp(delta,-170,170)/travel,0,1);
  if(target<1)finalFrameStartedAt=0;
}
function reenterIntro(delta=0, reset=false){
  if(!virtualPortal)return;
  // Returning from the work area makes the same 3D timeline reversible.
  // Start at the completed frame and scrub backward with the user's gesture.
  introReleased=false;
  finalFrameStartedAt=0;
  target=progress=reset?0:1;
  htmlRoot.classList.add('portal-scroll-locked');
  window.scrollTo({top:0,left:0,behavior:'instant'});
  lastScrollY=0;
  if(delta)advanceIntro(delta);
}
function releaseIntro(skip=false){
  if(!virtualPortal||introReleased)return;
  introReleased=true;
  finalFrameStartedAt=0;
  target=1;
  if(skip)progress=1;
  htmlRoot.classList.remove('portal-scroll-locked');
  if(!skip){
    // Wait until the full handoff animation has been rendered, then enter work.
    requestAnimationFrame(()=>{
      document.getElementById('work')?.scrollIntoView({behavior:'smooth',block:'start'});
    });
  }
}
function updateScroll(){
  if(!virtualPortal){
    const distance=Math.max(1,journey.offsetHeight-window.innerHeight);
    target=clamp(-journey.getBoundingClientRect().top/distance,0,1);
    return;
  }
  const y=window.scrollY;
  // Wheel momentum, keyboard navigation and browser scrollbars can cross the
  // work/portal boundary without another wheel event. Catch that boundary.
  if(introReleased&&y<lastScrollY-1&&y<portalHeight()-3){
    reenterIntro();
    return;
  }
  lastScrollY=y;
}
if(virtualPortal){
  document.addEventListener('wheel',event=>{
    if(event.ctrlKey||event.metaKey)return; // preserve pinch-to-zoom
    const pixels=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?window.innerHeight:1);
    if(introReleased){
      // Native page scrolling is allowed, except at the top edge of work.
      // An upward wheel gesture at the boundary re-enters the last frame.
      if(pixels>=0||window.scrollY>portalHeight()+4)return;
      event.preventDefault();
      reenterIntro(pixels);
      return;
    }
    event.preventDefault();
    advanceIntro(pixels);
  },{passive:false,capture:true});
  document.addEventListener('keydown',event=>{
    if(event.altKey||event.ctrlKey||event.metaKey||event.defaultPrevented)return;
    if(event.target?.closest?.('a,button,input,textarea,select,[contenteditable="true"]'))return;
    const moves={'ArrowDown':96,'PageDown':460,' ':460,'ArrowUp':-96,'PageUp':-460};
    const key=event.key;
    if(introReleased){
      if((key==='ArrowUp'||key==='PageUp'||(key===' '&&event.shiftKey))&&window.scrollY<=portalHeight()+4){
        event.preventDefault();
        reenterIntro(key==='ArrowUp'?-96:-460);
      }else if(key==='Home'&&window.scrollY<=portalHeight()+4){
        event.preventDefault();
        reenterIntro(0,true);
      }
      return;
    }
    if(Object.prototype.hasOwnProperty.call(moves,key)){
      event.preventDefault();
      advanceIntro(key===' '&&event.shiftKey?-460:moves[key]);
    }else if(key==='End'||key==='Home'){
      event.preventDefault();
      target=key==='End'?1:0;
      finalFrameStartedAt=0;
    }
  },{capture:true});
  document.addEventListener('click',event=>{
    const link=event.target?.closest?.('a[href^="#"]');
    if(!link||!link.hash)return;
    if(link.hash==='#portal-journey'||link.hash==='#universe'){
      reenterIntro(0,true); // "Back to the universe" restarts the opening
    }else{
      releaseIntro(true); // "Enter the Work" and other links still skip it
    }
  },{capture:true});
  window.addEventListener('hashchange',()=>{
    if(isPortalStartHash()){
      reenterIntro(0,true);
    }else if(location.hash){
      releaseIntro(true);
    }
  });
  window.addEventListener('pageshow',()=>{
    if(window.scrollY>2&&window.scrollY>=portalHeight()-3)releaseIntro(true);
  });
}
// Hands-free entrance: after two idle seconds, play the EXISTING scroll timeline.
// Deliberate input always wins; auto-navigation never restarts on reverse scroll.
// Respect reduced-motion users by leaving navigation manual, with a skip link.
const HERO_IDLE_DELAY=2000;
const HERO_AUTO_DURATION=5500;
let heroAutoTimer=0,heroAutoFrame=0,heroAutoActive=false,heroAutoCancelled=false;
function stopHeroAuto(){
  heroAutoCancelled=true;
  window.clearTimeout(heroAutoTimer);
  if(heroAutoFrame)cancelAnimationFrame(heroAutoFrame);
  if(heroAutoActive&&virtualPortal&&!introReleased){
    target=progress; // Give control back at the EXACT visible frame.
    finalFrameStartedAt=0;
  }
  heroAutoActive=false;heroAutoFrame=0;
}
function startHeroAuto(){
  if(heroAutoCancelled||introReleased||paused||reduceMotion.matches||
     document.hidden||location.hash&&!isPortalStartHash()||window.scrollY>2)return;
  heroAutoActive=true;
  const startProgress=virtualPortal?progress:0;
  const startScroll=window.scrollY;
  let began=0;
  const work=document.getElementById('work');
  const animate=(timestamp)=>{
    if(!heroAutoActive||heroAutoCancelled||paused||document.hidden)return;
    if(!began)began=timestamp;
    const elapsed=clamp((timestamp-began)/HERO_AUTO_DURATION,0,1);
    const eased=elapsed*elapsed*(3-2*elapsed);
    if(virtualPortal){
      target=startProgress+(1-startProgress)*eased;
      if(elapsed===1)target=1; // Existing 300ms final-frame handoff releases it.
    }else if(work){
      const workTop=work.getBoundingClientRect().top+window.scrollY;
      const destination=Math.max(0,workTop-startScroll);
      window.scrollTo({top:startScroll+destination*eased,left:0,behavior:'instant'});
    }
    if(elapsed<1){heroAutoFrame=requestAnimationFrame(animate);}
    else{heroAutoActive=false;heroAutoFrame=0;}
  };
  heroAutoFrame=requestAnimationFrame(animate);
}
if(!reduceMotion.matches&&!introReleased&&window.scrollY<=2&&
   (!location.hash||isPortalStartHash())){
  heroAutoTimer=window.setTimeout(startHeroAuto,HERO_IDLE_DELAY);
  // Capture user intent before the existing wheel/keyboard scroll handlers.
  for(const eventName of ['wheel','touchstart','pointerdown','keydown']){
    document.addEventListener(eventName,stopHeroAuto,{capture:true,passive:true,once:true});
  }
  document.addEventListener('focusin',stopHeroAuto,{capture:true,passive:true,once:true});
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden)stopHeroAuto();
  },{passive:true});
  window.addEventListener('scroll',()=>{
    if(!heroAutoActive&&window.scrollY>2)stopHeroAuto();
  },{passive:true});
}
window.addEventListener('scroll',updateScroll,{passive:true});
window.addEventListener('resize',updateScroll,{passive:true});
updateScroll();
function initVisibility(){let els=[...document.querySelectorAll('.section-reveal')];if(!('IntersectionObserver'in window)){els.forEach(e=>e.classList.add('is-visible'));return}let obs=new IntersectionObserver(entries=>{for(const e of entries)if(e.isIntersecting){e.target.classList.add('is-visible');obs.unobserve(e.target)}},{threshold:.08,rootMargin:'0px 0px -30px 0px'});els.forEach(e=>obs.observe(e))}
initVisibility();document.getElementById('year').textContent=new Date().getFullYear();
motionButton.addEventListener('click',()=>{stopHeroAuto();paused=!paused;motionButton.innerHTML=paused?'RESUME MOTION <span aria-hidden="true">▶</span>':'PAUSE MOTION <span aria-hidden="true">Ⅱ</span>';motionButton.setAttribute('aria-label',paused?'Resume portal animation':'Pause portal animation');motionButton.setAttribute('aria-pressed',String(paused))});
function animateUI(timestamp){
  const t=reduceMotion.matches?Math.max(target,.01):(progress=ease(progress,target,target>=.999?.16:.08));
  const exit=clamp((t-.55)/.32,0,1);
  portalCopy.style.opacity=String(1-clamp((t-.09)/.49,0,1));
  portalCopy.style.transform=`translate(-50%,-50%) scale(${1+t*.8})`;
  stage.querySelector('.portal-frame').style.opacity=String(1-t*.95);
  handoff.style.opacity=String(clamp((t-.76)/.16,0,1));
  handoff.style.transform=`scale(${1.35-.35*exit})`;
  // Start the branded handoff only when it actually enters the viewport.
  // The SVG motion is lightweight, accessible, and stays sharp on retina displays.
  handoff.classList.toggle('handoff-active',t>.76);
  // Neural preview reads the same scrubbed camera progress; do not change navigation timing.
  if(document.documentElement.classList.contains('neural-preview')){
    stage.dataset.neuralProgress=String(t);
    stage.dataset.neuralPaused=String(paused);
  }
  if(scene)scene.render(t,paused);
  // The logo reveal plays while the portal finishes. A brief 300ms
  // settle is enough for visual continuity—do not strand visitors on a
  // motion-complete frame for nearly two extra seconds.
  if(virtualPortal&&!introReleased&&target>=1&&t>=.99){
    if(!finalFrameStartedAt)finalFrameStartedAt=timestamp;
    if(timestamp-finalFrameStartedAt>=300)releaseIntro();
  }else if(!introReleased){
    finalFrameStartedAt=0;
  }
  requestAnimationFrame(animateUI);
}
function canvasFallback(){const c=canvas.getContext('2d');if(!c)return {render:()=>{}};let stars=[];let W=0,H=0;function resize(){const dpr=Math.min(window.devicePixelRatio||1,2);W=canvas.clientWidth;H=canvas.clientHeight;canvas.width=W*dpr;canvas.height=H*dpr;c.setTransform(dpr,0,0,dpr,0,0);stars=Array.from({length:coarse?1700:3200},(_,i)=>{const rad=Math.sqrt((i+.5)/ (coarse?1700:3200))*Math.min(W,H)*.65;const ang=i*2.39996;return {a:ang,r:rad,sz:(Math.random()*.85+.3),color:i%7===0?'#e2f89f':i%5===0?'#91a9fe':'#ded4ff'}})}resize();window.addEventListener('resize',resize);let frame=0;return {render(p,halt){c.clearRect(0,0,W,H);if(!halt&&!reduceMotion.matches)frame+=.002;let f=1+p*7;for(let i=0;i<stars.length;i++){const s=stars[i],a=s.a+frame+s.r*.004+p*5,x=W/2+Math.cos(a)*s.r*f,y=H/2+Math.sin(a)*s.r*f*.56;if(x<0||x>W||y<0||y>H)continue;c.globalAlpha=clamp(1-s.r/(Math.min(W,H)*.8),.12,.85)*(1-p*.55);c.fillStyle=s.color;c.beginPath();c.arc(x,y,s.sz*(.8+p),0,6.29);c.fill()}c.globalAlpha=1;const grd=c.createRadialGradient(W/2,H/2,1,W/2,H/2,Math.min(W,H)*(.22+p*.5));grd.addColorStop(0,'#edf9ef66');grd.addColorStop(.1,'#bcb0ff44');grd.addColorStop(.5,'#7355ba17');grd.addColorStop(1,'#00000000');c.fillStyle=grd;c.fillRect(0,0,W,H)}}}
async function setupWebGL(){try{const THREE=await import('https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js');if(!canvas.isConnected)return null;const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:!coarse,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(window.devicePixelRatio,coarse?1.5:2));renderer.setSize(canvas.clientWidth,canvas.clientHeight);renderer.setClearColor(0x000000,0);const universe=new THREE.Scene();const cam=new THREE.PerspectiveCamera(65,canvas.clientWidth/canvas.clientHeight,.1,600);cam.position.set(0,7,62);cam.lookAt(0,0,0);
const count=coarse?7000:15000;const pos=new Float32Array(count*3),col=new Float32Array(count*3),sizes=new Float32Array(count);const hues=[new THREE.Color('#cbc6ff'),new THREE.Color('#8c83ef'),new THREE.Color('#f6e7c5'),new THREE.Color('#91ccff'),new THREE.Color('#e1f8a8')];for(let i=0;i<count;i++){const arm=i%5;const norm=Math.pow(Math.random(),.68);const radius=2+norm*57;const ang=arm*Math.PI*2/5+radius*.23+(Math.random()-.5)*(.35+radius*.03);const spread=(Math.random()-.5)*(.7+radius*.08);pos[i*3]=Math.cos(ang)*radius+Math.cos(ang+Math.PI/2)*spread;pos[i*3+1]=(Math.random()-.5)*(.4+radius*.105);pos[i*3+2]=Math.sin(ang)*radius+Math.sin(ang+Math.PI/2)*spread;const color=hues[(arm+(i%13===0?2:0))%hues.length].clone().lerp(new THREE.Color('#ffffff'),Math.random()*.38);col[i*3]=color.r;col[i*3+1]=color.g;col[i*3+2]=color.b;sizes[i]=Math.random()*.7+.35}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('color',new THREE.BufferAttribute(col,3));const mat=new THREE.PointsMaterial({size:coarse?.19:.22,sizeAttenuation:true,vertexColors:true,transparent:true,opacity:.88,depthWrite:false,blending:THREE.AdditiveBlending});const gal=new THREE.Points(geo,mat);gal.rotation.x=-.33;universe.add(gal);
let core=new THREE.Mesh(new THREE.SphereGeometry(2.4,24,24),new THREE.MeshBasicMaterial({color:0xc7bcff,transparent:true,opacity:.24,blending:THREE.AdditiveBlending}));universe.add(core);const ringGeo=new THREE.TorusGeometry(9,.045,5,170);const ringMat=new THREE.MeshBasicMaterial({color:0xaca1e5,transparent:true,opacity:.31});for(let j=0;j<3;j++){const ring=new THREE.Mesh(ringGeo,ringMat);ring.rotation.x=Math.PI/2+j*.22;ring.rotation.y=j*.5;ring.scale.setScalar(1+j*.7);universe.add(ring)}
let dustCount=coarse?800:1300,dustPos=new Float32Array(dustCount*3);for(let i=0;i<dustCount;i++){dustPos[i*3]=(Math.random()-.5)*160;dustPos[i*3+1]=(Math.random()-.5)*100;dustPos[i*3+2]=(Math.random()-.5)*140}const dg=new THREE.BufferGeometry();dg.setAttribute('position',new THREE.BufferAttribute(dustPos,3));const dust=new THREE.Points(dg,new THREE.PointsMaterial({color:0xc7d8ff,size:.11,transparent:true,opacity:.45}));universe.add(dust);
function resize(){const w=canvas.clientWidth,h=canvas.clientHeight;cam.aspect=w/h;cam.updateProjectionMatrix();renderer.setSize(w,h,false)}window.addEventListener('resize',resize);resize();let phase=0;return{render(p,halt){if(!halt&&!reduceMotion.matches)phase+=.0017;const spiral=p*p*(3-2*p);gal.rotation.y=phase*.58+spiral*6.5;gal.rotation.z=Math.sin(phase*.6)*.07+p*.5;gal.rotation.x=-.32+spiral*.43;cam.position.set(Math.sin(spiral*4.2)*13,7-spiral*6,62-spiral*59);cam.lookAt(0,0,0);gal.scale.setScalar(1+spiral*.42);mat.opacity=.89-clamp((p-.67)*2,0,.75);core.scale.setScalar(1+spiral*3);renderer.render(universe,cam)}}}catch(e){console.info('Using compatible canvas portal fallback',e);return null}}
if(document.documentElement.classList.contains('neural-preview')){
  // Keep the entire existing scroll controller, handoff, reverse-scroll and pause logic.
  // Skip loading an invisible Three.js galaxy underneath the neural canvas.
  scene={render:()=>{}};
}else{
  setupWebGL().then(result=>{if(result){scene=result}else{scene=canvasFallback()} });
}
requestAnimationFrame(animateUI);
// Small straw-hat adventurer orbiting the cinematic creative-identity scene.
const brandStage=document.querySelector('.brand-showcase');
const brandRunner=document.querySelector('.brand-runner');
let brandAngle=-Math.PI/2, brandLastFrame=0, brandWidth=0, brandHeight=0;
if(brandStage&&brandRunner){
  const measure=()=>{brandWidth=brandStage.clientWidth;brandHeight=brandStage.clientHeight;};
  measure();window.addEventListener('resize',measure,{passive:true});
  if('ResizeObserver'in window)new ResizeObserver(measure).observe(brandStage);
  const tickRunner=(timestamp)=>{
    const elapsed=brandLastFrame?Math.min((timestamp-brandLastFrame)/1000,.06):0;
    brandLastFrame=timestamp;
    if(!reduceMotion.matches&&!paused&&!document.hidden)brandAngle+=elapsed*(2*Math.PI/12);
    const isSmall=window.innerWidth<=700;
    const radiusX=brandWidth*(isSmall?.45:.41);
    const radiusY=brandHeight*.38;
    const x=Math.cos(brandAngle)*radiusX;
    const y=Math.sin(brandAngle)*radiusY;
    const scale=Math.sin(brandAngle)>0?1:.87;
    const facing=-Math.sin(brandAngle)>=0?1:-1;
    brandRunner.style.transform=`translate(calc(-50% + ${x.toFixed(1)}px),calc(-50% + ${y.toFixed(1)}px)) scale(${(scale*facing).toFixed(2)},${scale.toFixed(2)})`;
    brandRunner.style.zIndex=Math.sin(brandAngle)>0?'5':'1';
    requestAnimationFrame(tickRunner);
  };
  requestAnimationFrame(tickRunner);
}
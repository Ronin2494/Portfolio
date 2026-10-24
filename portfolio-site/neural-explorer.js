/* Graph relationships are explicit; project names/descriptions/links come from the live DOM. */
(()=>{
'use strict';
const root=document.getElementById('neural-explorer');
if(!root)return;
const viewport=root.querySelector('[data-explorer-viewport]');
const world=root.querySelector('[data-explorer-world]');
const linksLayer=root.querySelector('[data-explorer-links]');
const nodesLayer=root.querySelector('[data-explorer-nodes]');
const detail=root.querySelector('[data-explorer-detail]');
const live=root.querySelector('[data-explorer-live]');
const reset=root.querySelector('[data-explorer-reset]');
const back=root.querySelector('[data-explorer-back]');
const zoomIn=root.querySelector('[data-explorer-zoom-in]');
const zoomOut=root.querySelector('[data-explorer-zoom-out]');
const fit=root.querySelector('[data-explorer-fit]');
const all=root.querySelector('[data-explorer-all]');
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
const coarse=window.matchMedia('(pointer: coarse)');
const ns='http://www.w3.org/2000/svg';
const positions=[[13,23],[34,14],[60,16],[83,30],[77,69],[47,81],[22,70],[45,46],[61,51],[34,57]];
const connections=[
 ['footnow','buildingai'],['footnow','groundloop'],['footnow','seatpath'],
 ['lyricsverse','rhythm'],['lyricsverse','curiosity'],['seatpath','groundloop'],
 ['seatpath','buildingai'],['buildingai','groundloop'],
 ['rhythm','presence'],['rhythm','curiosity'],['movement','presence'],
 ['movement','seatpath'],['presence','curiosity'],['curiosity','groundloop'],
 ['footnow','curiosity'],['buildingai','curiosity']
];
const ids=['footnow','lyricsverse','seatpath','groundloop','buildingai','other','rhythm','movement','presence','curiosity'];
const interests={
 rhythm:{title:'Rhythm',kind:'CREATIVE WORLD',description:'Singing, rap, writing, and the original voice behind the products.',destination:'#beyond'},
 movement:{title:'Movement',kind:'DAILY LIFE',description:'Tracking real daily steps, energy, and the rituals that keep me moving.',destination:'#beyond'},
 presence:{title:'Presence',kind:'REFLECTION',description:'Meditation, attention, and finding the quiet behind the noise.',destination:'#beyond'},
 curiosity:{title:'Curiosity',kind:'IDEAS & QUESTIONS',description:'Questions, philosophy, and unexpected connections between things.',destination:'#beyond'}
};
const cards=[...document.querySelectorAll('#project-grid > .tile')];
const projects=cards.map((card,index)=>{
 const heading=card.querySelector('.tile-text h3');
 const title=heading?.textContent?.replace(/↗/g,'').trim()||'Project';
 const name=title.toLowerCase();
 const known=name.includes('footnow')?'footnow':
   name.includes('lyricsverse')?'lyricsverse':name.includes('seatpath')?'seatpath':
   name.includes('groundloop')?'groundloop':name.includes('building')?'buildingai':'other';
 return {id:known,title,kind:card.querySelector('.tile-index')?.textContent?.trim()||'SELECTED WORK',
  description:card.querySelector('.tile-text p')?.textContent?.trim()||'Explore this project.',
  destination:card.querySelector('.round-link')?.getAttribute('href')||'#projects',
  tags:[...card.querySelectorAll('.tags span')].map(el=>el.textContent.trim()),
  original:index};
});
const data=new Map([...projects,...Object.entries(interests).map(([id,item])=>({...item,id,tags:[]}))].map(item=>[item.id,item]));
// Position by stable ID, not array iteration or database ordering.
const xy=Object.fromEntries(ids.map((id,i)=>[id,{x:positions[i][0],y:positions[i][1]}]));
const edges=connections.filter(([a,b])=>data.has(a)&&data.has(b));
let selected=null,history=[],scale=1,tx=0,ty=0,pointer=null,moved=false;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const connected=id=>new Set(edges.filter(([a,b])=>a===id||b===id).map(([a,b])=>a===id?b:a));
const make=(tag,cls,text)=>{
 const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;
};
const edgeNodes=[];
for(const [a,b] of edges){
 const line=document.createElementNS(ns,'line');
 line.setAttribute('x1',String(xy[a].x));line.setAttribute('y1',String(xy[a].y));
 line.setAttribute('x2',String(xy[b].x));line.setAttribute('y2',String(xy[b].y));
 line.dataset.a=a;line.dataset.b=b;line.setAttribute('class','neural-explorer-edge');
 linksLayer.append(line);edgeNodes.push(line);
}
const buttons=new Map();
for(const id of ids){
 const item=data.get(id);if(!item)continue;
 const el=make('button','neural-explorer-node '+(interests[id]?'is-interest':'is-project'));
 el.type='button';el.dataset.node=id;el.setAttribute('aria-pressed','false');
 el.setAttribute('aria-label','Explore '+item.title+' connections');
 el.style.left=xy[id].x+'%';el.style.top=xy[id].y+'%';
 const core=make('span','neural-explorer-node-core');
 const caption=make('span','neural-explorer-node-label',item.title);
 el.append(core,caption);
 el.addEventListener('click',()=>{if(!moved)select(id,true);});
 el.addEventListener('keydown',e=>{
  if(!['ArrowRight','ArrowLeft','ArrowUp','ArrowDown','Home','End'].includes(e.key))return;
  e.preventDefault();
  const keys=[...buttons.keys()],i=keys.indexOf(id);
  const next=e.key==='Home'?0:e.key==='End'?keys.length-1:
   (i+(e.key==='ArrowRight'||e.key==='ArrowDown'?1:-1)+keys.length)%keys.length;
  buttons.get(keys[next])?.focus();select(keys[next],true);
 });
 nodesLayer.append(el);buttons.set(id,el);
}
function updateCamera(){
 world.style.transform='translate('+tx+'px,'+ty+'px) scale('+scale+')';
 zoomOut.disabled=scale<=.75;zoomIn.disabled=scale>=2.2;
}
function cameraZoom(next,anchor){
 const value=clamp(next,.75,2.2);
 const rect=viewport.getBoundingClientRect();
 const cx=anchor?.x??rect.width/2,cy=anchor?.y??rect.height/2;
 const factor=value/scale;
 tx=cx-(cx-tx)*factor;ty=cy-(cy-ty)*factor;
 scale=value;updateCamera();
}
const title=detail.querySelector('[data-explorer-title]');
const kind=detail.querySelector('[data-explorer-kind]');
const summary=detail.querySelector('[data-explorer-summary]');
const related=detail.querySelector('[data-explorer-related]');
const action=detail.querySelector('[data-explorer-action]');
const counter=detail.querySelector('[data-explorer-counter]');
const intro=detail.querySelector('[data-explorer-intro]');
function paint(){
 const nearby=selected?connected(selected):new Set();
 for(const [id,button] of buttons){
  const active=selected===id,adjacent=nearby.has(id);
  button.classList.toggle('is-selected',active);
  button.classList.toggle('is-related',adjacent);
  button.classList.toggle('is-muted',Boolean(selected&&!active&&!adjacent));
  button.setAttribute('aria-pressed',String(active));
 }
 for(const edge of edgeNodes){
  const active=selected&&(edge.dataset.a===selected||edge.dataset.b===selected);
  edge.classList.toggle('is-active',Boolean(active));
  edge.classList.toggle('is-muted',Boolean(selected&&!active));
 }
 if(!selected){
  detail.classList.remove('has-selection');
  title.textContent='Select a neuron';
  kind.textContent='DISCOVER THE NETWORK';
  summary.textContent='Choose a project or idea. Related neurons will light up, revealing how the worlds connect.';
  related.replaceChildren();
  action.hidden=true;counter.textContent=buttons.size+' CONNECTED WORLDS';
  intro.hidden=false;back.disabled=true;
  live.textContent='Showing the complete network.';
  return;
 }
 const item=data.get(selected),neighbors=[...nearby].filter(id=>buttons.has(id));
 detail.classList.add('has-selection');
 intro.hidden=true;
 kind.textContent=item.kind;
 title.textContent=item.title;
 summary.textContent=item.description;
 related.replaceChildren();
 for(const id of neighbors){
  const target=data.get(id);
  const button=make('button','neural-explorer-related',target.title+' ↗');
  button.type='button';button.addEventListener('click',()=>{select(id,true);buttons.get(id)?.focus();});
  related.append(button);
 }
 action.href=item.destination;
 action.textContent=item.destination.startsWith('#')?'GO TO EXPERIENCE ↗':'VISIT '+item.title.toUpperCase()+' ↗';
 if(!item.destination.startsWith('#')){
  action.target='_blank';action.rel='noopener noreferrer';
 }else{
  action.removeAttribute('target');action.removeAttribute('rel');
 }
 action.hidden=false;back.disabled=history.length===0;
 counter.textContent=neighbors.length+' CONNECTED '+(neighbors.length===1?'WORLD':'WORLDS');
 live.textContent=item.title+' selected. '+neighbors.length+' related worlds are now highlighted.';
}
function select(id,remember=false){
 if(!data.has(id))return;
 if(remember&&selected&&selected!==id){history.push(selected);if(history.length>20)history.shift();}
 selected=id;paint();
}
function showAll(){
 selected=null;history=[];paint();
}
reset.addEventListener('click',()=>{showAll();tx=0;ty=0;scale=1;updateCamera();});
all.addEventListener('click',showAll);
back.addEventListener('click',()=>{
 const last=history.pop();if(last)select(last);
});
zoomIn.addEventListener('click',()=>cameraZoom(scale*1.2));
zoomOut.addEventListener('click',()=>cameraZoom(scale/1.2));
fit.addEventListener('click',()=>{tx=0;ty=0;scale=1;updateCamera();});
viewport.addEventListener('wheel',e=>{
 // Zoom only on explicit Ctrl/Command + wheel so normal scrolling is untouched.
 if(!e.ctrlKey&&!e.metaKey)return;
 e.preventDefault();
 const rect=viewport.getBoundingClientRect();
 cameraZoom(scale*(e.deltaY>0?.9:1.1),{x:e.clientX-rect.left,y:e.clientY-rect.top});
},{passive:false});
viewport.addEventListener('pointerdown',e=>{
 if(e.button!==0||e.target.closest('button,a'))return;
 pointer={x:e.clientX,y:e.clientY,tx,ty,id:e.pointerId};
 moved=false;
 viewport.setPointerCapture?.(e.pointerId);
});
viewport.addEventListener('pointermove',e=>{
 if(!pointer||pointer.id!==e.pointerId)return;
 const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;
 if(Math.abs(dx)+Math.abs(dy)>5)moved=true;
 tx=clamp(pointer.tx+dx,-viewport.clientWidth*.45,viewport.clientWidth*.45);
 ty=clamp(pointer.ty+dy,-viewport.clientHeight*.40,viewport.clientHeight*.40);
 updateCamera();
});
const endDrag=()=>{pointer=null;window.setTimeout(()=>{moved=false;},0);};
viewport.addEventListener('pointerup',endDrag);
viewport.addEventListener('pointercancel',endDrag);
viewport.addEventListener('keydown',e=>{
 if(e.target!==viewport)return;
 if(e.key==='+'||e.key==='='){e.preventDefault();cameraZoom(scale*1.2);}
 if(e.key==='-'){e.preventDefault();cameraZoom(scale/1.2);}
 if(e.key==='Escape'){e.preventDefault();showAll();}
});
paint();updateCamera();
})();

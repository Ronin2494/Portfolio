import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import vm from 'node:vm';
import {test} from 'node:test';

const root=resolve(import.meta.dirname,'..');
const html=readFileSync(resolve(root,'index.html'),'utf8');
const css=readFileSync(resolve(root,'portfolio-experience.css'),'utf8');
const js=readFileSync(resolve(root,'portfolio-experience.js'),'utf8');
const activity=readFileSync(resolve(root,'beyond.js'),'utf8');

test('01 / constellation preserves existing project cards, destinations and a no-JS fallback',()=>{
  assert.match(html,/id="project-constellation" hidden/);
  assert.match(html,/id="project-grid"/);
  assert.match(html,/id="experience-view-toggle"[^>]*hidden/);
  assert.match(html,/data-project-view="constellation"/);
  assert.match(html,/data-project-view="grid"/);
  const section=html.slice(html.indexOf('<section id="projects"'),html.indexOf('<section class="manifesto"'));
  assert.equal((section.match(/<article class="tile /g)||[]).length,6);
  for(const host of ['footnow.onrender.com','lyricsverse.onrender.com','seatpath.onrender.com','catalystimmigration.onrender.com']){
    assert.ok(section.includes(host));
  }
  assert.match(js,/tiles\.map\(\(tile,i\)=>/);
  assert.match(js,/constellation\.hidden=!isMap/);
  assert.match(js,/grid\.hidden=isMap/);
  assert.match(js,/ArrowRight/);
  assert.match(js,/aria-pressed/);
  assert.match(css,/\.bento\[hidden\].*display:none!important/);
});

test('02 / theater is on-demand, focused, reversible, and plays only the original film',()=>{
  const section=html.slice(html.indexOf('<section id="creative"'),html.indexOf('<section id="membership"'));
  assert.equal((section.match(/<iframe\b/g)||[]).length,1);
  assert.match(section,/id="enter-film-theater"/);
  assert.match(section,/<dialog class="film-theater" id="film-theater" aria-modal="true"/);
  assert.match(section,/id="film-theater-screen"/);
  assert.match(section,/id="close-film-theater"/);
  assert.match(js,/screen\.replaceChildren\(\)/);
  assert.match(js,/embedded\.setAttribute\('src','about:blank'\)/);
  assert.match(js,/theater\.showModal\(\)/);
  assert.match(js,/film-theater-screen/);
  assert.match(js,/VAUABrdYU6U/);
  assert.match(css,/\.film-theater::backdrop/);
});

test('03 / dock provides four existing navigational destinations and closes on Escape',()=>{
  assert.match(html,/class="personal-dock" id="personal-dock"/);
  assert.match(html,/id="dock-trigger" aria-expanded="false" aria-controls="dock-panel"/);
  assert.match(html,/id="dock-panel"[^>]*hidden/);
  const dock=html.slice(html.indexOf('<div class="personal-dock"'),html.indexOf('<script src="scene.js"'));
  for(const id of ['projects','creative','beyond','connect'])assert.ok(dock.includes('href="#'+id+'"'));
  assert.match(js,/dockPanel\.hidden=!open/);
  assert.match(js,/event\.key==='Escape'/);
});

test('04 and 06 / kinetic and unified motion respect reduced motion and scroll progress',()=>{
  assert.match(html,/class="kinetic-line"/);
  for(const word of ['CREATE','QUESTION','BUILD','EXPLORE'])assert.ok(html.includes('<span>'+word+'</span>'));
  assert.match(html,/id="experience-progress" aria-hidden="true"/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/--experience-ease:/);
  assert.match(js,/motion\.matches/);
  assert.match(js,/window\.requestAnimationFrame\(paint\)/);
  assert.match(js,/scaleX\('/);
});

test('05 / activity keeps exactly two cards, dates, seven-day recorded trends, and no invented steps',()=>{
  const m=activity.slice(activity.indexOf('function renderMovement(){'),activity.indexOf('function renderPresence(){'));
  assert.match(m,/const recent=Array\.from\(\{length:7\}/);
  assert.match(m,/records\.filter\(x=>x\.kind==='activity'/);
  assert.match(m,/DAILY STEPS/);
  assert.match(m,/ACTIVE CALORIES/);
  assert.match(m,/recorded today/);
  assert.match(m,/activity-bar/);
  assert.match(m,/beyond-activity-dial/);
  assert.match(m,/recorded>1&&entry&&maximum>0/);
  assert.match(css,/\.beyond-activity-trend/);
  assert.match(css,/\.beyond-activity-dial/);
});

test('site experience script builds six selected project nodes and maintains accessible selection',()=>{
  class E{
    constructor(kind='div'){this.kind=kind;this.attrs={};this.events={};this.children=[];this.hidden=false;this.textContent='';this.style={setProperty(){},transform:''};this.dataset={};this.href='';}
    setAttribute(k,v){this.attrs[k]=v;}
    getAttribute(k){return this.attrs[k];}
    addEventListener(k,fn){this.events[k]=fn;}
    append(...children){this.children.push(...children);}
    replaceChildren(...children){this.children=[...children];}
    focus(){this.focused=true;}
  }
  const tags=()=>['Music','Discovery'].map(z=>({textContent:z}));
  const tiles=Array.from({length:6},(_,i)=>({
    querySelector(sel){
      if(sel==='.tile-text h3')return {textContent:'Example '+(i+1)};
      if(sel==='.tile-text p')return {textContent:'Description '+(i+1)};
      if(sel==='.round-link')return {href:'https://example.com/'+i,getAttribute:()=>'Open example'};
      if(sel==='.tile-index')return {textContent:'SECTOR '+i};
      if(sel==='.status')return {textContent:'LIVE'};
      if(sel==='.status-live')return {};
      return null;
    },querySelectorAll:tags
  }));
  const elements={};
  for(const id of ['projects','project-grid','work-toolbar','project-constellation','constellation-map','constellation-nodes',
    'experience-view-toggle','constellation-preview-title','constellation-preview-description','constellation-preview-index',
    'constellation-preview-tags','constellation-preview-link','constellation-preview-initials']){
    elements[id]=new E();
  }
  elements['project-grid'].querySelectorAll=()=>tiles;
  const filter=['constellation','grid'].map(view=>{
    const b=new E('button');b.dataset.projectView=view;return b;
  });
  elements['experience-view-toggle'].querySelectorAll=()=>filter;
  const document={getElementById:id=>elements[id]||null,createElement:type=>new E(type),
    querySelector:()=>null,documentElement:{scrollHeight:3000},addEventListener(){},body:{},};
  const window={matchMedia:()=>({matches:true}),addEventListener(){},scrollY:0,innerHeight:800,
    requestAnimationFrame(){}};
  vm.runInNewContext(js,{document,window,Intl});
  const nodes=elements['constellation-nodes'].children;
  assert.equal(nodes.length,6);
  assert.equal(elements['project-constellation'].hidden,false);
  assert.equal(elements['project-grid'].hidden,true);
  assert.equal(elements['constellation-preview-title'].textContent,'Example 1');
  nodes[3].events.click();
  assert.equal(elements['constellation-preview-title'].textContent,'Example 4');
  assert.equal(nodes[3].attrs['aria-pressed'],'true');
  assert.equal(elements['constellation-preview-link'].href,'https://example.com/3');
  filter[1].events.click();
  assert.equal(elements['project-grid'].hidden,false);
  assert.equal(elements['work-toolbar'].hidden,false);
  assert.equal(elements['project-constellation'].hidden,true);
});

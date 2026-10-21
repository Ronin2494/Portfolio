import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import vm from 'node:vm';
import {test} from 'node:test';

const root=resolve(import.meta.dirname,'..');
const html=readFileSync(resolve(root,'index.html'),'utf8');
const css=readFileSync(resolve(root,'portfolio-experience.css'),'utf8');
const script=readFileSync(resolve(root,'portfolio-experience.js'),'utf8');

function mount({reducedMotion=false,intersectionObserver=true}={}){
  class Element{
    constructor(){
      this.hidden=false;this.attrs={};this.listeners={};this.children=[];
      this.dataset={};this.style={setProperty(){}};
      const items=new Set();
      this.classList={add:k=>items.add(k),remove:k=>items.delete(k),contains:k=>items.has(k)};
    }
    addEventListener(name,fn){(this.listeners[name]??=[]).push(fn);}
    fire(name,data={}){for(const fn of this.listeners[name]??[])fn(data);}
    setAttribute(name,value){this.attrs[name]=String(value);}
    getAttribute(name){return this.attrs[name];}
    append(...x){this.children.push(...x);}
    replaceChildren(...x){this.children=x;}
    contains(){return false;}
    getBoundingClientRect(){return {top:50,bottom:650,height:600};}
    focus(){this.focused=true;}
  }
  const elements={};
  for(const id of ['projects','project-grid','work-toolbar','project-constellation',
    'constellation-map','constellation-nodes','experience-view-toggle','experience-view-hint','deck-controls',
    'constellation-preview-title','constellation-preview-description','constellation-preview-index',
    'constellation-preview-tags','constellation-preview-link','constellation-preview-initials']){
    elements[id]=new Element();
  }
  const tiles=Array.from({length:6},(_,i)=>({
    querySelector(sel){
      if(sel==='.tile-text h3')return {textContent:'Project '+(i+1)};
      if(sel==='.tile-text p')return {textContent:'Description'};
      if(sel==='.round-link')return {href:'https://example.com/'+i,getAttribute:()=>('Visit '+i)};
      if(sel==='.tile-index')return {textContent:'0'+(i+1)};
      if(sel==='.status')return {textContent:'LIVE'};
      if(sel==='.status-live')return {};
      return null;
    },
    querySelectorAll:()=>[]
  }));
  elements['project-grid'].querySelectorAll=()=>tiles;
  const tabs=['constellation','grid'].map(view=>{
    const tab=new Element();tab.dataset.projectView=view;return tab;
  });
  elements['experience-view-toggle'].querySelectorAll=()=>tabs;
  const timers=new Map();let next=1;
  let observer=null;
  const document={
    hidden:false,activeElement:null,
    getElementById:id=>elements[id]||null,
    querySelector:()=>null,
    createElement:()=>new Element(),
    documentElement:{scrollHeight:2800},
    listeners:{},
    addEventListener(name,fn){(this.listeners[name]??=[]).push(fn);},
    fire(name){for(const fn of this.listeners[name]??[])fn();}
  };
  const window={
    innerHeight:800,scrollY:0,matchMedia:()=>({matches:reducedMotion}),
    requestAnimationFrame(){},addEventListener(){},
    setTimeout(fn,delay){const id=next++;timers.set(id,{fn,delay});return id;},
    clearTimeout(id){timers.delete(id);}
  };
  if(intersectionObserver){
    window.IntersectionObserver=class {
      constructor(fn,options){
        observer={callback:fn,options,observed:null,disconnected:false,
          emit(visible,ratio=visible ? 0.6 : 0){
            fn([{target:elements.projects,isIntersecting:visible,intersectionRatio:ratio}]);
          },
          takeRecords(){return []}
        };
      }
      observe(node){observer.observed=node;}
      disconnect(){observer.disconnected=true;}
      takeRecords(){return [];}
    };
  }
  vm.runInNewContext(script,{document,window,Intl});
  const fireTimer=()=>{
    assert.equal(timers.size,1,'expected one pending preview timer');
    const [id,{fn,delay}]=[...timers.entries()][0];
    timers.delete(id);fn();return delay;
  };
  return {elements,tabs,timers,observer,document,window,fireTimer};
}

test('preview is discoverable but preserves the existing no-JS bento fallback',()=>{
  assert.match(html,/id="experience-view-toggle"[^>]*hidden/);
  assert.match(html,/id="project-constellation" hidden/);
  assert.match(html,/id="experience-view-hint" hidden/);
  assert.match(html,/data-project-view="constellation"/);
  assert.match(html,/data-project-view="grid"/);
  assert.match(css,/\.experience-view-toggle\.view-demo-countdown/);
  assert.match(css,/@keyframes experience-view-countdown/);
  assert.match(css,/@keyframes experience-view-reveal/);
});

test('after the section enters view, one six-second preview reveals bento and marks the tab active',()=>{
  const ui=mount();
  assert.equal(ui.elements['project-constellation'].hidden,false);
  assert.equal(ui.elements['project-grid'].hidden,true);
  assert.equal(ui.elements['deck-controls'].hidden,true);
  assert.equal(ui.elements['experience-view-hint'].hidden,false);
  assert.equal(ui.timers.size,0,'do not start countdown above the fold');
  assert.equal(ui.observer.observed,ui.elements.projects);
  ui.observer.emit(true,.45);
  assert.equal(ui.timers.size,1);
  assert.equal(ui.elements['experience-view-toggle'].classList.contains('view-demo-countdown'),true);
  const delay=ui.fireTimer();
  assert.equal(delay,6000);
  assert.equal(ui.elements['project-constellation'].hidden,true);
  assert.equal(ui.elements['project-grid'].hidden,false);
  assert.equal(ui.elements['work-toolbar'].hidden,false);
  assert.equal(ui.elements['deck-controls'].hidden,false);
  assert.equal(ui.tabs[1].attrs['aria-pressed'],'true');
  assert.equal(ui.tabs[0].attrs['aria-pressed'],'false');
  assert.equal(ui.elements['project-grid'].classList.contains('project-view-arriving'),true);
  assert.equal(ui.elements['experience-view-hint'].textContent,'BENTO CARDS ARE HERE · SWITCH VIEWS ANYTIME');
  assert.equal(ui.observer.disconnected,true);
  ui.observer.emit(true,.45);
  assert.equal(ui.timers.size,0,'never play the demo twice');
});

test('manual tab selection cancels the demo and leaves either view under user control',()=>{
  const ui=mount();
  ui.observer.emit(true,.6);
  assert.equal(ui.timers.size,1);
  ui.tabs[0].fire('click');
  assert.equal(ui.timers.size,0);
  assert.equal(ui.elements['project-constellation'].hidden,false);
  ui.observer.emit(true,.6);
  assert.equal(ui.timers.size,0);
  ui.tabs[1].fire('click');
  assert.equal(ui.elements['project-grid'].hidden,false);
  ui.tabs[0].fire('click');
  assert.equal(ui.elements['project-constellation'].hidden,false);
  assert.equal(ui.elements['project-grid'].hidden,true);
  assert.equal(ui.elements['deck-controls'].hidden,true);
});

test('keyboard focus or interacting with a project stops the timer, but touch-scrolling does not',()=>{
  const ui=mount();
  ui.observer.emit(true,.6);
  ui.elements.projects.fire('pointerdown',{target:ui.elements.projects});
  assert.equal(ui.timers.size,1);
  ui.elements.projects.fire('focusin',{target:ui.tabs[0]});
  assert.equal(ui.timers.size,0);
  const second=mount();
  second.observer.emit(true,.6);
  second.elements.projects.fire('click',{target:{closest:()=>true}});
  assert.equal(second.timers.size,0);
});

test('offscreen and hidden tabs pause the automatic switch until visitors return',()=>{
  const ui=mount();
  ui.observer.emit(true,.4);
  assert.equal(ui.timers.size,1);
  ui.observer.emit(false);
  assert.equal(ui.timers.size,0);
  ui.observer.emit(true,.5);
  assert.equal(ui.timers.size,1);
  ui.document.hidden=true;
  ui.document.fire('visibilitychange');
  assert.equal(ui.timers.size,0);
  ui.document.hidden=false;
  ui.document.fire('visibilitychange');
  assert.equal(ui.timers.size,1);
  ui.fireTimer();
  assert.equal(ui.elements['project-grid'].hidden,false);
});

test('reduced motion and older browsers keep two manual tabs, without autoplay timers',()=>{
  for(const options of [{reducedMotion:true},{intersectionObserver:false}]){
    const ui=mount(options);
    assert.equal(ui.observer,null);
    assert.equal(ui.timers.size,0);
    ui.tabs[1].fire('click');
    assert.equal(ui.elements['project-grid'].hidden,false);
  }
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(script,/!motion\.matches&&typeof window\.IntersectionObserver==='function'/);
});

import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {test} from 'node:test';
import vm from 'node:vm';

const root=resolve(import.meta.dirname,'..');
const html=readFileSync(resolve(root,'index.html'),'utf8');
const css=readFileSync(resolve(root,'beyond.css'),'utf8');
const script=readFileSync(resolve(root,'beyond.js'),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));

function mount(reduceMotion=false){
  class FakeElement{
    constructor(){
      this.dataset={};this.attrs={};this.events=new Map();
      this.children=[];this.hidden=true;this.open=false;
      this.focused=false;this.textContent='';this.scrollTop=0;
    }
    addEventListener(name,listener){this.events.set(name,listener);}
    dispatch(name,event={}){this.events.get(name)?.(event);}
    setAttribute(name,value){this.attrs[name]=value;if(name==='open')this.open=true;}
    removeAttribute(name){delete this.attrs[name];if(name==='open')this.open=false;}
    append(...nodes){this.children.push(...nodes);}
    replaceChildren(...nodes){this.children=nodes;}
    getBoundingClientRect(){return this.rect||{left:0,top:0,width:240,height:310,right:240,bottom:310};}
    focus(){this.focused=true;}
    showModal(){this.open=true;this.showCount=(this.showCount||0)+1;}
    close(){this.open=false;this.closeCount=(this.closeCount||0)+1;}
  }
  const cards=['music','movement','presence','questions'].map((interest,i)=>{
    const element=new FakeElement();
    element.dataset.interest=interest;
    element.hidden=false;
    element.rect={left:20+(i%2)*270,top:210+Math.floor(i/2)*370,width:240,height:320};
    return element;
  });
  const panel=new FakeElement();
  panel.rect={left:65,top:45,width:940,height:680,right:1005,bottom:725};
  const content=new FakeElement(),close=new FakeElement();
  const nodes={
    'beyond-detail':panel,
    'beyond-detail-content':content,
    'beyond-close':close,
    'beyond-detail-index':new FakeElement(),
    'beyond-detail-title':new FakeElement(),
    'beyond-detail-description':new FakeElement()
  };
  const bodyClasses=new Set();
  const animated=[];
  panel.animate=(frames,options)=>{
    const a={frames,options,canceled:false,finished:Promise.resolve(),
      cancel(){this.canceled=true;},finish(){}};
    animated.push(a);
    return a;
  };
  const document={
    body:{classList:{
      add(c){bodyClasses.add(c);},remove(c){bodyClasses.delete(c);}
    }},
    querySelectorAll(){return cards;},
    getElementById(id){return nodes[id];},
    createElement(){return new FakeElement();}
  };
  const window={matchMedia:()=>({matches:reduceMotion})};
  const fetch=async()=>({ok:true,json:async()=>({items:[]})});
  vm.runInNewContext(script,{document,window,fetch,URL,Intl,Date,Promise,Set,Object,Number});
  return {cards,panel,content,close,nodes,bodyClasses,animated};
}

test('four cards open in a top-layer dialog instead of expanding under the grid',()=>{
  assert.match(html,/<dialog id="beyond-detail"[^>]*aria-modal="true"/);
  assert.match(html,/<\/dialog>/);
  assert.match(css,/position:fixed/);
  assert.match(css,/\.beyond-detail::backdrop/);
  assert.match(css,/backdrop-filter:blur\(13px\)/);
  assert.match(css,/height:calc\(100dvh - 24px\)/);
  assert.match(css,/\.beyond-detail\[hidden\]\{display:none!important\}/);
  assert.match(script,/panel\.showModal\(\)/);
  assert.doesNotMatch(script,/panel\.scrollIntoView\(/);
});

test('opens every interest from its own origin, then returns to exactly that card',async()=>{
  const ui=mount();
  for(let i=0;i<ui.cards.length;i++){
    const card=ui.cards[i];
    card.dispatch('click');
    assert.equal(ui.panel.open,true);
    assert.equal(ui.panel.hidden,false);
    assert.equal(card.attrs['aria-expanded'],'true');
    assert.equal(ui.close.focused,true);
    assert.equal(ui.bodyClasses.has('beyond-popout-open'),true);
    const opening=ui.animated.at(-1);
    assert.match(opening.frames[0].transform,/translate3d\(/);
    assert.match(opening.frames[0].transform,/scale\(/);
    assert.equal(opening.options.duration,620);
    assert.equal(ui.panel.dataset.active,card.dataset.interest);
    ui.close.dispatch('click');
    await tick();
    assert.equal(ui.panel.open,false);
    assert.equal(ui.panel.hidden,true);
    assert.equal(ui.bodyClasses.has('beyond-popout-open'),false);
    assert.equal(card.focused,true);
    assert.equal(card.attrs['aria-expanded'],'false');
    const closing=ui.animated.at(-1);
    assert.equal(closing.options.duration,470);
    assert.equal(closing.frames.at(-1).transform,opening.frames[0].transform);
  }
});

test('Escape and backdrop clicks reverse animation without trapping focus',async()=>{
  const ui=mount();
  ui.cards[2].dispatch('click');
  let canceled=false;
  ui.panel.dispatch('cancel',{preventDefault(){canceled=true;}});
  await tick();
  assert.equal(canceled,true);
  assert.equal(ui.panel.hidden,true);
  assert.equal(ui.cards[2].focused,true);

  ui.cards[3].dispatch('click');
  ui.panel.dispatch('click',{target:ui.panel,clientX:3,clientY:3});
  await tick();
  assert.equal(ui.panel.hidden,true);
  assert.equal(ui.cards[3].focused,true);
});

test('reduced motion opens and closes instantly without bubble transforms',async()=>{
  const ui=mount(true);
  ui.cards[1].dispatch('click');
  assert.equal(ui.panel.open,true);
  assert.equal(ui.animated.length,0);
  ui.close.dispatch('click');
  assert.equal(ui.panel.hidden,true);
  assert.equal(ui.cards[1].focused,true);
  assert.equal(ui.animated.length,0);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test('content reloads do not reopen or reposition the active modal',async()=>{
  const ui=mount();
  ui.cards[0].dispatch('click');
  const count=ui.animated.length;
  await tick(); // both API and the existing music catalog refresh after opening
  assert.equal(ui.panel.open,true);
  assert.equal(ui.animated.length,count);
  assert.equal(ui.panel.showCount,1);
  ui.close.dispatch('click');
  await tick();
  assert.equal(ui.panel.hidden,true);
});

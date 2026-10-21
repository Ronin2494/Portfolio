import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const creativeCss=readFileSync(new URL('../beyond.css',import.meta.url),'utf8');
const deckCss=readFileSync(new URL('../work-showcase.css',import.meta.url),'utf8');
const showcase=readFileSync(new URL('../work-showcase.js',import.meta.url),'utf8');
const experience=readFileSync(new URL('../portfolio-experience.js',import.meta.url),'utf8');

test('creative Bento adopts distinct spans without replacing original bubble buttons',()=>{
  assert.match(creativeCss,/\.beyond \.hobby-grid\{\s*grid-template-columns:repeat\(12,minmax\(0,1fr\)\)/);
  assert.match(creativeCss,/\.beyond \.hobby-card:nth-child\(4n \+ 1\)/);
  assert.match(creativeCss,/grid-column:span 7/);
  assert.match(creativeCss,/grid-column:span 5/);
  assert.match(creativeCss,/@media\(max-width:520px\)/);
  assert.match(creativeCss,/@media\(prefers-reduced-motion:reduce\)/);
  assert.equal((html.match(/class="hobby-card /g)||[]).length,4);
  assert.equal((html.match(/aria-controls="beyond-detail"/g)||[]).length,4);
});

test('deck progress and layout controls remain optional and keyboard-accessible',()=>{
  assert.match(html,/id="deck-controls" hidden/);
  assert.match(html,/id="deck-progress" value="1" max="6" aria-label="Project deck progress"/);
  assert.match(deckCss,/\.deck-progress\{/);
  assert.match(deckCss,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(experience,/if\(deckControls\)deckControls\.hidden=isMap/);
});

function setup(){
  class Element{
    constructor(id=''){
      this.id=id;this.attrs={};this.listeners={};this.dataset={};
      this.hidden=id==='deck-controls'||id==='deck-navigation';
      this.style={properties:{},setProperty:(k,v)=>{this.style.properties[k]=v;}};
      this.classNames=new Set();
      this.classList={add:k=>this.classNames.add(k),remove:k=>this.classNames.delete(k),
        toggle:(k,on)=>{if(on)this.classNames.add(k);else this.classNames.delete(k);},
        contains:k=>this.classNames.has(k)};
      this.textContent='';this.disabled=false;this.tabIndex=0;
    }
    setAttribute(k,v){this.attrs[k]=String(v);}
    removeAttribute(k){delete this.attrs[k];}
    getAttribute(k){return this.attrs[k];}
    addEventListener(k,fn){(this.listeners[k]??=[]).push(fn);}
    fire(k,payload={}){for(const fn of this.listeners[k]??[])fn(payload);}
  }
  const tiles=Array.from({length:6},(_,i)=>{
    const tile=new Element('tile'+i);
    tile.isLive=i<3;
    tile.link=new Element('link'+i);
    tile.querySelector=sel=>sel==='.status-live'&&tile.isLive?{}:
      sel==='.tile-text h3'?{textContent:'Project '+(i+1)}:null;
    tile.querySelectorAll=sel=>sel==='a,button'?[tile.link]:[];
    tile.getBoundingClientRect=()=>({left:0,top:0,width:500,height:500});
    return tile;
  });
  const filters=['all','live','building'].map(name=>{
    const b=new Element(name);b.dataset.workFilter=name;
    b.number={textContent:''};
    b.querySelector=sel=>sel==='.filter-number'?b.number:null;
    return b;
  });
  const ids={};
  for(const id of ['projects','project-grid','work-toolbar','work-visible-count','deck-controls',
    'deck-view-switch','deck-navigation','deck-prev','deck-next','deck-position','deck-progress']){
    ids[id]=new Element(id);
  }
  ids.projects.querySelectorAll=selector=>selector==='.bento > .tile'?tiles:[];
  ids['work-toolbar'].querySelectorAll=selector=>selector==='[data-work-filter]'?filters:[];
  ids['work-toolbar'].querySelector=selector=>selector==='#work-visible-count'?ids['work-visible-count']:null;
  const watchers=[];
  class Observer{
    constructor(callback){this.callback=callback;watchers.push(this);}
    observe(){}
  }
  const document={getElementById:id=>ids[id]||null};
  vm.runInNewContext(showcase,{document,window:{matchMedia:()=>({matches:false})},MutationObserver:Observer});
  return {ids,tiles,filters,watchers,mutate:()=>watchers.forEach(x=>x.callback([{attributeName:'hidden'}]))};
}

test('deck navigation updates progress while hiding inactive links from keyboard focus',()=>{
  const {ids,tiles}=setup();
  assert.equal(ids['deck-controls'].hidden,false);
  ids['deck-view-switch'].fire('click');
  assert.equal(ids['deck-navigation'].hidden,false);
  assert.equal(ids['project-grid'].classList.contains('is-layered-deck'),true);
  assert.equal(ids['deck-progress'].value,1);
  assert.equal(ids['deck-progress'].max,6);
  assert.equal(tiles[0].attrs['aria-hidden'],'false');
  assert.equal(tiles[1].attrs['aria-hidden'],'true');
  assert.equal(tiles[1].link.attrs.tabindex,'-1');
  ids['deck-next'].fire('click');
  assert.equal(ids['deck-position'].textContent,'02 / 06');
  assert.equal(ids['deck-progress'].value,2);
  assert.equal(tiles[1].link.attrs.tabindex,undefined);
  ids['deck-view-switch'].fire('click');
  assert.equal(ids['project-grid'].classList.contains('is-layered-deck'),false);
  assert.equal(ids['deck-navigation'].hidden,true);
  assert.equal(tiles.every(x=>x.attrs['aria-hidden']==='false'),true);
  assert.equal(tiles.every(x=>x.link.attrs.tabindex===undefined),true);
});

test('filtered deck updates current count and preserves arrow and swipe navigation',()=>{
  const {ids,filters,tiles,mutate}=setup();
  ids['deck-view-switch'].fire('click');
  filters[1].fire('click');
  mutate();
  assert.equal(ids['deck-progress'].max,3);
  assert.equal(ids['deck-position'].textContent,'01 / 03');
  assert.deepEqual(tiles.map(x=>x.hidden),[false,false,false,true,true,true]);
  let prevented=false;
  ids['project-grid'].fire('keydown',{key:'ArrowRight',target:ids['project-grid'],preventDefault(){prevented=true;}});
  assert.equal(prevented,true);
  assert.equal(ids['deck-position'].textContent,'02 / 03');
  const target={closest:()=>null};
  ids['project-grid'].fire('pointerdown',{target,clientX:230,clientY:30});
  ids['project-grid'].fire('pointerup',{clientX:105,clientY:38});
  assert.equal(ids['deck-position'].textContent,'03 / 03');
  filters[2].fire('click');
  mutate();
  assert.equal(ids['deck-progress'].max,3);
  assert.equal(ids['deck-position'].textContent,'03 / 03');
  ids['deck-next'].fire('click');
  assert.equal(ids['deck-position'].textContent,'01 / 03');
});

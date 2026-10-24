import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const html=read('index.html'),css=read('neural-interactions.css'),js=read('neural-interactions.js');
test('shared reactive layer is loaded last and honors current design',()=>{
 assert.match(html,/neural-interactions\.css\?v=20261024-1/);
 assert.match(html,/neural-interactions\.js\?v=20261024-1/);
 assert.ok(html.indexOf('signal-index.css')<html.indexOf('neural-interactions.css'));
 assert.ok(html.indexOf('signal-index.js')<html.indexOf('neural-interactions.js'));
 assert.match(css,/\.signal-path/);assert.match(css,/\.beyond \.hobby-card/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/@media\(hover:none\),\(pointer:coarse\)/);
});
test('no new continuous animation or animation on reduced motion and coarse pointers',()=>{
 assert.doesNotMatch(js,/setInterval\(|setTimeout\(|fetch\(|innerHTML/);
 assert.match(js,/if\(!fine\.matches\|\|reduce\.matches\)return/);
 assert.match(js,/if\(!frame\)frame=requestAnimationFrame\(flush\)/);
 assert.match(js,/aria-hidden/);
 assert.match(css,/pointer-events:none/);
});
test('pointer movement is batched and non-invasive to navigation',()=>{
 const listeners={};const children=[];
 function element(tag){
  return {tag,style:{props:{},setProperty(k,v){this.props[k]=v;},removeProperty(k){delete this.props[k];}},
   listeners:{},firstChild:null,append(n){children.push(n);},insertBefore(n){children.push(n);},
   addEventListener(name,fn){this.listeners[name]=fn;},setAttribute(){},animate(){return {finished:Promise.resolve()}},
   getBoundingClientRect(){return {left:0,top:0,width:200,height:100}}};
 }
 const host=element('section'),cards=[element('a'),element('button')];
 const document={
  querySelector:()=>host,querySelectorAll:()=>cards,
  createElement:element,createElementNS:(_,name)=>element(name)
 };
 const queue=[];
 const window={matchMedia:q=>({matches:q.includes('pointer: fine')})};
 vm.runInNewContext(js,{document,window,requestAnimationFrame:fn=>{queue.push(fn);return 1;}});
 assert.equal(children.length>=7,true);
 cards[0].listeners.pointermove({clientX:50,clientY:25});
 cards[0].listeners.pointermove({clientX:100,clientY:50});
 assert.equal(queue.length,1,'multiple pointer events should coalesce');
 queue.shift()();
 assert.equal(cards[0].style.props['--neural-x'],'50.0%');
 assert.equal(cards[0].style.props['--neural-y'],'50.0%');
 cards[0].listeners.pointerleave();
 assert.equal(cards[0].style.props['--neural-x'],undefined);
});

import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';
const src=readFileSync(new URL('../ad-loader.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const neural=readFileSync(new URL('../neural-field.js',import.meta.url),'utf8');

function mount({readyState='complete',idle=true}={}){
 const scripts=[];
 const hooks={};
 const doc={
  readyState,
  createElement:()=>({dataset:{}}),
  querySelector:()=>scripts.find(x=>x.dataset.portfolioAds==='loaded')||null,
  head:{append:s=>scripts.push(s)}
 };
 const win={
  addEventListener:(name,fn)=>hooks[name]=fn,
  setTimeout:(fn)=>hooks.timeout=fn
 };
 if(idle)win.requestIdleCallback=fn=>{hooks.idle=fn;};
 vm.runInNewContext(src,{window:win,document:doc});
 return {scripts,hooks,win,doc};
}
test('Advertising remains enabled but waits for idle after load',()=>{
 const a=mount({readyState:'loading'});
 assert.equal(a.scripts.length,0);
 assert.equal(typeof a.hooks.load,'function');
 a.hooks.load();
 assert.equal(a.scripts.length,0);
 a.hooks.idle();
 assert.equal(a.scripts.length,1);
 assert.match(a.scripts[0].src,/adsbygoogle\.js\?client=ca-pub-/);
 assert.equal(a.scripts[0].async,true);
 assert.equal(a.scripts[0].crossOrigin,'anonymous');
});
test('Fallback schedules ads when requestIdleCallback is unavailable and never duplicates',()=>{
 const a=mount({idle:false});
 assert.equal(a.scripts.length,0);
 a.hooks.timeout();
 assert.equal(a.scripts.length,1);
 a.hooks.timeout();
 assert.equal(a.scripts.length,1);
});
test('The neural canvas does not start drawing synchronously before hero paint',()=>{
 assert.doesNotMatch(neural,/\ndraw\(0\);requestAnimationFrame\(frame\)/);
 assert.match(neural,/requestIdleCallback\(start,\{timeout:1100\}\)/);
 assert.match(neural,/frameInterval\(\)/);
});
test('Large below-fold art stays nonblocking and production still loads advertisements',()=>{
 assert.match(html,/href="scene-image\.css" media="print" onload="this\.media='all'"/);
 assert.match(html,/src="ad-loader\.js\?v=postpaint-1" defer/);
 assert.doesNotMatch(html,/<script async src="https:\/\/pagead2\.googlesyndication\.com/);
});

import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const html=read('index.html'),css=read('signal-index.css'),js=read('signal-index.js'),main=read('main.js');
test('Three intentional landing pathways connect to existing sections',()=>{
 assert.equal((html.match(/class="signal-path"/g)||[]).length,3);
 for(const id of ['projects','beyond','creative']){
  assert.match(html,new RegExp('class="signal-path" href="#'+id+'"'));
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.match(html,/aria-label="Explore Portfolio pathways"/);
 assert.match(html,/id="signal-index-title"/);
 assert.match(html,/signal-index-status" role="status"/);
});
test('New visuals are post-hero, not another hero overlay',()=>{
 const i=html.indexOf('class="signal-index"');
 assert.ok(i>html.indexOf('</div>\n</main>')||i>html.indexOf('<main id="work"'),'signal index must be in main');
 assert.ok(i>html.indexOf('class="intro section-reveal"'));
 assert.ok(i<html.indexOf('<section id="projects"'));
 assert.match(html,/signal-index\.css\?v=20261024-1/);
 assert.match(html,/signal-index\.js\?v=20261024-1/);
 assert.match(main,/function advanceIntro\(delta\)/);
 assert.match(main,/function reenterIntro\(delta=0, reset=false\)/);
});
test('Responsive asymmetric cards, reduced motion, keyboard focus',()=>{
 assert.match(css,/grid-template-columns:1\.2fr 1fr \.9fr/);
 assert.match(css,/@media\(max-width:800px\)/);
 assert.match(css,/@media\(max-width:520px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/pointer-events:none/);
});
test('Progressive enhancement preserves native links and accessible active state',()=>{
 assert.match(js,/setAttribute\('aria-current','location'\)/);
 assert.match(js,/removeAttribute\('aria-current'\)/);
 assert.match(js,/IntersectionObserver/);
 assert.doesNotMatch(js,/preventDefault|scrollTo\(|innerHTML|fetch\(/);
});

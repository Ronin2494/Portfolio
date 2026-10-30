import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('index.html'),css=read('button-interactions.css');
test('button interaction style is loaded after existing visual styles',()=>{
 const a=html.indexOf('href="interaction-depth.css'),b=html.indexOf('href="button-interactions.css');
 assert.ok(a>=0&&b>a,'button refinements should override earlier shadow layers');
});
test('all critical control classes have hover, press and focus states',()=>{
 for(const c of ['scene-cta','member-cta','round-link','mobile-nav-toggle','dock-trigger','linkedin-float']){
  assert.ok(css.includes('.'+c),c+' is included');
 }
 assert.match(css,/@media\(hover:hover\) and \(pointer:fine\)/);
 assert.match(css,/:active:not\(:disabled\)/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/aria-pressed="true"/);
});
test('colors remain distinct with non-motion user preferences',()=>{
 assert.match(css,/rgba\(141,117,248,\.36\)/);
 assert.match(css,/rgba\(92,224,210,\.28\)/);
 assert.match(css,/#e2f88f/);
 assert.match(css,/@media\(hover:none\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/@media\(forced-colors:active\)/);
 assert.doesNotMatch(css,/position:\s*(fixed|absolute)/);
});

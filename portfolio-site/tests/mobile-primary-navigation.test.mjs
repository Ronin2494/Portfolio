import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('index.html'),css=read('mobile-navigation.css'),js=read('mobile-navigation.js');
test('mobile navigation retains all five existing anchored destinations',()=>{
 const head=html.match(/<header class="site-nav"[^]*?<\/header>/)?.[0];
 assert.ok(head);
 for(const target of ['#projects','#beyond','#creative','#membership','#connect'])assert.ok(head.includes('href="'+target+'"'),target);
 assert.match(head,/aria-controls="primary-site-links"/);
 assert.match(head,/aria-expanded="false"/);
 assert.match(head,/id="primary-site-links" aria-label="Portfolio navigation"/);
 assert.match(html,/href="mobile-navigation\.css\?v=/);
 assert.match(html,/src="mobile-navigation\.js\?v=/);
});
test('mobile menu is progressively enhanced, dismisses on Escape/outside tap, and preserves desktop navigation',()=>{
 assert.match(js,/classList\.add\('mobile-nav-ready'\)/);
 assert.match(js,/event\.key==='Escape'/);
 assert.match(js,/header\.contains\(event\.target\)/);
 assert.match(js,/nav\.addEventListener\('click'/);
 assert.match(js,/mobile\.addEventListener\('change'/);
 assert.match(css,/@media\(max-width:900px\)/);
 assert.match(css,/html\.mobile-nav-ready \.site-nav nav\{display:none\}/);
 assert.match(css,/nav\.is-open/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/forced-colors:active/);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('index.html'),css=read('membership.css'),script=read('membership.js');
const section=html.slice(html.indexOf('<section id="membership"'),html.indexOf('</section>',html.indexOf('<section id="membership"')));
test('private gallery starts with exactly one accessible preview card, not a nested card gallery',()=>{
 assert.equal((section.match(/class="member-media-card/g)||[]).length,1);
 assert.equal((section.match(/class="membership-gallery"/g)||[]).length,1);
 assert.equal((section.match(/class="member-price"/g)||[]).length,0);
 assert.match(section,/id="member-gallery-grid"/);
 assert.match(section,/Illustrative preview/);
});
test('published releases render one card and use a selector without losing original checkout protections',()=>{
 assert.match(script,/function makeCard\(item, items=\[\]\)/);
 assert.match(script,/grid\.replaceChildren\(\)/);
 assert.match(script,/makeCard\(items\[0\], items\)/);
 assert.match(script,/items\.length > 1/);
 assert.match(script,/select\.addEventListener\('change'/);
 assert.match(script,/makeCard\(items\[Number\(select\.value\)\], items\)/);
 assert.doesNotMatch(script,/items\.forEach\(makeCard\)/);
 assert.match(script,/mediaId:item\.id/);
 assert.match(script,/pay\.disabled = !checkoutReady \|\| priceCents===null \|\| !item\.id/);
 assert.match(script,/window\.location\.assign\(destination\.href\)/);
});
test('single-card CSS is centered, responsive, high contrast and reduced-motion safe',()=>{
 assert.match(css,/#membership \.member-gallery-grid\{display:grid;grid-template-columns:minmax\(0,1fr\)/);
 assert.match(css,/#membership \.membership-gallery\{max-width:760px/);
 assert.match(css,/#membership \.member-release-picker select:focus-visible/);
 assert.match(css,/@media\(max-width:680px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('index.html'),css=read('portfolio-design-standard.css');
test('all six project links keep their real destinations and accessible inline stroke icons',()=>{
 const cards=[...html.matchAll(/<article class="tile tile-[^]*?<\/article>/g)].map(x=>x[0]);
 assert.equal(cards.length,6);
 for(const card of cards){
  assert.match(card,/<a class="round-link" href="https:\/\/[^"]+"[^>]+aria-label="[^"]+"[^>]*>/);
  assert.match(card,/<span class="project-launch-icon" aria-hidden="true"><svg class="ui-arrow"/);
  assert.doesNotMatch(card,/<span class="project-launch-icon" aria-hidden="true">↗/);
 }
});
test('header and conversion controls use the same vector icon, not emoji arrows',()=>{
 for(const klass of ['header-enter','header-contact','scene-cta','scene-instagram']){
  const tag=html.match(new RegExp('<a[^>]*class="'+klass+'"[^]*?<\\/a>'))?.[0];
  assert.ok(tag,klass+' control exists');
  assert.match(tag,/<svg class="ui-arrow" aria-hidden="true" focusable="false"/);
  assert.doesNotMatch(tag,/>↗<\/span>/);
 }
 assert.match(css,/\.ui-arrow\{/);
 assert.match(css,/focus-visible/);
});
test('three distinct local SVG illustrations load lazily at native aspect ratio',()=>{
 for(const name of ['footnow','seatpath','espionaaj']){
  const path='media/scenes/'+name+'.svg';
  const src=read(path);
  assert.match(src,/<svg[^>]+viewBox="0 0 1200 700"/);
  assert.match(src,/<\/svg>\s*$/);
  assert.ok(statSync(new URL('../'+path,import.meta.url)).size<12000,name+' asset is lightweight');
  assert.match(html,new RegExp('src="media/scenes/'+name+'\\.svg" alt="" loading="lazy" decoding="async" width="1200" height="700"'));
 }
 assert.match(css,/object-fit:cover/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(css,/position:fixed/);
});

import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const html=read('index.html'),js=read('neural-explorer.js'),css=read('neural-explorer.css'),main=read('main.js');
test('explorer embeds after index and before projects without changing hero',()=>{
 const i=html.indexOf('id="neural-explorer"');
 assert.ok(i>html.indexOf('class="signal-index"'));
 assert.ok(i<html.indexOf('id="projects"'));
 for(const id of ['neural-explorer','project-grid','project-constellation','beyond-detail','portal-stage'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.match(main,/function advanceIntro\(delta\)/);
 assert.match(main,/function reenterIntro\(delta=0, reset=false\)/);
});
test('all graph nodes are real products or interests currently represented in the page',()=>{
 const cards=[...html.matchAll(/<article class="tile (tile-[a-z]+)/g)].map(x=>x[1]);
 assert.deepEqual(cards,['tile-footnow','tile-lyrics','tile-seatpath','tile-catalyst','tile-taskmail','tile-espionaaj']);
 for(const key of ['footnow','lyricsverse','seatpath','catalyst','taskmail','espionaaj','rhythm','movement','presence','curiosity'])
  assert.ok(js.includes("'"+key+"'"),key);
 assert.doesNotMatch(js,/buildingai|groundloop/);
 assert.match(js,/const projects=cards\.map/);
 assert.match(js,/const connections=\[/);
});
test('real exploration has selection, connected nodes, navigation history and real destinations',()=>{
 for(const val of ['data-explorer-nodes','data-explorer-related','data-explorer-detail',
 'data-explorer-back','data-explorer-reset','data-explorer-zoom-in','data-explorer-zoom-out'])
  assert.ok(html.includes(val),val);
 for(const val of ['function select(id,remember=false)','connected(selected)',
 'history.push(selected)','history.pop()','aria-pressed','aria-live="polite"','item.destination',
 "button.addEventListener('click'"])assert.ok((js+html).includes(val),val);
 assert.match(js,/action\.href=item\.destination/);
 assert.match(js,/action\.rel='noopener noreferrer'/);
 assert.doesNotMatch(js,/innerHTML|eval\(|fetch\(/);
});
test('exploration is controllable without hijacking standard scroll',()=>{
 assert.match(js,/if\(!e\.ctrlKey&&!e\.metaKey\)return/);
 assert.match(js,/e\.preventDefault\(\)/);
 assert.match(js,/viewport\.addEventListener\('pointermove'/);
 assert.match(js,/viewport\.addEventListener\('pointercancel'/);
 assert.match(js,/ArrowRight/);assert.match(js,/Escape/);
 assert.match(css,/@media\(max-width:560px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/:focus-visible/);
});

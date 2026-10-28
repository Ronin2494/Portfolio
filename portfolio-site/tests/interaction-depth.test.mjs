import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('index.html'),css=read('interaction-depth.css');
test('all project launch links retain external targets and styled arrow icons',()=>{
 const links=[...html.matchAll(/<a class="round-link"[^>]*>[^]*?<\/a>/g)].map(x=>x[0]);
 assert.equal(links.length,6);
 for(const link of links){
  assert.match(link,/href="https:\/\//);
  assert.match(link,/aria-label="[^"]+"/);
  assert.match(link,/rel="noopener noreferrer"/);
  assert.match(link,/class="project-launch-icon" aria-hidden="true"/);
 }
});
test('shadow styling only adjusts visual treatment without modifying source card structure',()=>{
 assert.match(html,/href="interaction-depth\.css\?v=/);
 assert.match(css,/\.bento>\.tile \.round-link/);
 assert.match(css,/box-shadow:/);
 assert.match(css,/\.bento:not\(\.is-layered-deck\)>\.tile:nth-child/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.match(css,/:focus-visible/);
 assert.doesNotMatch(css,/position:\s*(?:absolute|fixed)/);
});

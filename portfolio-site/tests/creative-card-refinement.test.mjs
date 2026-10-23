import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const html=read('index.html'),css=read('creative-card-refinement.css'),bento=read('beyond.css');
test('all four creative cards share quiet surfaces but individual artwork accents',()=>{
 for(const item of ['music-card','dance-card','mind-card','build-card']){
  assert.match(css,new RegExp('html\\.neural-preview \\.beyond \\.'+item+'\\{'));
  assert.match(html,new RegExp('class="hobby-card '+item+'"'));
 }
 assert.match(css,/background-size:100% 100%/);
 assert.doesNotMatch(css,/repeating-linear-gradient|background-size:\s*\d+px/);
 assert.match(css,/\.hobby-graphic\{[\s\S]*?opacity:1/);
 assert.match(css,/\.hobby-card \.hobby-heading/);
});
test('visual layer is loaded after the previous neural design and retains asymmetric Bento logic',()=>{
 assert.ok(html.indexOf('neural-theme.css')<html.indexOf('creative-card-refinement.css'));
 assert.match(bento,/\.beyond \.hobby-card:nth-child\(4n \+ 1\)/);
 assert.match(bento,/grid-column:span 7/);
 assert.match(bento,/grid-column:span 5/);
 assert.match(html,/id="beyond-detail"/);
 for(const kind of ['music','movement','presence','questions'])assert.match(html,new RegExp('data-interest="'+kind+'"'));
});
test('responsive and reduced motion states remain supported',()=>{
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/@media\(max-width:520px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/pointer-events:none/);
});

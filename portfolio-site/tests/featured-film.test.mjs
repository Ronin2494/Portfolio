import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {test} from 'node:test';

const root=resolve(import.meta.dirname,'..');
const html=readFileSync(resolve(root,'index.html'),'utf8');
const catalog=JSON.parse(readFileSync(resolve(root,'creative-posts.json'),'utf8'));
const start=html.indexOf('<section id="creative"');
const end=html.indexOf('<section id="membership"',start);
const featured=html.slice(start,end);

test('Creative Wall is replaced by exactly one opening featured video',()=>{
  assert.ok(start>0&&end>start,'Creative section precedes the membership gallery');
  assert.equal((featured.match(/<iframe\b/g)||[]).length,1,'one featured embed');
  assert.equal((featured.match(/<article\b/g)||[]).length,1,'one film card');
  assert.match(featured,/class="creative-opening"/);
  assert.match(featured,/class="creative-opening-media"/);
  assert.match(featured,/class="creative-opening-copy"/);
  assert.match(featured,/04 \/ FEATURED FILM/);
  assert.doesNotMatch(featured,/CREATIVE WALL|creative-wall-grid|creative-wall-card|FOUR FRAMES|Four frames/i);
});

test('featured video matches the opening video in verified media catalog',()=>{
  const first=catalog.items.find(item=>item.feature===true);
  assert.ok(first,'catalog has an intentionally chosen featured opening film');
  assert.equal(first.provider,'youtube');
  const id=new URL(first.url).searchParams.get('v');
  assert.match(id,/^[a-zA-Z0-9_-]{11}$/);
  assert.ok(featured.includes('www.youtube-nocookie.com/embed/'+id));
  assert.ok(featured.includes('https://www.youtube.com/watch?v='+id));
  assert.match(featured,/loading="lazy"/);
  assert.match(featured,/allowfullscreen/);
  assert.match(featured,/rel="noopener noreferrer"/);
});

test('old wall effects and stylesheet are removed without affecting other sections',()=>{
  assert.doesNotMatch(html,/creative-wall\.css|evidence-wall\.js|creative-wall-grid/);
  assert.equal(existsSync(resolve(root,'creative-wall.css')),false);
  assert.equal(existsSync(resolve(root,'evidence-wall.js')),false);
  assert.match(html,/href="#creative"/);
  assert.match(html,/id="beyond"/);
  assert.match(html,/id="membership"/);
  assert.match(html,/id="connect"/);
  assert.match(html,/href="creative-inline\.css"/);
  assert.match(html,/href="creative\.css"/);
});

import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {normalize,mergePosts} from '../../scripts/sync-instagram-posts.mjs';
const root=new URL('../',import.meta.url);
const html=readFileSync(new URL('ai-guide.html',root),'utf8');
const script=readFileSync(new URL('instagram-guides.js',root),'utf8');
const yaml=readFileSync(new URL('../../.github/workflows/portfolio-instagram-sync.yml',import.meta.url),'utf8');
const catalog=JSON.parse(readFileSync(new URL('instagram-posts.json',root),'utf8'));
test('Instagram feed keeps first supplied post and an authorized-only caption placeholder',()=>{
 assert.ok(catalog.posts.some(p=>p.id==='DfTMZktj8t6'&&p.permalink==='https://www.instagram.com/p/DfTMZktj8t6/'));
 assert.equal(catalog.posts[0].caption,'');
 assert.match(script,/The post has not yet been synced/);
 assert.doesNotMatch(html,/access_token=|INSTAGRAM_ACCESS_TOKEN/);
});
test('Caption normalization accepts only safe Instagram permalinks',()=>{
 const valid=normalize({permalink:'https://www.instagram.com/p/Ab12cd34/',caption:'Test description',media_type:'IMAGE',timestamp:'2026-11-03T00:00:00+0000'});
 assert.equal(valid.id,'Ab12cd34');assert.equal(valid.caption,'Test description');
 assert.equal(normalize({permalink:'https://evil.example/p/Hello123/'}),null);
 assert.equal(normalize({permalink:'javascript:alert(1)'}),null);
});
test('Sync keeps previously published posts and newer entries first',()=>{
 const old=[{id:'old',permalink:'https://instagram.com/p/Old123/',timestamp:'2026-10-01T00:00:00Z'}];
 const fresh=[{id:'new',permalink:'https://instagram.com/reel/New123/',timestamp:'2026-11-03T00:00:00Z'}];
 assert.deepEqual(mergePosts(old,fresh).map(x=>x.id),['new','old']);
});
test('Page is interactive, supports close controls and is wired to a periodic authorized sync',()=>{
 for(const s of ['id="instagram-journal"','id="instagram-post-grid"','id="instagram-guide"','id="instagram-guide-close"','instagram-guides.js','instagram-guides.css'])
   assert.ok(html.includes(s),s);
 assert.match(script,/caption/);
 assert.match(script,/aria-expanded/);
 assert.match(script,/replaceChildren/);
 assert.match(yaml,/schedule:/);
 assert.match(yaml,/INSTAGRAM_ACCESS_TOKEN/);
 assert.ok(yaml.includes('node --test portfolio-site/tests/instagram-guides.test.mjs'));
});

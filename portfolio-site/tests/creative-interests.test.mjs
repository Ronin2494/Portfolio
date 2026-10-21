import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import vm from 'node:vm';
import {test} from 'node:test';

const root=resolve(import.meta.dirname,'..');
const html=readFileSync(resolve(root,'index.html'),'utf8');
const css=readFileSync(resolve(root,'beyond.css'),'utf8');
const publicJS=readFileSync(resolve(root,'beyond.js'),'utf8');
const editorHTML=readFileSync(resolve(root,'creative-editor.html'),'utf8');
const editorJS=readFileSync(resolve(root,'creative-editor.js'),'utf8');
const api=readFileSync(resolve(root,'../portfolio-membership-api/server.js'),'utf8');
const media=JSON.parse(readFileSync(resolve(root,'creative-posts.json'),'utf8'));

test('all four interest cards are keyboard-operable buttons connected to one region',()=>{
  const interests=['music','movement','presence','questions'];
  assert.equal((html.match(/class="hobby-card /g)||[]).length,4);
  for(const interest of interests){
    assert.match(html,new RegExp('button type="button" class="hobby-card [^"]*" data-interest="'+interest+'" aria-expanded="false" aria-controls="beyond-detail"'));
  }
  assert.match(html,/id="beyond-detail"[^>]*hidden tabindex="-1"/);
  assert.match(html,/id="beyond-close"/);
  assert.match(html,/href="beyond\.css\?v=[A-Za-z0-9-]+"/);
  assert.match(html,/src="beyond\.js\?v=1" defer/);
});
test('four visual cards retain their approved colors and graphics and open accessible details',()=>{
  for(const cls of ['music-card','dance-card','mind-card','build-card','music-bars','dance-orbit','zen-graphic','build-graphic']){
    assert.ok(html.includes(cls),cls);
  }
  assert.match(css,/\.beyond \.hobby-card:focus-visible/);
  assert.match(css,/\.beyond-detail\[hidden\]\{display:none!important\}/);
  assert.match(css,/@media\(max-width:700px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  for(const field of ['kind','date','steps','activeCalories'])assert.ok(publicJS.includes(field));
  assert.ok(publicJS.includes('replaceChildren('));
  assert.doesNotMatch(publicJS, /\.innerHTML\s*=/);
});
test('the existing media catalog includes verified singing performances',()=>{
  const music=media.items.filter(item=>item.category==='music');
  assert.ok(music.length>=3);
  assert.ok(music.some(item=>new URL(item.url).hostname.includes('youtube')));
  assert.ok(music.some(item=>new URL(item.url).hostname.includes('instagram')));
});
test('creator editor is private with Firebase email sign-in and editable publishing',()=>{
  assert.match(editorHTML,/name="robots" content="noindex,nofollow"/);
  assert.match(editorHTML,/id="editor-workspace" hidden/);
  assert.match(editorHTML,/id="creative-form"/);
  assert.match(editorHTML,/id="entry-steps"/);
  assert.match(editorHTML,/id="entry-calories"/);
  assert.match(editorJS,/sendSignInLinkToEmail/);
  assert.match(editorJS,/isSignInWithEmailLink/);
  assert.match(editorJS,/data\.user\?\.admin/);
  for(const method of ["'POST'","'PATCH'","'DELETE'"])assert.ok(editorJS.includes(method));
  assert.doesNotMatch(editorJS,/\.innerHTML\s*=/);
});
test('API public read and owner-only write routes remain separated',()=>{
  assert.match(api,/app\.get\('\/api\/creative',asyncRoute/);
  assert.match(api,/app\.post\('\/api\/admin\/creative',ready,asyncRoute\(authorized\),adminOnly/);
  assert.match(api,/app\.patch\('\/api\/admin\/creative\/:id',ready,asyncRoute\(authorized\),adminOnly/);
  assert.match(api,/app\.delete\('\/api\/admin\/creative\/:id',ready,asyncRoute\(authorized\),adminOnly/);
  assert.match(api,/creativeRecords\.createIndex\(\{kind:1,date:1\},\{unique:true/);
});
test('API validates video links, step values, and calendar dates',()=>{
  const start=api.indexOf("const creativeKinds =");
  const end=api.indexOf("const publicCreativeRecord =",start);
  assert.ok(start>=0&&end>start);
  const helpers=vm.runInNewContext(api.slice(start,end)+'\n({creativeDocument,creativeVideoURL,creativeDate})',{
    Set,URL,Date,Number,String
  });
  const goodVideo=helpers.creativeDocument({kind:'music',title:'Sample',url:'https://www.youtube.com/watch?v=u70pLWvkn8g'});
  assert.equal(goodVideo.record.kind,'music');
  assert.equal(helpers.creativeDocument({kind:'music',title:'bad',url:'https://youtube.com.evil.example/watch?v=u70pLWvkn8g'}).error!==undefined,true);
  assert.equal(helpers.creativeDocument({kind:'meditation',title:'bad',url:'http://www.instagram.com/reel/DeW2g_8sPnv/'}).error!==undefined,true);
  const activity=helpers.creativeDocument({kind:'activity',date:'2026-10-20',steps:9074,activeCalories:403});
  assert.equal(activity.record.steps,9074);
  assert.equal(helpers.creativeDocument({kind:'activity',date:'2026-02-30',steps:3,activeCalories:4}).error!==undefined,true);
  assert.equal(helpers.creativeDocument({kind:'activity',date:'2026-10-20',steps:-1,activeCalories:4}).error!==undefined,true);
  assert.equal(helpers.creativeDocument({kind:'activity',date:'2026-10-20',steps:1.5,activeCalories:4}).error!==undefined,true);
  assert.equal(helpers.creativeDocument({kind:'composition',title:'My lyric',body:'Line one\nLine two'}).record.body,'Line one\nLine two');
});

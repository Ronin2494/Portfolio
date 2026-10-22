import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const css=read('card-design-system.css');
const html=read('index.html');
const project=read('work-showcase.css');
const hobby=read('beyond.css');
const media=read('media-thumbnail.css');
const activity=read('movement-tracker.css');
const membership=read('membership.css');

test('card design system is loaded after component styles without changing script order',()=>{
  const sheets=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(x=>x[1].split('?')[0]);
  const system=sheets.indexOf('card-design-system.css');
  assert.ok(system>0);
  for(const file of ['work-showcase.css','beyond.css','media-thumbnail.css','movement-tracker.css',
    'creative.css','creative-inline.css','membership.css'])
    assert.ok(sheets.indexOf(file)>=0&&sheets.indexOf(file)<system,file+' should precede system styles');
  for(const file of ['movement-tracker.js','media-thumbnail.js','beyond.js'])
    assert.match(html,new RegExp('src="'+file.replace('.','\\.')+'\\?v=[^"]+" defer'));
});

test('layered treatments cover public project, Beyond, media, member and movement cards',()=>{
  for(const cls of ['.bento>.tile','.beyond .hobby-card','.beyond-media-link',
    '.creative-inline-video','.creative-opening','.member-media-card','.movement-metric']){
    assert.ok(css.includes(cls),'missing '+cls);
  }
  assert.match(css,/\.beyond-media-link \.media-thumbnail/);
  assert.match(css,/\.movement-metric:is\(\.movement-steps-card,\.movement-calories-card\)/);
  assert.match(css,/\.member-media-card \.member-media-lock-label\{z-index:3\}/);
});

test('approved asymmetric Bento spans remain intact and layer styles do not replace existing project glow',()=>{
  assert.match(hobby,/grid-column:span 7/);
  assert.match(hobby,/grid-column:span 5/);
  assert.match(project,/\.bento > \.tile::after\{/);
  assert.doesNotMatch(css,/\.bento:not\(\.is-layered-deck\)>\.tile::after/);
  assert.match(css,/\.bento:not\(\.is-layered-deck\)>\.tile \.tile-art::after/);
  assert.match(activity,/\.movement-primary-cards>\.movement-metric:first-child\{grid-column:span 7\}/);
  assert.match(activity,/\.movement-primary-cards>\.movement-metric:last-child\{grid-column:span 5\}/);
});

test('all enhanced cards preserve native interactions and thumbnails instead of drawing fake assets',()=>{
  assert.match(css,/pointer-events:none/);
  assert.doesNotMatch(css,/background-image\s*:\s*url\(/);
  assert.doesNotMatch(css,/display:none\s*!important/);
  assert.match(media,/\.media-thumbnail-image/);
  assert.match(membership,/\.member-media-locked/);
  assert.match(html,/id="beyond-detail"/);
  assert.match(html,/id="project-grid"/);
});

test('responsive, keyboard and reduced-motion coverage is declared for the shared styles',()=>{
  assert.match(css,/@media\(max-width:700px\)/);
  assert.match(css,/@media\(hover:none\)/);
  assert.match(css,/@media\(hover:hover\) and \(pointer:fine\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/:focus-visible/);
  assert.match(css,/outline:3px solid var\(--portfolio-card-focus\)/);
  assert.match(css,/\.beyond-media-link:focus-visible\{outline-color:#e2f88f\}/);
});

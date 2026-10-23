import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const read=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const html=read('index.html'),main=read('main.js'),neural=read('neural-field.js'),
 theme=read('neural-theme.css'),styles=read('styles.css'),original=read('card-design-system.css');

test('isolated neural preview uses the original page architecture',()=>{
 assert.match(html,/<html lang="en" class="neural-preview">/);
 assert.match(html,/<canvas id="universe" aria-hidden="true"><\/canvas>\s*<canvas id="neural-field" aria-hidden="true"><\/canvas>/);
 assert.match(html,/href="neural-theme\.css\?v=neural-preview-2"/);
 assert.match(html,/src="neural-field\.js\?v=neural-preview-2" defer/);
 assert.match(html,/src="main\.js\?v=neural-preview-2"/);
 assert.ok(html.indexOf('neural-field.js')<html.indexOf('main.js?v=neural-preview-2'));
 for(const id of ['portal-journey','portal-stage','projects','project-grid','beyond','creative','membership','connect']){
   assert.match(html,new RegExp('id="'+id+'"'));
 }
 assert.match(original,/\.bento/);
 assert.match(styles,/\.portal-journey/);
});

test('hero reverse scroll, controlled entrance and timed handoff remain unchanged',()=>{
 for(const required of ['function advanceIntro(delta)','function reenterIntro(delta=0, reset=false)',
  'function releaseIntro(skip=false)','function updateScroll()','function animateUI(timestamp)',
  'if(timestamp-finalFrameStartedAt>=300)releaseIntro()',
  "document.addEventListener('wheel'","document.addEventListener('keydown'"]){
   assert.ok(main.includes(required),'missing approved behavior '+required);
 }
 assert.match(main,/stage\.dataset\.neuralProgress=String\(t\)/);
 assert.match(main,/stage\.dataset\.neuralPaused=String\(paused\)/);
 assert.match(main,/if\(scene\)scene\.render\(t,paused\)/);
 assert.match(main,/scene=\{render:\(\)=>\{\}\}/);
});

test('bounded network uses procedural cell hashing without unbounded particle storage',()=>{
 assert.match(neural,/const rand=/);
 assert.match(neural,/const budget=window\.innerWidth<700\?1450:3100/);
 assert.match(neural,/if\(\+\+count>budget\)break neuronRows/);
 assert.match(neural,/axons\.quadraticCurveTo/);
 assert.match(neural,/ctx\.stroke\(axons\)/);
 assert.match(neural,/stage\.dataset\.neuralProgress/);
 assert.match(neural,/stage\.dataset\.neuralPaused/);
 assert.match(neural,/prefers-reduced-motion: reduce/);
 assert.match(neural,/if\(document\.hidden\)return/);
 assert.doesNotMatch(neural,/\.appendChild\(/);
 assert.doesNotMatch(neural,/new Array\(1000000\)/);
});

test('neural style applies to sections, card borders, text and responsive layouts',()=>{
 for(const section of ['.site-nav','.projects','.manifesto','.beyond','.creative-gallery',
  '.membership-section','.end-section','.footer','.bento>.tile','.beyond .hobby-card']){
   assert.ok(theme.includes(section),'missing neural treatment '+section);
 }
 assert.match(theme,/html\.neural-preview main#work/);
 assert.match(theme,/html\.neural-preview #neural-field/);
 assert.match(theme,/html\.neural-preview \.portal-handoff\{z-index:8\}/);
 assert.match(theme,/@media\(max-width:700px\)/);
 assert.match(theme,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(theme,/:focus-visible/);
 assert.doesNotMatch(theme,/https?:\/\//);
});

test('legacy Rudransh6619 is not visible in the preview heading or section labels',()=>{
 assert.doesNotMatch(html,/Rudransh6619/i);
 assert.match(html,/CREATIVE IDENTITY \/ THE NEURAL STUDIO/);
 assert.match(html,/NEURAL STUDIO \/\/ STORY IN MOTION/);
 assert.doesNotMatch(html,/NEURAL CORTEX \/ TEST EDITION|neural-preview-tag/);
});

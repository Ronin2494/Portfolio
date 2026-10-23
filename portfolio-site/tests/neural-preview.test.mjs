import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
const file=name=>readFileSync(new URL('../'+name,import.meta.url),'utf8');
const html=file('index.html'),main=file('main.js'),neural=file('neural-field.js'),css=file('neural-theme.css');
test('neural preview is opt-in, isolated, and mounted with its own canvas',()=>{
 assert.match(html,/<html lang="en" class="neural-preview">/);
 assert.match(html,/<canvas id="universe" aria-hidden="true"><\/canvas>/);
 assert.match(html,/<canvas id="neural-field" aria-hidden="true"><\/canvas>/);
 assert.match(html,/neural-theme\.css\?v=neural-preview-2/);
 assert.match(html,/neural-field\.js\?v=neural-preview-2/);
 assert.match(css,/html\.neural-preview #universe\{opacity:0;pointer-events:none\}/);
 assert.match(css,/html\.neural-preview #neural-field/);
});
test('approved hero scroll, reverse handoff, pause and 300ms settle remain',()=>{
 for(const s of ['function advanceIntro(delta)','function reenterIntro(delta=0, reset=false)',
 'function releaseIntro(skip=false)','function updateScroll()',
 "document.addEventListener('wheel'","document.addEventListener('keydown'",
 "document.addEventListener('click'","requestAnimationFrame(animateUI)",
 "timestamp-finalFrameStartedAt>=300","stage.dataset.neuralProgress=String(t)",
 "stage.dataset.neuralPaused=String(paused)"]){
 assert.ok(main.includes(s),s);
 }
 assert.match(main,/if\(document\.documentElement\.classList\.contains\('neural-preview'\)\)/);
});
test('mobile neural performance defers first canvas draw without changing scroll mechanics',()=>{
 assert.match(neural,/requestIdleCallback\(start,\{timeout:1100\}\)/);
 assert.match(neural,/window\.addEventListener\('load'/);
 assert.match(neural,/frameInterval\(\)/);
 assert.match(html,/href="scene-image\.css" media="print" onload="this\.media='all'"/);
 assert.match(html,/<noscript><link rel="stylesheet" href="scene-image\.css" \/><\/noscript>/);
 assert.doesNotMatch(neural,/\ndraw\(0\);requestAnimationFrame\(frame\)/);
});
test('procedural network is bounded, zoom-driven and respects motion settings',()=>{
 for(const s of ["Math.imul","smooth(p)","const budget=window.innerWidth<700?1450:3100",
 "getContext('2d'","prefers-reduced-motion: reduce","stage.dataset.neuralProgress",
 "document.hidden","window.addEventListener('resize'"]){
 assert.ok(neural.includes(s),s);
 }
 assert.doesNotMatch(neural,/fetch\(|innerHTML|setInterval\(/);
});
test('neural visual grammar applies across navigation, sections, cards, modals and footer',()=>{
 for(const cls of ['.site-nav','.intro','.projects','.manifesto','.beyond',
 '.bento>.tile','.creative-gallery','.membership-section','.end-section','.footer',
 '.beyond-detail','.movement-metric','.member-media-card']){
 assert.ok(css.includes(cls),cls);
 }
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/:focus-visible/);
});
test('old identity labels are removed from visible copy, and section controls survive',()=>{
 assert.doesNotMatch(html,/RUDRANSH6619|rudransh6619/i);
 assert.doesNotMatch(html,/NEURAL CORTEX \/ TEST EDITION|neural-preview-tag/i);
 assert.doesNotMatch(css,/neural-preview-tag/);
 assert.match(html,/CREATIVE IDENTITY \/ THE NEURAL STUDIO/);
 for(const id of ['project-grid','project-constellation','beyond-grid','beyond-detail','motion-toggle','portal-journey']){
 assert.ok(html.includes('id="'+id+'"'),id);
 }
});

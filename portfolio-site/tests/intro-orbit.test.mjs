import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import vm from 'node:vm';

const root=resolve(import.meta.dirname,'..');
const html=readFileSync(resolve(root,'index.html'),'utf8');
const css=readFileSync(resolve(root,'intro-orbit.css'),'utf8');
const js=readFileSync(resolve(root,'intro-orbit.js'),'utf8');

test('DS orbit keeps existing markup, visual identity, and central monogram',()=>{
  assert.match(html, /class="intro-orbit" aria-hidden="true"/);
  for(const part of ['orbit o1','orbit o2','orbit o3','orbit-sun','orbit-label-1','orbit-label-2','orbit-label-3']){
    assert.ok(html.includes(part),part);
  }
  for(const label of ['CREATE','EXPLORE','EVOLVE']){
    assert.ok(html.includes(label),label);
  }
  assert.match(html,/href="intro-orbit\.css\?v=1"/);
  assert.match(html,/src="intro-orbit\.js\?v=1" defer/);
  assert.match(css,/\.intro-orbit\s+\.orbit-sun\s*\{[^}]*z-index:2/s);
});

test('animation rotates three rings with individually constrained motion',()=>{
  for(const fragment of [
    'ds-orbit-revolve','ds-orbit-tilt','ds-orbit-precess',
    'ds-orbit-halo','ds-orbit-label-drift','animation-play-state:paused',
    'animation-play-state:running','prefers-reduced-motion:reduce'
  ]){
    assert.ok(css.includes(fragment),fragment);
  }
  assert.match(css,/\.intro-orbit\s+\.o2\s*\{\s*transform:rotateX\(58deg\)/);
  assert.match(css,/\.intro-orbit\s+\.o3\s*\{\s*transform:rotate\(-35deg\) scaleX\(\.54\)/);
  assert.doesNotMatch(css,/@keyframes\s+ds-orbit[^{}]*\{[^{}]*\.orbit-sun/);
});

test('visibility observer pauses offscreen and resumes on intersection',()=>{
  const states=[];
  const classes=new Set();
  const orbit={
    classList:{
      add(c){classes.add(c);states.push('add:'+c)},
      toggle(c,present){if(present)classes.add(c);else classes.delete(c);states.push(present?'show':'hide')}
    }
  };
  let callback,tracked;
  class MockObserver{
    constructor(fn,options){callback=fn;assert.equal(options.threshold,0)}
    observe(el){tracked=el}
  }
  vm.runInNewContext(js,{document:{querySelector:()=>orbit},window:{IntersectionObserver:MockObserver},IntersectionObserver:MockObserver});
  assert.equal(tracked,orbit);
  callback([{target:orbit,isIntersecting:true}]);
  assert.equal(classes.has('orbit-in-view'),true);
  callback([{target:orbit,isIntersecting:false}]);
  assert.equal(classes.has('orbit-in-view'),false);
  assert.deepEqual(states,['show','hide']);
});

test('observer fallback permits animation when browser lacks observer',()=>{
  const states=new Set();
  const orbit={classList:{add(c){states.add(c)}}};
  vm.runInNewContext(js,{document:{querySelector:()=>orbit},window:{}});
  assert.equal(states.has('orbit-in-view'),true);
});

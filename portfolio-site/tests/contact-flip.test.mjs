import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../contact-flip.css',import.meta.url),'utf8');
const js=readFileSync(new URL('../contact-flip.js',import.meta.url),'utf8');
test('exact approved tagline appears once in the existing hero',()=>{
  assert.equal(html.split('A paper is not needed to define but to ground ourselves.').length-1,1);
  assert.match(html, /class="scene-tagline"/);
  assert.match(html, /One creator\.<br \/><em>Many universes\.<\/em>/);
});
test('existing landing CTA opens an accessible modal',()=>{
  assert.match(html,/class="scene-connect" data-contact-open/);
  assert.match(html,/id="contact-modal" role="dialog" aria-modal="true"/);
  assert.match(html,/aria-labelledby="contact-modal-title"/);
  assert.match(js,/Escape/);
  assert.match(js,/e\.key==='Tab'/);
  assert.match(js,/returnTo\.focus/);
});
test('contact details and resume safe unavailable state',()=>{
  assert.match(html,/https:\/\/www\.linkedin\.com\/in\/deepak-s-b099186b/);
  assert.match(html,/Deepak-Sharma-Resume\.pdf/);
  assert.match(html,/aria-disabled="true"/);
  assert.match(js,/data-resume-download/);
});
test('animation is CSS scoped and honors reduced motion',()=>{
  assert.match(css,/rotateY\(-92deg\)/);
  assert.match(css,/rotateY\(0\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/@media\(max-width:440px\)/);
});

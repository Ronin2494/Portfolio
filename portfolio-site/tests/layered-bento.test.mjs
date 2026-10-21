import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../work-showcase.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('the portfolio keeps six original project cards and real links',()=>{
  assert.equal((html.match(/<article class="tile /g)||[]).length,6);
  assert.equal((html.match(/class="round-link"/g)||[]).length,6);
});
test('asymmetric Bento uses unequal spans',()=>{
  assert.match(css,/grid-template-columns:repeat\(12,minmax\(0,1fr\)\)/);
  assert.match(css,/grid-column:span 5/);
  assert.match(css,/grid-column:span 7/);
});
test('layered card surfaces support active focus and motion preferences',()=>{
  assert.match(css,/\.bento > \.tile::before\s*\{/);
  assert.match(css,/:focus-within/);
  assert.match(css,/prefers-reduced-motion:reduce/);
});
test('small screen layout falls back to one column',()=>{
  assert.match(css,/@media\(max-width:700px\)/);
  assert.match(css,/\.bento\{grid-template-columns:minmax\(0,1fr\)/);
});

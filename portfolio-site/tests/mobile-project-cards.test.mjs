import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = filename => readFileSync(new URL('../' + filename,import.meta.url),'utf8');
const html = read('index.html');
const css = read('visitor-journey.css');

test('six project cards retain accessible direct links and art separated in markup',()=>{
  const cards = [...html.matchAll(/<article class="tile tile-[^]*?<\/article>/g)].map(m=>m[0]);
  assert.equal(cards.length,6);
  for (const card of cards) {
    const art = card.indexOf('class="tile-art ');
    const content = card.indexOf('class="tile-content"');
    assert.ok(art>0 && content>art, 'art is separate from card copy');
    assert.match(card, /class="round-link" href="https:\/\//);
    assert.match(card, /aria-label="(?:Visit|Explore)/);
    assert.match(card, /class="project-proof"/);
  }
});
test('mobile cards use independent art and content zones instead of painted text overlays',()=>{
  const rule = css.slice(css.indexOf('/* Mobile project-card readability:'));
  assert.ok(rule.length>2000,'mobile fix exists');
  assert.match(rule,/@media\(max-width:700px\)/);
  assert.match(rule,/\.tile>\.tile-art\{[^}]*position:relative!important/);
  assert.match(rule,/\.tile>\.tile-content\{[^}]*background:linear-gradient/);
  assert.match(rule,/\.tile \.tile-text>p:not\(\.project-proof\)\{[^}]*opacity:1!important/);
  assert.match(rule,/\.tile \.round-link\{[^}]*min-width:48px;min-height:48px/);
  assert.match(rule,/@media\(max-width:370px\)/);
  assert.match(rule,/prefers-reduced-motion:reduce/);
});

test('mobile artwork keeps its intended 3D composition and vinyl keyframes',()=>{
  const rule=css.slice(css.indexOf('/* Mobile project-card readability:'));
  assert.match(rule,/height:clamp\(270px,76vw,330px\)/);
  assert.match(rule,/\.record\{[^}]*transform:translateX\(-50%\) rotate\(-15deg\)/);
  assert.match(rule,/\.record\{animation:vinyl 30s linear infinite\}/);
  assert.match(rule,/prefers-reduced-motion:reduce/);
});

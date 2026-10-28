import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {test} from 'node:test';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const html = read('index.html');
const css = read('visitor-journey.css');
const gallery = read('membership.js');

test('hero explains builder positioning and offers immediate ways to connect', () => {
  assert.match(html, /One creator\.<br \/><em>Many universes\./);
  assert.match(html, /product builder in Toronto/);
  assert.match(html, /class="scene-cta">SEE THE WORK/);
  assert.match(html, /class="scene-instagram" href="https:\/\/www\.instagram\.com\/puru\.ushah\//);
  assert.match(html, /class="scene-connect" href="#connect"/);
  assert.match(html, /class="header-contact" href="#connect"/);
  assert.match(html, /<footer class="footer"[^]*?INSTAGRAM ↗/);
});
test('creator reel gallery references three existing visual assets and accessible public posts', () => {
  const markup = html.match(/<div class="creator-reels"[^]*?<dialog id="beyond-detail"/)?.[0];
  assert.ok(markup, 'the reel showcase belongs to Beyond the Screen');
  assert.equal((markup.match(/<a class="creator-reel /g)||[]).length,3);
  const covers = ['DeW2g_8sPnv.jpg','Dd2VMqrtrG5.jpg','DeVGL5PshF3.jpg'];
  for(const name of covers){
    assert.ok(markup.includes('media/reels/'+name),'reel cover is referenced: '+name);
    assert.ok(existsSync(new URL('../media/reels/'+name,import.meta.url)),'reel cover exists: '+name);
  }
  assert.equal((markup.match(/loading="lazy" decoding="async"/g)||[]).length,3);
  assert.equal((markup.match(/alt="Cover artwork from /g)||[]).length,3);
  assert.equal((markup.match(/rel="noopener noreferrer"/g)||[]).length,4,'reel and all-reels links are safe');
  assert.match(css, /prefers-reduced-motion:reduce/);
});
test('six project cards contain concrete product demonstrations without fake business metrics', () => {
  assert.equal((html.match(/class="project-proof"/g)||[]).length,6);
  for (const id of ['footnow','lyrics','seatpath','catalyst','taskmail','espionaaj']) {
    const card = html.match(new RegExp('<article class="tile tile-' + id + '[^]*?</article>'))?.[0];
    assert.ok(card && card.includes('class="project-proof"'),'proof line in '+id);
  }
  assert.match(html, /href="https:\/\/taskmail\.onrender\.com"/);
  assert.match(html, /href="https:\/\/espionaaj\.onrender\.com"/);
  assert.doesNotMatch(html, /href="https:\/\/github\.com\/Ronin2494\/(?:taskmail|Espionaaj)"/);
});
test('private gallery retains an accessible no-JS preview and avoids invented prices', () => {
  assert.match(html, /id="member-collection-meta"/);
  assert.match(html, /class="member-preview-art"/);
  assert.match(html, /class="member-noscript"/);
  assert.match(html, /This is an illustrative preview/);
  assert.doesNotMatch(html, /<p id="member-empty"[^>]*>Loading gallery/);
  assert.match(gallery, /Math\.min\(\.\.\.validPrices\)/);
  assert.match(gallery, /items\.length===1/);
  assert.match(gallery, /priceCents = Number\.isSafeInteger\(item\.priceCents\)[^\n]*: null/);
  assert.match(gallery, /Checkout is paused/);
});
test('Person schema, accessible links and visitor messaging remain consistent', () => {
  const schemaSource = html.match(/<script type="application\/ld\+json">\s*([^]*?)\s*<\/script>/)?.[1];
  assert.ok(schemaSource,'JSON-LD Person block exists');
  const schema=JSON.parse(schemaSource);
  assert.equal(schema['@type'],'Person');
  assert.equal(schema.name,'Deepak Sharma');
  assert.ok(schema.sameAs.includes('https://www.instagram.com/puru.ushah/'));
  assert.match(html,/Music, movement, and the questions that won’t leave me alone/);
  assert.doesNotMatch(html,/Each card opens above the page and returns to its place when closed/);
  assert.doesNotMatch(html,/The checkout button uses each item/);
});

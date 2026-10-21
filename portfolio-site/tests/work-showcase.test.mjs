import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';
import vm from 'node:vm';

const root = resolve(import.meta.dirname, '..');
const html = readFileSync(resolve(root, 'index.html'), 'utf8');
const css = readFileSync(resolve(root, 'work-showcase.css'), 'utf8');
const script = readFileSync(resolve(root, 'work-showcase.js'), 'utf8');

test('work showcase is integrated without removing existing project links', () => {
  assert.match(html, /id="project-grid"/);
  assert.match(html, /id="work-toolbar" hidden/);
  assert.match(html, /href="work-showcase\.css\?v=[A-Za-z0-9-]+"/);
  assert.match(html, /src="work-showcase\.js\?v=[A-Za-z0-9-]+" defer/);
  assert.equal((html.match(/<article class="tile /g) || []).length, 6);
  assert.equal((html.match(/data-work-filter="/g) || []).length, 3);
  assert.match(html, /https:\/\/footnow\.onrender\.com/);
  assert.match(html, /https:\/\/lyricsverse\.onrender\.com/);
  assert.match(html, /https:\/\/seatpath\.onrender\.com/);
  assert.match(html, /https:\/\/catalystimmigration\.onrender\.com/);
});

test('filters preserve live and in-progress cards and update accessible state', () => {
  const buttons = ['all', 'live', 'building'].map(key => {
    const attrs = {};
    return {
      dataset: { workFilter: key },
      attrs,
      number: { textContent: '' },
      getAttribute(name) { return this.attrs[name]; },
      setAttribute(name, value) { this.attrs[name] = value; },
      querySelector(selector) { return selector === '.filter-number' ? this.number : null; },
      click() { this.handler?.(); },
      addEventListener(type, handler) { if (type === 'click') this.handler = handler; }
    };
  });
  const tiles = [true,true,true,true,false,false].map(live => ({
    hidden: false,
    querySelector(selector) { return selector === '.status-live' && live ? {} : null; },
    addEventListener() {},
    style: { setProperty() {} }
  }));
  const counter = { textContent: '' };
  const toolbar = {
    hidden: true,
    querySelector(selector) { return selector === '#work-visible-count' ? counter : null; },
    querySelectorAll(selector) { return selector === '[data-work-filter]' ? buttons : []; }
  };
  const section = {
    querySelectorAll(selector) { return selector === '.bento > .tile' ? tiles : []; }
  };
  const document = {
    getElementById(id) { return id === 'projects' ? section : id === 'work-toolbar' ? toolbar : null; }
  };
  vm.runInNewContext(script, {
    document,
    window: { matchMedia: () => ({ matches: false }) }
  });
  assert.equal(toolbar.hidden, false);
  assert.equal(counter.textContent, '06 PROJECTS IN VIEW');
  assert.deepEqual(buttons.map(b => b.number.textContent), ['06','04','02']);

  buttons[1].click();
  assert.equal(counter.textContent, '04 PROJECTS IN VIEW');
  assert.deepEqual(tiles.map(t => t.hidden), [false,false,false,false,true,true]);
  assert.equal(buttons[1].getAttribute('aria-pressed'), 'true');

  buttons[2].click();
  assert.equal(counter.textContent, '02 PROJECTS IN VIEW');
  assert.deepEqual(tiles.map(t => t.hidden), [true,true,true,true,false,false]);

  buttons[0].click();
  assert.equal(counter.textContent, '06 PROJECTS IN VIEW');
  assert.equal(tiles.some(t => t.hidden), false);
});

test('reduced motion, keyboard focus, touch and no-JS behavior retain usability', () => {
  assert.match(css, /\.work-toolbar\[hidden\]/);
  assert.match(css, /\.bento\s*>\s*\.tile\[hidden\]\s*\{display:none!important\}/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion:reduce/);
  assert.match(css, /hover:hover/);
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(script, /if\(!canTilt\.matches\)return/);
});

test('SeatPath appears as in progress in both filters and constellation', () => {
  const card = html.match(/<article class="tile tile-seatpath[^]*?<\/article>/)?.[0];
  assert.ok(card, 'SeatPath exists');
  assert.match(card, /class="status status-build">IN PROGRESS<\/span>/);
  assert.doesNotMatch(card, /LIVE PROTOTYPE|status-live/);
  assert.match(html, /data-work-filter="live"[^\n]*>Live <span class="filter-number" aria-hidden="true">03<\/span>/);
  assert.match(html, /data-work-filter="building"[^\n]*>In progress <span class="filter-number" aria-hidden="true">03<\/span>/);
});

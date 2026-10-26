import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
const read=n=>readFileSync(new URL('../'+n,import.meta.url),'utf8');
const html=read('index.html'),css=read('profile-skill-constellation.css'),js=read('profile-skill-constellation.js'),experience=read('portfolio-experience.js');
test('Profile is a real personal introduction with accessible linked sections',()=>{
 assert.match(html,/id="identity-lab"/);
 assert.match(html,/Deepak Sharma/);
 assert.match(html,/role="tablist"/);
 assert.equal((html.match(/data-profile-tab/g)||[]).length,3);
 assert.equal((html.match(/data-profile-panel/g)||[]).length,3);
 assert.match(html,/aria-controls="profile-about"/);
 assert.match(html,/id="profile-connect"/);
 assert.match(js,/aria-selected/);
 assert.match(js,/ArrowRight/);
 assert.match(js,/showTab\(0\)/);
});
test('Five skill cards form accessible active, inactive, swipeable stack',()=>{
 assert.equal((html.match(/class="skill-slide"/g)||[]).length,5);
 assert.match(html,/data-skill-prev/);assert.match(html,/data-skill-next/);
 assert.match(js,/\[data-skill-next\]/);assert.match(js,/pointerdown/);
 assert.match(js,/pointercancel/);assert.match(js,/aria-hidden/);
 assert.match(js,/slide\.hidden=depth>2/);
 assert.match(css,/\.skill-slide\[data-position="0"\]/);
 assert.match(css,/\.skill-slide\[hidden\]\{display:none\}/);
});
test('Constellation is transformed into identity-bearing cards without dropping project actions',()=>{
 assert.match(experience,/dot\.textContent=item\.initials/);
 assert.match(css,/\.constellation-node\{/);
 assert.match(css,/\.constellation-star\{/);
 assert.match(css,/\.constellation-preview-cta/);
 assert.match(html,/id="constellation-preview-link"/);
 assert.match(css,/@media\(max-width:740px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/:focus-visible/);
});
test('Hero timing, navigation and original asymmetric bento remain unchanged',()=>{
 assert.match(html,/id="portal-stage"/);
 assert.match(html,/id="project-grid"/);
 assert.match(html,/data-project-view="constellation"/);
 assert.match(html,/data-project-view="grid"/);
 assert.ok(html.indexOf('id="identity-lab"')<html.indexOf('class="signal-index"'));
 assert.ok(html.indexOf('profile-skill-constellation.css')>html.indexOf('neural-interactions.css'));
});

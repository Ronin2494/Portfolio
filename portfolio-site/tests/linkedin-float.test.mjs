import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('index.html'), css=read('linkedin-float.css');
test('Canva LinkedIn banner renders as a separate meaningful link with original copy',()=>{
 assert.match(html,/class="linkedin-float" hidden href="https:\/\/www\.linkedin\.com\/in\/deepak-s-b099186b"/);
 assert.match(html,/Life is short, make the best of it!/);
 assert.match(html,/CONNECT ON LINKEDIN/);
 assert.match(html,/class="linkedin-float-mark"/);
 assert.match(html,/class="linkedin-float-arrow"/);
 assert.match(html,/rel="noopener noreferrer"/);
 assert.match(html,/aria-label="Connect with Deepak Sharma on LinkedIn/);
 assert.match(html,/href="linkedin-float\.css\?v=/);
});
test('floating banner does not displace main layout or replace DS floating navigation',()=>{
 assert.match(html,/class="personal-dock" id="personal-dock"/);
 assert.match(css,/\.linkedin-float\{[^}]*position:fixed/);
 assert.match(css,/left:clamp\(14px/);
 assert.match(css,/z-index:74/);
 assert.match(css,/max-width:calc\(100vw - 105px\)/);
 assert.match(css,/env\(safe-area-inset-bottom,0px\)/);
 assert.match(css,/@media\(max-width:365px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/@media\(forced-colors:active\)/);
 assert.match(css,/:focus-visible/);
});

test('the banner is footer-triggered, animated, and hidden from keyboard flow elsewhere',()=>{
 const js=read('linkedin-float.js');
 assert.match(html,/class="linkedin-float" hidden href=/);
 assert.match(html,/src="linkedin-float\.js\?v=/);
 assert.match(js,/IntersectionObserver/);
 assert.match(js,/entry\.isIntersecting/);
 assert.match(js,/banner\.hidden = !visible/);
 assert.match(js,/observer\.observe\(footer\)/);
 assert.match(css,/\.linkedin-float\[hidden\]\{display:none!important\}/);
 assert.match(css,/@keyframes linkedin-entrance/);
 assert.match(css,/\.linkedin-float-light/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});

import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
const main=readFileSync(new URL('../main.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('Hands-free hero waits exactly two seconds before advancing existing scroll timeline',()=>{
 assert.match(main,/const HERO_IDLE_DELAY=2000/);
 assert.match(main,/const HERO_AUTO_DURATION=5500/);
 assert.match(main,/heroAutoTimer=window.setTimeout\(startHeroAuto,HERO_IDLE_DELAY\)/);
 assert.match(main,/target=startProgress\+\(1-startProgress\)\*eased/);
 assert.match(main,/target=1; \/\/ Existing 300ms final-frame handoff/);
 assert.match(main,/function releaseIntro\(skip=false\)/);
});
test('Auto scroll yields to user gestures and pauses on keyboard and touch',()=>{
 for(const signal of ['wheel','touchstart','pointerdown','keydown'])
   assert.ok(main.includes("'"+signal+"'"),signal);
 assert.match(main,/document\.addEventListener\('focusin',stopHeroAuto/);
 assert.match(main,/motionButton\.addEventListener\('click',\(\)=>\{stopHeroAuto\(\);paused=/);
 assert.match(main,/target=progress; \/\/ Give control back/);
 assert.match(main,/cancelAnimationFrame\(heroAutoFrame\)/);
});
test('No forced animation for reduced motion, deep links or returning to hero',()=>{
 assert.match(main,/if\(!reduceMotion\.matches&&!introReleased&&window\.scrollY<=2/);
 assert.match(main,/if\(heroAutoCancelled\|\|introReleased\|\|paused\|\|reduceMotion\.matches/);
 assert.match(main,/!location\.hash\|\|isPortalStartHash\(\)/);
 assert.match(main,/function reenterIntro\(delta=0, reset=false\)/);
 assert.match(html,/class="skip-link" href="#work"/);
});
test('Mobile native scroll and desktop scroll controller are preserved',()=>{
 assert.match(main,/if\(!virtualPortal\)\{/);
 assert.match(main,/window\.scrollTo\(\{top:startScroll\+destination\*eased,left:0,behavior:'instant'\}\)/);
 assert.match(main,/document\.addEventListener\('wheel'/);
 assert.match(main,/function advanceIntro\(delta\)/);
 assert.match(main,/if\(virtualPortal&&!introReleased&&target>=1&&t>=\.99\)/);
});

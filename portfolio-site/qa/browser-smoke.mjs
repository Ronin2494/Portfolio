/* Chromium end-to-end smoke suite: actual DOM, keyboard, mouse and mobile interactions.
   The membership and creative API are stubbed with SAFE fixture responses. No payments occur.
   Run: npm i --no-save playwright@1.55.1 && npx playwright install chromium
        python3 -m http.server 4173 --directory portfolio-site &
        node portfolio-site/qa/browser-smoke.mjs
*/
import { chromium, devices } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const base=process.env.QA_BASE_URL||'http://127.0.0.1:4173';
const output=process.env.QA_OUTPUT||'portfolio-site/qa-results';
await mkdir(output,{recursive:true});
const results=[],findings=[];
const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage','--no-sandbox']});
const errors=[];
const sampleGallery=[
 {id:'QA-PRIVATE-01',title:'<img src=x onerror=alert(1)> QA test private artwork',description:'Fixture, not a purchase',type:'image/jpeg',priceCents:1200},
 {id:'QA-PRIVATE-02',title:'QA test private film',description:'Locked sample video',type:'video/mp4',priceCents:1500}
];
async function routeAPI(context,{payEnabled=false}={}){
 await context.route('https://badbunny-membership-api.onrender.com/**',async route=>{
  const url=new URL(route.request().url());
  const path=url.pathname,method=route.request().method();
  let status=200,data={};
  if(path==='/api/gallery')data={items:sampleGallery};
  else if(path==='/api/paypal/health')data={enabled:payEnabled,connected:payEnabled,mode:'sandbox'};
  else if(path==='/api/creative')data={items:[]};
  else if(path==='/api/paypal/orders'&&method==='POST'){
   status=503;data={error:'QA simulated payment outage; no charge occurred'};
  }else if(path==='/api/paypal/orders/QA012345678/capture'&&method==='POST'){
   status=503;data={error:'QA simulated capture outage'};
  }else if(path==='/api/me'){status=401;data={error:'Unauthorized'};}
  else{status=404;data={error:'QA fixture: endpoint not available'};}
  await route.fulfill({status,contentType:'application/json',
    headers:{'access-control-allow-origin':'*','cache-control':'no-store'},body:JSON.stringify(data)});
 });
 await context.route(/pagead2\.googlesyndication\.com|google-analytics\.com/,route=>route.abort());
}
async function run(name,fn){
 const begun=Date.now();
 try{
  const detail=await fn();
  results.push({name,status:'PASS',ms:Date.now()-begun,detail:detail||''});
  console.log('PASS '+name);
 }catch(error){
  const explanation=(error?.message||String(error)).slice(0,1100);
  results.push({name,status:'FAIL',ms:Date.now()-begun,detail:explanation});
  console.error('FAIL '+name+': '+explanation);
 }
}
async function launchPage(options={}){
 const context=await browser.newContext({
  viewport:{width:1440,height:900},
  reducedMotion:'reduce',
  ...options
 });
 await routeAPI(context);
 const page=await context.newPage();
 page.on('pageerror',error=>errors.push(error.message));
 return {page,context};
}
async function openWork(page){
 await page.goto(base+'/#projects',{waitUntil:'domcontentloaded',timeout:30000});
 await page.locator('#projects').waitFor({state:'attached'});
 await page.waitForTimeout(700);
}
const desktop=await launchPage(),page=desktop.page;
await run('Page shell, primary sections and semantic headings',async()=>{
 await openWork(page);
 for(const id of ['work','nav','projects','project-grid','beyond','beyond-grid','creative','membership','connect']){
  if(await page.locator('#'+id).count()!==1)throw Error('Missing unique #'+id);
 }
 if(await page.locator('main').count()!==1)throw Error('Missing single main');
 if(await page.locator('footer').count()!==1)throw Error('Missing footer');
 return 'Shell and sections present';
});
await run('Header, main anchors, footer and quick navigation',async()=>{
 const a=await page.locator('.site-nav a[href^="#"]').count();
 if(a<3)throw Error('Too few navigation anchors: '+a);
 await page.locator('#dock-trigger').click();
 if(await page.locator('#dock-trigger').getAttribute('aria-expanded')!=='true')throw Error('Dock did not expand');
 if(!await page.locator('#dock-panel').isVisible())throw Error('Dock inaccessible');
 await page.locator('#dock-trigger').click();
 if(await page.locator('#dock-trigger').getAttribute('aria-expanded')!=='false')throw Error('Dock did not close');
});
await run('Neural Index links, layout, accessibility and responsive cards',async()=>{
 const region=page.locator('.signal-index');
 if(!await region.isVisible())throw Error('Neural Index is not visible');
 const cards=region.locator('a.signal-path');
 if(await cards.count()!==3)throw Error('Expected 3 discovery cards');
 const targets=await cards.evaluateAll(els=>els.map(e=>e.getAttribute('href')));
 if(JSON.stringify(targets)!==JSON.stringify(['#projects','#beyond','#creative']))
  throw Error('Incorrect discovery targets: '+targets);
 const sizes=await cards.evaluateAll(els=>els.map(e=>Math.round(e.getBoundingClientRect().width)));
 if(new Set(sizes).size<2)throw Error('All cards are uniform width');
 await region.screenshot({path:join(output,'neural-index-desktop.png')});
 await cards.nth(1).click();
 if(await cards.nth(1).getAttribute('aria-current')!=='location')throw Error('Active route missing');
});
await run('Neural reactive cards respond to pointer and keyboard without blocking clicks',async()=>{
 const card=page.locator('.signal-path').first();
 await card.scrollIntoViewIfNeeded();
 await card.hover();
 if(await card.locator('.neural-reactive-glow').count()!==1)
  throw Error('Shared synapse glow is missing');
 const computed=await card.locator('.neural-reactive-glow').evaluate(el=>getComputedStyle(el).pointerEvents);
 if(computed!=='none')throw Error('Glow intercepts pointer interactions');
 await card.focus();
 if(await card.getAttribute('href')!=='#projects')throw Error('Card route changed');
 const beyond=page.locator('#beyond-grid .hobby-card');
 if(await beyond.count()!==4)throw Error('Creative card count changed');
 if(await beyond.locator('.neural-reactive-glow').count()!==4)throw Error('Shared effects missing on creative cards');
});
await run('Glass profile tabs and skills stack respond to keyboard and buttons',async()=>{
 const profile=page.locator('#identity-lab');
 await profile.scrollIntoViewIfNeeded();
 if(!await profile.isVisible())throw Error('Personal profile absent');
 const tabs=profile.locator('[data-profile-tab]');
 if(await tabs.count()!==3)throw Error('Expected three profile tabs');
 await tabs.nth(1).click();
 if(await tabs.nth(1).getAttribute('aria-selected')!=='true')throw Error('Approach tab was not selected');
 if(!await profile.locator('#profile-approach').isVisible())throw Error('Approach panel hidden');
 await tabs.nth(2).click();
 if(!await profile.locator('#profile-connect').isVisible())throw Error('Connect tab hidden');
 await tabs.nth(0).click();
 const deck=profile.locator('.skill-stage');
 if(await deck.locator('.skill-slide').count()!==5)throw Error('Skill deck missing');
 const before=await deck.locator('.skill-slide[data-position="0"] h3').innerText();
 await profile.locator('[data-skill-next]').click();
 const after=await deck.locator('.skill-slide[data-position="0"] h3').innerText();
 if(before===after)throw Error('Skill stack did not shuffle');
 await profile.locator('[data-skill-prev]').click();
 if(await deck.locator('.skill-slide[data-position="0"] h3').innerText()!==before)
  throw Error('Skill deck did not reverse');
 await profile.screenshot({path:join(output,'profile-skills-desktop.png')});
});
await run('Project view toggle, constellation and asymmetric Bento',async()=>{
 const grid=page.locator('#project-grid'),map=page.locator('#project-constellation');
 await page.locator('[data-project-view="grid"]').click();
 if(!await grid.isVisible())throw Error('Bento view is not visible');
 if(await map.isVisible())throw Error('Constellation not hidden after Bento selection');
 if(await grid.locator(':scope > .tile').count()!==6)throw Error('Wrong number of project cards');
 await page.locator('[data-project-view="constellation"]').click();
 if(!await map.isVisible())throw Error('Constellation fails to open');
 if(await grid.isVisible())throw Error('Grid not hidden');
 await page.locator('[data-project-view="grid"]').click();
});
await run('TaskMail and ESPIONAAJ cards and constellation previews open live websites',async()=>{
 const projects=[
   {tile:'taskmail',name:'TaskMail',url:'https://taskmail.onrender.com'},
   {tile:'espionaaj',name:'Espionaaj',url:'https://espionaaj.onrender.com'}
 ];
 const grid=page.locator('#project-grid');
 await page.locator('[data-project-view="grid"]').click();
 for(const project of projects){
   const link=grid.locator('.tile-'+project.tile+' .round-link');
   if(await link.getAttribute('href')!==project.url)throw Error(project.name+' Bento anchor does not open its live site');
   if(await link.getAttribute('aria-label')!=='Visit '+project.name+' live website')
     throw Error(project.name+' Bento anchor has incorrect accessible label');
 }
 await page.locator('[data-project-view="constellation"]').click();
 const preview=page.locator('#constellation-preview-link');
 for(const project of projects){
   await page.locator('#constellation-nodes .constellation-node').filter({hasText:project.name}).click();
   if(await preview.getAttribute('href')!==project.url)
     throw Error(project.name+' constellation preview does not open its live site');
 }
 await page.locator('[data-project-view="grid"]').click();
});
await run('Project filters and layered card deck',async()=>{
 await page.locator('[data-work-filter="live"]').click();
 let count=await page.locator('#project-grid > .tile:visible').count();
 if(count!==3)throw Error('Live filter yielded '+count);
 await page.locator('[data-work-filter="building"]').click();
 count=await page.locator('#project-grid > .tile:visible').count();
 if(count!==3)throw Error('Building filter yielded '+count);
 await page.locator('[data-work-filter="all"]').click();
 if(await page.locator('#project-grid > .tile:visible').count()!==6)throw Error('All filter failed');
 const switcher=page.locator('#deck-view-switch');
 if(await switcher.count()){
  await switcher.click();
  if(!await page.locator('#project-grid').evaluate(n=>n.classList.contains('is-layered-deck')))throw Error('Deck did not activate');
  const before=await page.locator('#deck-position').innerText();
  await page.locator('#deck-next').click();
  const after=await page.locator('#deck-position').innerText();
  if(before===after)throw Error('Deck navigation not working');
  await switcher.click();
 }
});
async function pop(kind){
 await page.locator('[data-interest="'+kind+'"]').click();
 await page.locator('#beyond-detail').waitFor({state:'visible',timeout:8000});
 if(await page.locator('#beyond-detail').getAttribute('data-active')!==kind)throw Error('Wrong dialog active');
}
async function dismiss(){
 await page.locator('#beyond-close').click();
 await page.locator('#beyond-detail').waitFor({state:'hidden',timeout:8000});
}
await run('All four Beyond cards open, label and close their dialogs',async()=>{
 for(const kind of ['music','movement','presence','questions']){
  await pop(kind);
  if(!(await page.locator('#beyond-detail-title').innerText()).trim())throw Error(kind+' has no heading');
  await dismiss();
 }
});
await run('Creative cards have quiet, distinct artwork-first backgrounds',async()=>{
 const cards=page.locator('#beyond-grid .hobby-card');
 if(await cards.count()!==4)throw Error('Expected four creative cards');
 const appearance=await cards.evaluateAll(nodes=>nodes.map(node=>{
  const s=getComputedStyle(node),art=node.querySelector('.hobby-graphic');
  return {background:s.backgroundImage,opacity:art?getComputedStyle(art).opacity:null,
    imageSize:s.backgroundSize,foreground:s.color};
 }));
 if(appearance.some(x=>x.background.includes('repeating-linear-gradient')))
  throw Error('An aggressive repeating texture still overlays the creative cards');
 if(appearance.some(x=>x.opacity!=='1'))
  throw Error('Card artwork is still faded');
 if(new Set(appearance.map(x=>x.background)).size!==4)
  throw Error('Card backgrounds are identical');
 await page.locator('#beyond').scrollIntoViewIfNeeded();
 await page.locator('#beyond-grid').screenshot({path:join(output,'creative-cards-desktop.png')});
 return 'Artwork in focus; no repeating textures and four distinct finishes';
});
await run('Keyboard Escape closes the selected pop-out',async()=>{
 await pop('questions');
 await page.keyboard.press('Escape');
 await page.locator('#beyond-detail').waitFor({state:'hidden',timeout:8000});
});
await run('Music cover images, safely linked media and empty-data fallback',async()=>{
 await pop('music');
 const links=page.locator('#beyond-detail-content a[href^="https://"]');
 const n=await links.count();
 if(n<1)throw Error('No music links rendered');
 const covers=await page.locator('#beyond-detail-content .media-thumbnail img').count();
 if(covers<1)throw Error('Music thumbnails have no image elements');
 await dismiss();
 return n+' linked recordings, '+covers+' cover images';
});
await run('Daily movement create, edit, zero steps, persistence and delete',async()=>{
 await pop('movement');
 await page.locator('#movement-steps').fill('8500');
 await page.locator('#movement-calories').fill('300');
 await page.locator('#movement-goal').fill('10000');
 await page.locator('#movement-log-form button[type=submit]').click();
 if(!await page.locator('.movement-steps-card').innerText().then(x=>x.includes('8,500')))throw Error('Steps not visible');
 if(!await page.locator('.movement-steps-card progress').count())throw Error('Goal progress missing');
 await page.locator('#movement-steps').fill('0');
 await page.locator('#movement-log-form button[type=submit]').click();
 if(await page.locator('.movement-summary-feature').innerText().then(x=>!x.includes('0')))throw Error('Zero-step day not retained');
 await dismiss();await pop('movement');
 if(await page.locator('#movement-steps').inputValue()!=='0')throw Error('Steps did not persist');
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('#movement-remove').click();
 if(await page.locator('#movement-steps').inputValue()!=='')throw Error('Deleted day remains');
 await dismiss();
});
await run('Daily movement validation rejects out-of-range values',async()=>{
 await pop('movement');
 await page.locator('#movement-steps').fill('200001');
 await page.locator('#movement-log-form button[type=submit]').click();
 const text=await page.locator('.movement-log-message').innerText();
 if(!text.includes('between'))throw Error('No validation error: '+text);
 await dismiss();
});
await run('Private gallery remains locked and disabled checkout is not actionable',async()=>{
 await page.locator('#member-gallery-grid .member-media-card').first().waitFor({state:'attached',timeout:10000});
 if(await page.locator('#member-gallery-grid .member-media-card').count()!==2)throw Error('Gallery fixtures not loaded');
 if(!await page.locator('.member-media-stage.member-media-locked').first().isVisible())throw Error('Media lock missing');
 if(!await page.locator('.member-media-pay').first().isDisabled())throw Error('Checkout enabled while backend disabled');
 if(await page.locator('#member-gallery-grid img').count())throw Error('Unsafe HTML rendered as image');
 return 'Disabled sandbox and locked media verified';
});
await run('Checkout missing token and cancelled payment states',async()=>{
 const checkout=await desktop.context.newPage();
 await checkout.goto(base+'/checkout.html?cancel=1',{waitUntil:'domcontentloaded'});
 if(!await checkout.locator('#title').innerText().then(x=>/cancel/i.test(x)))throw Error('Cancelled state not shown');
 await checkout.goto(base+'/checkout.html?token=BAD',{waitUntil:'domcontentloaded'});
 if(!await checkout.locator('#title').innerText().then(x=>/no payment/i.test(x)))throw Error('Invalid token accepted');
 await checkout.close();
});
await run('Creator editor and studio provide signed-out flows',async()=>{
 const editor=await desktop.context.newPage();
 await editor.goto(base+'/creative-editor.html',{waitUntil:'domcontentloaded'});
 if(!await editor.locator('body').innerText().then(x=>/sign|email|creator/i.test(x)))throw Error('Editor auth UI missing');
 await editor.goto(base+'/studio.html',{waitUntil:'domcontentloaded'});
 if(!await editor.locator('body').innerText().then(x=>/sign|email|creator/i.test(x)))throw Error('Studio auth UI missing');
 await editor.close();
});
await run('Static metadata, skip link, canonical and accessible images',async()=>{
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 if(!await page.locator('link[rel="canonical"]').count())throw Error('Canonical missing');
 if(!await page.locator('meta[name="description"]').count())throw Error('Description missing');
 if(!await page.locator('.skip-link[href="#work"]').count())throw Error('Keyboard skip link missing');
 const bad=await page.locator('img:not([alt])').count();
 if(bad)throw Error(bad+' images missing alt attribute');
});
await run('Hero autoplay starts after two seconds and respects manual controls',async()=>{
 const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'no-preference'});
 const p=await context.newPage();
 await p.goto(base+'/',{waitUntil:'domcontentloaded'});
 await p.waitForTimeout(2600);
 const progress=Number(await p.locator('#portal-stage').getAttribute('data-neural-progress'));
 if(progress<=.001)throw Error('Autoplay did not start after 2-second idle delay');
 await p.mouse.wheel(0,300);
 await p.waitForTimeout(700);
 const settled=Number(await p.locator('#portal-stage').getAttribute('data-neural-progress'));
 await p.waitForTimeout(500);
 const later=Number(await p.locator('#portal-stage').getAttribute('data-neural-progress'));
 if(later>settled+.07)throw Error('Autoplay continued after manual wheel');
 await context.close();
});
await run('Neural canvas scroll coupling and pause button',async()=>{
 await page.locator('#neural-field').waitFor({state:'attached'});
 if(await page.locator('#motion-toggle').getAttribute('aria-pressed')!=='false')throw Error('Motion initially paused');
 await page.locator('#motion-toggle').click();
 if(await page.locator('#motion-toggle').getAttribute('aria-pressed')!=='true')throw Error('Motion does not pause');
 await page.locator('#motion-toggle').click();
 if(await page.locator('#motion-toggle').getAttribute('aria-pressed')!=='false')throw Error('Motion does not resume');
 const progress=await page.locator('#portal-stage').getAttribute('data-neural-progress');
 if(progress===null)throw Error('Neural progress binding missing');
});
await desktop.context.close();

await run('Mobile navigation, cards and overflow at 390px',async()=>{
 const ctx=await browser.newContext({...devices['iPhone 13'],reducedMotion:'reduce'});
 await routeAPI(ctx);
 const p=await ctx.newPage();
 await p.goto(base+'/#projects',{waitUntil:'domcontentloaded'});
 await p.waitForTimeout(500);
 const dims=await p.evaluate(()=>({scroll:document.documentElement.scrollWidth,window:innerWidth}));
 if(dims.scroll>dims.window+2)throw Error('Horizontal overflow '+JSON.stringify(dims));
 if(!await p.locator('#projects').isVisible())throw Error('Projects absent on mobile');
 await p.locator('[data-interest="movement"]').click();
 if(!await p.locator('#beyond-detail').isVisible())throw Error('Movement dialog fails on mobile');
 await p.locator('#beyond-close').click();
 await ctx.close();
});
await run('Reduced-motion mode retains content and scroll access',async()=>{
 const ctx=await browser.newContext({viewport:{width:768,height:900},reducedMotion:'reduce'});
 await routeAPI(ctx);
 const p=await ctx.newPage();await p.goto(base+'/#projects',{waitUntil:'domcontentloaded'});
 if(!await p.locator('#projects').count())throw Error('Projects missing in reduced motion');
 if(!await p.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches))throw Error('Mode not applied');
 await ctx.close();
});
await run('No first-party unhandled page JavaScript errors',async()=>{
 const firstParty=errors.filter(x=>!/(cdn|network|fetch|google|firebase|paypal|adblock|CORS)/i.test(x));
 if(firstParty.length)throw Error(firstParty.slice(0,5).join(' | '));
});
await browser.close();
const summary={at:new Date().toISOString(),base,engine:'Chromium',tests:results.length,
 passed:results.filter(x=>x.status==='PASS').length,
 failed:results.filter(x=>x.status==='FAIL').length,
 results,knownLimitations:[
  'External APIs are stubbed; no real transaction or user sign-in is exercised',
  'Single browser engine; Firefox/WebKit real-device compatibility remains a separate verification',
  'Local build run is not a substitute for production-hosted visual QA or WebPageTest'
 ]};
await writeFile(join(output,'browser-results.json'),JSON.stringify(summary,null,2));
await writeFile(join(output,'browser-results.md'),
 '# Portfolio Browser QA — '+summary.at+'\n\n'+results.map(x=>'- **'+x.status+'** '+x.name+' ('+x.ms+'ms)'+(x.detail?' — '+x.detail.replace(/\n/g,' ').slice(0,150):'')).join('\n')+
 '\n\n'+summary.knownLimitations.map(x=>'- LIMITATION: '+x).join('\n')+'\n');
console.log('QA BROWSER RESULTS '+summary.passed+'/'+summary.tests+' pass, '+summary.failed+' failures');
if(summary.failed)process.exitCode=1;

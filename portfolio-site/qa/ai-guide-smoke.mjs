/* Browser acceptance checks for the standalone AI Learning Hub.
   Uses the existing isolated Playwright installation in the QA workflow. */
import { chromium } from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.env.QA_BASE_URL||'http://127.0.0.1:4173';
const output=process.env.QA_OUTPUT||'portfolio-site/qa-results';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[];
async function check(name,fn){
  try{await fn();results.push({name,status:'PASS'});console.log('PASS AI GUIDE '+name);}
  catch(e){results.push({name,status:'FAIL',error:String(e).slice(0,700)});console.error('FAIL AI GUIDE '+name+': '+e);}
}
for(const width of [320,390,768,1440]){
  await check('page, navigation and overflow at '+width+'px',async()=>{
    const context=await browser.newContext({viewport:{width,height:850},reducedMotion:'reduce'});
    try{
      const page=await context.newPage();
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      const response=await page.goto(base+'/ai-guide.html',{waitUntil:'domcontentloaded'});
      if(response.status()!==200)throw Error('Page returned '+response.status());
      if(!await page.locator('h1').isVisible())throw Error('Heading missing');
      for(const id of ['learn','tools','prompts','subscribe','questions'])if(await page.locator('#'+id).count()!==1)throw Error('Missing '+id);
      const dims=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth}));
      if(dims.scroll>dims.viewport+2){const offenders=await page.evaluate(()=>[...document.querySelectorAll('body *')].map(el=>({el,box:el.getBoundingClientRect()})).filter(o=>o.box.width>0&&(o.box.right>innerWidth+2||o.box.left< -2)).slice(0,12).map(o=>({tag:o.el.tagName,cls:String(o.el.className).slice(0,70),text:o.el.textContent.trim().slice(0,48),left:Math.round(o.box.left),right:Math.round(o.box.right)})));throw Error('Horizontal overflow '+JSON.stringify({dims,offenders}));}
      if(errors.length)throw Error('Page errors: '+errors.join('|'));
      if(width===390)await page.screenshot({path:output+'/ai-guide-mobile-390.png',fullPage:true});
      if(width===1440)await page.screenshot({path:output+'/ai-guide-desktop-1440.png',fullPage:true});
    }finally{await context.close();}
  });
}
await check('lesson category and search combine correctly',async()=>{
  const page=await browser.newPage();try{
    await page.goto(base+'/ai-guide.html');
    await page.locator('[data-filter="builder"]').click();
    const shown=await page.locator('#lesson-grid [data-level="builder"]:visible').count();
    if(shown!==2)throw Error('Expected two builder lessons, got '+shown);
    await page.locator('#lesson-search').fill('coding');
    if(await page.locator('#lesson-grid [data-level]:visible').count()!==1)throw Error('Search did not narrow builder results');
    await page.locator('#lesson-search').fill('zzzznoresult');
    if(!await page.locator('#lesson-empty').isVisible())throw Error('Missing search empty state');
    await page.locator('[data-filter="all"]').click();await page.locator('#lesson-search').fill('');
    if(await page.locator('#lesson-grid [data-level]:visible').count()!==6)throw Error('All lessons did not restore');
  }finally{await page.close();}
});
await check('prompt lab updates generated output',async()=>{
  const page=await browser.newPage();try{
    await page.goto(base+'/ai-guide.html');
    await page.locator('#prompt-task').selectOption('code');
    await page.locator('#prompt-depth').selectOption('deep');
    const result=await page.locator('#prompt-output').innerText();
    if(!result.includes('software engineer')||!result.includes('validation checklist'))throw Error('Incorrect generated developer prompt');
  }finally{await page.close();}
});
await check('subscription wizard changes decision and official destination',async()=>{
  const page=await browser.newPage();try{
    await page.goto(base+'/ai-guide.html');
    await page.locator('[data-goal="coding"]').click();
    await page.locator('#usage').selectOption('regular');
    if(!((await page.locator('#plan-title').innerText()).includes('Copilot')))throw Error('Expected Copilot recommendation');
    const href=await page.locator('#plan-link').getAttribute('href');
    if(href!=='https://github.com/features/copilot/plans')throw Error('Incorrect recommendation link');
    await page.locator('[data-goal="long"]').click();
    if(!((await page.locator('#plan-title').innerText()).includes('Claude')))throw Error('Expected Claude recommendation');
  }finally{await page.close();}
});
await check('Portfolio footer exposes guide and preserves existing guide',async()=>{
  const page=await browser.newPage();try{
    await page.goto(base+'/#connect',{waitUntil:'domcontentloaded'});
    const footer=page.locator('footer.footer');
    if(await footer.locator('a[href="/ai-guide.html"]').count()!==1)throw Error('AI Learning Hub link not found');
    if(await footer.locator('a[href="/claude-youtube-integration-guide.html"]').count()!==1)throw Error('Original guide link lost');
  }finally{await page.close();}
});
await check('Instagram post renders and opens a safe fallback guide',async()=>{
  const page=await browser.newPage();
  try{
    await page.goto(base+'/ai-guide.html',{waitUntil:'domcontentloaded'});
    await page.locator('#instagram-post-grid .ig-post').first().waitFor();
    const original=page.locator('#instagram-post-grid a[href="https://www.instagram.com/p/DfTMZktj8t6/"]');
    if(await original.count()!==1)throw Error('Seeded Instagram post missing');
    await page.locator('#instagram-post-grid [data-ig-guide]').first().click();
    if(!await page.locator('#instagram-guide').isVisible())throw Error('Dynamic guide failed to open');
    if(!((await page.locator('#instagram-guide-content').innerText()).includes('caption')))throw Error('Missing transparent caption fallback');
    await page.keyboard.press('Escape');
    if(await page.locator('#instagram-guide').isVisible())throw Error('Guide does not close on Escape');
  }finally{await page.close();}
});
await check('Instagram caption generates specific tutorial steps',async()=>{
 const ctx=await browser.newContext();
 try{
   await ctx.route('**/instagram-posts.json',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({posts:[{id:'Demo123',permalink:'https://www.instagram.com/p/Demo123/',caption:'Use AI prompts to research ideas and verify sources.',mediaType:'IMAGE'}]})}));
   const page=await ctx.newPage();
   await page.goto(base+'/ai-guide.html');
   await page.locator('[data-ig-guide="Demo123"]').click();
   const content=await page.locator('#instagram-guide-content').innerText();
   if(!content.includes('AI workflow')||!content.includes('Test the method'))throw Error('Caption-driven walkthrough was not generated');
   if(!content.includes('Use AI prompts to research ideas'))throw Error('Source caption missing from guide');
 }finally{await ctx.close();}
});
await check('Flockbay eight steps, official docs, and copy control',async()=>{
 const p=await browser.newPage();
 try{
  await p.goto(base+'/ai-guide.html',{waitUntil:'domcontentloaded'});
  const sec=p.locator('#flockbay-guide');
  if(await sec.locator('article.flock-step').count()!==8)throw Error('Missing Flockbay steps');
  const body=await sec.innerText();
  for(const term of ['New project','Demo','F5','F6','F8','MCP','Export'])if(!body.includes(term))throw Error('Missing '+term);
  if(await sec.locator('a[href="https://flockbay.com/docs/quickstart/"]').count()<1)throw Error('Official reference missing');
  await p.locator('#flockbay-copy-prompt').click();
  await p.waitForFunction(()=>/copied|unavailable/i.test(document.querySelector('#flockbay-copy-status')?.textContent||''),{timeout:5000});
  const status=await p.locator('#flockbay-copy-status').innerText();
  if(!/copied|unavailable/i.test(status))throw Error('Copy button status missing');
  if(await p.locator('#tools a[href="#flockbay-guide"]').count()!==1)throw Error('Tool map link missing');
 }finally{await p.close();}
});
await browser.close();
await writeFile(output+'/ai-guide-results.json',JSON.stringify(results,null,2));
const fail=results.filter(x=>x.status==='FAIL');
console.log('AI GUIDE BROWSER QA '+(results.length-fail.length)+'/'+results.length+' pass');
if(fail.length)process.exitCode=1;

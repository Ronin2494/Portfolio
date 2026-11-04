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
      if(dims.scroll>dims.viewport+2)throw Error('Horizontal overflow '+JSON.stringify(dims));
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
await browser.close();
await writeFile(output+'/ai-guide-results.json',JSON.stringify(results,null,2));
const fail=results.filter(x=>x.status==='FAIL');
console.log('AI GUIDE BROWSER QA '+(results.length-fail.length)+'/'+results.length+' pass');
if(fail.length)process.exitCode=1;

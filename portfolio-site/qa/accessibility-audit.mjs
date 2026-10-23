import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
const base=process.env.QA_BASE_URL||'http://127.0.0.1:4173';
const output=process.env.QA_OUTPUT||'portfolio-site/qa-results';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
const findings=[],passes=[];
for(const [route,label] of [['/#projects','home'],['/checkout.html?cancel=1','checkout'],['/creative-editor.html','editor'],['/studio.html','studio']]){
 const context=await browser.newContext({viewport:{width:1366,height:900},reducedMotion:'reduce'});
 await context.route('https://badbunny-membership-api.onrender.com/**',r=>r.fulfill({status:503,contentType:'application/json',body:'{"error":"Accessibility fixture: API disabled"}'}));
 const page=await context.newPage();
 try{
  await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:25000});
  await page.waitForTimeout(400);
  const results=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
  for(const violation of results.violations){
   findings.push({page:label,id:violation.id,impact:violation.impact,description:violation.description,help:violation.help,
    nodes:violation.nodes.slice(0,12).map(n=>({target:n.target,summary:n.failureSummary}))});
  }
  passes.push({page:label,passes:results.passes.length,violations:results.violations.length,incomplete:results.incomplete.length});
 }catch(error){
  findings.push({page:label,id:'audit-runner-error',impact:'unknown',description:String(error)});
 }finally{await context.close();}
}
await browser.close();
await writeFile(output+'/accessibility-results.json',JSON.stringify({at:new Date().toISOString(),base,pages:passes,findings},null,2));
console.log('WCAG accessibility audit results:',JSON.stringify(passes));
console.log('Violations:',JSON.stringify(findings));

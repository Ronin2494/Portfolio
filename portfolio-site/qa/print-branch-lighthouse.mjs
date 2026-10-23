import fs from 'node:fs';
const file='portfolio-site/qa-results/lighthouse-branch/mobile.json';
if(!fs.existsSync(file)){console.log('BRANCH LIGHTHOUSE MOBILE: unavailable');process.exitCode=1;}
else{
 const a=JSON.parse(fs.readFileSync(file,'utf8'));
 console.log('BRANCH LIGHTHOUSE MOBILE '+JSON.stringify({
  url:a.finalDisplayedUrl||a.finalUrl,
  performance:Math.round((a.categories.performance?.score||0)*100),
  fcp:a.audits['first-contentful-paint']?.displayValue,
  lcp:a.audits['largest-contentful-paint']?.displayValue,
  tbt:a.audits['total-blocking-time']?.displayValue,
  cls:a.audits['cumulative-layout-shift']?.displayValue
 }));
}
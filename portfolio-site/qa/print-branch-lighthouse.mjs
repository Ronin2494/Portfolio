import fs from 'node:fs';
const root='portfolio-site/qa-results/lighthouse-branch/';
const read=(name)=>{
 const file=root+name+'.json';
 if(!fs.existsSync(file)){console.log('LIGHTHOUSE '+name+': unavailable');return null;}
 const a=JSON.parse(fs.readFileSync(file,'utf8'));
 const out={
  url:a.finalDisplayedUrl||a.finalUrl,
  performance:Math.round((a.categories.performance?.score??0)*100),
  fcp:a.audits['first-contentful-paint']?.numericValue,
  lcp:a.audits['largest-contentful-paint']?.numericValue,
  tbt:a.audits['total-blocking-time']?.numericValue,
  cls:a.audits['cumulative-layout-shift']?.numericValue
 };
 console.log('SAME-RUN LIGHTHOUSE '+name+' '+JSON.stringify(out));
 return out;
};
const baseline=read('baseline'),candidate=read('mobile');
if(baseline&&candidate){
 const diff={score:candidate.performance-baseline.performance,
  lcpMs:Math.round(candidate.lcp-baseline.lcp),
  fcpMs:Math.round(candidate.fcp-baseline.fcp),
  tbtMs:Math.round(candidate.tbt-baseline.tbt)};
 console.log('SAME-RUN MOBILE DELTA '+JSON.stringify(diff));
}
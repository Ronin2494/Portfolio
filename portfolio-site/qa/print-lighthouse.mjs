import fs from 'node:fs';
for (const name of ['mobile','desktop']) {
  const path='portfolio-site/qa-results/lighthouse/'+name+'.json';
  if (!fs.existsSync(path)) {console.log('LIGHTHOUSE '+name+' unavailable');continue;}
  const data=JSON.parse(fs.readFileSync(path,'utf8'));
  const out={testedUrl:data.finalDisplayedUrl||data.finalUrl};
  for(const [label,key] of [['performance','performance'],['accessibility','accessibility'],['bestPractices','best-practices'],['seo','seo']]){
    out[label]=Math.round((data.categories[key]?.score??0)*100);
  }
  for(const [label,key] of [['fcp','first-contentful-paint'],['lcp','largest-contentful-paint'],['cls','cumulative-layout-shift'],['tbt','total-blocking-time']]){
    out[label]=data.audits[key]?.displayValue||'unavailable';
  }
  console.log('LIGHTHOUSE '+name+' '+JSON.stringify(out));
}
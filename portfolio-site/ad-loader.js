/* Keep third-party advertising functional while protecting the first content paint. */
(()=>{
  'use strict';
  const load=()=>{
    if(document.querySelector('script[data-portfolio-ads="loaded"]'))return;
    const script=document.createElement('script');
    script.src='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4702288635921911';
    script.async=true;
    script.crossOrigin='anonymous';
    script.dataset.portfolioAds='loaded';
    document.head.append(script);
  };
  const schedule=()=>{
    if(typeof window.requestIdleCallback==='function'){
      window.requestIdleCallback(load,{timeout:3500});
    }else{
      window.setTimeout(load,1500);
    }
  };
  if(document.readyState==='complete')schedule();
  else window.addEventListener('load',schedule,{once:true});
})();
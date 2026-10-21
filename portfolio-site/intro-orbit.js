/* Pause identity animation when offscreen; leave a complete static fallback. */
(()=>{
  const orbit=document.querySelector('.intro-orbit');
  if(!orbit)return;
  if(!('IntersectionObserver' in window)){
    orbit.classList.add('orbit-in-view');
    return;
  }
  const observer=new IntersectionObserver(entries=>{
    for(const entry of entries){
      if(entry.target===orbit){
        orbit.classList.toggle('orbit-in-view',entry.isIntersecting);
      }
    }
  },{threshold:0,rootMargin:'60px 0px 60px 0px'});
  observer.observe(orbit);
})();

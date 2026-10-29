/* Navigation toggles only enhance the mobile layout. Without JS the existing anchor nav remains. */
(() => {
  const header=document.querySelector('.site-nav');
  const button=header?.querySelector('.mobile-nav-toggle');
  const nav=header?.querySelector('#primary-site-links');
  if(!header||!button||!nav)return;
  const mobile=window.matchMedia('(max-width:900px)');
  const close=({restoreFocus=false}={})=>{
    nav.classList.remove('is-open');
    button.setAttribute('aria-expanded','false');
    button.setAttribute('aria-label','Open navigation menu');
    button.querySelector('.mobile-nav-toggle-text').textContent='MENU';
    if(restoreFocus&&mobile.matches)button.focus();
  };
  const open=()=>{
    nav.classList.add('is-open');
    button.setAttribute('aria-expanded','true');
    button.setAttribute('aria-label','Close navigation menu');
    button.querySelector('.mobile-nav-toggle-text').textContent='CLOSE';
  };
  document.documentElement.classList.add('mobile-nav-ready');
  button.addEventListener('click',()=>nav.classList.contains('is-open')?close():open());
  nav.addEventListener('click',event=>{if(event.target.closest('a'))close()});
  document.addEventListener('pointerdown',event=>{
    if(mobile.matches&&!header.contains(event.target))close();
  },{passive:true});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&nav.classList.contains('is-open')){
      event.preventDefault();
      close({restoreFocus:true});
    }
  });
  mobile.addEventListener('change',()=>close());
})();

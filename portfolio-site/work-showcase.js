/* Accessible project filters; retains existing cards and links with JS disabled. */
(()=>{
  const section=document.getElementById('projects');
  const toolbar=document.getElementById('work-toolbar');
  if(!section||!toolbar)return;
  const tiles=[...section.querySelectorAll('.bento > .tile')];
  const filters=[...toolbar.querySelectorAll('[data-work-filter]')];
  const counter=toolbar.querySelector('#work-visible-count');
  if(!tiles.length||!filters.length||!counter)return;

  const isLive=tile=>Boolean(tile.querySelector('.status-live'));
  const counts={
    all:tiles.length,
    live:tiles.filter(isLive).length,
    building:tiles.filter(tile=>!isLive(tile)).length
  };
  filters.forEach(button=>{
    const number=button.querySelector('.filter-number');
    if(number)number.textContent=String(counts[button.dataset.workFilter]??0).padStart(2,'0');
  });

  function filterWork(key){
    if(!Object.prototype.hasOwnProperty.call(counts,key))return;
    let shown=0;
    tiles.forEach(tile=>{
      const visible=key==='all'||(key==='live'?isLive(tile):!isLive(tile));
      tile.hidden=!visible;
      if(visible)shown++;
    });
    filters.forEach(button=>{
      button.setAttribute('aria-pressed',String(button.dataset.workFilter===key));
    });
    counter.textContent=String(shown).padStart(2,'0')+' '+(shown===1?'PROJECT':'PROJECTS')+' IN VIEW';
  }
  filters.forEach(button=>button.addEventListener('click',()=>{
    filterWork(button.dataset.workFilter);
  }));
  filterWork('all');
  toolbar.hidden=false;

  const canTilt=window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
  tiles.forEach(tile=>{
    tile.addEventListener('pointermove',event=>{
      if(!canTilt.matches)return;
      const rect=tile.getBoundingClientRect();
      if(!rect.width||!rect.height)return;
      const x=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width));
      const y=Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height));
      tile.style.setProperty('--glow-x',(x*100).toFixed(1)+'%');
      tile.style.setProperty('--glow-y',(y*100).toFixed(1)+'%');
      tile.style.setProperty('--pitch',((.5-y)*2.7).toFixed(2)+'deg');
      tile.style.setProperty('--yaw',((x-.5)*3.6).toFixed(2)+'deg');
    },{passive:true});
    const reset=()=>{
      tile.style.setProperty('--pitch','0deg');
      tile.style.setProperty('--yaw','0deg');
      tile.style.setProperty('--glow-x','50%');
      tile.style.setProperty('--glow-y','30%');
    };
    tile.addEventListener('pointerleave',reset,{passive:true});
    tile.addEventListener('focusin',reset);
  });
})();

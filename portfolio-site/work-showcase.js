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

  // The original Bento remains the default. Visitors can opt into the layered swiper.
  const deckControls=document.getElementById('deck-controls');
  const switcher=document.getElementById('deck-view-switch');
  const navigation=document.getElementById('deck-navigation');
  const previous=document.getElementById('deck-prev');
  const next=document.getElementById('deck-next');
  const position=document.getElementById('deck-position');
  const progress=document.getElementById('deck-progress');
  if(deckControls&&switcher&&navigation&&previous&&next&&position){
    let deckMode=false;
    let activeIndex=0;
    const visibleCards=()=>tiles.filter(tile=>!tile.hidden);
    const updateDeck=()=>{
      const available=visibleCards();
      if(activeIndex>=available.length)activeIndex=0;
      available.forEach((tile,index)=>{
        const distance=(index-activeIndex+available.length)%available.length;
        const onTop=distance===0;
        tile.dataset.deckDepth=distance<3?String(distance):'hidden';
        tile.style.setProperty('--deck-depth',String(Math.min(distance,3)));
        tile.style.setProperty('--deck-lift',(Math.min(distance,3)*21)+'px');
        tile.style.setProperty('--deck-scale',String(1-Math.min(distance,3)*.055));
        tile.style.setProperty('--deck-brightness',String(1-Math.min(distance,3)*.085));
        tile.style.setProperty('--deck-angle',distance%2?'2deg':'-2deg');
        tile.querySelectorAll('a,button').forEach(control=>{
          if(deckMode&&!onTop)control.setAttribute('tabindex','-1');
          else control.removeAttribute('tabindex');
        });
        tile.setAttribute('aria-hidden',String(deckMode&&!onTop));
      });
      position.textContent=String(available.length?activeIndex+1:0).padStart(2,'0')+' / '+String(available.length).padStart(2,'0');
      if(progress){
        progress.max=Math.max(1,available.length);
        progress.value=available.length?activeIndex+1:0;
      }
      previous.disabled=available.length<2;
      next.disabled=available.length<2;
    };
    const navigate=delta=>{
      const count=visibleCards().length;
      if(!count)return;
      activeIndex=(activeIndex+delta+count)%count;
      updateDeck();
    };
    const toggleDeck=()=>{
      deckMode=!deckMode;
      grid.classList.toggle('is-layered-deck',deckMode);
      switcher.setAttribute('aria-pressed',String(deckMode));
      switcher.textContent=deckMode?'RETURN TO BENTO GRID':'VIEW AS A CARD DECK';
      navigation.hidden=!deckMode;
      if(deckMode){
        grid.setAttribute('tabindex','0');
        grid.setAttribute('role','group');
        grid.setAttribute('aria-label','Project card deck. Use arrow keys or swipe to browse.');
      }else{
        grid.removeAttribute('tabindex');
        grid.removeAttribute('role');
        grid.removeAttribute('aria-label');
      }
      updateDeck();
    };
    switcher.addEventListener('click',toggleDeck);
    previous.addEventListener('click',()=>navigate(-1));
    next.addEventListener('click',()=>navigate(1));
    grid.addEventListener('keydown',event=>{
      if(!deckMode||!['ArrowLeft','ArrowRight'].includes(event.key))return;
      if(event.target!==grid)return;
      event.preventDefault();
      navigate(event.key==='ArrowRight'?1:-1);
    });
    let swipeStart=null;
    grid.addEventListener('pointerdown',event=>{
      if(!deckMode||event.target.closest('a,button'))return;
      swipeStart={x:event.clientX,y:event.clientY};
    });
    grid.addEventListener('pointerup',event=>{
      if(!deckMode||!swipeStart)return;
      const dx=event.clientX-swipeStart.x,dy=event.clientY-swipeStart.y;
      swipeStart=null;
      if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.3)navigate(dx<0?1:-1);
    });
    grid.addEventListener('pointercancel',()=>{swipeStart=null;});
    const observer=new MutationObserver(mutations=>{
      if(mutations.some(m=>m.attributeName==='hidden'))updateDeck();
    });
    tiles.forEach(tile=>observer.observe(tile,{attributes:true,attributeFilter:['hidden']}));
    deckControls.hidden=false;
    updateDeck();
  }
})();

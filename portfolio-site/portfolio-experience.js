/* Portfolio interactive experience. Progressive enhancement: grid and video remain usable without this file. */
(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  const projects=$('projects'),grid=$('project-grid'),toolbar=$('work-toolbar');
  const constellation=$('project-constellation'),map=$('constellation-map'),nodes=$('constellation-nodes');
  const viewToggle=$('experience-view-toggle');
  const tiles=grid?[...grid.querySelectorAll(':scope > .tile')]:[];
  const spots=[[17,25],[49,14],[80,34],[83,72],[52,83],[20,69]];
  const projectData=tiles.map((tile,i)=>{
    const h=tile.querySelector('.tile-text h3');
    const p=tile.querySelector('.tile-text p');
    const link=tile.querySelector('.round-link');
    const tags=[...tile.querySelectorAll('.tags span')].map(x=>x.textContent.trim());
    return {
      i,title:h?.textContent?.replace(/↗/g,'').trim()||'Project',
      summary:p?.textContent?.trim()||'Explore this project.',
      category:tile.querySelector('.tile-index')?.textContent?.trim()||'SELECTED PROJECT',
      status:tile.querySelector('.status')?.textContent?.trim()||'PROJECT',
      live:Boolean(tile.querySelector('.status-live')),tags,
      href:link?.href||'',label:link?.getAttribute('aria-label')||'Visit project',
      initials:(h?.textContent?.replace(/↗/g,'').trim()||'PR').split(/\s+/).map(s=>s[0]).join('').slice(0,2).toUpperCase(),
      position:spots[i]||[50,50]
    };
  });
  if(projects&&grid&&toolbar&&constellation&&nodes&&viewToggle&&projectData.length){
    const preview={
      title:$('constellation-preview-title'),description:$('constellation-preview-description'),
      index:$('constellation-preview-index'),tags:$('constellation-preview-tags'),
      link:$('constellation-preview-link'),initials:$('constellation-preview-initials')
    };
    const nodeButtons=[];
    const select=(index,focus=false)=>{
      const item=projectData[index];if(!item)return;
      nodeButtons.forEach((b,j)=>{
        b.setAttribute('aria-pressed',String(j===index));
        b.tabIndex=j===index?0:-1;
      });
      preview.title.textContent=item.title;
      preview.description.textContent=item.summary;
      preview.index.textContent=item.category+' / '+item.status;
      preview.initials.textContent=item.initials;
      preview.tags.replaceChildren();
      for(const tag of item.tags){
        const x=document.createElement('span');x.textContent=tag;preview.tags.append(x);
      }
      if(item.href){
        preview.link.href=item.href;
        preview.link.setAttribute('aria-label',item.label);
        preview.link.hidden=false;
      }else preview.link.hidden=true;
      if(focus)nodeButtons[index].focus();
    };
    for(const item of projectData){
      const b=document.createElement('button');
      b.type='button';b.className='constellation-node';
      b.style.setProperty('--nx',item.position[0]+'%');
      b.style.setProperty('--ny',item.position[1]+'%');
      b.setAttribute('aria-label',item.title+' – '+item.status);
      b.setAttribute('aria-pressed','false');
      const dot=document.createElement('span');dot.className='constellation-star';dot.setAttribute('aria-hidden','true');
      const name=document.createElement('span');name.className='constellation-name';name.textContent=item.title;
      b.append(dot,name);
      b.addEventListener('click',()=>select(item.i));
      b.addEventListener('keydown',e=>{
        if(!['ArrowRight','ArrowDown','ArrowLeft','ArrowUp','Home','End'].includes(e.key))return;
        e.preventDefault();
        const next=e.key==='Home'?0:e.key==='End'?nodeButtons.length-1:
          (item.i+(e.key==='ArrowRight'||e.key==='ArrowDown'?1:-1)+nodeButtons.length)%nodeButtons.length;
        select(next,true);
      });
      nodes.append(b);nodeButtons.push(b);
    }
    select(0);
    const switches=[...viewToggle.querySelectorAll('[data-project-view]')];
    const hint=$('experience-view-hint');
    const deckControls=$('deck-controls');
    const setView=(kind,automatic=false)=>{
      const isMap=kind==='constellation';
      constellation.hidden=!isMap;
      grid.hidden=isMap;
      toolbar.hidden=isMap; // The project status filter remains available in grid view.
      if(deckControls)deckControls.hidden=isMap; // Never show Deck controls in constellation mode.
      switches.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.projectView===kind)));
      if(automatic){
        const arriving=isMap?constellation:grid;
        arriving.classList?.add('project-view-arriving');
        // The class is only needed while the enter animation plays.
        arriving.addEventListener?.('animationend',()=>arriving.classList?.remove('project-view-arriving'),{once:true});
        if(hint)hint.textContent='BENTO CARDS ARE HERE · SWITCH VIEWS ANYTIME';
      }
    };

    // Discoverability demo: reveal the alternative layout once after visitors
    // have had time to explore the constellation. Manual intent always wins.
    // Nothing changes while the section or browser tab is not visible.
    let previewTimer=null,previewDone=false,previewDisabled=false;
    let viewObserver=null;
    const stopPreview=()=>{
      previewDisabled=true;
      if(previewTimer!==null){
        window.clearTimeout(previewTimer);
        previewTimer=null;
      }
      viewObserver?.disconnect();
      viewToggle.classList?.remove('view-demo-countdown');
      if(hint)hint.textContent='TWO WAYS TO EXPLORE · SWITCH VIEWS ANYTIME';
    };
    const pausePreview=()=>{
      if(previewTimer!==null){
        window.clearTimeout(previewTimer);
        previewTimer=null;
      }
      viewToggle.classList?.remove('view-demo-countdown');
    };
    const previewIsSafe=()=>!previewDone&&!previewDisabled&&!motion.matches&&!document.hidden&&
      !(projects.contains?.(document.activeElement));
    const startPreview=()=>{
      if(!previewIsSafe()||previewTimer!==null)return;
      viewToggle.classList?.add('view-demo-countdown');
      previewTimer=window.setTimeout(()=>{
        previewTimer=null;
        if(!previewIsSafe())return;
        previewDone=true;
        viewObserver?.disconnect();
        viewToggle.classList?.remove('view-demo-countdown');
        setView('grid',true);
      },6000);
    };
    for(const button of switches){
      button.addEventListener('click',()=>{
        stopPreview();
        setView(button.dataset.projectView);
      });
    }
    // Clicking a project star, filter or link is an explicit preference to
    // explore the current layout; do not auto-switch during that interaction.
    projects.addEventListener?.('click',event=>{
      if(event.target?.closest?.('button,a'))stopPreview();
    });
    projects.addEventListener?.('focusin',stopPreview);
    document.addEventListener?.('visibilitychange',()=>{
      if(document.hidden)pausePreview();
      else if(viewObserver?.takeRecords&&projects.getBoundingClientRect){
        const bounds=projects.getBoundingClientRect();
        if(bounds.bottom>0&&bounds.top<window.innerHeight)startPreview();
      }
    });
    viewToggle.hidden=false;
    if(hint)hint.hidden=false;
    setView('constellation');
    if(!motion.matches&&typeof window.IntersectionObserver==='function'&&
       typeof window.setTimeout==='function'){
      viewObserver=new window.IntersectionObserver(entries=>{
        const entry=entries.find(item=>item.target===projects);
        if(!entry)return;
        if(entry.isIntersecting&&entry.intersectionRatio>=.15)startPreview();
        else pausePreview();
      },{threshold:[0,.15]});
      viewObserver.observe(projects);
    }
  }

  // Film theater. Only mount an additional YouTube player when the user opens it.
  const theater=$('film-theater'),enter=$('enter-film-theater'),exit=$('close-film-theater'),screen=$('film-theater-screen');
  if(theater&&enter&&exit&&screen){
    const embedded=document.querySelector('#creative .creative-opening-media iframe');
    const initial=embedded?.getAttribute('src')||'';
    const openTheater=()=>{
      if(theater.open)return;
      if(embedded)embedded.setAttribute('src','about:blank'); // prevent overlapping audio
      screen.replaceChildren();
      const frame=document.createElement('iframe');
      frame.title='Featured film: More than a résumé';
      frame.src='https://www.youtube-nocookie.com/embed/VAUABrdYU6U?rel=0&playsinline=1&autoplay=1';
      frame.setAttribute('allow','autoplay; encrypted-media; picture-in-picture; fullscreen');
      frame.setAttribute('allowfullscreen','');
      frame.setAttribute('referrerpolicy','strict-origin-when-cross-origin');
      screen.append(frame);
      theater.showModal();
      exit.focus();
    };
    const closeTheater=()=>{if(theater.open)theater.close();};
    enter.addEventListener('click',openTheater);
    exit.addEventListener('click',closeTheater);
    theater.addEventListener('close',()=>{
      screen.replaceChildren(); // stop playback on close
      if(embedded&&initial)embedded.setAttribute('src',initial);
      enter.focus({preventScroll:true});
    });
    theater.addEventListener('click',e=>{
      if(e.target!==theater)return;
      const r=theater.getBoundingClientRect();
      if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeTheater();
    });
  }

  // Floating, keyboard-friendly quick navigation dock.
  const dock=$('personal-dock'),trigger=$('dock-trigger'),dockPanel=$('dock-panel');
  if(dock&&trigger&&dockPanel){
    const toggle=open=>{
      dockPanel.hidden=!open;trigger.setAttribute('aria-expanded',String(open));
      dock.classList.toggle('dock-open',open);
    };
    trigger.addEventListener('click',()=>toggle(dockPanel.hidden));
    dockPanel.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>toggle(false)));
    document.addEventListener('pointerdown',event=>{if(!dock.contains(event.target))toggle(false);});
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&!dockPanel.hidden){toggle(false);trigger.focus();}
    });
  }

  // Shared scroll progress and word drift tie existing modules together.
  const progress=$('experience-progress');
  const kinetic=document.querySelector('.kinetic-line');
  const words=kinetic?[...kinetic.querySelectorAll('span')]:[];
  let queued=false;
  const paint=()=>{
    queued=false;
    const root=document.documentElement;
    const range=Math.max(1,root.scrollHeight-window.innerHeight);
    const fraction=Math.max(0,Math.min(1,window.scrollY/range));
    if(progress)progress.style.transform='scaleX('+fraction.toFixed(5)+')';
    if(kinetic&&!motion.matches){
      const rect=kinetic.getBoundingClientRect();
      const view=(window.innerHeight-rect.top)/(window.innerHeight+rect.height);
      if(view>=0&&view<=1){
        words.forEach((word,i)=>word.style.setProperty('--word-offset',((view-.5)*(i%2===0?24:-24)).toFixed(1)+'px'));
      }
    }
  };
  window.addEventListener('scroll',()=>{
    if(!queued){queued=true;window.requestAnimationFrame(paint);}
  },{passive:true});
  window.addEventListener('resize',paint,{passive:true});
  paint();
})();

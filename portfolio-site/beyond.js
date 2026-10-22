/* Beyond the Screen: all content is rendered as text, not injected HTML. */
(()=>{
  'use strict';
  const buttons=[...document.querySelectorAll('#beyond-grid [data-interest]')];
  const panel=document.getElementById('beyond-detail');
  const body=document.getElementById('beyond-detail-content');
  const close=document.getElementById('beyond-close');
  if(!buttons.length||!panel||!body||!close)return;
  const API='https://badbunny-membership-api.onrender.com';
  const HEADINGS={
    music:['01 / RHYTHM','A life in sound.','Original compositions and singing performances from my channels.'],
    movement:['02 / MOVEMENT','Every step counts.','Two simple markers of how I moved today.'],
    presence:['03 / PRESENCE','Space to be still.','Meditation and mindfulness sessions, shared when published.'],
    questions:['04 / CURIOSITY','Questions in motion.','Questions I have chosen to share from my notes.']
  };
  let active=null;
  let records=[];
  let catalog=[];
  const make=(tag,cls,txt)=>{
    const e=document.createElement(tag);
    if(cls)e.className=cls;
    if(txt!==undefined)e.textContent=String(txt);
    return e;
  };
  const append=(root,...nodes)=>{nodes.forEach(n=>root.append(n));return root;};
  const heading=(label)=>make('h4','beyond-section-title',label);
  const empty=(label)=>make('p','beyond-empty',label);
  const editor=()=>{
    const link=make('a','beyond-editor-link','EDIT MY COLLECTION ↗');
    link.href='creative-editor.html';
    link.setAttribute('aria-label','Open the private creative editor to manage compositions, videos, questions and activity');
    return link;
  };
  const validMediaURL=url=>{
    try{
      const u=new URL(url);
      if(u.protocol!=='https:')return null;
      const host=u.hostname.toLowerCase();
      if(['www.youtube.com','youtube.com','m.youtube.com'].includes(host)){
        return u.pathname==='/watch'||u.pathname.startsWith('/shorts/')||u.pathname.startsWith('/live/')?u.href:null;
      }
      if(host==='youtu.be')return u.pathname.length>2?u.href:null;
      if(['instagram.com','www.instagram.com'].includes(host)){
        return /^\/(reel|p|tv)\/[a-zA-Z0-9_-]+\/?$/.test(u.pathname)?u.href:null;
      }
      return null;
    }catch{return null;}
  };
  const mediaCard=item=>{
    const url=validMediaURL(item.url);
    if(!url)return null;
    const a=make('a','beyond-media-link');
    a.href=url;a.target='_blank';a.rel='noopener noreferrer';
    const service=new URL(url).hostname.includes('instagram')?'INSTAGRAM':'YOUTUBE';
    const visual=window.PortfolioMedia?.thumbnail(item,{className:'beyond-media-thumb'});
    if(!visual)return null;
    append(a,visual,make('span','beyond-media-meta',service+' · WATCH VIDEO ↗'),
      make('strong','',item.title||'Untitled performance'));
    return a;
  };
  function renderMusic(){
    const wrap=make('div','');
    const compositions=records.filter(r=>r.kind==='composition');
    const originals=make('div','beyond-subsection');
    originals.append(heading('ORIGINAL COMPOSITIONS'));
    if(compositions.length){
      const grid=make('div','beyond-compositions');
      compositions.forEach(r=>{
        const card=make('article','beyond-composition');
        append(card,make('span','beyond-media-meta','ORIGINAL WRITING'),
          make('strong','',r.title),make('p','',r.body));
        grid.append(card);
      });
      originals.append(grid);
    }else originals.append(empty('My composition shelf is ready. I can publish original lyrics, poems and writing from the private editor.'));
    wrap.append(originals);
    const gallery=make('div','beyond-subsection');
    gallery.append(heading('SINGING & PERFORMANCE'));
    const known=catalog.filter(x=>x.category==='music');
    const custom=records.filter(x=>x.kind==='music');
    const seen=new Set();
    const media=[...custom,...known].filter(x=>{
      const url=validMediaURL(x.url);
      if(!url||seen.has(url))return false;
      seen.add(url);return true;
    });
    if(media.length){
      const grid=make('div','beyond-media-grid');
      media.forEach(r=>{const card=mediaCard(r);if(card)grid.append(card);});
      gallery.append(grid);
    }else gallery.append(empty('Verified singing videos will appear here when available.'));
    wrap.append(gallery,editor());
    return wrap;
  }
  const todayKey=()=>{
    const parts=new Intl.DateTimeFormat('en-CA',{
      timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'
    }).formatToParts(new Date());
    const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
    return [p.year,p.month,p.day].join('-');
  };
  function renderMovement(){
    // Public, self-contained tracker lives in the existing Movement card bubble.
    // Keep the published-activity view as a no-extra-script fallback.
    if(typeof window!=='undefined'&&window.PortfolioMovement?.render)
      return window.PortfolioMovement.render();
    const wrap=make('div','');
    const today=todayKey();
    const activity=records.filter(x=>x.kind==='activity'&&typeof x.date==='string');
    const byDate=new Map(activity.map(x=>[x.date,x]));
    const entry=byDate.get(today);
    const origin=new Date(today+'T12:00:00Z');
    const previousDay=key=>new Date(new Date(key+'T12:00:00Z').getTime()-86400000).toISOString().slice(0,10);
    const recent=Array.from({length:7},(_,i)=>{
      const day=new Date(origin.getTime()-(6-i)*86400000).toISOString().slice(0,10);
      return {date:day,record:byDate.get(day)||null};
    });
    const recorded=recent.filter(x=>Number.isSafeInteger(x.record?.steps)).length;
    const number=value=>new Intl.NumberFormat('en-CA').format(value);
    const grid=make('div','beyond-activity-grid');
    const data=[
      ['01 / DAILY STEPS','steps','STEPS · WALKING & MOVEMENT'],
      ['02 / ACTIVE CALORIES','activeCalories','KCAL · ACTIVE ENERGY']
    ];
    data.forEach(([label,field,unit])=>{
      const card=make('div','beyond-activity-card');
      const observed=recent.map(x=>x.record?.[field]).filter(Number.isSafeInteger);
      const maximum=Math.max(0,...observed);
      const hasToday=Number.isSafeInteger(entry?.[field]);
      const comparison=recorded>1&&entry&&maximum>0&&hasToday;
      const value=hasToday?number(entry[field]):'—';
      const display=make('div','beyond-activity-display');
      display.append(make('strong','beyond-activity-value',value));
      const dial=make('div','beyond-activity-dial');
      const level=comparison?Math.round(Math.max(0,Math.min(100,entry[field]/maximum*100))):0;
      dial.setAttribute('style','--level:'+level+'%');
      dial.setAttribute('aria-label',comparison?level+' percent of the highest recorded daily value over seven days':'Not enough recorded days for comparison');
      dial.append(make('span','',comparison?level+'%':'—'));
      display.append(dial);
      const trend=make('div','beyond-activity-trend');
      trend.setAttribute('role','img');
      trend.setAttribute('aria-label','Past seven days: '+recent.map(x=>x.date+': '+(Number.isSafeInteger(x.record?.[field])?x.record[field]+' recorded':'no recorded value')).join('; '));
      recent.forEach((x,i)=>{
        const bar=make('span','activity-bar');
        const numeric=x.record?.[field];
        bar.setAttribute('style','--bar-height:'+(Number.isSafeInteger(numeric)&&maximum>0?Math.max(5,Math.round(numeric/maximum*100)):5)+'%');
        bar.setAttribute('data-today',String(i===6));
        if(!Number.isSafeInteger(numeric))bar.setAttribute('data-missing','true');
        trend.append(bar);
      });
      append(card,make('span','beyond-activity-caption',label),
        display,make('span','beyond-activity-foot',hasToday?unit:
          (field==='steps'?'No steps recorded today':'Active calories not recorded today')),
        make('span','beyond-activity-caption-secondary',comparison?
          'TODAY VS HIGHEST RECORDED DAY · LAST 7 DAYS':
          'LAST 7 DAYS · '+observed.length+' RECORDED '+(observed.length===1?'DAY':'DAYS')),
        trend);
      if(field==='steps'&&hasToday&&Number.isSafeInteger(entry.goalSteps)&&entry.goalSteps>0){
        const goal=entry.goalSteps;
        const pct=Math.round(entry.steps/goal*100);
        const goalPanel=make('div','beyond-step-goal');
        append(goalPanel,make('span','',number(entry.steps)+' / '+number(goal)+' steps toward daily goal'),
          make('strong','',pct+'%'));
        const progress=make('progress','beyond-step-goal-progress');
        progress.max=goal;progress.value=Math.min(entry.steps,goal);
        progress.setAttribute('aria-label','Today’s progress toward the recorded step goal');
        goalPanel.append(progress);
        card.append(goalPanel);
      }
      grid.append(card);
    });

    const week=recent.filter(x=>Number.isSafeInteger(x.record?.steps));
    const total=week.reduce((sum,x)=>sum+x.record.steps,0);
    const average=recorded?Math.round(total/recorded):null;
    let cursor=Number.isSafeInteger(entry?.steps)?today:previousDay(today);
    let streak=0;
    while(Number.isSafeInteger(byDate.get(cursor)?.steps)&&streak<180){
      streak++;
      cursor=previousDay(cursor);
    }
    const summary=make('section','beyond-step-summary');
    summary.setAttribute('aria-label','Step tracking summary for the last seven calendar days');
    [
      ['WEEKLY TOTAL',recorded?number(total):'—','Steps over recorded days'],
      ['RECORDED-DAY AVERAGE',average===null?'—':number(average),'Missing days excluded'],
      ['DAYS LOGGED',recorded+' / 7','Consecutive-day log: '+streak]
    ].forEach(([label,value,description])=>{
      const metric=make('div','beyond-step-metric');
      append(metric,make('span','beyond-step-metric-label',label),
        make('strong','beyond-step-metric-value',value),
        make('span','beyond-step-metric-description',description));
      summary.append(metric);
    });
    wrap.append(grid,summary,make('p','beyond-activity-date',
      'TODAY · '+today+' · TORONTO TIME · '+(entry?'RECORDED ACTIVITY':'AWAITING AN ENTRY')));
    wrap.append(editor());
    return wrap;
  }
  function renderPresence(){
    const wrap=make('div','');
    wrap.append(heading('MEDITATION VIDEOS'));
    const clips=records.filter(r=>r.kind==='meditation').filter(r=>validMediaURL(r.url));
    if(clips.length){
      const grid=make('div','beyond-media-grid');
      clips.forEach(r=>{const card=mediaCard(r);if(card)grid.append(card);});
      wrap.append(grid);
    }else wrap.append(empty('No meditation videos have been published yet. I can add verified YouTube and Instagram sessions from the private editor.'));
    wrap.append(editor());
    return wrap;
  }
  function renderQuestions(){
    const wrap=make('div','');
    const questions=records.filter(r=>r.kind==='question');
    if(!questions.length){
      wrap.append(empty('I have not published any questions from my notes yet. They will form a living word cloud as I add them.'));
    }else{
      const cloud=make('div','beyond-cloud');
      cloud.setAttribute('aria-label','Questions selected from my notes');
      const selected=make('p','beyond-selected-question','Select a question in the cloud to read it here.');
      selected.setAttribute('aria-live','polite');
      questions.forEach(q=>{
        const word=make('button','beyond-cloud-word',q.title);
        word.type='button';
        word.addEventListener('click',()=>{
          selected.textContent=q.body||q.title;
        });
        cloud.append(word);
      });
      wrap.append(cloud,selected);
    }
    wrap.append(editor());
    return wrap;
  }
  // Each card is the physical origin of a native top-layer modal.
  // Use FLIP animation so closing always returns to that exact source card.
  const renderers={music:renderMusic,movement:renderMovement,presence:renderPresence,questions:renderQuestions};
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
  let sourceButton=null,closing=false,openMotion=null,closeMotion=null;

  const fromCard=card=>{
    const src=card.getBoundingClientRect();
    const dest=panel.getBoundingClientRect();
    const x=(src.left+src.width/2)-(dest.left+dest.width/2);
    const y=(src.top+src.height/2)-(dest.top+dest.height/2);
    // Scaling is clamped to prevent extreme stretching when layout is tiny.
    const sx=Math.max(.08,Math.min(1,src.width/dest.width));
    const sy=Math.max(.08,Math.min(1,src.height/dest.height));
    return 'translate3d('+x.toFixed(1)+'px,'+y.toFixed(1)+'px,0) scale('+sx.toFixed(4)+','+sy.toFixed(4)+')';
  };
  function animateOpen(card){
    if(reducedMotion.matches||typeof panel.animate!=='function')return;
    const origin=fromCard(card);
    try{
      openMotion=panel.animate([
        {transform:origin,opacity:.76,borderRadius:'44%',filter:'blur(1.8px)',offset:0},
        {transform:'translate3d(0,0,0) scale(1.035)',opacity:1,borderRadius:'41px',filter:'blur(0px)',offset:.77},
        {transform:'none',opacity:1,borderRadius:'34px',filter:'blur(0px)',offset:1}
      ],{duration:620,easing:'cubic-bezier(.16,1,.29,1)',fill:'both'});
      const entrance=openMotion;
      entrance.finished.then(()=>{
        entrance.cancel(); // Remove fill-mode styles after the entrance ends.
        if(openMotion===entrance)openMotion=null;
      },()=>{
        if(openMotion===entrance)openMotion=null;
      });
    }catch{openMotion=null;}
  }
  function finishClose(){
    if(panel.open&&typeof panel.close==='function')panel.close();
    else panel.removeAttribute('open');
    panel.hidden=true;
    delete panel.dataset.closing;
    delete panel.dataset.active;
    document.body.classList.remove('beyond-popout-open');
    buttons.forEach(b=>b.setAttribute('aria-expanded','false'));
    const card=sourceButton;
    sourceButton=null;active=null;closing=false;closeMotion=null;
    if(card)card.focus({preventScroll:true});
  }
  function dismiss(){
    if(!active||closing)return;
    closing=true;
    panel.dataset.closing='true';
    // End the entrance animation before reversing the portal.
    if(openMotion){
      try{openMotion.finish();}catch{}
      openMotion.cancel();
      openMotion=null;
    }
    if(reducedMotion.matches||!sourceButton||typeof panel.animate!=='function'){
      finishClose();return;
    }
    const origin=fromCard(sourceButton);
    try{
      closeMotion=panel.animate([
        {transform:'none',opacity:1,borderRadius:'34px',filter:'blur(0px)'},
        {transform:'translate3d(0,0,0) scale(1.025)',opacity:1,borderRadius:'41px',filter:'blur(0px)',offset:.2},
        {transform:origin,opacity:.72,borderRadius:'44%',filter:'blur(1.8px)'}
      ],{duration:470,easing:'cubic-bezier(.52,.06,.85,.38)',fill:'both'});
      const exitMotion=closeMotion;
      exitMotion.finished.then(()=>{
        exitMotion.cancel(); // Ensure the following opening has no stale transform.
        finishClose();
      },finishClose);
    }catch{finishClose();}
  }
  function open(kind,shouldFocus=true){
    if(!renderers[kind]||closing)return;
    const h=HEADINGS[kind];
    document.getElementById('beyond-detail-index').textContent=h[0];
    document.getElementById('beyond-detail-title').textContent=h[1];
    document.getElementById('beyond-detail-description').textContent=h[2];
    panel.dataset.active=kind;
    body.replaceChildren(renderers[kind]());
    const alreadyOpen=panel.open;
    active=kind;
    if(alreadyOpen)return; // Live data refreshed; do not replay expansion or steal focus.
    sourceButton=buttons.find(b=>b.dataset.interest===kind);
    if(!sourceButton)return;
    panel.hidden=false;
    // showModal() places the bubble above the entire page, even inside transformed sections.
    if(typeof panel.showModal==='function')panel.showModal();
    else panel.setAttribute('open','');
    document.body.classList.add('beyond-popout-open');
    buttons.forEach(b=>b.setAttribute('aria-expanded',String(b===sourceButton)));
    panel.scrollTop=0;
    if(shouldFocus)close.focus({preventScroll:true});
    animateOpen(sourceButton);
  }
  buttons.forEach(b=>b.addEventListener('click',()=>open(b.dataset.interest)));
  close.addEventListener('click',dismiss);
  // Intercept the native Escape/cancel action, so it reverses into its source.
  panel.addEventListener('cancel',event=>{event.preventDefault();dismiss();});
  // Clicking the dimmed region outside the bubble also reverses the animation.
  panel.addEventListener('click',event=>{
    if(event.target!==panel||closing)return;
    const rect=panel.getBoundingClientRect();
    if(event.clientX<rect.left||event.clientX>rect.right||
       event.clientY<rect.top||event.clientY>rect.bottom)dismiss();
  });
  // Defensive cleanup if a browser closes the dialog natively.
  panel.addEventListener('close',()=>{
    if(!panel.open&&!panel.hidden){
      panel.hidden=true;
      delete panel.dataset.closing;
      delete panel.dataset.active;
      document.body.classList.remove('beyond-popout-open');
      buttons.forEach(b=>b.setAttribute('aria-expanded','false'));
      const back=sourceButton;
      sourceButton=null;active=null;closing=false;
      if(back)back.focus({preventScroll:true});
    }
  });

  async function load(){
    const [saved,posts]=await Promise.allSettled([
      fetch(API+'/api/creative',{headers:{Accept:'application/json'}}).then(r=>{
        if(!r.ok)throw Error('Creative data is unavailable');
        return r.json();
      }),
      fetch('creative-posts.json').then(r=>{if(!r.ok)throw Error('Media list unavailable');return r.json();})
    ]);
    records=saved.status==='fulfilled'&&Array.isArray(saved.value.items)?saved.value.items:[];
    catalog=posts.status==='fulfilled'&&Array.isArray(posts.value.items)?posts.value.items:[];
    if(active&&!(active==='movement'&&window.PortfolioMovement?.render))open(active,false);
  }
  void load();
})();

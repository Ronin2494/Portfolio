/* Instagram Editorial Guide gallery.
   Post content comes from the authorized publisher catalog, never scraped on the client.
   Guide generation is deterministic and uses only supplied caption text. */
(() => {
  'use strict';
  const root = document.getElementById('instagram-post-grid');
  const status = document.getElementById('instagram-status');
  const drawer = document.getElementById('instagram-guide');
  if (!root || !status || !drawer) return;

  const $ = id => document.getElementById(id);
  const safeURL = value => {
    try {
      const u = new URL(value);
      return u.protocol === 'https:' && (u.hostname === 'www.instagram.com' || u.hostname === 'instagram.com')
        && /^\/(?:p|reel)\/[a-zA-Z0-9_-]+\/?$/.test(u.pathname) ? u.href : null;
    } catch { return null; }
  };
  const mediaURL = value => {
    try {
      const u = new URL(value);
      return u.protocol === 'https:' && /(?:^|\.)cdninstagram\.com$|(?:^|\.)fbcdn\.net$/.test(u.hostname) ? u.href : null;
    } catch { return null; }
  };
  const blocks = [
    ['What this post explains', 'Read the original caption or open Instagram to understand the author’s message.'],
    ['What to verify', 'Check any product, technique, pricing or feature claims against a primary source.'],
    ['Try it yourself', 'Define one small task, try the technique with sample data, then review the result.'],
    ['Make it repeatable', 'Write down the steps that worked, what did not, and what you would improve.']
  ];
  const detect = caption => {
    const s = caption.toLowerCase();
    if (/\b(ai|artificial intelligence|chatgpt|claude|gemini|prompt|model|agent)\b/.test(s))
      return {kind:'AI workflow',steps:['Identify the AI tool or technique mentioned in the post.', 'Open its official documentation and check current capabilities.', 'Test the method on a non-sensitive example.', 'Compare output with a second source and refine your prompt.']};
    if (/\b(reel|content|creator|instagram|engagement|video|hook)\b/.test(s))
      return {kind:'Creator workflow',steps:['Identify the main idea and intended audience.', 'Study the structure and opening hook.', 'Create an original version in your own words and visual style.', 'Track meaningful metrics and improve the next post.']};
    if (/\b(business|product|startup|customer|market|sales)\b/.test(s))
      return {kind:'Product workflow',steps:['Define the customer problem described.', 'Collect evidence from real users or public research.', 'Sketch a small testable solution.', 'Measure feedback before investing further.']};
    return {kind:'Post breakdown',steps:['Identify the post’s main idea from the supplied caption.', 'List what is observation versus interpretation.', 'Try one concrete application of the idea.', 'Record what you learned and what to explore next.']};
  };
  function openGuide(post) {
    const caption = String(post.caption || '').trim();
    const url = safeURL(post.permalink);
    if (!url) return;
    $('instagram-guide-title').textContent = caption ? caption.split('\n').find(Boolean).slice(0,110) : 'Guide for this Instagram post';
    const contents = $('instagram-guide-content');
    contents.replaceChildren();
    const label = document.createElement('p');
    label.className = 'ig-guide-context';
    if (!caption) {
      label.textContent = 'The post has not yet been synced from an authorized Instagram account. Open the post to read its content. This guide cannot truthfully describe the post until its caption is available.';
      contents.append(label);
      const link = document.createElement('a');
      link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Read original Instagram post ↗'; link.className = 'ig-button';
      contents.append(link);
    } else {
      const type = detect(caption);
      label.textContent = 'Guide type: ' + type.kind + ' · Based on the post caption, not an independent fact-check.';
      contents.append(label);
      const quote = document.createElement('blockquote');quote.className='ig-caption';quote.textContent=caption;contents.append(quote);
      const h = document.createElement('h3');h.textContent='Your practical walkthrough';contents.append(h);
      const list=document.createElement('ol');list.className='ig-guide-list';
      type.steps.forEach(step => {const li=document.createElement('li');li.textContent=step;list.append(li);});
      contents.append(list);
      const source = document.createElement('a');source.href=url;source.target='_blank';source.rel='noopener noreferrer';source.textContent='Verify on Instagram ↗';source.className='ig-button';contents.append(source);
    }
    drawer.hidden=false;
    $('instagram-guide-close').focus();
    drawer.scrollIntoView({block:'nearest',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }
  const closeGuide=()=>{
    drawer.hidden=true;
    const btn=document.querySelector('[data-ig-guide][aria-expanded="true"]');
    if(btn){btn.setAttribute('aria-expanded','false');btn.focus({preventScroll:true});}
  };
  $('instagram-guide-close').addEventListener('click',closeGuide);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!drawer.hidden)closeGuide();});
  let allPosts=[];
  function draw(posts) {
    root.replaceChildren();
    allPosts=posts;
    if (!posts.length){status.textContent='No published posts available yet.';return;}
    posts.forEach((post,index)=>{
      const url=safeURL(post.permalink);
      if (!url) return;
      const article=document.createElement('article');article.className='ig-post';article.setAttribute('aria-label','Instagram post '+(index+1));
      const cover=document.createElement('div');cover.className='ig-visual';
      const photo=mediaURL(post.thumbnailUrl)||mediaURL(post.mediaUrl);
      if(photo){const img=document.createElement('img');img.src=photo;img.alt='Instagram post media preview';img.loading='lazy';img.referrerPolicy='no-referrer';cover.append(img);}
      else{const mark=document.createElement('span');mark.className='ig-orbit';mark.setAttribute('aria-hidden','true');cover.append(mark);}
      const copy=document.createElement('div');copy.className='ig-post-copy';
      const kicker=document.createElement('span');kicker.className='ig-post-kicker';kicker.textContent=(post.mediaType==='VIDEO'?'VIDEO':post.mediaType==='CAROUSEL_ALBUM'?'CAROUSEL':'INSTAGRAM')+' / '+String(index+1).padStart(2,'0');
      const title=document.createElement('h3');title.textContent=post.caption?.trim()?post.caption.trim().split('\n')[0].slice(0,95):'From the Instagram journal';
      const summary=document.createElement('p');summary.textContent=post.caption?.trim()?post.caption.trim().slice(0,170):'Open the original post. A caption-based walkthrough will appear after the authorized feed connects.';
      const actions=document.createElement('div');actions.className='ig-actions';
      const postLink=document.createElement('a');postLink.href=url;postLink.target='_blank';postLink.rel='noopener noreferrer';postLink.textContent='View original ↗';postLink.className='ig-link';
      const guide=document.createElement('button');guide.type='button';guide.className='ig-button';guide.textContent='Open dynamic guide ↗';guide.dataset.igGuide=post.id;guide.setAttribute('aria-controls','instagram-guide');guide.setAttribute('aria-expanded','false');
      guide.addEventListener('click',()=>{
        root.querySelectorAll('[data-ig-guide]').forEach(x=>x.setAttribute('aria-expanded','false'));
        guide.setAttribute('aria-expanded','true');openGuide(post);
      });
      actions.append(postLink,guide);copy.append(kicker,title,summary,actions);article.append(cover,copy);root.append(article);
    });
    status.textContent=posts.length+' Instagram '+(posts.length===1?'post':'posts')+' available. Guides are based on published captions.';
  }
  async function load(){
    try{
      const res=await fetch('/instagram-posts.json',{cache:'no-store'});
      if (!res.ok) throw Error('Feed unavailable');
      const catalog=await res.json();
      const ids=new Set();
      const entries=(Array.isArray(catalog.posts)?catalog.posts:[]).filter(p=>{
        if (!p||!safeURL(p.permalink)||!p.id||ids.has(p.id))return false;
        ids.add(p.id);return true;
      });
      draw(entries);
    }catch{
      draw([{id:'DfTMZktj8t6',permalink:'https://www.instagram.com/p/DfTMZktj8t6/',caption:'',mediaType:'UNKNOWN'}]);
      status.textContent='Showing the initial post. Automatic sync is unavailable right now.';
    }
  }
  load();
})();

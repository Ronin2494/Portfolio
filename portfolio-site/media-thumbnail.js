/* Shared media presentation for Portfolio. URLs are validated before DOM insertion. */
(()=>{
  'use strict';
  const youtubeId=/^[A-Za-z0-9_-]{11}$/;
  const instagramId=/^[A-Za-z0-9_-]+$/;
  const localCover=/^media\/reels\/[A-Za-z0-9_-]+\.(?:jpg|jpeg|png|webp)$/i;
  function describe(raw){
    if(!raw||typeof raw.url!=='string')return null;
    let url;
    try{url=new URL(raw.url);}catch{return null;}
    if(url.protocol!=='https:')return null;
    const host=url.hostname.toLowerCase();
    let provider,id;
    if(['youtube.com','www.youtube.com','m.youtube.com','youtu.be'].includes(host)){
      provider='youtube';
      if(host==='youtu.be')id=url.pathname.slice(1).split('/')[0];
      else if(url.pathname==='/watch')id=url.searchParams.get('v');
      else if(/^\/(?:shorts|live)\//.test(url.pathname))id=url.pathname.split('/')[2];
      if(!youtubeId.test(id||''))return null;
    }else if(['instagram.com','www.instagram.com'].includes(host)){
      provider='instagram';
      const match=url.pathname.match(/^\/(?:reel|p|tv)\/([A-Za-z0-9_-]+)\/?$/);
      if(!match||!instagramId.test(match[1]))return null;
      id=match[1];
    }else return null;
    let cover=null;
    if(typeof raw.cover==='string'&&localCover.test(raw.cover)&&raw.cover.includes('/'+id+'.'))
      cover=raw.cover;
    if(!cover&&provider==='youtube')cover='https://i.ytimg.com/vi/'+id+'/hqdefault.jpg';
    return {provider,id,cover,url:url.href,title:String(raw.title||'Untitled video')};
  }
  function thumbnail(item,{className='media-thumbnail',label}={}){
    const media=describe(item);
    if(!media)return null;
    const stage=document.createElement('span');
    stage.className='media-thumbnail '+className;
    stage.dataset.provider=media.provider;
    const caption=document.createElement('span');
    caption.className='media-thumbnail-provider';
    caption.textContent=label||media.provider.toUpperCase();
    if(media.cover){
      const image=document.createElement('img');
      image.className='media-thumbnail-image';
      image.src=media.cover;
      image.alt='';
      image.loading='lazy';
      image.decoding='async';
      image.referrerPolicy='no-referrer';
      image.addEventListener('error',()=>{
        image.remove();
        stage.dataset.fallback='true';
      },{once:true});
      stage.append(image);
    }else stage.dataset.fallback='true';
    const overlay=document.createElement('span');
    overlay.className='media-thumbnail-overlay';
    const action=document.createElement('span');
    action.className='media-thumbnail-action';
    action.setAttribute('aria-hidden','true');
    action.textContent='↗';
    overlay.append(caption,action);
    stage.append(overlay);
    return stage;
  }
  window.PortfolioMedia={describe,thumbnail};
})();

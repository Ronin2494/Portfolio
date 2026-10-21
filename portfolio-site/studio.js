/* Creator-only publisher. This file is not loaded by the public gallery. All permissions are checked again by the API. */
(() => {
  'use strict';
  const API = 'https://badbunny-membership-api.onrender.com';
  const FIREBASE_CONFIG = {
    apiKey: 'AIzaSyCTMkSyone3pN9cO0swL9LXKXTjhp5nlWc',
    authDomain: 'portfolio-449e6.firebaseapp.com',
    projectId: 'portfolio-449e6',
    appId: '1:958447333550:web:aa82806a3d43833d927d3f'
  };
  const EMAIL_KEY = 'badbunny-studio-link-email';
  const fields = [
    'status-banner','auth-panel','email-form','email','request-code','auth-notice',
    'workspace','creator-email','sign-out','upload-form','media-file','preview',
    'file-summary','media-title','media-description','media-price',
    'media-type','publish-button','upload-notice','progress-wrap','upload-progress',
    'reload-media','media-count','library-notice','media-list','edit-panel','edit-id',
    'edit-form','edit-title-input','edit-description','edit-price',
    'save-edit','edit-notice','close-edit'
  ];
  const ui = Object.fromEntries(fields.map(id => [id, document.getElementById(id)]));
  if (!ui['auth-panel']) return;
  let firebaseAuth = null;
  let firebaseMethods = null;
  let creator = null;
  let fileObjectURL = null;
  let uploads = [];
  const money = cents => new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(cents/100);
  const show = (element,visible) => { element.hidden = !visible; };
  const notice = (element,message,kind='') => {
    element.textContent = message;
    element.dataset.kind = kind;
  };
  const busy = (element,enabled,label='Working…') => {
    element.disabled = enabled;
    if(enabled){
      element.dataset.savedLabel = element.textContent;
      element.textContent = label;
    }else if(element.dataset.savedLabel){
      element.textContent = element.dataset.savedLabel;
      delete element.dataset.savedLabel;
    }
  };
  function firebaseError(error){
    const code=String(error?.code||'');
    if(code==='auth/unauthorized-domain')return 'This site is not an authorized Firebase domain. Add badbunny.work under Firebase Authentication → Settings → Authorized domains.';
    if(code==='auth/operation-not-allowed')return 'Enable Email/Password and Email link sign-in in Firebase Authentication → Sign-in method.';
    if(code==='auth/invalid-email')return 'Enter a valid creator email address.';
    if(code==='auth/invalid-action-code'||code==='auth/expired-action-code')return 'This sign-in link expired or was already used. Request another link.';
    if(code==='auth/too-many-requests')return 'Too many requests. Try again later.';
    if(code==='auth/network-request-failed')return 'Unable to reach Firebase. Check your connection and try again.';
    return error?.message||'Firebase sign-in failed. Please try again.';
  }
  async function authHeader(){
    if(!firebaseAuth?.currentUser)return {};
    return {Authorization:'Bearer '+await firebaseAuth.currentUser.getIdToken()};
  }
  async function call(path,options={}){
    let response;
    try{
      const headers={Accept:'application/json',...await authHeader(),...options.headers};
      if(options.body && !(options.body instanceof FormData))headers['Content-Type']='application/json';
      response=await fetch(API+path,{...options,headers,signal:AbortSignal.timeout(30000)});
    }catch{throw new Error('Cannot connect to the creator API. Check its Render deployment and try again.');}
    const result=(response.headers.get('content-type')||'').includes('application/json')?await response.json():{};
    if(!response.ok)throw new Error(result.error||'Request failed. Please try again.');
    return result;
  }
  function resetPreview(){
    if(fileObjectURL)URL.revokeObjectURL(fileObjectURL);
    fileObjectURL=null;
    ui['preview'].replaceChildren();
    show(ui['preview'],false);
    ui['media-type'].textContent='SELECT MEDIA';
    ui['file-summary'].textContent='Select your media to preview it here before publishing.';
  }
  function renderFilePreview(){
    resetPreview();
    const file=ui['media-file'].files?.[0];
    if(!file)return;
    const isVideo=file.type.startsWith('video/');
    if(!file.type.startsWith('image/')&&!isVideo){
      notice(ui['upload-notice'],'Choose a supported photo or video file.','error');return;
    }
    if(file.size>100*1024*1024){
      notice(ui['upload-notice'],'The file exceeds the 100 MB limit.','error');return;
    }
    fileObjectURL=URL.createObjectURL(file);
    const media=document.createElement(isVideo?'video':'img');
    media.src=fileObjectURL;
    if(isVideo){media.controls=true;media.playsInline=true;media.preload='metadata';}
    else media.alt='Local preview for '+file.name;
    ui['preview'].append(media);
    show(ui['preview'],true);
    ui['media-type'].textContent=isVideo?'VIDEO':'PHOTO';
    ui['file-summary'].textContent=file.name+' · '+(file.size/(1024*1024)).toFixed(1)+' MB';
    notice(ui['upload-notice'],'');
  }
  function openWorkspace(user){
    creator=user;
    show(ui['auth-panel'],false);
    show(ui['workspace'],true);
    ui['creator-email'].textContent='✦ VERIFIED CREATOR · '+user.email;
    notice(ui['status-banner'],'Firebase sign-in verified. You can now upload photos and videos.','success');
    void loadLibrary();
  }
  function closeWorkspace(){
    creator=null;
    show(ui['workspace'],false);
    show(ui['auth-panel'],true);
    uploads=[];
    ui['media-list'].replaceChildren();
  }
  async function restoreSession(){
    if(!firebaseAuth?.currentUser){closeWorkspace();return;}
    try{
      const data=await call('/api/me');
      if(!data.user?.admin)throw new Error('This Firebase account is not authorized as the creator.');
      openWorkspace(data.user);
    }catch(error){
      closeWorkspace();
      notice(ui['auth-notice'],error.message,'error');
      await firebaseMethods.signOut(firebaseAuth);
    }
  }
  async function completeEmailLink(){
    if(!firebaseMethods.isSignInWithEmailLink(firebaseAuth,window.location.href))return false;
    let email='';
    try{email=window.localStorage.getItem(EMAIL_KEY)||'';}catch{}
    if(!email)email=window.prompt('Enter the email address you used to request this sign-in link:')||'';
    email=email.trim().toLowerCase();
    if(!email){
      notice(ui['auth-notice'],'Enter the same email you used to request your link, then reopen it.','error');
      return true;
    }
    notice(ui['status-banner'],'Verifying your Firebase email link…');
    try{
      await firebaseMethods.signInWithEmailLink(firebaseAuth,email,window.location.href);
      try{window.localStorage.removeItem(EMAIL_KEY);}catch{}
      history.replaceState(null,'',window.location.pathname);
      notice(ui['auth-notice'],'Email verified. Checking creator access…','success');
      await restoreSession();
    }catch(error){
      notice(ui['auth-notice'],firebaseError(error),'error');
      notice(ui['status-banner'],'Email-link verification failed. Request a new link if needed.','error');
    }
    return true;
  }
  async function init(){
    ui['request-code'].disabled=true;
    try{
      const [firebaseApp,firebaseAuthSDK,config]=await Promise.all([
        import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),
        import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js'),
        call('/api/config')
      ]);
      firebaseMethods=firebaseAuthSDK;
      firebaseAuth=firebaseAuthSDK.getAuth(firebaseApp.initializeApp(FIREBASE_CONFIG));
      await firebaseAuthSDK.setPersistence(firebaseAuth,firebaseAuthSDK.browserLocalPersistence);
      await firebaseAuth.authStateReady();
      if(!config.authEnabled){
        notice(ui['status-banner'],'Firebase is connected. Creator API is waiting for MongoDB, SESSION_SECRET, ADMIN_EMAIL or FIREBASE_PROJECT_ID in Render.','error');
        return;
      }
      if(await completeEmailLink())return;
      if(firebaseAuth.currentUser){await restoreSession();}
      else notice(ui['status-banner'],'Ready to send a Firebase email sign-in link. Enter your creator email below.','success');
      ui['request-code'].disabled=false;
    }catch(error){
      notice(ui['status-banner'],'Firebase setup or API error: '+firebaseError(error),'error');
      ui['request-code'].disabled=true;
    }
  }
  ui['email-form'].addEventListener('submit',async event=>{
    event.preventDefault();
    if(!firebaseAuth)return;
    const email=ui['email'].value.trim().toLowerCase();
    if(!email)return;
    busy(ui['request-code'],true,'SENDING LINK…');
    try{
      await firebaseMethods.sendSignInLinkToEmail(firebaseAuth,email,{
        url:window.location.origin+'/studio.html',
        handleCodeInApp:true
      });
      try{window.localStorage.setItem(EMAIL_KEY,email);}catch{}
      notice(ui['auth-notice'],'Verification link sent to '+email+'. Open the email and click the sign-in link.','success');
      notice(ui['status-banner'],'Check your inbox for the Firebase sign-in link.','success');
    }catch(error){notice(ui['auth-notice'],firebaseError(error),'error');}
    finally{busy(ui['request-code'],false);}
  });
  ui['sign-out'].addEventListener('click',async()=>{
    try{if(firebaseAuth)await firebaseMethods.signOut(firebaseAuth);}catch{}
    closeWorkspace();
    notice(ui['status-banner'],'Signed out of Creator Studio.','success');
  });
  ui['media-file'].addEventListener('change',renderFilePreview);
  function validPrice(value){
    const amount=Number(value);
    return /^[0-9]{1,4}(?:[.][0-9]{1,2})?$/.test(String(value))&&Number.isFinite(amount)&&amount>=1&&amount<=1000?amount.toFixed(2):null;
  }
  async function uploadMedia(formData,onProgress) {
    const headers=await authHeader();
    if(!headers.Authorization)throw new Error('Please sign in with your Firebase email link first.');
    return new Promise((resolve,reject)=>{
      const xhr=new XMLHttpRequest();
      xhr.open('POST',API+'/api/admin/upload');
      xhr.setRequestHeader('Authorization',headers.Authorization);
      xhr.setRequestHeader('Accept','application/json');
      xhr.timeout=180000;
      xhr.upload.onprogress=e=>{if(e.lengthComputable)onProgress(Math.round(e.loaded/e.total*100));};
      xhr.onload=()=>{
        let result={};
        try{result=JSON.parse(xhr.responseText);}catch{}
        if(xhr.status>=200&&xhr.status<300)resolve(result);
        else reject(new Error(result.error||'Upload failed. Please try again.'));
      };
      xhr.onerror=()=>reject(new Error('Upload connection failed.'));
      xhr.ontimeout=()=>reject(new Error('Upload timed out. Try a smaller file or check the service.'));
      xhr.send(formData);
    });
  }
  ui['upload-form'].addEventListener('submit',async event=>{
    event.preventDefault();
    if(!creator?.admin)return;
    const file=ui['media-file'].files?.[0];
    if(!file){notice(ui['upload-notice'],'Choose a photo or video first.','error');return;}
    if(file.size>100*1024*1024){notice(ui['upload-notice'],'File exceeds the 100 MB limit.','error');return;}
    const price=validPrice(ui['media-price'].value);
    if(!price){notice(ui['upload-notice'],'Set a valid CAD price between 1.00 and 1000.00 with two decimal places.','error');return;}
    const body=new FormData();
    body.set('file',file);
    body.set('title',ui['media-title'].value.trim());
    body.set('description',ui['media-description'].value.trim());
    body.set('price',price);
    busy(ui['publish-button'],true,'PUBLISHING…');
    show(ui['progress-wrap'],true);
    ui['upload-progress'].value=0;
    notice(ui['upload-notice'],'Uploading '+file.name+'…');
    try{
      await uploadMedia(body,p=>ui['upload-progress'].value=p);
      ui['upload-form'].reset();
      ui['media-price'].value='10.00';
      resetPreview();
      notice(ui['upload-notice'],'Published! Your item and price now appear in the public gallery.','success');
      notice(ui['status-banner'],'Latest upload published. Check the public gallery to review the locked card.','success');
      await loadLibrary();
    }catch(err){notice(ui['upload-notice'],err.message,'error');}
    finally{busy(ui['publish-button'],false);show(ui['progress-wrap'],false);}
  });
  const tag=(name,className,text)=>{
    const node=document.createElement(name);
    if(className)node.className=className;
    if(text!==undefined)node.textContent=text;
    return node;
  };
  async function previewItem(item,target,trigger) {
    busy(trigger,true,'LOADING…');
    try{
      const ticket=await call('/api/media/'+encodeURIComponent(item.id)+'/ticket',{method:'POST'});
      if(typeof ticket.url!=='string'||!ticket.url.startsWith(API+'/api/media/'))throw new Error('Media preview was unavailable.');
      target.replaceChildren();
      const isVideo=item.type?.startsWith('video/');
      const media=document.createElement(isVideo?'video':'img');
      media.src=ticket.url;
      media.referrerPolicy='no-referrer';
      if(isVideo){media.controls=true;media.playsInline=true;media.preload='metadata';}
      else media.alt=item.title;
      target.append(media);
      show(target,true);
    }catch(err){notice(ui['library-notice'],err.message,'error');}
    finally{busy(trigger,false);}
  }
  function openEditor(item){
    ui['edit-id'].value=item.id;
    ui['edit-title-input'].value=item.title||'';
    ui['edit-description'].value=item.description||'';
    ui['edit-price'].value=((item.priceCents||1000)/100).toFixed(2);
    notice(ui['edit-notice'],'');
    show(ui['edit-panel'],true);
    ui['edit-panel'].scrollIntoView({behavior:'smooth',block:'start'});
    ui['edit-title-input'].focus({preventScroll:true});
  }
  function renderLibrary(items){
    ui['media-list'].replaceChildren();
    ui['media-count'].textContent=String(items.length);
    if(!items.length){
      notice(ui['library-notice'],'No media published yet. Upload your first image or video above.');
      return;
    }
    notice(ui['library-notice'],'You have '+items.length+' published gallery item'+(items.length===1?'':'s')+'.');
    items.forEach(item=>{
      const isVideo=item.type?.startsWith('video/');
      const row=tag('article','media-row');
      const symbol=tag('div','media-symbol',isVideo?'▶':'▣');
      symbol.setAttribute('aria-hidden','true');
      const body=tag('div','media-details');
      body.append(tag('h3','',item.title||'Untitled'),tag('span','media-price',money(item.priceCents||1000)+' CAD'));
      if(item.description)body.append(tag('p','',item.description));
      body.append(tag('p','',isVideo?'VIDEO · LOCKED':'PHOTO · LOCKED'));
      const actions=tag('div','media-actions');
      const edit=tag('button','button quiet','EDIT PRICE / DETAILS');
      edit.type='button';
      edit.addEventListener('click',()=>openEditor(item));
      const view=tag('button','button quiet','PREVIEW');
      view.type='button';
      const preview=tag('div','item-preview');
      show(preview,false);
      view.addEventListener('click',()=>void previewItem(item,preview,view));
      const remove=tag('button','button quiet','DELETE');
      remove.type='button';
      remove.addEventListener('click',async()=>{
        if(!confirm('Permanently delete "'+item.title+'" from the gallery?'))return;
        busy(remove,true,'DELETING…');
        try{
          await call('/api/admin/media/'+encodeURIComponent(item.id),{method:'DELETE'});
          notice(ui['status-banner'],'Media removed from the public gallery.','success');
          if(ui['edit-id'].value===item.id)show(ui['edit-panel'],false);
          await loadLibrary();
        }catch(err){notice(ui['library-notice'],err.message,'error');busy(remove,false);}
      });
      actions.append(edit,view,remove);
      body.append(actions,preview);
      row.append(symbol,body);
      ui['media-list'].append(row);
    });
  }
  async function loadLibrary(){
    if(!creator?.admin)return;
    try{
      const result=await call('/api/media');
      uploads=Array.isArray(result.items)?result.items:[];
      renderLibrary(uploads);
    }catch(err){notice(ui['library-notice'],err.message,'error');}
  }
  ui['reload-media'].addEventListener('click',()=>void loadLibrary());
  ui['close-edit'].addEventListener('click',()=>show(ui['edit-panel'],false));
  ui['edit-form'].addEventListener('submit',async event=>{
    event.preventDefault();
    if(!creator?.admin)return;
    const price=validPrice(ui['edit-price'].value);
    if(!price){notice(ui['edit-notice'],'Enter a valid price with two decimals.','error');return;}
    busy(ui['save-edit'],true,'SAVING…');
    try{
      await call('/api/admin/media/'+encodeURIComponent(ui['edit-id'].value),{
        method:'PATCH',
        body:JSON.stringify({
          title:ui['edit-title-input'].value.trim(),
          description:ui['edit-description'].value.trim(),
          price
        })
      });
      show(ui['edit-panel'],false);
      notice(ui['status-banner'],'Price and item details updated in your gallery.','success');
      await loadLibrary();
    }catch(err){notice(ui['edit-notice'],err.message,'error');}
    finally{busy(ui['save-edit'],false);}
  });
  void init();
})();
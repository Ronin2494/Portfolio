/* Creator-only client. Server verifies bearer JWT and configured owner on every write. */
import {initializeApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth,setPersistence,browserLocalPersistence,isSignInWithEmailLink,signInWithEmailLink,sendSignInLinkToEmail,signOut} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
const API='https://badbunny-membership-api.onrender.com';
const FIREBASE_CONFIG={
  apiKey:'AIzaSyCTMkSyone3pN9cO0swL9LXKXTjhp5nlWc',
  authDomain:'portfolio-449e6.firebaseapp.com',projectId:'portfolio-449e6',
  appId:'1:958447333550:web:aa82806a3d43833d927d3f'
};
const EMAIL_KEY='badbunny-studio-link-email';
const get=id=>document.getElementById(id);
const ui={
  status:get('editor-status'),login:get('editor-login'),loginForm:get('editor-login-form'),
  email:get('editor-email'),send:get('editor-send'),workspace:get('editor-workspace'),
  user:get('editor-user'),form:get('creative-form'),kind:get('entry-kind'),
  title:get('entry-title'),body:get('entry-body'),url:get('entry-url'),
  date:get('entry-date'),steps:get('entry-steps'),calories:get('entry-calories'),
  textFields:get('editor-text-fields'),bodyFields:get('editor-body-fields'),
  urlFields:get('editor-url-fields'),activityFields:get('editor-activity-fields'),
  submit:get('editor-submit'),cancel:get('editor-cancel'),
  items:get('editor-items'),empty:get('editor-empty'),refresh:get('editor-refresh')
};
let auth=null,entries=[],editing=null,verified=false;
const status=(message,error=false)=>{ui.status.textContent=message;ui.status.dataset.error=String(error);};
const today=()=>{
  const parts=new Intl.DateTimeFormat('en-CA',{
    timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'
  }).formatToParts(new Date());
  const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
  return [p.year,p.month,p.day].join('-');
};
ui.date.value=today();
function changeKind(){
  const k=ui.kind.value,isActivity=k==='activity',isMedia=['music','meditation'].includes(k);
  ui.textFields.hidden=isActivity;
  ui.bodyFields.hidden=isActivity||isMedia;
  ui.urlFields.hidden=!isMedia;
  ui.activityFields.hidden=!isActivity;
  ui.title.required=!isActivity;
  ui.body.required=k==='composition';
  ui.url.required=isMedia;
  ui.date.required=isActivity;
  ui.steps.required=isActivity;ui.calories.required=isActivity;
}
ui.kind.addEventListener('change',changeKind);changeKind();
const authHeader=async()=>{
  if(!auth?.currentUser)throw Error('Sign in as the creator first.');
  return {Authorization:'Bearer '+await auth.currentUser.getIdToken()};
};
async function request(path,method='GET',payload){
  const headers={Accept:'application/json',...await authHeader()};
  if(payload!==undefined)headers['Content-Type']='application/json';
  const response=await fetch(API+path,{
    method,headers,body:payload===undefined?undefined:JSON.stringify(payload),
    signal:AbortSignal.timeout(30000)
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.error||'Creator service returned '+response.status+'.');
  return data;
}
function setWorkspace(isOpen){
  verified=isOpen;ui.workspace.hidden=!isOpen;ui.login.hidden=isOpen;
  if(!isOpen){entries=[];ui.items.replaceChildren();}
}
const make=(tag,cls,content)=>{
  const e=document.createElement(tag);
  if(cls)e.className=cls;
  if(content!==undefined)e.textContent=String(content);
  return e;
};
function renderLibrary(){
  ui.items.replaceChildren();
  ui.empty.hidden=entries.length>0;
  ui.empty.textContent=entries.length?'':'Nothing has been published yet. Add the first item using the form above.';
  for(const item of entries){
    const card=make('article','item');
    const type=make('span','item-kind',item.kind==='activity'?'DAILY MOVEMENT':item.kind.toUpperCase());
    const title=make('h3','',item.kind==='activity'?item.date:item.title);
    const detail=make('p','',item.kind==='activity'
      ?String(item.steps)+' steps · '+String(item.activeCalories)+' active kcal'
      :item.url||item.body||'No additional description');
    const buttons=make('div','item-actions');
    const edit=make('button','','EDIT');edit.type='button';
    edit.addEventListener('click',()=>startEdit(item));
    const del=make('button','','DELETE');del.type='button';
    del.addEventListener('click',()=>removeItem(item,del));
    buttons.append(edit,del);card.append(type,title,detail,buttons);ui.items.append(card);
  }
}
async function reload(){
  if(!verified)return;
  try{
    const data=await request('/api/admin/creative');
    entries=Array.isArray(data.items)?data.items:[];
    renderLibrary();
  }catch(error){status(error.message,true);}
}
async function removeItem(item,button){
  if(!window.confirm('Delete this published '+item.kind+' entry?'))return;
  button.disabled=true;
  try{
    await request('/api/admin/creative/'+encodeURIComponent(item.id),'DELETE');
    status('Entry deleted from the public collection.');
    if(editing?.id===item.id)resetForm();
    await reload();
  }catch(error){status(error.message,true);}
  finally{button.disabled=false;}
}
function startEdit(item){
  editing=item;
  ui.kind.value=item.kind;ui.kind.disabled=true;changeKind();
  ui.title.value=item.title||'';ui.body.value=item.body||'';ui.url.value=item.url||'';
  ui.date.value=item.date||today();ui.date.readOnly=item.kind==='activity';
  ui.steps.value=item.steps??'';ui.calories.value=item.activeCalories??'';
  ui.submit.textContent='SAVE CHANGES ↗';ui.cancel.hidden=false;
  ui.form.scrollIntoView({behavior:'auto',block:'start'});
  const focus=item.kind==='activity'?ui.steps:['music','meditation'].includes(item.kind)?ui.url:ui.title;
  focus.focus({preventScroll:true});
  status('Editing '+(item.title||item.date)+'. Save changes to update the public page.');
}
function resetForm(){
  editing=null;ui.form.reset();ui.kind.disabled=false;ui.kind.value='composition';
  ui.date.readOnly=false;ui.date.value=today();
  ui.submit.textContent='PUBLISH ENTRY ↗';ui.cancel.hidden=true;changeKind();
}
ui.cancel.addEventListener('click',resetForm);
ui.refresh.addEventListener('click',reload);
ui.form.addEventListener('submit',async event=>{
  event.preventDefault();
  if(!verified)return;
  const kind=editing?.kind||ui.kind.value;
  let payload;
  if(kind==='activity'){
    if(ui.steps.value===''||ui.calories.value===''){
      status('Enter both actual steps and active calories.',true);return;
    }
    payload={kind,date:ui.date.value,steps:Number(ui.steps.value),activeCalories:Number(ui.calories.value)};
  }else if(['music','meditation'].includes(kind)){
    payload={kind,title:ui.title.value.trim(),url:ui.url.value.trim()};
  }else payload={kind,title:ui.title.value.trim(),body:ui.body.value.trim()};
  ui.submit.disabled=true;
  try{
    await request(editing?'/api/admin/creative/'+encodeURIComponent(editing.id):'/api/admin/creative',
      editing?'PATCH':'POST',payload);
    status('Published. Your Portfolio collection has been updated.');
    resetForm();await reload();
  }catch(error){status(error.message,true);}
  finally{ui.submit.disabled=false;}
});
ui.loginForm.addEventListener('submit',async event=>{
  event.preventDefault();
  if(!auth)return;
  const email=ui.email.value.trim().toLowerCase();
  if(!email)return;
  ui.send.disabled=true;
  try{
    await sendSignInLinkToEmail(auth,email,{
      url:window.location.origin+'/creative-editor.html',handleCodeInApp:true
    });
    try{localStorage.setItem(EMAIL_KEY,email);}catch{}
    status('Secure sign-in link sent. Open your email on this device to continue.');
  }catch(error){status(error.message||'Could not send sign-in link.',true);}
  finally{ui.send.disabled=false;}
});
get('editor-logout').addEventListener('click',async()=>{
  if(auth)await signOut(auth);
  resetForm();setWorkspace(false);status('Signed out.');
});
async function verifyOwner(){
  if(!auth.currentUser){setWorkspace(false);status('Ready for creator sign-in.');return;}
  try{
    const data=await request('/api/me');
    if(!data.user?.admin)throw Error('This account does not have creator permissions.');
    setWorkspace(true);ui.user.textContent='VERIFIED CREATOR · '+data.user.email;
    status('Creator access verified. Manage your collection below.');
    await reload();
  }catch(error){setWorkspace(false);status(error.message,true);}
}
async function init(){
  ui.send.disabled=true;
  try{
    auth=getAuth(initializeApp(FIREBASE_CONFIG));
    await setPersistence(auth,browserLocalPersistence);
    await auth.authStateReady();
    if(isSignInWithEmailLink(auth,window.location.href)){
      let email='';
      try{email=localStorage.getItem(EMAIL_KEY)||'';}catch{}
      if(!email)email=window.prompt('Enter the email address used for the sign-in link:')||'';
      if(!email.trim()){status('Enter your email to finish verification.',true);return;}
      await signInWithEmailLink(auth,email.trim().toLowerCase(),window.location.href);
      try{localStorage.removeItem(EMAIL_KEY);}catch{}
      history.replaceState(null,'',window.location.pathname);
    }
    await verifyOwner();
  }catch(error){setWorkspace(false);status(error.message||'Creator authentication failed.',true);}
  finally{ui.send.disabled=false;}
}
void init();

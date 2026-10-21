import express from 'express';
import Busboy from 'busboy';
import { MongoClient, GridFSBucket, ObjectId } from 'mongodb';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { pipeline } from 'node:stream/promises';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
const PORT = Number(process.env.PORT || 10000);
const allowedOrigins = new Set((process.env.CORS_ORIGINS || 'https://badbunny.work,https://www.badbunny.work,https://deepak-portfolio-819w.onrender.com').split(',').map(s => s.trim()));
const SECRET = process.env.SESSION_SECRET || '';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const FIREBASE_PROJECT_ID = (process.env.FIREBASE_PROJECT_ID || '').trim();
const authConfigured = Boolean(process.env.MONGODB_URI && SECRET.length >= 32 && ADMIN_EMAIL && /^[a-z0-9-]{6,40}$/.test(FIREBASE_PROJECT_ID));
// The public Google Secure Token JWK set verifies Firebase ID tokens by signature.
// No service-account key is needed on Render. Firebase login links are sent client-side.
const firebaseKeys = createRemoteJWKSet(new URL('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'));
const MAX_UPLOAD = 100 * 1024 * 1024;
const PAYPAL_MODE = process.env.PAYPAL_MODE === 'live' ? 'live' : 'sandbox';
const PAYPAL_CLIENT_ID = process.env['PAYPAL_'+PAYPAL_MODE.toUpperCase()+'_CLIENT_ID'] || '';
const PAYPAL_CLIENT_SECRET = process.env['PAYPAL_'+PAYPAL_MODE.toUpperCase()+'_CLIENT_SECRET'] || '';
const PAYPAL_READY = Boolean(PAYPAL_CLIENT_ID && PAYPAL_CLIENT_SECRET);
// Payment creation and capture are explicitly disabled unless opted in.
// Real payments also require a second, independent live-approval switch.
const PAYMENTS_ENABLED = process.env.PAYMENTS_ENABLED === 'true';
const LIVE_PAYMENTS_APPROVED = process.env.PAYPAL_LIVE_APPROVED === 'true';
const checkoutEnabled = () => PAYMENTS_ENABLED && PAYPAL_READY &&
  dbStatus === 'connected' && (PAYPAL_MODE === 'sandbox' || LIVE_PAYMENTS_APPROVED);
function requireCheckoutEnabled(_req,res,next){
  if(!checkoutEnabled())return res.status(503).json({error:'Checkout is disabled while payment testing is being configured.'});
  next();
}
const PAYPAL_API = PAYPAL_MODE === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
const SITE_URL = 'https://badbunny.work';
const PRICE_CURRENCY = 'CAD';
const centsToPrice = cents => (cents/100).toFixed(2);
let paypalTokenCache = {token:'',until:0};
async function paypalAccessToken(){
  if(!PAYPAL_READY)throw new Error('PayPal Sandbox credentials are not yet configured.');
  if(paypalTokenCache.token && paypalTokenCache.until>Date.now()+30000)return paypalTokenCache.token;
  const auth=Buffer.from(PAYPAL_CLIENT_ID+':'+PAYPAL_CLIENT_SECRET).toString('base64');
  const response=await fetch(PAYPAL_API+'/v1/oauth2/token',{
    method:'POST',headers:{Authorization:'Basic '+auth,'Content-Type':'application/x-www-form-urlencoded'},
    body:'grant_type=client_credentials',signal:AbortSignal.timeout(14000)
  });
  if(!response.ok)throw new Error('PayPal rejected this '+PAYPAL_MODE+' app configuration ('+response.status+').');
  const data=await response.json();
  if(!data.access_token)throw new Error('PayPal did not issue an API access token.');
  paypalTokenCache={token:data.access_token,until:Date.now()+Math.max(60,Number(data.expires_in)||300)*1000};
  return data.access_token;
}
async function paypalAPI(method,path,body,idempotencyKey){
  const token=await paypalAccessToken();
  const headers={Authorization:'Bearer '+token,Accept:'application/json',Prefer:'return=representation'};
  if(body!==undefined)headers['Content-Type']='application/json';
  if(idempotencyKey)headers['PayPal-Request-Id']=idempotencyKey;
  const response=await fetch(PAYPAL_API+path,{
    method,headers,body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
    const error=new Error('PayPal '+method+' request failed ('+response.status+').');
    error.status=response.status;
    error.paypalName=typeof data.name==='string'?data.name:'';
    throw error;
  }
  return data;
}
const checkoutRates=new Map();
function limitCheckout(req,res,next){
  const ip=req.ip || 'unknown',now=Date.now();
  const item=checkoutRates.get(ip);
  const nextItem=!item||item.until<now?{n:1,until:now+600000}:{n:item.n+1,until:item.until};
  checkoutRates.set(ip,nextItem);
  if(checkoutRates.size>2500)for(const [key,val] of checkoutRates)if(val.until<now)checkoutRates.delete(key);
  if(nextItem.n>12)return res.status(429).json({error:'Too many checkout requests. Please wait ten minutes.'});
  next();
}

function parsePrice(raw){
  const normalized=String(raw ?? '');
  if(!/^(?:[1-9][0-9]{0,3}|0)[.][0-9]{2}$/.test(normalized)) return null;
  const cents=Math.round(Number(normalized)*100);
  return Number.isSafeInteger(cents)&&cents>=100&&cents<=100000?cents:null;
}
let dbStatus = 'connecting', users, bucket, files, orders, creativeRecords;
const sign = value => createHmac('sha256', SECRET).update(value).digest('hex');
const same = (a, b) => { const x = Buffer.from(a || ''); const y = Buffer.from(b || ''); return x.length === y.length && timingSafeEqual(x,y); };
const text = (v, max) => typeof v === 'string' ? v.trim().replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0,max) : '';
const isAdmin = user => Boolean(ADMIN_EMAIL && user?.email === ADMIN_EMAIL);
async function hasAccess(user,mediaId){
  if(isAdmin(user))return true;
  if(!user?.email||PAYPAL_MODE!=='live')return false;
  return Boolean(await orders.findOne({mediaId,buyerEmail:user.email,status:'COMPLETED',mode:'live'}));
}
const profile = user => ({ email:user.email, admin:isAdmin(user), hasAccess:isAdmin(user) });
const asyncRoute = fn => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);

app.use((req,res,next) => {
  res.set({'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Cache-Control':'no-store','X-Frame-Options':'DENY'});
  const origin = req.headers.origin;
  if (origin && allowedOrigins.has(origin)) {
    res.set({'Access-Control-Allow-Origin':origin,'Vary':'Origin','Access-Control-Allow-Methods':'GET,POST,DELETE,PATCH,OPTIONS','Access-Control-Allow-Headers':'Authorization,Content-Type'});
  }
  if (req.method === 'OPTIONS') return res.sendStatus(origin && !allowedOrigins.has(origin) ? 403 : 204);
  if (origin && !allowedOrigins.has(origin)) return res.status(403).json({error:'Origin not permitted.'});
  next();
});

app.use(express.json({limit:'64kb'}));
app.get('/api/health',(_req,res)=>res.json({ok:true,service:'portfolio-membership',database:dbStatus}));
app.get('/api/config',(_req,res)=>res.json({
  currency:PRICE_CURRENCY,paymentMode:'paypal-orders-v2',paypalConfigured:PAYPAL_READY&&dbStatus==='connected',paymentsEnabled:PAYMENTS_ENABLED,checkoutEnabled:checkoutEnabled(),
  paypalMode:PAYPAL_MODE,authProvider:'firebase-email-link',firebaseProjectId:FIREBASE_PROJECT_ID,
  authEnabled:authConfigured&&dbStatus==='connected',uploadsEnabled:authConfigured&&dbStatus==='connected',
  paymentVerificationEnabled:checkoutEnabled(),
  sandboxDoesNotUnlock:true
}));
function ready(_req,res,next){if(!authConfigured || dbStatus!=='connected') return res.status(503).json({error:'Membership setup is in progress.'});next();}
async function authorized(req,res,next){
  const header=req.get('authorization') || '';
  const match=/^Bearer ([A-Za-z0-9_-]+[.][A-Za-z0-9_-]+[.][A-Za-z0-9_-]+)$/.exec(header);
  if(!match||match[1].length>10000)return res.status(401).json({error:'Sign in to Creator Studio using your email link.'});
  try{
    const {payload}=await jwtVerify(match[1],firebaseKeys,{
      issuer:'https://securetoken.google.com/'+FIREBASE_PROJECT_ID,
      audience:FIREBASE_PROJECT_ID,algorithms:['RS256'],clockTolerance:5
    });
    const now=Math.floor(Date.now()/1000);
    const email=typeof payload.email==='string'?payload.email.trim().toLowerCase():'';
    if(payload.email_verified!==true||!email||!payload.sub||typeof payload.sub!=='string'){
      return res.status(403).json({error:'A verified Firebase email account is required.'});
    }
    if(!Number.isInteger(payload.iat)||payload.iat>now+5||
       !Number.isInteger(payload.auth_time)||payload.auth_time>now+5){
      return res.status(401).json({error:'Invalid or expired Firebase sign-in.'});
    }
    await users.updateOne({email},{$set:{firebaseUid:payload.sub,verifiedAt:new Date()},$setOnInsert:{createdAt:new Date()}},{upsert:true});
    req.user=await users.findOne({email});
    if(!req.user)return res.status(401).json({error:'Creator session unavailable.'});
    next();
  }catch(error){
    if(error?.code==='ERR_JWKS_TIMEOUT'||error?.code==='ERR_JWKS_NO_MATCHING_KEY'){
      console.warn('Firebase token verification:',error.code);
    }
    res.status(401).json({error:'Firebase sign-in expired or could not be verified. Please sign in again.'});
  }
}
function adminOnly(req,res,next){if(!isAdmin(req.user))return res.status(403).json({error:'Owner access only.'});next();}

app.get('/api/me',ready,asyncRoute(authorized),(req,res)=>res.json({user:profile(req.user)}));

// Creative interests publishing. Public read; writes require the verified creator.
const creativeKinds = new Set(['composition','music','meditation','question','activity']);
const creativeText = (v,max) => typeof v==='string'
  ? v.trim().replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').slice(0,max) : '';
const creativeDate = raw => {
  const value=String(raw||'');
  return /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value+'T12:00:00Z')) &&
    new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value?value:null;
};
// Only a calendar day in Toronto may be recorded; date-only keys avoid UTC rollover.
const torontoToday = () => {
  const parts = new Intl.DateTimeFormat('en-CA',{
    timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'
  }).formatToParts(new Date());
  const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
  return [p.year,p.month,p.day].join('-');
};
function creativeVideoURL(raw){
  try{
    const u=new URL(String(raw));
    if(u.protocol!=='https:'||u.username||u.password||u.port)return null;
    const host=u.hostname.toLowerCase();
    if(['www.youtube.com','youtube.com','m.youtube.com'].includes(host)){
      if(u.pathname==='/watch'&&!/^[a-zA-Z0-9_-]{6,20}$/.test(u.searchParams.get('v')||''))return null;
      if(u.pathname!=='/watch'&&!/^\/(shorts|live)\/[a-zA-Z0-9_-]{6,20}\/?$/.test(u.pathname))return null;
    }else if(host==='youtu.be'){
      if(!/^\/[a-zA-Z0-9_-]{6,20}\/?$/.test(u.pathname))return null;
    }else if(['instagram.com','www.instagram.com'].includes(host)){
      if(!/^\/(reel|p|tv)\/[a-zA-Z0-9_-]+\/?$/.test(u.pathname))return null;
    }else return null;
    u.hash='';
    return u.href;
  }catch{return null;}
}
function creativeDocument(input){
  const kind=String(input?.kind||'');
  if(!creativeKinds.has(kind))return {error:'Choose a valid creative category.'};
  if(kind==='activity'){
    const date=creativeDate(input?.date);
    const steps=input?.steps;
    const calories=input?.activeCalories;
    const goal=input?.goalSteps;
    if(!date)return {error:'Choose a valid calendar date (YYYY-MM-DD).'};
    if(date>torontoToday())return {error:'You cannot record a future day. Choose today or an earlier date in Toronto time.'};
    if(!Number.isSafeInteger(steps)||steps<0||steps>200000)
      return {error:'Steps must be a whole number between 0 and 200,000.'};
    if(calories!==undefined&&calories!==null&&
       (!Number.isSafeInteger(calories)||calories<0||calories>15000))
      return {error:'Active calories must be a whole number between 0 and 15,000, or left blank.'};
    if(goal!==undefined&&goal!==null&&
       (!Number.isSafeInteger(goal)||goal<1||goal>200000))
      return {error:'Step goal must be a whole number between 1 and 200,000, or left blank.'};
    return {record:{kind,date,steps,
      activeCalories:calories??null,goalSteps:goal??null}};
  }
  const title=creativeText(input?.title,150);
  if(!title)return {error:'Enter a title.'};
  if(kind==='music'||kind==='meditation'){
    const url=creativeVideoURL(input?.url);
    if(!url)return {error:'Provide a public Instagram Reel or YouTube video link.'};
    return {record:{kind,title,url}};
  }
  const body=creativeText(input?.body,6000);
  if(kind==='composition'&&!body)return {error:'Enter your original writing before publishing.'};
  return {record:{kind,title,body}};
}
const publicCreativeRecord = doc => ({
  id:doc._id.toHexString(),kind:doc.kind,title:doc.title||'',
  body:doc.body||'',url:doc.url||'',date:doc.date||'',
  steps:doc.kind==='activity'?doc.steps:undefined,
  activeCalories:doc.kind==='activity'?(doc.activeCalories??null):undefined,
  goalSteps:doc.kind==='activity'?(doc.goalSteps??null):undefined
});
app.get('/api/creative',asyncRoute(async(_req,res)=>{
  if(dbStatus!=='connected')return res.json({items:[],pending:true});
  const docs=await creativeRecords.find({published:true}).sort({updatedAt:-1}).limit(160).toArray();
  return res.json({items:docs.map(publicCreativeRecord)});
}));
app.get('/api/admin/creative',ready,asyncRoute(authorized),adminOnly,asyncRoute(async(_req,res)=>{
  const docs=await creativeRecords.find({published:true}).sort({updatedAt:-1}).limit(200).toArray();
  res.json({items:docs.map(publicCreativeRecord)});
}));
app.post('/api/admin/creative',ready,asyncRoute(authorized),adminOnly,asyncRoute(async(req,res)=>{
  const result=creativeDocument(req.body);
  if(result.error)return res.status(400).json({error:result.error});
  const record=result.record;
  const now=new Date();
  if(record.kind==='activity'){
    const item=await creativeRecords.findOneAndUpdate(
      {kind:'activity',date:record.date},
      {$set:{...record,published:true,updatedAt:now},
       $setOnInsert:{createdAt:now,createdBy:req.user.email}},
      {upsert:true,returnDocument:'after'}
    );
    return res.status(200).json({ok:true,item:publicCreativeRecord(item)});
  }
  const saved={...record,published:true,createdAt:now,updatedAt:now,createdBy:req.user.email};
  const resultInsert=await creativeRecords.insertOne(saved);
  res.status(201).json({ok:true,item:publicCreativeRecord({...saved,_id:resultInsert.insertedId})});
}));
app.patch('/api/admin/creative/:id',ready,asyncRoute(authorized),adminOnly,asyncRoute(async(req,res)=>{
  if(!ObjectId.isValid(req.params.id))return res.sendStatus(404);
  const _id=new ObjectId(req.params.id);
  const prior=await creativeRecords.findOne({_id,published:true});
  if(!prior)return res.sendStatus(404);
  const input={...req.body,kind:prior.kind};
  const result=creativeDocument(input);
  if(result.error)return res.status(400).json({error:result.error});
  if(prior.kind==='activity'&&prior.date!==result.record.date)
    return res.status(409).json({error:'Daily activity dates cannot be changed; create or update the other date.'});
  await creativeRecords.updateOne({_id},{$set:{...result.record,updatedAt:new Date()}});
  res.json({ok:true});
}));
app.delete('/api/admin/creative/:id',ready,asyncRoute(authorized),adminOnly,asyncRoute(async(req,res)=>{
  if(!ObjectId.isValid(req.params.id))return res.sendStatus(404);
  const result=await creativeRecords.deleteOne({_id:new ObjectId(req.params.id),published:true});
  if(!result.deletedCount)return res.sendStatus(404);
  res.json({ok:true});
}));



// Orders v2: prices are loaded only from published server-side media metadata.
// Never trust a browser-supplied amount, item label, currency, or checkout URL.
app.get('/api/paypal/health',asyncRoute(async(_req,res)=>{
  const summary={mode:PAYPAL_MODE,configured:PAYPAL_READY,database:dbStatus,
    paymentsEnabled:PAYMENTS_ENABLED,enabled:checkoutEnabled()};
  if(!PAYPAL_READY||dbStatus!=='connected')return res.json({...summary,connected:false});
  try{await paypalAccessToken();res.json({...summary,connected:true});}
  catch(error){res.json({...summary,connected:false,error:'PayPal credentials or network could not be verified.'});}
}));
app.post('/api/paypal/orders',ready,requireCheckoutEnabled,limitCheckout,asyncRoute(async(req,res)=>{
  if(!PAYPAL_READY)return res.status(503).json({error:'PayPal checkout is not configured yet.'});
  const mediaId=typeof req.body?.mediaId==='string'?req.body.mediaId:'';
  if(!ObjectId.isValid(mediaId))return res.status(400).json({error:'Invalid gallery item.'});
  const file=await files.findOne({_id:new ObjectId(mediaId),'metadata.published':true});
  if(!file)return res.status(404).json({error:'This gallery item is unavailable.'});
  const priceCents=Number.isInteger(file.metadata?.priceCents)?file.metadata.priceCents:null;
  if(!Number.isSafeInteger(priceCents)||priceCents<100||priceCents>100000)return res.status(422).json({error:'This gallery item does not have a valid price.'});
  const order=await paypalAPI('POST','/v2/checkout/orders',{
    intent:'CAPTURE',
    purchase_units:[{
      reference_id:mediaId,custom_id:mediaId,description:text(file.metadata?.title,100)||'Exclusive media',
      amount:{currency_code:PRICE_CURRENCY,value:centsToPrice(priceCents)}
    }],
    payment_source:{paypal:{experience_context:{
      brand_name:'BadBunny',user_action:'PAY_NOW',shipping_preference:'NO_SHIPPING',
      landing_page:PAYPAL_MODE==='sandbox'?'LOGIN':'NO_PREFERENCE',
      return_url:SITE_URL+'/checkout.html',cancel_url:SITE_URL+'/checkout.html?cancel=1'
    }}}
  },'create-'+randomUUID());
  const approve=order.links?.find(link=>link.rel==='payer-action'||link.rel==='approve');
  let url;
  try{url=new URL(approve?.href);}catch{}
  if(!order.id||!url||url.protocol!=='https:'||!['www.paypal.com','www.sandbox.paypal.com'].includes(url.hostname)){
    return res.status(502).json({error:'PayPal did not return a valid approval page.'});
  }
  await orders.insertOne({
    orderId:order.id,mediaId,priceCents,currency:PRICE_CURRENCY,mode:PAYPAL_MODE,
    status:'CREATED',createdAt:new Date(),updatedAt:new Date(),title:text(file.metadata?.title,100)
  });
  res.status(201).json({orderId:order.id,approvalUrl:url.href,mode:PAYPAL_MODE,
    amount:{currency:'CAD',value:centsToPrice(priceCents)}});
}));
app.post('/api/paypal/orders/:orderId/capture',ready,requireCheckoutEnabled,limitCheckout,asyncRoute(async(req,res)=>{
  const orderId=req.params.orderId;
  if(!/^[A-Z0-9]{10,32}$/.test(orderId))return res.status(400).json({error:'Invalid PayPal order.'});
  const record=await orders.findOne({orderId,mode:PAYPAL_MODE});
  if(!record)return res.status(404).json({error:'Order was not created by this gallery.'});
  if(record.status==='COMPLETED'){
    return res.json({ok:true,status:'COMPLETED',mode:record.mode,title:record.title,
      amount:centsToPrice(record.priceCents),accessAvailable:record.mode==='live'&&Boolean(record.buyerEmail)});
  }
  if(!PAYPAL_READY)return res.status(503).json({error:'PayPal checkout is unavailable.'});
  let capture;
  try{
    capture=await paypalAPI('POST','/v2/checkout/orders/'+orderId+'/capture',{},'capture-'+orderId);
  }catch(error){
    // If the first capture succeeded but the response was lost, GET the order
    // from PayPal and reconcile. Never claim success just from the return URL.
    if(error.status===422)capture=await paypalAPI('GET','/v2/checkout/orders/'+orderId);
    else throw error;
  }
  const unit=capture.purchase_units?.[0];
  const paid=unit?.payments?.captures?.find(item=>item.status==='COMPLETED');
  const payerEmail=(capture.payment_source?.paypal?.email_address||
     capture.payer?.email_address||'').toString().trim().toLowerCase();
  if(capture.id!==orderId||capture.status!=='COMPLETED'||!paid||
    paid.amount?.currency_code!==record.currency||
    paid.amount?.value!==centsToPrice(record.priceCents)||
    unit?.custom_id!==record.mediaId||!paid.id){
    return res.status(409).json({error:'Payment has not been verified as completed for this media item.'});
  }
  // Store the PayPal-verified capture only once, with its buyer identity.
  await orders.updateOne({orderId,mode:PAYPAL_MODE},{$set:{
    status:'COMPLETED',captureId:paid.id,buyerEmail:payerEmail,updatedAt:new Date(),paidAt:new Date()
  }});
  res.json({ok:true,status:'COMPLETED',mode:PAYPAL_MODE,title:record.title,
    amount:centsToPrice(record.priceCents),
    accessAvailable:PAYPAL_MODE==='live'&&Boolean(payerEmail)});
}));
app.get('/api/purchases',ready,asyncRoute(authorized),asyncRoute(async(req,res)=>{
  // Sandbox purchases can be inspected as tests but NEVER unlock paid files.
  const purchases=await orders.find({buyerEmail:req.user.email,status:'COMPLETED'})
    .sort({paidAt:-1}).limit(100).toArray();
  res.json({items:purchases.map(order=>({
    mediaId:order.mediaId,title:order.title,priceCents:order.priceCents,
    currency:order.currency,mode:order.mode,purchasedAt:order.paidAt,
    accessible:order.mode==='live'&&PAYPAL_MODE==='live'
  }))});
}));

// Public catalog exposes only safe labels, never media bytes or download URLs.
app.get('/api/gallery',asyncRoute(async(_req,res)=>{
  if(dbStatus!=='connected')return res.json({items:[],pending:true});
  const docs=await files.find({'metadata.published':true}).project({contentType:1,metadata:1,uploadDate:1}).sort({uploadDate:-1}).limit(100).toArray();
  res.json({items:docs.map(f=>({id:f._id.toHexString(),title:f.metadata?.title||'Untitled',description:f.metadata?.description||'',priceCents:Number.isInteger(f.metadata?.priceCents)?f.metadata.priceCents:1000,currency:'CAD',type:f.contentType||'application/octet-stream'}))});
}));
app.get('/api/media',ready,asyncRoute(authorized),adminOnly,asyncRoute(async(_req,res)=>{
  const docs=await files.find({'metadata.published':true}).project({filename:1,contentType:1,length:1,metadata:1,uploadDate:1}).sort({uploadDate:-1}).limit(100).toArray();
  res.json({items:docs.map(f=>({id:f._id.toHexString(),title:f.metadata?.title||'Untitled',description:f.metadata?.description||'',priceCents:Number.isInteger(f.metadata?.priceCents)?f.metadata.priceCents:1000,currency:'CAD',type:f.contentType||'application/octet-stream',uploadedAt:f.uploadDate}))});
}));
const mediaSign=(id,user,exp)=>sign(id+':'+user+':'+exp);
app.post('/api/media/:id/ticket',ready,asyncRoute(authorized),asyncRoute(async(req,res)=>{
  if(!ObjectId.isValid(req.params.id))return res.sendStatus(404);
  const file=await files.findOne({_id:new ObjectId(req.params.id),'metadata.published':true});
  if(!file)return res.sendStatus(404);
  if(!await hasAccess(req.user,req.params.id))return res.status(403).json({error:'You do not have access to this item.'});
  const user=req.user._id.toHexString(),expires=Date.now()+600000;
  const ticket=user+'.'+expires+'.'+mediaSign(req.params.id,user,expires);
  res.json({url:req.protocol+'://'+req.get('host')+'/api/media/'+req.params.id+'/file?ticket='+encodeURIComponent(ticket)});
}));
app.get('/api/media/:id/file',ready,asyncRoute(async(req,res)=>{
  const id=req.params.id;
  if(!ObjectId.isValid(id))return res.sendStatus(404);
  const [uid,expRaw,signature]=String(req.query.ticket||'').split('.');
  const exp=Number(expRaw);
  if(!ObjectId.isValid(uid||'')||!Number.isSafeInteger(exp)||exp<Date.now()||exp>Date.now()+610000||!same(signature,mediaSign(id,uid,exp)))return res.sendStatus(401);
  const [user,file]=await Promise.all([users.findOne({_id:new ObjectId(uid)}),files.findOne({_id:new ObjectId(id),'metadata.published':true})]);
  if(!await hasAccess(user,id))return res.sendStatus(403);
  if(!file)return res.sendStatus(404);
  const length=file.length,range=req.headers.range;
  let start=0,end=length-1;
  if(range){
    const m=/^bytes=(\d*)-(\d*)$/.exec(range);
    if(!m||(!m[1]&&!m[2])){res.set('Content-Range','bytes */'+length);return res.sendStatus(416);}
    if(!m[1]){const size=Number(m[2]);if(!Number.isSafeInteger(size)||size<=0)return res.sendStatus(416);start=Math.max(0,length-size);}
    else {start=Number(m[1]);if(m[2])end=Number(m[2]);}
    if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>=length||end<start){res.set('Content-Range','bytes */'+length);return res.sendStatus(416);}
    end=Math.min(end,length-1);
    res.status(206).set('Content-Range','bytes '+start+'-'+end+'/'+length);
  }
  res.set({'Content-Type':file.contentType||'application/octet-stream','Content-Length':String(end-start+1),'Accept-Ranges':'bytes','Content-Disposition':'inline','Cross-Origin-Resource-Policy':'cross-origin'});
  bucket.openDownloadStream(file._id,{start,end:end+1}).on('error',e=>{console.error('Media stream error',e.message);res.destroy(e);}).pipe(res);
}));

app.post('/api/admin/upload',ready,asyncRoute(authorized),adminOnly,asyncRoute(async(req,res)=>{
  if(!String(req.headers['content-type']||'').startsWith('multipart/form-data;'))return res.status(415).json({error:'Choose a file.'});
  const form=Busboy({headers:req.headers,limits:{fileSize:MAX_UPLOAD,files:1,fields:4,fieldSize:1000}});
  const fields={};
  let uploadId=null,uploadTask=null,error=null,count=0;
  form.on('field',(name,value)=>{fields[name]=value;});
  form.on('file',(_name,stream,info)=>{
    count++;
    const mime=info.mimeType.toLowerCase();
    if(!['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime'].includes(mime)){error='Unsupported file type.';stream.resume();return;}
    const out=bucket.openUploadStream(text(info.filename,120)||'upload',{contentType:mime,metadata:{published:false}});
    uploadId=out.id;
    stream.on('limit',()=>{error='File exceeds 100 MB.';stream.unpipe(out);stream.resume();out.destroy(new Error('Too large'));});
    uploadTask=pipeline(stream,out).catch(e=>{error=error||e.message;});
  });
  form.on('filesLimit',()=>{error='One file at a time.';});
  const done=new Promise((resolve,reject)=>{form.on('finish',resolve);form.on('error',reject);});
  req.pipe(form);
  await done;
  if(uploadTask)await uploadTask;
  if(error||!uploadId||count!==1){
    if(uploadId)await bucket.delete(uploadId).catch(()=>{});
    return res.status(400).json({error:error||'No file provided.'});
  }
  const title=text(fields.title,100);
  const priceRaw=String(fields.price||'');
  const priceCents=parsePrice(priceRaw);
  if(!Number.isSafeInteger(priceCents)||priceCents<100||priceCents>100000){await bucket.delete(uploadId);return res.status(400).json({error:'Enter a price between CA$1.00 and CA$1000.00.'});}
  if(!title){await bucket.delete(uploadId);return res.status(400).json({error:'A title is required.'});}
  await files.updateOne({_id:uploadId},{$set:{metadata:{title,description:text(fields.description,500),priceCents,published:true,uploadedBy:req.user._id.toHexString()}}});
  res.status(201).json({ok:true,id:uploadId.toHexString()});
}));
app.patch('/api/admin/media/:id',ready,asyncRoute(authorized),adminOnly,asyncRoute(async(req,res)=>{
  if(!ObjectId.isValid(req.params.id))return res.sendStatus(404);
  const title=text(req.body?.title,100),description=text(req.body?.description,500);
  const priceCents=parsePrice(req.body?.price);
  if(!title)return res.status(400).json({error:'A title is required.'});
  if(priceCents===null)return res.status(400).json({error:'Enter a price from CA$1.00 to CA$1000.00, with two decimals.'});
  const changed=await files.updateOne({_id:new ObjectId(req.params.id),'metadata.published':true},{$set:{
    'metadata.title':title,'metadata.description':description,'metadata.priceCents':priceCents
  }});
  if(!changed.matchedCount)return res.sendStatus(404);
  res.json({ok:true});
}));
app.delete('/api/admin/media/:id',ready,asyncRoute(authorized),adminOnly,asyncRoute(async(req,res)=>{
  if(!ObjectId.isValid(req.params.id))return res.sendStatus(404);
  const id=new ObjectId(req.params.id);
  if(!await files.findOne({_id:id}))return res.sendStatus(404);
  await bucket.delete(id);
  res.json({ok:true});
}));

app.use((err,_req,res,_next)=>{console.error('Membership API failed:',err?.message);if(!res.headersSent)res.status(500).json({error:'Request failed. Try again.'});});

async function connectDatabase(){
  if(!process.env.MONGODB_URI){dbStatus='not-configured';return;}
  try{
    const connection=new MongoClient(process.env.MONGODB_URI,{serverSelectionTimeoutMS:7000,maxPoolSize:10});
    await connection.connect();
    const db=connection.db(process.env.MONGODB_DB||'badbunny_membership');
    users=db.collection('members');orders=db.collection('paypal_orders');
    creativeRecords=db.collection('creative_entries');
    bucket=new GridFSBucket(db,{bucketName:'media'});files=db.collection('media.files');
    await Promise.all([
      users.createIndex({email:1},{unique:true}),
      orders.createIndex({orderId:1},{unique:true}),orders.createIndex({buyerEmail:1,mode:1,status:1,mediaId:1}),
      creativeRecords.createIndex({kind:1,date:1},{unique:true,partialFilterExpression:{kind:'activity'}}),
      creativeRecords.createIndex({published:1,updatedAt:-1})
    ]);
    dbStatus='connected';
  }catch(e){dbStatus='unavailable';console.error('MongoDB setup:',e.message);}
}
app.listen(PORT,'0.0.0.0',()=>console.log('Membership API listening:',PORT));
await connectDatabase();
console.log('Startup health:', {database:dbStatus, paypalMode:PAYPAL_MODE, configured:PAYPAL_READY, paymentsEnabled:PAYMENTS_ENABLED, checkoutEnabled:checkoutEnabled()});
// Log only environment VARIABLE NAMES and Boolean presence, NEVER credential values.
// Useful to identify a wrong Render service or mismatched key names.
console.log('PayPal env diagnostics:',JSON.stringify({
  service:'badbunny-membership-api',
  expected:{
    PAYPAL_MODE:PAYPAL_MODE,
    PAYPAL_SANDBOX_CLIENT_ID:Boolean(process.env.PAYPAL_SANDBOX_CLIENT_ID?.trim()),
    PAYPAL_SANDBOX_CLIENT_SECRET:Boolean(process.env.PAYPAL_SANDBOX_CLIENT_SECRET?.trim()),
    PAYMENTS_ENABLED:process.env.PAYMENTS_ENABLED||'(unset)'
  },
  existingKeys:Object.keys(process.env).filter(key=>/^(?:PAYPAL|PAYMENT)/i.test(key)).sort()
}));
if(PAYPAL_READY)paypalAccessToken().then(()=>console.log('PayPal API authenticated')).catch(error=>console.warn('PayPal API credential check failed:',error.message));

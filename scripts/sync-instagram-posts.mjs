#!/usr/bin/env node
/**
 * Authorized Instagram -> Portfolio public editorial catalog.
 * Requires a professional Instagram account token with instagram_business_basic.
 * This script runs in GitHub Actions. Never put tokens in public site assets.
 */
import {readFile,writeFile} from 'node:fs/promises';
const path=new URL('../portfolio-site/instagram-posts.json',import.meta.url);
const token=(process.env.INSTAGRAM_ACCESS_TOKEN||'').trim();
const graphVersion=process.env.INSTAGRAM_GRAPH_VERSION||'v24.0';
const maxPages=3; // Up to 300 recent entries, bounded request volume.
const allowed=/^https:\/\/graph\.instagram\.com\//;
const safeLink=value=>{
  try{
    const url=new URL(value);
    return url.protocol==='https:'&&['www.instagram.com','instagram.com'].includes(url.hostname)
      &&/^\/(p|reel)\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname)?url.href:null;
  }catch{return null;}
};
const safeMedia=value=>{
  try{
    const u=new URL(value);
    return u.protocol==='https:'&&/(?:^|\.)cdninstagram\.com$|(?:^|\.)fbcdn\.net$/.test(u.hostname)?u.href:'';
  }catch{return '';}
};
export function normalize(entry){
  const link=safeLink(entry.permalink);
  if(!link)return null;
  const id=link.match(/\/(?:p|reel)\/([A-Za-z0-9_-]+)/)?.[1];
  if(!id)return null;
  return {
    id,permalink:link,caption:String(entry.caption||'').slice(0,5500),
    mediaType:['IMAGE','VIDEO','CAROUSEL_ALBUM'].includes(entry.media_type)?entry.media_type:'UNKNOWN',
    mediaUrl:safeMedia(entry.media_url),thumbnailUrl:safeMedia(entry.thumbnail_url),
    timestamp:/^\d{4}-\d{2}-\d{2}T/.test(String(entry.timestamp||''))?entry.timestamp:'',
    origin:'instagram-api',captionStatus:String(entry.caption||'').trim()?'synced':'empty'
  };
}
export function mergePosts(existing,incoming){
  const byId=new Map();
  // API first when authorized, but keep seed/previous posts not in the latest 300.
  [...incoming,...existing].forEach(post=>{
    if(post?.id&&!byId.has(post.id)&&safeLink(post.permalink))byId.set(post.id,post);
  });
  return [...byId.values()].sort((a,b)=>(b.timestamp||'').localeCompare(a.timestamp||''));
}
async function main(){
  const existing=JSON.parse(await readFile(path,'utf8'));
  if(!token){
    console.log('SKIPPED: INSTAGRAM_ACCESS_TOKEN is not configured. Existing post catalog preserved.');
    return;
  }
  let url='https://graph.instagram.com/'+graphVersion+'/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=100';
  const entries=[];
  for(let page=0;page<maxPages&&url;page++){
    if(!allowed.test(url))throw Error('Instagram response pagination URL is not approved');
    const response=await fetch(url,{headers:{Authorization:'Bearer '+token,Accept:'application/json'},signal:AbortSignal.timeout(15000)});
    if(!response.ok)throw Error('Instagram API returned HTTP '+response.status);
    const payload=await response.json();
    if(!Array.isArray(payload.data))throw Error('Malformed Instagram API response');
    entries.push(...payload.data);
    url=typeof payload.paging?.next==='string'?payload.paging.next:'';
  }
  const posts=mergePosts(existing.posts||[],entries.map(normalize).filter(Boolean));
  const updated={version:1,updatedAt:new Date().toISOString(),source:'instagram-api',posts};
  const after=JSON.stringify(updated,null,2)+'\n';
  // Only write when new post information changed; avoid commits for timestamps alone.
  const currentPosts=JSON.stringify(existing.posts||[]);
  if(currentPosts===JSON.stringify(posts)){console.log('No new/changed Instagram posts.');return;}
  await writeFile(path,after);
  console.log('Synced '+entries.length+' Instagram entries, catalog has '+posts.length+' posts.');
}
if(process.argv[1]&&import.meta.url.endsWith(process.argv[1].replaceAll('\\','/')))main().catch(e=>{console.error(e.message);process.exitCode=1;});

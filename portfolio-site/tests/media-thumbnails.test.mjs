import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';

const root=new URL('../',import.meta.url);
const source=readFileSync(new URL('media-thumbnail.js',root),'utf8');
const popup=readFileSync(new URL('beyond.js',root),'utf8');
const creative=readFileSync(new URL('creative.js',root),'utf8');
const html=readFileSync(new URL('index.html',root),'utf8');
const css=readFileSync(new URL('media-thumbnail.css',root),'utf8');
const manifest=JSON.parse(readFileSync(new URL('creative-posts.json',root),'utf8'));
const tick=()=>new Promise(resolve=>setImmediate(resolve));

class Element{
  constructor(tag='div'){
    this.tag=tag;this.children=[];this.events=new Map();this.dataset={};
    this.attrs={};this.className='';this.textContent='';this.style={};
    this.open=false;this.hidden=false;this.scrollTop=0;
  }
  addEventListener(type,listener){this.events.set(type,listener);}
  fire(type,event={}){this.events.get(type)?.(event);}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=nodes;}
  remove(){this.removed=true;}
  setAttribute(name,value){this.attrs[name]=String(value);}
  getBoundingClientRect(){return {left:0,top:0,width:240,height:300};}
  showModal(){this.open=true;}
  focus(){}
}
const flatten=node=>[node,...node.children.flatMap(flatten)];
function setup(){
  const buttons=['music','movement','presence','questions'].map(interest=>{
    const b=new Element('button');b.dataset.interest=interest;return b;
  });
  const panel=new Element('dialog');
  const body=new Element('div');
  const close=new Element('button');
  const elements={
    'beyond-detail':panel,'beyond-detail-content':body,'beyond-close':close,
    'beyond-detail-index':new Element(),'beyond-detail-title':new Element(),
    'beyond-detail-description':new Element()
  };
  const context={
    document:{
      createElement:tag=>new Element(tag),
      querySelectorAll:()=>buttons,
      getElementById:id=>elements[id],
      body:{classList:{add(){},remove(){}}}
    },
    window:{matchMedia:()=>({matches:true})},
    URL,Intl,Date,Promise,Map,Set,Object,Number
  };
  vm.runInNewContext(source,context);
  return {context,buttons,body,panel};
}

test('shared thumbnail uses correct existing covers for every catalog video',()=>{
  const {context}=setup();
  const covers=manifest.items.filter(x=>x.cover);
  const videos=manifest.items.filter(x=>x.category==='music');
  assert.equal(covers.length,6);
  assert.equal(videos.length,6);
  for(const item of manifest.items){
    const media=context.window.PortfolioMedia.describe(item);
    assert.ok(media,item.title);
    if(item.provider==='youtube'){
      assert.match(media.cover,/^https:\/\/i\.ytimg\.com\/vi\/[A-Za-z0-9_-]{11}\/hqdefault\.jpg$/);
    }else{
      assert.equal(media.cover,item.cover);
      assert.ok(media.cover?.startsWith('media/reels/'));
    }
    const stage=context.window.PortfolioMedia.thumbnail(item);
    assert.ok(stage,item.title);
    const image=flatten(stage).find(n=>n.tag==='img');
    assert.equal(image?.src,item.cover||media.cover);
    assert.equal(image?.loading,'lazy');
    assert.equal(image?.alt,'');
    assert.equal(flatten(stage).find(n=>n.className==='media-thumbnail-provider')?.textContent,
      item.provider.toUpperCase());
  }
});

test('cover paths cannot point to external, unrelated, or unsafe assets',()=>{
  const {context}=setup();
  const sample=manifest.items.find(x=>x.provider==='instagram');
  for(const cover of ['https://evil.example/img.jpg','../private.jpg','media/reels/not-the-id.jpg',
    'media/reels/'+sample.url.split('/')[4]+'.svg']){
    const media=context.window.PortfolioMedia.describe({...sample,cover});
    assert.equal(media.cover,null);
  }
  for(const url of ['javascript:alert(1)','https://fakeinstagram.com/reel/test/',
    'https://instagram.com.evil.com/reel/test/',
    'https://youtube.com.evil.com/watch?v=VAUABrdYU6U']){
    assert.equal(context.window.PortfolioMedia.describe({url}),null);
  }
});

test('missing or failed Instagram cover uses a deliberate fallback; does not break card',()=>{
  const {context}=setup();
  const item={url:'https://www.instagram.com/reel/EXAMPLEid123/',title:'Creator recording'};
  const stage=context.window.PortfolioMedia.thumbnail(item);
  assert.equal(stage.dataset.fallback,'true');
  assert.equal(flatten(stage).some(n=>n.tag==='img'),false);
  const youtube=manifest.items.find(x=>x.provider==='youtube');
  const youtubeThumb=context.window.PortfolioMedia.thumbnail(youtube);
  const img=flatten(youtubeThumb).find(n=>n.tag==='img');
  img.fire('error');
  assert.equal(img.removed,true);
  assert.equal(youtubeThumb.dataset.fallback,'true');
});

test('Rhythm popup uses real Instagram and YouTube covers from the shared catalog',async()=>{
  const {context,buttons,body}=setup();
  context.fetch=async url=>({ok:true,json:async()=>url==='creative-posts.json'?manifest:{items:[]}});
  vm.runInNewContext(popup,context);
  await tick();
  buttons[0].fire('click');
  const nodes=flatten(body);
  const thumbs=nodes.filter(n=>n.className==='beyond-media-thumb');
  const images=nodes.filter(n=>n.tag==='img');
  assert.equal(thumbs.length,6);
  assert.equal(images.length,6);
  for(const music of manifest.items.filter(x=>x.category==='music')){
    assert.ok(images.some(img=>img.src===(music.cover||context.window.PortfolioMedia.describe(music).cover)),music.title);
  }
});

test('shared media component is registered before pop-up and editorial card renderers',()=>{
  assert.match(html,/src="media-thumbnail\.js\?v=shared-1" defer/);
  assert.ok(html.indexOf('media-thumbnail.js?v=shared-1')<html.indexOf('beyond.js?v=shared-thumbs-1'));
  assert.match(popup,/window\.PortfolioMedia\?\.thumbnail/);
  assert.match(creative,/window\.PortfolioMedia\?\.describe/);
  assert.match(css,/\.media-thumbnail-image/);
  assert.match(css,/\.beyond-media-thumb::after\{content:none/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

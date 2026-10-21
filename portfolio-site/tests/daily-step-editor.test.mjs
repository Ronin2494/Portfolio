import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';

const source=readFileSync(new URL('../creative-editor.js',import.meta.url),'utf8')
  .replace(/^import .+;\n/gm,'').replace(/void init\(\);\s*$/,'');

class Element{
  constructor(id=''){
    this.id=id;this.dataset={};this.listeners=new Map();this.hidden=false;
    this.value='';this.disabled=false;this.required=false;this.readOnly=false;
    this.textContent='';this.children=[];this.max='';this.className='';
  }
  addEventListener(type,fn){this.listeners.set(type,fn);}
  async fire(type,event={}){const fn=this.listeners.get(type);if(fn)return fn({preventDefault(){},...event});}
  setAttribute(key,value){this[key]=String(value);}
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=children;}
  reset(){}
  scrollIntoView(){}
  focus(){}
}
const localDay=()=>{
  const d=new Intl.DateTimeFormat('en-CA',{
    timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'
  }).formatToParts(new Date());
  const parts=Object.fromEntries(d.map(x=>[x.type,x.value]));
  return [parts.year,parts.month,parts.day].join('-');
};
const yesterday=key=>new Date(new Date(key+'T12:00:00Z').getTime()-86400000).toISOString().slice(0,10);

function mount(){
  const elements=new Map();
  const ids=['editor-status','editor-login','editor-login-form','editor-email','editor-send',
    'editor-workspace','editor-user','creative-form','entry-kind','entry-title','entry-body',
    'entry-url','entry-date','entry-steps','entry-calories','entry-goal',
    'activity-day-status','activity-today','activity-yesterday','editor-text-fields',
    'editor-body-fields','editor-url-fields','editor-activity-fields','editor-submit',
    'editor-cancel','editor-items','editor-empty','editor-refresh','editor-logout'];
  ids.forEach(id=>elements.set(id,new Element(id)));
  const calls=[];
  const document={
    getElementById:id=>elements.get(id),
    createElement:tag=>new Element(tag)
  };
  const fetch=async(url,options={})=>{
    calls.push({url,options,payload:options.body?JSON.parse(options.body):null});
    return {ok:true,json:async()=>url.endsWith('/api/admin/creative')&&options.method==='GET'
      ?{items:[]}:{ok:true}};
  };
  const sandbox={
    document,window:{confirm:()=>true,location:{origin:'https://badbunny.work'}},
    fetch,Intl,Date,Object,Number,Error,Promise,AbortSignal
  };
  const controller=vm.runInNewContext(source+\`\n({
    activate(){verified=true;auth={currentUser:{getIdToken:async()=>'test-token'}};},
    setEntries(items){entries=items;hydrateDay();renderLibrary();},
    startEdit,resetForm,hydrateDay
  })\`,sandbox);
  const ui=id=>elements.get(id);
  return {ui,calls,controller};
}

test('the owner can save zero or positive steps without active calories',async()=>{
  const m=mount();
  m.controller.activate();
  m.ui('entry-kind').value='activity';
  await m.ui('entry-kind').fire('change');
  assert.equal(m.ui('entry-calories').required,false);
  assert.equal(m.ui('entry-steps').required,true);
  assert.equal(m.ui('editor-submit').textContent,'SAVE DAILY STEPS ↗');
  assert.equal(m.ui('entry-date').max,localDay());
  m.ui('entry-steps').value='0';
  m.ui('entry-calories').value='';
  m.ui('entry-goal').value='10000';
  await m.ui('creative-form').fire('submit');
  const post=m.calls.find(x=>x.options.method==='POST');
  assert.ok(post);
  assert.equal(post.payload.steps,0);
  assert.equal(post.payload.activeCalories,null);
  assert.equal(post.payload.goalSteps,10000);
  assert.equal(post.payload.date,localDay());
  assert.equal(post.options.headers.Authorization,'Bearer test-token');
  assert.match(m.ui('editor-status').textContent,/Daily steps saved/);
});

test('choosing a previously recorded date prefills it and updates the same day',async()=>{
  const m=mount();
  m.controller.activate();
  m.ui('entry-kind').value='activity';
  await m.ui('entry-kind').fire('change');
  const day=yesterday(localDay());
  m.controller.setEntries([{id:'existing-1',kind:'activity',date:day,steps:8500,activeCalories:null,goalSteps:9000}]);
  await m.ui('activity-yesterday').fire('click');
  assert.equal(m.ui('entry-date').value,day);
  assert.equal(m.ui('entry-steps').value,8500);
  assert.equal(m.ui('entry-calories').value,'');
  assert.equal(m.ui('entry-goal').value,9000);
  assert.match(m.ui('activity-day-status').textContent,/Recorded day found/);
  m.ui('entry-steps').value='9100';
  m.ui('entry-calories').value='0';
  await m.ui('creative-form').fire('submit');
  const post=m.calls.find(x=>x.options.method==='POST');
  assert.equal(post.payload.date,day);
  assert.equal(post.payload.steps,9100);
  assert.equal(post.payload.activeCalories,0);
});

test('explicit library edit uses PATCH and prevents changing the recorded date',async()=>{
  const m=mount();
  m.controller.activate();
  const day=yesterday(localDay());
  const item={id:'existing-2',kind:'activity',date:day,steps:7300,activeCalories:230,goalSteps:8000};
  m.controller.setEntries([item]);
  m.controller.startEdit(item);
  assert.equal(m.ui('entry-date').disabled,true);
  assert.equal(m.ui('activity-yesterday').disabled,true);
  assert.equal(m.ui('entry-steps').value,7300);
  m.ui('entry-steps').value='7800';
  await m.ui('creative-form').fire('submit');
  const patch=m.calls.find(x=>x.options.method==='PATCH');
  assert.equal(patch.url.endsWith('/api/admin/creative/existing-2'),true);
  assert.equal(patch.payload.steps,7800);
  assert.equal(patch.payload.date,day);
  assert.equal(m.ui('entry-date').disabled,false);
});

test('invalid, future, and missing step values never reach the API',async()=>{
  const m=mount();
  m.controller.activate();
  m.ui('entry-kind').value='activity';
  await m.ui('entry-kind').fire('change');
  for(const [steps,calories,goal] of [
    ['', '', ''],['1.1','',''],['1e3','',''],['-1','',''],
    ['200001','',''],['2000','bad',''],['2000','','0'],['2000','','1.5']
  ]){
    m.ui('entry-date').value=localDay();
    m.ui('entry-steps').value=steps;
    m.ui('entry-calories').value=calories;
    m.ui('entry-goal').value=goal;
    await m.ui('creative-form').fire('submit');
    assert.equal(m.calls.length,0,'invalid input made a request');
    assert.equal(m.ui('editor-status').dataset.error,'true');
  }
  m.ui('entry-date').value='9999-12-31';
  m.ui('entry-steps').value='50';m.ui('entry-goal').value='';
  await m.ui('creative-form').fire('submit');
  assert.equal(m.calls.length,0);
  assert.match(m.ui('editor-status').textContent,/Choose today or an earlier/);
});

test('an unauthenticated visitor cannot submit activity',async()=>{
  const m=mount();
  m.ui('entry-kind').value='activity';
  await m.ui('entry-kind').fire('change');
  m.ui('entry-steps').value='9000';
  await m.ui('creative-form').fire('submit');
  assert.equal(m.calls.length,0);
});

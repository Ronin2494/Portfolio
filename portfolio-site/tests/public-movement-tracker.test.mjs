import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import vm from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=readFileSync(new URL('../movement-tracker.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../movement-tracker.css',import.meta.url),'utf8');
const main=readFileSync(new URL('../beyond.js',import.meta.url),'utf8');

class Element {
  constructor(tag='div'){
    this.tag=tag;
    this.children=[];
    this.listeners={};
    this.dataset={};
    this.attrs={};
    this.style={values:{},setProperty:(k,v)=>{this.style.values[k]=v;}};
    this.hidden=false;
    this.textContent='';
    this.value='';
  }
  append(...items){this.children.push(...items);}
  replaceChildren(...items){this.children=items;}
  setAttribute(name,value){this.attrs[name]=String(value);}
  addEventListener(event,fn){this.listeners[event]=fn;}
  fire(event,payload={}){this.listeners[event]?.({preventDefault(){},...payload});}
}

const walk=(node)=>[node,...node.children.flatMap(walk)];
const find=(node,id)=>walk(node).find(x=>x.id===id);
const cls=(node,name)=>walk(node).filter(x=>x.className?.split(/\s+/).includes(name));

function mount(storage=new Map(),options={}){
  const localStorage={
    getItem(k){return storage.get(k)||null;},
    setItem(k,value){if(options.throwOnSave)throw Error('Storage denied');storage.set(k,value);}
  };
  const context={
    document:{createElement:tag=>new Element(tag)},
    window:{localStorage,confirm:()=>options.confirmDelete!==false},
    Intl,Date,Number,Map,Set,Object,JSON,Error
  };
  vm.runInNewContext(source,context);
  const tracker=context.window.PortfolioMovement;
  const root=tracker.render();
  const node=id=>find(root,id);
  const fill=(id,value)=>{node(id).value=value;};
  const fire=(id,ev,payload)=>node(id).fire(ev,payload);
  const values=(name)=>cls(root,name);
  return {tracker,root,node,fill,fire,values,storage};
}

test('Movement card exposes tracker directly, in the existing animated bubble',()=>{
  assert.match(html,/data-interest="movement" aria-expanded="false" aria-controls="beyond-detail"/);
  assert.match(html,/RECORD DAILY ACTIVITY/);
  assert.match(html,/movement-tracker\.css\?v=/);
  assert.match(html,/movement-tracker\.js\?v=[^"]+" defer/);
  const scripts=[...html.matchAll(/<script\s+src="([^"]+)"\s+defer><\/script>/g)]
    .map(match=>match[1].split('?')[0]);
  assert.ok(scripts.indexOf('movement-tracker.js')>=0&&
    scripts.indexOf('movement-tracker.js')<scripts.indexOf('beyond.js'),
    'public recorder loads before bubble renderer');
  assert.match(main,/window\.PortfolioMovement\?\.render/);
  assert.match(main,/if\(active&&!\(active==='movement'/);
  assert.doesNotMatch(source,/fetch\(|XMLHttpRequest|\/api\/admin\//);
});

test('visitor records steps without login and sees them immediately',()=>{
  const storage=new Map();
  const a=mount(storage);
  const today=a.tracker.today();
  a.fill('movement-steps','8500');
  a.fill('movement-calories','320');
  a.fill('movement-goal','10000');
  a.fire('movement-log-form','submit');
  const record=a.tracker.read()[0];
  assert.equal(record.date,today);
  assert.equal(record.steps,8500);
  assert.equal(record.activeCalories,320);
  assert.equal(record.goalSteps,10000);
  assert.equal(a.values('movement-steps-card')[0].children[1].textContent,'8,500');
  assert.equal(a.values('movement-goal-meter')[0].value,8500);
  assert.match(a.node('movement-log-form').children.at(-1).textContent,/Saved 8,500 steps/);
  const anotherVisit=mount(storage);
  assert.equal(anotherVisit.values('movement-steps-card')[0].children[1].textContent,'8,500');
});

test('recording the same day replaces rather than duplicates entries',()=>{
  const a=mount();
  a.fill('movement-steps','1200');
  a.fire('movement-log-form','submit');
  a.fill('movement-steps','2300');
  a.fire('movement-log-form','submit');
  assert.equal(a.tracker.read().length,1);
  assert.equal(a.tracker.read()[0].steps,2300);
  assert.equal(a.values('movement-steps-card')[0].children[1].textContent,'2,300');
});

test('today and yesterday shortcuts, dates and a logged zero remain distinct',()=>{
  const a=mount();
  const yesterday=a.tracker.shiftDay(a.tracker.today(),-1);
  a.fire('movement-day','change',{});
  a.fire('movement-log-form','submit');
  assert.equal(a.tracker.read().length,0);
  a.fire('movement-day','change',{});
  a.fire('movement-yesterday','click');
  assert.equal(a.node('movement-day').value,yesterday);
  a.fill('movement-steps','0');
  a.fire('movement-log-form','submit');
  assert.equal(a.tracker.read()[0].steps,0);
  assert.equal(a.values('movement-summary-feature')[0].children[1].textContent,'0');
  assert.equal(a.values('movement-graph-day').filter(x=>x.dataset.zero==='true').length,1);
  assert.equal(a.values('movement-graph-day').filter(x=>x.dataset.missing==='true').length,6);
  a.fire('movement-today','click');
  assert.equal(a.node('movement-day').value,a.tracker.today());
});

test('weekly totals and averages exclude missing days but count recorded zero',()=>{
  const a=mount();
  const today=a.tracker.today();
  for(const [daysAgo,steps] of [[2,0],[1,2500],[0,8000]]){
    a.node('movement-day').value=a.tracker.shiftDay(today,-daysAgo);
    a.fill('movement-steps',String(steps));
    a.fire('movement-log-form','submit');
  }
  const list=a.values('movement-summary-grid')[0];
  const metrics=cls(list,'movement-metric-value').map(x=>x.textContent);
  assert.deepEqual(metrics,['10,500','3,500','3 / 7']);
  assert.equal(a.values('movement-graph-day').filter(x=>x.dataset.missing==='true').length,4);
  assert.equal(a.values('movement-graph-day').filter(x=>x.dataset.zero==='true').length,1);
});

test('rejects invalid dates and step, calorie and goal values with no partial writes',()=>{
  const a=mount();
  for(const bad of ['', '1.2', '-1','2e3','200001','abc']){
    a.fill('movement-steps',bad);
    a.fire('movement-log-form','submit');
    assert.equal(a.tracker.read().length,0,bad);
  }
  a.fill('movement-steps','7000');
  for(const [key,bad] of [['movement-calories','15001'],['movement-calories','2.5'],
    ['movement-goal','0'],['movement-goal','200001']]){
    a.fill('movement-calories','');a.fill('movement-goal','');
    a.fill(key,bad);
    a.fire('movement-log-form','submit');
    assert.equal(a.tracker.read().length,0,bad);
  }
  a.fill('movement-calories','');a.fill('movement-goal','');
  for(const invalid of ['2099-01-01','2026-02-30','not-a-date']){
    a.fill('movement-day',invalid);
    a.fire('movement-log-form','submit');
    assert.equal(a.tracker.read().length,0,invalid);
  }
});

test('public visitors get separate device data; deleting requires confirmation',()=>{
  const one=new Map(),other=new Map();
  const a=mount(one);
  a.fill('movement-steps','4555');
  a.fire('movement-log-form','submit');
  assert.equal(mount(other).tracker.read().length,0);
  assert.equal(mount(one).tracker.read().length,1);
  const noDelete=mount(one,{confirmDelete:false});
  noDelete.fire('movement-remove','click');
  assert.equal(noDelete.tracker.read().length,1);
  a.fire('movement-remove','click');
  assert.equal(a.tracker.read().length,0);
});

test('storage failure never claims data was saved',()=>{
  const a=mount(new Map(),{throwOnSave:true});
  a.fill('movement-steps','9000');
  a.fire('movement-log-form','submit');
  assert.equal(a.tracker.read().length,0);
  assert.match(a.node('movement-log-form').children.at(-1).textContent,/not saved/);
});

test('CSS retains uneven summary spans, keyboard controls and mobile layouts',()=>{
  assert.match(css,/\.movement-primary-cards>\.movement-metric:first-child\{grid-column:span 7\}/);
  assert.match(css,/\.movement-primary-cards>\.movement-metric:last-child\{grid-column:span 5\}/);
  assert.match(css,/@media\(max-width:650px\)/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(css,/:focus-visible/);
});

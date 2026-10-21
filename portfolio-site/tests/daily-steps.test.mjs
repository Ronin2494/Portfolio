import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {test} from 'node:test';
import vm from 'node:vm';

const site=resolve(import.meta.dirname,'..');
const api=readFileSync(resolve(site,'../portfolio-membership-api/server.js'),'utf8');
const publicJS=readFileSync(resolve(site,'beyond.js'),'utf8');
const editorJS=readFileSync(resolve(site,'creative-editor.js'),'utf8');
const html=readFileSync(resolve(site,'creative-editor.html'),'utf8');
const styles=readFileSync(resolve(site,'beyond.css'),'utf8');

class TorontoDate extends Date{
  constructor(...args){super(...(args.length?args:['2026-10-22T02:30:00.000Z']));}
  static now(){return new Date('2026-10-22T02:30:00.000Z').getTime();}
}
const start=api.indexOf('const creativeKinds =');
const end=api.indexOf('const publicCreativeRecord =',start);
if(start<0||end<0)throw Error('Creative API validators could not be loaded.');
const server=vm.runInNewContext(
  api.slice(start,end)+'\n({creativeDocument,creativeDate,torontoToday})',
  {URL,Date:TorontoDate,Intl,Set,Number,String,Object}
);

test('Toronto local day is used for daily records, even during UTC date rollover',()=>{
  assert.equal(server.torontoToday(),'2026-10-21');
  assert.equal(server.creativeDate('2026-02-28'),'2026-02-28');
  assert.equal(server.creativeDate('2026-02-29'),null);
  assert.equal(server.creativeDate('2024-02-29'),'2024-02-29');
  assert.equal(server.creativeDate('2026-02-30'),null);
  assert.equal(server.creativeDate('2026-10-21T00:00:00Z'),null);
  assert.equal(server.creativeDocument({kind:'activity',date:'2026-10-22',steps:10}).error!==undefined,true);
});

test('steps accept valid bounds and explicit zero, without requiring calories',()=>{
  for(const steps of [0,1,8500,200000]){
    const result=server.creativeDocument({kind:'activity',date:'2026-10-21',steps});
    assert.equal(result.error,undefined);
    assert.equal(result.record.steps,steps);
    assert.equal(result.record.activeCalories,null);
    assert.equal(result.record.goalSteps,null);
  }
  assert.equal(server.creativeDocument({kind:'activity',date:'2026-10-21',steps:100,activeCalories:0}).record.activeCalories,0);
});

test('invalid numbers and out-of-range calories and goals are rejected',()=>{
  for(const steps of [-1,200001,2.5,'1500',null,undefined,NaN,Infinity]){
    assert.equal(typeof server.creativeDocument({kind:'activity',date:'2026-10-21',steps}).error,'string');
  }
  for(const activeCalories of [-1,15001,0.3,'250',NaN]){
    assert.equal(typeof server.creativeDocument({kind:'activity',date:'2026-10-21',steps:40,activeCalories}).error,'string');
  }
  for(const goalSteps of [-5,0,200001,2.1,'10000']){
    assert.equal(typeof server.creativeDocument({kind:'activity',date:'2026-10-21',steps:40,goalSteps}).error,'string');
  }
  const valid=server.creativeDocument({
    kind:'activity',date:'2026-10-21',steps:10435,activeCalories:453,goalSteps:10000
  });
  assert.equal(valid.record.goalSteps,10000);
  assert.equal(valid.record.activeCalories,453);
});

test('owner routes upsert one record per date and enforce unique kind/date index',()=>{
  assert.match(api,/app\.post\('\/api\/admin\/creative',ready,asyncRoute\(authorized\),adminOnly/);
  assert.match(api,/findOneAndUpdate\(\s*\{kind:'activity',date:record\.date\}/);
  assert.match(api,/\{upsert:true,returnDocument:'after'\}/);
  assert.match(api,/creativeRecords\.createIndex\(\{kind:1,date:1\},\{unique:true/);
  assert.match(api,/Daily activity dates cannot be changed/);
});

test('private entry supports quick dates, step goal, and explicitly optional calories',()=>{
  for(const id of ['entry-date','entry-steps','entry-goal','entry-calories','activity-today','activity-yesterday','activity-day-status']){
    assert.ok(html.includes('id="'+id+'"'),id);
  }
  assert.match(html,/Active calories \(optional\)/);
  assert.match(editorJS,/ui\.date\.max=today\(\)/);
  assert.match(editorJS,/ui\.date\.addEventListener\('change',hydrateDay\)/);
  assert.match(editorJS,/recentGoal/);
  assert.match(editorJS,/goalSteps:numeric\(ui\.goal\.value/);
  assert.match(editorJS,/activeCalories:numeric\(ui\.calories\.value/);
  const beginning=editorJS.indexOf('const numeric=');
  const ending=editorJS.indexOf('const recentGoal=',beginning);
  assert.ok(beginning>=0&&ending>beginning);
  const numeric=vm.runInNewContext(editorJS.slice(beginning,ending)+'\nnumeric',{Number,Error,Intl});
  assert.equal(numeric('0',0,200000,'Steps'),0);
  assert.equal(numeric('',0,15000,'Calories',true),null);
  for(const value of ['1.5','1e3','-3','200001','', 'abc']){
    assert.throws(()=>numeric(value,0,200000,'Steps'));
  }
  assert.match(styles,/\.beyond-step-summary/);
  assert.match(styles,/\.beyond-step-goal-progress/);
});

function renderMovement(records){
  const from=publicJS.indexOf('  function renderMovement(){');
  const until=publicJS.indexOf('  function renderPresence(){',from);
  assert.ok(from>=0&&until>from);
  class E{
    constructor(tag='',className='',text=''){
      this.tag=tag;this.className=className;this.textContent=String(text);
      this.children=[];this.attrs={};this.value=0;this.max=0;
    }
    setAttribute(name,value){this.attrs[name]=String(value);}
    append(...nodes){this.children.push(...nodes);}
  }
  const make=(tag,cls,text)=>new E(tag,cls,text??'');
  const append=(root,...nodes)=>{root.append(...nodes);return root;};
  const editor=()=>make('a','beyond-editor-link','EDIT COLLECTION');
  const root=vm.runInNewContext(publicJS.slice(from,until)+'\nrenderMovement()',{
    make,append,editor,records,todayKey:()=> '2026-10-21',
    Intl,Date,Number,Map
  });
  const flatten=(node)=>[node,...node.children.flatMap(flatten)];
  return flatten(root);
}

test('seven-day summary uses recorded days only and never invents missing data',()=>{
  const all=renderMovement([
    {kind:'activity',date:'2026-10-19',steps:0,activeCalories:null,goalSteps:null},
    {kind:'activity',date:'2026-10-20',steps:8000,activeCalories:250,goalSteps:8000},
    {kind:'activity',date:'2026-10-21',steps:12000,activeCalories:null,goalSteps:10000}
  ]);
  const byClass=name=>all.filter(x=>x.className===name);
  assert.deepEqual(byClass('beyond-step-metric-value').map(x=>x.textContent),['20,000','6,667','3 / 7']);
  assert.equal(byClass('beyond-step-goal').length,1);
  assert.equal(byClass('beyond-step-goal-progress')[0].max,10000);
  assert.equal(byClass('beyond-step-goal-progress')[0].value,10000);
  assert.ok(all.some(x=>x.textContent==='0'),'a genuine zero-step record remains visible in trend data');
  assert.ok(all.some(x=>x.textContent==='Active calories not recorded today'));
  assert.equal(byClass('activity-bar').filter(x=>x.attrs['data-missing']==='true').length,9);
});

test('unrecorded week shows dashes and a zero-day count without fabricated steps',()=>{
  const all=renderMovement([]);
  const values=all.filter(x=>x.className==='beyond-step-metric-value').map(x=>x.textContent);
  assert.deepEqual(values,['—','—','0 / 7']);
  assert.ok(all.some(x=>x.textContent==='No steps recorded today'));
  assert.equal(all.filter(x=>x.className==='beyond-step-goal').length,0);
});

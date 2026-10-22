/* Public Movement card: visitor-owned activity lives in this browser, never in the creator database. */
(()=>{
  'use strict';
  const STORAGE_KEY='portfolio-movement-daily-v1';
  const MAX_STEPS=200000;
  const MAX_CALORIES=15000;
  const fmt=new Intl.NumberFormat('en-CA');
  const keyFromDate=date=>[
    date.getFullYear(),
    String(date.getMonth()+1).padStart(2,'0'),
    String(date.getDate()).padStart(2,'0')
  ].join('-');
  const today=()=>keyFromDate(new Date());
  const shiftDay=(key,delta)=>{
    const [year,month,day]=key.split('-').map(Number);
    return keyFromDate(new Date(year,month-1,day+delta,12));
  };
  const isDate=key=>{
    if(typeof key!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(key))return false;
    const [year,month,day]=key.split('-').map(Number);
    return year>=2000&&year<=9999&&keyFromDate(new Date(year,month-1,day,12))===key;
  };
  const whole=(value,min,max)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
  const parseNumber=(raw,label,min,max,optional=false)=>{
    if(optional&&raw==='')return null;
    if(!/^[0-9]+$/.test(raw))throw Error(label+' must be a whole number.');
    const value=Number(raw);
    if(!whole(value,min,max))throw Error(label+' must be between '+fmt.format(min)+' and '+fmt.format(max)+'.');
    return value;
  };
  const read=()=>{
    try{
      const raw=window.localStorage?.getItem(STORAGE_KEY);
      if(!raw)return [];
      const data=JSON.parse(raw);
      if(!data||data.version!==1||!Array.isArray(data.entries))return [];
      const byDate=new Map();
      for(const item of data.entries.slice(-10000)){
        if(!isDate(item?.date)||item.date>today()||!whole(item.steps,0,MAX_STEPS))continue;
        if(item.activeCalories!=null&&!whole(item.activeCalories,0,MAX_CALORIES))continue;
        if(item.goalSteps!=null&&!whole(item.goalSteps,1,MAX_STEPS))continue;
        byDate.set(item.date,{
          date:item.date,steps:item.steps,
          activeCalories:item.activeCalories??null,goalSteps:item.goalSteps??null
        });
      }
      return [...byDate.values()].sort((a,b)=>a.date.localeCompare(b.date));
    }catch{return [];}
  };
  const persist=entries=>{
    try{
      if(!window.localStorage)throw Error('Browser storage is unavailable.');
      window.localStorage.setItem(STORAGE_KEY,JSON.stringify({version:1,entries}));
      return true;
    }catch{return false;}
  };
  const make=(tag,cls,text)=>{
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(text!==undefined)node.textContent=String(text);
    return node;
  };
  const add=(root,...children)=>{root.append(...children);return root;};
  const field=(id,label,type,placeholder,required=false)=>{
    const wrap=make('div','movement-field');
    const caption=make('label','',label);caption.htmlFor=id;
    const input=make('input','');
    input.id=id;input.name=id;input.type=type;
    input.placeholder=placeholder;input.required=required;
    if(type==='number')input.inputMode='numeric';
    add(wrap,caption,input);
    return {wrap,input};
  };
  const metric=(label,value,description,accent='')=>{
    const card=make('div','movement-metric '+accent);
    add(card,make('span','movement-metric-label',label),
      make('strong','movement-metric-value',value),
      make('span','movement-metric-detail',description));
    return card;
  };
  function render(){
    const root=make('div','movement-tracker');
    let entries=read();
    let selected=today();
    const header=make('div','movement-tracker-intro');
    add(header,make('p','movement-tracker-kicker','YOUR MOVEMENT / DAILY LOG'),
      make('h4','movement-tracker-heading','Record your steps.'),
      make('p','movement-tracker-subtitle','Add your actual daily totals. No account is needed. Entries remain in this browser, not in a public database.'));
    const dashboard=make('div','movement-tracker-dashboard');
    const status=make('p','movement-log-message','');
    status.setAttribute('role','status');status.setAttribute('aria-live','polite');

    const form=make('form','movement-log-form');
    form.id='movement-log-form';form.noValidate=true;
    const formHeading=make('div','movement-log-head');
    add(formHeading,make('h5','','ADD OR UPDATE A DAY'),make('span','','Saved on this device'));
    const date=field('movement-day','Date','date','',true);
    date.input.max=today();
    const steps=field('movement-steps','Steps','number','e.g. 8500',true);
    steps.input.min='0';steps.input.max=String(MAX_STEPS);steps.input.step='1';
    const calories=field('movement-calories','Active calories (optional)','number','kcal');
    calories.input.min='0';calories.input.max=String(MAX_CALORIES);calories.input.step='1';
    const goal=field('movement-goal','Daily step goal (optional)','number','e.g. 10000');
    goal.input.min='1';goal.input.max=String(MAX_STEPS);goal.input.step='1';

    const shortcuts=make('div','movement-day-shortcuts');
    const todayButton=make('button','movement-shortcut','Today');
    const yesterdayButton=make('button','movement-shortcut','Yesterday');
    todayButton.type='button';yesterdayButton.type='button';
    todayButton.id='movement-today';yesterdayButton.id='movement-yesterday';
    add(shortcuts,todayButton,yesterdayButton);

    const inputs=add(make('div','movement-log-fields'),steps.wrap,calories.wrap,goal.wrap);
    const actions=make('div','movement-log-actions');
    const save=make('button','movement-save','SAVE DAILY ACTIVITY');
    save.type='submit';
    const remove=make('button','movement-remove','DELETE THIS DAY');
    remove.type='button';remove.id='movement-remove';remove.hidden=true;
    add(actions,save,remove);
    add(form,formHeading,date.wrap,shortcuts,inputs,actions,status);

    const latestGoal=()=>entries.slice().reverse().find(x=>whole(x.goalSteps,1,MAX_STEPS))?.goalSteps??'';
    function populate(key){
      selected=key;date.input.value=key;
      const record=entries.find(x=>x.date===key);
      steps.input.value=record?.steps??'';
      calories.input.value=record?.activeCalories??'';
      goal.input.value=record?.goalSteps??latestGoal();
      save.textContent=record?'UPDATE DAILY ACTIVITY':'SAVE DAILY ACTIVITY';
      remove.hidden=!record;
      status.textContent=record?'Recorded date selected. Edit and update your figures.':'No entry for this day yet.';
    }
    function refresh(){
      dashboard.replaceChildren();
      const byDate=new Map(entries.map(x=>[x.date,x]));
      const current=byDate.get(today());
      const stats=make('div','movement-primary-cards');
      const stepsCard=metric('01 / TODAY’S STEPS',current?fmt.format(current.steps):'—',
        current?'Recorded today':'No entry yet','movement-steps-card');
      const calorieText=current&&current.activeCalories!==null?fmt.format(current.activeCalories):'—';
      const calorieCard=metric('02 / ACTIVE CALORIES',calorieText,
        current&&current.activeCalories!==null?'Active energy · kcal':'Optional activity value','movement-calories-card');
      if(current&&whole(current.goalSteps,1,MAX_STEPS)){
        const percent=Math.round(current.steps/current.goalSteps*100);
        const goalInfo=make('div','movement-goal-status');
        add(goalInfo,make('span','',fmt.format(current.steps)+' / '+fmt.format(current.goalSteps)+' step goal'),
          make('strong','',percent+'%'));
        const bar=make('progress','movement-goal-meter');
        bar.max=current.goalSteps;bar.value=Math.min(current.steps,current.goalSteps);
        bar.setAttribute('aria-label','Progress toward your daily step goal');
        goalInfo.append(bar);stepsCard.append(goalInfo);
      }
      add(stats,stepsCard,calorieCard);
      const seven=Array.from({length:7},(_,i)=>shiftDay(today(),i-6));
      const week=seven.map(k=>({date:k,entry:byDate.get(k)}));
      const logged=week.filter(x=>x.entry).length;
      const sum=week.reduce((total,x)=>total+(x.entry?.steps??0),0);
      const average=logged?Math.round(sum/logged):null;
      let cursor=byDate.has(today())?today():shiftDay(today(),-1);
      let streak=0;
      while(byDate.has(cursor)&&streak<entries.length){
        streak++;cursor=shiftDay(cursor,-1);
      }
      const overview=make('div','movement-summary-grid');
      add(overview,metric('SEVEN-DAY TOTAL',logged?fmt.format(sum):'—','Across days you recorded','movement-summary-feature'),
        metric('RECORDED-DAY AVG.',average===null?'—':fmt.format(average),'Missing days excluded'),
        metric('LOGGED DAYS',logged+' / 7','Current streak: '+streak+' days'));
      const graph=make('section','movement-graph');
      add(graph,make('h5','','LAST SEVEN DAYS'),make('p','','Missing days are not zero-step days.'));
      const bars=make('div','movement-graph-bars');
      const max=Math.max(1,...week.map(x=>x.entry?.steps??0));
      const spoken=[];
      for(const {date:key,entry} of week){
        const day=make('div','movement-graph-day');
        const dayTitle=make('span','movement-bar-value',entry?fmt.format(entry.steps):'—');
        const track=make('div','movement-bar-track');
        const bar=make('span','movement-bar');
        const height=entry?(entry.steps===0?5:Math.max(9,Math.round(entry.steps/max*100))):0;
        bar.style.setProperty('--bar-size',height+'%');
        if(!entry)day.dataset.missing='true';
        if(entry&&entry.steps===0)day.dataset.zero='true';
        if(key===today())day.dataset.today='true';
        track.append(bar);
        const readable=new Date(key+'T12:00:00Z');
        const short=readable.toLocaleDateString('en-CA',{weekday:'short',timeZone:'UTC'});
        const dayLabel=make('span','movement-bar-day',short);
        const details=entry?fmt.format(entry.steps)+' steps':'not logged';
        spoken.push(key+': '+details);
        day.title=key+': '+details;
        add(day,dayTitle,track,dayLabel);bars.append(day);
      }
      bars.setAttribute('role','img');
      bars.setAttribute('aria-label','Daily steps over the past seven days: '+spoken.join('; '));
      graph.append(bars);
      dashboard.append(stats,overview,graph);
    }
    const choose=key=>{
      if(!isDate(key)||key>today()){
        status.textContent='Choose today or an earlier valid calendar date.';
        return;
      }
      populate(key);
    };
    todayButton.addEventListener('click',()=>choose(today()));
    yesterdayButton.addEventListener('click',()=>choose(shiftDay(today(),-1)));
    date.input.addEventListener('change',()=>choose(date.input.value));
    form.addEventListener('submit',event=>{
      event.preventDefault();
      try{
        const key=date.input.value;
        if(!isDate(key)||key>today())throw Error('Choose today or an earlier valid calendar date.');
        const record={
          date:key,
          steps:parseNumber(steps.input.value,'Steps',0,MAX_STEPS),
          activeCalories:parseNumber(calories.input.value,'Active calories',0,MAX_CALORIES,true),
          goalSteps:parseNumber(goal.input.value,'Step goal',1,MAX_STEPS,true)
        };
        const next=entries.filter(x=>x.date!==key);
        next.push(record);next.sort((a,b)=>a.date.localeCompare(b.date));
        if(!persist(next))throw Error('Browser storage is unavailable or full. Your entry was not saved.');
        entries=next;refresh();populate(key);
        status.textContent='Saved '+fmt.format(record.steps)+' steps for '+key+'.';
      }catch(error){status.textContent=error.message;}
    });
    remove.addEventListener('click',()=>{
      const day=date.input.value;
      if(!entries.some(x=>x.date===day))return;
      if(typeof window.confirm==='function'&&!window.confirm('Remove your step entry for '+day+' from this browser?'))return;
      const next=entries.filter(x=>x.date!==day);
      if(!persist(next)){status.textContent='Could not remove this entry from browser storage.';return;}
      entries=next;refresh();populate(day);
      status.textContent='Removed your entry for '+day+'.';
    });
    root.append(header,dashboard,form);
    refresh();populate(selected);
    return root;
  }
  window.PortfolioMovement={render,read,today,shiftDay,parseNumber};
})();

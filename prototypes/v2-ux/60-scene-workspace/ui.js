/* Shared components used by BOTH variants (same content, same code). Variants differ only in layout/navigation (app.js). */
(()=>{
const U={};
const hue=(n,l=30)=>`background:linear-gradient(135deg,hsl(${n} 34% ${l}%),hsl(${(n+36)%360} 30% 11%))`;
U.hue=hue;
U.inp=(val,on,a={})=>h('input',{value:val??'',onchange:e=>on(e.target.value),...a});
U.num=(val,on,a={})=>h('input',{type:'number',value:val,onchange:e=>on(+e.target.value),style:'width:70px',...a});
U.ta=(val,on,rows=3,a={})=>{const t=h('textarea',{rows,onchange:e=>on(e.target.value),...a},val??'');return t};
U.sel=(opts,val,on,a={})=>h('select',{onchange:e=>on(e.target.value),...a},opts.map(([v,l])=>h('option',{value:v,selected:v===val},l)));
U.price=p=>h('span',{class:'price'},'· '+(p==null?'price unavailable':money(p)));
/* AI-chose mark: quiet until plan acceptance; afterwards only through the AI vs Mine toggle */
U.aiMark=(s,f)=>(!sc().acc&&s.ai&&s.ai[f])?h('span',{class:'aimark',title:'AI chose this. Overridable. Quiet after you accept the plan.'},'AI chose'):'';
U.hl=(s,f)=>S.aiVs&&s.ai&&s.ai[f]?' aihl':'';
U.touch=(s,f)=>{if(s.ai)s.ai[f]=false};
U.sec=(key,title,sum,body,o={})=>{
 const open=S.open[key]??o.open??false;
 return h('section',{class:'acc'+(open?' open':'')},
  h('header',{onclick:()=>{S.open[key]=!open;render()}},h('span',{class:'car'},open?'▾':'▸'),h('b',{},title),h('span',{class:'dim sum'},sum||''),h('span',{class:'sp'}),o.right||''),
  open?h('div',{class:'accb'},typeof body==='function'?body():body):'');
};
U.ticket=key=>{
 const t=S.ticket;if(!t||t.key!==key)return'';
 const blocked=t.kind==='blocked';
 const why=[];if(t.total>=2)why.push(`Total ${money(t.total)} is $2.00 or more`);if((t.count||1)>=10)why.push(`${t.count} Generations (10 or more)`);if(t.unknown)why.push('A price is unavailable');
 if(blocked)why.push(`${money(t.total)} is more than the ${money(S.cap.left)} left of today's cap`);
 return h('div',{class:'ticket tk2'+(blocked?' blocked':'')},h('div',{},h('b',{},t.what||'Generate'),' ',h('span',{class:'dim'},t.unknown?'price unavailable':money(t.total)+' · '+money(S.cap.left)+' left today'),
  h('ul',{},why.map(w=>h('li',{},w)))),
  h('div',{class:'row'},blocked?[h('button',{onclick:()=>{S.cap.left+=t.total;S.cap.limit+=t.total;render()}},'Raise the cap for this action'),h('button',{onclick:()=>{S.ticket=null;render()}},'Not now')]
  :[h('button',{class:'primary',onclick:()=>commit(t,t.run)},'Start · '+(t.unknown?'price unavailable':money(t.total))),h('button',{onclick:()=>{S.ticket=null;render()}},'Not now')]));
};
/* a control with its price; the ticket replaces it in place */
U.spend=(key,label,spec,run,o={})=>{
 if(S.gens[key])return h('span',{class:'quiet'},'Generating…');
 if(S.ticket&&S.ticket.key===key)return U.ticket(key);
 const f=S.fails[key];
 return h('span',{class:'row',style:'display:inline-flex'},h('button',{class:o.primary===false?'':'primary',disabled:o.disabled?true:null,onclick:()=>gate(key,spec,run)},label,U.price(spec.unknown?null:spec.total)),
  f?h('span',{class:'quiet fail'},f.text+' · ',h('button',{class:'ghost',onclick:()=>{delete S.fails[key];render()}},'Dismiss')):'');
};

/* ---------- shot strip: width = runtime. Variant U pins it on top; S uses the vertical rail (same data) ---------- */
U.shotStatus=(s,mode)=>{
 if(mode==='takes'){const k=takeKind(s);return{sel:['ok','Selected'],pick:['pick','Needs a pick'],missing:['miss','No take yet'],fail:['miss','Failed'],gen:['gen','Generating']}[k]}
 const st=rolesOf(s).map(r=>frame(s,r).st==='appr');
 const a=st.filter(Boolean).length;
 return s.fp==='skip'?['skip','Frames skipped']:a===st.length?['ok','Frames approved']:a?['pick',`${a} of ${st.length} approved`]:['miss','No frames approved'];
};
U.strip=(mode,vertical)=>{
 const L=shots();
 const stale=s=>rolesOf(s).some(r=>frame(s,r).stale);
 const cell=s=>{const [k,t]=U.shotStatus(s,mode);
  return h('div',{class:`cell k-${k}`+(s.id===S.shot?' foc':''),style:vertical?'':`flex:${s.dur} 1 0`,title:`${s.id} · ${s.name} · ${s.dur}s · ${t}`,onclick:()=>{S.shot=s.id;S.tk.back=S.tk.back;render()}},
   h('div',{class:'lab'},h('b',{},s.id),stale(s)&&mode!=='takes'?h('span',{class:'whisper',title:'possibly out of date'}):'',s.final?h('span',{class:'lock',title:'Marked final'},'🔒'):'',h('span',{class:'faint'},s.dur+'s')),
   h('div',{class:'sm'},vertical?s.name:t));
 };
 const sum=sceneStats(S.scene);
 return h('div',{class:'stripw'+(vertical?' vert':'')},
  h('div',{class:'row small dim',style:'margin-bottom:4px;flex-wrap:wrap'},vertical?'':h('b',{class:'lbl'},mode==='takes'?'Scene timeline':'Shots'),h('span',{},`${L.length} shots · ${fmt(sum.plan)}`),h('span',{class:'sp'}),
   h('button',{class:'ghost small',onclick:()=>{addShot();}},'+ Shot')),
  h('div',{class:'cells'+(vertical?' vert':'')},L.map(cell)));
};
function addShot(){
 undoable('Shot added',()=>{const L=shots(),i=idxOf(cur());const n=L.length?L[L.length-1].id.replace(/\D/g,'')+String.fromCharCode(65+L.length):'1A';
  const s={id:n,name:'New shot',dur:4,hue:Math.floor(Math.random()*360),anchor:[],action:'',dialogue:[],location:'',direction:'',cam:{size:'Medium',angle:'Eye level',move:'Static',lens:'35 mm',note:''},visual:'',sound:'',fp:'open',cont:{kind:'cut',mk:'',note:'',pin:null},roster:[],refs:[],vp:{ov:null},fr:{},takes:[],ai:{}};
  L.splice(i+1,0,s);S.shot=s.id;sc().plan='drafted'});
}
U.addShot=addShot;

/* ---------- script context: collapsible, resizable, never dominant ---------- */
U.scriptDrawer=()=>{
 if(!S.script.open)return'';
 const s=cur();
 const hl=s?s.anchor:[];
 const el=h('aside',{class:'script',style:`width:${S.script.w}px`},
  h('div',{class:'grip',onmousedown:e=>{e.preventDefault();const x0=e.clientX,w0=S.script.w;
   const mv=ev=>{S.script.w=Math.max(240,Math.min(720,w0+(x0-ev.clientX)));el.style.width=S.script.w+'px'};
   const up=()=>{removeEventListener('mousemove',mv);removeEventListener('mouseup',up)};addEventListener('mousemove',mv);addEventListener('mouseup',up)},title:'Drag to resize'}),
  h('div',{class:'row'},h('b',{class:'lbl'},'Master Narrative · scene '+S.scene),h('span',{class:'sp'}),h('button',{class:'ghost small',onclick:()=>{S.script.open=false;render()}},'Collapse ✕')),
  h('div',{class:'faint small'},s?'Passage anchored to '+s.id+' is highlighted':''),
  sc().blocks.map(b=>h('p',{class:'serif blk'+(hl.includes(b.id)?' on':''),onclick:()=>{const x=shots().find(q=>q.anchor.includes(b.id));if(x){S.shot=x.id;render()}}},b.text)));
 return el;
};
U.scriptToggle=()=>h('button',{class:'ghost'+(S.script.open?' on':''),onclick:()=>{S.script.open=!S.script.open;render()}},S.script.open?'Script ◂':'Script ▸');

/* ---------- prompt block: collapsed, inspectable, explicit override, ingredients beside ---------- */
U.prompt=(key,label,text,ing,ovFlag,onOverride,onReset)=>{
 const open=S.open['p:'+key];
 return h('div',{class:'prm'},
  h('div',{class:'row',onclick:()=>{S.open['p:'+key]=!open;render()},style:'cursor:pointer'},h('span',{class:'car'},open?'▾':'▸'),h('b',{class:'small'},label),
   ovFlag?h('span',{class:'chip warn'},'prompt overridden'):h('span',{class:'faint small'},'generated'),h('span',{class:'sp'}),h('span',{class:'faint small'},open?'':'Show prompt and ingredients')),
  open?h('div',{class:'prmb'},
   h('div',{class:'prmt'},U.ta(text,v=>onOverride(v),5,{class:'mono'}),h('div',{class:'row'},h('span',{class:'faint small'},'Editing is an explicit override; the generated prompt stops following the shot.'),h('span',{class:'sp'}),ovFlag?h('button',{class:'ghost small',onclick:onReset},'Back to generated'):'')),
   h('div',{class:'ing'},h('b',{class:'lbl'},'Ingredients'),ing.filter(i=>i.v.length).map(i=>h('div',{class:'ingr'},h('span',{class:'faint small'},i.k),h('div',{},i.v.map(x=>h('span',{class:'chip'},x))))))
  ):'');
};

/* ---------- empty plan (no shots yet) ---------- */
U.emptyPlan=()=>{
 const scene=sc(),k=enterKind(scene);
 return h('div',{class:'empty'},h('h3',{},'No shots yet'),
  h('p',{class:'dim'},k.auto?'This shot plan drafts itself the moment you enter a scene like this (under $0.05).':`Scene ${scene.id} has no shots. Drafting the plan is text only: no frames, worlds or Takes.`),
  h('div',{class:'row',style:'justify-content:center'},U.spend('draft:'+scene.id,'Draft plan',{total:scene.est,count:1,what:`Draft the shot plan for scene ${scene.id} (text only)`},()=>draftPlan(scene.id,{paid:true})),h('button',{onclick:()=>{U.addShot();}},'Write shots myself')),
  k.breach?h('p',{class:'quiet'},`Today's cap leaves ${money(S.cap.left)}: this scene's auto-draft is skipped and the ticket has no Start.`):'');
};
window.U=U;
})();

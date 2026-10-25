/* Shared UI pieces: controls, visual asset thumbs, the rich shot strip, prompt block, spend ticket, script drawer. Throwaway. */
(()=>{
const U={};
U.inp=(val,on,a={})=>h('input',{value:val??'',onchange:e=>on(e.target.value),...a});
U.num=(val,on,a={})=>h('input',{type:'number',value:val,onchange:e=>on(+e.target.value),style:'width:64px',...a});
U.ta=(val,on,rows=3,a={})=>h('textarea',{rows,onchange:e=>on(e.target.value),...a},val??'');
U.sel=(opts,val,on,a={})=>h('select',{onchange:e=>on(e.target.value),...a},opts.map(([v,l])=>h('option',{value:v,selected:v===val},l)));
U.price=p=>h('span',{class:'price'},'· '+(p==null?'price unavailable':money(p)));
U.seg=(opts,val,on,cls='')=>h('div',{class:'segx '+cls},opts.map(([v,l,t])=>h('button',{class:v===val?'on':'',title:t||'',onclick:e=>{e.stopPropagation();on(v)}},l)));
U.aiMark=(s,f)=>(!sc().acc&&s.ai&&s.ai[f])?h('span',{class:'aimark',title:'AI chose this. Overridable. Quiet after you accept the plan.'},'AI chose'):'';
U.hl=(s,f)=>S.aiVs&&s.ai&&s.ai[f]?' aihl':'';
U.touch=(s,f)=>{if(s.ai)s.ai[f]=false};
U.sec=(key,title,sum,body,o={})=>{
 const open=S.open[key]??o.open??false;
 return h('section',{class:'disc'+(open?' open':'')},
  h('header',{onclick:()=>{S.open[key]=!open;render()}},h('span',{class:'car'},open?'▾':'▸'),h('b',{},title),h('span',{class:'dim sum'},sum||''),h('span',{class:'sp'}),o.right||''),
  open?h('div',{class:'discb'},typeof body==='function'?body():body):'');
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
U.spend=(key,label,spec,run,o={})=>{
 if(S.gens[key])return h('span',{class:'quiet gen'},h('i',{class:'spin'}),' Generating…');
 if(S.ticket&&S.ticket.key===key)return U.ticket(key);
 const f=S.fails[key];
 return h('span',{class:'row',style:'display:inline-flex'},h('button',{class:(o.primary===false?'':'primary ')+(o.cls||''),disabled:o.disabled?true:null,onclick:()=>gate(key,spec,run)},label,U.price(spec.unknown?null:spec.total)),
  f?h('span',{class:'quiet fail'},f.text+' · ',h('button',{class:'ghost',onclick:()=>{delete S.fails[key];render()}},'Dismiss')):'');
};

/* ---- visual asset thumbnail: identity image + Look + View ---- */
U.at=(a,look,view,o={})=>{
 const L=ASSETS_[a].looks[look];
 const d=h('div',{class:'at s-'+(o.size||'m')+(o.sel?' sel':'')+(o.cls?' '+o.cls:'')+(L&&!L.img?' descOnly':''),title:o.title||`${aname(a)} · ${lookName(a,look)}${view?' · '+viewName(a,view):''}`,onclick:o.onclick},
  A.assetEl(a,look,view),
  o.badge?h('span',{class:'abadge'},o.badge):'',
  o.label!==false&&o.size!=='xs'?h('div',{class:'albl'},h('b',{},o.short?aname(a).split(' ')[0]:aname(a)),o.sub!==false?h('span',{},lookName(a,look)):''):'',
  L&&!L.img&&o.size!=='xs'?h('span',{class:'dtag'},'description only'):'',
  o.extra||'');
 return d;
};
const ASSETS_=D.ASSETS;

/* ---- shot state, rich strip cell (visible before any frame exists) ---- */
U.shotState=s=>{
 const k=takeKind(s),roles=rolesOf(s),a=roles.filter(r=>frame(s,r).st==='appr').length,any=roles.some(r=>frame(s,r).st!=='none');
 if(picked(s))return['ok',s.final?'Final':'Take picked'];
 if(s.takes.filter(t=>!t.rej).length)return['prog',s.takes.filter(t=>!t.rej).length+(s.takes.filter(t=>!t.rej).length===1?' take':' takes')];
 if(s.fail||s.partial)return['fail','Take failed'];
 if(s.fp==='skip')return['skip','Video only'];
 if(a===roles.length)return['ok','Frames ready'];
 if(a)return['prog',`Frames ${a}/${roles.length}`];
 return['none',any?'Drafted':'Planned'];
};
const CONT={cut:['┃','cut'],continues:['═','continues'],newview:['↗','new view'],match:['◎','match']};
U.contTag=s=>{const c=s.cont,[g,l]=CONT[c.kind];return h('span',{class:'ctag c-'+c.kind,title:c.note||l},g+' '+(c.kind==='match'&&c.mk?c.mk+' match':l))};
U.avatars=(s,n=4)=>{
 const rows=s.roster;
 return h('div',{class:'avs'},rows.slice(0,n).map(r=>{const l=openLook(s,r);return h('span',{class:'av'+(persists(s,r)?' chg':'')+(r.trans?' tr':''),title:`${aname(r.a)} · ${lookName(r.a,l)}${persists(s,r)?' → '+lookName(r.a,endLook(s,r)):''}`},A.assetEl(r.a,l,r.view))}),rows.length>n?h('span',{class:'avm'},'+'+(rows.length-n)):'');
};
U.shotVisual=(s,mode)=>{
 const roles=rolesOf(s);
 if(mode==='gen'){
  return h('div',{class:'cvis two'},(roles.length?roles:[]).map(r=>{const f=frame(s,r);return h('div',{class:'cf st-'+f.st},f.st==='none'?h('span',{class:'faint'},ROLE_NAME[r].slice(0,3)):A.frameEl(s,r,{seed:f.cur+1}),f.st==='appr'?h('i',{class:'ok'},'✓'):'')}),roles.length?'':h('div',{class:'cf skip'},'video only'));
 }
 const anyF=roles.find(r=>frame(s,r).st!=='none');
 return h('div',{class:'cvis'},anyF?A.frameEl(s,anyF,{seed:frame(s,anyF).cur+1}):h('div',{class:'glyph'},A.el(A.glyph(s.cam.size))),
  h('span',{class:'gsz'},A.SIZE_ABBR[A.sizeKey(s.cam.size)]));
};
U.cell=(s,mode,o={})=>{
 const [k,t]=U.shotState(s),sz=A.sizeKey(s.cam.size);
 const stale=rolesOf(s).some(r=>frame(s,r).stale);
 const ang=/low/i.test(s.cam.angle)?' · low angle':/high/i.test(s.cam.angle)?' · high angle':'';
 const w=o.vertical?'':`width:${o.w?o.w:128+Math.min(s.dur,10)*8}px`;
 return h('div',{class:`cell2 st-${k}`+(s.id===S.shot?' foc':'')+(o.vertical?' vert':''),style:w,'data-shot':s.id,title:`${s.id} · ${s.name}`,onclick:()=>o.onpick?o.onpick(s):(S.shot=s.id,render())},
  U.shotVisual(s,mode),
  h('div',{class:'cl1'},h('b',{},s.id),h('span',{class:'dim'},'· '+s.dur+'s'),stale?h('span',{class:'whisper',title:'possibly out of date'}):'',s.final?h('span',{class:'lock'},'🔒'):'',h('span',{class:'sp'}),h('span',{class:'stt k-'+k},h('i',{}),t)),
  h('div',{class:'cl2'},A.SIZE_ABBR[sz]+(s.cam.lens?' · '+s.cam.lens.replace(' mm','mm'):'')),
  h('div',{class:'cl3'},A.moveIcon[A.moveKind(s.cam.move)]+' '+A.moveShort(s.cam.move)+ang),
  h('div',{class:'cl4'},U.contTag(s)),
  mode==='gen'?'':U.avatars(s));
};
U.strip=(mode='prep',o={})=>{
 const L=shots();
 const sum=sceneStats(S.scene);
 const el=h('div',{class:'stripx'+(o.vertical?' vert':'')+(o.cls?' '+o.cls:'')},
  o.head===false?'':h('div',{class:'row small dim stripHead'},h('b',{class:'lbl'},o.title||'Sequence'),h('span',{},`${L.length} shots · ${fmt(sum.plan)}`),h('span',{class:'sp'}),
   o.legend===false?'':h('span',{class:'faint small'},'size · lens · movement · continuity into the shot'),
   h('button',{class:'ghost small',onclick:()=>U.addShot()},'+ Shot')),
  h('div',{class:'cells2','data-scroll':'cells-'+mode},L.map((s,i)=>U.cell(s,mode,o))));
 return el;
};
U.addShot=()=>{
 undoable('Shot added',()=>{const L=shots(),i=idxOf(cur());const n=L.length?L[L.length-1].id.replace(/\D/g,'')+String.fromCharCode(65+L.length):'1A';
  const s={id:n,name:'New shot',dur:4,hue:Math.floor(Math.random()*360),anchor:[],action:'',dialogue:[],location:'',direction:'',cam:{size:'Medium',angle:'Eye level',move:'Static',lens:'35 mm',note:''},visual:'',sound:'',fp:'open',cont:{kind:'cut',mk:'',note:'',pin:null},roster:[],refs:[],vp:{ov:null},fr:{},takes:[],ai:{}};
  L.splice(i+1,0,s);S.shot=s.id;sc().plan='drafted'});
};
U.scrollToFocus=()=>{$$('.cells2').forEach(c=>{const f=$('.foc',c);if(f){const l=f.offsetLeft-c.clientWidth/2+f.clientWidth/2;if(Math.abs(c.scrollLeft-l)>c.clientWidth*.35)c.scrollLeft=l}})};

/* ---- script context: collapsible, resizable, never dominant ---- */
U.scriptDrawer=()=>{
 if(!S.script.open)return'';
 const s=cur();
 const hl=s?s.anchor:[];
 const el=h('aside',{class:'script',style:`width:${S.script.w}px`},
  h('div',{class:'grip',onmousedown:e=>{e.preventDefault();const x0=e.clientX,w0=S.script.w;
   const mv=ev=>{S.script.w=Math.max(260,Math.min(720,w0+(x0-ev.clientX)));el.style.width=S.script.w+'px'};
   const up=()=>{removeEventListener('mousemove',mv);removeEventListener('mouseup',up)};addEventListener('mousemove',mv);addEventListener('mouseup',up)},title:'Drag to resize'}),
  h('div',{class:'row'},h('b',{class:'lbl'},'Master Narrative · scene '+S.scene),h('span',{class:'sp'}),h('button',{class:'ghost small',onclick:()=>{S.script.open=false;render()}},'Collapse ✕')),
  h('div',{class:'faint small'},s?'Passage anchored to '+s.id+' is highlighted':''),
  sc().blocks.map(b=>h('p',{class:'serif blk'+(hl.includes(b.id)?' on':''),onclick:()=>{const x=shots().find(q=>q.anchor.includes(b.id));if(x){S.shot=x.id;render()}}},b.text)));
 return el;
};
U.scriptToggle=()=>h('button',{class:'ghost'+(S.script.open?' on':''),onclick:()=>{S.script.open=!S.script.open;render()}},'Script '+(S.script.open?'◂':'▸'));

/* ---- prompt block: concise preview; expand to edit/override; ingredients on request (visual) ---- */
U.ingredients=ing=>h('div',{class:'ing'},ing.filter(i=>i.v.length).map(i=>h('div',{class:'ingr'},h('span',{class:'lbl'},i.k),h('div',{class:'ingitems'},i.v.map(x=>h('span',{class:'ingi'+(x.art?' img':'')},x.art?A.el(x.art,'ithumb'):'',h('span',{},x.t)))))));
U.prompt=(key,label,text,ing,ovFlag,onOverride,onReset,o={})=>{
 const open=S.open['p:'+key],ingOpen=S.open['pi:'+key];
 const prev=text.length>190?text.slice(0,190).replace(/\s+\S*$/,'')+'…':text;
 return h('div',{class:'prm2'+(open?' open':'')},
  h('div',{class:'prmh'},h('b',{class:'small'},label),ovFlag?h('span',{class:'chip warn'},'Prompt overridden'):h('span',{class:'faint small'},'generated from the shot'),h('span',{class:'sp'}),
   h('button',{class:'ghost small',onclick:()=>{S.open['p:'+key]=!open;render()}},open?'Collapse':'Edit'),
   h('button',{class:'ghost small'+(ingOpen?' on':''),onclick:()=>{S.open['pi:'+key]=!ingOpen;render()}},ingOpen?'Hide ingredients':'Ingredients')),
  open?h('div',{class:'prmt'},U.ta(text,v=>onOverride(v),o.rows||5,{class:'mono'}),h('div',{class:'row'},h('span',{class:'faint small'},'Editing is an explicit override; the generated prompt stops following the shot.'),h('span',{class:'sp'}),ovFlag?h('button',{class:'ghost small',onclick:onReset},'Back to generated'):'')):
   h('p',{class:'prmp',onclick:()=>{S.open['p:'+key]=true;render()},title:'Click to edit'},prev),
  ingOpen?U.ingredients(ing):'');
};

U.emptyPlan=()=>{
 const scene=sc(),k=enterKind(scene);
 return h('div',{class:'empty'},h('h3',{},'No shots yet'),
  h('p',{class:'dim'},k.auto?'This shot plan drafts itself the moment you enter a scene like this (under $0.05).':`Scene ${scene.id} has no shots. Drafting the plan is text only: no frames, worlds or Takes.`),
  h('div',{class:'row',style:'justify-content:center'},U.spend('draft:'+scene.id,'Draft plan',{total:scene.est,count:1,what:`Draft the shot plan for scene ${scene.id} (text only)`},()=>draftPlan(scene.id,{paid:true})),h('button',{onclick:()=>{U.addShot();}},'Write shots myself')),
  k.breach?h('p',{class:'quiet'},`Today's cap leaves ${money(S.cap.left)}: this scene's auto-draft is skipped and the ticket has no Start.`):'');
};
window.U=U;
})();

/* Core: ONE state object, derived data and operations shared by hub, variant U and variant S. */
(()=>{
const {MODELS,FRAME_PRICE,ASSETS}=D;
const money=n=>'$'+n.toFixed(2);
const fmt=s=>{s=Math.max(0,Math.round(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0')};
const Q=new URLSearchParams(location.search);
const S={prepL:(Q.get('prep')||'A').toUpperCase(),genL:Q.get('gen')||'1',view:Q.get('view')||'hub',sel:7,scene:7,shot:'7B',
 script:{open:false,w:360},open:{},aiVs:false,cap:{limit:5,left:4.62},ticket:null,gens:{},fails:{},failNext:false,
 role:'open',gallery:false,cine:null,cards:false,drawer:null,lookNew:null,world:false,pop:null,
 tk:{film:false,t:0,playing:false,fixMenu:false,cmp:[],composer:false,unsettled:false,filter:'all',model:{},guid:{},back:null,skip:false,refsOpen:false,promptOpen:false},
 ctl:false,refPick:null,toastKeep:null};
const sc=id=>D.scenes[id??S.scene];
const shots=id=>sc(id).shots;
const shot=id=>shots().find(s=>s.id===id)||shots()[0];
const cur=()=>shot(S.shot);
const idxOf=(s,sceneId=S.scene)=>shots(sceneId).indexOf(s);
const rolesOf=s=>({skip:[],open:['open'],'open+end':['open','end'],'open+end+key':['open','key','end']}[s.fp]);
const ROLE_NAME={open:'Opening',end:'Ending',key:'Keyframe'};
const frame=(s,r)=>s.fr[r]||(s.fr[r]={st:'none',n:0,cur:0,ap:null,refs:[],ov:{},pov:null});
const syncFrame=f=>{f.st=f.ap!=null?'appr':f.n?'cand':'none';return f};
const aname=a=>ASSETS[a].n;
const lookName=(a,l)=>ASSETS[a].looks[l]?.n||l;
const firstLook=a=>Object.keys(ASSETS[a].looks)[0];

/* Look continuity: a persistent change ("end" differs from opening) and "from here on" carry forward; transient state never does. */
function carried(a,s,sceneId=S.scene){
 let l=firstLook(a),src=null;
 for(const x of shots(sceneId)){
  if(x===s)break;
  const r=x.roster.find(q=>q.a===a);if(!r)continue;
  const o=r.open||l;
  if(r.end&&r.end!==o){l=r.end;src=x.id}
  else if(r.open){l=r.open}
  if(r.later){l=r.later;src=x.id}
 }
 return{look:l,src};
}
const openLook=(s,r)=>r.open||carried(r.a,s).look;
const endLook=(s,r)=>r.end||openLook(s,r);
const persists=(s,r)=>endLook(s,r)!==openLook(s,r);
const PRES={throughout:'Stays throughout',enters:'Enters',leaves:'Exits',open:'Opening only',end:'Ending only'};
function frameAssets(s,role){
 const inSet={open:['throughout','leaves','open'],end:['throughout','enters','end'],key:['throughout','enters','leaves']}[role];
 const f=frame(s,role);
 return s.roster.map(r=>{const derived=inSet.includes(r.pres),ov=f.ov[r.a];
  return{r,derived,on:ov==='+'?true:ov==='-'?false:derived,ov,look:role==='end'?endLook(s,r):openLook(s,r)}});
}

function framePrompt(s,role){
 if(frame(s,role).pov!=null)return frame(s,role).pov;
 const as=frameAssets(s,role).filter(x=>x.on).map(x=>`${aname(x.r.a)} (${lookName(x.r.a,x.look)}: ${ASSETS[x.r.a].looks[x.look]?.d||''})`);
 const sents=s.action.split(/(?<=\.)\s+/);
 const beat=role==='open'?sents[0]:role==='end'?sents[sents.length-1]:sents[Math.floor(sents.length/2)];
 const tr=s.roster.filter(r=>r.trans&&role==='end').map(r=>r.trans);
 return `${ROLE_NAME[role]} frame. ${s.cam.size}, ${s.cam.angle.toLowerCase()}, ${s.cam.lens}. ${s.location}; ${s.direction}. ${beat} Present: ${as.join('; ')||'no assets'}.${tr.length?' Shot-only state: '+tr.join('; ')+'.':''} ${s.visual}`;
}
function frameIngredients(s,role){
 const f=frame(s,role),i=idxOf(s),prev=shots()[i-1];
 const as=frameAssets(s,role).filter(x=>x.on);
 const refs=[...s.refs.filter(r=>r.scope==='shot'||r.scope===role),...f.refs];
 const c=s.cont;
 let cont={t:'Hard cut: no continuity source'};
 if(role==='open'&&i>0){
  const src=c.pin?c.pin.split(':'):[prev.id,'end'],ss=shot(src[0]);
  const art=A.frame(ss,src[1]);
  if(c.kind==='continues')cont={t:`Continues: ${prev.id} ending is the base image`,art};
  else if(c.kind==='newview')cont={t:`Same place, new view: ${prev.id} ending informs the place`,art};
  else if(c.kind==='match')cont={t:`Match (${c.mk||'kind not set'}): ${src[0]} ${src[1]==='end'?'ending':'opening'} is a framing reference, not a base image`,art};
 }else if(role!=='open')cont={t:"From this shot's opening frame",art:A.frame(s,'open')};
 return[
  {k:'Assets and Looks',v:as.map(x=>({t:`${aname(x.r.a)} · ${lookName(x.r.a,x.look)} · ${viewName(x.r.a,x.r.view)}${x.ov==='+'?' (added here)':''}`,art:A.asset(x.r.a,x.look,x.r.view)}))},
  {k:'References',v:refs.map(r=>r.type==='shot'?{t:`Reference shot ${r.srcShot} ${r.srcRole}`,art:A.frame(shot(r.srcShot),r.srcRole)}:r.type==='cineblock'?{t:'CineBlock capture',art:A.cine(s,r.scope)}:r.type==='upload'?{t:r.label,art:A.upload(r.id)}:{t:r.label,art:r.subject?A.asset(r.subject,openLook(s,s.roster.find(q=>q.a===r.subject)||{a:r.subject}),'front'):null})},
  {k:'Continuity source',v:[cont]},
  {k:'Camera and technical',v:[s.cam.size,s.cam.angle,s.cam.move,s.cam.lens].map(t=>({t}))},
  {k:'Frame role',v:[{t:ROLE_NAME[role]+' of '+s.id}]},
 ];
}
function videoPrompt(s){
 if(s.vp.ov!=null)return s.vp.ov;
 const ch=s.roster.filter(r=>persists(s,r)).map(r=>`${aname(r.a)} changes from ${lookName(r.a,openLook(s,r))} to ${lookName(r.a,endLook(s,r))} during the shot`);
 const d=s.dialogue.map(x=>`${x.who}: “${x.line}” (${x.delivery})`);
 return `${s.action} ${ch.length?ch.join('. ')+'. ':''}${d.length?d.join(' ')+' ':''}Camera: ${s.cam.size}, ${s.cam.move.toLowerCase()}, ${s.cam.lens}. ${s.sound}`;
}
function videoIngredients(s){
 return[
  {k:'Assets and Looks',v:s.roster.map(r=>({t:`${aname(r.a)} · ${lookName(r.a,openLook(s,r))}${persists(s,r)?' → '+lookName(r.a,endLook(s,r)):''}`,art:A.asset(r.a,openLook(s,r),r.view)}))},
  {k:'Frames',v:s.fp==='skip'?[{t:'Frames skipped'}]:rolesOf(s).map(k=>({t:`${ROLE_NAME[k]} ${frame(s,k).st==='appr'?'approved':'not approved'}`,art:A.frame(s,k,{seed:frame(s,k).cur+1})}))},
  {k:'References',v:s.refs.map(r=>r.type==='shot'?{t:`Reference shot ${r.srcShot} ${r.srcRole}`,art:A.frame(shot(r.srcShot),r.srcRole)}:{t:r.label,art:r.type==='cineblock'?A.cine(s,r.scope):null})},
  {k:'Continuity source',v:[{t:s.cont.kind==='match'?`Match (${s.cont.mk||'kind not set'}) from ${s.cont.pin||'previous ending'}`:s.cont.kind}]},
  {k:'Camera and technical',v:[s.cam.size,s.cam.angle,s.cam.move,s.cam.lens,s.dur+' s'].map(t=>({t}))},
  {k:'Shot-only states',v:s.roster.filter(r=>r.trans).map(r=>({t:aname(r.a)+': '+r.trans}))},
 ];
}

const picked=s=>s.takes.find(t=>t.id===s.sel&&!t.rej)||null;
const takeKind=s=>picked(s)?'sel':s.gen?'gen':s.partial?'fail':!s.takes.filter(t=>!t.rej).length?(s.fail||s.partial?'fail':'missing'):'pick';
const frameStats=sh=>{let n=0,a=0;sh.forEach(s=>rolesOf(s).forEach(r=>{n++;if(frame(s,r).st==='appr')a++}));return{n,a}};
const sceneStats=id=>{const L=shots(id),f=frameStats(L),k={sel:0,pick:0,missing:0,fail:0,gen:0};L.forEach(s=>k[takeKind(s)]++);
 return{n:L.length,plan:L.reduce((a,s)=>a+s.dur,0),made:L.reduce((a,s)=>a+(picked(s)?picked(s).dur:s.dur),0),fa:f.a,fn:f.n,...k}};
const estRuntime=id=>60+((id*37)%50);
function endingImage(id){
 const L=shots(id),sceneO=sc(id);
 if(!L.length)return{kind:'none'};
 const last=L[L.length-1];
 if(rolesOf(last).includes('end')&&frame(last,'end').st==='appr')return{kind:'frame',src:last.id+' ending Frame (approved)',s:last,role:'end'};
 if(picked(last))return{kind:'take',src:'Still from the selected Take of '+last.id,s:last,role:'end'};
 const loc=sceneO.assets.find(a=>ASSETS[a].t==='Location');
 if(loc)return{kind:'world',src:ASSETS[loc].n+' identity image',a:loc};
 return{kind:'none'};
}

/* spend rules: price on the control, ticket at the control, cap breach = no Start */
function gate(key,spec,run){
 const capBreach=!spec.unknown&&spec.total>S.cap.left+1e-9;
 const kind=spendKind({total:spec.total,count:spec.count||1,unknown:spec.unknown,capBreach});
 if(kind==='click'){commit(spec,run);return}
 S.ticket={key,kind,...spec,run};render();
}
function commit(spec,run){S.cap.left=Math.max(0,S.cap.left-(spec.total||0));S.ticket=null;run()}
function simulate(key,done,ms=1000){
 S.gens[key]=true;delete S.fails[key];render();
 setTimeout(()=>{delete S.gens[key];
  if(S.failNext){S.failNext=false;S.fails[key]={text:'Failed, not charged'}}else done();
  render()},ms);
}
const uid=(()=>{let n=100;return p=>p+(++n)})();
function undoable(msg,fn){
 const before=JSON.stringify(D.scenes);
 fn();render();
 toast(msg,()=>{D.scenes=JSON.parse(before);render()});
}

/* entering a scene (Y4) and the initial-plan auto-draft (Record 3 CR-2) */
function enterKind(scene){
 const capBreach=scene.est>S.cap.left+1e-9;
 return{auto:scene.est<.05&&!capBreach&&!scene.locked,breach:capBreach,est:scene.est};
}
function enterScene(id,opts={}){
 S.view=opts.view||'prep';S.scene=id;S.tk.back=null;S.tk.cmp=[];S.tk.composer=false;S.cine=null;S.refPick=null;S.ticket=null;
 const scene=sc(id);
 S.shot=scene.shots[0]?.id||null;
 if(opts.shot)S.shot=opts.shot;
 if(!scene.shots.length&&scene.plan==='none'&&!scene.noAuto&&enterKind(scene).auto){draftPlan(id,{auto:true});return}
 render();
}
function draftPlan(id,o={}){
 const scene=sc(id),g=D.genScene(id,true);
 const before=JSON.stringify(D.scenes);
 const run=()=>{scene.shots=g.shots.map(s=>({...s,takes:[],sel:null,fail:null,fr:Object.fromEntries(Object.keys(s.fr).map(k=>[k,{st:'none',n:0,cur:0,ap:null,refs:[],ov:{},pov:null}])),ai:{action:true,cam:true,dir:true,fp:true,cont:true,dur:true},roster:s.roster.map(r=>({...r,ai:true}))}));
  scene.plan='drafted';scene.acc=false;scene.autoDrafted=!!o.auto;S.shot=scene.shots[0].id;S.view='prep';S.ticket=null;
  render();
  toast(o.auto?'Shot plan drafted on entry · text only · '+money(scene.est):'Shot plan drafted · text only',()=>{D.scenes=JSON.parse(before);sc(id).noAuto=true;render()})};
 if(o.auto){S.cap.left=Math.max(0,S.cap.left-scene.est);run();return}
 if(o.paid){run();return}
 gate('draft:'+id,{total:scene.est,count:1,what:'Draft the shot plan for scene '+id+' (text only: no frames, worlds or Takes)'},run);
}

function markDownstream(s,a){
 const L=shots();for(let i=idxOf(s)+1;i<L.length;i++){
  if(!L[i].roster.some(r=>r.a===a))continue;
  rolesOf(L[i]).forEach(k=>{const f=frame(L[i],k);if(f.st==='appr'||f.st==='cand')f.stale=1});
 }
}
function addAsset(s,a){if(s.roster.some(r=>r.a===a))return;s.roster.push({a,pres:'throughout',open:null,end:null,note:'',ai:false,view:ASSETS[a].views[0][0]})}
function removeAsset(s,a){s.roster=s.roster.filter(x=>x.a!==a)}
function acceptPlan(id){undoable('Plan accepted · AI-chose marks are now quiet',()=>{sc(id).acc=true})}

/* ---- canonical asset library (World Definition). Scene Prep extends it; everything is project-wide. ---- */
const looksOf=a=>Object.entries(ASSETS[a].looks);
const viewsOf=a=>ASSETS[a].views;
const viewName=(a,v)=>(ASSETS[a].views.find(x=>x[0]===v)||[,v||'—'])[1];
function describeToVisual(a,desc){
 const t=ASSETS[a].t,d=(desc||'').toLowerCase(),base=Object.values(ASSETS[a].looks)[0].v||{};
 const v={...base};
 if(t==='Character'){
  if(/tux|dinner jacket|bow tie/.test(d)){v.tux=1;v.vest=null;v.coat='#101114';v.dark=1;v.bg=250}
  if(/blood/.test(d))v.blood=1;
  if(/wet|rain|soaked/.test(d))v.wet=1;
  if(/torn|rumpled|dishevel|unravel/.test(d)){v.style='messy';v.open=1}
  const col={red:'#6a2430',green:'#2f4a3a',blue:'#26405a',grey:'#7d838c',gray:'#7d838c',black:'#0f0f13',white:'#d8d4c8',brown:'#4a3a2e',yellow:'#a88a2a'};
  Object.keys(col).forEach(k=>{if(new RegExp('\\b'+k+'\\b').test(d)&&!v.tux)v.coat=col[k]});
 }else if(t==='Location'){
  if(/night|dark|lamp out/.test(d))v.lamp=false;if(/day|morning|bright/.test(d)){v.tone='day';v.lamp=false}
 }else{if(/crack|broken|smash/.test(d)){v.cracked=1;v.dark=1}}
 return v;
}
function createLook(a,{name,desc,mode='generate',scene,shot}){
 const k='n'+uid('l');
 ASSETS[a].looks[k]={n:name,d:desc,img:mode==='none'?0:1,v:describeToVisual(a,desc),created:{scene,shot}};
 return k;
}
const lastTakeN=s=>s.takes.reduce((m,t)=>Math.max(m,t.n||0),0);
const modelOf=s=>S.tk.model[s.id]||'kling';
function takeEst(s,m=modelOf(s)){const M=MODELS[m],parts=Math.ceil(s.dur/M.max);return{unknown:M.rate==null,total:M.rate==null?0:s.dur*M.rate,parts}}
const unsettled=(L=shots())=>L.filter(s=>['pick','missing','fail'].includes(takeKind(s)));

Object.assign(window,{syncFrame,looksOf,viewsOf,viewName,createLook,describeToVisual,S,sc,shots,shot,cur,idxOf,rolesOf,ROLE_NAME,frame,aname,lookName,firstLook,carried,openLook,endLook,persists,PRES,frameAssets,framePrompt,frameIngredients,videoPrompt,videoIngredients,picked,takeKind,frameStats,sceneStats,estRuntime,endingImage,money,fmt,gate,commit,simulate,uid,undoable,enterKind,enterScene,draftPlan,markDownstream,addAsset,removeAsset,acceptPlan,lastTakeN,modelOf,takeEst,unsettled});
})();

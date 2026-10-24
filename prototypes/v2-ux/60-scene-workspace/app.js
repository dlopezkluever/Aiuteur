/* Shell + the two layouts. Content comes from the SAME components (plan.js, frames.js, takes.js); only layout/navigation differ. */
(()=>{
const Q=new URLSearchParams(location.search);
S.rail=true;
const JOBS=[['plan','Plan'],['frames','Frames'],['takes','Takes']];
const STAGES=[['plan','Shots & Assets'],['frames','Frames & Prompts'],['takes','Takes']];

function render(){
 const app=$('#app');const keep=$$('[data-scroll]',app).map(e=>[e.dataset.scroll,e.scrollTop]);
 app.innerHTML='';app.className='app ws';
 app.append(topStrip(),S.view==='hub'?h('div',{class:'main','data-scroll':'hub'},H.view()):sceneView(),S.ctl?controls():'');
 keep.forEach(([k,v])=>{const e=$(`[data-scroll="${k}"]`,app);if(e)e.scrollTop=v});
}
window.render=render;

function topStrip(){
 const i=Object.keys(D.scenes).map(Number);
 const pct=Math.max(0,S.cap.left/S.cap.limit*100);
 return h('div',{class:'strip'},h('span',{class:'brand'},'AIUTEUR'),h('span',{class:'dim'},'The Salt Line'),h('span',{class:'faint small',title:'Throwaway prototype. Visuals not approved. Neither variant is ratified.'},'prototype · not ratified'),
  h('button',{class:'ghost'+(S.view==='hub'?' on':''),onclick:()=>{S.view='hub';render()}},'Script Hub'),
  S.view==='scene'?[h('span',{class:'faint'},'›'),h('span',{},`Scene ${S.scene}`)]:'',
  h('span',{class:'sp'}),
  h('div',{class:'seg vsw',title:'Prototype: switch the workspace variant. Same data, same components.'},
   h('button',{class:S.variant==='U'?'on':'',onclick:()=>{S.variant='U';render()}},'U · Unified'),h('button',{class:S.variant==='S'?'on':'',onclick:()=>{S.variant='S';render()}},'S · Staged')),
  h('label',{class:'dim small',title:'AI vs Mine: highlights AI-made choices on demand'},h('input',{type:'checkbox',checked:S.aiVs?true:null,onchange:e=>{S.aiVs=e.target.checked;render()}}),' AI vs Mine'),
  h('span',{class:'faint small'},'today '+money(S.cap.left)+' left'),h('div',{class:'meter'},h('i',{style:`width:${pct}%`})),
  h('button',{class:'ghost'+(S.ctl?' on':''),onclick:()=>{S.ctl=!S.ctl;render()}},'⚙ prototype controls'));
}

function acceptBtn(){
 const scene=sc();
 if(!scene.shots.length)return'';
 return scene.acc?h('span',{class:'chip ok',title:'AI-chose marks are quiet now; the AI vs Mine toggle still shows them'},'Plan accepted'):
  h('button',{onclick:()=>acceptPlan(S.scene),title:'Accepting quiets the AI-chose marks'},'Accept plan');
}
function sceneHead(){
 const scene=sc(),ids=Object.keys(D.scenes).map(Number),i=ids.indexOf(S.scene),st=sceneStats(S.scene);
 return h('div',{class:'shead'},
  h('button',{class:'ghost',onclick:()=>{S.view='hub';S.sel=S.scene;render()}},'← Hub'),
  h('b',{style:'font-size:15px'},`${scene.id} · ${scene.sl} – ${scene.tm}`),h('span',{class:'dim'},scene.name),
  h('span',{class:'faint small'},scene.shots.length?`${scene.shots.length} shots · ${fmt(st.made)} as made / ${fmt(st.plan)} planned`:'No shots yet'),
  scene.autoDrafted&&!scene.acc?h('span',{class:'faint small'},'drafted on entry · text only'):'',
  S.tk.back?h('button',{class:'primary',onclick:()=>{const b=S.tk.back;S.tk.back=null;S.shot=b.shot;S.job='takes';render()}},'Back to review · '+S.tk.back.shot):'',
  h('span',{class:'sp'}),acceptBtn(),U.scriptToggle(),
  h('button',{class:'ghost',disabled:i<1?true:null,onclick:()=>enterScene(ids[i-1])},'‹'),h('button',{class:'ghost',disabled:i>=ids.length-1?true:null,onclick:()=>enterScene(ids[i+1])},'›'));
}

/* ---- Plan content blocks (same in both) ---- */
function planSections(s,layout){
 const rosterSum=`${s.roster.length} assets · ${s.roster.filter(r=>persists(s,r)).length} persistent change · ${s.roster.filter(r=>r.trans).length} shot-only state`;
 return {
  content:U.sec('content','Shot content',`${s.dialogue.length} dialogue · ${s.cam.size} · ${s.dur}s · frames: ${s.fp}`,()=>P.shotContent(s),{open:true}),
  roster:U.sec('roster','Asset roster and state plan',rosterSum,()=>P.roster(s),{open:true}),
  refs:U.sec('refs','References',s.refs.length+' on this shot',()=>P.refs(s),{open:layout==='S'||s.refs.length>0}),
 };
}
function rowTools(s){
 return h('div',{class:'row small'},h('button',{class:'ghost small',onclick:()=>{const L=shots(),i=idxOf(s);if(i>0){undoable('Moved earlier',()=>{[L[i-1],L[i]]=[L[i],L[i-1]]})}}},'↑ earlier'),
  h('button',{class:'ghost small',onclick:()=>{const L=shots(),i=idxOf(s);if(i<L.length-1){undoable('Moved later',()=>{[L[i+1],L[i]]=[L[i],L[i+1]]})}}},'↓ later'),
  h('button',{class:'ghost small',onclick:()=>undoable('Shot removed',()=>{const L=shots();L.splice(idxOf(s),1);S.shot=(L[Math.max(0,idxOf(s)-1)]||L[0])?.id})},'Remove shot'));
}

/* ---- Variant U ---- */
function viewU(){
 const s=cur(),scene=sc();
 let body;
 if(!scene.shots.length)body=U.emptyPlan();
 else if(S.job==='plan'){const x=planSections(s,'U');body=h('div',{class:'col wide-col'},rowTools(s),x.content,x.roster,x.refs)}
 else if(S.job==='frames')body=F.workspace(s);
 else body=T.stage({timeline:false});
 return h('div',{class:'main flexcol'},
  sceneHead(),
  h('div',{class:'tabsbar'},h('div',{class:'tabs mt'},JOBS.map(([k,l])=>h('button',{class:S.job===k?'on':'',onclick:()=>{S.job=k;render()}},l))),
   h('span',{class:'faint small'},{plan:'Planning the shots and assets',frames:'Full-width frame work and prompts',takes:'Review and make Takes'}[S.job])),
  scene.shots.length?h('div',{class:'persist'},U.strip(S.job==='takes'?'takes':'frames'),s?P.context(s):''):'',
  h('div',{class:'bodyrow'},h('div',{class:'body','data-scroll':'body'},body),U.scriptDrawer()));
}

/* ---- Variant S ---- */
function stepper(){
 const st=sceneStats(S.scene);
 const info={plan:`${st.n} shots`,frames:`${st.fa}/${st.fn} frames approved`,takes:`${st.sel}/${st.n} selected`};
 const idx=STAGES.findIndex(x=>x[0]===S.job);
 return h('div',{class:'stepper'},STAGES.map(([k,l],i)=>h('div',{class:'step'+(S.job===k?' on':i<idx?' past':''),onclick:()=>{S.job=k;render()}},h('span',{class:'num'},i+1),h('div',{class:'col',style:'gap:0'},h('b',{},l),h('span',{class:'small dim'},info[k])))),
  h('span',{class:'sp'}),idx>0?h('button',{onclick:()=>{S.job=STAGES[idx-1][0];render()}},'← '+STAGES[idx-1][1]):'',idx<2?h('button',{class:'primary',onclick:()=>{S.job=STAGES[idx+1][0];render()}},'Next: '+STAGES[idx+1][1]+' →'):'');
}
function viewS(){
 const s=cur(),scene=sc();
 let body;
 if(!scene.shots.length)body=U.emptyPlan();
 else if(S.job==='plan'){const x=planSections(s,'S');
  body=h('div',{class:'twocol'},h('div',{class:'col'},rowTools(s),x.content),h('div',{class:'col'},x.roster,x.refs))}
 else if(S.job==='frames')body=F.workspace(s);
 else body=T.stage({timeline:true});
 return h('div',{class:'main flexcol'},sceneHead(),stepper(),
  scene.shots.length&&S.job!=='takes'?P.context(s):'',
  h('div',{class:'bodyrow'},
   scene.shots.length?(S.rail&&S.job!=='takes'?h('nav',{class:'rail','data-scroll':'rail'},h('button',{class:'ghost small railx',title:'Collapse shot list',onclick:()=>{S.rail=false;render()}},'◂ collapse'),U.strip(S.job==='takes'?'takes':'frames',true)):
    h('nav',{class:'rail mini'},h('button',{class:'ghost',title:'Show shot list',onclick:()=>{S.rail=true;render()}},'▸'),shots().map(x=>h('div',{class:'mchip'+(x.id===S.shot?' on':''),title:x.id+' '+x.name,onclick:()=>{S.shot=x.id;render()}},x.id)))):'',
   h('div',{class:'body','data-scroll':'body'},body),U.scriptDrawer()));
}
function sceneView(){return S.variant==='U'?viewU():viewS()}

/* ---- prototype controls: state jumps ---- */
function resetScene(id){D.scenes[id]=D.fresh()[id]}
function controls(){
 const J=(label,fn,tip)=>h('button',{class:'jb',title:tip||'',onclick:()=>{fn();}},label);
 const go=(id,job,o={})=>{enterScene(id,{shot:o.shot});S.job=job;if(o.role)S.role=o.role;render()};
 return h('div',{class:'protoctl'},h('div',{class:'row'},h('b',{class:'lbl'},'Prototype controls'),h('span',{class:'sp'}),h('button',{class:'ghost small',onclick:()=>{S.ctl=false;render()}},'✕')),
  h('div',{class:'ctlgrp'},'Initial-plan auto-draft'),
  J('Scene 14: no plan, under $0.05 → auto-drafts on entry',()=>{resetScene(14);S.cap.left=4.62;S.cap.limit=5;enterScene(14)}),
  J('Scene 17: no plan, $0.08 → “Draft plan · $0.08”',()=>{resetScene(17);S.cap.left=4.62;enterScene(17)}),
  J('Cap breach: scene 19, $0.03 left → ticket, no Start',()=>{resetScene(19);S.cap.left=.03;enterScene(19);draftPlan(19)}),
  J('Cap breach on a cheap scene: 16, $0.02 left',()=>{resetScene(16);S.cap.left=.02;enterScene(16);draftPlan(16)}),
  h('div',{class:'ctlgrp'},'Hand-built scene 7'),
  J('Plan: 7F match cut + persistent change + transient state',()=>go(7,'plan',{shot:'7F'})),
  J('Plan: 7H reference shot with recompose note',()=>go(7,'plan',{shot:'7H'})),
  J('Frames: 7B partly approved (opening ✓, ending candidate)',()=>go(7,'frames',{shot:'7B',role:'end'})),
  J('Frames: 7G with CineBlock capture needing description',()=>go(7,'frames',{shot:'7G',role:'end'})),
  J('Frames: ready to Block this shot (7C)',()=>{go(7,'frames',{shot:'7C'});S.cine={scope:'shot',shot:'7C'};render()}),
  J('Takes: 7C with wide take composer open',()=>{go(7,'takes',{shot:'7C'});S.tk.composer=true;render()}),
  J('Takes: 7G long shot, part 3 failed',()=>go(7,'takes',{shot:'7G'})),
  J('Toggle “plan accepted” on scene 7 (AI-chose marks)',()=>{sc(7).acc=!sc(7).acc;render()}),
  h('div',{class:'ctlgrp'},'Spend and failures'),
  J(S.failNext?'Next generation will fail ✓ (click to cancel)':'Make the next generation fail quietly',()=>{S.failNext=!S.failNext;render()}),
  J('Daily cap nearly reached ($0.20 left)',()=>{S.cap.left=.2;render()}),
  J('Restore cap ($4.62 left)',()=>{S.cap.left=4.62;render()}),
  J('Reset everything',()=>{const v=S.variant;location.href=location.pathname+'?v='+v}));
}

/* ---- boot ---- */
document.addEventListener('keydown',e=>{if(e.target.matches('input,textarea,select'))return;if(S.view!=='scene')return;
 if(e.key==='['||e.key===']'){const L=shots(),i=idxOf(cur()),n=L[i+(e.key===']'?1:-1)];if(n){S.shot=n.id;render()}}});
if(Q.get('scene')){S.sel=+Q.get('scene');enterScene(+Q.get('scene'),{shot:Q.get('shot')||undefined});if(Q.get('job'))S.job=Q.get('job');if(Q.get('role'))S.role=Q.get('role')}
else if(Q.get('sel'))S.sel=+Q.get('sel');
if(Q.get('ctl'))S.ctl=true;
if(Q.get('script'))S.script.open=true;
render();
})();

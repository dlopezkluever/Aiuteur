/* Shell: collapsible global Outline (left sidebar), top strip, Script Hub, scene header with scene ribbon + Prep -> Generate -> Review pipeline, drawers/overlays, state-jump controls. */
(()=>{
const Q=new URLSearchParams(location.search);

function render(){
 const app=$('#app');const keep=$$('[data-scroll]',app).map(e=>[e.dataset.scroll,e.scrollTop,e.scrollLeft]);
 app.innerHTML='';app.className='app ws'+(S.sbCol?' collapsed':'');
 app.append(topStrip(),outline(),S.view==='hub'?h('div',{class:'main','data-scroll':'hub'},H.view()):sceneView(),S.ctl?controls():'',P.world(),G.cineOverlay());
 keep.forEach(([k,v,l])=>{const e=$(`[data-scroll="${k}"]`,app);if(e){e.scrollTop=v;e.scrollLeft=l}});
 U.scrollToFocus();
 const c=$('.cells2[data-scroll="cells-prep"]'),m=$('.mxscroll');if(c&&m)m.scrollLeft=c.scrollLeft;
}
window.render=render;

/* ---- global Outline: the film as a document. Only the Script Hub, scenes (and their shots) and Review & Export are built in this prototype ---- */
const sceneIds=()=>Object.keys(D.scenes).map(Number);
const goHub=()=>{S.view='hub';S.sel=S.scene;S.tk.fixMenu=false;render()};
const goShot=(sceneId,shotId)=>{
 if(sceneId!==S.scene){const v=S.view==='hub'?'prep':S.view;enterScene(sceneId,{shot:shotId,view:v});return}
 S.shot=shotId;S.tkShow=null;if(S.view==='hub')S.view='prep';if(S.view==='prep')S.sb=false;render();
};
function outline(){
 const col=S.sbCol;
 const stub=(ic,t,o={})=>h('a',{class:'stub'+(o.sub?' sub':''),title:t+' (not part of this prototype; the Outline is shown for orientation)'},h('i',{class:'oi'},ic),h('span',{class:'ol'},t));
 const live=(ic,t,on,fn,badge)=>h('a',{class:on?'on':'',title:t,onclick:fn},h('i',{class:'oi'},ic),h('span',{class:'ol'},t),badge?h('span',{class:'ob'},badge):'');
 const rows=[];
 rows.push(live('▦','Script Hub',S.view==='hub',goHub));
 rows.push(h('h6',{},h('span',{class:'ol'},'Story')));
 [['⇥','Input'],['？','Interview'],['❡','Treatment'],['☷','Beat Sheet'],['✎','Master Narrative']].forEach(([i,t])=>rows.push(stub(i,t)));
 rows.push(h('h6',{},h('span',{class:'ol'},'World')));
 rows.push(stub('◍','World Definition'));
 rows.push(h('h6',{},h('span',{class:'ol'},'Scenes')));
 sceneIds().forEach(id=>{
  const st=sceneStats(id),open=S.view!=='hub'&&id===S.scene,done=st.n&&st.sel===st.n,prog=st.fa||st.sel;
  rows.push(h('a',{class:(open?'on':'')+(id===S.sel&&S.view==='hub'?' hubsel':''),title:`Scene ${id} · ${sc(id).name}`,onclick:()=>enterScene(id,{view:S.view==='review'?'review':'prep'})},h('i',{class:'dot '+(done?'done':prog?'prog':'')}),h('span',{class:'ol'},id+' '+sc(id).name),col?h('span',{class:'sn'},id):''));
  if(open&&!col)shots(id).forEach(s=>{const [k]=U.shotState(s);rows.push(h('a',{class:'sub'+(s.id===S.shot?' on':''),title:s.name,onclick:()=>goShot(id,s.id)},h('i',{class:'dot '+(k==='ok'?'done':k==='prog'?'prog':'')}),h('span',{class:'ol'},s.id+' '+s.name)))});
 });
 rows.push(stub('＋','Ad-hoc shots'),stub('⌫','Removed from Story'));
 rows.push(h('h6',{},h('span',{class:'ol'},'Output')));
 rows.push(live('▶','Review & Export',S.view==='review'&&S.tk.film,()=>{if(!sc().shots.length)enterScene(7);S.view='review';S.tk.film=true;render()}));
 return h('nav',{class:'outline'+(col?' col':'')},
  h('div',{class:'olhead'},h('span',{class:'ol faint small'},'The Salt Line'),h('button',{class:'ghost small',title:col?'Expand the sidebar':'Collapse the sidebar',onclick:()=>{S.sbCol=!S.sbCol;render()}},col?'»':'«')),
  h('div',{class:'olscroll','data-scroll':'outline'},rows));
}

function topStrip(){
 const pct=Math.max(0,S.cap.left/S.cap.limit*100);
 const crumb=S.view==='hub'?[h('span',{class:'faint'},'›'),h('span',{class:'accent'},'Script Hub')]:
  [h('span',{class:'faint'},'›'),h('button',{class:'ghost small',onclick:goHub},'Script Hub'),h('span',{class:'faint'},'›'),h('span',{},`Scene ${S.scene}`),h('span',{class:'faint'},'›'),h('span',{class:'accent'},{prep:S.sb?'Scene Prep · Storyboard':'Scene Prep · Shot',gen:'Generate',review:'Review'}[S.view])];
 return h('div',{class:'strip'},h('span',{class:'brand'},'AIUTEUR'),h('span',{class:'dim'},'The Salt Line'),h('span',{class:'faint small',title:'Throwaway prototype. Visuals not approved. Authoritative docs outrank it.'},'prototype · not ratified'),
  crumb,h('span',{class:'sp'}),
  h('button',{class:'ghost small',onclick:()=>{S.world=true;render()},title:'The canonical World Definition library'},'World library'),
  h('label',{class:'dim small',title:'AI vs Mine: highlights AI-made choices on demand'},h('input',{type:'checkbox',checked:S.aiVs?true:null,onchange:e=>{S.aiVs=e.target.checked;render()}}),' AI vs Mine'),
  h('span',{class:'faint small'},'today '+money(S.cap.left)+' left'),h('div',{class:'meter'},h('i',{style:`width:${pct}%`})),
  h('button',{class:'ghost'+(S.ctl?' on':''),onclick:()=>{S.ctl=!S.ctl;render()}},'⚙ jump to a state'));
}

function pipeline(){
 const st=sceneStats(S.scene);
 const T_=[['prep','Scene Prep','Shots and what is in each',`${st.n} shots`],['gen','Generate','One shot: frames, then Takes',`frames ${st.fa}/${st.fn}`],['review','Review','Do the Takes work together?',`${st.sel}/${st.n} picked`]];
 return h('div',{class:'pipe'},T_.map(([k,l,q,b],i)=>[i?h('span',{class:'parr'},'›'):'',h('button',{class:'ptab'+(S.view===k?' on':''),title:q,onclick:()=>{S.view=k;S.tk.fixMenu=false;S.refLib=null;render()}},h('span',{class:'pn'},i+1),h('span',{class:'col',style:'gap:0;align-items:flex-start'},h('b',{},l),h('span',{class:'faint small'},b)))]));
}
/* scene ribbon (v3 Script Hub vocabulary, compact): one block per scene, width = runtime, quiet picked / needs a pick / missing bar */
function miniRibbon(){
 const ids=sceneIds(),rt=id=>sc(id).shots.length?sceneStats(id).plan:estRuntime(id);
 return h('div',{class:'ribbon mini'},ids.map(id=>{const st=sceneStats(id),n=st.n||1;
  return h('div',{class:'sc'+(id===S.scene?' on':''),style:`flex:${rt(id)} 1 0`,title:`Scene ${id} · ${sc(id).name}${st.n?'':' · No shots yet'}`,onclick:()=>enterScene(id,{view:S.view==='review'?'review':'prep'})},
   h('span',{class:'sn'},id),h('div',{class:'sbar'},st.n?[h('i',{class:'s-sel',style:`width:${st.sel/n*100}%`}),h('i',{class:'s-pick',style:`width:${st.pick/n*100}%`}),h('i',{class:'s-miss',style:`width:${(st.missing+st.fail)/n*100}%`})]:h('i',{class:'s-none',style:'width:100%'})))}));
}
function sceneHead(){
 const scene=sc(),ids=sceneIds(),i=ids.indexOf(S.scene),st=sceneStats(S.scene);
 return h('div',{class:'sheadwrap'},h('div',{class:'shead'},
  h('button',{class:'ghost',title:'Back to the Script Hub',onclick:goHub},'← Script Hub'),
  h('div',{class:'col',style:'gap:0'},h('b',{style:'font-size:14px'},`${scene.id} · ${scene.sl} – ${scene.tm}`),h('span',{class:'faint small'},scene.shots.length?`${scene.name} · ${scene.shots.length} shots · ${fmt(st.made)} / ${fmt(st.plan)}`:'No shots yet')),
  scene.shots.length?pipeline():'',
  S.tk.back&&S.view!=='review'?h('button',{class:'primary backrev',onclick:T.back},'← Back to Review · '+S.tk.back.shot):'',
  scene.autoDrafted&&!scene.acc?h('span',{class:'faint small'},'drafted on entry · text only'):'',
  h('span',{class:'sp'}),U.scriptToggle(),
  h('button',{class:'ghost',title:'Previous scene (opens its Storyboard)',disabled:i<1?true:null,onclick:()=>enterScene(ids[i-1],{view:S.view==='review'?'review':'prep'})},'‹'),h('button',{class:'ghost',title:'Next scene (opens its Storyboard)',disabled:i>=ids.length-1?true:null,onclick:()=>enterScene(ids[i+1],{view:S.view==='review'?'review':'prep'})},'›')),
  miniRibbon());
}
function sceneView(){
 const scene=sc();
 let body;
 if(!scene.shots.length)body=h('div',{class:'bodyx'},U.emptyPlan());
 else if(S.view==='prep')body=P.layout();
 else if(S.view==='gen')body=h('div',{class:'genwrap'},h('div',{class:'genhead'},G.head(cur()),U.strip('gen',{head:false,w:null})),G.layout());
 else body=T.view();
 const sideDrawer=S.view==='prep'&&!S.sb&&scene.shots.length;
 return h('div',{class:'main flexcol'},sceneHead(),
  h('div',{class:'bodyrow'},h('div',{class:'bodycol'},body),U.scriptDrawer(),sideDrawer?P.drawer():''));
}

/* ---- prototype controls: state jumps only (no layout switchers) ---- */
function resetScene(id){D.scenes[id]=D.fresh()[id]}
function controls(){
 const J=(label,fn,tip)=>h('button',{class:'jb',title:tip||'',onclick:()=>{fn();}},label);
 const go=(view,shot,o={})=>{enterScene(7,{shot,view});if(shot)S.sb=false;if(o.sb)S.sb=true;if(o.role)S.role=o.role;if(o.mode)S.genMode=o.mode;S.drawer=null;S.lookNew=null;S.cine=null;S.ticket=null;S.refLib=null;if(o.fn)o.fn();render()};
 return h('div',{class:'protoctl'},h('div',{class:'row'},h('b',{class:'lbl'},'Jump to a state'),h('span',{class:'sp'}),h('button',{class:'ghost small',onclick:()=>{S.ctl=false;render()}},'✕')),
  h('div',{class:'ctlgrp'},'Start of the flow'),
  J('Script Hub (scene 7 selected)',()=>{S.view='hub';S.sel=7}),
  J('Scene 7 Storyboard (via Open scene)',()=>go('prep',null,{sb:true})),
  h('div',{class:'ctlgrp'},'Scene Prep'),
  J('Scene 14 Storyboard: no plan, auto-drafts',()=>{D.scenes[14]=D.fresh()[14];S.cap.left=4.62;S.cap.limit=5;enterScene(14)}),
  J('Scene 17: “Draft plan · $0.08”',()=>{D.scenes[17]=D.fresh()[17];S.cap.left=4.62;enterScene(17)}),
  J('Shot editor 7F, Cast & Looks expanded',()=>go('prep','7F',{fn:()=>{S.matrix=true}})),
  J('7G Marta wet → dry, Location with 2 Directions',()=>go('prep','7G',{fn:()=>{S.drawer={mode:'asset',a:'office'}}})),
  J('7A: quay with two ordered Directions',()=>go('prep','7A')),
  J('7J: create “Bloodied tuxedo” Look for Voss',()=>go('prep','7J',{fn:()=>{S.drawer={mode:'asset',a:'voss'};S.lookNew={a:'voss',name:'Bloodied tuxedo',desc:'Black tuxedo, white shirt streaked with blood, bow tie pulled loose',mode:'generate',use:'end'}}})),
  h('div',{class:'ctlgrp'},'Generate → Frames'),
  J('7B Frames: opening approved, ending attempts',()=>go('gen','7B',{role:'end',mode:'frames'})),
  J('7B Add reference image (visual browser)',()=>go('gen','7B',{role:'end',mode:'frames',fn:()=>{S.refLib={scope:'end'}}})),
  J('7H reference shot attached',()=>go('gen','7H',{mode:'frames'})),
  J('7G CineBlock capture needs a description',()=>go('gen','7G',{role:'end',mode:'frames'})),
  h('div',{class:'ctlgrp'},'Generate → Takes'),
  J('7B Takes: no Take yet, dialogue + Voice',()=>go('gen','7B',{mode:'takes'})),
  J('7C Takes: 3 Takes, one ready not selected',()=>go('gen','7C',{mode:'takes'})),
  J('7G Takes: long shot, part 3 failed',()=>go('gen','7G',{mode:'takes'})),
  J('Next generation fails'+(S.failNext?' ✓ (click to cancel)':''),()=>{S.failNext=!S.failNext;render()}),
  h('div',{class:'ctlgrp'},'Review'),
  J('Review scene 7 at 7C',()=>go('review','7C')),
  J('Review: Make another take (the same composer)',()=>go('review','7C',{fn:()=>{S.tk.composer=true}})),
  J('Review: whole film',()=>go('review','7C',{fn:()=>{S.tk.film=true}})),
  h('div',{class:'ctlgrp'},'Spend'),
  J('Cap breach: scene 19, $0.03 left',()=>{D.scenes[19]=D.fresh()[19];S.cap.left=.03;enterScene(19);draftPlan(19)}),
  J('Restore cap ($4.62)',()=>{S.cap.left=4.62;render()}),
  J('Reset everything',()=>{location.href=location.pathname}));
}

document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){if(S.cine){S.cine=null}else if(S.world){S.world=false}else if(S.refLib){S.refLib=null}else if(S.drawer){S.drawer=null;S.lookNew=null}else return;render();return}
 if(e.target.matches('input,textarea,select'))return;if(S.view==='hub'||S.view==='review'||(S.view==='prep'&&S.sb))return;
 if(e.key==='['||e.key===']'){const L=shots(),i=idxOf(cur()),n=L[i+(e.key===']'?1:-1)];if(n){S.shot=n.id;S.tkShow=null;render()}}});

if(Q.get('scene')||Q.get('view')&&Q.get('view')!=='hub'){enterScene(+(Q.get('scene')||7),{shot:Q.get('shot')||undefined,view:Q.get('view')||'prep'});if(Q.get('role'))S.role=Q.get('role');if(Q.get('mode'))S.genMode=Q.get('mode')==='takes'?'takes':'frames'}
else{S.view='hub';S.sel=+(Q.get('sel')||7)}
if(Q.get('ctl'))S.ctl=true;
if(Q.get('script'))S.script.open=true;
if(Q.get('drawer')){const[m,a]=Q.get('drawer').split(':');S.drawer={mode:m,a}}
render();
})();

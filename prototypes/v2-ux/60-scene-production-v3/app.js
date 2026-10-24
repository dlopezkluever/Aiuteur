/* Shell: top strip, scene header with the Prep -> Generate -> Review pipeline, drawers/overlays, prototype controls. */
(()=>{
const Q=new URLSearchParams(location.search);
const ASSETS_=D.ASSETS;

function render(){
 const app=$('#app');const keep=$$('[data-scroll]',app).map(e=>[e.dataset.scroll,e.scrollTop,e.scrollLeft]);
 const winY=app.scrollTop;
 app.innerHTML='';app.className='app ws';
 app.append(topStrip(),S.view==='hub'?h('div',{class:'main','data-scroll':'hub'},H.view()):sceneView(),S.ctl?controls():'',P.world(),G.cineOverlay(),G.player());
 keep.forEach(([k,v,l])=>{const e=$(`[data-scroll="${k}"]`,app);if(e){e.scrollTop=v;e.scrollLeft=l}});
 U.scrollToFocus();
}
window.render=render;

function topStrip(){
 const pct=Math.max(0,S.cap.left/S.cap.limit*100);
 return h('div',{class:'strip'},h('span',{class:'brand'},'AIUTEUR'),h('span',{class:'dim'},'The Salt Line'),h('span',{class:'faint small',title:'Throwaway prototype. Visuals not approved. Nothing here is ratified.'},'prototype · not ratified'),
  h('button',{class:'ghost'+(S.view==='hub'?' on':''),onclick:()=>{S.view='hub';S.sel=S.scene;render()}},'Script Hub'),
  S.view!=='hub'?[h('span',{class:'faint'},'›'),h('span',{},`Scene ${S.scene}`),h('span',{class:'faint'},'›'),h('span',{class:'accent'},{prep:'Scene Prep',gen:'Generate',review:'Review'}[S.view])]:'',
  h('span',{class:'sp'}),
  h('button',{class:'ghost small',onclick:()=>{S.world=true;render()},title:'The canonical World Definition library'},'World library'),
  h('label',{class:'dim small',title:'AI vs Mine: highlights AI-made choices on demand'},h('input',{type:'checkbox',checked:S.aiVs?true:null,onchange:e=>{S.aiVs=e.target.checked;render()}}),' AI vs Mine'),
  h('span',{class:'faint small'},'today '+money(S.cap.left)+' left'),h('div',{class:'meter'},h('i',{style:`width:${pct}%`})),
  h('button',{class:'ghost'+(S.ctl?' on':''),onclick:()=>{S.ctl=!S.ctl;render()}},'⚙ prototype controls'));
}

function pipeline(){
 const st=sceneStats(S.scene);
 const T_=[['prep','Scene Prep','Shots and what is in each',`${st.n} shots`],['gen','Generate','Look of the shot, then make it',`frames ${st.fa}/${st.fn}`],['review','Review','Do the Takes work together?',`${st.sel}/${st.n} picked`]];
 return h('div',{class:'pipe'},T_.map(([k,l,q,b],i)=>[i?h('span',{class:'parr'},'›'):'',h('button',{class:'ptab'+(S.view===k?' on':''),onclick:()=>{S.view=k;S.tk.fixMenu=false;render()}},h('span',{class:'pn'},i+1),h('span',{class:'col',style:'gap:0;align-items:flex-start'},h('b',{},l),h('span',{class:'pq'},S.view===k?q:b)))]));
}
function acceptBtn(){
 const scene=sc();
 if(!scene.shots.length)return'';
 return scene.acc?h('span',{class:'chip ok',title:'AI-chose marks are quiet now; the AI vs Mine toggle still shows them'},'Plan accepted'):
  h('button',{class:'ghost',onclick:()=>acceptPlan(S.scene),title:'Accepting quiets the AI-chose marks'},'Accept plan');
}
function sceneHead(){
 const scene=sc(),ids=Object.keys(D.scenes).map(Number),i=ids.indexOf(S.scene),st=sceneStats(S.scene);
 const next=S.view==='prep'?h('button',{class:'primary',onclick:()=>{S.view='gen';render()}},'Generate this shot ›'):S.view==='gen'?h('button',{onclick:()=>{S.view='review';render()}},'Review ›'):'';
 return h('div',{class:'shead'},
  h('button',{class:'ghost',onclick:()=>{S.view='hub';S.sel=S.scene;render()}},'← Hub'),
  h('div',{class:'col',style:'gap:0'},h('b',{style:'font-size:14px'},`${scene.id} · ${scene.sl} – ${scene.tm}`),h('span',{class:'faint small'},scene.shots.length?`${scene.name} · ${scene.shots.length} shots · ${fmt(st.made)} / ${fmt(st.plan)}`:'No shots yet')),
  scene.shots.length?pipeline():'',
  S.tk.back&&S.view!=='review'?h('button',{class:'primary backrev',onclick:T.back},'← Back to Review · '+S.tk.back.shot):'',
  scene.autoDrafted&&!scene.acc?h('span',{class:'faint small'},'drafted on entry · text only'):'',
  h('span',{class:'sp'}),acceptBtn(),U.scriptToggle(),
  h('button',{class:'ghost',disabled:i<1?true:null,onclick:()=>enterScene(ids[i-1],{view:S.view})},'‹'),h('button',{class:'ghost',disabled:i>=ids.length-1?true:null,onclick:()=>enterScene(ids[i+1],{view:S.view})},'›'),next);
}
function sceneView(){
 const s=cur(),scene=sc();
 let body;
 if(!scene.shots.length)body=h('div',{class:'bodyx'},U.emptyPlan());
 else if(S.view==='prep')body=P.layout();
 else if(S.view==='gen')body=h('div',{class:'genwrap'},h('div',{class:'genhead'},G.shotBar(s),S.genL==='3'?'':U.strip('gen',{head:false,w:null})),G.layout());
 else body=T.view();
 return h('div',{class:'main flexcol'},sceneHead(),
  h('div',{class:'bodyrow'},h('div',{class:'bodycol'},body),U.scriptDrawer(),S.view!=='review'?P.drawer():''));
}

/* ---- prototype controls: layouts and state jumps ---- */
function resetScene(id){D.scenes[id]=D.fresh()[id]}
function controls(){
 const J=(label,fn,tip)=>h('button',{class:'jb',title:tip||'',onclick:()=>{fn();}},label);
 const go=(view,shot,o={})=>{enterScene(7,{shot,view});if(o.role)S.role=o.role;S.drawer=null;S.lookNew=null;S.cine=null;S.ticket=null;if(o.fn)o.fn();render()};
 return h('div',{class:'protoctl'},h('div',{class:'row'},h('b',{class:'lbl'},'Prototype controls'),h('span',{class:'sp'}),h('button',{class:'ghost small',onclick:()=>{S.ctl=false;render()}},'✕')),
  h('div',{class:'ctlgrp'},'Scene Prep layout'),
  U.seg([['A','A · Strip + inspector'],['B','B · Storyboard → focus'],['C','C · Cast matrix']],S.prepL,v=>{S.prepL=v;S.focusB=false;render()},'ctlseg'),
  h('div',{class:'ctlgrp'},'Generate layout'),
  U.seg([['1','1 · Vertical pipeline'],['2','2 · Canvas + drawer'],['3','3 · Frame carousel']],S.genL,v=>{S.genL=v;render()},'ctlseg'),
  h('div',{class:'ctlgrp'},'Initial-plan auto-draft'),
  J('Scene 14: no plan, under $0.05 → auto-drafts on entry',()=>{resetScene(14);S.cap.left=4.62;S.cap.limit=5;enterScene(14)}),
  J('Scene 17: no plan, $0.08 → “Draft plan · $0.08”',()=>{resetScene(17);S.cap.left=4.62;enterScene(17)}),
  J('Cap breach: scene 19, $0.03 left → ticket, no Start',()=>{resetScene(19);S.cap.left=.03;enterScene(19);draftPlan(19)}),
  h('div',{class:'ctlgrp'},'Hand-built scene 7: Prep'),
  J('7F match cut + persistent lamp crack + shot-only dust',()=>go('prep','7F')),
  J('7G Marta wet → dry (persistent), Voss exits',()=>go('prep','7G')),
  J('7J: create “Bloodied tuxedo” Look for Voss',()=>go('prep','7J',{fn:()=>{S.drawer={mode:'asset',a:'voss'};S.lookNew={a:'voss',name:'Bloodied tuxedo',desc:'Black tuxedo, white shirt streaked with blood, bow tie pulled loose',mode:'generate',use:'end'}}})),
  J('7H reference shot with recompose note',()=>go('prep','7H')),
  h('div',{class:'ctlgrp'},'Hand-built scene 7: Generate'),
  J('7B partly approved (opening ✓, ending attempts)',()=>go('gen','7B',{role:'end'})),
  J('7F match cut, stale opening frame',()=>go('gen','7F')),
  J('7G CineBlock capture needs description',()=>go('gen','7G',{role:'end'})),
  J('7C ready: Block this shot, generate a Take',()=>go('gen','7C')),
  J('7H reference shot attached to opening',()=>go('gen','7H')),
  h('div',{class:'ctlgrp'},'Review'),
  J('Review 7C (3 takes, one ready-not-selected)',()=>go('review','7C')),
  J('Review 7G long shot, part 3 failed',()=>go('review','7G')),
  J('Review: wide take composer open',()=>go('review','7C',{fn:()=>{S.tk.composer=true}})),
  h('div',{class:'ctlgrp'},'Spend and failures'),
  J(S.failNext?'Next generation will fail ✓ (click to cancel)':'Make the next generation fail quietly',()=>{S.failNext=!S.failNext;render()}),
  J('Daily cap nearly reached ($0.20 left)',()=>{S.cap.left=.2;render()}),
  J('Restore cap ($4.62 left)',()=>{S.cap.left=4.62;render()}),
  J('Reset everything',()=>{location.href=location.pathname+'?prep='+S.prepL+'&gen='+S.genL}));
}

document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){if(S.cine){S.cine=null}else if(S.world){S.world=false}else if(S.preview){S.preview=null}else if(S.drawer){S.drawer=null;S.lookNew=null}else return;render();return}
 if(e.target.matches('input,textarea,select'))return;if(S.view==='hub'||S.view==='review')return;
 if(e.key==='['||e.key===']'){const L=shots(),i=idxOf(cur()),n=L[i+(e.key===']'?1:-1)];if(n){S.shot=n.id;render()}}});
if(Q.get('scene')){S.sel=+Q.get('scene');enterScene(+Q.get('scene'),{shot:Q.get('shot')||undefined,view:Q.get('view')||'prep'});if(Q.get('role'))S.role=Q.get('role')}
else if(Q.get('sel'))S.sel=+Q.get('sel');
if(Q.get('ctl'))S.ctl=true;
if(Q.get('script'))S.script.open=true;
if(Q.get('drawer')){const[m,a]=Q.get('drawer').split(':');S.drawer={mode:m,a}}
render();
})();

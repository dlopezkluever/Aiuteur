/* Review: the ratified #62 direction (prototype/v2-62-review, variant A) in the canonical shell. Sequence-first: a large viewer plays the picked Takes as one edited sequence;
   a runtime-proportional scene timeline with gap slates and a playhead; Scene / Whole film scope (whole film is drawn per SCENE, never per shot); swap = select (reversible, Undo);
   compare up to 3 replacing the viewer; Mark final (edit-through confirm); next / previous unsettled; "What's unsettled" on demand; Fix this shot returns to the exact shot.
   No frames here (they live in Generate). No Review-specific side rail (the global Outline already exists).
   One reconciliation: "Make another take" opens THE Takes composer (G.composer), the same component as Generate -> Takes. */
(()=>{
const T={};
const M=D.MODELS;
const ACK={};
const tlabels=(t,s)=>[M[t.model].n,t.guided?'guided':'',t.override?'prompt overridden':'',t.rv?'revoiced from Take '+t.rv:'',Math.abs(t.dur-s.dur)>.05?`${t.dur}s (planned ${s.dur})`:'',t.parts>1?t.parts+' parts':'',t.late||''].filter(Boolean).join(' · ');
const runtimeOf=s=>picked(s)?picked(s).dur:s.dur;
const allIds=()=>Object.keys(D.scenes).map(Number);
const scope=()=>S.tk.film?allIds().flatMap(id=>shots(id).map(s=>[id,s])):shots().map(s=>[S.scene,s]);
const stale=s=>!!picked(s)&&!ACK[s.id]&&rolesOf(s).some(r=>frame(s,r).stale);
const unset=s=>['pick','missing','fail'].includes(takeKind(s))||stale(s);
const F={all:()=>true,pick:s=>takeKind(s)==='pick',missing:s=>takeKind(s)==='missing',failed:s=>takeKind(s)==='fail',stale};
const match=s=>S.tk.filter==='all'||F[S.tk.filter](s);
const sceneMatch=id=>S.tk.filter==='all'||shots(id).some(match);
const goto=(sceneId,shotId)=>{if(sceneId!==S.scene){S.scene=sceneId;S.sel=sceneId}S.shot=shotId;S.tk.t=0;S.tk.cmp=[];S.tk.compare=false;S.tk.playing=false;clearInterval(timer);render()};

T.select=(s,t)=>{
 if(s.final&&s.sel!==t.id){S.tk.confirm={shot:s.id,take:t.id};render();return}
 if(s.sel===t.id){S.tk.t=0;S.tk.playing=true;T.play(true);return}
 const prev=s.sel;
 undoable(`Take ${t.n} is in the cut for ${s.id}${prev?' (swapped; Undo restores the other)':''}`,()=>{s.sel=t.id;t.fresh=0;S.tk.t=0;S.tk.compare=false;S.tk.cmp=[]});
};
/* next / previous unsettled, unconditional in both scopes; a filter narrows it ("next match") */
T.step=dir=>{
 const L=scope(),i=L.findIndex(([,s])=>s===cur()),ok=([,s])=>S.tk.filter==='all'?unset(s):match(s);
 const idx=L.map((x,k)=>[x,k]).filter(([x])=>ok(x));
 const nx=dir>0?idx.find(([,k])=>k>i):[...idx].reverse().find(([,k])=>k<i);
 if(nx)goto(nx[0][0],nx[0][1].id);else toast('No more unsettled shots in this direction');
};
/* Fix this shot: leave Review for the exact shot and the Generate state that needs the work; Back to Review returns to the same scene, shot, playhead and scope */
T.fix=(s,where='gen')=>{
 S.tk.back={scene:S.scene,shot:s.id,film:S.tk.film,t:S.tk.t};
 S.tk.fixMenu=false;S.tk.playing=false;clearInterval(timer);
 const un=rolesOf(s).find(r=>frame(s,r).st!=='appr');
 S.cmpPair=null;S.refLib=null;S.drawer=null;S.shot=s.id;
 if(where==='prep'){S.view='prep';S.sb=false}
 else{S.view='gen';if(un){S.genMode='frames';S.role=un}else S.genMode='takes'}
 render();
 toast(`Fixing ${s.id}${where==='prep'?' in Scene Prep':S.genMode==='takes'?' in Generate → Takes':' in Generate → Frames'}. “Back to Review” returns to the same shot and playhead.`);
};
T.back=()=>{const b=S.tk.back;S.tk.back=null;S.scene=b.scene;S.sel=b.scene;S.shot=b.shot;S.tk.film=b.film;S.tk.t=b.t||0;S.view='review';render()};

T.genTake=s=>G.genTake(s,{primary:!s.takes.length,label:s.takes.length?'Generate another':'Generate'});

/* ---- viewer ---- */
T.viewer=s=>{
 const t=picked(s),k=takeKind(s);
 const slate=(big,sub,act)=>h('div',{class:'slate k-'+k},h('div',{class:'big'},big),h('div',{class:'sub'},sub),act||'');
 let inner;
 if(t)inner=[A.el(A.take(s,t),'a-frame vframe'+(S.tk.playing?' playing':'')),h('div',{class:'cap'},h('b',{},s.id),s.name,h('small',{},tlabels(t,s)),stale(s)?h('span',{class:'whisper',title:'possibly out of date'}):''),h('div',{class:'tcode'},fmt(S.tk.t)+' / '+fmt(t.dur))];
 else if(k==='pick')inner=slate(`${s.takes.filter(x=>!x.rej).length} takes · none picked`,'Playback shows picked Takes only. Nothing is auto-selected.',h('button',{class:'primary',onclick:()=>{$('.tray')?.scrollIntoView({block:'nearest'});toast('Choose one of the Takes below')}},'Pick'));
 else if(k==='gen')inner=slate('Generating…','Cancelling may still be charged');
 else if(k==='fail')inner=slate(s.partial?`${s.partial.done} of ${s.partial.of} parts made`:(s.fail?.text||'Failed'),'Quiet failure: nothing else is blocked',T.genTake(s));
 else inner=slate('No take yet','This shot is a gap in the sequence',T.genTake(s));
 return h('div',{class:'viewer2 big'},inner);
};
let timer=null;
const flat=()=>scope().map(([id,s])=>s);
const nextShot=from=>{const L=flat(),i=L.indexOf(from);for(let j=i+1;j<L.length;j++){if(!S.tk.skip||picked(L[j]))return L[j]}return null};
const sceneOf=s=>allIds().find(id=>shots(id).includes(s));
T.play=(keep)=>{
 if(!keep)S.tk.playing=!S.tk.playing;
 clearInterval(timer);
 if(S.tk.playing){timer=setInterval(()=>{
  if(S.view!=='review'){S.tk.playing=false;clearInterval(timer);return}
  const s=cur();S.tk.t+=0.25*(S.tk.speed||1);
  if(S.tk.t>=runtimeOf(s)){const n=nextShot(s);if(n){S.tk.playing=true;goto(sceneOf(n),n.id);S.tk.playing=true;T.play(true)}else{S.tk.playing=false;clearInterval(timer);render()}return}
  const L=shots(),i=idxOf(s),ph=$('.playhead');
  if(ph){const tot=L.reduce((a,x)=>a+runtimeOf(x),0),pre=L.slice(0,i).reduce((a,x)=>a+runtimeOf(x),0);ph.style.left=((pre+S.tk.t)/tot*100)+'%'}
  const tc=$('.viewer2 .tcode');if(tc&&picked(s))tc.textContent=fmt(S.tk.t)+' / '+fmt(picked(s).dur);
  const tt=$('.timecode');if(tt){let b=0;for(const x of L){if(x===s)break;b+=runtimeOf(x)}tt.textContent=fmt(b+S.tk.t)}
 },250)}
 render();
};
T.transport=s=>{
 const L=shots(),i=idxOf(s);let before=0;for(let j=0;j<i;j++)before+=runtimeOf(L[j]);
 const prevS=flat()[flat().indexOf(s)-1],nextS=flat()[flat().indexOf(s)+1];
 return h('div',{class:'transport'},
  h('button',{class:'ghost icon',title:'Previous shot (←)',onclick:()=>{if(prevS)goto(sceneOf(prevS),prevS.id)}},'⏮'),
  h('button',{class:'primary',onclick:()=>T.play()},S.tk.playing?'❚❚ Pause':'▶ Play'),
  h('button',{class:'ghost icon',title:'Next shot (→)',onclick:()=>{if(nextS)goto(sceneOf(nextS),nextS.id)}},'⏭'),
  h('span',{class:'timecode'},fmt(before+S.tk.t)),
  h('label',{class:'small dim',title:'Skip shots that have no picked Take'},h('input',{type:'checkbox',checked:S.tk.skip?true:null,onchange:e=>{S.tk.skip=e.target.checked;render()}}),' Skip gaps'),
  h('label',{class:'small dim'},'speed ',U.sel([[1,'1×'],[2,'2×'],[4,'4×']],S.tk.speed||1,v=>{S.tk.speed=+v;render()})),
  h('button',{class:'ghost small',title:'Start a shot earlier so the cut into this one is judged in context',onclick:()=>{if(prevS)goto(sceneOf(prevS),prevS.id);S.tk.playing=true;T.play(true)}},'Play in context'),
  h('span',{class:'sp'}),
  T.fixMenu(s));
};
T.fixMenu=s=>h('div',{class:'fixwrap'},h('button',{class:'fixbtn',onclick:()=>{S.tk.fixMenu=!S.tk.fixMenu;render()}},'Fix this shot ▾'),
 S.tk.fixMenu?h('div',{class:'fixmenu'},
  h('div',{class:'fixsec'},h('b',{class:'lbl'},'Same shot, more work'),h('span',{class:'faint small'},'Opens the exact shot where it needs work'),
   h('button',{onclick:()=>T.fix(s,'gen')},'Open in Generate'),h('button',{onclick:()=>T.fix(s,'prep')},'Open in Scene Prep')),
  h('div',{class:'fixsec'},h('b',{class:'lbl'},'Just another Take'),h('span',{class:'faint small'},'Opens the same Take composer as Generate → Takes'),
   h('button',{onclick:()=>{S.tk.fixMenu=false;S.tk.composer=true;render();setTimeout(()=>$('.composer')?.scrollIntoView({block:'nearest'}),30)}},'Make another take…'))):'');

/* ---- timeline: width = runtime, gap slates with the action on the gap cell, playhead ---- */
T.timeline=()=>{
 const L=shots(),tot=L.reduce((a,x)=>a+runtimeOf(x),0),i=idxOf(cur()),pre=L.slice(0,i).reduce((a,x)=>a+runtimeOf(x),0);
 const cells=L.map(s=>{
  const k=takeKind(s),t=picked(s),n=s.takes.filter(x=>!x.rej).length;
  let act='';
  if(k==='pick')act=h('button',{class:'gapb',onclick:e=>{e.stopPropagation();goto(S.scene,s.id)}},'Pick');
  else if(k==='missing')act=U.spend('tl:'+s.id,'Generate',{total:takeEst(s).total,unknown:takeEst(s).unknown,count:1,what:'Generate '+s.id},()=>simulateTake(s),{primary:false,cls:'gapb'});
  else if(k==='fail')act=h('button',{class:'gapb',onclick:e=>{e.stopPropagation();goto(S.scene,s.id)}},'Retry');
  const sub=t?'T'+t.n:{pick:n+' takes · none picked',missing:'No take yet',fail:'failed',gen:'generating'}[k];
  return h('div',{class:'tcell k-'+k+(s.id===S.shot?' foc':'')+(match(s)?'':' dim'),style:`flex:${runtimeOf(s)} 1 0`,onclick:()=>goto(S.scene,s.id),title:`${s.id} · ${s.name} · ${runtimeOf(s)}s`},
   t?A.el(A.take(s,t),'a-frame tcv'):h('div',{class:'tgap'},h('span',{class:'tgi'},{pick:'?',missing:'∅',fail:'!',gen:'…'}[k])),
   h('div',{class:'tcl'},h('b',{},s.id),s.final?h('span',{class:'lock'},'🔒'):'',stale(s)||s.takes.some(x=>x.fresh&&s.sel!==x.id&&!x.rej)?h('span',{class:'whisper'}):'',h('span',{class:'sp'}),h('span',{class:'faint small tsub'},sub)),act)});
 return h('div',{class:'timeline2'},h('div',{class:'tlhead'},h('b',{},'Scene '+S.scene+' timeline'),h('span',{class:'faint small'},'width follows runtime · click a cell to inspect · Pick and Generate sit on the gap itself')),
  h('div',{class:'tlcells'},cells,h('div',{class:'playhead',style:`left:${(pre+S.tk.t)/tot*100}%`})));
};
function simulateTake(s){
 simulate('tk:'+s.id,()=>{s.fail=null;s.partial=null;const n=lastTakeN(s)+1;s.takes.push({id:uid('k'),model:modelOf(s),dur:s.dur,n,fresh:1});toast(`Take ${n} of ${s.id} is ready, not selected`)},1100);
}
/* whole film: coarse, per SCENE (never one block per shot); filters dim, stepping is unconditional */
T.film=()=>{
 const ids=allIds(),rt=id=>sc(id).shots.length?sceneStats(id).plan:estRuntime(id);
 const tot=ids.reduce((a,id)=>a+rt(id),0);let pre=0;for(const id of ids){if(id===S.scene)break;pre+=rt(id)}
 const L=shots(),frac=L.length?L.slice(0,idxOf(cur())).reduce((a,x)=>a+x.dur,0)/(sceneStats(S.scene).plan||1):0;
 const cells=ids.map(id=>{const st=sceneStats(id),n=st.n||1,w=k=>(st[k]/n*100)+'%';
  return h('div',{class:'sc'+(id===S.scene?' on':'')+(sceneMatch(id)?'':' dimmed'),style:`flex:${rt(id)} 1 0`,title:`Scene ${id} ${sc(id).name} · ${st.n?st.n+' shots':'No shots yet'}`,onclick:()=>{const f=shots(id)[0];S.scene=id;S.sel=id;S.shot=f?.id||null;S.tk.t=0;S.tk.playing=false;S.tk.cmp=[];S.tk.compare=false;render()}},
   h('span',{class:'sn'},id),h('div',{class:'sbar'},st.n?[h('i',{class:'s-sel',style:`width:${w('sel')}`}),h('i',{class:'s-pick',style:`width:${w('pick')}`}),h('i',{class:'s-miss',style:`width:${(st.missing+st.fail)/n*100}%`})]:h('i',{class:'s-none',style:'width:100%'})))});
 const st=sceneStats(S.scene);
 return h('div',{class:'col filmnav'},h('div',{class:'ribbon big'},cells,h('div',{class:'filmph',style:`left:calc(6px + (100% - 12px) * ${(pre+frac*rt(S.scene))/tot})`})),
  h('div',{class:'row small'},h('b',{},`Scene ${S.scene} · ${sc().name}`),h('span',{class:'dim'},st.n?`${st.sel} picked · ${st.pick} need a pick · ${st.missing+st.fail} missing or failed`:'No shots yet'),h('span',{class:'sp'}),
   h('span',{class:'faint small'},'One block per scene, width = runtime. Shots appear only inside the scene below.')));
};

/* ---- the selected shot's Takes ---- */
T.staleLine=s=>stale(s)?h('div',{class:'quiet'},h('i',{class:'whisper'}),' Possibly out of date · the opening or ending Frame changed after this Take was made · ',
 U.spend('rg:'+s.id,'Regenerate',{total:takeEst(s).total,unknown:takeEst(s).unknown,count:1,what:'Regenerate '+s.id},()=>simulateTake(s),{primary:false}),
 h('button',{class:'ghost small',onclick:()=>{ACK[s.id]=1;render()}},'It still fits'),h('button',{class:'ghost small',onclick:()=>{ACK[s.id]=1;render()}},'Keep as is'),h('span',{class:'faint small'},' nothing regenerates by itself')):'';
T.cards=s=>{
 const L=s.takes.filter(t=>!t.rej),rej=s.takes.filter(t=>t.rej);
 const cmp=S.tk.cmp;
 const card=t=>h('div',{class:'tkr'+(s.sel===t.id?' sel':'')},
  h('div',{class:'tkv',title:'Click to swap this Take into the sequence',onclick:()=>T.select(s,t)},A.el(A.take(s,t),'a-frame'),h('span',{class:'tdur'},t.dur+'s'),s.sel===t.id?h('span',{class:'tpin'},'In the cut'):''),
  h('div',{class:'row'},h('b',{},'Take '+t.n),t.fresh&&s.sel!==t.id?h('span',{class:'tnew2'},'ready, not selected'):''),
  h('div',{class:'faint small'},tlabels(t,s)),
  h('div',{class:'acts'},s.sel===t.id?h('button',{onclick:()=>undoable('Unselected',()=>{if(!s.final)s.sel=null})},'Unselect'):h('button',{class:'primary',onclick:()=>T.select(s,t)},'Pick'),
   h('button',{class:'ghost',onclick:()=>undoable('Take rejected',()=>{t.rej=1;if(s.sel===t.id&&!s.final)s.sel=null;S.tk.cmp=S.tk.cmp.filter(x=>x!==t.id)})},'Reject'),
   h('label',{class:'small dim',title:'Add to compare (up to 3)'},h('input',{type:'checkbox',checked:cmp.includes(t.id)?true:null,onchange:e=>{if(e.target.checked){if(cmp.length>=3){toast('Compare holds up to 3 Takes');}else cmp.push(t.id)}else S.tk.cmp=cmp.filter(x=>x!==t.id);S.tk.compare=S.tk.cmp.length>=2;render()}}),' compare'),
   t.parts>1?h('button',{class:'ghost',title:`Reuses parts 1–${t.parts-1}, makes part ${t.parts}`,onclick:()=>{S.tk.composer=true;render()}},'From part '+t.parts):''));
 return h('div',{class:'tray'},
  h('div',{class:'thead'},h('h4',{},`${s.id} · ${s.name}`),h('span',{class:'dim'},`${s.dur}s planned · ${L.length} take${L.length===1?'':'s'}`),s.final?h('span',{class:'lock'},'🔒 Marked final'):'',h('span',{class:'sp'}),
   h('button',{class:S.tk.compare?'on':'',disabled:cmp.length<2?true:null,title:cmp.length<2?'Tick compare on two or three Takes':'',onclick:()=>{S.tk.compare=!S.tk.compare;render()}},'Compare'+(cmp.length?' ('+cmp.length+')':'')),
   h('button',{class:'ghost',disabled:!picked(s)?true:null,title:'An optional, stronger signal than a Pick. Not required.',onclick:()=>undoable(s.final?'Final mark removed':'Marked final',()=>{s.final=s.final?0:1})},s.final?'Unlock':'Mark final')),
  S.tk.confirm&&S.tk.confirm.shot===s.id?h('div',{class:'confirm'},'This shot is marked final. Change the pick anyway? ',h('button',{class:'primary',onclick:()=>{const c=S.tk.confirm,t=s.takes.find(x=>x.id===c.take);S.tk.confirm=null;undoable('Pick changed on a final shot',()=>{s.sel=t.id;t.fresh=0})}},'Change pick'),h('button',{onclick:()=>{S.tk.confirm=null;render()}},'Keep')):'',
  T.staleLine(s),
  s.partial?h('div',{class:'quiet'},`${s.partial.done} of ${s.partial.of} parts made · part ${s.partial.done+1} failed (may have been charged) · `,U.spend('tkp:'+s.id,'Retry part '+(s.partial.done+1),{total:+(M.kling.rate*6).toFixed(2),count:1,what:'Retry part '+(s.partial.done+1)+' of '+s.id},()=>simulate('tkp:'+s.id,()=>{s.partial=null;s.fail=null;const k=s.takes[0];if(k)k.fresh=1;toast('Part made. The Take is ready, not selected')}),{primary:false})):'',
  s.fail&&!s.partial?h('div',{class:'quiet fail'},s.fail.text):'',
  L.length?h('div',{class:'tkrow2'},L.map(card)):h('div',{class:'faint'},'No takes yet for this shot.'),
  rej.length?h('details',{class:'faint small'},h('summary',{},rej.length+' rejected'),rej.map(t=>h('div',{class:'row'},h('span',{},`Take ${t.n}`),h('button',{class:'ghost small',onclick:()=>{t.rej=0;render()}},'Restore')))):'',
  S.tk.composer?'':h('div',{class:'make'},h('button',{onclick:()=>{S.tk.composer=true;render();setTimeout(()=>$('.composer')?.scrollIntoView({block:'nearest'}),30)}},'Make another take…'),h('span',{class:'faint small'},'Opens the Takes composer, the same one as Generate → Takes.')),
  S.tk.film?h('div',{class:'faint small'},'Export package: picked Takes only · unpicked and missing shots are listed quietly, nothing blocks.'):'');
};
/* compare: up to 3 Takes replace the viewer; the timeline stays visible so the judgment keeps its sequence context */
T.compare=s=>{
 const ts=S.tk.cmp.map(id=>s.takes.find(t=>t.id===id)).filter(t=>t&&!t.rej);
 return h('div',{class:'cmpwrap col',style:'gap:10px'},h('div',{class:'cmp',style:`--n:${ts.length}`},ts.map(t=>h('div',{class:'cpanel'},
  h('div',{class:'viewer2 sm'},A.el(A.take(s,t),'a-frame'+(S.tk.cmpPlay?' playing':'')),h('div',{class:'cap'},'Take '+t.n,h('small',{},M[t.model].n)),h('div',{class:'tcode'},t.dur+' s')),
  h('div',{class:'pt'},h('b',{},'Take '+t.n),s.sel===t.id?h('span',{class:'tpin2'},'In the cut'):'',h('span',{class:'dim small'},tlabels(t,s)),h('span',{class:'sp'}),
   s.sel===t.id?h('button',{onclick:()=>undoable('Unselected',()=>{if(!s.final)s.sel=null})},'Unselect'):h('button',{class:'primary',onclick:()=>T.select(s,t)},'Select'),
   h('button',{class:'ghost',title:'Remove from compare',onclick:()=>{S.tk.cmp=S.tk.cmp.filter(x=>x!==t.id);S.tk.compare=S.tk.cmp.length>=2;render()}},'✕'))))),
  h('div',{class:'row',style:'justify-content:center;gap:12px'},h('button',{onclick:()=>{S.tk.cmpPlay=!S.tk.cmpPlay;render()}},S.tk.cmpPlay?'❚❚ Pause all':'▶ Play together'),
   h('span',{class:'faint small'},'Select swaps it into the sequence · you can swap back'),h('button',{class:'ghost',onclick:()=>{S.tk.compare=false;render()}},'Back to the sequence')));
};
T.composer=s=>h('div',{class:'composer'},h('div',{class:'row'},h('h4',{style:'margin:0'},'Make another take · '+s.id),h('span',{class:'faint small'},'the Generate → Takes composer, opened here'),h('span',{class:'sp'}),h('button',{class:'ghost',onclick:()=>{S.tk.composer=false;render()}},'Close')),G.composer(s,{wide:true,nogo:true}));
T.unsettledPop=()=>{
 const un=scope().filter(([,s])=>unset(s));
 return h('div',{class:'popl'},h('div',{class:'row'},h('b',{},"What's unsettled"),h('span',{class:'faint small'},S.tk.film?'whole film':'this scene'),h('span',{class:'sp'}),h('button',{class:'ghost small',onclick:()=>{S.tk.unsettled=false;render()}},'✕')),
  un.length?un.map(([id,s])=>{const k=takeKind(s);return h('div',{class:'urow'},h('b',{onclick:()=>{S.tk.unsettled=false;goto(id,s.id)},style:'cursor:pointer'},s.id),h('span',{class:'dim'},k==='sel'?'Possibly out of date':{pick:'Needs a pick',missing:'No take yet',fail:'Failed',gen:'Generating'}[k]),h('span',{class:'sp'}),
   k==='pick'||k==='sel'?h('button',{class:'small',onclick:()=>{S.tk.unsettled=false;goto(id,s.id)}},k==='sel'?'Review':'Pick'):id===S.scene?T.genTake(s):h('button',{class:'small',onclick:()=>{S.tk.unsettled=false;goto(id,s.id)}},'Open'))}):h('div',{class:'faint'},'Everything here is settled.'))};

T.view=()=>{
 const s=cur(),L=scope().map(x=>x[1]),un=L.filter(unset).length,st=sceneStats(S.scene);
 const missing=L.filter(x=>takeKind(x)==='missing'&&scope().find(q=>q[1]===x)[0]===S.scene);
 const mTot=missing.reduce((a,x)=>a+takeEst(x).total,0);
 const chip=(f,l,n)=>h('button',{class:S.tk.filter===f?'on':'',onclick:()=>{S.tk.filter=S.tk.filter===f?'all':f;render()}},l+(n!=null?' · '+n:''));
 const cnt=fn=>L.filter(fn).length;
 const batch=missing.length?U.spend('batch:miss',`Generate missing · ${missing.length}`,{total:mTot,count:missing.length,what:`Generate ${missing.length} missing shot${missing.length>1?'s':''} in scene ${S.scene}`},()=>missing.forEach(simulateTake),{primary:false}):'';
 return h('div',{class:'review bodyx','data-scroll':'review'},
  h('div',{class:'thead2'},h('b',{style:'font-size:15px'},'Review'),h('span',{class:'dim'},S.tk.film?`Whole film · ${L.length} shots`:`Scene ${S.scene} · as made ${fmt(st.made)} · planned ${fmt(st.plan)} · ${st.sel} of ${st.n} picked`),h('span',{class:'sp'}),
   batch,
   h('div',{class:'seg'},h('button',{class:!S.tk.film?'on':'',onclick:()=>{S.tk.film=false;render()}},'Scene'),h('button',{class:S.tk.film?'on':'',onclick:()=>{S.tk.film=true;render()}},'Whole film')),
   h('button',{class:'ghost',onclick:()=>T.step(-1)},'‹ Unsettled'),h('button',{class:'ghost',onclick:()=>T.step(1)},'Unsettled ›'),
   h('button',{class:un?'quietbtn':'ghost',onclick:()=>{S.tk.unsettled=!S.tk.unsettled;render()}},un?`${un} unsettled`:'All settled')),
  h('div',{class:'fchips'},chip('all','All',L.length),chip('pick','Needs a pick',cnt(F.pick)),chip('missing','Missing',cnt(F.missing)),chip('failed','Failed',cnt(F.failed)),chip('stale','Possibly out of date',cnt(F.stale)),
   S.tk.filter!=='all'?h('span',{class:'faint small'},'dims what does not match · ‹ › step through the matches'):'',
   h('span',{class:'sp'}),h('span',{class:'legend'},h('span',{},h('i',{style:'background:var(--ok)'}),'picked'),h('span',{},h('i',{style:'background:var(--accent)'}),'needs a pick'),h('span',{},h('i',{style:'background:#3a3f4b'}),'missing'))),
  S.tk.unsettled?T.unsettledPop():'',
  S.tk.film?T.film():'',
  !s?h('div',{class:'empty small'},h('h3',{},'No shots yet'),h('p',{},'Scene '+S.scene+' has no shots to review.')):
  [h('div',{class:'col',style:'gap:10px;min-width:0'},S.tk.compare&&S.tk.cmp.length>=2?T.compare(s):[T.viewer(s),T.transport(s)]),
   T.timeline(),T.cards(s),S.tk.composer?T.composer(s):'']);
};
window.T=T;
document.addEventListener('keydown',e=>{if(S.view!=='review'||e.target.matches('input,textarea,select,button'))return;
 if(e.code==='Space'){e.preventDefault();T.play()}
 else if(e.key==='ArrowRight'||e.key==='ArrowLeft'){const L=flat(),i=L.indexOf(cur()),n=L[i+(e.key==='ArrowRight'?1:-1)];if(n)goto(sceneOf(n),n.id)}});
})();

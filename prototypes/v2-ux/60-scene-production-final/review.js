/* Review: the #62 Variant A concept, kept light (Scene / Whole film, runtime-proportional timeline, playback, pick, compare, Mark final, unsettled stepping, wide take composer).
   Its job is sequence judgment. Fix this shot returns to the exact Generate state; Open in Scene Prep for deeper shot work. */
(()=>{
const T={};
const M=D.MODELS;
const tlabels=(t,s)=>[M[t.model].n,t.guided?'guided':'',t.override?'prompt overridden':'',Math.abs(t.dur-s.dur)>.05?`${t.dur}s (planned ${s.dur})`:'',t.parts>1?t.parts+' parts':'',t.late||''].filter(Boolean).join(' · ');
const runtimeOf=s=>picked(s)?picked(s).dur:s.dur;

T.select=(s,t)=>{
 if(s.final&&s.sel!==t.id){S.tk.confirm={shot:s.id,take:t.id};render();return}
 undoable(`Take ${t.n} selected for ${s.id}`,()=>{s.sel=t.id;t.fresh=0});
};
T.step=dir=>{
 const L=shots(),i=idxOf(cur()),un=L.map((s,k)=>[s,k]).filter(([s])=>['pick','missing','fail'].includes(takeKind(s)));
 const nx=dir>0?un.find(([,k])=>k>i):[...un].reverse().find(([,k])=>k<i);
 if(nx){S.shot=nx[0].id;S.tk.t=0;render()}else toast('No more unsettled shots in this direction');
};
/* Fix this shot: leave Review, land in the exact Generate state for this shot, remember where to come back to */
T.fix=(s,where='gen')=>{
 S.tk.back={scene:S.scene,shot:s.id,film:S.tk.film,t:S.tk.t};
 S.tk.fixMenu=false;
 const roles=rolesOf(s),un=roles.find(r=>frame(s,r).st!=='appr');
 S.role=un||roles[0]||'open';S.view=where==='prep'?'prep':'gen';S.cmpPair=null;S.sb=false;S.genMode='frames';S.refLib=null;S.drawer=null;
 render();
 toast(`Fixing ${s.id}. “Back to Review” returns to the same shot and playhead.`);
};
T.back=()=>{const b=S.tk.back;S.tk.back=null;S.scene=b.scene;S.shot=b.shot;S.tk.film=b.film;S.tk.t=b.t||0;S.view='review';render()};

T.genTake=s=>G.genTake(s,{primary:!s.takes.length,label:s.takes.length?'Make another take':'Generate'});

/* ---- viewer with simulated playback ---- */
T.viewer=s=>{
 const t=picked(s),k=takeKind(s);
 const slate=(big,sub,act)=>h('div',{class:'slate'},h('div',{class:'big'},big),h('div',{class:'sub'},sub),act||'');
 let inner;
 if(t)inner=[A.el(A.take(s,t),'a-frame vframe'+(S.tk.playing?' playing':'')),h('div',{class:'cap'},h('b',{},s.id),s.name,h('small',{},tlabels(t,s))),h('div',{class:'tcode'},fmt(S.tk.t)+' / '+fmt(t.dur))];
 else if(k==='pick')inner=slate(`${s.takes.filter(x=>!x.rej).length} takes · none picked`,'Nothing is auto-selected.',h('button',{class:'primary',onclick:()=>{$('.tray')?.scrollIntoView({block:'nearest'});toast('Choose one of the Takes below')}},'Pick'));
 else if(k==='gen')inner=slate('Generating…','May still be charged if cancelled');
 else if(k==='fail')inner=slate(s.partial?`${s.partial.done} of ${s.partial.of} parts made`:(s.fail?.text||'Failed'),'Quiet failure: nothing else is blocked',T.genTake(s));
 else inner=slate('No take yet','',T.genTake(s));
 return h('div',{class:'viewer2'},inner);
};
let timer=null;
T.play=()=>{
 S.tk.playing=!S.tk.playing;clearInterval(timer);
 if(S.tk.playing){timer=setInterval(()=>{
   const L=shots(),s=cur(),i=idxOf(s);S.tk.t+=0.5;
   const ph=$('.playhead');
   if(S.tk.t>=runtimeOf(s)){const n=L[i+1];if(n){S.shot=n.id;S.tk.t=0;render()}else{S.tk.playing=false;clearInterval(timer);render()}}
   else if(ph){const tot=L.reduce((a,x)=>a+runtimeOf(x),0),pre=L.slice(0,i).reduce((a,x)=>a+runtimeOf(x),0);ph.style.left=((pre+S.tk.t)/tot*100)+'%';const tc=$('.tcode');if(tc)tc.textContent=fmt(S.tk.t)+' / '+fmt(runtimeOf(s))}
  },250)}
 render();
};

/* ---- timeline (width = runtime) with gap actions on the gap cell ---- */
T.timeline=()=>{
 const L=shots(),tot=L.reduce((a,x)=>a+runtimeOf(x),0),i=idxOf(cur()),pre=L.slice(0,i).reduce((a,x)=>a+runtimeOf(x),0);
 const cells=L.map(s=>{
  const k=takeKind(s),t=picked(s),n=s.takes.filter(x=>!x.rej).length;
  let act='';
  if(k==='pick')act=h('button',{class:'gapb',onclick:e=>{e.stopPropagation();S.shot=s.id;render()}},'Pick');
  else if(k==='missing')act=U.spend('tl:'+s.id,'Generate',{total:takeEst(s).total,unknown:takeEst(s).unknown,count:1,what:'Generate '+s.id},()=>simulateTake(s),{primary:false,cls:'gapb'});
  else if(k==='fail')act=h('button',{class:'gapb',onclick:e=>{e.stopPropagation();S.shot=s.id;render()}},s.partial?'Retry':'Retry');
  return h('div',{class:'tcell k-'+k+(s.id===S.shot?' foc':''),style:`flex:${runtimeOf(s)} 1 0`,onclick:()=>{S.shot=s.id;S.tk.t=0;render()},title:`${s.id} · ${s.name} · ${runtimeOf(s)}s`},
   t?A.el(A.take(s,t),'a-frame tcv'):h('div',{class:'tgap'},h('span',{class:'tgi'},{pick:'?',missing:'∅',fail:'!',gen:'…'}[k])),
   h('div',{class:'tcl'},h('b',{},s.id),s.final?h('span',{class:'lock'},'🔒'):'',s.takes.some(x=>x.fresh&&s.sel!==x.id)?h('span',{class:'whisper'}):'',h('span',{class:'sp'}),h('span',{class:'faint small'},t?'T'+t.n:{pick:n+' takes',missing:'no take',fail:'failed',gen:'…'}[k])),act)});
 return h('div',{class:'timeline2'},h('div',{class:'tlcells'},cells,h('div',{class:'playhead',style:`left:${(pre+S.tk.t)/tot*100}%`})));
};
function simulateTake(s){
 const key='tk:'+s.id,m=modelOf(s);
 simulate(key,()=>{s.fail=null;s.partial=null;const n=lastTakeN(s)+1;s.takes.push({id:uid('k'),model:m,dur:s.dur,n,fresh:1});toast(`Take ${n} of ${s.id} is ready, not selected`)},1100);
}
T.film=()=>{
 const ids=Object.keys(D.scenes).map(Number);
 const rt=id=>sc(id).shots.length?sceneStats(id).plan:estRuntime(id);
 const fs=S.tk.filmSel??S.scene,st=sceneStats(fs);
 const cells=ids.map(id=>{const st=sceneStats(id),n=st.n||1,w=k=>(st[k]/n*100)+'%';
  return h('div',{class:'sc'+(id===fs?' on':''),style:`flex:${rt(id)} 1 0`,title:`Scene ${id} ${sc(id).name} · ${st.n?st.n+' shots':'No shots yet'}`,onclick:()=>{S.tk.filmSel=id;render()}},
   h('span',{class:'sn'},id),h('div',{class:'sbar'},st.n?[h('i',{class:'s-sel',style:`width:${w('sel')}`}),h('i',{class:'s-pick',style:`width:${w('pick')}`}),h('i',{class:'s-miss',style:`width:${(st.missing+st.fail)/n*100}%`})]:''))});
 return h('div',{class:'col filmnav'},h('div',{class:'ribbon big'},cells),
  h('div',{class:'row small'},h('b',{},`Scene ${fs} · ${sc(fs).name}`),h('span',{class:'dim'},st.n?`${st.sel} picked · ${st.pick} need a pick · ${st.missing+st.fail} missing or failed`:'No shots yet'),h('span',{class:'sp'}),
   h('button',{onclick:()=>{S.tk.film=false;S.scene=fs;S.shot=sc(fs).shots[0]?.id||null;render()}},'Review scene '+fs)),
  h('div',{class:'faint small'},'One block per scene, width = runtime. Individual shots appear only inside a scene.'));
};

/* ---- the selected shot's Takes ---- */
T.cards=s=>{
 const L=s.takes.filter(t=>!t.rej),rej=s.takes.filter(t=>t.rej);
 const cmp=S.tk.cmp;
 const card=t=>h('div',{class:'tkr'+(s.sel===t.id?' sel':'')},
  h('div',{class:'tkv',onclick:()=>T.select(s,t)},A.el(A.take(s,t),'a-frame'),h('span',{class:'tdur'},t.dur+'s'),s.sel===t.id?h('span',{class:'tpin'},'In the cut'):''),
  h('div',{class:'row'},h('b',{},'Take '+t.n),t.fresh&&s.sel!==t.id?h('span',{class:'tnew2'},'ready, not selected'):''),
  h('div',{class:'faint small'},tlabels(t,s)),
  h('div',{class:'acts'},s.sel===t.id?h('button',{onclick:()=>undoable('Unselected',()=>{if(!s.final)s.sel=null})},'Unselect'):h('button',{class:'primary',onclick:()=>T.select(s,t)},'Select'),
   h('button',{class:'ghost',onclick:()=>undoable('Take rejected',()=>{t.rej=1;if(s.sel===t.id&&!s.final)s.sel=null})},'Reject'),
   h('label',{class:'small dim'},h('input',{type:'checkbox',checked:cmp.includes(t.id)?true:null,onchange:e=>{if(e.target.checked){if(cmp.length>=3){toast('Compare up to 3');}else cmp.push(t.id)}else S.tk.cmp=cmp.filter(x=>x!==t.id);render()}}),' compare')));
 return h('div',{class:'tray'},
  h('div',{class:'thead'},h('h4',{},`${s.id} · ${s.name}`),h('span',{class:'dim'},`${s.dur}s planned · ${L.length} take${L.length===1?'':'s'}`),s.final?h('span',{class:'lock'},'🔒 Marked final'):'',h('span',{class:'sp'}),
   cmp.length>=2?h('button',{onclick:()=>{S.tk.compare=true;render()}},`Compare ${cmp.length}`):'',
   h('button',{class:'ghost',disabled:!picked(s)?true:null,onclick:()=>undoable(s.final?'Final mark removed':'Marked final',()=>{s.final=s.final?0:1})},s.final?'Unlock':'Mark final'),
   h('div',{class:'fixwrap'},h('button',{class:'fixbtn',onclick:()=>{S.tk.fixMenu=!S.tk.fixMenu;render()}},'Fix this shot ▾'),
    S.tk.fixMenu?h('div',{class:'fixmenu'},
     h('div',{class:'fixsec'},h('b',{class:'lbl'},'Quick adjustment'),h('span',{class:'faint small'},'Stay here: another Take with a nudge'),
      h('div',{class:'row'},h('input',{id:'quickg',placeholder:'e.g. slower push-in',value:S.tk.guid[s.id]||'',onchange:e=>{S.tk.guid[s.id]=e.target.value}}),T.genTake(s))),
     h('div',{class:'fixsec'},h('b',{class:'lbl'},'Full shot work'),h('button',{onclick:()=>T.fix(s,'gen')},'Open in Generate'),h('button',{onclick:()=>T.fix(s,'prep')},'Open in Scene Prep'))):'')),
  S.tk.confirm&&S.tk.confirm.shot===s.id?h('div',{class:'confirm'},'This shot is marked final. Change the pick anyway? ',h('button',{class:'primary',onclick:()=>{const c=S.tk.confirm,t=s.takes.find(x=>x.id===c.take);S.tk.confirm=null;undoable('Pick changed on a final shot',()=>{s.sel=t.id;t.fresh=0})}},'Change pick'),h('button',{onclick:()=>{S.tk.confirm=null;render()}},'Keep')):'',
  s.partial?h('div',{class:'quiet'},`2 of 3 parts made · part 3 failed (may have been charged) `,U.spend('tkp:'+s.id,'Retry part 3',{total:+(M.kling.rate*6).toFixed(2),count:1,what:'Retry part 3 of '+s.id},()=>simulate('tkp:'+s.id,()=>{s.partial=null;s.fail=null;const k=s.takes[0];if(k)k.fresh=1;toast('Part 3 made. Take is ready, not selected')}),{primary:false})):'',
  s.fail&&!s.partial?h('div',{class:'quiet fail'},s.fail.text):'',
  L.length?h('div',{class:'tkrow2'},L.map(card)):h('div',{class:'faint'},'No takes yet for this shot.'),
  rej.length?h('details',{class:'faint small'},h('summary',{},rej.length+' rejected'),rej.map(t=>h('div',{class:'row'},h('span',{},`Take ${t.n}`),h('button',{class:'ghost small',onclick:()=>{t.rej=0;render()}},'Restore')))):'',
  h('div',{class:'make'},S.tk.composer?'':[T.genTake(s),h('button',{onclick:()=>{S.tk.composer=true;render()}},'Open take composer…')]));
};
T.compare=s=>{
 const ts=S.tk.cmp.map(id=>s.takes.find(t=>t.id===id)).filter(Boolean);
 return h('div',{class:'cmp',style:`--n:${ts.length}`},ts.map(t=>h('div',{class:'cpanel'},h('div',{class:'viewer2 sm'},A.el(A.take(s,t),'a-frame'),h('div',{class:'cap'},'Take '+t.n)),
  h('div',{class:'pt'},h('b',{},'Take '+t.n),h('span',{class:'dim small'},tlabels(t,s)),h('span',{class:'sp'}),h('button',{class:'primary',onclick:()=>{S.tk.compare=false;S.tk.cmp=[];T.select(s,t)}},'Select')))).concat([h('div',{class:'row',style:'grid-column:1/-1'},h('button',{class:'ghost',onclick:()=>{S.tk.compare=false;render()}},'Back to the viewer'))]));
};
/* Review's Make another take opens THE take composer (G.composer), wide, over the timeline. No second composer exists. */
T.composer=s=>h('div',{class:'composer'},h('div',{class:'row'},h('h4',{style:'margin:0'},'Make another take · '+s.id),h('span',{class:'faint small'},'the same composer as Generate → Takes'),h('span',{class:'sp'}),h('button',{class:'ghost',onclick:()=>{S.tk.composer=false;render()}},'Close composer')),G.composer(s,{wide:true,nogo:true}));
T.unsettledPop=()=>{const un=unsettled();return h('div',{class:'popl'},h('div',{class:'row'},h('b',{},"What's unsettled"),h('span',{class:'sp'}),h('button',{class:'ghost small',onclick:()=>{S.tk.unsettled=false;render()}},'✕')),
 un.length?un.map(s=>{const k=takeKind(s);return h('div',{class:'urow'},h('b',{onclick:()=>{S.shot=s.id;S.tk.unsettled=false;render()},style:'cursor:pointer'},s.id),h('span',{class:'dim'},{pick:'Needs a pick',missing:'No take yet',fail:'Failed'}[k]),h('span',{class:'sp'}),
  k==='pick'?h('button',{class:'small',onclick:()=>{S.shot=s.id;S.tk.unsettled=false;render()}},'Pick'):T.genTake(s))}):h('div',{class:'faint'},'Everything is settled.'))};

T.view=()=>{
 const s=cur();
 if(!s)return h('div',{class:'pane'},U.emptyPlan());
 const un=unsettled().length,st=sceneStats(S.scene);
 return h('div',{class:'review bodyx','data-scroll':'review'},
  h('div',{class:'thead2'},h('b',{style:'font-size:15px'},'Review'),h('span',{class:'dim'},`as made ${fmt(st.made)} · planned ${fmt(st.plan)} · ${st.sel} of ${st.n} selected`),h('span',{class:'sp'}),
   h('div',{class:'seg'},h('button',{class:!S.tk.film?'on':'',onclick:()=>{S.tk.film=false;render()}},'Scene'),h('button',{class:S.tk.film?'on':'',onclick:()=>{S.tk.film=true;render()}},'Whole film')),
   h('button',{class:'ghost',onclick:()=>T.step(-1)},'‹ Unsettled'),h('button',{class:'ghost',onclick:()=>T.step(1)},'Unsettled ›'),
   h('button',{class:un?'quietbtn':'ghost',onclick:()=>{S.tk.unsettled=!S.tk.unsettled;render()}},un?`${un} unsettled`:'All settled')),
  S.tk.unsettled?T.unsettledPop():'',
  S.tk.film?T.film():'',
  h('div',{class:'reviewgrid'},
   h('div',{class:'col',style:'gap:10px;min-width:0'},
    S.tk.compare?T.compare(s):T.viewer(s),
    h('div',{class:'transport'},h('button',{class:'primary icon',onclick:T.play},S.tk.playing?'❚❚':'▶'),h('button',{class:'ghost icon',onclick:()=>{const L=shots(),i=idxOf(s);if(L[i-1]){S.shot=L[i-1].id;S.tk.t=0;render()}}},'⏮'),h('button',{class:'ghost icon',onclick:()=>{const L=shots(),i=idxOf(s);if(L[i+1]){S.shot=L[i+1].id;S.tk.t=0;render()}}},'⏭'),
     h('span',{class:'faint small'},'Plays the picked Takes in order · space = play'),h('span',{class:'sp'}),
     h('button',{class:'ghost small',onclick:()=>{S.tk.back={scene:S.scene,shot:s.id,film:S.tk.film,t:S.tk.t};T.fix(s,'gen')},title:'Back to Generate for this shot'},'Open in Generate'))),
   ),
  T.timeline(),
  T.cards(s),
  S.tk.composer?T.composer(s):'');
};
window.T=T;
document.addEventListener('keydown',e=>{if(S.view==='review'&&e.code==='Space'&&!e.target.matches('input,textarea,select,button')){e.preventDefault();T.play()}});
})();

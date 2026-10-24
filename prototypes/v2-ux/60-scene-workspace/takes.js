/* Takes stage: the #62-A pattern (runtime-proportional timeline, viewer, selected shot's Takes, Scene/Whole film toggle, wide take composer, no persistent right sidebar). Shared by U (Takes mode) and S (Takes stage). */
(()=>{
const T={};
const M=D.MODELS;
const tlabels=(t,s)=>[M[t.model].n,t.guided?'guided':'',t.override?'prompt overridden':'',Math.abs(t.dur-s.dur)>.05?`${t.dur}s (planned ${s.dur})`:'',t.parts>1?t.parts+' parts':'',t.late||''].filter(Boolean).join(' · ');
const unsettledList=()=>unsettled();

T.select=(s,t)=>{
 if(s.final&&s.sel!==t.id){S.tk.confirm={shot:s.id,take:t.id};render();return}
 undoable(`Take ${t.n} selected for ${s.id}`,()=>{s.sel=t.id;t.fresh=0});
};
T.step=dir=>{
 const L=shots(),i=idxOf(cur()),un=L.map((s,k)=>[s,k]).filter(([s])=>['pick','missing','fail'].includes(takeKind(s)));
 const nx=dir>0?un.find(([,k])=>k>i):[...un].reverse().find(([,k])=>k<i);
 if(nx){S.shot=nx[0].id;render()}else toast('No more unsettled shots in this direction');
};
T.genTake=(s)=>{
 const key='tk:'+s.id,e=takeEst(s),m=modelOf(s);
 const run=()=>simulate(key,()=>{s.fail=null;s.partial=null;s.takes=s.takes.filter(t=>!t.partialTake);const n=lastTakeN(s)+1;s.takes.push({id:uid('k'),model:m,dur:s.dur,n,guided:S.tk.guid[s.id]||undefined,fresh:1});toast(`Take ${n} of ${s.id} is ready, not selected`)},1100);
 return U.spend(key,s.takes.length?'Make another take':'Generate',{total:e.total,unknown:e.unknown,count:1,what:`${s.id} · ${M[m].n} · ${s.dur}s${e.parts>1?' in '+e.parts+' parts':''}`},run,{primary:!s.takes.length});
};

T.viewer=s=>{
 const t=picked(s),k=takeKind(s);
 const slate=(big,sub,act)=>h('div',{class:'slate'},h('div',{class:'big'},big),h('div',{class:'sub'},sub),act||'');
 let inner;
 if(t)inner=[h('div',{class:'clip',style:U.hue(s.hue,30)},h('div',{class:'bars t'}),h('div',{class:'bars b'})),h('div',{class:'cap'},h('b',{},s.id),s.name,h('small',{},tlabels(t,s)))];
 else if(k==='pick')inner=slate(`${s.takes.filter(x=>!x.rej).length} takes · none picked`,'Nothing is auto-selected.',h('button',{class:'primary',onclick:()=>{S.tk.focusTakes=true;render();toast('Choose one of the Takes below')}},'Pick'));
 else if(k==='gen')inner=slate('Generating…','May still be charged if cancelled');
 else if(k==='fail')inner=slate(s.partial?`${s.partial.done} of ${s.partial.of} parts made`:(s.fail?.text||'Failed'),'Quiet failure: nothing else is blocked',T.genTake(s));
 else inner=slate('No take yet','',T.genTake(s));
 return h('div',{class:'viewer'},inner);
};

T.timelineFilm=()=>{
 const ids=Object.keys(D.scenes).map(Number);
 const rt=id=>sc(id).shots.length?sceneStats(id).plan:estRuntime(id);
 const cells=ids.map(id=>{const st=sceneStats(id),n=st.n||1;const w=k=>(st[k]/n*100)+'%';
  return h('div',{class:'sc'+(id===S.scene?' on':''),style:`flex:${rt(id)} 1 0`,title:`Scene ${id} ${sc(id).name} · ${st.n?st.n+' shots':'No shots yet'}`,onclick:()=>{S.tk.filmSel=id;render()}},
   h('span',{class:'sn'},id),h('div',{class:'sbar'},st.n?[h('i',{class:'s-sel',style:`width:${w('sel')}`}),h('i',{class:'s-pick',style:`width:${w('pick')}`}),h('i',{class:'s-miss',style:`width:${w('missing')}`})]:''))});
 const fs=S.tk.filmSel??S.scene,st=sceneStats(fs);
 return h('div',{class:'col'},h('div',{class:'ribbon'},cells),
  h('div',{class:'row small'},h('b',{},`Scene ${fs} · ${sc(fs).name}`),h('span',{class:'dim'},st.n?`${st.sel} picked · ${st.pick} need a pick · ${st.missing+st.fail} missing or failed`:'No shots yet'),h('span',{class:'sp'}),
   h('button',{onclick:()=>{S.tk.film=false;enterScene(fs,{job:'takes',stage:'takes'})}},'Open scene review')),
  h('div',{class:'faint small'},'One block per scene, width = runtime. Individual shots appear only inside a scene.'));
};

T.cards=s=>{
 const L=s.takes.filter(t=>!t.rej),rej=s.takes.filter(t=>t.rej);
 const cmp=S.tk.cmp;
 const card=t=>h('div',{class:'tk'+(s.sel===t.id?' sel':'')},
  h('div',{class:'thumb',style:U.hue((s.hue+t.n*14)%360,30),onclick:()=>T.select(s,t)},h('span',{class:'d'},t.dur+'s'),s.sel===t.id?h('span',{class:'pin'},'Selected'):''),
  h('div',{class:'nm'},'Take '+t.n,t.fresh&&s.sel!==t.id?h('span',{class:'tag in'},'ready, not selected'):''),
  h('div',{class:'q'},tlabels(t,s)),
  h('div',{class:'acts'},s.sel===t.id?h('button',{onclick:()=>undoable('Unselected',()=>{if(s.final){return}s.sel=null})},'Unselect'):h('button',{class:'primary',onclick:()=>T.select(s,t)},'Select'),
   h('button',{class:'ghost',onclick:()=>undoable('Take rejected',()=>{t.rej=1;if(s.sel===t.id&&!s.final)s.sel=null})},'Reject'),
   h('label',{class:'small dim'},h('input',{type:'checkbox',checked:cmp.includes(t.id)?true:null,onchange:e=>{if(e.target.checked){if(cmp.length>=3){toast('Compare up to 3');}else cmp.push(t.id)}else S.tk.cmp=cmp.filter(x=>x!==t.id);render()}}),' compare')));
 return h('div',{class:'tray'},
  h('div',{class:'thead'},h('h4',{},`${s.id} · ${s.name}`),h('span',{class:'dim'},`${s.dur}s planned · ${L.length} take${L.length===1?'':'s'}`),s.final?h('span',{class:'lock'},'🔒 Marked final'):'',h('span',{class:'sp'}),
   cmp.length>=2?h('button',{onclick:()=>{S.tk.compare=true;render()}},`Compare ${cmp.length}`):'',
   h('button',{class:'ghost',disabled:!picked(s)?true:null,onclick:()=>undoable(s.final?'Final mark removed':'Marked final',()=>{s.final=s.final?0:1})},s.final?'Unlock':'Mark final'),
   h('button',{class:'ghost',onclick:()=>T.fix(s)},'Fix this shot')),
  S.tk.confirm&&S.tk.confirm.shot===s.id?h('div',{class:'confirm'},'This shot is marked final. Change the pick anyway? ',h('button',{class:'primary',onclick:()=>{const c=S.tk.confirm,t=s.takes.find(x=>x.id===c.take);S.tk.confirm=null;undoable('Pick changed on a final shot',()=>{s.sel=t.id;t.fresh=0})}},'Change pick'),h('button',{onclick:()=>{S.tk.confirm=null;render()}},'Keep')):'',
  s.partial?h('div',{class:'quiet'},`2 of 3 parts made · part 3 failed (may have been charged) `,U.spend('tkp:'+s.id,'Retry part 3',{total:+(M.kling.rate*6).toFixed(2),count:1,what:'Retry part 3 of '+s.id},()=>simulate('tkp:'+s.id,()=>{s.partial=null;s.fail=null;s.takes.forEach(t=>{if(t.partial)t.partial=0});const k=s.takes[0];if(k)k.fresh=1;toast('Part 3 made. Take is ready, not selected')}),{primary:false})):'',
  s.fail&&!s.partial?h('div',{class:'quiet fail'},s.fail.text):'',
  L.length?h('div',{class:'cards'},L.map(card)):h('div',{class:'faint'},'No takes yet for this shot.'),
  rej.length?h('details',{class:'faint small'},h('summary',{},rej.length+' rejected'),rej.map(t=>h('div',{class:'row'},h('span',{},`Take ${t.n}`),h('button',{class:'ghost small',onclick:()=>{t.rej=0;render()}},'Restore')))):'',
  h('div',{class:'make'},S.tk.composer?'':[T.genTake(s),h('button',{onclick:()=>{S.tk.composer=true;render()}},'Open take composer…')]));
};
T.fix=s=>{S.tk.back={shot:s.id};S.job='plan';S.stage='shots';S.sub='plan';render();toast('Fixing '+s.id+'. “Back to review” returns to the same shot.')};

T.compare=s=>{
 const ts=S.tk.cmp.map(id=>s.takes.find(t=>t.id===id)).filter(Boolean);
 return h('div',{class:'cmp',style:`--n:${ts.length}`},ts.map(t=>h('div',{class:'pane'},h('div',{class:'viewer sm'},h('div',{class:'clip',style:U.hue((s.hue+t.n*14)%360,30)}),h('div',{class:'cap'},'Take '+t.n)),
  h('div',{class:'pt'},h('b',{},'Take '+t.n),h('span',{class:'dim small'},tlabels(t,s)),h('span',{class:'sp'}),h('button',{class:'primary',onclick:()=>{S.tk.compare=false;S.tk.cmp=[];T.select(s,t)}},'Select')))).concat([h('div',{class:'row',style:'grid-column:1/-1'},h('button',{class:'ghost',onclick:()=>{S.tk.compare=false;render()}},'Back to the viewer'))]));
};

/* Wide take composer: model, guidance, prompt and ingredients, references, price. Near-full workspace width. */
T.composer=s=>{
 const m=modelOf(s),e=takeEst(s,m);
 return h('div',{class:'composer'},
  h('div',{class:'row'},h('h4',{style:'margin:0'},'Make another take · '+s.id),h('span',{class:'sp'}),h('button',{class:'ghost',onclick:()=>{S.tk.composer=false;render()}},'Close composer')),
  h('div',{class:'cgrid'},
   h('div',{class:'col'},
    h('label',{},h('span',{class:'flb'},'Model'),U.sel(Object.entries(M).map(([k,v])=>[k,v.n+' · '+(v.rate==null?'price unavailable':'$'+v.rate.toFixed(2)+'/s')]),m,v=>{S.tk.model[s.id]=v;S.ticket=null;render()})),
    h('label',{},h('span',{class:'flb'},'Guidance for this take'),U.ta(S.tk.guid[s.id]||'',v=>{S.tk.guid[s.id]=v},3,{placeholder:'e.g. slower push-in, warmer lamp'})),
    h('div',{class:'dim small'},`${s.dur}s${e.parts>1?' · '+e.parts+' parts on '+M[m].n+' (one Take, counts as one Generation)':''}`),
    h('div',{class:'row'},T.genTake(s))),
   h('div',{class:'col'},F.videoPrompt(s)),
   h('div',{class:'col'},h('b',{class:'lbl'},'References used'),
    s.refs.length?s.refs.map(r=>h('div',{class:'chip'},r.type==='shot'?`Reference shot ${r.srcShot} ${r.srcRole}`:r.label+' ('+r.scope+')')):h('span',{class:'faint small'},'None'),
    h('b',{class:'lbl',style:'margin-top:8px'},'Frames in'),rolesOf(s).length?rolesOf(s).map(k=>h('div',{class:'chip'+(frame(s,k).st==='appr'?' ok':'')},ROLE_NAME[k]+': '+stName(frame(s,k).st))):h('span',{class:'faint small'},'Frames skipped'),
    h('div',{class:'quiet'},rolesOf(s).some(k=>frame(s,k).st!=='appr')?'Some frames are not approved. Generating without them is allowed.':''))));
};
const stName=x=>({appr:'approved',cand:'not approved',none:'none yet'}[x]);

T.unsettledPop=()=>h('div',{class:'popl'},h('div',{class:'row'},h('b',{},"What's unsettled"),h('span',{class:'sp'}),h('button',{class:'ghost small',onclick:()=>{S.tk.unsettled=false;render()}},'✕')),
 unsettledList().length?unsettledList().map(s=>{const k=takeKind(s);return h('div',{class:'urow'},h('b',{onclick:()=>{S.shot=s.id;S.tk.unsettled=false;render()},style:'cursor:pointer'},s.id),h('span',{class:'dim'},{pick:'Needs a pick',missing:'No take yet',fail:'Failed'}[k]),h('span',{class:'sp'}),
  k==='pick'?h('button',{class:'small',onclick:()=>{S.shot=s.id;S.tk.unsettled=false;render()}},'Pick'):T.genTake(s))}):h('div',{class:'faint'},'Everything is settled.'));

T.stage=(o={})=>{
 const s=cur();
 if(!s)return U.emptyPlan();
 const un=unsettledList().length,st=sceneStats(S.scene);
 return h('div',{class:'takes'},
  h('div',{class:'thead2'},h('b',{},'Takes'),h('span',{class:'dim'},`as made ${fmt(st.made)} · planned ${fmt(st.plan)} · ${st.sel} of ${st.n} selected`),h('span',{class:'sp'}),
   h('div',{class:'seg'},h('button',{class:!S.tk.film?'on':'',onclick:()=>{S.tk.film=false;render()}},'Scene'),h('button',{class:S.tk.film?'on':'',onclick:()=>{S.tk.film=true;render()}},'Whole film')),
   h('button',{class:'ghost',onclick:()=>T.step(-1)},'‹ Unsettled'),h('button',{class:'ghost',onclick:()=>T.step(1)},'Unsettled ›'),
   h('button',{class:un?'quietbtn':'ghost',onclick:()=>{S.tk.unsettled=!S.tk.unsettled;render()}},un?`${un} unsettled`:'All settled')),
  S.tk.unsettled?T.unsettledPop():'',
  S.tk.film?T.timelineFilm():(o.timeline?U.strip('takes'):''),
  S.tk.compare?T.compare(s):T.viewer(s),
  T.cards(s),
  S.tk.composer?T.composer(s):'');
};
window.T=T;
})();

// Shared UI pieces for the three #60 directions: shell/outline, timeline (same component as #62 review), ticket, options, ad-hoc, removed, controls.
(()=>{
const UI=window.UI={};
const $m=n=>'$'+n.toFixed(2);UI.money=$m;
const price=(label,p,cls)=>h('button',{class:cls||'primary'},label,h('span',{class:'price'},'· '+p));

UI.thumb=(s,cls)=>{const x=F.endFrame(s);return x?h('div',{class:'img th '+(cls||''),style:`background:linear-gradient(135deg,hsl(${F.hue(x.id)} 30% 28%),hsl(${F.hue(x.id)+40} 25% 12%))`,title:'Last approved end frame'}):h('div',{class:'img th empty '+(cls||''),title:'No approved end frame yet'},h('span',{class:'faint'},'no end frame'))};
UI.status=s=>{const st=F.status(s);return h('span',{class:'chip st-'+st.c},st.t)};
UI.deps=s=>h('span',{class:'deps'},s.assets.map(a=>h('span',{class:'chip dep'},a)),s.needs.map(n=>h('span',{class:'quiet'},h('span',{class:'whisper'}),' '+n)));
UI.runtime=s=>{const st=F.stats(s);return h('span',{class:'rt'},st.n?h('b',{},F.fmt(st.plan)):h('span',{class:'faint'},'—'),' planned',st.sel?h('span',{class:'dim'},' · '+F.fmt(st.made)+' as made'):'',h('span',{class:'faint'},' · story est '+F.fmt(s.nm)))};
UI.slug=s=>h('span',{class:'slug'},h('b',{class:'num'},F.num(s)),h('span',{class:'line'},s.line+' – '+s.time),h('small',{class:'enc'},F.enc(s)));

// ---------- timeline: ONE component for planning runtime and #62 review (X6) ----------
UI.timeline=({scene,sel,onSel,scenes,onScene,sceneSel,draggable})=>{
  if(scenes){ // film scope: scenes sized by runtime, shots as ticks
    const wrap=h('div',{class:'tl film'});
    scenes.forEach(s=>{const st=F.stats(s),w=st.n?st.plan:s.nm*.8,picked=F.scope.has(s.id);
      const seg=h('div',{class:'seg'+(sceneSel===s.id?' on':'')+(picked?' picked':'')+(!st.n?' empty':''),style:`flex:${w} 1 0`,title:F.num(s)+' '+s.line+' · '+F.status(s).t,onclick:e=>onScene(s,e)},
        h('div',{class:'lab'},String(F.num(s)),s.locked?h('span',{class:'lock'},' 🔒'):''),
        h('div',{class:'ticks'},F.active(s).map(x=>h('i',{class:'k-'+F.kind(x)+(x.ood?' ood':'')}))));
      wrap.append(seg)});
    return wrap}
  const s=scene,L=F.labels(s),a=F.active(s);
  if(!a.length)return h('div',{class:'tl empty'},h('span',{class:'faint'},s.plan==='emptied'?'No active shots — the plan exists but is empty':'No shot plan yet'));
  const wrap=h('div',{class:'tl'});
  a.forEach(x=>{const k=F.kind(x);
    const txt={failed:'Failed · Retry · $0.56',gen:'Generating…',sel:'',final:'final',pick:x.takes+' takes · none picked',miss:'No take yet'}[k];
    const c=h('div',{class:'cell k-'+k+(sel===x.id?' on':''),style:`flex:${x.dur} 1 0`,title:L[x.id]+' · '+x.dur+'s · '+x.action,draggable:draggable?'true':null,'data-id':x.id,onclick:()=>onSel&&onSel(x)},
      k==='sel'||k==='final'?h('div',{class:'img',style:`position:absolute;inset:0;background:linear-gradient(135deg,hsl(${F.hue(x.id)} 28% 30%),hsl(${F.hue(x.id)+40} 24% 13%))`}):'',
      h('span',{class:'cl'},L[x.id],x.ood?h('span',{class:'whisper',title:'Possibly out of date'}):'',x.fromMerged?h('em',{class:'faint'},' ⊕'):''),
      h('span',{class:'ct'},txt,x.dur+'s'===txt?'':''),h('span',{class:'cd'},x.dur+'s'));
    if(draggable){c.addEventListener('dragstart',e=>{e.dataTransfer.setData('text',x.id)});c.addEventListener('dragover',e=>{e.preventDefault();c.classList.add('over')});c.addEventListener('dragleave',()=>c.classList.remove('over'));c.addEventListener('drop',e=>{e.preventDefault();F.moveTo(s,e.dataTransfer.getData('text'),x.id)})}
    wrap.append(c)});
  return wrap};
UI.timelineNote=h('div',{class:'faint small',style:'margin-top:4px;max-width:1100px'},'Same component as the #62 review timeline · dashed = no take yet · hatched = takes, none picked · dot = possibly out of date · ad-hoc and removed work are not on it.');

// ---------- spend ticket (inline, X2) ----------
UI.ticket=({title,lines,total,unknown,blocked,left,onStart,onNot,onTrim,onRaise,startLabel})=>h('div',{class:'ticket big'},
  h('div',{class:'row'},h('b',{},title),h('span',{class:'sp'}),h('span',{class:'faint'},unknown?'price unavailable for part of this':'total '+$m(total))),
  h('ul',{},lines.map(l=>h('li',{},l))),
  h('div',{class:'faint small'},'Left of today\'s cap: '+$m(left)+' · text only: no frames, worlds or Takes start'),
  h('div',{class:'row'},blocked?[h('span',{class:'quiet'},'This would pass your cap — no Start until it fits.'),onTrim?h('button',{onclick:onTrim},'Trim selection to fit'):'',h('button',{onclick:onRaise},'Raise cap for this action'),h('button',{class:'ghost',onclick:onNot},'Not now')]
    :[h('button',{class:'primary',onclick:onStart},startLabel||('Start'+(unknown?'':' · '+$m(total)))),h('button',{class:'ghost',onclick:onNot},'Not now')]));

// ---------- single scene: starting a plan ----------
UI.planStart=(s,P)=>{
  const k=F.enterKind(s);
  if(s.plan==='none'&&!s.shots.length){
    const c=h('div',{class:'card planstart'},h('div',{class:'row'},h('div',{},h('b',{},'No shot plan yet'),h('div',{class:'dim'},'Aiuteur drafts shots from this scene\'s narrative. Text only — nothing is framed or generated.'),
      k.auto?'':h('div',{class:'faint small'},k.unknown?'This price is unavailable, so it asks first.':k.k==='blocked'?'This would pass your cap.':k.total>=2?'Over $2.00, so it asks first.':'At $0.05 or more it waits for your click instead of drafting on entry.'))));
    const go=()=>{const before=F.snap();F.genPlan(s);s.auto=false;F.changed();toast('Drafted '+F.active(s).length+' shots · plan text only',()=>{F.restore(before);F.changed()})};
    if(k.k==='click'){c.append(h('div',{class:'row'},h('button',{class:'primary',onclick:go},'Draft plan',h('span',{class:'price'},'· '+$m(s.est))),k.auto?h('span',{class:'faint small'},'(you undid the automatic draft; it will not repeat while you stay)'):''))}
    else{c.append(h('div',{class:'row'},h('button',{class:'primary',onclick:()=>{F.tkt=F.tkt===s.id?null:s.id;F.changed()}},'Draft plan',h('span',{class:'price'},'· '+(k.unknown?'price unavailable':$m(s.est))))));
      if(F.tkt===s.id||k.k==='blocked')c.append(UI.ticket({title:'Draft plan · '+F.enc(s),lines:(k.k==='blocked'?['Would pass today\'s cap']:[]).concat(k.unknown?['A price is unavailable']:[]).concat(k.total>=2?['Total '+$m(k.total)+' is $2.00 or more']:[]),total:s.est,unknown:k.unknown,blocked:k.k==='blocked',left:F.cfg.capLeft,onStart:()=>{F.tkt=null;go()},onNot:()=>{F.tkt=null;F.changed()},onRaise:()=>{F.cfg.capLeft+=s.est;F.changed()},startLabel:k.unknown?'Start (price unavailable)':null}))}
    return c}
  if(s.plan==='emptied'&&!F.active(s).length){
    const r=s.shots.filter(x=>x.retired);
    return h('div',{class:'card planstart'},h('b',{},'Every shot is retired — this is still your plan'),h('div',{class:'dim'},'Nothing drafts automatically here. Retired shots keep their frames and takes.'),
      h('div',{class:'row wrap'},h('button',{onclick:()=>F.addShot(s)},'+ Add a shot'),price('Redraft as Options',$m(s.est),'')),
      h('div',{class:'col'},r.map(x=>h('div',{class:'row small'},h('span',{class:'dim'},x.action),h('span',{class:'sp'}),h('span',{class:'faint'},x.takes?x.takes+' takes kept':''),h('button',{class:'ghost',onclick:()=>F.unretire(s,x.id)},'Bring back')))));
  }
  return null};
UI.redraftBtn=(s)=>h('button',{title:'Returns Options. Never overwrites your edits.',onclick:()=>{const before=F.snap();const r=F.makeOptions(s);F.changed();toast(r==='direct'?'Nothing to protect — redraft applied':(s.locked?'Plan is locked — result held as Options':'Redraft ready as Options · nothing overwritten'),()=>{F.restore(before);F.changed()})}},'Redraft',h('span',{class:'price'},'· '+$m(s.est)));
UI.lockChip=s=>h('span',{class:'lockrow'},s.locked?h('span',{class:'chip'},'🔒 Plan locked'):'',h('button',{class:'ghost small',onclick:()=>F.lock(s,!s.locked)},s.locked?'Unlock':'Lock plan'));

// ---------- redraft / Draft-all results as Options ----------
UI.options=s=>{const o=s.opts;if(!o)return null;const L=F.labels(s);const open=[...o.changes,...o.proposals].filter(x=>x.st==='open').length;
  const sh=id=>s.shots.find(x=>x.id===id);
  const rowFor=(c)=>h('div',{class:'opt '+c.st},
    h('div',{class:'small'},h('b',{},c.field==='dur'?'Duration':'Action'),' · ',L[c.shot]||'shot'),
    c.field==='dur'?h('div',{class:'diff'},h('s',{},c.from+'s'),' → ',h('b',{},c.to+'s')):h('div',{class:'diff'},h('s',{class:'dim'},c.from),h('div',{},c.to)),
    c.st==='open'?h('div',{class:'row'},h('button',{disabled:o.held,onclick:()=>F.applyChange(s,c)},'Apply'),h('button',{class:'ghost',onclick:()=>F.dismiss(c)},'Dismiss')):h('div',{class:'faint small'},c.st==='applied'?'Applied':['Dismissed (retired) · ',h('a',{class:'lnk',onclick:()=>F.restoreIt(c)},'restore')]));
  return h('div',{class:'card opts'},
    h('div',{class:'row'},h('b',{},o.src==='draft-all'?'Draft all result · Options':'Redraft · Options'),h('span',{class:'chip'},open+' open'),h('span',{class:'sp'}),
      o.held?h('span',{class:'row'},h('span',{class:'quiet'},'🔒 Plan locked — held as Options'),h('button',{onclick:()=>F.lock(s,false)},'Unlock to apply')):h('button',{onclick:()=>F.applyAll(s)},'Apply all open'),h('button',{class:'ghost',onclick:()=>F.closeOpts(s)},'Done')),
    h('div',{class:'faint small'},'Your edited fields were left alone'+(o.kept?' ('+o.kept+' kept as yours)':'')+'. Applying marks dependent takes possibly out of date; nothing regenerates.'),
    o.changes.map(rowFor),
    o.proposals.map(p=>h('div',{class:'opt '+p.st},h('div',{class:'small'},h('b',{},'Proposed new shot'),p.anchor.length?h('span',{class:'faint'},' · covers '+p.anchor.join(', ')):''),h('div',{class:'diff'},p.action,' ',h('span',{class:'faint'},p.dur+'s')),
      p.st==='open'?h('div',{class:'row'},h('button',{disabled:o.held,onclick:()=>F.acceptProposal(s,p)},'Add shot'),h('button',{class:'ghost',onclick:()=>F.dismiss(p)},'Dismiss')):h('div',{class:'faint small'},p.st==='applied'?'Added':['Dismissed (retired) · ',h('a',{class:'lnk',onclick:()=>F.restoreIt(p)},'restore')]))),
    o.omitted.length?h('div',{class:'opt'},h('div',{class:'small'},h('b',{},'Not in the new draft')),h('div',{class:'dim'},o.omitted.map(id=>(L[id]||'shot')+' · '+(sh(id)?sh(id).action:'')).join(' / ')),h('div',{class:'faint small'},'Kept in your plan — omitted shots are listed, never retired by a redraft.'),
      h('div',{class:'row'},o.omitted.map(id=>h('button',{class:'ghost',onclick:()=>F.retire(s,id)},'Retire '+(L[id]||'')+' myself')))):'');
};

// ---------- shot detail form (the per-shot work area) ----------
UI.shotOps=(s,x)=>{const lk=s.locked,first=F.active(s)[0]===x,last=F.active(s).slice(-1)[0]===x,dis=lk?{disabled:true,title:'Plan locked'}:{};
  return h('span',{class:'ops'},h('button',Object.assign({title:'Earlier',disabled:first||lk,onclick:()=>F.reorder(s,x.id,-1)}),'↑'),h('button',{title:'Later',disabled:last||lk,onclick:()=>F.reorder(s,x.id,1)},'↓'),
    h('button',Object.assign({title:'Split into two shots',onclick:()=>F.split(s,x.id)},dis),'Split'),h('button',Object.assign({title:'Merge with next shot',disabled:last||lk,onclick:()=>F.mergeNext(s,x.id)}),'Merge ↓'),h('button',Object.assign({class:'ghost',title:'Retire — work is kept',onclick:()=>F.retire(s,x.id)},dis),'Retire'))};
UI.shotDetail=(s,x,noOps)=>{const L=F.labels(s),k=F.kind(x),camSel=h('select',{onchange:e=>{x.cam=e.target.value;x.camAi=false;x.touched.cam=true;F.changed()}},['WS · eye · static','MS · eye · static','CU · low · push in','OTS · eye · static','INS · high · static','MS · eye · tracking','ECU · eye · static','WS · high · static','MS · low · static','CU · eye · push in'].map(o=>h('option',{value:o,selected:o===x.cam},o)));
  const note=h('div',{class:'quiet narr',style:'display:'+(x.touched.action&&x.anchor.length?'block':'none')},'Differs from the narrative · ',h('a',{class:'lnk'},'Update the Master Narrative'),' · ',h('a',{class:'lnk'},'Keep for this shot only'),' · ',h('a',{class:'lnk'},'Decide later'));
  const st={failed:'Failed — muted, with a retry below',gen:'Generating…',sel:'A take is selected',final:'Final take',pick:x.takes+' takes · none picked',miss:'No take yet'}[k];
  return h('div',{class:'sd'},
    h('div',{class:'row'},h('h3',{},'Shot '+(L[x.id]||'(retired)')),h('span',{class:'chip'},st),x.ood?h('span',{class:'quiet'},h('span',{class:'whisper'}),' possibly out of date'):'',x.fromMerged?h('span',{class:'chip'},'⊕ includes work from a merged shot'):'',x.splitFrom?h('span',{class:'chip'},'split from earlier shot'):''),
    h('label',{class:'lbl'},'Action',x.touched.action?h('span',{class:'tag'},'yours'):h('span',{class:'tag ai'},'AI drafted')),
    h('textarea',{rows:2,oninput:e=>{x.action=e.target.value;x.touched.action=true;note.style.display=x.anchor.length?'block':'none'}},x.action),note,
    h('div',{class:'row wrap'},h('label',{class:'lbl'},'Duration',x.touched.dur?h('span',{class:'tag'},'yours'):h('span',{class:'tag ai'},'estimate')),h('input',{type:'number',step:'0.5',min:'1',value:x.dur,style:'width:64px',oninput:e=>{x.dur=+e.target.value;x.touched.dur=true}}),
      h('label',{class:'lbl'},'Camera',h('span',{class:'tag '+(x.camAi?'ai':'')},x.camAi?'AI chose':'yours')),camSel),
    x.dlg?h('div',{class:'dim small'},'“'+x.dlg+'”  ',h('span',{class:'faint'},'delivery: '+x.delivery+' (narrative default)')):'',
    h('div',{class:'small dim'},x.anchor.length?h('span',{},'Anchored to ',x.anchor.map(a=>h('span',{class:'chip'},a))):(x.orphan?h('span',{class:'quiet'},'Anchor was in removed text (input-retired) · re-anchor as an ordinary edit'):h('span',{class:'quiet'},'Not anchored to the narrative · write it back · keep as deviation · decide later'))),
    h('div',{class:'card inset'},h('div',{class:'small faint'},'Frames & takes happen here in the workspace (Peek never spends). Prices sit on the controls; under $2.00 is one click.'),
      h('div',{class:'row wrap'},h('button',{onclick:()=>toast('Prototype: one-click, $0.04 — would make an opening frame')},'Make opening frame',h('span',{class:'price'},'· $0.04')),h('button',{onclick:()=>toast('Prototype: one-click, $0.56 — would generate a take')},'Generate take',h('span',{class:'price'},'· $0.56')),
        k==='failed'?h('span',{class:'quiet fail'},'Timed out · you may have been charged · ',h('a',{class:'lnk',onclick:()=>toast('Prototype: Retry · $0.56')},'Retry · $0.56')):'')),
    noOps?'':h('div',{class:'row'},UI.shotOps(s,x)));
};

// ---------- narrative blocks with coverage (informational) ----------
UI.narrative=(s,sel,onBlock)=>{const L=F.labels(s),active=F.active(s);const selShot=active.find(x=>x.id===sel);
  return h('div',{class:'narr-col'},s.blocks.map(b=>{const cov=active.filter(x=>x.anchor.includes(b.id));
    return h('div',{class:'blk'+(selShot&&selShot.anchor.includes(b.id)?' hl':'')+(b.kind==='dialogue'?' dlg':''),onclick:()=>onBlock&&onBlock(b)},
      b.kind==='dialogue'?h('div',{class:'who'},b.who):'',h('div',{class:'serif'},b.text),
      cov.length?h('div',{class:'covs'},cov.map(x=>h('span',{class:'chip'},L[x.id]))):(active.length?h('div',{class:'unc'},'not covered by a shot'):''))}))};

// ---------- ad-hoc shots (X5) ----------
UI.adhocView=P=>h('div',{class:'pane adhoc'},
  h('div',{class:'hdr'},h('h2',{},'Ad-hoc shots'),h('span',{class:'chip'},F.adhoc.length),h('span',{class:'sp'}),h('button',{onclick:()=>F.newAdhoc()},'+ New ad-hoc shot')),
  h('div',{class:'dim'},'Establishing shots, B-roll, inserts and experiments that belong to no scene. They use your World Definition and normal frame and take tools.'),
  h('div',{class:'row wrap facts'},h('span',{class:'chip'},'Not part of the story'),h('span',{class:'chip'},'Never in runtime or playback'),h('span',{class:'chip'},'Exported separately: “Ad-hoc” folder'),h('span',{class:'chip'},'No write-back questions'),h('span',{class:'chip'},'Looks: you pick, default base')),
  h('div',{class:'adgrid'},F.adhoc.map(x=>h('div',{class:'card adc'},
    h('div',{class:'img',style:`height:90px;background:linear-gradient(135deg,hsl(${F.hue(x.id)} 28% 30%),hsl(${F.hue(x.id)+40} 24% 13%))`}),
    h('div',{class:'row'},h('span',{class:'chip'},x.kind),h('span',{class:'faint small'},x.dur+'s'),h('span',{class:'sp'}),h('span',{class:'faint small'},x.takes?x.takes+' take(s)':x.gen?'generating':'no take yet')),
    h('div',{},x.action),
    h('div',{class:'row'},h('select',{id:'mv'+x.id},h('option',{value:''},'Move to scene…'),F.scenes.map(s=>h('option',{value:s.id,disabled:!F.active(s).length&&s.plan!=='plan'?true:null},F.num(s)+' '+s.line+(F.active(s).length?'':' (no plan yet)')))),
      h('button',{onclick:()=>{const v=$('#mv'+x.id).value;if(v)F.moveAdhoc(x.id,v)}},'Move')),
    ))),
  h('div',{class:'faint small'},'Moving into a scene makes it an ordinary unanchored shot there. Scenes without a plan can\'t take it (it would silently count as their “existing plan”): see README, unresolved choice 4.'));

// ---------- Removed from Story (retired scenes that keep work) ----------
UI.removedView=P=>h('div',{class:'pane removed'},
  h('div',{class:'hdr'},h('h2',{class:'dim'},'Removed from Story'),h('span',{class:'chip'},F.removed.length)),
  h('div',{class:'dim'},'Scenes the story no longer contains. All their shots, frames and takes are kept. They are not in the runtime, film timeline, batches or default export order.'),
  F.removed.length?F.removed.map(r=>h('div',{class:'card rem'},
    h('div',{class:'row'},h('b',{},r.line+' – '+r.time),h('span',{class:'faint small'},r.why),h('span',{class:'sp'}),h('span',{class:'chip'},r.shots.length+' shots · '+r.frames+' frames · '+r.takes+' takes')),
    h('div',{class:'row strip-mini'},r.shots.map(x=>h('div',{class:'img mini',title:x.action,style:`background:linear-gradient(135deg,hsl(${F.hue(x.id)} 28% 30%),hsl(${F.hue(x.id)+40} 24% 13%))`}))),
    h('div',{class:'row wrap'},h('button',{onclick:()=>F.bringBack(r)},'Bring back'),
      h('select',{id:'ad'+r.id},h('option',{value:''},'Adopt work into scene…'),F.scenes.filter(s=>F.active(s).length).map(s=>h('option',{value:s.id},F.num(s)+' '+s.line))),
      h('button',{onclick:()=>{const v=$('#ad'+r.id).value;if(v)F.adopt(r,v)}},'Adopt work'),h('span',{class:'faint small'},'Bring back keeps its id and text; Adopt moves its shots into the chosen scene (anchors stay as recorded). Both undoable.')))):h('div',{class:'faint'},'Nothing removed.'));

// ---------- Peek: preview only, never spends ----------
UI.peek=(s,P)=>{const a=F.active(s);return h('aside',{class:'peek'},h('div',{class:'row'},h('b',{},'Peek'),h('span',{class:'faint small'},'preview only · never spends'),h('span',{class:'sp'}),h('button',{class:'ghost',onclick:()=>{P.peek=null;P.render()}},'✕')),
  UI.thumb(s,'big'),h('div',{},UI.slug(s)),UI.status(s),h('div',{class:'serif dim small'},s.excerpt),UI.deps(s),UI.runtime(s),
  h('div',{class:'dim small'},a.length?'Plan: '+a.slice(0,3).map(x=>x.action).join(' / ').slice(0,140)+'…':'No plan yet'),
  h('button',{class:'primary',onclick:()=>P.go({t:'scene',id:s.id})},'Open in workspace'))};

// ---------- Draft all: scope-then-invoke, plans only ----------
UI.draftAll=P=>{const info=F.scopeInfo();
  const quick=(label,fn)=>h('button',{class:'ghost small',onclick:()=>{F.scope=new Set(F.scenes.filter(fn).map(s=>s.id));F.ticket=false;F.changed()}},label);
  const bar=h('div',{class:'card dabar'},h('div',{class:'row wrap'},h('b',{},'Draft all'),h('span',{class:'faint small'},'shot plans only · never frames, worlds or takes'),h('span',{class:'sp'}),h('span',{class:'faint small'},'Scope:'),
      quick('No plan yet',s=>s.plan==='none'&&!s.shots.length),quick('Scenes without work',s=>!F.stats(s).sel),quick('All scenes',()=>true),quick('Clear',()=>false)),
    info.count?h('div',{class:'row wrap'},h('span',{},info.count+' scene'+(info.count==1?'':'s')+': '),h('span',{class:'chip'},info.nNew+' new plans'),
      h('span',{class:'chip'},info.nRe+' redraft → Options (nothing overwritten)'),info.nLock?h('span',{class:'chip'},'🔒 '+info.nLock+' locked: held as Options'):'',info.unknown?h('span',{class:'quiet'},'one price unavailable'):'',h('span',{class:'sp'}),
      F.drafting?h('span',{class:'dim'},'Drafting '+info.count+' plans…'):h('button',{class:'primary',onclick:()=>{if(info.kind==='click')F.runDraftAll();else{F.ticket=!F.ticket;F.changed()}}},'Draft '+info.count+' plan'+(info.count==1?'':'s'),h('span',{class:'price'},'· '+(info.unknown?'$'+info.known.toFixed(2)+'+ unknown':$m(info.total))))):h('div',{class:'faint small'},'Tick scenes, or pick a scope. Scenes that already have a plan are redrafted as Options. Results can be undone as one step.'));
  if(F.ticket&&info.count&&!F.drafting){const lines=[];if(info.count>=10)lines.push(info.count+' generations (10 or more)');if(info.total>=2)lines.push('Total '+$m(info.total)+' is $2.00 or more');if(info.unknown)lines.push('A price is unavailable (scene '+F.num(info.ss.find(s=>s.unknown))+')');if(info.capBreach)lines.push('Would pass today\'s cap');
    lines.push(info.nNew+' new plans applied · '+info.nRe+' redrafts held as Options · all undoable in one step');
    bar.append(UI.ticket({title:'Draft '+info.count+' plans',lines,total:info.total,unknown:info.unknown,blocked:info.capBreach,left:F.cfg.capLeft,onStart:()=>F.runDraftAll(),onNot:()=>{F.ticket=false;F.changed()},onTrim:()=>F.trimToCap(),onRaise:()=>{F.cfg.capLeft+=info.known;F.changed()},startLabel:info.unknown?'Start (some price unavailable)':null}))}
  return bar};

// ---------- shell: strip + outline + main + prototype controls ----------
UI.mount=P=>{
  P.view=P.view||{t:'hub'};document.body.innerHTML='';
  const app=h('div',{class:'app'}),strip=h('div',{class:'strip'}),outline=h('nav',{class:'outline'}),main=h('main',{class:'main'});
  app.append(strip,outline,main);document.body.append(app);
  P.go=v=>{P.view=v;if(v.t==='scene'){const s=F.byId(v.id);F.tkt=null;F.enter(s)}P.render();main.scrollTop=0};
  P.render=()=>{const top=main.scrollTop;
    const t=F.totals();strip.replaceChildren(h('span',{class:'brand'},'AIUTEUR'),h('span',{},'The Salt Line'),h('span',{class:'faint'},'/ '+P.name),h('span',{class:'sp'}),
      h('span',{class:'dim'},'Runtime '+F.fmt(t.plan)+' planned of '+F.fmt(F.target)+' target'),h('div',{class:'meter',title:t.sel+' of '+t.n+' shots selected'},h('i',{style:`width:${t.n?t.sel/t.n*100:0}%`})),
      t.ood?h('span',{class:'quiet'},h('span',{class:'whisper'}),' '+t.ood+' possibly out of date'):'',h('span',{class:'dim'},'Spent today '+$m(F.spent)),h('a',{class:'lnk',href:'index.html'},'← directions'));
    // outline
    const v=P.view,cur=v.t==='scene'?F.byId(v.id):null;const nav=[];
    nav.push(h('a',{class:v.t==='hub'?'on':'',onclick:()=>P.go({t:'hub'})},'Overview'));
    nav.push(h('h6',{},'Story'));['Input','Interview','Treatment','Beat Sheet','Master Narrative'].forEach(x=>nav.push(h('a',{class:'muted',title:'Not part of this prototype'},h('span',{class:'dot done'}),x)));
    nav.push(h('h6',{},'World'),h('a',{class:'muted',title:'Not part of this prototype'},h('span',{class:'dot done'}),'World Definition'));
    nav.push(h('h6',{},'Scenes'));
    F.scenes.forEach(s=>{const st=F.status(s),on=cur&&cur.id===s.id;
      nav.push(h('a',{class:on?'on':'',onclick:()=>P.go({t:'scene',id:s.id}),title:s.line+' – '+s.time},h('span',{class:'dot '+({done:'done',prog:'prog',plan:'prog',none:''}[st.c]||'')}),h('span',{class:'olabel'},F.num(s)+' '+s.line.replace(/^(INT|EXT)\. /,'$1 ')),F.stats(s).ood?h('span',{class:'whisper'}):'',s.locked?h('span',{class:'lock'},'🔒'):''));
      if(on){const L=F.labels(s);F.active(s).forEach(x=>nav.push(h('a',{class:'sub'+(F.selShot[s.id]===x.id?' on':''),onclick:()=>{F.selShot[s.id]=x.id;P.render()}},L[x.id]+' '+x.action.slice(0,22)+'…')))}});
    nav.push(h('a',{class:v.t==='adhoc'?'on':'',onclick:()=>P.go({t:'adhoc'})},h('span',{class:'dot skip'}),'Ad-hoc shots',h('span',{class:'faint'},'  '+F.adhoc.length)));
    nav.push(h('a',{class:'muted'+(v.t==='removed'?' on':''),onclick:()=>P.go({t:'removed'})},'Removed from Story',h('span',{class:'faint'},'  '+F.removed.length)));
    nav.push(h('h6',{},'Output'),h('a',{class:'muted',title:'#62 review: the same timeline component, film scope'},'Review & Export'));
    outline.replaceChildren(...nav);
    main.replaceChildren();
    if(v.t==='hub')P.renderHub(main);else if(v.t==='scene')P.renderScene(main,F.byId(v.id));else if(v.t==='adhoc')main.append(UI.adhocView(P));else main.append(UI.removedView(P));
    document.body.append(UI.controls(P));main.scrollTop=top};
  F.onChange=()=>P.render();
  document.body.addEventListener('keydown',e=>{if(e.target.matches('input,textarea,select'))return;if(P.view.t==='scene'&&(e.key==='['||e.key===']')){const i=F.scenes.findIndex(s=>s.id===P.view.id)+(e.key===']'?1:-1);if(F.scenes[i])P.go({t:'scene',id:F.scenes[i].id})}});
  P.render();
};

// ---------- prototype controls ----------
UI.controls=P=>{$('.ctl')?.remove();const open=P.ctlOpen;
  const jump=(t,id)=>h('button',{class:'small',onclick:()=>{P.go({t:'scene',id})}},t);
  return h('div',{class:'ctl'},open?h('div',{class:'ctlbody'},
    h('div',{class:'row'},h('b',{},'Prototype controls'),h('span',{class:'sp'}),h('button',{class:'ghost',onclick:()=>{P.ctlOpen=false;P.render()}},'✕')),
    h('div',{class:'faint small'},'Open a scene in each state'),
    h('div',{class:'row wrap'},jump('7 · worked scene','s7'),jump('15 · no plan, $0.03 → auto','s15'),jump('16 · no plan, $0.04 → auto','s16'),jump('17 · no plan, $0.06 → Draft plan','s17'),jump('18 · no plan, $0.11','s18'),jump('19 · price unknown → ticket','s19'),jump('20 · $2.40 → ticket','s20'),jump('12 · emptied plan','s12'),jump('9 · locked plan','s9'),jump('3 · mostly done','s3')),
    h('div',{class:'row wrap'},h('label',{class:'small'},'Cap left today '),h('select',{onchange:e=>{F.cfg.capLeft=+e.target.value;F.changed()}},[25,1,0.1].map(v=>h('option',{value:v,selected:F.cfg.capLeft===v},'$'+v.toFixed(2)))),
      h('label',{class:'small'},h('input',{type:'checkbox',checked:F.scenes.find(s=>s.id==='s19')?.unknown?true:null,onchange:e=>{F.byId('s19').unknown=e.target.checked;F.changed()}}),' scene 19 price unknown')),
    h('div',{class:'row wrap'},h('button',{class:'small',onclick:()=>{F.build(!F.cfg.stress);P.view={t:'hub'};F.changed()}},F.cfg.stress?'Scale: 230 shots (click: ~130)':'Scale: ~130 shots (click: ~230)'),h('button',{class:'small',onclick:()=>{F.build(F.cfg.stress);P.view={t:'hub'};F.changed()}},'Reset data'))
  ):h('button',{class:'ctlbtn',onclick:()=>{P.ctlOpen=true;P.render()}},'⚙ prototype controls'))};
})();

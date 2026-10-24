/* Plan components: shot content, asset roster + state plan, references. Used verbatim by U (Plan mode) and S (Shots & Assets). */
(()=>{
const P={};
const withVal=(list,v)=>list.includes(v)||!v?list:[v,...list];
const SIZES=['Wide','Medium full','Medium','Medium over-the-shoulder','Medium close-up over-the-shoulder','Medium close-up','Close-up','Insert, close-up'];
const FP={skip:'Skip frames (go straight to video)',open:'Opening frame only','open+end':'Opening + ending','open+end+key':'Opening + keyframe + ending'};
const tags=s=>s;
P.carriesTo=(s,r)=>{const L=shots(),out=[];for(let i=idxOf(s)+1;i<L.length;i++){const q=L[i].roster.find(x=>x.a===r.a);if(q){if(q.open)break;out.push(L[i].id)}}return out};

P.context=s=>{
 const fs=rolesOf(s).map(k=>frame(s,k).st==='appr'?'✓':'·').join(' ');
 return h('div',{class:'ctxbar'},h('b',{class:'accent'},s.id),h('span',{},s.name),h('span',{class:'dim'},s.dur+'s'),
  h('span',{class:'chip'},'Frames '+(s.fp==='skip'?'skipped':fs)),h('span',{class:'chip'},'Cut: '+(s.cont.kind==='match'?'match · '+(s.cont.mk||'?'):s.cont.kind)),
  s.roster.map(r=>h('span',{class:'chip'+(persists(s,r)?' warn':'')},(D.ASSETS[r.a].t==='Character'?aname(r.a).split(/[ ,]/)[0]:aname(r.a))+' · '+lookName(r.a,openLook(s,r))+(persists(s,r)?' → '+lookName(r.a,endLook(s,r)):''))),
  h('span',{class:'sp'}),s.final?h('span',{class:'lock'},'🔒 Marked final'):'');
};

P.shotContent=s=>{
 const f=(label,mark,node,cls='')=>h('label',{class:'fld '+cls},h('span',{class:'flb'},label,mark||''),node);
 const dl=h('div',{class:'col'},
  s.dialogue.length?s.dialogue.map((d,i)=>h('div',{class:'dlg'},U.inp(d.who,v=>d.who=v,{style:'width:90px'}),U.inp(d.line,v=>d.line=v,{style:'flex:2'}),U.inp(d.delivery,v=>d.delivery=v,{style:'flex:2',placeholder:'delivery'}),
   h('button',{class:'ghost',title:'Remove line',onclick:()=>{undoable('Line removed',()=>s.dialogue.splice(i,1))}},'✕'))):h('span',{class:'faint small'},'No dialogue in this shot.'),
  h('div',{},h('button',{class:'ghost small',onclick:()=>{s.dialogue.push({who:s.roster[0]?aname(s.roster[0].a).split(' ')[0]:'Speaker',line:'',delivery:''});render()}},'+ Dialogue line')));
 const mk=k=>U.aiMark(s,k);
 return h('div',{class:'form'},
  f('Action',mk('action'),U.ta(s.action,v=>{s.action=v;U.touch(s,'action');render()},4),'wide'+U.hl(s,'action')),
  f('Dialogue and delivery','',dl,'wide'),
  f('Location','',U.inp(s.location,v=>s.location=v)),
  f('Direction (which wall or view)',mk('dir'),U.inp(s.direction,v=>{s.direction=v;U.touch(s,'dir');render()}),U.hl(s,'dir')),
  h('div',{class:'fld wide'+U.hl(s,'cam')},h('span',{class:'flb'},'Camera',mk('cam')),
   h('div',{class:'row wrap'},
    U.sel(withVal(SIZES,s.cam.size).map(x=>[x,x]),s.cam.size,v=>{s.cam.size=v;U.touch(s,'cam');render()}),
    U.inp(s.cam.angle,v=>s.cam.angle=v,{style:'width:180px',title:'Angle'}),U.inp(s.cam.move,v=>s.cam.move=v,{style:'width:200px',title:'Movement'}),U.inp(s.cam.lens,v=>s.cam.lens=v,{style:'width:80px',title:'Lens'}),
    U.inp(s.cam.note,v=>s.cam.note=v,{style:'flex:1;min-width:200px',placeholder:'camera notes'}))),
  f('Visual notes','',U.ta(s.visual,v=>s.visual=v,2)),f('Sound notes','',U.ta(s.sound,v=>s.sound=v,2)),
  f('Duration',mk('dur'),h('div',{class:'row'},U.num(s.dur,v=>{s.dur=Math.max(1,v);U.touch(s,'dur');render()}),h('span',{class:'dim small'},'seconds'+(s.dur>6?' · longer than one Kling segment: a long shot makes one Take in '+Math.ceil(s.dur/6)+' parts':'')))),
  f('Frame strategy',mk('fp'),U.sel(Object.entries(FP),s.fp,v=>{s.fp=v;U.touch(s,'fp');rolesOf(s).forEach(k=>frame(s,k));render()}),U.hl(s,'fp')));
};

P.roster=s=>{
 const addable=Object.keys(D.ASSETS).filter(a=>!s.roster.some(r=>r.a===a));
 const rows=s.roster.map(r=>{
  const looks=Object.entries(D.ASSETS[r.a].looks),carry=carried(r.a,s);
  const pers=persists(s,r),to=P.carriesTo(s,r);
  const lookOpt=[...looks.map(([k,v])=>[k,v.n+(v.img?'':' (description only)')])];
  const editing=S.open['looks:'+s.id+r.a];
  return h('div',{class:'rrow2'+U.hl(r,'ai')},
   h('div',{class:'row'},h('b',{},aname(r.a)),h('span',{class:'chip'},D.ASSETS[r.a].t),(!sc().acc&&r.ai)?h('span',{class:'aimark'},'AI chose'):'',r.ai===false?h('span',{class:'faint small'},'added by you'):'',h('span',{class:'sp'}),
    h('button',{class:'ghost small',onclick:()=>{S.open['looks:'+s.id+r.a]=!editing;render()}},editing?'Hide Looks':'Looks…'),
    h('button',{class:'ghost small',title:'Remove a wrongly inferred asset',onclick:()=>undoable(aname(r.a)+' removed from '+s.id,()=>removeAsset(s,r.a))},'Remove')),
   h('div',{class:'rgrid'},
    h('label',{},h('span',{class:'flb'},'On screen'),U.sel(Object.entries(PRES),r.pres,v=>{r.pres=v;r.ai=false;render()})),
    h('label',{},h('span',{class:'flb'},'Look or state at opening'),U.sel([['',`Carried in: ${lookName(r.a,carry.look)}${carry.src?' (from '+carry.src+')':''}`],...lookOpt],r.open||'',v=>{r.open=v||null;markDownstream(s,r.a);render()})),
    h('label',{},h('span',{class:'flb'},'Look at ending'),U.sel([['','Same Look (shot-only state below, if any)'],...lookOpt],r.end||'',v=>{r.end=v||null;markDownstream(s,r.a);render()})),
    h('label',{class:'w2'},h('span',{class:'flb'},'Action or blocking note'),U.inp(r.note,v=>r.note=v)),
    h('label',{class:'w2'},h('span',{class:'flb'},'Shot-only state (does not carry forward)'),U.inp(r.trans||'',v=>{r.trans=v||undefined;render()},{placeholder:'e.g. glass dust hangs in the air'}))),
   h('div',{class:'row wrap small'},
    pers?h('span',{class:'chip warn'},`Persistent change: ${lookName(r.a,openLook(s,r))} → ${lookName(r.a,endLook(s,r))}`):'',
    pers?h('span',{class:'dim'},to.length?'carries to '+to.join(', ')+' until changed again':'no later shots use it yet'):'',
    pers?U.sel([['ask','Story write-back: ask me'],['writeback','Write back to the story'],['deviation','Keep as a deviation']],r.wb||'ask',v=>{r.wb=v;render()},{class:'small'}):'',
    !pers&&r.trans?h('span',{class:'chip'},'Shot-only: does not carry'):'',
    r.later?h('span',{class:'chip warn'},`From here on: ${lookName(r.a,r.later)} (applies from the next shot)`):'',
    h('span',{class:'sp'}),
    h('label',{class:'dim'},'From here on: ',U.sel([['','—'],...lookOpt],r.later||'',v=>{r.later=v||undefined;markDownstream(s,r.a);render()}))),
   editing?h('div',{class:'looks'},looks.map(([k,l])=>h('div',{class:'lookrow'},h('div',{class:'thumb',style:l.img?U.hue((r.a.length*77+k.length*40)%360,34):'border:1px dashed var(--line2)'},l.img?'':'no image'),
     h('div',{class:'col',style:'flex:1'},h('b',{class:'small'},l.n,l.img?'':h('span',{class:'chip',style:'margin-left:6px'},'description only')),U.ta(l.d,v=>l.d=v,2)))),
    h('button',{class:'ghost small',onclick:()=>{const n='nl'+uid('');D.ASSETS[r.a].looks[n]={n:'New Look (description only)',d:'Describe what differs from the identity image.',img:0};render()}},'+ Add a description-only Look')):'');
 });
 return h('div',{class:'col'},
  h('div',{class:'faint small'},'Initialised from the Master Narrative and World Definition. The opening, ending and keyframe asset sets derive from this roster.'),
  rows.length?rows:h('div',{class:'faint'},'No assets in this shot yet.'),
  h('div',{class:'row'},U.sel([['','Add an asset the AI missed…'],...addable.map(a=>[a,aname(a)+' · '+D.ASSETS[a].t])],'',v=>{if(v){undoable(aname(v)+' added to '+s.id,()=>addAsset(s,v))}},{id:'addasset'})));
};

P.addRefShot=(s,scope,srcShot,srcRole,recompose='')=>{s.refs.push({id:uid('r'),scope,type:'shot',label:`${srcShot} ${ROLE_NAME[srcRole].toLowerCase()} frame`,srcShot,srcRole,recompose,subject:null})};
P.refs=s=>{
 const others=shots().filter(x=>x!==s);
 const scopeOpt=[['shot','Whole shot'],['open','Opening frame'],['key','Keyframe'],['end','Ending frame']];
 const row=r=>h('div',{class:'refrow'},
  h('div',{class:'thumb',style:U.hue(r.type==='shot'?(shot(r.srcShot)?.hue??0):r.type==='cineblock'?200:100,32)},r.type==='cineblock'?'CB':r.type==='shot'?r.srcShot:'img'),
  h('div',{class:'col',style:'flex:1;gap:5px'},
   h('div',{class:'row wrap'},U.sel(scopeOpt,r.scope,v=>{r.scope=v;render()}),
    r.type==='shot'?[h('span',{class:'dim small'},'Reference shot:'),U.sel(others.map(x=>[x.id,x.id+' '+x.name]),r.srcShot,v=>{r.srcShot=v;r.label=`${v} ${r.srcRole} frame`;render()}),U.sel([['open','opening'],['key','keyframe'],['end','ending']],r.srcRole,v=>{r.srcRole=v;r.label=`${r.srcShot} ${v} frame`;render()})]:h('b',{class:'small'},r.label||'Reference'),
    h('span',{class:'dim small'},'shows:'),U.sel([['','subject not mapped'],...s.roster.map(x=>[x.a,aname(x.a)])],r.subject||'',v=>{r.subject=v||null;render()}),
    h('span',{class:'sp'}),h('button',{class:'ghost small',onclick:()=>undoable('Reference removed',()=>{s.refs=s.refs.filter(x=>x!==r)})},'Remove')),
   r.type==='shot'?h('label',{},h('span',{class:'flb'},'How to recompose it'),U.ta(r.recompose||'',v=>r.recompose=v,2,{placeholder:'e.g. same framing, but remove the second person'})):'',
   r.type==='cineblock'?h('div',{class:'quiet'},'CineBlock capture: a reference only. It needs a description and the right assets before it can produce the frame.'):''));
 return h('div',{class:'col'},s.refs.length?s.refs.map(row):h('div',{class:'faint'},'No references on this shot.'),
  h('div',{class:'row wrap'},
   U.sel([['','+ Asset image reference…'],...s.roster.map(r=>[r.a,aname(r.a)+' · '+lookName(r.a,openLook(s,r))])],'',v=>{if(v){s.refs.push({id:uid('r'),scope:'shot',type:'asset',label:aname(v)+' identity image',subject:v});render()}}),
   h('button',{onclick:()=>{const o=others[Math.max(0,idxOf(s)-1)]||others[0];if(o){P.addRefShot(s,'open',o.id,'open','');render()}}},'+ Reference shot (from another shot\'s frame)'),
   h('button',{onclick:()=>{s.refs.push({id:uid('r'),scope:'shot',type:'upload',label:'Uploaded image (mock)',subject:null});render()}},'+ Upload')));
};
P.counts=s=>({roster:s.roster.length,refs:s.refs.length});
window.P=P;
})();

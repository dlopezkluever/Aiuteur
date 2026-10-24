/* Frame work + continuity + CineBlock + scene frame gallery + video prompt. Shared by U (Frames mode) and S (Frames & Prompts). */
(()=>{
const F={};
const KINDS={cut:'Cut (no continuity source)',continues:'Continues from the previous ending',newview:'Same place, new view',match:'Match cut'};
const MATCH={graphic:'Graphic (shape, colour, position)',action:'Action (movement carries over)',eyeline:'Eyeline (where they look)'};
const stName={appr:'Approved',cand:'Candidate, not approved',none:'No frame yet'};
const fhue=(s,r)=>(s.hue+({open:0,key:20,end:40}[r]||0))%360;

F.thumb=(s,r,o={})=>{
 const f=r&&rolesOf(s).includes(r)?frame(s,r):null;
 if(!f)return h('div',{class:'ftile empty'},s.fp==='skip'?'Frames skipped':'—');
 const cb=[...s.refs,...f.refs].some(x=>x.type==='cineblock'&&(x.scope===r));
 return h('div',{class:'ftile st-'+f.st+(o.on?' on':''),style:f.st==='none'?'':U.hue(fhue(s,r),32),onclick:o.onclick},
  f.st==='none'?h('span',{class:'faint'},'No frame yet'):'',
  f.stale?h('span',{class:'whisper tl',title:'Possibly out of date'}):'',
  cb?h('span',{class:'cbtag'},'CineBlock ref'):'',
  f.st==='appr'?h('span',{class:'chk'},'✓ approved'):f.st==='cand'?h('span',{class:'chk c'},'candidate '+f.n):'');
};

F.neighbours=(s,role)=>{
 const i=idxOf(s),prev=shots()[i-1],next=shots()[i+1];
 const tile=(x,r,label,self)=>h('div',{class:'ncol'+(self?' self':'')},
  h('div',{class:'row small'},h('b',{},label),x?h('span',{class:'dim'},x.id):'',h('span',{class:'sp'}),x&&rolesOf(x).includes(r)?h('span',{class:'faint'},stName[frame(x,r).st]):''),
  x?F.thumb(x,r,{on:self&&role===r,onclick:()=>{if(!self){S.shot=x.id}else{S.role=r}render()}}):h('div',{class:'ftile empty'},'none'));
 const roles=rolesOf(s);
 return h('div',{class:'nrow'},
  tile(prev,'end','Previous ending',false),
  roles.includes('open')?tile(s,'open','This opening',true):h('div',{class:'ncol'},h('div',{class:'ftile empty'},'No opening')),
  roles.includes('end')?tile(s,'end','This ending',true):h('div',{class:'ncol'},h('div',{class:'ftile empty'},'No ending')),
  tile(next,'open','Next opening',false));
};

F.roleTabs=s=>{
 const roles=rolesOf(s);
 if(!roles.includes(S.role))S.role=roles[0]||'open';
 return h('div',{class:'row small'},roles.map(r=>h('button',{class:'tabb'+(S.role===r?' on':''),onclick:()=>{S.role=r;render()}},ROLE_NAME[r]+' '+(frame(s,r).st==='appr'?'✓':'·'))));
};

F.genFrame=(s,r)=>{
 const f=frame(s,r),key='fr:'+s.id+r;
 const upstream=r==='end'&&frame(s,'open').st!=='appr'&&rolesOf(s).includes('open');
 return h('div',{class:'row wrap'},
  U.spend(key,f.st==='none'?'Generate frame':'Another candidate',{total:D.FRAME_PRICE,count:1,what:`${ROLE_NAME[r]} frame of ${s.id}`},()=>simulate(key,()=>{f.st=f.st==='appr'?'appr':'cand';f.n++;f.stale=0;if(f.st==='cand'){}},900),{primary:f.st==='none'}),
  f.st==='cand'?h('button',{class:'primary',onclick:()=>undoable(ROLE_NAME[r]+' frame approved',()=>{f.st='appr'})},'Approve'):'',
  f.st==='appr'?h('button',{onclick:()=>undoable('Approval removed',()=>{f.st='cand'})},'Unapprove'):'',
  upstream?h('span',{class:'quiet'},'Opening frame not approved yet. Generating the ending without it is allowed.'):'',
  f.stale?h('span',{class:'quiet'},h('span',{class:'whisper'}),' Possibly out of date: ',h('button',{class:'ghost small',onclick:()=>{f.stale=0;render()}},'It still fits')):'');
};

F.frameAssets=(s,r)=>{
 const rows=frameAssets(s,r),f=frame(s,r);
 const add=s.roster.length?'':'';
 return h('div',{class:'col'},
  h('div',{class:'faint small'},'Derived from the roster. Per-frame overrides are marked.'),
  h('div',{class:'row wrap'},rows.map(x=>h('label',{class:'chip big'+(x.on?' ok':'')},
   h('input',{type:'checkbox',checked:x.on?true:null,onchange:e=>{const want=e.target.checked;if(want===x.derived)delete f.ov[x.r.a];else f.ov[x.r.a]=want?'+':'-';render()}}),
   aname(x.r.a)+' · '+lookName(x.r.a,x.look),x.ov?h('span',{class:'faint'},x.ov==='+'?' (added for this frame)':' (left out for this frame)'):x.derived?'':h('span',{class:'faint'},' (not in this frame)')))),
  rows.some(x=>x.r.trans&&r==='end')?h('div',{class:'quiet'},'Shot-only state shaping this frame: '+rows.filter(x=>x.r.trans).map(x=>x.r.trans).join('; ')):'');
};

F.framePrompt=(s,r)=>{const f=frame(s,r);
 return U.prompt('f:'+s.id+r,ROLE_NAME[r]+' frame prompt',framePrompt(s,r),frameIngredients(s,r),f.pov!=null,v=>{f.pov=v;render()},()=>{f.pov=null;render()});};

F.frameRefs=(s,r)=>{
 const mine=[...s.refs.filter(x=>x.scope===r),...frame(s,r).refs];
 const all=s.refs.filter(x=>x.scope==='shot');
 const cbBody=x=>{
  const ready=x.desc&&x.assetsOk;
  return h('div',{class:'col'},h('div',{class:'quiet'},'Reference for this frame only. Still needs a full description and the right assets.'),
   h('input',{value:x.desc||'',placeholder:'Describe the frame in words',onchange:e=>{x.desc=e.target.value;render()}}),
   h('label',{class:'small dim'},h('input',{type:'checkbox',checked:x.assetsOk?true:null,onchange:e=>{x.assetsOk=e.target.checked;render()}}),' Assets checked for this frame'),
   ready?h('div',{class:'chip ok'},'Ready to generate from'):h('div',{class:'quiet'},'Not ready: '+[!x.desc?'needs description':'',!x.assetsOk?'assets not confirmed':''].filter(Boolean).join(' · ')));
 };
 const item=x=>h('div',{class:'refmini'},
  h('div',{class:'thumb sm',style:U.hue(x.type==='cineblock'?200:(shot(x.srcShot)?.hue??100),32)},x.type==='cineblock'?'CB':x.srcShot||'img'),
  h('div',{class:'col',style:'flex:1;gap:3px'},
   h('b',{class:'small'},x.type==='shot'?`Reference shot: ${x.srcShot} ${ROLE_NAME[x.srcRole].toLowerCase()} frame`:x.label),
   x.type==='shot'?h('div',{class:'dim small'},'Recompose: '+(x.recompose||'(no note yet)')):'',
   x.type==='cineblock'?cbBody(x):''));
 return h('div',{class:'col'},
  mine.length?mine.map(item):h('div',{class:'faint small'},'No references on this frame.'+(all.length?` ${all.length} whole-shot reference${all.length>1?'s':''} also apply.`:'')),
  h('div',{class:'faint small'},'Whole-shot references are edited in Plan. Pick a frame in the gallery below to attach it as a reference shot for this frame.'));
};

F.continuity=s=>{
 const c=s.cont,i=idxOf(s),L=shots();
 const pins=[['','Previous shot ending (default)'],...L.filter(x=>x!==s).flatMap(x=>rolesOf(x).map(r=>[x.id+':'+r,`${x.id} ${ROLE_NAME[r].toLowerCase()} frame`]))];
 return h('div',{class:'col'+U.hl(s,'cont')},
  h('div',{class:'row wrap'},h('b',{class:'small'},'Continuity into this shot'),U.aiMark(s,'cont'),
   U.sel(Object.entries(KINDS),c.kind,v=>{c.kind=v;U.touch(s,'cont');render()},{disabled:i===0?true:null}),
   c.kind==='match'?[U.sel([['','Match kind…'],...Object.entries(MATCH)],c.mk,v=>{c.mk=v;render()}),h('span',{class:'dim small'},'source:'),U.sel(pins,c.pin||'',v=>{c.pin=v||null;render()})]:
   c.kind==='continues'?[h('span',{class:'dim small'},'pinned source:'),U.sel(pins,c.pin||'',v=>{c.pin=v||null;render()})]:''),
  c.kind==='match'?h('div',{class:'quiet'},'A match feeds the source as a framing reference, not as the base image. Pinned source: '+(c.pin||(L[i-1]?.id+':end (previous ending)'))):'',
  h('input',{value:c.note||'',placeholder:'Cut note (free text, e.g. “round red stamp becomes the round green lamp”)',onchange:e=>{c.note=e.target.value;render()}}));
};

F.cineblock=s=>{
 const sceneBtn=h('button',{onclick:()=>{S.cine={scope:'scene'};render()}},'Block scene in CineBlock');
 const shotBtn=h('button',{onclick:()=>{S.cine={scope:'shot',shot:s.id};render()}},'Block this shot');
 const panel=S.cine?h('div',{class:'cbpanel'},h('div',{class:'row'},h('b',{},'CineBlock (mock)'),h('span',{class:'dim small'},S.cine.scope==='scene'?`Opened with all ${shots().length} shots of scene ${S.scene}`:`Opened with scene ${S.scene} state, focused on ${S.cine.shot}`),h('span',{class:'sp'}),
  h('button',{class:'primary',onclick:()=>F.cineReturn()},'Return with captures'),h('button',{class:'ghost',onclick:()=>{S.cine=null;render()}},'Close without captures')),
  h('div',{class:'faint small'},'In the real product this is the CineBlock tab. The return is mocked here: captures land as references on the matching frame role.')):'';
 return h('div',{class:'col'},h('div',{class:'row wrap'},sceneBtn,shotBtn,h('span',{class:'faint small'},'Captures come back as references, never as finished frames.')),panel);
};
F.cineReturn=()=>{
 const c=S.cine;let n=0;
 const put=(s,r)=>{if(!rolesOf(s).includes(r))return;if(s.refs.some(x=>x.type==='cineblock'&&x.scope===r))return;s.refs.push({id:uid('r'),scope:r,type:'cineblock',label:'CineBlock capture, '+ROLE_NAME[r].toLowerCase(),capture:1,desc:'',assetsOk:false});n++};
 if(c.scope==='scene')shots().filter(x=>x.fp!=='skip').slice(0,4).forEach(x=>{put(x,'open');if(x.id==='7B')put(x,'end')});
 else{const s=shot(c.shot);put(s,S.role)}
 const target=c.scope==='shot'?shot(c.shot):null;
 S.cine=null;render();toast(`${n} capture${n===1?'':'s'} landed as references on the matching frame${n===1?'':'s'}. They still need a description and assets.`);
};

F.gallery=(s)=>{
 const L=shots();
 const open=S.gallery;
 const sel=S.galSel;
 const grid=h('div',{class:'gal'},L.flatMap(x=>rolesOf(x).map(r=>{const id=x.id+':'+r,on=sel===id;
  return h('div',{class:'gtile'+(on?' on':'')+(x===s&&r===S.role?' me':''),onclick:()=>{S.galSel=on?null:id;render()}},F.thumb(x,r),h('div',{class:'small'},h('b',{},x.id),' '+ROLE_NAME[r].toLowerCase()))})));
 const bar=sel?(()=>{const [sid,sr]=sel.split(':');return h('div',{class:'galbar'},h('b',{class:'small'},`Use ${sid} ${ROLE_NAME[sr].toLowerCase()} frame as a reference shot for ${s.id} ${ROLE_NAME[S.role].toLowerCase()}`),
  h('input',{id:'recomp',placeholder:'How to recompose it (e.g. clean medium of Bob, remove the second person)',style:'flex:1'}),
  h('button',{class:'primary',disabled:sid===s.id&&sr===S.role?true:null,onclick:()=>{P.addRefShot(s,S.role,sid,sr,$('#recomp').value);S.galSel=null;render();toast('Reference shot attached to '+s.id+' '+ROLE_NAME[S.role].toLowerCase())}},'Attach as reference'))})():'';
 return h('div',{class:'col'},h('div',{class:'row'},h('button',{class:'ghost',onclick:()=>{S.gallery=!open;render()}},(open?'▾':'▸')+' Scene frame gallery'),h('span',{class:'faint small'},'every frame in the scene, to match shots several apart (shot / reverse-shot, cutaways)')),open?[grid,bar]:'');
};

F.videoPrompt=s=>{
 const key='vp:'+s.id;
 return U.prompt('v:'+s.id,'Video prompt',videoPrompt(s),videoIngredients(s),s.vp.ov!=null,v=>{s.vp.ov=v;render()},()=>{s.vp.ov=null;render()});
};

/* The whole frame workspace: full width, sticky role bar */
F.workspace=s=>{
 if(!s)return h('div',{class:'empty'},'No shots yet');
 const roles=rolesOf(s);
 if(!roles.length)return h('div',{class:'col'},h('div',{class:'empty'},h('h3',{},'Frames skipped for '+s.id),h('p',{class:'dim'},'This shot goes straight to video. Change the frame strategy in Plan if you want frames.'),h('button',{onclick:()=>{s.fp='open';U.touch(s,'fp');S.role='open';render()}},'Add an opening frame')),F.continuity(s),F.cineblock(s),F.videoPrompt(s));
 if(!roles.includes(S.role))S.role=roles[0];
 const r=S.role;
 return h('div',{class:'fw'},
  h('div',{class:'fwbar'},F.roleTabs(s),h('span',{class:'sp'}),F.genFrame(s,r)),
  F.neighbours(s,r),
  h('div',{class:'fwgrid'},
   h('div',{class:'card pad col'},h('b',{class:'lbl'},ROLE_NAME[r]+' frame · assets'),F.frameAssets(s,r),F.framePrompt(s,r)),
   h('div',{class:'card pad col'},h('b',{class:'lbl'},'Continuity and cut'),F.continuity(s),h('b',{class:'lbl',style:'margin-top:8px'},ROLE_NAME[r]+' frame · references'),F.frameRefs(s,r))),
  h('div',{class:'card pad'},F.cineblock(s)),
  h('div',{class:'card pad'},F.gallery(s)),
  h('div',{class:'card pad'},F.videoPrompt(s)));
};
window.F=F;
})();

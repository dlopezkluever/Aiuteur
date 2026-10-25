/* Generate (final): one selected shot. A prominent Frames | Takes toggle switches the canvas AND the right drawer together.
   Frames: neighbour row + big frame; drawer tabs References / Prompts / Scene frames. Takes: big player + this shot's Takes; one-panel take composer drawer. */
(()=>{
const G={};
const M=D.MODELS;
const ASSETS_=D.ASSETS;
const stName={appr:'Approved',cand:'Not approved',none:'No frame yet'};
const KINDLBL={cut:'Hard cut',continues:'Continues',newview:'New view of the same place',match:'Match cut'};

/* ---------- frame tiles ---------- */
G.tile=(s,r,o={})=>{
 if(!s)return h('div',{class:'ftile2 empty'},h('span',{class:'faint'},o.empty||'none'));
 if(!rolesOf(s).includes(r))return h('div',{class:'ftile2 empty'},h('span',{class:'faint'},s.fp==='skip'?'Frames skipped':'No '+ROLE_NAME[r].toLowerCase()+' frame'));
 const f=frame(s,r),cb=[...s.refs,...f.refs].some(x=>x.type==='cineblock'&&x.scope===r);
 return h('div',{class:'ftile2 st-'+f.st+(o.on?' on':'')+(o.cls?' '+o.cls:''),onclick:o.onclick,title:`${s.id} ${ROLE_NAME[r].toLowerCase()} · ${stName[f.st]}`},
  f.st==='none'?h('div',{class:'ph'},A.el(A.glyph(s.cam.size),'phg'),h('span',{class:'faint'},'No frame yet')):A.frameEl(s,r,{seed:f.cur+1}),
  f.stale?h('span',{class:'whisper tl',title:'Possibly out of date'}):'',
  cb?h('span',{class:'cbtag'},'CineBlock ref'):'',
  f.st==='appr'?h('span',{class:'chk'},'✓ approved'):f.st==='cand'?h('span',{class:'chk c'},'attempt '+(f.cur+1)+' of '+f.n):'');
};
G.roleBar=s=>{
 const roles=rolesOf(s);
 if(!roles.includes(S.role))S.role=roles[0]||'open';
 return h('div',{class:'rolebar'},roles.map(r=>{const f=frame(s,r);return h('button',{class:'rolebtn'+(S.role===r?' on':''),onclick:()=>{S.role=r;render()}},ROLE_NAME[r],h('span',{class:'rst st-'+f.st},f.st==='appr'?'✓':f.st==='cand'?'●':'○'))}));
};

/* ---------- continuity row: previous ending | this opening | this ending | next opening ---------- */
G.continuityRow=(s,o={})=>{
 const L=shots(),i=idxOf(s),prev=L[i-1],next=L[i+1],roles=rolesOf(s);
 const lab=(t,sub)=>h('div',{class:'nlab'},h('b',{},t),h('span',{class:'faint'},sub||''));
 const col=(x,r,t,self,extra)=>h('div',{class:'ncol2'+(self?' self':'')+(extra?' '+extra:'')},
  lab(t,x?(self?'':x.id+' · '+x.name):''),
  G.tile(x,r,{on:self&&S.role===r,empty:'Start of scene',onclick:()=>{if(!x)return;if(self){S.role=r}else{S.shot=x.id}render()}}));
 const cut=(label)=>h('div',{class:'nconn',onclick:()=>{S.open.cutedit=!S.open.cutedit;render()},title:'Edit how this cut works'},U.contTag(s),h('span',{class:'small faint'},label));
 return h('div',{class:'ncwrap'},
  h('div',{class:'nrow2'+(o.big?' big':'')},
   col(prev,'end','Previous ending',false),
   cut('Edit cut'),
   col(s,'open','This opening',true),
   col(s,'end','This ending',true),
   h('div',{class:'nconn dim'},h('span',{class:'ctag'},'›'),h('span',{class:'small faint'},next?KINDLBL[next.cont.kind]:'')),
   col(next,'open','Next opening',false)),
  h('div',{class:'row small',style:'margin-top:4px'},
   prev&&roles.includes('open')?h('button',{class:'ghost small'+(S.cmpPair==='in'?' on':''),onclick:()=>{S.cmpPair=S.cmpPair==='in'?null:'in';render()}},'⇆ Compare previous ending with this opening'):'',
   next&&roles.includes('end')?h('button',{class:'ghost small'+(S.cmpPair==='out'?' on':''),onclick:()=>{S.cmpPair=S.cmpPair==='out'?null:'out';render()}},'⇆ Compare this ending with the next opening'):''),
  S.cmpPair?G.comparePair(s,prev,next):'',
  S.open.cutedit?h('div',{class:'cutedit'},P.continuity(s)):'');
};
G.comparePair=(s,prev,next)=>{
 const a=S.cmpPair==='in'?[prev,'end','Previous ending '+(prev?.id||'')]:[s,'end','This ending'];
 const b=S.cmpPair==='in'?[s,'open','This opening']:[next,'open','Next opening '+(next?.id||'')];
 const pane=([x,r,t])=>h('div',{class:'cpane'},h('div',{class:'row small'},h('b',{},t),h('span',{class:'faint'},x?stName[frame(x,r)?.st||'none']:'')),x&&rolesOf(x).includes(r)?G.tile(x,r,{cls:'huge'}):G.tile(null,r,{}));
 return h('div',{class:'cmpPair'},pane(a),h('div',{class:'cpmid'},h('span',{},'⇆'),h('span',{class:'small faint'},s.cont.kind==='match'?'match: '+(s.cont.mk||'kind not set'):s.cont.kind)),pane(b),h('button',{class:'ghost small cpx',onclick:()=>{S.cmpPair=null;render()}},'Close'));
};

/* ---------- frame stage: the big frame, attempts, approve ---------- */
G.genFrameBtns=(s,r)=>{
 const f=frame(s,r),key='fr:'+s.id+r;
 const upstream=r==='end'&&rolesOf(s).includes('open')&&frame(s,'open').st!=='appr';
 return h('div',{class:'row wrap fctl'},
  U.spend(key,f.n?'Another attempt':'Generate '+ROLE_NAME[r].toLowerCase()+' frame',{total:D.FRAME_PRICE,count:1,what:`${ROLE_NAME[r]} frame of ${s.id}`},()=>simulate(key,()=>{f.n++;f.cur=f.n-1;f.stale=0;syncFrame(f);toast(`Attempt ${f.n} ready, not approved`)},900),{primary:!f.n}),
  f.n&&f.ap!==f.cur?h('button',{class:'primary',onclick:()=>undoable(ROLE_NAME[r]+' frame approved (attempt '+(f.cur+1)+')',()=>{f.ap=f.cur;f.stale=0;syncFrame(f)})},'Approve this attempt'):'',
  f.ap!=null&&f.ap===f.cur?h('button',{onclick:()=>undoable('Approval removed',()=>{f.ap=null;syncFrame(f)})},'Unapprove'):'',
  f.ap!=null&&f.ap!==f.cur?h('span',{class:'quiet'},'Attempt '+(f.ap+1)+' is the approved frame'):'',
  upstream?h('span',{class:'quiet'},'Opening frame not approved yet. Generating the ending without it is allowed.'):'',
  f.stale?h('span',{class:'quiet'},h('span',{class:'whisper'}),' Possibly out of date: ',h('button',{class:'ghost small',onclick:()=>{f.stale=0;render()}},'It still fits')):'');
};
G.attempts=(s,r,o={})=>{
 const f=frame(s,r);
 if(!f.n)return h('div',{class:'faint small'},'No attempts yet.');
 return h('div',{class:'attempts'+(o.row?' row':'')},Array.from({length:f.n},(_,i)=>h('div',{class:'att'+(f.cur===i?' on':'')+(f.ap===i?' appr':''),onclick:()=>{f.cur=i;render()}},
  A.el(A.frame(s,r,{seed:i+1}),'a-frame'),h('span',{class:'an'},f.ap===i?'✓ '+(i+1):i+1))));
};
G.howMade=(s,r)=>{
 const c=s.cont,i=idxOf(s),prev=shots()[i-1];
 if(r!=='open')return "Made from this shot's opening frame, the action and the Looks at the end.";
 if(!prev||c.kind==='cut')return 'Made from the cast images and the prompt. No continuity source.';
 if(c.kind==='continues')return `Starts from ${(c.pin||prev.id+':end').replace(':end',' ending')} as the base image.`;
 if(c.kind==='newview')return `Same place as ${prev.id}; its ending informs the setting, not the framing.`;
 return `Match cut${c.mk?' ('+c.mk+')':''}: ${(c.pin||prev.id+':end').replace(':end',' ending')} guides the framing only; it is not the base image.`;
};
G.frameStage=(s,r,o={})=>{
 const f=frame(s,r);
 const big=h('div',{class:'bigframe st-'+f.st},
  f.st==='none'&&!f.n?h('div',{class:'ph big'},A.el(A.glyph(s.cam.size),'phg'),h('b',{},'No '+ROLE_NAME[r].toLowerCase()+' frame yet'),h('span',{class:'dim small'},A.SIZE_ABBR[A.sizeKey(s.cam.size)]+' · '+s.cam.lens+' · '+s.cam.move.toLowerCase()),h('span',{class:'faint small'},G.howMade(s,r))):A.frameEl(s,r,{seed:f.cur+1}),
  f.st==='appr'&&f.ap===f.cur?h('span',{class:'apbadge'},'✓ Approved'):f.n?h('span',{class:'apbadge c'},'Attempt '+(f.cur+1)+' of '+f.n):'',
  h('span',{class:'roletag'},s.id+' · '+ROLE_NAME[r]));
 return h('div',{class:'fstage'+(o.cls?' '+o.cls:'')},
  big,
  h('div',{class:'fside'},
   h('div',{class:'row'},h('b',{class:'lbl'},'Attempts'),h('span',{class:'faint small'},f.n?f.n+' so far':'')),G.attempts(s,r),
   G.genFrameBtns(s,r),
   f.n?h('div',{class:'faint small'},G.howMade(s,r)):''));
};
/* ---------- prompts: readable together, ingredients inline as small visual items (never a tab) ---------- */
G.ingStrip=ing=>h('div',{class:'ingline'},ing.filter(i=>i.v.length).map(i=>h('div',{class:'ingg',title:i.k},h('span',{class:'ingk'},i.k),
 h('div',{class:'ingthumbs'},i.v.map(x=>x.art?h('span',{class:'ithumb',title:x.t},A.el(x.art,'ithumb')):h('span',{class:'ingtxt'},x.t))))));
G.promptBlock=(key,label,text,ing,ovFlag,onOverride,onReset,o={})=>{
 const open=S.open['p:'+key]??o.open??false;
 return h('div',{class:'prm2 final'+(open?' open':'')},
  h('div',{class:'prmh'},h('b',{class:'small'},label),ovFlag?h('span',{class:'chip warn'},'Prompt overridden'):h('span',{class:'faint small'},'generated from the shot'),h('span',{class:'sp'}),
   h('button',{class:'ghost small',onclick:()=>{S.open['p:'+key]=!open;render()}},open?'Done':'Edit')),
  open?h('div',{class:'prmt'},U.ta(text,v=>onOverride(v),o.rows||5,{class:'mono'}),h('div',{class:'row'},h('span',{class:'faint small'},'Editing is an explicit override; the generated prompt stops following the shot.'),h('span',{class:'sp'}),ovFlag?h('button',{class:'ghost small',onclick:onReset},'Back to generated'):'')):
   h('p',{class:'prmp full',onclick:()=>{S.open['p:'+key]=true;render()},title:'Click to edit'},text),
  G.ingStrip(ing));
};
G.framePrompt=(s,r)=>{const f=frame(s,r);
 return G.promptBlock('f:'+s.id+r,ROLE_NAME[r]+' frame prompt',framePrompt(s,r),frameIngredients(s,r),f.pov!=null,v=>{f.pov=v;render()},()=>{f.pov=null;render()},{rows:4});};
G.videoPrompt=(s,o={})=>G.promptBlock('v:'+s.id,'Video prompt',videoPrompt(s),videoIngredients(s),s.vp.ov!=null,v=>{s.vp.ov=v;render()},()=>{s.vp.ov=null;render()},{rows:5,...o});

/* ---------- references ---------- */
G.allRefs=s=>[...s.refs,...rolesOf(s).flatMap(k=>frame(s,k).refs)];
G.refsTab=(s,r)=>{
 const f=frame(s,r),rows=frameAssets(s,r);
 const mine=[...s.refs.filter(x=>x.scope==='shot'||x.scope===r),...f.refs];
 const grp=(cls,title,sub,kids)=>kids.length?h('div',{class:'rg '+cls},h('div',{class:'rgh'},h('i',{class:'rgd'}),h('b',{},title),h('span',{class:'faint small'},sub)),h('div',{class:'rgk'},kids)):'';
 const rm=x=>()=>undoable('Reference removed',()=>{s.refs=s.refs.filter(q=>q!==x);f.refs=f.refs.filter(q=>q!==x)});
 const by=(...ts)=>mine.filter(x=>ts.includes(x.type)).map(x=>P.refCard(x,s,{onremove:rm(x)}));
 const assetTiles=rows.map(x=>h('div',{class:'atile'+(x.on?' on':' off'),title:x.on?'Used for this frame. Click to leave out.':'Not in this frame. Click to add.'},
  U.at(x.r.a,x.look,x.r.view,{size:'s',short:true,onclick:()=>{const want=!x.on;if(want===x.derived)delete f.ov[x.r.a];else f.ov[x.r.a]=want?'+':'-';render()},extra:[h('span',{class:'tog'},x.on?'✓':'+'),h('button',{class:'info',title:'Look, View, presence…',onclick:e=>{e.stopPropagation();S.drawer={mode:'asset',a:x.r.a};render()}},'ⓘ')]}),
  h('div',{class:'atv small'},PRES[x.r.pres]!=='Stays throughout'?PRES[x.r.pres]:'',x.r.dirs&&x.r.dirs.length>1?h('em',{},' '+x.r.dirs.length+' Directions'):'',x.ov?h('em',{},x.ov==='+'?' added here':' left out here'):'',persists(s,x.r)&&r==='end'?h('em',{},' changed'):'')));
 return h('div',{class:'reftray'},
  grp('g-asset','Assets','identity · Look · View'+' · '+ROLE_NAME[r].toLowerCase()+' frame',assetTiles),
  h('div',{class:'row wrap'},h('button',{class:'primary',onclick:()=>{S.refLib={scope:r};S.drawer=null;render()}},'＋ Add reference image'),h('span',{class:'faint small'},'Browse frames, uploads, storyboard panels and CineBlock captures')),
  grp('g-comp','Frames from this film','composition reference',by('shot')),
  grp('g-sb','Storyboard panels','composition reference',by('storyboard')),
  grp('g-up','Uploaded references','your own images',by('upload')),
  grp('g-cine','CineBlock captures','blocking',by('cineblock')),
  h('div',{class:'dsec'},h('div',{class:'row'},h('b',{class:'lbl'},'Block in CineBlock')),G.cineButtons(s)));
};

/* ---------- visual reference library (Record 5 RL): a derived read over frames, Reference Media, storyboard panels and captures ---------- */
G.media=[{id:'rm1',label:'Marta in rain (photo)'},{id:'rm2',label:'Fog on the quay'},{id:'rm3',label:'Lamp study'},{id:'rm4',label:'Door staging sketch'}];
const sbSeed=(id)=>'sb-'+id;
G.libSections=()=>{
 const c=S.refLib,q=(c.q||'').toLowerCase(),match=t=>!q||t.toLowerCase().includes(q);
 const me=cur(),L=shots();
 const frameItems=(shotList,sceneNo)=>shotList.flatMap(x=>rolesOf(x).flatMap(r=>{
  const f=frame(x,r),out=[];
  if(x===me&&r===(c.scope==='shot'?S.role:c.scope))return out;
  if(f.ap!=null)out.push({id:`f:${x.id}:${r}:${f.ap}`,kind:'shot',srcShot:x.id,srcRole:r,sobj:x,seed:f.ap+1,title:`${x.id} ${ROLE_NAME[r].toLowerCase()}`,badge:'Approved',sub:x.name,scene:sceneNo});
  if(c.other)for(let i=0;i<f.n;i++)if(i!==f.ap)out.push({id:`f:${x.id}:${r}:${i}`,kind:'shot',srcShot:x.id,srcRole:r,sobj:x,seed:i+1,title:`${x.id} ${ROLE_NAME[r].toLowerCase()}`,badge:'Attempt '+(i+1),sub:x.name,scene:sceneNo});
  return out;
 }));
 const sceneItems=frameItems(L,S.scene);
 const projectItems=c.project?[6,8,9].flatMap(n=>{const sceneO=D.scenes[n];return sceneO?frameItems(sceneO.shots.slice(0,5),n).map(i=>({...i,badge2:'Scene '+n})):[]}):[];
 const sb=[...L.map(x=>({id:'sb:'+x.id,kind:'storyboard',seed:sbSeed(x.id),title:'Panel · '+x.id,badge:'Matched to '+x.id,sub:x.name})),
  ...[['Page 4, panel 2','4-2'],['Page 5, panel 1','5-1'],['Folder: wides, no. 3','w3']].map(([t,k])=>({id:'sbu:'+k,kind:'storyboard',seed:sbSeed('u'+k),title:t,badge:'Import tray',sub:'unmatched'}))];
 const cine=[...L.flatMap(x=>x.refs.filter(r=>r.type==='cineblock').map(r=>({id:'cb:'+r.id,kind:'cineblock',cap:r,srcShot:x.id,seed:'cb'+r.id,title:'Capture · '+x.id,badge:'CineBlock',sub:r.desc||'needs a description'}))),
  {id:'cb:x1',kind:'cineblock',seed:'cbx1',shotRef:L[0]&&L[0].id,title:'Capture · scene blocking',badge:'CineBlock',sub:'wide blocking, door wall'}];
 const med=G.media.map(m=>({id:'m:'+m.id,kind:'upload',seed:m.id,title:m.label,badge:'Upload',sub:'Reference Media'}));
 return[
  {k:'frames',title:'Frames from this film',sub:c.other?'approved frames and other attempts':'approved frames',items:[...sceneItems,...projectItems].filter(i=>match(i.title+' '+i.sub)),more:true},
  {k:'uploads',title:'Uploaded references',sub:'your Reference Media',items:med.filter(i=>match(i.title)),upload:true},
  {k:'sb',title:'Storyboard panels',sub:'matched to this scene first, then the import tray',items:sb.filter(i=>match(i.title+' '+i.sub+i.badge))},
  {k:'cine',title:'CineBlock captures',sub:'blocking, not finished frames',items:cine.filter(i=>match(i.title+' '+i.sub))}];
};
G.libArt=i=>i.kind==='shot'?A.frame(i.sobj,i.srcRole,{seed:i.seed}):i.kind==='cineblock'?A.cine(shot(i.srcShot)||cur(),'open'):A.upload(i.seed);
G.refLibrary=()=>{
 const c=S.refLib,s=cur(),roles=rolesOf(s),secs=G.libSections(),all=secs.flatMap(x=>x.items),pick=all.find(i=>i.id===c.pick);
 const scopeOpts=[['shot','Whole shot'],...roles.map(k=>[k,ROLE_NAME[k]+' frame'])];
 const attach=()=>{
  const ref={id:uid('r'),scope:c.scope,note:c.note||'',map:c.map||''};
  if(pick.kind==='shot')Object.assign(ref,{type:'shot',label:'',srcShot:pick.srcShot,srcScene:pick.scene,srcRole:pick.srcRole,recompose:c.note||''});
  else if(pick.kind==='cineblock')Object.assign(ref,{type:'cineblock',label:'CineBlock capture',capture:1,desc:'',assetsOk:false});
  else if(pick.kind==='storyboard')Object.assign(ref,{type:'storyboard',label:pick.title,seed:pick.seed});
  else Object.assign(ref,{type:'upload',label:pick.title,id:pick.seed});
  if(ref.type==='upload')ref.id=pick.seed;
  s.refs.push(ref);S.refLib=null;render();
  toast(`${pick.title} attached to ${s.id} (${c.scope==='shot'?'whole shot':ROLE_NAME[c.scope].toLowerCase()+' frame'}) as a composition reference`);
 };
 return h('aside',{class:'drawer rlib'},h('div',{class:'dscroll','data-scroll':'rlib'},h('div',{class:'col drawerc'},
  h('div',{class:'row'},h('b',{class:'dh'},'Add reference image'),h('span',{class:'faint small'},'for '+s.id),h('span',{class:'sp'}),h('button',{class:'ghost',onclick:()=>{S.refLib=null;render()}},'✕')),
  h('div',{class:'row wrap'},h('input',{class:'rlq',placeholder:'Search frames, panels, uploads…',value:c.q||'',oninput:e=>{c.q=e.target.value},onchange:()=>render()}),
   h('button',{class:'small',onclick:()=>{const n=G.media.length+1,m={id:'rm'+(n+10),label:'New upload '+n};G.media.push(m);c.pick='m:'+m.id;render();toast('Uploaded to Reference Media (mock)')}},'⬆ Upload')),
  secs.map(sec=>h('div',{class:'rlsec'},
   h('div',{class:'row'},h('b',{class:'lbl'},sec.title),h('span',{class:'faint small'},sec.sub),
    sec.more?[h('span',{class:'sp'}),h('label',{class:'small dim'},h('input',{type:'checkbox',checked:c.project?true:null,onchange:e=>{c.project=e.target.checked;render()}}),' whole project'),h('label',{class:'small dim'},h('input',{type:'checkbox',checked:c.other?true:null,onchange:e=>{c.other=e.target.checked;render()}}),' other attempts')]:''),
   sec.items.length?h('div',{class:'rlgrid'},sec.items.map(i=>h('div',{class:'rlt'+(c.pick===i.id?' on':'')+(i.badge==='Import tray'?' tray':''),onclick:()=>{c.pick=c.pick===i.id?null:i.id;render()},title:i.title+' · '+i.sub},
    A.el(G.libArt(i),'a-frame'),h('span',{class:'rlb b-'+i.kind},i.badge),i.badge2?h('span',{class:'rlb2'},i.badge2):'',h('div',{class:'rlm small'},h('b',{},i.title)),h('div',{class:'rlm faint small'},i.sub)))):
    h('div',{class:'faint small'},sec.k==='cine'?'No captures yet. Block this shot in CineBlock to make some.':'Nothing matches.'))),
  h('div',{class:'rlbar'},
   pick?h('div',{class:'col',style:'gap:8px'},
    h('div',{class:'row'},h('div',{class:'rlpick'},A.el(G.libArt(pick),'a-frame')),h('div',{class:'col',style:'gap:2px;flex:1'},h('b',{class:'small'},pick.title),h('span',{class:'faint small'},pick.badge+' · '+pick.sub))),
    h('div',{class:'row wrap'},h('span',{class:'faint small'},'Attach to'),U.seg(scopeOpts,c.scope,v=>{c.scope=v;render()})),
    h('input',{placeholder:'How to recompose it (e.g. clean medium of Marta, remove the second person)',value:c.note||'',oninput:e=>{c.note=e.target.value}}),
    h('div',{class:'row wrap'},h('span',{class:'faint small'},'Subject in the image is'),U.sel([['','not mapped'],...s.roster.map(r=>[r.a,aname(r.a)])],c.map||'',v=>{c.map=v})),
    h('div',{class:'row'},h('span',{class:'faint small'},'A reference steers composition only. It never supplies identity.'),h('span',{class:'sp'}),h('button',{class:'primary',onclick:attach},'Attach reference'))):
   h('div',{class:'faint small'},'Pick an image. Approved frames from this scene come first.')))));
};

/* ---------- readiness: quiet status text beside the toggle; explains, never gates ---------- */
G.status=s=>{
 const roles=rolesOf(s),a=roles.filter(k=>frame(s,k).st==='appr').length,hard=G.checks(s).filter(c=>c[1]!=='soft'),soft=G.checks(s).filter(c=>c[1]==='soft');
 const go=(mode,tab)=>()=>{S.genMode=mode;if(tab)S.ftab=tab;S.refLib=null;S.drawer=null;render()};
 const piece=(txt,ok,fn,tip)=>h('span',{class:'rs '+(ok?'ok':'warn')+(fn?' click':''),title:tip||'',onclick:fn},ok?'✓ ':'! ',txt);
 const ovr=roles.some(k=>frame(s,k).pov!=null)||s.vp.ov!=null;
 return h('div',{class:'rstat'},
  piece(hard.length?'Inputs: '+hard[0][0]:'Inputs',!hard.length,hard.length?go('frames','refs'):null,hard.length?'Opens the tab that fixes it':soft.map(c=>c[0]).join(' · ')),
  h('span',{class:'faint'},'·'),
  roles.length?piece(`Frames ${a}/${roles.length}`,a===roles.length,null):h('span',{class:'rs'},'Video only'),
  h('span',{class:'faint'},'·'),
  piece(ovr?'prompts overridden':'prompts ready',true,go(S.genMode==='frames'?'frames':'takes',S.genMode==='frames'?'prompts':null)),
  soft.length?h('span',{class:'whisper',title:soft.map(c=>c[0]).join(' · ')}):'');
};
G.head=s=>{
 const L=shots(),i=idxOf(s);
 return h('div',{class:'genhead2'},
  h('div',{class:'row gshotbar'},
   h('button',{class:'ghost icon',disabled:i<1?true:null,onclick:()=>{S.shot=L[i-1].id;S.tkShow=null;render()}},'‹'),
   h('b',{class:'gsid'},s.id),h('span',{class:'dim'},s.name),h('span',{class:'faint small'},`${A.SIZE_ABBR[A.sizeKey(s.cam.size)]} · ${s.cam.lens} · ${A.moveShort(s.cam.move)} · ${s.dur}s`),
   h('button',{class:'ghost icon',disabled:i>=L.length-1?true:null,onclick:()=>{S.shot=L[i+1].id;S.tkShow=null;render()}},'›')),
  h('div',{class:'modetog',role:'tablist'},[['frames','Frames'],['takes','Takes']].map(([k,l])=>h('button',{role:'tab',class:S.genMode===k?'on':'',onclick:()=>{S.genMode=k;S.refLib=null;S.drawer=null;render()}},l,k==='takes'?h('em',{},s.takes.filter(t=>!t.rej).length||''):''))),
  G.status(s),h('span',{class:'sp'}),
  h('button',{class:'ghost small',onclick:()=>{S.view='prep';S.sb=false;render()}},'Edit in Scene Prep'));
};

/* ---------- Frames mode ---------- */
G.framesCanvas=(s,r)=>{
 const roles=rolesOf(s);
 if(!roles.length)return h('div',{class:'empty small'},h('b',{},'Frames are skipped for this shot'),h('p',{class:'dim'},'It goes straight to video. Switch to Takes, or add a frame.'),h('button',{onclick:()=>{s.fp='open';S.role='open';render()}},'Add an opening frame'));
 return[h('div',{class:'row'},G.roleBar(s),h('span',{class:'sp'}),h('span',{class:'faint small'},'Neighbouring frames for continuity. Tools open on the right.')),G.continuityRow(s),G.frameStage(s,r,{cls:'big'})];
};
G.framesDrawer=(s,r)=>{
 const tabs=[['refs','References'],['prompts','Prompts'],['scene','Scene frames']],tab=S.ftab;
 const body=!r?h('div',{class:'faint'},'Frames are skipped for this shot.'):tab==='refs'?G.refsTab(s,r):tab==='prompts'?h('div',{class:'col'},G.framePrompt(s,r),G.videoPrompt(s,{open:false})):G.gallery(s);
 return h('aside',{class:'g2side'},h('div',{class:'g2tabs'},tabs.map(([k,l])=>h('button',{class:tab===k?'on':'',onclick:()=>{S.ftab=k;render()}},l,k==='refs'?h('em',{},G.allRefs(s).length||''):''))),h('div',{class:'g2sc','data-scroll':'g2s'},body));
};

G.checks=s=>{
 const out=[],roles=rolesOf(s);
 const cb=s.refs.filter(x=>x.type==='cineblock'&&!(x.desc&&x.assetsOk));
 if(cb.length)out.push(['CineBlock capture needs a description and confirmed assets']);
 s.roster.forEach(r=>{if(ASSETS_[r.a].looks[openLook(s,r)]&&!ASSETS_[r.a].looks[openLook(s,r)].img)out.push([`${aname(r.a)}: ${lookName(r.a,openLook(s,r))} has no image; generation will use its description`,'soft'])});
 roles.forEach(r=>{if(frame(s,r).stale)out.push([`${ROLE_NAME[r]} frame may be out of date`,'soft'])});
 if(s.cont.kind==='match'&&!s.cont.mk)out.push(['Match cut: choose the kind of match']);
 return out;
};

/* ---------- scene frame gallery (match a frame several shots away; attach as reference) ---------- */
G.gallery=(s,o={})=>{
 const L=shots(),sel=S.galSel;
 const tiles=L.flatMap(x=>rolesOf(x).map(r=>{const id=x.id+':'+r,on=sel===id;
  return h('div',{class:'gtile2'+(on?' on':'')+(x===s&&r===S.role?' me':'')+(x===s?' mine':''),onclick:()=>{S.galSel=on?null:id;render()}},G.tile(x,r),h('div',{class:'gl'},h('b',{},x.id),' '+ROLE_NAME[r].toLowerCase(),h('span',{class:'faint small'},' · '+A.SIZE_ABBR[A.sizeKey(x.cam.size)])))}));
 const bar=G.galBar(s);
 return h('div',{class:'gallery2'},h('div',{class:'galgrid2'},tiles),bar);
};
G.galBar=s=>{
 const sel=S.galSel;
 return sel?(()=>{const [sid,sr]=sel.split(':'),src=shot(sid);
  return h('div',{class:'galbar2'},h('div',{class:'gbthumb'},G.tile(src,sr)),h('div',{class:'col',style:'flex:1;gap:6px'},
   h('b',{class:'small'},`Use ${sid} ${ROLE_NAME[sr].toLowerCase()} frame as a composition reference for ${s.id} ${ROLE_NAME[S.role].toLowerCase()}`),
   h('input',{id:'recomp',placeholder:'How to recompose it (e.g. clean medium of Marta, remove the second person)'})),
   h('div',{class:'col'},h('button',{class:'primary',disabled:sid===s.id&&sr===S.role?true:null,onclick:()=>{P.addRefShot(s,S.role,sid,sr,$('#recomp').value);S.galSel=null;render();toast('Reference shot attached to '+s.id+' '+ROLE_NAME[S.role].toLowerCase())}},'Attach as reference'),
    sid!==s.id?h('button',{class:'ghost small',onclick:()=>{S.shot=sid;S.role=sr;S.galSel=null;render()}},'Go to '+sid):'')) })():'';
};
/* ---------- CineBlock: explicit entry + mocked return ---------- */
G.cineButtons=s=>h('div',{class:'row wrap'},
 h('button',{class:'cbbtn',onclick:()=>{S.cine={scope:'scene'};render()}},h('span',{class:'cbi'},'◫'),'Block scene in CineBlock'),
 h('button',{class:'cbbtn',onclick:()=>{S.cine={scope:'shot',shot:s.id};render()}},h('span',{class:'cbi'},'◫'),'Block this shot'),
 h('span',{class:'faint small'},'Captures come back as references, never as finished frames'));
G.cineOverlay=()=>{
 const c=S.cine;if(!c)return'';
 const s=c.scope==='shot'?shot(c.shot):cur();
 return h('div',{class:'overlay'},h('div',{class:'cbwin'},
  h('div',{class:'cbtop'},h('b',{},'CineBlock'),h('span',{class:'dim small'},c.scope==='scene'?`Scene ${S.scene} · all ${shots().length} shots`:`Scene ${S.scene} · focused on ${c.shot}`),h('span',{class:'sp'}),
   h('button',{class:'primary',onclick:()=>G.cineReturn()},'Return with captures'),h('button',{class:'ghost',onclick:()=>{S.cine=null;render()}},'Close without captures')),
  h('div',{class:'cbbody'},A.el(A.cine(s,S.role),'cbcanvas'),h('div',{class:'cbside'},shots().map(x=>h('div',{class:'cbshot'+(x.id===s.id?' on':'')},h('b',{},x.id),h('span',{class:'small dim'},x.name)))) ),
  h('div',{class:'faint small',style:'padding:8px 14px'},'Mock of the CineBlock tab. Returning places captures as references on the matching frame role. They still need a full description and the right assets.')));
};
G.cineReturn=()=>{
 const c=S.cine;let n=0;
 const put=(s,r)=>{if(!rolesOf(s).includes(r))return;if(s.refs.some(x=>x.type==='cineblock'&&x.scope===r))return;s.refs.push({id:uid('r'),scope:r,type:'cineblock',label:'CineBlock capture',capture:1,desc:'',assetsOk:false});n++};
 if(c.scope==='scene')shots().filter(x=>x.fp!=='skip').slice(0,4).forEach(x=>{put(x,'open');if(x.id==='7B')put(x,'end')});
 else put(shot(c.shot),S.role);
 S.cine=null;render();toast(`${n} capture${n===1?'':'s'} landed as references on the matching frame${n===1?'':'s'}. They still need a description and assets.`);
};

/* ---------- Dialogue (Record 5 VP2/VP3, Record 6 V6.2/V6.4): produce and choose the Line audio. The Voice itself is defined in World Definition. ---------- */
const VPRICE={speech:.06,xform:.05,revoice:.12};
const chars_=s=>s.roster.filter(r=>ASSETS_[r.a].t==='Character');
const speakerOf=(s,d)=>chars_(s).find(c=>aname(c.a).startsWith(d.who));
const voiceOf=(s,d)=>{const c=speakerOf(s,d);return c?{a:c.a,v:ASSETS_[c.a].voice||null}:{a:null,v:null}};
const usable=v=>!!v&&(v.kind!=='cloned'||v.auth);
const first=a=>aname(a).split(/[ ,]/)[0];
const candLabel=(c,s,d)=>c.kind==='perf'?(c.label||'Your performance'):c.kind==='xform'?`Your performance in ${first(voiceOf(s,d).a)}’s voice`:`Spoken line · ${first(voiceOf(s,d).a)}’s voice`;
const setAudio=(s,d,id)=>{d.audio=id;s.takes.forEach(t=>{t.pc=1})};
G.attest=(v,why)=>h('div',{class:'authline'},h('span',{class:'small'},`${v.name}: I own this voice, or I have the right to use it.`),
 h('button',{class:'small',onclick:()=>{v.auth='own-voice';render();toast('Recorded once for this Voice. Revocable in World Definition.')}},'My own voice'),
 h('button',{class:'small',onclick:()=>{v.auth='permitted';render();toast('Recorded once for this Voice. Revocable in World Definition.')}},'I have permission'));
G.lineAudioNote=(s,d)=>{
 const c=d.cands.find(x=>x.id===d.audio);
 return c?h('span',{class:'chip ok'},'Using: '+candLabel(c,s,d)):h('span',{class:'quiet'},'Native dialogue (the model speaks it; default)');
};
G.dialogueLine=(s,d)=>{
 const {a,v}=voiceOf(s,d),nm=a?first(a):d.who,key='sp:'+d.id,kx='xf:'+d.id;
 const cands=d.cands,recording=S.recording===d.id;
 const mk=(kind,dur,label)=>{const c={id:uid('c'),kind,dur,label};d.cands.push(c);return c};
 const speak=()=>{const run=()=>simulate(key,()=>{const c=mk('spoken',+(1.2+d.line.length*.06).toFixed(1));setAudio(s,d,c.id);toast(`Spoken line made in ${nm}’s voice and chosen for this line`,()=>{d.cands=d.cands.filter(x=>x!==c);d.audio=null;render()})},900);
  return run};
 const speakBtn=!a?h('span',{class:'quiet'},'Speak line as… needs a Voice for this speaker. ',h('button',{class:'ghost small',onclick:()=>{S.world=true;render()}},'Define it in World Definition')):
  !v?h('span',{class:'quiet'},`Speak line as ${nm}… ${nm} has no Voice yet. `,h('button',{class:'ghost small',onclick:()=>{S.world=true;render()}},'Define it in World Definition')):
  !usable(v)?G.attest(v):
  U.spend(key,`Speak line as ${nm}’s voice`,{total:VPRICE.speech,count:1,what:`Speak line ${d.id} in ${v.name}`},speak(),{primary:false});
 return h('div',{class:'dlg'},
  h('div',{class:'row dlgh'},a?U.at(a,openLook(s,s.roster.find(r=>r.a===a)),'front',{size:'xs',label:false}):h('div',{class:'at s-xs'}),
   h('div',{class:'col',style:'gap:1px;flex:1;min-width:0'},h('div',{class:'serif dlgl'},'“'+d.line+'”'),h('span',{class:'faint small'},d.who+' · '+(d.delivery||'no delivery note')))),
  h('div',{class:'row wrap'},G.lineAudioNote(s,d),d.audio?h('button',{class:'ghost small',title:'Go back to native dialogue',onclick:()=>undoable('Back to native dialogue',()=>setAudio(s,d,null))},'Use native'):''),
  cands.length?h('div',{class:'cands'},cands.map(c=>h('div',{class:'cand'+(d.audio===c.id?' on':'')},
   h('button',{class:'ghost small icon',title:'Play',onclick:()=>{S.playLine=c.id;render();setTimeout(()=>{S.playLine=null;render()},1200)}},S.playLine===c.id?'❚❚':'▶'),
   h('span',{class:'wave'+(S.playLine===c.id?' on':'')}),
   h('span',{class:'small',style:'flex:1;min-width:0'},candLabel(c,s,d)),h('span',{class:'faint small'},c.dur+' s'),
   d.audio===c.id?h('span',{class:'chip ok'},'Chosen'):h('button',{class:'small',onclick:()=>undoable('Line audio chosen',()=>setAudio(s,d,c.id))},'Use'),
   c.kind==='perf'&&a&&v?(!usable(v)?'':U.spend(kx+c.id,`Speak as ${nm}’s voice`,{total:VPRICE.xform,count:1,what:`Transform performance of ${d.id} into ${v.name}, keeping the delivery`},()=>simulate(kx+c.id,()=>{mk('xform',c.dur);toast(`Performance spoken in ${nm}’s voice, delivery kept. Use it when ready.`)},1000),{primary:false})):''))):'',
  h('div',{class:'row wrap dlgact'},
   h('button',{class:'small'+(recording?' rec':''),onclick:()=>{if(!recording){S.recording=d.id;render();return}S.recording=null;const c=mk('perf',+(1.5+d.line.length*.07).toFixed(1),'Recorded performance');setAudio(s,d,c.id);render();toast('Performance recorded and chosen. Your original is kept.')}},recording?'■ Stop':'● Record'),
   h('button',{class:'small',onclick:()=>{const c=mk('perf',+(1.4+d.line.length*.08).toFixed(1),'Uploaded performance');setAudio(s,d,c.id);render();toast('Performance uploaded and chosen (mock). Your original is kept.')}},'⬆ Upload'),
   speakBtn));
};
G.unvoiced=s=>{
 const lines=sh=>sh.dialogue.filter(d=>!d.audio).map(d=>({sh,d,...voiceOf(sh,d)}));
 const mine=lines(s),ok=mine.filter(x=>x.v&&usable(x.v)),left=mine.filter(x=>!(x.v&&usable(x.v)));
 const scene=shots().flatMap(lines),sOk=scene.filter(x=>x.v&&usable(x.v));
 const run=list=>()=>{list.forEach(x=>{const c={id:uid('c'),kind:'spoken',dur:+(1.2+x.d.line.length*.06).toFixed(1)};x.d.cands.push(c);setAudio(x.sh,x.d,c.id)});toast(`${list.length} line${list.length===1?'':'s'} spoken and chosen. Takes made before are marked “line audio changed”.`)};
 if(!mine.length&&!sOk.length)return'';
 const why=left.map(x=>x.v?`${x.d.who}’s Voice needs authorising`:`${x.d.who} has no Voice`);
 return h('div',{class:'col',style:'gap:6px'},
  ok.length?U.spend('uv:'+s.id,`Generate unvoiced lines · ${ok.length} line${ok.length===1?'':'s'}`,{total:+(ok.length*VPRICE.speech).toFixed(2),count:ok.length,what:`Speak ${ok.length} unvoiced line${ok.length===1?'':'s'} in this shot`},()=>simulate('uv:'+s.id,run(ok),900),{primary:false}):'',
  left.length?h('span',{class:'quiet'},left.length+' line'+(left.length===1?'':'s')+' left out: '+[...new Set(why)].join('; ')):'',
  sOk.length>ok.length?U.spend('uvs:'+S.scene,`This whole scene · ${sOk.length} line${sOk.length===1?'':'s'}`,{total:+(sOk.length*VPRICE.speech).toFixed(2),count:sOk.length,what:`Speak ${sOk.length} unvoiced lines across scene ${S.scene}`},()=>simulate('uvs:'+S.scene,run(sOk),900),{primary:false}):'');
};
G.dialogueSection=s=>{
 if(!s.dialogue.length)return h('div',{class:'dsec'},h('div',{class:'row'},h('b',{class:'lbl'},'Dialogue')),h('div',{class:'faint small'},'No dialogue in this shot. Native sound only.'));
 const req=s.dialogue.filter(d=>d.audio).reduce((a,d)=>a+(d.cands.find(c=>c.id===d.audio)?.dur||0),0)+.3+.3+.4*Math.max(0,s.dialogue.filter(d=>d.audio).length-1);
 return h('div',{class:'dsec'},
  h('div',{class:'row'},h('b',{class:'lbl'},'Dialogue'),h('span',{class:'faint small'},'Native dialogue is the default. Nothing here runs unless you start it.')),
  s.dialogue.map(d=>G.dialogueLine(s,d)),
  req>s.dur&&s.dialogue.some(d=>d.audio)?h('div',{class:'quiet'},`Line audio runs ${req.toFixed(1)} s. This Take will be made long enough (audio is never trimmed); the shot says ${s.dur} s. `,h('button',{class:'ghost small',onclick:()=>{s.dur=Math.ceil(req);render()}},'Set shot to '+Math.ceil(req)+' s')):'',
  G.unvoiced(s),
  h('div',{class:'faint small'},'A Character’s Voice is defined in World Definition, beside its Looks.'));
};

/* ---------- Takes mode ---------- */
const lastN=lastTakeN;
G.takeFlags=(t,s)=>[M[t.model].n,t.guided?'guided':'',t.override?'prompt overridden':'',t.parts>1?t.parts+' parts':'',t.rv?'revoiced from Take '+t.rv:'',t.audio==='line'?'line audio':t.rv?'':'native dialogue'].filter(Boolean).join(' · ');
G.composerEst=s=>takeEst(s,modelOf(s));
G.genTake=(s,o={})=>{
 const key='tk:'+s.id,m=modelOf(s),e=takeEst(s,m);
 const run=()=>simulate(key,()=>{s.fail=null;s.partial=null;s.takes=s.takes.filter(t=>!t.partialTake);const n=lastN(s)+1;const t={id:uid('k'),model:m,dur:s.dur,n,guided:S.tk.guid[s.id]||undefined,fresh:1,audio:s.dialogue.some(d=>d.audio)?'line':'native'};s.takes.push(t);S.tkShow=t.id;toast(`Take ${n} of ${s.id} is ready, not selected`)},1400);
 return U.spend(key,o.label||(s.takes.filter(t=>!t.rej).length?'Generate Another Take':'Generate Take'),{total:e.total,unknown:e.unknown,count:1,what:`${s.id} · ${M[m].n} · ${s.dur}s${e.parts>1?' in '+e.parts+' parts':''}`},run,{primary:o.primary??true,cls:'bigbtn'});
};
G.shown=s=>{const live=s.takes.filter(t=>!t.rej);return live.find(t=>t.id===S.tkShow)||picked(s)||live[live.length-1]||null};
G.preTake=(s,generating)=>{
 const roles=rolesOf(s),n=lastN(s)+1;
 return h('div',{class:'pretake'},
  h('div',{class:'ptframes'},roles.length?roles.map((k,i)=>[i?h('span',{class:'varrow'},'→'):'',h('div',{class:'ptf'},G.tile(s,k,{onclick:()=>{S.role=k;S.genMode='frames';render()}}),h('span',{class:'small '+(frame(s,k).st==='appr'?'ok':'quiet')},ROLE_NAME[k]+(frame(s,k).st==='appr'?' · approved':' · not approved')))]):
    h('div',{class:'ptf wide'},h('div',{class:'ftile2 empty'},h('span',{class:'faint'},'Video only: no frames')),h('div',{class:'row wrap'},G.allRefs(s).slice(0,4).map(r=>h('span',{class:'ithumb'},A.el(P.refArt(r,s),'ithumb'))),G.allRefs(s).length?'':h('span',{class:'faint small'},'The cast images and the video prompt drive this Take')))),
  generating?h('div',{class:'ptover'},h('i',{class:'spin big'}),h('b',{},'Generating Take '+n+'…'),h('span',{class:'faint small'},'Cancelling may still be charged')):'',
  h('div',{class:'ptcap'},generating?'The approved frames are being turned into video.':'No Take yet. '+(roles.length?'These approved frames start the video. Refine the video prompt on the right, then generate.':'Refine the video prompt on the right, then generate.')));
};
G.player=(s,t)=>{
 const play=S.tkPlay===t.id;
 return h('div',{class:'tplayer'},
  h('div',{class:'tpv'+(play?' playing':'')},A.el(A.take(s,t),'a-frame tpart'),
   h('button',{class:'tpplay',onclick:()=>{S.tkPlay=play?null:t.id;render();if(!play)setTimeout(()=>{if(S.tkPlay===t.id){S.tkPlay=null;render()}},Math.min(t.dur,6)*1000)}},play?'❚❚':'▶'),
   s.sel===t.id?h('span',{class:'tpin'},'Selected'):t.fresh?h('span',{class:'tnew'},'ready, not selected'):'',h('span',{class:'tdur'},t.dur+' s'),h('div',{class:'tpbar'},h('i',{style:play?`animation-duration:${Math.min(t.dur,6)}s`:'width:0'}))),
  h('div',{class:'row tpmeta'},h('b',{},`${s.id} · Take ${t.n}`),h('span',{class:'faint small'},G.takeFlags(t,s)),t.pc?h('span',{class:'quiet'},h('span',{class:'whisper'}),' line audio changed since this Take'):'' ,h('span',{class:'sp'}),
   s.sel===t.id?h('button',{onclick:()=>undoable('Unselected',()=>{if(!s.final)s.sel=null})},'Unselect'):h('button',{class:'primary',onclick:()=>T.select(s,t)},'Use this Take'),
   h('button',{onclick:()=>G.openReview(s)},'Open in Review ›')));
};
G.revoice=(s,t)=>{
 if(t.audio==='line'||t.rv&&false)return'';
 const sp=[...new Set(s.dialogue.map(d=>d.who))];
 if(!sp.length)return'';
 const d0=s.dialogue[0],{a,v}=voiceOf(s,d0);
 const why=sp.length>1?'Unavailable: two speaking Characters and this Offering does not isolate speakers.':!a?'Unavailable: this speaker is not a Character in the shot.':!v?`Unavailable: ${first(a)} has no Voice. Define one in World Definition.`:null;
 const nm=a?first(a):'';
 const key='rv:'+t.id;
 return h('div',{class:'revoice'},h('div',{class:'row wrap'},h('b',{class:'small'},'Native dialogue → Character Voice'),
  why?h('span',{class:'quiet'},why):!usable(v)?G.attest(v):U.spend(key,`Revoice as ${nm}’s voice`,{total:VPRICE.revoice,count:1,what:`Revoice Take ${t.n} of ${s.id} in ${v.name}`},()=>simulate(key,()=>{const n=lastN(s)+1,k={id:uid('k'),model:t.model,dur:t.dur,n,rv:t.n,audio:'revoiced',fresh:1};s.takes.push(k);S.tkShow=k.id;toast(`Revoiced Take ${n} made from Take ${t.n}. Not selected; the source is unchanged.`)},1300),{primary:false})),
  h('span',{class:'faint small'},'Best effort. Wrong native words carry through, ambience may change, and it never updates your script. Where exact words matter, use Speak line as a Voice.'));
};
G.takeCard=(s,t)=>{
 const shown=G.shown(s)===t,cmp=S.tk.cmp.includes(t.id);
 return h('div',{class:'tkc'+(s.sel===t.id?' sel':'')+(shown?' shown':''),onclick:()=>{S.tkShow=t.id;render()}},
  h('div',{class:'tkv',title:'Show in the player'},A.el(A.take(s,t),'a-frame'),h('span',{class:'play'},'▶'),h('span',{class:'tdur'},t.dur+'s'),s.sel===t.id?h('span',{class:'tpin'},'Selected'):'',t.fresh&&s.sel!==t.id?h('span',{class:'tnew'},'ready, not selected'):''),
  h('div',{class:'tkm'},h('b',{},'Take '+t.n),h('span',{class:'faint small'},G.takeFlags(t,s))),
  h('div',{class:'row'},s.sel===t.id?h('button',{class:'small',onclick:e=>{e.stopPropagation();undoable('Unselected',()=>{if(!s.final)s.sel=null})}},'Unselect'):h('button',{class:'small',onclick:e=>{e.stopPropagation();T.select(s,t)}},'Use this Take'),
   h('button',{class:'ghost small'+(cmp?' on':''),title:'Compare up to three Takes',onclick:e=>{e.stopPropagation();S.tk.cmp=cmp?S.tk.cmp.filter(x=>x!==t.id):[...S.tk.cmp,t.id].slice(-3);render()}},cmp?'✓ compare':'compare')));
};
G.takesRow=s=>{
 const live=s.takes.filter(t=>!t.rej),failed=s.fail||s.partial,gen=S.gens['tk:'+s.id];
 return h('div',{class:'takesx'},
  h('div',{class:'row'},h('b',{class:'lbl'},'Takes for '+s.id),h('span',{class:'faint small'},live.length?live.length+' attempt'+(live.length===1?'':'s')+(picked(s)?' · one selected':' · none selected'):'None yet'),h('span',{class:'sp'}),
   S.tk.cmp.length>=2?h('button',{onclick:()=>{S.tk.compare=true;render()}},'Compare '+S.tk.cmp.length):''),
  h('div',{class:'tkrow'},live.map(t=>G.takeCard(s,t)),
   failed&&!gen?h('div',{class:'tkc failed'},h('div',{class:'tkv fail'},h('span',{class:'big'},s.partial?`${s.partial.done} of ${s.partial.of} parts made`:'No Take'),h('span',{class:'small dim'},s.fail?.text||'')),
    h('div',{class:'row wrap'},S.open['fi:'+s.id]?'':h('button',{class:'small',onclick:()=>{S.open['fi:'+s.id]=true;render()}},'Inspect failure'),
     s.partial?U.spend('tkp:'+s.id,'Retry part 3',{total:+(M.kling.rate*6).toFixed(2),count:1,what:'Retry part 3 of '+s.id},()=>simulate('tkp:'+s.id,()=>{s.partial=null;s.fail=null;const k=s.takes[0];if(k)k.fresh=1;toast('Part 3 made. Take is ready, not selected')}),{primary:false}):
     U.spend('tkr:'+s.id,'Retry',{total:+(M.kling.rate*s.dur).toFixed(2),count:1,what:'Retry the failed Take of '+s.id},()=>simulate('tkr:'+s.id,()=>{s.fail=null;const n=lastN(s)+1;s.takes.push({id:uid('k'),model:modelOf(s),dur:s.dur,n,fresh:1,audio:'native'});toast('Retry made Take '+n+'. Not selected')}),{primary:false})),
    S.open['fi:'+s.id]?h('div',{class:'finfo small'},h('div',{},h('b',{},'What happened')),h('div',{class:'dim'},s.partial?'The provider stopped rendering after part 2 of 3 (upstream timeout). Parts 1 and 2 are kept.':s.fail?.timedOut?'The request timed out after 240 s. The provider may still bill it.':'The provider declined the request.'),h('div',{class:'dim'},s.fail?.text||''),h('div',{class:'dim'},'Request id rq_8f2c…41 · '+(s.fail?.timedOut||s.partial?'may have been charged':'not charged'))):''):'',
   gen?h('div',{class:'tkc gen'},h('div',{class:'tkv gen'},h('i',{class:'spin big'}),h('span',{class:'small'},'Generating Take '+(lastN(s)+1)+'…')),h('span',{class:'faint small'},'Cancelling may still be charged')):'',
   !live.length&&!failed&&!gen?h('div',{class:'faint small',style:'padding:14px 4px'},'Your Takes will appear here.'):''));
};
G.takesCanvas=s=>{
 const t=G.shown(s),gen=S.gens['tk:'+s.id];
 return[
  S.tk.compare&&S.tk.cmp.length>=2?T.compare(s):gen||!t?G.preTake(s,gen):[G.player(s,t),G.revoice(s,t)],
  G.takesRow(s)];
};

/* ---------- THE take composer: Generate → Takes drawer and Review's "Make another take" are this one component (GN8) ---------- */
G.composer=(s,o={})=>{
 const m=modelOf(s),e=takeEst(s,m),roles=rolesOf(s),refs=G.allRefs(s),unappr=roles.filter(k=>frame(s,k).st!=='appr');
 const sec=(t,sub,body)=>h('div',{class:'dsec'},h('div',{class:'row'},h('b',{class:'lbl'},t),sub?h('span',{class:'faint small'},sub):''),body);
 const body=[
  sec('Video prompt','',G.videoPrompt(s,{open:true})),
  sec('Frame inputs',roles.length?'':'frames skipped',roles.length?h('div',{class:'row wrap'},roles.map((k,i)=>[i?h('span',{class:'varrow'},'→'):'',h('div',{style:'width:120px'},G.tile(s,k,{onclick:o.nogo?null:()=>{S.role=k;S.genMode='frames';render()}}))]),unappr.length?h('span',{class:'quiet'},unappr.map(k=>ROLE_NAME[k]).join(' and ')+' not approved. You can still generate.'):''):''),
  sec('References sent with this Take',refs.length+' attached',h('div',{class:'row wrap'},refs.map(r=>h('div',{class:'rtile',title:r.type},A.el(P.refArt(r,s),'a-frame'),h('i',{class:'rk '+r.type}))),
   h('button',{class:'small',onclick:()=>{S.refLib={scope:'shot'};S.drawer=null;render()}},'＋ Add reference image'),refs.length?'':h('span',{class:'faint small'},'Cast images ride along automatically'))),
  sec('Guidance','optional',U.inp(S.tk.guid[s.id]||'',v=>{S.tk.guid[s.id]=v},{placeholder:'e.g. slower push-in, warmer lamp'})),
  G.dialogueSection(s)];
 return h('div',{class:'composer-final'+(o.wide?' wide':'')},
  h('div',{class:'cfbody'},body),
  h('div',{class:'cffoot'},
   h('div',{class:'row wrap'},h('span',{class:'lbl'},'Model'),U.sel(Object.entries(M).map(([k,v])=>[k,v.n+(k==='kling'?' · default':'')+(v.rate==null?' · price unavailable':' · $'+v.rate.toFixed(2)+'/s')]),m,v=>{S.tk.model[s.id]=v;S.ticket=null;render()}),
    h('span',{class:'faint small'},`${s.dur} s${e.parts>1?' · '+e.parts+' parts, one Take':''}`)),
   h('div',{class:'row wrap'},G.genTake(s,{primary:true}),h('span',{class:'faint small'},e.unknown?'price unavailable':'estimate '+money(e.total)))));
};
G.takesDrawer=s=>h('aside',{class:'g2side takesd'},h('div',{class:'g2tabs one'},h('b',{},'Make a Take'),h('span',{class:'faint small'},s.id+' · one panel')),h('div',{class:'g2sc','data-scroll':'g2t'},G.composer(s)));

G.openReview=s=>{S.shot=s.id;S.view='review';S.tk.film=false;S.tk.compare=false;render();toast('Opened in Review at '+s.id+'. “Fix this shot” brings you back here.')};

/* ---------- Generate layout: Frames | Takes switches canvas and drawer together ---------- */
G.layout=()=>{
 const s=cur(),roles=rolesOf(s),r=roles.includes(S.role)?S.role:roles[0],frames=S.genMode==='frames';
 const drawer=S.refLib?G.refLibrary():S.drawer?h('aside',{class:'g2side'},P.drawer()):frames?G.framesDrawer(s,r):G.takesDrawer(s);
 return h('div',{class:'gen2 final'},h('div',{class:'g2main'},h('div',{class:'g2canvas','data-scroll':'g2c-'+S.genMode},frames?G.framesCanvas(s,r):G.takesCanvas(s)),drawer));
};
window.G=G;
})();

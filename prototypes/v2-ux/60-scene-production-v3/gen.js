/* Generate: ONE pipeline. inputs & readiness -> references -> opening/ending/key frames (continuity row, attempts, approve) -> frame prompt -> video prompt -> Generate Take -> Take attempts.
   Components are shared; three layouts (1 vertical pipeline, 2 canvas + drawers + dock, 3 scene frame carousel + dock) only arrange them. */
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
G.framePrompt=(s,r)=>{const f=frame(s,r);
 return U.prompt('f:'+s.id+r,ROLE_NAME[r]+' frame prompt',framePrompt(s,r),frameIngredients(s,r),f.pov!=null,v=>{f.pov=v;render()},()=>{f.pov=null;render()},{rows:4});};
G.videoPrompt=s=>U.prompt('v:'+s.id,'Video prompt',videoPrompt(s),videoIngredients(s),s.vp.ov!=null,v=>{s.vp.ov=v;render()},()=>{s.vp.ov=null;render()},{rows:5});

/* ---------- references, visually distinguished by where they come from ---------- */
G.refTray=(s,r)=>{
 const f=frame(s,r),rows=frameAssets(s,r);
 const mine=[...s.refs.filter(x=>x.scope==='shot'||x.scope===r),...f.refs];
 const by=t=>mine.filter(x=>x.type===t);
 const grp=(cls,title,sub,kids,add)=>h('div',{class:'rg '+cls},h('div',{class:'rgh'},h('i',{class:'rgd'}),h('b',{},title),h('span',{class:'faint small'},sub)),h('div',{class:'rgk'},kids,add||''));
 const assetTiles=rows.map(x=>h('div',{class:'atile'+(x.on?' on':' off'),title:x.on?'Used for this frame. Click to leave out.':'Not in this frame. Click to add.'},
  U.at(x.r.a,x.look,x.r.view,{size:'s',short:true,onclick:()=>{const want=!x.on;if(want===x.derived)delete f.ov[x.r.a];else f.ov[x.r.a]=want?'+':'-';render()},extra:[h('span',{class:'tog'},x.on?'✓':'+'),h('button',{class:'info',title:'Look, View, presence…',onclick:e=>{e.stopPropagation();S.drawer={mode:'asset',a:x.r.a};render()}},'ⓘ')]}),
  h('div',{class:'atv small'},A.SIZE_ABBR&&PRES[x.r.pres]!=='Stays throughout'?PRES[x.r.pres]:'',x.ov?h('em',{},x.ov==='+'?' added here':' left out here'):'',persists(s,x.r)&&r==='end'?h('em',{},' changed'):'')));
 return h('div',{class:'reftray'},
  grp('g-asset','Assets','identity · Look · View',[assetTiles,h('div',{class:'addtile',onclick:()=>{S.drawer={mode:'add'};render()}},h('span',{},'＋'),h('small',{},'asset'))]),
  grp('g-comp','Composition & blocking','frames from other shots',[by('shot').map(x=>P.refCard(x,s,{onremove:()=>undoable('Reference removed',()=>{s.refs=s.refs.filter(q=>q!==x);f.refs=f.refs.filter(q=>q!==x)})})),
   h('div',{class:'addtile wide',onclick:()=>G.openGallery()},h('span',{},'＋'),h('small',{},'use a frame as reference'))]),
  grp('g-cine','CineBlock','blocking captures',[by('cineblock').map(x=>P.refCard(x,s,{onremove:()=>undoable('Capture removed',()=>{s.refs=s.refs.filter(q=>q!==x)})})),
   h('div',{class:'addtile wide cine',onclick:()=>{S.cine={scope:'shot',shot:s.id};render()}},h('span',{},'◫'),h('small',{},'Block this shot'))]),
  grp('g-up','Uploads','your own images',[by('upload').map(x=>P.refCard(x,s,{onremove:()=>undoable('Reference removed',()=>{s.refs=s.refs.filter(q=>q!==x)})})),
   h('div',{class:'addtile',onclick:()=>{f.refs.push({id:uid('up'),scope:r,type:'upload',label:'Uploaded reference'});render()}},h('span',{},'⬆'),h('small',{},'upload'))]));
};

/* ---------- inputs & readiness ---------- */
G.checks=s=>{
 const out=[],roles=rolesOf(s);
 const cb=s.refs.filter(x=>x.type==='cineblock'&&!(x.desc&&x.assetsOk));
 if(cb.length)out.push(['CineBlock capture needs a description and confirmed assets']);
 s.roster.forEach(r=>{if(ASSETS_[r.a].looks[openLook(s,r)]&&!ASSETS_[r.a].looks[openLook(s,r)].img)out.push([`${aname(r.a)}: ${lookName(r.a,openLook(s,r))} has no image; generation will use its description`,'soft'])});
 roles.forEach(r=>{if(frame(s,r).stale)out.push([`${ROLE_NAME[r]} frame may be out of date`,'soft'])});
 if(s.cont.kind==='match'&&!s.cont.mk)out.push(['Match cut: choose the kind of match']);
 return out;
};
G.readiness=(s,o={})=>{
 const roles=rolesOf(s),r=S.role,rows=frameAssets(s,roles.includes(r)?r:'open'),i=idxOf(s),prev=shots()[i-1];
 const chk=G.checks(s);
 const c=s.cont,src=c.pin?c.pin.split(':'):prev?[prev.id,'end']:null;
 const sec=(t,mark,body,cls='')=>h('div',{class:'rd '+cls},h('div',{class:'rdh'},h('span',{class:'lbl'},t),mark),body);
 const ok=h('i',{class:'okm'},'✓'),warn=h('i',{class:'wm'},'!');
 const refs=[...s.refs,...roles.flatMap(k=>frame(s,k).refs)];
 return h('div',{class:'ready'+(o.compact?' compact':'')},
  h('div',{class:'readyhead'},h('b',{},chk.some(c=>c[1]!=='soft')?'A few things to check before generating':'Ready to generate'),h('span',{class:'faint small'},chk.length?chk.map(c=>c[0]).join(' · '):'Cast, Looks, continuity and references look consistent.'),h('span',{class:'sp'}),h('button',{class:'ghost small',onclick:()=>{S.view='prep';render()}},'Back to Scene Prep')),
  h('div',{class:'rdrow'},
   sec('Cast · Looks · Views',ok,h('div',{class:'rdcast'},rows.map(x=>h('div',{class:'rdc'+(x.on?'':' off')},U.at(x.r.a,x.look,x.r.view,{size:'s',short:true,onclick:()=>{S.drawer={mode:'asset',a:x.r.a};render()}}),h('span',{class:'small faint'},(PRES[x.r.pres]!=='Stays throughout'?PRES[x.r.pres]+' · ':'')+(ASSETS_[x.r.a].t==='Prop'?'':viewName(x.r.a,x.r.view)))))),'wide'),
   sec('Continuity',i===0?'':ok,src&&c.kind!=='cut'?h('div',{class:'rdsrc'},A.el(A.frame(shot(src[0]),src[1]),'a-frame'),h('div',{class:'small'},h('b',{},KINDLBL[c.kind]),h('div',{class:'faint'},c.kind==='match'?(c.mk||'kind?')+' · framing from '+src[0]:'from '+src[0]+' ending'))):h('div',{class:'small faint'},i===0?'First shot of the scene':'Hard cut: no source')),
   sec('References',refs.some(x=>x.type==='cineblock'&&!(x.desc&&x.assetsOk))?warn:ok,h('div',{class:'rdrefs'},refs.slice(0,4).map(x=>h('div',{class:'rdr',title:x.type},A.el(P.refArt(x,s),'a-frame'),h('i',{class:'rk '+x.type}))),refs.length?'':h('span',{class:'small faint'},'None beyond the cast'),h('span',{class:'small dim'},refs.length?refs.length+' attached':''))),
   sec('Frames',roles.every(k=>frame(s,k).st==='appr')?ok:warn,h('div',{class:'rdfr'},roles.length?roles.map(k=>h('span',{class:'chip '+(frame(s,k).st==='appr'?'ok':'')},ROLE_NAME[k]+' '+(frame(s,k).st==='appr'?'✓':'not approved'))):h('span',{class:'chip'},'Video only'))),
   sec('Prompts',ok,h('div',{class:'rdfr'},h('span',{class:'chip'+(roles.some(k=>frame(s,k).pov!=null)?' warn':'')},roles.some(k=>frame(s,k).pov!=null)?'Frame prompt overridden':'Frame prompts ready'),h('span',{class:'chip'+(s.vp.ov!=null?' warn':'')},s.vp.ov!=null?'Video prompt overridden':'Video prompt ready')))));
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
G.openGallery=()=>{S.view='gen';S.gallery=true;S.g2tab='gallery';S.galFocus=true;S.drawer=null;render()};

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

/* ---------- video / Take ---------- */
G.genTake=(s,o={})=>{
 const key='tk:'+s.id,m=modelOf(s),e=takeEst(s,m);
 const run=()=>simulate(key,()=>{s.fail=null;s.partial=null;s.takes=s.takes.filter(t=>!t.partialTake);const n=lastTakeN(s)+1;s.takes.push({id:uid('k'),model:m,dur:s.dur,n,guided:S.tk.guid[s.id]||undefined,fresh:1});S.justMade=s.id;toast(`Take ${n} of ${s.id} is ready, not selected`)},1200);
 return U.spend(key,o.label||(s.takes.length?'Generate another Take':'Generate Take'),{total:e.total,unknown:e.unknown,count:1,what:`${s.id} · ${M[m].n} · ${s.dur}s${e.parts>1?' in '+e.parts+' parts':''}`},run,{primary:o.primary??!s.takes.length,cls:'bigbtn'});
};
G.videoDock=(s,o={})=>{
 const m=modelOf(s),e=takeEst(s,m),roles=rolesOf(s);
 const unappr=roles.filter(k=>frame(s,k).st!=='appr');
 return h('div',{class:'vdock'+(o.compact?' compact':'')},
  h('div',{class:'vframes'},roles.length?roles.map((k,i)=>[i?h('span',{class:'varrow'},'→'):'',h('div',{class:'vf'},G.tile(s,k,{onclick:()=>{S.role=k;render()}}),h('span',{class:'small '+(frame(s,k).st==='appr'?'ok':'quiet')},ROLE_NAME[k]+(frame(s,k).st==='appr'?' approved':' not approved')))]):h('div',{class:'vf'},h('div',{class:'ftile2 empty'},h('span',{class:'faint'},'Video only')),h('span',{class:'small faint'},'Frames skipped'))),
  h('div',{class:'col vmid'},
   h('div',{class:'row wrap'},h('span',{class:'lbl'},'Video model'),U.seg(Object.entries(M).map(([k,v])=>[k,v.n,v.rate==null?'price unavailable':'$'+v.rate.toFixed(2)+'/s']),m,v=>{S.tk.model[s.id]=v;S.ticket=null;render()}),
    h('span',{class:'faint small'},`${s.dur}s${e.parts>1?' · '+e.parts+' parts, one Take':''}`)),
   G.videoPrompt(s),
   h('label',{class:'guid'},h('span',{class:'flb'},'Optional guidance for this Take'),U.inp(S.tk.guid[s.id]||'',v=>{S.tk.guid[s.id]=v},{placeholder:'e.g. slower push-in, warmer lamp'}))),
  h('div',{class:'col vgo'},
   G.genTake(s,{primary:true}),
   unappr.length&&roles.length?h('span',{class:'quiet'},unappr.map(k=>ROLE_NAME[k]).join(' and ')+' frame not approved yet. You can still generate.'):h('span',{class:'faint small'},roles.length?'Both frames are approved.':'No frames. Video only.'),
   h('span',{class:'faint small'},s.refs.length+' reference'+(s.refs.length===1?'':'s')+' ride along')));
};
G.player=()=>{
 const p=S.preview;if(!p)return'';
 const s=shot(p.shot),t=s.takes.find(x=>x.id===p.take);if(!t)return'';
 return h('div',{class:'overlay dark',onclick:e=>{if(e.target.classList.contains('overlay')){S.preview=null;render()}}},h('div',{class:'player'},
  h('div',{class:'pv'},A.el(A.take(s,t),'pvart'),h('div',{class:'pvbar'},h('i',{style:`animation-duration:${Math.min(t.dur,8)}s`}))),
  h('div',{class:'row'},h('b',{},`${s.id} · Take ${t.n}`),h('span',{class:'dim small'},M[t.model].n+' · '+t.dur+'s'+(t.guided?' · guided: '+t.guided:'')),h('span',{class:'sp'}),
   s.sel===t.id?h('span',{class:'chip ok'},'Selected'):h('button',{class:'primary',onclick:()=>{S.preview=null;T.select(s,t)}},'Select this Take'),
   h('button',{onclick:()=>{S.preview=null;G.openReview(s)}},'Open in Review'),h('button',{class:'ghost',onclick:()=>{S.preview=null;render()}},'Close'))));
};
G.openReview=s=>{S.shot=s.id;S.view='review';S.tk.film=false;S.tk.compare=false;render();toast('Opened in Review at '+s.id+'. “Fix this shot” brings you back to Generate.')};
G.takes=(s,o={})=>{
 const live=s.takes.filter(t=>!t.rej);
 const card=t=>h('div',{class:'tkc'+(s.sel===t.id?' sel':'')},
  h('div',{class:'tkv',onclick:()=>{S.preview={shot:s.id,take:t.id};render()},title:'Preview this Take'},A.el(A.take(s,t),'a-frame'),h('span',{class:'play'},'▶'),h('span',{class:'tdur'},t.dur+'s'),s.sel===t.id?h('span',{class:'tpin'},'Selected'):'',t.fresh&&s.sel!==t.id?h('span',{class:'tnew'},'ready, not selected'):''),
  h('div',{class:'tkm'},h('b',{},'Take '+t.n),h('span',{class:'faint small'},[M[t.model].n,t.guided?'guided':'',t.override?'prompt overridden':'',t.parts>1?t.parts+' parts':'',t.late||''].filter(Boolean).join(' · '))),
  h('div',{class:'row'},s.sel===t.id?h('button',{class:'small',onclick:()=>undoable('Unselected',()=>{if(!s.final)s.sel=null})},'Unselect'):h('button',{class:'small',onclick:()=>T.select(s,t)},'Use this Take')));
 const failed=s.fail||s.partial;
 return h('div',{class:'takesx'+(o.compact?' compact':'')},
  h('div',{class:'row'},h('b',{class:'lbl'},'Takes for '+s.id),h('span',{class:'faint small'},live.length?live.length+' attempt'+(live.length===1?'':'s')+(picked(s)?' · one selected':' · none selected'):'None yet'),h('span',{class:'sp'}),
   h('button',{class:live.length?'':'ghost',disabled:!live.length?true:null,onclick:()=>G.openReview(s)},'Open in Review ›')),
  h('div',{class:'tkrow'},live.map(card),
   failed&&!S.gens['tk:'+s.id]?h('div',{class:'tkc failed'},h('div',{class:'tkv fail'},h('span',{class:'big'},s.partial?`${s.partial.done} of ${s.partial.of} parts made`:'No Take'),h('span',{class:'small dim'},s.fail?.text||'')),
    h('div',{class:'row wrap'},S.open['fi:'+s.id]?'':h('button',{class:'small',onclick:()=>{S.open['fi:'+s.id]=true;render()}},'Inspect failure'),
     s.partial?U.spend('tkp:'+s.id,'Retry part 3',{total:+(M.kling.rate*6).toFixed(2),count:1,what:'Retry part 3 of '+s.id},()=>simulate('tkp:'+s.id,()=>{s.partial=null;s.fail=null;const k=s.takes[0];if(k)k.fresh=1;toast('Part 3 made. Take is ready, not selected')}),{primary:false}):''),
    S.open['fi:'+s.id]?h('div',{class:'finfo small'},h('div',{},h('b',{},'What happened')),h('div',{class:'dim'},s.partial?'The provider stopped rendering after part 2 of 3 (upstream timeout). Parts 1 and 2 are kept.':s.fail?.timedOut?'The request timed out after 240 s. The provider may still bill it.':'The provider declined the request.'),h('div',{class:'dim'},s.fail?.text||''),h('div',{class:'dim'},'Request id rq_8f2c…41 · '+(s.fail?.timedOut||s.partial?'may have been charged':'not charged')),h('button',{class:'ghost small',onclick:()=>{S.open['fi:'+s.id]=false;render()}},'Hide')):''):'',
   S.gens['tk:'+s.id]?h('div',{class:'tkc gen'},h('div',{class:'tkv gen'},h('i',{class:'spin big'}),h('span',{class:'small'},'Generating Take '+(lastTakeN(s)+1)+'…')),h('span',{class:'faint small'},'Cancelling may still be charged')):'',
   !live.length&&!failed&&!S.gens['tk:'+s.id]?h('div',{class:'faint small',style:'padding:14px 4px'},'No Take yet. Approve the frames and press Generate Take above.'):''),
  h('div',{class:'row wrap'},G.genTake(s,{primary:false,label:live.length?'Generate another Take':'Generate Take'})));
};

/* ---------- shot navigation inside Generate ---------- */
G.shotBar=s=>{
 const L=shots(),i=idxOf(s);
 return h('div',{class:'row gshotbar'},
  h('button',{class:'ghost icon',disabled:i<1?true:null,onclick:()=>{S.shot=L[i-1].id;render()}},'‹'),
  h('b',{class:'gsid'},s.id),h('span',{class:'dim'},s.name),h('span',{class:'faint small'},`${A.SIZE_ABBR[A.sizeKey(s.cam.size)]} · ${s.cam.lens} · ${A.moveShort(s.cam.move)} · ${s.dur}s`),
  h('button',{class:'ghost icon',disabled:i>=L.length-1?true:null,onclick:()=>{S.shot=L[i+1].id;render()}},'›'),h('span',{class:'sp'}),
  h('button',{class:'ghost small',onclick:()=>{S.view='prep';render()}},'Edit in Scene Prep'));
};

/* ===== Layout 1: vertical pipeline ===== */
const STEPS=[['inputs','Inputs'],['refs','References'],['frames','Frames'],['video','Video'],['takes','Takes']];
G.layout1=()=>{
 const s=cur(),roles=rolesOf(s),r=S.role;
 const stepState={inputs:G.checks(s).some(c=>c[1]!=='soft')?'warn':'ok',refs:s.refs.some(x=>x.type==='cineblock'&&!(x.desc&&x.assetsOk))?'warn':'ok',frames:roles.length&&roles.every(k=>frame(s,k).st==='appr')?'ok':roles.length?'prog':'ok',video:s.vp.ov!=null?'prog':'ok',takes:picked(s)?'ok':s.takes.length?'prog':'none'};
 const jump=k=>{const e=$('#step-'+k);if(e)e.scrollIntoView({behavior:'smooth',block:'start'})};
 return h('div',{class:'gen1'},
  h('nav',{class:'steps'},STEPS.map(([k,l],i)=>h('div',{class:'stp k-'+stepState[k],onclick:()=>jump(k)},h('span',{class:'sn'},stepState[k]==='ok'?'✓':i+1),h('span',{},l)))),
  h('div',{class:'g1body','data-scroll':'g1'},
   h('section',{id:'step-inputs',class:'g1s'},h('h3',{},h('em',{},'1'),'Inputs & readiness'),G.readiness(s)),
   h('section',{id:'step-refs',class:'g1s'},h('h3',{},h('em',{},'2'),'References',h('span',{class:'faint small'},roles.length?`for the ${ROLE_NAME[roles.includes(r)?r:roles[0]].toLowerCase()} frame`:'')),roles.length?[G.roleBar(s),G.refTray(s,roles.includes(r)?r:roles[0])]:h('div',{class:'faint'},'Frames are skipped for this shot.'),
    h('div',{class:'row wrap'},G.cineButtons(s),h('button',{class:'ghost small'+(S.gallery?' on':''),onclick:()=>{S.gallery=!S.gallery;render()}},(S.gallery?'▾':'▸')+' Scene frame gallery')),S.gallery?G.gallery(s):'' ),
   h('section',{id:'step-frames',class:'g1s'},h('h3',{},h('em',{},'3'),'Frames'),
    roles.length?[G.continuityRow(s,{big:true}),G.roleBar(s),G.frameStage(s,roles.includes(r)?r:roles[0],{cls:'big'}),G.framePrompt(s,roles.includes(r)?r:roles[0])]:
     h('div',{class:'empty small'},h('b',{},'Frames are skipped for this shot'),h('p',{class:'dim'},'It goes straight to video. Change the frame strategy in Scene Prep if you want frames.'),h('button',{onclick:()=>{s.fp='open';S.role='open';render()}},'Add an opening frame'))),
   h('section',{id:'step-video',class:'g1s'},h('h3',{},h('em',{},'4'),'Video & Take'),G.videoDock(s)),
   h('section',{id:'step-takes',class:'g1s last'},h('h3',{},h('em',{},'5'),'Takes'),G.takes(s))));
};

/* ===== Layout 2: canvas + contextual drawer + generation dock ===== */
G.layout2=()=>{
 const s=cur(),roles=rolesOf(s),r=roles.includes(S.role)?S.role:roles[0],tab=S.g2tab||'refs';
 const tabs=[['refs','References'],['prompt','Prompts'],['inputs','Inputs'],['gallery','Scene gallery'],['cine','CineBlock']];
 const side=tab==='refs'?(roles.length?G.refTray(s,r):''):tab==='prompt'?h('div',{class:'col'},roles.length?G.framePrompt(s,r):'',G.videoPrompt(s)):tab==='inputs'?G.readiness(s,{compact:true}):tab==='gallery'?G.gallery(s):h('div',{class:'col'},G.cineButtons(s),h('div',{class:'reftray'},s.refs.filter(x=>x.type==='cineblock').map(x=>P.refCard(x,s)),s.refs.some(x=>x.type==='cineblock')?'':h('div',{class:'faint small'},'No captures yet. Open CineBlock to block this shot; captures return here as references.')));
 const open=S.dockOpen;
 return h('div',{class:'gen2'},
  h('div',{class:'g2main'},
   h('div',{class:'g2canvas','data-scroll':'g2c'},
    roles.length?[h('div',{class:'row'},G.roleBar(s),h('span',{class:'sp'}),h('span',{class:'faint small'},'Canvas: the frames. Tools open on the right.')),G.continuityRow(s),G.frameStage(s,r,{cls:'big'})]:
     h('div',{class:'empty small'},h('b',{},'Frames are skipped for this shot'),h('p',{class:'dim'},'Video only. Use the dock below.'))),
   h('aside',{class:'g2side'},h('div',{class:'g2tabs'},tabs.map(([k,l])=>h('button',{class:tab===k?'on':'',onclick:()=>{S.g2tab=k;render()}},l,k==='refs'?h('em',{},s.refs.length||''):''))),h('div',{class:'g2sc','data-scroll':'g2s'},side))),
  h('div',{class:'g2dock'+(open?' open':'')},
   open?h('div',{class:'g2takes'},G.takes(s)):'',
   h('div',{class:'g2bar'},
    h('div',{class:'vframes sm'},roles.map((k,i)=>[i?h('span',{class:'varrow'},'→'):'',h('div',{class:'vf'},G.tile(s,k,{onclick:()=>{S.role=k;render()}}))])),
    h('div',{class:'col',style:'flex:1;gap:4px;min-width:0'},
     h('div',{class:'row wrap'},h('span',{class:'lbl'},'Video'),U.seg(Object.entries(M).map(([k,v])=>[k,v.n]),modelOf(s),v=>{S.tk.model[s.id]=v;S.ticket=null;render()}),h('span',{class:'faint small'},s.dur+'s · '+s.refs.length+' refs'),
     h('input',{class:'guidi',value:S.tk.guid[s.id]||'',placeholder:'Optional guidance…',onchange:e=>{S.tk.guid[s.id]=e.target.value}})),
     G.videoPromptLine(s)),
    G.genTake(s,{primary:true}),
    h('button',{class:'takesbtn'+(open?' on':''),onclick:()=>{S.dockOpen=!open;render()}},'Takes ',h('b',{},s.takes.filter(t=>!t.rej).length),open?' ▾':' ▴'))));
};
G.videoPromptLine=s=>h('div',{class:'vpline',onclick:()=>{S.g2tab='prompt';render()},title:'Open prompts'},h('span',{class:'faint small'},s.vp.ov!=null?'Video prompt (overridden): ':'Video prompt: '),videoPrompt(s).slice(0,120)+'…');

/* ===== Layout 3: scene frame carousel + workbench + persistent pipeline dock ===== */
G.layout3=()=>{
 const s=cur(),L=shots(),roles=rolesOf(s),r=roles.includes(S.role)?S.role:roles[0];
 const all=L.flatMap(x=>(rolesOf(x).length?rolesOf(x):[]).map(k=>[x,k]));
 const car=h('div',{class:'carousel','data-scroll':'car'},L.map((x,i)=>{
  const rl=rolesOf(x);
  return h('div',{class:'cgrp'+(x===s?' cur':'')},
   h('div',{class:'cgh',onclick:()=>{S.shot=x.id;render()}},h('b',{},x.id),h('span',{class:'faint small'},A.SIZE_ABBR[A.sizeKey(x.cam.size)]+' · '+x.dur+'s'),U.contTag(x)),
   h('div',{class:'cgf'},rl.length?rl.map(k=>h('div',{class:'cgt'+(x===s&&k===r?' on':'')+(S.galSel===x.id+':'+k?' gsel':'')},G.tile(x,k,{on:x===s&&k===r,onclick:()=>{if(x===s){S.role=k;S.galSel=null}else if(S.galFocus){S.galSel=x.id+':'+k}else{S.shot=x.id;S.role=k}render()}}),h('span',{class:'cgn small'},ROLE_NAME[k]))):h('div',{class:'ftile2 empty'},h('span',{class:'faint small'},'video only'))));
 }));
 const galbar=G.galBar(s);
 return h('div',{class:'gen3'},
  h('div',{class:'g3top'},
   h('div',{class:'row'},h('b',{class:'lbl'},'Scene frames'),h('span',{class:'faint small'},'every frame in order · click one to work on it · '),
    h('label',{class:'small dim'},h('input',{type:'checkbox',checked:S.galFocus?true:null,onchange:e=>{S.galFocus=e.target.checked;S.galSel=null;render()}}),' pick frames as references'),h('span',{class:'sp'}),h('button',{class:'ghost small',onclick:()=>{const c=$('.carousel');const f=$('.cgrp.cur',c);if(f)c.scrollLeft=f.offsetLeft-c.clientWidth/2+f.clientWidth/2}},'Center on '+s.id)),car,
   galbar),
  h('div',{class:'g3work','data-scroll':'g3'},
   h('div',{class:'g3cols'},
    h('div',{class:'col',style:'flex:1.25;gap:14px;min-width:0'},roles.length?[h('div',{class:'row'},G.roleBar(s),h('span',{class:'sp'}),G.cineButtons(s)),G.frameStage(s,r,{cls:'big'}),G.continuityRow(s)]:h('div',{class:'empty small'},'Frames are skipped. Use the dock.')),
    h('div',{class:'col',style:'flex:1;gap:14px;min-width:380px'},G.readiness(s,{compact:true}),roles.length?G.refTray(s,r):'',roles.length?G.framePrompt(s,r):''))),
  G.dock3(s));
};
G.dock3=s=>{
 const roles=rolesOf(s),open=S.dockOpen,m=modelOf(s);
 const stp=(n,t,sub,ok,cb)=>h('div',{class:'pstep'+(ok?' ok':'')+(cb?' click':''),onclick:cb},h('i',{},ok?'✓':n),h('div',{class:'col',style:'gap:0'},h('b',{class:'small'},t),h('span',{class:'faint small'},sub)));
 return h('div',{class:'dock3'+(open?' open':'')},
  open?h('div',{class:'d3panel'},h('div',{class:'d3cols'},h('div',{class:'col',style:'flex:1;gap:10px'},G.videoPrompt(s),h('label',{class:'guid'},h('span',{class:'flb'},'Optional guidance'),U.inp(S.tk.guid[s.id]||'',v=>{S.tk.guid[s.id]=v}))),h('div',{style:'flex:1.4'},G.takes(s)))):'',
  h('div',{class:'d3bar'},
   stp(1,'Inputs',G.checks(s).some(c=>c[1]!=='soft')?'check':'ready',!G.checks(s).some(c=>c[1]!=='soft')),
   stp(2,'Frames',roles.length?roles.filter(k=>frame(s,k).st==='appr').length+'/'+roles.length+' approved':'video only',roles.every(k=>frame(s,k).st==='appr')),
   stp(3,'Video prompt',s.vp.ov!=null?'overridden':'ready',true,()=>{S.dockOpen=true;render()}),
   h('div',{class:'dmodel'},U.seg(Object.entries(M).map(([k,v])=>[k,v.n]),m,v=>{S.tk.model[s.id]=v;S.ticket=null;render()})),
   G.genTake(s,{primary:true}),
   h('button',{class:'takesbtn'+(open?' on':''),onclick:()=>{S.dockOpen=!open;render()}},'Takes ',h('b',{},s.takes.filter(t=>!t.rej).length),open?' ▾':' ▴')));
};
G.layout=()=>S.genL==='2'?G.layout2():S.genL==='3'?G.layout3():G.layout1();
window.G=G;
})();

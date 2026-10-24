/* Scene Prep: shot content (progressive disclosure), whole-shot references, sequence rhythm, and the three layout alternatives (A strip+inspector, B storyboard→focus, C cast matrix). */
(()=>{
const SIZES=[['ws','Wide','Wide'],['mf','Med full','Medium full'],['ms','Medium','Medium'],['mcu','Med CU','Medium close-up'],['cu','Close-up','Close-up'],['ecu','XCU','Extreme close-up'],['ots','OTS','Medium over-the-shoulder'],['ins','Insert','Insert, close-up']];
const MOVES=[['static','Static','Static'],['push','Push-in','Slow push-in'],['pull','Pull-out','Slow pull-out'],['track','Track','Lateral track'],['rack','Rack focus','Static, slow rack focus'],['hand','Handheld','Handheld, restless']];
const LENS=['24 mm','28 mm','35 mm','50 mm','75 mm','85 mm'];
const SCALE={ws:1,mf:2,ms:3,ots:3,mcu:4,cu:5,ins:5,ecu:6};
const CONTK=[['cut','┃ Cut','New shot, no continuity source'],['continues','═ Continues','Previous ending is the base image'],['newview','↗ New view','Same place, different view'],['match','◎ Match','Match / compositional cut']];
const MATCH=[['graphic','Graphic'],['action','Action'],['eyeline','Eyeline']];
const FPS=[['open+end','Opening + ending'],['open','Opening only'],['open+end+key','Opening, keyframe, ending'],['skip','Video only (skip frames)']];
const PRES_=D.ASSETS;
const P=window.P;

P.shotHead=(s,o={})=>{
 const L=shots(),i=idxOf(s);
 return h('div',{class:'shothead'},
  h('div',{class:'sid'},s.id),
  h('div',{class:'col',style:'gap:2px;flex:1;min-width:0'},
   h('input',{class:'sname',value:s.name,onchange:e=>{s.name=e.target.value;render()}}),
   h('div',{class:'row small dim'},h('span',{},`Shot ${i+1} of ${L.length}`),h('span',{},'·'),h('span',{},A.SIZE_ABBR[A.sizeKey(s.cam.size)]+' · '+s.cam.move.toLowerCase()),s.anchor.length?h('button',{class:'ghost small',onclick:()=>{S.script.open=true;render()}},'From the script ▸'):'')),
  h('div',{class:'durc',title:'Duration'},h('button',{class:'ghost',onclick:()=>{s.dur=Math.max(1,s.dur-1);U.touch(s,'dur');render()}},'−'),h('b',{},s.dur+'s'),h('button',{class:'ghost',onclick:()=>{s.dur=Math.min(30,s.dur+1);U.touch(s,'dur');render()}},'+')),
  h('div',{class:'row'},
   h('button',{class:'ghost icon',title:'Move earlier',disabled:i<1?true:null,onclick:()=>{if(i>0)undoable('Moved earlier',()=>{[L[i-1],L[i]]=[L[i],L[i-1]]})}},'←'),
   h('button',{class:'ghost icon',title:'Move later',disabled:i>=L.length-1?true:null,onclick:()=>{if(i<L.length-1)undoable('Moved later',()=>{[L[i+1],L[i]]=[L[i],L[i+1]]})}},'→'),
   h('button',{class:'ghost icon',title:'Remove shot',onclick:()=>undoable('Shot removed',()=>{L.splice(i,1);S.shot=(L[Math.max(0,i-1)]||L[0])?.id})},'🗑')));
};
P.action=s=>h('div',{class:'blockx'+U.hl(s,'action')},
 h('div',{class:'row'},h('span',{class:'lbl'},'What happens'),U.aiMark(s,'action')),
 h('textarea',{class:'actionta serif',rows:4,onchange:e=>{s.action=e.target.value;U.touch(s,'action');render()}},s.action));
P.dialogue=s=>{
 const chars=s.roster.filter(r=>PRES_[r.a].t==='Character');
 return h('div',{class:'blockx'},
  h('div',{class:'row'},h('span',{class:'lbl'},'Dialogue'),h('span',{class:'sp'}),h('button',{class:'ghost small',onclick:()=>{s.dialogue.push({who:(chars[0]?aname(chars[0].a).split(' ')[0]:'Voice'),line:'',delivery:''});render()}},'＋ Line')),
  s.dialogue.length?s.dialogue.map((d,i)=>{const sp=chars.find(c=>aname(c.a).startsWith(d.who));
   return h('div',{class:'dline'},sp?U.at(sp.a,openLook(s,sp),'front',{size:'xs',label:false}):h('div',{class:'at s-xs'}),
    h('div',{class:'col',style:'flex:1;gap:3px;min-width:0'},
     h('div',{class:'row'},h('select',{class:'who',onchange:e=>{d.who=e.target.value;render()}},[...chars.map(c=>aname(c.a).split(' ')[0]),'Voice'].map(n=>h('option',{selected:n===d.who},n))),
      h('input',{class:'dl serif',value:d.line,placeholder:'Line',onchange:e=>{d.line=e.target.value;render()}}),
      h('button',{class:'ghost small icon',onclick:()=>{s.dialogue.splice(i,1);render()}},'✕')),
     h('input',{class:'dd',value:d.delivery,placeholder:'Delivery: how it is said',onchange:e=>{d.delivery=e.target.value;render()}})))}):
   h('div',{class:'faint small'},'No dialogue in this shot.'));
};
P.camera=s=>{
 const sk=A.sizeKey(s.cam.size),mk=A.moveKind(s.cam.move);
 return h('div',{class:'blockx'+U.hl(s,'cam')},
  h('div',{class:'row'},h('span',{class:'lbl'},'Camera'),U.aiMark(s,'cam'),h('span',{class:'faint small'},s.cam.size+' · '+s.cam.move+' · '+s.cam.lens)),
  h('div',{class:'sizes'},SIZES.map(([k,l,full])=>h('button',{class:'sz'+(sk===k?' on':''),title:full,onclick:()=>{s.cam.size=full;U.touch(s,'cam');render()}},A.el(A.glyph(full),'szg'),h('span',{},l)))),
  h('div',{class:'row wrap'},
   h('div',{class:'moves'},MOVES.map(([k,l,full])=>h('button',{class:'mv'+(mk===k||(k==='hand'&&/hand/i.test(s.cam.move))?' on':''),onclick:()=>{s.cam.move=full;U.touch(s,'cam');render()}},h('span',{class:'mi'},A.moveIcon[k]||'≈'),l))),
   h('div',{class:'lens'},LENS.map(l=>h('button',{class:s.cam.lens===l?'on':'',onclick:()=>{s.cam.lens=l;U.touch(s,'cam');render()}},l.replace(' mm',''))),h('span',{class:'faint small'},'mm'))));
};
P.continuity=s=>{
 const c=s.cont,i=idxOf(s),L=shots(),prev=L[i-1];
 const pins=[['','Previous shot ending (default)'],...L.filter(x=>x!==s).flatMap(x=>rolesOf(x).map(r=>[x.id+':'+r,`${x.id} ${ROLE_NAME[r].toLowerCase()} frame`]))];
 const src=c.pin?c.pin.split(':'):prev?[prev.id,'end']:null;
 return h('div',{class:'blockx'+U.hl(s,'cont')},
  h('div',{class:'row'},h('span',{class:'lbl'},'Into this shot'),U.aiMark(s,'cont')),
  h('div',{class:'row wrap',style:'align-items:stretch'},
   i>0&&c.kind!=='cut'&&src?h('div',{class:'contsrc',title:'Continuity source'},A.el(A.frame(shot(src[0]),src[1]),'a-frame'),h('span',{class:'small'},(c.kind==='match'?'Framing from ':'Starts from ')+src[0]+' '+(src[1]==='end'?'ending':'opening'))):'',
   h('div',{class:'col',style:'flex:1;gap:6px;min-width:260px'},
    U.seg(CONTK.map(([k,l,t])=>[k,l,t]),c.kind,v=>{if(i===0)return;c.kind=v;U.touch(s,'cont');render()}),
    c.kind==='match'?h('div',{class:'row wrap'},h('span',{class:'faint small'},'Match on'),U.seg(MATCH,c.mk,v=>{c.mk=v;render()}),h('span',{class:'faint small'},'from'),U.sel(pins,c.pin||'',v=>{c.pin=v||null;render()})):
    c.kind==='continues'?h('div',{class:'row wrap'},h('span',{class:'faint small'},'from'),U.sel(pins,c.pin||'',v=>{c.pin=v||null;render()})):'',
    U.inp(c.note,v=>{c.note=v;render()},{placeholder:'Cut note, e.g. round red stamp becomes the round green lamp',class:'cutnote'}))));
};
P.frameStrategy=s=>h('div',{class:'blockx'+U.hl(s,'fp')},h('div',{class:'row'},h('span',{class:'lbl'},'Frames for this shot'),U.aiMark(s,'fp')),
 U.seg(FPS,s.fp,v=>{s.fp=v;U.touch(s,'fp');render()}));
P.advanced=s=>U.sec('adv:'+s.id,'More detail','location, direction, angle, camera notes, visual and sound direction',()=>h('div',{class:'advgrid'},
  h('label',{},h('span',{class:'flb'},'Location'),U.inp(s.location,v=>{s.location=v;render()})),
  h('label',{},h('span',{class:'flb'},'Direction / view'),U.inp(s.direction,v=>{s.direction=v;U.touch(s,'dir');render()})),
  h('label',{},h('span',{class:'flb'},'Angle'),U.seg([['Low','Low'],['Eye level','Eye level'],['High','High']],/low/i.test(s.cam.angle)?'Low':/high/i.test(s.cam.angle)?'High':'Eye level',v=>{s.cam.angle=v;render()})),
  h('label',{class:'w2'},h('span',{class:'flb'},'Camera notes'),U.inp(s.cam.note,v=>{s.cam.note=v;render()})),
  h('label',{class:'w2'},h('span',{class:'flb'},'Visual direction'),U.ta(s.visual,v=>{s.visual=v;render()},2)),
  h('label',{class:'w2'},h('span',{class:'flb'},'Sound direction'),U.ta(s.sound,v=>{s.sound=v;render()},2))));

/* ---- whole-shot references (visual) ---- */
const REFC={asset:['Asset','refc-asset'],shot:['Composition','refc-shot'],cineblock:['CineBlock','refc-cine'],upload:['Upload','refc-up']};
P.refArt=(ref,s)=>{
 if(ref.type==='shot')return A.frame(shot(ref.srcShot),ref.srcRole);
 if(ref.type==='cineblock')return A.cine(s,ref.scope==='shot'?'open':ref.scope);
 if(ref.type==='upload')return A.upload(ref.id);
 const row=s.roster.find(q=>q.a===ref.subject);return A.asset(ref.subject,row?openLook(s,row):firstLook(ref.subject),row?.view);
};
P.refCard=(ref,s,o={})=>{
 const [kind,cls]=REFC[ref.type];
 const scope=ref.scope==='shot'?'Whole shot':ROLE_NAME[ref.scope]+' frame';
 return h('div',{class:'refc '+cls+(o.big?' big':'')},
  h('div',{class:'refimg'},A.el(P.refArt(ref,s),'a-frame'),h('span',{class:'rbadge'},kind),h('span',{class:'rscope'},scope)),
  h('div',{class:'refmeta'},
   h('b',{class:'small'},ref.type==='shot'?`${ref.srcShot} ${ROLE_NAME[ref.srcRole].toLowerCase()} frame`:ref.type==='cineblock'?'CineBlock capture':ref.label),
   ref.type==='shot'?h('div',{class:'dim small recomp'},'Recompose: ',h('input',{value:ref.recompose||'',placeholder:'How to recompose it for this shot',onchange:e=>{ref.recompose=e.target.value;render()}})):'',
   ref.type==='cineblock'?P.cineStatus(ref):'',
   o.remove===false?'':h('button',{class:'ghost small rm',onclick:()=>o.onremove?o.onremove():undoable('Reference removed',()=>{s.refs=s.refs.filter(x=>x!==ref)})},'Remove')));
};
P.cineStatus=x=>{const ready=x.desc&&x.assetsOk;
 return h('div',{class:'col',style:'gap:4px'},
  h('input',{value:x.desc||'',placeholder:'Describe this frame in words (required)',onchange:e=>{x.desc=e.target.value;render()}}),
  h('label',{class:'small dim'},h('input',{type:'checkbox',checked:x.assetsOk?true:null,onchange:e=>{x.assetsOk=e.target.checked;render()}}),' Right assets and Looks confirmed'),
  ready?h('span',{class:'chip ok'},'Ready to generate from'):h('span',{class:'quiet'},'Not ready: '+[!x.desc?'needs a description':'',!x.assetsOk?'assets not confirmed':''].filter(Boolean).join(' · ')));
};
P.addRefShot=(s,role,srcShot,srcRole,recompose)=>{
 s.refs.push({id:uid('r'),scope:role,type:'shot',label:'',srcShot,srcRole,recompose:recompose||''});
};
P.refs=(s,o={})=>{
 const mine=s.refs;
 return h('div',{class:'blockx'},
  h('div',{class:'row'},h('span',{class:'lbl'},'References for generation'),h('span',{class:'faint small'},'Asset identity images are used automatically · add anything else that should steer the look'),h('span',{class:'sp'}),
   h('button',{class:'small',onclick:()=>{G.openGallery();toast('Pick a frame from the scene gallery to use as a reference shot')}},'Frame from another shot'),
   h('button',{class:'small',onclick:()=>{s.refs.push({id:uid('up'),scope:'shot',type:'upload',label:'Uploaded photo'});render()}},'Upload')),
  mine.length?h('div',{class:'refrow'},mine.map(r=>P.refCard(r,s))):h('div',{class:'faint small'},'Nothing added. Generation will use the cast images above.'));
};

/* ---- sequence rhythm: shot scale + length + how each shot connects ---- */
P.rhythm=()=>{
 const L=shots(),tot=L.reduce((a,s)=>a+s.dur,0);
return h('div',{class:'rhythmw'},h('span',{class:'lbl rl'},'Scale'),h('div',{class:'rhythm',title:'Shot scale (taller = tighter) over runtime. Colour = how each shot connects to the one before.'},
  L.map(s=>{const k=A.sizeKey(s.cam.size),hgt=SCALE[k]/6*100;
   return h('div',{class:'rb c-'+s.cont.kind+(s.id===S.shot?' foc':''),style:`flex:${s.dur} 1 0`,onclick:()=>{S.shot=s.id;render()},title:`${s.id} · ${A.SIZE_ABBR[k]} · ${s.dur}s · ${s.cont.kind}`},h('i',{style:`height:${hgt}%`}),h('span',{},s.id))})));
};

/* ---- the three layouts ---- */
P.inspectorA=s=>h('div',{class:'insp2'},
 h('div',{class:'inspL'},P.shotHead(s),P.action(s),P.dialogue(s),P.camera(s),P.continuity(s),P.frameStrategy(s),P.advanced(s)),
 h('div',{class:'inspR'},P.cast(s),P.refs(s)));
P.layoutA=()=>{
 const s=cur();
 return h('div',{class:'prepA'},
  h('div',{class:'stripdock'},P.rhythm(),U.strip('prep',{title:'Sequence'})),
  s?h('div',{class:'bodyx','data-scroll':'prepA'},P.inspectorA(s)):'');
};

/* B: storyboard overview <-> focused editor */
P.layoutB=()=>{
 const L=shots(),s=cur();
 if(!S.focusB){
  return h('div',{class:'prepB bodyx','data-scroll':'prepB'},
   h('div',{class:'row'},h('b',{style:'font-size:15px'},'Storyboard'),h('span',{class:'faint small'},'Read the scene as a sequence. Click a card to work on that shot.'),h('span',{class:'sp'}),h('button',{class:'ghost small',onclick:()=>U.addShot()},'＋ Shot')),
   P.rhythm(),
   h('div',{class:'board'},L.map((x,i)=>{
    const [k,t]=U.shotState(x);
    return h('div',{class:'bcard'+(x.id===S.shot?' foc':''),onclick:()=>{S.shot=x.id;S.focusB=true;render()}},
     h('div',{class:'bvis'},U.shotVisual(x,'prep'),h('span',{class:'bid'},x.id),h('span',{class:'btime'},x.dur+'s'),h('span',{class:'stt k-'+k},h('i',{}),t)),
     h('div',{class:'bmeta'},h('b',{class:'bname'},x.name),
      h('div',{class:'bgram'},h('span',{},A.SIZE_ABBR[A.sizeKey(x.cam.size)]),h('span',{},A.moveIcon[A.moveKind(x.cam.move)]+' '+A.moveShort(x.cam.move)),h('span',{},x.cam.lens),U.contTag(x)),
      h('p',{class:'bact'},x.action||'—'),
      x.dialogue[0]?h('p',{class:'bdlg serif'},'“'+x.dialogue[0].line+'”'):'',
      h('div',{class:'bcast'},x.roster.map(r=>{const l=openLook(x,r);return h('span',{class:'bav'+(persists(x,r)?' chg':''),title:`${aname(r.a)} · ${lookName(r.a,l)}`},A.assetEl(r.a,l,r.view),h('em',{},PRES[r.pres]==='Stays throughout'?'':PRES[r.pres]))}))),
     i<L.length-1?h('div',{class:'bconn c-'+L[i+1].cont.kind,title:'Into '+L[i+1].id+': '+L[i+1].cont.kind}):'')})));
 }
 return h('div',{class:'prepB focus'},
  h('nav',{class:'vrail'},h('button',{class:'ghost small',onclick:()=>{S.focusB=false;render()}},'◂ Storyboard'),
   L.map(x=>U.cell(x,'prep',{vertical:true}))),
  s?h('div',{class:'bodyx','data-scroll':'prepBf'},
   P.shotHead(s),
   h('div',{class:'focusTop'},
    h('div',{class:'col',style:'gap:20px;min-width:0'},P.action(s),P.dialogue(s),P.frameStrategy(s),P.refs(s)),
    h('div',{class:'col',style:'gap:20px;min-width:0'},P.camera(s),P.continuity(s))),
   P.cast(s,{cls:'wide'}),P.advanced(s)):'');
};

/* C: cast matrix (assets x shots) + inspector for the selected shot */
P.layoutC=()=>{
 const L=shots(),s=cur();
 const assets=[...new Set([...sc().assets,...L.flatMap(x=>x.roster.map(r=>r.a))])];
 const grp=TYPES_=>assets.filter(a=>PRES_[a].t===TYPES_);
 const order=[...grp('Character'),...grp('Location'),...grp('Prop')];
 const cellFor=(a,x)=>{
  const r=x.roster.find(q=>q.a===a);
  if(!r)return h('div',{class:'mx empty'+(x.id===S.shot?' fcol':''),title:`Add ${aname(a)} to ${x.id}`,onclick:()=>{S.shot=x.id;undoable(aname(a)+' added to '+x.id,()=>addAsset(x,a));S.drawer={mode:'asset',a};render()}},'＋');
  const l=openLook(x,r),chg=persists(x,r);
  return h('div',{class:'mx'+(x.id===S.shot?' fcol':'')+(S.drawer?.a===a&&x.id===S.shot?' sel':''),title:`${aname(a)} · ${lookName(a,l)}${chg?' → '+lookName(a,endLook(x,r)):''} · ${PRES[r.pres]}`,onclick:()=>{S.shot=x.id;S.drawer={mode:'asset',a};render()}},
   h('div',{class:'mxi'},U.at(a,l,r.view,{size:'xs',label:false}),chg?[h('span',{class:'faint'},'→'),U.at(a,endLook(x,r),r.view,{size:'xs',label:false})]:''),
   h('div',{class:'mxt'},h('span',{class:'mxl'},lookName(a,l).split(',')[0]),P.presBar(x,r)));
 };
 const lookRun=a=>{ /* look boundaries drawn by cell content itself */ };
 return h('div',{class:'prepC'},
  h('div',{class:'mxwrap'},
   h('div',{class:'mxgrid',style:`grid-template-columns:150px repeat(${L.length},minmax(0,1fr))`},
    h('div',{class:'mxh corner'},h('span',{class:'lbl'},'Cast × sequence'),h('span',{class:'faint small'},'Look changes and entrances across the scene')),
    L.map(x=>h('div',{class:'mxh'+(x.id===S.shot?' foc':''),onclick:()=>{S.shot=x.id;render()}},A.el(A.glyph(x.cam.size),'mxg'),h('div',{class:'row small'},h('b',{},x.id),h('span',{class:'dim'},x.dur+'s'),h('span',{class:'sp'}),U.contTag(x).childNodes[0]?h('span',{class:'faint'},{cut:'┃',continues:'═',newview:'↗',match:'◎'}[x.cont.kind]):''),h('div',{class:'small dim'},A.SIZE_ABBR[A.sizeKey(x.cam.size)]+' · '+A.moveShort(x.cam.move)))),
    order.map(a=>[
     h('div',{class:'mxr'},U.at(a,firstLook(a),ASSETS_[a].views[0][0],{size:'xs',label:false}),h('div',{class:'col',style:'gap:0;min-width:0'},h('b',{class:'small'},aname(a)),h('span',{class:'faint small'},PRES_[a].t))),
     L.map(x=>cellFor(a,x))]))),
  s?h('div',{class:'bodyx','data-scroll':'prepC'},h('div',{class:'insp2 c'},
    h('div',{class:'inspL'},P.shotHead(s),P.action(s),P.dialogue(s),P.camera(s),P.continuity(s),P.frameStrategy(s),P.advanced(s)),
    h('div',{class:'inspR'},P.cast(s),P.refs(s)))):'');
};
P.layout=()=>S.prepL==='B'?P.layoutB():S.prepL==='C'?P.layoutC():P.layoutA();
const ASSETS_=D.ASSETS;
})();

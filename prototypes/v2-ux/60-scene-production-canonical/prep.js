/* Scene Prep (final): Storyboard arrival, Shot editor under the persistent horizontal strip, collapsed Cast & Looks fold-down. No rail, no Scale bar, no mode toggle. */
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
   h('div',{class:'row small dim'},h('span',{},`Shot ${i+1} of ${L.length}`),h('span',{},'·'),h('span',{},A.SIZE_ABBR[A.sizeKey(s.cam.size)]+' · '+s.cam.move.toLowerCase()),s.mergedFrom?h('span',{class:'quiet'},'includes '+s.mergedFrom.join(', ')+' (merged; its Frames and Takes stay reachable)'):'',s.splitFrom?h('span',{class:'quiet'},'split from '+s.splitFrom):'',s.anchor.length?h('button',{class:'ghost small',onclick:()=>{S.script.open=true;render()}},'From the script ▸'):'')),
  h('div',{class:'durc',title:'Duration'},h('button',{class:'ghost',onclick:()=>{s.dur=Math.max(1,s.dur-1);U.touch(s,'dur');render()}},'−'),h('b',{},s.dur+'s'),h('button',{class:'ghost',onclick:()=>{s.dur=Math.min(30,s.dur+1);U.touch(s,'dur');render()}},'+')),
  h('div',{class:'row'},
   h('button',{class:'ghost icon',title:'Move earlier',disabled:i<1?true:null,onclick:()=>{if(i>0)undoable('Moved earlier',()=>{[L[i-1],L[i]]=[L[i],L[i-1]]})}},'←'),
   h('button',{class:'ghost icon',title:'Move later',disabled:i>=L.length-1?true:null,onclick:()=>{if(i<L.length-1)undoable('Moved later',()=>{[L[i+1],L[i]]=[L[i],L[i+1]]})}},'→'),
   h('button',{class:'ghost small',title:'Split into two shots at the middle of the action. This part keeps the id.',onclick:()=>P.split(s)},'Split'),
   h('button',{class:'ghost small',disabled:i>=L.length-1?true:null,title:'Merge with the next shot. This shot keeps the id.',onclick:()=>P.merge(s)},'Merge'),
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
     h('div',{class:'row'},d.audio?h('span',{class:'mic',title:'A performance or spoken line is attached. Record, upload and voice work are in Generate → Takes.'},'🎙'):'',h('select',{class:'who',onchange:e=>{d.who=e.target.value;render()}},[...chars.map(c=>aname(c.a).split(' ')[0]),'Voice'].map(n=>h('option',{selected:n===d.who},n))),
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
  h('label',{},h('span',{class:'flb'},'Directions (ordered)'),h('div',{class:'dim small'},(()=>{const r=s.roster.find(q=>PRES_[q.a].t==='Location');return r?r.dirs.map(v=>viewName(r.a,v)).join(' → ')+' · edit on the Location card':'No location in this shot'})()),U.inp(s.direction,v=>{s.direction=v;U.touch(s,'dir');render()},{placeholder:'Note on what the camera reveals'})),
  h('label',{},h('span',{class:'flb'},'Angle'),U.seg([['Low','Low'],['Eye level','Eye level'],['High','High']],/low/i.test(s.cam.angle)?'Low':/high/i.test(s.cam.angle)?'High':'Eye level',v=>{s.cam.angle=v;render()})),
  h('label',{class:'w2'},h('span',{class:'flb'},'Camera notes'),U.inp(s.cam.note,v=>{s.cam.note=v;render()})),
  h('label',{class:'w2'},h('span',{class:'flb'},'Visual direction'),U.ta(s.visual,v=>{s.visual=v;render()},2)),
  h('label',{class:'w2'},h('span',{class:'flb'},'Sound direction'),U.ta(s.sound,v=>{s.sound=v;render()},2))));

/* ---- whole-shot references (visual) ---- */
const REFC={asset:['Asset','refc-asset'],shot:['Composition','refc-shot'],cineblock:['CineBlock','refc-cine'],upload:['Upload','refc-up'],storyboard:['Storyboard','refc-up']};
P.refArt=(ref,s)=>{
 if(ref.type==='shot')return A.frame(shotIn(ref),ref.srcRole);
 if(ref.type==='storyboard')return A.upload(ref.seed);
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
   h('b',{class:'small'},ref.type==='shot'?`${ref.srcShot} ${ROLE_NAME[ref.srcRole].toLowerCase()} frame`:ref.type==='cineblock'?'CineBlock capture':ref.type==='storyboard'?ref.label:ref.label),
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
  h('div',{class:'row'},h('span',{class:'lbl'},'References for generation'),h('span',{class:'faint small'},'Cast images are used automatically · add anything else that should steer composition'),h('span',{class:'sp'}),
   h('button',{class:'small',onclick:()=>{S.refLib={scope:'shot',role:S.role||'open'};S.drawer=null;render()}},'＋ Add reference image')),
  mine.length?h('div',{class:'refrow'},mine.map(r=>P.refCard(r,s))):h('div',{class:'faint small'},'Nothing added. Generation will use the cast images above.'));
};

/* ---- split / merge (SHOT-MODEL §5): keep-first ids, nothing invented ---- */
const freshFr=s=>Object.fromEntries(rolesOf(s).map(k=>[k,{st:'none',n:0,cur:0,ap:null,refs:[],ov:{},pov:null}]));
P.split=s=>{
 const L=shots(),i=idxOf(s),sents=s.action.split(/(?<=\.)\s+/);
 if(sents.length<2&&s.dialogue.length<2){toast('Nothing to split yet: write at least two sentences of action, or two lines of dialogue');return}
 undoable('Split into two shots · '+s.id+' keeps its id, frames and Takes',()=>{
  const used=L.map(x=>x.id),letter='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').find(c=>!used.includes(S.scene+c));
  const cut=Math.max(1,Math.ceil(sents.length/2)),d1=Math.max(1,Math.round(s.dur*cut/Math.max(sents.length,1))),dcut=Math.ceil(s.dialogue.length/2);
  const b={...JSON.parse(JSON.stringify({...s,takes:[],fr:{}})),id:S.scene+letter,name:s.name+' (second part)',splitFrom:s.id,sel:null,fail:null,partial:null,gen:null,final:0,
   action:sents.slice(cut).join(' '),dialogue:s.dialogue.slice(dcut),dur:Math.max(1,s.dur-d1),cont:{kind:'continues',mk:'',note:'Continues from '+s.id,pin:null},refs:[]};
  b.fr=freshFr(b);
  s.action=sents.slice(0,cut).join(' ');s.dialogue=s.dialogue.slice(0,dcut);s.dur=d1;
  rolesOf(s).forEach(k=>{const f=frame(s,k);if(f.st!=='none')f.stale=1});
  b.dialogue.forEach(d=>{d.id=b.id+'-L'+(d.id.split('-L')[1]||'1')});
  L.splice(i+1,0,b);S.shot=s.id;sc().plan='drafted'});
};
P.merge=s=>{
 const L=shots(),i=idxOf(s),n=L[i+1];if(!n)return;
 undoable('Merged '+n.id+' into '+s.id+' · '+s.id+' keeps its id',()=>{
  s.action=(s.action+' '+n.action).trim();s.dialogue=s.dialogue.concat(n.dialogue);s.dur=s.dur+n.dur;
  n.roster.forEach(r=>{if(!s.roster.some(q=>q.a===r.a))s.roster.push(r)});
  if(n.cam.size!==s.cam.size||n.cam.move!==s.cam.move)s.cam.note=(s.cam.note?s.cam.note+' ':'')+'Merged from '+n.id+': “'+n.cam.size+', '+n.cam.move+'”.';
  s.mergedFrom=(s.mergedFrom||[]).concat(n.id);
  rolesOf(s).forEach(k=>{const f=frame(s,k);if(f.st!=='none')f.stale=1});
  L.splice(i+1,1);S.shot=s.id});
};

/* ---- Storyboard: the scene entry surface ---- */
U.sbVisual=s=>{
 const f=rolesOf(s).includes('open')?frame(s,'open'):null;
 if(f&&f.st!=='none')return h('div',{class:'cvis'},A.frameEl(s,'open',{seed:f.cur+1}));
 if(s.fp==='skip'&&picked(s))return h('div',{class:'cvis'},A.el(A.take(s,picked(s)),'a-frame'),h('span',{class:'stillnote'},'still from selected Take'));
 return h('div',{class:'cvis blank'},h('span',{class:'faint small'},s.fp==='skip'?'Video only · no Take yet':'No opening frame yet'));
};
P.storyboard=()=>{
 const L=shots(),scene=sc(),st=sceneStats(S.scene);
 return h('div',{class:'prepB bodyx','data-scroll':'sb'},
  h('div',{class:'row'},h('b',{style:'font-size:16px'},'Storyboard'),h('span',{class:'faint small'},'Read the scene as a sequence. Click a card to edit that shot.'),h('span',{class:'sp'}),
   h('span',{class:'dim small'},`${L.length} shots · ${fmt(st.plan)} planned`),
   scene.acc?h('span',{class:'chip ok',title:'AI-chose marks are quiet now; the AI vs Mine toggle still shows them'},'Plan accepted'):h('button',{class:'primary',onclick:()=>acceptPlan(S.scene),title:'Accepting quiets the AI-chose marks. It gates nothing.'},'Accept plan'),
   h('button',{class:'ghost small',onclick:()=>U.addShot()},'＋ Shot')),
  h('div',{class:'board'},L.map((x,i)=>{
   const [k,t]=U.shotState(x),loc=x.roster.find(r=>ASSETS_[r.a].t==='Location');
   return h('div',{class:'bcard'+(x.id===S.shot?' foc':''),onclick:()=>{S.shot=x.id;S.sb=false;render()}},
    h('div',{class:'bvis'},U.sbVisual(x),h('span',{class:'bid'},x.id),h('span',{class:'btime'},x.dur+'s'),h('span',{class:'stt k-'+k},h('i',{}),t)),
    h('div',{class:'bmeta'},h('b',{class:'bname'},x.name),
     h('div',{class:'bgram'},h('span',{},A.SIZE_ABBR[A.sizeKey(x.cam.size)]),h('span',{},A.moveIcon[A.moveKind(x.cam.move)]+' '+A.moveShort(x.cam.move)),h('span',{},x.cam.lens),U.contTag(x)),
     h('p',{class:'bact'},x.action||'—'),
     x.dialogue[0]?h('p',{class:'bdlg serif'},x.dialogue[0].audio?h('span',{class:'mic'},'🎙 '):'','“'+x.dialogue[0].line+'”'):'',
     h('div',{class:'bcast'},x.roster.map(r=>{const l=openLook(x,r);return h('span',{class:'bav'+(persists(x,r)?' chg':''),title:`${aname(r.a)} · ${lookName(r.a,l)}`},A.assetEl(r.a,l,r.view),h('em',{},PRES[r.pres]==='Stays throughout'?'':PRES[r.pres]))})),
     loc&&loc.dirs.length>1?h('div',{class:'faint small'},'📍 '+loc.dirs.length+' Directions of '+aname(loc.a)):'' ),
    i<L.length-1?h('div',{class:'bconn c-'+L[i+1].cont.kind,title:'Into '+L[i+1].id+': '+L[i+1].cont.kind}):'')})));
};

/* ---- Cast & Looks: a lens over the SAME shots. It owns no shot cards and no shot navigation. Its columns are exactly as wide as the strip cells and scroll with the strip; a cell selects that strip shot and opens the asset in the drawer. ---- */
P.mxData=()=>{
 const L=shots();
 const assets=[...new Set([...sc().assets,...L.flatMap(x=>x.roster.map(r=>r.a))])];
 const grp=T_=>assets.filter(a=>ASSETS_[a].t===T_);
 return{L,order:[...grp('Character'),...grp('Location'),...grp('Prop')]};
};
P.mxLabels=()=>{
 const {order}=P.mxData();
 return h('div',{class:'mxlabels'},order.map(a=>h('div',{class:'mxr',title:aname(a)+' · '+ASSETS_[a].t},U.at(a,firstLook(a),ASSETS_[a].views[0][0],{size:'xs',label:false}),h('div',{class:'col',style:'gap:0;min-width:0'},h('b',{class:'small'},aname(a).split(' ')[0]),h('span',{class:'faint small'},ASSETS_[a].t)))));
};
P.mxCells=()=>{
 const {L,order}=P.mxData();
 const cellFor=(a,x)=>{
  const w=`width:${U.cellW(x)}px`;
  const r=x.roster.find(q=>q.a===a);
  if(!r)return h('div',{class:'mx empty'+(x.id===S.shot?' fcol':''),style:w,title:`Add ${aname(a)} to ${x.id}`,onclick:()=>{S.shot=x.id;undoable(aname(a)+' added to '+x.id,()=>addAsset(x,a));S.drawer={mode:'asset',a};render()}},'＋');
  const l=openLook(x,r),chg=persists(x,r);
  return h('div',{class:'mx'+(x.id===S.shot?' fcol':'')+(S.drawer?.a===a&&x.id===S.shot?' sel':''),style:w,title:`${x.id} · ${aname(a)} · ${lookName(a,l)}${chg?' → '+lookName(a,endLook(x,r)):''} · ${PRES[r.pres]}`,onclick:()=>{S.shot=x.id;S.drawer={mode:'asset',a};S.refLib=null;render()}},
   h('div',{class:'mxi'},U.at(a,l,r.view,{size:'xs',label:false}),chg?[h('span',{class:'faint'},'→'),U.at(a,endLook(x,r),r.view,{size:'xs',label:false})]:'',r.dirs&&r.dirs.length>1?h('span',{class:'chip',title:r.dirs.length+' ordered Directions of this Location'},'×'+r.dirs.length):''),
   h('div',{class:'mxt'},h('span',{class:'mxl'},lookName(a,l).split(',')[0]),P.presBar(x,r)));
 };
 const sc_=h('div',{class:'mxscroll','data-scroll':'mx',onscroll:e=>{const c=$('.cells2[data-scroll="cells-prep"]');if(c&&Math.abs(c.scrollLeft-e.target.scrollLeft)>1)c.scrollLeft=e.target.scrollLeft}},
  order.map(a=>h('div',{class:'mxrow'},L.map(x=>cellFor(a,x)))));
 return sc_;
};

/* ---- Shot editor ---- */
P.stripLabel=()=>h('div',{class:'striplabel'},
 h('button',{class:'ghost small quietlink',title:'Back to the scene overview',onclick:()=>{S.sb=true;render()}},'▤ Storyboard'),
 h('div',{class:'faint small'},`${shots().length} shots · ${fmt(sceneStats(S.scene).plan)}`),
 h('div',{class:'row'},h('button',{class:'ghost small'+(S.matrix?' on':''),onclick:()=>{S.matrix=!S.matrix;render()},title:'A lens over these same shots: who appears in each, which Look, what changes'},'Cast & Looks '+(S.matrix?'▾':'▸')),
  h('button',{class:'ghost small',title:'Add a shot',onclick:()=>U.addShot()},'＋')));
P.shotEditor=()=>{
 const s=cur();
 return h('div',{class:'prepA'},
  h('div',{class:'stripdock sd2'+(S.matrix?' mxopen':'')},
   P.stripLabel(),U.strip('prep',{head:false}),
   S.matrix?h('div',{class:'mxbox'},h('div',{class:'mxgrid2'},P.mxLabels(),P.mxCells())):''),
  s?h('div',{class:'bodyx','data-scroll':'prepE'},h('div',{class:'insp2'},
   h('div',{class:'inspL'},P.shotHead(s),P.action(s),P.dialogue(s),P.camera(s),P.continuity(s),P.frameStrategy(s),P.advanced(s)),
   h('div',{class:'inspR'},P.cast(s),P.refs(s)))):'');
};
P.layout=()=>S.sb?P.storyboard():P.shotEditor();
const ASSETS_=D.ASSETS;
})();

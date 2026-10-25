/* (final) Visual cast board + asset drawer (add / remove / Look / View / presence / references / blocking) + inline Create new Look. Shared by every Prep layout and opened from Generate. */
(()=>{
const P={};
const PRES_ORDER=['throughout','enters','leaves','open','end'];
const PRES_SPAN={throughout:[0,1],enters:[.4,1],leaves:[0,.6],open:[0,.34],end:[.66,1]};
const PRES_HELP={throughout:'On screen the whole shot',enters:'Walks / cuts in part-way',leaves:'Exits part-way',open:'Only in the opening frame',end:'Only in the ending frame'};
const rowOf=(s,a)=>s.roster.find(r=>r.a===a);
const TYPES=[['Character','Characters'],['Location','Locations'],['Prop','Props']];

P.presBar=(s,r,o={})=>{
 const [a,b]=PRES_SPAN[r.pres];
 return h('div',{class:'pbar'+(o.big?' big':''),title:PRES[r.pres]+': '+PRES_HELP[r.pres]},h('i',{style:`left:${a*100}%;width:${(b-a)*100}%`}),
  o.big?[h('span',{class:'tk0'},'opening'),h('span',{class:'tk1'},'ending')]:'');
};
P.presPicker=(s,r)=>h('div',{class:'prespick'},PRES_ORDER.map(p=>h('button',{class:'pp'+(r.pres===p?' on':''),title:PRES_HELP[p],onclick:e=>{e.stopPropagation();r.pres=p;U.touch(s,'fp');markDownstream(s,r.a);render()}},
  h('div',{class:'pbar'},h('i',{style:`left:${PRES_SPAN[p][0]*100}%;width:${(PRES_SPAN[p][1]-PRES_SPAN[p][0])*100}%`})),h('span',{},PRES[p]))));

/* Look chip with swatches */
P.lookChip=(a,l,o={})=>h('span',{class:'lchip'+(o.on?' on':'')+(o.cls?' '+o.cls:''),onclick:o.onclick,title:ASSETS_[a].looks[l]?.d||''},
 h('span',{class:'sw'},A.swatch(a,l).map(c=>h('i',{style:'background:'+c}))),lookName(a,l),o.tag?h('em',{},o.tag):'');
const ASSETS_=D.ASSETS;


/* Location coverage (Record 6 L6.3): a shot resolves one or more ORDERED Directions, chosen by the space it reveals. AI proposes, creator edits. */
P.dirChips=(a,r)=>h('div',{class:'dirchips'},r.dirs.map((v,i)=>h('span',{class:'dirchip'+((ASSETS_[a].cov||{})[v]===0?' need':''),title:(((ASSETS_[a].cov||{})[v]===0)?'No View made yet for this Direction':'')},h('em',{},i+1),viewName(a,v))),r.dirsAi&&!sc().acc?h('span',{class:'aimark',title:'AI proposed these Directions from what the shot reveals. Edit freely.'},'AI chose'):'');
P.dirEditor=(s,r)=>{
 const a=r.a,cov=ASSETS_[a].cov||{},miss=r.dirs.filter(v=>cov[v]===0);
 const move=(i,d)=>{const j=i+d;if(j<0||j>=r.dirs.length)return;[r.dirs[i],r.dirs[j]]=[r.dirs[j],r.dirs[i]];r.view=r.dirs[0];r.dirsAi=false;render()};
 const key='cov:'+a+s.id;
 return h('div',{class:'col'},
  h('div',{class:'faint small'},'Directions are the views of this place the shot reveals, in the order the camera sees them. The AI proposes them from the shot; it is not a camera-movement label.'),
  h('div',{class:'dirlist'},r.dirs.map((v,i)=>h('div',{class:'dirrow'},h('em',{class:'dirn'},i+1),A.assetEl(a,openLook(s,r),v,'dirimg'),h('b',{class:'small'},viewName(a,v)),cov[v]===0?h('span',{class:'chip warn'},'no View yet'):'',h('span',{class:'sp'}),
   h('button',{class:'ghost small icon',disabled:i<1?true:null,onclick:()=>move(i,-1)},'↑'),h('button',{class:'ghost small icon',disabled:i>=r.dirs.length-1?true:null,onclick:()=>move(i,1)},'↓'),
   h('button',{class:'ghost small icon',disabled:r.dirs.length<2?true:null,title:'Remove this Direction from the shot',onclick:()=>{r.dirs.splice(i,1);r.view=r.dirs[0];r.dirsAi=false;render()}},'✕')))),
  h('div',{class:'lbl'},'Add a Direction'),
  h('div',{class:'viewgal'},viewsOf(a).filter(([k])=>!r.dirs.includes(k)).map(([k,n])=>h('div',{class:'vw'+(cov[k]===0?' need':''),onclick:()=>{r.dirs.push(k);r.dirsAi=false;markDownstream(s,a);render()}},A.assetEl(a,openLook(s,r),k,'vwimg'),h('span',{},n+(cov[k]===0?' · no View':''))))),
  miss.length?h('div',{class:'row wrap'},h('span',{class:'quiet'},miss.length+(miss.length===1?' Direction has':' Directions have')+' no View yet; generation falls back to the identity image.'),
   U.spend(key,'Generate '+miss.length+(miss.length===1?' missing View':' missing Views'),{total:+(.04*miss.length).toFixed(2),count:miss.length,what:'Coverage Views for '+aname(a)},()=>simulate(key,()=>{miss.forEach(v=>cov[v]=1);toast('Views made as draft Attempts, ready to accept')},900),{primary:false})):'');
};

/* ---- cast card: the asset as an image, its Look(s), View, presence, blocking ---- */
P.castCard=(s,r)=>{
 const a=r.a,t=ASSETS_[a].t,ol=openLook(s,r),el=endLook(s,r),chg=persists(s,r);
 const stale=false;
 return h('div',{class:'cc t-'+t.toLowerCase()+(S.drawer?.a===a?' sel':''),onclick:()=>{S.drawer={mode:'asset',a};render()}},
  h('div',{class:'ccimg'+(chg?' pair':'')},
   U.at(a,ol,r.view,{size:'m',label:false,badge:chg?'starts':null}),
   chg?[h('span',{class:'arrow'},'→'),U.at(a,el,r.view,{size:'m',label:false,badge:'ends'})]:''),
  h('div',{class:'ccb'},
   h('div',{class:'row'},h('b',{class:'ccn'},aname(a)),h('span',{class:'faint small'},t),r.ai&&!sc().acc?h('span',{class:'aimark'},'AI chose'):'',h('span',{class:'sp'}),
    h('button',{class:'ghost small icon',title:'Remove from this shot',onclick:e=>{e.stopPropagation();undoable(aname(a)+' removed from '+s.id,()=>removeAsset(s,a))}},'✕')),
   P.presBar(s,r),
   h('div',{class:'row small'},h('span',{class:'pt'},PRES[r.pres]),h('span',{class:'sp'}),h('span',{class:'dim'},t==='Prop'?'':t==='Location'?r.dirs.length+(r.dirs.length===1?' Direction':' Directions'):viewName(a,r.view))),t==='Location'?P.dirChips(a,r):'',
   h('div',{class:'ccl'},P.lookChip(a,ol,{tag:chg?'starts':''}),chg?[h('span',{class:'faint'},'→'),P.lookChip(a,el,{tag:'then stays'})]:''),
   r.trans?h('div',{class:'ctrans'},h('span',{class:'chip'},'Just this shot'),' '+r.trans):'',
   r.note?h('div',{class:'ccnote'},'“'+r.note+'”'):h('div',{class:'ccnote ph'},'Add what they do in this shot…')));
};
P.cast=(s,o={})=>{
 const rows=s.roster;
 return h('div',{class:'cast'+(o.cls?' '+o.cls:'')},
  h('div',{class:'row casth'},h('b',{class:'lbl'},'In this shot'),h('span',{class:'faint small'},rows.length+' assets · click one to change its Look, View and what it does'),h('span',{class:'sp'}),
   h('button',{onclick:()=>{S.drawer={mode:'add'};render()}},'＋ Add asset'),h('button',{class:'ghost',onclick:()=>{S.world=true;render()},title:'The canonical library'},'World library')),
  rows.length?h('div',{class:'castgrid'},rows.map(r=>P.castCard(s,r)),h('div',{class:'cc add',onclick:()=>{S.drawer={mode:'add'};render()}},h('span',{class:'plus'},'＋'),h('span',{},'Add an asset the AI missed'))):
   h('div',{class:'cc add big',onclick:()=>{S.drawer={mode:'add'};render()}},h('span',{class:'plus'},'＋'),h('span',{},'Nobody and nothing is in this shot yet. Add a character, location or prop.')));
};

/* ---- drawer ---- */
P.libraryPicker=s=>{
 const tab=S.libTab||'Character';
 const have=s.roster.map(r=>r.a);
 const keys=Object.keys(ASSETS_).filter(k=>ASSETS_[k].t===tab);
 const inScene=sc().assets;
 return h('div',{class:'col'},
  h('div',{class:'row'},h('b',{class:'dh'},'Add to '+s.id),h('span',{class:'sp'}),h('button',{class:'ghost',onclick:()=>{S.drawer=null;render()}},'✕')),
  U.seg(TYPES.map(([k,l])=>[k,l]),tab,v=>{S.libTab=v;render()}),
  h('div',{class:'faint small'},'World Definition library. Looks you create here are available everywhere.'),
  h('div',{class:'libgrid'},keys.map(k=>{const on=have.includes(k),f=firstLook(k);
   return h('div',{class:'lib'+(on?' on':'')},U.at(k,f,ASSETS_[k].views[0][0],{size:'l',label:true,sub:false}),
    h('div',{class:'row small'},h('span',{class:'faint'},Object.keys(ASSETS_[k].looks).length+' Looks · '+ASSETS_[k].views.length+' Views'),h('span',{class:'sp'}),
     on?h('span',{class:'chip ok'},'In this shot'):h('button',{class:'primary small',onclick:()=>undoable(aname(k)+' added to '+s.id,()=>{addAsset(s,k);if(!inScene.includes(k))inScene.push(k);S.drawer={mode:'asset',a:k}})},'Add')))
  })));
};
P.lookGallery=(s,r,which)=>{
 const a=r.a,cur=which==='open'?openLook(s,r):endLook(s,r);
 const set=l=>undoable(`${which==='open'?'Starts':'Ends'} as ${lookName(a,l)}`,()=>{
  if(which==='open'){r.open=l;if(r.end===l)r.end=null}else{r.end=l===openLook(s,r)?null:l;r.trans=r.end?null:r.trans}
  markDownstream(s,a);U.touch(s,'fp')});
 return h('div',{class:'lookgal'},looksOf(a).map(([k,L])=>h('div',{class:'lk'+(cur===k?' on':'')+(L.created?' new':''),onclick:()=>set(k),title:L.d},
  U.at(a,k,r.view,{size:'m',label:false}),
  h('div',{class:'lkn'},L.n,cur===k?h('span',{class:'ck'},'✓'):''),
  h('div',{class:'lkd'},L.img?'':'Description only · ',L.created?'New · ':'',carried(a,s).look===k?'story look here':''))));
};
P.lookCreator=(s,r)=>{
 const a=r.a,c=S.lookNew;
 if(!c)return h('button',{class:'dashbtn',onclick:()=>{S.lookNew={a,name:'',desc:'',mode:'generate',use:'end'};render()}},h('span',{class:'plus'},'＋'),' Create new Look for '+aname(a).split(',')[0]);
 const v=describeToVisual(a,c.desc);
 const prevId='lookprev';
 const tmpKey='__tmp';
 ASSETS_[a].looks[tmpKey]={n:c.name||'New Look',d:c.desc,img:c.mode!=='none',v};
 const prev=A.el(A.asset(a,tmpKey,r.view),'lookprev');
 delete ASSETS_[a].looks[tmpKey];
 const ex=a==='voss'?'Black tuxedo, white shirt streaked with blood, bow tie pulled loose':'Describe what differs from the identity image';
 return h('div',{class:'lcreate'},
  h('div',{class:'row'},h('b',{},'New Look for '+aname(a)),h('span',{class:'faint small'},'Added to World Definition, available in every scene'),h('span',{class:'sp'}),h('button',{class:'ghost small',onclick:()=>{S.lookNew=null;render()}},'Cancel')),
  h('div',{class:'lcgrid'},
   h('div',{class:'lcprev'},prev,h('div',{class:'faint small'},c.mode==='none'?'Description only: generation composes the identity image with this text':c.mode==='upload'?'Uploaded reference (mock)':'Preview from identity image + description')),
   h('div',{class:'col'},
    h('input',{placeholder:'Name, e.g. Bloodied tuxedo',value:c.name,oninput:e=>{c.name=e.target.value},onchange:()=>render()}),
    h('textarea',{rows:3,placeholder:ex,oninput:e=>{c.desc=e.target.value},onchange:()=>render()},c.desc),
    h('div',{class:'row wrap'},h('span',{class:'faint small'},'Image'),U.seg([['generate','Generate from identity · $0.04'],['none','Description only'],['upload','Upload…']],c.mode,v=>{c.mode=v;render()})),
    h('div',{class:'row wrap'},h('span',{class:'faint small'},'Use it in this shot'),U.seg([['open','Starts as this'],['end','Changes to this during the shot'],['later','From here on, off screen'],['none','Don’t assign']],c.use,v=>{c.use=v;render()})),
    h('div',{class:'row'},h('button',{class:'primary',disabled:!c.name.trim()?true:null,onclick:()=>{
      const k=createLook(a,{name:c.name.trim(),desc:c.desc.trim()||c.name.trim(),mode:c.mode,scene:S.scene,shot:s.id});
      if(c.use==='open'){r.open=k}else if(c.use==='end'){r.end=k;r.trans=null}else if(c.use==='later'){r.later=k}
      markDownstream(s,a);S.lookNew=null;S.lastNewLook={a,k};render();
      toast(`“${c.name.trim()}” added to ${aname(a)} in World Definition. Available project-wide.`,()=>{delete ASSETS_[a].looks[k];if(r.open===k)r.open=null;if(r.end===k)r.end=null;if(r.later===k)r.later=null;render()});
     }},'Create Look'+(c.mode==='generate'?' · $0.04':'')),h('span',{class:'faint small'},'You can edit its description or image any time, here or in World Definition.')))));
};
P.viewGallery=(s,r)=>{
 const a=r.a;
 return h('div',{class:'viewgal'},viewsOf(a).map(([k,n])=>h('div',{class:'vw'+(r.view===k?' on':''),onclick:()=>{r.view=k;markDownstream(s,a);render()}},
  A.assetEl(a,openLook(s,r),k,'vwimg'),h('span',{},n))));
};
P.refsFor=(s,r)=>{
 r.refs=r.refs||[];
 return h('div',{class:'col'},
  r.refs.length?h('div',{class:'refthumbs'},r.refs.map((x,i)=>h('div',{class:'rf'},A.el(x.kind==='shot'?A.frame(shot(x.srcShot),x.srcRole):A.upload(x.id),'rft'),h('span',{class:'small'},x.label),h('button',{class:'ghost small icon',onclick:()=>{r.refs.splice(i,1);render()}},'✕')))):h('div',{class:'faint small'},'Identity image and Look are used automatically. Add a reference to steer this asset in this shot.'),
  h('div',{class:'row wrap'},h('button',{class:'small',onclick:()=>{r.refs.push({id:uid('up'),kind:'upload',label:'Uploaded photo'});render();toast('Reference photo attached (mock upload)')}},'Upload a photo'),
   h('button',{class:'small',onclick:()=>{const pv=shots()[idxOf(s)-1]||shots()[0];r.refs.push({id:uid('rs'),kind:'shot',srcShot:pv.id,srcRole:'end',label:pv.id+' ending'});render()}},'Use previous ending'),
   h('button',{class:'small',onclick:()=>{S.drawer=null;S.refLib={scope:'shot',role:S.role||'open'};render()}},'From the reference library…')));
};
P.assetDrawer=(s,a)=>{
 const r=rowOf(s,a);
 if(!r){S.drawer=null;return null}
 const t=ASSETS_[a].t,ol=openLook(s,r),el=endLook(s,r);
 const endMode=r.end?'look':r.trans?'temp':'same';
 const sec=(title,body,hint)=>h('div',{class:'dsec'},h('div',{class:'row'},h('b',{class:'lbl'},title),hint?h('span',{class:'faint small'},hint):''),body);
 return h('div',{class:'col drawerc'},
  h('div',{class:'row'},h('b',{class:'dh'},aname(a)),h('span',{class:'faint small'},t+' · in '+s.id),h('span',{class:'sp'}),h('button',{class:'ghost',onclick:()=>{S.drawer=null;S.lookNew=null;render()}},'✕')),
  h('div',{class:'dhero'},U.at(a,ol,r.view,{size:'xl',label:false}),
   endMode!=='same'&&endMode==='look'?[h('span',{class:'arrow'},'→'),U.at(a,el,r.view,{size:'xl',label:false})]:'',
   h('div',{class:'col',style:'gap:4px;flex:1'},h('b',{style:'font-size:15px'},lookName(a,ol)+(endMode==='look'?' → '+lookName(a,el):'')),h('div',{class:'dim small'},ASSETS_[a].looks[ol].d),
    h('div',{class:'row'},h('span',{class:'chip'},PRES[r.pres]),t==='Prop'?'':t==='Location'?h('span',{class:'chip'},r.dirs.length+(r.dirs.length===1?' Direction':' Directions')):h('span',{class:'chip'},viewName(a,r.view))))),
  sec('During this shot',[P.presPicker(s,r)],''),
  sec('Appearance',h('div',{class:'col'},
    h('div',{class:'approw'},h('span',{class:'dim'},'Starts as'),P.lookGallery(s,r,'open')),
    h('div',{class:'approw'},h('span',{class:'dim'},'Ends as'),
     h('div',{class:'col'},U.seg([['same','Looks the same'],['temp','Temporary change (just this shot)'],['look','Changes to another Look (stays)']],endMode,v=>{
       if(v==='same'){r.end=null;r.trans=null}
       else if(v==='temp'){r.end=null;r.trans=r.trans||'e.g. glass dust hangs in the air'}
       else{const alt=looksOf(a).map(x=>x[0]).find(k=>k!==ol);r.end=alt;r.trans=null}
       markDownstream(s,a);render()}),
      endMode==='temp'?h('div',{class:'col'},U.inp(r.trans,v=>{r.trans=v;render()},{placeholder:'What changes just for this shot'}),h('span',{class:'faint small'},'Shapes this shot’s frames and video. Not carried into later shots.')):'',
      endMode==='look'?[P.lookGallery(s,r,'end'),h('div',{class:'row small'},h('span',{class:'faint'},'Afterwards, the story record should…'),U.sel([['ask','Decide later'],['writeback','Update the script to match'],['deviation','Keep as a deviation']],r.wb||'ask',v=>{r.wb=v;render()}))]:'')),
    h('div',{class:'approw'},h('span',{class:'dim'},'In later shots'),
     h('div',{class:'row wrap'},h('span',{class:'small'},r.later?'From here on: ':'Follows the story'),
      U.sel([['','— no change —'],...looksOf(a).map(([k,L])=>[k,L.n])],r.later||'',v=>{r.later=v||null;markDownstream(s,a);render()}),h('span',{class:'faint small'},'Use for a change that happens off screen'))),
    P.lookCreator(s,r))),
  t==='Prop'?'':t==='Location'?sec('Directions',P.dirEditor(s,r)):sec('View',P.viewGallery(s,r)),
  sec('What they do',h('textarea',{rows:2,placeholder:'Blocking or action, e.g. stops at the threshold, then steps in',onchange:e=>{r.note=e.target.value;U.touch(s,'fp');render()}},r.note||'')),
  sec('References for this asset',P.refsFor(s,r)),
  h('div',{class:'row dfoot'},h('button',{class:'ghost',onclick:()=>undoable(aname(a)+' removed from '+s.id,()=>{removeAsset(s,a);S.drawer=null})},'Remove from shot'),h('span',{class:'sp'}),h('button',{class:'primary',onclick:()=>{S.drawer=null;S.lookNew=null;render()}},'Done')));
};
P.drawer=()=>{
 if(S.refLib)return G.refLibrary();
 if(!S.drawer)return'';
 const s=cur();if(!s)return'';
 const body=S.drawer.mode==='add'?P.libraryPicker(s):P.assetDrawer(s,S.drawer.a);
 if(!body)return'';
 return h('aside',{class:'drawer'},h('div',{class:'dscroll','data-scroll':'drawer'},body));
};
P.world=()=>{
 if(!S.world)return'';
 return h('div',{class:'overlay',onclick:e=>{if(e.target.classList.contains('overlay')){S.world=false;render()}}},h('div',{class:'worldp'},
  h('div',{class:'row'},h('h3',{style:'margin:0'},'World Definition · library'),h('span',{class:'faint small'},'The canonical source. Scene Prep may extend it; nothing lives only in a scene.'),h('span',{class:'sp'}),h('button',{class:'ghost',onclick:()=>{S.world=false;render()}},'Close')),
  TYPES.map(([t,l])=>h('div',{class:'wsec'},h('b',{class:'lbl'},l),h('div',{class:'wgrid'},Object.keys(ASSETS_).filter(k=>ASSETS_[k].t===t&&(k[0]!=='g'||sc().assets.includes(k))).map(k=>
   h('div',{class:'wcard'},h('div',{class:'row'},h('b',{},aname(k)),h('span',{class:'faint small'},Object.keys(ASSETS_[k].looks).length+' Looks')),
    h('div',{class:'wlooks'},looksOf(k).map(([lk,L])=>h('div',{class:'wl'+(L.created?' new':'')},U.at(k,lk,ASSETS_[k].views[0][0],{size:'s',label:false}),h('span',{class:'small'},L.n),L.created?h('em',{},'new · created in '+L.created.shot):''))))))))));
};
window.P=P;
})();

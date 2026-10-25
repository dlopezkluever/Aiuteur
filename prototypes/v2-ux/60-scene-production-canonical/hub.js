/* Script Hub (Record 4 §5.2): compact scene list + per-scene ribbon (never per-shot) + large summary panel with Master Narrative portion, assets as images, runtime, progress, key-frame carousel, ending image, Open scene. */
(()=>{
const H={};
const ids=()=>Object.keys(D.scenes).map(Number);
const status=id=>{const st=sceneStats(id);if(!st.n)return['No shots yet',''];if(st.sel===st.n)return['Complete','ok'];if(st.fa||st.sel)return['In progress','prog'];return['Planned',''];};
const rt=id=>sc(id).shots.length?sceneStats(id).plan:estRuntime(id);
H.ribbon=()=>h('div',{class:'ribbon big'},ids().map(id=>{const st=sceneStats(id),n=st.n||1;
 return h('div',{class:'sc'+(id===S.sel?' on':''),style:`flex:${rt(id)} 1 0`,title:`Scene ${id} · ${sc(id).name} · ${fmt(rt(id))}${st.n?'':' (estimate, no shots yet)'}`,onclick:()=>{S.sel=id;render()}},
  h('span',{class:'sn'},id),h('div',{class:'sbar'},st.n?[h('i',{class:'s-sel',style:`width:${st.sel/n*100}%`}),h('i',{class:'s-pick',style:`width:${st.pick/n*100}%`}),h('i',{class:'s-miss',style:`width:${(st.missing+st.fail)/n*100}%`})]:h('i',{class:'s-none',style:'width:100%'})))}));
H.carousel=id=>{
 const fr=[];shots(id).forEach(s=>rolesOf(s).forEach(r=>{if(frame(s,r).st==='appr')fr.push([s,r])}));
 const per=7,i=Math.min(S.carIdx||0,Math.max(0,fr.length-per));
 return h('div',{class:'car2'},h('div',{class:'row'},h('b',{class:'lbl'},'Key frames'),h('span',{class:'faint small'},fr.length?`${fr.length} approved`:'none approved yet'),h('span',{class:'sp'}),
  h('button',{class:'ghost small',disabled:i<=0?true:null,onclick:()=>{S.carIdx=i-1;render()}},'‹'),h('button',{class:'ghost small',disabled:i+per>=fr.length?true:null,onclick:()=>{S.carIdx=i+1;render()}},'›')),
  h('div',{class:'carrow'},fr.length?fr.slice(i,i+per).map(([s,r])=>h('div',{class:'ct'},A.el(A.frame(s,r,{seed:frame(s,r).ap+1}),'a-frame'),h('div',{class:'small dim'},s.id+' '+ROLE_NAME[r].toLowerCase()))):h('div',{class:'faint small',style:'padding:20px 0'},'Frames you approve appear here.')));
};
H.endImg=id=>{
 const img=endingImage(id);
 if(img.kind==='none')return h('div',{class:'endimg none'},h('span',{class:'faint'},'No image yet'));
 const art=img.kind==='world'?A.place(img.a,firstLook(img.a),ASSETS_[img.a].views[0][0]):A.frame(img.s,img.role,{seed:img.kind==='frame'?frame(img.s,'end').ap+1:2});
 return h('div',{class:'endimg'},A.el(art,'a-frame'),img.kind==='world'?h('span',{class:'wtag'},'world image'):'');
};
const ASSETS_=D.ASSETS;
H.summary=id=>{
 const scene=sc(id),st=sceneStats(id),img=endingImage(id),k=enterKind(scene),L=shots(id);
 const enterHint=L.length?'':(scene.noAuto?'Draft plan · '+money(scene.est)+' on entry':k.auto?'Drafts its shot plan when you open it · text only':k.breach?'Cap leaves too little: Draft plan ticket, no Start':'You will see Draft plan · '+money(scene.est));
 return h('div',{class:'sumpanel'},
  h('div',{class:'sumtop'},
   h('div',{class:'col',style:'flex:1;min-width:0;gap:6px'},
    h('div',{class:'row'},h('h2',{style:'margin:0'},`${id} · ${scene.sl} – ${scene.tm}`),h('span',{class:'chip '+status(id)[1]},status(id)[0]),scene.locked?h('span',{class:'lock'},'🔒 plan locked'):''),
    h('div',{class:'dim'},scene.name),
    h('div',{class:'lbl'},'Master Narrative portion'),
    h('div',{class:'mnp serif'},scene.blocks.map(b=>h('p',{},b.text)))),
   h('div',{class:'col',style:'width:360px;flex:none;gap:6px'},
    h('div',{class:'lbl'},'Scene image'),H.endImg(id),
    h('div',{class:'small dim'},img.kind==='world'?h('span',{},img.src,' ',h('span',{class:'chip'},'world image')):img.kind==='none'?'Appears after the first shot has an ending Frame or a selected Take':img.src))),
  h('div',{class:'sumgrid'},
   h('div',{class:'col'},h('div',{class:'lbl'},'Assets in the scene'),h('div',{class:'row'},scene.assets.map(a=>U.at(a,firstLook(a),ASSETS_[a].views[0][0],{size:'s',short:true})))),
   h('div',{class:'col',style:'min-width:150px'},h('div',{class:'lbl'},'Runtime'),h('div',{},L.length?[h('b',{style:'font-size:18px'},fmt(st.made)),h('span',{class:'dim'},` as made · ${fmt(st.plan)} planned`)]:h('span',{class:'dim'},`~${fmt(estRuntime(id))} story estimate`))),
   h('div',{class:'col',style:'min-width:200px'},h('div',{class:'lbl'},'Progress'),L.length?h('div',{class:'small dim'},`${st.n} shots · frames ${st.fa}/${st.fn} approved · ${st.sel}/${st.n} Takes selected`,h('div',{class:'sbar wide'},h('i',{class:'s-sel',style:`width:${st.sel/st.n*100}%`}),h('i',{class:'s-pick',style:`width:${st.pick/st.n*100}%`}))):h('span',{class:'dim small'},'No shots yet')),
   h('div',{class:'col sp',style:'align-items:flex-end;justify-content:flex-end'},h('button',{class:'primary big',onclick:()=>enterScene(id)},'Open scene'),h('span',{class:'quiet'},enterHint))),
  H.carousel(id));
};
H.list=()=>S.cards?h('div',{class:'cardgrid'},ids().map(id=>h('div',{class:'sccard'+(id===S.sel?' on':''),onclick:()=>{S.sel=id;render()},ondblclick:()=>enterScene(id)},h('div',{class:'scimg'},H.thumb(id)),h('b',{},`${id} · ${sc(id).name}`),h('div',{class:'dim small'},sc(id).sl+' – '+sc(id).tm),h('div',{class:'chip '+status(id)[1]},status(id)[0])))):
 h('div',{class:'list'},ids().map(id=>{const st=sceneStats(id);return h('div',{class:'lrow'+(id===S.sel?' on':''),onclick:()=>{S.sel=id;render()},ondblclick:()=>enterScene(id)},
  h('b',{class:'accent',style:'width:26px'},id),h('span',{class:'lthumb'},H.thumb(id)),h('span',{style:'flex:1;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis'},sc(id).sl+' – '+sc(id).tm,h('span',{class:'dim'},'  '+sc(id).name)),
  h('span',{class:'chip '+status(id)[1]},status(id)[0]),h('span',{class:'dim small',style:'width:70px;text-align:right'},st.n?fmt(st.plan):'~'+fmt(estRuntime(id))))}));
H.thumb=id=>{const img=endingImage(id);return img.kind==='none'?h('div',{class:'tmini none'}):A.el(img.kind==='world'?A.place(img.a,firstLook(img.a),ASSETS_[img.a].views[0][0]):A.frame(img.s,img.role),'tmini a-frame')};
H.view=()=>{
 const total=ids().reduce((a,i)=>a+sc(i).shots.length,0);
 return h('div',{class:'hubpane'},
  h('div',{class:'hdr'},h('h2',{},'Script Hub'),h('span',{class:'dim'},`The Salt Line · ${ids().length} scenes · ${total} shots`),h('span',{class:'sp'}),h('span',{class:'faint small'},'Whole film, one block per scene, width = runtime'),h('div',{class:'seg'},h('button',{class:!S.cards?'on':'',onclick:()=>{S.cards=false;render()}},'List'),h('button',{class:S.cards?'on':'',onclick:()=>{S.cards=true;render()}},'Cards'))),
  H.ribbon(),H.summary(S.sel),H.list());
};
window.H=H;
})();

/* Script Hub (Record 4 §5.2): B's compact list + per-scene ribbon (width = runtime, never per-shot ticks) + large summary panel. Shared by both variants. */
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
 const i=Math.min(S.carIdx||0,Math.max(0,fr.length-6));
 return h('div',{class:'car2'},h('div',{class:'row'},h('b',{class:'lbl'},'Key frames'),h('span',{class:'faint small'},fr.length?`${fr.length} approved`:'none approved yet'),h('span',{class:'sp'}),
  h('button',{class:'ghost small',disabled:i<=0?true:null,onclick:()=>{S.carIdx=i-1;render()}},'‹'),h('button',{class:'ghost small',disabled:i+6>=fr.length?true:null,onclick:()=>{S.carIdx=i+1;render()}},'›')),
  h('div',{class:'carrow'},fr.length?fr.slice(i,i+6).map(([s,r])=>h('div',{class:'ct'},h('div',{class:'ftile',style:U.hue((s.hue+({open:0,key:20,end:40}[r]))%360,32)}),h('div',{class:'small dim'},s.id+' '+ROLE_NAME[r].toLowerCase()))):h('div',{class:'faint small',style:'padding:20px 0'},'Frames you approve appear here.')));
};
H.summary=id=>{
 const scene=sc(id),st=sceneStats(id),img=endingImage(id),k=enterKind(scene),L=shots(id);
 const enterHint=L.length?'':(scene.noAuto?'Draft plan · '+money(scene.est)+' on entry':k.auto?'Drafts its shot plan when you open it · text only':k.breach?'Cap leaves too little: Draft plan ticket, no Start':'You will see Draft plan · '+money(scene.est));
 return h('div',{class:'card sumpanel'},
  h('div',{class:'sumtop'},
   h('div',{class:'col',style:'flex:1;min-width:0'},
    h('div',{class:'row'},h('h2',{style:'margin:0'},`${id} · ${scene.sl} – ${scene.tm}`),h('span',{class:'chip '+status(id)[1]},status(id)[0]),scene.locked?h('span',{class:'lock'},'🔒 plan locked'):''),
    h('div',{class:'dim'},scene.name),
    h('div',{class:'lbl'},'Master Narrative portion'),
    h('div',{class:'mnp serif'},scene.blocks.map(b=>h('p',{},b.text)))),
   h('div',{class:'col',style:'width:300px;flex:none'},
    h('div',{class:'lbl'},'Scene image'),
    h('div',{class:'endimg',style:img.kind==='none'?'border:1px dashed var(--line2)':U.hue(img.hue,32)},img.kind==='none'?h('span',{class:'faint'},'No image yet'):''),
    h('div',{class:'small dim'},img.kind==='world'?h('span',{},img.src,' ',h('span',{class:'chip'},'world image')):img.kind==='none'?'Appears after the first shot has an ending Frame or a selected Take':img.src))),
  h('div',{class:'sumgrid'},
   h('div',{class:'col'},h('div',{class:'lbl'},'Assets'),h('div',{class:'row wrap'},scene.assets.map(a=>h('span',{class:'chip'},aname(a))))),
   h('div',{class:'col'},h('div',{class:'lbl'},'Runtime'),h('div',{},L.length?[h('b',{},fmt(st.made)),h('span',{class:'dim'},` as made · ${fmt(st.plan)} planned`)]:h('span',{class:'dim'},`~${fmt(estRuntime(id))} story estimate`))),
   h('div',{class:'col'},h('div',{class:'lbl'},'Progress'),L.length?h('div',{class:'small dim'},`${st.n} shots · frames ${st.fa}/${st.fn} approved · ${st.sel}/${st.n} Takes selected`,h('div',{class:'sbar wide'},h('i',{class:'s-sel',style:`width:${st.sel/st.n*100}%`}),h('i',{class:'s-pick',style:`width:${st.pick/st.n*100}%`}))):h('span',{class:'dim small'},'No shots yet'))),
  H.carousel(id),
  h('div',{class:'row'},h('button',{class:'primary',onclick:()=>enterScene(id)},'Open scene'),h('span',{class:'quiet'},enterHint)));
};
H.list=()=>S.cards?h('div',{class:'cardgrid'},ids().map(id=>h('div',{class:'card pad sccard'+(id===S.sel?' on':''),onclick:()=>{S.sel=id;render()},ondblclick:()=>enterScene(id)},h('b',{},`${id} · ${sc(id).name}`),h('div',{class:'dim small'},sc(id).sl+' – '+sc(id).tm),h('div',{class:'chip '+status(id)[1]},status(id)[0])))):
 h('div',{class:'card list'},ids().map(id=>{const st=sceneStats(id);return h('div',{class:'lrow'+(id===S.sel?' on':''),onclick:()=>{S.sel=id;render()},ondblclick:()=>enterScene(id)},
  h('b',{class:'accent',style:'width:26px'},id),h('span',{style:'flex:1;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis'},sc(id).sl+' – '+sc(id).tm,h('span',{class:'dim'},'  '+sc(id).name)),
  h('span',{class:'chip '+status(id)[1]},status(id)[0]),h('span',{class:'dim small',style:'width:70px;text-align:right'},st.n?fmt(st.plan):'~'+fmt(estRuntime(id))))}));
H.view=()=>{
 const total=ids().reduce((a,i)=>a+sc(i).shots.length,0);
 return h('div',{class:'pane hubpane'},
  h('div',{class:'hdr'},h('h2',{},'Script Hub'),h('span',{class:'dim'},`The Salt Line · ${ids().length} scenes · ${total} shots`),h('span',{class:'sp'}),h('div',{class:'seg'},h('button',{class:!S.cards?'on':'',onclick:()=>{S.cards=false;render()}},'List'),h('button',{class:S.cards?'on':'',onclick:()=>{S.cards=true;render()}},'Cards'))),
  H.summary(S.sel),
  h('div',{class:'row small dim'},h('b',{class:'lbl'},'Whole film'),'one block per scene, width = runtime (scenes without shots use the story estimate)'),
  H.ribbon(),H.list());
};
window.H=H;
})();

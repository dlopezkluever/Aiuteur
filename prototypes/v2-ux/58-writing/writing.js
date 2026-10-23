const _ap=Element.prototype.append;Element.prototype.append=function(...k){_ap.apply(this,k.flat().filter(x=>x!==false&&x!=null))};
const _h=window.h;window.h=(t,a,...k)=>{const html=a&&a.innerHTML;if(a&&'innerHTML' in a){a={...a};delete a.innerHTML}const e=_h(t,a,...k.flat(Infinity).filter(x=>x!==false&&x!=null));if(html!=null)e.innerHTML=html;return e};
const clone=o=>JSON.parse(JSON.stringify(o));
const A=t=>`<span class="p-a" data-p="ai">${t}</span>`,C=t=>`<span class="p-c" data-p="creator" title="Your words. Protected: AI changes are held for your approval.">${t}</span>`,
 I=t=>`<span class="p-i" data-p="imported" title="Imported from your upload. Protected like your own words.">${t}</span>`,AE=t=>`<span class="p-ae" data-p="ai_edited">${t}</span>`;
const txt=html=>{const d=document.createElement('div');d.innerHTML=html;return d.textContent};
const fresh=()=>({page:'treatment',skipT:false,bypassB:false,gen:'idle',count:3,opts:[],open:0,chosen:null,viewOpts:false,compare:false,upload:false,paras:null,versions:[],preview:null,
 held:null,notes:[],regenScope:'whole',regenMode:'keep',useNotes:false,guidance:'',beats:clone(BEATS),beatAlt:null,drift:false,sideOpen:true,panel:null,alts:null,
 accepted:false,locked:false,sheet:false,choice:null,adds:{ai1:0,ai2:0,ai3:0,ai4:0},sideM:true,beatsExist:true,ticketN:0,syncDone:false});
const S=Object.assign(fresh(),{prov:false,var:{opts:'pager',regen:'dock',sync:'bar'}});
let timer;
function commit(cause,label){const last=S.versions[S.versions.length-1];if(cause==='Edit'&&last&&last.cause==='Edit'){last.paras=[...S.paras];return}S.versions.push({cause,label:label||'',paras:[...S.paras],at:S.versions.length})}
function restore(i,cause='Restore'){S.paras=[...S.versions[i].paras];commit(cause,'from version '+(i+1));S.preview=null}
function snap(){return clone({paras:S.paras,vl:S.versions,beats:S.beats,held:S.held&&{...S.held,apply:null},hold:S.held})}
function chooseOpt(i){const o=S.opts[i];S.paras=o.paras.map(A);S.chosen=i;S.viewOpts=false;commit(S.versions.length?'Chosen from option':'Chosen from option','chosen from '+o.name);S.drift=false}
function seed(name){clearTimeout(timer);const keep={prov:S.prov,var:S.var};Object.assign(S,fresh(),keep);S.page='treatment';
 const withChosen=(i)=>{S.opts=OPTS.map(clone);chooseOpt(i)};
 const edited=()=>{withChosen(1);const v1=[...S.paras];S.paras[1]=C(MY1)+A(MY1B);const v2=[...S.paras];S.paras[2]=AE('Mid-channel the engine fails. In the dark they argue, and the case is opened: letters from every island family, unsent for decades.');const v3=[...S.paras];
  S.paras[3]=A('Marit rows the stranger the last mile by hand. ')+C(MY3);S.versions=[{cause:'Chosen from option',label:'chosen from Last Ferry',paras:v1},{cause:'Edit',label:'',paras:v2},{cause:'AI rewrite',label:'one passage',paras:v3},{cause:'Edit',label:'',paras:[...S.paras]}];S.notes=clone(NOTES0)};
 const heldFn=()=>{S.held={i:3,from:'Marit rows the stranger the last mile by hand. '+MY3,to:BEATS[4].treatNew,why:'Update Treatment to match Beat Sheet',tail:''}};
 switch(name){
 case 'entry':goPage('treatment');break;
 case 'ticket':S.gen='ticket';S.ticketN=12;break;
 case 'options':S.opts=OPTS.map(clone);break;
 case 'compare':S.opts=OPTS.map(clone);S.compare=true;break;
 case 'single':S.count=1;S.opts=[clone(OPTS[1])];break;
 case 'upload':S.upload=true;S.paras=OPTS[0].paras.map(I);S.versions=[{cause:'Import',label:'treatment.docx, designated in Input',paras:[...S.paras]}];break;
 case 'edited':edited();break;
 case 'held':edited();heldFn();break;
 case 'history':edited();S.panel='versions';S.preview=1;break;
 case 'skipped':S.skipT=true;break;
 case 'drift':edited();S.page='beats';S.drift=true;break;
 case 'heldsync':edited();S.page='beats';S.drift=true;break;
 case 'master':edited();S.page='master';S.drift=true;break;
 case 'accept':edited();S.page='master';S.drift=true;S.sheet=true;break;
 case 'accepted':edited();S.page='beats';S.accepted=true;S.locked=true;S.choice='beats';break;
 case 'bypassed':edited();S.page='beats';S.bypassB=true;S.beatsExist=false;break}
 S.scn=name;render()}
function goPage(p){S.page=p;S.sheet=false;S.preview=null;if(S.panel==='versions'&&p==='master')S.panel=null;
 if(p==='treatment'&&!S.skipT&&!S.chosen&&S.chosen!==0&&!S.opts.length&&!S.upload&&!S.paras&&S.gen==='idle'){startGen()}render()}
function startGen(){if(S.gen==='running')return;S.gen='running';render();timer=setTimeout(()=>{S.opts=OPTS.slice(0,S.count).map(clone);S.open=0;S.gen='idle';render()},2600)}
function newAlt(guid){S.gen='running';render();timer=setTimeout(()=>{const n=S.opts.length;const a=clone(ALTS[(n-S.count>=0?n-S.count:0)%ALTS.length]);a.id='N'+n;S.opts.push(a);S.open=S.opts.length-1;S.gen='idle';S.viewOpts=S.chosen!=null?false:S.viewOpts;
 if(S.chosen!=null){toast('Added a new alternative. It is under “Other options”.')}else render();render()},1300)}

/* ---------- shell ---------- */
function strip(){return h('div',{class:'strip'},h('span',{class:'brand'},'AIUTEUR'),h('span',{class:'proj'},'Salt Line'),h('span',{class:'sp'}),h('span',{class:'sm'},'Spend this project $'+(S.opts.length?'0.18':'0.00')),h('div',{class:'meter'},h('i',{style:'width:'+(S.opts.length?'4%':'0')})))}
function status(k){
 if(k==='t')return S.skipT?['skip','skipped by you']:S.accepted?['done','development history']:S.chosen!=null||S.paras?['done','']:S.opts.length?['prog','']:['', ''];
 if(k==='b')return S.bypassB?['skip','bypassed']:S.accepted?['done','development history']:S.page==='beats'?['prog','']:['done',''];
 return S.accepted?['done',S.locked?'locked':'accepted']:['prog','']}
function outline(){const row=(lbl,p,k,sub)=>{const[d,s]=k?status(k):['done',''];return h('a',{class:(sub?'sub ':'')+(S.page===p?'on ':'')+(d==='skip'?'muted':''),onclick:()=>p&&goPage(p)},h('i',{class:'dot '+d}),lbl,s&&h('span',{class:'st'},s))};
 const cb=(lbl,f)=>h('button',{class:S.scn===f?'on':'',onclick:()=>seed(f)},lbl);
 const vsel=(lbl,key,vals)=>h('div',{class:'v'},h('span',{},lbl),...vals.map(v=>h('button',{class:S.var[key]===v?'on':'',onclick:()=>{S.var[key]=v;S.panel=S.panel==='regen'?null:S.panel;render()}},v)));
 return h('div',{class:'outline'},h('h6',{},'Project'),row('Input',null),row('Interview',null),h('h6',{},'Story'),row('Treatment','treatment','t'),row('Beat Sheet','beats','b'),row('Master Narrative','master','m'),h('h6',{},'Later'),h('a',{class:'muted'},h('i',{class:'dot'}),'Visual Direction (optional)'),
 h('div',{class:'ctl'},h('h6',{},'Prototype controls · states'),
 h('div',{class:'g'},cb('1 first entry','entry'),cb('exceptional spend','ticket'),cb('2 options ready','options'),cb('compare','compare'),cb('single option','single'),cb('upload-designated','upload'),cb('3 edited+protected','edited'),cb('4 held approval','held'),cb('5 drift','drift'),cb('6 Master Narr.','master'),cb('7 acceptance sheet','accept'),cb('8 history','history'),cb('after acceptance','accepted'),cb('Treatment skipped','skipped'),cb('Beat Sheet bypassed','bypassed')),
 h('h6',{},'Directions'),vsel('Options','opts',['pager','strip','compare']),vsel('Regen','regen',['dock','margin']),vsel('Sync','sync',['bar','inline']),
 h('div',{class:'v'},h('span',{},'Settings n'),h('button',{onclick:()=>{S.count=S.count===3?1:3;toast('Settings → options per draft: '+S.count+' (affects future drafting only)')}},'toggle 3/1'))))}
function main(){return h('div',{class:'main'},S.page==='treatment'?treatmentPage():S.page==='beats'?beatsPage():masterPage())}
function render(){const app=$('#app');const sc=$('.center');const st=sc?sc.scrollTop:0;app.replaceChildren(strip(),outline(),main());document.body.classList.toggle('prov',S.prov);const c=$('.center');if(c)c.scrollTop=st}

/* ---------- shared bits ---------- */
const provToggle=()=>h('button',{class:S.prov?'on':'',onclick:()=>{S.prov=!S.prov;render()}},'Highlight AI vs mine');
const legend=()=>S.prov&&h('span',{class:'legend'},h('span',{},h('i',{style:'background:#7aa7e0'}),'AI'),h('span',{},h('i',{style:'background:var(--ok)'}),'AI-edited'),h('span',{},h('i',{style:'background:var(--accent)'}),'mine / imported'));
const devNote=(doc)=>S.accepted&&h('div',{class:'banner'},h('span',{class:'dim'},'Development history. The Master Narrative is accepted, so this '+doc+' is no longer kept in sync. It stays viewable and editable.'),h('span',{class:'sp'}),h('button',{onclick:()=>{toast('Regenerated from the Master Narrative as a new version (Keep my edits)',()=>{})}},'Regenerate from the Master Narrative'));
const drifts=()=>S.beats.filter(b=>b.drift);
function attrChips(o){return h('div',{class:'attrs'},...Object.entries(o.attrs).map(([k,v])=>h('span',{class:'chip',title:k==='Est. runtime'?'An estimate, not a promise. AI-made label.':'AI-made label, not document text'},h('em',{},k+' '),h('b',{},v))))}

/* ---------- Treatment page ---------- */
function treatmentPage(){
 const inDoc=S.paras&&!S.viewOpts;const margin=S.var.regen==='margin';
 let panel=S.panel;if(inDoc&&panel===null&&margin)panel='regen';if(!inDoc||panel==='none')panel=panel==='versions'||panel==='notes'?panel:null;if(!margin&&panel==='regen')panel=null;
 const body=h('div',{class:'cpad'});
 body.append(h('div',{class:'ttl'},h('h2',{},'Treatment'),S.chosen!=null&&S.paras&&h('span',{class:'chip ok'},'chosen from '+(S.versions[0].label.replace('chosen from ','')||'option')),S.upload&&h('span',{class:'chip sel'},'Imported · your own text'),
  inDoc&&h('div',{class:'tools'},provToggle(),h('button',{class:panel==='notes'?'on':'',onclick:()=>{S.panel=panel==='notes'?'none':'notes';render()}},'Notes'+(S.notes.length?' · '+S.notes.length:'')),h('button',{class:panel==='versions'?'on':'',onclick:()=>{S.panel=panel==='versions'?'none':'versions';S.preview=null;render()}},'Versions'),margin&&h('button',{class:panel==='regen'?'on':'',onclick:()=>{S.panel=panel==='regen'?'none':'regen';render()}},'Regenerate')),legend()));
 body.append(h('p',{class:'phase'},'The Treatment tells your story in prose before it is broken into beats. It is optional: you can skip it or write straight to the Beat Sheet.'));
 if(S.skipT){body.append(h('div',{class:'intent'},h('b',{},'Skipped by you.'),' Your project continues without a Treatment, and nothing is drafted for it. If you change your mind, you can write one or ask for drafts.',h('div',{class:'row',style:'margin-top:12px'},h('button',{onclick:()=>{S.skipT=false;startGen()}},'Draft treatment options'),h('button',{class:'ghost',onclick:()=>{S.skipT=false;S.paras=[A('')];render()}},'Write it myself'))));return layout(body,null)}
 if(S.gen==='ticket'){body.append(h('div',{class:'ticket block'},h('span',{},'This request would start ',h('b',{},'12 generations'),' (about ',h('b',{},'$2.40'),'). Large requests need your say-so first.'),h('button',{class:'primary',onclick:()=>{S.gen='idle';startGen()}},'Start'),h('button',{onclick:()=>{S.gen='idle';render()}},'Not now')),h('div',{class:'faint'},'Ordinary drafting (about $0.18 for the default count) never shows this ticket; it starts on entry with no price UI.'));return layout(body,null)}
 if(S.gen==='running'){body.append(h('div',{class:'dim',style:'margin:10px 0 16px'},S.opts.length?'Writing another take…':'Writing treatments from your inputs…'),h('div',{class:'skel',style:'width:92%'}),h('div',{class:'skel',style:'width:84%'}),h('div',{class:'skel',style:'width:96%'}),h('div',{class:'skel',style:'width:60%'}),h('div',{class:'skel',style:'width:90%;margin-top:26px'}),h('div',{class:'skel',style:'width:78%'}));return layout(body,null)}
 if(!inDoc){optionsUI(body);return layout(body,null)}
 // document view
 if(S.preview!=null){const v=S.versions[S.preview];body.append(h('div',{class:'banner'},h('b',{},'Previewing version '+(S.preview+1)),h('span',{class:'dim'},v.cause+(v.label?' · '+v.label:'')),h('span',{class:'sp'}),h('button',{class:'primary',onclick:()=>{const i=S.preview;restore(i);render();toast('Restored. Added as a new current version.',()=>{restore(S.versions.length-2,'Restore');render()})}},'Restore this version'),h('button',{onclick:()=>{S.preview=null;render()}},'Back to current')))}
 body.append(devNote('Treatment'));
 if(S.viewOpts==false&&S.opts.length>1&&S.chosen!=null&&!S.accepted&&S.preview==null)body.append(h('div',{class:'quietline'},h('a',{class:'faint',style:'cursor:pointer',onclick:()=>{S.viewOpts=true;render()}},'Other options ('+(S.opts.length-1)+')')));
 if(!S.accepted&&S.beatsExist&&S.drift&&S.preview==null)body.append(h('div',{class:'quietline'},h('i',{class:'whisper','aria-label':'Treatment and Beat Sheet differ'}),h('span',{},drifts().length+' places differ from the Beat Sheet'),h('button',{class:'ghost',onclick:()=>{syncBeatsFromT()}},'Update Beat Sheet from Treatment')));
 body.append(docEl(S.preview!=null?S.versions[S.preview].paras:S.paras,S.preview!=null));
 if(!S.accepted&&inDoc&&S.preview==null&&!margin)body.append(regenBox('dock'));
 if(S.preview==null&&!margin){}
 return layout(body,panel)}
function layout(body,panel){return h('div',{class:'wrap'},h('div',{class:'center'},body),panel&&slot(panel))}
function slot(panel){
 const close=h('button',{class:'ghost',onclick:()=>{S.panel='none';S.preview=null;render()}},'✕');
 const el=h('div',{class:'slot'});
 if(panel==='regen'){el.append(h('div',{class:'sh'},h('b',{},'Regenerate'),h('span',{class:'sp'}),close),h('div',{class:'sb'},regenBox('vertical')))}
 else if(panel==='notes'){el.append(h('div',{class:'sh'},h('b',{},'Notes'),h('span',{class:'faint'},'not part of the text'),h('span',{class:'sp'}),close),h('div',{class:'sb'},...S.notes.map((n,k)=>h('div',{class:'note'},h('small',{},'On paragraph '+(n.i+1)),n.t,h('div',{style:'margin-top:4px'},h('button',{class:'ghost',onclick:()=>{const r=S.notes.splice(k,1)[0];render();toast('Note retired',()=>{S.notes.splice(k,0,r);render()})}},'Retire')))),
  h('div',{class:'col'},h('textarea',{id:'newnote',rows:2,placeholder:'Add a note. It stays out of the text and out of the AI’s context.'}),h('div',{class:'row'},h('select',{id:'noteP'},...[0,1,2,3].map(i=>h('option',{value:i},'Paragraph '+(i+1)))),h('button',{onclick:()=>{const t=$('#newnote').value.trim();if(t){S.notes.push({i:+$('#noteP').value,t});render()}}},'Add note'))),h('p',{class:'faint'},'Notes are never sent to the AI unless “Use my notes” is ticked on a regeneration request.')))}
 else{el.append(h('div',{class:'sh'},h('b',{},'Versions'),h('span',{class:'faint'},'linear, uncapped'),h('span',{class:'sp'}),close),
  ...[...S.versions].map((v,i)=>({v,i})).reverse().map(({v,i})=>h('div',{class:'vitem'+(S.preview===i?' on':''),onclick:()=>{if(S.page==='treatment'){S.preview=S.preview===i?null:i;render()}else toast('Preview works as on the Treatment page: in place, read-only, with Restore.')}},h('div',{class:'c'},'v'+(i+1)+' · '+v.cause),h('small',{},[v.label,i===S.versions.length-1?'current':''].filter(Boolean).join(' · ')))))}
 return el}

/* options UI: three presentation directions */
function optionsUI(body){
 const n=S.opts.length,single=n===1;S.open=Math.min(S.open,n-1);const o=S.opts[S.open];const cmp=!single&&(S.var.opts==='compare'||S.compare);
 const useLabel=single?'Use this treatment':'Choose this one';
 if(S.viewOpts&&S.paras)body.append(h('div',{class:'banner'},h('span',{class:'dim'},'Choosing another option replaces the current Treatment as a new version. The current one stays in Versions.'),h('span',{class:'sp'}),h('button',{onclick:()=>{S.viewOpts=false;render()}},'Back to my Treatment')));
 const choose=i=>()=>{chooseOpt(i);render();toast('Treatment chosen. The other options stay recoverable.')};
 const newAltBtn=h('button',{class:'ghost',onclick:()=>{S.regenScope='alt';$('#alt-box').style.display='block';$('#alt-box input').focus()}},'New alternative');
 const altBox=h('div',{id:'alt-box',style:'display:none;margin-bottom:14px'},regenBox('alt'));
 if(cmp){body.append(h('div',{class:'cols',style:`grid-template-columns:repeat(${n},1fr)`},...S.opts.map((x,i)=>h('div',{class:'card col1'},h('div',{class:'nm',style:'font-weight:600'},x.name),h('div',{class:'dim'},x.summary),attrChips(x),h('div',{class:'ex'},...x.paras.map(p=>h('p',{style:'margin:0 0 8px'},p))),h('button',{class:'primary',onclick:choose(i)},useLabel)))),h('div',{class:'row'},newAltBtn,S.var.opts!=='compare'&&h('button',{class:'ghost',onclick:()=>{S.compare=false;render()}},'Back to one at a time')),altBox);return}
 if(S.var.opts==='strip'&&!single){body.append(h('div',{class:'cards',style:`grid-template-columns:repeat(${Math.min(n,4)},1fr)`},...S.opts.map((x,i)=>h('div',{class:'ocard'+(i===S.open?' on':''),onclick:()=>{S.open=i;render()}},h('div',{class:'nm'},x.name),h('p',{},x.summary),attrChips(x)))))}
 else{if(!single)body.append(h('div',{class:'sw'},h('button',{class:'ghost',disabled:S.open===0,onclick:()=>{S.open--;render()}},'‹'),h('span',{},'Option '+(S.open+1)+' of '+n),h('button',{class:'ghost',disabled:S.open===n-1,onclick:()=>{S.open++;render()}},'›'),h('span',{class:'t'},'|'),...S.opts.map((x,i)=>h('button',{class:'nm'+(i===S.open?' on':''),onclick:()=>{S.open=i;render()}},x.name)),h('span',{class:'sp'}),h('button',{class:'ghost',onclick:()=>{S.compare=true;render()}},'Compare side by side')));
  body.append(h('div',{class:'card ohead'},h('div',{class:'nm'},o.name),h('p',{},o.summary),attrChips(o)))}
 const hd=h('div',{class:'doc'},...o.paras.map((p,i)=>h('div',{class:'para'},h('div',{class:'pt p-a',contenteditable:'true',onblur:e=>{o.paras[i]=e.target.textContent}},p))));
 body.append(hd,h('div',{class:'actrow'},h('button',{class:'primary',onclick:choose(S.open)},useLabel),newAltBtn,h('span',{class:'faint'},'Unchosen options stay editable and recoverable.')),altBox);
}

/* document element */
function docEl(paras,isPreview){const doc=h('div',{class:'doc'});
 paras.forEach((p,i)=>{const cur=S.paras[i];const diff=isPreview&&p!==cur;const nn=S.notes.filter(n=>n.i===i).length;
  const pt=h('div',{class:'pt','data-i':i,contenteditable:isPreview?'false':'true',onblur:e=>{if(isPreview)return;const html=e.target.innerHTML;if(html!==S.paras[i]){S.paras[i]=html;commit('Edit')}},onmouseup:()=>!isPreview&&checkSel(i)});pt.innerHTML=p;
  const box=h('div',{class:'para'+(diff?' diff':'')},pt,h('div',{class:'pm'},nn?h('button',{style:'opacity:1',title:nn+' note(s)',onclick:()=>{S.panel='notes';render()}},'✎'+nn):h('button',{title:'Add a note',onclick:()=>{S.panel='notes';render();setTimeout(()=>{$('#noteP').value=i;$('#newnote').focus()},0)}},'+ note')));
  if(diff)box.append(h('div',{class:'quiet',style:'font-family:var(--font);font-size:11.5px'},'Differs from current · ',h('button',{class:'ghost',onclick:()=>{S.paras[i]=p;S.preview=null;commit('Restore','passage '+(i+1)+' from version '+(S.preview==null?'':''));render();toast('Passage brought back. Everything else is untouched.')}},'Bring this passage back')));
  if(!isPreview&&S.held&&S.held.i===i)box.append(heldEl());
  if(!isPreview&&S.alts&&S.alts.i===i)box.append(h('div',{class:'alts'},h('div',{class:'faint'},'Alternatives for the selection. Nothing changes until you use one.'),...S.alts.items.map(t=>h('div',{class:'a'},h('span',{},t),h('button',{onclick:()=>applyReplace(i,S.alts.from,t)},'Use this'))),h('button',{class:'ghost',style:'align-self:flex-start',onclick:()=>{S.alts=null;render()}},'Dismiss')));
  doc.append(box)});return doc}
function heldEl(){const x=S.held;return h('div',{class:'held'},h('div',{},h('b',{},'Held for your approval'),' · '+x.why+' would change your own words.'),h('div',{class:'cmp'},h('div',{},h('small',{},'Yours now'),x.from),h('div',{},h('small',{},'Proposed'),x.to)),h('div',{class:'row'},h('button',{class:'primary',onclick:()=>{const p=snap();S.paras[x.i]=AE(x.to)+(x.tail||'');commit('AI rewrite','approved held change');S.held=null;S.beats.forEach(b=>{if(b.heldNote){b.drift=false;b.heldNote=false}});render();toast('Used. Added as a new version.',()=>{S.paras=p.paras;S.versions=p.vl;render()})}},'Use it'),h('button',{onclick:()=>{S.held=null;render()}},'Adjust by hand'),h('button',{class:'ghost',onclick:()=>{S.held=null;render();toast('Discarded. Your text is unchanged.')}},'Discard')))}

/* selection rewrite */
let selBar;
function checkSel(i){setTimeout(()=>{selBar?.remove();const s=getSelection();if(!s||s.isCollapsed||!s.toString().trim())return;const r=s.getRangeAt(0).cloneRange(),text=s.toString(),rect=r.getBoundingClientRect();
 const ins=h('input',{type:'text',placeholder:'Instruction (optional)',style:'width:190px'});
 const go=(many)=>()=>{selBar.remove();rewrite(i,r,text,ins.value,many)};
 selBar=h('div',{class:'toast',style:`top:${Math.max(50,rect.top-52)}px;left:${Math.min(rect.left+100,innerWidth-380)}px;bottom:auto;transform:none;padding:6px 8px;gap:6px`,onmousedown:e=>e.stopPropagation()},ins,h('button',{class:'primary',onclick:go(false)},'Rewrite'),h('button',{onclick:go(true)},'Several alternatives'));document.body.append(selBar)},10)}
document.addEventListener('mousedown',e=>{if(selBar&&!selBar.contains(e.target)){selBar.remove();selBar=null}});
const RW=['The ferry’s last crossing carries more than passengers.','Fog sits low on the water, and Marit steers by memory alone.','She knows every swell of this channel by its sound.'];
function rewrite(i,r,text,instr,many){
 const prot=!!(r.cloneContents().querySelector('.p-c,.p-i')||r.startContainer.parentElement.closest('.p-c,.p-i'));
 const out=RW[Math.floor(Math.random()*RW.length)];
 if(many){S.alts={i,from:text,items:RW};render();return}
 if(prot){S.held={i,from:text,to:out,why:'Your selected rewrite',tail:''};S.held.partial=true;render();return}
 applyReplace(i,text,out,instr)}
function applyReplace(i,from,to,instr){const p=snap();const html=S.paras[i];const t=txt(html);const idx=t.indexOf(from);
 if(S.held&&S.held.partial){}
 S.paras[i]=idx>=0&&!/<span[^>]*p-c/.test(html)?html.includes(from)?html.replace(from,'</span>'+AE(to)+'<span class="p-a" data-p="ai">'):A(t.slice(0,idx))+AE(to)+A(t.slice(idx+from.length)):AE(to)+A('');
 S.alts=null;commit('AI rewrite','one passage');render();toast('Rewrote selection'+(instr?' · “'+instr+'”':''),()=>{S.paras=p.paras;restore(S.versions.length-2,'Restore');render()})}

/* regeneration box (dock, vertical, alt) */
function regenBox(mode){
 const sel=getSelection&&!getSelection().isCollapsed;const scope=mode==='alt'?'alt':S.regenScope==='alt'?'whole':S.regenScope;
 const seg=mode==='alt'?null:h('div',{class:'seg'},h('button',{class:scope==='alt'?'on':'',onclick:()=>{S.regenScope='alt';render()}},'New alternative'),h('button',{class:scope==='whole'?'on':'',onclick:()=>{S.regenScope='whole';render()}},'Whole document'),h('button',{class:scope==='sel'?'on':'',title:'Highlight text in the document first',onclick:()=>{toast('Highlight a passage in the document, then choose Rewrite.')}},'Selected passage'));
 const g=h('input',{type:'text',placeholder:scope==='alt'?'What should change, or what did earlier options misunderstand? (optional)':'Tell it what to change (optional)',value:S.guidance,oninput:e=>S.guidance=e.target.value});
 const notesTick=h('label',{},h('input',{type:'checkbox',checked:S.useNotes,onchange:e=>{S.useNotes=e.target.checked;render()}}),'Use my notes');
 const go=()=>{const gd=S.guidance;S.guidance='';
  if(scope==='alt'){newAlt(gd);return}
  const p=snap();const base=S.chosen!=null?S.chosen:0;const rep=S.opts[(base+1)%Math.max(S.opts.length,1)]||OPTS[0];
  S.paras=S.paras.map((x,i)=>S.regenMode==='keep'&&/p-c|p-i/.test(x)?x:A(rep.paras[i]));commit('AI draft',S.regenMode==='keep'?'whole document, kept my edits':'whole document, replaced everything');render();
  toast('Regenerated the whole document'+(S.regenMode==='keep'?' (your words kept)':'')+(S.useNotes?' · sent '+S.notes.length+' notes':''),()=>{S.paras=p.paras;restore(S.versions.length-2,'Restore');render()})};
 const kids=[];if(seg)kids.push(seg);
 kids.push(h('div',{class:'row'},g,h('button',{class:'primary',onclick:go},scope==='alt'?'Add alternative':'Regenerate')));
 if(scope==='whole')kids.push(h('div',{class:'opts'},h('label',{},h('input',{type:'radio',name:'rm',checked:S.regenMode==='keep',onchange:()=>{S.regenMode='keep'}}),'Keep my edits'),h('label',{},h('input',{type:'radio',name:'rm',checked:S.regenMode==='replace',onchange:()=>{S.regenMode='replace'}}),'Replace everything (old text stays in Versions)'),notesTick));
 else if(scope==='alt')kids.push(h('div',{class:'opts'},notesTick));
 if(S.useNotes&&scope!=='sel')kids.push(h('div',{class:'quiet'},'Will send '+S.notes.length+' notes with this request only: '+S.notes.map(n=>'¶'+(n.i+1)).join(', ')));
 if(mode==='dock'){return h('div',{class:'regen dock'},h('div',{class:'box'},...kids))}
 return h('div',{class:'regen'+(mode==='vertical'?' vert':'')},...kids)}

/* ---------- Beat Sheet ---------- */
function syncSnap(){return clone({beats:S.beats,paras:S.paras,vl:S.versions,held:S.held&&{...S.held},drift:S.drift})}
function undoSync(p){S.beats=p.beats;S.paras=p.paras;S.versions=p.vl;S.held=null;S.drift=p.drift;render()}
function syncTreatmentToBeats(only){const p=syncSnap();let upd=0,held=0;S.beats.forEach((b,i)=>{if(!b.drift||(only!=null&&only!==i))return;
  if(/p-c|p-i/.test(S.paras[b.link])){held++;S.held={i:b.link,from:txt(S.paras[b.link]),to:b.treatNew,why:'Update Treatment to match Beat Sheet',tail:''};b.heldNote=true}else{S.paras[b.link]=AE(b.treatNew);b.drift=false;upd++}});
 if(upd)commit('Sync','Treatment matched to Beat Sheet');S.drift=drifts().length>0;render();toast(upd+' passage'+(upd===1?'':'s')+' updated'+(held?' · '+held+' held for your approval on the Treatment page':''),()=>undoSync(p))}
function syncBeatsFromT(only){const p=syncSnap();S.beats.forEach((b,i)=>{if(b.drift&&(only==null||only===i)){b.t=b.fromT;b.prov='ae';b.drift=false}});S.drift=drifts().length>0;render();toast('Beat Sheet updated from the Treatment',()=>undoSync(p))}
function keepBoth(only){S.beats.forEach((b,i)=>{if(b.drift&&(only==null||only===i))b.drift=false});S.drift=drifts().length>0;render();toast('Kept both as they are. No text changed.')}
function beatsPage(){
 const margin=false;const body=h('div',{class:'cpad'});const dr=!S.accepted&&S.drift;const n=drifts().length;
 const panel=S.panel==='versions'?'versions':S.sideOpen?'side':'rail';
 body.append(h('div',{class:'ttl'},h('h2',{},'Beat Sheet'),h('div',{class:'tools'},provToggle(),h('button',{class:panel==='versions'?'on':'',onclick:()=>{S.panel=S.panel==='versions'?null:'versions';render()}},'Versions')),legend()),
  h('p',{class:'phase'},'The Beat Sheet is your story as ordered beats. Edit them directly; the Treatment sits alongside for reference. Optional: skip it if you would rather not.'));
 if(S.bypassB){body.append(h('div',{class:'intent'},h('b',{},'Bypassed: covered by your screenplay.'),' Your screenplay became the Master Narrative, so beats were not needed. Nothing was drafted or spent.',h('div',{class:'row',style:'margin-top:12px'},h('button',{onclick:()=>{S.bypassB=false;S.beatsExist=true;toast('Beat Sheet filled from the Master Narrative as a new document',()=>{});render()}},'Fill it from the Master Narrative'))));return h('div',{class:'wrap'},h('div',{class:'center'},body))}
 body.append(devNote('Beat Sheet'));
 if(dr){const bar=h('div',{class:'syncbar'},h('i',{class:'whisper','aria-label':'Beat Sheet and Treatment differ'}),h('span',{class:'quiet'},n+' places differ from the Treatment'),h('span',{class:'sp'}),
  S.var.sync==='bar'?h('div',{class:'row',style:'flex-basis:100%;margin-top:4px'},h('button',{class:'primary',onclick:()=>syncTreatmentToBeats()},'Update Treatment to match Beat Sheet'),h('button',{class:'ghost',onclick:()=>syncBeatsFromT()},'Update Beat Sheet from Treatment'),h('button',{class:'ghost',onclick:()=>keepBoth()},'Keep both as they are')):h('button',{class:'primary',onclick:()=>syncTreatmentToBeats()},'Update Treatment to match Beat Sheet'));
  body.append(bar)}
 else if(!S.accepted)body.append(h('div',{class:'quietline faint'},'In step with the Treatment.'));
 const list=h('div',{});
 S.beats.forEach((b,i)=>{const row=h('div',{class:'beat','data-i':i},h('span',{class:'bn'},i+1),
  h('div',{class:'bt p-'+({ai:'a',creator:'c',ae:'ae'}[b.prov]),contenteditable:'true',onfocus:()=>{$$('.beat').forEach(x=>x.classList.toggle('on',+x.dataset.i===i));hlSide(b.link)},onblur:e=>{const t=e.target.textContent;if(t!==b.t){b.t=t;b.prov='creator';e.target.className='bt p-c'}}},b.t),
  (b.drift&&!S.accepted)&&h('i',{class:'whisper',style:'margin-top:8px',tabindex:0,title:b.heldNote?'Update held on the Treatment page for your approval':'Beat Sheet and Treatment differ here. Press an update action to bring them together; nothing changes on its own.','aria-label':'Differs from Treatment',onclick:()=>{b.open=!b.open;render()}}),
  h('div',{class:'btools'},h('button',{class:'ghost',title:'Move up',onclick:()=>move(i,-1)},'↑'),h('button',{class:'ghost',title:'Move down',onclick:()=>move(i,1)},'↓'),h('button',{class:'ghost',title:'Add a beat after',onclick:()=>{S.beats.splice(i+1,0,{t:'New beat',link:null,prov:'creator'});render()}},'+'),h('button',{class:'ghost',title:'Alternatives for this beat',onclick:()=>{S.beatAlt=S.beatAlt?.i===i?null:{i,items:['A quieter version: '+b.t.toLowerCase(),'Raise the stakes: '+b.t,'Cut to the consequence instead of the event.']};render()}},'✦'),h('button',{class:'ghost',title:'Retire this beat (recoverable)',onclick:()=>{const r=S.beats.splice(i,1)[0];render();toast('Beat retired',()=>{S.beats.splice(i,0,r);render()})}},'×')));
  list.append(row);
  if(b.drift&&!S.accepted&&(b.open||S.var.sync==='inline'))list.append(h('div',{class:'bsub'},b.heldNote?'Held on the Treatment page for your approval.':[h('span',{style:'flex-basis:100%'},'Treatment says: ',h('i',{},'“'+b.fromT+'”')),h('button',{class:'primary',onclick:()=>syncTreatmentToBeats(i)},'Update Treatment'),h('button',{onclick:()=>syncBeatsFromT(i)},'Update Beat'),h('button',{class:'ghost',onclick:()=>keepBoth(i)},'Keep both')]));
  if(b.link==null&&S.beatsExist&&!S.accepted)list.append(h('div',{class:'bsub p'},h('span',{class:'faint'},'No passage in the Treatment yet. '),h('button',{class:'ghost',onclick:()=>toast('Insertion only: a new passage would be added after paragraph 4. Nothing existing is touched.')},'Add the missing passage')));
  if(S.beatAlt?.i===i)list.append(h('div',{class:'alts',style:'margin-left:40px'},h('div',{class:'faint'},'Suggestions, not part of the Beat Sheet until you use one.'),...S.beatAlt.items.map(t=>h('div',{class:'a'},h('span',{style:'font-family:var(--font)'},t),h('button',{onclick:()=>{const old=b.t;b.t=t.replace(/^[^:]+: /,'');b.prov='ae';S.beatAlt=null;render();toast('Beat replaced. The old text is in history.',()=>{b.t=old;b.prov='creator';render()})}},'Use')))))});
 body.append(list,h('div',{style:'margin:10px 0 0 40px'},h('button',{class:'ghost',onclick:()=>{S.beats.push({t:'New beat',link:null,prov:'creator'});render()}},'+ Add a beat')));
 return h('div',{class:'wrap'},h('div',{class:'center'},body),panel==='versions'?slot('versions'):panel==='side'?refSide('Treatment',S.paras?S.paras.map((p,i)=>h('div',{class:'side-p','data-i':i,innerHTML:p})):[h('div',{class:'faint'},'No Treatment yet. Derive beats from the Input and Interview instead.')],()=>S.sideOpen=false):railBtn('Treatment',()=>S.sideOpen=true))}
function hlSide(l){$$('.side-p').forEach(x=>x.classList.toggle('hl',+x.dataset.i===l))}
function refSide(title,kids,close){return h('div',{class:'slot'},h('div',{class:'sh'},h('b',{},title),h('span',{class:'faint'},'reference · read-only'),h('span',{class:'sp'}),h('button',{class:'ghost',title:'Hide sidebar',onclick:()=>{close();render()}},'›')),h('div',{class:'sb'},...kids))}
function railBtn(t,open){return h('div',{class:'rail'},h('button',{title:'Show '+t,onclick:()=>{open();render()}},'‹ '+t))}
function move(i,d){const j=i+d;if(j<0||j>=S.beats.length)return;[S.beats[i],S.beats[j]]=[S.beats[j],S.beats[i]];render()}

/* ---------- Master Narrative ---------- */
function masterPage(){
 const body=h('div',{class:'cpad'});const total=SCENES.reduce((a,s)=>a+s.min,0);const pend=Object.values(S.adds).filter(v=>v===0).length;const dis=drifts().length;
 body.append(h('div',{class:'ttl'},h('h2',{},'Master Narrative'),S.accepted&&h('span',{class:'chip ok'},'Accepted'+(S.locked?' · 🔒 locked':'')),S.accepted&&S.locked&&h('button',{class:'ghost',onclick:()=>{S.locked=false;render();toast('Unlocked')}},'Unlock'),
  h('div',{class:'tools'},provToggle(),!S.accepted&&h('button',{class:'primary',onclick:()=>{S.sheet=true;render()}},'Accept Master Narrative')),legend()),
  h('div',{class:'row',style:'margin-bottom:12px;font-size:12px;color:var(--dim)'},h('span',{},'≈ '+total+' min of an intended 12'),h('div',{class:'meter',style:'width:100px'},h('i',{style:'width:'+total/12*100+'%'}))));
 if(!S.accepted&&dis&&!S.choice)body.append(h('div',{class:'ask'},h('div',{style:'margin-bottom:8px'},'Treatment and Beat Sheet differ in '+dis+' places. Which should the Master Narrative follow?'),h('div',{class:'row'},h('button',{onclick:()=>{S.choice='treatment';render()}},'Follow the Treatment'),h('button',{onclick:()=>{S.choice='beats';render()}},'Follow the Beat Sheet'),h('button',{onclick:()=>{goPage('beats')}},'Update first'))));
 else if(S.choice&&!S.accepted)body.append(h('div',{class:'quietline faint'},'Following the '+(S.choice==='beats'?'Beat Sheet':'Treatment')+'. Recorded as your decision. ',h('button',{class:'ghost',onclick:()=>{S.choice=null;render()}},'Change')));
 if(pend)body.append(h('div',{class:'quietline'},h('span',{},pend+' AI additions from converting your screenplay, not reviewed.'),h('button',{class:'ghost',onclick:()=>{Object.keys(S.adds).forEach(k=>{if(S.adds[k]===0)S.adds[k]=1});render()}},'Keep all'),h('span',{class:'faint'},'Optional. Never blocks accepting.')));
 const doc=h('div',{});SCENES.forEach((s,si)=>{const sc=h('div',{class:'scene','data-s':si,onclick:()=>{$$('.side-b').forEach(x=>x.classList.toggle('hl',s.beats.includes(+x.dataset.i)))}},h('div',{class:'sh2'},h('b',{},'SCENE '+(si+1)+' · '+s.h),h('span',{},'≈ '+s.min+' min · AI estimate')));
  s.ls.forEach(([k,t,id])=>{if(id&&S.adds[id]===2)return;const ai=id;sc.append(h('div',{class:'sc'+(k==='d'?' dl':'')+(ai?' ai':'')},ai&&h('span',{class:'aitag'},'AI added',S.adds[id]===0&&[h('button',{onclick:()=>{S.adds[id]=1;render()}},'Keep'),h('button',{onclick:()=>{S.adds[id]=2;render();toast('Removed. Recoverable.',()=>{S.adds[id]=0;render()})}},'Remove')],S.adds[id]===1&&h('span',{class:'faint'},' · kept')),h('span',{contenteditable:'true',style:'outline:none'},t)))});doc.append(sc)});
 body.append(doc);
 if(S.sheet)document.body.append(sheet());else $('.sheet')?.remove();
 return h('div',{class:'wrap'},h('div',{class:'center'},body),S.sideM?refSide('Beat Sheet',S.beats.map((b,i)=>h('div',{class:'side-b','data-i':i},(i+1)+'. '+b.t)),()=>S.sideM=false):railBtn('Beat Sheet',()=>S.sideM=true))}
function sheet(){$('.sheet')?.remove();const dis=drifts().length,pend=Object.values(S.adds).filter(v=>v===0).length;let lock=true;
 const el=h('div',{class:'sheet'},h('h3',{},'Accept Master Narrative'),
  dis&&!S.choice&&h('div',{},h('div',{style:'margin-bottom:6px'},'Treatment and Beat Sheet still differ in '+dis+' places. Which should this follow?'),h('div',{class:'row'},h('button',{onclick:()=>{S.choice='treatment';render()}},'Follow the Treatment'),h('button',{onclick:()=>{S.choice='beats';render()}},'Follow the Beat Sheet'),h('button',{onclick:()=>{S.sheet=false;goPage('beats')}},'Update first'))),
  dis&&S.choice&&h('div',{class:'dim'},'Following the '+(S.choice==='beats'?'Beat Sheet':'Treatment')+' (your decision, recorded).'),
  pend>0&&h('div',{class:'dim'},pend+' AI additions not reviewed · ',h('a',{style:'color:var(--sel);cursor:pointer',onclick:()=>{S.sheet=false;render()}},'review')),
  h('label',{class:'row'},h('input',{type:'checkbox',checked:true,onchange:e=>lock=e.target.checked}),'Lock'),
  h('div',{class:'one'},'Production is built from this. The Treatment and Beat Sheet become development history.'),
  h('div',{class:'row'},h('button',{class:'primary',onclick:()=>{S.accepted=true;S.locked=lock;S.sheet=false;S.drift=false;render();toast('Master Narrative accepted'+(lock?' and locked':''))}},'Accept'),h('button',{onclick:()=>{S.sheet=false;render()}},'Not yet')));
 return el}
const _r=render;render=function(){$('.sheet')?.remove();_r()};
const q=new URLSearchParams(location.search);if(q.get('v')){const[a,b,c]=q.get('v').split(',');S.var={opts:a||'pager',regen:b||'dock',sync:c||'bar'}}
seed(q.get('s')||'options');

/* Aiuteur V2 #62 — Candidate review & playback. Throwaway prototype: mock data, one state object, full re-render. */
(()=>{
const Q=new URLSearchParams(location.search);
const MODELS={kling:{n:'Kling 3',rate:.07,max:6},veo:{n:'Veo 4',rate:.40,max:8},wan:{n:'Wan 3',rate:.04,max:12},exp:{n:'Experimental X',rate:null,max:6}};
const $money=n=>'$'+n.toFixed(2);
const fmt=s=>{s=Math.max(0,s);return String(Math.floor(s/60)).padStart(2,'0')+':'+String(Math.floor(s%60)).padStart(2,'0')};
const q=s=>String(s).replace(/"/g,'&quot;');
let tid=0;const T=(n,model,dur,hue,o={})=>({id:'t'+(++tid),n,model,dur,hue,...o});

/* ---------- data ---------- */
const scenes=[];const ALL={};
const names=['Opening titles','Night train','Border post','Hotel lobby','The letter','Rain on the roof','The Harbour Office','Ferry crossing','Customs','Market','Chase','Rooftops','Safehouse','Interrogation','Dawn','Station','The offer','Bridge','Warehouse','Reckoning','Departure','Coda'];
function mk(id,no,target,o={}){const s={id,scene:no,target,model:'kling',takes:[],sel:null,...o};ALL[id]=s;return s}
function build7(){
 const L=[
  mk('7A',7,4,{name:'Fog over the quay',cont:'7B',takes:[T(1,'kling',4,28),T(2,'kling',4,38,{guided:'slower push-in'})],sel:null}),
  mk('7B',7,5,{name:'Office door',takes:[T(1,'kling',5,200),T(2,'kling',5,212),T(3,'kling',5,190,{override:1}),T(4,'wan',5,205,{rej:1})]}),
  mk('7C',7,6,{name:'Ledger close-up',takes:[T(1,'kling',6,340),T(2,'kling',6,352,{guided:'warmer lamp, shallower focus'}),T(3,'veo',6,322,{late:'arrived after cancel',fresh:1})]}),
  mk('7D',7,18,{name:'Long walk to the window',partial:{done:2,of:3},fail:{text:'Part 3 failed · may have been charged'}}),
  mk('7E',7,5,{name:'Reverse: the clerk'}),
  mk('7F',7,4,{name:'Telegram on desk',fail:{text:'Timed out · you may have been charged',timedOut:1}}),
  mk('7G',7,5,{name:'Lamp flicker',final:1,stale:'The Harbour Office Look changed',takes:[T(1,'kling',6.2,48)]}),
  mk('7H',7,6,{name:'Harbour from the window',takes:[T(1,'kling',6,160),T(2,'kling',6,172,{late:'arrived late',fromMerged:1,fresh:1})]}),
 ];
 L[0].sel=L[0].takes[1].id;L[1].sel=L[1].takes[0].id;L[6].sel=L[6].takes[0].id;return L;
}
function rng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function buildFilm(){
 for(let no=1;no<=22;no++){
  let shots;
  if(no===7)shots=build7();else{
   const r=rng(no*97),n=5+Math.floor(r()*7);shots=[];
   for(let i=0;i<n;i++){
    const tgt=3+Math.floor(r()*6)+(r()<.06?9:0),s=mk(no+'ABCDEFGHIJKL'[i],no,tgt,{name:'Shot '+(i+1)});
    const p=r(),k=no<4?0.12:no>16?0.35:0.22;
    if(p>k+0.12){const c=1+Math.floor(r()*3);for(let j=0;j<c;j++)s.takes.push(T(j+1,'kling',tgt,Math.floor(r()*360)));if(r()<.72)s.sel=s.takes[Math.floor(r()*c)].id}
    else if(p<0.04)s.fail={text:'Failed, not charged'};
    if(s.sel&&r()<.05)s.stale='Upstream pick changed';
    shots.push(s)}
  }
  scenes.push({no,name:names[no-1],shots});
 }
}
buildFilm();
const allShots=()=>scenes.flatMap(c=>c.shots);

/* ---------- state ---------- */
const S={variant:Q.get('v')||'A',scope:Q.get('scope')||'scene',scene:7,focus:'7C',t:0,playing:false,skipGaps:false,planned:false,speed:4,
 filter:'all',mode:'takes',view:'review',pins:[],cmp:false,ticket:null,capLeft:25,spent:3.4,failNext:false,log:[],inbox:false,
 guid:{},model:{},rejOpen:false,hl:0,lateQ:[],running:[],done:[],fr:null,frameFocus:null,lastFocusBeforeFix:null};
const sc=()=>scenes[S.scene-1];
const cur=()=>ALL[S.focus];
const act=s=>s.takes.filter(t=>!t.rej);
const selT=s=>s.takes.find(t=>t.id===s.sel&&!t.rej)||null;
const kind=s=>{if(selT(s))return'sel';if(s.gen)return'gen';if(!act(s).length)return s.partial||s.fail?'fail':s.cancelled?'cancelled':'missing';return'pick'};
const wt=s=>S.planned?s.target:(selT(s)?selT(s).dur:s.target);
const pdur=s=>selT(s)?selT(s).dur:2;
const modelOf=s=>S.model[s.id]||s.model;
function est(s,m=modelOf(s)){const M=MODELS[m],parts=Math.ceil(s.target/M.max);return{unknown:M.rate==null,total:M.rate==null?0:s.target*M.rate,parts}}
const seq=()=>(S.scope==='film'?allShots():sc().shots).filter(s=>!s.retired);
const log=m=>{S.log.unshift({m,at:fmt(S.spent*7+S.log.length*13)})};
const matches=(s,f=S.filter)=>f==='all'||(f==='pick'&&kind(s)==='pick')||(f==='missing'&&['missing','cancelled'].includes(kind(s)))||(f==='failed'&&(s.fail||s.partial)&&!s.gen)||(f==='stale'&&s.stale&&selT(s));
const counts=L=>({sel:L.filter(s=>kind(s)==='sel').length,pick:L.filter(s=>kind(s)==='pick').length,missing:L.filter(s=>['missing','cancelled'].includes(kind(s))).length,failed:L.filter(s=>(s.fail||s.partial)&&!s.gen).length,stale:L.filter(s=>s.stale&&selT(s)).length,gen:L.filter(s=>s.gen).length,n:L.length});
const runtime=L=>({plan:L.reduce((a,s)=>a+s.target,0),made:L.reduce((a,s)=>a+(selT(s)?selT(s).dur:s.target),0)});

/* ---------- rendering helpers ---------- */
function labels(t,s){const L=[];L.push(MODELS[t.model].n);if(t.guided)L.push(`<span title="${q(t.guided)}">guided</span>`);if(t.override)L.push('prompt overridden');
 if(Math.abs(t.dur-s.target)>.05)L.push(`${t.dur.toFixed(1)} s (planned ${s.target})`);if(t.fromMerged)L.push('from the merged shot');if(t.parts>1)L.push(t.parts+' parts');return L.join(' · ')}
function ticketHtml(key){const k=S.ticket;if(!k||k.key!==key)return'';
 const blocked=k.kind==='blocked';
 const r=[];if(k.total>=2)r.push(`Total ${$money(k.total)} is $2.00 or more`);if(k.count>=10)r.push(`${k.count} Takes (10 or more)`);if(k.unknown)r.push('A price is unavailable');if(k.bulk)r.push('Bulk regenerate by filter');
 if(blocked)r.push(`${$money(k.total)} is more than the ${$money(S.capLeft)} left of your cap`);
 const lg=Math.max(...k.items.map(i=>i.price));
 return`<div class="ticket ${blocked?'blocked':''}" data-ticket><div><b>${k.count} Take${k.count>1?'s':''} · ${k.unknown?'price unavailable':$money(k.total)}</b> <span class="dim">${k.count>1?'largest '+$money(lg)+' · ':''}${$money(S.capLeft)} left of today's cap</span><ul>${r.map(x=>`<li>${x}</li>`).join('')}</ul>
 <div class="tb">${blocked?`<button data-act="raise">Raise the cap for this action</button>${k.count>1?'<button data-act="trim">Trim the selection</button>':''}`:`<button class="primary" data-act="start">Start · ${k.unknown?'price unavailable':$money(k.total)}</button>`}<button class="ghost" data-act="notnow">Not now</button></div></div></div>`}
/* price on the initiating control; ticket replaces it in place */
function genBtn(s,key,o={}){
 if(s.gen)return`<span class="quiet">Generating${s.gen.parts>1?' · '+s.gen.parts+' parts':''}…</span> <button class="ghost" data-act="cancel" data-id="${s.id}">Cancel</button> <span class="hint">may still be charged up to about ${$money(est(s).total)}</span>`;
 if(S.ticket&&S.ticket.key===key)return ticketHtml(key);
 const e=est(s);let price=e.total,lab=o.label||'Generate';
 if(s.partial&&!o.label){price=e.total/e.parts;lab='Retry'}else if(s.fail&&!o.label)lab='Retry';else if(act(s).length&&!o.label)lab='Generate another';
 const pl=e.unknown?'price unavailable':$money(price);
 const extra=s.partial&&!o.label?` · part ${s.partial.done+1} of ${s.partial.of}`:e.parts>1?` · ${e.parts} parts`:'';
 return`<button class="${o.primary?'primary':''}" data-act="ask" data-id="${s.id}" data-key="${key}" ${o.label?`data-bulk="0"`:''}>${lab}<span class="price">${pl}${extra}</span></button>`}
const markHtml=s=>`${s.stale&&selT(s)?'<i class="whisper" title="Possibly out of date"></i>':''}${s.final?'<span class="fin" title="Marked final">🔒</span>':''}`;

/* ---------- views ---------- */
function strip(){const f=allShots();const c=counts(f),rt=runtime(f);const unread=f.filter(s=>(s.fail||s.partial)&&!s.gen).length;
 return`<div class="strip"><span class="brand">AIUTEUR</span><span class="dim">Harbour Lights</span><span class="dim">runtime ${fmt(rt.made)} as made · ${fmt(rt.plan)} planned</span><span class="sp"></span>
 ${S.running.length?`<span class="quiet">${S.running.length} generating</span>`:''}${c.stale?`<span class="quiet"><i class="whisper"></i> ${c.stale} possibly out of date</span>`:''}
 ${unread?`<button class="quietbtn" data-act="inbox">${unread} failed · see list</button>`:''}
 <span class="dim">today ${$money(S.spent)} · ${$money(S.capLeft)} left</span><div class="meter"><i style="width:${Math.min(100,S.spent/(S.spent+S.capLeft)*100)}%"></i></div></div>`+(S.inbox?inbox():'')}
function inbox(){const f=allShots();const fl=f.filter(s=>(s.fail||s.partial)&&!s.gen).slice(0,6);
 const nt=f.flatMap(s=>s.takes.filter(t=>t.fresh).map(t=>[s,t])).slice(0,5);
 return`<div class="inbox"><div class="row"><b>Unread</b><span class="sp"></span><button class="ghost" data-act="inbox">Close</button></div>
 ${fl.map(s=>`<div class="urow" style="cursor:default"><div class="tx"><span>${s.id} · ${(s.partial?s.partial.done+' of '+s.partial.of+' parts made · ':'')+(s.fail?s.fail.text:'')}</span></div><div>${genBtn(s,'in:'+s.id)} <button class="ghost" data-act="goto" data-id="${s.id}">Open</button></div></div>`).join('')||'<div class="dim">Nothing failed.</div>'}
 ${nt.map(([s,t])=>`<div class="urow" data-act="goto" data-id="${s.id}"><div class="tx"><span>${s.id} · T${t.n} ${t.late||'ready, not selected'}</span><span>Open</span></div></div>`).join('')}</div>`}
function outline(){const cur7=S.scene,sh=sc().shots;
 const link=(t,c='',sub='')=>`<a class="${c}">${t}</a>`;
 const dotk=s=>({sel:'done',pick:'prog',missing:'skip',fail:'skip',gen:'prog',cancelled:'skip'}[kind(s)]);
 return`<div class="outline"><h6>Story</h6>${['Input','Interview','Treatment','Beat Sheet','Master Narrative'].map(x=>link('<span class="dot done"></span>'+x)).join('')}
 <h6>World</h6>${link('<span class="dot done"></span>World Definition')}<h6>Scenes</h6>
 ${[5,6].map(n=>`<a data-act="scene" data-no="${n}"><span class="dot done"></span>${n} ${names[n-1]}</a>`).join('')}
 <a class="${S.scope==='scene'&&S.view==='review'?'on':''}" data-act="scene" data-no="${S.scope==='scene'?cur7:7}"><span class="dot prog"></span>${S.scope==='scene'?cur7+' '+names[cur7-1]:'7 The Harbour Office'}</a>
 ${S.scope==='scene'?sh.map(s=>`<a class="sub ${S.focus===s.id?'on':''}" data-act="goto" data-id="${s.id}"><span class="dot ${dotk(s)}"></span>${s.id} ${s.name}</a>`).join(''):''}
 <a class="muted">8 … 22 (15 more)</a><a class="muted" title="Not in the timeline (X5)">Ad-hoc shots</a><a class="muted" title="Not in the timeline (D52.4)">Removed from Story</a>
 <h6>Output</h6><a class="${S.scope==='film'?'on':''}" data-act="film">Review &amp; Export</a></div>`}
function proto(){const V=S.variant;const b=(v,l)=>`<button class="${V===v?'on':''}" data-act="variant" data-v="${v}">${l}</button>`;
 return`<div class="protobar"><b>prototype controls</b><span class="seg">${b('A','A · Strip + tray')}${b('B','B · Lanes under cells')}${b('C','C · Thin track + pinned')}</span>
 <span class="seg"><button class="${S.scope==='scene'?'on':''}" data-act="scopeset" data-s="scene">Scene</button><button class="${S.scope==='film'?'on':''}" data-act="scopeset" data-s="film">Whole film</button></span>
 <button class="tg ${S.mode==='frames'?'on':''}" data-act="mode">${S.mode==='frames'?'Reviewing frames':'Reviewing takes'}</button>
 <button data-act="late">Late result arrives</button><button class="tg ${S.failNext?'on':''}" data-act="failnext">Next generation fails${S.failNext?' ✓':''}</button>
 <button class="tg ${S.capLeft<1?'on':''}" data-act="caplow">Cap nearly reached</button><button data-act="reset">Reset</button></div>`}
function head(){const L=S.scope==='film'?allShots():sc().shots,c=counts(L),rt=runtime(L);
 const chip=(f,l,n)=>`<button class="${S.filter===f?'on':''}" data-act="filter" data-f="${f}">${l}${n!=null?' · '+n:''}</button>`;
 const miss=L.filter(s=>['missing','cancelled'].includes(kind(s)));const stl=L.filter(s=>s.stale&&selT(s));
 const mi=miss.map(s=>{const e=est(s,s.model);return{shot:s,price:e.total,unknown:e.unknown,parts:e.parts}});
 const si=stl.map(s=>{const e=est(s,s.model);return{shot:s,price:e.total,unknown:e.unknown,parts:e.parts}});
 const bt=(key,lab,items,bulk)=>{if(!items.length)return'';if(S.ticket&&S.ticket.key===key)return ticketHtml(key);const tot=items.reduce((a,i)=>a+i.price,0),unk=items.some(i=>i.unknown);
  return`<button data-act="batch" data-key="${key}" data-bulk="${bulk?1:0}">${lab} · ${items.length}<span class="price">${unk?'price unavailable':$money(tot)}</span></button>`};
 S._batch={b1:mi,b2:si};
 return`<div class="head"><h2>${S.scope==='film'?'Whole film':`Scene ${S.scene} · ${sc().name}`}</h2><span class="rt">${S.planned?'planned':'as made'} ${fmt(S.planned?rt.plan:rt.made)} · ${S.planned?'as made '+fmt(rt.made):'planned '+fmt(rt.plan)} · ${c.sel} of ${c.n} selected</span><span class="sp"></span>${bt('b1','Generate missing',mi,false)}${bt('b2','Regenerate out of date',si,true)}</div>
 <div class="head"><div class="fchips">${chip('all','All',c.n)}${chip('pick','Needs a pick',c.pick)}${chip('missing','Missing',c.missing)}${chip('failed','Failed',c.failed)}${chip('stale','Possibly out of date',c.stale)}${S.filter!=='all'?'<button class="ghost" data-act="nextmatch">Next match ›</button>':''}</div>
 <span class="sp"></span><div class="legend"><span><i style="background:var(--ok)"></i>picked</span><span><i style="background:var(--accent)"></i>needs a pick</span><span><i style="background:#3a3f4b"></i>missing</span></div></div>`}
function sbarFor(L){const c=counts(L),n=L.length||1;const p=(k,v)=>v?`<i class="s-${k}" style="flex:${v}"></i>`:'';return`<div class="sbar">${p('sel',c.sel)}${p('pick',c.pick)}${p('gen',c.gen)}${p('fail',c.failed-0)}${p('missing',c.missing-c.failed>0?c.missing-c.failed:0)}</div>`}
function sceneWeight(c){return c.shots.reduce((a,s)=>a+wt(s),0)}
function phFilm(){const tot=scenes.reduce((a,c)=>a+sceneWeight(c),0);let pre=0;for(const c of scenes){if(c.no===S.scene)break;pre+=sceneWeight(c)}return(pre+sceneFrac()*sceneWeight(sc()))/tot*100}
function sceneFrac(){const L=sc().shots,tot=L.reduce((a,s)=>a+wt(s),0);let pre=0;for(const s of L){if(s.id===S.focus){const d=pdur(s);return(pre+wt(s)*Math.min(1,S.t/d))/tot}pre+=wt(s)}return 0}
function sceneHasMatch(c){return S.filter==='all'||c.shots.some(s=>matches(s))}
function filmNav(){const V=S.variant;const rt=r=>fmt(r);
 if(V==='A')return`<div><div class="ribbon">${scenes.map(c=>`<div class="sc ${c.no===S.scene?'on':''} ${sceneHasMatch(c)?'':'dimmed'}" data-act="scene" data-no="${c.no}" style="flex:${sceneWeight(c)}" title="${c.no} ${c.name}"><b>${c.no}</b>${sbarFor(c.shots)}</div>`).join('')}<div class="ph" style="left:calc(6px + (100% - 12px)*${phFilm()/100})"></div></div>
 <div class="hint">Film ribbon: each block is a scene, width = runtime, bar = share of shots picked / needs a pick / missing. 22 scenes drawn, never 180 shots. Click a scene to open its timeline.</div></div>`;
 if(V==='C'){const idx=scenes.findIndex(c=>c.no===S.scene);return`<div><div class="row" style="margin-bottom:5px"><button class="ghost" data-act="prevscene">‹ Scene</button><span class="dim">Film ${fmt(scenes.slice(0,idx).reduce((a,c)=>a+sceneWeight(c),0))} / ${fmt(scenes.reduce((a,c)=>a+sceneWeight(c),0))}</span><button class="ghost" data-act="nextscene">Scene ›</button><span class="sp"></span><button class="ghost" data-act="nextmatch">Next unsettled shot ›</button></div>
 <div class="mini">${scenes.map(c=>`<div class="sc ${c.no===S.scene?'on':''} ${sceneHasMatch(c)?'':'dimmed'}" data-act="scene" data-no="${c.no}" style="flex:${sceneWeight(c)}" title="${c.no} ${c.name}">${sbarFor(c.shots)}</div>`).join('')}<div class="ph" style="left:${phFilm()}%"></div></div>
 <div class="minilab">${scenes.map(c=>`<span style="flex:${sceneWeight(c)}">${c.no}</span>`).join('')}</div></div>`}
 return''}
function rail(){return`<div class="hint" style="padding:0 12px 6px">Scenes · runtime · picks</div>${scenes.map(c=>{const cc=counts(c.shots);return`<div class="rrow ${c.no===S.scene?'on':''} ${sceneHasMatch(c)?'':'dimmed'}" data-act="scene" data-no="${c.no}"><div class="t"><b>${c.no}</b><span>${c.name}</span><i>${fmt(runtime(c.shots).made)}</i></div>${sbarFor(c.shots)}<div class="hint">${cc.sel}/${cc.n} picked${cc.pick?' · '+cc.pick+' pick':''}${cc.missing?' · '+cc.missing+' missing':''}</div></div>`}).join('')}`}

function viewer(){const s=cur(),t=selT(s),k=kind(s);const pct=Math.min(100,S.t/pdur(s)*100);
 let inner;
 if(S.mode==='frames')return frameViewer(s);
 if(t)inner=`<div class="clip" style="--h:${t.hue};--lx:${20+pct*.6}%"><div class="bars t"></div><div class="bars b"></div><div class="cap"><b>${s.id}</b> ${s.name} <small>T${t.n} · ${MODELS[t.model].n}</small> ${markHtml(s)}</div><div class="tc" id="vtime">${fmt(S.t)} / ${fmt(t.dur)}</div></div>`;
 else{const kk={pick:`<div class="big">${act(s).length} take${act(s).length>1?'s':''} · none picked</div><div class="sub">Playback shows selected takes only</div><div><button class="primary" data-act="pick">Pick</button></div>`,
  missing:`<div class="big">No take yet</div><div class="sub">${s.id} · ${s.name}</div><div>${genBtn(s,'slate',{primary:1})}</div>`,
  cancelled:`<div class="big">Cancelled</div><div class="sub">${s.id} · ${s.name}</div><div>${genBtn(s,'slate',{primary:1})}</div>`,
  gen:`<div class="big">Generating</div><div class="sub">${s.gen&&s.gen.parts>1?'part '+Math.min(s.gen.parts,1+Math.floor(s.gen.p*s.gen.parts))+' of '+s.gen.parts:'usually under a minute'}</div><div>${genBtn(s,'slate')}</div>`,
  fail:`<div class="big mute-fail" style="font-size:19px">${s.partial?`${s.partial.done} of ${s.partial.of} parts made`:'No take yet'}</div><div class="sub">${s.fail?s.fail.text:''}</div><div>${genBtn(s,'slate',{primary:1})} ${s.fail&&!s.fail.timedOut?`<button class="ghost" data-act="dismiss" data-id="${s.id}">Dismiss</button>`:''}</div>`}[k];
  inner=`<div class="slate ${k}">${kk}</div><div class="tc" id="vtime">${s.id} · slate ${fmt(S.t)} / ${fmt(2)}</div>`}
 return`<div class="viewer" id="viewer">${inner}<div class="vprog"><i id="vp" style="width:${pct}%"></i></div></div>`}
function transport(){const s=cur();const L=seq(),i=L.indexOf(s);let before=0;for(let j=0;j<i;j++)before+=pdur(L[j]);
 return`<div class="vctl"><button class="ghost" data-act="prev" title="Previous shot (←)">⏮</button><button class="primary" data-act="play">${S.playing?'❚❚ Pause':'▶ Play'}</button><button class="ghost" data-act="next" title="Next shot (→)">⏭</button>
 <span class="tcode" id="tcode">${fmt(before+S.t)}</span><label><input type="checkbox" data-act="skip" ${S.skipGaps?'checked':''}> Skip gaps</label>
 <label>speed <select data-bind="speed">${[1,2,4,8].map(x=>`<option ${S.speed===x?'selected':''} value="${x}">${x}×</option>`).join('')}</select></label>
 <button data-act="context">Play in context</button><button data-act="fix">Fix this shot</button></div>`}
function pane(s,t,tag){const sel=s.sel===t.id;return`<div class="pane"><div class="viewer"><div class="clip" style="--h:${t.hue}"><div class="bars t"></div><div class="bars b"></div><div class="scan"></div><div class="cap">T${t.n} <small>${MODELS[t.model].n}</small></div><div class="tc">${t.dur.toFixed(1)} s</div></div></div>
 <div class="pt"><b>T${t.n}</b>${tag?`<span class="tag in">${tag}</span>`:''}${t.late?`<span class="tag">${t.late}</span>`:''}<span class="sp"></span>${sel?`<button data-act="unselect" data-id="${s.id}">Unselect</button>`:`<button class="primary" data-act="select" data-id="${s.id}" data-t="${t.id}">Select</button>`}<button class="ghost" data-act="pin" data-id="${s.id}" data-t="${t.id}">✕</button></div></div>`}
function comparePanes(withCut){const s=cur();const pins=S.pins.map(id=>s.takes.find(t=>t.id===id)).filter(t=>t&&!t.rej);if(!pins.length)return'';
 const list=[];const cut=selT(s);if(withCut&&cut&&!pins.includes(cut))list.push(pane(s,cut,'In the cut'));pins.forEach(t=>list.push(pane(s,t,s.sel===t.id?'In the cut':'')));
 return`<div class="cmp n${list.length}" style="--n:${list.length}">${list.join('')}</div><div class="hint" style="text-align:center">Compare ${pins.length} of up to 3 · Select swaps it into the sequence · <a href="#" data-act="cmpclose" style="color:var(--accent)">Back to the sequence</a></div>`}
function viewerArea(){const V=S.variant;
 if(S.cmp&&S.pins.length&&S.mode==='takes'&&V!=='C')return comparePanes(V==='B');
 return viewer()+transport()}
function side(){const L=sc().shots;const rows=L.filter(s=>kind(s)!=='sel'||(s.stale&&selT(s))).map(s=>{const k=kind(s);let txt,actn='';
  if(k==='pick'){txt=`${act(s).length} takes · none picked`;actn='<button data-act="goto-pick" data-id="'+s.id+'">Pick</button>'}
  else if(k==='missing'||k==='cancelled'){txt=k==='cancelled'?'Cancelled':'No take yet';actn=genBtn(s,'u:'+s.id)}
  else if(k==='gen'){txt='Generating';actn=genBtn(s,'u:'+s.id)}
  else if(k==='fail'){txt=(s.partial?s.partial.done+' of '+s.partial.of+' parts made · ':'')+(s.fail?s.fail.text:'');actn=genBtn(s,'u:'+s.id)}
  else{txt='<i class="whisper"></i> possibly out of date';actn='<button class="ghost" data-act="goto" data-id="'+s.id+'">Review</button>'}
  return`<div class="urow ${S.focus===s.id?'foc':''}" data-act="goto" data-id="${s.id}"><div class="tx"><span><b>${s.id}</b> ${s.name}</span></div><div class="dim">${txt}</div><div onclick="event.stopPropagation()">${actn}</div></div>`}).join('');
 return`<div class="side"><h5>What's unsettled · ${L.filter(s=>kind(s)!=='sel'||(s.stale&&selT(s))).length}</h5>${rows||'<div class="dim">Everything in this scene is picked.</div>'}<details style="margin-top:8px" class="prm"><summary>Recorded decisions · ${S.log.length}</summary><div class="log">${S.log.slice(0,12).map(l=>`<div><time>${l.at}</time>${l.m}</div>`).join('')}</div></details></div>`}
function logSide(){return`<div class="side"><h5>Recorded decisions · ${S.log.length}</h5><div class="log">${S.log.slice(0,16).map(l=>`<div><time>${l.at}</time>${l.m}</div>`).join('')||'<div>Nothing yet. Selections, rejections and starts are recorded here.</div>'}</div></div>`}

function cell(s,i,L,eq){const k=kind(s),t=selT(s),V=S.variant;const foc=S.focus===s.id;const dim=S.filter!=='all'&&!matches(s);
 let sm='';if(S.planned)sm=`planned ${s.target} s`;else if(k==='sel')sm=`${t.dur.toFixed(1)} s${t.parts>1?' · '+t.parts+' parts':''}`;
 else if(k==='pick')sm=V==='A'||V==='C'?`pick · ${act(s).length}`:`${act(s).length} takes · none picked`;
 else if(k==='missing'||k==='cancelled')sm=k==='cancelled'?'cancelled':V==='B'?'No take yet':'no take';
 else if(k==='gen')sm='generating';else if(k==='fail')sm=s.partial?`${s.partial.done} of ${s.partial.of} parts`:'↻ retry';
 const inline=V==='B'&&!S.planned&&['missing','cancelled','fail'].includes(k)&&!s.gen?`<div onclick="event.stopPropagation()">${genBtn(s,'c:'+s.id)}</div>`:V==='B'&&k==='pick'?`<div onclick="event.stopPropagation()"><button data-act="goto-pick" data-id="${s.id}">Pick</button></div>`:'';
 const style=eq?'flex:1 1 0;min-width:112px':`flex:${wt(s)} 1 0`;
 const gp=s.gen?`<i class="gp" data-gp="${s.id}" style="width:${s.gen.p*100}%"></i>`:'';
 const fm=(k==='sel'&&!S.planned)?`--h:${t.hue}`:'';
 return`<div class="cell k-${k} ${S.planned?'plan':''} ${foc?'foc':''} ${dim?'dim':''}" data-act="seek" data-id="${s.id}" style="${style};${fm}" title="${s.id} ${s.name}"><div class="lab">${s.id} ${markHtml(s)}${k==='fail'&&!S.planned&&V!=='B'?'<span class="mute-fail">↻</span>':''}</div><div class="sm">${sm}</div>${inline}${gp}</div>`}
function laneFor(s){const a=act(s);return`<div class="lane">${a.map(t=>`<div class="lt ${s.sel===t.id?'sel':''}" style="--h:${t.hue}" data-act="select" data-id="${s.id}" data-t="${t.id}" title="Click to swap into the sequence"><i></i><span>T${t.n} ${t.late?'· '+t.late:t.fresh?'· ready, not selected':''}</span><span class="dim" style="flex:none">${t.dur.toFixed(1)}s</span><button class="ghost" style="padding:0 3px;font-size:10px" data-act="pin" data-id="${s.id}" data-t="${t.id}" title="Compare">${S.pins.includes(t.id)?'⇆✓':'⇆'}</button></div>`).join('')}</div>`}
function timeline(){const V=S.variant,L=sc().shots.filter(s=>!s.retired);const eq=V==='B';
 const ph=eq?`calc(${(L.indexOf(cur())+Math.min(1,S.t/pdur(cur())))/L.length*100}%)`:`${sceneFrac()*100}%`;
 const head=`<div class="tlhead"><b>Scene ${S.scene} timeline</b><span>${V==='A'?'width follows runtime':V==='B'?'one column per shot; the selected shot’s takes hang below it':'continuous track; pins open compare in the takes area'}</span><span class="sp"></span><span class="seg"><button class="${!S.planned?'on':''}" data-act="plan" data-p="0">As made</button><button class="${S.planned?'on':''}" data-act="plan" data-p="1">Planned runtime</button></span></div>`;
 if(eq&&!S.planned)return`<div class="tlwrap">${head}<div style="overflow-x:auto;padding-bottom:4px"><div style="display:flex;gap:2px;position:relative;min-width:max-content;width:100%">${L.map((s,i)=>`<div class="lanecol" style="flex:1 1 0;min-width:112px">${cell(s,i,L,false).replace('flex:'+wt(s)+' 1 0','flex:none;height:84px')}${s.id===S.focus&&act(s).length?laneFor(s):''}</div>`).join('')}</div></div></div>`;
 return`<div class="tlwrap">${head}<div class="tl ${V==='C'?'thin':''}" style="${eq?'overflow-x:auto':''}">${L.map((s,i)=>cell(s,i,L,eq)).join('')}<div class="ph" id="ph" style="left:${ph}"></div></div></div>`}
function stale(s){return s.stale&&selT(s)?`<div class="quiet"><i class="whisper"></i> Possibly out of date · ${s.stale} · ${genBtn(s,'stale',{label:'Regenerate'})} <button class="ghost" data-act="fits" data-id="${s.id}">It still fits</button><button class="ghost" data-act="keep" data-id="${s.id}">Keep</button> <span class="hint">nothing regenerates by itself</span></div>`:''}
function tray(){const s=cur(),a=act(s),rej=s.takes.filter(t=>t.rej),V=S.variant;if(S.mode==='frames')return frameTray(s);
 const kk=kind(s);const sub=kk==='sel'?`T${selT(s).n} in the cut`:kk==='pick'?`${a.length} takes · none picked`:kk==='gen'?'generating':s.partial?`${s.partial.done} of ${s.partial.of} parts made`:'no take yet';
 const card=t=>`<div class="tk ${s.sel===t.id?'sel':''}" style="--h:${t.hue}"><div class="thumb" data-act="select" data-id="${s.id}" data-t="${t.id}" title="Click to swap this take into the sequence"><span class="d">${t.dur.toFixed(1)} s</span>${V==='C'||S.pins.includes(t.id)?`<span class="pin" data-act="pin" data-id="${s.id}" data-t="${t.id}">${S.pins.includes(t.id)?'⇆ pinned':'⇆'}</span>`:''}</div>
  <div class="nm">T${t.n}${s.sel===t.id?'<span class="tag in">In the cut</span>':t.late?`<span class="tag">${t.late}</span>`:t.fresh?'<span class="tag">ready, not selected</span>':''}</div><div class="q">${labels(t,s)}${t.late&&t.fresh&&s.sel!==t.id?'':''}</div>
  <div class="acts">${s.sel===t.id?`<button data-act="unselect" data-id="${s.id}">Unselect</button>`:`<button class="primary" data-act="select" data-id="${s.id}" data-t="${t.id}">Select</button>`}<button class="ghost" data-act="reject" data-id="${s.id}" data-t="${t.id}">Reject</button>${V==='A'?`<label class="hint" title="Add to compare (up to 3)"><input type="checkbox" data-act="pinbox" data-id="${s.id}" data-t="${t.id}" ${S.pins.includes(t.id)?'checked':''}> compare</label>`:''}${t.parts>1?`<button class="ghost" title="Reuses parts 1–${t.parts-1}, makes part ${t.parts}">From part ${t.parts}</button>`:''}</div></div>`;
 const cmpBtn=`<button class="${S.cmp?'on':''}" data-act="cmp">Compare${S.pins.length?' ('+S.pins.length+')':''}</button>`;
 const tk=V==='B'?`<div class="hint">Takes are in the lane under the shot’s cell in the timeline above. ⇆ adds a take to compare.</div>`:`<div class="cards">${a.map(card).join('')||'<div class="dim" style="padding:6px 0">No takes yet for this shot.</div>'}</div>`;
 const m=modelOf(s);
 return`<div class="tray ${S.hl?'pulse':''}" id="tray"><div class="thead"><h4>${s.id} · ${s.name}</h4><span class="chip">${sub}</span>${s.final?'<span class="chip ok">🔒 final</span>':''}<span class="sp"></span>${cmpBtn}${selT(s)?`<button data-act="final" data-id="${s.id}">${s.final?'Unlock (final)':'Mark final'}</button>`:''}</div>
 ${stale(s)}${(s.fail||s.partial)&&!s.gen?`<div class="quiet fail">${s.partial?s.partial.done+' of '+s.partial.of+' parts made · ':''}${s.fail?s.fail.text:''} ${s.partial?'· the parts after it wait; finished parts are kept':''}</div>`:''}
 ${S.cmp&&V==='C'&&S.pins.length?comparePanes(false):tk}
 ${rej.length?`<div class="hint"><a href="#" data-act="rejtog" style="color:var(--dim)">Rejected (${rej.length}) ${S.rejOpen?'▾':'▸'}</a>${S.rejOpen?rej.map(t=>` · T${t.n} <button class="ghost" data-act="restore" data-id="${s.id}" data-t="${t.id}">Restore</button>`).join(''):''}</div>`:''}
 <div class="make"><span class="dim">Make another take</span><select data-bind="model">${Object.entries(MODELS).map(([k,M])=>{const e=est(s,k);return`<option value="${k}" ${m===k?'selected':''}>${M.n} · ${M.rate==null?'price unavailable':$money(e.total)+(e.parts>1?' · '+e.parts+' parts':'')}</option>`}).join('')}</select>
 <input data-bind="guid" placeholder="guidance (optional)" value="${q(S.guid[s.id]||'')}">${genBtn(s,'make',{primary:1})}</div>
 <details class="prm"><summary>Prompt and references (optional)</summary><textarea>${s.name}. Harbour Office interior, fog light through the window, 35mm. References: Clerk (base Look), Ledger (prop), Style: Harbour Lights.</textarea><div class="hint">Editing marks the next take “prompt overridden”. Read-only for past takes.</div></details>
 ${S.scope==='film'?'<div class="hint">Export package: selected takes only · unselected and missing shots are listed quietly, nothing blocks.</div>':''}</div>`}
function frames(s){if(!s.fr){const r=rng(s.id.charCodeAt(0)*31+s.id.charCodeAt(1));const mkF=(role,n,ap)=>({c:Array.from({length:n},(_,i)=>({id:s.id+role+i,hue:Math.floor(r()*360),src:['generated','extracted from the previous shot’s end','edited'][i%3===1?(role==='o'?1:0):i%3===2?2:0]})),a:ap?s.id+role+'0':null});s.fr={opening:mkF('o',s.id==='7E'?2:3,s.id!=='7E'),ending:mkF('e',2,s.id==='7C')}}return s.fr}
function frameViewer(s){const f=frames(s);const role=S.frameFocus&&S.frameFocus.s===s.id?S.frameFocus.role:'opening';const R=f[role];const c=R.c.find(x=>x.id===R.a)||R.c[0];
 return`<div class="viewer"><div class="clip" style="--h:${c.hue}"><div class="bars t"></div><div class="bars b"></div><div class="cap"><b>${s.id}</b> ${role} frame <small>${R.a?'approved':'not approved'} · ${c.src}</small></div></div></div><div class="vctl"><span class="hint">Frames review: the viewer shows the role’s frame; Approve is the counterpart of Select (reversible, recorded). Approving never starts video.</span></div>`}
function frameTray(s){const f=frames(s);return`<div class="tray" id="tray"><div class="thead"><h4>${s.id} · ${s.name}</h4><span class="chip">frames approved per role</span></div><div class="frs">${['opening','ending'].map(role=>{const R=f[role];return`<div><div class="dim" style="margin-bottom:5px"><b>${role}</b> · ${R.a?'approved':'<span class="quiet">not approved</span>'}</div><div class="cards">${R.c.map((c,i)=>`<div class="tk ${R.a===c.id?'sel':''}" style="--h:${c.hue};width:136px"><div class="thumb" data-act="approve" data-id="${s.id}" data-role="${role}" data-f="${c.id}"></div><div class="nm">F${i+1}${R.a===c.id?'<span class="tag in">approved</span>':''}</div><div class="q">${c.src}</div><div class="acts">${R.a===c.id?`<button data-act="approve" data-id="${s.id}" data-role="${role}" data-f="${c.id}">Unapprove</button>`:`<button class="primary" data-act="approve" data-id="${s.id}" data-role="${role}" data-f="${c.id}">Approve</button>`}</div></div>`).join('')}</div></div>`}).join('')}</div>
 <div class="make"><button data-act="genframe" data-id="${s.id}">Generate frame<span class="price">$0.04</span></button>${!f.opening.a?`<span class="quiet">Opening frame not approved ·</span>${genBtn(s,'noframe',{label:'Generate without the unapproved opening frame'})}`:''}</div></div>`}
function workspace(){const s=cur();return`<div class="wsstub"><div class="row"><button class="primary" data-act="back">← Back to review</button><span class="dim">Scene workspace · ${s.id} ${s.name} (stub)</span></div><div class="card" style="padding:16px"><b>Shot work area</b><p class="dim">Plan · direction · frames · prompt and references · takes. Out of scope for #62; planning (#60) owns this surface.</p><p class="hint">Back to review returns to ${S.scope==='film'?'whole-film':'scene '+S.scene} review with the playhead at ${s.id}, ${fmt(S.t)}.</p></div></div>`}
function stage(){const V=S.variant;
 const vrow=`<div class="vrow"><div class="vwrap">${viewerArea()}</div>${V==='B'?logSide():side()}</div>`;
 const body=head()+(S.scope==='film'&&V!=='B'?filmNav():'')+vrow+timeline()+tray();
 if(S.scope==='film'&&V==='B')return`<div class="stage vB withrail"><div class="rail">${rail()}</div><div class="content">${body}</div></div>`;
 return`<div class="stage v${V}">${body}</div>`}
function render(){const m=document.querySelector('.main'),st=m?m.scrollTop:0;
 document.getElementById('app').innerHTML=strip()+outline()+`<div class="main">${proto()}${S.view==='workspace'?workspace():stage()}</div>`;
 document.querySelector('.main').scrollTop=st;
 const u=new URLSearchParams({v:S.variant,scope:S.scope});history.replaceState(null,'','?'+u)}

/* ---------- behaviour ---------- */
function flagDeps(s,prev){if(prev&&s.cont){const d=ALL[s.cont];if(d&&selT(d)&&!d.stale){d.stale=`Built from the earlier pick of ${s.id}`;return d}}return null}
function setFocus(id,play){const s=ALL[id];S.focus=id;S.t=0;S.playing=!!play;if(S.scene!==s.scene)S.scene=s.scene;S.pins=[];S.cmp=false}
function selectTake(s,t){if(s.final){toast(`${s.id} is marked final. Unlock it to change the pick.`);return}
 if(s.sel===t.id){setFocus(s.id,true);render();return}
 const prev=s.sel,was=t.fresh;s.sel=t.id;t.fresh=false;const d=flagDeps(s,prev);log(`Selected ${s.id} T${t.n}${prev?' (was '+s.takes.find(x=>x.id===prev).n+')':''}`);
 const keepPins=S.pins;setFocus(s.id,true);S.pins=keepPins;S.cmp=false;render();
 toast(`${s.id} T${t.n} is in the cut.${d?` ${d.id} was built from the old pick and is flagged, nothing regenerates.`:''}`,()=>{s.sel=prev;t.fresh=was;if(d)d.stale=null;log(`Undid selection on ${s.id}`);render()})}
function unselect(s){const prev=s.sel;if(s.final){toast(`${s.id} is marked final. Unlock it first.`);return}const d=flagDeps(s,prev);s.sel=null;log(`Unselected ${s.id}`);S.playing=false;render();
 toast(`${s.id} unselected. It now plays as a gap slate.`,()=>{s.sel=prev;if(d)d.stale=null;log(`Undid unselect on ${s.id}`);render()})}
function fail(s){s.fail={text:'Failed, not charged · the provider refused the request'};}
function ask(key,items,bulk){const total=items.reduce((a,i)=>a+i.price,0),unknown=items.some(i=>i.unknown);
 const capBreach=!unknown&&total>S.capLeft;let kd=spendKind({total,count:items.length,unknown,capBreach});if(bulk&&kd==='click')kd='ticket';
 if(kd==='click'){startItems(items);return}S.ticket={key,items,total,count:items.length,unknown,kind:kd,bulk};render()}
function startItems(items){S.ticket=null;items.forEach(i=>{const s=i.shot;S.capLeft-=i.price;S.spent+=i.price;const resume=!!s.partial;
  s.gen={p:0,parts:resume?1:i.parts,resume,total:i.parts};s.cancelled=false;if(!S.running.includes(s))S.running.push(s);log(`Started ${s.id} · ${$money(i.price)}${i.parts>1?' · '+i.parts+' parts':''}`)});S.playing=false;render()}
function finish(s){S.running=S.running.filter(x=>x!==s);const g=s.gen;s.gen=null;
 if(S.failNext){S.failNext=false;if(g.resume){s.fail={text:'Part 3 failed again · may have been charged'}}else fail(s);log(`${s.id} failed`);}
 else{s.fail=null;const r=g.resume;s.partial=null;const M=MODELS[modelOf(s)];const t=T(s.takes.length+1,modelOf(s),s.target,Math.floor(Math.random()*360),{fresh:1,guided:S.guid[s.id]||undefined,parts:g.total>1?g.total:undefined});s.takes.push(t);S.done.push(`${s.id} T${t.n}`);log(`${s.id} T${t.n} arrived, unselected`)}}
function late(){let s=ALL[S.lateQ.shift()];
 if(!s){s=ALL['7F'];s.fail=null;const t=T(s.takes.length+1,'kling',4,Math.floor(Math.random()*360),{late:'arrived late',fresh:1});s.takes.push(t);log('7F T1 arrived late, unselected');render();toast('7F · a timed-out run finished after all. T1 arrived late, not selected.');return}
 const t=T(s.takes.length+1,modelOf(s),s.target,Math.floor(Math.random()*360),{late:'arrived after cancel',fresh:1});s.takes.push(t);s.cancelled=false;log(`${s.id} T${t.n} arrived after cancel, unselected`);render();toast(`${s.id} · T${t.n} arrived after cancel, not selected.`)}
function nextShot(from){const L=seq(),i=L.indexOf(from);for(let j=i+1;j<L.length;j++){if(!S.skipGaps||selT(L[j]))return L[j]}return null}
function prevShot(from){const L=seq(),i=L.indexOf(from);return L[i-1]||null}
function tick(){const dt=.1;let ren=false;
 for(const s of [...S.running]){s.gen.p+=.035;const e=document.querySelector(`[data-gp="${s.id}"]`);if(e)e.style.width=Math.min(100,s.gen.p*100)+'%';if(s.gen.p>=1){finish(s);ren=true}}
 if(ren){if(!S.running.length&&S.done.length){const n=S.done.length;toast(n===1?`${S.done[0]} ready, not selected.`:`${n} takes ready, not selected.`);S.done=[]}render()}
 if(!S.playing)return;const s=cur(),d=pdur(s);S.t+=dt*S.speed;
 if(S.t>=d){const n=nextShot(s);if(!n){S.playing=false;S.t=d;render();return}S.focus=n.id;S.t=0;if(n.scene!==S.scene)S.scene=n.scene;S.pins=[];S.cmp=false;render();return}
 const pct=S.t/d*100,vp=document.getElementById('vp');if(vp)vp.style.width=pct+'%';const vt=document.getElementById('vtime');if(vt&&selT(s))vt.textContent=fmt(S.t)+' / '+fmt(selT(s).dur);
 const tc=document.getElementById('tcode');if(tc){const L=seq(),i=L.indexOf(s);let b=0;for(let j=0;j<i;j++)b+=pdur(L[j]);tc.textContent=fmt(b+S.t)}
 const ph=document.getElementById('ph');if(ph){const L=sc().shots;ph.style.left=(S.variant==='B'&&!S.planned?(L.indexOf(s)+S.t/d)/L.length*100:sceneFrac()*100)+'%'}
 const cl=document.querySelector('#viewer .clip');if(cl)cl.style.setProperty('--lx',(20+pct*.6)+'%')}
setInterval(tick,100);

const H={
 variant:d=>{S.variant=d.v;S.ticket=null;render()},scopeset:d=>{S.scope=d.s;S.ticket=null;S.playing=false;render()},film:()=>{S.scope='film';S.view='review';render()},
 scene:d=>{S.scene=+d.no;S.view='review';if(cur().scene!==S.scene){S.focus=sc().shots[0].id;S.t=0;S.playing=false;S.pins=[];S.cmp=false}render()},
 goto:d=>{setFocus(d.id,false);S.inbox=false;S.view='review';render()},
 'goto-pick':d=>{setFocus(d.id,false);S.hl=1;render();document.getElementById('tray')?.scrollIntoView({block:'nearest'});setTimeout(()=>{S.hl=0;render()},1400)},
 pick:()=>H['goto-pick']({id:S.focus}),seek:d=>{setFocus(d.id,true);render()},
 select:d=>{const s=ALL[d.id];selectTake(s,s.takes.find(t=>t.id===d.t))},unselect:d=>unselect(ALL[d.id]),
 reject:d=>{const s=ALL[d.id],t=s.takes.find(x=>x.id===d.t),was=s.sel===t.id,d2=was?flagDeps(s,s.sel):null;t.rej=true;if(was)s.sel=null;S.pins=S.pins.filter(x=>x!==t.id);log(`Rejected ${s.id} T${t.n}${was?' (it was selected)':''}`);render();
  toast(`T${t.n} rejected${was?' and unselected':''}.`,()=>{t.rej=false;if(was)s.sel=t.id;if(d2)d2.stale=null;render()})},
 restore:d=>{const s=ALL[d.id],t=s.takes.find(x=>x.id===d.t);t.rej=false;log(`Restored ${s.id} T${t.n}`);render()},rejtog:()=>{S.rejOpen=!S.rejOpen;render()},
 final:d=>{const s=ALL[d.id];s.final=!s.final;log(`${s.final?'Marked final':'Unlocked'} ${s.id}`);render()},
 pin:d=>{const i=S.pins.indexOf(d.t);if(i>=0)S.pins.splice(i,1);else if(S.pins.length>=3){toast('Compare holds up to 3 takes.');return}else S.pins.push(d.t);S.cmp=S.pins.length>0;render()},
 pinbox:d=>H.pin(d),cmp:()=>{if(!S.pins.length){const a=act(cur()).slice(-3);S.pins=a.map(t=>t.id)}S.cmp=!S.cmp;render()},cmpclose:()=>{S.cmp=false;render()},
 play:()=>{S.playing=!S.playing;if(S.playing&&S.t>=pdur(cur())-.05)S.t=0;render()},skip:()=>{S.skipGaps=!S.skipGaps;render()},
 next:()=>{const n=nextShot(cur());if(n){setFocus(n.id,S.playing);render()}},prev:()=>{const n=prevShot(cur());if(n){setFocus(n.id,S.playing);render()}},
 context:()=>{const p=prevShot(cur());setFocus((p||cur()).id,true);render()},
 fix:()=>{S.view='workspace';S.playing=false;render()},back:()=>{S.view='review';render()},
 filter:d=>{S.filter=S.filter===d.f?'all':d.f;render()},plan:d=>{S.planned=d.p==='1';render()},mode:()=>{S.mode=S.mode==='takes'?'frames':'takes';render()},
 nextmatch:()=>{const L=seq(),i=L.indexOf(cur());const f=S.filter==='all'?'pick':S.filter;for(let k=1;k<=L.length;k++){const s=L[(i+k)%L.length];if(matches(s,f)||(S.filter==='all'&&kind(s)!=='sel')){setFocus(s.id,false);break}}render()},
 nextscene:()=>H.scene({no:Math.min(22,S.scene+1)}),prevscene:()=>H.scene({no:Math.max(1,S.scene-1)}),
 ask:d=>{const s=ALL[d.id],e=est(s);const parts=s.partial?1:e.parts;const price=s.partial?e.total/e.parts:e.total;ask(d.key,[{shot:s,price,unknown:e.unknown,parts}],false)},
 batch:d=>ask(d.key,S._batch[d.key],d.bulk==='1'),
 start:()=>startItems(S.ticket.items),notnow:()=>{S.ticket=null;render()},
 raise:()=>{S.capLeft=Math.max(S.capLeft,S.ticket.total);log('Raised the cap for this action');ask(S.ticket.key,S.ticket.items,S.ticket.bulk)},
 trim:()=>{const k=S.ticket;const items=[...k.items];while(items.length>1&&items.reduce((a,i)=>a+i.price,0)>S.capLeft)items.pop();if(items.reduce((a,i)=>a+i.price,0)>S.capLeft){S.ticket=null;render();toast('Even one item is over the cap.');return}ask(k.key,items,k.bulk)},
 cancel:d=>{const s=ALL[d.id];s.gen=null;s.cancelled=true;S.running=S.running.filter(x=>x!==s);S.lateQ.push(s.id);log(`Cancelled ${s.id}`);render()},
 dismiss:d=>{ALL[d.id].fail=null;render()},fits:d=>{ALL[d.id].stale=null;log(`${d.id}: it still fits`);render()},keep:d=>{ALL[d.id].stale=null;log(`${d.id}: kept as is`);render()},
 late,failnext:()=>{S.failNext=!S.failNext;render()},caplow:()=>{S.capLeft=S.capLeft<1?25:0.3;S.ticket=null;render()},reset:()=>{location.reload()},inbox:()=>{S.inbox=!S.inbox;render()},
 approve:d=>{const s=ALL[d.id],R=frames(s)[d.role];R.a=R.a===d.f?null:d.f;S.frameFocus={s:s.id,role:d.role};log(`${R.a?'Approved':'Unapproved'} ${s.id} ${d.role} frame`);render()},
 genframe:d=>{const s=ALL[d.id],R=frames(s).opening;S.capLeft-=.04;S.spent+=.04;R.c.push({id:s.id+'o'+R.c.length,hue:Math.floor(Math.random()*360),src:'generated'});log(`Generated a ${s.id} frame, not approved`);render();toast('Frame ready, not approved.')}
};
document.addEventListener('click',e=>{const el=e.target.closest('[data-act]');if(!el)return;if(el.tagName==='INPUT'&&el.type==='checkbox'&&el.dataset.act==='pinbox'){H.pinbox(el.dataset);return}if(el.tagName==='A')e.preventDefault();const f=H[el.dataset.act];if(f){f({...el.dataset});}});
document.addEventListener('change',e=>{const el=e.target;if(el.dataset.act==='skip'){H.skip();return}
 if(el.dataset.bind==='speed'){S.speed=+el.value}else if(el.dataset.bind==='model'){S.model[S.focus]=el.value;S.ticket=null;render()}});
document.addEventListener('input',e=>{if(e.target.dataset.bind==='guid')S.guid[S.focus]=e.target.value});
document.addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(e.code==='Space'){e.preventDefault();H.play()}else if(e.key==='ArrowRight')H.next();else if(e.key==='ArrowLeft')H.prev();else if(e.key==='c')H.cmp()});
window.P={S,ALL,scenes,render,H,set(o){Object.assign(S,o);render()}};
render();
})();

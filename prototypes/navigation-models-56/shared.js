// PROTOTYPE (throwaway) shared helpers
const U={view:'home',scene:null,shot:null,tab:'plan',lens:'shots',palette:false,filter:'all',cTab:'doc',hist:[]};
function go(p,noHist){ if(!noHist){const {hist,...r}=U;U.hist.push(JSON.stringify(r));} Object.assign(U,p); render(); }
function back(){const h=U.hist.pop(); if(h){const hist=U.hist;Object.assign(U,JSON.parse(h));U.hist=hist;render();}}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;')}
function chip(st,txt){const L={done:'Done',prog:'In progress',todo:'Not started',skipped:'Skipped by you',bypassed:'Bypassed — covered',optional:'Optional',defer:'Deferred',missing:'Missing'};return `<span class="chip ${st}">${txt||L[st]||st}</span>`}
function phase(id){return PHASES.find(p=>p.id===id)}
function phSt(id){return PH_STATUS[id]||'todo'}
function stackBar(t,total,h){total=total||Object.values(t).reduce((a,b)=>a+b,0)||1;
 const order=['selected','review','generating','failed','framed','planned','unplanned'];
 return `<div class="bar" ${h?`style="height:${h}px"`:''}>`+order.map(k=>t[k]?`<i title="${SHOT_STATES[k][0]}: ${t[k]}" style="width:${t[k]/total*100}%;background:${SHOT_STATES[k][1]}"></i>`:'').join('')+'</div>'}
function sq(s,extra){return `<span class="sq ${s.st==='generating'?'gen':''} ${s.stale?'stale':''} ${U.shot===s.id?'sel':''}" title="Shot ${s.id} · ${SHOT_STATES[s.st][0]}${s.stale?' · possibly out of date':''}" style="background:${SHOT_STATES[s.st][1]}" onclick="event.stopPropagation();go({scene:${s.sc},shot:'${s.id}'${extra||''}})"></span>`}
function thumb(s,w,h){return `<div class="thumb" style="width:${w}px;height:${h}px;background:hsl(${s.hue},${s.st==='unplanned'||s.st==='planned'?'8%':'35%'},${s.st==='planned'?'80%':'62%'})"></div>`}
function legend(){return Object.entries(SHOT_STATES).filter(([k])=>k!=='unplanned'||STATE==='new').map(([k,v])=>`<span class="row sm" style="gap:4px"><i class="dot" style="background:${v[1]}"></i>${v[0]}</span>`).join('')}
function shotById(id){return SHOTS.find(s=>s.id===id)}
function runtimeMeter(){const planned=SCENES.reduce((a,s)=>a+s.dur,0);const tgt=1200;return `<div style="min-width:150px"><div class="sm mut">Runtime ${fmt(planned)} of ~20:00 target</div><div class="bar"><i style="width:${Math.min(100,planned/tgt*100)}%;background:var(--acc)"></i></div></div>`}
function filmProgress(){const t=totals(),n=SHOTS.length;return `<div style="min-width:220px"><div class="sm mut">${n?`${t.selected||0} of ${n} shots selected · ${(t.review||0)} need a pick · ${(t.failed||0)} failed`:'No shots yet'}</div>${stackBar(t,n)}</div>`}
function staleNote(){return STATE==='new'?'':`<span class="stale" title="Edited Maren's look after these were generated. Keep, regenerate, or reconcile — nothing is blocked.">6 shots possibly out of date</span>`}
// ---------- shared content pages (the *container* differs per variant; the content is held constant) ----------
function bypassBlock(id){const st=phSt(id);
 if(st==='bypassed')return `<div class="banner">⤼ <b>Intentionally bypassed.</b> ${PH_NOTE[id]}. Nothing is broken or missing. <button style="margin-left:8px">Fill it from the Master Narrative…</button> <span class="mut sm">(on request only; nothing is spent automatically)</span></div>`;
 if(st==='skipped')return `<div class="banner">↷ <b>Skipped by you.</b> ${PH_NOTE[id]}. <button style="margin-left:8px">Run the interview now</button> <span class="mut sm">(offered, never required)</span></div>`;
 return '';}
function backBanner(id){ if(STATE==='new'||['input','home'].includes(id))return ''; return `<div class="banner quiet sm">You’re viewing earlier work — it’s open, nothing is locked. Editing here marks <b>${id==='narrative'?'165 shots · 22 scenes':id==='world'?'6 shots':'later documents'}</b> as <i>possibly out of date</i>; nothing is rewritten or blocked.</div>`}
function phasePage(id){
 const p=phase(id),st=phSt(id);
 if(id==='world')return worldPage();
 if(id==='review')return reviewPage();
 if(id==='input'&&STATE==='new')return onboardChooser();
 const docs={input:'Screenplay.pdf — primary · Mood-board.zip — supporting · Settings: 6:30–8:00 runtime · 16:9 · comedy · PG-13',interview:'Established Facts (4, AI-made): Maren is not a villain · Pell is sincerely lonely · …',treatment:'(Treatment prose would appear here, editable, with highlight-to-rewrite.)',beats:'(Beat list: drag to reorder, expand, split, alternatives.)',narrative:SC_TITLES.slice(0,6).map((t,i)=>`<h4 style="margin:12px 0 2px">${i+1}. ${t}</h4><div class="mut">Scene prose with production-grade description; accepted Oct 18. Shots in this scene: ${SCENES[i].shots.length||'—'}.</div>`).join('')};
 return `<div class="pad" style="max-width:820px">${backBanner(id)}<div class="row" style="margin:10px 0"><h2 style="margin:0">${p.n}</h2>${chip(st)}<span class="chip">${{M:'Mandatory',R:'Recommended','R/B':'Recommended · bypassable',O:'Optional','M*':'Mandatory · deferrable'}[p.kind]}</span></div><p class="mut">${p.d}</p>${bypassBlock(id)}<div class="card pad" style="margin-top:12px">${docs[id]||'(phase workspace)'}</div></div>`}
function onboardChooser(){return `<div class="pad" style="max-width:820px"><h2 style="margin:0 0 4px">What are you bringing?</h2><p class="mut">Start anywhere. Your material lands as far into the film as it earns — skipped phases are marked as intentional, never broken.</p>
 ${[['A rough idea, notes or a transcript','Input → Interview → … (full path)'],['A story or treatment','Starts at Treatment'],['An outline / beat sheet','Starts at Beat Sheet'],['A screenplay','Converted into the Master Narrative'],['Storyboards, shot lists, CineBlock previs','Starts at Scenes & Shots']].map(([a,b],i)=>`<div class="card pad row" style="margin:8px 0;cursor:pointer" onclick="alert('Prototype: would set the entry route and mark skipped phases as bypassed')"><b>${a}</b><span class="sp"></span><span class="mut">${b}</span> ›</div>`).join('')}
 <div class="card pad" style="margin-top:14px"><b>Or just type it</b><textarea style="width:100%;height:70px;margin-top:6px;border:1px solid var(--line);border-radius:6px;padding:8px" placeholder="Two sentences is enough to start…"></textarea></div></div>`}
function worldPage(){return `<div class="pad">${backBanner('world')}<div class="row" style="margin:10px 0"><h2 style="margin:0">World Definition</h2>${chip(phSt('world'))}<span class="chip">Mandatory · deferrable</span></div>
 ${STATE==='new'?'<p class="mut">Appears after the Master Narrative is accepted. Aiuteur extracts entities for you to define.</p>':`<p class="mut">${PH_NOTE.world}. Defer anything minor; come back later.</p>
 <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px">${ENT.map(e=>`<div class="card pad"><div class="thumb" style="height:70px;background:hsl(${e[0].length*17},${e[2]==='defined'?30:6}%,${e[2]==='defined'?65:85}%)"></div><div style="margin-top:6px"><b>${e[0]}</b></div><div class="row sm mut">${e[1]} ${chip(e[2])}</div></div>`).join('')}</div>`}</div>`}
function reviewPage(){const t=totals(),n=SHOTS.length;return `<div class="pad">${backBanner('review')}<div class="row"><h2 style="margin:0">Review & Export</h2>${chip(phSt('review'))}<span class="sp"></span><button>Play scene</button><button class="pri">Play whole film</button><button>Export…</button></div>
 <div class="card" style="margin:12px 0;background:#0f1117;height:210px;display:flex;align-items:center;justify-content:center;color:#889">${n?'▶ Sequence playback — selected takes in story order; unselected shots show a slate':'Nothing to play yet'}</div>
 ${n?`<div class="sm mut" style="margin-bottom:4px">Timeline — one block per shot; click to jump to the shot and fix it</div><div>${SHOTS.map(s=>sq(s)).join('')}</div><div class="row sm" style="margin-top:8px;gap:14px;flex-wrap:wrap">${legend()}</div><p class="mut">Export will include ${t.selected||0} selected takes. ${n-(t.selected||0)} shots have no selected take yet — export still works, with gaps listed.</p>`:''}</div>`}
function shotDetail(s,compact){ if(!s)return '<div class="pad mut">Select a shot.</div>'; const sc=SCENES[s.sc];
 const tabs=['plan','direction','frames','takes','audio'];
 return `<div class="pad"><div class="row"><b style="font-size:15px">Shot ${s.id}</b> <span class="chip" style="border-color:${SHOT_STATES[s.st][1]}">${SHOT_STATES[s.st][0]}</span> ${s.stale?'<span class="stale">possibly out of date — Maren’s look changed</span>':''}<span class="sp"></span><span class="mut sm">${s.dur}s</span></div>
 <div class="mut sm" style="margin:2px 0 8px">Scene ${sc.n} · ${sc.title}</div>
 <div class="row sm" style="margin-bottom:8px">${tabs.map(t=>`<button class="${U.tab===t?'pri':''}" onclick="go({tab:'${t}'},1)">${{plan:'Plan',direction:'Direction (optional)',frames:'Frames',takes:'Takes',audio:'Audio (optional)'}[t]}</button>`).join('')}</div>
 ${U.tab==='plan'?`<div class="card pad"><b>Action</b><div>${SHOT_TEXT.action}</div><b>Dialogue</b><div>${SHOT_TEXT.dialogue}</div><b>Camera</b><div>${SHOT_TEXT.cam}</div><div style="margin-top:6px">${SHOT_TEXT.ents.map(e=>`<span class="chip">${e}</span> `).join('')}</div></div><div class="sm mut" style="margin-top:6px">⟲ Previous shot ends: Maren turning toward the window. ${!compact?'':''}</div>`:
  U.tab==='takes'?`<div class="row">${[0,1,2].map(i=>`<div>${thumb({hue:s.hue+i*20,st:'x'},120,68)}<div class="sm mut">Take ${i+1}${i===0&&s.st==='selected'?' ✓ selected':''}</div></div>`).join('')}</div><div style="margin-top:8px"><button class="pri">Generate take · ≈ $0.80</button> <span class="mut sm">cost shown before spend</span></div>`:
  `<div class="card pad mut">(${U.tab} workspace for this shot)</div>`}</div>`}
// ---------- floating switcher ----------
const VARS={A:'Phase rail + scene hub',B:'Hub-and-spoke rooms',C:'Outline tree + production board'};
const TRY={A:['Click Treatment in the rail (bypassed) → then Master Narrative: moving back is free','Production → pick scene 8 → switch lens Shots/Frames/Takes','Find failed shots: use the “Needs attention” filter in the scene hub','Switch state to “First run”'],B:['Press ⌘/Ctrl-K, type “8.3” or “world”','Open the Production room → scene tile → shot; use ←/→ for prev/next shot','Click a breadcrumb to go back up','Switch state to “First run”'],C:['Open the Board tab: click any square to inspect a shot without leaving the board','In the tree, open Treatment (bypassed) then back to a scene','Use the tree filter “Needs attention”','Switch state to “First run”']};
let tryOpen=false;
function switcher(){const ks=Object.keys(VARS);const i=ks.indexOf(V);
 return `<div id="switcher"><button onclick="setV('${ks[(i+2)%3]}')">←</button>${ks.map(k=>`<button class="${k===V?'on':''}" onclick="setV('${k}')">${k}</button>`).join('')}<button onclick="setV('${ks[(i+1)%3]}')">→</button><b>${V} · ${VARS[V]}</b><span style="width:20px"></span>State: <button class="${STATE==='mid'?'on':''}" onclick="setS('mid')">Mid-project (≈170 shots, screenplay start)</button><button class="${STATE==='new'?'on':''}" onclick="setS('new')">First run</button><button onclick="tryOpen=!tryOpen;render()">Things to try</button></div>${tryOpen?`<div id="try"><b>Things to try in ${V}</b><ol style="padding-left:16px;margin:6px 0 0">${TRY[V].map(t=>`<li>${t}</li>`).join('')}</ol></div>`:''}<div class="proto-tag">PROTOTYPE · throwaway · #56</div>`}
function setV(v){const p=new URLSearchParams(location.search);p.set('variant',v);history.replaceState(null,'','?'+p);V=v;U.view='home';U.scene=null;U.shot=null;U.hist=[];render()}
function setS(s){const p=new URLSearchParams(location.search);p.set('state',s);p.set('variant',V);location.search=p.toString()}
document.addEventListener('keydown',e=>{ if(/INPUT|TEXTAREA/.test(document.activeElement.tagName))return;
 if(e.key==='ArrowLeft'&&!e.altKey&&!(V==='B'&&U.view==='shot')){const ks=Object.keys(VARS);setV(ks[(ks.indexOf(V)+2)%3])}
 else if(e.key==='ArrowRight'&&!(V==='B'&&U.view==='shot')){const ks=Object.keys(VARS);setV(ks[(ks.indexOf(V)+1)%3])}
 if((e.metaKey||e.ctrlKey)&&e.key==='k'){e.preventDefault();U.palette=!U.palette;render();setTimeout(()=>{const q=document.getElementById('q');q&&q.focus()},30)}
 if(e.key==='Escape'&&U.palette){U.palette=false;render()}
 if(V==='B'&&U.view==='shot'){const sc=SCENES[U.scene];const i=sc.shots.findIndex(s=>s.id===U.shot);if(e.key==='ArrowRight'&&sc.shots[i+1])go({shot:sc.shots[i+1].id},1);if(e.key==='ArrowLeft'&&sc.shots[i-1])go({shot:sc.shots[i-1].id},1)}});
let V=new URLSearchParams(location.search).get('variant')||'A';
function render(){document.getElementById('root').innerHTML=({A:viewA,B:viewB,C:viewC})[V]();document.getElementById('sw').innerHTML=switcher()}

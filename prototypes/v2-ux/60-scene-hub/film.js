// Shared mock film + scene/shot state + operations for all three #60 directions. Throwaway.
(()=>{
const F=window.F={scope:new Set(),spent:0,uid:1000,cfg:{capLeft:25,stress:false},selShot:{},onChange:null};
const rng=seed=>{let x=(seed*7919+13)%2147483647;return()=>{x=(x*16807)%2147483647;return (x%10000)/10000}};
const LET=i=>i<26?String.fromCharCode(65+i):String.fromCharCode(65+Math.floor(i/26)-1)+String.fromCharCode(65+i%26);
F.target=18*60;
F.fmt=sec=>{sec=Math.round(sec);return Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0')};
F.hue=str=>{let x=0;for(const c of String(str))x=(x*31+c.charCodeAt(0))%360;return x};

// num, slugline, time, excerpt, assets
const SD=[
['EXT. SALT FLATS','DAWN',"The tide has gone out further than anyone remembers. Marcus walks the dry seabed with a surveyor's stick. Gulls circle nothing.",['Marcus','Salt Flats']],
['INT. HARBOUR OFFICE','DAY',"Nora signs the last clearance form and does not look up when the clerk says the name. The fan turns. Outside, a boat sits on its keel.",['Nora','Harbour Office']],
['EXT. FISH MARKET','MORNING',"Empty stalls, wet concrete. Marcus buys nothing and is watched anyway. A child holds up a jar of seawater, as if it were evidence.",['Marcus','Fish Market']],
["INT. MARCUS'S TRUCK",'DAY',"The radio gives the tide tables twice. Marcus switches it off and listens to the engine tick as it cools.",['Marcus','Truck']],
['EXT. LIGHTHOUSE ROAD','DUSK',"Nora walks the gravel road in good shoes. The lighthouse has no light. A dog follows her, then stops where the road ends.",['Nora','Lighthouse Road']],
['INT. LIGHTHOUSE','NIGHT',"Salt crust on every rail. Nora climbs by phone light and finds a desk, a ledger, and a drawer that has been forced from inside.",['Nora','Lighthouse']],
['INT. HALE KITCHEN','NIGHT',"Rain on the window. Marcus sits at the table, the unopened letter between his hands. Nora enters, wet coat, and stops in the doorway.",['Marcus','Nora','Hale Kitchen']],
['EXT. HALE PORCH','NIGHT',"Nora stands on the porch with the letter folded small. Inside, the kettle starts to scream and nobody moves.",['Nora','Hale Porch']],
['INT. RECORDS ROOM','DAY',"A clerk brings the 1974 survey in a flat box. The coastline on the page is a different shape. Marcus traces it with one finger.",['Marcus','Clerk','Records Room']],
['EXT. TOWN SQUARE','DAY',"A notice is nailed to the fountain. People read it and, one by one, look toward the sea. Nora reads it last.",['Nora','Town Square','Extras: Townspeople']],
['INT. CHURCH HALL','EVENING',"Folding chairs, a urn of bad coffee. The harbour committee argues about a number nobody will say aloud.",['Committee','Church Hall']],
["INT. NORA'S FLAT",'NIGHT',"Nora spreads the survey on the floor and weights the corners with shoes. She marks the old shoreline in red.",['Nora',"Nora's Flat"]],
['EXT. SEAWALL','DAWN',"Marcus paces the wall, counting steps. At the end of the wall the sea is not where the wall expects it.",['Marcus','Seawall']],
['INT. BOAT SHED','DAY',"An old fisherman refuses to sell the boat and refuses to explain. He hands Marcus a tin of rusted hooks instead.",['Marcus','Fisherman','Boat Shed']],
['EXT. CAUSEWAY','DAY',"The causeway floods at the margin of the tide. Two cars wait, engines off, each driver pretending the other is not there.",['Marcus','Causeway']],
['INT. DINER','NIGHT',"Nora and Marcus share a booth and a silence. The waitress refills coffee neither of them asked for.",['Nora','Marcus','Diner']],
['EXT. DUNES','GOLDEN HOUR',"Wind pulls the sand off the ridge in long banners. Nora climbs it and sees, for the first time, the whole dry bay.",['Nora','Dunes']],
['INT. HOSPITAL CORRIDOR','NIGHT',"A corridor of closed doors. Marcus waits under a flickering tube. A nurse says a name; it is not his.",['Marcus','Nurse','Hospital']],
['EXT. FERRY LANDING','DAWN',"The ferry does not come. The ticket booth is open, the clerk is asleep upright, the board still says ON TIME.",['Nora','Ferry Landing']],
['INT. COURTROOM','DAY',"The magistrate reads the survey into the record. Marcus stands. Nora, in the gallery, closes her eyes.",['Marcus','Nora','Magistrate','Courtroom']],
['EXT. SALT FLATS','DUSK',"The flats again, now with water on them for the first time. Marcus kneels, touches it, and says nothing.",['Marcus','Salt Flats']],
['INT. HALE KITCHEN','MORNING',"Morning light across the same table. The letter is open now, flat, a cup on one corner. Nora is already gone.",['Marcus','Hale Kitchen']],
];
const PLAN={9:'locked',12:'emptied',15:'none',16:'none',17:'none',18:'none',19:'none',20:'none'};
const EST={15:.03,16:.04,17:.06,18:.11,19:.08,20:2.4};
const PROG={1:.95,2:.9,3:.8,4:.7,5:.6,6:.5,8:.4,9:.3,10:.25,11:.15,13:.1,14:.05};
const PH=['Wide establishing of {L}','Medium on {C} as the moment lands','Close on {C}\'s hands','Over-the-shoulder, {C} listening','Insert: a detail of {L}','Tracking behind {C}','Reaction close-up, held a beat','Wide, {C} small in the frame','Low angle, {L} looms','Two-shot, silence between them','Slow push toward {C}','Cutaway: {L}, empty'];
const CAM=['WS · eye · static','MS · eye · static','CU · low · push in','OTS · eye · static','INS · high · static','MS · eye · tracking','ECU · eye · static'];

function blocksOf(excerpt){return excerpt.split(/(?<=\.) /).map((t,i)=>({id:'b'+(i+1),kind:'action',text:t}))}
function mkShot(o){return Object.assign({id:'sh'+(F.uid++),action:'',dur:4,cam:CAM[1],camAi:true,dlg:'',delivery:'',anchor:[],touched:{},takes:0,sel:false,final:false,gen:false,failed:false,framing:false,ood:false,retired:false,made:0},o)}

function genShots(s,n,seed,p){
  const r=rng(seed),L=s.assets[s.assets.length-1],C=s.assets[0],out=[];
  for(let i=0;i<n;i++){
    const x=r(),dur=3+Math.floor(r()*5);
    const o={action:PH[(seed+i*5)%PH.length].replace('{L}',L).replace('{C}',C)+'.',dur,cam:CAM[(seed+i)%CAM.length],anchor:[s.blocks[i%s.blocks.length].id]};
    if(x<p*.8){o.takes=1+Math.floor(r()*3);o.sel=true;o.made=Math.max(2,dur+(r()<.5?-1:0));if(x<p*.25)o.final=true;if(r()<.08)o.ood=true}
    else if(x<p){o.takes=2}
    else if(p>0&&x<p+.07)o.gen=true;
    else if(p>0&&x<p+.12){o.failed=true}
    else if(r()<.5)o.framing=true;
    out.push(mkShot(o));
  }
  return out;
}

function scene7(s){
  s.blocks=[
    {id:'b1',kind:'action',text:'Rain on the window. Marcus sits at the table, the unopened letter between his hands.'},
    {id:'b2',kind:'action',text:'Nora enters, wet coat, and stops in the doorway.'},
    {id:'b3',kind:'dialogue',who:'NORA',text:'You said you\'d burn it.',delivery:'flat, not a question'},
    {id:'b4',kind:'dialogue',who:'MARCUS',text:'I said a lot of things.',delivery:'to the table'},
    {id:'b5',kind:'action',text:'She crosses to the stove and puts the kettle on. Neither looks at the other.'},
    {id:'b6',kind:'action',text:'Marcus slides the letter across. Nora reads the first line and goes still.'},
    {id:'b7',kind:'dialogue',who:'NORA',text:'Where did you find this?',delivery:'barely audible'},
    {id:'b8',kind:'action',text:'Thunder. The lights flicker once and hold.'}];
  const S=(a,d,an,o)=>mkShot(Object.assign({action:a,dur:d,anchor:an},o));
  s.shots=[
    S('Wide on the rain-streaked window; Marcus a silhouette at the table.',4,['b1'],{cam:'WS · eye · static',takes:2,sel:true,final:true,made:4}),
    S('Medium on Marcus, hands around the unopened letter.',5,['b1'],{cam:'MS · eye · static',takes:1,sel:true,made:5}),
    S('Nora stops in the doorway, water running off her coat.',4,['b2'],{cam:'MS · low · static',takes:3,touched:{action:true}}),
    S('Over Marcus, Nora delivers the line.',5,['b3'],{cam:'OTS · eye · static',dlg:'NORA: You said you\'d burn it.',delivery:'flat, not a question',takes:1,sel:true,made:5,ood:true,touched:{dur:true}}),
    S('Marcus answers without looking up.',4,['b4'],{cam:'CU · eye · push in',dlg:'MARCUS: I said a lot of things.',delivery:'to the table',gen:true}),
    S('Insert: the letter slides across the wood.',3,['b6'],{cam:'INS · high · static',failed:true}),
    S('Nora reads the first line and goes still.',6,['b6','b7'],{cam:'ECU · eye · static',camAi:false,touched:{cam:true},dlg:'NORA: Where did you find this?',delivery:'barely audible',framing:true}),
    S('Thunder; the lights flicker once and hold.',3,['b8'],{cam:'WS · high · static',framing:true}),
  ];
}

F.build=stress=>{
  F.uid=1000;F.spent=0;F.scope=new Set();F.selShot={};F.cfg.stress=!!stress;
  F.scenes=SD.map((d,i)=>{
    const n=i+1,s={id:'s'+n,line:d[0],time:d[1],excerpt:d[2],assets:d[3],blocks:blocksOf(d[2]),plan:PLAN[n]||'plan',locked:PLAN[n]==='locked',est:EST[n]||0,unknown:n===19,shots:[],opts:null,nm:40+(n*37%50),needs:n===14||n===6?['1 view needed']:[]};
    if(n===7){scene7(s);s.est=.07;return s}
    if(s.plan==='none')return s;
    const cnt=(stress?11:6)+Math.floor(rng(n)()*(stress?8:6));
    s.shots=genShots(s,cnt,n,PROG[n]||0);
    if(s.plan==='emptied')s.shots.forEach(x=>{x.retired=true});
    s.est=+(0.03+0.004*cnt).toFixed(2);
    return s;
  });
  F.adhoc=[
    mkShot({kind:'Establishing',action:'Aerial over the dry bay, grey light.',dur:6,takes:2,sel:true,made:6}),
    mkShot({kind:'B-roll',action:'Gulls on a rusted mooring ring.',dur:4,takes:1}),
    mkShot({kind:'Insert',action:'Tide table nailed to a door, rain-blurred.',dur:3}),
    mkShot({kind:'Atmospheric',action:'Slow drift through the empty fish market.',dur:8,gen:true}),
  ];
  F.removed=[
    {id:'r1',line:'INT. MARCUS\'S MOTHER\'S HOUSE',time:'DAY',slot:8,why:'Removed when the Master Narrative was rewritten (14 Oct)',shots:genShots({assets:['Marcus','Mother\'s House'],blocks:[{id:'b1'}]},6,91,.6),frames:11,takes:9},
    {id:'r2',line:'EXT. CHURCH STEPS',time:'DUSK',slot:12,why:'Merged into scene 11 text, then split out and cut',shots:genShots({assets:['Nora','Church Steps'],blocks:[{id:'b1'}]},4,92,.3),frames:6,takes:3},
  ];
  F.scenes.forEach(s=>{s.shots.forEach(x=>{if(x.retired)x.retiredBy='creator'})});
};
F.byId=id=>F.scenes.find(s=>s.id===id);
F.num=s=>F.scenes.indexOf(s)+1;
F.enc=s=>String(F.num(s)).padStart(2,'0')+'-'+s.line.replace(/[^A-Za-z ]/g,'').trim().toLowerCase().replace(/\s+/g,'-')+'-'+s.time.toLowerCase().replace(/\s+/g,'-');
F.active=s=>s.shots.filter(x=>!x.retired);
F.labels=s=>{const m={};let i=0;for(const x of s.shots){if(!x.retired)m[x.id]=F.num(s)+LET(i++)}return m};
F.kind=x=>x.failed?'failed':x.gen?'gen':x.sel?(x.final?'final':'sel'):x.takes>0?'pick':'miss';
F.stats=s=>{const a=F.active(s),st={n:a.length,sel:0,pick:0,miss:0,gen:0,fail:0,ood:0,plan:0,made:0,framing:0};
  for(const x of a){st.plan+=x.dur;if(x.failed)st.fail++;if(x.gen)st.gen++;if(x.ood)st.ood++;if(x.framing)st.framing++;if(x.sel){st.sel++;st.made+=x.made||x.dur}else if(x.takes>0)st.pick++;else st.miss++}
  return st};
F.status=s=>{if(s.plan==='none'&&!s.shots.length)return{t:'No plan yet',c:'none'};const st=F.stats(s);
  if(!st.n)return{t:'Plan emptied',c:'none'};if(st.sel===st.n)return{t:'All selected',c:'done'};
  if(st.sel||st.pick||st.gen)return{t:st.sel+' of '+st.n+' selected',c:'prog'};if(st.framing)return{t:'Framing',c:'prog'};return{t:'Planned',c:'plan'}};
F.needsAttn=s=>{const st=F.stats(s);return st.fail||st.pick||st.ood||s.opts};
F.endFrame=s=>{const a=F.active(s).filter(x=>x.sel);return a.length?a[a.length-1]:null};
F.totals=()=>{let n=0,sel=0,plan=0,ood=0;for(const s of F.scenes){const t=F.stats(s);n+=t.n;sel+=t.sel;plan+=t.plan;ood+=t.ood}return{n,sel,plan,ood}};

// spend: plan drafting price rule for one scene (Record 3 CR-2)
F.enterKind=s=>{const total=s.est,unknown=!!s.unknown,k=spendKind({total,count:1,unknown,capBreach:total>F.cfg.capLeft});return{k,total,unknown,auto:k==='click'&&!unknown&&total<0.05}};
F.snap=()=>JSON.stringify({scenes:F.scenes,adhoc:F.adhoc,removed:F.removed,spent:F.spent});
F.restore=j=>{const o=JSON.parse(j);F.scenes=o.scenes;F.adhoc=o.adhoc;F.removed=o.removed;F.spent=o.spent};
F.changed=()=>F.onChange&&F.onChange();
F.act=(msg,fn)=>{const before=F.snap();fn();F.changed();toast(msg,()=>{F.restore(before);F.changed()})};

F.genPlan=s=>{const n=5+Math.floor(rng(F.num(s))()*4);s.shots=genShots(s,n,F.num(s)+40,0);s.plan='plan';s.fresh=true;F.spent+=s.est;return n};
F.enter=s=>{ // auto-draft ONLY: no plan, estimate < $0.05, no exceptional condition
  if(s.plan==='none'&&!s.shots.length&&F.enterKind(s).auto){const before=F.snap(),n=F.genPlan(s);s.auto=true;
    toast('Drafted '+n+' shots from the narrative when you opened this scene · text only',()=>{F.restore(before);F.changed()})}
};

// ---- structural edits (each is one undoable action group) ----
F.reorder=(s,id,dir)=>{const a=s.shots,i=a.findIndex(x=>x.id===id);let j=i+dir;while(a[j]&&a[j].retired)j+=dir;if(!a[j])return;F.act('Moved shot '+F.labels(s)[id]+' '+(dir<0?'earlier':'later'),()=>{[a[i],a[j]]=[a[j],a[i]]})};
F.moveTo=(s,id,toId)=>{const a=s.shots,i=a.findIndex(x=>x.id===id),j=a.findIndex(x=>x.id===toId);if(i<0||j<0||i===j)return;F.act('Reordered shots',()=>{const[x]=a.splice(i,1);a.splice(j,0,x)})};
F.split=(s,id)=>{const a=s.shots,i=a.findIndex(x=>x.id===id),x=a[i];F.act('Split into 2 shots · duration partitioned · Frames and Takes stay on the first',()=>{
  const d1=+(x.dur*.55).toFixed(1),words=x.action.replace(/\.$/,'').split(' '),cut=Math.ceil(words.length/2);
  const y=mkShot({action:words.slice(cut).join(' ')+'.',dur:+(x.dur-d1).toFixed(1),cam:x.cam,camAi:x.camAi,anchor:x.anchor.slice(-1),splitFrom:x.id,framing:true});
  x.action=words.slice(0,cut).join(' ')+'.';x.dur=d1;if(x.takes)x.ood=true;a.splice(i+1,0,y)})};
F.mergeNext=(s,id)=>{const a=s.shots,i=a.findIndex(x=>x.id===id);let j=i+1;while(a[j]&&a[j].retired)j++;const x=a[i],y=a[j];if(!y)return;
  F.act('Merged 2 shots · earlier keeps its id · later retired, its work kept',()=>{x.action=x.action.replace(/\.$/,'')+'; '+y.action;x.dur=+(x.dur+y.dur).toFixed(1);x.anchor=[...new Set([...x.anchor,...y.anchor])];
    x.fromMerged=(x.fromMerged||0)+y.takes;if(x.takes||y.takes)x.ood=true;y.retired=true;y.mergedInto=x.id})};
F.retire=(s,id)=>{const x=s.shots.find(y=>y.id===id);F.act('Retired shot '+(F.labels(s)[id]||'')+' · its work is kept',()=>{x.retired=true;x.retiredBy='creator'})};
F.unretire=(s,id)=>{const x=s.shots.find(y=>y.id===id);F.act('Shot brought back',()=>{x.retired=false;delete x.mergedInto})};
F.addShot=(s,anchor)=>{F.act('Added a shot · not anchored to the narrative yet',()=>{const x=mkShot({action:'New shot — describe what a viewer sees.',dur:4,anchor:anchor?[anchor]:[],touched:{action:true,dur:true},cam:'MS · eye · static',camAi:false});s.shots.push(x);F.selShot[s.id]=x.id})};
F.lock=(s,v)=>{F.act(v?'Plan locked · AI results will be held as Options':'Plan unlocked',()=>{s.locked=v})};
F.accept=s=>{F.act('Plan accepted',()=>{s.accepted=true})};

// ---- redraft: returns Options, never overwrites creator-touched fields ----
F.redraftEst=s=>s.est;
F.uncovered=s=>{const cov=new Set(F.active(s).flatMap(x=>x.anchor));return s.blocks.filter(b=>!cov.has(b.id))};
F.makeOptions=(s,src)=>{
  const a=F.active(s),protect=a.some(x=>x.takes>0||Object.keys(x.touched).length)||s.locked||s.plan==='emptied';
  if(!protect&&a.length){a.forEach((x,i)=>{if(i%3===0)x.action=x.action.replace(/\.$/,'')+', holding a beat longer.'});F.spent+=s.est;s.fresh=true;return'direct'}
  const o={src:src||'redraft',held:s.locked,changes:[],proposals:[],omitted:[],kept:0};let k=0;
  a.forEach((x,i)=>{if(i%3===0||i===1||i===2){if(x.touched.action)o.kept++;else o.changes.push({id:'c'+(k++),shot:x.id,field:'action',from:x.action,to:x.action.replace(/\.$/,'')+' — and holds longer on the reaction.',st:'open'});}
    if(i===3||i===4){if(x.touched.dur)o.kept++;else o.changes.push({id:'c'+(k++),shot:x.id,field:'dur',from:x.dur,to:x.dur+1,st:'open'})}});
  const unc=F.uncovered(s)[0];
  o.proposals.push({id:'p1',action:unc?'Cover: '+unc.text.replace(/\.$/,''):'Insert: a cutaway the draft added',dur:3,anchor:unc?[unc.id]:[],st:'open'});
  if(a.length>=5)o.omitted.push(a[a.length-1].id);
  s.opts=o;F.spent+=s.est;return'options';
};
F.applyChange=(s,c)=>{const x=s.shots.find(y=>y.id===c.shot);F.act('Applied · '+(x.takes?x.takes+' take(s) now possibly out of date':'no work depended on it'),()=>{x[c.field]=c.to;if(x.takes)x.ood=true;c.st='applied'})};
F.applyAll=s=>{F.act('Applied all open changes',()=>{for(const c of s.opts.changes)if(c.st==='open'){const x=s.shots.find(y=>y.id===c.shot);x[c.field]=c.to;if(x.takes)x.ood=true;c.st='applied'}
  for(const p of s.opts.proposals)if(p.st==='open'){s.shots.push(mkShot({action:p.action,dur:p.dur,anchor:p.anchor,framing:true}));p.st='applied'}})};
F.acceptProposal=(s,p)=>{F.act('Added the proposed shot',()=>{s.shots.push(mkShot({action:p.action,dur:p.dur,anchor:p.anchor,framing:true}));p.st='applied'})};
F.dismiss=(it)=>{F.act('Dismissed · retired, not deleted',()=>{it.st='dismissed'})};
F.restoreIt=(it)=>{F.act('Restored',()=>{it.st='open'})};
F.closeOpts=s=>{F.act('Options closed · dismissed items stay in history',()=>{s.opts=null})};

// ---- batch draft: PLANS ONLY ----
F.scopeInfo=()=>{const ss=[...F.scope].map(F.byId).filter(Boolean);
  const total=+ss.reduce((a,s)=>a+s.est,0).toFixed(2),unknown=ss.some(s=>s.unknown);
  const nNew=ss.filter(s=>s.plan==='none'&&!s.shots.length).length,nLock=ss.filter(s=>s.locked).length;
  const known=+ss.filter(s=>!s.unknown).reduce((a,s)=>a+s.est,0).toFixed(2);
  const capBreach=known>F.cfg.capLeft;
  return{ss,total,known,unknown,count:ss.length,nNew,nLock,nRe:ss.length-nNew,capBreach,kind:spendKind({total,count:ss.length,unknown,capBreach})}};
F.runDraftAll=(done)=>{const info=F.scopeInfo(),before=F.snap();F.drafting=true;F.changed();
  setTimeout(()=>{let np=0,no=0,nd=0;
    for(const s of info.ss){if(s.plan==='none'&&!s.shots.length){F.genPlan(s);s.batch=true;np++}else{const r=F.makeOptions(s,'draft-all');if(r==='direct'){nd++}else no++}}
    F.drafting=false;F.scope=new Set();F.ticket=false;F.changed();
    toast('Drafted '+np+' new plan'+(np==1?'':'s')+(no?' · '+no+' redraft'+(no==1?'':'s')+' held as Options':'')+(nd?' · '+nd+' untouched applied':'')+' · no frames, worlds or takes',()=>{F.restore(before);F.changed()})},800)};
F.trimToCap=()=>{const ids=[...F.scope];while(F.scopeInfo().capBreach&&ids.length){F.scope.delete(ids.pop())}F.changed()};

// ---- ad-hoc and removed ----
F.moveAdhoc=(id,sid)=>{const s=F.byId(sid),x=F.adhoc.find(y=>y.id===id);F.act('Moved to scene '+F.num(s)+' · now an unanchored shot of that scene',()=>{F.adhoc=F.adhoc.filter(y=>y!==x);delete x.kind;x.anchor=[];x.movedFromAdhoc=true;s.shots.push(x)})};
F.newAdhoc=()=>{F.act('Added an ad-hoc shot · outside the film',()=>{F.adhoc.push(mkShot({kind:'B-roll',action:'New ad-hoc shot.',dur:4}))})};
F.bringBack=r=>{F.act('Brought back as scene '+Math.min(r.slot,F.scenes.length+1)+' · same id, work intact',()=>{F.removed=F.removed.filter(y=>y!==r);
  const s={id:r.id,line:r.line,time:r.time,excerpt:'(text from the Revision where it last appeared)',assets:['Marcus'],blocks:[{id:'b1',kind:'action',text:'(restored text)'}],plan:'plan',locked:false,est:.06,shots:r.shots,opts:null,nm:50,needs:[]};
  s.shots.forEach(x=>x.anchor=['b1']);F.scenes.splice(Math.min(r.slot-1,F.scenes.length),0,s)})};
F.adopt=(r,sid)=>{const s=F.byId(sid);F.act('Moved '+r.shots.length+' shots into scene '+F.num(s)+' · anchors to retired text marked input-retired',()=>{F.removed=F.removed.filter(y=>y!==r);r.shots.forEach(x=>{x.anchor=[];x.orphan=true;s.shots.push(x)})})};
F.build(false);
})();

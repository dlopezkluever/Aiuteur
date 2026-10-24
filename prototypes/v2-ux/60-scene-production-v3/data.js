/* #60 v3 prototype: ONE shared mock data module (assets with visual identity, Looks, Views, 20 scenes, hand-built scene 7). Throwaway. */
(()=>{
const MODELS={kling:{n:'Kling 3',rate:.07,max:6},veo:{n:'Veo 4',rate:.40,max:8},wan:{n:'Wan 3',rate:.04,max:12},exp:{n:'Experimental X',rate:null,max:6}};
const FRAME_PRICE=.04;
const L=(n,d,img=1,v={})=>({n,d,img,v});
const CV=[['front','Front'],['three','Three-quarter'],['profile','Profile'],['back','From behind']];
const PV=[['std','Standard'],['close','Close-up']];
const ASSETS={
 marta:{n:'Marta Reyes',t:'Character',views:CV,looks:{
  wet:L('Wet oilskin coat','Black oilskin coat darkened by rain, collar up, hair stuck to her temples.',1,{coat:'#14171c',under:'#c9c4b8',hair:'#2a1d17',style:'long',wet:1,collar:'up',skin:'#c9a07f',bg:210}),
  dry:L('Grey jacket, dry','Fitted grey wool jacket, collar open, hair pinned back, face drying.',1,{coat:'#7d838c',under:'#e6e0d2',hair:'#2a1d17',style:'bun',collar:'open',skin:'#c9a07f',bg:210}),
  black:L('Funeral black','Plain black wool dress with a high neck, hair pinned flat.',1,{coat:'#0f0f13',under:'#0f0f13',hair:'#2a1d17',style:'bun',skin:'#c9a07f',bg:260,dark:1})}},
 voss:{n:'Voss, night clerk',t:'Character',views:CV,looks:{
  tidy:L('Clerk, buttoned','Buttoned waistcoat, sleeve garters, pomaded hair.',1,{coat:'#4a463c',under:'#e8e2d2',vest:'#3d3a2c',hair:'#3a2b22',style:'slick',glasses:1,skin:'#e0b99a',bg:40}),
  rumpled:L('Clerk, unravelled','Same clothes, waistcoat open, hair fallen across his forehead, sweat at the collar.',0,{coat:'#4a463c',under:'#cfc8b4',vest:'#3d3a2c',open:1,hair:'#3a2b22',style:'messy',glasses:1,skin:'#e0b99a',bg:40}),
  tux:L('Formal tuxedo','Black dinner jacket, white shirt, black bow tie (the gala flashback).',1,{coat:'#101114',tux:1,hair:'#3a2b22',style:'slick',glasses:1,skin:'#e0b99a',bg:250,dark:1})}},
 office:{n:'Harbour Office',t:'Location',kind:'office',views:[['door','Door wall'],['window','Window wall'],['desk','Desk, top-down'],['wide','Full room']],looks:{
  lamp:L('Lamplit','Low timber room, one brass lamp pooling amber light on a green-baize desk, fog pressed against the window.',1,{lamp:true}),
  out:L('Lamp out','The same room with the brass lamp dead; only cold grey fog-light from the window.',0,{lamp:false}),
  morning:L('Grey morning','The room at first light, shutters open, everything pale and tidy.',1,{lamp:false,tone:'day'})}},
 lamp:{n:'Brass desk lamp',t:'Prop',kind:'lamp',views:PV,looks:{lit:L('Lit, intact','Round green-glass shade, brass stem, warm filament glow.',1,{}),cracked:L('Shade cracked','Shade split along the seam, glass gone, bulb dark.',0,{cracked:1,dark:1})}},
 ledger:{n:'Customs ledger',t:'Prop',kind:'ledger',views:PV,looks:{std:L('Open ledger','Cloth-bound ledger, columns in faded ink, one red circular stamp half-inked.')}},
 telegram:{n:'Telegram',t:'Prop',kind:'telegram',views:PV,looks:{std:L('Folded telegram','Yellow paper, folded once, pencil marks on the back.')}},
 quay:{n:'Quay in fog',t:'Location',kind:'quay',views:[['along','Along the quay'],['water','Water edge']],looks:{fog:L('Night fog','Wet stone quay, bollards swallowed by fog, one lamp far off.',1,{tone:'night'}),dawn:L('Dawn thinning','The fog lifting in a band at the waterline, first grey light.',0,{tone:'day'})}},
};
const POOL=[['Ines Calder','Character'],['Tomas Reed','Character'],['Old Pilot','Character'],['Night train','Location'],['Hotel lobby','Location'],['Border post','Location'],['Market square','Location'],['Rooftops','Location'],['Safehouse','Location'],['Signal flare','Prop'],['Brass key','Prop'],['Leather satchel','Prop']];
POOL.forEach(([n,t],i)=>{const kind=t==='Prop'?['flare','key','satchel'][i-9]:'gen';
 const cv=(night)=>t==='Character'?{...A.charV(n+night,night),bg:(A.hash(n)%360)}:{bg:A.hash(n)%360,tone:night?'night':'day',room:/train|lobby|safe/i.test(n)};
 ASSETS['g'+i]={n,t,kind,views:t==='Character'?CV:t==='Location'?[['a','Wide'],['b','Reverse']]:PV,looks:{a:L(t==='Character'?'Day wear':'Day','Standard presentation for '+n+'.',1,cv(0)),b:L(t==='Character'?'Night wear':'Night','Night variant of '+n+'.',i%2,cv(1))}}});

const NAMES=['Opening titles','Night train','Border post','Hotel lobby','The letter','Rain on the roof','The Harbour Office','Ferry crossing','Customs','Market','The chase','Rooftops','Safehouse','Interrogation','Dawn','Station','The offer','The bridge','Warehouse','Last crossing'];
const SLUG=['EXT. TITLES','INT. NIGHT TRAIN','EXT. BORDER POST','INT. HOTEL LOBBY','INT. HOTEL ROOM','EXT. ROOFTOP','INT. HARBOUR OFFICE','EXT. FERRY','INT. CUSTOMS HALL','EXT. MARKET','EXT. STREETS','EXT. ROOFTOPS','INT. SAFEHOUSE','INT. INTERROGATION ROOM','EXT. HARBOUR','INT. STATION','INT. SHIPPING OFFICE','EXT. BRIDGE','INT. WAREHOUSE','EXT. QUAY'];
const TIME=['NIGHT','NIGHT','DAWN','EVENING','NIGHT','NIGHT','NIGHT','DAWN','DAY','DAY','NIGHT','NIGHT','NIGHT','DAY','DAWN','DAY','DAY','DUSK','NIGHT','DAWN'];

function rng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

/* ---------- hand-built scene 7 ---------- */
const R=(a,pres,open,end,note,x={})=>({a,pres,open,end,note,ai:true,...x});
const CAM=(size,angle,move,lens,note='')=>({size,angle,move,lens,note});
const FR=(st,n=0,x={})=>({st,n,cur:Math.max(0,n-1),ap:st==='appr'?Math.max(0,n-1):null,refs:[],ov:{},pov:null,...x});
let tk=0;const T=(model,dur,x={})=>({id:'k'+(++tk),model,dur,...x});
function scene7(){
 const blocks=[
  {id:'b1',text:'The Harbour Office sits at the end of the quay like a lit match in the fog. Inside, one brass lamp holds the room together; everything else is shadow and paperwork.'},
  {id:'b2',text:'Marta Reyes comes in from the rain still wearing the oilskin, water running off the hem onto the boards. Voss, the night clerk, does not stand.'},
  {id:'b3',text:'“You\'re working late, Mr Voss.” He answers without quite looking up: “The tide doesn\'t keep office hours.”'},
  {id:'b4',text:'She does not sit. She lays the ledger open on his desk and turns pages until she finds the stamp, a red circle half-inked, and stays on it. Under the blotter, Voss slides a telegram out of her sight with two fingers.'},
  {id:'b5',text:'The stamp is round and the lamp is round and the lamp seems to know. It stutters; its green shade splits along the seam and the glass bursts outward in a soft ring. The room is a shade darker for good.'},
  {id:'b6',text:'Marta shrugs the wet coat from her shoulders and crosses to the window in one long unbroken walk, leaving the coat where it falls. Voss rises and follows as far as the door, never quite reaching her.'},
  {id:'b7',text:'Beyond the glass the harbour lies flat and grey. Marta watches it, dry now, a different woman from the one who walked in. In the dark pane, behind her, Voss\'s reflection waits.'},
 ];
 const sh=[];const add=s=>{sh.push(s);return s};
 add({id:'7A',name:'Fog over the quay',dur:5,hue:205,anchor:['b1'],
  action:'Slow push through fog along the quay, past dripping bollards and a tarred rope, toward the one lit window of the Harbour Office. Fog parts around the glass; the amber glow of the lamp inside is the only warm thing in the frame. The tide can be heard but not seen.',
  dialogue:[],location:'Quay in fog, exterior',direction:'Along the quay, looking toward the office window (north)',
  cam:CAM('Wide','Low, near the water','Slow push-in','28 mm','End on the window, centred, lamp visible.'),
  visual:'Teal-grey fog, single warm window as focal point, wet stone with long reflections.',sound:'Foghorn far off, slow water against the pilings, a rope creaking.',
  fp:'open+end',cont:{kind:'cut',mk:'',note:'Hard cut in from the scene 6 rooftop rain.',pin:null},
  roster:[R('quay','throughout','fog',null,'Fog thickens at the window as the camera arrives.'),R('office','end','lamp',null,'Only the lit window and wall are visible.')],
  refs:[],vp:{ov:null},
  fr:{open:FR('appr',3),end:FR('appr',2)},takes:[T('kling',5,{n:1}),T('kling',5,{n:2,guided:'slower push-in'})],selIdx:1});
 add({id:'7B',name:'Marta at the door (over Voss)',dur:6,hue:28,anchor:['b2','b3'],
  action:'Over Voss\'s shoulder as the office door opens. Marta Reyes stands in the frame in her rain-soaked oilskin, water dripping from the hem onto the boards; she pauses on the threshold, takes in the lamp, the ledger, the clerk who does not stand. She steps in and lets the door close behind her.',
  dialogue:[{who:'Marta',line:'You\'re working late, Mr Voss.',delivery:'Flat, tired courtesy; she is not asking a question.'}],
  location:'Harbour Office, interior',direction:'Door wall, from behind the desk (shot / reverse-shot pair, A side)',
  cam:CAM('Medium over-the-shoulder','Eye level','Static','35 mm','Voss\'s shoulder takes the left third; Marta right of centre.'),
  visual:'Wet black oilskin catching the lamp; amber key, cold fog light from the door seam.',sound:'Rain on the roof, the door latch, drip on timber, the lamp\'s faint hum.',
  fp:'open+end',cont:{kind:'newview',mk:'',note:'Same room as 7A, now inside.',pin:null},
  roster:[R('marta','throughout','wet',null,'Stops at the threshold, then steps in.'),R('voss','throughout','tidy',null,'Back to camera, does not stand.'),R('office','throughout','lamp',null,''),R('lamp','throughout','lit',null,'On the desk, camera right.'),R('ledger','throughout','std',null,'Closed, on the desk corner.',{ai:false})],
  refs:[{id:'r1',scope:'shot',type:'asset',label:'Marta Reyes, wet oilskin identity image',subject:'marta'}],vp:{ov:null},
  fr:{open:FR('appr',2,{refs:[]}),end:FR('cand',2)},takes:[T('kling',6,{n:1}),T('kling',6,{n:2}),T('kling',6,{n:3,override:1})],selIdx:null});
 add({id:'7C',name:'Voss answers (reverse)',dur:5,hue:200,anchor:['b3'],
  action:'Reverse of 7B: Voss at his desk, lit from below by the lamp. He keeps writing a beat too long, then lifts his eyes. His answer is too quick, a practised line. Behind him, the window is solid fog.',
  dialogue:[{who:'Voss',line:'The tide doesn\'t keep office hours.',delivery:'Dry, a little too fast; he has said this before.'}],
  location:'Harbour Office, interior',direction:'Window wall, from the door side (reverse pair, B side)',
  cam:CAM('Medium close-up over-the-shoulder','Eye level','Static','50 mm','Marta\'s wet shoulder in soft focus, left third.'),
  visual:'Uplit face, green lamp-glass reflected in his spectacles, fog as a flat grey wall.',sound:'Pen scratch, then silence; the lamp hum a half-step louder.',
  fp:'open+end',cont:{kind:'newview',mk:'',note:'Reverse of 7B, same eyeline axis.',pin:null},
  roster:[R('voss','throughout','tidy',null,'Keeps writing, then looks up.'),R('marta','open','wet',null,'Shoulder only, soft focus.'),R('office','throughout','lamp',null,''),R('lamp','throughout','lit',null,'')],
  refs:[],vp:{ov:null},fr:{open:FR('appr',1),end:FR('appr',2)},takes:[T('kling',5,{n:1}),T('kling',5,{n:2,guided:'warmer lamp, shallower focus'}),T('veo',5,{n:3,late:'arrived after cancel',fresh:1})],selIdx:0});
 add({id:'7D',name:'Telegram under the blotter',dur:3,hue:48,anchor:['b4'],
  action:'Cutaway, tight on the desk. While Marta\'s attention is on the ledger off frame, two of Voss\'s fingers slide a folded yellow telegram under the green blotter. The pencil marks on its back show for half a second.',
  dialogue:[],location:'Harbour Office, desk surface',direction:'Top-down, slightly from Voss\'s side',
  cam:CAM('Insert, close-up','High angle, near top-down','Static','85 mm','A cutaway: not part of the Marta/Voss axis.'),
  visual:'Green baize, yellow paper, lamp edge-light on the fingernails.',sound:'Paper dragging on baize; a held breath.',
  fp:'open',cont:{kind:'newview',mk:'',note:'Cutaway; returns to the ledger in 7E.',pin:null},
  roster:[R('telegram','throughout','std',null,'Slides under the blotter.'),R('voss','throughout','tidy',null,'Hand only, two fingers.'),R('office','open','lamp',null,'Desk surface only.')],
  refs:[],vp:{ov:null},fr:{open:FR('cand',3)},takes:[],selIdx:null});
 add({id:'7E',name:'The ledger stamp',dur:5,hue:350,anchor:['b4'],
  action:'Close on the open ledger as Marta\'s hand turns the pages: columns of faded ink, a water stain, then a red circular stamp, half-inked, which fills the middle of the frame. She stops. Her thumb rests beside it without touching.',
  dialogue:[],location:'Harbour Office, desk',direction:'Over Marta\'s hand, looking down at the desk',
  cam:CAM('Close-up','High angle','Slow drift in','85 mm','Stamp ends circular and centred, for the match cut.'),
  visual:'Faded ink, one saturated red circle, lamp reflected as a soft ring on the paper.',sound:'Pages turning; the stamp\'s presence is a drop in the room tone.',
  fp:'open+end',cont:{kind:'continues',mk:'',note:'Picks up from 7C with Marta moving around the desk.',pin:null},
  roster:[R('ledger','throughout','std',null,'Pages turn to the stamp.'),R('marta','throughout','wet',null,'Hand and cuff only; wet sleeve.'),R('office','open','lamp',null,'')],
  refs:[],vp:{ov:null},fr:{open:FR('appr',2),end:FR('appr',1)},takes:[T('kling',5,{n:1})],selIdx:null,fail:{text:'Timed out · you may have been charged',timedOut:1}});
 add({id:'7F',name:'The lamp cracks (match cut)',dur:6,hue:98,anchor:['b5'],
  action:'Match cut from the red stamp to the round green lamp shade, same size, same centre. The filament stutters. A hairline runs across the shade, the seam splits, and the glass bursts outward in a slow ring; shards hang and fall across the desk. By the end of the shot the filament is dark and a fine dust of glass and ash hangs in the air.',
  dialogue:[],location:'Harbour Office, desk',direction:'Desk-level, facing the lamp from Voss\'s side',
  cam:CAM('Close-up','Eye level with the lamp','Static, lock-off','75 mm','Lamp shade is the same size and position as the stamp in 7E.'),
  visual:'Green glass, amber filament, glass shards catching the last glow; end frame much darker.',sound:'Filament buzz, a high crack, tinkling glass, then the room tone sinks.',
  fp:'open+end',cont:{kind:'match',mk:'graphic',note:'Round red stamp becomes the round green lamp shade.',pin:'7E:end'},
  roster:[R('lamp','throughout','lit','cracked','Shade splits and bursts. Persistent: the lamp stays broken.',{wb:'ask'}),R('office','throughout','lamp',null,'Dust of glass and ash hangs in the air at the ending. Gone by the next shot.',{trans:'Glass dust and ash hang in the air; settled by 7G',later:'out'}),R('ledger','open','std',null,'Edge of the ledger in the frame at the start only.')],
  refs:[],vp:{ov:null},fr:{open:FR('cand',2,{stale:1}),end:FR('none')},takes:[T('kling',6,{n:1,fresh:1})],selIdx:null});
 add({id:'7G',name:'Marta crosses to the window (long)',dur:18,hue:160,anchor:['b6'],parts:3,
  action:'One unbroken tracking shot in three parts. Part 1: Marta shrugs off the wet oilskin and lets it fall to the boards. Part 2: she walks the length of the room, past the broken lamp and the desk, glass crunching under her boots; Voss rises and follows to the door. Part 3: she arrives at the window and stops, dry, facing the harbour, as Voss stops at the door behind her.',
  dialogue:[],location:'Harbour Office, interior (full room)',direction:'From the door wall, tracking left to the window wall',
  cam:CAM('Medium full','Eye level','Lateral track then settle','35 mm','Continuous; three 6 s parts chained on the last frame of each.'),
  visual:'Wet black coat dropped, grey jacket revealed; low amber light now only from the window and dying filament.',sound:'Glass crunch, boots on boards, coat hitting the floor, the foghorn through glass.',
  fp:'open+end+key',cont:{kind:'continues',mk:'',note:'Continues from 7F; dust has settled.',pin:null},
  roster:[R('marta','throughout','wet','dry','Coat comes off in part 1; she is in the grey jacket from here on.',{wb:'writeback'}),R('voss','leaves','tidy',null,'Rises and follows as far as the door, never reaching her.'),R('office','throughout',null,null,'Lamp out from here on; light from the window only.'),R('lamp','throughout',null,null,'Dark, broken on the desk.'),R('ledger','open','std',null,'Open on the desk until Voss crosses.')],
  refs:[{id:'r2',scope:'end',type:'cineblock',label:'CineBlock capture, window-wall blocking',capture:1,desc:'',assetsOk:false}],vp:{ov:null},
  fr:{open:FR('appr',2,{stale:1}),key:FR('none'),end:FR('none',0)},takes:[T('kling',18,{n:1,parts:3,partial:2})],selIdx:null,partial:{done:2,of:3},fail:{text:'Part 3 failed · may have been charged'}});
 add({id:'7H',name:'Marta, clean medium (reference shot)',dur:5,hue:30,anchor:['b6'],
  action:'A clean medium shot of Marta at the window, same framing and screen position as the 7B over-the-shoulder, but without Voss\'s shoulder: just Marta, now in the grey jacket, one hand on the cold sill. She does not turn around.',
  dialogue:[],location:'Harbour Office, window side',direction:'Window wall, from the room looking at Marta (south-west)',
  cam:CAM('Medium','Eye level','Static','35 mm','Recompose 7B: remove Voss, keep Marta\'s position and eyeline.'),
  visual:'Grey jacket, cold window light on one side of her face, the broken lamp a dark shape behind.',sound:'Foghorn muffled through glass, her breathing, the room settled.',
  fp:'open+end',cont:{kind:'cut',mk:'',note:'',pin:null},
  roster:[R('marta','throughout',null,null,'Hand on the sill.'),R('office','throughout',null,null,''),R('lamp','open',null,null,'Blurred shape behind her.')],
  refs:[{id:'r3',scope:'open',type:'shot',label:'7B opening frame',srcShot:'7B',srcRole:'open',recompose:'Same framing and Marta position, but remove Voss\'s shoulder and use a clean medium; she is now in the dry grey jacket, not the wet oilskin.'}],vp:{ov:null},
  fr:{open:FR('none'),end:FR('none')},takes:[],selIdx:null});
 add({id:'7I',name:'Harbour from the window',dur:6,hue:180,anchor:['b7'],
  action:'What Marta sees: the harbour, flat and grey, three moored boats, a distant crane. The fog is thinning in one band at the waterline. A gull crosses once. The window glass shows a faint ghost of the room.',
  dialogue:[],location:'Harbour, seen through the window',direction:'Out of the window wall, looking over the water',
  cam:CAM('Wide','Eye level, through glass','Static','24 mm','Window frame defines the edge; slight reflection.'),
  visual:'Flat grey light, desaturated blue-green, the thin band of lighter fog.',sound:'Distant crane chain, gulls, foghorn closer now.',
  fp:'open+end',cont:{kind:'cut',mk:'',note:'',pin:null},
  roster:[R('quay','throughout','fog',null,'Moored boats beyond.'),R('voss','end',null,null,'Only a faint reflection at the very end.',{later:'rumpled'})],
  refs:[],vp:{ov:null},fr:{open:FR('appr',1),end:FR('cand',2)},takes:[T('kling',6,{n:1})],selIdx:0});
 add({id:'7J',name:'Voss in the dark pane',dur:4,hue:260,anchor:['b7'],
  action:'Marta from behind at the window; in the dark glass in front of her, Voss\'s reflection waits at the door, his waistcoat open and hair fallen across his forehead. He does not move. She does not turn. The shot holds.',
  dialogue:[],location:'Harbour Office, window',direction:'Facing the window from inside; Voss only in reflection',
  cam:CAM('Medium close-up','Eye level','Static, slow rack to reflection','50 mm','Rack from Marta\'s shoulder to the reflection.'),
  visual:'Near-dark; Marta a silhouette, Voss\'s reflection faint blue-white.',sound:'Everything drops out except the foghorn.',
  fp:'skip',cont:{kind:'continues',mk:'',note:'',pin:null},
  roster:[R('marta','throughout',null,null,'Seen from behind.'),R('voss','throughout',null,null,'Visible only as a reflection.'),R('office','throughout',null,null,'')],
  refs:[],vp:{ov:null},fr:{},takes:[],selIdx:null,gen:{left:6}});
 const VW={'7A':{quay:'along',office:'window'},'7B':{marta:'front',voss:'back',office:'door',lamp:'std',ledger:'std'},'7C':{voss:'front',marta:'back',office:'window',lamp:'std'},'7D':{telegram:'close',voss:'close',office:'desk'},'7E':{ledger:'close',marta:'three',office:'desk'},'7F':{lamp:'close',office:'desk',ledger:'std'},'7G':{marta:'three',voss:'back',office:'wide',lamp:'std',ledger:'std'},'7H':{marta:'three',office:'window',lamp:'std'},'7I':{quay:'water',voss:'front'},'7J':{marta:'back',voss:'front',office:'window'}};
 sh.forEach(s=>{s.roster.forEach(r=>{r.view=VW[s.id]?.[r.a]||ASSETS[r.a].views[0][0]});});
 sh.forEach(s=>{s.takes.forEach(t=>t.id=t.id);if(s.selIdx!=null&&s.takes[s.selIdx])s.sel=s.takes[s.selIdx].id;delete s.selIdx;s.ai={action:true,cam:true,dir:true,fp:true,cont:true,dur:s.id!=='7G'};});
 sh.forEach(s=>{(s.fr||{});});
 sh[0].fr.open.st='appr';
 sh.find(s=>s.id==='7G').final=0;
 sh.find(s=>s.id==='7A').final=1;
 return {id:7,sl:SLUG[6],tm:TIME[6],name:NAMES[6],blocks,assets:['marta','voss','office','lamp','ledger','telegram','quay'],shots:sh,plan:'drafted',est:.06,acc:false,locked:false};
}

/* ---------- generic scenes ---------- */
const ACT=['{a} crosses {l} slowly and stops where the light ends; the camera holds on {a2} watching from the far side. Neither speaks for a full beat.','{a} reaches for {p} and hesitates, fingers an inch away. The room is still; only a clock marks the seconds. {a2} half rises from the chair.','Wide on {l}. {a} and {a2} stand apart, a table between them. {a} slides {p} across the surface and steps back.','Close on {a}\'s face as the news lands. A small tightening around the eyes, then composure. Behind, {l} stays out of focus.','{a2} watches from the doorway of {l}, then turns and leaves without a sound; the door stays half open.','Tracking behind {a} through {l}, past crates and hanging lamps, until a figure steps from the shadow and blocks the way.','Insert on {p}: a gloved hand lifts it, turns it once in the light, and sets it down in a different place.'];
const SHN=['Crossing the room','The hesitation','Across the table','News lands','Watching from the doorway','Following through','Insert on the object'];
const DLG=[['Not yet.','Quiet, final.'],['You knew.','Not an accusation; a tired statement.'],['Then we go now.','Low and urgent, already moving.'],['Say it again.','Disbelief held back.']];
const CAMS=[CAM('Wide','Eye level','Static','28 mm'),CAM('Medium','Eye level','Slow push-in','35 mm'),CAM('Close-up','Slightly low','Static','85 mm'),CAM('Medium full','Eye level','Tracking','35 mm'),CAM('Over-the-shoulder','Eye level','Static','50 mm')];
function genScene(no,force){
 const r=rng(no*7919),pool=Object.keys(ASSETS).filter(k=>k[0]==='g'),pickT=t=>{const p=pool.filter(k=>ASSETS[k].t===t);return p[Math.floor(r()*p.length)]};
 const c1=pickT('Character');let c2=pickT('Character');if(c2===c1)c2=pool.filter(k=>ASSETS[k].t==='Character'&&k!==c1)[0];
 const assets=[c1,c2,pickT('Location'),pickT('Prop')];
 const lk=['NIGHT','DAWN','DUSK'].includes(TIME[no-1])?'b':'a';
 const chars=assets.filter(a=>ASSETS[a].t==='Character'),locs=assets.filter(a=>ASSETS[a].t==='Location'),props=assets.filter(a=>ASSETS[a].t==='Prop');
 const nm=k=>ASSETS[k||assets[0]].n;
 const blocks=[1,2,3].map(i=>({id:'b'+i,text:`${NAMES[no-1]}: ${nm(chars[0]||assets[0])} and ${nm(chars[1]||assets[1])} meet in ${nm(locs[0]||assets[2])}. ${['Tension holds the room.','Something unsaid sits between them.','The light changes as they speak.'][i-1]} Pressure builds until one of them moves.`}));
 const none=!force&&[14,16,17,19].includes(no);
 const sc={id:no,sl:SLUG[no-1],tm:TIME[no-1],name:NAMES[no-1],blocks,assets,shots:[],plan:none?'none':'drafted',est:no===14?.03:no===16?.04:no===17?.08:no===19?.12:.05,acc:no<7||(no>7&&r()<.55),locked:no===3};
 if(none)return sc;
 const n=9+Math.floor(r()*4);
 for(let i=0;i<n;i++){
  const A=nm(chars[0]||assets[0]),A2=nm(chars[1]||assets[1]),Lc=nm(locs[0]||assets[2]),P=nm(props[0]||assets[3]||assets[0]);
  const has=r()<.7,d=DLG[Math.floor(r()*DLG.length)];
  const fp=['open','open+end','open+end','skip'][Math.floor(r()*4)];
  const roles=fp==='skip'?[]:fp==='open'?['open']:['open','end'];
  const fr={};roles.forEach(k=>{const p=r();fr[k]=FR(p<.55?'appr':p<.8?'cand':'none',p<.8?1+Math.floor(r()*2):0)});
  const s={id:no+'ABCDEFGHIJKLMN'[i],name:SHN[Math.floor(r()*SHN.length)],dur:3+Math.floor(r()*5),hue:Math.floor(r()*360),anchor:['b'+(1+i%3)],
   action:ACT[Math.floor(r()*ACT.length)].replace(/\{a2\}/g,A2).replace(/\{a\}/g,A).replace(/\{l\}/g,Lc).replace(/\{p\}/g,P),
   dialogue:has?[{who:A.split(' ')[0],line:d[0],delivery:d[1]}]:[],location:Lc+', interior',direction:['Door wall','Window wall','From behind the table','Reverse axis'][Math.floor(r()*4)],
   cam:{...CAMS[Math.floor(r()*CAMS.length)]},visual:'Motivated practical light; shallow depth; muted palette.',sound:'Room tone, one distinct foley accent.',
   fp,cont:{kind:i===0?'cut':['continues','newview','cut'][Math.floor(r()*3)],mk:'',note:'',pin:null},
   roster:[R(chars[0],'throughout',lk,null,'',{ai:!sc.acc,view:['front','three','profile'][i%3]}),R(locs[0],'throughout',lk,null,'',{ai:!sc.acc,view:i%2?'b':'a'})].concat(r()<.55?[R(chars[1],r()<.5?'throughout':'enters',lk,null,'',{ai:!sc.acc,view:'three'})]:[]).concat(r()<.5?[R(props[0],'throughout','a',null,'',{ai:!sc.acc,view:'std'})]:[]),
   refs:[],vp:{ov:null},fr,takes:[],ai:{action:!sc.acc,cam:!sc.acc,dir:!sc.acc,fp:!sc.acc,cont:!sc.acc,dur:!sc.acc}};
  const p=r();
  if(p>.3){const c=1+Math.floor(r()*3);for(let j=0;j<c;j++)s.takes.push(T('kling',s.dur,{n:j+1}));if(r()<.7)s.sel=s.takes[Math.floor(r()*c)].id}
  else if(p<.05)s.fail={text:'Failed, not charged'};
  sc.shots.push(s);
 }
 return sc;
}
const scenes={};for(let i=1;i<=20;i++)scenes[i]=i===7?scene7():genScene(i);
window.D={genScene,MODELS,FRAME_PRICE,ASSETS,scenes,fresh:()=>{tk=0;const o={};for(let i=1;i<=20;i++)o[i]=i===7?scene7():genScene(i);return o},rng};
})();

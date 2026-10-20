// PROTOTYPE (throwaway) — shared mock data for Wayfinder #56 navigation prototypes. Not production code.
const STATE = new URLSearchParams(location.search).get('state') || 'mid';
const PHASES = [
 {id:'input',n:'Input',kind:'M',grp:'story',d:'Source material, roles, project settings.'},
 {id:'interview',n:'Interview',kind:'R',grp:'story',d:'Aiuteur asks until it understands; answers become Established Facts.'},
 {id:'treatment',n:'Treatment',kind:'R/B',grp:'story',d:'The story as continuous prose; pick or shape one.'},
 {id:'beats',n:'Beat Sheet',kind:'R/B',grp:'story',d:'Structured chronological story events.'},
 {id:'narrative',n:'Master Narrative',kind:'M',grp:'story',d:'The single canonical, scene-organised story.'},
 {id:'world',n:'World Definition',kind:'M*',grp:'world',d:'Characters, locations, props, extras, style, named looks.'},
 {id:'scenes',n:'Scenes & Shots',kind:'M',grp:'prod',d:'Shot plan per scene.'},
 {id:'previs',n:'Visual Direction',kind:'O',grp:'prod',d:'Optional composition / blocking references.'},
 {id:'frames',n:'Frames',kind:'R',grp:'prod',d:'Image development before video.'},
 {id:'takes',n:'Takes',kind:'M',grp:'prod',d:'Video generation; every take kept.'},
 {id:'audio',n:'Voice & Audio',kind:'O',grp:'prod',d:'Voices, performance, sound.'},
 {id:'review',n:'Review & Export',kind:'M',grp:'review',d:'Watch as a sequence, fix, export.'}];
// status: done | prog | todo | skipped (by creator) | bypassed (by supplied material) | optional | defer
const PH_STATUS = STATE==='new' ? {input:'prog'} : {
 input:'done',interview:'skipped',treatment:'bypassed',beats:'bypassed',narrative:'done',
 world:'prog',scenes:'prog',previs:'optional',frames:'prog',takes:'prog',audio:'optional',review:'prog'};
const PH_NOTE = STATE==='new' ? {} : {
 input:'Screenplay (42 pp) + 2 reference files',
 interview:'Skipped by you · 4 gaps filled by AI, recorded as AI-made',
 treatment:'Not needed — your screenplay became the Master Narrative',
 beats:'Not needed — your screenplay became the Master Narrative',
 narrative:'Converted from screenplay · accepted Oct 18',
 world:'11 of 16 defined · 3 deferred · 2 missing',
 scenes:'20 of 22 scenes planned',previs:'Used on 3 shots',frames:'96 of 165 shots',takes:'61 selected',audio:'Not started (native dialogue in takes)',review:'Playable now · 104 shots missing'};
const SC_TITLES=['Cold open: the lease','Landlord arrives','The inspection','Mr. Pell’s speech','Hallway argument','The cat incident','Rent-day montage','Basement meeting','The loophole','Neighbour’s offer','Midnight call','Roof confrontation','Chase through lobby','Elevator stand-off','The signing','Power cut','Tenant uprising','Courtroom sketch','The twist','Landlord’s confession','Cheque on the stairs','Tag: new tenant'];
const COUNTS=[8,9,7,10,8,9,8,7,9,10,8,9,8,7,9,8,10,9,8,8,0,0];
function rng(s){return()=> (s=(s*1664525+1013904223)%4294967296)/4294967296}
const SHOTS=[]; const SCENES=[];
(function(){
 const r=rng(7);
 COUNTS.forEach((c,i)=>{
  const sc={i,n:i+1,title:SC_TITLES[i],slug:(i%3?'INT.':'EXT.')+' '+['APARTMENT 4B','LOBBY','ROOFTOP','BASEMENT','STAIRWELL'][i%5]+' – '+(i%4?'DAY':'NIGHT'),shots:[],dur:0};
  for(let k=0;k<c;k++){
   let st;
   if(STATE==='new') st='unplanned';
   else if(i<6) st='selected';
   else if(i<9){ const x=r(); st=x<.45?'selected':x<.65?'review':x<.8?'generating':x<.9?'failed':'framed'; }
   else if(i<14){ const x=r(); st=x<.15?'review':x<.55?'framed':'planned'; }
   else st='planned';
   const sh={id:(i+1)+'.'+(k+1),sc:i,k,st,dur:+(2+r()*8).toFixed(1),takes:st==='selected'?1+Math.floor(r()*3):st==='review'?2+Math.floor(r()*2):st==='failed'?1:0,
    stale:(i===4||i===5)&&k<3, hue:Math.floor(r()*360), title:['Wide establishing','Close on hands','Two-shot dialogue','Reaction','Over-the-shoulder','Insert: letter','Tracking move','Low angle landlord','Cutaway: cat','Final beat'][k%10]};
   if(STATE==='new') sh.st='unplanned';
   sc.shots.push(sh); SHOTS.push(sh); sc.dur+=sh.dur;
  }
  if(STATE==='new') sc.shots=[],sc.dur=0;
  SCENES.push(sc);
 });
 if(STATE==='new'){SHOTS.length=0;}
})();
const SHOT_STATES={unplanned:['No shot plan','#d9d9d9'],planned:['Planned','#aeb9c9'],framed:['Framed','#3b82c4'],generating:['Generating…','#e0a31f'],review:['Takes ready — pick one','#7b5cc9'],selected:['Selected','#2f8f5b'],failed:['Failed — retry','#d0453b']};
function scProg(sc){const t={};sc.shots.forEach(s=>t[s.st]=(t[s.st]||0)+1);return t}
function totals(){const t={};SHOTS.forEach(s=>t[s.st]=(t[s.st]||0)+1);return t}
function fmt(sec){const m=Math.floor(sec/60),s=Math.round(sec%60);return m+':'+String(s).padStart(2,'0')}
const ENT=[['Maren (tenant)','character','defined'],['Mr. Pell (landlord)','character','defined'],['Dot (neighbour)','character','defined'],['Cat “Verdict”','character','defined'],['Building lobby','location','defined'],['Apartment 4B','location','defined'],['Rooftop','location','defined'],['Basement','location','missing'],['Stairwell','location','missing'],['Lease document','prop','defined'],['Brass keys','prop','defined'],['Cheque','prop','defer'],['Tenant crowd','extras','defined'],['Courtroom','location','defer'],['Judge','character','defer'],['Visual style: “faded sitcom”','style','defined'],['Maren — rain look','look','defined']];
const SHOT_TEXT={action:'Maren holds the lease up to the window light, squinting; Mr. Pell’s shadow slides across the paper from the doorway.',dialogue:'PELL: “Page nine, subsection C. You’ll want your glasses.”',cam:'Medium close-up · slight low angle · slow push-in',ents:['Maren','Mr. Pell','Lease document','Apartment 4B']};

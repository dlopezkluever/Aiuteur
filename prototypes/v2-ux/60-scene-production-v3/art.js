/* Mock visual identity images: portraits, location views, props, frames, CineBlock wireframes, glyphs. All inline SVG, generated from data so Looks and Views are visibly different. Throwaway. */
/* the shared kit's h() flattens one level; nested map() results need deep flattening */
{const h0=window.h;window.h=(t,at,...k)=>h0(t,at,...k.flat(Infinity))}
(()=>{
const A={};let uidn=0;const uid=p=>p+(++uidn);
const hsl=(h,s,l)=>`hsl(${((h%360)+360)%360} ${s}% ${l}%)`;
function hash(str){let h=2166136261;for(const c of String(str)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rnd(seed){let a=seed|0;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
A.hash=hash;
A.el=(svg,cls='')=>{const d=document.createElement('div');d.className='art '+cls;d.innerHTML=svg;return d};
const wrap=(w,h,inner,extra='')=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" ${extra}>${inner}</svg>`;

/* ---- people ---- */
const SKINS=['#c9a07f','#e0b99a','#a97c5c','#8d5f42','#d9b08c','#f0c9a6'];
const HAIRS=['#2a1d17','#3a2b22','#171415','#6b4a2c','#8b8680','#4a2c20'];
const COATS=['#2b3a4a','#4a3a2e','#3a4a3a','#5a2f35','#34303f','#4b4a44'];
A.charV=(seed,night)=>{const r=rnd(hash(seed));return{skin:SKINS[Math.floor(r()*SKINS.length)],hair:HAIRS[Math.floor(r()*HAIRS.length)],style:['short','long','bun','slick'][Math.floor(r()*4)],coat:night?['#1b2230','#2a1d23','#1c2a24'][Math.floor(r()*3)]:COATS[Math.floor(r()*COATS.length)],under:night?'#8a8f9a':'#d8d2c2'}};

/* figure drawn around head centre (0,0), head radius ~14. full => legs added */
function figure(v,view='front',o={}){
 const{skin='#c9a07f',hair='#2a1d17',style='short',coat='#334',under='#ddd',wet,blood,glasses,collar,tux,vest,open}=v;
 const back=view==='back',prof=view==='profile',three=view==='three';
 const dx=three?2.5:0;
 let g='';
 const bw=prof?20:34;
 if(o.full)g+=`<rect x="${-bw*.55}" y="68" width="${bw*.45}" height="58" fill="${tux?'#0e0f12':coat}" opacity=".92"/><rect x="${bw*.1}" y="68" width="${bw*.45}" height="58" fill="${tux?'#0e0f12':coat}" opacity=".85"/>`;
 const bodyPath=prof?`M-20 72 L-17 32 Q-13 22 0 20 Q12 22 16 32 L22 72Z`:`M${-bw} 72 Q${-bw} 30 -13 22 L13 22 Q${bw} 30 ${bw} 72Z`;
 g+=`<path d="${bodyPath}" fill="${coat}"/>`;
 g+=`<path d="${bodyPath}" fill="url(#shade)" opacity=".55"/>`;
 if(!back&&!prof){
  if(tux){g+=`<path d="M-9 22 L0 52 L9 22Z" fill="#f2efe8"/><path d="M-13 22 L-3 54 L-12 60Z M13 22 L3 54 L12 60Z" fill="#23262d"/><path d="M-6 25 L0 29 L-6 33Z M6 25 L0 29 L6 33Z" fill="#0b0c0f"/>`}
  else{g+=`<path d="M-9 22 L0 ${vest?52:46} L9 22Z" fill="${under}"/>`;
   if(vest){const op=open;g+=op?`<path d="M-17 28 L-9 66 L-1 70 L-4 38Z M17 28 L9 66 L1 70 L4 38Z" fill="${vest}"/>`:`<path d="M-15 26 L-1 36 L-1 70 L-17 70Z M15 26 L1 36 L1 70 L17 70Z" fill="${vest}"/><circle cx="-3" cy="44" r="1.3" fill="#c8b070"/><circle cx="-3" cy="54" r="1.3" fill="#c8b070"/><circle cx="-3" cy="63" r="1.3" fill="#c8b070"/>`}
   else if(collar==='open')g+=`<path d="M-12 22 L0 40 L-9 24Z M12 22 L0 40 L9 24Z" fill="${coat}" opacity=".7"/><path d="M-10 21 L-1 38 L-14 28Z M10 21 L1 38 L14 28Z" fill="#0003"/>`;
  }
  if(blood){g+=`<path d="M-6 38 q4 -3 7 2 q4 5 -1 12 q-4 5 -8 0 q-3 -6 2 -14z" fill="#8a1c1c"/><circle cx="9" cy="48" r="2.6" fill="#a02424"/><circle cx="-12" cy="58" r="1.8" fill="#8a1c1c"/><path d="M-1 30 q2 7 -1 12" stroke="#a02424" stroke-width="1.6" fill="none"/>`}
 }
 if(collar==='up'||wet&&collar!=='open'){g+=`<path d="M-15 24 L-10 8 L-3 22Z M15 24 L10 8 L3 22Z" fill="${coat}"/><path d="M-15 24 L-10 8 L-3 22Z M15 24 L10 8 L3 22Z" fill="#fff" opacity=".07"/>`}
 if(wet){g+=`<path d="M-26 40 q6 -6 10 4 M8 34 q8 -4 12 6 M-8 62 q4 -4 9 2" stroke="#9fb7c9" stroke-width="1" fill="none" opacity=".45"/><circle cx="-20" cy="56" r="1.1" fill="#a9c1d4" opacity=".8"/><circle cx="18" cy="62" r="1.1" fill="#a9c1d4" opacity=".8"/><circle cx="-6" cy="68" r="1" fill="#a9c1d4" opacity=".8"/>`}
 g+=`<rect x="-5" y="12" width="10" height="12" fill="${skin}"/><rect x="-5" y="12" width="10" height="12" fill="#0004"/>`;
 // head
 const hx=dx;
 g+=`<ellipse cx="${hx}" cy="0" rx="${prof?11.5:13}" ry="15" fill="${skin}"/>`;
 if(prof)g+=`<path d="M${hx+10} -2 l5 4 l-5 2z" fill="${skin}"/>`;
 if(three)g+=`<path d="M${hx+11} -1 l3 3 l-3 1z" fill="${skin}"/>`;
 g+=`<ellipse cx="${hx}" cy="0" rx="13" ry="15" fill="url(#shade)" opacity=".35"/>`;
 // hair
 const hc=wet?'#101215':hair;
 if(back){g+=`<ellipse cx="0" cy="-1" rx="14" ry="16.5" fill="${hc}"/>`;if(style==='bun')g+=`<circle cx="0" cy="-15" r="6" fill="${hc}"/>`}
 else{
  if(style==='long'||wet&&style!=='slick'&&style!=='short')g+=`<path d="M${-14+hx} 2 Q${-16+hx} -18 ${hx} -17 Q${16+hx} -18 ${14+hx} 2 L${16+hx} 24 L${12+hx} 24 L${11+hx} -2 Q${hx} -9 ${-11+hx} -2 L${-12+hx} 24 L${-16+hx} 24Z" fill="${hc}"/>`;
  else if(style==='bun')g+=`<path d="M${-13+hx} -2 Q${-14+hx} -17 ${hx} -16 Q${14+hx} -17 ${13+hx} -2 Q${hx} -10 ${-13+hx} -2Z" fill="${hc}"/><circle cx="${hx}" cy="-19" r="5.5" fill="${hc}"/>`;
  else if(style==='messy')g+=`<path d="M${-14+hx} 0 Q${-15+hx} -18 ${hx} -17 Q${15+hx} -18 ${14+hx} 0 Q${10+hx} -6 ${6+hx} -3 L${4+hx} 4 L${1+hx} -4 L${-4+hx} 3 L${-6+hx} -4 Q${-10+hx} -7 ${-14+hx} 0Z" fill="${hc}"/>`;
  else if(style==='slick')g+=`<path d="M${-13.5+hx} -1 Q${-15+hx} -18 ${hx} -17 Q${15+hx} -18 ${13.5+hx} -1 Q${6+hx} -11 ${-3+hx} -9 Q${-9+hx} -8 ${-13.5+hx} -1Z" fill="${hc}"/><path d="M${-3+hx} -9 Q${5+hx} -14 ${13+hx} -3" stroke="#fff" stroke-opacity=".18" fill="none"/>`;
  else g+=`<path d="M${-13.5+hx} 0 Q${-15+hx} -17 ${hx} -16.5 Q${15+hx} -17 ${13.5+hx} 0 Q${hx} -8 ${-13.5+hx} 0Z" fill="${hc}"/>`;
  if(glasses&&!prof)g+=`<g stroke="#101010" stroke-width="1.1" fill="#9fc6c433"><circle cx="${-5+hx}" cy="1" r="3.8"/><circle cx="${5+hx}" cy="1" r="3.8"/><path d="M${-1.2+hx} 1h2.4" fill="none"/></g>`;
  if(!prof)g+=`<path d="M${-4+hx} 9 q4 2 8 0" stroke="#0004" stroke-width="1" fill="none"/>`;
  if(wet)g+=`<circle cx="${-9+hx}" cy="6" r="1" fill="#b8cfdf" opacity=".8"/><circle cx="${8+hx}" cy="10" r="1" fill="#b8cfdf" opacity=".8"/>`;
  if(blood)g+=`<path d="M${6+hx} -4 q3 2 1 6" stroke="#8a1c1c" stroke-width="1.5" fill="none"/>`;
 }
 return g;
}
const SHADE='<linearGradient id="shade" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></linearGradient>';
A.lookV=(a,l)=>{const L=D.ASSETS[a]?.looks[l];return L?.v||{}};

A.portrait=(a,l,view='front',o={})=>{
 const as=D.ASSETS[a],v=A.lookV(a,l),h=hash(a)%360,pid=uid('pb');
 const bgh=v.bg??h;
 return wrap(100,120,`<defs>${SHADE}<radialGradient id="${pid}" cx=".5" cy=".35" r=".8"><stop offset="0" stop-color="${hsl(bgh,22,v.dark?20:30)}"/><stop offset="1" stop-color="${hsl(bgh+30,24,8)}"/></radialGradient></defs><rect width="100" height="120" fill="url(#${pid})"/><g transform="translate(50 52) scale(1.08)">${figure(v,view,{})}</g>${v.blood?'':''}`);
};

/* ---- places ---- */
function officeInner(view,v){
 const lamp=v.lamp!==false,tone=v.tone||'warm';
 const wall=lamp?['#4a3626','#1c130d']:['#34393f','#14171b'],fog=lamp?'#8a8f8a':'#9aa3ab';
 const glow=lamp?`<radialGradient id="lg" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffb347" stop-opacity=".85"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>`:'';
 const id=uid('o');
 let s=`<defs><linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${wall[0]}"/><stop offset="1" stop-color="${wall[1]}"/></linearGradient><linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lamp?'#3a2a1c':'#2a2d31'}"/><stop offset="1" stop-color="#0b0b0c"/></linearGradient><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${fog}"/><stop offset="1" stop-color="#5d6a70"/></linearGradient>${glow.replace('id="lg"',`id="${id}l"`)}</defs>`;
 s+=`<rect width="160" height="90" fill="url(#${id}w)"/><rect y="62" width="160" height="28" fill="url(#${id}f)"/>`;
 const win=(x,y,w,h)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id}g)"/><path d="M${x+w/2} ${y}v${h}M${x} ${y+h/2}h${w}" stroke="#15181a" stroke-width="1.6"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="none" stroke="#1c1612" stroke-width="2.4"/>`;
 const deskLamp=(x,y,k=1)=>lamp?`<circle cx="${x}" cy="${y}" r="${30*k}" fill="url(#${id}l)"/><path d="M${x-5*k} ${y} h${10*k} l${3*k} ${-7*k} h${-16*k}z" fill="#2f6b4a"/><rect x="${x-1}" y="${y}" width="2" height="${9*k}" fill="#b08a3a"/>`:`<path d="M${x-5*k} ${y} h${10*k} l${3*k} ${-7*k} h${-16*k}z" fill="#1b2420"/><rect x="${x-1}" y="${y}" width="2" height="${9*k}" fill="#4a4030"/>`;
 if(view==='door'){
  s+=`<rect x="64" y="14" width="30" height="58" fill="#241a12" stroke="#120d09" stroke-width="2"/><rect x="92.6" y="14" width="1.4" height="58" fill="${lamp?'#6d5a40':'#45494f'}"/><circle cx="70" cy="44" r="1.6" fill="#b08a3a"/>${win(118,22,28,26)}<rect x="0" y="68" width="160" height="6" fill="#0003"/>`;
  s+=`<path d="M0 90 L0 72 L40 72 L52 90Z" fill="#241a12"/>`+deskLamp(26,66,.9);
 }else if(view==='window'){
  s+=win(38,10,84,54)+`<rect x="0" y="66" width="160" height="24" fill="#1d150f"/><rect x="0" y="66" width="160" height="2" fill="#6d5a40" opacity=".5"/>`+deskLamp(124,64,1.1);
 }else if(view==='desk'){
  s=`<defs><radialGradient id="${id}b" cx=".55" cy=".45" r=".8"><stop offset="0" stop-color="${lamp?'#3f6a4e':'#2a3d34'}"/><stop offset="1" stop-color="#0c1511"/></radialGradient>${glow.replace('id="lg"',`id="${id}l"`)}</defs><rect width="160" height="90" fill="#0c0b09"/><rect x="14" y="8" width="132" height="76" rx="3" fill="url(#${id}b)"/><rect x="40" y="22" width="60" height="44" fill="${lamp?'#1d2a22':'#161e1a'}" stroke="#0004"/><circle cx="124" cy="30" r="${lamp?26:0}" fill="url(#${id}l)"/><circle cx="124" cy="30" r="9" fill="${lamp?'#2f6b4a':'#1b2420'}"/>`;
 }else{
  s+=`<rect x="12" y="20" width="22" height="46" fill="#241a12"/>${win(116,18,32,30)}<path d="M52 66 h60 l8 24 h-76z" fill="#1d150f"/>`+deskLamp(84,62,.9);
 }
 return s;
}
function quayInner(view,v){
 const id=uid('q'),night=v.tone!=='day';
 let s=`<defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3d5058"/><stop offset=".6" stop-color="#8aa0a3"/><stop offset="1" stop-color="#6d8084"/></linearGradient><linearGradient id="${id}w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#40565a"/><stop offset="1" stop-color="#10181b"/></linearGradient><radialGradient id="${id}l" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ffc56a" stop-opacity=".9"/><stop offset="1" stop-color="#ffc56a" stop-opacity="0"/></radialGradient></defs><rect width="160" height="90" fill="url(#${id}s)"/>`;
 if(view==='water'){
  s+=`<rect y="44" width="160" height="46" fill="url(#${id}w)"/><path d="M0 52h160M0 62h160M0 74h160" stroke="#9ab3b8" stroke-opacity=".18"/><rect x="0" y="40" width="160" height="5" fill="#11161a"/><circle cx="110" cy="38" r="22" fill="url(#${id}l)"/><circle cx="110" cy="38" r="2" fill="#ffe7b0"/><rect x="108" y="52" width="4" height="30" fill="#ffc56a" opacity=".25"/>`;
 }else{
  s+=`<path d="M0 50 L160 40 L160 90 L0 90Z" fill="#171b1e"/><path d="M0 90 L70 46 L90 44 L160 90Z" fill="#2a3033"/><path d="M60 90 L80 45M40 90 L76 45M100 90 L86 45M130 90 L94 45" stroke="#0007"/>`;
  s+=[[14,70,8,16],[42,58,6,12],[120,64,7,14]].map(([x,y,w,h])=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="#0d0f10"/>`).join('');
  s+=`<circle cx="84" cy="43" r="18" fill="url(#${id}l)"/><rect x="82" y="38" width="5" height="8" fill="#ffe7b0"/>`;
 }
 s+=`<rect width="160" height="90" fill="#cfd8d9" opacity=".12"/>`;
 return s;
}
function genericInner(kind,view,v,seed){
 const r=rnd(hash(seed+view)),h=v.bg??(hash(seed)%360),night=v.tone==='night'||v.tone==='cold',id=uid('g');
 const interior=/room|hall|lobby|office|train|safehouse/i.test(seed);
 let s=`<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${hsl(h,night?24:22,night?18:36)}"/><stop offset="1" stop-color="${hsl(h+30,24,night?7:16)}"/></linearGradient><radialGradient id="${id}l" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${night?'#ffb347':'#fff3d0'}" stop-opacity=".8"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient></defs><rect width="160" height="90" fill="url(#${id})"/>`;
 if(interior||v.room){
  const wx=view==='b'?96:24;
  s+=`<rect y="64" width="160" height="26" fill="#0003"/><rect x="${wx}" y="16" width="40" height="34" fill="${hsl(h+10,16,night?30:60)}" stroke="#0008" stroke-width="2"/><circle cx="${view==='b'?40:120}" cy="30" r="24" fill="url(#${id}l)"/><rect x="${r()*30+50}" y="58" width="60" height="14" fill="#0008"/>`;
 }else{
  for(let i=0;i<9;i++){const w=10+r()*16,hh=20+r()*40,x=i*18-4;s+=`<rect x="${x}" y="${72-hh}" width="${w}" height="${hh+20}" fill="${hsl(h,14,night?9+r()*5:20+r()*8)}"/>`+(night?`<rect x="${x+3}" y="${72-hh+5}" width="3" height="4" fill="#ffd585" opacity=".8"/>`:'');}
  s+=`<rect y="70" width="160" height="20" fill="#0008"/>`;
 }
 return s;
}
A.place=(a,l,view)=>{
 const as=D.ASSETS[a],v=A.lookV(a,l);
 const inner=as.kind==='office'?officeInner(view,v):as.kind==='quay'?quayInner(view,v):genericInner(as.kind,view,v,as.n);
 return wrap(160,90,inner);
};

/* ---- props ---- */
function propInner(a,l,big){
 const kind=D.ASSETS[a].kind,v=A.lookV(a,l),pl=uid('pl');
 if(kind==='lamp'){
  const cr=v.cracked;
  return `<defs><radialGradient id="${pl}" cx=".5" cy=".4" r=".5"><stop offset="0" stop-color="#ffb347" stop-opacity="${cr?0:.9}"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient></defs><circle cx="50" cy="42" r="46" fill="url(#${pl})"/><path d="M26 52 h48 l-8 -30 h-32z" fill="${cr?'#1f3a2c':'#2f8a5a'}"/>${cr?'<path d="M42 22 l6 14 l-5 8 l8 8" stroke="#0a0a0a" stroke-width="1.6" fill="none"/><path d="M24 62 l5 -4 l3 6z M70 64 l5 -3 l-1 6z M50 70 l3 -3 l2 5z" fill="#7bbf9a" opacity=".7"/>':'<path d="M34 26 h32" stroke="#fff" stroke-opacity=".3"/>'}<rect x="48" y="52" width="4" height="26" fill="#b08a3a"/><ellipse cx="50" cy="82" rx="16" ry="4" fill="#b08a3a"/>`;
 }
 if(kind==='ledger')return `<rect x="12" y="24" width="76" height="54" rx="2" fill="#3a4a5a"/><rect x="16" y="28" width="33" height="46" fill="#e6dcc0"/><rect x="51" y="28" width="33" height="46" fill="#efe4c6"/><path d="M20 36h25M20 42h25M20 48h25M20 54h25M55 36h25M55 42h25M55 48h25" stroke="#8a7a60" stroke-width="1"/><circle cx="68" cy="60" r="8" fill="none" stroke="#a02424" stroke-width="2.6"/><circle cx="68" cy="60" r="8" fill="#a0242433"/>`;
 if(kind==='telegram')return `<g transform="rotate(-8 50 50)"><rect x="18" y="30" width="64" height="42" fill="#e8c95a"/><path d="M18 30 L50 54 L82 30" stroke="#a88a2a" fill="none"/><path d="M26 66h20" stroke="#6a5a1a"/></g>`;
 if(kind==='key')return `<circle cx="34" cy="42" r="13" fill="none" stroke="#c8a24a" stroke-width="6"/><rect x="45" y="39" width="42" height="6" fill="#c8a24a"/><path d="M76 45v10M84 45v8" stroke="#c8a24a" stroke-width="5"/>`;
 if(kind==='flare')return `<rect x="38" y="30" width="22" height="52" rx="4" fill="#a8302a"/><rect x="38" y="30" width="22" height="8" fill="#e0b040"/><path d="M49 28 l-6 -14 l6 5 l6 -9 l1 18z" fill="#ffb347"/>`;
 return `<path d="M22 40 h56 l6 38 h-68z" fill="#6b4a2c"/><path d="M30 40 q20 -26 40 0" fill="none" stroke="#3a2818" stroke-width="5"/><rect x="42" y="52" width="16" height="10" fill="#c8a24a"/>`;
}
A.prop=(a,l)=>{const v=A.lookV(a,l);return wrap(100,100,`<defs>${SHADE}</defs><rect width="100" height="100" fill="${hsl(hash(a)%360,18,v.dark?10:16)}"/>${propInner(a,l)}`)};
A.asset=(a,l,view)=>{const t=D.ASSETS[a].t;return t==='Character'?A.portrait(a,l,view):t==='Location'?A.place(a,l,view||'wide'):A.prop(a,l)};
A.assetEl=(a,l,view,cls='')=>{const d=A.el(A.asset(a,l,view),cls+' a-'+D.ASSETS[a].t.toLowerCase());return d};

/* ---- shot size glyph: little framing diagram (readable before any frame exists) ---- */
A.sizeKey=s=>{const z=(s||'').toLowerCase();return z.includes('over-the')?'ots':z.includes('insert')?'ins':z.includes('extreme')?'ecu':z.includes('close')&&z.includes('medium')?'mcu':z.includes('close')?'cu':z.includes('full')?'mf':z.includes('wide')?'ws':'ms'};
A.SIZE_ABBR={ws:'WIDE',mf:'MED FULL',ms:'MEDIUM',mcu:'MED CU',cu:'CLOSE-UP',ecu:'XCU',ots:'OTS',ins:'INSERT'};
A.glyph=(size)=>{
 const k=A.sizeKey(size);
 const f=({ws:.3,mf:.5,ms:.75,mcu:1,cu:1.35,ecu:1.9,ots:.85,ins:0})[k];
 let g='';
 if(k==='ins')g=`<rect x="26" y="14" width="28" height="18" rx="2" fill="#c9b27a"/><circle cx="40" cy="23" r="4" fill="#8a1c1c" opacity=".7"/>`;
 else{
  const cx=k==='ots'?48:40,cy=34-f*5;
  g=`<g transform="translate(${cx} ${cy}) scale(${f*.34})"><circle r="14" fill="#cdd2da"/><path d="M-34 72 Q-34 28 -12 22 L12 22 Q34 28 34 72Z" fill="#aab1bd"/></g>`;
  if(k==='ots')g=`<g transform="translate(14 44) scale(.5)"><circle r="14" fill="#5b6270"/><path d="M-34 72 Q-34 28 -12 22 L12 22 Q34 28 34 72Z" fill="#4a505c"/></g>`+g;
 }
 return wrap(80,46,`<rect width="80" height="46" fill="#1a1d24"/><path d="M0 0H80M0 15.3H80M0 30.6H80M26.6 0V46M53.3 0V46" stroke="#fff" stroke-opacity=".05"/>${g}`);
};

/* ---- movement glyph ---- */
A.moveKind=m=>{const z=(m||'').toLowerCase();return z.includes('push')||z.includes('drift in')?'push':z.includes('track')||z.includes('lateral')?'track':z.includes('rack')?'rack':z.includes('static')?'static':z.includes('pull')?'pull':'static'};
A.moveIcon={push:'⤢',track:'⇄',rack:'◐',static:'■',pull:'⤡'};
A.moveShort=m=>({push:'push-in',track:'tracking',rack:'rack focus',static:'static',pull:'pull-out'})[A.moveKind(m)];

/* ---- frames ---- */
function locOf(s){return s.roster.find(r=>D.ASSETS[r.a].t==='Location')}
A.frame=(s,role='open',o={})=>{
 const seed=o.seed||1,r=rnd(hash(s.id+role+seed));
 const rows=(o.rows||frameAssets(s,role)).filter(x=>x.on!==false);
 const loc=locOf(s)||{a:'office'};
 const lrow=rows.find(x=>D.ASSETS[x.r.a].t==='Location')||{r:loc,look:role==='end'?endLook(s,loc):openLook(s,loc)};
 const locKey=lrow.r?lrow.r.a:loc.a;
 const lookKey=lrow.look||openLook(s,loc);
 const view=(lrow.r&&lrow.r.view)||'wide';
 const size=A.sizeKey(s.cam.size),kScale=({ws:.34,mf:.5,ms:.8,mcu:1.05,cu:1.4,ecu:2,ots:.95,ins:0})[size];
 const chars=rows.filter(x=>D.ASSETS[x.r.a].t==='Character');
 const props=rows.filter(x=>D.ASSETS[x.r.a].t==='Prop');
 const hr=((seed-1)*9)%40-(seed>1?10:0);
 let inner=`<svg x="0" y="0" width="160" height="90" viewBox="0 0 160 90" preserveAspectRatio="xMidYMid slice">${D.ASSETS[locKey].kind==='office'?officeInner(view,A.lookV(locKey,lookKey)):D.ASSETS[locKey].kind==='quay'?quayInner(view,A.lookV(locKey,lookKey)):genericInner(D.ASSETS[locKey].kind,view,A.lookV(locKey,lookKey),D.ASSETS[locKey].n)}</svg>`;
 const defs=`<defs>${SHADE}<radialGradient id="vg" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".6"/></radialGradient></defs>`;
 const jit=(r()-.5)*8;
 if(size==='ins'||(size==='cu'&&!chars.length)||(size==='cu'&&props.length&&s.action.toLowerCase().startsWith('close on the open ledger'))){
  const main=props[0]||rows.find(x=>x.r)||null;
  if(main&&D.ASSETS[main.r.a].t==='Prop'){
   const lookP=role==='end'?endLook(s,main.r):openLook(s,main.r);
   inner+=`<rect width="160" height="90" fill="#000" opacity=".35"/><svg x="${48+jit}" y="6" width="64" height="78" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">${propInner(main.r.a,lookP)}</svg>`;
   const hands=chars[0];if(hands)inner+=`<g transform="translate(${126} 86) scale(.5)"><ellipse cx="0" cy="0" rx="22" ry="12" fill="${A.lookV(hands.r.a,hands.look).skin||'#c9a07f'}" opacity=".9"/></g>`;
  }
 }else{
  const n=chars.length;
  chars.forEach((c,i)=>{
   const v=A.lookV(c.r.a,c.look),view=c.r.view||'front';
   let k=kScale,x=(i+1)/(n+1)*160,back=view;
   if(size==='ots'&&n>=2){const foreIdx=Math.max(0,chars.findIndex(q=>q.r.view==='back'));const fore=i===foreIdx;k=fore?1.5:.95;x=fore?28:100+jit/2;back=fore?'back':view;}
   else if(n===1)x=80+jit;
   else x=(i+1)/(n+1)*160+jit/2;
   const full=k<.55;
   const y=full?(80-126*k+ 0):(size==='ecu'?30:(90-62*k-10));
   const yy=full?80-125*k:Math.min(46,92-74*k);
   inner+=`<g transform="translate(${x.toFixed(1)} ${yy.toFixed(1)}) scale(${k.toFixed(2)})">${figure(v,size==='ots'&&n>=2?back:view,{full})}</g>`;
  });
  if(props.length&&D.ASSETS[locKey].kind==='office'){
   const lp=props.find(p=>D.ASSETS[p.r.a].kind==='lamp');
   if(lp&&size!=='cu'&&size!=='ecu'){const lk=role==='end'?endLook(s,lp.r):openLook(s,lp.r);inner+=`<svg x="${size==='ws'?124:128}" y="46" width="22" height="22" viewBox="0 0 100 100">${propInner(lp.r.a,lk)}</svg>`}
  }
 }
 // shot-only dust on 7F ending, wet streaks
 if(role==='end'&&s.roster.some(x=>x.trans&&/dust|smoke|ash/i.test(x.trans))){inner+=Array.from({length:26},()=>`<circle cx="${(r()*160).toFixed(0)}" cy="${(r()*80).toFixed(0)}" r="${(r()*1.1+.2).toFixed(2)}" fill="#e8dcc0" opacity="${(r()*.5+.15).toFixed(2)}"/>`).join('')}
 inner+=`<rect width="160" height="90" fill="url(#vg)"/>`;
 return wrap(160,90,defs+inner,`style="filter:hue-rotate(${hr}deg) saturate(${1+(seed%3-1)*.08})"`);
};
A.frameEl=(s,role,o={})=>A.el(A.frame(s,role,o),'a-frame');

/* ---- CineBlock capture: grey blocking wireframe (never a finished frame) ---- */
A.cine=(s,role='open')=>{
 const chars=s.roster.filter(r=>D.ASSETS[r.a].t==='Character');
 const id=uid('c');
 let g=`<rect width="160" height="90" fill="#0c1220"/><path d="M0 62 L160 62M0 70 L160 72M0 82 L160 86" stroke="#3d6aa8" stroke-opacity=".5"/>`;
 for(let i=-6;i<=6;i++)g+=`<path d="M${80+i*8} 62 L${80+i*28} 90" stroke="#3d6aa8" stroke-opacity=".35"/>`;
 g+=`<rect x="108" y="30" width="26" height="32" fill="none" stroke="#7aa7e0" stroke-dasharray="3 2"/><text x="112" y="26" font-size="6" fill="#7aa7e0">window wall</text>`;
 chars.slice(0,2).forEach((c,i)=>{const x=60+i*42;g+=`<g transform="translate(${x} 0)"><circle cx="0" cy="38" r="6" fill="#9fb4d4"/><path d="M-11 66 Q-11 48 0 46 Q11 48 11 66Z" fill="#7d93b8"/><rect x="-6" y="66" width="5" height="14" fill="#6a7fa3"/><rect x="1" y="66" width="5" height="14" fill="#6a7fa3"/></g>`});
 g+=`<path d="M10 10 h30 l-6 -5 M10 10 l6 5" stroke="#e0a64a" fill="none"/><text x="14" y="82" font-size="6" fill="#7aa7e0">CINEBLOCK · ${s.id} ${role}</text>`;
 return wrap(160,90,g);
};
A.upload=(seed)=>{const r=rnd(hash(seed)),h=r()*360;let g=`<defs><linearGradient id="u${seed}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${hsl(h,25,34)}"/><stop offset="1" stop-color="${hsl(h+40,20,14)}"/></linearGradient></defs><rect width="160" height="90" fill="url(#u${seed})"/>`;for(let i=0;i<14;i++)g+=`<rect x="${(r()*150).toFixed(0)}" y="${(r()*80).toFixed(0)}" width="${(10+r()*30).toFixed(0)}" height="${(4+r()*20).toFixed(0)}" fill="#fff" opacity="${(r()*.08).toFixed(2)}"/>`;g+=`<path d="M0 62 Q40 50 80 60 T160 52 L160 90 L0 90Z" fill="#0006"/>`;return wrap(160,90,g)};

/* ---- take clip thumbnail ---- */
A.take=(s,t)=>A.frame(s,t.n%2?'open':'end',{seed:(t.n||1)+1});

/* Look swatch: colour chips taken from the look (costume / light), tiny, for chips */
A.swatch=(a,l)=>{const v=A.lookV(a,l),t=D.ASSETS[a].t;
 if(t==='Character')return [v.coat||'#445',v.under||'#ddd',v.hair||'#222'];
 if(t==='Location')return v.lamp===false?['#34393f','#9aa3ab']:['#4a3626','#ffb347'];
 return [v.cracked?'#1f3a2c':'#2f8a5a','#b08a3a'];
};
window.A=A;
})();

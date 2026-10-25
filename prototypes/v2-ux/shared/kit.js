// Tiny helpers shared by all prototypes. No framework: prototypes are throwaway single-file pages.
window.$=(s,r=document)=>r.querySelector(s);window.$$=(s,r=document)=>[...r.querySelectorAll(s)];
window.h=(tag,attrs={},...kids)=>{const e=document.createElement(tag);for(const[k,v]of Object.entries(attrs||{})){if(k==='class')e.className=v;else if(k.startsWith('on'))e.addEventListener(k.slice(2),v);else if(v!==false&&v!=null)e.setAttribute(k,v===true?'':v)}for(const c of kids.flat())e.append(c?.nodeType?c:document.createTextNode(c??''));return e};
window.toast=(msg,undo)=>{$('.toast')?.remove();const t=h('div',{class:'toast'},msg);if(undo)t.append(h('button',{onclick:()=>{undo();t.remove()}},'Undo'));document.body.append(t);setTimeout(()=>t.remove(),7000)};
// Spend policy (Record 1/3): returns 'free'|'click'|'ticket'|'blocked'. Estimates use upper bound.
window.spendKind=({total=0,count=1,unknown=false,capBreach=false})=>capBreach?'blocked':(unknown||total>=2||count>=10)?'ticket':'click';

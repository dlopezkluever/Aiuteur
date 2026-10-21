/* PROTOTYPE (Wayfinder #60). THROWAWAY. Shared ratified shell (NAVIGATION.md): Outline + top strip + centre + Peek + Cmd-K.
   Variants differ in: board marks + batch-draft interaction, and the scene workspace (shot planning). */
window.V = {};
const U = { view: 'board', sceneId: null, shotId: null, scope: new Set(), attention: false, peekId: null, variant: 'A', drafting: new Set(), toast: '' };
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const VN = { A: 'Passage + shot stack', B: 'Runtime strip + stage', C: 'Sheet + focus' };
const STC = { planned: '#3a4152', framing: '#4a6a9a', ready: '#4f8fd6', generating: '#d9a441', 'needs-pick': '#a07be0', selected: '#4fb286', final: '#2f9a6b', retired: '#222' };
const STL = { planned: 'planned', framing: 'framing', ready: 'ready for video', generating: 'generating', 'needs-pick': 'needs a pick', selected: 'selected', final: 'final', retired: 'retired' };
const scene = id => M.S.scenes.find(s => s.id === id);
const price = { frame: 0.04, take: sh => +(sh.dur * 0.12).toFixed(2) };

function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(() => d.remove(), 2600); }
function go(view, sceneId, shotId) { U.view = view; U.sceneId = sceneId || null; U.shotId = shotId || null; U.peekId = null; history.replaceState(null, '', location.search + '#/' + [view, sceneId, shotId].filter(Boolean).join('/')); render(); $('#center').scrollTop = 0; }
function readHash() { const p = location.hash.replace(/^#\//, '').split('/'); if (p[0] === 'scene') { U.view = 'scene'; U.sceneId = p[1]; U.shotId = p[2] || null; } else U.view = 'board'; }

/* ---------- shared bits ---------- */
function mini(sc) {
  const x = M.sceneStats(sc); if (!x.n) return '<span class="mini"></span>';
  const seg = (n, c) => n ? `<i style="width:${n / x.n * 100}%;background:${c}"></i>` : '';
  const framedOnly = Math.max(0, x.framed - x.generated);
  return `<span class="mini">${seg(x.selected, STC.selected)}${seg(Math.max(0, x.generated - x.selected), STC['needs-pick'])}${seg(framedOnly, STC.ready)}${seg(x.n - Math.max(x.framed, x.generated), STC.planned)}</span>`;
}
function mark(sh, sc, j, wide) {
  const s = M.status(sh), w = wide ? `style="width:${Math.max(6, sh.dur * 4)}px"` : '';
  return `<button class="mk ${wide ? 'w' : ''} st-${s} ${sh.stale ? 'stale' : ''} ${sh.failed ? 'failed' : ''} ${U.shotId === sh.id && U.view === 'scene' ? 'open' : ''}" ${w} data-act="openShot" data-sc="${sc.id}" data-sh="${sh.id}" data-peek="${sh.id}" title="${M.label(sc, j)} · ${STL[s]}${sh.stale ? ' · possibly out of date' : ''}"></button>`;
}
function legend() { return `<div class="legend">${['planned', 'framing', 'ready', 'generating', 'needs-pick', 'selected', 'final'].map(k => `<span><i style="background:${STC[k]}"></i>${STL[k]}</span>`).join('')}<span><i style="background:transparent;border:1px dashed #7aa2f7"></i>proposal</span><span class="q">· small dot = possibly out of date (quiet)</span></div>`; }

/* ---------- outline ---------- */
function outline() {
  const st = [['Input', 'done'], ['Interview', 'skipped by you'], ['Treatment', 'done'], ['Beat Sheet', 'bypassed'], ['Master Narrative', 'done · locked']];
  let h = `<div class="oi ${U.view === 'board' ? 'on' : ''}" data-act="board"><span class="t"><b>Overview · Board</b></span></div><h5>Story</h5>`;
  h += st.map(([n, s]) => `<div class="oi ${/skipped|bypassed/.test(s) ? 'skip' : ''}"><span class="t">${n}</span><span class="tag">${s}</span></div>`).join('');
  h += `<h5>World</h5><div class="oi"><span class="t">World Definition</span><span class="tag">in progress</span></div>`;
  h += `<h5>Scenes <label style="float:right;text-transform:none;letter-spacing:0;font-size:10.5px"><input type="checkbox" data-act="attn" ${U.attention ? 'checked' : ''}> needs attention</label></h5>`;
  M.S.scenes.forEach(sc => {
    const x = M.sceneStats(sc); if (U.attention && !(x.failed || x.needsPick || x.stale)) return;
    const on = U.view === 'scene' && U.sceneId === sc.id;
    h += `<div class="oi ${on ? 'on' : ''}" data-act="openScene" data-sc="${sc.id}"><span style="width:16px;color:var(--dim)">${sc.n}</span><span class="t">${esc(sc.title)}</span>${sc.planned ? mini(sc) : '<span class="tag">no plan</span>'}${x.stale ? '<span class="sdot" title="possibly out of date"></span>' : ''}</div>`;
    if (on && sc.planned) h += `<div class="oshots">${M.activeShots(sc).map((sh, j) => `<span data-act="openShot" data-sc="${sc.id}" data-sh="${sh.id}" class="${U.shotId === sh.id ? 'on' : ''}" style="background:${STC[M.status(sh)]}">${M.label(sc, j)}</span>`).join('')}</div>`;
  });
  h += `<h5>Output</h5><div class="oi"><span class="t">Review &amp; Export</span></div>`;
  return h;
}

/* ---------- top strip ---------- */
function topStrip() {
  const f = M.film(), T = M.S.targetSec;
  const unEst = M.S.scenes.filter(s => !s.planned).reduce((t, s) => t + s.estSec, 0);
  const max = Math.max(T, f.sec + unEst) * 1.05;
  return `<span class="ttl">The Great Bakery Heist</span>
  <span class="rt">Runtime <span class="bar" title="planned shots (solid) + narrative estimate of unplanned scenes (pale)"><i style="left:0;width:${f.sec / max * 100}%;background:#4f8fd6"></i><i style="left:${f.sec / max * 100}%;width:${unEst / max * 100}%;background:#3a4152"></i><b style="left:${T / max * 100}%"></b></span> <span>${M.fmt(f.sec)} planned${unEst ? ' + ~' + M.fmt(unEst) + ' unplanned' : ''} · target ${M.fmt(T)}</span></span>
  <span>Film ${f.sel}/${f.n} shots selected · ${f.planned}/${M.S.scenes.length} scenes planned</span>
  <span class="q ${f.stale ? 'on' : ''}" data-act="reviewAll">${f.stale ? f.stale + ' possibly out of date' : ''}</span>
  <span style="margin-left:auto" class="q">Spend today $${M.S.spend.toFixed(2)} · ⌘K jump</span>`;
}

/* ---------- peek (preview only) ---------- */
function peek() {
  const r = M.findShot(U.peekId), el = $('#peek'); if (!r) { el.style.display = 'none'; return; }
  const { sc, sh, j } = r, s = M.status(sh);
  el.style.display = 'block';
  el.innerHTML = `<div class="th"></div><b>${M.label(sc, j)}</b> · ${STL[s]} <span class="q">${sh.dur}s</span><div class="sub">${esc(sh.action).slice(0, 96)}</div>${sh.stale ? `<div class="quiet">possibly out of date: ${esc(sh.stale)}</div>` : ''}<div style="margin-top:6px"><button data-act="openShot" data-sc="${sc.id}" data-sh="${sh.id}">Open in workspace</button> <span class="q">preview only</span></div>`;
}

/* ---------- board ---------- */
function board() {
  const sc = M.S.scenes, f = M.film();
  let h = `<h2>Board · whole film</h2><div class="sub">${f.n} shots in ${f.planned} planned scenes · one mark per shot · click a mark to open it in the scene workspace · batch actions are scope-then-invoke</div>${legend()}`;
  h += `<div class="row2" style="margin-bottom:6px"><span class="lbl" style="margin:0">Scope</span>
   <button data-act="scopeNone" class="ghost">no plan yet (${sc.filter(s => !s.planned).length})</button><button data-act="scopeUntouched" class="ghost">untouched AI plans</button><button data-act="scopeAttn" class="ghost">needs attention</button><button data-act="scopeAll" class="ghost">all scenes</button><button data-act="scopeClear" class="ghost">clear</button></div>`;
  sc.forEach(s => { h += V[U.variant].boardRow(s); });
  return h + '<div style="height:' + ((U.scope.size || U.lastB) ? 330 : 0) + 'px"></div>' + V[U.variant].dock();
}
function boardRowBase(s, marksHtml) {
  const x = M.sceneStats(s);
  const over = s.planned && x.sec > s.estSec * 1.25;
  return `<div class="brow ${U.scope.has(s.id) ? 'sel' : ''}"><input type="checkbox" data-act="scope" data-sc="${s.id}" ${U.scope.has(s.id) ? 'checked' : ''}>
   <span class="nm" data-act="openScene" data-sc="${s.id}">${s.n}. ${esc(s.title)} ${s.locked ? '<small>🔒 plan</small>' : ''}<br><small>${s.planned ? `${x.n} shots · ${x.framed} framed · ${x.generated} gen · ${x.selected} sel${x.missingViews ? ' · ' + x.missingViews + ' view missing' : ''}` : 'no shot plan yet'}</small></span>
   <span class="lane">${marksHtml}</span><span class="rt-s ${over ? 'over' : ''}">${s.planned ? M.fmt(x.sec) + ' <small>/ ~' + M.fmt(s.estSec) + '</small>' : '~' + M.fmt(s.estSec) + ' est'}</span></div>`;
}

/* ---------- shot work area (precise path) ---------- */
function facet(sh, f, opts) {
  const src = sh[f + 'Src'];
  return `<span>${f}: <select data-edit="${f}" data-sh="${sh.id}" class="${src === 'ai' ? 'ai' : ''}" title="${src === 'ai' ? 'AI chose this; change it and it reads yours' : 'yours'}"><option value="">(none)</option>${opts.map(o => `<option ${sh[f] === o ? 'selected' : ''}>${o}</option>`).join('')}</select>${src === 'you' ? ' <span class="you">yours</span>' : ''}</span>`;
}
function shotWork(sh, sc, layout) {
  const j = M.activeShots(sc).indexOf(sh), lab = M.label(sc, j), s = M.status(sh);
  const passage = sh.anchor ? sc.blocks.slice(sh.anchor[0], sh.anchor[1] + 1) : [];
  const narr = `<div class="sec"><div class="lbl">Story · anchored passage</div>${passage.length ? passage.map(b => `<div class="passage ${b.type === 'dialogue' ? 'dl' : ''}">${b.who ? '<b>' + b.who.toUpperCase() + '</b> ' : ''}${esc(b.text)}</div>`).join('') : '<div class="passage un">Not anchored to the narrative (an insert).</div> <span class="quiet"><button>Update the Master Narrative</button> · <button>Keep for this shot only</button> · <button>Decide later</button></span>'}
    <div class="lbl" style="margin-top:6px">Action <span class="${sh.origin === 'you' ? 'you' : 'ai'}">${sh.origin === 'you' ? 'yours' : 'AI draft'}</span></div>
    <textarea rows="2" data-edit="action" data-sh="${sh.id}">${esc(sh.action)}</textarea>
    ${sh.origin === 'you' && sh.anchor ? `<div class="quiet">Differs from the narrative · <button>Update the Master Narrative</button> · <button>Keep for this shot only</button> · <button>Decide later</button></div>` : ''}
    ${sh.dialogue.length ? `<div class="lbl" style="margin-top:6px">Dialogue (verbatim, from the narrative)</div>${sh.dialogue.map(d => `<div class="passage dl"><b>${esc(d.who).toUpperCase()}</b> ${esc(d.line)}</div>`).join('')}` : ''}</div>`;
  const who = `<div class="sec"><div class="lbl">Who &amp; where (derived)</div>${sh.ents.map(e => `<span class="chip">${esc(e)}</span>`).join('')}<button class="ghost" style="padding:0 6px">+ add</button>
    <div>${esc(sh.loc)} · <span class="ai" title="AI chose this view">${esc(sh.dir)}</span></div>
    <div class="quiet">Continuity: <select data-edit="cont" data-sh="${sh.id}">${['cut', 'continues', 'same place, new view'].map(o => `<option ${sh.cont === o ? 'selected' : ''}>${o}</option>`).join('')}</select> · Composition refs: ${sh.compRefs} <button class="ghost" style="padding:0 5px">+ add</button></div></div>`;
  const cam = `<div class="sec"><div class="lbl">Camera · any depth, all optional</div><div class="row2">${facet(sh, 'size', M.SIZES)}${facet(sh, 'angle', M.ANGLES)}${facet(sh, 'move', M.MOVES)}</div>
    <div class="row2" style="margin-top:6px">Duration <input type="number" min="1" max="60" style="width:56px" data-edit="dur" data-sh="${sh.id}" value="${sh.dur}"> s <span class="${sh.durSrc === 'you' ? 'you' : 'ai'} quiet">${sh.durSrc === 'you' ? 'yours' : 'AI estimate'}</span>${sh.dur > 8 ? '<span class="chip q">longer than some models: Aiuteur makes it as several parts if needed</span>' : ''}</div>
    <textarea rows="1" placeholder="Camera / visual / sound notes (free text)" data-edit="notes" data-sh="${sh.id}" style="margin-top:6px">${esc(sh.notes)}</textarea></div>`;
  const frames = `<div class="sec"><div class="lbl">Frames <span class="q">(recommended, never required)</span></div>${sh.roles.map(r => `<span class="fr"><span class="th2"></span>${r.kind}: <b>${r.state === 'none' ? 'not made' : r.state === 'made' ? r.n + ' made, none approved' : r.state}</b></span>`).join('')}
    <div class="row2" style="margin-top:6px"><button data-act="mkFrames" data-sh="${sh.id}">Generate frames · $${(price.frame * sh.roles.length).toFixed(2)}</button><button data-act="apprFrames" data-sh="${sh.id}">Approve</button><button data-act="skipFrames" data-sh="${sh.id}">Skip frames (direct to video)</button></div></div>`;
  const takes = `<div class="sec"><div class="lbl">Takes</div>${sh.takes ? `<span class="chip">${sh.takes} take${sh.takes > 1 ? 's' : ''}</span>${sh.sel ? '<span class="chip" style="color:var(--sel)">one selected</span>' : '<span class="chip warn">needs a pick</span>'}` : '<span class="quiet">none yet</span>'}
    <div class="row2" style="margin-top:6px"><button class="pri" data-act="mkTake" data-sh="${sh.id}">Generate take · $${price.take(sh).toFixed(2)}</button>${sh.takes && !sh.sel ? `<button data-act="selTake" data-sh="${sh.id}">Select a take</button>` : ''}<span class="quiet">${price.take(sh) >= 2 ? 'over $2.00: confirm step' : 'one click, price shown'}${M.status(sh) === 'framing' ? ' · "without the unapproved frame" records a skip' : ''}</span></div>
    ${sh.stale ? `<div class="quiet" style="margin-top:6px"><span class="sdot" style="display:inline-block"></span> possibly out of date: ${esc(sh.stale)} · <button>Regenerate</button> · <button>It still fits</button> · <button data-act="keep" data-sh="${sh.id}">Keep as is</button></div>` : ''}</div>`;
  const acts = `<div class="sec span row2"><span class="q">${lab} · ${STL[s]}</span><button data-act="prevShot" data-sh="${sh.id}">← prev</button><button data-act="nextShot" data-sh="${sh.id}">next →</button>
    <button data-act="split" data-sh="${sh.id}" title="durations are partitioned, sum unchanged">Split</button><button data-act="merge" data-sh="${sh.id}">Merge with next</button><button data-act="up" data-sh="${sh.id}">Move earlier</button><button data-act="down" data-sh="${sh.id}">Move later</button><button data-act="retire" data-sh="${sh.id}">Retire</button></div>`;
  if (layout === 'cols') return `<div class="work cols"><div>${narr}</div><div>${who}${cam}</div><div>${frames}${takes}</div>${acts}</div>`;
  return `<div class="work">${narr}${who}${cam}${frames}${takes}${acts}</div>`;
}

/* ---------- scene header (shared content, runtime + progress + plan decision) ---------- */
function sceneHead(sc) {
  const x = M.sceneStats(sc), diff = x.sec - sc.estSec;
  const planState = !sc.planned ? '' : sc.locked ? '🔒 plan locked' : sc.accepted ? 'plan accepted' : x.touched ? 'plan edited by you' : 'AI draft, untouched';
  return `<div class="shead"><div class="row2"><h2 style="margin:0">Scene ${sc.n} · ${esc(sc.title)}</h2><span class="sub">${esc(sc.loc)}</span><span style="margin-left:auto" class="quiet">${planState}</span>
   ${sc.planned && !sc.accepted && !sc.locked ? `<button data-act="acceptPlan" data-sc="${sc.id}">Accept plan</button>` : ''}${sc.planned && !sc.locked && x.framed ? '<span class="quiet">Frame generation has begun · <button data-act="lockPlan" data-sc="' + sc.id + '">Lock this shot plan</button> · not now</span>' : ''}</div>
   ${sc.planned ? `<div class="row2" style="margin-top:6px"><span class="chip">${x.n} planned</span><span class="chip">${x.framed} framed</span><span class="chip">${x.generated} generated</span><span class="chip">${x.selected} selected</span>${x.needsPick ? `<span class="chip">${x.needsPick} need a pick</span>` : ''}${x.uncovered || x.missingViews ? `<span class="chip q">missing: ${x.uncovered ? x.uncovered + ' passage' + (x.uncovered > 1 ? 's' : '') + ' with no shot' : ''}${x.uncovered && x.missingViews ? ', ' : ''}${x.missingViews ? x.missingViews + ' view' : ''}</span>` : ''}${x.stale ? `<span class="chip q">${x.stale} possibly out of date</span>` : ''}${x.failed ? `<span class="chip warn">${x.failed} failed</span>` : ''}
   <span style="margin-left:auto">Runtime <b>${M.fmt(x.sec)}</b> shots vs <b>~${M.fmt(sc.estSec)}</b> narrative ${Math.abs(diff) > sc.estSec * 0.25 ? `<span class="chip warn">${diff > 0 ? '+' : '−'}${M.fmt(Math.abs(diff))}</span>` : ''}</span></div>` : ''}</div>`;
}
function emptyScene(sc) {
  return `${sceneHead(sc)}<div class="work"><div class="lbl">Master Narrative · this scene</div>${sc.blocks.map(b => `<div class="passage ${b.type === 'dialogue' ? 'dl' : ''}">${b.who ? '<b>' + b.who.toUpperCase() + '</b> ' : ''}${esc(b.text)}</div>`).join('')}
   <div class="row2" style="margin-top:10px"><button class="pri" data-act="draftOne" data-sc="${sc.id}">Draft shot plan for this scene · $0.03</button><button data-act="addFirst" data-sc="${sc.id}">Add shots by hand</button><span class="quiet">A drafted plan can simply be accepted.</span></div></div>`;
}

/* ---------- actions ---------- */
const ACT = {
  board() { go('board'); },
  openScene(d) { go('scene', d.sc, null); },
  openShot(d) { go('scene', d.sc, d.sh); },
  attn(d, e) { U.attention = e.target.checked; render(); },
  scope(d, e) { e.target.checked ? U.scope.add(d.sc) : U.scope.delete(d.sc); render(); },
  scopeNone() { U.scope = new Set(M.S.scenes.filter(s => !s.planned).map(s => s.id)); render(); },
  scopeUntouched() { U.scope = new Set(M.S.scenes.filter(s => s.planned && !s.locked && !M.sceneStats(s).hasDeps && !M.sceneStats(s).touched).map(s => s.id)); render(); },
  scopeAttn() { U.scope = new Set(M.S.scenes.filter(s => { const x = M.sceneStats(s); return x.failed || x.needsPick || x.stale; }).map(s => s.id)); render(); },
  scopeAll() { U.scope = new Set(M.S.scenes.map(s => s.id)); render(); },
  scopeClear() { U.scope.clear(); U.sheet = false; render(); },
  acceptPlan(d) { M.acceptPlan(d.sc); }, lockPlan(d) { scene(d.sc).locked = true; M.emit('Plan locked'); },
  draftOne(d) { M.runDraft([d.sc]); U.shotId = M.activeShots(scene(d.sc))[0].id; render(); toast('Drafted. A drafted plan is usable as it stands.'); },
  addFirst(d) { const id = M.add(d.sc); U.shotId = id; render(); },
  mkFrames(d) { const { sh } = M.findShot(d.sh); sh.roles.forEach(r => { if (r.state === 'none') { r.state = 'made'; r.n = 2; } }); M.emit(); },
  apprFrames(d) { M.approveFrames(d.sh); }, skipFrames(d) { M.skipFrames(d.sh); },
  mkTake(d) { M.makeTake(d.sh); toast('Take made · $' + price.take(M.findShot(d.sh).sh).toFixed(2)); }, selTake(d) { M.select(d.sh); },
  keep(d) { M.findShot(d.sh).sh.stale = null; M.emit(); },
  prevShot(d) { stepShot(d.sh, -1); }, nextShot(d) { stepShot(d.sh, 1); },
  split(d) { U.shotId = M.split(d.sh); render(); }, merge(d) { M.merge(d.sh); render(); },
  up(d) { M.move(d.sh, -1); }, down(d) { M.move(d.sh, 1); },
  retire(d) { M.retire(d.sh); U.shotId = null; render(); },
  reviewAll() { toast('Review-all tray (on demand): #63 design, not part of this prototype'); },
};
function stepShot(id, d) { const { sc } = M.findShot(id), a = M.activeShots(sc), i = a.findIndex(s => s.id === id), n = a[i + d]; if (n) go('scene', sc.id, n.id); }

document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]'); if (!t) return;
  const fn = (ACT[t.dataset.act] || V[U.variant].acts && V[U.variant].acts[t.dataset.act]); if (fn) fn(t.dataset, e);
});
document.addEventListener('change', e => {
  const t = e.target; if (t.dataset.edit) { let v = t.value; if (t.dataset.edit === 'dur') v = Math.max(1, +v || 1); M.edit(t.dataset.sh, t.dataset.edit, v); }
  else if (t.dataset.vact && V[U.variant].acts[t.dataset.vact]) V[U.variant].acts[t.dataset.vact](t.dataset, e);
});
document.addEventListener('mouseover', e => { const t = e.target.closest('[data-peek]'); if (t && t.dataset.peek !== U.peekId) { U.peekId = t.dataset.peek; peek(); } });
document.addEventListener('keydown', e => {
  const inp = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); cmdk(true); return; }
  if (e.key === 'Escape') { cmdk(false); U.peekId = null; peek(); }
  if (inp) return;
  const keys = ['A', 'B', 'C'];
  if (e.key === 'ArrowLeft' && !e.shiftKey) setVariant(keys[(keys.indexOf(U.variant) + 2) % 3]);
  if (e.key === 'ArrowRight' && !e.shiftKey) setVariant(keys[(keys.indexOf(U.variant) + 1) % 3]);
  if (U.view === 'scene' && U.shotId && (e.key === 'j' || e.key === 'k')) stepShot(U.shotId, e.key === 'j' ? 1 : -1);
});
function setVariant(v) { U.variant = v; const q = new URLSearchParams(location.search); q.set('variant', v); history.replaceState(null, '', '?' + q + location.hash); render(); }

/* ---------- cmd-k ---------- */
function cmdk(open) {
  const el = $('#cmdk'); el.style.display = open ? 'flex' : 'none'; if (!open) return;
  const inp = el.querySelector('input'); inp.value = ''; inp.focus(); fill('');
  inp.oninput = () => fill(inp.value);
  inp.onkeydown = e => { if (e.key === 'Enter') { const f = el.querySelector('.res div'); if (f) f.click(); } };
  function fill(q) {
    q = q.toLowerCase(); const out = [];
    M.S.scenes.forEach(sc => {
      if (!q || sc.title.toLowerCase().includes(q) || ('scene ' + sc.n) === q) out.push(`<div data-k="s|${sc.id}">Scene ${sc.n} · ${esc(sc.title)}</div>`);
      M.activeShots(sc).forEach((sh, j) => { if (q && (M.label(sc, j).toLowerCase() === q || sh.action.toLowerCase().includes(q))) out.push(`<div data-k="h|${sc.id}|${sh.id}">Shot ${M.label(sc, j)} · ${esc(sh.action).slice(0, 60)}</div>`); });
    });
    el.querySelector('.res').innerHTML = out.slice(0, 12).join('') || '<div>No match</div>';
    el.querySelectorAll('.res div[data-k]').forEach(d => d.onclick = () => { const p = d.dataset.k.split('|'); cmdk(false); p[0] === 's' ? go('scene', p[1]) : go('scene', p[1], p[2]); });
  }
}

/* ---------- render ---------- */
function render() {
  const c = $('#center'), st = c ? c.scrollTop : 0;
  $('#outline').innerHTML = outline(); $("#top").innerHTML = topStrip();
  let body;
  if (U.view === 'board') body = board();
  else { const sc = scene(U.sceneId); body = sc.planned && M.activeShots(sc).length ? V[U.variant].scene(sc) : emptyScene(sc); }
  $('#center').innerHTML = `<div class="proto-note">PROTOTYPE · throwaway · variant ${U.variant}: ${VN[U.variant]} · mock data, nothing persists</div>` + body;
  $('#center').scrollTop = st;
  $('#sw').innerHTML = `<button data-sw="-1">←</button><span>${U.variant} (${VN[U.variant]})</span><button data-sw="1">→</button>`;
  peek();
  if (V[U.variant].after) V[U.variant].after();
}
document.addEventListener('click', e => { const b = e.target.closest('[data-sw]'); if (b) { const k = ['A', 'B', 'C']; setVariant(k[(k.indexOf(U.variant) + (+b.dataset.sw) + 3) % 3]); } });

window.addEventListener('DOMContentLoaded', () => {
  U.variant = new URLSearchParams(location.search).get('variant') || 'A'; if (!V[U.variant]) U.variant = 'A';
  readHash();
  M.sub(() => { U.sheet = U.sheet; render(); });
  render();
});
window.U = U; window.render = render; window.go = go; window.shotWork = shotWork; window.sceneHead = sceneHead; window.mark = mark; window.boardRowBase = boardRowBase; window.legend = legend; window.toast = toast; window.esc = esc; window.STC = STC; window.STL = STL; window.price = price; window.scene = scene;

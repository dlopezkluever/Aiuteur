// PROTOTYPE #62: throwaway. Shared fake data + behaviour. Not production.
const $ = (s, r = document) => r.querySelector(s);
const money = n => '$' + n.toFixed(2);
const MODELS = [
  { id: 'pro', name: 'Kestrel Pro', rate: 0.14, note: 'default · best quality' },
  { id: 'fast', name: 'Kestrel Fast', rate: 0.05, note: 'cheaper · rougher motion' },
  { id: 'orion', name: 'Orion 2', rate: 0.22, note: 'highest fidelity' },
  { id: 'beta', name: 'Nimbus (beta)', rate: null, note: 'price unavailable' },
];
const CAP = 25.0;
const THRESH = { total: 2.0, count: 10 };

function poster(hue, seed, w = 160, h = 90) {
  const r = n => ((Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  const fx = 30 + r(1) * 100, fh = 28 + r(2) * 20;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 160 90'><defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='hsl(${hue},45%,${30 + r(3) * 18}%)'/><stop offset='.62' stop-color='hsl(${hue + 20},38%,${14 + r(4) * 10}%)'/><stop offset='.62' stop-color='hsl(${hue},20%,12%)'/><stop offset='1' stop-color='hsl(${hue},25%,7%)'/></linearGradient></defs><rect width='160' height='90' fill='url(#g)'/><rect x='${r(5) * 90}' y='12' width='${20 + r(6) * 30}' height='${24 + r(7) * 14}' fill='hsl(${hue + 40},50%,60%)' opacity='.25'/><circle cx='${fx}' cy='${62 - fh}' r='5' fill='hsl(${hue},15%,${60 + r(8) * 20}%)'/><rect x='${fx - 6}' y='${64 - fh}' width='12' height='${fh}' rx='3' fill='hsl(${hue + 180},30%,${25 + r(9) * 20}%)'/></svg>`;
  return `url('data:image/svg+xml;utf8,${encodeURIComponent(svg).replace(/'/g, '%27')}')`;
}

const mkTake = (id, n, o = {}) => ({ id, n, model: 'Kestrel Pro', hue: 0, rejected: false, late: null, guidance: '', ...o });
const reset = () => ({
  view: 'shot', shotId: 3, scope: 'scene', returnTo: null,
  spent: 4.8, notices: [], toasts: [],
  ui: { model: 'pro', guidance: '', confirm: null, inspect: false, ood: null, compare: [], playItem: null },
  sim: { failNext: false, lateAfterCancel: true },
  play: { on: false, t: 0, skipGaps: false, items: null },
  jobs: [],
  shots: [
    { id: 1, label: '7A', title: 'Establishing: harbour office at dawn', plan: 'Wide, slow push-in. Fog. Gulls. No dialogue.', dur: 6, hue: 205, sel: 12, final: true, ood: null, failed: null, takes: [mkTake(11, 1, { hue: 0 }), mkTake(12, 2, { hue: 8 }), mkTake(13, 3, { hue: 16, rejected: true })] },
    { id: 2, label: '7B', title: 'Marcus enters, shakes rain from his coat', plan: 'Medium, tracking. Marcus (Harbour coat Look) crosses to the desk.', dur: 5, hue: 215, sel: 21, final: false, ood: { reason: "Marcus's coat Look changed after this was made.", kept: false }, failed: null, takes: [mkTake(21, 1, { hue: 4 })] },
    { id: 3, label: '7C', title: 'Two-shot: Marcus and Ines at the desk', plan: 'Two-shot, shallow focus. Ines slides the letter across. 3 lines of dialogue.', dur: 8, hue: 28, sel: null, final: false, ood: null, failed: null, takes: [mkTake(31, 1, { hue: 0 }), mkTake(32, 2, { hue: 10, guidance: 'Warmer light, Ines more guarded' }), mkTake(33, 3, { hue: 20, late: 'cancel', model: 'Kestrel Pro' })] },
    { id: 4, label: '7D', title: 'Chase along the quay (one continuous shot)', plan: 'Handheld, one unbroken move, 18 s. Marcus pursues the courier.', dur: 18, hue: 190, sel: null, final: false, ood: null, failed: null, takes: [], long: 3, batchPartial: { done: 2, total: 3 } },
    { id: 5, label: '7E', title: 'Insert: the letter, rain-stained', plan: 'Macro insert. Handwriting legible.', dur: 4, hue: 40, sel: null, final: false, ood: null, failed: { reason: 'The provider timed out.', billed: 'maybe', model: 'pro' }, takes: [mkTake(51, 1, { hue: 3, rejected: true })] },
    { id: 6, label: '7F', title: 'Closing wide: the office, lights off', plan: 'Wide, locked off. Marcus leaves frame.', dur: 6, hue: 230, sel: null, final: false, ood: null, failed: null, takes: [] },
  ],
});
let S = reset();
let V = null; // active variant module {renderShot, renderReview, name}

const shot = id => S.shots.find(s => s.id === id);
const cur = () => shot(S.shotId);
const model = id => MODELS.find(m => m.id === id);
const priceOf = (s, mid) => { const m = model(mid); return m.rate == null ? null : +(m.rate * s.dur).toFixed(2); };
const liveTakes = s => s.takes.filter(t => !t.rejected);
const rejTakes = s => s.takes.filter(t => t.rejected);
const previewId = s => { const p = S.ui.prev; if (p && s.takes.some(t => t.id === p && !t.rejected)) return p; if (s.sel) return s.sel; const l = liveTakes(s); return l.length ? l[l.length - 1].id : null; };
const jobOf = s => S.jobs.find(j => j.shot === s.id);
const selTake = s => s.takes.find(t => t.id === s.sel);
function state(s) {
  if (jobOf(s) || s.batchPartial) return 'generating';
  if (s.failed) return 'failed';
  if (s.sel) return s.final ? 'final' : 'selected';
  if (liveTakes(s).length) return 'needs-pick';
  return 'missing';
}
const stateLabel = { generating: 'Generating', failed: 'Failed', final: 'Final', selected: 'Selected', 'needs-pick': 'Needs a pick', missing: 'No take yet' };
const stateCls = { generating: 'ac', failed: 'bad', final: 'ok', selected: 'ok', 'needs-pick': 'warn', missing: '' };
const dur = s => (selTake(s) ? selTake(s).dur || s.dur : s.dur);
const sceneStats = () => {
  const n = S.shots.length, sel = S.shots.filter(s => s.sel).length;
  return { n, sel, ood: S.shots.filter(s => s.ood && !s.ood.kept).length, gap: S.shots.filter(s => !s.sel).length, runtime: S.shots.reduce((a, s) => a + s.dur, 0) };
};
const tc = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
const posterOf = (s, t) => poster(s.hue + (t ? t.hue : 0), s.id * 7 + (t ? t.n : 0) * 3);

// ---------- spend ----------
function evaluate(items, opts = {}) {
  // items: [{shot?, label, price|null, count?}] ; returns reasons for the confirm step
  const total = items.reduce((a, i) => a + (i.price || 0), 0);
  const count = items.reduce((a, i) => a + (i.count || 1), 0);
  const reasons = [];
  if (total >= THRESH.total) reasons.push(`Total ${money(total)} is ${money(THRESH.total)} or more`);
  if (count >= THRESH.count) reasons.push(`${count} generations (${THRESH.count} or more)`);
  if (opts.bulkFilter) reasons.push('Bulk regenerate by filter');
  if (items.some(i => i.price == null)) reasons.push('A price is unavailable');
  if (S.spent + total > CAP) reasons.push(`Would pass your daily cap (${money(CAP)}; ${money(Math.max(0, CAP - S.spent))} left)`);
  return { total, count, reasons, largest: Math.max(0, ...items.map(i => i.price || 0)) };
}
function request(items, opts = {}) {
  const ev = evaluate(items, opts);
  if (ev.reasons.length) { S.ui.confirm = { items, opts, ev, id: Date.now() }; render(); return; }
  startItems(items); // one click is the approval
}
function startItems(items) {
  S.ui.confirm = null;
  items.forEach(i => {
    if (i.mock) { S.spent += i.price || 0; toast(`Started ${i.count} generations in the background`); return; }
    const s = shot(i.shot);
    s.failed = null;
    S.jobs.push({ id: Date.now() + i.shot, shot: i.shot, price: i.price, model: i.model, progress: 0, guidance: i.guidance || '' });
    S.spent += i.price || 0;
  });
  toast(items.length > 1 ? `${items.length} takes generating in the background. Keep working.` : 'Generating in the background. Keep working.');
  render();
}
function genItem(s, mid, guidance) { const p = priceOf(s, mid); return { shot: s.id, label: `${s.label} · ${s.dur}s · ${model(mid).name}`, price: p, model: mid, guidance, long: s.long }; }
function sceneMissingItems(mid) { return S.shots.filter(s => !s.sel && !liveTakes(s).length && !jobOf(s) && !s.batchPartial).map(s => genItem(s, mid)); }
function filmItems(mid) {
  const own = sceneMissingItems(mid);
  return [...own, { mock: true, label: '38 more shots in 21 other scenes', price: 31.4, count: 38 }];
}
function tick() {
  let ch = false;
  S.jobs.forEach(j => { j.progress += 7 + Math.random() * 8; ch = true; });
  S.jobs.filter(j => j.progress >= 100).forEach(j => {
    S.jobs = S.jobs.filter(x => x !== j);
    const s = shot(j.shot);
    if (S.sim.failNext) { S.sim.failNext = false; s.failed = { reason: 'The provider timed out.', billed: 'maybe', model: j.model }; notice(`${s.label} failed: timed out. You may have been charged.`); }
    else {
      const n = s.takes.length + 1;
      s.takes.push(mkTake(s.id * 10 + n + Math.floor(Math.random() * 90), n, { hue: (n * 9) % 40, guidance: j.guidance, model: model(j.model).name }));
      s.batchPartial = null;
      notice(`${s.label} take ${n} is ready. Not selected.`);
    }
  });
  if (ch) render();
}
setInterval(tick, 500);
function cancelJob(id) {
  const j = S.jobs.find(x => x.id === id); if (!j) return;
  S.jobs = S.jobs.filter(x => x !== j);
  toast(`Cancelled. This provider can't stop a started run; you may still be charged up to ${money(j.price || 0)}.`);
  if (S.sim.lateAfterCancel) setTimeout(() => {
    const s = shot(j.shot); const n = s.takes.length + 1;
    s.takes.push(mkTake(s.id * 10 + n + 50, n, { hue: 22, late: 'cancel' }));
    notice(`${s.label}: a take arrived after cancel. Attached, not selected.`); render();
  }, 3500);
  render();
}
function toast(m) { const t = { m, id: Math.random() }; S.toasts.push(t); setTimeout(() => { S.toasts = S.toasts.filter(x => x !== t); render(); }, 4200); }
function notice(m) { S.notices.push(m); toast(m); }

// ---------- actions ----------
const ACT = {
  go: d => { S.view = d.view; if (d.shot) S.shotId = +d.shot; if (d.scope) S.scope = d.scope; S.ui.compare = []; S.ui.ood = null; S.ui.confirm = null; S.ui.insp = null; S.ui.prev = null; S.ui.prev2 = null; S.returnTo = d.ret ? 'review' : (d.view === 'review' ? null : (d.keep ? S.returnTo : null)); stopPlay(); },
  back: () => { S.view = 'review'; S.returnTo = null; },
  ui: d => { S.ui[d.key] = d.val === '' ? !S.ui[d.key] : (isNaN(d.val) ? d.val : +d.val); },
  select: d => { const s = shot(+d.shot); s.sel = +d.take; toast('Selected. You can change this any time.'); },
  deselect: d => { shot(+d.shot).sel = null; },
  reject: d => { const s = shot(+d.shot); const t = s.takes.find(x => x.id === +d.take); t.rejected = true; if (s.sel === t.id) { s.sel = null; s.final = false; } S.ui.compare = S.ui.compare.filter(x => x !== t.id); toast('Rejected. It stays under Rejected and can be restored.'); },
  restore: d => { const s = shot(+d.shot); s.takes.find(x => x.id === +d.take).rejected = false; },
  final: d => { const s = shot(+d.shot); s.final = !s.final; toast(s.final ? 'Marked final. Unlock any time; nothing cascades.' : 'Unlocked. This pick is a normal selection again.'); },
  cmp: d => { const id = +d.take; const c = S.ui.compare; const max = +d.max || 2; if (c.includes(id)) S.ui.compare = c.filter(x => x !== id); else S.ui.compare = [...c, id].slice(-max); },
  gen: d => { const s = shot(+d.shot); request([genItem(s, S.ui.model, S.ui.guidance)]); S.ui.guidance = ''; },
  retry: d => { const s = shot(+d.shot); request([genItem(s, s.failed.model || S.ui.model)]); },
  dismissfail: d => { shot(+d.shot).failed = null; },
  cancel: d => cancelJob(+d.job),
  genScene: () => request(sceneMissingItems(S.ui.model)),
  genFilm: () => request(filmItems(S.ui.model)),
  regenOod: () => { const items = S.shots.filter(s => s.ood && !s.ood.kept).map(s => genItem(s, S.ui.model)); request(items, { bulkFilter: true }); },
  go_confirm: () => { startItems(S.ui.confirm.items); },
  no_confirm: () => { S.ui.confirm = null; },
  oodkeep: d => { const s = shot(+d.shot); s.ood.kept = true; S.ui.ood = null; toast('Kept as is. Remembered for this exact content.'); },
  oodfit: d => { const s = shot(+d.shot); s.ood.kept = true; S.ui.ood = null; toast('Marked: it still fits.'); },
  oodpop: d => { S.ui.ood = S.ui.ood === +d.shot ? null : +d.shot; },
  reset: () => { const v = S.variant; S = reset(); S.variant = v; stopPlay(); },
  simfail: () => { S.sim.failNext = !S.sim.failNext; },
  simlate: () => { S.sim.lateAfterCancel = !S.sim.lateAfterCancel; },
  play: () => { togglePlay(); },
  seek: d => { S.play.t = +d.t; if (!S.play.on) togglePlay(); },
  skipgaps: () => { S.play.skipGaps = !S.play.skipGaps; },
  nextitem: d => { const it = playItems(); const i = currentIndex(it); const j = Math.max(0, Math.min(it.length - 1, i + +d.dir)); S.play.t = it[j].start; },
  playctx: d => { // play prev -> this take -> next
    const s = shot(+d.shot); const i = S.shots.indexOf(s); const t = s.takes.find(x => x.id === +d.take);
    S.play.items = [S.shots[i - 1], { ...s, _take: t }, S.shots[i + 1]].filter(Boolean).map(x => x._take ? { shot: x, take: x._take } : { shot: x, take: selTake(x) });
    S.play.t = 0; S.play.on = true; startTimer(); },
  endctx: () => { S.play.items = null; stopPlay(); },
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el) { if (S.ui.ood && !e.target.closest('.pop')) { S.ui.ood = null; render(); } return; }
  e.stopPropagation();
  const d = { ...el.dataset }; const a = d.act;
  (ACT[a] || (() => {}))(d);
  render();
});
document.addEventListener('input', e => {
  if (e.target.dataset.bind === 'guidance') S.ui.guidance = e.target.value;
  if (e.target.dataset.bind === 'model') { S.ui.model = e.target.value; render(); }
});

// ---------- playback ----------
let timer = null;
function playItems() {
  if (S.play.items) { let st = 0; return S.play.items.map(i => { const d = i.take ? (i.take.dur || i.shot.dur) : 2; const o = { ...i, start: st, d, gap: !i.take }; st += d; return o; }); }
  const list = S.scope === 'film' ? filmShots() : S.shots;
  let st = 0;
  const out = [];
  list.forEach(s => {
    const gap = !s.sel; if (gap && S.play.skipGaps) return;
    const t = s.mock ? null : selTake(s); const d = gap ? 2 : (s.mock ? s.dur : (t.dur || s.dur));
    out.push({ shot: s, take: t, start: st, d, gap }); st += d;
  });
  return out;
}
const totalDur = () => { const it = playItems(); const l = it[it.length - 1]; return l ? l.start + l.d : 0; };
function currentIndex(it) { let k = 0; it.forEach((x, i) => { if (S.play.t >= x.start) k = i; }); return k; }
function startTimer() { clearInterval(timer); timer = setInterval(() => { if (!S.play.on) return; S.play.t += 0.25; if (S.play.t >= totalDur()) { S.play.on = false; S.play.t = 0; if (S.play.items) S.play.items = null; } if (!document.activeElement || !/TEXTAREA|INPUT|SELECT/.test(document.activeElement.tagName)) render(); }, 250); }
function togglePlay() { if (S.play.t >= totalDur()) S.play.t = 0; S.play.on = !S.play.on; if (S.play.on) startTimer(); }
function stopPlay() { S.play.on = false; clearInterval(timer); }
// whole-film descriptors (mock scenes + the live scene 7)
function filmShots() {
  const out = []; let seed = 5;
  const r = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  for (let sc = 1; sc <= 22; sc++) {
    if (sc === 7) { S.shots.forEach(s => out.push(s)); continue; }
    const n = 4 + Math.floor(r() * 5);
    for (let k = 0; k < n; k++) { const x = r(); out.push({ mock: true, scene: sc, id: sc * 100 + k, label: `${sc}${String.fromCharCode(65 + k)}`, hue: 180 + sc * 7, dur: 3 + Math.floor(r() * 6), sel: sc < 12 ? (x > .08 ? 1 : 0) : (x > .55 ? 1 : 0), ood: x > .93 && sc < 12 ? { reason: '' } : null }); }
  }
  return out;
}

// ---------- shared UI bits ----------
function oodDot(s) {
  if (!s.ood || s.ood.kept) return '';
  return `<span class="wd" role="button" aria-label="Possibly out of date" title="Possibly out of date" data-act="oodpop" data-shot="${s.id}"></span>`;
}
function oodPop(s) {
  if (S.ui.ood !== s.id || !s.ood) return '';
  const p = priceOf(s, S.ui.model);
  return `<div class="pop" style="margin-top:6px"><div class="sm">${s.ood.reason}</div><div class="xs mu" style="margin:4px 0 8px">Nothing was changed or spent. Your call.</div><div class="row"><button class="sm" data-act="gen" data-shot="${s.id}">Regenerate ${p == null ? '' : `<span class="price">${money(p)}</span>`}</button><button class="sm" data-act="oodfit" data-shot="${s.id}">It still fits</button><button class="sm ghost" data-act="oodkeep" data-shot="${s.id}">Keep as is</button></div></div>`;
}
function stateChip(s) { const st = state(s); return `<span class="chip ${stateCls[st]}">${stateLabel[st]}</span>`; }
function modelSelect() {
  return `<select data-bind="model" aria-label="Model">${MODELS.map(m => `<option value="${m.id}" ${S.ui.model === m.id ? 'selected' : ''}>${m.name}${m.rate == null ? ' · price unavailable' : ` · ${money(m.rate)}/s`}</option>`).join('')}</select>`;
}
function guidanceBox(ph = 'What should change? (optional)') {
  return `<textarea rows="2" data-bind="guidance" placeholder="${ph}">${S.ui.guidance}</textarea>`;
}
function inspectBlock(s) {
  const m = model(S.ui.model);
  return `<div class="note col" style="gap:6px"><div class="xs mu">EXACT PROMPT SENT (editable, never required)</div>
<textarea rows="4">Medium-wide, shallow focus. ${s.plan} Marcus (Harbour coat), Ines (office cardigan); location: Harbour office, north wall view; style: Rain-grey Naturalism. ${S.ui.guidance ? 'Guidance: ' + S.ui.guidance : ''}</textarea>
<div class="xs mu">REFERENCES</div><div class="row xs" style="flex-wrap:wrap">${['Marcus · Harbour coat', 'Ines · office cardigan', 'Harbour office · north wall', 'Style: Rain-grey', 'Opening frame (approved)'].map(x => `<span class="chip">${x}</span>`).join('')}</div>
<div class="xs mu">Model ${m.name}. Editing the prompt shows a quiet "prompt overridden" mark on the take.</div></div>`;
}
function costLine(s) { const p = priceOf(s, S.ui.model); return p == null ? '<span class="chip warn">price unavailable</span>' : `<span class="price">${money(p)}</span>${s.long ? ` <span class="mu xs">· ${s.long} parts</span>` : ''}`; }

function shell(inner) {
  const st = sceneStats();
  const outline = `<div id="outline"><div class="it lnk"><b>Aiuteur</b><span class="dim xs">The Harbour Letter</span></div>
<h6>STORY</h6>${['Input', 'Interview', 'Treatment', 'Beat Sheet', 'Master Narrative'].map(x => `<div class="it">${x}<span class="dim xs">✓</span></div>`).join('')}
<h6>WORLD</h6><div class="it">World Definition<span class="dim xs">✓</span></div>
<h6>SCENES</h6>${[5, 6].map(n => `<div class="it">Scene ${n}<span class="dim xs">done</span></div>`).join('')}
<div class="it cur lnk" data-act="go" data-view="shot" data-shot="${S.shotId}">Scene 7 · The Harbour Office<span class="dim xs">${st.sel}/${st.n}</span></div>
${S.shots.map(s => `<div class="it sub lnk ${S.view === 'shot' && S.shotId === s.id ? 'cur' : ''}" data-act="go" data-view="shot" data-shot="${s.id}"><span>${s.label}${oodDot(s).replace(/data-act="oodpop"/, 'data-x')}</span><span class="chip ${stateCls[state(s)]}" style="padding:0 6px">${state(s) === 'generating' ? '…' : state(s) === 'failed' ? '!' : state(s) === 'missing' ? '–' : state(s) === 'needs-pick' ? '?' : '✓'}</span></div>`).join('')}
<div class="it">Scenes 8 … 22<span class="dim xs">…</span></div>
<h6>OUTPUT</h6><div class="it lnk ${S.view === 'review' ? 'cur' : ''}" data-act="go" data-view="review" data-scope="scene">Review &amp; Export</div></div>`;
  const top = `<div id="top"><b style="color:var(--tx)">The Harbour Letter</b><span>Scene 7 runtime ${tc(st.runtime)} planned</span><span class="row">Film <span class="bar"><i style="width:${(36 + st.sel * 1.3).toFixed(0)}%"></i></span></span>
<span class="grow"></span>${st.ood ? `<span title="Review all (tray)" class="row" style="cursor:pointer">${st.ood} possibly out of date <span class="wd" style="margin:0"></span></span>` : ''}${S.notices.length ? `<span>${S.notices.length} updates</span>` : ''}<span>Today <span class="price">${money(S.spent)}</span> <span class="dim">of ${money(CAP)} cap</span></span></div>`;
  return `<div id="app">${outline}<div id="main">${top}<div id="centre">${inner}</div></div></div><div class="toast">${S.toasts.map(t => `<div>${t.m}</div>`).join('')}</div>${pbar()}`;
}
function pbar() {
  return `<div id="pbar"><b>#62 PROTOTYPE</b>${['A', 'B', 'C'].map(k => `<button class="${S.variant === k ? 'on' : ''}" onclick="location.search='?v=${k}'">${k} ${({ A: 'Viewer', B: 'Wall + tray', C: 'Sequence' })[k]}</button>`).join('')}
<label><input type="checkbox" ${S.sim.failNext ? 'checked' : ''} data-act="simfail"> next job fails</label><label><input type="checkbox" ${S.sim.lateAfterCancel ? 'checked' : ''} data-act="simlate"> late result after cancel</label><button data-act="reset">reset</button></div>`;
}
function render() {
  const ae = document.activeElement; const keep = ae && ae.tagName === 'TEXTAREA' && ae.dataset.bind;
  const pos = keep ? ae.selectionStart : 0; const sc = $('#centre') ? $('#centre').scrollTop : 0;
  const inner = S.view === 'review' ? V.renderReview() : V.renderShot(cur());
  document.body.innerHTML = shell(inner);
  if ($('#centre')) $('#centre').scrollTop = sc;
  if (keep) { const t = document.querySelector('textarea[data-bind="guidance"]'); if (t) { t.focus(); t.setSelectionRange(pos, pos); } }
}
// shared: confirm-step reasons text
function reasonList(ev) { return ev.reasons.map(r => `<li>${r}</li>`).join(''); }
// shared: sequence player stage
function stageHTML(it, extra = '') {
  if (!it) return `<div class="slate" style="height:100%">Nothing to play</div>`;
  if (it.gap) return `<div class="slate" style="min-height:160px"><div><b>${it.shot.label} · no selected take</b><div class="xs">Gap in the sequence${it.shot.mock ? '' : ''}</div></div></div>`;
  const t = it.take;
  return `<div class="poster ${S.play.on ? 'kb' : ''}" style="background-image:${it.shot.mock ? poster(it.shot.hue, it.shot.id) : posterOf(it.shot, t)}"><span class="tc">${it.shot.label}${t && t.n ? ' · take ' + t.n : ''}</span>${extra}</div>`;
}
function boot(mod) {
  V = mod; S.variant = new URLSearchParams(location.search).get('v') || 'A';
  render();
}

// PROTOTYPE #59 (throwaway). Shared mock data, state, spend rule, small widgets. No persistence.
// Prices are ILLUSTRATIVE ($0.08 / image) so the #68 spend rule can be felt; they are not a real price entry.
const PRICE = 0.08;
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = (n) => '$' + n.toFixed(2);
let uid = 100;

const E = (o) => Object.assign({ status: 'proposed', depth: 'detailed', attempts: [], active: 0, looks: [], scenes: [], approved: false }, o);
const D = (id, label, desc, needed = [], view = null) => ({ id, label, desc, needed, view });

const S = {
  scenes: [
    { n: 1, title: 'Dawn at the harbour', loc: 'office', cast: ['marcus', 'foreman', 'dockers'], text: 'MARCUS HALE unlocks the HARBOUR OFFICE before dawn. The FOREMAN waits by the window with the day’s manifest while DOCKWORKERS drift in below.' },
    { n: 2, title: 'The crossing', loc: 'deck', cast: ['marcus', 'elena'], props: ['compass'], text: 'On the FERRY DECK, Marcus checks his brass COMPASS at the bow. ELENA VOSS watches from the stern rail.' },
    { n: 3, title: 'Breakfast, years on', loc: 'kitchen', cast: ['marcus', 'elena'], text: 'In the HALE KITCHEN, light spills through the window onto the table. Marcus and Elena eat in silence.' },
    { n: 4, title: 'Mud', loc: 'deck', cast: ['marcus'], text: 'Marcus, now covered in mud, hauls himself back over the rail onto the ferry deck.' },
    { n: 5, title: 'The boy (flashback)', loc: 'kitchen', cast: ['marcus'], text: 'MARCUS, age twelve, stands on a chair at the stove in the Hale kitchen.' },
    { n: 6, title: 'The boy, later', loc: 'kitchen', cast: ['marcus'], text: 'The boy slips out through the kitchen door into the rain.' },
    { n: 7, title: 'The ledger', loc: 'office', cast: ['marcus', 'foreman'], props: ['ledger'], text: 'At the desk in the harbour office, Marcus opens the LEDGER. The Foreman won’t meet his eye. “Mr. Hale,” he says.' },
    { n: 8, title: 'Last ferry', loc: 'deck', cast: ['marcus', 'elena', 'foreman', 'dockers'], props: ['compass'], text: 'Everyone crowds the ferry deck. Marcus gives Elena the compass. Far off, the LIGHTHOUSE goes dark.' },
  ],
  ents: [
    E({ id: 'marcus', type: 'character', name: 'Marcus Hale', scenes: [1, 2, 3, 4, 5, 6, 7, 8], attempts: [{ seed: 1, src: 'gen' }], desc: 'Mid-50s ferry captain, weathered face, grey stubble, heavy navy peacoat over a creased white shirt. Carries himself like a man who stopped expecting good news.',
      looks: [
        { id: 'l1', name: 'Muddy suit', delta: 'Same man; suit soaked and caked in harbour mud, one sleeve torn.', from: 'Scene 4', extent: 'from here on', state: 'proposed' },
        { id: 'l2', name: 'Age 12', delta: 'The boy he was: thin, cropped hair, oversized wool jumper.', from: 'Scenes 5–6', extent: 'only there (flashback)', state: 'proposed' },
      ] }),
    E({ id: 'hale', type: 'character', name: 'Mr. Hale', scenes: [7], desc: 'An older man the Foreman addresses in the harbour office; no description of his own in the narrative.', dupOf: 'marcus' }),
    E({ id: 'elena', type: 'character', name: 'Elena Voss', scenes: [2, 3, 8], desc: 'Late 20s, sharp-eyed insurance investigator in a rain-dark trench coat, dark hair tied back, a leather satchel always on one shoulder.' }),
    E({ id: 'foreman', type: 'character', name: 'Dock Foreman', scenes: [1, 7, 8], depth: 'lightweight', desc: 'Stocky man in a hi-vis vest and flat cap; appears in three scenes and has four lines.' }),
    E({ id: 'dockers', type: 'extra', name: 'Dockworkers', scenes: [1, 8], depth: 'lightweight', desc: 'A loose crowd of weathered harbour workers in oilskins and caps, never individually important.' }),
    E({ id: 'kitchen', type: 'location', name: 'Hale Kitchen', scenes: [3, 5, 6], attempts: [{ seed: 11, src: 'upload' }], desc: 'A narrow 1960s kitchen: cracked green tile, a cast-iron stove on the north wall, a single window over a scarred pine table, a back door that sticks in damp weather.',
      mode: 'multi', dirs: [D('est', 'Establishing', 'Wide from the doorway'), D('window', 'Toward the window', 'Window over the table', [3]), D('stove', 'Toward the stove', 'North wall, cast-iron stove', [5]), D('door', 'Toward the back door', 'Sticking back door', [6]), D('table', 'Table close', 'Pine table, two chairs', [3])] }),
    E({ id: 'deck', type: 'location', name: 'Ferry Deck', scenes: [2, 4, 8], attempts: [{ seed: 12, src: 'gen' }], desc: 'The open car deck of an ageing river ferry: rust-streaked rails, wet planking, a wheelhouse above, the grey harbour beyond.',
      mode: 'multi', dirs: [D('est', 'Establishing', 'Wide over the car deck'), D('bow', 'Toward the bow', 'Bow rail and horizon', [2]), D('stern', 'Toward the stern', 'Wake and stern rail', [2, 8]), D('rail', 'Port rail', 'Side rail, water below', [4]), D('wheel', 'Wheelhouse door', 'Stairs and wheelhouse', [])] }),
    E({ id: 'office', type: 'location', name: 'Harbour Office', scenes: [1, 7], desc: 'A cramped timber office above the quay: a heavy desk, filing shelves, a window over the moorings, a stove-pipe heater.',
      mode: 'multi', dirs: [D('est', 'Establishing', 'Wide from the stairs'), D('desk', 'Toward the desk', 'Desk and ledger shelf', [7]), D('window', 'Toward the window', 'Moorings below', [1]), D('door', 'Toward the door', 'Stairwell door', [])] }),
    E({ id: 'compass', type: 'prop', name: 'Brass Compass', scenes: [2, 8], attempts: [{ seed: 21, src: 'gen' }], desc: 'A palm-sized brass compass, glass cracked across the lid, engraved “M.H.” on the back.' }),
    E({ id: 'ledger', type: 'prop', name: 'The Ledger', scenes: [7], depth: 'lightweight', desc: 'A cloth-bound ledger, spine split, pages crowded with columns of tiny handwriting.' }),
  ],
  style: { mode: 'ai', preset: 'Rain-soaked noir', text: '', refs: [] },
  ui: { sel: 'marcus', tab: 'identity', scene: 3, reviewMode: true },
  spent: 0, toast: null, modal: null, lastAccept: null,
};
const ent = (id) => S.ents.find((e) => e.id === id);
const TYPES = { character: 'Characters', location: 'Places', prop: 'Props', extra: 'Extra types' };
const TYPE1 = { character: 'Character', location: 'Location', prop: 'Prop', extra: 'Extra type' };

// ---------- derived ----------
const live = (e) => e.status !== 'retired';
const isLoc = (e) => e.type === 'location';
const hero = (e) => (e.attempts[e.active] ? { seed: e.attempts[e.active].seed, state: 'accepted' } : null);
const dirView = (e, d) => (d.id === 'est' ? hero(e) : d.view);
const activeDirs = (e) => (e.mode === 'single' ? e.dirs.filter((d) => d.id === 'est') : e.dirs.filter((d) => !d.skipped));
const missingDirs = (e) => activeDirs(e).filter((d) => !dirView(e, d));
const draftsOf = (e) => activeDirs(e).filter((d) => d.view && d.view.state === 'draft');
const neededMissing = (e) => activeDirs(e).filter((d) => !dirView(e, d) && (d.id === 'est' || d.needed.length));
const pendingOf = (e) => activeDirs(e).filter((d) => d.view && d.view.state === 'pending');
const sceneNeeds = (n) => {
  const sc = S.scenes.find((s) => s.n === n);
  return { scene: sc, loc: ent(sc.loc), cast: sc.cast.map(ent), props: (sc.props || []).map(ent) };
};
function readiness(e) {
  if (e.status === 'deferred') return { t: 'deferred', c: 'dim', why: 'Deferred. Only the scenes that need it are affected.' };
  if (e.depth === 'lightweight') return { t: 'lightweight · from text', c: 'ok', why: 'Generated from its description.' };
  if (!hero(e)) return { t: 'no image yet', c: 'warn', why: 'Needs a decision when frames are made: define, make lightweight, or let the AI compile it.' };
  if (isLoc(e) && e.mode === 'multi' && missingDirs(e).length) return { t: `${missingDirs(e).length} directions missing`, c: 'warn', why: 'Shots fall back to the establishing image until covered. Never blocks.' };
  return { t: 'ready', c: 'ok', why: '' };
}

// ---------- art (procedural placeholders, no real images) ----------
const PAL = { kitchen: ['#c9d4c0', '#8a9b84', '#5a4a3a'], deck: ['#b6c3cc', '#6d7f8c', '#4a4038'], office: ['#d7cdb8', '#a0937a', '#4e4233'], lighthouse: ['#cfd6dd', '#7a8794', '#3c4650'] };
function art(locId, dir, seed = 1, w = 160, h = 100) {
  const [wall, floor, dark] = PAL[locId] || PAL.kitchen;
  const rot = (seed * 37) % 40 - 20;
  const feat = {
    est: `<rect x="96" y="22" width="34" height="30" fill="#f3ecc8"/><path d="M96 37h34M113 22v30" stroke="${dark}" stroke-width="2"/><ellipse cx="62" cy="76" rx="26" ry="8" fill="${dark}"/><rect x="40" y="80" width="4" height="14" fill="${dark}"/><rect x="80" y="80" width="4" height="14" fill="${dark}"/>`,
    window: `<rect x="48" y="14" width="64" height="44" fill="#f6efc9"/><path d="M48 36h64M80 14v44" stroke="${dark}" stroke-width="3"/><rect x="30" y="64" width="100" height="8" fill="${dark}"/>`,
    stove: `<rect x="44" y="34" width="72" height="50" fill="#2d2d30"/><circle cx="68" cy="48" r="8" fill="#555"/><circle cx="94" cy="48" r="8" fill="#555"/><rect x="72" y="8" width="16" height="26" fill="#3c3c40"/>`,
    door: `<rect x="56" y="12" width="48" height="76" fill="${dark}"/><circle cx="94" cy="52" r="3" fill="#d8c27a"/><rect x="64" y="22" width="32" height="20" fill="#20262a" opacity=".5"/>`,
    table: `<ellipse cx="80" cy="64" rx="56" ry="16" fill="${dark}"/><rect x="42" y="68" width="6" height="26" fill="${dark}"/><rect x="112" y="68" width="6" height="26" fill="${dark}"/><rect x="64" y="46" width="12" height="10" fill="#e9e3cf"/>`,
    bow: `<rect x="0" y="52" width="160" height="2" fill="#eef"/><path d="M20 90V44M60 90V44M100 90V44M140 90V44M10 50h140" stroke="${dark}" stroke-width="3"/><circle cx="120" cy="24" r="10" fill="#f1eee0"/>`,
    stern: `<path d="M0 60 80 100 160 60" fill="none" stroke="#fff" stroke-width="2" opacity=".6"/><path d="M0 56 160 56" stroke="${dark}" stroke-width="4"/><path d="M30 56v-22M130 56v-22" stroke="${dark}" stroke-width="3"/>`,
    rail: `<path d="M0 30h160M0 52h160" stroke="${dark}" stroke-width="4"/><path d="M20 30v60M70 30v60M120 30v60" stroke="${dark}" stroke-width="3"/><rect x="0" y="78" width="160" height="22" fill="#5e7684"/>`,
    wheel: `<rect x="30" y="10" width="100" height="40" fill="${dark}"/><rect x="40" y="18" width="80" height="18" fill="#cfe0e8"/><path d="M60 50l-12 40h64l-12-40" fill="#6a5d4e"/>`,
    desk: `<rect x="20" y="58" width="120" height="12" fill="${dark}"/><rect x="26" y="70" width="8" height="24" fill="${dark}"/><rect x="126" y="70" width="8" height="24" fill="${dark}"/><rect x="52" y="48" width="38" height="10" fill="#e5dcc0"/><rect x="100" y="12" width="40" height="42" fill="#8a7a5c"/>`,
  }[dir] || '';
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="g${locId}${dir}${seed}" x1="0" x2="1"><stop offset="0" stop-color="${wall}"/><stop offset="1" stop-color="${wall}" stop-opacity=".75"/></linearGradient></defs><g style="filter:hue-rotate(${rot}deg)"><rect width="${w}" height="${h}" fill="url(#g${locId}${dir}${seed})"/><rect y="68" width="${w}" height="32" fill="${floor}" opacity=".85"/>${feat}</g></svg>`;
}
const SKIN = ['#d9b08c', '#b98a64', '#e6c3a1', '#9c7355', '#c79b7d'];
function portrait(e, seed = 1) {
  const c = SKIN[seed % SKIN.length], coat = ['#2d3b52', '#5a4a3a', '#3b4a40', '#6b3b3b'][seed % 4];
  if (e.type === 'prop') return `<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#e9e5da"/><circle cx="50" cy="52" r="26" fill="#b99346"/><circle cx="50" cy="52" r="20" fill="#f1ead2"/><path d="M50 36l5 16-5 16-5-16z" fill="#a33"/></svg>`;
  if (e.type === 'extra') return `<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#dfe3e6"/>${[22, 50, 78].map((x, i) => `<circle cx="${x}" cy="${40 + (i % 2) * 6}" r="11" fill="${SKIN[(seed + i) % 5]}"/><rect x="${x - 14}" y="${54 + (i % 2) * 6}" width="28" height="40" rx="12" fill="${['#3d4a52', '#55503f', '#2f3b3a'][i]}"/>`).join('')}</svg>`;
  return `<svg viewBox="0 0 100 100"><rect width="100" height="100" fill="#e6e2da"/><rect x="22" y="58" width="56" height="50" rx="22" fill="${coat}"/><circle cx="50" cy="38" r="17" fill="${c}"/><path d="M33 34q17-24 34 0q-3-14-17-14t-17 14z" fill="#3a3028"/></svg>`;
}
function img(e, seed, dirId) { return isLoc(e) ? art(e.id, dirId || 'est', seed) : portrait(e, seed); }
const tile = (inner, cls = '') => `<div class="tile ${cls}">${inner}</div>`;

// ---------- actions registry & render ----------
const ACTIONS = {};
const VARIANTS = {};
let current = 'A';
function render() {
  const v = VARIANTS[current];
  $('#centre').innerHTML = v.render();
  $('#spent').textContent = money(S.spent);
  $('#vlabel').textContent = `${current} · ${v.name}`;
  $('#toast').innerHTML = S.toast ? `<span>${S.toast.msg}</span>${S.toast.undo ? '<button data-act="undo">Undo</button>' : ''}` : '';
  $('#toast').style.display = S.toast ? 'flex' : 'none';
  $('#modal').innerHTML = S.modal ? S.modal.html() : '';
  $('#modal').style.display = S.modal ? 'flex' : 'none';
  const need = S.ents.filter((e) => e.status === 'proposed').length;
  $('#outlineWd').innerHTML = need ? `<i class="dot"></i>` : '';
}
function toast(msg, undo) { S.toast = { msg, undo }; clearTimeout(toast.t); toast.t = setTimeout(() => { S.toast = null; render(); }, 5000); render(); }
document.addEventListener('click', (ev) => {
  const a = ev.target.closest('[data-act]');
  if (!a) return;
  const f = ACTIONS[a.dataset.act];
  if (f) { f(a.dataset, a, ev); render(); }
});
document.addEventListener('change', (ev) => {
  const a = ev.target.closest('[data-chg]');
  if (a && ACTIONS[a.dataset.chg]) { ACTIONS[a.dataset.chg](a.dataset, a, ev); render(); }
});
document.addEventListener('input', (ev) => {
  const a = ev.target.closest('[data-inp]');
  if (a) { const [id, f] = a.dataset.inp.split('.'); const e = ent(id); if (e) e[f] = a.value; else if (id === 'style') S.style.text = a.value; }
});

// ---------- spend rule (#68): mechanical, shown at the initiating control ----------
// confirm when total >= $2.00, >= 10 Generations, bulk-by-filter, unknown price, cap. Otherwise one click with price shown.
function needsConfirm(n, total, bulkFilter) { return n >= 10 || total >= 2 || bulkFilter; }
function why(n, total, bulkFilter) { return n >= 10 ? `${n} Generations (rule: 10 or more)` : total >= 2 ? `total ${money(total)} (rule: $2.00 or more)` : 'bulk regenerate by filter'; }
const priceTag = (n) => `<span class="price">est ${money(n * PRICE)}</span>`;
function spend(n, label, go, bulkFilter = false) {
  const total = n * PRICE;
  const run = () => { S.spent += total; S.modal = null; go(); };
  if (!needsConfirm(n, total, bulkFilter)) { run(); return; }
  ACTIONS._confirm = () => run();
  S.modal = { html: () => `<div class="dlg"><h3>${esc(label)}</h3><p><b>${n} images · est ${money(total)}</b> (${money(PRICE)} each, largest ${money(PRICE)}).</p><p class="dim">Separate confirmation because: ${why(n, total, bulkFilter)}. The click approves this sum; staleness and retries never spend on their own.</p><div class="row"><button class="btn" data-act="_cancel">Cancel</button><button class="btn pri" data-act="_confirm">Generate ${n} · ${money(total)}</button></div></div>` };
}
ACTIONS._cancel = () => { S.modal = null; };
ACTIONS.undo = () => { if (S.lastAccept) { S.lastAccept(); S.lastAccept = null; } S.toast = null; };

// ---------- domain ops ----------
function later(f, ms = 900) { setTimeout(() => { f(); render(); }, ms); }
function genHero(e) { e.attempts.push({ seed: ++uid, src: 'gen' }); e.active = e.attempts.length - 1; }
function fanOut(e, which) { // which: list of dirs to generate (non-hero start as pending -> draft)
  const heroNeeded = which.some((d) => d.id === 'est') ;
  if (heroNeeded) genHero(e);
  which.filter((d) => d.id !== 'est').forEach((d) => { d.view = { seed: ++uid, state: 'pending' }; });
  later(() => which.forEach((d) => { if (d.view && d.view.state === 'pending') d.view.state = 'draft'; }));
}
function acceptDrafts(es) {
  const prev = [];
  es.forEach((e) => draftsOf(e).forEach((d) => { prev.push(d); d.view.state = 'accepted'; }));
  S.lastAccept = () => prev.forEach((d) => { d.view.state = 'draft'; });
  toast(`Accepted ${prev.length} views`, true);
}
const nDraft = (es) => es.reduce((n, e) => n + draftsOf(e).length, 0);

ACTIONS.setStatus = ({ id, v }) => { ent(id).status = v; };
ACTIONS.keepAll = () => { S.ents.filter((e) => e.status === 'proposed' && !e.dupOf).forEach((e) => (e.status = 'kept')); };
ACTIONS.depth = ({ id }) => { const e = ent(id); e.depth = e.depth === 'lightweight' ? 'detailed' : 'lightweight'; };
ACTIONS.sel = ({ id }) => { S.ui.sel = id; S.ui.tab = 'identity'; S.ui.reviewMode = false; S.ui.scene = null; };
ACTIONS.tab = ({ v }) => { S.ui.tab = v; };
ACTIONS.mode = ({ id, v }) => { ent(id).mode = v; };
ACTIONS.active = ({ id, i }) => { ent(id).active = +i; };
ACTIONS.approve = ({ id }) => { const e = ent(id); e.approved = true; toast(`${e.name}: identity approved. Lock it? <button class="lnk" data-act="noop">not now</button>`); };
ACTIONS.noop = () => { S.toast = null; };
ACTIONS.upload = ({ id }) => { const e = ent(id); e.attempts.push({ seed: ++uid, src: 'upload' }); e.active = e.attempts.length - 1; };
ACTIONS.genAttempt = ({ id }) => { const e = ent(id); spend(1, `Another attempt for ${e.name}`, () => genHero(e)); };
ACTIONS.fanOut = ({ id }) => { const e = ent(id); const w = missingDirs(e); spend(w.length, `Cover ${e.name}`, () => fanOut(e, w)); };
ACTIONS.fanNeeded = ({ id }) => { const e = ent(id); const w = neededMissing(e); spend(w.length, `Cover what the story needs: ${e.name}`, () => fanOut(e, w)); };
ACTIONS.acceptRow = ({ id }) => acceptDrafts([ent(id)]);
ACTIONS.regen = ({ id, d }) => { const e = ent(id), dir = e.dirs.find((x) => x.id === d); spend(1, `Regenerate ${dir.label}`, () => { dir.view = { seed: ++uid, state: 'pending' }; later(() => (dir.view.state = 'draft')); }); };
ACTIONS.uploadView = ({ id, d }) => { const dir = ent(id).dirs.find((x) => x.id === d); dir.view = { seed: ++uid, state: 'accepted', up: true }; };
ACTIONS.skipDir = ({ id, d }) => { const dir = ent(id).dirs.find((x) => x.id === d); dir.skipped = !dir.skipped; };
ACTIONS.addDir = ({ id, d }) => { const dir = ent(id).dirs.find((x) => x.id === d); dir.needed = dir.needed.length ? dir.needed : [0]; };
ACTIONS.allMissing = () => { const ls = S.ents.filter((e) => isLoc(e) && live(e) && e.status !== 'deferred'); const w = ls.map((e) => [e, missingDirs(e)]); const n = w.reduce((a, [, m]) => a + m.length, 0); spend(n, 'Generate all missing coverage', () => w.forEach(([e, m]) => fanOut(e, m))); };
ACTIONS.allNeeded = () => { const ls = S.ents.filter((e) => isLoc(e) && live(e) && e.status !== 'deferred'); const w = ls.map((e) => [e, neededMissing(e)]); const n = w.reduce((a, [, m]) => a + m.length, 0); spend(n, 'Cover what the story needs', () => w.forEach(([e, m]) => fanOut(e, m))); };
ACTIONS.acceptAll = () => acceptDrafts(S.ents.filter((e) => isLoc(e)));
ACTIONS.lookState = ({ id, l, v }) => { ent(id).looks.find((x) => x.id === l).state = v; };
ACTIONS.mergeOpen = ({ id }) => { const e = ent(id); S.modal = { html: () => `<div class="dlg"><h3>Merge “${esc(e.name)}” into…</h3><p class="dim">Within one type. Nothing is destroyed: ${esc(e.name)} is retired with a redirect, its name becomes an alias, its images appear as candidates, its Looks can be re-created under the survivor. Un-merge is restoring it.</p><div class="col">${S.ents.filter((x) => x.type === e.type && x.id !== e.id && live(x) && !x.mergedInto).map((x) => `<button class="btn" data-act="doMerge" data-id="${e.id}" data-to="${x.id}">${esc(x.name)}</button>`).join('')}</div><div class="row"><button class="btn" data-act="_cancel">Cancel</button></div></div>` }; };
ACTIONS.doMerge = ({ id, to }) => { const e = ent(id), s = ent(to); e.status = 'retired'; e.mergedInto = to; s.aliases = (s.aliases || []).concat(e.name); S.modal = null; if (S.ui.sel === id) S.ui.sel = to; toast(`Merged “${e.name}” into ${s.name}. <button class="lnk" data-act="unmerge" data-id="${id}">Un-merge</button>`); };
ACTIONS.unmerge = ({ id }) => { const e = ent(id); const s = ent(e.mergedInto); s.aliases = s.aliases.filter((a) => a !== e.name); e.status = 'proposed'; delete e.mergedInto; S.toast = null; };
ACTIONS.retype = ({ id }, el) => {
  const e = ent(id), to = el.value, from = e.type; if (to === from) return;
  const fx = to === 'extra' ? 'Looks are retired (recoverable); Voice dormant.' : to === 'location' ? 'Existing images become the first establishing attempts; coverage will be proposed.' : from === 'location' ? 'Directions and Views are retired but recoverable; shots using it read “needs a Location”.' : 'Everything kept; existing images marked possibly out of date.';
  e.type = to; if (to === 'location' && !e.dirs) { e.mode = 'multi'; e.dirs = [D('est', 'Establishing', 'Wide view'), D('a', 'Direction A', 'Proposed by AI'), D('b', 'Direction B', 'Proposed by AI')]; } toast(`${e.name} is now a ${TYPE1[to]}. ${fx}`);
};
ACTIONS.addMissed = () => {
  if (ent('lighthouse')) return;
  S.ents.push(E({ id: 'lighthouse', type: 'location', name: 'The Lighthouse', status: 'kept', scenes: [8], desc: 'Added by you: a distant white lighthouse on the breakwater, visible only as a light that goes dark.', mode: 'single', dirs: [D('est', 'Establishing', 'Seen from the ferry')], note: 'added' }));
  S.ui.sel = 'lighthouse'; S.ui.reviewMode = false; S.ui.scene = null;
  toast('Added “The Lighthouse”: single-image, lightweight, no coverage needed.');
};
ACTIONS.styleMode = ({ v }) => { S.style.mode = v; };
ACTIONS.preset = ({ v }) => { S.style.preset = v; S.style.mode = 'preset'; };
ACTIONS.addRef = () => { S.style.refs.push(S.style.refs.length + 3); S.style.mode = 'refs'; };

// ---------- shared widgets ----------
const dot = (c) => `<i class="sd ${c}"></i>`;
function attemptsStrip(e) {
  return `<div class="attempts">${e.attempts.map((a, i) => `<button class="att ${i === e.active ? 'on' : ''}" data-act="active" data-id="${e.id}" data-i="${i}" title="${a.src}">${tile(img(e, a.seed))}<small>${i === e.active ? 'active' : a.src}</small></button>`).join('')}
  <div class="attbtns"><button class="btn sm" data-act="genAttempt" data-id="${e.id}">${e.attempts.length ? 'Generate another' : 'Generate'} ${priceTag(1)}</button><button class="btn sm" data-act="upload" data-id="${e.id}">Upload</button>${e.attempts.length ? `<button class="btn sm pri" data-act="approve" data-id="${e.id}" ${e.approved ? 'disabled' : ''}>${e.approved ? 'Identity approved' : 'Approve identity'}</button>` : ''}</div></div>`;
}
function actionsMenu(e) {
  return `<div class="acts">
    <button class="btn sm" data-act="setStatus" data-id="${e.id}" data-v="${e.status === 'deferred' ? 'kept' : 'deferred'}">${e.status === 'deferred' ? 'Restore' : 'Defer'}</button>
    <button class="btn sm" data-act="mergeOpen" data-id="${e.id}">Merge…</button>
    <label class="sel">Type <select data-chg="retype" data-id="${e.id}">${Object.keys(TYPE1).map((t) => `<option value="${t}" ${t === e.type ? 'selected' : ''}>${TYPE1[t]}</option>`).join('')}</select></label>
    <button class="btn sm" data-act="depth" data-id="${e.id}">${e.depth === 'lightweight' ? 'Make detailed' : 'Keep lightweight'}</button></div>`;
}
function looksPanel(e) {
  if (!e.looks.length) return `<p class="dim">${e.type === 'extra' ? 'Extra types have no Looks.' : 'No Looks proposed: the story does not change this ' + TYPE1[e.type].toLowerCase() + '. The base appearance is used everywhere.'}</p>`;
  return e.looks.map((l) => `<div class="look ${l.state}"><div><b>${esc(l.name)}</b> <span class="dim">· ${esc(l.from)} · ${esc(l.extent)}</span><div class="dim">${esc(l.delta)}</div><div class="whisper">Proposed from the narrative: “${esc(e.name)}” changes here. Carries forward until the story changes it.</div></div>
  <div class="row">${l.state === 'proposed' ? `<button class="btn sm pri" data-act="lookState" data-id="${e.id}" data-l="${l.id}" data-v="accepted">Accept</button><button class="btn sm" data-act="lookState" data-id="${e.id}" data-l="${l.id}" data-v="dismissed">Dismiss</button>` : `<span class="dim">${l.state}</span><button class="btn sm" data-act="lookState" data-id="${e.id}" data-l="${l.id}" data-v="proposed">Undo</button>`}</div></div>`).join('') + `<button class="btn sm">+ Add a Look</button>`;
}
function stylePanel() {
  const st = S.style;
  const p = ['Rain-soaked noir', 'Warm 16mm drama', 'Clean pastel animation', 'Gritty documentary'];
  return `<div class="stylep"><div class="row wrap"><b>Visual Style</b> ${st.mode === 'ai' ? '<span class="aitag">AI chose: Rain-soaked noir</span><span class="dim">a project is never blocked on style</span>' : ''}</div>
  <div class="tabs">${[['preset', 'Preset'], ['plain', 'Plain English'], ['refs', 'Reference images']].map(([k, n]) => `<button class="${st.mode === k || (st.mode === 'ai' && k === 'preset') ? 'on' : ''}" data-act="styleMode" data-v="${k}">${n}</button>`).join('')}</div>
  ${st.mode === 'plain' ? `<textarea data-inp="style.x" placeholder="e.g. grainy 16mm, desaturated teal shadows, long cold rain light…">${esc(st.text)}</textarea>` : st.mode === 'refs' ? `<div class="row">${st.refs.map((r) => `<div class="mini">${tile(art('deck', 'bow', r, 80, 50))}</div>`).join('')}<button class="btn sm" data-act="addRef">+ Add image</button></div>` : `<div class="row wrap">${p.map((x) => `<button class="chip ${st.preset === x ? 'on' : ''}" data-act="preset" data-v="${x}">${x}</button>`).join('')}</div>`}
  <div class="whisper">Applied by reference, after identity. Changing it later only marks visual work “possibly out of date”.</div></div>`;
}
function finalizeBar() {
  const ls = S.ents.filter(live);
  const c = (s) => ls.filter((e) => e.status === s).length;
  const lw = ls.filter((e) => e.depth === 'lightweight' && e.status !== 'deferred').length;
  const unrev = c('proposed');
  return `<div class="final"><span><b>${c('kept')}</b> kept · <b>${lw}</b> lightweight · <b>${c('deferred')}</b> deferred${unrev ? ` · <b>${unrev}</b> not reviewed yet` : ''}</span><span class="dim">Deferral never blocks planning or other scenes.</span>
  <button class="btn pri" data-act="finalize">${S.finalized ? 'World set ✓' : 'The world is set'}</button></div>`;
}
ACTIONS.finalize = () => { S.finalized = true; toast('World marked set. Offer: lock Visual Style &amp; World Definition? <button class="lnk" data-act="noop">lock</button> <button class="lnk" data-act="noop">not now</button>'); };

// ---------- boot ----------
function boot() {
  const q = new URLSearchParams(location.search).get('variant');
  current = VARIANTS[q] ? q : 'A';
  document.addEventListener('keydown', (e) => {
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1);
  });
  $('#prev').onclick = () => go(-1); $('#next').onclick = () => go(1);
  $('#outlineScenes').innerHTML = S.scenes.map((s) => `<div class="oi sub">${s.n}. ${esc(s.title)}</div>`).join('');
  render();
}
function go(d) { const k = Object.keys(VARIANTS); current = k[(k.indexOf(current) + d + k.length) % k.length]; history.replaceState(null, '', '?variant=' + current); render(); }

/* PROTOTYPE (Wayfinder #60). THROWAWAY. In-memory only; wipe me.
   Mock project: 22 scenes, ~200 shots. Not a schema; shapes are illustrative. */
(function () {
  let seed = 60;
  const rnd = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pick = a => a[Math.floor(rnd() * a.length)];
  const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));

  const CHARS = ['Marcus', 'Elena', 'Inspector Okafor', 'Dmitri', 'Pip'];
  const SCENES = [
    ['Dawn at the bakery', 'Bakery kitchen'], ['The letter arrives', 'Bakery front counter'], ['Elena objects', 'Bakery kitchen'],
    ['Market run', 'Old town market'], ['Dmitri makes an offer', 'Cafe terrace'], ['The plan, on napkins', 'Bakery back room'],
    ['Casing the vault', 'Grand Hotel lobby'], ['Pip causes trouble', 'Hotel service corridor'], ['Okafor gets a tip', 'Police station'],
    ['Night prep', 'Bakery kitchen'], ['Into the pastry van', 'Back alley'], ['The loading dock', 'Hotel loading dock'],
    ['Wrong floor', 'Hotel elevator'], ['The vault, almost', 'Hotel vault corridor'], ['Dmitri double-crosses', 'Hotel kitchen'],
    ['Chase through the market', 'Old town market'], ['Okafor closes in', 'Bridge at night'], ['Elena improvises', 'Pastry van'],
    ['Confession', 'Police interview room'], ['The croissant ledger', 'Bakery back room'], ['Morning line', 'Bakery front counter'], ['Last bake', 'Bakery kitchen'],
  ];
  const ACT = [
    c => `${c} wipes flour from both hands and looks at the clock.`, c => `${c} slides a tray into the oven and listens for the click.`,
    c => `${c} reads the paper twice, then folds it very small.`, c => `${c} steps back, hits a stack of crates, and the whole stack leans.`,
    c => `${c} lowers their voice and leans across the counter.`, c => `${c} watches the door without turning their head.`,
    c => `${c} counts coins into a paper bag, short by one.`, c => `${c} opens the hatch an inch and checks the corridor.`,
  ];
  const DLG = [
    'We said no more favours.', 'It was only supposed to be one croissant.', 'Do you have any idea what time it is?', 'Nobody says a word about the van.',
    'I can fix this. Give me ten minutes.', 'That is not a plan. That is a hope with pockets.', 'You owe me a tray of eclairs.', 'Stay low and keep the dough warm.',
  ];
  const SIZES = ['wide', 'medium', 'close-up', 'insert'], ANGLES = ['eye level', 'low', 'high', 'over-shoulder'], MOVES = ['static', 'push in', 'pan', 'handheld', 'track'];
  const DIRS = ['toward the window', 'toward the ovens', 'toward the door', 'toward the counter'];

  let nextId = 1000;
  const sid = () => 'sh_' + (nextId++);

  function makeBlocks(scene) {
    const n = ri(10, 22), blocks = [], cs = [pick(CHARS), pick(CHARS)];
    for (let i = 0; i < n; i++) {
      if (i % 3 === 1 || rnd() < 0.3) { const who = pick(cs); blocks.push({ id: `${scene.id}_b${i}`, type: 'dialogue', who, text: pick(DLG) }); }
      else blocks.push({ id: `${scene.id}_b${i}`, type: 'action', text: ACT[Math.floor(rnd() * ACT.length)](pick(cs)) });
    }
    return blocks;
  }

  /* shot drafting stand-in: groups blocks into shots; code partitions, invents nothing */
  function draftShots(scene, opts) {
    const out = [], b = scene.blocks; let i = 0;
    while (i < b.length) {
      const len = Math.min(b.length - i, rnd() < 0.7 ? 1 : 2);
      const run = b.slice(i, i + len);
      const dl = run.filter(x => x.type === 'dialogue');
      const act = run.filter(x => x.type === 'action');
      const ents = [...new Set(run.map(x => x.who).filter(Boolean).concat(act.map(x => CHARS.find(c => x.text.includes(c))).filter(Boolean)))];
      out.push({
        id: sid(), anchor: [i, i + len - 1], action: act.length ? act.map(x => x.text).join(' ') : `${dl[0].who} speaks.`,
        dialogue: dl.map(x => ({ who: x.who, line: x.text })), ents: ents.length ? ents : [pick(CHARS)],
        loc: scene.loc, dir: pick(DIRS), dirSrc: 'ai',
        size: pick(SIZES), sizeSrc: 'ai', angle: pick(ANGLES), angleSrc: 'ai', move: pick(MOVES), moveSrc: 'ai',
        dur: Math.max(2, Math.round(1.2 + dl.length * 2 + act.length * 2.2 + rnd() * 1.5)), durSrc: 'ai',
        cont: i === 0 ? 'cut' : (rnd() < 0.7 ? 'continues' : 'same place, new view'),
        roles: [{ kind: 'opening', state: 'none', n: 0 }].concat(rnd() < 0.5 ? [{ kind: 'ending', state: 'none', n: 0 }] : []),
        takes: 0, sel: false, final: false, gen: false, failed: false, stale: null, touched: false, deviation: false, retired: false,
        notes: '', compRefs: 0, origin: 'ai',
      });
      i += len;
    }
    return out;
  }

  function build() {
    const scenes = SCENES.map((s, k) => {
      const sc = { id: 's' + (k + 1), n: k + 1, title: s[0], loc: s[1], blocks: [], shots: [], planned: false, accepted: false, locked: false, missingViews: 0, estSec: 0, history: [] };
      sc.blocks = makeBlocks(sc); sc.estSec = Math.round(sc.blocks.length * 4.4 + ri(0, 8));
      sc.missingViews = rnd() < 0.2 ? ri(1, 2) : 0;
      return sc;
    });
    // dispositions: which scenes have plans and how far along they are
    const unplanned = [14, 17, 18, 19, 20, 21];
    scenes.forEach((sc, k) => {
      if (unplanned.includes(k)) return;
      sc.shots = draftShots(sc); sc.planned = true;
      sc.accepted = k < 8 || k === 11;
      // progress by position in the film
      sc.shots.forEach((sh, j) => {
        if (k < 3) { // finished
          sh.roles.forEach(r => { r.state = 'approved'; r.n = ri(1, 3); }); sh.takes = ri(1, 3); sh.sel = true; sh.final = k === 0 && j % 2 === 0;
        } else if (k < 6) { // framed, partly generated
          sh.roles.forEach(r => { r.state = 'approved'; r.n = ri(1, 2); });
          if (rnd() < 0.7) { sh.takes = ri(1, 2); sh.sel = rnd() < 0.5; }
        } else if (k < 9) { // framing
          sh.roles.forEach((r, ri_) => { if (rnd() < 0.6) { r.state = rnd() < 0.7 ? 'approved' : 'made'; r.n = ri(1, 2); } });
        } else if (k === 9) { sh.roles.forEach(r => { r.state = 'skipped'; }); if (j < 3) { sh.takes = 1; sh.sel = j === 0; } if (j === 3) sh.gen = true; }
      });
    });
    // creator-edited scenes (protect on redraft)
    [3, 7, 9, 13].forEach(k => { const sc = scenes[k]; sc.shots.forEach((sh, j) => { if (j % 3 === 0) { sh.touched = true; sh.origin = 'you'; sh.durSrc = 'you'; sh.sizeSrc = 'you'; } }); });
    scenes[4].shots.forEach((sh, j) => { if (j % 4 === 1) sh.stale = 'the narrative passage changed'; });
    scenes[5].shots.forEach((sh, j) => { if (j === 2) sh.stale = 'Marcus\u2019s Look changed'; if (j === 4) sh.failed = true; });
    scenes[6].shots[1] && (scenes[6].shots[1].deviation = true);
    scenes[2].locked = true;
    scenes[10].shots.forEach(sh => { sh.stale = null; });
    scenes[12].accepted = false;
    return scenes;
  }

  const S = { scenes: build(), targetSec: 20 * 60, spend: 41.2, log: [], listeners: [] };

  /* ---------- derived reads (nothing below is stored) ---------- */
  function status(sh) {
    if (sh.retired) return 'retired';
    if (sh.gen) return 'generating';
    if (sh.final) return 'final';
    if (sh.sel) return 'selected';
    if (sh.takes > 0) return 'needs-pick';
    const open = sh.roles.filter(r => r.state === 'none' || r.state === 'made');
    if (open.length === 0) return 'ready';
    if (sh.roles.some(r => r.state === 'approved' || r.state === 'made')) return 'framing';
    return 'planned';
  }
  const shotSec = sh => (sh.sel ? sh.dur + (sh.id.length % 3) - 1 : sh.dur);
  function sceneStats(sc) {
    const a = sc.shots.filter(s => !s.retired);
    const st = a.map(status);
    const cnt = k => st.filter(x => x === k).length;
    const selected = cnt('selected') + cnt('final');
    const framed = a.filter(s => s.roles.every(r => r.state === 'approved' || r.state === 'skipped')).length;
    const generated = a.filter(s => s.takes > 0).length;
    const covered = new Set(); a.forEach(s => { for (let i = s.anchor[0]; i <= s.anchor[1]; i++) covered.add(i); });
    const uncovered = a.length ? sc.blocks.map((b, i) => i).filter(i => !covered.has(i)).length : 0;
    return {
      n: a.length, framed, generated, selected, stale: a.filter(s => s.stale).length, failed: a.filter(s => s.failed).length,
      needsPick: cnt('needs-pick'), generating: cnt('generating'), uncovered, missingViews: sc.missingViews,
      sec: a.reduce((t, s) => t + shotSec(s), 0), touched: a.filter(s => s.touched).length,
      hasDeps: a.filter(s => s.takes > 0 || s.roles.some(r => r.state !== 'none')).length,
    };
  }
  function film() {
    let sec = 0, n = 0, sel = 0, stale = 0, planned = 0;
    S.scenes.forEach(sc => { const x = sceneStats(sc); sec += x.sec; n += x.n; sel += x.selected; stale += x.stale; if (sc.planned) planned++; });
    return { sec, n, sel, stale, planned, unplanned: S.scenes.length - planned };
  }
  const label = (sc, j) => `${sc.n}${String.fromCharCode(65 + (j % 26))}`;
  const fmt = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
  const activeShots = sc => sc.shots.filter(s => !s.retired);

  /* ---------- operations (each is one atomic action group in the real design) ---------- */
  function emit(msg) { if (msg) S.log.unshift(msg); S.listeners.forEach(f => f()); }
  function findShot(id) { for (const sc of S.scenes) { const j = sc.shots.findIndex(s => s.id === id); if (j >= 0) return { sc, sh: sc.shots[j], j }; } }
  function edit(id, field, val) {
    const { sh } = findShot(id); sh[field] = val; sh.touched = true; sh.origin = 'you';
    if (field === 'dur') sh.durSrc = 'you'; if (['size', 'angle', 'move'].includes(field)) sh[field + 'Src'] = 'you';
    if (sh.takes || sh.roles.some(r => r.state === 'approved')) sh.stale = sh.stale || 'you edited this shot'; emit();
  }
  function move(id, d) {
    const { sc, j } = findShot(id); const a = activeShots(sc); const i = a.findIndex(s => s.id === id), t = a[i + d]; if (!t) return;
    const jj = sc.shots.indexOf(t); [sc.shots[j], sc.shots[jj]] = [sc.shots[jj], sc.shots[j]]; emit('Reordered ' + id);
  }
  function split(id) {
    const { sc, sh, j } = findShot(id); const text = sh.action; const cut = text.indexOf('. ') > 0 ? text.indexOf('. ') + 1 : Math.floor(text.length / 2);
    const d1 = Math.max(1, Math.round(sh.dur * cut / text.length)), d2 = Math.max(1, sh.dur - d1);
    const b = Object.assign({}, sh, { id: sid(), action: text.slice(cut).trim() || '(continues)', dur: d2, dialogue: [], takes: 0, sel: false, final: false, gen: false, failed: false, stale: null, roles: sh.roles.map(r => ({ kind: r.kind, state: 'none', n: 0 })), cont: 'continues', splitFrom: sh.id, durSrc: 'ai' });
    sh.action = text.slice(0, cut).trim(); sh.dur = d1; if (sh.takes) sh.stale = 'split: action and duration changed';
    sc.shots.splice(j + 1, 0, b); emit(`Split ${sh.id}: ${d1}s + ${d2}s (sum unchanged)`); return b.id;
  }
  function merge(id) {
    const { sc, sh, j } = findShot(id); const nxt = sc.shots.slice(j + 1).find(s => !s.retired); if (!nxt) return;
    sh.action += ' ' + nxt.action; sh.dialogue = sh.dialogue.concat(nxt.dialogue); sh.dur += nxt.dur; sh.anchor = [Math.min(sh.anchor[0], nxt.anchor[0]), Math.max(sh.anchor[1], nxt.anchor[1])];
    sh.ents = [...new Set(sh.ents.concat(nxt.ents))]; if (nxt.size !== sh.size) sh.notes += ` [from merged shot: ${nxt.size}]`; if (sh.takes) sh.stale = 'merge: action and duration changed';
    nxt.retired = true; nxt.mergedInto = sh.id; emit(`Merged ${nxt.id} into ${sh.id}`);
  }
  function add(scId, afterId) {
    const sc = S.scenes.find(s => s.id === scId); const j = afterId ? sc.shots.findIndex(s => s.id === afterId) + 1 : sc.shots.length;
    const sh = { id: sid(), anchor: null, action: 'New shot', dialogue: [], ents: [], loc: sc.loc, dir: pick(DIRS), dirSrc: 'ai', size: null, angle: null, move: null, dur: 4, durSrc: 'you', cont: 'cut', roles: [{ kind: 'opening', state: 'none', n: 0 }], takes: 0, sel: false, final: false, gen: false, failed: false, stale: null, touched: true, deviation: false, retired: false, notes: '', compRefs: 0, origin: 'you' };
    sc.shots.splice(j, 0, sh); sc.planned = true; emit('Added ' + sh.id); return sh.id;
  }
  function retire(id) { const { sh } = findShot(id); sh.retired = true; emit('Retired ' + id + ' (kept, reachable)'); }
  function unretire(id) { const { sh } = findShot(id); sh.retired = false; emit(); }
  function skipFrames(id) { const { sh } = findShot(id); sh.roles.forEach(r => { if (r.state !== 'approved') r.state = 'skipped'; }); emit(); }
  function approveFrames(id) { const { sh } = findShot(id); sh.roles.forEach(r => { if (r.state !== 'skipped') { r.state = 'approved'; r.n = r.n || 1; } }); emit(); }
  function makeTake(id) { const { sh } = findShot(id); sh.takes++; sh.gen = false; emit('Take made for ' + id); }
  function select(id) { const { sh } = findShot(id); sh.sel = true; emit(); }

  /* Batch drafting: classify per scene (this IS the no-clobber rule, SHOT-MODEL 5.4) */
  function draftDisposition(sc) {
    if (!sc.planned) return { k: 'new', text: 'No plan yet: a new plan is applied', gens: 1 };
    const x = sceneStats(sc);
    if (sc.locked) return { k: 'held', text: 'Plan is locked: result held as a proposal', gens: 1 };
    if (x.hasDeps || x.touched) return { k: 'options', text: `${x.touched ? x.touched + ' edited, ' : ''}${x.hasDeps} with frames or takes: your work stays, changes offered as proposals`, gens: 1 };
    return { k: 'refresh', text: 'Untouched AI plan: refreshed in place (undoable)', gens: 1 };
  }
  function runDraft(ids) {
    const res = [];
    ids.forEach(id => {
      const sc = S.scenes.find(s => s.id === id), d = draftDisposition(sc);
      if (d.k === 'new') { sc.shots = draftShots(sc); sc.planned = true; res.push({ id, k: 'applied', n: sc.shots.length }); }
      else if (d.k === 'refresh') { sc.shots = draftShots(sc); res.push({ id, k: 'applied', n: sc.shots.length }); }
      else { const n = Math.max(1, Math.round(sc.shots.length * 0.3)); sc.proposals = (sc.proposals || 0) + n; res.push({ id, k: d.k, n }); }
    });
    S.lastRun = { res, at: Date.now() }; emit(`Drafted ${ids.length} scene plan(s)`); return res;
  }
  function acceptProposals(id) { const sc = S.scenes.find(s => s.id === id); const n = sc.proposals || 0; sc.proposals = 0; emit(`Applied ${n} proposal(s) in scene ${sc.n}`); }
  function acceptPlan(id) { S.scenes.find(s => s.id === id).accepted = true; emit(); }
  function cost(n) { return n * 0.03; }
  function sub(f) { S.listeners.push(f); }

  window.M = { S, status, sceneStats, film, label, fmt, activeShots, edit, move, split, merge, add, retire, unretire, skipFrames, approveFrames, makeTake, select, draftDisposition, runDraft, acceptProposals, acceptPlan, cost, sub, findShot, shotSec, draftShots, emit, CHARS, SIZES, ANGLES, MOVES };
})();

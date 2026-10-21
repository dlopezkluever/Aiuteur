// THROWAWAY PROTOTYPE for Wayfinder #58 (writing experience). In-memory only. Not production.
// Provenance: c creator, i imported, a ai_generated, e ai_edited (at creator's request)
const R = (t, p) => ({ t, p });
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const txt = runs => runs.map(r => r.t).join('');
const clone = o => JSON.parse(JSON.stringify(o));
const PL = { c: 'You wrote this', i: 'You imported this', a: 'AI-generated', e: 'AI-edited at your request' };

const POOL = [
  { id: 'o1', name: 'The Quiet Ending', tag: 'Elegiac. She leaves by her own choice.', facets: { Tone: 'Elegiac', Ending: 'She leaves willingly', Shape: 'One night' },
    paras: ['Edda has kept the Skerry light for thirty years, and tonight the harbour board is sending a boat to tell her it will be automated.',
      'She spends her last storm repairing the lamp she was told to leave alone.',
      'At dawn the lamp goes dark by her own hand, and she rows ashore, lighter than she arrived.'] },
  { id: 'o2', name: 'The Rescue', tag: 'Thriller. The storm forces a choice.', facets: { Tone: 'Tense', Ending: 'She saves a boy, loses the light', Shape: 'One night, ticking clock' },
    paras: ['A storm closes on the Skerry just as Edda learns the board will automate her light at dawn.',
      'A boy’s dinghy is swept toward the rocks, and only the lamp she is forbidden to touch can guide him in.',
      'She saves him, the lamp burns out for good, and nobody at the board ever learns whose choice it was.'] },
  { id: 'o3', name: 'The Letter', tag: 'Warm. Nonlinear, ends in reconciliation.', facets: { Tone: 'Warm', Ending: 'Reconciles with her daughter', Shape: 'Cuts between then and now' },
    paras: ['Edda rereads a letter from her estranged daughter while the harbour board’s boat crosses to announce the light’s end.',
      'Memories of the daughter’s childhood on the rock interrupt the repairs Edda makes through the night.',
      'At dawn the daughter is on the boat, and the last scene is the two of them lighting the lamp one final time.'] },
  { id: 'o4', name: 'The Machine', tag: 'Dark comedy. She sabotages the automation.', facets: { Tone: 'Wry, dark', Ending: 'The machine fails on cue', Shape: 'Escalating gags' },
    paras: ['The board delivers a brass-and-wire machine to replace Edda, and she greets it with great politeness.',
      'Over one long evening she teaches it, patiently and incorrectly, how a lighthouse works.',
      'At dawn the machine flashes a perfect SOS to the entire coast, and Edda is rehired as its supervisor.'] }
];
const ALT = ['Wind worries the glass while she works.', 'The lamp, patient as ever, takes her mending in silence.', 'She works by feel; the lamp has no secrets left.'];
const BEAT_ALT = ['Edda is told, kindly, that she is no longer needed', 'A boat brings news she has half-expected for years', 'The board’s letter arrives in the middle of her daily polish'];

let S;
function mk(runsArr) { return runsArr; }
function newState() {
  return { variant: new URLSearchParams(location.search).get('variant') || 'A', phase: 'treatment', count: 3, chosenOpt: null, optIdx: 0,
    doc: { treatment: { blocks: [] }, beats: { blocks: [] }, narrative: { scenes: [] } },
    hist: { treatment: [], beats: [], narrative: [] }, prev: null, drawer: false, showProv: false,
    accepted: false, locked: false, follow: null, sheet: false, held: null, altOpen: {}, regenOpen: false, stepIdx: null, toast: '', scenario: 1, n: 0 };
}
function push(doc, cause, label, actor) {
  S.n++;
  S.hist[doc].unshift({ n: S.n, cause, label, actor: actor || 'creator', snap: clone(S.doc[doc]), at: S.n });
}
function baseOf(doc, beat) { return { b: txt(beat.runs), p: beat.links.map(id => txt(doc.treatment.blocks.find(x => x.id === id)?.runs || [])).join('|') }; }
function syncBases() { S.doc.beats.blocks.forEach(b => { b.base = baseOf(S.doc, b); }); }
function drift() {
  const out = [];
  const T = S.doc.treatment.blocks, B = S.doc.beats.blocks;
  if (!T.length || !B.length) return out;
  B.forEach(b => {
    if (!b.links.length) { out.push({ key: 'b' + b.id, beat: b.id, kind: 'nopassage', text: 'This beat has no passage in the Treatment.' }); return; }
    const cur = baseOf(S.doc, b), tC = cur.p !== b.base.p, bC = cur.b !== b.base.b;
    if (tC && bC) out.push({ key: 'b' + b.id, beat: b.id, kind: 'both', text: 'Both sides changed since they last agreed.' });
    else if (tC) out.push({ key: 'b' + b.id, beat: b.id, kind: 'treatment', text: 'The Treatment passage changed since this beat was made.' });
    else if (bC) out.push({ key: 'b' + b.id, beat: b.id, kind: 'beat', text: 'This beat changed since it matched the Treatment.' });
  });
  T.forEach(p => { if (!B.some(b => b.links.includes(p.id))) out.push({ key: 'p' + p.id, passage: p.id, kind: 'nobeat', text: 'This passage has no beat.' }); });
  return out;
}
const driftFor = (kind, id) => drift().find(d => d[kind] === id);
function pending() { return S.doc.narrative.scenes.flatMap(s => s.blocks).filter(b => b.review === 'pending' && !b.retired); }

// ---------- run surgery ----------
function norm(runs) { const o = []; runs.forEach(r => { if (!r.t) return; const l = o[o.length - 1]; if (l && l.p === r.p) l.t += r.t; else o.push({ ...r }); }); return o; }
function splice(runs, s, e, ins) {
  let pos = 0, L = [], Rr = [];
  runs.forEach(r => { const a = pos, b = pos + r.t.length; pos = b;
    if (a < s) L.push(R(r.t.slice(0, Math.min(r.t.length, s - a)), r.p));
    if (b > e) Rr.push(R(r.t.slice(Math.max(0, e - a)), r.p)); });
  return norm([...L, ...ins, ...Rr]);
}
function applyEdit(runs, nt) {
  const old = txt(runs); let p = 0; while (p < old.length && p < nt.length && old[p] === nt[p]) p++;
  let q = 0; while (q < old.length - p && q < nt.length - p && old[old.length - 1 - q] === nt[nt.length - 1 - q]) q++;
  const mid = nt.slice(p, nt.length - q);
  return splice(runs, p, old.length - q, mid ? [R(mid, 'c')] : []);
}
function findBlock(doc, id) {
  if (doc === 'narrative') return S.doc.narrative.scenes.flatMap(s => s.blocks).find(b => b.id === id);
  return S.doc[doc].blocks.find(b => b.id === id);
}
const hasProtected = runs => runs.some(r => r.p === 'c' || r.p === 'i' || r.p === 'e');

// ---------- scenarios ----------
function genOptions() { return POOL.slice(0, S.count); }
function chooseOption(id) {
  const o = POOL.find(x => x.id === id);
  S.doc.treatment.blocks = o.paras.map((t, i) => ({ id: 'P' + (i + 1), runs: [R(t, 'a')] }));
  S.chosenOpt = id; push('treatment', 'ai_generation', 'Chosen from “' + o.name + '”', 'ai');
}
function scenario(n) {
  const v = S.variant, c = S.count; S = newState(); S.variant = v; S.count = c; S.scenario = n;
  if (n === 1) { S.phase = 'treatment'; return; }
  chooseOption('o1');
  const T = S.doc.treatment.blocks;
  S.doc.beats.blocks = [
    { id: 'B1', links: ['P1'], runs: [R('Edda learns the light will be automated', 'a')] },
    { id: 'B2', links: ['P2'], runs: [R('Last storm: she repairs the lamp', 'a')] },
    { id: 'B3', links: ['P3'], runs: [R('Dawn: she puts out the lamp', 'a')] }];
  syncBases(); push('beats', 'ai_generation', 'Derived from the Treatment', 'ai');
  T[1].runs = norm([...T[1].runs, R(' A boy from the village rows out to help, and neither of them says why.', 'c')]);
  push('treatment', 'creator_edit', 'You added a sentence to paragraph 2');
  S.doc.beats.blocks[2].runs = norm([...S.doc.beats.blocks[2].runs, R(' herself', 'c')]);
  S.doc.beats.blocks.push({ id: 'B4', links: [], runs: [R('Flashback: her husband’s last watch', 'c')], base: { b: '', p: '' } });
  S.doc.beats.blocks[3].base = { b: 'Flashback: her husband’s last watch', p: '' };
  push('beats', 'creator_edit', 'You edited a beat and added one');
  S.phase = 'beats';
  if (n >= 3) {
    S.doc.narrative.scenes = [
      { id: 'S1', heading: 'INT. SKERRY LIGHTHOUSE – DUSK', dur: '3 min', blocks: [
        { id: 'n1', kind: 'action', runs: [R('Edda polishes the great lens with a rag older than the harbour clerk standing behind her.', 'i')] },
        { id: 'n2', kind: 'add', review: 'pending', runs: [R('Salt crusts the lower windows. Her cardigan hangs on a nail beside a barometer stuck at STORM.', 'a')] },
        { id: 'n3', kind: 'dialogue', speaker: 'EDDA', delivery: 'dry', runs: [R('They can automate the light. They cannot automate me.', 'i')] }] },
      { id: 'S2', heading: 'EXT. LAMP GALLERY – NIGHT', dur: '4 min', blocks: [
        { id: 'n4', kind: 'action', runs: [R('Rain. Edda clips a cracked prism back into its brass collar, one hand on the rail.', 'i')] },
        { id: 'n5', kind: 'add', review: 'pending', runs: [R('Her breath fogs in the lamp’s heat; the beam sweeps past her face and she squints without flinching.', 'a')] },
        { id: 'n6', kind: 'dialogue', speaker: 'BOY', delivery: 'out of breath', runs: [R('Mum says you’re not to be alone tonight.', 'i')] },
        { id: 'n7', kind: 'add', review: 'pending', runs: [R('He is perhaps ten, soaked to the knees, and carries a thermos held in both hands like an offering.', 'a')] }] },
      { id: 'S3', heading: 'INT. LAMP ROOM – DAWN', dur: '2 min', blocks: [
        { id: 'n8', kind: 'action', runs: [R('Grey light. Edda lays her palm on the housing and the lamp winds down under it.', 'i')] },
        { id: 'n9', kind: 'add', review: 'pending', runs: [R('The boy watches from the stair, not asking, his thermos steaming in the cold.', 'a')] }] }];
    push('narrative', 'import', 'Converted from your screenplay; 4 AI additions');
    S.phase = 'narrative';
  }
  if (n === 4) { S.follow = 'synced'; S.doc.narrative.scenes.flatMap(s => s.blocks).forEach(b => { if (b.review) b.review = 'kept'; });
    S.accepted = true; S.locked = true; push('narrative', 'accept', 'Accepted', 'creator'); }
}

// ---------- actions ----------
function flush() {
  document.querySelectorAll('[data-edit]').forEach(el => {
    const [d, id] = el.dataset.edit.split('|'); const b = findBlock(d, id); if (!b) return;
    const nt = el.textContent; if (nt === txt(b.runs)) return;
    b.runs = applyEdit(b.runs, nt); S.dirty = S.dirty || {}; S.dirty[d] = (S.dirty[d] || 0) + 1;
    push(d, 'creator_edit', 'You edited ' + (d === 'beats' ? 'a beat' : d === 'narrative' ? 'the narrative' : 'a paragraph'));
  });
}
const toast = m => { S.toast = m; clearTimeout(window._t); window._t = setTimeout(() => { S.toast = ''; render(); }, 2600); };
function canned(old) { return ALT[(old.length + S.n) % ALT.length]; }
function act(a, d) {
  flush();
  const D = d.doc;
  if (a === 'phase') { S.phase = d.v; S.prev = null; S.sheet = false; S.stepIdx = null; }
  else if (a === 'count') { S.count = +d.v; S.optIdx = 0; toast('Generated ' + S.count + (S.count === 1 ? ' option' : ' options')); }
  else if (a === 'more') { if (S.count < 4) S.count++; S.optIdx = S.count - 1; toast('One more option added'); }
  else if (a === 'opt') S.optIdx = +d.v;
  else if (a === 'choose') { chooseOption(d.v); S.phase = 'treatment'; toast('Chosen. The other options stay recoverable.'); }
  else if (a === 'prov') S.showProv = !S.showProv;
  else if (a === 'drawer') { S.drawer = !S.drawer; S.prev = null; }
  else if (a === 'preview') S.prev = { doc: D, n: +d.v };
  else if (a === 'unprev') S.prev = null;
  else if (a === 'tt') { S.prev = S.prev ? null : { doc: D, n: S.hist[D][0].n }; }
  else if (a === 'ttstep') { const L = S.hist[D], i = L.findIndex(h => h.n === S.prev.n), j = Math.max(0, Math.min(L.length - 1, i + +d.v)); S.prev = { doc: D, n: L[j].n }; }
  else if (a === 'restore') {
    const h = S.hist[D].find(x => x.n === +d.v); push(D, 'creator_edit', 'Pre-restore capture'); S.hist[D].shift();
    S.doc[D] = clone(h.snap); push(D, 'restore', 'Restored version ' + h.n); S.prev = null; toast('Restored. History keeps everything.');
  }
  else if (a === 'bringback') {
    const h = S.hist[D].find(x => x.n === +d.v), old = findInSnap(h.snap, D, d.id), cur = findBlock(D, d.id);
    if (old && cur) { cur.runs = clone(old.runs); push(D, 'restore', 'Passage restored from version ' + h.n); toast('Passage brought back'); }
  }
  else if (a === 'regenopen') S.regenOpen = !S.regenOpen;
  else if (a === 'regen') {
    const note = (document.querySelector('#regennote') || {}).value || '', keep = (document.querySelector('#regenmode') || {}).value !== 'all';
    push('treatment', 'creator_edit', 'Pre-regeneration capture'); S.hist.treatment.shift();
    S.doc.treatment.blocks.forEach((b, i) => { if (keep && hasProtected(b.runs)) return; b.runs = [R(POOL[(S.optIdx + 1) % 4].paras[i] || b.runs[0].t, 'a')]; });
    push('treatment', 'ai_generation', 'Regenerated' + (note ? ' with note: “' + note + '”' : ' (no note)') + (keep ? ', kept your edits' : ', replaced everything'), 'ai');
    S.regenOpen = false; toast('Regenerated. Your edits ' + (keep ? 'kept.' : 'replaced; history has them.'));
  }
  else if (a === 'rewrite') {
    const s = S.sel; if (!s) return; const b = findBlock(s.doc, s.id); if (!b) return;
    const nt = canned(s.text); b.runs = splice(b.runs, s.start, s.end, [R(nt, 'e')]);
    push(s.doc, 'ai_targeted_rewrite', 'Rewrote a selection' + (d.note ? ': “' + d.note + '”' : ''), 'ai'); S.sel = null; hidePop(); toast('Rewritten in place. Previous text is in history.');
  }
  else if (a === 'derive') {
    S.doc.beats.blocks = S.doc.treatment.blocks.map((p, i) => ({ id: 'B' + (i + 1), links: [p.id], runs: [R(txt(p.runs).split(/(?<=\.)\s/)[0].replace(/\.$/, ''), 'a')] }));
    syncBases(); push('beats', 'ai_generation', 'Derived from the Treatment', 'ai');
  }
  else if (a === 'up' || a === 'down') {
    const bl = S.doc.beats.blocks, i = bl.findIndex(b => b.id === d.id), j = a === 'up' ? i - 1 : i + 1;
    if (j >= 0 && j < bl.length) { [bl[i], bl[j]] = [bl[j], bl[i]]; push('beats', 'creator_edit', 'You reordered beats'); }
  }
  else if (a === 'alts') S.altOpen[d.id] = !S.altOpen[d.id];
  else if (a === 'usealt') { const b = findBlock('beats', d.id); b.runs = [R(BEAT_ALT[+d.v], 'e')]; S.altOpen[d.id] = false; push('beats', 'ai_targeted_rewrite', 'Beat replaced by an alternative', 'ai'); }
  else if (a === 'addbeat') { S.doc.beats.blocks.push({ id: 'B' + (S.doc.beats.blocks.length + 5), links: [], runs: [R('New beat', 'c')], base: { b: 'New beat', p: '' } }); push('beats', 'creator_edit', 'You added a beat'); }
  else if (a === 'sync') syncAction(d.id, d.v);
  else if (a === 'heldUse') { const h = S.held; const b = findBlock('treatment', h.passage); b.runs = splice(b.runs, 0, txt(b.runs).length, [R(h.text, 'e')]); push('treatment', 'sync', 'Applied held sync result', 'ai'); S.doc.beats.blocks.find(x => x.id === h.beat).base = baseOf(S.doc, S.doc.beats.blocks.find(x => x.id === h.beat)); S.held = null; }
  else if (a === 'heldKeep') { const h = S.held; const bb = S.doc.beats.blocks.find(x => x.id === h.beat); bb.base = baseOf(S.doc, bb); S.held = null; push('beats', 'sync', 'Kept both as they are'); }
  else if (a === 'reviewadd') { const b = findBlock('narrative', d.id); if (d.v === 'keep') b.review = 'kept'; else if (d.v === 'remove') { b.retired = true; b.review = 'removed'; } push('narrative', 'creator_edit', d.v === 'keep' ? 'You kept an AI addition' : 'You removed an AI addition'); }
  else if (a === 'keepall') { pending().forEach(b => b.review = 'kept'); push('narrative', 'creator_edit', 'You kept all AI additions'); }
  else if (a === 'sheet') S.sheet = !S.sheet;
  else if (a === 'follow') { S.follow = d.v === 'null' ? null : d.v; }
  else if (a === 'lock') S.locked = !S.locked;
  else if (a === 'accept') { S.accepted = true; S.sheet = false; S.stepIdx = null; push('narrative', 'accept', S.locked ? 'Accepted and locked' : 'Accepted', 'creator'); toast('Master Narrative accepted. Treatment and Beat Sheet are now development history.'); }
  else if (a === 'unlock') { S.locked = false; toast('Unlocked'); }
  else if (a === 'step') S.stepIdx = d.v === 'end' ? null : +d.v;
  else if (a === 'reverse') { push(D, 'creator_edit', 'Pre-operation capture'); S.hist[D].shift();
    if (D === 'beats') S.doc.beats.blocks.forEach(b => { b.runs = [R('(from Master Narrative) ' + txt(b.runs).replace(/^\(from Master Narrative\) /, ''), 'a')]; });
    else S.doc.treatment.blocks.forEach(b => { b.runs = [R(txt(b.runs), hasProtected(b.runs) ? 'a' : 'a')]; });
    push(D, 'ai_generation', 'Regenerated from the Master Narrative', 'ai'); toast('Regenerated from the Master Narrative (explicit, recoverable)'); }
  else if (a === 'scn') { scenario(+d.v); }
  render();
}
function findInSnap(snap, D, id) { return D === 'narrative' ? snap.scenes.flatMap(s => s.blocks).find(b => b.id === id) : snap.blocks.find(b => b.id === id); }
function syncAction(id, v) {
  const bb = S.doc.beats.blocks.find(b => b.id === id); const pass = bb && bb.links[0] ? findBlock('treatment', bb.links[0]) : null;
  if (v === 'keep') { bb.base = baseOf(S.doc, bb); push('beats', 'sync', 'Kept both as they are'); toast('Kept both. Nothing changed.'); }
  else if (v === 'beatFromPassage') { bb.runs = [R(txt(pass.runs).split(/(?<=\.)\s/)[0].replace(/\.$/, '').slice(0, 70) + '…', 'a')]; bb.base = baseOf(S.doc, bb); push('beats', 'sync', 'Beat updated from passage', 'ai'); toast('Beat updated. Undo any time from history.'); }
  else if (v === 'passageFromBeat') {
    if (hasProtected(pass.runs)) { S.held = { beat: id, passage: pass.id, text: 'She spends her last storm repairing the lamp she was told to leave alone, and a boy rows out to help without being asked.' }; toast('Held: this would change your words'); }
    else { pass.runs = [R(txt(bb.runs) + '. The passage now follows the beat.', 'a')]; bb.base = baseOf(S.doc, bb); push('treatment', 'sync', 'Passage updated from beat', 'ai'); toast('Passage updated.'); }
  }
  else if (v === 'addPassage') { const nid = 'P' + (S.doc.treatment.blocks.length + 5); S.doc.treatment.blocks.push({ id: nid, runs: [R('Flash back: Edda remembers her husband’s last watch on the Skerry.', 'a')] }); bb.links = [nid]; bb.base = baseOf(S.doc, bb); push('treatment', 'sync', 'Passage added for a beat', 'ai'); }
  else if (v === 'addBeat') { const nid = 'B' + (S.doc.beats.blocks.length + 5); S.doc.beats.blocks.push({ id: nid, links: [id], runs: [R('New beat for this passage', 'a')], base: {} }); const nb = S.doc.beats.blocks.at(-1); nb.base = baseOf(S.doc, nb); push('beats', 'sync', 'Beat added for a passage', 'ai'); }
}

// ---------- shared rendering ----------
const viewDoc = name => S.prev && S.prev.doc === name ? S.hist[name].find(h => h.n === S.prev.n).snap : S.doc[name];
const editing = name => !(S.prev && S.prev.doc === name);
function runsHTML(runs) { return runs.map(r => `<span class="r r-${r.p}" ${S.showProv ? `title="${PL[r.p]}"` : ''}>${esc(r.t)}</span>`).join(''); }
function blk(doc, b, cls, tag) { const ed = editing(doc); return `<${tag || 'p'} class="blk ${cls || ''}" ${ed ? `contenteditable="true" spellcheck="false" data-edit="${doc}|${b.id}"` : ''}>${runsHTML(b.runs)}</${tag || 'p'}>`; }
const dot = (reason, kind) => `<span class="whisper" tabindex="0" aria-label="Possibly differs: ${esc(reason)}"><i></i><u>${esc(reason)}</u></span>`;
const btn = (a, label, data, cls) => `<button class="b ${cls || ''}" data-act="${a}" ${Object.entries(data || {}).map(([k, v]) => `data-${k}="${esc(v)}"`).join(' ')}>${label}</button>`;
function legend() { return S.showProv ? `<div class="legend"><span class="r r-i">imported</span><span class="r r-a">AI-generated</span><span class="r r-e">AI-edited</span><span>unmarked = yours</span></div>` : ''; }
const CAUSE = { creator_edit: 'edit', ai_generation: 'AI draft', ai_targeted_rewrite: 'AI rewrite', sync: 'sync', import: 'import', restore: 'restore', accept: 'accepted' };
function histList(doc, cb) {
  return `<ol class="hist">${S.hist[doc].map(h => `<li class="${S.prev && S.prev.doc === doc && S.prev.n === h.n ? 'on' : ''}"><div><b class="cause c-${h.cause}">${CAUSE[h.cause]}</b> <span class="mut">v${h.n}</span></div><div class="lab">${esc(h.label)}</div>${cb(h)}</li>`).join('') || '<li class="mut">No versions yet.</li>'}</ol>`;
}
function outline() {
  const st = (k) => S.accepted && (k === 'treatment' || k === 'beats') ? '<em>history</em>' : '';
  const row = (k, l, ph) => `<a class="ol ${S.phase === k ? 'on' : ''} ${ph || ''}" data-act="phase" data-v="${k}">${l}${st(k)}${(k === 'treatment' || k === 'beats') && !S.accepted && drift().length ? '<span class="whisper"><i></i></span>' : ''}${k === 'narrative' && S.accepted ? '<em>accepted</em>' : ''}</a>`;
  return `<nav class="outline"><div class="proj">The Lamp Keeper<small>short film · 12 min</small></div>
  <h6>Story</h6><a class="ol done">Input</a><a class="ol skip">Interview <em>skipped by you</em></a>${row('treatment', 'Treatment')}${row('beats', 'Beat Sheet')}${row('narrative', 'Master Narrative')}
  <h6>World</h6><a class="ol dim">World Definition</a><h6>Scenes</h6><a class="ol dim">1 · Dusk</a><a class="ol dim">2 · Gallery</a><a class="ol dim">3 · Dawn</a><h6>Output</h6><a class="ol dim">Review &amp; Export</a></nav>`;
}
function topstrip() { return `<div class="strip"><span>⌘K Jump</span><span class="sp"></span><span class="mut">Runtime 12 min of 12 target</span><span class="mut">Spend $0.18</span></div>`; }

// ---------- selection popover ----------
function hidePop() { const p = document.getElementById('pop'); p.style.display = 'none'; }
document.addEventListener('mouseup', e => {
  setTimeout(() => {
    const sel = getSelection(); const pop = document.getElementById('pop');
    if (!sel || sel.isCollapsed || !sel.rangeCount) { if (!pop.contains(e.target)) hidePop(); return; }
    const r = sel.getRangeAt(0); const el = (r.commonAncestorContainer.nodeType === 3 ? r.commonAncestorContainer.parentElement : r.commonAncestorContainer).closest('[data-edit]');
    if (!el) return; const [d, id] = el.dataset.edit.split('|');
    const pre = document.createRange(); pre.selectNodeContents(el); pre.setEnd(r.startContainer, r.startOffset);
    const start = pre.toString().length, text = r.toString();
    S.sel = { doc: d, id, start, end: start + text.length, text };
    const rc = r.getBoundingClientRect(); pop.style.display = 'flex'; pop.style.left = Math.max(8, rc.left + scrollX) + 'px'; pop.style.top = (rc.bottom + scrollY + 8) + 'px';
    pop.querySelector('input').value = '';
  }, 0);
});
document.addEventListener('mousedown', e => { if (e.target.closest('#pop') && e.target.tagName !== 'INPUT') e.preventDefault(); });
document.addEventListener('click', e => {
  const t = e.target.closest('[data-act]'); if (!t) return;
  if (t.dataset.act === 'rewrite') { const note = document.querySelector('#pop input').value; t.dataset.note = note; }
  act(t.dataset.act, t.dataset);
});
document.addEventListener('focusout', e => { if (e.target.matches && e.target.matches('[data-edit]')) flush(); });
document.addEventListener('keydown', e => {
  if (e.target.matches('input,textarea,[contenteditable]')) return;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { const v = ['A', 'B', 'C'], i = v.indexOf(S.variant); setVariant(v[(i + (e.key === 'ArrowRight' ? 1 : 2)) % 3]); }
});
function setVariant(v) { S.variant = v; const u = new URL(location); u.searchParams.set('variant', v); history.replaceState(null, '', u); render(); }

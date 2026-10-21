// THROWAWAY: three structurally different writing-experience directions. All data in memory.
const SYNC_ACTS = {
  treatment: [['beatFromPassage', 'Update beat from passage'], ['passageFromBeat', 'Update passage from beat'], ['keep', 'Keep both as they are']],
  beat: [['beatFromPassage', 'Update beat from passage'], ['passageFromBeat', 'Update passage from beat'], ['keep', 'Keep both as they are']],
  both: [['beatFromPassage', 'Update beat from passage'], ['passageFromBeat', 'Update passage from beat'], ['keep', 'Keep both as they are']],
  nopassage: [['addPassage', 'Add the missing passage']], nobeat: [['addBeat', 'Add the missing beat']]
};
const bid = d => d.beat || d.id;
function syncBtns(d) { return SYNC_ACTS[d.kind].map(([v, l]) => btn('sync', l, { id: d.beat || d.passage, v }, 'sm')).join(''); }
function heldHTML() {
  if (!S.held) return '';
  return `<div class="held"><b>Held, not applied.</b> Making the passage match this beat would change your own sentence. Aiuteur never rewrites your words on its own.<blockquote>${esc(S.held.text)}</blockquote>${btn('heldUse', 'Use it', {}, 'sm')}${btn('heldKeep', 'Keep both as they are', {}, 'sm')}</div>`;
}
function disagreeHTML(compact) {
  const n = drift().length; if (!n || S.accepted) return '';
  if (S.follow) return `<div class="note">Treatment and Beat Sheet differ in ${n} place${n > 1 ? 's' : ''}. You asked the Master Narrative to follow <b>${S.follow === 'synced' ? 'both (synced)' : S.follow === 'treatment' ? 'the Treatment' : 'the Beat Sheet'}</b>. ${btn('follow', 'Change', { v: null }, 'link')}</div>`;
  return `<div class="ask"><b>Treatment and Beat Sheet disagree in ${n} place${n > 1 ? 's' : ''}.</b> Which should the Master Narrative follow? Aiuteur won’t guess.<div>${btn('follow', 'Follow the Treatment', { v: 'treatment' }, 'sm')}${btn('follow', 'Follow the Beat Sheet', { v: 'beats' }, 'sm')}${btn('phase', 'Sync first', { v: 'beats' }, 'sm')}</div></div>`;
}
const devNote = D => S.accepted ? `<div class="note dev">Development history. The Master Narrative is accepted, so this ${D === 'beats' ? 'Beat Sheet' : 'Treatment'} is no longer kept in sync and nothing here is flagged. You can still edit it, or ${btn('reverse', 'regenerate it from the Master Narrative', { doc: D }, 'link')}.</div>` : '';
const mainBar = (title, sub, extra) => `<header class="dh"><div><h1>${title}</h1><div class="sub">${sub}</div></div><div class="tools">${extra || ''}<label class="tg"><input type="checkbox" ${S.showProv ? 'checked' : ''} data-act="prov">Highlight AI vs mine</label></div></header>${legend()}`;
const prevBanner = D => S.prev && S.prev.doc === D ? `<div class="prev">Previewing version ${S.prev.n} · ${esc(S.hist[D].find(h => h.n === S.prev.n).label)} ${btn('restore', 'Restore this version', { doc: D, v: S.prev.n }, 'sm pri')}${btn('unprev', 'Back to current', {}, 'sm')}</div>` : '';
const accSealed = () => `<div class="sealed">Accepted${S.locked ? ' · locked' : ''} ${S.locked ? btn('unlock', 'Unlock', {}, 'link') : ''}</div>`;
const optFacets = o => Object.entries(o.facets).map(([k, v]) => `<span class="facet"><i>${k}</i> ${esc(v)}</span>`).join('');
const countCtl = () => `<div class="count">How many options? ${[1, 2, 3, 4].map(n => `<button class="chip ${S.count === n ? 'on' : ''}" data-act="count" data-v="${n}">${n === 1 ? '1 · just one' : n}</button>`).join('')}<span class="mut">${S.count === 3 ? 'default' : ''}</span></div>`;

// =============== A: PAGE ===============
function A() {
  let h = '', body = '';
  const P = S.phase;
  if (P === 'treatment') {
    if (!S.chosenOpt) {
      const O = genOptions(), o = O[Math.min(S.optIdx, O.length - 1)];
      body = `${mainBar('Treatment', 'Pick the story you want to build on. Nothing here is final.')}${countCtl()}
      ${O.length > 1 ? `<div class="tabs">${O.map((x, i) => `<button class="tab ${x === o ? 'on' : ''}" data-act="opt" data-v="${i}">${i + 1}. ${esc(x.name)}</button>`).join('')}${S.count < 4 ? btn('more', '+ one more', {}, 'sm') : ''}</div>` : ''}
      <article class="doc"><div class="tagline">${esc(o.tag)}</div><div class="facets">${optFacets(o)}</div>${o.paras.map(p => `<p class="blk ro">${esc(p)}</p>`).join('')}
      <div class="row">${btn('choose', O.length === 1 ? 'Use this treatment' : 'Choose this one', { v: o.id }, 'pri')}</div></article>`;
    } else {
      const n = drift().length, dv = viewDoc('treatment');
      body = `${mainBar('Treatment', 'Chosen from “' + esc(POOL.find(p => p.id === S.chosenOpt).name) + '” · highlight any passage to rewrite it', btn('regenopen', 'Regenerate…', {}, 'sm') + btn('drawer', 'Versions', {}, 'sm'))}
      ${devNote('treatment')}
      ${S.regenOpen ? `<div class="reg">What should change? <input id="regennote" placeholder="optional, e.g. make the ending less sad"><select id="regenmode"><option value="keep">keep my edits</option><option value="all">replace everything</option></select>${btn('regen', 'Regenerate', {}, 'sm pri')}</div>` : ''}
      ${!S.accepted && n ? `<div class="syncline"><span class="whisper"><i></i></span> Beat Sheet differs from this in ${n} place${n > 1 ? 's' : ''}. ${btn('sheet', S.sheet ? 'Hide' : 'Review sync', {}, 'link')}</div>` : ''}
      ${S.sheet && !S.accepted ? syncSheetA() : ''}${prevBanner('treatment')}
      <article class="doc">${dv.blocks.map(b => `<div class="pw">${blk('treatment', b)}${!S.accepted && driftFor('passage', b.id) || (!S.accepted && S.doc.beats.blocks.some(x => x.links.includes(b.id) && drift().find(d => d.beat === x.id && d.kind !== 'beat'))) ? dot('Beat Sheet differs here') : ''}</div>`).join('')}</article>`;
    }
  } else if (P === 'beats') {
    const n = drift().length, dv = viewDoc('beats');
    body = `${mainBar('Beat Sheet', 'Edit, reorder, or ask for alternatives for any beat', btn('drawer', 'Versions', {}, 'sm'))}${devNote('beats')}
    ${!dv.blocks.length ? `<div class="empty">No beats yet. ${btn('derive', 'Derive beats from the Treatment', {}, 'sm pri')} <span class="mut">or add your own.</span></div>` : ''}
    ${!S.accepted && n ? `<div class="syncline"><span class="whisper"><i></i></span> ${n} place${n > 1 ? 's' : ''} where this and the Treatment differ. ${btn('sheet', S.sheet ? 'Hide' : 'Review sync', {}, 'link')}</div>` : ''}
    ${S.sheet && !S.accepted ? syncSheetA() : ''}${prevBanner('beats')}
    <ol class="beats">${dv.blocks.map((b, i) => `<li><span class="num">${i + 1}</span><div class="bt">${blk('beats', b, 'bl', 'div')}
      <div class="bm">${editing('beats') ? btn('up', '↑', { id: b.id }, 'ico') + btn('down', '↓', { id: b.id }, 'ico') + btn('alts', 'Alternatives', { id: b.id }, 'link') : ''}${!S.accepted && driftFor('beat', b.id) ? dot(driftFor('beat', b.id).text) : ''}</div>
      ${S.altOpen[b.id] ? `<div class="alts">${BEAT_ALT.map((t, k) => `<div>${esc(t)} ${btn('usealt', 'Use', { id: b.id, v: k }, 'sm')}</div>`).join('')}<div class="mut">Alternatives are suggestions; they aren’t saved until you use one.</div></div>` : ''}</div></li>`).join('')}</ol>
    <div class="row">${btn('addbeat', '+ Add a beat', {}, 'sm')}</div>`;
  } else {
    const sc = viewDoc('narrative').scenes, pn = pending().length;
    body = `${mainBar('Master Narrative', 'The one canonical story. Everything downstream is built from it.', btn('drawer', 'Versions', {}, 'sm'))}
    ${pn && !S.accepted ? `<div class="syncline"><span class="addtag">AI</span> ${pn} addition${pn > 1 ? 's' : ''} Aiuteur made while converting your screenplay. Your own words are unchanged. ${btn('keepall', 'Keep all', {}, 'link')}</div>` : ''}${prevBanner('narrative')}
    <article class="doc nar">${sc.map(s => `<section><h3>${esc(s.heading)} <small>~${s.dur}</small></h3>${s.blocks.filter(b => !b.retired).map(b => narBlockA(b)).join('')}</section>`).join('')}</article>
    ${S.sheet && !S.accepted ? `<div class="sheet"><h4>Accept the Master Narrative</h4><p>Production is built from this. You can always come back and edit it.</p>${disagreeHTML()}
      <ul class="ck"><li>${drift().length ? (S.follow ? '✓ Disagreement settled' : '! Treatment and Beat Sheet disagree') : '✓ Treatment and Beat Sheet agree'}</li><li>${pn ? pn + ' AI additions not reviewed (optional)' : '✓ AI additions reviewed'}</li></ul>
      <label class="tg"><input type="checkbox" data-act="lock" ${S.locked ? 'checked' : ''}>Lock it so later edits show what depends on them</label>
      <div class="row">${btn('accept', 'Accept', {}, 'pri')}${btn('sheet', 'Not yet', {})}</div>${drift().length && !S.follow ? '<div class="mut">Choose which document to follow above to accept.</div>' : ''}</div>` : ''}
    <div class="acceptbar">${S.accepted ? accSealed() : `<span class="mut">${pn ? pn + ' AI additions unreviewed · optional' : 'Ready'}</span>${btn('sheet', 'Accept Master Narrative…', {}, 'pri')}`}</div>`;
  }
  const drawer = S.drawer ? `<aside class="drawer"><h4>Versions · ${S.phase === 'beats' ? 'Beat Sheet' : S.phase === 'narrative' ? 'Master Narrative' : 'Treatment'}</h4>${histList(S.phase, h => `<div>${btn('preview', 'Preview', { doc: S.phase, v: h.n }, 'sm')}</div>`)}<div class="mut">Opening or browsing never creates a version.</div></aside>` : '';
  return `<div class="a-wrap"><div class="a-main">${body}</div>${drawer}</div>`;
}
function syncSheetA() { const ds = drift(); return `<div class="sheet">${ds.map(d => `<div class="sy"><div>${d.beat ? 'Beat “' + esc(txt(findBlock('beats', d.beat).runs)) + '”' : 'Passage “' + esc(txt(findBlock('treatment', d.passage).runs).slice(0, 50)) + '…”'}<div class="mut">${esc(d.text)}</div></div><div>${syncBtns(d)}</div></div>`).join('')}${heldHTML()}<div class="mut">Nothing changes unless you press a button.</div></div>`; }
function narBlockA(b) {
  const doc = 'narrative';
  if (b.kind === 'dialogue') return `<div class="dlg"><span class="spk">${b.speaker}</span><i>(${b.delivery})</i>${blk(doc, b, 'dl')}</div>`;
  if (b.kind === 'add') return `<div class="add ${b.review}">${blk(doc, b, 'ad')}${b.review === 'pending' ? `<span class="addm"><span class="addtag">AI added</span>${btn('reviewadd', 'Keep', { id: b.id, v: 'keep' }, 'link')}${btn('reviewadd', 'Remove', { id: b.id, v: 'remove' }, 'link')}</span>` : ''}</div>`;
  return blk(doc, b);
}

// =============== B: SPREAD ===============
function B() {
  const P = S.phase;
  if (P === 'narrative') return Bnar();
  if (!S.chosenOpt) {
    const O = genOptions();
    const facets = ['Tone', 'Ending', 'Shape'];
    return `${mainBar('Treatment · compare', 'Read the options side by side, then choose one.')}${countCtl()}
    <div class="board" style="grid-template-columns:repeat(${O.length},minmax(220px,1fr))">${O.map(o => `<section class="col"><h3>${esc(o.name)}</h3><div class="tagline">${esc(o.tag)}</div><table class="fx">${facets.map(f => `<tr><th>${f}</th><td>${esc(o.facets[f])}</td></tr>`).join('')}</table>${o.paras.map(p => `<p class="blk ro sm">${esc(p)}</p>`).join('')}${btn('choose', O.length === 1 ? 'Use this treatment' : 'Choose', { v: o.id }, 'pri')}</section>`).join('')}</div>
    ${S.count < 4 ? `<div class="row">${btn('more', '+ one more option', {}, 'sm')}</div>` : ''}`;
  }
  const T = viewDoc('treatment'), Bt = viewDoc('beats'), ds = S.accepted ? [] : drift();
  const rows = [];
  const seen = new Set();
  Bt.blocks.forEach((b, i) => { const first = b.links.find(l => !seen.has(l)); b.links.forEach(l => seen.add(l)); rows.push({ beat: b, i, pass: first ? T.blocks.find(x => x.id === first) : null, cont: !first && b.links.length }); });
  T.blocks.filter(p => !seen.has(p.id)).forEach(p => rows.push({ beat: null, pass: p }));
  const st = r => { if (S.accepted) return 'x'; const d = r.beat ? driftFor('beat', r.beat.id) : driftFor('passage', r.pass.id); return d ? d.kind : 'ok'; };
  const sym = { ok: '●', treatment: '◐', beat: '◑', both: '◍', nopassage: '○', nobeat: '○', x: '·' };
  const tip = { ok: 'In agreement', treatment: 'Treatment changed', beat: 'Beat changed', both: 'Both changed', nopassage: 'No passage for this beat', nobeat: 'No beat for this passage', x: '' };
  return `${mainBar('Treatment + Beat Sheet', 'One spread. Threads in the middle show whether the two agree.', btn('regenopen', 'Regenerate treatment…', {}, 'sm'))}
  ${devNote('treatment')}${S.accepted ? devNote('beats') : ''}
  ${S.regenOpen ? `<div class="reg">What should change? <input id="regennote" placeholder="optional"><select id="regenmode"><option value="keep">keep my edits</option><option value="all">replace everything</option></select>${btn('regen', 'Regenerate', {}, 'sm pri')}</div>` : ''}
  <div class="spread-h"><div>Treatment ${scrub('treatment')}</div><div></div><div>Beat Sheet ${scrub('beats')}</div></div>
  ${prevBanner('treatment')}${prevBanner('beats')}${!Bt.blocks.length ? `<div class="empty">No beats yet. ${btn('derive', 'Derive beats from the Treatment', {}, 'sm pri')}</div>` : ''}
  <div class="spread">${rows.map((r, k) => { const s = st(r), d = r.beat ? driftFor('beat', r.beat.id) : driftFor('passage', r.pass.id), open = S.altOpen['t' + k];
    return `<div class="sr"><div class="sl">${r.pass ? blk('treatment', r.pass) : r.cont ? '<div class="mut">↑ same passage</div>' : '<div class="mut">no passage</div>'}</div>
    <div class="th"><button class="thread s-${s}" title="${tip[s]}" data-act="alts" data-id="t${k}">${sym[s]}</button></div>
    <div class="sr2">${r.beat ? `<div class="bwrap"><span class="num">${r.i + 1}</span>${blk('beats', r.beat, 'bl', 'div')}${editing('beats') ? `<span class="bmm">${btn('up', '↑', { id: r.beat.id }, 'ico')}${btn('down', '↓', { id: r.beat.id }, 'ico')}${btn('alts', '⋯', { id: r.beat.id }, 'ico')}</span>` : ''}</div>` : '<div class="mut">no beat</div>'}
    ${S.altOpen[r.beat?.id] ? `<div class="alts">${BEAT_ALT.map((t, q) => `<div>${esc(t)} ${btn('usealt', 'Use', { id: r.beat.id, v: q }, 'sm')}</div>`).join('')}</div>` : ''}</div>
    ${open && d ? `<div class="pop2"><b>${tip[s]}.</b> ${esc(d.text)}<div>${syncBtns(d)}</div></div>` : open ? `<div class="pop2">${S.accepted ? 'Not tracked after acceptance.' : 'In agreement.'}</div>` : ''}</div>`; }).join('')}</div>
  ${heldHTML()}<div class="row">${btn('addbeat', '+ Add a beat', {}, 'sm')}${ds.length > 1 ? `<span class="mut">${ds.length} threads differ. Press a thread to see its options.</span>` : ''}</div>`;
}
function scrub(D) {
  const L = [...S.hist[D]].reverse(); if (!L.length) return '';
  return `<span class="scrub">${L.map(h => `<button class="sd c-${h.cause} ${S.prev && S.prev.doc === D && S.prev.n === h.n ? 'on' : ''}" title="v${h.n} · ${CAUSE[h.cause]} · ${esc(h.label)}" data-act="preview" data-doc="${D}" data-v="${h.n}"></button>`).join('<s></s>')}</span>`;
}
function Bnar() {
  const sc = viewDoc('narrative').scenes, pn = pending().length, dn = drift().length;
  const ready = `<div class="ready">${S.accepted ? accSealed() : `<div><b>Before you accept</b></div><ul class="ck"><li>${dn ? (S.follow ? '✓ Disagreement settled (' + S.follow + ')' : '! Treatment and Beat Sheet disagree in ' + dn + ' places') : '✓ Treatment and Beat Sheet agree'}</li><li>${pn ? pn + ' AI additions to review (optional)' : '✓ AI additions reviewed'}</li><li><label class="tg"><input type="checkbox" data-act="lock" ${S.locked ? 'checked' : ''}>Lock on accept</label></li></ul>${!S.follow && dn ? disagreeHTML() : ''}<div class="row">${btn('accept', 'Accept Master Narrative', {}, 'pri')}${pn ? btn('keepall', 'Keep all additions', {}, 'sm') : ''}</div>`}</div>`;
  return `${mainBar('Master Narrative', 'Left: your screenplay, untouched. Right: what Aiuteur added.', '' + scrub('narrative'))}${prevBanner('narrative')}<div class="nlay"><div>${sc.map(s => `<section class="nsec"><h3>${esc(s.heading)} <small>~${s.dur}</small></h3>${groupRows(s.blocks.filter(b => !b.retired))}</section>`).join('')}</div><aside class="ready-col">${ready}</aside></div>`;
}
function groupRows(bs) {
  const rows = []; bs.forEach(b => { if (b.kind === 'add' && rows.length) rows[rows.length - 1].adds.push(b); else if (b.kind === 'add') rows.push({ p: null, adds: [b] }); else rows.push({ p: b, adds: [] }); });
  return rows.map(r => `<div class="grow"><div class="g1">${r.p ? (r.p.kind === 'dialogue' ? `<div class="dlg"><span class="spk">${r.p.speaker}</span><i>(${r.p.delivery})</i>${blk('narrative', r.p, 'dl')}</div>` : blk('narrative', r.p)) : ''}</div><div class="g2">${r.adds.map(a => `<div class="add ${a.review}">${blk('narrative', a, 'ad')}${a.review === 'pending' ? `<span class="addm"><span class="addtag">AI added</span>${btn('reviewadd', 'Keep', { id: a.id, v: 'keep' }, 'link')}${btn('reviewadd', 'Remove', { id: a.id, v: 'remove' }, 'link')}</span>` : ''}</div>`).join('')}</div></div>`).join('');
}

// =============== C: MARGIN ===============
function C() {
  const P = S.phase, tt = S.prev && S.prev.doc === P;
  const ttBar = tt ? `<div class="prev">Time travel · version ${S.prev.n} of ${S.hist[P].length} · ${esc(S.hist[P].find(h => h.n === S.prev.n).label)} ${btn('ttstep', '◂ older', { doc: P, v: 1 }, 'sm')}${btn('ttstep', 'newer ▸', { doc: P, v: -1 }, 'sm')}${btn('restore', 'Restore whole version', { doc: P, v: S.prev.n }, 'sm pri')}${btn('tt', 'Leave', { doc: P }, 'sm')}<div class="mut">Passages that differ from now have a card: bring back just that passage.</div></div>` : '';
  const histBtn = btn('tt', tt ? 'Leave time travel' : 'History', { doc: P }, 'sm');
  const cur = b => findBlock(P, b.id);
  const ttCard = b => { if (!tt) return ''; const c = cur(b); if (!c || txt(c.runs) === txt(b.runs)) return ''; return `<div class="mc tt"><div class="mut">Now reads</div>${esc(txt(c.runs))}<div>${btn('bringback', 'Bring this version back', { doc: P, v: S.prev.n, id: b.id }, 'sm')}</div></div>`; };
  const row = (main, margin) => `<div class="mrow"><div class="mmain">${main}</div><div class="mmar">${margin}</div></div>`;
  if (P === 'treatment') {
    if (!S.chosenOpt) {
      const O = genOptions(), o = O[Math.min(S.optIdx, O.length - 1)];
      const others = O.map((x, i) => [x, i]).filter(([x]) => x !== o);
      return `${mainBar('Treatment', 'This is version ' + (O.indexOf(o) + 1) + ' of ' + O.length + '. The others wait in the margin.')}${countCtl()}
      ${row(`<article class="doc"><h3>${esc(o.name)}</h3><div class="tagline">${esc(o.tag)}</div>${o.paras.map(p => `<p class="blk ro">${esc(p)}</p>`).join('')}<div class="row">${btn('choose', O.length === 1 ? 'Use this treatment' : 'Choose this one', { v: o.id }, 'pri')}</div></article>`,
        others.map(([x, i]) => `<div class="mc swap"><b>${esc(x.name)}</b><div class="mut">${esc(x.tag)}</div><div class="facets">${optFacets(x)}</div>${btn('opt', 'Read this instead', { v: i }, 'sm')}</div>`).join('') + (S.count < 4 ? `<div class="mc">${btn('more', '+ one more version', {}, 'sm')}</div>` : ''))}`;
    }
    const T = viewDoc('treatment');
    return `${mainBar('Treatment', 'Highlight any passage to rewrite it. Cards in the margin are for you to take or ignore.', btn('regenopen', 'Regenerate…', {}, 'sm') + histBtn)}${devNote('treatment')}${ttBar}
    ${S.regenOpen ? `<div class="reg">What should change? <input id="regennote" placeholder="optional"><select id="regenmode"><option value="keep">keep my edits</option><option value="all">replace everything</option></select>${btn('regen', 'Regenerate', {}, 'sm pri')}</div>` : ''}
    ${T.blocks.map(b => { const bs = S.accepted || tt ? [] : S.doc.beats.blocks.filter(x => x.links.includes(b.id)).map(x => driftFor('beat', x.id)).filter(Boolean);
      return row(blk('treatment', b), ttCard(b) + bs.map(d => `<div class="mc sync"><span class="whisper"><i></i></span> ${esc(d.text)}<div>${syncBtns(d)}</div></div>`).join('')); }).join('')}${heldHTML()}`;
  }
  if (P === 'beats') {
    const Bt = viewDoc('beats');
    return `${mainBar('Beat Sheet', 'Beats are short. Alternatives and sync show up beside the beat.', histBtn)}${devNote('beats')}${ttBar}${!Bt.blocks.length ? `<div class="empty">No beats yet. ${btn('derive', 'Derive beats from the Treatment', {}, 'sm pri')}</div>` : ''}
    ${Bt.blocks.map((b, i) => { const d = !S.accepted && !tt ? driftFor('beat', b.id) : null;
      return row(`<div class="bwrap"><span class="num">${i + 1}</span>${blk('beats', b, 'bl', 'div')}${editing('beats') ? `<span class="bmm">${btn('up', '↑', { id: b.id }, 'ico')}${btn('down', '↓', { id: b.id }, 'ico')}</span>` : ''}</div>`,
        ttCard(b) + (editing('beats') ? `<div class="mc plain">${btn('alts', S.altOpen[b.id] ? 'Hide alternatives' : 'Ask for alternatives', { id: b.id }, 'link')}${S.altOpen[b.id] ? BEAT_ALT.map((t, k) => `<div class="altc">${esc(t)} ${btn('usealt', 'Use', { id: b.id, v: k }, 'sm')}</div>`).join('') : ''}</div>` : '') +
        (d ? `<div class="mc sync"><span class="whisper"><i></i></span> ${esc(d.text)}<div>${syncBtns(d)}</div></div>` : '')); }).join('')}
    <div class="row">${btn('addbeat', '+ Add a beat', {}, 'sm')}</div>${heldHTML()}`;
  }
  // narrative
  const sc = viewDoc('narrative').scenes, pn = pending(), stepping = S.stepIdx !== null && !S.accepted;
  const steps = []; if (drift().length && !S.follow) steps.push({ t: 'dis' }); pn.forEach(b => steps.push({ t: 'add', b }));
  const cur0 = steps[0];
  const flow = stepping ? `<div class="flow"><b>Accepting</b> · ${steps.length ? steps.length + ' thing' + (steps.length > 1 ? 's' : '') + ' to look at' : 'nothing left to look at'} ${btn('step', 'Skip to the end', { v: 'seal' }, 'link')}
    ${!steps.length ? `<div class="seal"><p>Ready to commit. Production is built from this.</p><label class="tg"><input type="checkbox" data-act="lock" ${S.locked ? 'checked' : ''}>Lock it (recommended)</label><div class="row">${btn('accept', 'Accept Master Narrative', {}, 'pri')}${btn('step', 'Not yet', { v: 'end' })}</div></div>` : cur0.t === 'dis' ? disagreeHTML() : '<div class="mut">Next addition is highlighted in the margin.</div>'}</div>` : '';
  const sealStep = stepping && !steps.length;
  return `${mainBar('Master Narrative', 'Your words are untouched. Margin cards are what Aiuteur added.', (S.accepted ? accSealed() : btn('step', 'Accept…', { v: 0 }, 'sm pri')) + histBtn)}${ttBar}${flow}
  ${sc.map(s => `<h3 class="mh">${esc(s.heading)} <small>~${s.dur}</small></h3>${groupC(s.blocks.filter(b => !b.retired), stepping, cur0, row, ttCard)}`).join('')}`;
}

function groupC(bs, stepping, cur0, row, ttCard) {
  const rows = []; bs.forEach(b => { if (b.kind === 'add' && rows.length) rows[rows.length - 1].adds.push(b); else if (b.kind === 'add') rows.push({ p: null, adds: [b] }); else rows.push({ p: b, adds: [] }); });
  return rows.map(r => row(r.p ? (r.p.kind === 'dialogue' ? `<div class="dlg"><span class="spk">${r.p.speaker}</span><i>(${r.p.delivery})</i>${blk('narrative', r.p, 'dl')}</div>` : blk('narrative', r.p)) : '',
    (r.p ? ttCard(r.p) : '') + r.adds.map(b => `<div class="mc addc ${stepping && cur0 && cur0.b === b ? 'focus' : ''}"><span class="addtag">AI added</span> ${blk('narrative', b, 'ad')}${b.review === 'pending' ? `<div>${btn('reviewadd', 'Keep', { id: b.id, v: 'keep' }, 'sm')}${btn('reviewadd', 'Remove', { id: b.id, v: 'remove' }, 'sm')}</div>` : '<div class="mut">kept</div>'}</div>`).join(''))).join('');
}
// =============== shell ===============
const NAMES = { A: 'Page', B: 'Spread', C: 'Margin' }, SCN = ['Choosing a treatment', 'Treatment + beats drifted', 'Narrative: ready to accept', 'Accepted'];
function render() {
  const fn = { A, B, C }[S.variant];
  const wide = S.variant === 'B' && S.phase !== 'narrative' ? 'wide' : '';
  document.getElementById('app').innerHTML = `<div class="shell">${outline()}<main>${topstrip()}<div class="center v${S.variant} ${wide}">${fn()}</div></main></div>
  <div class="bar"><span class="barl">PROTOTYPE · throwaway</span>${['A', 'B', 'C'].map(v => `<button class="vb ${S.variant === v ? 'on' : ''}" onclick="setVariant('${v}')">${v} · ${NAMES[v]}</button>`).join('')}<span class="sep"></span><span class="barl">State</span>${SCN.map((n, i) => `<button class="vb s ${S.scenario === i + 1 ? 'on' : ''}" data-act="scn" data-v="${i + 1}">${i + 1} ${n}</button>`).join('')}</div>${S.toast ? `<div class="toast">${esc(S.toast)}</div>` : ''}`;
}
S = newState(); scenario(2); render();

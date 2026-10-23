// #59 World Definition: throwaway prototype. One canonical dataset, many views over it (D59.9).
const PRICE = 0.08, $$$ = n => '$' + n.toFixed(2);
const Q = new URLSearchParams(location.search);
const S = { home: Q.get('home') || 'type', ws: Q.get('ws') || 'tabs', cov: Q.get('cov') || 'inline', view: 'home', sel: null, tab: 'identity',
  hm: 'tiles', ticket: null, more: false, picks: null, lookAsk: false, ents: [], shots: false, style: null, setNote: false };
let nid = 100;
const V = (name, status = 'none', hue = 1, why = '') => ({ id: 'v' + nid++, name, status, hue, why });
const E = (o) => Object.assign({ id: 'e' + nid++, state: 'proposed', desc: '', scenes: '', first: 1, imgs: [], active: 0, approved: false, looks: [], views: [], newFlag: 0, merge: null, locked: false }, o);
const ET = { character: 'Characters', location: 'Locations', prop: 'Props', extra: 'Extra types' };
const SUGG = ['toward the window', 'toward the stove', 'from the doorway', 'table close', 'north wall', 'south wall', 'east wall', 'west wall', 'overhead', 'reverse of doorway', 'sink corner', 'pantry door'];

function seed(p) {
  const marcus = E({ id: 'marcus', type: 'character', name: 'Marcus Hale', scenes: 'Sc 1, 2, 4, 9', first: 1, desc: 'Late 50s, tired eyes, grey stubble, rumpled charcoal suit. Moves like a man who has been sitting in cars all night.' });
  const mrh = E({ id: 'mrhale', type: 'character', name: 'Mr. Hale', scenes: 'Sc 3', first: 3, desc: 'Referred to in the lawyer scene.', merge: 'marcus' });
  const elena = E({ id: 'elena', type: 'character', name: 'Elena Hale', scenes: 'Sc 1, 5, 9', first: 1, desc: 'Marcus\u2019s daughter, mid 20s, sharp, dark hair tied back, a nurse\u2019s watch.' });
  const kit = E({ id: 'kitchen', type: 'location', name: 'Hale Kitchen', scenes: 'Sc 1, 4, 9', first: 1, desc: 'A narrow farmhouse kitchen: yellowed cabinets, a deep porcelain sink under a window, a cast-iron stove, a long scarred table.' });
  const par = E({ id: 'parlor', type: 'location', name: 'Funeral Parlor', scenes: 'Sc 5, 6', first: 5, desc: 'Carpeted viewing room, pale lamps, rows of folding chairs.' });
  const key = E({ id: 'key', type: 'prop', name: 'Brass Key', scenes: 'Sc 2, 4, 9', first: 2, desc: 'Tarnished brass key on a frayed red cord.' });
  const let_ = E({ id: 'letter', type: 'prop', name: 'Lawyer\u2019s Letter', scenes: 'Sc 3', first: 3, desc: 'Cream envelope, wax seal broken.' });
  const mourn = E({ id: 'mourners', type: 'extra', name: 'Mourners', scenes: 'Sc 5, 6', first: 5, desc: 'Generic black-clad funeral attendees.' });
  S.ents = [marcus, mrh, elena, kit, par, key, let_, mourn];
  S.shots = false; S.view = 'home'; S.sel = null; S.ticket = null; S.more = false; S.picks = null;
  const keep = (e, imgs, st = 'kept') => { e.state = st; if (imgs) { e.imgs = imgs; e.approved = true; } };
  if (p === 'review') { S.view = 'review'; return; }
  keep(marcus, [1, 5]); keep(elena, [2]); keep(kit, [1]); keep(par, [3]); keep(key, [4, 8]); mrh.merge = 'marcus'; mrh.state = 'deferred';
  let_.state = 'deferred'; keep(mourn, null, 'light');
  if (p === 'identity') return;
  S.shots = true;
  kit.views = [V('toward the window', 'needed', 2, 'Sc 1 Sh 3'), V('from the doorway', 'needed', 6, 'Sc 1 Sh 5'), V('table close', 'needed', 1, 'Sc 4 Sh 2')];
  par.views = [V('toward the lectern', 'needed', 3, 'Sc 5 Sh 1')];
  kit.newFlag = 1; kit.views.push(V('toward the stove', 'needed', 4, 'Sc 9 Sh 6 (new)'));
  if (p === 'sheet') { kit.newFlag = 0; kit.views.forEach(v => v.status = 'draft'); S.view = 'entity'; S.sel = 'kitchen'; S.tab = 'coverage'; }
  
  if (p === 'variant') {
    kit.looks = [{ name: 'Fire-damaged', hue: 5, from: 'Sc 9 on' }];
    kit.views = [V('toward the window', 'accepted', 2), V('from the doorway', 'accepted', 6), V('toward the window · Fire-damaged', 'needed', 5, 'Sc 9 Sh 2')];
    S.ents.splice(4, 0, E({ id: 'kitnight', type: 'location', name: 'Hale Kitchen (night, abandoned)', state: 'kept', scenes: 'Sc 10', first: 9, imgs: [7], approved: true, desc: 'The same kitchen after years of neglect, as its own place.' }));
    S.view = 'entity'; S.sel = 'kitchen'; S.tab = 'looks'; S.lookAsk = true;
  }
  if (p === 'style') { S.view = 'style'; }
  if (p === 'wall') { S.view = 'wall'; }
}

const sel = () => S.ents.find(e => e.id === S.sel);
const vis = () => S.ents.filter(e => !(e.merge && e.state !== 'proposed' && e.state !== 'kept' && false));
const need = e => e.views.filter(v => v.status === 'needed');
const drafts = e => e.views.filter(v => v.status === 'draft');
function ready(e) {
  if (e.merge && e.state === 'merged') return 'merged into ' + S.ents.find(x => x.id === e.merge).name;
  if (e.state === 'proposed') return h('span', { class: 'faint' }, 'not reviewed');
  if (e.state === 'deferred') return h('span', { class: 'faint' }, 'deferred');
  if (e.state === 'light') return 'lightweight · text only';
  const id = e.type === 'extra' ? [] : e.approved ? [h('span', { class: 'ok' }, 'Identity \u2713')] : [h('span', { class: 'quiet' }, 'Identity: needs an image')];
  const n = need(e).length;
  if (e.type === 'location' && n) { id.push(' \u00b7 ', h('span', { class: 'quiet' }, n + ' production view' + (n > 1 ? 's' : '') + ' needed' + (e.newFlag ? ' · ' + e.newFlag + ' new' : '')), e.newFlag ? h('span', { class: 'whisper', title: '1 new view needed since the shot plan changed', style: 'margin-left:5px' }) : ''); }
  if (drafts(e).length) id.push(' \u00b7 ', h('span', { class: 'chip sel' }, drafts(e).length + ' drafts to review'));
  return id;
}
function pic(e, small) {
  const hue = e.imgs.length ? e.imgs[e.active % e.imgs.length] : 0;
  return h('div', { class: 'img h' + hue + (small ? '' : ' hero') }, e.imgs.length ? '' : h('div', { class: 'ph' }, e.state === 'light' || e.type === 'extra' ? 'text only' : 'no image yet'));
}
function tile(e) {
  const img = pic(e, true); img.classList.remove('hero');
  img.append(h('span', { class: 'lbl' }, e.type));
  if (e.imgs.length > 1) {
    img.append(h('div', { class: 'dots' }, e.imgs.map((_, i) => h('i', { class: i === e.active % e.imgs.length ? 'on' : '' }))),
      h('div', { class: 'car' }, h('button', { onclick: ev => { ev.stopPropagation(); e.active = (e.active + e.imgs.length - 1) % e.imgs.length; render(); } }, '\u2039'), h('button', { onclick: ev => { ev.stopPropagation(); e.active = (e.active + 1) % e.imgs.length; render(); } }, '\u203a')));
  }
  return h('div', { class: 'tile ' + e.state, onclick: () => { S.view = 'entity'; S.sel = e.id; S.tab = 'identity'; render(); } }, img, h('div', { class: 'nm' }, e.name), h('div', { class: 'st' }, ready(e)));
}

// ---------- spend ----------
function startGen(e, names, key) {
  const total = names.length * PRICE, k = spendKind({ total, count: names.length });
  if (k === 'ticket' && !(S.ticket && S.ticket.key === key && S.ticket.ok)) { S.ticket = { key, e: e.id, names, total, ok: false }; return render(); }
  S.ticket = null;
  names.forEach(n => { const v = e.views.find(v => v.name === n); if (v) { v.status = 'draft'; } else e.views.push(V(n, 'draft', 1 + (nid % 8), 'manual')); });
  e.newFlag = 0; S.more = false; S.picks = null;
  toast(names.length + ' draft views generated from the approved reference \u00b7 ' + $$$(total), null); render();
}
function ticketEl(key) {
  const t = S.ticket; if (!t || t.key !== key) return '';
  return h('span', { class: 'ticket' }, h('span', {}, h('b', {}, t.names.length + ' generations \u00b7 ' + $$$(t.total)), ' \u00b7 largest item ' + $$$(PRICE) + ' \u00b7 above the confirm rule (10+ generations)'),
    h('button', { class: 'primary', onclick: () => { t.ok = true; startGen(S.ents.find(x => x.id === t.e), t.names, key); } }, 'Start'), h('button', { class: 'ghost', onclick: () => { S.ticket = null; render(); } }, 'Cancel'));
}
function genBtn(e, names, key, label) {
  const k = spendKind({ total: names.length * PRICE, count: names.length });
  return h('span', {}, h('button', { class: 'primary', onclick: () => startGen(e, names, key) }, label, h('span', { class: 'price' }, 'est ' + $$$(names.length * PRICE))), k === 'ticket' && !S.ticket ? '' : '', ticketEl(key));
}

// ---------- entity workspace ----------
function identity(e) {
  const att = e.imgs.map((hue, i) => h('div', { class: 'img h' + hue + (i === e.active ? ' act' : ''), title: i === e.active ? 'active approved reference' : 'attempt', onclick: () => { e.active = i; render(); } }));
  return h('div', { class: 'ws' },
    h('div', {}, pic(e), h('div', { class: 'attempts' }, att, e.type === 'extra' ? '' : h('div', { class: 'img', style: 'width:56px;height:42px;display:grid;place-items:center;cursor:pointer;color:var(--dim)', title: 'generate or upload another attempt', onclick: () => { e.imgs.push(1 + (nid++ % 8)); e.active = e.imgs.length - 1; e.approved = false; render(); } }, '+')),
      h('div', { class: 'faint', style: 'margin-top:4px;font-size:11px' }, e.imgs.length ? 'Attempts \u00b7 one active. Highlighted = approved reference' : 'No reference yet. One approved image is enough.')),
    h('div', { class: 'col' },
      h('div', {}, h('div', { class: 'faint' }, 'Canonical description ', h('span', { class: 'aitag', title: 'compiled from every Mention' }, 'AI-compiled from 3 mentions \u00b7 edit to make it yours')), h('textarea', { rows: 4, oninput: x => e.desc = x.target.value }, e.desc)),
      h('div', { class: 'row' },
        e.type === 'extra' ? h('span', { class: 'dim' }, 'Extra types are text-first. Image optional.') :
          [h('button', { class: 'primary', onclick: () => { e.imgs.push(1 + (nid++ % 8)); e.active = e.imgs.length - 1; e.approved = false; e.state = e.state === 'light' ? 'kept' : e.state; toast('Draft identity image \u00b7 ' + $$$(PRICE)); render(); } }, 'Generate image', h('span', { class: 'price' }, 'est ' + $$$(PRICE))),
          h('button', {}, 'Upload'),
          h('button', { disabled: e.approved || !e.imgs.length, onclick: () => { e.approved = true; if (e.state === 'proposed') e.state = 'kept'; S.lock = e.id; render(); } }, e.approved ? 'Identity approved \u2713' : 'Approve identity')]),
      S.lock === e.id && e.approved ? h('div', { class: 'note' }, 'Identity approved. Lock it? ', h('button', { class: 'ghost', onclick: () => { e.locked = true; S.lock = null; render(); } }, 'Lock'), h('button', { class: 'ghost', onclick: () => { S.lock = null; render(); } }, 'Not now')) : '',
      e.locked ? h('span', { class: 'lock' }, '\u{1F512} identity locked \u00b7 unlock any time') : '',
      h('div', { class: 'note' }, 'The base Look is this identity. No separate "base" object. Looks and views are optional and come later.'),
      h('div', { class: 'row' }, e.state !== 'light' ? h('button', { class: 'ghost', onclick: () => { e.state = 'light'; render(); } }, 'Make lightweight') : h('button', { class: 'ghost', onclick: () => { e.state = 'kept'; render(); } }, 'Add an image later'), h('button', { class: 'ghost', onclick: () => { e.state = 'deferred'; render(); } }, 'Defer'))));
}
function looks(e) {
  const isLoc = e.type === 'location';
  const askBox = S.lookAsk && isLoc ? h('div', { class: 'sheet' }, h('b', {}, 'A night, burned or abandoned version of this place?'),
    h('div', { class: 'row', style: 'margin:8px 0' }, h('button', { onclick: () => { e.looks.push({ name: 'Night', hue: 8, from: 'unassigned' }); S.lookAsk = false; render(); } }, 'Add as a Look of ' + e.name), h('button', { onclick: () => { S.ents.push(E({ type: 'location', name: e.name + ' (night)', state: 'kept', scenes: '', first: 9, desc: e.desc, imgs: [8], approved: true })); S.lookAsk = false; toast('Separate location created. Neither is privileged.'); render(); } }, 'Make a separate location')),
    h('div', { class: 'faint' }, 'Both work. Time of day and lighting normally come from the scene and shot, so a Look is for changes to the place itself. Each Look needs its own views per Direction; a separate location carries its own identity and coverage.')) : '';
  return h('div', {},
    e.looks.length ? e.looks.map(l => h('div', { class: 'look' }, h('div', { class: 'img h' + l.hue }), h('div', {}, h('b', {}, l.name), h('div', { class: 'dim' }, 'from ' + l.from + (isLoc ? ' \u00b7 needs its own views per direction' : ''))), h('span', { class: 'sp' }), h('button', { class: 'ghost' }, 'Edit'), h('button', { class: 'ghost', onclick: () => { e.looks = e.looks.filter(x => x !== l); render(); } }, 'Remove'))) : h('div', { class: 'dim' }, 'No alternate Looks. ' + e.name + ' uses its identity everywhere. That is a normal state.'),
    h('div', { class: 'ai-prop note' }, h('span', { class: 'aitag' }, 'AI noticed'), isLoc ? ' Sc 9 mentions "scorched cabinets". ' : ' Sc 4 mentions "muddy suit". ', h('button', { class: 'ghost' }, 'Accept as Look'), h('button', { class: 'ghost' }, 'Edit'), h('button', { class: 'ghost' }, 'Dismiss')),
    h('div', { class: 'row', style: 'margin-top:8px' }, h('button', { onclick: () => { if (isLoc) S.lookAsk = true; else e.looks.push({ name: 'New Look', hue: 6, from: 'unassigned' }); render(); } }, '+ Add Look')), askBox);
}
function coverage(e) {
  if (e.type !== 'location') return h('div', { class: 'dim' }, 'Coverage applies to Locations. A ' + e.type + ' needs only its identity.');
  const n = need(e), d = drafts(e), done = e.views.filter(v => v.status === 'accepted');
  const out = [h('div', { style: 'margin-bottom:10px' }, h('b', {}, e.name), ' ', ready(e)),
    S.shots ? '' : h('div', { class: 'note' }, 'No shots planned yet, so no production views are called for. Coverage will be derived from the shots. You can still add views now.')];
  if (d.length) out.push(h('div', { class: 'sheet' }, h('div', { class: 'row' }, h('b', {}, 'Contact sheet \u00b7 ' + d.length + ' draft views'), h('span', { class: 'dim' }, 'generated from the approved reference'), h('span', { class: 'sp' }),
    h('button', { class: 'primary', onclick: () => { const ids = d.map(v => v.id); d.forEach(v => v.status = 'accepted'); toast('Accepted ' + ids.length + ' views', () => { e.views.forEach(v => { if (ids.includes(v.id)) v.status = 'draft'; }); render(); }); render(); } }, 'Accept all ' + d.length)),
    h('div', { class: 'views', style: 'margin-top:10px' }, d.map(v => viewTile(e, v, true)))));
  if (n.length) {
    if (S.cov === 'inline') out.push(h('div', { class: 'row' }, genBtn(e, n.map(v => v.name), 'need', 'Generate ' + n.length + ' needed views')));
    else {
      out.push(h('div', { class: 'tray' }, h('div', { class: 'faint', style: 'margin-bottom:4px' }, 'Called for by your shots'), n.map(v => h('label', {}, h('input', { type: 'checkbox', checked: true }), v.name, h('span', { class: 'faint' }, ' \u00b7 ' + v.why))), h('div', { style: 'margin-top:6px' }, genBtn(e, n.map(v => v.name), 'need', 'Generate ' + n.length + ' selected'))));
    }
  }
  out.push(h('div', { class: 'views', style: 'margin:12px 0' }, e.views.filter(v => v.status === 'needed' || v.status === 'accepted' || v.status === 'skipped').map(v => viewTile(e, v))));
  out.push(h('div', { class: 'row' }, h('button', { class: 'ghost', onclick: () => { S.more = !S.more; if (S.more) S.picks = new Set(SUGG.filter(s => !e.views.some(v => v.name === s))); render(); } }, S.more ? '\u25be Generate more views' : '\u25b8 Generate more views / Complete coverage'), h('input', { id: 'addv', placeholder: 'Add a named view…', style: 'width:190px' }), h('button', { onclick: () => { const v = $('#addv').value.trim(); if (v) { e.views.push(V(v, 'needed', 1 + nid % 8, 'added by you')); render(); } } }, 'Add view')));
  if (S.more) {
    const opts = SUGG.filter(s => !e.views.some(v => v.name === s)), picked = opts.filter(o => S.picks.has(o));
    out.push(h('div', { class: 'tray' }, h('div', { class: 'faint', style: 'margin-bottom:4px' }, 'Optional, any time, even with no shots. Nothing here is required.'),
      h('div', { style: 'columns:2' }, opts.map(o => h('label', {}, h('input', { type: 'checkbox', checked: S.picks.has(o), onchange: x => { x.target.checked ? S.picks.add(o) : S.picks.delete(o); render(); } }), o))),
      h('div', { style: 'margin-top:6px' }, picked.length ? genBtn(e, picked, 'more', 'Generate ' + picked.length + ' views') : h('span', { class: 'faint' }, 'Pick some views'))));
  }
  return h('div', {}, out);
}
function entity() {
  const e = sel();
  const head = h('div', { class: 'hdr' }, h('button', { class: 'ghost', onclick: () => { S.view = 'home'; render(); } }, '\u2039 World'), h('h2', {}, e.name), h('span', { class: 'chip' }, e.type), h('span', { class: 'dim' }, ready(e)),
    h('span', { class: 'sp' }), h('span', { class: 'faint' }, e.scenes ? 'appears in ' + e.scenes : 'not placed in any scene'));
  const secs = { identity: ['Identity', identity], looks: ['Looks' + (e.looks.length ? ' \u00b7 ' + e.looks.length : ' (optional)'), looks], coverage: ['Coverage' + (need(e).length ? ' \u00b7 ' + need(e).length + ' needed' : ''), coverage] };
  if (S.ws === 'tabs') return h('div', { class: 'pane' }, head, h('div', { class: 'tabs' }, Object.entries(secs).map(([k, [t]]) => h('button', { class: S.tab === k ? 'on' : '', onclick: () => { S.tab = k; render(); } }, t))), secs[S.tab][1](e));
  return h('div', { class: 'pane' }, head, h('div', { class: 'ladder' }, 'Identity ', h('b', {}, e.approved ? '\u2713' : '\u2026'), ' \u2192 Looks (optional) \u2192 Coverage (from shots)'), Object.entries(secs).map(([k, [t, f]]) => h('div', { class: 'sec' }, h('h4', {}, t), f(e))));
}
function viewTile(e, v, fix) {
  return h('div', { class: 'vt ' + v.status }, h('div', { class: 'img h' + v.hue }, v.status === 'needed' ? h('div', { class: 'ph' }, 'not generated') : ''), h('div', { class: 'nm' }, v.name), h('div', { class: 's' }, v.status === 'needed' ? (v.why ? 'new view needed \u00b7 ' + v.why : 'view') : v.status === 'draft' ? 'draft attempt' : v.status),
    fix ? h('div', { class: 'fx' }, ['Redo', 'Upload', 'Skip'].map(a => h('button', { class: 'ghost', onclick: () => { if (a === 'Skip') { v.status = 'skipped'; render(); } else toast(a + ' ' + v.name + (a === 'Redo' ? ' \u00b7 ' + $$$(PRICE) : '')); } }, a))) : '');
}

// ---------- home ----------
function addBar() {
  return h('div', { class: 'row' }, h('input', { id: 'addn', placeholder: 'Add anything missing…', style: 'width:200px' }), h('select', { id: 'addt' }, Object.keys(ET).map(k => h('option', { value: k }, k))), h('button', { onclick: () => { const n = $('#addn').value.trim(); if (n) { S.ents.push(E({ type: $('#addt').value, name: n, state: 'light', first: 9 })); toast('Added ' + n, () => { S.ents.pop(); render(); }); render(); } } }, '+ Add'));
}
function home() {
  const live = S.ents.filter(e => e.state !== 'merged'), unrev = live.filter(e => e.state === 'proposed').length;
  const groups = S.home === 'type' ? Object.entries(ET).map(([k, t]) => [t, live.filter(e => e.type === k)]) :
    [['Sc 1\u20133 \u00b7 where it opens', live.filter(e => e.first <= 3)], ['Sc 4\u20138 \u00b7 the middle', live.filter(e => e.first > 3 && e.first < 9)], ['Later or not placed', live.filter(e => e.first >= 9)]];
  const totalNeed = live.reduce((a, e) => a + need(e).length, 0);
  const body = S.hm === 'wall' ? wall(live) : groups.filter(g => g[1].length).map(([t, es]) => h('div', {}, h('div', { class: 'sub-h' }, t + ' \u00b7 ' + es.length), h('div', { class: 'tiles' }, es.map(tile))));
  return h('div', { class: 'pane' }, h('div', { class: 'hdr' }, h('h2', {}, 'World Definition'), h('span', { class: 'sp' }), h('div', { class: 'seg2' }, ['tiles', 'wall'].map(m => h('button', { class: S.hm === m ? 'on' : '', onclick: () => { S.hm = m; render(); } }, m === 'tiles' ? 'Tiles' : 'Coverage wall')))),
    h('div', { class: 'row dim', style: 'margin-bottom:6px' }, unrev ? h('span', {}, unrev + ' proposed entities not reviewed. '): '', unrev ? h('button', { class: 'ghost', onclick: () => { S.view = 'review'; render(); } }, 'Review what Aiuteur found \u203a') : '', totalNeed ? h('span', { class: 'quiet' }, totalNeed + ' production views called for by your shots') : '', h('span', { class: 'sp' }), addBar()),
    body, setBar(live));
}
function setBar(live) {
  const c = k => live.filter(e => e.state === k).length;
  return h('div', { class: 'sec', style: 'margin-top:28px' }, h('span', { class: 'dim' }, 'The world is set (optional): ', c('kept') + ' kept \u00b7 ' + c('light') + ' lightweight \u00b7 ' + c('deferred') + ' deferred \u00b7 ' + c('proposed') + ' not reviewed. '), h('button', { class: 'ghost', onclick: () => { S.setNote = !S.setNote; render(); } }, 'Mark world as set'), S.setNote ? h('span', { class: 'dim' }, ' Done. Lock Visual Style + World Definition? ', h('button', { class: 'ghost', onclick: () => { toast('Locked. Unlock any time.'); } }, 'Lock'), h('button', { class: 'ghost', onclick: () => { S.setNote = false; render(); } }, 'Not now')) : '', h('div', { class: 'faint' }, 'Gates nothing. Shot planning does not wait for this.'));
}
function wall(live) {
  const locs = live.filter(e => e.type === 'location' && e.state !== 'deferred');
  const total = locs.reduce((a, e) => a + need(e).length, 0);
  return h('div', { class: 'wall' }, h('div', { class: 'row', style: 'margin:8px 0' }, h('span', { class: 'dim' }, 'Same data as each entity\u2019s Coverage area. Every Location by its production views.'), h('span', { class: 'sp' }),
    h('span', { class: 'faint' }, total ? total + ' views needed across ' + locs.filter(e => need(e).length).length + ' locations' : '')),
    locs.map(e => h('div', { class: 'sec' }, h('div', { class: 'row' }, h('b', {}, e.name), ready(e), h('span', { class: 'sp' }), need(e).length ? genBtn(e, need(e).map(v => v.name), 'wall' + e.id, 'Generate ' + need(e).length + ' needed') : '', drafts(e).length ? h('button', { class: 'primary', onclick: () => { const ids = drafts(e); ids.forEach(v => v.status = 'accepted'); toast('Accepted ' + ids.length, () => { ids.forEach(v => v.status = 'draft'); render(); }); render(); } }, 'Accept all ' + drafts(e).length) : '', h('button', { class: 'ghost', onclick: () => { S.view = 'entity'; S.sel = e.id; S.tab = 'coverage'; render(); } }, 'Open')),
      h('div', { class: 'views', style: 'margin-top:8px' }, h('div', { class: 'vt' }, h('div', { class: 'img h' + (e.imgs[0] || 1) }), h('div', { class: 'nm' }, 'Identity (canonical)'), h('div', { class: 's' }, 'approved')), e.views.map(v => viewTile(e, v))))));
}

// ---------- extraction review ----------
function review() {
  const live = S.ents.filter(e => e.state !== 'merged');
  const act = (e, st, msg) => h('button', { onclick: () => { const old = e.state; e.state = st; toast(msg + ': ' + e.name, () => { e.state = old; render(); }); render(); } }, msg);
  return h('div', { class: 'pane' }, h('div', { class: 'hdr' }, h('button', { class: 'ghost', onclick: () => { S.view = 'home'; render(); } }, '\u2039 World'), h('h2', {}, 'Review what Aiuteur found'), h('span', { class: 'sp' }),
    h('button', { class: 'primary', onclick: () => { const ch = live.filter(e => e.state === 'proposed'); ch.forEach(e => e.state = 'kept'); toast('Kept ' + ch.length, () => { ch.forEach(e => e.state = 'proposed'); render(); }); render(); } }, 'Keep all')),
    h('div', { class: 'dim', style: 'margin-bottom:10px' }, 'Accelerates, never constrains. Nothing here gates shot planning. Anything unreviewed just reads "not reviewed".'), addBar(),
    Object.entries(ET).map(([k, t]) => { const es = live.filter(e => e.type === k); return es.length ? [h('div', { class: 'sub-h' }, t), h('div', { class: 'card rev' }, es.map(e => h('div', { class: 'item' }, h('div', { class: 'img h' + (e.imgs[0] || 0), style: 'width:34px;height:34px' }),
      h('div', {}, h('b', {}, e.name), ' ', h('span', { class: 'chip' }, e.state === 'proposed' ? 'not reviewed' : e.state), h('div', { class: 'dim' }, e.desc), h('div', { class: 'faint' }, 'Appears in ' + e.scenes),
        e.merge && e.state !== 'kept' ? h('div', { class: 'sug' }, 'Looks like a duplicate of Marcus Hale ', h('button', { class: 'ghost', onclick: () => { e.state = 'merged'; toast('Merged Mr. Hale into Marcus Hale', () => { e.state = 'proposed'; render(); }); render(); } }, 'Merge'), h('button', { class: 'ghost', onclick: () => { e.merge = null; render(); } }, 'Not the same')) : ''),
      h('div', { class: 'acts' }, act(e, 'kept', 'Keep'), act(e, 'light', 'Keep lightweight'), act(e, 'deferred', 'Defer'), h('select', { onchange: x => { e.type = x.target.value; toast('Changed type to ' + e.type, null); render(); } }, Object.keys(ET).map(t => h('option', { value: t, selected: t === e.type }, t === e.type ? 'type: ' + t : t))))))) ] : ''; }).flat());
}

// ---------- style ----------
function style() {
  const st = S.style || (S.style = { by: 'ai', name: 'Warm 35mm naturalism' });
  return h('div', { class: 'pane' }, h('div', { class: 'hdr' }, h('button', { class: 'ghost', onclick: () => { S.view = 'home'; render(); } }, '\u2039 World'), h('h2', {}, 'Visual Style'), h('span', { class: 'sp' }), h('span', { class: 'faint' }, 'one per project \u00b7 identity outranks style')),
    st.by === 'ai' ? h('div', { class: 'note' }, h('span', { class: 'aitag' }, 'AI chose: ' + st.name), ' so nothing is blocked. ', h('button', { class: 'ghost', onclick: () => { st.by = 'you'; render(); } }, 'Replace')) : h('div', { class: 'note' }, 'Style: ', st.name, ' \u00b7 yours. Changing it only marks visual work possibly out of date ', h('span', { class: 'whisper' })),
    h('div', { class: 'sub-h' }, 'Preset'), h('div', { class: 'row' }, ['Warm 35mm naturalism', 'Cold digital noir', 'Painterly gothic', 'Hand-drawn ink'].map(p => h('button', { class: st.name === p ? 'on' : '', style: st.name === p ? 'border-color:var(--accent)' : '', onclick: () => { st.name = p; st.by = 'you'; render(); } }, p))),
    h('div', { class: 'sub-h' }, 'Or in plain English'), h('textarea', { rows: 2, placeholder: 'Sun-faded farmhouse realism, soft window light, muted greens…' }),
    h('div', { class: 'sub-h' }, 'Reference images'), h('div', { class: 'tiles', style: 'grid-template-columns:repeat(auto-fill,minmax(130px,1fr))' }, [2, 5, 7].map(x => h('div', { class: 'tile' }, h('div', { class: 'img h' + x, style: 'aspect-ratio:16/9' }), h('div', { class: 'st' }, 'style reference'))), h('div', { class: 'tile' }, h('div', { class: 'img', style: 'aspect-ratio:16/9;display:grid;place-items:center;color:var(--dim)' }, '+ add'))),
    h('div', { class: 'note' }, 'Reference Media for a shot is separate: it gives composition or style, never identity. Promoting one to an entity image is an explicit act on that entity\u2019s Identity.'));
}

// ---------- shell ----------
function outline() {
  const o = $('#outline'); o.innerHTML = '';
  const a = (t, on, cls, fn) => h('a', { class: (on ? 'on ' : '') + (cls || ''), onclick: fn }, h('i', { class: 'dot' + (on ? ' prog' : '') }), t);
  o.append(h('h6', {}, 'Story'), a('Input', 0, 'muted'), a('Master Narrative', 0, 'muted'), h('h6', {}, 'World'), a('World Definition', S.view === 'home' || S.view === 'entity' || S.view === 'review', '', () => { S.view = 'home'; S.hm = 'tiles'; render(); }),
    a('Coverage wall', S.view === 'wall', 'sub', () => { S.view = 'home'; S.hm = 'wall'; render(); }), a('Visual Style', S.view === 'style', 'sub', () => { S.view = 'style'; render(); }),
    h('h6', {}, 'Scenes'), a('Sc 1 Hale Kitchen', 0, 'muted'), a('Sc 4 The Key', 0, 'muted'),
    S.shots ? h('a', { class: 'sub muted', title: 'never blocks' }, '\u2937 Sc 1 Sh 3: new view needed in World') : '');
}
const PRESETS = [['review', 'Fresh extraction review'], ['identity', 'Identity only (no shots)'], ['shots', 'Shots planned \u2192 needs flag'], ['sheet', 'Coverage contact sheet'], ['variant', 'Alternate Look vs separate'], ['style', 'Style / reference'], ['wall', 'Coverage wall']];
function controls() {
  const c = $('#ctl'); c.innerHTML = '';
  const seg = (title, key, opts) => [h('h5', {}, title), h('div', { class: 'seg' }, opts.map(([v, t]) => h('button', { class: S[key] === v ? 'on' : '', onclick: () => { S[key] = v; render(); } }, t)))];
  c.append(h('h5', {}, 'Prototype controls \u00b7 state'), h('div', { class: 'seg' }, PRESETS.map(([p, t]) => h('button', { onclick: () => { seed(p); if (p === 'wall') { S.view = 'home'; S.hm = 'wall'; } else S.hm = 'tiles'; render(); } }, t))),
    ...seg('Home organisation', 'home', [['type', 'A · by type'], ['story', 'B · by story order']]), ...seg('Entity navigation', 'ws', [['tabs', 'A · tabs'], ['scroll', 'B · ladder scroll']]), ...seg('Coverage needs vs opt-in', 'cov', [['inline', 'A · one line'], ['tray', 'B · needs list']]));
}
function render() { outline(); controls(); const m = $('#main'), y = m.scrollTop; m.innerHTML = ''; m.append(S.view === 'entity' ? entity() : S.view === 'review' ? review() : S.view === 'style' ? style() : home()); m.scrollTop = y; }
seed(Q.get('p') || 'identity');
if (Q.get('sel')) { S.view = 'entity'; S.sel = Q.get('sel'); S.tab = Q.get('tab') || 'identity'; if (Q.get('look')) S.lookAsk = true; }
if (Q.get('hm')) { S.hm = Q.get('hm'); }
if (Q.get('more')) { S.more = true; S.picks = new Set(SUGG); }
render();

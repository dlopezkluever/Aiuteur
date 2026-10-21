/* PROTOTYPE (Wayfinder #60) variant C: SHEET + FOCUS, batch = IN-PLACE PROPOSALS ON THE BOARD.
   Scene workspace: a dense editable sheet (one row per shot, bulk-select, inline cells) for fast precise passes at 30+ shots;
   Enter / Open switches the same centre to a focus view of one shot with prev/next. Batch drafting: scope, one invoke, scenes fill in live;
   for scenes with your work, proposed shots appear as dashed ghost marks in place, accepted per scene. */
let checked = new Set();
V.C = {
  boardRow(s) {
    let marks;
    if (U.drafting.has(s.id)) marks = '<span class="empty-lane">drafting… <span class="mk ghost"></span><span class="mk ghost"></span><span class="mk ghost"></span></span>';
    else if (!s.planned) marks = '<span class="empty-lane">no plan yet</span>';
    else marks = M.activeShots(s).map((sh, j) => mark(sh, s, j)).join('') + Array.from({ length: s.proposals || 0 }, () => '<span class="mk ghost" title="proposed shot"></span>').join('') + (s.proposals ? ` <button class="ghost" data-act="applyC" data-sc="${s.id}">apply ${s.proposals}</button><button class="ghost" data-act="dismissC" data-sc="${s.id}">dismiss</button>` : '');
    return boardRowBase(s, marks);
  },
  dock() {
    const n = U.scope.size; if (!n) return '';
    const ids = [...U.scope], gens = ids.length, total = M.cost(gens), confirm = gens >= 10 || total >= 2, kinds = {};
    ids.forEach(id => { const k = M.draftDisposition(scene(id)).k; kinds[k] = (kinds[k] || 0) + 1; });
    return `<div class="dock"><div class="row2"><b>${n} in scope</b><span class="quiet">${kinds.new ? kinds.new + ' new · ' : ''}${kinds.refresh ? kinds.refresh + ' refresh · ' : ''}${kinds.options ? kinds.options + ' have your work (proposals) · ' : ''}${kinds.held ? kinds.held + ' locked (held)' : ''}</span>
      ${U.confirmC ? `<span class="chip warn">${gens >= 10 ? '10 or more generations' : '$2.00 or more'}</span><button class="pri" data-act="runC2">Confirm · $${total.toFixed(2)}</button><button class="ghost" data-act="cancelC">cancel</button>` : `<button class="pri" data-act="runC">Draft plans · $${total.toFixed(2)}</button>`}
      <button disabled>Generate frames…</button><button disabled>Regenerate flagged…</button></div></div>`;
  },
  acts: {
    runC() { const g = U.scope.size; if (g >= 10 || M.cost(g) >= 2) { U.confirmC = true; render(); } else V.C.acts.runC2(); },
    cancelC() { U.confirmC = false; render(); },
    runC2() { U.confirmC = false; const ids = [...U.scope]; U.scope.clear(); ids.forEach((id, i) => { U.drafting.add(id); setTimeout(() => { U.drafting.delete(id); M.runDraft([id]); render(); }, 300 * (i + 1)); }); render(); },
    applyC(d) { M.acceptProposals(d.sc); }, dismissC(d) { scene(d.sc).proposals = 0; M.emit(); },
    chk(d, e) { e.target.checked ? checked.add(d.sh) : checked.delete(d.sh); render(); },
    focus(d) { U.focus = d.sh; U.shotId = d.sh; render(); },
    table() { U.focus = null; render(); },
    rowsel(d) { U.shotId = d.sh; render(); },
    bulk(d) {
      const ids = [...checked];
      if (d.op === 'merge') ids.slice(0, -1).forEach(id => { const r = M.findShot(id); if (r && !r.sh.retired) M.merge(id); });
      if (d.op === 'retire') ids.forEach(M.retire); if (d.op === 'skip') ids.forEach(M.skipFrames); if (d.op === 'appr') ids.forEach(M.approveFrames);
      if (d.op === 'take') ids.forEach(M.makeTake); if (d.op === 'clear') { }
      checked.clear(); render();
    },
    addC() { U.shotId = M.add(U.sceneId, U.shotId); render(); },
  },
  scene(sc) {
    const a = M.activeShots(sc);
    if (U.focus && a.find(s => s.id === U.focus)) { const cur = M.findShot(U.focus); return `${sceneHead(sc)}<div class="row2" style="margin-bottom:6px"><button data-act="table">← Sheet</button><span class="quiet">scene ${sc.n} · ${M.label(sc, a.indexOf(cur.sh))} of ${a.length}</span></div>${shotWork(cur.sh, sc, 'stack')}`; }
    U.focus = null;
    const sel = [...checked].filter(id => a.find(s => s.id === id));
    const cost = sel.reduce((t, id) => t + price.take(M.findShot(id).sh), 0);
    const rows = a.map((sh, j) => {
      const s = M.status(sh), fr = sh.roles.filter(r => r.state === 'approved' || r.state === 'skipped').length;
      const sel1 = (f, o) => `<select data-edit="${f}" data-sh="${sh.id}" class="${sh[f + 'Src'] === 'ai' ? 'ai' : ''}"><option value="">·</option>${o.map(x => `<option ${sh[f] === x ? 'selected' : ''}>${x}</option>`).join('')}</select>`;
      return `<tr class="${sh.id === U.shotId ? 'on' : ''}" data-act="rowsel" data-sh="${sh.id}" data-peek="${sh.id}"><td><input type="checkbox" data-vact="chk" data-sh="${sh.id}" ${checked.has(sh.id) ? 'checked' : ''}></td><td><b>${M.label(sc, j)}</b></td><td><span class="dot st-${s}" title="${STL[s]}"></span></td>
        <td style="width:34%"><input type="text" data-edit="action" data-sh="${sh.id}" value="${esc(sh.action)}"></td><td class="quiet" title="${esc(sh.dialogue.map(d => d.who + ': ' + d.line).join(' / '))}">${sh.dialogue.length ? sh.dialogue.length + ' line' + (sh.dialogue.length > 1 ? 's' : '') : '·'}</td>
        <td class="quiet">${sh.ents.map(e => e.split(' ').pop()).join(', ')}</td><td>${sel1('size', M.SIZES)}</td><td>${sel1('angle', M.ANGLES)}</td><td>${sel1('move', M.MOVES)}</td>
        <td><input class="n" type="number" data-edit="dur" data-sh="${sh.id}" value="${sh.dur}">s</td><td class="quiet">${fr}/${sh.roles.length}</td><td class="quiet">${sh.takes}${sh.sel ? '✓' : ''}</td><td>${sh.stale ? '<span class="sdot" style="display:inline-block" title="' + esc(sh.stale) + '"></span>' : ''}${sh.failed ? '✕' : ''}${sh.deviation ? ' ≠' : ''}</td>
        <td><button class="ghost" data-act="focus" data-sh="${sh.id}">Open</button></td></tr>`;
    }).join('');
    return `${sceneHead(sc)}${sel.length ? `<div class="bulk"><b>${sel.length} selected</b><button data-act="bulk" data-op="merge">Merge</button><button data-act="bulk" data-op="skip">Skip frames</button><button data-act="bulk" data-op="appr">Approve frames</button><button data-act="bulk" data-op="take">Generate takes · $${cost.toFixed(2)}${cost >= 2 || sel.length >= 10 ? ' (confirm)' : ''}</button><button data-act="bulk" data-op="retire">Retire</button></div>` : ''}
      <table class="tbl"><thead><tr><th></th><th>#</th><th></th><th>Action</th><th>Dlg</th><th>Who</th><th>Size</th><th>Angle</th><th>Move</th><th>Dur</th><th>Fr</th><th>Tk</th><th></th><th></th></tr></thead><tbody>${rows}</tbody></table>
      <div class="row2" style="margin-top:8px"><button data-act="addC">+ Add shot</button><span class="quiet">Edit cells in place · tick rows for bulk · Open for the full shot</span></div>`;
  },
  after() { },
};

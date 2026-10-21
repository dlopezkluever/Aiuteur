/* PROTOTYPE (Wayfinder #60) variant B: RUNTIME STRIP + STAGE, batch = RUN NOW, REVIEW AFTER.
   Scene workspace: a duration-proportional strip of all shots in the scene on top (runtime made visible, reorder by drag, split/merge by tool),
   the selected shot's three-column stage below. Board marks are duration-proportional bars. Batch drafting: one click runs; a result tray says what happened and offers one-step undo. */
let snap = null;
V.B = {
  boardRow(s) {
    const marks = !s.planned ? (U.drafting.has(s.id) ? '<span class="empty-lane">drafting…</span>' : '<span class="empty-lane">no plan yet</span>') :
      M.activeShots(s).map((sh, j) => mark(sh, s, j, true)).join('') + (s.proposals ? `<span class="chip q">${s.proposals} proposals</span>` : '');
    return boardRowBase(s, marks);
  },
  dock() {
    const n = U.scope.size, r = U.lastB; let h = '';
    if (r) {
      h += `<div class="sheet" style="max-height:170px">${r.res.slice().sort((a, b) => (a.k === "applied") - (b.k === "applied")).map(x => { const sc = scene(x.id); return `<div class="r"><span>${sc.n}. ${esc(sc.title)}</span><span class="k-${x.k === 'applied' ? 'new' : 'options'}">${x.k === 'applied' ? x.n + ' shots applied' : x.n + ' proposals'}</span><span>${x.k === 'applied' ? '' : (x.k === 'held' ? 'plan locked, held as proposal' : 'your edits and frames stay as they were')} ${x.k !== 'applied' ? `<button class="ghost" data-act="applyPropB" data-sc="${x.id}">apply</button>` : ''}</span></div>`; }).join('')}</div>
      <div class="row2"><span class="quiet">Last run: ${r.res.length} scenes, $${M.cost(r.res.length).toFixed(2)}</span><button data-act="undoB">Undo whole run</button><button class="ghost" data-act="closeB">dismiss</button></div>`;
    }
    if (!n && !h) return '';
    const ids = [...U.scope], gens = ids.length, total = M.cost(gens), confirm = gens >= 10 || total >= 2;
    return `<div class="dock">${h}${n ? `<div class="row2" style="margin-top:4px"><b>${n} in scope</b><button class="pri" data-act="runB" ${U.confirmB ? 'style="display:none"' : ''}>Draft ${gens} plan${gens > 1 ? 's' : ''} · $${total.toFixed(2)}</button>
      ${U.confirmB ? `<span class="chip warn">${gens >= 10 ? '10 or more generations' : '$2.00 or more'}: confirm</span><button class="pri" data-act="runB2">Confirm · $${total.toFixed(2)}</button><button class="ghost" data-act="cancelB">cancel</button>` : ''}
      <button disabled>Generate frames…</button><button disabled>Regenerate flagged…</button><span class="quiet">Runs at once; locked or edited scenes only ever get proposals.</span></div>` : ''}</div>`;
  },
  acts: {
    runB() { const gens = U.scope.size; if (gens >= 10 || M.cost(gens) >= 2) { U.confirmB = true; render(); } else V.B.acts.runB2(); },
    cancelB() { U.confirmB = false; render(); },
    runB2() {
      U.confirmB = false; const ids = [...U.scope]; snap = JSON.stringify(M.S.scenes.filter(s => ids.includes(s.id))); const res = [];
      ids.forEach((id, i) => { U.drafting.add(id); setTimeout(() => { U.drafting.delete(id); res.push(...M.runDraft([id])); if (i === ids.length - 1) { U.lastB = { res }; U.scope.clear(); render(); } else render(); }, 250 * (i + 1)); });
      render();
    },
    undoB() { JSON.parse(snap).forEach(o => { const sc = scene(o.id); Object.keys(sc).forEach(k => delete sc[k]); Object.assign(sc, o); }); U.lastB = null; M.emit('Run undone'); toast('Whole run undone: parentage and content restored'); },
    closeB() { U.lastB = null; render(); },
    applyPropB(d) { M.acceptProposals(d.sc); const x = U.lastB.res.find(r => r.id === d.sc); x.k = 'applied'; render(); },
    pickB(d) { U.shotId = d.sh; render(); },
    dragStart(d, e) { },
  },
  scene(sc) {
    const a = M.activeShots(sc); if (!U.shotId || !a.find(s => s.id === U.shotId)) U.shotId = a[0].id;
    const tot = a.reduce((t, s) => t + s.dur, 0), est = sc.estSec, px = Math.min(16, 1000 / Math.max(tot, est, 1));
    const strip = a.map((sh, j) => `<div class="sb st-${M.status(sh)} ${sh.id === U.shotId ? 'on' : ''} ${sh.stale ? 'stale' : ''}" draggable="true" data-drag="${sh.id}" data-act="pickB" data-sh="${sh.id}" style="width:${Math.max(18, sh.dur * px)}px;flex:none" title="${esc(sh.action)}"><b>${M.label(sc, j)}</b><small>${sh.dur}s${sh.takes ? ' · ' + sh.takes + 't' : ''}</small></div>`).join('');
    let ticks = ''; for (let t = 0; t <= Math.max(tot, est) + 10; t += 10) ticks += `<span style="left:${t * px + 6}px">${t}s</span>`;
    const cur = M.findShot(U.shotId);
    return `${sceneHead(sc)}<div class="lbl">Shots by duration · narrative estimate <span style="color:#fff">▎</span> at ${M.fmt(est)} · drag a shot to reorder</div>
      <div style="position:relative"><div class="ruler" style="width:${Math.max(tot, est) * px + 60}px">${ticks}</div><div class="strip" id="strip">${strip}<div style="position:absolute;left:${est * px + 8}px;top:18px;bottom:0;width:2px;background:#fff;opacity:.7;pointer-events:none"></div></div></div>
      <div class="tools"><button data-act="split" data-sh="${U.shotId}">✂ Split</button><button data-act="merge" data-sh="${U.shotId}">Merge with next</button><button data-act="up" data-sh="${U.shotId}">◀ earlier</button><button data-act="down" data-sh="${U.shotId}">later ▶</button><button data-act="addB">+ add shot after</button>${sc.proposals ? `<button class="pri" data-act="applyPropB2" data-sc="${sc.id}">${sc.proposals} proposals waiting</button>` : ''}<span class="quiet">j / k previous and next shot</span></div>
      ${shotWork(cur.sh, sc, 'cols')}`;
  },
  after() {
    document.querySelectorAll('[data-drag]').forEach(el => {
      el.ondragstart = e => e.dataTransfer.setData('text', el.dataset.drag);
      el.ondragover = e => e.preventDefault();
      el.ondrop = e => { e.preventDefault(); const from = e.dataTransfer.getData('text'), to = el.dataset.drag; if (from === to) return; const { sc } = M.findShot(from), a = M.activeShots(sc); let d = a.findIndex(s => s.id === to) - a.findIndex(s => s.id === from); const step = Math.sign(d); while (d !== 0) { M.move(from, step); d -= step; } };
    });
  },
};
V.B.acts.addB = () => { U.shotId = M.add(U.sceneId, U.shotId); render(); };
V.B.acts.applyPropB2 = d => M.acceptProposals(d.sc);

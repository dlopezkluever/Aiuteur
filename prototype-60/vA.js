/* PROTOTYPE (Wayfinder #60) variant A: PASSAGE + SHOT STACK, batch = PRE-FLIGHT SHEET.
   Scene workspace: the Master Narrative text on the left with shot brackets in a gutter, an ordered shot stack on the right;
   the selected shot expands IN PLACE into the full work area. Batch drafting: scope, then a pre-flight sheet that says what happens to each scene BEFORE anything runs. */
V.A = {
  boardRow(s) {
    const marks = !s.planned ? '<span class="empty-lane">no plan yet · select the row to draft</span>' :
      M.activeShots(s).map((sh, j) => mark(sh, s, j)).join('') + ((s.proposals) ? `<span class="chip q">${s.proposals} proposals</span>` : '');
    return boardRowBase(s, marks);
  },
  dock() {
    const n = U.scope.size; if (!n) return '';
    const ids = [...U.scope], gens = ids.length, total = M.cost(gens), confirm = gens >= 10 || total >= 2;
    let sheet = '';
    if (U.sheet) {
      sheet = `<div class="sheet">${ids.map(id => { const sc = scene(id), d = M.draftDisposition(sc); return `<div class="r"><span>${sc.n}. ${esc(sc.title)}</span><span class="k-${d.k}">${d.k === 'new' ? 'new plan' : d.k === 'refresh' ? 'refresh' : d.k === 'options' ? 'proposals only' : 'held'}</span><span>${d.text}</span></div>`; }).join('')}</div>
      <div class="row2"><span>${gens} generations · est <b>$${total.toFixed(2)}</b></span>${confirm ? `<span class="chip warn">confirm step: ${gens >= 10 ? '10 or more generations' : '$2.00 or more'}</span>` : '<span class="quiet">one click, price shown</span>'}
      <button class="pri" data-act="runA">${confirm ? 'Confirm and draft ' : 'Draft '}${gens} plan${gens > 1 ? 's' : ''} · $${total.toFixed(2)}</button><button class="ghost" data-act="sheetOff">cancel</button></div>`;
    }
    return `<div class="dock"><div class="row2"><b>${n} scene${n > 1 ? 's' : ''} in scope</b>
      <button class="${U.sheet ? 'pri' : ''}" data-act="sheetOn">Draft shot plans…</button><button disabled title="not in this prototype">Generate frames…</button><button disabled>Generate approved shots…</button><button disabled>Regenerate flagged…</button>
      <span class="quiet">Nothing runs from selecting. The sheet shows what each scene will do first; your edited shots are never overwritten.</span></div>${sheet}</div>`;
  },
  acts: {
    sheetOn() { U.sheet = true; render(); }, sheetOff() { U.sheet = false; render(); },
    runA() {
      const ids = [...U.scope]; const res = M.runDraft(ids); U.sheet = false; U.scope.clear();
      const a = res.filter(r => r.k === 'applied').length, p = res.length - a;
      toast(`${a} plan(s) applied, ${p} scene(s) got proposals only. One undoable action group.`);
    },
    selBlock(d) { const sc = scene(U.sceneId), b = +d.b; const sh = M.activeShots(sc).find(s => s.anchor && b >= s.anchor[0] && b <= s.anchor[1]); if (sh) { U.shotId = sh.id; render(); } },
    pick(d) { U.shotId = U.shotId === d.sh ? null : d.sh; render(); },
    addAfter(d) { U.shotId = M.add(U.sceneId, d.sh); render(); },
    mergeA(d) { M.merge(d.sh); render(); },
  },
  scene(sc) {
    const a = M.activeShots(sc); if (!U.shotId || !a.find(s => s.id === U.shotId)) U.shotId = null;
    const cover = i => a.map((sh, j) => ({ sh, j })).filter(x => x.sh.anchor && i >= x.sh.anchor[0] && i <= x.sh.anchor[1]);
    const left = sc.blocks.map((b, i) => { const c = cover(i); const hl = c.some(x => x.sh.id === U.shotId);
      return `<div class="A-blk ${b.type === 'dialogue' ? 'dl' : ''} ${hl ? 'hl' : ''}" data-act="selBlock" data-b="${i}"><div class="g">${c.length ? c.map(x => `<span style="background:${STC[M.status(x.sh)]}">${M.label(sc, x.j)}</span>`).join('') : '<span class="un">no shot</span>'}</div><div class="tx">${b.who ? '<span class="who">' + esc(b.who) + '</span> ' : ''}${esc(b.text)}</div></div>`; }).join('');
    const right = a.map((sh, j) => {
      const on = sh.id === U.shotId, s = M.status(sh), fr = sh.roles.filter(r => r.state === 'approved' || r.state === 'skipped').length;
      return `<div class="A-sh ${on ? 'on' : ''}"><div class="hd" data-act="pick" data-sh="${sh.id}" data-peek=""><span class="bar1 st-${s}"></span><b>${M.label(sc, j)}</b><span class="ac">${esc(sh.action)}</span>
        <span class="quiet">${sh.dur}s${sh.durSrc === 'you' ? '' : '~'} · fr ${fr}/${sh.roles.length} · ${sh.takes} take${sh.takes === 1 ? '' : 's'}${sh.stale ? ' <span class="sdot" style="display:inline-block"></span>' : ''}${sh.failed ? ' ✕' : ''}</span><span class="quiet">${STL[s]}</span></div>
        ${on ? shotWork(sh, sc, 'stack') : ''}</div>${j < a.length - 1 ? `<div class="A-conn"><button data-act="mergeA" data-sh="${sh.id}">merge with next</button> <button data-act="addAfter" data-sh="${sh.id}">+ shot here</button></div>` : ''}`;
    }).join('');
    const ret = sc.shots.filter(s => s.retired);
    return `${sceneHead(sc)}<div class="A-grid"><div class="A-pass"><div class="lbl">Master Narrative · scene ${sc.n}</div>${left}</div><div>${right}<div class="row2" style="margin-top:6px"><button data-act="addAfter" data-sh="${a[a.length - 1].id}">+ Add shot</button>${sc.proposals ? `<button class="pri" data-act="applyProp" data-sc="${sc.id}">${sc.proposals} proposals waiting: apply</button>` : ''}${ret.length ? `<span class="quiet">${ret.length} retired (kept, reachable)</span>` : ''}</div></div></div>`;
  },
};
V.A.acts.applyProp = d => M.acceptProposals(d.sc);

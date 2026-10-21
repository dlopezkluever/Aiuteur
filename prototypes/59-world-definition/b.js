// VARIANT B: "World board": one dense project-wide sheet. Coverage = PROJECT-WIDE COVERAGE WALL (all places x directions), bulk accept in one action.
VARIANTS.B = {
  name: 'World board · one sheet, project-wide coverage wall',
  render() {
    const rows = S.ents.filter(live);
    const ls = S.ents.filter((e) => isLoc(e) && live(e) && e.status !== 'deferred');
    const nMiss = ls.reduce((n, e) => n + missingDirs(e).length, 0), nDr = nDraft(ls), nPend = ls.reduce((n, e) => n + pendingOf(e).length, 0);
    const maxCols = Math.max(...ls.map((e) => e.dirs.length), 1);
    const types = Object.keys(TYPES).filter((t) => rows.some((e) => e.type === t));
    return `<div class="b-wrap">
    <div class="b-top"><div style="flex:1">${stylePanel()}</div></div>
    <div class="row" style="margin:16px 0 6px"><h3 style="margin:0;flex:1">Entities <span class="dim">· ${rows.length} found in the Master Narrative</span></h3><button class="btn sm" data-act="addMissed">+ Add missed</button><button class="btn pri sm" data-act="keepAll">Keep all unreviewed</button></div>
    <table class="btab"><thead><tr><th></th><th>Name</th><th>Description (pre-filled)</th><th>Needed by</th><th>Image</th><th>State</th><th></th></tr></thead>
    ${types.map((t) => `<tbody><tr class="grp"><td colspan="7">${TYPES[t]}</td></tr>${rows.filter((e) => e.type === t).map((e) => this.row(e)).join('')}</tbody>`).join('')}</table>
    <div class="row" style="margin:22px 0 6px"><h3 style="margin:0;flex:1">Coverage wall <span class="dim">· every place, every direction, in one view</span></h3>
      <button class="btn" data-act="allMissing" ${nMiss ? '' : 'disabled'}>Generate all missing · ${nMiss} images ${priceTag(nMiss)}</button>
      <button class="btn pri" data-act="acceptAll" ${nDr ? '' : 'disabled'}>Accept all ${nDr} drafts</button></div>
    <div class="whisper" style="margin-bottom:8px">${nPend ? `generating ${nPend}…` : 'The AI makes each place’s other directions from its establishing image. Review them together, accept in one action, fix single tiles afterwards. A place that needs only one image is a toggle on its row.'}</div>
    <div class="wall" style="--cols:${maxCols}">${ls.map((e) => `<div class="wrow"><div class="whead"><b>${esc(e.name)}</b><div class="dim">${readiness(e).t}</div><label class="row"><input type="checkbox" ${e.mode === 'single' ? 'checked' : ''} data-chg="modeTgl" data-id="${e.id}"> single image</label>${draftsOf(e).length ? `<button class="btn xs pri" data-act="acceptRow" data-id="${e.id}">Accept ${draftsOf(e).length}</button>` : ''}</div>${e.dirs.map((d) => (e.mode === 'single' && d.id !== 'est') ? '<div class="dir off"></div>' : dirTile(e, d)).join('')}</div>`).join('')}</div>
    </div>${finalizeBar()}`;
  },
  row(e) {
    const open = S.ui.open === e.id, r = readiness(e);
    const img1 = e.depth === 'lightweight' || !hero(e) ? `<span class="dim">${e.depth === 'lightweight' ? 'text only' : '—'}</span>` : `<div class="th">${tile(img(e, hero(e).seed))}</div>`;
    return `<tr class="${e.status} ${open ? 'open' : ''}"><td>${dot(r.c)}</td><td><b>${esc(e.name)}</b>${e.dupOf && e.status === 'proposed' ? `<div class="aitag">maybe same as ${esc(ent(e.dupOf).name)}</div>` : ''}${(e.aliases || []).length ? `<div class="whisper">also: ${e.aliases.map(esc).join(', ')}</div>` : ''}</td>
    <td><textarea rows="2" class="inl" data-inp="${e.id}.desc">${esc(e.desc)}</textarea></td><td>${e.scenes.map((s) => `<span class="sn">${s}</span>`).join('')}</td><td>${img1}</td>
    <td><select data-chg="stat" data-id="${e.id}">${['proposed', 'kept', 'deferred'].map((s) => `<option ${e.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
    <td><button class="btn xs" data-act="toggleOpen" data-id="${e.id}">${open ? 'Close' : 'More'}</button></td></tr>
    ${open ? `<tr class="more"><td></td><td colspan="6"><div class="row wrap" style="gap:18px;align-items:flex-start"><div>${e.depth === 'lightweight' ? '<span class="dim">Lightweight: no image needed.</span>' : attemptsStrip(e)}</div><div style="flex:1;min-width:260px">${actionsMenu(e)}<div style="margin-top:8px">${e.looks.length ? looksPanel(e) : ''}</div></div></div></td></tr>` : ''}`;
  },
};
ACTIONS.toggleOpen = ({ id }) => { S.ui.open = S.ui.open === id ? null : id; };
ACTIONS.stat = ({ id }, el) => { ent(id).status = el.value; };
const _cb = document.createElement('style');
_cb.textContent = `.b-wrap{padding:14px 22px}.btab{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e4e1d8}.btab th{text-align:left;font-size:11px;color:#8a857a;padding:6px 8px;border-bottom:1px solid #e4e1d8}.btab td{padding:6px 8px;vertical-align:top;border-bottom:1px solid #f0ede4}.btab .grp td{background:#f6f4ee;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#8a857a;padding:3px 8px}.btab tr.deferred td{opacity:.55}.btab tr.proposed td:nth-child(2){border-left:3px solid #d9c88a}.inl{width:100%;font-size:12px;border:1px solid transparent;resize:none}.inl:hover,.inl:focus{border-color:#ddd}.sn{display:inline-block;background:#eee9da;border-radius:4px;padding:0 5px;margin:1px;font-size:11px}.th{width:46px}.btab tr.more td{background:#fbfaf6}
.wall{display:flex;flex-direction:column;gap:10px}.wrow{display:grid;grid-template-columns:150px repeat(var(--cols),1fr);gap:8px;background:#fff;border:1px solid #e4e1d8;border-radius:8px;padding:8px;align-items:start}.whead{display:flex;flex-direction:column;gap:4px}.dir.off{min-height:20px}.wall .dlab .dim{display:none}.wall .row.wrap{gap:3px}`;
document.head.appendChild(_cb);

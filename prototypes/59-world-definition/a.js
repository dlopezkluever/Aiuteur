// VARIANT A: "Dossier": entity-by-entity workspace (V1 Stage 5 lineage). Coverage = FAN-OUT FROM ONE HERO, inside the Location.
VARIANTS.A = {
  name: 'Dossier · coverage fans out from one hero, per location',
  render() {
    const u = S.ui;
    const groups = Object.keys(TYPES).map((t) => ({ t, es: S.ents.filter((e) => e.type === t && live(e)) })).filter((g) => g.es.length);
    const nProp = S.ents.filter((e) => e.status === 'proposed').length;
    const list = `<div class="alist"><button class="btn ${u.reviewMode ? 'pri' : ''}" style="width:100%" data-act="openReview">Review what Aiuteur found${nProp ? ` (${nProp})` : ' ✓'}</button>
      ${groups.map((g) => `<div class="og2">${TYPES[g.t]}</div>${g.es.map((e) => { const r = readiness(e); return `<button class="arow ${!u.reviewMode && u.sel === e.id ? 'on' : ''}" data-act="sel" data-id="${e.id}">${dot(r.c)}<span>${esc(e.name)}</span><small>${e.status === 'proposed' ? 'new' : e.depth === 'lightweight' ? 'light' : ''}</small></button>`; }).join('')}`).join('')}
      <button class="btn sm" style="margin:10px" data-act="addMissed">+ Add something the extraction missed</button></div>`;
    return `<div class="a-wrap">${list}<div class="adetail">${u.reviewMode || !ent(u.sel) ? this.review() : this.detail(ent(u.sel))}</div></div>${finalizeBar()}`;
  },
  review() {
    const ps = S.ents.filter((e) => e.status === 'proposed');
    if (!ps.length) return `<h2>Everything found has been reviewed</h2><p class="dim">Pick anything in the list to define it further. Add what was missed with the button on the left.</p>${stylePanel()}`;
    return `<div class="row"><h2 style="flex:1">Aiuteur found ${ps.length} things in your Master Narrative</h2><button class="btn pri" data-act="keepAll">Keep all ${ps.filter((e) => !e.dupOf).length}</button></div>
    <p class="dim">Descriptions are pre-filled from everything the narrative says. Nothing here is a gate; decide now, or defer.</p>
    ${ps.map((e) => `<div class="rcard"><div class="rimg">${tile(img(e, 1))}</div><div style="flex:1"><div class="row"><b>${esc(e.name)}</b><span class="tag">${TYPE1[e.type]}</span><span class="dim">in scenes ${e.scenes.join(', ')}</span>${e.dupOf ? `<span class="aitag">looks like a duplicate of ${esc(ent(e.dupOf).name)}</span>` : ''}</div>
      <textarea rows="2" data-inp="${e.id}.desc">${esc(e.desc)}</textarea>
      <div class="row wrap"><button class="btn sm pri" data-act="setStatus" data-id="${e.id}" data-v="kept">Keep</button><button class="btn sm" data-act="setStatus" data-id="${e.id}" data-v="deferred">Defer</button>${e.dupOf ? `<button class="btn sm" data-act="doMerge" data-id="${e.id}" data-to="${e.dupOf}">Merge into ${esc(ent(e.dupOf).name)}</button>` : ''}<button class="btn sm" data-act="depth" data-id="${e.id}">${e.depth === 'lightweight' ? 'Lightweight ✓' : 'Keep lightweight'}</button></div></div></div>`).join('')}
    <div style="margin-top:14px">${stylePanel()}</div>`;
  },
  detail(e) {
    const u = S.ui, r = readiness(e);
    const tabs = [['identity', 'Identity'], ['looks', `Looks${e.looks.length ? ' (' + e.looks.length + ')' : ''}`]].concat(isLoc(e) ? [['coverage', 'Coverage']] : []);
    const scenes = `<div class="whisper">Needed by scenes ${e.scenes.join(', ')}. ${r.why}</div>`;
    let body = '';
    if (u.tab === 'looks') body = looksPanel(e);
    else if (u.tab === 'coverage' && isLoc(e)) body = this.coverage(e);
    else body = `<div class="row wrap" style="align-items:flex-start;gap:18px"><div style="flex:1;min-width:260px"><textarea rows="5" data-inp="${e.id}.desc">${esc(e.desc)}</textarea><div class="whisper">Compiled from ${e.scenes.length} scenes of the Master Narrative; your edits are never overwritten.</div></div><div>${e.depth === 'lightweight' ? '<p class="dim">Lightweight: generated from this text. No image needed. <button class="lnk2" data-act="depth" data-id="' + e.id + '">Add an image</button></p>' : attemptsStrip(e)}</div></div>`;
    return `<div class="row"><h2 style="flex:1;margin:0">${esc(e.name)} <span class="tag">${TYPE1[e.type]}</span> ${e.status === 'proposed' ? '<span class="tag">not reviewed</span>' : ''}${e.note ? '<span class="tag">added by you</span>' : ''}</h2>${dot(r.c)}<span class="dim">${r.t}</span></div>
    ${scenes}<div style="margin:10px 0">${actionsMenu(e)}</div><div class="tabs">${tabs.map(([k, n]) => `<button class="${u.tab === k ? 'on' : ''}" data-act="tab" data-v="${k}">${n}</button>`).join('')}</div><div class="tabbody">${body}</div>`;
  },
  coverage(e) {
    const miss = missingDirs(e), dr = draftsOf(e), pend = pendingOf(e);
    const single = e.mode === 'single';
    const heroTile = hero(e) ? tile(art(e.id, 'est', hero(e).seed)) : `<div class="empty2">No establishing image yet</div>`;
    const others = e.dirs.filter((d) => d.id !== 'est');
    return `<div class="row wrap" style="margin-bottom:8px"><b>Coverage</b><label class="row"><input type="checkbox" ${single ? 'checked' : ''} data-chg="modeTgl" data-id="${e.id}"> Just one image for this place</label><span class="whisper">${single ? 'A single establishing image is used for every shot here.' : 'Default: the AI makes the other directions from your establishing image; you review them together.'}</span></div>
    <div class="fan">
      <div class="hero"><div class="dim">1 · The hero</div>${heroTile}<div class="row wrap" style="margin-top:6px"><button class="btn sm" data-act="genAttempt" data-id="${e.id}">${hero(e) ? 'Another hero' : 'Generate hero'} ${priceTag(1)}</button><button class="btn sm" data-act="upload" data-id="${e.id}">Upload</button></div>${e.attempts.length > 1 ? `<div class="row">${e.attempts.map((a, i) => `<button class="att mini2 ${i === e.active ? 'on' : ''}" data-act="active" data-id="${e.id}" data-i="${i}">${tile(art(e.id, 'est', a.seed))}</button>`).join('')}</div>` : ''}</div>
      ${single ? '' : `<div class="arrow">${hero(e) ? `<button class="btn pri" data-act="fanOut" data-id="${e.id}" ${miss.length ? '' : 'disabled'}>${miss.length ? `Make the other ${miss.length} directions` : 'All directions made'}<br>${miss.length ? priceTag(miss.length) : ''}</button>` : '<span class="dim">approve a hero first</span>'}<div class="whisper">one click · ${miss.length ? 'no confirm, ' + money(miss.length * PRICE) : 'done'}</div></div>
      <div class="sheet"><div class="row"><span class="dim" style="flex:1">2 · Contact sheet: review them together</span>${dr.length ? `<button class="btn pri" data-act="acceptRow" data-id="${e.id}">Accept all ${dr.length}</button>` : ''}</div><div class="grid4">${others.map((d) => dirTile(e, d)).join('')}</div></div>`}
    </div>`;
  },
};
ACTIONS.openReview = () => { S.ui.reviewMode = true; };
ACTIONS.modeTgl = ({ id }, el) => { ent(id).mode = el.checked ? 'single' : 'multi'; };
const _css = document.createElement('style');
_css.textContent = `.a-wrap{display:flex;min-height:calc(100vh - 140px)}.alist{width:230px;border-right:1px solid #e4e1d8;padding:10px 0;flex:none;background:#fdfcf9}.alist>.btn{margin:0 10px;width:calc(100% - 20px)!important}.og2{padding:10px 14px 2px;font-size:10px;color:#8a857a;letter-spacing:.08em;text-transform:uppercase}.arow{display:flex;width:100%;border:0;background:none;text-align:left;padding:5px 14px;cursor:pointer;font:inherit;align-items:center}.arow span{flex:1}.arow small{color:#a08a3a}.arow.on{background:#ebe8dd;font-weight:600}.adetail{flex:1;padding:16px 24px;min-width:0}
.rcard{display:flex;gap:12px;border:1px solid #e4e1d8;background:#fff;border-radius:8px;padding:10px;margin:8px 0}.rimg{width:80px;flex:none}.rimg .tile{aspect-ratio:1}.tabbody{padding:12px 0}.fan{display:flex;gap:14px;align-items:flex-start}.hero{width:210px;flex:none}.empty2{aspect-ratio:8/5;border:1.5px dashed #c9c4b6;display:grid;place-items:center;color:#aaa;font-size:12px;border-radius:5px}.arrow{width:130px;text-align:center;flex:none;padding-top:34px}.arrow .btn{width:100%}.sheet{flex:1;min-width:0}.grid4{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:6px}.mini2{width:46px!important}.lnk2{background:none;border:0;color:#2f6e8a;text-decoration:underline;cursor:pointer;font:inherit}`;
document.head.appendChild(_css);

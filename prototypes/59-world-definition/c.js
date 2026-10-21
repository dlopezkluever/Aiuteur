// VARIANT C: "Scene-led": the world is organised by the story. Coverage = JUST-ENOUGH, NEEDED-FIRST (only directions scenes call for; rest is "complete the room" later).
VARIANTS.C = {
  name: 'Scene-led · coverage only for what the story needs',
  render() {
    const u = S.ui;
    if (u.scene == null && u.sel && !u.all) return this.entity(ent(u.sel));
    const pills = `<div class="cpills">${S.scenes.map((s) => `<button class="pill ${u.scene === s.n && !u.all ? 'on' : ''}" data-act="cscene" data-n="${s.n}">${s.n}</button>`).join('')}<button class="pill ${u.all ? 'on' : ''}" data-act="call">All found (${S.ents.filter(live).length})</button></div>`;
    return `<div class="c-wrap">${pills}${u.all ? this.all() : this.scene(u.scene || 1)}</div>${finalizeBar()}`;
  },
  all() {
    return `<h3>Everything found in the story</h3><div class="row wrap">${S.ents.filter(live).map((e) => `<button class="chip" data-act="sel" data-id="${e.id}">${dot(readiness(e).c)}${esc(e.name)}</button>`).join('')}<button class="btn sm" data-act="addMissed">+ Add something missed</button><button class="btn sm pri" data-act="keepAll">Keep everything found</button></div><div style="margin-top:14px">${stylePanel()}</div>
    <h3>Coverage across the whole story</h3>${this.projCoverage()}`;
  },
  projCoverage() {
    const ls = S.ents.filter((e) => isLoc(e) && live(e) && e.status !== 'deferred');
    const need = ls.reduce((n, e) => n + neededMissing(e).length, 0), all = ls.reduce((n, e) => n + missingDirs(e).length, 0), dr = nDraft(ls);
    return `<div class="row wrap"><button class="btn pri" data-act="allNeeded" ${need ? '' : 'disabled'}>Cover what the story needs · ${need} images ${priceTag(need)}</button><button class="btn pri" data-act="acceptAll" ${dr ? '' : 'disabled'}>Accept all ${dr} drafts</button><span class="whisper">${all - need} further directions exist but no scene calls for them yet (shown dashed). Complete a room whenever you like.</span></div>`;
  },
  scene(n) {
    const { scene, loc, cast, props } = sceneNeeds(n);
    const text = scene.text.replace(/\b(MARCUS HALE|MARCUS|ELENA VOSS|ELENA|FOREMAN|DOCKWORKERS|HARBOUR OFFICE|FERRY DECK|HALE KITCHEN|COMPASS|LEDGER|LIGHTHOUSE|Mr\. Hale)\b/g, (m) => `<mark>${m}</mark>`);
    const mine = loc.dirs.filter((d) => d.id === 'est' || d.needed.includes(n));
    const rest = loc.dirs.filter((d) => !mine.includes(d));
    const nm = neededMissing(loc).filter((d) => mine.includes(d)), dr = draftsOf(loc);
    return `<div class="cgrid"><div>
      <h3 style="margin-top:0">Scene ${n}: ${esc(scene.title)} <span class="dim">needs</span></h3>
      <div class="ccard"><div class="row"><b style="flex:1">Setting · ${esc(loc.name)}</b><button class="btn xs" data-act="sel" data-id="${loc.id}">Open</button></div>
        ${loc.status === 'proposed' ? this.quick(loc) : ''}
        <div class="mode row"><label class="row"><input type="checkbox" ${loc.mode === 'single' ? 'checked' : ''} data-chg="modeTgl" data-id="${loc.id}"> This place only needs one image</label></div>
        <div class="grid3">${(loc.mode === 'single' ? [loc.dirs[0]] : mine).map((d) => dirTile(loc, d, { needs: true })).join('')}</div>
        <div class="row wrap" style="margin-top:8px">${loc.mode === 'multi' ? `<button class="btn sm pri" data-act="fanScene" data-id="${loc.id}" data-n="${n}" ${nm.length ? '' : 'disabled'}>Cover what this scene needs · ${nm.length} ${priceTag(nm.length)}</button>` : ''}${dr.length ? `<button class="btn sm pri" data-act="acceptRow" data-id="${loc.id}">Accept ${dr.length} drafts</button>` : ''}</div>
        ${loc.mode === 'multi' && rest.length ? `<div class="dim" style="margin-top:8px">Not needed by any scene yet: ${rest.map((d) => `<span class="ghost">${esc(d.label)}${d.view ? ' ✓' : ''}</span>`).join(' ')} <button class="lnk2" data-act="fanOut" data-id="${loc.id}">Complete the room (${missingDirs(loc).length - nm.length} more) ${priceTag(Math.max(0, missingDirs(loc).length - nm.length))}</button></div>` : ''}
      </div>
      <h4>Cast &amp; things</h4>${cast.concat(props).map((e) => this.card(e, n)).join('')}
    </div><div><h4 style="margin-top:0">From the Master Narrative</h4><div class="ntext">${text}</div><div class="whisper">Highlighted names are Mentions the entities were derived from. Click a name to define it.</div>
      ${this.projCoverage()}</div></div>`;
  },
  quick(e) { return `<div class="row"><span class="aitag">found, not reviewed</span><button class="btn xs pri" data-act="setStatus" data-id="${e.id}" data-v="kept">Keep</button><button class="btn xs" data-act="setStatus" data-id="${e.id}" data-v="deferred">Defer</button></div>`; },
  card(e, n) {
    const r = readiness(e), look = e.looks.find((l) => l.state !== 'dismissed');
    return `<div class="ccard slim"><div class="th2">${tile(img(e, hero(e) ? hero(e).seed : 1))}</div><div style="flex:1"><div class="row"><button class="lnk2" data-act="sel" data-id="${e.id}"><b>${esc(e.name)}</b></button><span class="tag">${TYPE1[e.type]}</span>${dot(r.c)}<span class="dim">${r.t}</span></div><div class="dim">${esc(e.desc.slice(0, 96))}…</div>${look && e.scenes.includes(n) && look.from.includes(String(n)) ? `<div class="whisper">Look proposed here: ${esc(look.name)} (${esc(look.extent)})</div>` : ''}${e.status === 'proposed' ? this.quick(e) : ''}</div></div>`;
  },
  entity(e) {
    const r = readiness(e), u = S.ui;
    return `<div class="c-wrap"><button class="lnk2" data-act="cback">← Back to the scene</button><div class="row"><h2 style="flex:1">${esc(e.name)} <span class="tag">${TYPE1[e.type]}</span></h2>${dot(r.c)}<span class="dim">${r.t}</span></div><div class="whisper">Needed by scenes ${e.scenes.join(', ')}. ${r.why}</div><div style="margin:10px 0">${actionsMenu(e)}</div>
    <div class="row wrap" style="gap:20px;align-items:flex-start"><div style="flex:1;min-width:280px"><textarea rows="5" data-inp="${e.id}.desc">${esc(e.desc)}</textarea><h4>Looks</h4>${looksPanel(e)}</div><div>${e.depth === 'lightweight' ? '<span class="dim">Lightweight: no image needed.</span>' : attemptsStrip(e)}${isLoc(e) ? `<h4>Coverage</h4><div class="grid3" style="width:520px">${activeDirs(e).map((d) => dirTile(e, d, { needs: true })).join('')}</div>` : ''}</div></div></div>${finalizeBar()}`;
  },
};
ACTIONS.cscene = ({ n }) => { S.ui.scene = +n; S.ui.all = false; S.ui.sel = null; };
ACTIONS.call = () => { S.ui.all = true; S.ui.scene = null; };
ACTIONS.cback = () => { S.ui.sel = null; S.ui.scene = S.ui.scene || 3; S.ui.all = false; };
// entity selection from this variant should leave scene context
const _sel = ACTIONS.sel; ACTIONS.sel = (d) => { _sel(d); S.ui.all = false; };
const _cc = document.createElement('style');
_cc.textContent = `.c-wrap{padding:14px 22px}.cpills{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap}.cgrid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:26px}.ccard{border:1px solid #e4e1d8;background:#fff;border-radius:9px;padding:10px 12px;margin:8px 0;display:flex;flex-direction:column;gap:6px}.ccard.slim{flex-direction:row;gap:10px}.th2{width:54px;flex:none}.th2 .tile{aspect-ratio:1}.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.ghost{border:1px dashed #c9c4b6;border-radius:4px;padding:0 6px;font-size:11.5px}.ntext{background:#fff;border:1px solid #e4e1d8;border-radius:8px;padding:12px;line-height:1.7}mark{background:#f0e7c0;border-radius:3px;padding:0 2px}.lnk2{background:none;border:0;color:#2f6e8a;text-decoration:underline;cursor:pointer;font:inherit;padding:0}`;
document.head.appendChild(_cc);

ACTIONS.fanScene = ({ id, n }) => { const e = ent(id), w = neededMissing(e).filter((d) => d.id === 'est' || d.needed.includes(+n)); spend(w.length, `Cover what scene ${n} needs: ${e.name}`, () => fanOut(e, w)); };

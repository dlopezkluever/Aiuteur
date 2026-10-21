// shared coverage tile (a component, not a layout)
function dirTile(e, d, o = {}) {
  const v = dirView(e, d);
  const st = d.id === 'est' ? (v ? 'accepted' : 'empty') : v ? v.state : 'empty';
  const body = st === 'empty' ? `<div class="empty">${d.skipped ? 'skipped' : 'not made yet'}</div>` : tile(art(e.id, d.id, v.seed)) + (st === 'pending' ? '<div class="shim">generating…</div>' : '');
  const acts = d.id === 'est' ? (st === 'empty' ? '' : '<span class="dim">identity image</span>') : `<button class="btn xs" data-act="regen" data-id="${e.id}" data-d="${d.id}">${st === 'empty' ? 'Make' : 'Redo'} ${priceTag(1)}</button><button class="btn xs" data-act="uploadView" data-id="${e.id}" data-d="${d.id}">Upload</button><button class="btn xs" data-act="skipDir" data-id="${e.id}" data-d="${d.id}">${d.skipped ? 'Restore' : 'Skip'}</button>`;
  const need = o.needs && d.needed.length ? `<div class="whisper">needed by scene${d.needed.length > 1 ? 's' : ''} ${d.needed.join(', ')}</div>` : '';
  return `<div class="dir ${st} ${d.skipped ? 'skipped' : ''}"><div class="dthumb">${body}${st === 'draft' ? '<span class="badge">draft</span>' : ''}</div><div class="dlab"><b>${esc(d.label)}</b><div class="dim">${esc(d.desc)}</div>${need}</div>${o.noacts ? '' : `<div class="row wrap">${acts}</div>`}</div>`;
}

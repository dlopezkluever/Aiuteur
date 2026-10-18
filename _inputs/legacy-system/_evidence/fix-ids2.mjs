import fs from 'node:fs';
const rd = (p) => fs.readFileSync(p, 'utf8').trim().split('\n').map(JSON.parse);
const M4 = rd('merged4/merged.jsonl');
const key = (e) => e.reporter + '|' + e.lid;
const idOf = new Map(M4.map((e) => [key(e), e.id]));
const byId4 = new Map(M4.map((e) => [e.id, e]));
const mapFrom = (file) => { const m = {}; const byIdOld = new Map(); for (const e of rd(file)) { const n = idOf.get(key(e)); if (n && n !== e.id) m[e.id] = n; byIdOld.set(e.id, e); } return { m, byIdOld }; };
const buggy = mapFrom('merged2-buggy/merged.jsonl');
const wrong = mapFrom('merged3-wrong/merged.jsonl');
const tok = (s) => new Set((s || '').toLowerCase().match(/[a-z_]{5,}/g) || []);
const D = '/home/user/workspace/repo/._docs/code-archaeology/';
const re = /WD-IMPL-[A-Z]+-\d{4}/g;
const stats = {};
for (const f of fs.readdirSync(D).filter((x) => /^(0[1346-9]|1[0-6])/.test(x) && x.endsWith('.md'))) {
  const lines = fs.readFileSync(D + f, 'utf8').split('\n');
  let changed = 0;
  const out = lines.map((l) => l.replace(re, (id) => {
    if (f.startsWith('16-')) { const t = wrong.m[id]; if (t) { changed++; return t; } return id; }
    if (f.startsWith('14-')) { const t = buggy.m[id]; if (t) { changed++; return t; } return id; }
    const t = buggy.m[id]; if (!t) return id;
    const a = byId4.get(id), b = buggy.byIdOld.get(id); if (!a || !b) return id;
    const lt = tok(l);
    const ov = (e) => { let c = 0; for (const w of tok(e.title + ' ' + e.summary)) if (lt.has(w)) c++; return c; };
    if (ov(b) > ov(a) + 1) { changed++; return t; }
    return id;
  }));
  fs.writeFileSync(D + f, out.join('\n'));
  stats[f] = changed;
}
console.log(stats);

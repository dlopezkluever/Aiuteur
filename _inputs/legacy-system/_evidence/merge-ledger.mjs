import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];
const outDir = process.argv[3];
const PREFIX = {
  CAP: 'WD-IMPL-CAP', AI: 'WD-IMPL-AI', STATE: 'WD-IMPL-STATE', INV: 'WD-IMPL-INVALIDATE',
  FACT: 'WD-IMPL-FACT', PROV: 'WD-IMPL-PROV', TABLE: 'WD-IMPL-TABLE', DEAD: 'WD-IMPL-DEAD',
  PRESSURE: 'WD-IMPL-PRESSURE', TEST: 'WD-IMPL-TEST', ROUTE: 'WD-IMPL-ROUTE', ENTITY: 'WD-IMPL-ENTITY',
};
const ORDER = ['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10', 'C', 'E', 'H', 'I', 'J', 'K', 'L', 'R1a', 'R1b', 'M', 'PK1', 'PK2', 'PK3', 'PK4', 'PK5', 'PK6', 'PK7'];
const fkey = (f) => f.match(/^(PK\d+|R1[ab]|V\d+|[A-Z])(?=[-.])/)[1];
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.ledger.jsonl'))
  .sort((a, b) => ORDER.indexOf(fkey(a)) - ORDER.indexOf(fkey(b)));

const entries = [];
const bad = [];
for (const f of files) {
  fs.readFileSync(path.join(dir, f), 'utf8').split('\n').forEach((line, i) => {
    if (!line.trim()) return;
    try {
      const o = JSON.parse(line);
      o._src = fkey(f);
      entries.push(o);
    } catch (e) { bad.push(`${f}:${i + 1}`); }
  });
}

const norm = (s) => String(s || '').toLowerCase().replace(/^.*?(backend\/src\/|src\/)/, '$1').replace(/\s+/g, '');
const counters = {};
const byAiKey = new Map();
const lidToGid = {};
const merged = [];
for (const e of entries) {
  const kind = PREFIX[e.kind] ? e.kind : 'FACT';
  if (kind === 'AI' && e.callsite) {
    const k = norm(e.callsite);
    if (byAiKey.has(k)) {
      const m = byAiKey.get(k);
      m.sources.push(e.lid);
      lidToGid[e._src + '|' + e.lid] = m.id; lidToGid[e.lid] = lidToGid[e.lid] || m.id;
      (m.evidence ||= []).push(...(e.evidence || []).filter((x) => !m.evidence.includes(x)));
      m.alt_views = (m.alt_views || []).concat([{ lid: e.lid, summary: e.summary, notes: e.notes }]);
      continue;
    }
  }
  counters[kind] = (counters[kind] || 0) + 1;
  const id = `${PREFIX[kind]}-${String(counters[kind]).padStart(4, '0')}`;
  const m = { id, ...e, sources: [e.lid] };
  delete m._src;
  m.reporter = e._src;
  lidToGid[e._src + '|' + e.lid] = id; lidToGid[e.lid] = lidToGid[e.lid] || id;
  if (kind === 'AI' && e.callsite) byAiKey.set(norm(e.callsite), m);
  merged.push(m);
}
for (const m of merged) {
  if (Array.isArray(m.related)) m.related = [...new Set(m.related.map((r) => lidToGid[m.reporter + '|' + r] || lidToGid[r] || r))];
}
const r2p = path.join(dir, 'R2-ai-canonical.json');
const retired = {};
if (fs.existsSync(r2p)) {
  const groups = JSON.parse(fs.readFileSync(r2p, 'utf8'));
  const byId = new Map(merged.map((m) => [m.id, m]));
  for (const g of groups) {
    const prim = byId.get(g.primary);
    if (!prim) continue;
    prim.canonical_title = g.canonical_title;
    for (const mid of g.members) {
      if (mid === g.primary) continue;
      const mm = byId.get(mid);
      if (!mm) continue;
      prim.sources.push(...mm.sources);
      prim.alt_views = (prim.alt_views || []).concat([{ id: mid, lid: mm.lid, summary: mm.summary, notes: mm.notes }]);
      prim.evidence = [...new Set([...(prim.evidence || []), ...(mm.evidence || [])])];
      retired[mid] = g.primary;
      lidToGid[mm.lid] = g.primary;
      for (const sl of mm.sources) lidToGid[sl] = g.primary;
      mm._drop = true;
    }
  }
}
const CORR = {
  'V6-FACT-07': 'CONTRADICTED in part by R1a-FACT-10: beat keys DO match stored Stage 3 content; only the treatment keys mismatch',
  'V8-DEAD-05': 'K contradicted this, but lead re-check REFUTES K: the unlock route rejects stage <7 or >12 (sceneStageLocks.ts:151-153) and the cascade loop runs s=stage+1..12 (:189-193,245-249), so Stage 7 is never in the downstream set; no reachable producer of Stage 7 outdated found. Wave-1 finding stands.',
  'K-FACT-01': 'K verdict on DEAD-0031 is wrong (see correction on V8-DEAD-05)',
  'V6-CAP-31': 'CORRECTED by R1b: only Stage 7 shot extraction writes transformation_flags',
  'E-FACT-19': 'CONTRADICTED by I: module-scope service construction makes a missing GOOGLE_AI_API_KEY a boot failure, not a per-route 500',
  'E-AI-48': 'CONTRADICTED by R2: code does not add an isolation sentence to the transformation post-image prompt',
};
for (const m of merged) { const c = CORR[m.lid]; if (c) { m.labels = [...new Set([...(m.labels || []), 'CONTRADICTED'])]; m.correction = c; } }
const finalMerged = merged.filter((m) => !m._drop);
merged.length = 0; merged.push(...finalMerged);
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'retired-ids.json'), JSON.stringify(retired, null, 1));
fs.writeFileSync(path.join(outDir, 'merged.jsonl'), merged.map((m) => JSON.stringify(m)).join('\n') + '\n');
fs.writeFileSync(path.join(outDir, 'lid-map.json'), JSON.stringify(lidToGid, null, 1));
const byFile = {};
for (const m of merged.filter((x) => x.kind === 'AI')) {
  const f = norm(m.callsite).split(':')[0];
  (byFile[f] ||= []).push(`${m.id} ${m.callsite} [${m.sources.join(',')}]`);
}
fs.writeFileSync(path.join(outDir, 'ai-by-file.txt'), Object.entries(byFile).sort().map(([f, l]) => `## ${f}\n${l.join('\n')}`).join('\n\n') + '\n');
console.log(JSON.stringify({ files: files.length, entries: entries.length, merged: merged.length, counters, bad }, null, 1));

import fs from 'node:fs';
import path from 'node:path';
const A = '/home/user/workspace/repo/.amp/in/archaeology';
const OUT = '/home/user/workspace/repo/._docs/code-archaeology';
const L = fs.readFileSync(`${A}/merged4/merged.jsonl`, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const retired = JSON.parse(fs.readFileSync(`${A}/merged4/retired-ids.json`, 'utf8'));
for (const e of L) if (Array.isArray(e.related)) e.related = [...new Set(e.related.map((r) => retired[r] || r))];

// product-intent relations (late coverage check)
const rel = {}; // impl id -> [{ideas, relation, cluster}]
const relFiles = fs.readdirSync(`${A}/reports`).filter((f) => /^PK\d+-relations\.jsonl$/.test(f));
let clusters = 0;
for (const f of relFiles) for (const line of fs.readFileSync(`${A}/reports/${f}`, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  let o; try { o = JSON.parse(line); } catch { continue; }
  clusters++;
  for (let id of o.impl_ids || []) { id = retired[id] || id; (rel[id] ||= []).push({ ideas: o.idea_ids || [], relation: o.relation, cluster: o.cluster }); }
}
const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
const flagStr = (f) => f ? ['present', 'reachable', 'functional', 'persisted', 'tested'].map((k) => `${k[0].toUpperCase()}=${f[k] ?? '?'}`).join(' ') : '-';
const arr = (x) => Array.isArray(x) ? x.join('; ') : (x ?? '');
const ideaStr = (id) => (rel[id] || []).map((r) => `${r.relation}: ${r.ideas.slice(0, 12).join(',')}${r.ideas.length > 12 ? `,+${r.ideas.length - 12}` : ''}`).join(' || ');

const AREA = { V1: 'Application shell, projects, stage state', V2: 'Style capsules and global asset library', V3: 'Writing: input, treatment, beats, script, scenes', V4: 'Streamline intake', V5: 'Project assets (Stage 5)', V6: 'Scene assets, Stage 8, transformations', V7: 'Continuity and locations', V8: 'Shots (Stage 7) and shot-asset assignments', V9: 'Prompts and frames (Stages 9, 10)', V10: 'Confirmation, video, credits (Stages 11, 12)', C: 'Database', E: 'AI infrastructure', H: 'State machines', I: 'Infrastructure', J: 'Tests', K: 'Dead code', L: 'Pressure' };
const caps = L.filter((e) => e.kind === 'CAP');
let md = `# 02 Functional capabilities\n\nCanonical inventory of ${caps.length} user-visible capabilities (\`WD-IMPL-CAP-*\`) established from current code. Generated mechanically from the unified ledger (\`17-IMPLEMENTATION-LEDGER.md\`); each entry was written by the reporter owning that slice and checked in later waves. Status flags: P=PRESENT, R=REACHABLE, F=FUNCTIONAL, S=PERSISTED, T=TESTED; values Y (yes), N (no), P (partial), U (unknown). Entries carrying a \`correction\` were contradicted or refined by a later reporter; the correction wins. Related product-intent ids (\`WD-IDEA-*\`) come only from the late coverage check and never imply that the code implements the idea.\n\nReading notes: workflow narratives are in 03-USER-WORKFLOWS.md; the AI calls referenced here are in 09-AI-AND-PROMPT-SYSTEM.md; state rules in 10-VERSIONING-LOCKING-AND-INVALIDATION.md; unreachable code in 14-DEAD-PARTIAL-AND-DUPLICATED.md.\n\n`;
const sum = {};
for (const c of caps) { const f = c.flags || {}; for (const k of ['reachable', 'functional', 'persisted', 'tested']) { sum[k] ||= {}; sum[k][f[k] ?? '?'] = (sum[k][f[k] ?? '?'] || 0) + 1; } }
md += `## Status summary\n\n| flag | ${['Y', 'P', 'N', 'U', '?'].join(' | ')} |\n|---|---|---|---|---|---|\n` + Object.entries(sum).map(([k, v]) => `| ${k} | ${['Y', 'P', 'N', 'U', '?'].map((x) => v[x] || 0).join(' | ')} |`).join('\n') + '\n\n';
const byRep = {};
for (const c of caps) (byRep[c.reporter] ||= []).push(c);
md += `## Index by area\n\n` + Object.keys(byRep).map((r) => `- ${AREA[r] || r}: ${byRep[r].length} (${byRep[r][0].id} to ${byRep[r][byRep[r].length - 1].id})`).join('\n') + '\n';
for (const [r, list] of Object.entries(byRep)) {
  md += `\n## ${AREA[r] || r}\n`;
  for (const c of list) {
    md += `\n### ${c.id} ${c.title}\n`;
    md += `- Behavior: ${c.summary}\n`;
    md += `- Trigger / entrypoint: ${esc(arr(c.entrypoint))}\n- Preconditions: ${esc(arr(c.preconditions))}\n- Code path: ${esc(arr(c.code_path))}\n- Data touched: ${esc(arr(c.data_touched))}\n- Downstream effects: ${esc(arr(c.downstream))}\n`;
    md += `- Status: ${flagStr(c.flags)}${(c.labels || []).length ? ` | labels: ${c.labels.join(', ')}` : ''}\n`;
    md += `- Evidence: ${esc(arr(c.evidence))}\n`;
    if (c.notes) md += `- Notes: ${esc(c.notes)}\n`;
    if (c.correction) md += `- CORRECTION: ${esc(c.correction)}\n`;
    if (c.related?.length) md += `- Related: ${c.related.join(', ')}\n`;
    if (rel[c.id]) md += `- Related product intent: ${ideaStr(c.id)}\n`;
  }
}
fs.writeFileSync(`${OUT}/02-FUNCTIONAL-CAPABILITIES.md`, md);

// 17 ledger
const ORDERK = ['CAP', 'AI', 'STATE', 'INV', 'ENTITY', 'TABLE', 'ROUTE', 'PROV', 'FACT', 'DEAD', 'PRESSURE', 'TEST'];
let led = `# 17 Implementation ledger\n\nFlat inventory of every verified implementation finding (\`WD-IMPL-*\`): ${L.length} entries. Machine-friendly: one line per entry, fields separated by \` | \`, escaped pipes. Lossless JSON companion: \`17-IMPLEMENTATION-LEDGER.jsonl\` (same ids, all fields, including kind-specific AI/STATE/INV fields). \`WD-IDEA-*\` ids always refer to the product-knowledge corpus and appear only in the last column as relations from the late coverage check (EXACT_MATCH, PARTIAL_MATCH, NOT_IMPLEMENTED, CONTRADICTED_BY_CODE, UNKNOWN). \`WD-IMPL-*\` ids are evidence from code.\n\nLine format: \`ID | reporter | flags (P=present R=reachable F=functional S=persisted T=tested) | labels | title | summary | evidence | related impl ids | related idea relations | correction\`.\n\nReporter codes: V1..V10 vertical slices (shell, style/library, narrative, streamline, project assets, scene assets, continuity/locations, shots, prompts/frames, video/checkout), C database, E AI registry, H state/invalidation, I infrastructure, J tests, K dead code, L pressure, R1a/R1b contradiction verification, M lead additions, PKn product-knowledge coverage facts.\n\nRetired duplicate ids (AI entries folded into a canonical call): ${Object.keys(retired).length}. Map: \`${Object.entries(retired).map(([a, b]) => `${a}->${b}`).join(', ')}\`.\n`;
for (const k of ORDERK) {
  const list = L.filter((e) => e.kind === k);
  if (!list.length) continue;
  led += `\n## ${k} (${list.length})\n\n`;
  for (const e of list) led += [e.id, e.reporter, flagStr(e.flags), (e.labels || []).join(','), esc(e.title), esc(e.summary), esc(arr(e.evidence)), (e.related || []).join(','), esc(ideaStr(e.id)), esc(e.correction || '')].join(' | ') + '\n';
}
const unk = L.filter((e) => !ORDERK.includes(e.kind));
fs.writeFileSync(`${OUT}/17-IMPLEMENTATION-LEDGER.md`, led);
fs.writeFileSync(`${OUT}/17-IMPLEMENTATION-LEDGER.jsonl`, L.map((e) => JSON.stringify({ ...e, product_intent_relations: rel[e.id] || [] })).join('\n') + '\n');
console.log({ caps: caps.length, total: L.length, clusters, unk: unk.length, capLines: md.split('\n').length, ledLines: led.split('\n').length });

// crosswalk
const rows = [];
for (const f of relFiles) for (const line of fs.readFileSync(`${A}/reports/${f}`, 'utf8').split('\n')) { if (!line.trim()) continue; try { const o = JSON.parse(line); rows.push({ ...o, pk: f.slice(0, 3) }); } catch {} }
const cnt = {}; for (const r of rows) cnt[r.relation] = (cnt[r.relation] || 0) + (r.idea_ids || []).length;
let x = `# 18 Product-intent crosswalk (late coverage check)\n\nSupporting artifact. The product-knowledge corpus (\`._docs/product-knowledge/\`, 1,885 \`WD-IDEA-*\` ideas) was used ONLY as a search checklist after the code model was built. Every idea id is assigned to exactly one concept cluster below with the relation the CODE has to it. \`WD-IDEA-*\` ids are product intent and never evidence; \`WD-IMPL-*\` ids are code evidence. Legacy \`impl\` tags were ignored. Relation vocabulary: EXACT_MATCH, PARTIAL_MATCH, NOT_IMPLEMENTED (searched, nothing found), CONTRADICTED_BY_CODE, UNKNOWN (static analysis cannot settle).\n\n## Totals (ideas)\n\n| relation | ideas |\n|---|---|\n` + Object.entries(cnt).sort().map(([k, v]) => `| ${k} | ${v} |`).join('\n') + `\n\nClusters: ${rows.length}. Coverage reports with missed-concept lists: \`_evidence/reports/PK1-coverage.md\` to \`PK7-coverage.md\`.\n`;
const byPk = {}; for (const r of rows) (byPk[r.pk] ||= []).push(r);
for (const [pk, list] of Object.entries(byPk)) {
  x += `\n## ${pk} clusters\n\n| cluster | relation | ideas | impl ids | code evidence | note |\n|---|---|---|---|---|---|\n`;
  for (const r of list) x += `| ${esc(r.cluster)} | ${r.relation} | ${(r.idea_ids || []).join(', ')} | ${(r.impl_ids || []).map((i) => retired[i] || i).join(', ')} | ${esc((r.code_evidence || r.searched || []).slice(0, 4).join('; '))} | ${esc(r.note)} |\n`;
}
fs.writeFileSync(`${OUT}/18-PRODUCT-INTENT-CROSSWALK.md`, x);
console.log('crosswalk', rows.length, cnt);

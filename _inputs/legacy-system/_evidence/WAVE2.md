# Wave 2 addendum (read after BRIEF.md)

Wave 1 (12 reporters V1..V10, C, E) is complete. Their narratives are in `reports/*.md`; their ledgers are `reports/*.ledger.jsonl`; the merged ledger with provisional global ids is `merged/merged.jsonl` (one JSON per line; fields `id`, `kind`, `title`, `summary`, `evidence`, `reporter`, ...). Query it with jq, e.g.
`jq -c 'select(.kind=="INV") | {id,title,summary,evidence}' merged/merged.jsonl`.
All paths here are relative to `/home/user/workspace/repo/.amp/in/archaeology/`; the repo is `/home/user/workspace/repo`.

Wave 1 claims are LEADS, not truth. Your job is to use them as a map, then verify against code (read the cited file:line yourself) before restating them. When you restate a wave-1 finding, cite its provisional id (e.g. `WD-IMPL-INVALIDATE-0012`) AND the code evidence you checked. Mark claims you did not re-check as `(wave1-unverified)`.
Do not redo wave 1 slices. Add what wave 1 could not see: cross-slice synthesis, whole-repo greps, claims that need a second reading.

Same hard rules as BRIEF.md: read-only on the repo; ignore `._docs/**`; no recommendations, no "should"; write only to `reports/`. Your ledger lids use your own prefix (e.g. `H-INV-01`). Same schema and `jq -c .` validation. Write files incrementally (a ledger line as soon as you have it) so partial work survives interruptions. Final reply <=150 words: files written, counts per kind, top 3 surprises, what you did not inspect.

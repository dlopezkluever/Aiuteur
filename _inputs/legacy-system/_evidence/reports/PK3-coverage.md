# PK3 coverage: WD-IDEA-CONT (continuity, state, and context ideas)

Scope: every WD-IDEA-CONT id in `._docs/product-knowledge/15-FULL-IDEA-LEDGER.md` (the legacy catalogue, used as a search checklist only). Code evidence is from `backend/src`, `src`, `backend/migrations`, `backend/scripts` and `backend/quickies-sql`. Archaeology evidence is cited as WD-IMPL ids from `merged2/merged.jsonl`. Relations are in `PK3-relations.jsonl`; new FACT entries are in `PK3.ledger.jsonl`.

## Count reconciliation

- The brief says 285 ideas. The ledger defines **235** CONT ids (one bullet line each, no duplicates). The id range is WD-IDEA-CONT-001 to 247 with 12 unused numbers: 036, 039, 040, 041, 077, 190, 195, 196, 207, 208, 236, 237. Every defined id is clustered; none is left unclustered.
- Clusters: **154**. Every idea id appears in exactly one cluster (checked by script: 0 missing, 0 duplicated, 0 unknown).

## Relation totals

| Relation | Clusters | Ideas |
|---|---|---|
| EXACT_MATCH | 39 | 52 |
| PARTIAL_MATCH | 64 | 102 |
| NOT_IMPLEMENTED | 40 | 69 |
| CONTRADICTED_BY_CODE | 6 | 6 |
| UNKNOWN | 5 | 6 |
| **Total** | **154** | **235** |

Contradicted: 002 (non-active scene text reaches shot extraction), 011 (no centralised context injection), 027 (creative edits at media stages), 068 (mid-scene changes pre-defined upstream), 082 (references trusted from a prompt-time list), 238 (removed scenes are deleted, not marked broken).

## Concepts the archaeology missed or stated incorrectly

These are not in merged2, or merged2 says something different. All are verified in code and recorded as FACT entries.

1. **Scene end-state columns have no writer.** `scenes.end_state_summary` and `scenes.end_frame_thumbnail_url` are read in six places and written nowhere (PK3-FACT-01). For scenes 2 and later, shot extraction therefore gets the text "No previous scene (this is the first scene)." (shotExtractionService.ts:156). merged2 TABLE-0010 lists the columns without this finding.
2. **Two ContextManager methods are dead.** `assembleLocalContext` and `formatPromptGenerationContext` have no production caller. This includes the asset truncation logic. DEAD-0010 covers only `prepareStageContext` and `assembleFullContext` (PK3-FACT-02).
3. **Ask Auteur facts are not injected by the live template route.** `/api/llm/generate-from-template` loads them but copies only the capsule and beat sheet into prompt variables (PK3-FACT-03). FACT-0043 says the facts are absent from Stage 2 to 4 prompts; this entry gives the route-level reason.
4. **Stage 4 says removed scenes become `continuity_broken`.** Code hard-deletes them (projects.ts:1424-1440), and no writer of that status exists (PK3-FACT-04).
5. **Reference links are stored twice.** `add-frame-as-reference` writes a URL snapshot into `reference_image_order` as well as a `frame_links` row (PK3-FACT-05). merged2 records the route but not the snapshot.
6. **Stage 2 "Retroactive revise" is unreachable.** The button renders only when a local flag that is never set to true is true (PK3-FACT-06). Not in merged2.
7. **Shot extraction sees every scene in summary form.** `masterScriptSummary` covers all scenes' first action lines, truncated to 100 characters (PK3-FACT-07). AI-0071 mentions global context but not this.
8. **Continuity risk uses status and timestamp rules only.** No end-state text is compared (PK3-FACT-08). CAP-0217 and INV-0050 record the badge, not the rule.
9. **Reference links vanish silently on source deletion.** `frame_links` has UNIQUE(target_frame_id) and ON DELETE CASCADE (PK3-FACT-09). This answers the open question in CONT-173.
10. **`continuity_flags` is free text consumed by one regex** (PK3-FACT-10). Not in merged2.
11. **Use-current-image toggles exist at four regeneration points** (FramePanel, EnhancedUploadModal, VisualStateEditorPanel, TransformationEventCard). merged2 records only CAP-0175.

## Corrections to existing archaeology entries

- **WD-IMPL-ROUTE-0116** gives the path as `/api/projects/:projectId/scenes/:sceneId/generate-continuity-prompt`. Code is `POST /:projectId/scenes/:sceneId/shots/:shotId/generate-continuity-prompt` (frames.ts:2145-2148).

## Confirmed absences (searched, nothing found)

Drift detection between consecutive frames (224-226), frame-level continuity confidence (161), alternating camera-setup detection (186, 193, 194), link pickers and the visual link map (182, 183, 187), primary-reference designation for frame links (185, 191, 192), change log and rollback for scene assets (056), wardrobe lock (044), acknowledge or mark-reviewed for continuity breaks (222), and the Rearview mirror tab (215). Script revision, diff and fork-branch features are also absent (240-247): the New Branch button is a stub (WD-IMPL-CAP-0020).

## Ideas that cannot be settled statically

- 098 (historical question), 147 (output fidelity), 153 and 154 (identity of linked assets through camera change), 173 (intended break behaviour of reference links; the code cascades silently), 211 (risk statement). These are UNKNOWN.
- 013 and 014 (beat and script inputs) were not traced in full. Relations for 013 to 018 are PARTIAL with that caveat.
- 031 (rules stay fixed when the engine changes) is a design principle with no static test.

## Cluster table

Relation values: EXACT_MATCH, PARTIAL_MATCH, NOT_IMPLEMENTED, CONTRADICTED_BY_CODE, UNKNOWN. The `#` column is the line number in `PK3-relations.jsonl`.

| # | Cluster | Relation | Ideas | Idea numbers |
|---|---|---|---|---|
| 1 | Global context package contents | PARTIAL_MATCH | 5 | 001, 003, 004, 005, 006 |
| 2 | Scene-level context excludes non-active scenes | CONTRADICTED_BY_CODE | 1 | 002 |
| 3 | Scene dependency maps and deterministic asset population | PARTIAL_MATCH | 2 | 007, 008 |
| 4 | Speaking and off-screen character presence rule | PARTIAL_MATCH | 1 | 009 |
| 5 | Context trimming by priority and size monitoring | PARTIAL_MATCH | 1 | 010 |
| 6 | Centralized automatic context injection | CONTRADICTED_BY_CODE | 1 | 011 |
| 7 | Bulk story-context sharing and cost control | PARTIAL_MATCH | 1 | 012 |
| 8 | Per-AI-step context contents | PARTIAL_MATCH | 6 | 013, 014, 015, 016, 017, 018 |
| 9 | Layer precedence and fixed prompt assembly order | PARTIAL_MATCH | 3 | 019, 021, 031 |
| 10 | Layer priority ranking of context sources | NOT_IMPLEMENTED | 1 | 020 |
| 11 | Override policy: allowed and forbidden fields, violation records | NOT_IMPLEMENTED | 6 | 022, 023, 024, 025, 026, 028 |
| 12 | Media stages have no creative authority | CONTRADICTED_BY_CODE | 1 | 027 |
| 13 | Auditability record of generation inputs | PARTIAL_MATCH | 1 | 029 |
| 14 | Diagnosis path for constraint violations | NOT_IMPLEMENTED | 1 | 030 |
| 15 | Asset inheritance precedence and flow | PARTIAL_MATCH | 2 | 032, 046 |
| 16 | Style capsule application scope | NOT_IMPLEMENTED | 1 | 033 |
| 17 | Style-lock change warning and choice | EXACT_MATCH | 1 | 034 |
| 18 | Lighting descriptor standardisation across frame prompts | NOT_IMPLEMENTED | 1 | 035 |
| 19 | Ask Auteur established-fact ledger | EXACT_MATCH | 1 | 037 |
| 20 | Ask Auteur facts re-injected into every later generation | PARTIAL_MATCH | 1 | 038 |
| 21 | Canonical identity and frame expression layers | PARTIAL_MATCH | 2 | 042, 043 |
| 22 | Wardrobe lock across shots | NOT_IMPLEMENTED | 1 | 044 |
| 23 | Scene appearance override creates a scene instance | PARTIAL_MATCH | 1 | 045 |
| 24 | Intake supplies scene-specific visual state to Stage 8 | NOT_IMPLEMENTED | 1 | 099 |
| 25 | Status tag definition and sourcing | PARTIAL_MATCH | 2 | 047, 048 |
| 26 | Status tags appended as visual modifiers to images | EXACT_MATCH | 1 | 049 |
| 27 | Parenthetical cues drive visual state | NOT_IMPLEMENTED | 1 | 054 |
| 28 | Two-way tag evolution through inheritance | EXACT_MATCH | 1 | 052 |
| 29 | Expected state-change behaviour and visual-change filter | PARTIAL_MATCH | 2 | 051, 053 |
| 30 | Scene-instance image regeneration with tags | EXACT_MATCH | 1 | 050 |
| 31 | Instance modification tracking | EXACT_MATCH | 1 | 055 |
| 32 | Asset change log and per-asset rollback | NOT_IMPLEMENTED | 1 | 056 |
| 33 | Character state variants as separate assets (option A) | NOT_IMPLEMENTED | 1 | 057 |
| 34 | Character state via changed-state instances (option B) | PARTIAL_MATCH | 1 | 058 |
| 35 | Scene-to-scene inheritance of asset state | EXACT_MATCH | 3 | 059, 061, 064 |
| 36 | Inherited flagging and transient assets | PARTIAL_MATCH | 2 | 060, 063 |
| 37 | Carry-forward toggle default | EXACT_MATCH | 1 | 065 |
| 38 | Carry-forward tag question on scene entry | PARTIAL_MATCH | 1 | 066 |
| 39 | Stage ownership of asset visual state | PARTIAL_MATCH | 1 | 067 |
| 40 | Mid-scene visual changes not pre-defined upstream | CONTRADICTED_BY_CODE | 1 | 068 |
| 41 | Scene end-state prose and final-frame reference | PARTIAL_MATCH | 2 | 069, 070 |
| 42 | AI-written scene end-state summary | NOT_IMPLEMENTED | 1 | 071 |
| 43 | Scene completion loops to next scene with end state | PARTIAL_MATCH | 1 | 072 |
| 44 | Consumers of the scene end state | PARTIAL_MATCH | 1 | 073 |
| 45 | First shot connects to prior scene end state | PARTIAL_MATCH | 1 | 074 |
| 46 | Shot-list continuity notes | NOT_IMPLEMENTED | 1 | 075 |
| 47 | Adjacent references across scene boundaries | PARTIAL_MATCH | 1 | 076 |
| 48 | Historical reference carousel for scene assets | EXACT_MATCH | 1 | 078 |
| 49 | Reference chain edge cases and deletion handling | PARTIAL_MATCH | 1 | 079 |
| 50 | Inheritance chain from master to prompts to frames | PARTIAL_MATCH | 2 | 080, 081 |
| 51 | Fresh reference resolution at frame generation | CONTRADICTED_BY_CODE | 1 | 082 |
| 52 | Cross-scene asset timeline with validate and repair | PARTIAL_MATCH | 1 | 083 |
| 53 | Infer from story context, single and bulk | PARTIAL_MATCH | 4 | 084, 085, 086, 087 |
| 54 | Suggestion review modal side-by-side | PARTIAL_MATCH | 1 | 088 |
| 55 | Accept options, reasoning and additive tags for suggestions | EXACT_MATCH | 3 | 089, 090, 091 |
| 56 | Version history for accepted AI descriptions | PARTIAL_MATCH | 1 | 092 |
| 57 | Regeneration is the user's choice after description update | EXACT_MATCH | 1 | 093 |
| 58 | Restraint against over-eager condition inference | PARTIAL_MATCH | 1 | 094 |
| 59 | Separate concerns for detection and inference | EXACT_MATCH | 1 | 095 |
| 60 | Rejected combined detect-and-infer button | NOT_IMPLEMENTED | 1 | 096 |
| 61 | Automatic context-aware description alternative | NOT_IMPLEMENTED | 1 | 097 |
| 62 | Investigation of an earlier basic context-aware description | UNKNOWN | 1 | 098 |
| 63 | Prompt-driven mid-scene change and problem framing | PARTIAL_MATCH | 2 | 100, 101 |
| 64 | Transformation detection from the shot list | PARTIAL_MATCH | 2 | 102, 103 |
| 65 | Transformation types | EXACT_MATCH | 1 | 104 |
| 66 | Transformation completion and blocking gate | PARTIAL_MATCH | 1 | 105 |
| 67 | Post-transformation description and prefill | EXACT_MATCH | 2 | 106, 107 |
| 68 | Per-event post-transformation image | EXACT_MATCH | 1 | 108 |
| 69 | Post image identity reference and upload path | PARTIAL_MATCH | 2 | 109, 110 |
| 70 | Stage 9 transformation state badge | NOT_IMPLEMENTED | 1 | 111 |
| 71 | Per-shot presence types for frame references | EXACT_MATCH | 1 | 112 |
| 72 | Pass-through assets in a shot | PARTIAL_MATCH | 1 | 113 |
| 73 | End-frame reference set and explicit override | EXACT_MATCH | 3 | 114, 115, 116 |
| 74 | End-frame reference visibility and manual override | PARTIAL_MATCH | 1 | 117 |
| 75 | End frame shows the result of the shot action | EXACT_MATCH | 1 | 118 |
| 76 | Shot-to-shot awareness through previous-shot metadata | PARTIAL_MATCH | 2 | 119, 120 |
| 77 | Prior-shot end-state extraction and injection | NOT_IMPLEMENTED | 3 | 121, 122, 123 |
| 78 | Transformation versus chaining, and transformed end-state text | PARTIAL_MATCH | 2 | 124, 125 |
| 79 | Chaining UI, regeneration, opening state, cost and principles | NOT_IMPLEMENTED | 6 | 126, 127, 128, 129, 130, 131 |
| 80 | Shot continuity flags for handoffs and entries | PARTIAL_MATCH | 1 | 132 |
| 81 | Chained context window options | PARTIAL_MATCH | 2 | 133, 134 |
| 82 | Start frame seeded from previous end frame | PARTIAL_MATCH | 2 | 135, 136 |
| 83 | First and last frame control for video clips | PARTIAL_MATCH | 1 | 137 |
| 84 | Match time point designation | EXACT_MATCH | 1 | 138 |
| 85 | Transition classification by camera specs | EXACT_MATCH | 1 | 139 |
| 86 | Match mode zero-cost pixel copy | PARTIAL_MATCH | 1 | 140 |
| 87 | Camera-change recomposition and analysis precedence | EXACT_MATCH | 2 | 141, 143 |
| 88 | Recomposition preservation list | PARTIAL_MATCH | 1 | 142 |
| 89 | Push and pull reference transfers | EXACT_MATCH | 2 | 144, 145 |
| 90 | Reference-only prompts built from metadata (identified gap) | PARTIAL_MATCH | 1 | 146 |
| 91 | Re-angling fidelity expectations | UNKNOWN | 1 | 147 |
| 92 | Dedicated multi-angle generators considered | NOT_IMPLEMENTED | 1 | 148 |
| 93 | Analyze-then-generate workflow | EXACT_MATCH | 1 | 149 |
| 94 | Concrete frame-specific camera-change prompt | PARTIAL_MATCH | 1 | 150 |
| 95 | Dual anchoring of image and semantic description | EXACT_MATCH | 1 | 151 |
| 96 | Manual override of continuity prompt | PARTIAL_MATCH | 1 | 152 |
| 97 | Linked assets keep canonical identity in camera change | UNKNOWN | 2 | 153, 154 |
| 98 | Canonical asset text and reference order for camera change | PARTIAL_MATCH | 3 | 155, 156, 157 |
| 99 | Camera-change pipeline: analyse, gather, build, primary reference | EXACT_MATCH | 2 | 158, 159 |
| 100 | Invisible quality of camera-change pull and automatic analysis | EXACT_MATCH | 2 | 160, 163 |
| 101 | Continuity confidence indicator | NOT_IMPLEMENTED | 1 | 161 |
| 102 | Camera-change tiering by complexity | NOT_IMPLEMENTED | 1 | 162 |
| 103 | Analysis timing per regeneration | EXACT_MATCH | 1 | 164 |
| 104 | Caching of reference analysis | NOT_IMPLEMENTED | 2 | 165, 166 |
| 105 | Pull Ref feedback: badge and hint | EXACT_MATCH | 1 | 167 |
| 106 | Pull Ref automatic regeneration alternative | NOT_IMPLEMENTED | 1 | 168 |
| 107 | Match versus reference link semantics | EXACT_MATCH | 1 | 169 |
| 108 | Reference links as first-class frame links | PARTIAL_MATCH | 1 | 170 |
| 109 | Link badges and multiple reference kinds on one frame | PARTIAL_MATCH | 2 | 171, 172 |
| 110 | Reference link break behaviour | UNKNOWN | 1 | 173 |
| 111 | Use current image as reference toggle | EXACT_MATCH | 1 | 174 |
| 112 | Continuity base frame picker | EXACT_MATCH | 1 | 175 |
| 113 | Link exclusivity: one link per target | EXACT_MATCH | 1 | 176 |
| 114 | Link exclusivity alternative: one link per type | NOT_IMPLEMENTED | 1 | 177 |
| 115 | Stale reference after source regeneration | PARTIAL_MATCH | 2 | 178, 179 |
| 116 | Non-adjacent reference links (backend) | PARTIAL_MATCH | 2 | 180, 181 |
| 117 | Link pickers for other shots and frames | NOT_IMPLEMENTED | 2 | 182, 183 |
| 118 | Many-to-many continuity links with adjacent fallback | PARTIAL_MATCH | 1 | 184 |
| 119 | Primary reference designation among several references | NOT_IMPLEMENTED | 3 | 185, 191, 192 |
| 120 | Alternating camera setup detection and placement | NOT_IMPLEMENTED | 3 | 186, 193, 194 |
| 121 | Continuity relationship map | NOT_IMPLEMENTED | 1 | 187 |
| 122 | Recurring establishing shots and callbacks | NOT_IMPLEMENTED | 1 | 188 |
| 123 | Background-only match reference | NOT_IMPLEMENTED | 1 | 189 |
| 124 | Reuse or edit workflow guidance and drag-in | PARTIAL_MATCH | 3 | 197, 198, 205 |
| 125 | Continuity base paths: reuse or edit, variation, fresh | EXACT_MATCH | 1 | 199 |
| 126 | Approved output promotion and reuse | EXACT_MATCH | 1 | 206 |
| 127 | Ranked continuity base candidates with reasons | EXACT_MATCH | 1 | 200 |
| 128 | Candidate ranking order | PARTIAL_MATCH | 1 | 201 |
| 129 | Continuity strength rating, base as primary, and silent fallback | EXACT_MATCH | 3 | 202, 203, 204 |
| 130 | Frame lineage recording | EXACT_MATCH | 1 | 209 |
| 131 | Frame stage as continuity workspace | PARTIAL_MATCH | 1 | 210 |
| 132 | Frame-stage reuse risk | UNKNOWN | 1 | 211 |
| 133 | Breaks flagged to user, not silently ignored | PARTIAL_MATCH | 1 | 212 |
| 134 | System prompt and regeneration text boxes as tools | EXACT_MATCH | 1 | 213 |
| 135 | Rearview tab with previous scene end state | NOT_IMPLEMENTED | 1 | 215 |
| 136 | Rearview content for an unfinished or prior scene | PARTIAL_MATCH | 2 | 214, 216 |
| 137 | Rearview mirror simplification (rejected) | NOT_IMPLEMENTED | 1 | 217 |
| 138 | Frame-generation comparison modes for prior and current frame | PARTIAL_MATCH | 2 | 218, 219 |
| 139 | Advisory continuity risk rating | PARTIAL_MATCH | 1 | 220 |
| 140 | Content-aware risk analysis and acknowledge or mark-reviewed | NOT_IMPLEMENTED | 2 | 221, 222 |
| 141 | Break detection on asset removal or state edits | NOT_IMPLEMENTED | 1 | 223 |
| 142 | Frame-to-frame continuity drift detection | NOT_IMPLEMENTED | 3 | 224, 225, 226 |
| 143 | Visual continuity tracking, exports, advanced tools | NOT_IMPLEMENTED | 4 | 227, 228, 230, 231 |
| 144 | Project continuity dashboard and suggestions | PARTIAL_MATCH | 1 | 229 |
| 145 | Anchor-frame validation and inpainting repair | PARTIAL_MATCH | 1 | 232 |
| 146 | Continuity preview, prompt text and repair routing | EXACT_MATCH | 1 | 233 |
| 147 | Upstream edits re-run downstream AI steps | NOT_IMPLEMENTED | 1 | 234 |
| 148 | End-frame anchor cascade across scenes | NOT_IMPLEMENTED | 1 | 235 |
| 149 | Scene identity on master-script re-approval | CONTRADICTED_BY_CODE | 1 | 238 |
| 150 | Mid-production pivot without losing scene work | PARTIAL_MATCH | 1 | 239 |
| 151 | Script revision update and remix product features | NOT_IMPLEMENTED | 3 | 240, 241, 242 |
| 152 | Script revision reconciliation: fork or mutate branch | NOT_IMPLEMENTED | 2 | 243, 244 |
| 153 | Definition of a changed scene for revision | NOT_IMPLEMENTED | 3 | 245, 246, 247 |
| 154 | Scene asset instances pulled into local context | PARTIAL_MATCH | 1 | 062 |

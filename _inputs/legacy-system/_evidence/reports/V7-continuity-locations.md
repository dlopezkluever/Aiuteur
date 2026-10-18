# V7 — Frame/Shot Continuity Engine + Location Identity/Coverage

Scope: backend `services/{continuityBaseService,continuityCompositionService,continuityRiskAnalyzer,locationCoverageService,locationResolverService}.ts`; owned routes in `routes/projects.ts` (location-coverage, resolve-locations, shot location PUT, continuity-preview) and `routes/frames.ts` (reference-images, continuity-base, available-references, chain-from-end-frame, add-frame-as-reference, copy-frame, batch-link-copy, generate-continuity-prompt, frame-links DELETE); frontend `src/lib/services/locationContinuityService.ts`, `src/types/locationContinuity.ts`, `Stage8/LocationCoveragePanel.tsx`, `Stage9/ContinuityPreviewPanel.tsx`, `ContinuityBaseChooser` (in `Stage10FrameGeneration.tsx:69-182`). Context read (not owned): `promptGenerationService.ts` helpers, `frameGenerationService.ts` continuity branches, `ImageGenerationService.ts` job completion, migrations 031/034/035/038/039/040, Stage 7/9/10 hosts, FramePanel.

All backend DB access uses the service-role client (`backend/src/config/supabase.ts:9-21`), so RLS policies in migrations are NOT enforced on these paths; authorization is only what each route checks.

---

## 1. What "continuity" concretely means in this code (five distinct mechanisms)

| # | Mechanism | Unit | Where computed | Persisted? | AI? |
|---|---|---|---|---|---|
| 1 | **Scene continuity risk** (`safe/risky/broken`) | scene | `continuityRiskAnalyzer.ts:59-126`, called in `GET /api/projects/:id/scenes` (`projects.ts:1092-1121`) | No (computed per request) | No |
| 2 | **Shot start continuity mode** `start_continuity` ∈ `none/match/camera_change` (+ `ai_start_continuity`) | shot | Default written by Stage 9 prompt generation via deterministic `determineContinuityLink` (`promptGenerationService.ts:1014-1045`, persisted `projects.ts:3855-3856`); user edits via `PUT .../shots/:shotId/prompts` (`projects.ts:3526-3535`); side-effect writers: add-frame-as-reference, batch-link-copy | Yes, `shots` (mig 031) | No (name "ai_" is misleading; rule-based) |
| 3 | **Frame links** (`frame_links`, `match`/`reference`) — pixel copy and reference-angle linkage between specific frames | frame→frame | frames.ts copy-frame / batch-link-copy / add-frame-as-reference; consumed by `frameGenerationService` | Yes (mig 034/035) | Indirect (reference link feeds camera-change AI path) |
| 4 | **Continuity base** (reuse/edit base frame) — an approved/generated *start* frame of another shot at the same canonical location used as primary image reference | shot | `continuityBaseService.ts` ranking; selection `PUT .../continuity-base` (`frames.ts:1574-1682`); consumption `frameGenerationService.fetchShotReferenceImageContext` (`:626-709`) | Selection yes (`shots.selected_continuity_base_frame_id`, mig 040); candidates no | Feeds image-generation prompt (`buildReuseEditPrompt`) |
| 5 | **Location identity + coverage** — shot→canonical location asset (`shots.location_asset_id`) and shot→direction view (`shots.camera_direction_id`), coverage/strength summaries, generation reference manifest preview | shot / location | `locationResolverService.ts`, `locationCoverageService.ts`, `continuityCompositionService.ts` | Assignment yes (mig 038/039); coverage/preview/strength no | No |

Plus project-level `projects.continuity_mode` `basic|advanced` (mig 040 §4; routes owned by V1 at `projects.ts:809-860`) which changes severities in coverage (only when the client passes `?mode=`), and gates strict validation in continuity-metrics (V1, `projects.ts:976-1004`).

---

## 2. Data model (entities)

### 2.1 `shots` columns touched by this slice
- Location identity (mig `039_shot_location_identity.sql:29-61`): `location_asset_id UUID → project_assets ON DELETE SET NULL`, `location_match_confidence NUMERIC(4,3)` CHECK 0..1, `location_match_source TEXT` CHECK ∈ {`manual`,`resolver_exact`,`resolver_alias`,`resolver_fuzzy`,`stage7_inferred`,`legacy_backfill`,`camera_direction_parent`}, `location_match_notes TEXT`. Also adds `end_frame_reference_image_order JSONB` ("live code already reads and writes this column, but no migration in this repo created it", `:69-74`).
- Camera metadata (mig `038:113-121`): `camera_distance`, `camera_height`, `camera_movement`, `camera_direction_id UUID → location_views ON DELETE SET NULL`.
- Continuity (mig `031`): `start_continuity TEXT DEFAULT 'none' CHECK (none|match|camera_change)`, `ai_start_continuity`, `continuity_frame_prompt TEXT`.
- Base selection (mig `040:21-31`): `selected_continuity_base_frame_id UUID → frames ON DELETE SET NULL`.
- `reference_image_order JSONB` (start refs) / `end_frame_reference_image_order JSONB` — the actual reference list sent to image generation.

### 2.2 `frames` lineage (mig `040:37-75`)
`generated_from_frame_id → frames ON DELETE SET NULL`, `continuity_base_role` CHECK ∈ {`reuse_match`,`reuse_edit`,`camera_change_ref`,`match_copy`,`manual`}, `promoted_to_view_id → location_views`. Pre-existing `previous_frame_id` (adjacency). Frames FK to shots `ON DELETE CASCADE` (`019_frames_table.sql:8`).

Writers of `continuity_base_role`:
- `match_copy`: batch-link-copy (`frames.ts:1894,1913`), copy-frame to start (`frames.ts:2037`), bulk match copy (`frameGenerationService.ts:392`), regenerate match copy (`:1081`).
- `manual`: copy-frame to end (`frames.ts:2037`); also fallback in `startFrameGeneration` when lineage has id but no role (`frameGenerationService.ts:878`).
- `reuse_match` / `reuse_edit`: `fetchShotReferenceImageContext` role (`:691`) → `startFrameGeneration` lineage.
- `camera_change_ref`: `generateWithCameraChangeAnalysis` (`:816`).

### 2.3 `frame_links` (mig `034_frame_links.sql`, `035_frame_links_reference.sql`)
`id, source_frame_id → frames CASCADE, target_frame_id → frames CASCADE, link_type CHECK IN ('match','reference'), created_at`, `UNIQUE(target_frame_id)` (one link per target, mutual exclusivity). Mig 034 header: "Reactive frame links: when a source frame changes, the target frame auto-updates. Only 'match' links are reactive (ref operations are one-shot copies)."

### 2.4 `location_views` (mig 038) as consumed here
`project_asset_id, name, alias, description, view_type ('establishing'|'direction'), camera_distance, camera_height, image_key_url, is_primary, source ('user'|'established'|'stage7_inferred'), established_from_scene, established_from_shot_id, sort_order, promoted_from_frame_id (mig 040)`, `UNIQUE(project_asset_id, name)`. A "camera direction" = a `location_views` row with `view_type='direction'`.

### 2.5 `location_match_events` (mig `039:80-150`)
Audit rows per resolver run: raw_setting, scene_expected_location, camera_direction_id, result_location_asset_id (only when applied), result_confidence/source/reason, is_ambiguous, was_applied, candidates JSONB. **Write-only**: no code reads it (grep: only `recordMatchEvent` inserts).

### 2.6 `project_assets.location_aliases JSONB array` (mig `039:13-24`)
Read by resolver (`locationResolverService.ts:143-159,256-283`). Written only by `PUT` project asset (`projectAssets.ts:628-638`); no frontend `.tsx` writes it (grep `location_aliases` in `src/` → only `types/asset.ts` and `projectAssetService.ts:28` type). Alias editing has no UI.

### 2.7 `projects.continuity_mode` `basic|advanced` (mig 040 §4). V1 owns routes.

### 2.8 Computed-only payloads (never persisted)
- `LocationResolveResult`, `ShotLocationState` (route `buildShotLocationState`), coverage `LocationCoverageResponse`, `ContinuityBaseCandidate[]`, `GenerationContinuityPackage`/`ShotContinuityPreview` (incl. `framePromptInstructions`, `continuityPromptInstructions`, `providerReadyReferences`, `persistedStartFrameManifest`).

---

## 3. Location identity: resolution engine (`locationResolverService.ts`, deterministic, no AI)

### 3.1 Inputs/context
`loadProjectLocationContext(branchId)` (`:309-350`): all `project_assets` where `branch_id=branchId AND asset_type='location'` (`id,name,description,location_aliases`) + all `location_views` ids for those assets → `cameraDirectionParents: Map<viewId,{locationAssetId,locationName}>` (all view types, incl. establishing).

### 3.2 Decision rules (verbatim constants)
- `MIN_CANDIDATE_CONFIDENCE = 0.56`, `DEFAULT_LOCATION_AUTO_APPLY_CONFIDENCE = 0.72`, `AMBIGUITY_CONFIDENCE_DELTA = 0.06` (`:72-74`).
- Normalization (`:116-132`): NFKD, strip diacritics, lowercase, remove `int/ext`, `int.`, `ext.`, quotes, non-alnum→space, drop SCREENPLAY_QUALIFIERS (`int, ext, interior, exterior, ie, day, night, dawn, dusk, morning, afternoon, evening, later, continuous, same, moments, flashback, present`). Tokenizer additionally drops stop words (`the,a,an,and,or,of,to,in,on,at,with,from,near,inside,outside`).
- `resolveShotLocation` order (`:352-439`):
  1. If `cameraDirectionId` maps to a view parent → confidence 1, source `camera_direction_parent`, never ambiguous.
  2. Else for each text input in order `setting` then `sceneExpectedLocation`, for every location asset, `candidateForText` (`:223-299`):
     - normalized text == normalized name → 0.99 `resolver_exact`
     - text contains name as whole phrase → 0.93 (multi-word name) / 0.88 (single) `resolver_exact`
     - alias exact → 0.97 `resolver_alias`; alias phrase → 0.90 / 0.84 `resolver_alias`
     - fuzzy token overlap `scoreTokenOverlap` (`:206-221`): token match if Levenshtein similarity ≥ 0.84; requires coverage ≥ 0.66 of asset tokens; score = `0.55 + coverage*0.26 + jaccard*0.16 - oneTokenPenalty(0.06 if 1 asset token and >3 text tokens)`; kept if ≥ 0.56 → `resolver_fuzzy`.
  3. Best per asset kept (max confidence), sorted desc. `isAmbiguous = second && top - second <= 0.06`.
- `shouldApplyResolution` (`:441-446`): `!!result.locationAssetId && !result.isAmbiguous && confidence >= threshold(0.72)`.
- `toShotLocationPatch` (`:448-471`): writes `location_asset_id` only if applied else **null**; always writes confidence, source (or `sourceOverride` if applied), notes (`buildMatchNotes`: reason + top-3 "name 0.xxx", truncated to 500 chars).
- Description field of assets is loaded but never used in scoring.

### 3.3 Where resolution runs (all in `routes/projects.ts`, via `applyShotLocationResolution` `:225-256`)
| Trigger | Line | preserveManual | Persists | Event recorded |
|---|---|---|---|---|
| Shot extraction (Stage 7 AI extract) | `:1784-1962` (`:1931`) | n/a (new rows) | insert | yes |
| `PUT .../shots/:shotId` when body has `setting` or `camera_direction_id` and existing source ≠ `manual` | `:2432-2499` | implicit (skips manual) | update | yes |
| `POST .../shots/resolve-locations` | `:2043-2177` | body `preserveManual` default true | only if `apply` and `location_asset_id` changed | yes when `apply` |
| `PUT .../camera-direction` with `clear:true` and source ≠ manual | `:2222-2240` | implicit | update | no |
| Split shots | `:2591` | n/a (new rows) | insert | yes |
| Merge shots | `:2732` | n/a (new row) | insert | yes |
| Read-only state computation: GET shots, reorder, after updates | `:1565-1577`, `:2028-2033`, etc. | n/a | no | no |
| Shot-list lock validation warning | `:2930-2939` | n/a | no | no |
| CLI `backend/scripts/backfill-shot-locations.ts` | `:150-230` | skips manual (counter `skippedManual`) | with `--apply`, `sourceOverride: 'legacy_backfill'` (or `camera_direction_parent`) | yes |

Extraction also resolves the **scene** location (`scene.expected_location`) and, if applied, loads existing direction views to pass to the AI shot extractor, then inserts AI-proposed new directions as `location_views` with `source:'stage7_inferred'`, `camera_distance:'wide'`, `camera_height: isDirection?'eye_level':'overhead'`, `is_primary: isDirection && !hasPrimary` (`projects.ts:1786-1903`); `camera_direction_id` of each new shot is mapped by direction **name** (`:1923-1925`). (Extraction AI itself belongs to the Stage 7 slice.)

### 3.4 Location state classification — TWO different classifiers (CONTRADICTED)
- Route `buildShotLocationState` (`projects.ts:79-139`), used by every shot list response:
  ```
  if (locationAssetId) state = source==='manual' || (confidence??0) >= 0.72 ? 'resolved' : 'suggested';
  else if (source==='manual') 'unresolved';
  else if (resolverResult.isAmbiguous) 'ambiguous';
  else if (resolverResult.locationAssetId) 'suggested';
  else 'unresolved';
  ```
  Re-runs the resolver live on every GET for candidates (`candidates` returned, top 3 shown in Stage 7).
- Composition `locationStateFromShot` (`continuityCompositionService.ts:218-254`), used in Stage 9/10 preview:
  ```
  if (locationAssetId) state = confidence !== null && confidence < 0.8 ? 'suggested' : 'resolved';
  ```
  never `ambiguous`; `candidates: []`; `expectedLocationAssetId: null`.
  A shot auto-applied at 0.72–0.799 (e.g. fuzzy) is `resolved` in Stage 7 and `suggested` in Stage 9.
- Scene-mismatch: `summarizeShotLocationStates` (`:141-158`) counts shots whose `location_asset_id` ≠ the scene's resolved expected location. Lock route adds a warning `"Location continuity needs review: N unresolved, N ambiguous, N scene-location mismatch."` (`:173-188`), bypassable with `force` (`:2952-2959`).

### 3.5 Overwrite/preservation semantics of user-authored location (INV)
- Manual assign `PUT .../shots/:shotId/location` (`:2316-2396`): verifies asset is a location in active branch; writes `{location_asset_id, confidence 1, source 'manual', notes "Manual assignment to \"X\"."}`. Clear writes `{null, null, 'manual', 'Manual location assignment cleared.'}` → state `unresolved`, and because source stays `manual`, subsequent setting edits, resolver re-runs (preserveManual default), and camera-direction clear **never re-resolve** it ("manual clear" is sticky). Does NOT touch `camera_direction_id` (a direction from another location stays assigned).
- Non-manual shots: any `setting` or `camera_direction_id` edit re-resolves and **overwrites** location fields; if the new result does not pass 0.72/ambiguity, `location_asset_id` becomes **null** (an earlier auto-link is erased) (`:2451-2471`).
- `resolve-locations` with `preserveManual:false` can overwrite manual links (API-only; Stage 7 UI always sends `preserveManual:true`, `Stage7ShotList.tsx:659-662`). Only updates rows whose `location_asset_id` changed; confidence/notes of unchanged rows are not refreshed (`:2110-2112`).
- `PUT .../camera-direction` (`:2180-2313`; route not listed for V7 but is the Stage 8 call target): validates view exists and `view_type==='direction'`, parent location in active branch; **409** if shot is `manual` to a different location; else if parent ≠ current location, sets `{location_asset_id: parent, confidence 1, source 'camera_direction_parent', notes "Camera direction \"name\" belongs to \"X\"."}`. Generic `PUT .../shots/:shotId` accepts `camera_direction_id` without validating it is a direction view or in-branch (`:2421-2426`).
- Split/merge rows omit `camera_direction_id` and re-resolve from text; manual location and direction assignments are lost on split/merge (`:2578-2590`, `:2717-2730`).
- Deletion: deleting a `location_views` row nulls `shots.camera_direction_id` (FK) but leaves `location_asset_id`/source; deleting a location asset nulls `location_asset_id` but leaves source/confidence/notes.

---

## 4. Location coverage (`locationCoverageService.ts`, deterministic) — Stage 8

### 4.1 Call chain
`Stage8VisualDefinition.tsx:841` renders `<LocationCoveragePanel projectId sceneId/>` → `useQuery(['location-coverage',projectId,sceneId,continuityMode])` → `locationContinuityService.fetchCoverage(projectId, sceneId, mode)` (`locationContinuityService.ts:32-55`) → `GET /api/projects/:id/scenes/:sceneId/location-coverage?mode=` (`projects.ts:1585-1708`) → reads `shots` (scene), `scene_asset_instances(project_asset_id,image_key_url)`, branch location `project_assets`, `location_views` for relevant locations (ordered sort_order, created_at) → `locationCoverageService.buildCoverage` → JSON. Nothing persisted.

Relevant locations = locations linked by any shot ∪ locations present as scene asset instances (`:1649-1666`). `mode` comes from the query string (`parseLocationCoverageMode`, `:59-61`), NOT from `projects.continuity_mode`; the panel initializes local state `'basic'` then syncs from `GET continuity-mode` (`LocationCoveragePanel.tsx:126-144`).

### 4.2 Per-shot coverage state rules (`:291-339`)
For shots grouped by `location_asset_id` (shots without one, or whose location is not in the relevant set → `unresolvedShots` with `coverageState:'unassigned_direction'`, `severity:'warning'`, notice "This shot has no canonical linked location yet.", action "Link the shot to a location in Stage 7 before assigning advanced coverage.").
- `assignedView` = view of THIS location with id == `camera_direction_id`.
- `fallbackView` = primary direction (is_primary else first direction) if it has image → else establishing with image → else first direction with image.
- `locationImageUrl` = scene instance image || master image. `hasAnyReference` = locationImageUrl || any view image.
- Order: (a) `assignedView.locationAssetId !== location.id` → `direction_location_mismatch` (**unreachable**: views are pre-grouped by `project_asset_id`, so an assigned view from another location yields `assignedView=null`, falling into (d)); (b) assigned with image → `matched_view`/good; (c) assigned without image → `missing_view_image`, severity advanced?warning:advisory, fallback notice; (d) no assigned view and (fallbackView || locationImageUrl) → `fallback_view`, severity advanced?warning:advisory, notice basic "Using a fallback location reference until a direction is assigned." / advanced "Advanced continuity should assign a specific camera direction."; (e) else `unassigned_direction`.

### 4.3 Location strength (`:197-212`) verbatim
```
if (totalShots === 0) return hasAnyReference ? 'usable' : 'missing';
if (matchedDirectionShots === totalShots) return 'strong';
if (!hasAnyReference) return 'missing';
if (missingImageShots > 0 || directionMismatchShots > 0) return 'weak';
if (fallbackShots > 0) return mode === 'advanced' ? 'weak' : 'usable';
return 'weak';
```
Response strength (`:214-220`): any unresolved → weak; no locations → missing; all strong → strong; any missing/weak → weak; else usable. `weakShotCount = unresolved + fallback + missingImage + mismatch`. `availableRepairActions` always includes `create_view`,`use_approved_frame`; `assign_direction` if directions and shots; `generate_missing_view` if a view lacks image and hasAnyReference. **The panel never reads `availableRepairActions`** (grep), it decides buttons by its own rules (`LocationCoveragePanel.tsx:801-840`, `:729-732`).

### 4.4 Panel actions (UI → route)
| UI element | Handler | Service → route | Tables | Owner |
|---|---|---|---|---|
| Basic/Advanced toggle | `updateContinuityModeMutation` (`:146-153`, `:389-412`) | `PUT /:id/continuity-mode` | `projects.continuity_mode` | V1 route |
| Direction `<Select>` per shot | `handleDirectionChange` (`:216-228`) | `assignCameraDirection` → `PUT .../shots/:shotId/camera-direction` (`{cameraDirectionId}` or `{clear:true}`) | shots | projects.ts:2180 |
| "Generate view image" sparkle / "Generate Missing (n)" | `handleGenerateViewImage`/`handleGenerateMissing` (`:230-268`, sequential loop) | `projectAssetService.generateLocationViewImage` | location_views, image jobs | Asset slice |
| "Create Default Views" (no views) | `handleCreateDefaultViews` (`:270-288`) | `projectAssetService.suggestDefaultViews` | location_views | Asset slice |
| "Add Direction" | `handleCreateDirection` (`:290-319`) | `projectAssetService.createLocationView` with `name: direction_{n}`, `alias: "Direction n"`, wide/eye_level, `is_primary` if first, **`source: 'stage7_inferred'`** (user action labeled Inferred) | location_views | Asset slice |
| "Use approved frame as view" (only when `missing_view_image` and shot has approved start frame) | `handleUseApprovedFrameAsView` (`:321-355`) | `projectAssetService.establishViewFromFrame` (no `frameId` passed) → `projectAssets.ts:~3190-3285` sets view image, `source:'established'`, `established_from_*`; `promoted_from_frame_id`/`frames.promoted_to_view_id` only if frameId given (not from this panel) | location_views | Asset slice |
| Suggestions strip (basic mode only) + dismiss | `continuityMetricsQuery` (`:164-178`) | `GET continuity-metrics?sceneId` | read-only; dismissal in React state only | V1 route |

Approved frames for "use approved frame" come from `frameService.fetchFrames` (`:180-195`), enabled only when `missingImageShots>0`.

---

## 5. Continuity composition / preview (`continuityCompositionService.ts`, deterministic)

### 5.1 Call chains
- Stage 9: `Stage9PromptSegmentation.tsx:174-194` `loadContinuityPreview` (React state, not react-query; reloaded on mount, on `assignmentsVersion` change, after "generate all prompts" `:264`, after single-shot regenerate `:301`; NOT on start-continuity change) → `locationContinuityService.fetchContinuityPreview` → `GET /api/projects/:id/scenes/:sceneId/continuity-preview` (`projects.ts:3283-3456`) → per shot preview → rendered by `<ContinuityPreviewPanel>` (`Stage9PromptSegmentation.tsx:716-722`).
- Stage 10: `useQuery(['stage10-continuity-preview',...], staleTime 30s)` (`Stage10FrameGeneration.tsx:261-269`) → same route → `packages` → `ContinuityBaseChooser` (`:1156-1166`).

### 5.2 Route data assembly (`projects.ts:3310-3445`)
Reads shots (incl. location/direction/base/start_continuity), `continuityCompositionService.loadSceneAssetsForContinuity(sceneId)` (scene_asset_instances + project_assets, completed character `asset_angle_variants`, ordered `location_views`) (`continuityCompositionService.ts:490-609`), branch location names/images (the `locationImageById` map is passed but **never read** by the service), shot asset assignments (`shotAssetAssignmentService`), candidates via `continuityBaseService.listCandidatesForShots` (one query), selected base via `pickCandidateById(candidates, shot.selected_continuity_base_frame_id)`.

### 5.3 `buildGenerationPackage` (`:611-696`)
1. `scopeAssetsForShotContinuity` (`promptGenerationService.ts:344-363`): location assets kept only if `project_asset.id === shot.location_asset_id` (no location ⇒ no location assets at all); non-location assets filtered by shot assignments if any.
2. `enrichAssetsWithAngleMatch` (`promptGenerationService.ts:370-439`): character angle variant by camera; location: `matchShotToLocationView` (`:239-290`: assigned direction if it is among this location's directions; else score height +2, distance +1, alias word ≥3 chars in action/setting +3; score 0 ⇒ primary or first) and `location_reference_strategy`:
   ```
   hasAssigned && matched.image → 'matched_direction'
   hasAssigned && matched       → 'direction_missing_image'
   !hasAssigned && matched.image→ 'fallback_primary_direction'
   establishing.image           → 'fallback_establishing'
   asset image/master           → 'fallback_asset'
   else 'text_only'
   ```
   `hasAssigned` is `!!shot.camera_direction_id` even when that id belongs to ANOTHER location; then the scored view is labeled `location_direction_main` with reason "Using assigned direction view ... as the main location reference." (mislabel; reachable after a manual location change that leaves the old direction id).
3. Manifests: with assignments `buildFrameReferenceManifests` (presence-aware start/end: throughout→both, enters→end, exits→start, passes_through→neither, `:605-611`), else `buildNumberedImageManifest` (sort location→character→prop; location: direction view [main or fallback] + establishing + baseline asset fallback; `role:'style'` for locations, `'identity'` for characters/props).
4. If continuity base: prepend entry `id: continuity-base-<frameId>`, label "Continuity base — Shot X", `role:'continuity_base_frame'`, providerRole identity, reason "`<base.reason>` Use this approved frame|generated frame as the visual base; preserve framing and content unless the delta prompt requests changes." (`:288-320`).
5. `generationMode` (`:256-264`): base ⇒ `reuse_edit`; else `start_continuity` match ⇒ `match_copy`; camera_change ⇒ `camera_change`; else `fresh`.
6. Risk notices (`:439-466`) verbatim: "This shot has no canonical linked location." / "The linked location is not available in this scene asset set." / "No usable location image will be attached for generation." / "No camera direction is assigned; location continuity will rely on fallback adaptation." / "Assigned direction view is missing an image."
7. Strength (`:468-487`) verbatim:
   ```
   if (continuityBase) { strong → risks.length ? 'usable' : 'strong'; usable → 'usable'; weak → 'weak'; }
   if (!shot.location_asset_id) return 'missing';
   if (!locationAsset) return 'missing';
   if (!manifest.some(ref => ref.assetType === 'location')) return 'weak';
   if (manifest.some(ref => ref.role === 'location_direction_main')) return risks.length ? 'usable' : 'strong';
   if (manifest.some(ref => ref.role === 'location_asset_fallback' || ref.role === 'location_establishing_context')) return 'usable';
   return 'weak';
   ```
8. `framePromptInstructions`, `continuityPromptInstructions`, `fallbackChain`, `adaptationNotes`, `providerReadyReferences`, `persistedStartFrameManifest/EndFrameManifest`, `debugMetadata` are computed. **No caller outside the service/tests consumes `framePromptInstructions`, `continuityPromptInstructions`, `providerReadyReferences` or `persisted*Manifest`** (grep over `src` and `backend/src`). They do not reach any prompt or provider; preview-only/DEAD outputs.

### 5.4 Preview vs actual generation (divergence, CONTRADICTED)
Actual start-frame references at generation = `shots.reference_image_order` as last persisted (by Stage 9 `generate-prompts` `projects.ts:3851`, Stage 10 reference editor, continuity-base PUT, chain/add-frame-as-reference, copy-frame cleanup) + base image prepended if absent (`frameGenerationService.ts:698-700`). The preview recomputes a manifest from current DB state. Divergence sources: (a) generate-prompts uses its own asset loader (`projects.ts:3622-3727`, DUPLICATED of `loadSceneAssetsForContinuity`) whose `location_views` query is **unordered** (affects `directions[0]` fallback/establishing pick) and applies transformation-event overrides that preview does not; (b) any view/assignment/location change after prompt generation changes the preview but not the persisted order; (c) user edits in Stage 10 are not reflected in the preview. The "parity" tests (`continuityCompositionService.test.ts:186-318`) feed `pkg.persistedStartFrameManifest` in as the DB value, so parity holds only by construction.

### 5.5 Stage 9 `ContinuityPreviewPanel` (`ContinuityPreviewPanel.tsx:71-221`)
Displays strength badge (labels "Strong continuity/Usable/Weak/No continuity"), generationMode, location name or "Unlinked location", direction alias/name, selected base or **top candidate as "Suggested base"**, reference thumbnails with role labels + providerRole + reason, fallback chain, adaptation notes, risk notices. "Repair in Stage 8" button shown if strength weak/missing or any risk notice; calls Stage 9's `onBack` (`Stage9PromptSegmentation.tsx:721`). Pure display; no mutations.

---

## 6. Continuity base (reuse/edit) — `continuityBaseService.ts`

### 6.1 Candidate pool and ranking (`:83-266`)
- Query (`:138-173`): `frames` with inner join `shots!frames_shot_id_fkey` and `scenes`, `frame_type='start'`, `status IN ('approved','generated')`, `shots.scenes.branch_id = branchId`, `image_url not null`. Pool = all start frames in the whole branch (any scene, any shot order, including later shots). End frames never candidates.
- Excludes the requesting shot, rows without image, and rows whose shot `location_asset_id` ≠ query location. Query with null location ⇒ `[]` (no DB call).
- Tiers verbatim:
  - same direction (both set, equal) → `strong` 0.95 "Same canonical location and same camera direction."
  - both directionless → `usable` 0.7 "Same location; neither shot has a pinned camera direction."
  - one side directionless → `usable` 0.6 ("...the candidate has no direction so adapt the angle in the prompt." / "...this shot has no direction so the candidate provides the angle.")
  - both set, differ → `weak` 0.4 "Same location but the camera direction differs; treat composition as a delta."
  - +0.03 same scene (reason + " Same scene continuity."), +0.02 approved; cap 1.
- Sort: tier desc, confidence desc, approved before generated, `approvedAt||generatedAt` desc. Truncate to `DEFAULT_CANDIDATE_LIMIT = 8`. `missing` tier is declared but never produced.

### 6.2 Selection route `PUT /:projectId/scenes/:sceneId/shots/:shotId/continuity-base` (`frames.ts:1574-1682`)
Checks project ownership, scene in active branch, shot in scene. Clear (`clear` or `frameId===null`): strips `referenceRole==='continuity_base_frame'` entries, renumbers labels `Image #n`, sets `selected_continuity_base_frame_id=null`. Select: recompute candidates for this shot (`listCandidates`), must be among the top 8 else **400** "Selected frame is not a valid continuity base for this shot"; prepend `continuityBaseReferenceEntry` (`:52-65`, reason "... Use this approved frame|generated frame as the primary edit/reuse base.") and persist both columns. Returns `{selectedContinuityBase, candidates, referenceImageOrder}`. Does NOT change `start_continuity`.

### 6.3 UI: `ContinuityBaseChooser` (`Stage10FrameGeneration.tsx:77-182`)
Shows "Continuity Base" with "Using Shot X" or "Fresh generation"; up to 3 candidates (selected one prepended if not in list); "Use" → `updateContinuityBaseMutation` (`:439-451`) → `frameService.updateContinuityBase` → PUT above; "Fresh" → clear. On success invalidates `['frames']`, `['stage10-continuity-preview']`, `['continuity-preview']` (the last key matches no query — Stage 9 uses local state).
Selected base displayed comes from `packageData.selectedContinuityBase` = `pickCandidateById(top8)`; if the persisted base frame drops out of the top 8 or no longer shares the location, the chooser shows **"Fresh generation"** although `shots.selected_continuity_base_frame_id` is still set and generation still uses it (CONTRADICTED UI state).

### 6.4 Consumption at generation (`frameGenerationService.ts`)
- `fetchShotReferenceImageContext` (`:626-709`): if selection set and base frame has image and status approved|generated → role `reuse_match` if same direction else `reuse_edit`; reason "Same canonical location and same camera direction." / "Same canonical location; adapt framing as needed." / "User-selected continuity base; verify the location still matches the shot." (no location re-validation); base url prepended if not already in persisted refs. If base frame missing/rejected/pending → silently ignored, selection kept.
- Bulk generate (`:350-372`) and single regenerate (`:1018-1044`): base takes precedence over `start_continuity` (match/camera_change ignored), only for start frames; bulk only when start frame status pending/rejected. Prompt = `buildReuseEditPrompt` (`:542-554`), a paid image job with lineage `generated_from_frame_id=base`, `continuity_base_role=reuse_match|reuse_edit`.

---

## 7. Frame links and start-frame sourcing

### 7.1 Link types (semantics as implemented)
- `match`: target frame is a pixel copy of source (`image_url`/`storage_path` copied). Created by copy-frame (`frames.ts:2099-2103`, upsert onConflict target) and batch-link-copy (`:1949-1953`). "Reactive": `propagateFrameLinks(sourceFrameId)` (`frameGenerationService.ts:1545-1596`) copies source `image_url/storage_path` to every match target with prompt_snapshot "[Auto-propagated from linked source X]" — called from routes regenerate (`frames.ts:408`), inpaint (`:468`), upload-frame-image (`:1215`), select-generation (`:1372`). Not called on async job completion (`ImageGenerationService.ts:516-535` only updates the frame itself); for regenerate/inpaint the propagation runs immediately after job creation, when the source still holds its old image → the targets get no new image (P / likely ineffective; runtime would settle). Not recursive (no chained propagation).
- `reference`: one-shot; created only by add-frame-as-reference (`frames.ts:1033-1043`, delete existing link on target then insert). Consumed only when target start frame's shot is `camera_change`: generation looks up `frame_links` reference link for the start frame, uses source image, else previous shot's end frame (`frameGenerationService.ts:404-428`, `:1130-1172`).
- Breaking: explicit `DELETE .../frame-links/:linkId` (`frames.ts:2253-2284`); implicit delete of incoming links on regenerate (`:393`), upload (`:1140`), select-generation (`:1350`), add-frame-as-reference (`:1035`); copy-frame upsert replaces existing link on target.
- GET frames returns all links touching the scene's frames (`frames.ts:109-132`); Stage 10 `getContinuityLink` (`Stage10FrameGeneration.tsx:644-684`) labels "Push Match TO / Pull Match FROM / Ref Source → / Ref FROM" in FramePanel (`FramePanel.tsx:495-517`); selecting a non-current generation on a match target prompts confirmation (localStorage `skipContinuityBreakConfirm`, `FramePanel.tsx:423-430`).

### 7.2 How a shot's start frame is sourced (decision order at generation)
Bulk (`generateFrames`, `frameGenerationService.ts:342-452`; `previousEndFrameId` = end frame id of the previous processed shot in this request that `requires_end_frame`):
1. selected continuity base valid → reuse/edit job.
2. `start_continuity==='match'` && previous end frame id → copy prev end frame image (zero cost, no job, no frame_link) with `generated_from_frame_id`, role `match_copy`; if prev end frame has no image → normal generation.
3. `camera_change` && prev end id → reference link source image or prev end image → `generateWithCameraChangeAnalysis` (vision + LLM prompt + paid job, role `camera_change_ref`); no image → normal generation with `frame_prompt`.
4. else normal generation with `shot.frame_prompt` + persisted refs (no lineage written; earlier `generated_from_frame_id` is not cleared → stale lineage, `startFrameGeneration` `:876-881`).
Single regenerate (`regenerateFrame`, `:1018-1189`): same order; match looks up previous shot (by `shot_order`) end frame with status generated|approved, copies with zero-cost `image_generation_jobs` row.
Cross-scene: none of the automatic paths use the previous scene's end frame; only manual "Pull match/ref" buttons (FramePanel `:705-726`) can target `adjacentSceneFrames.prevSceneEndFrame`.

### 7.3 Owned link routes (call chains)
| UI | Handler | Route | Effects |
|---|---|---|---|
| FramePanel "Pull match <prev>" (start) / "Pull match <next>" (end) | `onMatchFromFrame` → `copyFrameMutation` (`Stage10FrameGeneration.tsx:464-474`, `:1219-1225`) | `POST .../shots/:shotId/copy-frame` (`frames.ts:1969-2142`) | Source must have image and status generated|approved; upsert target frame: copy image, status `generated`, prompt_snapshot "[Copied from Shot X start|end frame]", `previous_frame_id`/`generated_from_frame_id`=source, role match_copy|manual; zero-cost completed `image_generation_jobs` row; `generation_count+1`; upsert `frame_links(match)`; remove `type==='continuity'` entries from the target column. Does not change `start_continuity`. |
| "Push match <prev>" (start panel) | `onPushMatchToFrame` → copy-frame with `shotId: prev.id, sourceFrameId: current start, targetFrameType:'end'` (`:1233-1242`) | same | Writes previous shot's END frame from current START (backward link). |
| "Pull ref"/"Push ref" | `refFromFrameMutation` (`:477-487`) | `POST .../add-frame-as-reference` (`frames.ts:936-1057`) | Prepend `{label:'Continuity', assetName:'Shot X Frame', url, type:'continuity'}` to start or end ref column (replacing prior `type:'continuity'`); find-or-create target frame (pending); delete any link on target; insert `reference` link; if start → `start_continuity='camera_change'`. Toast "Regenerate this frame to apply the new camera angle reference". |
| Sidebar "Link All" | `batchLinkMutation` (`:507-516`, `:1015-1028`) | `POST .../batch-link-copy` (`frames.ts:1814-1963`) | For shots 2..n: set `start_continuity='match'`; if prev shot end frame generated|approved with image → overwrite current start frame (copy, status generated, prompt_snapshot "[Batch copy from Shot X end frame]", lineage match_copy), zero-cost job, upsert `match` link. Overwrites existing start frames including approved ones; no confirmation. Returns `{copied, modeSet}`. |
| Sidebar "Unlink" | inline loop (`:1029-1044`) | `PUT .../shots/:id/prompts {startContinuity:'none'}` ×(n-1) | Sets none and clears `continuity_frame_prompt` (`projects.ts:3531-3534`); **does not delete frame_links**. |
| Link badge "break" | `breakFrameLinkMutation` (`:519-525`) | `DELETE .../frame-links/:linkId` | Deletes by link id only (no check that link belongs to the project). |
| — | `frameService.chainFromEndFrame` (`frameService.ts:372-396`) | `POST .../chain-from-end-frame` (`frames.ts:877-930`) | Prepends `{label:'Continuity', assetName:'Previous End Frame', url: endFrameUrl, type:'continuity'}` to `reference_image_order`; `fromShotId` ignored; no frame_link. **No UI caller** (ORPHANED). |

### 7.4 Reference editor / available references
- Stage 10 `FramePanel` thumbnail "replace" popover queries `['available-references',...]` (`FramePanel.tsx:173-177`) → `GET .../shots/:shotId/available-references` (`frames.ts:1688-1808`). Returns, per scene asset instance, options in fixed insertion order (no ranking, `shotId` unused): scene instance image (`scene_instance`), master image if different (`master`), confirmed transformation `post_image_key_url`s (`transformation_post`), all `asset_angle_variants` with image (no status filter) (`angle_variant`). Excludes location views, frames, establishing images. Assets with no options are omitted.
- The popover matches options by `assetName.toUpperCase()`; continuity entries ("Previous End Frame", "Shot X Frame", "Shot X") never match → popover shows a spinner indefinitely (`!assetOptions` branch, `FramePanel.tsx:620-624`).
- Replacement swaps only `url` (keeps id/referenceRole) and calls `PUT .../reference-images` (`frames.ts:1498-1568`): validates `frameType`; for start: if a `continuity_base_frame` entry exists whose id ≠ `continuity-base-<selected>` → 400; if a base is selected and the payload has no base entry → clears `selected_continuity_base_frame_id`. Otherwise stores the array verbatim (no URL validation).

---

## 8. Start-continuity mode lifecycle (STATE)
Writers of `shots.start_continuity`:
- Stage 9 generate-prompts: **overwrites** with deterministic `aiStartContinuity` for every successfully generated shot (`projects.ts:3855-3856`), discarding any user choice; also overwrites `reference_image_order`/`end_frame_reference_image_order` wholesale (drops continuity base and `type:'continuity'` entries; selection column kept and re-applied at generation).
- `determineContinuityLink` rules (`promptGenerationService.ts:1014-1045`) verbatim: first shot → `none`; continuity_flags matching `/cut|jump|transition|time.?skip|new.?scene|later/i` → `none`; setting text (lower/trim) differs → `none`; same `parseCameraField` shotType && angle → `match`; else `camera_change`.
- Stage 9 per-shot Select "None (Independent)/Match ←/Angle Change ←" (index>0) → `promptService.updatePrompt` → `PUT .../prompts` (`Stage9PromptSegmentation.tsx:755-796`).
- `none` clears `continuity_frame_prompt` (`projects.ts:3531-3534`).
- add-frame-as-reference (start) → `camera_change`; batch-link-copy → `match`; Stage 10 "Unlink" → `none`.
- `Stage10FrameGeneration.tsx:528-551` `updateContinuityMutation` is declared but never `.mutate`d (DEAD).
UI signals: Stage 10 sidebar link glyphs and summary "Fully continuous scene / No continuity links / k of n shots linked" (`:743-751`).

`continuity_frame_prompt`: written by generate-continuity-prompt route and overwritten by every camera-change generation (`frameGenerationService.ts:820-827`); **never read by any generation path** (grep). Stage 9 textarea is readOnly with help text "This prompt will be used instead of the Frame Prompt when generating with camera change continuity." and placeholder "Continuity prompt will be generated when prompts are generated..." (`Stage9PromptSegmentation.tsx:884-891`) — both CONTRADICTED by code (generation builds a fresh prompt; generate-prompts never writes it).

---

## 9. AI calls in this slice
| id | Callsite | Provider/model | Prompt | Trigger | Output/persist |
|---|---|---|---|---|---|
| A1 | `routes/frames.ts` generate-continuity-prompt (`:2148-2247`) → `promptGenerationService.generateContinuityFramePrompt` without `referenceFrameAnalysis` (`promptGenerationService.ts:1360-1432`) | `llmClient.generate` (LangChain `ChatGoogleGenerativeAI`, model `process.env.GEMINI_MODEL || 'gemini-1.5-flash'`, temp 0.7, maxTokens 1024, operation `continuity_frame_prompt`, stage 9 metadata) (`llm-client.ts:64-140`, `promptGenerationService.ts:1456-1475`) | System: "You are a visual prompt engineer for AI image generation. You are generating a RECOMPOSITION FRAME — a new camera angle of an existing scene moment. ..." with PRESERVED list, "Camera position: from {prev shotType angle} to {curr}", 5-part structure, "Max 1200 characters"; ASSET DESCRIPTIONS from `buildAssetContext(enrichAssetsWithAngleMatch(sceneAssets))` (all scene assets, not shot-scoped), style capsule context. User: shot id/duration/camera/prev camera/action/setting/fg/bg chars. | Stage 9 "Regenerate" (camera_change shots) `Stage9PromptSegmentation.tsx:850-881`; Stage 10 buttons `Stage10FrameGeneration.tsx:1476,1495` | `cleanPromptOutput(…,1200)` (strip fences/JSON/quotes, truncate) → `shots.continuity_frame_prompt` (display only). 30 s timeout race + llmClient retry. Rejects shot index 0 (400). |
| A2 | `frameGenerationService.generateWithCameraChangeAnalysis` (`:720-840`) → same function WITH `referenceFrameAnalysis` | same LLM | Same system prompt plus "REFERENCE FRAME ANALYSIS (from vision analysis of the actual reference image): … Use this analysis as ground truth…" | Bulk generate / regenerate for start frames with `start_continuity==='camera_change'` and a reference image (link source or prev end) | Prompt sent to image job (`startFrameGeneration`), also written to `continuity_frame_prompt`; continuity entry url in `reference_image_order` refreshed to ref url (`:829-839`). If first shot, prev = current. |
| A3 | `imageAnalysisService.analyzeReferenceFrame` (`imageAnalysisService.ts:122-156`) | `@google/generative-ai` `gemini-2.5-flash`, inline image bytes | "You are a visual continuity analyst for film production. Analyze this frame and extract … CHARACTERS … ENVIRONMENT … LIGHTING … ATMOSPHERE … 300-500 characters total." | Inside A2 | Free text passed into A2; not persisted. No retry/fallback here (errors propagate). |
| A4 | `frameGenerationService.buildReuseEditPrompt` (`:542-554`) → image job | Image provider (via `ImageGenerationService`; provider/model owned by image slice) | `${frame_prompt}\n\nREUSE/EDIT CONTINUITY BASE: The first attached reference image is the selected base from Shot X. {reason} {directionRule} Treat the shot prompt above as the delta: ...`; directionRule reuse_match: "Preserve the base frame camera angle, framing, lighting, location appearance, subject identity, and unchanged props exactly." else "Use the base frame as the primary identity and lighting anchor, then adapt only the camera/framing and visible action required by this shot." | Start-frame generation when a valid base is selected | Image job; frame lineage. |
Deterministic (no model): resolver, coverage, composition/preview, base ranking, risk analyzer, `determineContinuityLink`, match copies, batch link, propagation.

---

## 10. Scene continuity risk (`continuityRiskAnalyzer.ts`, deterministic)
Rules verbatim (`:50-84`): "1. If no prior scene (Scene 1), always safe 2. If prior scene status is not 'video_complete', mark as 'risky' 3. If upstream artifacts (Stage 1-4) changed since scene was last modified, mark as 'broken' 4. If scene status is 'continuity_broken' or 'outdated', mark as 'broken'". Rule 3: `max(stage_states.created_at for stage 1..4) > scene.updated_at` (`:99-126`). Inputs from `GET /:id/scenes` (`projects.ts:1050-1106`): all `stage_states` rows for stages 1–4 of the branch (all versions), prior scene = previous element by scene_number (deferred scenes included). Output `continuityRisk` → `sceneService.ts:50` → Stage 6 badges (`Stage6ScriptHub.tsx:329-339,537-558`). Only `videoGenerationService.ts:525-530` sets `video_complete`, so every scene after an unfinished scene is `risky` and rule 3/4 are only reachable once the prior scene's videos complete. Imported via `await import('../services/continuityRiskAnalyzer')` without `.js` (`projects.ts:1093`) — the only extensionless relative import in backend; backend is `"type":"module"` with `start: node dist/server.js` → under compiled Node ESM this likely throws (UNKNOWN; works under `tsx` dev).

---

## 11. Invalidation / staleness summary
- Persisted decisions: `location_asset_id` + match metadata, `camera_direction_id`, `start_continuity`, `selected_continuity_base_frame_id`, `reference_image_order`, frame_links, frame lineage.
- Computed on the fly (never stale in DB, but UI caches): location state & candidates (every shot-list GET), coverage (react-query, invalidated after direction change/view create/generate), preview packages (Stage 9 local state; Stage 10 30 s staleTime, not invalidated by frame generate/approve mutations → candidate list may lag), metrics, risk.
- No server-side invalidation exists for: base selection when shot location/direction changes or base frame is rejected/regenerated (image used is the frame's current image); `reference_image_order` when location/direction/views change (only regenerating Stage 9 prompts rebuilds it); frame_links when `start_continuity` set to none; `generated_from_frame_id` on fresh regeneration; location assignments when an asset is renamed or aliases change (until a setting edit or Re-run Resolver).

---

## 12. Tests
- `backend/src/tests/continuityBaseService.test.ts` — tiers, bonuses, exclusions, sort, limit, batch single-query, pickCandidateById.
- `continuityCompositionService.test.ts` — base first/reuse_edit; "preview/generation parity" (by construction, §5.4).
- `continuityRiskAnalyzer.test.ts` — all 4 rules, priorities, edge cases.
- `locationCoverageService.test.ts` — grouping by `location_asset_id`, advanced severity, missing image (3 tests; no mismatch test).
- `locationResolver.test.ts` — normalization, exact, alias, direction-parent precedence, ambiguity not auto-applied, scene fallback.
- `shotLocationRoutes.test.ts` — PUT shot re-resolve, manual assign, resolve-locations preserving manual, location-coverage route, camera-direction route.
- `continuityBaseAndModeRoutes.test.ts` — continuity-base select/clear/400/404; continuity-mode; continuity-metrics.
- `referenceContinuity.test.ts` — add-frame-as-reference (link + start_continuity), copy-frame cleanup of continuity refs, 401s.
- `src/components/pipeline/__tests__/ContinuityBaseChooser.test.tsx` — loading/empty/select/clear/disabled.
- Untested: continuity-preview route, available-references, batch-link-copy, chain-from-end-frame, frame-links delete, generate-continuity-prompt, reference-images base guard, propagateFrameLinks, LocationCoveragePanel, ContinuityPreviewPanel. No e2e references.

---

## Cross-slice references
- `projects.ts:809-1010` continuity-mode / continuity-metrics (V1): metrics counts `location_match_source === 'ambiguous'` (`:945`) but that value is forbidden by the DB CHECK (mig 039) and never written → `ambiguousBaselineLocations` always 0. `strictValidation.canProceed` disables Stage 10 Lock & Proceed (`Stage10FrameGeneration.tsx:283-286,886,1697`).
- `projects.ts:1711-1977` shot extraction (Stage 7 slice): AI `ShotExtractionService.extractShots` gets `locationDirections`/`locationName`, returns `newDirections` and `camera_direction_name`.
- `projects.ts:3573-3960` generate-prompts (prompt slice): duplicated asset loader; writes `reference_image_order`, `start_continuity`; `generatePromptSet` receives `contCtx {mode, previousCamera}` (`promptGenerationService.ts:1089-1093`).
- `projectAssets.ts:~3190-3285` establish-view-from-frame; `projectAssets.ts:628-638` location_aliases write; location view CRUD/generate/suggest (asset slice).
- `frameGenerationService.ts` generate/regenerate/startFrameGeneration (frame slice); `ImageGenerationService.ts:516-535` frame update on job completion without propagation.
- `Stage7ShotList.tsx:313-345,626-690,936-956,1336-1440` location UI (Re-run Resolver, Select, Clear, Accept candidate).
- `Stage10FrameGeneration.tsx:1264-1282` `EstablishViewPrompt` (Phase G) — promotes a frame into a direction view.
- `src/types/locationContinuity.ts:209-210` types `persistedStartFrameManifest` as `GenerationReferenceManifestEntry[]` while backend returns `ReferenceImageOrderEntry[]` (shape mismatch; unused on frontend).

## Contradictions / unknowns
1. Two location-state classifiers (0.72 vs 0.8 thresholds; ambiguous only in route) — §3.4.
2. `direction_location_mismatch` coverage state unreachable; mismatched direction id instead surfaces as `fallback_view` in coverage but as `location_direction_main`/"assigned direction" in preview/prompt references — §4.2, §5.3.
3. Preview manifest ≠ generation references (separate loaders, transformation overrides, unordered views, user edits) — §5.4; preview instructions never used — §5.3.8.
4. Base selection display drops out (top-8 / location change) while generation still uses the base — §6.3.
5. `continuity_frame_prompt` UI help text vs code — §8.
6. Propagation on regenerate/inpaint likely copies the stale image (async job) — UNKNOWN without runtime; would be settled by observing a match target after a source regenerate completes.
7. Extensionless dynamic import of risk analyzer under compiled ESM — UNKNOWN; settle by running `node dist/server.js` and calling GET scenes.
8. Authorization gaps (service-role client): chain-from-end-frame/add-frame-as-reference/copy-frame/batch-link-copy/available-references/reference-images/generate-continuity-prompt do not verify the scene belongs to the project; source frames are not checked for ownership; DELETE frame-links deletes any link id.
9. `location_match_events` is write-only; "calibration" use UNKNOWN (no reader in repo).
10. batch-link-copy overwrites existing (even approved) start frames without confirmation.

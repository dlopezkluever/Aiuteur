# 05 Writing & Story System

> Scope: treatment, beat sheet, master script, scene breakdown, AI writing and rewrite rules, writing style capsules, and story-change propagation. Legacy product thinking, not a description of current behavior. Legend: see 00-README.

## Narrative chain and shared context

Phase A narrows the story in three passes: Stage 2 treatment (prose) → Stage 3 beat sheet (structure) → Stage 4 master script (screenplay). Approving the script freezes it and splits it into scenes for Phase B.

- **WD-IDEA-STORY-001** [impl] Each writing stage reads only its upstream: treatment from the processed Stage 1 input; beats from the selected treatment alone (unselected variants never flow on); script from beats (and treatment, see Options below); assets from the script's scenes.
- **WD-IDEA-STORY-002** [impl] Every AI writing step is conditioned on the same project parameters: target screen-time range in seconds, project type (narrative, commercial, audio-visual), content rating (G/PG/PG-13/M), genres, free-text tonal guidance, plus the writing style capsule. Treatment also sees the story idea and optional uploaded context files. Rating sets baseline limits on dialogue and action; target length makes generation adjust narrative density to fit the time.
- **WD-IDEA-STORY-003** Narrative stages inherit all global intent: they may refine the global tone but never contradict it. ‹src: inheritance_contract›
- **WD-IDEA-STORY-004** [impl] Visual storytelling is preferred throughout: treatments favor visual storytelling over dialogue-heavy sequences, and scripts are visually rich because later stages generate images from them. ‹src: system-prompts-inventory›

## Treatment (Stage 2)

- **WD-IDEA-STORY-005** Treatment is continuous high-level prose with no scene breaks or beats; scene structure is introduced later.
- **WD-IDEA-STORY-006** [impl] AI generates exactly three treatment variants at once, each structurally different (different ending, chronology, or tonal emphasis), each labeled with its approach (e.g. "dark ending", "redemption arc") and an estimated runtime so the user can compare them.
- **WD-IDEA-STORY-007** [impl] Each variant is a complete 3-act story arc sized to the target runtime, roughly 800-1200 words.
- **WD-IDEA-STORY-008** Quality expectation: clear character arcs; dialogue hinted at but not fully scripted; emphasis matched to genre (spatial relationships and timing for action, clearly defined character roles). ‹src: golden-test-evaluation-framework›
- **WD-IDEA-STORY-009** [impl] Treatments generate automatically on first visit, with a manual "Generate Treatments" fallback when none exist.
- **WD-IDEA-STORY-010** The user must pick one variant to proceed; the choice is recorded. Legacy docs describe a variation gallery (cards) for switching the active variant later, updating the current branch.
- **WD-IDEA-STORY-011** [impl] The user can generate an additional variation on demand. ‹src: current-app-user-flow›
- **WD-IDEA-STORY-012** [impl] Treatments are directly editable as rich text in an edit mode with explicit save; switching variants with unsaved edits asks for confirmation.
- **WD-IDEA-STORY-013** [impl] Full treatment regeneration with guidance replaces all three variants, keeping no history. ‹src: planning-wif-lawrence›
- **WD-IDEA-STORY-014** [impl] Known limitation: no way to paste or import one's own treatment, and manual edits stay attributed to the AI variant, so a user-written version cannot be kept as the "original". ‹src: planning-wif-lawrence›

## Beat sheet (Stage 3)

- **WD-IDEA-STORY-015** A beat is one atomic plot event or emotional shift that advances the story: self-contained, action-oriented (what happens, not mood), linked by cause and effect to its neighbors.
- **WD-IDEA-STORY-016** [impl] Beat extraction targets 15-30 beats of 1-3 sentences, in a numbered list, chronological unless non-linear storytelling is intended, together covering the full arc.
- **WD-IDEA-STORY-017** Quality expectation: beat count scales with complexity (about 8-12 for a simple scene, 15-25 for an action sequence, 20-30 for a 15-minute podcast); beats follow setup → rising tension → resolution, with specific physical actions, timing relationships, and escalating stakes. ‹src: golden-test-evaluation-framework›
- **WD-IDEA-STORY-018** [impl] Each beat carries a rationale for why it is structural, an estimated screen time derived from target length, and the treatment excerpt it came from; the sheet reports total estimated runtime and a named structure (3-act, hero's journey, non-linear).
- **WD-IDEA-STORY-019** [impl] Each beat records whether the user edited it by hand.
- **WD-IDEA-STORY-020** [impl] Beats generate automatically on first visit, with a manual fallback; generation must visibly produce output (an early "does nothing" failure was a ticket).
- **WD-IDEA-STORY-021** [impl] Beat sheet generation may produce several variations (e.g. three); status messages must match what is actually produced and shown. ‹src: Tickets, master-mvp-tasklist›
- **WD-IDEA-STORY-022** [impl] Drag-and-drop reordering to experiment with chronology; numbers update instantly. Drag-and-drop is part of the general interaction toolkit (beats, shots).
- **WD-IDEA-STORY-023** [impl] Each beat is a click-to-edit field that also supports targeted regeneration of part or all of the beat (e.g. "make this beat more dramatic").
- **WD-IDEA-STORY-024** Adding a beat opens the guidance box; AI writes the new beat from the guidance using adjacent beats as context. In the built form, "add after any beat" inserts a placeholder ("New beat — describe what happens here...").
- **WD-IDEA-STORY-025** Removing a beat is a plain deletion; the next beat becomes the continuity anchor.
- **WD-IDEA-STORY-026** [impl] Beat context view: each beat expands (or opens a modal) to show the exact treatment prose it came from, giving traceability from structure back to prose.
- **WD-IDEA-STORY-027** [impl] Brainstorm alternatives for one beat (e.g. "3 alternative resolutions for Beat 10"): three versions that keep the same narrative function and screen time and stay consistent with surrounding beats while varying tone, action, or character focus; the user picks one to replace the original.
- **WD-IDEA-STORY-028** [impl] Split/expand a beat into 2-3 sub-beats, optionally guided; total screen time and cause-and-effect flow are preserved.
- **WD-IDEA-STORY-029** [impl] Full beat-sheet regeneration requires written guidance (min 10 characters) and a treatment source.
- **WD-IDEA-STORY-030** [impl] Confirmation rules: at least 3 beats, each at least 10 characters.
- **WD-IDEA-STORY-032** [voice] Beat durations must be editable: new beats default to 20 seconds, which is wrong for short moments, so offer a dial to nudge length or direct time entry. ‹src: new-tasks›
- **WD-IDEA-STORY-033** [voice] Projected runtime should be visible so the user can track ballooning (e.g. a 2-3 minute project producing 6 scenes of 6-10 eight-second shots). Placement options: ‹src: new-tasks›
  - sum of beat durations on the beat sheet;
  - projected runtime in the Script Hub;
  - running tally of all planned shots and durations in the shot list.

## Master script (Stage 4)

### What the script is

- **WD-IDEA-STORY-034** [impl] The master script is a "visually verbose blueprint" (the "Verbosity Engine"), not a concise theatrical script: AI maximizes description so every element can become an image. It covers:
  - character appearance, clothing, posture, expressions, body language;
  - setting, lighting, atmosphere, mood, spatial layout;
  - props and their visual significance;
  - camera-ready action and camera implications (no technical specs yet);
  - choreography of every movement and gesture; emotional subtext through visual cues.
- **WD-IDEA-STORY-035** Standard screenplays are concise, flowery, and low on description (no character positioning, attributes, detailed settings, or clear action), so production prompting needs explicit descriptive detail beyond screenplay convention. ‹src: Tickets›
- **WD-IDEA-STORY-036** [impl] Industry-standard format: ALL CAPS scene headings (INT./EXT. LOCATION - TIME), character names, and SFX; character names in caps before dialogue; present-tense action. Every scene opens with a proper, unique heading, which is what later makes scene and location splitting possible.
- **WD-IDEA-STORY-037** Dialogue must be character-specific and purposeful; all dialogue and action must serve the emotional and structural goals of the corresponding beat.
- **WD-IDEA-STORY-038** Quality expectation: names in caps before dialogue; action rich in posture, expression, and setting detail written for image/video generation; natural, personality-revealing dialogue; SFX cues for action; length matched to target (e.g. 2-3 pages). ‹src: golden-test-evaluation-framework›
- **WD-IDEA-STORY-039** Every beat becomes one or more scenes; each scene records which beats it covers, which characters, props, and settings it mentions, and its estimated duration.

### Options: what context script generation reads
- **WD-IDEA-STORY-040** [alt] Full treatment as context while adhering to the beat sheet; script must consume both coherently so a beat edit that drifted from the treatment does not confuse it.
- **WD-IDEA-STORY-041** [alt] Beat sheet, rating, genre, tonal guidance, and capsule only; treatment prose is not seen directly. ‹src: AI-agent-registry-context-flow-architecture›

### Spatial precision in the script

- **WD-IDEA-STORY-042** [voice,impl] Scene headings name the specific sub-location, not just the building: "INT. GINGERBREAD HOUSE - KITCHEN - DAY", not "INT. GINGERBREAD HOUSE"; generation is instructed to produce room-level precision so each heading anchors one space (see 06B). ‹src: 3.7-location-pre-planning, 3.7-location-system-enhancement-(master-doc)›
- **WD-IDEA-STORY-043** [impl, voice] Action lines are spatially explicit: every action anchors characters to positions and states where they move ("They argue across the kitchen counter. He storms out through the hallway toward the front door", "She crosses to the window"), not just mood. This applies to subtle moves in otherwise static scenes ("walks to the corner of the room"). Feeds shot extraction (see 07).

### Options: how mid-scene location changes are written
- **WD-IDEA-STORY-044** [alt, voice] Flag location-dynamic scenes in the slug; action text explicitly describes every setting change, major or subtle ("they walk into the kitchen"), and that description persists so Stage 7 shot extraction catches it. Shot extraction may also use smart detection of in-scene setting changes, complementing the slug flag or the heading split in WD-IDEA-STORY-045. ‹src: 3.7-location-pre-planning›
- **WD-IDEA-STORY-045** [alt, impl] Split into separate headings joined by CONTINUOUS so each heading has exactly one sub-location while narrative flow continues; precise headings plus explicit action suffice, no special "dynamic scene" flag. ‹src: 3.7-location-system-enhancement-(master-doc)›

### Editor and workflow

- **WD-IDEA-STORY-046** [impl, planned] The script auto-generates on first entry if none exists (checks for an existing script, shows loading, falls back if generation fails) so the user never lands on an empty stage; a manual "Generate Master Script" button remains.
- **WD-IDEA-STORY-047** [impl] The screenplay editor understands screenplay elements (scene heading, action, character, dialogue, parenthetical, transition), has a formatting toolbar, and renders industry-standard layout (indented dialogue, consistent spacing); improved character/dialogue handling was a recurring polish goal.
- **WD-IDEA-STORY-048** [impl] Pasted screenplay text is accepted, but there is no one-click file import; a file import was proposed (see 02B).
- **WD-IDEA-STORY-049** [impl] Beat alignment panel: a collapsible, read-only sidebar of beats that highlights the beat matching the visible script section; clicking a beat scrolls to it.
- **WD-IDEA-STORY-050** [impl] Before approval, the user previews the scenes that will be extracted; planned: the preview also shows each scene's characters, location, and props before commit.
- **WD-IDEA-STORY-051** [impl] Approval rules: script not empty, contains INT./EXT. headings, every extracted scene has content. Related: WD-IDEA-INPUT-102 (an import with zero extracted scenes must not claim success).
- **WD-IDEA-STORY-052** [future] Markdown support in editors and syntax highlighting for scripts.

### Script as structured document

- **WD-IDEA-STORY-053** [impl] The script is stored as typed blocks (scene heading, action, dialogue line, transition, paragraph), so the block type is the classification, not a guess from text.
- **WD-IDEA-STORY-054** [impl] A dialogue line is one block in a fixed inline form: CHARACTER NAME, optional extensions (V.O., O.S., CONT'D), colon, optional parenthetical delivery note, then the quoted line.
- **WD-IDEA-STORY-055** Round-tripping a screenplay between plain text and the structured editor must preserve headings, character/dialogue blocks, and parentheticals without loss.
- **WD-IDEA-STORY-056** Legacy docs describe older plain-text scripts converting to the structured form on load and saving in it thereafter, with scenes that have missing dependencies re-extractable once.

## Scene breakdown (script → scenes)

- **WD-IDEA-STORY-058** [impl] Each scene gets a readable slug derived from its heading (e.g. "INT. KITCHEN - DAY").
- **WD-IDEA-STORY-059** [impl] Every scene heading marks a boundary and yields INT/EXT, location, and time of day. Time is recognized from known trailing tokens (DAY, NIGHT, CONTINUOUS, LATER, MOMENTS LATER, DAWN, DUSK, MORNING, AFTERNOON, EVENING); everything between is the compound location (building + sub-location). Headings without a time token and old simple headings still parse; identical compound locations dedupe across scenes. Location sets the scene's expected location; INT/EXT and time feed frame context.
- **WD-IDEA-STORY-060** [impl] Character names with extensions such as (V.O.) count as the same character; empty scripts are handled gracefully.
- **WD-IDEA-STORY-061** [impl] One unified script manifest serves every downstream stage instead of separate extractions at Stages 5, 6, and 8: per scene (heading, INT/EXT, location, time, present and speaking characters, props, ordered dialogue, combined action text) plus global deduplicated characters, locations, and props.
- **WD-IDEA-STORY-062** [idea] Dialogue is captured complete, attributed, extension-aware, mapped to scene, ordered, with parentheticals ("whispering", "angry") kept as delivery context for voice generation (see 09). ‹src: tiptap-json-extraction-guide›

### Options: how scene dependencies are extracted
- **WD-IDEA-STORY-063** [alt] AI pass that pulls each scene's character names, location, and key props from the script. Not the primary method; kept only as a fallback for legacy or unstructured scripts.
- **WD-IDEA-STORY-064** [impl] Deterministic parsing of the structured script (repeatable, fast, cheap), avoiding misclassification such as all-caps action ("THE BUILDING EXPLODES") read as a character; AI extraction is the fallback.

### Options: where descriptive production detail lives (the "Master Document")
- **WD-IDEA-STORY-065** [future] A separate Master Document stage between Stages 4 and 5 turns the base script into a super-descriptive source of truth describing every scene and moment of change, including dialogue moments, with full character, wardrobe, prop, and setting descriptions (e.g. Persephone's glow, smile, tunic, flower crown, berry basket, forest). Deferred past MVP; pipeline stays at 12 stages; prompts pulling rich context from earlier stages stand in for it.
  - Process: finalize script, check inputs for character, asset, location, and action descriptions, then generate the document from the base script.

## Partial rewrites, alternatives, and regeneration

- **WD-IDEA-STORY-069** [impl] Targeted regeneration: highlight any sentence, paragraph, or several paragraphs, open an inline box (right-click / beside the selection), type a custom instruction ("inject more conflict", "make sure the walls are peeling and green"); AI rewrites only the selection using surrounding text as context. Available on treatment, beats, script, and asset descriptions; clearly signposted; the user previews before accepting.
- **WD-IDEA-STORY-070** [impl] Same pattern in Stages 2 and 4: "Edit Selection" returns either one guided rewrite or three alternatives to choose from (script selections require guidance of at least 10 characters).
- **WD-IDEA-STORY-071** [impl] Partial rewrite rule: only the selected text may change; surrounding text is read-only context; the rewrite matches surrounding tone and style and reads naturally in place.
- **WD-IDEA-STORY-072** [impl] The three alternatives must each take a distinctly different creative approach; any guidance applies to all three.
- **WD-IDEA-STORY-073** [impl] Script rewrites and alternatives keep screenplay format, the original's narrative function and timing, and visual verbosity.
- **WD-IDEA-STORY-074** [impl] Every regeneration stores the user's free-text "why" with the new version, and that guidance shapes the output. It covers treatment, beats, script, assets, and scene assets, and is also stored as that version's commit message.
- **WD-IDEA-STORY-075** [planned] Regeneration controls say plainly what will happen, offer confirmation or preview first, and behave identically across stages (notably Stage 4 and the pipeline graphic).
- **WD-IDEA-STORY-076** [planned] Regeneration polish: before/after comparison where it applies, progress indicators, cost shown before regenerating, consistent controls across Stages 2-4. Related: WD-IDEA-UX-070 (cost-aware warning).

### Options: may full regeneration be blind?
- **WD-IDEA-STORY-077** [alt] Full regeneration of treatment, beats, or script is always directed: gated by the mandatory "Why" box (min 10 characters). Legacy app-flow docs describe this as built behavior for Stage 2 treatments; it competes with the blind option in WD-IDEA-STORY-078. ‹src: project-overview›
- **WD-IDEA-STORY-078** [alt, impl] Contextual regeneration: regenerate opens an input for what should change, but a "blind" regeneration option remains, in Stages 2, 3 and wherever regeneration exists. ‹src: Tickets›

## How user edits shape later AI calls

- **WD-IDEA-STORY-079** Manual edits immediately override AI text and are locked and carried forward as input to the next stage.
- **WD-IDEA-STORY-080** When regenerating a script from edited beats, AI may optionally receive the previous script version for comparison and guidance.
- **WD-IDEA-STORY-082** [planned] Reconciliation pass: after clarification Q&A, AI applies answers to the user's own submitted documents with variable edit scope (see 02B):
  - word patch: rename "Marc"→"Marcus" everywhere, near-free find/replace;
  - clause insertion or paragraph rewrite: "the accent is Irish" inserted into one description;
  - structural cascade: a plot answer re-splits or rewrites sections across beat sheet and script.
- **WD-IDEA-STORY-083** [planned] Reconciliation runs once per clarification session across all submitted documents and the full Q&A transcript, identifying every affected document.
- **WD-IDEA-STORY-084** [planned] No silent rewrites: each affected document gets a one-line diff summary, and the review screen shows "N edits applied from your answers", separate from stage provenance badges.
- **WD-IDEA-STORY-085** [planned] A plot-affecting (structural cascade) answer gets its own inline confirmation at answer time ("applying it will rewrite two scenes in your beat sheet and script — proceed?"). Cancelling leaves the document unchanged and leaves no record claiming the edit was applied.

## Writing style capsules

- **WD-IDEA-STORY-086** [impl] A writing style capsule is a user- or system-defined package of example excerpts, optional labels/descriptors (minimalist, ornate, detached, noir, terse), negative constraints (what to avoid), and freeform notes, stored as plain text and injected into prompts. It steers tone, vocabulary, pacing, dialogue delivery, and descriptive style by explicit imitation, not similarity search.
- **WD-IDEA-STORY-087** Capsule selection happens at Stage 1 from system presets, the personal library, or created inline; it is clearly optional, and without one AI defaults to a neutral, descriptive prose style (see WD-IDEA-INPUT-016). ‹src: project-overview›

- **WD-IDEA-STORY-088** [planned,voice] Generation-quality effort: an evaluation framework for rating output, A/B tests of prompting strategies for dialogue and narrative and of system-prompt quality, measurement of how much capsules actually change output, and documentation of what works so the rest can be dropped.
- **WD-IDEA-STORY-089** [planned] The writing AI should handle raunchy dialogue and violent or spicy mature content (nothing illegal), with workarounds for provider censorship.
- **WD-IDEA-STORY-090** [future] Dialogue style training: the user uploads a corpus of their writing, a text model is fine-tuned to their dialogue style, and the custom model is selectable and comparable in the pipeline.

### Options: where the writing capsule is injected
- **WD-IDEA-STORY-091** [alt] Across all writing steps: Stages 1-4, 7, and 9 (treatment, beats, script, and later text steps).
- **WD-IDEA-STORY-092** [alt,planned] Focus on, or limit to, script writing and dialogue, because LLMs are weakest at dialogue; make capsules more effective there.

## Audio-driven projects

- **WD-IDEA-STORY-093** For audio-driven projects, treatments follow the audio's timestamps and topics, suggest visual metaphors for abstract concepts, and complement rather than compete with the audio. Related: WD-IDEA-INPUT-009. ‹src: golden-test-evaluation-framework›
- **WD-IDEA-STORY-094** Their beats align with audio topic transitions, cite timestamps, and each has a clear visual goal (charts, demonstrations, interview shots).
- **WD-IDEA-STORY-095** Their "script" becomes a series of visual scenes timed to the audio, with timing cues tied to timestamps and transitions on topic changes.

## Imported material and skipped stages

- **WD-IDEA-STORY-096** Stage 2 routing: a supplied treatment imports as Stage 2 content (as-is or AI-formatted); notes or long prose generate a treatment; a finished script lets Stage 2 be skipped or optionally backfilled.
- **WD-IDEA-STORY-097** Stage 3 routing: a supplied beat sheet is parsed into structured beats; a treatment generates beats normally; a finished script lets Stage 3 be skipped or optionally reverse-generated.
- **WD-IDEA-STORY-098** Stage 4 routing: a formatted screenplay imports directly with scenes parsed deterministically (Script Skip mode for prepared users); otherwise the script generates from treatment and beats (see 02B).
- **WD-IDEA-STORY-100** Open question: is an imported script the source of truth, or may treatment/beat backfills affect it?

## Keeping treatment, beats, and script in sync

Edits never cascade automatically between the three documents. Each side shows a passive staleness flag, and the user resolves it with an explicit retroactive revision on the same branch.

- **WD-IDEA-STORY-101** [impl] Each side shows its own flag: the beat sheet (Stage 3) shows "Not Up-to-Date with Current Script" and the master script (Stage 4) shows "Not Up-to-Date with Current Beat Sheet" (see WD-IDEA-STORY-102 and WD-IDEA-UX-050), so drift is visible in both directions.
- **WD-IDEA-STORY-102** Editing beats after the script exists sets mutual flags: Stage 3 "Not Up-to-Date with Current Script", Stage 4 "Not Up-to-Date with Current Beat Sheet". Nothing regenerates automatically and no branch is created by the edit itself.
- **WD-IDEA-STORY-103** Resync A, "Retroactively Revise Script": regenerate the script from edited beats plus Stage 1-2 context as a new script version; the Stage 3 flag clears. Also one option for beat-sheet/script drift; the reverse direction is WD-IDEA-STORY-104.
- **WD-IDEA-STORY-104** Resync B, "Retroactively Revise Beat Sheet (to Sync with Script)": re-extract beats from the current script as source truth (reverse sync), as a new beat-sheet version on the same branch; the flag clears. Also one option for beat-sheet/script drift; the forward direction is WD-IDEA-STORY-103.
- **WD-IDEA-STORY-105** Script edits never auto-edit or invalidate the beat sheet; it only shows the passive flag with a manual sync when the user returns.
- **WD-IDEA-STORY-106** The system watches manual script edits for structural deviations (e.g. deleting a whole plot-point scene) and raises a non-blocking flag, resolved by revising the beat sheet retroactively.

### Options: how the treatment follows beat-sheet edits
- **WD-IDEA-STORY-107** [alt] Non-blocking "Not Up-to-Date with Current Beat Sheet" flag on the treatment; "Retroactively Revise Treatment" regenerates the prose from current beats as a new version on the same branch.
- **WD-IDEA-STORY-108** [alt,voice] Treat treatment and beats as codependent: if beats are edited, reactively edit the treatment to include the changes, with a pop-up explaining it; if not, proceed straight to the script. ‹src: new-tasks›

## Story changes downstream (see 10)

- **WD-IDEA-STORY-110** Full script regeneration is high-impact because it breaks all Phase B work. Related: WD-IDEA-UX-071 (cost modal wording).
- **WD-IDEA-STORY-113** [impl] Re-approving the script after scene work exists keeps stable scene identities so existing work survives; removed scenes become "continuity broken" rather than vanishing silently (see 10).
- **WD-IDEA-STORY-114** [voice] Partial story pivot: when unlocking the script, the user chooses which scenes to keep valid (e.g. finished scenes 1-3 while rewriting 4-5 or the ending). Kept scenes stay frozen and uneditable while the rest is edited and regenerated; on approval they remain unchanged in scene storage and the Script Hub, and new scenes fill the rest of the new branch. ‹src: Section-of-story-branch›

### Options: detecting that "a scene changed" in a script revision

Held with their owning topic in other documents: WD-IDEA-CONT-245 (see 04), WD-IDEA-CONT-246 (see 04), WD-IDEA-CONT-247 (see 04).

## Future story tools

- **WD-IDEA-STORY-119** [future] Beat brainstorming agent for AI-assisted ideation.
- **WD-IDEA-STORY-120** [future] Character development assistant.
- **WD-IDEA-STORY-121** [future] Plot hole detection.
- **WD-IDEA-STORY-122** [future] Narrative structure analyzer.
- **WD-IDEA-STORY-123** [future] Alternative ending generator.
- **WD-IDEA-STORY-124** [future] Narrative timeline continuity: story-logic checks, character-motivation consistency, plot-point validation.
- **WD-IDEA-STORY-125** [future] Creative insights on the user's own work: genre/tone analysis, character development tracking, structure visualization, pacing analysis, dialogue analytics.
- **WD-IDEA-STORY-126** [voice, future] "Lore Library" ("Lorerary"): a project-scoped directory of persistent context (character lore, world-building, settings, relationships, history, and world rules) that grows with the project, especially for animated series. Cross-project personal memory is WD-IDEA-PHIL-072; intake that feeds it is WD-IDEA-INPUT-137. ‹src: truly strech›
- **WD-IDEA-STORY-127** [voice,future] Retrieval over lore for premium users with massive reusable story universes (retrieval was cut from MVP); not for style or tone, which simpler methods handle; a well-structured non-vector database could do the same. ‹src: truly strech›
- **WD-IDEA-STORY-128** [future] Content translation: translate generated content, bilingual script editing, translation memory, language-specific style references.
- **WD-IDEA-STORY-129** [future] Multi-language generation: language detection, language-specific prompting, cross-language consistency checks, language-specific quality metrics.
- **WD-IDEA-STORY-130** [future] Script reader view with audio and text-to-speech for scripts. ‹src: Post-MVP-tasklist›


# 03 Functional Capabilities

> Scope: a grouped capability index of the features, behaviors, options, and conveniences conceived across the legacy docs, organized by area, each citing the WD-IDEA ids that hold the full statement (docs 01 to 11, flat in 15). Entries are deliberately terse: the first clauses name the capability and its main variants; every nuance, condition, and alternative lives in the cited ideas. `alt:` marks competing options; `[planned]`, `[future]`, `[rejected]`, `[voice]` mark status when it applies to a clause. Product-model principles and philosophy (WD-IDEA-PHIL-*) are in 01, not repeated here. Legacy product thinking, not a description of current behavior. Legend: see 00-README.

## Workflow, intake, and project control


### Pipeline structure and navigation
- **Twelve stages**: Global engine (1-5) then scene engine (6-12); Stage 13 audio mixing [future]; four-tier grouping [alt] (WD-IDEA-FLOW-001, WD-IDEA-FLOW-009, WD-IDEA-FLOW-010)
- **Phase roles**: Phase A outputs become immutable context; Phase B: scenes, shots, prompts, frames, clips; per-shot prompts (9), frames (10), video (11), batch review (12) routing issues upstream (WD-IDEA-FLOW-002, WD-IDEA-FLOW-004, WD-IDEA-FLOW-005)
- **Dashboard and tools**: Project list with progress; style, asset, version, artifact tools always in nav, never required (WD-IDEA-FLOW-011, WD-IDEA-FLOW-012)
- **Resume and wrap**: Reopen lands on last stage, never auto-advanced; unreachable stages redirect; wrap after completion, export formats open (WD-IDEA-FLOW-013, WD-IDEA-FLOW-014)

### Phase A stage gates and edit scope
- **Stage 1 and treatment**: Four modes plus parameters; one treatment variant iterated, only its prose feeds beats (WD-IDEA-FLOW-015, WD-IDEA-FLOW-017)
- **Locks**: Beat confirmation is primary structural lock; script approval freezes Phase B source of truth, before asset extraction (WD-IDEA-FLOW-018, WD-IDEA-FLOW-019)
- **Phase A to B**: Script splits deterministically into scenes with stable identities, heading and excerpt kept (WD-IDEA-FLOW-021)
- **Scene dependencies** [planned]: Expected characters, location, props saved at approval; manual additions allowed (WD-IDEA-FLOW-022)
- **Stage 5 style and gate**: Style lock opens Stage 5; extraction and generation blocked until locked. Gate: style, one active asset, confirmed image key per master asset; confirm soft-locks (WD-IDEA-FLOW-023, WD-IDEA-FLOW-024)
- **Finalize Assets**: Moves to Script Hub; assets stay soft-locked, editable, individually lockable (WD-IDEA-FLOW-025)
- **Location views**: Not a gate; all, establishing only, or none; missing ones inferred or added from Stage 8 (WD-IDEA-FLOW-026)
- **Advisory gates**: Pipeline-wide gates for image keys, shot coverage, continuity, video spec; continuity warnings advisory (WD-IDEA-FLOW-027)
- **Edit scope**: Upstream edits mark outdated, never delete; script regeneration forces new branch; scene edits invalidate scene and linked later ones (WD-IDEA-FLOW-028)
- **Stage order**: Strict [alt]: no start until predecessor locked or invalidated. Flexible [alt]: lock-order freedom, auto-resolved lock chains (WD-IDEA-FLOW-029, WD-IDEA-FLOW-030)
- **Prerequisites** [planned]: Apply to imported content; enforced at commit, not navigation (WD-IDEA-FLOW-031)

### Scene production hub
- **Scene cycle** [voice]: Repeated from hub; finished scene's end state seeds next; resumable (WD-IDEA-FLOW-032)
- **Free order**: Sequence, skip ahead, revisit, or branch before high-impact change (WD-IDEA-FLOW-033)
- **Script Hub** [voice]: Every scene with refreshed status; no lock or unlock (WD-IDEA-FLOW-034)
- **Hub actions and content**: Open pipeline, jump to stage, defer or restore, review video; slug, summary, continuity warnings, audio timestamps (WD-IDEA-FLOW-035, WD-IDEA-FLOW-036)
- **Master-script hub** [alt, voice]: Read-only tabs with detailed master script (WD-IDEA-FLOW-037)
- **Entry and re-entry**: Resume at first stage not locked or outdated; finished scenes browsable read-only [voice] (WD-IDEA-FLOW-038, WD-IDEA-FLOW-039)
- **Deferral**: Scene sidelined like deleted, data restorable; batches skip; deleting last shot offers it (WD-IDEA-FLOW-040, WD-IDEA-FLOW-041)
- **Runtime control** [voice]: Target-length respect, on-screen overrun counter, deliberate extension (WD-IDEA-FLOW-042)

### Scene progress and production status
- **Scene lifecycle** [alt]: Draft, shot list ready, frames locked, video complete; outdated and continuity-broken side states (WD-IDEA-FLOW-043)
- **Derived progress** [alt]: Inferred from existing shots, frames, videos (WD-IDEA-FLOW-044)
- **In-production status** [planned, voice]: Counts after Stage 5 locks once; before, shows "Stage 5 of 5" (WD-IDEA-FLOW-045)
- **Production signal**: Stage 5 ever locked [alt, recommended] (WD-IDEA-FLOW-046) ; any Stage 6+ or past-draft activity [alt] (WD-IDEA-FLOW-047); "entered production at" timestamp [alt] (WD-IDEA-FLOW-048)
- **Fully-locked signal** [rejected]: Would hide progress when upstream edits occur (WD-IDEA-FLOW-049)

### Phase B stage handoffs and gates
- **Stage 7 inputs**: Global context, scene content and beats, previous scene end state (WD-IDEA-FLOW-050)
- **Shot list first**: Locked before scene assets (WD-IDEA-FLOW-051)
- **Scene assets**: Auto-populate on entry from dependencies and locked assets; empty list offers add (WD-IDEA-FLOW-052)
- **Visual reference rule** [alt]: Each asset needs one, with missing count (WD-IDEA-FLOW-053); or master reference alone (WD-IDEA-FLOW-054)
- **Tiered requirements** [alt]: Primary characters generated; secondary may use master refs; non-critical "Generate Later"; force option (WD-IDEA-FLOW-055)
- **Prompt review**: Edit full frame and video prompt set; generates nothing (WD-IDEA-FLOW-056)
- **Frame gate**: All frames approved, no strict continuity block; start-frame-only skips end frames (WD-IDEA-FLOW-057)
- **Cost checkpoint**: Shot cards, statuses, warnings, cost; confirm queues one video job per shot (WD-IDEA-FLOW-058)
- **Review outcomes**: Complete (warns on failed jobs); regenerate anchors for minor fixes; return to shot list for major issues (WD-IDEA-FLOW-059)

### Correction loops and continuity ownership
- **Targeted correction**: Re-run Stages 8-12 from shot list; later scenes flagged possibly outdated, not blocked (WD-IDEA-FLOW-060)
- **Re-run cascade**: Asset relevance, visual states, frame prompts re-run in order, then frames regenerate (WD-IDEA-FLOW-061)
- **Script-mistake repair**: Re-approve master script in Phase A, repair from hub; removed scenes become continuity-broken (WD-IDEA-FLOW-062)
- **Repair links**: Warnings point to owning stage, e.g. "Repair in Stage 8" (WD-IDEA-FLOW-063)
- **Continuity ownership** [planned]: Stage 7 shot-location truth; Stage 8 spatial coverage; Stage 9 references shown; Stage 10 reuses continuity (WD-IDEA-FLOW-064)
- **Stage 10 workspace** [planned, voice]: Approve frames, establishing views, reuse frames as edit bases, cross-shot continuity (WD-IDEA-FLOW-065)

### Script revision mid-production
- **Revision reconciliation** [future]: Diff drafts, flag changed scenes for Stage 7, keep untouched work, re-sync stale scenes on demand (WD-IDEA-FLOW-067, WD-IDEA-FLOW-068)
- **Revision method**: New branch preserving prior state [alt, future] (WD-IDEA-FLOW-069) ; in-place mutation, needs rollback [alt, future] (WD-IDEA-FLOW-070)

### Skip routing and skipped stages
- **Streamline feed** [planned]: Feeds existing 12 stages with phases, locks, tools; arrive further along (WD-IDEA-FLOW-072)
- **Landing stage** [planned]: Land as far as material earns; upstream marked, not absent; finished script to Stage 4 (WD-IDEA-FLOW-074)
- **Script path** [planned, voice]: Straight to Stage 4, Stages 2-3 marked skipped (WD-IDEA-FLOW-075)
- **Skipped state** [planned]: Terminal, distinct from not-started, draft, locked; counts as passed (WD-IDEA-FLOW-078)
- **Current stage** [planned]: First unpassed Phase A stage; all passed lands on Script Hub (WD-IDEA-FLOW-079)
- **Eligibility** [planned]: Stages 2-4 only, from not-started, Phase A only; never discards approved content (WD-IDEA-FLOW-077, WD-IDEA-FLOW-080, WD-IDEA-FLOW-081)
- **Skip storage**: Empty normal version [alt, planned] (WD-IDEA-FLOW-082) ; project or branch metadata [rejected] (WD-IDEA-FLOW-083)
- **Skipped access** [alt, voice]: Locked, not enterable, "SKIPPED" badge (WD-IDEA-FLOW-084); or optional and enterable (WD-IDEA-FLOW-085)
- **AI back-fill** [alt, voice]: Treatment and beats reverse-generated from script; costs credits (WD-IDEA-FLOW-086)
- **Skipped placeholder** [alt, planned]: "Write this myself" (no credits) or "Generate from script" (credits) (WD-IDEA-FLOW-087)
- **Backfill rules** [planned]: Optional, never automatic; static "generated from script on [date]" note, never outdated (WD-IDEA-FLOW-088, WD-IDEA-FLOW-089)

### Storyboard, YOLO and other workflow variants
- **Storyboard-driven** [future, voice]: Storyboard as Stage 1 input; panel labels match script; Stages 2-4 bypassed (WD-IDEA-FLOW-090, WD-IDEA-FLOW-091, WD-IDEA-FLOW-092)
- **YOLO** [future]: Script, audio, stills run end to end, auto-advancing through checkpoints (WD-IDEA-FLOW-094, WD-IDEA-FLOW-095, WD-IDEA-FLOW-097)
- **Quick Mode** [future]: Grid view, bulk actions, refinements on Control Mode (WD-IDEA-FLOW-099)
- **Provider-tailored** [future, voice]: UI, prompts, context adapt to target video model (WD-IDEA-FLOW-100)
- **Audio-first** [future]: Visuals match narration timeline; script secondary (WD-IDEA-FLOW-101)
- **Playbooks**: 30-second brand montage (5-6 shots); vertical teaser (3-4 shots); four-shot continuity narrative (WD-IDEA-FLOW-102)

### 3D blocking studio
- **Optional layer** [planned]: Non-blocking spatial reference; no stage logic replaced (WD-IDEA-FLOW-103)
- **Studio views**: Setup, blocking, Results; back at any point (WD-IDEA-FLOW-104)
- **Entry options**: Step between visual definition and prompts [alt] (WD-IDEA-FLOW-105) ; full-screen modal from frames, refreshes on close [alt] (WD-IDEA-FLOW-106)
- **Unlock options**: Per scene after Stage 8 [alt] (WD-IDEA-FLOW-107) ; global after Stage 5 [alt] (WD-IDEA-FLOW-108)
- **Integration options**: Embedded app posting export [alt] (WD-IDEA-FLOW-109) ; mounted modules [alt] (WD-IDEA-FLOW-110); black box with per-shot export, recommended [alt] (WD-IDEA-FLOW-111)

### Master Document and stage-order alternatives
- **Master Document** [future, voice]: Super-descriptive production document of every scene, character, wardrobe, prop, setting (WD-IDEA-FLOW-112, WD-IDEA-FLOW-113)
- **Placement options**: New stage with renumbering [alt] (WD-IDEA-FLOW-114) ; replaces screenplay output [alt] (WD-IDEA-FLOW-115); dual output [alt] (WD-IDEA-FLOW-116)
- **Deferred** [alt, voice]: Chosen; past MVP, twelve stages, master script stays source of truth (WD-IDEA-FLOW-117)
- **Gap coverage** [planned]: Structured shot prompts and adaptive asset descriptions meanwhile (WD-IDEA-FLOW-118)
- **Treatment and beats** [alt, voice, future]: Merged split-screen stage; decision deferred (WD-IDEA-FLOW-119)
- **Asset-first** [alt, voice]: Assets defined first; master script written from them (WD-IDEA-FLOW-120)
- **Stage swap** [alt, voice]: Shot prompts before scene assets, swapping Stages 8 and 9 (WD-IDEA-FLOW-121)
- **Sub-location decision options**: In script [alt, voice] (WD-IDEA-FLOW-122) ; at script approval [alt, voice] (WD-IDEA-FLOW-123); at shot-list generation [alt] (WD-IDEA-FLOW-124)

### Streamline roadmap
- **MVP levels**: Each stands alone: upload panel, routing to 2-5, real script skip, clarifying questions, review before commit (WD-IDEA-FLOW-127)
- **Build orders**: Infrastructure-first [alt] (WD-IDEA-FLOW-128) ; visible-value-first, Import Script entry first [alt] (WD-IDEA-FLOW-129)
- **Deferred candidates** [future]: Storyboard, audio dialogue, voice samples, blocking import, per-shot assets, notes assistant, YOLO, lore library, creative DNA, deconstruction, live-action hybrid, remix (WD-IDEA-FLOW-130)

### Project creation and dashboard
- **Title-only creation**: Only title asked; configuration deferred to Stage 1 (WD-IDEA-INPUT-001)
- **Dashboard organization** [planned]: Folders, search, filters, stage and scene on cards (WD-IDEA-INPUT-002)
- **Batch operations** [future]: Creation, regeneration, export, status tracking, scheduled runs (WD-IDEA-INPUT-003)

### Project settings
- **Parameter lock**: Set before text generation; blocked once Stage 2 begins (WD-IDEA-INPUT-005)
- **Stage 1 setup**: Project type, length, rating, genre and tone, style capsules, sources, classifications, answers (WD-IDEA-INPUT-006)
- **Project types**: Narrative Short Film; Commercial or Trailer; Video Content for Audio; music video named (WD-IDEA-INPUT-007)
- **Audio projects**: Dialogue-free background visuals for podcast or audiobook, matched to audio; timestamps recommended (WD-IDEA-INPUT-008) ; audio with transcript sets length to duration (WD-IDEA-INPUT-009)
- **Video explainer** [future, voice]: Visuals-only, no narrative (WD-IDEA-INPUT-010)
- **Target length**: Min-max slider, legacy 1-15 min, global context (WD-IDEA-INPUT-011)
- **Rating and genre**: G, PG, PG-13, M sets baselines (WD-IDEA-INPUT-012) ; multi-select genre and tone (WD-IDEA-INPUT-013)
- **Tonal note**: Mandatory, 10+ characters; refines rating and genre (WD-IDEA-INPUT-014)
- **Aspect ratio**: 16:9, 9:16, 1:1, 4:3, 2.35:1; set once, applied everywhere (WD-IDEA-INPUT-015)
- **Style capsules**: Optional writing capsule, else neutral prose (WD-IDEA-INPUT-016) ; visual capsule (WD-IDEA-INPUT-017); free-text visual tone substitute (WD-IDEA-INPUT-018)
- **Story Rules** [future]: Persistent world or character conventions (WD-IDEA-INPUT-019)
- **Scene count**: Inferred from input, one or two for dialogue, several for action (WD-IDEA-INPUT-020)
- **Early uploads** [planned, voice]: Content at each of Stages 1-5 (WD-IDEA-INPUT-021)

### Stage 1 input modes
- **Mode selection**: Four modes set initial story structure (WD-IDEA-INPUT-022)
- **Expansion**: 1-3 paragraph idea grows into three-act treatment (WD-IDEA-INPUT-023)
- **Condensation**: 100+ page text trimmed to core narrative (WD-IDEA-INPUT-024)
- **Transformation**: Source plus "twist" parameter for adaptation or parody (WD-IDEA-INPUT-025)
- **Script Skip**: Screenplay parsed directly; optional character and setting sheet (WD-IDEA-INPUT-026, WD-IDEA-INPUT-027)
- **Readable upload** [voice]: PDF screenplays must be readable (WD-IDEA-INPUT-029)

### File staging and Stage 1 gating
- **Multi-file staging**: Any mode; one primary, rest context (WD-IDEA-INPUT-030)
- **Limits and tags**: Size and count limits; first file primary, any starrable; Character Notes, World Building, Parody Source, Research Notes, Style Guide (WD-IDEA-INPUT-031)
- **Expansion files**: Typed idea primary; supporting files context only (WD-IDEA-INPUT-032)
- **Full text**: Passed downstream unchunked, unsummarized (WD-IDEA-INPUT-033)
- **Completion**: Mode, type, tonal note, plus file or 20+ idea characters (WD-IDEA-INPUT-034)
- **Autosave and lock**: Drafts autosave; completion normalizes and locks (WD-IDEA-INPUT-035)

### Streamline entry points and layout
- **Second front door** [planned]: One intake space turns material into artifacts (WD-IDEA-INPUT-037)
- **Expert path** [voice]: Skip step-by-step flow (WD-IDEA-INPUT-038)
- **General intake** [planned]: Scripts first; other inputs route later (WD-IDEA-INPUT-039)
- **Mixed bundles**: Script with images, lines or storyboards; treatment with sketches (WD-IDEA-INPUT-040)
- **Creative liberty** [future, voice]: Less filling-in as material grows; gaps only (WD-IDEA-INPUT-041)
- **Disorganized notes**: Assistant structures chaotic notes (WD-IDEA-INPUT-042)
- **Fourth-mode options**: Structured Inputs replaces Script Skip [alt] (WD-IDEA-INPUT-044) ; Streamline as fourth mode [planned] (WD-IDEA-INPUT-045); separate Streamline button [alt] (WD-IDEA-INPUT-046); unified upload, modes as presets [alt, future] (WD-IDEA-INPUT-047); dedicated intake panel, recommended near-term [alt] (WD-IDEA-INPUT-048); project type first, mode renamed [alt, voice] (WD-IDEA-INPUT-050)
- **Import Script zone** [alt]: Prominent drop zone, about three clicks to Stage 4 review (WD-IDEA-INPUT-051)
- **Start from Files** [alt, future]: Opens from dashboard; names project from file (WD-IDEA-INPUT-052)
- **Row layout** [voice]: File, type dropdown, skip-to-script toggle, "+ Add More" (WD-IDEA-INPUT-053)
- **Super Spec'd Out** [future, voice]: Files labelled by type, e.g. Character Descriptions, Treatment (WD-IDEA-INPUT-054)
- **Upload panel** [planned]: Drop zone, paste option, type dropdown per item (WD-IDEA-INPUT-055, WD-IDEA-INPUT-060)
- **Layout options**: Linear review flow [alt] (WD-IDEA-INPUT-056) ; spatial canvas with in-place annotations [alt] (WD-IDEA-INPUT-057)

### Intake UI principles
- **Progressive disclosure**: "Drop what you have here"; dropdowns only below confidence threshold (WD-IDEA-INPUT-058)
- **Validation with a way out**: Explains problem, offers alternative (WD-IDEA-INPUT-059)

### Upload and text extraction
- **Formats** [planned]: TXT, MD, PDF, DOCX, RTF (WD-IDEA-INPUT-061)
- **Legacy .doc** [planned]: Rejected; save as .docx or .pdf (WD-IDEA-INPUT-062)
- **Per-file extraction**: Retry or drop each file independently (WD-IDEA-INPUT-063)
- **Partial success** [planned]: Proceed with rest; failed files retried, reclassified or dropped (WD-IDEA-INPUT-064); stage commit stays all-or-nothing (WD-IDEA-INPUT-065)
- **Retention**: Raw and extracted text kept; unclassified files kept as context (WD-IDEA-INPUT-066, WD-IDEA-INPUT-067)
- **Extraction location**: Browser-side [alt] (WD-IDEA-INPUT-068) ; server-side single pass [alt] (WD-IDEA-INPUT-069)

### Accepted source material
- **Text inputs**: Notes, treatments, beats, outlines, screenplays, novels, character and setting notes, research, style guides, parody source (WD-IDEA-INPUT-070)
- **Visual inputs**: Character, prop, location images, style refs, mood boards, storyboard frames, sketches, stills, blocking captures, group photos (WD-IDEA-INPUT-071)
- **Image analysis**: Users name people or objects; descriptions reconciled and routed to Stage 5 or 8-10 (WD-IDEA-INPUT-072)
- **Group photo** [future]: Name each person, specify changes, attach voice samples (WD-IDEA-INPUT-073)
- **Film sampling** [future, voice]: Clip upload or text description (WD-IDEA-INPUT-074)
- **Audio** [future]: Ideas, lines, performances, podcasts, lectures, samples; upload or record (WD-IDEA-INPUT-075, WD-IDEA-INPUT-076)
- **Audio transcription** [future]: Transcribe and route only; classified as notes, dialogue, narration or sample (WD-IDEA-INPUT-077, WD-IDEA-INPUT-078, WD-IDEA-INPUT-079)

### Document detection and classification
- **Detected type**: Script, treatment, beat sheet, character notes, unclassified; manual override (WD-IDEA-INPUT-080)
- **Visible confidence**: Always shown, e.g. "95% confident: Screenplay" (WD-IDEA-INPUT-081)
- **Streaming cards**: Per-file as each resolves (WD-IDEA-INPUT-082)
- **Primary flag**: One primary; feeds conflict ranking (WD-IDEA-INPUT-083)
- **Script tiers**: 3+ headings plus dialogue offers skip; fewer asks confirmation; none is prose (WD-IDEA-INPUT-084)
- **Shared parse**: Same parse drives detection and Stage 4 (WD-IDEA-INPUT-085)
- **Keyword heuristic** [rejected]: Parser used instead (WD-IDEA-INPUT-086)
- **Confident-script summary**: Skip notice, straight to Stage 4 (WD-IDEA-INPUT-087)

### Import behavior
- **As-is** [planned]: No reformatting; clarification answers can still patch, shown in review (WD-IDEA-INPUT-088)
- **Import modes**: As-is, no AI or credits, recommended for clean docs [alt, voice] (WD-IDEA-INPUT-089) ; AI-format, costs credits, for messy notes [alt, voice] (WD-IDEA-INPUT-090); per-file toggle, never global [alt, voice] (WD-IDEA-INPUT-091)
- **Default preselection** [planned]: From confidence; visible override; preview before commit (WD-IDEA-INPUT-092)

### Intake routing to stages
- **Mapping**: Inputs fill stage artifacts as far as material justifies (WD-IDEA-INPUT-093)
- **Document routing** [planned]: Treatment to 2, beats to 3, script to 4, characters stored for 5 (WD-IDEA-INPUT-094)
- **Stage 2 and 3 import**: Treatment as-is or AI-formatted; beats parsed; finished script allows skip or backfill (WD-IDEA-INPUT-095, WD-IDEA-INPUT-096)
- **Stage 4 import**: Deterministic parse; one-click file import (WD-IDEA-INPUT-097)
- **Skip routing** [planned]: Never wrongly into Stage 2 (WD-IDEA-INPUT-098)
- **Landing**: Finished script lands at 4; treatment fragment may land at 3 (WD-IDEA-INPUT-099)
- **Stage 5 routes**: Script extraction, user sheets, reconciled images, manual creation (WD-IDEA-INPUT-100)
- **Asset cost** [planned]: Split is deterministic; costs only AI distillation of selected assets (WD-IDEA-INPUT-101)
- **Import success**: Requires scene extraction; otherwise recovery action (WD-IDEA-INPUT-102)

### Image and storyboard intake
- **Placement options**: All via Stage 1 Structured Inputs [alt, voice] (WD-IDEA-INPUT-103) ; split by stage [alt, voice] (WD-IDEA-INPUT-104); text and characters in 1, storyboards in 10 [alt, voice] (WD-IDEA-INPUT-105)
- **Batch review** [planned]: One grid for reference images; editable; routed to Stage 5 (WD-IDEA-INPUT-106)
- **Storyboards in Stage 10** [alt, future]: Outside MVP (WD-IDEA-INPUT-107)
- **Bundle frames** [alt]: Mapped frames route to shots; unmapped wait in input bin (WD-IDEA-INPUT-108)
- **Labelled upload** [alt, future]: 1A-style labels match script; skips 2-4 (WD-IDEA-INPUT-109)

### Clarification session (Ask Auteur)
- **Session** [planned]: Targeted questions on unresolved items, not guesses; answers persist (WD-IDEA-INPUT-111)
- **Scope**: Contradictions, vague motives, missing direction, irrelevant fragments, branches (WD-IDEA-INPUT-112)
- **Triggers** [planned]: Contradictions, vague traits, ambiguity, gaps, conflicts; never silent picks (WD-IDEA-INPUT-113, WD-IDEA-INPUT-114, WD-IDEA-INPUT-115, WD-IDEA-INPUT-116, WD-IDEA-INPUT-117)
- **Examples**: Main ending, discarded idea, visual style, correct name (WD-IDEA-INPUT-118)
- **Format** [planned]: Multiple choice plus "type your own" (WD-IDEA-INPUT-119)
- **Opt-in** [planned]: Never blocks commit; declining means AI infers, recorded (WD-IDEA-INPUT-120, WD-IDEA-INPUT-121)
- **Surgical edits** [planned]: Word, paragraph or structure scope; one-line diff (WD-IDEA-INPUT-122)
- **Re-ask** [planned]: New contradiction re-asks; history kept (WD-IDEA-INPUT-123)

### Conflict resolution
- **Source ranking** [planned]: Answer, then primary, then supporting context, then AI gap-fill (WD-IDEA-INPUT-124)
- **Silent resolution** [planned]: Below threshold, same ranking; winner tagged (WD-IDEA-INPUT-125)

### Review and commit
- **Review** [planned]: Shows outcomes (as-is, skipped, AI-filled); all-or-nothing commit (WD-IDEA-INPUT-126, WD-IDEA-INPUT-128)
- **Messy-pile example** [planned]: One fix, few answers, lands at supported stage (WD-IDEA-INPUT-127)

### Other structured-input variants
- **Guided template** [future]: Sections for script, plot, dialogue, characters, vibe, shots, rules (WD-IDEA-INPUT-129)
- **MVP scope** [planned, future]: Structured upload only new mode; storyboard and template deferred (WD-IDEA-INPUT-130)
- **Conversational intake** [future]: Iterative questions build scaffold (WD-IDEA-INPUT-131)

### Intake beyond project start
- **Mid-production intake** [future]: Routes to Stage 5 and current scene; asset-only sub-mode (WD-IDEA-INPUT-132, WD-IDEA-INPUT-133)
- **Session persistence** [future]: Draft staging until committed (WD-IDEA-INPUT-134)
- **Series templates** [future]: Save config and global assets for new episode (WD-IDEA-INPUT-135)
- **Collaborative intake** [future]: Multiple roles upload to one attributed session (WD-IDEA-INPUT-136)
- **Lore tagging** [future]: "Project only" or "personal library" (WD-IDEA-INPUT-137)

### Location image input
- **Input modes**: Guided, Free, Text, Video, Single Image for 3D world generation (WD-IDEA-INPUT-138)
- **Guided slots**: Front, right, back, left, each with suggested content (WD-IDEA-INPUT-139)
- **Multi-image uploader** [alt]: Helper text for establishing, hero, reverse angle (WD-IDEA-INPUT-140)
- **Slot mapping** [planned]: Establishing shot to front; other directions to side views (WD-IDEA-INPUT-141)
- **Optional text**: Any mode; scene prompt built from shot list (WD-IDEA-INPUT-142)
- **Resolution badges**: Green 1080p+, yellow 720p+, red below (WD-IDEA-INPUT-143)

## Writing, story, and visual assets


### Narrative chain and treatment (Stages 1-2)
- **Staged narrowing**: passes read only upstream input, never unselected variants; narrative refines global tone, never contradicts it (WD-IDEA-STORY-001, WD-IDEA-STORY-003)
- **Shared parameters**: runtime, project type, rating G to M (sets dialogue and action limits), genres, tone, style capsule; treatment adds idea and uploads (WD-IDEA-STORY-002)
- **Visual-first writing**: treatments may favor visuals over dialogue; scripts written visually rich for image generation (WD-IDEA-STORY-004)
- **Prose variants**: no beats; three structurally different variants (ending, chronology, or tone) at once, labeled by approach and runtime; three-act arcs of ~800-1200 words (WD-IDEA-STORY-005, WD-IDEA-STORY-006, WD-IDEA-STORY-007, WD-IDEA-STORY-008)
- **Generation and selection**: first-visit generation, manual fallback; user picks one; card gallery conceived; more variants on demand (WD-IDEA-STORY-009, WD-IDEA-STORY-010, WD-IDEA-STORY-011)
- **Editing and regeneration**: rich text, explicit save; switching with unsaved edits asks first; full regeneration with guidance replaces all three, no history (WD-IDEA-STORY-012, WD-IDEA-STORY-013)
- **Own-treatment tracking (gap)**: legacy build had no paste or import of own treatment; edits stay attributed to AI variant (WD-IDEA-STORY-014)

### Beat sheet (Stage 3)
- **Extraction**: atomic cause-and-effect events; 15-30 numbered beats of 1-3 sentences; conceived 8-12 simple, 15-25 action, 20-30 podcast (WD-IDEA-STORY-015, WD-IDEA-STORY-016, WD-IDEA-STORY-017)
- **Annotations**: structural rationale, screen time, source prose per beat; total runtime and structure shown; manual edits recorded (WD-IDEA-STORY-018, WD-IDEA-STORY-019, WD-IDEA-STORY-026)
- **Generation**: first-visit, manual fallback, must visibly output; variations; status messages match output (WD-IDEA-STORY-020, WD-IDEA-STORY-021)
- **Editing**: drag-and-drop with renumbering; click-to-edit; partial or whole regeneration (WD-IDEA-STORY-022, WD-IDEA-STORY-023)
- **Add and remove**: add via guidance box or placeholder after any beat; removal is plain, next beat anchors continuity (WD-IDEA-STORY-024, WD-IDEA-STORY-025)
- **Alternatives and split**: three alternatives keep function and screen time; split into 2-3 sub-beats keeping total time (WD-IDEA-STORY-027, WD-IDEA-STORY-028)
- **Guidance gates**: full regeneration needs 10+ characters of guidance and treatment source; confirmation needs 3+ beats of 10+ characters (WD-IDEA-STORY-029, WD-IDEA-STORY-030)
- **Runtime control**: default 20 seconds per beat; nudge dial or typed time conceived; projected runtime conceived for beat sheet, Script Hub, shot list (WD-IDEA-STORY-032, WD-IDEA-STORY-033) [voice]

### Master script and script editor (Stage 4)
- **Verbose blueprint**: maximizes appearance, setting, props, choreography, subtext, positional detail so each element can become an image (WD-IDEA-STORY-034, WD-IDEA-STORY-035)
- **Format and dialogue**: industry screenplay format; character-specific dialogue serving beat goals; length matches target (WD-IDEA-STORY-036, WD-IDEA-STORY-037, WD-IDEA-STORY-038)
- **Scene-to-beat mapping**: each beat becomes one or more scenes recording beats, characters, props, settings, duration (WD-IDEA-STORY-039)
- **Context options**: alt: follow beat sheet while reading full treatment; alt: beats, rating, genre, tone, capsule only (WD-IDEA-STORY-040, WD-IDEA-STORY-041) [alt]
- **Spatial headings and action**: headings name sub-location; action anchors characters to positions and moves (WD-IDEA-STORY-042, WD-IDEA-STORY-043)
- **Mid-scene location options**: alt: flag slug as location-dynamic and describe each setting change; alt: split headings joined by CONTINUOUS (WD-IDEA-STORY-044, WD-IDEA-STORY-045) [alt]
- **Editing**: recognizes screenplay elements; toolbar, industry layout; pasted text accepted; one-click file import proposed, not offered (WD-IDEA-STORY-047, WD-IDEA-STORY-048)
- **Generation and preview**: first-entry generation, manual fallback; scene preview before commit; planned to add characters, location, props per scene (WD-IDEA-STORY-046, WD-IDEA-STORY-050)
- **Beat sidebar**: collapsible, read-only; highlights matching beat; click scrolls to beat (WD-IDEA-STORY-049)
- **Approval checks**: non-empty script, INT./EXT. headings, content in every scene; zero-scene import must not claim success (WD-IDEA-STORY-051)
- **Markdown and highlighting**: Markdown in editors; script syntax highlighting (WD-IDEA-STORY-052) [future]

### Structured storage and scene breakdown
- **Typed blocks**: heading, action, dialogue, transition, paragraph; dialogue line holds name, extension (V.O., O.S., CONT'D), parenthetical, line (WD-IDEA-STORY-053, WD-IDEA-STORY-054)
- **Round-trip and legacy**: text and structured editor round-trip losslessly; plain-text scripts convert on load (WD-IDEA-STORY-055, WD-IDEA-STORY-056)
- **Slugs and headings**: readable slug; parses INT/EXT, compound location, time of day; identical locations dedupe (WD-IDEA-STORY-058, WD-IDEA-STORY-059)
- **Speakers and dialogue**: extensions (V.O.) count as one character; dialogue complete and ordered; parentheticals kept as delivery context (WD-IDEA-STORY-060, WD-IDEA-STORY-062)
- **Unified manifest**: per scene location, time, characters, props, dialogue, action; global lists; serves Stages 5, 6, 8 (WD-IDEA-STORY-061)
- **Dependency extraction**: alt: AI pass as fallback for legacy scripts; alt: deterministic parsing, repeatable and cheap, avoids all-caps action misread as character (WD-IDEA-STORY-063, WD-IDEA-STORY-064) [alt]
- **Master Document stage**: stage between 4 and 5 creating super-descriptive source per scene (WD-IDEA-STORY-065) [future]

### Rewrites, regeneration, and manual edits
- **Selection rewrite**: only highlighted text rewritten, surrounding text read-only; available for treatment, beats, script, asset descriptions; preview (WD-IDEA-STORY-069, WD-IDEA-STORY-071)
- **Edit Selection options**: Stages 2 and 4 offer one guided rewrite or three distinct alternatives; script keeps format, timing, verbosity; 10+ character guidance (WD-IDEA-STORY-070, WD-IDEA-STORY-072, WD-IDEA-STORY-073)
- **Regeneration rationale**: user's "why" stored with each version; shapes output; doubles as commit message (WD-IDEA-STORY-074)
- **Regeneration controls**: states what happens; confirmation or preview; cost; before/after comparison; consistent in Stages 2-4 (WD-IDEA-STORY-075, WD-IDEA-STORY-076) [planned]
- **Guidance options**: alt: always directed, gated by Why box (10+ characters); alt: contextual, blind option kept in Stages 2, 3, elsewhere (WD-IDEA-STORY-077, WD-IDEA-STORY-078) [alt]
- **Locked edits**: manual edits override and lock AI text; script regeneration can optionally pass previous version (WD-IDEA-STORY-079, WD-IDEA-STORY-080)
- **Answer reconciliation**: AI applies clarification answers via word patches, clause insertions, or structural cascades; once per session (WD-IDEA-STORY-082, WD-IDEA-STORY-083) [planned]
- **Reconciliation transparency**: one-line diff and "N edits applied" per document; plot-changing answers need confirmation; cancel changes nothing (WD-IDEA-STORY-084, WD-IDEA-STORY-085) [planned]

### Style capsules, audio, and imports
- **Writing capsule**: excerpts, descriptors, negative constraints steering tone by imitation; chosen at Stage 1; optional neutral default (WD-IDEA-STORY-086, WD-IDEA-STORY-087)
- **Evaluation and mature content**: planned: rate output, A/B-test dialogue prompting, measure capsule impact; handle mature content despite provider censorship (WD-IDEA-STORY-088, WD-IDEA-STORY-089) [planned]
- **Custom dialogue model**: user corpus trains a selectable dialogue-style model (WD-IDEA-STORY-090) [future]
- **Capsule scope**: alt: all writing steps (Stages 1-4, 7, 9); alt: script and dialogue only, where models are weakest (WD-IDEA-STORY-091, WD-IDEA-STORY-092) [alt]
- **Audio-driven writing**: treatments follow timestamps; beats align to topic transitions; script becomes visual scenes timed to audio (WD-IDEA-STORY-093, WD-IDEA-STORY-094, WD-IDEA-STORY-095)
- **Import routing**: treatment or beat sheet imported as-is or AI-formatted; finished script allows skipping or backfilling earlier stages (WD-IDEA-STORY-096, WD-IDEA-STORY-097)
- **Script skip mode**: formatted screenplay imports directly, scenes parsed deterministically; otherwise generated from treatment and beats (WD-IDEA-STORY-098)
- **Imported-script authority (open question)**: whether imported script is source of truth or may be backfilled (WD-IDEA-STORY-100)

### Keeping treatment, beats, and script in sync
- **Drift flags**: non-blocking "Not Up-to-Date" flags; beat edits flag both ways, script edits flag only beats; nothing auto-regenerates (WD-IDEA-STORY-101, WD-IDEA-STORY-102, WD-IDEA-STORY-105)
- **Retroactive revisions**: regenerate script from edited beats, or re-extract beats from script; new version on same branch, clears flag (WD-IDEA-STORY-103, WD-IDEA-STORY-104)
- **Deviation watch**: checks manual script edits for structural deviations; non-blocking flag resolved by revising beats (WD-IDEA-STORY-106)
- **Treatment follows beats**: alt: non-blocking flag with "Retroactively Revise Treatment"; alt: reactive treatment edits with pop-up per change (WD-IDEA-STORY-107, WD-IDEA-STORY-108) [alt]
- **Regeneration impact**: full script regeneration breaks Phase B work; re-approval keeps stable scene identities; removed scenes become "continuity broken" (WD-IDEA-STORY-110, WD-IDEA-STORY-113)
- **Partial pivot**: on unlock, user picks scenes that stay valid; kept scenes frozen, others rewritten (WD-IDEA-STORY-114) [voice]

### Future story tools
- **Ideation assistants**: beat brainstorming, character development, alternative endings (WD-IDEA-STORY-119, WD-IDEA-STORY-120, WD-IDEA-STORY-123) [future]
- **Story analysis**: plot-hole, structure, timeline and motivation checks; insights on tone, character, pacing, dialogue (WD-IDEA-STORY-121, WD-IDEA-STORY-122, WD-IDEA-STORY-124, WD-IDEA-STORY-125) [future]
- **Lore Library**: project-scoped persistent lore; premium retrieval for large universes (WD-IDEA-STORY-126, WD-IDEA-STORY-127) [future, voice]
- **Translation**: translated output, bilingual editing, translation memory, language-specific checks (WD-IDEA-STORY-128, WD-IDEA-STORY-129) [future]
- **Script reader view**: audio and text-to-speech for scripts (WD-IDEA-STORY-130) [future]

### Asset tiers, origin, and visual capsules
- **Tiers and types**: global, master, scene-instance tiers hold character, prop, location, extra archetype assets with description and image key (WD-IDEA-ASSET-001, WD-IDEA-ASSET-002)
- **Origin and inheritance**: origin is extracted, manual, cloned from global, or batch import; master-to-instance inheritance conceived to validate end to end (WD-IDEA-ASSET-003, WD-IDEA-ASSET-005)
- **Style injection**: capsules injected as text and metadata for exact reproduction; hand-curated; similarity retrieval dropped (WD-IDEA-ASSET-006, WD-IDEA-ASSET-007)
- **Capsule kinds**: writing (for treatment, beat, script) and visual (references, negatives, design pillars: palette, mood, medium, lighting, camera; optional locked frames) kept separate (WD-IDEA-ASSET-008, WD-IDEA-ASSET-009, WD-IDEA-ASSET-010)
- **Style lock**: applies to master references, scene asset states, frame prompts; carries into shot lists and image and video prompts (WD-IDEA-ASSET-011, WD-IDEA-ASSET-012)
- **Versioning and audit**: versioned; each application logged with version, output context, applier, reason (WD-IDEA-ASSET-013, WD-IDEA-ASSET-015)
- **Genre fit**: capsules expected to match genre (WD-IDEA-ASSET-016)

### Capsule library
- **Library browsing**: writing and visual capsules; tabs, search, all/presets/custom filters, grid or list; presets duplicable (WD-IDEA-ASSET-017, WD-IDEA-ASSET-018)
- **Preset and custom rules**: presets read-only; custom capsules create, edit, favorite, delete with confirmation (WD-IDEA-ASSET-019)
- **Image access**: reference images intended private and authenticated; legacy workaround made them public (WD-IDEA-ASSET-020)
- **Named libraries**: alt: user-owned named libraries (user-made or preset), markable public (WD-IDEA-ASSET-021) [alt]
- **Auto-created libraries**: rejected; capsules shown with Preset or Custom badges instead (WD-IDEA-ASSET-022) [rejected, voice]

### Project visual style and style balance (Stage 5)
- **Visual tone**: presets (3D animation, hyperrealistic, noir, 2D animation) plus plain-English description, promotable to capsule (WD-IDEA-ASSET-024, WD-IDEA-ASSET-025) [planned]
- **Changing style**: changeable with downstream warning; after style guide unlock, triggers a branch (WD-IDEA-ASSET-026) [planned, voice]
- **Style record**: each asset records its generating capsule; user confirms style per scene in Stage 8 (WD-IDEA-ASSET-028, WD-IDEA-ASSET-029)
- **Reference-first**: master and scene references outrank capsule; identity precedes style (WD-IDEA-ASSET-030, WD-IDEA-ASSET-031)
- **Influence slider**: 0% (master reference only) to 100% (full override) in Stages 5, 8, 10; saved per project (WD-IDEA-ASSET-032) [planned]

### Asset extraction and identification
- **Re-extraction**: on script change, branch, or manual action; regenerates asset list and scene map; keeps manual assets (WD-IDEA-ASSET-035) [planned]
- **Speakers and silent characters**: speakers are characters; line counts separate leads from extras; silent characters found by scanning action for known names (WD-IDEA-ASSET-040, WD-IDEA-ASSET-041, WD-IDEA-ASSET-042)
- **Props and names**: props are capitalized action nouns plus light AI pass; dependencies keep names as written until matched (WD-IDEA-ASSET-043, WD-IDEA-ASSET-044, WD-IDEA-ASSET-045)
- **Alias merging**: variants merge into one asset ("John" = "Mr. Doe") (WD-IDEA-ASSET-046)
- **Catalog and prominence options**: alt: AI catalog over script mentions; alt: AI pass tagging Key (3+ mentions) or Supporting (1-2); alt: tangible-only discovery (WD-IDEA-ASSET-047, WD-IDEA-ASSET-048, WD-IDEA-ASSET-049) [alt]
- **AI-first identification**: rejected; replaced by deterministic extraction, AI writes visual descriptions only (WD-IDEA-ASSET-050) [rejected]
- **Two-pass checklist**: deterministic preview groups Characters, Locations, Props; all selected by default, select all or none per category (WD-IDEA-ASSET-051, WD-IDEA-ASSET-052)
- **AI proposals and cleanup**: AI proposes candidates to confirm; bulk delete, assets collapsed by default (WD-IDEA-ASSET-053, WD-IDEA-ASSET-054) [voice]
- **Filter options**: alt: select-only checklist where removal sidelines; alt: Keep, Defer, Delete columns (WD-IDEA-ASSET-055, WD-IDEA-ASSET-056) [alt]

### Descriptions and deferred assets
- **Synthesized, editable**: merged from every script mention, per-scene excerpts kept; editable or rewritable (WD-IDEA-ASSET-057, WD-IDEA-ASSET-058)
- **Short physical**: 3-5 physical-only, image-renderable sentences; script conflicts pointed out, not silently resolved (WD-IDEA-ASSET-059, WD-IDEA-ASSET-060)
- **Style-fitted**: fit style, main vs background role, age, appearance, clothing; complete, not inflated (WD-IDEA-ASSET-061, WD-IDEA-ASSET-062)
- **Audio-driven**: hosts look as described; visual aids become assets; optional hidden master descriptive document (WD-IDEA-ASSET-063, WD-IDEA-ASSET-064)
- **Manual addition**: name, type, description, optional image prompt; added in Stage 5 or 8 without re-extraction (WD-IDEA-ASSET-065)
- **Deferred**: Stage 5 removal defers, not deletes; restorable, usable in Stages 8 and 10 (WD-IDEA-ASSET-066, WD-IDEA-ASSET-067, WD-IDEA-ASSET-068)

### Extra archetypes and changed-state characters
- **Archetype concept**: user-authored templates for background figures, never extracted; each spawns similar figures with variation (WD-IDEA-ASSET-069, WD-IDEA-ASSET-071)
- **Class prototypes**: one prototype stands for a background class with no individual identity (WD-IDEA-ASSET-070) [planned, voice]
- **Add action**: Stage 5 names archetype, describes traits, optionally generates or uploads reference (WD-IDEA-ASSET-072, WD-IDEA-ASSET-073)
- **Images and assignment**: image optional; global or per scene; assigned in Stage 8; frame references (WD-IDEA-ASSET-074, WD-IDEA-ASSET-075)
- **Rejected extras option**: reclassifying extracted characters as extras rejected for archetypes (WD-IDEA-ASSET-076) [rejected]
- **Multiple changed states**: several changed-state assets per character allowed (WD-IDEA-ASSET-078) [voice]
- **Shot-by-shot changes**: alt: scene asset describes change per shot (suit cracking, bleeding); creator suspects bad idea (WD-IDEA-ASSET-080) [alt]
- **Per-shot tags**: change tags enrich frame and video prompts per shot without image generation (WD-IDEA-ASSET-081) [future]
- **Open structure questions**: must instances break down shot by shot; could Stages 8 and 9 swap (WD-IDEA-ASSET-082, WD-IDEA-ASSET-083) [voice]

### Master asset definition (Stage 5)
- **Image key**: generated from edited description and locked style; refined by guidance; built as reference sheet (WD-IDEA-ASSET-084, WD-IDEA-ASSET-085)
- **Reference sheets and isolation**: masters are references, not scenes; characters, props, extras isolated on clean backgrounds; locations excluded (WD-IDEA-ASSET-086, WD-IDEA-ASSET-087)
- **Image sources**: upload (PNG, JPEG, WebP, up to 10 MB) or generate; "Generate all missing"; any image deletable (WD-IDEA-ASSET-088, WD-IDEA-ASSET-090)
- **Carousel and fidelity**: about four images, user picks active; regenerating an upload balances faithfulness against changes (WD-IDEA-ASSET-089, WD-IDEA-ASSET-091) [voice]
- **Isolation methods**: alt: prompt-only; alt: background-removal safety net for halos, A/B tested (WD-IDEA-ASSET-092, WD-IDEA-ASSET-093) [alt]
- **Optional images**: all assets optional; imageless shows "Upload or Generate" placeholder, does not block Stage 5 exit (WD-IDEA-ASSET-094) [planned]
- **Prop-only optionality**: alt: image-optional rule limited to Stage 5 props (WD-IDEA-ASSET-095) [alt, planned]
- **Multi-angle views**: front, side, three-quarter, back, each generated independently to match shot camera direction (WD-IDEA-ASSET-097)

### Asset management
- **Actions and type change**: edit, delete, defer, restore, change type; type change stays after image approval (WD-IDEA-ASSET-098, WD-IDEA-ASSET-102)
- **Merge and split**: merge selected (survivor keeps image; absorbed images warned lost) or split into scene variants (WD-IDEA-ASSET-099, WD-IDEA-ASSET-100, WD-IDEA-ASSET-101)
- **Image-lock trap (gap)**: legacy build had no deselect-image; locks could trap asset from type change or merge (WD-IDEA-ASSET-103)
- **Editor usability**: Show more/less on descriptions before merging; scrolling editor; props deletable (WD-IDEA-ASSET-104, WD-IDEA-ASSET-105) [voice]
- **Type change on approved images**: alt: clear image and prompt regeneration; alt: keep image (WD-IDEA-ASSET-106, WD-IDEA-ASSET-107) [alt]
- **Lock and finalize**: per-asset lock; Stage 5 lock-all labeled "Finalize Assets" (WD-IDEA-ASSET-108, WD-IDEA-ASSET-110)
- **Voice profile**: master character links to voice profile seeding every video call (WD-IDEA-ASSET-111) [future]

### Uploads and image reconciliation
- **Description from upload**: AI proposes description from image so stored text matches custom design (WD-IDEA-ASSET-112, WD-IDEA-ASSET-113) [voice]
- **Rough inputs, no blind changes**: photos or sketches can become pipeline-ready; uploads and text never blindly accepted or overwritten (WD-IDEA-ASSET-114, WD-IDEA-ASSET-115)
- **Review**: current and extracted descriptions read-only; editable Final Description pre-filled with AI merge; match badge (WD-IDEA-ASSET-116, WD-IDEA-ASSET-117)
- **Edit Image and Apply Visual Style**: Edit Image changes text using current image as reference; Apply Visual Style re-renders in project capsule (WD-IDEA-ASSET-118, WD-IDEA-ASSET-119) [voice]
- **Remove Background and regenerate**: cleans character, prop, extra uploads (not locations); regenerate uses final text and capsule, not upload (WD-IDEA-ASSET-120, WD-IDEA-ASSET-121) [voice]
- **Reference toggle and attempts**: "use current image as reference" toggle; preview updates; session attempts carousel (WD-IDEA-ASSET-122, WD-IDEA-ASSET-124)
- **Jumpsuit case**: suit photo, description changed to orange jumpsuit, upload as reference; same character appears (WD-IDEA-ASSET-123) [voice]
- **Accept or cancel**: accept saves Final Description and image as active; cancel reverts to pre-upload state (WD-IDEA-ASSET-125)
- **Background removal by redraw**: plain white redraw; segmentation model later; isolated regeneration produces white (WD-IDEA-ASSET-126, WD-IDEA-ASSET-127) [voice]
- **Shared modal**: Stages 5 and 8 share one; Stage 8 saves accepted descriptions as scene overrides (WD-IDEA-ASSET-128) [voice]
- **Rejected reconciliation**: earlier Stage 5 keep/replace/merge, unreconciled Stage 8 uploads, three-column modal replaced or dropped (WD-IDEA-ASSET-129, WD-IDEA-ASSET-130) [rejected]
- **Description choice**: keep existing, replace with image-based plus script details, or merge; previewed before confirm (WD-IDEA-ASSET-131) [planned]
- **Rejected merge and tags**: agentic part-picking merge; directional tags (wet, bloody) (WD-IDEA-ASSET-132, WD-IDEA-ASSET-133) [alt, rejected]
- **Upload intent**: alt: explicit Full Replacement vs Starting Point; alt: implicit, upload always opens modal (WD-IDEA-ASSET-134, WD-IDEA-ASSET-135) [alt, voice]
- **Batch intake**: heavy per-image actions deferred until after commit via reconciliation (WD-IDEA-ASSET-138) [planned]
- **Rejected batch screen**: one modal per batch image rejected; targets do not exist at intake (WD-IDEA-ASSET-139) [rejected]

### Global asset library
- **Library**: master assets independent of projects, usable as templates; search, grid or list, type tabs; create, edit, delete (WD-IDEA-ASSET-140, WD-IDEA-ASSET-141)
- **Deletion and promotion**: deletion checks dependents first; "Promote to Global" clones asset or instance, linked to source (WD-IDEA-ASSET-142, WD-IDEA-ASSET-143)
- **Clone and reuse**: clone remembers version; global description is base, project details add without contradiction (WD-IDEA-ASSET-144, WD-IDEA-ASSET-145)
- **Richer promotion**: versioning, templates, cross-project sharing (WD-IDEA-ASSET-146) [future]

### Scene asset instances (Stage 8)
- **Instance sources**: inherited from prior scene, project asset, dependencies, or manual; scene 1 bootstraps from locked assets matched by name (WD-IDEA-ASSET-149, WD-IDEA-ASSET-150, WD-IDEA-ASSET-151)
- **Suggestions**: from extraction map, grouped by type, labeled by source and review status (WD-IDEA-ASSET-152, WD-IDEA-ASSET-154)
- **Starting-state details**: source, description, visual-update need, inherited tags, inclusion reason (WD-IDEA-ASSET-155)
- **AI relevance**: AI suggests project assets for scene and discovers new ones, with justification (WD-IDEA-ASSET-156, WD-IDEA-ASSET-157)
- **Persistent suggestions**: survive reload; accept or dismiss; no duplicates (WD-IDEA-ASSET-158) [planned]
- **Ways to add**: project assets, new asset, or "Detect with AI"; manual add, delete, re-add, recategorize meant reliable (WD-IDEA-ASSET-159, WD-IDEA-ASSET-160, WD-IDEA-ASSET-161)
- **Relevance options**: alt: extraction map only, no AI pass; alt: AI with dismissable "new assets required" suggestions (WD-IDEA-ASSET-162, WD-IDEA-ASSET-163) [alt]
- **Scene-only creation**: created under "Add New Assets"; inline form vs drawer open (WD-IDEA-ASSET-164, WD-IDEA-ASSET-165)
- **Asset drawer**: adds, creates scene-only, switches sources, search, filter, promotes to global (WD-IDEA-ASSET-166)
- **Remove from scene**: removes only the scene link, never project or global asset; confirmed (WD-IDEA-ASSET-167)

### Scene images
- **Use Master As-Is**: on by default; copies master image without generation; bulk application planned (WD-IDEA-ASSET-168, WD-IDEA-ASSET-169)
- **Master beside scene images**: generate, drop or upload, or use master; scene image never replaces approved master (WD-IDEA-ASSET-170, WD-IDEA-ASSET-171)
- **State changes**: typed changes (e.g. "add mud") applied while keeping master identity and style (WD-IDEA-ASSET-172)
- **Reference history**: defaults to previous scene's instance; cycle chain; "Use This Reference" confirms (WD-IDEA-ASSET-174)
- **Attempts and uploads**: every attempt kept with time, cost, prompt; side-by-side; any can be made active (WD-IDEA-ASSET-176, WD-IDEA-ASSET-177)
- **Workflow**: suggestions, as-is toggle, edit, pick reference, bulk generation, compare, condition tags (WD-IDEA-ASSET-178)

### Undecided scene assets
- **Visual reference gate**: every scene asset needs visual reference before prompts (WD-IDEA-ASSET-185)
- **Fallback modal**: falls undecided assets back to latest instance or master; undecided deferred assets auto-generated (WD-IDEA-ASSET-187) [planned, voice]
- **Fallback order**: alt: previous instance, then master, then generation; alt: imageless assets excluded (WD-IDEA-ASSET-188, WD-IDEA-ASSET-191) [alt]
- **Tiered gating**: alt: primary characters generated, secondary may use masters, minor props "Generate Later"; alt: imageless assets raise issues (WD-IDEA-ASSET-189, WD-IDEA-ASSET-190) [alt, planned]

### Status tag tooling
- **Tag templates and history**: predefined sets for scenarios; history of adds and removes (WD-IDEA-ASSET-192, WD-IDEA-ASSET-193) [future]
- **Bulk and filtered tags**: bulk operations; filter by tag in drawer (WD-IDEA-ASSET-194, WD-IDEA-ASSET-195) [future]
- **Tag prompt enrichment**: tags expand prompts ("muddy" to "covered in mud, dirty, realistic grime") at light or heavy severity (WD-IDEA-ASSET-196, WD-IDEA-ASSET-197) [future]
- **Tag conflicts and analytics**: flags incompatible combinations; project tag-usage dashboard (WD-IDEA-ASSET-198, WD-IDEA-ASSET-199) [future]

### Asset-to-shot assignment and blocking stand-ins
- **Shot-asset initialization**: Stage 8 sets which assets appear in which shots (WD-IDEA-ASSET-200)
- **Shot badges and camera metadata**: scene images carry camera-angle metadata for frame generation (WD-IDEA-ASSET-201, WD-IDEA-ASSET-202) [planned, voice]
- **Angle auto-selection**: shot camera picks best angle as top reference, then instance, then master (WD-IDEA-ASSET-203)
- **Assignment options**: alt: every asset in every shot, full but noisy; alt: confidence-scored preselection with all-assets fallback (WD-IDEA-ASSET-204, WD-IDEA-ASSET-205) [alt, planned]
- **Rule-based defaults**: locations throughout; characters if named in foreground or background; props if action or setting mentions them (WD-IDEA-ASSET-206) [planned]
- **Blocking asset pool**: flat pool of characters and props, one-line description, changeable palette color (WD-IDEA-ASSET-207, WD-IDEA-ASSET-208)
- **Blocking removal and population**: removal of shot-referenced asset asks confirmation; setup populates from shots and instances (WD-IDEA-ASSET-209, WD-IDEA-ASSET-210) [planned]

### Visual consistency and future visual tools
- **Casting-brief descriptions**: age, presentation, hair, eyes, features, build, skin, garments, accessories, held props (WD-IDEA-ASSET-212)
- **Typed reference slots**: 1-3 consistent references per character reduce drift; up to three typed per generation: character, object, style (WD-IDEA-ASSET-213, WD-IDEA-ASSET-214)
- **Define-once references**: alt: define character, style, or setting once and reference by name in every shot (WD-IDEA-ASSET-218) [alt]
- **Style-building**: web scouting refined by favorites; style model trained on uploaded dataset (WD-IDEA-ASSET-219, WD-IDEA-ASSET-220) [future, voice]
- **Model and reference tools**: character model training for reuse; reference clip deconstructed into style, shot types, camera moves, palette (WD-IDEA-ASSET-221, WD-IDEA-ASSET-222) [future]
- **Anime mode**: dedicated mode for anime fans (WD-IDEA-ASSET-223) [future, voice]
- **Shared clip library**: product-supplied clips, or global pool from user-submitted clips (WD-IDEA-ASSET-224) [future, voice]

## Locations, shots, cinematography, and previs


### Location model and product tiers
- **Layered model**: always-on baseline (shot links, match confidence, prompt context, frame reuse); opt-in advanced layer; optional blocking layer (WD-IDEA-LOC-017)
- **Tiers** [planned]: light tier for speed, one establishing image or text appended to frame prompts (WD-IDEA-LOC-018, WD-IDEA-LOC-020); advanced precision tier for predictable spatial continuity, background control, repeat and reverse angles, reusable anchors (WD-IDEA-LOC-019)
- **Advanced stack**: sub-location precision, per-location directions, per-shot assignment, pre-generation coverage, established views (WD-IDEA-LOC-049)
- **Flexible reading** [voice]: AI reasons how space looks from each shot's viewpoint, e.g. overhead reference becomes eye-level background (WD-IDEA-LOC-021, WD-IDEA-LOC-009)
- **Opt-in multi-direction**: toggle for continuity-focused users with larger budgets; not default (WD-IDEA-LOC-022, WD-IDEA-LOC-023, WD-IDEA-LOC-024)
- **Care modes** [voice]: speed vs precision, cost vs budget; flat views default, toggle unlocks robust mode (WD-IDEA-LOC-025)
- **Minimal setup** [planned, voice]: minimum images, AI infers each shot; no forced multi-view, per-shot directions, or hard blocks (WD-IDEA-LOC-026)
- **Production loop**: keep one approved frame and edit only the delta (characters, props, pose, damage); advanced controls only when needed (WD-IDEA-LOC-028, WD-IDEA-LOC-029)
- **Fresh-project start**: one location image resolves shots, generates a frame, reused as base, promoted to established view (WD-IDEA-LOC-030)
- **Required scenarios** [planned]: single location, repeated shots, missing coverage, reuse loop promoting a frame (WD-IDEA-LOC-031)
- **Carry-forward**: locations are environmental constants across scenes; asset states follow carry-forward toggle (WD-IDEA-LOC-013)
- **Image format**: masters and views 16:9 cinematic; no background isolation; remove-background hidden (WD-IDEA-LOC-011, WD-IDEA-LOC-012)
- **Original model**: one widescreen master, optional scene override, shots matched by name (WD-IDEA-LOC-051)
- **Rejected approaches**: upfront multi-view library with central coverage report [rejected] (WD-IDEA-LOC-014) ; advanced system as main experience [rejected] (WD-IDEA-LOC-015); prompt-only continuity [rejected] (WD-IDEA-LOC-016)

### Sub-locations and room granularity
- **Room-level precision** [voice]: headings and shot settings name exact room or area, not generic building label (WD-IDEA-LOC-052, WD-IDEA-LOC-054, WD-IDEA-SHOT-027)
- **Per-room establishing images** [voice]: each room (kitchen, hallway) may have one; a scene may use several (WD-IDEA-LOC-053)
- **Split heading display** [planned, voice]: location name and separate time-of-day field in scene lists and header (WD-IDEA-LOC-056)
- **Granularity rules**: sub-locations may merge for light cues; real change of space gets own location; subtle moves become per-shot direction changes (WD-IDEA-LOC-057, WD-IDEA-LOC-058, WD-IDEA-LOC-059)
- **Asset burden**: surfaced upfront; 15 sub-locations x 3 directions = 45 images before any frame (WD-IDEA-LOC-061)
- **Room structure options**: alt: each room its own location, 3-5x more assets (WD-IDEA-LOC-062) ; alt: one location's views cover zones, parsed from action text, fewer assets (WD-IDEA-LOC-063); alt: parent-child, parent gives shared style and palette (WD-IDEA-LOC-064); alt: flat view list per location, default (WD-IDEA-LOC-065); alt, future: zone hierarchy, or grouping label if flat list struggles (WD-IDEA-LOC-066); nested scene graph [rejected] (WD-IDEA-LOC-067)
- **Open question**: size (mansion, ship, school) where flat view list breaks down; fix may defer (WD-IDEA-LOC-068)
- **Sub-location assignment options**: alt: inference in script or dependency stage (creator leaned toward) or shot-list stage (WD-IDEA-LOC-069, WD-IDEA-LOC-070) ; alt: per-shot sub-location and direction, incl. characters moving between areas (WD-IDEA-LOC-072, WD-IDEA-SHOT-085); alt: split headings first, per-shot fallback (WD-IDEA-LOC-073)
- **Movement-cue gaps** [voice]: movement cues in action text tag shots with zones and flag areas lacking references (WD-IDEA-LOC-075, WD-IDEA-SHOT-083)
- **Continuation scenes**: show inherited location and coverage, or expected location's coverage (WD-IDEA-LOC-076)

### Camera directions and view library
- **Named-shot library** [planned]: named shots (name, description, status, order) in coverage grid; upload or generate each or all pending (WD-IDEA-LOC-078, WD-IDEA-LOC-079, WD-IDEA-LOC-080); alt, planned: MVP with manual selection per shot before auto-matching (WD-IDEA-LOC-081); alt: free-text named shots, separate from character angles (WD-IDEA-LOC-086); earliest primary-default vantage images [rejected] (WD-IDEA-LOC-077)
- **View library**: named reference views (establishing plus walls or directions) selected per shot (WD-IDEA-LOC-082)
- **Universal directions**: interior walls (stove, window) and exterior facings as named vantage points, not fixed rotations (WD-IDEA-LOC-083, WD-IDEA-LOC-002)
- **Walls model** [voice]: walls are a room's directions; start with shot and reverse; minimal defaults are wide walls plus one aerial establishing (WD-IDEA-LOC-084, WD-IDEA-LOC-095)
- **Direction naming**: alt: establishing, Direction 1, Direction 2 with primary fallback, auto-inferred (WD-IDEA-LOC-087) ; fixed four-angle character rotation [rejected] (WD-IDEA-LOC-085)
- **View types and tags** [voice]: establishing, eye-level, detail, zone; tagged with sub-location, distance, height (WD-IDEA-LOC-088, WD-IDEA-LOC-089)
- **View record**: system name, alias, description, type, distance, height, image, primary flag, source, provenance; one per name (WD-IDEA-LOC-090)
- **Source badges**: User, Established (from approved frame), Inferred (awaiting image) (WD-IDEA-LOC-091)
- **Semantic names** [planned]: "entry-facing" or "north wall", numbers as fallback (WD-IDEA-LOC-092)
- **Primary and establishing roles**: one primary per location, eye-level fallback, never overhead; establishing always sent as spatial context (WD-IDEA-LOC-093, WD-IDEA-LOC-094)
- **Interior/exterior**: from INT./EXT. heading prefix (WD-IDEA-LOC-096)

### Suggested views and asset-stage setup
- **Additive suggestions** [planned]: suggest missing defaults, so partial locations improve; all-or-nothing [rejected] (WD-IDEA-LOC-101, WD-IDEA-LOC-102)
- **Minimum views**: open question; early answer is establishing plus eye-level, rest from shot-list analysis (WD-IDEA-LOC-103)
- **Default sets**: alt: interior establishing, eye-level primary and reverse, two details; exterior establishing, street, approach, aerial, detail (WD-IDEA-LOC-097) ; alt: five to ten per location by type, editable (WD-IDEA-LOC-098); alt: establishing plus two walls, or three to four walls, detail optional (WD-IDEA-LOC-099); alt: max three per type (WD-IDEA-LOC-100)
- **Camera Directions manager**: suggested defaults in empty state, upload, inline alias and description, primary star, source badges, custom directions, image count (WD-IDEA-LOC-104)
- **Optional asset-stage setup**: views defined fully, partially, or not at all; advisories compensate; batch differences explicit (WD-IDEA-LOC-105, WD-IDEA-LOC-106)

### View creation and generation
- **Creation sources**: alt: upload every view, high quality, high friction (WD-IDEA-LOC-107) ; alt: upload one, generate rest, lower friction (WD-IDEA-LOC-108); alt: hybrid, AI fills gaps flagged as inferred (WD-IDEA-LOC-109)
- **Text-only locations**: alt: full multi-view set upfront (WD-IDEA-LOC-110) ; alt: on demand, when shots need them (WD-IDEA-LOC-111)
- **Establish-then-derive** [planned]: iterate one strong establishing shot, derive other views from it, approve or regenerate each (WD-IDEA-LOC-112, WD-IDEA-LOC-113)
- **Starting-point framing** [idea]: complex rooms generated to curate; easy uploads and single-reference consistency test first (WD-IDEA-LOC-114)
- **Style-referenced generation**: existing location image as style reference plus angle prompt demanding same palette, architecture, lighting (WD-IDEA-LOC-115)
- **Anchor cascade**: establishing, else primary, else master; disabled until a reference exists; views never overwrite master (WD-IDEA-LOC-116, WD-IDEA-LOC-117)
- **Style-reference picker** [future, voice]: choose or opt out; default off (WD-IDEA-LOC-118)
- **Batch generation**: alt, recommended: one click generates missing views sequentially, per-direction buttons too (WD-IDEA-LOC-119) ; alt: confirmation lists views and style reference first (WD-IDEA-LOC-120); alt, planned: propose-review-confirm from uncovered shot clusters (WD-IDEA-LOC-121)
- **Gap proposals**: alt: auto-proposed name and description per gap, Generate or Skip, capped to shot needs (WD-IDEA-LOC-122) ; alt: manual definition (WD-IDEA-LOC-123); alt: standard view template (WD-IDEA-LOC-124)

### Shot-to-location identity and resolution
- **Canonical link**: each shot carries one reliable location link; setting text stays editable copy; expected location comes from structured heading, extraction only for legacy scripts (WD-IDEA-LOC-032, WD-IDEA-LOC-033, WD-IDEA-LOC-125, WD-IDEA-LOC-126, WD-IDEA-LOC-129)
- **Link record**: confidence, reason, source (manual, exact, alias, fuzzy, inferred, legacy); states resolved, suggested, ambiguous, unresolved (WD-IDEA-LOC-130)
- **Visible confidence** [planned]: explicit, inferred, weak, or missing (WD-IDEA-LOC-035)
- **Aliases and normalization**: multiple aliases per location; names lowercased, punctuation and INT./EXT. stripped, articles optionally dropped (WD-IDEA-LOC-131, WD-IDEA-LOC-133)
- **Resolution cascade**: assigned direction's parent, exact name, exact alias, fuzzy token overlap, expected location; reports candidates (WD-IDEA-LOC-132)
- **Ambiguity hold**: top two within about 0.08 stays unresolved; candidates shown; nothing auto-picked (WD-IDEA-LOC-134)
- **Shared resolver**: sole matching source for extraction, edits, lock checks, coverage, asset relevance (WD-IDEA-LOC-135)
- **Timing and manual lock**: runs at extraction, debounced edits, bulk updates; manual picks lock at full confidence, separate from changed suggestions (WD-IDEA-LOC-136, WD-IDEA-LOC-137)
- **Scene batch resolve**: dry-run or apply, minimum confidence, counts of updated, unresolved, ambiguous (WD-IDEA-LOC-138)
- **Backfill**: dry-run report; only high-confidence, unambiguous, non-manual links auto-apply; rest to review queue (WD-IDEA-LOC-139, WD-IDEA-LOC-141)
- **Unresolved as advisory** [planned]: never shown as errors (WD-IDEA-LOC-140)
- **Telemetry**: unmatched and manual reassignment rates; per-decision log; thresholds set before enforcement (WD-IDEA-LOC-143)
- **Alias management** [future]: curate, dedupe, normalize (WD-IDEA-LOC-144)

### Shot-list location linking
- **Shot-list ownership**: extraction, setting, initial link suggestion, basic confidence, light correction, lock warnings; not view management (WD-IDEA-LOC-042)
- **Link control**: shots manually linked or cleared, or auto-resolved; missing links warned (WD-IDEA-SHOT-076)
- **Linked-location selector**: searchable, beside setting; confidence badge, match source, candidates when ambiguous (WD-IDEA-LOC-145)
- **Per-shot actions**: Accept Suggestion, Choose Different, Clear, exit to coverage tools (WD-IDEA-LOC-146)
- **Scene banner** [planned]: counts weak or unresolved shots; Review now or Continue (WD-IDEA-LOC-147)
- **Calm unresolved states** [planned]: obvious, not alarming; list stays usable (WD-IDEA-LOC-148)
- **Lock-time checks**: counts unresolved, ambiguous, and high-confidence links diverging from expected location; warns by default (WD-IDEA-LOC-149)
- **Hard block** [alt]: lock blocks above unresolved threshold, in later phase (WD-IDEA-LOC-150)

### Direction assignment per shot
- **Shot-to-direction**: each shot assigned one direction, which decides its reference image; one direction serves many shots (WD-IDEA-LOC-152, WD-IDEA-LOC-153)
- **Camera fields**: shot list assigns direction by camera facing, fills distance, height, movement; educated choices when none exist (WD-IDEA-LOC-154, WD-IDEA-LOC-155)
- **Inferred bootstrap**: missing directions inferred with AI alias and description, no image, so every shot assigns without asset setup (WD-IDEA-LOC-156)
- **Parent sync**: assigning a direction can set location to its parent unless manual link conflicts; clearing re-resolves unless locked (WD-IDEA-LOC-158)
- **View-usage control** [voice]: how many different views shots use, from many varied to one or two (WD-IDEA-LOC-159, WD-IDEA-SHOT-082)
- **Assignment method**: alt, recommended: deterministic metadata matching, fast and free (WD-IDEA-LOC-160, WD-IDEA-SHOT-081) ; alt: AI classification, accurate but costly (WD-IDEA-LOC-161); alt, future: metadata with AI fallback (WD-IDEA-LOC-162); fuzzy keyword matching vs named shots [rejected] (WD-IDEA-LOC-163)
- **Scoring heuristic**: unassigned shots scored on height, distance, alias keywords; zero falls back to primary; explicit always wins (WD-IDEA-LOC-164)
- **Closest view** [voice]: nearest view attached, prompt describes real framing; over-the-shoulder uses reverse view (WD-IDEA-LOC-165, WD-IDEA-LOC-010)
- **Visible and shared direction** [planned, voice]: direction clearly shown on shot; one value editable in shot list, visual definition, prompt review (WD-IDEA-LOC-166, WD-IDEA-LOC-168)
- **AI-suggested, user-confirmed**: suggested, confirmable per shot, persisted, drives generation (WD-IDEA-LOC-167, WD-IDEA-SHOT-084)
- **Persistence open question**: immediate or on save; old frames would need regeneration (WD-IDEA-LOC-169)
- **Auto-assign**: Auto-Assign Shots in coverage panel pre-fills by metadata; reviewed before commit (WD-IDEA-LOC-170)
- **Direction editing surfaces**: alt, recommended: read-only badge with dropdown in inspector, visual definition main editor (WD-IDEA-LOC-171) ; alt: full editing with thumbnails and assignment table in shot list (WD-IDEA-LOC-172, WD-IDEA-SHOT-088); alt: read-only label (WD-IDEA-LOC-173, WD-IDEA-SHOT-090); shot-list direction editing [rejected] (WD-IDEA-LOC-174)
- **Prompt-review transparency**: alt, recommended: read-only refs labeled by role, alias, delta and weak-fallback warnings (WD-IDEA-LOC-175) ; alt: reassigning there marks prompts stale and allows view override (WD-IDEA-LOC-176); alt: prompt text only (WD-IDEA-LOC-177)
- **Every shot resolves**: explicit assignment, scored match, or primary fallback (WD-IDEA-SHOT-077)

### Frame reference attachment and fallbacks
- **Reference sets**: alt: best match plus establishing plus character and prop refs (WD-IDEA-LOC-178) ; alt: best match only (WD-IDEA-LOC-179); alt: up to three role-labeled refs (background, palette, close-up detail) (WD-IDEA-LOC-180); named-shot priority [rejected] (WD-IDEA-LOC-181)
- **Recorded strategy**: each shot records background source: matched direction, primary, establishing, base image, imageless direction, or text only (WD-IDEA-LOC-182)
- **Direction-first** [planned]: direction image is main background, establishing second; prompt states angle, distance, height (WD-IDEA-LOC-183)
- **Fallbacks and repairs**: primary, establishing, base image, with adaptation note; imageless directions get risk notice and generate, upload, or establish repair (WD-IDEA-LOC-184, WD-IDEA-LOC-185)
- **No unrelated substitution**: no usable image means text-only generation with weak-continuity warning; other locations never used (WD-IDEA-LOC-186, WD-IDEA-LOC-187)
- **Order and labels**: matched direction, establishing, characters, props, each with numbered role label (WD-IDEA-LOC-188)
- **Requested background** [voice]: a set background or view attaches exactly for its frame (WD-IDEA-LOC-189)
- **Budget open question**: which location refs drop when characters and props exceed budget (WD-IDEA-LOC-190)
- **Style vs identity**: location images are style and environment refs (palette, materials, atmosphere); characters, props, base frames are identity refs (WD-IDEA-LOC-191)
- **Delta reframing**: prompt keeps space, reframes it, describes shot camera; coverage flags imperfect match (WD-IDEA-LOC-192)
- **Locked scene descriptors**: lighting, color grade, architecture, materials, time of day repeated identically in every prompt (WD-IDEA-LOC-194)
- **Structure and style conditioning** [future]: needs separate image-model infrastructure (WD-IDEA-LOC-197)

### Generation package and prompt transparency
- **Continuity package** [planned]: one per shot, source for prompt text and attached images; covers direction, framing, refs, base frame, risks, reasons (WD-IDEA-LOC-200)
- **Prompt-review panel**: reference stack in generation order with thumbnails, roles, reasons, risk badges, overall continuity strength (WD-IDEA-LOC-201)
- **Plain wording** [planned]: "using matched direction view", "No exact height match" (WD-IDEA-LOC-202)

### Coverage advisory and continuity panels
- **Pre-generation report**: non-blocking; clusters shots by view group; flags missing matching view, e.g. reverse with no secondary (WD-IDEA-LOC-203, WD-IDEA-LOC-204)
- **Corrective actions**: Generate Missing Views or Proceed Anyway; shots per direction with counts and closest matches (WD-IDEA-LOC-205)
- **Coverage states**: directions covered, fallback, imageless, unassigned, mismatched; shots good, partial, fallback, risky, unassigned (WD-IDEA-LOC-206)
- **Grouping and layout**: one section per canonical location plus "No linked location"; view inventory, direction groups, generate actions; none for scenes without location (WD-IDEA-LOC-207, WD-IDEA-LOC-208)
- **Established provenance**: distinct display with source scene and shot (WD-IDEA-LOC-209)
- **Risks and table**: specific risks (e.g. reverse coverage needed); shot, setting, link, view, verdict, quick change (WD-IDEA-LOC-210)
- **Separate baseline problems** [planned]: unlinked shots shown apart from direction-coverage problems (WD-IDEA-LOC-211)
- **One-step repairs**: create or default views, add directions, assign shots, generate missing images, batch-generate, use approved frame, create shells (WD-IDEA-LOC-212)
- **Severity by mode**: warnings for default users; hard gates only in advanced or strict mode; unresolved links are data quality; unassigned directions advisory (WD-IDEA-LOC-036, WD-IDEA-LOC-213, WD-IDEA-LOC-151)
- **Empty states** [planned]: calls to action, e.g. set up directions (WD-IDEA-LOC-214)
- **Progress bar** [idea]: beside "X/Y shots covered"; red, amber, emerald (WD-IDEA-LOC-215)

### Discoverability and navigation
- **Visual-definition ownership**: coverage, direction review, missing views, advanced entry, high-risk repair; not buried in asset setup (WD-IDEA-LOC-043, WD-IDEA-LOC-027)
- **Deferred locations** [planned]: direction controls stay reachable; scene notice offers activation (WD-IDEA-LOC-217)
- **Navigation and quick-start** [idea]: links between direction manager and coverage panel; guided "Set Up Location Directions" flow (WD-IDEA-LOC-218, WD-IDEA-LOC-219)
- **Project coverage dashboard** [future]: Script Hub row dots per scene; smarter auto-assignment later (WD-IDEA-LOC-220)

### Continuity modes and progressive disclosure
- **Basic and Advanced modes**: saved per project, default Basic, shown in coverage panel and frame bar; per-scene later (WD-IDEA-LOC-221)
- **Advanced entry** [planned]: labeled entry points on request, drift, or opt-in; never mandatory (WD-IDEA-LOC-222)
- **Advanced suggestions** [planned]: when shots share a location, angles repeat, fallbacks recur, or corrections pile up (WD-IDEA-LOC-223)
- **Suggestion strip and health**: dismissible Basic-mode strip; health metrics for unresolved links, gaps, fallbacks, base-frame use, reuse rate (WD-IDEA-LOC-224, WD-IDEA-LOC-225)
- **Strict mode** [future]: stronger warnings or progression blocks (WD-IDEA-LOC-226)
- **Advanced tier entry options**: alt: toggle (WD-IDEA-LOC-227) ; alt: empty-state entry point (WD-IDEA-LOC-228); alt: progressive disclosure (WD-IDEA-LOC-229)

### Established views from approved frames
- **Approved frame as established view**: locked as direction's view; later shots reuse it; library grows from production (WD-IDEA-LOC-230, WD-IDEA-LOC-037, WD-IDEA-LOC-231)
- **Benefit signal** [idea]: shows established views improve later generations (WD-IDEA-LOC-235)
- **Gap banner**: after approval, offers lock when direction has no image; otherwise subtle link (WD-IDEA-LOC-232)
- **Establish prompt placement**: alt: only to fill an assigned direction's gap (WD-IDEA-LOC-233) ; alt: any shot, with direction dropdown (WD-IDEA-LOC-234)
- **Auto-lock** [future]: first approved frame per direction; manual default (WD-IDEA-LOC-236)
- **Provenance and management**: source scene, shot, frame; inherits distance and height; removable or swappable; re-establish flow (WD-IDEA-LOC-237, WD-IDEA-LOC-238)
- **Replacement options**: alt: side-by-side compare, old archived for rollback (WD-IDEA-LOC-239) ; alt: overwrite in place (WD-IDEA-LOC-240); alt: coexist as alternative (WD-IDEA-LOC-241); alt, planned: promote as new view, replace image, or location baseline, recording origin (WD-IDEA-LOC-242)

### Cross-scene location continuity and overrides
- **Camera-position anchor** [voice]: locked view for position A anchors every later position-A shot in that room (WD-IDEA-LOC-243)
- **Project-level shared views** [planned]: shared by every scene's instance of a location (WD-IDEA-LOC-245)
- **Recurring location with change** [planned]: recognizable while reflecting story changes, e.g. diploma on wall (WD-IDEA-LOC-246)
- **Scene override options**: alt, recommended: defer overrides, assignments project-global [future] (WD-IDEA-LOC-248) ; alt: project-level vs per-scene shots, spec recommended project-level with scene overrides (WD-IDEA-LOC-271); alt: text-only override (WD-IDEA-LOC-249); alt, planned: per-scene image variants, e.g. smoke damage (WD-IDEA-LOC-250); alt, future: post-transformation views (WD-IDEA-LOC-251)

### Environment, time of day and world inputs
- **Environment description** [idea]: materials, surface, props, depth, atmosphere, time or weather as visible light only (WD-IDEA-LOC-252)
- **Visible setting** [planned]: visible part of location, lighting, time-of-day cues, atmosphere (WD-IDEA-LOC-253, WD-IDEA-SHOT-026)
- **Day and night variants** [idea]: e.g. establishing_day (WD-IDEA-LOC-254)

### 3D worlds and angle capture
- **World per location** [planned]: generated once per location, revisited for every scene's angles; per-scene worlds [rejected] (WD-IDEA-LOC-255, WD-IDEA-LOC-256)
- **Panorama transfer** [future]: game-engine 360 panoramas as backgrounds (WD-IDEA-LOC-257)
- **Rough worlds suffice**: few references, sloppy but workable space, never photorealistic (WD-IDEA-LOC-258, WD-IDEA-SHOT-108, WD-IDEA-SHOT-113)
- **Studio lobby and lazy generation** [planned]: per-location list with scenes, angle count, world status; world built on first Enter Studio (WD-IDEA-LOC-259, WD-IDEA-LOC-260)
- **Seeding** [planned]: location refs plus one or two extra angles; three to five ideal (establishing wide, eye-level hero, opposite wall, detail or light), three minimum (WD-IDEA-LOC-261, WD-IDEA-LOC-262)
- **Input methods**: alt: four drop slots at 0, 90, 180, 270 degrees with hints (WD-IDEA-LOC-263) ; alt: two to eight images, layout inferred (WD-IDEA-LOC-264); alt: text, single video, or single image, optionally panoramic (WD-IDEA-LOC-265); alt: earlier drag-and-drop uploader (WD-IDEA-LOC-266)
- **Slots map to views** [planned]: establishing as front, other directions as right, back, left (WD-IDEA-LOC-267)
- **Angle library and studio scenes** [planned]: captures saved with timestamp, label, scene, shot; scene selector auto-tags to target shot, holds unassigned (WD-IDEA-LOC-268, WD-IDEA-LOC-269, WD-IDEA-SHOT-120, WD-IDEA-SHOT-121)
- **Unassigned angles** [open]: assignable later from frame generation or only in studio? (WD-IDEA-SHOT-122)
- **Swappable worlds**: swap in session, load pre-built, or from another provider (WD-IDEA-LOC-270)

### Shot list creation and structure
- **Extraction**: scene without shot list gets one on entry, split into timed shots in a table beside detail editor (WD-IDEA-SHOT-001, WD-IDEA-SHOT-002)
- **Rearview panel** [rejected]: previous scene's final frame and dialogue; replaced by multi-tab panel (WD-IDEA-SHOT-004)
- **Continuity and quality** [idea]: notes link prior and next scenes; first shot matches prior ending; alternate medium shots and close-ups, specific camera language, spread dialogue, match target length (WD-IDEA-SHOT-005, WD-IDEA-SHOT-008)
- **Audio-aligned** [idea]: shots align to audio timing; dialogue carries transcript excerpts (WD-IDEA-SHOT-009)
- **Imported lists** [alt, future]: import supplied script or storyboard, matching panel labels to script labels (WD-IDEA-SHOT-010)

### Shot duration and clip composition
- **Atomic shot** [idea]: one primary action or dialogue exchange; shorten action or lengthen duration if it will not finish (WD-IDEA-SHOT-011, WD-IDEA-SHOT-013)
- **Default eight seconds**: matches generator clip length; four to six suggested for complex action (WD-IDEA-SHOT-012)
- **Duration options**: alt: fixed eight seconds (WD-IDEA-SHOT-014) ; alt: four, six, or eight seconds (WD-IDEA-SHOT-015); alt: one to thirty seconds, four to twelve recommended (WD-IDEA-SHOT-016)
- **One action per clip** [alt]: action chains split across shots (WD-IDEA-SHOT-017)
- **Timestamp prompting** [alt]: one video prompt choreographs about two-second beats, anchored by start frame (WD-IDEA-SHOT-018)

### Shot fields and placement
- **Shot record** [idea]: ID, duration, verbatim dialogue, one action, characters with prominence, setting with lighting, camera spec, continuity flags, optional beat link (WD-IDEA-SHOT-019)
- **IDs and suffixes** [idea]: scene number plus letter (3A, 3B), reorderable; splits take 3A-1, 3A-2; merged shot keeps first ID with "-M" (WD-IDEA-SHOT-020, WD-IDEA-SHOT-021)
- **Character placement**: foreground, background, or off-screen; left, center, right; distance; facing (WD-IDEA-SHOT-022, WD-IDEA-SHOT-023)
- **Off-screen dialogue** [idea]: O.S. present but unseen; V.O. voiceover; later stages decide if rendered (WD-IDEA-SHOT-024)
- **Dialogue-driven choices** [idea]: two-shots, over-the-shoulders, close-ups; speaker sets focus (WD-IDEA-SHOT-025)
- **End-frame toggle**: start-and-end default; start-only for models without end frames (WD-IDEA-SHOT-029)

### Camera language and shot description
- **Camera spec**: shot type, angle, movement from standard vocabulary, plus framing notes (WD-IDEA-SHOT-030)
- **Lens character** [planned]: telephoto compression or wide-angle distortion (WD-IDEA-SHOT-031)
- **Meanings** [idea]: EWS for scale, CU for intimacy, low angles for power; movements such as dolly-in, crane, handheld, dolly zoom carry intent (WD-IDEA-SHOT-032, WD-IDEA-SHOT-033)
- **Explicit video movement** [idea]: fixed vocabulary, e.g. "slow dolly in", or static (WD-IDEA-SHOT-034)
- **Static and moving split**: frame prompts carry position and composition; movement and rack focus go to video prompts (WD-IDEA-SHOT-035, WD-IDEA-SHOT-036)
- **Placement vocabulary** [idea]: frame left and right, foreground, midground, background, facing, overlap (WD-IDEA-SHOT-037)
- **Structured camera fields**: distance, height, movement, direction beside free text; AI emits when possible, deterministic parser otherwise, incl. legacy shots (WD-IDEA-SHOT-038, WD-IDEA-SHOT-039)
- **Cinematography export** [future]: lens, film stock, color grade reference block (WD-IDEA-SHOT-041)

### Shot descriptions and performance
- **Directional descriptions** [planned]: richly directional, without cutting shot count, dialogue accuracy, or character assignment; crew-note style (WD-IDEA-SHOT-042, WD-IDEA-SHOT-043, WD-IDEA-SHOT-050)
- **Viewer-visible action**: positions, choreography, spatial relations, implied lighting; no vague actions (WD-IDEA-SHOT-044)
- **Performance style** [planned, voice]: signature style, e.g. exaggerated physical acting, carries into prompts (WD-IDEA-SHOT-046)

### Shot editing and validation
- **Inspector**: every field editable; shows duration, action, dialogue, characters, setting, camera, beat, AI rationale (WD-IDEA-SHOT-051)
- **Dependent fields** [idea]: editing one field, e.g. wide to close-up, regenerates dependents (WD-IDEA-SHOT-052)
- **Split**: AI splits at natural break into two or three shots with adjusted camera, no invented story; optional guidance; each keeps full duration (WD-IDEA-SHOT-053, WD-IDEA-SHOT-054, WD-IDEA-SHOT-055)
- **Merge**: adjacent shots combine, durations summed; Next or Previous partner toggle (WD-IDEA-SHOT-056, WD-IDEA-SHOT-058)
- **Dialogue-aware** [voice]: split sends each line to its shot; merge keeps order; still editable (WD-IDEA-SHOT-057)
- **Delete and autosave**: shots deletable; autosave after short pause; last shot protected, with option to defer scene to Script Hub (WD-IDEA-SHOT-059, WD-IDEA-SHOT-060)
- **Tempo agent** [idea]: non-destructive pacing suggestions (WD-IDEA-SHOT-061)
- **Script sidebar** [voice]: collapsible panel with relevant script and beat passages (WD-IDEA-SHOT-062)
- **Lock errors**: empty list, duplicate IDs, missing action, setting, or camera, durations under 1 or over 30 seconds (WD-IDEA-SHOT-063)
- **Overridable lock warnings**: durations outside 4-12 seconds, unusual scene length, missing character names, missing location links (WD-IDEA-SHOT-064)
- **Lock flow**: local then server validation; all issues in one dialog with Fix Issues path (WD-IDEA-SHOT-065)

### Creative directing options
- **Auteur style capsule** [voice]: separate from visual style; sets shot count, types, framing as different directors would (WD-IDEA-SHOT-069)
- **Complexity modes** [future, voice]: from full coverage to minimal single-wall shooting, e.g. simple 2D mode (WD-IDEA-SHOT-070)
- **Experimental techniques and transitions** [voice]: suggested at set frequency; match cuts and stylized shots (WD-IDEA-SHOT-071, WD-IDEA-SHOT-072)
- **Film sampling** [future, voice]: user supplies a clip, uploaded or described, to emulate its editing or pacing (WD-IDEA-SHOT-073, WD-IDEA-SHOT-074, WD-IDEA-SHOT-075)

### Shot-asset presence and frame inputs
- **Presence types**: throughout uses start and end; enters uses end; exits uses start; passes through is video only (WD-IDEA-SHOT-091)
- **Per-shot relevance** [idea]: not every asset on every shot; imported blocking must not attach everything; correction UI in Stages 8 or 9 (WD-IDEA-SHOT-092, WD-IDEA-SHOT-093)
- **Separate prompts** [idea]: still prompt and motion prompt per shot (WD-IDEA-SHOT-095)
- **Extend shot** [future, voice]: provider extend with cost tracking; research spike first (WD-IDEA-SHOT-096)
- **Rough sketches**: guide composition and blocking, never identity or style unless tagged (WD-IDEA-SHOT-097, WD-IDEA-SHOT-098)

### Blocking references
- **Composition reference** [future]: optional capture, storyboard frame, sketch, or layout controlling framing, placement, pose, screen direction (WD-IDEA-SHOT-099)
- **Never identity** [planned]: not character, prop, location, lighting, or art direction unless marked (WD-IDEA-SHOT-100)
- **Layout-guide prompts** [planned, voice]: mannequins are layout guides only (WD-IDEA-SHOT-101)
- **Division of authority** [planned, voice]: blocking owns framing, angle, crop; location gives environment; characters and props give appearance, not placement (WD-IDEA-SHOT-102)
- **Per-shot blocking and conflict checks** [planned]: per shot or scene, separate start and end frames; conflicts flagged before generation (WD-IDEA-SHOT-103, WD-IDEA-SHOT-104)
- **Reserved roles** [future]: composition and start and end roles reserved; no previs tool yet (WD-IDEA-SHOT-105, WD-IDEA-SHOT-106)

### CineBlock previs concept
- **Block-and-capture** [voice]: shot blocked in rough 3D world, still captured, sent with prompt and asset images (WD-IDEA-SHOT-107, WD-IDEA-SHOT-111)
- **Mannequins and primitives** [voice]: placeable mannequins for characters, primitives for props; real characters render at generation (WD-IDEA-SHOT-109)
- **Shot-by-shot blocking** [voice]: start and end blocked per shot; eight shots in under a minute (WD-IDEA-SHOT-110, WD-IDEA-SHOT-112)
- **Three-input generation** [planned]: text, asset visual states, and capture each contribute; model matches arrangement (WD-IDEA-SHOT-114)
- **Browser previs tool**: generates world, blocks, lights, captures via virtual camera, exports per-shot start and end frames with metadata (WD-IDEA-SHOT-115)
- **Virtual production studio** [planned]: navigable world from location assets; walk, place, screenshot, pick best angle before generation (WD-IDEA-SHOT-116, WD-IDEA-SHOT-117)
- **Output routing** [planned]: captures become composition refs; camera data fills shot fields; asset placement informs assignment (WD-IDEA-SHOT-118)
- **Studio entry options**: alt: full-screen modal from frame generation (WD-IDEA-SHOT-127) ; alt: unlocks after Stage 8 per scene, or after Stage 5 globally (WD-IDEA-SHOT-128); alt, planned: Reference Frame picker per frame (WD-IDEA-SHOT-129); alt, planned: hero capture as direct frame, alternates as style refs (WD-IDEA-SHOT-130); alt, future: import from standalone tool (WD-IDEA-SHOT-124); alt: first-class product, independent of intake (WD-IDEA-SHOT-125)

### CineBlock hackathon build
- **Standalone demo**: browser-only, no backend, login, or integration; built to prove concept end to end (WD-IDEA-SHOT-134)
- **Shot card and details**: name or slugline, action, camera type, assets; collapsible duration 1-30 s (default 8), distance, height, movement; new shots default wide, 8 s (WD-IDEA-SHOT-136, WD-IDEA-SHOT-137)
- **Reordering** [future]: drag in setup; order kept through studio and results (WD-IDEA-SHOT-138)
- **Asset pool**: flat characters and props with one-line descriptions; auto-colored, changeable (WD-IDEA-SHOT-139)
- **Metadata and asset options**: alt: metadata only as blocking reference (WD-IDEA-SHOT-140) ; alt: camera type sets default distance and height, user values override (WD-IDEA-SHOT-141); alt: per-shot on or off-screen checkboxes (WD-IDEA-SHOT-142); alt: one flat list for all shots (WD-IDEA-SHOT-143)

### CineBlock studio camera and viewfinder
- **Layout**: 3D canvas left, shot sidebar right, collapsible (WD-IDEA-SHOT-144)
- **Camera controls**: orbit, dolly, zoom, keyboard fly, reset to default (WD-IDEA-SHOT-145, WD-IDEA-SHOT-146)
- **Dutch roll**: roll for Dutch angles; one key resets; roll recorded per capture (WD-IDEA-SHOT-147)
- **Viewfinder**: marks captured frame, dims outside; toggle thirds grid; cosmetic film labels (WD-IDEA-SHOT-148, WD-IDEA-SHOT-149)
- **Cosmetic lens presets**: 35, 50, 85 mm and zoom readout are labels only; field of view unchanged (WD-IDEA-SHOT-150)
- **Floating toolbar**: Capture, Start/End, Reset Camera, aspect and grid, sidebar collapse, Done to Results with confirm (WD-IDEA-SHOT-151)
- **Shortcuts**: Space captures; 1 and 2 Start and End; L lighting; T resets roll; Escape deselects; G, R, E transforms; arrows in lightbox (WD-IDEA-SHOT-152)
- **World loading and rendering**: progressive loading [future] (WD-IDEA-SHOT-153) ; level-of-detail [idea] (WD-IDEA-SHOT-154); animated transitions [idea] (WD-IDEA-SHOT-155)
- **Navigation options**: alt: free first-person with mouse look (WD-IDEA-SHOT-156) ; alt, default: orbit a point of interest with optional first-person (WD-IDEA-SHOT-157)
- **Viewfinder ratio options**: alt: follows project format (16:9, 2.39:1, 9:16) (WD-IDEA-SHOT-158) ; alt: user picks in toolbar, letter or pillarboxing (WD-IDEA-SHOT-159)

### CineBlock studio shots and asset visibility
- **Shot sidebar and active panel**: ordered shots with camera badge, click sets capture target; action and metadata shown muted (WD-IDEA-SHOT-160, WD-IDEA-SHOT-161)
- **Visibility toggles**: color dot and eye per asset; resets to shot's on-screen set; manual override (WD-IDEA-SHOT-162)
- **Off-screen options**: alt: staging area outside viewfinder (WD-IDEA-SHOT-163) ; alt: not rendered (WD-IDEA-SHOT-164)

### CineBlock mannequins, props and lighting
- **Mannequins**: color-coded stand-ins with name labels, built for position, not fidelity (WD-IDEA-SHOT-165)
- **Per-shot placement**: positions, rotations, scales, poses kept per shot; feet snap to ground, props land at hit point (WD-IDEA-SHOT-166, WD-IDEA-SHOT-167)
- **Placement controls**: translate, rotate, scale handles; Place, visibility toggle, Remove; occlusion on or off, semi-transparent (WD-IDEA-SHOT-168, WD-IDEA-SHOT-169)
- **Click placement** [idea]: invisible collision surface, fallback to point in front of camera (WD-IDEA-SHOT-170)
- **Deferred** [future]: physics, character animation, automatic placement (WD-IDEA-SHOT-171, WD-IDEA-SHOT-172)
- **Mannequin forms**: alt: static T-pose (WD-IDEA-SHOT-173) ; alt: posable, adjustable height (default 1.7 m) and build (WD-IDEA-SHOT-174); alt: capsule and sphere, scaled box prop (WD-IDEA-SHOT-177)
- **Primitive shapes**: alt: typed primitives for humans, quadrupeds, props, vehicles (WD-IDEA-SHOT-175) ; alt: box, cylinder, cone props with animal silhouettes (WD-IDEA-SHOT-176)
- **Placement entry**: alt: world center (WD-IDEA-SHOT-178) ; alt: crosshair, miss places asset a default distance ahead (WD-IDEA-SHOT-179)
- **Character color**: alt: one color across project and sessions (WD-IDEA-SHOT-180) ; alt: session only (WD-IDEA-SHOT-181)
- **Two-layer lighting**: global ambient and directional sliders plus per-shot point and spot lights; Kelvin, tint, intensity, falloff, cone and edge (WD-IDEA-SHOT-182, WD-IDEA-SHOT-183)
- **Lighting carry-over and helpers**: shot without lights inherits previous; helpers hidden from captures (WD-IDEA-SHOT-184, WD-IDEA-SHOT-185)
- **Lighting controls** [rejected]: no-controls scope replaced by two-layer system (WD-IDEA-SHOT-186)

### CineBlock capture, results and export
- **Capture flow**: pick shot, Start or End, compose, capture; cropped to viewfinder into shot's tray (WD-IDEA-SHOT-187, WD-IDEA-SHOT-188)
- **Hero**: one per shot per frame type, starred; first capture default (WD-IDEA-SHOT-189)
- **Return-to-angle and notes** [future]: stored camera position; text notes in results and exports (WD-IDEA-SHOT-190, WD-IDEA-SHOT-191)
- **Persistence**: browser session only; export is persistence path; real use would save each capture (WD-IDEA-SHOT-192, WD-IDEA-SHOT-193)
- **Results and lightbox**: read-only cards with camera line, action, Start and End rows, hero first; click to enlarge, arrows navigate, Escape closes (WD-IDEA-SHOT-194, WD-IDEA-SHOT-195)
- **Navigation safety**: Back to Studio keeps state; Start Over confirms; returning to Setup warns captures will be lost (WD-IDEA-SHOT-196)
- **Archive and manifest export**: folder per shot and frame type, heroes first; readable manifest with assets, shots, camera, durations, world ID, settings (WD-IDEA-SHOT-197, WD-IDEA-SHOT-198)
- **Pipeline brief**: per shot: index, action, camera, duration, assets, hero start and end, blocking reference (WD-IDEA-SHOT-199)
- **Deferred** [future]: pre-generated quick demo (WD-IDEA-SHOT-200); multiplayer, standard 3D formats, in-tool video, multi-scene (WD-IDEA-SHOT-201); headset blocking dropped (WD-IDEA-SHOT-202)
- **Export format options**: alt: tool's own format or pipeline format (WD-IDEA-SHOT-203) ; alt: one combined file with both sections (WD-IDEA-SHOT-204)

## Creative state, continuity, generation, and prompting


### Global and scene context
- **Packages**: Project-wide package (length, genre, tone, style, beat sheet, locked assets) feeds all Phase B steps and can add asset manifest and continuity rules; branch-aware package assembled at end of Stage 5 (WD-IDEA-CONT-003, WD-IDEA-CONT-004, WD-IDEA-CONT-005, WD-IDEA-CONT-006)
- **Scene-local context**: Excerpt, shot list, asset instances and prior end state pulled from stored scene-asset map (WD-IDEA-CONT-001, WD-IDEA-CONT-007, WD-IDEA-CONT-062)
- **Scene dependencies**: Scene lists dependent characters, locations, props; drives suggestions; missing assets addable by hand (WD-IDEA-CONT-008)
- **Presence**: Speakers can be required present; off-screen characters count as present (WD-IDEA-CONT-009)
- **Scoped prompts**: Phase B calls omit non-active scene scripts, limiting drift and overflow; trimming favors recent asset states; context size monitored (WD-IDEA-CONT-002, WD-IDEA-CONT-010)
- **Automatic injection**: Central system injects global or local context before every AI call; no manual pasting (WD-IDEA-CONT-011, WD-IDEA-GEN-012)
- **Shared story context**: Assembled once, batched into small calls for several asset suggestions (WD-IDEA-CONT-012)
- **Facts ledger**: Clarification answers become branch-scoped facts, re-injected as facts not to contradict [planned] (WD-IDEA-CONT-037, WD-IDEA-CONT-038)

### What each AI step sees
- **Narrative**: Beat extraction sees treatment, length, genre, tone, capsule; script generation sees beat sheet, rating, genre, tone, capsule, not treatment prose (WD-IDEA-CONT-013, WD-IDEA-CONT-014)
- **Shot list**: Global context, scene script and beats, prior scene end state (WD-IDEA-CONT-015)
- **Asset continuity manager**: Reads global context, shot list, prior instances to decide which master assets appear (WD-IDEA-CONT-016)
- **Visual state**: Master and previous scene descriptions, user edits, global context, capsule (WD-IDEA-CONT-017)
- **Frame prompt**: Global context, shot, instances with overrides and tags, frame type (start or end), previous-frame reference, capsule (WD-IDEA-CONT-018)

### Inheritance and overrides
- **Flow**: Downstream only; no upstream changes, no self or later-stage inheritance (WD-IDEA-CONT-019)
- **Layers**: Priority layers from local overrides to system limits; prompts assembled in fixed order and frozen as immutable snapshots (WD-IDEA-CONT-020, WD-IDEA-CONT-021)
- **Overrides**: Explicit, on named fields, logged as diffs; scene and shot work may override visual emphasis, framing, pacing, verbosity (WD-IDEA-CONT-022, WD-IDEA-CONT-023)
- **Protected fields**: Genre, core tone, narrative thesis, style locks rejected or flagged (WD-IDEA-CONT-024)
- **Authority**: Narrative stages refine global tone without contradicting it; scene and shot stages add local emphasis only (WD-IDEA-CONT-025, WD-IDEA-CONT-026)
- **Upstream fixes**: Media stages have no creative authority; defects traced upstream (WD-IDEA-CONT-027)
- **Drift records**: Violations (forbidden overrides, authority escalation, style or tone breaches) kept as permanent records without blocking work (WD-IDEA-CONT-028)
- **Audit and diagnosis**: Generations record inherited context, override diffs, capsule versions, parent stages, prompt versions, references, trace; breaches traced upstream and rules adjusted (WD-IDEA-CONT-029, WD-IDEA-CONT-030)
- **Stability**: Rules stay fixed across engine, provider or style-system swaps (WD-IDEA-CONT-031)
- **Asset flow**: Master assets to per-scene instances to continuity tags (WD-IDEA-CONT-032)

### Style capsule scope and lock changes
- **Scope**: Global-only, narrative-only, scene-only, asset-specific, or combined with inheritance (WD-IDEA-CONT-033)
- **Lock change**: Warns; can flag existing images "style outdated" or clear them so regeneration follows (WD-IDEA-CONT-034)
- **Lighting descriptors**: Two or three standard lighting and color descriptors reused across a sequence's frame prompts (WD-IDEA-CONT-035, WD-IDEA-GEN-048)

### Asset identity and appearance
- **Identity block**: Name, age, hair, eyes, features, build, clothing, accessories copied verbatim from approved description into every frame prompt (WD-IDEA-CONT-042)
- **Frame-moment cues**: Expression, posture, gesture, gaze, physical state kept separate from identity; parentheticals ("crying") and delivery notes inform look and voice (WD-IDEA-CONT-043, WD-IDEA-GEN-042, WD-IDEA-CONT-054)
- **Wardrobe lock**: Clothing and accessories stay identical across shots unless story motivates change (WD-IDEA-CONT-044)
- **State changes**: Sweat, injury, prop wear or activation; tagged "damaged", "activated", "compromised" (WD-IDEA-CONT-051)
- **Transformation rule**: Only real visual appearance changes count; emotional or dialogue shifts do not (WD-IDEA-CONT-053)
- **Two-way evolution**: Assets change both ways across scenes (muddy to clean, injured to healed) with inheritance chain intact (WD-IDEA-CONT-052)

### Scene asset instances and condition tags
- **Instance override**: Scene edit (mud, new hairstyle) saves new instance with audit trail; master untouched; tracks modification count, last field, optional reason (WD-IDEA-CONT-045, WD-IDEA-CONT-055)
- **Description precedence**: Scene override, then prior scene description, then master description (WD-IDEA-CONT-046)
- **Condition tags**: Temporary states (wet, bloody, muddy, torn) per instance, from shot outcomes or keyboard dropdown; applied only once shot list is ready, after Stage 7 (WD-IDEA-CONT-047, WD-IDEA-CONT-048)
- **Tag rendering**: Tags appended as visual modifiers in instance images; frame prompts describe damage and dirt (WD-IDEA-CONT-049)
- **Instance recipe**: Selected master regenerated with scene description and tags in one pass; capsule sets look [voice] (WD-IDEA-CONT-050)
- **Change log**: What, when, why; per-asset rollback separate from branch rollback [planned] (WD-IDEA-CONT-056)
- **Story-state assets**: Several assets per character, each for a scene range; alt: starting-state assets only, changed states reference prior instance images [alt] (WD-IDEA-CONT-057, WD-IDEA-CONT-058)

### Scene-to-scene handoff
- **Inherited state**: Prior-scene assets start in end state; new assets start from master; explicit changes flagged (WD-IDEA-CONT-059, WD-IDEA-CONT-060)
- **Population order**: From Scene 2: prior-scene state, expected-dependency gaps, project assets, detected dependencies or manual picks (WD-IDEA-CONT-061)
- **Frame bundle**: Characters, major props, location direction shots pulled automatically; blocking is the only added piece [voice] (WD-IDEA-CONT-063)
- **Lineage and carry-forward**: Instances record inherited-from scene; carry-forward toggle (on by default) sets tag persistence; user confirms each carried tag (e.g. "muddy") (WD-IDEA-CONT-064, WD-IDEA-CONT-065, WD-IDEA-CONT-066)
- **Ownership**: Asset stage sets starting state at first appearance; frame generation owns in-scene evolution, derived from action and prior frame (WD-IDEA-CONT-067, WD-IDEA-CONT-068)
- **Scene end state**: Prose summary, final-frame thumbnail, final action and dialogue, approved end frame, instance states, positions, setting; loop-back returns to scene hub as previous scene (WD-IDEA-CONT-069, WD-IDEA-CONT-070, WD-IDEA-CONT-072) ; AI summary of appearance, position, emotion and prop or location changes after last frame [planned, voice] (WD-IDEA-CONT-071)
- **Consumers**: Shot list, asset relevance and frame prompts use prior end state; opening shot matches positions and states, setting matches or transitions explicitly (WD-IDEA-CONT-073, WD-IDEA-CONT-074)
- **Notes and links**: Shot list notes connection to prior and next scenes; end frame and next start frame serve as adjacent references for each other (WD-IDEA-CONT-075, WD-IDEA-CONT-076)

### Reference chain across scenes
- **Prior-scene default**: Reference defaults to most recent prior selected image; carousel cycles earlier instances and master (WD-IDEA-CONT-078)
- **Fallbacks**: First scene uses master; instance-less scenes skipped; order instance, master, placeholder [planned] (WD-IDEA-CONT-079)
- **Fresh resolution**: References resolved at frame generation, not from list cached at prompt time (may go stale or expire) [planned] (WD-IDEA-CONT-082)
- **Instance feed-through**: Frame generation receives scene instance image, not master; continuity comes from asset images (WD-IDEA-CONT-081, WD-IDEA-GEN-114, WD-IDEA-GEN-115)
- **State chain**: Inheritance from master through scene instance, prompts and frames; final frames reflect master and scene assets (WD-IDEA-CONT-080)
- **Timeline and repair**: State evolution timeline with validation and repair; visual inheritance tree later [planned, future] (WD-IDEA-CONT-083)

### Story-informed scene state
- **Per-asset update**: "Update from Story Context" reads script, treatment, beats, shot actions; proposes description and tags with reasoning (WD-IDEA-CONT-085) ; alt: automatic scene variants stored beside master and editable [alt] (WD-IDEA-CONT-097)
- **Bulk update**: Checked assets run same inference in one action; enabled only with selection (WD-IDEA-CONT-086)
- **Inferred content**: Clothing, physical and emotional state, change from master; for characters, props, locations (WD-IDEA-CONT-087)
- **Review**: Bulk screen accepts or rejects per asset, side-by-side current vs suggested; single preview offers Accept Description, Accept Tags, Accept Both, Dismiss, with new tags marked and reasoning shown (WD-IDEA-CONT-088, WD-IDEA-CONT-089, WD-IDEA-CONT-090)
- **Tags and versions**: Tags merge and deduplicate, never replace; accepting adds version-history entry, all versions cycleable (WD-IDEA-CONT-091, WD-IDEA-CONT-092)
- **Regeneration and tuning**: Image regeneration is optional, earlier image kept [voice]; inference tunable to avoid over-eager changes (WD-IDEA-CONT-093, WD-IDEA-CONT-094)
- **Detection**: Detection and condition inference run as separate actions with separate buttons [voice]; alt: combined detection button, replaced [rejected] (WD-IDEA-CONT-095, WD-IDEA-CONT-096)
- **Intake**: Supplies scene images, state changes, references, manual adds or deletes; assets auto-populate by default (WD-IDEA-CONT-099)

### Mid-scene transformations
- **Variation**: Mid-scene blood, wardrobe, room changes driven by shot prompt, not new per-shot images [voice] (WD-IDEA-CONT-101)
- **Detection**: State changes detected from shot action text during shot list build, with visual-evolution context kept for frames [planned] (WD-IDEA-CONT-102)
- **Transformation detection**: Shot extraction flags costume changes, physical transformations, injuries, disguises, magical changes (WD-IDEA-CONT-103)
- **Types**: Instant (on a cut), within-shot (on camera), or gradual (trigger shot to completion shot) (WD-IDEA-CONT-104)
- **Gating**: Events must be confirmed and completed; unconfirmed events can block progress (WD-IDEA-CONT-105)
- **Post-transformation**: Description of 500 characters or fewer, inferable from trigger shot alone; own image per event, regenerable in scene (WD-IDEA-CONT-106, WD-IDEA-CONT-107, WD-IDEA-CONT-108)
- **Post-image reference**: Pre-transformation image can serve as identity reference; "Use as ref" toggle swaps in current post image (WD-IDEA-CONT-109)
- **Editing ease**: Could match upload and edit ease of instance regeneration [voice] (WD-IDEA-CONT-110)
- **Badges**: Per-shot Pre-Transform, Transforming or Post-Transform badge with chain context beneath (WD-IDEA-CONT-111)

### Start and end frame references
- **Presence-based references**: Assets classed throughout, enters, exits or passing through; pass-through appear in video only (WD-IDEA-CONT-112, WD-IDEA-CONT-113)
- **Distinct end-frame assets**: End frame may use different instance assets (transformation, entry, exit) [planned, voice] (WD-IDEA-CONT-114)
- **End-frame rules**: Explicit list wins; else reuses start refs with post-transformation images swapped in; start frame kept as identity reference (WD-IDEA-CONT-115)
- **Location anchoring**: Location refs in both frames keep background stable across in-shot transformation unless action changes it (WD-IDEA-CONT-116)
- **Editable set**: Pre-to-post swaps highlighted; end-frame images manually overridable [planned] (WD-IDEA-CONT-117)
- **Action result**: End frame shows action outcome with same camera and characters; appearance changes only when transformation completes (WD-IDEA-CONT-118)

### Within-scene shot chaining
- **Neighbor-aware prompts**: Shot visuals account for previous and next shots; framing and mise-en-scene stay continuous unless asked [planned, voice] (WD-IDEA-CONT-120)
- **Prior-shot prompt chaining**: Earlier shots' visual and narrative state summarized into prompts; chain viewable, editable, toggled per scene [planned, voice] (WD-IDEA-CONT-121)
- **Post-shot end-state extraction**: Compact summary of positions, postures, prop states, environment, emotional beat; no camera info; injected into next shot [planned] (WD-IDEA-CONT-122, WD-IDEA-CONT-123)
- **Division of labor**: Transformations set each shot's appearance; chaining carries action, position, state; transformed shot end state reflects new description [planned] (WD-IDEA-CONT-124, WD-IDEA-CONT-125)
- **Opening state**: User-settable opening (e.g. all seated at table) anchors first shot (WD-IDEA-CONT-126)
- **Context panel and re-chain**: Editable "Context from prior shot" saved as persistent state; "regenerate from here" re-chains forward with progress [planned] (WD-IDEA-CONT-127, WD-IDEA-CONT-128)
- **Chain toggle**: Scene-level "Chain prompts" toggle, default on for 2+ shot scenes; chain and broken-chain icons between cards [planned] (WD-IDEA-CONT-129)
- **Cost and quality**: One extraction call per shot, roughly doubling prompt time, so users could be warned; improve frame prompts first since chaining amplifies quality (WD-IDEA-CONT-130, WD-IDEA-CONT-131, WD-IDEA-GEN-097)
- **Continuity flags**: Per-shot flags for character handoffs, prop exchanges, entries, exits (WD-IDEA-CONT-132)
- **Context depth**: alt: rolling (prior shot end state only, bounded) or cumulative (all prior, richer, prone to bloat) [alt] (WD-IDEA-CONT-133, WD-IDEA-CONT-134)

### Adjacent frame continuity
- **Seeded handoff**: Start frame seeded from previous end frame; first- and last-frame control keeps handoffs smooth and positions consistent (WD-IDEA-CONT-135, WD-IDEA-CONT-136, WD-IDEA-CONT-137)
- **Match time point**: Next start frame is exact copy of previous end frame, or a "cut to different angle" generated from it [voice] (WD-IDEA-CONT-138)
- **Transition classification**: Each transition classed match, camera change or none from camera specs; AI recommends, user overrides (WD-IDEA-CONT-139)
- **Match mode**: Pixel-identical copy at zero generation cost; prompt describes same visual state (WD-IDEA-CONT-140)
- **Camera-change recomposition**: Built from previous end frame; changes only camera position, framing, depth of field; keeps expression, props, lighting, time of day (WD-IDEA-CONT-141, WD-IDEA-CONT-142)
- **Ground truth**: Actual previous end-frame image analyzed and outranks stored metadata (WD-IDEA-CONT-143)

### Camera-change fidelity
- **Pull and push references**: "Pull Ref" and "Push Ref" attach another frame as continuity reference; generator keeps its characters and subjects (WD-IDEA-CONT-145)
- **Moment carry**: Exact scene moment carried into a re-shot from a different angle [voice] (WD-IDEA-CONT-144)
- **Visible-content prompts**: Reference-linked prompts describe what is visible (e.g. frowning character, raised hand), not only metadata (WD-IDEA-CONT-146, WD-IDEA-CONT-150)
- **Fidelity by change size**: Small reframes work reasonably; medium hit or miss; large (POV, reverse) unreliable (WD-IDEA-CONT-147)
- **Dedicated angle generators**: Novel-view and multi-angle generators considered; none reliable in every case [alt] (WD-IDEA-CONT-148)
- **Analyze-then-generate**: Vision model turns reference into structured description (positions, expressions, clothing, layers, props, lighting, palette), noting keep and change, which becomes the prompt (WD-IDEA-CONT-149)
- **Dual anchoring**: Source image stays visual anchor alongside semantic description [planned] (WD-IDEA-CONT-151)
- **Manual prompt**: User writes or overrides camera-change prompt; analysis still enriches it (WD-IDEA-CONT-152)
- **Linked-asset consistency**: Linked characters, locations, props could keep camera-change frames consistent, if UX favors it over reference alone [voice] (WD-IDEA-CONT-153)
- **Asset-backed identity**: Canonical asset descriptions feed camera-change prompts; end frame alone cannot hold identity, clothing, accessories (WD-IDEA-CONT-154, WD-IDEA-CONT-155)
- **Trifecta**: Reference image (composition, style), scene analysis (moment), asset descriptions (canonical features) combine (WD-IDEA-CONT-156)
- **Pipeline**: Previous end frame first, then character assets, then style refs; prompt from analysis, asset descriptions and target camera specs [planned] (WD-IDEA-CONT-157, WD-IDEA-CONT-158)
- **Context metadata**: Prior shot's camera and location metadata, location views, character angle variants keep spatial consistency (WD-IDEA-CONT-159)
- **Invisible upgrade**: Quality gain adds no new buttons or modals; Pull Ref or auto-detected change simply yields better result (WD-IDEA-CONT-160)
- **Confidence indicator**: Could show or log confidence comparing new frame with reference [future] (WD-IDEA-CONT-161)
- **Analysis tiers**: alt: simple changes (zoom, medium to full) skip analysis, complex ones use analyze-then-generate with dual anchoring; alt: analyze every change [alt] (WD-IDEA-CONT-162, WD-IDEA-CONT-163)
- **Analysis timing**: alt: each regeneration; at pull time with cached result; or once, cached on frame [alt] (WD-IDEA-CONT-164, WD-IDEA-CONT-165, WD-IDEA-CONT-166)
- **Analysis cost**: About $0.01 to $0.03 and 2 to 3 seconds, against 10 to 30+ seconds per frame; latency hardly noticed (WD-IDEA-GEN-164)
- **Pull feedback**: alt: badge and hint that regeneration applies new angle; or automatic regeneration at unrequested credit cost [alt] (WD-IDEA-CONT-167, WD-IDEA-CONT-168)

### Continuity links
- **Link kinds**: Match link is reactive copy whose updates propagate; reference link is non-reactive, inspired by source, never propagates (WD-IDEA-CONT-169)
- **Reference links**: First-class: shown, removable, reasoned about like match links; Push Ref creates same link from source side (WD-IDEA-CONT-170)
- **Unified concept**: Match and reference links under one "continuity link" concept, distinct badge colors (WD-IDEA-CONT-171)
- **Multiple references**: Frame holds continuity, character, style references at once; continuity one replaceable alone (WD-IDEA-CONT-172)
- **Continuity base**: User picks reusable base from generated frames as anchor for new frame (WD-IDEA-CONT-175)
- **Exclusivity**: alt: one link per target frame, or one per type shown as several badges; match and reference mutually exclusive per pair [alt] (WD-IDEA-CONT-176, WD-IDEA-CONT-177)
- **Staleness**: alt: resolve source's current image at generation, or keep pull-time image and accept staleness [alt] (WD-IDEA-CONT-178, WD-IDEA-CONT-179)

### Non-adjacent continuity
- **Need**: Shot-reverse-shot can reference non-adjacent output (shot 3 uses shot 1, not shot 2) [planned] (WD-IDEA-CONT-180)
- **Pickers**: "Link to different shot" shows every shot's start and end thumbnails; "Link Reference Frame" shows frames across scene and other scenes; removable links [planned] (WD-IDEA-CONT-181, WD-IDEA-CONT-182, WD-IDEA-CONT-183)
- **Many-to-many**: Several incoming links per frame; duplicate pairs disallowed; unlinked shots fall back to adjacent shot [planned] (WD-IDEA-CONT-184)
- **Primary reference**: User stars one reference for full analysis; others attach without analysis [planned] (WD-IDEA-CONT-185)
- **Alternating setups**: A-B-A-B camera setups could be auto-detected and suggested for linking, user-confirmed [future] (WD-IDEA-CONT-186)
- **Relationship map**: Shot list shows colored dots or connector lines for linked shots, groups color-coded [planned] (WD-IDEA-CONT-187)
- **Callbacks**: Recurring establishing shots, flashbacks, dream callbacks across scenes [future] (WD-IDEA-CONT-188)
- **Background-only reuse**: Drag in a shot frame marked background-only for later reuse in scene [voice] (WD-IDEA-CONT-189)
- **Primary alternatives**: alt: most recent link is primary; or analyze and merge all linked references at higher cost [alt] (WD-IDEA-CONT-191, WD-IDEA-CONT-192)
- **Detection timing**: alt: during prompt generation, informing prompts earlier; or during frame generation, where references are managed [alt] (WD-IDEA-CONT-193, WD-IDEA-CONT-194)

### Frame reuse as continuity base
- **Establish-then-reuse**: One liked frame generated from establishing reference, then reused and edited across scene and later scenes [voice] (WD-IDEA-CONT-197)
- **Drag-in base**: Any generated frame, any shot or scene, becomes editable base; edits change only the delta [voice] (WD-IDEA-CONT-198, WD-IDEA-GEN-160, WD-IDEA-GEN-161)
- **Three paths per shot**: Reuse or edit approved frame, variation from base, or fresh, with stated continuity goal [planned] (WD-IDEA-CONT-199)
- **Ranked bases**: Bases from same location rated strong, usable or weak, each with reason, plus fresh option; ranking puts same-scene, approved, recent frames first, excluding own and imageless frames (WD-IDEA-CONT-200, WD-IDEA-CONT-201)
- **Strength and primary**: Selected base raises continuity strength (strong base, no risks, yields "strong"); becomes primary reference; prompt describes only delta (WD-IDEA-CONT-202, WD-IDEA-CONT-203)
- **Base fallback**: If base deleted, rejected or imageless, falls back to normal references without attaching twice (WD-IDEA-CONT-204)
- **Edit-delta workflow**: Separates what stays from what changes; shows carried background and location refs [planned] (WD-IDEA-CONT-205)
- **Promotion and lineage**: Approved output can stay output, become established view, or serve as base; each frame records derivation (reuse, edit, camera-change reference, match, manual copy) as chain [planned] (WD-IDEA-CONT-206, WD-IDEA-CONT-209)
- **Workspace**: Frame stage as main continuity workspace: review, approval, reuse-by-default, establish-as-view, cross-shot curation [planned] (WD-IDEA-CONT-210)

### Continuity review and repair
- **Break flagging**: Continuity breaks flagged to user, not silently ignored (WD-IDEA-CONT-212)
- **Prompts as tools**: System prompts and regeneration text boxes are main practical continuity tools (WD-IDEA-CONT-213)
- **Rearview tab**: Prior end-state text and end-frame thumbnail; flags significant changes for hand-off (WD-IDEA-CONT-214, WD-IDEA-CONT-215)
- **Rearview scope**: Can show unfinished previous scene's assets or carousel [planned] (WD-IDEA-CONT-216)
- **Rearview folded**: Standalone rearview judged possibly not useful; folded into multi-tab panel (rearview, script, shot list) [rejected] (WD-IDEA-CONT-217)
- **Frame comparison**: Prior final frame beside new start frame; ghost overlay and flicker (WD-IDEA-CONT-218)
- **Comparison modes**: Ghost overlay, flicker, side-by-side with alignment guides and slider; mode switcher [future, voice] (WD-IDEA-CONT-219)
- **Advisory risk**: Prior end state vs opening needs rated Safe, Risky or Broken; warnings only (WD-IDEA-CONT-220)
- **Content-aware risk**: Flags character, location, prop, timeline, logic inconsistencies with suggested corrections [planned] (WD-IDEA-CONT-221)
- **Override**: "Acknowledge and Proceed" past risk, or "Mark as Reviewed" intentional break; reason kept as audit trail [planned] (WD-IDEA-CONT-222)
- **Edit-break warnings**: Removing depended-on asset or changing relied-on state warns [planned] (WD-IDEA-CONT-223)
- **Drift checks**: Post-approval check of consecutive frames for character, setting, prop consistency; minor variation tolerated; rated safe, risky or broken, with fixes (WD-IDEA-CONT-224, WD-IDEA-CONT-225) ; frame-level detector for clothing, setting, props [future] (WD-IDEA-GEN-170); pre-start check of end vs start frame with confidence scores [future] (WD-IDEA-CONT-226)
- **Cross-scene drift**: Final frames across scenes compared for character, prop, location drift [planned] (WD-IDEA-CONT-227)
- **Automated analysis**: Similarity scoring, appearance tracking, prop validation, lighting checks, correction suggestions [future] (WD-IDEA-CONT-228)
- **Dashboard**: Project-level scene continuity status, problems, resolution progress, timeline and logic warnings [planned] (WD-IDEA-CONT-229)
- **Exports**: Continuity reports, production notes, reference sheets as post-MVP tooling [future] (WD-IDEA-CONT-230, WD-IDEA-CONT-231)
- **Anchor repair**: Anchor frames validated; regenerated or fixed by region inpainting with local instruction (e.g. one expression) (WD-IDEA-CONT-232)
- **Repair loop**: Prompt stage shows previews and per-shot asset timelines; sends users back to fix assets or transformations before regenerating prompts (WD-IDEA-CONT-233)

### Upstream changes and script revision
- **Downstream re-run**: Upstream edit re-runs downstream AI steps with fresh context and new version, reusing unchanged inputs (WD-IDEA-CONT-234)
- **Cascade**: Scene edits mark later work outdated and later scenes "continuity broken", with cost warning; high-cost option (WD-IDEA-CONT-235)
- **Stable identity**: On re-approval, stable scene identities keep existing work; removed scenes become "continuity broken" (WD-IDEA-CONT-238)
- **Scene-preserving pivot**: Middle or ending scenes pivoted without losing other finished work or global generations [voice] (WD-IDEA-CONT-239)
- **Script diff update**: Second draft diffed against current; only changed scenes return to shot-list re-entry [future] (WD-IDEA-CONT-240)
- **Remix revision**: Uploaded revision diffed automatically; flags scenes to regenerate, unaffected work intact [future] (WD-IDEA-CONT-241)
- **Scattered invalidation**: One revision can invalidate non-contiguous scenes across stages [future] (WD-IDEA-CONT-242)
- **Reconciliation options**: alt: fork new branch at revision point; or mutate active branch from script diff with real rollback [alt, future] (WD-IDEA-CONT-243, WD-IDEA-CONT-244)
- **Change definition**: alt: raw text diff, semantic AI diff, or manual per-scene confirmation [alt, future] (WD-IDEA-CONT-245, WD-IDEA-CONT-246, WD-IDEA-CONT-247)

### Prompt architecture
- **Two-hop realization**: Cheap image model makes reviewable anchor frames; expensive video model bridges them, used only for final video (WD-IDEA-GEN-007)
- **Separate prompt types**: Frame prompts (image only), video prompts (motion and sound only), hidden system scaffolds; never merged (WD-IDEA-GEN-001, WD-IDEA-GEN-002)
- **Look vs action**: Frame prompt defines how the world looks; video prompt defines what happens; each iterates independently (WD-IDEA-GEN-004, WD-IDEA-GEN-006)
- **Monolithic prompt**: One combined visual, action and audio prompt per shot; rejected for frame and video pair (WD-IDEA-GEN-003) [rejected]
- **Verbosity split**: Frame prompts as descriptive as possible; video prompts lean, since visual detail dilutes action (WD-IDEA-GEN-005)
- **Ingredients-to-video flow**: Reference images, then start frame from frame prompt and references, then video from anchor and lean prompt (WD-IDEA-GEN-009, WD-IDEA-GEN-010)
- **Image-to-video inputs**: Start frame, optional end frame, video prompt; provider produces audio with picture [voice] (WD-IDEA-GEN-008)
- **Environment anchor**: Start frame is sole environment anchor for video (WD-IDEA-GEN-011)

### Prompt assembly
- **Inputs**: Final references, shot-level relevance, storyboard notes, frame and video inputs; template-built so identical inputs give identical structure [planned] (WD-IDEA-GEN-014, WD-IDEA-GEN-016)
- **Assembly sources**: Script excerpt, master descriptions and images, shot list, scene instances, style directives, transformation events [planned] (WD-IDEA-GEN-015)
- **Irrelevant context**: Intake context could be kept out of prompts when irrelevant; open overload concern (WD-IDEA-GEN-018)
- **Prompt-writer alternatives**: alt: template scaffolding with LLM filling only creative gaps; alt: reasoning step interpreting varied intent [alt] (WD-IDEA-GEN-019, WD-IDEA-GEN-020)

### Prompt engine
- **Intent elevation**: Rough requests made cinematic; vague emotions made physical ("sad" becomes slumped shoulders, overcast light) (WD-IDEA-GEN-021, WD-IDEA-GEN-025)
- **Concrete language**: Metaphor replaced by visual specifics; one precise technical term over paraphrase (WD-IDEA-GEN-031)
- **Structured extraction**: Subject, action, context, style, camera, lighting, audio layers, negative directives (WD-IDEA-GEN-024)
- **Classification**: Text-to-video, image-to-video (only with supplied image), or multi-shot; characters and styles defined once, referenced by name (WD-IDEA-GEN-022, WD-IDEA-GEN-023)
- **Defaults and capabilities**: Omitted components get shown neutral defaults; works only from maintained capability reference; "more control" met with cinematic language (WD-IDEA-GEN-026, WD-IDEA-GEN-027, WD-IDEA-GEN-029)
- **Ask-or-act**: Ambiguous or impossible requests get a question or workaround (e.g. 16:9 for later crop) (WD-IDEA-GEN-028)
- **Engine modes**: Interactive mode attaches reasoning comments; production mode strips them to save tokens (WD-IDEA-GEN-030)

### Frame prompts
- **Form**: One dense paragraph describing a frozen photo; no action verbs, movement, dialogue or sound (WD-IDEA-GEN-032)
- **Content**: Appearance, set, props, spatial relations, framing, lens, lighting, palette, film style, depth of field, weather (WD-IDEA-GEN-033)
- **Labeled components**: Camera, spatial layout, characters, setting, style, each listing referenced frames and assets (WD-IDEA-GEN-036)
- **Order alternatives**: alt: five-part order (camera, subject, placement, environment, lighting); alt: camera spec, layout, verbatim asset text, style cues first [alt] (WD-IDEA-GEN-037, WD-IDEA-GEN-038)
- **Appearance source**: Scene-effective description, status tags as condition modifiers [planned] (WD-IDEA-GEN-040)
- **Reference-tied traits**: Characters with reference images described by short trait summary, never image-slot labels (WD-IDEA-GEN-041)
- **Blocking detail**: Placement, depth planes, scale, eyelines, body orientation and weight for multi-character shots [planned, voice] (WD-IDEA-GEN-043)
- **Framing implications**: States what framing implies when model cannot infer it (e.g. over-the-shoulder shows only foreground back) [voice] (WD-IDEA-GEN-045)
- **Lighting and style**: Key, fill, rim, practicals, ambient; palette, contrast, film stock, grade; mood vocabulary (three-point clean, low-key drama, chiaroscuro noir, golden hour nostalgia, blue hour melancholy) (WD-IDEA-GEN-046, WD-IDEA-GEN-047)
- **Style directives**: Capsule supplies lighting, color, style language; master image descriptions referenced when available [planned] (WD-IDEA-GEN-049)
- **Non-photoreal styles**: Felt, stop-motion, anime: material and style words saturate subject, environment, motion, soundscape (WD-IDEA-GEN-050)
- **Diegetic text**: On-screen text (e.g. phone screen) specified as composition, distinct from unwanted subtitles (WD-IDEA-GEN-051)
- **Checklist**: Full appearance, camera, spatial layout, lighting, palette; no action or sound; identical character blocks; platform aspect ratio (WD-IDEA-GEN-052)

### End frames
- **End-frame prompts**: Own prompts, regenerated and edited separately; both frames sent to video generation (WD-IDEA-GEN-055)

### Video prompts
- **Lean prompts**: Anchor frames carry visual truth; describes only what happens, around 500 characters or fewer (WD-IDEA-GEN-058)
- **Video-only content**: Action, dialogue and voice, camera movement, sound effects, ambient audio, timing, subject interaction (WD-IDEA-GEN-059)
- **Structure alternatives**: alt: four parts (camera, action, quoted dialogue, sound); alt: audio and timing cues first; alt: visual and audio sections [alt] (WD-IDEA-GEN-060, WD-IDEA-GEN-061, WD-IDEA-GEN-062)
- **Motion-only exception**: Short visual detail kept only to identify which subject an ambiguous action applies to (WD-IDEA-GEN-063)
- **Lean tests**: Silent-movie test, removal test for visual detail, checklist for action, dialogue, sound effects, negatives (WD-IDEA-GEN-064, WD-IDEA-GEN-071)
- **Verbs and audio**: Action as verbs and behaviors, camera and subject action together for timing; audio-driven projects lead with sync and timing cues (WD-IDEA-GEN-065, WD-IDEA-GEN-067)
- **Performance detail**: Facial expression, blocking, framing in ample detail [voice] (WD-IDEA-GEN-068)
- **Animating supplied images**: Prompt focuses on motion; keeps image's appearance, style, lighting (WD-IDEA-GEN-069)
- **Tags**: Compatible video models and estimated length (WD-IDEA-GEN-070)

### Model-specific prompt techniques
- **Per-shot fields**: Subject, action, context, style, cinematography, audio; config for negative prompt, aspect ratio, duration, resolution (WD-IDEA-GEN-072)
- **Negatives**: Unwanted elements described; standard quality negatives (subtitles, watermark, blur, distorted hands) (WD-IDEA-GEN-073)
- **Request options**: Audio on or off; "no subtitles" added automatically when dialogue exists; safety level varies by mode and region (WD-IDEA-GEN-074, WD-IDEA-GEN-075, WD-IDEA-GEN-076)
- **Ratio fallback**: Unsupported ratio generated in supported ratio, centered for crop, crop flagged (WD-IDEA-GEN-077)
- **Loops and slow motion**: Identical start and end states for seamless loops; slow motion via temporal keywords and physics description (WD-IDEA-GEN-078, WD-IDEA-GEN-079)
- **Artifacts and seeds**: Fix by reducing adjectives or changing seed; seeds give reproducibility where exposed (WD-IDEA-GEN-080)
- **Reproducibility**: Without seed, same prompt will not reproduce; consistency from specific, unambiguous prompts (WD-IDEA-GEN-081)
- **Known weaknesses**: Multi-action fragmentation, identity drift, unreliable hands, imperfect lip-sync, native audio unfit for precise work (WD-IDEA-GEN-082)
- **Symptom map**: Smeared motion, identity drift, lighting shifts, camera mismatch, ignored details linked to causes and fixes (WD-IDEA-GEN-083)

### Prompt length and validation
- **Thresholds**: Separate frame and video limits, each with warning and error level (frame near 1,200 characters, video near 500) (WD-IDEA-GEN-084)
- **Pre-send checks**: Length, forbidden characters, preview, allowed values, dialogue format; non-blocking verbosity warnings for target model (WD-IDEA-GEN-085, WD-IDEA-GEN-086)
- **Provider filter**: Video providers filtered by prompt length (WD-IDEA-GEN-087)
- **Quality test**: Whether longer prompts degrade quality tested before raising limits (WD-IDEA-GEN-088)
- **Limit handling**: Silent truncation rejected [rejected] (WD-IDEA-GEN-089) ; alt: remove limit [alt] (WD-IDEA-GEN-090); alt: raise limits, keep non-blocking amber warnings so user decides [planned, voice, alt] (WD-IDEA-GEN-091)
- **Reference redundancy**: alt: trim asset text to scene-specific differences; or raise limits to accept redundancy [alt] (WD-IDEA-GEN-092, WD-IDEA-GEN-093)
- **Dynamic trimming**: Details already shown by references removed from prompt text automatically [future, voice] (WD-IDEA-GEN-094)

### Prompt staleness and review
- **Stale flags**: Start frame change flags video prompt stale; per-shot or bulk diff to accept, reject or edit [planned] (WD-IDEA-GEN-098)
- **Prompt roles**: Stage 9 labels driver of image, driver of video, and system-owned non-editable logic (WD-IDEA-GEN-100)
- **Editability**: Frame prompts read-only by default with manual-edit toggle; video prompts always editable (WD-IDEA-GEN-101)
- **Scope**: All shots, all, or one shot; partial failures reported as counts; surgical correction leaves rest of prompt identical (WD-IDEA-GEN-102, WD-IDEA-GEN-103)
- **Model fit**: Shows start-frame-only or both frames needed, and which video models fit (WD-IDEA-GEN-104)
- **Composition and uploads**: Frame tool places shot assets beside prompt [voice] (WD-IDEA-GEN-107) ; captioned drag-and-drop uploads, incl. storyboard sheets [planned] (WD-IDEA-GEN-108)
- **System prompts tab**: View and change system prompts behind generated content [future, voice] (WD-IDEA-GEN-110)

### Reference images and budget
- **Roles**: Each reference carries role (location main, continuity base, blocking, character identity, style), reason and source (WD-IDEA-GEN-119)
- **Budget**: Two or three references per frame; quality degrades beyond three or four (WD-IDEA-GEN-122)
- **Prioritization**: Discard irrelevant reference info, balance competing inputs, make logical jumps rather than copy literally [voice] (WD-IDEA-GEN-125)
- **Failure checks**: Report failures (e.g. "X of Y references failed to load") and warn on mentioned assets lacking images; output checked for characters, locations, key props [planned] (WD-IDEA-GEN-127, WD-IDEA-GEN-128, WD-IDEA-GEN-130)

### Generation package and parity
- **Stored package**: References previewed at prompt time match frame-time references exactly, in order and roles, continuity base first (WD-IDEA-GEN-136, WD-IDEA-GEN-139)
- **Reuse on regeneration**: Same package reused unless user overrides; overrides shown by role [planned] (WD-IDEA-GEN-138)

### Location references at frame time
- **Delta descriptions**: Reference at different angle described with needed change, keeping palette, architecture, layout; camera angle stated explicitly (WD-IDEA-GEN-142)
- **Closest-view fallback**: Closest direction used with explicit delta and flagged in coverage advisory (WD-IDEA-GEN-150)

### Continuity generation modes
- **Start-frame modes**: Match (pixel copy of prior frame), camera change, reuse or edit from selected base, or fresh (WD-IDEA-GEN-154)
- **Framing**: Base sharing shot's direction keeps framing exactly; otherwise framing adapts while location identity and lighting hold (WD-IDEA-GEN-157)
- **Edit-image action**: Edit image, or regenerate from prompt using selected image with full frame prompt as key instruction [planned, voice] (WD-IDEA-GEN-162)

### Blocking and composition references
- **Blocking scope**: Controls framing, placement, pose, screen direction, occlusion; not identity, props, lighting, texture or location look unless marked (WD-IDEA-GEN-173)
- **Composition authority**: Blocking defines framing and crop; location image informs background only [voice] (WD-IDEA-GEN-174)
- **Visual anchors**: Storyboard frames, stills, blocking captures, rough sketches, approved prior frames (WD-IDEA-GEN-176)
- **3D worlds**: Generated on first studio entry for a location [planned] (WD-IDEA-GEN-182) ; fast option (about 30 to 45 seconds, $0.15) or high quality (about 5 to 10 minutes, $1.50), with density presets and optional seed (WD-IDEA-GEN-183); iterate cheap, reserve high quality for hero worlds, reuse existing worlds (WD-IDEA-GEN-184)

### Frame generation workflow
- **Start-only path**: First-class; end frames skipped and hidden, dependencies adapt, costs exclude them (WD-IDEA-GEN-186)
- **Motion-only video**: With both frames, video prompt describes only movement, action and audio between them (WD-IDEA-GEN-187)
- **Scope and mode**: All needed frames, one shot, start frames only, or end frames only; sequential Control Mode (default, approve before advance) or later Quick Mode grid (WD-IDEA-GEN-188, WD-IDEA-GEN-189, WD-IDEA-GEN-190)
- **Dependency manager**: Enforces correct frame chaining (WD-IDEA-GEN-191)
- **Review and regeneration**: Shot-by-shot approval with optional guidance; re-roll, re-roll with text correction, or edited prompt (WD-IDEA-GEN-192, WD-IDEA-GEN-193)
- **Uploads and actions**: Own image as start or end frame; approve, compare side by side, inpaint masked region with prompt; frame and video prompts editable (WD-IDEA-GEN-194, WD-IDEA-GEN-195)
- **Approvals and counts**: Frames and videos approved separately per shot; each frame tracks regeneration count (WD-IDEA-GEN-196)
- **Warning dialog**: Frame panel warning with "Don't show again" (WD-IDEA-GEN-198)
- **Expected quality**: Consistent characters and setting, realistic position and prop-state changes, continuity across shot and scene boundaries (WD-IDEA-GEN-199)
- **Audio-driven frames**: Hosts in natural speaking positions; visual aids at right timestamps (WD-IDEA-GEN-200)
- **Region inpainting**: Local edit of selected region (e.g. face) with brush, rectangle, ellipse or lasso [future] (WD-IDEA-GEN-168, WD-IDEA-GEN-169)

### Use-as-reference toggle
- **Behavior**: On sends current image as style and composition reference; off means fresh generation from description (WD-IDEA-GEN-201, WD-IDEA-CONT-174)
- **Visibility and placement**: Only where an image exists (regeneration); offered at asset upload review, scene asset image, transformation post-image, start or end frame regeneration (WD-IDEA-GEN-202, WD-IDEA-GEN-203)
- **Across modes and priority**: Applies to all three frame regeneration modes; current image is highest-priority guide, separate from identity references (WD-IDEA-GEN-204, WD-IDEA-GEN-205)
- **Post-image swap**: Transformation post-image swaps default reference for current post-image when on (WD-IDEA-GEN-206)
- **Defaults**: alt: on in upload review, off elsewhere; or on everywhere [alt] (WD-IDEA-GEN-207, WD-IDEA-GEN-208) ; session-wide setting making existing frames default reference [future] (WD-IDEA-GEN-209)

### Asset and location image generation
- **Edit Image**: Image-to-image with text guidance, depending on provider support (WD-IDEA-GEN-210)
- **White background**: Could become user-toggleable if it causes artifacts [future] (WD-IDEA-GEN-211)
- **Background removal**: Segmentation-based removal could replace generation-based; keeps original pixels, no credits, seconds; once current method validated [future] (WD-IDEA-GEN-212, WD-IDEA-GEN-213)
- **Bulk generation**: Cost confirmation and progress, partial-failure report, one-by-one retries (WD-IDEA-GEN-214)

### Video rendering
- **Queue**: Confirm and Render queues jobs; queued jobs not edited in place; changes return via shot list or frames (WD-IDEA-GEN-224)
- **Attempts and status**: Several attempts kept as versions; queued, rendering, complete or failed, with error message (WD-IDEA-GEN-225, WD-IDEA-GEN-226)
- **Timing**: Tolerates 30 to 45 minute delays, acts on final outcomes only (succeeded, failed, cancelled, timeout); provider timeouts about 20 minutes, about 45 for video, about 2 for audio (WD-IDEA-GEN-227, WD-IDEA-GEN-228)
- **Completion**: One normalized event triggers next step and notifies user; audio render jobs share same contract; push instead of polling [future] (WD-IDEA-GEN-229, WD-IDEA-GEN-230, WD-IDEA-GEN-231)
- **Background handling**: Status, retry, cancellation, prioritization, batching for long generations [future] (WD-IDEA-GEN-232)
- **Latency targets**: Under 5 seconds for text iterations, under 15 seconds for frame pairs; video in background (WD-IDEA-GEN-233)
- **Provider limits**: Interface enforces limits (e.g. only 4, 6 or 8 second durations for one provider) (WD-IDEA-GEN-234)
- **Object editing**: Add or remove objects in generated video; available tool loses audio [future] (WD-IDEA-GEN-236)
- **Tiers**: 720p drafts, 1080p finals; faster cheaper model tier for casual output (WD-IDEA-GEN-237, WD-IDEA-GEN-238)
- **Animatic previews**: Fast low-res previews with quick interpolation, upgraded to final render later [future] (WD-IDEA-GEN-239)

### Generation jobs and reliability
- **Tracked jobs**: Master assets, scene assets, start and end frames, inpainting run as tracked async jobs (WD-IDEA-GEN-240)
- **Lifecycle**: Queued, processing, generating, uploading, then completed or failed; failure step recorded (WD-IDEA-GEN-241)
- **Retries**: Automatic retries (default max 3) counted apart from user retries; errors classed temporary, permanent, rate-limited, unauthorized (WD-IDEA-GEN-242)
- **Idempotency and output**: Duplicate request never creates or charges a second job; primary variant chosen by project rules (WD-IDEA-GEN-243, WD-IDEA-GEN-244)

### Providers and models
- **LLM routing**: Multiple LLM providers with cost-aware routing and fallback (WD-IDEA-GEN-245)
- **Provider-neutral**: Swappable image and video providers with no fixed prompt-format assumptions (WD-IDEA-GEN-246)
- **Launch provider**: Frame-to-video pipeline with one launch provider; another noted with clip time limit (WD-IDEA-GEN-247)
- **Provider choice**: Users choose among video providers, one at launch [future, voice] (WD-IDEA-GEN-248) ; provider-specific prompt formats with generic default [planned] (WD-IDEA-GEN-249)
- **External automation**: Runs async pipelines (trigger, wait, callback, notify) without creative or pipeline logic [alt] (WD-IDEA-GEN-250)
- **Orchestration**: Explicit and code-driven; can move to durable workflow engine if long-running [future] (WD-IDEA-GEN-295)
- **Routing and enterprise**: Capability matrix, cost-quality optimizer, auto-selection with override and performance tracking; private models registered, benchmarked, priced, access-controlled [future] (WD-IDEA-GEN-252, WD-IDEA-GEN-253)
- **Serialization**: alt: YAML (readable, define-once anchors), JSON (validation), XML-tagged sections (enterprise endpoints), labeled natural language [alt] (WD-IDEA-GEN-255, WD-IDEA-GEN-256, WD-IDEA-GEN-257, WD-IDEA-GEN-258)

### Cost and spend
- **Credit accounting**: Paid in credits per video second, per image, per LLM token; each job records cost (WD-IDEA-GEN-259)
- **Cost rules**: Base plus per-unit cost (scene, shot, frame, video, token) per stage and model; estimates kept separate from outcomes (WD-IDEA-GEN-260)
- **Estimated vs actual**: Each generation stores both (WD-IDEA-GEN-262)
- **Cost awareness**: Shown for frame, regeneration, bulk; confirmation for high-cost actions; totals by mode, frames per shot and path in Stage 11 (WD-IDEA-GEN-263)
- **Previews**: Estimate on review screen before commit [planned] (WD-IDEA-GEN-264) ; credit preview with optional confirmation above user threshold [future, voice] (WD-IDEA-GEN-265)
- **Deduction and analytics**: Per-generation deduction, excessive-spend alerts planned (WD-IDEA-GEN-267) ; spend per operation, dashboards, budget and anomaly alerts [future] (WD-IDEA-GEN-268)

### Spend safeguards
- **Render plan**: Shot count, variations, retry limit and mode, derived from speed-versus-cost setting (WD-IDEA-GEN-271)
- **Reservation**: No paid video render without credit reservation, render budget and hard execution ceiling; credit block when short (WD-IDEA-GEN-272, WD-IDEA-GEN-273)
- **Reserve and settle**: Estimate held (about 30 minutes), reconciled to actual, overestimate refunded; failed render with no output costs nothing, partial output charged proportionally (WD-IDEA-GEN-274, WD-IDEA-GEN-275)
- **Ceilings**: Provider call ceiling (e.g. 25) and wall-clock limit (e.g. 12 minutes), aborting gracefully (WD-IDEA-GEN-276)
- **Agent caps**: Per-shot caps on variations and retries; at cap, shot marked "accepted best effort" (WD-IDEA-GEN-277)
- **Loop breaker**: Identical prompt, model and parameters beyond N requests aborts and flags agent loop (WD-IDEA-GEN-278)
- **Rate limits**: One active final render per user, two per project per hour, 60 provider calls per minute per provider; checked before each call (WD-IDEA-GEN-279)
- **Kill switches**: Disable video globally, disable a provider during outage or spike, or freeze one user (WD-IDEA-GEN-280)
- **Records**: Permanent record of estimated, reserved, spent credits, provider call count, abort reason (WD-IDEA-GEN-281)

### Provenance and quality control
- **Output provenance**: Final prompt, template version and regeneration guidance stored; templates lock once used (WD-IDEA-GEN-282)
- **Templates**: Writing-stage prompt templates editable at runtime without shipping code (WD-IDEA-GEN-283)
- **Traces and replay**: Each stage's inputs and outputs traceable to cause; failing generation replayed on identical data with modified prompt (WD-IDEA-GEN-285, WD-IDEA-GEN-286)
- **Judging**: Style-injection consistency scored by LLM-as-judge for faithfulness and relevance (WD-IDEA-GEN-287) ; stage agents evaluated alone against criteria and golden expectations (WD-IDEA-GEN-288, WD-IDEA-GEN-289)
- **Clip QC**: First-frame match, readable primary action, camera movement, dialogue and sound timing, character drift (WD-IDEA-GEN-290)
- **Automated gates**: Sharpness, artifacts, video quality, dialogue clarity scored with alerts; smart regeneration maps issues to parameters and detects convergence; pre-flight QA gates with exception approval [future] (WD-IDEA-GEN-291, WD-IDEA-GEN-292, WD-IDEA-GEN-293)
- **Prompt optimization**: Analysis agent suggests improvements, A/B tests, offers a prompt library and scores effectiveness [future] (WD-IDEA-GEN-294)

## Audio, editing, export, UX, control, and alternative directions


### Dialogue and performance direction
- **Dialogue delivery**: exact words, speaker, voice, delivery style, pauses, narrator line; alt: verbatim script words [planned] (WD-IDEA-AV-001, WD-IDEA-AV-003, WD-IDEA-AV-008) ; alt: implied speech act, words left to generation (WD-IDEA-AV-009); alt: follows off-script recording, which updates script [future, voice] (WD-IDEA-AV-010)
- **Performance direction**: speaker labels for attribution and lip-sync; pace, emotion, body language, eyes (WD-IDEA-AV-002, WD-IDEA-AV-005)

### Audio and sound design
- **Sound per shot**: dialogue, delivery, action sound; gaps inferred from scene (WD-IDEA-AV-011, WD-IDEA-AV-012)
- **Layered sound**: action effects, ambience, score or off-screen music; explicit silence (WD-IDEA-AV-017, WD-IDEA-AV-018)
- **Native audio**: kept, crossfaded, or replaced for brand, precise-dialogue, or music work; voiceover retimed in post (WD-IDEA-AV-019, WD-IDEA-AV-020)

### Character voices and recorded performance
- **Voice profiles**: linked external voice with preview; seeds audio of every video prompt [future] (WD-IDEA-AV-021, WD-IDEA-AV-022)
- **Voice sources**: sample attaches only when user maps it; script can build profiles for checks [future] (WD-IDEA-AV-023, WD-IDEA-AV-024)
- **Recorded voice drive**: cloned or user voice drives lip-sync and carries emotion [future, voice] (WD-IDEA-AV-026, WD-IDEA-AV-027)
- **Voice transfer, split recordings**: other voice keeps emotion; long recordings split without audio breaks [future] (WD-IDEA-AV-028, WD-IDEA-AV-029)
- **Voice-Actinator**: start frame, action, speaker, voice recording yield matched clip; maybe standalone [future, voice] (WD-IDEA-AV-030)

### Audio-first projects
- **Audio-first**: podcasts, audiobooks, lectures; visuals matched to narration timestamps [future] (WD-IDEA-AV-034)

### Clip length and sequencing
- **Short-clip assembly**: ~8s generation cap; sequence clips, extend best takes, stitch in editor (WD-IDEA-AV-039, WD-IDEA-AV-040)
- **Audio step**: Stage 9 holds audio and music; script dialogue is voice source (WD-IDEA-AV-042)

### Scene review player
- **Playback**: Stage 12 timeline cut from shot clips with markers (WD-IDEA-AV-043) ; live render tracking with transport, shot select, fullscreen, retry of failed renders (WD-IDEA-AV-045, WD-IDEA-AV-046)
- **Side-by-side layout**: scene player left, shot list with start-frame thumbnails right; scrub, auto-advance, click to jump [planned, voice] (WD-IDEA-AV-044)
- **Empty and error states**: no jobs offers route back to confirmation; load failure shows retry (WD-IDEA-AV-047)
- **Issue sorting**: visual continuity, timing, dialogue or audio, narrative; attribution maps each to fixing stage (WD-IDEA-AV-048)
- **Resolution paths**: complete (warn if renders failed); minor visual fixes to frames; major narrative or audio to shot list (WD-IDEA-AV-049, WD-IDEA-AV-051)
- **Background rendering**: work continues on other scenes; sidebar tracks renders; toast and email link to review [future] (WD-IDEA-AV-052, WD-IDEA-AV-053)

### Scene quality bar and export
- **Quality criteria**: duration matches target, audible on-script dialogue, continuous movement, supportive sound (WD-IDEA-AV-054)
- **Scene export**: MP4 at 720p, 1080p, or 4K; cancellable; links expire [planned] (WD-IDEA-AV-055)
- **Export history**: settings and timestamp; re-download within 7 days; credits tracked separately [planned] (WD-IDEA-AV-056)
- **Full-project export**: scenes joined with transitions and markers, or selected scenes [planned, future] (WD-IDEA-AV-057)

### Professional export and editor handoff
- **Pro export and archive**: every shot clip at high bitrate; bulk zip of approved artifacts on active branch (WD-IDEA-AV-059, WD-IDEA-AV-061)
- **Timeline descriptor**: one-click EDL/XML import into Resolve, Premiere, or CapCut; keeps order, timecodes, markers, folders [future] (WD-IDEA-AV-060)
- **Asset package**: ZIP of videos, frames, scripts, metadata; user picks contents [future] (WD-IDEA-AV-062)
- **Clip naming**: alt: Project_Scene_Shot_Version (e.g. Aiuteur_Sc01_Shot3A_v02.mp4) (WD-IDEA-AV-063) ; alt: zero-padded project, scene, shot, take, role, version fields as import source of truth (WD-IDEA-AV-064)
- **Project Wrap**: one package of Approved artifacts importing into Resolve or Premiere with names, metadata, bins, timeline [future] (WD-IDEA-AV-065)
- **Wrap determinism**: cutting in minutes, no relinking; same inputs give same layouts and filenames (WD-IDEA-AV-066, WD-IDEA-AV-067)
- **Wrap contents**: approved clips; descriptors with EDL fallback; manifest with mirror, checksums, README; relative paths (WD-IDEA-AV-068)
- **Wrap exclusions**: drafts, rejects, raw originals, grades or mixes excluded; no relinking or platform color or audio decisions (WD-IDEA-AV-069, WD-IDEA-AV-076)
- **Wrap eligibility**: Approved only, with fixed scene and shot IDs, locked timecodes, resolvable media; one invalid artifact fails export (WD-IDEA-AV-070)
- **Take roles and master timeline**: take number and role (PRIMARY, ALT, B-roll); ordered by scene, shot, take; track per role (WD-IDEA-AV-071, WD-IDEA-AV-073)
- **Organized import**: per-scene folders matching IDs; clips binned by scene with ready timeline and logging metadata (WD-IDEA-AV-072, WD-IDEA-AV-074)
- **Package naming and README**: name with project, date, version; README with per-editor steps and limits (WD-IDEA-AV-075)

### Advanced deliverables and integrations
- **Audio stems**: dialogue, effects, music as multi-track stems with sync validation [future] (WD-IDEA-AV-077)
- **Project archival**: backups, cloud storage, restore, version archives [future] (WD-IDEA-AV-078)
- **Professional formats**: ProRes, DNxHD, WebM, high bitrate, upscaling, grading presets, HDR [future] (WD-IDEA-AV-079)
- **Integrations**: Frame.io review; YouTube, Vimeo, Dropbox, Google Drive; webhooks [future] (WD-IDEA-AV-080)
- **Finishing**: 4K or 60fps upscale, vertical reframe, grade or NLE edit; 4K only via upscale [future] (WD-IDEA-AV-081)

### Control and lock behavior
- **Free navigation**: browsing completed stages triggers no regeneration, save, or push; no unlock-relock rituals [voice] (WD-IDEA-UX-001, WD-IDEA-UX-002)
- **Universal lock control**: same place on every stage, including 7 to 12; confirms only if unlock invalidates downstream (WD-IDEA-UX-003, WD-IDEA-UX-019, WD-IDEA-UX-020)
- **Risk indicator**: subtle dot with tooltip, separate from real breakage [voice] (WD-IDEA-UX-008)
- **Advisory by default**: warnings and recommendations; hard gates only in advanced or strict settings [planned] (WD-IDEA-UX-007, WD-IDEA-UX-009)
- **Quick start**: plain language, progressive disclosure; intake is a workspace, not a wizard (WD-IDEA-UX-011, WD-IDEA-UX-012)
- **One job per stage**: no duplicate editors [planned] (WD-IDEA-UX-006)

### Stage status display
- **Status timeline**: one vocabulary (locked, active, pending, outdated); pipeline colors have one meaning (WD-IDEA-UX-015, WD-IDEA-UX-017)

### Locking and unlocking
- **Lock and advance**: approve locks and advances; production "Lock & Proceed" saves, locks, advances (WD-IDEA-UX-018, WD-IDEA-UX-021)
- **Locked state**: LOCKED-IN flag with "Unlock & Edit"; action buttons replaced; content white or greyed, tools disabled, text selectable [voice] (WD-IDEA-UX-022, WD-IDEA-UX-023, WD-IDEA-UX-024)
- **Unlock naming**: "Unlock & Edit"; "Unlock-2-Edit" rejected [rejected, voice] (WD-IDEA-UX-025)
- **Lock record**: re-locking is a no-op; each lock stores who, required reason, when; never overwritten (WD-IDEA-UX-026, WD-IDEA-UX-027)
- **Outdated work**: viewable with OUTDATED badge, edit, relock; invalidated work marked stale, never deleted (WD-IDEA-UX-028, WD-IDEA-UX-046)
- **Phase A unlock**: impact preview, then forward-only cascade to outdated (WD-IDEA-UX-029)
- **Production unlock**: later completed stages outdated, re-lockable if unchanged; scene unlock warns (WD-IDEA-UX-030, WD-IDEA-UX-032)
- **Re-completion**: rejected; later stages marked outdated instead [rejected, voice] (WD-IDEA-UX-031)
- **Shot-list lock**: read-only, "shot list ready"; immediate unlock if no downstream, else previews frames and cost (WD-IDEA-UX-033)
- **Unlock status guard**: returns to draft only if not progressed; frame-locked or video-complete never rolled back (WD-IDEA-UX-034)
- **Deliberate-edit acknowledgment**: edit asks proceed or cancel; logged; auto-branches once branching exists [planned] (WD-IDEA-UX-035)
- **Soft-lock assets**: global and scene assets soft-locked like frame prompts; Stage 5 editable [voice] (WD-IDEA-UX-036)

### Lock and unlock model options
- **Unlock model**: alt: monotonic, no unlock, changes need new branch (WD-IDEA-UX-037) ; alt: same-branch "Unlock & Edit" warns, invalidates immediately, branching deferred [voice] (WD-IDEA-UX-038); rejected: cascade-on-save unlock, replaced by warn-then-invalidate [rejected, voice] (WD-IDEA-UX-039); alt: strict sequential Phase A, two-step unlock, each save versioned (WD-IDEA-UX-040)
- **Overhaul timing**: alt: after branching and versioning, which are intertwined (WD-IDEA-UX-042) ; alt: acknowledgment now, full branching later [planned, voice] (WD-IDEA-UX-043)

### Invalidation and staleness
- **Layer-scoped invalidation**: global edits reach all stages, narrative downstream, scene edits media stages, media edits nothing (WD-IDEA-UX-044)
- **Invalidation scopes**: global (all downstream), local scene, continuity break (all later scenes) (WD-IDEA-UX-045)
- **Cascade by edit type**: beat partial; script all scene work; shot list that scene's frames and videos; prompt flags regeneration [planned] (WD-IDEA-UX-047)
- **Asset invalidation**: presence change hits prompt stage and downstream; scene-asset edit hits that scene's frames and video (WD-IDEA-UX-048, WD-IDEA-UX-053)
- **Staleness flags**: beat edit yellow-flags script without regenerating; mutual out-of-date flags after approval (WD-IDEA-UX-049, WD-IDEA-UX-050)
- **Script edit cascade**: flags beat sheet, marks all scenes outdated; cost modal before invalidating approved videos (WD-IDEA-UX-051)
- **Review-back**: video review to shot list for narrative or audio problem invalidates Stage 8 to 12 work (WD-IDEA-UX-054)
- **Continuity-break warnings**: removed asset later scenes need, or end state mismatch [planned] (WD-IDEA-UX-056)
- **Non-blocking outdated**: never blocked; shows why, changed upstream, affected downstream (WD-IDEA-UX-057)
- **Invalidation log**: what and why [planned] (WD-IDEA-UX-060)

### Blast-radius options
- **Shot-list edit scope**: alt: video only (WD-IDEA-UX-063) ; alt: frames and videos, on unlock once frames exist (WD-IDEA-UX-064); alt: full downstream, Stages 8 to 12 outdated, later scenes broken, costs recalculated (WD-IDEA-UX-065)
- **Frame regeneration scope**: alt: end-frame cascade, breaks all later scenes, high cost (WD-IDEA-UX-066) ; alt: shot by shot, outdates that and later videos, drift check can keep video-ready (WD-IDEA-UX-067)

### Drift revision
- **Drift revision**: alt: "Retroactively Revise Script" regenerates script from beats and Stages 1 to 2, clears Stage 3 flag (WD-IDEA-UX-068) ; alt: "Retroactively Revise Beat Sheet" re-extracts beats from script, clears Stage 4 flag (WD-IDEA-UX-069)

### Cost warnings and invalidation review
- **Cost-aware warnings**: invalidating change previews regeneration cost (shot counts, image and video prices); acknowledged before commit (WD-IDEA-UX-070, WD-IDEA-UX-071)
- **Invalidation review**: affected content with reasons; cost by stage and scene; regenerate-all vs selective; batch with preview [planned] (WD-IDEA-UX-072, WD-IDEA-UX-073)

### Versioning, branching and history
- **Story Timelines branching**: non-linear, non-destructive, audit trail; Main plus experiment branches isolate costly production from pivots (WD-IDEA-UX-074)
- **Branch metadata**: name, parent, divergence stage, reason-bearing commit message; one active Main (WD-IDEA-UX-075, WD-IDEA-UX-076)
- **Script branching**: regenerating script from beats forces named branch copying Stages 1 to 3; original untouched (WD-IDEA-UX-077, WD-IDEA-UX-078)
- **Branch policy**: beat edits stay on branch with flag; significant script edits suggest branch; Stage 5 to 12 edits local (WD-IDEA-UX-079)
- **Version switching**: always forks, never overwrites (WD-IDEA-UX-080)
- **Versioned regeneration**: each regeneration kept; same-branch treatment regeneration low cost (WD-IDEA-UX-081, WD-IDEA-UX-052)
- **Checkpoints**: "Save as New Version", "Create New Branch" at decisions; auto-branch before destructive actions [planned] (WD-IDEA-UX-082)
- **Story Timelines view**: trunk and branch tree, messages, "Switch to this Version", comparison, safeguarded delete [planned] (WD-IDEA-UX-083)
- **Branch costs**: own generations and cost tracking; completed stages protected [planned] (WD-IDEA-UX-084)
- **Artifact Vault**: artifacts by branch, stage, scene with origin, time, credit cost, search; value questioned, may wait for style capsules [future] (WD-IDEA-UX-085, WD-IDEA-UX-086)
- **Header shortcuts**: Artifact Vault, Version History, Create New Branch at top right (WD-IDEA-UX-087)
- **Cold storage**: inactive non-main branches archived after 90 days (WD-IDEA-UX-088)
- **Undo**: fixed "5 previous states" rejected for branching history [rejected] (WD-IDEA-UX-089)
- **Branch toolkit**: merge, conflict resolution, rebase, cherry-pick, diffs, tagging [future] (WD-IDEA-UX-090, WD-IDEA-UX-091)
- **Scene-preserving pivot**: pick scenes to keep; kept scenes stay locked with assets, frames, videos [voice] (WD-IDEA-UX-092, WD-IDEA-UX-093)
- **Asset-preserving re-extraction**: never wipes descriptions or images; user chooses assets to keep or remove [voice] (WD-IDEA-UX-094)
- **Asset history**: version history and inheritance tree across scenes [future] (WD-IDEA-UX-095, WD-IDEA-UX-096)

### Regeneration guidance
- **Regeneration clarity**: announces mode ("Regenerating with reference image..."); one variable per attempt (WD-IDEA-UX-099, WD-IDEA-UX-101)
- **Runtime tally**: beat durations sum to runtime; shot list tallies shots and durations [voice] (WD-IDEA-UX-102)

### Provenance
- **Badges**: SKIPPED, IMPORTED, AUTO-FILLED, authored checkmark; distinct from pending (WD-IDEA-UX-107)
- **Tags and precedence**: staleness outranks as subtext ("Outdated · Imported") on sidebar, cards, Script Hub [planned] (WD-IDEA-UX-108, WD-IDEA-UX-109, WD-IDEA-UX-110)
- **Auto-fill note**: dated note that content will not update if script changes [planned] (WD-IDEA-UX-111)

### Intake and commit
- **Route-plan preview**: plain plan of skipped, generated, imported, seeded stages; opens at most relevant review stage (WD-IDEA-UX-114)
- **Finished-script fast path**: Streamline, drop PDF, confirm summary; skips to review [planned] (WD-IDEA-UX-115)
- **Credit estimate**: itemized by cost driver before confirm; parsing and dependency extraction free [planned] (WD-IDEA-UX-116, WD-IDEA-UX-117)
- **All-or-nothing commit**: locks, skips, imports, assets, answers, config, Stage 1 draft apply together [planned] (WD-IDEA-UX-118, WD-IDEA-UX-119)
- **Completeness score**: readiness percentage of completed, filled, auto-generated stages [future] (WD-IDEA-UX-133)

### Navigation
- **Phase links**: Phase B returns to Script Hub; button back to Phase A labelled "Narrative & Style Engine" (WD-IDEA-UX-137)
- **Scene stage rail**: stages 7 to 12 plus "Back to Script Hub"; unlocked when current, done, outdated, or preceded by complete work (WD-IDEA-UX-138)
- **Header navigation**: Back, Next, lock in header, no footer; sidebar stays [voice] (WD-IDEA-UX-142, WD-IDEA-UX-143, WD-IDEA-UX-145)
- **Next button**: header right end, only on locked and revisited stages; goes to next stage even if complete [voice] (WD-IDEA-UX-140, WD-IDEA-UX-141)
- **Footer option**: alt: Back and Next stay in footer; only lock and Unlock move to top [voice] (WD-IDEA-UX-144)
- **Chrome**: breadcrumbs; header with title, branch, aspect ratio (WD-IDEA-UX-149, WD-IDEA-UX-151)
- **Global sidebar**: Projects, Style Capsule Library, Asset Library, Sign Out, theme toggle, collapse [impl] (WD-IDEA-UX-150)
- **Context-aware UI**: toolbars and feedback adapt to stage; dots mark pending actions (WD-IDEA-UX-152, WD-IDEA-UX-153)
- **Shortcuts**: Ctrl+1 to 12 jump; Ctrl+Left/Right step; Ctrl+S, Ctrl+R, Ctrl+G save, regenerate, generate [planned, future] (WD-IDEA-UX-156)
- **Landing and sign-in**: signed-out see landing; signed-in go to dashboard; protected pages return after sign-in (WD-IDEA-UX-157, WD-IDEA-UX-159)
- **Sign-in screen**: sign-in and sign-up on one screen; show/hide password; 6-character checks; inline errors (WD-IDEA-UX-158)

### Layout and content access
- **Content Access panel**: one collapsible panel across production stages replacing rearview mirror; tabs for rearview, script excerpt, shot list [planned] (WD-IDEA-UX-160)
- **Shot carousel**: up and down arrows step shots inside shot tab (WD-IDEA-UX-161)
- **Curtain panel**: collapses like a curtain; instant drag-resize; double-click snaps to 25% of viewport height (WD-IDEA-UX-162, WD-IDEA-UX-163)
- **Tab persistence**: selected tab kept by identity across changes; long script scrolls inside [planned] (WD-IDEA-UX-164, WD-IDEA-UX-166)
- **Shared panels**: rearview mirror, asset drawer, regeneration input, continuity flags (WD-IDEA-UX-168)
- **Script Hub scene list**: number and slug, status, last end-frame thumbnail, asset dependencies (WD-IDEA-UX-169)
- **Scene overview**: read-only opening excerpt, start characters and location, prior end state; enter, jump upstream, or branch (WD-IDEA-UX-170)
- **Responsive cards**: labels truncate by width; narrow stacks; wide shows two-column shot lists (WD-IDEA-UX-171, WD-IDEA-UX-174)
- **Scene headers**: slugline, scene number first, encoded slug as subheading [planned] (WD-IDEA-UX-172)
- **Stage 8 layout**: asset list with badges left, state editor center, add and proceed controls right (WD-IDEA-UX-175)
- **Camera tags**: color-coded per category (distance, height, movement) [idea] (WD-IDEA-UX-176)
- **Long lists**: stay responsive with many items (WD-IDEA-UX-177)
- **Asset drawer**: rename, faster, search, filter [planned] (WD-IDEA-UX-178)
- **Thumbnails**: compression and pagination for large projects [future] (WD-IDEA-UX-179)
- **Fast asset opening**: hover prefetch, one request for details; deferred [planned, voice] (WD-IDEA-UX-180)
- **Customizable workspace**: drag-and-drop, dockable panels, role presets (Director, Writer), synced [future] (WD-IDEA-UX-181)
- **Content tabs**: alt: script and shot tabs in Stages 6 to 12 (WD-IDEA-UX-182) ; alt: script in 7 to 12, shots in 8 to 12 (WD-IDEA-UX-183); alt: script first and default, rearview from scene 2, shots from Stage 8 [planned] (WD-IDEA-UX-184)

### Continuity and location control surfaces
- **Shot-list ownership**: Stage 7 extracts and edits shots, suggests location links, warns at lock on unresolved links [planned] (WD-IDEA-UX-185, WD-IDEA-UX-186)
- **Setting-text check**: checked against known locations so drift surfaces at shot list (WD-IDEA-UX-196)
- **Scene visuals coverage**: pre-generation coverage check, missing views, view assignment review, continuity repair; no baseline shot editing [planned] (WD-IDEA-UX-199, WD-IDEA-UX-200)
- **Prompt-review transparency**: shows reference per shot (baseline, matched direction, fallback, weak); flags weak before spend [planned] (WD-IDEA-UX-217, WD-IDEA-UX-219)
- **Prompt-review role**: calm, read-only; repairs link to scene visuals [planned] (WD-IDEA-UX-218)
- **Matched-view override**: user may override [planned] (WD-IDEA-UX-220)
- **Reference preview**: two location images per frame, with delta notes for imperfect matches [planned] (WD-IDEA-UX-224)
- **Shot badges**: continuity strength (strong, usable, weak, missing); mode (fresh, match copy, camera change, reuse/edit) (WD-IDEA-UX-221, WD-IDEA-UX-222)
- **Continuity-base card**: thumbnail, source, match reason; rebuilt on shot or asset change (WD-IDEA-UX-227, WD-IDEA-UX-228)
- **Stale references**: old reference lists kept until regenerated (WD-IDEA-UX-229)
- **Frame workspace**: main control for final decisions and reuse of frames or prompts; suggests strong prior frame [planned] (WD-IDEA-UX-232, WD-IDEA-UX-235)
- **Frame workspace scope**: no resolver repair or scene-wide coverage; not where drift is first found [planned] (WD-IDEA-UX-234)
- **Base chooser**: up to three candidates with badge, reason, source; Use/Using; "Fresh" clears base (WD-IDEA-UX-236)
- **Base sync**: removing base entry clears it; base set only via chooser (WD-IDEA-UX-238)
- **Manual references**: edit start and end lists, upload, add existing frames, chain from previous end frame (WD-IDEA-UX-242)
- **Package parity**: shows primary, blocking, direction, establishing, fallback, manual; warns on preview mismatch [planned] (WD-IDEA-UX-239)
- **Upload conflicts**: when direction has an upload, lock can replace, coexist, or let user choose (WD-IDEA-UX-245)

### Automation and strict validation
- **Continuity override**: per-scene continuity mode [future] (WD-IDEA-UX-265)
- **Automation confidence**: each link shown as explicit, inferred, weak, or missing [planned] (WD-IDEA-UX-270)
- **Advanced strict gate**: unresolved continuity disables Stage 10 Lock & Proceed with amber badge; Basic unblocks [impl] (WD-IDEA-UX-273)
- **Strict refinements**: polish beyond the gate [future] (WD-IDEA-UX-275)
- **Auto-population**: locked or outdated Stage 8 never auto-populated (WD-IDEA-UX-277)
- **Strictness trigger**: alt: hard gates in Advanced or separate strict setting (WD-IDEA-UX-278) ; alt: Advanced only (WD-IDEA-UX-279)

### Reference controls and asset presence
- **Reference switch**: larger label, highlight when on, tooltip: current image sent as style reference (WD-IDEA-UX-280, WD-IDEA-UX-281)
- **Reference label**: one label everywhere, e.g. "Use current as reference" (WD-IDEA-UX-282)
- **Generate-input label**: Stage 8 states what Generate Image uses as input (WD-IDEA-UX-283)
- **Frame upload**: Stage 10 visible label or empty drop slot (WD-IDEA-UX-284)
- **Batch default**: batch toggle sets session default for using frames as references [future] (WD-IDEA-UX-285)
- **On-the-fly editing**: swap master and scene-instance images in frame-prompt stage [voice] (WD-IDEA-UX-286)
- **Asset-in-shot control**: shows and sets asset presence per shot; drives start vs end prompt tagging [planned, voice] (WD-IDEA-UX-287)
- **Prompt-side assets**: relevant images in collapsible panel filtered by presence [planned] (WD-IDEA-UX-288)
- **Fallback panel**: alt: without presence data, assets grouped by characters, locations, props (WD-IDEA-UX-289)
- **Large matrices**: pagination or collapsible sections [planned] (WD-IDEA-UX-290)
- **End-frame view**: used assets, pre-to-post swap, manual override [planned] (WD-IDEA-UX-291)
- **Image picker**: per asset per shot: master, scene instance, angle variant, or named location shot [planned] (WD-IDEA-UX-292)
- **Presence view**: alt: matrix, assets as rows, shots as columns [alt, planned] (WD-IDEA-UX-293) ; alt: per-shot cards with thumbnails and badges [planned] (WD-IDEA-UX-294)
- **Toggle default**: alt: ON everywhere (WD-IDEA-UX-296) ; alt: hidden until first image [alt, impl] (WD-IDEA-UX-297); alt: shown disabled, "Available after first image is generated" (WD-IDEA-UX-298)

### Media review
- **Rich preview**: scrubbing video, comparison sliders, storyboard, thumbnail timeline [future] (WD-IDEA-UX-300)

### Checkout and approvals
- **Checkout confirmation**: expand shots, back to frames, one video job per shot, count reported [impl] (WD-IDEA-UX-302)
- **Checkout expectations**: cost scales with shots, complexity, duration; prompts visible; audio timestamps and sync checks (WD-IDEA-UX-303)
- **Collaborative approvals**: requests, status, notifications, history, custom workflows [future] (WD-IDEA-UX-304)
- **Checkout gating**: alt: all continuity warnings resolved (WD-IDEA-UX-305) ; alt: warn or block by readiness, "proceed anyway" [impl] (WD-IDEA-UX-306)

### Saving authored work
- **Automatic saving**: after every critical action (WD-IDEA-UX-307)
- **Quiet autosave**: Stages 1 to 3 debounced about 2s with subtle indicator; unsaved-change prompt offers save-and-continue or discard [planned] (WD-IDEA-UX-308, WD-IDEA-UX-309)

### Onboarding, help and feedback
- **Guided onboarding**: welcome modal for 12 stages; resumable tour of Stages 1 to 4; highlights for style capsules, asset library, pipeline [future] (WD-IDEA-UX-312)
- **First-visit overlays**: highlight Generate, Lock, Approve; "Don't show again" [future] (WD-IDEA-UX-313)
- **Example projects**: short film, music video, commercial; cloneable with "How This Was Made" notes [future] (WD-IDEA-UX-314)
- **Contextual help**: help icons, searchable panel, video tutorials, docs links [future] (WD-IDEA-UX-315)
- **Empty states**: "Create Your First Project" call to action, library guidance, next step per stage [planned] (WD-IDEA-UX-316)
- **Tooltips**: short tooltips on upload review buttons and labels; cooldown between tooltips (WD-IDEA-UX-317, WD-IDEA-UX-318)
- **Gated features**: unusable controls shown disabled with explanation, not hidden (WD-IDEA-UX-319)
- **Selection bars**: always shown, greyed with prompt such as "select assets to merge or split" [voice, impl] (WD-IDEA-UX-320)
- **Errors**: name stage and reason (validation, service, permission); validation says what is wrong (WD-IDEA-UX-321, WD-IDEA-UX-323)
- **Loading states**: save, regenerate, generate show progress and clear errors [planned] (WD-IDEA-UX-322)
- **Smart suggestions**: next actions, templates, tips, learning from behavior [future] (WD-IDEA-UX-324)
- **Advanced search**: fuzzy full-text, filters, recents, favorites, keyboard navigation [future] (WD-IDEA-UX-325)
- **Accessibility**: WCAG 2.1 AA, screen reader, full keyboard, high-contrast theme [future] (WD-IDEA-UX-326)

### Dashboard and project cards
- **Card search and deletion**: search by title or description; "+ New Project"; hover delete with confirmation (WD-IDEA-UX-327, WD-IDEA-UX-329)
- **Folders**: create, rename, delete; drag projects in; counts; search, filter, sort [planned] (WD-IDEA-UX-328)
- **Phase-aware status**: Phase A "Stage X of 5" with dots; production shows Narrative & Style dots, scene, stage, "N/M Scenes Complete" (WD-IDEA-UX-331, WD-IDEA-UX-332)
- **Stage titles**: "The Beat Sheet", "Asset Definition" instead of "Stage 3 of 5" [voice] (WD-IDEA-UX-333)
- **Percentage**: rejected; stage label, dots, scene counts instead [rejected] (WD-IDEA-UX-334)
- **Stage dots**: green locked, orange outdated, yellow active, matching in-project pipeline (WD-IDEA-UX-335, WD-IDEA-UX-340)
- **Dual-phase card**: Phase A and scene progress, mini pipeline, branch status [planned] (WD-IDEA-UX-330)
- **Edge cases**: zero scenes leaves right side blank; all complete shows "M/M Scenes Complete"; outdated or broken scene shows that status [planned] (WD-IDEA-UX-336)
- **Last-worked scene**: scene and stage last worked, tracked per project [planned, voice] (WD-IDEA-UX-337)
- **Counts and refresh**: accurate completed counts; "last updated" tracks production; refresh after work [planned, voice] (WD-IDEA-UX-338, WD-IDEA-UX-339)
- **Card summary**: precomputed per-project summary if needed [future] (WD-IDEA-UX-341)
- **Covers**: generated or pulled image; fallback gradient from visual style [future] (WD-IDEA-UX-342, WD-IDEA-UX-343)
- **Current-scene rule**: alt: lowest-numbered incomplete scene (WD-IDEA-UX-344) ; alt: last-worked scene, even if an earlier scene is unfinished [voice] (WD-IDEA-UX-345)

### Credits and cost visibility
- **Cost visibility**: running estimates and tracking shown to user (WD-IDEA-UX-346)
- **Credit limit**: zero credits generates nothing; per-scene progress such as 0/6 [impl] (WD-IDEA-UX-347)
- **Analytics**: progress, timeline, cost breakdown, completion, regeneration frequency, time-to-complete, recommendations [future] (WD-IDEA-UX-348)

### Collaboration, notifications and audit
- **Teams and sharing**: invitations, roles, team switching; view, edit, or admin via revocable links [future] (WD-IDEA-UX-349, WD-IDEA-UX-350)
- **Real-time collaboration**: presence, live cursors, conflict resolution, activity feed [future] (WD-IDEA-UX-351)
- **Comments**: @mentions, resolution workflow, filters, stylus annotations [future] (WD-IDEA-UX-352)
- **Stakeholder reports**: cross-project comparison, PDF, scheduled delivery, dashboards, presentation mode [future] (WD-IDEA-UX-353)
- **Completion notices**: in-app or email when long generation finishes [future] (WD-IDEA-UX-354)
- **Audit log**: user actions logged [future] (WD-IDEA-UX-355)

### Visual identity
- **Iconography**: custom icons replace emoji and stock icons [voice] (WD-IDEA-UX-356)
- **Typography and theme**: film-credit typography; dark-first (WD-IDEA-UX-357)
- **Motion**: springy animation reserved for delight; reduced motion respected (WD-IDEA-UX-358)
- **Transitions**: animated stage transitions, micro-interactions, loading animations [future] (WD-IDEA-UX-359)

### Virtual set studio
- **World generation**: staged progress with retry on error; studio entry disabled until input and a named shot exist, with tooltip (WD-IDEA-UX-361, WD-IDEA-UX-363)

### Remix and adjacent creative products
- **Scene remix**: fan plots or twists on existing scenes; characters keep look and voices [future, voice] (WD-IDEA-ALT-001)
- **Live-action hybrid**: user films self; system extracts, swaps location, adds AI side characters [future, voice] (WD-IDEA-ALT-002)
- **Non-narrative domains**: corporate, educational, marketing emphasis such as authority lighting, pacing, hook-first frame with call to action (WD-IDEA-ALT-003)

### Platform reach
- **Cross-platform**: installable web app, offline viewing, mobile UI, native apps, tablet stylus [future] (WD-IDEA-ALT-004)
- **Localization**: multi-language UI, regional guidelines, cultural checks, local currency and payments [future] (WD-IDEA-ALT-005)
- **Public API**: keys, rate limits, SDKs, usage analytics [future] (WD-IDEA-ALT-006)

### Ecosystem and community
- **Template marketplace**: submit, preview, rate, sell; revenue sharing [future] (WD-IDEA-ALT-007)
- **Public gallery**: likes, bookmarks, featured projects, curators, share cards, embeddable player [future] (WD-IDEA-ALT-008)
- **Learning resources**: reputation and expert badges, tutorials, certification, guides, glossary [future] (WD-IDEA-ALT-009, WD-IDEA-ALT-011)
- **Contests**: submissions, voting, leaderboards, prizes, archives [future] (WD-IDEA-ALT-010)

### Marketing
- **Landing hero**: near-full-window looping video under dark tint; indie-storyteller headline [voice] (WD-IDEA-ALT-012)

### Trust, safety and rights
- **Private media**: time-limited, authenticated access only (WD-IDEA-ALT-013)
- **IP protection**: watermarks, provenance tracking, usage rights, commercial-use limits [future] (WD-IDEA-ALT-014)
- **Safety**: AI moderation with human review and appeals, ratings, age verification, parental controls, GDPR export and deletion [future] (WD-IDEA-ALT-015)
- **Enterprise**: SSO, immutable audit logs, data residency, 2FA, IP allow-listing, session policies [future] (WD-IDEA-ALT-016)

### Operating the business
- **Admin tools**: impersonation, quotas, revenue, subscriptions, feature flags, A/B tests, provider switching, maintenance mode [future] (WD-IDEA-ALT-017)
- **Observability**: prompt and response tracing, experiments, funnels, session recording, in-app feedback [future] (WD-IDEA-ALT-018)
- **Scale-out**: partitioning, caching, content delivery and video streaming, background queues [future] (WD-IDEA-ALT-019)

### Build and review process (creator's method, not product)
- **Review standards**: UI changes reviewed for usability; done only after live end-to-end run [voice] (WD-IDEA-UX-013, WD-IDEA-UX-014)
- **Investigate-then-plan**: investigate code, interview on contradictions; one planning doc per phase [voice] (WD-IDEA-ALT-020)
- **Spec template**: problem, goals, UX flow, data and state, implementation notes, open questions [voice] (WD-IDEA-ALT-021)
- **Prompt library**: reusable prompts across the development lifecycle [voice] (WD-IDEA-ALT-022)
- **Doc confidence**: confidence rating so agents verify against code; background updates to master docs [future, voice] (WD-IDEA-ALT-023, WD-IDEA-ALT-024)

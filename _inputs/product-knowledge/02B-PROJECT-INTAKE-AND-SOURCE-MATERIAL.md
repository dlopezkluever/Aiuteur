# 02B Project Intake & Source Material

> Scope: starting a project, project-level settings, Stage 1 input modes, accepted source material, and the Streamline structured-intake family (entry points, detection, import, routing, clarification, review). Legacy product thinking, not a description of current behavior. Legend: see 00-README.

## Project creation & dashboard

- **WD-IDEA-INPUT-001** [impl] Creating a project asks only for a title; all creative configuration is deferred to Stage 1 and the user lands straight inside the new project. The dashboard lists projects as cards.
- **WD-IDEA-INPUT-002** [planned] Dashboard organization: folders, project search/filtering, and cards that show each project's current stage and scene.
- **WD-IDEA-INPUT-003** [future] Batch operations across projects: batch project creation, bulk regeneration, batch export, batch status tracking, scheduled batch runs. ‹src: Post-MVP-tasklist›

## Project settings (global parameters)

- **WD-IDEA-INPUT-005** [idea] Global project parameters are configured first, before any text generation, and stay constant for the whole pipeline unless a new branch is created; once Stage 2 begins, edits to them are blocked.
- **WD-IDEA-INPUT-006** Stage 1 owns project setup and raw intake: project type, target length, rating, genre/tone, writing style capsule, visual style capsule or manual style description, raw source files, file classifications, and clarification answers.
- **WD-IDEA-INPUT-007** [impl] Project type defines the product's range: Narrative Short Film (standard pipeline), Commercial/Trailer (high-impact structure), or Video Content for Audio (a.k.a. Audio-Visual). Music video is also named as a target project type in the example-project plans (see WD-IDEA-UX-314). ‹src: current-app-user-flow, master-mvp-tasklist›
- **WD-IDEA-INPUT-008** [idea] Video Content for Audio: background visuals for a podcast or audiobook. The system strongly recommends uploading a timestamped transcript and generates a dialogue-free visual "story" matched chronologically to the audio's action (see 09). Related: WD-IDEA-INPUT-007 (project type) and WD-IDEA-INPUT-009 (transcript intake). ‹src: project-overview›
- **WD-IDEA-INPUT-009** [idea] Expected behavior for audio-driven projects: accept the audio file with its transcript, recognize its timestamp/speaker/topic structure, and set target length to the audio's duration. ‹src: golden-test-evaluation-framework›
- **WD-IDEA-INPUT-010** [voice,future] "Video Explainers" as a new input mode or project type: the user wants only visuals for a video essay or explainer, not a narrative. ‹src: new-tasks›
- **WD-IDEA-INPUT-011** Target length is a min/max duration range (e.g. 3:00–5:00; set by slider; legacy range 1–15 minutes) that becomes global context, so treatment and beat generation adjust narrative density to fit.
- **WD-IDEA-INPUT-012** Content rating (G, PG, PG-13, M) sets baseline constraints on dialogue and action across all stages.
- **WD-IDEA-INPUT-013** Genre/tone is a multi-select (e.g. Comedy, Thriller/Suspense, Drama, Romantic).
- **WD-IDEA-INPUT-014** Tonal precision: a mandatory free-text note (min 10 characters, live character count) refining rating and genre (e.g. "raunchy, with playful hints at taboo"), saved as a project constraint in global context.
- **WD-IDEA-INPUT-015** Aspect ratio is a project-level Stage 1 setting chosen per delivery platform (16:9 for desktop/YouTube, 9:16 for Shorts/Reels/TikTok; fuller list 16:9, 9:16, 1:1, 4:3, 2.35:1 cinematic). Set once and locked, never switched mid-project; applied to asset images, frames and video; shown in the project header.
- **WD-IDEA-INPUT-016** Writing style capsule is chosen in Stage 1 and clearly optional (from presets, personal library, or created inline); if skipped, the AI writes neutral descriptive prose.
- **WD-IDEA-INPUT-017** A visual style capsule is also a project-level global choice made alongside the writing capsule (see 06).
- **WD-IDEA-INPUT-018** The manual free-text approach used for tone should also apply to visual tone: a plain-language visual description instead of picking a capsule. ‹src: Tickets›
- **WD-IDEA-INPUT-019** [future] "Story Rules" set in Stage 1 persist and apply to all written and visual generation (e.g. "all characters are eggs; people of color are brown eggs; pets are breakfast items", "entire story set in 1600s Europe style"). The creator flags it as maybe unnecessary. ‹src: truly strech›
- **WD-IDEA-INPUT-020** Expected quality: the system infers from the input how many scenes the story implies (1–2 for a simple dialogue scene; a multi-scene sequence for an action piece). ‹src: golden-test-evaluation-framework›
- **WD-IDEA-INPUT-021** [voice,planned] Allow user-provided content uploads at each of Stages 1–5 (flagged "do soon"). ‹src: ._1-scratchpad›

## Classic input modes

- **WD-IDEA-INPUT-022** The user picks one of four input modes, which defines the initial state of the story structure.
- **WD-IDEA-INPUT-023** Expansion: a 1–3 paragraph idea kernel (typed or a single file) grows into a full three-act treatment; solves the blank page (e.g. "A detective investigates a mysterious murder...").
- **WD-IDEA-INPUT-024** Condensation: large text (100+ pages: a novel, a long script) is summarized and trimmed to a core cinematic narrative for adaptation.
- **WD-IDEA-INPUT-025** Transformation: source text plus a "twist" parameter rewrites the narrative (e.g. "Hamlet in Space") for stylistic adaptation or parody; optional secondary files (parody subject material, research notes) inform the twist.
- **WD-IDEA-INPUT-026** Script Skip: a formatted screenplay is parsed directly into the master-script format (Stage 4), skipping treatment and beat generation for prepared users.
- **WD-IDEA-INPUT-027** Script Skip may include a structured character/setting definition sheet (fixed template) that pre-defines assets so the AI need not infer them. ‹src: project-overview›
- **WD-IDEA-INPUT-028** [impl] Known gap: Script Skip existed but did nothing; every mode still ran Stage 1→2→3→4→5, so uploading a script saved zero work. This was the most-complained-about gap, and fixing it was seen as the highest-leverage, lowest-effort first win. ‹src: planning-wif-lawrence, streamline-master-plan-8-1›
- **WD-IDEA-INPUT-029** [voice] An uploaded script file (e.g. PDF) must actually be readable; failing with "primary file content could not be read" breaks the skip path. ‹src: Input-Methods-Task›

## File staging (classic modes)

- **WD-IDEA-INPUT-030** File staging area: drag-and-drop multiple files in any mode; the user designates one Primary Input and tags the rest as Context Files. The AI builds the story from the primary input and uses context files for tone, detail and supplementary information.
- **WD-IDEA-INPUT-031** [impl] Staging details: size and count limits; first file auto-marked primary, any file can be starred primary; context tags are Character Notes, World Building, Parody Source, Visual Reference (Text), Research Notes, Style Guide, Other.
- **WD-IDEA-INPUT-032** [impl] In Expansion the typed idea is the primary content and an optional supporting-file area holds context only; the other modes use the multi-file staging area with the primary file as primary.
- **WD-IDEA-INPUT-033** [impl] Full text of primary and context files is passed downstream without chunking or summarizing. ‹src: planning-wif-lawrence›

## Stage 1 gating & completion

- **WD-IDEA-INPUT-034** [impl] Stage 1 cannot continue until a mode and project type are chosen, tonal precision has ≥10 characters, and there is either an uploaded file or, in Expansion, ≥20 characters of idea text.
- **WD-IDEA-INPUT-035** [impl] Stage 1 autosaves drafts; on completion it processes the input into a normalized form for later stages and locks itself.

## Streamline: purpose & framing

Streamline ("Structured Inputs") is the creator's long-running family of ideas for letting prepared users bring existing material and skip the work it already covers. The variants below are preserved side by side.

- **WD-IDEA-INPUT-037** [planned] Streamline is a second "front door" for users who already have material (a finished screenplay, script plus character sketches, voice notes, half a treatment). They drop unstructured or semi-structured material into one intake space and the system organizes it into the structured artifacts the pipeline needs. Prepared users should not be forced through stages their material already covers, since the step-by-step path is tedious for them on a first pass; it stays for users starting from nothing (see 01). Related: WD-IDEA-INPUT-040.
- **WD-IDEA-INPUT-038** [voice] Expert users need a much more structured input option, channeled through the pipeline, that lets them skip the step-by-step flow and "really fly through". ‹src: Totally-New-Features›
- **WD-IDEA-INPUT-039** [planned] Build Streamline as a general intake pipeline whose first, best-supported case is scripts, not as a script-only shortcut. Later routing of treatments, beat sheets, images and eventually audio then extends the same system.
- **WD-IDEA-INPUT-040** Mixed bundles are the highest-value path: script + character images, script + recorded lines, script + storyboard frames, treatment + sketches, voice notes + PDFs + mood board, half-finished script + lore notes.
- **WD-IDEA-INPUT-041** [voice, future] Infer how much creative liberty to take from how much was supplied. With only a script and one character image the system fills in more; with script, character sheets, style frames, audio and storyboard stills it follows inputs tightly and only fills gaps. ‹src: streamlined-input-process-consolidated, Yolo-mode›
- **WD-IDEA-INPUT-042** "Really disorganized thoughts" mode: the system acts less like a form parser and more like an assistant that organizes chaos into pipeline-ready structure.

### Options: where Streamline lives (entry point)
- **WD-IDEA-INPUT-043** [voice] The creator is undecided on where the Structured Inputs / Streamline UI lives ("IDK, need more time to think"). ‹src: planning-wif-lawrence›
- **WD-IDEA-INPUT-044** [alt] Option 1, replace Script Skip: the fourth Stage 1 mode becomes "Structured Inputs"/"Streamline" and opens multi-file upload with per-document type dropdowns. Pros: smallest change, clear MVP surface, reuses the "one mode for prepared users" idea. Cons: Streamline is broader than script skip and may hide behind one of several cards.
- **WD-IDEA-INPUT-045** [planned] Locked-in plan decision: Streamline becomes the fourth mode, replacing the non-functional Script Skip. Expansion, Condensation and Transformation are untouched, and the four-mode selector stays the primary Stage 1 mental model for now.
- **WD-IDEA-INPUT-046** [alt] Option 2, separate panel: keep the four modes and add a Streamline button/section that opens a dedicated, richer upload panel (treatment, beat sheet, script, images), usable after selecting any mode. Cons: another entry choice, so it needs a careful UI hierarchy.
- **WD-IDEA-INPUT-047** [alt,future] Option 3, Streamline as the default Stage 1: one unified upload-and-prompt area where every file gets a type label, with the old modes demoted to secondary presets. It is the best long-term "drop in whatever you have" UX for laymen, but a large redesign that may weaken the modes' structured clarity. Framed as a possible future redesign if Streamline proves more natural for most users.
- **WD-IDEA-INPUT-048** [alt] Recommended near-term direction: a dedicated Stage 1 panel or Script Skip replacement, modeled internally as a general intake pipeline (documents, images, eventually audio); promote it to primary Stage 1 only if it proves more natural.
- **WD-IDEA-INPUT-049** [alt] Counter-position: the four-mode selector gives blank-slate creatives a "what do I have to start with?" mental model, and a universal drop zone would be a regression for them; Option 3 should be off the table for at least 12 months. ‹src: streamlined-input-analysis-5-10›
- **WD-IDEA-INPUT-050** [voice,alt] Project-type-first variant: move "Project Type" to the top of Stage 1. If Narrative, keep the four modes but rename Script Skip to "Structured-Input" or "Streamline", subtitled "Enter Structured Docs and Fly Through the Pipeline" (other project types imply different mode sets). ‹src: new-tasks›
- **WD-IDEA-INPUT-051** [alt] Prominent one-shot "I just have a script" path: a large dedicated "Import Script" drop zone above the general intake area. About three clicks: drop file, confirm "this is your script", choose skip vs backfill of treatment/beats, land at Stage 4 review. The streamlined three-click target for a finished script is WD-IDEA-UX-115.
- **WD-IDEA-INPUT-052** [future,alt] Dashboard "Start from Files": opens Streamline directly from the dashboard and auto-names the project from the imported material (document title or filename stem) instead of asking for a title before the user can give content they already have.

### Options: shape of the intake UI
- **WD-IDEA-INPUT-053** [voice] Desired Streamline UI: press "Streamline", get rows of [Enter file] [Identify-doc dropdown] [if script: "Skip to Script" Y/N toggle], with a "+ Add More +" button to add more documents in one go. ‹src: Input-Methods-Task›
- **WD-IDEA-INPUT-054** [voice, future] "Super Spec'd Out" mode for users who already have character descriptions, a detailed plot summary, a treatment, etc.: a form where each attached file gets a label (Character Descriptions, Treatment, Script, Beat Sheet, Shot Description, Visual Style Description). ‹src: Totally-New-Features›
- **WD-IDEA-INPUT-055** [planned] Structured upload form (ticket version): upload files or paste text; each submitted item gets a type dropdown so the user can correct the auto-detected type.
- **WD-IDEA-INPUT-056** [alt] Linear intake flow: open Streamline → drop files, paste text or record audio → classification review table → correct types and primary/context roles → a few clarifying questions → route-plan preview → confirm → pipeline opens at the most relevant review stage. ‹src: streamlined-input-process-consolidated›
- **WD-IDEA-INPUT-057** [alt] Spatial intake canvas instead of a linear wizard: files appear as cards, classification and routing annotations appear beside each card in real time, and the user adjusts and confirms in place, "like organizing a desk rather than filling out a form" (see 10). ‹src: streamlined-input-analysis-5-10›

## Intake UI principles

- **WD-IDEA-INPUT-058** Progressive disclosure: intake starts as "drop what you have here"; the type dropdown appears only when confidence is below threshold, primary/context designation only when there are multiple files; most power-user options start hidden.
- **WD-IDEA-INPUT-059** Plain-language validation copy that offers a way out, e.g. "We couldn't find any scenes in your script. Script scenes usually start with something like INT. COFFEE SHOP - DAY... Want to add those, or should we treat this as unstructured notes instead?"

## Upload & text extraction

- **WD-IDEA-INPUT-060** [planned] Structured upload panel: multi-file drop zone plus a paste-text option.
- **WD-IDEA-INPUT-061** [planned] Supported text formats: TXT, MD, PDF, DOCX, RTF. PDF text extraction must actually work (PDFs were previously stored with no text).
- **WD-IDEA-INPUT-062** [planned] Legacy binary .doc is rejected outright with "please save as .docx or .pdf" rather than attempted and silently failed.
- **WD-IDEA-INPUT-063** [impl] Files are extracted one per request, so each file in a batch can be retried or dropped independently.
- **WD-IDEA-INPUT-064** [planned] Partial success: if some files fail to parse, the user proceeds with the rest; failed files can be retried, reclassified or dropped without losing the batch. No all-or-nothing batch failure.
- **WD-IDEA-INPUT-065** File-level partial success is distinct from the stage commit, which must be all-or-nothing (see 02).
- **WD-IDEA-INPUT-066** Store the raw source material and its extracted text for traceability.
- **WD-IDEA-INPUT-067** Unclassified files are kept as context, never discarded.

### Options: where text extraction runs
- **WD-IDEA-INPUT-068** [alt] In-browser parsing: avoids a server step, but carries bundle-size cost and uneven quality on scanned PDFs and complex DOCX. ‹src: streamline-plan-critique-8-1›
- **WD-IDEA-INPUT-069** [alt] Server-side extraction (legacy choice): keeps the client lean and quality predictable; classification happens in the same pass, so text never round-trips to the browser. ‹src: streamline-plan-critique-8-1›

## Accepted source material

- **WD-IDEA-INPUT-070** Text/document inputs: idea fragments, rough notes, treatments, beat sheets, outlines, half-finished scripts, complete formatted screenplays, novels/large documents, character descriptions, setting/location notes, world-building notes, research notes, style guides, parody or transformation source material.
- **WD-IDEA-INPUT-071** Visual inputs: character, prop and location/environment images, style references, mood boards, storyboard frames, rough sketches/doodles, existing frame stills, CineBlock or other blocking captures, photos with multiple people to be mapped to characters.
- **WD-IDEA-INPUT-072** Uploaded images are analyzed; users can name the people or objects in them; image-derived descriptions are reconciled with existing written descriptions. Character/prop/location images route to Stage 5; scene-specific or storyboard images route to Stage 8, 9 or 10 by usage (see 06).
- **WD-IDEA-INPUT-073** [future] Multi-person photo intake: upload a photo of several people, name each, specify how each should be visually changed, attach or record voice samples, and the system creates character assets from those mappings. ‹src: streamlined-input-process-consolidated›
- **WD-IDEA-INPUT-074** [voice,future] Film-sampling input: upload the actual .mp4, or more conveniently just describe the clip in text (see 07). ‹src: new-tasks›
- **WD-IDEA-INPUT-075** [voice,future] Users can submit audio recordings of their ideas as input. ‹src: Totally-New-Features›
- **WD-IDEA-INPUT-076** [future] Audio inputs: voice notes or rambling project notes, recorded dialogue lines, voice-acting performances, audio-first material (podcasts, audiobooks, lectures/transcripts), character voice samples; users can also record directly into intake (see 09).
- **WD-IDEA-INPUT-077** [future] Audio notes are transcribed, with detection of interruptions, filler and unrelated fragments, and extraction of story intent, character ideas, tone and unresolved questions. ‹src: streamline-master-plan-8-1›
- **WD-IDEA-INPUT-078** [future] Near-term audio interpretation: transcribe, classify as notes / dialogue / narration / voice sample, then route notes to treatment/script context, dialogue and narration to frame/video prompting and final-assembly audio context, and voice samples to character metadata. ‹src: streamlined-input-process-consolidated›
- **WD-IDEA-INPUT-079** [future] When audio returns, scope it to "transcribe and route to context", not the full audio-first product mode. ‹src: streamlined-input-analysis-5-10, streamline-implementation-spec-8-3›

## Document type detection & classification

- **WD-IDEA-INPUT-080** Each input's document or asset type is auto-detected (script, treatment, beat sheet, character notes, unclassified) with a manual override dropdown.
- **WD-IDEA-INPUT-081** Detection confidence is always shown, never hidden: "95% confident: Screenplay" earns trust; "62% confident: Treatment or Outline — what is this?" turns a silent misclassification into a collaborative question.
- **WD-IDEA-INPUT-082** Streaming feedback: per-file classification cards appear as each file resolves instead of one spinner, so the user reviews and corrects early files while later ones process.
- **WD-IDEA-INPUT-083** One file can be marked primary and the rest are supporting context; the primary flag also feeds conflict-authority ranking.
- **WD-IDEA-INPUT-084** Script detection by structural line classification (scene headings, transitions, dialogue, action), with tunable thresholds:
  - High confidence: ≥3 scene headings and ≥1 dialogue line, so skip to Stage 4 is offered.
  - Ambiguous: 1–2 headings, or headings without dialogue. No auto-skip; show an "is this right?" confidence prompt.
  - Prose: zero headings, treated as treatment/notes, with no skip offered.
- **WD-IDEA-INPUT-085** The same screenplay parse serves detection and produces Stage 4's formatted script, so detection and import share one pass.
- **WD-IDEA-INPUT-086** [rejected] A throwaway "looks like a script if it has INT./EXT." heuristic, to be replaced later by full classification. Replaced by reusing the existing screenplay parser as the detector. ‹src: streamline-plan-critique-8-1›
- **WD-IDEA-INPUT-087** A confidently detected script gets a one-line summary: "This looks like a complete screenplay. We'll skip Treatment and Beat Sheet and take you straight to Stage 4 for review."

## Import behavior (as-is vs AI-format)

- **WD-IDEA-INPUT-088** [planned] "As-is" means "no structural reformatting pass", not "byte-for-byte untouched". A file imported as-is can still receive small surgical patches from clarification answers, so the two are independent axes, and the review must show such edits (e.g. "3 edits applied from your answers").

### Options: how an imported document populates its stage
- **WD-IDEA-INPUT-089** [voice,alt] Insert as-is (the creator's pick, marked "Recommended"): the exact text becomes the stage's starting content, with no AI and no credits; the user refines with existing regenerate/edit tools. Best for clean treatments, scripts and beat sheets already in the expected structure. ‹src: planning-wif-lawrence›
- **WD-IDEA-INPUT-090** [voice,alt] AI-format: a lightweight AI pass restructures the upload into the stage's expected format (e.g. extract individual beats from a prose beat sheet). Costs credits but guarantees structural compatibility; best for prose beat sheets, messy notes, PDFs/long docs, half-finished scripts, mixed bundles.
- **WD-IDEA-INPUT-091** [voice,alt] User chooses per file: each upload gets a "Use as-is" / "AI-format" toggle, so power users can mix clean sources with messy notes. Later decided as the behavior: always per file, never a single global toggle.
- **WD-IDEA-INPUT-092** [planned] Adopted default: the system pre-selects as-is vs AI-format per file from its detection confidence (clean, well-structured docs inserted at no AI cost; messy docs restructured into the target stage's format), always with a visible per-file override. Generated stage content is always previewed before commit.


## How intake output maps onto later stages

The material decides how far the user lands: each detected artifact either fills its stage, lets the stage be skipped, or leaves it to generate normally.

- **WD-IDEA-INPUT-093** Streamline maps detected inputs to stage artifacts and fills the pipeline as far as the material justifies, skipping or marking upstream stages when a later-stage artifact is already supplied (see 02 for skipped-stage states and backfill).
- **WD-IDEA-INPUT-094** [planned] Structured upload (ticket version, the only new MVP input mode): detect each document's type and route it to the right stage instead of regenerating from scratch. Treatment → Stage 2; beat sheet → converted to structured beats and pushed into Stage 3; script → Stage 4; character descriptions → stored for Stage 5 extraction.
- **WD-IDEA-INPUT-095** Stage 2: a supplied treatment is imported directly (as-is or AI-formatted); notes or long prose generate a treatment normally; a finished script lets Stage 2 be skipped or optionally backfilled. Stage 2 originally had no direct import path.
- **WD-IDEA-INPUT-096** Stage 3: a supplied beat sheet is parsed into structured beats; a treatment generates beats normally; a finished script lets Stage 3 be skipped or optionally reverse-generated.
- **WD-IDEA-INPUT-097** Stage 4: a formatted screenplay imports directly, with scenes parsed deterministically; this is where skip logic and general intake meet. Otherwise the script generates from treatment/beats. Stage 4 should also offer one-click file import, not paste-only.
- **WD-IDEA-INPUT-098** [planned] The skip path must route users into Stage 4 or later, never wrongly into Stage 2. ‹src: injecting-org-tickets-into-plan›
- **WD-IDEA-INPUT-099** The landing stage depends on what the material earned: a finished script lands in Stage 4 for review; a treatment fragment may land the user at Stage 3 with Stage 2 auto-filled from it.
- **WD-IDEA-INPUT-100** Stage 5 asset creation accepts four input routes together: script-derived extraction; user-supplied character, setting and prop sheets; uploaded images converted into assets with description reconciliation; and manual creation without generation (see 06). ‹src: streamlined-input-process-consolidated›
- **WD-IDEA-INPUT-101** [planned] Two asset mechanisms. Script import reuses the normal Stage 4 lock path: free, deterministic scene splitting and per-scene dependency extraction, with the only credit cost being the AI visual distillation of user-selected assets. A standalone character/location/prop notes file (no scene to attach to) gets its own small AI read that pre-fills one Stage 5 asset draft (name, type, description) for confirmation; it is costed, not free. ‹src: streamline-plan-critique-8-1, streamline-implementation-spec-8-3›
- **WD-IDEA-INPUT-102** A script import counts as fully successful only if scene extraction succeeds. If it fails or yields zero scenes, the UI must not claim success: it shows a visible recovery action and records the failure, since Stage 5 depends on those scenes. ‹src: streamline-implementation-findings›

## Images and storyboards in intake

### Options: where image uploads happen
- **WD-IDEA-INPUT-103** [voice,alt] All in Stage 1 (the creator's pick): character images and storyboard frames go through the same Structured Inputs flow, tagged (character images for Stage 5, storyboard frames for Stage 10), and the system routes them. ‹src: planning-wif-lawrence›
- **WD-IDEA-INPUT-104** [voice,alt] Split by stage: text in Stage 1, character images in Stage 5, storyboard frames in Stage 10, each stage with its own upload. ‹src: planning-wif-lawrence›
- **WD-IDEA-INPUT-105** [voice,alt] Stage 1 + Stage 10: text and character images in Stage 1 (characters are needed early); storyboard frames handled separately in Stage 10 because frame-to-shot mapping is complex. ‹src: planning-wif-lawrence›
- **WD-IDEA-INPUT-106** [planned] Adopted default: all character/location/prop reference images are accepted in the Stage 1 Streamline intake and routed to Stage 5 on commit, reviewed together in one batch grid rather than one dialog per image (see 06). Each batch card shows the detected entity type and name, with an editable type or name override and one editable description; a filename or note naming a script character (e.g. "Marcus") fuzzy-matches that character. Accept or skip applies per image, and a conflicting description is pre-filled by the authority ranking in WD-IDEA-INPUT-124. Heavy per-image actions (edit image, apply visual style, remove background, regenerate) are excluded from intake and handled after commit (see WD-IDEA-ASSET-138). ‹src: streamline-plan-critique-8-1›

### Options: storyboard material as input
- **WD-IDEA-INPUT-107** [future,alt] Storyboard and sketch frame routing into Stage 10 is out of Streamline's MVP; it is treated as a Stage 10 feature that intersects Streamline.
- **WD-IDEA-INPUT-108** [alt] Storyboard frames can be part of the Stage 1 bundle: classified and stored. If the user maps them to scenes/shots they route to the shot list and frame stages; if unmapped they wait in an input bin for later assignment. ‹src: streamlined-input-process-consolidated›
- **WD-IDEA-INPUT-109** [future,alt] Storyboard upload as a Stage 1 input for quick-storyboard enthusiasts: the system reads labels such as 1A, 1B, 2A and matches them to the written outline/script. This enables a mode that skips Stages 2–4, where the shot list stage distills and categorizes strong storyboard data instead of inventing shots (see 07). Related: WD-IDEA-FLOW-091 and WD-IDEA-FLOW-092.

## Clarification session ("Ask Auteur")

- **WD-IDEA-INPUT-111** [planned] After analyzing submitted material, an "Ask Auteur" session asks a short, targeted set of questions about what the system could not resolve, modeled on an agent's "ask clarifying questions instead of guessing" pattern. It turns Streamline from a file parser into an assistant; answers persist as project context for later generation (see 04). Persistence as a branch-scoped ledger of established facts is WD-IDEA-CONT-037.
- **WD-IDEA-INPUT-112** What the clarification layer does: resolve contradictions, clarify vague character motivations, ask about missing plot direction, flag irrelevant transcript fragments, turn disorganized notes into a coherent treatment, and let users choose a branch when several interpretations are plausible.
- **WD-IDEA-INPUT-113** [planned] Question triggers fall into five categories (contradictions, vague traits, ambiguous structure, missing information, conflict resolution). Contradictions between documents: two names for one character, two implied endings.
- **WD-IDEA-INPUT-114** [planned] Trigger: vague or unfinished traits the user clearly meant to define (an accent mentioned once, a personality note that trails off).
- **WD-IDEA-INPUT-115** [planned] Trigger: ambiguous structure, such as a paragraph that reads like a discarded aside ("kept idea or drop it?") or text that seems cut off ("treat what follows as a new scene, or drop it?").
- **WD-IDEA-INPUT-116** [planned] Trigger: missing information the pipeline needs that nothing supplied (e.g. no visual style anywhere: infer one, or ask the user to define it?).
- **WD-IDEA-INPUT-117** [planned] Conflict resolution: when inputs disagree (the script says a character is in his 40s, the uploaded image shows someone younger), the system never silently picks one; it surfaces the conflict as a question.
- **WD-IDEA-INPUT-118** Example questions: "You mention two possible endings. Which should be the main branch?"; "Is this paragraph a discarded idea, or part of the story?"; "You supplied a script but no visual style. Infer one or define it?"; "This storyboard frame appears to match Scene 2B. Correct?"; "Two different names for the antagonist, which is correct?"
- **WD-IDEA-INPUT-119** [planned] Question format: multiple choice with a final "type your own answer" option, never an open text box as the primary interface; few, targeted questions, not a long form; voice answers eventually.
- **WD-IDEA-INPUT-120** [planned] Opt-in every time and never blocks commit: zero triggers means no session is offered; declining lets the AI infer every open answer, recorded the same way as user answers.
- **WD-IDEA-INPUT-121** [planned] Questions open only after the whole batch is classified (per-file cards may stream, questions never open early), so a later file cannot contradict an answer just given.
- **WD-IDEA-INPUT-122** [planned] Answers surgically edit the user's own submitted documents with variable scope: word patch (naming fix, find/replace across documents, near-free), paragraph rewrite (a trait clarification inserted into one description), or structural cascade (a plot answer rewrites or re-splits a section of both beat sheet and script) (see 05). Reconciliation runs once per clarification session across all submitted documents and the full Q&A transcript; each affected document gets a one-line diff summary (see WD-IDEA-STORY-083 and WD-IDEA-STORY-084).
- **WD-IDEA-INPUT-123** [planned] Re-ask rule: when new material (a later upload or mid-production intake) disagrees with a previously answered fact about the same named entity, the system asks again ("You previously said the antagonist is Marcus. This new file calls him Marc — keep Marcus?") rather than silently keeping or overwriting. History is kept by adding a new answer, never by changing the old one. The established-facts ledger that holds these answers is WD-IDEA-CONT-037. ‹src: streamline-plan-critique-8-1, streamline-implementation-spec-8-3›

## Source-of-truth when inputs conflict

- **WD-IDEA-INPUT-124** [planned] Default authority ranking: explicit user answer to a clarification question > uploaded primary document > supporting context documents > AI inference (fills gaps only). This ranking applies when inputs conflict and no other rule resolves the conflict. ‹src: streamline-master-plan-8-1, streamline-plan-critique-8-1, streamlined-input-analysis-5-10›
- **WD-IDEA-INPUT-125** [planned] Below the question threshold, conflicts may be auto-resolved silently by the same ranking, with the winning value tagged imported (a document won) or AI-generated (inference won).

## Review & approval before commit

- **WD-IDEA-INPUT-126** [planned] Review-before-commit is a hard requirement from the first version. Before anything is written, the user sees what was detected and what will happen: which stages are filled with their material as-is, which are skipped, which are AI-generated to fill gaps. They can correct classifications and primary/context roles, and nothing commits until they approve, because a system that silently decides what to do with a user's material won't be trusted (see 10 for cost estimate and route-plan preview).
- **WD-IDEA-INPUT-127** [planned] "Messy pile" walkthrough: a rough half-script, notes for some characters, a treatment that trails off and reference images are dropped together. Cards classify each with confidence; the user fixes one misclassification by dropdown, answers 4–5 Ask Auteur questions, sees which stages are as-is vs AI-completed and what it costs, then lands at the stage the material supports.
- **WD-IDEA-INPUT-128** [planned] In the initial build nothing from an intake session (files, Q&A, reconciled text) is saved until the user confirms; closing before confirming loses the session. On confirm, facts, edits and stage content are written together, so a confirm applies all or nothing (see WD-IDEA-UX-118).

## Other structured-input variants

- **WD-IDEA-INPUT-129** [future] Guided "ideal input format" template with sections: Script (Y/N), Plot, Dialogue Rules & Examples, Character Descriptions, General Vibe, Shot Styles, Story Rules.
- **WD-IDEA-INPUT-130** [planned,future] MVP scope: Structured Upload is the only new Stage 1 input mode; storyboard upload and the input template are deferred to post-MVP. ‹src: master-mvp-tasklist›
- **WD-IDEA-INPUT-131** [future] "Just talk to me" conversational intake for users with no files, only ideas: they describe the project by voice or text and the system builds the scaffold through iterative questions. Distinct from Ask Auteur (which runs only after material is submitted), though the two should eventually converge.

## Intake beyond project start

- **WD-IDEA-INPUT-132** [future] Contextual intake from inside production: a user in Stage 7/8 (e.g. Scene 6) opens Streamline to drop newly received material, such as a collaborator's reference photos for a final-act character. The system recognizes where the user is and offers scoped routing to Stage 5 and optionally the current scene ("You're in Scene 3, Stage 8. These look like scene asset references. Add them to Scene 3?") without leaving their place.
- **WD-IDEA-INPUT-133** [future] Asset-only intake sub-mode: add one new character or location mid-production (a late-appearing character, a location discovered during production), routed to Stage 5 and optionally the current scene's Stage 8, with no full extraction pass or pipeline restart.
- **WD-IDEA-INPUT-134** [future] Intake session persistence: a draft "project staging area" holds submitted material across tab close and multiple sittings until the user explicitly commits it.
- **WD-IDEA-INPUT-135** [future] Import templates for series/episodic creators ("start this project like my previous one"): save a finished project's configuration (global assets, style capsule, project type, tone, scene structure) and apply it to a new episode, so only the new script is needed.
- **WD-IDEA-INPUT-136** [future] Collaborative intake: director, writer and production designer each upload to the same intake session, each file attributed to its contributor, with the system reconciling overlapping or conflicting inputs.
- **WD-IDEA-INPUT-137** [future] Intake material can later power the lore library: users tag each intake item "project only" or "personal library" (reusable in future projects), built on the global asset library rather than a complex memory system (see 06).

## Location image input for world generation (CineBlock)

- **WD-IDEA-INPUT-138** [impl] Location input modes for 3D world generation: Guided (four directional slots), Free (2–8 images in any arrangement, spatial layout inferred), Text (scene description only), Video (one video file), Single Image (one reference, optionally flagged panoramic) (see 06B). Text-only, single-video and single-image modes also appear in WD-IDEA-LOC-265.
- **WD-IDEA-INPUT-139** [impl] Guided mode has four azimuth slots (Front 0°, Right 90°, Back 180°, Left 270°). Each is a drop zone with preview, a remove button, and helper text suggesting content: eye-level hero; side/perpendicular; opposite wall/reverse; other side/window wall. Related: WD-IDEA-LOC-263 (same four-slot Guided mode with azimuth labels).
- **WD-IDEA-INPUT-140** [alt] Earlier variant: a plain drag-and-drop multi-image uploader with helper text recommending an establishing wide/aerial, an eye-level hero, and an opposite-wall/reverse angle; thumbnails removable individually. Related: WD-IDEA-LOC-266. ‹src: prd-2-tight, prd-final-enough›
- **WD-IDEA-INPUT-141** [planned] Once integrated, the directional slots map onto the location asset's existing directional views (establishing = front; other directions = right/back/left).
- **WD-IDEA-INPUT-142** [impl] Every image/video mode also accepts an optional text description for hybrid generation, and a scene prompt can be composed from the shot list to guide world generation.
- **WD-IDEA-INPUT-143** [impl] Each uploaded location image shows a resolution badge: green (≥1080p), yellow (≥720p), red (<720p).

## Open questions

- **WD-IDEA-INPUT-144** [idea] Acceptable file-size and token limits for large PDFs and novels.
- **WD-IDEA-INPUT-145** [idea] How much AI parsing should happen automatically before the user confirms anything? ‹src: streamlined-input-process-consolidated›
- **WD-IDEA-INPUT-146** [idea] Should an imported script stay the source of truth, or may treatment/beat-sheet backfills feed changes back into it? ‹src: streamlined-input-process-consolidated›

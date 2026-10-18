# 07 Shots, Cinematography & Previs

> Scope: shot lists and their decomposition, shot fields and camera language, blocking, start/end conditions, and CineBlock previs. Legacy product thinking, not a description of current behavior. Legend: see 00-README.

## The shot list's role

The shot list (Stage 7) sits between the scene's script and everything visual: it turns one scene into an ordered table of short, generatable shots that later receive assets, prompts, frames and video.

- **WD-IDEA-SHOT-001** [idea] The shot list is the most critical production control point: it defines exactly what happens in the scene (mechanical breakdown into discrete, time-bounded shots), not how assets look. It must be locked before scene asset work begins.
- **WD-IDEA-SHOT-002** [impl] When a scene has no shot list, one is extracted automatically on entry; the workspace is a shot table/list beside a detail editor for the selected shot.
- **WD-IDEA-SHOT-004** [rejected] "Rearview Mirror": a persistent panel in the shot list stage showing the previous scene's final action, dialogue and final frame, so the new scene's first shots hand off seamlessly. Judged possibly not useful enough and replaced by the multi-tab content panel; its rearview tab is WD-IDEA-CONT-215. ‹src: project-overview, user-flow›
- **WD-IDEA-SHOT-005** [idea] Each scene's shot list carries continuity notes explaining how it connects to the prior and next scenes; its first shot must match the prior scene's ending positions and states, and the setting must match or transition explicitly (see 04). Related: WD-IDEA-CONT-073 (explicit setting-transition rule) and WD-IDEA-CONT-135.
- **WD-IDEA-SHOT-008** [idea] Expected quality of a generated shot list: medium shots for dialogue alternating with close-ups on emotional beats; technically specific camera language (MS, CU, tracking, POV, Dutch, handheld); dialogue spread across shots; correct character prominence; fast sequences split into more shots; total duration matching the target length. ‹src: golden-test-evaluation-framework›
- **WD-IDEA-SHOT-009** [idea] For audio-driven projects, shots line up with the audio's timing, the dialogue field carries transcript excerpts, and action describes visuals that complement the audio (see 09). Related: WD-IDEA-GEN-067 (audio synchronization first) and WD-IDEA-INPUT-008. ‹src: golden-test-evaluation-framework›
- **WD-IDEA-SHOT-010** [future,alt] With a fully supplied script or storyboard package, the shot list stage imports or extracts shot lists instead of inventing them; storyboard panel labels (1A, 1B, 2A) are matched to script/outline labels, and strong storyboard data is distilled and categorized rather than reinterpreted (see 02B). Related: WD-IDEA-INPUT-109 (storyboard Stage 1 input, same status). ‹src: streamlined-input-process-consolidated›

## The shot unit and duration

- **WD-IDEA-SHOT-011** [idea] A shot is the atomic video unit: one primary action or one dialogue exchange.
- **WD-IDEA-SHOT-012** [impl] Shots default to 8 seconds because that matches the video generator's clip length; duration is adjustable per shot, and other lengths should carry a justification (4–6 s suggested for complex action).
- **WD-IDEA-SHOT-013** [idea] If an action doesn't finish within the clip, shorten the action or lengthen the duration. ‹src: Frame_Video_Prompt_Format_Guide›

### Options: shot duration model
- **WD-IDEA-SHOT-014** [alt] Fixed: every shot is exactly 8 seconds unless explicitly justified ("8-second shot definitions"; golden tests expect exactly 8 s). ‹src: project-overview, golden-test-evaluation-framework, AI-agent-registry-context-flow-architecture›
- **WD-IDEA-SHOT-015** [alt] Discrete: 4, 6, or 8 seconds; 4–6 s for complex or action-heavy beats, 8 s for atmospheric shots. ‹src: Frame_Video_Prompt_Format_Guide›
- **WD-IDEA-SHOT-016** [alt] Flexible: any duration from 1 to 30 s is valid, 4–12 s is recommended, 8 s is only the default (see WD-IDEA-SHOT-064). ‹src: current-app-user-flow, architecture-and-rules›

### Options: how much can happen inside one clip
- **WD-IDEA-SHOT-017** [alt] One major action per shot: multi-action clips fragment into soft or smeared motion, so a chain of actions is split across shots. ‹src: Frame_Video_Prompt_Format_Guide›
- **WD-IDEA-SHOT-018** [alt] Timestamp prompting: one video prompt choreographs timed beats inside one clip in roughly 2-second segments, each with its own action, camera change (even a cut to a reverse shot) and audio cue; the start frame still anchors the visuals. ‹src: Frame_Video_Prompt_Format_Guide›

## Shot fields

- **WD-IDEA-SHOT-019** [idea] Each shot records: shot ID and order, duration, verbatim dialogue, an atomic physical action, characters present with prominence (e.g. "John (foreground, profile), Mary (background, blurry)"), a specific setting with lighting detail, a camera spec (e.g. "CU – Dolly In (Slow) – High Angle"), continuity flags, and an optional link to the story beat it serves.
- **WD-IDEA-SHOT-020** [impl] Shot IDs are human-readable: scene number plus letter (3A, 3B); shot order can be changed.
- **WD-IDEA-SHOT-021** [idea] Split shots take suffixed IDs (3A → 3A-1, 3A-2); a merged shot keeps the first shot's ID with an "-M" suffix. ‹src: AI-agent-registry-context-flow-architecture›
- **WD-IDEA-SHOT-022** [impl] Every character in a shot is marked foreground, background, or off-screen.
- **WD-IDEA-SHOT-023** [planned] Foreground/background characters carry relative position (left/center/right), distance from camera, and facing direction. ‹src: 3.8-phase2-shot-list-action-iteration›
- **WD-IDEA-SHOT-024** [idea] Dialogue extensions carry visual meaning: O.S. means present in the scene but off-screen (voice only, no render needed), V.O. is voiceover; asset and frame stages use this to decide whether a character must be rendered in a shot. Related: WD-IDEA-CONT-009 (off-screen dependency rule). ‹src: tiptap-json-extraction-guide›
- **WD-IDEA-SHOT-025** [idea] Dialogue structure informs shot choices (two-shots, over-the-shoulder, close-ups), and who is speaking determines camera focus when composing frames. ‹src: tiptap-json-extraction-guide›
- **WD-IDEA-SHOT-026** [planned] The setting field describes the specific part of the location visible in this shot, its lighting, time-of-day cues and atmosphere.
- **WD-IDEA-SHOT-027** [voice] Location attribution must be specific per shot, not a vague "interior – Hero's home" repeated for every shot in the scene, so the right references can be inferred (see 06B). ‹src: 3.7-location-pre-planning›
- **WD-IDEA-SHOT-029** [impl] Each shot has a toggle for whether it needs an end frame: start+end is the default; start-only suits models that don't use end frames (see 08).

## Camera language

- **WD-IDEA-SHOT-030** [impl] A camera spec has three parts, shot type – angle – movement, drawn from a standard vocabulary: EWS/WS/MS/MCU/CU/ECU; eye level, low, high, bird's-eye, Dutch, worm's-eye; static, dolly, pan, truck, crane, handheld, steadicam. Optional framing notes ("subject frame-left, looking frame-right").
- **WD-IDEA-SHOT-031** [planned] The camera field also states lens feel (telephoto compression vs wide-angle distortion) alongside shot type, angle and planned movement. ‹src: 3.8-phase2-shot-list-action-iteration›
- **WD-IDEA-SHOT-032** [idea] The vocabulary has canonical meanings: EWS establishes scale, WS gives spatial context, MS for dialogue, MCU for emotion with context, CU for intimacy, ECU for intense detail; low angle = power, high = vulnerability, Dutch = unease, bird's-eye = omniscience, worm's-eye = towering; lens options include shallow/deep focus, wide-angle, telephoto compression, anamorphic, fisheye.
- **WD-IDEA-SHOT-033** [idea] Camera movements have intended effects: dolly-in for intimacy/focus, dolly-out to reveal context, tracking for dynamic participation, crane for dramatic reveals, subtle handheld for documentary realism, shaky handheld for chaos, gimbal/steadicam for polish, dolly zoom for disorientation.
- **WD-IDEA-SHOT-034** [idea] Every video prompt states camera movement explicitly or says "static", using exact terms ("slow dolly in") from a fixed vocabulary (pan, tilt, dolly, truck, crane, arc, handheld, steadicam, rack focus, zoom, push-in, pull-out), never vague words like "cinematic".
- **WD-IDEA-SHOT-035** [impl] Static/moving split: a frame prompt gets only where the camera *is* (shot type, angle, lens character, focal plane); movement belongs only to the video prompt; rack focus is a video element because it changes over time. One rich camera description therefore feeds the frame prompt, the video prompt, and character-angle matching (see 08). The legacy prompt-assembly rules implement this split.
- **WD-IDEA-SHOT-036** [impl] The shot's camera angle and movement must actually shape how generated frames are composed, and the frame prompt must describe it.
- **WD-IDEA-SHOT-037** [idea] Controlled spatial vocabulary for placement: frame left/right, foreground/midground/background, center frame, facing camera/profile/three-quarter/back to camera, above/below frame line, overlapping.
- **WD-IDEA-SHOT-038** [impl] Structured camera metadata per shot (camera distance, camera height, movement, plus the assigned location direction) exists alongside the free-text camera spec, is generated at shot-list time, and needs user-facing exposure.
- **WD-IDEA-SHOT-039** [impl, voice] Two-track camera metadata: the AI emits structured fields when it can; otherwise a deterministic parser derives them from free text ("WS – High Angle – Slow Pan Right" → wide / high / slow pan right), mapping shot sizes to wide/medium/close, angle words to heights (bird's-eye→overhead, worm's-eye→ground, Dutch→eye level) and movement words with slow/fast; this also covers legacy and hand-edited shots. Both tracks were chosen in the questionnaire.
- **WD-IDEA-SHOT-041** [future] Richer per-shot cinematography (real lens selection, film stock, color grade reference) exported as a cinematography block for generation. ‹src: CineBlock-system-overview›

## Descriptive, directional shots

- **WD-IDEA-SHOT-042** [voice,planned] Legacy notes call shot descriptions "lazy" (often a line of dialogue plus buzzwords) and must become richly descriptive and directional, especially if frames come out incoherent: they are the preamble to the frame and video prompts, so improvements propagate.
- **WD-IDEA-SHOT-043** [planned] Crew-note style: written like a director's notes to a cinematographer, covering camera angle and motion, lighting, mise-en-scène framing, character positioning and movement, and environment changes (e.g. "WIDE — Kitchen, morning light camera-left. SPONGEBOB at stove, back to camera, spatula raised theatrically. PATRICK enters camera-right, sleepy slouch, dragging blanket.").
- **WD-IDEA-SHOT-044** [impl] Action describes what a viewer sees, not the story: blocking and position in frame, physical choreography and spatial relationships ("A leans forward across the table, pointing at B, who recoils with arms crossed"), environmental details and implied lighting. Vague actions ("they talk") are forbidden.
- **WD-IDEA-SHOT-046** [voice,planned] A character's signature performance style travels into prompts (e.g. SpongeBob's Chaplin-esque, over-expressive facial acting). ‹src: 3.7-tasks-part-2(3.8)›
- **WD-IDEA-SHOT-049** [voice,planned] Improve shot detail by iterating on the existing extraction, not rebuilding it. ‹src: 3.8-threads›
- **WD-IDEA-SHOT-050** [planned] Guardrail: richer descriptions must not regress shot count, dialogue accuracy or character assignment.

## Editing the shot list

- **WD-IDEA-SHOT-051** [impl] Every field is directly editable; the shot inspector shows the selected shot expanded (duration, action, dialogue, characters, setting, camera, beat reference) with the beat reference and the AI's rationale.
- **WD-IDEA-SHOT-052** [idea] Field coherence: editing one field (e.g. Wide → Close Up) near-instantly regenerates dependent fields (action, dialogue) so the shot stays coherent. ‹src: project-overview›
- **WD-IDEA-SHOT-053** [impl] Split: AI divides one shot at a natural action or dialogue break into two (or up to three) shots that together cover the same narrative content, with adjusted camera specs, kept or refined continuity flags, and a rationale for the split point; no new story content is invented.
- **WD-IDEA-SHOT-054** [impl] Split and merge accept optional user guidance (e.g. "split at the moment John stands up").
- **WD-IDEA-SHOT-055** [impl] Split uses "stretch" semantics: each new shot keeps the original's full duration rather than a fraction, so every resulting clip can use the generator's full time limit.
- **WD-IDEA-SHOT-056** [impl] Merge: two adjacent shots (with the next or the previous) become one continuous beat; dialogue, action, characters, setting, camera and continuity flags are combined without invention, and durations are summed.
- **WD-IDEA-SHOT-057** [voice,idea] Split and merge handle dialogue intelligently: on split each line goes to the shot where it belongs, on merge lines combine in order; the user can still edit.
- **WD-IDEA-SHOT-058** [impl] The merge dialog leads with a clear "Merge with: Next (preselected) | Previous" toggle at the top.
- **WD-IDEA-SHOT-059** [impl] Shots can be deleted; edits autosave after a short pause.
- **WD-IDEA-SHOT-060** [impl] The last shot in a scene can't be deleted; the warning instead offers to cancel or to defer/sideline the whole scene and return to the Script Hub (see 02).
- **WD-IDEA-SHOT-061** [idea] Optional tempo agent offers non-destructive pacing suggestions.
- **WD-IDEA-SHOT-062** [voice,idea] The shot list stage needs more care: a collapsible right sidebar or pull-up panel shows the exact script and beat-sheet passages relevant to the selected shot. ‹src: Issues›

## Validation, locking and invalidation

- **WD-IDEA-SHOT-063** [impl] Blocking errors at lock: empty shot list, duplicate shot IDs, missing action, setting or camera, duration under 1 s or over 30 s.
- **WD-IDEA-SHOT-064** [impl] Overridable warnings ("Lock Anyway" / proceed anyway): duration outside 4–12 s, unusually short or long total scene duration, character names missing from the scene's dependencies with "Did you mean?" typo suggestions, and missing location links.
- **WD-IDEA-SHOT-065** [impl] Locking validates locally then on the server; one dialog lists every issue with a "Fix Issues" path.

### Options: blast radius of editing a scene's shot list

Held with their owning topic in other documents: WD-IDEA-UX-063 (see 10), WD-IDEA-UX-065 (see 10).

## Directing style and creative shot design

- **WD-IDEA-SHOT-069** [voice,idea] Shot/"Auteur" style capsule, separate from the visual style capsule (color, medium): it sets how scenes are shot the way different directors would (number of shots, shot types, how shots follow each other, framing) and mainly affects shot list creation and frame/video prompts (see 06 for capsules). ‹src: 3.7-tasks-part-3›
- **WD-IDEA-SHOT-070** [voice,idea,future] Shot-planning complexity modes: a "shot director style" from super-dynamic coverage down to minimal single-wall shooting, e.g. a simple South Park-style 2D mode with minimal camera direction versus full cinematic coverage. ‹src: jump-a-gun-discrepancies, 3.7-location-pre-planning›
- **WD-IDEA-SHOT-071** [voice] AI suggests experimental shooting techniques for chosen moments, at a user-set frequency, drawing on a compiled memory of legendary shots from film and anime history, beyond basic CU/MS coverage. ‹src: new-tasks›
- **WD-IDEA-SHOT-072** [voice] More stylized shots and deliberately planned transitions such as match cuts. ‹src: new-tasks›
- **WD-IDEA-SHOT-073** [voice,future] "Film sampling": like hip-hop sampling or Tarantino's borrowing, the user supplies a clip from an existing film to emulate its editing, blocking, choreography, pacing or stylized sequence, re-expressed in their own story, setting and visual style (e.g. a car chase re-staged in a Pixar-style alien story in the Rocky Mountains). Related: WD-IDEA-ASSET-222 (film reference deconstruction for style) and WD-IDEA-FLOW-130 (film-sample intake item). ‹src: new-tasks›
- **WD-IDEA-SHOT-074** [voice,future] The sampled clip is a key reference for the scene's shot list, frame prompts/generation and/or video generation. ‹src: new-tasks›
- **WD-IDEA-SHOT-075** [voice,future] Sampling input: upload the actual video, or more conveniently just describe the clip in text. ‹src: new-tasks›

## Shots and locations

- **WD-IDEA-SHOT-076** [impl] Each shot links to a location asset: assign manually, clear, or let the system resolve automatically; missing links surface as warnings (see 06B).
- **WD-IDEA-SHOT-077** [impl] Every shot resolves to one of its location's camera directions ("wall"/view), which determines the background reference image for its frame: an explicitly assigned direction, otherwise the scored match, otherwise the primary direction (see WD-IDEA-LOC-152 and LOC-164).
- **WD-IDEA-SHOT-081** [impl] Metadata matching is preferred over AI matching for direction choice: deterministic, fast and free; AI adds cost and latency for marginal gain, and user override covers edge cases.
- **WD-IDEA-SHOT-082** [voice,idea] Between scenes and shots, a control for how many location views shots should use (many varied views vs only one or two), i.e. how creative extraction is with view assignment. ‹src: jump-a-gun-discrepancies›
- **WD-IDEA-SHOT-083** [voice,idea] Smart detection of in-scene location movement from the script, with shot extraction tuned to notice setting changes within a scene. ‹src: 3.7-location-pre-planning›
- **WD-IDEA-SHOT-084** [idea] Directions are AI-suggested but user-confirmable; the assignment persists per shot and is used at generation time. ‹src: 3.7-location-pre-planning›

### Options: characters moving between sub-locations within one scene
- **WD-IDEA-SHOT-085** [alt] Stage 7 assigns a sub-location and direction per shot (selected). ‹src: 3.7-location-pre-planning›

### Options: how much direction editing the shot list stage exposes
- **WD-IDEA-SHOT-088** [alt] Full direction editing in Stage 7 right after generation (the original spec): a modal or assignment table with overrides where users pick or verify each shot's wall, with thumbnails and coverage hints. ‹src: 3.7-location-pre-planning, jump-a-gun-discrepancies›
- **WD-IDEA-SHOT-090** [alt] Read-only direction label only.

## Shots and assets

- **WD-IDEA-SHOT-091** [impl] Each asset's presence in a shot has a type that decides frame references: "throughout" (start and end frame), "enters" (end frame only), "exits" (start frame only), "passes through" (video only, no frame reference).
- **WD-IDEA-SHOT-092** [idea] Shot-level asset relevance: attaching every scene asset to every shot's prompt is too blunt, and imported storyboards or blocking data must not attach every asset to every shot (see 06 for default assignment rules). Related: the relevance step in WD-IDEA-ASSET-154 and WD-IDEA-CONT-016. ‹src: streamlined-input-process-consolidated›
- **WD-IDEA-SHOT-093** [idea] If AI shot-asset assignment (including presence type) is poor, a user-facing correction UI in Stages 8 or 9; presence correctness is critical for continuity.

## Shots into frames and video

- **WD-IDEA-SHOT-095** [idea] Prompt segmentation produces a separate frame (still) prompt and video (motion) prompt per shot (see 08).
- **WD-IDEA-SHOT-096** [future, voice] "Extend Shot": lengthen a generated shot with the video provider's extend capability, with cost tracking; treated as a research spike before any build. Extension parameters: initial clips of 4, 6 or 8 s, each extension about 7 s, chained up to 20 times (about 148 s) while keeping visual consistency. Related: WD-IDEA-AV-040 (choose-the-best-take-first workflow). ‹src: Issues›
- **WD-IDEA-SHOT-097** [voice,future] Users submit a rough sketch to guide a shot's visuals. ‹src: Issues›
- **WD-IDEA-SHOT-098** [idea] Sketches and doodles are composition/blocking guides, never final identity or visual style unless explicitly tagged; they combine with text and asset references to generate real frames.

## Blocking references

A blocking reference is any rough image that fixes composition for a shot: a CineBlock capture, a storyboard frame, a sketch, a layout.

- **WD-IDEA-SHOT-099** [planned, future] Shots may carry an optional blocking/composition reference (previs capture, storyboard frame, sketch, rough layout, other guide) that controls camera framing, subject placement, rough pose, screen direction and visible/occluded relationships. Location references supply environment identity and material detail only, never angle, crop or staging (see WD-IDEA-SHOT-102); the composition rules are WD-IDEA-GEN-173.
- **WD-IDEA-SHOT-100** [planned] A blocking reference is never treated as character identity, prop identity, location appearance, texture, lighting or art direction unless explicitly marked so.
- **WD-IDEA-SHOT-101** [planned, voice] With a blocking reference, the prompt states that mannequins, primitives, sketch marks and placeholder backgrounds are layout guides only, to be replaced by the canonical character, prop and location assets. The prompt also asks the model to produce the frame as the user framed it.
- **WD-IDEA-SHOT-102** [planned, voice] Division of authority: the blocking still owns framing, camera angle and crop; location references supply environment identity and material detail only; character/prop references supply appearance only, not screen placement. A wide, high-angle location reference must not pull a tight shot (a bedroom corner seen from the bed) back toward the wide view. ‹src: voice-message-5-2›
- **WD-IDEA-SHOT-103** [planned] Blocking is enabled per shot or per scene and can include separate start and end blocking frames.
- **WD-IDEA-SHOT-104** [planned] Conflicts between blocking metadata and the shot's text, assigned assets or location state are surfaced at the prompt stage, before frame generation.
- **WD-IDEA-SHOT-105** [future] The core rollout reserves room for blocking references (composition, start and end roles) without building a specific previs tool, so later sketch/previs inputs need no new prompt or attachment path. The blocking roles (composition reference, blocking start and end frames) are reserved in the reference-role model but not built.
- **WD-IDEA-SHOT-106** [future] Full previs tooling. ‹src: 7-19-location-stabilization-master-plan›

## CineBlock: concept

CineBlock is the world-model previs idea: generate a rough 3D set from a few photos, block each shot with mannequins, capture start/end stills through a virtual camera, and hand those stills plus metadata to generation as composition references.

- **WD-IDEA-SHOT-107** [voice] Conceived as a crude shot-listing and blocking tool feeding AI video: block each shot in a rough 3D world, capture the still as the reference frame, then send still + text prompt + relevant asset images (characters, props, location) to the image/video model. ‹src: voice-message-5-2›
- **WD-IDEA-SHOT-108** [voice] The 3D world comes from a few reference images of the environment taken in different directions; it is sloppy (noise, artifacts, not photoreal) but gives a workable semblance of the scene's 3D space, which is enough (see 06B for world-generation inputs). ‹src: voice-message-5-2›
- **WD-IDEA-SHOT-109** [voice] Characters are only mannequins and props are basic primitives (cube, cone) that can be placed and moved; the real characters populate the frame at generation time. ‹src: voice-message-5-2›
- **WD-IDEA-SHOT-110** [voice] The user lists a scene's shots with per-shot info, then goes shot by shot inside the environment getting framing and blocking right for each shot's start and end frame. ‹src: voice-message-5-2›
- **WD-IDEA-SHOT-111** [voice] Key insight: current models given a rough layout doodle plus a prompt plus asset attachments can produce a precise frame; the CineBlock still replaces the hand-made doodle. The test case combined the rough layout and prompt with a person, a large prop and a background as attachments. ‹src: voice-message-5-2›
- **WD-IDEA-SHOT-112** [voice] Core bet: world generation takes about a minute and moving mannequins is easy, so an ~8-shot scene can be blocked in under a minute; if blocking stills reliably steer generation, the whole pipeline becomes viable. ‹src: voice-message-5-2›
- **WD-IDEA-SHOT-113** [planned] The world never needs to be photorealistic: rough spatial reference plus detailed asset descriptions should yield strong results. ‹src: prd-1, voice-message-5-2›
- **WD-IDEA-SHOT-114** [planned] Three-input division of labor at frame generation: the frame prompt (text), the asset visual states (appearance, wardrobe, condition), and the blocking capture (composition, camera angle, subject positions); the model matches the capture's arrangement while rendering characters as defined.
- **WD-IDEA-SHOT-115** [impl] Defined as a browser-based previs tool: generate a world, block with mannequins and primitive props, light it, frame and capture through a virtual camera, and export a shot package (start/end frames per shot plus structured shot metadata) designed to become the structured brief for AI generation in the main product.
- **WD-IDEA-SHOT-116** [planned] "Virtual Production Studio": a navigable 3D world built from the project's location assets lets the user physically block the film before committing to expensive generation; snapshots become spatial reference frames.
- **WD-IDEA-SHOT-117** [planned] Core loop: generate the world once, walk around, place mannequins, take screenshots, pick the best angle per shot, then generate frames with spatial context locked in.
- **WD-IDEA-SHOT-118** [planned] Output routing: captures go to frame generation as composition references, blocking camera metadata (distance, height, movement) fills the shot's camera fields, and asset placement informs shot-level asset assignment. This routing applies once the blocking tool is integrated; until then the camera fields are not filled from blocking.
- **WD-IDEA-SHOT-120** [planned] Angle Library per location: every capture is saved to the location's library, tagged with location, timestamp, optional label ("over-shoulder reverse") and the scene/shot selected at capture; viewable in the studio with labelling, deletion and shot assignments (see 06B for one world per location). ‹src: prd-1›
- **WD-IDEA-SHOT-121** [planned] A scene selector inside a location's studio lists every scene using that location and its shots; choosing a target shot auto-tags captures, and "unassigned" angles can be captured for later sorting. ‹src: prd-1›
- **WD-IDEA-SHOT-122** [idea] Open question: can unassigned angles be assigned later from frame generation, or only inside the studio? ‹src: prd-1›
- **WD-IDEA-SHOT-123** [planned] Integration phasing: location world, navigation, viewfinder and captures first; mannequins second; then the frame-generation reference picker. ‹src: prd-1›

### Options: CineBlock's relation to intake
- **WD-IDEA-SHOT-124** [future,alt] Importable shot package (JSON/PNG) routed through Streamline intake into the shot list and frames. Related: WD-IDEA-FLOW-130 (Post-MVP Streamline candidates). ‹src: streamline-master-plan-8-1, streamlined-input-process-consolidated›
- **WD-IDEA-SHOT-125** [alt] First-class product integrating with the shot list and frame stages independently, not lumped into general intake; Streamline re-import can come later. ‹src: streamlined-input-analysis-5-10, streamline-implementation-spec-8-3›

### Options: where the studio sits in the pipeline
- **WD-IDEA-SHOT-127** [planned,alt] A full-screen modal launched from frame generation for the selected shot, refreshing the scene's frames on close. ‹src: prd-revised›
- **WD-IDEA-SHOT-128** [alt] Unlock timing: after Stage 8 completes for a given scene, or globally after Stage 5 once assets are extracted. ‹src: prd-1›

### Options: how a capture enters frame generation
- **WD-IDEA-SHOT-129** [planned, alt] Optional "Reference Frame" picker on each shot's start/end frame choosing among studio angles; with none chosen generation is unchanged, otherwise the capture is passed as an image input beside the frame prompt. ‹src: prd-1›
- **WD-IDEA-SHOT-130** [planned, alt] The hero capture is uploaded directly as the shot's start/end frame (tagged as from blocking); alternates join the shot's reference images in a "style" role. ‹src: prd-revised›

### Options: integration architecture

Held with their owning topic in other documents: WD-IDEA-FLOW-109 (see 02), WD-IDEA-FLOW-110 (see 02), WD-IDEA-FLOW-111 (see 02).

## CineBlock: hackathon build and variants

The hackathon build was a three-view standalone app (Setup → Studio → Results). Several PRD drafts disagree on details; variants are kept below.

- **WD-IDEA-SHOT-134** [impl] Standalone, self-contained demo (no backend, auth or product integration) proving the concept end to end; targeted a filmmaking/entertainment/simulation track.
- **WD-IDEA-SHOT-136** [impl] Shot card: name/ID ("1A" or a slugline), action/description, camera type (Wide, Medium, Close-Up, OTS, POV, Two-Shot, Insert), and which assets are in the shot.
- **WD-IDEA-SHOT-137** [impl] Optional collapsible shot details: duration (1–30 s, default 8), camera distance (wide/medium/close), camera height (eye level, high, low, overhead, ground level), freeform movement ("slow dolly in", "static"). New shots default to Wide, 8 s.
- **WD-IDEA-SHOT-138** [future] Drag-to-reorder shots in Setup, order preserved in Studio and Results (otherwise creation order).
- **WD-IDEA-SHOT-139** [impl] Scene assets are a flat pool of characters and props (name, type, one-line description like "tall man, 30s, grey hoodie"), each auto-assigned a distinct color (changeable) so mannequins are identifiable; shots draw from this pool.

### Options: what optional shot metadata does
- **WD-IDEA-SHOT-140** [alt] Pure reference for the user while blocking; not processed by the tool. ‹src: prd-final-enough›
- **WD-IDEA-SHOT-141** [planned,alt] Camera type maps to default decomposed fields (Wide→wide; Medium/OTS/Two-Shot→medium; Close-Up/POV/Insert→close; height eye level), and any decomposed fields the user fills override the defaults; exported for generation. ‹src: prd-revised›

### Options: per-shot asset assignment
- **WD-IDEA-SHOT-142** [impl,alt] Per-shot asset checkboxes auto-populated from the pool: ticked = on-screen, unticked = off-screen, and off-screen mannequins are hidden by default when that shot is active.
- **WD-IDEA-SHOT-143** [alt] No per-shot assignment: one flat scene asset list for all shots. ‹src: prd-2-tight›

## CineBlock studio: camera and viewfinder

- **WD-IDEA-SHOT-144** [impl] Studio layout: 3D canvas on the left, ~280 px shot sidebar on the right, collapsible for full-canvas mode.
- **WD-IDEA-SHOT-145** [impl] Built camera: drag to orbit, scroll to dolly/zoom, smooth interpolation, plus keyboard fly controls (forward/back, strafe, up/down) at frame-rate-independent speed.
- **WD-IDEA-SHOT-146** [impl] An always-available "Reset Camera" returns to the default view.
- **WD-IDEA-SHOT-147** [impl] Dutch-angle roll control with one-key reset to level; the roll is recorded with each capture.
- **WD-IDEA-SHOT-148** [impl] Viewfinder overlay marks the camera frame: everything inside is captured; outside is dimmed with a dark vignette.
- **WD-IDEA-SHOT-149** [impl] Viewfinder aids: toggleable rule-of-thirds grid and cosmetic film-camera touches (lens badge "35MM f/1.8", REC indicator, AF label).
- **WD-IDEA-SHOT-150** [impl] Lens presets (35/50/85 mm) and the zoom readout are cosmetic labels only; they don't change the field of view.
- **WD-IDEA-SHOT-151** [impl] Floating bottom toolbar: prominent Capture, Start/End frame toggle, Reset Camera, settings (aspect ratio, grid), collapse sidebar, "Done → Results"; closing back to Setup confirms if captures exist.
- **WD-IDEA-SHOT-152** [impl] Keyboard shortcuts: Space captures, 1/2 switch Start/End, L lighting mode, T reset roll, Escape deselects, G/R/E translate/rotate/scale, arrows navigate the lightbox.
- **WD-IDEA-SHOT-153** [future] Progressive world loading: start low-density, upgrade on demand, show load progress for large worlds.
- **WD-IDEA-SHOT-154** [idea] Level-of-detail rendering (near areas full detail, distant areas coarser) keeps navigation smooth on weak devices. ‹src: webXR-devkit-Readme›
- **WD-IDEA-SHOT-155** [idea] Animated fly-in/fly-out when a world appears or is swapped. ‹src: webXR-devkit-Readme›

### Options: camera navigation
- **WD-IDEA-SHOT-156** [alt] Free first-person navigation (WASD + mouse look) as primary. ‹src: prd-1, prd-2-tight, prd-final-enough›
- **WD-IDEA-SHOT-157** [alt] Orbit around a point of interest by default, optional first-person toggle with smooth transition. ‹src: prd-revised›

### Options: viewfinder aspect ratio
- **WD-IDEA-SHOT-158** [alt] Taken from the project's output format (16:9, 2.39:1, 9:16…). ‹src: prd-1›
- **WD-IDEA-SHOT-159** [impl,alt] User-selectable in the toolbar (16:9, 2.39:1 anamorphic, 4:3, 9:16), letter/pillarboxed, ratio shown in the viewfinder.

## CineBlock studio: shots sidebar and asset visibility

- **WD-IDEA-SHOT-160** [impl] The sidebar lists shots in order with name and camera-type badge; clicking one makes it the active target for the next capture.
- **WD-IDEA-SHOT-161** [impl] Active-shot panel shows the action (read-only) and filled metadata (duration, height/distance, movement) in muted text as a reference while positioning.
- **WD-IDEA-SHOT-162** [impl] Asset visibility panel: every scene asset with color dot and eye toggle; switching shots resets visibility to that shot's on-screen set, with manual override within the shot.

### Options: off-screen assets
- **WD-IDEA-SHOT-163** [alt] Outside the viewfinder is a staging area where off-screen mannequins wait. ‹src: prd-1›
- **WD-IDEA-SHOT-164** [impl,alt] Off-screen assets are simply not rendered; a physical staging zone was explicitly ruled out. ‹src: prd-final-enough, prd-revised›

## CineBlock studio: mannequins and props

- **WD-IDEA-SHOT-165** [impl] Character stand-ins are color-coded humanoid mannequins with floating name labels; the goal is positional blocking, not visual fidelity.
- **WD-IDEA-SHOT-166** [impl] Mannequin placements are per shot: each shot keeps its own positions, rotations, scales and poses.
- **WD-IDEA-SHOT-167** [impl] Feet snap to the ground surface on placement (no floating or clipping); props land at the hit point.
- **WD-IDEA-SHOT-168** [impl] Selected mannequins get a translate/rotate/scale gizmo; click away or Escape deselects; dragging suspends camera orbit; remove via sidebar or right-click. Unplaced assets show "Place", placed ones show visibility toggle and "Remove".
- **WD-IDEA-SHOT-169** [impl] Occlusion toggle: mannequins hidden by world geometry or always drawn on top (useful when the rough world swallows them); mannequins are semi-transparent.
- **WD-IDEA-SHOT-170** [idea] Click-to-place relies on an invisible collision surface for the rough world; without it placement falls back to a point in front of the camera.
- **WD-IDEA-SHOT-171** [future] Physics/collision for mannequins (they stay where placed) and character animation are out of scope for the hackathon build.
- **WD-IDEA-SHOT-172** [future] Automatic mannequin placement suggestions are out of scope for the hackathon build; blocking stays fully manual for now. ‹src: prd-1›

### Options: mannequin fidelity
- **WD-IDEA-SHOT-173** [alt] Static T-pose placeholders, no posing. ‹src: prd-1›
- **WD-IDEA-SHOT-174** [impl,alt] Articulated mannequins: posable shoulders, elbows, hips, knees, plus height (default 1.7 m) and build, so blocking shows pose and relative size. ‹src: CineBlock-system-overview›

### Options: primitive set
- **WD-IDEA-SHOT-175** [alt] Typed primitives: human = capsule + sphere head sized to height; quadruped = low box + small box head; prop = box at real-world scale; vehicle = elongated box. ‹src: prd-1›
- **WD-IDEA-SHOT-176** [impl,alt] Props choose a shape (box, cylinder, sphere, cone, plane, capsule) with sensible default sizes, plus simple dog and cat silhouettes; all independently scalable. ‹src: CineBlock-system-overview›
- **WD-IDEA-SHOT-177** [alt] Minimal: character = capsule + sphere, prop = scaled box only.

### Options: placement
- **WD-IDEA-SHOT-178** [alt] "Place" drops the mannequin at world center. ‹src: prd-1, prd-2-tight, prd-final-enough›
- **WD-IDEA-SHOT-179** [impl,alt] "Place" enters a crosshair mode; the next click drops it on the surface hit; a miss places it a default distance in front of the camera.

### Options: mannequin color consistency scope
- **WD-IDEA-SHOT-180** [alt] Each character keeps one color across the whole project and across sessions. ‹src: prd-1, prd-2-tight›
- **WD-IDEA-SHOT-181** [alt] Colors are consistent only within one session. ‹src: prd-final-enough, prd-revised›

## CineBlock studio: lighting

- **WD-IDEA-SHOT-182** [impl] Two-layer lighting: global ambient and directional intensity sliders, plus per-shot placeable point and spot lights.
- **WD-IDEA-SHOT-183** [impl] Placed lights have color temperature in Kelvin (candle ~1800K, tungsten ~3200K, daylight ~5500K, overcast 7000K+), an artistic tint on top, intensity, falloff, and for spots cone angle and edge softness; placed by clicking the world and adjusted with a gizmo in a lighting mode.
- **WD-IDEA-SHOT-184** [impl] Lighting continuity: switching to a shot with no lights copies the previous shot's lights as its starting setup.
- **WD-IDEA-SHOT-185** [impl] Light helper visuals (spheres, cone wireframes, labels) are hidden during capture so they never appear in reference frames.
- **WD-IDEA-SHOT-186** [rejected] Earlier scope: no lighting controls, world lighting used as-is; replaced by the two-layer system.

## CineBlock studio: capture and results

- **WD-IDEA-SHOT-187** [impl] Capture flow: pick active shot, choose Start or End target, compose, press Capture/Space; the image is cropped exactly to the viewfinder and lands in that shot's tray under the frame type. No per-shot limit (expect 3–4 per frame type).
- **WD-IDEA-SHOT-188** [impl] Capture tray per active shot: Start and End rows with thumbnails and count badges, full-size view on click, "No captures yet" empty state.
- **WD-IDEA-SHOT-189** [impl] Hero selection: exactly one hero per shot per frame type (star toggle, gold border); the first capture is hero by default, the rest are alternates.
- **WD-IDEA-SHOT-190** [future] Camera position memory: each capture stores camera position/rotation so "Return to angle" animates back to it for reproducibility.
- **WD-IDEA-SHOT-191** [future] Capture annotation: a text note on any capture, shown in Results and exported.
- **WD-IDEA-SHOT-192** [impl] Captures live only in the browser session and are lost on refresh; export is the persistence mechanism.
- **WD-IDEA-SHOT-193** [idea] For real use, captures persist as taken (autosave/upload per capture).
- **WD-IDEA-SHOT-194** [impl] Results view: read-only shot cards in order with a camera line ("Eye Level · Static · 8s"), action text, and Start/End rows (hero first, alternates below), every image labelled with shot and frame type.
- **WD-IDEA-SHOT-195** [impl] Lightbox: click to enlarge, arrows move between a shot's captures, Escape or outside click closes.
- **WD-IDEA-SHOT-196** [impl] Navigation safety: Back to Studio preserves state; Start Over resets after confirmation; returning to Setup from Studio warns that captures will be lost.
- **WD-IDEA-SHOT-197** [impl] ZIP export: all captures as images in one folder per shot and frame type (named with shot name/camera type), hero numbered first.
- **WD-IDEA-SHOT-198** [impl] Human-readable JSON manifest: assets (name, type, description, color), shots (name, action, camera type/height/distance/movement, duration, assets), capture lists per frame type with hero frames, world id, generation settings.
- **WD-IDEA-SHOT-199** [impl] Pipeline-compatible JSON: a per-shot brief with index, action, decomposed camera (type, distance, height, movement), duration, assets in shot (characters vs props, foreground), hero start/end frames and alternates, and a blocking-capture reference entry.
- **WD-IDEA-SHOT-200** [future] "Quick Demo" path with pre-generated worlds that skips upload and generation wait.
- **WD-IDEA-SHOT-201** [future] Deferred for the blocking tool, including the integrated Virtual Production Studio vision: collaborative/multiplayer sessions, export to external 3D formats (FBX, GLB), and video generation inside the tool. The standalone hackathon demo also excluded multi-scene support (one scene per session). ‹src: prd-1, prd-2-tight, prd-final-enough, prd-revised›
- **WD-IDEA-SHOT-202** [future] VR/WebXR headset blocking (teleport/smooth locomotion, one/two-hand and distance grabbing, spatial UI panels, in-world authoring) was considered and dropped for the hackathon in favor of a normal browser app. ‹src: prd-revised, webXR-devkit-Readme›

### Options: export format
- **WD-IDEA-SHOT-203** [alt] User chooses between the tool's own JSON format and the pipeline format. ‹src: hackathon-task-list›
- **WD-IDEA-SHOT-204** [alt] One JSON file carrying both a human-readable section and a pipeline section. ‹src: CineBlock-system-overview›

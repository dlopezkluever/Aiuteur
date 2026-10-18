# 08 Generation & Prompting

> Scope: how prompts for frames and videos are assembled, how images, frames and videos are generated and regenerated, with which references, providers, quality controls and spend safeguards. Legacy product thinking, not a description of current behavior. Legend: see 00-README.

## Core model

Each shot is realized in two hops: an image model makes cheap, reviewable anchor frames, then an expensive video model bridges them. Prompts are split to match the hops.

- **WD-IDEA-GEN-001** [impl] Every shot gets purpose-built prompts: a frame prompt (sent to an image model for the start frame and, optionally, the end frame, each with its own prompt) and a video prompt (sent to the video model, which already has the frame(s) as its visual anchor). Stage 9 produces them; frame and video prompts follow different rules.
- **WD-IDEA-GEN-002** Three canonical prompt types that must never be merged: frame prompts (image only; visually verbose, asset-heavy, spatially explicit), video prompts (video only; action, dialogue, accents, timing, SFX, minimal visuals), and hidden system scaffold prompts (never editable; encode intent such as "this image is a video anchor frame" plus dependency rules). ‹src: project-overview, README›
- **WD-IDEA-GEN-003** [rejected] One monolithic prompt per shot mixing visuals, action and audio. Replaced by the frame + video pair because mixed prompts dilute action clarity, cause character drift and make lighting and composition inconsistent. ‹src: Frame_Video_Prompt_Format_Guide›
- **WD-IDEA-GEN-004** Governing rule: the frame prompt defines what the world LOOKS like; the video prompt defines what HAPPENS in it. If a detail is visible in a still, it goes in the frame prompt; if it only shows up when you press play, it goes in the video prompt.
- **WD-IDEA-GEN-005** [idea] Verbosity alignment: frame prompts as descriptive as possible, video prompts as lean as possible. Visual description in a video prompt is weight in the wrong place: it dilutes action adherence and tends to be ignored; stripping it also makes audio and dialogue direction clearer.
- **WD-IDEA-GEN-006** Because prompts are split, look and performance iterate independently: change the look without touching the action, or the action without regenerating the look.
- **WD-IDEA-GEN-007** Model economics: a cheap image model handles high-volume anchor frames; the expensive video model (with audio) is used only for final video and must accept two anchor frames plus a combined video/audio prompt (see 01, "the Inversion").
- **WD-IDEA-GEN-008** [voice] Video generation is image-to-video: a start frame, an optional end frame and a video prompt; the model generates the in-between frames, and the provider produces audio together with the picture.
- **WD-IDEA-GEN-009** "Ingredients to video" order: generate reference images first, then the start frame from the frame prompt plus references, then the video from the anchor frame plus a lean video prompt.
- **WD-IDEA-GEN-010** Distinct jobs: reference images give loose identity/style/object guidance across many shots; a start frame gives exact pixel-level truth for one shot; the video prompt deals only with motion and sound, never with references. Related: the video prompt as motion and sound only is WD-IDEA-GEN-187. ‹src: Frame_Video_Prompt_Format_Guide›
- **WD-IDEA-GEN-011** [idea] Video models that take a first frame cannot also take reference images, so the generated start frame is the sole environment anchor for video; frame quality and location matching directly determine video background quality.

## Prompt assembly

- **WD-IDEA-GEN-012** [impl] The system assembles and injects the right global or local context before every AI call; the user never pastes context (see 04 for global-to-local layering).
- **WD-IDEA-GEN-014** [planned] Frame and video prompts are structured and deterministic, built from a template rather than free-form paragraphs; the same inputs always give the same structure, and they draw on all Stage 1–8 work. Treated as the keystone that shot chaining and adaptive descriptions build on.
- **WD-IDEA-GEN-015** [planned] Assembly inputs: the scene's script excerpt (narrative context), master asset descriptions and images, the shot list (action, dialogue, camera, duration, characters, setting), scene asset instances (descriptions, status tags, scene images), style capsule directives, and transformation events for within-shot visual change.
- **WD-IDEA-GEN-016** Conceived: the prompt stage receives prompt-ready context: final asset references, shot-level asset relevance, storyboard/reference image notes, and frame- and video-prompt inputs. ‹src: streamlined-input-process-consolidated›
- **WD-IDEA-GEN-018** [idea] Open concern: avoid feeding too much irrelevant intake context into generation prompts. ‹src: streamlined-input-process-consolidated›

### Options: who writes the prompt
- **WD-IDEA-GEN-019** [alt] Deterministic template interpolation builds the prompt's structural scaffold; the LLM only fills creative gaps. ‹src: 3.8-phase3-structured-prompts-and-limits›
- **WD-IDEA-GEN-020** [alt, voice] A reasoning step interprets intent, because users phrase requests in many ways and deterministic rules cannot reliably turn unstructured input into structured output. ‹src: voice-message-5-2›

## Prompt engine: from rough intent to precise request

- **WD-IDEA-GEN-021** [idea] A prompt engine turns the user's rough, "sloppy" request into a precise, structured, token-efficient generation request; its goal is to elevate the intent with expert cinematic, stylistic and audio language, not merely translate it. ‹src: veo-3-prompt-guide›
- **WD-IDEA-GEN-022** The engine classifies each request: text-to-video (default), image-to-video (valid only if an image is actually supplied), or multi-shot sequence (detected from cues like "scene 1", "shot 2", "then cut to", numbered lists); multi-shot requests automatically get a define-once character/style structure.
- **WD-IDEA-GEN-023** Define once, reference many: a character, style or setting is defined a single time and referenced by name/alias in every shot, enforcing consistency across a sequence and saving tokens.
- **WD-IDEA-GEN-024** The engine extracts from free text: subject, action (including micro-expressions), context, style, cinematography, ambiance/lighting, audio (split into dialogue, soundscape, SFX, music) and negative directives ("no…", "without…").
- **WD-IDEA-GEN-025** Abstract emotions and vague requests become concrete physical and sensory cues, inferred from the shot's action and dialogue: "sad man" → slumped shoulders, downcast eyes, cool desaturated palette, diffuse overcast light; "grief" → slumped shoulders, red-rimmed eyes, a loosely held crumpled photograph; "a nice video of a watch" → product hero shot with studio lighting and an arc move; "fly through this building" → a specific camera path.
- **WD-IDEA-GEN-026** When the user omits a component (e.g. camera angle), the AI applies a sensible neutral default and records the assumption visibly; no AI assumption is silently inserted.
- **WD-IDEA-GEN-027** Factual grounding: the engine never invents model parameters or capabilities; it works only from a maintained reference of documented capabilities and limits, kept current as models change.
- **WD-IDEA-GEN-028** Ask vs act: a fatally ambiguous, too-vague or impossible request (unsupported ratio or duration, image-to-video without an image) gets a helpful reply asking for subject/action/context detail or offering a workaround (generate 16:9 for later cropping; split into several shots).
- **WD-IDEA-GEN-029** Where seed and guidance controls aren't exposed, a request for "more control" ("make it more realistic") is met by more precise cinematic and lighting language, not parameter tuning.
- **WD-IDEA-GEN-030** Two engine modes: interactive/debug, where the generated prompt carries comments explaining reasoning and assumptions, and production, which strips comments to save tokens; each transformation can show its reasoning beside the result.
- **WD-IDEA-GEN-031** Plain, concrete language: replace poetic metaphor with visual specifics; prefer one precise technical term (e.g. "chiaroscuro") over a long paraphrase.

## Frame prompts

- **WD-IDEA-GEN-032** [impl] A frame prompt describes a frozen photograph: no action verbs, movement, dialogue or sound; one dense paragraph.
- **WD-IDEA-GEN-033** Frame-prompt-only content: character appearance, environment/set design, props, spatial relationships, camera position/framing/angle/lens, lighting setup, color palette, film style, depth of field/bokeh, weather and atmospheric visuals.
- **WD-IDEA-GEN-036** Conceived: frame prompts are broken into labeled components (camera, spatial layout, character descriptions, setting, style cues) and list the frames and assets they reference for continuity.

### Options: frame prompt order
- **WD-IDEA-GEN-037** [alt, impl] Five-part formula: (1) camera position and framing — shot type, angle, lens/depth of field, no movement; (2) subject appearance; (3) placement in frame and static pose, eye-line, weight; (4) environment and props with depth layers, atmosphere, time of day; (5) lighting, palette, contrast, film stock, mood.
- **WD-IDEA-GEN-038** [alt] Camera spec first, then spatial layout of characters and setting, then asset descriptions verbatim, then action only where it matters to a still frame, then style capsule cues. ‹src: AI-agent-registry-context-flow-architecture›

- **WD-IDEA-GEN-040** [planned] Subject appearance comes from each asset's scene-specific effective description (not just the master), with status tags as visual condition modifiers; conditions such as damage or dirt are described in detail (see 04).
- **WD-IDEA-GEN-041** [impl] When a character has an attached reference image, the frame prompt describes them with extra precision and ties them to the image by a short trait summary ("the red-haired woman"); prompt text never contains image-slot labels like "Image #1".
- **WD-IDEA-GEN-042** [planned, voice] Body language for every visible character: posture, hand position/gesture, a specific facial expression ("jaw clenched, brow furrowed", not "angry"), gaze direction and physical state markers (sweating, trembling). The same rule governs shot action descriptions written upstream.
- **WD-IDEA-GEN-043** [planned, voice] Positioning and choreography: where characters and props sit relative to each other (thirds, depth planes, scale, interaction geometry), not just their presence; multi-character shots need explicit blocking ("A stands frame-left facing right, B sits frame-center looking up at A"). Blocking detail also covers body orientation to camera, hands, head tilt, weight and eyeline.
- **WD-IDEA-GEN-045** [voice] The model must infer what a framing implies (an over-the-shoulder shows only the foreground character's back, never his face; the other character faces forward); where it can't, the system states those implications explicitly in the prompt. ‹src: voice-message-5-2›
- **WD-IDEA-GEN-046** A frame prompt describes the complete lighting state (key light direction, hardness, color temperature; fill; rim/back; visible practicals; ambient base) and style (palette, contrast, film stock, aesthetic, grade).
- **WD-IDEA-GEN-047** Lighting vocabulary maps to mood: three-point (clean), high-key (upbeat), low-key (mystery/drama), Rembrandt, chiaroscuro (noir), golden hour (romantic/nostalgic), blue hour (serene/melancholic).
- **WD-IDEA-GEN-048** Lighting continuity: standardize 2–3 lighting/color descriptors across all frame prompts in a sequence so lighting doesn't shift between clips.
- **WD-IDEA-GEN-049** [planned] Style capsule directives (design pillars, descriptor strings, negative constraints) supply the lighting/color/style part, and master image descriptions are referenced when available (see 06 for capsules).
- **WD-IDEA-GEN-050** For non-photoreal styles (felt, yarn, stop-motion, claymation, anime), material and style words saturate subject, environment, motion quality and even soundscape.
- **WD-IDEA-GEN-051** Diegetic on-screen text (e.g. a phone screen in the scene) can be specified as part of the composition, distinct from unwanted subtitle overlays.
- **WD-IDEA-GEN-052** Frame prompt checklist: appearance fully described; camera/angle/lens specified; spatial layout explicit; environment detailed; lighting and palette defined; no action, dialogue or sound; character block identical across shots; aspect ratio matches the platform; reference images prepared.

## End frames

- **WD-IDEA-GEN-055** [impl] End frames have their own prompts, generated and regenerated separately; the end frame can be reviewed and edited, and both frames go to video generation.

## Video prompts

- **WD-IDEA-GEN-058** [impl] The video prompt assumes the anchor frame(s) already carry all visual truth: it never describes appearance, environment, lighting, color or film aesthetic, only what happens when you press play, and stays lean (at most ~500 characters). The original spec is softer: video prompts prioritize motion, dialogue, performance and sound, and avoid restating visual attributes unless required for action clarity, an exception to the rule above.
- **WD-IDEA-GEN-059** Video-prompt-only content: action/movement, dialogue and voice performance, camera movement, sound effects, ambient audio, behavior and emotional performance, timing/pacing, interactions between subjects.

### Options: video prompt structure
- **WD-IDEA-GEN-060** [alt, impl] Four parts: (1) camera movement only, "Static camera" when none; (2) action and performance as verbs, one major action per shot; (3) exact dialogue in quotes with speaker and voice direction; (4) sound design. Nothing else. ‹src: system-prompts-inventory, Frame_Video_Prompt_Format_Guide, 3.8-phase3-structured-prompts-and-limits›
- **WD-IDEA-GEN-061** [alt] Opens with an "Audio:" section (dialogue plus SFX), then movement dynamics (how characters move, not how they look), then timing cues ("pause for 2 seconds"). ‹src: AI-agent-registry-context-flow-architecture›
- **WD-IDEA-GEN-062** [alt] Two parts: a visual section (camera, character, action, plus style injection) and an audio section ("Audio: [SFX]. Character [Name] speaks: '[line]'"). ‹src: project-overview›

- **WD-IDEA-GEN-063** Exception: a short visual detail is allowed only to identify which subject or object the action applies to ("the red folder" when several folders are visible). Test: if removing it would not make the action ambiguous, remove it.
- **WD-IDEA-GEN-064** Self-test: a video prompt should read like a silent-movie stage direction plus audio cues.
- **WD-IDEA-GEN-065** Action is written as verbs and behaviors, never appearances; camera movement and subject action are described together so their relative timing is clear ("dolly in as she leans forward and whispers").
- **WD-IDEA-GEN-067** [idea] For audio-driven projects (e.g. podcast-to-video), video prompts put audio synchronization first, carry timing cues and treat visuals as secondary to the audio narrative. ‹src: golden-test-evaluation-framework›
- **WD-IDEA-GEN-068** [voice] Video prompts must amply describe facial expression, blocking, or at least framing. ‹src: new-tasks›
- **WD-IDEA-GEN-069** When animating a supplied image, the prompt focuses on the desired motion and tells the model to maintain the image's appearance, style and lighting. ‹src: veo-3-prompt-guide›
- **WD-IDEA-GEN-070** Each video prompt is tagged with the video models it is compatible with and an estimated length.
- **WD-IDEA-GEN-071** Video prompt checklist: one clear primary action; movement or "static" stated; dialogue quoted with speaker, accent, tone, delivery; SFX for key sounds; ambient audio defined; duration fits complexity; no appearance/environment/lighting/color text; negative prompt prepared.

## Model-specific technique

- **WD-IDEA-GEN-072** Structured per-shot prompt fields: subject, action, context, style; cinematography (shot type, angle, movement, lighting); audio (dialogue, soundscape, SFX, music); config (negative prompt, aspect ratio, duration, resolution, audio on/off, person-generation safety level); optional reference image for image-to-video. ‹src: veo-3-prompt-guide›
- **WD-IDEA-GEN-073** Negative prompts list unwanted elements descriptively ("wall, frame"), not as instructions ("no walls"). Standard quality negatives: subtitles, captions, watermark, text overlays, logo, blur, low resolution, artifacts, distorted hands, compression noise, camera shake.
- **WD-IDEA-GEN-074** [idea] Automatically add a "no subtitles" negative to any generation containing dialogue, because video models hallucinate burned-in subtitles when dialogue is present. ‹src: veo-3-prompt-guide›
- **WD-IDEA-GEN-075** [idea] Audio generation can be switched on or off per request. ‹src: veo-3-prompt-guide›
- **WD-IDEA-GEN-076** A person-generation safety setting (disallow, adults only, all), which differs between image-to-video and text-to-video and by region.
- **WD-IDEA-GEN-077** When the model can't natively output a deliverable ratio (9:16, 1:1), generate in a supported ratio with a centered composition planned for cropping, and flag the crop requirement.
- **WD-IDEA-GEN-078** Looping clips: describe identical start and end states and continuous cyclical motion so the clip edits into a seamless loop.
- **WD-IDEA-GEN-079** Slow motion comes from temporal keywords ("high-speed camera", "1000 fps effect") and granular physics description, including time-stretched audio.
- **WD-IDEA-GEN-080** Over-constrained prompts that keep producing the same artifacts: reduce adjectives in the frame prompt or change the seed; seeds also give reproducibility where the model exposes them.
- **WD-IDEA-GEN-081** Reproducibility limit: without a seed, regenerating from the same prompt won't give an identical result; consistency comes from specific, unambiguous prompts, and users should expect variance on regeneration.
- **WD-IDEA-GEN-082** Known model weaknesses to plan around: multi-action fragmentation, identity drift without frame anchors or references, unreliable hands in complex scenes, imperfect lip-sync, native audio unfit for precise work.
- **WD-IDEA-GEN-083** Troubleshooting map (symptom → cause → fix): smeared motion → too many actions (simplify, shorten); identity drift → inconsistent character blocks (copy identical blocks, use refs); lighting shifts → differing lighting text (standardize); camera mismatch → vague terms (be exact); visual details ignored → too much visual text in the video prompt (strip it).

## Prompt length and validation

- **WD-IDEA-GEN-084** [impl] Frame and video prompts have separate length thresholds, each with a warning and an error level (legacy-implemented: frame paragraph near 1,200 characters, video near 500). The planned direction is warn-only with the limit raised (WD-IDEA-GEN-091).
- **WD-IDEA-GEN-085** Validation before sending: length checks, forbidden-character checks, a preview, and schema validation of allowed values (aspect ratio, resolution, model) plus a dialogue-format check.
- **WD-IDEA-GEN-086** The system warns, without blocking, when prompt verbosity doesn't suit the target model; a sanity checker flags prompt/model mismatches.
- **WD-IDEA-GEN-087** [impl] Video provider compatibility is filtered by prompt length (a provider offered only for short-enough prompts), so changing length limits means revisiting which providers a prompt fits.
- **WD-IDEA-GEN-088** [idea] Unresolved: whether longer prompts actually degrade image quality with current providers; test empirically before committing to higher limits.

### Options: prompt length handling
- **WD-IDEA-GEN-089** [rejected] Hard cap that silently truncates prompts mid-sentence. Replaced by warn-only thresholds.
- **WD-IDEA-GEN-090** [alt, voice] Remove the length limit entirely.
- **WD-IDEA-GEN-091** [alt, voice, planned] Raise the limit and keep thresholds only as non-blocking amber warnings ("Prompt exceeds recommended length (X/1200 chars) — longer prompts may reduce generation quality"); prompts go through in full and the user decides whether to shorten. The creator's pick.

### Options: redundancy when a reference image is attached
- **WD-IDEA-GEN-092** [alt] Trim an asset's prompt description to scene-specific differences ("torn, soaking wet") plus spatial info, dropping what the attached image already shows (the blue dress). ‹src: 3.7-phase-4-frame-prompt-quality›
- **WD-IDEA-GEN-093** [alt] Raise length limits and accept the redundancy.
- **WD-IDEA-GEN-094** [future, voice] Dynamic trimming: detect visual details already conveyed by attached references and remove them from the text automatically for leaner, context-aware prompts.

## Shot chaining and prompt staleness

- **WD-IDEA-GEN-097** [planned] Chaining amplifies whatever prompt quality exists, so frame prompt quality is improved first.
- **WD-IDEA-GEN-098** [planned] When a shot's start frame is regenerated, edited, approved or swapped, its video prompt is flagged "Frame has changed since this prompt was generated". Per-shot "Update prompt for new frame" and bulk "Update all stale prompts" regenerate it from the new frame's content, showing a diff to accept, reject or edit; the user may keep the original.

## Stage 9: prompt review and editing

- **WD-IDEA-GEN-100** Conceived: Stage 9 labels clearly which prompt drives the image, which drives the video, and which logic is system-owned and non-editable, to prevent wrong edits.
- **WD-IDEA-GEN-101** Conceived: frame prompts are read-only by default with an optional manual-edit toggle; video prompts are always editable. ‹src: project-overview›
- **WD-IDEA-GEN-102** [impl] Prompts can be generated for all shots, regenerated for all, or regenerated for one shot; partial failures report how many succeeded and failed.
- **WD-IDEA-GEN-103** [impl] Frame prompt correction: the user writes a targeted correction and the AI applies it surgically, leaving the rest of the prompt identical.
- **WD-IDEA-GEN-104** Conceived: per-shot model compatibility tags show whether a shot needs a start frame only or start and end frames, and which video models fit.
- **WD-IDEA-GEN-107** [voice] A frame tool with all of the shot's assets beside the prompt so the user can "just roll": e.g. a Mexican standoff composed from two pre-generated characters (one facing left, one right, ten feet apart, each with a distinct gun) plus background and gun assets. ‹src: new-tasks›
- **WD-IDEA-GEN-108** [planned] Per-shot reference image upload (drag and drop, several per shot, each captioned, storyboard sheets supported) passed to frame and video generation as added context.
- **WD-IDEA-GEN-109** [impl] No dedicated AI instructions exist for Stage 1, Stage 6 or Stages 10–12; they reuse earlier AI services or simpler prompts. ‹src: system-prompts-inventory›
- **WD-IDEA-GEN-110** [future, voice] A "Custom System Prompts" sidebar tab to view and change the system prompts behind generated content; the creator thinks it probably unneeded. ‹src: truly strech›

### Options: how much reference structure Stage 9 shows

Held with their owning topic in other documents: WD-IDEA-LOC-175 (see 06B), WD-IDEA-LOC-176 (see 06B), WD-IDEA-LOC-177 (see 06B).

## Reference images: roles, priority, budget

- **WD-IDEA-GEN-114** [voice] Asset images must actually be fed into frame generation, or there is no point to them; continuity between shots comes from using asset images for later frames. The creator observed frames that looked nothing like the scene-instance images, "generic slop" with no master influence. ‹src: new-tasks, 3.8-phase1-asset-inheritance-fix›
- **WD-IDEA-GEN-115** [voice, impl] The reference sent for a character is its scene-specific instance image (e.g. the gnome variant), not the original master; Stage 8 scene images flow through to Stage 10 so frames resemble the instances.
- **WD-IDEA-GEN-119** [planned, impl] Every attached reference has an explicit semantic role plus a human-readable reason and source. Roles: location direction main, location establishing context, location fallback, continuity base frame, blocking composition, blocking start frame, blocking end frame, character identity, prop identity, style reference. Related: the reference stack panel and per-shot card layout are WD-IDEA-LOC-201.
- **WD-IDEA-GEN-122** Research finding: 2–3 reference images is the sweet spot; quality degrades beyond 3–4.
- **WD-IDEA-GEN-124** [voice] Observed failure, information overload: given many asset and reference images, the model tries to satisfy every input instead of discarding irrelevant ones (an OTS of SpongeBob grabbing Squidward's shirt came out as a generic medium shot, both facing camera, oversized register, whole restaurant visible). ‹src: voice-message-5-2›
- **WD-IDEA-GEN-125** [voice] Generation must prioritize inputs intelligently, discard reference information not valuable for the specific shot, balance competing inputs and "make the logical jumps" rather than reproducing each reference literally. ‹src: voice-message-5-2›
- **WD-IDEA-GEN-127** [planned] Reference-image failures are surfaced ("X of Y asset references failed to load — frames may not reflect your assets") instead of silently generating text-only.
- **WD-IDEA-GEN-128** [planned] Warn about the silent mismatch where prompt text mentions an asset but no image accompanies it (a scene asset with a description but no image).
- **WD-IDEA-GEN-130** [planned] Output is checked against references for every asset type: characters look like their master/instance, location settings match, key props are visible.

### Options: location references per frame

Held with their owning topic in other documents: WD-IDEA-LOC-178 (see 06B), WD-IDEA-LOC-179 (see 06B), WD-IDEA-LOC-180 (see 06B).

## Generation package and preview parity

- **WD-IDEA-GEN-136** [impl] Parity contract: the references Stage 9 previews are exactly those Stage 10 sends, in the same order with the same roles, including a selected continuity base in first position; treated as mandatory. Related: the generation-side rule behind the Stage 10 check in WD-IDEA-UX-239, which warns when the reference package differs from the Stage 9 preview.
- **WD-IDEA-GEN-137** [planned] Risk: the UI showing one background while generation sends a different image destroys user trust immediately.
- **WD-IDEA-GEN-138** [planned] Regenerating a frame reuses the same package unless the user explicitly overrides references; manual overrides keep their roles and stay intentional and visible.
- **WD-IDEA-GEN-139** [impl] The reference set and roles chosen at prompt-generation time are stored per shot and reused at frame generation.

## Location references at frame time

- **WD-IDEA-GEN-142** [impl] Delta descriptions: when the reference angle or distance differs from the shot, the prompt says how the needed view differs and asks the model to keep the same space but reframe ("reference is eye-level kitchen; shoot from above"). The delta keeps palette, architecture and layout; camera-angle details are always described in the prompt, even when the reference matches. An imperfect match is also flagged in the coverage advisory (WD-IDEA-LOC-203).
- **WD-IDEA-GEN-150** [impl] Graceful degradation: when no view matches the shot's angle, use the closest direction, state the delta explicitly ("reference shows the kitchen at eye level; frame this from a HIGH ANGLE looking down; keep palette, architecture, layout"), and flag it in the coverage advisory so the user can create the missing view before spending credits.

## Continuity generation modes

- **WD-IDEA-GEN-154** [impl] Start-frame continuity modes: match (copies the prior frame's pixels), camera change (recomposes the prior frame for a new camera using continuity references), reuse/edit from a selected base, and fresh (see 04). Related: the match, camera change and none classification with AI recommendation and user override is WD-IDEA-CONT-139; reuse or edit from a base is WD-IDEA-CONT-199 and WD-IDEA-CONT-203; the per-shot mode badge is WD-IDEA-UX-222.
- **WD-IDEA-GEN-157** [impl] If the base shares the shot's direction, its framing is preserved exactly; if not, framing adapts while location identity and lighting are kept.
- **WD-IDEA-GEN-160** [voice] Drag-and-drop frame reuse: drag a previously generated frame from any shot, earlier or later, in this or another scene, into the frame being worked on as a background/composition base, even if that asset was never designated in Stages 7–9; used as-is (expected rare) or, mostly, as a starting point. ‹src: post-clean-location-rethink, ._1-scratchpad›
- **WD-IDEA-GEN-161** [voice] From a pulled-in frame, the target is reached by prompt-editing that image (character now holds the object, now standing, new character added, blood on the wall, room on fire), swapping assets, rather than generating from blank; only the delta changes. ‹src: post-clean-location-rethink›
- **WD-IDEA-GEN-162** [voice, planned] Frame panels get an "edit image" action and a regenerate-from-prompt that can use the selected image; the full frame prompt remains the key generation prompt, unlike edit image's short "change it like this" instruction. ‹src: ._1-scratchpad›
- **WD-IDEA-GEN-164** Cost rationale for analyzing the reference before a camera change: one vision call (~$0.01–0.03, ~2–3 s) against 10–30 s+ for the frame itself, so users won't notice.

### Options: when to analyze the reference frame

- **WD-IDEA-GEN-168** [future] Region inpainting: select a region of a frame (e.g. a face) and give a local instruction ("change expression from surprise to neutral") to fix a continuity break without regenerating the whole frame. One plan deferred it to the final nice-to-have phase. Related: WD-IDEA-GEN-195 lists a mask-plus-prompt inpaint as a current frame action; this entry is the deferred region-editing plan, with region selection tools in WD-IDEA-GEN-169.
- **WD-IDEA-GEN-169** [future] Inpainting region tools: brush, rectangle and ellipse for quick selection, lasso plus brush for fine work (a "character's face" workflow), and a tool picker.
- **WD-IDEA-GEN-170** [future] Continuity drift detector: after frames are approved, an AI compares consecutive frames for character appearance (clothing, hair, face), setting elements (furniture, lighting, background) and props (presence, position).

## Blocking and composition references

- **WD-IDEA-GEN-173** Blocking references control camera framing, subject placement, pose, screen direction and visible/occluded relationships, but never override character identity, prop identity, lighting, texture, final location appearance or art direction unless explicitly marked.
- **WD-IDEA-GEN-174** [voice] Composition authority: the blocking still defines framing, angle and crop; the location image only informs the background's look and content. A wide, high-angle location reference must not pull a tight, intimate shot back toward the wide view. ‹src: voice-message-5-2›
- **WD-IDEA-GEN-176** Conceived: the frame stage accepts visual anchors: uploaded storyboard frames, user-made stills, blocking captures, rough sketches, and prior approved frames to reuse and edit. Sketch anchors are the frame-stage side of WD-IDEA-SHOT-097 and WD-IDEA-SHOT-098.
- **WD-IDEA-GEN-179** [voice] Models may have improved enough to use blocking references correctly; re-test the core bet against current models.

### Options: how a blocking capture enters frame generation

- **WD-IDEA-GEN-182** [planned] 3D world generation for blocking is lazy: it runs on first entering the studio for a location, never pre-emptively, to avoid spending on locations never blocked. Related: the film-studio model in WD-IDEA-LOC-255.
- **WD-IDEA-GEN-183** [impl] World generation offers a quality/cost choice: fast cheap model (~30–45 s, ~$0.15) vs high quality (~5–10 min, ~$1.50); density presets (quick preview / balanced / full); optional seed for reproducible worlds.
- **WD-IDEA-GEN-184** [idea] Iterate with the cheap world model, use the high-quality one only for hero/demo worlds, and reuse generated worlds rather than regenerating.

## Stage 10: frame generation workflow

- **WD-IDEA-GEN-186** Conceived: the start-only path is first-class: end frames are skipped and hidden in the frame UI, frame dependencies adapt, and costs exclude them. Related: the generation side of WD-IDEA-SHOT-029 and WD-IDEA-FLOW-057; the end-frame reference rules in WD-IDEA-CONT-115 and WD-IDEA-CONT-116 do not apply in this mode.
- **WD-IDEA-GEN-187** The video prompt works in either mode; with start + end frames it describes only the movement, action and audio between them (e.g. a 180° arc from in front of a singer to behind her, looking at the crowd).
- **WD-IDEA-GEN-188** [impl] Generation scope: all needed frames at once, one shot's frames, start frames only, or end frames.
- **WD-IDEA-GEN-189** Frame generation starts with an explicit mode choice: Quick Mode [future] (bulk-generate all frames in a grid with progress and bulk review; faster, higher risk of wasted credits) or Control Mode (sequential; a start frame must be approved before its end frame; approve-before-advance).
- **WD-IDEA-GEN-190** Control Mode is the default recommendation for cost-sensitive users; the chosen mode feeds frame dependencies and cost estimates.
- **WD-IDEA-GEN-191** Conceived: a frame dependency manager enforces correct frame chaining.
- **WD-IDEA-GEN-192** Frames are reviewed and approved shot by shot; frame regeneration guidance is optional and a plain re-roll stays available.
- **WD-IDEA-GEN-193** [impl] Three ways to regenerate a start or end frame: plain re-roll, regenerate with a text correction, or regenerate from a manually edited prompt.
- **WD-IDEA-GEN-194** [impl] Users can upload their own image as a start or end frame instead of generating.
- **WD-IDEA-GEN-195** [impl] Frame actions: approve, compare frames side by side, inpaint a region with a mask plus a prompt; frame and video prompt text remain editable here.
- **WD-IDEA-GEN-196** Conceived: frames and videos are approved separately per shot; each frame tracks how many times it was regenerated.
- **WD-IDEA-GEN-198** [impl] The frame panel includes a warning dialog with a "Don't show again" option.
- **WD-IDEA-GEN-199** Expected frame quality: start and end frames keep characters and setting consistent; in action shots positions change realistically and props show state changes; continuity holds across shot and scene boundaries; complex camera angles are faithful.
- **WD-IDEA-GEN-200** For audio-driven projects, frames show hosts in natural speaking positions and visual aids at the right timestamps.

## "Use as reference" on regeneration

- **WD-IDEA-GEN-201** [impl, voice] When an image is regenerated, a "Use as reference" toggle sends the current image as a style and composition reference so the result stays close to what the user has; off means a fresh generation from the description only. Related: the toggle's UI treatment is WD-IDEA-UX-281; the default question is settled differently in WD-IDEA-UX-296 and WD-IDEA-GEN-207.
- **WD-IDEA-GEN-202** [impl, voice] The toggle appears only when an image already exists in that component (regeneration, never first generation).
- **WD-IDEA-GEN-203** [impl, voice] Available at four regeneration points: the asset image upload review (Stages 5/8), Stage 8 scene-asset image, Stage 8 transformation post-image, and Stage 10 start/end frames; extending it to frames (regenerate from a previously uploaded image) and other fitting places was the creator's ask.
- **WD-IDEA-GEN-204** [impl] In Stage 10 the toggle applies to all three regeneration modes (re-roll, text correction, edited prompt).
- **WD-IDEA-GEN-205** [impl] The user-supplied current image is treated as a style/composition guide, separate from the identity references for characters and props, and gets the highest priority among images sent.
- **WD-IDEA-GEN-206** [impl] Transformation post-image generation already uses a default reference image; turning the toggle on replaces it with the current post-image.

### Options: reference toggle default
- **WD-IDEA-GEN-207** [alt, impl, voice] ON in the upload review modal, OFF everywhere else (Stage 8 scene asset, Stage 8 transformation, Stage 10 frames).
- **WD-IDEA-GEN-208** [alt] One consistent default everywhere, recommended ON since the user presumably likes the current image.

- **WD-IDEA-GEN-209** [future] A session-wide toggle at the top of frame generation, "Use existing frames as reference for regenerations", setting the default for every regeneration.

## Asset and location image generation

- **WD-IDEA-GEN-210** [idea] Edit Image is image-to-image with text guidance; its quality depends on provider support for reference plus instructions, so verify before committing to the UX (see 06 for the image actions).
- **WD-IDEA-GEN-211** [future] If automatic white background produces artifacts for some asset types, make it user-toggleable.
- **WD-IDEA-GEN-212** [future, voice] Dedicated AI background removal (segmentation, possibly in-browser) replacing generation-based removal: pixel-perfect, preserves the original, costs no credits, takes seconds instead of 30–60 s, cannot reinterpret the subject; alpha converted to white when needed.
- **WD-IDEA-GEN-213** [future] Build the dedicated remover after users validate generation-based removal, or sooner if they report quality problems.
- **WD-IDEA-GEN-214** [impl] Bulk generation for selected scene assets shows a cost confirmation, then progress; partial failures are reported and failed items can be regenerated one by one.

### Options: batch generation of missing location views

Held with their owning topic in other documents: WD-IDEA-LOC-122 (see 06B), WD-IDEA-LOC-119 (see 06B).

## Video generation and rendering

- **WD-IDEA-GEN-224** "Confirm & Render" queues video generation. After it, queued jobs are not edited in place; later changes go back through the shot list or frames and invalidate the affected work.
- **WD-IDEA-GEN-225** A shot can have several video attempts, kept as versions.
- **WD-IDEA-GEN-226** Conceived: video renders show status (queued, rendering, complete, failed) and an error message on failure.
- **WD-IDEA-GEN-227** Conceived: long renders tolerate completion delays of 30–45 minutes; only final outcomes (succeeded, failed, cancelled, timeout) are acted on, not partial progress.
- **WD-IDEA-GEN-228** Each provider has a timeout window (e.g. ~20 min, ~45 min for video, ~2 min for audio); a render that misses it is marked timed out and treated as failed.
- **WD-IDEA-GEN-229** Conceived: when a render completes or fails, one normalized event triggers the next pipeline step and notifies the user. Related: completion notification is WD-IDEA-UX-354 and the toast and email in WD-IDEA-AV-052.
- **WD-IDEA-GEN-230** [idea] Audio renders (e.g. synthesized voice) are render jobs like video, with "audio" as the output type, and follow the same completion contract. ‹src: API-integration-async-contract›
- **WD-IDEA-GEN-231** [future] Push-style completion reporting instead of the client polling.
- **WD-IDEA-GEN-232** [future] Background handling for long generations: status, retry, cancellation, prioritization, batching. Related: the generation side of the background rendering item WD-IDEA-AV-052.
- **WD-IDEA-GEN-233** Latency targets: text iterations under 5 s, frame pairs under 15 s, video in the background with notifications.
- **WD-IDEA-GEN-234** [impl] The UI enforces each provider's limits (e.g. shot duration only 4, 6 or 8 seconds for one provider; other values fail).
- **WD-IDEA-GEN-236** [future] Object-level video editing: add or remove an object in a generated video (the available tool loses audio when doing so).
- **WD-IDEA-GEN-237** Draft vs final quality tiers: iterate at lower resolution (720p), render finals at 1080p.
- **WD-IDEA-GEN-238** Model tier choice: a faster, cheaper video model vs the standard one (fast for casual/social output).
- **WD-IDEA-GEN-239** [future] Scene preview: fast low-res animatic-style previews with quick frame interpolation, later upgraded to the final render.

## Generation jobs and reliability

- **WD-IDEA-GEN-240** [impl] Image generation runs as tracked async jobs of several kinds: master asset images, scene asset images, start frames, end frames, and inpainting.
- **WD-IDEA-GEN-241** [impl] A job moves through queued, processing, generating, uploading, then completed or failed; a failure records the step where it happened.
- **WD-IDEA-GEN-242** [impl] Automatic retries (default max 3) are counted separately from user-initiated retries; errors are classified as temporary, permanent, rate limit or authorization.
- **WD-IDEA-GEN-243** [impl] Generation requests are idempotent: a double click or duplicate submission never creates or charges a second job.
- **WD-IDEA-GEN-244** When a provider returns several output variants, one is chosen as primary by project rules.

## Providers and models

- **WD-IDEA-GEN-245** Multiple LLM providers with cost-aware routing, no hard-coded assumptions about any provider, and graceful fallback when a service is down.
- **WD-IDEA-GEN-246** [impl] All image and video generation goes through a provider-neutral interface with no fixed assumptions about prompt format or model behavior; image providers are swappable and text generation supports several vendors.
- **WD-IDEA-GEN-247** [impl] The video pipeline is built around frame-to-video generation with one named provider; another is noted as having a clip time limit. ‹src: system-prompts-inventory›
- **WD-IDEA-GEN-248** [future, voice] Users choose among video providers; MVP ships with one provider (Google Veo 3) but the architecture stays ready for more; the options named for later are Sora and Runway.
- **WD-IDEA-GEN-249** [planned] Provider-specific prompt formatting: one format per video provider, a generic default, extensible as providers are added (see also provider-tailored pipeline settings in 02). Veo 3 was the first target format; Sora, Runway and Kling are named as future extensions.
- **WD-IDEA-GEN-250** [alt] An external automation layer may run expensive async pipelines (trigger render, wait, handle callback, notify) but must never hold creative or pipeline logic.
- **WD-IDEA-GEN-295** [future] Orchestration is explicit and code-driven, deliberately structured so it can later migrate to a durable workflow engine (Temporal.io) if workflows become long-running or need high fault tolerance. ‹src: tech-stack, inheritance_contract›
- **WD-IDEA-GEN-252** [future] Multi-model routing: capability matrix, cost/quality optimizer, automatic model selection with manual override, model performance tracking.
- **WD-IDEA-GEN-253** [future] Enterprise custom models: register private models, route generation to them, benchmark, configure costs, control access. Related: WD-IDEA-ALT-016 (enterprise administration).

### Options: prompt serialization format
- **WD-IDEA-GEN-255** [alt] YAML (preferred: readable, comments, define-once anchors).
- **WD-IDEA-GEN-256** [alt] JSON, for validation.
- **WD-IDEA-GEN-257** [alt] XML-tagged sections, for enterprise endpoints.
- **WD-IDEA-GEN-258** [alt] Labeled structured natural language ("Subject: … Action: … Style: …") as a simple fallback.

## Cost of generation

- **WD-IDEA-GEN-259** Conceived: generation is paid in credits per second of video, per image and per LLM token; every frame, video and image job records what it cost.
- **WD-IDEA-GEN-260** Cost rules (what should happen) are kept separate from cost outcomes (what did happen); rules give a base cost plus a per-unit cost (scene, shot, frame, video, token) per stage and model, so estimates are predictable and auditable.
- **WD-IDEA-GEN-262** Conceived: each generation stores its estimated cost next to its actual cost.
- **WD-IDEA-GEN-263** Conceived: cost awareness everywhere: frame generation, regeneration and bulk operations always show cost; every AI call is estimated and tracked; high-cost operations need explicit confirmation; Stage 11 totals by mode, frames per shot, and start-only vs start+end path. Related: the principle is stated in WD-IDEA-PHIL-054 and WD-IDEA-PHIL-055 and applied to invalidation in WD-IDEA-UX-070.
- **WD-IDEA-GEN-264** [planned] Estimated generation cost is shown on the review screen before a commit spends credits (see WD-IDEA-UX-116); a gateway before every generation action is WD-IDEA-GEN-265.
- **WD-IDEA-GEN-265** [future, voice] Show estimated credits before any generation action, with optional confirmation above a user-set threshold or by preference; deferred to a late nice-to-have phase.
- **WD-IDEA-GEN-267** [impl, planned] Credits are deducted per generation. Alerts on excessive spend are planned, not verified as shipped (see WD-IDEA-PHIL-057).
- **WD-IDEA-GEN-268** [future] Cost analytics: per-operation tracking, dashboard, per-user reports, budget alerts, anomaly detection. Related: budget alerts overlap WD-IDEA-PHIL-057 (planned) and per-user cost reporting overlaps WD-IDEA-UX-348 (future).

## Spend safeguards

- **WD-IDEA-GEN-271** Conceived: a render plan states shot count, max variations per shot, max retries, and a mode (quality vs a speed/cost choice), derived from a speed-versus-cost setting chosen earlier in the pipeline. ‹src: security-credit-rate-limiting-strategy›
- **WD-IDEA-GEN-272** No paid video render starts without three things: a credit reservation, a render budget, and a hard execution ceiling.
- **WD-IDEA-GEN-273** A render is blocked if the user lacks credits for its estimated cost.
- **WD-IDEA-GEN-274** Reserve, then settle: estimated credits are held (~30 min) when a render starts and reconciled to actual cost afterward, refunding any overestimate; prevents double spending when completions arrive late.
- **WD-IDEA-GEN-275** A failed or aborted render costs nothing if no output was produced; partial output is charged proportionally.
- **WD-IDEA-GEN-276** Each render has a ceiling on provider calls (e.g. 25) and wall-clock time (e.g. 12 min); hitting either aborts gracefully.
- **WD-IDEA-GEN-277** An agentic shot generator has a per-shot cap on variations and retries; at the cap the shot is marked "accepted best effort" and may not be retried by the agent again.
- **WD-IDEA-GEN-278** Loop breaker: an identical prompt, model and parameters requested more than N times aborts the render and flags an agent loop.
- **WD-IDEA-GEN-279** Default rate limits, checked before any provider call: one active final-video render per user, two renders per project per hour, 60 calls per minute per provider.
- **WD-IDEA-GEN-280** Configuration kill switches: global disable of video rendering, per-provider disable (outage or cost spike), per-user freeze (abuse, suspicious activity, payment problems). Related: the provider-isolation rule in WD-IDEA-PHIL-063 and the provider-switching and maintenance items in WD-IDEA-ALT-017.
- **WD-IDEA-GEN-281** Conceived: each render keeps a permanent record of estimated, reserved and spent credits, provider call count and any abort reason, for cost analysis, billing disputes and debugging agent behavior.

## Provenance, evaluation and quality control

- **WD-IDEA-GEN-282** [impl] Every output stores the exact final prompt sent, the prompt-template version and the user's regeneration guidance, so results are reproducible and auditable; a template becomes immutable once a generation has used it. Related: output provenance extends the lineage rule in WD-IDEA-PHIL-048; prompt templates are versioned artifacts per WD-IDEA-PHIL-003, and the guidance stored per version is WD-IDEA-STORY-074.
- **WD-IDEA-GEN-283** [impl] Writing-stage prompt templates are editable at runtime without shipping code, so live AI instructions may differ from shipped defaults.
- **WD-IDEA-GEN-285** Conceived: end-to-end traces show each stage's exact inputs and outputs; if a late video prompt is too verbose, the trace shows whether the shot list or the script caused it. Related: the product-side form of the AI tracing item in WD-IDEA-ALT-018.
- **WD-IDEA-GEN-286** A failing generation can be replayed against identical data with a modified prompt (e.g. tighter style constraints), for fast iteration on style locks.
- **WD-IDEA-GEN-287** Conceived: style-injection consistency is evaluated automatically with LLM-as-judge metrics (faithfulness, relevance).
- **WD-IDEA-GEN-288** Evaluate each stage's AI agent alone against per-stage success criteria first, then run full pipeline runs to check context propagation, branching and invalidation (see 01; golden test projects are WD-IDEA-PHIL-061, success metrics are WD-IDEA-PHIL-060).
- **WD-IDEA-GEN-289** When output misses criteria: identify the failing stage agent, review its instructions and input context, check for context propagation problems, compare with golden expectations, then update the agent.
- **WD-IDEA-GEN-290** Post-generation QC for each clip: does the first video frame match the supplied start frame; is the primary action readable and complete; does camera movement match the prompt; are dialogue and SFX present and timed; has the character drifted from the frame anchor.
- **WD-IDEA-GEN-291** [future] Automatic quality scoring: image sharpness and artifacts, video quality, dialogue clarity, threshold alerts, automated retake suggestions.
- **WD-IDEA-GEN-292** [future] Smart regeneration: map detected quality issues to generation parameters, adjust prompts automatically, refine progressively, retry with variation, detect convergence.
- **WD-IDEA-GEN-293** [future] Automated QA before approval and before expensive generation: pre-flight checks, configurable quality gates, QA reports, exception approval.
- **WD-IDEA-GEN-294** [future] Smart prompt optimization: an analysis agent suggests improvements, A/B tests prompts, offers a prompt library with examples, and scores prompt effectiveness. The planned evaluation of prompting strategies (A/B tests) is WD-IDEA-STORY-088; this item is the later in-product form.

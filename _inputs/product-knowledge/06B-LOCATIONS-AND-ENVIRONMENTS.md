# 06B Locations & Environments

> Scope: how places are represented (locations, sub-locations, views/camera directions, established views) and how a shot's location reference is chosen, applied, and kept consistent across shots and scenes. Legacy product thinking, not a description of current behavior. Legend: see 00-README.

## Why locations need their own model

- **WD-IDEA-LOC-001** [voice, idea] Locations are space-centric, not object-centric. A character or prop reference shows the thing that should appear in frame (reference and output share a subject); a location reference shows one view of a space that frames must depict from many angles, distances, positions, and focal points ("same world, different view"). Locations therefore need different handling from characters and props (see 06).
- **WD-IDEA-LOC-002** [idea] The character/prop four-angle rotation (front/side/three-quarter/back) suits objects you look at, not environments you look out from. Locations need named spatial vantage points mapped to camera setups, not rotations of one subject. ‹src: 3.7-location-pre-planning, 3.7-phase-3-EXPANDEDOUT-location-multi-shot›
- **WD-IDEA-LOC-003** [voice, idea] Failure mode, angle mismatch: the reference is aerial, a facade, or one corner, but the shot is at eye level. The generator guesses the missing view; palette may carry over, but the feel of being inside the space does not.
- **WD-IDEA-LOC-004** [voice, idea] Failure mode, partial space coverage: one image shows one part of a room (e.g. the fireplace wall). A reverse angle looking back has no reference, so the generator invents furniture, wall colors, and windows the user never chose or approved.
- **WD-IDEA-LOC-005** [voice, idea] Failure mode, sub-location drift: one heading ("INT. APARTMENT") spans living room, kitchen, and hallway, or characters move to the couch, kitchen doorway, window, and hallway within it. Each position implies a different background; one image treats every shot as the same static backdrop and breaks realism.
- **WD-IDEA-LOC-006** [voice, idea] Text prompting alone has a hard ceiling. Language is lossy for space; the same room prompted five times becomes five rooms (colors, proportions, architecture drift); the generator has no memory of prior frames. Visual references must do most of the work, with prompts supporting.
- **WD-IDEA-LOC-007** [voice, idea, planned] Goal: give the generator enough visual context that its inferences are constrained and logical rather than open-ended hallucination. The target is logical continuity, not perfection: backgrounds must make sense given what is already established about the place, even for angles never provided.
- **WD-IDEA-LOC-008** [voice, planned] A single location image is rarely enough for a dynamic story: angles shift, characters move through the space, and AI guesses about unseen angles are unreliable. An overhead shot of a kitchen should still read as the same kitchen as the eye-level shot.
- **WD-IDEA-LOC-009** [voice, idea] Locations must be "smarter" at frame time: a reference shows the place only in a general sense, so frame generation must reason about how it should logically look from this shot's viewpoint. ‹src: 3.7-tasks-part-2(3.8)›
- **WD-IDEA-LOC-010** [voice] Generic asset framings bias shot framing. Locations made early are usually one wide image, which pulls generated shots toward that framing. For an over-the-shoulder shot the wanted background is the reverse-direction view (the window behind, a sliver of the register), not the establishing wide. The same applies to character assets, which are usually one generic medium-shot image each and bias the shot's framing toward that image. ‹src: voice-message-5-2›
- **WD-IDEA-LOC-011** [planned, impl, voice] Locations never get background isolation or the white-background treatment applied to characters, props, and extras, because the environment is the point; the remove-background control is hidden for locations. Related: WD-IDEA-ASSET-120 (the hidden control) and WD-IDEA-ASSET-087 (the isolation rule for characters, props, and extras).
- **WD-IDEA-LOC-012** [impl] Location images (masters and views) are generated in cinematic widescreen 16:9.
- **WD-IDEA-LOC-013** [impl] Locations are environmental constants that carry forward across scenes by default. Asset states follow the status-tag carry-forward toggle (WD-IDEA-CONT-065); continuation scenes inherit the location (WD-IDEA-LOC-076). ‹src: 3.8-phase4-location-multi-angle›

## Product model: light default, opt-in advanced tier

The thinking moved from "every location is a multi-view library set up in advance" to a layered model: a baseline every user gets, an advanced tier entered on purpose, and frame reuse (see 04) as the ordinary continuity path.

### Options: what the location system is at its core
- **WD-IDEA-LOC-014** [voice, rejected] Every location is a multi-view reference library built upfront: each asset requires several named shots (aerial overview, room A medium, room B corner, hallway entrance), more extensive than character angles, with the coverage report and established views at the center of the workflow. Replaced by the layered model below, where views are opt-in and grow from production. ‹src: 3.7-tasks-part-2(3.8), 3.7-location-concern-notes›
- **WD-IDEA-LOC-015** [rejected] Finish the original advanced system exactly as first imagined and make it the main experience. Rejected when a product-shape problem surfaced during implementation. ‹src: 5-2-location-product-synthesis›
- **WD-IDEA-LOC-016** [rejected] Abandon the structured location system and rely on prompts alone for background continuity. ‹src: 5-2-location-product-synthesis›
- **WD-IDEA-LOC-017** [idea, planned, impl] Layered model (the later canonical direction): a baseline layer that is always relevant (shot-to-location link, match confidence, baseline prompt context, reuse/edit of prior frames); an advanced layer that is progressive and opt-in (camera directions, views, shot assignment, coverage advisory, established-view feedback); and an optional blocking/composition layer.

### The two tiers
- **WD-IDEA-LOC-018** [idea, planned] The default tier optimizes for speed, clarity, and momentum: less setup, fewer generated assets, lower budget, fewer early decisions.
- **WD-IDEA-LOC-019** [idea, planned] The advanced tier optimizes for precision and repeatability: predictable spatial continuity, tight background control, reliable repeated and reverse angles, and reusable consistency anchors.
- **WD-IDEA-LOC-020** [idea, planned, voice] Default representation: one establishing/overview image, or a strong text description alone that is appended to frame prompts. The reference is a low-weight, flexible style and spatial cue, not a rigid blueprint, and prompt guidance adapts it to each shot.
- **WD-IDEA-LOC-021** [voice] Conceived: the AI interprets a location reference flexibly, e.g. turning a 3D or overhead reference into an eye-level background for an eye-level shot, so users need not pre-define views. Related: WD-IDEA-LOC-165 (the closest view is good enough). ‹src: post-clean-location-rethink›
- **WD-IDEA-LOC-022** [voice] Creator rethink after using the multi-direction UI: it added too much friction and attention-to-detail burden. Keep the feature ("not nuke the feature"), but it must not be the default.
- **WD-IDEA-LOC-023** [voice] Multi-directional views become an opt-in toggle for power users: highly scrupulous, continuity-obsessed, with a high generation budget. ‹src: post-clean-location-rethink›
- **WD-IDEA-LOC-024** [idea] A later review judged the five-layer architecture directionally right for high-control work but found the default UX too heavy and too hidden: multi-view should be opt-in and frame reuse the ordinary path. ‹src: 5-1-location-system-intent-source›
- **WD-IDEA-LOC-025** [voice, idea] User-settable "modes of location care" trade speed against precision and low cost against an uncapped budget. Flat views are the default and a toggle unlocks a more robust mode; even the minimal mode probably needs a couple of views. ‹src: 3.7-location-pre-planning›
- **WD-IDEA-LOC-026** [voice, idea, planned] Never trap users in setup. Support the user who submits only the minimum images and lets the AI infer each shot. Do not optimize only for meticulous power users; do not force multi-view setup, make camera direction mandatory per shot, or hard-block default-mode users.
- **WD-IDEA-LOC-027** [idea] Do not bury continuity control in setup flows that live only in asset definition (Stage 5).
- **WD-IDEA-LOC-028** [planned, voice, impl] Reusing and editing approved frames is the long-term center of gravity for ordinary users and the main route to "good enough" background continuity with no multi-direction overhead and less setup than pre-building direction assets. It suits shot/reverse-shot, long scenes in a fixed environment, and recurring locations, and it matches user intuition. Start from one acceptable frame or location image and edit only the delta (new characters, props, a pose, an event, or room damage). Batch-generating many direction images upfront is no longer central. (Frame reuse mechanics: see 04.) ‹src: 5-1-location-system-intent-source, 5-2-location-product-synthesis, 5-3-location-implementation-plan, streamlined-input-process-consolidated, post-clean-location-rethink›
- **WD-IDEA-LOC-029** [planned, impl] The ordinary loop: define a location, generate, keep a good frame, reuse or edit it for later shots, and enter advanced controls only when continuity needs exceed the baseline. Related: WD-IDEA-LOC-030 states the same working-loop test.
- **WD-IDEA-LOC-030** [impl] A working loop on a fresh project: add one location image, shots resolve to it, generate a frame, select it as the base for a later shot, get a result that reuses the background, optionally promote it to an established view with lineage recorded. ‹src: 7-19-location-stabilization-master-plan›
- **WD-IDEA-LOC-031** [planned] Scenarios the system must serve: a new project with one simple location and no views; many repeated shots in one location; an advanced project with several directions and missing coverage; a reuse/edit loop that promotes a frame to an established view.

### Principles
- **WD-IDEA-LOC-032** [planned] Canonical identity early, complexity late: every shot knows its location, but nobody is forced into heavy setup or multi-step repair to move forward. ‹src: 5-2-location-product-synthesis›
- **WD-IDEA-LOC-033** [planned] Location truth (which space a shot belongs to) is distinct from location control (directions, coverage, view libraries). A shot knows its location without the user managing directions or coverage. ‹src: 5-2-location-product-synthesis›
- **WD-IDEA-LOC-034** [planned] Prevent mismatch early instead of surviving it late; the earlier system was "resilient but not coherent". ‹src: 5-2-location-product-synthesis, 4-15-location-analysis›
- **WD-IDEA-LOC-035** [planned] Show confidence wherever automation decides: users can always tell whether a location link is explicit, inferred, weak, or missing.
- **WD-IDEA-LOC-036** [planned] Advisories must be stronger than hidden fragility but lighter than premature blocking. Default users get warnings and recommendations; hard gates are reserved for advanced mode or explicitly strict project settings.
- **WD-IDEA-LOC-037** [planned, impl] The system learns from production: approved frames feed the advanced layer as established views, so the reference library grows from real output, not only upfront setup. Built for direction views (WD-IDEA-LOC-230); the wider learning loop across the library is planned. ‹src: 5-2-location-product-synthesis, location-continuity-phase-0-audit›
- **WD-IDEA-LOC-038** [planned] Stable vocabulary: location = the narrative space or room; location reference = its baseline image or description; location view / camera direction = an advanced-mode viewpoint; established view = an approved frame promoted to a continuity anchor; plus continuity base, generation package, reference manifest, attachment role.
- **WD-IDEA-LOC-039** [planned] Success for the default layer: users do not feel trapped, progress with imperfect structure, and see continuity improve through output reuse.
- **WD-IDEA-LOC-040** [planned] Success for the advanced layer: repeated and reverse angles become predictable, coverage can be repaired or extended with explicit tools, and quality scales with effort rather than collapsing under complexity.

### Stage ownership
- **WD-IDEA-LOC-042** [planned, impl] Shot list owns extraction and editing, setting text, the initial location-link suggestion and its visibility, a basic confidence display, light correction, and lock-time warnings. Promise: "make sure each shot basically belongs to the right space." It does not own view management, coverage diagnosis, heavy direction reassignment, or curation from frames.
- **WD-IDEA-LOC-043** [planned, impl] Visual definition owns coverage analysis, direction/view assignment review, missing-view surfacing, one-step entry into advanced controls, and repair of repeated or high-risk problems. Promise: "decide whether your planned shots have enough spatial coverage before you spend generation effort." It does not own baseline shot editing, prompt/reference transparency, or frame-level curation.

### Sequencing
- **WD-IDEA-LOC-044** [impl] Original build order: data model, sub-location precision upstream, asset-stage views UI, shot-list direction assignment, coverage advisory (highest user-facing value), prompt generation, established views, batch view generation (convenience, lowest priority). All eight phases (A–H) were reported done.
- **WD-IDEA-LOC-045** [voice] The creator wanted the A–H overhaul checked against the master spec for anything missed. ‹src: goated-prompts›
- **WD-IDEA-LOC-046** [idea] Counter-position: do not just finish every unchecked box in the master spec; first realign with the later correction (simpler default, advanced opt-in). ‹src: 5-1-location-system-intent-source›
- **WD-IDEA-LOC-047** [idea] Corrected priority: (1) clarify the default vs advanced model; (2) build frame reuse and edit-from-existing; (3) fix discoverability of the advanced system; (4) add light visibility in shot list and prompt review; (5) only then scene overrides, project dashboards, and smarter auto-assignment. ‹src: 5-1-location-system-intent-source›
- **WD-IDEA-LOC-048** [planned] Run the work as one coherent rebuild (establish canonical truth, expose lightly early, concentrate repair in one stage, make the preview honest, make frame generation the practical continuity engine), not a pile of unrelated tickets. ‹src: 5-3-location-implementation-plan›

## Advanced architecture

- **WD-IDEA-LOC-049** [impl] Five interlocking layers: (1) sub-location precision in script and extraction, (2) camera-direction reference views per location, (3) per-shot direction assignment, (4) an advisory coverage analysis before generation, (5) established ("hero frame") views fed back from approved frames.
- **WD-IDEA-LOC-050** [impl] The establishing-plus-directions model (a spatial anchor plus directional detail) is understandable to filmmakers and bridges script semantics to image conditioning.
- **WD-IDEA-LOC-051** [idea] Starting point the architecture replaced: locations as single-image assets (like characters, but widescreen), one master image plus an optional scene-level override; a shot's setting was free text matched to the location by name with no spatial awareness; continuity linking detected only same vs different location, not positions within a space. ‹src: 3.7-location-pre-planning›

## Sub-locations

- **WD-IDEA-LOC-052** [voice, impl] Precision is room-level. Script headings name the exact room or area ("INT. GINGERBREAD HOUSE - KITCHEN - DAY", "... - HALLWAY - CONTINUOUS"), not just the building, and script generation is instructed to produce this (see 05).
- **WD-IDEA-LOC-053** [voice, idea] Establishing images must be precise to the discrete room (kitchen, hallway, dining room), not one establishing shot of a whole house; one scene, or even shots within one scene, may need several sub-location establishing images. ‹src: 3.7-location-pre-planning›
- **WD-IDEA-LOC-054** [voice, idea] Each shot's location attribution must be specific, not a vague "interior - Hero's home" repeated for every shot, so the right references can be inferred. ‹src: 3.7-location-pre-planning›
- **WD-IDEA-LOC-056** [voice, planned] Long precise headings are split for display: "INT. GINGERBREAD HOUSE - KITCHEN - DAY" shows as location "GINGERBREAD HOUSE - KITCHEN" and time "DAY" in scene lists and the pipeline header. ‹src: 3.7-location-pre-planning›
- **WD-IDEA-LOC-057** [voice] Sub-locations are desirable but not mandatory; when a reference is only attached as a light cue, sub-areas may be combined into one. ‹src: post-clean-location-rethink›
- **WD-IDEA-LOC-058** [idea] Direction views give angle coverage within a space; they must not compensate for sloppy extraction. When the story truly changes space, it gets a separate location asset.
- **WD-IDEA-LOC-059** [idea] Subtle position changes within one sub-location (walking to the corner) are not a new sub-location; they are a change of camera direction per shot, driven by spatially explicit action text.
- **WD-IDEA-LOC-061** [idea] Asset burden: 15 sub-locations with 3 direction views each is 45 images before a single frame; the burden must be communicated or managed upfront. ‹src: 3.7-location-system-enhance-analysis›

### Options: how sub-locations are modeled
- **WD-IDEA-LOC-062** [alt, impl] A, granular locations: each room is its own location asset with its own references; views cover angles within the room. Clean and explicit but 3–5x more assets. Chosen as architecture Layer A; dependency extraction treats "Apartment - Kitchen" and "Apartment - Hallway" as distinct assets.
- **WD-IDEA-LOC-063** [alt] B, views as sub-locations: one general asset ("Gingerbread House") whose views cover both angles and sub-areas via zone labels (kitchen-wide, kitchen-reverse, hallway-looking-in); shot settings stay general and action text is parsed for zone hints. Fewer assets, longer view lists, less explicit matching. ‹src: 3.7-location-pre-planning›
- **WD-IDEA-LOC-064** [alt] C, parent/child hybrid: a parent location supplies shared identity (style, palette); each room is a child with its own views; shot settings auto-split into "GINGERBREAD HOUSE - KITCHEN". ‹src: 3.7-location-pre-planning›

### Options: view organization and hierarchy depth
- **WD-IDEA-LOC-065** [alt] Flat view list per location (chosen default first).
- **WD-IDEA-LOC-066** [alt, future] Zone hierarchy: location, then zones, then views; possibly later just a grouping label on views or behind a toggle if flat struggles.
- **WD-IDEA-LOC-067** [rejected, future] Infinite hierarchy or nested scene graph: rejected; precision stays at room/area level and complex zone hierarchies are deferred.
- **WD-IDEA-LOC-068** [idea] Open question: at what threshold does flat break down (a mansion, a ship, a school with many areas), even if the fix is deferred?

### Options: where sub-locations are inferred
- **WD-IDEA-LOC-069** [alt, voice] In the script (Stage 3) or dependency extraction (Stage 4), which the creator leaned toward, so asset definition knows exactly which sub-location establishing shots and recommended (not required) direction views to make. Related: WD-IDEA-FLOW-122 and WD-IDEA-FLOW-123 (the two stage placements). ‹src: 3.7-location-pre-planning›
- **WD-IDEA-LOC-070** [alt] In shot-list generation (Stage 7), the questionnaire's selection; the creator also felt the shot list might need to make these distinctions.

### Options: characters moving between sub-locations within a scene
- **WD-IDEA-LOC-072** [alt] Per-shot assignment: the shot list assigns a sub-location and direction to each shot (selected in the questionnaire).
- **WD-IDEA-LOC-073** [alt] Hybrid: prefer split headings, fall back to per-shot assignment.

### Sub-location detection and continuation scenes
- **WD-IDEA-LOC-075** [voice, idea] Story-aware sub-location gap detection: parse action and direction text (dependency extraction or shot list) for spatial movement cues, tag shots with inferred zones, and feed the coverage report, e.g. "Characters move to 3 distinct areas within 'Kitchen'; consider adding zone references." Bridges narrative to spatial awareness without manual zone tagging.
- **WD-IDEA-LOC-076** [idea] Continuation scenes ("INT. LAB - CONTINUOUS") must still surface location context and direction controls; the gap between the logical story location and the scene's linked asset must be resolved. Options: auto-inherit the previous scene's location and coverage in continuous sequences, show coverage for any scene with a recognized expected location even without a linked asset, or a prominent "inherit assets from previous scene" action. Because continuation scenes share the same space, the previous scene's location asset and coverage analysis are the natural inheritance source. ‹src: 3.7-location-rd-2-UIUX-improove›

## Location views (camera directions)

### Evolution of the view concept
- **WD-IDEA-LOC-077** [rejected] "Location shots" / named shots (earliest): named reference images for vantage points (aerial overview, corner booth, hallway entrance), each with a description, one marked primary as default, modeled on character angle variants. Shots were fuzzy-matched to them; unmatched shots used the primary image. Replaced by formalized camera directions.
- **WD-IDEA-LOC-078** [planned] Named shots were free-text and user-defined rather than a fixed angle set; each had a name, optional description of the angle/area, image, generation prompt, generation status, and user-controlled order. ‹src: 3.8-phase4-location-multi-angle, 3.8-threads›
- **WD-IDEA-LOC-079** [planned] Named-shots UI: a "Location Coverage" grid / "Named Shots" dialog opened from location cards in the asset stage; add a named shot, upload an image, or generate one from the primary location image plus its name/description; generate all pending or one at a time.
- **WD-IDEA-LOC-080** [planned] The user could upload a custom image for any named shot instead of generating it.
- **WD-IDEA-LOC-081** [alt, planned] MVP option: ship named shots with manual upload/generation and manual selection of which named shot each scene shot uses, before any automatic camera-to-shot matching.
- **WD-IDEA-LOC-082** [impl] Camera directions (replacement): each location holds a set of named reference views (an establishing view plus wall/direction views) that the system selects from per shot; the location is a library drawn from intelligently per frame, not a single image.
- **WD-IDEA-LOC-083** [impl] "Camera direction" is deliberately universal: interiors ("stove wall", "window wall") and exteriors ("facing the house", "facing the forest").
- **WD-IDEA-LOC-084** [voice, idea] The creator's "walls" model: a room's walls are its directions. Start with shot and reverse shot (angle 1, angle 2), add walls 3 and 4 only when a scene needs them; the shot list tags each shot with its key wall, and a shot facing one way receives only its sub-location's establishing image and that wall.

### Options: angle paradigm for locations
- **WD-IDEA-LOC-085** [rejected] Fixed four-angle rotation borrowed from characters; does not fit spaces (see above).
- **WD-IDEA-LOC-086** [alt] Free-text named shots defined by the user in their own dialog, kept separate from character angle variants.
- **WD-IDEA-LOC-087** [alt, impl] Camera directions: default Establishing + Direction 1 + Direction 2 with a primary fallback, auto-inferred and assigned during shot extraction.

### View taxonomy and metadata
- **WD-IDEA-LOC-088** [voice, idea] Proposed minimum taxonomy: establishing (wide/aerial, full layout and scale); eye-level primary (default medium straight-on); eye-level secondary (reverse or 90° rotation); detail focal points (fireplace, desk, door); named sub-location views for zones characters move between.
- **WD-IDEA-LOC-089** [voice, idea] Each location image is tagged with view type, sub-location label (kitchen_doorway, couch_area), and shot alignment (distance wide/medium/close; height eye/high/low), so frame prompting picks the most relevant image instead of the first upload.
- **WD-IDEA-LOC-090** [impl] View metadata: system name (establishing, direction 1, direction 2…), optional user alias ("stove and counter wall"), description of what it shows, view type (establishing, eye level/directional, detail, overhead, approach), camera distance (default wide), camera height (eye level/high/low/overhead/ground, default eye level), image, primary flag, source, and established-from provenance. One view per name per location; user-visible display order.
- **WD-IDEA-LOC-091** [impl] View source, shown as a badge: User (uploaded or generated), Established (promoted from an approved frame, with "Scene X, Shot Y"), or Inferred (named and described by shot extraction, awaiting an image).
- **WD-IDEA-LOC-092** [planned] When creating a direction, prompt for a semantic name or alias ("entry-facing", "north wall"); numbered names are only an internal fallback.
- **WD-IDEA-LOC-093** [idea, impl] Primary view = fallback for shots with no match. It must be the main eye-level direction (Direction 1), never the overhead establishing view, because an aerial reference actively misleads a ground-level shot. Only one primary per location, toggled with a star.
- **WD-IDEA-LOC-094** [idea, impl] The establishing view has a different job: a spatial-context anchor always sent as secondary context alongside the matched direction, never the main reference.

### Default view sets
- **WD-IDEA-LOC-095** [voice, idea] Keep default proposals minimal: wide views of each relevant wall (not necessarily four) plus one aerial establishing view of the room is probably enough; users choose which views they want and never need dozens.
- **WD-IDEA-LOC-096** [impl] Interior vs exterior is detected from the INT./EXT. prefix of the headings where the location appears. Related: WD-IDEA-STORY-059 (the heading parse).

### Options: default views proposed for a location
- **WD-IDEA-LOC-097** [alt] Brainstorm set: interior = establishing, eye-level primary, eye-level reverse, 2 detail focal points; exterior = establishing, street level, approach, aerial, detail.
- **WD-IDEA-LOC-098** [alt] Vantage-point proposals by type (named-shots era): interior = wide establishing, detail corners, overhead, through-doorway; exterior = wide establishing, street-level, aerial, approach, detail; user edits, adds, removes. Expected 5–10 references per location.
- **WD-IDEA-LOC-099** [alt] Establishing overview plus 2 walls (recommended); or plus 3–4 walls; or just establishing plus primary. Detail views and extra walls (e.g. an L-shaped room) are optional.
- **WD-IDEA-LOC-100** [alt, impl] Built "Suggest Default Views": never more than 3. Interior = establishing (overhead, wide, whole room from above) + Direction 1 (eye level, one wall, primary) + Direction 2 (eye level, opposite wall). Exterior = establishing (eye-level wide) + Direction 1 (approach, facing the location) + Direction 2 (reverse, looking outward). Establishing plus shot/reverse covers most narrative angles; users add Direction 3, 4… manually.

### Suggesting and requiring views
- **WD-IDEA-LOC-101** [planned] Suggestion is additive ("suggest missing defaults") so partially set-up locations improve incrementally.
- **WD-IDEA-LOC-102** [rejected] All-or-nothing suggestion that refuses once any view exists; replaced by additive suggestion.
- **WD-IDEA-LOC-103** [idea] Open question: how many views are required? Too many is friction, too few defeats the purpose. One early answer: require one establishing plus one eye-level view, the rest recommended from shot-list analysis. ‹src: 3.7-location-concern-notes›

### Managing views (asset stage)
- **WD-IDEA-LOC-104** [impl] A "Camera Directions" manager (locations only) opens from the location card menu: empty state with a compass and "Suggest Default Views"; view cards with image upload, inline alias/description editing, primary star, source badges, delete (cleans up the image); "add custom direction" with alias and description; a count such as "2/3 views have images".
- **WD-IDEA-LOC-105** [impl] Asset definition is the primary place to build views but not a gate: users can define all views, only the establishing view, or nothing, and add or edit later from visual definition; the system expects lazy users and compensates with advisories.
- **WD-IDEA-LOC-106** [idea] Asset-stage view creation is more upfront and less shot-informed than visual-definition gap filling; any difference between the two batch review flows should be explicit.

## Creating view images

### Options: who creates the views
- **WD-IDEA-LOC-107** [alt] The user uploads all views: high quality, high friction.
- **WD-IDEA-LOC-108** [alt] The user uploads one and the system generates the rest: lower friction, quality risk.
- **WD-IDEA-LOC-109** [alt] Hybrid: the user uploads what they have; the system fills gaps with views flagged as AI-inferred.

### Options: when views are generated for a text-only location
- **WD-IDEA-LOC-110** [alt] Generate the full multi-view set upfront.
- **WD-IDEA-LOC-111** [alt] Generate views on demand as shots require them.

### Generation workflow
- **WD-IDEA-LOC-112** [voice, planned, impl] Coverage workflow: provide or generate one good establishing/first shot, iterate a few times until the look is right, then generate the remaining views from it as reference plus each view's description and the location description; the user approves or regenerates each and approved views join the library.
- **WD-IDEA-LOC-113** [planned] Start from the most representative angle: a consistent interior generated from an exterior front view is unreliable.
- **WD-IDEA-LOC-114** [idea] AI is unreliable at alternate angles of complex rooms (wrong proportions, spatial inconsistency, invented furniture), though fine for simple objects. Keep generation optional and framed as "a starting point, expect to curate", make uploading easy, and favor uploads for critical views. Test single-reference spatial consistency before building the full batch UI.
- **WD-IDEA-LOC-115** [impl] View generation sends an existing location image as style reference plus a prompt describing the desired angle and demanding the same palette, architecture, and lighting ("same Victorian kitchen seen from the opposite wall, eye-level, looking back toward the stove"), plus the location description.
- **WD-IDEA-LOC-116** [impl] Style-anchor cascade for view generation: establishing view, else primary direction, else the location's master image. With no image anywhere, generation is disabled ("Upload or generate at least one reference image first"). Alternative considered: make the establishing view a soft requirement before direction generation.
- **WD-IDEA-LOC-117** [impl] Generating a view image only fills that view; it never overwrites the location's master image.
- **WD-IDEA-LOC-118** [voice, future] Per-direction generation and "Generate N Missing Views" could get a toggle to pick which existing view is the style reference, or opt out; default off and low priority since the legacy flow already picks the establishing/primary view. ‹src: ._1-scratchpad›

### Options: batch generation of missing views
- **WD-IDEA-LOC-119** [alt, impl] One-click "Generate N Missing Views" per location plus per-direction generate buttons; sequential, immediate, no review step; shown only when directions lack images and a reference exists, with per-view loading state. Directions already exist with names, aliases, and descriptions (often created by the shot list), so there is nothing left to propose and one click has less friction. Recommended over a confirmation dialog (WD-IDEA-LOC-120) or the full propose/review/confirm flow (WD-IDEA-LOC-121).
- **WD-IDEA-LOC-120** [alt] Confirmation dialog listing the views to generate and their style reference.
- **WD-IDEA-LOC-121** [alt, planned] Full propose → review → confirm (original spec): analyze uncovered shot clusters, propose views prefilled with name/alias/description, user edits/removes/confirms, generate, regenerate misses; proposals capped at what the shot list needs.

### Options: how coverage gaps get filled with new views
- **WD-IDEA-LOC-122** [alt, voice] Auto-propose from the shot list: each gap gets a proposed name and description with Generate or Skip (recommended; the creator chose this with a limited default). The user can edit, remove or confirm each proposal before generation; misses can be regenerated; proposals are capped at what the shot list needs.
- **WD-IDEA-LOC-123** [alt] Manual definition of each missing view.
- **WD-IDEA-LOC-124** [alt] A template of standard views plus manual additions.

## Shot-to-location identity (which location a shot is in)

- **WD-IDEA-LOC-125** [planned] Canonical shot-level location identity is foundational infrastructure: every shot carries a reliable link to its location asset, and all stages consume one shared truth instead of recomputing text matches. It is plumbing, not the product experience by itself. ‹src: 5-2-location-product-synthesis›
- **WD-IDEA-LOC-126** [planned, impl] A shot's free-text setting stays editable descriptive copy; its location identity is anchored to the linked asset, not the text. Text is supporting metadata; IDs are the join key.
- **WD-IDEA-LOC-127** [idea] Text identity drift ("Kitchen Hallway" vs "hallway kitchen" vs "kitchen") grows non-linearly with project size; operationally robust fallback is not semantically robust state.
- **WD-IDEA-LOC-128** [idea] Past problem: setting text could be edited freely with no check against known locations, so drift surfaced late, in visual definition, as "silent mismatch".
- **WD-IDEA-LOC-129** [impl] A scene's expected location comes deterministically from the structured screenplay heading (with INT/EXT and time of day feeding frame context); LLM extraction remains only a fallback for legacy scripts.
- **WD-IDEA-LOC-130** [planned, impl] Every shot carries a baseline location link whenever reasonably inferable, with confidence, source, and an optional reason. Sources: manual, exact name, alias, fuzzy, inferred during extraction, legacy backfill. Shot state: resolved, suggested, ambiguous, or unresolved.
- **WD-IDEA-LOC-131** [impl, planned] Locations carry multiple aliases ("kitchen", "kitchen hall", "main kitchen hallway") for deterministic matching.
- **WD-IDEA-LOC-132** [impl] Resolution cascade: an assigned camera direction maps to its parent location at full confidence; exact normalized name ≈0.95; exact alias ≈0.90; token-overlap fuzzy match on name plus aliases ≈0.60–0.89; otherwise the same cascade against the scene's expected location. Output: chosen location, confidence, source, reason, candidates, ambiguity flag.
- **WD-IDEA-LOC-133** [impl] Normalization lowercases, strips punctuation, collapses whitespace, optionally drops "the/a/an", and removes INT./EXT. before matching.
- **WD-IDEA-LOC-134** [impl] When the top two candidates are within ≈0.08, the result is ambiguous: the link stays unresolved and candidates are shown for the user to pick, never auto-picked.
- **WD-IDEA-LOC-135** [planned, impl] One shared resolver is the only matching source for extraction, edits, lock validation, coverage, and asset relevance, replacing scattered exact-equality and substring heuristics.
- **WD-IDEA-LOC-136** [impl, planned] Resolution runs when shots are extracted, when setting text or direction changes (debounced), and on bulk updates.
- **WD-IDEA-LOC-137** [impl, planned] A manual pick is marked manual at full confidence and locked against automatic re-resolution; the UI distinguishes "system suggestion changed" from "manual choice retained".
- **WD-IDEA-LOC-138** [impl] Batch "resolve all shot locations" for a scene: dry-run and apply modes, a minimum confidence for auto-apply, and counts of updated, unresolved, and ambiguous shots with per-shot reasons and candidates.
- **WD-IDEA-LOC-139** [impl, voice] Backfill for existing projects: direction parent first, then setting text, then the scene's expected location. Dry-run report by confidence first; only high-confidence (≈0.85–0.90), non-ambiguous, non-manual links apply automatically; medium or ambiguous ones stay visibly "system-assigned" in a review queue, never silently promoted to trusted truth. The creator wanted existing projects backfilled and the continuity system brought to a stable state.
- **WD-IDEA-LOC-140** [planned] Legacy or unresolved shots degrade to "unresolved" advisories, never errors, so the system does not look broken when it isn't.
- **WD-IDEA-LOC-141** [idea, planned] Main risk: wrong auto-links from low-confidence fuzzy matches lead users to trust wrong assignments. Mitigate with confidence gating and an unresolved-review flow.
- **WD-IDEA-LOC-142** [planned] Quality targets: ≥70% of shots linked in active projects, fewer manual reassignments in visual definition (e.g. 40% fewer), <5% unresolved at shot-list lock on the median project.
- **WD-IDEA-LOC-143** [planned, future, impl] Telemetry: unmatched rate, manual reassignment rate, primary-fallback rate, plus a logged record of each resolution decision (for diagnosis, not runtime). Calibrate thresholds from real usage before enforcing anything; tune badge language, reduce warning fatigue, fix copy users misread.
- **WD-IDEA-LOC-144** [planned, future] Alias management UX: author, curate, type, dedupe, and normalize aliases.

### Location link in the shot list
- **WD-IDEA-LOC-145** [impl, planned] Each shot shows a searchable "Linked Location" selector beside its setting with a confidence badge (High ≥0.90 green, Medium 0.75–0.89 amber, Low <0.75 or unresolved red/neutral), the match source ("Alias match", "Fuzzy / ambiguous"), and candidates when ambiguous (e.g. "Kitchen Hallway, Main Hallway"). Missing links show as warnings.
- **WD-IDEA-LOC-146** [impl, planned] Per-shot actions stay light: Accept Suggestion, Choose Different, Clear, and Open Coverage Tools as an exit to deeper tools, not the center of the view.
- **WD-IDEA-LOC-147** [planned] A scene banner ("2 shots have weak or unresolved location links") offers Review now or Continue; stage actions include Resolve Visible Suggestions and Review Location Warnings; a validation section counts unresolved, ambiguous, and mismatched-with-expected shots, summarizing rather than launching coverage editing.
- **WD-IDEA-LOC-148** [planned] Unresolved states are obvious but not alarming; the shot list should feel like shot editing with better context, not a spatial-planning dashboard, and stay usable with many unresolved shots.
- **WD-IDEA-LOC-149** [planned, impl] Lock validation counts unresolved links, ambiguous matches, and high-confidence links that diverge from the scene's expected location; it warns by default.
- **WD-IDEA-LOC-150** [planned, alt] Option: hard-block shot-list lock when unresolved links exceed a threshold (enforcement phase). ‹src: 4-15-location-resolver-spec›
- **WD-IDEA-LOC-151** [planned] An unresolved location is a data-quality concern; an unresolved camera direction is only an advanced continuity concern. The default flow does not treat them as equally severe.

## Assigning shots to camera directions

- **WD-IDEA-LOC-152** [impl, planned] Each shot can be assigned one of its location's directions, which decides its reference image. This is advanced-mode precision, useful when views exist but not required on the default path.
- **WD-IDEA-LOC-153** [impl] View reuse is the core consistency mechanism: one direction serves many shots, so every shot facing "Direction 1" shares the same reference.
- **WD-IDEA-LOC-154** [impl] The shot list both consumes and produces directions. It receives the scene's expected location and existing directions (alias + description) and assigns each shot by where the camera would face given the action, filling structured camera metadata (distance, height, movement, e.g. "MS - Eye Level - Slow Dolly In"). With no existing directions, it makes educated direction decisions (see WD-IDEA-LOC-156 for the bootstrapping rule).
- **WD-IDEA-LOC-155** [voice, idea] Assignment should intelligently use directions already defined for the location; with none, the AI makes educated direction decisions.
- **WD-IDEA-LOC-156** [impl] Bootstrap: when a location has no directions (or the story needs undefined ones), shot extraction creates inferred directions (name, AI-written alias and description, no image) and assigns shots to them, so assignment always happens whether or not views were set up; downstream they read as "needs image", not "no directions". Asset-stage setup is never a prerequisite.
- **WD-IDEA-LOC-158** [impl] Assigning a direction can set or update the shot's linked location to the direction's parent unless a manual location conflicts; clearing a direction re-runs resolution unless manually locked; only directions of project locations are assignable.
- **WD-IDEA-LOC-159** [voice, idea] Between story and shot list, let users control how many views shots should use (many different views vs only 1–2), i.e. how creative extraction is with direction assignment. ‹src: jump-a-gun-discrepancies›

### Options: how shots are matched to views
- **WD-IDEA-LOC-160** [alt] Deterministic metadata matching: fast, no LLM (recommended); build and evaluate first.
- **WD-IDEA-LOC-161** [alt] LLM classification: more accurate, costly.
- **WD-IDEA-LOC-162** [alt, voice, future] Hybrid metadata with LLM fallback, which the creator asked to consider; add LLM matching only if metadata proves too coarse.
- **WD-IDEA-LOC-163** [rejected] Fuzzy/keyword matching of the shot's camera and setting text against named-shot names and descriptions, falling back to the primary image (named-shots era). Replaced by canonical location links plus explicit direction assignment.

### Matching behavior
- **WD-IDEA-LOC-164** [impl] Matching heuristic when no direction is assigned: score directions (not establishing) by camera height match (+2), distance match (+1), and action/setting text containing alias keywords (+3, "stove" → "stove wall"); highest wins; zero falls back to primary (or first) direction; the result is stored and user-overridable. An explicit assignment always wins.
- **WD-IDEA-LOC-165** [voice, idea] The closest view is good enough; not every variation needs its own image. A high-angle close-up whose closest view is an eye-level medium of the same wall attaches that image, and the prompt describes the actual shot so the model adapts the framing.

### Visibility and editing of assignments
- **WD-IDEA-LOC-166** [voice, planned] The assigned direction must be clearly visible on each shot; the creator could not tell which direction a shot used.
- **WD-IDEA-LOC-167** [voice, idea] Assignments are AI-suggested and user-confirmable: the creator expected users to verify each shot's wall in the shot list (a modal or an assignment table with overrides); the assignment persists per shot and drives generation.
- **WD-IDEA-LOC-168** [planned] A shot's direction is one shared value, editable in shot list, visual definition, and prompt review and visible in frame generation; a change anywhere shows everywhere. Stage 7 editing becomes available after shot-list generation; Stage 8 edits it through the coverage table; Stage 9 is the last chance to change it before generation; Stage 10 shows it. (Shot-list and prompt-review editing were reported missing earlier.)
- **WD-IDEA-LOC-169** [idea] Open: when an assignment is edited in a later stage, does it persist immediately or on save, and what happens to frames already made with the old assignment? Changing a direction invalidates the shot's prompt (different references, different delta) and requires regeneration (see 08). ‹src: jump-a-gun-discrepancies›
- **WD-IDEA-LOC-170** [idea] An "Auto-Assign Shots" action in the coverage panel pre-fills assignments by metadata matching and shows proposals for review before committing.

### Options: direction UI in the shot list
- **WD-IDEA-LOC-171** [alt] Read-only badge in the shot inspector with lightweight dropdown reassignment; visual definition stays the main editor (recommended compromise). Related: WD-IDEA-UX-185 and WD-IDEA-UX-186 restate this compromise; the tool split by stage is WD-IDEA-FLOW-064, WD-IDEA-LOC-042 and WD-IDEA-LOC-043. ‹src: 5-1-location-system-intent-source, jump-a-gun-discrepancies›
- **WD-IDEA-LOC-172** [alt] Full direction editing with thumbnails and coverage hints, as the original spec said.
- **WD-IDEA-LOC-173** [alt] Read-only label only.
- **WD-IDEA-LOC-174** [rejected] Any direction-editing surface in the shot list; visual definition owns direction management.

### Options: direction UI in prompt review
- **WD-IDEA-LOC-175** [alt, planned] Read-only transparency (recommended): reference thumbnails labeled by role (MAIN REFERENCE vs SPATIAL CONTEXT), direction alias, delta warnings, and weak-fallback warnings. ‹src: jump-a-gun-discrepancies›
- **WD-IDEA-LOC-176** [alt] Visible and editable: reassigning marks the shot's prompts stale and requires regeneration (literal spec); users may override the matched view here.
- **WD-IDEA-LOC-177** [alt] No structured UI; rely on prompt text.

## How a shot picks and uses location references

### Options: references attached per shot
- **WD-IDEA-LOC-178** [alt, impl] Best match plus establishing (chosen): exactly two location references, the assigned direction as MAIN REFERENCE and the establishing view as SPATIAL CONTEXT, plus all character and prop references; no dropping cascade needed (diminishing returns beyond 3–4 location refs; model limit ≈14). The location text includes the direction's alias and description. When no views exist, the master location image is the fallback.
- **WD-IDEA-LOC-179** [alt] Best match only.
- **WD-IDEA-LOC-180** [alt, impl] Up to 3 role-labeled references: best view as main background, establishing as spatial and palette context, and a detail view for close-ups (e.g. eye-level primary plus window detail for a medium shot near the window); the prompt says how to use each.
- **WD-IDEA-LOC-181** [rejected] Named-shots priority: matched named shot, then the scene-instance location image, then the master image. Replaced by the direction-based fallback chain below.

### Fallback chain and honesty
- **WD-IDEA-LOC-182** [impl, planned] Recorded reference strategy per shot: matched direction; fallback to primary direction; fallback to establishing; fallback to base location image; direction assigned but image missing; or text-only.
- **WD-IDEA-LOC-183** [planned] Direction assigned and imaged: direction image first as main background, establishing second, and the prompt states angle, distance, height, and intended view.
- **WD-IDEA-LOC-184** [impl, planned] Location linked, no direction: fall back to primary direction, else establishing, else base image, with an adaptation note rather than implying an exact match; shown as advisory or risky depending on mode.
- **WD-IDEA-LOC-185** [impl, planned] Direction assigned but imageless: use establishing or base image, describe the wanted direction from its metadata, attach a risk notice and adaptation note, and offer generate/upload/establish repairs.
- **WD-IDEA-LOC-186** [impl, planned] No usable location image: generate from text-only location context, warn of weak continuity before generation, and never silently substitute an unrelated location's image.
- **WD-IDEA-LOC-187** [impl, planned] Candidates are scoped to the shot's own linked location, then refined by direction; other locations in the same scene never bleed into its prompt, and not all views are attached.
- **WD-IDEA-LOC-188** [impl] Manifest order: matched direction first, establishing second, then characters, then props. Each attached reference gets a numbered label stating what it is, so the prompt writer knows the role of each image. The numbered order is shown to the user in WD-IDEA-LOC-201.
- **WD-IDEA-LOC-189** [voice] When a specific background/view is set for a shot, that image must be the one attached for its frame generation. ‹src: claudeprompt-5-10›
- **WD-IDEA-LOC-190** [idea] Open: when many characters and props exceed the reference budget, are location references dropped, and in what order?

### Reference role and prompt support
- **WD-IDEA-LOC-191** [impl] Location references are attached as style/environment references, not identity/subject references (image models offer subject types for people, animals, products, not places); they carry palette, materials, architectural logic, and atmosphere, and must not overclaim unseen geometry. Characters, props, and a continuity base frame go as identity references.
- **WD-IDEA-LOC-192** [impl, voice] Delta descriptions: when the reference angle differs from the shot, the prompt says to keep the space but reframe ("reference shows the kitchen at eye level; frame this from a HIGH ANGLE looking down; keep palette, architecture, layout"), and the shot's camera-angle details are always described. The imperfect match is also flagged in the coverage advisory.
- **WD-IDEA-LOC-193** [idea] Ceiling: style references capture tone, not structure, so delta reframing asks a style reference to do structural work; set user expectations.
- **WD-IDEA-LOC-194** [impl] Scene bible: lock structured location descriptors (lighting, color grade, architecture, materials, time of day fixed per scene, the direction's alias and description) and repeat them identically in every prompt, so environment language stays stable even when images are imperfect; research calls it the most reliable environment-consistency technique. Related: WD-IDEA-CONT-035 (the sequence-wide lighting rule).
- **WD-IDEA-LOC-197** [future] Structure- and style-conditioning tools (ControlNet / IP-Adapter style) for maximum environment control; needs separate image-model infrastructure.

### Composition authority

Held with their owning topic in other documents: WD-IDEA-SHOT-102 (see 07), WD-IDEA-SHOT-099 (see 07).

### Generation package and transparency
- **WD-IDEA-LOC-200** [planned] One continuity "generation package" per shot/frame is the single source of truth for prompt text and attached images; prompt review previews exactly that package and frame generation consumes it. Contents: chosen location, chosen direction or fallback view, background instructions, camera framing instructions, start- and end-frame reference sets, continuity base when reusing a frame, optional blocking reference, fallback chain and risk notices, and each attachment's reason and role. ‹src: 5-3-location-implementation-plan›
- **WD-IDEA-LOC-201** [impl, planned] Prompt review shows a continuity panel per shot: location and direction, reference stack in generation order with thumbnails and roles (identity vs style) and per-reference reasons (matched direction, establishing, base, blocking, continuity base, fallback), fallback/delta notes, risk badges, and an overall continuity-strength indicator.
- **WD-IDEA-LOC-202** [planned] Plain wording in the preview: "using matched direction view", "using establishing view as spatial support", "adapting from similar angle", "falling back to baseline location reference". Example wording also includes "No exact height match" (a plain-language risk when camera height differs) and "Using reverse-direction image plus spatial context. Prompt will adapt framing for a slightly higher camera angle."

## Coverage advisory (visual definition stage)

- **WD-IDEA-LOC-203** [impl] Before generation, a proactive coverage report analyzes every shot's camera and setting/action cues, clusters shots into view groups, and checks each for a matching view: "8 shots eye-level medium: covered", "3 shots high-angle wide: no reference (quality risk)", "2 shots near the window: no zone reference". Users create views or accept risk before spending credits.
- **WD-IDEA-LOC-204** [voice, idea] If the shot list includes a reverse angle and no secondary view exists, warn: "No secondary angle reference found for this location; generation quality may be reduced."
- **WD-IDEA-LOC-205** [impl] The advisory is non-blocking and corrective ("Generate Missing Views" / "Proceed Anyway"): it surfaces risk so users make pragmatic tradeoffs. Before generation it lists each location's shots grouped by assigned direction with counts, whether each direction has an image, and unmatched shots with their closest match (see WD-IDEA-LOC-203 and WD-IDEA-LOC-208).
- **WD-IDEA-LOC-206** [impl, planned] Coverage states: covered (direction has image); fallback/imperfect match (no good direction, primary used); direction without image (e.g. inferred, needs upload or generation); unassigned (never got a direction, distinct from imageless); mismatch (direction belongs to another location); fully covered. Per shot: good, partial, fallback, risky, or unassigned.
- **WD-IDEA-LOC-207** [impl, planned] Grouping uses canonical shot-location links, one section per location plus an explicit "No linked location" section, replacing setting-text containment.
- **WD-IDEA-LOC-208** [impl] Panel: per-location collapsible sections with status ("Partial Coverage", "X/Y shots covered"), shot count, view inventory with image state (attached / none / inferred only), direction groups with alias, source badge, shot count, thumbnail, and covered/gap status; unmatched shots get direction dropdowns (the shot-to-direction table in WD-IDEA-LOC-210 has thumbnails and dropdowns for reassigning any shot) and counts update immediately; per-direction generate and "Generate N Missing Views". Hidden for scenes with no location asset.
- **WD-IDEA-LOC-209** [impl] Established views appear distinctly with provenance, e.g. "Direction 1 'stove wall' (ESTABLISHED — Scene 2, Shot 3)". They sit alongside user-uploaded and missing views in the panel.
- **WD-IDEA-LOC-210** [planned, impl] A risk list states specific problems ("Shot 13 needs reverse coverage", "Shot 15 is using weak fallback from primary", "Shot 16 has no direction assignment"); an assignment table shows shot, setting, linked location, assigned view, Good/Risky/Fallback verdict, and quick change. Layout: summary strip (mode, risk counts), then per-location view inventory, risk list, table, action row.
- **WD-IDEA-LOC-211** [planned] Baseline problems (shot not linked to a location) are visually separate from advanced direction-coverage problems: related but not equivalent.
- **WD-IDEA-LOC-212** [planned, impl] Gaps must be actionable in one step, not only visible. Repairs: create view, add direction, create default views, assign shots, generate a missing image (from establishing or primary), batch-generate, use an approved frame as a view, create inferred view shells.
- **WD-IDEA-LOC-213** [planned, impl] Severity follows continuity mode: an unassigned direction or a fallback is advisory in default mode and a stronger warning in advanced mode.
- **WD-IDEA-LOC-214** [planned] Clear empty states: no views, only an establishing reference, all shots on primary fallback. With zero directions show a call to action ("No camera directions defined for this location. Set up directions to enable shot assignment") instead of a dropdown holding only "Unassigned"; options: hide the dropdown, disable it with a tooltip, or offer inline "Create direction".
- **WD-IDEA-LOC-215** [idea] A thin progress bar beside "X/Y shots covered" (red/amber at 0%, amber partial, emerald at 100%).
- **WD-IDEA-LOC-216** [idea] Coverage work should feel like creative progression, not diagnosis and repair; direction naming and default-view tools should feel intent-driven, not technical. ‹src: 4-15-location-analysis›

### Discoverability
- **WD-IDEA-LOC-217** [planned] Deferred location assets must not hide direction controls; warnings need direct actions ("you have a gap" → "fill this gap" in one step); direction setup is reachable from visual definition. Options: menu entry on deferred rows, a "Set Up Camera Directions" entry in the coverage panel, or auto-activate/surface locations whenever scenes depend on them. Stage 8 notifies when a scene's location is deferred ("This scene's location X is deferred. Activate it to enable camera direction assignment") and may auto-activate locations in scene dependencies. Related: WD-IDEA-ASSET-068 (deferred-asset menus make direction controls unreachable today).
- **WD-IDEA-LOC-218** [idea] Bidirectional navigation between the direction manager and the coverage panel ("Define directions" / "See shot assignments").
- **WD-IDEA-LOC-219** [idea] A guided quick-start ("Set Up Location Directions") from asset definition or visual definition collapses five scattered steps (activate, open directions, define, open coverage, assign) into pick location → suggest default views → assign shots.
- **WD-IDEA-LOC-220** [future] Project-wide coverage summary and per-scene gap indicators show which scenes still carry risk and where to spend effort; richer dashboards and smarter auto-assignment and review later. Proposed form: a red/amber/green dot per scene row in the Script Hub for unresolved coverage gaps, plus a project-wide coverage dashboard.

## Continuity modes and progressive disclosure

- **WD-IDEA-LOC-221** [impl, planned] A Basic/Advanced continuity mode, persisted per project and defaulting to Basic, visible in the coverage panel and the frame-generation mode bar; also considered per scene or as a session preference. The mode is visibly framed in the relevant stages; per-scene mode overrides on top of the project setting are a future extension (WD-IDEA-UX-265).
- **WD-IDEA-LOC-222** [planned] Enter the advanced tier through intentional, clearly labeled entry points ("Advanced Location Continuity", "Camera Directions", "Precision Background Control") when the user asks, drift repeats, a scene has many repeated or reverse angles, or the user opts in; never mandatory for basic setup.
- **WD-IDEA-LOC-223** [planned] The system proactively suggests advanced mode on many shots in one location, repeated reverse angles, repeated fallbacks, or many manual direction corrections, with nudges like "Need stronger background consistency?" or "This location would benefit from advanced view coverage." ‹src: 5-3-location-implementation-plan›
- **WD-IDEA-LOC-224** [impl] In Basic mode, visual definition shows a dismissible strip of continuity suggestions drawn from project health; it is the progressive-disclosure door to advanced controls.

- **WD-IDEA-LOC-225** [impl, planned] Continuity health metrics per project or scene: unresolved and ambiguous locations, direction gaps, shots on fallback or weak references, shots with a selected base, frames generated from a base, and frame-reuse rate, with improvement suggestions.
- **WD-IDEA-LOC-226** [planned, future] Optional strict mode strengthens warnings or blocks progression when advanced continuity is on or for high-value projects; advisory behavior ships first. A strict gate already exists in legacy Advanced mode for Stage 10 Lock and Proceed (WD-IDEA-UX-273); this bullet covers extending strictness beyond that.

### Options: how the advanced tier is enabled
- **WD-IDEA-LOC-227** [alt] A toggle.
- **WD-IDEA-LOC-228** [alt] An entry point from an empty state.
- **WD-IDEA-LOC-229** [alt] Progressive disclosure.

## Established views (hero frames)

- **WD-IDEA-LOC-230** [impl, voice] An approved frame can be locked as the established view for its direction, so later shots facing that way use the generated frame instead of the original asset image. The library grows organically during production: the AI's first invented details become the consistency reference, no extra uploads. Elevated to a core feature as the "hero frame" pattern, the single most impactful consistency technique. After approval the user is offered "Lock this as an established view for [Location] from [angle]?". ‹src: 3.7-location-pre-planning, 3.7-location-concern-notes, 5-1-location-system-intent-source›
- **WD-IDEA-LOC-231** [impl, idea, planned] The loop bridges the light default and the advanced library: established views feed the direction library so later frames for that direction converge, and default-mode generation turns into advanced structure without upfront authoring.
- **WD-IDEA-LOC-232** [impl] After approval, if the frame's direction has no image, a prominent "This fills a coverage gap!" banner names location and direction and offers "Lock as Established View" / "Skip". If the direction already has an image, only a subtle "Lock as established view for [direction]" link appears.
- **WD-IDEA-LOC-233** [impl, alt] No establish prompt appears for shots without an assigned direction. The prompt is proactive only when it fills a gap (the direction has no image); otherwise only a subtle link appears (WD-IDEA-LOC-232). The alternative (prompt also for unassigned shots) is WD-IDEA-LOC-234. ‹src: 3.7-location-system-enhancement-(master-doc)›
- **WD-IDEA-LOC-234** [alt] Alternative: show the prompt even without a direction, with a dropdown to choose which direction to establish, turning a rare passive feature into an active step. ‹src: 3.7-location-rd-2-UIUX-improove›
- **WD-IDEA-LOC-235** [idea] Make it visible that established views improve future generations.
- **WD-IDEA-LOC-236** [future] Auto-lock the first approved frame per direction as a preference toggle; manual by default to keep user control.

- **WD-IDEA-LOC-237** [impl] Provenance: the view records source scene, shot, and frame, and the frame records which view it became; users can navigate back to the source frame and query which scenes produced established views; the view inherits camera distance and height from its source shot.
- **WD-IDEA-LOC-238** [impl] Established views can be removed or replaced anytime from the direction manager (reverting to no image or swapping another frame/upload) with no unlock ceremony; a re-establish flow covers a later, better frame or a changed story.

### Options: what locking does when a reference already exists
- **WD-IDEA-LOC-239** [alt, impl] Replace after a side-by-side comparison of current reference and new frame; replacing archives the old reference for rollback; keeping cancels the lock.
- **WD-IDEA-LOC-240** [alt] Overwrite the existing direction's image and source in place.
- **WD-IDEA-LOC-241** [alt] Coexist as an alternative reference, or let the user choose.
- **WD-IDEA-LOC-242** [alt, planned] Promotion choices: add the frame as a new direction view, replace the current direction image ("Replace Existing Reverse View"), or attach it to the location as a stronger baseline reference, recording origin and promotion reason.

## Continuity across shots and scenes

- **WD-IDEA-LOC-243** [voice] Continuity anchor problem: two shots from the same angle in the same room (shots 3 and 7) should have identical backgrounds (wall color, furniture placement, lighting), yet independent generation drifts even from the same reference; a locked view of camera position A becomes the reference for every later position-A shot. A non-adjacent frame link to an earlier shot in the same room (WD-IDEA-CONT-181 to WD-IDEA-CONT-184) is a complementary way to hold the same background. ‹src: 3.7-location-concern-notes›
- **WD-IDEA-LOC-245** [planned] Views live at the project level, shared by every scene's instance of the location, with no per-scene duplication, so a location's views stay consistent across scenes.
- **WD-IDEA-LOC-246** [planned] Location continuity with modification: a recurring location (the protagonist's bedroom in the first and final scenes) must stay recognizably the same place while reflecting story change (a diploma now on the wall). Related: WD-IDEA-CONT-052 (assets evolve in both directions while the chain stays intact).

### Options: project-level vs scene-level views and scene overrides
- **WD-IDEA-LOC-248** [alt, future] Defer scene-specific view overrides (recommended): no data model or UX existed, assignments are project-global, and the feature adds asset state and complexity.
- **WD-IDEA-LOC-271** [alt] Named-shots era: whether location shots live at the project level (asset definition, Stage 5, global to the project) or per scene (visual definition, Stage 8) was left unresolved; the spec recommended project-level shots with scene-specific overrides in Stage 8, mirroring how character descriptions work. Later location planning instead recommended deferring scene overrides (WD-IDEA-LOC-248). ‹src: 3.7-phase-3-EXPANDEDOUT-location-multi-shot, 3.7-threads›
- **WD-IDEA-LOC-249** [alt] Per-scene text description override only.
- **WD-IDEA-LOC-250** [alt, planned] Full per-scene image and description variants added in visual definition (this scene's kitchen has smoke damage or a broken window), following the scene-specific character description pattern while other scenes keep normal views; scene location shots appear in the master reference carousel. Related: WD-IDEA-CONT-078 and WD-IDEA-CONT-079 (the reference-history carousel).
- **WD-IDEA-LOC-251** [alt, future] For a location transformed by the story (a room destroyed): post-transformation variants of its views, or the transformed scene instance gets its own views. Related: WD-IDEA-CONT-104 to WD-IDEA-CONT-109 (the asset transformation model).

## Time of day, weather, and state variants

Time of day and weather are also carried by the heading parse (see WD-IDEA-LOC-129), the scene bible's per-scene lighting lock (see WD-IDEA-LOC-194), and the optional light-source image for 3D worlds; damage and transformation states fall under scene overrides.

- **WD-IDEA-LOC-252** [idea] An environment description in a frame prompt covers location type, architecture/materials, furniture and surfaces with condition, props with rough positions, depth layers (fore/mid/background), atmospheric visuals (dust motes, steam, fog, rain on glass), time of day as visible light (not a narrative beat), and weather only as visible. ‹src: Frame_Video_Prompt_Format_Guide›
- **WD-IDEA-LOC-253** [planned] Each shot's setting describes the specific part of the location visible in that shot, its lighting, time-of-day cues, and atmosphere.
- **WD-IDEA-LOC-254** [idea] A location may need more than one establishing view (a day and a night version), so view naming must allow variants like establishing_day / establishing_night. ‹src: 3.7-location-system-enhance-analysis›

## 3D worlds per location ("film studio")

- **WD-IDEA-LOC-255** [planned] Film-studio model: worlds are generated per unique location, not per scene; a location used in scenes 3, 7, and 11 gets one world, revisited to capture angles for each (blocking: see 07).
- **WD-IDEA-LOC-256** [rejected] Regenerating the world per frame or per scene: one world per location.
- **WD-IDEA-LOC-257** [future] 3D previsualization: 360° panoramas of environments in a game engine, style-transferred into backgrounds that are consistent by construction; full previs tooling later.
- **WD-IDEA-LOC-258** [voice] A world built from a few environment references from different directions is sloppy (noise, artifacts, not photoreal) but gives a working semblance of the scene's 3D space, which is enough. ‹src: voice-message-5-2›
- **WD-IDEA-LOC-259** [planned] Studio Lobby: a lot overview with a card per unique location showing name, scenes that use it, saved-angle count, and world status (not generated / generating / ready), each with "Enter Studio".
- **WD-IDEA-LOC-260** [planned] World generation is lazy: it starts on first "Enter Studio", avoiding spend on locations never blocked.
- **WD-IDEA-LOC-261** [planned] Seed images come from the location's existing references, optionally plus 1–2 extra angles; a light "World Gen Images" subsection on the location tags which references to use and accepts drag-ins, feeling like a minor addition, not a new flow.
- **WD-IDEA-LOC-262** [planned] Ideal input is 3–5 images: establishing wide/aerial (required, layout and scale), eye-level hero (required, main dramatic position), opposite wall/reverse (required, depth both ways), detail/texture close-up (optional), light-source direction (optional). Three is minimum viable; more than five has diminishing returns.

### Options: world input modes
- **WD-IDEA-LOC-263** [alt, impl] Guided: four azimuth drop slots (Front 0°, Right 90°, Back 180°, Left 270°) with previews, remove, and hints (eye-level hero, side, opposite wall/reverse, window wall).
- **WD-IDEA-LOC-264** [alt, impl] Free: 2–8 images in any arrangement; spatial layout inferred.
- **WD-IDEA-LOC-265** [alt, impl] Text only, single video, or single image (optionally flagged panoramic).
- **WD-IDEA-LOC-266** [alt] Earlier plain multi-image uploader (drag and drop) recommending establishing wide/aerial, eye-level hero, and reverse, with removable thumbnails.

### Angle capture
- **WD-IDEA-LOC-267** [planned] Integrated, the directional slots map to the location's existing views (establishing = front; other directions = right/back/left).
- **WD-IDEA-LOC-268** [planned] Angle Library per location: every capture is saved with location, timestamp, optional label ("over-shoulder reverse"), and the scene/shot selected at capture; visible in the studio for labeling, deleting, and seeing assignments.
- **WD-IDEA-LOC-269** [planned] A scene selector inside a location's studio lists every scene using it and their shots; selecting a target shot auto-tags captures; unassigned angles can be captured for later sorting.
- **WD-IDEA-LOC-270** [impl, future] Worlds can be swapped at runtime within a session, loaded pre-built to skip generation, or produced by a different provider without changing blocking; a generated world links back to its provider's editor.

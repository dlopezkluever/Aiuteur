# 06 Visual Development & Assets

> Scope: characters, props, extras, visual style capsules, references, the asset library, master vs scene assets, extraction, upload, and scene/shot assignment for visual consistency; locations live in 06B. Legacy product thinking, not a description of current behavior. Legend: see 00-README.

## Object model

Assets live in three tiers: the user's global library, project (master) assets defined in Stage 5, and scene asset instances defined in Stage 8. Shots draw their references from the scene instances.

- **WD-IDEA-ASSET-001** [impl] Three asset tiers: a per-user global library reused across projects, project (master) assets defined in Stage 5, and scene asset instances defined in Stage 8. Asset state flows down the tiers, then into continuity tags (see 04).
- **WD-IDEA-ASSET-002** [impl] Asset types: character, prop, location (see 06B), and extra archetype. Each asset has a master description and a reference image ("image key").
- **WD-IDEA-ASSET-003** [impl] A project asset's origin is tracked: extracted from the script, created manually, cloned from the global library, or created from a Streamline image import. ‹src: streamline-plan-critique-8-1, streamline-implementation-spec-8-3›
- **WD-IDEA-ASSET-005** [planned] The inheritance chain from master to scene instance to later scenes is tracked strongly enough to validate end to end (see 04).

## Visual style capsules

- **WD-IDEA-ASSET-006** [impl] Style is applied deterministically: the user picks a capsule and the system injects it as text plus metadata into AI instructions, with no similarity retrieval. Reproduction is exact and predictable. The cost: capsules are curated by hand, with no automatic discovery. ‹src: tech-stack, architecture-and-rules›
- **WD-IDEA-ASSET-007** [rejected] A retrieval/embedding (RAG) approach to style consistency was dropped and replaced by deterministic capsules. ‹src: development-progress›
- **WD-IDEA-ASSET-008** Two capsule kinds, writing and visual, kept strictly separate.
- **WD-IDEA-ASSET-009** A writing capsule holds example excerpts, high-level descriptors, and negative constraints (what not to imitate). It can be injected into the treatment, beat sheet, and script steps (see 05).
- **WD-IDEA-ASSET-010** A visual capsule holds reference images, descriptors ("minimalist", "ornate"), negative constraints, and design pillars: structured aesthetic definitions covering color palette, mood, medium, lighting, and camera language. It can also hold locked example frames.
- **WD-IDEA-ASSET-011** The visual capsule acts as a "visual style lock" applied to master reference images, scene asset states, and frame prompts (see 08).
- **WD-IDEA-ASSET-012** Styles set early must be injected into later outputs (shot lists, image prompts, video prompts). This matters most between the master script (Stage 4) and the shot list (Stage 7), and across visual refinement (Stages 8–10). ‹src: tech-stack›
- **WD-IDEA-ASSET-013** Capsules are versioned together with prompts and assets. ‹src: tech-stack›
- **WD-IDEA-ASSET-015** [impl] Style audit trail: every capsule application is logged with the capsule version, the stage output and context it was applied to, who applied it, and why.
- **WD-IDEA-ASSET-016** Quality expectation: writing and visual capsules fit the genre. Examples: conversational/character-driven for dialogue drama, technical/action-oriented for a heist, documentary/educational and clean/professional for a podcast. ‹src: golden-test-evaluation-framework›

### Capsule library

- **WD-IDEA-ASSET-017** User-level style capsule library for creating and managing writing and visual capsules. Preset capsules can be duplicated and customized.
- **WD-IDEA-ASSET-018** [impl] Library browsing: separate Writing Styles and Visual Styles tabs, search, a type filter, an all/presets/custom filter, and grid/list views.
- **WD-IDEA-ASSET-019** [impl] Preset capsules are read-only; to customize one, the user duplicates it and edits the copy. Custom capsules can be created, edited, favorited, and deleted (with confirmation).
- **WD-IDEA-ASSET-020** Legacy workaround: capsule reference images uploaded to a personal space were made publicly viewable to fix a storage-permission error. That is not the intended access model; the required model is private, authenticated access to user-generated media (WD-IDEA-ALT-013). ‹src: storage-rls-error-work-around›

### Options: grouping capsules into libraries
- **WD-IDEA-ASSET-021** [alt] Capsules are organized into named, user-owned libraries (user-made or preset collections). A library can be marked public for sharing beyond its owner.
- **WD-IDEA-ASSET-022** [rejected, voice] Auto-created libraries, so users wouldn't have to think about them. The creator chose no libraries: simple capsule creation with just a name and content, distinguished only by "Preset" vs "Custom" badges. ‹src: libraries-for-style-capsules›

## Project visual style (Stage 5)

- **WD-IDEA-ASSET-024** [planned, voice] Manual visual tone as an alternative to choosing a capsule. It offers presets (3D animation, hyperrealistic, noir, 2D animation, etc.) plus a custom plain-English description, richer than a single text box, mirroring the Stage 1 manual writing tone. The creator's note stresses that choosing a style guide is not mandatory: plain-English style or tone text alone is enough ("you don't have to choose a style guide"), which sits against Stage 5 treating a visual style lock as a gate (see 13). ‹src: new-tasks› The user never has to pick a capsule. ‹src: Tickets, new-tasks›
- **WD-IDEA-ASSET-025** [planned] A custom visual-tone description can be promoted into the starting point of a new visual style capsule. ‹src: Tickets›
- **WD-IDEA-ASSET-026** [planned, voice] The style is not immutably locked. It can be changed after selection with a warning about downstream impact. Any change made after unlocking the style guide triggers a branch, whether early or late in production. Related: WD-IDEA-UX-029, WD-IDEA-UX-035. ‹src: Tickets, new-tasks›
- **WD-IDEA-ASSET-028** [impl] Each asset records which visual capsule its image was generated under.
- **WD-IDEA-ASSET-029** The user confirms the visual style for each scene in Stage 8. ‹src: project-overview›

## Style vs identity: influence balance

- **WD-IDEA-ASSET-030** [impl, planned] Influence hierarchy: a master (or scene-instance) reference image has the highest priority. The visual capsule shapes the look but never overrides identity. Identity references are placed before style references in the image order. The capsule must still visibly affect asset images; it once had no visible effect. When style reference images overwhelm identity references, style images are limited while asset references are present. ‹src: Tickets, MVP-tasklist-v1.1, 3.8-phase1-asset-inheritance-fix›
- **WD-IDEA-ASSET-031** [voice] Top complaint: capsules overrode master reference images. The creator wanted a better default balance between capsule and reference, fixed early. ‹src: injecting-org-tickets-into-plan›
- **WD-IDEA-ASSET-032** [planned] Capsule influence slider (0–100%) in Stages 5, 8, and 10. 0% = master reference only; 100% = full capsule style override. Defaults to a balanced value, saved per project, possibly with real-time preview.

## Asset extraction

Extraction runs once on the approved master script. It produces the master asset list plus a scene map of which assets appear in which scenes. Later stages consume that map.

- **WD-IDEA-ASSET-035** [planned] Re-extraction triggers: a master-script change, mandatory branching, or a user "Re-extract Assets" action. It regenerates the asset list and scene map, preserves manually added assets, and flags downstream stages for review (see 10).

### Deterministic identification rules

- **WD-IDEA-ASSET-040** Anyone who speaks is a character. The character list and per-scene presence come from dialogue lines.
- **WD-IDEA-ASSET-041** Counting each character's dialogue lines separates leads from one-line extras. ‹src: tiptap-json-extraction-guide›
- **WD-IDEA-ASSET-042** Non-speaking characters are detected by scanning action lines for already-known names, so silent characters are still mapped to the scene.
- **WD-IDEA-ASSET-043** Props come from the screenplay convention of capitalized nouns in action lines (BRIEFCASE, REVOLVER). Screenplay terms (INT, DAY, CUT, POV, SFX…) and known character names are ignored.
- **WD-IDEA-ASSET-044** Props not written in caps are found by a lightweight AI pass over action text only, not the whole script, to save cost. ‹src: tiptap-json-extraction-guide›
- **WD-IDEA-ASSET-045** [impl] Scene-level dependency extraction records names exactly as written ("THE GUARD", "his watch"); matching them to existing assets is a separate step. A scene's location comes from its heading but can be refined when the action names a more specific place (see 06B). Related: WD-IDEA-LOC-129 (heading-based location) and WD-IDEA-LOC-132 (shot-level resolver). ‹src: system-prompts-inventory›
- **WD-IDEA-ASSET-046** [impl] Aliases and name variants merge into one asset ("John" = "John Doe" = "Mr. Doe"; "John's kitchen" = "Kitchen").

### Options: who identifies entities
- **WD-IDEA-ASSET-047** [alt] AI catalog pass over the master script and its per-scene mention lists. Characters are any named person or creature with dialogue or significant action. Props are objects mentioned repeatedly, plot-critical, or visually distinctive. Settings are every place a scene occurs. ‹src: AI-agent-registry-context-flow-architecture›
- **WD-IDEA-ASSET-048** [alt] The AI extracts everything without filtering by importance, flags each asset Key (3+ mentions) or Supporting (1–2), and gives it a prominence score. ‹src: AI-agent-registry-context-flow-architecture›
- **WD-IDEA-ASSET-049** [alt, impl] Discovery keeps only tangible, visual assets, excluding abstractions (atmosphere, tension, mood), and is limited to main characters, important props, and primary locations. ‹src: system-prompts-inventory›
- **WD-IDEA-ASSET-050** [rejected] AI-based entity identification as the first pass is replaced by deterministic extraction. The AI only writes visual descriptions for entities already identified. ‹src: tiptap-json-extraction-guide›

### Two-pass extraction and filtering

- **WD-IDEA-ASSET-051** [impl] Two-pass extraction. Pass 1 is a cheap or free deterministic preview of entity names, types, and scene mentions, grouped as Characters, Locations, and Props. The user filters, then pass 2 writes descriptions and image prompts/images only for the selected assets.
- **WD-IDEA-ASSET-052** [impl] The filter is a compact checklist (name and category only, no descriptions or images) grouped by category. Every asset starts selected, with Select All/None per category, an asset count, and "Confirm Selection (X assets)". Its job is to drop assets not worth pre-generating.
- **WD-IDEA-ASSET-053** [impl] The AI proposes candidates and the user confirms which to keep. When nothing is found, the user adds assets manually.
- **WD-IDEA-ASSET-054** [voice] Stage 5 should offer bulk delete, and all assets collapsed by default so the user can strip unwanted ones fast. ‹src: Issues›

### Options: filter actions
- **WD-IDEA-ASSET-055** [alt] Keep/Select-only checklist (above), where removal always sidelines rather than deletes.
- **WD-IDEA-ASSET-056** [alt, voice] Three columns per asset: Keep (default), Defer (real, but not now), and Delete (wrong extraction or too minor). A small section lists deferred assets with their scenes. ‹src: master-mvp-tasklist›

### Descriptions

- **WD-IDEA-ASSET-057** [impl] Each asset's master description is synthesized from every script mention, cleaned and merged into one. The exact per-scene excerpts it came from are kept.
- **WD-IDEA-ASSET-058** The description is fully editable and supports targeted rewrites ("change eye color to green"). ‹src: project-overview›
- **WD-IDEA-ASSET-059** [impl] Descriptions are short (3–5 sentences), physical-only, and made of concrete details an image model can render.
- **WD-IDEA-ASSET-060** [impl] When the script describes an asset in conflicting ways, the description points out the conflict instead of silently resolving it. ‹src: system-prompts-inventory›
- **WD-IDEA-ASSET-061** [impl] Descriptions are written to fit the chosen visual style. The AI also judges whether each asset is a main character/key prop or a background element.
- **WD-IDEA-ASSET-062** Quality expectation: descriptions cover age, appearance, and clothing. Image keys fit the genre (dynamic poses and equipment for action; speaking poses and presentation materials for podcasts). The asset set is complete but not inflated. ‹src: golden-test-evaluation-framework›
- **WD-IDEA-ASSET-063** Audio-driven projects: hosts look the way the audio describes them, visual aids (charts, graphics) are defined as assets, and asset states change with topic transitions. Related: WD-IDEA-STORY-093, WD-IDEA-STORY-094. ‹src: golden-test-evaluation-framework›
- **WD-IDEA-ASSET-064** [voice] Once assets are defined, optionally build a hidden "master descriptive document" from them. ‹src: new-tasks›

### Manual and deferred assets

- **WD-IDEA-ASSET-065** [impl] Users manually add assets extraction missed (name, type, description, optional image prompt) in Stage 5 or Stage 8, without triggering re-extraction. Manual assets join the scene dependency map, can be assigned to scenes by hand, and survive re-extraction.
- **WD-IDEA-ASSET-066** [impl] Removing an asset in Stage 5 defers (sidelines) it instead of deleting it. It is hidden from Stage 5 and the pipeline but keeps its scene information, and it can be restored. It stays available to Stages 8 and 10, where AI can generate it on the fly from script context.
- **WD-IDEA-ASSET-067** [voice] Deferred assets appear in Stage 8. In their first scene they have no master reference; in later scenes they show the scene-instance images generated or uploaded earlier. ‹src: master-mvp-tasklist›
- **WD-IDEA-ASSET-068** [impl] Deferred assets have no action menu, so per-asset tools (e.g. location camera directions, see 06B) work only on active assets. ‹src: 3.7-location-rd-1-testing-guides›

## Characters, props, and extras

### Extra archetypes

- **WD-IDEA-ASSET-069** [voice] Extra archetypes are a user-authored creative addition to the world ("my world has this type of background figure"), not a reclassification of characters found in the script. Extraction never finds them, because they are never named. ‹src: extra-archtype-info›
- **WD-IDEA-ASSET-070** [planned, voice] One prototype entry stands for a whole class of background characters with little or no dialogue (e.g. "Impoverished Plebeian" in plague-era France), so no extra needs individual persistent identity. Included in MVP. ‹src: Tickets, injecting-org-tickets-into-plan›
- **WD-IDEA-ASSET-071** A character asset means "exactly this person, always". An extra archetype is a template from which frame/video generation spawns background figures recognizably of that type, with natural variation. ‹src: extra-archtype-info›
- **WD-IDEA-ASSET-072** Stage 5 has a dedicated "Add Extra Archetype" action: name it ("Zorblaxian Alien", "Medieval Peasant"), describe its visual traits, and optionally generate or upload a reference.
- **WD-IDEA-ASSET-073** Archetypes form a fourth group in the Stage 5 asset grid, alongside characters, locations, and props.
- **WD-IDEA-ASSET-074** The archetype reference image is its key prototype but optional. Text-only archetypes are allowed, and an image can be added later without blocking Stage 5, since some users won't assign extras until Stage 8. ‹src: extra-archtype-info›
- **WD-IDEA-ASSET-075** Archetypes are created globally in Stage 5 (optionally also at scene level) and assigned to scenes in Stage 8 ("this scene is on the alien planet, include Zorblaxian Aliens"). They count as mise-en-scène in scene dependencies and serve as references for frame generation.
- **WD-IDEA-ASSET-076** [rejected] Earlier extras options, including reclassifying an extracted character as an extra, did not fit. They were replaced by the user-created archetype type. ‹src: extra-archtype-info›

### Options: characters whose state changes across the story
- **WD-IDEA-ASSET-078** [voice] For that option, extraction gets a rule allowing several "changed-state assets" per character. Related: WD-IDEA-CONT-057 (the multiple-assets option). ‹src: post-tickets›
- **WD-IDEA-ASSET-080** [alt, voice] A section in scene asset definition describes how a character changes shot by shot within the scene (e.g. in shot 7F the space suit cracks, he bleeds, his face reddens). The creator suspected this is a bad idea. Related: WD-IDEA-CONT-068 (mid-scene changes are not predefined upstream). ‹src: post-tickets›
- **WD-IDEA-ASSET-081** [future, voice] Per-shot refinement without image generation. The asset is set at scene start; while cycling through shots, the user adds descriptive tags for what changed, which enrich that shot's frame and video prompts. ‹src: post-tickets›
- **WD-IDEA-ASSET-082** [voice] Open uncertainty: the scene instance may need to break down further into shot-by-shot asset instances, though the creator hopes not. ‹src: new-tasks›
- **WD-IDEA-ASSET-083** [voice, idea] Because shot prompts and scene asset states are mutually dependent, the creator considered swapping Stages 8 and 9 so shot-by-shot prompts exist before scene assets are edited. ‹src: post-tickets›

## Master asset definition (Stage 5)

### Image keys

- **WD-IDEA-ASSET-084** Each asset's image key is generated from its edited description plus the locked visual style. The user iterates with a guidance box ("make the hair redder") until satisfied, then locks the master asset.
- **WD-IDEA-ASSET-085** The image key prompt opens with the asset's type and name. It includes every physical characteristic from the master description, specifies reference-sheet lighting, angle, and composition, applies capsule cues, and respects content rating and genre. ‹src: AI-agent-registry-context-flow-architecture›
- **WD-IDEA-ASSET-086** Master reference images are references, not scenes: no action or narrative elements.
- **WD-IDEA-ASSET-087** [planned, impl] Characters, props, and extras are generated isolated on a clean background (transparent, white, or black). The instruction is injected invisibly at generation time, so frame generation isn't confused by background noise or other characters. Locations never get isolation (see 06B). Related: WD-IDEA-LOC-011, WD-IDEA-ASSET-120.
- **WD-IDEA-ASSET-088** [impl] Two ways to get an image key: upload one (PNG/JPEG/WebP, up to 10 MB) or generate it. "Generate all missing" fills every gap at once.
- **WD-IDEA-ASSET-089** [voice] Stage 5 master assets get the same multi-image carousel as Stage 8. Users generate and upload several images (about 4), all are stored, the user picks the active one, and users are encouraged to delete off-target ones. This matters most for assets that change dramatically over the story. ‹src: master-mvp-tasklist, planning-wif-lawrence›
- **WD-IDEA-ASSET-090** [impl] Users can delete any uploaded or predetermined image, returning the asset to description-only so its look is no longer fixed.
- **WD-IDEA-ASSET-091** [voice] Regenerating a Stage 5 asset whose image the user uploaded must balance faithfulness to the upload against the requested changes. ‹src: 3.7-tasks-part-1›

### Options: background isolation method
- **WD-IDEA-ASSET-092** [alt] Prompt-only isolation.
- **WD-IDEA-ASSET-093** [alt] Background-removal post-processing (removes halos and solid backgrounds) as a safety net, A/B tested against prompt-only isolation.

### Options: are images required?
- **WD-IDEA-ASSET-094** [planned] Images are optional for all assets. Users generate or upload only for assets they care about. An imageless asset shows a placeholder ("Upload or Generate"), still carries its description into production, and doesn't block leaving Stage 5.
- **WD-IDEA-ASSET-095** [alt, planned] Limit the image-optional rule to props in Stage 5, since minor props are the clearest case where images are unnecessary. ‹src: Tickets›

### Angle variants

- **WD-IDEA-ASSET-097** [planned, impl] Multi-angle assets: front, side, three-quarter, and back views of characters (and props) on clean backgrounds, like engineering drawings, each generated independently. Frame generation receives the view matching each shot's camera direction. Included in MVP. Locations use a different view model (see 06B).

### Asset management

- **WD-IDEA-ASSET-098** [impl] Per-asset actions: edit visual description, delete, defer, restore, and change type (character / prop / location / extra archetype).
- **WD-IDEA-ASSET-099** [impl] Merge several selected assets into one (e.g. duplicates from extraction).
- **WD-IDEA-ASSET-100** [impl] Split an asset into scene-specific variants. Select mode offers both Merge and Split.
- **WD-IDEA-ASSET-101** [voice, impl] Merge works on image-approved assets: the survivor keeps its image, and the user is warned that the absorbed assets' images will be lost. ‹src: ui-fixes›
- **WD-IDEA-ASSET-102** [voice, impl] Change Type stays available after an asset's image is approved. ‹src: ui-fixes›
- **WD-IDEA-ASSET-103** Legacy edge case: there is no "deselect image" action, so any lock tied to image selection traps the asset (no type change, no merge). ‹src: ui-fixes›
- **WD-IDEA-ASSET-104** [voice, impl] Truncated descriptions in the grid get an inline "Show more/less" toggle, so users can compare descriptions (e.g. before merging) without opening an editor. ‹src: ui-fixes›
- **WD-IDEA-ASSET-105** [voice] The asset editor modal must scroll, and props must be deletable. ‹src: new-tasks›

### Options: what Change Type does to an approved image
- **WD-IDEA-ASSET-106** [alt] Clear the selected image and prompt regeneration. ‹src: ui-fixes›
- **WD-IDEA-ASSET-107** [alt] Keep the image as is. ‹src: ui-fixes›

### Options: locking master assets
- **WD-IDEA-ASSET-108** [impl] Each project asset can be locked individually during Stage 5. Stage 5 ends with a visible, working lock-all-and-proceed action.
- **WD-IDEA-ASSET-110** [voice, impl] The completion button reads "Finalize Assets", not "Lock All Assets & Begin Production", so users don't expect rendering to start. ‹src: ui-fixes›

### Voice profiles

- **WD-IDEA-ASSET-111** [future] A master character can be linked to a voice profile (e.g. an ElevenLabs voice) in the asset editor during global asset definition, with a voice preview. The profile acts as a "voice seed" in every video call so the character sounds identical across clips. Native video audio does not keep a character's voice consistent across shots, which this fills (see 09).

## Uploads and image reconciliation

- **WD-IDEA-ASSET-112** [voice] Problem: AI extraction won't always match the user's vision, and uploaded custom images can differ meaningfully from the auto-generated description. ‹src: 3.7-tasks-part-1›
- **WD-IDEA-ASSET-113** [voice, impl] Uploading an asset image triggers AI analysis that proposes a description from the image, so the stored description matches the custom design. Goal: the user ends with an image they like and a description that matches it.
- **WD-IDEA-ASSET-114** A layman's real photo, rough sketch, or imperfect generated image should become a pipeline-ready asset without a separate design workflow. ‹src: streamlined-input-process-consolidated›
- **WD-IDEA-ASSET-115** Never blindly accept an uploaded image or blindly overwrite existing text.
- **WD-IDEA-ASSET-116** [impl] Review modal layout: the current description (read-only), the description extracted from the image (read-only), and an editable Final Description pre-filled with an AI merge of the two. The Final Description is what gets saved.
- **WD-IDEA-ASSET-117** [impl] A confidence badge shows how closely the AI thinks the uploaded image matches the asset's existing description.
- **WD-IDEA-ASSET-118** [voice, impl] "Edit Image": the user types only what should change ("change suit to jumpsuit", "add scar on left cheek"). Generation uses the current image as reference plus that instruction, skipping the full description, which could confuse the AI.
- **WD-IDEA-ASSET-119** [voice, impl] "Apply Visual Style" re-renders the uploaded image in the project capsule; e.g. a real photo of yourself becomes the Pixar-style you in a Pixar-style project. ‹src: 3.7-tasks-part-1›
- **WD-IDEA-ASSET-120** [voice, impl] "Remove Background / make white" applies to character, prop, and extra uploads so the image works cleanly as a reference in later generation calls. It is hidden for locations.
- **WD-IDEA-ASSET-121** [voice, impl] "Regenerate from Description" makes a fresh image from the final description plus capsule, without the upload as reference.
- **WD-IDEA-ASSET-122** [impl] A "use current image as reference" toggle governs regeneration (see 08 for the other places it appears).
- **WD-IDEA-ASSET-123** [voice] Canonical case: upload a photo of a character in a suit when the story needs an orange prisoner jumpsuit. Change the description to "orange jumpsuit" and regenerate with the upload as reference; the same character now wears the jumpsuit. ‹src: 3.7-tasks-part-1›
- **WD-IDEA-ASSET-124** [impl] The preview updates after every action, with a carousel of all attempts produced in the session.
- **WD-IDEA-ASSET-125** [impl] Accept saves the Final Description plus whichever image is currently shown (the last edited, styled, background-removed, or regenerated one) as the asset's active image. Cancel discards everything and reverts to the pre-upload state.
- **WD-IDEA-ASSET-126** [voice, impl] Background removal starts as an image-generation redraw ("isolated on plain white background, no environment, no other characters or objects"). A dedicated segmentation model comes later (see 08). ‹src: 3.7-threads›
- **WD-IDEA-ASSET-127** [voice, impl] Any regeneration of an isolated asset (edit-image and apply-style included) automatically produces a white background.
- **WD-IDEA-ASSET-128** [voice, impl] Stage 5 (master assets) and Stage 8 (scene instances) share one upload modal. In Stage 8, "current description" is the scene's effective description, produced images become scene-instance attempts, the accepted description is saved as a scene override, and the master reference can serve as an extra identity anchor.
- **WD-IDEA-ASSET-129** [rejected] Earlier behavior: Stage 5 offered only keep current / replace with extracted / use merged, with no iteration, and Stage 8 uploads became the scene image with no reconciliation at all. Replaced by the shared enhanced modal.

### Options: reconciliation design
- **WD-IDEA-ASSET-130** [rejected, voice] Three-column Description Reconciliation modal (existing / extracted from image / editable merge built from both plus the user's own input), modeled on the merge-assets modal. Replaced by a simpler enhancement of the existing upload modal. ‹src: 3.7-tasks-part-1, 3.7-threads›
- **WD-IDEA-ASSET-131** [planned] Description-from-image choice: keep the existing description, replace it with the image-based one plus missing script details, or merge the two, previewed before confirming, mirroring cloned assets in asset matching.
- **WD-IDEA-ASSET-132** [alt, rejected] Agentic "Merge Descriptions" tool: the user specifies which parts of each description to keep, and AI merges them into one cohesive description.
- **WD-IDEA-ASSET-133** [alt, rejected, voice] Tag-based adjustment: keep a base description and add directional tags (jumpsuit, wet, bloody, sad, sweaty) for the AI to apply. Judged unnecessary because a free-text Edit Image box covers it. ‹src: 3.7-tasks-part-1, 3.7-threads›

### Options: upload intent
- **WD-IDEA-ASSET-134** [alt, voice] Two explicit intents: Full Replacement (the image IS the asset; the description updates to match) vs Starting Point (the image is a reference to iterate toward the final vision). ‹src: 3.7-tasks-part-1›
- **WD-IDEA-ASSET-135** [impl, voice] Implicit intent replaced the explicit modes. Upload always opens the enhanced modal; the user accepts as-is or iterates with image actions. An explicit toggle is only worth it if the modal would differ meaningfully, since as-is uploads may still want background removal or styling. ‹src: 3.7-threads, streamlined-input-process-consolidated›

### Batch image intake (Streamline)
- **WD-IDEA-ASSET-138** [planned] Heavy per-image actions (Edit Image, Apply Visual Style, Remove Background, Regenerate) are excluded from intake and done after commit through the normal Stage 5 reconciliation flow. Related: WD-IDEA-INPUT-106 (the batch grid).
- **WD-IDEA-ASSET-139** [rejected] Handing each Streamline image to the one-at-a-time upload modal (N modals in sequence) was replaced by the batch screen, since the assets to reconcile against don't exist yet at intake.

## Global asset library and promotion

- **WD-IDEA-ASSET-140** The global asset library holds master assets (characters, props, locations) independent of any project, usable as templates for new projects.
- **WD-IDEA-ASSET-141** [impl] Library browsing: search by name, grid/list views, All/Characters/Props/Locations tabs, and create/edit/delete.
- **WD-IDEA-ASSET-142** [impl] Deleting a library asset checks for dependents before confirming.
- **WD-IDEA-ASSET-143** [impl] "Promote to Global" clones a master asset or a scene instance (image plus description) into the user's library; also available from the Artifact Vault. It requires an image. The global copy remembers its source project, and the project asset links to it.
- **WD-IDEA-ASSET-144** [impl] A global asset can be cloned into a project. The project asset remembers which version of the global asset it came from.
- **WD-IDEA-ASSET-145** [impl] When reusing a global asset, the user can choose a merge strategy. The global description is the canonical base; the project description adds or modifies details without contradicting it, keeping every important visual detail from both. ‹src: system-prompts-inventory›
- **WD-IDEA-ASSET-146** [future] Richer promotion: promote scene instances with asset versioning, templates, and sharing between projects.

## Scene asset instances (Stage 8)

### Population and suggestions

- **WD-IDEA-ASSET-149** [impl] Stage 8 works with scene-specific instances of project assets. An instance can be inherited from the previous scene, created from a project asset, detected from shot/script dependencies, or added manually.
- **WD-IDEA-ASSET-150** [impl] Scene 1 is bootstrapped from locked project assets matched by name to the scene's expected characters, location, and props. Later scenes inherit first (see 04).
- **WD-IDEA-ASSET-151** [impl] "Inherit from prior scene" copies the previous scene's asset states into the current scene as a starting point.
- **WD-IDEA-ASSET-152** Stage 8 auto-suggests the scene's assets from the extraction scene map, grouped by type. Each is labeled by source (master asset, prior scene instance, new scene asset) and review status (unreviewed, edited, locked).
- **WD-IDEA-ASSET-154** Relevance rules: include characters explicitly in the shot list, props mentioned or implied by the action, and every setting mentioned.
- **WD-IDEA-ASSET-155** Each relevant asset shows where its starting state came from (master or previous instance), its starting description, whether it needs a visual update, its inherited status tags, and why the scene needs it.
- **WD-IDEA-ASSET-156** [impl, voice] AI relevance detection suggests project assets that belong in the scene and discovers new assets the scene needs.
- **WD-IDEA-ASSET-157** New-asset proposals come with an inferred description and a justification.
- **WD-IDEA-ASSET-158** [planned] Suggestions persist across navigation and reload, show the AI's rationale, can be accepted or dismissed (dismissed ones don't reappear), aren't duplicated within a scene, and update when scene dependencies change.
- **WD-IDEA-ASSET-159** [impl] Stage 8 always offers three ways to add assets: from project assets, create a new asset, or "Detect with AI". Detection adds newly found library assets and saves suggestions for ones not yet in the library.
- **WD-IDEA-ASSET-160** [voice] Stage 8 should be mostly deterministic thanks to good extraction. Manual add/delete remains the correction path and must be reliable. ‹src: master-mvp-tasklist›
- **WD-IDEA-ASSET-161** Users must be able to re-add missed or accidentally deleted scene assets, add or delete after auto-population, and recategorize mislabeled assets (e.g. a prop extracted as a character).

### Options: does Stage 8 detect assets with AI?
- **WD-IDEA-ASSET-162** [alt] Use only the extracted scene map for suggestions, with no fresh AI relevance pass. ‹src: MVP-tasklist-v1.1›
- **WD-IDEA-ASSET-163** [alt] Keep AI relevance detection running, with its "new assets required" suggestions persisted and dismissable. ‹src: 1c-scene-asset-suggestions›

### Adding and removing scene assets

- **WD-IDEA-ASSET-164** [planned] Stage 8 has its own way to create a scene-specific asset from scratch, separate from pulling from the drawer. The button is labeled "Add New Assets", not "Create Scene Asset".
- **WD-IDEA-ASSET-165** [idea] Open questions: inline form vs drawer for scene-asset creation; job polling for bulk image generation. ‹src: Issues›
- **WD-IDEA-ASSET-166** [impl, planned] The asset drawer (Stage 8): add assets extraction missed, create scene-only assets, switch between project and global library sources, search and filter, stay fast with large libraries, and promote to global.
- **WD-IDEA-ASSET-167** [impl] "Remove from scene" removes only the asset's link to that scene (e.g. fixing a wrong extraction), never the project or global asset, and asks for confirmation.

### Scene images

- **WD-IDEA-ASSET-168** [impl] "Use Master As-Is" is checked by default and copies the master image to the scene instance with no generation. Unchanged assets progress instantly, saving time and money.
- **WD-IDEA-ASSET-169** [planned] Bulk "Use Master As-Is" across many scene assets, plus smart default selection.
- **WD-IDEA-ASSET-170** [impl] Stage 8 shows an asset's master reference next to its scene-instance image(s). The user can generate a scene-specific image, drop or upload their own, or use the master as-is.
- **WD-IDEA-ASSET-171** [impl] A scene-specific image never replaces the approved master image.
- **WD-IDEA-ASSET-172** Scene visual-state evolution: the user types scene modifications ("add mud", "change clothing"). The AI generates a scene image that keeps the master identity and style and applies only those changes. Related: WD-IDEA-CONT-017.
- **WD-IDEA-ASSET-174** [impl] Reference history carousel: a scene's starting reference defaults to the previous scene's instance (Scene 4 starts from Scene 3). Arrows cycle back through the chain (master, Scene 1, Scene 2…), and "Use This Reference" confirms. The first scene defaults to the master, scenes without instances are skipped, and scene deletion or reordering is handled.
- **WD-IDEA-ASSET-176** [impl] Generation attempts carousel. Every attempt is kept as a thumbnail with hover metadata (time, cost, prompt used), compared side by side, and any attempt (even the first) can be made active with "Select This One". Rationale: a regeneration can come out worse and the user must be able to revert. Old attempts follow a cleanup policy.
- **WD-IDEA-ASSET-177** [impl] The user can upload their own scene-instance image; it joins the attempts carousel alongside generated ones.
- **WD-IDEA-ASSET-178** Stage 8 flow: load suggested assets, toggle as-is, edit descriptions where needed, pick the reference from the history carousel, multi-select for bulk generation, compare attempts, apply condition tags with carry-forward (see 04).

### Scene-specific descriptions

Held with their owning topic in other documents: WD-IDEA-CONT-085 (see 04), WD-IDEA-CONT-089 (see 04), WD-IDEA-CONT-088 (see 04), WD-IDEA-CONT-091 (see 04), WD-IDEA-CONT-097 (see 04), WD-IDEA-CONT-103 (see 04).


### Options: proceeding with undecided scene assets
- **WD-IDEA-ASSET-185** [impl] Hard gate: every scene asset needs a visual reference before prompts. The block message says how many are missing.
- **WD-IDEA-ASSET-187** [voice, planned] When the user proceeds with undecided assets, a modal offers to fall each back to its latest scene instance or master reference. Undecided deferred assets are auto-generated. ‹src: master-mvp-tasklist›
- **WD-IDEA-ASSET-188** [alt, planned] Fallback order for untouched assets: (1) most recent previous scene instance, (2) master reference, (3) generate. ‹src: master-mvp-tasklist›
- **WD-IDEA-ASSET-189** [alt, planned] Tiered gating: primary characters must be generated; secondary props/locations may use master references; minor props get "Generate Later"; the user can override to force or skip generation.
- **WD-IDEA-ASSET-190** [alt, planned] An imageless asset is raised as a visual-definition issue ("Asset X has no image — generate or upload one before proceeding") rather than silently excluded from the reference set. ‹src: 3.8-phase1-asset-inheritance-fix›
- **WD-IDEA-ASSET-191** [alt] An imageless asset is simply excluded from the reference set. ‹src: 3.8-phase1-asset-inheritance-fix›

### Status tag tooling
Base status tags and carry-forward belong to 04. Proposed extensions:
- **WD-IDEA-ASSET-192** [future] Tag templates: predefined tag sets for common scenarios (e.g. "Fight Scene" = bloody, torn, sweaty). ‹src: Issues›
- **WD-IDEA-ASSET-193** [future] Tag history: when tags were added or removed across scenes.
- **WD-IDEA-ASSET-194** [future] Bulk tag operations across many assets at once.
- **WD-IDEA-ASSET-195** [future] Filter project assets by tag in the asset drawer.
- **WD-IDEA-ASSET-196** [future] Tag-based prompt enrichment: tags expand image prompts automatically ("muddy" becomes "covered in mud, dirty, realistic grime"). ‹src: Issues›
- **WD-IDEA-ASSET-197** [future] Tag severity levels ("light muddy" vs "heavy muddy").
- **WD-IDEA-ASSET-198** [future] Tag conflict detection warns about incompatible combinations ("clean" + "muddy").
- **WD-IDEA-ASSET-199** [future] A tag analytics dashboard shows tag usage across the project.

## Asset-to-shot assignment

- **WD-IDEA-ASSET-200** [impl] Stage 8 initializes shot-asset assignments, recording which assets appear in which shots (see 07).
- **WD-IDEA-ASSET-201** [planned, voice] Shot presence flags: each scene asset shows badges for the shot numbers it appears in, updated when the shot list changes.
- **WD-IDEA-ASSET-202** [planned, voice] Scene-instance images carry camera-angle metadata taken from the shot list's camera directions. It is viewable, editable, and passed to frame generation, so an aerial top-down shot isn't built from front-on medium references.
- **WD-IDEA-ASSET-203** [impl] The shot's camera description is parsed to pick the best-matching angle variant (front, side, three-quarter, back). That angle image is auto-selected and takes highest priority as the character's or prop's reference for the shot, followed by the scene-instance image, then the master image.

### Options: default shot-asset assignment
- **WD-IDEA-ASSET-204** [alt, impl] Auto-assign every scene asset to every shot as present "throughout": full coverage, but noisy semantics that need cleanup. ‹src: 4-15-location-analysis›
- **WD-IDEA-ASSET-205** [alt, planned] Confidence-scored preselection of assignments by default, keeping the all-assets fallback for safety. ‹src: 4-15-location-analysis›
- **WD-IDEA-ASSET-206** [planned] Smarter rule-based defaults: locations default to throughout; characters only if the shot names them in foreground/background; props only if the shot's action or setting mentions them. Assigning everything to every shot floods generation with irrelevant references.

### Blocking stand-ins (CineBlock)
- **WD-IDEA-ASSET-207** [impl] The blocking tool's scene assets are a flat pool of characters and props for the scene (name, type, one-line description such as "tall man, 30s, grey hoodie"). Shots draw from this pool (see 07).
- **WD-IDEA-ASSET-208** [impl] Each blocking asset is auto-assigned a distinct palette color on creation (color dot, changeable via picker), so its mannequin is identifiable during blocking.
- **WD-IDEA-ASSET-209** [planned] Removing an asset referenced in shots asks for confirmation and removes it from those shots.
- **WD-IDEA-ASSET-210** [planned] When integrated, blocking setup is auto-populated from the project: the scene's shots, its asset instances with scene-effective descriptions, and the location's directional views (see 06B). ‹src: prd-revised›

## Visual consistency in references and prompts

- **WD-IDEA-ASSET-212** Describe a subject as if briefing a casting director and costume designer: age, gender presentation, ethnicity, hair (color/length/style/texture), eyes, distinctive facial features, build, skin details (scars, tattoos, freckles), garments with colors/materials/fit/condition, accessories, and held props. Related: WD-IDEA-CONT-042, WD-IDEA-CONT-044 (same field set). ‹src: Frame_Video_Prompt_Format_Guide›
- **WD-IDEA-ASSET-213** Use 1–3 consistent reference images per character, with similar poses and clothing, and reuse the same set across every related clip in the project to reduce drift. Related: WD-IDEA-GEN-122.
- **WD-IDEA-ASSET-214** Up to three reference images per generation, typed by purpose: character reference (lock appearance), object/product reference (prop consistency), and style reference (aesthetic continuity). Related: WD-IDEA-GEN-119.

### Options: carrying a character's identity text across shots
- **WD-IDEA-ASSET-218** [alt] Define once, reference many: define a character, style, or setting once and reference it by name or alias in every shot. This keeps multi-shot sequences consistent while saving tokens. ‹src: veo-3-prompt-guide›

## Future and speculative

- **WD-IDEA-ASSET-219** [future, voice] Agentic web scouring to build a style capsule. The system searches the web for images matching a desired look and shows about 5. The user picks favorites, the system finds more, and it repeats until the user is satisfied or gives more direction. ‹src: truly strech›
- **WD-IDEA-ASSET-220** [future, voice] Style transfer training: the user uploads an image dataset and a LoRA-style model learns their visual style, with testing, deployment, and versioning of style models. A proprietary style-tailoring model is a related idea.
- **WD-IDEA-ASSET-221** [future] Character consistency training: build a character image dataset, train a character embedding/model, use it in generation, and share character models.
- **WD-IDEA-ASSET-222** [future] Film reference deconstruction: upload a reference clip or frame sequence and extract its visual style, shot types, camera-movement patterns, and color palette. The result is offered as a starting visual capsule or as location view references (see 06B).
- **WD-IDEA-ASSET-223** [future, voice] "Anime mode" for anime lovers. ‹src: new-tasks›
- **WD-IDEA-ASSET-224** [future, voice] Sample library: a curated clip library supplied by the product, or better, a global library pooled from all clips users have submitted. ‹src: new-tasks›

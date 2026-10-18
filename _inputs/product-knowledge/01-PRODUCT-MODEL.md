# 01 Product Model

> Scope: what Aiuteur (WizardDirector) was meant to be: purpose, user, positioning, creative philosophy, recurring principles, and the creative object model. Legacy product thinking, not a description of current behavior. Legend: see 00-README.

## Object model

Creative objects flow from global to local. Phase A (Stages 1–5) produces project-wide truth; Phase B (Stages 6–12) translates it, scene by scene, into anchor frames and then video clips.

```
Project ── type (narrative short · commercial/trailer · audio-driven), global settings; private to its owner
└─ Story Timeline (branch) ── every stage output is a versioned, lineage-tracked artifact
   ├─ PHASE A · global truth
   │   Source material → Treatment → Beat Sheet → Master Script   (single source of truth)
   │   Style capsules: writing + visual; chosen explicitly, injected downstream
   │   Master assets: characters, props, locations (extracted from the Master Script)
   └─ PHASE B · local, per scene (scenes are cut from the Master Script)
       Scene ── scene asset instances (master asset + prior scene's end state + local edits)
        └─ Shot (from the scene's shot list)
            ├─ Frame prompt → start frame (+ optional end frame)    cheap image anchors
            └─ Video prompt → clip bridging the anchors            expensive, generated last
       Scene clips → assembled film → export package
Cross-project: global asset library · style capsule library · [future] lore library / creative fingerprint
```

- **WD-IDEA-PHIL-001** [impl] Aiuteur is a web app that turns written narratives into AI-generated short films through a deterministic, fixed 12-stage workflow instead of open-ended chat generation. Its two core promises are cost optimization and narrative continuity. The PRD states the value as automating that transformation through a strictly deterministic, cost-efficient, multi-stage workflow.
- **WD-IDEA-PHIL-003** Prompt templates are the creative backbone of the product. They encode narrative tone, visual language, pacing, and constraints for each stage, and are treated as versioned creative artifacts, not static strings (see 08). ‹src: tech-stack›
- **WD-IDEA-PHIL-004** [planned] Keep one stable vocabulary for continuity concepts across all docs and UI: ‹src: 5-2-location-product-synthesis, location-continuity-phase-0-audit, 5-3-location-implementation-plan›
  - *location*: the narrative space or room identity;
  - *location reference*: a baseline image or description of that space;
  - *location view / camera direction*: an advanced-mode viewpoint on the space;
  - *established view*: an approved frame promoted to a continuity anchor;
  - *continuity base*: an approved or generated frame chosen as the reuse/edit base for another shot;
  - *generation package*: the full set of prompt instructions, continuity decisions, fallback notes, ordered references, and risks for one frame generation;
  - *reference manifest* and *attachment role*: the ordered list of references sent with a generation and the role each one plays (see 06B, 08).

## Purpose and core problem

- **WD-IDEA-PHIL-005** Problem framing: current AI video tools are non-deterministic, expensive, and fail at narrative continuity (inconsistent characters, jump cuts, scene-to-scene drift). They behave like a slot machine where the user pays for high volumes of low-quality options.
- **WD-IDEA-PHIL-006** "The Inversion": plan first (lock story structure and style), anchor second (lock each shot's start/end frames with a cheap image model), generate last (spend expensive video generation once per shot, only to bridge pre-approved anchor frames). This order is the source of both consistency and cost control (see 02, 08). The mechanism is WD-IDEA-GEN-002 (frame prompts and video prompts are separate types) and WD-IDEA-GEN-007 (cheap image model for anchor frames; expensive video model only for the final bridge).
- **WD-IDEA-PHIL-007** Primary utility is "Story Consolidation and Management": the largest effort goes into stability and iterative control of narrative structure and visual style (Stages 1–5). Video is a result of the deterministic process, not the product's core feature. ‹src: project-overview›
- **WD-IDEA-PHIL-008** [voice] Core philosophy: take as much input context as the user provides, refine it down to the Master Script as the single source of truth, then expand outward from that script through the production cycle. Freezing the script as the single source of truth happens at approval (WD-IDEA-FLOW-019, WD-IDEA-FLOW-021). ‹src: Tickets, Input-Methods-Task, master-mvp-tasklist›
- **WD-IDEA-PHIL-009** "Creative compiler": early stages set global intent, middle stages narrow it step by step, late stages produce concrete media. ‹src: inheritance_contract›
- **WD-IDEA-PHIL-012** Let users start from imperfect but useful visual truth and iterate from there, in service of moving fast. ‹src: streamlined-input-process-consolidated›

## Target user

- **WD-IDEA-PHIL-013** [voice] The target user is the "middle 80%": creative people between two extremes. On one side, too-casual users who want AI to generate everything for them (Manus / NotebookLM-style one-click output). On the other, too-technical users who want granular control of every detail (Adobe Creative Suite users). ‹src: post-Aiuteur Poduct Mission & Philosophy›
- **WD-IDEA-PHIL-014** [voice] The target user has a story to tell (jokes, ideas, sketches, short films, animations; possibly a not-very-dedicated animator) but lacks the patience or technical depth to learn professional tools. ‹src: post-Aiuteur Poduct Mission & Philosophy›
- **WD-IDEA-PHIL-015** [voice] The target user is creative but not maximalist, and cares that the output has a human soul instead of being generic, algorithmically produced content. ‹src: post-Aiuteur Poduct Mission & Philosophy›
- **WD-IDEA-PHIL-016** [voice] Archetype: a ~20-something creative with some free time who mostly writes stories and jokes (meme and story videos; "part writer" types who normally rely on a team of animators). The product aims to be their team of animators. ‹src: voice-message-5-2›
- **WD-IDEA-PHIL-017** [voice] Turnaround goal: finish a piece within a day, e.g. see a news event and publish a parody the same day. Reference point: a viral, Sora-made, AI-animated satirical series on YouTube/Twitter. ‹src: voice-message-5-2›
- **WD-IDEA-PHIL-018** PRD target user: independent filmmakers, content creators, and marketing teams who need high-quality, stylistically consistent video prototypes or final products quickly and affordably. README tagline: "built for filmmakers who demand both creative control and production efficiency." ‹src: project-overview, README›
- **WD-IDEA-PHIL-019** Target users also include power users who already have scripts, and "true animators/filmmakers" who bring their own storyboards and reference material and want to guide generation precisely with it. ‹src: Tickets, master-mvp-tasklist, 3.7-maybe-redundant-stage-9-UI›

## Positioning: what it is and is not

- **WD-IDEA-PHIL-020** [voice] Positioning is a "happy middle" between one-shot AI generators and the Adobe suite. It gives creative people enough control to produce something intentional that reflects their vision, without learning professional animation or editing tools (no months of Photoshop). The product bounces between the two domains to serve the middle 80%. ‹src: post-Aiuteur Poduct Mission & Philosophy, voice-message-5-2›
- **WD-IDEA-PHIL-021** [voice] Not an Adobe replacement. Competing there needs a much bigger team and toolset and leaves little room to differentiate. The product deliberately gives up highly technical users who want every detail correct ("this is not the tool for them"). A feature that would only appeal to the top ~10% of detail-tweakers is designed incorrectly for this product. Not capturing everyone is intentional. ‹src: post-Aiuteur Poduct Mission & Philosophy, voice-message-5-2›
- **WD-IDEA-PHIL-022** [voice] Not a pure AI-video wrapper. Veo/Kling/Seedance-style wrappers ("Manus with a pretty UI") let the model do everything and yield cohesive-but-imprecise slop. The product does not serve the cheap, easy "let the LLM do everything, don't think about it, make something in an hour" audience. ‹src: voice-message-5-2, post-Aiuteur Poduct Mission & Philosophy›
- **WD-IDEA-PHIL-023** [voice] Not a slop generator. It is not a UGC/TikTok marketing-ad factory pumping out ~20 ads an hour with no human authorship. The creator sees those products as interchangeable, extractive, and "ruining the internet", in the same category as quick-buck B2B leeching apps, and predicts they will not win. ‹src: post-Aiuteur Poduct Mission & Philosophy›
- **WD-IDEA-PHIL-024** [voice] Not an agent-takeover product. Any feature that deviates from user input, removes creative control the user intends to exercise, or makes decisions the user didn't sanction is out of scope, even if such features are popular or trendy. Full autonomous master mode is questioned rather than ruled out (WD-IDEA-PHIL-026); this rule targets only automation the user did not sanction. ‹src: post-Aiuteur Poduct Mission & Philosophy›
- **WD-IDEA-PHIL-025** [voice] Contrarian thesis: people making art and short films with new video models, who want work with a human soul, do not actually want the agent to take over. ‹src: post-Aiuteur Poduct Mission & Philosophy›
- **WD-IDEA-PHIL-026** [voice] The creator questions a fully autonomous "master mode, let AI cook": if the AI does everything, why not just use a general agent like Manus? Full hands-off generation is not the differentiator, though the note marks it "NOT OUT [OF] SCOPE" (questioned, not ruled out). ‹src: Totally-New-Features›
- **WD-IDEA-PHIL-027** [voice] Precision is optional. Users may be more precise if they want, but the main value is saving them time. ‹src: voice-message-5-2›
- **WD-IDEA-PHIL-028** [voice] Explicit tradeoff: perfect continuity and accuracy are not the goal (that takes professional tools). The goal is quick, funny, true to the creator's intent, and not slop. ‹src: voice-message-5-2›
- **WD-IDEA-PHIL-029** Visual feel: a cinematic, editorial dark theme inspired by editing suites (Resolve, Premiere). Complex AI film production should feel like elegant professional editing software while staying intuitive (see 10). ‹src: ui-and-theme-rules›
- **WD-IDEA-PHIL-030** The product is desktop-first; mobile responsiveness is low priority. ‹src: missing_todos-not-sure›
- **WD-IDEA-PHIL-031** [future] Long-term ambition: a "world-class AI film generation platform" with professional-grade features comparable to industry tools, ready for beta users and marketing. Read as an output-quality aspiration from the v1.1 roadmap, not a commitment to Adobe-style granular control, which WD-IDEA-PHIL-021 rules out. ‹src: Post-MVP-tasklist, MVP-tasklist-v1.1›

## Experience principles

- **WD-IDEA-PHIL-032** [voice] Making a film should take some time and some effort, but the effort must never feel hampering. ‹src: post-Aiuteur Poduct Mission & Philosophy›
- **WD-IDEA-PHIL-033** [voice] Fast-flowing and never friction-inducing: users move through ideas quickly, never feel stuck or bogged down, and never hit a moment where they want to stop because a step is too hard or tedious. ‹src: post-Aiuteur Poduct Mission & Philosophy›
- **WD-IDEA-PHIL-034** [voice] Flexible pacing: users speed through the parts they don't care about and slow down to get precise on the parts they do. Recurring expressions are user-selectable "care" modes, e.g. for locations and for shot/camera complexity (see 06B, 07). Location-specific care modes (speed vs precision, low cost vs budget) are WD-IDEA-LOC-025. ‹src: post-Aiuteur Poduct Mission & Philosophy›
- **WD-IDEA-PHIL-035** [voice] Agentic features exist to accelerate the low-care tasks the user doesn't care about, never to replace the user's creative judgment. ‹src: post-Aiuteur Poduct Mission & Philosophy›
- **WD-IDEA-PHIL-036** [voice] Highly technical tools, canvases, and workspaces exist for when the user wants to get specific on details they care about, but are never imposed by default. ‹src: post-Aiuteur Poduct Mission & Philosophy›
- **WD-IDEA-PHIL-037** [voice] Later stages should be flexible and self-contained. A user reviewing work in a late stage should be able to fix things there instead of navigating back to an earlier stage (see 10). Where the fix belongs to an upstream stage, repair links route the user back to the owning stage (WD-IDEA-FLOW-063) instead of editing that owner from the late stage; fix-in-place applies to fixes the current stage owns. ‹src: 3.7-tasks-part-3›
- **WD-IDEA-PHIL-038** [voice] Stage 8 exists to add "final polish" to the assets the user cares about. Assets the user does not care about must never block progress (see 06). ‹src: Tickets, master-mvp-tasklist›
- **WD-IDEA-PHIL-040** [voice] Asset-upload end goal: the user ends with an image they like and a description that matches that image (see 06). ‹src: 3.7-threads, 3.7-phase-1-enhanced-upload-modal›
- **WD-IDEA-PHIL-041** [voice] Within-scene changes (a face gets bloodied, someone changes clothes, characters move to another room) must not require the user to hand-supply new asset and background images per shot. That tedium erases the time savings that justify the product (see 04). The location-level instance of this principle is WD-IDEA-CONT-100. ‹src: voice-message-5-2›
- **WD-IDEA-PHIL-042** First-time user experience is critical for retention and word-of-mouth growth (see 10). ‹src: MVP-tasklist-v1.1, missing_todos-not-sure›

## Determinism, explicitness, and control

- **WD-IDEA-PHIL-043** "Determinism over magic": inheritance rules are explicit and inspectable, and prompts never accumulate hidden content. ‹src: inheritance_contract›
- **WD-IDEA-PHIL-044** Small changes in early stages must have a deterministic effect on later stages, while controlled local overrides stay possible. ‹src: inheritance_contract, tech-stack›
- **WD-IDEA-PHIL-045** Every AI step receives an explicit, typed, versioned context package assembled deterministically from saved project state. No AI step "remembers" earlier outputs; everything it knows is passed in explicitly (see 08, 04).
- **WD-IDEA-PHIL-047** [impl] Immutable by default: a completed stage is never changed in place. Changes create new versions or branches, and every historical state stays queryable.
- **WD-IDEA-PHIL-048** [impl] Explicit inheritance tracking: every artifact records what it was derived from, so its lineage can always be traced.
- **WD-IDEA-PHIL-049** [impl,planned] Projects are meant to evolve non-linearly through branching ("Story Timelines") with a full audit trail. Each branch has a name, a parent branch, and a commit-style message. The branch data model exists; the branch UI (WD-IDEA-UX-083) is planned and full git-style branching (WD-IDEA-UX-090) is deferred.
- **WD-IDEA-PHIL-051** [voice] Creator belief: one-shot/few-shot reference examples have more potential than retrieval (RAG). This is consistent with explicitly chosen style capsules replacing retrieval (see 06). How well models interpret a sample clip and the user's request needs extensive testing. Retrieval was dropped for style (WD-IDEA-ASSET-007) and is deferred for very large lore universes (WD-IDEA-STORY-127). ‹src: new-tasks›
- **WD-IDEA-PHIL-052** Every future technical direction should preserve explicitness, debuggability, and the user's creative control. ‹src: tech-stack›
- **WD-IDEA-PHIL-053** [future] Recorded violations of the inheritance contract (user overrides of inherited values) could power analytics on "where users fight the system". ‹src: database-schema-state-transition-matrix›

## Cost and quality

- **WD-IDEA-PHIL-054** Cost awareness is core: regeneration cost is meant to be computed in advance at every stage transition (see 10). The cost formula is WD-IDEA-UX-071; invalidation warnings that show affected work are WD-IDEA-UX-044 and WD-IDEA-UX-045.
- **WD-IDEA-PHIL-055** Cost-conscious design: let users cut what they don't need before expensive generation, avoid redundant AI calls, and never spend credits regenerating content that upstream changes have already invalidated.
- **WD-IDEA-PHIL-056** [voice] The default experience should minimize the number of generations required. ‹src: post-clean-location-rethink›
- **WD-IDEA-PHIL-057** [planned] Cost management: track the cost of every real AI call, estimate and budget costs, recommend cost optimizations, and alert on excessive usage. Per-operation dashboards, per-user reports, budget alerts, and anomaly detection are future (WD-IDEA-GEN-268). ‹src: MVP-tasklist-v1.1›
- **WD-IDEA-PHIL-058** Technical accuracy is meant to be verified at every stage before credits are spent on expensive video generation. ‹src: golden-test-evaluation-framework›
- **WD-IDEA-PHIL-060** Success metrics for AI output: completeness (all required fields filled), accuracy (matches input and project parameters), consistency (character/asset continuity across stages), and technical compliance (correct formatting and model requirements). ‹src: golden-test-evaluation-framework›
- **WD-IDEA-PHIL-061** Three canonical "golden" test projects span the product's range: a simple two-person dialogue scene (narrative structure, character continuity), a complex multi-scene action heist (visual complexity, continuity, technical shot breakdown), and a 15-minute podcast-to-video (audio-driven visuals, timestamp sync). ‹src: golden-test-evaluation-framework›

## Ownership and trust

- **WD-IDEA-PHIL-062** Projects, branches, and the global asset library are private to the owning user. Locks record who locked a stage so future multi-user workflows can be supported. ‹src: architecture-and-rules, database-schema-state-transition-matrix›
- **WD-IDEA-PHIL-063** [idea] AI provider keys are held by the platform: they never reach the browser and are never logged. Each provider is isolated so a fault in one generation path cannot leak cost into another. ‹src: security-credit-rate-limiting-strategy›

## Streamline: the second front door

Streamline is the product's answer to prepared users. It is an intake layer in front of the pipeline (see 02B, 02).

- **WD-IDEA-PHIL-065** Streamline targets users who do not come for the writing tools and want to reach production faster. ‹src: streamlined-input-process-consolidated›
- **WD-IDEA-PHIL-066** [planned] Product promise: "Drop in what you already have. Aiuteur figures out what it is, asks what it needs, and builds the production-ready project scaffold." Users drop documents, images, and eventually audio; the app identifies each item, asks what is missing, and lands them as far into the pipeline as their material earns them. ‹src: streamline-master-plan-8-1, streamlined-input-process-consolidated›
- **WD-IDEA-PHIL-067** [planned] Streamline is additive: it feeds the 12-stage pipeline and never replaces it. Pipeline structure, the Phase A/Phase B split, sequential stage locking, and per-stage generation/edit tools stay as they are; Streamline is a faster way to arrive at the right point with more work already done.
- **WD-IDEA-PHIL-071** [voice] The creator generated many streamlined-input variations and treats the design as open. They asked for an analysis of which variants are good or misguided, plus adjacent or beyond-scope features. Goals: higher user satisfaction, and users who are more productive and output more. ‹src: claudeprompt-5-10›
- **WD-IDEA-PHIL-072** [future] Personal creative fingerprint / lore library / "second brain": persistent cross-project memory that learns a user's characters, writing rhythm, visual taste, humor, voice, and prior work by ingesting past scripts, sketches, mood boards, voice recordings, and videos. Streamline intake can eventually feed it (see 06). Lore library here means this cross-project personal library; the project-scoped character and world lore directory is a separate idea (WD-IDEA-STORY-126), and intake material may feed either (WD-IDEA-INPUT-137). ‹src: streamline-master-plan-8-1, streamlined-input-process-consolidated, streamlined-input-analysis-5-10›

## Product-shape lessons from location continuity

The location rethink produced general rules for balancing default simplicity against opt-in precision. Location-specific mechanics live in 06B and 04.

- **WD-IDEA-PHIL-073** [planned,impl] Two-layer system: a lightweight default path for most users and a structured advanced path for users who need tighter control. The default optimizes for speed, clarity, and momentum; the advanced path optimizes for precision and repeatability. The concrete layered model is WD-IDEA-LOC-017 (baseline, advanced, and optional blocking layers); shot-level blocking references are WD-IDEA-SHOT-099. ‹src: 5-2-location-product-synthesis, 7-19-location-stabilization-master-plan›
- **WD-IDEA-PHIL-078** Treat text as supporting metadata and canonical IDs as the core join key. Moving truth from text heuristics to IDs early is the fastest path to a great tool. ‹src: 4-15-location-analysis›
- **WD-IDEA-PHIL-079** [planned] Success for the default layer: users do not feel trapped in setup, can make progress with imperfect structure, and see continuity improve through reuse of output, not only through preplanning. ‹src: 5-2-location-product-synthesis›
- **WD-IDEA-PHIL-080** [planned] Success for the advanced layer: repeated angles and reverse angles become predictable, users can repair or extend coverage with explicit tools, and continuity quality scales with effort instead of collapsing under complexity. ‹src: 5-2-location-product-synthesis›

### Options: overall shape of the location continuity system
- **WD-IDEA-PHIL-081** [rejected] Finish the original advanced location system exactly as first imagined and make it the main experience. Replaced by the two-layer synthesis after a product-shape problem emerged during implementation. ‹src: 5-2-location-product-synthesis›
- **WD-IDEA-PHIL-082** [rejected] Abandon the structured location system and rely only on prompts for background continuity. Replaced by the two-layer synthesis. ‹src: 5-2-location-product-synthesis›

## Product discipline and roadmap

- **WD-IDEA-PHIL-083** [voice] North Star test, applied before adding, keeping, or shipping any feature: ‹src: post-Aiuteur Poduct Mission & Philosophy›
  - Would the middle-80% user actually want this, or is it for the top-10% hyper-detail-oriented crowd?
  - Does it add creative speed and flow, or introduce friction, confusion, or decision fatigue?
  - Does it preserve human authorship, or let the agent overtake the user's creative intent?
  - Does it focus the product, or add noise that obscures what Aiuteur does?
- **WD-IDEA-PHIL-084** [voice] Too many features, even if they all work well, create confusion and obscure what the product provides. The product cannot be all things to all people; hold back new tickets until they are checked against the mission. ‹src: post-Aiuteur Poduct Mission & Philosophy›
- **WD-IDEA-PHIL-085** [voice] Build one product for as many middle-ground users as possible, not different products shaped by individual team members' personal ideals of what is useful to them. ‹src: post-Aiuteur Poduct Mission & Philosophy›
- **WD-IDEA-PHIL-086** [voice] The written mission is the source-of-truth anchor for feature decisions. It stops ideation from going down rabbit holes that sound good in theory but stray from what users are provided; new specs are scrutinized against it. ‹src: post-Aiuteur Poduct Mission & Philosophy›
- **WD-IDEA-PHIL-087** [voice] Team decision process: each member independently reviews all major open tickets and arrives with a real stance. Independent agreement lets the team move fast and raises confidence; disagreements are debated from knowledge and conviction; nodding along without thought adds no value. ‹src: post-Aiuteur Poduct Mission & Philosophy›
- **WD-IDEA-PHIL-088** [planned] Vision narratives must label which scenarios are core and which are future, so aspirational sections are not read as commitments. ‹src: streamline-plan-critique-8-1›
- **WD-IDEA-PHIL-089** Development philosophy: feature-completion first. Get the full pipeline working end to end with real AI providers, then systematically improve quality, then add advanced features. ‹src: MVP-tasklist-v1.1›
- **WD-IDEA-PHIL-090** Each stage's quality standard is "do it as well as possible", favoring correct behavior over speed; connectivity across stages still takes priority over perfection. ‹src: MVP-tasklist-v1.1›
- **WD-IDEA-PHIL-091** [voice] Sequencing: investigate and verify the existing generation and inheritance chains first, then build new features on top of infrastructure that works. The production-level form is WD-IDEA-FLOW-132 (fix asset reference inheritance before amplifying prompts with chaining). ‹src: 3.7-threads, 3.7-phase-0-investigation›
- **WD-IDEA-PHIL-093** Legacy docs describe end-to-end user journeys verified with manual test guides, and automated checks after every change to catch regressions. ‹src: unit-test-system›
- **WD-IDEA-PHIL-094** [planned,future] Roadmap priority: the core 12-stage pipeline is the critical path for launch. After launch, version control, polish, performance, and monitoring matter most for production stability. ‹src: Post-MVP-tasklist›
- **WD-IDEA-PHIL-095** [planned] The MVP must let users export finished video; without export the product is not usable (see 09). ‹src: master-mvp-tasklist›
- **WD-IDEA-PHIL-096** [planned,future] MVP scope-down: UI polish is limited to loading states, error messages, and keyboard shortcuts. Animations, onboarding, help system, advanced editing, and mobile polish are deferred past MVP. ‹src: Post-MVP-tasklist›
- **WD-IDEA-PHIL-097** [planned,future] MVP scope-down: export is MP4-only. NLE export, asset packages, audio stems, and archival are deferred to post-launch. ‹src: Post-MVP-tasklist›
- **WD-IDEA-PHIL-098** [planned,future] MVP scope-down: performance work is limited to basic indexing; other optimization is deferred until performance problems appear. Observability is limited to error tracking ("Just add Sentry. Done."); APM and cost analytics are deferred. ‹src: Post-MVP-tasklist›

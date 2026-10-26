# Q&A Session: Product Constitution Grilling

> **Status: HISTORICAL PROCESS RECORD.** The decision record behind the Constitution. Do not use as implementation authority; the Constitution (as amended) controls. See [docs/README.md](../README.md).

| | |
|---|---|
| **Date** | 2026-10-19 |
| **Participants** | Daniel (creator, decision-maker), Claude (interviewer) |
| **Purpose** | Establish what Aiuteur V2 actually is before restarting Wayfinder |
| **Output** | [docs/product/PRODUCT-CONSTITUTION.md](../../docs/product/PRODUCT-CONSTITUTION.md) (authoritative). This file is the decision record behind it. |
| **Evidence consulted** | `_inputs/legacy-foundational-docs/`, `_inputs/product-knowledge/`, `_inputs/legacy-system/` |

**How to read this:** each entry gives the question, the options and recommendation put to Daniel, his answer (lightly cleaned, meaning preserved), and the resulting determination. Where the answer differs from the recommendation, the answer wins. If this record and the Constitution ever disagree, the Constitution controls.

---

## Round 1: Product identity

### Q1. Who is Aiuteur for?
- **Options:** (a) the individual creative storyteller; (b) (a) plus pro filmmakers/agencies wanting granular control; (c) (a) plus marketing teams producing volume content.
- **Recommended:** (a). Authored commercial projects are allowed; not designed for one-click users, ad/UGC factories, or frame-level professionals.
- **Daniel:** a.
- **Determination:** the primary user is the individual creative storyteller. Authored commercial work is fine; volume ad production is not a target.

### Q2. What is the product judged on?
- **Options:** documents as the core product ("story consolidation", V1 PRD) vs. a finished, watchable film that is recognizably the creator's.
- **Recommended:** the finished film is the product.
- **Daniel:** the finished video clips. Maybe add a video-editing service, but that's a stretch goal; we can rely on DaVinci Resolve or CapCut for final edits. We also want to be able to export written materials, prompts, frames, etc.
- **Determination:** the deliverable is the set of finished, selected takes plus exportable documents, prompts and frames. In-app editing is a stretch goal (LATER).

### Q3. What level of continuity is promised?
- **Options:** (a) professional-grade; (b) identity-level; (c) best-effort.
- **Recommended:** (b).
- **Daniel:** b. Identity-level: characters, locations, props and style stay recognizably themselves, and the story reads coherently. Precision continuity tools are opt-in, never mandatory setup.
- **Determination:** as stated.

### Q4. What is the design-target project?
- **Recommended:** 30 seconds to ~10 minutes; idea to finished piece in a day or a few sessions; features/series not optimized initially.
- **Daniel:** correct, but 30 seconds up to ~20 minutes. A motivated creator gets from idea to a finished piece in a day or a few sessions and can slow down where they care. Features and series aren't optimized for initially, but nothing should preclude them later.
- **Determination:** 30 seconds to ~20 minutes (implying up to ~150–250 shots, so scale must be manageable).

### Q5. Where is the automation ceiling?
- **Options:** (a) never automate ahead; (b) "AI drafts ahead, you direct", only on explicit request; (c) full autonomous mode as a first-class feature.
- **Recommended:** (b).
- **Daniel:** b. Aiuteur is explicitly not a one-prompt generator, an autonomous agent, an Adobe/NLE replacement, or a slop factory.
- **Determination:** as stated.

---

## Round 2: Workflow spine

### Q6. Which story-development phases are mandatory?
- **Recommended:** Input mandatory; Clarification recommended and skippable; Treatment and Beat Sheet recommended and bypassable; Master Narrative mandatory.
- **Daniel:** mostly right. If the user inputs files *as* a treatment or beat sheet at the input stage, those files' contents should become the treatment/beat sheet content. These stages are recommended but can be skipped altogether, at the user's choice. The Master Narrative is mandatory. "Clarification" is really about interviewing the user until the agent feels it has all the info it needs and truly understands what they want to make.
- **Determination:** as stated. Clarification is reframed as the **Interview**.

### Q7. What exactly is the Master Narrative?
- **Recommended:** one human-readable, editable, highly descriptive document organized by scene; canonical narrative truth; no camera direction; no hidden AI-only layer; screenplay is an export/view.
- **Daniel:** mostly yes. The screenplay export should be a view of the Master Narrative: if you choose, AI condenses it into screenplay format (for voice actors or sharing), with identical dialogue but much less description, only what screenplays need. The Master Narrative is much more descriptive.
- **Determination:** as recommended, with the screenplay export defined as an on-request AI condensation with identical dialogue.

### Q8. Which production phases are mandatory, and is production per scene?
- **Recommended:** Assets mandatory but lightweight; scenes & shots mandatory (AI-draftable); previs optional; frames recommended; video mandatory; voice/audio optional; review & export mandatory. Story and world are project-wide; production is per scene, any order, with batch actions.
- **Daniel:** mostly right, with nuance:
  - Assets/world definition is mandatory, but the ability to defer must remain. The V1 Stage 5 asset definition was actually pretty good, at least in how the user experienced it.
  - Previs is optional. Without blocking we still need some way to ensure continuity: locations having multiple directions/walls for coherent shots within a scene is key.
  - Frames recommended; video mandatory; voice/audio/performance optional, as is using reference images/videos for parody, inspiration or recreating a shot (using your own assets).
  - Review/export mandatory. The shape is correct.
- **Determination:** as recommended, plus deferrable assets (V1 Stage 5 as design reference), location direction coverage as key, and reference media as optional.

### Q9. Where can mature material enter?
- **Recommended:** notes → Input; story → Treatment; outline → Beats; screenplay → converted into a Master Narrative. Storyboards, shot lists, previs packages and audio-first sources later.
- **Daniel:** yes, but we absolutely need to add a place in the pipeline to import storyboards, shot lists, previs packages and audio-first sources.
- **Determination:** as recommended; those imports get defined entry points (timing set in Q23).

### Q10. What happens when the creator goes back and changes things?
- **Recommended:** nothing automatically rewrites downstream accepted work; affected items are marked possibly out of date with a reason; downstream edits never silently rewrite upstream; treatment/beats become development history after Master Narrative acceptance; shot-level narrative changes are written back or recorded as deliberate deviations; no automatic Git-style branching (versions + duplicate project).
- **Daniel:** yes.
- **Determination:** as recommended. (Refined later in Q26: sync is allowed where reliable, e.g. treatment↔beats before Master Narrative acceptance.)

---

## Round 3: Human vs AI creative authority

### Q11. How much may the AI invent?
- **Recommended:** AI freedom shrinks as the creator supplies more; interview answers and creator-stated facts are binding; material inventions are asked about or recorded as AI-made choices.
- **Daniel:** yes, and I love recording/flagging what is made by AI versus what is not. Maybe a toggle that highlights all AI-generated content in one color and the user's own ideation in another.
- **Determination:** as recommended, plus a **provenance highlight toggle** (IMPORTANT).

### Q12. What authored work is protected?
- **Recommended:** creator work is changed by AI only on scoped request; targeted edits stay in the selection; AI changes to accepted content arrive as a preview/diff; provenance on everything; regeneration never destroys.
- **Daniel:** it doesn't need to be a rule that some things can't be changed. Anything by the creator should be respected, but the user may later direct a change in direction and that should proceed. Avoid pageantry like AI preview/diffs. If the user uses the regeneration box on a selection, just let the AI edit it, and mark the changed content as AI-generated. And have decent version control of document content so it can be recovered.
- **Determination:** respect creator work, but it is always redirectable; **no preview/diff ceremony**; requested edits apply directly and are marked AI-generated; recoverable version history is the safety net.

### Q13. What requires explicit human commitment?
- **Recommended:** (a) accepting the Master Narrative; (b) any meaningful spend (creator-initiated, cost shown); (c) selecting the final take. No other hard gates or lock rituals.
- **Daniel:** (a) and (b) yes; maybe not (c), TBD. Those points need locks. Locks are fine as long as they aren't blocking. Some friction for editing past work with a lot downstream is good, since that would wreck later work. Keep lock/unlock after certain points, e.g. after accepting the Master Narrative, always unlockable.
- **Determination:** commitment points (a) and (b); (c) TBD. Locks kept: non-blocking, always unlockable, friction proportional to downstream work, starting after Master Narrative acceptance.

### Q14. Fixing problems late; prompt visibility
- **Recommended:** fix where you notice it; narrative/identity changes are written back or recorded as deliberate deviations; AI never alters identity/narrative truth from a media step on its own; prompts and references always inspectable and overridable, never required.
- **Daniel:** yes, very good.
- **Determination:** as recommended.

### Q15. Is there a project-aware AI assistant?
- **Options:** (a) none; (b) yes, proposing reviewable change-sets; (c) yes, applying low-risk changes directly.
- **Recommended:** (b) as the policy; scope decided later.
- **Daniel:** not sure; likely a stretch goal or done after V2. A good idea, but outside current scope.
- **Determination:** LATER (future feature).

---

## Round 4: Core product objects

### Q16. Which fundamental objects make up the experience?
- **Proposed:** Project, Source Material, Interview & Established Facts, Treatment, Beat Sheet, Master Narrative, Scene, Shot, Character, Location, Prop, Extra/background type, Style (visual required, writing optional), Reference Media, Frame, Take (one generated video attempt), Performance, Export Package.
- **Daniel:** yes, perfect.
- **Determination:** as proposed; "Take" is the fixed term for a video attempt.

### Q17. How do identity and appearance changes work?
- **Recommended:** canonical identity per entity; story-driven changes become **named looks** that carry forward; moment-level changes live in shots, not pre-modeled states.
- **Daniel:** yes, perfect.
- **Determination:** as recommended.

### Q18. Location directions: default or opt-in?
- **Context raised:** in V1 Daniel recorded that the multi-direction UI added too much friction and should be opt-in, with frame reuse as the ordinary path.
- **Options:** (a) default, AI-driven; (b) opt-in; (c) hybrid, recommended where the story needs it.
- **Recommended:** (c).
- **Daniel:** I encourage its use; it just needs to be designed well. It should be the default, but users can choose per location to have only one establishing image / main background (e.g. for a briefly used location). Frame reuse as an ordinary path is important. I also like the option that from one background image, AI can generate the other walls/angles automatically.
- **Determination:** **multi-direction coverage is the default**, with a per-location single-image toggle; AI can generate the other angles from one image; frame reuse is ordinary; the setup must be well designed, not burdensome.

### Q19. What is a Shot, and how do Frames and Takes relate?
- **Recommended:** a shot is one continuous camera moment → one clip; flexible duration (Aiuteur handles generator limits); frames are optional visual anchors; takes accumulate and are never overwritten; one selected take.
- **Daniel:** yes, perfect. Remember there must be an option to use a reference image/video to help generate the frame/take, with the reference's subjects replaced by the shot's assets.
- **Determination:** as recommended, plus reference-driven frames/takes with subject replacement.

### Q20. Are entities and styles reusable across projects?
- **Recommended:** project-owned, savable to a personal library; copy-on-use (editing in one project never silently changes another); full library scope decided later.
- **Daniel:** yes, correct.
- **Determination:** as recommended (full library LATER).

---

## Round 5: Initial scope

The scope table was presented (CORE / IMPORTANT / LATER / EXPERIMENTAL / OUT) and accepted unless objected to; see Constitution Section 15. Specific calls:

### Q21. Voice and performance scope
- **Recommended:** CORE = dialogue and sound generated with the take. IMPORTANT = consistent character voices; record/upload a performance the take follows, optionally transformed into the character's voice. LATER = stems, music, mixing.
- **Daniel:** yes. CORE must be there; IMPORTANT is a key feature the user can *choose* to use. Don't forget recording/uploading a dialogue performance whose pitch etc. can be edited to sound like a specific voice (e.g. a man records a line and makes it sound like a specific woman saying it, with the same delivery).
- **Determination:** as recommended; voice transformation that preserves delivery is explicitly IMPORTANT.

### Q22. Previs and reference-driven shots
- **Recommended:** composition references and reference-driven shots IMPORTANT; CineBlock integration IMPORTANT, after the core loop works; the core shot model reserves room for composition references.
- **Daniel:** yes, perfect.
- **Determination:** as recommended.

### Q23. Import timing
- **Recommended:** storyboard/shot-list import IMPORTANT; previs package import IMPORTANT (with CineBlock); audio-first projects LATER (entry point named in the constitution).
- **Daniel:** yes.
- **Determination:** as recommended.

### Q24. Do creators choose generation models?
- **Options:** (a) Aiuteur chooses silently; (b) sensible default with optional per-project/per-shot override; (c) always explicit.
- **Recommended:** (b), and provider-independent.
- **Daniel:** b.
- **Determination:** as recommended.

### Q25. The "Aiuteur works" bar
- **Proposed:** a creator starting from a rough paragraph can, in one day, be interviewed, shape treatment/beats/Master Narrative, define a small cast and 2–3 locations, plan shots, generate consistent frames and takes with spoken dialogue, watch the 2–3 minute piece in order, and export clips plus documents to Resolve/CapCut. Same flow from an existing screenplay.
- **Daniel:** yes for the minimum product bar, but we want to build and architect for the IMPORTANT items from the start.
- **Determination:** accepted as the minimum bar; V2 must be architected from day one for all IMPORTANT capabilities.

---

## Round 6: Non-negotiable principles

### Q26. The 14 principles
- **Proposed:** creator is author; respect & provenance; nothing is lost; no silent propagation (nothing auto-syncs); one canonical narrative; identity holds; cheap before expensive & creator controls spend; light by default, precise on demand; never trapped; inspectable not magic; what you see is true; reliable over clever; provider-independent; tedium belongs to the AI.
- **Daniel:** mostly agree, but for #4, "nothing auto-syncs" doesn't make sense as a non-negotiable; we may want treatment and beat sheet to autosync. Flagging "possibly out of date" items makes sense, but not in a large, annoying visual manner. Otherwise good.
- **Determination:** accepted with #4 reworded: **no silent destruction**. Sync is allowed where reliable and transparent (e.g. treatment↔beats); accepted work is never silently overwritten; out-of-date markers are quiet.

### Q27. Precedence when principles conflict
- **Proposed:** authority & no loss of work > reliability > identity consistency > ease of the default path > cost > feature breadth.
- **Daniel:** sure.
- **Determination:** as proposed.

---

## Round 7: Legacy baggage

### Proposed list of "explicitly NOT V2 truth"
- **Proposed:** fixed 12-stage identity; mandatory prompt-review stage; Rearview Mirror; Artifact Vault; mandatory 8-second shots; mandatory start+end frames; condition-tag prompts; Git-style branching; retroactive sync agents; hard numbers; provider-specific formats; UI-owned workflow state.
- **Daniel:** these needn't be must-have laws, but the general product ideas in V1 were good. For example, the Rearview Mirror was helpful and the stages worked fine. That's not what was wrong with the old product; the problem was that it was buggy, slow and poorly architected. The only real no-nos are UI-owned workflow state and hard numbers. Labeling the rest as explicitly *not* truth is a mistake; don't ban these ideas/structures for the redesign. The real baggage is that `product-knowledge/` contains many bad ideas that were never built into V1 but are still listed, and they shouldn't strongly influence future design.
- **Determination:**
  - V1's product design is broadly good. Its ideas are **design references, neither mandated nor banned**.
  - **Rejected:** UI-owned workflow state; hard numbers as product law.
  - **Demoted:** unbuilt ideas in `product-knowledge/` carry no design weight unless the Constitution names them.

### Q28. Treatment variants
- **Recommended:** multiple treatment options by default; count is a design decision; "just one" allowed.
- **Daniel:** yes, multiple options are a default feature.

### Q29. Regeneration guidance
- **Recommended:** accepted but optional (V1 required a "Why box").
- **Daniel:** yes, optional.

### Q30. Scene checkout ritual
- **Recommended:** drop V1's Checkout and "Complete Scene" as stages; keep the behavior (cost shown before spend; clear per-scene progress view).
- **Daniel:** yes, drop them as stages; keep the behavior.

---

## Synthesis confirmation

- **Question:** after Master Narrative acceptance, treatment and beats become development history (not kept in sync); the treatment↔beats autosync applies *before* that point. Correct?
- **Daniel:** yes, that is right.
- **Outcome:** Daniel approved the synthesis and the Constitution was written to `docs/product/PRODUCT-CONSTITUTION.md`.

## Open items carried forward (decided later in Wayfinder)

- Whether selecting a take is a formal commitment point (Q13c).
- Treatment↔beats sync mechanics, if built.
- Lock points beyond the Master Narrative.
- Definition of "meaningful spend" and the billing/credits model.
- All UX, domain, architecture, provider, async and sequencing design (Constitution Section 18).

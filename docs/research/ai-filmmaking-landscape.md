# AI filmmaking landscape: how current tools structure story-to-film work

- Ticket: dlopezkluever/Aiuteur#4 (parent map: #1). Blocks #48.
- Access date for all sources: 2026-10-18 (today). Page dates are given where the page shows one.
- Scope question (from #4): how current products structure story-to-film work (project/script/scene/shot structure, character and location consistency, anchor frames, previs/blocking, voice and lip-sync, collaboration, pricing), and where Aiuteur's "happy middle with authorship preserved" position is already served and where it is open.
- Facts only. This file makes no recommendation about what Aiuteur should be.

## Method and source policy

- Vendor-owned pages (product sites, pricing pages, vendor blogs, Google Labs/Google blog, Adobe, Runway, Luma, Kling, Krea, OpenArt, Flick, Moonvalley) were treated as primary.
- Third-party aggregators, review sites, and listicles were used only to locate primary pages or to flag conflicts. Any claim that rests only on a secondary source is labelled "secondary" or "unverified."
- Several vendor pages redirected to new hosts (ltx.studio to ltx.io, labs.google to flow.google.com, runwayml.com to runway.com, klingai.com to kling.ai). The redirect targets were fetched and are cited.
- Where a fetch returned only page metadata, a 404, a 403, or a parse error, the claim is marked unverified rather than inferred.

## Key findings (summary)

1. Storyboard-first, approve-before-render is now a shipped pattern. Luma says "Nothing renders before your approval" in Luma Scenes, which generates an editable keyframe storyboard first (announced 2026-08-11). [S-LUMA-SCENES]
2. Shot-level specification is a native feature. Kling 3.0 Omni lets users set duration, framing, angle, narrative content, and camera movement per shot, up to 15 seconds in one generation. [S-KLING-GUIDE]
3. Character identity is handled through reusable references, not a single "consistency" switch. Examples: Kling element references built from a 3–8 second video, Higgsfield "AI Cast" identities, OpenArt "consistent characters," Krea LoRA training on a few images, Google Flow "Ingredients." [S-KLING-GUIDE] [S-HIGGS-CINEMA] [S-OPENART-PRICING] [S-KREA] [S-FLOW-VEO31]
4. Google Flow's "Scenebuilder" is described by Google as an "in-Flow storyboard" for assembling clips into a narrative. Google's own wording describes it as an assembly tool, not a pre-render approval workflow. [S-FLOW-TIPS]
5. Anchor frames exist across the field as first/last-frame or keyframe inputs (Google Flow "Frames to Video," Luma keyframes, Adobe Firefly "first frame," Ray3 Modify keyframe controls). None of the primary pages reviewed describes a cheap-image-anchor-then-expensive-video stage split as an explicit product method. [S-FLOW-VEO31] [S-LUMA-NEWS] [S-FIREFLY-VIDEO]
6. Script ingestion is claimed by several products. Higgsfield's Cinema Studio page describes an assistant that breaks a script into shots. Flick describes a node canvas where scripts, scenes, characters, visuals, and edits connect. Kling's Canvas describes an agent that helps write scripts and storyboards. Whether these preserve the script as a versioned source of truth is not described on the primary pages reviewed. [S-HIGGS-CINEMA] [S-FLICK] [S-KLING-HOME]
7. Lip-sync and voice are offered by Kling (voice binding and lip-sync; no language list on its primary guide), by Google Veo 3.1 (synchronized audio in Ingredients, Frames, and Extend), and by Runway (custom voice clone on Pro and Max). Higgsfield's primary page does not mention lip-sync. [S-KLING-GUIDE] [S-FLOW-VEO31] [S-RUNWAY-PRICING] [S-HIGGS-CINEMA]
8. Team and collaboration features are concentrated in plan tiers: Luma (Team and Enterprise, SSO, shared credits), Krea (Business, up to 50 seats), Adobe (per-license team plans). Google Flow, Flick, and Higgsfield primary pages describe no multi-user workflow. [S-LUMA-PRICING] [S-KREA-PRICING] [S-ADOBE-PLANS] [S-FLICK]
9. Licensing claims differ. Moonvalley says Marey is "Trained on licensed data" and "FULLY LICENSED, Commercially safe." Adobe says Firefly outputs are "safe for commercial use" and that partner-model usage terms may differ. Krea advertises a "Do not train" policy. [S-MOONVALLEY] [S-FIREFLY-VIDEO] [S-KREA]
10. Pricing is credit-based across the field. Plan price points cluster at roughly $10–$35 per month for entry tiers and $90–$300 for top tiers, but credit-to-output ratios differ by model, so price per usable shot is not comparable without the per-model credit tables. [S-RUNWAY-PRICING] [S-LUMA-PRICING] [S-ADOBE-PLANS] [S-OPENART-PRICING] [S-KREA-PRICING]
11. Google's Veo API prices are published per second: Veo 3.1 Standard $0.40/s at 720p and 1080p and $0.60/s at 4K; Fast $0.10 to $0.30/s; Lite $0.05 to $0.08/s; all with audio. Per-generation Flow credit costs are not on a primary page reviewed. [S-GEMINI-PRICING]
12. The Kling pricing page, the LTX Studio primary pages, and the Higgsfield pricing page could not be read from the vendor. Figures for these products in aggregator sites conflict, so they are not used as findings. [S-GAPS]
13. Newer 2026 entrants found in search (Utopai Studios, Chapterframe.ai, Novi AI, FilmPilot.ai) were not verified against primary pages; see the Newer entrants section.

## Comparison table: structure and workflow

Columns: story and script structure; characters and locations; anchor frames and keyframes; previs and storyboard; voice and lip-sync; collaboration. "Not stated" means the primary page reviewed does not describe the feature. "Unverified" means no primary page could be read.

| Product (primary page, date) | Script/scene/shot structure | Character and location consistency | Anchor frames / keyframes | Previs / storyboard | Voice and lip-sync | Collaboration |
|---|---|---|---|---|---|---|
| **LTX Studio** (ltx.io, primary not readable) | Unverified on primary. Secondary: converts text or script into characters, scenes, storyboards, and shots [S-LTX-WIKI] | Unverified on primary | Unverified on primary | Unverified on primary (secondary: storyboard rework before render) | Unverified | Unverified (secondary: team plan) |
| **Google Flow** (Veo 3.1 post 2025-10-15; tips 2025-06-25; update 2026-02-25) | Scenebuilder "in-Flow storyboard" assembles clips into a narrative (tips, 2025-06-25). Jump To and Extend were stated as Veo 2 only at that time | Ingredients (up to three per prompt in June 2025 tips) are reusable characters, objects, and styles. Feb 2026: images used as ingredients and frames, "@" library references | Frames to Video takes a start and end image | Scenebuilder storyboard; no pre-render approval gate described | Veo 3.1 audio "now works with" Ingredients, Frames, Extend (2025-10-15). Lip-sync not stated | Not stated on primary pages reviewed. Asset grid with collections (2026-02-25) is single-user organization |
| **Runway** (runway.com/pricing; Aleph 2.0 news 2026-05-21) | Not stated as a script-to-film structure. Aleph 2.0 edits existing clips across up to 30 s at 1080p and applies edits across multiple shots | Character consistency not found in primary pages reviewed | Aleph 2.0: one edited frame is propagated across the clip | Not stated | Custom voice clone on Pro (1) and Max (3) | Team and Enterprise tab not captured. Standard, Pro, Max list project counts only |
| **Luma Dream Machine / Luma Scenes** (lumalabs.ai news; Scenes 2026-08-11) | Scenes workflow from brief or references | "Every scene generated together, in one context, so look, environment, and spatial logic hold across the sequence." Dedicated character feature not described | Editable keyframe storyboard; regenerate, comment on, or replace any keyframe | Storyboard of keyframes with timing set before render. "Nothing renders before your approval." Per-scene fixes | Not stated | Team members and admins (2026-04-01 post). Team plan: SSO, shared credits |
| **Higgsfield Cinema Studio 4.0** (higgsfield.ai/cinematic-video-generator, undated) | Assistant "that can break a script into shots"; Montage Pacing (Chaotic, Dynamic, Calm, Single Shot) | "AI Cast actors hold identity, wardrobe and presence across every scene and angle." Locations "stay consistent across sessions" | Not stated | Camera moves as "# tags" stacked per shot | Not stated (page does not mention lip-sync) | Not stated |
| **Kling AI** (kling.ai guide for Video 3.0 Omni; homepage) | Custom multi-shot; per-shot duration, framing, angle, narrative content, camera movement; up to 15 s per generation | "Element's features remain consistent"; element built from a 3–8 s video of the character | Not stated | Multi-shot storyboard and Canvas (node-based workspace; agent helps brainstorm, write scripts, produce storyboards). Kling 4.0 headline on homepage, no date | Voice binding to character and lip-sync; no language list on the guide | Canvas, MCP and CLI for batch production; no team feature found on primary pages |
| **Krea** (krea.ai homepage, pricing) | Not a story-structure tool on primary; node apps, Realtime Canvas, Nodes Agent, App Builder (Pro) | LoRA training on "just a few images" of a face, product, or style | Video Realtime with "full frame consistency" (marketing claim) | Not stated | Not stated | Business: up to 50 seats; Enterprise: audit logs, Slack Connect |
| **OpenArt** (openart.ai/pricing) | "One-Click Stories" tool on all plans | "Consistent characters" and "personalized models" counted per plan | Not stated | Not stated | Not stated | Not stated on pricing page |
| **Adobe Firefly video** (adobe.com Firefly features and plans pages) | Assembler and AI video editor for trimming, reordering, extending, regenerating segments | No dedicated character-reference tool for the Firefly model; partner-model claims only | Image-to-video with optional first frame | Clip length "up to 8 with some allowing up to 15 seconds" (unit not stated) | Veo 3.1 synchronized audio; Kling 3.0 dialogue synced to lip movements; voiceover and music added in editor | Per-license team plans; enterprise IP indemnification for select outputs |
| **Moonvalley Marey** (moonvalley.com, metadata dated 2026-07-21) | Not stated as a script tool | Pose transfer and reference-based control; no character-consistency feature described | Not stated | Trajectory control, motion transfer, camera moves from a single image, 2D to 3D environment | Not stated | API on waitlist; no team features described |
| **Flick** (flick.art homepage, undated) | Infinite node-based canvas; scripts, scenes, characters, visuals, edits as connected nodes; agent for ideation; "direct an entire film" | Character reference via Edit Image; "Your scenes stay consistent across every shot" (claim) | Not stated | Camera movement control; 1,000+ styles | Not stated | "priority support" (Pro) and "private founders support for teams and studios" (Studio); no collaboration features described |

## Comparison table: pricing and commercial terms

Prices are US list prices as shown on the primary page. Annual prices are shown where the page shows them. Where a page shows struck-through and discounted prices, the reading used here is noted in the source notes.

| Product | Entry paid tier | Mid tier | Top tier | Credits or units | Commercial use (primary page) | Source |
|---|---|---|---|---|---|---|
| Google Flow / Google AI plans | AI Plus: 200 Flow credits/mo, 400 GB | AI Pro: 1,000 Flow credits/mo, 5 TB | AI Ultra 5x: 10,000; AI Ultra 20x: 25,000 Flow credits/mo | Monthly Flow credits; no dollar prices on the fetched page | Not stated on fetched page | [S-GOOGLE-PLANS] |
| Google Veo 3.1 API | Lite $0.05/s (720p) | Standard $0.40/s (720p and 1080p) | Standard $0.60/s (4K); Fast $0.10–$0.30/s | Per second, video with audio default | Not stated | [S-GEMINI-PRICING] |
| Runway | Standard $15/mo ($12 annual): 625 credits | Pro $35/mo ($28 annual): 2,250 credits | Max $95/mo ($76 annual): 9,500 credits, one-month rollover | Gen-4.5 60 credits per 5 s; Aleph 2.0 140 per 5 s; Seedance 2.0 Pro 160 per 4 s | Not stated on captured page; Free has 125 one-time credits | [S-RUNWAY-PRICING] |
| Luma | Plus $30/mo ($25 annual): 10,000 credits | Pro $90/mo ($75 annual): 40,000 | Ultra $300/mo ($250 annual): 150,000; Team and Enterprise on contact | Monthly credits; Modify and Scenes costs not on page | Commercial use listed on Plus | [S-LUMA-PRICING] |
| Krea | Pro $35/mo ($21 annual): 20,000 units | Max $105/mo ($63 annual): 60,000 units | Business $200/mo ($160 annual): 80,000 units, up to 50 seats | Units; Free is 100 units/day | Pro, Max, Business, Enterprise include commercial use per FAQ | [S-KREA-PRICING] |
| OpenArt | Starter $14/mo ($13 annual): 4,000 credits, no commercial use | Plus $34/mo ($27 annual): 12,000 credits, commercial use yes | Pro $56/mo ($44 annual): 24,000; Wonder $240/mo ($175 annual): 106,000 | Credits; extra credit $15/mo for 5,000 (Plus required) | Starter no; Plus and above yes | [S-OPENART-PRICING] |
| Adobe Firefly | Standard $9.99/mo: 2,000 credits | Pro $19.99/mo: 4,000 credits; Pro Plus $49.99/mo: 10,000 | Premium $199.99/mo: 50,000 credits; only Premium has unlimited Firefly Video | Generative credits; 5-second video caps by tier (see conflict note) | Firefly model "safe for commercial use"; partner models vary | [S-ADOBE-PLANS] [S-FIREFLY-VIDEO] |
| Flick | Casual $5/mo: 500 credits | Standard $20/mo: 2,500 credits; Pro $45/mo (limited offer, normally $60): 8,000 | Studio from $120/mo: 20,000 to 100,000 credits (up to $600/mo) | Credits; annual saves 20% | Not stated on fetched page | [S-FLICK] |
| Higgsfield | Unverified: primary pricing page returned metadata only | Unverified | Unverified | Cinema Studio cost per length, resolution, model (page says "See Pricing") | Unverified | [S-HIGGS-CINEMA] [S-GAPS] |
| Kling | Unverified: membership page not readable from the vendor | Unverified | Unverified | Credits per generation; aggregators say native audio doubles per-second credit cost | Unverified (secondary: free tier not for commercial use) | [S-GAPS] |
| LTX Studio | Unverified: primary pricing not readable | Unverified | Unverified | Unverified | Unverified | [S-GAPS] |
| Moonvalley | No pricing on page; API on waitlist | — | — | — | "FULLY LICENSED, Commercially safe" | [S-MOONVALLEY] |

## Per-product notes

### Google Flow
- Veo 3.1 update (2025-10-15): Ingredients to Video "use multiple reference images to guide characters, objects, and style"; Frames to Video takes a start and end image; Extend "Each video is generated based on the final second of your previous clip"; audio added to these features; Insert adds elements with "shadows and scene lighting." Remove was "Soon." [S-FLOW-VEO31]
- Tips (2025-06-25): Scenebuilder is "your in-Flow storyboard, where you assemble individual clips into a complete narrative." Jump To and Extend "only work with Veo 2" at that date. Ingredients to Video "only works with Veo 2" at that date. [S-FLOW-TIPS]
- Update (2026-02-25): Nano Banana built into the core experience; generated images can be "used as ingredients and frames for Veo video generations"; asset grid; lasso edit; add or remove objects in video; "@" to reference library assets. Google did not describe Scenebuilder or character consistency in this post. [S-FLOW-UPDATE]
- Flow's landing page fetched only a title and sign-in link, so Flow's current feature set rests on Google's blog posts. [S-FLOW-HOME]
- Plan credits per month (from the one.google.com page): AI Plus 200 Flow credits, AI Pro 1,000, AI Ultra 5x 10,000, AI Ultra 20x 25,000. Dollar prices were not visible in the fetched text. Third-party sites give AI Pro $19.99 and Ultra $99.99 or $199.99 (secondary, not used as primary). [S-GOOGLE-PLANS]
- Per-generation Flow costs (for example 20 credits for Fast and 100 for Quality) appear only on third-party sites and are not used as findings. [S-GAPS]

### Runway
- Aleph 2.0 and Edit Studio (2026-05-21): clips up to 30 seconds at 1080p; one reference frame "with the edit you want" is applied to the video; edits apply "across relevant shots"; available on all paid plans in the desktop web app. Characters and collaboration are not described. [S-RUNWAY-ALEPH]
- Pricing and credits (primary page): Gen-4.5 is listed as 60 credits per 5 s, consistent with the FAQ's 12 credits per second. Aleph 2.0 is 140 credits per 5 s. Third-party sites disagree on Aleph's rate (for example 15 per second) and are not used. [S-RUNWAY-PRICING]

### Luma
- Ray3 Modify (2025-12-18): "Adds keyframe and character-reference controls for editing video." Ray3.14 (2026-01-26): native 1080p and "better motion consistency for Modify Video." Whether Ray3.14 keeps Character Reference is disputed on third-party sites and is not resolved here. [S-LUMA-NEWS]
- Luma Scenes (2026-08-11): a storyboard of editable keyframes, timing set before render, per-scene fixes ("Fix one scene, and it costs one scene, not the whole spot"), and a claim that all scenes are generated together. Renders with Ray 3.2 or Seedance 2. [S-LUMA-SCENES]
- Luma Agents (launched 2026-03-05 per secondary press coverage; the primary post was not readable). Coverage focuses on advertising and enterprise work. [S-LUMA-AGENTS-SECONDARY]

### Higgsfield
- Cinema Studio 4.0 (primary page, undated): camera moves as "# tags," stackable per shot; AI Cast "actors hold identity, wardrobe and presence across every scene and angle"; Montage Pacing; script-to-shots assistant; generations up to one minute; native 4K; Seedance and other models "run natively inside Cinema Studio 4.0." [S-HIGGS-CINEMA]
- Pricing and Soul ID: the primary pricing page returned metadata only; a Soul ID page returned 404. Third-party tier prices conflict (Starter $15 to $19, Plus $34 to $59, Ultra $84 to $129) and are not used. [S-GAPS]

### Kling
- Video 3.0 Omni guide (official): "Custom Multi-Shot" with "15 seconds" per generation; shot-level control of "duration, framing, angle, narrative content, camera movement"; "industrial-grade consistency in every shot"; element from a "3-8 second video"; "bind a unique voice to a character" and "more precise lip-syncing." The page shows examples of up to five shots and gives no maximum shot count. [S-KLING-GUIDE]
- Kling homepage: "All-New Kling 4.0," described as "Audio-Visual Performance for Realistic Results." No release date shown; only copyright "2024-2026." Canvas is a node-based workspace where an agent helps with scripts, images, videos, and storyboards. MCP and CLI support agent-driven batch production. [S-KLING-HOME]
- Launch date of Kling 3.0 (around 2026-02-04 to 02-05): secondary press release (PR Newswire); not verified on a primary page. [S-KLING-LAUNCH-SECONDARY]

### LTX Studio
- No primary page was readable. ltx.io pages returned a header-parse error on every attempt. LTX Studio was launched by Lightricks in February 2024 (Wikipedia). Claims about its script-to-storyboard workflow and Veo engine come from Wikipedia and aggregators only. [S-LTX-WIKI] [S-GAPS]

### Krea
- Homepage: multi-model access ("Veo 3, Kling, Hailuo, Wan, and Runway"); motion transfer; video style transfer; Realtime Canvas; Nodes Agent and App Builder on Pro; LoRA training "on just a few images." Marketing claims, not independently verified. [S-KREA]
- Pricing page: plan values as read from the page (the page shows struck-through and discounted prices; the reading used here follows the discounted values as annual). Internal inconsistencies noted on the page: Max is 60,000 units at $105 in visible text and 40,000 units at $70 in structured data; the Free feature list says it includes a commercial license while the FAQ says only paid plans do. [S-KREA-PRICING]

### OpenArt
- One-Click Stories on all plans; "Consistent characters" and "personalized models" counts increase by tier (approximately 13, 40, 80, 353 by plan per the page table, as read). Director and MCP access. [S-OPENART-PRICING]

### Adobe Firefly
- Video generation features: text or image prompt; up to 4K MP4; "Most models generate clips up to 8 with some allowing up to 15 seconds" (unit not stated); Assembler and AI video editor. [S-FIREFLY-VIDEO]
- Partner models listed: Veo 3.1 Fast, Firefly Video, Ray3.14, Runway Gen-4.5, Kling 3.0. "Commercial usage eligibility depends on the model used." [S-FIREFLY-VIDEO]
- Conflict: the plans page states 5-second video caps of 20 (Standard), 40 (Pro), and 100 (Pro Plus); the features page states up to 40, 80, and 200 five-second videos for Standard, Pro, and Pro Plus. Both are reported; neither is resolved. [S-ADOBE-PLANS] [S-FIREFLY-VIDEO]

### Moonvalley Marey
- Marey page: "Trained on licensed data"; "FULLY LICENSED, Commercially safe"; camera moves from one image; 2D to 3D environment; motion transfer; pose transfer; trajectory control; composable layers. No pricing; API on waitlist. Page metadata dated 2026-07-21. Original release (2025-07-08) and Fal.ai launch (2025-08-14) come from press headlines linked on the page, not from a primary page read directly. [S-MOONVALLEY]

### Flick
- Homepage: "End-to-end AI filmmaking: ideate, generate, and edit films on one canvas." Open node-based space; agent for ideation; character reference through Edit Image; "Your scenes stay consistent across every shot" (marketing claim); over 1,000 styles; "direct an entire film" to any length. Models named only as "Basic & Auto" (Casual) and "full model access" (Standard and above). [S-FLICK]
- Pricing (as shown on the page, undated; a limited-time Pro offer is noted): Casual $5/mo, 500 credits; Standard $20/mo, 2,500 credits, multi-reference and character reference; Pro $45/mo (normally $60), 8,000 credits; Studio from $120/mo, 20,000 to 100,000 credits. Annual saves 20%. [S-FLICK]

## Newer entrants (2026), discovered but not verified on primary pages

- **Chapterframe.ai**: a company press release dated 2026-10-09 (syndicated on OpenPR) says the native Mac app is out, a web studio is coming, and the pipeline runs manuscript to storyboard to sound design. Public access and pricing were "to be announced." Unverified; company claims only. [S-CHAPTERFRAME-PR]
- **Utopai Studios (PAI)**: Wikipedia says PAI was publicly released 2026-03-05, with a later "Story Agent" for multi-minute 4K sequences. The company's site redirected to a Substack page with no product content. Unverified on primary. [S-UTOPAI-WIKI]
- **Novi AI, FilmPilot.ai, Saga**: named in third-party listicles only. Not checked. [S-LISTICLE]

## Positioning reference (Aiuteur)

From `_inputs/product-knowledge/01-PRODUCT-MODEL.md`, section "Positioning: what it is and is not":

- WD-IDEA-PHIL-020: "happy middle" between one-shot AI generators and the Adobe suite, giving creative people "enough control to produce something intentional that reflects their vision, without learning professional animation or editing tools."
- WD-IDEA-PHIL-021: not an Adobe replacement; deliberately gives up highly technical users.
- WD-IDEA-PHIL-022: not a pure AI-video wrapper ("let the model do everything").
- WD-IDEA-PHIL-023: not a slop or UGC ad-factory tool; "no human authorship" is named as the category to avoid.
- WD-IDEA-PHIL-024: not an agent-takeover product; unsanctioned automation is out of scope.
- WD-IDEA-PHIL-036: highly technical tools are available when wanted but "never imposed by default."
- WD-IDEA-PHIL-006 ("The Inversion"): plan first, anchor second with cheap image models, generate last with expensive video models.
- WD-IDEA-PHIL-001: deterministic, fixed 12-stage workflow; narrative continuity and cost optimization.

## Gap analysis (facts only)

Where the reviewed primary pages show the position already served:

- Storyboard-level review before render with approval gates. Luma Scenes states "Nothing renders before your approval," with per-scene regeneration. [S-LUMA-SCENES]
- Shot-level control (duration, framing, angle, camera) and reusable character references. Kling Omni, Higgsfield AI Cast, Flick, OpenArt, Krea. [S-KLING-GUIDE] [S-HIGGS-CINEMA] [S-FLICK] [S-OPENART-PRICING] [S-KREA]
- Explicit licensing and commercial-use claims. Moonvalley (licensed data), Adobe (commercially safe, enterprise indemnification), Krea ("Do not train"). [S-MOONVALLEY] [S-ADOBE-PLANS] [S-KREA]
- A node or canvas workspace that holds scripts, characters, and shots together. Flick, Kling Canvas, Google Flow (Scenebuilder). [S-FLICK] [S-KLING-HOME] [S-FLOW-TIPS]

Where the reviewed primary pages do not show a corresponding feature:

- A single approved script as versioned source of truth with lineage tracking across stages. None of the primary pages reviewed describes stage-versioned artifacts or branching lineage. Flick, Kling Canvas, and Higgsfield describe script-to-shot assistance without describing versioning. [S-FLICK] [S-KLING-HOME] [S-HIGGS-CINEMA]
- A pre-render cost forecast at each stage. Credit costs are published per model on Runway and per second on Google's API. No reviewed primary page describes a cost estimate shown before each generation step. [S-RUNWAY-PRICING] [S-GEMINI-PRICING]
- Explicit human-authorship framing in the workflow itself. The authorship and licensing language on primary pages concerns training data and commercial use, not the creative process. [S-MOONVALLEY] [S-ADOBE-PLANS]
- Regenerating only the changed part of an approved sequence. Luma Scenes describes per-scene fixes and rerunning an approved sequence with one variable changed. This is the closest published example, and it operates on the storyboard and clip level, not on upstream script stages. Runway Aleph 2.0 also propagates one edit across shots, but on existing footage. [S-LUMA-SCENES] [S-RUNWAY-ALEPH]
- Voice and lip-sync that the user shapes per character and per shot. Kling offers voice binding per character; Google offers synchronized audio; Higgsfield does not mention lip-sync on its primary page. [S-KLING-GUIDE] [S-FLOW-VEO31] [S-HIGGS-CINEMA]
- Team collaboration in the creative process. Multi-user features appear on plan pages (Luma, Krea, Adobe), but the primary workflow pages describe single-creator flows. [S-LUMA-PRICING] [S-KREA-PRICING] [S-ADOBE-PLANS]

## Caveats and unverified claims

- LTX Studio: no primary page could be read. Its workflow, pricing, and Veo engine claims rest on secondary sources only. [S-LTX-WIKI] [S-GAPS]
- Kling pricing: the membership page could not be read. Aggregator prices conflict, so none are used. [S-GAPS]
- Higgsfield pricing and Soul ID: primary pricing returned metadata only; the Soul ID page returned 404. [S-GAPS]
- Google Flow per-clip credits: only on third-party sites. Google's primary plan page shows credit allotments but no dollar prices in the fetched text. [S-GOOGLE-PLANS]
- Luma Agents launch date (2026-03-05) comes from secondary press coverage; the primary post returned 403. [S-LUMA-AGENTS-SECONDARY]
- Runway character consistency: not found on any primary page reviewed. Runway's Gen-4 "world consistency" claim comes from a review site only.
- Adobe Firefly 5-second video caps conflict between the plans page and the features page (noted above).
- Google Flow "Veo 3.1" feature availability per plan and model naming (Omni Flash appears on the Google plans page) were not verified against a primary changelog.
- Dates on pages without visible publication dates (Higgsfield, Flick, Krea, Moonvalley homepage) are not given. The access date applies to all.
- Newer entrants (Utopai, Chapterframe.ai, Novi AI, FilmPilot.ai, Saga) were not verified on primary pages.

## Sources

Access date for every source: 2026-10-18.

- [S-FLOW-VEO31] Google, "Bringing new Veo 3.1 updates into Flow to edit AI video," 2025-10-15. https://blog.google/innovation-and-ai/products/veo-updates-flow/
- [S-FLOW-TIPS] Google, "5 tips for using Flow, Google's AI filmmaking tool," 2025-06-25. https://blog.google/innovation-and-ai/products/flow-video-tips/
- [S-FLOW-UPDATE] Google Labs, "Flow updates: New changes to Google AI video editing tool," 2026-02-25. https://blog.google/innovation-and-ai/models-and-research/google-labs/flow-updates-february-2026/
- [S-FLOW-HOME] Google Flow landing page (title and sign-in only in fetch). https://flow.google.com/
- [S-GOOGLE-PLANS] Google, Google AI plans page (no publication date shown; Flow credit allotments). https://one.google.com/about/google-ai-plans/
- [S-GEMINI-PRICING] Google, Gemini API pricing (page last updated 2026-10-16 UTC per page). https://ai.google.dev/gemini-api/docs/pricing
- [S-RUNWAY-PRICING] Runway, pricing page. https://runway.com/pricing
- [S-RUNWAY-ALEPH] Runway, "Introducing Aleph 2.0 and Edit Studio," 2026-05-21. https://runway.com/news/introducing-aleph-2-and-edit-studio
- [S-LUMA-PRICING] Luma, pricing page. https://lumalabs.ai/pricing
- [S-LUMA-NEWS] Luma, news index (Ray3 Modify 2025-12-18; Ray3.14 2026-01-26; Team Members and Admins 2026-04-01; Luma Scenes 2026-08-11). https://www.lumalabs.ai/news
- [S-LUMA-SCENES] Luma, "Introducing Luma Scenes," 2026-08-11. https://lumalabs.ai/news/introducing-luma-scenes
- [S-LUMA-AGENTS-SECONDARY] LBB Online, "Luma Launches Luma Agents," 2026-03 (secondary; primary post returned 403). https://lbbonline.com/news/luma-agents-launch-ai-2026
- [S-HIGGS-CINEMA] Higgsfield, Cinema Studio page (undated). https://higgsfield.ai/cinematic-video-generator
- [S-KLING-GUIDE] Kling AI, "Kling VIDEO 3.0 Omni Model User Guide" (undated). https://kling.ai/quickstart/klingai-video-3-omni-model-user-guide
- [S-KLING-HOME] Kling AI, homepage (copyright 2024-2026; Kling 4.0 headline; no release date). https://kling.ai/
- [S-KLING-LAUNCH-SECONDARY] PR Newswire release on Kling 3.0 (around 2026-02-05; secondary, located via search). https://finance.yahoo.com/news/kling-ai-launches-3-0-080000425.html
- [S-LTX-WIKI] Wikipedia, "LTX Studio" (launched February 2024 by Lightricks; secondary). https://en.wikipedia.org/wiki/LTX_Studio
- [S-KREA] Krea, homepage. https://www.krea.ai/
- [S-KREA-PRICING] Krea, pricing page (undated). https://www.krea.ai/pricing
- [S-OPENART-PRICING] OpenArt, pricing page (undated). https://openart.ai/pricing
- [S-ADOBE-PLANS] Adobe, Firefly plans page. https://www.adobe.com/products/firefly/plans.html
- [S-FIREFLY-VIDEO] Adobe, Firefly AI video generator features page (undated). https://www.adobe.com/products/firefly/features/ai-video-generator.html
- [S-MOONVALLEY] Moonvalley, Marey page (metadata dated 2026-07-21). https://moonvalley.com
- [S-FLICK] Flick, homepage and pricing (undated). https://flick.art/
- [S-CHAPTERFRAME-PR] Chapterframe.ai press release, 2026-10-09, syndicated on OpenPR (company claims, unverified). https://www.openpr.com/news/4655903/chapterframe-ai-launches-groundbreaking-ai-filmmaking
- [S-UTOPAI-WIKI] Wikipedia, "Utopai Studios" (secondary). https://en.wikipedia.org/wiki/Utopai_Studios
- [S-LISTICLE] Third-party listicle used only to discover entrants (The Visual Communication Guy, 2026-05-05). https://thevisualcommunicationguy.com/2026/05/05/five-ai-powered-film-pre-production-platforms-to-try-in-2026/
- [S-GAPS] Pages that could not be read from the vendor: ltx.io/studio, ltx.io/studio/pricing, ltx.io/blog (header-parse errors); kling.ai/membership (empty content); higgsfield.ai/pricing (metadata only); higgsfield.ai/soul-id (404); lumalabs.ai/news/luma-agents (404); runway.com/changelog not read; labs.google/fx/tools/flow redirected to flow.google.com (title only).

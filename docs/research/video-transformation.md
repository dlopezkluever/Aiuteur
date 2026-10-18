# Video transformation: what current models can do (as of 2026-10-18)

Research for Wayfinder issue #8 (map #1). Question: which video transformations can current models perform, with input limits, quality caveats, pricing, API availability, and licensing, and which are production-usable versus experimental.

Facts only. No product recommendation is made here.

## Method and status labels

- Sources are first-party where possible: vendor API docs and changelogs, pricing pages, model cards, license files, and repository READMEs. Each claim cites a numbered source in the [Sources](#sources) list. Source URLs are listed there.
- Secondary sources (aggregators, blogs, third-party hosts) are used only where no primary source was retrievable. They are labeled "secondary" in the text.
- Pages that could not be retrieved are labeled "unverified".
- Dates are the dates shown on the cited page. Sources that show no date are labeled "undated".

Status labels used in the matrix:

- **Production-usable**: a hosted API or license-clear open weights with documented input limits and price, and no preview or deprecation label blocking use. Output quality was not benchmarked in this research.
- **Experimental**: preview or beta label, open weights that need self-hosting and have no verified production path, non-commercial license, or capability evidenced only by secondary sources.
- **Unverified**: capability or term not confirmed from a primary source.

## Summary

- **Runway Aleph 2** (`aleph2`) is the newest hosted video-to-video editing model on Runway's API. It takes 2–30 s inputs and up to 5 timed keyframe images. It is priced at 28 credits per second with a 56-credit minimum [S1][S2].
- **Runway's original Gen-4 Aleph** and **Gen-3 Alpha Turbo** were removed from Runway Dev on 2026-07-30 [S1].
- **OpenAI's Sora 2 models and Videos API were shut down on 2026-09-24**, including the `/v1/videos/edits` and `/v1/videos/extensions` endpoints. OpenAI says no one-to-one replacement is available [S10].
- **Google Veo 3.1 and 3.1 Fast** support video extension: +7 s per extension, up to 20 extensions, but only for Veo-generated input at 720p, up to 141 s. Veo 3.1 Lite does not support extension [S7]. Veo model IDs carry a `-preview` suffix [S6].
- **Luma Ray 3.2 `video_edit`** takes a source video of up to 18 s (200 MB for URL or inline input) and outputs 360p to 1080p with up to 64 keyframe guide images. Its price is tiered by duration but the figures are on a separate page that was not retrieved [S5].
- **Runway API also exposes** Act-Two (performance transfer, 5 credits per second) [S1][S2] and Seedance 2.5 extend (`mode: "extend"`, 4–30 s output) [S1]. Act-Two's input limits are not documented in the sources retrieved.
- **Decart Lucy** lists `lucy-restyle-2` at $0.01/s and `lucy-2.5` at $0.04/s, both at 720p. Its pricing page does not state output license terms [S17].
- **Open weights with permissive licenses (Apache-2.0)**: Wan2.1-VACE-14B (masked video-to-video editing) [S14], Wan2.2-Animate-14B (animation and replacement modes) [S11][S13], Wan-Animate-2 (released 2026-08-07) [S12], and SAM 2 (video segmentation and tracking) [S21].
- **Open weights with non-commercial terms**: Lucy Edit Dev (`lucy-edit-dev-model-non-commercial-license`) [S18], ProPainter (video inpainting, "strictly for non-commercial purposes") [S25], and CoTracker (majority of code under CC-BY-NC) [S24].
- **Matting**: Robust Video Matting is GPL-3.0 [S22][S23]. SAM 3 is under a custom "SAM License" with gated checkpoints [S19][S20].
- **Relighting**: Beeble's desktop and web plans include a "Full commercial license." Its API is "separate from individual plans" and its price was not retrieved [S26].
- **No primary-source evidence was found** for a production Adobe Firefly video-editing API, Kling's own developer API (pages not retrievable), or Moonvalley's direct API and indemnity terms [S27][S28][S29][S30].

## Capability status at a glance

| Capability | Status today | Basis |
|---|---|---|
| Video-to-video restyle and general edit | Production-usable (hosted APIs) | Runway Aleph 2, Luma Ray 3.2, Decart Lucy restyle, Gemini Omni [S1][S2][S5][S17][S6]. Open weights experimental. |
| Object removal and inpainting | Experimental | No primary-source production removal API verified. Open options are either unbenchmarked (Wan VACE, Apache-2.0) or non-commercial (ProPainter, Lucy Edit Dev) [S14][S25][S18]. |
| Object replacement | Experimental | Wan2.2-Animate replacement mode (Apache-2.0, card ambiguous) [S11][S13]. Lucy Edit Dev is non-commercial [S18]. |
| Character insertion | Unverified / experimental | Only non-commercial or third-party evidence [S18][S34]. |
| Performance and motion transfer | Experimental / unverified | Runway Act-Two listed on API, limits undocumented [S1][S2]. Kling Motion Control third-party only [S29][S31]. Wan-Animate-2 open weights [S12]. |
| Shot extension | Production-usable with caveats | Veo 3.1 (preview IDs, 720p extension, Veo-generated input only) [S6][S7]. Seedance 2.5 extend via Runway [S1]. Sora extension discontinued [S10]. |
| Background replacement | Unverified | Secondary claims only [S32]. Non-commercial open option [S18]. |
| Matting and segmentation | Production-usable (open) | SAM 2 (Apache-2.0) [S21]. RVM (GPL-3.0) [S22][S23]. SAM 3 under SAM License [S20]. |
| Point tracking | Experimental for commercial use | CoTracker code majority CC-BY-NC, weights unclear [S24]. |
| Relighting | Production-usable as desktop/web product; API unverified | Beeble plans with full commercial license [S26]. Aleph relighting is secondary only [S32]. |

## Capability matrix

Columns: model or provider | input limits | pricing as published | API availability | license / commercial terms | status. Source numbers refer to the [Sources](#sources) list.

### 1. Video-to-video restyle and general editing

| Model / provider | Input limits | Pricing as published | API availability | License / commercial terms | Status |
|---|---|---|---|---|---|
| Runway Aleph 2 (`aleph2`) [S1][S2] | 2–30 s input; up to 5 keyframes at timestamps. Added to Runway Dev 2026-06-02. | 28 credits/s, 56-credit minimum. Developer portal credits at $0.01/credit, so $0.28/s [S2]. Whether the rate applies to input, output or both is not stated. | `POST` video-to-video endpoint, model `aleph2`. `aleph2_alpha` is a deprecated alias [S1][S3]. | Runway API terms not retrieved. Secondary sources conflict on access tier: one says Enterprise since January 2026 [S32]. | Production-usable (documented API). Tier access unverified. |
| Luma Ray 3.2 `video_edit` [S5] | Source ≤18 s. URL or inline input ≤200 MB, `video/*` MIME. Output 360p, 540p, 720p, 1080p (default 720p). Up to 64 keyframes. | Priced by duration (5 s and 10 s rates) at a tier different from generation. Figures not on the page retrieved. HDR costs more. | Luma Agents API `video_edit` request. | Not stated on page. | Production-usable (documented API). Pricing unverified. |
| Luma Ray 2 modify (legacy) [S4] | ray-2: ≤10 s, ≤100 MB. ray-flash-2: ≤15 s, ≤100 MB. Input resolution and format not specified. | ray-2 $0.01582 per megapixel; ray-flash-2 $0.00544 per megapixel. Example: ray-2 720p 5 s 16:9 = $1.75; ray-flash-2 = $0.60. | Legacy reference. Page banner points to the Luma Agents API. | Not stated on page. | Legacy. |
| Kling O3 video-to-video via Runway [S1] | Input video up to 10 s. Billed per second of input video. | Rate not retrieved. | Available through Runway Dev, models `klingO3_standard`, `klingO3_pro`, `klingO3_4k` (added 2026-10-13). | Kling's own terms not retrieved. Kling's official API docs were not retrievable [S29]. | Available via Runway (rate unverified). |
| Hailuo 3.0 and Seedance 2.0 video-to-video via Runway [S1] | Hailuo 3.0: 5–15 s, 768P or 2K output. Seedance 2.0: 4–15 s. | Hailuo 3.0 reference video billed at output rate, capped at 15 s. Seedance 2.0 4K: 150 credits/s. | Runway Dev. | Not retrieved. | Available via Runway. |
| Decart Lucy Restyle 2 (`lucy-restyle-2`) [S17] | Not stated on pricing page. | $0.01/s at 720p. Lucy 2.5 (`lucy-2.5`): $0.04/s at 720p. Realtime fast mode is 2× the realtime rate. Pay-as-you-go, no minimum. | Decart API platform. | No output license terms stated. | Available. Input limits unverified. |
| Gemini Omni Flash (`gemini-omni-1.1-flash`; preview ID `gemini-omni-flash-preview`) [S6][S8] | Google's pages do not list video input limits. Runway's route takes ≤10 s input, outputs 720p [S1]. | $1.50/M input tokens (video included). $17.50/M output tokens for video. 5,792 tokens per second of 720p video, which Google says is about $0.10/s [S6]. | Gemini API. Google recommends Omni Flash as default for video generation and "conversational video editing" [S8]. | Google terms [S9]: paid-tier prompts and responses are not used to improve products; you may not use the Services to develop competing models. | Available. Preview model IDs. |
| Wan2.1-VACE-14B (open weights) [S14] | Supports 480p (14B and 1.3B) and 720p (14B). Recommended ~81 frames. Any input size accepted, with recommended ranges. | Not applicable (self-hosted). | Open weights on Hugging Face. | Apache-2.0 [S14]. | Experimental for production. Open, permissive license. Quality not evaluated here. |
| LTX-2 (open weights, Lightricks) [S15][S16] | Video-to-video supported. Width and height divisible by 32; frame count divisible by 8+1. No maximum duration or resolution stated. | Not applicable (self-hosted). | Open weights. | LTX-2 Community License Agreement (page says usage "for purposes under that license"). Revenue threshold and restrictions not visible on fetched pages; full text is in LICENSE-2 files, which were not read [S16]. | Experimental. License needs review before commercial use. |

Quality caveats seen in sources:
- Lucy Edit Dev: "81-frame generations produce better temporal consistency than shorter clips." Color changes and global transformations are "less reliable" [S18].
- Luma Ray 3.2: 360p is labeled a draft tier [S5].

### 2. Object removal and inpainting

| Model / provider | Input limits | Pricing as published | API availability | License / commercial terms | Status |
|---|---|---|---|---|---|
| Runway Aleph 2 | Not verified from primary source. | Not verified. | Not verified. | Not verified. | Unverified. Object removal is claimed only by secondary sources [S33]. |
| Wan2.1-VACE-14B masked video-to-video (MV2V) [S14] | As in section 1. Mask-based editing listed as a task. Object removal is not named on the card. | Self-hosted. | Open weights. | Apache-2.0 [S14]. | Experimental. |
| ProPainter (video inpainting) [S25] | Not retrieved. | Self-hosted. | Open code and models. | NTU S-Lab License 1.0: "strictly for non-commercial purposes." Commercial use needs permission from the author [S25]. | Non-commercial only. |
| Lucy Edit Dev [S18] | Example uses 832×480, 81 frames (~3.4 s). Object removal not listed as supported. | Self-hosted. | Hugging Face. | `lucy-edit-dev-model-non-commercial-license` [S18]. | Non-commercial only. |
| Adobe Firefly video | No video editing endpoint found in Firefly Services docs. The Audio/Video API docs list Dynamic Graphics, Reframe, Translate and Lip Sync, TTS, and Text to Avatar, with no object removal [S27][S28]. | Not verified. | Not verified. | Not verified. | Unverified. Adobe's blog says Firefly "expanded" object add/remove for images [secondary]. |
| OpenAI Sora (edits endpoint) [S10] | N/A. | N/A. | Shut down 2026-09-24. | N/A. | Discontinued. |

### 3. Object replacement and character replacement

| Model / provider | Input limits | Pricing as published | API availability | License / commercial terms | Status |
|---|---|---|---|---|---|
| Wan2.2-Animate-14B, replacement mode [S11][S13] | Inputs: a video, a character image, and (for replacement) a background video and a mask video [S13]. Preprocess with `preprocess_data.py`; example targets 1280×720 area. Duration not stated. | Self-hosted. Single-GPU offload options; 8-GPU FSDP example. Requires torch ≥2.4.0. | Open weights (HF, GitHub). | Apache-2.0 [S11][S13]. | Experimental. The HF card describes replacement as "The model replaces the character image with the input video," which appears reversed. Behavior should be confirmed in the code. |
| Lucy Edit Dev [S18] | As in section 2. | Self-hosted. | Hugging Face. | Non-commercial [S18]. | Non-commercial only. Character replacement is listed as a capability. |
| Runway Aleph 2 | Not verified. | Not verified. | Not verified. | Not verified. | Unverified. |

### 4. Character insertion

| Model / provider | Input limits | Pricing as published | API availability | License / commercial terms | Status |
|---|---|---|---|---|---|
| Lucy Edit Dev [S18] | As in section 2. | Self-hosted. | Hugging Face. | Non-commercial [S18]. | Non-commercial only. "Object insertions and replacements" listed. |
| Kling O3 "elements" (third-party host only) [S34] | Element = frontal image plus up to 3 reference images. Limits from third-party sources only. | Third-party pricing, not verified. | Third-party hosts (fal, Segmind). Kling's official docs not retrieved [S29]. | Not verified. | Unverified. Third-party evidence only. |
| Veo 3.1 reference images [S7] | Up to 3 reference images. Available for Veo 3.1 models only. | Per second (see section 6). | Gemini API. | Google terms [S9]. | Generation, not editing. Not a verified insertion-into-existing-footage capability. |

### 5. Performance and motion transfer (live footage to a character)

| Model / provider | Input limits | Pricing as published | API availability | License / commercial terms | Status |
|---|---|---|---|---|---|
| Runway Act-Two [S1][S2] | Not in changelog or pricing page. Changelog describes "motion capture." No model identifier or endpoint listed. | 5 credits/s, i.e., $0.05/s at developer portal rate [S2]. | "Act-Two is now available on Runway Dev," dated 2025-07-21 [S1]. Official endpoint reference not found in retrieved pages. | Runway terms not retrieved. | Available via Runway API. Input limits and endpoint unverified. |
| Kling 2.6 / 3.0 Motion Control (third-party hosts only) [S31] | Reference video up to 30 s (video orientation mode). Image orientation mode up to 10 s (secondary) [secondary via Unifically]. Full body and head should be visible in the character image. | Third-party pricing, not verified. | Multiple third-party hosts (Vercel AI Gateway, Atlas Cloud, Kie.ai, apiframe, etc.). Kling's own docs not retrieved [S29]. | Not verified. | Experimental / unverified (official). Vercel marks it as beta for Pro and Enterprise plans [S31]. |
| Wan2.2-Animate-14B, animation mode [S11] | Video and character image. Preprocessed to 1280×720 area in example. No duration limit stated. | Self-hosted. | Open weights. | Apache-2.0 [S11]. | Experimental. Card: "mimics the human motion in the input video." |
| Wan-Animate-2 (base and distilled) [S12] | Reference image, driving video, text caption (LLM-generated recommended). Default 720P; 480P tested on 2× A800. No duration or FPS input limit stated. Example outputs 24 fps. | Self-hosted. Base: 40 steps. Distilled: 10 steps, guidance 1.0. | Open weights, released 2026-08-07. | Apache-2.0 [S12]. | Experimental. Lite variant described for streaming, no weights listed for it. |

### 6. Shot extension

| Model / provider | Input limits | Pricing as published | API availability | License / commercial terms | Status |
|---|---|---|---|---|---|
| Google Veo 3.1 and 3.1 Fast [S7] | Input must be Veo-generated. Up to 141 s, 720p, 9:16 or 16:9. Each extension adds 7 s, up to 20 times. Output up to 148 s at 720p. Not supported on Veo 3.1 Lite. Input video's 2-day storage timer resets on reference. | Standard (`veo-3.1-generate-preview`): $0.40/s at 720p and 1080p, $0.60/s at 4K. Fast (`veo-3.1-fast-generate-preview`): $0.10/s at 720p. No extension rate listed [S6]. Implied: 7 s × $0.40 = $2.80 per Standard extension, and 7 × $0.10 = $0.70 for Fast. This is an inference from listed per-second rates. | Gemini API. Preview model IDs [S6][S7]. | Google terms [S9]. Videos carry SynthID watermarks [S7]. | Production-usable with caveats: preview model IDs, 720p only for extension. |
| Runway Seedance 2.5 `extend` [S1][S2] | Input ≥480p. Output 4–30 s at 480p or 720p. Reference video and audio combined <30 s, up to 10 videos. 1080p video-to-video added 2026-08-15 [S1]. | 10 credits/s input at 480p (Seedance 2.5 video-to-video) [S2]. 34 credits/s input and reference video at 1080p [S1]. | Runway Dev, `seedance2_5`, `mode: "extend"`, `promptText` required [S1]. | Runway terms not retrieved. | Available via Runway. Production-usable on documented limits. |
| OpenAI Sora 2 extensions [S10] | Previously up to 20 s per extension, 6 extensions, 120 s total. | N/A. | Shut down 2026-09-24. | N/A. | Discontinued. |

### 7. Background replacement

| Model / provider | Input limits | Pricing as published | API availability | License / commercial terms | Status |
|---|---|---|---|---|---|
| Runway Aleph 2 | Not verified from primary source. Secondary: "background changes" listed as a best-fit use [S32]. | Not verified. | Not verified. | Not verified. | Unverified. |
| Lucy Edit Dev [S18] | "Scenery and style changes" listed. Non-commercial. | Self-hosted. | Hugging Face. | Non-commercial [S18]. | Non-commercial only. |

No primary-source evidence was found for a production background-replacement API.

### 8. Matting, rotoscoping, and tracking

| Model / provider | Input limits | Pricing as published | API availability | License / commercial terms | Status |
|---|---|---|---|---|---|
| SAM 2 (Meta) [S21] | Frame-based video predictor. Multi-object video segmentation and tracking. | Self-hosted. | Open code and checkpoints. | Apache-2.0 for checkpoints, demo and training code. Demo fonts under SIL OFL [S21]. | Production-usable (open, permissive). |
| SAM 3 (Meta) [S19][S20] | Detect, segment, and track with text or visual prompts. Concept prompts can find every instance of an open-vocabulary concept [S19]. Checkpoints gated on Hugging Face. | Self-hosted. | Open code. Checkpoints require approval and authentication [S19]. | "SAM License" (last updated 2025-11-19). Royalty-free, non-exclusive, worldwide, non-transferable limited license. Redistribution requires a copy of the agreement and acknowledgment. Must comply with trade controls. Licenses terminate on litigation claims (§5.b). Must delete materials on termination (§6) [S20]. | Usable under the SAM License. Legal review needed. |
| Robust Video Matting (human video matting) [S22][S23] | Recurrent model; processes video frame-to-frame with memory. Reported speeds on a GTX 1080 Ti: 4K 76 FPS, HD 104 FPS [S22]. | Self-hosted. | Open code. | GPL-3.0 [S23]. No separate commercial license stated [S22]. | Production-usable technically. GPL-3.0 copyleft applies to distributed derivatives (interpretation, not from the source). |
| CoTracker / CoTracker3 (point tracking) [S24] | Tracks points through video frames; single pixel, quasi-dense, or grid. | Self-hosted. | Open code. | Majority of code CC-BY-NC. Other parts MIT or Apache-2.0. Weights license not separately stated [S24]. | Non-commercial unless weight license is clarified. |

Not covered: hosted rotoscoping or matting APIs from video-generation vendors were not researched.

### 9. Relighting

| Model / provider | Input limits | Pricing as published | API availability | License / commercial terms | Status |
|---|---|---|---|---|---|
| Beeble SwitchLight (desktop and web) [S26] | Not retrieved from primary source. | Creator: $16/month billed annually (list $19), 540 credits/month. Professional: $60/month billed annually (list $75), 2,400 credits/month. Both list "Full commercial license." No revenue threshold stated on the page [S26]. | "The API is separate from individual plans." Price not on the page; directs to developer.beeble.ai (not retrieved) [S26]. | "Full commercial license" for individual plans [S26]. Secondary sources cite a revenue cap for an older Indie tier; not verified. | Production-usable as a desktop and web product. API unverified. |
| Runway Aleph 2 relighting | Not verified. Secondary sources list "relighting" as a best-fit use [S32]. | Not verified. | Not verified. | Not verified. | Unverified. |

## Licensing and terms that cut across providers

- **Google** (Gemini API terms, effective 2026-03-23, last updated 2026-04-28): on paid services, Google "doesn't use your prompts or responses to improve our products." Unpaid services are different. "You may not use the Services to develop models that compete with the Services." Google says generated content "may require the provision of attribution" when returned through an API call [S9].
- **Google** (Veo docs): all Veo videos carry SynthID watermarks [S7].
- **Runway**: the pricing guide says only "Credits can be purchased for $0.01 per credit in the developer portal for a project." Plan and enterprise access for API use is not stated [S2]. Secondary sources conflict on Aleph 2 access (Enterprise vs. all paid plans) [S32].
- **Moonvalley Marey** (licensed-data model): training data described as licensed (secondary) [S30]. Sources conflict on indemnification: one 2025 report says it covers only data collection contractors, another that it was planned for users [S30]. No 2026 confirmation found. Direct public API reportedly waitlisted; fal.ai hosts a Marey Realism workflow (secondary) [S30]. Not verified.

## Deprecations and changes

- **2026-07-30**: Runway `gen4_aleph` and `gen3a_turbo` no longer available on Runway Dev. Replacement for Gen-4 Aleph is Aleph 2.0 [S1].
- **2026-09-24**: OpenAI Sora 2 models and Videos API shut down. Edits, extensions, remix, and characters endpoints unavailable. No one-to-one replacement [S10].
- **Veo 3 and Veo 3 Fast** (`veo-3.0-generate-001`, `veo-3.0-fast-generate-001`) labeled "Deprecated," no shutdown date shown [S7].
- **Luma Ray 2 modify** docs carry a banner pointing to the newer Luma Agents API [S4].

## Conflicts and gaps

- **Kling**: official developer documentation (`kling.ai/document-api/...`, `kling.ai/dev/pricing`) returned no content in fetching. All Kling motion-control and O3 facts come from third-party hosts or from Runway's changelog (for O3 video-to-video only) [S1][S29][S31][S34]. Treat as unverified.
- **Runway Aleph 2 capabilities**: the official changelog gives input limits and endpoint, but no capability list. Object removal, relighting, background change, and character swap are secondary-only claims [S32][S33]. The official API reference page was truncated during fetching [S3].
- **Runway Act-Two**: no primary endpoint reference or input limits found. Only changelog and pricing entries [S1][S2].
- **Wan2.2-Animate-14B replacement mode**: model card wording appears reversed. Secondary sources describe a "Mix" mode that the card does not mention [S11]. Confirm in code before relying on it.
- **Veo 3 duration/resolution**: the Veo docs list different values in the parameter table and the feature table [S7]. Only the parameter table was used here.
- **Adobe Firefly**: no video API endpoint in Firefly Services docs [S27][S28]. Generative Extend in Premiere is secondary (a 2024 announcement and a community support post) [secondary].
- **Beeble API**: price and terms not retrieved [S26].
- **Moonvalley**: indemnification and direct API status unverified [S30].
- **LTX-2 license**: revenue threshold and use restrictions are in LICENSE-2 files that were not read [S16].
- **Hosted matting or rotoscoping APIs**: not researched.

## Sources

Retrieved 2026-10-18. Dates are the dates shown on each page.

- [S1] Runway API changelog. https://docs.dev.runwayml.com/api-details/api_changelog/
- [S2] Runway API pricing guide. https://docs.dev.runwayml.com/guides/pricing/
- [S3] Runway API reference (truncated; navigation only). https://docs.dev.runwayml.com/api/
- [S4] Luma Modify Video API (Ray 2, legacy). https://docs.lumalabs.ai/docs/modify-video
- [S5] Luma Agents API, video editing guide. https://docs.agents.lumalabs.ai/guides/videos/editing/
- [S6] Gemini API pricing (last updated 2026-10-16 UTC). https://ai.google.dev/gemini-api/docs/pricing
- [S7] Gemini API Veo guide. https://ai.google.dev/gemini-api/docs/veo
- [S8] Gemini API video overview (last updated 2026-06-30 UTC). https://ai.google.dev/gemini-api/docs/video
- [S9] Gemini API terms (effective 2026-03-23, last updated 2026-04-28 UTC). https://ai.google.dev/gemini-api/terms
- [S10] OpenAI video generation guide (Sora 2; shutdown notice). https://developers.openai.com/api/docs/guides/video-generation
- [S11] Wan2.2-Animate-14B model card. https://huggingface.co/Wan-AI/Wan2.2-Animate-14B
- [S12] Wan2.2-Animate-2-14B model card (release 2026-08-07). https://huggingface.co/Wan-AI/Wan2.2-Animate-2-14B
- [S13] Wan2.2 repository. https://github.com/Wan-Video/Wan2.2
- [S14] Wan2.1-VACE-14B model card. https://huggingface.co/Wan-AI/Wan2.1-VACE-14B
- [S15] LTX-2 model card (Lightricks). https://huggingface.co/Lightricks/LTX-2
- [S16] LTX-2 LICENSE page (license versions and applicability dates). https://github.com/Lightricks/LTX-2/blob/main/LICENSE
- [S17] Decart API pricing. https://docs.platform.decart.ai/getting-started/pricing
- [S18] Lucy Edit Dev model card (Decart). https://huggingface.co/decart-ai/Lucy-Edit-Dev
- [S19] SAM 3 repository. https://github.com/facebookresearch/sam3
- [S20] SAM 3 LICENSE ("SAM License"). https://github.com/facebookresearch/sam3/blob/main/LICENSE
- [S21] SAM 2 repository. https://github.com/facebookresearch/sam2
- [S22] Robust Video Matting repository. https://github.com/PeterL1n/RobustVideoMatting
- [S23] Robust Video Matting LICENSE (GPL-3.0). https://raw.githubusercontent.com/PeterL1n/RobustVideoMatting/master/LICENSE
- [S24] CoTracker repository. https://github.com/facebookresearch/co-tracker
- [S25] ProPainter repository. https://github.com/sczhou/ProPainter
- [S26] Beeble pricing page (© 2026). https://www.beeble.ai/pricing
- [S27] Adobe Firefly Services developer docs. https://developer.adobe.com/firefly-services/docs/
- [S28] Adobe Audio/Video Firefly Services. https://developer.adobe.com/audio-video-firefly-services/
- [S29] Kling motion control API reference (not retrievable; redirect to https://kling.ai/document-api/apiReference/model/motionControl returned only a title). https://kling.ai/document-api/apiReference/model/motionControl
- [S30] Moonvalley Marey coverage (secondary). https://techcrunch.com/2025/03/12/moonvalley-releases-a-video-generator-it-claims-was-trained-on-licensed-content/ and https://venturebeat.com/ai/moonvalleys-marey-is-a-state-of-the-art-ai-video-model-trained-on-fully-licensed-data
- [S31] Vercel AI Gateway, Kling 2.6 motion control (secondary). https://vercel.com/ai-gateway/models/kling-v2.6-motion-control
- [S32] Pexo, Runway Aleph 2.0 overview (secondary). https://pexo.ai/blog/what-is-runway-aleph-2-0-6791
- [S33] Scenario, Runway Aleph essentials (secondary). https://help.scenario.com/articles/6499445829-runway-aleph-the-essentials
- [S34] fal.ai, Kling O3 Pro video-to-video API reference (secondary). https://fal.ai/docs/model-api-reference/video-generation-api/kling-video-o3-pro-video-to-video

# Video generation model capabilities (as of 2026-10-18)

Research for issue #5 (Wayfinder research ticket, map issue #1). Facts only, no product recommendation.

Method: vendor API docs and model cards fetched directly on 2026-10-18. Where a vendor page could not be rendered or fetched, the fact is taken from a search-result excerpt or a third-party page and is marked as such. Source IDs `[S#]` map to the list at the end. Page dates are the dates printed on the page, or "no date" if none was shown.

Conventions used in the tables:

- "Not stated" means the consulted primary page did not say.
- "Not captured" means I could not reach a primary page that would answer it.
- "(excerpt)" means the fact came from a search-result excerpt of a vendor page, not a full fetch.
- "(secondary)" means a third-party page, not the vendor.

## Headline facts

- OpenAI Sora 2 and Sora 2 Pro were shut down on 2026-09-24. OpenAI states "No one-to-one replacement API is available." [S4][S5]
- Veo 3.1 is the only model here with a documented 4/6/8 s duration set, a documented 3-image reference-image mode (8 s only, not on Lite), and a documented 7 s x up to 20 extension path. [S1]
- Wan 3.0 documents first+last frame and reference images but says the two cannot be combined in one request. [S17]
- Kling 3.0 documents start frame plus element reference together, and first+last frame, with native audio and a custom multi-shot mode. [S8][S9 excerpt]
- Luma Ray 3.2 documents start and end frames, plus up to 64 keyframes pinned to output-frame indexes. A 10 s clip cannot use start/end frames. [S11]
- LTX (API, 2.5 and 2.3) bills per second of generated output. Automatic duration is billed on the length the model produces. [S20]
- Veo 3.1 Standard is $0.40/s at 720p and 1080p and $0.60/s at 4K, with audio. Fast and Lite are cheaper. [S2]
- Runway lists Gen-4.5 at 12 credits/s, which is $0.12/s at $0.01 per credit. Runway's page does not say whether requested or generated duration is billed. [S6]
- Seed is documented as non-deterministic on Veo and Wan, so seed-based reproducibility is not guaranteed. [S1][S17][S18]
- Native audio defaults to on for Veo 3.1, LTX-2.5, Wan 3.0, and Gemini Omni. Kling 3.0's API excerpt says audio defaults to off. Grok 1.5's default is not stated. [S1][S17][S20][S26][S9 excerpt]
- Negative prompts are documented for Wan 2.7 (500 chars) and not documented for Veo 3.1 or Wan 3.0. Gemini Omni has no negative-prompt parameter. [S1][S17][S18][S26]
- Async pattern is common to all hosted APIs here: create a task, poll (or receive a callback), then download a presigned or expiring URL. Output URLs expire in 1 h (Luma, OpenAI) or 24 h (Wan). Veo keeps generated videos for 2 days. [S1][S4][S11][S18]
- No primary source for Pika was reachable. Pika is not in the matrix. [gap]

## Comparison matrix

### A. Conditioning and references

| Model (ID as documented) | First frame | First + last frame | Reference images (max; with first frame?) | Extension / continuation | Timed keyframes inside one clip |
|---|---|---|---|---|---|
| Veo 3.1 (`veo-3.1-generate-preview`) [S1] | Yes, `image` | Yes, `lastFrame` with `image`. Listed for Veo 3.1, 3.1 Fast, and 3.1 Lite. | Up to 3, `referenceType: "asset"`. Only Veo 3.1 and 3.1 Fast; not Lite. Requires 8 s. Combination with `image` not stated. | Extend by 7 s, up to 20 times. Input must be Veo-generated, up to 141 s, 720p, 9:16 or 16:9. Output up to 148 s. Not on Lite. | Not stated |
| Veo 3.1 Fast (`veo-3.1-fast-generate-preview`) [S1] | Yes | Yes | Up to 3 (as above) | Yes (as above) | Not stated |
| Veo 3.1 Lite (`veo-3.1-lite-generate-preview`) [S1] | Yes | Yes | No reference images | No extension | Not stated |
| Gemini Omni Flash 1.1 (`gemini-omni-1.1-flash`) [S26] | One reference image plus prompt. The model "decides how to use the image based on the prompt." Not documented as a pinned first frame. | Two images in input list, transition described in prompt | Subject reference: maximum image count not stated. Video references: up to 3 clips, up to 3 s each. | Extension adds 3-10 s per step, up to 40 s total (prompt guide) | Not stated |
| Sora 2 / 2 Pro (`sora-2`, `sora-2-pro`) [S4][S5] | Yes, image acts as first frame. Faces of humans in input images are rejected. | Not documented | Character uploads, 2-4 s (not image refs) | Extensions up to 20 s each, max 6 extensions, 120 s total. Shut down 2026-09-24. | Not documented |
| Kling 3.0 (`kling-v3`, `kling-v3-omni`) [S8][S9 excerpt][S10 excerpt] | Yes | Yes. Last-frame-only not supported. Multi-shot and first/last no longer mutually exclusive for `kling-v3` and `kling-v3-omni` (May 2026 changelog, excerpt). | Element reference: 2-4 images per element. Start frame plus element reference is supported (guide). Max element count not captured. | Not captured | Custom multi-shot mode: configurable shot count and per-shot durations. Max shots not stated. [S8] |
| Kling 2.5 Turbo Pro [S7] | Yes | Optional last frame | Not captured | Not captured | Not captured |
| Runway Gen-4.5 (`gen4.5`) [S7] | Image-to-video supported; exact input rules not captured | Not captured | Not captured | Not captured | Not captured |
| Luma Ray 3.2 (`ray-3.2`) [S11] | Yes, `video.start_frame` | Yes, `video.end_frame` (type `video` only). Start/end not allowed with `duration: "10s"`. | Not stated on this page | Extension by passing a completed generation's ID as a keyframe: forward via `start_frame`, backward via `end_frame`. | Yes. `keyframes` (1-64 images) with `keyframe_indexes` at output-frame positions. 0-120 for 5 s, 0-240 for 10 s (24 fps). Mutually exclusive with `start_frame`, `end_frame`, `loop`. |
| MiniMax H3 / H3 Max (`MiniMax-H3`, `MiniMax-H3-Max`) [S13] | Yes, role `first_frame` | Yes, role `last_frame`. 0-2 anchor images total. | Up to 9, role `reference_image`. Combination with first frame not stated. Also up to 3 reference videos (2-15 s each, 15 s total) and up to 3 audio clips. Mixed inputs capped at 12 files. | Not stated | Not stated |
| Seedance 2.0 (`dreamina-seedance-2-0-260128`) [S14 excerpt][S15] | Yes, 1 image | Yes, 2 images | Multimodal reference mode: 1-9 images. Listed as a separate mode from first frame; combination not stated. Up to 3 reference videos (2-15 s each, total under 15 s). Up to 3 reference audio clips. | Not captured. `return_last_frame` returns the final frame for stitching (excerpt). | Not captured |
| Seedance 2.5 [S16 excerpt][S7] | Not captured | Not captured | Up to 30 images, 10 video clips, 10 audio clips as reference (launch post, excerpt) | Not captured | Not captured |
| Wan 3.0 (`wan3.0-video`, `wan3.0-video-prime`; preview) [S17] | Yes, `first_frame` | Yes, `last_frame`. Either alone or together. | Up to 10 reference images. Up to 5 reference videos and up to 5 reference audio clips (each 1-15 s, total up to 15 s). First/last frame modes cannot be combined with reference inputs in the same request. | Not captured on this page | Not documented |
| Wan 2.7 image-to-video (`wan2.7-i2v-2026-04-25`) [S18] | Yes, `first_frame` | Yes, `first_frame` + `last_frame` | Not offered in this API. Modes: first frame, first+last, `first_clip` (video continuation), first_clip+last_frame, plus driving audio. Legacy wan2.6 and earlier: first frame only. | Yes, `first_clip` 2-10 s input. `duration` caps total output. | Not documented |
| LTX API v2, `ltx-2-5-pro`, `ltx-2-5-fast`, `ltx-2-3-pro`, `ltx-2-3-fast` [S20][S21] | Yes, `image_uri` | Yes, `last_frame_uri`. Cannot combine with `duration: null`. | Not on the v1 image-to-video page reviewed | Extend: billed on extended portion plus context frames, capped at 505 frames (about 21 s at 24 fps) | Not documented beyond `last_frame_uri` |
| Grok Imagine Video 1.5 (`grok-imagine-video-1.5`) [S24][S25 excerpt] | Yes | Yes, first and last (excerpt) | Up to 14 reference images and 3 voice references (excerpt). Pins first, last, and up to 4 mid-video keyframes (excerpt). | Original `grok-imagine-video` (not 1.5): extension adds 2-10 s (excerpt). 1.5 extension not captured. | Up to 4 mid-video keyframes (excerpt) |
| LTX-2 open weights (19B) [S22] | Model card lists image-to-video and image-text-to-video pipelines. First-frame behavior not described as such. | Not stated | Not stated | Not stated | Not stated |
| Wan2.2 I2V-A14B open weights [S23] | Image-to-video only | Not stated | Not stated | Not stated | Not stated |
| Pika (Pikaframes) | Not captured from primary | Not captured from primary. Secondary: up to 5 keyframe images, up to 25 s (fal.ai hosted endpoint). [S27 secondary] | | | |

### B. Output: durations, resolutions, audio, controls

| Model | Durations | Aspect ratios | Resolutions | Native audio / dialogue / lip-sync | Seed | Negative prompt | Prompt length |
|---|---|---|---|---|---|---|---|
| Veo 3.1 family [S1] | 4, 6, or 8 s. 8 s required for extension, reference images, and 1080p/4K. Lite: 4, 6, 8 with 8 s needed for references or 1080p. | 16:9 (default), 9:16 | 720p default; 1080p and 4K only at 8 s (Fast/Standard). Lite: up to 1080p, no 4K. Extension: 720p only. 24 fps, 1 video per request. | Audio always on for all models. Dialogue in quotes, SFX, ambience cues. English fully supported; other languages untested. | Documented for Veo 3 models; "doesn't guarantee determinism, but slightly improves it." Veo 3.1 not explicit. | Not mentioned | 1,024 tokens for all listed models |
| Gemini Omni Flash 1.1 [S26] | 3-10 s per generation (excerpt, secondary); extension steps 3-10 s, up to 40 s total | 9:16, 16:9 (default) | 360p, 720p (default), 1080p and 4K (1080p and 4K labeled upscaled) | Audio on by default; steered by prompt. Voice editing not supported. Audio references not accepted. | Not mentioned | Not supported as parameter; put negatives in prompt | No limit stated |
| Sora 2 / 2 Pro [S4] | 16 s and 20 s (OpenAI page). Examples use `seconds="8"`, not reconciled on page. Secondary: 4/8/12 (sora-2), 10/15/25 (sora-2-pro). | 1280x720, 720x1280 (sora-2); 1920x1080, 1080x1920 on sora-2-pro (secondary; API reference not captured) | 720p sora-2; 1080p on sora-2-pro | Not captured | Not captured | Not captured | Not captured |
| Kling 3.0 [S8][S9 excerpt] | 3-15 s (guide) | Not captured. Image input aspect ratio must be between 1:2.5 and 2.5:1 (excerpt). | 720p and 1080p (guide). 4K listed in Runway's pricing for `kling3.0_4k` (secondary). | Native audio option. Lip-sync and expressions described as natural. Languages: Chinese, English, Japanese, Korean, Spanish, plus dialects. Other languages translated to English. Three or more characters supported. | Not captured | Not captured | Not captured |
| Kling 2.5 Turbo Pro [S7] | 5 or 10 s | Not captured | Not captured | Not captured | Not captured | Not captured | Not captured |
| Runway Gen-4.5 [S6][S7] | 2-10 s (secondary only; not verified against Runway) | Not captured | Pricing lists professional formats (ProRes, PNG sequence, HDR); not resolutions | `audio` defaults to `true` on Runway's pricing page, for models that support it | Not captured | Not captured | Not captured |
| Luma Ray 3.2 [S11] | 5 s (default) or 10 s. 10 s is incompatible with HDR, start/end frames, loop. | 9:16, 3:4, 1:1, 4:3, 16:9, 21:9. Omitted: model picks based on prompt and anchors. | 360p (draft, SDR only), 540p (no HDR), 720p (default), 1080p. HDR at 720p/1080p only. | Not covered on the page | Not covered on the page | Not covered on the page | 1-6,000 characters |
| MiniMax H3 [S13] | H3: 4-15 s integer. H3 Max: 5-15 s integer. | "Common ratios or adaptive" (not enumerated on page) | H3: 768P or 2K. H3 Max: 480P or 768P. Regeneration upgrades 768P to 2K. | Native audio listed on Runway's model list (secondary). MiniMax page: audio only as reference input; audio output not described. | Not covered on page | Not covered on page | 7,000 characters |
| Seedance 2.0 [S14 excerpt][S15] | 4-15 s, integer, 24 fps, mp4 | Not captured | 1080p not supported in reference-image scenarios. 4K only on Seedance 2.0 (excerpt). | Audio and video co-generation (model table, excerpt). Lip-sync not captured. | Not captured | Not captured | Not captured |
| Seedance 2.5 [S16 excerpt][S7] | 4-30 s (excerpt) | Not captured | 480p, 720p, 1080p (Runway list) | Not captured | Not captured | Not captured | Not captured |
| Wan 3.0 [S17] | Default 5 s. 2-30 s without video input. With video input, input plus output max 30 s. `-1` = model chooses (smart duration). | adaptive (default), 21:9, 16:9, 4:3, 1:1, 3:4, 9:16 | 1080P (default), 720P, 480P | `audio` boolean, default true, no price change. Driving audio input drives lip-sync on Wan 2.7 (see row below). No separate dialogue parameter documented for 3.0. | 0 to 2,147,483,647, or -1 (random). "Same seed may still produce results that are not identical." | Not documented on this page | 20,000 characters. `prompt_extend` (default true) rewrites prompts with an LLM; required when file or link is provided. |
| Wan 2.7 i2v [S18] | Integer 2-15 s, default 5 | Output follows input first frame/clip; not guaranteed to match exactly | 720P, 1080P (default 1080P) | Driving audio (WAV/MP3, 2-30 s) drives lip-sync and action. Without it, model generates BGM/SFX. | 0 to 2,147,483,647. Not guaranteed identical. | Up to 500 characters | 5,000 characters |
| LTX API 2.5/2.3 [S20][S21][S19 excerpt] | Integer or `null`. `null` (2.5 models only) lets the model choose from prompt. Up to 20 s per request (excerpt). | 9:16 and 16:9 at 1440p/4K for 2.5-pro (changelog excerpt). Other ratios per Supported Models page, not captured. | 720p, 1080p, 1440p, 4K (pricing tiers). fps default 24. | `generate_audio` default true | Not on v2 page | Not on v2 page | Not stated |
| Grok Imagine Video 1.5 [S24][S25 excerpt] | 1-15 s | 1:1, 16:9, 9:16, 4:3, 3:4, 3:2, 2:3, 21:9, 5:2 (excerpt). I2V output matches input image aspect; `aspect_ratio` ignored. | 480p, 720p, 1080p | Native audio and audio-driven performance (Runway list). Voice references (3). | Not captured | Not captured | Not captured |
| LTX-2 open weights [S22] | No maximum stated. Example is 121 frames at 24 fps. | Not stated | Not stated; width and height divisible by 32 | Synchronized audio and video in one model; audio may be lower quality without speech | Not stated | Not stated | Not stated |
| Wan2.2 I2V-A14B open weights [S23] | Not stated | Follows input image | 480P, 720P | None | Not stated | Not stated | Not stated |

### C. Pricing, latency, and async shape

| Model | Price unit and list price (as documented) | Billed duration basis | Typical latency | Async shape and output retention |
|---|---|---|---|---|
| Veo 3.1 Standard [S2] | Per second, video with audio (default). 720p $0.40/s, 1080p $0.40/s, 4K $0.60/s. Example: 8 s at 720p = $3.20 (computed). | Not stated. Charged "only if your video is successfully generated." Filtered-generation billing not stated. | "Min: 11 seconds; Max: 6 minutes (during peak hours)." [S1] | `POST models/{model}:predictLongRunning` returns an operation. Poll operation by name until `done`. Output at `response.generateVideoResponse.generatedSamples[0].video.uri`. Videos stored 2 days; extension resets timer. [S1] |
| Veo 3.1 Fast [S2] | 720p $0.10/s, 1080p $0.12/s, 4K $0.30/s | As above | As above | As above |
| Veo 3.1 Lite [S2] | 720p $0.05/s, 1080p $0.08/s. No 4K. | As above | As above | As above |
| Gemini Omni Flash 1.1 [S26][S6 for Runway price] | Google price not captured. Runway lists 3.4 / 10 / 15 / 30 credits/s at 360p / 720p / 1080p / 4K (credits at $0.01). | Not captured | Not captured | Sync `interactions.create` returns video inline. For files over 4 MB, `delivery="uri"` then poll the file until `ACTIVE` (or `FAILED`), then download. No operation name or retention period stated. [S26] |
| Sora 2 / 2 Pro [S4][S28 secondary] | OpenAI page gives no prices; it says sora-2-pro is "more expensive to run". Secondary, unverified: $0.10/s sora-2 at 720p; $0.30 / $0.50 / $0.70 per s for sora-2-pro at 720p / 1024p / 1080p. | Not captured | Not captured | `POST /videos` returns job with `queued` or `in_progress`. `GET /videos/{id}` polls. Statuses: `queued`, `in_progress`, `completed`, `failed`. Webhooks: `video.completed`, `video.failed`. Download URLs valid 1 h. Shut down 2026-09-24. [S4] |
| Kling 3.0 [S8] | Kling credits per second (not USD on the guide). 1080p: native audio 12/s, no native audio 8/s, voice control +2. 720p: native audio 9/s, no native audio 6/s, voice control +2. | "Charged per second, with different rates for each mode." Requested vs generated not stated. | Not captured | Not captured (Kling API docs did not render). Endpoint excerpt: `POST /image-to-video/kling-3.0` (excerpt). |
| Runway Gen-4.5 [S6] | 12 credits/s = $0.12/s at $0.01/credit. Professional formats (ProRes, PNG sequence): +5 credits/s. HDR/10-bit: +20 credits/s (+40 above 4 MP). | Not stated. Failed-generation billing not stated. | Not captured | Task API: `POST /v1/image_to_video`, `GET /v1/tasks/{id}` (nav, excerpt) [S7]. Status values and expiry not captured. |
| Luma Ray 3.2 [S11] | Priced by duration, resolution, and HDR. Dollar amounts on Luma's pricing page (not captured). | Not captured | "5s/720p generation typically finishes in under two minutes. A 10s/1080p HDR generation can take several times longer." [S11] | `POST` create; poll `GET /v1/generations/{id}` until `completed` or `failed`. Submission returns HTTP 201 with `queued`. Output: presigned MP4 URL, expires after 1 hour. Generation ID does not expire. Older Dream Machine page documents `callback_url` POST notifications [S12]. |
| MiniMax H3 / H3 Max [S6 for Runway price][S13] | Not on MiniMax page. Runway lists H3 Max 5/s (480p), 8/s (768p); H3 10/s (768p), 15/s (2K), +2 credits per reference image or keyframe. (Runway credits.) | Not captured | Poll every 10 s (recommended). Not stated. | Create returns `task_id`. Poll status (sample checks `succeeded`, `failed`, `cancelled`). Download from `content.url`. [S13] |
| Seedance 2.0 [S6 for Runway price][S15 excerpt] | BytePlus pricing not captured. Runway lists 36/s (480p/720p), 40/s (1080p), 150/s (4K); Fast 29/s (480p/720p); Mini 16/s (64-credit minimum). | Not captured | Not captured | Endpoints: create, retrieve, list, cancel/delete (BytePlus index, dated Oct 17, 2026) [S15]. Status values and expiry not captured. |
| Wan 3.0 [S17][S6 for Runway price] | Alibaba page gives no per-second rate. Runway lists `wan3` 5/s (480p), 10/s (720p), 20/s (1080p) (credits); `wan3_prime` 6.8/14/28. | Result fields include `duration`, `input_video_duration`, `output_video_duration`. Billing basis is inferred from those fields, not stated. | Not captured | Create: `POST /api/v1/services/aigc/video-generation/video-synthesis` with `X-DashScope-Async: enable` (required). Poll `GET /api/v1/tasks/{task_id}` about every 15 s. Statuses: PENDING, RUNNING, SUCCEEDED, FAILED, CANCELED, UNKNOWN. `task_id` valid 24 h. `video_url` (MP4) expires after 24 h. [S17] |
| Wan 2.7 i2v [S18] | Per second. Rate on Alibaba's model pricing page (not captured). "Duration directly affects cost." | `usage.duration` is the billed total. Continuation example: 15 s cap with 3 s input is billed at 15 s total output. | "Tasks typically take 1 to 5 minutes." [S18] | Same async shape as Wan 3.0. Video URL expires after 24 h. SDK requires Python 1.25.16+ or Java 2.22.14+ for the new protocol. [S18] |
| LTX 2.5 / 2.3 (v2 API) [S20] | Per second of generated video. 2.5-fast: 720p $0.09, 1080p $0.13, 1440p $0.19, 4K $0.30. 2.5-pro: $0.12 / $0.17 / $0.25 / $0.39. 2.3-fast: $0.03 / $0.06 / $0.12 / $0.24. 2.3-pro: $0.04 / $0.08 / $0.16 / $0.32. Audio-to-video billed on input audio. | Generated duration. With `duration: null`, "you are charged for the length the model produces." Prepaid holds the longest allowed duration, then releases unused credit. | Not captured | v2 is async. v1 `POST https://api.ltx.io/v1/image-to-video` is synchronous and returns the file. v1 stops working after 2026-10-26 23:59 UTC (deprecation). v2 polling endpoint not captured. Retention not stated. [S21] |
| Grok Imagine Video 1.5 [S24][S25 excerpt] | Model page: $0.080/s with no resolution breakdown. Overview excerpt: 480p $0.08, 720p $0.14, 1080p $0.25 per second. Runway list: 10 / 16 / 29 credits/s. Lite (excerpt): $0.02 / $0.03 / $0.14. | Not stated | Not captured | Request-based API; rate limit 10 req/s (model page). Status and expiry not captured. |
| LTX-2 open weights [S22] | Not applicable (self-hosted) | Not applicable | Not applicable | Not applicable |
| Wan2.2 I2V-A14B open weights [S23] | Not applicable | Not applicable | Example command needs a GPU with at least 80 GB VRAM. | Not applicable |
| Pika | Not captured from primary. Secondary only; inconsistent. | | | |

Safety and content rules that were documented:

- Veo 3.1: outputs pass safety filters and memorization checks. `personGeneration` values are restricted by mode. Text-to-video and extension accept `allow_all` only. Image-to-video, interpolation, and reference images accept `allow_adult` only. In EU, UK, CH, and MENA, `allow_adult` is the only value. [S1]
- Sora 2 (shut down): input images with human faces are rejected. [S4]
- Gemini Omni: images of minors are not supported in the EEA, Switzerland, or UK; images containing certain recognizable people are not supported. [S26]
- Seedance 2.x: reference images or videos with real human faces cannot be uploaded directly; an allowlisted material library is used instead. [S14 excerpt]
- LTX v1: HTTP 422 for content rejected by safety filters. [S21]
- Other vendors: not captured.

## Design assumptions from issue #5

Verdicts are relative to the documented capabilities above. "Model-dependent" means the answer changes by model and the captured sources do not settle it for every model.

| # | Assumption (from the ticket) | Verdict | Evidence |
|---|---|---|---|
| A1 | The video model can bridge two approved anchors (first and last frame) (PHIL-006, GEN-007) | Model-dependent. Holds for Veo 3.1 family, Wan 2.7/3.0, Kling 3.0, Luma Ray 3.2, LTX API, MiniMax H3, Seedance 2.0, and Gemini Omni (two images with prompt transition). Fails for Sora (no last frame documented; now shut down). Luma Ray 3.2 fails at 10 s. Omni's single-image mode does not document a pinned first frame. | [S1][S8][S11][S13][S17][S18][S20][S26] |
| A2 | A first frame and identity or style references can be used together (GEN-011 vs GEN-072 conflict) | Model-dependent. Fails for Wan 3.0 (first/last frame cannot be combined with reference inputs). Holds for Kling 3.0 (start frame plus element reference) and Grok 1.5 (references plus first and last, excerpt). Not stated for Veo 3.1 (references need 8 s; combination with `image` not stated), MiniMax H3, Seedance 2.0 (separate modes), Luma Ray 3.2. | [S1][S8][S17][S24] |
| A3 | Clip duration is a fixed 8 s (SHOT-012 to SHOT-016) | Fails as a general premise. Only Veo 3.1 has an 8 s constraint, and it applies to reference images, extension, and 1080p/4K. Other documented ranges: Veo 4/6/8; Kling 3.0 3-15; Seedance 2.0 4-15; MiniMax H3 4-15; Wan 2.7 2-15; Wan 3.0 2-30; Luma 5 or 10; LTX up to 20 per request; Grok 1.5 1-15. | [S1][S8][S11][S13][S17][S18][S20][S24] |
| A4 | Durations 4/6/8 s (the V1 clamp set) | Veo-specific. Holds for the Veo 3.1 family. Not documented for other models. Veo docs do not say what happens to out-of-set requests. | [S1] |
| A5 | Native 9:16 is available (GEN-077) | Model-dependent. Documented for Veo 3.1 family (all variants), Wan 3.0, Luma Ray 3.2, Gemini Omni, Grok 1.5 (excerpt), LTX 2.5-pro at 1440p/4K (excerpt). Not captured for Kling 3.0, Seedance 2.0, Runway Gen-4.5. MiniMax H3 lists "common ratios" without enumerating 9:16. | [S1][S11][S17][S26][S24][S20][S13] |
| A6 | Seeds give reproducible renders (GEN-080, GEN-081) | Fails as a reproducibility guarantee. Veo: "doesn't guarantee determinism." Wan: "same seed may still produce results that are not identical." Seed availability: documented for Wan 2.7/3.0 and Veo 3 family; not documented for Omni, LTX v2, Luma Ray 3.2. | [S1][S17][S18] |
| A7 | Billed duration equals delivered duration; billing is not clamped (PROV-0013, PROV-0027, FACT-0127) | Model-dependent. LTX bills generated output length (explicit). Wan 2.7 bills `usage.duration` (explicit; continuation billed on total output). Veo: billed per second on the pricing page; the docs do not say whether requested or delivered length is billed. Runway, Kling, Omni: not stated. | [S1][S2][S6][S8][S18][S20] |
| A8 | Native audio and dialogue lip-sync are available for dialogue shots (question scope) | Model-dependent. Documented: Veo 3.1 (dialogue in quotes, English fully supported), Kling 3.0 (lip-sync, five languages), Wan 2.7 (driving audio drives lip-sync), Omni (prompt-steered audio; no voice editing), MiniMax H3 (audio only as reference input on MiniMax docs). Not captured: Seedance 2.0 lip-sync, Runway Gen-4.5, Luma. | [S1][S8][S18][S26][S13] |
| A9 | Multiple timed beats or cuts in one clip (question scope) | Model-dependent. Kling 3.0 custom multi-shot (shot count and durations configurable, max not stated). Luma Ray 3.2 keyframes pinned to frame indexes (0-120 at 5 s, 0-240 at 10 s). Grok 1.5 mid-video keyframes (up to 4, excerpt). Not documented for Veo 3.1, Wan, MiniMax H3, Seedance 2.0 APIs. | [S8][S11][S25] |

## Caveats and gaps

- Pika: no primary source reached. `docs.pika.art` did not resolve. Only secondary sources were found, and their prices and plans disagree.
- Kling: the official API reference pages (`kling.ai/document-api/...`) rendered as empty shells. Kling 3.0 facts come from the Kling product guide [S8] and search excerpts of Kling's API docs [S9 excerpt][S10 excerpt]. Pricing unit is Kling credits; the Kling pricing page did not render. Kling's own credit numbers (9/12 credits per second) do not match Runway's Kling line items (9/13 and 12/17 credits per second), and I did not reconcile them.
- Runway: the API reference did not render. Runway Gen-4.5 duration (2-10 s) comes from secondary sources only. Runway's pricing page covers rates, not per-model input rules.
- Sora: shut down on 2026-09-24. Secondary pricing pages list per-second rates, but OpenAI's own pages list none. Azure's Sora 2 retirement date is mentioned only by secondary sources and was not verified.
- Veo: all Veo facts are from the Gemini API docs (`ai.google.dev`). The Vertex AI docs (`docs.cloud.google.com`) have overlapping content, and the V1 integration used Vertex. Vertex-specific parameters and limits were not verified. The Gemini docs list Veo 3 as both "Stable" and "Deprecated" in different tables.
- Seedance: BytePlus parameter pages did not render. Facts come from a model-ID search excerpt [S14 excerpt] and the BytePlus index page [S15]. Reference-audio limits in the excerpt are internally inconsistent (2-15 s single clip vs 2-30 s elsewhere).
- Luma: the current API docs are `docs.agents.lumalabs.ai`. Keyframe maximum is 64 in the API reference [S11]; a Luma marketing page says 16 (excerpt). The 64 figure is used here.
- LTX: the v2 image-to-video page was not captured. The v1 page is deprecated after 2026-10-26. Per-model durations and aspect ratios come from the pricing page and changelog excerpts.
- Gemini Omni: duration range (3-10 s) is from secondary excerpts, not the Google page. The Google page documents 3-10 s extension steps only.
- Open weights: LTX-2 model card says a newer LTX-2.3 exists. Wan2.2 I2V (July 2025) is older than the hosted Wan 2.7 and 3.0 lines. I did not verify whether newer Wan releases have open weights.
- Grok Imagine 1.5: the per-resolution price conflicts between the model page ($0.080/s flat) and the overview excerpt (per-resolution). Both are cited.
- Wan 3.0 is in preview. The Veo 3.1 family is also labelled preview on Google's page.
- Dates: Google pricing page updated 2026-10-16. Wan 3.0 page updated 2026-10-15. BytePlus index updated 2026-10-17. Kling guide dated 2026-02-06. OpenAI deprecation notice dated 2026-03-24. Runway, OpenAI guide, Luma Ray 3.2, MiniMax H3, and LTX pricing pages show no date.

## Sources

Primary (vendor-owned) unless marked otherwise. Fetch date for all: 2026-10-18.

- [S1] Google, Gemini API, "Generate videos with Veo 3.1 in Gemini API." https://ai.google.dev/gemini-api/docs/veo (Veo model table: "updated Jan 2026"; Lite "updated Mar 2026").
- [S2] Google, Gemini API pricing. https://ai.google.dev/gemini-api/docs/pricing ("Last updated 2026-10-16 UTC").
- [S4] OpenAI, "Video generation with Sora" guide. https://developers.openai.com/api/docs/guides/video-generation (redirected from platform.openai.com; no date). Content describes shutdown on 2026-09-24.
- [S5] OpenAI, API deprecations. https://developers.openai.com/api/docs/deprecations (no page date; notice dated 2026-03-24).
- [S6] Runway, API pricing. https://docs.dev.runwayml.com/guides/pricing/ (no date; rates for models listed, "$0.01 per credit").
- [S7] Runway, models list. https://docs.dev.runwayml.com/guides/models/ (no date).
- [S8] Kling AI, "Kling VIDEO 3.0 Model User Guide." https://kling.ai/quickstart/klingai-video-3-model-user-guide (dated Feb 6, 2026).
- [S9 excerpt] Kling AI, API reference, "Image to Video" (3.0 Omni). https://kling.ai/document-api/api/video/3-0-omni/image-to-video (fetched via search excerpt only; page did not render).
- [S10 excerpt] Kling AI, API updates. https://kling.ai/document-api/updates/api (search excerpt only).
- [S11] Luma AI, "Video generation" guide, Ray 3.2. https://docs.agents.lumalabs.ai/guides/videos/generation (no date; examples dated 2026-05-26).
- [S12] Luma AI, older Dream Machine docs. https://docs.lumalabs.ai/docs/video-generation ("Last updated 2026-07-10"; covers ray-2 and ray-flash-2 only).
- [S13] MiniMax, "Video generation" guide (H3, H3 Max). https://platform.minimax.io/docs/guides/video-generation (no date).
- [S14 excerpt] BytePlus, "Enhanced/basic video generation" (Seedance 2.0). https://docs.byteplus.com/en/docs/byteplus_las/video_gen_enhanced (search excerpt only; page did not render).
- [S15] BytePlus ModelArk, "Video generation API" index. https://docs.byteplus.com/en/docs/ModelArk/1520757 ("Last updated: October 17, 2026").
- [S16 excerpt] ByteDance Seed, Seedance 2.5 launch post. https://seed.bytedance.com/en/blog/one-take-creation-flexible-referencing-introducing-seedance-2-5 (search excerpt only).
- [S17] Alibaba Cloud Model Studio, "Wan3.0 Video Generation" API reference. https://www.alibabacloud.com/help/en/model-studio/wan3-video-generation-api-reference ("Oct 15, 2026"; "Currently in preview").
- [S18] Alibaba Cloud Model Studio, "Wan 2.7 image-to-video API." https://www.alibabacloud.com/help/en/model-studio/image-to-video-general-api-reference ("Oct 11, 2026").
- [S19 excerpt] Alibaba Cloud Model Studio, Wan index. https://www.alibabacloud.com/help/en/model-studio/wan-api-reference ("Oct 11, 2026").
- [S20] LTX, pricing. https://docs.ltx.io/pricing (no date).
- [S21] LTX, "Generate video from image" (v1, deprecated after 2026-10-26). https://docs.ltx.io/api-documentation/api-reference/video-generation/image-to-video
- [S22] Lightricks, LTX-2 model card. https://huggingface.co/Lightricks/LTX-2 (no card date; paper dated Jan 6, 2026).
- [S23] Wan-AI, Wan2.2-I2V-A14B model card. https://huggingface.co/Wan-AI/Wan2.2-I2V-A14B (release news dated July 28, 2025).
- [S24] xAI, Grok Imagine Video 1.5 model page. https://docs.x.ai/developers/models/grok-imagine-video-1.5 (alias dated 2026-05-30).
- [S25 excerpt] xAI, Video overview. https://docs.x.ai/developers/model-capabilities/video/overview (search excerpt only).
- [S26] Google, Gemini API, "Generate and edit videos with Gemini Omni Flash." https://ai.google.dev/gemini-api/docs/omni (no date).
- [S27 secondary] fal.ai, Pika v2.2 Pikaframes endpoint. https://fal.ai/models/fal-ai/pika/v2.2/pikaframes (third-party host; search excerpt only).
- [S28 secondary] Sume, "Sora 2 API pricing." https://www.sume.com/blog/sora-2-api-pricing (third-party; used only for the unverified Sora rates).

Not reached: Pika (docs.pika.art did not resolve); Kling pricing and API reference (rendered empty); Luma pricing page; BytePlus parameter pages; Alibaba model pricing page; LTX v2 image-to-video page.

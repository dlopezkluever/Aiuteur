# Voice, audio, and lip-sync: capabilities, providers, and consent/likeness rules

Status: research findings, as of 2026-10-18. Issue #7 (Wayfinder research ticket, map #1).

**This is a factual summary of cited sources. It is not legal advice, and it makes no product recommendations.** Statutes, bill status, and provider terms change; re-check the cited pages before relying on any item here.

## 0. Method and source quality

- Sources are primary where possible: provider API reference and pricing pages, enacted or chaptered statutes and bills, the EU Official Journal, the govinfo bill-status record, and the C2PA specification.
- Each claim cites a source ID `[Sn]`. Section 8 lists the URL for each ID. All sources were accessed 2026-10-18.
- Several government and provider pages returned HTTP 403 to the fetch tool. For those, I retrieved the document with curl and extracted the text locally. Where that was not possible, I say so.
- Claims marked **[unverified]** could not be confirmed against a primary text. Claims marked **[secondary]** come only from law-firm, vendor-marketing, or aggregator pages.
- Prices are as shown on the cited page. Several pages show no date, and some provider prices are published in per-token or per-credit units that I converted to per-second or per-minute figures where the page itself gives the conversion.

## 1. Key findings

1. **Voice cloning consent is provider-specific.** ElevenLabs Professional Voice Cloning (PVC) is limited to your own voice, with a live verification step [S1]. OpenAI custom voices require a fixed consent phrase recorded by the same speaker as the reference sample [S12]. Google Gemini voice replication also uses a fixed consent statement from the same adult speaker [S19]. Google Chirp 3 Instant Custom Voice is allowlisted to approved users [S24].
2. **The ElevenLabs API consent mechanism is unresolved.** The Add Voice API reference lists no consent field [S3], while the dashboard requires a confirmation of "the right and consent to clone the voice" [S2]. A vendor blog says the API requires a consent attestation for each clone [S11] **[secondary]**.
3. **Speech-to-speech conversion is documented, but not its fidelity.** ElevenLabs' speech-to-speech endpoint takes input audio that "holds the content and emotion that will control the generated speech" [S5]. I found no documented guarantee for timing or delivery preservation [S5].
4. **Expressive TTS controls differ by provider.** ElevenLabs uses inline audio tags on v4 Turbo and v3 Conversational [S4]. OpenAI `gpt-4o-mini-tts` takes an `instructions` prompt covering tone, intonation, and speed [S13]. Gemini 3.8 TTS takes a style annotation plus inline angle-bracket tags, and supports up to 2 speakers in one request [S20].
5. **Native dialogue video is available only in Veo in the sources I could verify.** Veo 3.1 is described as "a model for generating video with native audio" [S21], with sound generation marked supported [S22]. The OpenAI Sora 2 Videos API and `sora-2` models are listed for removal on 2026-09-24 with no replacement [S14].
6. **Audio-driven lip-sync: non-humanoid characters are not supported by Sync.** Sync states "our models don't currently support animals or non-humanoid characters" [S25]. Its `sync-3` model is the one documented to handle non-frontal faces, including profiles and over-the-shoulder shots [S25].
7. **Multi-speaker lip-sync is handled by an active-speaker mechanism.** Sync's active speaker detection is "available on all lipsync models" [S25]. Hedra Character-3 needs one position point per audio track for multi-speaker scenes [S26].
8. **Timing alignment is documented only for ElevenLabs.** The with-timestamps endpoint returns character-level start and end times [S9]. I found no timing output in the Gemini TTS or OpenAI TTS documentation [S13][S20].
9. **Latency numbers are published only by ElevenLabs** (about 75 ms for Flash v2.5, about 100 ms median for v4 Turbo, about 280 ms for v3 Conversational) [S4]. OpenAI, Google, and Sync do not publish comparable figures in the pages I retrieved.
10. **Music and sound effects have documented limits.** ElevenLabs sound effects run 0.1 to 30 seconds per generation [S7]. ElevenLabs Music runs 3 seconds to 5 minutes [S8]. Google Lyria 3.5 generates "a couple of minutes" of audio, and "all generated audio includes a SynthID audio watermark" [S23].
11. **Provenance marking is documented differently across providers.** C2PA 2.4 lists MP3, WAV, and FLAC as embeddable formats [S31]. Google states that Lyria output carries a SynthID audio watermark [S23]. The Veo docs list "Content Credentials (C2PA)" as supported [S22]. The Gemini voice-replication docs have no SynthID or C2PA statement [S19].
12. **Tennessee's ELVIS Act (Public Chapter 588) is in force since 2024-07-01.** It makes voice a protected property right and adds civil liability for distributing a tool whose "primary purpose or function" is producing an identifiable person's voice or likeness without authorization [S33].
13. **California AB 2602 (Labor Code § 927) limits certain contract clauses for digital replicas.** It applies to new performances fixed on or after 2025-01-01, and only where the specified conditions are met [S34]. California AB 1836 (Civil Code § 3344.1) addresses digital replicas of deceased personalities [S35].
14. **NO FAKES Act is not law.** S.4591 was reported by the Senate Judiciary Committee on 2026-06-24 and placed on the Senate Calendar (No. 446). The govinfo record I retrieved shows no later action [S36]. The House companion H.R. 8915 remains in committee [S36].
15. **EU AI Act Article 50 applies from 2026-08-02.** Regulation (EU) 2026/1744 adds a grace period to 2026-12-02 for Article 50(2) machine-readable marking, but only for generative systems placed on the market before 2026-08-02 [S37][S38].

## 2. Capability matrix

### 2.1 Expressive TTS

| Provider / model | Documented expressive controls | Languages / limits | Source |
|---|---|---|---|
| ElevenLabs v4 Turbo, v3 Conversational | "Audio tags for fine-grained control" | v4 Turbo 90+ languages; v3 Conversational 70+ | [S4] |
| ElevenLabs v3 | "Dramatic delivery and performance," natural multi-speaker dialogue | 70+ languages, 5,000-character limit | [S4] |
| ElevenLabs v4 | Multi-speaker dialogue, voice cloning | 90+ languages, 10,000-character limit | [S4] |
| ElevenLabs descriptive text | Emotion is "mainly from the text." Descriptive text "is spoken aloud, so you must trim it" | n/a | [S4] |
| OpenAI `gpt-4o-mini-tts` | `instructions` prompt controls "accent, emotional range, intonation, impressions, speed of speech, tone, and whispering" | 13 listed voices; the intro says "11 built-in voices," which conflicts with the list | [S13] |
| OpenAI `tts-1`, `tts-1-hd` | Lower feature set; `tts-1` lower latency and quality than `tts-1-hd` | Smaller voice set (9) | [S13] |
| Gemini 3.8 Flash TTS | Style in `speech_metadata`; inline `<...>` tags for laughs, sighs, pauses; `|...|` markup for backchannels | Flash over 130 languages; Flash-Lite over 100; 30 prebuilt voices | [S20] |

### 2.2 Voice design (text-described voices)

| Provider | What is documented | Source |
|---|---|---|
| ElevenLabs | `POST /v1/text-to-voice/design`: `voice_description` (20 to 1000 characters), optional `text` (100 to 1000 characters), `model_id` `eleven_multilingual_ttv_v2` or `eleven_ttv_v3`. Returns `previews` with `generated_voice_id`. Save with `POST /v1/text-to-voice`. | [S6] |
| OpenAI | Prompt-generated voices: 100 per organization. They "work with GPT-Live" and "aren't supported by the Text to Speech, Realtime, or Chat Completions APIs." | [S12] |
| Google Gemini Voices API | Voice Design and Voice Replication share a 200-voice-per-project limit | [S19] |

### 2.3 Voice cloning (instant and professional)

| Provider | Input requirements | Consent / verification | Plan / access | Source |
|---|---|---|---|---|
| ElevenLabs Instant Voice Cloning (IVC) | "Approximately 1-2 minutes of clear audio"; the guide says avoid more than 3 minutes | Dashboard: confirm "you have the right and consent to clone the voice." The API reference's Add Voice fields (`name`, `files`, `remove_background_noise`, `description`, `labels`) include no consent field. | No plan requirement stated on the IVC guide [S2]. Plan requirement for IVC conflicts across sources [secondary]. | [S2][S3] |
| ElevenLabs Professional Voice Cloning (PVC) | 30 to 180 minutes recommended; training takes 3 to 6 hours | "You can only create a Professional Voice Clone of your own voice. Even with their consent, you cannot clone someone else's voice." Verification compares a live recording to uploaded samples. Someone else can create and verify their own PVC and share it by link. | Creator plan or above. Slots: Free and Starter none; Creator, Pro, legacy Scale 1; Scale and legacy Business 3; Business 10. | [S1] |
| OpenAI custom voices | 5 seconds minimum of actual speech, 10 to 30 seconds recommended, 30 seconds maximum, 10 MiB upload limit | Consent audio must be one of the listed phrases; consent and reference must come from the same person | "Limited to eligible customers"; 20 recorded voices per organization; not compatible with Zero Data Retention | [S12] |
| Google Gemini voice replication | Two recordings from the same adult speaker. Reference clip 10 to 30 seconds (24 kHz mono 16-bit WAV recommended) | Consent statement, English: "I am the owner of this voice and I consent to Google using this voice to create a synthetic voice model." Must recite an exact statement in one of 30 locales. | Self-serve. Stateful storage by default, 1 year; `store=False` gives a 7-day key, with no server-side persistence | [S19] |
| Google Cloud Chirp 3 Instant Custom Voice | Reference audio up to 10 seconds, single-channel, no background noise | Consent statement is fixed ("You can't use a custom consent script instead of the default"); recorded single-channel, up to 10 seconds | "Restricted to allow-listed users"; contact sales. Up to 10 voice cloning keys per minute per project. | [S24] |

### 2.4 Speech-to-speech conversion (performance-preserving)

| Provider | What is documented | Source |
|---|---|---|
| ElevenLabs Voice Changer | `POST /v1/speech-to-speech/{voice_id}`. Input `audio` "holds the content and emotion that will control the generated speech." `voice_settings`, `seed` ("Determinism is not guaranteed"), `remove_background_noise` (audio isolation). No input duration limit stated. Model must have `can_do_voice_conversion`. Output format is plan-gated. | [S5] |
| OpenAI GPT-Live `gpt-live-1` | Full-duplex voice model; accepts audio and text input, produces audio and text output. Not documented as a voice-conversion endpoint. | [S16] |
| OpenAI Realtime (`gpt-realtime-2.1` in the example) | Speech-to-speech conversation with tools; not documented as performance-preserving conversion | [S17] |
| Gemini TTS | "TTS models accept text-only inputs and generate audio-only outputs." No audio-to-audio conversion documented. | [S20] |

### 2.5 Native dialogue audio in video models

| Provider / model | Documented audio behavior | Pricing (audio included?) | Source |
|---|---|---|---|
| Google Veo 3.1 (Gemini API) | "Veo 3.1 is a model for generating video with native audio." Dialogue and lip sync are not described on the pages I could retrieve. A CNBC report quotes Google's blog: Veo 3 "excels from text and image prompting to real-world physics and accurate lip syncing." | Veo 3.1 Standard $0.40/s at 720p and 1080p, $0.60/s at 4K. Fast $0.10, $0.12, $0.30. Lite $0.05, $0.08. The table is labeled "video with audio price (default)." No free tier. | [S21][S18][S41] |
| Google Veo 3.1 (Vertex AI docs) | "Sound generation" marked "Supported" for Veo 3.1, 3.1 Fast, and 3.1 Lite; "Content Credentials (C2PA)" marked "Supported" | Vertex page not priced in my retrieval | [S22] |
| OpenAI Sora 2 (`sora-2`, `sora-2-pro`) | Listed for removal from the Videos API on 2026-09-24, with no replacement | n/a. I did not test the endpoint, so I cannot confirm it is gone. | [S14] |
| Kling 2.6 native audio | Third-party descriptions say speech, sound effects, and ambience are generated in one pass **[secondary]**. Kling's developer pages were not retrievable. | Not verified | [unverified] |

### 2.6 Audio-driven lip-sync (generated and stylized characters; multi-speaker; non-frontal)

| Provider / model | Input | Multi-speaker | Face angle | Stylized / non-human | Pricing | Source |
|---|---|---|---|---|---|---|
| Sync `lipsync-2` | Video plus audio. "Require natural speaking motion in the input video." Faces at 512×512. | Active speaker detection "on all lipsync models" | "Extreme profile view faces can lead to sub-par results" | "Our models don't currently support animals or non-humanoid characters." | $0.04 to $0.05 per second | [S25] |
| Sync `lipsync-2-pro` | Same motion requirement. Larger face regions (up to 350×350 px) without quality loss. Long videos split into 30 to 40 second chunks. | Same | Same profile caveat | Same | $0.067 to $0.083 per second; 1.5 to 2 times slower than lipsync-2 | [S25] |
| Sync `sync-3` | Can open silent lips to match audio, "though results are generic rather than speaker-style matched" | Not stated on the page | "Natively supports extreme face angles including profiles, over-the-shoulder shots, and non-frontal lip positions." | Non-humanoid excluded per the models page | $0.107 to $0.133 per second | [S25] |
| Sync `lipsync-1.9.0-beta` (legacy) | "Fast legacy lipsync model for simple videos" with generic lip movement | Not stated | Not stated | Non-humanoid excluded | $0.02 to $0.025 per second | [S25] |
| Sync plan limits | Maximum video duration from 1 minute (Hobbyist) to 30 minutes (Scale+) | n/a | n/a | n/a | "Pricing is always per second of output video at 25 fps" | [S25] |
| Hedra Character-3 | Start frame required. Audio 0.5 to 600 seconds per file. Output up to 10 minutes. | "Required for multi-speaker: pass `audio` as a list and one point per audio, in the same order." | Not stated | Not stated; "stylized, animated, non-human characters, or camera angles" not addressed | 540p 2.5¢/s; 720p 5¢/s; 1080p 6.25¢/s | [S26] |
| Kling lip-sync | Official Kling page did not render. Third-party specs conflict on endpoint path and inputs. | Not verified | Not verified | Not verified | Not verified | [S29][unverified] |
| Runway Act-Two | Performance transfer: a driving performance video moves a character reference (image or video). Not documented as audio-driven lip-sync in the primary page I retrieved. | Not verified | Not verified | Not verified | 5 credits per second, which the pricing page gives as $0.01 per credit, so $0.05 per second | [S27][S28 blocked] |
| ElevenLabs lip-sync or dubbing | Not checked in this pass | n/a | n/a | n/a | n/a | [gap] |

### 2.7 Timing alignment (dialogue to shots)

| Provider | What is returned | Source |
|---|---|---|
| ElevenLabs with-timestamps | Character-level `character_start_times_seconds` and `character_end_times_seconds`, plus `alignment` and `normalized_alignment`. Both fields optional and nullable. Word-level timing is not returned. | [S9] |
| Gemini TTS | Audio only; no timing output documented | [S20] |
| OpenAI TTS | Streaming supported; no timestamp or alignment output documented | [S13] |
| Sync | Processes long videos in 30 to 40 second chunks; no output-timing parameter documented | [S25] |
| Hedra | Video length follows audio length when `duration` is omitted | [S26] |

### 2.8 Sound effects and music

| Provider / model | Capability | Limits | Pricing | Licensing / training statements | Source |
|---|---|---|---|---|---|
| ElevenLabs sound effects | Generated from text. Duration, looping, prompt influence. Looping for effects longer than 30 seconds. | 0.1 to 30 seconds per generation. MP3 for all; WAV 48 kHz for non-looping only. | $0.12 per minute per the API pricing page. The capabilities page gives "40 credits per second." These conflict. | None stated on the page | [S7][S10] |
| ElevenLabs Eleven Music | Text-to-music; vocals or instrumental; English, Spanish, German, Japanese | 3 seconds to 5 minutes; Audio Reference up to about 30 seconds | $0.15 per minute; finetunes $1.50 each | "Eleven Music is cleared for nearly all commercial uses." "Created in collaboration with labels, publishers, and artists." Audio Reference uploads are screened for copyright. | [S8][S10] |
| Google Lyria 3.5 (`lyria-3.5`) | Full songs with vocals, timed lyrics, instrumentals; WAV available | "A couple of minutes (controllable using prompt)"; 44.1 kHz stereo | $0.08 per song | "All generated audio includes a SynthID audio watermark." Artist voices and copyrighted lyrics are blocked. Licensing and training data not stated. | [S23][S18] |
| Google Lyria 3 Clip (`lyria-3-clip-preview`) | Short clip, loops, previews | Always 30 seconds, MP3 | $0.04 per clip | Same SynthID statement | [S23][S18] |
| Stability AI Stable Audio | Not verified against primary pages. Pricing sources conflict (8 credits vs 20 credits per generation). | Not verified | Not verified | Not verified | [unverified] |

### 2.9 Pricing summary (as displayed)

| Capability | Provider | Price as displayed | Source |
|---|---|---|---|
| TTS, 1K characters | ElevenLabs v4, v3, Multilingual v2 | $0.08 | [S10] |
| TTS, 1K characters | ElevenLabs v4 Turbo, v3 Conversational, Flash v2.5 | $0.04 | [S10] |
| Speech-to-speech | ElevenLabs | $0.12 per minute | [S10] |
| Sound effects | ElevenLabs | $0.12 per minute | [S10] |
| Music | ElevenLabs | $0.15 per minute | [S10] |
| Speech-to-text | ElevenLabs Scribe v2 | $0.22 per hour | [S10] |
| TTS, per 1M characters | OpenAI `tts-1` / `tts-1-hd` | $15 / $30 | [S15] |
| TTS, per 1M tokens | OpenAI `gpt-4o-mini-tts` | Text input $0.60; audio output $12.00 | [S15] |
| Realtime audio, per 1M tokens | OpenAI `gpt-realtime` | Audio input $32, cached $0.40, output $64 | [S15] |
| Voice session | OpenAI GPT-Live `gpt-live-1` | $0.05 per minute, billed per second; backend usage billed separately | [S15][S16] |
| Transcription | OpenAI `gpt-4o-transcribe` | About $0.006 per minute | [S15] |
| TTS, per 1M tokens (audio at 25 tokens/s) | Gemini 3.8 Flash TTS | Input $0.50 and output $9.00 through 2026-12-31; $1.00 and $18.00 from 2027-01-01. Free tier. | [S18] |
| TTS, per 1M tokens | Gemini 3.8 Flash-Lite TTS | Input $0.50 and output $6.00 through 2026-12-31 | [S18] |
| Video, per second (audio included) | Veo 3.1 Standard / Fast / Lite | $0.40 / $0.10 / $0.05 at 720p; 4K Standard $0.60 | [S18] |
| Music, per song | Lyria 3.5 / Lyria 3 Clip | $0.08 / $0.04 | [S18] |
| Lip-sync, per second | Sync lipsync-1.9 / lipsync-2 / lipsync-2-pro / sync-3 | $0.02 to 0.025 / $0.04 to 0.05 / $0.067 to 0.083 / $0.107 to 0.133 | [S25] |
| Lip-sync, per second | Hedra Character-3 | 540p 2.5¢, 720p 5¢, 1080p 6.25¢ | [S26] |
| Performance transfer, per second | Runway Act-Two | 5 credits; $0.05 per second derived from $0.01 per credit | [S27] |
| TTS, per 1M characters | Google Cloud Chirp 3 HD, Instant Custom Voice | Not verified. Third-party pages give $30 and $60; the Google pricing page was truncated. | [unverified] |

### 2.10 Latency

| Provider / model | Published figure | Source |
|---|---|---|
| ElevenLabs Flash v2.5 | About 75 ms | [S4] |
| ElevenLabs v4 Turbo | About 100 ms median inference latency | [S4] |
| ElevenLabs v3 Conversational | About 280 ms | [S4] |
| OpenAI Realtime / GPT-Live | Qualitative only ("low first-audio latency"; "smooth interruption handling"); no numbers | [S16][S17] |
| Sync lipsync-2-pro | "1.5-2x slower than lipsync-2" | [S25] |
| Gemini TTS, Veo, Lyria, Hedra, Kling, Stability | No published figures in the pages retrieved | n/a |

### 2.11 API status (as of 2026-10-18)

| Item | Status | Source |
|---|---|---|
| OpenAI Videos API and `sora-2` family | Scheduled removal 2026-09-24; no replacement listed | [S14] |
| OpenAI custom voices | Limited to eligible customers; GPT-Live supports custom voices with English accents | [S12] |
| OpenAI TTS (`gpt-4o-mini-tts`) | Listed as "our newest and most reliable text-to-speech model" | [S13] |
| Google Gemini voice replication | Supported on `gemini-3.8-flash-tts` and `gemini-3.8-flash-lite-tts` | [S19] |
| Google Chirp 3 Instant Custom Voice | Allowlisted | [S24] |
| ElevenLabs Speech-to-speech `enable_logging: false` | Enterprise only | [S5][S9] |
| Google Veo and Lyria | Not on the free tier | [S18] |

## 3. Consent, likeness, and synthetic-media disclosure

This section is a factual summary of the sources. It is not legal advice.

### 3.1 Provider consent and disclosure terms

| Provider | Documented requirement | Source |
|---|---|---|
| ElevenLabs IVC (dashboard) | Confirm "you have the right and consent to clone the voice" before saving | [S2] |
| ElevenLabs IVC (API) | Add Voice reference lists no consent field. A vendor blog says each API clone needs a consent attestation **[secondary, marketing]** [S11]. These conflict. | [S3][S11] |
| ElevenLabs PVC | Own voice only; verification required | [S1] |
| ElevenLabs traceability | "All audio generated by our models can be instantly traced back to the user responsible for the generation." This is not a watermark claim. | [S2] |
| OpenAI custom voices | "Don't impersonate others or violate our Usage Policies"; "Use adult voices. Children's voices aren't allowed."; "Tell listeners that the speech is AI-generated"; "preserve any provenance metadata, watermarks, or other indicators of its synthetic origin" | [S12] |
| OpenAI TTS | Usage policies require "a clear disclosure to end users that the TTS voice they are hearing is AI-generated and not a human voice." | [S13] |
| Google Gemini voice replication | Same-speaker consent recording; stored voice profile in the project; a 1-year retention default | [S19] |
| Google Chirp 3 Instant Custom Voice | Fixed consent statement; allowlist-only access | [S24] |
| Google Lyria | SynthID audio watermark on all output | [S23] |
| Google Veo | C2PA Content Credentials marked supported | [S22] |
| Google Gemini voice replication, SynthID or C2PA | No statement on the primary page **[secondary claims otherwise]** | [S19] |

### 3.2 Tennessee: ELVIS Act (Public Chapter 588)

- Enacted as HB 2091 / SB 2096. Signed 2024-03-26 per the Tennessee bill-status page [S44]. Effective 2024-07-01 [S33].
- Adds "voice" to the statute, defined as "a sound in a medium that is readily identifiable and attributable to a particular individual, regardless of whether the sound contains the actual voice or a simulation of the voice of the individual" [S33].
- Property right: "Every individual has a property right in the use of that individual's name, photograph, voice, or likeness in any medium in any manner" (Tenn. Code Ann. § 47-25-1103(a), as amended) [S33].
- Civil liability under § 47-25-1105(a), as amended, applies to:
  - (1) knowingly using an individual's name, photograph, voice, or likeness for advertising or fundraising without consent;
  - (2) publishing, performing, distributing, transmitting, or otherwise making available to the public an individual's voice or likeness, knowing the use was not authorized;
  - (3) distributing or making available an "algorithm, software, tool, or other technology, service, or device" whose "primary purpose or function ... is the production of a particular, identifiable individual's photograph, voice, or likeness," knowing that distribution was not authorized [S33].
- Fair-use exceptions in § 47-25-1107(a), as amended, cover news, commentary, satire, certain audiovisual representations, fleeting or incidental use, and advertisements for those works [S33].
- Post-death: the exclusive commercial right is terminated by "proof of the non-use of the name, photograph, voice, or likeness ... for a period of two (2) years subsequent to the initial period of ten (10) years following the individual's death" (§ 47-25-1104(b)(2)(A), as amended) [S33].
- Penalty: the enacted text I read creates civil liability and does not set a criminal penalty. A secondary source says violations are a Class A misdemeanor **[secondary, unverified]**. The text amends Title 39 § 152(9) only as a name cross-reference [S33].

### 3.3 California: AB 2602 (Labor Code § 927), Chapter 259, Statutes of 2024

- Approved 2024-09-17 [S34].
- A provision in an agreement for personal or professional services is unenforceable only as it relates to a new performance, fixed on or after 2025-01-01, by a digital replica, if all of these conditions are met [S34]:
  1. the provision allows creating or using a digital replica "in place of work the individual would otherwise have performed in person";
  2. the provision lacks "a reasonably specific description of the intended uses" (a missing description does not void the term if the uses are consistent with the contract and the fundamental character of the work);
  3. the individual was not represented by counsel who negotiated the replica rights (with the terms stated clearly in a signed or initialed writing), and was not represented by a union whose collective bargaining agreement expressly addresses digital replicas.
- Subdivision (b): does not affect other contract provisions or exclusivity grants [S34].
- Definition, subdivision (c)(1): "a computer-generated, highly realistic electronic representation that is readily identifiable as the voice or visual likeness of an individual" in a recording or audiovisual work where the individual did not perform or appear, or the performance was "materially altered" [S34].
- Subdivision (c)(2) excludes authorized sampling, remixing, mastering, or remastering of a recording or audiovisual work [S34].
- Source caveat: I read the chaptered text from a third-party-hosted copy of the Chapter 259 PDF [S34]. The leginfo page returned HTTP 403. The statute should be checked against the official text.

### 3.4 California: AB 1836 (Civil Code § 3344.1), deceased personalities

- Chaptered as Chapter 258, Statutes of 2024 (per a search summary of the leginfo bill page) **[secondary]** [S35].
- The Senate Judiciary analysis (June 2024 version) describes liability for producing, distributing, or making available "the digital replica of a deceased personality's voice or likeness in an expressive audiovisual work or sound recording without prior consent," in the greater of $10,000 or actual damages [S35].
- Digital replica in that version: "a digital simulation of the voice or likeness of an individual that so closely resembles the individual's voice or likeness that a layperson would not be able to readily distinguish the digital simulation from the individual's authentic voice or likeness" [S35].
- Exemptions in that version track First Amendment uses: news, commentary, satire, certain audiovisual representations, fleeting or incidental use, and advertisements for those works [S35].
- Source caveat: this is the analysis of a pre-chaptering version. The enacted text was not retrieved; the leginfo page returned HTTP 403.

### 3.5 Federal: NO FAKES Act of 2026 (S.4591)

- Introduced 2026-05-20 [S36].
- Senate Judiciary markup 2026-06-18, ordered reported with an amendment in the nature of a substitute. Reported by Senator Grassley 2026-06-24. Placed on the Senate Legislative Calendar, No. 446, 2026-06-24 [S36].
- House companion H.R. 8915 was referred to House Judiciary 2026-05-20; no further action in the record [S36].
- Content, per the official summary in the govinfo record: creates a federal intellectual property right in an individual's voice and visual likeness; the right is not assignable during life, is licensable, and does not expire on death; notice-and-takedown and counter-notice processes; exemptions for protected speech categories such as news, sports, and satire; penalties for false or deceptive notices; expressly preempts state laws related to digital replicas, except causes of action under state law in existence as of 2025-01-02 [S36].
- Floor status: a secondary source reports that on 2026-09-30 Senator Blackburn sought unanimous consent and Senator Cruz objected [S43] **[secondary, unverified]**. The govinfo record I retrieved was last updated 2026-08-10 and shows no floor action.
- Status as of 2026-10-18: not enacted.

### 3.6 EU: AI Act Article 50 and dates

- Article 50 applies from 2026-08-02. This comes from Article 113, second paragraph: "It shall apply from 2 August 2026." [S37]
- Art. 50(1): providers must design AI systems that interact with persons so that people are informed they are interacting with AI [S37].
- Art. 50(2): providers of systems "generating synthetic audio, image, video or text content" must ensure outputs are "marked in a machine-readable format and detectable as artificially generated or manipulated," with technical solutions that are "effective, interoperable, robust and reliable as far as this is technically feasible" [S37].
- Art. 50(4): deployers of a system that generates or manipulates audio, image, or video constituting a "deep fake" must disclose it. Where content is part of "an evidently artistic, creative, satirical, fictional or analogous work," the duty is limited to disclosing "the existence of such generated or manipulated content" in a way that does not hamper the work [S37].
- Art. 50(5): information must be provided "at the latest at the time of the first interaction or exposure" [S37].
- Art. 3(60): "'deep fake' means AI-generated or manipulated image, audio or video content that resembles existing persons, objects, places, entities or events and would falsely appear to a person to be authentic or truthful" [S37].
- Regulation (EU) 2026/1744 (Digital Omnibus on AI): dated 2026-07-08, published 2026-07-24, entered into force on the third day after publication [S38]. Its Article 111(4) adds: AI systems generating synthetic content "that have been placed on the market before 2 August 2026 shall take the necessary steps in order to comply with Article 50(2) by 2 December 2026" [S38]. The Omnibus text I retrieved does not otherwise amend Article 50 [S38].
- Code of Practice on transparency of AI-generated content: final version published 2026-06-10. Voluntary. Section 1 covers providers' marking and detection duties; Section 2 covers deployers' labelling duties. About 190 signatories by end of July 2026 [S39].
- Commission Article 50 guidelines: the Commission page states draft guidelines were published 2026-05-08 with consultation. Secondary sources say final guidelines were published 2026-07-20, and one says formal adoption is still pending **[secondary, unresolved]** [S39][S40].
- Enforcement by national authorities and penalties under the Act were not checked in this pass.

### 3.7 Provenance: C2PA and SynthID

- C2PA specification 2.4 (April 2026) [S31]:
  - Manifests are embedded in MP3 and FLAC via an ID3v2 General Encapsulated Object (A.3.4), WAV and BWF via a RIFF chunk named `C2PA` (A.3.7), and AVI and WebP the same way [S31].
  - Hard binding: "One or more cryptographic hashes that uniquely identifies either the entire asset or a portion thereof" [S31][S32].
  - Soft binding: "either (a) not statistically unique, such as a fingerprint, or (b) embedded as an invisible watermark in the identified digital content" (§ 2.3.13) [S31].
  - "A soft binding shall not be used as a hard binding" [S32].
- SynthID [S30]:
  - Google describes it as watermarking for AI-generated content across image, video, audio, and text.
  - For audio, it says the watermark "embeds a watermark into any audio generated or published through our AI music generation model Lyria," and covers NotebookLM podcasts [S30].
  - Google says the audio watermark "can't be altered by common modifications like adding noise, MP3 compression" [S30]. This is a vendor claim, and the page gives no detection accuracy figures.
  - Detection: Gemini app, and the SynthID Detector portal [S30].
- Google's Lyria docs say all output carries a SynthID audio watermark [S23].
- Veo lists C2PA Content Credentials as supported [S22].

## 4. Gaps and unverified items

- Kling lip-sync and native audio: developer pages did not render. Third-party specs conflict [S29][unverified].
- Runway Act-Two help page returned HTTP 403, so input rules came from the pricing page only [S27][S28].
- ElevenLabs voice design pricing and voice design plan limits: not stated on the pages retrieved.
- ElevenLabs lip-sync or dubbing product: not checked.
- ElevenLabs sound effects pricing conflicts between the pricing page ($0.12 per minute) and the capabilities page ("40 credits per second") [S7][S10].
- ElevenLabs IVC API consent attestation: conflicts between the API reference [S3] and a vendor blog [S11].
- OpenAI TTS latency and timestamps: not published in the pages retrieved.
- Google Cloud TTS and Chirp 3 HD prices: pricing page was truncated.
- Stability AI pricing and sound-effects API: not verified.
- Sora 2 API: the deprecation page lists removal on 2026-09-24. I did not test the endpoint.
- Veo 3.1 dialogue and lip-sync: only a CNBC quote of Google's blog [S41] and the "native audio" line [S21] were verified at primary level. No primary doc text describing dialogue was retrieved.
- Tennessee criminal penalty claim: not in the enacted text read [S33].
- AB 1836: chaptered text not retrieved; Senate analysis of a pre-chaptering version used [S35].
- EU Article 50 guidelines: final status unresolved (see 3.6).
- NO FAKES floor status after 2026-08-10: govinfo record stale; the 2026-09-30 objection is secondary only [S36][S43].
- Jurisdictions beyond the US (federal and the named states) and the EU were not researched.

## 5. Out of scope

- Legal conclusions about any specific project, contract, or person.
- Product or vendor recommendations.

## 6. Sources

Each source ID below is cited in the text as `[Sn]`. All accessed 2026-10-18.

- [S1] ElevenLabs, Voice cloning overview: https://elevenlabs.io/docs/eleven-creative/voices/voice-cloning
- [S2] ElevenLabs, Instant Voice Cloning guide: https://elevenlabs.io/docs/eleven-creative/voices/voice-cloning/instant-voice-cloning
- [S3] ElevenLabs API reference, Add Voice (IVC): https://elevenlabs.io/docs/api-reference/voices/ivc/create
- [S4] ElevenLabs, Text to speech capabilities: https://elevenlabs.io/docs/overview/capabilities/text-to-speech
- [S5] ElevenLabs API reference, Voice changer (speech-to-speech): https://elevenlabs.io/docs/api-reference/speech-to-speech/convert
- [S6] ElevenLabs API reference, Design a voice: https://elevenlabs.io/docs/api-reference/text-to-voice/design
- [S7] ElevenLabs, Sound effects capability: https://elevenlabs.io/docs/overview/capabilities/sound-effects
- [S8] ElevenLabs, Music capability: https://elevenlabs.io/docs/overview/capabilities/music
- [S9] ElevenLabs API reference, Convert with timestamps: https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps
- [S10] ElevenLabs, API pricing: https://elevenlabs.io/pricing/api
- [S11] ElevenLabs, Voice cloning API blog (vendor marketing; secondary for consent): https://elevenlabs.io/blog/voice-cloning-api
- [S12] OpenAI, Custom voices guide: https://developers.openai.com/api/docs/guides/custom-voices
- [S13] OpenAI, Text-to-speech guide: https://developers.openai.com/api/docs/guides/text-to-speech
- [S14] OpenAI, Deprecations: https://developers.openai.com/api/docs/deprecations
- [S15] OpenAI, Pricing: https://developers.openai.com/api/docs/pricing
- [S16] OpenAI, GPT-Live model page: https://developers.openai.com/api/docs/models/gpt-live-1
- [S17] OpenAI, Realtime guide: https://developers.openai.com/api/docs/guides/realtime
- [S18] Google, Gemini API pricing (last updated 2026-10-16 per page): https://ai.google.dev/gemini-api/docs/pricing
- [S19] Google, Gemini API voice replication: https://ai.google.dev/gemini-api/docs/voice-replication
- [S20] Google, Gemini API speech generation: https://ai.google.dev/gemini-api/docs/speech-generation
- [S21] Google, Gemini API video generation: https://ai.google.dev/gemini-api/docs/video
- [S22] Google Cloud, Veo 3.1 generate model docs (Vertex AI): https://docs.cloud.google.com/vertex-ai/generative-ai/docs/models/veo/3-1-generate
- [S23] Google, Gemini API music generation (Lyria): https://ai.google.dev/gemini-api/docs/music-generation
- [S24] Google Cloud, Chirp 3: Instant Custom Voice: https://docs.cloud.google.com/text-to-speech/docs/chirp3-instant-custom-voice
- [S25] Sync, Lipsync models: https://sync.so/docs/models/lipsync
- [S26] Hedra, Character-3 model page: https://www.hedra.com/develop/models/video/hedra-character-3
- [S27] Runway, API pricing: https://docs.dev.runwayml.com/guides/pricing/
- [S28] Runway help, Performance Capture with Act-Two (HTTP 403 to fetch tools; not retrieved): https://help.runwayml.com/hc/en-us/articles/42311337895827-Performance-Capture-with-Act-Two
- [S29] Kling, Lip Sync API page (client-rendered; not retrieved): https://kling.ai/document-api/api/video/lip-sync
- [S30] Google DeepMind, SynthID: https://deepmind.google/models/synthid/
- [S31] C2PA Technical Specification 2.4 (April 2026): https://spec.c2pa.org/specifications/specifications/2.4/specs/C2PA_Specification.html
- [S32] C2PA Technical Specification 2.2 (May 2025): https://spec.c2pa.org/specifications/specifications/2.2/specs/C2PA_Specification.html
- [S33] Tennessee Public Chapter 588 (HB 2091 / SB 2096), 2024: https://publications.tnsosfiles.com/acts/113/pub/pc0588.pdf
- [S34] California Assembly Bill 2602, Chapter 259, Statutes of 2024 (third-party-hosted copy of the chaptered PDF): https://theaicounsel.net/wp-content/uploads/2025/02/20230AB2602_92.pdf ; official page: https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=202320240AB2602 (HTTP 403; not retrieved)
- [S35] California Senate Judiciary Committee, analysis of AB 1836 (Bauer-Kahan), June 2024: https://sjud.senate.ca.gov/system/files/2024-06/ab-1836-bauer-kahan.pdf
- [S36] govinfo, BILLSTATUS-119s4591 (S.4591, NO FAKES Act of 2026; record updated 2026-08-10): https://www.govinfo.gov/bulkdata/BILLSTATUS/119/s/BILLSTATUS-119s4591.xml
- [S37] Regulation (EU) 2024/1689 (AI Act), Official Journal L 2024/1689: https://eur-lex.europa.eu/eli/reg/2024/1689/oj/eng
- [S38] Regulation (EU) 2026/1744 (Digital Omnibus on AI), Official Journal L 2026/1744, published 2026-07-24: https://eur-lex.europa.eu/eli/reg/2026/1744/oj/eng
- [S39] European Commission, Code of Practice on transparency of AI-generated content: https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content
- [S40] Paul Weiss, "EU Finalises Transparency Rules for AI-Generated Content" (secondary; for final guidelines date): https://www.paulweiss.com/insights/client-memos/eu-finalises-transparency-rules-for-ai-generated-content
- [S41] CNBC, 2025-05-20, reporting Google's Veo 3 blog statement (secondary): https://www.cnbc.com/2025/05/20/google-ai-video-generator-audio-veo-3.html
- [S43] Starchild, NO FAKES Act blocked-in-Senate article (secondary; floor objection claim): https://starchild.music/blog/no-fakes-act-blocked-senate-voice-rights
- [S44] Tennessee General Assembly, HB 2091 bill information (signing date, Public Chapter 588, effective date): https://wapp.capitol.tn.gov/apps/Billinfo/default.aspx?BillNumber=HB2091&ga=113

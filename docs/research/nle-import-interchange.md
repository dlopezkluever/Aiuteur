# NLE import and interchange: DaVinci Resolve, Premiere Pro, CapCut Desktop (as of 2026-10-20)

Research for issue #70 (Wayfinder research ticket, map #49). Throwaway findings, not product architecture, never merged to `main`. The Product Constitution wins over anything here.

Method: vendor manuals and help pages read directly on 2026-10-20 (Resolve 21.1 Reference Manual, Sept 2026, downloaded and read as PDF; Resolve 21.1 codec list; Premiere help centre and release notes). Local experiments with `ffmpeg`/`ffprobe` and OpenTimelineIO (0.18.1) in an orb. No NLE can run in an orb, so **nothing below about how an app *behaves* on a specific file was tested in the app**; behaviour claims come from the cited docs or are labelled.

Labels: **[doc]** vendor documentation. **[obs]** observed locally in this session. **[sec]** third-party or community source, not the vendor. **[unverified]** plausible but not confirmed; needs a hands-on check (see "Hands-on verification protocol").

## 1. Answer in brief

- **Resolve 21.1** imports AAF, EDL (CMX 3600), FCP7 XML (xmeml), FCPXML, DRT, ADL, OTIO and OTIOZ. Best path for Aiuteur: **xmeml**, with **OTIO** alongside. [doc]
- **Premiere Pro 26.5.x** imports FCP7 XML, EDL, AAF, and **OTIO since 26.3 (June 2026)**. It **cannot import FCPXML**. Best path: **xmeml**; OTIO is usable but thinner. [doc]
- **CapCut Desktop has no timeline import at all**: no XML, FCPXML, EDL, AAF or OTIO. CapCut's help centre says so. Its draft files are undocumented, and writing them externally is fragile. A pre-assembled timeline in CapCut is **not achievable through a supported interface today**. Fallback: well-named, ordered clip files, optionally one assembly render. [doc][sec]
- The success test (*import and start cutting without renaming, relinking or reorganising*) is reachable for Resolve and Premiere **only if media paths resolve**. No interchange format guarantees portable relative paths. The practical answer is two export modes: export-to-folder (absolute paths bound to the chosen destination, zero prompts) and portable zip (one folder-picker prompt).
- **Normalisation:** do not transcode by default. Keep the provider file as the master. Probe every take at ingest and store timing/audio metadata from day one. Transcode only in three cases: variable frame rate, a target editor that cannot decode the codec, and (opt-in) an editing-friendly mezzanine.
- **Do not rely on a generic timeline library for mixed-frame-rate timelines.** The OTIO FCP7 adapter produced a wrong sequence `<duration>` and mismatched `in`/`out` units for a mixed-fps timeline [obs]. Write a small purpose-built exporter that quantises to one timeline fps.

## 2. What each editor imports today

### 2.1 DaVinci Resolve (current: 21.1, September 2026)

All **[doc]** from the Resolve 21.1 Reference Manual, chapter 22 ("Importing and Conforming Timelines"), unless noted.

| Format | Import | Notes |
|---|---|---|
| FCP7 XML (xmeml) | Yes | Premiere and Resolve both speak it. Conforms by **file name** and path when "Assist using reel names" is off (the default). No reel names or timecode tracks needed. Carries multiple tracks, linked clip audio, linear and variable speed, mixed frame rates. |
| FCPXML | Yes | Same "AAF/EDL/XML/DRT/ADL/OTIO" dialog. The manual does not state supported versions. Forum reports (2022, [sec]): 17.4 accepted ≤1.9, Resolve 18 added 1.10. Later versions: [unverified]. |
| OTIO (`.otio`) | Yes | Timeline metadata only; media linked by `target_url`. |
| OTIOZ (`.otioz`) | Yes | Zip bundle. On import the media **unzips next to the `.otioz` and links itself automatically**. The only documented zero-prompt path. Doubles disk use. |
| EDL (CMX 3600) | Yes | Needs reel names and true timecode. **File names are never used** to conform EDLs. No multiple tracks, no composite or opacity data (manual's effects table). Weakest option. |
| AAF | Yes | Strong for Avid/Premiere round trips; awkward to generate; not recommended. |
| DRT / DRP | Yes (DRT) | Resolve's own format, undocumented. Not a target. |
| ADL | Import only | Audio decision lists. Irrelevant. |

Import dialog behaviour relevant to "start cutting within minutes" [doc]:

- Defaults come from the file: sequence frame size, **timeline frame rate**, drop-frame flag, start timecode. "Automatically set project settings" is on by default. If the project already has media in the Media Pool, **the timeline frame rate is locked**.
- "Automatically import source clips into media pool" (default on) reads media from the embedded paths. **If media is not at those paths, a dialog asks for one folder to search; all subfolders are traversed.** Answering once relinks everything by file name. This is the "one prompt" case.
- "Ignore file extensions when matching" relinks to other-format media with the same name.
- "Import multi-channel audio tracks as linked groups" controls whether stereo/5.1 becomes mono linked tracks or multichannel tracks.
- **Mixed frame rates:** Resolve conforms all clips to the timeline rate, retiming differing source rates with the project's retime process (frame duplication/dropping by default; interpolation options exist). "Mixed frame rate format" must be **Resolve** for Premiere-style XML. Real-time duration is preserved; cadence is not (e.g. 30→24 drops frames). Choosing "None" instead makes clips play at the timeline rate, changing their speed.
- Media in "a single main directory" (subfolders fine) conforms most easily. [doc]

Codec constraints (Resolve 21.1 Supported Formats and Codecs, Sept 2026) [doc]:

- macOS and Windows: H.264/HEVC MP4 decode is supported (Windows Free: 8-bit OS-supported profiles; more profiles and GPU acceleration in Studio).
- **Linux: H.264 decode is "Studio only"**, and the embedded-audio list contains no AAC. A forum summary [sec] says the same for the Free build: no H.264 video, no AAC audio in any build. A Linux user with MP4/H.264/AAC takes must transcode (the community uses DNxHR). Aiuteur cannot assume the creator's OS.

### 2.2 Adobe Premiere Pro (current: 26.5.2, September 2026)

| Format | Import | Notes |
|---|---|---|
| FCP7 XML (xmeml) | Yes | "XML: FCP XML" in the supported-formats table. [doc] |
| FCPXML | **No** | Adobe: "Final Cut Pro X exports a `.fcpxml` file format that Premiere cannot directly import"; users must convert (third-party XtoCC). [doc, updated Apr 2026] |
| EDL (CMX 3600) | Yes | Supported-formats table. [doc] |
| AAF | Yes | Supported-formats table. [doc] |
| OTIO | **Yes, since 26.3 (June 2026)** | Release notes: "Premiere now supports importing and exporting OpenTimelineIO (OTIO) projects". Adobe's own announcement lists what is carried: names, cut list, source in/out, durations, start timecode/format, fps, tracks and track names, linear speed, sequence markers. Externally authored OTIO "may need manual adjustment" of sequence settings. Round-trip caveat reported by users: clip names revert to file names; one report of OTIO failing to relink where XML conformed [sec]. Adobe's community manager also said XML is "a far more robust interchange format than OTIO". [doc/sec] |
| `.prproj` | Proprietary | Not a target. |

Relink behaviour [doc, "Relink media in Premiere"]: Premiere first checks historical paths, then searches the **project file's folder and subfolders, then one level up** (adjacent folders). Files it cannot find open the **Link Media** dialog. Renamed files or folders always need manual relink. That two-pass search is for `.prproj` projects; the page does not describe it for XML-imported sequences, so how an XML with wrong `pathurl` values links is [unverified].

Audio [doc, "Audio conforming specifications"]: Premiere processes audio as 32-bit float at the sequence rate and **conforms (writes `.cfa` previews) non-matching or compressed audio on first import**. 44.1 kHz and 48 kHz are natively supported. Expect a one-time conform wait, not an error.

### 2.3 CapCut Desktop

- **No timeline import or export.** CapCut Help (Jan 2026): "CapCut does not support direct importing or exporting of project files from third-party editing software." Alternatives it offers: import a rendered file, or rebuild the project manually. [doc]
- A third-party converter site (published Oct 9, 2026) states the same: CapCut desktop exports video, audio and captions only; no XML/AAF/EDL. [sec]
- Projects are **undocumented JSON drafts** (`draft_info.json` since 6.0; `draft_content.json` on older Windows builds). Community tooling (pyCapCut, capcut-cli) writes drafts, but: newer builds re-save drafts **encrypted in place**; a `draft_content.json` dropped into a modern folder gives "draft content is corrupted"; **CapCut 10.x is reported to reject tool-written drafts**; 9.1.0 decides which media is available from `draft_meta_info.json`, not the timeline. capcut-cli itself write-guards 10.x. [sec] This is reverse engineering of a private format with no stability promise.
- Import formats: CapCut lists "a wide range of audio and video formats" without an exact matrix. MP4/H.264/AAC is the safe baseline; HEVC and 10-bit are device-dependent. A renamed extension does not help. [doc/sec]
- Whether CapCut orders multi-file imports by name when added to the timeline is [unverified].

**Limitation recorded (CapCut):** the Constitution's §12.3 mention of a pre-assembled sequence file for "Resolve/Premiere/CapCut" cannot be met for CapCut through any supported interface. §3.1's CORE bar ("export the clips plus the written documents into DaVinci Resolve or CapCut") is met at clip level, which works.

## 3. Interchange formats compared for Aiuteur's needs

| Need | xmeml (FCP7 XML) | OTIO | EDL (CMX 3600) | FCPXML | AAF |
|---|---|---|---|---|---|
| Resolve import | Yes | Yes | Yes | Yes | Yes |
| Premiere import | Yes | Yes (26.3+) | Yes | **No** | Yes |
| CapCut import | No | No | No | No | No |
| Links by file name | Yes (Resolve) | Via `target_url` | **No** (reel name + TC) | Yes | Yes |
| Mixed fps in one timeline | Yes, with care (see §4) | Yes; explicit rationals | Single rate; 8-char reels | Yes | Partial |
| Per-file audio channel declaration | Yes (`channelcount`) | Limited | No | Yes | Yes |
| Hand-writable, deterministic text | Yes | Yes (JSON) | Yes | Yes | **No** (binary) |
| Maturity in Resolve/Premiere | Highest | Newer; reported weaker relink | Legacy | Resolve-only | High |

Observed [obs]: converting one 6-clip timeline with the OTIO CMX 3600 adapter gave reel names `Aveo2472`, `Bkling30`, `Cntsc239` … (**truncated to 8 characters**, derived from file names); file names survive only in `* FROM CLIP` comments, which Resolve's manual says it does not use for EDL conforming. EDL cannot be the main path. It is a last-resort fallback only, and only with generated unique 8-character reel codes (e.g. `S01SH010`).

## 4. Local experiment: mixed provider formats

Six synthetic H.264/AAC MP4 takes mimicking plausible provider variety (24, 30 portrait mono 44.1 kHz, 23.976, 25, silent, 60 fps), plus one variable-frame-rate file. Assembled in OTIO and written to xmeml/EDL with `otio-fcp-adapter` and `otio-cmx3600-adapter`. (Exact fps in the matrix from issue #5: Veo 3.1 24 fps; Seedance 2.0 24 fps; Luma Ray 3.2 24 fps; LTX default 24 fps; most other providers not captured. So 24 dominates but is not guaranteed.)

`ffprobe` per take [obs]:

| Take | fps (`r_frame_rate`) | frames | video s | audio | Frames at 24 fps (duration-preserving) |
|---|---|---|---|---|---|
| A 1280×720 | 24 | 192 | 8.000 | 2 ch, 48 kHz | 192 |
| B 1080×1920 | 30 | 150 | 5.000 | **1 ch, 44.1 kHz** | 120 |
| C 1920×1080 | 24000/1001 | 144 | **6.006** (audio 6.000) | 2 ch, 48 kHz | 144 |
| D 1920×1080 | 25 | 150 | 6.000 | 2 ch, 48 kHz | 144 |
| E 1280×720 | 24 | 96 | 4.000 | **none** | 96 |
| F 1920×1080 | 60 | 180 | 3.000 | 2 ch, 48 kHz | 72 |
| G (VFR) | `r_frame_rate` 60/1 vs `avg_frame_rate` 144/5 | 144 | 4.983 | none | n/a |

Findings:

1. **Variable frame rate is detectable** as `r_frame_rate ≠ avg_frame_rate` (G). A strict probe should flag any such file; it is the one case where an NLE cannot map frames to timeline frames cleanly.
2. **Video and audio durations differ by milliseconds** (C: 6.006 vs 6.000). Timeline length must come from the **video frame count**, not the container duration.
3. **A generic adapter got the mixed-rate sequence wrong.** For the 24 fps sequence, `otio-fcp-adapter` wrote clip `start`/`end` correctly in sequence frames (total 768 = 32.0 s) but **sequence `<duration>` = 1920** (wrong), and clip `<in>`/`<out>` in each file's own frames (B: `in 0 out 150` against `start 192 end 312`, i.e. 150 source frames in a 120-frame slot). FCP7 XML reads a mismatch like that as a speed change unless handled. How Resolve and Premiere resolve it was not run. [obs][unverified]
4. The same adapter **declares an audio stream on every file** (TODO in its source) and sets `ntsc=TRUE` for 23.976. A silent take (E) therefore carries an audio declaration it does not have; the exporter must write `<audio>` only from probed data, and derive `ntsc` from the exact rational rate (24000/1001 → `TRUE`, 24/1 → `FALSE`).
5. xmeml needs **per-file audio channel count and sample rate** to avoid mis-declared tracks (B is mono; the other takes are stereo). Resolve can import them as mono linked groups or multichannel tracks (dialog option); Premiere conforms 44.1 kHz audio on first import.

## 5. Recommendations

### 5.1 Interchange path per editor

| Editor | Primary | Also ship | Do not use |
|---|---|---|---|
| **DaVinci Resolve** | xmeml (v4/v5 style, FCP7) | `.otio`; optional `.otioz` zero-prompt bundle (see 5.3) | FCPXML (version churn), DRT/DRP/AAF; EDL only as fallback |
| **Premiere Pro** | xmeml | `.otio` for 26.3+ | FCPXML (not importable); AAF |
| **CapCut Desktop** | **Ordered clip files** (no timeline) | Optional single assembly render (`.mp4`) for a quick cut-up | Writing CapCut drafts: **EXPERIMENTAL, undocumented, encrypted on save, rejected on 10.x** |

One exporter, one internal timeline model (shots in story order, each referencing a take file with probed metadata), several serialisers behind a capability descriptor (`format`, `preAssembled: yes | no | experimental`). CapCut's serialiser is "files only", so the CapCut limitation lives in one place and a future draft writer could be added without touching the model.

### 5.2 Export package layout

```
<project-slug>_export_<8-char-content-hash>/
  README.txt            <- 3 import steps per editor, plus listed warnings
  manifest.json         <- canonical JSON (sorted keys, LF, no wall-clock times)
  timeline/
    <slug>_full.xml     <- xmeml (Resolve + Premiere)
    <slug>_full.otio
    <slug>_full.edl     <- fallback; reels S01SH010-style codes
    (optional per-scene: <slug>_S01.xml ...)
  takes/
    S01_<scene-slug>/S01_SH010_T03.mp4
    S01_<scene-slug>/S01_SH020_T01.mp4
    S02_<scene-slug>/...
  frames/ prompts/ documents/
```

Design rules, with evidence:

- **Names are globally unique, ASCII, zero-padded and sortable** (`S01_SH010_T03`). Resolve conforms XML by file name [doc]; OTIO file bundles require unique basenames [doc]; CapCut and every file browser then show story order for free. Per-scene folders give bins when folders are imported (Resolve/Premiere) while unique basenames keep flat export possible. Avoid spaces and non-ASCII in file names as a precaution (`pathurl` percent-encoding) [unverified need].
- **One root for all takes.** Resolve's manual: keep media in a single main directory, subfolders fine. [doc]
- **Take numbers are not part of the timeline contract**: the timeline references the selected take only.
- The timeline files contain **only selected takes**; unselected takes are out of §12.3's package contents.

### 5.3 Paths and the "no relinking" success test

No interchange format provides a guaranteed relative-path convention. OTIO's own maintainers have an open request to document how relative `target_url` values resolve (relative to the referencing file), meaning behaviour today is application-defined. [sec: OTIO issue #1985]. Two modes:

1. **Export to a chosen folder** (an app that writes to disk on the user's machine knows the destination): write absolute `pathurl`/`target_url` for that exact location. Resolve and Premiere then link with **no prompt**, provided the folder is not moved.
2. **Portable zip / download**: destination unknown. Ship relative-first paths, and the README says "when asked for the media folder, pick `takes/`". Resolve then needs **one folder pick**; Premiere's Link Media dialog is the analogue [unverified]. This is the honest floor of "one prompt, no renaming, no per-clip relinking".
3. **Resolve-only zero-prompt**: an `.otioz` bundle links itself on import [doc]. It duplicates media, so make it opt-in, or ship `.otiod`-style layout [unverified for Resolve].

Determinism (§12.3): same selected material ⇒ same `takes/`, `manifest.json` and logical timeline. Path-bound timeline files differ only in the destination root; hash the root-relative form and record the root separately.

### 5.4 Required take metadata from day one

Probe once at ingest with `ffprobe` (JSON) and freeze the result on the take record; never trust the generation request. Fields:

| Group | Fields |
|---|---|
| Identity | SHA-256, byte size, container, provider, model, request id |
| Video timing | exact rational frame rate (`r_frame_rate`), `avg_frame_rate`, **`is_cfr`** (`r == avg`), **decoded frame count**, `duration_frames / fps` as canonical duration, start timecode (`none` or `HH:MM:SS:FF`), time base |
| Video format | codec, profile, pixel format, width, height, sample/display aspect ratio, rotation, field order, colour primaries/transfer/matrix/range, bit depth |
| Audio | `has_audio`, codec, sample rate, **channel count and layout**, audio duration, audio start offset |
| Derived flags | `fps_mismatch` vs project timeline fps, `av_duration_delta_ms`, `target_decodable` (per-editor codec check) |
| Provenance for diagnostics | requested duration and fps versus measured |

These cost one probe and make the timeline, the README warnings and the normalisation decisions pure functions of stored data. Without them the pre-assembled timeline becomes a retrofit, as the ticket warns.

### 5.5 Normalisation recommendation

Default: **no transcoding**. The provider file is the take; keeping it byte-identical preserves provenance and determinism, avoids generation loss, and costs nothing.

| Situation (from probe) | Action |
|---|---|
| Constant frame rate, any fps, decodable (H.264/AAC, most cases) | Ship as-is. Timeline fps from the rule below; `fps_mismatch` flagged in README. |
| Mixed fps among takes | Ship as-is. Quantise each clip to the timeline rate with `round(frames × timeline_fps / source_fps)`, computed from frame counts, never from container durations. Resolve retimes by frame dropping/duplication [doc]. |
| **Variable frame rate** | **Normalise**: re-encode to constant frame rate at the nearest standard rate (store both files; the CFR file is the one referenced). Hard rule: no VFR file enters a timeline. |
| Audio absent | Ship as-is; xmeml declares no audio for that file. |
| Audio sample rate ≠ 48 kHz | Ship as-is (Premiere conforms once). |
| Codec not decodable in target (e.g. Resolve Free on Linux for H.264/AAC) | Offer an **opt-in "editing-friendly" profile**: DNxHR/ProRes mezzanine (a separate package folder). Not default. |
| Portrait/odd sizes | Ship as-is; the sequence frame size is a project choice. |

**Timeline fps rule:** project setting, defaulting to 24 (matches the documented outputs of Veo, Seedance, Luma, LTX in the #5 matrix); if unset, the fps carrying the most total duration among selected takes; ties go to 24. Never an automatic NTSC conversion.

### 5.6 Hands-on verification protocol (not performed; do this before the export spec locks)

Fifteen minutes with real apps on the fixture set in §4 would turn the [unverified] items into facts:

1. Resolve 21.x (Win or macOS, Free): import the xmeml with paths **deliberately wrong**; confirm the single folder prompt, relink by name, and the mixed-fps result.
2. Resolve: import the `.otio` with relative `target_url`; and the `.otioz`.
3. Premiere 26.5: import the xmeml with wrong paths (link dialog behaviour) and the `.otio`.
4. Both: confirm a VFR file's behaviour, a mono take, a silent take, a 23.976 take in a 24 fps sequence, and whether `in/out` unit mismatch yields speed changes.
5. CapCut Desktop: select all takes by name and drop on the timeline; check order.

## 6. Constitution check

- §12.3 contents, deterministic packaging, and the success test: satisfiable for Resolve and Premiere under the two-mode path rule (zero prompts when exporting to a known folder; one folder pick otherwise).
- §15.2 NLE timeline export (IMPORTANT): met for Resolve and Premiere. **CapCut is a recorded limitation**, handled by the exporter capability abstraction and the clip-order fallback. No settled item (export contents, external editors, no in-app assembly) is found unworkable, so no `CONSTITUTION AMENDMENT REQUIRED` proposal was opened. Whether the "/CapCut" wording in §12.3 should be softened is a driving-dev call, not a blocker.
- §12.2 in-app assembly (LATER) is not researched here.

## 7. Caveats

- No NLE was run. Every editor behaviour above is from documentation or community reports; the protocol in 5.6 is the cure.
- Resolve's FCPXML version range and the CapCut `draft_info.json` details are community-sourced.
- Premiere's OTIO import is documented only by release notes and an Adobe community announcement; no formal "supported elements" page was found.
- Provider output specs (codec, fps, audio layout) are mostly "not captured" in the #5 research; this research assumes the probe at ingest, which is the point of 5.4.
- The synthetic fixtures are H.264/AAC from `ffmpeg`, not real provider output.

## 8. Sources

Fetched 2026-10-20.

- [R1] Blackmagic Design, *DaVinci Resolve 21.1 Reference Manual* (Sept 2026), ch. 22 "Importing and Conforming Timelines": https://documents.blackmagicdesign.com/UserManuals/DaVinci_Resolve_21.1_Reference_Manual.pdf
- [R2] Blackmagic Design, *DaVinci Resolve 21.1 Supported Formats and Codecs* (Sept 2026): https://documents.blackmagicdesign.com/SupportNotes/DaVinci_Resolve_21_Supported_Codec_List.pdf
- [R3] Adobe, Supported file formats in Premiere (updated Sep 30, 2026): https://helpx.adobe.com/premiere-pro/using/supported-file-formats.html
- [R4] Adobe, Premiere desktop release notes (26.3 June 2026: OTIO; 26.5.2 Sept 2026): https://helpx.adobe.com/premiere/desktop/whats-new/release-notes.html
- [R5] Adobe, Import XML files from Final Cut Pro X (Apr 2, 2026): https://helpx.adobe.com/premiere/desktop/organize-media/import-files/migrate-from-final-cut-pro-x.html
- [R6] Adobe, Relink media in Premiere: https://helpx.adobe.com/premiere/desktop/organize-media/file-organization/relink-offline-media-automatically.html
- [R7] Adobe, Audio conforming specifications: https://helpx.adobe.com/premiere/desktop/organize-media/import-files/audio-conforming-specifications.html
- [R8] Adobe community, "[Now Released] OTIO Import and Export" (Oct 23, 2024; replies to Mar 2026): https://community.adobe.com/announcements-732/now-released-otio-import-and-export-311699
- [R9] CapCut Help Center, "How Do I Export a Premiere Pro Project to CapCut?" (Jan 21, 2026): https://www.capcut.com/help/how-to-export-pro-project
- [R10] [sec] CutConvert, "Does CapCut export XML?" (Oct 9, 2026): https://cutconvert.com/guides/does-capcut-export-xml
- [R11] [sec] capcut-cli docs, version support matrix and draft overview: https://unpkg.com/capcut-cli@0.29.0/docs/version-support.md
- [R12] OpenTimelineIO docs, File bundles (OTIOZ/OTIOD): https://opentimelineio.readthedocs.io/en/latest/tutorials/otio-filebundles.html
- [R13] OpenTimelineIO issue #1985, target_url relative path guidance: https://github.com/AcademySoftwareFoundation/OpenTimelineIO/issues/1985
- [R14] [sec] Blackmagic Forum, FCPXML 1.9/1.10 threads (2021–22): https://forum.blackmagicdesign.com/viewtopic.php?f=21&t=151297
- [R15] Preserved research #5, video generation capabilities: https://github.com/dlopezkluever/aiuteur/blob/research/video-generation-capabilities/docs/research/video-generation-capabilities.md
- [R16] Constitution §§3.1, 12, 15.2: https://github.com/dlopezkluever/aiuteur/blob/main/docs/product/PRODUCT-CONSTITUTION.md

## Appendix: experiment recipe (reproducible)

```
ffmpeg -f lavfi -i testsrc2=size=1280x720:rate=24:duration=8 \
       -f lavfi -i sine=frequency=440:sample_rate=48000:duration=8 \
       -c:v libx264 -pix_fmt yuv420p -ac 2 -c:a aac A.mp4        # repeat per row of §4
ffprobe -v error -show_entries format=duration:stream=codec_type,codec_name,\
  r_frame_rate,avg_frame_rate,nb_frames,duration,sample_rate,channels,width,height \
  -of compact=p=0 A.mp4
# OTIO 0.18.1 + otio-fcp-adapter + otio-cmx3600-adapter: build one Track per kind,
# write_to_file(..., adapter_name="fcp_xml" | "cmx_3600" | "otio_json")
```

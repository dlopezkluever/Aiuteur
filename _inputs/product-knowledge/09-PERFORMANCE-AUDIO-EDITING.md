# 09 Performance, Audio & Editing

> Scope: dialogue performance, character voices, sound and music, clip sequencing, scene review, export, and post-production handoff. Legacy product thinking, not a description of current behavior. Legend: see 00-README.

## Dialogue and performance direction

- **WD-IDEA-AV-001** [impl] Dialogue in a video prompt carries the exact words in quotes, the speaker's identity, voice qualities (accent, tone, pitch, pace, emotion), delivery style (whispered, shouted, muttered, deadpan, sing-song, trembling), and pause/timing cues.
- **WD-IDEA-AV-002** [idea] Speaker-attributed format ("<Character> says: '…'") improves speaker attribution and lip-sync in multi-character shots. Each speaker in a dialogue shot needs a distinct description and a label. ‹src: veo-3-prompt-guide, Frame_Video_Prompt_Format_Guide›
- **WD-IDEA-AV-003** [idea] Narration/voiceover is its own dialogue type: a narrator voice described by accent and tone, with the spoken line quoted. ‹src: Frame_Video_Prompt_Format_Guide›
- **WD-IDEA-AV-005** [idea] Performance direction covers pace, intensity, emotional shifts ("shifts from X to Y", "suddenly realizes"), body language (tenses, slumps, freezes), and eye behavior (locks eyes, glances away). One shot can carry a small emotional arc. ‹src: Frame_Video_Prompt_Format_Guide›

### Options: where the spoken words come from
- **WD-IDEA-AV-008** [alt, planned] Script verbatim: the video prompt uses the exact words from the shot's dialogue. ‹src: 3.8-phase3-structured-prompts-and-limits›
- **WD-IDEA-AV-009** [alt] Implicit dialogue: describe the speech act ("a man tells us his name") and let the model generate the words. ‹src: veo-3-prompt-guide›
- **WD-IDEA-AV-010** [alt, voice, future] The recording wins: when the user's recorded performance goes off-script (for example, an ad-lib that is funnier), the video follows the recording, and the recorded line may override or update the scripted dialogue (see 05). ‹src: Issues, streamlined-input-process-consolidated, streamline-master-plan-8-1›

## Audio in the video prompt

- **WD-IDEA-AV-011** [idea] Every video prompt in the target model's format carries an audio part: the shot's dialogue with delivery direction plus sound design for the action.
- **WD-IDEA-AV-012** [impl, planned] When the shot does not specify sound, sound design (SFX, ambience, and music) is inferred from scene context. ‹src: 3.8-phase3-structured-prompts-and-limits, 3.7-Do-last-maybe-redundant-structured-image-task›

### Options: where the audio section sits in the video prompt

Held with their owning topic in other documents: WD-IDEA-GEN-061 (see 08), WD-IDEA-GEN-062 (see 08), WD-IDEA-GEN-060 (see 08).

## Sound design and native audio

- **WD-IDEA-AV-017** [impl] Sound design has layers, each specified separately: SFX tied to specific actions (door slam, footsteps on gravel, ice clinking), the ambient soundscape (rain, traffic, ship hum), and musical cues where relevant. Music can be score or a diegetic source, such as a radio playing off-screen.
- **WD-IDEA-AV-018** [impl] When a quiet beat matters, the prompt calls for silence explicitly instead of leaving it to chance.
- **WD-IDEA-AV-019** [idea] Treat native generated audio as a starting point. There are three treatments, chosen per situation:
  - Keep it when the ambient sound fits the scene.
  - Refine it, for example by crossfading between clips so the audio does not jump at cuts.
  - Disable and replace it for brand work, precise dialogue, or music-driven pieces, and whenever the ambient sound or levels distract. ‹src: Frame_Video_Prompt_Format_Guide›
- **WD-IDEA-AV-020** [idea] Exact lip-sync is not guaranteed. When precise lip movement matters, plan to align the voiceover and retime it in post-production. ‹src: Frame_Video_Prompt_Format_Guide›

## Character voices

- **WD-IDEA-AV-021** [future] Voice gallery: each master character is linked to a voice profile (from an external voice service) in the asset editor during global asset definition, with a voice preview. This fills a gap: native video audio does not keep a character's voice consistent across shots (see 06). ‹src: project-overview, Post-MVP-tasklist›
- **WD-IDEA-AV-022** [future] The character's voice profile acts as a "voice seed": it goes into the audio section of every video prompt so the character sounds identical in every clip. ‹src: project-overview, Post-MVP-tasklist›
- **WD-IDEA-AV-023** [future] A voice sample supplied at intake attaches to a character only when the user explicitly maps it. ‹src: streamlined-input-process-consolidated›
- **WD-IDEA-AV-024** [idea, future] Dialogue extracted from the script can build per-character voice profiles and feed audio generation and audio continuity checks. ‹src: tiptap-json-extraction-guide›

## Recorded performance and voice acting

- **WD-IDEA-AV-026** [voice, future] A cloned voice or the user's own recorded dialogue drives each video generation, and the characters' mouths are lip-synced to the supplied audio. ‹src: Issues, Totally-New-Features›
- **WD-IDEA-AV-027** [voice, future] Lip-sync also carries the recording's underlying emotion (excited, neutral, bored, happy, overjoyed, terrified, and so on) into the on-screen performance. ‹src: Issues›
- **WD-IDEA-AV-028** [future] Voice-print transfer keeps the emotional performance and inflection of the recorded line when a different voice print is applied (voice cloning or transformation). ‹src: streamlined-input-process-consolidated, streamline-master-plan-8-1›
- **WD-IDEA-AV-029** [future] A long recorded line can be split across several clips or shots without breaking audio continuity (see 07). ‹src: streamlined-input-process-consolidated›
- **WD-IDEA-AV-030** [voice, future] "Voice-Actinator": the user shows a start frame, enters the action, picks which character speaks, and submits a voice-acting recording. The result is an animated clip matched exactly to the performance. It could be a standalone product or part of Aiuteur. ‹src: truly strech›

## Audio-driven projects

In this mode the audio leads and the visuals follow it. Each downstream stage lines up with the audio's timestamps and topic changes (see 05, 06, 07, 08).

- **WD-IDEA-AV-034** [future] Full audio-first projects (podcasts, audiobooks, lectures) generate visuals to match a transcript or narration timeline. This inverts the pipeline, so the script matters less than the audio's cadence, which makes it a fundamentally different product mode. ‹src: streamlined-input-process-consolidated, streamlined-input-analysis-5-10›

## Audio intake and script audio

Held with their owning topic in other documents: WD-IDEA-INPUT-077 (see 02B), WD-IDEA-INPUT-078 (see 02B), WD-IDEA-INPUT-079 (see 02B), WD-IDEA-STORY-130 (see 05).


## Clip length, sequencing, and the audio stage

- **WD-IDEA-AV-039** [idea] Clip length is capped (about 8 seconds per generation), so a longer narrative is assembled by sequencing short clips. A request longer than the cap is broken into several shots. Related: this cap is the constraint behind the 8-second shot default in WD-IDEA-SHOT-012. ‹src: veo-3-prompt-guide›
- **WD-IDEA-AV-040** [idea] Clip-extension workflow: generate a short base clip, review it and pick the strongest take, extend only the best clips using consistent prompt language, then stitch the clips together in an editor. The extend-shot feature itself belongs to shot and generation (see 07, 08); its extension parameters are in WD-IDEA-SHOT-096. ‹src: Frame_Video_Prompt_Format_Guide›
- **WD-IDEA-AV-042** [idea] One stage map put audio/music at Stage 9, with script dialogue as the source text for voice generation. Elsewhere Stage 9 is prompt review (see 02). Related: WD-IDEA-FLOW-005 and WD-IDEA-FLOW-010 hold conflicting stage maps; stage-map variants belong to 02. ‹src: tiptap-json-extraction-guide›

## Scene review player

- **WD-IDEA-AV-043** [idea] Conceived: Stage 12 plays the whole scene, cut together from its individual clips, in a timeline player with shot markers. ‹src: project-overview, user-flow›
- **WD-IDEA-AV-044** [planned, voice] Side-by-side review layout: the scene player on the left and the shot list with start-frame thumbnails on the right. The timeline shows shot boundaries, supports scrubbing across the whole scene, highlights the current shot, and auto-advances between shots; clicking a shot jumps to it. The creator called this upgrade "huge" and said the thumbnail shot list is key. ‹src: Tickets, injecting-org-tickets-into-plan›
- **WD-IDEA-AV-045** [impl] The review stage tracks render jobs live and plays finished shots with play/pause, timeline seek, shot selection from a list, skip back/forward, mute, and fullscreen.
- **WD-IDEA-AV-046** [impl] Render jobs that fail can be retried. ‹src: current-app-user-flow›
- **WD-IDEA-AV-047** [impl] Empty and error states: if no video jobs were queued, review says so and offers a route back to the confirmation stage; if jobs cannot be loaded, it shows the error and a retry. ‹src: current-app-user-flow›

## Routing issues found in review

- **WD-IDEA-AV-048** [idea] Review sorts issues into visual continuity, timing, dialogue/audio, or narrative structure. A failure-attribution agent maps each issue to the upstream stage most likely to fix it. ‹src: project-overview›
- **WD-IDEA-AV-049** [impl] Review offers three resolution paths (see 02):
  - Complete Scene: return to the Script Hub.
  - Minor visual issue: return to frames and regenerate the anchors. The video is re-queued and credits are charged again.
  - Major narrative or audio issue: return to the shot list. The changes may cascade through the asset, prompt, and frame stages.
- **WD-IDEA-AV-051** [impl] Completing a scene returns the user to the Script Hub. If some render jobs failed, the scene still completes, with a warning. Related: WD-IDEA-FLOW-059 (Stage 12 completion rule). ‹src: current-app-user-flow›

## Background rendering

- **WD-IDEA-AV-052** [future] Background rendering: after "Confirm & Render" the user can go straight back to the hub and work on other scenes. A progress bar stays in the sidebar, and completion or failure triggers an in-app toast and an email. Related: WD-IDEA-UX-354 (notification item), WD-IDEA-GEN-232 (long-job handling). ‹src: project-overview›
- **WD-IDEA-AV-053** [future] Render re-entry: clicking the completion notification, or the scene's "Complete" status in the hub, opens that scene's review player directly. ‹src: project-overview›

## Quality bar for assembled output

- **WD-IDEA-AV-054** [idea] Expected final video: duration matches the target (for audio-driven projects, exactly the audio's length); dialogue is audible and matches the script; movement is natural and continuous, with no jumps or artifacts; sound design supports the action; and the visuals complement the audio rather than distracting from it. ‹src: golden-test-evaluation-framework›

## Scene and project video export

- **WD-IDEA-AV-055** [planned] Scene video export from the review stage: MP4 (H.264) at 720p, 1080p, or 4K. A settings dialog sets format, quality, and filename. Metadata (project, scene, timestamp) is embedded. The export runs as a background job with progress and cancel, and download links expire. Related: 4K depends on upscaling (WD-IDEA-AV-081, future); the MP4-only MVP scope is WD-IDEA-PHIL-097; expiring links relate to access control in WD-IDEA-ALT-013.
- **WD-IDEA-AV-056** [planned] Export history in project settings: the settings and timestamp of each export, re-download within 7 days, and export credits or costs tracked separately.
- **WD-IDEA-AV-057** [planned, future] Full-project export (optional for MVP): concatenate all scene videos with transition handling into a master timeline with scene markers, or export only selected scenes.

## Professional export and NLE handoff

- **WD-IDEA-AV-059** [idea] Pro export includes every individual shot clip, encoded at high bitrate. ‹src: project-overview›
- **WD-IDEA-AV-060** [future] Timeline descriptor (EDL/XML) for one-click import into DaVinci Resolve, Premiere Pro, or CapCut. It keeps the scene order from the hub, carries timecodes and markers at shot boundaries, and ships in an NLE-ready folder structure. Treated as a post-MVP professional feature. Related: WD-IDEA-PHIL-097 defers it to post-launch; the Project Wrap bullets WD-IDEA-AV-065 to WD-IDEA-AV-076 build on it.
- **WD-IDEA-AV-061** [idea] Bulk archive: a single zip of all approved artifacts from the active branch. ‹src: project-overview›
- **WD-IDEA-AV-062** [future] Asset package: a ZIP of videos, frames, scripts, and a project metadata file, where the user picks which artifacts to include. Related: deferred to post-launch by WD-IDEA-PHIL-097. ‹src: missing_todos-not-sure, MVP-tasklist-v1.1›

### Options: clip naming convention
- **WD-IDEA-AV-063** [alt] `[Project]_[Scene#]_[ShotID]_[Version#]` (e.g. Aiuteur_Sc01_Shot3A_v02.mp4), so clips stay organized inside editors. ‹src: project-overview›
- **WD-IDEA-AV-064** [alt] `PROJECT_SC###_SH###_TK##_ROLE_VERSION` (e.g. ALPHA_SC003_SH014_TK02_PRIMARY_v1), with zero-padded IDs. The filename is the single source of truth for NLE import. ‹src: project-wrap-export-spec›

### Project Wrap

A Project Wrap is one structured, editor-ready package that holds every approved artifact and imports into a professional editor already organized.

- **WD-IDEA-AV-065** [idea, future] "Project Wrap": a single export package of all Approved artifacts for editorial. It imports into DaVinci Resolve or Premiere Pro in one click, with correct clip names, metadata, bins, and an assembled timeline. Related: WD-IDEA-AV-060, WD-IDEA-PHIL-097. ‹src: project-wrap-export-spec›
- **WD-IDEA-AV-066** [idea] Success test: an editor can unzip the package and start cutting within minutes, with no relinking, renaming, or reorganizing. ‹src: project-wrap-export-spec›
- **WD-IDEA-AV-067** [idea] The export is deterministic: the same approved artifacts always produce the same folder layout, filenames, and timeline descriptors. ‹src: project-wrap-export-spec›
- **WD-IDEA-AV-068** [idea] Wrap contents: approved video clips; timeline descriptors for Resolve and Premiere, with an EDL as a frame-accurate fallback; a machine-readable manifest that is the authoritative record of the export (project, version, timestamp, approved artifacts, scene/shot/take mapping, timeline order), plus a mirror copy for programmatic use; a checksum per file for integrity checks; and a human-readable README. Media paths are relative, so the package is self-contained. ‹src: project-wrap-export-spec›
- **WD-IDEA-AV-069** [idea] Left out of the wrap: drafts, rejected artifacts, raw originals unless explicitly approved, and any color grade, VFX, or audio mix beyond reference tracks. ‹src: project-wrap-export-spec›
- **WD-IDEA-AV-070** [idea] A clip is eligible only if it is Approved, has fixed scene and shot IDs, has locked in/out timecodes, and has a media file that resolves. One invalid approved artifact fails the whole export. Other hard failures: a missing clip, a nonconforming filename, a timeline that references missing media, or a scene ID that differs between filename, folder, and metadata. ‹src: project-wrap-export-spec›
- **WD-IDEA-AV-071** [idea] Each clip carries a take number and a role (PRIMARY, ALT, BROLL), which implies several takes and alternate or b-roll clips per shot (see 08). ‹src: project-wrap-export-spec›
- **WD-IDEA-AV-072** [idea] Clips sit in per-scene folders whose names match the scene ID in the filenames. No clip may sit outside a scene folder. ‹src: project-wrap-export-spec›
- **WD-IDEA-AV-073** [idea] A single master timeline: one video track per role (V1 primary, V2 alt, V3 b-roll) and one reference audio track per clip where audio exists, ordered by scene, then shot, then take. ‹src: project-wrap-export-spec›
- **WD-IDEA-AV-074** [idea] On import, the editor shows clips binned by scene and a master timeline ready to play, with scene/shot/take logging metadata already filled in. ‹src: project-wrap-export-spec›
- **WD-IDEA-AV-075** [idea] The package name includes the project name, date, and version. The README covers import instructions for each editor and known limitations. ‹src: project-wrap-export-spec›
- **WD-IDEA-AV-076** [idea] Non-goals: no relinking to external media, no editorial decisions at export time, and no platform-specific color or audio transforms. ‹src: project-wrap-export-spec›

## Advanced deliverables

- **WD-IDEA-AV-077** [future] Optional audio stems: separate dialogue, SFX, and music tracks (music only if generated) for mixing, delivered as a multi-track export with audio-sync validation. Related: deferred to post-launch by WD-IDEA-PHIL-097.
- **WD-IDEA-AV-078** [future] Project archival: an archive format, backups, cloud storage, restore from archive, and archives of specific versions. Related: deferred to post-launch by WD-IDEA-PHIL-097. ‹src: missing_todos-not-sure›
- **WD-IDEA-AV-079** [future] Professional formats: ProRes, DNxHD, WebM, high-bitrate options, resolution upscaling, color-grading presets, and HDR export.
- **WD-IDEA-AV-080** [future] Third-party integrations: review in Frame.io, direct upload to YouTube and Vimeo, export to Dropbox or Google Drive, and custom webhooks. ‹src: Post-MVP-tasklist›

## Post-production finishing

- **WD-IDEA-AV-081** [future] Finishing beyond generation: upscaling to 4K/60fps, reframing to vertical, and professional color grading and editing in an NLE. The video model cannot generate 4K natively, so 4K comes only from upscaling. ‹src: Frame_Video_Prompt_Format_Guide, veo-3-prompt-guide›

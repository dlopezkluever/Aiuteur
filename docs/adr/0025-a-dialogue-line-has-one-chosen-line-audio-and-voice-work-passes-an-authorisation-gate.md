# A dialogue line has one chosen Line audio, and voice work passes an authorisation gate

Status: accepted (Wayfinder #69)

Constitution §11 makes native dialogue CORE and consistent voices, recorded or uploaded performances and delivery-preserving voice transformation IMPORTANT, "architected from day one" (§3.1), with performances protected as creator work and only authorised voices transformed. The market gives no model that holds a voice across shots, no documented timing guarantee for speech-to-speech, and lip-sync that excludes some non-humanoid characters.

Decision: **Voice** is a Character-owned Editable definition (description plus Supplied samples), not a provider object. A **Performance** is Supplied creator material, never an Attempt. Each Dialogue line has one **Line audio** Slot whose candidates are a Performance, a Transformed performance and a Spoken line (both Attempts), one chosen as a Decision; with none chosen the line is native dialogue (CORE, untouched). Every Package, Take and provider path reads the chosen Line audio through the existing `audio.performance` role. **Authorisation** is an append-only Decision stream on a Performance or Voice, read by one deterministic clause of the dispatch gate; revocation stops new use, releases provider-side handles and marks dependants `authorisation-revoked`, and deletes nothing. Provider voice handles are per-project and created lazily. Timing follows the audio: it is never trimmed, stretched or padded, and the Take is made long enough. Four realization paths (native, audio-driven, lip-synced, laid-on voice-over) are chosen by the capability profile, with voice-over always reachable. Full design: [`VOICE-AND-PERFORMANCE.md`](../domain/VOICE-AND-PERFORMANCE.md).

## Considered options

- **Voice as a provider id on the Character** (V1's write-only `voice_profile_id`). Rejected: cannot be rebuilt, audited, revoked or carried by duplication.
- **Performance as an Attempt of the line.** Rejected: it is creator work, immutable and protected; Attempts accumulate machine output.
- **Authorisation as a profile flag or checkbox.** Rejected: not versioned, not revocable, outside the dispatch gate.
- **Share provider handles across duplicated projects** (PERSISTENCE §7.5 as first written). Rejected: needs cross-project reference counting and leaves revocation inconsistent. Lazy per-project handles replace it.
- **Fit the audio to the shot (trim, stretch, pad).** Rejected: alters protected material and defeats "keep the delivery".
- **Amend the Constitution.** Not needed: each infeasibility has a designed fallback.

## Consequences

- Native dialogue, the default path, needs no Voice, no Performance, no audio Offering and no gate.
- Any Offering that clones a voice must declare how it deletes one; otherwise it is ineligible, so revocation can be honoured.
- A line carried by Line audio satisfies the exactly-once dialogue guards by reference rather than as spoken text.
- Spend: audio Generations are creator-initiated and priced; a lip-synced Take is one Take for the confirm rule.
- Reverting later would mean re-modelling Performances and the authorisation history already recorded, which is why this is an ADR.

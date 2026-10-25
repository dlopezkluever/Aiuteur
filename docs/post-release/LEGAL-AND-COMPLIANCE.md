# Legal and compliance notes (post-release reference)

Reference notes for later. This is **not legal advice**, and it is not a gate, checklist, hook or checker: nothing in the build, BAR, invitations, CI or operations depends on it (Creator Ratification Record 6 §2).

## Initial product: U.S.-based, invite-only

For the initial product, the settled synthetic-media behaviour is the whole policy (OPERATIONAL-BASELINE §15):

- Preserve any marks or metadata that providers apply (watermarks, C2PA manifests).
- Never strip provenance or disclosure metadata. Originals are immutable; the only default re-encode (VFR→CFR at export) is recorded, and whether it preserves marks is checked in the NLE import check.
- Record `synthetic` provenance per Take in Aiuteur's own export manifest.
- Add no Aiuteur-specific marking unless a relevant legal or platform requirement later establishes that it is necessary.

## Before expanding to the EU or similar jurisdictions

Before Aiuteur expands into jurisdictions where synthetic-media obligations may apply, including the EU, do a legal-role review of:

- **EU AI Act Article 50.** It applies from 2026-08-02. Roughly, machine-readable marking of synthetic output is a *provider* duty, and disclosure of deepfakes is a *deployer* duty with an artistic carve-out. The Commission published Article 50 guidelines on 2026-07-20; systems placed on the market before 2026-08-02 have until 2026-12-02 for the Art. 50(2) marking duty. The open question is whether Aiuteur, which orchestrates other companies' models, counts as a provider, a deployer or neither for each kind of output (video, image, speech, transformed voice).
- **C2PA.** Whether Aiuteur should carry, re-sign or add content credentials to exports, and whether export processing keeps provider manifests intact.

If the review concludes that Aiuteur must add its own marking or disclosure, that is a product change for the creator to decide. It would revisit the "no Aiuteur-specific marking" rule above.

Sources and dates: VOICE-AND-PERFORMANCE §9 (evidence refreshed 2026-10-25). Re-check before relying on them.

## Other legal residuals already noted elsewhere

- **Voice rights.** U.S. state law (Tennessee ELVIS Act; California AB 2602 and AB 1836) and the NO FAKES Act's status were last checked on 2026-10-18. The product posture (authorisation record, revocation, provider-handle deletion) depends on none of them (VOICE-AND-PERFORMANCE §2, §9).
- **Third-party voice removal requests** are an operator and legal process, not a product feature (VOICE-AND-PERFORMANCE §2.4).
- **Provider terms** on consent for voice cloning differ by provider and are tracked per Offering (VOICE-AND-PERFORMANCE §5.3).

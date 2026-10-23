# CineBlock is an Aiuteur module, and captures always go through image generation

Status: accepted (Wayfinder #61; creator decision D61, Record 2)

CineBlock-style blocking is a **module of Aiuteur**, opened in a separate tab of the same application under the same account and session. It receives all of a scene's shots, lets the creator block with mannequins and primitives and capture start and end compositions, and on Send back each capture is **auto-linked by shot id** as a layout Composition reference on the opening or ending Frame role. A capture is blocking and framing only: it is never the frame and never goes to video; it always passes through image generation, with placeholders replaced by the project's entities. The scene state is stored per scene so the creator can re-open it. The world model that the stage may use is a Catalogue provider (`world.generate`), operator-paid until BYOK. The versioned package is an **internal** contract keyed by echoed shot ids; external previs packages, storyboards and shot lists keep the deterministic-first matching rules, with many-to-one flagging both rows. Details: `docs/domain/SHOT-PLANNING-INPUTS.md`.

## Considered options

- **File exchange now, linked app later (the agent recommendation).** Rejected by the creator. It keeps two apps, a second sign-in or launch token, and manual file steps, and it leaves the creator's own tool outside the account, isolation and purge guarantees.
- **A separate linked application with cross-app sign-in.** Rejected for the same reasons: a seam between two codebases whose isolation (M4) and purge (M7) would each need their own proof.
- **Embed the stage inside the scene workspace page.** Rejected as the surface (not as a module): the scene workspace is the most crowded screen, and the stage is a heavy 3D canvas. A separate tab of the same app gives the module its own screen without a second app.
- **Use the capture directly as the frame, or send it to video.** Rejected: a mannequin render is not a quality frame, and sending it to video would carry placeholders into the film. Image generation with entity replacement is the only path (Constitution §8.2).
- **Import CineBlock duration, action text or names.** Rejected: duration is a tool default, and the Master Narrative stays the truth. Camera facets fill empty fields only.

## Consequences

- One account, one session, one set of isolation, retire-never-delete and purge rules cover CineBlock data. There is no second credential.
- The shot model already reserves the composition slot and optional capture metadata, so the module needs no change to the Shot or Frame.
- A `previs` module is added to the module graph (`MODULE-ARCHITECTURE.md` §3.6). The 3D client is served by Aiuteur; the world model is a Job through the Catalogue, so the legacy client-side API key is removed.
- Whole-frame layout adherence remains best-effort (research #6); the Frame step is the check.
- Hard to reverse: the package contract and the per-scene state record are stored data; changes are versioned, and unknown versions fail closed.

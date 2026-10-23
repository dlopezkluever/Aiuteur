# #59 World Definition · throwaway prototype

Structural sketch of the ratified model (Record 2 D59, X2, X7–X10; Record 3 spend rules). Not visual design (Record 2 §3.1). Fresh build on the shared kit; no old prototype branch used. Mock data, $0.08 per image is illustrative.

## View it
```
cd prototypes/v2-ux && python3 -m http.server 8059
open http://localhost:8059/59-world/index.html
```
Use the **Prototype controls** panel (top right): state presets (fresh extraction review · identity only · shots planned → needs flag · coverage contact sheet · alternate Look vs separate location · style/reference · coverage wall) and three variant switches. URL params for deep links: `?p=review|identity|shots|sheet|variant|style` `&home=type|story&ws=tabs|scroll&cov=inline|tray&sel=kitchen&tab=coverage&hm=wall&more=1`. Screenshots are in `screens/`.

## Core task
A creator gives each character, location and prop an **Identity** (description + one approved image = base Look), optionally adds Looks, and later, once shots exist, generates the named views the shots call for. Nothing gates, nothing generates by itself.

## Minimum on screen
- Home: one tile per entity (one image, carousel on hover), name, a single quiet readiness line (`Identity ✓ · 4 production views needed · 1 new ●`), "not reviewed / deferred / lightweight" read as states, one Add field, one quiet "Review what Aiuteur found ›".
- Entity workspace: description, attempts with one active approved image, Generate / Upload / Approve; Looks (empty is "a normal state"); Coverage (needs, one generate button with price on it).
- Contact sheet only when drafts exist: **Accept all N** (Undo toast), per-tile Redo / Upload / Skip.
- Spend: price on the button; under 10 generations and $2 it is one click; at 10+ (the "Complete coverage" demo, 12 views, $0.96) an **inline ticket** appears beside the button. No modals anywhere.

## Directions (switchable)
| Axis | A | B |
|---|---|---|
| Home organisation | **By type** (Characters / Locations / Props / Extras). Predictable, familiar from V1 Stage 5. | **By story order** (where it first appears: Sc 1–3, 4–8, later). Shows what the film needs next; harder to find a named entity, type is only a chip. |
| Identity → Looks → Coverage | **Tabs** per entity. Low noise, one thing at a time; the three layers are hidden until clicked. | **Ladder scroll**: one page, three stacked sections under an "Identity ✓ → Looks (optional) → Coverage (from shots)" line. Shows the whole model and state at once; longer page, Looks gets visual weight it should not have. |
| Needs vs opt-in coverage | **One line**: `Generate 4 needed views · est $0.32`; "Generate more views / Complete coverage" is a quiet disclosure beneath. Fastest. | **Needs list**: checklist "Called for by your shots" with the shot that asks for each view, so the creator can untick; opt-in is a separate panel. More control and more legible shot-driven origin; one more block to read. |

Plus, constant across variants: **Tiles | Coverage wall** toggle on the home (a second view over the same data, per-location Generate and Accept all), the extraction review as its own page (Keep / Keep lightweight / Defer / Merge suggestion / type select / Keep all / Add anything), the Looks-vs-separate-location choice sheet with the "time of day comes from the scene" guidance, and a Visual Style page (AI chose · Replace, preset, plain English, reference images).

## Evaluation (speed · clarity · control · interruption · state legibility · recoverability · scale · consistency)
- Type + tabs + one-line: fastest and least interrupting, best for the common case (one image per entity, few Looks). Weaker on seeing why views are needed.
- Story order: best state legibility for "what do my shots need", worst scale (150 entities) and predictability; fine as an optional grouping, not the default.
- Ladder: best at teaching the model, worst at scale and low interruption. Good for first use.
- Needs list: strongest on control and shot-driven legibility; mild cost in speed. Cheap compromise: show the origin shot as a sub-label in the one-line variant (already shown on each tile).
- Recoverability is the same everywhere: every view is a draft Attempt, Accept all and merges have Undo, nothing is deleted.
- Cross-surface consistency: the same readiness line appears on tile, entity header, wall and outline note; the wall and workspace edit the same data.

## Recommendation
**By type + tabs + needs line as default, with the needs list shown only when the creator expands the line**, wall as an optional toggle. Reasons: identity-first is the common path and should feel like picking pictures, not managing coverage; shot-driven need is surfaced as a quiet line plus the origin shot; the proactive path stays one disclosure away; ladder and story-order are not worth a default.

## Unresolved creator choices
1. Does an alternate **Look** have its own identity image (generated from the base identity) before it gets views? Docs say a Look "specializes" identity but never state where its image comes from; prototype leaves the Look image as a stub.
2. Is the `Identity ✓` marker given to lightweight (text-only) entities? Prototype shows "lightweight · text only" instead, to avoid implying an image exists.
3. Should "toward the stove (new)" persist as a flagged mark until the creator generates, or fade after first view of the tile? Prototype keeps it until generated.
4. Tile carousel: should the active approved image be forced first, or may the creator browse attempts there (prototype browses everything)?
5. Is "Mark world as set" worth keeping at all given it gates nothing (prototype keeps it as one quiet line at the bottom of home)?

## Doc contradictions / gaps found
- **Identity readiness for lightweight entities**: `ENTITIES-AND-LOOKS.md` §7 counts a text-only definition as identity-ready; `WORLD-DEFINITION.md` and D59.4 define it by an approved image.
- **10+ threshold wording**: Record 2 X2 says "10+ Takes (per P3)"; Record 3 §2 and `WORLD-DEFINITION.md` §4.2 say "10+ Generations". For views it is Generations; prototype uses that.
- **Alternate Look source image** (above) is undefined in D59, ADR 0003 and ENTITIES §3 beyond "specializes the identity".
- **"Deferred" while shots need it**: ENTITIES §7 says a deferred entity "reads needs a decision" when making frames, but World Definition has no stated place where that reads; prototype shows only "deferred" on the tile.
- **Count mismatch in the worked example**: D59.4 shows "3 production views needed" and a separate "1 new view needed"; unclear whether the new need is counted in the 3. Prototype counts it in the total ("4 needed · 1 new").

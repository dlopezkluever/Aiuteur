# #60 Scene production, CANONICAL product-flow prototype

> **Prototype-level reference for interaction structure and placement only. Authoritative docs outrank it** (Constitution, Creator Ratification Records 1–6, ADRs, GLOSSARY, `docs/ux`, `docs/domain`). Read [docs/product/PROTOTYPE-RECONCILIATION.md](../../../docs/product/PROTOTYPE-RECONCILIATION.md) and apply deltas RD-01 to RD-22 and RD-48 to RD-60 when citing it. Prices, models, ids, flags, fixtures and visuals are mock. Do not implement literally.

This is the **one continuous flow**: global Outline sidebar → **Script Hub** → open scene → **Storyboard** → open Shot → **Scene Prep Shot editor** → **Generate Frames | Takes** → **Review** → Fix this shot / Make another take → back to the same Shot.

## Run
```
cd prototypes/v2-ux && python3 -m http.server 8793
open http://localhost:8793/60-scene-production-canonical/index.html
?scene=7&shot=7B&view=prep|gen|review&mode=frames|takes&role=open|end&ctl=1
```
No parameters opens the Script Hub. `?scene=7` opens that scene's Storyboard; adding `shot=` is a deep link straight to the Shot editor (or Generate/Review at that shot). "⚙ jump to a state" lists hand-built states. State is in memory.

## Reconciliation map (what came from where)
| Piece | Source | Reconciled with |
|---|---|---|
| Global shell: collapsible **Outline** sidebar (Story, World, Scenes with the open scene's shots, Ad-hoc, Removed from Story, Output), top strip | `docs/ux/NAVIGATION.md` §1–2 (Model C), the `v2-59-world` and `v2-58-writing` Outline | Only Script Hub, scenes/shots and Review & Export are live. Story and World rows are inert, shown for orientation (NAVIGATION §2; RD-44) |
| **Script Hub** | `prototype/v2-60-scene-production-v3` `hub.js` (Record 4 §5.2): runtime-width scene ribbon, scene list, large summary panel, key-frame carousel, ending image, **Open scene**, Cards toggle | Copied verbatim and re-skinned only by the shared CSS. "No shots yet" copy (RD-46), ending-image order (RD-47). Draft-all scope controls, Ad-hoc / Removed rows and Peek are not drawn (IO-6) |
| Scene context | v3 ribbon, compact, under the scene header; `← Script Hub`; previous/next scene | Scene navigation never depends only on arrows |
| **Scene Prep** | Prep B Storyboard on entry (Accept plan here only); Prep A horizontal strip + Shot editor; Prep C matrix as a **lens on the strip**; shared asset drawer | `60-scene-production-final` (Record 5 SP). **Change from the failed attempt:** the Cast & Looks matrix has no shot cards or headers of its own. Its columns are exactly as wide as the strip cells and scroll with the one strip; a cell selects that strip Shot and opens the asset in the drawer. Collapsed by default |
| **Generate** | Gen 1 order, Gen 2 canvas + drawer, Gen 3 readiness text; v3 neighbour row, compare pairs, cut editor, Scene frames, CineBlock return | `60-scene-production-final` (Record 5 GN, RL). the Frames-or-Takes toggle drives canvas and drawer; Frames drawer References / Prompts / Scene frames; Takes drawer is one composer panel; dialogue paths per Record 6 V6 / ADR 0025 |
| **Review** | `prototype/v2-62-review` **variant A** (Record 4 W62), re-hosted in the shell | See below |
| Location coverage | Record 6 L6.3–L6.6, ADR 0003 (amended) | One or more **ordered Directions** per shot on the Location card and in the matrix (×n chip). No spatial layout built (LS-1) |

## Review (#62-A), what is kept
Runtime-proportional **scene timeline** with gap slates ("3 takes · none picked · Pick", "No take yet · Generate · $x"), playhead and play-in-context; large viewer + transport (skip gaps, speed); **Scene | Whole film** scope where whole film is a scene-grain ribbon with a playhead (never a per-shot minimap); filter chips dim non-matching scenes and cells; **‹ Unsettled / Unsettled ›** stepping unconditional in both scopes, plus "N unsettled" on demand (no persistent right column, RD-48); **swap = select** (clicking a Take puts it in the cut, Undo restores the other) kept distinct from the optional **Mark final** (edit-through confirm); **Compare** up to 3 replacing the viewer with the timeline still visible, Select per pane; rejected Takes restorable; part-retry; possibly-out-of-date line with *Regenerate / It still fits / Keep as is*; batch "Generate missing · n · $x" with the inline spend ticket. No Frames and no Review-specific side rail.

**The one reconciliation:** "Make another take" opens the same `G.composer` component used by Generate → Takes (RD-50), wide, in place. **Fix this shot ▾** → Open in Generate (lands on Frames at the first unapproved role, otherwise Takes) or Open in Scene Prep, on the exact Shot; **← Back to Review** restores scene, shot, playhead and Scene / Whole film scope (RD-51).

## Later authority incorporated
Records 5 and 6 (V6.2 three dialogue paths, V6.4 batch, L6.3 ordered Directions), ADR 0025, Record 3 stage-entry draft rules, Record 4 W60 §5.2 Script Hub form and Y3 scene-grain whole film, RD-48/49/50/51/52/54.

## Known prototype-level omissions (docs control, see IO-1 to IO-13)
Fit and Package inspector; job lifecycle; persistence; Draft-all scope controls, Ad-hoc and Removed from Story rows, Peek, Cmd-K; World Definition Voice area and voice design; consent revocation UI; real review-all tray; matrix scrolling beyond ~12 Shots and compact asset cards. Split cuts at the sentence midpoint and the two-speaker revoice rule are simplifications (RD-12, RD-13). Frame art is schematic. Timeline cells truncate labels at narrow widths.

## Genuine unresolved contradictions in authority
None found. Record 5 GN3/GN5 (video prompt open) over Record 4 §5.4.6 is already settled by FINAL-AUDIT-79; Constitution §13.4(3) wording and the "Voice-path naming" tidy items stay as listed in the reconciliation document §7.

`screens/` holds the captures taken from the live prototype at 1440×900.

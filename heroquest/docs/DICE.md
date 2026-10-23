# Animated dice and stairway movement

## Current sidebar rolls

One lazy 3D tray in ui/dice.js presents movement, attacks/defence, spell resistance
and healing potions. Roll movement is the manual trigger; it saves the outcome
and starts the inline animation directly. There is no movement modal or extra
Roll click. After settling, input returns automatically and the result remains
in the sidebar. Attack, hero defence and hero resistance wait for a manual Roll.
Only an uncommitted attack prompt can Cancel without spending dice/action.

CPU rolls use a disabled dark-red Zargon's roll button and invoke the callback
directly after a short pause. They begin only after the Zargon portrait/Continue
handoff. CPU Pause, hidden-tab and modal guards suspend advancement. Settled
stages advance through the pacing scheduler; there is no additional Continue
for each die roll. Zero-skull attacks skip defence.

session/presentation.js hides unrevealed Body/log changes until their dice finish.
The final stage persists dice=null before shove/recoil/health feedback. Original
red/white pips and sculpt-derived skull/shield images share ui/die-faces.js;
participants use cached miniature portraits. See COMBAT.md and SAVES.md.

Movement dice use a blank convex hull of the supplied combat die, preserving its
rounded silhouette with a red body, white pip geometry and traditional opposite
faces summing to seven. Combat dice use the supplied `Dice/HQdice.STL`
browser derivative, with ivory body and ink on the recessed symbols. Six
orthographic authoring views established the mesh's face mapping:

| Local face normal | Result | Symbol up |
| --- | --- | --- |
| +X | Skull | +Y |
| −X | White shield | +Y |
| +Y | Skull | −Z |
| −Y | White shield | +Z |
| +Z | Skull | +Y |
| −Z | Black shield | −Y |

`scripts/prepare_combat_die.py` produces `assets/models/combat-die-paint.js`.
Its geometry fingerprint/count guard prevents using labels with the wrong mesh.
The legacy imported die gained a fingerprint without changing geometry. Shapes,
decoded meshes, materials and pip geometry are cached/shared rather than parsed
from STL during play. The tray creates its renderer lazily and renders only on
changes or while animating. No physics or external runtime assets are used.

The seeded engine alone determines results. Animation uses scripted spins/hops
and a quaternion mapping the recorded symbol/number onto the upward face; no
collision, frame rate, click timing or mesh orientation decides the outcome.
One engine combat command still atomically resolves attack, conditional defence
and damage. The sidebar stages reveal those already-recorded rolls. A hero's Roll
button reveals the saved defence rather than resolving the attack a second time.
Pending `dice: { reportId, stage: "attack" | "defence", rolled }` in the save
envelope preserves that presentation sequence. Older saves omit it and show their
existing report summary. A refresh shows a committed roll settled, with no reroll;
an unrolled hero stage still waits, and an unrolled CPU stage starts automatically.

Reduced motion, background tabs and context loss finish presentation immediately.
If 3D is unavailable, recorded results and progression remain usable as text.

## Stairway adaptation requested by Mark

The 2×2 stairs contain four individual squares. Reach, melee, spell sight,
occupancy and CPU approaches use each miniature's actual square; a monster near
one edge cannot attack a hero in the opposite corner merely because both are
near the stairs. Clicking the stair artwork picks an individual square, with
Move here and Leave dungeon actions; its internal grid can be shown.

Steps between stair squares cost zero, while entering/leaving costs one. Every
step, including a free internal step, requires a movement roll with at least one
point remaining. Spending the last point to enter permits no further free steps.
Internal free steps do not consume a pending movement buff or set paid movement's
started flag. The printed stair-square sharing exception remains per square.
This 22 October correction supersedes the earlier one-large-shared-space model.

The original North American rulebook, printed pp12–13 (source
`system-instruction-booklet`, PDF p12 rotated 180°), permits sharing a stair square
but does not state this free-movement rule. Mark requested the movement discount and later clarified the four-square reach
and positive-remaining-movement requirement. This is a documented adaptation,
not a transcription of a printed rule.

## Approved focused verification — 2026-10-21

Eight ephemeral engine/save checks passed: free pre-roll anchors, zero-cost/RNG
preservation inside stairs, one-cost exit, shared-footprint adjacency/occupancy,
CPU attack-stage restoration, manual/revealed defence-stage restoration,
compatibility with v1 saves lacking dice stages, and CPU activation/round wrap.

One Chrome localhost pass used a solo Barbarian and normal UI movement to the
first Orc room. Red dice settled on the displayed pips (2 + 5), and refresh kept
that exact roll. Crossing from the stairs to the first door spent three spaces.
The first Orc moved three squares and auto-rolled; the Barbarian's defence waited
for Roll and remained waiting after refresh. A subsequent hero attack waited for
Roll, and the Orc's defence auto-rolled; refreshing its result kept the same
symbols. All three combat symbols were visibly matched to their upward faces.
No console errors/warnings were captured. A duplicate dialog-description ID found
in the visual pass was corrected and the affected flow rechecked.

This was not a broad regression, mobile, reduced-motion or direct-file pass.
Screenshots are local ignored authoring evidence under `tmp/dice-*-chrome.png`.

## Current assets and review limits

Numbered dice use assets/models/movement-die-body.js: a 2,366-triangle convex
outer hull of the combat sculpt. prepare_movement_die.py uses numpy and the
MIT-licensed QuickHull helper from the local Three 0.186.1 archive offline.
Source STL/geometry hashes remain with the asset. Decoded hulls and sampled pip
positions are cached; geometry/animation never determine the engine outcome.

The latest sidebar layout, automatic stage pacing, potion stages, disabled CPU
button, original face icons and health feedback have source/diff review only.
A minimal 22 October stair diagnostic confirmed back-corner adjacency false,
front-square adjacency true, internal routes with one move and none with zero
moves or before rolling. The historical approved pass above used an older shared
stair-space version; it does not certify the current four-cell reach behaviour.
No new tests, builds, browser automation, screenshots or benchmarks ran during
this cleanup. Mark retains manual verification.

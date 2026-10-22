# Animated dice and stairway movement

## Dice tray

Movement, attacks and defence use the same native modal and Three.js tray in
`src/ui/dice.js`. Clicking Roll movement opens the tray and starts the roll
automatically. Once settled, its recorded result stays open until Continue is
pressed. Refresh shows the same saved movement result without rerolling. There
is no auto-close timer.

Attacks/hero defence still wait for Roll; CPU stages roll automatically after a
short pause. Continue advances to defence when needed, then the combat summary.
Zero skulls skip defence. Only an uncommitted attack prompt can be cancelled;
committed rolls cannot be dismissed with Escape. No automatic timer decides RNG.

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
and damage. The modal stages reveal those already-recorded rolls. A hero's Roll
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

## Later UI polish — source review only

`src/ui/die-faces.js` shares red/white pip faces in the sidebar and sculpt-derived
skull/shield icons across the roll result and combat summary. PNG symbols are
prepared offline by `scripts/prepare_die_icons.py` from guarded supplied geometry
and paint labels, rather than approximated SVG symbols. The 3D meshes and outcome
mapping are unchanged. Accessible names identify every face.

The dice dialog uses a compact heading/portrait header and a shared result/action
footer. Movement hides the duplicate portrait name/role because the heading
already identifies the hero. The tray size and hidden result space stay reserved
across ready/rolling/settled stages, including 3D fallback. Mobile footers place
the reserved result above the buttons; short windows scroll normally. Redundant “recorded”/button instruction
text was removed. This later UI revision has not received a browser check; the
approved check above describes the earlier version.

The model-viewer addition shares `src/view/dice-models.js` between tray and viewer.
The later movement-die revision replaces its generated cube with
`assets/models/movement-die-body.js`: a 2,366-triangle convex outer hull of the
combat sculpt, filling the recessed symbols while retaining its rounded shape.
`scripts/prepare_movement_die.py` prepares it offline using numpy and Three's
MIT-licensed QuickHull helper from the locally archived 0.186.1 npm package.
Run it with `--node /path/to/node` when Node is outside PATH; the archive is
`tmp/three-0.186.1.tgz`. The source STL/geometry hashes are retained in the asset.
The runtime caches the decoded hull and samples pip surface positions once with
raycasts. Face values/orientation, animation and engine outcomes are unchanged.
This revision has source/diff and offline asset preparation only; no new
dice/browser checks were run. The approved checks above predate this geometry.

Roll dialogs now include cached portraits from the actual miniature factories: the moving hero or both combatants with Attack/Defence labels. Portrait dimensions reserve space before their images arrive and remain constant across roll stages. This presentation adds no RNG/state/save fields. Source review only for this addition.

## Click reduction and stair correction — 22 October 2026

Source/diff review only for automatic movement rolling and the later removal of
automatic advancement. No new UI/timer or
refresh pass was run. A minimal stair diagnostic reproduced the reported reach
case: back-corner adjacency false, front-square adjacency true; internal routes
exist with one point and no routes exist with zero points or before rolling.
Historical checks above cover the superseded shared-space version, not this one.

Latest compact tray layout and shared red/black Body hearts: source/diff review
only; no new browser or game checks were run.

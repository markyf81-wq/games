# Animated dice and shared stairway

## Dice tray

Movement, attacks and defence use the same native modal and Three.js tray in
`src/ui/dice.js`. The player presses **Roll**; CPU attack/defence rolls activate
that same button automatically after a short pause. Continue advances to defence
when needed, then the existing combat summary. Zero skulls skip the defence roll.
Movement/attack prompts can be cancelled before rolling without consuming RNG,
movement or an action. Committed rolls cannot be dismissed with Escape.

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

The whole 2×2 stair tile is one larger shared logical space. Grid coordinates
inside it are rendering/route anchors, not four chargeable spaces. Movement
between anchors costs zero; crossing either boundary costs one. Leaving from any
edge therefore costs one regardless of which anchor holds the miniature. Internal
repositioning is possible before rolling or at zero remaining movement and does
not set paid movement's `started` flag. An attack after paid movement still closes
movement as usual. Routes minimize movement cost, then traversed steps; zero-cost
cycles cannot enlarge the movement budget.

Sight and melee adjacency consider the shared footprint. CPU approach choices
consider its perimeter, and a hero anywhere on the stairs blocks monsters from
entering that occupied logical space. The stair model/underlying tiles open one
context panel; heroes already there see an explanation rather than an action to
move to another anchor. Entering prefers a free rendering anchor when possible.
Internal grid lines are removed and the reachable highlight covers the full tile.

The original North American rulebook, printed pp12–13 (source
`system-instruction-booklet`, PDF p12 rotated 180°), permits sharing a stair square
but does not state this free-movement rule. Mark explicitly requested the shared
space after that distinction was explained. This is a documented adaptation,
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

The dice dialog reserves header, description, result and action heights throughout
ready/rolling/settled stages, including 3D fallback. A hidden result retains its
layout space. Short windows scroll normally. Redundant “recorded”/button instruction
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

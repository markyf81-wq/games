# Browser autosave

The current adventure automatically resumes when the same game address is reopened
in the same browser. One save slot uses `localStorage` key `heroquest.session.v1`.
Starting a new adventure replaces it when setup is submitted; merely opening setup
keeps the existing save. Clearing this browser’s site data removes the save. There
is no cloud sync, manual export/import or separate campaign-slot UI.

## Format and ownership

`src/session/storage.js` owns storage access and load validation. Its JSON envelope
has `version: 1`, `savedAt` (ISO timestamp), `state`, `screen`, `dice` and `view`. Engine state
retains schema version 2 and content version `the-trial-combat-v1`. This is the
first persisted format; unsupported versions are rejected rather than guessed or
silently reset. Future state/content changes need explicit migrations or an
incompatibility notice. Do not reuse another game’s storage keys.

The complete authoritative state is stored: selected heroes/owners, positions,
Body Points, movement roll/budget/order flags, action usage, round/turn/phase,
opened doors, discoveries, monster memory, seeded RNG state, event/combat counters,
log, last report, pending decision and CPU queue/cursor. No DOM, Three.js objects,
callbacks, timers or animation frames are stored.

`screen` is null, `briefing` or `movement`; the latter two restore introductory or
movement-result dialogs without generating another roll. Combat reports, monster
introductions, handoffs and defeat are restored directly from engine state.
An unconfirmed attack stays unspent and returns to the board after refresh.
Temporary menus, context panels and unfinished new-game setup are not restored.

The additive `dice` field is null or `{reportId, stage, rolled}`, where stage is
`attack` or `defence`. It tracks the shared 3D tray independently of the atomic
engine combat outcome. Unrolled hero stages wait for Roll; CPU stages auto-roll.
Committed stages restore settled, without consuming RNG or damage again. Existing
version-1 envelopes without `dice` load with null and show their recorded summary.
See DICE.md for the complete presentation flow.

The renderer’s plain-data `view` snapshot contains camera yaw/elevation/zoom/target,
follow mode, grid preference, wall mode and actor facing angles. Restoring it rebuilds the
scene from the engine projection, with bounded numeric camera values. Sight mode
belongs to engine settings. Camera changes are captured on page hide/visibility
loss and the next game action; grid/wall-mode changes save immediately.

`view.torchLightingEnabled` additionally stores the Dynamic lighting preference;
its main-view On/Off button saves immediately. On means gloomy torch lighting with faint global illumination;
off means full tabletop lighting. Older snapshots omit it and use the enabled
default. Flicker phase, lights, meshes and shadow maps are never persisted. This
additive preference has source review only; the prior dice refresh pass did not
verify it.

`view.ambientLightLevel` optionally stores the Background light slider percentage,
clamped to an integer from 0 to 100. Missing values default to 26. It updates the
view live and saves on slider change/release (also on page hide or a game action).
The setting is shown only when dynamic lighting is enabled; disabling lighting
retains the percentage for the next enable. Particle phases are cosmetic and
are not saved. This addition has source review only, with no new refresh check.

Torch positions are generated deterministically from static quest/board layout,
not saved or drawn from gameplay RNG. Reloading or replaying the same quest
recreates the same mounts; discovery filters when each appears. Updating the
placement algorithm can reposition decorative torches in existing saves without
changing their engine data.

`view.wallMode` optionally stores `full`, `cutaway` or `low`. The main-view button
saves changes immediately. Missing/invalid values default to automatic cutaway;
old `wallsEnabled: false` snapshots map to low walls. Wall meshes/clip planes,
heights, animation and route previews are not persisted. See WALLS.md; this later
preference has source review only.

The retired wall-pack comparison's `view.wallStyle` field is ignored if present
and no longer saved. All saves use original tall walls; decorative variation is
regenerated deterministically from the quest and wall coordinates. No engine or
envelope schema change is needed. The removal has source review only.

## Timing and recovery

The controller writes after every accepted command, before animations/results.
Refreshing during a hop restores the resolved destination. Refreshing during a
combat result restores the same dice, damage and pending report: it cannot apply
the attack twice. Presentation completion does not rerun engine commands.

The short interval between ACK_REPORT and the next RESOLVE_MONSTER may be stored
as a monster phase with no pending decision. Startup resolves the next queued
activation once, immediately saving that outcome before presentation. A stored
report is always reviewed first, preserving the cursor and consumed RNG.

Load validation checks versions, known/unique actor IDs, coordinates, starting
stats/Body ranges, movement data, discovery IDs, reports, queue/cursor, phase and
pending-decision compatibility. An unreadable/incompatible save stays untouched
and setup displays an explanation; it is replaced only by starting a new game.
Storage failures do not interrupt play: the footer reports that progress cannot
be saved instead of claiming autosave succeeded.

## Verification

On 2026-10-21 Mark approved eight focused engine/save checks and one Chrome
localhost path, recorded in DICE.md. These passed, including exact movement-result
restoration, an unrolled hero defence prompt and a revealed CPU defence result.
The engine checks preserved full state/RNG/queue through save round trips and
loaded legacy v1 envelopes lacking dice-stage data. This was not a broad save
regression: mid-hop refresh, storage failures/corruption, every view setting and
new-game replacement still have source review rather than separate browser checks.

Combat lunge/removal effects are transient view data, not new save fields. CPU outcomes remain saved before movement/lunge; a restored pending report can display its defeated figure until acknowledgement without replaying attacks. ACK_REPORT saves before the visual removal; reload during its fade restores the acknowledged state with the piece removed and the recorded queue position. Hero pre-roll lunges do not commit an attack. Facing is retained in the existing view snapshot. Source review only for these new presentation paths; no new save checks.

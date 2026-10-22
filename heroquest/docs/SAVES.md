# Browser saves — current format

The current save uses `heroquest.session.v1`, envelope version 1, engine schema 5 and content ID `the-trial-combat-v1`. Schemas 2/3/4 are explicitly migrated, not discarded. The historical approved checks below describe their original versions and do not validate the new migration.

## Schema 5 — remaining effects and interrupted wake/travel

Adds hero pending Courage/Swift Wind/Veil/Pass Through Rock and trapped status,
monster Sleep, active movement magic and the CPU wake `resumeId`. Four movement
dice and the Genie door/Sleep/stone reports are validated. An active phasing hero may be saved inside an object or outside the board
with positive rolled movement remaining and no pending result; trapped heroes
remain valid when dead. Ordinary live actors still require traversable floor. An awake monster can
resume the already consumed activation after a saved report or ACK_REPORT gap.
Schema 4 retains books, spent cards, existing effects and recorded dice/RNG;
new flags are inactive, with no replenishment. See SPELLS.md for exact semantics.
Current migration verification is pending; older evidence below is historical.

## Schema 4 — spellbooks and effects

Hero spell groups, consumed spell IDs and Rock Skin, and monster Tempest are
validated/persisted. Spell and skipped-monster reports are supported; fire
resistance uses the recorded `spell` dice stage. Schema 2/3 migrations add empty
books and inactive effects without granting cards midway through a quest.
RNG, reports and progress are preserved. See SPELLS.md for allocation, restart
behaviour and the 15 approved focused checks plus scoped Chrome coverage.
The older verification sections below remain historical.

## Schema 3 and compatibility

Every selected hero has `exit: null | "completed" | "retreated"`. The session can also end in `victory` or `retreat`, alongside `defeat`. Objective completion derives from the recorded Verag instance; no extra trigger or RNG field is needed. Exited heroes remain positive-Body records but must be on the stairway and leave occupancy/sight/turn order. Validation checks terminal-phase consistency, exit values and completion eligibility. Unknown formats are rejected/preserved.

Validated schema 2 saves migrate in memory to schema 3 by adding `exit: null` to each hero. Positions, health, discoveries, queue/cursor, RNG, reports, dice presentation stages, screen and view preferences are retained. Loading does not itself overwrite the stored slot; normal persistence writes the upgraded state on the next save. No actor is marked escaped just because their old position was on the stairs.

The gameplay-independent cleanup adds no saved fields. Rendering dependencies, reflection textures, animation promises, geometry and DOM nodes remain transient. See QUESTS.md for exits and CODE-STRUCTURE.md for ownership.

## Current verification — 2026-10-22

With Mark's approval, the focused diagnostic passed schema 3 terminal round trips, schema 2 migration with pending defence dice/RNG preserved, and rejection/preservation of inconsistent exits or unknown formats. Loading migrated data left the original stored text unchanged. The isolated Chrome pass restored an acknowledged hero combat state and a terminal retreat screen after refresh; it also covered same-party restart. Legacy migration and victory/mixed-party endings were engine/save checks, not browser playthroughs. See QUESTS.md for all 17 checks and browser limits.

## Historical format and evidence

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
be saved. Successful autosaves have no footer message.

## Verification

On 2026-10-21 Mark approved eight focused engine/save checks and one Chrome
localhost path, recorded in DICE.md. These passed, including exact movement-result
restoration, an unrolled hero defence prompt and a revealed CPU defence result.
The engine checks preserved full state/RNG/queue through save round trips and
loaded legacy v1 envelopes lacking dice-stage data. This was not a broad save
regression: mid-hop refresh, storage failures/corruption, every view setting and
new-game replacement still have source review rather than separate browser checks.

Combat camera/removal effects are transient view data, not new save fields. CPU outcomes remain saved before movement/camera travel; a restored pending report can display its defeated figure until acknowledgement without replaying an attack or camera approach. ACK_REPORT saves before the return/fade; reload restores the acknowledged state with the piece removed and recorded queue position. Hero pre-roll camera travel does not commit an attack. Facing remains in the existing view snapshot, while camera snapshots always describe the ordinary board view, even during first person. Hidden/context loss returns to the board immediately. Source review only for the first-person revision; no new save checks.

Gameplay sandbox uses the same validator/schema under the isolated key
heroquest.sandbox.v1, selected only by index.html?sandbox=1. Fixture resets are
explicit and never read/write the adventure slot. Camera snapshots retain desired
stable framing, not transient damping/arrival state. No new save fields.

Spell-particle presentation and component cleanup (2026-10-22) add no save fields
or schema change. CAST_SPELL persists its already-resolved report/dice stage before
camera framing or particles. Reload skips the cosmetic effect and resumes the
recorded dice/outcome; no damage, card use or RNG is repeated. Particle buffers,
control locks, camera springs/arrival promises, terrain/layout keys and portrait
caches are transient. The existing stable camera goals remain the view snapshot.
Source review only for this revision; no new save/browser checks were run.

# Browser saves and file transfer

## Current format and ownership

Adventure uses localStorage key heroquest.session.v1; Gameplay sandbox uses
heroquest.sandbox.v1 only when index.html?sandbox=1. Envelope version 1, state
schema 8, content ID the-trial-combat-v1. Other games and the model painter have
independent keys. New adventure/restart replaces only its own game slot after
confirmation. Opening setup alone does not discard a save.

session/storage.js validates/migrates serialized data. session/app.js owns when
to save and resume. The envelope contains version, ISO savedAt, authoritative
state, screen, dice and a plain view snapshot. Save each accepted command before
animations/results. There are no DOM nodes, meshes, functions or timers in it.

State retains selected heroes/owners/positions/stats/Body, exits, personal gold
and unique item records, spellbooks/spent cards/effects, recorded movement and
order flags, turn/phase/round, doors/discovery/monster memory, RNG/counters/log,
lastReport/lastItemUse, pending decisions and CPU queue/cursor/resumeId. Treasure
retains all 24 physical card instances across deck/removed, per-hero room searches,
quest claims and wanderer IDs. Giving moves an existing potion record between
inventories; it adds no saved transfer/picker field and no RNG draw.

## Presentation stages

screen is null, briefing or movement. dice is null or {reportId, stage, rolled},
with attack, defence, spell, trap or item stages tied to the corresponding saved record.
Restore committed rolls settled; unrolled human stages still wait for Roll.
Trap stages also store part, the saved die-group index.
CPU stages auto-roll through modal/pause guards. Never reroll or apply damage on
load. An uncommitted attack prompt is not a spent action and is not saved.

The monster-intro pending record reopens Zargon's portrait/Continue handoff.
Already-started CPU queues resume through the single pacing scheduler. Sleep
wake resumes its already-consumed monster activation via resumeId. Report
acknowledgement saves before removal/next activation. Hero handoffs and outcomes
restore from engine state; setup/menu/context/card gestures do not persist.

The final dice stage is cleared and persisted before health-number/recoil
presentation. Fresh Treasure health queues and arrow/pit effects are transient.
Reload shows the saved Treasure face and waits for Continue again, then continues
the recorded report without replaying the hazard animation. Spell projectiles,
status buffers, camera springs/lens blends, floor holes, render caches, control
locks and damage-number textures never enter the save.

view holds bounded ordinary camera yaw/elevation/halfHeight/target, follow/grid,
Full/Automatic/Low wall mode, lighting toggle/ambient percentage, POV toggle and
cached actor facing. cinematicCameraEnabled defaults true; restoring also accepts
the older firstPersonEnabled field. Lighting phase/particle positions/shadows are
rebuilt. Camera changes save on hide/page exit or the next game action; explicit
view settings save immediately. The retired engine settings.realisticLOS boolean
remains accepted for schema compatibility. Loading normalizes it to false and
refreshes remembered positions for discovered living monsters; all revealed
miniatures now remain visible. The LOS removal alone requires no schema bump.

## Validation and migrations

Validate actor IDs/coordinates/canonical stats/Body, inventories and global unique
item IDs, spell membership/effects, dice arithmetic/stages, movement, discoveries,
reports/recovery, queue/cursor and phase/pending consistency. Treasure items must
match removed physical-card IDs; consumptions cannot leave the same item carried.
Wanderers have bounded unique IDs and the quest's canonical monster type.

- Schema 2 to 3: add null exits; retain existing positions, RNG, pending rolls.
- Pre-spell schemas 2/3 to 4: empty spellbooks and inactive effects; never grant
  new cards midway through an existing adventure.
- Schema 4 to 5: remaining spell flags, Sleep/active movement magic and trapped
  status. Guard legacy phasing/trapped states rather than silently moving actors.
- Schema 5 to 6: original already-equipped weapon, zero gold and no potion loot;
  add lastItemUse and validate independent healing/recovery rolls.
- Schema 6 to 7: fresh physical Treasure deck/search ledger and inactive potion
  buffs, preserving existing possessions/progress/RNG. No shuffle occurs on load.
- Schema 7 to 8: empty Trial dungeon layout/trap records. Preserve the existing
  adventure, RNG, deck and pending reports; do not insert practice traps.
  Schema-8 trap reports, grouped dice, pit searches, Tool Kits and secret doors
  are validated; practice layouts are sandbox-only. See TRAPS.md.

Additive diedInPlay defaults false for old monster records. A validated recorded
killing report can recover its casualty's provenance; zero Body alone cannot.
Optional view fields retain defaults. Unsupported/corrupt saves stay untouched;
setup explains failure and requires explicit replacement. Storage failures report
an error in the footer while play continues. Successful autosaves show no message.

## Export and import

Menu Export save downloads a local JSON wrapper: format heroquest-save, version
1, slot adventure or sandbox, and the existing envelope in snapshot. Export
validates a detached snapshot of live state/dice/view, not an older stored slot.
No upload/account/cloud sync occurs. Import exists in Menu and initial setup.

Reject files above 2 MiB, malformed JSON, unknown wrapper versions, cross-slot
files or snapshots failing the same validator/migrations. Preview party, round
and phase, then require explicit replacement. Write the confirmed destination
slot before reloading and suppress outgoing autosaves/commands so page exit
cannot overwrite the import with the previous game. Cancel/invalid input/write
failure preserve the current game. Keys/envelope/schema remain unchanged.

## Historical evidence and current limits

21 October: eight approved focused engine/save checks and a Chrome localhost
path preserved state/RNG/queue, legacy v1 envelopes without dice metadata,
movement results, an unrolled hero defence and a revealed CPU defence. See
DICE.md for its exact scope and the superseded stair-space assumptions.

22 October: approved schema-3 terminal round trips, schema-2 pending-defence/RNG
migration and corrupt-exit rejection passed; Chrome restored an acknowledged
combat state and retreat screen. The first six-spell pass covered schema-4 stages
and older migrations; see QUESTS.md and SPELLS.md. These historical checks do not
validate later schemas/features.

Schema 7, file transfer, potion sharing, statuses/hazards and the latest cleanup
have source/diff review only. No new engine/save/browser tests, builds, lint or
performance checks were run. Mark retains manual verification.

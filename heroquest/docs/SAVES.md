# Browser saves and file transfer

## Current format and ownership

Adventure uses localStorage key heroquest.session.v1; Gameplay sandbox uses
heroquest.sandbox.v1 only when index.html?sandbox=1. Envelope version 1, state
schema 15, content ID the-trial-combat-v1. Other games and the model painter have
independent keys. New adventure/restart replaces only its own game slot after
confirmation. Opening setup alone does not discard a save.

session/save-validation.js validates/migrates serialized data in dependency order;
session/save-reports.js checks recorded outcomes using its shared primitive
checks. session/storage.js handles localStorage, slot/envelope ownership and
file wrappers. session/app.js owns when
to save and resume. The envelope contains version, ISO savedAt, authoritative
state, screen, dice and a plain view snapshot. Save each accepted command before
animations/results. There are no DOM nodes, meshes, functions or timers in it.

State retains selected heroes/owners/positions/stats/Body, exits, personal gold
and unique item records, spellbooks/spent cards/effects, recorded movement and
order flags, turn/phase/round, doors/discovery/monster memory, RNG/counters/log,
lastReport/lastItemUse, pending decisions and CPU queue/cursor/resumeId. Treasure
retains all 24 physical card instances across deck/removed, per-hero room searches,
quest claims and wanderer IDs. Giving moves an existing item record between
inventories; it adds no saved transfer/picker field and no RNG draw.

## Presentation stages

Schema 14 adds settings.fairLootRecovery (false for new and migrated saves).
Only future deaths follow a changed setting. SET_RULES is blocked during pending
results and after quest completion. Schema 13 introduced sealed bags with original owner/item IDs/gold/equipped slots
and null-or-hero carrierId. Carrier contents never enter usable inventory.
A pending unresolved carrier death may still hold bags; ACK_REPORT drops them
again. Validate ownership, equipment compatibility, carrier lifecycle and global
item uniqueness/provenance across bags and ordinary inventory.

The null-or-array questRecovery ledger records successful end-of-quest revival
and restored item/gold counts/carrier. Settlement follows final report ACK,
returns gear only from completed-exit carriers, removes all bags and persists
revived full-health sealed-bag owners once. Standard deaths have no revival record. Their deathResolved flag keeps them out of the
finished board. Unrecovered possessions are removed, never replaced with free
starting gear. See RECOVERY.md for Mark's explicit digital rule.

Schema 12 introduced hero.actionUsed (last own-turn action), deathResolved and
original item/gold ground bundles. Emergency own spell rescue retains the lethal
report/CPU cursor and records spent spell plus recovery.spellReportId, mutually
exclusive with potion itemUseId. Schemas 2–11 preserve conservative historical
action migration and do not reconstruct loot from already removed deaths.
Schema-12 ground bags acquire null carrier/equipment slots; old transfers/losses
are retained, not retroactively duplicated or confiscated. Existing sealed bags retain their fair-recovery behaviour regardless of the new
setting; historical standard deaths are never revived retroactively. Keys/envelope/content stay unchanged. Current
writes normalize to schema 15; RNG, pending rolls and search histories survive.

Schema 11 allows a null equipped weapon slot after throwing the last equipped
Dagger, mirrored as hero.weapon: unarmed. Unarmed is a combat fallback, never
an inventory item or shop entry. Every non-null slot still requires an owned,
compatible item. Reports may record thrownItemId only for a physical hero Dagger
attack, and that unique ID must be absent from all inventories. Older reports
need neither weaponId nor thrownItemId. Schemas 2–10 normalize to 11 without
granting gear, resetting schema-10 search histories or changing RNG/outcomes.
Committed throws remove one copy before persistence; refresh cannot consume
another or replay the projectile. Uncommitted prompts remain unsaved/cancellable.

Schema 10 adds dungeon.searched `{traps: [], doors: []}` shared by the party.
Each list contains room IDs, pit IDs (`pit:<trap-id>`) or searched corridor cell
keys. Validation requires unique entries from the current quest/layout's allowed
areas. Schemas 2–9 migrate with empty search histories: older saves did not record
enough information to reconstruct previous searches reliably. Existing discovered
traps/doors, treasure ledgers, RNG and pending results remain intact. Source/diff
review only; no save/browser checks were run for this change.

Schema 9 stores inventory.equipped `{weapon, armour, head, shield}` as owned item
IDs, originally with null allowed in all slots except weapon; schema 11 extends
null to the weaponless fallback. hero.weapon/armour mirror their
equipped item kinds. Base attack/defend remain the original values; gear bonuses
are derived. Validate slot ownership, allowed kinds, Wizard restrictions and
two-handed weapon/Shield incompatibility. Schemas 2–8 gain references only to
their already-owned starting weapon; no loot is granted and pending outcomes,
RNG and inventory IDs are preserved. Equipped gear is supported in either save slot;
practice loadout creation remains sandbox-only.
Staff/Longsword use the existing owned-item/weapon fields; Staff's no-Shield and
Wizard eligibility use the same validators. No additional migration is needed
for their diagonal reach or the cosmetic defence-block cue.

movement.swiftWind is a saved boolean. Older snapshots infer it from four dice.
New rolls use one/two normal dice according to armour, doubled for Swift Wind.
Body armour cannot change after a movement roll. A Swift Wind report may contain
one/two extra dice; combat report bounds allow 8 attack and 9 defence dice for the
supported gear plus existing buffs. This schema received source/diff review only,
not engine/save/browser verification.

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

Optional view.sightOverlayEnabled stores only the new whole-tile floor sight
guide toggle, default false for older snapshots. Starting any gameplay action
turns it off and saves that view state before resolution/presentation. Cancellation
or completion never re-enables it. Instance matrices and cached sight results are
transient. It does not restore the retired realisticLOS display mode or change
targeting. No schema/key change is needed.

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
- Schema 8 to 9: reference already-owned starting equipment without granting loot.
- Schema 9 to 10: initialize party trap/secret-door search histories as above.
- Schema 10 to 11: retain all fields and search histories; accept the weaponless
  slot/mirror and optional consumed Dagger report identity described above.
- Schema 11 to 12: per-hero action/death bookkeeping and an empty belongings
  ledger; preserve pending recovery, with conservative historical action flags.
- Schema 14 to 15: same stored fields; questRecovery return counts are historical
  after Armoury trades. Continue to validate current item identity/slots separately.
- Schema 13 to 14: fair-recovery setting defaults false; retain existing bags and
  revival records. Mixed standard/fair deaths allow a partial questRecovery ledger.
- Schema 12 to 13: sealed-bag carrier/equipment snapshots and questRecovery
  ledger; old ground gear stays unique, prior inheritance/loss is not undone.

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

Crossbow uses the existing owned-item/equipped-weapon structure. Physical hero
combat reports may record optional `weaponId`; validate it against the weapon
catalogue, with a hero attacker and no Genie spell. Missing values remain valid
for older reports. The recorded ID chooses the ranged visual after dice reveal;
refresh restores the report without replaying the bolt. The subsequent Dagger
slice advances the state to schema 11; keys/envelope/content ID stay unchanged.

The 24 October cleanup extracted these validators without changing schema 13,
validation order, old migrations, file limits or error handling. Current source
review only; no new save/engine/browser checks were run.

Camera snapshots optionally store overheadReturn (yaw, elevation, zoom, target
and follow), so top-view toggle restores the previous framing after refresh.
Legacy top views receive a conventional return angle with their saved focus/zoom.

Armoury trades update existing personal inventories/gold via engine commands, with
armoury-<event-id> purchased instances. No shop stock ledger or presentation replay.
Optional view.fullBoardEnabled restores the printed-board backdrop, default off.
Neither feature resets pending stages or RNG. Source/diff review only.


## Schema 16: campaign and quest context

Content may be `the-trial-combat-v1` or `rescue-sir-ragnar-v1`. Resolve the saved
quest and its cached topology before checking placements, doors, searches,
reports or objective completion; importing another map must not mutate the live
renderer/rule context. Sandbox files remain Quest 1 only.

`campaign` stores completed quest IDs, attempt, per-hero replacement generations,
settlement guard and the entry roster/loadout. `questState` is empty for The Trial
and contains alarm/escort for Quest 2. Validate the escort independently of the
1–4 actual heroes; it participates in combat reports and occupancy but not hero
inventories/death recovery. Pending escort stores manual die, readiness and
remaining moves. New command results save before presentation; refresh keeps
these exact values. The fixed quest healing potion also has validated use/find
records independent of physical Treasure cards.

Schemas 2–15 migrate without changing in-quest RNG, pending results, spent spells,
loot or discovery. Entry loadouts can only use the roster available at migration.
Finished legacy saves settle recovery once. Each new attempt creates a fresh
Treasure deck and rekeys carried holdings/equipment refs, preventing duplicate
physical-card/starting-gear identities. Accepted transition saves replace the slot
before reload and suppress outgoing autosaves; storage failure leaves the old
session live. See CAMPAIGN.md. Source/diff review only; no new automated checks.

Completed-party spell report validation permits cards restored by settled rest,
while retaining the spent-card requirement for every in-quest/pending report.


Pass Through Rock adds movement.rockTrail without changing schema 16. Older
saves normalize the absent field to []; no prior casualty is revived. Nonempty
trails contain at most 64 canonical adjacent cell keys, end at the active hero,
and require rolled positive remaining phasing movement. Furniture/unit endings
return along that recorded route and close movement; the motion is saved before
animation. Trail-less legacy phasing positions fall back to the nearest revealed
legal square. Closed/finished movement and fresh turns clear the trail. A dodged,
non-ending floor-trap report can preserve a positive-movement phasing position.
Source/diff review only; no new automated/browser checks.

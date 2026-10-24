# The Trial: objective, exits and outcomes

## Reviewed original sources

- `system-quest-book`, PDF page 5, Quest 1 parchment: seek and destroy Verag. Visual review on 2026-10-22 confirms this is the Gargoyle named in the briefing. The existing map instance is `monster-21`.
- `system-instruction-booklet`, PDF page 2, rotated 180 degrees, printed page 23, **Ending The Quest**: success requires achieving the goal and returning to the stairway. Players may end early by returning before completing the quest; all heroes dying also ends it.
- The same printed page's **What Happens Between Quests?** describes recovery, restored spells and shopping. The Armoury is implemented; campaign carry-forward and survivor recovery remain future work.

Runtime source locators are `trial.objective.source` and `trial.endingSource`. No reward is invented: The Trial lists treasure in room notes, but no separate completion payment. Treasure searches/cards and potions are now implemented in TREASURE.md; trap/secret-door mechanics now exist in isolated sandbox scenarios (TRAPS.md); The Trial has none. Campaign progression remains unfinished; equipment acquisition now uses the between-quest Armoury. An ending screen does not make this a complete implementation of the original quest.

## Engine behaviour

`rules/quest.js` derives objective completion from Verag's recorded Body Points. Killing him changes the public objective to returning to the stairway; it never ends the session on its own or reveals his location beforehand.

The stairway context panel offers **Leave dungeon**. It is disabled until the active, living hero is on the shared stairway. A cancellable confirmation explains completion or retreat. `EXIT_QUEST` is a free exit interaction, not a new attack/action or a dice roll; it cannot bypass a pending handoff/result. It marks that hero's `exit` as `completed` if Verag is already defeated, otherwise `retreated`. It ends that hero's participation and advances the existing turn/CPU flow. Other heroes remain in the dungeon and can continue.

`combat.alive` still means positive Body Points. `combat.inPlay` additionally excludes exited heroes. Sight origins, occupancy, melee targets, AI targeting, party controls, turn order and projected miniature lists use the latter where appropriate. Leaving never kills a hero or allows a monster to target them on the stairs.

When no heroes remain in play:

- `victory`: at least one hero completed the objective and exited safely.
- `retreat`: at least one hero escaped, but nobody completed the objective and returned safely.
- `defeat`: every hero died without anyone escaping.

A hero who leaves before Verag dies retains their individual retreat result if the remaining party later succeeds. A final monster attack retains its pending report and dice stages; acknowledge it before the outcome screen. No animation decides success, exits or turn progression.

## UI and saves

Current-quest death handling supports immediate own potion/spell rescue. Standard
deaths transfer possessions to an eligible companion or lose them, with no
completion revival. Optional Fair loot recovery drops sealed bags and revives
their owners after successful victory/final report acknowledgement. Only bags
carried by a completed-exit hero return their items/gold; other contents are lost.
No hero returns mid-quest. See RECOVERY.md for both modes and migration.

Retreat/defeat is not successful completion. Surviving exited heroes and fair-mode
revived heroes can visit the Armoury to buy, sell and equip gear. Campaign
advancement, replaying with this party, survivor recovery and carrying holdings
into Quest 2 remain future work; new adventures create fresh parties.

The sidebar shows the objective without hidden positions/counts. Exited heroes remain in the party list with Completed/Retreated status but have no board miniature or focus action. The terminal modal lists each hero's result and supports returning to party setup. There is no automatic campaign/Quest 2 transition.

The save key/envelope/content ID remain unchanged. State schema 3 adds `hero.exit: null | completed | retreated` and terminal `victory`/`retreat` phases. Schema 2 saves are explicitly validated/migrated with `exit: null`, preserving positions, Body Points, RNG, pending reports, dice stages and view settings. Migration happens in memory on load; the normal next save writes the current schema (15). Unknown/corrupt saves stay preserved. See SAVES.md.

For parties smaller than four, the all-heroes-out terminal condition applies to the selected party, consistent with Mark's existing smaller-party adaptation. Individual exits and per-hero outcome labels are the digital presentation of the printed ending rule; next-quest campaign credit remains unfinished; successful completion revival
and sealed-bag returns now follow RECOVERY.md.

## Verification

Mark approved the focused checks on 2026-10-22. All 17 engine/save checks passed: fresh schema 3 state; off-stair and pending-decision exit rejection; solo retreat; exited-hero occupancy, sight, turn order and CPU targeting; Verag's defeat without an immediate ending; objective plus safe exit; individual/mixed party exits; final combat reports for victory/defeat; terminal save round trips; schema 2 migration including pending defence dice and unchanged RNG; invalid-save preservation; and local script references/syntax. The diagnostic lives in ignored `tmp/`, with no tracked test suite added.

One isolated Chrome pass at a separate localhost origin covered solo setup/briefing, exit confirmation cancellation and disabled off-stair action, manual movement dice, movement/door discovery, hero attack and automatic monster defence, defeated-piece removal, refresh after combat, CPU attack and manual hero defence, restart with the same party, confirmed retreat, refresh of the terminal outcome and return to setup. Participant portraits, board and 3D dice rendered; no console warnings/errors were reported. Mark's normal browser save was untouched.

Victory, mixed-party endings and legacy migration were checked in the engine/save diagnostic, not through a full browser quest playthrough. Direct-file operation, mobile layout, exact animation timings, reduced motion/context loss, gallery/studio and broad regressions were not checked in this pass. No build or lint run was performed.

## Rereading quest information

The sidebar quest title includes a Quest info link. It opens a read-only modal
with the same original Mentor briefing and current public objective (including
returning to the stairs after Verag is defeated). Sandbox shows its practice
objective. Hidden room notes, monster positions and treasure placements are
never included. Closing or Escape returns to the existing turn without changing
the initial briefing screen, rules, RNG or save. Existing modal guards suspend
CPU progression while reading. The link shares temporary animation/target locks.
Source/diff review only; no browser checks were run.

See ARMOURY.md for between-quest shopping, practice and save/review limits.

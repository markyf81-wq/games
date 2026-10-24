# Party carry-forward and Quest 2

## Sources

Original North American quest book, PDF page 6 **lower map rotated 180°**, and
page 7 **Quest 2 parchment / notes**, were visually reviewed on 24 October 2026.
The book uses imposed page order: the upside-down upper half of page 6 is Quest
14, not Quest 2. The symbol key on PDF page 4 was also reviewed to distinguish
Orcs, Goblins and the Fimir. Runtime locators are in `data/ragnar.js` and the
`ragnar` dungeon layout. Raw PDFs and rendered research remain local/ignored.

Original instruction booklet PDF page 2 rotated 180°, printed page 23:
**Ending The Quest**, **What Happens Between Quests?**, **Unfinished Quests**.
Successful heroes recover starting Body/Mind, regain spells and keep treasures
for later quests. Original quests/cards/items remain authoritative; adopted
First Light death/loot clarifications are in EDITION-COMPARISON.md.

## Campaign flow

New adventure starts The Trial. After victory and the final recorded result,
**Continue · Quest 2** carries the same selected heroes, player ownership, spell
groups, personal gold, potions, equipment and equipped slots into The Rescue of
Sir Ragnar. Armoury purchases/sales made before continuing carry too. Survivors
recover full health/spells and clear temporary statuses. Standard dead heroes
receive replacements of the same class with starting equipment and zero gold.
Fair-mode revived owners retain exactly their settled bag outcome; an unrecovered
bag never manufactures replacement possessions. No hero returns mid-quest.

Retreat/defeat offers **Retry with this party**. Survivors keep remaining holdings;
fallen heroes receive replacements, and unresolved bags are lost. As an explicit
digital recovery policy, retreating survivors also rest before retrying. The
printed suggestion to redesign a failed quest is not automated: retries use the
same authored map. Quest 2 is the last implemented quest; its success screen
retains the party/Armoury but does not pretend Quest 3 is available.

Restart restores this attempt's entry party/loadouts and discards its finds and
purchases. New adventure replaces the whole campaign with fresh Quest 1 setup.
Legacy saves did not record entry loadouts, so their baseline is the roster at
first migration; historical spent/lost possessions are never reconstructed.

## Quest 2 events

- Original map: 10 rooms, 20 monsters, nine ordinary doors, one secret door,
  seven furniture pieces and the six printed blocked squares. Starts use four
  individual squares of its central-room stairway.
- Chest A has the one-Body poison-needle trap and is empty. It uses ordinary
  furniture trap discovery/disarming/search consequences.
- First treasure search in room B grants 60 gold and a **four-Body** healing
  potion. This is a distinct quest item, not the Treasure deck's one-die potion;
  no invented card or misleading one-die card is displayed for it. It supports
  ordinary drinking/sharing and immediate own-potion rescue.
- Sir Ragnar occupies the printed cell square and uses the supplied Chaos Warlock
  sculpt, as directed by the quest notes. He has two remaining Body, two defence
  dice and no attack. His cell cannot be searched for treasure.
- Discovering his cell fires the alarm once: all remaining monsters/furniture
  are revealed and all ordinary/secret doors open. Trap discovery is unchanged.
  Opening the cell with Genie, or discovering it while phasing, also finds him;
  the acting hero becomes his controller.
- After the controller's regular turn, manually roll one red die in the sidebar.
  Click a tile and choose **Move Sir Ragnar here**. His blue hover/path follows
  ordinary occupied-tile/wall/furniture routes. **Finish escort** forfeits unused
  movement. Monsters can target him and use the normal manual hero defence roll,
  health numbers, block cue and defeated-piece removal.
- Reaching any stair square brings him to safety immediately. The heroes must
  still leave normally to finish. His death prevents rescue success/payment.
- Rescue success grants the printed 240 gold once. Digital distribution: split
  among heroes with completed exits; party-order rounding handles any remainder.
  With one to four recipients, 240 divides evenly.

Digital escort policies for cases not spelled out: friendly heroes can pass him
but cannot ordinarily stop on him; the existing stair-sharing/free-internal-step
adaptation also applies to him. If his controller dies or retreats, the first
remaining hero takes control. He is an escort, not an extra playable hero: no
inventory, searches, attacks, potion rescue or hero-target spellbook is granted.
The same nearest-legal-target CPU policy handles heroes and the revealed knight.

## State and scene boundaries

Schema 16 adds `campaign` (`completed`, `attempt`, per-class `generations`,
`settled`, `entry`) and `questState` (Quest 2 alarm/escort). Each map retains a
stable content ID. Old schemas 2–15 migrate as Quest 1 without changing in-quest
RNG, pending rolls, casualties, treasure or spent spells. A finished legacy save
may settle ordinary between-quest recovery once.

`data/quests.js` resolves immutable definitions. `topology.forQuest` caches pure
per-map topology, allowing import validation for either quest without changing
the live scene. Scene/rule factories bind `quests.current`; `HQ.trial` remains
the original definition for practice. Embarking/restarting writes the next save
before reloading into that map's geometry. Failed storage leaves the previous
session live; pagehide cannot overwrite an accepted transition. Camera options
persist but framing/facing resets to the new stairway.

Every quest gets a fresh physical Treasure deck/search ledger. Carried items are
rekeyed independently of that deck, with equipped references remapped, avoiding
duplicate Treasure IDs or inherited/replacement starting-weapon collisions.
Rewards and recovery settle only after final reports, guarded by `settled`.
Ragnar's rolled die, readiness and remaining movement live in the pending escort
record, so refresh never rerolls or grants another turn.

## Review and manual checks

Source/map/diff review only. No tests, builds, syntax/type/lint commands, gameplay
screenshots, browser checks or automated playthroughs were run. Mark retains
verification. Suggested focused checks:

1. Finish The Trial with purchased gear/carried potions and a standard death;
   continue, refresh, export/import and inspect the retained/replacement loadouts.
2. Repeat with Fair recovery and recovered/unrecovered bags.
3. Check chest A discovery/disarm/trigger and B's fixed four-Body potion.
4. Open Ragnar's cell, refresh after alarm and after his one-die roll, move/finish
   his escort turns, and let a monster attack him.
5. Rescue him and exit: reward once across refresh; repeat with his death for no
   reward. Check retreat retry and entry-loadout Restart separately.

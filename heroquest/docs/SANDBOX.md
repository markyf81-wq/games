# Gameplay sandbox

Inventory fixtures: Prepare inventory / potions gives the selected hero 200
practice gold, two healing potions and reduced Body. Prepare potion rescue sets
that hero to 1 Body, adds a potion and prepares an Orc; place it adjacent with
the existing tools, then run Zargon to exercise a lethal-hit recovery choice.
These fixtures only affect the sandbox save. See INVENTORY.md; current source
review only, with manual checks left to Mark.

Unused opponents are zero-health fixtures, not casualties. Opponent setup clears
their `diedInPlay` markers; only a real kill during play creates a blood pool.
Legacy saves without markers do not infer blood from omitted monsters.

Open **Gameplay sandbox** in the top bar (`index.html?sandbox=1`). This is a
separate live practice session using the real engine, rules, dice, spells, CPU,
3D board and original base-game pieces. Individual sculpts can be inspected
separately through **Models**.

Sandbox storage is `heroquest.sandbox.v1`; the adventure remains at
`heroquest.session.v1`. Both use the same guarded schema/envelope. Returning to
adventure does not copy a fixture into that save. If the practice save is invalid,
it is kept until Reset practice area is explicitly chosen.

The default fixture reveals The Trial's playable board, has the original four
heroes and the original twelve spells partitioned Elf Earth / Wizard Air, Fire,
Water, and puts one original Orc near the party. Other original monster instances
remain in the state as defeated; setting an opponent selects an original type
with its canonical statistics/quest override. This is an invented practice setup,
not an authentic quest. No new spell, equipment card or expansion is added.

**Sandbox tools** supports:

- Prepare selected spell: choose any original elemental card, restore the party's
  cards/effects, wound heroes, select the corresponding Elf/Wizard and put an Orc
  nearby. Pass Through Rock resets discoveries to the starting area so blind
  movement/reveal pauses can be exercised. Return to play and cast normally.
- Reset turn / switch hero; Give maximum movement (six per normal movement die,
  respecting plate mail; a fixture override, not a roll).
- Restore heroes & spells; choose the Elf group, with the Wizard retaining the
  other three. This deliberately resets used cards and effects in this save only.
- Wound heroes for healing, without killing them.
- Set / revive an original opponent type; this replaces the previous live foe.
- Place selected hero or opponent through the shared glowing board picker.
  Placement uses free playable floor. Movement itself still uses the normal rules.
- Run Zargon's turn through the real END_TURN/CPU intro/roll/report flow.
- Reset practice area, restoring the default fixture with a fresh random seed.

Fixture changes deliberately replace the practice state; close old reports/dice,
refresh the view and persist the new fixture. Normal actions retain ordinary
validation, action limits and RNG. No guaranteed dice outcomes or hidden testing
logic are added to gameplay. Corrupt adventure saves are never touched.

## Manual spell pass

Mark chose to test manually. These are expected outcomes to check, not claims
that any test passed. Use Prepare selected spell to reset each case; use normal
Spells → choose on board → confirm → dice/result flow. Choosing/cancelling a target
must spend nothing. After a cast, the card leaves the hand and stays spent after
refresh. Also refresh a pending dice/result stage to check it does not replay.

| Card | Check |
| --- | --- |
| Heal Body | Heal a visible living hero, including self, up to four lost Body; never exceed starting Body or target a fallen hero. |
| Water of Healing | Same cap/target checks; independent once-per-quest card. |
| Rock Skin | One extra defence die. Keep it after an attack that deals zero Body; remove it after actual Body damage. |
| Ball of Flame | Two red resistance dice; each 5/6 prevents one of the two Body damage. CPU rolls automatically. |
| Fire of Wrath | One red die; 5/6 prevents the single Body damage. |
| Tempest | Monster misses one activation, then acts normally next round; refresh must not duplicate the skip. |
| Genie | Choose monster or revealed closed door on the board. Attack uses five combat dice plus normal defence; door opening is remote and reveals beyond. Hidden doors never appear as choices. |
| Swift Wind | Next roll uses twice the normal dice: four, or two in Plate Mail. If already rolled but not moved, retain the original dice and add the same number. Free stair repositioning must not consume it. |
| Courage | +2 dice for the next ordinary attack, then consumed. Ends earlier if the hero loses sight of every monster. Genie does not consume that bonus. |
| Sleep | One initial red die per Mind; any 6 resists. Otherwise no movement/attack/defence. Check again on later activation; a wake can continue that same activation. Undead cannot be targeted. |
| Veil of Mist | Next movement may pass monsters, but cannot stop on an occupied square; normal furniture/walls still block. |
| Pass Through Rock | Hover/select unseen playable squares normally. Phase through walls, furniture and units; pause on discovery. Pausing inside is allowed with moves left, but the last move/End turn inside is fatal. Unused/off-board squares are not selectable. Refresh mid-move preserves the remaining movement. |

For every figure-target spell, verify the caster's own sight (not another hero's
or remembered discovery), living/type eligibility, no second action and movement
ordering. Restore/group changes are tools, not campaign replenishment. Pass
Through Rock's broad object/last-step semantics and shared stairs are Mark's
explicit digital rulings, separate from original card wording.

Treasure and potion scenarios are described below. Exploration practice now
supports pit, spear, falling-block, trapped-chest and secret-stone-door scenarios;
see TRAPS.md for preparation, expected behaviour and manual review steps.
These are invented placements, not additions to The Trial.

## Camera and performance

Board positions, orbit and zoom use bounded critically damped presentation
interpolation. Both heroes and monsters are followed while moving. A distant
mover gets a short glide into view before its hops; hidden/context loss/reduced
motion completes waiting. New rooms/corridor cells are centred after reveal.
Attack camera retains its own projection/flight and uses the actual displayed
board focus at departure/return; transient smoothing is not saved.

Torch lighting now uses a fixed pool of eight nearby lights and one shadow light.
Its shader light/shadow counts stay constant while the camera moves. Torches and
hearths retain source anchors/flicker/particles. Broad map views prioritise the
nearest eight sources. This addresses a source-level cause of camera shader
compilation stalls; it is not a measured performance result.

No automated checks, browser pass, benchmark, build or lint was run for the
sandbox, presets, latest camera or lighting changes. Mark is testing manually.

## Treasure practice — 23 October 2026

Treasure practice defaults to Random draw. Choose a specific card only to force
that test result, then Prepare treasure search. The selected
hero is placed in the cleared stairway room with a fresh 24-card deck and empty
search ledger. Prior treasure-derived practice possessions/wanderers are cleared.
Random draw uses a fresh random seed. Specific-card mode selects a seed whose
next ordinary shuffle draws that category; Search
next before rolling or taking another RNG-consuming action. This uses the actual
SEARCH_TREASURE command, not an alternate result handler or forced-card save flag.
The adventure slot is untouched. Give all treasure potions adds one of each for
practice. Prepare potion rescue / Wound heroes can then support lethal-hazard or
combat practice (resetting the turn does not reset the prepared search deck).

Manual review targets: per-hero once/room, monsters/corridors/used action, reward
ownership, fixed quest A/B/D/E claims, hazards ending the turn, wandering Orc
placement/immediate attack/manual defence, subsequent CPU activation, potion
expiry, Brew second attack/Finish attacks and refresh between each stage.
Source/diff review only; these new flows have not been run in the engine/browser.

## Exploration practice

Equipment practice: choose a hero and Equipment loadout, then Prepare equipment
practice. This starts a fresh fixture with the supported melee weapons, four
armour pieces and Tool Kit carried. Presets equip Helmet/Shield/Chain Mail,
Helmet/Shield/Plate Mail or Battle Axe/Helmet/Plate Mail. Inventory shows the full
card and Equip/Unequip controls. Staff/Longsword presets equip that weapon and
place the selected opponent on a free reachable diagonal when available. The
Wizard may use Staff; choosing Longsword leaves his Dagger equipped with an
explanation. No gear enters the adventure save. Plate Mail rolls one
movement die; Swift Wind doubles it to two. Give maximum movement grants six per
normal die. Source/diff review only; Mark retains manual verification.

Select a hero and an Exploration practice scenario, then Prepare exploration
scenario. Twelve moves are ready; the active trap starts concealed. Use the
board-toolbar Search button, walk into a hidden trap, or jump a discovered floor trap
or sprung pit. Reset the hero’s turn after discovery to enable Disarm; non-Dwarfs
carry a practice Tool Kit.
A trapped chest uses a one-Body practice consequence before treasure, not an
invented quest note. Secret-door practice hides the area behind the concealed
panel until opened. Pending rolls, sprung pits/blocks and move-clear choices
remain in the separate sandbox save (currently schema 13). No engine/browser checks run.

## Crossbow practice

Choose Barbarian, Dwarf or Elf in Sandbox tools, then Equipment loadout →
Crossbow · ranged attack → Prepare equipment practice. This starts a fresh
practice fixture with carried gear and the Crossbow equipped, attempting to put
the selected opponent on a clear line about four squares away. Click that
opponent and choose Shoot, then manually roll as usual. The Wizard keeps his
Dagger and gets an explanatory restriction message instead.

For a repeatable animation check, select **Crossbow · guaranteed miss** and
Prepare equipment practice. Return to play → opponent → Shoot → Roll. The next
ordinary attack is seeded to roll zero skulls. Shoot before movement/potion/spell
rolls; those consume the prepared RNG sequence. Reprepare to repeat. The seed is
selected using cloned normal ATTACK resolutions, without spending the fixture's
action, recording a report or adding a production force-roll flag.

Manual cases: a clear ranged/diagonal shot; an orthogonally adjacent target;
an intervening hero or monster; a closed versus open doorway; switching between
Crossbow and melee weapons; move-then-shoot; Heroic Brew and attack buffs; a miss,
full block and damage; refreshing during recorded dice; hidden/reduced-motion
presentation. These are suggested checks, not completed results. No automatic
engine/save/Chrome pass was run for this addition.

## Death and recovery practice

Death / recovery practice → Prepare death / recovery starts a fresh fixture.
The unused-action and action-used presets use Elf/Wizard with one Body, no
healing potion and a lethal upcoming Orc attack. Return to play and Continue
Zargon, then reveal the normal attack/defence rolls. Own healing is offered only
for the unused-action case. With Fair loot recovery enabled, nearby-heroes and
nearby-monster presets both leave sealed bags after death. Treasure-hazard practice
prepares a lethal search: search before any other roll, then move a companion
beside the bag and pick it up. Its contents stay out of the carrier's usable inventory. A carrier death
drops it again. At successful completion only bags with a completed-exit carrier
return to their revived owners. See RECOVERY.md for the house rule, persistence
and suggested manual cases. Source review only; these scenarios have not been
executed in the engine/browser by the agent.

## Dagger throwing practice

Choose any hero, then Equipment loadout → **Throw Dagger · spare available** →
Prepare equipment practice. Click the opponent → Throw Dagger → Roll. One copy
is lost on hit or miss; a spare Dagger remains equipped. Other gear stays carried.
Alternatively choose **Throw last Dagger · unarmed afterwards**: the fixture
removes other weapons, so throwing leaves an empty weapon slot and one-die
orthogonal unarmed combat. Both fixtures attempt a clear ranged opponent position.

Suggested manual cases: cancel before Roll; throw from beside a monster; blocked
sight; throw while a different weapon is equipped; hit, miss and full block;
Courage/Strength, Heroic Brew, last copy versus spare, and refresh during dice.
Confirm that only one copy is removed and the saved projectile identity survives
item removal. These are practice instructions, not completed test results.

Death/recovery practice uses Fair loot recovery from Adventure menu. There is
no separate fixture rule selector. All sandbox presets and Reset practice area
preserve this setting, including fresh spell/exploration/death fixtures. Standard
mode covers inheritance/loss; Fair mode covers sealed bags and completion revival.
The tools show the current rule. This corrects a duplicate selector that silently
reset fair mode to Standard when preparing a death. Source/diff review only;
Mark retains manual gameplay verification.

Sandbox tools → Prepare Armoury opens the between-quest shop with 2,000 practice
gold per hero. It preserves Fair loot recovery and cannot change adventure funds.
After shopping, close the results, open tools and reset a hero’s turn to try
their gear. See ARMOURY.md for suggested manual cases; no new checks were run.

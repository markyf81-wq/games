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
3D board and original base-game pieces. The existing **Test room** remains a
visual model/furniture showroom and does not run gameplay.

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
- Reset turn / switch hero; Give 12 movement (a fixture override, not a roll).
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
| Swift Wind | Next movement roll uses four red dice. If already rolled but not moved, keep those two and add two. Free stair repositioning must not consume it. |
| Courage | +2 dice for the next ordinary attack, then consumed. Ends earlier if the hero loses sight of every monster. Genie does not consume that bonus. |
| Sleep | One initial red die per Mind; any 6 resists. Otherwise no movement/attack/defence. Check again on later activation; a wake can continue that same activation. Undead cannot be targeted. |
| Veil of Mist | Next movement may pass monsters, but cannot stop on an occupied square; normal furniture/walls still block. |
| Pass Through Rock | Hover/select unseen playable squares normally. Phase through walls, furniture and units; pause on discovery. Pausing inside is allowed with moves left, but the last move/End turn inside is fatal. Unused/off-board squares are not selectable. Refresh mid-move preserves the remaining movement. |

For every figure-target spell, verify the caster's own sight (not another hero's
or remembered discovery), living/type eligibility, no second action and movement
ordering. Restore/group changes are tools, not campaign replenishment. Pass
Through Rock's broad object/last-step semantics and shared stairs are Mark's
explicit digital rulings, separate from original card wording.

Quest-event/treasure/trap scenarios remain future work. Inventory and Healing
Potions have practice fixtures; other potions, searches, gear changes and quest-note
effects are not presented as testable here.

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

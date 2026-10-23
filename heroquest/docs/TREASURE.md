# Treasure searches — original base Game System

Search for treasure is one action, on the active hero's turn, in a room without
living monsters. Each selected hero can search each room once per quest.
Corridors cannot be searched for treasure. The hero does not physically move
around the room while searching. As with attack/cast, searching after paid
movement closes remaining movement; searching first allows movement afterwards.
A hazard instead ends the whole turn after its pending damage/recovery result.

Click Search for treasure in the sidebar, or the active hero/current room's
furniture. A nonmodal slide-out tray shows the original card-back stack: its top
card lifts, slides out and flips over in 1.5 seconds. The card's name, full printed
wording and outcome appear below after the flip, within reserved space. Continue
becomes available once revealed. The tray stays open until the player chooses
Continue; there is no timeout, Escape dismissal or close icon. Compact feedback
stays separate; card art is no longer repeated in it.

The existing saved search report blocks progression throughout the reveal and
reading time. Only Continue releases ordinary outcome acknowledgement, hazard
recovery or an immediate wandering-monster attack. CPU attacks reuse sidebar
dice and manual hero defence. Hidden tabs, reduced motion and a bounded watchdog
finish only the cosmetic reveal; they never acknowledge the card or resume play.
Refreshing shows the saved card face immediately and waits for Continue again.
Quest-specific finds show their quest text instead of pretending to draw a card.

## Source audit

- `system-instruction-booklet`, PDF page 9, upright, printed page 16: Action 3,
  Search For Treasure; How A Hero Searches For Treasure; How Zargon Reacts;
  Wandering Monsters. Only rooms, each hero once, no monsters in the room;
  first finder receives quest special treasure, later searchers draw cards.
  Valuable cards stay out until the next quest. Bad cards return; shuffle before
  every draw, despite the individual card's instruction to return to the bottom.
- `system-treasure`, PDF pages 1–3: all 24 physical cards and their full wording
  visually reviewed. Page 4: coloured Treasure card back. No fan/expansion cards.
- `system-quest-book`, PDF page 4 lower map rotated 180 degrees, reviewed against
  the existing coordinate trace; PDF page 5 lower notes A/B/D/E and footer:
  A room-18 empty weapons rack, B room-19 empty chest, D room-3 chest 84 gold,
  E room-11 chest 120 gold; wandering monster Orc. No placed traps or secret doors
  in The Trial. Treasure-card hazards are independent of those absent map traps.

| Face | Physical copies | Result |
| --- | ---: | --- |
| Gem | 2 | 35 personal gold |
| Gold (rags) | 2 | 15 personal gold |
| Gold (loose stone) | 2 | 25 personal gold |
| Jewels | 2 | 50 personal gold |
| Potion of Healing | 3 | One use, one red die healing |
| Heroic Brew | 1 | Two attacks in place of one |
| Potion of Defense | 1 | +2 dice on next actual defence roll |
| Potion of Strength | 1 | +2 dice on next normal attack |
| Hazard (arrow) | 2 | Lose 1 Body, end turn |
| Hazard (shallow hole) | 2 | Lose 1 Body, end turn; move normally next turn |
| Wandering Monster | 6 | Orc appears, attacks immediately if adjacent |

A/B handling is explicit: the room's first search presents its empty-find note
without a card; subsequent eligible heroes draw from the deck, using the same
first-finder structure as D/E. This interprets the negative notes as quest search
results, rather than an additional free chest/rack-looting interaction. Original
wording and room scope are retained separately in trial.treasureRooms.

## Rule/state ownership

`data/treasure.js` separates distinct faces from 24 stable physical instance IDs.
`rules/treasure.js` owns eligibility, unbiased recorded Fisher–Yates shuffling,
removal/return, quest claims, personal rewards, hazard and placement resolution.
SEARCH_TREASURE resolves and saves before art/camera/dice. A rejected search does
not change RNG, gold, action, deck or searched rooms. The existing engine command
boundary still owns mutations; no mesh/card UI decides an outcome.

State schema 7 stores treasure `{deck,removed,searched,claimed,nextMonster}`,
hero potion-effect flags and `extraAttack`. The last treasure report stores its
physical card/special note, room, searching hero, reward/item and spawned Orc ID.
Schemas 2–6 gain a fresh unused search ledger/deck and inactive potion effects;
existing RNG, possessions, spells, health and pending stages are preserved.
No past search is inferred from visits (searching did not exist in those versions).

Bad cards are returned immediately in the accepted search state and shuffled on
the next accepted draw. Valuable physical IDs move into removed; potion IDs also
become the carried item IDs. Drinking a potion never puts its card back. Refresh
cannot claim fixed gold again or redraw a pending result. A pending search that
created an adjacent Orc is acknowledged into exactly one new combat report,
then normal saved dice stages take over. Its card record accompanies the combat.

CPU placement policy chooses a free connected orthogonal square beside the
searcher, with stable nearest/coordinate tie-breaking. If blocked, use the nearest
free square inside the same room and skip the immediate attack, as printed.
If the room has no free square at all, no miniature can be placed; record that
explicitly rather than overlap furniture/heroes or reveal another room. The Orc
remains for subsequent normal Zargon turns; its special immediate attack can
only target the searcher and does not move. New `wanderer-N` IDs leave all map
monsters/Verag intact and use the existing stable Orc sculpt variations.

## Potions and attack ordering

Healing retains its independent saved red-die/recovery flow. A treasure hazard
can offer the same carried-potion rescue as a lethal monster attack. Its turn
still ends after recovery; a shallow hole is not a persistent map pit.

Strength/Defense/Brew are consumed with Drink, have no die of their own and
store a pending effect. Repeated drinking of the same active effect is blocked.
Strength adds two dice to the next ordinary weapon attack (not Genie's separate
summoned attack). Defense adds two dice the next time defence is actually rolled;
a zero-skull miss does not consume it. Brew is consumed into one optional second
weapon attack during that attack action. Choose another adjacent target normally;
Finish attacks declines it, and no reachable target clears it automatically.
Movement cannot split the two attacks; after finishing, movement is available
only if the attack action preceded paid movement. Neither potion use itself nor
its presentation consumes an action or movement.

Presentation limit: combat dice are recorded atomically before display. Buff
potions must be drunk before resolving an attack, not retroactively between its
recorded attack/defence displays. Inventory suspends CPU pacing, so a hero can
prepare Defense before the next activation. A future staged-combat redesign may
allow potion choices between attack and defence; that is not implemented here.
Other equipment/trading, emergency self-healing spells, corpse recovery, traps,
secret doors and campaign spending remain future work.

## Manual practice and review limits

Sandbox tools offer Treasure practice + Prepare treasure search. This resets
only the practice deck/ledger and original opponent fixtures, removes previous
practice treasure-derived items/wanderers, places the hero in a clear starting
room. Random draw is the default and uses a fresh random seed. Selecting a
specific card instead chooses a seed whose next ordinary shuffle draws that
category. Preparing again resets the deck; repeated specific-card tests can
therefore show the same card indefinitely. Search
next, before any roll/RNG-consuming action. Give all treasure potions supplies
one of each with practice-only instance IDs. The adventure slot is untouched.

Source/diff review and offline PDF/artwork authoring only. No engine/save tests,
browser checks, screenshots, build, lint or performance run. Mark retains manual
verification. Suggested focused checks: each reward/hazard/monster face, duplicate
counts/return behaviour, per-hero room limits, blocked/corridor searches, fixed
quest finds, search/movement ordering, lethal hazard rescue, immediate Orc defence,
Brew second attack/decline, potion expiry and refresh at each pending stage.

## Hazard presentation

After Continue on a freshly drawn hazard card, the camera glides back to the
searcher. The arrow hazard flies a cached shaft/head/fletching model from an
already-revealed room boundary into the hero (450ms flight), then starts the
red number and recoil in its travel direction. The pit opens a square stone-rimmed
hole: a transient floor-instance mask exposes its dark bottom and side walls.
The miniature flinches backwards and drops .3 squares briefly, then rises and
the floor closes (1.75s total). The active ring hides during the drop. Stairs use
an opaque opening mask above their shared art rather than removing that whole
2x2 piece. No pit persists or blocks later movement.

view/treasure-effects.js caches the geometry/materials and shares the existing
finite render loop, presentation gate and floating health number. Pit motion
owns the victim's pose; combat-impact supplies only its number, preventing two
animations from overwriting each other's position. Arrow impact uses ordinary
recoil. Feedback, potion rescue and turn/CPU progression wait for the animation
and number to finish. The original one-Body damage and end-turn rule are already
saved; animations never resolve them again.

Hidden tabs, reduced motion, graphics loss, reset and a bounded watchdog restore
the floor/ring/pose and release the wait. Refresh has no transient fresh-draw
health queue, so it shows the saved card/result without replaying the hazard.
No new RNG, rule, trap tile or save field. Source/diff review only; visual,
hero-rescue and refresh checks remain with Mark.

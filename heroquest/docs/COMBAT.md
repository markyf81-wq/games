# Combat and CPU Zargon

## Current scope

Original North American starting hero/monster statistics, orthogonal melee,
combat dice, Body loss, potion rescue and revealed-monster CPU turns. Choose
1–4 actual heroes; canonical encounters/stats remain unchanged. Difficulty
scaling, other weapons/throwing, emergency self-healing spells and fallen-hero
possessions remain unfinished. See SPELLS.md, INVENTORY.md and QUESTS.md.

## Source ledger

One-based PDF pages in the original North American scans:

| Content | Source and locator | Implemented |
| --- | --- | --- |
| Barbarian: Attack 3, Defend 2, Body 8, Mind 2, Broadsword | `system-character-cards`, PDF p1, left face | Starting stats and weapon |
| Dwarf: 2, 2, 7, 3, Shortsword | Same, PDF p2 | Starting stats and weapon; disarming remains unavailable |
| Elf: 2, 2, 6, 4, Shortsword | Same, PDF p3 | Starting stats and weapon; spells in SPELLS.md |
| Wizard: 1, 2, 4, 6, Dagger | Same, PDF p4 | Starting stats and melee weapon; spells in SPELLS.md; throwing unfinished |
| Eight monster stat lines | `system-monster`, PDF p1, eight named faces | Movement/attack/defence/body/mind transcribed and visually reviewed |
| Starting melee weapon strengths | `system-armoury-identification-guide`, PDF p1, right Armoury, Broadsword/Shortsword/Dagger | Cross-checks character cards; buying/throwing not implemented |
| One action; move then act OR act then move, no split around action | `system-instruction-booklet`, PDF p12 rotated 180°, printed p12 | One attack; attack after paid movement ends remaining movement; attack before moving permits subsequent movement |
| Ordinary adjacency and one weapon per attack | Same, PDF p12 rotated 180°, printed p13 | Orthogonal, open grid edge only; no attack across walls/closed doors or diagonally |
| Hero attack / monster defence | Same, PDF p11 upright, left printed p14 | Skulls hit; black shields block; no defence roll when no skulls; no immediate retaliation |
| Zargon and monster movement | Same, PDF p4 rotated 180°, printed p21 | Each revealed living monster acts once after all living heroes; fixed movement, pass monsters, cannot pass heroes/share squares/open doors/attack diagonally |
| Monster attack / hero defence / dead heroes | Same, PDF p3 upright, left printed p22 | Skulls hit; white shields block; Body capped at zero; fallen heroes removed. Emergency healing/possessions await their systems |
| Guardian mummy | `system-quest-book`, PDF p5, lower half, note C | The marked mummy attacks with four dice, overriding its standard three |

The six equally likely combat-die faces are 3 skulls, 2 white shields and 1 black shield. The original physical die’s standard distribution is separately corroborated by the [Ye Olde Inn dice discussion](https://forum.yeoldeinn.com/viewtopic.php?f=165&t=4530); this is a supplementary community component reference, not a scanned printed rule or a replacement for the original attack/defence sources. Runtime records distinguish that corroboration from visually reviewed cards/rules. Face order in the RNG table is arbitrary, with each slot equally likely.

Monster values (Move / Attack / Defend / Body / Mind): Goblin 10/2/1/1/1; Orc 8/3/2/1/2; Fimir 6/3/3/2/3; Skeleton 6/2/2/1/0; Zombie 5/2/3/1/0; Mummy 4/3/4/2/0; Chaos Warrior 7/4/4/3/3; Gargoyle 6/4/5/3/4. Verag uses the Gargoyle line; no extra boss power is invented.

## Commands, reports and turns

Schema 7 and content the-trial-combat-v1 persist authoritative outcomes before
presentation. ATTACK requires the active living hero, an unused action (or the
remaining Heroic Brew attack), no pending decision and a living adjacent monster
across an open edge. Acting after paid movement closes movement; acting before
moving allows a subsequent move. Door opening, potion use and potion sharing
are free interactions; giving is only on the owner's turn.

Skulls hit. Heroes defend with white shields; monsters with black shields.
Zero skulls skip defence without consuming defence RNG. Reports retain both
unblocked hits and actual Body lost, capped at remaining Body. There is no
counterattack. Original stats remain canonical; effective dice derive buffs.

RESOLVE_MONSTER consumes each queued ID once, outside lookup predicates. A Sleep
wake uses the saved resumeId for the activation already consumed. Movement is
validated step by step against legal edges, budget and occupancy. ACK_REPORT
continues the saved report/queue; effects never apply damage or advance it.

Dead records stay in state but leave rules occupancy/sight/turn scheduling. Only
the pending report's defeated miniature is held visibly until acknowledgement.
A carried healing potion offers Drink & roll or Let hero fall before removal.
Recovery retains the original attack and CPU cursor. Trapped heroes cannot be
rescued. Individual exits and terminal outcomes follow QUESTS.md.

The stairs contain four actual cells for reach and occupancy. Internal moves
cost zero but require rolled positive movement; entry/exit cost one. This is
Mark's movement adaptation, not a larger melee target. See DICE.md.

## CPU policy — adaptation, not a printed rule

- Activate revealed living monsters in stable quest-instance order, once each per Zargon phase. Display sight never deactivates an already revealed monster. Unrevealed monsters do not move.
- Consider living heroes and discovered terrain through currently open edges. Do not enter unrevealed rooms, open doors or use future dice outcomes.
- Use breadth-first routes to an unoccupied square adjacent to a hero. Prefer the shortest route, breaking equal lengths by the original hero order, then stable north/east/south/west route enumeration. It may pursue a hero who is currently out of its sight, using the shared board knowledge a human Zargon has.
- Move towards that square up to the monster’s fixed movement. Pass other monsters but end on a free square; trim a partial approach if its endpoint is occupied. Heroes and furniture block movement. Monsters do not share stair squares.
- After movement, attack an adjacent living hero, breaking ties by hero order. No move/action split or bonus attack. If no attack position is reachable, wait. The policy currently always uses move-then-attack, even though the rules also allow attacking before moving.

This intentionally simple policy can congest corridors; it does not coordinate activation order or evaluate expected damage. Tactical improvements should remain separate from legal rules.

## Interaction and camera

Left click opens a model/tile context. Available actions stay visible; unavailable
ones are disabled with reasons. Hover/selection use blue for reach and yellow
otherwise. Walk-then-attack first saves ordinary movement, then rechecks legality;
new discovery interrupts the combined action. Global rolls/End turn stay in the
sidebar. Heroes manually trigger attack, defence and resistance rolls; CPU rolls
automatically only after Continue on the Zargon portrait handoff. See DICE.md.

POV defaults to over-the-shoulder framing: 1000ms approach/120ms hold and 900ms
return. Movement/doors/spells and most attacks retain the miniature. One attack
in four uses a 1400ms/350ms eye view, selected by a cosmetic counter, not RNG.
Linked actions share one shot; visible CPU units transition between actors and
return at phase end. Hidden movement never creates a cinematic shot. Existing
wall modes/cutaway apply throughout the lens blend. Camera snapshots always
represent ordinary board goals. Reduced motion/interruptions settle the shot.

## Health feedback and removal

session/presentation.js derives capped Body deltas for existing actors only.
Spawns, fixture replacement and imports are not damage/healing. All negative
deltas show red minus numbers and a short victim recoil; healing shows green
plus numbers without recoil. Numbers use one cached canvas/texture/sprite, 48px
text/6px outline in a .8×.4 world sprite, rising .65 over 950ms.

Damaging ordinary melee faces and thrusts the attacker .18 squares over 420ms;
victim recoil starts at 130ms contact. Other damage starts immediately. Recoil
moves away from a known source, otherwise backwards from the displayed facing.
The same helper restores exact origins/tilts. Zero loss displays neither shove
nor number. Reduced motion shows a static number for 700ms.

Dice-driven changes wait for the last saved stage; immediate healing waits for
its spell effect. Fresh Treasure hazards wait for card Continue, then contact-
timed arrow or pit/drop presentation (TREASURE.md). The pit owns its pose while
the shared impact component supplies only its number. These queues/poses are
transient; refresh restores the recorded outcome without replaying them.

Compact outcome feedback remains until dismissed, another action, or the next
hero turn. Automatic report acknowledgements resume the legal queue but do not
clear that readable result. Recovery is the explicit exception requiring a choice.

After acknowledging defeat, a miniature tips/sinks/fades over 700ms using owned
cloned materials, then the next CPU activation proceeds. Real discovered monster
deaths leave a small lit blood pool immediately when removal starts. diedInPlay
provenance prevents fixture omissions/zero-Body records from creating stains.
The atlas's decorative blood marks are patched out separately; see its README.

## Historical approved diagnostic

The initial combat milestone received source review only. On 2026-10-21 Mark reported that Zargon’s monsters did not move or attack. A minimal engine reproduction at the first two-Orc room found the activation cursor incrementing inside `Array.find`’s predicate: searching through quest figures consumed the queue before finding its first member. The cursor now advances once before each ID lookup, outside the predicate.

The same targeted diagnostic after the fix activated monster-15, moved it three squares and resolved its attack on the solo Barbarian. Monster-16 then received its own activation/report, waiting because the first Orc occupied the doorway’s only attack position. Acknowledging both reports returned to round two with the hero handoff pending. This diagnostic used a seeded, staged first-encounter state; it was not a browser playthrough. No browser checks, builds, lint, screenshots or broad regression suite were run. Broader combat/defence/action-ordering, defeated-piece skipping, sight memory and Chrome UI checks still require Mark’s approval; the earlier exploration evidence does not validate those areas.

## Current review limits

The 23 October presentation, status, recovery/treasure, controller extraction and
cleanup have source/diff review only. No new tests, builds, lint, screenshots,
browser automation or performance checks ran. Mark retains manual verification.
The historical diagnostic above does not certify these later revisions.

# Combat and CPU Zargon

## Current scope

Original North American starting hero/monster statistics, equipped orthogonal/diagonal melee, Crossbow shots and Dagger throws,
combat dice, Body loss, potion rescue and revealed-monster CPU turns. Choose
1–4 actual heroes; canonical encounters/stats remain unchanged. Difficulty
scaling and campaign progression remain unfinished. Emergency own healing and
fallen-hero possessions are covered in RECOVERY.md. See SPELLS.md, INVENTORY.md and QUESTS.md.

## Source ledger

Equipment slice (24 October 2026): original Armoury page 1 was visually reviewed
for Dagger/Shortsword/Broadsword/Battle Axe strengths, Helmet/Shield/Chain Mail/
Plate Mail bonuses, Wizard restrictions, two-handed incompatibility and plate
movement. Combat uses the equipped weapon's strength plus existing buffs and
base defence plus worn armour/buffs, with existing pit penalties unchanged.
Items merely carried add nothing. Maximum current buffed rolls are 8 attack and
9 defence dice; saves accept those recorded sizes. Staff (1 die, 100 gold, Wizard
allowed, no Shield) and Longsword (3 dice, 350 gold, no Wizard) now permit one-square
diagonal melee, matching the visually reviewed original Armoury and printed p13.
The shared canAttack query drives highlighting, command legality, Heroic Brew and
walk-then-attack positions. Diagonals require the existing topology corner trace:
at least one of the two orthogonal edge paths must be open. Ordinary hero weapons
and monsters retain orthogonal attacks. Crossbow and Dagger attacks are described below.
Source/diff and offline card-source review only, no engine/browser checks.

Crossbow slice (24 October 2026): original Armoury page 1, lower-left weapon,
was visually reviewed. It costs 350 gold, rolls three attack dice, has unlimited
ammunition and cannot be used by the Wizard. It may target any revealed living
monster with a clear centre-to-centre sight line except an orthogonally adjacent
one. The printed p13 adjacency definition excludes diagonals, so a clear diagonal
shot is legal. There is no maximum range or blanket prohibition on shooting when
another monster stands nearby. The original sheet does not forbid a Shield with
the Crossbow; only Battle Axe/Staff carry that restriction.

Sight reuses topology.canSee with figure obstruction, matching printed p15 SEE:
walls, closed doors, blocked stone and intervening heroes/monsters obstruct;
furniture does not. The existing corner-touch rule remains shared with spells.
The shooter is hypothetically relocated for walk-then-shoot previews, avoiding
false obstruction by its own former square. Firing-position candidates are known
cells and must still pass the ordinary route/budget/free-endpoint checks.
Automatic firing/action endpoints exclude other heroes, including on the stairs.
The printed stair-sharing exception remains available only for deliberate moves;
discounted internal steps cannot make automatic actions stack miniatures.
Shoot consumes the usual action and buffs; Heroic Brew rechecks ranged reach.

Physical hero combat reports add optional weaponId, validated against the weapon
catalogue. Genie has no weaponId. Missing weapon IDs remain valid for old reports.
Weapon identity determines the recorded shot presentation,
independent of later UI selection. A cached bolt travels for 320–850ms after all
dice are revealed, followed by any shield block and actual capped health change.
Zero-skull misses fall short into the tile immediately ahead of the shooter,
using its eight-way facing. The bolt arcs down for 480ms, settles flat over 100ms
and remains briefly on the floor (450ms total landing time) before clearing. It
cannot damage another occupant. Crossbow attacks do not thrust the
attacker; victims retain normal recoil. Reduced motion skips flight. Generation,
watchdog/hidden/context/reset handling cancels both flight and queued feedback.
No effect resolves rules, adds RNG or introduces an idle render loop.

The eye button beside lighting toggles translucent blue whole floor tiles for
the active hero. Each highlighted tile's centre passes the same topology.canSee
query, with figure obstruction, used by spells/ranged targeting. Partial visible
coverage alone does not highlight a tile. The original printed p15 SEE rule
uses centre-to-centre sight: empty squares may be crossed, intervening occupied
squares/walls/closed doors block, and a corner or wall edge may be grazed.
Corner-only figure contact is ignored, even with figures on both grazed side
squares; entering an intermediate occupied square blocks. The sealed-wall corner
route guard remains. This single query is shared rather than introducing a second
geometric approximation. Wall cutaway and sculpt dimensions/poses have no effect.
The overlay queries only public units/doors and draws on explored tiles; it
does not reveal hidden rooms. Sight alone does not mean a tile can be moved to
or that melee/ranged/action restrictions are satisfied.

Any gameplay action switches the guide off immediately, including starting an
attack or target picker before a roll. Cancel/completion does not restore it;
enable it again explicitly. One cached instanced floor mesh has no per-frame
sight computation. Source/diff review only; no engine/browser checks run.

### Dagger throwing

Original Armoury PDF page 1 permits throwing a Dagger at any visible monster;
it rolls one attack die and is lost whether it hits or misses. Unlike the
Crossbow, it has no adjacent-target prohibition. Wizard use is permitted.
The monster context offers Throw Dagger when the active hero carries one,
including while another weapon is equipped. The same figure-blocked sight,
known approach routes, action timing, Courage/Strength and pit modifiers apply.

ATTACK may include throwItemId. It must identify an owned throwable; rejected
commands spend nothing. Pressing the manual Roll resolves and removes that one
copy before saving, even on a miss. Cancel before Roll retains it. If it was
equipped, a spare Dagger automatically replaces it; otherwise the weapon slot
becomes null and hero.weapon becomes unarmed (one orthogonal attack die).
Other carried weapons remain available to equip. Throwing a carried Dagger
leaves the currently equipped weapon in place. This automatic spare selection
is a UI convenience. The weaponless die uses original Quest 6, General Notes
(quest-book PDF page 15) as precedent; extending that quest's weaponless attack
to this fallback is an interpretation. It does not remove worn armour or spells.

Reports store weaponId: dagger and the consumed thrownItemId, preserving the
projectile identity after the item leaves inventory. One cached metal-bladed
Dagger flies after the dice and before block/health feedback, sharing the bolt's
miss, cancellation and reduced-motion paths. No attacker thrust on thrown attacks.
Schema 11 permits a null weapon slot and validates consumed-item absence.
Source/diff and offline source-art review only; no engine/save/browser checks run.

One-based PDF pages in the original North American scans:

| Content | Source and locator | Implemented |
| --- | --- | --- |
| Barbarian: Attack 3, Defend 2, Body 8, Mind 2, Broadsword | `system-character-cards`, PDF p1, left face | Starting stats and weapon |
| Dwarf: 2, 2, 7, 3, Shortsword | Same, PDF p2 | Starting stats/weapon; disarming in TRAPS.md |
| Elf: 2, 2, 6, 4, Shortsword | Same, PDF p3 | Starting stats and weapon; spells in SPELLS.md |
| Wizard: 1, 2, 4, 6, Dagger | Same, PDF p4 | Starting stats, melee/throwable weapon; spells in SPELLS.md |
| Eight monster stat lines | `system-monster`, PDF p1, eight named faces | Movement/attack/defence/body/mind transcribed and visually reviewed |
| Starting weapon strengths and Dagger throwing | `system-armoury-identification-guide`, PDF p1, right Armoury, Broadsword/Shortsword/Dagger | Cross-checks character cards; Dagger consumed on hit or miss; buying not implemented |
| Weaponless attack | `system-quest-book`, PDF p15 upright, Quest 6 General Notes | One attack die as precedent for the weaponless fallback; see interpretation above |
| One action; move then act OR act then move, no split around action | `system-instruction-booklet`, PDF p12 rotated 180°, printed p12 | One attack; attack after paid movement ends remaining movement; attack before moving permits subsequent movement |
| Ordinary adjacency and one weapon per attack | Same, PDF p12 rotated 180°, printed p13 | Orthogonal, open grid edge only; no attack across walls/closed doors or diagonally |
| Hero attack / monster defence | Same, PDF p11 upright, left printed p14 | Skulls hit; black shields block; no defence roll when no skulls; no immediate retaliation |
| Zargon and monster movement | Same, PDF p4 rotated 180°, printed p21 | Each revealed living monster acts once after all living heroes; fixed movement, pass monsters, cannot pass heroes/share squares/open doors/attack diagonally |
| Monster attack / hero defence / dead heroes | Same, PDF p3 upright, left printed p22; PDF p2 rotated, printed p23 | Skulls hit; white shields block; Body capped at zero; own potion/spell rescue before removal; possessions settled as in RECOVERY.md |
| Guardian mummy | `system-quest-book`, PDF p5, lower half, note C | The marked mummy attacks with four dice, overriding its standard three |

The six equally likely combat-die faces are 3 skulls, 2 white shields and 1 black shield. The original physical die’s standard distribution is separately corroborated by the [Ye Olde Inn dice discussion](https://forum.yeoldeinn.com/viewtopic.php?f=165&t=4530); this is a supplementary community component reference, not a scanned printed rule or a replacement for the original attack/defence sources. Runtime records distinguish that corroboration from visually reviewed cards/rules. Face order in the RNG table is arbitrary, with each slot equally likely.

Monster values (Move / Attack / Defend / Body / Mind): Goblin 10/2/1/1/1; Orc 8/3/2/1/2; Fimir 6/3/3/2/3; Skeleton 6/2/2/1/0; Zombie 5/2/3/1/0; Mummy 4/3/4/2/0; Chaos Warrior 7/4/4/3/3; Gargoyle 6/4/5/3/4. Verag uses the Gargoyle line; no extra boss power is invented.

## Commands, reports and turns

Schema 7 and content the-trial-combat-v1 persist authoritative outcomes before
presentation. ATTACK requires the active living hero, an unused action (or the
remaining Heroic Brew attack), no pending decision and a living revealed monster
within the equipped weapon's reach, or the selected carried Dagger's clear sight.
Acting after paid movement closes movement; acting before
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
A carried healing potion or eligible own healing spell offers rescue before removal.
Recovery retains the original attack and CPU cursor. Declining rescue settles
a sealed bag, even near monsters or after entrapment. Carriers cannot use the
contents; a carrier death drops them again. At successful completion, fallen
heroes revive and recover only bags carried out by completing heroes. Trapped
heroes cannot use emergency healing. See RECOVERY.md for Mark’s house rule. Individual exits and terminal outcomes follow QUESTS.md.

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
board header. Heroes manually trigger attack, defence and resistance rolls; CPU rolls
automatically only after Continue on the Zargon portrait handoff. See DICE.md.

POV defaults to over-the-shoulder framing: 1000ms approach/120ms hold and 900ms
return. Movement/doors/spells and most attacks retain the miniature. One attack
in four uses a 1400ms/350ms eye view, selected by a cosmetic counter, not RNG.
Linked actions share one shot; visible CPU units transition between actors and
return at phase end. Only revealed monsters activate; their movement remains visible. Existing
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

After a defence roll blocks at least one rolled skull, the defender shows a
480ms pale-blue shield flash, bright rim and twelve deflection sparks facing
the attacker. A partial block plays before the remaining damage shove/number;
a full block still gets the cue without a damage number. Reduced motion uses
a static 300ms shield with no sparks. Geometry/materials are cached, normally
depth-tested, noninteractive and shadow-free, with no new lights or RNG. The
existing interruption/watchdog path clears both shield and health effects.

Dice-driven changes wait for the last saved stage; immediate healing waits for
its spell effect. Fresh Treasure hazards wait for card Continue, then contact-
timed arrow or pit/drop presentation (TREASURE.md). The pit owns its pose while
the shared impact component supplies only its number. These queues/poses are
transient; refresh restores the recorded outcome without replaying them.

Compact outcome feedback remains until dismissed, another action, or the next
hero turn. Automatic report acknowledgements resume the legal queue but do not
clear that readable result. Recovery is the explicit exception requiring a choice.

After acknowledging defeat, a miniature sinks straight down and fades over 700ms,
without tilting or sliding. Sink depth covers its displayed height, using owned
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

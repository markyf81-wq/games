# Basic combat and CPU Zargon

## Scope

This milestone adds original starting hero/monster statistics, adjacent melee attacks, combat dice, automatic defence, Body Point loss, defeated-piece removal, living-hero turn order and CPU turns for revealed monsters. The same combat path handles Barbarian versus Orc and all other Trial combatants. The scene retains whole-piece hopping rather than character rigging. Heroes and monsters turn towards each traversed step using the shortest yaw and keep the last facing when stopped. Facing lives in a renderer cache, not rules state; it also updates when animation is skipped and resets on a new adventure. Internal source orientation corrections and furniture layout rotations remain intact.

Setup now supports 1–4 selected hero miniatures, one per named player. Only selected characters enter state, rendering, occupancy, combined sight and turn order, retaining their canonical hero order and starting squares. The engine accepts `heroIds` containing 1–4 distinct known heroes; omitting it retains the original four-hero default. Quest encounters and stats are unchanged. The smaller-party option is explicitly requested by Mark; no automatic difficulty scaling has been added. This setup revision has source review only, with no new engine/browser checks.

This is still a partial game. Six elemental spells including healing are now available (SPELLS.md); remaining spells/potions, dagger throwing, searches, treasure/equipment changes, fallen-hero possessions and quest rewards remain unavailable. Browser autosave now restores the complete combat state as documented in SAVES.md. Starting weapons are used for melee only. The Elf and Wizard still lack six of the twelve elemental effects. A fallen hero is removed/skipped. Quest completion and retreat now follow the individual exit flow in QUESTS.md; losing the remaining heroes resolves its appropriate terminal outcome. No invented revival or replacement hero is added.

## Source ledger

One-based PDF pages in the original North American scans:

| Content | Source and locator | Implemented |
| --- | --- | --- |
| Barbarian: Attack 3, Defend 2, Body 8, Mind 2, Broadsword | `system-character-cards`, PDF p1, left face | Starting stats and weapon |
| Dwarf: 2, 2, 7, 3, Shortsword | Same, PDF p2 | Starting stats and weapon; disarming remains unavailable |
| Elf: 2, 2, 6, 4, Shortsword | Same, PDF p3 | Starting stats and weapon; spells remain unavailable |
| Wizard: 1, 2, 4, 6, Dagger | Same, PDF p4 | Starting stats and melee weapon; spells/throwing remain unavailable |
| Eight monster stat lines | `system-monster`, PDF p1, eight named faces | Movement/attack/defence/body/mind transcribed and visually reviewed |
| Starting melee weapon strengths | `system-armoury-identification-guide`, PDF p1, right Armoury, Broadsword/Shortsword/Dagger | Cross-checks character cards; buying/throwing not implemented |
| One action; move then act OR act then move, no split around action | `system-instruction-booklet`, PDF p12 rotated 180°, printed p12 | One attack; attack after any movement ends remaining movement; attack before moving permits subsequent movement |
| Ordinary adjacency and one weapon per attack | Same, PDF p12 rotated 180°, printed p13 | Orthogonal, open grid edge only; no attack across walls/closed doors or diagonally |
| Hero attack / monster defence | Same, PDF p11 upright, left printed p14 | Skulls hit; black shields block; no defence roll when no skulls; no immediate retaliation |
| Zargon and monster movement | Same, PDF p4 rotated 180°, printed p21 | Each revealed living monster acts once after all living heroes; fixed movement, pass monsters, cannot pass heroes/share squares/open doors/attack diagonally |
| Monster attack / hero defence / dead heroes | Same, PDF p3 upright, left printed p22 | Skulls hit; white shields block; Body capped at zero; fallen heroes removed. Emergency healing/possessions await their systems |
| Guardian mummy | `system-quest-book`, PDF p5, lower half, note C | The marked mummy attacks with four dice, overriding its standard three |

The six equally likely combat-die faces are 3 skulls, 2 white shields and 1 black shield. The original physical die’s standard distribution is separately corroborated by the [Ye Olde Inn dice discussion](https://forum.yeoldeinn.com/viewtopic.php?f=165&t=4530); this is a supplementary community component reference, not a scanned printed rule or a replacement for the original attack/defence sources. Runtime records distinguish that corroboration from visually reviewed cards/rules. Face order in the RNG table is arbitrary, with each slot equally likely.

Monster values (Move / Attack / Defend / Body / Mind): Goblin 10/2/1/1/1; Orc 8/3/2/1/2; Fimir 6/3/3/2/3; Skeleton 6/2/2/1/0; Zombie 5/2/3/1/0; Mummy 4/3/4/2/0; Chaos Warrior 7/4/4/3/3; Gargoyle 6/4/5/3/4. Verag uses the Gargoyle line; no extra boss power is invented.

## Commands, reports and ordering

State schema is now 3 (schema 2 migrates explicitly), content version `the-trial-combat-v1`; browser autosave uses `heroquest.session.v1` as documented in [SAVES.md](SAVES.md). Hero state adds starting weapon/armour, combat stats and current/max Body. Monster instances carry original stats and quest overrides. Global turn state adds `actionUsed`, movement `started`/`closed`, a monster activation queue/cursor, recorded report and pending report/monster-intro. Dead entities stay in state with zero Body, but leave rendering, occupancy, sight and turn scheduling. Save the full resolved state before presenting a report, restoring its outcomes/pending acknowledgement without applying damage again.

ATTACK validates the active hero, pending decisions, unused action, living target and open orthogonal adjacency. It consumes the action even on a miss. If movement already began, remaining movement ends. Rolling movement without traversing a square does not count as moving before the attack. Movement may still be broken into destination requests/reveal pauses until an attack ends that movement phase.

RESOLVE_MONSTER consumes one queued monster activation, gets a tactical plan, validates every movement edge/budget/obstacle/endpoint, and uses the shared attack/defence resolver if adjacent. It returns transient motion containing only resolved steps. CPU motion also carries per-step display visibility so the realistic sight option can hide a piece crossing out of sight. No animation applies damage, rolls dice or changes the active actor.

Combat rolls and damage resolve once in the engine. The serializable report contains attack/defence faces, skulls, matching shields, unblocked hits, actual Body lost, Body before/after and defeat status. Results are modal pending decisions; commands cannot bypass them. ACK_REPORT explicitly dismisses a report, finishing the monster phase only after its last queued activation. The controller requests the next activation from the same user Continue action. Animation completion only updates presentation and displays the pending result.

The original source says a monster/hero defends when hit, so a zero-skull attack does not consume RNG for a defence roll. Damage is capped at remaining Body; the report keeps unblocked hits separately. Neither side counterattacks during the other side’s turn.

The shared 3D tray now presents attack and defence separately: heroes press Roll,
while CPU stages auto-click it. Both stages use the recorded arrays from the same
atomic combat command; animation and human defence presentation never apply a
second outcome. The save envelope preserves the current dice stage and whether
it was rolled. See DICE.md for the supplied mesh mapping and approved checks.

Mark’s requested stairway adaptation treats its 2×2 footprint as one shared space
for hero movement, sight and melee adjacency; its internal display anchors do not
cost movement. This is documented separately from the original orthogonal rules
in DICE.md. No diagonal adjacency is added elsewhere.

## CPU policy — adaptation, not a printed rule

- Activate revealed living monsters in stable quest-instance order, once each per Zargon phase. Display sight never deactivates an already revealed monster. Unrevealed monsters do not move.
- Consider living heroes and discovered terrain through currently open edges. Do not enter unrevealed rooms, open doors or use future dice outcomes.
- Use breadth-first routes to an unoccupied square adjacent to a hero. Prefer the shortest route, breaking equal lengths by the original hero order, then stable north/east/south/west route enumeration. It may pursue a hero who is currently out of its sight, using the shared board knowledge a human Zargon has.
- Move towards that square up to the monster’s fixed movement. Pass other monsters but end on a free square; trim a partial approach if its endpoint is occupied. Heroes and furniture block movement. Monsters do not share stair squares.
- After movement, attack an adjacent living hero, breaking ties by hero order. No move/action split or bonus attack. If no attack position is reachable, wait. The policy currently always uses move-then-attack, even though the rules also allow attacking before moving.

This intentionally simple policy can congest corridors; it does not coordinate activation order or evaluate expected damage. Tactical improvements should remain separate from legal rules.

## UI and visibility

The shared green/gold UI includes starting-weapon/stats display and party Body totals. Every revealed model opens an anchored context panel with a name, a one-sentence description, and its supported actions. Attack on a monster, Open door on a door and Move here on a tile stay visible when unavailable, disabled with a reason. The sidebar retains global Roll movement/End turn and status; the old adjacent-monster selector, door-action list and destination dropdown are removed. Attack opens a cancellable modal confirmation before rolling; cancelling spends neither dice nor action. The movement roll also displays in a modal. Future card/target choices can reuse the same action-dialog content container. Result dialogs use readable named SVG skull/shield faces, separate attack/defence panels and a damage/remaining-Body summary. They use the same native-modal foundation as setup, handoff and menus and require explicit continuation. Hover and selection both use the same reach-based silhouette colour: light blue for a currently reachable destination, legal attack/door action, or model with a reachable approach square; yellow otherwise. Door approach requires a reachable endpoint. Camera-only actions do not qualify, and there is no separate selection colour. The mask/overlay render pass shares source geometry and never modifies painted materials. Only projected visible pieces/discovered tiles participate. Panels track their world anchor during camera changes and clamp inside the scene; outside click, Escape, close or action selection dismisses them. Shift + arrows navigates known tiles, [ / ] cycles revealed pieces, and Enter opens the panel, providing a keyboard path to the same actions. The journal records outcomes. All-heroes-defeated has a restart dialog.

Default physical-style display keeps revealed monsters at their current positions and updates remembered occupancy accordingly. Realistic sight keeps last-known occupancy until the figure is seen again or that remembered square is observed empty. Camera focus is chosen only from the projected visible monsters; it must not point to a hidden monster’s new coordinates.

## Verification status

The initial combat milestone received source review only. On 2026-10-21 Mark reported that Zargon’s monsters did not move or attack. A minimal engine reproduction at the first two-Orc room found the activation cursor incrementing inside `Array.find`’s predicate: searching through quest figures consumed the queue before finding its first member. The cursor now advances once before each ID lookup, outside the predicate.

The same targeted diagnostic after the fix activated monster-15, moved it three squares and resolved its attack on the solo Barbarian. Monster-16 then received its own activation/report, waiting because the first Orc occupied the doorway’s only attack position. Acknowledging both reports returned to round two with the hero handoff pending. This diagnostic used a seeded, staged first-encounter state; it was not a browser playthrough. No browser checks, builds, lint, screenshots or broad regression suite were run. Broader combat/defence/action-ordering, defeated-piece skipping, sight memory and Chrome UI checks still require Mark’s approval; the earlier exploration evidence does not validate those areas.

## Attack camera and miniature removal

Choosing Attack faces the hero towards the opponent and travels into an eye-level perspective view over 1400ms, followed by a 350ms clear-view pause before the cancellable Roll dialog. CPU monsters finish their movement, then use the same attacker view before the automatic roll dialog. The final facing remains cached; the previous shove is removed. No action/dice are consumed by the hero camera approach or Cancel.

The flight swoops downward like a bird: an early steep descent curves into a level approach behind the attacker’s head, along the attack direction. The final control point shares eye height, so the path levels out without dipping below the eyes or adding a sideways orbit. It aims at a world-space point that settles on the opponent early in the approach, with a fixed upright axis. Lens framing uses the actual camera-to-focus distance; rotation is not interpolated independently of position. A cached 128-segment travel map allocates time to both distance and view-direction changes, slowing tighter turns while keeping position and aim paired. Quintic easing gives zero velocity and acceleration at the start/end and when the focus settles. The route and total duration stay unchanged; return retraces the same map. This angle refinement has source review only.

The camera holds through dice and the outcome. Cancel or acknowledging the outcome returns to the previous board angle/zoom over 1000ms, before defeated-piece removal or another monster activation. A separate combat camera leaves the normal orthographic board view intact for saves. Its normalized projection matrix blends continuously from the exact board lens into perspective and back; matching FOV alone caused a visible depth-dependent jump. Refresh the inverse matrix after blending. CPU attack projection and held-shot updates preserve the board target, avoiding an unrelated recenter at departure. Near the attacker's head, hide its sculpt only for rendering so the camera is not inside the mesh. Only displayed actors and discovered geometry participate. The selected wall mode remains active throughout the flight and return. Automatic cutaway unprojects protected scene points to the near plane, following the actual lens throughout the orthographic/perspective blend. Finite segments allow walls to rise as the camera clears them without cutting walls beyond it. The camera's explicit eye heights follow fitted miniature bodies rather than raised weapon tips.

A defeated combatant stays visible only as the current pending report’s noninteractive visual, through dice and the outcome dialog. Continuing acknowledges/saves the report first, then tips the piece back, sinks it slightly and fades it out over 700ms. The next queued monster is presented after removal. Body, occupancy, sight and legal targets already use the resolved engine result; no dead actor is reintroduced into the rule projection. Clone fade materials per effect, restore originals and dispose clones afterwards; shared geometry/paint remains untouched.

Presentation locks gameplay. Board-camera controls pause during the attacker view; ordinary movement hops still allow camera controls. Reduced motion skips the attacker view entirely. Hidden tabs or graphics-context loss return immediately to the board and settle pending presentation promises; no extra idle loop or saved flight state is added. Refresh during an uncommitted approach returns to the saved turn; refresh during CPU presentation restores its recorded pending roll without rerunning combat or the camera move. Refresh during removal restores the acknowledged state and recorded queue.

The first-person revision on 2026-10-22 has source/diff review only. No new browser, animation, reduced-motion, context-loss or save checks were run; the earlier approved checks below predate this camera change.

## Cleanup and exit-aware turns

Shared `advanceTurn` handles End turn and EXIT_QUEST. Heroes with an exit status remain alive but leave play: `combat.inPlay` governs turn order, occupancy, sight and AI targets. A final combat report is still acknowledged before a terminal outcome. The extracted `view/figure-motion.js` retains existing motion timings and owns no gameplay state. See CODE-STRUCTURE.md and QUESTS.md. All 17 approved focused checks passed on 2026-10-22. The isolated Chrome pass exercised hero attack/CPU defence, defeated Orc removal, refresh, CPU attack/manual hero defence and return to the hero round, with portraits and 3D dice rendering and no reported console warnings/errors. Exact animation timings, interruption/accessibility modes and full combat regressions were not checked; earlier source-only notes above describe their original revisions.

## Camera handoff diagnostic — 2026-10-22

A minimal numeric diagnostic for the reported snapping used five board poses, including overhead. Starting board-versus-combat projection error was zero; the final millisecond of the return differed by less than 4e-8 NDC. The held first-person lens matched standard perspective within 4e-15 NDC, and intermediate project/unproject round trips stayed finite and accurate. This checks the projection seam only, not Chrome rendering, wall appearance, gameplay or saves. No broad regression checks were run.

Spell milestone: Rock Skin adds one effective defence die and breaks on actual
Body damage; Tempest consumes exactly one CPU activation. Fire spells use their
printed red resistance dice, not normal black-shield defence. See SPELLS.md for
source locators, scope and the current approved checks.

## Blood pools and compact spell results — 22 October 2026

After the acknowledged miniature finishes removal, `view/blood-pools.js` leaves
a small irregular dark-red stain at its square. Its opacity eases in over 900ms;
reduced motion shows the settled stain immediately. Rendering stops when the fade
finishes, and re-rendering an existing stain does not restart the fade. Shared texture/geometry, one owned fade material per stain
and deterministic per-ID rotation/scale keep allocation bounded; no idle timer,
new lights, rules blockers or picking targets. Standard materials receive the
scene's lighting and room-light masks. Stair stains sit above the printed tile.

`exploration.project` exposes a derived `fallen` list only for known casualties
on discovered terrain, excluding trapped heroes. The held pending-report figure
does not get a stain until removal completes. Existing saved Body/position data
reconstructs pools after refresh; no schema/storage change is needed. Reset or
sandbox revival hides obsolete stains. Historical discovered casualties also
appear when an existing save is opened.

Spell outcomes now size to content, use smaller result text, labelled caster and
target portraits, and one combined portrait for a self-cast. Combat roll layouts
retain their existing reserved space. These additions have source/diff review
only; no new browser, death/refresh, layout or gameplay verification was run.

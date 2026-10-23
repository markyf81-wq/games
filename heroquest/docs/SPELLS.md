# Elemental spells — original North American rules

All twelve elemental cards now have executable effects and their original scanned
card faces. The current UI is a nonmodal drawer with an inertial carousel; used
cards leave the hand and choosing a glowing board target casts immediately.
Historical implementation/check sections below retain their original scope. The spellbook shows a fanned hand with previous/next, card selection,
left/right/Home/End keys, held mouse/pen drags and thumb swipes. Cast cards leave
the hand, with used status retained in the save. The selected card's full printed
description, target and Cast button sit below the hand. Short rule summaries
remain separate from the original wording and artwork.
No potions, Chaos spells, possession transfer or general emergency-healing system
is added here.

## Sources reviewed visually, 2026-10-22

All PDFs are the original NA scans under `references/original-na/`.

| Rule/card | PDF locator | Implemented |
| --- | --- | --- |
| Dividing spells | `system-instruction-booklet`, PDF p9 upright, printed p9, Dividing The Spells | Wizard chooses first, Elf chooses from remaining groups, Wizard receives the other two; three cards per group |
| Casting / SEE | Same, PDF p10 rotated 180°, printed p15, Action 2 and SEE | Own-turn action instead of attack, once per card per quest, visible target including self; walls/closed doors/figures obstruct, furniture does not |
| Action and movement order | Same, PDF p12 rotated 180°, printed p12 | Acting after movement closes the remaining movement phase; casting before moving permits movement |
| Heal Body | `system-earth-spells`, PDF p1, upper left face | Restore up to four lost Body, capped at starting Body, one hero including self |
| Rock Skin | Same, p1, upper right face | One extra defence die; breaks on actual Body damage, not merely being attacked |
| Tempest | `system-air-spells`, PDF p1, upper right face | One monster misses its next turn; activation consumes the effect once |
| Ball of Flame | `system-fire-spells`, PDF p1, upper left face | Two Body damage; two red resistance dice, each 5/6 prevents one point |
| Fire of Wrath | Same, p1, upper right face | One Body damage unless one red resistance die is 5/6 |
| Water of Healing | `system-water-spells`, PDF p1, upper right face | Restore up to four lost Body, capped at starting Body, one hero including self |
| Genie | `system-air-spells`, PDF p1, upper left | Open a placed/revealed door without caster sight, revealing beyond, OR five combat dice against a visible monster with normal defence |
| Swift Wind | Same, p1, lower left | Four red dice on the next movement roll; if already rolled but not moved, retain those two dice and roll two additional dice |
| Pass Through Rock | `system-earth-spells`, PDF p1, lower left | Cross walls during the next move; ending in shaded solid rock traps the hero forever |
| Courage | `system-fire-spells`, PDF p1, lower left | +2 dice for one attack; ends earlier if no monster remains in the recipient's own sight — Mark explicitly chose this reading on 2026-10-22 |
| Sleep | `system-water-spells`, PDF p1, upper left | Target cannot move/attack/defend; one red die per Mind, at casting and at the start of a future activation, any 6 breaks it; Mummies/Zombies/Skeletons immune |
| Veil of Mist | Same, p1, lower left | Pass through monster squares on the next move, still end on a legal unoccupied space |
| Death / escaping death | Instruction booklet, PDF p3 upright printed p22 and PDF p2 rotated 180° printed p23 | Healing cannot target a dead hero. Emergency self-healing after a future own-turn hazard remains future work, alongside hazards/potions; never revive a fallen hero with another hero's later spell |

## Digital choices and boundaries

For a party omitting a caster, reserve that caster's share: a lone Wizard still
has three groups, a lone Elf one. Setup labels the unused group; no extra spells
or encounter scaling are granted for a small party. Defaults follow the printed
suggestion of Fire for the Wizard's first choice and Earth for the Elf.

Casting checks the individual caster's centre-to-centre grid sight with figure
occlusion, independent of the combined party display sight, remembered monsters
and the realistic-LOS presentation checkbox. It retains the existing grid corner
and user-requested four-square stair footprint. Targets exposed by the board picker
come from live heroes or the filtered revealed-monster projection; an unseen
monster's coordinates never appear as a target hint. The engine validates again. Legal spell targets join the existing light-blue
action-reach outlines and enable the model context action.

Rock Skin and Tempest cannot be stacked on an already affected target. Healing a
full-Body hero is disabled rather than wasting a card. These are UI waste guards.
All spells consume the normal action, including misses/fully resisted damage.
No normal combat defence is added to the fire spells' stated red-die resistance.

## First batch: code, saves and presentation

`data/spells.js` holds stable IDs, source locators and summaries. `rules/spells.js`
owns loadouts, individual sight, legality and effects. `CAST_SPELL` is the engine
boundary; resolution records outcomes once before display. `ui/spells.js` owns
the cancellable card drawer/board picker and sends commands, never dice or damage.

Schema 4 stores hero `spellGroups`, `spellsUsed`, `effects.rockSkin` and monster
`effects.tempest`. Base stats remain canonical: effective defence adds Rock Skin
in the combat resolver/HUD. Tempest consumes the next CPU queue activation and
records `monster-skip`, leaving subsequent activations intact. Spell reports
hold caster/target IDs, card ID, red dice, Body before/after, damage/healing and
defeat. Fire resistance uses the existing red 3D dice with CPU auto-Roll; numeric
faces are displayed individually rather than summed as movement.

The existing save key/envelope/content ID are unchanged. Schema 2/3 saves migrate
to empty spellbooks/inactive effects without changing RNG, health, discoveries,
pending reports or presentation stages; no new cards appear midway through an
existing quest. Start a new adventure to choose spells. Restart preserves a new
party's chosen groups but resets used cards/effects; restarting a legacy party
uses the default groups. Spellbook selection itself is cancellable/transient.

Fire reports save `dice: {reportId, stage: "spell", rolled}` before animation;
refresh restores recorded resistance, never reapplies damage or consumes the
card twice. Defeated spell targets use the existing held-piece/removal path.

## First batch: approved focused checks

Mark approved engine/save checks and one isolated Chrome check on 2026-10-22.
All 15 checks in ignored `tmp/check-spells.cjs` passed: allocation/rejection,
both heals/caps, invalid/dead/full/unimplemented/used targets, individual figure
and wall sight, action/movement ordering, Rock Skin defence/break timing,
Tempest queue consumption, recorded fire resistance/damage/lethal removal,
both saved spell dice stages, schema 2/3 migration, corruption preservation and
entry-script references/parsing. No separate Verag-via-spell objective fixture
was exercised.

Chrome on the separate `127.0.0.1:8879` origin covered solo Wizard setup/group
selection, enabled/disabled cards and targets, Rock Skin cast/result, refresh
with the result pending, its retained extra defence and consumed-card status,
plus the painted rack in Models. No console warnings/errors were reported.
Healing/fire resistance and Tempest were engine/save checks, not Chrome combat
playthroughs. No broad regression, full quest, mobile/accessibility-mode,
performance, build/lint or direct-file check ran. Mark's ordinary save was untouched.

## Second batch — effects, original artwork and schema 5

Mark requested the remaining spells and an illustrated hand, with the selected
card's details below. `assets/ui/spells/` contains twelve cropped original JPEG
faces and a PDF/crop/output hash manifest. `scripts/prepare_spell_cards.py` uses
Poppler/Pillow offline; runtime only uses ordinary local images. Source copyright
marks/notices are retained; no open artwork licence is asserted. No service,
module, runtime PDF processing or extra WebGL context is introduced.

Courage uses Mark's explicit one-attack ruling, with earlier expiry on sight loss.
Base Attack never changes. Genie does not use or consume Courage. Genie’s door
choice is a door already placed/revealed on the board, matching “on the board”
without disclosing hidden quest doors. It needs no caster sight/proximity. The
opened threshold provides a one-off discovery origin, revealing beyond without
moving a hero; future normal sight still comes from heroes.

Sleep resolves a saved red-die check at casting and at the start of each eligible
monster activation. On a successful wake, the activation cursor is already spent
and `monsterTurn.resumeId` preserves that same monster through the result and
ACK_REPORT interval. Its movement/attack happens only after acknowledgement,
without another wake roll or cursor increment. A failed check skips the activation.
Tempest consumes a whole missed activation before any Sleep check. Damage does
not itself break Sleep; the card does not say that it does.

Swift Wind's extra dice are genuine recorded rolls, never doubling the original
sum. Before an unrolled move, a pending buff changes the next roll to four dice.
After rolling but before traversing a square, it records two additional hero dice
and adds them to the existing movement. Casting after moving closes movement and
leaves the buff for the next turn. The sidebar/tray support two or four dice.

Veil/rock effects activate on the first positive-cost movement step, remaining
through all MOVE requests in that phase. A free shared-stair reposition does not
consume them. Pending effects survive another hero's turn; active phase flags
expire with the movement. Veil allows transit through known or encountered monsters,
never an occupied endpoint. Furniture still obstructs movement.

Pass Through Rock now uses ordinary board MOVE throughout. While active with
rolled movement remaining, hover/click black space to show one invisible grid
square and a route ribbon; no floor/room is rendered until discovered. Shift +
arrows/Enter works for these squares too. The direction-planner button/modal and
MOVE_THROUGH_ROCK command have been removed. Hidden cells all have identical
passability/cost in previews; use only the public playable mask; never preview hidden furniture or units.
Normal routes pause when new ground/rooms/entities are discovered.

Mark explicitly chose a digital ruling on 2026-10-22: this spell phases through
all objects, including furniture and units, within the quest’s playable footprint.
Mark subsequently excluded unused/off-board space from hover, selection and new
routes; playable black squares still do not reveal furniture or units.
A hero may pause in an unsafe square while moves remain; consuming the last move
there, or ending the turn there, is fatal. Stair squares retain their printed per-square sharing exception. Reach a free playable square before attacking/casting/interacting. This
broader object/last-step treatment is an approved ruling, not additional wording
on the original card. Veil of Mist's ordinary monster-transit restriction stays
separate. No extra spell/item/card or expansion content was introduced.

Unsafe endings use the existing stone-move death report and normal removal/
acknowledgement flow. Saves permit a living active phasing hero in an object or
outside the board only with rolled positive remaining movement, no pending
result and an open movement phase. They retain dead trapped heroes even if the
unit that occupied the fatal cell later moves. No additional save fields are
needed. Preview search is bounded to the playable footprint, with uniform treatment of
unrevealed objects. The validator retains a 24-cell coordinate guard for older
phasing/death saves; an old outside origin can route back into playable floor but
new routes cannot leave it. No off-board/unused square is selectable.

Schema 5 adds hero Courage/Swift Wind/Veil/rock flags and `trapped`, monster Sleep,
active movement flags and the wake resume cursor. Schema 4 migrates without
resetting groups, spent cards, Rock Skin/Tempest, pending dice or RNG; newly
implemented cards already in those books become usable. Schema 2/3 still retain
empty books. Reports add a Genie door result, Sleep check and stone-travel result.
All outcomes are saved before animation or dice presentation; refresh never
recasts, rerolls or replays a wake/activation.

Current batch: source/artwork review complete; Mark chose manual verification. The first batch's approved checks
above remain historical and do not verify these new effects/UI/migration.

Carousel refinement: held mouse/pen drags and horizontal thumb swipes update a
continuous fractional card position. Release velocity determines coast distance,
then a damped spring centres the nearest card. Details and targets update when
settled; reduced motion removes coast/spring. Previous/next, click/tap and keys
remain available. Cancel/capture loss settles without a flick; blur, hidden tab,
resize and dialog close stop motion. No idle frame loop or engine/save changes.
A minimal isolated Chrome diagnostic reproduced a fast drag, observed fractional
positions while coasting, and confirmed one centred/selected card and stopped
motion afterwards. Full printed wording appeared below it. This check preceded
the board-picker change; it does not verify the new picker or spell effects.

Full printed descriptions are separate from the short rule summaries in
src/data/spells.js, transcribed from the four visually reviewed original NA PDF
first pages. Preserve the printed wording, including Courage's wording; the
explicit one-attack implementation ruling remains documented above.

Target choices now use the shared src/ui/board-choice.js modal/board round trip,
not a target dropdown. Choose target (or Change target) temporarily hides the
spellbook. All legal, revealed targets glow blue, with camera controls retained.
Click one, or cycle [ / ] and Enter, to cast the selected spell immediately.
Cancel selection/Escape returns without spending
anything. Genie door mode offers only revealed closed doors; monster and hero
modes keep caster-specific sight and every existing rule restriction. No hidden
map hints or automatic movement arise from picking. The spellbook rechecks the
target and dispatches the ordinary saved CAST_SPELL command after selection.
Normal turn actions are disabled until the picker finishes. The generic chooser
also supports cell refs for future board-target dialogs; Pass Through Rock uses ordinary board movement, including unseen squares.
This picker has source review only; Mark chose manual verification.

Mark chose manual verification for the latest picker/approach/Zargon changes;
no additional checks were run. Cast spell cards now leave the visible hand.
Keep spellsUsed in the save and engine so refresh cannot restore spent cards.
When the hand is empty, show No spells remaining and hide target/cast controls.

Original base Game System content only: twelve original elemental cards, original
Armoury items and original decks/quests. Keep the approved digital rulings separate
from printed transcriptions. Mark chose manual verification for this latest rock
movement change; no new browser/engine/save checks were run.

## Board particles and presentation order — 22 October 2026

Every CAST_SPELL now awaits view/spell-effects.js before rendering its saved dice
or result modal. The existing command boundary still resolves and saves once,
including dice stages, card use, damage/healing and discovery. The old displayed
target stays visible during the effect; ordinary rendering applies the recorded
projection afterwards. Refresh opens the pending saved stage without replaying
particles. Genie attack still uses five recorded combat dice; its door mode
animates the already-known closed door before the opened/discovered view appears.
Sleep activation checks are not new casts and do not replay the casting effect.

| Spell | Cosmetic effect |
| --- | --- |
| Ball of Flame | Orange projectile, spherical outward explosion and falling embers |
| Fire of Wrath | Cached curling flame volumes and rising embers at the target |
| Heal Body | Green motes rise and converge from the feet into the chest |
| Water of Healing | Falling turquoise rain with repeated expanding floor ripples |
| Rock Skin | Irregular angular stone fragments settle around the body |
| Tempest | Three rotating wind ribbons plus rising funnel particles |
| Courage | Small gold sparks pulse outwards around the body |
| Swift Wind | Low horizontal pale air streams pass around the hero |
| Pass Through Rock | Fine stone-coloured dust sweeps across the body |
| Veil of Mist | A broad, low blue-green fog bank billows outwards |
| Sleep | Small violet stars hover and drift near the head |
| Genie | Incoming indigo/cyan wisps resolve into a translucent Genie silhouette with flowing body, arms and eyes |

A reused 160-particle capacity, with 48–120 active motes per recipe, a core mesh
and ring keep allocation bounded. Effects use normal alpha blending, retain
colour when overlapping, and fit their height to the target sculpt. They are
unlit and shadow-free. One permanent non-shadow point-light slot emits the
recipe colour, follows a travelling projectile, and fades with the effect; its
intensity returns to zero on finish/interruption. The pool keeps shader light
counts stable. Dungeon light barriers also mask this light against walls/doors. They use only displayed participants and never query hidden objects,
roll dice or change RNG. The camera glides to the known participants first;
automatic cutaway also protects the known effect focus. Full/low wall preferences
remain respected. Effects finish in roughly 1.5–1.85 seconds after framing.

Reduced motion skips effects; hidden/context loss/page exit finishes outstanding
waits. A bounded watchdog resolves an abandoned effect so input cannot remain
locked. Global turn controls stay locked until the sequence completes.

Focused Chrome review, 22 October: baseline authoring renders reproduced washed
out additive strands and flat spirit/sword/moon glyphs that collapsed at side
angles. These were replaced with softer, target-fitted volumetric recipes.
All twelve revised effects were rendered with production model/effect factories;
additional early/late Genie/Tempest side views and Sleep/Courage side views,
Water/Pass Through Rock overhead views were inspected without reported JS or
shader errors. Actual sandbox Genie and Tempest casts kept modals closed during
presentation, then opened their recorded dice/result stage. Refreshing the Genie
dice stage preserved the saved state and released the presentation lock.

This was a focused visual/sequencing check, not a rules, performance or full save
regression pass. Remote Genie doors, lethal casts, interruption/reduced motion
and every spell's gameplay branches still need manual coverage. No rule, RNG or
save format changes were made by this refinement.

## Fewer clicks and coloured light — 22 October 2026

Picking a legal board target now casts immediately, without reopening the book
for a second Cast click. Cancel still restores the same card/mode. A preselected
context target can still be cast directly from the book. Legality is rechecked
before dispatch; rejected commands preserve cards/RNG. Particles now span orange,
crimson, emerald/lime, cobalt/cyan, limestone, ice blue, gold, mint, bronze, teal,
violet/pink and indigo palettes, with matching local illumination. This later
revision has source/diff review only for spell UI, colours and timing; earlier
Chrome spell checks predate it.

## Current persistent cues and presentation

status-effects.js derives cues from the filtered projection: Sleep Zs, Tempest
swirls, Rock Skin stone fragments, Courage gold sparks, Strength red sparks,
Defense blue shields, Heroic Brew amber spirals, Swift Wind mint streams, Veil
teal mist and Pass Through Rock cyan shells/dust. Consumed movement magic stays
visible through its movement phase; pending dice mask status changes until their
recorded reveal. No dead/hidden/exited target or extra light/RNG is introduced.
Cues follow displayed models/hops and hide with the temporary eye-view sculpt.
Reduced motion uses static cues; hidden/context loss uses the shared finish path.

Finite casts now combine cached particles and spell objects. Fire of Wrath adds
18 curling flame tongues; Tempest uses three ribbons; Genie adds a spirit after
its incoming wisps; Rock Skin uses 16 fragments. All twelve recipes have distinct
motion/colour and one shared non-shadow light, masked by dungeon barriers.
Geometry/particles finish before recorded resistance dice or compact outcome
feedback. Later colour/shape/status revisions have source/diff review only;
earlier approved effect checks do not certify these additions. See
CODE-STRUCTURE.md for component/lifecycle ownership.

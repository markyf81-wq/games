# Hero possessions, equipment and healing

## Equipment milestone, 24 October 2026

Original authority: `system-armoury-identification-guide.pdf`, page 1, right-hand
Armoury, visually reviewed. Supported carried gear now includes Dagger (1 attack),
Shortsword (2), Broadsword (3), Battle Axe (4), Staff (1), Longsword (3), Crossbow (3), Helmet (+1 defence), Shield (+1),
Chain Mail (+1) and Plate Mail (+2). Body armour occupies one slot; Helmet and
Shield stack with it. Battle Axe uses both hands and puts an equipped Shield
away atomically. Staff also disallows a Shield and puts it away when equipped.
Staff (100 gold) and Longsword (350 gold) permit diagonal attacks one square away,
using the existing clear-corner edge trace; neither extends to two squares.
The Wizard may equip the Dagger or Staff from this weapon/armour set; he may still
carry other items. Tool Kit works when carried and needs no equipment slot.

Crossbow costs 350 gold and shoots any monster in clear sight except an
orthogonally adjacent one. It has unlimited ammunition, permits a Shield and
cannot be used by the Wizard. Diagonal shots are permitted. The equipped HUD
shows Ranged and monster contexts offer Shoot; normal rolls/action order apply.
Crossbow artwork comes from the archived drathe layout, with rule authority
remaining the original Armoury. See COMBAT.md for sight and presentation.

Dagger may be thrown from the monster's context, whether equipped or carried.
It rolls one attack die plus active bonuses, uses normal blocked sight and is
lost on hit or miss when Roll commits the attack. Cancel beforehand retains it.
An equipped thrown Dagger is replaced by a spare Dagger, if owned; otherwise the
hero is unarmed with one orthogonal attack die until another weapon is equipped.
Throwing a carried copy leaves the current weapon equipped. See COMBAT.md for
the original sources and the weaponless fallback interpretation.

Ordinary Armoury gear has no shared one-copy stock limit in the North American
rules. Each owned copy has its own inventory ID; several heroes can own the same
kind. The equipment card images are presentation, not a limited physical deck.
Printed p23 permits purchases between quests without specifying stock counts.
Quest treasures/artifacts retain their individual quest instructions; no general
artifact duplication is implied. ARMOURY.md covers the implemented between-quest shop.

Inventory offers Equip for carried gear and Unequip for worn armour/headgear/
shield. Weapons are replaced by equipping another carried weapon; there is no
unarmed command. The drawer remains open and retains the selected card/list
position. Carried and Equipped labels are separate, with a live attack/defence/
normal-movement summary. New armour/Battle Axe images use the existing drathe
presentation, with rules taken only from the original Armoury.
Equipped items stand out in the inventory grid with a teal background, thicker
green border and bold Equipped label. Selecting one adds a gold ring while
retaining its equipped styling. No equipment icon strip appears on the board.

SET_EQUIPMENT carries heroId, itemId and an explicit equip boolean. Rules check
ownership, the owner's living active turn, no pending result and safe ground.
It spends no action, movement, gold or RNG. The original sheet does not specify
equipment-change timing; own-turn changes between completed actions are the
digital UI policy. Body armour is locked once movement has been rolled, so
removing Plate Mail cannot retroactively change an already-recorded roll.

Plate Mail uses one red movement die. Swift Wind doubles the usual dice count:
two in Plate Mail, four otherwise; when applied after rolling but before moving,
it adds the corresponding one/two extra dice. movement.swiftWind records the
buff separately from dice count for status visuals and save validation.

Schema 9 adds inventory.equipped weapon/armour/head/shield item-ID references.
The existing hero.weapon/armour fields mirror the selected kinds; attack/defend
remain original base stats and bonuses are derived. Schemas 2–8 migrate only
their existing starting weapon into its slot, without granting items or changing
recorded dice/RNG. Equipment references, slot compatibility and Wizard/two-hand
restrictions are validated on load/import; pending old reports remain readable.

Sandbox → Equipment loadout → Prepare equipment practice starts a separate fresh
practice fixture carrying the supported gear. Presets supply Helmet/Shield with
Chain or Plate Mail, or Battle Axe/Helmet/Plate Mail. The Wizard keeps his Dagger
and carries the restricted gear for eligibility inspection; the Staff preset
equips his allowed diagonal weapon. Staff/Longsword presets try to place the
opponent on a clear diagonal. The Crossbow preset equips an eligible hero and
tries to place the opponent on a clear ranged line. Give maximum movement
respects the normal dice count (6 in Plate Mail, 12 otherwise).

Shopping, acquiring equipment in the live quest, weapon/gold trading and
equipment-driven changes to the miniature sculpts remain out of
this slice. Source/diff and offline artwork review only; no engine/save/browser
tests, builds, lint or typechecks ran. Mark retains manual validation.

Each selected hero owns an inventory. The nonmodal Inventory drawer shares the
spell drawer's position/finish; only one opens at once. Choose a hero in the
drawer, or open Inventory from that miniature's context panel. It displays Body
hearts, personal gold, carried equipment/potions and current attack/defence/base
movement. Equipped items are distinct from items merely carried.
Identical items group visually; stacks larger than one show their total in the
inventory card's upper-right corner, including when one copy is equipped.
Consumption removes one uniquely identified instance. Original card wording is distinct from the short action hint. Each item has a
matching card thumbnail. A wider two-column drawer keeps an independently
scrollable grid of possessions beside a reserved full-card preview. The selected
card fits its preview without cropping; its description scrolls separately below,
and Drink stays in the footer. Hero selection/health/gold share a compact header.
Narrow screens use a single thumbnail column beside the preview. Selection keeps
the item list's scroll position and keyboard focus while resetting the detail text;
it updates the detail panel/pressed states without rebuilding the item grid.
The four potions reuse original Treasure artwork. The three starting weapons
use the archived drathe equipment-card presentation for artwork only; these
cards were not an original NA deck and do not change Armoury rule authority or
override the executable equipment rules. Offline crop provenance lives in
assets/ui/equipment/README.md and sources.json. No card image enters saves.

New adventures start with the original character-card weapon, no armour, zero
gold and no potions. Existing saves gain only that already-equipped weapon and
empty treasure holdings. No bonus loot or replenishment is granted on refresh.
Gold sharing remains unfinished; item trading and the between-quest Armoury are implemented. Fallen-hero possessions and
emergency own healing now use the recovery flow in RECOVERY.md. Melee/armour
equipment changes and potion sharing are implemented below. The subsequent treasure milestone now finds all four base treasure
potions and implements their effects; see TREASURE.md for the current behaviour.
The sections below retain the healing foundation's original review context.

## Reviewed sources

- `system-character-cards`, PDF pages 1–4: starting weapons and no starting armour.
- `system-armoury-identification-guide`, PDF page 1, right: Broadsword,
  Shortsword and Dagger attack strengths; Dagger throwing and loss on hit or miss.
- `system-quest-book`, PDF page 15 upright, Quest 6 General Notes: one attack die
  without a weapon, used as precedent for the thrown-last-Dagger fallback.
- `system-treasure`, PDF page 2 upper/lower right and page 3 upper left: three
  identical Potion of Healing cards. Drink once; heal one red die's value, capped
  at starting Body. Full original description is in data/items.js.
- `system-instruction-booklet`, PDF page 8 rotated 180 degrees, printed page 17,
  Potions: drinking is permitted at any time, restoring lost Body up to the
  original maximum. Passing potions is now implemented below.
- Same booklet, PDF page 3, printed page 22, How A Hero Escapes Death, paragraph 1:
  a hero reduced to zero can immediately drink their own healing potion.

Scans are under references/original-na/ and indexed in references/sources.json.
No remake or fan equipment-card rules were adopted.

## Engine and presentation

data/items.js owns source-linked definitions; rules/inventory.js owns starting
holdings, eligibility, recovery detection and recorded consumption. USE_ITEM
carries heroId/itemId. The engine validates ownership, consumes one potion,
draws one recorded red die, heals and logs the result. Movement, actionUsed,
spell effects, turn index and CPU activation cursor are preserved. Living heroes
can drink between presentation stages on another hero's or Zargon's turn.
Device handoffs and active rolls/animations must finish first. Inventory
inspection suspends automatic CPU progression until the drawer closes.

Drink & roll is the explicit human roll trigger. It uses the existing sidebar
3D tray, never a new modal. Save before animation. lastItemUse stores the
independent potion record while lastReport/pending retain the ongoing combat
or CPU sequence. The saved `item` dice stage references lastItemUse.id. Refresh
shows the recorded result without another consumption or die draw. Read-only
HUD/party/inventory Body display uses bodyBefore until the roll settles.

After lethal combat, a carried potion delays final defeat/removal. The outcome
panel offers Drink healing potion & roll and Let hero fall. No automatic
acknowledgement skips this choice. Recovery annotates the original attack report,
restores the same hero, then continues the existing queue. The recorded attack's
damage/dice stay intact. Let hero fall explicitly acknowledges defeat, then
removes the miniature and evaluates the quest normally. Potions cannot rescue
Pass Through Rock entrapment, an exited hero or an already removed hero.

The recovery flow also handles emergency own healing spells, standard
inheritance/loss and optional fair-mode bag pickup/completion revival. Bag contents never enter the carrier’s usable
inventory: only their original owner can regain them after successful completion. See RECOVERY.md for sources,
timing/corridor interpretations, migration and manual practice.

## Saves and manual practice

State schema 6 adds hero.inventory and lastItemUse; keys, envelope and content ID
stay unchanged. Schemas 2–5 migrate through existing validation. Validate unique
instance IDs across the party, known kinds, personal gold, the original equipped
weapon, potion arithmetic, consumed-instance absence and the optional combat
recovery reference. A pending recoverable lethal report is valid even if no hero
currently has positive Body. Invalid saves remain preserved.

Sandbox tools add Prepare inventory / potions (selected hero, 200 practice gold,
two potions, reduced Body) and Prepare potion rescue (1 Body, one additional
potion and an Orc). Existing placement and CPU tools can arrange an adjacent
attack. These fixtures affect only the separate practice save.

Review: source/diff review only. No engine/save tests, browser automation,
screenshots, builds or lint ran. Mark retains manual verification. Suggested
checks: ordinary/full-Body use, action/movement preservation, off-turn use, refresh
mid-roll, potion depletion, lethal rescue/decline, CPU continuation, legacy
migration, and separation of adventure/practice inventories.

## Next search presentation

Treasure search now reveals a card directly from a face-down stack using the
original Treasure back (system-treasure PDF page 4, visually reviewed); no
additional Draw confirmation. Physical duplicates, quest overrides and all
hazard/monster handlers are implemented together in the subsequent schema 7
milestone. See TREASURE.md; source/diff review only, still manually unverified.

Secret doors are implemented as discoverable stone panels in tall walls. They
share brick colours, cutaway and light masks; the white inset/question mark is
shown only after discovery and the panel slides away on opening. See TRAPS.md
for search/opening timing and practice scenarios.

## Giving items

First Light printed pp15–16 clarifies trading: give a potion, weapon or other
supported item to an adjacent hero on the giver's own turn, provided neither
hero is beside a living monster. This free interaction costs no action,
movement or RNG. Adjacency uses occupied tiles and wall/door edges, not meshes.

Select an item in Inventory, choose Give, then click a glowing eligible hero.
Cancel restores the unchanged selection. GIVE_ITEM rechecks both heroes,
ownership, adjacency, monster proximity, safe ground and capacity. Transfer
one exact instance, preserving Treasure provenance; never clone or apply it.
Received gear is carried and must be equipped separately. Giving equipped gear
clears its old slot; a same-kind spare weapon remains equipped, otherwise the
giver becomes unarmed. Equipped body armour cannot be given after rolling
movement, retaining the existing armour timing policy.

The same removal helper handles thrown Daggers and equipment transfers.
Gold transfer remains future work. Between-quest buying/selling/equipping is now
implemented in the Armoury; see ARMOURY.md.
No engine/save/browser checks ran; Mark retains manual verification.

The current drawer reuses unchanged hero options and item buttons. Counts,
equipped/selected states and the details card update in place; only a changed
item-kind order replaces the grid's children. Full card space, keyboard focus
and scroll positions remain part of the layout contract. Source review only.

Armoury purchases add carried items to these same inventories; sell/equip uses the
same slot/removal helpers. Full equipment details remain separate from card art.
See ARMOURY.md for access, prices, save handling and manual-review limits.

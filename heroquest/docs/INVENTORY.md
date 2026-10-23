# Hero possessions and healing — first slice

Each selected hero owns an inventory. The nonmodal Inventory drawer shares the
spell drawer's position/finish; only one opens at once. Choose a hero in the
drawer, or open Inventory from that miniature's context panel. It displays Body
hearts, personal gold, the equipped starting weapon and carried potions.
Identical items group visually; consumption removes one uniquely identified
instance. Original card wording is distinct from the short action hint. Each item has a
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
enable unfinished weapon actions. Offline crop provenance lives in
assets/ui/equipment/README.md and sources.json. No card image enters saves.

New adventures start with the original character-card weapon, no armour, zero
gold and no potions. Existing saves gain only that already-equipped weapon and
empty treasure holdings. No bonus loot or replenishment is granted on refresh.
Other weapons, equipment changes, gold/equipment trading, shops and corpse recovery
remain unfinished. Potion sharing is now implemented as described below. The subsequent treasure milestone now finds all four base treasure
potions and implements their effects; see TREASURE.md for the current behaviour.
The sections below retain the healing foundation's original review context.

## Reviewed sources

- `system-character-cards`, PDF pages 1–4: starting weapons and no starting armour.
- `system-armoury-identification-guide`, PDF page 1, right: Broadsword,
  Shortsword and Dagger attack strengths. Dagger throwing remains unfinished.
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

This slice handles potion rescue only. The booklet's separate emergency
self-healing-spell exception remains in the death/recovery backlog.

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

Secret-door proposal: ordinary matching masonry before discovery; after the
original search rules reveal it, a stone panel slides/pivots aside inside a
matching frame. Reuse brick colours and full/low/cutaway clipping, with an actual
passable opening and matching sight/light barriers. No undiscovered seam, glow
or picking hint may expose it. Audit printed discovery/opening timing before
implementation. No secret-door model is added yet.

## Giving a potion

Original source: system-instruction-booklet PDF page 8 rotated 180 degrees,
printed page 17, Potions, final sentence (visually inspected 23 October 2026).
A hero can give one potion to a fellow hero only on the giver's own turn. This
paragraph states no adjacency or sight requirement; none is invented here.
Giving is a free interaction rather than one of the six listed actions.

Select a potion in the Inventory drawer and click Give. The same cancellable
board picker used for spells highlights the other living heroes in the dungeon.
Clicking one transfers a single uniquely identified potion and returns to the
giver's drawer. Escape/Cancel returns to the unchanged item selection. No extra
confirmation or recipient dropdown. Give stays visible but disabled outside the
owner's turn, with no recipients, or during a pending handoff/result. Defeated,
exited/trapped heroes cannot receive one; phasing heroes must first reach a free
square. Drinking still has its existing off-turn and rescue permissions.

GIVE_ITEM carries heroId, itemId and targetId. Rules recheck ownership, potion
category and both heroes; then transfer the same item record between inventories.
Nothing is consumed, cloned, rolled or applied to the recipient. Movement,
actionUsed, spell/potion effects, gold, turn/CPU state and RNG are preserved.
The journal records the transfer and the ordinary accepted-command save runs
before the drawer reopens. Existing schema 7 unique-item and treasure provenance
validation already supports ownership moving between heroes, so no migration,
new field or persistent picker is needed. General weapon/gold trading remains
unfinished. Source/diff and original-page authoring review only; no engine/save
or browser tests ran. Manual practice: prepare potions in a party of 2+ heroes,
give one, inspect both inventories, refresh, and try Cancel/off-turn/no-recipient.

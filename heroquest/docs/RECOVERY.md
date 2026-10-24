# Hero death and loot recovery

## Default: standard recovery

First Light printed p17 clarifies the original death/possessions rule. At zero
Body, a hero can use their own immediate healing if eligible. Otherwise they
remain dead for the rest of the quest; there is no automatic revival.

On final report acknowledgement, a living companion in the same room or known
straight corridor section receives the fallen hero's carried items and gold,
without spending an action. One eligible companion is automatic; several offer
a cancellable board picker before the death can be acknowledged. Inherited gear
is carried, not automatically equipped. With no eligible companion the possessions
are lost, even if no monster miniature is present. Entrapment leaves inaccessible
possessions, which are lost under this default. Inventory capacity and safe-gold
bounds still apply. The original owner becomes unarmed with an empty inventory.

Next-quest replacement characters and campaign progression remain future work.

## Optional: Fair loot recovery

Setup and Adventure menu offer Fair loot recovery, off by default. SET_RULES
saves the choice without spending movement, action or RNG. Changes apply to
future deaths; pending results must finish before changing it. Every existing
sealed bag retains its original recovery behaviour after switching the option off.

- Every fair-mode finalized death drops a sealed bag containing exact item IDs,
  gold and equipped slots, including empty inventories and entrapment. Unsafe
  deaths use the nearest known clear floor square.
- A companion can pick up the bag for free from an orthogonally adjacent tile,
  with no wall or closed door between them. Diagonal or room-wide pickup is not allowed.
  Bags do not block movement/sight. Contents remain reserved for their owner and
  never enter the carrier's usable inventory.
- A carrier's death drops all carried bags intact, whichever rule is now selected.
- On successful quest completion, owners of sealed bags revive with full Body,
  refreshed spells and cleared statuses. Only bags carried out by a hero with
  a completed exit return their contents and original equipped slots. Early
  retreat/unrecovered bags lose their contents; no free gear is granted.
- Retreat/defeat does not trigger revival. Standard-rule deaths do not revive,
  even when the setting is enabled later.

This optional sealed-bag/revival behaviour is Mark's house rule.

## Emergency healing

Original North American printed pp22–23 and First Light p17 permit immediate own
healing at zero Body, before removal. Own potions or an unused own healing
spell/action can rescue the hero; another hero cannot save a defeated hero.
Track the last own-turn action through Zargon's turn and reset it at handoff.
An unused action permits off-turn emergency self-healing; Mark delegated this
timing choice. No late, third-party or entrapment rescue.

RECOVER_SPELL consumes a card/action, restores four capped Body and annotates
the original lethal report. Potion recovery retains its independent manual die.
The report, recorded dice and CPU cursor remain intact; refresh never repeats
healing. Saving oneself avoids a finalized death and loot transfer/drop.

## Ownership and saves

rules/recovery.js owns casualty/healing eligibility, heirs, drops, pickup and
completion. ACK_REPORT rechecks an optional recipientId and finalizes once.
TAKE_BELONGINGS only records carrierId; it cannot equip or consume bag contents.

Schema 14 adds settings.fairLootRecovery, default false. Schemas 2–13 acquire
that false setting while keeping any saved bags/terminal recovery records.
Schema-12 bags gain null carrier/equipment slots. Historical inherited/lost
possessions are never reconstructed or taken back from allies.

The null-or-array questRecovery ledger settles only saved sealed bags once on
victory after pending reports finish. It can be a subset of all fallen heroes.
Revived owners keep deathResolved so they do not re-enter the finished board.
Validate carrier lifecycle, item uniqueness/Treasure provenance, equipment slots,
historical return counts and completed-exit carriers. Schema 15 allows later
Armoury trades to change current holdings/gold without rewriting those return
totals. RNG and pending stages remain unchanged.

## Manual practice and review limits

Sandbox death practice uses the Adventure menu Fair loot recovery setting,
with unused/spent healing, nearby-companion, unattended death and lethal Treasure
fixtures. All presets preserve the selected rule; no duplicate selector. Check
both modes, multiple-heir selection/cancellation, bag carrier death, mode changes,
completion versus retreat and save/refresh in a dedicated manual pass.
Source/diff review only; no engine/save/browser checks, builds or lint were run.

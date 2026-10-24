# Between-quest Armoury

## Sources and scope

Original North American Armoury/identification spread, PDF page 1, supplies the
existing twelve equipment prices/effects in data/items.js. No new or remake-only
items are introduced. Original booklet printed p23 places shopping between quests.
First Light printed p19 clarifies unlimited stock and half-price sellback rounded
down: a 25-gold Dagger sells for 12, a 125-gold Helmet for 62. See
EDITION-COMPARISON.md for official links. Potions and sealed bags are not sold.

## Player flow

After the entire party leaves/falls and final reports finish, the outcome screen
has Visit Armoury. Surviving exited heroes and fair-mode revived heroes may shop;
standard dead heroes cannot. Retreating survivors can shop too. Choose a hero,
browse Buy equipment or Sell / equip, and read the full card plus canonical rule
text. Archived card artwork is presentation; original Armoury definitions govern.

Purchases use that hero's gold and add one carried item. Stock is unlimited;
buying never equips automatically. Any hero may carry an item, but existing Wizard
and equipment restrictions still govern equipping. Owned copies are grouped with
counts. Selling chooses an unequipped copy first and sells one exact instance.
Selling worn gear clears its slot; an equipped last weapon leaves the hero unarmed.
Owned equipment can be equipped/unequipped between quests with the same slot rules.

Done/Escape returns to results. Trades save immediately. Purchases remain in this
saved party, including after refresh/export/import and continuing to the next
quest. New adventures create fresh parties; Restart restores this attempt’s entry
loadout. See CAMPAIGN.md. No invented Trial completion gold is awarded.

## Engine and persistence

rules/armoury.js owns eligibility, stock, prices and arithmetic. BUY_EQUIPMENT and
SELL_EQUIPMENT recheck the selected hero, terminal quest/no pending result, owned
instance, funds, inventory capacity and safe gold bounds. They cost no action,
movement or RNG. SET_EQUIPMENT permits eligible between-quest visitors as well as
its existing own-turn use. ui/armoury.js never mutates gameplay state.

Purchases use armoury-<nextEventId> IDs and log the transaction before saving;
ordinary item uniqueness/equipment validation applies. Sales use the same removal
helper as giving/throwing. Schema 15 retains keys/envelope/content and all previous
fields. questRecovery counts now remain historical return totals rather than
requiring current gold/item counts to equal them after legal shopping. Revived
hero lifecycle, return carrier identity, bounded counts/gold and current inventory
validation remain guarded. Existing migrations preserve all owned gear and gold.

## Manual practice and review

Sandbox tools → Prepare Armoury creates an ended practice session with 2,000 gold
per hero and opens the shop. It keeps the selected Fair loot recovery setting.
Buy/sell/equip there, close it and reset a hero's turn to try the equipment in play.
Practice funds/items never enter the separate adventure save.

Suggested focused checks: unaffordable buys, repeated copies, Dagger/Helmet rounded
sellback, selling a spare versus worn/last weapon, Wizard restrictions, two-handed
weapon/Shield, Plate Mail, revival followed by trades, refresh/export/import and
rejection during an active/pending quest. These checks have not been run. Source
and focused diff review only; Mark retains manual verification.

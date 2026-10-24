# HeroQuest content guide

## Edition and authenticity

Use the original North American base Game System from Mark's [Ye Olde Inn index](https://north-american.yeoldeinn.com/system.php). Keep original names, narrative, quest order, map placements, printed statistics, card wording, treasure multiplicities, prices, and restrictions. Presentation and original artwork can change without changing those mechanics.

Do not blend this material with the 2021 remake or the European edition. Use Fimir, Chaos Warrior, Chaos spells, and original proper names. Mark reaffirmed on 2026-10-22 that only the original base game's spells, items and cards belong in this implementation. Exclude expansions, fan cards and remake-only content; do not add additional content packs without an explicit request. Keep approved digital rulings separately documented rather than presenting them as printed rules.

## Source authority

A quest instruction governs that quest and a card effect governs its stated scope. General rules come from the original instruction booklet. Equipment comes from the original Armoury, with the screen and monster/hero cards available for cross-reference. Record genuine disagreements in a ruling log before implementing them; source precedence does not justify silently resolving every ambiguity.

The index's equipment PDF is a fan-made card presentation by drathe. Verify prices and effects against `system-armoury-identification-guide`, especially restrictions and interactions. Its design is useful as a reference, but it is not an original deck from the box.

## Inventory targets

Starting weapons, personal gold and all four base treasure potions are defined
in data/items.js/rules/inventory.js. Original 24-card searches/deck and The Trial's
A/B/D/E finds are implemented in data/treasure.js/rules/treasure.js. TREASURE.md
records the complete visual card audit, negative-note interpretation and limits.
Item trading and Armoury equipment acquisition are implemented; gold sharing
and other decks remain future work. This does
not certify the remaining targets below.

These targets come from the index, not a completed record-by-record audit:

| Category | Target | Primary source ID |
| --- | --- | --- |
| Original campaign | 14 quests | `system-quest-book` |
| Heroes | 4 character cards | `system-character-cards` |
| Monsters | 8 standard monster cards | `system-monster` |
| Artifacts | 10 cards | `system-artifacts` |
| Chaos spells | 12 cards | `system-chaos-spells` |
| Treasure | 24 physical cards, including duplicates | `system-treasure` |
| Air spells | 3 cards | `system-air-spells` |
| Earth spells | 3 cards | `system-earth-spells` |
| Fire spells | 3 cards | `system-fire-spells` |
| Water spells | 3 cards | `system-water-spells` |
| Equipment | 12 entries; cross-check the original Armoury | `system-armoury-identification-guide` |

The 66-card deck total excludes the four character cards and the fan equipment cards. A named special enemy may use overridden statistics or a different physical figure; do not infer its abilities solely from the model used to represent it.

## Content record format

Each record should have a stable ID, edition ID (`original-na`), original display name, source references, review status, and explicit structured rules. Keep verbatim text distinct from mechanics; do not generate a paraphrase and present it as the original card.

Use source references such as:

```js
{
  sourceId: "system-monster",
  pdfPage: 1,
  printedLocator: "Chaos Warrior card, top left",
  reviewStatus: "visually-reviewed"
}
```

The monster sheet is one example whose layout has been visually inspected. The Trial exploration records are now implemented with source locators; see EXPLORATION.md. This is not a complete card/stat audit. A complete review must cover every relevant face, value, restriction, duration, and exception.

For cards, distinguish a reusable definition from physical instances. Treasure instances need independent IDs so duplicates retain the correct probability and return/discard behaviour. Persist deck order and ownership; never reconstruct a deck from unique card names after a reload.

For quests, record each room/area, cell/edge coordinate, furniture footprint/orientation, monster instance, named override, hidden feature, narrative passage, objective, exit, reward, and trigger. Adopt one board orientation and record its relation to the scan before transcribing coordinates. Booklet rotation must never mirror or transpose a map.

## Review sequence

1. Establish a reading map for the booklet PDFs: PDF page, printed page, region, and rotation.
2. Transcribe hero and monster statistics, equipment, dice faces, and ordinary turn timing.
3. Transcribe each card's original text and executable effect requirements.
4. Trace the reusable board topology and map symbol legend.
5. Transcribe The Trial, including all quest notes and restrictions, then the remaining campaign in order.
6. Compare the structured content with the source images before implementing each effect or quest.

Do not treat a successful download, PDF parse, OCR pass, or matching hash as a content review.

Initial locator notes from the original scan: the quest book's PDF page 4 contains The Trial's map in the lower half, rotated 180 degrees; PDF page 5 contains the blank board above its narrative and notes. Keep both references attached to the quest transcription. The Armoury/identification spread and the eight standard monster cards are each on PDF page 1 of their respective sources. These spot inspections establish locators, not completion of the full audit.

## Rules requiring explicit decisions

During the original-rule audit, record source-linked answers for:

- Movement/action ordering, free door interactions, route interruptions, passing other figures, and legal destinations.
- Discovery versus targeting line of sight, blockers, corners, room reveals, and secret doors.
- Search eligibility, room/corridor scope, per-hero limits, special treasure, hazards, wandering-monster placement, and reshuffling.
- Trap discovery, jumping, disarming, triggered trap persistence, movement ending, and the dwarf's special rule.
- Weapon restrictions, diagonal/ranged attacks, equipment combinations, thrown/lost items, and movement penalties.
- Spell targets, duration, termination, resistance rolls, summons, and interactions with Mind Points.
- Damage resolution, emergency healing, hero death, possessions, quest exit, and campaign recovery.
- Physical component limits, special monster representation, quest overrides, rewards, and lost artifacts.

These are audit topics, not adopted house rules. Pending interpretations must remain explicit.

## CPU decisions and interface assistance

Target selection, tactical movement, monster activation order, and spell timing are policies that a human Zargon normally supplies. Put these in a separate automation policy document when chosen. They may not change a monster's legal powers, movement, dice, or quest instructions.

Legal-action highlighting, automatic arithmetic, recorded dice, and turn prompts can assist players while preserving the rules. Reachability and previews must use the hero's discovered information so they do not disclose hidden traps, monsters, treasures, or quest events.

Mark's digital presentation choice hides undiscovered terrain completely. Discovered terrain, furniture and living miniatures remain visible, as pieces do on the physical board. Scene lighting controls floor brightness. There is no realistic line-of-sight display option; discovery, targeting, searching and quest triggers retain their sight rules. The separate visual studio retains a fixed explored-room example.

## Review ledger

For subsequent transcription, add rows with: content ID, source/locator, transcription status, visual review status, ambiguity/ruling, implemented handler, and approved verification evidence. Keep `not-transcribed`, `transcribed`, `visually-reviewed`, and `implemented` distinct. The limited reviewed/implemented exploration ledger is in [EXPLORATION.md](EXPLORATION.md); the remaining rules/cards/quests are not certified complete.

## Newer-edition comparison

Mark requested a read-only comparison with the 2021 remake and First Light.
[EDITION-COMPARISON.md](EDITION-COMPARISON.md) records official sources and
relevant clarifications adopted with Mark’s approval: standard death/loot, solid
furniture, adjacent trading and Armoury stock/sellback. Original North American
cards, equipment prices and quest content remain authoritative.

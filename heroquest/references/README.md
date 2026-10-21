# HeroQuest reference collection

The original North American Game System is the content baseline. Use the [system index](https://north-american.yeoldeinn.com/system.php) to locate the original documents, and the machine-readable [source manifest](sources.json) to find explicit download URLs and local paths.

## Source precedence

| Material | Use |
| --- | --- |
| Original North American instruction booklet | General rules and timing |
| Original North American quest book | Quest-specific layouts, narrative, objectives, encounters, rewards, and exceptions |
| Original cards | Printed statistics, card wording, targets, duration, and restrictions |
| Original Armoury and identification guide | Equipment prices/restrictions and map symbols |
| Original Game Master's screen | Monster statistics and rules reference; reconcile conflicts explicitly |
| Original tiles, character sheet, and leaflet | Component/visual reference |
| Equipment cards by drathe | Fan-made presentation of Armoury entries; secondary reference |
| Hasbro 2021 rulebook | Modern comparison only; cannot override the chosen edition |
| Miniature and furniture photographs | Shape, scale, colour, base, and silhouette references |

The index's card totals are inventory targets, not a complete transcription. Its original base deck comprises 10 artifacts, 12 Chaos spells, 8 monster cards, 24 treasure cards, and 12 elemental spells (66 cards), plus four character cards. The 12 fan-made equipment cards are separate.

The index also links localisations of The Maze and The Dark Company. They are outside the initial original North American 14-quest campaign.

## Local files

- `original-na/`: unchanged original scans and character sheet.
- `fan-reference/`: explicitly labelled fan material.
- `modern-comparison/`: the earlier Hasbro reference.
- `visual/`: selected original base-system component pictures.
- `heroquest-*-source.html`: raw source snapshots for link discovery; do not execute these pages locally.
- `downloads.local.json`: download status, bytes, source URL, and SHA-256 for each binary.

Downloads and snapshots are ignored by Git; this README, `sources.json`, and the retrieval script are tracked candidates. Preserve embedded credits and notices in the unchanged scans. Keeping a reference locally does not mark it as an approved runtime asset.

## Retrieval

```sh
python3 heroquest/scripts/fetch_references.py
python3 heroquest/scripts/fetch_references.py --only system-instruction-booklet system-monster
```

The site sometimes returns an HTML verification page instead of a file. The utility rejects incorrect signatures and leaves failed entries in its inventory. A hash identifies the downloaded bytes; it does not prove a scan or card is complete. Before implementing a record, visually inspect the relevant printed face/map and enter its source locator and review status.

Some PDFs use booklet print order. Record the 1-based PDF page plus the printed page or card name and region (top/bottom, left/right) when needed. Do not assume PDF page order matches quest order. OCR output is a draft and must be checked against the scan, especially symbols, numbers, names, negations, and treasure duplicates.

## User-supplied STL collection

On 2026-10-21 Mark supplied four ZIP archives containing 40 STL files from a shared personal drive: 18 miniature components, 15 furniture components, one combat die and six tiles. Original ZIPs and extracted STLs are preserved in ignored `stl-source/`, with hashes and source membership in `stl-source/inventory.json`. No archive scripts are executed.

Mark describes the collection as open licence. The archives contain no licence, creator or original-link documents, and Mark does not know those details. This is user-reported provenance, not an independently verified licence assignment.

Browser derivatives and tracked conversion provenance are under `../assets/models/imported/`; see `../assets/models/README.md`. The Trial loads its required sculpts, with a generated bookshelf placeholder still awaiting replacement and a separately supplied weapons-rack sculpt now integrated. Other derivatives can be multi-part or unreviewed printing components, and their names do not define authentic rules or grid footprints.

## Runtime artwork crops

The supplied board image `ww7sy558ez381.jpg` is retained as
`visual/user-board-scan.jpg`; creator and official/recreation status are unknown.
It now supplies the runtime floor atlas. The actual stair tile is cropped from
`original-na/system-tiles.pdf` page 1. Source scans remain unchanged; only selected
crops are deployed, with source/hash/changes and the tile sheet's notices recorded
in `assets/textures/board/README.md` and `assets/textures/tiles/README.md`.

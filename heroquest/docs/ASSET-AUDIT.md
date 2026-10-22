# Current quest model and artwork audit

Reviewed against actual factories and the supplied component catalog, updated 2026-10-22.

| Component | Current implementation | Available work/resources |
| --- | --- | --- |
| Four heroes | Supplied STL sculpts; Barbarian and Wizard have seam-cut multi-region paint; all hero bases are dark grey | Paint Dwarf and Elf from existing visual references |
| Eight monster types | Supplied STL sculpts; three Orc and three Goblin weapon varieties integrated; simple base colours | Paint existing geometry; assemble supplied gargoyle wings |
| Gargoyle wings | Prepared STL, not assembled | Existing `gargoyle-wings` source; no new model needed |
| Closed / open doors | Supplied stone arches, walnut panels, iron hinges/rings and charcoal bases | Offline multi-angle paint authoring; furniture/SCENERY.md |
| Cupboard | Supplied walnut/iron/ivory sculpt, now in Models and Test room | 3×1 display fit; no quest placement added; furniture/SCENERY.md |
| Blocked passages | Wall-height solid stone assembly using original wall sculpts and supplied painted rubble; shares wall cutaway | Current game uses 1×1 only; original rubble derivatives remain intact; furniture/SCENERY.md and WALLS.md |
| Wooden table / treasure chest | Supplied sculpts with seam-cut walnut/iron/brass finishes and aligned grain UVs | First two-piece batch completed 2026-10-22; [recipe/review](../assets/models/furniture/README.md) |
| Throne / fireplace | Supplied sculpts painted walnut/red cloth/brass and limestone/iron/brass | Offline multi-angle paint authoring completed 2026-10-22; discovered fireplace has particle fire and warm light |
| Alchemist’s bench | Recovered supplied sculpt with round bottles/jars and painted walnut/brass/vessels/parchment/ivory | Normalized source reduction and four-angle paint authoring; furniture/WORKSHOP.md retains source guards/notices |
| Torture rack | Supplied sculpt painted walnut/iron/hemp/ivory | Offline four-angle authoring; furniture/WORKSHOP.md |
| Sorcerer’s table | Supplied sculpt painted walnut/plum cloth/parchment/oxblood/brass/wax | Offline multi-angle authoring; static sculpted candles, no new fire/light effect; furniture/WORKSHOP.md |
| Tomb | Assembled/painted supplied upper/lower components: limestone, pale effigy, dark stone recesses | Offline four-angle authoring; furniture/TOMB.md retains source guards/notices |
| Bookcase | Assembled supplied frame/four shelf inserts, painted walnut, individual bindings/pages and bone | First furniture palette sample completed 2026-10-22; [recipe and review](../assets/models/bookcase/README.md) |
| Weapons rack | Supplied xbeaker STL replaces the generated placeholder | Thingiverse 4271138; walnut/leather/steel/iron/brass/red shield paint; separate known source notice retained; see furniture/WEAPONS-RACK.md |
| Stairway | Thin shared 2x2 tile with actual original tile-sheet artwork | Implemented from `system-tiles`, PDF page 1; spiral-stair STL is unrelated and unused |
| Floors/corridors | Mark's new board image fitted to 26x19 atlas | Replaces generated floor patterns; no further board image needed |
| Stone walls | Supplied original tall wall sculpt with authored stone/mortar colours | Existing geometry, varied orientation/section lengths/tones |
| Wall torches | Custom generated decorative fixtures/particles | Intentional added scenery, not a missing base-game component |
| Dice | Supplied combat sculpt/paint; blank hull with red/white pips for movement | Existing geometry/materials; no new models needed |

Useful supplied files: `Bookcase_NoShelf_Full_Textured.stl`,
`Bookcase_OnlyShelf.stl`, `GargoyleWings.stl`. The supplied cupboard is now painted and available in Models/Test room for later quests. The 40 supplied STLs include variants/components,
not 40 assembled game objects. Their source licence/creator remains unknown
beyond Mark's earlier open-licence statement; wall models have separate notices.

Mark has now supplied the weapons-rack model. No further models are currently
needed for The Trial; the bookshelf is now assembled/painted and gargoyle wings still need assembly.
Existing furniture pictures help assign paint regions but are small angled
reference photographs, not ready-made UV texture sheets.

Stairs use actual printed component artwork; the new board image is user-supplied
visual artwork with unestablished creator/edition provenance. Neither changes the
original North American quest/rules baseline. Details and hashes are in
`assets/textures/tiles/README.md` and `assets/textures/board/README.md`.

This audit involved source/reference reads and offline artwork preparation only.
No new browser or game regression check has run.

Bookcase follow-up, 2026-10-22: the generated placeholder is replaced in the board
and viewer. Chrome model authoring inspected front/back/sides/elevated views and
the factory's full/torch-light appearance beside the Barbarian in an isolated
scene. The new wood/spine finishes are authored procedural textures inspired by
the original component photos, not supplied scans. No gameplay regression or
performance run was included. See the bookcase README for provenance and limits.

Next furniture batch: table and chest now have detailed finishes. Chrome angle
inspection refined the chest fittings; an isolated scene compared their actual
fitted factories at board scale under full/torch recipes. This was visual
authoring only, with no gameplay/save/route checks. The original photographs guide
the palette; new finish maps are authored procedural artwork, not supplied scans.

Throne/fireplace follow-up: offline front/side/rear/elevated authoring refined the
upholstery/back-board split and both carved fireplace uprights. Shared finishes
now include restrained cloth weave/stone grain. Fireplace fire uses the existing
torch scheduler, discovery gating and shadow limit. Its effect is board-only;
no new Chrome, gameplay, save or performance check ran. See the furniture README.

Weapons rack painting completed 2026-10-22 in an independent agent batch.
Original source untouched; guarded recipe and four-angle offline authoring preview
are retained. Parent integrated the replacement and checked it in Chrome Models
without reported console warnings/errors. No board-lighting/performance pass.

Wizard follow-up: Mark supplied fingerprinted region markings from the model
painter. `scripts/paint-regions/wizard.json` is the preserved input;
`scripts/paint_wizard.py` fills unmarked surface gaps and refines the paint
boundaries offline. Export colours were labels; natural cloth/leather/wood/skin
and bronze finishes are defined separately. See the hero asset README for
provenance, palette, preparation and current authoring review limits.

# Current quest model and artwork audit

Reviewed against actual factories and the supplied component catalog, 2026-10-21.

| Component | Current implementation | Available work/resources |
| --- | --- | --- |
| Four heroes | Supplied STL sculpts; Barbarian has seam-cut multi-region paint; all hero bases are dark grey | Paint the other heroes from existing visual references |
| Eight monster types | Supplied STL sculpts; simple base colours | Paint existing geometry; assemble supplied gargoyle wings |
| Gargoyle wings | Prepared STL, not assembled | Existing `gargoyle-wings` source; no new model needed |
| Most furniture/doors | Supplied STL sculpts; simple base colours | Paint existing geometry from original component photos |
| Tomb | Assembled supplied upper/lower components | Paint existing assembly |
| Bookcase | Generated placeholder | Supplied frame and shelf STLs are already prepared; assemble/replace before painting |
| Weapons rack | Supplied xbeaker STL replaces the generated placeholder | Thingiverse 4271138; separate known licence/notice; detailed painting pending |
| Stairway | Thin shared 2x2 tile with actual original tile-sheet artwork | Implemented from `system-tiles`, PDF page 1; spiral-stair STL is unrelated and unused |
| Floors/corridors | Mark's new board image fitted to 26x19 atlas | Replaces generated floor patterns; no further board image needed |
| Stone walls | Supplied original tall wall sculpt with authored stone/mortar colours | Existing geometry, varied orientation/section lengths/tones |
| Wall torches | Custom generated decorative fixtures/particles | Intentional added scenery, not a missing base-game component |
| Dice | Supplied combat sculpt/paint; blank hull with red/white pips for movement | Existing geometry/materials; no new models needed |

Useful supplied files: `Bookcase_NoShelf_Full_Textured.stl`,
`Bookcase_OnlyShelf.stl`, `GargoyleWings.stl`. The unused cupboard STL is also
available for later quests. The 40 supplied STLs include variants/components,
not 40 assembled game objects. Their source licence/creator remains unknown
beyond Mark's earlier open-licence statement; wall models have separate notices.

Mark has now supplied the weapons-rack model. No further models are currently
needed for The Trial; bookshelf parts and gargoyle wings still need assembly.
Existing furniture pictures help assign paint regions but are small angled
reference photographs, not ready-made UV texture sheets.

Stairs use actual printed component artwork; the new board image is user-supplied
visual artwork with unestablished creator/edition provenance. Neither changes the
original North American quest/rules baseline. Details and hashes are in
`assets/textures/tiles/README.md` and `assets/textures/board/README.md`.

This audit involved source/reference reads and offline artwork preparation only.
No new browser or game regression check has run.

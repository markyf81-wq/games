# Painted furniture: table, chest, throne and fireplace

Prepared 2026-10-22 from the supplied printing collection. These classic-script
assets replace the plain-colour table/chest/throne/fireplace in the game and model viewer; Models is the current inspection UI; the older studio has been removed. Original imported components and STLs
remain unchanged.

| Piece | Source | Original STL SHA-256 | Prepared triangles |
| --- | --- | --- | --- |
| Wooden table | `Furniture/Just_Table.stl` | `a34583dd6a88a91aab05fefd794c5d0a243c769d2e50e70a49da8a752fe000ff` | 8,824 |
| Treasure chest | `Furniture/Chest_forFDM.stl` | `bec972a81af68b0a0799f6d814e60afe9617c5020b6dad36b07755a7a56516a3` | 18,896 |
| Throne | `Furniture/Throne_HeroQuest.stl` | `8fd529a342252d42a0052b27d45d7f3cba3b3f5f1e3d5665398d0398eafff22b` | 32,841 |
| Fireplace | `Furniture/Fireplace_forFDM.stl` | `746b8c5ab715917a01a66c3dc04f800b48feb57c57f397d1370d511b60c0c499` | 20,400 |

Mark describes the collection as open licence; its original creator, exact
licence and download source remain unknown. The derivative does not establish
new attribution. Geometry-input fingerprints are guarded by the offline recipe
and recorded with the source hashes in each output.

## Recipe and finishes

```sh
python3 heroquest/scripts/paint_furniture.py --preview
python3 heroquest/scripts/paint_furniture.py --only chest --preview
```

Run from the repository root with numpy; optional authoring previews need Pillow.
The recipe cuts original triangles at paint boundaries, interpolates normals and
packs UVs/material regions. It retains the sculpt's surface, proportions, local
origin and runtime facing. Uniform footprint fitting, collisions and saves are
unchanged. No STL parsing or paint generation happens during play.

The table separates warm walnut boards from darker end rails/trestles. Grain UVs
run along the boards, across the end rails, and vertically on the legs. The chest
separates walnut body/lid, forged-iron end bands/rivets/handles/hinges, and a brass
clasp with a dark keyhole. Its UVs wrap the curved lid and follow the long boards.
Scene lights supply shading and metal reflections; no baked illumination/wash.

The original component photographs `system-furniture-table.gif` and
`system-furniture-chest.gif` in `../../../references/visual/` guide the wood/dark
fitting/brass palette. Source records are in `references/sources.json`. These are
small reference photographs, not UV maps or an exact painted-colour standard.
`src/view/furniture-surfaces.js` shares cached authored grain textures, with
optional `grainStrength` (default 1; this batch uses 0.4) so the sculpted detail
remains prominent. This is procedural artwork, not a photographic texture scan.
The bookshelf's existing default finish remains unchanged.

## Authoring review

Chrome model-viewer inspection covered front/end/opposite/rear/elevated angles.
Chest handle/hinge masks were refined to avoid wooden fittings and paint spill
onto its rear rail. An isolated authoring scene compared the actual fitted
factories beside the Barbarian with full/default torch-light recipes. No console
warnings/errors were reported. Screenshots are `../../previews/table-painted.jpg`
and `../../previews/chest-painted.jpg`.

This was focused visual authoring, not a gameplay/save regression, performance
benchmark, studio interaction test or separate direct-file pass. The earlier
split-route movement change was not exercised. No tests/build/lint were run.

## Throne/fireplace batch and hearth fire — 2026-10-22

The throne combines walnut frame/posts, wine-red quilted back/seat, and an
antique-brass apron/collars. Seams follow the tilted back and seat; the rear board
stays wooden. The fireplace uses warm limestone, a grey stone hearth, soot-dark
firebox, dark iron surround and brass relief. Its carved upright masks follow
the bowed plate depth, and the lintel mask follows its sloping face. Subtle cloth
weave and stone grain are cached authored finishes. The supplied photographs
`system-furniture-throne.gif` and `system-furniture-fireplace.gif` guide colours;
these are not UV scans or new rule content.

Offline front/side/rear/elevated paint-layout views informed seam refinements.
`../../previews/throne-painted.png` and `../../previews/fireplace-painted.png`
are software authoring previews with simple shaded material colours; they are
not Chrome screenshots and omit runtime texture detail, reflections and fire.
No new Chrome checks, tests, builds, lint, gameplay/save regression or performance
benchmark were run for this batch.

On the discovered dungeon board, `createTorchLighting.registerFireplace` attaches
three torch-style translucent flame tongues, 72 pooled fire/ember particles, a small charred
fuel bed and a warm flickering light at the supplied sculpt's mouth. The mount
counter-scales effects after uniform furniture fitting. Fire shares existing
frustum/flicker scheduling and the one-nearest-shadow-light limit with torches.
Dynamic lighting Off hides flames/particles/halo/light; fuel remains. Reduced
motion uses steady light/flames without particles. Hidden/context-lost scheduling
stays with the board controller. Effects are noninteractive and excluded from
outlines, occupancy, sight, RNG and saves. The independent model viewer/portraits
remain static with their own studio lighting; fire is a dungeon presentation.

The fireplace now uses the same flame factory, halo/light colours and particle
style as the torches: three compact emitters of 24 particles above the fuel bed.
The previous wider/taller hearth blobs were removed. This follow-up received
source review only, without a new Chrome check.

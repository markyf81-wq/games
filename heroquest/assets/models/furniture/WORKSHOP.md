# Painted workshop furniture — 2026-10-22

Prepared from the original supplied furniture collection. Mark describes these
STLs as open licence; creator, exact licence and original download source remain
unknown. The paint derivatives establish no new attribution or licence. Original
STLs and imported JS assets remain unchanged.

## Alchemist's bench

Source: `Furniture/AlchemyTable.stl`, original SHA-256
`f26c80dd6111a036e0418e4c779e1b76cfa95fdad9b96ec26735f0d3d63b3fcd`.
The supplied source has 467,000 triangles; its earlier 49,635-triangle import had
visibly collapsed the round bottles, jars, skull and balance into triangular
spikes. The source coordinates are only approximately 5.19×3.20×3.86 units.

`scripts/paint_workshop.py` guards the earlier prepared geometry fingerprint
`95022db4a70d7fee5ef0582a6188da9b067bcbb6a4616749997bc5f7bc553b24`
and original STL hash, then reduces the original STL with coordinates normalized
×100 before returning them to the source units. The same shallow-base centring,
Z-up→Y-up axis conversion and grounding retain the source frame. This restores
its intended round shapes and small desk objects without changing the factory's
uniform fitting, footprint, pose or source dimensions. The original imported
asset is preserved. The output records its previous prepared fingerprint,
reprepared input fingerprint/count, source hash and normalized preparation.

The recovered input has 53,965 triangles before authored paint seams. The painted
asset has **60,313 triangles / 39,912 vertices**, 16-bit indices and approximately
1.55 MiB of packed JS, including UVs, paint labels and provenance.

Finishes separate warm walnut worktop, darker frame, brass balance/pulls, jade,
cobalt and amber vessels, cream ceramic jars/cup, copper lids, parchment papers,
ivory skull and feather. The recovered raised surfaces bound paper/prop paint;
vessel regions account for overlapping projected silhouettes without spilling
ceramic colour onto the bottles behind. The original small photograph
`references/visual/system-furniture-alchemist-bench.gif` guides the wood/vessel/
skull palette; it is not a UV map or exact colour standard. Glazed vessels use
opaque physically lit materials; they do not add glass transmission or liquid
simulation. No animated apparatus or new lighting effect is introduced.

Run from the repository root with numpy, fast-simplification and optional Pillow:

```sh
python3 heroquest/scripts/paint_workshop.py --only alchemists-bench --preview
```

The existing local `tmp/model-libs` dependency location is reused through the
STL import helper; no browser dependency, package manager or build step is added.
The offline recipe uses the existing seam-cut helper without changing it.
Normals interpolate across new paint cuts, and wood grain uses physical-axis UVs
with the existing cached 0.4-strength furniture finish. No parsing/simplification/
painting happens during play.

Replace the current imported bench script in `index.html` with:

```html
<script defer src="assets/models/furniture/alchemists-bench.js"></script>
```

Keep `furniture-surfaces.js` before `stl-models.js`. The existing ID/factory is
unchanged, so Models and the dungeon use the same prepared asset. Do
not load both versions. No runtime/fitting/picking/occupancy/save edit is needed.

`../../previews/alchemists-bench-painted.png` shows four offline software angles
with a depth buffer and interpolated source normals. Comparing old and normalized
source views exposed/repaired the collapsed geometry. Opposite-front, rear and
elevated colour views informed vessel bases, overlapping jars, skull, cup,
papers and drawer seams. Temporary source coordinate/height studies remain in
ignored `tmp/`. This is focused artwork authoring, not a Chrome screenshot or
browser/performance/gameplay check. The preview omits runtime grain maps, metal
reflections, board fitting and torch lighting. No browser, tests, build, lint,
save checks or performance benchmark was run.

## Sorcerer's table

Source: `Furniture/SorcererTable_FDM.stl`, original SHA-256
`75f49e9e7628149505548392a636cff5ab45dfb709ec3ad7766a0d0edb9edb42`.
The guarded prepared input fingerprint is
`ae5347371e084f472aac4b61b00ee25b62d8384a1a6f4505e0010aa7fd51d09e`.
Original geometry/pose/dimensions/facing remain unchanged: the 14,000-triangle
input becomes **17,186 triangles / 16,345 vertices**, with 16-bit indices and
approximately 584 KiB packed JS after paint-seam cuts and UVs.

Dark walnut supports muted plum cloth, an oxblood-bound parchment book, brass
candlesticks and ivory candles with dark wicks/warm tips. The long book facets
are partitioned at the cover/page planes before painting so the complete pages
stay parchment with clean narrow leather edges. No invented spell text/card
content is added to the decorative book. Source sculpted tips remain static;
this art change adds no particles, flame animation or candle light sources.
Wood/cloth finishes reuse the existing cached authored maps.

```sh
python3 heroquest/scripts/paint_workshop.py --only sorcerers-table --preview
```

Replace its original script tag with:

```html
<script defer src="assets/models/furniture/sorcerers-table.js"></script>
```

The original reference photograph is
`references/visual/system-furniture-sorcerer-table.gif`; it guides furniture
materials rather than providing a UV texture or exact colour match.
`../../previews/sorcerers-table-painted.png` is a four-angle software artwork
render. Opposite-front, rear and elevated source-normal/depth views informed the
cloth/book/candlestick seams. No runtime/index/factory/footprint edits, browser
inspection, gameplay/save checks, tests/build/lint or performance pass were run.

## Torture rack

Source: `Furniture/TotureRack_full.stl` (supplied spelling), original SHA-256
`9206db4c3e21fae7855fc5eb93f27b267db92e706f2366bc3a0dcf541cda630c`.
The guarded prepared input fingerprint is
`35ca82471f17253f12b65c97bdf0dbd0718cb0bac89ec56ff4d8dad652b700b5`.
The 14,000-triangle input retains its original surface, placement, pose and source
units; authored cuts/UVs produce **20,068 triangles / 25,062 vertices**, 16-bit
indices and approximately 837 KiB packed JS.

Warm walnut bed boards and darker wooden frame/handwheels surround forged-iron
cuffs, the fixed ankle bar, roller axle and wheel hubs. Hemp colours follow both
twisted ropes and their wraps around the axle, and the skull is old ivory. Wheel
centres and rope/core boundaries were refined from source-space views; spokes
remain wooden. Top-board grain follows the long planks, while frame grain runs
up the upright supports. No mechanism or model geometry animation is added.

```sh
python3 heroquest/scripts/paint_workshop.py --only torture-rack --preview
```

Replace the original script tag with:

```html
<script defer src="assets/models/furniture/torture-rack.js"></script>
```

The original reference photograph is
`references/visual/system-furniture-torture-rack.gif`; the supplied printable
sculpt differs in detail and is retained. No new game content, blood/gore
texture, source claims or footprint changes are introduced.
`../../previews/torture-rack-painted.png` contains four offline depth-buffer/
source-normal views of the painted object. Opposite/front/rear/elevated authoring
views informed iron/wood boundaries, rope wraps and the skull. Runtime grain,
reflections, uniform fitting and torch lighting are not reproduced in the image.
No browser, tests/build/lint, gameplay/save checks or performance pass was run.

All three workshop derivatives can be regenerated together with:

```sh
python3 heroquest/scripts/paint_workshop.py --only alchemists-bench sorcerers-table torture-rack --preview
```

They are ordinary packed classic-script assets and need no new runtime code or
dependencies. Keep their original prepared components for provenance/recovery.

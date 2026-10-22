# Painted two-piece tomb — 2026-10-22

The tomb uses the supplied `Furniture/Tomb_Bottom.stl` and
`Furniture/Tomb_Top.stl` from Mark's printing collection. Mark describes the
collection as open licence; creator, exact licence and original download source
remain unknown. This paint derivative establishes no new attribution or licence.
Original STLs and prepared components remain untouched.

| Component | Original STL SHA-256 | Prepared input triangles | Painted triangles / vertices |
| --- | --- | --- | --- |
| Bottom | `222dc8d279ee19e38c5c8a75c1131e697fd81715b622febdded2bdd35a13cfd5` | 17,436 | 53,896 / 33,712 |
| Top | `d0e28356ff609fd4942a5e2b85e77745fb973a2129df2f312704c7ca29828544` | 13,999 | 32,120 / 25,537 |

## Finishes and recipe

Run from the repository root with numpy and optional Pillow:

```sh
python3 heroquest/scripts/paint_tomb.py --preview
```

The separate recipe imports the existing seam-cut helper from
`paint_furniture.py` without modifying it. It guards the prepared geometry inputs:

- Bottom: `966c76b1506a979966b7097e7f2476099c281b355ac420651844ab0108568efd`
- Top: `72bf13cd596d27de91cbb6b0659df1529fdda5b2afb69190aab62487f4b99900`

Five related stone finishes separate the weathered limestone columns/carvings,
darker plinth, warm bevelled lid/frame, recessed green-grey panels/drapery and
pale carved knight effigy. The body is an architectural stone object: the knight
retains a carved stone finish rather than flesh-coloured face/hands. The supplied
`references/visual/system-furniture-tomb.gif` guides the overall stone treatment;
it is a small reference photograph, not a UV map or exact painted-colour standard.

Planar architectural seams partition the long bottom-wall facets before masks
are applied, keeping straight frame borders. The top's large source facets are
subdivided around the traced effigy contour before seam cutting. Original surface
positions and interpolated normals retain the source silhouette, relief, pose,
origin and relative assembly. No silhouette deformation changes the sculpt.
The same complete ordered material list is packed in both assets for the current
compound factory's shared material array. Physical-axis UVs use existing cached
authored stone-grain maps; no per-frame paint or geometry preparation is added.

Together the two classic scripts contain **86,016 triangles**, use 16-bit indices
and total approximately **2.28 MiB**, including UVs/material labels/provenance.
Separate IDs and every `sourceBounds`/`sourceBaseBounds` field remain intact, so
the existing upper/lower assembly offset and uniform board fitting are unchanged.

## Integration

Replace the current two imported tomb script tags in `index.html` with:

```html
<script defer src="assets/models/furniture/tomb-bottom.js"></script>
<script defer src="assets/models/furniture/tomb-top.js"></script>
```

Do not load both the original and painted versions. Keep the current
`furniture-surfaces.js` / `stl-models.js` order. No factory, scene, occupancy,
fitting, picking, Test room or model-viewer code change is needed. Both painted
halves must be switched together because their face labels use the same five
ordered materials. Original imported assets stay available for provenance and
offline regeneration.

## Authoring review and limits

`../../previews/tomb-painted.png` is a four-angle assembled offline software
render with source-normal interpolation and a depth buffer. Opposite oblique,
reverse and overhead views informed effigy, panel, column and carved skull/fleur
paint boundaries. Height/profile views in ignored `tmp/` supported seam tracing.
The preview reproduces the runtime factory's source-bound assembly offsets;
it is not a browser screenshot or a runtime-fit check.

The source relief/low-poly simplification is retained. The preview omits runtime
stone-grain maps, scene reflections, board fitting and dynamic torch lighting.
No browser inspection, performance benchmark, gameplay/save checks, tests,
build, lint or direct-file pass was run. Mark is manually reviewing the game.

## Effigy seam correction — 2026-10-22

Mark reported green-grey paint on the knight. The earlier projected mask was
narrower than parts of the shoulder/elbow/leg bevels and stopped before the toe
slopes; its additional y=4.05 cutoff also clipped lower sides of the same figure.
The revised contour includes the full head/neck, armour sides, elbows, legs and
toe surfaces and removes that horizontal cutoff. Pale stone is continuous down
the knight's sides; green-grey remains around the effigy in the recessed setting.
The four-angle offline artwork was regenerated and inspected for those boundaries.
Bottom geometry/colours, relative assembly, runtime fitting and source guards are
unchanged. No browser or gameplay verification was performed for this correction.

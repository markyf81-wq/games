# Doors, cupboard and blocked passages — 2026-10-22

Authored paint derivatives of the user-supplied printing collection. Creator,
original download and exact licence remain unknown; Mark describes it as open
licence. Keep the original imports/STLs and source notices. These finishes do not
establish a new licence for their geometry.

| Asset | Supplied source | Source STL SHA-256 |
| --- | --- | --- |
| Closed door | Furniture/HeroQuest_closed-door.stl | 6ac75e72a6cd64967f2d17de519ebf489054a95459dc85f62642b795db42725d |
| Open door | Furniture/HeroQuest_open-door.stl | ed4049d36ecf84f30ecbf813e0bd34311e0c670a02997aa5615887a878b12ff4 |
| Cupboard | Furniture/Buffet_ForFDM.stl | 901821b8b04a733868c9d06bf09ec65755c149a731568524a7387b0fb1b16aa6 |
| One-square blocked tile | Tiles/1x1WallTile_Solid.stl | 48d45b65847fc94d1ccf4890f646899f0da12b0aeb5f611989ec09fa77612ec8 |
| Two-square blocked tile | Tiles/1x2WallTile_Solid.stl | 8dc555110489852fdf9b793453ca00887f465b48e5071ebc7e81feeb21865299 |

Run `python3 heroquest/scripts/paint_scenery.py --preview` from the repository
root with numpy and Pillow. Prepared-geometry fingerprints guard every input;
outputs retain source metadata and hashes. Paint seams interpolate the original
surface/normals, with physical-axis UVs and no alteration to proportions/origin.
The cupboard's long flat faces are partitioned before paint masks so its trim
boundary stays straight. Both door faces have separate fitting-depth thresholds.

Doors have warm walnut panels, forged iron hinges/rings, and matching warm-grey
limestone arches and bases. Cupboard panels/frame use matching walnut, iron
fittings and an ivory skull. Rubble has dark joints, limestone and a charcoal moulded rim.
Door arches use darker warm greys close to the wall bricks, based on sRGB
126/121/110 with moderate whole-stone shade variation, more distinct than the
near-uniform walls. This replaces the
earlier contrasting cool-grey, sandstone, sage, taupe and pale palette. Raised
stone islands seed surface-distance colour propagation across each whole stone;
the earlier raised-tip-only tint was too faint. Raised-face thresholds follow
the thickening legs to keep their stones separated. A balanced sequence spreads
the palette around each arch. Colours are baked on a white
stone material so the old grey material cannot cap their brightness. Bases
retain a uniform matching limestone tone. Rubble uses smooth
deterministic source-space tints. Only the flagged stone material reads these tints;
wood and fittings use their own colours. Grain/stone maps are the existing cached
authored finishes. No photographic UV scan, pigment wash, baked lighting or
per-frame material/geometry preparation is added.

Original small component photographs under `references/visual/` guided the door
and cupboard palettes: system-furniture-closed-door.gif, open-door.gif and
cupboards.gif. They are angled reference photos, not texture maps.

Index loads the painted closed/open door and one-square blocker instead of the
plain imports. The cupboard is added to Models with
a uniform 3×1 display fit; it adds no quest placement or gameplay rule. The
prepared two-square blocked derivative remains unused until a layout needs it.
Raw trap/weak-floor/spiral-stair variants remain archival, not new game content.

Offline four-angle previews in `assets/previews/*-painted.png` informed boundary
refinement. They show source-normal shaded colours, omitting runtime grain,
metal reflections and torch lighting. No browser, gameplay/save, performance,
automated test, build or lint check was run; Mark is testing manually.

The darker palette was regenerated for both door states on 24 October 2026.
This adjustment has source review only; no new rendered or browser check ran.

## Shared door stonework — 23 October 2026

The closed derivative now combines the open source's complete arch/base with
only the closed source's wood/iron surfaces. Both variants therefore use the
exact same stone geometry, normals, physical-axis UVs and vertex colours, including
the lower plinth. The closed asset records the open source fingerprint as
`sharedStoneGeometrySha256` in addition to its primary closed source. Original
imports/STLs remain intact. The source sculpts were slightly different meshes,
so independently painting them could not guarantee a matching transition.

The open arch is the canonical colour field. Closed-door stone vertices copy
that field by shared source position, without rerunning island/palette ordering
against a different leaf topology. Runtime fitting remains the same width for
both states. Four-angle offline authoring previews show the shared stone colours
and retained leaf/fittings; no browser or gameplay check was run.

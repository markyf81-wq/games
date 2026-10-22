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

Doors have warm walnut panels, forged iron hinges/rings, limestone arches and
charcoal bases. Cupboard panels/frame use matching walnut, iron fittings and an
ivory skull. Rubble has dark joints, limestone and a charcoal moulded rim.
Smooth deterministic source-space vertex tints vary the stone without jagged
triangle colour boundaries. Only the flagged stone material reads these tints;
wood and fittings use their own colours. Grain/stone maps are the existing cached
authored finishes. No photographic UV scan, pigment wash, baked lighting or
per-frame material/geometry preparation is added.

Original small component photographs under `references/visual/` guided the door
and cupboard palettes: system-furniture-closed-door.gif, open-door.gif and
cupboards.gif. They are angled reference photos, not texture maps.

Index loads the painted closed/open door and one-square blocker instead of the
plain imports. The cupboard is added to Models and the invented Test room with
a uniform 3×1 display fit; it adds no quest placement or gameplay rule. The
prepared two-square blocked derivative remains unused until a layout needs it.
Raw trap/weak-floor/spiral-stair variants remain archival, not new game content.

Offline four-angle previews in `assets/previews/*-painted.png` informed boundary
refinement. They show source-normal shaded colours, omitting runtime grain,
metal reflections and torch lighting. No browser, gameplay/save, performance,
automated test, build or lint check was run; Mark is testing manually.

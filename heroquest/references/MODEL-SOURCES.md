# Supplied HeroQuest models

The later [tall stone wall pack by ldid69](../assets/models/walls/README.md) has separate known
provenance. Its licence does not resolve the original shared-drive collection's
unknown attribution below.

Mark supplied four ZIP archives on 2026-10-21 from a shared personal drive. They
contain 40 STL files: 18 miniature components, 15 furniture components, six tile
models and one combat die. Some files are parts of a piece, rather than a complete
assembled object (gargoyle wings, bookcase shelves, tomb top/bottom).

Mark describes the collection as open licence. The archives contain no creator
credits, licence text or original source links, and Mark does not have those
details. This records the available provenance without assigning a specific
licence or claiming one was independently verified. No Free3D model was used.

## Sources and runtime derivatives

- Original ZIPs, unmodified extracted STLs, and a per-file SHA-256 inventory are
  stored under `stl-source`. These printing sources are ignored
  by Git and are never loaded by the game.
- `../assets/models/imported/catalog.json` records all 40 derivatives, source member names/hashes,
  source/target/output triangle counts, bounds, packing and placement review status.
- `../assets/models/imported/*.js` are local classic-script assets containing quantized indexed
  positions, signed packed normals and indices. The exploration `../index.html`
  includes the four heroes, Trial monsters and required scenery. The retired
  miniature studio has been removed; Models in the game is the current viewer. Not all
  prepared components are assembled or claimed as game-ready pieces.
- `../src/view/stl-models.js` decodes each used asset once, caches geometry, uses
  uniform scale and sets model-specific facing directions. Printed Z-up coordinates
  become Y-up; the origin is centred on a shallow bottom band. Miniature bases fit
  0.82 board squares. Furniture is uniformly fitted inside its quest footprint; the door fits
  1.23 squares. Decorative overhang does not alter grid occupancy.

Exploration and the model viewer decode/cache the local meshes and create instances as needed; the barbarian uses the separate prepared paint surface described below. The barbarian has a separate
paint scheme (see below); the orc and door retain simple green and neutral stone
materials. The [table, chest, throne and fireplace](../assets/models/furniture/README.md) now have walnut,
cloth, stone and iron/brass finishes with prepared paint seams and aligned UVs. STL has no painted textures or material regions, so the
paint is an authored presentation layer. Geometry, colour and orientation remain
separate.

The original handmade studies have been retired to the ignored local
`references/retired-studies/` directory and are not application dependencies.

## Deliberate asset preparation

`../scripts/import_stl.py` reads binary or ASCII STL as data, removes duplicate
and degenerate triangles, merges coincident vertices, simplifies with quadratic
mesh decimation, generates crease-aware normals, and writes the packed assets.
It does not execute archive contents. Its dependencies are **numpy** and
**fast-simplification 0.2.0**. They are authoring tools, never browser dependencies.

The local preparation used the bundled Python runtime, its numpy, and an isolated
fast-simplification install under ignored `heroquest/tmp/model-libs/`:

```sh
python3 heroquest/scripts/import_stl.py
python3 heroquest/scripts/import_stl.py --only barbarian orc-cleaver table closed-door
python3 heroquest/scripts/import_stl.py --inventory
```

Use a Python environment with those dependencies. `--inventory` needs only numpy.
The simplifier uses aggression 5 and attempts category-specific triangle budgets.
It can stop above a target to retain geometry; the catalog records actual counts.
Several furniture components need further assembly/optimisation before gameplay
use. In particular, the spiral stair remains about 122,000 triangles and is not
loaded by the current prototype.

The runtime uses ordinary deferred scripts and performs no STL parsing, network
fetch, module import or mesh simplification. Opening `index.html`
from disk continues to need no server, installation or application build.

## Barbarian paint

`barbarian-paint.js` contains eight uniform material regions and a prepared
surface with triangles cut at the material seams. Hairline/crown, clothing,
boot-cuff and sword-fitting contours are authored in canonical facing coordinates.
Cuts stay on the original triangle surfaces and interpolate normals; no body
proportions, silhouette, pose or footprint are changed. The original imported
23,999-triangle sculpt stays intact. The paint's guard fields match that original
mesh; its nested `geometry` contains the runtime surface and its own fingerprint.
The renderer decodes it once and batches by material, with no runtime cutting.

Skin, chestnut hair, leather, red cloth, ivory fur, steel and bronze retain distinct
roughness/metalness. The entire base top/rim is dark grey (#35383b). The same base
colour applies to all other heroes and monsters, whose shared two-unit-high base
faces are grouped separately from their body material. Furniture/doors are not
miniature bases. No baked wash, pigment variation or painted facial patches are
used; scene lighting supplies the shading. Metals retain the generated local
softbox reflections.

The recipe is `../scripts/paint_barbarian.py`, with authored contours in
`../scripts/barbarian-paint-seams.json`. A traced 3D hair seam follows the long
locks; connected-surface cleanup removes stray islands/pinholes. Garment profiles
follow the front/back sculpt, with red cloth around both sides. Gold accents align
with the five raised belt studs. Regenerate after reconverting
the source sculpt. Its geometry SHA, source triangle count and vertex count must
match, or loading stops with an explicit error.

```sh
python3 heroquest/scripts/paint_barbarian.py
python3 heroquest/scripts/paint_barbarian.py --preview
```

Authoring needs numpy; optional previews also use Pillow. The front,
three-quarter, back and elevated views in `../assets/previews/barbarian-painted.png`
are offline authoring renders, not browser screenshots. They were inspected
while refining the seams. Enlarged front, side and rear views of the final refinement
were also inspected in Chrome; no gameplay regression checks were run.

## Exploration placement and assembly

The runtime factory now configures all four heroes, eight monster types, open and
closed doors, blocked cells and required Trial furniture. Facing is set per source
model independently from quest placement rotation. Uniform footprint fitting uses
both width/depth for scenery; miniatures fit their source base band. Normals and
packed geometry are decoded once and cached across repeated instances.

The tomb top/bottom retain their shared source coordinate frame after accounting
for importer recentering. The gargoyle currently uses its body without separate
wings. Bookcases now use the [assembled and painted supplied components](../assets/models/bookcase/README.md),
with four shelf inserts, varied bindings, parchment, ivory and walnut finishes.
The separately supplied
[weapons rack by xbeaker](../assets/models/weapons-rack/README.md) replaces the generated rack
and retains its own known attribution/non-commercial/share-alike notice.
The stairway now uses the original tile-sheet artwork on a thin 2x2 tile rather
than generated steps or the unrelated spiral-stair STL. See `../docs/ASSET-AUDIT.md`.
Grid occupancy remains the source-linked quest data.
See `../docs/EXPLORATION.md` for the limited approved browser/model coverage.

## Flat combat-die icons

`../scripts/prepare_die_icons.py` projects the ink-labelled triangles of the
supplied combat die to transparent `../assets/ui/dice/*.png` icons. It requires numpy and
Pillow, and checks the geometry fingerprint against the paint data. The black
shield is oriented helmet-up for the UI. No source mesh or paint labels change.
These icons share the supplied model's user-reported provenance; the exact
creator/licence is still unknown. This is offline asset preparation only.

## Rounded movement die

`movement-die-body.js` is a blank convex hull of the supplied combat die, filling
the recessed symbols and preserving the rounded outer shape. It has 2,366
triangles and 1,185 vertices, is centred and uniformly fitted to 1.5 units, and
records its source STL/geometry hashes. The shared runtime die factory adds red
material and white pips; the original combat mesh and paint are unchanged.
Its provenance is the same user-supplied collection with unknown creator/licence.

`../scripts/prepare_movement_die.py` uses numpy and Node with Three's
MIT-licensed QuickHull helper from the existing local
`../tmp/three-0.186.1.tgz` authoring archive. No helper, archive, raw STL or
Python dependency is loaded during gameplay. See `../docs/DICE.md`.

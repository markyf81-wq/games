# Supplied HeroQuest models

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
  stored under `../../references/stl-source/`. These printing sources are ignored
  by Git and are never loaded by the game.
- `imported/catalog.json` records all 40 derivatives, source member names/hashes,
  source/target/output triangle counts, bounds, packing and placement review status.
- `imported/*.js` are local classic-script assets containing quantized indexed
  positions, signed packed normals and indices. The exploration `../../index.html`
  includes the four heroes, Trial monsters and required scenery. `../../studio.html`
  includes four sample assets: barbarian, cleaver orc, table and closed door. Not all
  prepared components are assembled or claimed as game-ready pieces.
- `../../src/view/stl-models.js` decodes each used asset once, caches geometry, uses
  uniform scale and sets model-specific facing directions. Printed Z-up coordinates
  become Y-up; the origin is centred on a shallow bottom band. Miniature bases fit
  0.82 board squares. Furniture is uniformly fitted inside its quest footprint; the door fits
  1.23 squares. Decorative overhang does not alter grid occupancy.

The studio’s four loaded models use 63,998 triangles in total; exploration loads
additional derivatives and creates instances as discovered. The barbarian has a separate
paint scheme (see below); the orc, table and door retain simple green, brown and
neutral stone materials. STL has no painted textures or material regions, so the
paint is an authored presentation layer. Geometry, colour and orientation remain
separate.

The original handmade studies have been retired to the ignored local
`references/retired-studies/` directory and are not application dependencies.

## Deliberate asset preparation

`../../scripts/import_stl.py` reads binary or ASCII STL as data, removes duplicate
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
fetch, module import or mesh simplification. Opening `barbarian.html` or `index.html`
from disk continues to need no server, installation or application build.

## Barbarian paint

`barbarian-paint.js` stores authored per-face material assignments, adding about
33 KB. It leaves the supplied 23,999 triangles and their positions/normals intact.
The renderer batches indices into 10 material groups: natural skin, dark chestnut
hair, brown leather, red cloth, ivory fur, steel, bronze, stone, charcoal base and
soft brown facial definition. Each region has a uniform base colour, with no
baked cavity wash, pigment variation or vertex colours. The old grip mask crossed
the bare hand and has been removed. Scene lighting provides the shading; material
roughness distinguishes skin, fabric, leather and metal. Metallic surfaces use a
generated local softbox reflection environment, without a downloaded HDR file.

The recipe is `../../scripts/paint_barbarian.py`. Hand-placed polygon/volume masks
follow sculpt landmarks in canonical front-facing coordinates. Recreate the paint
when reconverting the barbarian: its geometry SHA-256, triangle count and vertex
count must match. A mismatch produces an explicit load error instead of painting
the wrong faces. These are clean, natural material colours, not a claim of an
official painted colour scheme.

```sh
python3 heroquest/scripts/paint_barbarian.py
python3 heroquest/scripts/paint_barbarian.py --preview
```

Use a Python environment with numpy; the optional authoring preview also needs
Pillow. `../previews/barbarian-painted.png` is the front/three-quarter/back offline
colour-layout image, not a browser screenshot. Authoring views were inspected to
place colour boundaries and to remove the hand spill and baked wash. The approved
exploration Chrome pass showed the earlier painted hero on the board; the clean
colour revision has no new browser check.

## Exploration placement and assembly

The runtime factory now configures all four heroes, eight monster types, open and
closed doors, blocked cells and required Trial furniture. Facing is set per source
model independently from quest placement rotation. Uniform footprint fitting uses
both width/depth for scenery; miniatures fit their source base band. Normals and
packed geometry are decoded once and cached across repeated instances.

The tomb top/bottom retain their shared source coordinate frame after accounting
for importer recentering. The gargoyle currently uses its body without separate
wings. Bookcases, weapons rack and stairway use simplified generated geometry
rather than the supplied partial components or expensive spiral stair. These are
presentation approximations; grid occupancy remains the source-linked quest data.
See `../../docs/EXPLORATION.md` for the limited approved browser/model coverage.

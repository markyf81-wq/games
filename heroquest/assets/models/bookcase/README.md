# Assembled and painted bookcase

Prepared 2026-10-22 from Mark's supplied shared-drive collection:

- `Furniture/Bookcase_NoShelf_Full_Textured.stl`, source SHA-256 `41a4c35527dd0595dd95a200dee4df046126c499045c1f0d7f4807e9dd1a4732`.
- `Furniture/Bookcase_OnlyShelf.stl`, source SHA-256 `bfce9db38d5baa974d269448309c5b7b91991cef82dec3d0882b155052e9bccc`.

The original creator and exact licence remain unknown; Mark describes the files
as open licence. This derivative does not establish new source attribution.
Original STLs and imported components remain unchanged. Source/component geometry
fingerprints and the assembly translations are embedded in `bookcase.js`.

`../../../scripts/prepare_bookcase.py` assembles the four disconnected shelf inserts
from their print-bed layout into the frame's rebates. It preserves source units,
orientation and proportions, then the game uniformly fits the complete piece
inside its existing 3 × 1 grid footprint. No occupancy or save data changes.
The packed result has 60,104 triangles, decoded once and shared by instances.

The recipe needs numpy; optional `--preview` needs Pillow. Run from the repo root:

```sh
python3 heroquest/scripts/prepare_bookcase.py --preview
```

Palette references are the two original component photographs already downloaded
from Ye Olde Inn: `system-furniture-bookcase-01.gif` and `-02.gif` in
`../../../references/visual/` (source records in `references/sources.json`). They
show red-brown framing, varied book bindings and bone details. Their small angled
photographs are visual references, not UV textures or an exact colour standard.

Paint follows connected spine surfaces and sharp creases, with a separate plank
boundary. Upright page tops and lying-book edges use parchment; skulls use ivory.
Muted red, green, ochre, slate, umber and aubergine distinguish bindings. Spine UV
frames follow each spine's lean; restrained gilt decoration contains no text.
`src/view/furniture-surfaces.js` generates cached small wood-grain/spine finishes
from the authored palette. These finishes are original procedural artwork, not
scanned textures. Bookcase materials use ordinary scene lighting and shadows;
there is no baked pigment wash, illumination or gameplay randomness.

Chrome authoring review covered front, side, rear and elevated viewer angles,
including a refinement to keep plank surfaces out of parchment paint. An isolated
authoring scene used the actual uniformly fitted factory beside the Barbarian
with full-light and default ambient/torch recipes. The game viewer displayed the
final model; no console warnings/errors were reported. This was model/material
inspection, not a quest playthrough, interaction regression, performance benchmark
or separate direct-file check. Preview: `../../previews/bookcase-painted.jpg`.

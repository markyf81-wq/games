# Model region painter

Open [model-painter.html](../model-painter.html) in Chrome, from disk, localhost or
HTTPS. No server/build or network service is needed. This standalone authoring
page does not load the game engine or change adventure/sandbox saves.

1. Start with Wizard, or select another supplied sculpt/component.
2. Pick a named region and brush the visible surface. Unmarked / erase removes
   markings. Brush size is its diameter in screen pixels.
3. Right/Alt-drag or Rotate/R orbits, Shift/middle-drag pans. Scroll zooms towards
   the pointer; view/zoom buttons work without gestures. P returns to Brush,
   E erases, Home centres the model.
4. Undo stroke / Ctrl/Cmd-Z reverses a stroke; Shift-Z redoes it. Fill unmarked
   applies the selected region to every remaining unmarked face, including hidden
   surfaces. Clear all markings can also be undone. History retains 30 strokes.
5. Rename/recolour a region, or add one when needed. These palette edits are
   saved independently of stroke undo. Show region colours can be disabled to
   inspect the neutral sculpt without discarding markings.
6. Export markings downloads `<model-id>-paint-regions.json`. Supply this file
   for offline refinement and preparation of the game asset. Import markings
   restores an export only when its model and exact source geometry match.

The brush is a **region marker**, not a UV/texture painter. It colours complete
source triangles; rough triangle boundaries are expected and can be refined
later. Only faces visible inside the brush circle receive a stamp. Rotate to
mark sides, undersides and surfaces behind the staff. Drafts do not automatically
update the model in the game.

## Data and implementation

`src/tools/model-painter.js` lazily loads one immutable classic script from
`assets/models/imported/` per selection. The catalogue lists supplied source
components individually, including unassembled pieces. Display centring, uniform
scale and hero-facing rotation do not alter original triangle order or identity.

A separate non-antialiased RGBA render encodes each visible triangle's ID. A
cached readback is invalidated by camera, viewport or model changes, not by paint
strokes. CPU brush stamps read that visibility map, preventing paint from passing
through the mesh. The ordinary viewer uses smooth original normals and region
colours; rendering is requested only on interactions/changes.

Completed strokes save immediately to `heroquest.paint.v1.<imported-model-id>`.
File and localhost origins have separate browser storage. Export before changing
browser/origin or clearing site data. Storage failures leave the current map in
memory and display an export reminder. Undo history itself is not persisted.

JSON kind `heroquest-model-paint-regions`, version 1 contains:

- `model`, `sourceFile`, `geometrySha256`, `vertices`, `triangles`.
- `palette`: ordered `{name, colour}` records; index zero means unmarked.
- `faceRegions`: one palette index per original imported triangle.

SHA-256 covers the concatenated decoded packed position, normal and index bytes,
matching the offline authoring convention. Restores/imports validate identity,
counts, palette, every region index and array length. No model geometry is stored
in localStorage or exports. Import replaces the matching map and clears history.
No markings are sent over a network.

Initial delivery: source-reviewed; browser interaction, export/import and refresh
checks are left to Mark. No game regression or performance measurement was run.

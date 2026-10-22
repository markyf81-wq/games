# Painted weapons rack — 2026-10-22

This is an authored paint derivative of xbeaker's **Heroquest Weapons rack**,
[Thingiverse 4271138](https://www.thingiverse.com/thing:4271138). The supplied
[licence notice](../weapons-rack/LICENSE.txt) says Creative Commons Attribution –
Non-Commercial – Share Alike, without specifying a version. The supplied
[README](../weapons-rack/README.txt) describes the mesh as a remix and notes
incomplete upstream credits. Those original notices remain unchanged; no new
upstream attribution or independent licence audit is claimed.

Mark supplied the archive on 2026-10-21. The original STL and images remain under
ignored `references/stl-source/weapons-rack-4271138/`; its SHA-256 is
`ab0befe80f8bc0dad8d53a70415fafffd3423a6d982d15caf3b140e4c70e0689`.
The original 1,272,832-triangle STL was previously prepared as a 26,559-triangle
browser mesh by `scripts/prepare_weapons_rack.py`. That prepared mesh is retained
unchanged in `../weapons-rack/weapons-rack.js`.

## Paint recipe

Run from the repository root with numpy and optional Pillow:

```sh
python3 heroquest/scripts/paint_weapons_rack.py --preview
```

The separate recipe imports the existing `cut` helper from `paint_furniture.py`
without modifying it. It guards the prepared input geometry fingerprint
`3bf808e0a26a2a14308a01e9a519e0fe0228a33564379eff5838b1e36568675b`.
Eight materials separate walnut frame/feet, iron, honed steel, brass, leather,
oxblood shield face and lighter ash pole/shield boards. Grain UVs follow the
source frame and use the existing cached 0.4-strength furniture finish.

Paint regions follow the weapon silhouettes and raised front surfaces. The
shield has a brass rim/cross, the round shield has iron rim/boss/cross straps,
and the club has dark bands. Rear shield faces stay wood. Masking accounts for
where the sculpt fuses weapons into the wooden rails rather than painting broad
metal stripes across the frame.

Oversized source facets and the narrow shield relief are subdivided before seam
cuts; normals interpolate on the same source surface. Vertices are not moved to
new contours, and scale/origin/facing/footprint remain unchanged. The derivative
has **79,670 triangles / 64,912 vertices**, 16-bit indices and eight batched
materials. Packed JS is approximately 2.36 MiB, including UVs, labels and provenance.
No source STL parsing, material classification or subdivision happens at play.

## Integration

Replace the current weapons-rack source script in `index.html` with:

```html
<script defer src="assets/models/furniture/weapons-rack.js"></script>
```

Keep `src/view/furniture-surfaces.js` before `src/view/stl-models.js` as currently
configured. The asset retains ID `weapons-rack`; the board, Test room and Models
use its existing factory, rotation and uniform fit. No runtime changes needed.
Do not load both rack assets or discard the original source/notices.

## Artwork authoring and limits

`../../previews/weapons-rack-painted.png` is a four-angle offline software
render with a depth buffer and interpolated source normals. Front, opposite
front, rear and elevated views informed seam refinement. The supplied rack image
and `references/visual/system-furniture-weapon-rack.gif` guided material choices;
they are references, not UV artwork. The finishes are authored colours/grain,
not an exact original paint standard.

The preview omits runtime grain maps, metal reflections, board fitting and torch
lighting. The supplied low-poly source has fused/overlapping rail and weapon
surfaces; its silhouette and intersections are retained. No browser inspection,
performance benchmark, gameplay/save check, test/build/lint or direct-file pass
was run. Mark is manually reviewing the game.

Parent integration follow-up: index now loads the painted derivative. Mark
approved one focused Chrome check on 2026-10-22; the rack rendered in Models
without reported console warnings/errors. No torch-lit board/performance pass.

# Painted hero derivatives

The original shared-drive STL imports remain in `../imported/`. Mark described
those files as open-licence, but creator, source link and exact licence remain
unverified; these paint derivatives do not establish new rights to the sculpts.
No model from Free3D is included.

## Wizard — 23 October 2026

`wizard.js` replaces only the runtime Wizard asset. Its source is
`Minis/WizardNewBase.stl`, imported as `../imported/wizard.js` (23,999 triangles).
The guarded packed position/normal/index SHA-256 is
`323d3c8b1886db866a09d99d55c3d3a13b9a955e4147e585caf44173ea0ec77f`.
The source STL hash is retained inside the derivative metadata.

Palette reference: original North American `system-character-cards.pdf`, PDF
page 4, plus `references/visual/system-wizard.gif` for the miniature's forms.
The card suggests ivory clothing, a plum cloak, teal trousers, blond hair, dark
leather and a gold-topped staff. This palette is an authored interpretation of the illustration, not a claim
that the original plastic miniature was painted.

Recipe: `scripts/paint_wizard.py` (numpy), with `--preview` using Pillow and
`paint_preview.py`. Its input is Mark's unmodified
`scripts/paint-regions/wizard.json` export from `wizard-paint-regions (2).json`, received 23 October 2026. The export
identifies this exact imported geometry and each region in original triangle
order. Regenerating the runtime asset needs no Downloads files or tmp helpers.

Mark clarified that the brush colours identify regions, not final finishes.
`FINISHES` in the recipe applies natural ivory linen, muted plum wool, dark teal
trousers, brown leather gloves/boots/belt, warm blond hair, skin, walnut wood,
antique-gold fittings, a ruby-red forehead gem, blue irises and the charcoal base. The staff end
has a bronze ferrule. This is an authored palette guided by the original card.

The 580 unmarked source faces inherit the closest marked region along shared
surface edges. No gap fill projects through the model. Corner-angle region votes
and face-centre anchors soften coarse brush steps with offline triangle cuts;
The exported angular eye patches serve as landmarks: their area-weighted centres
are levelled, and only the nearby source triangles are subdivided with
interpolated normals. Matching almond-shaped eye openings, larger circular blue irises partially
covered by relaxed upper lids, dark pupils and tiny highlights replace the
polygon-shaped patches. The lip relief is raised by up to .45 source units using a compact smooth local
displacement; the nose, eyes and jawline stay fixed. Normals follow the same warp
through its inverse transpose. A fine skin-toned line follows the raised slanted
crease, replacing the misplaced oval lip patch. Nearby facial triangles are
subdivided only where needed for the paint boundary. The export's
Black region maps to blue irises, and Red identifies the forehead gem. The original import and markings remain intact. The derivative retains the
sculpt outside that small lip adjustment, plus its facing, footprint and gameplay. All regions
are batched by material; no runtime painting or extra animation loop is added.
The derivative records both the geometry and authoring-export SHA-256.

Review for this export: offline depth-correct smooth-normal front, quarter, rear
and side authoring views, plus front and two oblique facial close-ups. No new browser gameplay/save, torch-light or
performance pass. The ignored local `assets/previews/wizard-painted.png` records
the prepared result when generated with `--preview`; `wizard-face-painted.png`
records three matching close-up face angles. Earlier isolated Chrome renders belonged to the superseded
manually traced paint and do not verify this revision.

[Model painter](../../../model-painter.html) continues to use the neutral original
import. Its local draft and exported markings are not modified by preparation.

# HeroQuest visual direction

Use a readable digital tabletop with static miniatures, based on original game components. Preserve quest geometry, occupied footprints, piece identity, and card content while allowing simplified original models, textures, and interface artwork.

## References

| Source | Use |
| --- | --- |
| [Original miniature gallery](https://north-american.yeoldeinn.com/miniatures.php#system) | Hero/monster silhouettes, poses, weapons, bases, and original plastic colours |
| [Original furniture gallery](https://north-american.yeoldeinn.com/furniture.php#system) | Door frames and furniture shapes, proportions, colours, and decorative details |
| Original Armoury and identification guide | Furniture-to-map-symbol mapping, equipment silhouettes, stairs, and trap/blocked-square tiles |
| Original card PDFs | Card illustrations, frames, iconography, headings, and readable original text |
| Original quest book and tiles | Grid layout, map symbols, footprint/orientation, room reveals, and floor markers |

The base-system selection contains 18 miniature pictures and 14 furniture/door pictures. These are reference images, not 32 ready-made 3D models. The full galleries also contain expansion components; only base-system images belong in the initial selection. Explicit picture URLs and local paths are in `references/sources.json`.

## Board

Construct the board from data shared with the rules engine. Establish and visually verify the original grid, room boundaries, corridor widths, door edges, furniture footprints, and orientation before modelling. Keep scenery separate from authoritative topology.

Use stone floors and a visible square grid. Low walls, faded foreground walls, or the original board's flat wall markings can preserve visibility. Provide angled and overhead camera views, zoom limits, a clear selected square, and distinct selectable pieces. Camera movement must not reveal undiscovered entities.

The exploration entry uses the original Trial layout and actual discovery. The reusable board trace is 26 × 19 with 22 rooms; only the quest’s walkable areas and discovered cells appear. The separate `studio.html` preserves the full-board visual study with central sample placements and a fixed explored-room preview. Those placements are not a quest.

Unexplored floors, rooms and corridors are absent. Once discovered, terrain and furniture remain; terrain outside current sight dims. **Use realistic line of sight** controls movable pieces only: when enabled, monsters disappear outside combined hero sight. It defaults off. See EXPLORATION.md for the distinction between terrain sight, full room reveals and movable visibility; do not reuse display calculations uncritically as spell/attack rules.

## Static miniatures

Create four distinct hero silhouettes and reusable models for the eight standard monster types. Add a Chaos Warlock figure when needed to represent the book's special characters, using each quest's actual rules. Goblin and orc weapon/pose variants are optional polish; they must not imply different statistics unless a quest says so.

Use simple material groups and bases to keep pieces distinguishable at board scale. Models hop as whole pieces between squares and turn to face each traversed step, retaining their final facing. No rigging, walking, idle, or combat animation is required. Convey combat through dice results, health feedback, selection, sound if later chosen, and the event log.

Mark's supplied STL collection replaces the handmade miniature studies. Forty source files cover the four heroes, standard monsters and weapon variants, a Chaos Warlock, separate gargoyle wings, furniture/components, a combat die and six tile models. The original files are preserved locally under ignored `references/stl-source/`; see the source inventory and `assets/models/imported/catalog.json` for exact filenames, hashes and actual conversion counts.

The exploration entry loads the four heroes, Trial monster types and required scenery from supplied derivatives. The separate studio still loads barbarian, cleaver orc, table and closed door. The barbarian has authored paint; other models use simple matte colours. STL supplies shape without painted material regions or textures, so keep paint separate from geometry. The original stance/anatomy come from the supplied sculpt.

The barbarian uses 10 clean material regions: natural skin, dark chestnut hair, red cloth, brown leather, ivory fur, steel, bronze, stone, charcoal rim and soft facial definition. Sculpt-landmark masks assign uniform face materials. There is no baked curvature wash, pigment noise or vertex colour; scene lighting supplies the shading. The old dark grip mask spilled onto the bare hand and has been removed. Metal gets separate roughness/metalness and a local generated reflection environment. The runtime batches by material instead of making a draw call for each patch. The mesh itself is unchanged. See `scripts/paint_barbarian.py`, `assets/models/barbarian-paint.js` and the offline authoring preview `assets/previews/barbarian-painted.png`. The clean colour-layout preview was inspected during editing; no new browser check was run for this revision.

The converter changes print Z-up to browser Y-up and centres on the source's shallow bottom band. Runtime fitting is uniform: miniature bases are about 0.8 squares, furniture fits its quest footprint, and doors span about 1.23 squares. Each sample's internal orientation is independent of its board rotation. Inspecting source geometry identified the barbarian's sideways facing and the orc's backwards facing; their runtime transforms correct these. Decorative overhang does not change occupancy.

`barbarian.html` opens the imported hero in the separate studio, whose camera fits its actual bounds. Exploration has a different camera controller; Home centres the active hero there rather than exiting studio inspection.

The tomb uses its two supplied source halves. Gargoyle wings remain unassembled, and bookcases, weapons rack and stairway are simplified generated scenery. Other prepared components are not automatically game-ready. Preserve source proportions through uniform fitting, and use authoritative grid footprints rather than filenames or mesh bounds. Some complex components stopped above their target triangle budgets; the unused spiral stair remains roughly 122,000 triangles.

`assets/models/README.md` documents offline simplification and local classic-script packing. This preserves direct-file play and introduces no runtime CDN, model parsing, dependency installation or build step. The original handmade studies have been retired to an ignored local directory. Source licence/creator details are unknown beyond Mark's statement that this shared-drive collection is open licence; record that provenance without inventing a specific licence.

## Furniture

Prioritise doors, chests, tables, bookcases, cupboard, throne, tomb, fireplace, alchemist's bench, sorcerer's table, torture rack, and weapons rack. Reuse repeated furniture models. Record its footprint and rotation from each quest independently of the mesh dimensions. Decorative overhang must not create extra blocked cells or conceal the grid.

## Cards and controls

Keep original card names, wording, numerical values, and symbols readable in a DOM panel or dialog. Artwork is supplementary to the text. Differentiate hero spells, Chaos spells, treasure, artifacts, and equipment without relying solely on colour. Support keyboard focus and touch selection; detailed touch layout depends on the chosen device.

## Runtime assets and reference archive

Downloaded images/scans remain under `references/`; they are never hotlinked during play or copied automatically into `assets/`. Choose runtime artwork deliberately and keep credits with it. The application must work without accessing Ye Olde Inn, Hasbro, a CDN, or a remote image/AI service during a session.

## Shared interface foundation

`ui.css` defines the exploration palette, typography, buttons, fields, panels, checkbox rows, callouts and dialog styles. Setup, Mentor’s briefing, handoff, menu, instructions, attack confirmation, dice results and restart confirmation use native modal dialogs and this common styling. Piece descriptions and local actions live in the anchored non-modal context panel. Keep future character sheets, cards, inventory and combat prompts consistent with those components. The studio retains its compact earlier layout.

The main table separates turn controls, discovered 3D terrain and an adventure journal. Gold inset squares indicate legal destinations; active ownership and movement budget remain in DOM text. Every revealed model and known tile opens a non-modal action panel beside its selection. Hover and selection share a light-blue silhouette glow when within current movement/action reach, or yellow otherwise, produced in screen space without changing the painted model materials. Relevant disabled actions remain visible with reasons. Roll movement/End turn stay in the sidebar; local move/door/attack actions do not. Rolls and decisions use the shared modal layer. Shift + arrows selects known tiles, [ / ] cycles revealed pieces, and Enter opens their context panel as a keyboard alternative to pointing. Breakpoints collapse the journal/sidebar layout, but mobile/touch layout has not received an approved verification pass yet.

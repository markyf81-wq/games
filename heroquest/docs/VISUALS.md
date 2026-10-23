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

The exploration entry uses the original Trial layout and actual discovery. The reusable board trace is 26 × 19 with 22 rooms; only the quest’s walkable areas and discovered cells appear. The older full-board visual study has been retired; use the in-game Models viewer to inspect current pieces.

Unexplored floors, rooms and corridors are absent. Once discovered, terrain, furniture and living miniatures remain visible; explored terrain brightness follows scene lighting alone. The realistic line-of-sight display option has been removed. Full room reveals and individual spell/attack sight still follow their own rules; do not reuse display visibility as targeting legality.

## Model inspection modal

The main Models button and setup View models button open a 32-type grouped
model selector with orbit/zoom/reset controls. It reuses game geometry with
independent materials, lights and reflections, fitting each object uniformly
in a fixed-height stage. See MODEL-VIEWER.md for controls, caching/isolation and
source-only verification status. Generated props and the red movement die now
share their factories between game and viewer.

## Tall wall prototype and routes

The first supplied wall set is integrated with clean warm stone/recess colours,
plinth removal, shared full/one-space geometry and discovered-edge fitting around
known door openings. Full walls, Automatic cutaway and Low walls cycle from a
persistent main-view button. Camera cutaway clips and caps walls smoothly; shadows,
walls remain noninteractive scenery without outlines or contexts. Selected
destination ribbons follow the known weighted grid route in blue/yellow.
See [WALLS.md](WALLS.md) for source attribution, fitting, saved preference,
implementation and the source-only verification status. Only the original tall
stone walls remain. Stable quest/coordinate hashes vary one-/two-square lengths,
exposed faces, mirrored orientation and subtle stone tones. Wall dimensions,
door gaps and cutaway controls are retained; the style switch is removed.

## Board artwork, stair tile and UI dice - 2026-10-21

The generated floor-pattern recreation is replaced by Mark's supplied
`ww7sy558ez381.jpg`. It matches the existing 26 x 19 layout; its creator and
whether it is an official scan or illustrated recreation have not been verified.
The image is visual artwork, not an authority for original NA rules or quests.

`scripts/prepare_board_texture.py` crops the black border at source pixels
[74,74,1972,1461], producing a 1898 x 1387 atlas (73 pixels per square), encoded
as WebP quality 93. Room/corridor art and printed white boundaries are retained;
no recolouring/redraw is applied. Original and derivative hashes/provenance are
recorded with the packed asset. The original remains in ignored local references.

`src/view/component-textures.js` caches sRGB textures from local classic-script
data URIs; decoding completion requests one redraw of the board/any open viewer.
This avoids runtime fetches and file-origin WebGL texture restrictions. The
existing region instances, UV cell offsets, hidden-cell zero scales and sight
dimming are preserved. The image never determines topology or discoveries.

The original 2x2 stair artwork is cropped directly from `system-tiles`, PDF page
1, upper stair tile at lower right, native embedded scan pixels [1198,598,1463,863].
A thin 1.94-square tile with a lit textured top replaces generated step bars.
Board and Models share the factory/texture; movement/sight/shared-stair rules are
unchanged. The source's scanner/copyright notice is recorded in
`assets/textures/tiles/README.md`; do not claim it is open-licensed or newly drawn.

See `assets/textures/board/README.md`, `assets/textures/tiles/README.md` and
ASSET-AUDIT.md for provenance, authoring recipes, remaining placeholders and the
separately supplied weapons-rack model. Crops were inspected during authoring; no
new browser, scene alignment, direct-file, lighting or save checks were run.

Mark's later plain-floor screenshot exposed an immutable texture allocation
issue: the original loader uploaded a 1x1 fallback and then swapped in a larger
image. The bundled WebGL renderer does not resize that allocation on upload.
The loader now allocates a canvas at the final asset dimensions before rendering
and draws decoded artwork into it, retaining the same source and storage size.
This fixes the shared board/stair loading path. Renderer source was inspected;
the connected Chrome diagnostic was unavailable, so no browser result is claimed.

Sidebar dice use red bodies and white SVG pips. Combat results use ivory die
faces with transparent symbols projected from the supplied combat die's ink
triangles by `scripts/prepare_die_icons.py`; output is `assets/ui/dice/*.png`.
The skull, lion shield and black shield match the sculpt used in the 3D tray;
the flat black-shield icon is oriented with the helmet above the skull.
Each face has an accessible text label. No extra WebGL context is needed for icons.

The roll modal reserves header, description, result and action height even when
the result is hidden; ready/rolling/settled stages share those regions. Responsive
tray height and normal dialog scrolling handle shorter windows. The combat
summary reserves content height as well. Redundant instructions/status copy were
removed; original quest narrative, rule help and disabled-action reasons remain.
This revision has source/diff and offline icon-authoring review only, with no
browser/layout, graphics or performance verification.

## Quest room torches

`src/view/torch-placement.js` calculates decorative wall sconces for every room
used by the quest. `src/view/torches.js` renders them with existing shared models.
Iron backplates/brackets attach directly to the wall's inner face
and support wooden handles; the earlier stone support columns are removed. Layered
procedural flame meshes and an additive radial halo accompany warm point lights.
These fixtures are authored atmosphere, not transcribed quest furniture: they
have no occupancy or gameplay sight effects. Discovered-cell gating controls their
appearance; the regular entity map supplies picking, reach outlines and context
panels with Move here/Centre view.

The pure `placeQuestTorches(quest, board)` helper evaluates each room's perimeter
once, before discovery filtering. Candidates must be floor cells without blocked
stone or furniture, must have the directly inward cell clear of both, and cannot
occupy a door's wall segment. Stairs count as furniture for mounting clearance.
Each fixture faces inward with the existing wall-face offset. Static quest data
determines placement; moving actors, camera, discovery order and gameplay RNG
never influence it.

The first candidate minimizes the sum of squared distances from room cells to
the light. Rooms of at least 20 squares may get a second torch, chosen to improve
combined nearest-light coverage and separated from the first by at least half
the longer room dimension (capped at three squares). Small rooms get one; large
rooms never exceed two and keep one if a sufficiently separated clear mount is
unavailable. Quest-ID/candidate-ID hashes break ties deterministically, so the
same quest layout always generates the same placements and stable IDs. There is
no per-quest coordinate list or per-playthrough seed. Completely obstructed
perimeters are left without a fixture rather than mounting one in furniture;
future quest layouts must retain at least one clear wall approach per room.

The quest's other board rooms remain unused, and no corridor sconces are added.
Each fixture is filtered by its discovered cell before creating its model/light,
so existing saves gain the scenery as their rooms are rendered. This changes no
quest source data, movement, sight rules or save schema. Layouts are regenerated
from quest data on load rather than saved separately. This change has source
review only; no placement execution, browser or performance check was run.

Dynamic lighting starts enabled. Its main-view On/Off button sits beside wall
controls. On disables the directional key/fill lights, darkens the background
and uses discovered torches with adjustable global illumination (default hemisphere
intensity 0.546 versus 2.1 in full lighting). Metallic reflections default to 0.08
versus 0.75 and scale with the background light level.
This keeps areas away from fixtures gloomy but visible. Interaction
outlines, markers and route lines remain readable overlays.
Off restores full tabletop lighting and leaves the unlit fixtures visible.
The optional saved view field `torchLightingEnabled` preserves the choice;
missing values retain the enabled default. Dice and the model viewer keep their
own independent studio lighting.

Menu shows a Background light slider only while dynamic lighting is on. Its
0–100% value adjusts hemisphere intensity from 0 to 2.1 live; the default is 26%.
It preserves torch brightness and saves the chosen level on release, retaining
it when dynamic lighting is switched off/on. See SAVES.md.

Show square grid adds pale grey-green strips above discovered floor squares,
using a rough standard surface material that receives lighting and shadows.
The single mesh has deduplicated 0.024-square-wide edges and upward normals;
there is no extra dimming outside current hero sight. Floor seams/paving remain visible
when it is off; internal stair lines stay absent.

Cosmetic sine waves vary intensity, flame height/sway and halo brightness without
consuming game RNG. At most one nearby torch casts shadows, using a 512-pixel cube
map. The caster is nearest the camera focus; other torches still illuminate but
do not cast shadows. Solid torch fixtures do not cast shadows: the point emitter
above the basket otherwise projects an exaggerated wedge down the wall/floor.
Walls and models retain shadows. PCF filter radius is 4 for torches and 3 for the
fully lit directional light, softening edges without extra shadow maps.
Shadow maps are cached until movement, projection/wall changes, context
restoration or selection of a different shadow light. The main directional shadow
uses that invalidation path in fully lit mode; it is disabled in torch mode.
Flicker requests are capped by a 34 ms timer plus requestAnimationFrame and only
continue while a torch's influence intersects the camera frustum. Normal model
movement retains its existing animation cadence. Background tabs/context loss
cancel scheduled flicker; reduced motion holds a steady flame and light.

Each torch also has 24 pooled camera-facing instanced quads: 18 rising flame
flecks and six small embers, with deterministic staggered lifetimes, sway and
additive fade. Geometry/materials are shared, with one particle draw call per
fixture. Updates use the existing bounded flicker cadence only while the light
is enabled/in view. Reduced motion hides particles; hidden/context-lost tabs
already stop the torch timer. Particles neither cast shadows nor participate in
picking/glow masks, consume no engine RNG and are not saved. The viewer shows a
static particle arrangement rather than starting a second animation loop.

The underlying flame meshes are smaller, smoother translucent shapes (outer
opacity 0.28, core 0.5), using additive blending without depth writes. This lets
the particles blend through the flame instead of being hidden by an opaque
orange teardrop. Light intensity and shadow behaviour are unchanged.

This lighting revision has source/diff review only. Browser appearance, toggling/
refresh, reduced motion and performance have not received a new verification pass.

## Static miniatures

Create four distinct hero silhouettes and reusable models for the eight standard monster types. Add a Chaos Warlock figure when needed to represent the book's special characters, using each quest's actual rules. Goblin and orc weapon/pose variants are optional polish; they must not imply different statistics unless a quest says so.

Use simple material groups and bases to keep pieces distinguishable at board scale. Models hop as whole pieces between squares and turn to face each traversed step, retaining their final facing. No rigging, walking, idle, or combat animation is required. Convey combat through dice results, health feedback, selection, sound if later chosen, and the event log.

Mark's supplied STL collection replaces the handmade miniature studies. Forty source files cover the four heroes, standard monsters and weapon variants, a Chaos Warlock, separate gargoyle wings, furniture/components, a combat die and six tile models. The original files are preserved locally under ignored `references/stl-source/`; see the source inventory and `assets/models/imported/catalog.json` for exact filenames, hashes and actual conversion counts.

The exploration entry loads the four heroes, Trial monster types and required scenery from supplied derivatives. Models and the Test room share the board factories. The barbarian has authored paint; furniture/doors/rubble now use painted derivatives, while other heroes/monsters retain simple colours. STL supplies shape without painted material regions or textures, so keep paint separate from geometry. The original stance/anatomy come from the supplied sculpt.

The barbarian uses eight materials: skin, dark chestnut hair, red cloth, leather, ivory fur, steel, bronze and a dark grey base. Sculpt-landmark contours are refined around the hairline/crown, loincloth, belt, boot cuffs and sword fittings. The offline recipe cuts crossing triangles at material seams, interpolating the existing surface/normals, rather than assigning whole faces across clothing boundaries. The original imported sculpt remains unchanged; the guarded paint asset supplies the prepared surface. Metal retains separate roughness/metalness and local reflections; there is no baked wash or pigment noise. Runtime decoding/material grouping is cached. Every other hero/monster also gets a separate dark grey (#35383b) top/rim material for its two-unit-high base. Furniture/door materials stay independent. See `scripts/paint_barbarian.py`, `assets/models/barbarian-paint.js` and `assets/previews/barbarian-painted.png`. Source and front/three-quarter/back/above offline authoring views were reviewed; no new browser check was run.

The converter changes print Z-up to browser Y-up and centres on the source's shallow bottom band. Runtime fitting is uniform: miniature bases are about 0.8 squares, furniture fits its quest footprint, and doors span about 1.23 squares. Each sample's internal orientation is independent of its board rotation. Inspecting source geometry identified the barbarian's sideways facing and the orc's backwards facing; their runtime transforms correct these. Decorative overhang does not change occupancy.

The older barbarian/studio pages have been removed. Use Models to inspect the imported hero; Home on the exploration canvas centres the active hero.

The tomb uses its two supplied source halves. Gargoyle wings remain unassembled, and bookcases remain generated placeholders; the weapons rack now uses the supplied xbeaker sculpt. The stairway uses original tile-sheet artwork on a thin tile. Other prepared components are not automatically game-ready. Preserve source proportions through uniform fitting, and use authoritative grid footprints rather than filenames or mesh bounds. Some complex components stopped above their target triangle budgets; the unused spiral stair remains roughly 122,000 triangles.

`references/MODEL-SOURCES.md` documents offline simplification and local classic-script packing. This preserves direct-file play and introduces no runtime CDN, model parsing, dependency installation or build step. The original handmade studies have been retired to an ignored local directory. Source licence/creator details are unknown beyond Mark's statement that this shared-drive collection is open licence; record that provenance without inventing a specific licence.

## Furniture

Prioritise doors, chests, tables, bookcases, cupboard, throne, tomb, fireplace, alchemist's bench, sorcerer's table, torture rack, and weapons rack. Reuse repeated furniture models. Record its footprint and rotation from each quest independently of the mesh dimensions. Decorative overhang must not create extra blocked cells or conceal the grid.

## Cards and controls

Keep original card names, wording, numerical values, and symbols readable in a DOM panel or dialog. Artwork is supplementary to the text. Differentiate hero spells, Chaos spells, treasure, artifacts, and equipment without relying solely on colour. Support keyboard focus and touch selection; detailed touch layout depends on the chosen device.

## Runtime assets and reference archive

Downloaded images/scans remain under `references/`; they are never hotlinked during play or copied automatically into `assets/`. Choose runtime artwork deliberately and keep credits with it. The application must work without accessing Ye Olde Inn, Hasbro, a CDN, or a remote image/AI service during a session.

## Shared interface foundation

`ui.css` defines the exploration palette, typography, buttons, fields, panels, checkbox rows, callouts and dialog styles. Setup, Mentor’s briefing, handoff, menu, instructions, attack confirmation, dice results and restart confirmation use native modal dialogs and this common styling. Piece descriptions and local actions live in the anchored non-modal context panel. Keep future character sheets, cards, inventory and combat prompts consistent with those components. The standalone studio has been removed; Models owns inspection.

The main table separates turn controls, discovered 3D terrain and an adventure journal. Reachable squares have no filled overlay; hover outlines and path previews indicate reach, while active ownership and movement budget remain in DOM text. Every interactive revealed model (excluding walls) and known tile opens a non-modal action panel beside its selection. Hover and selection share a light-blue silhouette glow when within current movement/action reach, or yellow otherwise, produced in screen space without changing the painted model materials. Relevant disabled actions remain visible with reasons. Roll movement/End turn stay in the sidebar; local move/door/attack actions do not. Rolls and decisions use the shared modal layer. Shift + arrows selects known tiles, [ / ] cycles revealed pieces, and Enter opens their context panel as a keyboard alternative to pointing. Breakpoints collapse the journal/sidebar layout, but mobile/touch layout has not received an approved verification pass yet.

## Miniature portraits

`src/ui/portraits.js` renders small bust views of the actual painted hero/monster models. Setup selections, party/active hero, handoffs, miniature context panels, movement/combat rolls and attack/defence summaries share these portraits. Combat shows both participants next to readable names/roles. The shared lazy 160x160 renderer captures each kind once, caches PNGs and has no idle loop. Geometry stays shared; portrait materials/reflections remain independent from dungeon lighting. Missing WebGL keeps a decorative initial and all readable text/actions. Portrait UI has source review only; no new browser/layout check.

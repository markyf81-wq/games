# HeroQuest agent guide

## Purpose and status

Original North American HeroQuest for one shared browser with human heroes and CPU Zargon. The current entry implements **a combat prototype**: setup, 1–4 selected heroes, 2d6 movement, doors, discovery, sight, melee attacks, defence/Body Points, defeated-piece removal, CPU monster turns, handoffs and browser autosave on The Trial map. No searches, spells, healing, thrown weapons, traps, quest completion, possessions recovery or audio. Do not call it a complete playable quest or add a catalog entry until one exists. Read README, docs/EXPLORATION.md, docs/PLAN.md, docs/CONTENT.md, docs/COMBAT.md and docs/SAVES.md before extending it.

## File map

- `index.html`, `ui.css`: exploration entry, shared UI tokens/components, setup, briefing, handoff, menu, help, rolls/decisions and restart dialogs, plus anchored board context panels.
- `heroquest.css`: shared base/studio styling; loaded before `ui.css` in exploration.
- `src/data/board.js`: 26 × 19 board, 22 traced room rectangles and separate visual-studio sample placements.
- `src/data/trial.js`: source-linked exploration rule locators, four starting heroes, original Trial map/narrative/notes. Exact hero stair squares are a documented digital choice.
- `src/rules/topology.js`: pure grid/door queries, movement routes, occupancy, centre-to-centre sight and corner handling. No render geometry.
- `src/data/combat.js`: visually reviewed original starting hero/monster stats, weapons and combat rule locators; die face distribution has separate community corroboration status.
- `src/rules/combat.js`: living/adjacency queries, legal melee targets and shared recorded attack/defence resolution.
- `src/ai/zargon.js`: deterministic nearest-reachable-hero policy, separate from legal rules.
- `src/ui/context.js`: non-modal anchored context panels, descriptions/actions, disabled reasons, focus and dismissal.
- `src/view/interaction-glow.js`: on-demand screen-space hover/selection silhouettes sharing source geometry without altering its materials.
- `src/ui/combat.js`: common combat intro/result dialog contents.
- `src/ui/portraits.js`: lazy shared 160px studio renderer, per-kind bust framing and cached PNG portraits of the actual hero/monster factories; setup, party, active hero, handoff, context, dice and combat panels. Decorative images retain adjacent readable names; no state/RNG/save changes.
- `src/ui/die-faces.js`, `assets/ui/dice/*.png`, `scripts/prepare_die_icons.py`: shared red/white pip icons and sculpt-derived combat symbol icons, with accessible names and offline preparation.
- `src/ui/model-viewer.js`: grouped 31-type model selector, separate lazy studio renderer, cached/fitted previews, drag/pinch/keyboard orbit and zoom; no engine/save data. See docs/MODEL-VIEWER.md.
- `src/view/dice-models.js`, `assets/models/movement-die-body.js`, `scripts/prepare_movement_die.py`: shared red movement die using a blank convex hull of the combat sculpt, cached surface-fitted white pips and unchanged face mapping for tray/viewer. Offline recipe uses numpy/Node and the local Three npm archive.
- `src/ui/dice.js`: shared lazy Three.js dice tray, manual/automatic Roll button, outcome-aligned scripted animation and accessible result fallback. See docs/DICE.md.
- `assets/models/combat-die-paint.js`, `scripts/prepare_combat_die.py`: guarded ink regions and authored face normal/up/result mapping for the supplied combat die.
- `src/engine/exploration.js`: serializable state, deterministic dice, validated commands, discovery memory and filtered projection.
- `src/session/app.js`: DOM/session controller, setup and command dispatch, accessible movement, turn/menu/context UI.
- `src/session/storage.js`: versioned browser autosave, guarded storage access and saved-state validation. See docs/SAVES.md.
- `src/ui/dialogs.js`: common native-dialog show/close/focus flow and cancellable action confirmation; setup, briefing, handoff and engine-result decisions cannot be dismissed with Escape.
- `src/view/tabletop.js`: exploration scene, discovered terrain, route ribbon and reach outlines, clipping-aware picking, camera and visible pieces.
- `src/view/walls.js`, `assets/models/walls/`, `scripts/prepare_walls.py`: source-attributed original tall wall derivatives, deterministic orientation/length/tone variation, discovered boundary assembly, known door gaps and Full/Automatic cutaway/Low modes with smooth clipped/capped height. See docs/WALLS.md.
- `src/view/floors.js`: shared user-supplied board image atlas, per-instance cell UV offsets and one material per region; discovered cells remain data-driven; explored floor brightness follows scene lighting alone.
- `src/view/component-textures.js`, `assets/textures/`: cached sRGB textures from packed image data URIs; completion events redraw board/viewer without idle loops. Includes supplied board artwork and original scanned stair tile. See docs/ASSET-AUDIT.md and asset credit READMEs.
- `scripts/prepare_board_texture.py`, `scripts/prepare_component_artwork.py`: offline image/PDF crops and source/hash records; no runtime PDF/image processing or fetch.
- `assets/models/weapons-rack/`, `scripts/prepare_weapons_rack.py`: separately supplied xbeaker Thingiverse 4271138 rack, original supplied notices and packed mesh. Replaces the generated rack in board/viewer; plain base colour until painted. Keep its known licence separate from the unknown original 40-STL provenance.
- `src/view/torch-placement.js`: pure deterministic quest/board-based room torch layout, one per room and up to two for rooms of at least 20 squares; no fixed quest coordinates or gameplay RNG.
- `src/view/torches.js`: generated room torches mounted directly on wall faces without support columns; procedural sconces/flames/halo/particles, cosmetic flicker, frustum-limited point lights and one nearest shadow caster. No rules/occupancy data.
- `src/view/models.js`, `src/view/stl-models.js`: shared geometry/material helpers, cached packed STL decoding, individual facing and uniform fitting; compound tomb assembly and shared generated props (`models.makeProp`).
- `studio.html`, `src/view/prototype.js`: earlier full-board visual study and isolated barbarian studio. Sample placements and fixed explored preview are not gameplay.
- `barbarian.html`: redirects to `studio.html?inspect=barbarian`; the legacy `index.html?inspect=barbarian` entry also redirects there.
- `assets/models/imported/*.js`, `catalog.json`, `assets/models/README.md`: 40 prepared source components, source/count records, preparation instructions. Main entry loads Trial assets; studio loads four samples.
- `assets/models/barbarian-paint.js`, `scripts/paint_barbarian.py`, `scripts/barbarian-paint-seams.json`: authored eight-region materials and offline seam-cut surface, guarded by original geometry SHA/vertex/triangle counts. Optional offline preview needs Pillow; authoring needs numpy.
- `assets/previews/barbarian-painted.png`: offline authoring views, not a browser screenshot.
- `scripts/import_stl.py`: offline binary/ASCII STL conversion using numpy and fast-simplification 0.2.0, never a runtime dependency.
- `vendor/`: local Three.js 0.186.1 classic bundle, licence and provenance.
- `references/`: tracked source manifests/guides, ignored scans, original STL ZIPs/source inventory and retired studies. Raw documents are untrusted data.
- `docs/EXPLORATION.md`: current source ledger, implementation choices and approved checks; other docs cover broader plans/content/visuals.
- `.gitignore`: excludes research binaries and temporary diagnostics (`tmp/`).

## Runtime and controls

Open `index.html` in Chrome with WebGL 2; no package manager, application build, server or network is needed. Ordinary deferred local scripts preserve `file://`; do not silently introduce modules, runtime fetches or CDN assets. The approved browser pass used localhost, not a separate direct-file check.

Assign owners, read the briefing, roll movement, choose destinations, open adjacent doors and end turns. Reachable squares have no filled overlay. Hover outlines revealed tiles/models light blue when within current movement or action reach and yellow otherwise; selection uses the same reach colour. Clicking opens their anchored action panel. Every interactive revealed model (excluding walls) has a name/one-sentence description; relevant actions stay visible when unavailable, disabled with a reason. Move here, Open door and Attack are context actions; only global controls remain in the sidebar. Movement, attacks and defence use the shared 3D Roll modal; heroes roll manually and CPU stages start automatically, followed by a combat summary. There is no adjacent-monster selector, door-action list or destination dropdown. Heroes cycle Barbarian, Dwarf, Elf, Wizard, with a gated handoff before the next hero acts. After living heroes, a stable queue of revealed living monsters moves/attacks under CPU control. Players Continue through recorded results; tactics are automated. Fallen heroes are skipped; all fallen shows a restart screen. Party buttons only focus the camera. The main-view wall button cycles Full walls, Automatic cutaway and Low walls; the adjacent Dynamic lighting button toggles gloomy torch lighting/full lighting. Menu controls sight, grid, help and confirmed restart.

Canvas: Shift + arrows selects discovered squares, [ / ] cycles projected revealed pieces, Enter opens the selected context panel, Escape closes it; ordinary arrows still rotate. Drag rotates, Shift-drag pans, scroll/pinch and plus/minus zoom, arrows rotate, Home centres the active hero. Tabletop/Overhead changes angle; Explored map fits discovered cells only. The studio retains its older controls: Home/Return to board exits inspection, Escape clears selection. Do not conflate these two camera controllers.

Autosave uses `localStorage` key `heroquest.session.v1`, envelope version 1, state schema 2 and content ID `the-trial-combat-v1`. Every accepted command saves before presentation; reload automatically restores engine pending reports/handoffs, introductory/movement dialogs, queue/cursor and RNG without repeating outcomes. Camera/facing/grid/wall mode are plain presentation snapshots, also captured on page hide. New adventure replaces the slot only on setup submission. Corrupt/incompatible data is retained and explained in setup; write failures show in the footer. There are no earlier persisted versions to migrate, cloud saves or import/export. Future format/content changes need explicit migration or rejection. No audio setup exists.

## Authenticity and scope

Use the original North American base Game System: Fimir, Chaos Warrior, Chaos spells, Zargon, original quest names and proper names. No remake/European/fan-rule blending. Original Armoury overrides fan equipment cards. Quest/card-specific instructions govern their stated scope. Every transcribed rule/map/stat/card needs source ID, PDF/printed locator and review status. Downloaded, transcribed, visually reviewed and implemented are different states. The Trial Guardian mummy note C overrides attack dice to four. Other quest notes are future data and are not exposed as player hints.

See docs/EXPLORATION.md for the limited reviewed content. The full card/stat/quest audit remains unfinished. The terrain-hiding option, combined party display sight, exact corner treatment, reveal interruption and exact starting stair squares are documented digital choices, not claims of printed rules.

Setup supports 1–4 human players with one chosen hero miniature each. Each slot has a name and hero selector; choosing an assigned hero swaps choices, keeping characters unique. Inactive fields are hidden/disabled but retain values for later count changes. The engine validates `config.heroIds` as 1–4 unique known characters and creates only those actors; omitted `heroIds` retains the four-hero default for existing callers. Selected heroes retain their canonical Barbarian/Dwarf/Elf/Wizard order and starting squares. Occupancy, party sight, turns and defeat use the actual party; no encounter/stat scaling, storage or schema change. This user-requested smaller party replaces the earlier assumption that all four heroes must always participate.

## Engine invariants

- Authoritative state contains ordinary serializable data; no meshes, DOM, callbacks or timers.
- All gameplay mutations use `applyCommand`; rendering never resolves rules or randomness.
- MOVE results include transient `motion` metadata (`actorId`, `from`, actual traversed `path`, optional per-step CPU visibility) outside authoritative state. The controller resolves the command once, locks gameplay input, animates that exact route, then displays the resolved projection/discoveries. Completion only unlocks presentation; it never spends movement or advances turns. Respect reduced motion and finish presentation immediately on hidden tabs/context loss so input cannot remain locked. Camera controls remain available during hops.
- Commands are ROLL_MOVEMENT, MOVE, OPEN_DOOR, ATTACK, END_TURN, ACK_HANDOFF, RESOLVE_MONSTER, ACK_REPORT and SET_REALISTIC_LOS. Rejections preserve input state; accepted commands return a new state.
- Store RNG state and rolled outcomes once. No reroll from frame timing. Movement resolves step by step and pauses at new discovery when on a legal stopping square, retaining unused budget.
- Dice animation never decides results. Hero movement/attack prompts resolve only on Roll; CPU combat/defence stages auto-click the same button. Engine combat remains atomic; presentation stages reveal the saved attack/defence arrays. Persist `dice: {reportId, stage, rolled}` before animation; restore committed rolls settled and unrolled stages waiting/automatic by side. Cancel only uncommitted prompts. Do not rerun an attack to present defence. Respect reduced motion, hidden tabs and context loss; render text outcomes if the tray cannot render.
- The 2×2 stair footprint is one larger shared space requested by Mark, not a confirmed printed rule. `spaceCells` supplies its footprint for sight/melee/CPU approach. `movementCost` is zero only between stair anchors, one across either boundary. Weighted hero routes minimize cost then path length; free internal movement may occur before a roll or at zero budget without setting `movement.started`. Keep logical costs separate from transient animation step counts and remove internal stair grid lines. Heroes can share it; CPU hero occupancy treats the whole stair space as occupied. Prefer empty display anchors when entering.
- Routes use discovered terrain and remembered monster positions, never unseen current positions. Resolve each step against actual occupancy. Pass friends, stop only on an unoccupied normal cell, allow sharing stairs.
- Door/wall/blocked-cell/furniture occupancy is grid data. Render raycasts select only; they never decide legality or sight.
- Room discovery reveals all room contents; corridor/terrain sight is separate from movable-piece sight. Do not silently reuse this presentation sight as future spell/attack targeting.
- Discovery memory persists. Realistic LOS is off by default; on hides movable pieces outside combined hero sight, retaining entities and static scenery/terrain. Camera/menu changes cannot reveal undiscovered areas. Explored map fits discovered cells only.
- Pending handoff blocks actions. Future effects/death decisions/AI activations need explicit serializable queues and pending choices; do not advance turns from visual callbacks.
- Combat uses one action per turn. Attack after traversing any square closes remaining movement; attack before movement allows moving afterwards. Do not let repeated MOVE requests bypass this ordering. Only orthogonal open-edge melee exists; spells/throwing/healing are explicitly unavailable.
- Dice/damage/report data resolve once in the engine, never from dialog or animation callbacks. Pending reports require ACK_REPORT. Zero-Body pieces remain in state but leave occupancy, sight and future activations immediately. Only the current pending combat report’s defeated figure may remain as a noninteractive visual until acknowledgement; then animate its removal. Use original black-shield monster defence and white-shield hero defence.
- CPU policy is documented in docs/COMBAT.md. Activate each revealed living monster once per phase, validate its route and adjacency in the engine, do not open doors or use unrevealed terrain. Advance the activation cursor once per queued ID, outside the figure lookup predicate; advancing it inside `find` skips queued monsters. Sight settings do not deactivate monsters.
- Keep saves authoritative and versioned: persist pending decisions, queue cursor and random outcomes before displaying them. Rebuild the renderer from the saved projection. A CPU phase with no pending report resumes its next activation once; a saved report must be acknowledged before another activation. Never persist meshes or reroll on load. Future triggers/decks must persist consumed IDs/order and use explicit migrations. Do not overwrite a rejected save until the user starts a replacement adventure.
- Hover and selection colour encode reach, not selection state: tiles use projected reachable endpoints; models use legal attack/open-door targets or a reachable square beside their footprint through an open edge. A door requires a reachable endpoint, not a square one step farther away. Camera-centre actions never make an object count as in reach. Use projected/known data only.
- Hero/monster facing is presentation-only, cached per actor in the renderer. Turn towards each traversed grid step via the shortest yaw, retain the final facing on projection updates, and set final facing even for skipped/reduced-motion playback. Clear the facing cache on new setup. Preserve internal STL correction and static furniture rotations.
- Context panels derive action availability from the current engine projection/known occupancy and still dispatch validated commands. Never reveal unseen actual monster coordinates through panels, hover, piece cycling or anchors. Clear selection/panels when commands, movement or pending decisions make them stale. Disabled actions must remain labelled with a readable reason; hiding an unavailable supported action is not the intended UI.
- Context is non-modal; rolls/decisions use the common modal layer. Cancelling an attack confirmation must not roll dice or consume the action. Shared action-dialog content can host future card/target controls without adding unsupported card actions now.
- Every model panel includes an action labelled exactly Move here. Use shared `topology.approachCells` with projected reachable endpoints to select the shortest known legal route to a free square beside furniture, monsters or other heroes. Doors use their endpoints; stairs use their footprint. The active hero’s own square and blocked stone stay disabled with reasons. Movement never shares occupied normal squares or crosses a wall to approach scenery. Reach outlines use the same approach cells; dispatch the chosen destination through MOVE as usual.
- Keep all code/assets/storage isolated from other games. Preserve the existing library return links.
- Torch lighting is presentation only. Add visible fixtures to the normal entity/context/picking path using discovered-cell gating; never reveal terrain or change rules RNG/sight/occupancy. Generated room sconces are authored scenery, not printed quest contents. `view.torchLightingEnabled` is an optional saved preference, default true for older saves. Limit shadows to the nearest eligible torch (512-pixel point-light cube map), cache shadow maps between geometry changes, and invalidate on movement/projection/wall changes or shadow-light switches. A bounded cosmetic timer requests flicker frames only while a light affects the camera view; stop it when disabled, offscreen, hidden or context-lost, and use steady flames under reduced motion. Do not turn the whole game into an unrestricted animation loop.

## Models and provenance

Use the supplied STL-derived heroes/monsters/furniture, uniformly scaled, with independent internal facing and board rotation. Base fitting uses the shallow source base band; decorative overhang never changes occupancy. Decode geometry/normals once and cache them. Do not parse STL, simplify meshes or regenerate normals per frame. The bookcase remains a generated placeholder; the weapons rack uses the separately supplied xbeaker sculpt; stairs use a thin 2x2 tile with original tile-sheet artwork. Tomb halves are assembled, gargoyle wings are not. Not every prepared derivative is a finished game object.

Barbarian paint is a separate, source-hash-guarded surface derivative with eight uniform materials: skin, chestnut hair, leather, red cloth, ivory fur, steel, bronze and dark grey base (#35383b). The offline recipe cuts triangles at authored material seams and interpolates normals, retaining the source surface/stance rather than moving vertices to new contours. The original imported mesh remains untouched. `paint.geometry` supplies the prepared surface; guard fields still refer to the original imported mesh. Keep material grouping/caching, and regenerate the paint after source reconversion. No baked pigment noise or cavity wash. All other hero/monster sculpts use a separate dark grey base material for their shared two-unit-high top/rim. Furniture and doors are excluded. Movement hops last 300 ms per square; rules timing and reduced-motion behavior are unchanged. The subsequent seam refinement uses a traced 3D hair contour, connected-region cleanup, front/back garment profiles, uniform red clothing and the sculpt’s raised belt studs. Enlarged front, side and rear views were inspected in native Chrome, alongside offline authoring renders; no gameplay regression checks were run.

Mark supplied 40 STLs on 2026-10-21 from a personal shared drive and describes them as open licence. Creator/licence/source links are unknown; never invent credits or a specific licence or claim independent verification. No Free3D asset was used. Preserve originals locally.

## Verification and Git

Follow root/Mark instructions: focused source/diff review is normal; do not automatically run tests, builds, lint, browser automation or screenshots. Ask for the specific check outside a minimal diagnostic required to solve a reported problem. Do not add routine tests. Reference PDF inspection is research. On 2026-10-21 Mark approved 12 focused engine checks and a localhost Chrome pass covering setup, movement, doors, discovery and sight; results/limits are in docs/EXPLORATION.md. This does not authorize future unrelated regression runs.

Never create/use/suggest worktrees. Do not commit, push or merge without the exact required authorization. Do not alter other games or saves.

The initial combat milestone received source review only. A minimal engine diagnostic on 2026-10-21 reproduced/fixed Mark’s reported skipped Zargon turns: the first Orc now moves three squares and attacks, the second receives its own report, and both acknowledgements return to the next hero round. See docs/COMBAT.md for setup and limits. No combat browser check or broader regression run has been performed; further verification requires Mark’s approval except the root rule’s minimal problem-diagnostic allowance.

The context-panel/glow update also has focused source review only; no new visual or browser checks have been run for it.

On 2026-10-21 Mark approved eight focused engine/save checks and one localhost Chrome path through shared stairs, manual movement/attack/defence, CPU attack/defence, and refresh preservation. All passed after correcting a duplicate dialog-description ID. See docs/DICE.md for exact coverage and limits; this does not authorize broad regression checks.

The later torch-lighting prototype has focused source/diff review only; no browser/visual/performance checks have been run for it. Previous dice-check approval does not cover lighting.

The later copy/dice-icon/modal-height/floor revision has source/diff and offline
icon-authoring review only. No browser/layout, graphics or performance checks
were run. That earlier revision used authored floor recreations; the supplied board image
and scanned stair artwork now replace those placeholders (see below). Original quest text/rules, engine outcomes and
save schema remain unchanged. Preserve discovery filtering with atlas UV changes.

Tall walls: follow docs/WALLS.md. Build each discovered boundary once, pair only
contiguous edges, leave known door edges open, use a one-space derivative for odd
runs, and never reveal unseen geometry. Reuse the two decoded original wall assets and narrow sculpt-derived join asset;
clipping planes/materials are per wall and clip shadows too. Walls/fillers are
noninteractive scenery: exclude pointer picking, keyboard cycling, selection,
glow and context menus. Other pieces/tiles remain interactive through walls.
Full/cutaway/low are presentation only;
wallMode is an additive optional saved view preference. Retain ldid69's supplied
CC attribution/non-commercial/share-alike notice and changes/credit link.

Only the original ldid69 tall walls remain. The alternate lightweight pack,
style button, models and offline recipe were removed at Mark's request; originals
in Downloads/ignored research are untouched. Ignore old saved `view.wallStyle`
and omit it from future snapshots. Torches retain their full original size.

Wall variation hashes quest ID/coordinates: mix one-/two-space segments, turn
and mirror the inner sculpt only, and vary individual raised stones with stable section-seeded grey/sand/olive/brown tones. Mortar stays neutral; cache stone-island attributes on shared geometry and apply the palette in the vertex shader. Keep the outer
placement frame/joins/caps unchanged. Reuse original geometry; no per-frame
variation or gameplay RNG. Reflected sculpt world matrices retain lighting and
shadows. This revision has source review only, with no new browser pass.

Hovered/selected tile routes use the pure topology query's optional preview budget; the
default legal-movement budget is unchanged. Blue means a reachable endpoint,
yellow a known route beyond current movement. No line for unknown/blocked routes;
clear on context dismissal or command. Never use hidden actual monster positions.
The tall-wall/route revision has source/diff and offline model-authoring review
only; browser, engine, save, layout and performance checks remain unrun.

Hover updates the route without clicking; the clicked route is a fallback when
the pointer leaves a tile. Cache the preview path map per rendered state, clear
it on state changes, and keep blocked/unknown destinations without a route.
Known wall section joins use one narrow stone filler per grid intersection,
including T junctions at two-space midpoints. Never fill an unconnected/door end.
Fillers follow connected visible cut heights and are noninteractive like walls.
This follow-up has source/diff and minimal mesh-data diagnostic review
only; Mark is manually checking the build, so no browser checks were duplicated.

Dynamic lighting is a main-view On/Off button beside the wall controls, saved in
the existing `view.torchLightingEnabled` field. On uses torches with a faint
hemisphere light (default 0.546) and metallic reflections (default 0.08), without directional
key/fill lighting. Off restores
full tabletop lighting. Keep interaction overlays readable and dice/viewer
studio lighting independent. Generate one torch per quest room, up to two for
rooms of at least 20 squares; no corridor or unused-room fixtures. Pure layout
rejects door segments, furniture/blocked mounting cells and obstructed inward
approaches. Minimize room coverage distances, space second fixtures apart, and
use quest/candidate-ID hashes for stable ties. Never use actor positions, camera,
discovery order or gameplay RNG, nor force mounts through occupied wall approaches.
Retain at least one clear approach in future quest layouts. Use inward-facing mounting.
Filter fixtures by discovered cells before model/light creation, including when
restoring existing saves. Areas outside light pools stay gloomy but visible.
Generated placement has source review only; no execution/browser checks run.

Torch fixtures themselves must not cast shadows: a point emitter just above the
basket produces oversized wall/floor wedges. Walls/models still cast shadows.
Keep one nearest-focus shadow-casting torch at 512 pixels; PCF radius 4 softens
its edges, with radius 3 on the fully lit directional light. Source/shader review
only for this fix; no browser check has been run.

Show square grid uses one mesh of pale rough surface strips, 0.024 squares wide,
with upward normals and deduplicated edges. It receives real lighting/shadows
without extra sight-based dimming. Keep depth occlusion and omit internal
shared-stair lines. Disabling it leaves physical floor seams/textures.

Menu's Background light slider is shown only with dynamic lighting enabled.
`view.ambientLightLevel` is an optional integer 0–100, default 26; intensity maps
to 0–2.1 and metal reflections scale with it. Update live on input, save on change;
retain the value through lighting toggles. No save schema/content migration.

Torches pool 24 instanced billboard particles each, sharing geometry/materials.
Deterministic lifetime/sway/fade uses no engine RNG; update within existing
bounded flicker frames, hide for reduced motion/offscreen/disabled lighting, and
stop updates on hidden/context loss. Particles do not cast shadows, receive picks
or enter glow masks (`userData.visualEffect`); the model viewer remains static.
Grid/slider/particles have source review only; no new browser/save checks run.
The flame mesh base is reduced in size with smoother geometry and translucent
additive materials (outer 0.28/core 0.5, depthWrite false) to blend with particles.
This appearance tweak has source review only; torch illumination is unchanged.

The Models header button and View models setup button open an independent native
modal with all 31 current game model types. Use the same factories as the board
and dice; cache viewer instances, clone materials and keep its reflection map
within its own renderer. Previewing types never reveals quest placements or
changes state/RNG/saves. No idle animation loop; closing/hidden pauses rendering.
The shared prop/die factory extraction preserves current board geometry and die
face mapping. This addition has source/diff review only; no new browser checks.

The later movement-die revision fills combat-sculpt symbols with a convex hull
to match its rounded silhouette. Red/white styling and face/result mapping stay
unchanged. Cache geometry/materials and pip placements; do not raycast or generate
hulls per frame. Source review/offline authoring only; no new browser checks.

Board/stair artwork: see docs/ASSET-AUDIT.md. Mark's supplied board image is
cropped to a 26x19 atlas; its author/official-scan status is unverified. The stairs
use original printed artwork from system-tiles PDF p1, with scanner/copyright
notice in assets/textures/tiles/README.md. Keep art provenance separate from
original NA rule authority and the user-reported STL licence. Cache packed data-
URI textures; completion events redraw board/viewer, no continuous loop or fetch.
Preserve discovered-cell filtering and UV offsets; do not add sight-based floor/grid dimming. Image/crop
preparation and source review only; no new browser/scene/direct-file checks run.
Bookcase frame/shelves and gargoyle wings are available but unassembled. The separately supplied weapons-rack sculpt is integrated; no additional models
are currently needed for The Trial, and stairs need no new STL.

Missing-texture fix: allocate component canvases at final asset width/height
before their first GPU upload, draw decoded images into that same canvas and
mark needsUpdate. Do not swap a 1x1 texture image for a larger image: the bundled
renderer uses immutable GPU storage. Source diagnosis only; Chrome browser
connection was unavailable and no browser pass was completed.

The xbeaker rack's near-duplicate vertices need .04mm welding/face cleanup before
quadric simplification; the prepared mesh is 26,559 triangles, 18,992 vertices.
Keep source and derivative hashes/notices, preserve its sword height and source
silhouette, fit uniformly to the existing 1x3 footprint, and face its front into
the room. The viewer starts at its front. Offline source/authoring review only;
detailed painting remains pending and no new browser check ran.

Revealed blocked/rubble cells omit tall boundary sections, including walls crossing behind their tiles. Adjacent known cells do not emit a boundary against known rubble. Unknown cells remain discovery-filtered. The topology still blocks movement and sight through rubble; no rendering wall is needed for those rules. Wall colour/rubble changes and portrait UI received focused source review only; no new browser/gameplay checks. Portraits clone/dispose their own materials, share cached model geometry, use one lazy renderer and retain cached images without an idle render loop. Future painting automatically appears in portraits after reload.

Combat presentation: hero Attack turns/lunges the whole miniature before opening the cancellable dice prompt; cancelling still consumes no action/RNG. CPU movement completes, then the monster turns/lunges before its roll modal. The 540ms lunge turns via shortest yaw, shoves 0.18 squares and returns to the exact anchor, retaining facing. Keep a pending report’s defeated combatant visible through dice/results only; ACK_REPORT is resolved/saved first, then a 700ms backward tip/sink/fade removes its visual. Renderer-only held figures never enter rule projection, occupancy, targeting or sight. Temporary fade materials are cloned/disposed, never modify shared painted surfaces. Lock gameplay through effects, keep camera available, finish immediately on reduced motion/hidden/context loss, and request frames only while active. Resume the already acknowledged CPU queue after removal; animation never decides damage, RNG or turn progression. Refresh restores the pending result/held figure or settled removal from authoritative state without replaying the lunge. Source review only; no new animation/browser/save checks were run.

Restart: the topbar Restart button confirms then immediately creates a fresh The Trial session with the same selected heroes, owner names and realistic-LOS setting, a new seed and cleared facing/dice state. It returns to the briefing, replaces the browser save and keeps existing lighting/grid/wall preferences. Cancel leaves the adventure untouched. Disable during presentation effects. Menu → New adventure retains the separate party-setup flow. Shared `startAdventure(config)` initializes either path. Source review only; no restart/browser/save checks run.

Automatic cutaway protects only the current turn hero’s room. During a pending monster combat report, protect the defending hero’s room instead. In corridors, protect the actual moving hero point only, not the entire corridor. `updateBoard` passes a renderer-only `cutawayHero`; restore preserves it without new save fields. Test camera rays from frustum-visible floor centres and visible miniature points in that protected room against full wall bounds. Facing the camera alone never triggers a cut. Runs group collinear boundaries only while known regions on both sides match, so room cuts cannot propagate into extensions beside unexplored darkness; doors/gaps also end runs. Only discovered terrain and displayed actors supply targets; actual hidden positions never enter the check. Full/low modes and saves remain unchanged. A minimal current-quest geometry diagnostic confirmed a void-backed corridor wall remains full (1.864) while obstructing room walls lower (0.27). No Chrome/layout or broad regression checks run.

Wall joins now use `assets/models/walls/wall-join.js`, a capped 0.11-wide central strip of wall-one with its original stone surface/height, instead of flat 0.16-wide box posts. `scripts/prepare_wall_join.py` prepares it offline in the wall-authoring Python environment and records parent/source hashes/notices. Cache the 952-triangle geometry; clone/dispose per-join clipping materials and follow the tallest connected wall's cut height with world clipping, never vertical squashing. Keep joins noninteractive. Source/offline mesh review only; no new browser check.

The final focused cutaway diagnostic confirmed active-room walls lower (three sections at 0.27), while another explored room (two sections) and void-backed corridor wall remain full (1.864). This is geometry-only evidence, not browser/layout verification.

# Tall walls and route preview

## Light blocking independent of cutaway — 22 October 2026

`view/light-barriers.js` gives all eight torch/hearth lights and the permanent
spell glow a cached 2D visibility mask against discovered wall boundaries,
closed doors and blocked squares. Lowering a visible wall never opens this
lighting boundary. Light can travel directly through an open doorway; it does
not bend around corners. Ambient background light remains unchanged.

The 208×152 mask per light is a presentation approximation, independent of rules
and physical shadow maps. Layout/door changes invalidate the cache; moving a
projectile updates its own mask. No extra six-face shadow maps are added. Board
materials are cloned locally with their floor/stone hooks intact. They retain
the wall layer's live clipping-plane references; copying those planes had frozen
cutaway heights during implementation and was corrected.

A minimal Chrome shader/geometry diagnostic confirmed light masks of 255/0 on
opposite sides of a closed door and 255/255 after opening it. The rendered wall
materials' live planes lowered, raised and lowered again with the wall mode;
no JS/shader errors were reported. This was a reported-problem diagnostic, not
a full lighting appearance, performance, gameplay/save or UI regression pass.

## Wall modes

The button above the board, alongside Tabletop/Overhead, cycles **Full walls →
Automatic cutaway → Low walls → Full walls**. Automatic cutaway is the default.
The old menu-only wall checkbox is removed. A text label, accessible name and
simple wall-height icon identify the current mode.

Only the original tall stone pack is used. The lightweight comparison pack,
its assets/viewer entries and its style button have been removed.

Full walls retain the supplied sculpt's irregular top. Low walls clip it at
0.27 spaces above the floor. Automatic cutaway checks camera-directed rays from
floor centres and visible miniature points in the current hero’s room, within
the camera frustum. Other explored rooms do not request cutaway. During a pending
monster attack, protect the defending hero’s room instead. In corridors, protect
only the hero’s actual model point, including while moving; do not open every
explored corridor.
A wall stays raised unless its full-height bounds actually obstruct one of those
rays. Camera-facing orientation alone no longer lowers walls against darkness.
Group adjoining sections only while their known regions on both sides match;
room boundaries, doors, gaps and transitions to unexplored surroundings break
runs. This prevents a needed cut in one room propagating along a wall extension
that only borders darkness. Affected sections within a run still lower together.
Overhead leaves walls full height. Camera rotation, panning, hero following and
mode changes recalculate the presentation. Heights ease to their targets; reduced
motion applies the target immediately. This is a local presentation choice,
independent of gameplay line of sight, occupancy and exploration.

World-space clipping planes cut the sculpt without squashing its bricks. A
matching stone cap closes lowered tops. Visible walls cast/receive light and
clipped shadows; changing cut heights invalidates the cached shadow maps.
Animation requests frames only until settled, then returns to the existing
on-demand/flicker cadence. Shared full/one-space geometry is decoded once; each
wall has its own clipping material/plane, not copied geometry. No physics, runtime
STL parsing, external service, new framework or build step is introduced.

## Fitting to the board

`src/view/walls.js` derives boundary edges from discovered cells and the existing
region topology. Each edge is emitted once. Known door edges leave a complete
one-square gap for the existing door models, open or closed. Collinear contiguous
edges mix two-space sections with the cropped one-space derivative; only adjacent
edges can pair, and odd ends always use one space.
Sections meet at integer grid corners. Narrow stone fillers close the sculpt's
recessed end profiles at straight joins, corners and T intersections. Each known
join has one owner, including intersections at the middle of a two-space section;
unconnected ends and door gaps get no filler. Fillers now use a 0.11-square-wide
cropped stone strip from the same supplied sculpt, replacing the flat 0.16-wide
box posts. Their individual world clipping planes follow the tallest connected
visible section without vertically squashing the stonework; they remain
noninteractive scenery with the walls.
The source's wide printing plinth is removed and body depth reduced to 0.16
spaces. Two opposing walls leave approximately 0.84 spaces for the heroes’
0.82-space bases. Length and height keep the source proportions.

Only discovered boundary portions are built; no wall button/camera mode reveals
undiscovered floors, rooms, corridors or quest doors. Closed/secret passage rules
and quest data stay in the engine. The existing supplied door sculpt is retained;
it has not been reshaped to the new wall height. Actual visual fit of joins,
door frames, room props and wall-mounted torch brackets still needs a Chrome review.

Walls and their join fillers are noninteractive scenery. Pointer raycasts and
keyboard piece cycling exclude them; selection/hover guards reject wall refs.
They have no outlines or context panels and do not intercept clicks meant for
tiles or other models behind them. Doors, furniture, torches and miniatures keep
their normal interactions. Full/cutaway/low, discovery and shadows are unchanged;
the model viewer still offers wall previews. Source review only for this change.

## Source and paint

See [asset attribution and changes](../assets/models/walls/README.md). Mark
provided ldid69's Thingiverse 6005201 model and its attribution/non-commercial/
share-alike notice. Original files remain locally preserved; prepared derivatives
retain the notice/credit and are linked from the game footer. Stone/mortar colours
are authored vertex colours with scene lighting, rather than a downloaded texture.
The offline authoring view `tmp/wall-authoring.png` was inspected while preparing
the two sizes; it is not browser verification.

## Wall variation

Each section uses a stable hash of quest ID and wall coordinates. About one in
four potential pairs stays as individual one-space sections, breaking up the
regular two-square repeat. The sculpt independently turns 180 degrees and/or
mirrors lengthwise to expose four orientations of each source mesh. Its material
also receives a restrained warm/neutral brightness variation. Raised stone islands
use closely related darker warm greys, with only a one-percent linear-light shade
range and slight warmth variation. This replaces the earlier contrasting sand,
olive, brown and pale families. Raised faces replace baked per-vertex colour
noise with a uniform base; sculpt normals still provide lighting and shape.
Section brightness varies by only one percent;
joins and lowered caps follow the darker palette. Stable seeds include section
coordinates; recessed mortar remains neutral.

Only the inner sculpt is transformed; the wall's placement frame, join fillers
and cutaway cap retain exact grid dimensions. Length, height and depth are
unchanged, preserving door openings, corridor clearance and torch mounts.
Geometry remains shared/cached; stone-island attributes are prepared once per decoded asset. A vertex shader applies the seeded palette; there is no per-frame geometry or colour generation. Variations never consume gameplay RNG or depend on the
camera. Discovery, cutaway and shadows remain; walls are excluded from picking/glow.

## Saved preference

`view.wallMode` stores `full`, `cutaway` or `low`; clicking the button saves it
immediately. Missing/invalid values use the default cutaway mode. Old snapshots
with `wallsEnabled: false` migrate to low walls; the old checkbox is superseded.
The envelope remains version 1/state schema 2. Wall meshes, cut heights, planes,
timers and camera-dependent animation state are never saved.

Older snapshots may include `view.wallStyle` from the retired comparison. It is
ignored and omitted from future snapshots; the original walls always render.
Variation is regenerated from quest/coordinates and is not saved separately.
Torches use their original full-size fixtures and wall-face mounts.

## Hover and selected destination routes

Hovering a tile shows a thin ribbon along the known shortest movement route from
the active hero, with a destination dot. The ribbon stays light blue up to the
furthest legal stopping square within current movement, then yellow for the rest.
The destination outline/dot stays yellow when the full route is out of range.
Blocked/occupied/unconnected or undiscovered destinations
have no invented route. Clicking retains the route for touch/context-panel use;
hovering another tile temporarily replaces it. Leaving the tile/board restores
the clicked route, if any. Keyboard square hover uses the same preview. A
reachable model's Move here endpoint also gets a line.

The controller uses `topology.routes(state, hero, {budget})` with a board-sized
preview budget, cached once per rendered game state so moving across tiles does
not repeat the path search. Its default budget remains the current turn's rolled movement,
so command legality is unchanged. Both queries use the same known terrain,
remembered monsters, furniture, occupancy, doors and weighted shared-stair costs.
The ribbon is transient presentation; it is cleared on dismissal, new selection
or command/animation. It neither rolls dice nor spends movement nor enters saves.
Movement can still stop early at a new discovery or a newly encountered obstacle,
as before. The line does not disclose unknown current monster positions.

`topology.routePlan` shares this split between the ribbon and tile action. It
counts weighted stair costs and backs up from an occupied friendly square to a
legal endpoint. A farther tile offers **Move partway here** when a positive-cost
prefix is available; it dispatches ordinary MOVE to that endpoint, with the same
engine validation, route ordering, animation, reveal pauses and autosave. The
action remains disabled before rolling, with no movement left, after movement
closes, without a known route, or during a pending decision. Free stair
repositioning does not enable a pointless partial move
towards an otherwise unaffordable destination. No new command or save fields.
This split-route revision received focused source/diff review only; engine and
Chrome verification have not been run for it.

## Verification status

Source/diff and offline asset-authoring review only. No tests, browser automation,
screenshots, layout or performance checks have been run for this revision.
A useful approved check would cover all three modes, camera rotations/overhead,
door gaps/corners, clipping-aware picking/glows/shadows, preference refresh, and
blue/yellow routes around obstacles/shared stairs. This is not covered by the
earlier dice/exploration check approvals.

The later join-filler/hover-route fix has focused source/diff review only. Mark
reported the join gaps while manually viewing the build; no duplicate browser
check or new tests were run. A minimal mesh-data diagnostic confirmed that the
two-space sculpt's end profile recedes inside its bounding endpoints, particularly
near the uneven top. Prepared source geometry and save format remain unchanged.

A later screenshot question identified the larger opening beside the rack-room
door as the genuine corridor junction north of that room. A minimal topology
diagnostic confirmed the corridor-to-corridor edge is open, while adjacent
room boundaries stay closed; no wall was added across that passage. This was a
reported-problem diagnostic, not a general map or browser verification pass.

The later original-wall-only/variation update has source/diff review only; no
browser, visual, save or performance pass has been run.

A second reported screenshot gap on 2026-10-21 was traced to the south corridor
junction: north edges at (12,18) and (13,18) join the two-wide corridor above;
(9,18) through (11,18), and (14,18), have closed room boundaries. A minimal map
check confirmed sight along (7,18) → (13,18), blocked sight around the bend to
(12,16), and visible straight sight from the junction (12,18) → (12,13). No wall
was added across this genuine passage and no engine sight rule changed. This
was a reported-problem diagnostic, not browser or broad regression verification.

## Rubble boundaries

Known blocked squares omit redundant boundary walls behind or surrounding that
tile. Skip their owned edges and edges emitted by a known neighbour against known
rubble. Discovery filtering still applies. `topology.connected` rejects rubble
entry; sight can reach rubble itself but cannot pass through it. Pass Through
Rock retains its existing exception; this presentation work changes no rules.

Blocked stone now has its own solid, wall-height assembly in
`view/blocked-scenery.js`: four original wall sculpts/joins, the supplied painted
rubble at the foot, and a stone-coloured rubble top. Existing geometry is reused;
original assets and their separate provenance notices remain intact. The board
wall layer owns per-instance clipping planes, varied stone colours and a closing
cap. Full walls shows the 1.864-square height, Low walls clips at 0.27, and
Automatic cutaway lowers only an obstructing block using the same protected-area
camera rays. Each block is independent from adjoining wall-run groups. Blocked
stone is noninteractive like walls; its underlying square remains available to
the ordinary board picker where rules permit it. Models shows full height.

Focused Chrome authoring renders inspected the full/low silhouette and automatic
cutaway with a hero behind the block, then overhead with no obstruction: clipping
was respectively 1.864 / 0.27 / 0.27 / 1.864, without reported JS/shader errors.
This used the production factories in an isolated scene, not a gameplay, picking,
save, shadow or performance regression pass.

An isolated low section in Mark’s screenshot exposed the per-model cutaway decisions. Run grouping now shares known-side selection and miniature-occlusion cuts across adjacent collinear sections. A minimal Node/Three geometry diagnostic on the current quest layout confirmed all eight adjoining sections stayed full without an occlusion and all lowered to 0.27 when a focus ray crossed one section. This was not a browser screenshot/layout check; no broad regression checks were run.

The later cutaway correction supersedes the earlier nearest-side/group-only rule: a minimal current-quest geometry diagnostic confirmed the void-backed corridor wall remains at full height (1.864), three obstructing room sections lower to 0.27, and the new stone join measures 0.11 × 1.85 × 0.145 with 952 triangles. The join asset was prepared offline from wall-one; see `scripts/prepare_wall_join.py` and the source notices. No new Chrome/visual or broad regression check was run.

The final room-scoped diagnostic confirmed the active room’s three obstructing sections lower to 0.27, while the neighbouring explored room’s two sections and the void-backed corridor section stay full at 1.864. Changing turn/attack context selects the protected hero through presentation options, without new save fields. Native Chrome/layout checks remain unrun.

The first-person combat camera keeps the selected wall mode throughout approach,
held view and return. Automatic cutaway unprojects each frustum-visible protected
terrain/figure point to its pixel on the near plane. The resulting finite sight
segment follows orthographic, blended and perspective lenses consistently; only
an intersection before the near plane requests a cut. Walls beyond/behind the
camera rise through the existing height easing. Protected-room scope and
discovery filtering remain intact. No full-height override or saved preference
change. The minimal five-pose numeric projection diagnostic verifies the camera
handoff, not Chrome wall appearance or gameplay.

Known wall sections share a dark rough-stone footing, 0.28 squares wide and 0.02
high, centred 0.005 above the floor. This masks the scan's pale printed wall
boundaries exposed beside the narrower sculpt. Footings follow actual section
lengths and door gaps, receive light/shadows and remain noninteractive scenery;
they do not change movement/sight topology, wall heights or discovery. No new
Chrome visual check was run for this appearance fix.

Torch/hearth spread follow-up: torch range increased from 4.8 to 6 squares and
base intensity 8 to 10; hearth range 5.2 to 6.5 and intensity 10 to 12. The one
point-shadow camera extends to 6.8. Global ambient is unchanged and every light
retains the room-boundary mask. Source review only; no new lighting/profile pass.


## Internal backing — updated 24 October 2026

Wall torch layouts reserve every normal and secret-door edge, including secret
panels that have not been discovered. Layouts are cached per dungeon layout, so
finding/opening a secret door cannot leave a fixture on it or move the torches.

Mark requested removal of the black mortar backing panels from ordinary walls
and sculpted joins. Those sections now contain only the sculpt, cutaway caps and
footings. Blocked-square scenery retains its internal .82-square solid plug,
recessed .12 below the crest and clipped with the sculpt. Full-height room-light
barriers remain independent of visual geometry. Source/diff review only; no new
browser, shadow, cutaway or performance check ran.

## Flame-source shadow flicker — 23 October 2026

The existing nearest/focus torch shadow caster jitters within its flame using
independent smoothly interpolated hashed noise per axis, offset by fixture phase.
Local sideways travel is bounded to .0165 squares, vertical to .019 and depth
to .003: half the previous movement envelope, without slowing the sampling or
flicker cadence. Fixture rotation makes sideways motion follow the wall, with
only a tiny movement towards/away from it. Brightness flicker retains its
existing combined maximum amplitude .145. Cosmetic time hashing never consumes
gameplay RNG or allocates a new random generator.

Its position is sampled/held at no more than 12 Hz; changed samples request a
shadow-map refresh. Geometry/light-slot changes and reduced-motion reset refresh
immediately. Other torch lights retain static positions. No new lights, shadow
casters, timers, geometry or gameplay RNG are added.

Each torch pool light exposes a stable world-space hqBarrierOrigin at its fixture.
Room-mask keys/bakes use that anchor, while hqLightOrigins uniforms retain the
actual displaced light position for shader matching. This prevents flame jitter
from rebaking room masks, preserving wall/door blocking. Spell/projectile lights
omit the anchor and retain their existing moving-mask behaviour. Light position
holds between samples so displayed light agrees with the cached shadow map.

Reduced motion returns to a steady source; disabled/offscreen/hidden rendering
keeps the existing bounded scheduler. Source/diff review only; no browser or
performance check was run. Actual GPU cost/smoothness remain for manual assessment.

## Bright seams inside torch shadows — 23 October 2026

Mark supplied a repeatable correlation: bright narrow brick edges appeared with
cast shadows and changed at nearby camera positions. An isolated Chrome scene
using the actual sandbox board/wall/torch factories reproduced the seam streaks.
This diagnostic does not load/save an adventure or use the session controller.

Removing wall specular reflection did not eliminate the streaks. The useful
combination was a smaller torch receiver normal offset (.005 rather than .035),
zero point-light depth bias (previously -.00015), and explicit FrontSide shadow
casting for masonry. The previous offset/depth/back-face combination exposed thin
relief rims inside the shadow. Normal-bias reduction alone and back/double-sided
shadow casting retained the problem in the reproduced close view.

walls.js applies shadowSide to its own cloned stone/join/blocked materials and
shared local cap/footing materials; dark mortar stays visually double-sided but
casts from its exterior/front faces. Other model materials remain unchanged.
Only the torch pool's bias settings change; keep one 512px caster, PCF radius 4,
12Hz flame jitter, original room-light masks and visual cutaway planes.

Review: isolated Chrome/SwiftShader variants distinguished shine, bias and shadow
face effects, then the actual changed files were inspected in two close camera
angles. Major bright seam streaks disappeared; soft figure shadows remained.
No page errors were reported. This is a focused reproduction of the reported
wall problem, not a full game/lighting/performance regression or a check of
Mark's current browser/GPU. Existing browser saves were untouched. Diagnostic
scripts/images remain local under ignored tmp/wall-shadow-*.

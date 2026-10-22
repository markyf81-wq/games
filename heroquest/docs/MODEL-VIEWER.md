# Model viewer

**Models** in the main header opens the native model-viewer modal. **View models**
in setup opens it above setup without submitting or replacing the adventure.
Choose a model from the grouped Model list; all 32 current game model types are
available: four heroes, eight monsters, fourteen furniture/door/generated props,
four scenery types (two walls, blocked stone and torch), and two dice.
Unused raw components/variants from the 40-STL collection are not represented as
finished game models. The original stone walls have one/two-space previews; the rejected lightweight pack is removed.

Drag to orbit the model; scroll/pinch or use the plus/minus buttons to zoom.
With the canvas focused, arrows orbit, plus/minus zoom, and Home resets. Reset
view restores the initial angle/zoom. Close or Escape returns to the previous
screen. The list/stage keep their size while changing models, and native modal
focus/stacking preserves a setup or menu already open beneath it.

`src/data/pieces.js` owns the shared public model-type catalog;
`src/ui/model-viewer.js` owns a separate lazy
Three.js renderer with studio lights, a small plinth and local reflection map.
Each selected model is centred/grounded and uniformly fitted; the camera fits its
bounds at any stage aspect ratio. Viewer materials are cloned so wall clipping
and reflection textures in the board's WebGL context cannot be changed or reused
accidentally. Shared STL geometry remains cached in the original loader. Each
viewer model is prepared at most once and cached for switching/reopening.

The stairway uses shared `models.makeProp`; the bookcase and weapons rack now use
supplied STLs through the regular model factory (`makeProp("bookcase")` remains
an alias). The bookshelf is assembled/painted, with shared cached finish textures
and independent viewer materials. The stairway
now shows original tile-sheet artwork on a thin tile, sharing the decoded texture
with the board and redrawing when it loads. `src/view/dice-models.js` shares the same
red movement die body/white pips and face mapping between the dice tray and
viewer. The body is a blank hull of the combat sculpt with matching rounded
corners (see DICE.md). The tray presents the same engine outcomes. The
torch uses its existing fixture factory, including the direct wall backplate;
individual model previews do not run flicker or game-light timers. The Test room mode below has its own bounded decorative fire updates. Walls are shown at full
height. The tomb retains its existing assembly and gargoyle its current body.

Individual model previews render only when the open, visible viewer changes;
there is no automatic rotation. Test room fire uses the bounded timer below. Closing/backgrounding cancels scheduled rendering.
Context loss shows a short status and restoration redraws the selected model.
All assets/scripts stay local and deferred; no new runtime fetch, package,
framework, build, physics, remote model loading or raw STL parsing is introduced.

The viewer consumes no engine state, quest coordinates, discoveries or RNG, and
does not add anything to browser saves. It intentionally previews model types
regardless of which pieces have been encountered in the current quest. It never
reveals their hidden placements, quest names/notes or actor state. Its main-header
button is disabled during board movement so it cannot interrupt presentation.

## Verification

Source/diff review only. No new browser, layout, interaction or dice checks have
been run. Mark is manually viewing the game, so no duplicate browser pass was
started. A later agreed pass could inspect switching all types, stacked setup,
drag/pinch/keyboard controls, close/reopen, and material isolation from board/dice.

On 2026-10-22 the bookshelf model was selected from setup's viewer and visually
inspected from front, side, rear and elevated angles while authoring its paint.
The final viewer rendered its wood/spine textures and separate materials. This
focused authoring inspection does not validate all viewer types or interactions.

The throne/fireplace now load painted derivatives with the shared cloth/stone
finishes. The viewer and portraits remain static; fireplace fire/light attaches
only on the discovered dungeon board. This batch has offline authoring/source
review only, with no new Chrome model-viewer check.

## Test room

The Test room button in the header or setup opens a labelled display of all 32
current game model types together. It reuses the existing viewer renderer/modal,
geometry factories and local reflection recipe. It is an invented showroom, not
a quest, and reads no adventure state, locations, discoveries or RNG. Closing it
returns to the previous screen; nothing changes or is written to the browser save.

`src/view/test-room.js` prepares/caches the room once: board-scale heroes,
monsters and footprint-fitted furniture, plus scenery and small dice samples.
Floor tiles use a uniform neutral matte stone material, with seams and real lighting/shadows, so the floor does not compete with painted models. Full
backdrop walls leave the front/sides open and hide when orbiting behind them,
so they cannot obscure the exhibits. Labels identify each
piece. Click a piece or use the Piece selector, then Focus piece to frame it
within the room, or Inspect model for its separate rotating preview. Test room
in the viewer controls returns to the full display; Reset view fits the room.
Existing orbit, wheel/pinch/keyboard zoom and Home work in both modes.

Fully lit is the default. Dynamic lighting switches this room independently to
its own torches and fireplace fire, using the same recipes as the dungeon. Its
fire system has a private scheduler/records and one nearest-focus shadow caster;
viewer materials/reflection maps cannot affect the board. A 34ms bounded timer
requests frames only for an open, visible room with active fire and ordinary
motion preferences. Closing, switching to a single model, hiding or context loss
cancels it. Reduced motion uses steady flames/light without particles or a timer.
Individual previews remain static. The room's light preference is memory-only.

The header button is disabled during board presentation effects. Native-dialog
stacking preserves setup/other pending decisions beneath the viewer. The retired
standalone studio and credits pages remain removed.

Source/diff review only for this addition. No new Chrome, layout, lighting,
picking, gameplay/save, performance, build, lint or automated checks were run.

Doors and blocked stone now use painted derivatives. The supplied cupboard joins
the catalog and Test room (rear-right exhibit); it has walnut panels/frame, iron
fittings and an ivory skull. These additions have offline authoring/source review
only; no new browser check. See assets/models/furniture/SCENERY.md.

# Model viewer

**Models** in the main header opens the native model-viewer modal. **View models**
in setup opens it above setup without submitting or replacing the adventure.
Choose a model from the grouped Model list; all 31 current game model types are
available: four heroes, eight monsters, thirteen furniture/door/generated props,
four scenery types (two walls, blocked stone and torch), and two dice.
Unused raw components/variants from the 40-STL collection are not represented as
finished game models. The original stone walls have one/two-space previews; the rejected lightweight pack is removed.

Drag to orbit the model; scroll/pinch or use the plus/minus buttons to zoom.
With the canvas focused, arrows orbit, plus/minus zoom, and Home resets. Reset
view restores the initial angle/zoom. Close or Escape returns to the previous
screen. The list/stage keep their size while changing models, and native modal
focus/stacking preserves a setup or menu already open beneath it.

`src/ui/model-viewer.js` owns a fixed model-type catalog and a separate lazy
Three.js renderer with studio lights, a small plinth and local reflection map.
Each selected model is centred/grounded and uniformly fitted; the camera fits its
bounds at any stage aspect ratio. Viewer materials are cloned so wall clipping
and reflection textures in the board's WebGL context cannot be changed or reused
accidentally. Shared STL geometry remains cached in the original loader. Each
viewer model is prepared at most once and cached for switching/reopening.

Stairway and bookcase use shared `models.makeProp`; the weapons rack now uses
the supplied STL through the regular model factory. The stairway
now shows original tile-sheet artwork on a thin tile, sharing the decoded texture
with the board and redrawing when it loads. `src/view/dice-models.js` shares the same
red movement die body/white pips and face mapping between the dice tray and
viewer. The body is a blank hull of the combat sculpt with matching rounded
corners (see DICE.md). The tray presents the same engine outcomes. The
torch uses its existing fixture factory, including the direct wall backplate;
the viewer doesn't run flicker or game-light timers. Walls are shown at full
height. The tomb retains its existing assembly and gargoyle its current body.

Only open, visible viewer changes schedule a frame; there is no idle animation
loop or automatic rotation. Closing/backgrounding cancels scheduled rendering.
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

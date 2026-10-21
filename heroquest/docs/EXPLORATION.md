# The Trial exploration milestone

This document records the original exploration milestone. The current entry also implements basic melee combat and CPU monster turns; [COMBAT.md](COMBAT.md) supersedes its old scope/state/phase descriptions below. Setup now selects 1–4 actual hero miniatures, rather than always placing four heroes. Browser autosave now exists as documented in SAVES.md, superseding the historical no-save scope below. The earlier verification remains historical exploration evidence and does not cover those setup/save revisions.

## Implemented scope

Setup assigns players to all four heroes; duplicate owner names allow fewer than four humans. Suggested original order is Barbarian, Dwarf, Elf, Wizard. A briefing leads into recorded 2d6 movement, orthogonal legal routes, free adjacent door opening, stepwise discovery and gated pass-and-play handoff. The round then starts again with an explicit notice that monster turns are unavailable.

The original Trial map is present, but it cannot be completed yet: combat, searches, spell selection/casting, monster turns, quest-note effects, rewards and exit/completion rules remain future work. No traps or secret doors occur in this quest. No stats/effects have been invented to make incomplete actions appear playable. No saves/audio are implemented.

## Reviewed source ledger

All sources are the original North American scans, stored in the ignored reference archive. PDF page numbers below are one-based. Runtime locators are also attached in `src/data/trial.js`.

| Content | Source / locator | State and scope |
| --- | --- | --- |
| Reusable 26 × 19 grid, 22 rooms | `system-quest-book`, PDF p5, upper blank board, upright | Traced and visually reviewed; reusable data in board.js |
| Trial layout, doors, blocked tiles, monsters, furniture | Same, PDF p4, lower map rotated 180°; upper symbol legend also rotated 180° | Transcribed and visually reviewed; exploration placements implemented |
| Trial briefing and notes A–E | Same, PDF p5, lower Quest 1 text | Briefing displayed; notes preserved as future data, not executed |
| Initial room/stairs/closed-door placement | `system-instruction-booklet`, PDF p8 rotated 180°, printed p8, setup step 9 | Implemented; exact four hero stair squares are a digital placement choice |
| 2 red dice, orthogonal movement, passing friends, stopping/sharing | Same, PDF p12 rotated 180°, printed pp12–13, Hero Movement | Implemented for ordinary floor/stairs; pits/traps/action ordering await later rules |
| Door timing and full room reveal | Same, PDF p12 rotated 180°, printed p13, Looking And Opening Doors / How Zargon Reacts | Adjacent free door opening, never close, full room contents reveal implemented |
| Suggested hero order | Same, PDF p12 rotated 180°, printed p12, Order Of Play | Used with handoff UI; CPU phase not implemented |
| Centre-to-centre SEE blockers | Same, PDF p10 rotated 180°, printed p15, SEE | Reviewed as basis for presentation sight; not a complete attack/spell targeting audit |

The map has 11 used rooms, 12 doors, 24 monsters (6 orcs, 5 goblins, 4 skeletons, 2 zombies, 2 mummies, 1 Fimir, 3 Chaos Warriors and Verag), 16 scenery placements including stairs, and five blocked corridor cells. The remaining original board rooms are not walkable in this quest. Furniture footprints and rotations are independent of decorative mesh bounds. Symbol review identified the sorcerer’s table in the western room, fireplace on the central room’s northern edge, and three bookcases.

Coordinates use zero-based x east / row south in data, with the upright blank map’s top-left as origin. Door axis `h` lies along a cell’s top/bottom edge and `v` along its side; the coordinate denotes the edge, not an occupied cell. Player destination labels add one to both coordinates. Hero positions occupy four distinct stair squares; the book specifies the starting area rather than those exact assignments.

## State and command boundary

`HQ.exploration.createSession(options, seed)` returns schema 1 / content `the-trial-exploration-v1`. State contains hero owners/positions, monster instances, open doors, discovery memory, remembered monster positions, active hero/round, movement dice/budget, seeded RNG, a pending handoff, the sight setting and a capped 60-entry journal. It is serializable, but not saved to browser storage.

`applyCommand(state, command)` rejects invalid commands without mutation or clones state and resolves an accepted command. Only six commands exist: ROLL_MOVEMENT, MOVE, OPEN_DOOR, END_TURN, ACK_HANDOFF and SET_REALISTIC_LOS. RNG uses a stored xorshift state and rejection sampling for dice; the controller seeds a new session from browser crypto. The projection supplies discovered terrain/scenery, filtered movable pieces, reachable destinations and adjacent doors.

Movement previews use known terrain and remembered monster positions. They do not use hidden actual monster positions to hint at a future obstruction. Resolution walks the chosen route square by square, checks actual occupancy and updates discovery at each step. New discovery pauses a route at a legal stopping square without discarding remaining movement. Friends may be passed but ordinary endpoints must be free; stairs permit sharing. No action system exists yet, so movement/action ordering is not claimed complete.

## Discovery and digital interpretations

- Opening a room reveals all its terrain and contents, including furniture/monsters away from the narrow ray through the doorway. Corridor visibility follows open grid sight. Blocked rock can be seen but never traversed or seen through.
- Explored terrain and static scenery remain. Terrain dims outside current terrain sight. The outer rectangle and unused board are never rendered; **Explored map** fits discovered cells only.
- Terrain sight ignores figures so a companion does not erase the room floor. Movable-piece sight uses walls, closed doors and intervening figures, from every hero’s centre. Furniture blocks movement but is not added as a SEE blocker here.
- Exact corner crossings permit either open orthogonal route but block a corner sealed by two walls. This is an explicit digital grid interpretation to avoid diagonal room leaks. Future attack/spell targeting must revisit corner/edge rulings against the full relevant rules.
- **Use realistic line of sight** defaults off. Off retains discovered movable pieces as on the physical board; on shows only pieces currently seen by at least one hero. Discovery/state are retained in both modes. This combined-party rendering option is Mark’s requested adaptation, not a printed rule.
- A reveal pause, exact starting hero squares and hidden terrain presentation are digital interface choices. They do not add traps, encounters or quest-note hints.

Client-side quest data is inherently inspectable in developer tools. Ordinary UI, picking, camera framing, route previews and the journal should not disclose hidden content.

## Common UI conventions

`ui.css` provides shared green/cream/gold tokens, button variants, panels, fields, checkbox rows, callouts and native dialogs. Setup, briefing, handoff, menu, help, piece inspection and restart confirmation use those components. Keep future inventory/cards/combat dialogs consistent with them.

Native modal dialogs make the underlying scene inert and contain keyboard focus. Setup, briefing and handoff require their explicit continuation action. Restart confirmation leads back to setup; state is replaced when that form is submitted. Menu sight changes go through the engine; grid/walls/camera controls remain presentation-only. Party buttons centre heroes without changing the active turn. The DOM destination selector provides a non-canvas movement path.

## Graphics limits

Hero movement now has a 180 ms eased hop per traversed square, with a small 0.12-square lift of the whole miniature. The engine resolves the command once and returns transient route metadata separately from state; it includes only steps actually taken before a discovery interruption. The controller holds the previous projection during playback, then shows the resolved position, budget and discoveries on arrival. Movement, doors, end-turn and menu input are locked during playback, while camera controls remain usable. The active ring and following camera track the piece. Reduced-motion preferences skip playback; hiding the page or losing the graphics context finishes presentation immediately. No rules or dice resolve in animation callbacks.

This animation update received focused source review only; the earlier approved checks below predate it. No new tests or browser animation checks have been run.

The runtime loads prepared STL derivatives for the four heroes, eight monster types, doors, blocked tiles and most furniture. Only the barbarian has detailed authored paint; other pieces use matte colours. The tomb is assembled from its source halves. Gargoyle wings remain unassembled, and bookcases, weapons rack and stairs use simplified generated geometry. These approximations do not change quest occupancy. Source orientation was reviewed independently for each hero/monster; appearance of every late-quest object has not received a browser review.

The earlier visual study lives in `studio.html` with its separate full-board/fixed-mask controls. It must not be used as evidence of actual discovery behavior.

## Approved verification — 2026-10-21

Mark explicitly approved focused engine checks followed by one localhost Chrome pass covering setup, movement, doors, discovery and the sight setting.

Twelve focused engine scenarios passed: initial discovery; map/door/entity consistency; deterministic dice and immutability; closed-edge blocking; passing/sharing; route cost; free door reveal; stepwise corridor interruption; full-room contents; sight filtering with persistent memory; handoff/reset gating; and known-monster/furniture route blocking without hidden-position leaks. The temporary diagnostic is ignored under `tmp/`, not a routine tracked test suite.

Chrome at the normal desktop viewport verified setup/player assignment, original briefing, initial hidden terrain, 2d6 display and roll locking, accessible movement, free opening of the first two doors, corridor reveal pause/budget retention, full next-room discovery, all four handoffs/round wrap, and realistic sight hiding both room monsters after stepping away while retaining scenery. A canvas click also moved the hero to a reachable cell. No runtime errors were captured. A deprecated PCFSoft shadow setting was replaced with PCFShadow, and faint reachable markers were made clearer; the changed highlights were rechecked after reload. Browser diagnostics retained the one historical warning from before that correction.

No broad regression, mobile/responsive sweep, separate direct-file run, complete quest traversal, all-model render audit, combat/AI checks or persistence checks were performed. The temporary localhost server was used only for this approved check. No commit, push or publication was requested.

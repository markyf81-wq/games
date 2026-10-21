# HeroQuest

A combat prototype for the original North American HeroQuest Game System, played in one shared browser. One to four human-controlled heroes explore The Trial and fight CPU-controlled revealed monsters with static 3D miniatures. The remaining game rules are later milestones.

## Play the combat prototype

Open [`index.html`](index.html) in Chrome. Choose 1–4 players, enter their names, and choose one unique hero miniature per player. Only the selected heroes enter the board and turn order; one player can adventure with just one miniature. Selecting another player’s hero swaps their choices. Quest encounters and statistics stay unchanged. Choose the optional sight setting, read Mentor’s briefing, and begin. No installation, build, server or network connection is required; the browser needs WebGL 2. The approved browser check used localhost; direct-file operation is preserved by the implementation but was not separately checked in that pass.

- Choose **Roll movement**, then press **Roll** in the 3D dice modal. Movement uses traditional red dice with white pips. Attacks and defence use the supplied skull/shield dice in the same tray; heroes press Roll and Zargon rolls automatically. Results come from the random engine; animation only displays them. Continue through the recorded stages and outcome.
- The 2×2 stairway is one larger shared space: moving within it is free, and stepping off it costs one movement. Its internal coordinates only position the miniatures. This shared-space adaptation was requested by Mark; it is not stated in the original movement rules.
- Hover a known square or piece for a glow outline: light blue when within current movement/action reach, yellow otherwise. Selecting keeps the same colour. Click to open its nearby action panel. Choose **Move here** on a reachable square.
- The miniature takes a short hop across each traversed square and turns to face each step, retaining its final facing when it stops. Movement/turn controls pause until it lands; reduced-motion preferences skip the animation.
- Every revealed model opens a panel with its name, a short description and **Move here**. This chooses the shortest known route to a reachable free square beside monsters, furniture or other heroes; doors use either endpoint and stairs use their footprint. The active hero’s own square and blocked stone cannot be movement destinations. Unavailable actions remain visible, disabled with a reason. Click a door and choose **Open door** when adjacent; opening is free and doors stay open.
- Review new discoveries before continuing the remaining movement.
- Click a monster and choose **Attack**, then **Roll** in the modal, once per turn. Skulls hit; heroes defend with white shields and monsters with black shields. Attack before moving, or move then attack; attacking after paid movement ends the remaining movement.
- End the turn to hand the device to the next living hero. After the party, Zargon chooses moves and attacks for the revealed monsters. Continue through their results to review the phase.
- Drag to rotate, Shift-drag to pan, scroll/pinch or use plus/minus to zoom. With the canvas focused, arrows rotate and Home centres the active hero. Shift + arrows selects known squares, [ / ] cycles revealed pieces, Enter opens the context panel, and Escape closes it. **Explored map** fits only discovered terrain; party buttons centre a hero without changing turns.
- The sidebar keeps global controls such as **Roll movement** and **End turn**, plus party/status information. Tile, door and attack actions live in context panels; rolls and decisions use shared modal dialogs. **Menu** contains sight, grid/wall controls, instructions and restart confirmation.

Only discovered terrain is rendered. Rooms reveal their full contents when opened; corridors appear as they come into view. Explored terrain and furniture remain, with terrain dimming outside current sight. **Use realistic line of sight**, off by default, hides discovered movable pieces outside the combined sight of the heroes. It changes presentation without deleting entities or discovery memory.

Progress autosaves in this browser after each action. Refreshing the same game address restores positions, health, discoveries, doors, turn order, movement remaining, dice outcomes and pending combat/handoff screens, including an unrolled defence prompt. Camera, facing and grid/wall settings are retained. **New adventure** replaces the saved game when you start the new party; clearing the browser’s site data removes it. The footer reports if browser storage is unavailable. See [save details](docs/SAVES.md) and the [approved dice/refresh checks](docs/DICE.md).

Starting stats/weapons, adjacent melee combat, recorded attack/defence dice, Body Point loss, defeated-piece removal and CPU monster turns are implemented. Searches, spells, healing, thrown weapons, traps, quest completion, fallen-hero possessions and audio remain unavailable. The Elf and Wizard currently use their starting melee weapons without spells. Fallen heroes leave the board and turn order; losing every selected hero ends the prototype. This is not a complete playable quest and has no library catalog card.

## Content and implementation

The board’s 26 × 19 grid and 22 room rectangles are traced from the original blank map. The Trial uses 11 of those rooms, 12 doors, 24 monsters and 16 scenery placements, including the stairway. The map, symbol legend, briefing and exploration rules were visually reviewed against the original scans. See [`docs/EXPLORATION.md`](docs/EXPLORATION.md) for precise source locators, digital interpretations, verification and remaining limits. [Combat notes](docs/COMBAT.md) record the newly reviewed stats/rules, CPU policy and current verification status. The rest of the rules/cards have not received a complete audit.

Ordinary deferred scripts separate quest data, grid queries, command resolution, presentation and DOM controls. The engine owns a serializable state and seeded dice outcomes; the renderer receives a filtered projection. Three.js picking selects a cell or piece but never decides movement legality or sight. See [`AGENTS.md`](AGENTS.md) for the file map and invariants.

The original North American edition is authoritative. Preserve original names, quests, rules, cards and statistics. The Hasbro remake is comparison material only; fan equipment cards must be checked against the original Armoury.

## Miniature studio and assets

[`barbarian.html`](barbarian.html) opens the painted barbarian studio. [`studio.html`](studio.html) preserves the earlier full-board visual study with four sample pieces; those sample placements are not a quest. The studio has its own camera/selection controls and fixed explored-room demonstration. Its full-board controls are separate from the actual discovery engine.

All 40 supplied STL files have packed browser derivatives in [`assets/models/imported/catalog.json`](assets/models/imported/catalog.json). The exploration entry loads the heroes, Trial monsters and required scenery; the visual studio loads four samples. Most pieces use simple matte colours. The barbarian retains its 23,999-triangle supplied shape with 10 clean material regions: natural skin, chestnut hair, red cloth, brown leather, ivory fur, steel, bronze, stone, charcoal base and soft facial definition. No pigment noise or cavity wash is baked in; live lighting provides surface shading. Colour and geometry are separate, with a geometry hash preventing mismatched labels. See the [offline colour-layout preview](assets/previews/barbarian-painted.png) and [`assets/models/README.md`](assets/models/README.md).

Bookcases, weapons rack and stairway currently use simplified generated scenery. The tomb uses both supplied halves; the gargoyle currently uses its supplied body without separate wings. Decorative geometry never changes grid footprints. Sources are decoded once and cached, with no runtime STL parsing or simplification.

Mark supplied the STL collection from a shared personal drive and describes it as open licence. Creator, licence text and original links were not included and remain unknown; no specific licence is assigned or independently verified. No Free3D asset was used. Original ZIPs/STLs and retired modelling studies remain local and ignored by Git.

## Guides and references

- [Implementation plan](docs/PLAN.md): architecture and remaining milestones.
- [Exploration implementation](docs/EXPLORATION.md): source ledger, state, sight and UI conventions.
- [Combat implementation](docs/COMBAT.md): source ledger, attack ordering, CPU turns and result UI.
- [Browser autosave](docs/SAVES.md): save format, restore timing and verification limits.
- [3D dice and stairway](docs/DICE.md): supplied die mapping, Roll flow, shared-space movement and focused checks.
- [Content guide](docs/CONTENT.md): edition policy and transcription requirements.
- [Visual guide](docs/VISUALS.md): static miniature and shared interface direction.
- [Reference collection](references/README.md): source links and local archives.

Three.js 0.186.1 is bundled locally as a classic script; see [`vendor/README.md`](vendor/README.md) and its MIT licence. Preserve ordinary scripts and direct-file support; do not introduce fetched runtime content or modules without an agreed runtime change. Downloaded reference scans and HTML are research material, never executable/runtime dependencies.

From the repository root, missing references can be downloaded with `python3 heroquest/scripts/fetch_references.py` (Python 3.9+ and curl). The utility checks signatures and records sizes/hashes; a successful download does not certify content accuracy.

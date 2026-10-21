# HeroQuest implementation plan

## Agreed scope

Build a JavaScript game for GitHub Pages inside `heroquest/` in Mark's games repository. Everyone shares one browser and passes control between hero turns. The CPU takes Zargon's role. Preserve the original North American base game's quests, rules, cards, statistics, and equipment; original simplified graphics are acceptable. Use static 3D miniatures rather than animated characters.

The first exploration milestone now implements The Trial map, setup with 1–4 selected hero miniatures, handoff, 2d6 movement, doors, discovery and the optional sight setting. Basic melee combat and CPU monster turns are now implemented; searches, spells, healing and quest completion remain unfinished. Browser autosave/restore is implemented; see SAVES.md for format and verification limits. See COMBAT.md for combat sources, policy and verification status. See [EXPLORATION.md](EXPLORATION.md) for the implemented boundary and reviewed sources. The earlier visual study remains in studio.html; its sample placements are not a quest.

## Proposed application structure

Use plain JavaScript in ordinary deferred scripts, explicit namespaces, no framework, and a locally bundled rendering library. Three.js 0.186.1 is bundled as a classic script exposed as `HQThree`. The prototype uses procedural geometry, CanvasTexture assets and bundled classic-script meshes derived from Mark's supplied STL collection, preserving `file://` without modules or fetched files. The exploration entry loads Trial assets; the separate studio loads four sample pieces. All 40 source files have prepared derivatives, with remaining assembly/render review documented in EXPLORATION.md. Keep this runtime boundary.

```text
heroquest/
  index.html                 Exploration entry point
  heroquest.css, ui.css      Base styling and shared exploration UI
  src/
    data/                    Board topology, heroes, monsters, cards, quests
    engine/                  State, legal actions, commands, effects, randomness
    rules/                   Movement, visibility, combat, searches, traps, spells
    ai/                      Zargon decisions and tactical scoring
    session/                 Turn flow, save migrations, player assignments
    view/                    Static 3D scene, picking, camera, discovery display
    ui/                      Actions, character sheets, cards, logs, dialogs
  assets/                    Original runtime art, audio, and optional model assets
  vendor/                    Pinned rendering library and licence
  docs/                      Plans and source-linked rule decisions
  references/                Local research archive and source manifest
  scripts/                   Development utilities; never needed during play
```

Create runtime files as their features are implemented; avoid empty framework scaffolding or a library entry that implies the game works.

## Commands and game state

Use a deterministic state machine with a command boundary. A player or the CPU requests a command; the engine validates it, resolves effects and random outcomes, then returns the next state and display events. Rendering and saving consume that result. The same initial state, command sequence, and recorded random outcomes must produce the same game result.

Proposed conceptual interfaces:

```js
listLegalActions(state, actorId)
applyCommand(state, command) // { state, events } or a structured rejection
projectHeroView(state)
chooseMonsterCommand(state, legalActions, policy)
```

The state holds ruleset/content/schema versions, hero ownership, quest ID, board occupancy, turn/phase, movement budget, action usage, active effects, inventories, discovered areas, trap states, deck order, random-generator state, completed quest triggers, pending decisions, and an effect queue. Static definitions use stable IDs. Instances have separate IDs, including repeated monsters and treasure cards.

Save ordinary data only. Do not save meshes, DOM references, callbacks, or timeout handles. Rebuild the scene from state after loading. Store durable outcomes before presenting them so interrupted displays cannot reroll dice or consume an effect twice.

## Board and movement

Represent cells by integer coordinates with room/corridor membership. Represent walls and doors on edges between adjacent cells. Keep furniture footprints, blocked cells, occupancy, and hidden quest contents as separate layers.

Movement, targeting, and discovery are different rule queries. A piece that blocks passage does not automatically block every visibility rule. Three.js picking identifies a selected cell or entity; it does not decide game legality.

Plan routes using the actor's current known board. Resolve movement cell by cell, checking for discoveries, traps, triggers, and pending choices at each step. Do not use hidden traps or undiscovered monsters to colour reachable squares or choose an automatically safer route. Stop at a meaningful reveal or decision and let the player continue legally. Model free interactions such as opening a door separately from the six hero actions, according to the original source timing.

Opening a room, looking along a corridor, targeting a spell, and searching an area need their own source-linked visibility/reveal rules. A generic circular fog radius would change the game.

The digital exploration presentation deliberately extends the physical board: undiscovered rooms and corridors are not rendered, and no full-board frame or outline should disclose the map's bounds. Maintain separate discovered-cell and currently-visible-cell sets. Once discovered, terrain and static furniture persist; scene lighting alone controls terrain brightness. This visual adaptation must not change the original rules for searching, targeting, or quest triggers.

The optional checkbox is labelled **Use realistic line of sight**, off by default. When enabled, movable pieces such as monsters render only while within the combined current line of sight of the heroes. Discovered rooms, corridors, and furniture remain, possibly dimmed. When disabled, discovered movable pieces stay on the board as in the physical version. Filtering changes presentation, not authoritative entity existence or AI state. Keep the visibility setting separate from discovery memory. These behaviors and the checkbox now exist in the exploration entry. Its Explored map control fits discovered terrain. The separate studio retains a fixed visual demonstration.

## Turns and interrupted resolution

The turn controller should represent hero selection, movement/action ordering, resolution of an attack or spell, trap reactions, emergency healing, end-turn handoff, and individual monster activations. The default phase sequence is the heroes followed by Zargon, subject to the selected edition and quest exceptions.

Use an explicit serializable queue for multi-step effects and a pending-choice record for decisions. An attack cannot advance to the next actor while a death-prevention choice remains unresolved. Loading a save must restore the choice. Visual completion callbacks can advance presentation but cannot award damage, consume items, or change whose turn it is.

Pass-and-play needs a clear active hero, remaining movement/action information, and a handoff screen. Mark has requested 1–4 actual hero miniatures, including a single-character party. Setup currently uses one chosen hero per player and creates only those heroes. A later ownership UI may allow one person to control several selected heroes. Do not silently scale encounters for fewer heroes.

## Cards and quest content

Preserve printed display text separately from executable effects. Use a small reusable effect vocabulary for damage, healing, movement modifiers, statuses, summons, teleports, item changes, and conditions. Give unusual cards named handlers where a generic effect would obscure their rules. Avoid arbitrary code strings in content data.

Each quest stores narrative passages, starting positions, map features, wandering-monster type, named enemies, objectives, rewards, and source-linked triggers. A trigger has a stable ID, conditions, effects, and a persisted fired state. Model scope explicitly: once per quest, once per room, or per eligible hero as the source requires.

Do not expose quest notes or hidden entities through UI tooltips, camera rotation, highlights, or the event log before their reveal conditions. Hidden state remains inspectable in a client app's developer tools; the goal is an honest shared tabletop experience, not anti-cheat protection.

## Zargon automation

The book assumes a human Zargon, so automated tactics require documented adaptation choices. Use the authentic legal rules and quest instructions; keep tactical policy independently replaceable.

Start with deterministic pathfinding and scoring for legal attack positions, likely damage, target accessibility, spell value, congestion, and activation order. Decide and document how monsters select targets, whether they attack before moving, when they cast spells, and how they handle equally good options. Use seeded tie-breaking if needed. Do not allow the CPU to invent powers, open doors illegally, activate unrevealed monsters without a quest instruction, or use knowledge of future random outcomes.

## Presentation and saves

Use a tabletop camera with rotation, zoom, an overhead option, visible grid selection, and low/fading walls. Static models on bases move square to square. Keep the board readable at the expected device size. DOM controls should provide accessible actions and readable card text independent of the 3D canvas. See `VISUALS.md` for reference priorities.

Browser autosave uses `heroquest.session.v1`, with envelope version 1 and engine schema/content guards. It stores the whole resolved state, pending reports/choices, RNG/CPU cursor and plain camera/facing/grid/wall presentation data before animations; reload resumes automatically. See SAVES.md. `heroquest.settings.v1` remains reserved and unused. Export/import, multiple slots and migrations from future schemas remain later work. No audio design or assets are chosen yet.

## Milestones

1. **Content audit and decisions.** Review original rules, Armoury, screen, and card faces; establish board coordinates; map printed pages; record unresolved wording and Zargon choices. Produce source-linked content records before implementing their effects.
2. **One complete original quest.** Implement The Trial with 1–4 selected heroes, its authentic map, required core rules, discovery, combat, static pieces, quest completion, pass-and-play, and save/restore. The quest's own restrictions apply; do not add encounters or mechanics absent from it.
3. **Complete base rules and cards.** Add searches, treasure, traps, elemental/Chaos spells, artifacts, equipment, effect timing, hero death, and recovery. Keep unsupported content unavailable instead of approximating its effect.
4. **Original campaign.** Add the remaining 13 quests in printed order, individual exceptions, rewards, shopping, campaign state, and lost-artifact handling.
5. **Presentation and library integration.** Refine static models, controls, readability, and optional audio. Add an actual thumbnail, catalog record, visible return link, and root README entry when playable.

For each stage, propose only the focused checks that would materially establish its correctness. Mark controls approval for tests and browser verification; do not run them automatically.

## Decisions to resolve for remaining gameplay

- Resolve ambiguous original wording with Mark; record rulings rather than borrowing remake changes.
- Choose the CPU's target/activation/spell policy and label any adaptation.
- Confirm the main device/screen size and touch requirements before detailed interface work.
- Preserve the local classic-script renderer, packed STL derivatives and procedural board assets, or explicitly agree any new model pipeline that would require HTTP.

Online multiplayer, expansions, custom quest editors, house rules, and animated miniatures are outside the initial scope.

## Next session — 22 October 2026

Mark requested a full code cleanup before continuing textures, models and gameplay. Start by reviewing the accumulated presentation/controller code, consolidating repeated renderer/material and dialog handling, and updating stale documentation while preserving existing behaviour, direct-file support and saved games. Then continue the asset audit/painting and authentic gameplay milestones above. Agree focused verification scope before running checks; recent lighting, portrait, restart and animation work has mostly source/offline geometry review, not a full browser pass. No cleanup is part of this checkpoint commit.

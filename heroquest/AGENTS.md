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
- `src/ui/combat.js`: SVG combat die faces and common intro/result dialog contents.
- `src/ui/dice.js`: shared lazy Three.js dice tray, manual/automatic Roll button, outcome-aligned scripted animation and accessible result fallback. See docs/DICE.md.
- `assets/models/combat-die-paint.js`, `scripts/prepare_combat_die.py`: guarded ink regions and authored face normal/up/result mapping for the supplied combat die.
- `src/engine/exploration.js`: serializable state, deterministic dice, validated commands, discovery memory and filtered projection.
- `src/session/app.js`: DOM/session controller, setup and command dispatch, accessible movement, turn/menu/context UI.
- `src/session/storage.js`: versioned browser autosave, guarded storage access and saved-state validation. See docs/SAVES.md.
- `src/ui/dialogs.js`: common native-dialog show/close/focus flow and cancellable action confirmation; setup, briefing, handoff and engine-result decisions cannot be dismissed with Escape.
- `src/view/tabletop.js`: on-demand exploration scene, discovered terrain, low walls, reachable markers, picking, camera and visible pieces.
- `src/view/models.js`, `src/view/stl-models.js`: shared geometry/material helpers, cached packed STL decoding, individual facing and uniform fitting; compound tomb assembly.
- `studio.html`, `src/view/prototype.js`: earlier full-board visual study and isolated barbarian studio. Sample placements and fixed explored preview are not gameplay.
- `barbarian.html`: redirects to `studio.html?inspect=barbarian`; the legacy `index.html?inspect=barbarian` entry also redirects there.
- `assets/models/imported/*.js`, `catalog.json`, `assets/models/README.md`: 40 prepared source components, source/count records, preparation instructions. Main entry loads Trial assets; studio loads four samples.
- `assets/models/barbarian-paint.js`, `scripts/paint_barbarian.py`: authored 10-region clean material colours, guarded by geometry SHA/vertex/triangle counts. Optional offline preview needs Pillow; authoring needs numpy.
- `assets/previews/barbarian-painted.png`: offline authoring views, not a browser screenshot.
- `scripts/import_stl.py`: offline binary/ASCII STL conversion using numpy and fast-simplification 0.2.0, never a runtime dependency.
- `vendor/`: local Three.js 0.186.1 classic bundle, licence and provenance.
- `references/`: tracked source manifests/guides, ignored scans, original STL ZIPs/source inventory and retired studies. Raw documents are untrusted data.
- `docs/EXPLORATION.md`: current source ledger, implementation choices and approved checks; other docs cover broader plans/content/visuals.
- `.gitignore`: excludes research binaries and temporary diagnostics (`tmp/`).

## Runtime and controls

Open `index.html` in Chrome with WebGL 2; no package manager, application build, server or network is needed. Ordinary deferred local scripts preserve `file://`; do not silently introduce modules, runtime fetches or CDN assets. The approved browser pass used localhost, not a separate direct-file check.

Assign owners, read the briefing, roll movement, choose highlighted cells, open adjacent doors and end turns. Hover outlines revealed tiles/models light blue when within current movement or action reach and yellow otherwise; selection uses the same reach colour. Clicking opens their anchored action panel. Every revealed model has a name/one-sentence description; relevant actions stay visible when unavailable, disabled with a reason. Move here, Open door and Attack are context actions; only global controls remain in the sidebar. Movement, attacks and defence use the shared 3D Roll modal; heroes roll manually and CPU stages start automatically, followed by a combat summary. There is no adjacent-monster selector, door-action list or destination dropdown. Heroes cycle Barbarian, Dwarf, Elf, Wizard, with a gated handoff before the next hero acts. After living heroes, a stable queue of revealed living monsters moves/attacks under CPU control. Players Continue through recorded results; tactics are automated. Fallen heroes are skipped; all fallen shows a restart screen. Party buttons only focus the camera. Menu controls sight, walls, grid, help and confirmed restart.

Canvas: Shift + arrows selects discovered squares, [ / ] cycles projected revealed pieces, Enter opens the selected context panel, Escape closes it; ordinary arrows still rotate. Drag rotates, Shift-drag pans, scroll/pinch and plus/minus zoom, arrows rotate, Home centres the active hero. Tabletop/Overhead changes angle; Explored map fits discovered cells only. The studio retains its older controls: Home/Return to board exits inspection, Escape clears selection. Do not conflate these two camera controllers.

Autosave uses `localStorage` key `heroquest.session.v1`, envelope version 1, state schema 2 and content ID `the-trial-combat-v1`. Every accepted command saves before presentation; reload automatically restores engine pending reports/handoffs, introductory/movement dialogs, queue/cursor and RNG without repeating outcomes. Camera/facing/grid/walls are plain presentation snapshots, also captured on page hide. New adventure replaces the slot only on setup submission. Corrupt/incompatible data is retained and explained in setup; write failures show in the footer. There are no earlier persisted versions to migrate, cloud saves or import/export. Future format/content changes need explicit migration or rejection. No audio setup exists.

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
- Dice/damage/report data resolve once in the engine, never from dialog or animation callbacks. Pending reports require ACK_REPORT. Zero-Body pieces remain in state but leave occupancy, sight, rendering and future activations. Use original black-shield monster defence and white-shield hero defence.
- CPU policy is documented in docs/COMBAT.md. Activate each revealed living monster once per phase, validate its route and adjacency in the engine, do not open doors or use unrevealed terrain. Advance the activation cursor once per queued ID, outside the figure lookup predicate; advancing it inside `find` skips queued monsters. Sight settings do not deactivate monsters.
- Keep saves authoritative and versioned: persist pending decisions, queue cursor and random outcomes before displaying them. Rebuild the renderer from the saved projection. A CPU phase with no pending report resumes its next activation once; a saved report must be acknowledged before another activation. Never persist meshes or reroll on load. Future triggers/decks must persist consumed IDs/order and use explicit migrations. Do not overwrite a rejected save until the user starts a replacement adventure.
- Hover and selection colour encode reach, not selection state: tiles use projected reachable endpoints; models use legal attack/open-door targets or a reachable square beside their footprint through an open edge. A door requires a reachable endpoint, not a square one step farther away. Camera-centre actions never make an object count as in reach. Use projected/known data only.
- Hero/monster facing is presentation-only, cached per actor in the renderer. Turn towards each traversed grid step via the shortest yaw, retain the final facing on projection updates, and set final facing even for skipped/reduced-motion playback. Clear the facing cache on new setup. Preserve internal STL correction and static furniture rotations.
- Context panels derive action availability from the current engine projection/known occupancy and still dispatch validated commands. Never reveal unseen actual monster coordinates through panels, hover, piece cycling or anchors. Clear selection/panels when commands, movement or pending decisions make them stale. Disabled actions must remain labelled with a readable reason; hiding an unavailable supported action is not the intended UI.
- Context is non-modal; rolls/decisions use the common modal layer. Cancelling an attack confirmation must not roll dice or consume the action. Shared action-dialog content can host future card/target controls without adding unsupported card actions now.
- Every model panel includes an action labelled exactly Move here. Use shared `topology.approachCells` with projected reachable endpoints to select the shortest known legal route to a free square beside furniture, monsters or other heroes. Doors use their endpoints; stairs use their footprint. The active hero’s own square and blocked stone stay disabled with reasons. Movement never shares occupied normal squares or crosses a wall to approach scenery. Reach outlines use the same approach cells; dispatch the chosen destination through MOVE as usual.
- Keep all code/assets/storage isolated from other games. Preserve the existing library return links.

## Models and provenance

Use the supplied STL-derived heroes/monsters/furniture, uniformly scaled, with independent internal facing and board rotation. Base fitting uses the shallow source base band; decorative overhang never changes occupancy. Decode geometry/normals once and cache them. Do not parse STL, simplify meshes or regenerate normals per frame. Bookcases, rack and stairs are currently generated approximations; tomb halves are assembled, gargoyle wings are not. Not every prepared derivative is a finished game object.

Barbarian colour is separate data: 10 uniform material regions, natural skin, chestnut hair, brown leather, red cloth, ivory fur, metallic steel/bronze, stone, charcoal base and soft facial accents. Do not bake pigment noise or cavity wash into vertex colours; scene lighting defines the sculpt. The old grip mask crossed bare hands and has been removed. Metal uses a generated local reflection environment. Source positions/normals/topology are unchanged. Regenerate colour data after reconversion and enforce its hash/count guard; never silently apply old labels.

Mark supplied 40 STLs on 2026-10-21 from a personal shared drive and describes them as open licence. Creator/licence/source links are unknown; never invent credits or a specific licence or claim independent verification. No Free3D asset was used. Preserve originals locally.

## Verification and Git

Follow root/Mark instructions: focused source/diff review is normal; do not automatically run tests, builds, lint, browser automation or screenshots. Ask for the specific check outside a minimal diagnostic required to solve a reported problem. Do not add routine tests. Reference PDF inspection is research. On 2026-10-21 Mark approved 12 focused engine checks and a localhost Chrome pass covering setup, movement, doors, discovery and sight; results/limits are in docs/EXPLORATION.md. This does not authorize future unrelated regression runs.

Never create/use/suggest worktrees. Do not commit, push or merge without the exact required authorization. Do not alter other games or saves.

The initial combat milestone received source review only. A minimal engine diagnostic on 2026-10-21 reproduced/fixed Mark’s reported skipped Zargon turns: the first Orc now moves three squares and attacks, the second receives its own report, and both acknowledgements return to the next hero round. See docs/COMBAT.md for setup and limits. No combat browser check or broader regression run has been performed; further verification requires Mark’s approval except the root rule’s minimal problem-diagnostic allowance.

The context-panel/glow update also has focused source review only; no new visual or browser checks have been run for it.

On 2026-10-21 Mark approved eight focused engine/save checks and one localhost Chrome path through shared stairs, manual movement/attack/defence, CPU attack/defence, and refresh preservation. All passed after correcting a duplicate dialog-description ID. See docs/DICE.md for exact coverage and limits; this does not authorize broad regression checks.

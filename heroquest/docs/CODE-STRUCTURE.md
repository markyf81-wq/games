# HeroQuest code structure

Plain deferred JavaScript factories under window.HeroQuest, with local Three.js
exposed as HQThree. Each component owns one concern; no framework, build, module
loader, runtime fetch or new dependency is required. Keep file:// compatibility.

## Boundaries

| Layer | Owns | Must not own |
| --- | --- | --- |
| data | Stable source-linked definitions, original card text, public piece metadata | DOM, meshes, state mutations |
| rules | Pure legality, routes, sight, effects and quest queries | UI animation, renderer picks |
| engine | Accepted commands, recorded RNG/results, discovery and CPU queue | DOM, timers, meshes |
| ai | Deterministic tactics from allowed knowledge | Invented powers, hidden-map reveals |
| session | Persistence, dispatch, presentation sequencing and practice fixtures | Dice outcomes from animation |
| ui | Forms, card browsing, target decisions and readable results | Unvalidated gameplay changes |
| view | Displayed entities, camera, particles, materials and interaction | Authority over movement, damage or RNG |

session/app.js applies and saves a command before any presentation. It then awaits
movement/camera/spell/removal promises and renders recorded dice or outcomes.
Interrupted presentation cannot reroll, recast or advance a turn twice. Current
state schema is 15; content ID and save keys remain unchanged. SAVES.md records
search/potion state and earlier migrations. Sandbox fixtures remain in their separate save slot.

## Reusable components

- data/dungeon.js, rules/dungeon.js: original trap/search/jump/disarm rules,
  stable layout records and pure pending falling-block escape choices.
- ui/search.js: native board-toolbar Search modal; reuses per-choice rule reasons.
- ui/dungeon.js, view/dungeon-features.js: context actions and persistent pit/marker
  presentation. Terrain masks pits; wall records own sliding secret stone panels.
- data/pieces.js: public metadata shared by contexts and Models.
- ui/dialogs.js: native modal confirmations and nonmodal spell-drawer opening.
- data/treasure.js, rules/treasure.js: 24 physical cards, source text/art, room
  search rules, quest overrides, deck returns and wandering-monster placement.
- data/items.js, rules/inventory.js: source-linked melee/armour equipment and
  potions, owned/equipped slots, bonuses/restrictions, potion sharing and recovery.
- rules/recovery.js: pending casualty, own potion/spell eligibility, sealed death drops, free bag carrying and idempotent completion revival/returns.
- view/belongings.js: shared sack geometry/materials, with no rule occupancy.
- session/storage.js: localStorage, slot/envelope ownership and import/export
  wrapper errors; no gameplay validation rules.
- session/save-validation.js: actor/inventory/dungeon/turn validation and ordered
  legacy migrations; shares bounded primitive checks with save-reports.js.
- session/save-reports.js: recorded potion/combat/spell/trap/search results,
  recovery and consumed-item references; never resolves another outcome.
- ui/save-files.js: local file picker/download and import confirmation; app.js installs only
  confirmed imports and guards outgoing autosaves before reloading.
- ui/treasure.js: finite slide/flip card reveal in the shared nonmodal drawer;
  recorded card only, reduced-motion/interruption completion, no rule or RNG work.
- ui/item-card.js: shared inventory/Armoury card tile, keeping prices, counts and
  selection under their caller’s ownership.
- ui/inventory.js: per-hero nonmodal drawer using the spell drawer's shared
  position/finish, grouped possessions, manual Drink & roll and board-selected Give.
- session/presentation.js: pure derived display snapshots, capped health deltas,
  pending-roll status masks and held casualties; no DOM/timers/state mutations.
- session/movement-actions.js: movement reasons, partial-route actions, cached
  previews and free auto-approach destinations. The controller still sequences
  move-then-act and rechecks the accepted endpoint after reveals.
- session/dice-flow.js: read-only tray/prompt descriptors and recorded-stage
  transitions. app.js retains manual roll triggers, saves, pacing and effects.
- session/pacing.js: one cancellable keyed presentation timer, CPU pause and
  hidden-tab/modal suspension; commands and RNG remain in the engine.
- ui/dice.js: cached sidebar 3D tray; explicit hero Roll and automatic CPU rolls,
  with settled notifications driving presentation stages.
- ui/combat.js: compact board results/Zargon intro, without acknowledgement modals.
- ui/controls.js: temporary global-action locks with restoration of prior states;
  shared by animation sequencing and modal-to-board target selection.
- ui/board-choice.js: already-legal public target refs, Cancel/Escape, drawer/dialog return;
  no engine command in the picker itself; spell callers dispatch on selection,
  while cancellation restores the same drawer/card.
- ui/party.js, adventure-hud.js, quest.js: setup/ownership, read-only HUD and outcomes.
- ui/portraits.js: lazy one-renderer bust capture, cached images and unchanged
  container content; materials remain renderer-local and owned clones.
- view/board-camera.js: critically damped displayed framing, lens projection and
  one bounded arrival wait. The tabletop retains serializable framing goals.
- view/board-terrain.js: instanced floor atlas and grid strips, rebuilt only when
  the discovery key changes; cached floor meshes also serve picking.
- view/route-preview.js: two fixed GPU buffers and one cached endpoint for
  blue/yellow path overlays. Hover changes coordinates/draw ranges only.
- view/sight-overlay.js: optional whole-tile floor sight guide, reusing
  topology.canSee with public tile/figure data and one cached instanced plane.
  Session actions switch it off before presentation; no camera/frame recalculation.
- view/figure-motion.js: exact recorded route hops/facing and owned removal fades.
- view/combat-impact.js: finite post-dice melee shove and one reused signed health-change
  sprite; exact pose restoration, interruption handling and no rule mutations.
- view/treasure-effects.js: cached arrow/pit hazard presentation after card Continue;
  owns temporary pit floor/ring/pose restoration and contact-timed health feedback.
  Terrain exposes one transient floor-instance hole; rules and saves stay unchanged.
- view/blood-pools.js: shared lit stain resources and per-casualty placement from
  the filtered derived fallen projection; no independent save or gameplay state.
- view/combat-camera.js: finite attacker-eye flight, projection blend and return.
- view/spell-effects.js: one reusable 160-particle buffer, projectile core and aura
  ring. Twelve cosmetic recipes run before result/dice presentation, with no game RNG.
- view/spell-flames.js: cached instanced flame volumes with GPU curling/flow.
- view/spell-objects.js: cached Tempest ribbons, Genie silhouette and instanced
  Rock Skin fragments, animated through the existing finite spell lifecycle.
- view/status-effects.js: bounded persistent status sprites, stone instances and
  cached phasing outlines, rebuilt from filtered flags; follows displayed models
  and preserves known defender cues while recorded dice are revealed.
- view/tabletop.js: composes these components, owns displayed entities, input,
  ordinary framing goals and bounded render scheduling.
- view/walls.js: discovery/door-keyed boundary layouts, protected-area calculation,
  pooled per-target rays and clipped/capped cutaway. Camera rays are unprojected
  once per target per frame and reused across wall sections.
- view/blocked-scenery.js: cached-sculpt assembly for a solid wall-height blocked
  square; walls.js owns its clipping/capping and obstruction checks.
- view/light-barriers.js: per-light visibility atlas for known wall/door/rubble
  edges, cached by light position/layout and applied with board-local shader hooks.
  Uses shared live clipping planes so visual cutaway remains independent.
- view/torches.js: eight fixed light slots, sole shadow caster, pooled fire effects;
  camera movement changes slot assignments without changing shader light counts.
- view/model-surfaces.js, furniture-surfaces.js: shared reflection/finish recipes;
  geometry/textures stay cached while preview materials remain independent.
- ui/model-viewer.js: isolated model inspection, sharing factories without quest
  placements or session state.

## Cleanup scope, 22 October 2026

Extracted camera/terrain/control responsibilities; consolidated interruption
cleanup; cached unchanged terrain, wall layouts, picking/reach data and portrait
content. Removed retired studio/unused sidebar styles and stale planning claims.
Original source meshes and provenance stay available even when their plain-colour
runtime tags are replaced by painted derivatives. No rule refactor, new state
field, altered die distribution, other-game change or dependency was introduced.

The code-level reductions are not measured performance results. Profiling draw
calls, shadows, picking and initial GPU asset setup remains a future scoped task.

## Review limits

This latest pass has source/diff review only. No tests, builds, lint/typecheck,
browser automation, screenshots or benchmarks were run; Mark chose manual testing.
Earlier approved engine/save/browser results and their limits remain in
EXPLORATION.md, DICE.md, QUESTS.md and SPELLS.md. Those historical checks do not
verify the new camera/terrain extraction or paint batch. Subsequent focused
spell-effect Chrome checks and blocked-stone authoring renders are documented in
SPELLS.md and WALLS.md; they are not a broad regression or performance pass.

## Region painting authoring tool

`model-painter.html`, `model-painter.css` and `src/tools/model-painter.js` are a
standalone, build-free region marker over immutable imported sculpts. It has no
game/session dependencies. Cached GPU face IDs constrain brush marks to visible
surfaces; local drafts and fingerprinted JSON exports stay separate from game
assets and saves. See [MODEL-PAINTER.md](MODEL-PAINTER.md).

## Current cleanup — 23 October 2026

Session display derivation is separate from command/save/pacing coordination.
Actor lookup, health deltas, held casualty checks and pending-roll masking share
presentation.js. One tabletop.finishPresentation method restores all owned
camera/motion/hazard/health/spell effects on failure, reset and interruption.
Inventory selection updates card details and pressed states without rebuilding
its item grid or hero selector. Potion wording is owned by item definitions and
reused by Treasure cards. Quest objective copy has one renderer helper.

Shared nonmodal drawer layout lives in drawers.css, loaded after ui.css. Retired
sidebar attack controls and text-card styles are removed. Play loads the painted
Wizard derivative directly; the painter still loads its immutable original from
its own source catalog. Authoring recipes/region maps and runtime provenance
remain versioned; raw scans, source STLs, temporary scripts and preview images
stay ignored/local. Specific feature guides replace accidental README/agent-guide
copies, retaining source ledgers and historical verification limits.

No schema, game rule, RNG, external dependency, framework or build step is changed
by this cleanup. Source/diff review only: no new tests, builds, typechecks, lint,
browser automation, screenshots or performance benchmark was run.

## Cleanup — 24 October 2026

Split session controller responsibilities into movement-action planning and pure
dice display/stage descriptions. Storage I/O is separate from state migrations
and recorded-result validation, retaining validation order and schema 13. Engine
command membership is allocated once; fresh movement, inventory limits, empty
slots and equipment mirrors have shared owners instead of separate reset copies.

Route preview buffers, materials and endpoint geometry are reused across hover
changes. Inventory keeps unchanged select options and item buttons, updating
counts, equipment state and selection without replacing focused nodes. Spell hand
styling lives entirely in drawers.css; superseded modal sizes, responsive
cascades and repeated no-op transition declarations are removed. Ordinary deferred
script order and local-file operation remain part of the design.

This is source/diff review only. No tests/build/lint/typecheck/browser checks or
benchmarks were run. Behaviour and compatibility are intended to remain the same;
manual engine/save/UI verification remains outstanding. No commit or push.

Schema 14 adds optional fair loot recovery (default off), standard inheritance/loss,
and a partial sealed-bag revival ledger. Top-view snapshots retain their return
framing; table preset controls are removed. Furniture now blocks targeting sight
as well as movement. See EDITION-COMPARISON.md and RECOVERY.md.

rules/armoury.js owns between-quest stock, eligibility and transaction rules;
ui/armoury.js owns hero/card browsing, issuing engine commands only. The controller
keeps one shop modal open while rendering saved transactions. board-terrain.js
owns the optional unknown-area board plane/mask; floors.js shares printed-art
cleanup. The backdrop is excluded from picking and authoritative discovery.

The final cleanup shares equipment-card construction across Inventory and Armoury,
keeps viewer-only lighting/plinth variables local, simplifies sealed-bag settlement
and updates stale recovery/shop docs. No tests/build/browser checks were run.

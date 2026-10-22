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
Interrupted presentation cannot reroll, recast or advance a turn twice. Schema 5,
content ID and save keys are unchanged by the presentation/cleanup work; SAVES.md
records earlier migrations. Sandbox fixtures remain in their separate save slot.

## Reusable components

- data/pieces.js: public metadata shared by contexts, Models and the Test room.
- ui/dialogs.js: common native-dialog focus, close and confirmation flow.
- ui/controls.js: temporary global-action locks with restoration of prior states;
  shared by animation sequencing and modal-to-board target selection.
- ui/board-choice.js: already-legal public target refs, Cancel/Escape, modal return;
  no card use or engine command until the caller confirms.
- ui/party.js, adventure-hud.js, quest.js: setup/ownership, read-only HUD and outcomes.
- ui/portraits.js: lazy one-renderer bust capture, cached images and unchanged
  container content; materials remain renderer-local and owned clones.
- view/board-camera.js: critically damped displayed framing, lens projection and
  one bounded arrival wait. The tabletop retains serializable framing goals.
- view/board-terrain.js: instanced floor atlas and grid strips, rebuilt only when
  the discovery key changes; cached floor meshes also serve picking.
- view/figure-motion.js: exact recorded route hops/facing and owned removal fades.
- view/combat-camera.js: finite attacker-eye flight, projection blend and return.
- view/spell-effects.js: one reusable 160-particle buffer, projectile core and aura
  ring. Twelve cosmetic recipes run before result/dice modals, with no game RNG.
- view/tabletop.js: composes these components, owns displayed entities, input,
  ordinary framing goals and bounded render scheduling.
- view/walls.js: discovery/door-keyed boundary layouts, protected-area calculation,
  pooled per-target rays and clipped/capped cutaway. Camera rays are unprojected
  once per target per frame and reused across wall sections.
- view/torches.js: eight fixed light slots, sole shadow caster, pooled fire effects;
  camera movement changes slot assignments without changing shader light counts.
- view/model-surfaces.js, furniture-surfaces.js: shared reflection/finish recipes;
  geometry/textures stay cached while preview materials remain independent.
- view/test-room.js, ui/model-viewer.js: invented 32-type showroom and isolated
  inspection, sharing factories without quest placements or session state.

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
verify the new camera/terrain extraction, spell particles or paint batch.

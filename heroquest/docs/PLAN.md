# HeroQuest implementation plan

## Agreed scope

Original North American base Game System for GitHub Pages inside this games
monorepo. One shared browser, 1–4 selected hero miniatures, CPU Zargon, static 3D
sculpts with whole-piece motion. Keep authentic base quests/cards/items/rules;
no expansion/remake/fan content. Terrain hiding, discounted stair movement and broader rock
phasing are Mark's documented digital choices, separate from printed wording.

Plain deferred JavaScript, bundled Three.js, local packed assets; no framework,
build step, CDN, module loader or runtime fetch. Preserve file://, saves, source
notices and other games. CODE-STRUCTURE.md maps current component boundaries.

## Current implementation

- The Trial's source-linked map, briefing, monsters/Verag and individual stair exits.
- Actual 1–4-hero parties, ownership, handoff, movement/action order, discounted four-square stairs,
  doors, discovery, optional realistic LOS, melee and deterministic CPU turns.
- Twelve original elemental spells, original card artwork/full text, inertial hand,
  board target selection, used-card removal and spell-specific saved effects.
- Separate gameplay sandbox with twelve spell presets and turn/opponent fixtures.
- Autosave/restore, recorded dice stages, schema 5 with guarded older migrations.
- Sliding/hopping figures, attacker-eye camera, finite spell particles/projectiles,
  defeated-piece removal and gliding focus on movement/discovery.
- Painted furniture/doors/rubble, supplied board/stair art, tall walls/cutaway,
  deterministic room torches, fireplace fire and bounded pooled lighting.
- Models and invented 36-type Test room, separate from live gameplay practice.

Latest painting, targeting/sandbox/camera and cleanup changes have source/offline
authoring review only. Mark is manually testing. Subsequent focused spell-effect
Chrome checks and blocked-square authoring renders are recorded in SPELLS.md and
WALLS.md; these do not constitute a broad gameplay/performance pass.

## Next priorities

Requested setting TODO: **Scale difficulty to hero count** (optional, default
off). Make small parties, especially a solo hero, easier without changing the
standard original quest by default. Decide the adjustment formula and what is
scaled before implementation; no automatic encounter/stat scaling exists yet.

1. **Manual spell pass, one card at a time.** Use SANDBOX.md presets/checklist.
   Check targets/cancellation, movement/action timing, resistance, effect expiry,
   refresh and new particle→dice/outcome ordering. Resolve reported faults with
   the smallest diagnostic needed; no automatic full regression run.
2. **Original searches/treasure and remaining core actions.** Audit sources first;
   implement per-hero/per-room rules, persisted decks/consumption and explicit
   pending decisions. Do not approximate unavailable card effects.
3. **Quest events, traps and death recovery.** Source-linked trigger IDs, scope and
   fired-state persistence; emergency healing/potions need deliberate queues and
   a new migration if stored fields change. No hidden information in target hints.
4. **Complete The Trial and then original campaign.** Genuine quest exceptions,
   remaining base mechanics, rewards/shopping and persistent campaign progression.
5. **Further models/performance/presentation.** Dwarf, Elf and monsters await detailed
   paint; gargoyle wings need assembly. Profile camera/GPU setup/draw calls/shadows
   only with agreed scope. Add a real library thumbnail/catalog entry when playable.

## Design constraints

The engine owns every accepted command, legal transition and RNG draw. Persist
outcomes before presentation and restore pending queues/choices without replay.
Rendering never resolves rules. Route previews use player knowledge; discovery
is stepwise, and hidden positions must not improve a suggested route.

Cards retain original text separately from executable handlers. Give unusual
spells named handlers rather than forcing them into an opaque generic engine.
Quest events need ordinary serializable conditions/effects and stable IDs, never
arbitrary code strings. Keep AI policy replaceable and label tactical adaptations.

Reuse existing UI dialogs/controls/board picker and bounded presentation components.
Cache geometry/materials/textures; keep preview ownership and renderer reflections
separate. Stable torch light counts avoid camera-driven shader variant churn.
Terrain/layout caches must invalidate on discovery/known-door changes; cutaway
protection still follows the active/defending hero and actual displayed camera.

No online multiplayer, account service, expansions, quest editor or skeletal
animation is part of the current scope. Export/import and multiple adventure slots
remain future work. No audio system is implemented.

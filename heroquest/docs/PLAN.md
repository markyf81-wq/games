# HeroQuest implementation plan

## Agreed scope

Original North American base Game System for GitHub Pages inside this games
monorepo. One shared browser, 1–4 selected hero miniatures, CPU Zargon, static 3D
sculpts with whole-piece motion. Keep authentic base quests/cards/items/rules;
no expansion/remake/fan content. Terrain hiding, discounted stair movement and broader rock
phasing and optional fair-mode sealed-bag revival are Mark's documented digital choices, separate from printed wording.

Plain deferred JavaScript, bundled Three.js, local packed assets; no framework,
build step, CDN, module loader or runtime fetch. Preserve file://, saves, source
notices and other games. CODE-STRUCTURE.md maps current component boundaries.

## Current implementation

- The Trial's source-linked map, briefing, monsters/Verag and individual stair exits.
- Actual 1–4-hero parties, ownership, handoff, movement/action order, discounted four-square stairs,
  doors, discovery, persistent revealed miniatures, melee and deterministic CPU turns.
- Twelve original elemental spells, original card artwork/full text, inertial hand,
  board target selection, used-card removal and spell-specific saved effects.
- Persistent status visuals for all seven spell statuses and three potion buffs,
  derived from saved flags/current movement and bounded independently of casts.
- Zargon portrait modal with explicit Continue before the CPU queue begins.
- Separate gameplay sandbox with twelve spell presets and turn/opponent fixtures.
- Autosave/restore, local JSON save export/import, recorded dice stages, schema 15
  with guarded older migrations. Menu transfer and setup import confirm replacement
  and keep adventure/sandbox files separate; see SAVES.md.
- Per-hero inventories, personal gold, starting equipment, one-use healing
  potions with sidebar dice and an explicit lethal-hit potion recovery choice.
  Original 24-card room searches now grant gold/potions and resolve hazards/Orcs.
  The Trial's fixed/empty quest finds and per-hero room limits are persisted.
- Emergency self-healing spells with per-hero action history, original lethal
  report/CPU continuation, default inheritance/loss, optional fair sealed bags,
  carrier death drops and successful-completion revival/returns.
  Five sandbox recovery presets; see RECOVERY.md for rule interpretations/review.
- Equip carried melee weapons, armour, helmet and shield, with original bonuses,
  Wizard/two-handed restrictions and plate-mail movement. Equipment practice
  provides sandbox-only loadouts and matching archived card artwork.
  Staff/Longsword add diagonal melee; Crossbow adds sight-based ranged attacks
  and a bolt animation. Carried Daggers may be thrown and are lost on hit or miss;
  a weaponless hero has a one-die fallback. Defence rolls show a block cue.
- Sliding/hopping figures, centred rear POV/occasional eye camera, finite spell particles/projectiles,
  defeated-piece removal and gliding focus on movement/discovery.
- Painted furniture/doors/rubble, supplied board/stair art, tall walls/cutaway,
  deterministic room torches, fireplace fire and bounded pooled lighting.
- Separate trap/secret-door searches, jump/disarm/manual rolls, persistent pits,
  spear/block/furniture consequences and concealed sliding stone doors.
  Five invented exploration practice scenarios; The Trial placements unchanged.
- Between-quest Armoury buying/selling/equipping and a practice fixture, with
  personal gold, unlimited stock, full card previews and rounded-down sellback.
- Optional printed full-board backdrop preserves unexplored wall/piece hiding.
- Models provides isolated inspection of 36 public model types; live gameplay
  practice remains in the sandbox.

Latest painting, targeting/sandbox/camera and cleanup changes have source/offline
authoring review only. Mark is manually testing. Subsequent focused spell-effect
Chrome checks and blocked-square authoring renders are recorded in SPELLS.md and
WALLS.md; these do not constitute a broad gameplay/performance pass.

## Next priorities

Requested TODO: **Minify the whole codebase** for distribution, keeping readable
source files for development and preserving local assets and file:// play.

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
   Original Treasure stack/search/card faces are now implemented; see TREASURE.md
   for mechanics, source interpretation, migration and manual-review limits.
   Item sharing on the giver’s turn is implemented through the board picker.
   Traps/secret-door searches and disarming/jumping now have practice scenarios;
   see TRAPS.md for sources, interpretations and manual review limits.
   Equipping, armour combinations and plate movement are implemented. Remaining
   work includes gold trading and quest-specific equipment rewards. The between-
   quest Armoury now implements acquisition, unlimited stock and half-price
   sellback rounded down; see ARMOURY.md.
   Secret doors now remain masonry until searched for, then slide open on request.
3. **Quest events and trap exceptions.** Source-linked trigger IDs, scope and
   fired-state persistence. Own potion/spell death recovery and possessions now
   have deliberate saved handling in schema 15; see RECOVERY.md.
   No hidden information in target hints.
4. **Complete The Trial and then original campaign.** Genuine quest exceptions,
   remaining base mechanics, rewards and persistent campaign progression.
   Standard deaths need replacement characters; optional Fair loot recovery carries
   revived bag owners forward. Retain survivor recovery and possessions. Next-quest advancement should
   follow the party objective plus a safe exit; early retreat/failure replays.
   The Armoury is implemented; carrying this party into the next quest is next.
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
animation is part of the current scope. Save export/import is implemented; multiple
adventure slots remain future work. No audio system is implemented.

The 24 October cleanup separates dice descriptors, movement actions, storage I/O,
state migrations and saved-result validation. Shared equipment/movement factories,
cached path geometry and stable inventory buttons replace duplicate work. Spell
layouts are consolidated in drawers.css. Schema 13/gameplay/content are unchanged
by the cleanup; source/diff review only, no new automated/browser verification.

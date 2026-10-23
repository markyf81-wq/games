# HeroQuest — The Trial prototype

A client-side 3D adaptation of the original North American base Game System for
one shared browser. Choose 1–4 players, each with an actual hero miniature; the
computer controls Zargon. This is an unfinished gameplay prototype, not yet a
playable entry in the games library.

## Run

Open [index.html](index.html) in Chrome with WebGL 2. Scripts, Three.js, textures
and packed models are local. No install, build, server, CDN or network is needed;
ordinary deferred scripts retain file:// support. GitHub Pages can host the same
files beneath the monorepo's heroquest directory. Use Games library to return.

## Play and controls

Set up the party and spell groups, read Mentor's briefing, then roll movement.
Click a tile or revealed model for its context panel. Hover outlines and routes
are blue within reach, yellow beyond it; Move partway here follows a legal blue
prefix. The path line remains visible through walls and models. Door opening
and looking are free. An action can follow movement or
precede it, but movement cannot be split around an attack/cast.

Open door and Attack can walk into reach first when a fully known legal route
fits the remaining movement. Discovery interrupts movement; choose again to
continue. Every displayed piece except walls has a context panel, with unavailable
actions disabled and explained. Roll movement and End turn remain global controls.

Drag to orbit, Shift-drag to pan, wheel/pinch or plus/minus to zoom. Arrow keys
rotate; Home centres the active hero. Shift+arrows selects squares, [ / ] cycles
pieces, Enter opens their panel, Escape dismisses it. Camera focus glides between
positions, follows moving figures and centres newly revealed areas.

The POV button toggles the cinematic camera (on by default). Movement, spells,
doors and most attacks use an over-the-shoulder view with the miniature visible.
Gentle position/turn following absorbs the movement hops. Linked actions keep
one shot; visible CPU activations transition directly between units, returning
to the board when Zargon's turn ends. Hero planning and discoveries return to
the board. One attack in four uses true first person, selected cosmetically
without game RNG or damage information. Turning the toggle off keeps actions in
board view. Movement dice
are rounded red dice with white pips; combat dice use the original skull/shield
symbols. Outcomes are recorded independently of animation/physics. CPU dice roll
automatically. Roll movement starts a manual roll in the sidebar. Attack, hero
defence and hero resistance also wait for Roll; settled stages advance without
Continue buttons. Damaging melee hits then make a small shove, with the actual
Body lost floating above the defender (for example −1). All gameplay health
changes show red damage or green healing numbers, including spells, potions and
hazards, using the actual amount lost/restored. Misses and fully blocked hits skip it. Results stay over the
board until dismissed, the next action
or the next player’s turn;
their details remain in the journal.
Defeated pieces then fade/tip away automatically. End turn stays explicit; the
Zargon’s portrait screen waits for Continue before the CPU queue starts. After
that, moves/rolls play automatically, with Pause Zargon available between stages.
Shared-device handoffs retain one compact acknowledgement; with one hero left,
the next turn resumes directly.

Spells opens a drawer beside the board with the original elemental cards assigned
to that caster. All actions work with left clicks; movement keeps its context
confirmation. Swipe,
drag or use arrows to browse the inertial carousel; full printed text and details
sit below it. Choosing a glowing target on the board casts the selected spell
immediately; Cancel returns to the book without casting.
Used cards leave the hand. A short spell-specific particle/projectile effect plays
on the board before sidebar resistance/combat dice or compact outcome feedback. Effects
skip under reduced motion or interrupted graphics; saved outcomes never replay.
Active statuses also have ongoing cues: floating Sleep Zs, Tempest swirls, stone
flecks, phasing outlines/dust, mist/wind and distinct Courage/potion auras. They
follow visible miniatures, stop with their effects, restore from saves and become
static under reduced motion.

**Inventory** opens a drawer for the active hero; its selector lets you inspect
any party member. Hero miniature contexts also offer Inventory. Each hero keeps
their own gold, starting equipped weapon and potions, with matching card artwork. Drink & roll consumes one
healing potion and rolls a red die in the sidebar, without using movement or an
action. A lethal hit offers potion recovery before removing a hero carrying one.
Inventories and recorded potion rolls persist across refresh. New adventures
start with no gold/potions. Search rooms to acquire them, or use the sandbox's
inventory fixtures to practise. On the owner’s turn, select a potion and choose
Give, then click another glowing hero to transfer one without spending movement
or an action. See [inventory](docs/INVENTORY.md).

**Search for treasure** opens a slide-out tray with the original card stack. Its
top card slides out and flips to reveal the original face and full description.
Read the card and click Continue to resume; quest finds also wait for Continue.
Search once per hero per monster-free room; quest finds show their own text.
After Continue, arrow hazards visibly strike and pit hazards briefly open beneath
the miniature before damage feedback.
Gold/potions enter that hero’s inventory, hazards end their turn, and wandering
Orcs attack immediately when placed beside them. Strength/Defense potions prepare
the next attack/defence; Heroic Brew permits two weapon attacks. See
[treasure rules and current limits](docs/TREASURE.md).

Use **Quest info** beside the sidebar quest title to reread Mentor’s briefing
and the current objective.

Return to the stairway to Leave dungeon. Leaving before defeating Verag is
an individual retreat; other heroes can continue. Restart confirms a fresh quest
with the same party; New adventure returns to setup.

## Visibility and appearance

Only discovered terrain is displayed. Rooms reveal their contents together;
corridors appear as explored. Static terrain/furniture remain. Optional realistic
LOS hides movable pieces outside combined party sight; spell targeting always
uses the individual caster's sight. Floor/grid brightness follows scene lighting.

The main-view wall icon cycles Full walls, Automatic cutaway and Low walls.
The bulb toggles lighting; the POV button toggles the cinematic camera; table and board
icons select tabletop/overhead views.
Hover tooltips name each control and its current state.
Automatic cutaway clears actual obstructions to the active/defending hero's room,
or the hero point in corridors. Walls have deterministic stone/section variation
and sculpted joins. Dynamic lighting toggles gloomy torch/hearth lighting versus
full tabletop light. Menu → Background light adjusts global visibility while
lighting is on. Every room has a deterministic clear torch mount, up to two in
large rooms. Torches shed small embers that arc down into the room, cool to red
and fade near the floor, reusing the existing particle slots. Decorative fire
never changes rules, sight or occupancy. The nearest shadow-casting flame jitters
slightly in three dimensions at a capped 12 updates per second; reduced motion
keeps it steady.

Furniture, doors and rubble have prepared wood/cloth/stone/metal finishes. The
Barbarian and Wizard are painted; Dwarf, Elf and monsters await detailed painting. All
miniature bases are dark grey. The Wizard uses your latest region export, with
balanced blue eyes with relaxed eyelids, locally raised lips with a subtle mouth crease and natural
cloth/leather/metal finishes. Floors use Mark's supplied board image and stairs
use the original printed tile artwork. [Asset audit](docs/ASSET-AUDIT.md) records
sources, remaining assembly and limits. No new models are currently needed for
The Trial; the gargoyle's separate supplied wings still need assembly.

## Inspection and practice

[Model painter](model-painter.html) is a separate authoring tool: brush named
regions on the supplied neutral sculpts, orbit/pan/zoom, undo/redo and export
markings for refinement. Drafts use independent `heroquest.paint.v1.<model>`
browser keys; they do not change game paint or adventure saves.

**Models** rotates any of 36 public model types. **Test room** displays them all,
including the newly painted cupboard, in an invented neutral-floor showroom.
These viewers share game factories but reveal no quest placements or save state.

**Gameplay sandbox** opens [a separate practice game](index.html?sandbox=1).
Its tools prepare each spell, movement, heroes and original opponents through
fixtures while real rolls/effects use the normal engine. Its browser save is
separate from the adventure. See [sandbox guide/checklist](docs/SANDBOX.md).

## Saves, rules and implementation

Adventure autosave uses heroquest.session.v1; practice uses heroquest.sandbox.v1.
Envelope 1/state schema 7 retain RNG, spent cards, the treasure deck/search ledger, pending dice/reports, CPU queue
and view preferences. Accepted outcomes save before presentation. Refresh resumes
recorded results without recasting/rerolling. Invalid saves remain until explicit
replacement. Menu → Export save downloads a JSON file; Menu → Import save loads
it on another browser/device after showing the party/round and confirming
replacement. Import save is also available on initial setup. Adventure and
sandbox files stay in their respective modes. Pending rolls and view preferences
travel with the save. No cloud save or account system is implemented.

Discounted movement inside the four individual stair squares and broader Pass
Through Rock object traversal
are Mark's digital rulings, distinct from original printed rules. Rock movement
stays within the quest's playable floor; ending inside any object with no movement
left, or ending the turn there, is fatal. Original base cards/items/quests only;
no expansion/remake/fan content. Trap/secret-door searches, gold/equipment trading, throwing,
Chaos spells and campaign progression are still unfinished. Original treasure
searches and all four base treasure potions are implemented; see the current
limits in [treasure](docs/TREASURE.md).

[Code structure](docs/CODE-STRUCTURE.md), [plan](docs/PLAN.md),
[spell rules](docs/SPELLS.md), [combat](docs/COMBAT.md), [quest](docs/QUESTS.md),
[turn order](docs/RULES-TURN-ORDER.md), [saves](docs/SAVES.md) and
[model viewer](docs/MODEL-VIEWER.md) describe responsibilities and decisions.
Shared reusable components own camera motion, discovery-keyed terrain, control
locks, recorded dice, target selection and bounded effects. Display-only session
snapshots live in session/presentation.js; drawer layout lives in drawers.css. Geometry/textures,
wall layouts and unchanged portraits are cached; cutaway rays are reused across
walls. These are source-level optimisations, not benchmarked performance claims.

## Sources and review limits

Original rules/cards are source-linked in [content](docs/CONTENT.md). The supplied
40-STL collection's creator/exact licence remain unknown beyond Mark's open-licence
statement. Walls and weapons rack have their own notices. Preserve originals and
[model provenance](references/MODEL-SOURCES.md); no Free3D asset was used.
Paint recipes/previews/notices live beside their derivatives under assets/models.

Latest furniture/scenery painting has offline multi-angle authoring review.
Latest spell particles, sandbox/targeting/phasing, camera/lighting and cleanup have
source/diff review only. No new automated/browser checks, build, lint/typecheck or
performance benchmark were run; Mark is testing manually. Historical approved
checks and exact limits remain in the feature docs and do not verify this revision.

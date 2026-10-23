# Traps and secret doors

## Sources and scope

Original North American instruction booklet, local primary scan
`references/original-na/system-instruction-booklet.pdf`, visually read for this
implementation. Source locators live in data/dungeon.js:

| PDF page | Printed page / section |
| --- | --- |
| 8, rotated 180° | 17: Search for Secret Doors; Search for Traps |
| 7 | 18: Searching for Traps; Pit Traps |
| 6, rotated 180° | 19: pits, falling blocks, spears |
| 5 | 20: Chest/Furniture Traps; Jumping a Trap |
| 4, rotated 180° | 21: Disarm a Trap; Dwarf; monsters |

The original Armoury (identification-guide spread, PDF p1) is the authority for
the Tool Kit, 250 gold. Its carried card uses the same archived drathe artwork
presentation as starting weapons; it is not claimed to be an original card deck.
No shop or purchase action is added here. Practice supplies are sandbox-only.

The Trial still has no traps or secret doors. data/dungeon.js defines its empty
layout and an explicitly invented practice layout on the existing board. Future
quests need source-transcribed placements and furniture damage, not these
practice positions. The practice chest inflicts one Body for demonstration.

## Actions and discovery

Search for traps and Search for secret doors are separate actions. They and
Search for treasure live only in the sidebar Search menu; clicked-object panels
offer actions specific to their target, including disarming found traps.
A single sidebar Search button opens
a compact native modal with Treasure, Traps and Secret doors. Each choice shows
its own eligibility reason; animation/roll/picker locks apply to the opener. The searching hero must be in play, on safe ground,
have an unused action and see no living monster. Searches cover
the current room; corridor searches cover its visible straight portion, without
looking around corners or through closed doors. A sprung pit is a separate
search area. Searching after moving ends remaining movement; searching first
still permits movement afterwards.

Trap searches point out unsprung floor/furniture traps without springing them.
The original rules give clues to their type: a dangerous-looking ceiling for
falling blocks, rather than placing a sprung trap tile when it is found.
A large red warning triangle on the floor, inside a red inset square border,
is the digital equivalent of Zargon pointing to a square, not a physical pit tile.
Its artwork is shared with the smaller trapped-furniture warning. Secret doors remain ordinary, noninteractive tall
masonry until searched for. Search reveals an obviously darker closed stone panel; opening from
an adjacent square is free, reveals beyond and is permanent. It slides aside
using the existing stone sculpt, clipping/capping and lighting barriers. No
original secret-door tile marker is shown, at Mark’s request. Masonry sections
reserve the panel internally from initial layout, keeping neighbouring geometry,
colour seeds, join ownership and cutaway grouping stable when it is found.
A white inset rectangle sits on each face of the discovered closed panel.
These unlit mesh strips use ordinary depth testing, so foreground scenery and
miniatures obscure them. Their top follows the current cutaway height; blue/yellow
hover keeps its existing silhouette overlay. Both white rectangles disappear as
soon as opening begins; when the stone panel finishes sliding, it is
hidden and no longer selectable. Refreshing an open passage shows no panel.
Opening a secret door retains the current camera framing: no action-camera shot
or newly revealed area pan. A move into reach completes its normal camera return
before opening the panel.
Geometry stays cached for practice resets; opening/topology remains saved.
Genie can also target a discovered secret door.

Discovered furniture traps show a camera-facing red warning triangle above the
affected chest or furniture, with a Trapped note in its action panel. The marker
uses normal depth testing and disappears when the trap is disarmed or sprung.

Normal route previews consult only revealed trap records. They may stop at a
known trap but never disclose a hidden trap by detouring or shortening a route.
MOVE resolves squares in order and pauses at a trap even if a distant destination
was requested. Heroes spring traps; monsters do not spring hidden traps.

## Consequences

- Pit: lose one Body, end the turn and leave a permanent hole. Move out normally
  on a later turn. Entering the open pit again loses one Body and ends the turn.
  Attack and defence in a pit lose one die, minimum one (Sleep still prevents
  defence). Monsters can pass a pit in two movement steps without a jump roll;
  entering it causes them no damage. Treasure searches use a per-hero pit ledger.
- Spear: one combat die; a skull loses one Body and ends the turn. A shield
  dodges and permits remaining movement. The spear is spent after triggering;
  there is no persistent spear tile. After the roll, a cached spear thrusts up
  through the floor beside the hero's feet, pauses and retracts. Damage numbers
  and recoil begin at contact; a dodge still shows the spear firing. Successful
  disarming does not fire it. Reduced motion skips the thrust animation.
- Falling block: three combat dice, one Body per skull, no defence. The square
  becomes permanent tall stone, blocks movement/sight/light and follows cutaway.
  A survivor must choose the empty square ahead or behind; this is a pending
  board decision, not an automatic route. The turn then ends. With no escape the
  hero is trapped. Potion recovery is offered before a lethal casualty is removed.
  Move clear opens the board picker with the outcome panel hidden until a square
  is picked or selection is cancelled. Legal escape squares remain selectable on
  unrevealed floor without previewing its contents. The fallen block adds independent scenery;
  it does not remove or repartition the surrounding masonry.
- Furniture: a room treasure search springs an undisarmed trap before any card
  or treasure reward. Damage comes from its placement; the practice chest uses
  one Body. The trap is spent, and a later search may obtain the room's treasure.

Disarm is an action declared before entering a found, unsprung floor trap;
entering costs one move. The context can walk the hero into reach first, reserving
that step, then waits for the manual roll. Disarm on a later turn than discovery.
The Dwarf succeeds on anything except a black shield; a hero carrying a Tool Kit
succeeds on either shield. Failure springs the trap. Success removes it and
allows remaining movement, the explicit disarming exception to move–act timing.
Sprung pits/falling blocks cannot be disarmed. Furniture disarming is room-scoped,
as its printed search rule specifies a room/furniture search rather than an
occupied furniture square. It consumes the action without entering furniture.

Jump over uses two moves, selects an unoccupied adjacent landing beyond the
chosen square (including a perpendicular route), then waits for Roll. Either
shield succeeds; a skull lands on the trap, springs it and ends the turn. A
follow-up spear/block damage roll waits for another manual Roll. Players may
also jump an ordinary adjacent square, so a suspected trap does not require
searching first or leak its existence. A short jump onto clear floor spends the
two moves but causes no trap consequence; the printed trap failure has no trap
to spring in that case. A trapped landing resolves only on arrival.

## State and presentation

Schema 8 adds dungeon `{layout,traps}` with stable placement IDs, hidden/found/
sprung/disarmed statuses and discovery round/turn. Schema 2–7 saves migrate to
an empty Trial layout without altering RNG, cards, health, reports or positions.
Practice layouts cannot load/import into the adventure slot. Discovered/open
secret IDs use the existing door fields. Pit search IDs extend the Treasure
ledger without resetting its physical deck. Tool Kit ownership is validated.

SEARCH_TRAPS, SEARCH_SECRET_DOORS, JUMP_TRAP, DISARM_TRAP and
ESCAPE_FALLING_BLOCK resolve through the ordinary engine boundary. Reports save
all combat-die groups and damage before presentation. The trap dice stage stores
its group index/rolled flag. Refresh restores the recorded group or the pending
move-clear choice without rerolling or replaying a jump. Cancellation before a
roll spends nothing; a move into reach has already happened and remains saved.

Permanent pits mask floor instances, use the original printed pit artwork at
the bottom, and lower the displayed miniature slightly;
rendered geometry is not gameplay authority. Jumps use a longer whole-piece hop.
Falling blocks reuse solid blocked scenery, wall occlusion and light masking,
with the original falling-block tile artwork on the full top or lowered cap.
Transient travel, shaders and picker state remain outside saves.

## Manual review

Sandbox tools → Exploration practice → choose a scenario → Prepare exploration
scenario → Return to play. The chosen hero has twelve movement ready, no live
monsters and a practice Tool Kit unless they are the Dwarf. Other trap types are
inactive. For secret-door practice, the neighbouring room remains unrevealed.

Check search/action eligibility, search then later-turn disarm, either jump
result, spear dodge/hit, persistent pit/penalty/exit, falling-block direction
choice, trapped furniture before treasure and secret-door opening/reveal. Reset
turn / switch hero and Give 12 movement support subsequent attempts; Prepare
exploration scenario starts fresh. Refresh during each dice group and the
move-clear choice, and export/import the practice save if desired. Add/revive an
opponent to check search blocking and pit combat penalties.

Source and focused diff review only. No engine tests, builds, lint/typechecks,
browser automation, screenshots or gameplay/performance pass ran. Mark retains
manual play testing. This is not a claim that all future quest trap exceptions,
trapped doors or campaign mechanics have been implemented.

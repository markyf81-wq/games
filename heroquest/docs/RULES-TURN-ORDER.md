# Original base-game turn and occupancy check — 2026-10-22

Source: original North American Game System instruction booklet,
`references/original-na/system-instruction-booklet.pdf`, from
https://north-american.yeoldeinn.com/downloads/system/system-instruction-booklet.pdf.
Scanned pages were rendered and read visually, not inferred from the remake.

| Topic | Original printed rule / locator | Current implementation |
| --- | --- | --- |
| Hero order | Printed p12 (PDF p12, rotate 180°): heroes act in seating order, then Zargon. The Barbarian/Dwarf/Elf/Wizard arrangement is a suggestion. | Digital selected heroes cycle Barbarian/Dwarf/Elf/Wizard, then CPU. |
| Movement/action order | Printed p12, On A Hero’s Turn: move then act, or act then move; never split a move around an action. | Attack/cast consumes the one action. If paid movement already began, remaining movement closes; acting first leaves movement available. |
| Movement amount | Printed p12: two red dice, up to that distance; full distance is optional. | Manual movement roll, remaining budget and explicit End turn. Swift Wind is its card-specific exception. |
| Six actions | Printed pp12–13: attack, cast, treasure search, secret-door search, trap search or trap disarm. | Attack/cast available; searches/disarm still unfinished. No invented extra action. |
| Attack | Printed p13: one attack against an adjacent monster (weapon exceptions apply). | One melee attack with current starting weapons. Attack alone does not automatically advance the turn; acting before moving permits movement. |
| Door/looking | Printed p13 (PDF p12 rotated): looking/opening doors are additional free interactions; opened doors stay open. | Does not consume action or movement; context may first walk into reach with normal movement. |
| Other free interactions | Printed p13: traps triggering, drinking potions and picking up things are not actions. | Hazards/potions/possessions are not yet implemented; no claim of support. |
| Hero passage | Printed pp12–13: may pass heroes, not monsters; cannot share a final square, with stair/pit exceptions. | Friendly transit permitted, ordinary occupied endpoints rejected; shared stairway is separately approved. Veil/rock are spell/ruling exceptions. |
| Monster passage | Printed p21 (PDF p4, rotate 180°): monsters move like heroes; prohibited list includes passing heroes and sharing a square. | Friendly-monster transit is permitted by the like-heroes rule; enemy heroes block. This is a contextual reading, not an explicit standalone sentence saying pass other monsters. AI/engine already implement it. |
| Monster turn | Printed p21: after all heroes, each monster may move then act, or act then move; cannot split movement around an action. | CPU currently chooses move then attack, one activation per revealed living monster. Choosing that legal order is AI policy. |
| Monster attack | Printed p22 (PDF p3 upright): one attack per turn; immediate defence does not grant retaliation. | Recorded attack/defence once; no immediate counterattack. |

The source/code review found no turn-order or friendly-passage change required.
No engine/save/browser checks ran; Mark chose manual testing. The printed rules
do not override his separately approved digital shared-stair/phasing choices.

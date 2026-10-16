# Fateless Kingdoms

## Purpose and runtime

A standalone, browser-local card game for one human versus a CPU. Open `index.html` in Chrome directly, or serve the parent games repository with a static server. No installation, build, CDN, account, paid AI or network API is needed. Use ordinary deferred scripts, not modules or fetched JSON, to preserve direct-file support.

## Files

- `index.html`: table, scoreboard, hand, inspector and native dialogs.
- `styles.css`: isolated dark green/gold presentation, desktop table fitting, narrow-screen layouts and reduced motion.
- `cards.js`: all 62 printed cards, names, base powers, ability text and local artwork paths.
- `engine.js`: state transitions, legal target prompts, scoring, protection, CPU action enumeration and save validation.
- `cpu.js`: three search budgets; sampled unknown hands, forward simulation and card-conservation evaluation. It is sampled lookahead, not full MCTS or a trained model. See `AI_NOTES.md`.
- `cpu-worker.js`: optional background search when served over HTTP. Direct-file mode uses a yielding main-thread fallback.
- `game.js`: DOM rendering, choices, dialogs, lobby/coin flip, turn scheduling, worker fallback and persistence.
- `effects.js`: detached card flights, destruction burns and event cues; cancel overlays on a new match and respect reduced motion.
- `audio.js`: browser-generated music and sound effects, user gesture activation and separately saved audio settings.
- `assets/cards/`: 62 compact progressive JPEG exports of Mark's PSDs. Originals remain in `~/Downloads/3-version3/` and must not be overwritten.
- `RULES.md`: snapshot of the Google Doc after printed-card corrections. Source: https://docs.google.com/document/d/1_rJXssMNrrnKWMbWg0otcn4MHUxq_NDlfLKYHsIC2Lc/edit

## Controls

Click a hand card, choose any required targets, then Play. Click board cards to inspect; click the inspector artwork to enlarge. Pass opens a confirmation dialog. In-game descriptions use player-facing ability wording; keep physical-artwork provenance in documentation only. Hand cards overlap and lift on hover/focus; their printed artwork supplies the power number, while battlefield cards retain live power badges. Escape cancels selection. Required row, tied-target, recovery and multi-card choices open a native modal. Choices remain a draft until Play; Cancel or Escape abandons the whole play without changing match state. Multiple picks use Confirm targets, and the final review has Choose again. Keep the modal footer reachable while its options scroll. Searchable card collection, destroyed piles and How to play use native dialogs. Begin game opens a coin flip to choose the first starter; Start round begins play. A saved match offers Resume, with no CPU turns before that choice. New match asks before replacing an active save. Click either destroyed deck beside the field to browse/search it without losing a selected play. Shared weather artwork appears between the kingdoms; active row effects animate behind cards. Audio controls toggle music/effects and set their volumes. The page fits the window without page or card-lane scrollbars. Preserve the 980px breakpoint: desktop sidebar at right, compact inspector/chronicle below on narrower portrait screens. Desktop battlefields place the kingdoms side by side around a shared Omen column, giving three tall rows per side. Narrow portrait battlefields stay vertically opposed. Short landscape windows from 700–980px wide use a right sidebar and three row columns per kingdom to keep cards usable. Dialog content may scroll. ResizeObserver recalculates hand overlap and battlefield card sizes. Constrain the battle-area grid row and pile-rail tracks with `minmax(0,1fr)` so their intrinsic contents cannot expand under the hand. The rival hand is a fan of card backs rendered from its public count only; never put hidden card IDs/names/artwork in that DOM. The scoreboard shows all three round outcomes and scores, including draws, throughout the match. Every played card flies to a viewport-centred enlarged reveal for two seconds, wobbles around its centre, then flies to its row, weather strip or shared deck. Rectangle visibility must derive right/bottom from left/top plus width/height, since synthetic card rectangles have no right/bottom properties. Reduced motion keeps the static reveal without wobble or flights. Coin faces use short Heads/Tails labels.

## Rules and invariants

- Printed artwork always wins over conflicting text. Preserve extra rulings only where print leaves a detail open.
- One shared deck, exactly one of each of 62 cards; 15 initial cards each. Maintain unique card IDs and conservation across deck, hands, fields, weather and destroyed piles.
- Mechanical Men, Assassin and The Spy all have Infiltration.
- Printed Accuracy includes Target itself. Printed Shielded includes Stone Wall itself. Printed Sacrifice destroys one friendly unit and returns up to two destroyed units to hand; it never deploys a replacement or triggers returned units.
- Combat/Ranged/Siege row types are enforced. Dread blocks new cards entering its row, including both directions of a Convert swap. Convert movement does not replay abilities.
- Spell immunity includes friendly Spells. Shielded prevents destruction, not Decoy returning a unit. Resolve destruction protection simultaneously before removing any Omens. Round cleanup clears protected cards too.
- Weather sets affected unit power to 1; War Chant then adds 2. Ironward blocks both harmful and beneficial Omens. Dynamic abilities recalculate from the field.
- Pridefall and Weakest Link ignore protected units. Pridefall removes all eligible highest ties; Weakest Link removes at most three per side with selectable cutoff ties. Death Gaze and Convert choose one tied target.
- Spells go to the bottom of the shared deck after resolution. Row cards belong to their current field; middle weather goes to its original player's destroyed pile.
- Passing ends that player's participation for the round. Both pass to resolve. Ties award both a win; both reaching two draws the match. Starter alternates. No between-round draw.
- Round-end fields remain visible for review until Next round. This presentation pause allows no further moves before cleanup.
- The CPU must receive `engine.publicView`, not the real opposing hand or deck order. Publicly recovered cards are tracked in `knownHands`; that is legitimate observed knowledge.
- Chronicle messages must not identify cards drawn or recovered into the CPU hand. CPU gain animations use card backs.
- Both the outer layout and inner table grid must constrain their columns with `minmax(0,1fr)` so the hand cannot push the battlefield under the sidebar. The sidebar stacks below the table at 980px.
- UI and CPU must use the same `prompt`/`play` engine. CPU enumeration caps alternatives for performance; human choice prompts retain every legal target.

## Persistence and audio

`fateless-kingdoms.match.v1` stores `{ state, level }` in localStorage. State version 1 uses rules fingerprint `printed-v1`. It includes players' hands/rows/graves/wins/pass flags, shared deck, middle weather with owners, public known-hand cards, starter, round, phase, results and bounded history. Validate before restoring; blocked storage falls back to in-memory play. Old saves without optional `knownHands` start tracking future revealed cards. `fateless-kingdoms.audio.v1` separately stores `{ music, effects, musicVolume, effectsVolume }`; music defaults off and effects on. Web Audio generates all sounds locally, starts after a gesture, and suspends while the tab is hidden. `game.js` blocks further plays until the reveal and transition finish. Compute the legal next state before the reveal, apply/save it after the reveal, and guard both stages with the presentation token so New match cannot resurrect a cancelled play. Keep `vh` fallbacks before `dvh` for older Chrome; old OS/browser compatibility has not been verified on actual legacy hardware.

## Verification

Follow Mark's approval requirement for verification. Do not add permanent tests or run repeated checks by default. The initial build was approved for focused card-rule/CPU diagnostics and a Chrome play-through. The choice-modal/reveal/round-tracker/rival-hand/window-fitting update also received approval for focused Chrome checks; this is not blanket approval for future verification. Scratch verification belongs outside this repo. No commits, pushes, merges or worktrees without exact authorization. Keep all changes isolated from other games and storage keys.

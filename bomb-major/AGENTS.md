# Bomb Major — agent guide

Read `../AGENTS.md` as well. This guide describes Bomb Major's actual imported implementation, which is independent of Type & Tails.

## Purpose, files, and runtime

A click-to-survive arcade game in a softly illustrated garden courtyard, with a cream/sage/terracotta/gold presentation that matches Type & Tails. Players move humans and a rare cat away from a chasing bomb, direct a bouncing block to freeze the bomb, and collect coins to add humans.

- `index.html`: arena markup, scoreboard, sound toggle, status/results, initial human SVG, cat/magnet/explosion templates, illustrated bomb and freeze meter, game-over overlay, and library return link. Keep its selectors and IDs compatible with the script.
- `styles.css`: arena/entity sizes, layer order, character/cat visuals, freeze/coin/magnet states, explosion animation, overlay, and library navigation.
- `game.js`: classic deferred script with DOM references, a `sound` closure, tuning constants/state, positioning/collision functions, drops/coins/characters, frame loop, and event listeners. It was extracted from the original single HTML without altering the gameplay statements.
- `assets/courtyard.svg`: code-native background artwork with a lawn texture, stone border, small flowers and planting. It is visual decoration, with no obstacle collisions. CSS loads it locally; no fetch or server is needed.
- `README.md`: player-facing controls and mechanics.
- `../previews/bomb-major.svg`: static library thumbnail reusing this game's human/cat/bomb SVGs and courtyard palette. Keep its art and the Bomb Major `games.js` catalog entry aligned with the game.

Open `index.html` directly in Google Chrome, or enter from `../index.html`. There are no packages, network calls, builds, or downloaded audio assets. Keep the script deferred so all elements and templates exist before initialization. Keep the library link pointing to `../index.html`.

## Controls and game flow

`reset()` creates one human, positions the bomb and block, clears round state, and waits for a click. Clicking a human, cat, or block starts the simulation; the One more try button (`.restart`) resets to that waiting state and focuses the first human.

- Human/cat click: `jumpCharacter()` finds a safe random location, nudges characters apart, increments successful jumps, adds bomb speed, shortens current/future freeze time, and collects any touched coins. A cat click also sets `targetedCat`.
- Block click: aim its velocity toward the bomb at its existing speed. It shows Clicked! for one second. It continues bouncing off arena walls.
- Magnet click: mark every currently existing coin as attracted. They move toward the block and can only be collected by the block while attracted. This does not affect future drops.
- Sound toggle: mute/unmute both effects and music.
- Human collision: remove that human and show an explosion. Cat collision: make the cat run off-screen, drop five coins, and reset extra bomb speed. The game ends when no humans remain, even if a cat is present; show results after 650ms and focus One more try.

There are no arrow-key movement controls or explicit pause button. Interactive entities are buttons, so keyboard focus and button activation work. Page visibility resets frame delta and suspends audio; preserve that behavior rather than documenting Type & Tails' Escape pause as a Bomb Major control.

## Tuning constants and invariants

Entity sizes: character/bomb 64px, block 96px, coin 24px, magnet 40px. CSS and JavaScript sizes must agree.

- Base bomb speed: 48px/s; each successful jump adds 4px/s until reset or cat escape.
- Catch distance: 42px measured between character/bomb stored positions.
- Freeze time: starts at 5s and decreases by 0.1s per jump, with a 0.5s floor. A currently active freeze also loses the jump's duration reduction. Block/bomb contact does not refresh an already-active freeze.
- Initial block velocity: 180px/s horizontally and 140px/s vertically.
- Timed drops: one attempt per second. Maximum active coins: 20.
- A roll below 0.1 attempts a magnet if no magnet exists. Rolls from 0.1 to 0.15 attempt a cat if none is present or escaping. Otherwise attempt a coin. Keep drop positioning checks and the distinction between probability rolls and guaranteed successful placement.
- Every ten **round** coins adds a pending human. Saved lifetime coins do not count toward the current round's milestones.
- Attracted coins move at 900px/s. The frame loop uses movement substeps of roughly at most 4px to prevent fast objects tunnelling through collisions.
- `findCharacterPosition()` tries random positions and a systematic fallback; `findCharacterPositionWithRoom()` can expand the arena to make room. Do not replace a failed safe-placement search with overlapping spawns. Retry pending humans while playing.
- `chooseBombTarget()` prioritizes a clicked live cat, otherwise picks the nearest character. `releaseCat()` frees coin slots as needed so its five drops fit within the 20-coin limit. Cat escape resets speed boost; it does not reset the jump count or resulting freeze difficulty.
- Resize must clamp entities/coins/magnet to bounds, resolve block/bomb overlap, and separate characters.

`chase()` uses requestAnimationFrame, caps delta at 0.05 seconds, handles drops and pending humans, substeps movement/collisions/collection, and redraws. Keep a single frame chain; reset cancels the frame and clears delayed game-over/block state. Keep explosion and fleeing-cat cleanup.

## Visual design and rendering

The page uses the same warm paper (`#f7f4ec`), sage ink, serif headings, small letter-spaced labels, rounded cards, and restrained gold/terracotta accents as Type & Tails. Bomb Major remains independent; do not import the typing game's styles or script. The arena has a score strip above and a status strip below; instructions, cat advice and magnet advice sit alongside it, then stack on narrow screens. Every existing game element ID/class used by the script must stay available.

All artwork is local SVG/CSS. Human templates use rounded shapes, warm faces and five muted shirt colors. `addCharacter()` colors the first rectangle in the human SVG, so keep that rectangle as the shirt if adding detail. The cat matches Pip's ginger/cream coloring. The bomb is an explicit illustrated SVG rather than an OS-dependent emoji; `.frozen .bomb-shell` turns it blue and hides the fuse spark while the freeze meter is visible. Block states use sage (normal), terracotta (clicked), and a gold outline (magnet). Gold star coins replace dollar-sign coins. `showExplosion()` clones the starburst SVG from `explosionTemplate`; preserve `.explosion`'s 650ms animation and `animationend` cleanup.

Keep collision dimensions fixed at 64/96/24/40px. Positioning transforms belong to the outer entity elements and are written by `draw()`; do not add CSS transforms or generic button movement that overrides them. Character hover lifts only its inner SVG. The cat's escape transition still belongs to `.cat-running`. Decorative background borders and plants are painted behind entities and do not block movement. Keep art quiet enough that coins, characters, bomb, and block remain distinct. Respect reduced-motion preferences without preventing animation cleanup.

## Saves and audio

`bomb-major-coins` stores a nonnegative safe integer as a string. `bomb-major-sound` stores `on` or `off`, with sound enabled by default. Preserve both keys for compatible saves. Coin collection saves immediately; reset only clears current-round totals. Storage errors display the save-unavailable message and retain session play. Origin changes expose separate browser storage; do not promise automatic transfer between hosts or clear saved coins during edits.

The `sound` closure builds Web Audio oscillators, filtered noise, envelopes, gain/compressor routing, effect cooldowns, and an original four-bar background loop. `unlock()` creates/resumes audio only on a user gesture. `music()` follows running/game-over state; mute and visibility changes stop/suspend scheduling. Sources are tracked and disconnected on completion. Reset must stop old voices/music without duplicating intervals. No audio files are needed.

## Editing and verification

Keep game changes scoped to this directory and its catalog/thumbnail entry. Update this guide and README when controls, constants, persistence, or files change. Read the root Git/testing rules: no automatic tests, builds, lint, browser automation, or screenshots; source review is normal. No test suite currently exists.

If Mark requests a focused browser check, relevant migration checks are deferred initialization, start/jump/block interactions, coin/magnet/cat behaviors, ten-coin human milestones, freeze/restart, audio toggle and tab visibility, saved coins after reload, resize, and library navigation. Run only the approved scope and report checks actually performed.

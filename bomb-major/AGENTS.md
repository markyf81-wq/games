# Bomb Major — agent guide

Read `../AGENTS.md` as well. Keep this game independent of Type & Tails, including its scripts, styles and saves.

## Purpose and files

A click-to-survive arcade game in a softly illustrated garden courtyard. Humans dodge a chasing bomb; a bouncing block freezes it, collects coins and throws cow poop. Cats, cows and clickable drops help players survive. A permanent marketplace opens between attempts. Rounds still end only when no humans remain; there are no timed waves or coin-based level endings.

- `index.html`: score/effect strips, arena, human/cat/magnet/explosion SVG templates, bomb, tether SVG, game-over overlay, field guide and marketplace dialog.
- `content.js`: `window.BombContent`; SVG icons/cow, four human models, shop tier prices and effect descriptions.
- `scores.js`: `window.BombScores`; validates/stores/renders the browser-local top ten survival records. Load before game.
- `marketplace.js`: `window.BombMarket`; validated upgrade/book/wallet save, marketplace rendering and purchase callbacks. Load after content and before game.
- `game.js`: original Web Audio closure, positioning/collisions, frame loop, spawns, cow/poop, timed powers, book movement, rendering, market integration and event wiring.
- `styles.css`: entity hitbox dimensions, state styling, layout, responsive marketplace and reduced-motion rules.
- `assets/courtyard.svg`: local decorative background, with no obstacle collisions.
- `README.md`: player controls and feature details.
- `../previews/bomb-major.svg`: library thumbnail; `../games.js` contains this game's catalog record.

Open `index.html` directly in Google Chrome or enter from `../index.html`. No builds, packages, network calls or audio downloads are required. Keep classic deferred scripts in the order `content.js`, `marketplace.js`, `scores.js`, `game.js`; they must work with `file://`. Preserve the library return link.

## Round flow and controls

`reset()` cancels the animation frame and delayed game-over/block text changes, cleans up temporary entities/effects, resets round counters, applies purchased block speed and creates one randomly styled human. It waits for a human or block click. Restart returns to this waiting state and focuses the human. Coins, book and upgrades persist.

- Human/cat click: find a safe random location, increment jumps, increase bomb speed and shorten freeze time only if relocation succeeds. The safe search excludes the block, cow, other characters and the current Safe jump radius around the bomb. If no position is available, refuse the jump rather than weaken the radius or overlap entities. A clicked cat becomes the preferred bomb target.
- Block click: aim its existing velocity toward the bomb. It bounces off arena walls. Block/bomb contact freezes the bomb unless it is tethered.
- Magnet: click to attract only the coins currently in the arena toward the block. Only the block collects attracted coins; future coins are unaffected.
- Shield: click to arm one global human-saving charge. The next human hit consumes it, safely relocates that human if possible and gives that human 1.5 seconds of collision protection. It does not give one charge to every human. Cats escape normally; the shield is reserved for humans. The HUD and human outlines show the shared charge.
- Banana peel: click to make the bomb travel two complete 14px-radius circles over 1.2 active seconds. `startBananaSpin()` selects a bounded center/phase; `moveBanana()` controls position in the simulation, not just a cosmetic CSS wobble. It can still hit characters while circling. Inner SVG rotation follows the same two turns; reduced motion hides the decorative rotation but preserves gameplay movement.
- String: click to tether the bomb to the block for 10 seconds. The center-to-center distance cannot exceed 100px; the moving block drags it. It can still kill humans or catch cats while tethered; do not skip collision checks merely because a string is active. A visible line uses arena pixel coordinates. On expiry, resolve overlap with the block before normal movement resumes.
- Treadmill: click to accelerate the block continuously for 5, 7, 10, 14 or 20 seconds at tiers 1–5. Each active second adds 20% of its normal upgraded speed, reaching almost 2× at tier 1 and 5× at tier 5 before expiry. `setBlockBoost()` changes magnitude while preserving velocity direction; redirection and bounces continue to work. Expiry, round end and restart return it to normal Fast block-adjusted speed. Do not compound the multiplier each frame or discard permanent speed upgrades. A second treadmill cannot spawn while one is active.
- Cow: a separate wandering entity, never part of `characters` or `chooseBombTarget()`. It moves at 24px/s, changes direction every 3 seconds, and leaves its first poop batch after 6 seconds, then every 6 seconds. Batch size at tiers 1–5 is 1, 2, 3, 5 or 8 piles. It leaves if touched by the bomb, without ending the round or resetting speed. Clicking it only shows a message; it does not teleport or start a new round.
- Cow poop: up to 24 simultaneous 24px piles, each lasting 25 seconds. Block contact launches a homing pile that retargets the bomb center every physics substep and clamps movement without overshooting. `poopFlightSpeed()` is at least 280px/s and at least 1.25× the target’s chase/tether-drag speed so it can catch a fast bomb. Launched piles no longer expire or fly off the arena; they persist until a hit or reset, within the same 24-pile cap. Only stationary piles use the 25-second lifetime. Stationary and flying piles both affect the bomb on contact, consuming that pile and making it avoid characters harmlessly for 3, 4, 5, 7 or 10 seconds at cow tiers 1–5. `content.balance.cowRepelDuration` is shared by marketplace text and collision behavior. `poopHitsBomb()` also subtracts `content.balance.poopSpeedReduction` (1px/s) from `bombSpeedBoost`, clamped at zero; this removes half a teleport’s speed gain per hit before Slow bomb scaling. It must not lower base speed, change jump count or freeze difficulty, or clear the whole boost as the cat does. Hit handling is shared by stationary and flying piles. Repel refreshes with Math.max(existing, duration), never adds durations. Check contacts before deflection, after projectile movement, and after bomb/tether movement before character catches, so a same-step pile hit protects characters immediately. Every consumed pile applies speed reduction and repel only once. Remaining piles survive the cow's departure, but not a round reset.
- Sound toggle controls effects and music. Audio unlocks only from a user gesture.

A human collision normally removes that human and creates an SVG starburst. Cat collision makes the cat escape, drops five coins and resets extra bomb speed. The round ends when no humans remain, even if a cat/cow exists. Show results after 650ms, stop the frame/music, enable the marketplace and focus restart. Market access is available before the first click and after game over, never during an active round. Modal guards prevent starting underneath the shop.

There are no arrow keys or explicit pause control. Buttons support keyboard activation. Tab visibility suspends audio and resets frame delta. Do not document Type & Tails' Escape pause as a control here. Escape closes the native marketplace dialog.

## Permanent marketplace

Use the existing saved coin balance as a spendable purse. Buying never affects the round's coin milestones. The five permanent abilities and seven helpful drops all have five tiers, bought in order for **20, 80, 320, 1,280 and 5,000 coins**. `content.tiers` uses a fourfold price curve capped at 5,000 for the last tier. Benefits grow nonlinearly too: the tier 4→5 improvement must exceed tier 1→2. Keep the shared `content.balance` arrays authoritative for both card text and gameplay.

| Ability / save ID | Unpurchased baseline | Tiers 1–5 |
| --- | --- | --- |
| Slow bomb / `slowness` | 0% | 2%, 4%, 7%, 12%, 20% slower |
| Bomb freeze / `freeze` | 0.25s | 1s, 1.5s, 2.25s, 3.5s, 5s base duration |
| Fast block / `speed` | 0% | 5%, 7%, 10%, 15%, 25% faster |
| Safe jump / `awareness` | 44px | 50px, 70px, 110px, 180px, 300px radius |
| A little book of courage / `book` | No automatic movement | 1, 1.2, 1.6, 2.4 or 4px per 0.2s tick |

Freeze duration still loses 0.1s per jump, with a 0.1s floor. Slow bomb scales the whole speed including jump boosts. Block redirection preserves its current speed magnitude. Safe jump may expand a crowded/narrow arena with `findCharacterPositionWithRoom()` rather than silently reducing its radius; refuse a jump if no safe position remains after the bounded expansion attempts.

**Drop unlocks:** magnet, cat, cow, shield, banana, string and treadmill must be bought before they can spawn. Their save IDs match those names. Missing tiers load as zero/locked. Coins remain always available so players can earn the first purchase. Tier 1 unlocks that drop; each later tier improves it. Magnet/cat/shield/banana/string spawn-roll odds are 1%, 1.5%, 2.5%, 4.5% and 8%. The cow has a fixed 2% spawn roll after unlock; its tiers increase batch output to 1, 2, 3, 5 and 8 piles every 6 seconds and poop repel duration to 3, 4, 5, 7 and 10 seconds. The treadmill has a fixed 2% spawn roll after unlocking; its tiers increase duration to 5, 7, 10, 14 and 20 seconds. Higher tiers do not give extra shield charges, longer banana spins or longer string durations.

The book is a five-tier permanent ability, grouped with Slow bomb, Bomb freeze, Fast block and Safe jump, never in the drop section. It uses the same price curve and five-segment progress bar. Every 0.2 active seconds, each human attempts a step of 1, 1.2, 1.6, 2.4 or 4px at tiers 1–5 (5, 6, 8, 12 or 20px/s when unobstructed). Clamp to the arena and reject movement toward the bomb or through the block, cow or another character. Cats/cows do not receive book movement. Blocked humans stay put. Keep the 0.2-second accumulator. `content.balance.bookStep` drives both UI and movement. Legacy one-time book ownership migrates to tier 1 without another charge.

Human models are randomized independently on every spawn: explorer, gardener, scholar or astronaut. They are free with identical mechanics. There is no player model selector, model purchase or saved chosen model. Random selection must not change collision size. Existing humans retain their look when buying upgrades.

`marketplace.js` renders descriptions, affordability and a five-segment progress bar for each tiered ability. Keep the exact display names Slow bomb, Bomb freeze, Fast block and Safe jump; preserve their existing save IDs. Green segments indicate purchased tiers, a gold dashed segment marks the next tier, and later tiers stay pale. A Purchased N / 5 caption and progressbar ARIA values expose the same saved tier. All five permanent abilities and seven drop unlocks have five-segment bars; tier-zero drops show Locked and an Unlock tier 1 button. The book has the same progress bar as the other permanent abilities. Bars refresh immediately after buying and on opening the shop. `marketplace.js` renders descriptions and affordability and calls the game hooks for coin spending and redraw. Validate balance again at purchase time, cap all tiers at five, prevent buying beyond tier five and restore focus after replacing shop cards. Apply all upgrades/book together; there are no equipment slots. Prices/benefits live in `content.js`, formulas in `game.js`; update both and this guide if tuning them.

## Tuning, movement and effect interaction

Keep CSS/JS sizes aligned: human/cat/cow/bomb 64px, block 96px, coin/poop 24px, magnet/power drop 40px.

- Bomb baseline is 48px/s, plus 2px/s per successful teleport, then multiplied by the Slow bomb tier factor.
- Catch distance is 42px between stored top-left positions; do not mix center-distance checks into existing catches. String uses centers explicitly.
- Unpurchased freeze starts at 0.25 seconds; tier values are in `content.balance.freeze`. Each jump reduces duration by 0.1s, floor 0.1s. An active freeze also loses the jump's duration reduction. Contact does not refresh an existing freeze.
- Block starts at velocity (180,140) multiplied by its upgrade factor.
- One timed spawn attempt per second. Build cumulative weights from `content.drops`, `content.dropChance()` and the saved tier; tier-zero weights are exactly zero. Remaining probability spawns a coin. Existing same-type powers, cat/cow, or an armed shield cause that attempt to be skipped. Rolls do not guarantee safe placement. Only one magnet/cat/cow/drop of each type may exist.
- Coins cap at 20; each ten round coins adds a pending human. Coins in the purse from previous rounds do not count. Cat escape frees coin slots as needed to fit its five drops.
- Attracted coins move at 900px/s. `chase()` uses delta capped at 0.05s and movement substeps around 4px, accounting for bomb, avoidance speed, block, attracted coins and flying poop. Maintain a single RAF chain.
- New humans use randomized placement plus systematic fallback; crowded arenas may expand to make room. Never spawn overlaps as a fallback. Retry pending humans while playing.
- Treadmill acceleration updates before substep count selection, so fast block movement is included in collision subdivision. It uses the existing active-frame delta, with no extra interval or RAF chain. HUD shows remaining seconds and speed multiplier; the block has a dashed ring while boosted. Temporary speed combines with permanent Fast block and the tether.
- Banana movement has priority, with a simultaneous string constraint applied afterward; otherwise string drag, then poop avoidance, then ordinary freeze/chase. Timers run concurrently during active simulation. Only poop repel skips character catches. String and banana do not grant invulnerability: shield consumption, deaths and cat escapes still happen. Cow contact is independent. On expiry, normal chasing returns; resolve block overlap when a spin/string ends.
- Avoidance picks a point with a large minimum distance from characters, refreshing every .3s. Movement stays in the arena and avoids the block. It is temporary, not a speed reset.
- Resize clamps all entity types and redraws the tether; resolve bomb/block overlap and separate characters. Reset removes cow, all poop/projectiles/drops, shield charge, invulnerability, and temporary timers; permanent upgrades survive.

## Saves

`bomb-major-market-v1` stores `{wallet, book, upgrades: {slowness, freeze, speed, awareness, book, magnet, cat, cow, shield, banana, string, treadmill}}`. Validate wallet as a nonnegative safe integer, the legacy book field as boolean and each tier as an integer 0–5. Unknown fields are ignored. Existing purchased tiers, book ownership and wallet are retained during rebalancing; newly introduced drop tier fields (including treadmill) default to zero/locked. Keep these save IDs stable even when changing display names. When no valid new wallet exists, initialize it from the legacy `bomb-major-coins` string; never clear old progress. The new combined record is authoritative after it exists. If `upgrades.book` is missing and legacy `book` is true, give book tier 1. A valid `upgrades.book` value is authoritative, and saves mirror its ownership to the legacy boolean. Never reapply the migration over an existing tier or charge again.

Purchases mutate ownership before the game deducts coins and calls `updateWallet()`, so ownership and the resulting balance are written atomically in the same localStorage value. `game.js` mirrors a successful balance write to `bomb-major-coins` for older game versions; failed primary writes do not update the mirror. Coin collection also saves immediately. Save failures retain session play/purchases and show a limitation. Reload may lose unsaved changes. Browser saves belong to their origin.

`bomb-major-sound` remains `on`/`off`, enabled by default. Keep its key stable. Active rounds, drops and timers are not persisted.

## Art and audio

Keep the warm paper, sage ink, serif headings, small labels and rounded cards aligned with Type & Tails while keeping code isolated. All new power/cow/model art lives in `content.js`; room/background art stays local. The bomb is a consistent SVG rather than an OS emoji. Its freeze, slipping, tether and repel states have distinct styling. The effect strip shows one-hit shield, active durations and banana turns remaining. Unpurchased drops do not appear on the field.

The arena uses the full content width in a page up to 1660px, with height clamp(500px,75vh,900px); on small screens height is clamp(480px,75vh,700px). Field guide/cat/magnet panels sit below the arena, followed by local scores. Keep entity hitboxes independent of this layout.

Positioning transforms belong to outer entity elements and are written by `draw()`; decorative animations target inner SVGs. Do not overwrite movement transforms. Preserve explosion `animationend` cleanup and the cat escape transition. Background edging/plants are decorative, not obstacles. Respect reduced-motion preferences.

The existing `sound` closure synthesizes effects and a four-bar music loop. It tracks/disconnects voices, uses effect cooldowns, and suspends scheduling while hidden/muted. Reset must stop previous sounds/music without duplicate intervals. No external media or services are needed.

## Local high scores and verification

Mark explicitly requested a local scoreboard after deferring the shared online leaderboard. `scores.js` stores `bomb-major-scores-v1` as an array of up to ten records `{seconds, coins, jumps, date}`. Validate finite nonnegative survival time, nonnegative safe integer counters and a valid numeric date. Keep survival times at tenths of a second. Rank by survival time descending, then round coins, then jumps, then recent date. Record once when the last human is lost, before displaying results. Restart never clears these records or records an unfinished attempt. Render only via DOM nodes/textContent. Show an empty state and session-only warning on storage failure; do not prevent restarting if saving is unavailable. Dates use browser locale; table clearly says this browser. Results link to the scores section. Shared online scores remain deferred; no database, accounts or network requests are needed.

Follow root testing/Git rules: source/diff review is normal. Do not automatically run builds, lint, typechecks, browser automation, screenshots or tests. No test files were added for this feature expansion. Do not claim browser verification unless it happened. A focused check, if approved, should cover startup/restart; shop purchase/reload and legacy coin migration; upgrade limits and legacy book tier migration; local-score ordering/persistence; larger-arena layout; random human models; cow departure, stationary/flying homing poop contact, gradual speed reduction and tier-scaled repel; shield one-hit consumption; treadmill acceleration, expiry and upgraded speed restoration; banana/string timing, 100px constraint and overlaps; simultaneous effects; cleanup; narrow screens; original cat/magnet behavior and audio.

# Type & Tails — agent guide

Read the root `../AGENTS.md` as well. This guide describes this game's implementation; do not apply its mechanics to other games.

## Purpose and files

A cozy typing game set in Pip the cat's room. Players type practice words, complete rounds at WPM targets to unlock difficulties, and spend earned coins on pet outfits and room decorations.

- `index.html`: page layout, inline SVG room and pet, typing input, level menu, stats, shop/results/pause/help dialogs, and the library return link. Element IDs are the interface used by the JavaScript.
- `styles.css`: responsive game styling, room and pet animations, reduced-motion support, and library return link styling.
- `game.js`: one strict-mode IIFE containing game data, save loading, audio, timer/input logic, reactions, shop, and DOM event wiring.
- `README.txt`: player-facing instructions and unlock tiers.
- `../previews/type-tails.svg`: static library thumbnail derived from the default room SVG. Update it when the room's default art changes significantly.

Open `index.html` directly in Google Chrome, or enter from the library at `../index.html`. No build tools or downloads are required. Keep relative asset paths and conventional browser scripts.

## Mechanics and controls

- `LEVELS` defines eight difficulties. Unlock Explorer by completing Beginner at 12 WPM, Adventurer by completing Explorer at 18 WPM, Wordsmith by completing Adventurer at 22 WPM, Trailblazer by completing Wordsmith at 26 WPM, Expert by completing Trailblazer at 30 WPM, Master by completing Expert at 35 WPM, and Legend by completing Master at 40 WPM. The `unlockWpm` value belongs to the level being unlocked. Lifetime XP/coins never unlock further levels.
- Each difficulty combines two expanded focus groups (`lessons`) into a deduplicated `wordPool`. `PRACTICE_LETTERS` builds the cumulative allowed QWERTY letters; words containing unlearned letters are excluded. `selectRoundWords()` copies the pool, performs a Fisher–Yates shuffle, and takes exactly 20 distinct words. Every new round, including replay after an early exit, gets a fresh random selection and order. Never restore fixed word order or select from only one small focus group. Home-row keys come first, then E/R/U/I, T/O/P, Q/W/Y, C/V/B/N/M, Z/X, common TH/SH/CH/ST patterns, and everyday word endings. Pool sizes are currently 53, 118, 117, 123, 125, 108, 165, and 114 in level order. Every level must retain at least 20 eligible unique words. Keep the eight level indices stable for existing saves.
- `start-footnote` must exist in the HTML: `setPlaying()` updates it. A missing ID previously threw before `showWord()` and prevented the word/timer from starting. `showWord()` displays the first target and uses `focusTypingInput(true)` to focus/select the cleared input; round start repeats focus on the next animation frame to handle dialog focus restoration. Keep synchronous focus for mobile keyboards.
- Level selection happens before a round. Locked options display their thresholds. Any unlocked level can be replayed. Do not force players to play their highest tier.
- The per-word countdown is 14 seconds at Beginner and falls to 10 at Master/Legend. This is not a single timer for the whole round.
- `handleTyping()` compares the input case-insensitively to the displayed word. A match submits automatically; Enter is unnecessary. Backspace corrects mistakes. Paste/drop is blocked to keep speed rewards based on typing. Preserve composition handling for text input.
- Correct words earn the level's 40–100 base points, a speed bonus up to 80, and a streak bonus increasing by five per additional consecutive word up to 25. Timeout resets the streak and advances the round without a reward.
- Correct words credit lifetime XP and spendable coins immediately and save them. Spending coins must never decrease lifetime XP or relock levels. `bestWpmByLevel` is updated only after a completed 20-word round; early exits cannot unlock levels. `unlockedLevel` retains earned access permanently. Speed uses correct characters divided by five over active word time (including timed-out words, excluding pauses/transitions), rounded down so borderline results do not unlock early.
- Every correct word triggers a randomized funny pet action and bubble. `reactions`, `petReaction()`, and the `pet-*` CSS animations work together.
- Escape/Pause opens the pause dialog; switching to another tab also pauses. Resume restores the remaining word time without charging paused time. Pausing during a word transition must continue with the next word on resume, without crediting a word twice or skipping one.
- Finishing early keeps already-earned points. Results show correct words, rewards, typing accuracy, streak, and WPM; WPM uses correct characters divided by five and active word time.

## State and browser saves

`SAVE_KEY` is `type-and-tails-v1`. Keep it stable or implement an explicit compatible migration.

Persisted fields: `xp`, `coins`, `owned` (item ID array), `equipped` (slot-to-item-ID object), `selected` (difficulty index), `rounds`, `lessonRounds` (eight nonnegative per-level completion counters; retained for save compatibility, not word ordering), `bestWpmByLevel` (eight completed-round speed records), `unlockedLevel` (highest permanently earned difficulty), `bestWpm`, `music`, and `sound`. Loaded values are validated. Older saves without `lessonRounds` initialize per-level completion counts to zero without changing XP, coins, or inventory. Do not use these counters to force a word order; all rounds draw a fresh shuffled sample. If `unlockedLevel` is absent, `LEGACY_POINT_TIERS` preserves difficulties already earned under the former point-based system once; subsequent unlocks use only completed-round WPM. Never use the legacy point tiers to grant new unlocks after migration. Unknown items and unowned equipment are ignored. Storage failures must allow play and show the saving limitation.

Active-round state and animation/timer handles are transient. Reloading does not restore an in-progress round, but rewards already credited are saved. Do not replace or clear a player's stored progress during ordinary edits. Browser storage is scoped to the page origin; moving between hosts or local-file locations may expose different storage.

## Shop and decorations

`ITEMS` defines price, category (`pet`/`room`), equipment slot, and item ID. Owned items can be equipped or put away freely. Buying equips automatically. Only one item per equipment slot is active; different slots can combine. The shop is unavailable during a round.

`applyDecorations()` maps equipped items to SVG element visibility and colors. `HATS` contains trusted inline SVG for hats. Coordinate changes must remain compatible with the nested `pet`/`pet-motion` groups and accessory IDs. Keep lifetime progress independent of shop balance, validate affordability, and save after transactions.

## Audio and presentation

`MUSIC_SCORE` expands four eight-bar sections into two varied passes (64 bars, 512 steps at 0.42 seconds each; about 3m 35s). `MUSIC_PHRASES`, `MUSIC_HARMONIES`, and `MUSIC_SECTIONS` define melodies, voiced/arpeggiated chords, bass, rests, and quieter sections. Keep the arrangement varied and avoid reverting to a short repeating phrase. The `audio` object synthesizes background melody/chords and effects with Web Audio oscillator/envelope nodes. No audio assets or network requests are needed. Create/resume its AudioContext only after a real user gesture. Music and effects have separate gains and saved switches. Hide/mute scheduling follows page visibility. Disconnect completed notes and avoid adding duplicate music intervals when starting another round or toggling audio.

`fitWord()` sizes long words to the typing card and runs on resize. Keep beginner words large, expert words readable, mobile input usable, and motion preferences respected. The library link must point to `../index.html`. The speech bubble is raised above Pip; during play on narrow screens it sits beside Pip to avoid both the cat and the typing card. `.room-card.is-playing` controls this responsive placement.

## Editing and verification

For tuning difficulty and vocabulary, edit `LEVELS` and keep its key progression aligned with `PRACTICE_LETTERS`; for outfits/decorations, edit `ITEMS`, `HATS`, and `applyDecorations()` together; for reactions, edit `reactions` and matching CSS keyframes. Update this guide and `README.txt` when mechanics or speed targets change.

Follow the root verification policy: source review is normal; do not automatically run browser checks or test tools. There is currently no automated test suite. If Mark requests a focused browser check, relevant scenarios are correct/incorrect/timeout input, pause/resume around the last word, unlocked/locked selection, shop affordability/equipping, independent audio switches, saved progress after reload, narrow-screen words, and the return link. Report only checks actually performed.

# Bomb Major

A click-to-survive arcade game. Open `index.html` in Google Chrome, or select Bomb Major from the parent Games library. No install, build, server, or internet connection is required.

- Click a character to jump it to a random safe position. Every successful jump makes the bomb faster and reduces future freeze time.
- Click the bouncing **Click Me** block to redirect it toward the bomb. When they collide, the bomb freezes temporarily.
- Characters and the block collect coins. Every ten coins collected in the current round adds another human character.
- Click a magnet drop to pull existing coins toward the block.
- A rare cat can join the arena. Clicking it makes the bomb target it. When caught, it runs away, drops five coins, and resets the bomb's extra speed.
- The round ends when no human characters remain. **One more try** resets the round while keeping saved coins.
- **Sound on/off** switches both generated sound effects and background music. Audio starts with a game interaction.

The illustrated courtyard uses the same warm paper, sage greens, soft gold, rounded shapes, and serif headings as Type & Tails. Friends, the ginger cat, bomb, magnet and explosions have local vector artwork. The freeze block is sage green, turns terracotta when clicked, and gains a gold outline while attracting coins; a frozen bomb turns blue. The background garden border is decorative, so it does not block movement.

Files: `index.html` contains markup and SVG character/effect templates; `styles.css` contains game styling; `game.js` contains mechanics, animation, audio, and persistence; `assets/courtyard.svg` contains the garden background. [AGENTS.md](AGENTS.md) is the guide for AI agents working on the game.

Saved coin totals use the browser storage key `bomb-major-coins`; audio preference uses `bomb-major-sound`. Existing key names are preserved. Browser saves belong to their origin, so a game previously played on a different host will have separate saved data.

The source was imported from original Bomb Major commit `790779f7b3084c2cea53337a9a6268dc12a1af35` and split into this folder. The courtyard graphics update preserves movement, collision sizes, difficulty, scoring, audio and save keys. Source and diff reviewed; browser testing has not been run for the redesign.

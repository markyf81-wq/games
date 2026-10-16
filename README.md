# Games

A shared library for small browser games. Open `index.html` in Google Chrome and choose a game. No installation or build step is required for the current collection.

## Collection

| Game | Entry point | Agent guide |
| --- | --- | --- |
| Type & Tails | [Play](type-tails/index.html) | [AGENTS.md](type-tails/AGENTS.md) |
| Chicken Major | [Play](bomb-major/index.html) | [AGENTS.md](bomb-major/AGENTS.md) |
| Fateless Kingdoms | [Play](fateless-kingdoms/index.html) | [AGENTS.md](fateless-kingdoms/AGENTS.md) |

Type & Tails is a cozy typing game with 20-word rounds, eight difficulties unlocked by completed-round WPM, expanded touch-typing word pools with a fresh randomized selection each round, a Space-to-start ready prompt, automatic typo filtering, a pet and room shop, music, sound effects, and browser-local saved progress.

Chicken Major is a chase-and-dodge arcade game where characters run off-screen when caught by a chasing chicken, with a bouncing freeze block, coin collection, extra characters, cat and magnet drops, and generated audio. Its original single HTML file is now split into HTML, CSS, and JavaScript inside `bomb-major/`.

Fateless Kingdoms is Mark's physical card game adapted for one human versus a CPU. It includes all 62 printed cards, three rows per player, Spells and Omens, selectable targets, automatic scoring, best-of-three rounds, three CPU levels (Beginner, Intermediate and Difficult), a searchable card collection and a browser-local saved match. Begin game flips a coin to choose the starter; refreshing automatically restores the saved match. Reset game clears the saved match after confirmation and returns to Begin game. The table includes a fanned hand, pass confirmation, browsable destroyed decks, shared weather cards, illustrated SVG row effects, a face-down rival hand, a two-second centre reveal for every played card, card flights and burns, plus locally generated battle music and sound effects. Music starts enabled and can be muted in Settings. Settings also controls the CPU level, starting hand size per player, and whether the next game includes Omens and Spells. Target choices use a cancellable modal, round winners stay visible beside the scores, and the table scales to the window across desktop and compact layouts. The match header uses solid turn/round highlights and the desktop sidebar adapts its artwork and history spacing to the available height. Wide windows place the kingdoms side by side for larger field cards; narrow portrait windows keep the opposed stacked rows. Its card artwork is exported as progressive JPEGs (about 3.8 MiB total); the original PSDs remain untouched. Printed card wording takes priority. See its [rules snapshot](fateless-kingdoms/RULES.md) and [CPU design/research notes](fateless-kingdoms/AI_NOTES.md).

For an HTTP preview with background CPU search, run `python3 -m http.server 8787 --bind 127.0.0.1` from the repository root and open `http://127.0.0.1:8787/`. Direct-file play uses the same CPU with a yielding fallback and needs no server.

## Structure

```text
Games/
  index.html           Game selection page
  library.css          Selection page styling
  games.js             Catalog of playable games
  library.js           Search, filters, and game cards
  AGENTS.md            Shared guidance for AI agents
  previews/            Library thumbnails
  type-tails/          Type & Tails code and its own agent guide
  bomb-major/          Chicken Major code and its own agent guide
  fateless-kingdoms/    Card game, original card exports, rules and CPU
```

## Add another game

Put the game in its own folder with an `index.html` entry point and an `AGENTS.md` based on its actual implementation. Add a local preview image and a record in `games.js`, using paths relative to the library root. Add a return link to `../index.html` inside the game and update the collection table above.

Keep each game's saves, styles, scripts, and assets independent. See the root [agent guide](AGENTS.md) for the full conventions.

Fateless Kingdoms received approved focused rule/CPU checks and a Chrome play-through for its initial build. Existing games were not regression-tested as part of that addition.

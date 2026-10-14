# Games

A shared library for small browser games. Open `index.html` in Google Chrome and choose a game. No installation or build step is required for the current collection.

## Collection

| Game | Entry point | Agent guide |
| --- | --- | --- |
| Type & Tails | [Play](type-tails/index.html) | [AGENTS.md](type-tails/AGENTS.md) |
| Bomb Major | [Play](bomb-major/index.html) | [AGENTS.md](bomb-major/AGENTS.md) |

Type & Tails is a cozy typing game with 20-word rounds, eight difficulties unlocked by completed-round WPM, 16 ordered touch-typing lessons, a pet and room shop, music, sound effects, and browser-local saved progress.

Bomb Major is a survival arcade game with a chasing bomb, a bouncing freeze block, coin collection, extra characters, cat and magnet drops, and generated audio. Its original single HTML file is now split into HTML, CSS, and JavaScript inside `bomb-major/`.

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
  bomb-major/          Bomb Major code and its own agent guide
```

## Add another game

Put the game in its own folder with an `index.html` entry point and an `AGENTS.md` based on its actual implementation. Add a local preview image and a record in `games.js`, using paths relative to the library root. Add a return link to `../index.html` inside the game and update the collection table above.

Keep each game's saves, styles, scripts, and assets independent. See the root [agent guide](AGENTS.md) for the full conventions.

Code reviewed; browser testing has not been run for the library setup.

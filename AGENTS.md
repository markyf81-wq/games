# Games library — agent guide

## Purpose and layout

This repository holds independent browser games behind one shared selection page. The library lives at the repository root. Each game owns a directory and an `AGENTS.md` documenting that game.

- `index.html`: library page markup and script/style entry points.
- `library.css`: responsive library appearance; separate from game styling.
- `games.js`: the `GAME_CATALOG` array used to list available games.
- `library.js`: catalog rendering, title/tag search, and category filtering.
- `previews/`: local game card artwork.
- `type-tails/`: the Type & Tails typing game. Read `type-tails/AGENTS.md` before changing it.
- `bomb-major/`: the Bomb Major survival game. Read `bomb-major/AGENTS.md` before changing it.

Both games now live in this repository. Do not list an unavailable game as playable or introduce a separate repository for a game without a request.

## Adding a game

1. Put the game's files in its own directory, using a short lowercase slug such as `bomb-major/`. Use an `index.html` entry point.
2. Keep dependencies and assets inside that directory unless they are intentionally shared. Prefer plain browser code without installing a framework or adding a build step for routine changes.
3. Add `<game>/AGENTS.md` with its purpose, file map, runtime/start instructions, mechanics and controls, save keys/schema, audio setup, important invariants, and verification guidance based on its actual code. Do not invent behavior.
4. Add a real local thumbnail in `previews/` and a record in `GAME_CATALOG`. Required fields: `id`, `title`, `subtitle`, `description`, `category`, `tags`, `path`, `image`, `imageAlt`, `accent`, and `detail`.
5. Paths in the catalog are relative to the root. Avoid leading slashes so the library works under a subdirectory and when opened from disk.
6. Include a visible link back to `../index.html` from the game. Keep navigation styling in that game's own stylesheet.
7. Update the root README and preserve existing games and their saves.

## Runtime and editing conventions

Open the root `index.html` in Google Chrome. The library and both current games need no package manager, build, server, or network access. Keep ordinary deferred scripts; changing to modules or fetching JSON would introduce restrictions when opened with `file://`.

The library renders metadata using DOM nodes and `textContent`. Keep metadata text separate from HTML. Maintain keyboard focus, useful labels and image alternatives, responsive layouts, and reduced-motion behavior.

Keep game code isolated. A change to one game must not alter another game's mechanics, assets, or browser storage. Storage keys must be unique per game. Do not add tracking, account systems, or network services without a task that requests them.

Update the relevant game guide when an edit changes controls, important mechanics, files, or persistence. Avoid unnecessary restructuring or broad formatting in unrelated game files.

## Git and verification

Respect Mark's global and session instructions. Never use worktrees. Do not commit or push without authorization, or commit directly on `main`, `qa`, or `release/*` without explicit approval for that action. Do not merge branches without an exact request or approval.

Prioritize focused edits and source/diff review. Do not automatically run tests, builds, linters, typechecks, browser automation, or screenshots. Run them only when Mark asks or approves the specific scope, except the smallest diagnostic needed to understand or resolve a reported problem. Do not add routine test files. Use Google Chrome for browser work. State clearly what was and was not checked.

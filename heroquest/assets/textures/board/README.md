# User-supplied board artwork

Mark supplied `~/Downloads/ww7sy558ez381.jpg` on 2026-10-21: a 2048 x 1536 image
whose room rectangles match the existing 26 x 19 board layout. Its creator and
whether it is an official scan or an illustrated recreation are not established;
do not label it verified original printed artwork or an open-licensed texture.
It supplies visual floors only, never rules, room placement or quest content.

The original is locally retained as ignored `references/visual/user-board-scan.jpg`.
The crop `[74,74,1972,1461]` removes the outer black border and yields a 1898 x
1387 atlas: exactly 73 pixels per square. No painting, rotation, perspective
warping or recolouring is applied. WebP quality 93 is used for runtime storage.
The printed white room boundaries remain part of the image beneath the 3D walls.

Recipe: `python3 heroquest/scripts/prepare_board_texture.py <source-image>` with
Pillow. `board.js` embeds `board.webp` as a data URI with original/crop hashes,
avoiding runtime fetches and file-origin texture restrictions. Deferred scripts
load it before the cached component texture helper. Discovery still zero-scales
unknown cells; floor instances keep their cell UV offsets, with brightness controlled by scene lighting alone.

Source image/crop reviewed during asset preparation. No new browser, direct-file,
lighting, alignment-in-scene or performance check has been run.

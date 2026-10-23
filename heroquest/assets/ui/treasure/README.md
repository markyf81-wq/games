# Original North American Treasure cards

Eleven distinct faces and the coloured Treasure back are cropped from Mark's
local `references/original-na/system-treasure.pdf`: faces on PDF pages 1–3,
back on page 4. All 24 physical copies (including duplicate values/potions,
four hazards and six wandering monsters) are recorded in `src/data/treasure.js`.
The art and printed text retain original game copyright; no open licence is
asserted. The archive's distribution notice is not a licence from Hasbro.

Run `scripts/prepare_treasure_cards.py` offline with Poppler/Pillow to regenerate.
`sources.json` records PDF/output hashes and the per-page crop rectangles. No
PDF processing, fetch, network or dependency is needed during play. Source scans
and rendering scratch files stay local and ignored. Crops were inspected against
the complete source sheets during authoring; no gameplay/browser check ran.

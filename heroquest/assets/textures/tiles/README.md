# Original component artwork

`stairway.png` is the actual printed stair tile cropped from the retained
[original North American tile sheet](https://north-american.yeoldeinn.com/downloads/system/system-tiles.pdf),
source ID `system-tiles`, PDF page 1, upper of the two stair tiles at lower right.
The embedded `Im0.jpg` is 1582 x 1190 pixels; crop `[1198,598,1463,863]` gives a
265 x 265 square without white cutting gutters. The black printed background and
all step artwork remain. It is not an authored recreation or AI-generated image.

The PDF's page 2 credits scanning/PDF conversion to Drathe / Ye Olde Inn and
identifies HeroQuest copyright as Milton Bradley Company / Hasbro, developed
with Games Workshop. The unchanged source PDF, including its notice, remains
under ignored `references/original-na/system-tiles.pdf`. No open licence for
this printed artwork is claimed by this project.

Recipe: `python3 heroquest/scripts/prepare_component_artwork.py` with pypdf/Pillow.
`stairway.js` embeds the PNG as a data URI, source/crop metadata and hashes so
ordinary deferred scripts work without a fetch or file-origin WebGL restrictions.
The image is mapped onto a thin 2x2 tile that receives normal lights/shadows.
Source crop inspected during asset preparation; no new browser check run.

## Sprung trap tiles

`pit-trap.png` and `falling-block.png` are the first-row original printed trap
faces from the same embedded page-1 tile sheet. Source-image crops are respectively
`[449,0,581,132]` and `[299,0,431,132]`, both 132×132, excluding white gutters.
`traps.js` embeds their source IDs, source/output hashes and unchanged cropped
pixels for file-compatible loading. The pit artwork lines its recessed bottom;
the falling-block art caps both permanent blocked passages and sprung falling-block
stone plugs at full or cutaway height. Both receive
scene lighting. Unsprung traps remain pointers, not revealed tiles. Secret doors
use deliberately darker stone panels after discovery, without a printed marker.

These retain the source artwork’s copyright; no open licence is asserted.
Crops were inspected as offline asset authoring, not a browser/gameplay check.

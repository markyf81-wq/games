# HeroQuest wall model

**Creator:** ldid69  
**Source:** [HeroQuest wall 1x2 – for two spaces](https://www.thingiverse.com/thing:6005201)  
**Licence:** Creative Commons Attribution – Non-Commercial – Share Alike, as
stated in the supplied [LICENSE.txt](LICENSE.txt). The supplied notice does not
specify a licence version. These derivatives retain those terms and attribution.

Mark supplied the downloaded directory on 2026-10-21. The original STL, README
and licence are preserved locally in ignored `references/wall-source/ldid69-6005201/`.
The Blender file is not loaded or executed. Source SHA-256, original counts,
creator, URL, licence statement and modifications are embedded in each derivative.

Preparation: `scripts/prepare_walls.py <download-directory>` with the same
numpy/fast-simplification environment as the STL importer, plus Pillow for the
offline authoring image. The script reads mesh data only. Source: 457,728
triangles, approximately 50 × 25 × 49.46 mm including a wide printing plinth.

Changes from the source:

- Simplified the stone sculpt for repeated browser placement.
- Removed the printing plinth below source Z = 4 mm and capped the base.
- Rotated from print Z-up to browser Y-up; fitted the body length/height to two
  board spaces (the simplified endpoints are corrected to exactly two spaces).
- Reduced the freestanding print’s depth independently to 0.16 spaces, leaving
  approximately 0.84 spaces between corridor walls for 0.82-space hero bases.
- Cropped/capped a one-space derivative for odd runs and door jambs.
- Added warm grey stone and darker recessed mortar as vertex colours.

`wall-two.js`: 5,406 triangles; 8,559 vertices; approximately 2 × 1.864 × 0.160 spaces.  
`wall-one.js`: 3,426 triangles; 5,220 vertices; approximately 1 × 1.864 × 0.157 spaces.

Both are classic-script packed assets consumed by the shared cached model loader.
They are decorative replacements for the old low-wall geometry. The source was
designed for the newer physical game's blocked-space tokens; using its sculpt on
room edges does not import its physical base/occupancy or any newer-edition rules.

Wall layout, camera cutaway, controls and verification limits are documented in
`docs/WALLS.md`. Runtime instances mix one-/two-square lengths, turn/mirror the
inner sculpt and vary material tone subtly using stable quest/coordinate hashes.
These additional presentation changes preserve source dimensions and notices.
The rejected lightweight comparison derivatives are removed; source downloads
and locally retained research originals are untouched.

`wall-join.js` is a later capped 0.11-square central strip of `wall-one.js`,
prepared by `scripts/prepare_wall_join.py` using the same offline environment.
It has 952 triangles/1,280 vertices and measures 0.11 × 1.85 × 0.145. The parent
mesh/file hashes and original provenance remain embedded. It replaces generated
flat join posts with the source stone surface; world clipping follows connected
wall heights without squashing stones. The original source/licence above applies.

Runtime stone colours now vary per raised stone with stable quest/section seeds,
including the join strips. Recessed mortar remains neutral. Geometry stays shared.

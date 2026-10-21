# Supplied weapons rack

**Creator:** xbeaker  
**Source:** [Heroquest Weapons rack, Thingiverse 4271138](https://www.thingiverse.com/thing:4271138)  
**Licence:** Creative Commons Attribution - Non-Commercial - Share Alike, as
stated in the supplied [LICENSE.txt](LICENSE.txt); no version is specified.
The original [README.txt](README.txt) is retained verbatim. The author describes
this as a remix of other designers' components and notes incomplete upstream
credits; do not invent those credits or imply they have been independently audited.

Mark supplied `Heroquest Weapons rack - 4271138.zip` on 2026-10-21. The source
STL, pictures and notices remain locally under ignored
`references/stl-source/weapons-rack-4271138/`. Source SHA-256, bounds, original
counts, author, licence and modifications are recorded in the prepared asset.

The source has 1,272,832 triangles before degenerate/duplicate removal. The
offline recipe `scripts/prepare_weapons_rack.py` first welds near-duplicate
vertices on a 0.04 mm grid and removes collapsed/duplicate faces, then simplifies
it to 26,559 triangles / 18,992 vertices (about 506 KiB packed JS), converts Z-up
to Y-up, centres its shallow base and grounds it. Runtime uniformly fits it
to the existing one-by-three quest footprint without changing occupancy or
quest contents. Geometry is decoded/cached by the normal STL model factory.
Its internal half-turn faces the weapons into the room at the quest's placement;
the model viewer starts from the front. An offline front/back authoring preview
was inspected; this is not a browser screenshot or performance check.
Its initial wood base colour is temporary; detailed wood/metal/shield painting
remains to be authored. No new browser appearance/performance pass has run.

(function () {
  "use strict";
  window.HeroQuest = window.HeroQuest || {};
  // Zero-based cells. North is the top of the upright blank board in the
  // original NA quest-book scan, PDF page 5, upper half (no rotation).
  // Rectangles use [x, row, width, depth]. Corridors are the remaining cells.
  const rooms = [
    [1,1,4,3], [5,1,4,3], [9,1,3,5], [14,1,3,5],
    [17,1,4,4], [21,1,4,4], [1,4,4,5], [5,4,4,5],
    [17,5,4,4], [21,5,4,4], [10,7,6,5],
    [1,10,4,4], [5,10,2,3], [7,10,2,3],
    [17,10,4,4], [21,10,4,4], [5,13,4,5], [9,13,3,5],
    [14,13,4,5], [1,14,4,4], [18,14,3,4], [21,14,4,4]
  ].map(([x,row,width,depth], index) => Object.freeze({ id: "room-" + (index + 1), x, row, width, depth }));
  window.HeroQuest.board = Object.freeze({
    columns: 26, rows: 19, rooms: Object.freeze(rooms),
    source: Object.freeze({ sourceId: "system-quest-book", pdfPage: 5, region: "upper half, blank board, upright", status: "prototype trace" })
  });
  // A visual sample arrangement, deliberately separate from any quest data.
  window.HeroQuest.samples = Object.freeze([
    Object.freeze({ id:"barbarian", name:"Barbarian", kind:"barbarian", x:11, row:8, rotation:0.35, description:"A painted hero with warm skin, dark hair, an oxblood loincloth, fur-trimmed leather boots and a steel sword with bronze fittings." }),
    Object.freeze({ id:"orc", name:"Orc", kind:"orc", x:14, row:9, rotation:-0.55, description:"A green monster miniature, with a broad stance and a raised cleaver." }),
    Object.freeze({ id:"table", name:"Wooden table", kind:"table", x:12, row:10, width:3, depth:2, rotation:0, description:"A timber table from the supplied model collection, placed within a three-by-two-square footprint." }),
    Object.freeze({ id:"door", name:"Dungeon door", kind:"door", x:10, row:9, rotation:Math.PI/2, description:"A closed arched dungeon door from the supplied model collection, placed on the room boundary." })
  ]);
})();

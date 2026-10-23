(function () {
  "use strict";
  const HQ=window.HeroQuest;
  const source=(pdfPage,printedLocator)=>Object.freeze({sourceId:"system-instruction-booklet",pdfPage,printedLocator,reviewStatus:"visually-reviewed"});
  // Invented practice placements on the existing board, never quest additions.
  const layouts={trial:{traps:[],doors:[]},practice:{
    traps:[
      {id:"practice-pit",kind:"pit",x:3,row:16},
      {id:"practice-spear",kind:"spear",x:2,row:17},
      {id:"practice-block",kind:"falling-block",x:0,row:16},
      {id:"practice-chest",kind:"furniture",furnitureId:"furniture-7",damage:1}
    ],
    doors:[{id:"practice-secret",secret:true,axis:"v",x:5,row:14}]
  }};
  for(const layout of Object.values(layouts)){
    layout.traps=Object.freeze(layout.traps.map(Object.freeze));layout.doors=Object.freeze(layout.doors.map(Object.freeze));Object.freeze(layout);
  }
  HQ.dungeonData=Object.freeze({layouts:Object.freeze(layouts),sources:Object.freeze({
    searches:source(8,"rotate 180 degrees; printed p17, Search for Secret Doors / Search for Traps"),
    pits:source(7,"printed p18, How a Hero Searches for Traps / Pit Traps"),
    springs:source(6,"rotate 180 degrees; printed p19, Pit / Falling Block / Spear Traps"),
    jumping:source(5,"printed p20, Chest/Furniture Traps / Jumping a Trap"),
    disarm:source(4,"rotate 180 degrees; printed p21, Disarm a Trap / Dwarf")
  })});
})();

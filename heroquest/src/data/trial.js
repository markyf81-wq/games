(function () {
  "use strict";
  const HQ=window.HeroQuest;
  const mapSource=Object.freeze({sourceId:"system-quest-book",pdfPage:4,region:"lower map, rotated 180 degrees",reviewStatus:"visually-reviewed"});
  const ruleSource=(pdfPage,printedLocator)=>Object.freeze({sourceId:"system-instruction-booklet",pdfPage,printedLocator,reviewStatus:"visually-reviewed"});
  HQ.explorationRules=Object.freeze({
    movement:ruleSource(12,"upright after 180 degree rotation; printed pages 12–13, Hero Movement"),
    doors:ruleSource(12,"printed page 13, Looking And Opening Doors; How Zargon Reacts"),
    setup:ruleSource(8,"upright after 180 degree rotation; printed page 8, step 9 and starting-room diagram"),
    sight:ruleSource(10,"upright after 180 degree rotation; printed page 15, SEE"),
    turnOrder:ruleSource(12,"printed page 12, Order Of Play"),
    monsterMovement:ruleSource(4,"rotate 180 degrees; printed page 21, Zargon The Evil Sorcerer's Turn; Monster Movement")
  });
  HQ.heroes=Object.freeze([
    {id:"barbarian",name:"Barbarian",kind:"barbarian",x:1,row:14},
    {id:"dwarf",name:"Dwarf",kind:"dwarf",x:2,row:14},
    {id:"elf",name:"Elf",kind:"elf",x:1,row:15},
    {id:"wizard",name:"Wizard",kind:"wizard",x:2,row:15}
  ].map(Object.freeze));
  const activeRooms=["room-1","room-2","room-3","room-7","room-8","room-11","room-12","room-17","room-18","room-19","room-20"];
  const floor=new Set();
  const add=(x,row)=>floor.add(x+","+row);
  HQ.board.rooms.filter(r=>activeRooms.includes(r.id)).forEach(r=>{
    for(let row=r.row;row<r.row+r.depth;row++)for(let x=r.x;x<r.x+r.width;x++)add(x,row);
  });
  // Light grey corridors only. Unused board rooms/corridors are solid rock.
  for(let row=1;row<=18;row++)add(0,row);
  for(let x=0;x<=14;x++)add(x,18);
  for(let x=0;x<=17;x++)add(x,9);
  for(let row=6;row<=18;row++)add(9,row);
  for(let x=9;x<=16;x++){add(x,6);add(x,12);}
  for(let row=6;row<=12;row++)add(16,row);
  for(let row=13;row<=18;row++){add(12,row);add(13,row);}
  add(12,5);add(13,5);
  const doors=[
    ["h",3,18],["h",7,18],["v",9,15],["h",10,13],["v",14,15],["v",1,11],
    ["h",3,9],["h",7,9],["h",3,4],["v",5,2],["v",9,2],["v",16,9]
  ].map(([axis,x,row],i)=>Object.freeze({id:"door-"+(i+1),axis,x,row,source:mapSource}));
  const monsters=[
    ["skeleton",2,2],["skeleton",3,2],["zombie",6,1],["mummy",6,2],["zombie",6,3],
    ["skeleton",9,1],["skeleton",9,3],["mummy",9,4],
    ["orc",4,5],["goblin",3,6],["goblin",6,7],["goblin",7,7],
    ["goblin",2,11],["orc",2,12],["orc",7,14],["orc",8,15],
    ["goblin",10,14],["fimir",10,16],["chaos-warrior",16,15],["chaos-warrior",15,16],
    ["gargoyle",12,8],["orc",14,8],["orc",11,11],["chaos-warrior",14,11]
  ].map(([kind,x,row],i)=>Object.freeze({id:"monster-"+(i+1),kind,x,row,source:mapSource,
    ...(kind==="gargoyle"?{name:"Verag"}:{}),...(kind==="mummy"&&x===6?{note:"C"}:{})}));
  const furniture=[
    ["stairs",1,14,2,2,0],
    ["alchemists-bench",5,15,2,3,Math.PI/2],
    ["bookcase",5,13,3,1,0],
    ["weapons-rack",11,15,1,3,Math.PI/2],
    ["bookcase",15,13,3,1,0],["bookcase",15,17,3,1,Math.PI],
    ["chest",17,16,1,1,0],
    ["torture-rack",3,10,2,3,Math.PI/2],
    ["sorcerers-table",1,5,2,3,Math.PI/2],
    ["table",6,5,3,2,0],
    ["tomb",10,1,2,3,Math.PI/2],
    ["chest",10,5,1,1,0],
    ["table",11,9,3,2,0],
    ["fireplace",12,7,3,1,0],
    ["chest",11,7,1,1,0],["throne",10,8,1,1,0]
  ].map(([kind,x,row,width,depth,rotation],i)=>Object.freeze({id:"furniture-"+(i+1),kind,x,row,width,depth,rotation,source:mapSource}));
  HQ.trial=Object.freeze({
    id:"the-trial-combat-v1",title:"The Trial",number:1,edition:"original-na",source:mapSource,
    objective:Object.freeze({targetId:"monster-21",description:"Find and defeat Verag, then return to the stairway.",
      source:Object.freeze({sourceId:"system-quest-book",pdfPage:5,region:"Quest 1 parchment",reviewStatus:"visually-reviewed"})}),
    endingSource:Object.freeze({sourceId:"system-instruction-booklet",pdfPage:2,printedLocator:"printed page 23, Ending The Quest; rotate 180 degrees",reviewStatus:"visually-reviewed"}),
    notesSource:Object.freeze({sourceId:"system-quest-book",pdfPage:5,region:"lower half, Quest 1",reviewStatus:"visually-reviewed"}),
    briefing:"You have learned well, my friends. Now has come the time of your first trial. You must first enter the catacombs which contain Fellmarg’s Tomb. You must seek out and destroy Verag, a foul Gargoyle who hides in the catacombs. This Quest is not easy and you must work together in order to survive. This is your first step on the road to becoming true Heroes. Tread carefully my friends.",
    rooms:Object.freeze(activeRooms),floor:Object.freeze([...floor]),doors:Object.freeze(doors),
    monsters:Object.freeze(monsters),furniture:Object.freeze(furniture),
    blocked:Object.freeze(["0,1","12,5","13,5","17,9","14,18"]),
    startingRoom:"room-20",stairs:Object.freeze(["1,14","2,14","1,15","2,15"]),
    startingPlacement:"Digital choice: four individual stairway squares for placement, reach and sight. Internal steps are free only with rolled movement remaining; entering or leaving costs one movement. This movement adaptation was requested by Mark, not confirmed in the printed rules.",
    // Quest notes are authoritative future content, never shown as reveal hints.
    notes:Object.freeze({A:{effect:"empty-weapons-rack"},B:{effect:"empty-chest"},C:{attackDice:4},D:{gold:84},E:{gold:120}}),
    treasureRooms:Object.freeze({
      "room-18":Object.freeze({note:"A",description:"The weapons on this weapons rack are chipped, rusted and broken. There is nothing here that the Heroes would want."}),
      "room-19":Object.freeze({note:"B",description:"This treasure chest is empty."}),
      "room-3":Object.freeze({note:"D",gold:84,description:"The first Hero who searches for treasure will find 84 gold coins in this treasure chest."}),
      "room-11":Object.freeze({note:"E",gold:120,description:"The first Hero who searches for treasure will find 120 gold coins in this treasure chest."})
    }),
    wanderingMonster:Object.freeze({kind:"orc",name:"Orc",source:Object.freeze({sourceId:"system-quest-book",pdfPage:5,region:"Quest 1 footer",reviewStatus:"visually-reviewed"})}),
    limitations:"Gameplay prototype: exploration, melee, twelve elemental spells, treasure searches, potions, CPU turns and quest outcomes. Trap/secret-door mechanics have separate practice scenarios. Dagger throws, party carry-forward and Quest 2 are implemented; the remaining original campaign and Chaos spells are unfinished."
  });
})();

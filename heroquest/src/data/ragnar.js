(function () {
  "use strict";
  const HQ=window.HeroQuest;
  const source=Object.freeze({sourceId:"system-quest-book",pdfPage:6,region:"lower map, rotated 180 degrees",reviewStatus:"visually-reviewed"});
  const notesSource=Object.freeze({sourceId:"system-quest-book",pdfPage:7,region:"Quest 2 parchment and notes",reviewStatus:"visually-reviewed"});
  const rooms=["room-4","room-5","room-9","room-10","room-11","room-12","room-13","room-14","room-17","room-18"],floor=new Set();
  const add=(x,row)=>floor.add(x+","+row);
  for(const room of HQ.board.rooms.filter(room=>rooms.includes(room.id)))for(let row=room.row;row<room.row+room.depth;row++)for(let x=room.x;x<room.x+room.width;x++)add(x,row);
  for(let x=12;x<=20;x++)add(x,6);
  for(let x=1;x<=24;x++)add(x,9);
  for(let row=6;row<=12;row++)add(16,row);
  for(let row=10;row<=18;row++)add(9,row);
  for(let x=9;x<=16;x++)add(x,12);
  for(let row=13;row<=18;row++){add(12,row);add(13,row);}
  for(let x=9;x<=14;x++)add(x,18);
  add(12,5);add(13,5);
  const doors=[["v",17,3],["h",19,5],["v",21,6],["h",23,9],["h",15,6],["h",10,12],["v",7,11],["v",9,15],["h",11,18]]
    .map(([axis,x,row],i)=>Object.freeze({id:"ragnar-door-"+(i+1),axis,x,row,source}));
  const monsters=[
    ["orc",15,3],["orc",19,3],["goblin",16,4],["goblin",18,4],
    ["goblin",14,6],["goblin",16,6],["goblin",18,7],["goblin",19,7],["goblin",20,7],
    ["orc",23,6],["orc",24,7],["goblin",3,9],["goblin",2,12],
    ["fimir",8,11],["orc",7,12],["goblin",16,12],["goblin",8,14],
    ["orc",7,15],["orc",9,15],["goblin",10,18]
  ].map(([kind,x,row],i)=>Object.freeze({id:"ragnar-monster-"+(i+1),kind,x,row,source}));
  const furniture=[
    ["stairs",10,7,2,2,0],["table",18,1,3,2,0],["bookcase",17,6,1,3,Math.PI/2],
    ["chest",19,8,1,1,0],["torture-rack",14,9,2,3,Math.PI/2],
    ["chest",2,13,1,1,0],["table",5,15,2,3,Math.PI/2]
  ].map(([kind,x,row,width,depth,rotation],i)=>Object.freeze({id:"ragnar-furniture-"+(i+1),kind,x,row,width,depth,rotation,source}));
  HQ.ragnarQuest=Object.freeze({
    id:"rescue-sir-ragnar-v1",title:"The Rescue of Sir Ragnar",number:2,edition:"original-na",source,notesSource,
    objective:Object.freeze({type:"escort",description:"Find Sir Ragnar and bring him alive to the stairway, then return safely.",source:notesSource}),
    briefing:"Sir Ragnar, one of the Emperor’s most powerful knights, has been captured. There is reason to believe that he is being held prisoner by Ulag, the Orc Warlord. You are to find Sir Ragnar and bring him back to the stairway. Prince Magnus will pay 240 gold coins to be divided among the Heroes, if they rescue Sir Ragnar. No reward will be paid if Sir Ragnar is killed during the escape.",
    rooms:Object.freeze(rooms),floor:Object.freeze([...floor]),doors:Object.freeze(doors),monsters:Object.freeze(monsters),furniture:Object.freeze(furniture),
    blocked:Object.freeze(["12,5","13,5","1,9","24,9","9,18","14,18"]),stairs:Object.freeze(["10,7","11,7","10,8","11,8"]),startingRoom:"room-11",dungeonLayout:"ragnar",
    starts:Object.freeze({barbarian:[10,7],dwarf:[11,7],elf:[10,8],wizard:[11,8]}),
    escort:Object.freeze({id:"sir-ragnar",kind:"chaos-warlock",name:"Sir Ragnar",x:5,row:11,cellRoom:"room-13",doorId:"ragnar-door-7",body:2,defend:2,source:notesSource}),
    notes:Object.freeze({}),reward:240,
    treasureRooms:Object.freeze({
      "room-12":Object.freeze({note:"A",description:"The chest is empty."}),
      "room-9":Object.freeze({note:"B",gold:60,itemKind:"quest-healing-potion",description:"The chest holds 60 gold coins and a Potion of Healing that restores up to 4 lost Body Points."})
    }),
    wanderingMonster:Object.freeze({kind:"orc",name:"Orc",source:notesSource})
  });
})();

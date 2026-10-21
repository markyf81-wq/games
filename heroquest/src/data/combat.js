(function () {
  "use strict";
  const HQ=window.HeroQuest;
  const source=(sourceId,pdfPage,printedLocator)=>Object.freeze({sourceId,pdfPage,printedLocator,reviewStatus:"visually-reviewed"});
  const heroes={};
  for(const [id,attack,body,mind,weapon,page] of [
    ["barbarian",3,8,2,"broadsword",1],["dwarf",2,7,3,"shortsword",2],
    ["elf",2,6,4,"shortsword",3],["wizard",1,4,6,"dagger",4]
  ])heroes[id]=Object.freeze({attack,defend:2,body,mind,weapon,armour:null,source:source("system-character-cards",page,id+" card, left face")});
  const monsters={};
  for(const [id,movement,attack,defend,body,mind,location] of [
    ["chaos-warrior",7,4,4,3,3,"upper left"],["gargoyle",6,4,5,3,4,"upper second"],
    ["mummy",4,3,4,2,0,"upper third"],["skeleton",6,2,2,1,0,"upper right"],
    ["fimir",6,3,3,2,3,"lower left"],["goblin",10,2,1,1,1,"lower second"],
    ["orc",8,3,2,1,2,"lower third"],["zombie",5,2,3,1,0,"lower right"]
  ])monsters[id]=Object.freeze({movement,attack,defend,body,mind,source:source("system-monster",1,location+" card")});
  HQ.combatData=Object.freeze({heroes:Object.freeze(heroes),monsters:Object.freeze(monsters),
    weapons:Object.freeze({broadsword:{name:"Broadsword",attack:3},shortsword:{name:"Shortsword",attack:2},dagger:{name:"Dagger",attack:1}}),
    // Six equally likely faces of the original white combat die.
    faces:Object.freeze(["skull","skull","skull","white-shield","white-shield","black-shield"]),
    sources:Object.freeze({
      heroAttack:source("system-instruction-booklet",11,"printed p14 left, How A Hero Attacks / How A Monster Defends"),
      adjacency:source("system-instruction-booklet",12,"rotate 180 degrees; printed p13, Action 1 — Attack"),
      ordering:source("system-instruction-booklet",12,"rotate 180 degrees; printed p12, On A Hero’s Turn"),
      monsterTurn:source("system-instruction-booklet",4,"rotate 180 degrees; printed p21, Zargon / Monster Movement"),
      heroDefence:source("system-instruction-booklet",3,"printed p22 left, How A Monster Attacks / How A Hero Defends / Dead Heroes"),
      equipment:source("system-armoury-identification-guide",1,"right Armoury, Broadsword / Shortsword / Dagger"),
      dieFaces:Object.freeze({sourceId:"original-white-combat-die",url:"https://forum.yeoldeinn.com/viewtopic.php?f=165&t=4530",printedLocator:"Supplementary community corroboration of the original white die: 3 skulls, 2 white shields, 1 black shield",reviewStatus:"community-corroborated"}),
      guardian:source("system-quest-book",5,"lower half, The Trial, note C: mummy attacks with 4 dice")
    })
  });
})();

(function () {
  "use strict";
  const HQ=window.HeroQuest;
  const source=(sourceId,pdfPage,printedLocator)=>Object.freeze({sourceId,pdfPage,printedLocator,reviewStatus:"visually-reviewed"});
  const definitions={};
  for(const [id,name,attack] of [["broadsword","Broadsword",3],["shortsword","Shortsword",2],["dagger","Dagger",1]])
    definitions[id]=Object.freeze({id,name,category:"equipment",artwork:"assets/ui/equipment/"+id+".jpg",description:attack+" combat "+(attack===1?"die":"dice")+" when attacking.",source:HQ.combatData.sources.equipment});
  definitions["potion-of-healing"]=Object.freeze({id:"potion-of-healing",name:"Potion of Healing",category:"potion",healingDice:1,
    description:"In a bundle of rags, you find a small bottle of bluish liquid. You can drink this healing potion at any time, restoring the number of Body Points equal to a roll of one red die. You cannot, however, exceed your starting number of Body Points. This may only be used once. Do not return this card to the deck.",
    summary:"Drink to restore 1–6 Body. Single use.",source:source("system-treasure",2,"top right Potion of Healing; two further copies on PDF pages 2–3")});
  for(const [id,name,effect,summary,description,pdfPage,locator] of [
    ["heroic-brew","Heroic Brew","heroicBrew","Two attacks instead of one on your next attack action.","You are surprised to find a leather bag hanging on the wall. If you drink its contents before you attack, you can make two attacks instead of one. This may only be used once. Do not return this card to the deck.",2,"top, second column"],
    ["potion-of-defense","Potion of Defense","defensePotion","Two extra combat dice the next time you defend.","Amidst a collection of old bottles, you find a small vial containing a clear liquid. You can drink this potion at any time, giving you two extra combat dice the next time you defend. This may only be used once. Do not return this card to the deck.",2,"bottom, third column"],
    ["potion-of-strength","Potion of Strength","strengthPotion","Two extra combat dice the next time you attack.","You find a small purple flask. You can drink this strange smelling liquid at any time, enabling you to roll two extra combat dice the next time you attack. This may only be used once. Do not return this card to the deck.",3,"bottom left"]
  ])definitions[id]=Object.freeze({id,name,effect,summary,description,category:"potion",source:source("system-treasure",pdfPage,locator)});
  for(const [id,definition]of Object.entries(definitions))if(definition.category==="potion")
    definitions[id]=Object.freeze({...definition,artwork:"assets/ui/treasure/"+id+".jpg"});
  HQ.itemData=Object.freeze({byId:Object.freeze(definitions),sources:Object.freeze({
    potions:source("system-instruction-booklet",8,"rotate 180 degrees; printed p17, Potions"),
    giving:source("system-instruction-booklet",8,"rotate 180 degrees; printed p17, Potions, final sentence: give one potion to a fellow Hero only on your turn"),
    recovery:source("system-instruction-booklet",3,"printed p22, How A Hero Escapes Death, paragraph 1"),
    starting:source("system-character-cards",1,"hero faces: starting weapon and no starting armour"),
    searches:source("system-instruction-booklet",9,"printed p16, Search For Treasure")
  })});
})();

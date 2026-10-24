(function () {
  "use strict";
  const HQ=window.HeroQuest;
  const source=(sourceId,pdfPage,printedLocator)=>Object.freeze({sourceId,pdfPage,printedLocator,reviewStatus:"visually-reviewed"});
  const definitions={};
  for(const [id,name,attack,price,twoHanded] of [["broadsword","Broadsword",3,250,false],["shortsword","Shortsword",2,150,false],["dagger","Dagger",1,25,false],["battle-axe","Battle Axe",4,450,true],["staff","Staff",1,100,true],["longsword","Longsword",3,350,false],["crossbow","Crossbow",3,350,false]]){
    const wizardAllowed=id==="dagger"||id==="staff",diagonal=Boolean(HQ.combatData.weapons[id].diagonal);
    definitions[id]=Object.freeze({id,name,category:"equipment",slot:"weapon",attack,price,twoHanded,wizardAllowed,...(id==="dagger"?{throwable:true}:{}),artwork:"assets/ui/equipment/"+id+".jpg",
      description:attack+" combat "+(attack===1?"die":"dice")+" when attacking."+(id==="crossbow"?" Fire at any monster you can see, except one directly beside, in front of or behind you. Unlimited ammunition.":"")+(diagonal?" May also attack diagonally.":"")+(twoHanded?" You may not use a shield with this weapon.":"")+(!wizardAllowed?" May not be used by the Wizard.":"")+(id==="dagger"?" A dagger may also be thrown at any monster you can see. It is lost once thrown, whether it hits or misses.":""),source:HQ.combatData.sources.equipment});
  }
  for(const [id,name,slot,defence,price,description,movementDice] of [
    ["helmet","Helmet","head",1,125,"This protective headpiece gives you 1 extra combat die in defence. May not be worn by the Wizard."],
    ["shield","Shield","shield",1,150,"This hand-held armour gives you 1 extra combat die in defence. May not be used with the Battle Axe or the Staff. May not be used by the Wizard."],
    ["chain-mail","Chain Mail","armour",1,500,"This light metal armour gives you 1 extra combat die in defence. May be combined with the Helmet and/or Shield. May not be worn by the Wizard."],
    ["plate-mail","Plate Mail","armour",2,850,"This heavy metal armour gives you 2 extra combat dice in defence. You may only roll 1 red die for movement while wearing it. May be combined with the Helmet and/or Shield. May not be worn by the Wizard.",1]
  ])definitions[id]=Object.freeze({id,name,category:"equipment",slot,defence,price,description,wizardAllowed:false,...(movementDice?{movementDice}:{}),artwork:"assets/ui/equipment/"+id+".jpg",source:HQ.combatData.sources.equipment});
  definitions["tool-kit"]=Object.freeze({id:"tool-kit",name:"Tool Kit",category:"equipment",price:250,artwork:"assets/ui/equipment/tool-kit.jpg",
    description:"Disarm a discovered, unsprung trap. Roll one combat die: either shield disarms it; a skull springs it. The Dwarf uses his own improved disarming roll.",summary:"Disarm from the trap’s context panel.",source:HQ.combatData.sources.equipment});
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
  definitions["quest-healing-potion"]=Object.freeze({id:"quest-healing-potion",name:"Potion of Healing",category:"potion",healingPoints:4,
    description:"Restore up to 4 lost Body Points. You cannot exceed your starting Body Points. Single use.",summary:"Restore up to 4 Body. Single use.",
    source:source("system-quest-book",7,"Quest 2 note B: fixed four-Body healing potion, not the Treasure deck’s one-die potion")});
  HQ.itemData=Object.freeze({byId:Object.freeze(definitions),sources:Object.freeze({
    potions:source("system-instruction-booklet",8,"rotate 180 degrees; printed p17, Potions"),
    giving:source("system-instruction-booklet",8,"rotate 180 degrees; printed p17, Potions, final sentence: give one potion to a fellow Hero only on your turn"),
    recovery:source("system-instruction-booklet",3,"printed p22, How A Hero Escapes Death, paragraph 1"),
    spellRecovery:source("system-instruction-booklet",2,"rotate 180 degrees; printed p23, How A Hero Escapes Death, continuation: unused own action and self-healing only"),
    possessions:source("system-instruction-booklet",3,"printed p22, What Happens To A Dead Hero / Warning: recovery by another hero or loss to monsters"),
    starting:source("system-character-cards",1,"hero faces: starting weapon and no starting armour"),
    searches:source("system-instruction-booklet",9,"printed p16, Search For Treasure")
  })});
})();

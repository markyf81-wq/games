(function () {
  "use strict";
  const HQ=window.HeroQuest;
  const source=(pdfPage,printedLocator)=>Object.freeze({sourceId:"system-treasure",pdfPage,printedLocator,reviewStatus:"visually-reviewed"});
  const records=[
    ["gem","Gem!",2,"gold",35,1,"first column, both rows","Tucked into the toe of an old boot you find a small gem worth 35 gold coins. Record the money on your sheet. Do not return this card to the deck."],
    ["gold-15","Gold!",2,"gold",15,1,"second column, both rows","Amidst old rags, tattered fur robes and soiled blankets, you find a collection of 15 gold coins. Record the money on your sheet. Do not return this card to the deck."],
    ["gold-25","Gold!",2,"gold",25,1,"third column, both rows","You find a loose stone and tear it from the wall. Behind it you discover a small leather pouch wrapped in an old rag. Peering inside, you find 25 gold coins. Record the money on your sheet. Do not return this card to the deck."],
    ["hazard-arrow","Hazard!",2,"hazard",1,1,"fourth column, both rows","While you are searching, a hidden arrow shoots from the wall striking you. You lose 1 Body Point and your turn is over. Return this card to the bottom of the deck."],
    ["hazard-pit","Hazard!",2,"hazard",1,2,"first column, both rows","Suddenly, the stone beneath your feet gives way. You fall into a shallow hole, losing 1 Body Point and ending your turn. You may climb out and move normally on your next turn. Return this card to the bottom of the deck."],
    ["heroic-brew","Heroic Brew",1,"potion",0,2,"top, second column"],
    ["jewels","Jewels!",2,"gold",50,2,"top third / bottom second column","You find a small wooden box. It is simple-looking and very old. Within you discover that it is lined with velvet and contains very small jewels worth 50 gold coins. Record the money on your sheet. Do not return this card to the deck."],
    ["potion-of-healing","Potion of Healing",3,"potion",0,2,"fourth column, both rows; PDF page 3 top left"],
    ["potion-of-defense","Potion of Defense",1,"potion",0,2,"bottom, third column"],
    ["potion-of-strength","Potion of Strength",1,"potion",0,3,"bottom left"],
    ["wandering-monster","Wandering Monster",6,"monster",0,3,"columns 2–4, both rows","As you are searching, a monster stalks you and attacks! Zargon places the wandering monster (listed in the Quest Book) on any square next to you. The monster attacks immediately! Return this card to the bottom of the deck."]
  ];
  const cards=records.map(([id,name,copies,category,gold,pdfPage,locator,description])=>Object.freeze({id,name,copies,category,
    ...(category==="gold"?{gold}:{}),description:category==="potion"?HQ.itemData.byId[id].description:description,artwork:"assets/ui/treasure/"+id+".jpg",source:source(pdfPage,locator)}));
  const instances=cards.flatMap(card=>Array.from({length:card.copies},(_,i)=>Object.freeze({id:"treasure-"+card.id+"-"+(i+1),kind:card.id})));
  HQ.treasureData=Object.freeze({cards:Object.freeze(cards),byId:Object.freeze(Object.fromEntries(cards.map(card=>[card.id,card]))),
    instances:Object.freeze(instances),instancesById:Object.freeze(Object.fromEntries(instances.map(card=>[card.id,card]))),back:"assets/ui/treasure/back.jpg"});
})();

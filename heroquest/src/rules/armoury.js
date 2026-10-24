(function () {
  "use strict";
  const HQ=window.HeroQuest;
  const stock=Object.freeze(Object.values(HQ.itemData.byId).filter(item=>item.category==="equipment"&&Number.isSafeInteger(item.price)&&item.price>0));
  const listed=new Map(stock.map(item=>[item.id,item]));
  const sellPrice=definition=>Math.floor(definition.price/2);
  function visitReason(state,hero){
    if(!state||!HQ.quest.isEnded(state.phase))return "Visit the Armoury between quests, after the party leaves the dungeon.";
    if(state.pending)return "Finish the final result first.";
    if(!hero||!state.heroes.includes(hero))return "Choose a hero.";
    if(hero.body<=0||!hero.exit&&!HQ.recovery.revived(state,hero))return "This fallen hero cannot visit the Armoury.";
    return "";
  }
  const visitors=state=>state?state.heroes.filter(hero=>!visitReason(state,hero)):[];
  function buyReason(state,hero,kind){
    const reason=visitReason(state,hero);if(reason)return reason;
    const definition=listed.get(kind);
    if(!definition)return "Choose equipment from the Armoury.";
    if(hero.inventory.items.length>=HQ.inventory.limit)return "This hero’s inventory is full.";
    if(hero.inventory.gold<definition.price)return "Need "+(definition.price-hero.inventory.gold)+" more gold.";
    return "";
  }
  function sellReason(state,hero,itemId){
    const reason=visitReason(state,hero);if(reason)return reason;
    const item=hero.inventory.items.find(item=>item.id===itemId),definition=listed.get(item?.kind);
    if(!definition)return "Only owned Armoury equipment can be sold. Potions and sealed bags cannot be sold.";
    if(!Number.isSafeInteger(hero.inventory.gold+sellPrice(definition)))return "This hero cannot carry more gold.";
    return "";
  }
  function buy(state,hero,kind){
    const definition=HQ.itemData.byId[kind];
    hero.inventory.gold-=definition.price;
    hero.inventory.items.push({id:"armoury-"+state.nextEventId,kind});
    return definition;
  }
  function sell(hero,itemId){
    const item=HQ.inventory.removeItem(hero,itemId),definition=HQ.itemData.byId[item.kind];
    hero.inventory.gold+=sellPrice(definition);return definition;
  }
  HQ.armoury=Object.freeze({stock,sellPrice,visitReason,visitors,buyReason,sellReason,buy,sell});
})();

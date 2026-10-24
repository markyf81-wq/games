(function () {
  "use strict";
  const HQ=window.HeroQuest;
  const limit=2048,slots=Object.freeze(["weapon","armour","head","shield"]);
  const emptyEquipment=()=>({weapon:null,armour:null,head:null,shield:null});
  const empty=()=>({gold:0,items:[],equipped:emptyEquipment()});
  const fresh=hero=>({gold:0,items:[{id:"starting-"+hero.id,kind:hero.weapon}],equipped:{...emptyEquipment(),weapon:"starting-"+hero.id}});
  const equipped=(hero,item)=>Boolean(item&&Object.values(hero.inventory.equipped||{}).includes(item.id));
  const worn=(hero,slot)=>HQ.itemData.byId[hero.inventory.items.find(item=>item.id===hero.inventory.equipped?.[slot])?.kind];
  function equipmentKinds(inventory){
    const hero={inventory};
    return {weapon:worn(hero,"weapon")?.id||"unarmed",armour:worn(hero,"armour")?.id||null};
  }
  function setInventory(hero,inventory){hero.inventory=inventory;Object.assign(hero,equipmentKinds(inventory));}
  const defenceBonus=hero=>hero.inventory?slots.reduce((sum,slot)=>sum+(worn(hero,slot)?.defence||0),0):0;
  const movementDice=hero=>hero.inventory?worn(hero,"armour")?.movementDice||2:2;
  function validEquipment(hero){
    const gear=hero.inventory.equipped;if(!gear||typeof gear!=="object"||Array.isArray(gear)||Object.keys(gear).length!==slots.length||!slots.every(slot=>Object.hasOwn(gear,slot)))return false;
    for(const slot of slots){
      if(gear[slot]===null)continue;
      const definition=worn(hero,slot);if(typeof gear[slot]!=="string"||definition?.slot!==slot||hero.id==="wizard"&&!definition.wizardAllowed)return false;
    }
    return hero.weapon===(worn(hero,"weapon")?.id||"unarmed")&&hero.armour===(worn(hero,"armour")?.id||null)&&!(worn(hero,"weapon")?.twoHanded&&gear.shield!==null);
  }
  function equipReason(state,hero,itemId,putOn){
    if(!hero)return "Choose a hero.";
    const betweenQuests=HQ.quest.isEnded(state.phase)&&!HQ.armoury.visitReason(state,hero);
    if(!betweenQuests){
      if(state.phase!=="hero-turn"||state.pending||state.heroes[state.turnIndex]?.id!==hero.id)return "Change equipment on this hero’s turn or at the Armoury.";
      if(!HQ.combat.inPlay(hero)||hero.trapped)return "This hero is no longer in the dungeon.";
      if(HQ.topology.unsafe(state,hero))return "Reach a free square before changing equipment.";
    }
    const item=hero.inventory.items.find(item=>item.id===itemId),definition=HQ.itemData.byId[item?.kind];
    if(!definition?.slot)return "This item does not need equipping.";
    if(putOn===equipped(hero,item))return putOn?"Already equipped.":"This item is not equipped.";
    if(!putOn&&definition.slot==="weapon")return "Equip another weapon to replace this one.";
    if(putOn&&hero.id==="wizard"&&!definition.wizardAllowed)return "The Wizard cannot use this equipment.";
    if(definition.slot==="armour"&&state.movement.rolled)return "Change body armour before rolling movement.";
    if(putOn&&definition.slot==="shield"&&worn(hero,"weapon")?.twoHanded)return "Equip a one-handed weapon before using a shield.";
    return "";
  }
  function equip(hero,itemId,putOn){
    const item=hero.inventory.items.find(item=>item.id===itemId),definition=HQ.itemData.byId[item.kind],gear=hero.inventory.equipped;
    gear[definition.slot]=putOn?item.id:null;
    if(putOn&&definition.twoHanded)gear.shield=null;
    Object.assign(hero,equipmentKinds(hero.inventory));
    return definition;
  }
  function removeItem(hero,itemId){
    const index=hero.inventory.items.findIndex(item=>item.id===itemId),[item]=hero.inventory.items.splice(index,1);
    for(const slot of slots)if(hero.inventory.equipped[slot]===itemId){
      const spare=slot==="weapon"?hero.inventory.items.find(other=>other.kind===item.kind):null;
      hero.inventory.equipped[slot]=spare?.id||null;
    }
    Object.assign(hero,equipmentKinds(hero.inventory));return item;
  }
  const effects=()=>({strengthPotion:false,defensePotion:false,heroicBrew:false});
  const healing=item=>Boolean(HQ.itemData.byId[item?.kind]?.healingDice||HQ.itemData.byId[item?.kind]?.healingPoints);
  const potions=hero=>hero.inventory.items.filter(item=>HQ.itemData.byId[item.kind]?.category==="potion");
  function recoveryHero(state) {
    return HQ.recovery.hero(state);
  }
  function reason(state,hero,itemId) {
    if(!hero)return "Choose a hero.";
    const item=hero.inventory.items.find(item=>item.id===itemId),definition=HQ.itemData.byId[item?.kind];
    if(!definition)return "This hero no longer carries that item.";
    if(definition.category!=="potion")return equipped(hero,item)?"Equipped.":"Carried.";
    if(HQ.quest.isEnded(state.phase)||hero.exit||hero.trapped)return "This hero is no longer in the dungeon.";
    if(state.pending?.type==="handoff")return "Finish the device handoff first.";
    const recovery=recoveryHero(state);
    if(recovery&&recovery.id!==hero.id)return "Resolve "+recovery.name+"’s recovery first.";
    if(hero.body<=0&&recovery?.id!==hero.id)return "This hero has fallen.";
    if(hero.body<=0&&!healing(item))return "Only a healing potion can save this hero.";
    if(healing(item)&&hero.body===hero.maxBody)return "Already at full Body.";
    if(definition.effect&&hero.effects[definition.effect])return "This potion’s effect is already ready.";
    if(definition.effect==="heroicBrew"&&state.heroes[state.turnIndex]?.id===hero.id&&state.actionUsed)return "Drink before your attack action.";
    // Combat is resolved before its dice are revealed. Do not pretend a potion
    // drunk afterwards can retroactively change those already-recorded dice.
    if(definition.effect&&state.pending?.type==="report")return "Finish the current result first. Drink before the next attack.";
    return "";
  }
  function drink(state,hero,itemId,die) {
    const index=hero.inventory.items.findIndex(item=>item.id===itemId),item=hero.inventory.items[index],before=hero.body;
    const definition=HQ.itemData.byId[item.kind],redDice=definition.healingDice?[die(state)]:[];
    if(redDice.length)hero.body=Math.min(hero.maxBody,before+redDice[0]);
    else if(definition.healingPoints)hero.body=Math.min(hero.maxBody,before+definition.healingPoints);
    else hero.effects[definition.effect]=true;
    hero.inventory.items.splice(index,1);
    const use={id:state.nextCombatId++,heroId:hero.id,heroName:hero.name,itemId:item.id,itemKind:item.kind,redDice,
      bodyBefore:before,bodyAfter:hero.body,maxBody:hero.maxBody,healed:hero.body-before,detail:definition.summary};
    // Keep the original combat report/CPU cursor intact while the independent
    // potion die is presented. Recovery does not undo the recorded attack.
    if(before===0)state.lastReport.recovery={itemUseId:use.id,bodyAfter:hero.body,healed:use.healed};
    state.lastItemUse=use;return use;
  }
  function giveReason(state,hero,itemId,target=null) {
    if(!hero)return "Choose a hero.";
    if(state.phase!=="hero-turn"||state.pending||state.heroes[state.turnIndex]?.id!==hero.id)return "Give items only on this hero’s turn.";
    if(!HQ.combat.inPlay(hero)||hero.trapped)return "This hero is no longer in the dungeon.";
    const item=hero.inventory.items.find(item=>item.id===itemId);
    if(!item)return "This hero no longer carries that item.";
    if(HQ.topology.unsafe(state,hero))return "Reach a free square before giving an item.";
    if(HQ.itemData.byId[item.kind]?.slot==="armour"&&equipped(hero,item)&&state.movement.rolled)return "Give equipped body armour before rolling movement.";
    const threatened=owner=>state.monsters.some(monster=>HQ.combat.adjacent(state,owner,monster));
    if(threatened(hero))return "Cannot trade while beside a monster.";
    if(target) {
      if(target.id===hero.id)return "Choose another hero.";
      if(!state.heroes.includes(target)||!HQ.combat.inPlay(target)||target.trapped)return "Choose a hero still in the dungeon.";
      if(!HQ.combat.adjacent(state,hero,target))return "Move beside the receiving hero.";
      if(threatened(target))return "The receiving hero is beside a monster.";
      if(HQ.topology.unsafe(state,target))return "The receiving hero must reach a free square.";
      if(target.inventory.items.length>=limit)return "This hero’s inventory is full.";
    } else if(!state.heroes.some(other=>!giveReason(state,hero,itemId,other)))return "No adjacent hero can receive this item away from monsters.";
    return "";
  }
  function giveTargets(state,hero,itemId) {
    if(giveReason(state,hero,itemId))return [];
    return state.heroes.filter(target=>!giveReason(state,hero,itemId,target));
  }
  function give(hero,target,itemId) {
    const item=removeItem(hero,itemId);target.inventory.items.push(item);return item;
  }
  HQ.inventory=Object.freeze({limit,empty,emptyEquipment,equipmentKinds,setInventory,fresh,effects,healing,potions,equipped,worn,defenceBonus,movementDice,validEquipment,equipReason,equip,removeItem,recoveryHero,reason,drink,giveReason,giveTargets,give});
})();

(function () {
  "use strict";
  const HQ=window.HeroQuest;
  const fresh=hero=>({gold:0,items:[{id:"starting-"+hero.id,kind:hero.weapon}]});
  const effects=()=>({strengthPotion:false,defensePotion:false,heroicBrew:false});
  const potions=hero=>hero.inventory.items.filter(item=>HQ.itemData.byId[item.kind]?.category==="potion");
  function recoveryHero(state) {
    const report=state.pending?.type==="report"?state.lastReport:null;
    if(!report?.defeated||report.recovery||!["combat","treasure","trap"].includes(report.type))return null;
    return state.heroes.find(hero=>hero.id===report.defenderId&&hero.body===0&&!hero.trapped&&!hero.exit&&potions(hero).some(item=>item.kind==="potion-of-healing"))||null;
  }
  function reason(state,hero,itemId) {
    if(!hero)return "Choose a hero.";
    const item=hero.inventory.items.find(item=>item.id===itemId),definition=HQ.itemData.byId[item?.kind];
    if(!definition)return "This hero no longer carries that item.";
    if(definition.category!=="potion")return "Already equipped.";
    if(HQ.quest.isEnded(state.phase)||hero.exit||hero.trapped)return "This hero is no longer in the dungeon.";
    if(state.pending?.type==="handoff")return "Finish the device handoff first.";
    const recovery=recoveryHero(state);
    if(recovery&&recovery.id!==hero.id)return "Resolve "+recovery.name+"’s recovery first.";
    if(hero.body<=0&&recovery?.id!==hero.id)return "This hero has fallen.";
    if(hero.body<=0&&item.kind!=="potion-of-healing")return "Only a healing potion can save this hero.";
    if(item.kind==="potion-of-healing"&&hero.body===hero.maxBody)return "Already at full Body.";
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
    if(state.phase!=="hero-turn"||state.pending||state.heroes[state.turnIndex]?.id!==hero.id)return "Give potions only on this hero’s turn.";
    if(!HQ.combat.inPlay(hero)||hero.trapped)return "This hero is no longer in the dungeon.";
    const item=hero.inventory.items.find(item=>item.id===itemId);
    if(!item)return "This hero no longer carries that item.";
    if(HQ.itemData.byId[item.kind]?.category!=="potion")return "Only carried potions can be given.";
    if(HQ.topology.unsafe(state,hero))return "Reach a free square before giving a potion.";
    if(target) {
      if(target.id===hero.id)return "Choose another hero.";
      if(!state.heroes.includes(target)||!HQ.combat.inPlay(target)||target.trapped)return "Choose a hero still in the dungeon.";
      if(target.inventory.items.length>=2048)return "This hero’s inventory is full.";
    } else if(!state.heroes.some(other=>other.id!==hero.id&&HQ.combat.inPlay(other)&&!other.trapped&&other.inventory.items.length<2048))return "No other hero can receive this potion.";
    return "";
  }
  function giveTargets(state,hero,itemId) {
    if(giveReason(state,hero,itemId))return [];
    return state.heroes.filter(target=>!giveReason(state,hero,itemId,target));
  }
  function give(hero,target,itemId) {
    const index=hero.inventory.items.findIndex(item=>item.id===itemId),[item]=hero.inventory.items.splice(index,1);
    target.inventory.items.push(item);return item;
  }
  HQ.inventory=Object.freeze({fresh,effects,potions,recoveryHero,reason,drink,giveReason,giveTargets,give});
})();

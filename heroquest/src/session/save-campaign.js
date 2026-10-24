(function () {
  "use strict";
  const HQ=window.HeroQuest;
  const {object,integer,boolean,expect,ids,itemsValid}=HQ.saveValidation;
  // Keep campaign/escort checks separate from actor and recorded-result checks.
  // The caller owns migration order and passes this save's immutable quest map.
  HQ.validateSavedCampaign=function(s,{Q,T,doorIds,preCampaign}){
    if(Q.escort){
      const escort=s.questState.escort,definition=Q.escort;
      expect(object(escort)&&boolean(s.questState.alarm)&&escort.id===definition.id&&escort.kind===definition.kind&&escort.name===definition.name);
      expect(integer(escort.body,0,definition.body)&&escort.maxBody===definition.body&&escort.defend===definition.defend&&escort.mind===0&&escort.attack===0&&boolean(escort.found)&&escort.found===s.questState.alarm);
      expect(integer(escort.x,0,25)&&integer(escort.row,0,18)&&T.floor.has(T.key(escort.x,escort.row))&&!T.blocked.has(T.key(escort.x,escort.row))&&!T.furniture.has(T.key(escort.x,escort.row)));
      expect([null,"completed"].includes(escort.exit)&&object(escort.effects)&&Object.keys(HQ.spells.heroEffects()).every(flag=>escort.effects[flag]===false));
      expect(escort.found?s.heroes.some(hero=>hero.id===escort.controllerId)||escort.controllerId===null:escort.controllerId===null&&escort.body===definition.body&&escort.x===definition.x&&escort.row===definition.row&&escort.exit===null);
      if(escort.exit)expect(escort.body>0&&T.stairs.has(T.key(escort.x,escort.row)));
      if(escort.found)expect(s.openDoors.length===doorIds.size&&Q.rooms.every(room=>s.discoveredRooms.includes(room)));
    }else expect(Object.keys(s.questState).length===0);
    if(preCampaign)s.campaign=HQ.campaign.fresh(s);
    const campaign=s.campaign,questIds=new Set(HQ.quests.list.map(quest=>quest.id));
    expect(object(campaign)&&integer(campaign.attempt,1)&&boolean(campaign.settled)&&ids(campaign.completed,questIds)&&object(campaign.generations));
    expect(Object.keys(campaign.generations).length===s.heroes.length&&s.heroes.every(hero=>integer(campaign.generations[hero.id],1,campaign.attempt)));
    expect(campaign.completed.every(id=>HQ.quests.byId(id).number<=Q.number));
    if(Q.number>1)expect(HQ.quests.list.filter(quest=>quest.number<Q.number).every(quest=>campaign.completed.includes(quest.id)));
    expect(!campaign.settled||HQ.quest.isEnded(s.phase)&&s.pending===null);
    expect(Array.isArray(campaign.entry)&&campaign.entry.length===s.heroes.length&&ids(campaign.entry.map(hero=>hero?.id),new Set(s.heroes.map(hero=>hero.id))));
    const entryIds=[];
    for(const saved of campaign.entry){
      const owner=s.heroes.find(hero=>hero.id===saved.id);
      expect(object(saved)&&saved.owner===owner.owner&&Array.isArray(saved.spellGroups)&&JSON.stringify(saved.spellGroups)===JSON.stringify(owner.spellGroups));
      expect(object(saved.inventory)&&integer(saved.inventory.gold)&&itemsValid(saved.inventory.items)&&HQ.inventory.validEquipment({...owner,inventory:saved.inventory,...HQ.inventory.equipmentKinds(saved.inventory)}));
      entryIds.push(...saved.inventory.items.map(item=>item.id));
    }
    expect(new Set(entryIds).size===entryIds.length);
    return campaign;
  };
})();

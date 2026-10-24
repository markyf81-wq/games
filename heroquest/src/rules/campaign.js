(function () {
  "use strict";
  const HQ=window.HeroQuest,copy=value=>JSON.parse(JSON.stringify(value));
  const roster=state=>state.heroes.map(hero=>({id:hero.id,owner:hero.owner,spellGroups:[...hero.spellGroups],inventory:copy(hero.inventory)}));
  const fresh=state=>({completed:[],attempt:1,generations:Object.fromEntries(state.heroes.map(hero=>[hero.id,1])),settled:false,entry:roster(state)});
  function settle(state){
    if(!HQ.quest.isEnded(state.phase)||state.pending||state.campaign.settled)return false;
    const campaign=state.campaign,Q=HQ.quests.forState(state);
    if(state.phase==="victory"){
      if(!campaign.completed.includes(Q.id))campaign.completed.push(Q.id);
      const eligible=state.heroes.filter(hero=>hero.exit==="completed");
      if(Q.reward&&eligible.length){
        const share=Math.floor(Q.reward/eligible.length),remainder=Q.reward%eligible.length;
        eligible.forEach((hero,index)=>{hero.inventory.gold+=share+(index<remainder?1:0);});
      }
    }
    for(const hero of state.heroes)if(hero.body>0){
      hero.body=hero.maxBody;hero.mind=HQ.combatData.heroes[hero.id].mind;hero.spellsUsed=[];
      hero.effects={...HQ.spells.heroEffects(),...HQ.inventory.effects()};
    }
    campaign.settled=true;return true;
  }
  function reason(state,mode){
    if(HQ.sandbox?.active)return "Campaign travel is only available in the adventure.";
    if(!HQ.quest.isEnded(state.phase)||state.pending||!state.campaign.settled)return "Finish the quest and its results first.";
    if(!["next","retry"].includes(mode))return "Choose the next quest or retry.";
    if(mode==="next"&&(state.phase!=="victory"||!HQ.quests.next(state)))return "The next quest is not available yet.";
    return "";
  }
  function sessionConfig(heroes,questId,settings){
    const groups=hero=>hero.spellGroups.length?hero.spellGroups:hero.id==="wizard"?["Air","Fire","Water"]:["Earth"];
    return {questId,heroIds:heroes.map(hero=>hero.id),owners:Object.fromEntries(heroes.map(hero=>[hero.id,hero.owner])),
      spellGroups:Object.fromEntries(heroes.filter(HQ.spells.isCaster).map(hero=>[hero.id,groups(hero)])),fairLootRecovery:settings.fairLootRecovery};
  }
  function embark(state,mode){
    const Q=mode==="next"?HQ.quests.next(state):HQ.quests.forState(state),campaign=copy(state.campaign);
    const next=HQ.exploration.createSession(sessionConfig(state.heroes,Q.id,state.settings),state.rng);
    campaign.attempt++;campaign.settled=false;
    for(const hero of next.heroes){
      const previous=state.heroes.find(other=>other.id===hero.id);
      if(previous.body>0)HQ.inventory.setInventory(hero,copy(previous.inventory));
      else campaign.generations[hero.id]++;
    }
    rekey(next.heroes,campaign.attempt);
    next.campaign=campaign;next.campaign.entry=roster(next);
    return next;
  }
  function rekey(heroes,attempt){
    // A new physical Treasure deck cannot reuse IDs of carried cards. This
    // also separates inherited starting weapons from replacement equipment.
    let serial=0;
    for(const hero of heroes){
      const ids=new Map(hero.inventory.items.map(item=>[item.id,"carried-"+attempt+"-"+(++serial)]));
      for(const item of hero.inventory.items)item.id=ids.get(item.id);
      for(const slot of ["weapon","armour","head","shield"])if(hero.inventory.equipped[slot])hero.inventory.equipped[slot]=ids.get(hero.inventory.equipped[slot]);
    }
  }
  function restart(state){
    const entry=state.campaign.entry;
    const next=HQ.exploration.createSession(sessionConfig(entry,state.contentVersion,state.settings),state.rng);
    for(const hero of next.heroes)HQ.inventory.setInventory(hero,copy(entry.find(saved=>saved.id===hero.id).inventory));
    rekey(next.heroes,state.campaign.attempt);
    next.campaign={...copy(state.campaign),settled:false,entry:roster(next)};return next;
  }
  HQ.campaign=Object.freeze({fresh,roster,settle,reason,embark,restart});
})();

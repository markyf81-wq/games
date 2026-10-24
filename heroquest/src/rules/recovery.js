(function () {
  "use strict";
  const HQ=window.HeroQuest,T=HQ.topology,C=HQ.combat;
  const casualtyTypes=new Set(["combat","treasure","trap","stone-move"]);
  const actionSpent=(state,hero)=>state.phase==="hero-turn"&&state.heroes[state.turnIndex].id===hero.id?state.actionUsed:hero.actionUsed;
  function casualty(state){
    const report=state.pending?.type==="report"?state.lastReport:null;
    if(!report||!casualtyTypes.has(report.type)||!report.defeated||report.recovery)return null;
    return state.heroes.find(hero=>hero.id===report.defenderId&&hero.body===0&&!hero.exit&&!hero.deathResolved)||null;
  }
  function healingSpells(state,hero=casualty(state)){
    if(!hero||HQ.quest.isEnded(state.phase)||hero.trapped||actionSpent(state,hero)||!HQ.spells.isCaster(hero))return [];
    return HQ.spells.book(hero).filter(card=>HQ.spells.healing(card)&&!hero.spellsUsed.includes(card.id));
  }
  function hero(state){
    if(HQ.quest.isEnded(state.phase))return null;
    const fallen=casualty(state);
    return fallen&&!fallen.trapped&&(HQ.inventory.potions(fallen).some(HQ.inventory.healing)||healingSpells(state,fallen).length)?fallen:null;
  }
  function spellReason(state,owner,spellId){
    if(!owner||casualty(state)?.id!==owner.id||owner.trapped)return "Only the hero currently facing death can save themselves.";
    if(actionSpent(state,owner))return "This hero has already used their action.";
    if(!healingSpells(state,owner).some(card=>card.id===spellId))return "Choose an unused healing spell from this hero’s own spellbook.";
    return "";
  }
  function cast(state,owner,spellId){
    owner.spellsUsed.push(spellId);owner.actionUsed=true;owner.body=Math.min(owner.maxBody,4);
    if(state.heroes[state.turnIndex].id===owner.id){
      state.actionUsed=true;state.extraAttack=false;
      if(state.phase==="hero-turn"&&state.movement.started){state.movement.closed=true;state.movement.remaining=0;}
    }
    state.lastReport.recovery={spellId,spellReportId:state.nextCombatId++,bodyAfter:owner.body,healed:owner.body};
  }
  function spellReport(state){
    const report=state.lastReport,recovery=report?.recovery,owner=state.heroes.find(hero=>hero.id===report?.defenderId);
    return recovery?.spellId&&owner?{type:"spell",id:recovery.spellReportId,spellId:recovery.spellId,
      attackerId:owner.id,attackerName:owner.name,defenderId:owner.id,defenderName:owner.name,
      bodyBefore:0,bodyAfter:recovery.bodyAfter,maxBody:owner.maxBody,healed:recovery.healed,damage:0}:null;
  }
  function sameArea(state,origin,figure){
    const from=T.key(origin.x,origin.row),to=C.cell(figure),region=T.regions.get(from);
    return region==="corridor"?HQ.dungeon.corridorCells(state,from).has(to):Boolean(region&&region===T.regions.get(to));
  }
  function dropPosition(state,fallen){
    const clear=id=>T.floor.has(id)&&!T.blockedAt(state,id)&&!T.furniture.has(id);
    if(clear(C.cell(fallen)))return {x:fallen.x,row:fallen.row};
    // Entrapment/rubble must still leave an accessible bag. Prefer the closest
    // known clear square, also guarding legacy off-board phasing saves.
    const distance=id=>{const [x,row]=T.parse(id);return Math.abs(x-fallen.x)+Math.abs(row-fallen.row);};
    const candidates=HQ.quests.current.floor.filter(clear),known=candidates.filter(id=>state.discoveredCells.includes(id));
    const id=(known.length?known:candidates).reduce((best,id)=>distance(id)<distance(best)?id:best);
    const [x,row]=T.parse(id);return {x,row};
  }
  function heirs(state,fallen=casualty(state)){
    if(!fallen||state.settings.fairLootRecovery||fallen.trapped||!fallen.inventory.items.length&&!fallen.inventory.gold)return [];
    return state.heroes.filter(other=>other.id!==fallen.id&&C.inPlay(other)&&!T.unsafe(state,other)&&sameArea(state,fallen,other)
      &&other.inventory.items.length+fallen.inventory.items.length<=HQ.inventory.limit&&Number.isSafeInteger(other.inventory.gold+fallen.inventory.gold));
  }
  const needsChoice=state=>heirs(state).length>1;
  function finalize(state,fallen,recipientId){
    const position=dropPosition(state,fallen),inventory=fallen.inventory;
    // Previously sealed bags keep their ownership even if the setting changes.
    for(const bag of state.belongings)if(bag.carrierId===fallen.id){Object.assign(bag,position);bag.carrierId=null;}
    let outcome,recipient=null;
    if(state.settings.fairLootRecovery){
      state.belongings.push({id:"fallen-"+fallen.id,heroId:fallen.id,...position,carrierId:null,
        gold:inventory.gold,items:inventory.items,equipped:{...inventory.equipped}});
      outcome="dropped";
    }else{
      const eligible=heirs(state,fallen);recipient=eligible.find(hero=>hero.id===recipientId)||(eligible.length===1?eligible[0]:null);
      if(recipient){recipient.inventory.items.push(...inventory.items);recipient.inventory.gold+=inventory.gold;outcome="claimed";}
      else outcome=inventory.items.length||inventory.gold?"lost":"empty";
    }
    HQ.inventory.setInventory(fallen,HQ.inventory.empty());fallen.deathResolved=true;
    state.lastReport.belongings={outcome,recipientId:recipient?.id||null,items:inventory.items.length,gold:inventory.gold};
  }
  function takeReason(state,owner,loot){
    if(!owner||!loot)return "Choose a hero and a fallen hero’s bag.";
    if(state.phase!=="hero-turn"||state.pending||state.heroes[state.turnIndex].id!==owner.id||!C.inPlay(owner))return "Pick up bags on this hero’s turn.";
    if(loot.carrierId)return "This bag is already being carried.";
    if(T.unsafe(state,owner))return "Reach a free square before picking up a bag.";
    if(!T.connected(C.cell(owner),T.key(loot.x,loot.row),state))return "Stand next to the bag, with no wall or closed door between you.";
    return "";
  }
  function take(state,owner,loot){loot.carrierId=owner.id;}
  const revived=(state,owner)=>Boolean(state.questRecovery?.some(record=>record.heroId===owner.id));
  function complete(state){
    if(state.phase!=="victory"||state.pending||state.questRecovery!==null)return false;
    state.questRecovery=[];
    for(const bag of state.belongings){
      const owner=state.heroes.find(hero=>hero.id===bag.heroId);
      const carrier=state.heroes.find(hero=>hero.id===bag.carrierId&&hero.exit==="completed");
      if(carrier){
        HQ.inventory.setInventory(owner,{gold:bag.gold,items:bag.items,equipped:{...bag.equipped}});
      }
      owner.body=owner.maxBody;owner.trapped=false;owner.spellsUsed=[];owner.actionUsed=true;
      owner.effects={...HQ.spells.heroEffects(),...HQ.inventory.effects()};
      const Q=HQ.quests.forState(state),starting=Q.starts?.[owner.id]||[HQ.heroes.find(hero=>hero.id===owner.id).x,HQ.heroes.find(hero=>hero.id===owner.id).row];[owner.x,owner.row]=starting;
      // deathResolved keeps the revived hero out of this finished board's
      // occupancy/turn order; questRecovery records the between-quest result.
      state.questRecovery.push({heroId:owner.id,carrierId:carrier?.id||null,
        items:carrier?bag.items.length:0,gold:carrier?bag.gold:0});
    }
    state.belongings=[];
    return true;
  }
  HQ.recovery=Object.freeze({casualty,healingSpells,hero,spellReason,cast,spellReport,sameArea,heirs,needsChoice,finalize,takeReason,take,complete,revived});
})();

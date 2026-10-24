(function () {
  "use strict";
  const HQ=window.HeroQuest,Data=HQ.combatData;
  // Validate and migrate a detached save in the original dependency order.
  const object=value=>value!==null&&typeof value==="object"&&!Array.isArray(value);
  const integer=(value,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
  const boolean=value=>typeof value==="boolean";
  const itemsValid=items=>Array.isArray(items)&&items.length<=HQ.inventory.limit&&items.every(item=>object(item)&&typeof item.id==="string"&&/^[a-z0-9-]{1,80}$/.test(item.id)&&Object.hasOwn(HQ.itemData.byId,item.kind));
  function expect(condition){if(!condition)throw new Error("The saved adventure is incomplete or incompatible. It has been kept, but could not be resumed.");}
  function ids(values,allowed){return Array.isArray(values)&&new Set(values).size===values.length&&values.every(id=>allowed.has(id));}
  function validate(snapshot,{slot,version}) {
    expect(object(snapshot)&&snapshot.version===version&&object(snapshot.state));
    const s=snapshot.state,Q=HQ.quests.forState(s);expect(Q);
    const T=HQ.topology.forQuest(Q),preCampaign=integer(s.schemaVersion,2,15);
    if(preCampaign){expect(Q.id===HQ.quests.first.id);s.questState={};}
    expect(object(s.questState));
    const preRuleSettings=integer(s.schemaVersion,2,13);
    if(preRuleSettings&&object(s.settings))s.settings.fairLootRecovery=false;
    const preSealedBags=integer(s.schemaVersion,2,12);if(preSealedBags)s.questRecovery=null;
    const preRecovery=integer(s.schemaVersion,2,11);if(preRecovery)s.belongings=[];
    const preSearches=[2,3,4,5,6,7,8,9].includes(s.schemaVersion);
    const preEquipment=[2,3,4,5,6,7,8].includes(s.schemaVersion);
    const preDungeon=[2,3,4,5,6,7].includes(s.schemaVersion);
    if(preDungeon)s.dungeon=HQ.dungeon.fresh();
    expect(object(s.dungeon)&&Object.hasOwn(HQ.dungeonData.layouts,s.dungeon.layout)&&(slot==="sandbox"?Q.id===HQ.quests.first.id:s.dungeon.layout===(Q.dungeonLayout||"trial"))&&object(s.dungeon.traps));
    const trapDefinitions=HQ.dungeon.traps(s),trapIds=new Set(trapDefinitions.map(trap=>trap.id)),searchAreaCount=Q.rooms.length+trapDefinitions.filter(trap=>trap.kind==="pit").length;
    expect(Object.keys(s.dungeon.traps).length===trapIds.size&&Object.keys(s.dungeon.traps).every(id=>trapIds.has(id)));
    for(const trap of trapDefinitions){const entry=s.dungeon.traps[trap.id];expect(object(entry)&&["hidden","found","sprung","disarmed"].includes(entry.status)&&integer(entry.foundRound,0,s.round)&&integer(entry.foundTurn,0,3));}
    if(preSearches)s.dungeon.searched={traps:[],doors:[]};
    const searched=s.dungeon.searched,searchKeys=new Set([...Q.rooms,...trapDefinitions.filter(trap=>trap.kind==="pit").map(trap=>"pit:"+trap.id),...[...T.regions].filter(([,region])=>region==="corridor").map(([id])=>id)]);
    expect(object(searched)&&Object.keys(searched).length===2&&ids(searched.traps,searchKeys)&&ids(searched.doors,searchKeys));
    const heroIds=new Set(HQ.heroes.map(h=>h.id)),originalMonsterIds=new Set(Q.monsters.map(m=>m.id));
    const preTreasure=[2,3,4,5,6].includes(s.schemaVersion);
    expect(Array.isArray(s.monsters)&&s.monsters.length>=Q.monsters.length&&s.monsters.length<=Q.monsters.length+HQ.heroes.length*searchAreaCount);
    const monsterIds=new Set(s.monsters.map(monster=>monster?.id));
    expect(monsterIds.size===s.monsters.length&&[...originalMonsterIds].every(id=>monsterIds.has(id)));
    expect(s.monsters.every(monster=>originalMonsterIds.has(monster.id)||!preTreasure&&/^wanderer-[1-9][0-9]*$/.test(monster.id)&&monster.kind===Q.wanderingMonster.kind));
    const entityIds=new Set([...monsterIds,...Q.furniture.map(f=>f.id)]),doorIds=new Set(HQ.dungeon.doors(s).map(d=>d.id));
    const legacy=s.schemaVersion===2,preSpells=legacy||s.schemaVersion===3,oldEffects=preSpells||s.schemaVersion===4,preInventory=oldEffects||s.schemaVersion===5;
    expect((preSearches||[10,11,12,13,14,15,16].includes(s.schemaVersion))&&s.contentVersion===Q.id&&["hero-turn","monster-turn","defeat", "victory", "retreat"].includes(s.phase));
    if(legacy)expect(["hero-turn","monster-turn","defeat"].includes(s.phase));
    expect(Array.isArray(s.heroes)&&s.heroes.length>=1&&s.heroes.length<=4&&ids(s.heroes.map(h=>h?.id),heroIds));
    if(preTreasure)expect(s.monsters.length===Q.monsters.length);
    expect(s.questRecovery===null||Array.isArray(s.questRecovery)&&s.questRecovery.length<=s.heroes.length&&s.questRecovery.every(record=>object(record)&&s.heroes.some(hero=>hero.id===record.heroId))&&new Set(s.questRecovery.map(record=>record.heroId)).size===s.questRecovery.length);
    if(s.questRecovery!==null)expect(s.phase==="victory"&&s.pending===null&&Array.isArray(s.belongings)&&s.belongings.length===0);
    for(const actor of [...s.heroes,...s.monsters]) {
      expect(object(actor)&&Number.isSafeInteger(actor.x)&&Number.isSafeInteger(actor.row)&&T.rockBounds(T.key(actor.x,actor.row)));
      const hero=heroIds.has(actor.id),definition=hero?HQ.heroes.find(h=>h.id===actor.id):Q.monsters.find(m=>m.id===actor.id)||{kind:Q.wanderingMonster.kind};
      const stats=hero?Data.heroes[actor.id]:Data.monsters[definition.kind];
      if(hero&&oldEffects)actor.trapped=false;
      const phasing=!oldEffects&&hero&&s.phase==="hero-turn"&&s.heroes[s.turnIndex]?.id===actor.id&&object(s.movement)&&s.movement.rolled&&s.movement.remaining>0&&!s.movement.closed&&T.magic(s,actor,"passThroughRock")&&actor.body>0&&!actor.exit&&(s.pending===null||s.pending?.type==="report"&&s.lastReport?.type==="trap"&&s.lastReport.defenderId===actor.id&&!s.lastReport.endTurn);
      expect(hero&&actor.trapped?actor.body===0:phasing||T.floor.has(T.key(actor.x,actor.row))&&!T.blocked.has(T.key(actor.x,actor.row))&&!T.furniture.has(T.key(actor.x,actor.row)));
      if(actor.body>0&&HQ.dungeon.blocked(s).includes(T.key(actor.x,actor.row)))expect(phasing||hero&&s.pending?.type==="report"&&s.lastReport?.type==="trap"&&s.lastReport.defenderId===actor.id&&s.lastReport.fallingFrom&&!s.lastReport.escaped);
      expect(actor.kind===definition.kind&&typeof actor.name==="string"&&actor.name.length>0&&integer(actor.body,0,stats.body)&&actor.maxBody===stats.body);
      for(const field of ["defend","mind",...(hero?[]:["movement"])])expect(actor[field]===stats[field]);
      expect(actor.attack===(!hero&&definition.note==="C"?Q.notes.C.attackDice:stats.attack));
      if(hero) {
        expect(typeof actor.owner==="string"&&actor.owner.length>0&&actor.owner.length<=24);
        if(preInventory)actor.inventory=HQ.inventory.fresh(actor);
        expect(object(actor.inventory)&&integer(actor.inventory.gold)&&itemsValid(actor.inventory.items));
        if(preEquipment){
          expect(actor.weapon===stats.weapon&&actor.armour===stats.armour&&actor.inventory.items.filter(item=>item.kind===actor.weapon).length===1&&actor.inventory.items.every(item=>HQ.itemData.byId[item.kind].category==="potion"||item.kind===actor.weapon||item.kind==="tool-kit"));
          actor.inventory.equipped={weapon:actor.inventory.items.find(item=>item.kind===actor.weapon).id,armour:null,head:null,shield:null};
        }
        expect(HQ.inventory.validEquipment(actor));
        if(preRecovery){
          actor.actionUsed=s.heroes[s.turnIndex]?.id===actor.id?s.actionUsed:true;
          actor.deathResolved=actor.body===0&&!(s.pending?.type==="report"&&s.lastReport?.defenderId===actor.id&&s.lastReport.defeated&&!s.lastReport.recovery);
          // Already-removed historical heroes do not create retroactive loot.
          if(actor.deathResolved){HQ.inventory.setInventory(actor,HQ.inventory.empty());}
        }
        expect(boolean(actor.actionUsed)&&boolean(actor.deathResolved));
        if(actor.deathResolved)expect(HQ.recovery.revived(s,actor)?actor.body===actor.maxBody&&!actor.trapped&&actor.exit===null&&actor.spellsUsed.length===0:actor.body===0&&actor.inventory.gold===0&&actor.inventory.items.length===0);
        else expect(!HQ.recovery.revived(s,actor));
        if(legacy){expect(actor.exit===undefined||actor.exit===null);actor.exit=null;}
        expect([null,"completed","retreated"].includes(actor.exit));
        if(actor.exit)expect(actor.body>0&&T.stairs.has(T.key(actor.x,actor.row)));
        if(actor.exit==="completed")expect(HQ.quest.objectiveComplete(s));
        // Existing adventures never silently acquire unused spells mid-quest.
        if(preSpells){actor.spellGroups=[];actor.spellsUsed=[];actor.effects=HQ.spells.heroEffects();}
        else if(oldEffects)actor.effects={...HQ.spells.heroEffects(),...actor.effects};
        if(preTreasure)actor.effects={...HQ.inventory.effects(),...actor.effects};
        expect(ids(actor.spellGroups,new Set(HQ.spellData.groups))&&ids(actor.spellsUsed,new Set(HQ.spells.book(actor).map(card=>card.id))));
        expect(HQ.spells.isCaster(actor)?actor.spellGroups.length===0||actor.spellGroups.length===(actor.id==="wizard"?3:1):actor.spellGroups.length===0);
        expect(object(actor.effects)&&Object.keys({...HQ.spells.heroEffects(),...HQ.inventory.effects()}).every(flag=>boolean(actor.effects[flag]))&&boolean(actor.trapped));
      } else {
        // Additive death provenance: never infer deaths from zero-health
        // sandbox omissions. An original pending/last kill is recovered below.
        if(actor.diedInPlay===undefined)actor.diedInPlay=false;
        expect(boolean(actor.diedInPlay)&&(!actor.diedInPlay||actor.body===0));
        if(preSpells)actor.effects=HQ.spells.monsterEffects();else if(oldEffects)actor.effects={...HQ.spells.monsterEffects(),...actor.effects};
        expect(object(actor.effects)&&Object.keys(HQ.spells.monsterEffects()).every(flag=>boolean(actor.effects[flag])));
      }
    }
    const campaign=HQ.validateSavedCampaign(s,{Q,T,doorIds,preCampaign});
    const elf=s.heroes.find(hero=>hero.id==="elf"),wizard=s.heroes.find(hero=>hero.id==="wizard");
    expect(Array.isArray(s.belongings)&&s.belongings.length<=s.heroes.length&&new Set(s.belongings.map(loot=>loot?.id)).size===s.belongings.length);
    for(const loot of s.belongings){
      const owner=s.heroes.find(hero=>hero.id===loot?.heroId);
      expect(object(loot)&&owner&&owner.deathResolved&&owner.body===0&&loot.id==="fallen-"+owner.id&&Number.isSafeInteger(loot.x)&&Number.isSafeInteger(loot.row)&&T.floor.has(T.key(loot.x,loot.row))&&integer(loot.gold)&&itemsValid(loot.items));
      if(preSealedBags){loot.carrierId=null;loot.equipped=HQ.inventory.emptyEquipment();}
      const carrier=s.heroes.find(hero=>hero.id===loot.carrierId);
      expect(loot.carrierId===null||carrier&&carrier.id!==owner.id&&!carrier.deathResolved&&(carrier.body>0||HQ.recovery.casualty(s)?.id===carrier.id));
      const inventory={gold:loot.gold,items:loot.items,equipped:loot.equipped};
      expect(HQ.inventory.validEquipment({...owner,inventory,...HQ.inventory.equipmentKinds(inventory)}));
    }
    if(s.questRecovery!==null){
      for(const result of s.questRecovery){
        const owner=s.heroes.find(hero=>hero.id===result.heroId);
        expect(owner.deathResolved&&integer(result.items,0,HQ.inventory.limit)&&integer(result.gold));
        // These are historical return counts. Later Armoury trades may change
        // the revived owner's current gold, holdings and equipped slots.
        expect(result.carrierId===null?result.items===0&&result.gold===0:s.heroes.some(hero=>hero.id===result.carrierId&&hero.exit==="completed"));
      }
    }

    const itemIds=[...s.heroes.flatMap(hero=>hero.inventory.items.map(item=>item.id)),...s.belongings.flatMap(loot=>loot.items.map(item=>item.id))];expect(new Set(itemIds).size===itemIds.length);
    if(preTreasure){s.treasure=HQ.treasure.fresh(s.heroes);s.extraAttack=false;}
    const treasure=s.treasure,cardIds=new Set(HQ.treasureData.instances.map(card=>card.id)),roomIds=new Set([...Q.rooms,...trapDefinitions.filter(trap=>trap.kind==="pit").map(trap=>"pit:"+trap.id)]);
    expect(object(treasure)&&ids(treasure.deck,cardIds)&&ids(treasure.removed,cardIds)&&treasure.deck.length+treasure.removed.length===cardIds.size&&new Set([...treasure.deck,...treasure.removed]).size===cardIds.size);
    expect(treasure.removed.every(id=>["gold","potion"].includes(HQ.treasureData.byId[HQ.treasureData.instancesById[id].kind].category)));
    expect(object(treasure.searched)&&Object.keys(treasure.searched).length===s.heroes.length&&s.heroes.every(hero=>ids(treasure.searched[hero.id],roomIds)));
    expect(ids(treasure.claimed,new Set(Object.keys(Q.treasureRooms)))&&treasure.claimed.every(id=>s.heroes.some(hero=>treasure.searched[hero.id].includes(id))));
    expect(integer(treasure.nextMonster,1,HQ.heroes.length*searchAreaCount+1)&&s.monsters.filter(monster=>!originalMonsterIds.has(monster.id)).every(monster=>integer(Number(monster.id.slice(9)),1,treasure.nextMonster-1)));
    expect(boolean(s.extraAttack)&&(!s.extraAttack||s.phase==="hero-turn"&&s.actionUsed));
    for(const hero of s.heroes)for(const item of hero.inventory.items)if(item.id.startsWith("treasure-"))expect(treasure.removed.includes(item.id)&&HQ.treasureData.instancesById[item.id]?.kind===item.kind);
    for(const loot of s.belongings)for(const item of loot.items)if(item.id.startsWith("treasure-"))expect(treasure.removed.includes(item.id)&&HQ.treasureData.instancesById[item.id]?.kind===item.kind);
    if(elf&&wizard)expect(!elf.spellGroups.some(group=>wizard.spellGroups.includes(group)));
    expect(integer(s.turnIndex,0,s.heroes.length-1)&&integer(s.round,1)&&integer(s.rng,1,4294967295)&&boolean(s.actionUsed));
    if(s.phase==="hero-turn")expect(s.heroes[s.turnIndex].actionUsed===s.actionUsed);
    expect(integer(s.nextEventId,1)&&integer(s.nextCombatId,1)&&object(s.settings)&&boolean(s.settings.realisticLOS)&&boolean(s.settings.fairLootRecovery));
    const m=s.movement;if(oldEffects){m.veilOfMist=false;m.passThroughRock=false;}
    if(preEquipment)m.swiftWind=Array.isArray(m.dice)&&m.dice.length===4;
    expect(object(m)&&boolean(m.rolled)&&boolean(m.started)&&boolean(m.closed)&&boolean(m.veilOfMist)&&boolean(m.passThroughRock)&&integer(m.remaining,0,24));
    if(m.rockTrail===undefined)m.rockTrail=[];
    expect(Array.isArray(m.rockTrail)&&m.rockTrail.length<=64&&m.rockTrail.every(id=>typeof id==="string"&&T.rockBounds(id)));
    if(m.rockTrail.length){
      expect(m.rolled&&m.remaining>0&&!m.closed&&s.phase==="hero-turn"&&T.magic(s,s.heroes[s.turnIndex],"passThroughRock")&&m.rockTrail.at(-1)===T.key(s.heroes[s.turnIndex].x,s.heroes[s.turnIndex].row));
      for(let i=1;i<m.rockTrail.length;i++){
        const [x,row]=T.parse(m.rockTrail[i-1]),[nx,nr]=T.parse(m.rockTrail[i]);expect(Math.abs(x-nx)+Math.abs(row-nr)===1);
      }
    }
    const moveCount=HQ.inventory.movementDice(s.heroes[s.turnIndex])*(m.swiftWind?2:1);
    expect(boolean(m.swiftWind)&&Array.isArray(m.dice)&&(m.rolled?m.dice.length===moveCount:m.dice.length===0&&!m.swiftWind)&&m.dice.every(d=>integer(d,1,6)));
    expect(m.rolled?m.remaining<=m.dice.reduce((a,b)=>a+b,0):m.remaining===0&&!m.started&&!m.closed&&!m.veilOfMist&&!m.passThroughRock);
    expect(ids(s.openDoors,doorIds)&&ids(s.discoveredDoors,doorIds)&&s.openDoors.every(id=>s.discoveredDoors.includes(id)));
    expect(ids(s.discoveredCells,T.floor)&&ids(s.discoveredRooms,new Set(Q.rooms))&&ids(s.discoveredEntities,entityIds));
    expect(object(s.monsterMemory));
    for(const [id,memory] of Object.entries(s.monsterMemory))expect(monsterIds.has(id)&&object(memory)&&memory.id===id&&integer(memory.x)&&integer(memory.row)&&T.floor.has(T.key(memory.x,memory.row))&&s.discoveredEntities.includes(id));
    expect(Array.isArray(s.log)&&s.log.length<=60&&s.log.every(event=>object(event)&&integer(event.id,1)&&typeof event.text==="string"));
    if(preInventory)s.lastItemUse=null;
    HQ.validateSavedReports(s,{Q,T,heroIds,monsterIds,doorIds,trapIds,trapDefinitions,roomIds,treasure,itemIds,oldEffects});
    if(s.phase==="monster-turn"){
      if(oldEffects&&object(s.monsterTurn))s.monsterTurn.resumeId=null;
      expect(object(s.monsterTurn)&&ids(s.monsterTurn.queue,monsterIds)&&s.monsterTurn.queue.length>0&&integer(s.monsterTurn.index,0,s.monsterTurn.queue.length));
      expect(s.monsterTurn.resumeId===null||s.monsterTurn.resumeId===s.monsterTurn.queue[s.monsterTurn.index-1]&&(s.pending===null||s.pending.type==="report")&&s.lastReport?.type==="sleep-check"&&s.lastReport.awake&&s.lastReport.attackerId===s.monsterTurn.resumeId);
    }
    else expect(s.monsterTurn===null);
    const outcome=HQ.quest.outcome(s);
    expect(HQ.quest.isEnded(s.phase)?outcome===s.phase:outcome===null||Boolean(HQ.inventory.recoveryHero(s)));
    const awaitingOwnDefeat=s.pending?.type==="report"&&s.lastReport?.defeated&&!s.lastReport.recovery&&s.lastReport.defenderId===s.heroes[s.turnIndex]?.id&&["combat","treasure","stone-move","trap"].includes(s.lastReport.type);
    if(s.phase==="hero-turn")expect(HQ.combat.inPlay(s.heroes[s.turnIndex])||awaitingOwnDefeat);
    if(s.pending!==null) {
      expect(object(s.pending));
      if(s.pending.type==="handoff")expect(s.phase==="hero-turn"&&s.pending.heroId===s.heroes[s.turnIndex].id);
      else if(s.pending.type==="monster-intro")expect(s.phase==="monster-turn");
      else if(s.pending.type==="escort"){
        const escort=s.questState.escort,pending=s.pending;
        expect(Q.escort&&s.phase==="hero-turn"&&escort?.found&&HQ.combat.inPlay(escort)&&escort.controllerId===s.heroes[s.turnIndex].id&&pending.heroId===escort.controllerId);
        expect(boolean(pending.ready)&&integer(pending.remaining,0,6)&&(pending.die===null?!pending.ready&&pending.remaining===0:integer(pending.die,1,6)&&pending.remaining<=pending.die));
      }
      else expect(s.pending.type==="report"&&s.lastReport&&s.pending.reportId===s.lastReport.id);
    }
    expect([null,"briefing","movement"].includes(snapshot.screen));
    if(snapshot.screen)expect(s.phase==="hero-turn"&&s.pending===null&&(snapshot.screen!=="movement"||m.rolled));
    // Additive presentation field: older v1 saves already show their reports.
    snapshot.dice=snapshot.dice??null;
    if(snapshot.dice!==null) {
      const d=snapshot.dice;expect(object(d)&&boolean(d.rolled));
      if(d.stage==="item")expect(s.lastItemUse?.redDice.length&&d.reportId===s.lastItemUse.id&&d.rolled&&!HQ.quest.isEnded(s.phase));
      else {
        expect(s.pending?.type==="report"&&d.reportId===s.lastReport.id);
        if(d.stage==="trap")expect(s.lastReport.type==="trap"&&integer(d.part,0,s.lastReport.rolls.length-1));
        else if(d.stage==="spell")expect(["spell","sleep-check"].includes(s.lastReport.type)&&s.lastReport.redDice.length>0);
        else {expect(s.lastReport.type==="combat"&&["attack","defence"].includes(d.stage));if(d.stage==="defence")expect(s.lastReport.defendDice.length>0);}
      }
    }
    if(["combat","spell"].includes(s.lastReport?.type)&&s.lastReport.defeated){
      const killed=s.monsters.find(monster=>monster.id===s.lastReport.defenderId&&monster.body===0);
      if(killed)killed.diedInPlay=true;
    }
    // Legacy migrations add unexited status, empty books/inactive effects and
    // the already-equipped starting weapon, zero gold and no free potions.
    // Never replenish a quest's spells or reroll/replay an existing report.
    // Retain the old field for schema compatibility, but all discovered figures
    // now stay visible. Replace stale sight-mode memories with displayed positions.
    s.settings.realisticLOS=false;
    s.monsterMemory=Object.fromEntries(s.monsters.filter(monster=>monster.body>0&&s.discoveredEntities.includes(monster.id))
      .map(monster=>[monster.id,{id:monster.id,x:monster.x,row:monster.row}]));
    s.schemaVersion=HQ.exploration.schemaVersion;
    // Only saved sealed bags can settle under fair recovery; historical deaths
    // never create new loot or a retroactive revival.
    if(preSealedBags)HQ.recovery.complete(s);
    else expect(s.phase!=="victory"||s.pending!==null||s.questRecovery!==null);
    if(preCampaign)HQ.campaign.settle(s);
    else expect(!HQ.quest.isEnded(s.phase)||s.pending!==null||campaign.settled);
    return snapshot;
  }
  HQ.saveValidation=Object.freeze({validate,object,integer,boolean,expect,ids,itemsValid});
})();

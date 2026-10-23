(function () {
  "use strict";
  const HQ=window.HeroQuest,Q=HQ.trial,T=HQ.topology,Data=HQ.combatData;
  const slot=HQ.sandbox?.active?"sandbox":"adventure",key=slot==="sandbox"?"heroquest.sandbox.v1":"heroquest.session.v1",version=1;
  const fileFormat="heroquest-save",fileVersion=1,maxFileBytes=2*1024*1024;
  const object=value=>value!==null&&typeof value==="object"&&!Array.isArray(value);
  const integer=(value,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
  const boolean=value=>typeof value==="boolean";
  function expect(condition){if(!condition)throw new Error("The saved adventure is incomplete or incompatible. It has been kept, but could not be resumed.");}
  function ids(values,allowed){return Array.isArray(values)&&new Set(values).size===values.length&&values.every(id=>allowed.has(id));}
  function validate(snapshot) {
    expect(object(snapshot)&&snapshot.version===version&&object(snapshot.state));
    const s=snapshot.state;
    const preDungeon=[2,3,4,5,6,7].includes(s.schemaVersion);
    if(preDungeon)s.dungeon=HQ.dungeon.fresh();
    expect(object(s.dungeon)&&Object.hasOwn(HQ.dungeonData.layouts,s.dungeon.layout)&&(slot==="sandbox"||s.dungeon.layout==="trial")&&object(s.dungeon.traps));
    const trapDefinitions=HQ.dungeon.traps(s),trapIds=new Set(trapDefinitions.map(trap=>trap.id)),searchAreaCount=Q.rooms.length+trapDefinitions.filter(trap=>trap.kind==="pit").length;
    expect(Object.keys(s.dungeon.traps).length===trapIds.size&&Object.keys(s.dungeon.traps).every(id=>trapIds.has(id)));
    for(const trap of trapDefinitions){const entry=s.dungeon.traps[trap.id];expect(object(entry)&&["hidden","found","sprung","disarmed"].includes(entry.status)&&integer(entry.foundRound,0,s.round)&&integer(entry.foundTurn,0,3));}
    const heroIds=new Set(HQ.heroes.map(h=>h.id)),originalMonsterIds=new Set(Q.monsters.map(m=>m.id));
    const preTreasure=[2,3,4,5,6].includes(s.schemaVersion);
    expect(Array.isArray(s.monsters)&&s.monsters.length>=Q.monsters.length&&s.monsters.length<=Q.monsters.length+HQ.heroes.length*searchAreaCount);
    const monsterIds=new Set(s.monsters.map(monster=>monster?.id));
    expect(monsterIds.size===s.monsters.length&&[...originalMonsterIds].every(id=>monsterIds.has(id)));
    expect(s.monsters.every(monster=>originalMonsterIds.has(monster.id)||!preTreasure&&/^wanderer-[1-9][0-9]*$/.test(monster.id)&&monster.kind===Q.wanderingMonster.kind));
    const entityIds=new Set([...monsterIds,...Q.furniture.map(f=>f.id)]),doorIds=new Set(HQ.dungeon.doors(s).map(d=>d.id));
    const legacy=s.schemaVersion===2,preSpells=legacy||s.schemaVersion===3,oldEffects=preSpells||s.schemaVersion===4,preInventory=oldEffects||s.schemaVersion===5;
    expect((preDungeon||s.schemaVersion===8)&&s.contentVersion===Q.id&&["hero-turn","monster-turn","defeat", "victory", "retreat"].includes(s.phase));
    if(legacy)expect(["hero-turn","monster-turn","defeat"].includes(s.phase));
    expect(Array.isArray(s.heroes)&&s.heroes.length>=1&&s.heroes.length<=4&&ids(s.heroes.map(h=>h?.id),heroIds));
    if(preTreasure)expect(s.monsters.length===Q.monsters.length);
    for(const actor of [...s.heroes,...s.monsters]) {
      expect(object(actor)&&Number.isSafeInteger(actor.x)&&Number.isSafeInteger(actor.row)&&T.rockBounds(T.key(actor.x,actor.row)));
      const hero=heroIds.has(actor.id),definition=hero?HQ.heroes.find(h=>h.id===actor.id):Q.monsters.find(m=>m.id===actor.id)||{kind:Q.wanderingMonster.kind};
      const stats=hero?Data.heroes[actor.id]:Data.monsters[definition.kind];
      if(hero&&oldEffects)actor.trapped=false;
      const phasing=!oldEffects&&hero&&s.phase==="hero-turn"&&s.heroes[s.turnIndex]?.id===actor.id&&object(s.movement)&&s.movement.rolled&&s.movement.remaining>0&&!s.movement.closed&&T.magic(s,actor,"passThroughRock")&&actor.body>0&&!actor.exit&&s.pending===null;
      expect(hero&&actor.trapped?actor.body===0:phasing||T.floor.has(T.key(actor.x,actor.row))&&!T.blocked.has(T.key(actor.x,actor.row))&&!T.furniture.has(T.key(actor.x,actor.row)));
      if(actor.body>0&&HQ.dungeon.blocked(s).includes(T.key(actor.x,actor.row)))expect(phasing||hero&&s.pending?.type==="report"&&s.lastReport?.type==="trap"&&s.lastReport.defenderId===actor.id&&s.lastReport.fallingFrom&&!s.lastReport.escaped);
      expect(actor.kind===definition.kind&&typeof actor.name==="string"&&actor.name.length>0&&integer(actor.body,0,stats.body)&&actor.maxBody===stats.body);
      for(const field of ["defend","mind",...(hero?[]:["movement"])])expect(actor[field]===stats[field]);
      expect(actor.attack===(!hero&&definition.note==="C"?Q.notes.C.attackDice:stats.attack));
      if(hero) {
        expect(typeof actor.owner==="string"&&actor.owner.length>0&&actor.owner.length<=24&&actor.weapon===stats.weapon&&actor.armour===stats.armour);
        if(preInventory)actor.inventory=HQ.inventory.fresh(actor);
        expect(object(actor.inventory)&&integer(actor.inventory.gold)&&Array.isArray(actor.inventory.items)&&actor.inventory.items.length<=2048);
        expect(actor.inventory.items.every(item=>object(item)&&typeof item.id==="string"&&/^[a-z0-9-]{1,80}$/.test(item.id)&&Object.hasOwn(HQ.itemData.byId,item.kind)));
        expect(actor.inventory.items.filter(item=>item.kind===actor.weapon).length===1&&actor.inventory.items.every(item=>HQ.itemData.byId[item.kind].category==="potion"||item.kind===actor.weapon||item.kind==="tool-kit"));
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
    const elf=s.heroes.find(hero=>hero.id==="elf"),wizard=s.heroes.find(hero=>hero.id==="wizard");
    const itemIds=s.heroes.flatMap(hero=>hero.inventory.items.map(item=>item.id));expect(new Set(itemIds).size===itemIds.length);
    if(preTreasure){s.treasure=HQ.treasure.fresh(s.heroes);s.extraAttack=false;}
    const treasure=s.treasure,cardIds=new Set(HQ.treasureData.instances.map(card=>card.id)),roomIds=new Set([...Q.rooms,...trapDefinitions.filter(trap=>trap.kind==="pit").map(trap=>"pit:"+trap.id)]);
    expect(object(treasure)&&ids(treasure.deck,cardIds)&&ids(treasure.removed,cardIds)&&treasure.deck.length+treasure.removed.length===cardIds.size&&new Set([...treasure.deck,...treasure.removed]).size===cardIds.size);
    expect(treasure.removed.every(id=>["gold","potion"].includes(HQ.treasureData.byId[HQ.treasureData.instancesById[id].kind].category)));
    expect(object(treasure.searched)&&Object.keys(treasure.searched).length===s.heroes.length&&s.heroes.every(hero=>ids(treasure.searched[hero.id],roomIds)));
    expect(ids(treasure.claimed,new Set(Object.keys(Q.treasureRooms)))&&treasure.claimed.every(id=>s.heroes.some(hero=>treasure.searched[hero.id].includes(id))));
    expect(integer(treasure.nextMonster,1,HQ.heroes.length*searchAreaCount+1)&&s.monsters.filter(monster=>!originalMonsterIds.has(monster.id)).every(monster=>integer(Number(monster.id.slice(9)),1,treasure.nextMonster-1)));
    expect(boolean(s.extraAttack)&&(!s.extraAttack||s.phase==="hero-turn"&&s.actionUsed));
    for(const hero of s.heroes)for(const item of hero.inventory.items)if(item.id.startsWith("treasure-"))expect(treasure.removed.includes(item.id)&&HQ.treasureData.instancesById[item.id]?.kind===item.kind);
    if(elf&&wizard)expect(!elf.spellGroups.some(group=>wizard.spellGroups.includes(group)));
    expect(integer(s.turnIndex,0,s.heroes.length-1)&&integer(s.round,1)&&integer(s.rng,1,4294967295)&&boolean(s.actionUsed));
    expect(integer(s.nextEventId,1)&&integer(s.nextCombatId,1)&&object(s.settings)&&boolean(s.settings.realisticLOS));
    const m=s.movement;if(oldEffects){m.veilOfMist=false;m.passThroughRock=false;}
    expect(object(m)&&boolean(m.rolled)&&boolean(m.started)&&boolean(m.closed)&&boolean(m.veilOfMist)&&boolean(m.passThroughRock)&&integer(m.remaining,0,24));
    expect(Array.isArray(m.dice)&&(m.rolled?[2,4].includes(m.dice.length):m.dice.length===0)&&m.dice.every(d=>integer(d,1,6)));
    expect(m.rolled?m.remaining<=m.dice.reduce((a,b)=>a+b,0):m.remaining===0&&!m.started&&!m.closed&&!m.veilOfMist&&!m.passThroughRock);
    expect(ids(s.openDoors,doorIds)&&ids(s.discoveredDoors,doorIds)&&s.openDoors.every(id=>s.discoveredDoors.includes(id)));
    expect(ids(s.discoveredCells,T.floor)&&ids(s.discoveredRooms,new Set(Q.rooms))&&ids(s.discoveredEntities,entityIds));
    expect(object(s.monsterMemory));
    for(const [id,memory] of Object.entries(s.monsterMemory))expect(monsterIds.has(id)&&object(memory)&&memory.id===id&&integer(memory.x)&&integer(memory.row)&&T.floor.has(T.key(memory.x,memory.row))&&s.discoveredEntities.includes(id));
    expect(Array.isArray(s.log)&&s.log.length<=60&&s.log.every(event=>object(event)&&integer(event.id,1)&&typeof event.text==="string"));
    if(preInventory)s.lastItemUse=null;
    if(s.lastItemUse!==null) {
      const use=s.lastItemUse,owner=s.heroes.find(hero=>hero.id===use?.heroId);
      const definition=HQ.itemData.byId[use?.itemKind];
      expect(object(use)&&owner&&integer(use.id,1,s.nextCombatId-1)&&use.heroName===owner.name&&definition?.category==="potion"&&typeof use.itemId==="string"&&!itemIds.includes(use.itemId));
      expect(Array.isArray(use.redDice)&&use.maxBody===owner.maxBody&&integer(use.bodyBefore,0,use.maxBody));
      if(definition.healingDice) {
        expect(use.redDice.length===1&&integer(use.redDice[0],1,6)&&use.bodyBefore<use.maxBody);
        expect(use.bodyAfter===Math.min(use.maxBody,use.bodyBefore+use.redDice[0])&&use.healed===use.bodyAfter-use.bodyBefore);
      } else expect(use.redDice.length===0&&use.bodyBefore>0&&use.bodyAfter===use.bodyBefore&&use.healed===0&&use.detail===definition.summary);
    }
    if(s.lastReport!==null) {
      const r=s.lastReport,actors=new Set([...s.heroes.map(h=>h.id),...monsterIds]);
      expect(object(r)&&integer(r.id,1)&&actors.has(r.attackerId)&&typeof r.attackerName==="string");
      if(r.type==="combat") {
        expect(actors.has(r.defenderId)&&typeof r.defenderName==="string"&&["hero","monster"].includes(r.attackerSide));
        expect(["white-shield","black-shield"].includes(r.shield));
        for(const rolls of [r.attackDice,r.defendDice])expect(Array.isArray(rolls)&&rolls.length<=7&&rolls.every(face=>Data.faces.includes(face)));
        for(const field of ["skulls","shields","damage","unblockedHits","bodyBefore","bodyAfter","maxBody"])expect(integer(r[field],0,12));
        expect(boolean(r.defeated));
        if(r.spellId!==undefined)expect(r.spellId==="genie"&&s.heroes.find(hero=>hero.id===r.attackerId)?.spellsUsed.includes("genie")&&r.attackDice.length===5);
      } else if(r.type==="spell") {
        const card=HQ.spellData.byId[r.spellId],caster=s.heroes.find(hero=>hero.id===r.attackerId),target=[...s.heroes,...s.monsters].find(actor=>actor.id===r.defenderId);
        expect(card?.implemented&&caster&&target&&caster.spellsUsed.includes(card.id)&&typeof r.defenderName==="string"&&typeof r.detail==="string");
        const count=r.spellId==="ball-of-flame"||r.spellId==="swift-wind"&&r.redDice?.length?2:r.spellId==="fire-of-wrath"?1:r.spellId==="sleep"?target.mind:0;
        expect(Array.isArray(r.redDice)&&r.redDice.length===count&&r.redDice.every(d=>integer(d,1,6)));
        for(const field of ["bodyBefore","bodyAfter","maxBody","damage","healed"])expect(integer(r[field],0,12));
        expect(boolean(r.defeated)&&r.maxBody===target.maxBody&&r.bodyAfter<=r.maxBody&&r.damage===Math.max(0,r.bodyBefore-r.bodyAfter)&&r.healed===Math.max(0,r.bodyAfter-r.bodyBefore));
        if(oldEffects){r.rollRole="monster";r.rollDescription=r.redDice.length?"Each 5 or 6 prevents one Body damage":"";}
        expect(["hero","monster"].includes(r.rollRole)&&typeof r.rollDescription==="string");
      } else if(r.type==="spell-door")expect(r.spellId==="genie"&&doorIds.has(r.doorId)&&s.openDoors.includes(r.doorId)&&s.heroes.find(hero=>hero.id===r.attackerId)?.spellsUsed.includes("genie")&&typeof r.detail==="string");
      else if(r.type==="sleep-check")expect(monsterIds.has(r.attackerId)&&r.defenderId===r.attackerId&&r.spellId==="sleep"&&Array.isArray(r.redDice)&&r.redDice.length===s.monsters.find(monster=>monster.id===r.attackerId).mind&&r.redDice.every(d=>integer(d,1,6))&&boolean(r.awake)&&r.awake===r.redDice.includes(6)&&r.rollRole==="monster"&&typeof r.rollDescription==="string"&&typeof r.detail==="string");
      else if(r.type==="stone-move")expect(heroIds.has(r.attackerId)&&r.defenderId===r.attackerId&&s.heroes.some(hero=>hero.id===r.attackerId)&&boolean(r.defeated)&&typeof r.detail==="string"&&integer(r.bodyBefore,1,12)&&integer(r.bodyAfter,0,12)&&integer(r.maxBody,1,12));
      else if(r.type==="treasure") {
        const owner=s.heroes.find(hero=>hero.id===r.attackerId);
        expect(owner&&r.defenderId===owner.id&&typeof r.defenderName==="string"&&typeof r.detail==="string"&&boolean(r.endTurn)&&boolean(r.defeated)&&r.maxBody===owner.maxBody&&integer(r.bodyBefore,1,owner.maxBody));
        expect(r.bodyAfter===r.bodyBefore-r.damage&&[0,1].includes(r.damage)&&r.defeated===(r.bodyAfter===0)&&r.endTurn===(r.damage===1));
        expect(object(r.search));
      }
      else if(r.type==="dungeon-search")expect(heroIds.has(r.attackerId)&&["traps","doors"].includes(r.searchKind)&&integer(r.found,0,trapIds.size+HQ.dungeon.layout(s).doors.length)&&typeof r.detail==="string");
      else if(r.type==="trap") {
        const owner=s.heroes.find(hero=>hero.id===r.attackerId),definition=trapDefinitions.find(trap=>trap.id===r.trapId);
        expect(owner&&(definition||r.operation==="jump"&&r.trapId===null&&r.trapKind==="clear")&&r.defenderId===owner.id&&r.defenderName===owner.name&&r.trapKind===(definition?.kind||"clear")&&["hidden","found","sprung","clear"].includes(r.statusBefore)&&["spring","jump","disarm"].includes(r.operation)&&typeof r.detail==="string");
        expect(Array.isArray(r.rolls)&&r.rolls.length<=2&&r.rolls.every(group=>object(group)&&typeof group.label==="string"&&typeof group.description==="string"&&Array.isArray(group.faces)&&group.faces.length>=1&&group.faces.length<=3&&group.faces.every(face=>Data.faces.includes(face))));
        expect(integer(r.bodyBefore,1,owner.maxBody)&&integer(r.bodyAfter,0,owner.maxBody)&&r.maxBody===owner.maxBody&&r.damage===r.bodyBefore-r.bodyAfter&&r.defeated===(r.bodyAfter===0)&&boolean(r.endTurn));
        if(r.jumpFrom!==undefined)expect(T.floor.has(r.jumpFrom)&&T.floor.has(r.jumpTo));
        if(r.fallingFrom!==undefined)expect(definition?.kind==="falling-block"&&T.neighbors(HQ.dungeon.cell(definition)).includes(r.fallingFrom)&&(r.escaped===undefined||boolean(r.escaped)));
      }
      else if(r.type==="monster-skip")expect(monsterIds.has(r.attackerId)&&r.reason==="Tempest · misses this turn");
      else expect(r.type==="monster-move"&&integer(r.steps,0,10));
      if(r.search!==undefined) {
        const find=r.search,owner=s.heroes.find(hero=>hero.id===find?.heroId),instance=HQ.treasureData.instancesById[find?.cardId],card=HQ.treasureData.byId[instance?.kind],special=Q.treasureRooms[find?.roomId];
        expect(["treasure","combat"].includes(r.type)&&object(find)&&owner&&roomIds.has(find.roomId)&&treasure.searched[owner.id].includes(find.roomId)&&integer(find.gold)&&boolean(find.immediateAttack));
        if(find.cardId===null)expect(special&&find.specialId===special.note&&treasure.claimed.includes(find.roomId)&&find.gold===(special.gold||0)&&find.itemId===null&&find.wanderingId===null&&!find.immediateAttack);
        else {
          expect(card&&find.specialId===null&&find.gold===(card.gold||0));
          expect((["gold","potion"].includes(card.category)?treasure.removed:treasure.deck).includes(find.cardId));
          expect(find.itemId===(card.category==="potion"?find.cardId:null));
          if(find.wanderingId!==null)expect(card.category==="monster"&&monsterIds.has(find.wanderingId)&&find.wanderingId.startsWith("wanderer-"));
          else expect(!find.immediateAttack);
          if(r.type==="treasure")expect(r.damage===(card.category==="hazard"?1:0));
        }
        if(r.type==="combat")expect(find.immediateAttack&&r.attackerSide==="monster"&&r.attackerId===find.wanderingId&&r.defenderId===owner.id);
      }
      if(r.recovery!==undefined) {
        const owner=s.heroes.find(hero=>hero.id===r.defenderId),use=s.lastItemUse;
        expect(["combat","treasure","trap"].includes(r.type)&&object(r.recovery)&&r.defeated&&r.bodyAfter===0&&owner&&integer(r.recovery.itemUseId,1,s.nextCombatId-1)&&integer(r.recovery.bodyAfter,1,owner.maxBody)&&r.recovery.healed===r.recovery.bodyAfter);
        if(use?.id===r.recovery.itemUseId)expect(use.heroId===owner.id&&use.bodyBefore===0&&use.bodyAfter===r.recovery.bodyAfter);
      }
    }
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
    s.schemaVersion=8;
    return snapshot;
  }
  function load() {
    try {
      const text=window.localStorage.getItem(key);
      if(text===null)return {snapshot:null,error:""};
      try{return {snapshot:validate(JSON.parse(text)),error:""};}
      catch(error){return {snapshot:null,error:"The saved adventure could not be resumed. Start a new adventure to replace it."};}
    } catch(error){return {snapshot:null,error:"Browser storage is unavailable. Progress cannot be saved on this device."};}
  }
  const snapshot=({state,screen,dice,view})=>({version,savedAt:new Date().toISOString(),state,screen,dice:dice??null,view});
  function save(data) {
    try{window.localStorage.setItem(key,JSON.stringify(snapshot(data)));return "";}
    catch(error){return "Autosave unavailable — progress will be lost on refresh.";}
  }
  function exportText(data) {
    // Validate a detached copy: migrations must never mutate the live game.
    const saved=validate(JSON.parse(JSON.stringify(snapshot(data))));
    return JSON.stringify({format:fileFormat,version:fileVersion,slot,snapshot:saved},null,2);
  }
  function importText(text) {
    if(typeof text!=="string"||text.length>maxFileBytes)throw new Error("Choose a HeroQuest save file smaller than 2 MB.");
    let file;try{file=JSON.parse(text);}catch(error){throw new Error("This is not a readable HeroQuest save file.");}
    if(!object(file)||file.format!==fileFormat||file.version!==fileVersion||!["adventure","sandbox"].includes(file.slot))
      throw new Error("This save file uses an unsupported HeroQuest format.");
    if(file.slot!==slot)throw new Error(file.slot==="sandbox"?"Open Gameplay sandbox to import a sandbox save.":"Open the adventure to import this save; it is not a sandbox save.");
    try{return validate(file.snapshot);}catch(error){throw new Error("This save is incomplete or incompatible with the current game.");}
  }
  HQ.sessionStorage=Object.freeze({key,slot,maxFileBytes,load,save,exportText,importText});
})();

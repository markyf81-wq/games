(function () {
  "use strict";
  const HQ=window.HeroQuest,Q=HQ.trial,T=HQ.topology,Data=HQ.combatData;
  const key=HQ.sandbox?.active?"heroquest.sandbox.v1":"heroquest.session.v1",version=1;
  const object=value=>value!==null&&typeof value==="object"&&!Array.isArray(value);
  const integer=(value,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
  const boolean=value=>typeof value==="boolean";
  function expect(condition){if(!condition)throw new Error("The saved adventure is incomplete or incompatible. It has been kept, but could not be resumed.");}
  function ids(values,allowed){return Array.isArray(values)&&new Set(values).size===values.length&&values.every(id=>allowed.has(id));}
  function validate(snapshot) {
    expect(object(snapshot)&&snapshot.version===version&&object(snapshot.state));
    const s=snapshot.state,heroIds=new Set(HQ.heroes.map(h=>h.id)),monsterIds=new Set(Q.monsters.map(m=>m.id));
    const entityIds=new Set([...monsterIds,...Q.furniture.map(f=>f.id)]),doorIds=new Set(Q.doors.map(d=>d.id));
    const legacy=s.schemaVersion===2,preSpells=legacy||s.schemaVersion===3,oldEffects=preSpells||s.schemaVersion===4;
    expect((oldEffects||s.schemaVersion===5)&&s.contentVersion===Q.id&&["hero-turn","monster-turn","defeat", "victory", "retreat"].includes(s.phase));
    if(legacy)expect(["hero-turn","monster-turn","defeat"].includes(s.phase));
    expect(Array.isArray(s.heroes)&&s.heroes.length>=1&&s.heroes.length<=4&&ids(s.heroes.map(h=>h?.id),heroIds));
    expect(Array.isArray(s.monsters)&&s.monsters.length===Q.monsters.length&&ids(s.monsters.map(m=>m?.id),monsterIds));
    for(const actor of [...s.heroes,...s.monsters]) {
      expect(object(actor)&&Number.isSafeInteger(actor.x)&&Number.isSafeInteger(actor.row)&&T.rockBounds(T.key(actor.x,actor.row)));
      const hero=heroIds.has(actor.id),definition=hero?HQ.heroes.find(h=>h.id===actor.id):Q.monsters.find(m=>m.id===actor.id);
      const stats=hero?Data.heroes[actor.id]:Data.monsters[definition.kind];
      if(hero&&oldEffects)actor.trapped=false;
      const phasing=!oldEffects&&hero&&s.phase==="hero-turn"&&s.heroes[s.turnIndex]?.id===actor.id&&object(s.movement)&&s.movement.rolled&&s.movement.remaining>0&&!s.movement.closed&&T.magic(s,actor,"passThroughRock")&&actor.body>0&&!actor.exit&&s.pending===null;
      expect(hero&&actor.trapped?actor.body===0:phasing||T.floor.has(T.key(actor.x,actor.row))&&!T.blocked.has(T.key(actor.x,actor.row))&&!T.furniture.has(T.key(actor.x,actor.row)));
      expect(actor.kind===definition.kind&&typeof actor.name==="string"&&actor.name.length>0&&integer(actor.body,0,stats.body)&&actor.maxBody===stats.body);
      for(const field of ["defend","mind",...(hero?[]:["movement"])])expect(actor[field]===stats[field]);
      expect(actor.attack===(!hero&&definition.note==="C"?Q.notes.C.attackDice:stats.attack));
      if(hero) {
        expect(typeof actor.owner==="string"&&actor.owner.length>0&&actor.owner.length<=24&&actor.weapon===stats.weapon&&actor.armour===stats.armour);
        if(legacy){expect(actor.exit===undefined||actor.exit===null);actor.exit=null;}
        expect([null,"completed","retreated"].includes(actor.exit));
        if(actor.exit)expect(actor.body>0&&T.stairs.has(T.key(actor.x,actor.row)));
        if(actor.exit==="completed")expect(HQ.quest.objectiveComplete(s));
        // Existing adventures never silently acquire unused spells mid-quest.
        if(preSpells){actor.spellGroups=[];actor.spellsUsed=[];actor.effects=HQ.spells.heroEffects();}
        else if(oldEffects)actor.effects={...HQ.spells.heroEffects(),...actor.effects};
        expect(ids(actor.spellGroups,new Set(HQ.spellData.groups))&&ids(actor.spellsUsed,new Set(HQ.spells.book(actor).map(card=>card.id))));
        expect(HQ.spells.isCaster(actor)?actor.spellGroups.length===0||actor.spellGroups.length===(actor.id==="wizard"?3:1):actor.spellGroups.length===0);
        expect(object(actor.effects)&&Object.keys(HQ.spells.heroEffects()).every(flag=>boolean(actor.effects[flag]))&&boolean(actor.trapped));
      } else {
        if(preSpells)actor.effects=HQ.spells.monsterEffects();else if(oldEffects)actor.effects={...HQ.spells.monsterEffects(),...actor.effects};
        expect(object(actor.effects)&&Object.keys(HQ.spells.monsterEffects()).every(flag=>boolean(actor.effects[flag])));
      }
    }
    const elf=s.heroes.find(hero=>hero.id==="elf"),wizard=s.heroes.find(hero=>hero.id==="wizard");
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
    if(s.lastReport!==null) {
      const r=s.lastReport,actors=new Set([...s.heroes.map(h=>h.id),...monsterIds]);
      expect(object(r)&&integer(r.id,1)&&actors.has(r.attackerId)&&typeof r.attackerName==="string");
      if(r.type==="combat") {
        expect(actors.has(r.defenderId)&&typeof r.defenderName==="string"&&["hero","monster"].includes(r.attackerSide));
        expect(["white-shield","black-shield"].includes(r.shield));
        for(const rolls of [r.attackDice,r.defendDice])expect(Array.isArray(rolls)&&rolls.length<=5&&rolls.every(face=>Data.faces.includes(face)));
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
      else if(r.type==="monster-skip")expect(monsterIds.has(r.attackerId)&&r.reason==="Tempest · misses this turn");
      else expect(r.type==="monster-move"&&integer(r.steps,0,10));
    }
    if(s.phase==="monster-turn"){
      if(oldEffects&&object(s.monsterTurn))s.monsterTurn.resumeId=null;
      expect(object(s.monsterTurn)&&ids(s.monsterTurn.queue,monsterIds)&&s.monsterTurn.queue.length>0&&integer(s.monsterTurn.index,0,s.monsterTurn.queue.length));
      expect(s.monsterTurn.resumeId===null||s.monsterTurn.resumeId===s.monsterTurn.queue[s.monsterTurn.index-1]&&(s.pending===null||s.pending.type==="report")&&s.lastReport?.type==="sleep-check"&&s.lastReport.awake&&s.lastReport.attackerId===s.monsterTurn.resumeId);
    }
    else expect(s.monsterTurn===null);
    const outcome=HQ.quest.outcome(s);
    expect(HQ.quest.isEnded(s.phase)?outcome===s.phase:outcome===null);
    if(s.phase==="hero-turn")expect(HQ.combat.inPlay(s.heroes[s.turnIndex])||s.heroes[s.turnIndex].trapped&&s.pending?.type==="report"&&s.lastReport?.type==="stone-move"&&s.lastReport.defeated);
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
      const d=snapshot.dice;expect(object(d)&&s.pending?.type==="report"&&d.reportId===s.lastReport.id&&boolean(d.rolled));
      if(d.stage==="spell")expect(["spell","sleep-check"].includes(s.lastReport.type)&&s.lastReport.redDice.length>0);
      else {expect(s.lastReport.type==="combat"&&["attack","defence"].includes(d.stage));if(d.stage==="defence")expect(s.lastReport.defendDice.length>0);}
    }
    // v2 adds unexited status; v2/v3 add empty books and inactive effects.
    // Never replenish a quest's spells or reroll/replay an existing report.
    s.schemaVersion=5;
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
  function save({state,screen,dice,view}) {
    try{window.localStorage.setItem(key,JSON.stringify({version,savedAt:new Date().toISOString(),state,screen,dice:dice??null,view}));return "";}
    catch(error){return "Autosave unavailable — progress will be lost on refresh.";}
  }
  HQ.sessionStorage=Object.freeze({key,load,save});
})();

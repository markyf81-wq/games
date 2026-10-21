(function () {
  "use strict";
  const HQ=window.HeroQuest,Q=HQ.trial,T=HQ.topology,Data=HQ.combatData;
  const key="heroquest.session.v1",version=1;
  const object=value=>value!==null&&typeof value==="object"&&!Array.isArray(value);
  const integer=(value,min=0,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
  const boolean=value=>typeof value==="boolean";
  function expect(condition){if(!condition)throw new Error("The saved adventure is incomplete or incompatible. It has been kept, but could not be resumed.");}
  function ids(values,allowed){return Array.isArray(values)&&new Set(values).size===values.length&&values.every(id=>allowed.has(id));}
  function validate(snapshot) {
    expect(object(snapshot)&&snapshot.version===version&&object(snapshot.state));
    const s=snapshot.state,heroIds=new Set(HQ.heroes.map(h=>h.id)),monsterIds=new Set(Q.monsters.map(m=>m.id));
    const entityIds=new Set([...monsterIds,...Q.furniture.map(f=>f.id)]),doorIds=new Set(Q.doors.map(d=>d.id));
    expect(s.schemaVersion===2&&s.contentVersion===Q.id&&["hero-turn","monster-turn","defeat"].includes(s.phase));
    expect(Array.isArray(s.heroes)&&s.heroes.length>=1&&s.heroes.length<=4&&ids(s.heroes.map(h=>h?.id),heroIds));
    expect(Array.isArray(s.monsters)&&s.monsters.length===Q.monsters.length&&ids(s.monsters.map(m=>m?.id),monsterIds));
    for(const actor of [...s.heroes,...s.monsters]) {
      expect(object(actor)&&integer(actor.x)&&integer(actor.row)&&T.floor.has(T.key(actor.x,actor.row))&&!T.blocked.has(T.key(actor.x,actor.row))&&!T.furniture.has(T.key(actor.x,actor.row)));
      const hero=heroIds.has(actor.id),definition=hero?HQ.heroes.find(h=>h.id===actor.id):Q.monsters.find(m=>m.id===actor.id);
      const stats=hero?Data.heroes[actor.id]:Data.monsters[definition.kind];
      expect(actor.kind===definition.kind&&typeof actor.name==="string"&&actor.name.length>0&&integer(actor.body,0,stats.body)&&actor.maxBody===stats.body);
      for(const field of ["defend","mind",...(hero?[]:["movement"])])expect(actor[field]===stats[field]);
      expect(actor.attack===(!hero&&definition.note==="C"?Q.notes.C.attackDice:stats.attack));
      if(hero)expect(typeof actor.owner==="string"&&actor.owner.length>0&&actor.owner.length<=24&&actor.weapon===stats.weapon&&actor.armour===stats.armour);
    }
    expect(integer(s.turnIndex,0,s.heroes.length-1)&&integer(s.round,1)&&integer(s.rng,1,4294967295)&&boolean(s.actionUsed));
    expect(integer(s.nextEventId,1)&&integer(s.nextCombatId,1)&&object(s.settings)&&boolean(s.settings.realisticLOS));
    const m=s.movement;expect(object(m)&&boolean(m.rolled)&&boolean(m.started)&&boolean(m.closed)&&integer(m.remaining,0,12));
    expect(Array.isArray(m.dice)&&m.dice.length===(m.rolled?2:0)&&m.dice.every(d=>integer(d,1,6)));
    expect(m.rolled?m.remaining<=m.dice[0]+m.dice[1]:m.remaining===0&&!m.started&&!m.closed);
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
      } else expect(r.type==="monster-move"&&integer(r.steps,0,10));
    }
    if(s.phase==="monster-turn")expect(object(s.monsterTurn)&&ids(s.monsterTurn.queue,monsterIds)&&s.monsterTurn.queue.length>0&&integer(s.monsterTurn.index,0,s.monsterTurn.queue.length));
    else expect(s.monsterTurn===null);
    expect(s.phase==="defeat"?!s.heroes.some(HQ.combat.alive):s.heroes.some(HQ.combat.alive));
    if(s.phase==="hero-turn")expect(HQ.combat.alive(s.heroes[s.turnIndex]));
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
      const d=snapshot.dice;expect(object(d)&&s.pending?.type==="report"&&s.lastReport.type==="combat"&&d.reportId===s.lastReport.id&&["attack","defence"].includes(d.stage)&&boolean(d.rolled));
      if(d.stage==="defence")expect(s.lastReport.defendDice.length>0);
    }
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

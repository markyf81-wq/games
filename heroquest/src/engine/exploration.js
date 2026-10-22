(function () {
  "use strict";
  const HQ=window.HeroQuest,Q=HQ.trial,T=HQ.topology,C=HQ.combat,Data=HQ.combatData;
  const heroNames=new Map(HQ.heroes.map(h=>[h.id,h.name]));
  const monsterNames={orc:"Orc",goblin:"Goblin",skeleton:"Skeleton",zombie:"Zombie",mummy:"Mummy",fimir:"Fimir","chaos-warrior":"Chaos Warrior",gargoyle:"Gargoyle"};
  const active=state=>state.heroes[state.turnIndex];
  const freshMovement=()=>({dice:[],remaining:0,rolled:false,started:false,closed:false,veilOfMist:false,passThroughRock:false});
  function beginMove(state,hero,cost) {
    if(!cost||state.movement.started)return;
    for(const flag of ["veilOfMist","passThroughRock"])if(hero.effects[flag]){state.movement[flag]=true;hero.effects[flag]=false;}
  }
  function sight(state,extraOrigins=[]) {
    const origins=[...new Set([...state.heroes.filter(C.inPlay).flatMap(h=>T.spaceCells(C.cell(h))),...extraOrigins])];
    const cells=Q.floor.filter(id=>origins.some(from=>T.canSee(state,from,id)));
    const figures=state.monsters.filter(C.alive).filter(m=>origins.some(from=>T.canSee(state,from,C.cell(m),true))).map(m=>m.id);
    return {cells,figures};
  }
  function discover(state,extraOrigins=[]) {
    const view=sight(state,extraOrigins),cells=new Set(state.discoveredCells),rooms=new Set(state.discoveredRooms),entities=new Set(state.discoveredEntities),doors=new Set(state.discoveredDoors);
    for(const id of view.cells){cells.add(id);const region=T.regions.get(id);if(region!=="corridor")rooms.add(region);}
    for(const roomId of rooms)for(const id of Q.floor)if(T.regions.get(id)===roomId)cells.add(id);
    const visible=new Set(view.cells),seenFigures=new Set(view.figures);
    for(const f of Q.furniture)if(rooms.has(T.regions.get(T.key(f.x,f.row)))||visible.has(T.key(f.x,f.row)))entities.add(f.id);
    for(const [id,memory] of Object.entries(state.monsterMemory))if(visible.has(T.key(memory.x,memory.row))&&!state.monsters.some(m=>m.id===id&&C.alive(m)&&C.cell(m)===T.key(memory.x,memory.row)))delete state.monsterMemory[id];
    for(const m of state.monsters.filter(C.alive))if(entities.has(m.id)||rooms.has(T.regions.get(C.cell(m)))||seenFigures.has(m.id)) {
      if(!state.settings.realisticLOS||seenFigures.has(m.id)||!entities.has(m.id))state.monsterMemory[m.id]={id:m.id,x:m.x,row:m.row};
      entities.add(m.id);
    }
    for(const door of Q.doors)if(T.endpoints(door).some(id=>visible.has(id)||rooms.has(T.regions.get(id))))doors.add(door.id);
    const added={cells:cells.size-state.discoveredCells.length,rooms:rooms.size-state.discoveredRooms.length,entities:entities.size-state.discoveredEntities.length};
    state.discoveredCells=[...cells];state.discoveredRooms=[...rooms];state.discoveredEntities=[...entities];state.discoveredDoors=[...doors];HQ.spells.maintain(state);return added;
  }
  function log(state,text){state.log.push({id:state.nextEventId++,text});if(state.log.length>60)state.log.shift();}
  function nextRandom(state){let x=state.rng>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;state.rng=x>>>0;return state.rng;}
  function die(state){let value;do{value=nextRandom(state);}while(value>=4294967292);return value%6+1;}
  function createSession(config,seed) {
    const heroIds=config.heroIds??HQ.heroes.map(h=>h.id);
    if(!Array.isArray(heroIds)||heroIds.length<1||heroIds.length>4||new Set(heroIds).size!==heroIds.length||heroIds.some(id=>!heroNames.has(id)))
      throw new Error("Choose between one and four different heroes.");
    const selected=new Set(heroIds),spellGroups=HQ.spells.groups(config,heroIds);
    const state={schemaVersion:5,contentVersion:"the-trial-combat-v1",phase:"hero-turn",round:1,turnIndex:0,
      rng:(seed>>>0)||0x4845524f,pending:null,actionUsed:false,monsterTurn:null,lastReport:null,nextCombatId:1,
      heroes:HQ.heroes.filter(h=>selected.has(h.id)).map(h=>({...h,...Data.heroes[h.id],name:h.name,maxBody:Data.heroes[h.id].body,exit:null,
        spellGroups:spellGroups[h.id]||[],spellsUsed:[],effects:HQ.spells.heroEffects(),trapped:false,
        owner:String(config.owners?.[h.id]||"Player 1").trim().slice(0,24)||"Player 1"})),
      monsters:Q.monsters.map(m=>({id:m.id,kind:m.kind,x:m.x,row:m.row,...Data.monsters[m.kind],
        maxBody:Data.monsters[m.kind].body,name:m.name||monsterNames[m.kind],effects:HQ.spells.monsterEffects(),
        ...(m.note==="C"?{attack:Q.notes.C.attackDice,overrideSource:Data.sources.guardian}:{})})),
      movement:freshMovement(),openDoors:[],discoveredCells:[],discoveredRooms:[Q.startingRoom],
      discoveredEntities:[],discoveredDoors:[],monsterMemory:{},settings:{realisticLOS:Boolean(config.realisticLOS)},log:[],nextEventId:1};
    discover(state);log(state,"The party enters the stairway room. Choose your route together.");return state;
  }
  function handoff(state,index){state.turnIndex=index;state.phase="hero-turn";state.movement=freshMovement();state.actionUsed=false;state.pending={type:"handoff",heroId:active(state).id};}
  function nextRound(state) {
    state.monsterTurn=null;state.round++;log(state,"Round "+state.round+" begins.");handoff(state,state.heroes.findIndex(C.inPlay));
  }
  function finishQuest(state) {
    const outcome=HQ.quest.outcome(state);
    if(!outcome)return false;
    state.phase=outcome;state.monsterTurn=null;state.movement=freshMovement();
    const text={victory:"The Trial is complete. Verag is defeated and a hero has returned safely.",
      retreat:"The Trial ended before a hero completed its objective and returned safely.",defeat:"The party has fallen. The Trial has failed."};
    log(state,text[outcome]);return true;
  }
  function advanceTurn(state) {
    const index=state.heroes.findIndex((hero,i)=>i>state.turnIndex&&C.inPlay(hero));
    if(index>=0){handoff(state,index);return;}
    const queue=state.monsters.filter(monster=>C.alive(monster)&&state.discoveredEntities.includes(monster.id)).map(monster=>monster.id);
    if(!queue.length)nextRound(state);
    else {
      state.phase="monster-turn";state.monsterTurn={queue,index:0,resumeId:null};
      state.pending={type:"monster-intro"};state.movement=freshMovement();
      log(state,"Zargon’s turn: the revealed monsters act once each.");
    }
  }
  function combat(state,attacker,defender,side) {
    const report=C.resolve(state,attacker,defender,side,die);state.lastReport={type:"combat",...report};state.pending={type:"report",reportId:report.id};
    log(state,attacker.name+" attacks "+defender.name+": "+report.skulls+" skull"+(report.skulls===1?"":"s")+", "+report.shields+" block"+(report.shields===1?"":"s")+", "+report.damage+" Body Point"+(report.damage===1?"":"s")+" lost.");
    if(report.defeated)log(state,defender.name+" is defeated and removed from the board.");
    finishQuest(state);
    discover(state);
  }
  function reject(state,message){return {ok:false,state,message};}
  function trapped(state,hero) {
    const before=hero.body;hero.body=0;hero.trapped=true;state.movement.remaining=0;state.movement.closed=true;
    hero.effects.passThroughRock=false;state.movement.passThroughRock=false;state.movement.veilOfMist=false;
    const report={type:"stone-move",id:state.nextCombatId++,attackerId:hero.id,attackerName:hero.name,defenderId:hero.id,defenderName:hero.name,
      bodyBefore:before,bodyAfter:0,maxBody:hero.maxBody,defeated:true,detail:"Movement ended inside an object or outside the playable area. Trapped forever."};
    state.lastReport=report;state.pending={type:"report",reportId:report.id};log(state,hero.name+": "+report.detail);finishQuest(state);discover(state);
  }
  function applyCommand(state,command) {
    if(!state||state.contentVersion!=="the-trial-combat-v1")return reject(state,"Start a new adventure first.");
    const allowed=["ROLL_MOVEMENT","MOVE","OPEN_DOOR","ATTACK","CAST_SPELL","END_TURN","EXIT_QUEST","ACK_HANDOFF","RESOLVE_MONSTER","ACK_REPORT","SET_REALISTIC_LOS"];
    if(!command||!allowed.includes(command.type))return reject(state,"That action is not available.");
    if(state.pending&&!['ACK_HANDOFF','ACK_REPORT','RESOLVE_MONSTER','SET_REALISTIC_LOS'].includes(command.type))return reject(state,"Finish the current handoff or result first.");
    if(["ROLL_MOVEMENT","MOVE","OPEN_DOOR","ATTACK","CAST_SPELL","END_TURN","EXIT_QUEST"].includes(command.type)&&(state.phase!=="hero-turn"||!C.inPlay(active(state))))return reject(state,"Wait for a living hero’s turn.");
    if(["OPEN_DOOR","ATTACK","CAST_SPELL","EXIT_QUEST"].includes(command.type)&&T.magic(state,active(state),"passThroughRock")&&T.unsafe(state,active(state)))return reject(state,"Move into a free square before acting.");
    const next=JSON.parse(JSON.stringify(state)),hero=active(next);let motion=null;
    switch(command.type) {
      case "ROLL_MOVEMENT": {
        if(next.movement.closed)return reject(state,"Movement ended when you acted after moving.");
        if(next.movement.rolled)return reject(state,"Movement has already been rolled this turn.");
        const dice=Array.from({length:hero.effects.swiftWind?4:2},()=>die(next));hero.effects.swiftWind=false;
        next.movement={...freshMovement(),dice,remaining:dice.reduce((a,b)=>a+b,0),rolled:true};
        log(next,hero.name+" rolls "+dice.join(" + ")+" for "+next.movement.remaining+" movement.");break;
      }
      case "MOVE": {
        if(next.movement.closed)return reject(state,"You cannot move again after moving and then acting.");
        const path=T.routes(next,hero).get(command.to);if(!path)return reject(state,!next.movement.rolled?"Roll movement first.":"Choose an unoccupied highlighted square within your remaining movement.");
        motion={actorId:hero.id,from:C.cell(hero),path:[]};let interrupted=false;const rock=T.magic(next,hero,"passThroughRock");
        for(const id of path) {
          if(next.movement.remaining<=0)break;
          const monster=T.monsterAt(next,id);
          if(monster&&!rock&&!T.magic(next,hero,"veilOfMist")){if(!next.discoveredEntities.includes(monster.id))next.discoveredEntities.push(monster.id);interrupted=true;break;}
          const cost=T.movementCost(C.cell(hero),id),[x,row]=T.parse(id);beginMove(next,hero,cost);hero.x=x;hero.row=row;next.movement.remaining-=cost;if(cost)next.movement.started=true;motion.path.push(id);
          const added=discover(next);if((added.cells||added.entities||added.rooms)&&(rock||T.canStop(next,id,hero.id))){interrupted=true;break;}
        }
        // A newly encountered blocker must not strand a hero on a friend or a
        // rock transit cell. Back up only the occupied tail of the actual path.
        while(!rock&&motion.path.length&&!T.canStop(next,C.cell(hero),hero.id)) {
          const from=C.cell(hero);motion.path.pop();const to=motion.path.at(-1)||motion.from;
          next.movement.remaining+=T.movementCost(to,from);[hero.x,hero.row]=T.parse(to);
        }
        if(motion.path.length){const spent=T.routeCost(motion.from,motion.path);log(next,spent?hero.name+" moves "+spent+" space"+(spent===1?"":"s")+".":hero.name+" moves within the stairway.");}
        if(interrupted)log(next,"New ground comes into view. Review the reveal before continuing your movement.");
        if(rock&&next.movement.remaining===0&&T.unsafe(next,hero))trapped(next,hero);
        break;
      }
      case "OPEN_DOOR": {
        const door=Q.doors.find(d=>d.id===command.id);
        if(!door||!next.discoveredDoors.includes(door.id))return reject(state,"Select a discovered closed door.");
        if(next.openDoors.includes(door.id))return reject(state,"That door is already open.");
        if(!T.endpoints(door).includes(C.cell(hero)))return reject(state,"Move next to the door to open it.");
        next.openDoors.push(door.id);discover(next);log(next,hero.name+" opens a door. Opening a door uses no movement or action.");break;
      }
      case "ATTACK": {
        const target=C.targets(next,hero).find(m=>m.id===command.targetId);
        if(!target)return reject(state,next.actionUsed?"Your action has already been used.":"Choose an adjacent living monster across an open edge.");
        next.actionUsed=true;
        if(next.movement.started){next.movement.closed=true;next.movement.remaining=0;}
        combat(next,hero,target,"hero");break;
      }
      case "CAST_SPELL": {
        const card=HQ.spellData.byId[command.spellId],doorMode=card?.id==="genie"&&command.mode==="door",target=(doorMode?Q.doors:[...next.heroes,...next.monsters]).find(f=>f.id===command.targetId);
        if(!target)return reject(state,"Choose a spell target.");
        if(command.mode!==undefined&&!["attack","door"].includes(command.mode))return reject(state,"Choose a valid spell mode.");
        if(command.mode==="door"&&!doorMode)return reject(state,"Only Genie can open a door.");
        const reason=HQ.spells.reason(next,hero,card,target,command.mode);
        if(reason)return reject(state,reason);
        const report=HQ.spells.resolve(next,hero,card,target,die,command.mode);
        next.lastReport=report;next.pending={type:"report",reportId:report.id};
        log(next,hero.name+" casts "+card.name+(doorMode?" to open a door.":" on "+target.name+". "+(report.detail||report.damage+" Body lost.")));
        finishQuest(next);discover(next,doorMode?T.endpoints(target):[]);break;
      }
      case "END_TURN":
        if(T.magic(next,hero,"passThroughRock")&&T.unsafe(next,hero))trapped(next,hero);
        else advanceTurn(next);
        break;
      case "EXIT_QUEST": {
        const reason=HQ.quest.exitReason(next,hero);
        if(reason)return reject(state,reason);
        hero.exit=HQ.quest.objectiveComplete(next)?"completed":"retreated";
        log(next,hero.name+(hero.exit==="completed"?" returns safely and completes The Trial.":" leaves the dungeon before completing The Trial."));
        discover(next);
        if(!finishQuest(next))advanceTurn(next);
        break;
      }
      case "RESOLVE_MONSTER": {
        if(next.phase!=="monster-turn"||next.pending&&next.pending.type!=="monster-intro")return reject(state,"Review the current result before the next monster acts.");
        next.pending=null;const turn=next.monsterTurn;let monster=turn.resumeId?next.monsters.find(m=>m.id===turn.resumeId&&C.alive(m)):null;const resumed=Boolean(monster);turn.resumeId=null;
        while(turn.index<turn.queue.length&&!monster) {
          const id=turn.queue[turn.index++];
          const candidate=next.monsters.find(m=>m.id===id);
          if(candidate&&C.alive(candidate))monster=candidate;
        }
        if(!monster){nextRound(next);break;}
        if(monster.effects.tempest) {
          monster.effects.tempest=false;
          const report={type:"monster-skip",id:next.nextCombatId++,attackerId:monster.id,attackerName:monster.name,reason:"Tempest · misses this turn"};
          next.lastReport=report;next.pending={type:"report",reportId:report.id};log(next,monster.name+" misses its turn because of Tempest.");break;
        }
        if(monster.effects.sleep&&!resumed) {
          const redDice=Array.from({length:monster.mind},()=>die(next)),awake=redDice.includes(6);if(awake){monster.effects.sleep=false;turn.resumeId=monster.id;}
          const report={type:"sleep-check",spellId:"sleep",id:next.nextCombatId++,attackerId:monster.id,attackerName:monster.name,defenderId:monster.id,defenderName:monster.name,
            redDice,rollRole:"monster",rollDescription:"Any 6 breaks Sleep",awake,detail:awake?"Wakes and continues this turn.":"Remains asleep · turn missed."};
          next.lastReport=report;next.pending={type:"report",reportId:report.id};log(next,monster.name+": "+report.detail);break;
        }
        const plan=HQ.zargon.choose(next,monster);motion={actorId:monster.id,from:C.cell(monster),path:[],visibility:[!next.settings.realisticLOS||sight(next).figures.includes(monster.id)]};
        for(const id of plan.path) {
          if(!T.connected(C.cell(monster),id,next)||T.furniture.has(id)||T.occupiedHero(next,id,null)||!next.discoveredCells.includes(id)||motion.path.length>=monster.movement)return reject(state,"The monster route is not legal.");
          [monster.x,monster.row]=T.parse(id);motion.path.push(id);
          motion.visibility.push(!next.settings.realisticLOS||sight(next).figures.includes(monster.id));
        }
        const other=T.monsterAt(next,C.cell(monster),false,monster.id);
        if(other)return reject(state,"A monster cannot finish on another monster’s square.");
        if(motion.path.length)log(next,monster.name+" moves "+motion.path.length+" square"+(motion.path.length===1?"":"s")+".");
        const target=next.heroes.find(h=>h.id===plan.targetId&&C.inPlay(h));
        if(target&&C.adjacent(next,monster,target))combat(next,monster,target,"monster");
        else {
          const report={type:"monster-move",id:next.nextCombatId++,attackerId:monster.id,attackerName:monster.name,steps:motion.path.length};
          next.lastReport=report;next.pending={type:"report",reportId:report.id};log(next,monster.name+(motion.path.length?" cannot reach a hero to attack this turn.":" waits; no hero is reachable this turn."));discover(next);
        }
        break;
      }
      case "ACK_REPORT": {
        if(next.pending?.type!=="report")return reject(state,"There is no combat result waiting.");
        next.pending=null;
        if(next.phase==="hero-turn"&&!C.inPlay(hero))advanceTurn(next);
        else if(next.phase==="monster-turn"&&!next.monsterTurn.resumeId&&next.monsterTurn.index>=next.monsterTurn.queue.length)nextRound(next);
        break;
      }
      case "ACK_HANDOFF": {
        if(next.pending?.type!=="handoff"||next.phase!=="hero-turn")return reject(state,"There is no handoff waiting.");
        next.pending=null;log(next,hero.owner+" takes the "+hero.name+"’s turn.");break;
      }
      case "SET_REALISTIC_LOS":next.settings.realisticLOS=Boolean(command.enabled);discover(next);break;
    }
    return {ok:true,state:next,message:"",motion};
  }
  function project(state) {
    const view=sight(state),known=new Set(state.discoveredEntities),seenFigures=new Set(view.figures),hero=active(state);
    const controllable=state.phase==="hero-turn"&&!state.pending&&C.inPlay(hero);
    const reachable=!controllable||state.movement.closed?new Map():T.routes(state,hero);
    const doors=Q.doors.filter(d=>state.discoveredDoors.includes(d.id)).map(d=>({...d,open:state.openDoors.includes(d.id)}));
    const monsters=state.monsters.filter(m=>C.alive(m)&&known.has(m.id)&&(!state.settings.realisticLOS||seenFigures.has(m.id))).map(m=>({...m,currentlyVisible:seenFigures.has(m.id)}));
    const spellTargets=controllable?[...state.heroes.filter(C.inPlay),...monsters,...doors].filter(target=>HQ.spells.book(hero).some(card=>!HQ.spells.reason(state,hero,card,target,card.id==="genie"&&doors.some(door=>door.id===target.id)?"door":"attack"))).map(target=>target.id):[];
    const focusFigure=state.phase==="monster-turn"||state.phase==="defeat"?monsters.find(m=>m.id===(state.lastReport?.attackerId))||hero:hero;
    const fallen=[...state.heroes,...state.monsters].filter(figure=>figure.body===0&&!figure.trapped&&(state.heroes.includes(figure)||known.has(figure.id))&&state.discoveredCells.includes(C.cell(figure))).map(({id,x,row})=>({id,x,row}));
    return {heroes:state.heroes.filter(C.inPlay),activeHero:hero,focusFigure,phase:state.phase,visibleCells:view.cells,discoveredCells:state.discoveredCells,
      doors,monsters,fallen,furniture:Q.furniture.filter(f=>known.has(f.id)),reachable:[...reachable.keys()],attackTargets:C.targets(state,hero),spellTargets,
      blindMovement:controllable&&state.movement.rolled&&!state.movement.closed&&state.movement.remaining>0&&T.magic(state,hero,"passThroughRock"),
      adjacentDoors:controllable&&!(T.magic(state,hero,"passThroughRock")&&T.unsafe(state,hero))?doors.filter(d=>!d.open&&T.endpoints(d).includes(C.cell(hero))):[],
      discoveredRooms:state.discoveredRooms.length,totalRooms:Q.rooms.length};
  }
  HQ.exploration=Object.freeze({createSession,applyCommand,project,active,heroNames,monsterNames});
})();

(function () {
  "use strict";
  const HQ=window.HeroQuest,Q=HQ.trial,T=HQ.topology,C=HQ.combat,Data=HQ.combatData;
  const heroNames=new Map(HQ.heroes.map(h=>[h.id,h.name]));
  const monsterNames={orc:"Orc",goblin:"Goblin",skeleton:"Skeleton",zombie:"Zombie",mummy:"Mummy",fimir:"Fimir","chaos-warrior":"Chaos Warrior",gargoyle:"Gargoyle"};
  const schemaVersion=15;
  const active=state=>state.heroes[state.turnIndex];
  const freshMovement=()=>({dice:[],remaining:0,rolled:false,started:false,closed:false,veilOfMist:false,passThroughRock:false,swiftWind:false});
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
      state.monsterMemory[m.id]={id:m.id,x:m.x,row:m.row};
      entities.add(m.id);
    }
    for(const door of Q.doors)if(T.endpoints(door).some(id=>visible.has(id)||rooms.has(T.regions.get(id))))doors.add(door.id);
    const added={cells:cells.size-state.discoveredCells.length,rooms:rooms.size-state.discoveredRooms.length,entities:entities.size-state.discoveredEntities.length};
    state.discoveredCells=[...cells];state.discoveredRooms=[...rooms];state.discoveredEntities=[...entities];state.discoveredDoors=[...doors];HQ.spells.maintain(state);return added;
  }
  function log(state,text){state.log.push({id:state.nextEventId++,text});if(state.log.length>60)state.log.shift();}
  function nextRandom(state){let x=state.rng>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;state.rng=x>>>0;return state.rng;}
  function die(state){let value;do{value=nextRandom(state);}while(value>=4294967292);return value%6+1;}
  function randomInt(state,count){const limit=Math.floor(4294967296/count)*count;let value;do{value=nextRandom(state);}while(value>=limit);return value%count;}
  function createSession(config,seed) {
    const heroIds=config.heroIds??HQ.heroes.map(h=>h.id);
    if(!Array.isArray(heroIds)||heroIds.length<1||heroIds.length>4||new Set(heroIds).size!==heroIds.length||heroIds.some(id=>!heroNames.has(id)))
      throw new Error("Choose between one and four different heroes.");
    const selected=new Set(heroIds),spellGroups=HQ.spells.groups(config,heroIds);
    const state={schemaVersion,contentVersion:Q.id,phase:"hero-turn",round:1,turnIndex:0,extraAttack:false,belongings:[],questRecovery:null,
      rng:(seed>>>0)||0x4845524f,pending:null,actionUsed:false,monsterTurn:null,lastReport:null,lastItemUse:null,nextCombatId:1,
      heroes:HQ.heroes.filter(h=>selected.has(h.id)).map(h=>({...h,...Data.heroes[h.id],name:h.name,maxBody:Data.heroes[h.id].body,exit:null,
        spellGroups:spellGroups[h.id]||[],spellsUsed:[],effects:{...HQ.spells.heroEffects(),...HQ.inventory.effects()},trapped:false,actionUsed:false,deathResolved:false,inventory:HQ.inventory.fresh({id:h.id,weapon:Data.heroes[h.id].weapon}),
        owner:String(config.owners?.[h.id]||"Player 1").trim().slice(0,24)||"Player 1"})),
      monsters:Q.monsters.map(m=>({id:m.id,kind:m.kind,x:m.x,row:m.row,...Data.monsters[m.kind],
        maxBody:Data.monsters[m.kind].body,name:m.name||monsterNames[m.kind],effects:HQ.spells.monsterEffects(),diedInPlay:false,
        ...(m.note==="C"?{attack:Q.notes.C.attackDice,overrideSource:Data.sources.guardian}:{})})),
      dungeon:HQ.dungeon.fresh(),movement:freshMovement(),openDoors:[],discoveredCells:[],discoveredRooms:[Q.startingRoom],
      discoveredEntities:[],discoveredDoors:[],monsterMemory:{},settings:{realisticLOS:false,fairLootRecovery:config.fairLootRecovery===true},log:[],nextEventId:1};
    state.treasure=HQ.treasure.fresh(state.heroes);
    discover(state);log(state,"The party enters the stairway room. Choose your route together.");return state;
  }
  function handoff(state,index){state.turnIndex=index;state.phase="hero-turn";state.movement=freshMovement();state.actionUsed=false;active(state).actionUsed=false;state.extraAttack=false;state.pending={type:"handoff",heroId:active(state).id};}
  function nextRound(state) {
    state.monsterTurn=null;state.round++;log(state,"Round "+state.round+" begins.");handoff(state,state.heroes.findIndex(C.inPlay));
  }
  function finishQuest(state) {
    const outcome=HQ.quest.outcome(state);
    if(!outcome)return false;
    state.phase=outcome;state.monsterTurn=null;state.movement=freshMovement();state.extraAttack=false;
    const text={victory:"The Trial is complete. Verag is defeated and a hero has returned safely.",
      retreat:"The Trial ended before a hero completed its objective and returned safely.",defeat:"The party has fallen. The Trial has failed."};
    log(state,text[outcome]);completeRecovery(state);return true;
  }
  function completeRecovery(state){
    if(!HQ.recovery.complete(state))return;
    for(const result of state.questRecovery){
      const name=heroNames.get(result.heroId);
      log(state,name+" returns to life after the completed quest."+(result.carrierId?" Their sealed bag was recovered by "+heroNames.get(result.carrierId)+"; possessions returned.":" Their bag was not brought back by a completing hero; possessions lost."));
    }
  }
  function advanceTurn(state) {
    state.extraAttack=false;
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
  function combat(state,attacker,defender,side,options={}) {
    const report=C.resolve(state,attacker,defender,side,die,options);
    if(options.throwItemId!==undefined)HQ.inventory.removeItem(attacker,options.throwItemId);
    state.lastReport={type:"combat",...report};state.pending={type:"report",reportId:report.id};
    log(state,attacker.name+(report.thrownItemId?" throws a Dagger at ":" attacks ")+defender.name+": "+report.skulls+" skull"+(report.skulls===1?"":"s")+", "+report.shields+" block"+(report.shields===1?"":"s")+", "+report.damage+" Body Point"+(report.damage===1?"":"s")+" lost."+(report.thrownItemId?" The Dagger is lost.":""));
    if(report.defeated)log(state,HQ.inventory.recoveryHero(state)?defender.name+" can use their own healing to escape death.":defender.name+" is defeated and removed from the board.");
    if(!HQ.inventory.recoveryHero(state))finishQuest(state);
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
  const commands=new Set(["ROLL_MOVEMENT","MOVE","OPEN_DOOR","ATTACK","FINISH_ATTACKS","CAST_SPELL","RECOVER_SPELL","TAKE_BELONGINGS","SEARCH_TREASURE","SEARCH_TRAPS","SEARCH_SECRET_DOORS","DISARM_TRAP","JUMP_TRAP","ESCAPE_FALLING_BLOCK","USE_ITEM","GIVE_ITEM","BUY_EQUIPMENT","SELL_EQUIPMENT","SET_EQUIPMENT","SET_RULES","END_TURN","EXIT_QUEST","ACK_HANDOFF","RESOLVE_MONSTER","ACK_REPORT"]);
  const pendingCommands=new Set(["ACK_HANDOFF","ACK_REPORT","RESOLVE_MONSTER","USE_ITEM","RECOVER_SPELL","ESCAPE_FALLING_BLOCK"]);
  const heroCommands=new Set(["ROLL_MOVEMENT","MOVE","OPEN_DOOR","ATTACK","FINISH_ATTACKS","CAST_SPELL","SEARCH_TREASURE","SEARCH_TRAPS","SEARCH_SECRET_DOORS","DISARM_TRAP","JUMP_TRAP","END_TURN","EXIT_QUEST"]);
  const movementCommands=new Set(["ROLL_MOVEMENT","MOVE"]),freeGroundCommands=new Set(["OPEN_DOOR","ATTACK","CAST_SPELL","EXIT_QUEST"]);
  function commandReason(state,command){
    if(!state||state.contentVersion!==Q.id)return "Start a new adventure first.";
    if(!command||!commands.has(command.type))return "That action is not available.";
    if(state.pending&&!pendingCommands.has(command.type))return "Finish the current handoff or result first.";
    if(heroCommands.has(command.type)&&(state.phase!=="hero-turn"||!C.inPlay(active(state))))return "Wait for a living hero’s turn.";
    if(state.extraAttack&&movementCommands.has(command.type))return "Take your second attack or choose Finish attacks before moving.";
    if(freeGroundCommands.has(command.type)&&T.magic(state,active(state),"passThroughRock")&&T.unsafe(state,active(state)))return "Move into a free square before acting.";
    return "";
  }
  function applyCommand(state,command) {
    const reason=commandReason(state,command);if(reason)return reject(state,reason);
    const next=JSON.parse(JSON.stringify(state)),hero=active(next);let motion=null;
    switch(command.type) {
      case "ROLL_MOVEMENT": {
        if(next.movement.closed)return reject(state,"Movement ended when you acted after moving.");
        if(next.movement.rolled)return reject(state,"Movement has already been rolled this turn.");
        const swiftWind=hero.effects.swiftWind,dice=Array.from({length:HQ.inventory.movementDice(hero)*(swiftWind?2:1)},()=>die(next));hero.effects.swiftWind=false;
        next.movement={...freshMovement(),dice,swiftWind,remaining:dice.reduce((a,b)=>a+b,0),rolled:true};
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
          const added=discover(next),trap=HQ.dungeon.at(next,id);
          if(trap&&(!T.occupiedHero(next,id,hero.id)||T.stairs.has(id))) {
            const previous=motion.path.length>1?motion.path.at(-2):motion.from;
            next.lastReport=HQ.dungeon.spring(next,hero,trap,die,previous);next.pending={type:"report",reportId:next.lastReport.id};
            log(next,hero.name+": "+next.lastReport.detail);
            if(!HQ.inventory.recoveryHero(next))finishQuest(next);discover(next);break;
          }
          if((added.cells||added.entities||added.rooms)&&(rock||T.canStop(next,id,hero.id))){interrupted=true;break;}
        }
        // A newly encountered blocker must not strand a hero on a friend or a
        // rock transit cell. Back up only the occupied tail of the actual path.
        while(!rock&&next.pending?.type!=="report"&&motion.path.length&&!T.canStop(next,C.cell(hero),hero.id)) {
          const from=C.cell(hero);motion.path.pop();const to=motion.path.at(-1)||motion.from;
          next.movement.remaining+=T.movementCost(to,from);[hero.x,hero.row]=T.parse(to);
        }
        if(motion.path.length){const spent=T.routeCost(motion.from,motion.path);log(next,spent?hero.name+" moves "+spent+" space"+(spent===1?"":"s")+".":hero.name+" moves within the stairway.");}
        if(interrupted)log(next,"New ground comes into view. Review the reveal before continuing your movement.");
        if(rock&&!next.pending&&next.movement.remaining===0&&T.unsafe(next,hero))trapped(next,hero);
        break;
      }
      case "OPEN_DOOR": {
        const door=HQ.dungeon.doors(next).find(d=>d.id===command.id);
        if(!door||!next.discoveredDoors.includes(door.id))return reject(state,"Select a discovered closed door.");
        if(next.openDoors.includes(door.id))return reject(state,"That door is already open.");
        if(!T.endpoints(door).includes(C.cell(hero)))return reject(state,"Move next to the door to open it.");
        next.openDoors.push(door.id);discover(next);log(next,hero.name+" opens a door. Opening a door uses no movement or action.");break;
      }
      case "ATTACK": {
        const options=command.throwItemId===undefined?{}:{throwItemId:command.throwItemId};
        const target=C.targets(next,hero,options).find(m=>m.id===command.targetId);
        if(!target)return reject(state,next.actionUsed?"Your action has already been used.":"Choose a revealed living monster within your weapon’s reach.");
        next.extraAttack=!next.actionUsed&&hero.effects.heroicBrew;
        hero.effects.heroicBrew=false;next.actionUsed=true;
        if(next.movement.started){next.movement.closed=true;next.movement.remaining=0;}
        combat(next,hero,target,"hero",{...options,weaponId:C.attackWeapon(hero,options)});
        const throwable=C.throwables(hero)[0];
        if(!next.monsters.some(monster=>next.discoveredEntities.includes(monster.id)&&(C.canAttack(next,hero,monster)||throwable&&C.canAttack(next,hero,monster,{throwItemId:throwable.id}))))next.extraAttack=false;
        break;
      }
      case "FINISH_ATTACKS":
        if(!next.extraAttack)return reject(state,"There is no extra attack to finish.");
        next.extraAttack=false;log(next,hero.name+" finishes attacking.");break;
      case "CAST_SPELL": {
        const card=HQ.spellData.byId[command.spellId],doorMode=card?.id==="genie"&&command.mode==="door",target=(doorMode?HQ.dungeon.doors(next):[...next.heroes,...next.monsters]).find(f=>f.id===command.targetId);
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
      case "BUY_EQUIPMENT": {
        const owner=next.heroes.find(hero=>hero.id===command.heroId),reason=HQ.armoury.buyReason(next,owner,command.kind);
        if(reason)return reject(state,reason);
        const item=HQ.armoury.buy(next,owner,command.kind);
        log(next,owner.name+" buys "+item.name+" for "+item.price+" gold."+(item.slot?" It is carried until equipped.":""));break;
      }
      case "SELL_EQUIPMENT": {
        const owner=next.heroes.find(hero=>hero.id===command.heroId),reason=HQ.armoury.sellReason(next,owner,command.itemId);
        if(reason)return reject(state,reason);
        const item=HQ.armoury.sell(owner,command.itemId);
        log(next,owner.name+" sells "+item.name+" for "+HQ.armoury.sellPrice(item)+" gold.");break;
      }
      case "SET_RULES": {
        if(HQ.quest.isEnded(next.phase))return reject(state,"Choose recovery rules before the quest ends.");
        if(typeof command.fairLootRecovery!=="boolean")return reject(state,"Choose a recovery rule.");
        next.settings.fairLootRecovery=command.fairLootRecovery;
        log(next,"Fair loot recovery "+(command.fairLootRecovery?"enabled":"disabled")+" for future hero deaths. Existing sealed bags keep their recovery rules.");break;
      }
      case "SET_EQUIPMENT": {
        if(typeof command.equip!=="boolean")return reject(state,"Choose Equip or Unequip.");
        const owner=next.heroes.find(hero=>hero.id===command.heroId),reason=HQ.inventory.equipReason(next,owner,command.itemId,command.equip);
        if(reason)return reject(state,reason);
        const definition=HQ.inventory.equip(owner,command.itemId,command.equip);
        log(next,owner.name+(command.equip?" equips ":" puts away ")+definition.name+".");break;
      }
      case "RECOVER_SPELL": {
        const owner=next.heroes.find(hero=>hero.id===command.heroId),reason=HQ.recovery.spellReason(next,owner,command.spellId);
        if(reason)return reject(state,reason);
        HQ.recovery.cast(next,owner,command.spellId);
        log(next,owner.name+" saves themselves with "+HQ.spellData.byId[command.spellId].name+", restoring "+owner.body+" Body.");
        discover(next);break;
      }
      case "TAKE_BELONGINGS": {
        const loot=next.belongings.find(loot=>loot.id===command.id),reason=HQ.recovery.takeReason(next,hero,loot);
        if(reason)return reject(state,reason);
        HQ.recovery.take(next,hero,loot);log(next,hero.name+" picks up "+heroNames.get(loot.heroId)+"’s sealed bag. Its contents stay reserved for their owner.");break;
      }
      case "USE_ITEM": {
        const owner=next.heroes.find(hero=>hero.id===command.heroId),reason=HQ.inventory.reason(next,owner,command.itemId);
        if(reason)return reject(state,reason);
        const use=HQ.inventory.drink(next,owner,command.itemId,die);
        const name=HQ.itemData.byId[use.itemKind].name;
        log(next,owner.name+" drinks "+name+": "+(use.redDice.length?"rolls "+use.redDice[0]+", restores "+use.healed+" Body.":use.detail));
        discover(next);break;
      }
      case "GIVE_ITEM": {
        const owner=next.heroes.find(hero=>hero.id===command.heroId),target=next.heroes.find(hero=>hero.id===command.targetId);
        if(!target)return reject(state,"Choose a hero to receive the item.");
        const reason=HQ.inventory.giveReason(next,owner,command.itemId,target);if(reason)return reject(state,reason);
        const item=HQ.inventory.give(owner,target,command.itemId);
        log(next,owner.name+" gives "+HQ.itemData.byId[item.kind].name+" to "+target.name+".");break;
      }
      case "SEARCH_TRAPS":
      case "SEARCH_SECRET_DOORS": {
        const kind=command.type==="SEARCH_TRAPS"?"traps":"doors",reason=HQ.dungeon.searchReason(next,hero,kind);if(reason)return reject(state,reason);
        const report=HQ.dungeon.search(next,hero,kind);
        next.lastReport=report;next.pending={type:"report",reportId:report.id};log(next,hero.name+": "+report.detail);break;
      }
      case "JUMP_TRAP":
      case "DISARM_TRAP": {
        const trap=HQ.dungeon.traps(next).find(trap=>trap.id===command.id);
        if(command.type==="JUMP_TRAP") {
          const over=command.over||(trap&&HQ.dungeon.cell(trap));
          if(!HQ.dungeon.jumpLandings(next,hero,over).includes(command.to))return reject(state,"Jump over a discovered floor trap or open pit with two moves and a clear landing.");
          beginMove(next,hero,2);
          const actual=HQ.dungeon.at(next,over);
          next.lastReport=HQ.dungeon.jump(next,hero,actual,command.to,die);
          // A landing square may itself conceal a trap. Only resolve it after
          // the jump reaches it, never during the preview/target picker.
          const landing=HQ.dungeon.at(next,C.cell(hero));
          if(landing&&next.lastReport.trapId!==landing.id&&next.lastReport.jumpTo===command.to){
            const jumped=next.lastReport;next.lastReport=HQ.dungeon.spring(next,hero,landing,die,over);
            next.lastReport.operation="jump";next.lastReport.jumpFrom=jumped.jumpFrom;next.lastReport.jumpTo=jumped.jumpTo;
            next.lastReport.rolls.unshift(...jumped.rolls);
          }
        } else {
          const reason=HQ.dungeon.disarmReason(next,hero,trap);if(reason)return reject(state,reason);
          if(trap.kind!=="furniture")beginMove(next,hero,1);
          next.lastReport=HQ.dungeon.disarm(next,hero,trap,die);
        }
        next.pending={type:"report",reportId:next.lastReport.id};log(next,hero.name+": "+next.lastReport.detail);
        if(!HQ.inventory.recoveryHero(next))finishQuest(next);discover(next);break;
      }
      case "ESCAPE_FALLING_BLOCK": {
        if(!HQ.dungeon.mustEscape(next)||!HQ.dungeon.escapeCells(next,next.lastReport).includes(command.to))return reject(state,"Choose an empty square ahead or behind the falling blocks.");
        motion={actorId:hero.id,from:C.cell(hero),path:[command.to]};[hero.x,hero.row]=T.parse(command.to);next.lastReport.escaped=true;next.lastReport.detail="Moved clear of the falling blocks. Turn ends.";discover(next);break;
      }
      case "SEARCH_TREASURE": {
        const reason=HQ.treasure.reason(next,hero);if(reason)return reject(state,reason);
        const furnitureTrap=HQ.dungeon.traps(next).find(trap=>trap.kind==="furniture"&&HQ.dungeon.record(next,trap.id).status!=="disarmed"&&HQ.dungeon.record(next,trap.id).status!=="sprung"&&HQ.dungeon.within(next,hero,HQ.dungeon.cell(trap)));
        if(furnitureTrap) {
          const report=HQ.dungeon.spring(next,hero,furnitureTrap,die,C.cell(hero));next.actionUsed=true;next.extraAttack=false;
          next.lastReport=report;next.pending={type:"report",reportId:report.id};log(next,hero.name+": "+report.detail);
          if(!HQ.inventory.recoveryHero(next))finishQuest(next);discover(next);break;
        }
        const report=HQ.treasure.resolve(next,hero,randomInt);next.lastReport=report;next.pending={type:"report",reportId:report.id};
        log(next,hero.name+" searches for treasure: "+report.detail);
        if(!HQ.inventory.recoveryHero(next))finishQuest(next);discover(next);break;
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
        const plan=HQ.zargon.choose(next,monster);motion={actorId:monster.id,from:C.cell(monster),path:[]};
        for(const id of plan.path) {
          if(!T.connected(C.cell(monster),id,next)||T.furniture.has(id)||T.occupiedHero(next,id,null)||!next.discoveredCells.includes(id)||motion.path.length>=monster.movement)return reject(state,"The monster route is not legal.");
          [monster.x,monster.row]=T.parse(id);motion.path.push(id);
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
        const recovery=HQ.inventory.recoveryHero(next);
        if(recovery&&!command.acceptDefeat)return reject(state,"Choose your own healing or let the hero fall.");
        if(recovery)log(next,recovery.name+" falls without using their healing.");
        const report=next.lastReport;
        if(HQ.dungeon.mustEscape(next)) {
          if(HQ.dungeon.escapeCells(next,report).length)return reject(state,"Move clear of the falling blocks first.");
          hero.body=0;hero.trapped=true;report.escaped=true;report.defeated=true;report.bodyAfter=0;report.damage=report.bodyBefore;report.detail="No escape from the falling blocks. Trapped forever.";
        }
        const fallen=HQ.recovery.casualty(next);
        if(fallen){
          const heirs=HQ.recovery.heirs(next,fallen);
          if(command.recipientId!==undefined&&!heirs.some(owner=>owner.id===command.recipientId))return reject(state,"Choose a companion in the same room or corridor to receive the possessions.");
          if(heirs.length>1&&!command.recipientId)return reject(state,"Choose which companion receives the fallen hero’s possessions.");
          HQ.recovery.finalize(next,fallen,command.recipientId);
          const loot=report.belongings;
          log(next,fallen.name+(loot.outcome==="dropped"?" leaves a sealed bag. A companion can carry it to safety for them.":loot.outcome==="claimed"?"’s possessions pass to "+heroNames.get(loot.recipientId)+".":loot.outcome==="lost"?"’s possessions are lost; no companion could recover them.":" falls without possessions."));
        }
        next.pending=null;
        if(report.type==="treasure"&&report.search.immediateAttack) {
          const monster=next.monsters.find(monster=>monster.id===report.search.wanderingId);
          if(monster&&C.adjacent(next,monster,hero)) {
            combat(next,monster,hero,"monster");next.lastReport.search=report.search;break;
          }
        }
        if(HQ.quest.isEnded(next.phase)){completeRecovery(next);break;}
        if(finishQuest(next))break;
        if(next.phase==="hero-turn"&&(!C.inPlay(hero)||["treasure","trap"].includes(report.type)&&report.endTurn))advanceTurn(next);
        else if(next.phase==="monster-turn"&&!next.monsterTurn.resumeId&&next.monsterTurn.index>=next.monsterTurn.queue.length)nextRound(next);
        break;
      }
      case "ACK_HANDOFF": {
        if(next.pending?.type!=="handoff"||next.phase!=="hero-turn")return reject(state,"There is no handoff waiting.");
        next.pending=null;log(next,hero.owner+" takes the "+hero.name+"’s turn.");break;
      }
    }
    if(state.phase==="hero-turn"&&next.turnIndex===state.turnIndex&&next.round===state.round)hero.actionUsed=next.actionUsed;
    // A zero-health sandbox fixture is not a death. Mark only real accepted
    // living-to-dead transitions so decorative blood has an actual cause.
    for(const monster of next.monsters)if(monster.body===0&&state.monsters.some(previous=>previous.id===monster.id&&previous.body>0))monster.diedInPlay=true;
    return {ok:true,state:next,message:"",motion};
  }
  function project(state) {
    const view=sight(state),known=new Set(state.discoveredEntities),hero=active(state);
    const controllable=state.phase==="hero-turn"&&!state.pending&&C.inPlay(hero);
    const reachable=!controllable||state.movement.closed||state.extraAttack?new Map():T.routes(state,hero);
    const doors=HQ.dungeon.doors(state).filter(d=>state.discoveredDoors.includes(d.id)).map(d=>({...d,open:state.openDoors.includes(d.id)}));
    const monsters=state.monsters.filter(m=>C.alive(m)&&known.has(m.id)).map(m=>({...m}));
    const spellTargets=controllable?[...state.heroes.filter(C.inPlay),...monsters,...doors].filter(target=>HQ.spells.book(hero).some(card=>!HQ.spells.reason(state,hero,card,target,card.id==="genie"&&doors.some(door=>door.id===target.id)?"door":"attack"))).map(target=>target.id):[];
    const focusFigure=state.phase==="monster-turn"||state.phase==="defeat"?monsters.find(m=>m.id===(state.lastReport?.attackerId))||hero:hero;
    const throwable=C.throwables(hero)[0];
    const fallen=state.monsters.filter(figure=>figure.body===0&&figure.diedInPlay&&known.has(figure.id)&&state.discoveredCells.includes(C.cell(figure))).map(({id,x,row})=>({id,x,row}));
    return {heroes:state.heroes.filter(C.inPlay),activeHero:hero,focusFigure,phase:state.phase,visibleCells:view.cells,discoveredCells:state.discoveredCells,
      doors,monsters,fallen,belongings:state.belongings.filter(loot=>!loot.carrierId&&state.discoveredCells.includes(T.key(loot.x,loot.row))).map(loot=>({...loot,kind:"belongings",name:heroNames.get(loot.heroId)+"’s belongings"})),traps:HQ.dungeon.projection(state),blocked:[...Q.blocked,...HQ.dungeon.blocked(state)].filter(id=>state.discoveredCells.includes(id)),dungeonLayout:state.dungeon.layout,furniture:Q.furniture.filter(f=>known.has(f.id)),reachable:[...reachable.keys()],attackTargets:C.targets(state,hero),throwTargets:throwable?C.targets(state,hero,{throwItemId:throwable.id}):[],spellTargets,
      belongingsTargets:state.belongings.filter(loot=>!HQ.recovery.takeReason(state,hero,loot)).map(loot=>loot.id),
      blindMovement:controllable&&!state.extraAttack&&state.movement.rolled&&!state.movement.closed&&state.movement.remaining>0&&T.magic(state,hero,"passThroughRock"),
      adjacentDoors:controllable&&!(T.magic(state,hero,"passThroughRock")&&T.unsafe(state,hero))?doors.filter(d=>!d.open&&T.endpoints(d).includes(C.cell(hero))):[],
      discoveredRooms:state.discoveredRooms.length,totalRooms:Q.rooms.length};
  }
  // Practice fixtures can refresh discoveries without inventing a game command.
  function refreshDiscoveries(state){const next=JSON.parse(JSON.stringify(state));discover(next);return next;}
  HQ.exploration=Object.freeze({schemaVersion,freshMovement,createSession,applyCommand,project,refreshDiscoveries,active,heroNames,monsterNames});
})();

(function () {
  "use strict";
  const HQ=window.HeroQuest,Q=HQ.trial,T=HQ.topology,C=HQ.combat,Data=HQ.combatData;
  const heroNames=new Map(HQ.heroes.map(h=>[h.id,h.name]));
  const monsterNames={orc:"Orc",goblin:"Goblin",skeleton:"Skeleton",zombie:"Zombie",mummy:"Mummy",fimir:"Fimir","chaos-warrior":"Chaos Warrior",gargoyle:"Gargoyle"};
  const active=state=>state.heroes[state.turnIndex];
  const freshMovement=()=>({dice:[],remaining:0,rolled:false,started:false,closed:false});
  function sight(state) {
    const origins=[...new Set(state.heroes.filter(C.alive).flatMap(h=>T.spaceCells(C.cell(h))))];
    const cells=Q.floor.filter(id=>origins.some(from=>T.canSee(state,from,id)));
    const figures=state.monsters.filter(C.alive).filter(m=>origins.some(from=>T.canSee(state,from,C.cell(m),true))).map(m=>m.id);
    return {cells,figures};
  }
  function discover(state) {
    const view=sight(state),cells=new Set(state.discoveredCells),rooms=new Set(state.discoveredRooms),entities=new Set(state.discoveredEntities),doors=new Set(state.discoveredDoors);
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
    state.discoveredCells=[...cells];state.discoveredRooms=[...rooms];state.discoveredEntities=[...entities];state.discoveredDoors=[...doors];return added;
  }
  function log(state,text){state.log.push({id:state.nextEventId++,text});if(state.log.length>60)state.log.shift();}
  function nextRandom(state){let x=state.rng>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;state.rng=x>>>0;return state.rng;}
  function die(state){let value;do{value=nextRandom(state);}while(value>=4294967292);return value%6+1;}
  function createSession(config,seed) {
    const heroIds=config.heroIds??HQ.heroes.map(h=>h.id);
    if(!Array.isArray(heroIds)||heroIds.length<1||heroIds.length>4||new Set(heroIds).size!==heroIds.length||heroIds.some(id=>!heroNames.has(id)))
      throw new Error("Choose between one and four different heroes.");
    const selected=new Set(heroIds);
    const state={schemaVersion:2,contentVersion:"the-trial-combat-v1",phase:"hero-turn",round:1,turnIndex:0,
      rng:(seed>>>0)||0x4845524f,pending:null,actionUsed:false,monsterTurn:null,lastReport:null,nextCombatId:1,
      heroes:HQ.heroes.filter(h=>selected.has(h.id)).map(h=>({...h,...Data.heroes[h.id],name:h.name,maxBody:Data.heroes[h.id].body,
        owner:String(config.owners?.[h.id]||"Player 1").trim().slice(0,24)||"Player 1"})),
      monsters:Q.monsters.map(m=>({id:m.id,kind:m.kind,x:m.x,row:m.row,...Data.monsters[m.kind],
        maxBody:Data.monsters[m.kind].body,name:m.name||monsterNames[m.kind],
        ...(m.note==="C"?{attack:Q.notes.C.attackDice,overrideSource:Data.sources.guardian}:{})})),
      movement:freshMovement(),openDoors:[],discoveredCells:[],discoveredRooms:[Q.startingRoom],
      discoveredEntities:[],discoveredDoors:[],monsterMemory:{},settings:{realisticLOS:Boolean(config.realisticLOS)},log:[],nextEventId:1};
    discover(state);log(state,"The party enters the stairway room. Choose your route together.");return state;
  }
  function handoff(state,index){state.turnIndex=index;state.phase="hero-turn";state.movement=freshMovement();state.actionUsed=false;state.pending={type:"handoff",heroId:active(state).id};}
  function nextRound(state) {
    state.monsterTurn=null;state.round++;log(state,"Round "+state.round+" begins.");handoff(state,state.heroes.findIndex(C.alive));
  }
  function combat(state,attacker,defender,side) {
    const report=C.resolve(state,attacker,defender,side,die);state.lastReport={type:"combat",...report};state.pending={type:"report",reportId:report.id};
    log(state,attacker.name+" attacks "+defender.name+": "+report.skulls+" skull"+(report.skulls===1?"":"s")+", "+report.shields+" block"+(report.shields===1?"":"s")+", "+report.damage+" Body Point"+(report.damage===1?"":"s")+" lost.");
    if(report.defeated)log(state,defender.name+" is defeated and removed from the board.");
    if(!state.heroes.some(C.alive)){state.phase="defeat";state.monsterTurn=null;log(state,"The party has fallen. The combat prototype ends here.");}
    discover(state);
  }
  function reject(state,message){return {ok:false,state,message};}
  function applyCommand(state,command) {
    if(!state||state.contentVersion!=="the-trial-combat-v1")return reject(state,"Start a new adventure first.");
    const allowed=["ROLL_MOVEMENT","MOVE","OPEN_DOOR","ATTACK","END_TURN","ACK_HANDOFF","RESOLVE_MONSTER","ACK_REPORT","SET_REALISTIC_LOS"];
    if(!command||!allowed.includes(command.type))return reject(state,"That action is not available.");
    if(state.pending&&!['ACK_HANDOFF','ACK_REPORT','RESOLVE_MONSTER','SET_REALISTIC_LOS'].includes(command.type))return reject(state,"Finish the current handoff or result first.");
    if(["ROLL_MOVEMENT","MOVE","OPEN_DOOR","ATTACK","END_TURN"].includes(command.type)&&(state.phase!=="hero-turn"||!C.alive(active(state))))return reject(state,"Wait for a living hero’s turn.");
    const next=JSON.parse(JSON.stringify(state)),hero=active(next);let motion=null;
    switch(command.type) {
      case "ROLL_MOVEMENT": {
        if(next.movement.closed)return reject(state,"Movement ended when you attacked after moving.");
        if(next.movement.rolled)return reject(state,"Movement has already been rolled this turn.");
        const dice=[die(next),die(next)];next.movement={...freshMovement(),dice,remaining:dice[0]+dice[1],rolled:true};
        log(next,hero.name+" rolls "+dice[0]+" + "+dice[1]+" for "+next.movement.remaining+" movement.");break;
      }
      case "MOVE": {
        if(next.movement.closed)return reject(state,"You cannot move again after moving and then attacking.");
        const path=T.routes(next,hero).get(command.to);if(!path)return reject(state,!next.movement.rolled?"Roll movement before leaving the stairway.":"Choose an unoccupied highlighted square within your remaining movement.");
        motion={actorId:hero.id,from:C.cell(hero),path:[]};let interrupted=false;
        for(const id of path) {
          const monster=T.monsterAt(next,id);
          if(monster){if(!next.discoveredEntities.includes(monster.id))next.discoveredEntities.push(monster.id);interrupted=true;break;}
          const cost=T.movementCost(C.cell(hero),id),[x,row]=T.parse(id);hero.x=x;hero.row=row;next.movement.remaining-=cost;if(cost)next.movement.started=true;motion.path.push(id);
          const added=discover(next);if((added.cells||added.entities||added.rooms)&&T.canStop(next,id,hero.id)){interrupted=true;break;}
        }
        if(motion.path.length){const spent=T.routeCost(motion.from,motion.path);log(next,spent?hero.name+" moves "+spent+" space"+(spent===1?"":"s")+".":hero.name+" repositions within the shared stairway.");}
        if(interrupted)log(next,"New ground comes into view. Review the reveal before continuing your movement.");break;
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
        if(!target)return reject(state,next.actionUsed?"Your attack action has already been used.":"Choose an adjacent living monster across an open edge.");
        next.actionUsed=true;
        if(next.movement.started){next.movement.closed=true;next.movement.remaining=0;}
        combat(next,hero,target,"hero");break;
      }
      case "END_TURN": {
        const index=next.heroes.findIndex((h,i)=>i>next.turnIndex&&C.alive(h));
        if(index>=0)handoff(next,index);
        else {
          const queue=next.monsters.filter(m=>C.alive(m)&&next.discoveredEntities.includes(m.id)).map(m=>m.id);
          if(!queue.length)nextRound(next);
          else {next.phase="monster-turn";next.monsterTurn={queue,index:0};next.pending={type:"monster-intro"};next.movement=freshMovement();log(next,"Zargon’s turn: the revealed monsters act once each.");}
        }
        break;
      }
      case "RESOLVE_MONSTER": {
        if(next.phase!=="monster-turn"||next.pending&&next.pending.type!=="monster-intro")return reject(state,"Review the current result before the next monster acts.");
        next.pending=null;const turn=next.monsterTurn;let monster=null;
        while(turn.index<turn.queue.length&&!monster) {
          const id=turn.queue[turn.index++];
          const candidate=next.monsters.find(m=>m.id===id);
          if(candidate&&C.alive(candidate))monster=candidate;
        }
        if(!monster){nextRound(next);break;}
        const plan=HQ.zargon.choose(next,monster);motion={actorId:monster.id,from:C.cell(monster),path:[],visibility:[!next.settings.realisticLOS||sight(next).figures.includes(monster.id)]};
        for(const id of plan.path) {
          if(!T.connected(C.cell(monster),id,next)||T.furniture.has(id)||T.occupiedHero(next,id,null)||!next.discoveredCells.includes(id)||motion.path.length>=monster.movement)return reject(state,"The monster route is not legal.");
          [monster.x,monster.row]=T.parse(id);motion.path.push(id);
          motion.visibility.push(!next.settings.realisticLOS||sight(next).figures.includes(monster.id));
        }
        const other=T.monsterAt(next,C.cell(monster),false,monster.id);
        if(other)return reject(state,"A monster cannot finish on another monster’s square.");
        if(motion.path.length)log(next,monster.name+" moves "+motion.path.length+" square"+(motion.path.length===1?"":"s")+".");
        const target=next.heroes.find(h=>h.id===plan.targetId&&C.alive(h));
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
        if(next.phase==="monster-turn"&&next.monsterTurn.index>=next.monsterTurn.queue.length)nextRound(next);
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
    const controllable=state.phase==="hero-turn"&&!state.pending&&C.alive(hero);
    const reachable=!controllable||state.movement.closed?new Map():T.routes(state,hero);
    const doors=Q.doors.filter(d=>state.discoveredDoors.includes(d.id)).map(d=>({...d,open:state.openDoors.includes(d.id)}));
    const monsters=state.monsters.filter(m=>C.alive(m)&&known.has(m.id)&&(!state.settings.realisticLOS||seenFigures.has(m.id))).map(m=>({...m,currentlyVisible:seenFigures.has(m.id)}));
    const focusFigure=state.phase==="monster-turn"||state.phase==="defeat"?monsters.find(m=>m.id===(state.lastReport?.attackerId))||hero:hero;
    return {heroes:state.heroes.filter(C.alive),activeHero:hero,focusFigure,phase:state.phase,visibleCells:view.cells,discoveredCells:state.discoveredCells,
      doors,monsters,furniture:Q.furniture.filter(f=>known.has(f.id)),reachable:[...reachable.keys()],attackTargets:C.targets(state,hero),
      adjacentDoors:controllable?doors.filter(d=>!d.open&&T.endpoints(d).includes(C.cell(hero))):[],
      discoveredRooms:state.discoveredRooms.length,totalRooms:Q.rooms.length};
  }
  HQ.exploration=Object.freeze({createSession,applyCommand,project,active,heroNames,monsterNames});
})();

(function () {
  "use strict";
  const HQ=window.HeroQuest,T=HQ.topology,C=HQ.combat;
  const layout=state=>HQ.dungeonData.layouts[state.dungeon?.layout||"trial"];
  const traps=state=>layout(state).traps;
  const doors=state=>[...HQ.quests.forState(state).doors,...layout(state).doors];
  const record=(state,id)=>state.dungeon?.traps?.[id]||{status:"hidden",foundRound:0,foundTurn:0};
  const cell=trap=>trap.kind==="furniture"&&trap.x===undefined?C.cell(HQ.quests.list.flatMap(quest=>quest.furniture).find(item=>item.id===trap.furnitureId)):C.cell(trap);
  const names={pit:"Pit trap",spear:"Spear trap","falling-block":"Falling-block trap",furniture:"Trapped furniture"};
  const fresh=(id="trial")=>({layout:id,traps:Object.fromEntries(HQ.dungeonData.layouts[id].traps.map(trap=>[trap.id,{status:"hidden",foundRound:0,foundTurn:0}])),searched:{traps:[],doors:[]}});
  const at=(state,id)=>traps(state).find(trap=>trap.kind!=="furniture"&&cell(trap)===id&&record(state,trap.id).status!=="disarmed"&&!(["spear","falling-block"].includes(trap.kind)&&record(state,trap.id).status==="sprung"));
  const blocked=state=>traps(state).filter(trap=>trap.kind==="falling-block"&&record(state,trap.id).status==="sprung").map(cell);
  const jumpable=(state,trap)=>Boolean(trap&&["pit","spear","falling-block"].includes(trap.kind)&&
    (record(state,trap.id).status==="found"||trap.kind==="pit"&&record(state,trap.id).status==="sprung"));
  const inPit=(state,actor)=>at(state,C.cell(actor))?.kind==="pit"&&record(state,at(state,C.cell(actor)).id).status==="sprung";
  const pitRoom=(state,actor)=>inPit(state,actor)?"pit:"+at(state,C.cell(actor)).id:null;
  function corridorCells(state,from) {
    const known=new Set(state.discoveredCells),cells=new Set([from]);
    const corridor=id=>known.has(id)&&T.regions.get(id)==="corridor"&&!T.blockedAt(state,id);
    function run(start,dx,dy) {
      const result=[start];
      for(const sign of [-1,1]){
        let previous=start;
        while(true){
          const [x,row]=T.parse(previous),next=T.key(x+dx*sign,row+dy*sign);
          if(!corridor(next)||!T.connected(previous,next,state))break;
          if(sign<0)result.unshift(next);else result.push(next);previous=next;
        }
      }
      return result;
    }
    // Trace straight runs only. Equal parallel runs include both lanes of a
    // wide corridor, without flooding sideways into bends or other passages.
    for(const [dx,dy] of [[1,0],[0,1]]){
      const base=run(from,dx,dy),axis=dx?0:1;
      for(const id of base)cells.add(id);
      for(const sign of [-1,1]){
        let previous=from;
        while(true){
          const [x,row]=T.parse(previous),next=T.key(x+dy*sign,row+dx*sign);
          if(!corridor(next)||!T.connected(previous,next,state))break;
          const parallel=run(next,dx,dy);
          if(parallel.length!==base.length||T.parse(parallel[0])[axis]!==T.parse(base[0])[axis])break;
          for(const id of parallel)cells.add(id);previous=next;
        }
      }
    }
    return cells;
  }
  function searchArea(state,hero) {
    const from=C.cell(hero),pit=pitRoom(state,hero),region=T.regions.get(from);
    if(pit)return {keys:[pit],cells:new Set([from]),name:"pit"};
    if(region==="corridor"){const cells=corridorCells(state,from);return {keys:[...cells],cells,name:"corridor stretch"};}
    return {keys:[region],cells:new Set([...T.regions].filter(([,room])=>room===region).map(([id])=>id)),name:"room"};
  }
  function within(state,hero,id) {
    return searchArea(state,hero).cells.has(id);
  }
  function actionReason(state,hero) {
    if(state.phase!=="hero-turn"||state.pending||!C.inPlay(hero)||state.heroes[state.turnIndex]?.id!==hero.id)return "Wait for your hero’s turn.";
    if(state.actionUsed)return "Your action has already been used this turn.";
    if(T.unsafe(state,hero))return "Reach a free square before acting.";
    return "";
  }
  function searchReason(state,hero,kind) {
    const reason=actionReason(state,hero)||(HQ.spells.seesMonster(state,hero)?"You cannot search while a monster is visible to this hero.":"");
    if(reason)return reason;
    const area=searchArea(state,hero),searched=state.dungeon.searched[kind];
    return area.keys.every(key=>searched.includes(key))?"Already searched for "+(kind==="traps"?"traps":"secret doors")+" in this "+area.name+".":"";
  }
  function spendAction(state,{continueMoving=false}={}) {
    state.actionUsed=true;state.extraAttack=false;
    if(state.movement.started&&!continueMoving){state.movement.closed=true;state.movement.remaining=0;}
  }
  function search(state,hero,kind) {
    const area=searchArea(state,hero),searched=state.dungeon.searched[kind];
    searched.push(...area.keys.filter(key=>!searched.includes(key)));spendAction(state);let found=0;
    if(kind==="traps")for(const trap of traps(state))if(record(state,trap.id).status==="hidden"&&area.cells.has(cell(trap))){
      Object.assign(record(state,trap.id),{status:"found",foundRound:state.round,foundTurn:state.turnIndex});found++;
    }
    if(kind==="doors")for(const door of layout(state).doors)if(!state.discoveredDoors.includes(door.id)&&T.endpoints(door).some(id=>area.cells.has(id))){state.discoveredDoors.push(door.id);found++;}
    return {type:"dungeon-search",id:state.nextCombatId++,attackerId:hero.id,attackerName:hero.name,searchKind:kind,found,
      detail:found?found+" "+(kind==="traps"?"trap":"secret door")+(found===1?"":"s")+" found.":"No "+(kind==="traps"?"traps":"secret doors")+" found."};
  }
  function trapReport(state,hero,trap,operation) {
    return {type:"trap",id:state.nextCombatId++,attackerId:hero.id,attackerName:hero.name,defenderId:hero.id,defenderName:hero.name,
      trapId:trap.id,trapKind:trap.kind,statusBefore:trap.id?record(state,trap.id).status:"clear",operation,rolls:[],bodyBefore:hero.body,bodyAfter:hero.body,maxBody:hero.maxBody,damage:0,defeated:false,endTurn:false,detail:""};
  }
  function hurt(hero,count) {hero.body=Math.max(0,hero.body-count);if(count)hero.effects.rockSkin=false;}
  function endMovement(state){state.movement.remaining=0;state.movement.closed=state.movement.rolled;}
  function finishReport(report,hero){Object.assign(report,{bodyAfter:hero.body,damage:report.bodyBefore-hero.body,defeated:hero.body===0});return report;}
  function spring(state,hero,trap,die,from,report=trapReport(state,hero,trap,"spring")) {
    const saved=record(state,trap.id),already=saved.status==="sprung";
    saved.status="sprung";
    if(trap.kind==="pit") {hurt(hero,1);endMovement(state);report.endTurn=true;report.detail="Fell into a pit. Lose 1 Body; turn ends.";}
    else if(trap.kind==="spear") {
      const face=HQ.combatData.faces[die(state)-1];report.rolls.push({label:"Spear trap",description:"A skull loses 1 Body and ends the turn",faces:[face]});
      if(face==="skull"){hurt(hero,1);endMovement(state);report.endTurn=true;report.detail="Hit by the spear. Turn ends.";}
      else report.detail="Dodged the spear. Continue moving.";
    } else if(trap.kind==="falling-block"&&!already) {
      const faces=Array.from({length:3},()=>HQ.combatData.faces[die(state)-1]);hurt(hero,faces.filter(face=>face==="skull").length);
      report.rolls.push({label:"Falling blocks",description:"Each skull loses 1 Body; no defence roll",faces});report.fallingFrom=from;
      endMovement(state);report.endTurn=true;report.detail="Falling blocks seal this square. Choose a clear square ahead or behind.";
    } else if(trap.kind==="furniture") {hurt(hero,trap.damage);endMovement(state);report.endTurn=true;report.detail="A furniture trap springs. Lose "+trap.damage+" Body; turn ends.";}
    return finishReport(report,hero);
  }
  function jumpLandings(state,hero,id) {
    if(!jumpable(state,at(state,id)))return [];
    if(state.phase!=="hero-turn"||state.pending||state.extraAttack||state.movement.closed||!state.movement.rolled||state.movement.remaining<2)return [];
    const from=C.cell(hero);
    if(!state.discoveredCells.includes(id)||!T.connected(from,id,state)||T.furniture.has(id)||T.occupiedHero(state,id,hero.id)||T.monsterAt(state,id,true))return [];
    return T.neighbors(id).filter(to=>to!==from&&state.discoveredCells.includes(to)&&T.connected(id,to,state)&&T.canStop(state,to,hero.id));
  }
  function jump(state,hero,trap,to,die) {
    const from=C.cell(hero),report=trapReport(state,hero,trap,"jump"),face=HQ.combatData.faces[die(state)-1];
    report.rolls.push({label:"Jump",description:"Any shield clears the trap; a skull springs it",faces:[face]});
    state.movement.started=true;state.movement.remaining-=2;
    const destination=face==="skull"?cell(trap):to;[hero.x,hero.row]=T.parse(destination);
    report.jumpFrom=from;report.jumpTo=destination;
    if(face==="skull"){spring(state,hero,trap,die,from,report);endMovement(state);report.endTurn=true;}
    else report.detail="Jumped safely over the trap. Continue moving.";
    return finishReport(report,hero);
  }
  function disarmReason(state,hero,trap,{approaching=false}={}) {
    const reason=actionReason(state,hero);if(reason)return reason;
    if(!trap||record(state,trap.id).status!=="found")return "Only a discovered, unsprung trap can be disarmed.";
    const saved=record(state,trap.id);
    if(saved.foundRound===state.round&&saved.foundTurn===state.turnIndex)return "Disarm on a later turn after the search.";
    if(hero.id!=="dwarf"&&!hero.inventory.items.some(item=>item.kind==="tool-kit"))return "Requires the Dwarf or a tool kit.";
    if(trap.kind==="furniture")return within(state,hero,cell(trap))?"":"Enter this room to disarm its furniture trap.";
    if(state.movement.closed)return "Movement has ended.";
    if(!state.movement.rolled||state.movement.remaining<1)return "Roll movement; entering the trap square costs one move.";
    if(!approaching&&(!T.connected(C.cell(hero),cell(trap),state)||!T.canStop(state,cell(trap),hero.id)))return "Move beside the trap first.";
    return "";
  }
  function disarm(state,hero,trap,die) {
    const report=trapReport(state,hero,trap,"disarm"),face=HQ.combatData.faces[die(state)-1],from=C.cell(hero);
    spendAction(state,{continueMoving:true});
    if(trap.kind!=="furniture") {state.movement.remaining--;state.movement.started=true;[hero.x,hero.row]=T.parse(cell(trap));report.jumpFrom=from;report.jumpTo=cell(trap);}
    const success=hero.id==="dwarf"?face!=="black-shield":face!=="skull";
    report.rolls.push({label:"Disarm",description:hero.id==="dwarf"?"Any face except a black shield disarms":"Either shield disarms; a skull springs the trap",faces:[face]});
    if(success){record(state,trap.id).status="disarmed";report.detail="Trap disarmed and removed. Continue moving.";}
    else spring(state,hero,trap,die,from,report);
    return finishReport(report,hero);
  }
  function escapeCells(state,report) {
    const trap=traps(state).find(trap=>trap.id===report?.trapId),hero=state.heroes.find(hero=>hero.id===report?.defenderId);
    if(report?.type!=="trap"||!report.fallingFrom||report.escaped||!hero||hero.body<=0||C.cell(hero)!==cell(trap))return [];
    const [x,row]=T.parse(cell(trap)),[fx,fr]=T.parse(report.fallingFrom);
    return [report.fallingFrom,T.key(x+x-fx,row+row-fr)].filter(id=>T.floor.has(id)&&!T.blockedAt(state,id)&&!T.furniture.has(id)&&!T.occupiedHero(state,id,hero.id)&&!T.monsterAt(state,id)&&
      (()=>{const door=doors(state).find(door=>T.edgeKey(...T.endpoints(door))===T.edgeKey(cell(trap),id));return door?state.openDoors.includes(door.id):T.regions.get(id)===T.regions.get(cell(trap));})());
  }
  function mustEscape(state) {
    const report=state.lastReport,hero=state.heroes.find(hero=>hero.id===report?.defenderId);
    return state.pending?.type==="report"&&report.type==="trap"&&report.fallingFrom&&!report.escaped&&hero?.body>0;
  }
  function projection(state) {
    const report=state.pending?.type==="report"&&state.lastReport?.type==="trap"?state.lastReport:null;
    return traps(state).filter(trap=>["found","sprung"].includes(record(state,trap.id).status)&&!(trap.kind==="spear"&&record(state,trap.id).status==="sprung"&&report?.trapId!==trap.id))
      .map(trap=>({...trap,...record(state,trap.id),name:names[trap.kind],cell:cell(trap)}));
  }
  HQ.dungeon=Object.freeze({fresh,layout,traps,doors,record,cell,names,at,blocked,jumpable,inPit,pitRoom,within,actionReason,searchReason,search,spring,jumpLandings,jump,disarmReason,disarm,escapeCells,mustEscape,projection});
})();

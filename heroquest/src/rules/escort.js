(function () {
  "use strict";
  const HQ=window.HeroQuest,C=HQ.combat;
  const get=state=>state.questState?.escort||null;
  const allies=state=>[...state.heroes,...(get(state)?[get(state)]:[])];
  function fresh(Q){return Q.escort?{alarm:false,escort:{id:Q.escort.id,kind:Q.escort.kind,name:Q.escort.name,x:Q.escort.x,row:Q.escort.row,
    body:Q.escort.body,maxBody:Q.escort.body,defend:Q.escort.defend,mind:0,attack:0,effects:HQ.spells.heroEffects(),found:false,exit:null,controllerId:null}}:{};}
  function find(state,heroId){
    const Q=HQ.quests.forState(state),escort=get(state);
    if(!escort||escort.found||!state.discoveredRooms.includes(Q.escort.cellRoom))return false;
    escort.found=true;escort.controllerId=heroId;state.questState.alarm=true;
    state.discoveredCells=[...Q.floor];state.discoveredRooms=[...Q.rooms];
    state.discoveredEntities=[...new Set([...state.discoveredEntities,...Q.furniture.map(item=>item.id),...state.monsters.filter(C.alive).map(monster=>monster.id)])];
    const doors=HQ.dungeon.doors(state);state.openDoors=doors.map(door=>door.id);state.discoveredDoors=[...state.openDoors];
    state.monsterMemory=Object.fromEntries(state.monsters.filter(C.alive).map(monster=>[monster.id,{id:monster.id,x:monster.x,row:monster.row}]));
    return true;
  }
  function begin(state,hero){
    const escort=get(state);if(!escort?.found||!C.inPlay(escort))return false;
    if(!state.heroes.some(owner=>owner.id===escort.controllerId&&C.inPlay(owner)))escort.controllerId=state.heroes.find(C.inPlay)?.id||null;
    if(escort.controllerId!==hero.id)return false;
    state.pending={type:"escort",heroId:hero.id,die:null,ready:false,remaining:0};return true;
  }
  function routes(state){
    const escort=get(state),pending=state.pending,T=HQ.topology.forQuest(HQ.quests.forState(state));
    if(pending?.type!=="escort"||!pending.ready||pending.remaining<=0)return new Map();
    const preview={...state,pending:null,movement:{...HQ.exploration.freshMovement(),rolled:true,remaining:pending.remaining}};
    return T.routes(preview,escort,{budget:pending.remaining});
  }
  HQ.escort=Object.freeze({get,allies,fresh,find,begin,routes});
})();

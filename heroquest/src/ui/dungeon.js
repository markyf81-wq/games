(function () {
  "use strict";
  const HQ=window.HeroQuest,D=HQ.dungeon,T=HQ.topology,C=HQ.combat;
  HQ.createDungeonActions=function({getState,dispatch,choose,requestRoll,proximityAction}) {
    function searches(){const state=getState(),hero=HQ.exploration.active(state),reason=D.searchReason(state,hero);
      const options=[["Search for traps","SEARCH_TRAPS"],["Search for secret doors","SEARCH_SECRET_DOORS"]].map(([label,type])=>({label,disabled:Boolean(reason),reason,run:()=>dispatch({type})}));
      const treasureReason=HQ.treasure.reason(state,hero);options.unshift({label:"Search for treasure",disabled:Boolean(treasureReason),reason:treasureReason,run:()=>dispatch({type:"SEARCH_TREASURE"})});
      return options;
    }
    function jumpOption(id){
      const state=getState(),hero=HQ.exploration.active(state),landings=D.jumpLandings(state,hero,id);
      return {label:"Jump over",disabled:!landings.length,reason:landings.length?"Costs two moves. Choose a landing square.":"Stand beside the square with two moves and a clear landing.",run:async()=>{
        const selected=await choose({title:"Jump · Choose a landing square",targets:landings.map(id=>({type:"cell",id,label:"Land here"})),reopenOnPick:false});
        if(getState()===state&&selected)requestRoll({type:"JUMP_TRAP",over:id,to:selected.id},"Jump","Any shield clears the square; a skull lands on it");
      }};
    }
    function forTrap(item) {
      const state=getState(),hero=HQ.exploration.active(state),trap=D.traps(state).find(trap=>trap.id===item.id);if(!trap)return [];
      const blocked=D.disarmReason(state,hero,trap,{approaching:trap.kind!=="furniture"});
      const disarm=proximityAction({...trap,type:"trap"},{label:"Disarm trap",blocked,
        ready:()=>!D.disarmReason(getState(),HQ.exploration.active(getState()),trap),
        accept:id=>T.connected(id,D.cell(trap),getState())&&T.canStop(getState(),D.cell(trap),hero.id)&&T.routeCost(C.cell(hero),T.routes(getState(),hero).get(id)||[])<getState().movement.remaining,
        run:()=>requestRoll({type:"DISARM_TRAP",id:trap.id},"Disarm trap",hero.id==="dwarf"?"Any face except a black shield disarms":"Either shield disarms; a skull springs the trap")});
      return [disarm,
        ...(trap.kind==="furniture"?[]:[jumpOption(D.cell(trap))])];
    }
    return Object.freeze({searches,forTrap,jumpOption});
  };
})();

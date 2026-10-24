(function () {
  "use strict";
  const HQ=window.HeroQuest,T=HQ.topology;
  HQ.createMovementActions=function({getState,getProjection,dispatch}){
    let previewPaths=null,cacheState=null,cacheProjection=null;
    function movementReason(id) {
      const state=getState(),projection=getProjection();
      if(state.phase!=="hero-turn"||state.pending)return "Wait for your hero’s turn.";
      if(state.extraAttack)return "Take your second attack or choose Finish attacks first.";
      const rock=T.magic(state,projection.activeHero,"passThroughRock");
      if(!rock&&T.blockedAt(state,id))return "This square is blocked by stone.";
      if(!rock&&projection.furniture.some(f=>f.kind!=="stairs"&&T.furniture.get(id)===f.id))return "Furniture blocks this square.";
      const hero=projection.activeHero;if(id===T.key(hero.x,hero.row))return "Your hero is already here.";
      if(!rock&&projection.heroes.some(h=>h.id!==hero.id&&T.key(h.x,h.row)===id)&&!T.stairs.has(id))return "Another hero occupies this square.";
      if(!rock&&Object.values(state.monsterMemory).some(m=>T.key(m.x,m.row)===id))return "A known monster position blocks this square.";
      if(state.movement.closed)return "Movement ended when you acted after moving.";
      if(projection.reachable.includes(id))return "";
      if(!state.movement.rolled)return "Roll movement first.";
      return "No known route within your remaining movement.";
    }
    function moveOption(id,label="Move here") {
      const reason=movementReason(id),plan=plannedRoute(id);
      if(reason&&plan?.partialTo)return {label:"Move partway here",destination:id,primary:true,
        reason:"Move up to "+plan.spent+" space"+(plan.spent===1?"":"s")+" along this route.",run:()=>dispatch({type:"MOVE",to:plan.partialTo})};
      return {label,destination:id,primary:true,disabled:Boolean(reason),reason,run:()=>dispatch({type:"MOVE",to:id})};
    }
    function approachDestination(item,accept=()=>true,positions=null) {
      const state=getState(),projection=getProjection();
      if(state.phase!=="hero-turn"||state.pending||state.movement.closed||state.extraAttack)return null;
      const hero=projection.activeHero,routes=T.routes(state,hero),reachable=new Set(projection.reachable),from=T.key(hero.x,hero.row);
      const known=new Set(projection.discoveredCells);
      // Deliberate movement can use the printed stair-sharing exception, but
      // automatically positioning for an action must never stack miniatures.
      const destinations=(positions?positions():T.approachCells(item,item.type,state)).filter(id=>reachable.has(id)&&T.canStop(state,id,hero.id)&&!T.occupiedHero(state,id,hero.id)&&routes.get(id).every(cell=>known.has(cell))&&accept(id));
      destinations.sort((a,b)=>T.routeCost(from,routes.get(a))-T.routeCost(from,routes.get(b))||routes.get(a).length-routes.get(b).length);
      return destinations[0]||null;
    }
    function modelMoveOption(item) {
      const state=getState(),projection=getProjection();
      const hero=projection.activeHero;
      if(T.magic(state,hero,"passThroughRock")&&item.type!=="door"&&item.kind!=="stairs") {
        const id=T.key(item.x,item.row),option=moveOption(id);
        if(!option.disabled)option.reason="Pass through this model. Reach a free playable square before your last move or ending your turn.";
        return option;
      }
      if(item.kind==="blocked"||item.type==="hero"&&item.id===hero.id)return moveOption(T.key(item.x,item.row));
      const destination=approachDestination(item);
      if(destination) {
        const option=moveOption(destination);
        option.reason=item.kind==="stairs"?"Move onto the stairway.":item.type==="door"?"Move to a free square beside this door.":"Move to a free square beside this model.";
        return option;
      }
      const reason=state.phase!=="hero-turn"||state.pending?"Wait for your hero’s turn.":state.movement.closed?"Movement ended when you acted after moving.":!state.movement.rolled?"Roll movement first.":state.movement.remaining<=0?"No movement remaining.":"No known route to this model within your remaining movement.";
      return {label:"Move here",primary:true,disabled:true,reason};
    }
    function plannedRoute(id) {
      const state=getState(),projection=getProjection();
      const hero=projection.activeHero;
      if(!previewPaths||cacheState!==state||cacheProjection!==projection){
        previewPaths=T.routes(state,hero,{budget:HQ.board.columns*HQ.board.rows});cacheState=state;cacheProjection=projection;
      }
      return T.routePlan(state,hero,id,previewPaths);
    }
    return Object.freeze({moveOption,approachDestination,modelMoveOption,plannedRoute,
      reset(){previewPaths=null;cacheState=null;cacheProjection=null;}});
  };
})();

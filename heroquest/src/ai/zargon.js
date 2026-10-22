(function () {
  "use strict";
  const HQ=window.HeroQuest,T=HQ.topology,C=HQ.combat;
  function paths(state,monster) {
    const start=C.cell(monster),known=new Set(state.discoveredCells),found=new Map([[start,[]]]),queue=[start];
    for(let i=0;i<queue.length;i++)for(const next of T.neighbors(queue[i])) {
      if(found.has(next)||!known.has(next)||!T.connected(queue[i],next,state)||T.furniture.has(next)||T.occupiedHero(state,next,null))continue;
      // Monsters may pass one another; endpoints must be unoccupied.
      found.set(next,[...found.get(queue[i]),next]);queue.push(next);
    }
    return found;
  }
  function choose(state,monster) {
    const routes=paths(state,monster),options=[];
    for(const [order,hero] of state.heroes.entries())if(C.inPlay(hero))for(const cell of T.spaceCells(C.cell(hero)))for(const id of T.neighbors(cell)) {
      if(!T.connected(id,cell,state)||!routes.has(id))continue;
      const occupant=T.monsterAt(state,id);if(occupant&&occupant.id!==monster.id)continue;
      options.push({hero,order,path:routes.get(id)});
    }
    options.sort((a,b)=>a.path.length-b.path.length||a.order-b.order);
    const best=options[0];if(!best)return {path:[],targetId:null};
    const path=best.path.slice(0,monster.movement);
    // Never finish a partial approach on a friendly monster's square.
    while(path.length&&T.monsterAt(state,path[path.length-1]))path.pop();
    const end=path[path.length-1]||C.cell(monster),position={...monster,x:T.parse(end)[0],row:T.parse(end)[1]};
    const target=state.heroes.filter(C.inPlay).find(hero=>C.adjacent(state,position,hero));
    return {path,targetId:target?.id||null};
  }
  HQ.zargon=Object.freeze({choose});
})();

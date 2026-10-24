(function () {
  "use strict";
  const HQ=window.HeroQuest,cache=new Map();
  function forQuest(Q){
    if(cache.has(Q.id))return cache.get(Q.id);
    const key=(x,row)=>x+","+row;
    const parse=id=>id.split(",").map(Number);
    const floor=new Set(Q.floor),blocked=new Set(Q.blocked),stairs=new Set(Q.stairs);
    const regions=new Map(Q.floor.map(id=>{
      const [x,row]=parse(id),room=HQ.board.rooms.find(r=>x>=r.x&&x<r.x+r.width&&row>=r.row&&row<r.row+r.depth);
      return [id,room?.id||"corridor"];
    }));
    const endpoints=door=>door.axis==="v"?[key(door.x-1,door.row),key(door.x,door.row)]:[key(door.x,door.row-1),key(door.x,door.row)];
    const edgeKey=(a,b)=>[a,b].sort().join("|");
    const doorEdges=new Map(Q.doors.map(d=>[edgeKey(...endpoints(d)),d]));
    const furniture=new Map();
    Q.furniture.filter(f=>f.kind!=="stairs").forEach(f=>{
      for(let row=f.row;row<f.row+f.depth;row++)for(let x=f.x;x<f.x+f.width;x++)furniture.set(key(x,row),f.id);
    });
    function neighbors(id) {const [x,row]=parse(id);return [[x,row-1],[x+1,row],[x,row+1],[x-1,row]].map(p=>key(...p)).filter(k=>floor.has(k));}
    const rockBounds=id=>{const [x,row]=parse(id);return key(x,row)===id&&Number.isInteger(x)&&Number.isInteger(row)&&x>=-24&&row>=-24&&x<HQ.board.columns+24&&row<HQ.board.rows+24;};
    // An older outside-origin save may return to the playfield, but no route
    // starting on playable floor can step out of it. Only floor endpoints survive.
    function rockNeighbors(id){const [x,row]=parse(id);return [[x,row-1],[x+1,row],[x,row+1],[x-1,row]].map(p=>key(...p)).filter(next=>floor.has(id)?floor.has(next):rockBounds(next));}
    const spaceCells=id=>[id];
    const movementCost=(from,to)=>stairs.has(from)&&stairs.has(to)?0:1;
    const insideBoard=id=>{const [x,row]=parse(id);return key(x,row)===id&&Number.isInteger(x)&&Number.isInteger(row)&&x>=0&&row>=0&&x<HQ.board.columns&&row<HQ.board.rows;};
    const blockedAt=(state,id)=>blocked.has(id)||Boolean(HQ.dungeon?.blocked(state).includes(id));
    const solid=(id,state)=>!floor.has(id)||(state?blockedAt(state,id):blocked.has(id));
    const magic=(state,actor,name)=>Boolean(actor.effects?.[name]||state.heroes[state.turnIndex]?.id===actor.id&&state.movement[name]);
    function routeCost(from,path){let cost=0;for(const to of path){cost+=movementCost(from,to);from=to;}return cost;}
    function connected(a,b,state) {
      if(!floor.has(a)||!floor.has(b)||blockedAt(state,a)||blockedAt(state,b))return false;
      const [ax,ar]=parse(a),[bx,br]=parse(b);if(Math.abs(ax-bx)+Math.abs(ar-br)!==1)return false;
      const door=doorEdges.get(edgeKey(a,b))||HQ.dungeon?.layout(state).doors.find(door=>edgeKey(...endpoints(door))===edgeKey(a,b));
      return door?state.openDoors.includes(door.id):regions.get(a)===regions.get(b);
    }
    function approachCells(item,type,state) {
      if(type==="door")return endpoints(item);
      const cells=[];
      for(let row=item.row;row<item.row+(item.depth||1);row++)for(let x=item.x;x<item.x+(item.width||1);x++)cells.push(key(x,row));
      if(item.kind==="stairs")return cells;
      return [...new Set([...cells,...cells.flatMap(id=>neighbors(id).filter(next=>!cells.includes(next)&&connected(id,next,state)))])];
    }
    function occupiedHero(state,id,except) {
      const occupies=h=>Boolean(h&&h.body>0&&!h.exit&&!h.deathResolved&&h.id!==except&&key(h.x,h.row)===id);
      return state.heroes.some(occupies)||occupies(state.questState?.escort);
    }
    function monsterAt(state,id,knownOnly=false,except=null) {return (knownOnly?Object.values(state.monsterMemory):state.monsters.filter(m=>m.body>0)).find(m=>m.id!==except&&key(m.x,m.row)===id);}
    function canStop(state,id,actorId) {return floor.has(id)&&!furniture.has(id)&&!blockedAt(state,id)&&!monsterAt(state,id,true)&&(!occupiedHero(state,id,actorId)||stairs.has(id));}
    const unsafe=(state,actor)=>solid(key(actor.x,actor.row),state)||furniture.has(key(actor.x,actor.row))||Boolean(monsterAt(state,key(actor.x,actor.row)))||(!stairs.has(key(actor.x,actor.row))&&occupiedHero(state,key(actor.x,actor.row),actor.id));
    function rockReturnPath(state,actor,trail=[]) {
      const from=key(actor.x,actor.row);
      const clear=id=>{const [x,row]=parse(id);return !unsafe(state,{...actor,x,row});};
      // Keep the actual route back through any occupied squares, including
      // earlier MOVE commands separated by a reveal or refresh.
      if(trail.at(-1)===from)for(let i=trail.length-2;i>=0;i--)if(clear(trail[i]))return trail.slice(i).reverse().slice(1);
      // Older saves have no recorded trail. Return to the nearest revealed
      // legal square; this fallback never selects or reveals hidden terrain.
      const known=new Set(state.discoveredCells),paths=new Map([[from,[]]]),queue=[from];
      for(let i=0;i<queue.length;i++)for(const next of neighbors(queue[i])) {
        if(paths.has(next))continue;
        const path=[...paths.get(queue[i]),next];paths.set(next,path);
        if(known.has(next)&&clear(next))return path;
        queue.push(next);
      }
      return null;
    }
    const routeStop=(state,id,actor)=>magic(state,actor,"passThroughRock")?floor.has(id):canStop(state,id,actor.id);
    // UI previews may look farther along known terrain; command callers retain
    // the current rolled budget by default and still validate the chosen move.
    function routes(state,actor,{budget=state.movement.rolled?state.movement.remaining:0}={}) {
      const rock=magic(state,actor,"passThroughRock");
      // Unknown squares all have the same cost/passability: previews must never
      // consult their hidden floor, furniture or monster contents. At most 24
      // movement can be rolled; a larger bounded preview still spans the board.
      if(rock)budget=Math.min(budget,HQ.board.columns+HQ.board.rows);
      const start=key(actor.x,actor.row),known=new Set(state.discoveredCells),paths=new Map([[start,[]]]),costs=new Map([[start,0]]),queue=[{id:start,cost:0,steps:0}];
      while(queue.length) {
        queue.sort((a,b)=>a.cost-b.cost||a.steps-b.steps);
        const entry=queue.shift(),here=entry.id,path=paths.get(here);if(entry.cost!==costs.get(here)||entry.steps!==path.length)continue;
        // Even free stair steps require a rolled movement point still available.
        if(entry.cost>=budget||!rock&&here!==start&&HQ.dungeon?.at(state,here)&&HQ.dungeon.record(state,HQ.dungeon.at(state,here).id).status!=="hidden")continue;
        for(const next of rock?rockNeighbors(here):neighbors(here)) {
          const cost=entry.cost+movementCost(here,next),steps=path.length+1;
          if(cost>budget||!rock&&(!known.has(next)||!connected(here,next,state)||furniture.has(next)||(monsterAt(state,next,true)&&!magic(state,actor,"veilOfMist"))||blockedAt(state,next)))continue;
          if(costs.has(next)&&(costs.get(next)<cost||costs.get(next)===cost&&paths.get(next).length<=steps))continue;
          paths.set(next,[...path,next]);costs.set(next,cost);queue.push({id:next,cost,steps});
        }
      }
      return new Map([...paths].filter(([id])=>id!==start&&routeStop(state,id,actor)));
    }
    // Split one known route at its furthest legal stopping square this turn.
    // Intermediate friendly-occupied squares may be traversed, never selected as
    // the partial endpoint. Use weighted costs for discounted internal stair steps.
    function routePlan(state,actor,to,paths=routes(state,actor,{budget:floor.size})) {
      const path=paths.get(to);if(!path)return null;
      const from=key(actor.x,actor.row),canMove=state.phase==="hero-turn"&&!state.pending&&!state.extraAttack&&!state.movement.closed&&actor.body>0&&!actor.exit&&state.heroes[state.turnIndex]?.id===actor.id;
      const budget=state.movement.rolled?state.movement.remaining:0;
      let here=from,cost=0,reachableSteps=0;
      if(canMove)for(let i=0;i<path.length;i++) {
        if(cost>=budget)break;
        cost+=movementCost(here,path[i]);here=path[i];if(cost>budget)break;
        if(routeStop(state,here,actor))reachableSteps=i+1;
      }
      const prefix=path.slice(0,reachableSteps),spent=routeCost(from,prefix);
      return {path,reachableSteps,spent,partialTo:reachableSteps<path.length&&spent>0?prefix[prefix.length-1]:null};
    }
    // Cell-centre supercover trace. A corner may be grazed when either orthogonal
    // route is open, but two sealed walls never disclose a diagonal hidden room.
    function canSee(state,from,to,figures=false) {
      if(from===to)return true;
      const [sx,sy]=parse(from),[tx,ty]=parse(to);let x=sx,y=sy;
      const dx=tx-sx,dy=ty-sy,stepX=Math.sign(dx),stepY=Math.sign(dy);
      const deltaX=dx?1/Math.abs(dx):Infinity,deltaY=dy?1/Math.abs(dy):Infinity;
      let crossX=deltaX*.5,crossY=deltaY*.5;
      const lineEdge=(a,b)=>connected(a,b,state)||(b===to&&blockedAt(state,b)&&floor.has(a)&&!blockedAt(state,a)&&regions.get(a)===regions.get(b));
      const opaque=id=>furniture.has(id)||figures&&(occupiedHero(state,id,null)||monsterAt(state,id));
      while(x!==tx||y!==ty) {
        const current=key(x,y);
        if(Math.abs(crossX-crossY)<1e-9) {
          const nx=key(x+stepX,y),ny=key(x,y+stepY),next=key(x+stepX,y+stepY);
          // These side squares are only touched at the shared corner, not
          // crossed. Figures/furniture there cannot block; sealed wall routes still do.
          const viaX=lineEdge(current,nx)&&lineEdge(nx,next);
          const viaY=lineEdge(current,ny)&&lineEdge(ny,next);
          if(!viaX&&!viaY)return false;
          x+=stepX;y+=stepY;crossX+=deltaX;crossY+=deltaY;
        } else if(crossX<crossY) {
          const next=key(x+stepX,y);if(!lineEdge(current,next))return false;x+=stepX;crossX+=deltaX;
        } else {
          const next=key(x,y+stepY);if(!lineEdge(current,next))return false;y+=stepY;crossY+=deltaY;
        }
        const here=key(x,y);if(here!==to&&opaque(here))return false;
      }
      return true;
    }
    const topology=Object.freeze({key,parse,floor,blocked,stairs,regions,endpoints,edgeKey,doorEdges,furniture,neighbors,spaceCells,movementCost,insideBoard,rockBounds,blockedAt,solid,unsafe,rockReturnPath,magic,routeCost,connected,approachCells,occupiedHero,monsterAt,canStop,routes,routePlan,canSee,forQuest});
    cache.set(Q.id,topology);return topology;
  }
  HQ.topology=forQuest(HQ.quests.current);
})();

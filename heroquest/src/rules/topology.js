(function () {
  "use strict";
  const HQ=window.HeroQuest,Q=HQ.trial;
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
  const spaceCells=id=>stairs.has(id)?[...stairs]:[id];
  const movementCost=(from,to)=>stairs.has(from)&&stairs.has(to)?0:1;
  function routeCost(from,path){let cost=0;for(const to of path){cost+=movementCost(from,to);from=to;}return cost;}
  function connected(a,b,state) {
    if(!floor.has(a)||!floor.has(b)||blocked.has(a)||blocked.has(b))return false;
    const [ax,ar]=parse(a),[bx,br]=parse(b);if(Math.abs(ax-bx)+Math.abs(ar-br)!==1)return false;
    const door=doorEdges.get(edgeKey(a,b));
    return door?state.openDoors.includes(door.id):regions.get(a)===regions.get(b);
  }
  function approachCells(item,type,state) {
    if(type==="door")return endpoints(item);
    if(type==="hero"&&stairs.has(key(item.x,item.row)))return [...stairs];
    const cells=[];
    for(let row=item.row;row<item.row+(item.depth||1);row++)for(let x=item.x;x<item.x+(item.width||1);x++)cells.push(key(x,row));
    if(item.kind==="stairs")return cells;
    return [...new Set([...cells,...cells.flatMap(id=>neighbors(id).filter(next=>!cells.includes(next)&&connected(id,next,state)))])];
  }
  function occupiedHero(state,id,except) {return state.heroes.some(h=>h.body>0&&h.id!==except&&(key(h.x,h.row)===id||stairs.has(id)&&stairs.has(key(h.x,h.row))));}
  function monsterAt(state,id,knownOnly=false,except=null) {return (knownOnly?Object.values(state.monsterMemory):state.monsters.filter(m=>m.body>0)).find(m=>m.id!==except&&key(m.x,m.row)===id);}
  function canStop(state,id,actorId) {return !furniture.has(id)&&!blocked.has(id)&&(!occupiedHero(state,id,actorId)||stairs.has(id));}
  function routes(state,actor) {
    const start=key(actor.x,actor.row),known=new Set(state.discoveredCells),paths=new Map([[start,[]]]),costs=new Map([[start,0]]),queue=[{id:start,cost:0,steps:0}];
    const budget=state.movement.rolled?state.movement.remaining:0;
    while(queue.length) {
      queue.sort((a,b)=>a.cost-b.cost||a.steps-b.steps);
      const entry=queue.shift(),here=entry.id,path=paths.get(here);if(entry.cost!==costs.get(here)||entry.steps!==path.length)continue;
      for(const next of neighbors(here)) {
        const cost=entry.cost+movementCost(here,next),steps=path.length+1;
        if(cost>budget||!known.has(next)||!connected(here,next,state)||furniture.has(next)||monsterAt(state,next,true))continue;
        if(costs.has(next)&&(costs.get(next)<cost||costs.get(next)===cost&&paths.get(next).length<=steps))continue;
        paths.set(next,[...path,next]);costs.set(next,cost);queue.push({id:next,cost,steps});
      }
    }
    return new Map([...paths].filter(([id])=>id!==start&&canStop(state,id,actor.id)));
  }
  // Cell-centre supercover trace. A corner may be grazed when either orthogonal
  // route is open, but two sealed walls never disclose a diagonal hidden room.
  function canSee(state,from,to,figures=false) {
    if(from===to)return true;
    const [sx,sy]=parse(from),[tx,ty]=parse(to);let x=sx,y=sy;
    const dx=tx-sx,dy=ty-sy,stepX=Math.sign(dx),stepY=Math.sign(dy);
    const deltaX=dx?1/Math.abs(dx):Infinity,deltaY=dy?1/Math.abs(dy):Infinity;
    let crossX=deltaX*.5,crossY=deltaY*.5;
    const lineEdge=(a,b)=>connected(a,b,state)||(b===to&&blocked.has(b)&&floor.has(a)&&!blocked.has(a)&&regions.get(a)===regions.get(b));
    const opaque=id=>figures&&(occupiedHero(state,id,null)||monsterAt(state,id));
    while(x!==tx||y!==ty) {
      const current=key(x,y);
      if(Math.abs(crossX-crossY)<1e-9) {
        const nx=key(x+stepX,y),ny=key(x,y+stepY),next=key(x+stepX,y+stepY);
        const viaX=lineEdge(current,nx)&&lineEdge(nx,next)&&!opaque(nx);
        const viaY=lineEdge(current,ny)&&lineEdge(ny,next)&&!opaque(ny);
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
  HQ.topology=Object.freeze({key,parse,floor,blocked,stairs,regions,endpoints,edgeKey,doorEdges,furniture,neighbors,spaceCells,movementCost,routeCost,connected,approachCells,occupiedHero,monsterAt,canStop,routes,canSee});
})();

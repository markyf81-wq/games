(function () {
  "use strict";
  const HQ=window.HeroQuest;
  // Pure presentation layout: stable quest data in, wall fixtures out. Never
  // use gameplay RNG, discovery order, moving actors or the camera as inputs.
  HQ.placeQuestTorches=function(quest,board){
    const key=(x,row)=>x+","+row,edge=(a,b)=>[a,b].sort().join("|"),floor=new Set(quest.floor),blocked=new Set(quest.blocked),furniture=new Set();
    const doors=new Set(quest.doors.map(door=>edge(...(door.axis==="v"
      ? [key(door.x-1,door.row),key(door.x,door.row)]
      : [key(door.x,door.row-1),key(door.x,door.row)]))));
    for(const item of quest.furniture)for(let row=item.row;row<item.row+item.depth;row++)for(let x=item.x;x<item.x+item.width;x++)furniture.add(key(x,row));
    function hash(text){let value=2166136261;for(let i=0;i<text.length;i++)value=Math.imul(value^text.charCodeAt(i),16777619);return value>>>0;}
    const torches=[];
    for(const room of board.rooms.filter(room=>quest.rooms.includes(room.id))){
      const cells=[],candidates=[];
      for(let row=room.row;row<room.row+room.depth;row++)for(let x=room.x;x<room.x+room.width;x++)if(floor.has(key(x,row))&&!blocked.has(key(x,row)))cells.push({x,row});
      const sides=[
        {name:"north",length:room.width,dx:0,dy:-1,rotation:0,cell:i=>[room.x+i,room.row]},
        {name:"east",length:room.depth,dx:1,dy:0,rotation:-Math.PI/2,cell:i=>[room.x+room.width-1,room.row+i]},
        {name:"south",length:room.width,dx:0,dy:1,rotation:Math.PI,cell:i=>[room.x+i,room.row+room.depth-1]},
        {name:"west",length:room.depth,dx:-1,dy:0,rotation:Math.PI/2,cell:i=>[room.x,room.row+i]}
      ];
      for(const side of sides)for(let i=0;i<side.length;i++){
        const [x,row]=side.cell(i),cell=key(x,row),front=key(x-side.dx,row-side.dy);
        if(!floor.has(cell)||blocked.has(cell)||furniture.has(cell)||blocked.has(front)||furniture.has(front))continue;
        if(doors.has(edge(cell,key(x+side.dx,row+side.dy))))continue;
        const id="torch-"+room.id+"-"+side.name+"-"+i;
        candidates.push({id,roomId:room.id,x,row,rotation:side.rotation,
          // Approximate the light's inset from its wall, in board coordinates.
          lightX:x+.5+side.dx*.16,lightRow:row+.5+side.dy*.16,
          tie:hash(quest.id+":"+id)});
      }
      const distance=(a,b)=>(a.lightX-b.lightX)**2+(a.lightRow-b.lightRow)**2;
      function coverage(choices){return cells.reduce((total,cell)=>total+Math.min(...choices.map(choice=>(cell.x+.5-choice.lightX)**2+(cell.row+.5-choice.lightRow)**2)),0);}
      function best(options,selected){
        let winner=null,score=Infinity;
        for(const candidate of options){
          const next=coverage([...selected,candidate]);
          if(next<score||next===score&&(!winner||candidate.tie<winner.tie||candidate.tie===winner.tie&&candidate.id<winner.id)){winner=candidate;score=next;}
        }
        return winner;
      }
      // A completely obstructed perimeter has no safe physical mount. Never
      // satisfy a count by burying a fixture in furniture or placing it in a door.
      const first=best(candidates,[]);if(!first)continue;
      const selected=[first];
      if(room.width*room.depth>=20){
        const gap=Math.min(3,Math.max(room.width,room.depth)/2);
        const second=best(candidates.filter(candidate=>key(candidate.x,candidate.row)!==key(first.x,first.row)&&distance(candidate,first)>=gap*gap),selected);
        if(second)selected.push(second);
      }
      for(const {id,roomId,x,row,rotation} of selected)torches.push(Object.freeze({id,roomId,x,row,rotation,kind:"torch",name:"Wall torch"}));
    }
    return Object.freeze(torches);
  };
})();

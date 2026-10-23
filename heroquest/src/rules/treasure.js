(function () {
  "use strict";
  const HQ=window.HeroQuest,T=HQ.topology,C=HQ.combat,D=HQ.treasureData;
  const fresh=heroes=>({deck:D.instances.map(card=>card.id),removed:[],searched:Object.fromEntries(heroes.map(hero=>[hero.id,[]])),claimed:[],nextMonster:1});
  const room=hero=>T.regions.get(C.cell(hero));
  function reason(state,hero) {
    if(state.phase!=="hero-turn"||state.pending||!C.inPlay(hero)||state.heroes[state.turnIndex]?.id!==hero.id)return "Wait for your hero’s turn.";
    if(state.actionUsed)return "Your action has already been used this turn.";
    if(T.unsafe(state,hero))return "Move into a free square before searching.";
    const id=room(hero);
    if(!HQ.trial.rooms.includes(id))return "Treasure can only be searched for in rooms.";
    if(state.monsters.some(monster=>C.alive(monster)&&T.regions.get(C.cell(monster))===id))return "A monster remains in this room.";
    if(state.treasure.searched[hero.id].includes(id))return "This hero has already searched this room.";
    return "";
  }
  function spawn(state,hero) {
    const from=C.cell(hero),[hx,hr]=T.parse(from),id=room(hero);
    const free=HQ.trial.floor.filter(cell=>T.regions.get(cell)===id&&!T.solid(cell)&&!T.furniture.has(cell)&&!T.occupiedHero(state,cell,null)&&!T.monsterAt(state,cell));
    // CPU policy: a legal adjacent square first; otherwise the nearest free
    // square in this room. Never move or attack when adjacency is impossible.
    const adjacent=free.filter(cell=>T.connected(from,cell,state));
    const distance=cell=>{const [x,row]=T.parse(cell);return Math.abs(x-hx)+Math.abs(row-hr);};
    const cell=(adjacent.length?adjacent:free).sort((a,b)=>distance(a)-distance(b)||a.localeCompare(b))[0];
    if(!cell)return null;
    const kind=HQ.trial.wanderingMonster.kind,[x,row]=T.parse(cell),stats=HQ.combatData.monsters[kind];
    const monster={id:"wanderer-"+state.treasure.nextMonster++,kind,name:HQ.trial.wanderingMonster.name,x,row,...stats,maxBody:stats.body,effects:HQ.spells.monsterEffects(),diedInPlay:false};
    state.monsters.push(monster);state.discoveredEntities.push(monster.id);state.monsterMemory[monster.id]={id:monster.id,x,row};
    return {monster,adjacent:adjacent.includes(cell)};
  }
  function resolve(state,hero,randomInt) {
    const id=room(hero),before=hero.body,search={heroId:hero.id,roomId:id,cardId:null,specialId:null,gold:0,itemId:null,wanderingId:null,immediateAttack:false};
    state.treasure.searched[hero.id].push(id);state.actionUsed=true;state.extraAttack=false;
    if(state.movement.started){state.movement.closed=true;state.movement.remaining=0;}
    let detail="",endTurn=false;
    const special=HQ.trial.treasureRooms[id];
    if(special&&!state.treasure.claimed.includes(id)) {
      state.treasure.claimed.push(id);search.specialId=special.note;search.gold=special.gold||0;detail=special.description;
    } else {
      // The booklet requires shuffling before EVERY draw, including returned
      // hazards/monsters. Physical duplicates retain independent identifiers.
      const deck=state.treasure.deck;
      for(let i=deck.length-1;i>0;i--){const j=randomInt(state,i+1);[deck[i],deck[j]]=[deck[j],deck[i]];}
      search.cardId=deck.shift();const card=D.byId[D.instancesById[search.cardId].kind];
      if(["hazard","monster"].includes(card.category))deck.push(search.cardId);else state.treasure.removed.push(search.cardId);
      if(card.category==="gold"){search.gold=card.gold;detail="Found "+card.gold+" gold.";}
      else if(card.category==="potion") {
        search.itemId=search.cardId;hero.inventory.items.push({id:search.itemId,kind:card.id});detail="Found "+card.name+".";
      } else if(card.category==="hazard") {
        hero.body=Math.max(0,before-1);if(hero.effects.rockSkin)hero.effects.rockSkin=false;
        state.movement.remaining=0;state.movement.closed=state.movement.rolled;endTurn=true;detail="Lost 1 Body. Turn ends.";
      } else {
        const placed=spawn(state,hero);
        if(placed){search.wanderingId=placed.monster.id;search.immediateAttack=placed.adjacent;detail=placed.adjacent?"An Orc appears and attacks immediately!":"An Orc appears in this room. It acts on Zargon’s turn.";}
        else detail="No free square in the room for a wandering monster.";
      }
    }
    hero.inventory.gold+=search.gold;
    return {type:"treasure",id:state.nextCombatId++,attackerId:hero.id,attackerName:hero.name,defenderId:hero.id,defenderName:hero.name,
      bodyBefore:before,bodyAfter:hero.body,maxBody:hero.maxBody,damage:before-hero.body,defeated:hero.body===0,detail,endTurn,search};
  }
  HQ.treasure=Object.freeze({fresh,room,reason,resolve});
})();

(function () {
  "use strict";
  const HQ=window.HeroQuest,T=HQ.topology;
  const alive=figure=>figure.body>0;
  const inPlay=figure=>alive(figure)&&!figure.exit&&!figure.deathResolved;
  const cell=figure=>T.key(figure.x,figure.row);
  const attack=(figure,state,weaponId=figure.weapon)=>Math.max(1,(figure.inventory?HQ.combatData.weapons[weaponId].attack:figure.attack)+(figure.effects?.courage?2:0)+(figure.effects?.strengthPotion?2:0)-(state&&HQ.dungeon.inPit(state,figure)?1:0));
  const defence=(figure,state)=>figure.effects?.sleep?0:Math.max(1,figure.defend+HQ.inventory.defenceBonus(figure)+(figure.effects?.rockSkin?1:0)+(figure.effects?.defensePotion?2:0)-(state&&HQ.dungeon.inPit(state,figure)?1:0));
  function adjacent(state,attacker,defender){return inPlay(attacker)&&inPlay(defender)&&T.spaceCells(cell(attacker)).some(a=>T.spaceCells(cell(defender)).some(b=>T.connected(a,b,state)));}
  const throwables=hero=>hero.inventory?.items.filter(item=>HQ.itemData.byId[item.kind]?.throwable)||[];
  function attackWeapon(hero,{throwItemId}={}){
    return throwItemId===undefined?hero.weapon:throwables(hero).find(item=>item.id===throwItemId)?.kind;
  }
  function canAttack(state,attacker,defender,options={}){
    if(!inPlay(attacker)||!inPlay(defender))return false;
    const weapon=attacker.inventory&&HQ.combatData.weapons[attackWeapon(attacker,options)];
    const thrown=options.throwItemId!==undefined;if(thrown&&!weapon?.throwable)return false;
    if(weapon?.ranged||thrown){
      const distance=Math.abs(attacker.x-defender.x)+Math.abs(attacker.row-defender.row);
      if(distance<(thrown?1:2))return false;
      // An approach preview must move the shooter's occupancy too, otherwise
      // its old square could incorrectly block the proposed firing line.
      const original=state.heroes.find(hero=>hero.id===attacker.id);
      const sightState=original&&(original.x!==attacker.x||original.row!==attacker.row)
        ?{...state,heroes:state.heroes.map(hero=>hero.id===attacker.id?attacker:hero)}:state;
      return T.canSee(sightState,cell(attacker),cell(defender),true);
    }
    if(adjacent(state,attacker,defender))return true;
    if(!weapon?.diagonal)return false;
    return Math.abs(attacker.x-defender.x)===1&&Math.abs(attacker.row-defender.row)===1&&T.canSee(state,cell(attacker),cell(defender));
  }
  function attackPositions(state,hero,defender,options={}){
    if(options.throwItemId!==undefined||HQ.combatData.weapons[hero.weapon].ranged)return state.discoveredCells.filter(id=>{
      const [x,row]=T.parse(id);return canAttack(state,{...hero,x,row},defender,options);
    });
    const positions=[];
    for(let row=defender.row-1;row<=defender.row+1;row++)for(let x=defender.x-1;x<=defender.x+1;x++){
      const id=T.key(x,row);if(T.floor.has(id)&&canAttack(state,{...hero,x,row},defender))positions.push(id);
    }
    return positions;
  }
  function targets(state,hero,options={}) {
    if(state.phase!=="hero-turn"||state.pending||state.actionUsed&&!state.extraAttack||!inPlay(hero)||T.magic(state,hero,"passThroughRock")&&T.unsafe(state,hero))return [];
    return state.monsters.filter(m=>state.discoveredEntities.includes(m.id)&&canAttack(state,hero,m,options));
  }
  function resolve(state,attacker,defender,attackerSide,rollDie,{weaponId=attacker.weapon,throwItemId,attackDice:count=attack(attacker,state,weaponId),consumeCourage=true}={}) {
    const faces=HQ.combatData.faces;
    const attackDice=Array.from({length:count},()=>faces[rollDie(state)-1]);
    if(consumeCourage&&attacker.effects?.courage)attacker.effects.courage=false;
    if(consumeCourage&&attacker.effects?.strengthPotion)attacker.effects.strengthPotion=false;
    const skulls=attackDice.filter(face=>face==="skull").length,shield=attackerSide==="hero"?"black-shield":"white-shield";
    // Defence is rolled only when the attack has at least one skull.
    const defendDice=skulls?Array.from({length:defence(defender,state)},()=>faces[rollDie(state)-1]):[];
    if(skulls&&defender.effects?.defensePotion)defender.effects.defensePotion=false;
    const shields=defendDice.filter(face=>face===shield).length,damage=Math.max(0,skulls-shields),before=defender.body;
    defender.body=Math.max(0,before-damage);
    if(defender.body<before&&defender.effects?.rockSkin)defender.effects.rockSkin=false;
    if(!alive(defender))delete state.monsterMemory[defender.id];
    return {id:state.nextCombatId++,attackerId:attacker.id,defenderId:defender.id,attackerSide,
      ...(consumeCourage&&attacker.inventory?{weaponId,...(throwItemId!==undefined?{thrownItemId:throwItemId}:{})}:{}),
      attackerName:attacker.name,defenderName:defender.name,attackDice,defendDice,skulls,shields,shield,
      damage:before-defender.body,unblockedHits:damage,bodyBefore:before,bodyAfter:defender.body,maxBody:defender.maxBody,defeated:!alive(defender)};
  }
  HQ.combat=Object.freeze({alive,inPlay,cell,attack,defence,adjacent,canAttack,attackPositions,targets,throwables,attackWeapon,resolve});
})();

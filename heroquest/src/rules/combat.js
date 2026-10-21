(function () {
  "use strict";
  const HQ=window.HeroQuest,T=HQ.topology;
  const alive=figure=>figure.body>0;
  const cell=figure=>T.key(figure.x,figure.row);
  function adjacent(state,attacker,defender){return alive(attacker)&&alive(defender)&&T.spaceCells(cell(attacker)).some(a=>T.spaceCells(cell(defender)).some(b=>T.connected(a,b,state)));}
  function targets(state,hero) {
    if(state.phase!=="hero-turn"||state.pending||state.actionUsed||!alive(hero))return [];
    return state.monsters.filter(m=>state.discoveredEntities.includes(m.id)&&adjacent(state,hero,m));
  }
  function resolve(state,attacker,defender,attackerSide,rollDie) {
    const faces=HQ.combatData.faces;
    const attackDice=Array.from({length:attacker.attack},()=>faces[rollDie(state)-1]);
    const skulls=attackDice.filter(face=>face==="skull").length,shield=attackerSide==="hero"?"black-shield":"white-shield";
    // Defence is rolled only when the attack has at least one skull.
    const defendDice=skulls?Array.from({length:defender.defend},()=>faces[rollDie(state)-1]):[];
    const shields=defendDice.filter(face=>face===shield).length,damage=Math.max(0,skulls-shields),before=defender.body;
    defender.body=Math.max(0,before-damage);
    if(!alive(defender))delete state.monsterMemory[defender.id];
    return {id:state.nextCombatId++,attackerId:attacker.id,defenderId:defender.id,attackerSide,
      attackerName:attacker.name,defenderName:defender.name,attackDice,defendDice,skulls,shields,shield,
      damage:before-defender.body,unblockedHits:damage,bodyBefore:before,bodyAfter:defender.body,maxBody:defender.maxBody,defeated:!alive(defender)};
  }
  HQ.combat=Object.freeze({alive,cell,adjacent,targets,resolve});
})();

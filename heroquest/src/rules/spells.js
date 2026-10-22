(function () {
  "use strict";
  const HQ=window.HeroQuest,T=HQ.topology,C=HQ.combat,D=HQ.spellData;
  const isCaster=hero=>["elf","wizard"].includes(hero.id);
  const book=hero=>D.cards.filter(card=>(hero.spellGroups||[]).includes(card.group));
  const healing=card=>["heal-body","water-of-healing"].includes(card.id);
  const heroEffects=()=>({rockSkin:false,courage:false,swiftWind:false,veilOfMist:false,passThroughRock:false});
  const monsterEffects=()=>({tempest:false,sleep:false});
  function canSee(state,caster,target) {
    return caster.id===target.id||T.spaceCells(C.cell(caster)).some(from=>T.spaceCells(C.cell(target)).some(to=>T.canSee(state,from,to,true)));
  }
  const seesMonster=(state,hero)=>state.monsters.some(monster=>C.alive(monster)&&state.discoveredEntities.includes(monster.id)&&canSee(state,hero,monster));
  function maintain(state) {
    for(const hero of state.heroes)if(hero.effects.courage&&(!C.inPlay(hero)||!seesMonster(state,hero)))hero.effects.courage=false;
  }
  function reason(state,caster,card,target=null,mode="attack") {
    if(!card||!isCaster(caster)||!book(caster).some(c=>c.id===card.id))return "This spell is not in this hero’s spellbook.";
    if(!card.implemented)return "This spell is not implemented yet.";
    if(caster.spellsUsed.includes(card.id))return "Already cast this quest.";
    if(state.phase!=="hero-turn"||state.heroes[state.turnIndex].id!==caster.id||state.pending||!C.inPlay(caster))return "Wait for this hero’s turn.";
    if(state.actionUsed)return "Your action has already been used this turn.";
    if(T.magic(state,caster,"passThroughRock")&&T.unsafe(state,caster))return "Move into a free square before acting.";
    if(!target)return "";
    if(card.id==="genie"&&mode==="door")return !state.discoveredDoors.includes(target.id)?"Choose a revealed door.":state.openDoors.includes(target.id)?"Already open.":"";
    const hero=state.heroes.some(h=>h.id===target.id);
    if(!C.inPlay(target)||hero!==(card.target==="hero"))return "Choose a living "+card.target+".";
    if(!hero&&!state.discoveredEntities.includes(target.id))return "Choose a revealed monster.";
    if(!canSee(state,caster,target))return "Outside the caster’s line of sight.";
    if(healing(card)&&target.body===target.maxBody)return "Already at full Body.";
    const effect={"rock-skin":"rockSkin",tempest:"tempest",courage:"courage","swift-wind":"swiftWind","veil-of-mist":"veilOfMist","pass-through-rock":"passThroughRock",sleep:"sleep"}[card.id];
    if(effect&&target.effects[effect])return "This spell is already active.";
    if(card.id==="sleep"&&["mummy","zombie","skeleton"].includes(target.kind))return "Undead are immune to Sleep.";
    if(card.id==="courage"&&!seesMonster(state,target))return "This hero cannot see a monster.";
    return "";
  }
  function groups(config,heroIds) {
    const chosen=config.spellGroups||{elf:["Earth"],wizard:["Air","Fire","Water"]},result={};
    for(const id of heroIds.filter(id=>["elf","wizard"].includes(id))) {
      const list=chosen[id],count=id==="wizard"?3:1;
      if(!Array.isArray(list)||list.length!==count||new Set(list).size!==count||list.some(group=>!D.groups.includes(group)))throw new Error("Choose "+count+" spell group"+(count===1?"":"s")+" for the "+id+".");
      result[id]=[...list];
    }
    if(result.elf&&result.wizard&&result.elf.some(group=>result.wizard.includes(group)))throw new Error("The Elf and Wizard cannot share a spell group.");
    return result;
  }
  function resolve(state,caster,card,target,die,mode="attack") {
    caster.spellsUsed.push(card.id);state.actionUsed=true;
    if(state.movement.started){state.movement.closed=true;state.movement.remaining=0;}
    if(card.id==="genie") {
      if(mode==="door") {
        state.openDoors.push(target.id);
        return {type:"spell-door",id:state.nextCombatId++,attackerId:caster.id,attackerName:caster.name,spellId:card.id,doorId:target.id,detail:"Genie opens the door and reveals what lies beyond."};
      }
      return {type:"combat",...C.resolve(state,caster,target,"hero",die,{attackDice:5,consumeCourage:false}),spellId:card.id};
    }
    const before=target.body,redDice=[];let detail="",rollRole="monster",rollDescription="";
    if(healing(card)){target.body=Math.min(target.maxBody,target.body+4);detail="Restored "+(target.body-before)+" Body.";}
    else if(card.id==="rock-skin"){target.effects.rockSkin=true;detail="One extra defence die until Body damage is suffered.";}
    else if(card.id==="tempest"){target.effects.tempest=true;detail="Misses its next turn.";}
    else if(card.id==="courage"){target.effects.courage=true;detail="Two extra dice on the next attack; ends if no monster remains in sight.";}
    else if(card.id==="veil-of-mist"){target.effects.veilOfMist=true;detail="May pass through monsters on the next move.";}
    else if(card.id==="pass-through-rock"){target.effects.passThroughRock=true;detail="May cross walls on the next move. Ending in solid rock is fatal.";}
    else if(card.id==="swift-wind") {
      if(state.heroes[state.turnIndex].id===target.id&&state.movement.rolled&&!state.movement.started&&!state.movement.closed) {
        redDice.push(die(state),die(state));state.movement.dice.push(...redDice);state.movement.remaining+=redDice.reduce((a,b)=>a+b,0);
        rollRole="hero";rollDescription="Two additional movement dice";detail="Movement increased to "+state.movement.remaining+".";
      } else {target.effects.swiftWind=true;detail="Four red dice on the next movement roll.";}
    } else if(card.id==="sleep") {
      for(let i=0;i<target.mind;i++)redDice.push(die(state));
      target.effects.sleep=!redDice.includes(6);rollDescription="Any 6 breaks Sleep";
      detail=target.effects.sleep?"Asleep · cannot move, attack or defend.":"Sleep resisted.";
    } else {
      const hits=card.id==="ball-of-flame"?2:1;
      for(let i=0;i<hits;i++)redDice.push(die(state));
      target.body=Math.max(0,before-Math.max(0,hits-redDice.filter(d=>d>=5).length));
      if(!C.alive(target))delete state.monsterMemory[target.id];
      rollDescription="Each 5 or 6 prevents one Body damage";detail=before===target.body?"No damage.":"Lost "+(before-target.body)+" Body.";
    }
    return {type:"spell",id:state.nextCombatId++,attackerId:caster.id,attackerName:caster.name,defenderId:target.id,defenderName:target.name,
      spellId:card.id,redDice,rollRole,rollDescription,bodyBefore:before,bodyAfter:target.body,maxBody:target.maxBody,damage:Math.max(0,before-target.body),healed:Math.max(0,target.body-before),defeated:!C.alive(target),detail};
  }
  HQ.spells=Object.freeze({isCaster,book,healing,canSee,seesMonster,maintain,heroEffects,monsterEffects,reason,groups,resolve});
})();

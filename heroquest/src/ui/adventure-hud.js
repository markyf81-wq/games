(function () {
  "use strict";
  const HQ=window.HeroQuest,E=HQ.exploration,$=id=>document.getElementById(id);
  // Read-only HUD rendering; turn/session transitions stay in the controller.
  function render(state,projection) {
    const hero=projection.activeHero,name=E.heroNames.get(hero.id),pending=Boolean(state.pending);
    const heroTurn=state.phase==="hero-turn";
    const ended=HQ.quest.isEnded(state.phase);
    HQ.portraits.set($("active-portrait"),heroTurn?[hero]:[]);
    $("active-portrait").setAttribute("aria-label","Centre camera on "+name);$("active-portrait").title="Centre camera on "+name;
    HQ.questUI.render(state);
    $("active-name").textContent=heroTurn?name:state.phase==="defeat"?"Party defeated":state.phase==="victory"?"Quest completed":state.phase==="retreat"?"Party withdrew":"Zargon";$("active-owner").textContent=heroTurn?hero.owner:ended?"THE PARTY":"COMPUTER";$("round-label").textContent="ROUND "+state.round;
    $("movement-remaining").textContent=ended?"Adventure ended":!heroTurn?"Heroes are waiting":state.movement.closed?"Movement finished":state.movement.rolled?state.movement.remaining+" remaining":"Ready to roll";
    document.querySelector(".dice-row").hidden=!heroTurn||!state.movement.rolled;
    $("roll-movement").disabled=pending||!heroTurn||state.movement.rolled||state.movement.closed||state.extraAttack;$("end-turn").disabled=pending||!heroTurn;
    $("roll-movement").hidden=pending||!heroTurn||state.movement.rolled||state.movement.closed;
    $("open-spellbook").hidden=!heroTurn||!HQ.spells.isCaster(hero);$("open-spellbook").disabled=pending||!heroTurn;
    $("open-inventory").disabled=ended;
    $("open-search").hidden=!heroTurn;$("open-search").disabled=pending||!heroTurn||state.actionUsed;
    $("open-search").title=state.actionUsed?"Your action has already been used this turn.":"Choose a search. Uses your action.";
    $("finish-attacks").hidden=!heroTurn||!state.extraAttack;$("finish-attacks").disabled=pending;
    $("hero-combat-stats").replaceChildren();$("hero-combat-stats").hidden=!heroTurn;
    if(heroTurn){
      const stats=$("hero-combat-stats");stats.append(HQ.health.body(hero.body,hero.maxBody));
      for(const [label,value] of [["Mind",hero.mind],["Attack",HQ.combat.attack(hero,state)+" dice"],["Defend",HQ.combat.defence(hero,state)+" dice"]]){
        const stat=document.createElement("span"),caption=document.createElement("span"),amount=document.createElement("strong");
        stat.className="hero-stat";caption.textContent=label;amount.textContent=value;stat.append(caption,amount);stats.append(stat);
      }
      const weapon=document.createElement("span");weapon.className="weapon-name";weapon.textContent=HQ.combatData.weapons[hero.weapon].name+" · Melee";stats.append(weapon);
      for(const [active,label] of [[hero.effects.courage,"Courage"],[hero.effects.rockSkin,"Rock Skin"],[hero.effects.strengthPotion,"Strength"],[hero.effects.defensePotion,"Defense potion"],[hero.effects.heroicBrew,"Heroic Brew"]])if(active){const effect=document.createElement("span");effect.className="hero-stat-effect";effect.textContent=label;stats.append(effect);}
    }
    $("action-status").textContent=!heroTurn?"":state.extraAttack?"Heroic Brew · one attack remaining":state.actionUsed?"Action used":"Action available";
    $("action-status").hidden=!heroTurn;
    $("discovery-label").textContent=projection.discoveredRooms+" room"+(projection.discoveredRooms===1?"":"s")+" explored";
    // Do not display the hidden map's room/monster counts as a progress target.
    $("event-log").replaceChildren();for(const event of state.log.slice(-9).reverse()){const li=document.createElement("li");li.textContent=event.text;$("event-log").append(li);}
  }
  HQ.adventureHUD=Object.freeze({render});
})();

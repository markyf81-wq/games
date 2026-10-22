(function () {
  "use strict";
  const HQ=window.HeroQuest,E=HQ.exploration,$=id=>document.getElementById(id);
  // Read-only HUD rendering; turn/session transitions stay in the controller.
  function render(state,projection) {
    const hero=projection.activeHero,name=E.heroNames.get(hero.id),pending=Boolean(state.pending);
    const heroTurn=state.phase==="hero-turn";
    const ended=HQ.quest.isEnded(state.phase);
    HQ.portraits.set($("active-portrait"),heroTurn?[hero]:[]);
    HQ.questUI.render(state);
    $("active-name").textContent=heroTurn?name:state.phase==="defeat"?"Party defeated":state.phase==="victory"?"Quest completed":state.phase==="retreat"?"Party withdrew":"Zargon";$("active-owner").textContent=heroTurn?hero.owner:ended?"THE PARTY":"COMPUTER";$("round-label").textContent="ROUND "+state.round;
    HQ.dieFaces.numbered($("die-one"),state.movement.dice[0]);HQ.dieFaces.numbered($("die-two"),state.movement.dice[1]);
    for(let index=2;index<4;index++) {
      const id="movement-die-"+index;let host=$(id);if(!host){host=document.createElement("span");host.id=id;host.className="d6";$("die-two").parentElement.insertBefore(host,document.querySelector(".dice-row>div"));}
      host.hidden=state.movement.dice.length<=index;if(!host.hidden)HQ.dieFaces.numbered(host,state.movement.dice[index]);
    }
    $("movement-remaining").textContent=ended?"Adventure ended":!heroTurn?"Heroes are waiting":state.movement.closed?"Movement finished":state.movement.rolled?state.movement.remaining+" remaining":"Ready to roll";
    $("dice-description").textContent=state.movement.rolled?state.movement.dice.join(" + "):"";
    $("roll-movement").disabled=pending||!heroTurn||state.movement.rolled||state.movement.closed;$("end-turn").disabled=pending||!heroTurn;
    $("open-spellbook").hidden=!heroTurn||!HQ.spells.isCaster(hero);$("open-spellbook").disabled=pending||!heroTurn;
    $("hero-combat-stats").replaceChildren();$("hero-combat-stats").hidden=!heroTurn;
    if(heroTurn){$("hero-combat-stats").append(HQ.health.body(hero.body,hero.maxBody));for(const text of ["Mind "+hero.mind,"Attack "+HQ.combat.attack(hero)+" dice"+(hero.effects.courage?" · Courage":""),"Defend "+HQ.combat.defence(hero)+" dice"+(hero.effects.rockSkin?" · Rock Skin":"")]){const span=document.createElement("span");span.textContent=text;$("hero-combat-stats").append(span);}const weapon=document.createElement("span");weapon.className="weapon-name";weapon.textContent=HQ.combatData.weapons[hero.weapon].name+" · Melee";$("hero-combat-stats").append(weapon);}
    $("action-status").textContent=!heroTurn?"":state.actionUsed?"Action used":"Action available";
    $("setting-realistic-los").checked=state.settings.realisticLOS;
    $("discovery-label").textContent=projection.discoveredRooms+" room"+(projection.discoveredRooms===1?"":"s")+" explored";
    // Do not display the hidden map's room/monster counts as a progress target.
    $("event-log").replaceChildren();for(const event of state.log.slice(-9).reverse()){const li=document.createElement("li");li.textContent=event.text;$("event-log").append(li);}
  }
  HQ.adventureHUD=Object.freeze({render});
})();

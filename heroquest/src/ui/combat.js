(function () {
  "use strict";
  const HQ=window.HeroQuest,$=id=>document.getElementById(id);
  // Compact board feedback; detailed rolls and arithmetic remain in the journal.
  function render(state) {
    const content=$("feedback-content");content.replaceChildren();
    const report=state.lastReport;
    $("feedback-kicker").textContent="ROUND "+state.round+" · "+(state.phase==="monster-turn"?"ZARGON":"YOUR ACTION");
    const spell=HQ.spellData.byId[report.spellId];
    $("feedback-heading").textContent=report.type==="treasure"?report.attackerName+" searches":report.type==="combat"?report.attackerName+" → "+report.defenderName:spell?spell.name:report.attackerName;
    const figures=[...state.heroes,...state.monsters],participants=document.createElement("div");participants.className="roll-participants";
    HQ.portraits.set(participants,figures.filter(figure=>[report.attackerId,report.defenderId].includes(figure.id)));
    content.append(participants);
    const result=document.createElement("strong");result.className="feedback-result";
    result.textContent=report.type==="combat"?(report.damage?"−"+report.damage+" Body":"No damage"):report.healed?"+"+report.healed+" Body":report.damage?"−"+report.damage+" Body":report.detail||report.reason||(report.steps?"Moved "+report.steps+" squares":"No hero within reach");
    content.append(result);
    if(Number.isFinite(report.maxBody)){const health=document.createElement("div");health.append(HQ.health.body(report.recovery?.bodyAfter??report.bodyAfter,report.maxBody));content.append(health);}
    if(report.recovery){const text=document.createElement("p");text.textContent=report.defenderName+" saved by a healing potion · +"+report.recovery.healed+" Body";content.append(text);}
    else if(report.defeated){const text=document.createElement("p");text.textContent=HQ.inventory.recoveryHero(state)?report.defenderName+" · drink a potion to escape death":report.defenderName+" defeated";content.append(text);}
  }
  function renderItem(state,use) {
    $("feedback-kicker").textContent="POTION";$("feedback-heading").textContent=HQ.itemData.byId[use.itemKind].name;
    const content=$("feedback-content"),portrait=document.createElement("div"),result=document.createElement("strong"),health=document.createElement("div");content.replaceChildren();
    portrait.className="roll-participants";HQ.portraits.set(portrait,state.heroes.filter(hero=>hero.id===use.heroId));
    result.className="feedback-result";result.textContent=use.redDice.length?"+"+use.healed+" Body":use.detail;health.append(HQ.health.body(use.bodyAfter,use.maxBody));content.append(portrait,result,health);
  }
  HQ.combatUI=Object.freeze({render,renderItem});
})();

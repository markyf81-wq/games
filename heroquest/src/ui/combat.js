(function () {
  "use strict";
  const HQ=window.HeroQuest,$=id=>document.getElementById(id);
  function dicePanel(label,rolls,note,figure) {
    const panel=document.createElement("section"),heading=document.createElement("h3"),dice=document.createElement("div"),text=document.createElement("p");panel.className="combat-roll";heading.textContent=label;dice.className="combat-dice";
    if(rolls.length)rolls.forEach(kind=>dice.append(HQ.dieFaces.combat(kind)));else {const empty=document.createElement("span");empty.textContent="No defence needed";empty.className="combat-no-roll";dice.append(empty);}
    const header=document.createElement("div");header.className="combat-figure";if(figure)header.append(HQ.portraits.image(figure.kind,figure.name));header.append(heading);
    text.textContent=note;panel.append(header,dice,text);return panel;
  }
  function render(state) {
    const content=$("combat-content");content.replaceChildren();const intro=state.pending?.type==="monster-intro",report=state.lastReport;
    $("combat-kicker").textContent="ROUND "+state.round+" · "+(intro||state.phase==="monster-turn"?"ZARGON’S TURN":"COMBAT");
    if(intro) {
      $("combat-heading").textContent="Zargon’s turn";
      $("continue-combat").textContent="Continue →";return;
    }
    $("combat-heading").textContent=report.type==="combat"?report.attackerName+" attacks "+report.defenderName:report.attackerName+"’s turn";
    const figures=[...state.heroes,...state.monsters],attacker=figures.find(f=>f.id===report.attackerId),defender=figures.find(f=>f.id===report.defenderId);
    if(report.type==="combat") {
      const rolls=document.createElement("div");rolls.className="combat-rolls";
      rolls.append(dicePanel("Attack · "+report.attackerName,report.attackDice,report.skulls+" skull"+(report.skulls===1?"":"s"),attacker),dicePanel("Defence · "+report.defenderName,report.defendDice,report.skulls?report.shields+" "+(report.shield==="white-shield"?"white":"black")+" shield"+(report.shields===1?"":"s")+" blocked":"Miss",defender));content.append(rolls);
      const summary=document.createElement("div");summary.className="combat-outcome";
      const amount=document.createElement("strong"),text=document.createElement("p");amount.textContent=report.damage?"−"+report.damage+" Body":"No damage";text.textContent=report.defeated?report.defenderName+" defeated":report.defenderName+" · Body "+report.bodyAfter+" / "+report.maxBody;summary.append(amount,text);content.append(summary);
    } else {const figure=document.createElement("div");HQ.portraits.set(figure,attacker?[attacker]:[]);const p=document.createElement("p");p.className="dialog-lead";p.textContent=report.steps?"Moved "+report.steps+" squares · No attack":"No hero within reach";content.append(figure,p);}
    $("continue-combat").textContent=state.phase==="defeat"?"View outcome →":state.phase==="monster-turn"?(state.monsterTurn.index<state.monsterTurn.queue.length?"Next monster →":"Heroes’ turn →"):"Continue →";
  }
  HQ.combatUI=Object.freeze({render});
})();

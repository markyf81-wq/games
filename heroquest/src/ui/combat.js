(function () {
  "use strict";
  const HQ=window.HeroQuest,$=id=>document.getElementById(id),ns="http://www.w3.org/2000/svg";
  const names={skull:"Skull","white-shield":"White shield","black-shield":"Black shield"};
  function face(kind) {
    const die=document.createElement("span");die.className="combat-die "+kind;die.setAttribute("role","img");die.setAttribute("aria-label",names[kind]);
    const svg=document.createElementNS(ns,"svg");svg.setAttribute("viewBox","0 0 40 40");svg.setAttribute("aria-hidden","true");
    const shape=document.createElementNS(ns,"path");
    shape.setAttribute("d",kind==="skull"?"M9 18C9 3 31 3 31 18v7l-6 3v6H15v-6l-6-3z":"M8 7h24v13c0 8-12 14-12 14S8 28 8 20z");
    shape.setAttribute("fill",kind==="white-shield"?"none":"currentColor");shape.setAttribute("stroke","currentColor");shape.setAttribute("stroke-width","2");svg.append(shape);
    if(kind==="skull")for(const [cx,cy,r] of [[15,18,3],[25,18,3],[20,24,2]]){const eye=document.createElementNS(ns,"circle");eye.setAttribute("cx",cx);eye.setAttribute("cy",cy);eye.setAttribute("r",r);eye.setAttribute("fill","#e9dec6");svg.append(eye);}
    else {const mark=document.createElementNS(ns,"path");mark.setAttribute("d",kind==="white-shield"?"M20 11v16M14 17h12":"M16 13l8 12M24 13l-8 12");mark.setAttribute("stroke",kind==="white-shield"?"currentColor":"#e9dec6");mark.setAttribute("stroke-width","2");svg.append(mark);}
    die.append(svg);return die;
  }
  function dicePanel(label,rolls,note) {
    const panel=document.createElement("section"),heading=document.createElement("h3"),dice=document.createElement("div"),text=document.createElement("p");panel.className="combat-roll";heading.textContent=label;dice.className="combat-dice";
    if(rolls.length)rolls.forEach(kind=>dice.append(face(kind)));else {const empty=document.createElement("span");empty.textContent="No defence needed";empty.className="combat-no-roll";dice.append(empty);}
    text.textContent=note;panel.append(heading,dice,text);return panel;
  }
  function render(state) {
    const content=$("combat-content");content.replaceChildren();const intro=state.pending?.type==="monster-intro",report=state.lastReport;
    $("combat-kicker").textContent="ROUND "+state.round+" · "+(intro||state.phase==="monster-turn"?"ZARGON’S TURN":"COMBAT");
    if(intro) {
      $("combat-heading").textContent="The monsters stir";
      const p=document.createElement("p");p.className="dialog-lead";p.textContent="Zargon will move and attack with each revealed monster. Review each result, then continue to the next miniature.";content.append(p);$("continue-combat").textContent="Let Zargon act →";return;
    }
    $("combat-heading").textContent=report.type==="combat"?report.attackerName+" attacks "+report.defenderName:report.attackerName+"’s turn";
    if(report.type==="combat") {
      const rolls=document.createElement("div");rolls.className="combat-rolls";
      rolls.append(dicePanel("Attack · "+report.attackerName,report.attackDice,report.skulls+" skull"+(report.skulls===1?"":"s")+" rolled"),dicePanel("Defence · "+report.defenderName,report.defendDice,report.skulls?report.shields+" "+(report.shield==="white-shield"?"white":"black")+" shield"+(report.shields===1?"":"s")+" block damage":"No skulls: the attack misses"));content.append(rolls);
      const summary=document.createElement("div");summary.className="combat-outcome";
      const amount=document.createElement("strong"),text=document.createElement("p");amount.textContent=report.damage?"−"+report.damage+" Body":"No damage";text.textContent=report.defeated?report.defenderName+" is defeated and removed from the board.":report.defenderName+" has "+report.bodyAfter+" / "+report.maxBody+" Body Points remaining.";summary.append(amount,text);content.append(summary);
    } else {const p=document.createElement("p");p.className="dialog-lead";p.textContent=report.steps?report.attackerName+" moves "+report.steps+" squares but cannot reach a hero to attack.":report.attackerName+" waits. No hero is reachable this turn.";content.append(p);}
    $("continue-combat").textContent=state.phase==="defeat"?"View outcome →":state.phase==="monster-turn"?(state.monsterTurn.index<state.monsterTurn.queue.length?"Next monster →":"Return to the heroes →"):"Back to the table →";
  }
  HQ.combatUI=Object.freeze({render});
})();

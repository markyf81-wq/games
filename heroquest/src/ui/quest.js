(function () {
  "use strict";
  const HQ = window.HeroQuest, $ = id => document.getElementById(id);

  function objective(state) {
    if(HQ.sandbox.active)return "Practice spells, movement and combat. Use Sandbox tools to reset or place units.";
    const Q=HQ.quests.forState(state),escort=HQ.escort.get(state);
    if(escort?.found)return escort.body===0?"Sir Ragnar has fallen. Return the surviving heroes to safety.":escort.exit?"Sir Ragnar is safe · Return to the stairway.":"Escort Sir Ragnar alive to the stairway · "+escort.body+" / "+escort.maxBody+" Body.";
    return HQ.quest.objectiveComplete(state)?"Verag defeated · Return to the stairway.":Q.objective.description;
  }
  function render(state){
    const Q=HQ.quests.forState(state);$("quest-objective").textContent=objective(state);
    $("open-quest-info").textContent=Q.title+" · Quest info";
    $("quest-number").textContent="QUEST "+Q.number;
  }

  function showOutcome(state) {
    const Q=HQ.quests.forState(state),completed = state.phase === "victory", retreated = state.phase === "retreat";
    $("quest-outcome-kicker").textContent = completed ? "RETURNED TO SAFETY" : "QUEST "+Q.number+" ENDS";
    $("quest-outcome-heading").textContent = completed ? Q.title+" completed" : retreated ? "The party withdrew" : "The party has fallen";
    $("quest-outcome-description").textContent = completed
      ? (Q.escort?"Sir Ragnar has been rescued. The "+Q.reward+" gold reward is shared among the heroes who completed the quest.":"Verag is defeated. The completing heroes have returned safely.")+" Survivors recover their health and spells; gold and equipment carry forward."
      : retreated ? "The quest ended without a hero completing its objective and returning safely. Retry with this party’s remaining possessions."
      : "No hero survived to return from the dungeon.";
    const list = $("quest-outcome-heroes");
    list.replaceChildren();
    for (const hero of state.heroes) {
      const row = document.createElement("li");
      const recovery=state.questRecovery?.find(record=>record.heroId===hero.id);
      HQ.portraits.set(row, [{...hero, role: recovery?(recovery.carrierId?"Revived · "+recovery.items+" items and "+recovery.gold+" gold returned":"Revived · possessions lost"):hero.exit === "completed" ? "Completed the quest"
        : hero.exit === "retreated" ? "Retreated safely" : "Fallen · replacement starts with original gear"}]);
      list.append(row);
    }
    const shop=$("open-armoury");shop.disabled=!HQ.armoury.visitors(state).length;
    shop.title=shop.disabled?"No surviving or revived hero can visit the Armoury.":"Buy, sell and equip gear between quests.";
    const next=HQ.quests.next(state),travel=$("continue-campaign");
    travel.hidden=HQ.sandbox.active;travel.disabled=Boolean(HQ.campaign.reason(state,completed?"next":"retry"));
    travel.textContent=completed?(next?"Continue · Quest "+next.number:"Quest 3 is not available yet"):"Retry with this party";
    travel.title=completed&&next?next.title:"";
    HQ.dialogs.show("quest-outcome-dialog");
  }

  function showInfo(state) {
    $("quest-info-heading").textContent=HQ.quests.forState(state).title;
    $("quest-info-briefing").textContent=HQ.quests.forState(state).briefing;
    $("quest-info-objective").textContent=(HQ.sandbox.active?"Gameplay sandbox · ":"")+objective(state);
    HQ.dialogs.show("quest-info-dialog");
  }

  async function confirmExit(state) {
    const completed = HQ.quest.objectiveComplete(state);
    return HQ.dialogs.ask({title: completed ? "Return to safety?" : "Leave this quest early?",
      kicker: "THE STAIRWAY", confirmLabel: completed ? "Complete quest" : "Retreat",
      description: completed ? "This hero will leave the dungeon and complete the quest. Other heroes can continue. Any sealed bags carried by this hero will be returned to their owners when the quest ends."
        : "This hero will retreat without completing the quest. Other heroes can continue. Any sealed bags they carry will not count as recovered."});
  }

  HQ.questUI = Object.freeze({render, showInfo, showOutcome, confirmExit});
})();

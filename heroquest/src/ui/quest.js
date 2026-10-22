(function () {
  "use strict";
  const HQ = window.HeroQuest, $ = id => document.getElementById(id);

  function render(state) {
    if(HQ.sandbox.active){$("quest-objective").textContent="Practice spells, movement and combat. Use Sandbox tools to reset or place units.";return;}
    $("quest-objective").textContent = HQ.quest.objectiveComplete(state)
      ? "Verag defeated · Return to the stairway."
      : HQ.trial.objective.description;
  }

  function showOutcome(state) {
    const completed = state.phase === "victory", retreated = state.phase === "retreat";
    $("quest-outcome-kicker").textContent = completed ? "RETURNED TO SAFETY" : "THE TRIAL ENDS";
    $("quest-outcome-heading").textContent = completed ? "The Trial completed" : retreated ? "The party withdrew" : "The party has fallen";
    $("quest-outcome-description").textContent = completed
      ? "Verag is defeated. The heroes who completed the quest have returned safely to the stairway."
      : retreated ? "The Trial ended without a hero completing its objective and returning safely."
      : "No hero survived to return from the dungeon.";
    const list = $("quest-outcome-heroes");
    list.replaceChildren();
    for (const hero of state.heroes) {
      const row = document.createElement("li");
      HQ.portraits.set(row, [{...hero, role: hero.exit === "completed" ? "Completed the quest"
        : hero.exit === "retreated" ? "Retreated safely" : "Fallen"}]);
      list.append(row);
    }
    HQ.dialogs.show("quest-outcome-dialog");
  }

  async function confirmExit(state) {
    const completed = HQ.quest.objectiveComplete(state);
    return HQ.dialogs.ask({title: completed ? "Return to safety?" : "Leave The Trial early?",
      kicker: "THE STAIRWAY", confirmLabel: completed ? "Complete quest" : "Retreat",
      description: completed ? "This hero will leave the dungeon and complete The Trial. Other heroes can continue."
        : "This hero will retreat without completing The Trial. Other heroes can continue."});
  }

  HQ.questUI = Object.freeze({render, showOutcome, confirmExit});
})();

(function () {
  "use strict";
  const HQ = window.HeroQuest;
  const endedPhases = new Set(["victory", "retreat", "defeat"]);

  function objectiveComplete(state) {
    return state.monsters.some(monster =>
      monster.id === HQ.trial.objective.targetId && monster.body === 0);
  }

  function outcome(state) {
    if (state.heroes.some(HQ.combat.inPlay)) return null;
    if (objectiveComplete(state) && state.heroes.some(hero => hero.exit === "completed")) return "victory";
    if (state.heroes.some(hero => hero.exit)) return "retreat";
    return "defeat";
  }

  function exitReason(state, hero) {
    if (state.phase !== "hero-turn" || state.pending || !HQ.combat.inPlay(hero)) return "Wait for your hero’s turn.";
    if (!HQ.topology.stairs.has(HQ.combat.cell(hero))) return "Move onto the stairway first.";
    return "";
  }

  HQ.quest = Object.freeze({objectiveComplete, outcome, exitReason,
    isEnded: phase => endedPhases.has(phase)});
})();

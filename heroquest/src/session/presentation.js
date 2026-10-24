(function () {
  "use strict";
  const HQ=window.HeroQuest;
  const actors=state=>[...state.heroes,...state.monsters];
  const pendingReport=state=>state?.pending?.type==="report"?state.lastReport:null;
  const casualtyTypes=new Set(["combat","spell","stone-move","treasure","trap"]);
  function defeatedReport(state) {
    const report=pendingReport(state);
    return report&&casualtyTypes.has(report.type)&&report.defeated&&!report.recovery?report:null;
  }
  function defeatedFigure(state) {
    const report=defeatedReport(state);
    return report?actors(state).find(actor=>actor.id===report.defenderId)||null:null;
  }
  function healthChanges(before,after) {
    const previous=new Map(actors(before).map(actor=>[actor.id,actor.body]));
    return actors(after).filter(actor=>previous.has(actor.id)&&actor.body!==previous.get(actor.id)&&!HQ.recovery.revived(after,actor))
      .map(actor=>({id:actor.id,delta:actor.body-previous.get(actor.id)}));
  }
  function nextHeroTurn(before,after) {
    return after.phase==="hero-turn"&&(before.phase!==after.phase||before.turnIndex!==after.turnIndex||before.round!==after.round);
  }
  function statuses(state,hero,dice) {
    const move=state.movement,active=state.phase==="hero-turn"&&move.rolled&&!move.closed&&move.remaining>0;
    const report=pendingReport(state);
    return {
      statusMovement:{heroId:hero.id,passThroughRock:active&&move.passThroughRock,veilOfMist:active&&move.veilOfMist,
        swiftWind:active&&move.swiftWind,heroicBrew:state.phase==="hero-turn"&&state.extraAttack},
      pendingSleep:dice&&report?.spellId==="sleep"?{id:report.defenderId,value:report.type==="sleep-check"}:null,
      pendingStatus:dice&&dice.stage!=="item"&&report?{reportId:report.id,id:report.defenderId}:null
    };
  }
  // Read-only display snapshot: saved outcomes must not spoil pending rolls.
  function unrevealed(state,dice) {
    if(!state)return null;
    if(dice?.stage==="item") {
      const use=state.lastItemUse,index=state.log.findLastIndex(event=>event.text.startsWith(use.heroName+" drinks "));
      return {...state,heroes:state.heroes.map(hero=>hero.id===use.heroId?{...hero,body:use.bodyBefore}:hero),log:index<0?state.log:state.log.slice(0,index)};
    }
    const report=pendingReport(state);if(!dice||!report)return state;
    const card=HQ.spellData.byId[report.spellId];
    const prefix=report.type==="sleep-check"?report.attackerName+":":card?report.attackerName+" casts "+card.name:
      report.type==="combat"?report.attackerName+" attacks "+report.defenderName+":":report.attackerName+":";
    const index=state.log.findLastIndex(event=>event.text.startsWith(prefix));
    const restore=figures=>figures.map(figure=>figure.id===report.defenderId&&Number.isFinite(report.bodyBefore)?{...figure,body:report.bodyBefore,
      ...(report.type==="trap"&&report.jumpFrom?{x:HQ.topology.parse(report.jumpFrom)[0],row:HQ.topology.parse(report.jumpFrom)[1]}:{})}:figure);
    const phase=HQ.quest.isEnded(state.phase)?report.attackerSide==="monster"?"monster-turn":"hero-turn":state.phase;
    // Springing a hidden trap reveals its location before its damage roll,
    // while the spent trap/blocked square still waits for the result.
    const trapStatus=report.statusBefore==="hidden"?"found":report.statusBefore;
    const dungeon=report.type==="trap"&&report.trapId?{...state.dungeon,traps:{...state.dungeon.traps,[report.trapId]:{...state.dungeon.traps[report.trapId],status:trapStatus}}}:state.dungeon;
    return {...state,phase,dungeon,heroes:restore(state.heroes),monsters:restore(state.monsters),log:index<0?state.log:state.log.slice(0,index)};
  }
  HQ.sessionPresentation=Object.freeze({actors,pendingReport,defeatedReport,defeatedFigure,healthChanges,nextHeroTurn,statuses,unrevealed});
})();

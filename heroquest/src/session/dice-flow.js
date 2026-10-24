(function () {
  "use strict";
  const HQ=window.HeroQuest,P=HQ.sessionPresentation;
  // These descriptors expose recorded dice only. They never roll or mutate
  // authoritative game state; the controller still owns saving and timing.
  function afterCommand(state,command,previousReportId,progress){
    if(command.type==="ACK_REPORT")progress=null;
    const report=P.pendingReport(state),fresh=report&&report.id!==previousReportId;
    if(fresh&&report.type==="combat")progress={reportId:report.id,stage:"attack",rolled:command.type==="ATTACK"};
    if(fresh&&report.redDice?.length)progress={reportId:report.id,stage:"spell",rolled:false};
    if(fresh&&report.type==="trap"&&report.rolls.length)
      progress={reportId:report.id,stage:"trap",part:0,rolled:["JUMP_TRAP","DISARM_TRAP"].includes(command.type)};
    if(command.type==="USE_ITEM")progress=state.lastItemUse.redDice.length?{reportId:state.lastItemUse.id,stage:"item",rolled:true}:null;
    return progress;
  }
  function next(state,progress){
    if(progress.stage==="trap"&&progress.part+1<state.lastReport.rolls.length)return {...progress,part:progress.part+1,rolled:false};
    if(progress.stage==="attack"&&state.lastReport.defendDice.length)return {...progress,stage:"defence",rolled:false};
    return null;
  }
  function prompt(state,projection,request){
    const hero=projection.activeHero;
    if(request.type==="trap")return {id:"trap-ready-"+(request.command.id||request.command.over),kind:"combat",count:1,title:request.title,kicker:hero.owner+" · "+hero.name,automatic:false,rolled:false,cancellable:true,figures:[hero],description:request.description};
    const target=state.monsters.find(figure=>figure.id===request.targetId);
    return {id:"attack-ready-"+target.id,kind:"combat",count:HQ.combat.attack(hero,state,HQ.combat.attackWeapon(hero,request)),title:(request.throwItemId?"Throw Dagger · ":"Attack · ")+hero.name,kicker:hero.owner,automatic:false,rolled:false,cancellable:true,
      figures:[{...hero,role:"Attack"},{...target,role:"Defence"}],description:(request.throwItemId?"Dagger is lost, even on a miss · Skulls hit":"Skulls hit")+(state.movement.started?" · Ends movement":"")};
  }
  function tray(state,projection,diceProgress,animate) {
    if(diceProgress?.stage==="item") {
      const use=state.lastItemUse,hero=state.heroes.find(hero=>hero.id===use.heroId);
      return {id:"item-"+use.id,kind:"movement",resultFormat:"faces",count:1,title:"Potion of Healing",kicker:hero.owner+" · "+hero.name,
        figures:[hero],description:"Restore Body equal to one red die",automatic:false,rolled:true,results:use.redDice,animate};
    }
    if(!diceProgress) {
      return {id:"movement-"+state.round+"-"+state.turnIndex,kind:"movement",count:state.movement.dice.length,title:"Movement",kicker:projection.activeHero.owner+" · "+projection.activeHero.name,figures:[{...projection.activeHero,role:"Movement"}],description:state.movement.dice.length+" red dice",automatic:false,rolled:true,results:state.movement.dice,animate};
    }
    if(diceProgress.stage==="trap") {
      const report=state.lastReport,group=report.rolls[diceProgress.part],hero=state.heroes.find(hero=>hero.id===report.defenderId);
      return {id:"trap-"+report.id+"-"+diceProgress.part,kind:"combat",count:group.faces.length,title:group.label,kicker:hero.owner+" · "+hero.name,
        figures:[hero],description:group.description,automatic:false,rolled:diceProgress.rolled,results:group.faces,animate};
    }
    if(diceProgress.stage==="spell") {
      const report=state.lastReport,actors=P.actors(state);
      const automatic=report.rollRole!=="hero";
      return {id:"spell-"+report.id,kind:"movement",resultFormat:"faces",count:report.redDice.length,title:report.defenderName+" · "+HQ.spellData.byId[report.spellId].name,kicker:automatic?"ZARGON’S ROLL":"HERO’S ROLL",automatic,rolled:diceProgress.rolled,results:report.redDice,animate,
        figures:actors.filter(actor=>[report.attackerId,report.defenderId].includes(actor.id)),description:report.rollDescription};
    }
    const report=state.lastReport,attack=diceProgress.stage==="attack",actor=attack?report.attackerName:report.defenderName;
    const automatic=attack?report.attackerSide==="monster":report.attackerSide==="hero",results=attack?report.attackDice:report.defendDice;
    const actors=P.actors(state),figures=[[report.attackerId,"Attack"],[report.defenderId,"Defence"]].map(([id,role])=>{const figure=actors.find(f=>f.id===id);return figure?{...figure,role}:null;}).filter(Boolean);
    return {id:"combat-"+report.id+"-"+diceProgress.stage,kind:"combat",count:results.length,title:actor+" · "+(attack?"Attack":"Defence"),kicker:automatic?"ZARGON’S ROLL":"HERO’S ROLL",automatic,rolled:diceProgress.rolled,results,animate,
      figures,description:results.length+" dice · "+(attack?"Skulls hit":(report.shield==="white-shield"?"White":"Black")+" shields block "+report.skulls+" hit"+(report.skulls===1?"":"s"))};
  }
  function escort(state,animate){
    const pending=state.pending,hero=state.heroes[state.turnIndex];
    return {id:"escort-"+state.round+"-"+state.turnIndex,kind:"movement",count:1,title:"Sir Ragnar · Movement",kicker:hero.owner,
      figures:[HQ.escort.get(state)],description:"One red die · Cannot attack",automatic:false,rolled:pending.die!==null,
      results:pending.die===null?[]:[pending.die],animate};
  }
  HQ.diceFlow=Object.freeze({afterCommand,next,prompt,tray,escort});
})();

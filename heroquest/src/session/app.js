(function () {
  "use strict";
  const HQ=window.HeroQuest,E=HQ.exploration,T=HQ.topology,Q=HQ.trial,D=HQ.dialogs,S=HQ.sessionStorage,P=HQ.sessionPresentation;
  const $=id=>document.getElementById(id);let state=null,projection=null,view=null,moving=false,screen=null,saveError="",diceProgress=null,dicePrompt=null,animateDice=false;
  let selectedRoute=null,previewPaths=null,restartMode="new",boardChoice=null,sandboxUI=null,feedbackKey=null,animateTreasure=false,treasureLock=null,importing=false,treasureHealth=null,trapTravel=null;
  function clearFeedback(){feedbackKey=null;$("action-feedback").hidden=true;}
  function showFeedback() {
    const key="report-"+state.lastReport.id+(state.lastReport.recovery?"-recovered":"");
    if(feedbackKey===key)return;
    feedbackKey=key;HQ.combatUI.render(state);$("action-feedback").hidden=false;
    const hero=HQ.inventory.recoveryHero(state);$("dismiss-feedback").hidden=Boolean(hero);
    if(hero) {
      const actions=document.createElement("div"),drink=document.createElement("button"),fall=document.createElement("button");actions.className="recovery-actions";
      drink.type=fall.type="button";drink.className="hq-button hq-button--primary";fall.className="hq-button";
      drink.textContent="Drink healing potion & roll";fall.textContent="Let hero fall";
      drink.addEventListener("click",()=>requestItem(hero.id,HQ.inventory.potions(hero).find(item=>item.kind==="potion-of-healing").id));
      fall.addEventListener("click",()=>dispatch({type:"ACK_REPORT",acceptDefeat:true}));actions.append(drink,fall);$("feedback-content").append(actions);
    }
  }
  const pacing=HQ.createTurnPacing({blocked:()=>moving||treasureDrawer.busy||$("inventory-dialog").open||Boolean(document.querySelector('dialog[open]:not([data-nonmodal])'))});
  const title=kind=>HQ.pieces[kind]?.name||kind;
  const message=(text,error=false)=>{$("adventure-message").textContent=text;$("adventure-message").classList.toggle("is-error",error);};
  const context=HQ.createContextPanel({onClose(){selectedRoute=null;view?.setSelection(null);}});
  const diceTray=HQ.createDiceTray({onRoll:rollDice,onSettled:id=>{
    if(screen==="movement"||diceProgress)pacing.schedule("dice-"+id,()=>{if(diceTray.activeId===id)continueDice();},screen==="movement"?250:1000);
  },onCancel(){
    const attack=dicePrompt?.type==="attack";dicePrompt=null;
    if(attack)playPresentation(()=>view?.finishAttack(),()=>{render();persist();});
    else render();
  }});
  const spellbook=HQ.createSpellbook({getState:()=>state,onCast:command=>dispatch(command),onChooseTarget:options=>boardChoice?.choose(options)||Promise.resolve(null)});
  const dungeonActions=HQ.createDungeonActions({getState:()=>state,dispatch,proximityAction,choose:options=>boardChoice.choose(options),requestRoll(command,title,description){
    if(moving||dicePrompt||diceProgress||state.pending)return;
    clearFeedback();dicePrompt={type:"trap",command,title,description};render();
  }});
  const searchDialog=HQ.createSearchDialog({options:()=>dungeonActions.searches()});
  const inventory=HQ.createInventory({getState:unrevealedRollState,getUseReason:(heroId,itemId)=>moving||screen||dicePrompt||diceProgress?"Finish the current roll first.":HQ.inventory.reason(state,state.heroes.find(hero=>hero.id===heroId),itemId),onUse:requestItem,onGive:requestGive});
  const treasureDrawer=HQ.createTreasureDrawer({onContinue:reportId=>{
    treasureLock?.();treasureLock=null;
    if(state?.pending?.type==="report"&&state.lastReport.id===reportId)render();
  }});
  function resetTreasure(){treasureDrawer.reset();treasureLock?.();treasureLock=null;animateTreasure=false;treasureHealth=null;}
  function saveStatus() {
    $("session-footer").textContent=saveError;
    $("session-footer").hidden=!saveError;
    $("session-footer").classList.toggle("is-error",Boolean(saveError));
  }
  function persist() {
    if(!state||importing)return;
    saveError=S.save({state,screen,dice:diceProgress,view:view?.snapshot()||null});saveStatus();
  }
  function updateBoard({preserveCamera=false}={}) {
    projection=E.project(diceProgress?.stage==="trap"?P.unrevealed(state,diceProgress):state);Object.assign(projection,P.statuses(state,projection.activeHero,diceProgress));
    const report=P.pendingReport(state),cutawayHero=report?.type==="combat"&&report.attackerSide==="monster"
      ?state.heroes.find(hero=>hero.id===report.defenderId):projection.activeHero;
    view?.setProjection(projection,{defeatedFigure:P.defeatedFigure(state),cutawayHero,preserveCamera});
  }
  function playPresentation(play,complete) {
    moving=true;context.close();view?.setInteractive(false);
    const unlock=HQ.turnControls.lock();
    $("board-canvas").setAttribute("aria-busy","true");
    // Presentation failure must not strand a resolved command or lock input.
    Promise.resolve().then(play).catch(()=>{view?.finishPresentation();}).then(()=>{
      moving=false;unlock();$("board-canvas").setAttribute("aria-busy","false");
      try{complete();}catch(error){message("The board could not update. "+error.message,true);}
    });
  }
  function dispatch(command,afterComplete=null,{continueActionView=false}={}) {
    if(importing||moving||boardChoice?.active||treasureDrawer.busy)return false;
    const oldCells=new Set(state.discoveredCells),oldRooms=new Set(state.discoveredRooms);
    const actingHeroId=projection.activeHero.id;
    const openingSecret=command.type==="OPEN_DOOR"&&projection.doors.some(door=>door.id===command.id&&door.secret);
    const previousReport=state.lastReport,removal=command.type==="ACK_REPORT"?P.defeatedReport(state):null,result=E.applyCommand(state,command);
    if(!result.ok){message(result.message,true);return false;}
    const healthChanges=P.healthChanges(state,result.state),nextHeroTurn=P.nextHeroTurn(state,result.state);
    if(nextHeroTurn||!["ACK_REPORT","ACK_HANDOFF"].includes(command.type)){clearFeedback();treasureDrawer.close();}
    pacing.clear();spellbook.close();inventory.close();context.close();
    state=result.state;screen=command.type==="ROLL_MOVEMENT"?"movement":null;dicePrompt=null;
    animateTreasure=command.type==="SEARCH_TREASURE"&&state.lastReport?.type==="treasure";
    if(animateTreasure)treasureHealth=healthChanges.length?{reportId:state.lastReport.id,changes:healthChanges}:null;
    if(command.type==="ACK_REPORT"&&command.acceptDefeat){HQ.combatUI.render(state);$("dismiss-feedback").hidden=false;}
    const revealedRooms=state.discoveredRooms.filter(id=>!oldRooms.has(id));
    const revealCells=["MOVE","OPEN_DOOR","CAST_SPELL","JUMP_TRAP","DISARM_TRAP","ESCAPE_FALLING_BLOCK"].includes(command.type)?state.discoveredCells.filter(id=>revealedRooms.length?revealedRooms.includes(T.regions.get(id)):!oldCells.has(id)):[];
    if(command.type==="ACK_REPORT")diceProgress=null;
    const newCombat=state.pending?.type==="report"&&state.lastReport.type==="combat"&&state.lastReport.id!==previousReport?.id;
    if(newCombat)
      diceProgress={reportId:state.lastReport.id,stage:"attack",rolled:command.type==="ATTACK"};
    if(state.pending?.type==="report"&&state.lastReport.id!==previousReport?.id&&state.lastReport.redDice?.length)
      diceProgress={reportId:state.lastReport.id,stage:"spell",rolled:false};
    if(state.pending?.type==="report"&&state.lastReport.id!==previousReport?.id&&state.lastReport.type==="trap"&&state.lastReport.rolls.length)
      diceProgress={reportId:state.lastReport.id,stage:"trap",part:0,rolled:["JUMP_TRAP","DISARM_TRAP"].includes(command.type)};
    if(command.type==="USE_ITEM") {
      diceProgress=state.lastItemUse.redDice.length?{reportId:state.lastItemUse.id,stage:"item",rolled:true}:null;
      if(!diceProgress)animateDice=false;
    }
    if(["JUMP_TRAP","DISARM_TRAP"].includes(command.type))trapTravel=state.lastReport.id;
    // Persist resolved outcomes before any animation or result dialog. Refreshing
    // during presentation must never replay a move, activation, damage or roll.
    persist();
    const complete=()=>{
      render({preserveCamera:openingSecret||revealCells.length>0});if(revealCells.length&&!openingSecret)view?.reveal(revealCells);persist();
      if(command.type==="USE_ITEM"&&!state.lastItemUse.redDice.length) {
        feedbackKey="item-"+state.lastItemUse.id;HQ.combatUI.renderItem(state,state.lastItemUse);$("dismiss-feedback").hidden=false;$("action-feedback").hidden=false;
      }
      // render schedules the recorded next stage after removal completes.
      if(afterComplete)afterComplete({revealed:revealCells.length>0});
    };
    const cpuAttack=newCombat&&state.lastReport.attackerSide==="monster";
    const spellCast=command.type==="CAST_SPELL"?state.lastReport:null;
    // Keep the close camera across visible CPU activations. Return once for
    // hero planning, the next hero round, or a terminal quest outcome.
    const returnToBoard=command.type==="ACK_REPORT"&&view?.actionCameraActive&&state.phase!=="monster-turn";
    const actorAction=!openingSecret&&view?.snapshot().cinematicCameraEnabled&&["OPEN_DOOR","EXIT_QUEST"].includes(command.type);
    const immediateHealth=!diceProgress&&!animateTreasure?healthChanges:[];
    if(view&&(result.motion?.path.length||cpuAttack||removal||returnToBoard||spellCast||actorAction||immediateHealth.length)) {
      if(result.motion?.path.length)message(P.actors(state).find(actor=>actor.id===result.motion.actorId).name+" is moving…");
      else if(removal)message(removal.defenderName+" is defeated.");
      else if(spellCast)message(spellCast.attackerName+" casts "+HQ.spellData.byId[spellCast.spellId].name+".");
      playPresentation(async()=>{
        if(returnToBoard)await view.finishAttack();
        // Keep the old discoveries until the movement reaches its endpoint.
        if(result.motion?.path.length)await view.animateMovement(result.motion,{holdView:command.type==="RESOLVE_MONSTER"||continueActionView&&revealCells.length===0});
        if(cpuAttack){updateBoard({preserveCamera:true});await view.animateAttack(state.lastReport.attackerId,state.lastReport.defenderId);}
        if(spellCast)await view.animateSpell(spellCast);
        if(actorAction)await view.animateAction(actingHeroId,command.type==="OPEN_DOOR"?command.id:null,command.type==="OPEN_DOOR"?()=>updateBoard({preserveCamera:true}):null);
        if(immediateHealth.length)await view.animateHealthChanges(immediateHealth,spellCast);
        if(removal)await view.animateDefeat(removal.defenderId,removal.attackerId,E.project(state).fallen);
      },complete);
      return true;
    }
    try{complete();}catch(error){message("The board could not update. "+error.message,true);return false;}
    return true;
  }
  function movementReason(id) {
    if(state.phase!=="hero-turn"||state.pending)return "Wait for your hero’s turn.";
    if(state.extraAttack)return "Take your second attack or choose Finish attacks first.";
    const rock=T.magic(state,projection.activeHero,"passThroughRock");
    if(!rock&&T.blockedAt(state,id))return "This square is blocked by stone.";
    if(!rock&&projection.furniture.some(f=>f.kind!=="stairs"&&T.furniture.get(id)===f.id))return "Furniture blocks this square.";
    const hero=projection.activeHero;if(id===T.key(hero.x,hero.row))return "Your hero is already here.";
    if(!rock&&projection.heroes.some(h=>h.id!==hero.id&&T.key(h.x,h.row)===id)&&!T.stairs.has(id))return "Another hero occupies this square.";
    if(!rock&&Object.values(state.monsterMemory).some(m=>T.key(m.x,m.row)===id))return "A known monster position blocks this square.";
    if(state.movement.closed)return "Movement ended when you acted after moving.";
    if(projection.reachable.includes(id))return "";
    if(!state.movement.rolled)return "Roll movement in the sidebar first.";
    if(!projection.reachable.includes(id))return "No known route within your remaining movement.";
    return "";
  }
  function moveOption(id,label="Move here") {
    const reason=movementReason(id),plan=plannedRoute(id);
    if(reason&&plan?.partialTo)return {label:"Move partway here",destination:id,primary:true,
      reason:"Move up to "+plan.spent+" space"+(plan.spent===1?"":"s")+" along this route.",run:()=>dispatch({type:"MOVE",to:plan.partialTo})};
    return {label,destination:id,primary:true,disabled:Boolean(reason),reason,run:()=>dispatch({type:"MOVE",to:id})};
  }
  function approachDestination(item,accept=()=>true) {
    if(state.phase!=="hero-turn"||state.pending||state.movement.closed||state.extraAttack)return null;
    const hero=projection.activeHero,routes=T.routes(state,hero),reachable=new Set(projection.reachable),from=T.key(hero.x,hero.row);
    const known=new Set(projection.discoveredCells);
    const destinations=T.approachCells(item,item.type,state).filter(id=>reachable.has(id)&&T.canStop(state,id,hero.id)&&routes.get(id).every(cell=>known.has(cell))&&accept(id));
    const occupiedAnchor=id=>T.stairs.has(id)&&projection.heroes.some(h=>h.id!==hero.id&&T.key(h.x,h.row)===id)?1:0;
    destinations.sort((a,b)=>T.routeCost(from,routes.get(a))-T.routeCost(from,routes.get(b))||occupiedAnchor(a)-occupiedAnchor(b)||routes.get(a).length-routes.get(b).length);
    return destinations[0]||null;
  }
  function proximityAction(item,{label,ready,blocked="",reason="",accept,run}) {
    const destination=!blocked&&!ready()?approachDestination(item,accept):null;
    const available=!blocked&&(ready()||destination);
    const hint=blocked||(destination?"Move into reach, then "+label.toLowerCase()+".":available?reason:
      state.movement.closed?"Movement has ended.":!state.movement.rolled?"Roll movement first.":"No free square within reach of this action and your remaining movement.");
    return {label,primary:true,disabled:!available,destination,
      reason:hint,
      run:()=>{
        if(ready()){run();return;}
        const to=approachDestination(item,accept);if(!to)return;
        const heroId=projection.activeHero.id;
        dispatch({type:"MOVE",to},({revealed})=>{
          // A reveal can stop MOVE early. Recheck the authoritative position and
          // action eligibility after animation rather than carrying a queued action.
          const release=text=>{
            if(view?.actionCameraActive)playPresentation(()=>view.finishAttack(),()=>{render({preserveCamera:true});persist();if(text)message(text);});
            else if(text)message(text);
          };
          if(state.phase!=="hero-turn"||state.pending||projection.activeHero.id!==heroId){release();return;}
          if(revealed){release("Movement stopped as new ground came into view. Choose the action again when ready.");return;}
          if(T.key(projection.activeHero.x,projection.activeHero.row)===to&&ready()){if(run()===false)release();}
          else release("Movement stopped. Choose the action again when ready.");
        },{continueActionView:!(item.type==="door"&&item.secret)});
      }};
  }
  function modelMoveOption(item) {
    const hero=projection.activeHero;
    if(T.magic(state,hero,"passThroughRock")&&item.type!=="door"&&item.kind!=="stairs") {
      const id=T.key(item.x,item.row),option=moveOption(id);
      if(!option.disabled)option.reason="Pass through this model. Reach a free playable square before your last move or ending your turn.";
      return option;
    }
    if(item.kind==="blocked"||item.type==="hero"&&item.id===hero.id)return moveOption(T.key(item.x,item.row));
    const destination=approachDestination(item);
    if(destination) {
      const option=moveOption(destination);
      option.reason=item.kind==="stairs"?"Move onto the stairway.":item.type==="door"?"Move to a free square beside this door.":"Move to a free square beside this model.";
      return option;
    }
    const reason=state.phase!=="hero-turn"||state.pending?"Wait for your hero’s turn.":state.movement.closed?"Movement ended when you acted after moving.":!state.movement.rolled?"Roll movement in the sidebar first.":state.movement.remaining<=0?"No movement remaining.":"No known route to this model within your remaining movement.";
    return {label:"Move here",primary:true,disabled:true,reason};
  }
  function requestAttack(item) {
    if(moving||!projection.attackTargets.some(target=>target.id===item.id))return;
    clearFeedback();
    const hero=projection.activeHero;
    const show=()=>{
      dicePrompt={type:"attack",targetId:item.id};render();persist();
    };
    message(hero.name+" attacks "+item.name+".");
    playPresentation(()=>view?.animateAttack(hero.id,item.id),show);
  }
  function requestMovementRoll() {
    if(moving||state?.pending||state?.phase!=="hero-turn"||screen||dicePrompt)return;
    animateDice=true;dispatch({type:"ROLL_MOVEMENT"});
  }
  function requestItem(heroId,itemId) {
    if(moving||screen||dicePrompt||diceProgress||boardChoice?.active)return false;
    animateDice=true;
    const accepted=dispatch({type:"USE_ITEM",heroId,itemId});if(!accepted)animateDice=false;return accepted;
  }
  function rollDice() {
    inventory.close();
    if(dicePrompt){animateDice=true;return dispatch(dicePrompt.type==="trap"?dicePrompt.command:{type:"ATTACK",targetId:dicePrompt.targetId});}
    if(!diceProgress||diceProgress.rolled)return false;
    // Combat outcomes already belong to the saved engine report. Roll reveals
    // and animates that stage; it never resolves another attack or defence.
    diceProgress.rolled=true;animateDice=true;persist();render();return true;
  }
  function presentDice() {
    const animate=animateDice;animateDice=false;
    if(diceProgress?.stage==="item") {
      const use=state.lastItemUse,hero=state.heroes.find(hero=>hero.id===use.heroId);
      diceTray.show({id:"item-"+use.id,kind:"movement",resultFormat:"faces",count:1,title:"Potion of Healing",kicker:hero.owner+" · "+hero.name,
        figures:[hero],description:"Restore Body equal to one red die",automatic:false,rolled:true,results:use.redDice,animate});return;
    }
    if(!diceProgress) {
      diceTray.show({id:"movement-"+state.round+"-"+state.turnIndex,kind:"movement",count:state.movement.dice.length,title:"Movement",kicker:projection.activeHero.owner+" · "+projection.activeHero.name,figures:[{...projection.activeHero,role:"Movement"}],description:state.movement.dice.length+" red dice",automatic:false,rolled:true,results:state.movement.dice,animate});return;
    }
    if(diceProgress.stage==="trap") {
      const report=state.lastReport,group=report.rolls[diceProgress.part],hero=state.heroes.find(hero=>hero.id===report.defenderId);
      diceTray.show({id:"trap-"+report.id+"-"+diceProgress.part,kind:"combat",count:group.faces.length,title:group.label,kicker:hero.owner+" · "+hero.name,
        figures:[hero],description:group.description,automatic:false,rolled:diceProgress.rolled,results:group.faces,animate});return;
    }
    if(diceProgress.stage==="spell") {
      const report=state.lastReport,actors=P.actors(state);
      const automatic=report.rollRole!=="hero";
      diceTray.show({id:"spell-"+report.id,kind:"movement",resultFormat:"faces",count:report.redDice.length,title:report.defenderName+" · "+HQ.spellData.byId[report.spellId].name,kicker:automatic?"ZARGON’S ROLL":"HERO’S ROLL",automatic,rolled:diceProgress.rolled,results:report.redDice,animate,
        figures:actors.filter(actor=>[report.attackerId,report.defenderId].includes(actor.id)),description:report.rollDescription});return;
    }
    const report=state.lastReport,attack=diceProgress.stage==="attack",actor=attack?report.attackerName:report.defenderName;
    const automatic=attack?report.attackerSide==="monster":report.attackerSide==="hero",results=attack?report.attackDice:report.defendDice;
    const actors=P.actors(state),figures=[[report.attackerId,"Attack"],[report.defenderId,"Defence"]].map(([id,role])=>{const figure=actors.find(f=>f.id===id);return figure?{...figure,role}:null;}).filter(Boolean);
    diceTray.show({id:"combat-"+report.id+"-"+diceProgress.stage,kind:"combat",count:results.length,title:actor+" · "+(attack?"Attack":"Defence"),kicker:automatic?"ZARGON’S ROLL":"HERO’S ROLL",automatic,rolled:diceProgress.rolled,results,animate,
      figures,description:results.length+" dice · "+(attack?"Skulls hit":(report.shield==="white-shield"?"White":"Black")+" shields block "+report.skulls+" hit"+(report.skulls===1?"":"s"))});
  }
  function continueDice() {
    pacing.clear();
    if(screen==="movement"){screen=null;persist();render();$("board-canvas").focus({preventScroll:true});return;}
    if(!diceProgress)return;
    if(diceProgress.stage==="item") {
      const use=state.lastItemUse,expected=state;diceTray.close();diceProgress=null;persist();
      const complete=()=>{
        if(state!==expected)return;render();
        const recovered=state.pending?.type==="report"&&state.lastReport.recovery?.itemUseId===use.id;
        if(!recovered){if(!state.pending)feedbackKey="item-"+use.id;HQ.combatUI.renderItem(state,use);$("dismiss-feedback").hidden=false;$("action-feedback").hidden=false;}
      };
      if(view&&use.bodyAfter!==use.bodyBefore)playPresentation(()=>view.animateHealthChanges([{id:use.heroId,delta:use.bodyAfter-use.bodyBefore}]),complete);
      else complete();
      return;
    }
    if(diceProgress.stage==="trap"&&diceProgress.part+1<state.lastReport.rolls.length){diceProgress.part++;diceProgress.rolled=false;persist();render();return;}
    if(diceProgress.stage==="attack"&&state.lastReport.defendDice.length){diceProgress.stage="defence";diceProgress.rolled=false;persist();render();return;}
    const report=state.lastReport,expected=state;
    diceTray.close();diceProgress=null;persist();
    if(view&&report.type==="trap") {
      clearFeedback();playPresentation(async()=>{
        if(trapTravel===report.id&&report.jumpFrom)await view.animateMovement({actorId:report.defenderId,from:report.jumpFrom,path:[report.jumpTo],jump:report.operation==="jump"});
        trapTravel=null;updateBoard({preserveCamera:true});
        await view.animateTrapHazard(report);
      },()=>{if(state===expected){render();persist();}});return;
    }
    if(view&&["combat","spell"].includes(report.type)&&report.bodyAfter!==report.bodyBefore) {
      clearFeedback();
      playPresentation(()=>view.animateHit(report),()=>{if(state===expected){render();persist();}});
    } else render();
  }
  async function requestGive(heroId,itemId) {
    if(!state||moving||screen||dicePrompt||diceProgress||boardChoice?.active)return;
    const expected=state,owner=state.heroes.find(hero=>hero.id===heroId),reason=HQ.inventory.giveReason(state,owner,itemId);
    if(reason){message(reason,true);return;}
    const item=owner.inventory.items.find(item=>item.id===itemId),targets=HQ.inventory.giveTargets(state,owner,itemId);
    const selected=await boardChoice.choose({dialogId:"inventory-dialog",reopenOnPick:false,
      title:"Give "+HQ.itemData.byId[item.kind].name+" · Choose a hero",
      targets:targets.map(hero=>({type:"piece",id:hero.id,label:hero.owner+" · "+hero.name}))});
    if(!selected)return;
    if(state===expected)dispatch({type:"GIVE_ITEM",heroId,itemId,targetId:selected.id});
    inventory.show(heroId);
  }
  function openCell(id) {
    if(boardChoice?.pick({type:"cell",id}))return;
    if(!state||state.pending||moving||screen||dicePrompt||diceProgress||!projection.discoveredCells.includes(id)&&!(projection.blindMovement&&T.floor.has(id)))return;
    spellbook.close();inventory.close();treasureDrawer.close();
    const point=view.setSelection({type:"cell",id});
    const known=projection.discoveredCells.includes(id),rock=T.magic(state,projection.activeHero,"passThroughRock");
    const stair=T.stairs.has(id),actions=[moveOption(id)];
    const trap=projection.traps.find(trap=>trap.cell===id);if(trap)actions.push(...dungeonActions.forTrap(trap));else if(known)actions.push(dungeonActions.jumpOption(id));
    if(stair)actions.push({label:"Leave dungeon",disabled:Boolean(HQ.quest.exitReason(state,projection.activeHero)),reason:HQ.quest.exitReason(state,projection.activeHero)||"",run:async()=>{if(await HQ.questUI.confirmExit(state))dispatch({type:"EXIT_QUEST"});}});
    context.show({name:known?"Tile":"Unexplored space",kind:rock?"PASS THROUGH ROCK":stair?"STAIRWAY":"DUNGEON SQUARE",description:rock?"Pass through any object. Reach a free playable square before your last move or ending your turn.":stair?"Movement within the stairs is free while you have movement remaining.":T.blockedAt(state,id)?HQ.pieces.blocked.description:"A square of explored dungeon floor.",actions},point);
    previewRoute(id,true);
  }
  function previewRoute(id,select=false) {
    if(boardChoice?.active)return;
    if(select)selectedRoute=id;
    if(!id||!state||moving||state.phase!=="hero-turn"||state.pending||!projection.discoveredCells.includes(id)&&!(projection.blindMovement&&T.floor.has(id))){view?.setRoutePreview(null);return;}
    const hero=projection.activeHero,plan=plannedRoute(id);
    view?.setRoutePreview(plan?{cells:[T.key(hero.x,hero.row),...plan.path],reachableSteps:plan.reachableSteps}:null);
  }
  function plannedRoute(id) {
    const hero=projection.activeHero;
    if(!previewPaths)previewPaths=T.routes(state,hero,{budget:HQ.board.columns*HQ.board.rows});
    return T.routePlan(state,hero,id,previewPaths);
  }
  function openPiece(item) {
    if(boardChoice?.pick({type:"piece",id:item.id}))return;
    if(!state||state.pending||moving||screen||dicePrompt||diceProgress||item.type==="wall")return;
    spellbook.close();inventory.close();treasureDrawer.close();
    const point=view.setSelection({type:"piece",id:item.id}),actions=[];let details="";
    if(item.type==="monster") {
      details="Attack "+HQ.combat.attack(item,state)+" · Defend "+HQ.combat.defence(item,state)+" · Move "+item.movement+(item.effects.sleep?" · Asleep":"");
      actions.push(proximityAction(item,{label:"Attack",ready:()=>projection.attackTargets.some(m=>m.id===item.id),
        blocked:state.actionUsed&&!state.extraAttack?"Your action has already been used this turn.":"",
        accept:id=>{const [x,row]=T.parse(id);return HQ.combat.adjacent(state,{...projection.activeHero,x,row},item);},run:()=>requestAttack(item)}));
    } else if(item.type==="door") {
      actions.push(proximityAction(item,{label:"Open door",ready:()=>projection.adjacentDoors.some(d=>d.id===item.id),
        blocked:item.open?"This door is already open and stays open.":"",reason:"Opening a door is free.",run:()=>dispatch({type:"OPEN_DOOR",id:item.id})}));
    } else if(item.type==="trap") {
      actions.push(...dungeonActions.forTrap(item));
    } else if(item.type==="hero") {
      details=item.owner+" · Attack "+HQ.combat.attack(item,state)+" · Defend "+HQ.combat.defence(item,state)+(item.effects.rockSkin?" · Rock Skin":"")+(item.effects.courage?" · Courage":"");
      actions.push({label:"Inventory",run:()=>{context.close();spellbook.close();inventory.show(item.id);}});
    }
    if(item.type==="monster"&&item.effects.tempest)details+=" · Tempest";
    if(["hero","monster","door"].includes(item.type)&&HQ.spells.isCaster(projection.activeHero))actions.push({label:"Cast spell",disabled:!projection.spellTargets.includes(item.id),
      reason:state.actionUsed?"Your action has already been used this turn.":projection.spellTargets.includes(item.id)?"Choose a spell for this miniature.":"No available spell can target this miniature.",run:()=>{context.close();inventory.close();spellbook.show(item.id);}});
    if(item.kind==="stairs")actions.push(proximityAction(item,{label:"Leave dungeon",ready:()=>!HQ.quest.exitReason(state,projection.activeHero),
      run:async()=>{if(await HQ.questUI.confirmExit(state))dispatch({type:"EXIT_QUEST"});}}));
    if(item.type==="furniture") {
      const trap=projection.traps.find(trap=>trap.furnitureId===item.id);if(trap){
        if(trap.status==="found")details="Trapped · Disarm before searching for treasure.";
        actions.push(...dungeonActions.forTrap(trap));
      }
    }
    actions.push(item.type==="trap"?moveOption(T.key(item.x,item.row),"Move onto trap"):modelMoveOption(item));
    actions.push({label:"Centre view",run:()=>view.focusPiece(item.id)});
    context.show({name:item.type==="door"?(item.secret?"Secret door":item.open?"Open door":"Closed door"):item.name||title(item.kind),kind:item.type==="hero"?"HERO":item.type==="monster"?"MONSTER":"DUNGEON SCENERY",
      figure:item.type==="hero"||item.type==="monster"?item:null,description:item.type==="trap"?(item.status==="sprung"?"A sprung trap remains here.":"A discovered trap. Move onto it to trigger it, jump over it, or disarm it on a later turn."):item.secret?"A concealed stone panel. Open it from an adjacent square; opening is free.":item.type==="door"?"A stone-framed doorway connects two areas of the dungeon.":HQ.pieces[item.kind]?.description||"A revealed piece of dungeon scenery.",details,actions},point);
    const destination=actions.find(action=>!action.disabled&&action.destination)?.destination;
    if(destination)previewRoute(destination,true);else selectedRoute=null;
  }
  try {view=HQ.createTabletop({onCell:openCell,onPiece:openPiece,onDismiss:()=>boardChoice?.active?boardChoice.cancel():context.close(),onAnchor:point=>context.position(point),onHover:ref=>boardChoice?.active?boardChoice.hover(ref):previewRoute(ref?.type==="cell"?ref.id:selectedRoute)});boardChoice=HQ.createBoardChoice({view});}
  catch(error) {
    const p=document.createElement("p");p.className="hq-callout";p.setAttribute("role","alert");p.textContent="The 3D board could not start. A browser with WebGL 2 is required. "+error.message;$("setup-form").prepend(p);$("start-adventure").disabled=true;
    $("loading-message").textContent="The 3D board could not start.";
  }
  const partyUI=HQ.createPartySetup({onFocus:id=>view?.focusHero(id)});
  $("active-portrait").addEventListener("click",()=>{
    if(!state||moving||boardChoice?.active||view?.actionCameraActive||state.phase!=="hero-turn")return;
    view?.focusHero(projection.activeHero.id);persist();
  });
  function replaceSandbox(next) {
    if(moving||boardChoice?.active||!HQ.sandbox.active)return;
    clearFeedback();pacing.clear();resetTreasure();pacing.setPaused(false);document.querySelectorAll("dialog[open]").forEach(dialog=>dialog.close());diceTray.close();view?.resetCombatCamera();
    state=next;screen=null;diceProgress=null;dicePrompt=null;animateDice=false;partyUI.restore(state.heroes);render();view?.centre();persist();
  }
  if(HQ.sandbox.active&&view)sandboxUI=HQ.sandbox.attach({getState:()=>state,replace:replaceSandbox,choose:options=>boardChoice.choose(options),onCpu(){
    if(!state||moving)return;const next=JSON.parse(JSON.stringify(state));HQ.sandbox.turn(next,next.heroes.at(-1).id);replaceSandbox(next);dispatch({type:"END_TURN"});
  }});
  $("quest-briefing").textContent=Q.briefing;
  function unrevealedRollState(){return P.unrevealed(state,diceProgress);}
  function render({preserveCamera=false}={}) {
    if(!treasureDrawer.busy&&treasureLock){treasureLock();treasureLock=null;}
    if(state.pending?.type!=="monster-intro")D.close("zargon-dialog");
    $("restart-game").disabled=moving;
    $("open-quest-info").disabled=moving||Boolean(screen);
    selectedRoute=null;previewPaths=null;
    context.close();searchDialog.close();updateBoard({preserveCamera});view?.setInteractive(state.phase==="hero-turn"&&!state.pending&&!moving&&!screen&&!dicePrompt&&!diceProgress);
    const hero=projection.activeHero,name=E.heroNames.get(hero.id);
    const display=unrevealedRollState();
    HQ.adventureHUD.render(display,{...projection,activeHero:display.heroes[state.turnIndex]});
    $("active-portrait").disabled=moving||Boolean(screen)||Boolean(boardChoice?.active)||Boolean(view?.actionCameraActive)||state.phase!=="hero-turn";
    const cpu=state.phase==="monster-turn";
    $("menu-button").disabled=Boolean(dicePrompt||screen);
    $("open-inventory").disabled=moving||Boolean(screen||dicePrompt||diceProgress)||HQ.quest.isEnded(state.phase);
    if(!cpu)pacing.setPaused(false);
    diceTray.setPaused(cpu&&pacing.paused);
    $("cpu-controls").hidden=!cpu;$("pause-cpu").textContent=pacing.paused?"Resume Zargon":"Pause Zargon";
    $("pause-cpu").setAttribute("aria-pressed",String(pacing.paused));
    if(dicePrompt||screen==="movement"||diceProgress)for(const id of ["roll-movement","open-spellbook","open-search","finish-attacks","end-turn"])$(id).disabled=true;
    const latest=diceProgress?diceProgress.rolled?"Rolling…":"Waiting for the next roll.":display.log.at(-1)?.text||"Choose your next move.";message(latest);
    saveStatus();partyUI.render(display);
    if(dicePrompt?.type==="trap") {
      diceTray.show({id:"trap-ready-"+(dicePrompt.command.id||dicePrompt.command.over),kind:"combat",count:1,title:dicePrompt.title,kicker:hero.owner+" · "+hero.name,automatic:false,rolled:false,cancellable:true,figures:[hero],description:dicePrompt.description});
    }
    else if(dicePrompt) {
      const target=state.monsters.find(figure=>figure.id===dicePrompt.targetId);
      diceTray.show({id:"attack-ready-"+target.id,kind:"combat",count:HQ.combat.attack(hero,state),title:"Attack · "+hero.name,kicker:hero.owner,automatic:false,rolled:false,cancellable:true,
        figures:[{...hero,role:"Attack"},{...target,role:"Defence"}],description:"Skulls hit"+(state.movement.started?" · Ends movement":"")});
    }
    else if(screen==="movement"||diceProgress){presentDice();}
    else if(state.pending?.type==="monster-intro") {
      diceTray.close();pacing.clear();clearFeedback();treasureDrawer.close();
      $("zargon-round").textContent="ROUND "+state.round;D.show("zargon-dialog");
    }
    else if(state.pending?.type==="report") {
      if(state.lastReport.type==="treasure") {
        const busy=treasureDrawer.present(state.lastReport,{animate:animateTreasure});animateTreasure=false;
        if(busy){diceTray.close();pacing.clear();treasureLock??=HQ.turnControls.lock();return;}
        if(treasureHealth?.reportId===state.lastReport.id) {
          const queued=treasureHealth,expected=state;treasureHealth=null;pacing.clear();
          playPresentation(()=>view?.animateTreasureHazard(expected.lastReport,queued.changes),()=>{if(state===expected)render();});return;
        }
      }
      diceTray.close();showFeedback();
      if(HQ.inventory.recoveryHero(state)){pacing.clear();return;}
      if(HQ.dungeon.mustEscape(state)&&HQ.dungeon.escapeCells(state,state.lastReport).length) {
        pacing.clear();$("dismiss-feedback").hidden=true;
        if(!$("escape-blocks")){
          const button=document.createElement("button");button.id="escape-blocks";button.type="button";button.className="hq-button hq-button--primary";button.textContent="Move clear";
          button.addEventListener("click",async()=>{
            const expected=state;context.close();$("action-feedback").hidden=true;
            const selected=await boardChoice.choose({title:"Falling blocks · Choose a square ahead or behind",targets:HQ.dungeon.escapeCells(state,state.lastReport).map(id=>({type:"cell",id,label:"Move clear"})),reopenOnPick:false});
            if(state===expected)$("action-feedback").hidden=false;
            if(state===expected&&selected)dispatch({type:"ESCAPE_FALLING_BLOCK",to:selected.id});
          });$("feedback-content").append(button);
        }return;
      }
      const expected=state,reportId=state.pending.reportId;
      pacing.schedule("report-"+reportId,()=>{
        if(state===expected)dispatch({type:"ACK_REPORT"});
      },state.lastReport.type==="monster-move"?900:1800);
    }
    else if(HQ.quest.isEnded(state.phase)){diceTray.close();HQ.questUI.showOutcome(state);}
    else if(state.pending?.type==="handoff") {
      diceTray.close();
      if(state.heroes.filter(HQ.combat.inPlay).length===1) {
        const expected=state;pacing.schedule("solo-"+state.round+"-"+hero.id,()=>{if(state===expected)dispatch({type:"ACK_HANDOFF"});},100);
      } else {
        $("handoff-heading").textContent="Your turn, "+hero.owner;
        $("handoff-description").textContent=name;
        HQ.portraits.set($("handoff-portrait"),[hero]);
        $("handoff-round").textContent="ROUND "+state.round+" · "+name.toUpperCase();D.show("handoff-dialog");
      }
    }
    else if(cpu) {
      diceTray.close();const expected=state;
      pacing.schedule("cpu-"+state.round+"-"+state.monsterTurn.index+"-"+state.monsterTurn.resumeId,()=>{if(state===expected)dispatch({type:"RESOLVE_MONSTER"});},450);
    }
    else if(state.movement.rolled)presentDice();
    else diceTray.close();
  }
  function startAdventure(config) {
    if(!view||moving)return;
    clearFeedback();pacing.clear();resetTreasure();pacing.setPaused(false);spellbook.close();inventory.close();diceTray.close();
    const values=new Uint32Array(1);window.crypto.getRandomValues(values);
    state=E.createSession(config,values[0]);
    screen="briefing";diceProgress=null;dicePrompt=null;animateDice=false;view.resetFacing();persist();
    try {render();view.centre();persist();D.close("setup-dialog");D.show("briefing-dialog");}
    catch(error){message("The adventure could not start. "+error.message,true);const p=document.createElement("p");p.className="hq-callout";p.textContent=error.message;$("setup-form").append(p);}
  }
  $("setup-form").addEventListener("submit",event=>{
    event.preventDefault();
    startAdventure(partyUI.config());
  });
  $("begin-turn").addEventListener("click",()=>{screen=null;persist();D.close("briefing-dialog");render();message("Roll movement for the "+E.heroNames.get(E.active(state).id)+", then click a square to see its actions.");});
  $("pause-cpu").addEventListener("click",()=>{if(state?.phase!=="monster-turn")return;pacing.setPaused(!pacing.paused);diceTray.setPaused(pacing.paused);$("pause-cpu").textContent=pacing.paused?"Resume Zargon":"Pause Zargon";$("pause-cpu").setAttribute("aria-pressed",String(pacing.paused));});
  $("dismiss-feedback").addEventListener("click",()=>{
    if(HQ.inventory.recoveryHero(state)||HQ.dungeon.mustEscape(state))return;
    $("action-feedback").hidden=true;
    if(!moving&&!diceProgress&&state?.pending?.type==="report")dispatch({type:"ACK_REPORT"});
  });
  $("retry-adventure").addEventListener("click",()=>{D.close("quest-outcome-dialog");if(sandboxUI)sandboxUI.show();else D.show("setup-dialog");});
  $("roll-movement").addEventListener("click",requestMovementRoll);
  $("open-search").addEventListener("click",()=>{if(state&&!moving&&!screen&&!dicePrompt&&!diceProgress&&!state.pending&&!boardChoice?.active){context.close();spellbook.close();inventory.close();treasureDrawer.close();searchDialog.show();}});
  $("finish-attacks").addEventListener("click",()=>{if(!moving&&!screen&&!dicePrompt&&!diceProgress)dispatch({type:"FINISH_ATTACKS"});});
  $("open-spellbook").addEventListener("click",()=>{if(!moving&&!screen&&!dicePrompt&&state?.phase==="hero-turn"&&!state.pending){context.close();inventory.close();treasureDrawer.close();if($("spell-dialog").open)spellbook.close();else spellbook.show();}});
  $("open-inventory").addEventListener("click",()=>{if(state&&!moving&&!screen&&!dicePrompt&&!diceProgress){context.close();spellbook.close();treasureDrawer.close();if(inventory.open)inventory.close();else inventory.show(HQ.inventory.recoveryHero(state)?.id);}});
  $("end-turn").addEventListener("click",()=>{if(!screen&&!dicePrompt)dispatch({type:"END_TURN"});});
  $("ready-hero").addEventListener("click",()=>{D.close("handoff-dialog");dispatch({type:"ACK_HANDOFF"});view?.centre();});
  $("begin-zargon").addEventListener("click",()=>{
    if(moving||state?.pending?.type!=="monster-intro")return;
    D.close("zargon-dialog");dispatch({type:"RESOLVE_MONSTER"});
  });
  $("menu-button").addEventListener("click",()=>{if(state)D.show("menu-dialog");else D.show("setup-dialog");});
  $("open-quest-info").addEventListener("click",()=>{
    if(!state||moving||screen||treasureDrawer.busy||boardChoice?.active)return;
    context.close();HQ.questUI.showInfo(unrevealedRollState());
  });
  $("open-help").addEventListener("click",()=>{D.close("menu-dialog");D.show("help-dialog");});
  function requestRestart(mode) {
    if(!state||moving)return;
    if(sandboxUI){D.close("menu-dialog");sandboxUI.show();return;}
    restartMode=mode;context.close();D.close("menu-dialog");
    $("confirm-heading").textContent=mode==="restart"?"Restart The Trial?":"Gather a new party?";
    $("confirm-restart").textContent=mode==="restart"?"Restart":"New adventure";D.show("confirm-dialog");
  }
  $("restart-game").addEventListener("click",()=>requestRestart("restart"));
  $("restart-adventure").addEventListener("click",()=>requestRestart("new"));
  $("confirm-restart").addEventListener("click",()=>{
    D.close("confirm-dialog");
    if(restartMode==="restart")startAdventure({heroIds:state.heroes.map(hero=>hero.id),owners:Object.fromEntries(state.heroes.map(hero=>[hero.id,hero.owner])),
      ...(state.heroes.filter(HQ.spells.isCaster).every(hero=>hero.spellGroups.length)?{spellGroups:Object.fromEntries(state.heroes.filter(HQ.spells.isCaster).map(hero=>[hero.id,hero.spellGroups]))}:{})});
    else D.show("setup-dialog");
  });
  $("setting-grid").addEventListener("change",event=>{view?.setGrid(event.target.checked);persist();});
  $("wall-mode").addEventListener("click",()=>{view?.cycleWallMode();persist();});
  $("dynamic-lighting").addEventListener("click",()=>{if(view){view.setTorchLighting(!view.snapshot().torchLightingEnabled);persist();}});
  $("action-camera-mode").addEventListener("click",()=>{if(!view||moving)return;const enabled=!view.snapshot().cinematicCameraEnabled;playPresentation(()=>view.setCinematicCameraEnabled(enabled),()=>{if(state)render();persist();});});
  $("setting-light-level").addEventListener("input",event=>view?.setAmbientLightLevel(event.target.valueAsNumber));
  $("setting-light-level").addEventListener("change",persist);
  $("centre-hero").addEventListener("click",()=>view?.centre());$("view-explored").addEventListener("click",()=>view?.explored());
  $("zoom-in").addEventListener("click",()=>view?.zoom(1.2));$("zoom-out").addEventListener("click",()=>view?.zoom(1/1.2));
  $("view-tabletop").addEventListener("click",()=>view?.view(false));$("view-overhead").addEventListener("click",()=>view?.view(true));
  window.addEventListener("pagehide",persist);
  window.addEventListener("pageshow",event=>{if(event.persisted&&state&&!moving)render();});
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")persist();});
  HQ.createSaveFiles({getSnapshot:()=>state&&!moving&&!importing?{state,screen,dice:diceProgress,view:view?.snapshot()||null}:null,onImport:snapshot=>{
    if(moving||importing||boardChoice?.active)return "Finish the current action before importing.";
    const error=S.save(snapshot);
    if(error)return "Browser storage is unavailable. Your current adventure has been kept; the file was not imported.";
    // Use the ordinary startup path for pending rolls/queues and migrations.
    // pagehide/visibility callbacks must not overwrite the newly installed save.
    importing=true;pacing.clear();diceTray.close();window.location.reload();return "";
  }});
  const saved=S.load();
  if(saved.snapshot&&view) {
    state=saved.snapshot.state;screen=saved.snapshot.screen;diceProgress=saved.snapshot.dice;
    // Refill setup so New adventure begins with the current players/choices.
    partyUI.restore(state.heroes);
    try {
      render();view.restore(saved.snapshot.view);
      const settings=view.snapshot();$("setting-grid").checked=settings.gridEnabled;
      if(screen==="briefing")D.show("briefing-dialog");
      // render resumes the recorded presentation/CPU stage through pacing.
    } catch(error) {
      pacing.clear();state=null;screen=null;diceProgress=null;diceTray.close();document.querySelectorAll("dialog[open]").forEach(dialog=>dialog.close());
      saved.error="The saved adventure could not be displayed. It has been kept; start a new adventure to replace it.";
    }
  }
  if(!state) {
    partyUI.render();
    if(sandboxUI){
      if(!saved.error)replaceSandbox(HQ.sandbox.create());
      sandboxUI.show(saved.error);return;
    }
    if(saved.error){const p=document.createElement("p");p.className="hq-callout";p.setAttribute("role","alert");p.textContent=saved.error;$("setup-form").prepend(p);}
    D.show("setup-dialog");
  }
})();

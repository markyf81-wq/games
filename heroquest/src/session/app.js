(function () {
  "use strict";
  const HQ=window.HeroQuest,E=HQ.exploration,T=HQ.topology,Q=HQ.quests.current,D=HQ.dialogs,S=HQ.sessionStorage,P=HQ.sessionPresentation;
  const $=id=>document.getElementById(id);let state=null,projection=null,view=null,moving=false,screen=null,saveError="",diceProgress=null,dicePrompt=null,animateDice=false;
  let selectedRoute=null,restartMode="new",boardChoice=null,sandboxUI=null,feedbackKey=null,animateTreasure=false,treasureLock=null,importing=false,treasureHealth=null,trapTravel=null;
  function clearFeedback(){feedbackKey=null;$("action-feedback").hidden=true;}
  function showFeedback() {
    const key="report-"+state.lastReport.id+(state.lastReport.recovery?"-recovered":"");
    if(feedbackKey===key)return;
    feedbackKey=key;HQ.combatUI.render(state);$("action-feedback").hidden=false;
    const hero=HQ.inventory.recoveryHero(state),chooseHeir=HQ.recovery.needsChoice(state);$("dismiss-feedback").hidden=Boolean(hero)||chooseHeir;
    if(hero||chooseHeir) {
      const actions=document.createElement("div");actions.className="recovery-actions";
      const add=(label,run,primary=false)=>{const button=document.createElement("button");button.type="button";button.className="hq-button"+(primary?" hq-button--primary":"");button.textContent=label;button.addEventListener("click",run);actions.append(button);};
      const potion=hero&&HQ.inventory.potions(hero).find(HQ.inventory.healing);
      if(potion)add(HQ.itemData.byId[potion.kind].healingDice?"Drink healing potion & roll":"Drink healing potion",()=>requestItem(hero.id,potion.id),true);
      for(const card of hero?HQ.recovery.healingSpells(state,hero):[])add("Save yourself · "+card.name,()=>dispatch({type:"RECOVER_SPELL",heroId:hero.id,spellId:card.id}),true);
      add(hero?"Let hero fall":"Recover possessions",requestDefeat);$("feedback-content").append(actions);
    }
  }
  async function requestDefeat(){
    if(moving||diceProgress||boardChoice?.active)return;
    const expected=state;let recipientId;
    if(HQ.recovery.needsChoice(state)){
      $("action-feedback").hidden=true;
      const selected=await chooseActionTarget({title:"Choose a companion to recover the possessions",reopenOnPick:false,
        targets:HQ.recovery.heirs(state).map(hero=>({type:"piece",id:hero.id,label:hero.owner+" · "+hero.name}))});
      if(state!==expected)return;
      $("action-feedback").hidden=false;if(!selected)return;recipientId=selected.id;
    }
    dispatch({type:"ACK_REPORT",acceptDefeat:true,...(recipientId?{recipientId}:{})});
  }
  const pacing=HQ.createTurnPacing({blocked:()=>moving||treasureDrawer.busy||$("inventory-dialog").open||Boolean(document.querySelector('dialog[open]:not([data-nonmodal])'))});
  const title=kind=>HQ.pieces[kind]?.name||kind;
  const message=(text,error=false)=>{$("adventure-message").textContent=text;$("adventure-message").classList.toggle("is-error",error);};
  const context=HQ.createContextPanel({onClose(){selectedRoute=null;view?.setSelection(null);}});
  const movementActions=HQ.createMovementActions({getState:()=>state,getProjection:()=>projection,dispatch});
  const {moveOption,approachDestination,modelMoveOption,plannedRoute}=movementActions;
  const diceTray=HQ.createDiceTray({onRoll:rollDice,onSettled:id=>{
    if(screen==="movement"||diceProgress||state?.pending?.type==="escort"&&!state.pending.ready)pacing.schedule("dice-"+id,()=>{if(diceTray.activeId===id)continueDice();},screen==="movement"?250:1000);
  },onCancel(){
    const attack=dicePrompt?.type==="attack";dicePrompt=null;
    if(attack)playPresentation(()=>view?.finishAttack(),()=>{render();persist();});
    else render();
  }});
  const spellbook=HQ.createSpellbook({getState:()=>state,onCast:command=>dispatch(command),onChooseTarget:chooseActionTarget});
  const dungeonActions=HQ.createDungeonActions({getState:()=>state,dispatch,proximityAction,choose:chooseActionTarget,requestRoll(command,title,description){
    if(moving||dicePrompt||diceProgress||state.pending)return;
    beginAction();
    clearFeedback();dicePrompt={type:"trap",command,title,description};render();
  }});
  const searchDialog=HQ.createSearchDialog({options:()=>dungeonActions.searches()});
  const inventory=HQ.createInventory({getState:unrevealedRollState,getUseReason:(heroId,itemId)=>moving||screen||dicePrompt||diceProgress?"Finish the current roll first.":HQ.inventory.reason(state,state.heroes.find(hero=>hero.id===heroId),itemId),
    getEquipReason:(heroId,itemId,putOn)=>moving||screen||dicePrompt||diceProgress?"Finish the current roll first.":HQ.inventory.equipReason(state,state.heroes.find(hero=>hero.id===heroId),itemId,putOn),onUse:requestItem,onGive:requestGive,
    onEquip(heroId,itemId,putOn){if(moving||screen||dicePrompt||diceProgress||boardChoice?.active)return;if(dispatch({type:"SET_EQUIPMENT",heroId,itemId,equip:putOn}))inventory.render();}});
  const armoury=HQ.createArmoury({getState:()=>state,onCommand:command=>dispatch(command),onClose(){
    if(state&&HQ.quest.isEnded(state.phase)&&!state.pending)render();
  }});
  function openArmoury(){
    if(!state||moving||screen||dicePrompt||diceProgress||boardChoice?.active||!HQ.armoury.visitors(state).length)return;
    D.close("quest-outcome-dialog");D.close("menu-dialog");if(sandboxUI)D.close("sandbox-dialog");armoury.show();
  }
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
  function beginAction(){
    if(!view?.snapshot().sightOverlayEnabled)return;
    view.setSightOverlay(false);persist();
  }
  function chooseActionTarget(options){beginAction();return boardChoice?.choose(options)||Promise.resolve(null);}
  function updateBoard({preserveCamera=false}={}) {
    projection=E.project(diceProgress?.stage==="trap"?P.unrevealed(state,diceProgress):state);Object.assign(projection,P.statuses(state,projection.activeHero,diceProgress));
    const report=P.pendingReport(state),cutawayHero=report?.type==="combat"&&report.attackerSide==="monster"
      ?HQ.escort.allies(state).find(hero=>hero.id===report.defenderId):state.pending?.type==="escort"?HQ.escort.get(state):projection.activeHero;
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
    beginAction();
    const oldCells=new Set(state.discoveredCells),oldRooms=new Set(state.discoveredRooms);
    const actingHeroId=projection.activeHero.id;
    const openingSecret=command.type==="OPEN_DOOR"&&projection.doors.some(door=>door.id===command.id&&door.secret);
    const previousReport=state.lastReport,removal=command.type==="ACK_REPORT"?P.defeatedReport(state):null,result=E.applyCommand(state,command);
    if(!result.ok){message(result.message,true);return false;}
    if(result.reload)return installQuest(result.state);
    const healthChanges=P.healthChanges(state,result.state),nextHeroTurn=P.nextHeroTurn(state,result.state);
    if(nextHeroTurn||!["ACK_REPORT","ACK_HANDOFF"].includes(command.type)){clearFeedback();treasureDrawer.close();}
    pacing.clear();spellbook.close();if(command.type!=="SET_EQUIPMENT")inventory.close();context.close();
    state=result.state;screen=command.type==="ROLL_MOVEMENT"?"movement":null;dicePrompt=null;
    animateTreasure=command.type==="SEARCH_TREASURE"&&state.lastReport?.type==="treasure";
    if(animateTreasure)treasureHealth=healthChanges.length?{reportId:state.lastReport.id,changes:healthChanges}:null;
    if(command.type==="ACK_REPORT"&&(command.acceptDefeat||state.lastReport.belongings)&&!nextHeroTurn){HQ.combatUI.render(state);$("dismiss-feedback").hidden=false;}
    const revealedRooms=state.discoveredRooms.filter(id=>!oldRooms.has(id));
    const revealCells=["MOVE","OPEN_DOOR","CAST_SPELL","JUMP_TRAP","DISARM_TRAP","ESCAPE_FALLING_BLOCK"].includes(command.type)?state.discoveredCells.filter(id=>revealedRooms.length?revealedRooms.includes(T.regions.get(id)):!oldCells.has(id)):[];
    const report=P.pendingReport(state),freshReport=report&&report.id!==previousReport?.id;
    const newCombat=freshReport&&report.type==="combat";
    diceProgress=HQ.diceFlow.afterCommand(state,command,previousReport?.id,diceProgress);
    if(command.type==="USE_ITEM"&&!diceProgress)animateDice=false;
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
    const spellCast=command.type==="CAST_SPELL"?state.lastReport:command.type==="RECOVER_SPELL"?HQ.recovery.spellReport(state):null;
    // Keep the close camera across visible CPU activations. Return once for
    // hero planning, the next hero round, or a terminal quest outcome.
    const returnToBoard=command.type==="ACK_REPORT"&&view?.actionCameraActive&&state.phase!=="monster-turn";
    const actorAction=!openingSecret&&view?.snapshot().cinematicCameraEnabled&&["OPEN_DOOR","EXIT_QUEST"].includes(command.type);
    const furnitureHazard=!diceProgress&&freshReport&&report.type==="trap"&&report.trapKind==="furniture";
    const trapTriggered=freshReport&&report.type==="trap";
    const immediateHealth=!diceProgress&&!animateTreasure&&!furnitureHazard?healthChanges:[];
    if(view&&(result.motion?.path.length||cpuAttack||removal||returnToBoard||spellCast||actorAction||furnitureHazard||immediateHealth.length)) {
      if(result.motion?.path.length)message(P.actors(state).find(actor=>actor.id===result.motion.actorId).name+" is moving…");
      else if(removal)message(removal.defenderName+" is defeated.");
      else if(spellCast)message(spellCast.attackerName+" casts "+HQ.spellData.byId[spellCast.spellId].name+".");
      playPresentation(async()=>{
        if(returnToBoard)await view.finishAttack();
        // Keep the old discoveries until the movement reaches its endpoint.
        if(result.motion?.path.length)await view.animateMovement(result.motion,{holdView:command.type==="RESOLVE_MONSTER"||continueActionView&&revealCells.length===0});
        if(trapTriggered&&!diceProgress&&!furnitureHazard)updateBoard({preserveCamera:true});
        if(cpuAttack){updateBoard({preserveCamera:true});await view.animateAttack(state.lastReport.attackerId,state.lastReport.defenderId);}
        if(spellCast)await view.animateSpell(spellCast);
        if(furnitureHazard){updateBoard({preserveCamera:true});await view.animateTrapHazard(state.lastReport);}
        if(actorAction)await view.animateAction(actingHeroId,command.type==="OPEN_DOOR"?command.id:null,command.type==="OPEN_DOOR"?()=>updateBoard({preserveCamera:true}):null);
        if(immediateHealth.length)await view.animateHealthChanges(immediateHealth,spellCast);
        if(removal)await view.animateDefeat(removal.defenderId,removal.attackerId,E.project(state).fallen);
      },complete);
      return true;
    }
    try{complete();}catch(error){message("The board could not update. "+error.message,true);return false;}
    return true;
  }
  function proximityAction(item,{label,ready,blocked="",reason="",unavailable="",accept,positions,run}) {
    const destination=!blocked&&!ready()?approachDestination(item,accept,positions):null;
    const available=!blocked&&(ready()||destination);
    const hint=blocked||(destination?"Move into reach, then "+label.toLowerCase()+".":available?reason:unavailable||
      (state.movement.closed?"Movement has ended.":!state.movement.rolled?"Roll movement first.":"No free square within reach of this action and your remaining movement."));
    return {label,primary:true,disabled:!available,destination,
      reason:hint,
      run:()=>{
        if(ready()){run();return;}
        const to=approachDestination(item,accept,positions);if(!to)return;
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
  function requestAttack(item,options={}) {
    if(moving||!HQ.combat.targets(state,projection.activeHero,options).some(target=>target.id===item.id))return;
    beginAction();
    clearFeedback();
    const hero=projection.activeHero;
    const show=()=>{
      dicePrompt={type:"attack",targetId:item.id,...options};render();persist();
    };
    message(hero.name+(options.throwItemId?" throws a Dagger at ":HQ.combatData.weapons[hero.weapon].ranged?" shoots at ":" attacks ")+item.name+".");
    playPresentation(()=>view?.animateAttack(hero.id,item.id,{melee:!options.throwItemId&&!HQ.combatData.weapons[hero.weapon].ranged}),show);
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
    if(state?.pending?.type==="escort"&&state.pending.die===null){animateDice=true;return dispatch({type:"ROLL_ESCORT"});}
    inventory.close();
    if(dicePrompt){animateDice=true;return dispatch(dicePrompt.type==="trap"?dicePrompt.command:{type:"ATTACK",targetId:dicePrompt.targetId,...(dicePrompt.throwItemId?{throwItemId:dicePrompt.throwItemId}:{})});}
    if(!diceProgress||diceProgress.rolled)return false;
    // Combat outcomes already belong to the saved engine report. Roll reveals
    // and animates that stage; it never resolves another attack or defence.
    diceProgress.rolled=true;animateDice=true;persist();render();return true;
  }
  function presentDice() {
    const animate=animateDice;animateDice=false;
    diceTray.show(HQ.diceFlow.tray(state,projection,diceProgress,animate));
  }
  function continueDice() {
    pacing.clear();
    if(state?.pending?.type==="escort"&&!state.pending.ready&&state.pending.die!==null){dispatch({type:"ACK_ESCORT_ROLL"});return;}
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
    const nextStage=HQ.diceFlow.next(state,diceProgress);
    if(nextStage){diceProgress=nextStage;persist();render();return;}
    const report=state.lastReport,expected=state;
    diceTray.close();diceProgress=null;persist();
    if(view&&report.type==="trap") {
      clearFeedback();playPresentation(async()=>{
        if(trapTravel===report.id&&report.jumpFrom)await view.animateMovement({actorId:report.defenderId,from:report.jumpFrom,path:[report.jumpTo],jump:report.operation==="jump"});
        trapTravel=null;updateBoard({preserveCamera:true});
        await view.animateTrapHazard(report);
      },()=>{if(state===expected){render();persist();}});return;
    }
    if(view&&["combat","spell"].includes(report.type)&&(report.bodyAfter!==report.bodyBefore||report.type==="combat"&&(report.shields>0||report.weaponId==="crossbow"||report.thrownItemId))) {
      clearFeedback();
      playPresentation(()=>view.animateHit(report),()=>{if(state===expected){render();persist();}});
    } else render();
  }
  async function requestGive(heroId,itemId) {
    if(!state||moving||screen||dicePrompt||diceProgress||boardChoice?.active)return;
    const expected=state,owner=state.heroes.find(hero=>hero.id===heroId),reason=HQ.inventory.giveReason(state,owner,itemId);
    if(reason){message(reason,true);return;}
    const item=owner.inventory.items.find(item=>item.id===itemId),targets=HQ.inventory.giveTargets(state,owner,itemId);
    const selected=await chooseActionTarget({dialogId:"inventory-dialog",reopenOnPick:false,
      title:"Give "+HQ.itemData.byId[item.kind].name+" · Choose a hero",
      targets:targets.map(hero=>({type:"piece",id:hero.id,label:hero.owner+" · "+hero.name}))});
    if(!selected)return;
    if(state===expected)dispatch({type:"GIVE_ITEM",heroId,itemId,targetId:selected.id});
    inventory.show(heroId);
  }
  function openCell(id) {
    if(boardChoice?.pick({type:"cell",id}))return;
    if(state?.pending?.type==="escort"&&state.pending.ready&&!moving){
      const routes=HQ.escort.routes(state),point=view.setSelection({type:"cell",id});
      context.show({name:"Tile",kind:"ESCORT SIR RAGNAR",description:state.pending.remaining+" movement remaining",actions:[{label:"Move Sir Ragnar here",primary:true,disabled:!routes.has(id),reason:routes.has(id)?"":"Choose a clear square within his movement.",run:()=>dispatch({type:"MOVE_ESCORT",to:id})}]},point);previewRoute(id,true);return;
    }
    if(!state||state.pending||moving||screen||dicePrompt||diceProgress||!projection.discoveredCells.includes(id)&&!(projection.blindMovement&&T.floor.has(id)))return;
    spellbook.close();inventory.close();treasureDrawer.close();
    const point=view.setSelection({type:"cell",id});
    const known=projection.discoveredCells.includes(id),rock=T.magic(state,projection.activeHero,"passThroughRock");
    const stair=T.stairs.has(id),actions=[moveOption(id)];
    const trap=projection.traps.find(trap=>trap.cell===id);if(trap)actions.push(...dungeonActions.forTrap(trap));
    if(stair)actions.push({label:"Leave dungeon",disabled:Boolean(HQ.quest.exitReason(state,projection.activeHero)),reason:HQ.quest.exitReason(state,projection.activeHero)||"",run:async()=>{if(await HQ.questUI.confirmExit(state))dispatch({type:"EXIT_QUEST"});}});
    context.show({name:known?"Tile":"Unexplored space",kind:rock?"PASS THROUGH ROCK":stair?"STAIRWAY":"DUNGEON SQUARE",description:rock?"Pass through objects. Ending inside furniture or a figure returns you to the last clear square and ends movement. Ending in solid rock is fatal.":stair?"Movement within the stairs is free while you have movement remaining.":T.blockedAt(state,id)?HQ.pieces.blocked.description:"A square of explored dungeon floor.",actions},point);
    previewRoute(id,true);
  }
  function previewRoute(id,select=false) {
    if(boardChoice?.active)return;
    if(state?.pending?.type==="escort"&&state.pending.ready&&!moving){
      const escort=HQ.escort.get(state),path=HQ.escort.routes(state).get(id);
      view?.setRoutePreview(path?{cells:[T.key(escort.x,escort.row),...path],reachableSteps:path.length}:null);return;
    }
    if(select)selectedRoute=id;
    if(!id||!state||moving||state.phase!=="hero-turn"||state.pending||!projection.discoveredCells.includes(id)&&!(projection.blindMovement&&T.floor.has(id))){view?.setRoutePreview(null);return;}
    const hero=projection.activeHero,plan=plannedRoute(id);
    view?.setRoutePreview(plan?{cells:[T.key(hero.x,hero.row),...plan.path],reachableSteps:plan.reachableSteps}:null);
  }
  function openPiece(item) {
    if(boardChoice?.pick({type:"piece",id:item.id}))return;
    if(!state||state.pending||moving||screen||dicePrompt||diceProgress||item.type==="wall")return;
    spellbook.close();inventory.close();treasureDrawer.close();
    const point=view.setSelection({type:"piece",id:item.id}),actions=[];let details="";
    if(item.type==="monster") {
      const ranged=HQ.combatData.weapons[projection.activeHero.weapon].ranged;
      const beside=Math.abs(item.x-projection.activeHero.x)+Math.abs(item.row-projection.activeHero.row)===1;
      details="Attack "+HQ.combat.attack(item,state)+" · Defend "+HQ.combat.defence(item,state)+" · Move "+item.movement+(item.effects.sleep?" · Asleep":"");
      actions.push(proximityAction(item,{label:ranged?"Shoot":"Attack",ready:()=>projection.attackTargets.some(m=>m.id===item.id),
        blocked:state.actionUsed&&!state.extraAttack?"Your action has already been used this turn.":"",
        unavailable:ranged?beside?"The Crossbow cannot shoot an adjacent monster. Move away or equip a melee weapon.":"No clear Crossbow shot from here. Reposition or change weapons.":"",
        positions:()=>HQ.combat.attackPositions(state,projection.activeHero,item),run:()=>requestAttack(item)}));
      const dagger=HQ.combat.throwables(projection.activeHero)[0];
      if(dagger){
        const options={throwItemId:dagger.id};
        actions.push(proximityAction(item,{label:"Throw Dagger",ready:()=>HQ.combat.targets(state,projection.activeHero,options).some(target=>target.id===item.id),
          blocked:state.actionUsed&&!state.extraAttack?"Your action has already been used this turn.":"",
          reason:"One attack die, plus active bonuses. The Dagger is lost even on a miss.",unavailable:"No clear throwing line. Reposition before throwing.",
          positions:()=>HQ.combat.attackPositions(state,projection.activeHero,item,options),run:()=>requestAttack(item,options)}));
      }
    } else if(item.type==="door") {
      actions.push(proximityAction(item,{label:"Open door",ready:()=>projection.adjacentDoors.some(d=>d.id===item.id),
        blocked:item.open?"This door is already open and stays open.":"",reason:"Opening a door is free.",run:()=>dispatch({type:"OPEN_DOOR",id:item.id})}));
    } else if(item.type==="trap") {
      actions.push(...dungeonActions.forTrap(item));
    } else if(item.type==="belongings") {
      const reason=HQ.recovery.takeReason(state,projection.activeHero,item);
      details=item.items.length+" items · "+item.gold+" gold";
      actions.push({label:"Pick up sealed bag",primary:true,disabled:Boolean(reason),reason:reason||"Carry this bag to quest completion. Contents cannot be used. Uses no action or movement.",run:()=>dispatch({type:"TAKE_BELONGINGS",id:item.id})});
    } else if(item.id==="sir-ragnar") {
      details="Wounded knight · "+item.body+" / "+item.maxBody+" Body · Defend "+item.defend+" dice · Cannot attack";
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
      if(item.kind==="chest"){
        const hero=projection.activeHero,inRoom=T.regions.get(T.key(item.x,item.row))===HQ.treasure.room(hero,state);
        const reason=inRoom?HQ.treasure.reason(state,hero):"Move into this room to search it.";
        actions.push({label:"Search for treasure",disabled:Boolean(reason),reason:reason||"Searches the whole room, including chests and furniture. Uses your action.",run:()=>dispatch({type:"SEARCH_TREASURE"})});
      }
      const trap=projection.traps.find(trap=>trap.furnitureId===item.id);if(trap){
        if(trap.status==="found")details="Trapped · Disarm before searching for treasure.";
        actions.push(...dungeonActions.forTrap(trap));
      }
    }
    actions.push(item.type==="trap"?moveOption(T.key(item.x,item.row),"Move onto trap"):modelMoveOption(item));
    actions.push({label:"Centre view",run:()=>view.focusPiece(item.id)});
    context.show({name:item.type==="door"?(item.secret?"Secret door":item.open?"Open door":"Closed door"):item.name||title(item.kind),kind:item.type==="hero"?"HERO":item.type==="monster"?"MONSTER":"DUNGEON SCENERY",
      figure:item.type==="hero"||item.type==="monster"?item:null,description:item.type==="belongings"?"A sealed bag belonging to a fallen companion. Stand on an adjacent tile to pick it up, then carry it to safety to return their possessions after quest completion. You cannot use its contents.":item.type==="trap"?(item.status==="sprung"?"A sprung trap remains here.":"A discovered trap. Move onto it to trigger it, jump over it, or disarm it on a later turn."):item.secret?"A concealed stone panel. Open it from an adjacent square; opening is free.":item.type==="door"?"A stone-framed doorway connects two areas of the dungeon.":HQ.pieces[item.kind]?.description||"A revealed piece of dungeon scenery.",details,actions},point);
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
    beginAction();
    clearFeedback();pacing.clear();resetTreasure();pacing.setPaused(false);document.querySelectorAll("dialog[open]").forEach(dialog=>dialog.close());diceTray.close();view?.resetCombatCamera();
    state=next;screen=null;diceProgress=null;dicePrompt=null;animateDice=false;partyUI.restore(state.heroes,state.settings);render();view?.centre();persist();
  }
  if(HQ.sandbox.active&&view)sandboxUI=HQ.sandbox.attach({getState:()=>state,replace:replaceSandbox,choose:chooseActionTarget,onArmoury:openArmoury,onCpu(){
    if(!state||moving)return;const next=JSON.parse(JSON.stringify(state));HQ.sandbox.turn(next,next.heroes.at(-1).id);replaceSandbox(next);dispatch({type:"END_TURN"});
  }});
  $("quest-briefing").textContent=Q.briefing;$("briefing-heading").textContent=Q.title;document.title="HeroQuest · "+Q.title;
  function unrevealedRollState(){return P.unrevealed(state,diceProgress);}
  function render({preserveCamera=false}={}) {
    if(!treasureDrawer.busy&&treasureLock){treasureLock();treasureLock=null;}
    if(state.pending?.type!=="monster-intro")D.close("zargon-dialog");
    $("restart-game").disabled=moving;
    $("setting-fair-loot").checked=state.settings.fairLootRecovery;
    $("setting-fair-loot").disabled=moving||Boolean(screen||dicePrompt||diceProgress||state.pending||boardChoice?.active)||HQ.quest.isEnded(state.phase);
    $("open-quest-info").disabled=moving||Boolean(screen);
    selectedRoute=null;movementActions.reset();
    context.close();searchDialog.close();updateBoard({preserveCamera});view?.setInteractive(state.phase==="hero-turn"&&(!state.pending||state.pending.type==="escort"&&state.pending.ready)&&!moving&&!screen&&!dicePrompt&&!diceProgress);
    $("show-sight").disabled=!view?.interactive||Boolean(boardChoice?.active);
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
    HQ.adventureHUD.renderEscort(state);
    if(state.pending?.type==="escort"){
      if(state.pending.ready)diceTray.close();
      else {const animate=animateDice;animateDice=false;diceTray.show(HQ.diceFlow.escort(state,animate));}
    }
    else if(dicePrompt)diceTray.show(HQ.diceFlow.prompt(state,projection,dicePrompt));
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
      if(HQ.inventory.recoveryHero(state)||HQ.recovery.needsChoice(state)){pacing.clear();return;}
      if(HQ.dungeon.mustEscape(state)&&HQ.dungeon.escapeCells(state,state.lastReport).length) {
        pacing.clear();$("dismiss-feedback").hidden=true;
        if(!$("escape-blocks")){
          const button=document.createElement("button");button.id="escape-blocks";button.type="button";button.className="hq-button hq-button--primary";button.textContent="Move clear";
          button.addEventListener("click",async()=>{
            const expected=state;context.close();$("action-feedback").hidden=true;
            const selected=await chooseActionTarget({title:"Falling blocks · Choose a square ahead or behind",targets:HQ.dungeon.escapeCells(state,state.lastReport).map(id=>({type:"cell",id,label:"Move clear"})),reopenOnPick:false});
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
    else if(HQ.quest.isEnded(state.phase)){diceTray.close();if(armoury.open)armoury.render();else HQ.questUI.showOutcome(state);}
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
  function installSnapshot(snapshot){
    const error=S.save(snapshot);
    if(error)return error;
    // Reload only after storage succeeds. Outgoing page callbacks must not
    // overwrite the imported save or the newly selected quest with old state.
    importing=true;pacing.clear();diceTray.close();window.location.reload();return "";
  }
  function installQuest(next){
    const previous=view?.snapshot(),first=next.heroes[0],framing={target:[first.x+.5-13,.4,first.row+.5-9.5],halfHeight:4.4,follow:true};
    const camera=previous?{...previous,...framing,facings:{},sightOverlayEnabled:false,
      overheadReturn:previous.overheadReturn?{...previous.overheadReturn,...framing}:null}:null;
    const error=installSnapshot({state:next,screen:"briefing",dice:null,view:camera});
    if(error){message("The next quest could not be saved. This adventure has been kept. "+error,true);return false;}
    return true;
  }
  function startAdventure(config) {
    if(!view||moving)return;
    beginAction();
    clearFeedback();pacing.clear();resetTreasure();pacing.setPaused(false);spellbook.close();inventory.close();diceTray.close();
    const values=new Uint32Array(1);window.crypto.getRandomValues(values);
    const next=E.createSession(config,values[0]);
    if(next.contentVersion!==Q.id){installQuest(next);return;}
    state=next;
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
    if(HQ.inventory.recoveryHero(state)||HQ.recovery.needsChoice(state)||HQ.dungeon.mustEscape(state))return;
    $("action-feedback").hidden=true;
    if(!moving&&!diceProgress&&state?.pending?.type==="report")dispatch({type:"ACK_REPORT"});
  });
  $("open-armoury").addEventListener("click",openArmoury);
  $("continue-campaign").addEventListener("click",()=>{if(!moving)dispatch({type:"EMBARK_QUEST",mode:state.phase==="victory"?"next":"retry"});});
  $("focus-escort").addEventListener("click",()=>view?.focusHero("sir-ragnar"));
  $("retry-adventure").addEventListener("click",()=>{D.close("quest-outcome-dialog");if(sandboxUI)sandboxUI.show();else D.show("setup-dialog");});
  $("roll-movement").addEventListener("click",requestMovementRoll);
  $("open-search").addEventListener("click",()=>{if(state&&!moving&&!screen&&!dicePrompt&&!diceProgress&&!state.pending&&!boardChoice?.active){beginAction();context.close();spellbook.close();inventory.close();treasureDrawer.close();searchDialog.show();}});
  $("finish-attacks").addEventListener("click",()=>{if(!moving&&!screen&&!dicePrompt&&!diceProgress)dispatch({type:"FINISH_ATTACKS"});});
  $("open-spellbook").addEventListener("click",()=>{if(!moving&&!screen&&!dicePrompt&&state?.phase==="hero-turn"&&!state.pending){context.close();inventory.close();treasureDrawer.close();if($("spell-dialog").open)spellbook.close();else spellbook.show();}});
  $("open-inventory").addEventListener("click",()=>{if(state&&!moving&&!screen&&!dicePrompt&&!diceProgress){context.close();spellbook.close();treasureDrawer.close();if(inventory.open)inventory.close();else inventory.show(HQ.inventory.recoveryHero(state)?.id);}});
  $("end-turn").addEventListener("click",()=>{if(!screen&&!dicePrompt)dispatch({type:state.pending?.type==="escort"?"END_ESCORT":"END_TURN"});});
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
    $("confirm-description").textContent=mode==="restart"?"Restart this quest with the party and equipment it began with. Progress and finds from this attempt will be discarded.":"Start from Quest 1 with a fresh party, replacing this campaign and its browser save.";
    $("confirm-heading").textContent=mode==="restart"?"Restart "+Q.title+"?":"Gather a new party?";
    $("confirm-restart").textContent=mode==="restart"?"Restart":"New adventure";D.show("confirm-dialog");
  }
  $("restart-game").addEventListener("click",()=>requestRestart("restart"));
  $("restart-adventure").addEventListener("click",()=>requestRestart("new"));
  $("confirm-restart").addEventListener("click",()=>{
    D.close("confirm-dialog");
    if(restartMode==="restart")installQuest(HQ.campaign.restart(state));
    else D.show("setup-dialog");
  });
  $("setting-fair-loot").addEventListener("change",event=>{dispatch({type:"SET_RULES",fairLootRecovery:event.target.checked});event.target.checked=$("setup-fair-loot").checked=state.settings.fairLootRecovery;});
  $("setting-full-board").addEventListener("change",event=>{view?.setFullBoard(event.target.checked);persist();});
  $("setting-grid").addEventListener("change",event=>{view?.setGrid(event.target.checked);persist();});
  $("wall-mode").addEventListener("click",()=>{view?.cycleWallMode();persist();});
  $("dynamic-lighting").addEventListener("click",()=>{if(view){view.setTorchLighting(!view.snapshot().torchLightingEnabled);persist();}});
  $("show-sight").addEventListener("click",()=>{if(view&&!moving&&!screen&&!dicePrompt&&!diceProgress&&!boardChoice?.active&&state?.phase==="hero-turn"&&!state.pending){view.setSightOverlay(!view.snapshot().sightOverlayEnabled);persist();}});
  $("action-camera-mode").addEventListener("click",()=>{if(!view||moving)return;const enabled=!view.snapshot().cinematicCameraEnabled;playPresentation(()=>view.setCinematicCameraEnabled(enabled),()=>{if(state)render();persist();});});
  $("setting-light-level").addEventListener("input",event=>view?.setAmbientLightLevel(event.target.valueAsNumber));
  $("setting-light-level").addEventListener("change",persist);
  $("centre-hero").addEventListener("click",()=>view?.centre());$("view-explored").addEventListener("click",()=>view?.explored());
  $("zoom-in").addEventListener("click",()=>view?.zoom(1.2));$("zoom-out").addEventListener("click",()=>view?.zoom(1/1.2));
  $("view-overhead").addEventListener("click",()=>{view?.toggleOverhead();persist();});
  window.addEventListener("pagehide",persist);
  window.addEventListener("pageshow",event=>{if(event.persisted&&state&&!moving)render();});
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")persist();});
  HQ.createSaveFiles({getSnapshot:()=>state&&!moving&&!importing?{state,screen,dice:diceProgress,view:view?.snapshot()||null}:null,onImport:snapshot=>{
    if(moving||importing||boardChoice?.active)return "Finish the current action before importing.";
    return installSnapshot(snapshot)?"Browser storage is unavailable. Your current adventure has been kept; the file was not imported.":"";
  }});
  const saved=S.load();
  if(saved.snapshot&&view) {
    state=saved.snapshot.state;screen=saved.snapshot.screen;diceProgress=saved.snapshot.dice;
    // Refill setup so New adventure begins with the current players/choices.
    partyUI.restore(state.heroes,state.settings);
    try {
      render();view.restore(saved.snapshot.view);
      const settings=view.snapshot();$("setting-grid").checked=settings.gridEnabled;$("setting-full-board").checked=settings.fullBoardEnabled;
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

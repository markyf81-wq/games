(function () {
  "use strict";
  const HQ=window.HeroQuest,E=HQ.exploration,T=HQ.topology,Q=HQ.trial,D=HQ.dialogs,S=HQ.sessionStorage;
  const $=id=>document.getElementById(id);let state=null,projection=null,view=null,moving=false,screen=null,saveError="",diceProgress=null,dicePrompt=null,animateDice=false;
  let selectedRoute=null,previewPaths=null,restartMode="new",boardChoice=null,sandboxUI=null;
  const title=kind=>HQ.pieces[kind]?.name||kind;
  const message=(text,error=false)=>{$("adventure-message").textContent=text;$("adventure-message").classList.toggle("is-error",error);};
  const context=HQ.createContextPanel({onClose(){selectedRoute=null;view?.setSelection(null);}});
  const diceTray=HQ.createDiceTray({onRoll:rollDice,onContinue:continueDice,onCancel(){
    const attack=dicePrompt?.type==="attack";dicePrompt=null;
    if(attack)playPresentation(()=>view?.finishAttack(),()=>{render();persist();});
    else render();
  }});
  const spellbook=HQ.createSpellbook({getState:()=>state,onCast:command=>dispatch(command),onChooseTarget:options=>boardChoice?.choose(options)||Promise.resolve(null)});
  function saveStatus() {
    $("session-footer").textContent=saveError;
    $("session-footer").hidden=!saveError;
    $("session-footer").classList.toggle("is-error",Boolean(saveError));
  }
  function persist() {
    if(!state)return;
    saveError=S.save({state,screen,dice:diceProgress,view:view?.snapshot()||null});saveStatus();
  }
  function defeatedFigure() {
    return state.pending?.type==="report"&&["combat","spell","stone-move"].includes(state.lastReport?.type)&&state.lastReport.defeated
      ? [...state.heroes,...state.monsters].find(figure=>figure.id===state.lastReport.defenderId):null;
  }
  function updateBoard({preserveCamera=false}={}) {
    projection=E.project(state);
    const report=state.pending?.type==="report"&&state.lastReport?.type==="combat"?state.lastReport:null;
    const cutawayHero=report?.attackerSide==="monster"?state.heroes.find(hero=>hero.id===report.defenderId):projection.activeHero;
    view?.setProjection(projection,{defeatedFigure:defeatedFigure(),cutawayHero,preserveCamera});
  }
  function playPresentation(play,complete) {
    moving=true;context.close();view?.setInteractive(false);
    const unlock=HQ.turnControls.lock();
    $("board-canvas").setAttribute("aria-busy","true");
    // Presentation failure must not strand a resolved command or lock input.
    Promise.resolve().then(play).catch(()=>{view?.finishSpellEffects();view?.resetCombatCamera();}).then(()=>{
      moving=false;unlock();$("board-canvas").setAttribute("aria-busy","false");
      try{complete();}catch(error){message("The board could not update. "+error.message,true);}
    });
  }
  function dispatch(command,afterComplete=null) {
    if(moving||boardChoice?.active)return false;
    const oldCells=new Set(state.discoveredCells),oldRooms=new Set(state.discoveredRooms);
    const previousReport=state?.lastReport,removal=command.type==="ACK_REPORT"&&["combat","spell","stone-move"].includes(previousReport?.type)&&previousReport.defeated?previousReport:null,result=E.applyCommand(state,command);
    if(!result.ok){message(result.message,true);return false;}
    context.close();
    state=result.state;screen=command.type==="ROLL_MOVEMENT"?"movement":null;dicePrompt=null;
    const revealedRooms=state.discoveredRooms.filter(id=>!oldRooms.has(id));
    const revealCells=["MOVE","OPEN_DOOR","CAST_SPELL"].includes(command.type)?state.discoveredCells.filter(id=>revealedRooms.length?revealedRooms.includes(T.regions.get(id)):!oldCells.has(id)):[];
    if(command.type==="ACK_REPORT")diceProgress=null;
    const newCombat=state.pending?.type==="report"&&state.lastReport.type==="combat"&&state.lastReport.id!==previousReport?.id;
    if(newCombat)
      diceProgress={reportId:state.lastReport.id,stage:"attack",rolled:command.type==="ATTACK"};
    if(state.pending?.type==="report"&&state.lastReport.id!==previousReport?.id&&state.lastReport.redDice?.length)
      diceProgress={reportId:state.lastReport.id,stage:"spell",rolled:false};
    // Persist resolved outcomes before any animation or result dialog. Refreshing
    // during presentation must never replay a move, activation, damage or roll.
    persist();
    const complete=()=>{
      render({preserveCamera:revealCells.length>0});if(revealCells.length)view?.reveal(revealCells);persist();
      // ACK_REPORT has already advanced the authoritative queue/turn, if due.
      // Resume its next activation only after the acknowledged piece is removed.
      if(command.type==="ACK_REPORT"&&state.phase==="monster-turn"&&!state.pending)dispatch({type:"RESOLVE_MONSTER"});
      if(afterComplete)afterComplete();
    };
    const cpuAttack=newCombat&&command.type==="RESOLVE_MONSTER";
    const spellCast=command.type==="CAST_SPELL"?state.lastReport:null;
    const returnToBoard=command.type==="ACK_REPORT"&&previousReport?.type==="combat";
    if(view&&(result.motion?.path.length||cpuAttack||removal||returnToBoard||spellCast)) {
      if(result.motion?.path.length)message([...state.heroes,...state.monsters].find(actor=>actor.id===result.motion.actorId).name+" is moving…");
      else if(removal)message(removal.defenderName+" is defeated.");
      else if(spellCast)message(spellCast.attackerName+" casts "+HQ.spellData.byId[spellCast.spellId].name+".");
      playPresentation(async()=>{
        if(returnToBoard)await view.finishAttack();
        // Keep the old discoveries until the movement reaches its endpoint.
        if(result.motion?.path.length)await view.animateMovement(result.motion);
        if(cpuAttack){updateBoard({preserveCamera:true});await view.animateAttack(state.lastReport.attackerId,state.lastReport.defenderId);}
        if(spellCast)await view.animateSpell(spellCast);
        if(removal)await view.animateDefeat(removal.defenderId,removal.attackerId);
      },complete);
      return true;
    }
    try{complete();}catch(error){message("The board could not update. "+error.message,true);return false;}
    return true;
  }
  function movementReason(id) {
    if(state.phase!=="hero-turn"||state.pending)return "Wait for your hero’s turn.";
    const rock=T.magic(state,projection.activeHero,"passThroughRock");
    if(!rock&&T.blocked.has(id))return "This square is blocked by stone.";
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
    if(state.phase!=="hero-turn"||state.pending||state.movement.closed)return null;
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
        dispatch({type:"MOVE",to},()=>{
          // A reveal can stop MOVE early. Recheck the authoritative position and
          // action eligibility after animation rather than carrying a queued action.
          if(state.phase!=="hero-turn"||state.pending||projection.activeHero.id!==heroId)return;
          if(T.key(projection.activeHero.x,projection.activeHero.row)===to&&ready())run();
          else message("Movement stopped as new ground came into view. Choose the action again when ready.");
        });
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
    const hero=projection.activeHero,weapon=HQ.combatData.weapons[hero.weapon].name,count=HQ.combat.attack(hero);
    const show=()=>{
      render();persist();dicePrompt={type:"attack",targetId:item.id};
      diceTray.show({id:"attack-ready-"+item.id,kind:"combat",count,title:hero.name+" attacks "+item.name,kicker:hero.owner+" · ATTACK",automatic:false,rolled:false,cancellable:true,
        figures:[{...hero,role:"Attack"},{...item,role:"Defence"}],description:weapon+" · "+count+" dice · Skulls hit"+(state.movement.started?". Ends movement.":"")});
    };
    message(hero.name+" attacks "+item.name+".");
    playPresentation(()=>view?.animateAttack(hero.id,item.id),show);
  }
  function requestMovementRoll() {
    context.close();dicePrompt={type:"movement"};
    const count=projection.activeHero.effects.swiftWind?4:2;
    diceTray.show({id:"movement-ready",kind:"movement",count,title:"Movement",kicker:projection.activeHero.owner+" · "+projection.activeHero.name,figures:[{...projection.activeHero,role:"Movement"}],description:count+" red dice",automatic:true,autoRollDelay:0,rolled:false});
  }
  function rollDice() {
    if(dicePrompt){animateDice=true;return dispatch(dicePrompt.type==="movement"?{type:"ROLL_MOVEMENT"}:{type:"ATTACK",targetId:dicePrompt.targetId});}
    if(!diceProgress||diceProgress.rolled)return false;
    // Combat outcomes already belong to the saved engine report. Roll reveals
    // and animates that stage; it never resolves another attack or defence.
    diceProgress.rolled=true;animateDice=true;persist();render();return true;
  }
  function presentDice() {
    const animate=animateDice;animateDice=false;
    if(screen==="movement") {
      diceTray.show({id:"movement-"+state.round+"-"+state.turnIndex,kind:"movement",count:state.movement.dice.length,title:"Movement",kicker:projection.activeHero.owner+" · "+projection.activeHero.name,figures:[{...projection.activeHero,role:"Movement"}],description:state.movement.dice.length+" red dice",automatic:false,rolled:true,results:state.movement.dice,animate,continueLabel:"Continue →"});return;
    }
    if(diceProgress.stage==="spell") {
      const report=state.lastReport,actors=[...state.heroes,...state.monsters];
      const automatic=report.rollRole!=="hero";
      diceTray.show({id:"spell-"+report.id,kind:"movement",resultFormat:"faces",count:report.redDice.length,title:report.defenderName+" · "+HQ.spellData.byId[report.spellId].name,kicker:automatic?"ZARGON’S ROLL":"HERO’S ROLL",automatic,rolled:diceProgress.rolled,results:report.redDice,animate,
        figures:actors.filter(actor=>[report.attackerId,report.defenderId].includes(actor.id)),description:report.rollDescription,continueLabel:"View outcome →"});return;
    }
    const report=state.lastReport,attack=diceProgress.stage==="attack",actor=attack?report.attackerName:report.defenderName;
    const automatic=attack?report.attackerSide==="monster":report.attackerSide==="hero",results=attack?report.attackDice:report.defendDice;
    const actors=[...state.heroes,...state.monsters],figures=[[report.attackerId,"Attack"],[report.defenderId,"Defence"]].map(([id,role])=>{const figure=actors.find(f=>f.id===id);return figure?{...figure,role}:null;}).filter(Boolean);
    diceTray.show({id:"combat-"+report.id+"-"+diceProgress.stage,kind:"combat",count:results.length,title:actor+" · "+(attack?"Attack":"Defence"),kicker:automatic?"ZARGON’S ROLL":"HERO’S ROLL",automatic,rolled:diceProgress.rolled,results,animate,
      figures,description:results.length+" dice · "+(attack?"Skulls hit":(report.shield==="white-shield"?"White":"Black")+" shields block "+report.skulls+" hit"+(report.skulls===1?"":"s")),
      continueLabel:attack&&report.defendDice.length?"Defence roll →":"View outcome →"});
  }
  function continueDice() {
    if(screen==="movement"){diceTray.close();screen=null;persist();render();$("board-canvas").focus({preventScroll:true});return;}
    if(!diceProgress)return;
    if(diceProgress.stage==="attack"&&state.lastReport.defendDice.length){diceProgress.stage="defence";diceProgress.rolled=false;persist();render();return;}
    diceTray.close();diceProgress=null;persist();render();
  }
  function openCell(id) {
    if(boardChoice?.pick({type:"cell",id}))return;
    if(!state||state.pending||moving||!projection.discoveredCells.includes(id)&&!(projection.blindMovement&&T.floor.has(id)))return;
    const point=view.setSelection({type:"cell",id});
    const known=projection.discoveredCells.includes(id),rock=T.magic(state,projection.activeHero,"passThroughRock");
    const stair=T.stairs.has(id),actions=[moveOption(id)];
    if(stair)actions.push({label:"Leave dungeon",disabled:Boolean(HQ.quest.exitReason(state,projection.activeHero)),reason:HQ.quest.exitReason(state,projection.activeHero)||"",run:async()=>{if(await HQ.questUI.confirmExit(state))dispatch({type:"EXIT_QUEST"});}});
    context.show({name:known?"Tile":"Unexplored space",kind:rock?"PASS THROUGH ROCK":stair?"STAIRWAY":"DUNGEON SQUARE",description:rock?"Pass through any object. Reach a free playable square before your last move or ending your turn.":stair?"Movement within the stairs is free while you have movement remaining.":T.blocked.has(id)?HQ.pieces.blocked.description:"A square of explored dungeon floor.",actions},point);
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
    if(!state||state.pending||moving||item.type==="wall")return;
    const point=view.setSelection({type:"piece",id:item.id}),actions=[];let details="";
    if(item.type==="monster") {
      details="Attack "+item.attack+" · Defend "+HQ.combat.defence(item)+" · Move "+item.movement+(item.effects.sleep?" · Asleep":"");
      actions.push(proximityAction(item,{label:"Attack",ready:()=>projection.attackTargets.some(m=>m.id===item.id),
        blocked:state.actionUsed?"Your action has already been used this turn.":"",
        accept:id=>{const [x,row]=T.parse(id);return HQ.combat.adjacent(state,{...projection.activeHero,x,row},item);},run:()=>requestAttack(item)}));
    } else if(item.type==="door") {
      actions.push(proximityAction(item,{label:"Open door",ready:()=>projection.adjacentDoors.some(d=>d.id===item.id),
        blocked:item.open?"This door is already open and stays open.":"",reason:"Opening a door is free.",run:()=>dispatch({type:"OPEN_DOOR",id:item.id})}));
    } else if(item.type==="hero") {
      details=item.owner+" · Attack "+HQ.combat.attack(item)+" · Defend "+HQ.combat.defence(item)+(item.effects.rockSkin?" · Rock Skin":"")+(item.effects.courage?" · Courage":"");
    }
    if(item.type==="monster"&&item.effects.tempest)details+=" · Tempest";
    if(["hero","monster","door"].includes(item.type)&&HQ.spells.isCaster(projection.activeHero))actions.push({label:"Cast spell",disabled:!projection.spellTargets.includes(item.id),
      reason:state.actionUsed?"Your action has already been used this turn.":projection.spellTargets.includes(item.id)?"Choose a spell for this miniature.":"No available spell can target this miniature.",run:()=>{context.close();spellbook.show(item.id);}});
    if(item.kind==="stairs")actions.push(proximityAction(item,{label:"Leave dungeon",ready:()=>!HQ.quest.exitReason(state,projection.activeHero),
      run:async()=>{if(await HQ.questUI.confirmExit(state))dispatch({type:"EXIT_QUEST"});}}));
    actions.push(modelMoveOption(item));
    actions.push({label:"Centre view",run:()=>view.focusPiece(item.id)});
    context.show({name:item.type==="door"?(item.open?"Open door":"Closed door"):item.name||title(item.kind),kind:item.type==="hero"?"HERO":item.type==="monster"?"MONSTER":"DUNGEON SCENERY",
      figure:item.type==="hero"||item.type==="monster"?item:null,description:item.type==="door"?"A stone-framed doorway connects two areas of the dungeon.":HQ.pieces[item.kind]?.description||"A revealed piece of dungeon scenery.",details,actions},point);
    const destination=actions.find(action=>!action.disabled&&action.destination)?.destination;
    if(destination)previewRoute(destination,true);else selectedRoute=null;
  }
  try {view=HQ.createTabletop({onCell:openCell,onPiece:openPiece,onDismiss:()=>boardChoice?.active?boardChoice.cancel():context.close(),onAnchor:point=>context.position(point),onHover:ref=>boardChoice?.active?boardChoice.hover(ref):previewRoute(ref?.type==="cell"?ref.id:selectedRoute)});boardChoice=HQ.createBoardChoice({view});}
  catch(error) {
    const p=document.createElement("p");p.className="hq-callout";p.setAttribute("role","alert");p.textContent="The 3D board could not start. A browser with WebGL 2 is required. "+error.message;$("setup-form").prepend(p);$("start-adventure").disabled=true;
    $("loading-message").textContent="The 3D board could not start.";
  }
  const partyUI=HQ.createPartySetup({onFocus:id=>view?.focusHero(id)});
  function replaceSandbox(next) {
    if(moving||boardChoice?.active||!HQ.sandbox.active)return;
    document.querySelectorAll("dialog[open]").forEach(dialog=>dialog.close());diceTray.close();view?.resetCombatCamera();
    state=next;screen=null;diceProgress=null;dicePrompt=null;animateDice=false;partyUI.restore(state.heroes);render();view?.centre();persist();
  }
  if(HQ.sandbox.active&&view)sandboxUI=HQ.sandbox.attach({getState:()=>state,replace:replaceSandbox,choose:options=>boardChoice.choose(options),onCpu(){
    if(!state||moving)return;const next=JSON.parse(JSON.stringify(state));HQ.sandbox.turn(next,next.heroes.at(-1).id);replaceSandbox(next);dispatch({type:"END_TURN"});
  }});
  $("quest-briefing").textContent=Q.briefing;
  function render({preserveCamera=false}={}) {
    $("restart-game").disabled=moving;
    selectedRoute=null;previewPaths=null;
    context.close();updateBoard({preserveCamera});view?.setInteractive(state.phase==="hero-turn"&&!state.pending&&!moving);
    const hero=projection.activeHero,name=E.heroNames.get(hero.id);
    HQ.adventureHUD.render(state,projection);
    const latest=state.log[state.log.length-1]?.text||"Choose your next move.";message(latest);
    saveStatus();partyUI.render(state);
    if(screen==="movement"||state.pending?.type==="report"&&diceProgress){presentDice();}
    else if(state.pending?.type==="report"||state.pending?.type==="monster-intro"){HQ.combatUI.render(state);D.show("combat-dialog");}
    else if(HQ.quest.isEnded(state.phase))HQ.questUI.showOutcome(state);
    else if(state.pending?.type==="handoff") {
      $("handoff-heading").textContent="Your turn, "+hero.owner;
      $("handoff-description").textContent=name;
      HQ.portraits.set($("handoff-portrait"),[hero]);
      $("handoff-round").textContent="ROUND "+state.round+" · "+name.toUpperCase();D.show("handoff-dialog");
    }
  }
  function startAdventure(config) {
    if(!view||moving)return;
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
  $("begin-turn").addEventListener("click",()=>{screen=null;persist();D.close("briefing-dialog");message("Roll movement for the "+E.heroNames.get(E.active(state).id)+", then click a square to see its actions.");});
  $("continue-combat").addEventListener("click",()=>{
    if(moving)return;const intro=state.pending?.type==="monster-intro";D.close("combat-dialog");
    if(intro)dispatch({type:"RESOLVE_MONSTER"});
    else dispatch({type:"ACK_REPORT"});
  });
  $("retry-adventure").addEventListener("click",()=>{D.close("quest-outcome-dialog");if(sandboxUI)sandboxUI.show();else D.show("setup-dialog");});
  $("roll-movement").addEventListener("click",requestMovementRoll);
  $("open-spellbook").addEventListener("click",()=>{if(!moving&&state?.phase==="hero-turn"&&!state.pending){context.close();spellbook.show();}});
  $("end-turn").addEventListener("click",()=>dispatch({type:"END_TURN"}));
  $("ready-hero").addEventListener("click",()=>{D.close("handoff-dialog");dispatch({type:"ACK_HANDOFF"});view?.centre();});
  $("menu-button").addEventListener("click",()=>{if(state)D.show("menu-dialog");else D.show("setup-dialog");});
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
    if(restartMode==="restart")startAdventure({heroIds:state.heroes.map(hero=>hero.id),owners:Object.fromEntries(state.heroes.map(hero=>[hero.id,hero.owner])),realisticLOS:state.settings.realisticLOS,
      ...(state.heroes.filter(HQ.spells.isCaster).every(hero=>hero.spellGroups.length)?{spellGroups:Object.fromEntries(state.heroes.filter(HQ.spells.isCaster).map(hero=>[hero.id,hero.spellGroups]))}:{})});
    else {$("setup-realistic-los").checked=state.settings.realisticLOS;D.show("setup-dialog");}
  });
  $("setting-realistic-los").addEventListener("change",event=>dispatch({type:"SET_REALISTIC_LOS",enabled:event.target.checked}));
  $("setting-grid").addEventListener("change",event=>{view?.setGrid(event.target.checked);persist();});
  $("wall-mode").addEventListener("click",()=>{view?.cycleWallMode();persist();});
  $("dynamic-lighting").addEventListener("click",()=>{if(view){view.setTorchLighting(!view.snapshot().torchLightingEnabled);persist();}});
  $("setting-light-level").addEventListener("input",event=>view?.setAmbientLightLevel(event.target.valueAsNumber));
  $("setting-light-level").addEventListener("change",persist);
  $("centre-hero").addEventListener("click",()=>view?.centre());$("view-explored").addEventListener("click",()=>view?.explored());
  $("zoom-in").addEventListener("click",()=>view?.zoom(1.2));$("zoom-out").addEventListener("click",()=>view?.zoom(1/1.2));
  $("view-tabletop").addEventListener("click",()=>view?.view(false));$("view-overhead").addEventListener("click",()=>view?.view(true));
  window.addEventListener("pagehide",persist);
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")persist();});
  const saved=S.load();
  if(saved.snapshot&&view) {
    state=saved.snapshot.state;screen=saved.snapshot.screen;diceProgress=saved.snapshot.dice;
    // Refill setup so New adventure begins with the current players/choices.
    partyUI.restore(state.heroes);
    try {
      render();view.restore(saved.snapshot.view);
      const settings=view.snapshot();$("setting-grid").checked=settings.gridEnabled;
      if(screen==="briefing")D.show("briefing-dialog");
      // A refresh can land between acknowledging one result and resolving the
      // next activation. Continue that recorded queue without replaying a turn.
      else if(state.phase==="monster-turn"&&!state.pending)dispatch({type:"RESOLVE_MONSTER"});
    } catch(error) {
      state=null;screen=null;diceProgress=null;diceTray.close();document.querySelectorAll("dialog[open]").forEach(dialog=>dialog.close());
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

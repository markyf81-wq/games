(function () {
  "use strict";
  const HQ=window.HeroQuest,E=HQ.exploration,T=HQ.topology,Q=HQ.trial,D=HQ.dialogs,S=HQ.sessionStorage;
  if(new URLSearchParams(window.location.search).get("inspect")==="barbarian") {window.location.replace("studio.html?inspect=barbarian");return;}
  const $=id=>document.getElementById(id);let state=null,projection=null,view=null,moving=false,screen=null,saveError="",diceProgress=null,dicePrompt=null,animateDice=false;
  let selectedRoute=null,previewPaths=null,restartMode="new";
  const title=kind=>({"alchemists-bench":"Alchemist’s bench","sorcerers-table":"Sorcerer’s table","torture-rack":"Torture rack","weapons-rack":"Weapons rack",bookcase:"Bookcase",stairs:"Stairway",table:"Wooden table",chest:"Treasure chest",throne:"Throne",fireplace:"Fireplace",tomb:"Fellmarg’s Tomb",blocked:"Blocked square"}[kind]||kind);
  const message=(text,error=false)=>{$("adventure-message").textContent=text;$("adventure-message").classList.toggle("is-error",error);};
  const context=HQ.createContextPanel({onClose(){selectedRoute=null;view?.setSelection(null);}});
  const diceTray=HQ.createDiceTray({onRoll:rollDice,onContinue:continueDice,onCancel(){dicePrompt=null;render();}});
  function saveStatus() {
    $("session-footer").textContent="The Trial · "+(saveError||"Autosaved in this browser");
    $("session-footer").classList.toggle("is-error",Boolean(saveError));
  }
  function persist() {
    if(!state)return;
    saveError=S.save({state,screen,dice:diceProgress,view:view?.snapshot()||null});saveStatus();
  }
  function defeatedFigure() {
    return state.pending?.type==="report"&&state.lastReport?.type==="combat"&&state.lastReport.defeated
      ? [...state.heroes,...state.monsters].find(figure=>figure.id===state.lastReport.defenderId):null;
  }
  function updateBoard() {
    projection=E.project(state);
    const report=state.pending?.type==="report"&&state.lastReport?.type==="combat"?state.lastReport:null;
    const cutawayHero=report?.attackerSide==="monster"?state.heroes.find(hero=>hero.id===report.defenderId):projection.activeHero;
    view?.setProjection(projection,{defeatedFigure:defeatedFigure(),cutawayHero});
  }
  function playPresentation(play,complete) {
    moving=true;context.close();view?.setInteractive(false);
    for(const id of ["roll-movement","end-turn","menu-button","model-viewer-button","restart-game"])$(id).disabled=true;
    $("board-canvas").setAttribute("aria-busy","true");
    // Presentation failure must not strand a resolved command or lock input.
    Promise.resolve().then(play).catch(()=>{}).then(()=>{
      moving=false;$("menu-button").disabled=false;$("model-viewer-button").disabled=false;$("restart-game").disabled=!state;$("board-canvas").setAttribute("aria-busy","false");
      try{complete();}catch(error){message("The board could not update. "+error.message,true);}
    });
  }
  function dispatch(command) {
    if(moving)return false;
    const previousReport=state?.lastReport,removal=command.type==="ACK_REPORT"&&previousReport?.type==="combat"&&previousReport.defeated?previousReport:null,result=E.applyCommand(state,command);
    if(!result.ok){message(result.message,true);return false;}
    context.close();
    state=result.state;screen=command.type==="ROLL_MOVEMENT"?"movement":null;dicePrompt=null;
    if(command.type==="ACK_REPORT")diceProgress=null;
    const newCombat=state.pending?.type==="report"&&state.lastReport.type==="combat"&&state.lastReport.id!==previousReport?.id;
    if(newCombat)
      diceProgress={reportId:state.lastReport.id,stage:"attack",rolled:command.type==="ATTACK"};
    // Persist resolved outcomes before any animation or result dialog. Refreshing
    // during presentation must never replay a move, activation, damage or roll.
    persist();
    const complete=()=>{
      render();persist();
      // ACK_REPORT has already advanced the authoritative queue/turn, if due.
      // Resume its next activation only after the acknowledged piece is removed.
      if(command.type==="ACK_REPORT"&&state.phase==="monster-turn"&&!state.pending)dispatch({type:"RESOLVE_MONSTER"});
    };
    const cpuAttack=newCombat&&command.type==="RESOLVE_MONSTER";
    if(view&&(result.motion?.path.length||cpuAttack||removal)) {
      if(result.motion?.path.length)message([...state.heroes,...state.monsters].find(actor=>actor.id===result.motion.actorId).name+" is moving…");
      else if(removal)message(removal.defenderName+" is defeated.");
      playPresentation(async()=>{
        // Keep the old discoveries until the movement reaches its endpoint.
        if(result.motion?.path.length)await view.animateMovement(result.motion);
        if(cpuAttack){updateBoard();await view.animateAttack(state.lastReport.attackerId,state.lastReport.defenderId);}
        if(removal)await view.animateDefeat(removal.defenderId,removal.attackerId);
      },complete);
      return true;
    }
    try{complete();}catch(error){message("The board could not update. "+error.message,true);return false;}
    return true;
  }
  const descriptions={
    stairs:"The stairway connects these catacombs to the world above.",torch:"An iron wall sconce holds a torch that casts warm light into the room.",bookcase:"A tall wooden bookcase stands against the dungeon wall.",
    "weapons-rack":"Weapons hang from this wooden rack.","alchemists-bench":"Bottles and instruments cover this alchemist’s workbench.",
    "sorcerers-table":"A sorcerer’s table holds the tools of arcane study.","torture-rack":"A heavy wooden rack occupies this part of the dungeon.",
    table:"A sturdy wooden table takes up several floor squares.",chest:"A closed treasure chest rests on the dungeon floor.",
    throne:"An imposing throne stands in the chamber.",fireplace:"A stone fireplace is built into the room’s edge.",
    tomb:"A heavy stone tomb rests in this chamber.",blocked:"Fallen stone blocks passage through this square.",
    barbarian:"The Barbarian relies on strength and his broadsword in battle.",dwarf:"The Dwarf is a hardy warrior armed with a shortsword.",
    elf:"The Elf combines swordsmanship with knowledge of magic.",wizard:"The Wizard relies on magic and carries a small dagger.",
    orc:"A brutish Orc watches for intruders in the catacombs.",goblin:"A nimble Goblin lurks in the dungeon.",
    skeleton:"An animated skeleton guards this stretch of the catacombs.",zombie:"A shambling Zombie wanders the dungeon.",
    mummy:"An ancient Mummy guards the catacombs.",fimir:"A one-eyed Fimir stalks the dungeon halls.",
    "chaos-warrior":"A heavily armoured Chaos Warrior stands ready for battle.",gargoyle:"A fearsome Gargoyle guards the depths of the catacombs."
  };
  function movementReason(id) {
    if(state.phase!=="hero-turn"||state.pending)return "Wait for your hero’s turn.";
    if(T.blocked.has(id))return "This square is blocked by stone.";
    if(projection.furniture.some(f=>f.kind!=="stairs"&&T.furniture.get(id)===f.id))return "Furniture blocks this square.";
    const hero=projection.activeHero;if(id===T.key(hero.x,hero.row))return "Your hero is already here.";
    if(projection.heroes.some(h=>h.id!==hero.id&&T.key(h.x,h.row)===id)&&!T.stairs.has(id))return "Another hero occupies this square.";
    if(Object.values(state.monsterMemory).some(m=>T.key(m.x,m.row)===id))return "A known monster position blocks this square.";
    if(state.movement.closed)return "Movement ended when you attacked after moving.";
    if(projection.reachable.includes(id))return "";
    if(!state.movement.rolled)return "Roll movement in the sidebar first.";
    if(!projection.reachable.includes(id))return "No known route within your remaining movement.";
    return "";
  }
  function moveOption(id,label="Move here") {
    const reason=movementReason(id);return {label,destination:id,primary:true,disabled:Boolean(reason),reason,run:()=>dispatch({type:"MOVE",to:id})};
  }
  function modelMoveOption(item) {
    const hero=projection.activeHero;
    if((item.kind==="stairs"||item.type==="hero"&&T.stairs.has(T.key(item.x,item.row)))&&T.stairs.has(T.key(hero.x,hero.row)))return {label:"Move here",primary:true,disabled:true,reason:"Your hero is already on the shared stairway space."};
    if(item.kind==="blocked"||item.type==="hero"&&item.id===hero.id)return moveOption(T.key(item.x,item.row));
    const routes=T.routes(state,hero),reachable=new Set(projection.reachable);
    const destinations=T.approachCells(item,item.type,state).filter(id=>reachable.has(id));
    const occupiedAnchor=id=>T.stairs.has(id)&&projection.heroes.some(h=>h.id!==hero.id&&T.key(h.x,h.row)===id)?1:0;
    const from=T.key(hero.x,hero.row);destinations.sort((a,b)=>T.routeCost(from,routes.get(a))-T.routeCost(from,routes.get(b))||occupiedAnchor(a)-occupiedAnchor(b)||routes.get(a).length-routes.get(b).length);
    if(destinations.length) {
      const option=moveOption(destinations[0]);
      option.reason=item.kind==="stairs"?"Move onto the stairway.":item.type==="door"?"Move to a free square beside this door.":"Move to a free square beside this model.";
      return option;
    }
    const reason=state.phase!=="hero-turn"||state.pending?"Wait for your hero’s turn.":state.movement.closed?"Movement ended when you attacked after moving.":!state.movement.rolled?"Roll movement in the sidebar first.":state.movement.remaining<=0?"No movement remaining.":"No known route to this model within your remaining movement.";
    return {label:"Move here",primary:true,disabled:true,reason};
  }
  function requestAttack(item) {
    if(moving||!projection.attackTargets.some(target=>target.id===item.id))return;
    const hero=projection.activeHero,weapon=HQ.combatData.weapons[hero.weapon].name;
    const show=()=>{
      render();persist();dicePrompt={type:"attack",targetId:item.id};
      diceTray.show({id:"attack-ready-"+item.id,kind:"combat",count:hero.attack,title:hero.name+" attacks "+item.name,kicker:hero.owner+" · ATTACK",automatic:false,rolled:false,cancellable:true,
        figures:[{...hero,role:"Attack"},{...item,role:"Defence"}],description:weapon+" · "+hero.attack+" dice · Skulls hit"+(state.movement.started?". Ends movement.":"")});
    };
    message(hero.name+" attacks "+item.name+".");
    playPresentation(()=>view?.animateAttack(hero.id,item.id),show);
  }
  function requestMovementRoll() {
    context.close();dicePrompt={type:"movement"};
    diceTray.show({id:"movement-ready",kind:"movement",count:2,title:"Movement",kicker:projection.activeHero.owner+" · "+projection.activeHero.name,figures:[{...projection.activeHero,role:"Movement"}],description:"2 red dice",automatic:false,rolled:false,cancellable:true});
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
      diceTray.show({id:"movement-"+state.round+"-"+state.turnIndex,kind:"movement",count:2,title:"Movement",kicker:projection.activeHero.owner+" · "+projection.activeHero.name,figures:[{...projection.activeHero,role:"Movement"}],description:"2 red dice",automatic:false,rolled:true,results:state.movement.dice,animate,continueLabel:"Continue →"});return;
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
    if(!state||state.pending||moving||!projection.discoveredCells.includes(id))return;
    if(T.stairs.has(id)){const stairs=projection.furniture.find(f=>f.kind==="stairs");if(stairs){openPiece({...stairs,type:"furniture"});return;}}
    const [x,row]=T.parse(id),point=view.setSelection({type:"cell",id});
    context.show({name:"Column "+(x+1)+", row "+(row+1),kind:"DUNGEON SQUARE",description:T.blocked.has(id)?descriptions.blocked:"A square of explored dungeon floor.",actions:[moveOption(id)]},point);
    previewRoute(id,true);
  }
  function previewRoute(id,select=false) {
    if(select)selectedRoute=id;
    if(!id||!state||moving||state.phase!=="hero-turn"||state.pending||!projection.discoveredCells.includes(id)){view?.setRoutePreview(null);return;}
    const hero=projection.activeHero;
    if(!previewPaths)previewPaths=T.routes(state,hero,{budget:HQ.board.columns*HQ.board.rows});
    const path=previewPaths.get(id);
    view?.setRoutePreview(path?{cells:[T.key(hero.x,hero.row),...path],reachable:projection.reachable.includes(id)}:null);
  }
  function openPiece(item) {
    if(!state||state.pending||moving||item.type==="wall")return;
    const point=view.setSelection({type:"piece",id:item.id}),actions=[];let details="";
    if(item.type==="monster") {
      details="Body "+item.body+" / "+item.maxBody+" · Attack "+item.attack+" · Defend "+item.defend+" · Move "+item.movement;
      const canAttack=projection.attackTargets.some(m=>m.id===item.id);
      const reason=canAttack?"":state.actionUsed?"Your attack has already been used this turn.":"Move directly beside this monster across an open edge.";
      actions.push({label:"Attack",primary:true,disabled:!canAttack,reason,run:()=>requestAttack(item)});
    } else if(item.type==="door") {
      const canOpen=projection.adjacentDoors.some(d=>d.id===item.id);
      actions.push({label:"Open door",primary:true,disabled:!canOpen,reason:item.open?"This door is already open and stays open.":canOpen?"Opening a door is free.":"Move beside this door to open it.",run:()=>dispatch({type:"OPEN_DOOR",id:item.id})});
    } else if(item.type==="hero") {
      details=item.owner+" · Body "+item.body+" / "+item.maxBody+" · Attack "+item.attack+" · Defend "+item.defend;
    }
    actions.push(modelMoveOption(item));
    actions.push({label:"Centre view",run:()=>view.focusPiece(item.id)});
    context.show({name:item.type==="door"?(item.open?"Open door":"Closed door"):item.name||title(item.kind),kind:item.type==="hero"?"HERO":item.type==="monster"?"MONSTER":"DUNGEON SCENERY",
      figure:item.type==="hero"||item.type==="monster"?item:null,description:item.type==="door"?"A stone-framed doorway connects two areas of the dungeon.":descriptions[item.kind]||"A revealed piece of dungeon scenery.",details,actions},point);
    const destination=actions.find(action=>action.label==="Move here")?.destination;
    if(destination)previewRoute(destination,true);else selectedRoute=null;
  }
  try {view=HQ.createTabletop({onCell:openCell,onPiece:openPiece,onDismiss:()=>context.close(),onAnchor:point=>context.position(point),onHover:ref=>previewRoute(ref?.type==="cell"?ref.id:selectedRoute)});}
  catch(error) {
    const p=document.createElement("p");p.className="hq-callout";p.setAttribute("role","alert");p.textContent="The 3D board could not start. A browser with WebGL 2 is required. "+error.message;$("setup-form").prepend(p);$("start-adventure").disabled=true;
    $("loading-message").textContent="The 3D board could not start.";
  }
  const playerFields=[];
  const playerCount=()=>Number($("player-count").value);
  const playerName=index=>playerFields[index].input.value.trim()||"Player "+(index+1);
  function updateSetupPlayers() {
    const count=playerCount();
    for(const [i,field] of playerFields.entries()) {
      field.label.hidden=i>=count;field.input.disabled=i>=count;
      field.heroLabel.hidden=i>=count;field.select.disabled=i>=count;
      field.heroText.textContent=playerName(i)+"’s hero";
    }
  }
  for(let i=0;i<4;i++) {
    const label=document.createElement("label");label.className="hq-field";
    const text=document.createElement("span");text.textContent="Player "+(i+1);
    const input=document.createElement("input");input.id="player-name-"+(i+1);input.name=input.id;input.maxLength=24;input.value=text.textContent;input.autocomplete="off";
    input.addEventListener("input",updateSetupPlayers);
    label.append(text,input);$("player-fields").append(label);
    const heroLabel=document.createElement("label");heroLabel.className="hq-field";
    const heroText=document.createElement("span"),select=document.createElement("select"),portrait=document.createElement("span");portrait.className="setup-hero-portrait";select.id="player-hero-"+(i+1);select.name=select.id;
    for(const hero of HQ.heroes) {
      const option=document.createElement("option");option.value=hero.id;option.textContent=hero.name;select.append(option);
    }
    select.value=HQ.heroes[i].id;portrait.append(HQ.portraits.image(select.value,HQ.heroes[i].name));heroLabel.classList.add("hero-choice");heroLabel.append(heroText,portrait,select);$("hero-fields").append(heroLabel);
    const field={label,input,heroLabel,heroText,select,portrait,heroId:select.value};playerFields.push(field);
    select.addEventListener("change",()=>{
      // Swap an existing choice rather than ever duplicating a character.
      const other=playerFields.find(p=>p!==field&&p.heroId===select.value);
      if(other){other.select.value=field.heroId;other.heroId=field.heroId;}
      field.heroId=select.value;
      for(const choice of [field,other].filter(Boolean))choice.portrait.replaceChildren(HQ.portraits.image(choice.heroId,E.heroNames.get(choice.heroId)));
    });
  }
  $("player-count").addEventListener("change",updateSetupPlayers);
  updateSetupPlayers();
  $("quest-briefing").textContent=Q.briefing;
  function renderParty() {
    $("party-list").replaceChildren();
    for(const [i,h] of (state?.heroes||HQ.heroes).entries()) {
      const button=document.createElement("button");button.type="button";button.className="party-button";
      const isActive=state&&state.phase==="hero-turn"&&h.id===E.active(state).id;button.setAttribute("aria-current",String(Boolean(isActive)));
      button.setAttribute("aria-label","Centre "+E.heroNames.get(h.id)+(h.owner?", controlled by "+h.owner:""));
      const n=document.createElement("span");n.className="turn-number";n.textContent=String(i+1);
      const copy=document.createElement("span"),name=document.createElement("strong"),owner=document.createElement("small");name.textContent=E.heroNames.get(h.id);owner.textContent=h.owner||"Choose a player";copy.append(name,owner);
      if(state){const health=document.createElement("small");health.className="hero-health";health.textContent=h.body>0?"Body "+h.body+" / "+h.maxBody:"Fallen";copy.append(health);}
      const mark=document.createElement("span");mark.className="active-mark";mark.textContent=isActive?"◆":"";mark.setAttribute("aria-hidden","true");button.append(n,HQ.portraits.image(h.kind||h.id,E.heroNames.get(h.id)),copy,mark);
      button.disabled=!state||h.body===0;button.addEventListener("click",()=>view?.focusHero(h.id));$("party-list").append(button);
    }
  }
  function render() {
    $("restart-game").disabled=moving;
    selectedRoute=null;previewPaths=null;
    context.close();updateBoard();view?.setInteractive(state.phase==="hero-turn"&&!state.pending&&!moving);
    const hero=projection.activeHero,name=E.heroNames.get(hero.id),pending=Boolean(state.pending);
    const heroTurn=state.phase==="hero-turn";
    HQ.portraits.set($("active-portrait"),heroTurn?[hero]:[]);
    $("active-name").textContent=heroTurn?name:state.phase==="defeat"?"Party defeated":"Zargon";$("active-owner").textContent=heroTurn?hero.owner:"COMPUTER";$("round-label").textContent="ROUND "+state.round;
    HQ.dieFaces.numbered($("die-one"),state.movement.dice[0]);HQ.dieFaces.numbered($("die-two"),state.movement.dice[1]);
    $("movement-remaining").textContent=!heroTurn?"Heroes are waiting":state.movement.closed?"Movement finished":state.movement.rolled?state.movement.remaining+" remaining":"Ready to roll";
    $("dice-description").textContent=state.movement.rolled?state.movement.dice.join(" + "):"";
    $("roll-movement").disabled=pending||!heroTurn||state.movement.rolled||state.movement.closed;$("end-turn").disabled=pending||!heroTurn;
    $("hero-combat-stats").replaceChildren();$("hero-combat-stats").hidden=!heroTurn;
    if(heroTurn){for(const text of ["Body "+hero.body+" / "+hero.maxBody,"Mind "+hero.mind,"Attack "+hero.attack+" dice","Defend "+hero.defend+" dice"]){const span=document.createElement("span");span.textContent=text;$("hero-combat-stats").append(span);}const weapon=document.createElement("span");weapon.className="weapon-name";weapon.textContent=HQ.combatData.weapons[hero.weapon].name+" · Melee";$("hero-combat-stats").append(weapon);}
    $("action-status").textContent=!heroTurn?"":state.actionUsed?"Attack used":"Attack available";
    $("setting-realistic-los").checked=state.settings.realisticLOS;
    $("discovery-label").textContent=projection.discoveredRooms+" room"+(projection.discoveredRooms===1?"":"s")+" explored";
    // Do not display the hidden map's room/monster counts as a progress target.
    $("event-log").replaceChildren();for(const event of state.log.slice(-9).reverse()){const li=document.createElement("li");li.textContent=event.text;$("event-log").append(li);}
    const latest=state.log[state.log.length-1]?.text||"Choose your next move.";message(latest);
    saveStatus();renderParty();
    if(screen==="movement"||state.pending?.type==="report"&&diceProgress){presentDice();}
    else if(state.pending?.type==="report"||state.pending?.type==="monster-intro"){HQ.combatUI.render(state);D.show("combat-dialog");}
    else if(state.phase==="defeat")D.show("defeat-dialog");
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
    const players=playerFields.slice(0,playerCount()),heroIds=players.map(p=>p.select.value);
    const owners=Object.fromEntries(players.map((p,i)=>[p.select.value,playerName(i)]));
    startAdventure({heroIds,owners,realisticLOS:$("setup-realistic-los").checked});
  });
  $("begin-turn").addEventListener("click",()=>{screen=null;persist();D.close("briefing-dialog");message("Roll movement for the "+E.heroNames.get(E.active(state).id)+", then click a square to see its actions.");});
  $("continue-combat").addEventListener("click",()=>{
    if(moving)return;const intro=state.pending?.type==="monster-intro";D.close("combat-dialog");
    if(intro)dispatch({type:"RESOLVE_MONSTER"});
    else dispatch({type:"ACK_REPORT"});
  });
  $("retry-adventure").addEventListener("click",()=>{D.close("defeat-dialog");D.show("setup-dialog");});
  $("roll-movement").addEventListener("click",requestMovementRoll);
  $("end-turn").addEventListener("click",()=>dispatch({type:"END_TURN"}));
  $("ready-hero").addEventListener("click",()=>{D.close("handoff-dialog");dispatch({type:"ACK_HANDOFF"});view?.centre();});
  $("menu-button").addEventListener("click",()=>{if(state)D.show("menu-dialog");else D.show("setup-dialog");});
  $("open-help").addEventListener("click",()=>{D.close("menu-dialog");D.show("help-dialog");});
  function requestRestart(mode) {
    if(!state||moving)return;
    restartMode=mode;context.close();D.close("menu-dialog");
    $("confirm-heading").textContent=mode==="restart"?"Restart The Trial?":"Gather a new party?";
    $("confirm-restart").textContent=mode==="restart"?"Restart":"New adventure";D.show("confirm-dialog");
  }
  $("restart-game").addEventListener("click",()=>requestRestart("restart"));
  $("restart-adventure").addEventListener("click",()=>requestRestart("new"));
  $("confirm-restart").addEventListener("click",()=>{
    D.close("confirm-dialog");
    if(restartMode==="restart")startAdventure({heroIds:state.heroes.map(hero=>hero.id),owners:Object.fromEntries(state.heroes.map(hero=>[hero.id,hero.owner])),realisticLOS:state.settings.realisticLOS});
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
    const choices=[...state.heroes,...HQ.heroes.filter(h=>!state.heroes.some(chosen=>chosen.id===h.id))];
    $("player-count").value=String(state.heroes.length);
    for(const [i,field] of playerFields.entries()) {
      field.heroId=choices[i].id;field.select.value=field.heroId;field.input.value=choices[i].owner||"Player "+(i+1);
    }
    updateSetupPlayers();
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
    renderParty();
    if(saved.error){const p=document.createElement("p");p.className="hq-callout";p.setAttribute("role","alert");p.textContent=saved.error;$("setup-form").prepend(p);}
    D.show("setup-dialog");
  }
})();

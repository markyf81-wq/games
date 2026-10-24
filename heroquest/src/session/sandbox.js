(function () {
  "use strict";
  const HQ=window.HeroQuest,E=HQ.exploration,T=HQ.topology,C=HQ.combat;
  const active=new URLSearchParams(window.location.search).get("sandbox")==="1";
  const freshMove=E.freshMovement;
  function freeCells(state,except=null) {
    return HQ.trial.floor.filter(id=>!T.blockedAt(state,id)&&!T.furniture.has(id)&&!T.monsterAt(state,id,false,except)&&(!T.occupiedHero(state,id,except)||T.stairs.has(id)));
  }
  function nearest(state,figure) {
    const from=C.cell(E.active(state)),[x,row]=T.parse(from);
    return freeCells(state,figure.id).filter(id=>!T.stairs.has(id)).sort((a,b)=>{
      const distance=id=>{const [ax,ar]=T.parse(id);return Math.abs(ax-x)+Math.abs(ar-row);};
      const region=id=>T.regions.get(id)===T.regions.get(from)?0:1;return region(a)-region(b)||distance(a)-distance(b);
    })[0];
  }
  function turn(state,heroId) {
    // Fixture editing may abandon a phasing test mid-object: relocate that
    // actor safely before resetting the authoritative turn/movement flags.
    for(const hero of state.heroes)if(C.inPlay(hero)&&T.unsafe(state,hero)) {
      const cell=nearest(state,hero);if(cell)[hero.x,hero.row]=T.parse(cell);
    }
    state.turnIndex=state.heroes.findIndex(hero=>hero.id===heroId);state.phase="hero-turn";state.pending=null;state.lastReport=null;state.monsterTurn=null;state.actionUsed=false;state.extraAttack=false;state.movement=freshMove();
    state.questRecovery=null;
    for(const figure of state.heroes)if(figure.body>0)figure.deathResolved=false;
    const hero=E.active(state);hero.body=Math.max(1,hero.body);hero.exit=null;hero.trapped=false;hero.actionUsed=false;hero.deathResolved=false;
    state.belongings=state.belongings.filter(loot=>loot.heroId!==hero.id);
    // Abandoning a fixture may remove a bag carrier or move them elsewhere.
    for(const bag of state.belongings)if(bag.carrierId&&!C.inPlay(state.heroes.find(owner=>owner.id===bag.carrierId)))bag.carrierId=null;
  }
  function opponent(state,kind) {
    for(const monster of state.monsters){monster.body=0;monster.diedInPlay=false;monster.effects=HQ.spells.monsterEffects();}
    const monster=state.monsters.find(m=>m.kind===kind);
    if(monster){const cell=nearest(state,monster);[monster.x,monster.row]=T.parse(cell);monster.body=monster.maxBody;}
    state.monsterMemory={};if(monster)state.monsterMemory[monster.id]={id:monster.id,x:monster.x,row:monster.row};
  }
  function create() {
    const seed=new Uint32Array(1);window.crypto.getRandomValues(seed);
    const state=E.createSession({heroIds:HQ.heroes.map(hero=>hero.id),owners:Object.fromEntries(HQ.heroes.map(hero=>[hero.id,"Practice"])),spellGroups:{elf:["Earth"],wizard:["Air","Fire","Water"]}},seed[0]);
    state.discoveredCells=[...HQ.trial.floor];state.discoveredRooms=[...HQ.trial.rooms];state.discoveredDoors=HQ.trial.doors.map(door=>door.id);state.discoveredEntities=[...HQ.trial.furniture,...state.monsters].map(item=>item.id);
    turn(state,"wizard");opponent(state,"orc");state.log=[{id:state.nextEventId++,text:"Gameplay sandbox · Practice freely; your adventure uses a separate save."}];return state;
  }
  function spellScenario(id) {
    const state=create(),card=HQ.spellData.byId[id];turn(state,card.group==="Earth"?"elf":"wizard");
    for(const hero of state.heroes)hero.body=Math.max(1,hero.maxBody-2);
    opponent(state,"orc");
    if(id==="pass-through-rock") {
      const initial=E.createSession({heroIds:HQ.heroes.map(hero=>hero.id)},state.rng);
      state.discoveredCells=initial.discoveredCells;state.discoveredRooms=initial.discoveredRooms;state.discoveredDoors=initial.discoveredDoors;state.discoveredEntities=initial.discoveredEntities;
      // Recompute public discoveries for the actual practice positions only.
      Object.assign(state,E.refreshDiscoveries(state));
    }
    state.log.push({id:state.nextEventId++,text:card.name+" practice · Cast normally from the spellbook."});return state;
  }
  function dungeonScenario(kind,heroId) {
    const state=create();state.dungeon=HQ.dungeon.fresh("practice");turn(state,heroId);
    for(const monster of state.monsters){monster.body=0;monster.diedInPlay=false;}state.monsterMemory={};
    for(const trap of HQ.dungeon.traps(state))if(trap.kind!==kind)state.dungeon.traps[trap.id].status="disarmed";
    const hero=E.active(state),positions={pit:[3,17],spear:[1,17],"falling-block":[0,17],furniture:[16,16],"secret-door":[4,14]};
    [hero.x,hero.row]=positions[kind];hero.body=hero.maxBody;
    if(hero.id!=="dwarf")hero.inventory.items.push({id:"practice-tool-kit-"+hero.id,kind:"tool-kit"});
    state.movement={...freshMove(),rolled:true,dice:[6,6],remaining:12};
    if(kind==="secret-door") {
      state.discoveredCells=[];state.discoveredRooms=[HQ.trial.startingRoom];state.discoveredDoors=[];state.discoveredEntities=[];
    }
    return E.refreshDiscoveries(state);
  }
  function recoveryScenario(mode,heroId){
    const state=create(),spellMode=mode.startsWith("spell");
    turn(state,spellMode&&!["elf","wizard"].includes(heroId)?"wizard":heroId);
    const owner=E.active(state);owner.body=1;owner.inventory.gold=75;[owner.x,owner.row]=[3,16];
    owner.inventory.items=owner.inventory.items.filter(item=>item.kind!=="potion-of-healing");
    owner.actionUsed=state.actionUsed=!["spell","bag"].includes(mode);
    for(const monster of state.monsters){monster.body=0;monster.diedInPlay=false;}
    state.monsterMemory={};
    const room=T.regions.get(C.cell(owner));
    if(mode!=="allies")for(const other of state.heroes.filter(hero=>hero.id!==owner.id)){
      const destination=freeCells(state,other.id).find(id=>!T.stairs.has(id)&&T.regions.get(id)!=="corridor"&&T.regions.get(id)!==room);
      if(destination)[other.x,other.row]=T.parse(destination);
    }
    let command;
    if(mode==="bag")command={type:"SEARCH_TREASURE"};
    else{
      const monster=state.monsters.find(monster=>monster.kind==="orc"),destination=T.neighbors(C.cell(owner)).find(id=>T.connected(C.cell(owner),id,state)&&!T.furniture.has(id)&&!T.occupiedHero(state,id,null));
      if(!destination)return {state,prepared:false};
      [monster.x,monster.row]=T.parse(destination);monster.body=monster.maxBody;
      state.monsterMemory[monster.id]={id:monster.id,x:monster.x,row:monster.row};
      state.phase="monster-turn";state.pending={type:"monster-intro"};state.monsterTurn={queue:[monster.id],index:0,resumeId:null};state.movement=freshMove();
      command={type:"RESOLVE_MONSTER"};
    }
    // Prepare a reproducible ordinary lethal result without committing it.
    // The player still triggers the normal search or Zargon Continue/rolls.
    const base=state.rng;let prepared=false;
    for(let attempt=0;attempt<1024;attempt++){
      state.rng=((base+attempt)>>>0)||1;
      const candidate=E.applyCommand(state,command);
      if(candidate.ok&&candidate.state.lastReport?.defenderId===owner.id&&candidate.state.lastReport.defeated){prepared=true;break;}
    }
    if(!prepared)state.rng=base;
    return {state:E.refreshDiscoveries(state),prepared};
  }
  function attach({getState,replace:install,choose,onCpu,onArmoury}) {
    function replace(prepared){
      // Fresh fixtures reset the board, not the player's selected rules.
      const current=getState();
      if(current)prepared.settings.fairLootRecovery=current.settings.fairLootRecovery;
      install(prepared);
    }
    const dialog=document.createElement("dialog");dialog.id="sandbox-dialog";dialog.className="hq-dialog sandbox-dialog";
    const header=document.createElement("div"),heading=document.createElement("h2"),close=document.createElement("button");header.className="dialog-title-row";heading.id="sandbox-heading";heading.textContent="Gameplay sandbox";dialog.setAttribute("aria-labelledby",heading.id);
    close.type="button";close.className="dialog-close";close.textContent="×";close.setAttribute("aria-label","Close sandbox tools");close.addEventListener("click",()=>HQ.dialogs.close(dialog.id));header.append(heading,close);
    const intro=document.createElement("p");intro.className="hq-muted";intro.textContent="Real base-game rules on a revealed practice board. Your adventure and its save are separate.";
    const fields=document.createElement("div"),actions=document.createElement("div");fields.className="sandbox-fields";actions.className="sandbox-actions";
    function select(label,options) {
      const field=document.createElement("label"),title=document.createElement("span"),input=document.createElement("select");field.className="hq-field";title.textContent=label;
      for(const [value,name] of options){const option=document.createElement("option");option.value=value;option.textContent=name;input.append(option);}field.append(title,input);fields.append(field);return input;
    }
    const hero=select("Hero",HQ.heroes.map(h=>[h.id,h.name])),enemy=select("Opponent",Object.entries(E.monsterNames)),group=select("Elf’s group",HQ.spellData.groups.map(g=>[g,g])),spell=select("Spell practice",HQ.spellData.cards.map(card=>[card.id,card.name]));
    hero.value="wizard";enemy.value="orc";group.value="Earth";
    function apply(edit) {
      if(!getState())return;
      const next=JSON.parse(JSON.stringify(getState()));edit(next);replace(next);HQ.dialogs.show(dialog.id);
    }
    function button(label,run) {const button=document.createElement("button");button.type="button";button.className="hq-button";button.textContent=label;button.addEventListener("click",run);actions.append(button);return button;}
    button("Prepare Armoury",()=>{
      const prepared=create();prepared.phase="retreat";prepared.pending=null;prepared.lastReport=null;prepared.lastItemUse=null;prepared.monsterTurn=null;prepared.movement=freshMove();prepared.extraAttack=false;prepared.belongings=[];prepared.questRecovery=null;
      for(const [i,hero] of prepared.heroes.entries()){
        [hero.x,hero.row]=T.parse(HQ.trial.stairs[i]);hero.exit="retreated";hero.body=hero.maxBody;hero.trapped=false;hero.deathResolved=false;hero.inventory.gold=2000;
      }
      replace(prepared);onArmoury();
    });
    button("Prepare selected spell",()=>{
      const prepared=spellScenario(spell.value);hero.value=E.active(prepared).id;enemy.value="orc";group.value="Earth";replace(prepared);HQ.dialogs.show(dialog.id);
      note.textContent=HQ.spellData.byId[spell.value].name+" ready · Heroes are wounded, spells restored, and an Orc is nearby. Return to play and cast normally.";
    });
    const dungeon=select("Exploration practice",[["pit","Pit trap"],["spear","Spear trap"],["falling-block","Falling blocks"],["furniture","Trapped chest"],["secret-door","Secret stone door"]]);
    button("Prepare exploration scenario",()=>{
      const prepared=dungeonScenario(dungeon.value,hero.value);replace(prepared);HQ.dialogs.show(dialog.id);
      note.textContent=dungeon.value==="secret-door"?"Search for secret doors, then open the discovered stone panel beside your hero. The area beyond is unrevealed.":
        "Search for traps first, or step onto the hidden trap. Jump after finding it, or reset this hero’s turn to try disarming. Non-Dwarf heroes carry a practice tool kit. Twelve moves are ready.";
    });
    button("Reset turn / switch hero",()=>apply(s=>turn(s,hero.value)));
    button("Give maximum movement",()=>apply(s=>{turn(s,hero.value);const dice=Array(HQ.inventory.movementDice(E.active(s))).fill(6);s.movement={...freshMove(),rolled:true,dice,remaining:dice.length*6};}));
    button("Restore heroes & spells",()=>apply(s=>{
      s.belongings=[];for(const h of s.heroes){h.body=h.maxBody;h.exit=null;h.trapped=false;h.deathResolved=false;h.actionUsed=true;h.spellsUsed=[];h.effects={...HQ.spells.heroEffects(),...HQ.inventory.effects()};}
      const elf=s.heroes.find(h=>h.id==="elf"),wizard=s.heroes.find(h=>h.id==="wizard");elf.spellGroups=[group.value];wizard.spellGroups=HQ.spellData.groups.filter(g=>g!==group.value);turn(s,hero.value);
    }));
    button("Wound heroes for healing",()=>apply(s=>{for(const h of s.heroes.filter(C.inPlay))h.body=Math.max(1,h.maxBody-2);}));
    button("Prepare inventory / potions",()=>apply(s=>{
      turn(s,hero.value);const h=E.active(s);h.body=Math.max(1,h.maxBody-3);h.inventory.gold=200;
      h.inventory.items=h.inventory.items.filter(item=>item.kind!=="potion-of-healing");
      for(let i=0;i<2;i++)h.inventory.items.push({id:"practice-healing-"+h.id+"-"+s.nextEventId++,kind:"potion-of-healing"});
      note.textContent=h.name+" has 200 practice gold, two healing potions and reduced Body. Open Inventory to drink; these supplies exist only in practice.";
    }));
    const equipment=select("Equipment loadout",[["carried","Carry gear; equip in Inventory"],["chain","Helmet + Shield + Chain Mail"],["plate","Helmet + Shield + Plate Mail"],["axe","Battle Axe + Helmet + Plate Mail"],["staff","Staff · diagonal attack"],["longsword","Longsword · diagonal attack"],["crossbow","Crossbow · ranged attack"],["crossbow-miss","Crossbow · guaranteed miss"],["dagger-throw","Throw Dagger · spare available"],["dagger-last","Throw last Dagger · unarmed afterwards"]]);
    button("Prepare equipment practice",()=>{
      const s=create();turn(s,hero.value);const h=E.active(s);
      for(const definition of Object.values(HQ.itemData.byId).filter(item=>item.category==="equipment"))if(!h.inventory.items.some(item=>item.kind===definition.id))
        h.inventory.items.push({id:"practice-gear-"+h.id+"-"+definition.id,kind:definition.id});
      const miss=equipment.value==="crossbow-miss",throwing=equipment.value.startsWith("dagger-"),lastDagger=equipment.value==="dagger-last",weaponKind=throwing?"dagger":miss?"crossbow":equipment.value;
      if(throwing){
        const first=h.inventory.items.find(item=>item.kind==="dagger");
        if(lastDagger)h.inventory.items=h.inventory.items.filter(item=>HQ.itemData.byId[item.kind].slot!=="weapon"||item.id===first.id);
        else h.inventory.items.push({id:"practice-spare-dagger-"+h.id,kind:"dagger"});
      }
      const diagonal=["staff","longsword"].includes(weaponKind),ranged=weaponKind==="crossbow",weaponPreset=diagonal||ranged||throwing,allowed=!weaponPreset||h.id!=="wizard"||["staff","dagger"].includes(weaponKind);
      if(weaponPreset&&allowed){const item=h.inventory.items.find(item=>item.kind===weaponKind);HQ.inventory.equip(h,item.id,true);}
      else if(!weaponPreset&&h.id!=="wizard"&&equipment.value!=="carried"){
        const kinds=["helmet",equipment.value==="chain"?"chain-mail":"plate-mail",equipment.value==="axe"?"battle-axe":"shield"];
        for(const kind of kinds){const item=h.inventory.items.find(item=>item.kind===kind);HQ.inventory.equip(h,item.id,true);}
      }
      opponent(s,enemy.value);
      if(diagonal&&allowed){
        const target=s.monsters.find(monster=>monster.kind===enemy.value&&monster.body>0),destination=target&&freeCells(s,target.id).find(id=>{
          const [x,row]=T.parse(id);return Math.abs(x-h.x)===1&&Math.abs(row-h.row)===1&&C.canAttack(s,h,{...target,x,row});
        });
        if(destination)[target.x,target.row]=T.parse(destination);
      }
      if((ranged||throwing)&&allowed){
        const target=s.monsters.find(monster=>monster.kind===enemy.value&&monster.body>0);
        const from=C.cell(h),candidates=target?freeCells(s,target.id).filter(id=>!T.stairs.has(id)):[];
        const distance=id=>{const [x,row]=T.parse(id);return Math.abs(x-h.x)+Math.abs(row-h.row);};
        candidates.sort((a,b)=>(T.regions.get(a)===T.regions.get(from)?0:1)-(T.regions.get(b)===T.regions.get(from)?0:1)||Math.abs(distance(a)-4)-Math.abs(distance(b)-4));
        const destination=candidates.find(id=>{
          if(distance(id)<3)return false;
          const [x,row]=T.parse(id),placed={...target,x,row};
          return C.canAttack({...s,monsters:s.monsters.map(monster=>monster.id===target.id?placed:monster)},h,placed,throwing?{throwItemId:h.inventory.equipped.weapon}:{});
        });
        if(destination)[target.x,target.row]=T.parse(destination);
      }
      let missReady=false;
      if(miss&&allowed){
        const target=C.targets(s,h)[0],base=s.rng;
        if(target)for(let attempt=0;attempt<1024;attempt++){
          // Choose a seed for the ordinary next attack, as in Treasure practice.
          // No forced-roll command or fixture flag enters gameplay or saves.
          s.rng=((base+attempt)>>>0)||1;
          const candidate=E.applyCommand(s,{type:"ATTACK",targetId:target.id});
          if(candidate.ok&&candidate.state.lastReport.skulls===0){missReady=true;break;}
        }
        if(!missReady)s.rng=base;
      }
      replace(E.refreshDiscoveries(s));HQ.dialogs.show(dialog.id);
      note.textContent=!allowed?"The Wizard cannot use the "+HQ.combatData.weapons[weaponKind].name+". His Dagger stays equipped; choose another hero for this practice.":throwing?"Dagger practice ready. Click the opponent, choose Throw Dagger, then Roll. The thrown copy is lost on a hit or miss. "+(lastDagger?"This is your only weapon: afterwards the hero is unarmed with one attack die.":"A spare Dagger will stay equipped; other gear remains carried."):miss?missReady?"Crossbow miss ready. Return to play, click the opponent, choose Shoot, then Roll. The next attack rolls no skulls, so the bolt lands in the tile ahead. Shoot before rolling movement, casting or using a potion.":"Crossbow equipped, but a clear shot could not be prepared. Try another hero or opponent, then prepare this preset again.":ranged?"Crossbow practice ready. Click the opponent and choose Shoot. It uses 3 attack dice and cannot shoot orthogonally adjacent monsters. Move figures to inspect blocked shots or switch weapons in Inventory. Supplies are sandbox-only.":
        h.name+" equipment practice ready. Open Inventory to equip carried gear. Staff and Longsword can attack diagonally; the Wizard may equip the Dagger or Staff. Plate Mail uses one movement die. Supplies are sandbox-only.";
    });
    button("Prepare potion rescue",()=>apply(s=>{
      turn(s,hero.value);const h=E.active(s);h.body=1;opponent(s,"orc");
      h.inventory.items.push({id:"practice-healing-"+h.id+"-"+s.nextEventId++,kind:"potion-of-healing"});
      note.textContent=h.name+" has 1 Body and a healing potion. Place the Orc beside this hero, then run Zargon’s turn; a lethal hit should offer recovery.";
    }));
    const recovery=select("Death / recovery practice",[["spell","Unused action · healing spell rescue"],["spell-used","Action used · no spell rescue"],["allies","Death · nearby heroes"],["lost","Death · no nearby heroes"],["bag","Death · Treasure hazard"]]);
    button("Prepare death / recovery",()=>{
      const prepared=recoveryScenario(recovery.value,hero.value);hero.value=E.active(prepared.state).id;replace(prepared.state);HQ.dialogs.show(dialog.id);
      const fair=prepared.state.settings.fairLootRecovery;
      note.textContent=!prepared.prepared?"Could not prepare a lethal result. Try preparing again.":
        (recovery.value==="bag"?"Return to play and Search for treasure before any other roll. A lethal hazard resolves the death.":"Return to play and Continue on Zargon’s screen. The next ordinary Orc attack is lethal.")+" "+
        (recovery.value==="spell"?"Choose your own healing spell or let the hero fall.":recovery.value==="spell-used"?"The hero has already acted, so no healing-spell rescue is offered.":fair?"A sealed bag drops. Bring a companion to pick it up; only a completing carrier returns it to its revived owner.":recovery.value==="allies"?"A companion in the same room receives the possessions; choose a recipient if several are eligible.":"No companion is nearby, so the possessions are lost. This hero does not revive.");
    });
    const treasure=select("Treasure practice",[["random","Random draw"],...HQ.treasureData.cards.map(card=>[card.id,card.name+(card.category==="gold"?" · "+card.gold+" gold":card.id==="hazard-arrow"?" · Arrow":card.id==="hazard-pit"?" · Shallow hole":"")])]);
    button("Prepare treasure search",()=>apply(s=>{
      turn(s,hero.value);const h=E.active(s);
      // Restore all physical cards and remove earlier practice draws/items.
      for(const figure of s.heroes)figure.inventory.items=figure.inventory.items.filter(item=>!item.id.startsWith("treasure-"));
      for(const loot of s.belongings)loot.items=loot.items.filter(item=>!item.id.startsWith("treasure-"));

      s.lastItemUse=null;s.treasure=HQ.treasure.fresh(s.heroes);
      const chosen=HQ.treasureData.instances.filter(card=>card.kind===treasure.value).map(card=>card.id);
      // Select a seed for the next normal shuffle; no forced-card command,
      // partial deck or fixture flag enters the production rules/save format.
      s.monsters=s.monsters.filter(monster=>!monster.id.startsWith("wanderer-"));
      for(const monster of s.monsters){monster.body=0;monster.diedInPlay=false;}
      s.monsterMemory={};s.discoveredEntities=s.discoveredEntities.filter(id=>!id.startsWith("wanderer-"));
      [h.x,h.row]=[3,16];h.body=Math.max(1,h.maxBody-2);
      if(treasure.value==="random") {
        const seed=new Uint32Array(1);window.crypto.getRandomValues(seed);s.rng=seed[0]||0x4845524f;
        note.textContent="Random treasure search ready. This resets the practice deck and search history; each new draw is random.";
        return;
      }
      const base=s.rng;let prepared=false;
      for(let attempt=0;attempt<1024;attempt++) {
        s.rng=((base+attempt)>>>0)||1;
        const candidate=E.applyCommand(s,{type:"SEARCH_TREASURE"});
        if(candidate.ok&&chosen.includes(candidate.state.lastReport.search.cardId)){prepared=true;break;}
      }
      note.textContent=prepared?HQ.treasureData.byId[treasure.value].name+" test prepared. The deck has been reset to draw this card next. Search before rolling or taking another action.":"Search room prepared; the next card is random.";
    }));
    button("Give all treasure potions",()=>apply(s=>{
      turn(s,hero.value);const h=E.active(s);
      for(const definition of Object.values(HQ.itemData.byId).filter(item=>item.category==="potion"))h.inventory.items.push({id:"practice-potion-"+h.id+"-"+s.nextEventId++,kind:definition.id});
      note.textContent="One of every base treasure potion added to this hero’s practice inventory.";
    }));
    button("Set / revive opponent",()=>apply(s=>{turn(s,hero.value);opponent(s,enemy.value);}));
    async function place(isHero) {
      const state=getState();if(!state)return;
      const figure=isHero?state.heroes.find(h=>h.id===hero.value):state.monsters.find(m=>m.kind===enemy.value&&C.alive(m));
      if(!figure){note.textContent="Set the opponent first.";return;}
      if(isHero&&!C.inPlay(figure)){note.textContent="Reset this hero’s turn to bring them back before placing them.";return;}
      const selected=await choose({dialogId:dialog.id,title:"Place "+figure.name,targets:freeCells(state,figure.id).map(id=>({type:"cell",id,label:"Column "+(T.parse(id)[0]+1)+", row "+(T.parse(id)[1]+1)}))});
      if(selected)apply(s=>{const target=[...s.heroes,...s.monsters].find(f=>f.id===figure.id);[target.x,target.row]=T.parse(selected.id);if(!isHero)s.monsterMemory[target.id]={id:target.id,x:target.x,row:target.row};});
    }
    button("Place selected hero",()=>place(true));button("Place opponent",()=>place(false));
    button("Run Zargon’s turn",()=>{HQ.dialogs.close(dialog.id);onCpu();});
    const reset=button("Reset practice area",()=>{replace(create());show();});reset.classList.add("hq-button--primary");
    const note=document.createElement("p");note.className="hq-muted";note.setAttribute("role","status");
    const play=document.createElement("button");play.type="button";play.className="hq-button hq-button--primary";play.textContent="Return to play";play.addEventListener("click",()=>HQ.dialogs.close(dialog.id));
    const footer=document.createElement("div");footer.className="dialog-actions";footer.append(play);dialog.append(header,intro,fields,actions,note,footer);document.body.append(dialog);
    const tools=document.createElement("button");tools.type="button";tools.className="hq-button";tools.id="sandbox-tools";tools.textContent="Sandbox tools";document.querySelector(".topbar").insertBefore(tools,document.getElementById("model-viewer-button"));tools.addEventListener("click",show);
    const link=document.getElementById("sandbox-link");link.href="index.html";link.removeAttribute("target");link.textContent="Back to adventure";
    document.title="HeroQuest · Gameplay sandbox";document.querySelector(".prototype-label").textContent="GAMEPLAY SANDBOX";document.querySelector(".quest-title").textContent="Practice board";document.querySelector(".adventure-brand .eyebrow").textContent="BASE GAME";
    function show(message="") {
      const state=getState();note.textContent=typeof message==="string"&&message?message:state?"Fair loot recovery: "+(state.settings.fairLootRecovery?"On":"Off")+". Change it in Adventure menu; presets keep this setting.":"Reset the practice area to begin.";
      if(state){hero.value=E.active(state).id;group.value=state.heroes.find(h=>h.id==="elf")?.spellGroups[0]||"Earth";}
      HQ.dialogs.show(dialog.id);
    }
    return Object.freeze({show});
  }
  HQ.sandbox=Object.freeze({active,create,attach,turn});
})();

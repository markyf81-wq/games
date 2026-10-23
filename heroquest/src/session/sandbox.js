(function () {
  "use strict";
  const HQ=window.HeroQuest,E=HQ.exploration,T=HQ.topology,C=HQ.combat;
  const active=new URLSearchParams(window.location.search).get("sandbox")==="1";
  const freshMove=()=>({dice:[],remaining:0,rolled:false,started:false,closed:false,veilOfMist:false,passThroughRock:false});
  function freeCells(state,except=null) {
    return HQ.trial.floor.filter(id=>!T.blocked.has(id)&&!T.furniture.has(id)&&!T.monsterAt(state,id,false,except)&&(!T.occupiedHero(state,id,except)||T.stairs.has(id)));
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
    const hero=E.active(state);hero.body=Math.max(1,hero.body);hero.exit=null;hero.trapped=false;
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
      const discovered=E.applyCommand(state,{type:"SET_REALISTIC_LOS",enabled:false});if(discovered.ok)Object.assign(state,discovered.state);
    }
    state.log.push({id:state.nextEventId++,text:card.name+" practice · Cast normally from the spellbook."});return state;
  }
  function attach({getState,replace,choose,onCpu}) {
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
    button("Prepare selected spell",()=>{
      const prepared=spellScenario(spell.value);hero.value=E.active(prepared).id;enemy.value="orc";group.value="Earth";replace(prepared);HQ.dialogs.show(dialog.id);
      note.textContent=HQ.spellData.byId[spell.value].name+" ready · Heroes are wounded, spells restored, and an Orc is nearby. Return to play and cast normally.";
    });
    button("Reset turn / switch hero",()=>apply(s=>turn(s,hero.value)));
    button("Give 12 movement",()=>apply(s=>{turn(s,hero.value);s.movement={...freshMove(),rolled:true,dice:[6,6],remaining:12};}));
    button("Restore heroes & spells",()=>apply(s=>{
      for(const h of s.heroes){h.body=h.maxBody;h.exit=null;h.trapped=false;h.spellsUsed=[];h.effects={...HQ.spells.heroEffects(),...HQ.inventory.effects()};}
      const elf=s.heroes.find(h=>h.id==="elf"),wizard=s.heroes.find(h=>h.id==="wizard");elf.spellGroups=[group.value];wizard.spellGroups=HQ.spellData.groups.filter(g=>g!==group.value);turn(s,hero.value);
    }));
    button("Wound heroes for healing",()=>apply(s=>{for(const h of s.heroes.filter(C.inPlay))h.body=Math.max(1,h.maxBody-2);}));
    button("Prepare inventory / potions",()=>apply(s=>{
      turn(s,hero.value);const h=E.active(s);h.body=Math.max(1,h.maxBody-3);h.inventory.gold=200;
      h.inventory.items=h.inventory.items.filter(item=>item.kind!=="potion-of-healing");
      for(let i=0;i<2;i++)h.inventory.items.push({id:"practice-healing-"+h.id+"-"+s.nextEventId++,kind:"potion-of-healing"});
      note.textContent=h.name+" has 200 practice gold, two healing potions and reduced Body. Open Inventory to drink; these supplies exist only in practice.";
    }));
    button("Prepare potion rescue",()=>apply(s=>{
      turn(s,hero.value);const h=E.active(s);h.body=1;opponent(s,"orc");
      h.inventory.items.push({id:"practice-healing-"+h.id+"-"+s.nextEventId++,kind:"potion-of-healing"});
      note.textContent=h.name+" has 1 Body and a healing potion. Place the Orc beside this hero, then run Zargon’s turn; a lethal hit should offer recovery.";
    }));
    const treasure=select("Treasure practice",[["random","Random draw"],...HQ.treasureData.cards.map(card=>[card.id,card.name+(card.category==="gold"?" · "+card.gold+" gold":card.id==="hazard-arrow"?" · Arrow":card.id==="hazard-pit"?" · Shallow hole":"")])]);
    button("Prepare treasure search",()=>apply(s=>{
      turn(s,hero.value);const h=E.active(s);
      // Restore all physical cards and remove earlier practice draws/items.
      for(const figure of s.heroes)figure.inventory.items=figure.inventory.items.filter(item=>!item.id.startsWith("treasure-"));
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
      const selected=await choose({dialogId:dialog.id,title:"Place "+figure.name,targets:freeCells(state,figure.id).map(id=>({type:"cell",id,label:"Column "+(T.parse(id)[0]+1)+", row "+(T.parse(id)[1]+1)}))});
      if(selected)apply(s=>{const target=[...s.heroes,...s.monsters].find(f=>f.id===figure.id);[target.x,target.row]=T.parse(selected.id);if(!isHero)s.monsterMemory[target.id]={id:target.id,x:target.x,row:target.row};});
    }
    button("Place selected hero",()=>place(true));button("Place opponent",()=>place(false));
    button("Run Zargon’s turn",()=>{HQ.dialogs.close(dialog.id);onCpu();});
    const reset=button("Reset practice area",()=>{replace(create());show();});reset.classList.add("hq-button--primary");
    const note=document.createElement("p");note.className="hq-muted";note.setAttribute("role","status");
    const play=document.createElement("button");play.type="button";play.className="hq-button hq-button--primary";play.textContent="Return to play";play.addEventListener("click",()=>HQ.dialogs.close(dialog.id));
    const footer=document.createElement("div");footer.className="dialog-actions";footer.append(play);dialog.append(header,intro,fields,actions,note,footer);document.body.append(dialog);
    const tools=document.createElement("button");tools.type="button";tools.className="hq-button";tools.id="sandbox-tools";tools.textContent="Sandbox tools";document.querySelector(".topbar").insertBefore(tools,document.getElementById("test-room-button"));tools.addEventListener("click",show);
    const link=document.getElementById("sandbox-link");link.href="index.html";link.removeAttribute("target");link.textContent="Back to adventure";
    document.title="HeroQuest · Gameplay sandbox";document.querySelector(".prototype-label").textContent="GAMEPLAY SANDBOX";document.querySelector(".quest-title").textContent="Practice board";document.querySelector(".adventure-brand .eyebrow").textContent="BASE GAME";
    function show(message="") {
      const state=getState();note.textContent=typeof message==="string"&&message?message:state?"":"Reset the practice area to begin.";
      if(state){hero.value=E.active(state).id;group.value=state.heroes.find(h=>h.id==="elf")?.spellGroups[0]||"Earth";}
      HQ.dialogs.show(dialog.id);
    }
    return Object.freeze({show});
  }
  HQ.sandbox=Object.freeze({active,create,attach,turn});
})();

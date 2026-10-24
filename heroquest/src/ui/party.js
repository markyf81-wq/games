(function () {
  "use strict";
  const HQ=window.HeroQuest,E=HQ.exploration,$=id=>document.getElementById(id);

  // Own the setup form and party DOM; never mutate an engine session.
  HQ.createPartySetup=function({onFocus}) {
  const playerFields=[];
  const playerCount=()=>Number($("player-count").value);
  const playerName=index=>playerFields[index].input.value.trim()||"Player "+(index+1);
  const spellSetup=document.createElement("fieldset"),spellLegend=document.createElement("legend"),spellNote=document.createElement("p");
  spellSetup.className="spell-setup";spellLegend.textContent="Spell groups";spellNote.className="hq-muted";
  spellNote.textContent="Wizard chooses first, then Elf. Wizard receives the other two groups. Some spells are still being implemented.";
  const firstLabel=document.createElement("label"),firstText=document.createElement("span"),firstPick=document.createElement("select"),elfLabel=document.createElement("label"),elfText=document.createElement("span"),elfPick=document.createElement("select");
  firstLabel.className=elfLabel.className="hq-field";firstText.textContent="Wizard’s first group";firstLabel.append(firstText,firstPick);elfLabel.append(elfText,elfPick);
  for(const group of HQ.spellData.groups){const option=document.createElement("option");option.value=option.textContent=group;firstPick.append(option);}
  firstPick.value="Fire";let elfChoice="Earth";
  spellSetup.append(spellLegend,spellNote,firstLabel,elfLabel);$("hero-fields").after(spellSetup);
  const chosenHeroes=()=>playerFields.slice(0,playerCount()).map(field=>field.select.value);
  function updateSpellSetup() {
    const heroes=chosenHeroes(),wizard=heroes.includes("wizard"),elf=heroes.includes("elf");
    spellSetup.hidden=!wizard&&!elf;firstLabel.hidden=!wizard||!elf;elfText.textContent=elf?"Elf’s group":"Unused group";
    const available=HQ.spellData.groups.filter(group=>!wizard||!elf||group!==firstPick.value);
    if(!available.includes(elfChoice))elfChoice=available[0];
    elfPick.replaceChildren(...available.map(group=>{const option=document.createElement("option");option.value=option.textContent=group;return option;}));elfPick.value=elfChoice;
    spellNote.textContent=wizard&&elf?"Wizard chooses first, then Elf. Wizard receives the other two groups.":wizard?"Wizard keeps three groups. Choose one group to leave unused.":"Elf keeps one group. The other groups are unused.";
  }
  firstPick.addEventListener("change",updateSpellSetup);elfPick.addEventListener("change",()=>{elfChoice=elfPick.value;});
  function updateSetupPlayers() {
    const count=playerCount();
    for(const [i,field] of playerFields.entries()) {
      field.label.hidden=i>=count;field.input.disabled=i>=count;
      field.heroLabel.hidden=i>=count;field.select.disabled=i>=count;
      field.heroText.textContent=playerName(i)+"’s hero";
    }
    updateSpellSetup();
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
      updateSpellSetup();
    });
  }
  $("player-count").addEventListener("change",updateSetupPlayers);
  updateSetupPlayers();
  function renderParty(state=null) {
    $("party-list").replaceChildren();
    for(const [i,h] of (state?.heroes||HQ.heroes).entries()) {
      const button=document.createElement("button");button.type="button";button.className="party-button";
      const isActive=state&&state.phase==="hero-turn"&&h.id===E.active(state).id;button.setAttribute("aria-current",String(Boolean(isActive)));
      button.setAttribute("aria-label","Centre "+E.heroNames.get(h.id)+(h.owner?", controlled by "+h.owner:""));
      const n=document.createElement("span");n.className="turn-number";n.textContent=String(i+1);
      const copy=document.createElement("span"),name=document.createElement("strong"),owner=document.createElement("small");name.textContent=E.heroNames.get(h.id);owner.textContent=h.owner||"Choose a player";copy.append(name,owner);
      if(state){const health=document.createElement("small");health.className="hero-health";
        if(HQ.recovery.revived(state,h))health.textContent="Revived after quest";
        else if(h.exit)health.textContent=h.exit==="completed"?"Quest completed":"Retreated";
        else {const hearts=HQ.health.body(h.body,h.maxBody);health.append(hearts);if(h.body<=0)health.append(" Fallen");button.setAttribute("aria-label",button.getAttribute("aria-label")+", "+hearts.getAttribute("aria-label")+(h.body<=0?", fallen":""));}
        copy.append(health);
      }
      const mark=document.createElement("span");mark.className="active-mark";mark.textContent=isActive?"◆":"";mark.setAttribute("aria-hidden","true");button.append(n,HQ.portraits.image(h.kind||h.id,E.heroNames.get(h.id)),copy,mark);
      button.disabled=!state||!HQ.combat.inPlay(h);button.addEventListener("click",()=>onFocus(h.id));$("party-list").append(button);
    }
  }
  function config() {
    const players=playerFields.slice(0,playerCount());
    return {fairLootRecovery:$("setup-fair-loot").checked,heroIds:players.map(field=>field.select.value),
      owners:Object.fromEntries(players.map((field,index)=>[field.select.value,playerName(index)])),
      spellGroups:{elf:[elfPick.value],wizard:HQ.spellData.groups.filter(group=>group!==elfPick.value)}};
  }
  function restore(heroes,settings) {
    $("setup-fair-loot").checked=settings?.fairLootRecovery===true;
    const choices=[...heroes,...HQ.heroes.filter(hero=>!heroes.some(chosen=>chosen.id===hero.id))];
    $("player-count").value=String(heroes.length);
    for(const [index,field] of playerFields.entries()) {
      field.heroId=choices[index].id;
      field.select.value=field.heroId;
      field.input.value=choices[index].owner||"Player "+(index+1);
      field.portrait.replaceChildren(HQ.portraits.image(field.heroId,E.heroNames.get(field.heroId)));
    }
    const wizard=heroes.find(hero=>hero.id==="wizard"),elf=heroes.find(hero=>hero.id==="elf");
    firstPick.value=wizard?.spellGroups?.[0]||"Fire";
    elfChoice=elf?.spellGroups?.[0]||HQ.spellData.groups.find(group=>wizard?.spellGroups?.length&&!wizard.spellGroups.includes(group))||"Earth";
    updateSetupPlayers();
  }
  return Object.freeze({config,restore,render:renderParty});
  };
})();

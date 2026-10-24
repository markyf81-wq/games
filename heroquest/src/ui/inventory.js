(function () {
  "use strict";
  const HQ=window.HeroQuest,$=id=>document.getElementById(id);
  HQ.createInventory=function({getState,getUseReason,getEquipReason,onUse,onGive,onEquip}) {
    const dialog=$("inventory-dialog"),select=$("inventory-hero"),list=$("inventory-items"),use=$("use-item"),give=$("give-item");
    const art=$("inventory-card-art"),details=dialog.querySelector(".inventory-card-copy");
    const equip=$("equip-item");
    let heroId=null,chosen=null,partyKey="";
    const itemButtons=new Map();
    $("canvas-host").append(dialog);
    function selected() {
      const hero=getState()?.heroes.find(hero=>hero.id===heroId);
      const items=hero?.inventory.items.filter(item=>item.kind===chosen)||[];
      return {hero,item:items.find(item=>HQ.inventory.equipped(hero,item))||items[0]};
    }
    function renderDetails() {
      const {hero,item}=selected(),definition=HQ.itemData.byId[item?.kind];
      const reason=item?getUseReason(hero.id,item.id):"";
      art.hidden=!definition?.artwork;
      if(definition?.artwork){if(art.getAttribute("src")!==definition.artwork)art.src=definition.artwork;art.alt=definition.name+" card";}
      else {art.removeAttribute("src");art.alt="";}
      $("inventory-item-heading").textContent=definition?.name||"No possessions";
      $("inventory-item-description").textContent=definition?.description||"";
      $("inventory-item-category").textContent=definition?.category==="potion"?"POTION · SINGLE USE":"EQUIPMENT";
      use.hidden=definition?.category!=="potion";give.hidden=!item;
      use.disabled=Boolean(reason)||!item;use.textContent=definition?.healingDice?"Drink & roll":"Drink";
      const giveReason=item?HQ.inventory.giveReason(getState(),hero,item.id):"Choose an item.";
      give.disabled=Boolean(giveReason);give.title=giveReason;
      give.setAttribute("aria-label",giveReason?"Give item · "+giveReason:"Give "+definition.name+" to another hero");
      equip.hidden=!definition?.slot;
      const wearing=item&&HQ.inventory.equipped(hero,item),equipReason=definition?.slot?getEquipReason(hero.id,item.id,!wearing):"";
      equip.textContent=wearing?(definition?.slot==="weapon"?"Equipped":"Unequip"):"Equip";equip.disabled=Boolean(equipReason)||!item;equip.title=equipReason;
      const bonus=definition?.attack?definition.attack+" attack dice":definition?.defence?"+"+definition.defence+" defence "+(definition.defence===1?"die":"dice"):"";
      const swapHint=!wearing&&definition?.twoHanded&&HQ.inventory.worn(hero,"shield")?" Equipping puts away your shield.":"";
      $("inventory-item-status").textContent=definition?.category==="equipment"
        ?definition.slot?[(wearing?"Equipped":"Carried"),bonus,wearing&&definition.slot==="weapon"?"":equipReason].filter(Boolean).join(" · ")+swapHint:definition.summary:reason||definition?.summary||"";
    }
    function choose(kind) {
      chosen=kind;
      for(const button of list.children)button.setAttribute("aria-pressed",String(button.value===chosen));
      renderDetails();details.scrollTop=0;
    }
    function render() {
      const state=getState();if(!state)return;
      const scrollTop=list.scrollTop,hero=state.heroes.find(hero=>hero.id===heroId)||HQ.exploration.active(state);heroId=hero.id;
      const key=JSON.stringify(state.heroes.map(hero=>[hero.id,hero.owner,hero.name]));
      if(key!==partyKey){
        partyKey=key;
        select.replaceChildren(...state.heroes.map(hero=>{const option=document.createElement("option");option.value=hero.id;option.textContent=hero.owner+" · "+hero.name;return option;}));
      }
      select.value=hero.id;
      $("inventory-heading").textContent=hero.name+"’s inventory";
      HQ.portraits.set($("inventory-portrait"),[hero]);
      $("inventory-health").replaceChildren(HQ.health.body(hero.body,hero.maxBody));
      $("inventory-gold").textContent=hero.inventory.gold.toLocaleString()+" gold";
      const bags=state.belongings.filter(bag=>bag.carrierId===hero.id),bagNote=$("inventory-bags");
      bagNote.hidden=!bags.length;
      bagNote.textContent=bags.length?"Sealed bags: "+bags.map(bag=>state.heroes.find(owner=>owner.id===bag.heroId).name).join(", ")+". Contents reserved for their owners; return them by completing the quest.":"";
      const moveDice=HQ.inventory.movementDice(hero);
      $("inventory-loadout").textContent="Attack "+HQ.combat.attack(hero,state)+" · Defend "+HQ.combat.defence(hero,state)+" · Base movement "+moveDice+" "+(moveDice===1?"die":"dice");
      const groups=new Map();
      for(const item of hero.inventory.items){if(!groups.has(item.kind))groups.set(item.kind,[]);groups.get(item.kind).push(item);}
      if(!groups.has(chosen))chosen=hero.body<hero.maxBody&&groups.has("potion-of-healing")?"potion-of-healing":groups.has(hero.weapon)?hero.weapon:groups.keys().next().value;
      const nodes=[];
      for(const [kind,items] of groups){
        let entry=itemButtons.get(kind);
        if(!entry){entry=createItemButton(kind);itemButtons.set(kind,entry);}
        const {button,note,count}=entry,definition=HQ.itemData.byId[kind];
        const wearing=items.some(item=>HQ.inventory.equipped(hero,item));
        button.setAttribute("aria-pressed",String(chosen===kind));button.classList.toggle("is-equipped",wearing);
        button.setAttribute("aria-label",definition.name+" · "+items.length+" carried"+(wearing?" · Equipped":""));
        note.textContent=wearing?"Equipped":items.length+" carried";
        count.hidden=items.length<2;count.textContent=items.length;nodes.push(button);
      }
      // Keep focused buttons and scrolling intact when only counts/equipment
      // change. Reorder the existing nodes only if the visible item kinds change.
      if(list.children.length!==nodes.length||nodes.some((node,i)=>list.children[i]!==node))list.replaceChildren(...nodes);
      list.scrollTop=scrollTop;renderDetails();
    }
    const createItemButton=kind=>HQ.createItemCard(HQ.itemData.byId[kind],choose);
    function resetSelection(){chosen=null;list.scrollTop=0;details.scrollTop=0;}
    function show(id=null) {
      heroId=id||HQ.exploration.active(getState()).id;resetSelection();render();HQ.dialogs.show(dialog.id);
      $("open-inventory").setAttribute("aria-expanded","true");
    }
    function close(){HQ.dialogs.close(dialog.id);}
    use.addEventListener("click",()=>{const {hero,item}=selected();if(!use.disabled&&item)onUse(hero.id,item.id);});
    give.addEventListener("click",()=>{const {hero,item}=selected();if(!give.disabled&&item)onGive(hero.id,item.id);});
    equip.addEventListener("click",()=>{const {hero,item}=selected();if(!equip.disabled&&item)onEquip(hero.id,item.id,!HQ.inventory.equipped(hero,item));});
    select.addEventListener("change",()=>{heroId=select.value;resetSelection();render();});
    dialog.addEventListener("close",()=>$("open-inventory").setAttribute("aria-expanded",String(dialog.open)));
    dialog.addEventListener("keydown",event=>{if(event.key==="Escape"){event.preventDefault();event.stopPropagation();close();$("open-inventory").focus({preventScroll:true});}});
    return Object.freeze({show,close,render,get open(){return dialog.open;}});
  };
})();

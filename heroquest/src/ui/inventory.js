(function () {
  "use strict";
  const HQ=window.HeroQuest,$=id=>document.getElementById(id);
  HQ.createInventory=function({getState,getUseReason,onUse,onGive}) {
    const dialog=$("inventory-dialog"),select=$("inventory-hero"),list=$("inventory-items"),use=$("use-item"),give=$("give-item");
    const art=$("inventory-card-art"),details=dialog.querySelector(".inventory-card-copy");
    let heroId=null,chosen=null;
    $("canvas-host").append(dialog);
    function selected() {
      const hero=getState()?.heroes.find(hero=>hero.id===heroId);
      return {hero,item:hero?.inventory.items.find(item=>item.kind===chosen)};
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
      use.hidden=give.hidden=definition?.category!=="potion";
      use.disabled=Boolean(reason)||!item;use.textContent=definition?.healingDice?"Drink & roll":"Drink";
      const giveReason=item?HQ.inventory.giveReason(getState(),hero,item.id):"Choose a potion.";
      give.disabled=Boolean(giveReason);give.title=giveReason;
      give.setAttribute("aria-label",giveReason?"Give potion · "+giveReason:"Give "+definition.name+" to another hero");
      const attack=hero&&HQ.combatData.weapons[hero.weapon].attack;
      $("inventory-item-status").textContent=definition?.category==="equipment"
        ?definition.id==="tool-kit"?definition.summary:"Equipped · "+attack+" attack "+(attack===1?"die":"dice"):reason||definition?.summary||"";
    }
    function choose(kind) {
      chosen=kind;
      for(const button of list.children)button.setAttribute("aria-pressed",String(button.value===chosen));
      renderDetails();details.scrollTop=0;
    }
    function render() {
      const state=getState();if(!state)return;
      const scrollTop=list.scrollTop,hero=state.heroes.find(hero=>hero.id===heroId)||HQ.exploration.active(state);heroId=hero.id;
      const options=state.heroes.map(hero=>{const option=document.createElement("option");option.value=hero.id;option.textContent=hero.owner+" · "+hero.name;return option;});
      select.replaceChildren(...options);select.value=hero.id;
      $("inventory-heading").textContent=hero.name+"’s inventory";
      HQ.portraits.set($("inventory-portrait"),[hero]);
      $("inventory-health").replaceChildren(HQ.health.body(hero.body,hero.maxBody));
      $("inventory-gold").textContent=hero.inventory.gold.toLocaleString()+" gold";
      const groups=new Map();
      for(const item of hero.inventory.items){if(!groups.has(item.kind))groups.set(item.kind,[]);groups.get(item.kind).push(item);}
      if(!groups.has(chosen))chosen=hero.body<hero.maxBody&&groups.has("potion-of-healing")?"potion-of-healing":hero.weapon;
      list.replaceChildren();
      for(const [kind,items] of groups) {
        const definition=HQ.itemData.byId[kind],button=document.createElement("button"),image=document.createElement("img"),copy=document.createElement("span"),name=document.createElement("strong"),note=document.createElement("small");
        button.type="button";button.value=kind;button.className="inventory-item";button.setAttribute("aria-pressed",String(chosen===kind));
        image.className="inventory-item-art";image.alt="";image.src=definition.artwork;image.width=48;image.height=75;image.decoding="async";
        name.textContent=definition.name;note.textContent=definition.category==="equipment"?"Equipped":items.length+" carried";
        copy.append(name,note);button.append(image,copy);button.addEventListener("click",()=>choose(kind));list.append(button);
      }
      list.scrollTop=scrollTop;renderDetails();
    }
    function resetSelection(){chosen=null;list.scrollTop=0;details.scrollTop=0;}
    function show(id=null) {
      heroId=id||HQ.exploration.active(getState()).id;resetSelection();render();HQ.dialogs.show(dialog.id);
      $("open-inventory").setAttribute("aria-expanded","true");
    }
    function close(){HQ.dialogs.close(dialog.id);}
    use.addEventListener("click",()=>{const {hero,item}=selected();if(!use.disabled&&item)onUse(hero.id,item.id);});
    give.addEventListener("click",()=>{const {hero,item}=selected();if(!give.disabled&&item)onGive(hero.id,item.id);});
    select.addEventListener("change",()=>{heroId=select.value;resetSelection();render();});
    dialog.addEventListener("close",()=>$("open-inventory").setAttribute("aria-expanded",String(dialog.open)));
    dialog.addEventListener("keydown",event=>{if(event.key==="Escape"){event.preventDefault();event.stopPropagation();close();$("open-inventory").focus({preventScroll:true});}});
    return Object.freeze({show,close,render,get open(){return dialog.open;}});
  };
})();

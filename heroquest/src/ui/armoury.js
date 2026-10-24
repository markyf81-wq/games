(function () {
  "use strict";
  const HQ=window.HeroQuest,$=id=>document.getElementById(id),A=HQ.armoury;
  HQ.createArmoury=function({getState,onCommand,onClose}){
    const dialog=$("armoury-dialog"),select=$("armoury-hero"),list=$("armoury-items"),trade=$("armoury-trade"),equip=$("armoury-equip"),art=$("armoury-card-art");
    const buttons=new Map();let heroId=null,kind=null,mode="buy",partyKey="";
    const owned=(hero,id)=>hero.inventory.items.filter(item=>item.kind===id);
    function selection(){
      const state=getState(),hero=state.heroes.find(hero=>hero.id===heroId),items=hero&&owned(hero,kind)||[];
      return {state,hero,definition:HQ.itemData.byId[kind],items,
        sellItem:items.find(item=>!HQ.inventory.equipped(hero,item))||items[0],
        equipItem:items.find(item=>HQ.inventory.equipped(hero,item))||items[0]};
    }
    function details(){
      const {state,hero,definition,items,sellItem,equipItem}=selection();
      art.hidden=!definition;
      if(definition){if(art.getAttribute("src")!==definition.artwork)art.src=definition.artwork;art.alt=definition.name+" card";}else{art.removeAttribute("src");art.alt="";}
      $("armoury-item-heading").textContent=definition?.name||"No equipment to sell";
      $("armoury-item-category").textContent=mode==="buy"?"ARMOURY · UNLIMITED STOCK":"YOUR EQUIPMENT";
      $("armoury-item-description").textContent=definition?.description||"Bought equipment appears here. Potions are kept in your inventory.";
      const reason=mode==="buy"?A.buyReason(state,hero,kind):A.sellReason(state,hero,sellItem?.id);
      trade.disabled=Boolean(reason);trade.title=reason;
      trade.textContent=definition?(mode==="buy"?"Buy · "+definition.price+" gold":"Sell "+(HQ.inventory.equipped(hero,sellItem)?"equipped copy":"one")+" · "+A.sellPrice(definition)+" gold"):"Sell";
      const wearing=equipItem&&HQ.inventory.equipped(hero,equipItem);
      equip.hidden=mode!=="sell"||!definition?.slot;
      equip.textContent=wearing?(definition.slot==="weapon"?"Equipped":"Unequip"):"Equip";
      const equipReason=hero&&equipItem?HQ.inventory.equipReason(state,hero,equipItem.id,!wearing):"Choose owned equipment.";
      equip.disabled=Boolean(equipReason);equip.title=equipReason;
      const warning=hero?.id==="wizard"&&definition?.slot&&!definition.wizardAllowed?"The Wizard may carry this but cannot equip it.":"";
      const lastWeapon=mode==="sell"&&sellItem&&hero.inventory.equipped.weapon===sellItem.id?"Selling this copy leaves this hero unarmed (1 attack die).":"";
      $("armoury-item-status").textContent=[definition?items.length+" owned"+(wearing?" · Equipped":""):"",warning,lastWeapon,reason].filter(Boolean).join(" · ");
    }
    function choose(id){kind=id;for(const button of list.children)button.setAttribute("aria-pressed",String(button.value===kind));details();dialog.querySelector(".inventory-card-copy").scrollTop=0;}
    function render(){
      const state=getState(),visitors=A.visitors(state),hero=visitors.find(hero=>hero.id===heroId)||visitors[0];
      if(!hero){trade.disabled=equip.disabled=true;return;}
      heroId=hero.id;const key=visitors.map(hero=>hero.id+":"+hero.owner).join("|");
      if(key!==partyKey){partyKey=key;select.replaceChildren(...visitors.map(hero=>{const option=document.createElement("option");option.value=hero.id;option.textContent=hero.owner+" · "+hero.name;return option;}));}
      select.value=heroId;HQ.portraits.set($("armoury-portrait"),[hero]);
      $("armoury-gold").textContent=hero.inventory.gold.toLocaleString()+" gold";
      $("armoury-loadout").textContent="Attack "+HQ.combat.attack(hero,state)+" · Defend "+HQ.combat.defence(hero,state);
      $("armoury-buy-mode").setAttribute("aria-pressed",String(mode==="buy"));$("armoury-sell-mode").setAttribute("aria-pressed",String(mode==="sell"));
      const shown=A.stock.filter(definition=>mode==="buy"||owned(hero,definition.id).length),scroll=list.scrollTop;
      if(!shown.some(definition=>definition.id===kind))kind=shown[0]?.id||null;
      const nodes=shown.map(definition=>{
        let entry=buttons.get(definition.id);if(!entry){entry=HQ.createItemCard(definition,choose);buttons.set(definition.id,entry);}
        const items=owned(hero,definition.id),wearing=items.some(item=>HQ.inventory.equipped(hero,item));
        entry.button.setAttribute("aria-pressed",String(kind===definition.id));entry.button.classList.toggle("is-equipped",mode==="sell"&&wearing);
        entry.button.setAttribute("aria-label",definition.name+" · "+(mode==="buy"?definition.price:A.sellPrice(definition))+" gold · "+items.length+" owned");
        entry.note.textContent=(mode==="buy"?definition.price:A.sellPrice(definition))+" gold"+(wearing?" · Equipped":"");entry.count.hidden=items.length<2;entry.count.textContent=items.length;return entry.button;
      });
      if(nodes.length!==list.children.length||nodes.some((node,i)=>node!==list.children[i]))list.replaceChildren(...nodes);
      list.scrollTop=scroll;details();
    }
    function changeMode(next){mode=next;kind=null;list.scrollTop=0;$("armoury-message").textContent="";render();}
    $("armoury-buy-mode").addEventListener("click",()=>changeMode("buy"));$("armoury-sell-mode").addEventListener("click",()=>changeMode("sell"));
    select.addEventListener("change",()=>{heroId=select.value;kind=null;list.scrollTop=0;$("armoury-message").textContent="";render();});
    trade.addEventListener("click",()=>{
      if(trade.disabled)return;const {hero,definition,sellItem}=selection();
      const command=mode==="buy"?{type:"BUY_EQUIPMENT",heroId:hero.id,kind}:{type:"SELL_EQUIPMENT",heroId:hero.id,itemId:sellItem.id};
      if(onCommand(command))$("armoury-message").textContent=hero.name+(mode==="buy"?" bought ":" sold ")+definition.name+" for "+(mode==="buy"?definition.price:A.sellPrice(definition))+" gold.";
    });
    equip.addEventListener("click",()=>{const {hero,equipItem}=selection();if(!equip.disabled&&equipItem)onCommand({type:"SET_EQUIPMENT",heroId:hero.id,itemId:equipItem.id,equip:!HQ.inventory.equipped(hero,equipItem)});});
    dialog.addEventListener("close",onClose);
    function show(){if(!A.visitors(getState()).length)return;$("armoury-message").textContent="";render();HQ.dialogs.show(dialog.id);}
    return Object.freeze({show,render,get open(){return dialog.open;}});
  };
})();

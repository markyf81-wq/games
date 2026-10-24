(function () {
  "use strict";
  const HQ=window.HeroQuest;
  // Shared equipment-card tile; callers own selection, prices and counts.
  HQ.createItemCard=function(definition,onSelect){
    const button=document.createElement("button"),image=document.createElement("img"),copy=document.createElement("span"),name=document.createElement("strong"),note=document.createElement("small"),count=document.createElement("span");
    button.type="button";button.value=definition.id;button.className="inventory-item";
    image.className="inventory-item-art";image.src=definition.artwork;image.alt="";image.width=48;image.height=75;image.decoding="async";
    name.textContent=definition.name;count.className="inventory-item-count";count.setAttribute("aria-hidden","true");
    copy.append(name,note);button.append(image,copy,count);button.addEventListener("click",()=>onSelect(definition.id));
    return {button,note,count};
  };
})();

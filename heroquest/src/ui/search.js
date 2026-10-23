(function () {
  "use strict";
  const HQ=window.HeroQuest;
  HQ.createSearchDialog=function({options}) {
    const button=document.getElementById("open-search"),dialog=document.getElementById("search-dialog"),panel=document.getElementById("search-options");
    function close(){HQ.dialogs.close(dialog.id);}
    function show(){
      panel.replaceChildren();
      for(const option of options()){
        const row=document.createElement("div"),choice=document.createElement("button");row.className="context-action";
        choice.type="button";choice.className="hq-button";choice.textContent=option.label;choice.disabled=Boolean(option.disabled);
        if(option.reason){const hint=document.createElement("small");hint.id="search-reason-"+panel.children.length;hint.textContent=option.reason;choice.setAttribute("aria-describedby",hint.id);row.append(hint);}
        choice.addEventListener("click",()=>{close();option.run();});row.prepend(choice);panel.append(row);
      }
      HQ.dialogs.show(dialog.id);button.setAttribute("aria-expanded","true");
      panel.querySelector("button:not(:disabled)")?.focus({preventScroll:true});
    }
    dialog.addEventListener("close",()=>button.setAttribute("aria-expanded","false"));
    return Object.freeze({show,close});
  };
})();

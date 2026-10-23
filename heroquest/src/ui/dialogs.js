(function () {
  "use strict";
  const show=id=>{const dialog=document.getElementById(id);if(!dialog.open){if(dialog.hasAttribute("data-nonmodal"))dialog.show();else dialog.showModal();}};
  const close=id=>{const dialog=document.getElementById(id);if(dialog.open)dialog.close();};
  document.querySelectorAll('[data-close-dialog]').forEach(button=>button.addEventListener('click',()=>close(button.dataset.closeDialog)));
  // Setup/handoff decisions are explicit; Escape must not leave a pending turn
  // hidden behind an interactive board. Native dialogs manage focus and inertness.
  for(const id of ['setup-dialog','handoff-dialog','briefing-dialog','quest-outcome-dialog','zargon-dialog'])
    document.getElementById(id).addEventListener('cancel',event=>event.preventDefault());
  // Presentation-only confirmation. Future card/target controls can supply DOM
  // content here; accepted decisions still go through the engine command boundary.
  function ask({title,kicker="YOUR ACTION",description,confirmLabel="Continue →",content=[]}) {
    const dialog=document.getElementById("action-dialog");if(dialog.open)return Promise.resolve(false);
    document.getElementById("action-heading").textContent=title;document.getElementById("action-kicker").textContent=kicker;
    document.getElementById("action-description").textContent=description;document.getElementById("confirm-action").textContent=confirmLabel;
    document.getElementById("confirm-action").disabled=false;
    document.getElementById("action-options").replaceChildren(...content);dialog.returnValue="";
    return new Promise(resolve=>{dialog.addEventListener("close",()=>resolve(dialog.returnValue==="confirm"),{once:true});show("action-dialog");});
  }
  document.getElementById("cancel-action").addEventListener("click",()=>document.getElementById("action-dialog").close("cancel"));
  document.getElementById("confirm-action").addEventListener("click",()=>document.getElementById("action-dialog").close("confirm"));
  window.HeroQuest.dialogs=Object.freeze({show,close,ask});
})();

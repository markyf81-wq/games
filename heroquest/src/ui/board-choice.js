(function () {
  "use strict";
  const HQ=window.HeroQuest;
  // A transient modal-to-board round trip. Callers supply already-filtered
  // public refs; selecting or cancelling never dispatches a game command.
  HQ.createBoardChoice=function({view}) {
    const host=document.getElementById("canvas-host"),canvas=document.getElementById("board-canvas"),bar=document.createElement("section"),text=document.createElement("p"),hint=document.createElement("small"),cancel=document.createElement("button");
    bar.className="board-choice hq-panel";bar.hidden=true;bar.setAttribute("aria-label","Choose a target");
    text.setAttribute("role","status");hint.textContent="Click a glowing target · [ / ] then Enter · Escape cancels";
    cancel.type="button";cancel.className="hq-button";cancel.textContent="Cancel selection";
    const copy=document.createElement("div");copy.append(text,hint);bar.append(copy,cancel);host.append(bar);
    let pending=null;
    const key=ref=>ref.type+":"+ref.id;
    function finish(ref=null,reopen=true) {
      if(!pending)return;
      const ended=pending;pending=null;bar.hidden=true;view.setBoardChoices(null);
      ended.unlock();
      if(reopen)HQ.dialogs.show(ended.dialogId);
      ended.resolve(ref);
    }
    function choose({dialogId,title,targets}) {
      if(pending||!targets.length||!document.getElementById(dialogId)?.open)return Promise.resolve(null);
      const unlock=HQ.turnControls.lock();
      return new Promise(resolve=>{
        pending={dialogId,title,resolve,unlock,targets:new Map(targets.map(ref=>[key(ref),ref]))};
        text.textContent=title;bar.hidden=false;HQ.dialogs.close(dialogId);
        view.setBoardChoices(targets);canvas.focus({preventScroll:true});
      });
    }
    function pick(ref) {
      if(!pending)return false;
      const target=pending.targets.get(key(ref));if(target)finish(target);
      return true;
    }
    function hover(ref) {
      if(!pending)return;
      const target=ref&&pending.targets.get(key(ref));text.textContent=pending.title+(target?.label?" · "+target.label:"");
    }
    cancel.addEventListener("click",()=>finish());
    document.addEventListener("keydown",event=>{if(pending&&event.key==="Escape"){event.preventDefault();finish();}});
    canvas.addEventListener("webglcontextlost",()=>finish());
    window.addEventListener("pagehide",()=>finish(null,false));
    return Object.freeze({choose,pick,hover,cancel:()=>finish(),get active(){return Boolean(pending);}});
  };
})();

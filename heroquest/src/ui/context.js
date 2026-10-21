(function () {
  "use strict";
  const HQ=window.HeroQuest;
  HQ.createContextPanel=function({onClose}) {
    const panel=document.getElementById("board-context"),canvas=document.getElementById("board-canvas"),host=document.getElementById("canvas-host");
    const heading=document.getElementById("context-heading"),description=document.getElementById("context-description"),details=document.getElementById("context-details"),actions=document.getElementById("context-actions");
    let anchor=null,open=false;
    function position(point) {
      if(point)anchor=point;if(!open||!anchor)return;
      // Keep the panel beside the world anchor, within the playable viewport.
      panel.style.visibility=anchor.inView?"visible":"hidden";
      const width=panel.offsetWidth,height=panel.offsetHeight,pad=12;
      const right=anchor.x+25,left=anchor.x-width-25;
      const x=right+width<host.clientWidth-pad?right:left;
      const top=Math.max(pad,Math.min(76,host.clientHeight-height-pad));
      panel.style.left=Math.max(pad,Math.min(x,host.clientWidth-width-pad))+"px";
      panel.style.top=Math.max(top,Math.min(anchor.y-height*.3,host.clientHeight-height-64))+"px";
    }
    function close(restoreFocus=false) {
      if(!open)return;open=false;panel.hidden=true;panel.style.visibility="";anchor=null;onClose();
      if(restoreFocus)canvas.focus({preventScroll:true});
    }
    function show({name,kind,description:copy,details:info,actions:options,figure},point) {
      document.getElementById("context-kicker").textContent=kind;heading.textContent=name;description.textContent=copy;details.textContent=info||"";details.hidden=!info;
      actions.replaceChildren();
      HQ.portraits.set(document.getElementById("context-portrait"),figure?[figure]:[]);
      for(const option of options) {
        const row=document.createElement("div"),button=document.createElement("button"),hint=document.createElement("small");
        row.className="context-action";button.type="button";button.className="hq-button"+(option.primary?" hq-button--primary":"");button.textContent=option.label;button.disabled=Boolean(option.disabled);
        if(option.reason){hint.textContent=option.reason;hint.id="context-reason-"+actions.children.length;button.setAttribute("aria-describedby",hint.id);}
        button.addEventListener("click",()=>{close(true);option.run();});row.append(button);if(option.reason)row.append(hint);actions.append(row);
      }
      panel.hidden=false;open=true;position(point);document.getElementById("close-context").focus({preventScroll:true});
    }
    document.getElementById("close-context").addEventListener("click",()=>close(true));
    panel.addEventListener("keydown",event=>{if(event.key==="Escape"){event.preventDefault();event.stopPropagation();close(true);}});
    document.addEventListener("pointerdown",event=>{if(open&&!panel.contains(event.target)&&event.target!==canvas)close();});
    return Object.freeze({show,close,position});
  };
})();

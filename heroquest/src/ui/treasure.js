(function () {
  "use strict";
  const HQ=window.HeroQuest,$=id=>document.getElementById(id);
  // Presentation only. The report already owns the drawn card and its effects.
  HQ.createTreasureDrawer=function({onContinue}) {
    const dialog=$("treasure-dialog"),stage=$("treasure-draw-stage"),flight=$("treasure-drawn-card"),turn=$("treasure-card-turn"),details=$("treasure-card-details");
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
    let current=null,dismissedId=null;
    $("canvas-host").append(dialog);
    const next=$("continue-treasure");
    function finish(record) {
      if(current!==record||record.ready)return;
      record.ready=true;clearTimeout(record.watchdog);
      stage.classList.add("is-revealed");stage.setAttribute("aria-busy","false");
      details.removeAttribute("aria-hidden");
      next.disabled=false;
      for(const animation of record.animations)animation.cancel();record.animations=[];
    }
    function close() {
      if(!current)return;
      const record=current;finish(record);dismissedId=record.id;HQ.dialogs.close(dialog.id);
    }
    function reset() {
      if(current)finish(current);
      current=null;dismissedId=null;HQ.dialogs.close(dialog.id);
    }
    function present(report,{animate=false}={}) {
      if(dismissedId===report.id)return false;
      if(current?.id===report.id)return true;
      reset();
      const instance=HQ.treasureData.instancesById[report.search.cardId],card=HQ.treasureData.byId[instance?.kind];
      const special=HQ.trial.treasureRooms[report.search.roomId];
      current={id:report.id,ready:false,animations:[],watchdog:0};const record=current;
      next.disabled=true;
      $("treasure-draw-hero").textContent=report.attackerName+" · Treasure search";
      $("treasure-card-name").textContent=card?.name||"Quest discovery";
      $("treasure-card-description").textContent=card?.description||special?.description||report.detail;
      $("treasure-card-outcome").textContent=report.detail;
      $("treasure-card-face").src=card?.artwork||HQ.treasureData.back;
      $("treasure-card-face").alt=card?.name||"Treasure";
      stage.classList.remove("is-revealed");stage.classList.toggle("is-quest-find",!card);
      stage.setAttribute("aria-busy","true");details.setAttribute("aria-hidden","true");
      HQ.dialogs.show(dialog.id);
      if(!card||!animate||reduced.matches||document.hidden||!flight.animate){finish(record);return true;}
      // Lift the top card off the stack, slide into the empty space, then turn
      // its actual original face towards the player. Layout height stays fixed.
      record.watchdog=setTimeout(()=>finish(record),2200);
      try{
        record.animations.push(flight.animate([
          {transform:"translateX(calc(-100% - var(--treasure-gap))) translateY(0) rotate(-5deg)",offset:0},
          {transform:"translateX(-52%) translateY(-25px) rotate(-8deg)",offset:.42},
          {transform:"translateX(0) translateY(0) rotate(0deg)",offset:1}
        ],{duration:1500,easing:"cubic-bezier(.25,.7,.25,1)",fill:"both"}));
        record.animations.push(turn.animate([{transform:"rotateY(0deg)",offset:0},{transform:"rotateY(0deg)",offset:.35},{transform:"rotateY(180deg)",offset:1}],
          {duration:1500,easing:"cubic-bezier(.35,0,.2,1)",fill:"both"}));
      }catch(error){finish(record);return true;}
      Promise.allSettled(record.animations.map(animation=>animation.finished)).then(()=>finish(record));
      return true;
    }
    next.addEventListener("click",()=>{
      if(!current?.ready||dismissedId===current.id)return;
      const id=current.id;close();onContinue(id);
    });
    dialog.addEventListener("close",()=>{if(!dialog.open&&current){finish(current);dismissedId=current.id;}});
    dialog.addEventListener("cancel",event=>event.preventDefault());
    dialog.addEventListener("keydown",event=>{if(event.key==="Escape"){event.preventDefault();event.stopPropagation();}});
    document.addEventListener("visibilitychange",()=>{if(document.hidden&&current)finish(current);});
    window.addEventListener("pagehide",()=>{if(current)finish(current);});
    reduced.addEventListener("change",()=>{if(reduced.matches&&current)finish(current);});
    return Object.freeze({present,close,reset,get busy(){return Boolean(current&&dismissedId!==current.id);}});
  };
})();

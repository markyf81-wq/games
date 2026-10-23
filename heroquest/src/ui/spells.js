(function () {
  "use strict";
  const HQ=window.HeroQuest,$=id=>document.getElementById(id);
  HQ.createSpellbook=function({getState,onCast,onChooseTarget}) {
    let chosen=null,preferred=null,targetId=null,book=[],buttons=[],gesture=null,ignoreClickUntil=0,position=0,frame=0;
    const cards=$("spell-cards"),cast=$("cast-spell"),mode=$("spell-mode");
    $("canvas-host").append($("spell-dialog"));
    const showDrawer=()=>{HQ.dialogs.show("spell-dialog");$("open-spellbook").setAttribute("aria-expanded","true");};
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)"),wrap=value=>((value%book.length)+book.length)%book.length;
    const offset=value=>wrap(value+book.length/2)-book.length/2;
    const state=()=>getState(),caster=()=>HQ.exploration.active(state());
    const choiceMode=()=>chosen==="genie"?mode.value:"attack";
    function figures(card) {
      const s=state(),projection=HQ.exploration.project(s);
      return card.id==="genie"&&choiceMode()==="door"?projection.doors.map(door=>({...door,name:"Door · column "+(door.x+1)+", row "+(door.row+1)})):card.target==="hero"?s.heroes.filter(HQ.combat.inPlay):projection.monsters;
    }
    function updateTarget() {
      const s=state(),hero=caster(),card=HQ.spellData.byId[chosen],legal=card?figures(card).filter(target=>!HQ.spells.reason(s,hero,card,target,choiceMode())):[],target=legal.find(f=>f.id===targetId);
      const busy=Boolean(frame||gesture?.locked),reason=HQ.spells.reason(s,hero,card,target,choiceMode());
      cast.disabled=busy||!legal.length||Boolean(reason);cast.textContent=target?"Cast "+card.name:legal.length?"Choose target":"Cast spell";
      $("spell-detail-status").textContent=reason||(!legal.length?"No legal target.":target?target.name:"Select a glowing target on the board.");
    }
    function populateTargets() {
      const s=state(),hero=caster(),card=HQ.spellData.byId[chosen],legal=card?figures(card).filter(target=>!HQ.spells.reason(s,hero,card,target,choiceMode())):[];
      targetId=legal.find(target=>target.id===targetId)?.id||legal.find(target=>target.id===preferred)?.id||null;
      updateTarget();
    }
    async function chooseTarget() {
      if(cast.disabled||frame||gesture?.locked)return;
      const card=HQ.spellData.byId[chosen],legal=figures(card).filter(target=>!HQ.spells.reason(state(),caster(),card,target,choiceMode()));
      const selected=await onChooseTarget({dialogId:"spell-dialog",reopenOnPick:false,title:card.name+" · Choose "+(card.id==="genie"&&choiceMode()==="door"?"a door":"a "+card.target),targets:legal.map(target=>({type:"piece",id:target.id,label:target.name}))});
      if(selected){targetId=selected.id;populateTargets();if(castSelected())return;showDrawer();}
      else populateTargets();
      $("open-spellbook").setAttribute("aria-expanded",String($("spell-dialog").open));cast.focus({preventScroll:true});
    }
    function castSelected() {
      const card=HQ.spellData.byId[chosen],target=card&&figures(card).find(figure=>figure.id===targetId);
      if(!target||HQ.spells.reason(state(),caster(),card,target,choiceMode()))return false;
      const command={type:"CAST_SPELL",spellId:chosen,targetId,mode:choiceMode()};
      HQ.dialogs.close("spell-dialog");
      if(onCast(command)===false){showDrawer();populateTargets();return false;}
      return true;
    }
    function layout() {
      if(!book.length)return;
      const nearest=wrap(Math.round(position)),edge=Math.min(3.5,book.length/2);
      buttons.forEach((button,i)=>{
        const distance=offset(i-position),opacity=Math.max(0,Math.min(1,(edge-Math.abs(distance))*2));
        button.style.setProperty("--fan-offset",String(distance));button.style.setProperty("--fan-distance",String(Math.abs(distance)));
        button.style.zIndex=String(100-Math.round(Math.abs(distance)*10));button.style.opacity=String(opacity);
        button.classList.toggle("is-away",opacity===0);button.classList.toggle("is-centred",i===nearest);
      });
    }
    function commitSelection(focus=false) {
      const index=book.length?wrap(Math.round(position)):-1,id=book[index]?.id||null;
      const changed=chosen!==id;chosen=id;const s=state(),hero=caster(),card=HQ.spellData.byId[id];
      for(const [i,button] of buttons.entries()) {
        button.setAttribute("aria-pressed",String(i===index));button.tabIndex=i===index?0:-1;
        if(focus&&i===index)button.focus({preventScroll:true});
      }
      $("spell-position").textContent=book.length?(index+1)+" / "+book.length:"";
      const hasBook=HQ.spells.book(hero).length>0;
      $("spell-detail-heading").textContent=card?.name||(hasBook?"No spells remaining":"No spellbook");$("spell-detail-group").textContent=card?.group||"";
      $("spell-detail-description").textContent=card?.description||(hasBook?"All spells have been cast this quest.":"Start a new adventure to choose spell groups.");
      $("spell-detail-status").textContent=card?HQ.spells.reason(s,hero,card):"";
      $("spell-mode-field").hidden=id!=="genie";
      cast.hidden=!card;
      if(changed){targetId=null;mode.value=id==="genie"&&HQ.dungeon.doors(s).some(door=>door.id===preferred)?"door":"attack";}
      populateTargets();
    }
    function stopMotion() {
      cancelAnimationFrame(frame);frame=0;cards.classList.remove("is-moving");
    }
    function settle(velocity=0,target=null,focus=false) {
      stopMotion();if(!book.length){commitSelection();return;}
      if(reduced.matches){position=target??Math.round(position);layout();commitSelection(focus);return;}
      let previous=performance.now(),elapsed=0,goal=target;
      cards.classList.add("is-moving");cast.disabled=true;
      function tick(now) {
        const dt=Math.min(.032,Math.max(0,(now-previous)/1000));previous=now;elapsed+=dt;
        if(goal===null&&Math.abs(velocity)>.8&&elapsed<.7) {
          // Exponential drag gives a fast flick more travel than a slow release.
          const decay=Math.exp(-7.5*dt);position+=velocity*(1-decay)/7.5;velocity*=decay;
        } else {
          if(goal===null)goal=Math.round(position+velocity*.08);
          // Critically damped spring: continuous position and speed at handoff.
          const error=position-goal,b=velocity+18*error,decay=Math.exp(-18*dt);
          position=goal+(error+b*dt)*decay;velocity=(velocity-18*b*dt)*decay;
        }
        layout();
        if(goal!==null&&Math.abs(position-goal)<.001&&Math.abs(velocity)<.02||elapsed>1.8) {
          position=goal??Math.round(position);stopMotion();layout();commitSelection(focus);return;
        }
        frame=requestAnimationFrame(tick);
      }
      frame=requestAnimationFrame(tick);
    }
    function selectCard(id,{focus=false,instant=false}={}) {
      const index=book.findIndex(card=>card.id===id);if(index<0){stopMotion();commitSelection();return;}
      const target=position+offset(index-position);
      if(instant){stopMotion();position=index;layout();commitSelection(focus);}else settle(0,target,focus);
    }
    function cycle(delta,focus=false) {
      if(!book.length)return;
      settle(0,Math.round(position)+delta,focus);
    }
    function finishGesture(coast=false) {
      if(!gesture)return;
      const ended=gesture;gesture=null;
      if(ended.locked)ignoreClickUntil=performance.now()+300;
      cards.classList.remove("is-dragging");
      if(cards.hasPointerCapture(ended.id))cards.releasePointerCapture(ended.id);
      const first=ended.samples[0],last=ended.samples.at(-1),seconds=(last.time-first.time)/1000;
      const velocity=coast&&ended.locked&&performance.now()-last.time<90&&seconds>.008?Math.max(-20,Math.min(20,(last.position-first.position)/seconds)):0;
      settle(velocity);
    }
    function cancelInteraction() {
      const ended=gesture;gesture=null;
      if(ended&&cards.hasPointerCapture(ended.id))cards.releasePointerCapture(ended.id);
      stopMotion();cards.classList.remove("is-dragging");position=Math.round(position);layout();
      if($("spell-dialog").open)commitSelection();
    }
    function show(initialTargetId=null) {
      const s=state(),hero=caster();if(!HQ.spells.isCaster(hero))return;
      cancelInteraction();ignoreClickUntil=0;position=0;chosen=null;targetId=null;
      preferred=initialTargetId;cards.replaceChildren();buttons=[];$("spell-heading").textContent=hero.name+"’s spells";book=HQ.spells.book(hero).filter(card=>!hero.spellsUsed.includes(card.id));
      $("spell-note").textContent="One spell replaces your attack. Each card can be cast once this quest.";
      for(const card of book) {
        const button=document.createElement("button"),art=document.createElement("img");
        button.type="button";button.className="spell-card";button.dataset.spell=card.id;
        button.setAttribute("aria-label",card.name+" · "+card.group);
        art.src=card.artwork;art.alt="";art.width=480;art.height=754;art.draggable=false;
        button.append(art);
        button.addEventListener("click",event=>{if(event.detail===0||performance.now()>=ignoreClickUntil)selectCard(card.id);});cards.append(button);buttons.push(button);
      }
      $("spell-previous").disabled=$("spell-next").disabled=book.length<2;
      const usable=book.filter(card=>!HQ.spells.reason(s,hero,card)),target=[...s.heroes,...s.monsters,...HQ.dungeon.doors(s)].find(f=>f.id===initialTargetId);
      const first=target?usable.find(card=>!HQ.spells.reason(s,hero,card,target,card.id==="genie"&&HQ.dungeon.doors(s).some(d=>d.id===initialTargetId)?"door":"attack")):null;
      selectCard(first?.id||usable[0]?.id||book[0]?.id||null,{instant:true});showDrawer();
    }
    $("spell-previous").addEventListener("click",()=>cycle(-1));$("spell-next").addEventListener("click",()=>cycle(1));
    cards.addEventListener("keydown",event=>{if(["ArrowLeft","ArrowRight","Home","End"].includes(event.key)){event.preventDefault();if(event.key==="Home"||event.key==="End")selectCard(book[event.key==="Home"?0:book.length-1]?.id,{focus:true});else cycle(event.key==="ArrowLeft"?-1:1,true);}});
    cards.addEventListener("pointerdown",event=>{
      if(!event.isPrimary){cancelInteraction();return;}
      if(event.button!==0||book.length<2)return;
      stopMotion();
      const step=Math.max(32,buttons[0].offsetWidth*.9);
      gesture={id:event.pointerId,x:event.clientX,y:event.clientY,from:position,step,locked:false,samples:[{time:performance.now(),position}]};
    });
    cards.addEventListener("pointermove",event=>{
      if(!gesture||gesture.id!==event.pointerId)return;
      if(event.pointerType==="mouse"&&!(event.buttons&1)){finishGesture();return;}
      const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
      if(!gesture.locked) {
        // Leave vertical thumb movement to native scrolling/pinch zoom.
        if(Math.abs(dy)>10&&Math.abs(dy)>Math.abs(dx)){finishGesture();return;}
        if(Math.abs(dx)<8||Math.abs(dx)<=Math.abs(dy))return;
        gesture.locked=true;cards.setPointerCapture(event.pointerId);cards.classList.add("is-dragging");
      }
      event.preventDefault();
      position=gesture.from-dx/gesture.step;
      const now=performance.now();gesture.samples.push({time:now,position});
      while(gesture.samples.length>2&&now-gesture.samples[0].time>90)gesture.samples.shift();
      cast.disabled=true;layout();
    });
    cards.addEventListener("pointerup",event=>{if(gesture?.id===event.pointerId)finishGesture(true);});
    cards.addEventListener("pointercancel",event=>{if(gesture?.id===event.pointerId)finishGesture();});
    cards.addEventListener("lostpointercapture",event=>{if(gesture?.id===event.pointerId)finishGesture();});
    cards.addEventListener("pointerleave",()=>{if(gesture&&!gesture.locked)finishGesture();});
    $("spell-dialog").addEventListener("close",()=>{cancelInteraction();$("open-spellbook").setAttribute("aria-expanded",String($("spell-dialog").open));});
    $("spell-dialog").addEventListener("keydown",event=>{if(event.key==="Escape"){event.preventDefault();event.stopPropagation();HQ.dialogs.close("spell-dialog");$("open-spellbook").focus({preventScroll:true});}});
    window.addEventListener("blur",cancelInteraction);window.addEventListener("resize",cancelInteraction);
    reduced.addEventListener("change",cancelInteraction);
    document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")cancelInteraction();});
    mode.addEventListener("change",()=>{targetId=null;populateTargets();});
    cast.addEventListener("click",()=>{if(cast.disabled)return;if(!targetId){chooseTarget();return;}castSelected();});
    return Object.freeze({show,close:()=>HQ.dialogs.close("spell-dialog")});
  };
})();

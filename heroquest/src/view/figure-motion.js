(function () {
  "use strict";
  const HQ = window.HeroQuest, T = window.HQThree, Topo = HQ.topology;

  // Whole-piece presentation only. No commands, dice or authoritative state.
  HQ.createFigureMotion = function ({entities, facings, ring, target, world,
    heroPosition, reducedMotion, contextReady, follow, requestRender, invalidateShadows}) {
    const stepDuration = 300, hopHeight = .12;
    let movement = null, figureEffect = null;
    function direction(from,to){const [x,row]=Topo.parse(from),[nextX,nextRow]=Topo.parse(to);return Math.atan2(nextX-x,nextRow-row);}
    function placeMovingHero(point) {
      if(follow()&&movement.model.visible){target.x=point.x;target.y=.4;target.z=point.z;}
      movement.model.position.copy(point);if(movement.movesRing)ring.position.set(point.x,.162,point.z);
    }
    function finishMovement() {
      if(!movement)return;
      placeMovingHero(movement.points[movement.points.length-1]);
      movement.model.rotation.y=movement.headings[movement.headings.length-1];
      const resolve=movement.resolve;movement=null;resolve();requestRender();
    }
    function advanceMovement(time) {
      if(!movement)return;
      if(movement.started===null)movement.started=time;
      const elapsed=(time-movement.started)/movement.duration,step=Math.floor(elapsed);
      if(step>=movement.points.length-1){finishMovement();return;}
      const progress=elapsed-step,eased=progress*progress*(3-2*progress);
      if(movement.segment!==step){movement.segment=step;movement.fromYaw=movement.model.rotation.y;}
      const yawDelta=Math.atan2(Math.sin(movement.headings[step]-movement.fromYaw),Math.cos(movement.headings[step]-movement.fromYaw));
      const turn=Math.min(1,progress/.4),turnEase=turn*turn*(3-2*turn);
      movement.model.rotation.y=movement.fromYaw+yawDelta*turnEase;
      movement.point.lerpVectors(movement.points[step],movement.points[step+1],eased);
      movement.point.y+=Math.sin(progress*Math.PI)*movement.hopHeight;
      placeMovingHero(movement.point);
    }
    function animateMovement(motion) {
      finishFigureEffect();
      finishMovement();
      const headings=motion.path.map((id,i)=>direction(i?motion.path[i-1]:motion.from,id));
      if(headings.length)facings.set(motion.actorId,headings[headings.length-1]);
      const entry=entities.get(motion.actorId);
      if(!entry||!entry.model.visible||!motion.path.length||reducedMotion.matches||!contextReady()||document.visibilityState==="hidden")return Promise.resolve();
      return new Promise(resolve=>{
        const movesRing=entry.type==="hero";
        movement={duration:motion.jump?600:stepDuration,hopHeight:motion.jump?.38:hopHeight,model:entry.model,movesRing,headings,segment:-1,fromYaw:entry.model.rotation.y,points:[motion.from,...motion.path].map(id=>movesRing?heroPosition(id):world(id,.15)),point:new T.Vector3(),started:null,resolve};
        entry.model.position.copy(movement.points[0]);requestRender();
      });
    }
    const smooth=value=>{const t=T.MathUtils.clamp(value,0,1);return t*t*(3-2*t);};
    function finishFigureEffect() {
      if(!figureEffect)return;
      const effect=figureEffect;figureEffect=null;
      effect.model.position.copy(effect.origin);
      effect.model.visible=false;
      for(const [mesh,original,clones,shadow] of effect.materials) {
        mesh.material=original;mesh.castShadow=shadow;for(const material of clones)material.dispose();
      }
      invalidateShadows();effect.resolve();requestRender();
    }
    function advanceFigureEffect(time) {
      if(!figureEffect)return;
      const effect=figureEffect;if(effect.started===null)effect.started=time;
      const elapsed=time-effect.started;
      if(elapsed>=effect.duration){finishFigureEffect();return;}
      const t=elapsed/effect.duration,fall=smooth(t),fade=smooth((t-.18)/.82);
      effect.model.position.copy(effect.origin);effect.model.position.y-=effect.sinkDepth*fall;
      for(const [, ,materials] of effect.materials)for(const material of materials)material.opacity=material.userData.defeatOpacity*(1-fade);
    }

    function animateDefeat(defenderId) {
      finishMovement();finishFigureEffect();
      const entry=entities.get(defenderId);
      if(!entry?.model.visible)return Promise.resolve();
      if(reducedMotion.matches||!contextReady()||document.visibilityState==="hidden"){entry.model.visible=false;invalidateShadows();requestRender();return Promise.resolve();}
      const sinkDepth=Math.max(.32,new T.Box3().setFromObject(entry.model).max.y-entry.model.position.y+.08);
      return new Promise(resolve=>{
        const materials=[];
        entry.model.traverse(mesh=>{
          if(!mesh.material)return;
          const original=mesh.material,clones=(Array.isArray(original)?original:[original]).map(material=>{
            const copy=material.clone();copy.userData.defeatOpacity=copy.opacity;copy.transparent=true;copy.depthWrite=false;return copy;
          });
          materials.push([mesh,original,clones,mesh.castShadow]);mesh.material=Array.isArray(original)?clones:clones[0];mesh.castShadow=false;
        });
        figureEffect={kind:"defeat",model:entry.model,origin:entry.model.position.clone(),sinkDepth,materials,started:null,duration:700,resolve};requestRender();
      });
    }
    return Object.freeze({
      animateMovement, animateDefeat,
      update(time) { advanceMovement(time); advanceFigureEffect(time); },
      finish() { finishMovement(); finishFigureEffect(); },
      get active() { return Boolean(movement || figureEffect); },
      get movingId() { return movement?.model.userData.entityId; }
    });
  };
})();

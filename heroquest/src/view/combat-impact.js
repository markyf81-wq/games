(function () {
  "use strict";
  const HQ=window.HeroQuest,T=window.HQThree;
  // One cached health number at a time; outcomes already belong to the engine.
  HQ.createCombatImpact=function({scene,entities,facings,reducedMotion,contextReady,requestRender,invalidateShadows}) {
    const canvas=document.createElement("canvas");canvas.width=192;canvas.height=96;
    const ctx=canvas.getContext("2d"),texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.generateMipmaps=false;texture.minFilter=T.LinearFilter;
    const material=new T.SpriteMaterial({map:texture,transparent:true,opacity:0,depthTest:false,depthWrite:false,toneMapped:false});
    const number=new T.Sprite(material);number.name="Body change";number.visible=false;number.scale.set(.8,.4,1);number.renderOrder=1010;number.raycast=()=>{};number.userData.visualEffect=true;scene.add(number);
    let effect=null,generation=0;
    const available=()=>contextReady()&&document.visibilityState!=="hidden";
    function pose(model,direction){return {model,origin:model.position.clone(),rotation:model.rotation.clone(),direction,done:false};}
    function restore(saved){if(saved){saved.model.position.copy(saved.origin);saved.model.rotation.copy(saved.rotation);}}
    function finish() {
      if(!effect)return;const ended=effect;effect=null;clearTimeout(ended.timer);
      restore(ended.attack);restore(ended.recoil);
      if(ended.attack||ended.recoil)invalidateShadows();
      number.visible=false;material.opacity=0;ended.resolve();requestRender();
    }
    function playChange(change,report,{recoil=true,recoilDirection=null}={}) {
      finish();
      const defender=entities.get(change.id),attacker=report&&entities.get(report.attackerId);
      if(!available()||!defender?.model.visible||!Number.isFinite(change.delta)||change.delta===0)return Promise.resolve();
      const reduced=reducedMotion.matches,damaged=change.delta<0;
      const shove=!reduced&&damaged&&report?.defenderId===change.id&&report.type==="combat"&&!report.spellId&&attacker?.model.visible?attacker.model:null;
      const direction=shove?defender.model.position.clone().sub(shove.position):new T.Vector3();direction.y=0;
      if(direction.lengthSq()>.001){direction.normalize();const yaw=Math.atan2(direction.x,direction.z);facings.set(report.attackerId,yaw);shove.rotation.y=yaw;}
      // Recoil away from a known damage source. Hazards/self damage have no
      // incoming direction, so use backwards relative to the victim's facing.
      const hitDirection=recoilDirection?recoilDirection.clone():report?.defenderId===change.id&&attacker&&attacker!==defender
        ?defender.model.position.clone().sub(attacker.model.position):new T.Vector3();hitDirection.y=0;
      if(hitDirection.lengthSq()>.001)hitDirection.normalize();
      else {const yaw=defender.model.rotation.y;hitDirection.set(-Math.sin(yaw),0,-Math.cos(yaw));}
      ctx.clearRect(0,0,canvas.width,canvas.height);ctx.font="bold 48px Arial";ctx.textAlign="center";ctx.textBaseline="middle";ctx.lineJoin="round";
      const healing=change.delta>0,label=(healing?"+":"−")+Math.abs(change.delta);
      ctx.strokeStyle=healing?"#10261c":"#230d12";ctx.lineWidth=6;ctx.strokeText(label,96,50);ctx.fillStyle=healing?"#8defaa":"#ff8174";ctx.fillText(label,96,50);texture.needsUpdate=true;
      // Keep the label near the head, rather than above a raised sword where
      // it would start outside the close attack camera's field of view.
      const bounds=new T.Box3().setFromObject(defender.model),height=T.MathUtils.clamp((bounds.max.y-defender.model.position.y)*.62,.6,1.25)+.12;
      return new Promise(resolve=>{
        const contact=shove?130:0,duration=reduced?700:contact+950;
        effect={attack:shove?pose(shove,direction):null,recoil:!reduced&&damaged&&recoil?pose(defender.model,hitDirection):null,defender:defender.model,height,
          reduced,contact,duration,started:null,resolve,timer:setTimeout(finish,duration+400)};
        update(performance.now());requestRender();
      });
    }
    async function playChanges(changes,report=null,options={}) {
      const token=++generation;finish();
      for(const change of changes){if(token!==generation)break;await playChange(change,report,options);}
    }
    function play(report){return playChanges([{id:report.defenderId,delta:report.bodyAfter-report.bodyBefore}],report);}
    function cancel(){generation++;finish();}
    function shovePose(saved,elapsed) {
      if(!saved||saved.done||elapsed<0)return false;
      const t=Math.min(1,elapsed/420),smooth=t*t*(3-2*t),push=t===1?0:Math.sin(Math.PI*smooth);saved.done=t===1;
      saved.model.position.copy(saved.origin).addScaledVector(saved.direction,.18*push);
      saved.model.rotation.x=saved.rotation.x+saved.direction.z*.045*push;
      saved.model.rotation.z=saved.rotation.z-saved.direction.x*.045*push;
      return true;
    }
    function update(time) {
      if(!effect)return;if(!available()){finish();return;}
      const e=effect;if(e.started===null)e.started=time;
      const elapsed=time-e.started;if(elapsed>=e.duration){finish();return;}
      const attacked=shovePose(e.attack,elapsed),recoiled=shovePose(e.recoil,elapsed-e.contact);
      if(attacked||recoiled)invalidateShadows();
      number.visible=elapsed>=e.contact&&e.defender.visible;
      const age=T.MathUtils.clamp((elapsed-e.contact)/(e.duration-e.contact),0,1);
      number.position.copy(e.defender.position);number.position.y+=e.height+(e.reduced?0:age*.65);
      material.opacity=e.reduced?1:Math.min(1,age/.08)*(1-T.MathUtils.smoothstep(age,.65,1));
    }
    return Object.freeze({play,playChanges,update,finish:cancel,get active(){return Boolean(effect);}});
  };
})();

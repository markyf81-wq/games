(function () {
  "use strict";
  const HQ=window.HeroQuest,T=window.HQThree;
  // One cached health number at a time; outcomes already belong to the engine.
  HQ.createCombatImpact=function({scene,entities,facings,reducedMotion,contextReady,requestRender,invalidateShadows}) {
    const canvas=document.createElement("canvas");canvas.width=192;canvas.height=96;
    const ctx=canvas.getContext("2d"),texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.generateMipmaps=false;texture.minFilter=T.LinearFilter;
    const material=new T.SpriteMaterial({map:texture,transparent:true,opacity:0,depthTest:false,depthWrite:false,toneMapped:false});
    const number=new T.Sprite(material);number.name="Body change";number.visible=false;number.scale.set(.8,.4,1);number.renderOrder=1010;number.raycast=()=>{};number.userData.visualEffect=true;scene.add(number);
    const block=new T.Group(),shieldShape=new T.Shape();
    shieldShape.moveTo(-.23,.25);shieldShape.lineTo(0,.32);shieldShape.lineTo(.23,.25);shieldShape.lineTo(.20,-.08);shieldShape.quadraticCurveTo(.14,-.25,0,-.34);shieldShape.quadraticCurveTo(-.14,-.25,-.20,-.08);shieldShape.closePath();
    const blockMaterial=new T.MeshBasicMaterial({color:0x9edfff,transparent:true,opacity:0,depthWrite:false,toneMapped:false,side:T.DoubleSide});
    const shieldGeometry=new T.ShapeGeometry(shieldShape),shield=new T.Mesh(shieldGeometry,blockMaterial);
    const rimMaterial=new T.LineBasicMaterial({color:0xf3fbff,transparent:true,opacity:0,depthWrite:false,toneMapped:false});
    const rim=new T.LineSegments(new T.EdgesGeometry(shieldGeometry),rimMaterial);
    const sparkMaterial=new T.MeshBasicMaterial({color:0xffe1a2,transparent:true,opacity:0,depthWrite:false,toneMapped:false});
    const sparks=new T.InstancedMesh(new T.SphereGeometry(.014,5,3),sparkMaterial,12),sparkPose=new T.Object3D();
    sparks.instanceMatrix.setUsage(T.DynamicDrawUsage);sparks.frustumCulled=false;block.add(shield,rim,sparks);block.name="Defence block";block.visible=false;
    block.traverse(part=>{part.userData.visualEffect=true;part.raycast=()=>{};part.castShadow=false;});scene.add(block);
    const bolt=new T.Group(),wood=new T.MeshStandardMaterial({color:0x735039,roughness:.8}),steel=new T.MeshStandardMaterial({color:0xc2cbd0,metalness:.65,roughness:.3}),feather=new T.MeshStandardMaterial({color:0xd8d1b7,roughness:.9});
    const shaft=new T.Mesh(new T.CylinderGeometry(.014,.014,.38,6).rotateX(Math.PI/2),wood);
    const tip=new T.Mesh(new T.ConeGeometry(.037,.12,4).rotateX(Math.PI/2),steel);tip.position.z=.23;
    const fins=new T.Mesh(new T.BoxGeometry(.10,.014,.12),feather),crossFin=new T.Mesh(new T.BoxGeometry(.014,.10,.12),feather);fins.position.z=crossFin.position.z=-.15;
    bolt.add(shaft,tip,fins,crossFin);bolt.name="Crossbow bolt";bolt.visible=false;
    bolt.traverse(part=>{part.userData.visualEffect=true;part.raycast=()=>{};part.castShadow=false;});scene.add(bolt);
    const dagger=new T.Group(),bladeShape=new T.Shape();
    bladeShape.moveTo(-.045,0);bladeShape.lineTo(-.045,.25);bladeShape.lineTo(0,.4);bladeShape.lineTo(.045,.25);bladeShape.lineTo(.045,0);bladeShape.closePath();
    const blade=new T.Mesh(new T.ExtrudeGeometry(bladeShape,{depth:.018,bevelEnabled:false}).rotateX(Math.PI/2),steel);blade.position.y=.009;
    const guard=new T.Mesh(new T.BoxGeometry(.18,.035,.035),steel);
    const grip=new T.Mesh(new T.CylinderGeometry(.022,.022,.16,6).rotateX(Math.PI/2),wood);grip.position.z=-.1;
    const pommel=new T.Mesh(new T.SphereGeometry(.027,6,4),steel);pommel.position.z=-.20;
    dagger.add(blade,guard,grip,pommel);dagger.name="Thrown Dagger";dagger.visible=false;
    dagger.traverse(part=>{part.userData.visualEffect=true;part.raycast=()=>{};part.castShadow=false;});scene.add(dagger);
    let effect=null,generation=0;
    const available=()=>contextReady()&&document.visibilityState!=="hidden";
    function pose(model,direction){return {model,origin:model.position.clone(),rotation:model.rotation.clone(),direction,done:false};}
    function restore(saved){if(saved){saved.model.position.copy(saved.origin);saved.model.rotation.copy(saved.rotation);}}
    function finish() {
      if(!effect)return;const ended=effect;effect=null;clearTimeout(ended.timer);
      restore(ended.attack);restore(ended.recoil);
      if(ended.attack||ended.recoil)invalidateShadows();
      number.visible=false;material.opacity=0;block.visible=false;bolt.visible=false;dagger.visible=false;ended.resolve();requestRender();
    }
    function playProjectile(report){
      finish();const attacker=entities.get(report.attackerId),defender=entities.get(report.defenderId);
      if(!available()||reducedMotion.matches||!attacker?.model.visible||!defender?.model.visible)return Promise.resolve();
      const projectile=report.thrownItemId?dagger:bolt;
      const from=attacker.model.position.clone(),to=defender.model.position.clone();
      const height=entry=>T.MathUtils.clamp((new T.Box3().setFromObject(entry.model).max.y-entry.model.position.y)*.48,.55,1.15);
      from.y+=height(attacker);to.y+=height(defender);
      const direction=to.clone().sub(from).normalize();from.addScaledVector(direction,.35);
      const miss=report.skulls===0,forward=new T.Vector3(0,0,1),tangent=new T.Vector3();
      let restRotation=null,impactRotation=null;
      if(miss){
        // Drop short into the next tile along the shooter's eight-way facing.
        // This only presents the saved miss; it cannot hit another occupant.
        const angle=Math.round(Math.atan2(direction.x,direction.z)/(Math.PI/4))*Math.PI/4;
        const dx=Math.round(Math.sin(angle)),dz=Math.round(Math.cos(angle));
        const landing=HQ.topology.key(attacker.item.x+dx,attacker.item.row+dz);
        to.copy(attacker.model.position);to.x+=dx;to.z+=dz;to.y=.15+(HQ.topology.stairs.has(landing)?.05:0)+.055;
        tangent.subVectors(to,from);tangent.y-=Math.PI*.12;
        impactRotation=new T.Quaternion().setFromUnitVectors(forward,tangent.normalize());
        restRotation=new T.Quaternion().setFromUnitVectors(forward,new T.Vector3(direction.x,0,direction.z).normalize());
      }
      const flight=miss?480:T.MathUtils.clamp(from.distanceTo(to)*85,320,850),duration=flight+(miss?450:0);
      return new Promise(resolve=>{
        effect={kind:"projectile",projectile,from,to,miss,flight,forward,tangent,restRotation,impactRotation,duration,started:null,resolve,timer:setTimeout(finish,duration+400)};
        projectile.position.copy(from);projectile.lookAt(to);projectile.visible=true;update(performance.now());requestRender();
      });
    }
    function playBlock(report){
      finish();const defender=entities.get(report.defenderId),attacker=entities.get(report.attackerId);
      if(!available()||!defender?.model.visible)return Promise.resolve();
      const direction=attacker?attacker.model.position.clone().sub(defender.model.position):new T.Vector3(0,0,1);direction.y=0;
      if(direction.lengthSq()<.001)direction.set(0,0,1);direction.normalize();
      const bounds=new T.Box3().setFromObject(defender.model),height=T.MathUtils.clamp((bounds.max.y-defender.model.position.y)*.48,.5,.95);
      block.position.copy(defender.model.position).addScaledVector(direction,.34);block.position.y+=height;
      block.rotation.y=Math.atan2(direction.x,direction.z);
      const reduced=reducedMotion.matches,duration=reduced?300:480;
      return new Promise(resolve=>{
        effect={kind:"block",defender:defender.model,reduced,duration,started:null,resolve,timer:setTimeout(finish,duration+400)};
        update(performance.now());requestRender();
      });
    }
    function playChange(change,report,{recoil=true,recoilDirection=null}={}) {
      finish();
      const defender=entities.get(change.id),attacker=report&&entities.get(report.attackerId);
      if(!available()||!defender?.model.visible||!Number.isFinite(change.delta)||change.delta===0)return Promise.resolve();
      const reduced=reducedMotion.matches,damaged=change.delta<0;
      const shove=!reduced&&damaged&&report?.defenderId===change.id&&report.type==="combat"&&!report.spellId&&report.weaponId!=="crossbow"&&!report.thrownItemId&&attacker?.model.visible?attacker.model:null;
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
    async function play(report){
      const token=++generation;finish();
      if(report.weaponId==="crossbow"||report.thrownItemId)await playProjectile(report);
      if(token!==generation)return;
      if(report.type==="combat"&&report.skulls>0&&report.shields>0)await playBlock(report);
      if(token===generation)await playChange({id:report.defenderId,delta:report.bodyAfter-report.bodyBefore},report);
    }
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
      if(e.kind==="projectile"){
        const age=Math.min(1,elapsed/e.flight),projectile=e.projectile;projectile.position.lerpVectors(e.from,e.to,age);
        if(e.miss){
          if(age<1){
            projectile.position.y+=Math.sin(Math.PI*age)*.12;
            e.tangent.subVectors(e.to,e.from);e.tangent.y+=Math.cos(Math.PI*age)*Math.PI*.12;
            projectile.quaternion.setFromUnitVectors(e.forward,e.tangent.normalize());
          }else projectile.quaternion.slerpQuaternions(e.impactRotation,e.restRotation,Math.min(1,(elapsed-e.flight)/100));
        }
        return;
      }
      if(e.kind==="block"){
        const age=elapsed/e.duration,flash=e.reduced?1:Math.min(1,age/.12)*(1-T.MathUtils.smoothstep(age,.4,1));
        block.visible=e.defender.visible;block.scale.setScalar(e.reduced?1:.82+.22*Math.sin(Math.PI*age));
        blockMaterial.opacity=.32*flash;rimMaterial.opacity=flash;sparkMaterial.opacity=.95*flash;sparks.visible=!e.reduced;
        for(let i=0;i<sparks.count;i++){
          const angle=i*Math.PI*2/sparks.count,distance=.16+age*(.3+(i%3)*.06);
          sparkPose.position.set(Math.cos(angle)*distance,Math.sin(angle)*distance,age*.12);sparkPose.scale.setScalar(1-age*.7);sparkPose.updateMatrix();sparks.setMatrixAt(i,sparkPose.matrix);
        }
        sparks.instanceMatrix.needsUpdate=true;return;
      }
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

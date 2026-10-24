(function () {
  "use strict";
  const HQ=window.HeroQuest,T=window.HQThree;

  // Transient presentation camera. The ordinary board camera remains the saved
  // view; this controller never reads hidden actors or resolves combat.
  HQ.createCombatCamera=function ({entities,facings,boardCamera,boardTarget,
    reducedMotion,contextReady,requestRender,onChange}) {
    const camera=new T.PerspectiveCamera(64,1,.035,150),focus=new T.Vector3();
    const parallelProjection=new T.Matrix4();
    const approachDuration=1000,pauseDuration=120,returnDuration=900;
    // Eye heights above the fitted miniature anchor, excluding raised weapons.
    const eyes={barbarian:1.02,dwarf:.74,elf:1.02,wizard:1.05,goblin:.66,
      orc:.94,skeleton:1.04,zombie:1.02,mummy:1.05,fimir:1.04,
      "chaos-warrior":1.12,gargoyle:1.18};
    const headPosition=new T.Vector3(),aimDirection=new T.Vector3(),aimRotation=new T.Quaternion(),hiddenModels=[];
    let shot=null,flight=null,lastTime=0;
    // Zero velocity and acceleration at both ends, including the focus blend.
    const smooth=t=>{t=T.MathUtils.clamp(t,0,1);return t*t*t*(t*(t*6-15)+10);};
    function aimAt(start,aim,t,result){return result.lerpVectors(start,aim,smooth(t/.45));}
    function makeTravelMap(path,start,aim) {
      // Budget time for turning as well as travel. A plain curve parameter can
      // spend most of the flight descending, then cram the head-level turn into
      // its final few frames. Cache this map once; position/aim still stay paired.
      const count=128,samples=[{distance:0,angle:0}],point=new T.Vector3(),look=new T.Vector3(),probe=new T.PerspectiveCamera();
      const previous=path.getPoint(0);probe.position.copy(previous);probe.lookAt(start);
      const previousRotation=probe.quaternion.clone();
      let distance=0,angle=0;
      for(let i=1;i<=count;i++){
        const t=i/count;path.getPoint(t,point);aimAt(start,aim,t,look);
        probe.position.copy(point);probe.lookAt(look);
        distance+=point.distanceTo(previous);angle+=previousRotation.angleTo(probe.quaternion);
        samples.push({distance,angle});previous.copy(point);previousRotation.copy(probe.quaternion);
      }
      const turnWeight=angle>.0001 ? .6 : 0;
      return samples.map(sample=>(1-turnWeight)*sample.distance/Math.max(.0001,distance)+turnWeight*sample.angle/Math.max(.0001,angle));
    }
    function travelParameter(map,progress) {
      if(progress<=0)return 0;if(progress>=1)return 1;
      let low=1,high=map.length-1;
      while(low<high){const mid=(low+high)>>1;if(map[mid]<progress)low=mid+1;else high=mid;}
      const fraction=(progress-map[low-1])/Math.max(.000001,map[low]-map[low-1]);
      return (low-1+fraction)/(map.length-1);
    }
    const available=()=>!reducedMotion.matches&&contextReady()&&document.visibilityState!=="hidden";
    function changed(){onChange();requestRender();}
    function settle() {
      if(!flight)return;
      const finished=flight;flight=null;
      if(finished.returning){shot=null;changed();}
      finished.resolve();
    }
    function finish() {
      // Interruption always returns to the board and releases the session gate.
      const pending=flight;flight=null;shot=null;changed();pending?.resolve();
    }
    function actorPose(model,direction,eyeHeight,style,aim,eye,target){
      const firstPerson=style==="first-person";
      eye.copy(model.position).addScaledVector(direction,firstPerson ? .06 : -1.65);
      eye.y+=eyeHeight+(firstPerson?0:.85);
      if(aim){target.copy(aim);if(!firstPerson)target.lerp(headPosition.copy(model.position).add(new T.Vector3(0,.65,0)),.25);}
      else {target.copy(model.position).addScaledVector(direction,firstPerson?3:1.25);target.y+=firstPerson?eyeHeight-.12:.65;}
    }
    function enterActor(attackerId,{targetId=null,point=null,heading=null,track=false,style="shoulder"}={}) {
      const attacker=entities.get(attackerId),defender=targetId&&entities.get(targetId);
      if(!attacker?.model.visible||targetId&&!defender?.model.visible)return leave();
      const eyeHeight=eyes[attacker.item.kind]??1.02;
      const aim=point?.clone()||(defender&&defender!==attacker?defender.model.position.clone().add(new T.Vector3(0,(eyes[defender.item.kind]??1.02)*.76,0)):null);
      const direction=aim?aim.clone().sub(attacker.model.position):new T.Vector3(Math.sin(heading??attacker.model.rotation.y),0,Math.cos(heading??attacker.model.rotation.y));direction.y=0;
      if(direction.lengthSq()<.0001)direction.set(Math.sin(attacker.model.rotation.y),0,Math.cos(attacker.model.rotation.y));direction.normalize();
      const facing=Math.atan2(direction.x,direction.z);
      facings.set(attackerId,facing);attacker.model.rotation.y=facing;
      if(!available()){changed();return Promise.resolve();}
      const eye=new T.Vector3(),target=new T.Vector3(),fov=style==="first-person"?64:58;
      actorPose(attacker.model,direction,eyeHeight,style,aim,eye,target);
      // Linked actions and consecutive visible CPU actors move directly from
      // the displayed close view, without revisiting the isometric camera.
      if(shot?.blend===1&&!flight){
        const hideActors=shot.hideActors.filter(entry=>{headPosition.copy(entry.model.position);headPosition.y+=entry.height;return camera.position.distanceToSquared(headPosition)<.65*.65;});
        if(style==="first-person"&&!hideActors.some(entry=>entry.model===attacker.model))hideActors.push({model:attacker.model,height:eyeHeight});
        shot.actorId=attackerId;shot.attacker=attacker.model;shot.eyeHeight=eyeHeight;shot.style=style;shot.hideActors=hideActors;
        shot.track=false;
        const fromEye=shot.eye.clone(),fromRotation=camera.quaternion.clone(),toRotation=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().lookAt(eye,target,new T.Vector3(0,1,0)));
        const rise=Math.min(.35,fromEye.distanceTo(eye)*.12),firstBend=fromEye.clone(),lastBend=eye.clone();firstBend.y+=rise;lastBend.y+=rise;
        const path=new T.CubicBezierCurve3(fromEye,firstBend,lastBend,eye);
        return new Promise(resolve=>{flight={retarget:true,started:null,duration:style==="first-person"?900:750,path,fromRotation,toRotation,fromDistance:shot.eye.distanceTo(shot.aim),toDistance:eye.distanceTo(target),fromFov:shot.fov,toFov:fov,trackAfter:track,directionAfter:direction,resolve};changed();});
      }
      finish();
      boardCamera.updateMatrixWorld();
      // Bird-like swoop: descend steeply first, then pull out behind the head.
      // The final control point shares eye height, giving a level end tangent
      // along the attack direction without a sideways orbit or vertical dip.
      const origin=boardCamera.position.clone(),approach=eye.clone().addScaledVector(direction,-1.1);
      const bend=origin.clone().lerp(approach,.25);
      bend.y=T.MathUtils.lerp(eye.y,origin.y,style==="first-person" ? .2 : .45);
      const path=new T.CubicBezierCurve3(origin,bend,approach,eye);
      const distance=eye.distanceTo(target),height=distance*Math.tan(T.MathUtils.degToRad(fov/2));
      const startFocus=boardTarget.clone(),travelMap=makeTravelMap(path,startFocus,target);
      shot={actorId:attackerId,attacker:attacker.model,eye,aim:target,path,travelMap,startFocus,startNear:boardCamera.near,
        startHeight:boardCamera.top,endHeight:height,blend:0,track,eyeHeight,direction,style,fov,
        hideActors:style==="first-person"?[{model:attacker.model,height:eyeHeight}]:[],
        desiredEye:eye.clone(),desiredAim:target.clone()};lastTime=0;
      const approachTime=style==="first-person"?1400:approachDuration,pause=style==="first-person"?350:pauseDuration;
      return new Promise(resolve=>{flight={returning:false,started:null,approach:approachTime,duration:approachTime+pause,resolve};changed();});
    }
    function enter(attackerId,defenderId,firstPerson=false){return enterActor(attackerId,{targetId:defenderId,style:firstPerson?"first-person":"shoulder"});}
    function hold(duration=450){
      if(!shot||!available())return Promise.resolve();
      settle();return new Promise(resolve=>{flight={holding:true,started:null,duration,resolve};changed();});
    }
    function leave() {
      if(!shot)return Promise.resolve();
      if(!available()){finish();return Promise.resolve();}
      settle();
      if(!shot)return Promise.resolve();
      shot.track=false;shot.travelMap=makeTravelMap(shot.path,shot.startFocus,shot.aim);
      return new Promise(resolve=>{flight={returning:true,started:null,duration:returnDuration,from:shot.blend,resolve};changed();});
    }
    function update(time,aspect) {
      if(!shot)return;
      const dt=lastTime?Math.min(.05,Math.max(0,(time-lastTime)/1000)):.016;lastTime=time;
      if(shot.track&&shot.blend===1&&(!flight||flight.holding)){
        const heading=shot.attacker.rotation.y,weight=1-Math.exp(-dt*8),turnWeight=1-Math.exp(-dt*5);
        const fromYaw=Math.atan2(shot.direction.x,shot.direction.z),yaw=fromYaw+Math.atan2(Math.sin(heading-fromYaw),Math.cos(heading-fromYaw))*turnWeight;
        shot.direction.set(Math.sin(yaw),0,Math.cos(yaw));
        actorPose(shot.attacker,shot.direction,shot.eyeHeight,shot.style,null,shot.desiredEye,shot.desiredAim);
        const verticalWeight=1-Math.exp(-dt*4);
        for(const axis of ["x","y","z"]){const blend=axis==="y"?verticalWeight:weight;shot.eye[axis]+=(shot.desiredEye[axis]-shot.eye[axis])*blend;shot.aim[axis]+=(shot.desiredAim[axis]-shot.aim[axis])*blend;}
        shot.endHeight=shot.eye.distanceTo(shot.aim)*Math.tan(T.MathUtils.degToRad(shot.fov/2));
        shot.path.v3.copy(shot.eye);shot.path.v2.copy(shot.eye).addScaledVector(shot.direction,-1.1);
      }
      if(flight) {
        if(flight.started===null)flight.started=time;
        const elapsed=time-flight.started;
        // Leave a short unobstructed view of the opponent before opening dice.
        if(flight.retarget){
          const progress=smooth(elapsed/flight.duration);flight.path.getPoint(progress,shot.eye);
          // Interpolated look-at points can cross the camera during a U-turn.
          // Blend orientation and a positive focus distance instead.
          aimRotation.copy(flight.fromRotation).slerp(flight.toRotation,progress);
          aimDirection.set(0,0,-1).applyQuaternion(aimRotation);
          shot.aim.copy(shot.eye).addScaledVector(aimDirection,T.MathUtils.lerp(flight.fromDistance,flight.toDistance,progress));
          shot.fov=T.MathUtils.lerp(flight.fromFov,flight.toFov,progress);
          shot.path.v3.copy(shot.eye);shot.endHeight=shot.eye.distanceTo(shot.aim)*Math.tan(T.MathUtils.degToRad(shot.fov/2));
        } else if(!flight.holding)shot.blend=flight.returning?flight.from*(1-smooth(elapsed/flight.duration)):smooth(elapsed/flight.approach);
        if(elapsed>=flight.duration){if(flight.retarget){shot.track=flight.trackAfter;shot.direction.copy(flight.directionAfter);shot.path.v2.copy(shot.eye).addScaledVector(shot.direction,-1.1);}settle();if(!shot)return;}
      }
      const t=travelParameter(shot.travelMap,shot.blend);
      shot.path.getPoint(t,camera.position);
      // Aim at a world point throughout the flight. Independent quaternion
      // interpolation can look away from both actors as the camera moves.
      aimAt(shot.startFocus,shot.aim,t,focus);
      camera.up.set(0,1,0);camera.lookAt(focus);
      // Match the board framing at the start, then dolly to an eye-level lens.
      // Interpolating the visible height avoids a zoom-out halfway through.
      const height=T.MathUtils.lerp(shot.startHeight,shot.endHeight,t);
      const distance=Math.max(.05,camera.position.distanceTo(focus));
      const perspective=smooth(t/.35);
      camera.near=T.MathUtils.lerp(shot.startNear,.035,perspective);
      camera.fov=T.MathUtils.radToDeg(2*Math.atan(height/distance));camera.aspect=aspect;
      camera.updateProjectionMatrix();
      // Blend homogeneous projections, normalized to the focus plane. At zero
      // this is exactly the board's orthographic lens at every scenery depth;
      // matching perspective FOV alone only matched one plane and caused a snap.
      parallelProjection.makeOrthographic(-height*aspect,height*aspect,height,-height,camera.near,camera.far);
      const elements=camera.projectionMatrix.elements,parallel=parallelProjection.elements;
      for(let i=0;i<16;i++)elements[i]=parallel[i]*(1-perspective)+elements[i]/distance*perspective;
      camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();camera.updateMatrixWorld();
    }
    function render(draw) {
      // Hide our own sculpt only while close to its head. Restore immediately
      // afterwards, so projection visibility and future attacks remain intact.
      hiddenModels.length=0;
      if(shot)for(const entry of shot.hideActors){
        headPosition.copy(entry.model.position);headPosition.y+=entry.height;
        if(entry.model.visible&&camera.position.distanceToSquared(headPosition)<.65*.65){hiddenModels.push(entry.model);entry.model.visible=false;}
      }
      try{draw();}finally{for(const model of hiddenModels)model.visible=true;hiddenModels.length=0;}
    }
    return Object.freeze({enter,enterActor,hold,leave,finish,update,render,
      get active(){return Boolean(shot);},get animating(){return Boolean(flight);},
      get camera(){return shot?camera:boardCamera;},get focus(){return shot?focus:boardTarget;}});
  };
})();

(function () {
  "use strict";
  const HQ=window.HeroQuest,T=window.HQThree;

  // Transient presentation camera. The ordinary board camera remains the saved
  // view; this controller never reads hidden actors or resolves combat.
  HQ.createCombatCamera=function ({entities,facings,boardCamera,boardTarget,
    reducedMotion,contextReady,requestRender,onChange}) {
    const camera=new T.PerspectiveCamera(64,1,.035,150),focus=new T.Vector3();
    const parallelProjection=new T.Matrix4();
    const approachDuration=1400,pauseDuration=350,returnDuration=1000;
    // Eye heights above the fitted miniature anchor, excluding raised weapons.
    const eyes={barbarian:1.02,dwarf:.74,elf:1.02,wizard:1.05,goblin:.66,
      orc:.94,skeleton:1.04,zombie:1.02,mummy:1.05,fimir:1.04,
      "chaos-warrior":1.12,gargoyle:1.18};
    let shot=null,flight=null;
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
    function enter(attackerId,defenderId) {
      finish();
      const attacker=entities.get(attackerId),defender=entities.get(defenderId);
      if(!attacker?.model.visible||!defender?.model.visible)return Promise.resolve();
      const direction=defender.model.position.clone().sub(attacker.model.position);direction.y=0;
      if(direction.lengthSq()<.0001)return Promise.resolve();direction.normalize();
      const heading=Math.atan2(direction.x,direction.z);
      facings.set(attackerId,heading);attacker.model.rotation.y=heading;
      if(!available()){changed();return Promise.resolve();}
      boardCamera.updateMatrixWorld();
      const eye=attacker.model.position.clone().addScaledVector(direction,.06);
      eye.y+=eyes[attacker.item.kind]??1.02;
      const aim=defender.model.position.clone();aim.y+=(eyes[defender.item.kind]??1.02)*.76;
      // Bird-like swoop: descend steeply first, then pull out behind the head.
      // The final control point shares eye height, giving a level end tangent
      // along the attack direction without a sideways orbit or vertical dip.
      const origin=boardCamera.position.clone(),approach=eye.clone().addScaledVector(direction,-1.1);
      const bend=origin.clone().lerp(approach,.25);
      bend.y=T.MathUtils.lerp(eye.y,origin.y,.2);
      const path=new T.CubicBezierCurve3(origin,bend,approach,eye);
      const distance=eye.distanceTo(aim),height=distance*Math.tan(T.MathUtils.degToRad(32));
      const startFocus=boardTarget.clone(),travelMap=makeTravelMap(path,startFocus,aim);
      shot={attacker:attacker.model,eye,aim,path,travelMap,startFocus,startNear:boardCamera.near,
        startHeight:boardCamera.top,endHeight:height,blend:0};
      return new Promise(resolve=>{flight={returning:false,started:null,duration:approachDuration+pauseDuration,resolve};changed();});
    }
    function leave() {
      if(!shot)return Promise.resolve();
      if(!available()){finish();return Promise.resolve();}
      settle();
      return new Promise(resolve=>{flight={returning:true,started:null,duration:returnDuration,from:shot.blend,resolve};changed();});
    }
    function update(time,aspect) {
      if(!shot)return;
      if(flight) {
        if(flight.started===null)flight.started=time;
        const elapsed=time-flight.started;
        // Leave a short unobstructed view of the opponent before opening dice.
        shot.blend=flight.returning?flight.from*(1-smooth(elapsed/flight.duration)):smooth(elapsed/approachDuration);
        if(elapsed>=flight.duration){settle();if(!shot)return;}
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
      const model=shot&&camera.position.distanceToSquared(shot.eye)<.65*.65?shot.attacker:null,visible=model?.visible;
      if(model)model.visible=false;
      try{draw();}finally{if(model)model.visible=visible;}
    }
    return Object.freeze({enter,leave,finish,update,render,
      get active(){return Boolean(shot);},get animating(){return Boolean(flight);},
      get camera(){return shot?camera:boardCamera;},get focus(){return shot?focus:boardTarget;}});
  };
})();

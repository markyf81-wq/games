(function () {
  "use strict";
  const HQ=window.HeroQuest,T=window.HQThree;
  // Displayed framing is separate from the caller's saved camera goals.
  HQ.createBoardCamera=function({camera,target,getFraming,aspect,reducedMotion,available,moving,requestRender}) {
    const focus=target.clone(),initial=getFraming(),pose={yaw:initial.yaw,elevation:initial.elevation,height:initial.halfHeight};
    const velocity={x:0,y:0,z:0,yaw:0,elevation:0,height:0};let lastTime=0,arrival=null;
    function finishWait(){if(!arrival)return;const ended=arrival;arrival=null;clearTimeout(ended.timer);ended.resolve();}
    function arrive({threshold=1.4,timeout=1600}={}) {
      finishWait();requestRender();
      if(reducedMotion.matches||!available()||focus.distanceTo(target)<=threshold)return Promise.resolve();
      return new Promise(resolve=>{arrival={resolve,timer:setTimeout(finishWait,timeout)};});
    }
    function update(time) {
      const dt=lastTime&&time-lastTime<100?Math.min(.032,(time-lastTime)/1000):.016;lastTime=time;let changed=false;
      const goals=getFraming(),omega=moving()?11:8;
      function spring(value,goal,key) {
        const error=value-goal,speed=velocity[key];
        if(reducedMotion.matches||Math.abs(error)<.0005&&Math.abs(speed)<.003){velocity[key]=0;return goal;}
        const b=speed+omega*error,decay=Math.exp(-omega*dt);velocity[key]=(speed-omega*b*dt)*decay;
        changed=true;return goal+(error+b*dt)*decay;
      }
      for(const axis of ["x","y","z"])focus[axis]=spring(focus[axis],target[axis],axis);
      pose.yaw=spring(pose.yaw,pose.yaw+Math.atan2(Math.sin(goals.yaw-pose.yaw),Math.cos(goals.yaw-pose.yaw)),"yaw");
      pose.elevation=spring(pose.elevation,goals.elevation,"elevation");pose.height=spring(pose.height,goals.halfHeight,"height");
      if(arrival&&focus.distanceTo(target)<.15)finishWait();return changed;
    }
    function project() {
      camera.left=-pose.height*aspect();camera.right=-camera.left;camera.top=pose.height;camera.bottom=-pose.height;camera.updateProjectionMatrix();
      camera.position.set(focus.x+Math.sin(pose.yaw)*Math.cos(pose.elevation)*45,focus.y+Math.sin(pose.elevation)*45,focus.z+Math.cos(pose.yaw)*Math.cos(pose.elevation)*45);
      camera.lookAt(focus);camera.updateMatrixWorld();
    }
    return Object.freeze({focus,update,project,arrive,finishWait});
  };
})();

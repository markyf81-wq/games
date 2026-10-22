(function () {
  "use strict";
  const HQ=window.HeroQuest,T=window.HQThree;
  // The supplied rubble tile stays at the foot of a solid wall-height plug.
  // Reuse the original wall sculpts; clipping belongs to the board wall layer.
  HQ.blockedScenery=Object.freeze({make(){
    const group=new T.Group(),base=HQ.stlModels.make("blocked");group.add(base);
    let height=0;
    function wall(kind,x,z,angle) {
      const model=HQ.stlModels.make(kind);model.position.set(x,0,z);model.rotation.y=angle;
      model.traverse(mesh=>{if(mesh.isMesh)mesh.userData.blockedStone=true;});group.add(model);
      height=Math.max(height,new T.Box3().setFromObject(model).max.y);
    }
    for(const [x,z,angle] of [[0,-.43,Math.PI],[.43,0,Math.PI/2],[0,.43,0],[-.43,0,-Math.PI/2]])wall("wall-one",x,z,angle);
    for(const x of [-.43,.43])for(const z of [-.43,.43])wall("wall-join",x,z,0);
    // The sculpted rubble closes the top; use stone for its moulded border too.
    const top=HQ.stlModels.make("blocked"),topHeight=new T.Box3().setFromObject(top).max.y;
    top.traverse(mesh=>{if(mesh.isMesh)mesh.material=HQ.models.material(0x938c78,.96);});
    top.position.y=height-topHeight;group.add(top);
    group.userData.blockedHeight=height;group.name="Blocked passage · stone plug";
    return group;
  }});
})();

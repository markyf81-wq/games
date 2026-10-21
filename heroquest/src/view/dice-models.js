(function () {
  "use strict";
  const HQ=window.HeroQuest,T=window.HQThree;
  const normals=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
  const ups=[[0,1,0],[0,1,0],[0,0,-1],[0,0,1],[0,1,0],[0,1,0]];
  const faces=normals.map((normal,i)=>({normal,up:ups[i],result:[1,6,2,5,3,4][i]}));
  const layouts={1:[[0,0]],2:[[-1,1],[1,-1]],3:[[-1,1],[0,0],[1,-1]],4:[[-1,1],[1,1],[-1,-1],[1,-1]],5:[[-1,1],[1,1],[0,0],[-1,-1],[1,-1]],6:[[-1,1],[1,1],[-1,0],[1,0],[-1,-1],[1,-1]]};
  let pipGeometry=null,pipMaterial=null,pipPlacements=null;
  function makeNumbered() {
    const group=new T.Group(),body=HQ.stlModels.make("movement-die-body");group.add(body);
    if(!pipPlacements) {
      pipGeometry=new T.CircleGeometry(.087,24);pipMaterial=new T.MeshStandardMaterial({color:0xfffbef,roughness:.45,polygonOffset:true,polygonOffsetFactor:-1});
      pipPlacements=[];body.updateWorldMatrix(true,true);
      const ray=new T.Raycaster(),forward=new T.Vector3(0,0,1);
      // Cache surface placements once: the supplied sculpt's faces have subtle
      // curvature, so pips follow its blank hull rather than an assumed cube.
      for(const face of faces) {
        const normal=new T.Vector3(...face.normal),up=new T.Vector3(...face.up),right=new T.Vector3().crossVectors(up,normal);
        for(const [x,y] of layouts[face.result]) {
          const offset=right.clone().multiplyScalar(x*.31).addScaledVector(up,y*.31);
          ray.set(offset.clone().addScaledVector(normal,2),normal.clone().negate());
          const hit=ray.intersectObject(body,true)[0];
          const position=hit?hit.point.clone().addScaledVector(normal,.002):offset.addScaledVector(normal,.751);
          pipPlacements.push({position,quaternion:new T.Quaternion().setFromUnitVectors(forward,normal)});
        }
      }
    }
    for(const placement of pipPlacements) {
      const pip=new T.Mesh(pipGeometry,pipMaterial);pip.position.copy(placement.position);pip.quaternion.copy(placement.quaternion);group.add(pip);
    }
    return group;
  }
  HQ.diceModels=Object.freeze({makeNumbered,faces});
})();

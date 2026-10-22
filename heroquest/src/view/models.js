(function () {
  "use strict";
  const HQ=window.HeroQuest,T=window.HQThree;
  if(!T)return;
  const materials=new Map();
  function material(colour,roughness=.72,metalness=0) {
    const key=colour+":"+roughness+":"+metalness;
    if(!materials.has(key))materials.set(key,new T.MeshStandardMaterial({color:colour,roughness,metalness}));
    return materials.get(key);
  }
  function box(group,w,h,d,surface,x=0,y=0,z=0) {
    const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),surface);
    mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;
    group.add(mesh);return mesh;
  }
  function makeProp(kind) {
    const M=HQ.models;
    if(kind==="bookcase")return M.make("bookcase");
    const group=new T.Group(),stone=M.material(0x8b8b7a,.98);
    if(kind==="stairs") {
      M.box(group,1.94,.04,1.94,stone,0,.02,0);
      const face=new T.Mesh(new T.PlaneGeometry(1.94,1.94),new T.MeshStandardMaterial({map:HQ.componentTextures.get("stairs"),roughness:1}));
      face.rotation.x=-Math.PI/2;face.position.y=.041;face.receiveShadow=true;group.add(face);
    } else throw new Error("No generated prop is configured for "+kind+".");
    return group;
  }
  HQ.models=Object.freeze({makeProp,make(kind,options){return kind==="blocked"?HQ.blockedScenery.make():HQ.stlModels.make(kind,options);},material,box});
})();

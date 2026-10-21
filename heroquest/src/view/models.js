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
  HQ.models=Object.freeze({make(kind,options){return HQ.stlModels.make(kind,options);},material,box});
})();

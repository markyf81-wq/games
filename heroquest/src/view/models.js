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
    const group=new T.Group(),wood=M.material(0x694d33,.93),stone=M.material(0x8b8b7a,.98);
    if(kind==="stairs") {
      M.box(group,1.94,.04,1.94,stone,0,.02,0);
      const face=new T.Mesh(new T.PlaneGeometry(1.94,1.94),new T.MeshStandardMaterial({map:HQ.componentTextures.get("stairs"),roughness:1}));
      face.rotation.x=-Math.PI/2;face.position.y=.041;face.receiveShadow=true;group.add(face);
    } else if(kind==="bookcase") {
      M.box(group,2.83,1.5,.18,wood,0,.75,-.30);
      for(const x of [-1.37,1.37])M.box(group,.13,1.55,.78,wood,x,.77,0);
      for(const y of [.09,.55,1.02,1.5])M.box(group,2.86,.08,.8,wood,0,y,0);
      const colours=[0x633b31,0x475c47,0x79705b,0x403f34,0x78604b];
      for(let row=0;row<3;row++)for(let i=0;i<13;i++){const h=.27+(i%4)*.028;M.box(group,.13,h,.42,M.material(colours[(i+row*3)%5],.98),-1.2+i*.19,.16+row*.46+h/2,.1);}
    } else throw new Error("No generated prop is configured for "+kind+".");
    return group;
  }
  HQ.models=Object.freeze({makeProp,make(kind,options){return HQ.stlModels.make(kind,options);},material,box});
})();

(function () {
  "use strict";
  const HQ=window.HeroQuest,T=window.HQThree;
  const cloth=new T.MeshStandardMaterial({color:0x967044,roughness:.95,emissive:0x80521c,emissiveIntensity:.3}),cord=new T.MeshStandardMaterial({color:0xd8bc79,roughness:.9});
  const sack=new T.SphereGeometry(.21,9,6),neck=new T.CylinderGeometry(.065,.085,.08,8),tie=new T.TorusGeometry(.074,.012,4,10).rotateX(Math.PI/2);
  const haloGeometry=new T.PlaneGeometry(.95,.95),rimGeometry=new T.RingGeometry(.29,.31,40);
  const rimMaterial=new T.MeshBasicMaterial({color:0xf4ca73,transparent:true,opacity:.8,depthWrite:false,toneMapped:false,side:T.DoubleSide});
  let haloMaterial=null;
  function glowMaterial(){
    if(haloMaterial)return haloMaterial;
    const canvas=document.createElement("canvas");canvas.width=canvas.height=128;
    const ctx=canvas.getContext("2d"),wash=ctx.createRadialGradient(64,64,8,64,64,64);
    wash.addColorStop(0,"#ffffffa6");wash.addColorStop(.55,"#ffffff66");wash.addColorStop(1,"#ffffff00");
    ctx.fillStyle=wash;ctx.fillRect(0,0,128,128);
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
    haloMaterial=new T.MeshBasicMaterial({map:texture,color:0xf4bf58,transparent:true,depthWrite:false,toneMapped:false,side:T.DoubleSide});
    return haloMaterial;
  }
  HQ.makeBelongings=function(){
    const root=new T.Group(),body=new T.Mesh(sack,cloth),opening=new T.Mesh(neck,cloth),knot=new T.Mesh(tie,cord);
    body.scale.set(1,.95,.85);body.position.y=.18;opening.position.y=.37;knot.position.y=.36;
    root.add(body,opening,knot);root.traverse(part=>{if(part.isMesh){part.castShadow=true;part.receiveShadow=true;}});
    // Static cached glow: readable in dark rooms without another light or timer.
    const halo=new T.Mesh(haloGeometry,glowMaterial()),rim=new T.Mesh(rimGeometry,rimMaterial);
    for(const part of [halo,rim]){part.rotation.x=-Math.PI/2;part.position.y=part===halo ? .012 : .014;part.userData.visualEffect=true;part.raycast=()=>{};}
    root.add(halo,rim);return root;
  };
})();

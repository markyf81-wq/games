(function () {
  "use strict";
  const HQ=window.HeroQuest,T=window.HQThree;
  // Scenery derived from known saved casualties; never occupancy or targets.
  HQ.createBloodPools=function(scene) {
    const records=new Map(),root=new T.Group();let animating=false;root.name="Fallen miniature blood pools";scene.add(root);
    const canvas=document.createElement("canvas");canvas.width=canvas.height=256;
    const ctx=canvas.getContext("2d"),tau=Math.PI*2;
    const noise=(i,k)=>{const n=Math.sin(i*127.1+k*311.7)*43758.5453;return n-Math.floor(n);};
    // A restrained, irregular stain with a few small droplets; soft edges avoid
    // a circular token look. One cached texture serves every casualty; opacity is owned per stain.
    const wash=ctx.createRadialGradient(125,125,12,128,128,103);
    wash.addColorStop(0,"rgba(76,8,13,.94)");wash.addColorStop(.72,"rgba(104,13,20,.86)");wash.addColorStop(1,"rgba(82,9,15,0)");
    ctx.fillStyle=wash;ctx.beginPath();
    for(let i=0;i<=48;i++){const angle=i/48*tau,radius=78+noise(i%48,1)*20,x=128+Math.cos(angle)*radius,y=128+Math.sin(angle)*radius*.8;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}
    ctx.closePath();ctx.fill();
    for(let i=0;i<9;i++){
      const angle=noise(i,2)*tau,radius=83+noise(i,3)*24,x=128+Math.cos(angle)*radius,y=128+Math.sin(angle)*radius*.8,size=2+noise(i,4)*5;
      const drop=ctx.createRadialGradient(x,y,0,x,y,size);drop.addColorStop(0,"rgba(95,10,17,.8)");drop.addColorStop(1,"rgba(95,10,17,0)");
      ctx.fillStyle=drop;ctx.fillRect(x-size,y-size,size*2,size*2);
    }
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
    const geometry=new T.PlaneGeometry(.86,.86),material=new T.MeshStandardMaterial({map:texture,transparent:true,depthWrite:false,roughness:.72,metalness:0,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
    function sync(fallen,heldId) {
      const shown=new Set();
      for(const figure of fallen){if(figure.id===heldId)continue;shown.add(figure.id);
        let mesh=records.get(figure.id);
        if(!mesh){mesh=new T.Mesh(geometry,material.clone());mesh.visible=false;mesh.rotation.x=-Math.PI/2;mesh.receiveShadow=true;mesh.raycast=()=>{};mesh.userData.visualEffect=true;
          let seed=0;for(const char of figure.id)seed=(Math.imul(seed,31)+char.charCodeAt(0))>>>0;
          mesh.rotation.z=seed%360*Math.PI/180;mesh.scale.set(.88+(seed%13)/100,.83+((seed>>>4)%19)/100,1);records.set(figure.id,mesh);root.add(mesh);
        }
        const cell=HQ.topology.key(figure.x,figure.row);
        if(!mesh.visible){mesh.userData.bloodStarted=performance.now();mesh.material.opacity=0;animating=true;}
        mesh.position.set(figure.x+.5-13,HQ.topology.stairs.has(cell)?.194:.153,figure.row+.5-9.5);mesh.visible=true;
      }
      for(const [id,mesh] of records)if(!shown.has(id))mesh.visible=false;
    }
    function update(time,steady=false) {
      animating=false;
      for(const mesh of records.values())if(mesh.visible){
        const t=steady?1:T.MathUtils.clamp((time-mesh.userData.bloodStarted)/900,0,1);
        mesh.material.opacity=t*t*(3-2*t);if(t<1)animating=true;
      }
    }
    return Object.freeze({sync,update,get animating(){return animating;}});
  };
})();

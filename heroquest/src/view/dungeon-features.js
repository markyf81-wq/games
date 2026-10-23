(function () {
  "use strict";
  const HQ=window.HeroQuest,T=window.HQThree;
  HQ.createDungeonFeatures=function() {
    const pitArtwork=new T.MeshStandardMaterial({map:HQ.componentTextures.get("pit-trap"),roughness:1,metalness:0}),pitFace=new T.PlaneGeometry(.94,.94);
    const stone=new T.MeshStandardMaterial({color:0x746d58,roughness:1}),dark=new T.MeshStandardMaterial({color:0x171714,roughness:1});
    const warningColour="#c62f2b",warning=new T.MeshBasicMaterial({color:warningColour,toneMapped:false}),box=new T.BoxGeometry(1,1,1);
    const furnitureWarnings=new Map(),warningFace=new T.PlaneGeometry(.68,.68);let warningMaterial=null,floorWarningMaterial=null;
    function warningIconMaterial(){
      if(warningMaterial)return warningMaterial;
      const canvas=document.createElement("canvas");canvas.width=canvas.height=128;const ctx=canvas.getContext("2d");
      ctx.lineJoin="round";ctx.beginPath();ctx.moveTo(64,10);ctx.lineTo(118,108);ctx.lineTo(10,108);ctx.closePath();
      ctx.fillStyle=warningColour;ctx.fill();ctx.strokeStyle="#ffe9d5";ctx.lineWidth=6;ctx.stroke();
      ctx.fillStyle="#fff5e9";ctx.font="bold 78px Arial";ctx.textAlign="center";ctx.fillText("!",64,94);
      const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
      warningMaterial=new T.SpriteMaterial({map:texture,toneMapped:false,depthWrite:false});return warningMaterial;
    }
    function syncFurnitureWarnings(traps,entities){
      for(const marker of furnitureWarnings.values())marker.visible=false;
      for(const trap of traps||[]){
        if(trap.kind!=="furniture"||trap.status!=="found")continue;
        const entry=entities.get(trap.furnitureId);if(!entry?.model.visible)continue;
        let marker=furnitureWarnings.get(trap.furnitureId);
        if(!marker||marker.parent!==entry.model){
          if(marker)marker.removeFromParent();
          const bounds=new T.Box3().setFromObject(entry.model),point=bounds.getCenter(new T.Vector3()),scale=entry.model.getWorldScale(new T.Vector3());
          point.y=bounds.max.y+.24;
          marker=new T.Sprite(warningIconMaterial());marker.name="Discovered furniture trap warning";marker.userData.visualEffect=true;
          marker.position.copy(entry.model.worldToLocal(point));marker.scale.set(.38/scale.x,.38/scale.y,1);
          entry.model.add(marker);furnitureWarnings.set(trap.furnitureId,marker);
        }
        marker.visible=true;
      }
    }
    function part(root,material,x,y,z,w,h,d){const mesh=new T.Mesh(box,material);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.receiveShadow=true;root.add(mesh);}
    function make(item) {
      const root=new T.Group(),pit=item.kind==="pit"&&item.status==="sprung";
      if(pit){
        part(root,dark,0,-.36,0,.94,.035,.94);
        const face=new T.Mesh(pitFace,pitArtwork);face.rotation.x=-Math.PI/2;face.position.y=-.337;face.receiveShadow=true;root.add(face);
        for(const sign of [-1,1]){part(root,stone,sign*.46,-.17,0,.055,.38,.96);part(root,stone,0,-.17,sign*.46,.87,.38,.055);}
      } else {
        // A digital pointer to Zargon's indicated square, not a sprung trap tile.
        floorWarningMaterial??=new T.MeshBasicMaterial({map:warningIconMaterial().map,transparent:true,depthWrite:false,toneMapped:false});
        const icon=new T.Mesh(warningFace,floorWarningMaterial);icon.rotation.x=-Math.PI/2;icon.position.y=.04;icon.userData.visualEffect=true;root.add(icon);
        for(const sign of [-1,1]){
          part(root,warning,sign*.39,.025,0,.035,.015,.815);part(root,warning,0,.025,sign*.39,.815,.015,.035);
        }
      }
      return root;
    }
    return Object.freeze({make,syncFurnitureWarnings});
  };
})();

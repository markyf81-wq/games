(function () {
  "use strict";
  const HQ=window.HeroQuest,T=window.HQThree;
  // Invented display layout, independent of quests, discoveries and saves.
  HQ.createTestRoom=function(environment) {
    const wrapper=new T.Group(),pieces=new Map(),materials=new Set(),backdrop=[],fire=HQ.createTorchLighting();
    wrapper.add(fire.root);
    const footprints={table:[3,2],"alchemists-bench":[3,2],"torture-rack":[3,2],
      "sorcerers-table":[3,2],fireplace:[3,1],chest:[1,1],throne:[1,1],
      tomb:[3,2],bookcase:[3,1],cupboard:[3,1],"weapons-rack":[3,1]};
    function own(model){for(const material of HQ.modelSurfaces.cloneForPreview(model,environment))materials.add(material);return model;}
    function label(name,x,z,width) {
      const canvas=document.createElement("canvas");canvas.width=512;canvas.height=96;
      const ctx=canvas.getContext("2d");ctx.fillStyle="#101a13e8";ctx.fillRect(0,0,512,96);
      ctx.fillStyle="#e8dec7";ctx.font="36px Arial";ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.fillText(name,256,48,484);
      const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
      const sprite=new T.Sprite(new T.SpriteMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false}));
      sprite.position.set(x,.12,z);sprite.scale.set(width,width*96/512,1);sprite.raycast=()=>{};wrapper.add(sprite);
    }
    function place(id,x,z,labelWidth=3.4) {
      const dims=footprints[id],options=dims?{width:dims[0],depth:dims[1]}:{};
      const model=own(id==="movement-die"?HQ.diceModels.makeNumbered():id==="stairs"?HQ.models.makeProp(id):
        id==="torch"?fire.make({id:"test-room-torch"}):HQ.models.make(id,options));
      if(id==="weapons-rack")model.rotation.y=Math.PI;
      if(id==="combat-die"||id==="movement-die")model.scale.multiplyScalar(.45);
      const bounds=new T.Box3().setFromObject(model),centre=bounds.getCenter(new T.Vector3());
      // Centre the footprint on its display spot without altering proportions.
      model.position.set(x-centre.x,-bounds.min.y,z-centre.z);model.userData.showroomId=id;
      if(id==="torch")model.position.set(x,0,z); // Preserve the wall-mount anchor.
      const box=new T.Box3().setFromObject(model);pieces.set(id,{model,centre:box.getCenter(new T.Vector3())});
      wrapper.add(model);
      if(id==="fireplace")fire.registerFireplace({id:"test-room-fireplace"},model);
      label(HQ.pieces[id].name,x,box.max.z+.38,labelWidth);
    }
    // Neutral display tiles keep scanned floor artwork from competing with paint.
    const tile=new T.BoxGeometry(.985,.15,.985),colours=[];
    for(let i=0;i<tile.attributes.normal.count;i++){const shade=tile.attributes.normal.getY(i)>.5?1:.3;colours.push(shade,shade,shade);}
    tile.setAttribute("color",new T.Float32BufferAttribute(colours,3));tile.clearGroups();
    const floorMaterial=new T.MeshStandardMaterial({color:0x62685f,roughness:.96,vertexColors:true});
    const floor=new T.InstancedMesh(tile,floorMaterial,26*22),dummy=new T.Object3D();
    for(let row=0;row<22;row++)for(let x=0;x<26;x++){dummy.position.set(x-12.5,-.075,row-9);dummy.updateMatrix();floor.setMatrixAt(row*26+x,dummy.matrix);}
    floor.instanceMatrix.needsUpdate=true;floor.receiveShadow=true;wrapper.add(floor);
    // Backdrop only; the front and sides stay open for unobstructed inspection.
    for(let x=-12;x<=12;x+=2){const wall=own(HQ.models.make("wall-two"));wall.position.set(x,0,-8.65);wrapper.add(wall);backdrop.push(wall);}
    const rows=[
      ["fireplace","bookcase","weapons-rack","alchemists-bench","sorcerers-table"],
      ["table","tomb","torture-rack","throne","chest"],
      ["door","open-door","stairs","wall-one","wall-two"]
    ];
    rows.forEach((row,r)=>row.forEach((id,col)=>place(id,-10+col*5,-6+r*4)));
    place("cupboard",9.5,10.3);
    const figures=HQ.pieceCatalog.filter(group=>["Heroes","Monsters"].includes(group.label)).flatMap(group=>group.entries);
    const extraIds=new Set(["orc-mace","orc-sword","goblin-dagger","goblin-axe"]),core=figures.filter(piece=>!extraIds.has(piece.id)),extra=figures.filter(piece=>extraIds.has(piece.id));
    core.forEach((piece,i)=>place(piece.id,(i-(core.length-1)/2)*1.9,5.7,1.7));
    extra.forEach((piece,i)=>place(piece.id,(i-(extra.length-1)/2)*4,8.1,2.5));
    place("blocked",-9,10.3,2.5);place("movement-die",-3,10.3,2.5);place("combat-die",1.7,10.3,2.5);
    place("torch",-7.5,-8.13,2);
    // Extra back-wall sconces light the display without adding model types.
    for(const x of [-2.5,7.5]){const torch=fire.make({id:"test-room-torch-"+x});torch.position.set(x,0,-8.13);wrapper.add(torch);}
    const ambient=new T.HemisphereLight(0xe9edda,0x3f4a38,2.1);wrapper.add(ambient);
    const sun=new T.DirectionalLight(0xffe5bd,3.2);sun.position.set(-10,23,9);sun.castShadow=true;
    sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-20,right:20,top:18,bottom:-18,near:1,far:70});
    sun.shadow.normalBias=.035;sun.shadow.radius=3;wrapper.add(sun);
    const fill=new T.DirectionalLight(0xccdde3,1.6);fill.position.set(12,13,-14);wrapper.add(fill);
    let lit=false;
    function setLighting(enabled){
      lit=Boolean(enabled);fire.setEnabled(lit);ambient.intensity=lit ? .546 : 2.1;sun.visible=fill.visible=!lit;sun.castShadow=!lit;
      for(const material of materials)if(material.metalness>.3)material.envMapIntensity=lit ? .08 : .75;
    }
    setLighting(false);
    return Object.freeze({wrapper,pieces,size:new T.Vector3(26,3.2,22),setLighting,
      update(camera,target,time,steady){
        // Orbiting behind the display must not hide every exhibit behind stone.
        let changed=false;const visible=camera.position.z>-8.65;
        for(const wall of backdrop)if(wall.visible!==visible){wall.visible=visible;changed=true;}
        return fire.update(camera,target,time,steady)||changed;
      },
      get dynamicLighting(){return lit;},get animating(){return fire.active;}});
  };
})();

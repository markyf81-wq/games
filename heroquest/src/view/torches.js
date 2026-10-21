(function () {
  "use strict";
  const HQ=window.HeroQuest,T=window.HQThree;
  // Decorative wall fixtures: never add these to quest occupancy or sight data.
  const items=HQ.placeQuestTorches(HQ.trial,HQ.board);
  HQ.createTorchLighting=function() {
    const records=new Map(),frustum=new T.Frustum(),matrix=new T.Matrix4(),sphere=new T.Sphere(new T.Vector3(),4.8);
    const flameGeometry=new T.SphereGeometry(1,16,12);
    const vertices=flameGeometry.attributes.position;
    for(let i=0;i<vertices.count;i++){const y=vertices.getY(i),taper=1-Math.max(0,y)*.65;vertices.setXYZ(i,vertices.getX(i)*taper,y,vertices.getZ(i)*taper);}
    const orange=new T.MeshBasicMaterial({color:0xff7b19,transparent:true,opacity:.28,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}),yellow=new T.MeshBasicMaterial({color:0xffe6a1,transparent:true,opacity:.5,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
    const image=document.createElement("canvas");image.width=image.height=64;const ctx=image.getContext("2d"),gradient=ctx.createRadialGradient(32,32,0,32,32,32);
    gradient.addColorStop(0,"rgba(255,211,115,.7)");gradient.addColorStop(.2,"rgba(255,159,49,.32)");gradient.addColorStop(1,"rgba(255,111,20,0)");ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
    const haloTexture=new T.CanvasTexture(image);haloTexture.colorSpace=T.SRGBColorSpace;
    const particleGeometry=new T.PlaneGeometry(1,1),particleMaterial=new T.MeshBasicMaterial({map:haloTexture,transparent:true,opacity:.9,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false,side:T.DoubleSide});
    const particlePosition=new T.Vector3(),particleScale=new T.Vector3(),particleRotation=new T.Quaternion(),parentRotation=new T.Quaternion(),particleMatrix=new T.Matrix4(),particleColour=new T.Color();
    let enabled=true,active=false,shadowId=null;
    function updateParticles(record,camera,time){
      const {particles,phase}=record;
      particleRotation.identity();
      if(camera){record.model.getWorldQuaternion(parentRotation);camera.getWorldQuaternion(particleRotation);particleRotation.premultiply(parentRotation.invert());}
      for(let i=0;i<particles.count;i++){
        // Fixed phase offsets/lifetimes: entirely cosmetic, no gameplay RNG.
        const age=((time/1000+phase)/(.75+(i%7)*.071)+i*.61803398875)%1,ember=i>=18;
        const sway=Math.sin(i*9.31+age*5.4);
        particlePosition.set(Math.sin(i*17.1)*.055+sway*age*.06,1.2+age*(ember ? .78 : .42),.36+Math.cos(i*7.3)*.035+age*.045);
        const width=ember ? .014+(i%3)*.004 : .025+(1-age)*.055;
        particleScale.set(width,ember?width:width*2.1,1);particleMatrix.compose(particlePosition,particleRotation,particleScale);particles.setMatrixAt(i,particleMatrix);
        const fade=Math.sin(age*Math.PI)*(ember ? .8 : 1);
        particleColour.setRGB(fade,fade*(.18+(1-age)*.48),fade*.035);particles.setColorAt(i,particleColour);
      }
      particles.instanceMatrix.needsUpdate=true;particles.instanceColor.needsUpdate=true;
    }
    function make(item) {
      if(records.has(item.id))return records.get(item.id).model;
      // Cell centre is half a square inside the wall. Embed the backplate at
      // the stone's inner face (0.08 squares from its centre), without a column.
      const model=new T.Group(),mount=new T.Group();mount.position.z=-.52;model.add(mount);
      const iron=HQ.models.material(0x342e25,.65,.35),wood=HQ.models.material(0x68422a,.9);
      HQ.models.box(mount,.19,.34,.05,iron,0,.87,.10);
      HQ.models.box(mount,.07,.07,.26,iron,0,.82,.23);
      const handle=new T.Mesh(new T.CylinderGeometry(.042,.06,.48,8),wood);handle.position.set(0,.88,.32);handle.rotation.x=-.18;handle.castShadow=true;mount.add(handle);
      const basket=new T.Mesh(new T.CylinderGeometry(.12,.07,.16,8),iron);basket.position.set(0,1.12,.36);basket.castShadow=true;mount.add(basket);
      // A single point inside the flame exaggerates the basket/bracket into a
      // huge wedge. Treat the fixture as an emitter, not a shadow occluder.
      mount.traverse(object=>{if(object.isMesh)object.castShadow=false;});
      const flame=new T.Group();flame.position.set(0,1.28,.36);mount.add(flame);
      const outer=new T.Mesh(flameGeometry,orange);outer.scale.set(.085,.19,.085);flame.add(outer);
      const core=new T.Mesh(flameGeometry,yellow);core.scale.set(.045,.115,.045);core.position.y=-.045;flame.add(core);
      const halo=new T.Sprite(new T.SpriteMaterial({map:haloTexture,color:0xffce7b,transparent:true,opacity:.52,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}));
      halo.position.copy(flame.position);halo.scale.set(1.05,1.05,1);mount.add(halo);
      const particles=new T.InstancedMesh(particleGeometry,particleMaterial,24);particles.instanceMatrix.setUsage(T.DynamicDrawUsage);particles.frustumCulled=false;particles.userData.visualEffect=true;particles.raycast=()=>{};mount.add(particles);
      const light=new T.PointLight(0xffb45d,8,4.8,2);light.position.set(0,1.31,.41);light.shadow.mapSize.set(512,512);
      light.shadow.radius=4;
      light.shadow.camera.near=.12;light.shadow.camera.far=4.8;light.shadow.normalBias=.035;light.shadow.bias=-.00015;mount.add(light);
      const record={model,flame,halo,particles,light,phase:records.size*2.73};records.set(item.id,record);updateParticles(record,null,0);return model;
    }
    function update(camera,target,time,steady=false) {
      matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(matrix);
      const nearby=[];
      for(const [id,record] of records) {
        const {model,light,flame,halo,particles,phase}=record;
        light.getWorldPosition(sphere.center);
        const lit=enabled&&model.visible&&frustum.intersectsSphere(sphere);
        light.visible=lit;flame.visible=enabled;halo.visible=enabled;
        particles.visible=lit&&!steady;if(particles.visible)updateParticles(record,camera,time||0);
        if(lit)nearby.push({id,record,distance:sphere.center.distanceToSquared(target)});
        const t=(time||0)/1000+phase;
        const flicker=steady?1:1+Math.sin(t*6.1)*.055+Math.sin(t*10.7+.8)*.035+Math.sin(t*17.3)*.018;
        light.intensity=8*flicker;
        flame.scale.set(1+(flicker-1)*.35,flicker,1+(flicker-1)*.35);flame.rotation.z=steady?0:Math.sin(t*4.7)*.055;
        halo.material.opacity=.48+(flicker-1)*.7;
      }
      nearby.sort((a,b)=>a.distance-b.distance);
      const nextShadow=nearby[0]?.id||null,changed=shadowId!==nextShadow;shadowId=nextShadow;
      for(const [id,record] of records)record.light.castShadow=id===shadowId;
      active=nearby.length>0;return changed;
    }
    return Object.freeze({make,update,
      itemsFor(projection){return items.filter(item=>projection.discoveredCells.includes(HQ.topology.key(item.x,item.row)));},
      setEnabled(value){enabled=Boolean(value);},get enabled(){return enabled;},get active(){return active;}
    });
  };
})();

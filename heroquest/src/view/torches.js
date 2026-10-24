(function () {
  "use strict";
  const HQ=window.HeroQuest,T=window.HQThree;
  // Decorative wall/hearth fire: never add it to occupancy or sight data.
  const placements=new Map();
  function itemsFor(projection){
    const layout=projection.dungeonLayout||"trial";
    // Reserve every secret-door edge before discovery so finding/opening a
    // panel cannot leave a torch mounted on it or reshuffle nearby fixtures.
    if(!placements.has(layout))placements.set(layout,HQ.placeQuestTorches(HQ.quests.current,HQ.board,HQ.dungeonData.layouts[layout].doors));
    return placements.get(layout).filter(item=>projection.discoveredCells.includes(HQ.topology.key(item.x,item.row)));
  }
  function flameSample(index,seed){
    let hash=Math.imul(index,374761393)^Math.imul(seed,668265263);
    hash=Math.imul(hash^(hash>>>13),1274126177);
    return ((hash^(hash>>>16))>>>0)/4294967295*2-1;
  }
  function flameNoise(time,seed){
    const index=Math.floor(time),fraction=time-index,blend=fraction*fraction*(3-2*fraction);
    const a=flameSample(index,seed),b=flameSample(index+1,seed);
    return a+(b-a)*blend;
  }
  HQ.createTorchLighting=function() {
    const records=new Map(),frustum=new T.Frustum(),matrix=new T.Matrix4(),sphere=new T.Sphere(new T.Vector3(),6);
    // Stable light/shadow counts prevent new shader variants whenever a camera
    // reveals another torch. Reassign eight reusable lights instead.
    const root=new T.Group(),pool=Array.from({length:8},(_,i)=>{
      const light=new T.PointLight(0xffb45d,0,6,2);light.castShadow=i===0;
      light.userData.hqBarrierOrigin=new T.Vector3();
      // The old receiver offset was wider than small brick relief. Together
      // with a negative depth bias it exposed bright rims inside wall shadows.
      light.shadow.mapSize.set(512,512);light.shadow.radius=4;light.shadow.camera.near=.12;light.shadow.camera.far=6.8;light.shadow.normalBias=.005;light.shadow.bias=0;root.add(light);return light;
    });
    const flameGeometry=new T.SphereGeometry(1,16,12);
    const vertices=flameGeometry.attributes.position;
    for(let i=0;i<vertices.count;i++){const y=vertices.getY(i),taper=1-Math.max(0,y)*.65;vertices.setXYZ(i,vertices.getX(i)*taper,y,vertices.getZ(i)*taper);}
    const orange=new T.MeshBasicMaterial({color:0xff7b19,transparent:true,opacity:.28,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}),yellow=new T.MeshBasicMaterial({color:0xffe6a1,transparent:true,opacity:.5,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false});
    const image=document.createElement("canvas");image.width=image.height=64;const ctx=image.getContext("2d"),gradient=ctx.createRadialGradient(32,32,0,32,32,32);
    gradient.addColorStop(0,"rgba(255,211,115,.7)");gradient.addColorStop(.2,"rgba(255,159,49,.32)");gradient.addColorStop(1,"rgba(255,111,20,0)");ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
    const haloTexture=new T.CanvasTexture(image);haloTexture.colorSpace=T.SRGBColorSpace;
    const particleGeometry=new T.PlaneGeometry(1,1),particleMaterial=new T.MeshBasicMaterial({map:haloTexture,transparent:true,opacity:.9,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false,side:T.DoubleSide});
    const logGeometry=new T.CylinderGeometry(.036,.045,.54,7),logMaterial=HQ.models.material(0x30291f,.97);
    const particlePosition=new T.Vector3(),particleScale=new T.Vector3(),particleRotation=new T.Quaternion(),parentRotation=new T.Quaternion(),particleMatrix=new T.Matrix4(),particleColour=new T.Color();
    const shadowOffset=new T.Vector3(),shadowWorldOffset=new T.Vector3(),shadowRotation=new T.Quaternion();
    let enabled=true,active=false,shadowId=null,shadowSampleAt=-Infinity;
    function makeFlame(){
      const flame=new T.Group();
      const outer=new T.Mesh(flameGeometry,orange);outer.scale.set(.085,.19,.085);flame.add(outer);
      const core=new T.Mesh(flameGeometry,yellow);core.scale.set(.045,.115,.045);core.position.y=-.045;flame.add(core);
      return flame;
    }
    function updateParticles(record,camera,time){
      const {particles,phase}=record,hearth=record.hearth;
      const baseY=hearth ? .15 : 1.2,baseZ=hearth ? 0 : .36;
      particleRotation.identity();
      if(camera){record.model.getWorldQuaternion(parentRotation);camera.getWorldQuaternion(particleRotation);particleRotation.premultiply(parentRotation.invert());}
      for(let i=0;i<particles.count;i++){
        // Fixed phase offsets/lifetimes: entirely cosmetic, no gameplay RNG.
        const age=((time/1000+phase)/(.75+(i%7)*.071)+i*.61803398875)%1,ember=i%24>=18;
        if(ember&&!hearth){
          // Shed a few sparks into the room: a short lift, a falling arc, then
          // a dim red glow on the floor. Reuse the existing six ember slots.
          const lifetime=4.8+(i%3)*.43,t=(((time/1000+phase)/lifetime+i*.61803398875)%1)*lifetime;
          const gravity=1.6,lift=.7,ground=.025,landing=(lift+Math.sqrt(lift*lift+2*gravity*(baseY-ground)))/gravity;
          const flight=Math.min(t,landing),sway=Math.sin(i*9.31+flight*4.2)*.035*flight;
          particlePosition.set(Math.sin(i*17.1)*(.035+flight*.16)+sway,
            Math.max(ground,baseY+lift*flight-gravity*flight*flight*.5),baseZ+.08+flight*(.19+(i%3)*.055));
          const width=(.018+(i%3)*.004)*(t>landing ? .8 : 1);
          particleScale.set(width,width,1);particleMatrix.compose(particlePosition,particleRotation,particleScale);particles.setMatrixAt(i,particleMatrix);
          const fade=Math.min(1,t/.09)*Math.max(0,1-Math.max(0,t-landing)/.65),cool=Math.min(1,t/landing);
          particleColour.setRGB(fade,fade*(.58-cool*.5),fade*.025);particles.setColorAt(i,particleColour);continue;
        }
        const sway=Math.sin(i*9.31+age*5.4);
        const emitterX=hearth?(Math.floor(i/24)-1)*.18:0;
        particlePosition.set(emitterX+Math.sin(i*17.1)*.055+sway*age*.06,baseY+age*(ember ? .78 : .42),baseZ+Math.cos(i*7.3)*.035+age*.045);
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
      const flame=makeFlame();flame.position.set(0,1.28,.36);mount.add(flame);
      const halo=new T.Sprite(new T.SpriteMaterial({map:haloTexture,color:0xffce7b,transparent:true,opacity:.52,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}));
      halo.position.copy(flame.position);halo.scale.set(1.05,1.05,1);mount.add(halo);
      const particles=new T.InstancedMesh(particleGeometry,particleMaterial,24);particles.instanceMatrix.setUsage(T.DynamicDrawUsage);particles.frustumCulled=false;particles.userData.visualEffect=true;particles.raycast=()=>{};mount.add(particles);
      const light=new T.Object3D();light.distance=6;light.position.set(0,1.31,.41);mount.add(light);
      const record={model,flame,halo,particles,light,phase:records.size*2.73};records.set(item.id,record);updateParticles(record,null,0);return model;
    }
    function registerFireplace(item,model) {
      if(records.has(item.id))return;
      // Source-space mouth of the supplied fireplace. Counter-scale the effect
      // so particles/light retain board units after uniform footprint fitting.
      const mount=new T.Group();mount.position.set(0,7.6,-2.3);mount.scale.setScalar(1/model.scale.x);model.add(mount);
      // A small static fuel bed remains visible when dynamic fire is disabled.
      for(const [z,angle] of [[-.055,.18],[.055,-.22]]){
        const log=new T.Mesh(logGeometry,logMaterial);log.rotation.set(0,angle,Math.PI/2);log.position.set(0,.015,z);log.receiveShadow=true;mount.add(log);
      }
      const flame=new T.Group();mount.add(flame);
      for(const [x,size] of [[-.18,.9],[0,1.1],[.18,.95]]){
        const tongue=makeFlame();tongue.position.set(x,.23,0);tongue.scale.setScalar(size);flame.add(tongue);
      }
      const halo=new T.Sprite(new T.SpriteMaterial({map:haloTexture,color:0xffce7b,transparent:true,opacity:.52,blending:T.AdditiveBlending,depthWrite:false,toneMapped:false}));
      halo.position.set(0,.23,.08);halo.scale.set(1.05,1.05,1);mount.add(halo);
      const particles=new T.InstancedMesh(particleGeometry,particleMaterial,72);particles.instanceMatrix.setUsage(T.DynamicDrawUsage);particles.frustumCulled=false;mount.add(particles);
      // Fire cannot be selected independently or inflate the fireplace outline.
      mount.traverse(part=>{part.userData.visualEffect=true;part.raycast=()=>{};part.castShadow=false;});
      const light=new T.Object3D();light.distance=6.5;light.position.set(0,.3,.3);mount.add(light);
      const record={model,flame,halo,particles,light,hearth:true,phase:records.size*2.73};records.set(item.id,record);updateParticles(record,null,0);
    }
    function update(camera,target,time,steady=false) {
      matrix.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(matrix);
      const nearby=[];
      for(const [id,record] of records) {
        const {model,light,flame,halo,particles,phase}=record;
        sphere.radius=light.distance;
        light.getWorldPosition(sphere.center);
        const lit=enabled&&model.visible&&frustum.intersectsSphere(sphere);
        flame.visible=enabled;halo.visible=enabled;
        particles.visible=lit&&!steady;if(particles.visible)updateParticles(record,camera,time||0);
        if(lit)nearby.push({id,record,position:sphere.center.clone(),distance:sphere.center.distanceToSquared(target)});
        const t=(time||0)/1000+phase;
        const flicker=steady?1:1+Math.sin(t*6.1)*.075+Math.sin(t*10.7+.8)*.045+Math.sin(t*17.3)*.025;
        light.intensity=(record.hearth?12:10)*flicker;
        flame.scale.set(1+(flicker-1)*.35,flicker,1+(flicker-1)*.35);flame.rotation.z=steady?0:Math.sin(t*4.7)*.055;
        halo.material.opacity=.48+(flicker-1)*.7;
      }
      nearby.sort((a,b)=>a.distance-b.distance);
      const previous=nearby.find(entry=>entry.id===shadowId);
      if(previous&&previous.distance<nearby[0].distance*1.3){nearby.splice(nearby.indexOf(previous),1);nearby.unshift(previous);}
      const nextShadow=nearby[0]?.id||null;let changed=shadowId!==nextShadow;shadowId=nextShadow;
      // Move only the existing shadow caster, at most 12 times per second.
      // Hold its position between samples so light and cached shadows agree.
      // Keep the room mask anchored to the fixture, independent of flame jitter.
      const now=Number.isFinite(time)?time:0;
      if(changed||steady||!nextShadow||now<shadowSampleAt||now-shadowSampleAt>=1000/12){
        const t=now/1000+(nearby[0]?.record.phase||0);
        const moving=Boolean(nextShadow&&!steady);
        // Independent smooth noise replaces repeating loops, with about half
        // the travel. Hashing cosmetic time never touches the game's RNG.
        const x=moving?flameNoise(t*2.7,11)*.011+flameNoise(t*5.3,12)*.0055:0;
        const y=moving?flameNoise(t*3.1,23)*.013+flameNoise(t*6.1,24)*.006:0;
        const z=moving?flameNoise(t*3.8,37)*.003:0;
        changed=changed||shadowOffset.x!==x||shadowOffset.y!==y||shadowOffset.z!==z;
        shadowOffset.set(x,y,z);shadowWorldOffset.copy(shadowOffset);
        if(nextShadow){nearby[0].record.model.getWorldQuaternion(shadowRotation);shadowWorldOffset.applyQuaternion(shadowRotation);}
        shadowSampleAt=now;
      }
      root.visible=enabled;root.updateWorldMatrix(true,false);
      for(let i=0;i<pool.length;i++){
        const light=pool[i],entry=nearby[i];light.intensity=entry?entry.record.light.intensity:0;
        if(entry){light.userData.hqBarrierOrigin.copy(entry.position);light.position.copy(entry.position);if(i===0)light.position.add(shadowWorldOffset);root.worldToLocal(light.position);light.distance=entry.record.light.distance;}
      }
      active=nearby.length>0;return changed;
    }
    return Object.freeze({root,lights:pool,make,registerFireplace,update,
      itemsFor,
      setEnabled(value){enabled=Boolean(value);},get enabled(){return enabled;},get active(){return active;}
    });
  };
})();

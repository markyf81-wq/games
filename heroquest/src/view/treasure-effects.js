(function () {
  "use strict";
  const HQ=window.HeroQuest,T=window.HQThree,Topo=HQ.topology;
  // Cached scenery only: saved Treasure/trap reports already own the damage.
  HQ.createTreasureEffects=function({scene,entities,terrain,ring,reducedMotion,contextReady,requestRender,invalidateShadows}) {
    const root=new T.Group();root.name="Treasure and trap hazards";root.visible=false;scene.add(root);
    const arrow=new T.Group(),pit=new T.Group(),spear=new T.Group();root.add(arrow,pit,spear);
    const wood=new T.MeshStandardMaterial({color:0x795034,roughness:.85});
    const iron=new T.MeshStandardMaterial({color:0x9ca3a2,roughness:.42,metalness:.65});
    const feather=new T.MeshStandardMaterial({color:0xae5945,roughness:.9,side:T.DoubleSide});
    const shaft=new T.Mesh(new T.CylinderGeometry(.014,.014,.5,6),wood);shaft.rotation.x=Math.PI/2;shaft.position.z=-.2;arrow.add(shaft);
    const tip=new T.Mesh(new T.ConeGeometry(.047,.14,4),iron);tip.rotation.x=Math.PI/2;tip.position.z=.09;arrow.add(tip);
    const finGeometry=new T.BufferGeometry();finGeometry.setAttribute("position",new T.Float32BufferAttribute([0,0,-.44,.07,0,-.46,0,0,-.28],3));finGeometry.computeVertexNormals();
    for(let i=0;i<3;i++){const fin=new T.Mesh(finGeometry,feather);fin.rotation.z=i*Math.PI*2/3;arrow.add(fin);}

    const spearPlane=new T.Plane(new T.Vector3(0,1,0),-.15),spearIron=iron.clone(),spearHeight=1.46;
    spearIron.color.set(0xc2cbd0);spearIron.roughness=.32;spearIron.metalness=.75;
    spearIron.clippingPlanes=[spearPlane];spearIron.clipShadows=true;
    const spikePositions=[[0,0],[-.29,-.29],[.29,-.29],[-.29,.29],[.29,.29]],spikePose=new T.Object3D();
    for(const [geometry,y,scale] of [[new T.CylinderGeometry(.043,.052,1.06,8),.53,[1,1,1]],
      [new T.OctahedronGeometry(.105,0),1.2,[1,2.4,.45]],[new T.CylinderGeometry(.065,.065,.12,8),1.04,[1,1,1]]]){
      const spikes=new T.InstancedMesh(geometry,spearIron,spikePositions.length);spikes.castShadow=true;spikes.receiveShadow=true;
      spikePositions.forEach(([x,z],i)=>{spikePose.position.set(x,y,z);spikePose.scale.set(...scale);spikePose.updateMatrix();spikes.setMatrixAt(i,spikePose.matrix);});
      spikes.instanceMatrix.needsUpdate=true;spear.add(spikes);
    }

    const black=new T.MeshBasicMaterial({color:0x080a09});
    const stone=new T.MeshStandardMaterial({color:0x756e5b,roughness:1});
    const inside=new T.MeshStandardMaterial({color:0x292a23,roughness:1});
    const bottom=new T.Mesh(new T.PlaneGeometry(.96,.96),black);bottom.rotation.x=-Math.PI/2;bottom.position.y=-.47;pit.add(bottom);
    const lid=new T.Mesh(new T.PlaneGeometry(.98,.98),black);lid.rotation.x=-Math.PI/2;lid.position.y=.007;pit.add(lid);
    const rimGeometry=new T.BoxGeometry(.995,.045,.075),wallGeometry=new T.BoxGeometry(.995,.48,.045);
    for(let i=0;i<4;i++) {
      const angle=i*Math.PI/2,x=Math.sin(angle)*.46,z=Math.cos(angle)*.46;
      const rim=new T.Mesh(rimGeometry,stone);rim.position.set(x,.014,z);rim.rotation.y=angle;rim.receiveShadow=true;pit.add(rim);
      const wall=new T.Mesh(wallGeometry,inside);wall.position.set(x,-.23,z);wall.rotation.y=angle;pit.add(wall);
    }
    root.traverse(object=>{object.raycast=()=>{};object.userData.visualEffect=true;});
    let effect=null;
    const available=()=>contextReady()&&document.visibilityState!=="hidden";
    const smooth=value=>{const t=T.MathUtils.clamp(value,0,1);return t*t*(3-2*t);};
    function finish() {
      if(!effect)return;
      const ended=effect;effect=null;ended.cancelled=true;clearTimeout(ended.timer);
      if(ended.kind==="hazard-pit") {
        ended.model.position.copy(ended.origin);ended.model.rotation.copy(ended.rotation);ring.visible=ended.ringVisible;terrain.setHole(null);invalidateShadows();
      }
      root.visible=false;arrow.visible=false;pit.visible=false;spear.visible=false;
      if(ended.kind==="trap-spear")invalidateShadows();
      Promise.resolve(ended.impact).catch(()=>{}).then(ended.resolve);requestRender();
    }
    function impact(e) {
      if(e.hit)return;e.hit=true;
      // Pit owns the victim's drop AND backward flinch; the number can follow
      // that motion without a second component writing the same model pose.
      e.impact=Promise.resolve().then(()=>{if(!e.cancelled)return e.onImpact({recoil:e.kind!=="hazard-pit",
        recoilDirection:e.kind==="hazard-arrow"?e.to.clone().sub(e.from).normalize():null});}).catch(()=>{});
    }
    function play(report,onImpact) {
      finish();
      const instance=HQ.treasureData.instancesById[report.search?.cardId],kind=instance?.kind,entry=entities.get(report.defenderId);
      if(!["hazard-arrow","hazard-pit"].includes(kind)||!entry?.model.visible||!available()||reducedMotion.matches)
        return Promise.resolve().then(()=>onImpact({recoil:true}));
      const model=entry.model,origin=model.position.clone(),rotation=model.rotation.clone();
      const cell=Topo.key(entry.item.x,entry.item.row),duration=kind==="hazard-pit"?1750:550;
      return new Promise(resolve=>{
        effect={kind,model,origin,rotation,cell,onImpact,resolve,duration,started:null,hit:false,impact:null,hole:false,ringVisible:ring.visible,
          backward:new T.Vector3(-Math.sin(rotation.y),0,-Math.cos(rotation.y)),maskOnly:Topo.stairs.has(cell),timer:setTimeout(finish,duration+700)};
        root.visible=true;arrow.visible=kind==="hazard-arrow";pit.visible=kind==="hazard-pit";spear.visible=false;
        if(arrow.visible) {
          const bounds=new T.Box3().setFromObject(model),height=T.MathUtils.clamp((bounds.max.y-origin.y)*.5,.5,1.05);
          effect.to=origin.clone().add(new T.Vector3(0,height,0));
          const room=HQ.board.rooms.find(room=>room.id===report.search.roomId);
          const starts=room?[
            new T.Vector3(room.x-13+.05,effect.to.y,origin.z),new T.Vector3(room.x+room.width-13-.05,effect.to.y,origin.z),
            new T.Vector3(origin.x,effect.to.y,room.row-9.5+.05),new T.Vector3(origin.x,effect.to.y,room.row+room.depth-9.5-.05)
          ]:[effect.to.clone().addScaledVector(effect.backward,2)];
          starts.sort((a,b)=>a.distanceToSquared(effect.to)-b.distanceToSquared(effect.to));
          effect.from=starts.find(point=>point.distanceTo(effect.to)>=1.2)||starts[starts.length-1];
          const heading=effect.to.clone().sub(effect.from).normalize();arrow.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),heading);
        } else {pit.position.copy(origin);pit.scale.set(.01,1,.01);lid.visible=true;ring.visible=false;}
        update(performance.now());requestRender();
      });
    }
    function playTrap(report,onImpact){
      finish();
      const entry=entities.get(report.defenderId),sprung=report.trapKind==="spear"&&report.rolls.some(group=>group.label==="Spear trap");
      if(!sprung||!entry?.model.visible||!available()||reducedMotion.matches)return Promise.resolve().then(()=>onImpact({recoil:true}));
      const origin=entry.model.position,duration=1100;
      return new Promise(resolve=>{
        effect={kind:"trap-spear",model:entry.model,onImpact,resolve,duration,started:null,hit:false,impact:null,floorY:origin.y,timer:setTimeout(finish,duration+700)};
        spearPlane.constant=-origin.y;
        spear.position.set(origin.x,origin.y-spearHeight,origin.z);
        root.visible=true;spear.visible=true;arrow.visible=pit.visible=false;
        update(performance.now());requestRender();
      });
    }
    function update(time) {
      if(!effect)return;if(!available()){finish();return;}
      const e=effect;if(e.started===null)e.started=time;
      const ms=time-e.started;if(ms>=e.duration){finish();return;}
      if(!e.model.visible){finish();return;}
      if(e.kind==="trap-spear"){
        const thrust=smooth(ms/220)*(1-smooth((ms-500)/400));
        spear.position.y=e.floorY-spearHeight+thrust*spearHeight;invalidateShadows();
        if(ms>=180)impact(e);
      } else if(e.kind==="hazard-arrow") {
        // Constant-speed flight: the arrowhead reaches the chest at 450ms.
        arrow.position.lerpVectors(e.from,e.to,Math.min(1,ms/450));
        if(ms>=450){arrow.visible=false;impact(e);}
      } else {
        const opening=smooth(ms/300),closing=1-smooth((ms-1400)/350),scale=Math.max(.01,opening*closing);
        pit.scale.set(scale,1,scale);
        const hole=ms>=300&&ms<1400;
        if(hole!==e.hole){e.hole=hole;if(!e.maskOnly)terrain.setHole(hole?e.cell:null);lid.visible=!hole||e.maskOnly;}
        const fall=smooth((ms-350)/280)*(1-smooth((ms-1000)/380));
        const shoveT=T.MathUtils.clamp((ms-350)/420,0,1),push=shoveT===1?0:Math.sin(Math.PI*smooth(shoveT));
        if(fall!==e.fall||push!==e.push){
          e.fall=fall;e.push=push;
          e.model.position.copy(e.origin).addScaledVector(e.backward,.18*push);e.model.position.y-=.3*fall;
          e.model.rotation.x=e.rotation.x+e.backward.z*.045*push;e.model.rotation.z=e.rotation.z-e.backward.x*.045*push;invalidateShadows();
        }
        if(ms>=350)impact(e);
      }
    }
    return Object.freeze({play,playTrap,update,finish,get active(){return Boolean(effect);}});
  };
})();

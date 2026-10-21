(function () {
  "use strict";
  const HQ=window.HeroQuest,T=window.HQThree,Topo=HQ.topology,Q=HQ.trial;
  HQ.createTabletop=function ({onCell,onPiece,onDismiss=()=>{},onAnchor=()=>{},onHover=()=>{}}) {
    const canvas=document.getElementById("board-canvas"),host=document.getElementById("canvas-host"),loading=document.getElementById("loading-message");
    if(!T||!HQ.models)throw new Error("The local 3D renderer or model files could not load.");
    const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
    renderer.localClippingEnabled=true;
    renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
    // Flicker changes light intensity, not shadow geometry. Refresh maps only
    // when pieces/terrain move or the nearest torch shadow light changes.
    renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
    const scene=new T.Scene(),camera=new T.OrthographicCamera(-8,8,6,-6,.1,150),target=new T.Vector3(-10,.3,6);
    const raycaster=new T.Raycaster(),pointer=new T.Vector2(),entities=new Map(),floorGroups=[];
    const grid=new T.Group(),routeLine=new T.Group();scene.add(grid,routeLine);
    const routeMaterials=[new T.MeshBasicMaterial({color:0x85d1ff,transparent:true,opacity:.95,depthWrite:false}),new T.MeshBasicMaterial({color:0xffc75e,transparent:true,opacity:.95,depthWrite:false})];
    function setRoutePreview(route) {
      while(routeLine.children.length){const mesh=routeLine.children[0];mesh.geometry.dispose();routeLine.remove(mesh);}
      if(!route?.cells.length){requestRender();return;}
      const points=route.cells.map(id=>world(id,Topo.stairs.has(id)?.45:.215)),vertices=[];
      for(let i=1;i<points.length;i++) {
        const a=points[i-1],b=points[i],side=new T.Vector3(b.z-a.z,0,a.x-b.x).normalize().multiplyScalar(.032);
        const corners=[a.clone().add(side),a.clone().sub(side),b.clone().add(side),b.clone().sub(side)];
        for(const index of [0,1,2,2,1,3])vertices.push(...corners[index].toArray());
      }
      const geometry=new T.BufferGeometry();geometry.setAttribute("position",new T.Float32BufferAttribute(vertices,3));
      const material=routeMaterials[route.reachable?0:1],mesh=new T.Mesh(geometry,material);mesh.renderOrder=3;routeLine.add(mesh);
      const end=new T.Mesh(new T.CircleGeometry(.09,20),material);end.rotation.x=-Math.PI/2;end.position.copy(points[points.length-1]);end.renderOrder=3;routeLine.add(end);requestRender();
    }
    const M=HQ.models;let frame=0,contextReady=true,yaw=.1,elevation=.91,halfHeight=4.4,current=null,currentDefeated=null,currentCutawayHero=null,follow=true,gridEnabled=true,activeMark=null,environment=null;
    const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)");
    const stepDuration=300,hopHeight=.12;let movement=null,figureEffect=null;
    const glow=HQ.createInteractionGlow(renderer);
    let selected=null,hovered=null,interactive=false,keyboardCell=null,keyboardPiece=null;
    const facings=new Map();
    const torchLighting=HQ.createTorchLighting();let torchTimer=0,ambientLightLevel=26;
    const wallLayer=HQ.createDungeonWalls();
    const ambient=new T.HemisphereLight(0xe9edda,0x3f4a38,1.35);scene.add(ambient);
    const sun=new T.DirectionalLight(0xffe5bd,3.2);sun.position.set(-10,23,9);sun.castShadow=true;
    sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-24,right:24,top:21,bottom:-21,near:1,far:70});sun.shadow.normalBias=.035;sun.shadow.bias=-.00015;scene.add(sun);
    sun.shadow.radius=3;
    const fill=new T.DirectionalLight(0xccdde3,1.6);fill.position.set(12,13,-14);scene.add(fill);
    function setTorchLighting(enabled){
      torchLighting.setEnabled(enabled);enabled=torchLighting.enabled;
      ambient.intensity=enabled ? ambientLightLevel*.021 : 2.1;sun.intensity=enabled?0:3.2;fill.intensity=enabled?0:1.6;
      ambient.visible=true;sun.visible=fill.visible=!enabled;sun.castShadow=!enabled;
      // A faint global floor keeps unlit scenery readable; metal gets only a
      // trace of reflection, leaving warm torch pools as the dominant light.
      for(const {model} of entities.values())for(const material of model.userData.paintedMaterials||[])
        if(material.metalness>.3)material.envMapIntensity=enabled ? ambientLightLevel*.08/26 : .75;
      host.closest(".tabletop").classList.toggle("torch-lit",enabled);
      const button=document.getElementById("dynamic-lighting");button.setAttribute("aria-pressed",String(enabled));button.textContent="Dynamic lighting: "+(enabled?"On":"Off");
      document.getElementById("light-level-setting").hidden=!enabled;
      renderer.shadowMap.needsUpdate=true;requestRender();
    }
    function setAmbientLightLevel(value){
      if(!Number.isFinite(value))return;
      ambientLightLevel=Math.round(T.MathUtils.clamp(value,0,100));
      if(torchLighting.enabled){
        ambient.intensity=ambientLightLevel*.021;
        for(const {model} of entities.values())for(const material of model.userData.paintedMaterials||[])
          if(material.metalness>.3)material.envMapIntensity=ambientLightLevel*.08/26;
      }
      document.getElementById("setting-light-level").value=String(ambientLightLevel);
      document.getElementById("light-level-value").textContent=ambientLightLevel+"%";
      requestRender();
    }
    const tileGeometry=new T.BoxGeometry(.985,.15,.985),texture=HQ.createFloorTexture();
    texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    const floorMaterial=HQ.floorMaterial(texture),colours=[];
    for(let i=0;i<tileGeometry.attributes.normal.count;i++){const shade=tileGeometry.attributes.normal.getY(i)>.5?1:.3;colours.push(shade,shade,shade);}
    tileGeometry.setAttribute("color",new T.Float32BufferAttribute(colours,3));tileGeometry.clearGroups();
    const byRegion=new Map();Q.floor.forEach(id=>{const r=Topo.regions.get(id);if(!byRegion.has(r))byRegion.set(r,[]);byRegion.get(r).push(id);});
    const dummy=new T.Object3D();
    for(const cells of byRegion.values()) {
      const geometry=tileGeometry.clone(),offsets=cells.flatMap(id=>{const [x,row]=Topo.parse(id);return [x,18-row];});
      geometry.setAttribute("floorUvOffset",new T.InstancedBufferAttribute(new Float32Array(offsets),2));
      const mesh=new T.InstancedMesh(geometry,floorMaterial,cells.length);mesh.receiveShadow=true;mesh.userData.cells=cells;mesh.frustumCulled=false;
      cells.forEach((id,i)=>{dummy.position.set(0,0,0);dummy.scale.setScalar(0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,new T.Color(0xffffff));});
      mesh.instanceMatrix.needsUpdate=true;scene.add(mesh);floorGroups.push({mesh,cells});
    }
    const ringMaterial=new T.MeshBasicMaterial({color:0xe3c383,transparent:true,opacity:.82,depthWrite:false});
    const ring=new T.Mesh(new T.RingGeometry(.43,.48,40),ringMaterial);ring.rotation.x=-Math.PI/2;ring.position.y=.168;scene.add(ring);ring.visible=false;
    const gridMaterial=new T.MeshStandardMaterial({color:0xb4b9a4,roughness:1,metalness:0,transparent:true,opacity:.68,depthWrite:false});
    function requestRender(){clearTimeout(torchTimer);torchTimer=0;if(!frame&&contextReady&&document.visibilityState!=="hidden")frame=requestAnimationFrame(draw);}
    function updateCamera(){const aspect=host.clientWidth/Math.max(1,host.clientHeight);camera.left=-halfHeight*aspect;camera.right=halfHeight*aspect;camera.top=halfHeight;camera.bottom=-halfHeight;camera.updateProjectionMatrix();camera.position.set(target.x+Math.sin(yaw)*Math.cos(elevation)*45,target.y+Math.sin(elevation)*45,target.z+Math.cos(yaw)*Math.cos(elevation)*45);camera.lookAt(target);camera.updateMatrixWorld();}
    function draw(time){
      frame=0;const wasMoving=Boolean(movement||figureEffect);advanceMovement(time);advanceFigureEffect(time);updateCamera();
      const focusModel=currentCutawayHero&&entities.get(currentCutawayHero.id)?.model,focus=focusModel?.visible?focusModel.position.clone().add(new T.Vector3(0,.65,0)):null;
      const figurePoints=[...entities.values()].filter(entry=>(entry.type==="hero"||entry.type==="monster")&&entry.model.visible).map(entry=>entry.model.position.clone().add(new T.Vector3(0,.65,0)));
      const wallChanged=wallLayer.update(camera,target,focus,time,reducedMotion.matches,figurePoints),torchChanged=torchLighting.update(camera,target,time,reducedMotion.matches);
      if(wallChanged||torchChanged||wasMoving)renderer.shadowMap.needsUpdate=true;
      renderer.render(scene,camera);glow.render(camera);if(selected)onAnchor(anchor(selected));
      if(movement||figureEffect||wallLayer.animating)requestRender();else if(torchLighting.active&&!reducedMotion.matches)torchTimer=setTimeout(requestRender,34);
    }
    function resize(){renderer.setSize(host.clientWidth,host.clientHeight,false);requestRender();}
    function clear(group){while(group.children.length){const child=group.children[0];if(child.geometry)child.geometry.dispose();group.remove(child);}}
    function world(id,y=.075){const [x,row]=Topo.parse(id);return new T.Vector3(x+.5-13,y,row+.5-9.5);}
    const refKey=ref=>ref?ref.type+":"+ref.id:"";
    const selectable=entry=>Boolean(entry&&entry.type!=="wall"&&entry.model.visible);
    function known(ref){return ref&&(ref.type==="cell"?current?.discoveredCells.includes(ref.id):selectable(entities.get(ref.id)));}
    function inReach(ref){
      const reachable=new Set(current.reachable);
      if(ref.type==="cell")return Topo.stairs.has(ref.id)&&Topo.stairs.has(Topo.key(current.activeHero.x,current.activeHero.row))?false:reachable.has(ref.id);
      const entry=entities.get(ref.id),item=entry.item;
      if(entry.type==="monster"&&current.attackTargets.some(m=>m.id===item.id))return true;
      if(entry.type==="door"&&current.adjacentDoors.some(d=>d.id===item.id))return true;
      if(entry.type==="hero"&&item.id===current.activeHero.id)return false;
      if(entry.type==="hero"&&Topo.stairs.has(Topo.key(item.x,item.row))&&Topo.stairs.has(Topo.key(current.activeHero.x,current.activeHero.row)))return false;
      if(item.kind==="stairs"&&Topo.stairs.has(Topo.key(current.activeHero.x,current.activeHero.row)))return false;
      // Movement reach for a model means reaching its square or a free square
      // beside its footprint, through an open edge. Camera actions do not count.
      return Topo.approachCells(item,entry.type,{openDoors:current.doors.filter(d=>d.open).map(d=>d.id)}).some(id=>reachable.has(id));
    }
    function refreshGlow(){
      const targets=[];
      for(const [ref,isSelected] of [[selected,true],[hovered,false]])if(interactive&&known(ref)&&(isSelected||refKey(ref)!==refKey(selected)))targets.push(ref.type==="cell"?{point:world(ref.id,.17),reachable:inReach(ref)}:{model:entities.get(ref.id).model,reachable:inReach(ref)});
      glow.setTargets(targets);requestRender();
    }
    function setHover(ref){if(ref&&!known(ref))ref=null;if(refKey(ref)===refKey(hovered))return;hovered=ref;refreshGlow();onHover(ref);}
    function anchor(ref){
      if(!known(ref))return {x:0,y:0,inView:false};
      updateCamera();const entry=entities.get(ref.id),point=ref.type==="cell"?world(ref.id,.18):new T.Box3().setFromObject(entry.model).getCenter(new T.Vector3());point.project(camera);
      return {x:(point.x+1)*host.clientWidth/2,y:(1-point.y)*host.clientHeight/2,inView:point.z>=-1&&point.z<=1&&Math.abs(point.x)<1.15&&Math.abs(point.y)<1.15};
    }
    function setSelection(ref){setRoutePreview(null);if(!ref)hovered=null;selected=known(ref)?ref:null;if(selected){keyboardPiece=selected.type==="piece"?selected:null;if(selected.type==="cell")keyboardCell=selected.id;}refreshGlow();return selected?anchor(selected):null;}
    function setInteractive(enabled){interactive=enabled;if(!enabled){selected=null;hovered=null;setRoutePreview(null);}refreshGlow();}
    function heroPosition(id){return world(id,.15+(Topo.stairs.has(id)?.05:0));}
    function direction(from,to){const [x,row]=Topo.parse(from),[nextX,nextRow]=Topo.parse(to);return Math.atan2(nextX-x,nextRow-row);}
    function placeMovingHero(point) {
      const previous=movement.model.position;
      if(follow&&movement.movesRing){target.x+=point.x-previous.x;target.z+=point.z-previous.z;}
      movement.model.position.copy(point);if(movement.movesRing)ring.position.set(point.x,.162,point.z);
    }
    function finishMovement() {
      if(!movement)return;
      placeMovingHero(movement.points[movement.points.length-1]);
      movement.model.rotation.y=movement.headings[movement.headings.length-1];
      const resolve=movement.resolve;movement=null;resolve();requestRender();
    }
    function advanceMovement(time) {
      if(!movement)return;
      if(movement.started===null)movement.started=time;
      const elapsed=(time-movement.started)/stepDuration,step=Math.floor(elapsed);
      if(step>=movement.points.length-1){finishMovement();return;}
      const progress=elapsed-step,eased=progress*progress*(3-2*progress);
      if(movement.segment!==step){movement.segment=step;movement.fromYaw=movement.model.rotation.y;}
      const yawDelta=Math.atan2(Math.sin(movement.headings[step]-movement.fromYaw),Math.cos(movement.headings[step]-movement.fromYaw));
      const turn=Math.min(1,progress/.4),turnEase=turn*turn*(3-2*turn);
      movement.model.rotation.y=movement.fromYaw+yawDelta*turnEase;
      // Conservatively hide a monster during a step crossing the edge of sight.
      if(movement.visibility)movement.model.visible=movement.visibility[step]&&movement.visibility[step+1];
      movement.point.lerpVectors(movement.points[step],movement.points[step+1],eased);
      movement.point.y+=Math.sin(progress*Math.PI)*hopHeight;
      placeMovingHero(movement.point);
    }
    function animateMovement(motion) {
      finishFigureEffect();
      finishMovement();
      const headings=motion.path.map((id,i)=>direction(i?motion.path[i-1]:motion.from,id));
      if(headings.length)facings.set(motion.actorId,headings[headings.length-1]);
      const entry=entities.get(motion.actorId);
      if(!entry||!entry.model.visible||!motion.path.length||reducedMotion.matches||!contextReady||document.visibilityState==="hidden")return Promise.resolve();
      return new Promise(resolve=>{
        const movesRing=entry.type==="hero";
        movement={model:entry.model,movesRing,headings,segment:-1,fromYaw:entry.model.rotation.y,visibility:motion.visibility,points:[motion.from,...motion.path].map(id=>movesRing?heroPosition(id):world(id,.15)),point:new T.Vector3(),started:null,resolve};
        entry.model.position.copy(movement.points[0]);requestRender();
      });
    }
    const smooth=value=>{const t=T.MathUtils.clamp(value,0,1);return t*t*(3-2*t);};
    function finishFigureEffect() {
      if(!figureEffect)return;
      const effect=figureEffect;figureEffect=null;
      effect.model.position.copy(effect.origin);effect.model.rotation.copy(effect.rotation);
      if(effect.kind==="attack")effect.model.rotation.y=effect.heading;
      else effect.model.visible=false;
      for(const [mesh,original,clones,shadow] of effect.materials) {
        mesh.material=original;mesh.castShadow=shadow;for(const material of clones)material.dispose();
      }
      renderer.shadowMap.needsUpdate=true;effect.resolve();requestRender();
    }
    function advanceFigureEffect(time) {
      if(!figureEffect)return;
      const effect=figureEffect;if(effect.started===null)effect.started=time;
      const elapsed=time-effect.started;
      if(elapsed>=effect.duration){finishFigureEffect();return;}
      if(effect.kind==="attack") {
        const turn=smooth(elapsed/180),delta=Math.atan2(Math.sin(effect.heading-effect.rotation.y),Math.cos(effect.heading-effect.rotation.y));
        effect.model.rotation.y=effect.rotation.y+delta*turn;
        const shove=elapsed<180?0:elapsed<340?smooth((elapsed-180)/160):1-smooth((elapsed-340)/200);
        effect.model.position.copy(effect.origin).addScaledVector(effect.direction,shove*.18);
      } else {
        const t=elapsed/effect.duration,fall=smooth(t),fade=smooth((t-.18)/.82);
        effect.model.position.copy(effect.origin).addScaledVector(effect.direction,.08*fall);effect.model.position.y-=.32*fall;
        effect.model.rotation.x=effect.rotation.x+effect.direction.z*.24*fall;
        effect.model.rotation.z=effect.rotation.z-effect.direction.x*.24*fall;
        for(const [, ,materials] of effect.materials)for(const material of materials)material.opacity=material.userData.defeatOpacity*(1-fade);
      }
    }
    function animateAttack(attackerId,defenderId) {
      finishMovement();finishFigureEffect();
      const attacker=entities.get(attackerId),defender=entities.get(defenderId);
      if(!attacker?.model.visible||!defender?.model.visible)return Promise.resolve();
      const direction=defender.model.position.clone().sub(attacker.model.position);direction.y=0;
      if(direction.lengthSq()<.0001)return Promise.resolve();direction.normalize();
      const heading=Math.atan2(direction.x,direction.z);facings.set(attackerId,heading);
      if(reducedMotion.matches||!contextReady||document.visibilityState==="hidden"){attacker.model.rotation.y=heading;requestRender();return Promise.resolve();}
      return new Promise(resolve=>{
        figureEffect={kind:"attack",model:attacker.model,origin:attacker.model.position.clone(),rotation:attacker.model.rotation.clone(),direction,heading,materials:[],started:null,duration:540,resolve};requestRender();
      });
    }
    function animateDefeat(defenderId,attackerId) {
      finishMovement();finishFigureEffect();
      const entry=entities.get(defenderId),attacker=entities.get(attackerId);
      if(!entry?.model.visible)return Promise.resolve();
      if(reducedMotion.matches||!contextReady||document.visibilityState==="hidden"){entry.model.visible=false;renderer.shadowMap.needsUpdate=true;requestRender();return Promise.resolve();}
      const direction=attacker?entry.model.position.clone().sub(attacker.model.position):new T.Vector3(0,0,1);direction.y=0;direction.normalize();
      return new Promise(resolve=>{
        const materials=[];
        entry.model.traverse(mesh=>{
          if(!mesh.material)return;
          const original=mesh.material,clones=(Array.isArray(original)?original:[original]).map(material=>{
            const copy=material.clone();copy.userData.defeatOpacity=copy.opacity;copy.transparent=true;copy.depthWrite=false;return copy;
          });
          materials.push([mesh,original,clones,mesh.castShadow]);mesh.material=Array.isArray(original)?clones:clones[0];mesh.castShadow=false;
        });
        figureEffect={kind:"defeat",model:entry.model,origin:entry.model.position.clone(),rotation:entry.model.rotation.clone(),direction,materials,started:null,duration:700,resolve};requestRender();
      });
    }
    function sourceReflections(materials) {
      if(!environment){const image=document.createElement("canvas");image.width=512;image.height=256;const ctx=image.getContext("2d"),g=ctx.createLinearGradient(0,0,0,256);g.addColorStop(0,"#c2cbd0");g.addColorStop(.5,"#555d5c");g.addColorStop(1,"#242b25");ctx.fillStyle=g;ctx.fillRect(0,0,512,256);ctx.fillStyle="#fff0d6";ctx.fillRect(70,35,90,110);ctx.fillStyle="#e4f0fa";ctx.fillRect(310,20,40,150);const tx=new T.CanvasTexture(image);tx.colorSpace=T.SRGBColorSpace;tx.mapping=T.EquirectangularReflectionMapping;const gen=new T.PMREMGenerator(renderer);environment=gen.fromEquirectangular(tx);tx.dispose();gen.dispose();}
      for(const material of materials)if(material.metalness>.3){material.envMap=environment.texture;material.envMapIntensity=torchLighting.enabled ? ambientLightLevel*.08/26 : .75;material.needsUpdate=true;}
    }
    function makeEntity(item,type) {
      let model;
      if(type==="wall")model=wallLayer.make(item);
      else if(type==="torch")model=torchLighting.make(item);
      else if(type==="door")model=M.make(item.open?"open-door":"door");
      else if(["stairs","bookcase"].includes(item.kind))model=M.makeProp(item.kind);
      else {
        const sideways=Math.abs(Math.sin(item.rotation||0))>.5;
        const options=type==="furniture"?{width:sideways?item.depth:item.width,depth:sideways?item.width:item.depth}:{};
        model=M.make(item.kind,options);
      }
      if(model.userData.paintedMaterials)sourceReflections(model.userData.paintedMaterials);
      model.userData.entityId=item.id;model.userData.entityType=type;scene.add(model);return model;
    }
    function position(model,item,type) {
      if(type==="door"||type==="wall") {const half=type==="wall"?item.length/2:.5;model.position.set(item.x+(item.axis==="h"?half:0)-13,.15,item.row+(item.axis==="v"?half:0)-9.5);model.rotation.y=item.axis==="v"?Math.PI/2:0;}
      else {model.position.set(item.x+(item.width||1)/2-13,.15+(type==="hero"&&Topo.stairs.has(Topo.key(item.x,item.row))?.05:0),item.row+(item.depth||1)/2-9.5);model.rotation.y=(type==="hero"||type==="monster")?(facings.get(item.id)??item.rotation??0):(item.rotation||0);}
    }
    function setProjection(projection,{defeatedFigure=null,cutawayHero=projection.activeHero}={}) {
      finishMovement();finishFigureEffect();
      renderer.shadowMap.needsUpdate=true;
      hovered=null;
      current=projection;currentDefeated=defeatedFigure;currentCutawayHero=cutawayHero;const discovered=new Set(projection.discoveredCells);
      for(const {mesh,cells} of floorGroups){cells.forEach((id,i)=>{dummy.position.copy(world(id));dummy.rotation.set(0,0,0);dummy.scale.setScalar(discovered.has(id)?1:0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();}
      clear(grid);
      const gridPositions=[],gridEdges=new Set();
      for(const id of discovered) {
        const [x,row]=Topo.parse(id),left=x-13,top=row-9.5;
        for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]) {
          const other=Topo.key(x+dx,row+dy);
          if(!(Topo.stairs.has(id)&&Topo.stairs.has(other))) {
            const edge=Topo.edgeKey(id,other);if(gridEdges.has(edge))continue;gridEdges.add(edge);
            const a=dx?[left+(dx>0?1:0),top]:[left,top+(dy>0?1:0)],b=dx?[a[0],top+1]:[left+1,a[1]];
            // Thin upward-facing strips receive the same lights/shadows as
            // terrain; ordinary WebGL lines cannot use surface lighting.
            const sx=-(b[1]-a[1])*.012,sz=(b[0]-a[0])*.012;
            const corners=[[a[0]+sx,a[1]+sz],[a[0]-sx,a[1]-sz],[b[0]+sx,b[1]+sz],[b[0]-sx,b[1]-sz]];
            for(const index of [0,2,1,2,3,1])gridPositions.push(corners[index][0],.154,corners[index][1]);
          }
        }
      }
      const geom=new T.BufferGeometry();geom.setAttribute("position",new T.Float32BufferAttribute(gridPositions,3));geom.computeVertexNormals();
      const gridMesh=new T.Mesh(geom,gridMaterial);gridMesh.receiveShadow=true;grid.add(gridMesh);grid.visible=gridEnabled;
      const wanted=new Set(),items=[...projection.heroes.map(i=>[i,"hero"]),...projection.monsters.map(i=>[i,"monster"]),...projection.furniture.map(i=>[i,"furniture"]),...projection.doors.map(i=>[i,"door"]),...torchLighting.itemsFor(projection).map(i=>[i,"torch"]),...wallLayer.itemsFor(projection,cutawayHero).map(i=>[i,"wall"]),...Q.blocked.filter(id=>discovered.has(id)).map(id=>{const [x,row]=Topo.parse(id);return [{id:"blocked-"+id,x,row,kind:"blocked"},"blocked"];})];
      // Keep only the current report's defeated combatant visible until the
      // player acknowledges its outcome. It remains absent from all rule queries.
      if(defeatedFigure&&!items.some(([item])=>item.id===defeatedFigure.id))items.push([defeatedFigure,HQ.heroes.some(h=>h.id===defeatedFigure.id)?"hero":"monster"]);
      for(const [item,type] of items) {
        wanted.add(item.id);let entry=entities.get(item.id);
        const variant=type==="door"?String(item.open):item.kind;
        if(!entry||entry.variant!==variant){if(entry)scene.remove(entry.model);entry={model:makeEntity(item,type),variant,type,item};entities.set(item.id,entry);}
        entry.item=item;entry.model.visible=true;position(entry.model,item,type);
      }
      for(const [id,entry] of entities)if(!wanted.has(id))entry.model.visible=false;
      const hero=projection.focusFigure||projection.activeHero;ring.visible=projection.phase!=="defeat"&&hero.body>0;ring.position.copy(world(Topo.key(hero.x,hero.row),.162));
      const newMark=hero.id+":"+hero.x+","+hero.row;if(follow&&newMark!==activeMark)target.copy(world(Topo.key(hero.x,hero.row),.4));activeMark=newMark;
      loading.hidden=true;requestRender();
      refreshGlow();
    }
    function heroFocus(hero){const point=movement&&movement.model.userData.entityId===hero.id?movement.model.position.clone():world(Topo.key(hero.x,hero.row));point.y=.4;return point;}
    function centre(){if(current){follow=true;target.copy(heroFocus(current.activeHero));halfHeight=4.4;requestRender();}}
    function explored(){if(!current)return;const box=new T.Box3();current.discoveredCells.forEach(id=>{const p=world(id);box.expandByPoint(p.clone().addScalar(.6));box.expandByPoint(p.clone().addScalar(-.6));});box.getCenter(target);const size=box.getSize(new T.Vector3()),aspect=host.clientWidth/Math.max(1,host.clientHeight);halfHeight=Math.max(4.4,(size.z+size.x*.4)*.7,(size.x+size.z*.4)*.6/aspect);follow=false;requestRender();}
    function zoom(factor){setHover(null);halfHeight=T.MathUtils.clamp(halfHeight/factor,1.8,20);requestRender();}
    function view(overhead){elevation=overhead?Math.PI/2-.001:.91;if(overhead)yaw=0;document.getElementById("view-overhead").setAttribute("aria-pressed",String(overhead));document.getElementById("view-tabletop").setAttribute("aria-pressed",String(!overhead));requestRender();}
    function pickTarget(event){if(!current||movement||!interactive)return null;const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);updateCamera();raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects([...entities.values()].filter(selectable).map(e=>e.model),true);
      for(const hit of hits){if(!hit.object.visible)continue;let object=hit.object;while(object&&!object.userData.entityId)object=object.parent;if(!object)continue;const entry=entities.get(object.userData.entityId);return {type:"piece",id:entry.item.id};}
      const tiles=raycaster.intersectObjects(floorGroups.map(g=>g.mesh),false);for(const hit of tiles){const id=hit.object.userData.cells[hit.instanceId];if(current.discoveredCells.includes(id))return {type:"cell",id};}return null;
    }
    function pick(event){const ref=pickTarget(event);if(!ref){if(interactive){setSelection(null);onDismiss();}return;}if(ref.type==="cell")onCell(ref.id);else{const entry=entities.get(ref.id);onPiece({...entry.item,type:entry.type});}
    }
    const contacts=new Map();let down=null,pinch=null;
    canvas.addEventListener("pointerdown",e=>{if(e.pointerType==="mouse"&&e.button!==0)return;canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);contacts.set(e.pointerId,{x:e.clientX,y:e.clientY});if(contacts.size===1)down={x:e.clientX,y:e.clientY,dragged:false};if(contacts.size===2){const p=[...contacts.values()];pinch={distance:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),height:halfHeight};if(down)down.dragged=true;}});
    canvas.addEventListener("pointermove",e=>{const old=contacts.get(e.pointerId);if(!old){if(e.pointerType!=="touch")setHover(pickTarget(e));return;}contacts.set(e.pointerId,{x:e.clientX,y:e.clientY});if(contacts.size===2&&pinch){const p=[...contacts.values()],d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);halfHeight=T.MathUtils.clamp(pinch.height*pinch.distance/Math.max(d,1),1.8,20);requestRender();return;}if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)down.dragged=true;if(down?.dragged){setHover(null);canvas.classList.add("dragging");if(e.shiftKey){target.x-=(e.clientX-old.x)*Math.cos(yaw)*halfHeight/host.clientHeight*2;target.z+=(e.clientX-old.x)*Math.sin(yaw)*halfHeight/host.clientHeight*2;target.x-=(e.clientY-old.y)*Math.sin(yaw)*halfHeight/host.clientHeight*2;target.z-=(e.clientY-old.y)*Math.cos(yaw)*halfHeight/host.clientHeight*2;follow=false;}else{yaw-=(e.clientX-old.x)*.006;elevation=T.MathUtils.clamp(elevation+(e.clientY-old.y)*.004,.4,Math.PI/2-.001);}requestRender();}});
    canvas.addEventListener("pointerleave",()=>setHover(null));
    function release(e,cancelled){if(!contacts.has(e.pointerId))return;const click=contacts.size===1&&down&&!down.dragged&&!cancelled;contacts.delete(e.pointerId);pinch=null;if(contacts.size===1)down={...[...contacts.values()][0],dragged:true};if(!contacts.size){down=null;canvas.classList.remove("dragging");}if(click)pick(e);}
    canvas.addEventListener("pointerup",e=>release(e,false));canvas.addEventListener("pointercancel",e=>release(e,true));canvas.addEventListener("lostpointercapture",e=>release(e,true));
    canvas.addEventListener("wheel",e=>{e.preventDefault();zoom(Math.exp(-T.MathUtils.clamp(e.deltaY,-120,120)*.0018));},{passive:false});
    canvas.addEventListener("keydown",e=>{
      if(e.key==="Escape"){setSelection(null);onDismiss();return;}
      if(interactive&&["[","]"].includes(e.key)){
        e.preventDefault();const pieces=[...entities].filter(([,entry])=>selectable(entry)).map(([id])=>({type:"piece",id}));
        if(pieces.length){const index=pieces.findIndex(ref=>ref.id===keyboardPiece?.id),next=index<0?(e.key==="]"?0:pieces.length-1):(index+(e.key==="]"?1:-1)+pieces.length)%pieces.length;keyboardPiece=pieces[next];setHover(keyboardPiece);}return;
      }
      if(interactive&&(e.key==="Enter"||e.shiftKey&&e.key.startsWith("Arrow"))){
        e.preventDefault();if(!keyboardCell||!current.discoveredCells.includes(keyboardCell))keyboardCell=Topo.key(current.activeHero.x,current.activeHero.row);
        if(e.key==="Enter"){
          const ref=known(keyboardPiece)?keyboardPiece:{type:"cell",id:keyboardCell};
          if(!anchor(ref).inView){if(ref.type==="cell")target.copy(world(ref.id,.4));else new T.Box3().setFromObject(entities.get(ref.id).model).getCenter(target);follow=false;requestRender();}
          if(ref.type==="cell")onCell(ref.id);else{const entry=entities.get(ref.id);onPiece({...entry.item,type:entry.type});}return;
        }
        keyboardPiece=null;
        const [x,row]=Topo.parse(keyboardCell),[dx,dy]={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key],next=Topo.key(x+dx,row+dy);
        if(current.discoveredCells.includes(next)){keyboardCell=next;setHover({type:"cell",id:next});}return;
      }
      if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","+","=","-","Home"].includes(e.key))return;e.preventDefault();if(e.key==="Home"){centre();return;}if(e.key==="+"||e.key==="="){zoom(1.15);return;}if(e.key==="-"){zoom(1/1.15);return;}if(e.key==="ArrowLeft")yaw-=.12;if(e.key==="ArrowRight")yaw+=.12;if(e.key==="ArrowUp")elevation+=.08;if(e.key==="ArrowDown")elevation-=.08;elevation=T.MathUtils.clamp(elevation,.4,Math.PI/2-.001);requestRender();});
    canvas.addEventListener("webglcontextlost",e=>{e.preventDefault();contextReady=false;clearTimeout(torchTimer);if(frame)cancelAnimationFrame(frame);frame=0;finishMovement();finishFigureEffect();loading.hidden=false;loading.textContent="Waiting for the browser to restore the graphics…";});
    canvas.addEventListener("webglcontextrestored",()=>{contextReady=true;renderer.shadowMap.needsUpdate=true;loading.hidden=true;requestRender();});
    document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden"){finishMovement();finishFigureEffect();clearTimeout(torchTimer);if(frame)cancelAnimationFrame(frame);frame=0;}else requestRender();});
    reducedMotion.addEventListener("change",()=>{if(reducedMotion.matches){finishMovement();finishFigureEffect();}requestRender();});
    window.addEventListener("heroquest-artwork-ready",requestRender);
    setTorchLighting(true);
    new ResizeObserver(resize).observe(host);loading.hidden=true;resize();
    return Object.freeze({setProjection,animateMovement,animateAttack,animateDefeat,setSelection,setInteractive,setRoutePreview,centre,explored,zoom,view,resetFacing(){facings.clear();},
      setTorchLighting,setAmbientLightLevel,
      setWallMode(mode){wallLayer.setMode(mode);renderer.shadowMap.needsUpdate=true;requestRender();},
      cycleWallMode(){const next=wallLayer.modes[(wallLayer.modes.indexOf(wallLayer.mode)+1)%wallLayer.modes.length];wallLayer.setMode(next);renderer.shadowMap.needsUpdate=true;requestRender();},
      snapshot(){return {yaw,elevation,halfHeight,target:target.toArray(),follow,gridEnabled,wallMode:wallLayer.mode,torchLightingEnabled:torchLighting.enabled,ambientLightLevel,facings:Object.fromEntries(facings)};},
      restore(saved) {
        if(!saved||typeof saved!=="object")return;
        if(Number.isFinite(saved.yaw))yaw=saved.yaw;
        if(Number.isFinite(saved.elevation))elevation=T.MathUtils.clamp(saved.elevation,.4,Math.PI/2-.001);
        if(Number.isFinite(saved.halfHeight))halfHeight=T.MathUtils.clamp(saved.halfHeight,1.8,100);
        if(Array.isArray(saved.target)&&saved.target.length===3&&saved.target.every(n=>Number.isFinite(n)&&Math.abs(n)<1000))target.fromArray(saved.target);
        if(typeof saved.follow==="boolean")follow=saved.follow;
        if(typeof saved.gridEnabled==="boolean"){gridEnabled=saved.gridEnabled;grid.visible=gridEnabled;}
        if(wallLayer.modes.includes(saved.wallMode))wallLayer.setMode(saved.wallMode);
        else if(saved.wallsEnabled===false)wallLayer.setMode("low");
        if(Number.isFinite(saved.ambientLightLevel))setAmbientLightLevel(saved.ambientLightLevel);
        if(typeof saved.torchLightingEnabled==="boolean")setTorchLighting(saved.torchLightingEnabled);
        if(saved.facings&&typeof saved.facings==="object")for(const [id,angle] of Object.entries(saved.facings))if(Number.isFinite(angle))facings.set(id,angle);
        const overhead=elevation>=Math.PI/2-.002;
        document.getElementById("view-overhead").setAttribute("aria-pressed",String(overhead));document.getElementById("view-tabletop").setAttribute("aria-pressed",String(!overhead));
        if(current)setProjection(current,{defeatedFigure:currentDefeated,cutawayHero:currentCutawayHero});requestRender();
      },
      focusPiece(id){const entry=entities.get(id);if(entry?.model.visible){new T.Box3().setFromObject(entry.model).getCenter(target);target.y=.4;follow=entry.type==="hero"&&id===current.activeHero.id;requestRender();}},
      setGrid(enabled){gridEnabled=enabled;grid.visible=enabled;requestRender();},focusHero(id){const h=current?.heroes.find(h=>h.id===id);if(h){target.copy(heroFocus(h));follow=h.id===current.activeHero.id;halfHeight=4.4;requestRender();}}});
  };
})();

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
    // Geometry changes refresh immediately; the one torch shadow caster also
    // requests bounded refreshes for its subtle 12 Hz flame-position wobble.
    renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
    const scene=new T.Scene(),camera=new T.OrthographicCamera(-8,8,6,-6,.1,150),target=new T.Vector3(-10,.3,6);
    const raycaster=new T.Raycaster(),pointer=new T.Vector2(),entities=new Map();
    const routeLine=new T.Group();routeLine.renderOrder=1000;scene.add(routeLine);
    const routeMaterials=[new T.MeshBasicMaterial({color:0x85d1ff,transparent:true,opacity:.95,depthTest:false,depthWrite:false}),new T.MeshBasicMaterial({color:0xffc75e,transparent:true,opacity:.95,depthTest:false,depthWrite:false})];
    function setRoutePreview(route) {
      while(routeLine.children.length){const mesh=routeLine.children[0];mesh.geometry.dispose();routeLine.remove(mesh);}
      if(!route?.cells.length){requestRender();return;}
      const points=route.cells.map(id=>world(id,Topo.stairs.has(id)?.45:.215)),vertices=[[],[]];
      for(let i=1;i<points.length;i++) {
        const a=points[i-1],b=points[i],side=new T.Vector3(b.z-a.z,0,a.x-b.x).normalize().multiplyScalar(.032);
        const corners=[a.clone().add(side),a.clone().sub(side),b.clone().add(side),b.clone().sub(side)];
        for(const index of [0,1,2,2,1,3])vertices[i<=route.reachableSteps?0:1].push(...corners[index].toArray());
      }
      for(let i=0;i<vertices.length;i++)if(vertices[i].length) {
        const geometry=new T.BufferGeometry();geometry.setAttribute("position",new T.Float32BufferAttribute(vertices[i],3));
        const mesh=new T.Mesh(geometry,routeMaterials[i]);mesh.renderOrder=1000;routeLine.add(mesh);
      }
      const material=routeMaterials[route.reachableSteps===points.length-1?0:1];
      const end=new T.Mesh(new T.CircleGeometry(.09,20),material);end.rotation.x=-Math.PI/2;end.position.copy(points[points.length-1]);end.renderOrder=1000;routeLine.add(end);requestRender();
    }
    const M=HQ.models;let frame=0,contextReady=true,yaw=.1,elevation=.91,halfHeight=4.4,current=null,currentDefeated=null,currentCutawayHero=null,follow=true,gridEnabled=true,activeMark=null,environment=null;
    const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)");
    const glow=HQ.createInteractionGlow(renderer);
    let selected=null,hovered=null,interactive=false,keyboardCell=null,keyboardPiece=null,boardChoices=null;
    let knownCells=new Set(),reachableCells=new Set(),pickable=[];
    const facings=new Map();let spellFocus=null,cinematicCameraEnabled=true,attackShots=0;
    const torchLighting=HQ.createTorchLighting();let torchTimer=0,ambientLightLevel=26;
    scene.add(torchLighting.root);
    const wallLayer=HQ.createDungeonWalls();
    const lightBarriers=HQ.createLightBarriers();
    const bloodPools=HQ.createBloodPools(scene);
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
      const button=document.getElementById("dynamic-lighting");button.setAttribute("aria-pressed",String(enabled));button.setAttribute("aria-label","Dynamic lighting: "+(enabled?"On":"Off"));button.title=button.getAttribute("aria-label");
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
    const terrain=HQ.createBoardTerrain({scene,renderer,world});
    const ringMaterial=new T.MeshBasicMaterial({color:0xe3c383,transparent:true,opacity:.82,depthWrite:false});
    const ring=new T.Mesh(new T.RingGeometry(.43,.48,40),ringMaterial);ring.rotation.x=-Math.PI/2;ring.position.y=.168;scene.add(ring);ring.visible=false;
    const motion=HQ.createFigureMotion({entities,facings,ring,target,world,heroPosition,reducedMotion,
      contextReady:()=>contextReady,follow:()=>follow,requestRender,
      invalidateShadows:()=>{renderer.shadowMap.needsUpdate=true;}});
    const spellEffects=HQ.createSpellEffects({scene,entities,reducedMotion,contextReady:()=>contextReady,requestRender});
    const statusEffects=HQ.createStatusEffects({scene,entities,reducedMotion});
    const combatImpact=HQ.createCombatImpact({scene,entities,facings,reducedMotion,contextReady:()=>contextReady,requestRender,
      invalidateShadows:()=>{renderer.shadowMap.needsUpdate=true;}});
    const treasureEffects=HQ.createTreasureEffects({scene,entities,terrain,ring,reducedMotion,contextReady:()=>contextReady,requestRender,
      invalidateShadows:()=>{renderer.shadowMap.needsUpdate=true;}});
    const cameraMotion=HQ.createBoardCamera({camera,target,getFraming:()=>({yaw,elevation,halfHeight}),
      aspect:()=>host.clientWidth/Math.max(1,host.clientHeight),reducedMotion,available:()=>contextReady&&document.visibilityState!=="hidden",
      moving:()=>motion.active,requestRender});
    const combatCamera=HQ.createCombatCamera({entities,facings,boardCamera:camera,boardTarget:cameraMotion.focus,
      reducedMotion,contextReady:()=>contextReady,requestRender,onChange(){
        for(const id of ["centre-hero","view-explored","zoom-in","zoom-out","view-tabletop","view-overhead","wall-mode"])
          document.getElementById(id).disabled=combatCamera.active;
        renderer.shadowMap.needsUpdate=true;
      }});
    function requestRender(){clearTimeout(torchTimer);torchTimer=0;if(!frame&&contextReady&&document.visibilityState!=="hidden")frame=requestAnimationFrame(draw);}
    function updateCamera(){cameraMotion.project();}
    function setCinematicCameraEnabled(enabled){
      cinematicCameraEnabled=Boolean(enabled);
      const button=document.getElementById("action-camera-mode"),label="POV camera: "+(cinematicCameraEnabled?"On":"Off");
      button.setAttribute("aria-pressed",String(cinematicCameraEnabled));button.setAttribute("aria-label",label);button.title=label;
      return cinematicCameraEnabled?Promise.resolve():combatCamera.leave();
    }
    function draw(time){
      frame=0;const wasMoving=motion.active;motion.update(time);treasureEffects.update(time);combatImpact.update(time);spellEffects.update(time,renderer.domElement.height);const cameraMoving=!combatCamera.active&&cameraMotion.update(time);updateCamera();
      combatCamera.update(time,host.clientWidth/Math.max(1,host.clientHeight));
      const renderCamera=combatCamera.camera,renderTarget=combatCamera.focus;
      const focusModel=currentCutawayHero&&entities.get(currentCutawayHero.id)?.model,focus=spellFocus||(focusModel?.visible?focusModel.position.clone().add(new T.Vector3(0,.65,0)):null);
      const figurePoints=[...entities.values()].filter(entry=>(entry.type==="hero"||entry.type==="monster")&&entry.model.visible).map(entry=>entry.model.position.clone().add(new T.Vector3(0,.65,0)));
      const wallChanged=wallLayer.update(renderCamera,focus,time,reducedMotion.matches,figurePoints),torchChanged=torchLighting.update(renderCamera,renderTarget,time,reducedMotion.matches);
      lightBarriers.update(renderCamera,[...torchLighting.lights,spellEffects.light]);
      if(wallChanged||torchChanged||wasMoving)renderer.shadowMap.needsUpdate=true;
      combatCamera.render(()=>{statusEffects.update(time,renderer.domElement.width,renderer.domElement.height);renderer.render(scene,renderCamera);glow.render(renderCamera);});if(selected)onAnchor(anchor(selected));
      if(motion.active||treasureEffects.active||combatImpact.active||spellEffects.active||combatCamera.animating||wallLayer.animating||cameraMoving)requestRender();else if((torchLighting.active||statusEffects.active)&&!reducedMotion.matches)torchTimer=setTimeout(requestRender,34);
    }
    function resize(){renderer.setSize(host.clientWidth,host.clientHeight,false);requestRender();}
    function world(id,y=.075){const [x,row]=Topo.parse(id);return new T.Vector3(x+.5-13,y,row+.5-9.5);}
    const refKey=ref=>ref?ref.type+":"+ref.id:"";
    const selectable=entry=>Boolean(entry&&entry.type!=="wall"&&entry.type!=="blocked"&&entry.model.visible);
    function known(ref){return ref&&(ref.type==="cell"?knownCells.has(ref.id)||current?.blindMovement&&Topo.floor.has(ref.id):selectable(entities.get(ref.id)));}
    function inReach(ref){
      const reachable=reachableCells;
      if(ref.type==="cell")return reachable.has(ref.id);
      const entry=entities.get(ref.id),item=entry.item;
      if(entry.type==="monster"&&current.attackTargets.some(m=>m.id===item.id))return true;
      if(current.spellTargets?.includes(item.id))return true;
      if(entry.type==="door"&&current.adjacentDoors.some(d=>d.id===item.id))return true;
      if(entry.type==="hero"&&item.id===current.activeHero.id)return false;
      if(item.kind==="stairs"&&Topo.stairs.has(Topo.key(current.activeHero.x,current.activeHero.row)))return false;
      // Movement reach for a model means reaching its square or a free square
      // beside its footprint, through an open edge. Camera actions do not count.
      return Topo.approachCells(item,entry.type,{openDoors:current.doors.filter(d=>d.open).map(d=>d.id)}).some(id=>reachable.has(id));
    }
    function refreshGlow(){
      const targets=[];
      if(boardChoices) {
        for(const ref of boardChoices.values())if(interactive&&known(ref))targets.push(ref.type==="cell"?{point:world(ref.id,.17),reachable:true}:{model:entities.get(ref.id).model,reachable:true});
      } else for(const [ref,isSelected] of [[selected,true],[hovered,false]])if(interactive&&known(ref)&&(isSelected||refKey(ref)!==refKey(selected)))targets.push(ref.type==="cell"?{point:world(ref.id,Topo.stairs.has(ref.id)?.21:.17),reachable:inReach(ref)}:{model:entities.get(ref.id).model,reachable:inReach(ref)});
      glow.setTargets(targets);requestRender();
    }
    function setBoardChoices(refs) {
      boardChoices=refs?new Map(refs.filter(known).map(ref=>[refKey(ref),ref])):null;
      selected=null;hovered=null;keyboardPiece=refs?.find(ref=>ref.type==="piece"&&known(ref))||null;
      keyboardCell=refs?.find(ref=>ref.type==="cell"&&known(ref))?.id||null;
      setRoutePreview(null);refreshGlow();
    }
    const choiceAllowed=ref=>!boardChoices||boardChoices.has(refKey(ref));
    function setHover(ref){if(ref&&!known(ref))ref=null;if(refKey(ref)===refKey(hovered))return;hovered=ref;refreshGlow();onHover(ref);}
    function anchor(ref){
      if(!known(ref))return {x:0,y:0,inView:false};
      updateCamera();const entry=entities.get(ref.id),point=ref.type==="cell"?world(ref.id,.18):new T.Box3().setFromObject(entry.model).getCenter(new T.Vector3());point.project(camera);
      return {x:(point.x+1)*host.clientWidth/2,y:(1-point.y)*host.clientHeight/2,inView:point.z>=-1&&point.z<=1&&Math.abs(point.x)<1.15&&Math.abs(point.y)<1.15};
    }
    function setSelection(ref){setRoutePreview(null);if(!ref)hovered=null;selected=known(ref)?ref:null;if(selected){keyboardPiece=selected.type==="piece"?selected:null;if(selected.type==="cell")keyboardCell=selected.id;}refreshGlow();return selected?anchor(selected):null;}
    function setInteractive(enabled){interactive=enabled;if(!enabled){selected=null;hovered=null;setRoutePreview(null);}refreshGlow();}
    function heroPosition(id){return world(id,.15+(Topo.stairs.has(id)?.05:0));}
    function sourceReflections(materials) {
      if(!environment)environment=HQ.modelSurfaces.createEnvironment(renderer);
      HQ.modelSurfaces.applyReflections(materials,environment,torchLighting.enabled?ambientLightLevel*.08/26:.75);
    }
    function makeEntity(item,type) {
      let model;
      if(type==="wall")model=wallLayer.make(item);
      else if(type==="blocked")model=wallLayer.makeBlocked(item);
      else if(type==="torch")model=torchLighting.make(item);
      else if(type==="door")model=M.make(item.open?"open-door":"door");
      else if(item.kind==="stairs")model=M.makeProp(item.kind);
      else {
        const sideways=Math.abs(Math.sin(item.rotation||0))>.5;
        const options=type==="furniture"?{width:sideways?item.depth:item.width,depth:sideways?item.width:item.depth}:{};
        model=M.make(type==="monster"?HQ.monsterModel(item.kind,item.id):item.kind,options);
      }
      if(model.userData.paintedMaterials)sourceReflections(model.userData.paintedMaterials);
      if(type==="furniture"&&item.kind==="fireplace")torchLighting.registerFireplace(item,model);
      model.userData.entityId=item.id;model.userData.entityType=type;scene.add(model);return model;
    }
    function position(model,item,type) {
      if(type==="door"||type==="wall") {const half=type==="wall"?item.length/2:.5;model.position.set(item.x+(item.axis==="h"?half:0)-13,.15,item.row+(item.axis==="v"?half:0)-9.5);model.rotation.y=item.axis==="v"?Math.PI/2:0;}
      else {model.position.set(item.x+(item.width||1)/2-13,.15+(type==="hero"&&Topo.stairs.has(Topo.key(item.x,item.row))?.05:0),item.row+(item.depth||1)/2-9.5);model.rotation.y=(type==="hero"||type==="monster")?(facings.get(item.id)??item.rotation??0):(item.rotation||0);}
    }
    function setProjection(projection,{defeatedFigure=null,cutawayHero=projection.activeHero,preserveCamera=false}={}) {
      motion.finish();treasureEffects.finish();combatImpact.finish();
      renderer.shadowMap.needsUpdate=true;
      hovered=null;
      current=projection;currentDefeated=defeatedFigure;currentCutawayHero=cutawayHero;const discovered=knownCells=new Set(projection.discoveredCells);reachableCells=new Set(projection.reachable);
      terrain.reveal(projection.discoveredCells);terrain.setGrid(gridEnabled);
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
      statusEffects.sync(projection);
      bloodPools.sync(projection.fallen||[],defeatedFigure?.id);
      lightBarriers.setProjection(projection);lightBarriers.bind(scene);
      pickable=[...entities].filter(([,entry])=>selectable(entry));
      const hero=projection.focusFigure||projection.activeHero;ring.visible=["hero-turn","monster-turn"].includes(projection.phase)&&hero.body>0&&!hero.exit;ring.position.copy(world(Topo.key(hero.x,hero.row),.162));
      const newMark=hero.id+":"+hero.x+","+hero.row;if(follow&&newMark!==activeMark&&!preserveCamera&&!combatCamera.active)target.copy(world(Topo.key(hero.x,hero.row),.4));activeMark=newMark;
      loading.hidden=true;requestRender();
      refreshGlow();
    }
    function heroFocus(hero){const point=motion.movingId===hero.id?entities.get(hero.id).model.position.clone():world(Topo.key(hero.x,hero.row));point.y=.4;return point;}
    function centre(){if(combatCamera.active)return;if(current){follow=true;target.copy(heroFocus(current.activeHero));halfHeight=4.4;requestRender();}}
    function explored(){if(!current||combatCamera.active)return;const box=new T.Box3();current.discoveredCells.forEach(id=>{const p=world(id);box.expandByPoint(p.clone().addScalar(.6));box.expandByPoint(p.clone().addScalar(-.6));});box.getCenter(target);const size=box.getSize(new T.Vector3()),aspect=host.clientWidth/Math.max(1,host.clientHeight);halfHeight=Math.max(4.4,(size.z+size.x*.4)*.7,(size.x+size.z*.4)*.6/aspect);follow=false;requestRender();}
    function reveal(cells) {
      if(!cells.length||combatCamera.active)return;
      const box=new T.Box3();for(const id of cells)box.expandByPoint(world(id,.4));box.getCenter(target);
      const size=box.getSize(new T.Vector3()),aspect=host.clientWidth/Math.max(1,host.clientHeight);
      halfHeight=Math.max(halfHeight,Math.min(12,Math.max((size.z+size.x*.45+2)*.6,(size.x+size.z*.45+2)*.6/aspect)));follow=false;requestRender();
    }
    function zoom(factor){if(combatCamera.active)return;setHover(null);halfHeight=T.MathUtils.clamp(halfHeight/factor,1.8,20);requestRender();}
    function view(overhead){if(combatCamera.active)return;elevation=overhead?Math.PI/2-.001:.91;if(overhead)yaw=0;document.getElementById("view-overhead").setAttribute("aria-pressed",String(overhead));document.getElementById("view-tabletop").setAttribute("aria-pressed",String(!overhead));requestRender();}
    function pickTarget(event){if(!current||motion.active||combatCamera.active||!interactive)return null;const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);updateCamera();raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(pickable.filter(([id])=>choiceAllowed({type:"piece",id})).map(([,entry])=>entry.model),true);
      for(const hit of hits){if(!hit.object.visible)continue;let object=hit.object;while(object&&!object.userData.entityId)object=object.parent;if(!object)continue;const entry=entities.get(object.userData.entityId);
        if(entry.item.kind==="stairs"&&!boardChoices){const id=Topo.key(Math.floor(hit.point.x+13),Math.floor(hit.point.z+9.5));if(Topo.stairs.has(id))return {type:"cell",id};}
        return {type:"piece",id:entry.item.id};}
      const tiles=raycaster.intersectObjects(terrain.floors,false);for(const hit of tiles){const id=hit.object.userData.cells[hit.instanceId];if(knownCells.has(id)&&choiceAllowed({type:"cell",id}))return {type:"cell",id};}
      if(current.blindMovement&&!boardChoices) {
        const point=raycaster.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-.15),new T.Vector3());
        if(point){const id=Topo.key(Math.floor(point.x+13),Math.floor(point.z+9.5));if(Topo.floor.has(id))return {type:"cell",id};}
      }
      return null;
    }
    function pick(event){const ref=pickTarget(event);if(!ref){if(interactive&&!boardChoices){setSelection(null);onDismiss();}return;}if(ref.type==="cell")onCell(ref.id);else{const entry=entities.get(ref.id);onPiece({...entry.item,type:entry.type});}
    }
    const contacts=new Map();let down=null,pinch=null;
    canvas.addEventListener("pointerdown",e=>{if(combatCamera.active)return;if(e.pointerType==="mouse"&&e.button!==0)return;canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);contacts.set(e.pointerId,{x:e.clientX,y:e.clientY});if(contacts.size===1)down={x:e.clientX,y:e.clientY,dragged:false};if(contacts.size===2){const p=[...contacts.values()];pinch={distance:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),height:halfHeight};if(down)down.dragged=true;}});
    canvas.addEventListener("pointermove",e=>{if(combatCamera.active)return;const old=contacts.get(e.pointerId);if(!old){if(e.pointerType!=="touch")setHover(pickTarget(e));return;}contacts.set(e.pointerId,{x:e.clientX,y:e.clientY});if(contacts.size===2&&pinch){const p=[...contacts.values()],d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);halfHeight=T.MathUtils.clamp(pinch.height*pinch.distance/Math.max(d,1),1.8,20);requestRender();return;}if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)down.dragged=true;if(down?.dragged){setHover(null);canvas.classList.add("dragging");if(e.shiftKey){target.x-=(e.clientX-old.x)*Math.cos(yaw)*halfHeight/host.clientHeight*2;target.z+=(e.clientX-old.x)*Math.sin(yaw)*halfHeight/host.clientHeight*2;target.x-=(e.clientY-old.y)*Math.sin(yaw)*halfHeight/host.clientHeight*2;target.z-=(e.clientY-old.y)*Math.cos(yaw)*halfHeight/host.clientHeight*2;follow=false;}else{yaw-=(e.clientX-old.x)*.006;elevation=T.MathUtils.clamp(elevation+(e.clientY-old.y)*.004,.4,Math.PI/2-.001);}requestRender();}});
    canvas.addEventListener("pointerleave",()=>setHover(null));
    function release(e,cancelled){if(!contacts.has(e.pointerId))return;const click=contacts.size===1&&down&&!down.dragged&&!cancelled;contacts.delete(e.pointerId);pinch=null;if(contacts.size===1)down={...[...contacts.values()][0],dragged:true};if(!contacts.size){down=null;canvas.classList.remove("dragging");}if(click)pick(e);}
    canvas.addEventListener("pointerup",e=>release(e,false));canvas.addEventListener("pointercancel",e=>release(e,true));canvas.addEventListener("lostpointercapture",e=>release(e,true));
    canvas.addEventListener("wheel",e=>{e.preventDefault();zoom(Math.exp(-T.MathUtils.clamp(e.deltaY,-120,120)*.0018));},{passive:false});
    canvas.addEventListener("keydown",e=>{
      if(combatCamera.active)return;
      if(e.key==="Escape"){if(boardChoices){e.preventDefault();e.stopPropagation();}setSelection(null);onDismiss();return;}
      if(interactive&&["[","]"].includes(e.key)){
        e.preventDefault();const pieces=pickable.map(([id])=>({type:"piece",id})).filter(choiceAllowed);
        if(pieces.length){const index=pieces.findIndex(ref=>ref.id===keyboardPiece?.id),next=index<0?(e.key==="]"?0:pieces.length-1):(index+(e.key==="]"?1:-1)+pieces.length)%pieces.length;keyboardPiece=pieces[next];setHover(keyboardPiece);}return;
      }
      if(interactive&&(e.key==="Enter"||e.shiftKey&&e.key.startsWith("Arrow"))){
        e.preventDefault();if(!keyboardCell||!known({type:"cell",id:keyboardCell}))keyboardCell=Topo.key(current.activeHero.x,current.activeHero.row);
        if(e.key==="Enter"){
          const ref=known(keyboardPiece)?keyboardPiece:{type:"cell",id:keyboardCell};
          if(!choiceAllowed(ref))return;
          if(!anchor(ref).inView){if(ref.type==="cell")target.copy(world(ref.id,.4));else new T.Box3().setFromObject(entities.get(ref.id).model).getCenter(target);follow=false;requestRender();}
          if(ref.type==="cell")onCell(ref.id);else{const entry=entities.get(ref.id);onPiece({...entry.item,type:entry.type});}return;
        }
        keyboardPiece=null;
        const [x,row]=Topo.parse(keyboardCell),[dx,dy]={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key],next=Topo.key(x+dx,row+dy);
        if(known({type:"cell",id:next})){keyboardCell=next;if(choiceAllowed({type:"cell",id:next}))setHover({type:"cell",id:next});}return;
      }
      if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","+","=","-","Home"].includes(e.key))return;e.preventDefault();if(e.key==="Home"){centre();return;}if(e.key==="+"||e.key==="="){zoom(1.15);return;}if(e.key==="-"){zoom(1/1.15);return;}if(e.key==="ArrowLeft")yaw-=.12;if(e.key==="ArrowRight")yaw+=.12;if(e.key==="ArrowUp")elevation+=.08;if(e.key==="ArrowDown")elevation-=.08;elevation=T.MathUtils.clamp(elevation,.4,Math.PI/2-.001);requestRender();});
    function finishPresentation(){cameraMotion.finishWait();motion.finish();treasureEffects.finish();combatImpact.finish();spellEffects.finish();combatCamera.finish();}
    function stopRendering(){clearTimeout(torchTimer);torchTimer=0;if(frame)cancelAnimationFrame(frame);frame=0;}
    canvas.addEventListener("webglcontextlost",e=>{e.preventDefault();contextReady=false;finishPresentation();stopRendering();loading.hidden=false;loading.textContent="Waiting for the browser to restore the graphics…";});
    canvas.addEventListener("webglcontextrestored",()=>{contextReady=true;renderer.shadowMap.needsUpdate=true;loading.hidden=true;requestRender();});
    document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden"){finishPresentation();stopRendering();}else requestRender();});
    reducedMotion.addEventListener("change",()=>{if(reducedMotion.matches)finishPresentation();requestRender();});
    window.addEventListener("pagehide",()=>{finishPresentation();stopRendering();});
    window.addEventListener("heroquest-artwork-ready",requestRender);
    setTorchLighting(true);
    setCinematicCameraEnabled(true);
    new ResizeObserver(resize).observe(host);loading.hidden=true;resize();
    return Object.freeze({setProjection,async animateMovement(movement,{holdView=false}={}){
        const entry=entities.get(movement.actorId);
        if(!entry?.model.visible){if(combatCamera.active)await combatCamera.leave();return motion.animateMovement(movement);}
        const cinematic=cinematicCameraEnabled&&(!movement.visibility||movement.visibility.every(Boolean));
        if(!cinematic&&combatCamera.active)await combatCamera.leave();
        follow=true;target.copy(world(movement.from,.4));if(!combatCamera.active)await cameraMotion.arrive();
        if(cinematic&&movement.path.length){
          const from=world(movement.from),to=world(movement.path[0]);
          await combatCamera.enterActor(movement.actorId,{heading:Math.atan2(to.x-from.x,to.z-from.z),track:true});
        }
        await motion.animateMovement(movement);
        if(cinematic&&combatCamera.active){await combatCamera.hold(180);if(!holdView)await combatCamera.leave();}
      },animateAttack(attackerId,defenderId){
        motion.finish();contacts.clear();down=null;pinch=null;canvas.classList.remove("dragging");
        const attacker=entities.get(attackerId),defender=entities.get(defenderId);
        if(attacker?.model.visible&&defender?.model.visible){const delta=defender.model.position.clone().sub(attacker.model.position),angle=Math.atan2(delta.x,delta.z);facings.set(attackerId,angle);attacker.model.rotation.y=angle;renderer.shadowMap.needsUpdate=true;requestRender();}
        // Cosmetic cadence only: most attacks remain over the shoulder. Do not
        // consume game RNG or inspect the already-resolved damage/dice result.
        const firstPerson=cinematicCameraEnabled&&++attackShots%4===0;
        updateCamera();return cinematicCameraEnabled?combatCamera.enter(attackerId,defenderId,firstPerson):Promise.resolve();
      },async animateAction(actorId,targetId,applyVisual){
        if(!cinematicCameraEnabled){applyVisual?.();return;}
        const entry=entities.get(targetId),point=entry?.model.visible?entry.model.position.clone().add(new T.Vector3(0,.9,0)):null;
        await combatCamera.enterActor(actorId,{point});applyVisual?.();
        await combatCamera.hold();await combatCamera.leave();
      },async animateSpell(report){
        const anchors=spellEffects.locate(report);if(!anchors||!spellEffects.available)return;
        const distance=anchors.from.distanceTo(anchors.to),direction=anchors.to.clone().sub(anchors.from);direction.y=0;
        if(direction.lengthSq()>.001){const angle=Math.atan2(direction.x,direction.z);facings.set(report.attackerId,angle);anchors.caster.model.rotation.y=angle;renderer.shadowMap.needsUpdate=true;}
        spellFocus=anchors.to.clone();follow=false;
        if(!cinematicCameraEnabled){
          target.copy(distance<7?anchors.to.clone().lerp(anchors.from,.3):anchors.to);target.y=.4;
          halfHeight=Math.max(3.1,Math.min(halfHeight,Math.max(3.6,Math.min(distance,7)*.42+1.8)));
        }
        requestRender();
        try {
          if(cinematicCameraEnabled)await combatCamera.enterActor(report.attackerId,anchors.target===anchors.caster?{}:{point:anchors.to});
          else await cameraMotion.arrive({threshold:.3,timeout:1200});
          await spellEffects.play(report,anchors);
        } finally {spellFocus=null;requestRender();}
      },
      animateHit:combatImpact.play,animateHealthChanges:combatImpact.playChanges,
      async animateTreasureHazard(report,changes){
        const entry=entities.get(report.defenderId);
        if(entry?.model.visible){
          if(combatCamera.active)await combatCamera.leave();
          follow=true;target.copy(entry.model.position);target.y=.4;requestRender();
          await cameraMotion.arrive({threshold:.3,timeout:1200});
        }
        return treasureEffects.play(report,options=>combatImpact.playChanges(changes,report,options));
      },
      finishPresentation,finishAttack:combatCamera.leave,resetCombatCamera:combatCamera.finish,
      animateDefeat(defenderId,attackerId,fallen){
        if(fallen){bloodPools.sync(fallen);lightBarriers.bind(scene);requestRender();}
        return motion.animateDefeat(defenderId,attackerId);
      },
      get actionCameraActive(){return combatCamera.active;},
      setSelection,setInteractive,setBoardChoices,setRoutePreview,centre,explored,reveal,zoom,view,resetFacing(){finishPresentation();facings.clear();attackShots=0;},
      setTorchLighting,setAmbientLightLevel,setCinematicCameraEnabled,
      setWallMode(mode){wallLayer.setMode(mode);renderer.shadowMap.needsUpdate=true;requestRender();},
      cycleWallMode(){const next=wallLayer.modes[(wallLayer.modes.indexOf(wallLayer.mode)+1)%wallLayer.modes.length];wallLayer.setMode(next);renderer.shadowMap.needsUpdate=true;requestRender();},
      snapshot(){return {yaw,elevation,halfHeight,target:target.toArray(),follow,gridEnabled,wallMode:wallLayer.mode,torchLightingEnabled:torchLighting.enabled,ambientLightLevel,cinematicCameraEnabled,facings:Object.fromEntries(facings)};},
      restore(saved) {
        if(!saved||typeof saved!=="object")return;
        combatCamera.finish();
        if(Number.isFinite(saved.yaw))yaw=saved.yaw;
        if(Number.isFinite(saved.elevation))elevation=T.MathUtils.clamp(saved.elevation,.4,Math.PI/2-.001);
        if(Number.isFinite(saved.halfHeight))halfHeight=T.MathUtils.clamp(saved.halfHeight,1.8,100);
        if(Array.isArray(saved.target)&&saved.target.length===3&&saved.target.every(n=>Number.isFinite(n)&&Math.abs(n)<1000))target.fromArray(saved.target);
        if(typeof saved.follow==="boolean")follow=saved.follow;
        if(typeof saved.cinematicCameraEnabled==="boolean")setCinematicCameraEnabled(saved.cinematicCameraEnabled);
        else if(typeof saved.firstPersonEnabled==="boolean")setCinematicCameraEnabled(saved.firstPersonEnabled);
        if(typeof saved.gridEnabled==="boolean"){gridEnabled=saved.gridEnabled;terrain.setGrid(gridEnabled);}
        if(wallLayer.modes.includes(saved.wallMode))wallLayer.setMode(saved.wallMode);
        else if(saved.wallsEnabled===false)wallLayer.setMode("low");
        if(Number.isFinite(saved.ambientLightLevel))setAmbientLightLevel(saved.ambientLightLevel);
        if(typeof saved.torchLightingEnabled==="boolean")setTorchLighting(saved.torchLightingEnabled);
        if(saved.facings&&typeof saved.facings==="object")for(const [id,angle] of Object.entries(saved.facings))if(Number.isFinite(angle))facings.set(id,angle);
        const overhead=elevation>=Math.PI/2-.002;
        document.getElementById("view-overhead").setAttribute("aria-pressed",String(overhead));document.getElementById("view-tabletop").setAttribute("aria-pressed",String(!overhead));
        if(current)setProjection(current,{defeatedFigure:currentDefeated,cutawayHero:currentCutawayHero});requestRender();
      },
      focusPiece(id){if(combatCamera.active)return;const entry=entities.get(id);if(entry?.model.visible){new T.Box3().setFromObject(entry.model).getCenter(target);target.y=.4;follow=entry.type==="hero"&&id===current.activeHero.id;requestRender();}},
      setGrid(enabled){gridEnabled=enabled;terrain.setGrid(enabled);requestRender();},focusHero(id){if(combatCamera.active)return;const h=current?.heroes.find(h=>h.id===id);if(h){target.copy(heroFocus(h));follow=h.id===current.activeHero.id;halfHeight=4.4;requestRender();}}});
  };
})();

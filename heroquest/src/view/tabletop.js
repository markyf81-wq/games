(function () {
  "use strict";
  const HQ=window.HeroQuest,T=window.HQThree,Topo=HQ.topology,Q=HQ.trial;
  HQ.createTabletop=function ({onCell,onPiece,onDismiss=()=>{},onAnchor=()=>{}}) {
    const canvas=document.getElementById("board-canvas"),host=document.getElementById("canvas-host"),loading=document.getElementById("loading-message");
    if(!T||!HQ.models)throw new Error("The local 3D renderer or model files could not load.");
    const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
    renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
    const scene=new T.Scene(),camera=new T.OrthographicCamera(-8,8,6,-6,.1,150),target=new T.Vector3(-10,.3,6);
    const raycaster=new T.Raycaster(),pointer=new T.Vector2(),entities=new Map(),floorGroups=[];
    const grid=new T.Group(),walls=new T.Group(),highlights=new T.Group();scene.add(grid,walls,highlights);
    const M=HQ.models;let frame=0,contextReady=true,yaw=.1,elevation=.91,halfHeight=4.4,current=null,follow=true,gridEnabled=true,wallsEnabled=true,activeMark=null,environment=null;
    const reducedMotion=window.matchMedia("(prefers-reduced-motion: reduce)");
    const stepDuration=180,hopHeight=.12;let movement=null;
    const glow=HQ.createInteractionGlow(renderer);
    let selected=null,hovered=null,interactive=false,keyboardCell=null,keyboardPiece=null;
    const facings=new Map();
    scene.add(new T.HemisphereLight(0xe9edda,0x3f4a38,2.1));
    const sun=new T.DirectionalLight(0xffe5bd,3.2);sun.position.set(-10,23,9);sun.castShadow=true;
    sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-24,right:24,top:21,bottom:-21,near:1,far:70});sun.shadow.normalBias=.035;sun.shadow.bias=-.00015;scene.add(sun);
    const fill=new T.DirectionalLight(0xccdde3,1.6);fill.position.set(12,13,-14);scene.add(fill);
    function stoneTexture() {
      const image=document.createElement("canvas");image.width=image.height=128;const ctx=image.getContext("2d");ctx.fillStyle="#918774";ctx.fillRect(0,0,128,128);
      for(let i=0;i<1600;i++){const n=(Math.sin(i*91.37)*.5+.5);ctx.fillStyle=i%2?"#ffffff0a":"#191c1b12";ctx.fillRect(n*128,((i*43)%127),1+(i%3),1);}
      const texture=new T.CanvasTexture(image);texture.colorSpace=T.SRGBColorSpace;return texture;
    }
    const tileGeometry=new T.BoxGeometry(.985,.15,.985),texture=stoneTexture();
    const byRegion=new Map();Q.floor.forEach(id=>{const r=Topo.regions.get(id);if(!byRegion.has(r))byRegion.set(r,[]);byRegion.get(r).push(id);});
    const dummy=new T.Object3D();
    for(const [region,cells] of byRegion) {
      const material=new T.MeshStandardMaterial({map:texture,color:region==="corridor"?0xb0b7a5:0xd1c6a8,roughness:.97});
      const mesh=new T.InstancedMesh(tileGeometry,material,cells.length);mesh.receiveShadow=true;mesh.userData.cells=cells;mesh.frustumCulled=false;
      cells.forEach((id,i)=>{dummy.position.set(0,0,0);dummy.scale.setScalar(0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,new T.Color(0xffffff));});
      mesh.instanceMatrix.needsUpdate=true;scene.add(mesh);floorGroups.push({mesh,cells});
    }
    const ringMaterial=new T.MeshBasicMaterial({color:0xe3c383,transparent:true,opacity:.82,depthWrite:false});
    const ring=new T.Mesh(new T.RingGeometry(.43,.48,40),ringMaterial);ring.rotation.x=-Math.PI/2;ring.position.y=.168;scene.add(ring);ring.visible=false;
    const reachableMaterial=new T.MeshBasicMaterial({color:0xffca69,transparent:true,opacity:.18,depthWrite:false});
    const gridMaterial=new T.LineBasicMaterial({color:0x262f26,transparent:true,opacity:.55});
    const highlightGeometry=new T.PlaneGeometry(.83,.83),wallSurface=M.material(0x566151,.96);
    function requestRender(){if(!frame&&contextReady&&document.visibilityState!=="hidden")frame=requestAnimationFrame(draw);}
    function updateCamera(){const aspect=host.clientWidth/Math.max(1,host.clientHeight);camera.left=-halfHeight*aspect;camera.right=halfHeight*aspect;camera.top=halfHeight;camera.bottom=-halfHeight;camera.updateProjectionMatrix();camera.position.set(target.x+Math.sin(yaw)*Math.cos(elevation)*45,target.y+Math.sin(elevation)*45,target.z+Math.cos(yaw)*Math.cos(elevation)*45);camera.lookAt(target);camera.updateMatrixWorld();}
    function draw(time){frame=0;advanceMovement(time);updateCamera();renderer.render(scene,camera);glow.render(camera);if(selected)onAnchor(anchor(selected));if(movement)requestRender();}
    function resize(){renderer.setSize(host.clientWidth,host.clientHeight,false);requestRender();}
    function clear(group){while(group.children.length){const child=group.children[0];if(child.geometry&&child.geometry!==highlightGeometry)child.geometry.dispose();group.remove(child);}}
    function world(id,y=.075){const [x,row]=Topo.parse(id);return new T.Vector3(x+.5-13,y,row+.5-9.5);}
    const refKey=ref=>ref?ref.type+":"+ref.id:"";
    function known(ref){return ref&&(ref.type==="cell"?current?.discoveredCells.includes(ref.id):entities.get(ref.id)?.model.visible);}
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
    function setHover(ref){if(refKey(ref)===refKey(hovered))return;hovered=ref;refreshGlow();}
    function anchor(ref){
      if(!known(ref))return {x:0,y:0,inView:false};
      updateCamera();const point=ref.type==="cell"?world(ref.id,.18):new T.Box3().setFromObject(entities.get(ref.id).model).getCenter(new T.Vector3());point.project(camera);
      return {x:(point.x+1)*host.clientWidth/2,y:(1-point.y)*host.clientHeight/2,inView:point.z>=-1&&point.z<=1&&Math.abs(point.x)<1.15&&Math.abs(point.y)<1.15};
    }
    function setSelection(ref){selected=known(ref)?ref:null;if(selected){keyboardPiece=selected.type==="piece"?selected:null;if(selected.type==="cell")keyboardCell=selected.id;}refreshGlow();return selected?anchor(selected):null;}
    function setInteractive(enabled){interactive=enabled;if(!enabled){selected=null;hovered=null;}refreshGlow();}
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
      const resolve=movement.resolve;movement=null;highlights.visible=true;resolve();requestRender();
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
      finishMovement();
      const headings=motion.path.map((id,i)=>direction(i?motion.path[i-1]:motion.from,id));
      if(headings.length)facings.set(motion.actorId,headings[headings.length-1]);
      const entry=entities.get(motion.actorId);
      if(!entry||!entry.model.visible||!motion.path.length||reducedMotion.matches||!contextReady||document.visibilityState==="hidden")return Promise.resolve();
      return new Promise(resolve=>{
        const movesRing=entry.type==="hero";
        movement={model:entry.model,movesRing,headings,segment:-1,fromYaw:entry.model.rotation.y,visibility:motion.visibility,points:[motion.from,...motion.path].map(id=>movesRing?heroPosition(id):world(id,.15)),point:new T.Vector3(),started:null,resolve};
        entry.model.position.copy(movement.points[0]);highlights.visible=false;requestRender();
      });
    }
    function sourceReflections(materials) {
      if(!environment){const image=document.createElement("canvas");image.width=512;image.height=256;const ctx=image.getContext("2d"),g=ctx.createLinearGradient(0,0,0,256);g.addColorStop(0,"#c2cbd0");g.addColorStop(.5,"#555d5c");g.addColorStop(1,"#242b25");ctx.fillStyle=g;ctx.fillRect(0,0,512,256);ctx.fillStyle="#fff0d6";ctx.fillRect(70,35,90,110);ctx.fillStyle="#e4f0fa";ctx.fillRect(310,20,40,150);const tx=new T.CanvasTexture(image);tx.colorSpace=T.SRGBColorSpace;tx.mapping=T.EquirectangularReflectionMapping;const gen=new T.PMREMGenerator(renderer);environment=gen.fromEquirectangular(tx);tx.dispose();gen.dispose();}
      for(const material of materials)if(material.metalness>.3){material.envMap=environment.texture;material.envMapIntensity=.75;material.needsUpdate=true;}
    }
    function simpleProp(kind) {
      const group=new T.Group(),wood=M.material(0x694d33,.93),stone=M.material(0x8b8b7a,.98);
      if(kind==="stairs") {
        M.box(group,1.94,.025,1.94,stone,0,.013,0);
        for(let i=0;i<7;i++)M.box(group,1.8-i*.17,.018,.16,M.material(i%2?0x6c7668:0xa0a08a,.98),-.05,.033,-.8+i*.24);
      } else if(kind==="bookcase") {
        M.box(group,2.83,1.5,.18,wood,0,.75,-.30);
        for(const x of [-1.37,1.37])M.box(group,.13,1.55,.78,wood,x,.77,0);
        for(const y of [.09,.55,1.02,1.5])M.box(group,2.86,.08,.8,wood,0,y,0);
        const colours=[0x633b31,0x475c47,0x79705b,0x403f34,0x78604b];
        for(let row=0;row<3;row++)for(let i=0;i<13;i++){const h=.27+(i%4)*.028;M.box(group,.13,h,.42,M.material(colours[(i+row*3)%5],.98),-1.2+i*.19,.16+row*.46+h/2,.1);}
      } else {
        for(const x of [-1.24,1.24])M.box(group,.12,1.32,.16,wood,x,.66,0);
        M.box(group,2.7,.12,.14,wood,0,1.26,0);M.box(group,2.65,.1,.45,wood,0,.08,0);
        for(let i=0;i<5;i++){M.box(group,.045,.9,.05,M.material(0x737c7c,.45,.45),-.95+i*.47,.72,.03);M.box(group,.24,.04,.07,wood,-.95+i*.47,.44,.03);}
      }
      return group;
    }
    function makeEntity(item,type) {
      let model;
      if(type==="door")model=M.make(item.open?"open-door":"door");
      else if(["stairs","bookcase","weapons-rack"].includes(item.kind))model=simpleProp(item.kind);
      else {
        const sideways=Math.abs(Math.sin(item.rotation||0))>.5;
        const options=type==="furniture"?{width:sideways?item.depth:item.width,depth:sideways?item.width:item.depth}:{};
        model=M.make(item.kind,options);
      }
      if(model.userData.paintedMaterials)sourceReflections(model.userData.paintedMaterials);
      model.userData.entityId=item.id;model.userData.entityType=type;scene.add(model);return model;
    }
    function position(model,item,type) {
      if(type==="door") {model.position.set(item.x+(item.axis==="h"?.5:0)-13,.15,item.row+(item.axis==="v"?.5:0)-9.5);model.rotation.y=item.axis==="v"?Math.PI/2:0;}
      else {model.position.set(item.x+(item.width||1)/2-13,.15+(type==="hero"&&Topo.stairs.has(Topo.key(item.x,item.row))?.05:0),item.row+(item.depth||1)/2-9.5);model.rotation.y=(type==="hero"||type==="monster")?(facings.get(item.id)??item.rotation??0):(item.rotation||0);}
    }
    function setProjection(projection) {
      current=projection;const discovered=new Set(projection.discoveredCells),visible=new Set(projection.visibleCells);
      for(const {mesh,cells} of floorGroups){cells.forEach((id,i)=>{dummy.position.copy(world(id));dummy.rotation.set(0,0,0);dummy.scale.setScalar(discovered.has(id)?1:0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,new T.Color().setScalar(visible.has(id)?1:.48));});mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();}
      clear(grid);clear(walls);clear(highlights);
      const gridPositions=[],wallKeys=new Set();
      for(const id of discovered) {
        const [x,row]=Topo.parse(id),left=x-13,top=row-9.5;
        for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]) {
          const other=Topo.key(x+dx,row+dy),edge=Topo.edgeKey(id,other);
          if(!(Topo.stairs.has(id)&&Topo.stairs.has(other))) {
            const a=dx?[left+(dx>0?1:0),top]:[left,top+(dy>0?1:0)],b=dx?[a[0],top+1]:[left+1,a[1]];
            gridPositions.push(a[0],.153,a[1],b[0],.153,b[1]);
          }
          const hasDoor=projection.doors.some(d=>Topo.edgeKey(...Topo.endpoints(d))===edge);
          if(wallKeys.has(edge)||hasDoor||Topo.floor.has(other)&&Topo.regions.get(id)===Topo.regions.get(other))continue;
          wallKeys.add(edge);const vertical=dx!==0;
          M.box(walls,vertical?.09:1.02,.20,vertical?1.02:.09,wallSurface,left+.5+dx*.5,.25,top+.5+dy*.5);
        }
      }
      const geom=new T.BufferGeometry();geom.setAttribute("position",new T.Float32BufferAttribute(gridPositions,3));grid.add(new T.LineSegments(geom,gridMaterial));grid.visible=gridEnabled;walls.visible=wallsEnabled;
      let stairsMarked=false;
      for(const id of projection.reachable) {
        if(Topo.stairs.has(id)) {
          if(stairsMarked||Topo.stairs.has(Topo.key(projection.activeHero.x,projection.activeHero.row)))continue;
          stairsMarked=true;const stairs=Q.furniture.find(f=>f.kind==="stairs"),marker=new T.Mesh(highlightGeometry,reachableMaterial);
          marker.rotation.x=-Math.PI/2;marker.scale.set(stairs.width/.83,stairs.depth/.83,1);marker.position.set(stairs.x+stairs.width/2-13,.24,stairs.row+stairs.depth/2-9.5);highlights.add(marker);
        } else {const marker=new T.Mesh(highlightGeometry,reachableMaterial);marker.rotation.x=-Math.PI/2;marker.position.copy(world(id,.17));highlights.add(marker);}
      }
      const wanted=new Set(),items=[...projection.heroes.map(i=>[i,"hero"]),...projection.monsters.map(i=>[i,"monster"]),...projection.furniture.map(i=>[i,"furniture"]),...projection.doors.map(i=>[i,"door"]),...Q.blocked.filter(id=>discovered.has(id)).map(id=>{const [x,row]=Topo.parse(id);return [{id:"blocked-"+id,x,row,kind:"blocked"},"blocked"];})];
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
    function pickTarget(event){if(!current||movement||!interactive)return null;const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);updateCamera();raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects([...entities.values()].filter(e=>e.model.visible).map(e=>e.model),true);if(hits.length){let object=hits[0].object;while(object&&!object.userData.entityId)object=object.parent;if(object)return {type:"piece",id:object.userData.entityId};}
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
        e.preventDefault();const pieces=[...entities].filter(([,entry])=>entry.model.visible).map(([id])=>({type:"piece",id}));
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
    canvas.addEventListener("webglcontextlost",e=>{e.preventDefault();contextReady=false;if(frame)cancelAnimationFrame(frame);frame=0;finishMovement();loading.hidden=false;loading.textContent="Waiting for the browser to restore the graphics…";});
    canvas.addEventListener("webglcontextrestored",()=>{contextReady=true;loading.hidden=true;requestRender();});
    document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")finishMovement();else requestRender();});
    reducedMotion.addEventListener("change",()=>{if(reducedMotion.matches)finishMovement();});
    new ResizeObserver(resize).observe(host);loading.hidden=true;resize();
    return Object.freeze({setProjection,animateMovement,setSelection,setInteractive,centre,explored,zoom,view,resetFacing(){facings.clear();},
      snapshot(){return {yaw,elevation,halfHeight,target:target.toArray(),follow,gridEnabled,wallsEnabled,facings:Object.fromEntries(facings)};},
      restore(saved) {
        if(!saved||typeof saved!=="object")return;
        if(Number.isFinite(saved.yaw))yaw=saved.yaw;
        if(Number.isFinite(saved.elevation))elevation=T.MathUtils.clamp(saved.elevation,.4,Math.PI/2-.001);
        if(Number.isFinite(saved.halfHeight))halfHeight=T.MathUtils.clamp(saved.halfHeight,1.8,100);
        if(Array.isArray(saved.target)&&saved.target.length===3&&saved.target.every(n=>Number.isFinite(n)&&Math.abs(n)<1000))target.fromArray(saved.target);
        if(typeof saved.follow==="boolean")follow=saved.follow;
        if(typeof saved.gridEnabled==="boolean"){gridEnabled=saved.gridEnabled;grid.visible=gridEnabled;}
        if(typeof saved.wallsEnabled==="boolean"){wallsEnabled=saved.wallsEnabled;walls.visible=wallsEnabled;}
        if(saved.facings&&typeof saved.facings==="object")for(const [id,angle] of Object.entries(saved.facings))if(Number.isFinite(angle))facings.set(id,angle);
        const overhead=elevation>=Math.PI/2-.002;
        document.getElementById("view-overhead").setAttribute("aria-pressed",String(overhead));document.getElementById("view-tabletop").setAttribute("aria-pressed",String(!overhead));
        if(current)setProjection(current);requestRender();
      },
      focusPiece(id){const entry=entities.get(id);if(entry?.model.visible){new T.Box3().setFromObject(entry.model).getCenter(target);target.y=.4;follow=entry.type==="hero"&&id===current.activeHero.id;requestRender();}},
      setGrid(enabled){gridEnabled=enabled;grid.visible=enabled;requestRender();},setWalls(enabled){wallsEnabled=enabled;walls.visible=enabled;requestRender();},focusHero(id){const h=current?.heroes.find(h=>h.id===id);if(h){target.copy(heroFocus(h));follow=h.id===current.activeHero.id;halfHeight=4.4;requestRender();}}});
  };
})();

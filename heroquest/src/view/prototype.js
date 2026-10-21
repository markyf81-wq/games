(function () {
  "use strict";
  const HQ=window.HeroQuest,T=window.HQThree;
  const canvas=document.getElementById("board-canvas"),host=document.getElementById("canvas-host");
  const loading=document.getElementById("loading-message");
  function showError(message) {loading.hidden=false;loading.className="error-message";loading.textContent=message;}
  if(!T || !HQ.models) {showError("The 3D renderer could not load. Keep this page with its vendor and src folders, then reload.");return;}
  let renderer;
  try {renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true});}
  catch(error) {showError("This tabletop needs WebGL 2. Enable browser hardware acceleration or try a browser with WebGL 2 support.");return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
  const scene=new T.Scene();
  const camera=new T.OrthographicCamera(-20,20,15,-15,.1,150);
  const target=new T.Vector3(0,.25,0);
  let yaw=.15,elevation=.88,zoom=1,frame=0,contextReady=true,overhead=false;
  let selected=null,studio=false;
  let studioHalfHeight=1.85,studioHalfWidth=.85;
  const B=HQ.board,M=HQ.models;
  const floors=[],grids=[],wallParts=[],pieces=new Map();
  const sampleRoom="room-11";
  const raycaster=new T.Raycaster(),pointer=new T.Vector2();
  const boardBase=new T.Group(),wallGroup=new T.Group(),gridGroup=new T.Group();
  scene.add(boardBase,wallGroup,gridGroup);
  scene.add(new T.HemisphereLight(0xe8eddc,0x414c3b,2.1));
  const sun=new T.DirectionalLight(0xffe6bc,3.4);sun.position.set(-10,23,9);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-23;sun.shadow.camera.right=23;
  sun.shadow.camera.top=19;sun.shadow.camera.bottom=-19;sun.shadow.camera.near=1;sun.shadow.camera.far=65;
  sun.shadow.normalBias=.035;sun.shadow.bias=-.00015;sun.shadow.radius=3;scene.add(sun);
  const fill=new T.DirectionalLight(0xc9dbdc,1.5);fill.position.set(11,12,-14);scene.add(fill);

  function random(seed) {let n=seed>>>0;return function(){n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
  function stoneSurface(colour,seed) {
    const image=document.createElement("canvas");image.width=256;image.height=256;
    const ctx=image.getContext("2d"),r=random(seed);
    ctx.fillStyle=colour;ctx.fillRect(0,0,256,256);
    for(let i=0;i<2600;i++){const shade=r()>.48?255:0;ctx.fillStyle=`rgba(${shade},${shade},${shade},${r()*.065})`;ctx.fillRect(r()*256,r()*256,r()*3+.4,r()*2+.3);}
    const glow=ctx.createRadialGradient(95,70,10,128,128,185);glow.addColorStop(0,"#ffffff0d");glow.addColorStop(1,"#00000018");ctx.fillStyle=glow;ctx.fillRect(0,0,256,256);
    for(let i=0;i<4;i++){const x=r()*256,y=r()*256;ctx.strokeStyle="#302b2320";ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+r()*35-17,y+r()*40-20);ctx.lineTo(x+r()*45-22,y+r()*60-30);ctx.stroke();}
    const texture=new T.CanvasTexture(image);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
    return new T.MeshStandardMaterial({map:texture,roughness:.96,color:0xffffff});
  }
  const surfaces=["#91856d","#84856e","#91826b","#979183","#817965","#8c856e","#827e72","#95876e"].map((c,i)=>stoneSurface(c,i+17));
  const corridorSurface=stoneSurface("#74796c",149);
  const roomAt=(x,row)=>B.rooms.find(room=>x>=room.x&&x<room.x+room.width&&row>=room.row&&row<room.row+room.depth);
  const cellsByRegion=new Map([["corridor",[]]]);
  B.rooms.forEach(room=>cellsByRegion.set(room.id,[]));
  for(let row=0;row<B.rows;row++)for(let x=0;x<B.columns;x++)cellsByRegion.get(roomAt(x,row)?.id||"corridor").push({x,row});
  const matrix=new T.Object3D(),tileGeometry=new T.BoxGeometry(.995,.16,.995);
  let regionIndex=0;
  for(const [region,cells] of cellsByRegion) {
    const surface=region==="corridor"?corridorSurface:surfaces[regionIndex++%surfaces.length];
    const tiles=new T.InstancedMesh(tileGeometry,surface,cells.length);tiles.receiveShadow=true;
    cells.forEach(({x,row},i)=>{
      matrix.position.set(x+.5-13,.08,row+.5-9.5);matrix.rotation.set(0,((x*7+row*13)%4)*Math.PI/2,0);
      matrix.updateMatrix();tiles.setMatrixAt(i,matrix.matrix);
      tiles.setColorAt(i,new T.Color().setScalar(.94+((x*11+row*7)%9)*.014));
    });
    tiles.instanceMatrix.needsUpdate=true;scene.add(tiles);floors.push({region,mesh:tiles});
    const vertices=[];
    for(const {x,row} of cells) {
      const left=x-13,right=left+1,top=row-9.5,bottom=top+1;
      vertices.push(left,.164,top,right,.164,top,right,.164,top,right,.164,bottom,right,.164,bottom,left,.164,bottom,left,.164,bottom,left,.164,top);
    }
    const geometry=new T.BufferGeometry();geometry.setAttribute("position",new T.Float32BufferAttribute(vertices,3));
    const lines=new T.LineSegments(geometry,new T.LineBasicMaterial({color:0x302f27,transparent:true,opacity:.43}));
    gridGroup.add(lines);grids.push({region,mesh:lines});
  }
  // A full rectangular plinth is shown only in the full-board study.
  M.box(boardBase,27.1,.38,20.1,M.material(0x382e20),0,-.25,0);
  M.box(boardBase,26.7,.12,19.7,M.material(0x6f5c3b),0,-.005,0);
  const frameMaterial=M.material(0x413c2a),trim=M.material(0x9b8351,.63,.25);
  for(const z of [-9.77,9.77]) {
    M.box(boardBase,26.8,.21,.48,frameMaterial,0,.075,z);
    M.box(boardBase,26.6,.025,.025,trim,0,.19,z);
  }
  for(const x of [-13.27,13.27]) {
    M.box(boardBase,.48,.21,19.1,frameMaterial,x,.075,0);
    M.box(boardBase,.025,.025,19.5,trim,x,.19,0);
  }
  for(const x of [-13.24,13.24])for(const z of [-9.74,9.74]) {
    M.box(boardBase,.35,.025,.35,trim,x,.19,z);
    const pin=new T.Mesh(new T.SphereGeometry(.042,8,5),M.material(0x574d32,.5,.5));pin.position.set(x,.215,z);boardBase.add(pin);
  }
  const ground=new T.Mesh(new T.PlaneGeometry(180,180),new T.ShadowMaterial({color:0x040c06,opacity:.28}));
  ground.rotation.x=-Math.PI/2;ground.position.y=-.48;ground.receiveShadow=true;scene.add(ground);

  const edges=new Map();
  function addEdge(axis,start,row,owner) {
    const key=[axis,start,row].join(":");
    if(!edges.has(key))edges.set(key,{axis,start,row,owners:[]});edges.get(key).owners.push(owner);
  }
  for(const room of B.rooms) {
    for(let x=room.x;x<room.x+room.width;x++){addEdge("h",x,room.row,room.id);addEdge("h",x,room.row+room.depth,room.id);}
    for(let r=room.row;r<room.row+room.depth;r++){addEdge("v",room.x,r,room.id);addEdge("v",room.x+room.width,r,room.id);}
  }
  const wallSurface=M.material(0x5e6253,.95),wallCap=M.material(0x92917b,.92);
  for(const edge of edges.values()) {
    if(edge.axis==="v"&&edge.start===10&&edge.row===9)continue; // Sample doorway only; not a quest placement.
    const vertical=edge.axis==="v",x=edge.start+(vertical ? 0 : .5)-13,z=edge.row+(vertical ? .5 : 0)-9.5;
    const part=new T.Group();
    M.box(part,vertical ? .105 : 1.035,.22,vertical ? 1.035 : .105,wallSurface,x,.27,z);
    M.box(part,vertical ? .13 : 1.035,.035,vertical ? 1.035 : .13,wallCap,x,.398,z);
    wallGroup.add(part);wallParts.push({owners:edge.owners,mesh:part});
  }

  try {
    for(const sample of HQ.samples) {
      const model=M.make(sample.kind),w=sample.width||1,d=sample.depth||1;
      model.position.set(sample.x+(sample.kind==="door"?0:w/2)-13,.16,sample.row+d/2-9.5);
      model.rotation.y=sample.rotation;model.userData.sampleId=sample.id;
      scene.add(model);pieces.set(sample.id,{sample,model});
    }
  } catch(error) {showError("The miniature assets could not load. Keep assets/models/imported with this page. "+error.message);return;}
  const hero=pieces.get("barbarian");
  // A small local softbox environment lets metallic paint reflect light without
  // downloading an HDR image. Only the barbarian's metallic materials use it.
  const painted=hero.model.userData.paintedMaterials;
  if(painted) {
    const image=document.createElement("canvas");image.width=512;image.height=256;
    const ctx=image.getContext("2d"),gradient=ctx.createLinearGradient(0,0,0,256);
    gradient.addColorStop(0,"#c2cbd0");gradient.addColorStop(.5,"#555d5c");gradient.addColorStop(1,"#242b25");
    ctx.fillStyle=gradient;ctx.fillRect(0,0,512,256);
    for(const [x,y,w,h,colour] of [[70,35,90,110,"#fff0d6"],[310,20,40,150,"#e4f0fa"],[450,60,45,65,"#a4b1bd"]]) {
      ctx.fillStyle=colour;ctx.fillRect(x,y,w,h);
    }
    const texture=new T.CanvasTexture(image);texture.colorSpace=T.SRGBColorSpace;
    texture.mapping=T.EquirectangularReflectionMapping;
    const generator=new T.PMREMGenerator(renderer),environment=generator.fromEquirectangular(texture);
    for(const surface of painted)if(surface.metalness>.3) {
      surface.envMap=environment.texture;surface.envMapIntensity=.75;surface.needsUpdate=true;
    }
    texture.dispose();generator.dispose();
  }
  const studioStage=new T.Group();studioStage.position.set(hero.model.position.x,0,hero.model.position.z);studioStage.visible=false;scene.add(studioStage);
  const pedestal=new T.Mesh(new T.CylinderGeometry(1.15,1.22,.11,80),M.material(0x333b30,.86));pedestal.position.y=.105;pedestal.receiveShadow=true;pedestal.castShadow=true;studioStage.add(pedestal);
  const pedestalRim=new T.Mesh(new T.TorusGeometry(1.15,.008,6,80),M.material(0x8b7650,.5,.45));pedestalRim.rotation.x=Math.PI/2;pedestalRim.position.y=.161;studioStage.add(pedestalRim);
  const rimLight=new T.DirectionalLight(0xc4dce5,1.8);rimLight.position.set(hero.model.position.x-4,5,hero.model.position.z-5);rimLight.target.position.set(hero.model.position.x,1.4,hero.model.position.z);rimLight.visible=false;scene.add(rimLight,rimLight.target);
  const outline=new T.Group();scene.add(outline);outline.visible=false;
  const outlineMaterial=new T.MeshBasicMaterial({color:0xe1c383,transparent:true,opacity:.86,depthWrite:false});
  function placeOutline(entry) {
    while(outline.children.length){const child=outline.children[0];child.geometry.dispose();outline.remove(child);}
    const width=entry.sample.width?entry.sample.width+.12:1.02,depth=entry.sample.depth?entry.sample.depth+.12:1.02;
    const length=.22;
    for(const x of [-1,1])for(const z of [-1,1]) {
      M.box(outline,length,.012,.025,outlineMaterial,x*(width/2-length/2),0,z*depth/2);
      M.box(outline,.025,.012,length,outlineMaterial,x*width/2,0,z*(depth/2-length/2));
    }
    outline.position.set(entry.model.position.x,.177,entry.model.position.z);outline.visible=true;
  }

  function requestRender() {if(!frame&&contextReady&&document.visibilityState!=="hidden")frame=requestAnimationFrame(draw);}
  function updateCamera() {
    const width=host.clientWidth,height=host.clientHeight,aspect=width/Math.max(height,1);
    const halfHeight=studio?Math.max(studioHalfHeight,studioHalfWidth/aspect):Math.max(11.5,17/aspect);
    camera.left=-halfHeight*aspect;camera.right=halfHeight*aspect;camera.top=halfHeight;camera.bottom=-halfHeight;
    camera.zoom=studio?zoom/7.1:zoom;camera.updateProjectionMatrix();
    camera.position.set(target.x+Math.sin(yaw)*Math.cos(elevation)*45,target.y+Math.sin(elevation)*45,target.z+Math.cos(yaw)*Math.cos(elevation)*45);
    camera.lookAt(target);camera.updateMatrixWorld();
  }
  function draw() {frame=0;updateCamera();renderer.render(scene,camera);}
  function resize() {renderer.setSize(host.clientWidth,host.clientHeight,false);requestRender();}
  function updateViewButtons() {
    document.getElementById("view-overhead").setAttribute("aria-pressed",String(overhead));
    document.getElementById("view-tabletop").setAttribute("aria-pressed",String(!overhead));
  }
  function setZoom(value) {zoom=T.MathUtils.clamp(value,.65,studio?18:10);requestRender();}
  function clearSelection() {
    selected=null;outline.visible=false;
    document.querySelectorAll("[data-piece]").forEach(button=>button.setAttribute("aria-pressed","false"));
    document.getElementById("selection-title").textContent="The dungeon awaits";
    document.getElementById("selection-description").textContent="Select a piece to inspect its shape and scale.";
    document.getElementById("clear-selection").hidden=true;requestRender();
  }
  function selectPiece(id,focus) {
    if(studio&&id!=="barbarian")setStudio(false);
    const entry=pieces.get(id);if(!entry)return;
    selected=id;placeOutline(entry);if(studio)outline.visible=false;
    document.querySelectorAll("[data-piece]").forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.piece===id)));
    document.getElementById("selection-title").textContent=entry.sample.name;
    document.getElementById("selection-description").textContent=entry.sample.description;
    document.getElementById("clear-selection").hidden=false;
    if(focus){
      if(id==="barbarian") {
        const bounds=new T.Box3().setFromObject(entry.model),size=bounds.getSize(new T.Vector3());
        bounds.getCenter(target);
        studioHalfHeight=Math.max(.8,size.y*.66);
        studioHalfWidth=Math.max(.65,Math.max(size.x,size.z)*.7);
        zoom=7.1;elevation=.16;yaw=entry.sample.rotation;overhead=false;updateViewButtons();
      } else {target.copy(entry.model.position);target.y=.55;zoom=4.3;}
    }
    requestRender();
  }
  function setStudio(enabled) {
    studio=enabled;studioStage.visible=enabled;rimLight.visible=enabled;
    renderer.toneMappingExposure=enabled?1.06:1.3;
    document.querySelector(".tabletop").classList.toggle("is-inspecting",enabled);
    document.getElementById("inspect-barbarian").setAttribute("aria-pressed",String(enabled));
    document.getElementById("leave-studio").hidden=!enabled;
    document.getElementById("scene-kicker").textContent=enabled?"PAINTED BARBARIAN · MINIATURE STUDIO":"NORTH AMERICAN GAME SYSTEM";
    for(const id of ["show-walls","show-grid","explored-preview"])document.getElementById(id).disabled=enabled;
    for(const [id,entry] of pieces)entry.model.visible=!enabled||id==="barbarian";
    wallGroup.visible=!enabled&&document.getElementById("show-walls").checked;
    gridGroup.visible=!enabled&&document.getElementById("show-grid").checked;
    applyExploration();
    if(enabled)selectPiece("barbarian",true);
    requestRender();
  }
  function setFullView() {
    if(studio)setStudio(false);
    document.getElementById("explored-preview").checked=false;applyExploration();
    target.set(0,.25,0);zoom=1;yaw=.15;elevation=.88;overhead=false;updateViewButtons();clearSelection();
  }
  function applyExploration() {
    const explored=document.getElementById("explored-preview").checked;
    boardBase.visible=!studio&&!explored;
    for(const item of floors)item.mesh.visible=!studio&&(!explored||item.region===sampleRoom);
    for(const item of grids)item.mesh.visible=!studio&&(!explored||item.region===sampleRoom);
    for(const item of wallParts)item.mesh.visible=!studio&&(!explored||item.owners.includes(sampleRoom));
    requestRender();
  }
  document.querySelectorAll("[data-piece]").forEach(button=>button.addEventListener("click",()=>selectPiece(button.dataset.piece,true)));
  document.getElementById("clear-selection").addEventListener("click",clearSelection);
  document.getElementById("view-board").addEventListener("click",setFullView);
  document.getElementById("inspect-barbarian").addEventListener("click",()=>setStudio(true));
  document.getElementById("leave-studio").addEventListener("click",setFullView);
  document.getElementById("view-tabletop").addEventListener("click",()=>{elevation=studio ? .16 : .88;overhead=false;updateViewButtons();requestRender();});
  document.getElementById("view-overhead").addEventListener("click",()=>{elevation=Math.PI/2-.001;yaw=0;overhead=true;updateViewButtons();requestRender();});
  document.getElementById("zoom-in").addEventListener("click",()=>setZoom(zoom*1.2));
  document.getElementById("zoom-out").addEventListener("click",()=>setZoom(zoom/1.2));
  document.getElementById("show-walls").addEventListener("change",event=>{wallGroup.visible=event.target.checked;requestRender();});
  document.getElementById("show-grid").addEventListener("change",event=>{gridGroup.visible=event.target.checked;requestRender();});
  document.getElementById("explored-preview").addEventListener("change",event=>{
    applyExploration();target.set(0,.25,0);zoom=event.target.checked?2.1:1;clearSelection();
    document.getElementById("selection-title").textContent=event.target.checked?"One room in the darkness":"The dungeon awaits";
    document.getElementById("selection-description").textContent=event.target.checked?"A visual preview of an explored room. Visibility rules come later.":"Select a piece to inspect its shape and scale.";
  });
  canvas.addEventListener("wheel",event=>{event.preventDefault();setZoom(zoom*Math.exp(-T.MathUtils.clamp(event.deltaY,-120,120)*.0018));},{passive:false});
  const contacts=new Map();let gesture=null,down=null;
  function contactDistance() {const points=[...contacts.values()];return Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y);}
  canvas.addEventListener("pointerdown",event=>{
    if(event.pointerType==="mouse"&&event.button!==0)return;
    canvas.focus({preventScroll:true});canvas.setPointerCapture(event.pointerId);
    contacts.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(contacts.size===1){down={x:event.clientX,y:event.clientY,dragged:false};gesture=null;}
    if(contacts.size===2){gesture={distance:contactDistance(),zoom};if(down)down.dragged=true;}
    canvas.classList.add("dragging");
  });
  canvas.addEventListener("pointermove",event=>{
    const old=contacts.get(event.pointerId);if(!old)return;
    const point={x:event.clientX,y:event.clientY};contacts.set(event.pointerId,point);
    if(contacts.size>=2){if(gesture&&gesture.distance>0)setZoom(gesture.zoom*contactDistance()/gesture.distance);return;}
    if(down&&Math.hypot(point.x-down.x,point.y-down.y)>5)down.dragged=true;
    if(down?.dragged){yaw-=(point.x-old.x)*.006;elevation=T.MathUtils.clamp(elevation+(point.y-old.y)*.004,.35,Math.PI/2-.001);overhead=false;updateViewButtons();requestRender();}
  });
  function release(event,cancelled) {
    if(!contacts.has(event.pointerId))return;
    const click=contacts.size===1&&down&&!down.dragged&&!cancelled;
    contacts.delete(event.pointerId);gesture=null;
    if(contacts.size===1){const point=[...contacts.values()][0];down={...point,dragged:true};}
    if(!contacts.size){canvas.classList.remove("dragging");down=null;}
    if(click){
      const rect=canvas.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
      updateCamera();raycaster.setFromCamera(pointer,camera);
      const hits=raycaster.intersectObjects([...pieces.values()].filter(entry=>entry.model.visible).map(entry=>entry.model),true);
      if(hits.length){let object=hits[0].object;while(object&&!object.userData.sampleId)object=object.parent;if(object)selectPiece(object.userData.sampleId,false);}
      else clearSelection();
    }
  }
  canvas.addEventListener("pointerup",event=>release(event,false));
  canvas.addEventListener("pointercancel",event=>release(event,true));
  canvas.addEventListener("lostpointercapture",event=>release(event,true));
  canvas.addEventListener("keydown",event=>{
    const handled=["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","+","=","-","Home","Escape"];
    if(!handled.includes(event.key))return;event.preventDefault();
    if(event.key==="Home"){setFullView();return;}
    if(event.key==="Escape"){clearSelection();return;}
    if(event.key==="+"||event.key==="="){setZoom(zoom*1.15);return;}
    if(event.key==="-"){setZoom(zoom/1.15);return;}
    if(event.key==="ArrowLeft")yaw-=.12;if(event.key==="ArrowRight")yaw+=.12;
    if(event.key==="ArrowUp")elevation+=.08;if(event.key==="ArrowDown")elevation-=.08;
    elevation=T.MathUtils.clamp(elevation,.35,Math.PI/2-.001);overhead=false;updateViewButtons();requestRender();
  });
  canvas.addEventListener("webglcontextlost",event=>{event.preventDefault();contextReady=false;if(frame)cancelAnimationFrame(frame);frame=0;showError("The graphics context was interrupted. Waiting for the browser to restore it…");});
  canvas.addEventListener("webglcontextrestored",()=>{contextReady=true;loading.hidden=true;requestRender();});
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")requestRender();});
  new ResizeObserver(resize).observe(host);
  if(new URLSearchParams(window.location.search).get("inspect")==="barbarian")setStudio(true);
  loading.hidden=true;resize();
})();

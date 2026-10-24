(function () {
  "use strict";
  const HQ=window.HeroQuest,T=window.HQThree,$=id=>document.getElementById(id);
  // Game model types only: no quest positions, hidden actors or engine state.
  const catalog=HQ.pieceCatalog.map(group=>[group.label,group.entries.map(piece=>[piece.id,piece.name])]);
  const names=new Map(catalog.flatMap(([,entries])=>entries));
  const dialog=$("model-viewer-dialog"),host=$("model-viewer-stage"),canvas=$("model-viewer-canvas"),list=$("model-viewer-list"),status=$("model-viewer-status");
  const cached=new Map(),contacts=new Map(),target=new T.Vector3();
  let renderer=null,scene=null,camera=null,environment=null,current=null,frame=0,contextReady=true,yaw=.45,elevation=.28,zoom=1,pinch=null;
  for(const [label,entries] of catalog) {
    const group=document.createElement("optgroup");group.label=label;
    for(const [id,name] of entries){const option=document.createElement("option");option.value=id;option.textContent=name;group.append(option);}list.append(group);
  }
  function requestRender(){if(!frame&&renderer&&contextReady&&dialog.open&&document.visibilityState!=="hidden")frame=requestAnimationFrame(draw);}
  function draw(){frame=0;if(!dialog.open||!current||!contextReady)return;const aspect=host.clientWidth/Math.max(1,host.clientHeight),size=current.size;
    const half=Math.max(1.5,size.y*.65,Math.hypot(size.x,size.z)*.65/aspect)*zoom;
    camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();
    target.set(0,size.y/2,0);
    const distance=12;
    camera.position.set(target.x+Math.sin(yaw)*Math.cos(elevation)*distance,target.y+Math.sin(elevation)*distance,target.z+Math.cos(yaw)*Math.cos(elevation)*distance);camera.lookAt(target);camera.updateMatrixWorld();
    renderer.render(scene,camera);
  }
  function resize(){if(!renderer||!dialog.open||!host.clientWidth)return;renderer.setSize(host.clientWidth,host.clientHeight,false);requestRender();}
  function ensure() {
    if(renderer)return;
    renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
    scene=new T.Scene();camera=new T.OrthographicCamera(-4,4,3,-3,.1,150);
    const studioLights=new T.Group();scene.add(studioLights);studioLights.add(new T.HemisphereLight(0xf1eadb,0x333b35,2.5));
    const key=new T.DirectionalLight(0xffe3bf,3.5);key.position.set(-4,8,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);
    Object.assign(key.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.1,far:25});key.shadow.normalBias=.025;studioLights.add(key);
    const fill=new T.DirectionalLight(0xdceaff,1.5);fill.position.set(5,4,1);studioLights.add(fill);
    const rim=new T.DirectionalLight(0xffe4c0,1.4);rim.position.set(-1,5,-5);studioLights.add(rim);
    const plinth=new T.Mesh(new T.CylinderGeometry(1.9,2,.12,64),new T.MeshStandardMaterial({color:0x343b33,roughness:.95}));plinth.position.y=-.065;plinth.receiveShadow=true;scene.add(plinth);
    environment=HQ.modelSurfaces.createEnvironment(renderer);
  }
  function prepare(id) {
    if(cached.has(id))return cached.get(id);
    const model=id==="movement-die"?HQ.diceModels.makeNumbered():["stairs","bookcase"].includes(id)?HQ.models.makeProp(id):id==="torch"?HQ.createTorchLighting().make({id:"viewer-torch"}):HQ.models.make(id);
    if(id==="weapons-rack")model.rotation.y=Math.PI; // Show its front; board fitting faces it into the room.
    // Geometry may be shared with the board/tray. Materials are independent so
    // this renderer never changes their clipping or reflection textures.
    HQ.modelSurfaces.cloneForPreview(model,environment);
    const box=new T.Box3().setFromObject(model),size=box.getSize(new T.Vector3()),centre=box.getCenter(new T.Vector3());
    model.position.sub(new T.Vector3(centre.x,box.min.y,centre.z));
    const wrapper=new T.Group(),scale=3/Math.max(size.x,size.y,size.z);wrapper.scale.setScalar(scale);wrapper.add(model);
    const entry={wrapper,size:size.multiplyScalar(scale)};cached.set(id,entry);return entry;
  }
  function reset(){const flat=current&&current.size.y<Math.max(current.size.x,current.size.z)*.3;yaw=.45;elevation=flat ? .85 : .28;zoom=1;requestRender();}
  function choose() {
    const id=list.value;if(!names.has(id))return;
    status.textContent="";status.hidden=true;
    try {
      ensure();if(!contextReady){status.textContent="Restoring graphics…";status.hidden=false;return;}
      const next=prepare(id);if(current)scene.remove(current.wrapper);current=next;scene.add(current.wrapper);
      canvas.setAttribute("aria-label",names.get(id)+". Drag to rotate, scroll or pinch to zoom. Arrow keys rotate; plus and minus zoom; Home resets the view.");
      renderer.shadowMap.needsUpdate=true;reset();resize();
    } catch(error){status.textContent="This model could not be displayed.";status.hidden=false;}
  }
  function open(){HQ.dialogs.show("model-viewer-dialog");choose();}
  function magnify(factor){zoom=T.MathUtils.clamp(zoom/factor,.4,2.5);requestRender();}
  document.querySelectorAll("[data-open-model-viewer]").forEach(button=>button.addEventListener("click",open));
  window.addEventListener("heroquest-artwork-ready",requestRender);
  list.addEventListener("change",choose);$("model-viewer-reset").addEventListener("click",reset);
  $("model-viewer-zoom-in").addEventListener("click",()=>magnify(1.2));$("model-viewer-zoom-out").addEventListener("click",()=>magnify(1/1.2));
  canvas.addEventListener("pointerdown",event=>{if(event.pointerType==="mouse"&&event.button!==0)return;canvas.focus({preventScroll:true});canvas.setPointerCapture(event.pointerId);contacts.set(event.pointerId,{x:event.clientX,y:event.clientY});canvas.classList.add("dragging");if(contacts.size===2){const [a,b]=[...contacts.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom};}});
  canvas.addEventListener("pointermove",event=>{
    const previous=contacts.get(event.pointerId);if(!previous)return;contacts.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(contacts.size===2&&pinch){const [a,b]=[...contacts.values()];zoom=T.MathUtils.clamp(pinch.zoom*pinch.distance/Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),.4,2.5);}
    else if(contacts.size===1){yaw-=(event.clientX-previous.x)*.008;elevation=T.MathUtils.clamp(elevation+(event.clientY-previous.y)*.006,.02,1.5);}requestRender();
  });
  function release(event){contacts.delete(event.pointerId);pinch=null;if(!contacts.size)canvas.classList.remove("dragging");}
  for(const name of ["pointerup","pointercancel","lostpointercapture"])canvas.addEventListener(name,release);
  canvas.addEventListener("wheel",event=>{event.preventDefault();magnify(Math.exp(-T.MathUtils.clamp(event.deltaY,-120,120)*.002));},{passive:false});
  canvas.addEventListener("keydown",event=>{
    if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","+","=","-","Home"].includes(event.key))return;event.preventDefault();
    if(event.key==="Home"){reset();return;}if(event.key==="+"||event.key==="="){magnify(1.2);return;}if(event.key==="-"){magnify(1/1.2);return;}
    if(event.key==="ArrowLeft")yaw-=.12;if(event.key==="ArrowRight")yaw+=.12;if(event.key==="ArrowUp")elevation+=.08;if(event.key==="ArrowDown")elevation-=.08;elevation=T.MathUtils.clamp(elevation,.02,1.5);requestRender();
  });
  dialog.addEventListener("close",()=>{if(frame)cancelAnimationFrame(frame);frame=0;for(const id of contacts.keys())if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);contacts.clear();pinch=null;canvas.classList.remove("dragging");});
  canvas.addEventListener("webglcontextlost",event=>{event.preventDefault();contextReady=false;if(frame)cancelAnimationFrame(frame);frame=0;status.textContent="Restoring graphics…";status.hidden=false;});
  canvas.addEventListener("webglcontextrestored",()=>{contextReady=true;status.hidden=true;renderer.shadowMap.needsUpdate=true;if(dialog.open)choose();});
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden"){if(frame)cancelAnimationFrame(frame);frame=0;}else requestRender();});
  new ResizeObserver(resize).observe(host);
  HQ.modelViewer=Object.freeze({open});
})();

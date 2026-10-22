(function () {
  "use strict";
  const HQ=window.HeroQuest,T=window.HQThree,cache=new Map(),waiting=new Map(),contents=new WeakMap();
  // Bust framing in the supplied sculpt's units, after its normal facing fix.
  // Weapons above the head must not shrink faces to a dot in these small images.
  const frames={barbarian:[27.7,14,-.3,-1],dwarf:[18,13,0,0],elf:[28,15,0,0],wizard:[26,15,0,0],
    orc:[25,17,0,0],goblin:[16,13,0,0],fimir:[30,18,0,0],skeleton:[28,14,0,0],
    zombie:[24,16,0,0],mummy:[30,16,0,0],"chaos-warrior":[31,18,0,0],gargoyle:[35.5,22,0,0]};
  let renderer=null,scene=null,camera=null,environment=null,frame=0,unavailable=false;
  function ensure() {
    if(renderer||unavailable)return;
    try {
      const canvas=document.createElement("canvas");
      renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setSize(160,160,false);renderer.setPixelRatio(1);
      renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
      scene=new T.Scene();camera=new T.OrthographicCamera(-1,1,1,-1,.01,20);
      scene.add(new T.HemisphereLight(0xf1eadb,0x333b35,2.5));
      for(const [colour,power,position] of [[0xffe3bf,3.5,[-4,8,5]],[0xdceaff,1.5,[5,4,1]],[0xffe4c0,1.4,[-1,5,-5]]]) {
        const light=new T.DirectionalLight(colour,power);light.position.set(...position);scene.add(light);
      }
      environment=HQ.modelSurfaces.createEnvironment(renderer,{width:256});
      canvas.addEventListener("webglcontextlost",event=>{event.preventDefault();unavailable=true;waiting.clear();});
    } catch(error){unavailable=true;waiting.clear();}
  }
  function capture(kind) {
    const model=HQ.models.make(kind);let materials=new Set();
    try {
      materials=HQ.modelSurfaces.cloneForPreview(model,environment);
      const [y,span,x,z]=frames[kind],scale=model.scale.x,target=new T.Vector3(x*scale,y*scale,z*scale),half=span*scale/2;
      camera.left=-half;camera.right=half;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();
      camera.position.copy(target).add(new T.Vector3(.18,.08,1).normalize().multiplyScalar(5));camera.lookAt(target);
      scene.add(model);renderer.render(scene,camera);return renderer.domElement.toDataURL("image/png");
    } finally {scene.remove(model);for(const material of materials)material.dispose();}
  }
  function fill(slot,url) {
    if(!slot.isConnected)return;
    const image=document.createElement("img");image.alt="";image.width=image.height=160;image.src=url;slot.replaceChildren(image);
  }
  function drawNext() {
    frame=0;if(unavailable||!waiting.size)return;ensure();if(unavailable)return;
    const [kind,slots]=waiting.entries().next().value;waiting.delete(kind);
    // A queued panel may already be closed/replaced; do no work for it.
    if([...slots].some(slot=>slot.isConnected))try {const url=capture(kind);cache.set(kind,url);for(const slot of slots)fill(slot,url);}catch(error){cache.set(kind,null);}
    if(waiting.size)frame=requestAnimationFrame(drawNext);
  }
  function image(kind,name="") {
    const slot=document.createElement("span");slot.className="miniature-portrait";slot.setAttribute("aria-hidden","true");slot.textContent=(name||kind||"?").slice(0,1).toUpperCase();
    if(!frames[kind])return slot;
    if(cache.has(kind)){const url=cache.get(kind);if(url){const img=document.createElement("img");img.alt="";img.width=img.height=160;img.src=url;slot.replaceChildren(img);}return slot;}
    if(!unavailable){if(!waiting.has(kind))waiting.set(kind,new Set());waiting.get(kind).add(slot);if(!frame)frame=requestAnimationFrame(drawNext);}
    return slot;
  }
  function set(container,figures=[]) {
    figures=figures.filter(Boolean);
    const signature=JSON.stringify(figures.map(figure=>[figure.kind||figure.id,figure.name,figure.role]));
    if(contents.get(container)===signature)return;contents.set(container,signature);
    container.replaceChildren();container.hidden=!figures.length;
    for(const figure of figures) {
      const row=document.createElement("span");row.className="miniature-reference";row.append(image(figure.kind||figure.id,figure.name));
      if(figure.role){const copy=document.createElement("span"),name=document.createElement("strong"),role=document.createElement("small");name.textContent=figure.name;role.textContent=figure.role;copy.append(name,role);row.append(copy);}
      container.append(row);
    }
  }
  HQ.portraits=Object.freeze({image,set});
})();

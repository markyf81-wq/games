(function () {
  "use strict";
  const HQ=window.HeroQuest,T=window.HQThree,$=id=>document.getElementById(id);
  const names={skull:"Skull","white-shield":"White shield","black-shield":"Black shield"};
  const numbered=HQ.diceModels.faces;
  HQ.createDiceTray=function({onRoll,onSettled,onCancel}) {
    const panel=$("dice-panel"),host=$("dice-stage"),canvas=$("dice-canvas"),roll=$("dice-roll"),cancel=$("dice-cancel");
    const reduced=window.matchMedia("(prefers-reduced-motion: reduce)");
    let renderer=null,scene=null,camera=null,current=null,dice=[],frame=0,automatic=0,started=null,busy=false,failed=false,paused=false,settled=false;
    const targetFrame=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3(1,0,0),new T.Vector3(0,0,-1),new T.Vector3(0,1,0)));
    function ensure() {
      if(renderer||failed)return;
      try {
        renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
        renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
        renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFShadowMap;
        scene=new T.Scene();camera=new T.OrthographicCamera(-5,5,3.3,-3.3,.1,50);camera.position.set(0,9,9);camera.lookAt(0,.3,0);
        scene.add(new T.HemisphereLight(0xfff2dc,0x21362c,2.8));
        const light=new T.DirectionalLight(0xfff0d5,4);light.position.set(-3,9,5);light.castShadow=true;light.shadow.mapSize.set(1024,1024);
        Object.assign(light.shadow.camera,{left:-7,right:7,top:7,bottom:-7});light.shadow.normalBias=.03;scene.add(light);
        const fill=new T.DirectionalLight(0xd8edff,1.5);fill.position.set(5,5,-3);scene.add(fill);
        const felt=new T.Mesh(new T.PlaneGeometry(24,24),new T.MeshStandardMaterial({color:0x223b2c,roughness:1}));felt.rotation.x=-Math.PI/2;felt.receiveShadow=true;scene.add(felt);
      } catch(error){failed=true;host.classList.add("dice-stage--fallback");$("dice-stage-note").hidden=false;$("dice-stage-note").textContent="Results appear below.";}
    }
    function resultRotation(result,index) {
      const matches=(current.kind==="movement"?numbered:HQ.combatDiePaint.faces).filter(face=>face.result===result),face=matches[index%matches.length];
      const normal=new T.Vector3(...face.normal),up=new T.Vector3(...face.up),right=new T.Vector3().crossVectors(up,normal);
      const source=new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(right,up,normal));
      return new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),(index%3-1)*.11).multiply(targetFrame).multiply(source.invert());
    }
    function build() {
      dice.forEach(d=>scene?.remove(d.model));dice=[];
      ensure();if(failed)return;
      const count=current.count,columns=Math.min(3,count),rows=Math.ceil(count/columns);
      for(let i=0;i<count;i++) {
        const model=new T.Group(),body=current.kind==="movement"?HQ.diceModels.makeNumbered():HQ.stlModels.make("combat-die");
        if(current.kind!=="movement")body.position.sub(new T.Box3().setFromObject(body).getCenter(new T.Vector3()));
        model.add(body);const row=Math.floor(i/columns),inRow=Math.min(columns,count-row*columns);
        const rest=new T.Vector3((i%columns-(inRow-1)/2)*2.25,.8,(row-(rows-1)/2)*2.5);
        model.position.copy(rest);model.rotation.set(.3+i*.12,.45+i*.8,.13);scene.add(model);dice.push({model,rest,landing:null});
      }
      resize();
    }
    function resize() {
      if(!renderer||failed||!current||!host.clientWidth)return;
      renderer.setSize(host.clientWidth,host.clientHeight,false);
      const aspect=host.clientWidth/Math.max(1,host.clientHeight),width=Math.max(4.8,Math.min(3,current.count)*2.3),height=Math.max(current.count>6?7.5:current.count>3?5.6:4.2,width/aspect);
      camera.left=-height*aspect/2;camera.right=height*aspect/2;camera.top=height/2;camera.bottom=-height/2;camera.updateProjectionMatrix();draw();
    }
    function draw(){if(renderer&&!failed&&current)renderer.render(scene,camera);}
    function settle() {
      if(frame)cancelAnimationFrame(frame);frame=0;busy=false;
      dice.forEach(d=>{d.model.position.copy(d.rest);if(d.landing)d.model.quaternion.copy(d.landing);});draw();
      if(!current?.rolled)return;
      const result=$("dice-result");result.replaceChildren();
      if(current.kind==="movement"&&current.resultFormat==="faces")current.results.forEach(value=>{const face=document.createElement("span");face.className="d6";HQ.dieFaces.numbered(face,value);face.setAttribute("aria-label","Red die: "+value);result.append(face);});
      else if(current.kind==="movement")result.textContent=current.results.join(" + ")+" = "+current.results.reduce((a,b)=>a+b,0);
      else current.results.forEach(value=>result.append(HQ.dieFaces.combat(value)));
      // Text equivalents remain on each face for screen readers and fallback.
      canvas.setAttribute("aria-label",current.kind==="movement"?(current.resultFormat==="faces"?"Red dice roll: ":"Movement roll: ")+current.results.join(", "):"Combat roll: "+current.results.map(value=>names[value]).join(", "));
      $("dice-result").hidden=false;roll.hidden=true;cancel.hidden=true;
      if(!settled){settled=true;onSettled(current.id);}
    }
    function animate(time) {
      if(!busy)return;if(started===null)started=time;
      let complete=true;
      dice.forEach((d,i)=>{
        const p=Math.max(0,Math.min(1,(time-started-i*65)/1050)),remaining=(1-p)**3;
        const spin=new T.Quaternion().setFromEuler(new T.Euler((Math.PI*2*(3+i%2)+.7)*remaining,(Math.PI*2*(2+i%3)+.4)*remaining,(Math.PI*2*(4+i%2)+.6)*remaining));
        d.model.quaternion.copy(d.landing).multiply(spin);d.model.position.copy(d.rest);
        d.model.position.y+=Math.abs(Math.sin(p*Math.PI*3.5))*.7*(1-p);d.model.position.x+=Math.sin(p*Math.PI*2+i)*.3*(1-p);
        if(p<1)complete=false;
      });draw();
      if(complete)settle();else frame=requestAnimationFrame(animate);
    }
    function close() {
      clearTimeout(automatic);if(frame)cancelAnimationFrame(frame);frame=0;busy=false;current=null;panel.hidden=true;
    }
    function autoRoll() {
      clearTimeout(automatic);if(!current?.automatic||current.rolled||busy||paused||document.hidden)return;
      const expected=current;
      automatic=setTimeout(()=>{if(current!==expected||current.rolled||busy||paused||document.hidden)return;if(document.querySelector('dialog[open]:not([data-nonmodal])'))autoRoll();else performRoll();},650);
    }
    function performRoll() {
      const expected=current;clearTimeout(automatic);roll.disabled=true;
      if(onRoll()===false&&current===expected){roll.disabled=Boolean(current.automatic);if(current.automatic)autoRoll();}
    }
    function setPaused(value){paused=Boolean(value);autoRoll();}
    function show(options) {
      const same=current?.id===options.id&&current.rolled===options.rolled;
      if(same){panel.hidden=false;if(settled)onSettled(options.id);return;}
      clearTimeout(automatic);if(frame)cancelAnimationFrame(frame);frame=0;busy=false;settled=false;current=options;
      panel.dataset.rollType=options.resultFormat==="faces"?"spell":options.kind;
      $("dice-heading").textContent=options.title;$("dice-kicker").textContent=options.kicker;$("dice-instructions").textContent=options.description;
      HQ.portraits.set($("dice-participants"),options.figures||[]);
      $("dice-result").textContent="";$("dice-result").hidden=true;
      cancel.hidden=!options.cancellable;roll.hidden=false;roll.disabled=Boolean(options.automatic);
      roll.classList.toggle("is-cpu-roll",Boolean(options.automatic));roll.textContent=options.automatic?"Zargon’s roll":"Roll";
      canvas.setAttribute("aria-label",options.kind==="movement"?"Red movement dice":"Combat dice");
      panel.hidden=false;build();
      if(options.rolled) {
        dice.forEach((d,i)=>{d.landing=resultRotation(options.results[i],i);});
        roll.disabled=true;roll.textContent="Rolling…";
        if(options.animate&&!failed&&!reduced.matches&&document.visibilityState!=="hidden"){busy=true;started=null;frame=requestAnimationFrame(animate);}else settle();
      } else {draw();if(!options.automatic){roll.focus({preventScroll:true});panel.scrollIntoView({block:"nearest",behavior:"instant"});}autoRoll();}
    }
    roll.addEventListener("click",()=>{if(!current||current.automatic||busy||current.rolled)return;performRoll();});
    cancel.addEventListener("click",()=>{if(current?.cancellable&&!busy){close();onCancel();}});
    canvas.addEventListener("webglcontextlost",event=>{event.preventDefault();failed=true;host.classList.add("dice-stage--fallback");$("dice-stage-note").hidden=false;$("dice-stage-note").textContent="Results appear below.";settle();});
    document.addEventListener("visibilitychange",()=>{if(document.hidden){clearTimeout(automatic);if(busy)settle();}else autoRoll();});
    reduced.addEventListener("change",()=>{if(reduced.matches&&busy)settle();});
    new ResizeObserver(resize).observe(host);
    return Object.freeze({show,close,setPaused,get activeId(){return current?.id;},get busy(){return busy;}});
  };
})();

(function () {
  "use strict";
  const HQ=window.HeroQuest,T=window.HQThree,tau=Math.PI*2;
  const styles=["sleep","tempest","rockSkin","courage","strengthPotion","defensePotion","heroicBrew","swiftWind","veilOfMist","passThroughRock"];
  const colours={sleep:0xc993ff,tempest:0x86cfff,rockSkin:0xc9b897,courage:0xffcf59,strengthPotion:0xff5963,
    defensePotion:0x8fbfff,heroicBrew:0xffa747,swiftWind:0x88ffd1,veilOfMist:0x70d6d0,passThroughRock:0x9adbef};
  const heights={barbarian:1.02,dwarf:.74,elf:1.02,wizard:1.05,goblin:.66,orc:.94,gargoyle:1.18,"chaos-warrior":1.12};
  const fraction=n=>n-Math.floor(n);
  HQ.createStatusEffects=function({scene,entities,reducedMotion}) {
    const root=new T.Group();root.name="Persistent miniature statuses";root.visible=false;scene.add(root);
    const atlas=document.createElement("canvas");atlas.width=256;atlas.height=64;
    const ctx=atlas.getContext("2d"),glow=ctx.createRadialGradient(32,32,0,32,32,30);
    glow.addColorStop(0,"#fff");glow.addColorStop(.25,"#ffffffd9");glow.addColorStop(1,"#ffffff00");ctx.fillStyle=glow;ctx.fillRect(0,0,64,64);
    ctx.font="bold 48px Georgia";ctx.textAlign="center";ctx.textBaseline="middle";ctx.lineJoin="round";
    ctx.strokeStyle="#161023";ctx.lineWidth=5;ctx.strokeText("Z",96,34);ctx.fillStyle="#fff";ctx.fillText("Z",96,34);
    ctx.strokeStyle="#fff";ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(143,13);ctx.lineTo(160,8);ctx.lineTo(177,13);ctx.lineTo(175,36);ctx.quadraticCurveTo(173,46,160,55);ctx.quadraticCurveTo(147,46,145,36);ctx.closePath();ctx.stroke();
    ctx.beginPath();ctx.moveTo(224,9);ctx.lineTo(240,32);ctx.lineTo(224,55);ctx.lineTo(208,32);ctx.closePath();ctx.fill();
    const texture=new T.CanvasTexture(atlas);texture.colorSpace=T.SRGBColorSpace;texture.generateMipmaps=false;texture.minFilter=T.LinearFilter;
    const capacity=384,geometry=new T.BufferGeometry(),positions=new Float32Array(capacity*3),tints=new Float32Array(capacity*3),sizes=new Float32Array(capacity),alphas=new Float32Array(capacity),tiles=new Float32Array(capacity);
    for(const [name,array,size] of [["position",positions,3],["statusTint",tints,3],["statusSize",sizes,1],["statusAlpha",alphas,1],["statusTile",tiles,1]])
      geometry.setAttribute(name,new T.BufferAttribute(array,size).setUsage(T.DynamicDrawUsage));
    geometry.setDrawRange(0,0);
    const material=new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,toneMapped:false,
      uniforms:{atlas:{value:texture},viewportHeight:{value:1}},
      vertexShader:`attribute vec3 statusTint;attribute float statusSize;attribute float statusAlpha;attribute float statusTile;
        uniform float viewportHeight;varying vec3 tint;varying float alpha;varying float tile;
        void main(){tint=statusTint;alpha=statusAlpha;tile=statusTile;
          gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
          gl_PointSize=clamp(statusSize*viewportHeight*.5*projectionMatrix[1][1]/max(.01,gl_Position.w),1.0,48.0);}`,
      fragmentShader:`uniform sampler2D atlas;varying vec3 tint;varying float alpha;varying float tile;
        void main(){vec2 uv=vec2((tile+clamp(gl_PointCoord.x,.01,.99))/4.0,1.0-gl_PointCoord.y);
          vec4 mark=texture2D(atlas,uv);float a=mark.a*alpha;if(a<.005)discard;
          gl_FragColor=vec4(mark.rgb*tint,a);
          #include <colorspace_fragment>
        }`});
    const particles=new T.Points(geometry,material);particles.frustumCulled=false;particles.raycast=()=>{};particles.userData.visualEffect=true;root.add(particles);
    const stoneMaterial=new T.MeshBasicMaterial({color:0xb1a795,transparent:true,opacity:.68,depthWrite:false});
    const stones=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),stoneMaterial,32),dummy=new T.Object3D(),tint=new T.Color();
    stones.instanceMatrix.setUsage(T.DynamicDrawUsage);stones.frustumCulled=false;stones.count=0;stones.raycast=()=>{};stones.userData.visualEffect=true;root.add(stones);
    const outlines=new Map(),outlineMaterial=new T.ShaderMaterial({side:T.BackSide,transparent:true,depthWrite:false,depthTest:true,toneMapped:false,
      uniforms:{viewport:{value:new T.Vector2(1,1)},pulse:{value:0}},
      vertexShader:`uniform vec2 viewport;uniform float pulse;
        void main(){vec4 clip=projectionMatrix*modelViewMatrix*vec4(position,1.0);
          vec2 projectedNormal=(projectionMatrix*vec4(normalize(normalMatrix*normal),0.0)).xy;
          projectedNormal/=max(length(projectedNormal),.001);clip.xy+=projectedNormal*(1.8+pulse*.3)*2.0/viewport*clip.w;
          gl_Position=clip;}`,
      fragmentShader:`uniform float pulse;
        void main(){gl_FragColor=vec4(.25,.72,.94,.3+pulse*.07);
          #include <colorspace_fragment>
        }`});
    function outlineFor(model) {
      if(outlines.has(model))return outlines.get(model);
      const group=new T.Group(),copies=[];
      model.traverse(source=>{if(!source.isMesh||source.userData.visualEffect)return;
        const mesh=new T.Mesh(source.geometry,outlineMaterial);mesh.matrixAutoUpdate=false;mesh.frustumCulled=false;mesh.raycast=()=>{};mesh.userData.visualEffect=true;
        group.add(mesh);copies.push({source,mesh});
      });
      const shell={group,copies};root.add(group);outlines.set(model,shell);return shell;
    }
    const history=new Map();let records=[],shown=false,held=null;
    function sync(projection) {
      const movement=projection.statusMovement||{},sleep=projection.pendingSleep;
      const pending=projection.pendingStatus;
      if(!pending)held=null;
      else if(held?.reportId!==pending.reportId)held={...pending,previous:history.get(pending.id)};
      const actors=[...projection.heroes,...projection.monsters];
      // The held defeated miniature remains visible through its recorded roll.
      // Preserve known status cues too, rather than announcing damage early.
      if(held?.previous&&!actors.some(actor=>actor.id===held.id)&&entities.get(held.id)?.model.visible)actors.push(held.previous.actor);
      records=[];
      for(const actor of actors) {
        if(actor.body<=0||actor.exit)continue;
        const entry=entities.get(actor.id);if(!entry)continue;
        let flags={...actor.effects};
        if(actor.id===movement.heroId)for(const flag of styles)if(movement[flag])flags[flag]=true;
        if(held?.id===actor.id&&held.previous)flags={...held.previous.flags};
        if(sleep?.id===actor.id)flags.sleep=sleep.value;
        history.set(actor.id,{actor,flags});
        const active=styles.filter(flag=>flags[flag]);if(!active.length)continue;
        if(flags.passThroughRock)outlineFor(entry.model);
        let seed=0;for(const char of actor.id)seed=(Math.imul(seed,31)+char.charCodeAt(0))>>>0;
        records.push({entry,styles:active,height:heights[actor.kind]||1.04,phase:(seed%997)/997});
      }
      if(!records.length){shown=false;root.visible=false;}
    }
    function update(time,viewportWidth,viewportHeight) {
      const t=reducedMotion.matches?0:time*.001;let count=0,stoneCount=0;
      outlineMaterial.uniforms.viewport.value.set(Math.max(1,viewportWidth),Math.max(1,viewportHeight));outlineMaterial.uniforms.pulse.value=Math.sin(t*2);
      for(const shell of outlines.values())shell.group.visible=false;
      for(const record of records) {
        const model=record.entry.model;if(!model.visible)continue;
        const base=model.position,h=record.height,phase=record.phase;
        if(record.styles.includes("passThroughRock")) {
          const shell=outlines.get(model);shell.group.visible=true;model.updateWorldMatrix(true,true);
          for(const {source,mesh} of shell.copies){mesh.matrix.copy(source.matrixWorld);mesh.visible=source.visible;}
        }
        for(const style of record.styles) {
          tint.setHex(colours[style]);
          const n=style==="sleep"||style==="defensePotion"?3:style==="tempest"||style==="passThroughRock"?12:style==="rockSkin"||style==="veilOfMist"?6:8;
          for(let i=0;i<n;i++) {
            const u=i/n,age=fraction(u+t*.3+phase),turn=u*tau+phase*tau+t*.8;
            let x=0,y=0,z=0,size=.07,alpha=.45,tile=0;
            if(style==="sleep") {
              x=Math.sin(age*3+phase*tau)*.16;z=Math.cos(turn)*.07;y=h+.1+age*.65;
              size=.22+age*.1;alpha=Math.sin(Math.PI*age)*.9;tile=1;
            } else if(style==="tempest") {
              const radius=.2+age*.15,spin=turn+t*2.5;
              x=Math.cos(spin)*radius;z=Math.sin(spin)*radius;y=h*.65+age*.55;size=.1;alpha=.28+.2*Math.sin(Math.PI*age);
            } else if(style==="rockSkin") {
              if(stoneCount>=32)continue;
              const angle=turn+t*.2,radius=.35,scale=.045+(i%2)*.01;
              dummy.position.set(base.x+Math.cos(angle)*radius,base.y+h*(.2+u*.7)+Math.sin(turn)*.035,base.z+Math.sin(angle)*radius);
              dummy.rotation.set(i*.7,angle,i*.4);dummy.scale.set(scale*1.3,scale*.8,scale);dummy.updateMatrix();stones.setMatrixAt(stoneCount++,dummy.matrix);continue;
            } else if(style==="defensePotion") {
              x=Math.cos(turn)*.37;z=Math.sin(turn)*.37;y=h*.52+Math.sin(turn)*.06;
              size=.2;alpha=.35;tile=2;
            } else if(style==="veilOfMist") {
              x=Math.cos(turn)*(.2+age*.18);z=Math.sin(turn)*(.2+age*.18);y=.12+u*h*.3;
              size=.33;alpha=.13;
            } else if(style==="passThroughRock") {
              const radius=.31+Math.sin(turn*2+t)*.035;
              x=Math.cos(turn)*radius;z=Math.sin(turn)*radius;y=.06+age*h;
              size=i%3===0?.09:.05;alpha=Math.sin(Math.PI*age)*.65;tile=i%3===0?3:0;
            } else if(style==="swiftWind") {
              const spin=turn+t*1.6;x=Math.cos(spin)*.36;z=Math.sin(spin)*.36;y=.1+u*.2;
              size=.11;alpha=.22+.2*Math.sin(Math.PI*age);
            } else {
              const brew=style==="heroicBrew",radius=brew?.28:.35;
              x=Math.cos(turn)*radius;z=Math.sin(turn)*radius;y=h*(.25+age*.65);
              size=style==="strengthPotion"?.085:.065;alpha=Math.sin(Math.PI*age)*(.4+.15*Math.sin(t*2+phase*tau));
              if(brew){x=Math.cos(turn*2)*radius;z=Math.sin(turn*2)*radius;}
            }
            if(count>=capacity)continue;
            positions[count*3]=base.x+x;positions[count*3+1]=base.y+y;positions[count*3+2]=base.z+z;
            tint.toArray(tints,count*3);sizes[count]=size;alphas[count]=alpha;tiles[count]=tile;count++;
          }
        }
      }
      shown=count>0||stoneCount>0;root.visible=shown;stones.count=stoneCount;
      if(stoneCount)stones.instanceMatrix.needsUpdate=true;
      geometry.setDrawRange(0,count);material.uniforms.viewportHeight.value=viewportHeight;
      if(count)for(const name of ["position","statusTint","statusSize","statusAlpha","statusTile"])geometry.attributes[name].needsUpdate=true;
    }
    return Object.freeze({sync,update,get active(){return shown&&!reducedMotion.matches;}});
  };
})();

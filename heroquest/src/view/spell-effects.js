(function () {
  "use strict";
  const HQ=window.HeroQuest,T=window.HQThree;
  // Cosmetic recipes only; shared resources, separate volumetric motion paths.
  const recipes=Object.freeze({
    "ball-of-flame":{style:"fireball",colours:[0xff5410,0xffc528],duration:2100,travel:700,count:160,power:16},
    "fire-of-wrath":{style:"wrath",colours:[0xff4d12,0xffc13b],duration:2400,count:96,power:14},
    "heal-body":{style:"heal",colours:[0x20ec72,0xb5ff55],duration:2000,count:128,power:10},
    "water-of-healing":{style:"water",colours:[0x177aff,0x62efff],duration:2100,count:144,shape:3,power:11},
    "rock-skin":{style:"stone",colours:[0xcfa34e,0xffdf8c],duration:2000,count:120,shape:1,power:9},
    tempest:{style:"tempest",colours:[0x59b9ff,0xb4e8ff],duration:2300,count:160,shape:4,power:12},
    courage:{style:"courage",colours:[0xffa412,0xffe764],duration:2000,count:128,power:12},
    "swift-wind":{style:"wind",colours:[0x1be8b1,0x8dffce],duration:2000,count:144,shape:4,power:10},
    "pass-through-rock":{style:"phase",colours:[0xef8c2b,0xffd075],duration:2100,count:144,power:10},
    "veil-of-mist":{style:"mist",colours:[0x238ba9,0x6be3d6],duration:2200,count:104,power:7},
    sleep:{style:"sleep",colours:[0xb048ff,0xff8bdc],duration:2200,count:80,shape:2,power:10},
    genie:{style:"genie",colours:[0x6944ff,0x55d5ff],duration:2700,travel:850,count:160,power:14}
  });
  const capacity=160,tau=Math.PI*2;
  const fraction=value=>value-Math.floor(value);
  const noise=(i,k)=>fraction(Math.sin(i*127.1+k*311.7)*43758.5453);
  const clamp=value=>T.MathUtils.clamp(value,0,1);
  const ease=value=>{const t=clamp(value);return t*t*(3-2*t);};
  HQ.createSpellEffects=function({scene,entities,reducedMotion,contextReady,requestRender}) {
    const root=new T.Group();root.name="Spell effects";root.visible=false;scene.add(root);
    const flames=HQ.createSpellFlames(root);
    const objects=HQ.createSpellObjects(root);
    // Keep a permanent zero-intensity slot so each cast avoids a new light-count
    // shader variant. It follows projectiles and fades with the target effect.
    const light=new T.PointLight(0xffffff,0,4.2,2);light.name="Spell glow";scene.add(light);
    const geometry=new T.BufferGeometry(),positions=new Float32Array(capacity*3),colours=new Float32Array(capacity*3),sizes=new Float32Array(capacity),alphas=new Float32Array(capacity);
    for(const [name,array,size] of [["position",positions,3],["particleColour",colours,3],["particleSize",sizes,1],["particleAlpha",alphas,1]])
      geometry.setAttribute(name,new T.BufferAttribute(array,size).setUsage(T.DynamicDrawUsage));
    // Ordinary alpha blending preserves colour when motes overlap. Additive
    // blending made dense strands wash out into white rods and floating symbols.
    const material=new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,blending:T.NormalBlending,toneMapped:false,
      uniforms:{viewportHeight:{value:1},shape:{value:0}},
      vertexShader:`attribute vec3 particleColour; attribute float particleSize; attribute float particleAlpha;
        uniform float viewportHeight; varying vec3 tint; varying float alpha;
        void main(){tint=particleColour;alpha=particleAlpha;
          gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
          gl_PointSize=clamp(particleSize*viewportHeight*.5*projectionMatrix[1][1]/max(.01,gl_Position.w),1.0,64.0);}`,
      fragmentShader:`uniform float shape; varying vec3 tint; varying float alpha;
        void main(){vec2 p=gl_PointCoord-.5;float radius=length(p)*2.;
          if(shape>.5&&shape<1.5)radius=(abs(p.x)+abs(p.y))*1.7;
          if(shape>2.5&&shape<3.5)radius=length(p*vec2(3.2,1.7));
          if(shape>3.5)radius=length(p*vec2(1.4,4.5));
          float mask=1.-smoothstep(.05,1.,radius);
          if(shape>1.5&&shape<2.5){float ray=1.-smoothstep(.02,.09,min(abs(p.x),abs(p.y)));mask=max(mask*.35,ray*(1.-smoothstep(.1,.4,max(abs(p.x),abs(p.y)))));}
          float opacity=alpha*pow(mask,1.5);if(opacity<.005)discard;
          gl_FragColor=vec4(mix(tint,vec3(1.0),pow(mask,5.0)*.18),opacity);
          #include <colorspace_fragment>
        }`});
    const particles=new T.Points(geometry,material);particles.frustumCulled=false;particles.raycast=()=>{};root.add(particles);
    const core=new T.Mesh(new T.SphereGeometry(1,12,8),new T.MeshBasicMaterial({color:0xffa330,transparent:true,opacity:.6,depthWrite:false,toneMapped:false}));core.raycast=()=>{};root.add(core);
    const ring=new T.Mesh(new T.RingGeometry(.39,.48,64),new T.MeshBasicMaterial({color:0x80b5c1,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false,toneMapped:false}));
    ring.rotation.x=-Math.PI/2;ring.raycast=()=>{};root.add(ring);
    const point=new T.Vector3(),colour=new T.Color();let effect=null;
    const available=()=>!reducedMotion.matches&&contextReady()&&document.visibilityState!=="hidden";
    function locate(report) {
      const caster=entities.get(report.attackerId),target=entities.get(report.defenderId||report.doorId);
      if(!caster?.model.visible||!target?.model.visible||!recipes[report.spellId])return null;
      const bounds=new T.Box3().setFromObject(target.model),base=target.model.position.clone();
      const height=target.type==="door"?1.55:T.MathUtils.clamp((bounds.max.y-base.y)*.72,.55,1.45);
      // Height follows the fitted sculpt; effects are anchored at the base top,
      // not an arbitrary chest offset shared by a dwarf, Orc and tall door.
      base.y+=target.type==="door"?.04:.075;
      const from=caster.model.position.clone().add(new T.Vector3(0,.8,0)),to=base.clone().add(new T.Vector3(0,height*.58,0));
      return {from,to,base,height,caster,target};
    }
    function finish() {
      light.intensity=0;flames.finish();objects.finish();
      if(!effect)return;const ended=effect;effect=null;clearTimeout(ended.timer);root.visible=false;
      ended.cancelled=true;
      if(ended.onImpact)Promise.resolve(ended.impact).catch(()=>{}).then(ended.resolve);else ended.resolve();
      requestRender();
    }
    function travel(t,out) {
      const u=clamp(t);out.lerpVectors(effect.from,effect.to,u);out.y+=Math.sin(Math.PI*u)*.2;return out;
    }
    function play(report,anchors=locate(report),onImpact=null) {
      finish();if(!anchors||!available())return Promise.resolve().then(()=>onImpact?.());
      const recipe=recipes[report.spellId],a=new T.Color(recipe.colours[0]),b=new T.Color(recipe.colours[1]);
      for(let i=0;i<recipe.count;i++){colour.copy(a).lerp(b,noise(i,3));colour.toArray(colours,i*3);}
      geometry.setDrawRange(0,recipe.count);geometry.attributes.particleColour.needsUpdate=true;
      material.uniforms.shape.value=recipe.shape||0;ring.material.color.copy(b);core.material.color.copy(a);
      light.color.copy(a).lerp(b,.25);
      ring.position.set(anchors.base.x,anchors.base.y+.015,anchors.base.z);ring.material.opacity=0;
      root.visible=true;core.visible=false;
      if(recipe.style==="wrath")flames.show(anchors.base,anchors.height);
      const forward=anchors.to.clone().sub(anchors.from);forward.y=0;
      if(forward.lengthSq()<.001)forward.set(Math.sin(anchors.target.model.rotation.y),0,Math.cos(anchors.target.model.rotation.y));forward.normalize();
      return new Promise(resolve=>{
        effect={...anchors,recipe,forward,door:Boolean(report.doorId),resolve,onImpact,hit:false,impact:null,cancelled:false,started:null,timer:setTimeout(finish,recipe.duration+600)};
        objects.show(recipe.style,effect);
        update(performance.now(),1);requestRender();
      });
    }
    function update(time,viewportHeight) {
      if(!effect)return;if(!available()){finish();return;}
      const e=effect,r=e.recipe;if(e.started===null)e.started=time;
      const elapsed=time-e.started,t=elapsed/r.duration;if(t>=1){finish();return;}
      if(e.onImpact&&!e.hit&&elapsed>=(r.travel||0)){
        e.hit=true;e.impact=Promise.resolve().then(()=>{if(!e.cancelled)return e.onImpact();}).catch(()=>{});
      }
      const style=r.style,flight=r.travel?elapsed/r.travel:1,burst=r.travel?clamp((elapsed-r.travel)/(r.duration-r.travel)):t;
      const envelope=ease(t/.1)*(1-ease((t-.78)/.22)),h=e.height;
      if(style==="wrath")flames.update(elapsed/1000,t,envelope);
      objects.update(elapsed/1000,t,envelope,flight,burst);
      const swell=.82+.18*Math.sin(Math.PI*clamp(burst)*2)**2;
      if(r.travel&&flight<1)travel(flight,light.position);else light.position.copy(e.to);
      light.intensity=r.power*envelope*swell;
      core.visible=style==="fireball"&&(flight<1||burst<.22);
      if(core.visible){
        if(flight<1){travel(flight,core.position);core.scale.setScalar(.14);core.material.opacity=.8*envelope;}
        else {core.position.copy(e.to);core.scale.setScalar(.14+ease(burst/.22)*.42);core.material.opacity=(1-ease(burst/.22))*.7;}
      }
      ring.material.opacity=0;
      if(style==="water"){const ripple=fraction(t*2.4);ring.scale.setScalar(.25+ripple*2.1);ring.material.opacity=(1-ripple)*envelope*.45;}
      if(style==="heal"){ring.scale.setScalar(1.8-1.15*ease(t));ring.material.opacity=envelope*.38;}
      if(style==="fireball"&&flight>=1){ring.scale.setScalar(.3+ease(burst)*2.8);ring.material.opacity=(1-burst)*.45;}
      for(let i=0;i<r.count;i++) {
        const seed=noise(i,1),other=noise(i,2),angle=tau*noise(i,4);
        let x=0,y=0,z=0,size=.07,alpha=envelope*.5;
        if(r.travel&&flight<1) {
          const tail=clamp(flight-seed*.3);travel(tail,point);
          const turn=angle+flight*11,spread=style==="genie"?.13:.075;
          x=point.x-e.base.x+Math.cos(turn)*spread;y=point.y-e.base.y+Math.sin(turn)*spread;z=point.z-e.base.z+Math.sin(angle)*spread;
          size=style==="genie"?.15:.12;alpha=envelope*(1-seed)*.7;
        } else if(style==="fireball") {
          const polar=1-2*other,radius=(.22+seed*1.05)*ease(burst),horizontal=Math.sqrt(1-polar*polar);
          x=Math.cos(angle)*horizontal*radius;z=Math.sin(angle)*horizontal*radius;y=h*.58+polar*radius-.5*burst*burst;
          size=.08+(1-burst)*.13;alpha=(1-burst)**1.3*.8;
        } else if(style==="wrath") {
          // Flame meshes carry the fire; these are small rising embers.
          const age=fraction(seed+t*(.9+other*.6)),radius=.18+other*.25+age*.18,turn=angle+age*2;
          x=Math.cos(turn)*radius;z=Math.sin(turn)*radius;y=.04+age*h*1.8;
          size=.025+other*.035;alpha=envelope*Math.sin(Math.PI*age)*.85;
        } else if(style==="tempest") {
          const rise=fraction(seed+t*.95),turn=angle+t*14+rise*7,radius=.12+rise*rise*.68;
          x=Math.cos(turn)*radius;z=Math.sin(turn)*radius;y=.03+rise*h*1.4;
          size=.14+rise*.06;alpha=envelope*Math.sin(Math.PI*rise)*.52;
        } else if(style==="genie") {
          // Five coloured spirit wisps coil around the upper body after arrival.
          const strand=i%5,u=Math.floor(i/5)/(r.count/5),turn=u*tau+burst*6+strand*tau/5;
          const radius=.48+Math.sin(u*Math.PI)*.16;
          x=Math.cos(turn)*radius;z=Math.sin(turn)*radius;y=h*(.25+strand*.17)+Math.sin(turn*2)*h*.16;
          size=.17;alpha=Math.sin(Math.PI*burst)*(e.door?.62:.55)*(.3+.7*Math.sin(u*Math.PI));
        } else if(style==="heal") {
          const gather=fraction(seed+t*.9),radius=.68*(1-gather)+.06;
          x=Math.cos(angle+gather*4)*radius;z=Math.sin(angle+gather*4)*radius;y=.05+gather*h*1.1;
          size=.085+other*.055;alpha=envelope*Math.sin(Math.PI*gather)*.75;
        } else if(style==="water") {
          const fall=fraction(seed+t*1.1),radius=Math.sqrt(other)*.65;
          x=Math.cos(angle)*radius;z=Math.sin(angle)*radius;y=(1-fall)*(h+.4);
          size=.15;alpha=envelope*Math.sin(Math.PI*fall)*.68;
        } else if(style==="stone") {
          const settle=ease(t/.6),level=.08+seed*.95,radius=.24+Math.sin(level*Math.PI)*.15+(1-settle)*.38,turn=angle+(1-settle)*2;
          x=Math.cos(turn)*radius;z=Math.sin(turn)*radius;y=level*h+(1-settle)*.35;
          size=.095+other*.065;alpha=envelope*.75;
        } else if(style==="phase") {
          const sweep=fraction(seed+t*.95);x=(sweep-.5)*1.5;y=(.08+other*1.05)*h;z=(noise(i,5)-.5)*.7;
          size=.075+noise(i,6)*.045;alpha=envelope*Math.sin(Math.PI*sweep)*.7;
        } else if(style==="mist") {
          const turn=angle+Math.sin(t*3+seed*8)*.35,radius=.2+seed*.38+ease(t)*.25;
          x=Math.cos(turn)*radius;z=Math.sin(turn)*radius;y=.06+other*h*.55+Math.sin(t*4+angle)*.06;
          size=.35+seed*.2;alpha=envelope*.16;
        } else if(style==="sleep") {
          const drift=fraction(seed+t*.45),radius=.25+other*.32,turn=angle+t*1.3;
          x=Math.cos(turn)*radius;z=Math.sin(turn)*radius;y=h*(.75+drift*.55);
          size=.12+other*.04;alpha=envelope*(.4+.35*Math.sin(t*4+angle)**2);
        } else if(style==="wind") {
          const run=fraction(seed+t*1.8);x=(other-.5)*1.05+Math.sin(run*tau)*.1;y=h*(.12+noise(i,5)*.75);z=.7-run*1.5;
          size=.14;alpha=envelope*Math.sin(Math.PI*run)*.55;
        } else if(style==="courage") {
          const pulse=fraction(seed+t*.95),radius=.18+pulse*.78;
          x=Math.cos(angle)*radius;z=Math.sin(angle)*radius;y=h*(.2+other*.85)+Math.sin(pulse*Math.PI)*.2;
          size=.09+other*.045;alpha=envelope*Math.sin(Math.PI*pulse)*.8;
        }
        if(style==="phase"||style==="wind"){const localX=x;x=localX*e.forward.z+z*e.forward.x;z=-localX*e.forward.x+z*e.forward.z;}
        positions[i*3]=e.base.x+x;positions[i*3+1]=Math.max(e.base.y+.015,e.base.y+y);positions[i*3+2]=e.base.z+z;
        sizes[i]=size*(style==="mist"?1.3:1.65);alphas[i]=Math.min(.9,alpha*1.5);
      }
      material.uniforms.viewportHeight.value=viewportHeight;
      for(const name of ["position","particleSize","particleAlpha"])geometry.attributes[name].needsUpdate=true;
    }
    return Object.freeze({locate,play,update,finish,light,get available(){return available();},get active(){return Boolean(effect);}});
  };
})();

(function () {
  "use strict";
  const HQ=window.HeroQuest,T=window.HQThree;
  // Cosmetic recipes only; shared resources, separate volumetric motion paths.
  const recipes=Object.freeze({
    "ball-of-flame":{style:"fireball",colours:[0xff681c,0xffc24a],duration:1700,travel:650,count:120},
    "fire-of-wrath":{style:"wrath",colours:[0xe52342,0xff6c40],duration:1550,count:100},
    "heal-body":{style:"heal",colours:[0x28cf65,0xb0eb68],duration:1600,count:72},
    "water-of-healing":{style:"water",colours:[0x2684ef,0x72e6fa],duration:1650,count:88,shape:3},
    "rock-skin":{style:"stone",colours:[0xb7a16e,0xe0ce91],duration:1600,count:72,shape:1},
    tempest:{style:"tempest",colours:[0x91b6d4,0xe0eaf5],duration:1850,count:120,shape:4},
    courage:{style:"courage",colours:[0xffb52e,0xffe977],duration:1500,count:72},
    "swift-wind":{style:"wind",colours:[0x39ddb5,0xb0ffe0],duration:1550,count:88,shape:4},
    "pass-through-rock":{style:"phase",colours:[0xc97937,0xf1b968],duration:1650,count:100},
    "veil-of-mist":{style:"mist",colours:[0x448d9c,0x86c9ce],duration:1800,count:64},
    sleep:{style:"sleep",colours:[0xa66beb,0xec9fd4],duration:1750,count:48,shape:2},
    genie:{style:"genie",colours:[0x655bff,0x77d2ff],duration:1850,travel:750,count:120}
  });
  const capacity=160,tau=Math.PI*2;
  const fraction=value=>value-Math.floor(value);
  const noise=(i,k)=>fraction(Math.sin(i*127.1+k*311.7)*43758.5453);
  const clamp=value=>T.MathUtils.clamp(value,0,1);
  const ease=value=>{const t=clamp(value);return t*t*(3-2*t);};
  HQ.createSpellEffects=function({scene,entities,reducedMotion,contextReady,requestRender}) {
    const root=new T.Group();root.name="Spell particles";root.visible=false;scene.add(root);
    // Keep a permanent zero-intensity slot so each cast avoids a new light-count
    // shader variant. It follows projectiles and fades with the target effect.
    const light=new T.PointLight(0xffffff,0,2.8,2);light.name="Spell glow";scene.add(light);
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
          float opacity=alpha*mask*mask;if(opacity<.005)discard;
          gl_FragColor=vec4(tint,opacity);
          #include <colorspace_fragment>
        }`});
    const particles=new T.Points(geometry,material);particles.frustumCulled=false;particles.raycast=()=>{};root.add(particles);
    const core=new T.Mesh(new T.SphereGeometry(1,12,8),new T.MeshBasicMaterial({color:0xffa330,transparent:true,opacity:.6,depthWrite:false,toneMapped:false}));core.raycast=()=>{};root.add(core);
    const ring=new T.Mesh(new T.RingGeometry(.43,.46,64),new T.MeshBasicMaterial({color:0x80b5c1,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false,toneMapped:false}));
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
      light.intensity=0;
      if(!effect)return;const ended=effect;effect=null;clearTimeout(ended.timer);root.visible=false;ended.resolve();requestRender();
    }
    function travel(t,out) {
      const u=clamp(t);out.lerpVectors(effect.from,effect.to,u);out.y+=Math.sin(Math.PI*u)*.2;return out;
    }
    function play(report,anchors=locate(report)) {
      finish();if(!anchors||!available())return Promise.resolve();
      const recipe=recipes[report.spellId],a=new T.Color(recipe.colours[0]),b=new T.Color(recipe.colours[1]);
      for(let i=0;i<recipe.count;i++){colour.copy(a).lerp(b,noise(i,3));colour.toArray(colours,i*3);}
      geometry.setDrawRange(0,recipe.count);geometry.attributes.particleColour.needsUpdate=true;
      material.uniforms.shape.value=recipe.shape||0;ring.material.color.copy(b);core.material.color.copy(a);
      light.color.copy(a).lerp(b,.25);
      ring.position.set(anchors.base.x,anchors.base.y+.015,anchors.base.z);ring.material.opacity=0;
      root.visible=true;core.visible=false;
      const forward=anchors.to.clone().sub(anchors.from);forward.y=0;
      if(forward.lengthSq()<.001)forward.set(Math.sin(anchors.target.model.rotation.y),0,Math.cos(anchors.target.model.rotation.y));forward.normalize();
      return new Promise(resolve=>{
        effect={...anchors,recipe,forward,door:Boolean(report.doorId),resolve,started:null,timer:setTimeout(finish,recipe.duration+600)};
        update(performance.now(),1);requestRender();
      });
    }
    function update(time,viewportHeight) {
      if(!effect)return;if(!available()){finish();return;}
      const e=effect,r=e.recipe;if(e.started===null)e.started=time;
      const elapsed=time-e.started,t=elapsed/r.duration;if(t>=1){finish();return;}
      const style=r.style,flight=r.travel?elapsed/r.travel:1,burst=r.travel?clamp((elapsed-r.travel)/(r.duration-r.travel)):t;
      const envelope=ease(t/.15)*(1-ease((t-.72)/.28)),h=e.height;
      if(r.travel&&flight<1)travel(flight,light.position);else light.position.copy(e.to);
      light.intensity=(style==="mist"?2:style==="fireball"?7:5)*envelope;
      core.visible=style==="fireball"&&flight<1;
      if(core.visible){travel(flight,core.position);core.scale.setScalar(.065);core.material.opacity=.6*envelope;}
      ring.material.opacity=0;
      if(style==="water"){const ripple=fraction(t*2.4);ring.scale.setScalar(.2+ripple*1.6);ring.material.opacity=(1-ripple)*envelope*.16;}
      if(style==="heal"){ring.scale.setScalar(1.25-.65*ease(t));ring.material.opacity=envelope*.12;}
      if(style==="fireball"&&flight>=1){ring.scale.setScalar(.3+ease(burst)*1.8);ring.material.opacity=(1-burst)*.12;}
      for(let i=0;i<r.count;i++) {
        const seed=noise(i,1),other=noise(i,2),angle=tau*noise(i,4);
        let x=0,y=0,z=0,size=.07,alpha=envelope*.5;
        if(r.travel&&flight<1) {
          const tail=clamp(flight-seed*.3);travel(tail,point);
          const turn=angle+flight*9,spread=style==="genie"?.07:.035;
          x=point.x-e.base.x+Math.cos(turn)*spread;y=point.y-e.base.y+Math.sin(turn)*spread;z=point.z-e.base.z+Math.sin(angle)*spread;
          size=style==="genie"?.11:.08;alpha=envelope*(1-seed)*.55;
        } else if(style==="fireball") {
          const polar=1-2*other,radius=(.15+seed*.65)*ease(burst),horizontal=Math.sqrt(1-polar*polar);
          x=Math.cos(angle)*horizontal*radius;z=Math.sin(angle)*horizontal*radius;y=h*.58+polar*radius-.35*burst*burst;
          size=.06+(1-burst)*.07;alpha=(1-burst)**1.5*.65;
        } else if(style==="wrath") {
          const age=fraction(seed+t*(.7+other*.3)),radius=(.08+other*.16)*(1-age*.6),turn=angle+age;
          x=Math.cos(turn)*radius;z=Math.sin(turn)*radius;y=.03+age*h*1.15;
          size=.09+(1-age)*.06;alpha=envelope*Math.sin(Math.PI*age)*.6;
        } else if(style==="tempest") {
          const rise=fraction(seed+t*.7),turn=angle+t*10+rise*7,radius=.1+rise*rise*.42;
          x=Math.cos(turn)*radius;z=Math.sin(turn)*radius;y=.03+rise*h*1.15;
          size=.1+rise*.03;alpha=envelope*Math.sin(Math.PI*rise)*.35;
        } else if(style==="genie") {
          // Three airy wisps orbit the upper body after their curved arrival.
          const strand=i%3,u=Math.floor(i/3)/(r.count/3),turn=u*tau+burst*4+strand*tau/3;
          const radius=.35+Math.sin(u*Math.PI)*.1;
          x=Math.cos(turn)*radius;z=Math.sin(turn)*radius;y=h*(.35+strand*.2)+Math.sin(turn*2)*h*.12;
          size=.12;alpha=Math.sin(Math.PI*burst)*(e.door?.45:.38)*(.3+.7*Math.sin(u*Math.PI));
        } else if(style==="heal") {
          const gather=fraction(seed+t*.65),radius=.42*(1-gather)+.06;
          x=Math.cos(angle+gather*2)*radius;z=Math.sin(angle+gather*2)*radius;y=.05+gather*h*.85;
          size=.055+other*.035;alpha=envelope*Math.sin(Math.PI*gather)*.65;
        } else if(style==="water") {
          const fall=fraction(seed+t*.8),radius=Math.sqrt(other)*.43;
          x=Math.cos(angle)*radius;z=Math.sin(angle)*radius;y=(1-fall)*(h+.15);
          size=.1;alpha=envelope*Math.sin(Math.PI*fall)*.5;
        } else if(style==="stone") {
          const settle=ease(t/.55),level=.08+seed*.85,radius=.22+Math.sin(level*Math.PI)*.12+(1-settle)*.18;
          x=Math.cos(angle)*radius;z=Math.sin(angle)*radius;y=level*h+(1-settle)*.2;
          size=.065+other*.045;alpha=envelope*.65;
        } else if(style==="phase") {
          const sweep=fraction(seed+t*.65);x=(sweep-.5)*1.05;y=(.08+other*.9)*h;z=(noise(i,5)-.5)*.5;
          size=.045+noise(i,6)*.025;alpha=envelope*Math.sin(Math.PI*sweep)*.55;
        } else if(style==="mist") {
          const turn=angle+Math.sin(t*2+seed*8)*.2,radius=.2+seed*.28+ease(t)*.18;
          x=Math.cos(turn)*radius;z=Math.sin(turn)*radius;y=.06+other*h*.4+Math.sin(t*3+angle)*.035;
          size=.28+seed*.17;alpha=envelope*.1;
        } else if(style==="sleep") {
          const drift=fraction(seed+t*.3),radius=.18+other*.18,turn=angle+t*.7;
          x=Math.cos(turn)*radius;z=Math.sin(turn)*radius;y=h*(.75+drift*.4);
          size=.07+other*.025;alpha=envelope*(.25+.35*Math.sin(t*4+angle)**2);
        } else if(style==="wind") {
          const run=fraction(seed+t*1.4);x=(other-.5)*.75;y=h*(.15+noise(i,5)*.55);z=.4-run*.9;
          size=.09;alpha=envelope*Math.sin(Math.PI*run)*.35;
        } else if(style==="courage") {
          const pulse=fraction(seed+t*.75),radius=.18+pulse*.42;
          x=Math.cos(angle)*radius;z=Math.sin(angle)*radius;y=h*(.25+other*.65)+Math.sin(pulse*Math.PI)*.12;
          size=.055+other*.025;alpha=envelope*Math.sin(Math.PI*pulse)*.65;
        }
        if(style==="phase"||style==="wind"){const localX=x;x=localX*e.forward.z+z*e.forward.x;z=-localX*e.forward.x+z*e.forward.z;}
        positions[i*3]=e.base.x+x;positions[i*3+1]=Math.max(e.base.y+.015,e.base.y+y);positions[i*3+2]=e.base.z+z;
        sizes[i]=size*(style==="mist"?1:1.35);alphas[i]=Math.min(.85,alpha*1.25);
      }
      material.uniforms.viewportHeight.value=viewportHeight;
      for(const name of ["position","particleSize","particleAlpha"])geometry.attributes[name].needsUpdate=true;
    }
    return Object.freeze({locate,play,update,finish,light,get available(){return available();},get active(){return Boolean(effect);}});
  };
})();

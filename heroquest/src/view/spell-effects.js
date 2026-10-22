(function () {
  "use strict";
  const HQ=window.HeroQuest,T=window.HQThree;
  // Cosmetic recipes only. No rules, rolls, hidden targets or save state.
  const recipes=Object.freeze({
    "ball-of-flame":{style:"fireball",colours:[0xff571b,0xffd26b],duration:1750,travel:700},
    "fire-of-wrath":{style:"wrath",colours:[0xff3b15,0xffb348],duration:1650},
    "heal-body":{style:"heal",colours:[0x68d694,0xe5d38b],duration:1600},
    "water-of-healing":{style:"water",colours:[0x42c6e8,0xb5f6ed],duration:1700},
    "rock-skin":{style:"stone",colours:[0xb49b6b,0xe2d1a8],duration:1650},
    tempest:{style:"tempest",colours:[0x9fcdd5,0xe3e7cd],duration:1850},
    courage:{style:"courage",colours:[0xe85835,0xffcf69],duration:1600},
    "swift-wind":{style:"wind",colours:[0xc3e3c2,0xf2e8b5],duration:1600},
    "pass-through-rock":{style:"phase",colours:[0xc2a77b,0xe0c9a7],duration:1700},
    "veil-of-mist":{style:"mist",colours:[0x609fae,0xb2d7d2],duration:1800},
    sleep:{style:"sleep",colours:[0x9d87d5,0xd1b9ef],duration:1800},
    genie:{style:"genie",colours:[0x4dbcd6,0xd8f2db],duration:1950,travel:650}
  });
  const count=160,tau=Math.PI*2;
  const fraction=value=>value-Math.floor(value);
  const noise=(i,k)=>fraction(Math.sin(i*127.1+k*311.7)*43758.5453);
  const ease=t=>{t=T.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
  HQ.createSpellEffects=function({scene,entities,reducedMotion,contextReady,requestRender}) {
    const root=new T.Group();root.name="Spell particles";root.visible=false;scene.add(root);
    const geometry=new T.BufferGeometry(),positions=new Float32Array(count*3),colours=new Float32Array(count*3),sizes=new Float32Array(count),alphas=new Float32Array(count);
    for(const [name,array,size] of [["position",positions,3],["particleColour",colours,3],["particleSize",sizes,1],["particleAlpha",alphas,1]])
      geometry.setAttribute(name,new T.BufferAttribute(array,size).setUsage(T.DynamicDrawUsage));
    const material=new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,blending:T.AdditiveBlending,toneMapped:false,
      uniforms:{viewportHeight:{value:1},shape:{value:0}},
      vertexShader:`attribute vec3 particleColour; attribute float particleSize; attribute float particleAlpha;
        uniform float viewportHeight; varying vec3 tint; varying float alpha;
        void main(){tint=particleColour;alpha=particleAlpha;vec4 view=modelViewMatrix*vec4(position,1.0);
          gl_Position=projectionMatrix*view;
          gl_PointSize=clamp(particleSize*viewportHeight*.5*projectionMatrix[1][1]/max(.01,gl_Position.w),1.0,96.0);}`,
      fragmentShader:`uniform float shape; varying vec3 tint; varying float alpha;
        void main(){vec2 uv=gl_PointCoord-.5;float radius=length(uv)*2.;
          if(shape>.5&&shape<1.5)radius=(abs(uv.x)+abs(uv.y))*1.5;
          float falloff=1.-smoothstep(0.,1.,radius);
          if(shape>1.5)falloff=max(falloff*.5,(1.-smoothstep(.015,.07,min(abs(uv.x),abs(uv.y))))*(1.-smoothstep(.12,.5,max(abs(uv.x),abs(uv.y)))));
          gl_FragColor=vec4(tint,alpha*falloff*falloff);
          #include <colorspace_fragment>
        }`});
    const particles=new T.Points(geometry,material);particles.frustumCulled=false;particles.raycast=()=>{};root.add(particles);
    const core=new T.Mesh(new T.SphereGeometry(1,12,8),new T.MeshBasicMaterial({color:0xffa330,transparent:true,opacity:.9,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));
    core.raycast=()=>{};root.add(core);
    const ring=new T.Mesh(new T.RingGeometry(.43,.47,64),new T.MeshBasicMaterial({color:0xb8eee0,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));
    ring.rotation.x=-Math.PI/2;ring.raycast=()=>{};root.add(ring);
    const point=new T.Vector3(),colour=new T.Color();let effect=null;
    const available=()=>!reducedMotion.matches&&contextReady()&&document.visibilityState!=="hidden";
    function locate(report) {
      const caster=entities.get(report.attackerId),target=entities.get(report.defenderId||report.doorId);
      if(!caster?.model.visible||!target?.model.visible||!recipes[report.spellId])return null;
      const from=caster.model.position.clone().add(new T.Vector3(0,.9,0)),to=target.model.position.clone().add(new T.Vector3(0,target.type==="door"?1.05:.75,0));
      return {from,to,caster,target};
    }
    function finish() {
      if(!effect)return;
      const previous=effect;effect=null;clearTimeout(previous.timer);root.visible=false;
      previous.resolve();requestRender();
    }
    function travel(t,out) {
      out.lerpVectors(effect.from,effect.to,T.MathUtils.clamp(t,0,1));
      out.y+=Math.sin(Math.PI*T.MathUtils.clamp(t,0,1))*(effect.recipe.style==="genie"?.42:.25);
      return out;
    }
    function play(report,anchors=locate(report)) {
      finish();if(!anchors||!available())return Promise.resolve();
      const recipe=recipes[report.spellId],a=new T.Color(recipe.colours[0]),b=new T.Color(recipe.colours[1]);
      for(let i=0;i<count;i++){colour.copy(a).lerp(b,noise(i,3));colour.toArray(colours,i*3);}
      geometry.attributes.particleColour.needsUpdate=true;
      material.uniforms.shape.value=["stone","phase"].includes(recipe.style)?1:recipe.style==="sleep"?2:0;
      ring.material.color.copy(b);core.material.color.copy(a);ring.position.set(anchors.to.x,.19,anchors.to.z);
      root.visible=true;core.visible=false;
      return new Promise(resolve=>{
        effect={...anchors,recipe,resolve,started:null,timer:setTimeout(finish,recipe.duration+600)};
        update(performance.now(),1);requestRender();
      });
    }
    function update(time,viewportHeight) {
      if(!effect)return;
      if(!available()){finish();return;}
      const e=effect,r=e.recipe;if(e.started===null)e.started=time;
      const elapsed=time-e.started,t=elapsed/r.duration;if(t>=1){finish();return;}
      const style=r.style,projectile=Boolean(r.travel),flight=projectile?elapsed/r.travel:1;
      const burst=projectile?T.MathUtils.clamp((elapsed-r.travel)/(r.duration-r.travel),0,1):t;
      const envelope=Math.sin(Math.PI*t)**.65;
      core.visible=projectile&&flight<1;
      if(core.visible){travel(flight,core.position);core.scale.setScalar(style==="genie"?.09:.12+Math.sin(t*45)*.012);}
      ring.material.opacity=projectile&&flight<1?0:Math.sin(Math.PI*burst)*.3;
      ring.scale.setScalar(.65+burst*1.8);
      for(let i=0;i<count;i++) {
        const seed=noise(i,1),angle=tau*(i/count+seed*.12),speed=.65+noise(i,2)*.8;
        let x=0,y=0,z=0,size=.11,alpha=envelope*.75;
        if(projectile&&flight<1) {
          const tail=Math.max(0,flight-seed*.38);travel(tail,point);
          const spread=.055+seed*.12;x=point.x-e.to.x+Math.cos(angle)*spread;y=point.y-e.to.y+(noise(i,7)-.5)*spread*2;z=point.z-e.to.z+Math.sin(angle)*spread;
          size=style==="genie"?.18:.13;alpha=(1-seed)*.8;
        } else if(style==="fireball"||style==="wrath") {
          const age=fraction(i/count+burst*1.35),radius=(.08+seed*.52)*Math.sin(Math.PI*age);
          x=Math.cos(angle)*radius;z=Math.sin(angle)*radius;y=-.55+age*(style==="wrath"?1.8:1.35);
          size=.13+(1-age)*.19;alpha=Math.sin(Math.PI*age)*(1-burst)*.85;
          if(style==="wrath"&&t<.28){y+=1.5*(1-t/.28);x*=.5;z*=.5;}
        } else if(style==="tempest"||style==="genie") {
          const height=i/count,turn=angle+t*tau*2.8,radius=.14+height*.45;
          x=Math.cos(turn)*radius;z=Math.sin(turn)*radius;y=-.58+height*1.8;
          size=.18;alpha=envelope*.45;if(projectile)alpha=Math.sin(Math.PI*burst)*.6;
        } else if(style==="heal"||style==="water") {
          const rise=fraction(i/count+t*speed),turn=angle+t*tau*1.3,radius=.3+Math.sin(rise*Math.PI)*.2;
          x=Math.cos(turn)*radius;z=Math.sin(turn)*radius;y=-.55+rise*1.55;
          size=style==="water"?.15:.10;alpha=envelope*Math.sin(Math.PI*rise)*.8;
        } else if(style==="stone"||style==="phase") {
          const rise=fraction(i/count+t*.6),turn=angle+t*2,radius=style==="stone"?.45-.1*t:.38+Math.sin(rise*Math.PI)*.22;
          x=Math.cos(turn)*radius;z=Math.sin(turn)*radius;y=-.55+rise*1.5;
          size=.08+seed*.07;alpha=envelope*(style==="phase"?.55:.85);
        } else if(style==="mist") {
          const turn=angle+t*1.7,radius=.2+seed*.45;
          x=Math.cos(turn)*radius;z=Math.sin(turn)*radius;y=-.5+fraction(i/count+t*.35)*1.25;
          size=.35+seed*.25;alpha=envelope*.18;
        } else if(style==="sleep") {
          const turn=angle+t*1.5,radius=.2+seed*.4;
          x=Math.cos(turn)*radius;z=Math.sin(turn)*radius;y=1.-fraction(i/count+t*.4)*1.4;
          size=.09+seed*.08;alpha=envelope*.6;
        } else if(style==="wind") {
          const run=fraction(i/count+t*1.3),turn=angle+t*7;
          x=(run-.5)*1.5;z=Math.sin(turn)*.35;y=-.3+seed*.95;
          size=.13;alpha=envelope*Math.sin(Math.PI*run)*.6;
        } else { // Courage: rising red/gold sparks and an expanding aura.
          const rise=fraction(i/count+t*.7),radius=.38+Math.sin(rise*Math.PI)*.15;
          x=Math.cos(angle)*radius;z=Math.sin(angle)*radius;y=-.5+rise*1.7;
          size=.1;alpha=envelope*Math.sin(Math.PI*rise)*.8;
        }
        positions[i*3]=e.to.x+x;positions[i*3+1]=e.to.y+y;positions[i*3+2]=e.to.z+z;
        sizes[i]=size;alphas[i]=alpha;
      }
      material.uniforms.viewportHeight.value=viewportHeight;
      for(const name of ["position","particleSize","particleAlpha"])geometry.attributes[name].needsUpdate=true;
    }
    return Object.freeze({locate,play,update,finish,get available(){return available();},get active(){return Boolean(effect);}});
  };
})();

(function () {
  "use strict";
  const HQ=window.HeroQuest,T=window.HQThree;
  // Reusable 3D flame volumes. Their curling silhouettes animate on the GPU;
  // they are cosmetic, unlit, noninteractive and never cast shadows.
  HQ.createSpellFlames=function(parent) {
    const root=new T.Group();root.name="Wrath flames";root.visible=false;parent.add(root);
    const profile=[];
    for(let i=0;i<=20;i++) {
      const y=i/20,radius=.4*Math.sin(Math.PI*Math.pow(y,.7))*(1-y*.65);
      profile.push(new T.Vector2(Math.max(0,radius),y));
    }
    const geometry=new T.LatheGeometry(profile,14),seeds=[],cores=[],count=18;
    for(let i=0;i<count;i++){seeds.push((i%9)*1.731);cores.push(i>=9?1:0);}
    geometry.setAttribute("flameSeed",new T.InstancedBufferAttribute(new Float32Array(seeds),1));
    geometry.setAttribute("flameCore",new T.InstancedBufferAttribute(new Float32Array(cores),1));
    const material=new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,toneMapped:false,blending:T.NormalBlending,
      uniforms:{flameTime:{value:0},flameOpacity:{value:0}},
      vertexShader:`attribute float flameSeed; attribute float flameCore;
        uniform float flameTime; varying vec2 fireUv; varying float seed; varying float core;
        varying vec3 fireNormal; varying vec3 fireView;
        void main(){
          fireUv=uv;seed=flameSeed;core=flameCore;
          vec3 p=position;float tip=pow(p.y,1.7),time=flameTime;
          p.x+=tip*(sin(time*5.7+p.y*5.5+seed)*.2+sin(time*9.1+seed*2.0)*.08);
          p.z+=tip*(cos(time*6.3+p.y*7.0+seed)*.16+sin(time*8.3+seed)*.07);
          p.xz*=1.0+sin(time*8.0+seed+p.y*4.0)*.1;
          p.y*=1.0+sin(time*6.7+seed)*.09+sin(time*11.3+seed*1.7)*.04;
          vec4 view=modelViewMatrix*instanceMatrix*vec4(p,1.0);
          fireNormal=normalize(normalMatrix*mat3(instanceMatrix)*normal);fireView=-view.xyz;
          gl_Position=projectionMatrix*view;
        }`,
      fragmentShader:`uniform float flameTime;uniform float flameOpacity;
        varying vec2 fireUv;varying float seed;varying float core;varying vec3 fireNormal;varying vec3 fireView;
        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        float noise(vec2 p){vec2 cell=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
          return mix(mix(hash(cell),hash(cell+vec2(1.0,0.0)),f.x),mix(hash(cell+vec2(0.0,1.0)),hash(cell+vec2(1.0,1.0)),f.x),f.y);}
        void main(){
          float height=fireUv.y;
          float flow=noise(vec2(fireUv.x*5.0+seed,height*7.0-flameTime*3.5));
          float detail=noise(vec2(fireUv.x*9.0-seed,height*13.0-flameTime*5.0));
          float heat=clamp(1.0-height*.9+core*.3+(flow-.5)*.25,0.0,1.0);
          vec3 red=vec3(.8,.025,.003),orange=vec3(1.0,.24,.008),yellow=vec3(1.0,.84,.22);
          vec3 colour=mix(red,orange,smoothstep(.05,.65,heat));
          colour=mix(colour,yellow,smoothstep(.6,1.0,heat)*(.65+core*.35));
          float edge=smoothstep(.02,.55,abs(dot(normalize(fireNormal),normalize(fireView))));
          float tip=1.0-smoothstep(.7+flow*.15,1.0,height);
          float opacity=flameOpacity*mix(.36,.62,core)*edge*tip*smoothstep(0.0,.08,height)*(.55+.45*detail);
          if(opacity<.005)discard;
          gl_FragColor=vec4(colour,opacity);
          #include <colorspace_fragment>
        }`});
    const flames=new T.InstancedMesh(geometry,material,count),dummy=new T.Object3D();
    flames.frustumCulled=false;flames.userData.visualEffect=true;flames.raycast=()=>{};root.add(flames);
    for(let i=0;i<count;i++) {
      const index=i%9,inner=i>=9,angle=index*Math.PI/4,radius=index===8?0:.27+(index%3)*.035;
      dummy.position.set(Math.cos(angle)*radius,0,Math.sin(angle)*radius);
      dummy.rotation.y=angle;
      const width=.85+(index%3)*.12,height=.95+(index%4)*.14;
      dummy.scale.set(width*(inner?.5:1),height*(inner?.67:1),width*(inner?.5:1));
      dummy.updateMatrix();flames.setMatrixAt(i,dummy.matrix);
    }
    flames.instanceMatrix.needsUpdate=true;
    let fittedHeight=1;
    function show(base,height){root.position.copy(base);fittedHeight=height*1.45;root.scale.set(1,fittedHeight,1);root.visible=true;}
    function update(seconds,progress,envelope) {
      if(!root.visible)return;
      const rise=T.MathUtils.smoothstep(progress,0,.16),fall=T.MathUtils.smoothstep(progress,.78,1);
      root.scale.y=fittedHeight*(.3+.7*rise)*(1-fall*.3);
      material.uniforms.flameTime.value=seconds;material.uniforms.flameOpacity.value=envelope;
    }
    function finish(){root.visible=false;material.uniforms.flameOpacity.value=0;}
    return Object.freeze({show,update,finish});
  };
})();

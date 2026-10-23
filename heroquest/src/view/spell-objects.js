(function () {
  "use strict";
  const HQ=window.HeroQuest,T=window.HQThree,tau=Math.PI*2;
  // All geometry/materials are cached with the scene. No game state or RNG.
  HQ.createSpellObjects=function(parent) {
    const root=new T.Group();root.name="Spell shapes";root.visible=false;parent.add(root);
    const wind=new T.Group(),spirit=new T.Group(),stone=new T.Group();root.add(wind,spirit,stone);
    const windMaterial=new T.ShaderMaterial({transparent:true,side:T.DoubleSide,depthWrite:false,toneMapped:false,
      uniforms:{time:{value:0},opacity:{value:0}},
      vertexShader:`varying vec2 ribbonUv;
        void main(){ribbonUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader:`uniform float time;uniform float opacity;varying vec2 ribbonUv;
        void main(){float along=sin(ribbonUv.x*3.14159265);
          float edge=pow(max(0.0,sin(ribbonUv.y*3.14159265)),1.5);
          float flow=.65+.35*sin(ribbonUv.x*35.0-time*9.0);
          float a=opacity*along*edge*flow;if(a<.005)discard;
          gl_FragColor=vec4(mix(vec3(.15,.48,.95),vec3(.65,.9,1.0),ribbonUv.y),a);
          #include <colorspace_fragment>
        }`});
    const positions=[],uvs=[],indices=[],segments=96;
    for(let i=0;i<=segments;i++) {
      const u=i/segments,angle=u*tau*1.65,radius=.13+u*u*.62;
      for(let edge=0;edge<2;edge++) {
        positions.push(Math.cos(angle)*radius,u*1.45+(edge-.5)*(.04+u*.13),Math.sin(angle)*radius);
        uvs.push(u,edge);
      }
      if(i<segments){const a=i*2;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
    }
    const ribbonGeometry=new T.BufferGeometry();
    ribbonGeometry.setAttribute("position",new T.Float32BufferAttribute(positions,3));
    ribbonGeometry.setAttribute("uv",new T.Float32BufferAttribute(uvs,2));ribbonGeometry.setIndex(indices);
    const ribbons=[];
    for(let i=0;i<3;i++) {
      const ribbon=new T.Mesh(ribbonGeometry,windMaterial);ribbon.rotation.y=i*tau/3;
      ribbon.position.y=.03+i*.045;wind.add(ribbon);ribbons.push(ribbon);
    }

    const spiritMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,toneMapped:false,
      uniforms:{time:{value:0},opacity:{value:0}},
      vertexShader:`varying vec3 spiritPosition;varying vec3 spiritNormal;varying vec3 spiritView;
        void main(){vec3 p=position;
          spiritPosition=(modelMatrix*vec4(p,1.0)).xyz;
          vec4 view=modelViewMatrix*vec4(p,1.0);spiritView=-view.xyz;spiritNormal=normalMatrix*normal;
          gl_Position=projectionMatrix*view;}`,
      fragmentShader:`uniform float time;uniform float opacity;
        varying vec3 spiritPosition;varying vec3 spiritNormal;varying vec3 spiritView;
        void main(){float rim=pow(1.0-abs(dot(normalize(spiritNormal),normalize(spiritView))),1.5);
          float flow=.5+.5*sin(spiritPosition.y*18.0-time*6.0+sin(spiritPosition.x*8.0));
          vec3 colour=mix(vec3(.22,.07,.85),vec3(.22,.85,1.0),rim*.7+flow*.3);
          gl_FragColor=vec4(colour,opacity*(.22+rim*.45+flow*.1));
          #include <colorspace_fragment>
        }`});
    const bodyProfile=[[.015,0],[.07,.16],[.12,.3],[.16,.46],[.23,.62],[.3,.83],[.35,.97],[.25,1.06],[.115,1.12]];
    const body=new T.Mesh(new T.LatheGeometry(bodyProfile.map(([r,y])=>new T.Vector2(r,y)),24),spiritMaterial);spirit.add(body);
    const head=new T.Mesh(new T.SphereGeometry(.18,20,12),spiritMaterial);head.scale.set(1,1.2,.95);head.position.y=1.31;spirit.add(head);
    for(const side of [-1,1]) {
      const curve=new T.CubicBezierCurve3(new T.Vector3(side*.29,.98,0),new T.Vector3(side*.72,1.12,.02),new T.Vector3(side*.65,.6,.25),new T.Vector3(side*.45,.84,.42));
      spirit.add(new T.Mesh(new T.TubeGeometry(curve,20,.075,8,false),spiritMaterial));
    }
    const eyeMaterial=new T.MeshBasicMaterial({color:0x83efff,transparent:true,opacity:0,depthWrite:false,toneMapped:false});
    const eyeGeometry=new T.SphereGeometry(.024,8,6);
    for(const side of [-1,1]){const eye=new T.Mesh(eyeGeometry,eyeMaterial);eye.position.set(side*.065,1.34,.163);eye.scale.set(1.3,.55,.5);spirit.add(eye);}
    const stoneMaterial=new T.MeshStandardMaterial({color:0xffffff,roughness:1,transparent:true,opacity:0,depthWrite:false});
    const rocks=new T.InstancedMesh(new T.IcosahedronGeometry(1,0),stoneMaterial,16),dummy=new T.Object3D(),colour=new T.Color();
    rocks.instanceMatrix.setUsage(T.DynamicDrawUsage);rocks.frustumCulled=false;rocks.receiveShadow=true;stone.add(rocks);
    for(let i=0;i<16;i++){colour.setHex([0x8b765c,0xc4af87,0x756f62,0xab997b][i%4]);rocks.setColorAt(i,colour);}
    root.traverse(object=>{if(object.isMesh){object.raycast=()=>{};object.userData.visualEffect=true;}});
    let current=null,height=1,facing=0;
    function show(style,anchors) {
      finish();if(!["tempest","genie","stone"].includes(style))return;
      current=style;height=anchors.height;root.position.copy(anchors.base);root.visible=true;
      wind.visible=style==="tempest";spirit.visible=style==="genie";stone.visible=style==="stone";
      facing=Math.atan2(anchors.forward.x,anchors.forward.z);
      wind.scale.set(1,height,1);spirit.scale.setScalar(Math.max(.65,height*.9));
    }
    function update(seconds,progress,envelope,flight,burst) {
      if(!current)return;
      if(current==="tempest") {
        windMaterial.uniforms.time.value=seconds;windMaterial.uniforms.opacity.value=envelope*.65;
        wind.rotation.y=seconds*5.2;
        wind.scale.x=wind.scale.z=.7+.3*Math.sin(Math.PI*progress);
        for(let i=0;i<ribbons.length;i++)ribbons[i].rotation.y=i*tau/3+Math.sin(seconds*3+i)*.14;
      } else if(current==="genie") {
        const arrive=T.MathUtils.smoothstep(burst,0,.2),fade=1-T.MathUtils.smoothstep(burst,.7,1);
        spirit.visible=flight>=1;spiritMaterial.uniforms.time.value=seconds;
        spiritMaterial.uniforms.opacity.value=arrive*fade*envelope;
        eyeMaterial.opacity=arrive*fade*envelope*.9;
        spirit.scale.y=Math.max(.65,height*.9)*(.15+arrive*.85);
        spirit.position.set(Math.sin(seconds*3)*.07,height*.2+Math.sin(burst*Math.PI)*.14,0);
        spirit.rotation.y=facing+Math.sin(seconds*2)*.25;
        body.rotation.y=seconds*2;
      } else {
        const settle=T.MathUtils.smoothstep(progress,.08,.65),shrink=1-T.MathUtils.smoothstep(progress,.78,1);
        stoneMaterial.opacity=envelope*.9;
        for(let i=0;i<16;i++) {
          const level=i%4,angle=Math.floor(i/4)*tau/4+level*.6+seconds*(1-settle)*1.8;
          const radius=.29+Math.sin((level+1)/5*Math.PI)*.1+(1-settle)*.45;
          dummy.position.set(Math.cos(angle)*radius,height*(.12+level*.24)+Math.sin(seconds*3+i)*.025,Math.sin(angle)*radius);
          dummy.rotation.set(i*.73+seconds*.4*(1-settle),angle,i*.37);
          const size=(.075+(i%3)*.018)*shrink;dummy.scale.set(size*1.25,size*.8,size);
          dummy.updateMatrix();rocks.setMatrixAt(i,dummy.matrix);
        }
        rocks.instanceMatrix.needsUpdate=true;
      }
    }
    function finish(){current=null;root.visible=false;windMaterial.uniforms.opacity.value=0;spiritMaterial.uniforms.opacity.value=0;eyeMaterial.opacity=0;stoneMaterial.opacity=0;}
    return Object.freeze({show,update,finish});
  };
})();

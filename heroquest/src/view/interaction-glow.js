(function () {
  "use strict";
  const HQ=window.HeroQuest,T=window.HQThree;
  HQ.interactionOutlineWidth=2;
  // Hover silhouettes remain overlays; secret-door borders are scene geometry.
  HQ.createInteractionGlow=function(renderer) {
    const maskScene=new T.Scene(),overlayScene=new T.Scene(),overlayCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
    const maskTarget=new T.WebGLRenderTarget(1,1,{depthBuffer:true,stencilBuffer:false});
    const unavailableMaterial=new T.MeshBasicMaterial({color:0xff0000,toneMapped:false}),reachableMaterial=new T.MeshBasicMaterial({color:0x00ff00,toneMapped:false});
    const tileGeometry=new T.PlaneGeometry(.98,.98),links=[],size=new T.Vector2(),clearColour=new T.Color();
    let hoverTargets=[];
    const overlayMaterial=new T.ShaderMaterial({transparent:true,depthTest:false,depthWrite:false,toneMapped:false,
      uniforms:{mask:{value:maskTarget.texture},texel:{value:new T.Vector2(1,1)},pixelRatio:{value:1},outlineWidth:{value:HQ.interactionOutlineWidth}},
      vertexShader:"varying vec2 uvMask;void main(){uvMask=uv;gl_Position=vec4(position.xy,0.0,1.0);}",
      fragmentShader:`uniform sampler2D mask;
        uniform vec2 texel;uniform float pixelRatio;uniform float outlineWidth;varying vec2 uvMask;
        void main(){
          vec2 inside=texture2D(mask,uvMask).rg;vec2 edge=inside,halo=inside;
          for(int i=0;i<12;i++){
            float angle=float(i)*6.2831853/12.0;vec2 direction=vec2(cos(angle),sin(angle))*texel*pixelRatio;
            edge=max(edge,texture2D(mask,uvMask+direction*outlineWidth).rg);
            halo=max(halo,texture2D(mask,uvMask+direction*5.0).rg);
          }
          vec2 rim=max(vec2(0.0),edge-inside),soft=max(vec2(0.0),halo-edge);
          float unavailable=clamp(rim.r+soft.r*.25,0.0,1.0);
          float reachable=clamp(rim.g+soft.g*.25,0.0,1.0);
          float alpha=max(unavailable,reachable);if(alpha<.01)discard;
          vec3 colour=mix(vec3(1.0,.78,.37),vec3(.52,.82,1.0),reachable/max(alpha,.001));
          gl_FragColor=vec4(colour,alpha);
        }`});
    const overlay=new T.Mesh(new T.PlaneGeometry(2,2),overlayMaterial);overlay.frustumCulled=false;overlayScene.add(overlay);
    function clear(scene,entries){for(const {proxy} of entries)if(proxy.userData.ownsMaterial)proxy.material.dispose();scene.clear();entries.length=0;}
    function linkModel(model,material,scene,entries){
      model.traverse(source=>{
        if(!source.isMesh||source.userData.visualEffect)return;
        const clipped=source.material.clippingPlanes?.length,maskMaterial=clipped?material.clone():material;
        if(clipped)maskMaterial.clippingPlanes=source.material.clippingPlanes;
        const proxy=new T.Mesh(source.geometry,maskMaterial);proxy.userData.ownsMaterial=Boolean(clipped);proxy.matrixAutoUpdate=false;proxy.frustumCulled=false;
        entries.push({source,proxy});scene.add(proxy);
      });
    }
    function rebuild(){
      clear(maskScene,links);
      for(const target of hoverTargets){
        const material=target.reachable?reachableMaterial:unavailableMaterial;
        if(target.model)linkModel(target.model,material,maskScene,links);
        else if(target.point){const tile=new T.Mesh(tileGeometry,material);tile.rotation.x=-Math.PI/2;tile.position.copy(target.point);maskScene.add(tile);}
      }
    }
    function sync(entries){for(const {source,proxy} of entries){
      let visible=true;for(let node=source;node;node=node.parent)if(!node.visible){visible=false;break;}
      proxy.visible=visible;if(visible){source.updateWorldMatrix(true,false);proxy.matrix.copy(source.matrixWorld);}
    }}
    function render(camera){
      if(!maskScene.children.length)return;
      renderer.getDrawingBufferSize(size);
      if(maskTarget.width!==size.x||maskTarget.height!==size.y)maskTarget.setSize(size.x,size.y);
      overlayMaterial.uniforms.texel.value.set(1/size.x,1/size.y);overlayMaterial.uniforms.pixelRatio.value=renderer.getPixelRatio();
      sync(links);
      const previousTarget=renderer.getRenderTarget(),autoClear=renderer.autoClear,alpha=renderer.getClearAlpha();renderer.getClearColor(clearColour);
      renderer.autoClear=true;
      renderer.setRenderTarget(maskTarget);renderer.setClearColor(0x000000,0);renderer.render(maskScene,camera);
      renderer.setRenderTarget(previousTarget);renderer.setClearColor(clearColour,alpha);renderer.autoClear=false;renderer.render(overlayScene,overlayCamera);renderer.autoClear=autoClear;
    }
    return Object.freeze({setTargets(targets){hoverTargets=targets;rebuild();},render});
  };
})();

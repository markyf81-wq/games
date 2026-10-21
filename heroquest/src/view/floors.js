(function () {
  "use strict";
  const HQ=window.HeroQuest,T=window.HQThree;
  // User-supplied board artwork, cropped to 26x19 cells offline. The renderer
  // still creates only discovered geometry; the image never defines rules.
  HQ.createFloorTexture=function(){return HQ.componentTextures.get("board");};
  HQ.floorMaterial=function(texture) {
    const material=new T.MeshStandardMaterial({map:texture,roughness:.97,vertexColors:true});
    // One shared atlas, with per-instance cell UVs. Hidden cells still have zero
    // scale; the atlas never changes discovery, picking or topology.
    material.onBeforeCompile=shader=>{
      shader.vertexShader="attribute vec2 floorUvOffset; varying vec2 vFloorUv;\n"+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace("#include <uv_vertex>","#include <uv_vertex>\nvFloorUv=(uv+floorUvOffset)/vec2(26.0,19.0);");
      shader.fragmentShader="varying vec2 vFloorUv;\n"+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace("#include <map_fragment>",T.ShaderChunk.map_fragment.replaceAll("vMapUv","vFloorUv"));
    };
    material.customProgramCacheKey=()=>"heroquest-floor-atlas-v1";return material;
  };
})();

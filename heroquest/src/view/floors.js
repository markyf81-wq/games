(function () {
  "use strict";
  const HQ=window.HeroQuest,T=window.HQThree;
  // User-supplied board artwork, cropped to 26x19 cells offline. The renderer
  // creates discovered floors separately from the optional printed-board backdrop;
  // the image never defines rules.
  HQ.createFloorTexture=function(){return HQ.componentTextures.get("board");};
  // Four decorative red splashes belong to the supplied scan, not gameplay.
  // Cover just those patches with adjacent matching floor one tile away. The
  // whole-cell UV offset preserves grout alignment; originals remain intact.
  const cleanPrintedBlood=`
    vec2 floorPixel = vec2(vFloorUv.x * 1898.0, (1.0 - vFloorUv.y) * 1387.0);
    vec4 floorPatch = vec4(0.0);
    vec2 floorSourceOffset = vec2(0.0);
    if (floorPixel.x > 1423.0 && floorPixel.x < 1462.0 && floorPixel.y > 313.0 && floorPixel.y < 346.0) {
      floorPatch = vec4(1423.0,313.0,1462.0,346.0); floorSourceOffset = vec2(-73.0,0.0);
    } else if (floorPixel.x > 151.0 && floorPixel.x < 247.0 && floorPixel.y > 905.0 && floorPixel.y < 962.0) {
      floorPatch = vec4(151.0,905.0,247.0,962.0); floorSourceOffset = vec2(0.0,-73.0);
    } else if (floorPixel.x > 1672.0 && floorPixel.x < 1762.0 && floorPixel.y > 959.0 && floorPixel.y < 1014.0) {
      floorPatch = vec4(1672.0,959.0,1762.0,1014.0); floorSourceOffset = vec2(-73.0,0.0);
    } else if (floorPixel.x > 1236.0 && floorPixel.x < 1293.0 && floorPixel.y > 1085.0 && floorPixel.y < 1148.0) {
      floorPatch = vec4(1236.0,1085.0,1293.0,1148.0); floorSourceOffset = vec2(-73.0,0.0);
    }
    if (floorPatch.z > 0.0) {
      vec2 floorEdge = min(floorPixel - floorPatch.xy, floorPatch.zw - floorPixel);
      float floorPatchWeight = smoothstep(0.0,4.0,min(floorEdge.x,floorEdge.y));
      vec2 cleanFloorUv = vFloorUv + floorSourceOffset / vec2(1898.0,-1387.0);
      sampledDiffuseColor = mix(sampledDiffuseColor,texture2D(map,cleanFloorUv),floorPatchWeight);
    }
  `;
  HQ.floorMaterial=function(texture) {
    const material=new T.MeshStandardMaterial({map:texture,roughness:.97,vertexColors:true});
    // One shared atlas, with per-instance cell UVs. Hidden cells still have zero
    // scale; the atlas never changes discovery, picking or topology.
    material.onBeforeCompile=shader=>{
      shader.vertexShader="attribute vec2 floorUvOffset; varying vec2 vFloorUv;\n"+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace("#include <uv_vertex>","#include <uv_vertex>\nvFloorUv=(uv+floorUvOffset)/vec2(26.0,19.0);");
      shader.fragmentShader="varying vec2 vFloorUv;\n"+shader.fragmentShader;
      const floorMap=T.ShaderChunk.map_fragment.replaceAll("vMapUv","vFloorUv").replace("diffuseColor *= sampledDiffuseColor;",cleanPrintedBlood+"\ndiffuseColor *= sampledDiffuseColor;");
      shader.fragmentShader=shader.fragmentShader.replace("#include <map_fragment>",floorMap);
    };
    material.customProgramCacheKey=()=>"heroquest-floor-atlas-v2";return material;
  };
  HQ.boardBackdropMaterial=function(texture,knownMask){
    const material=new T.MeshBasicMaterial({map:texture,color:0x7c8174});
    material.onBeforeCompile=shader=>{
      shader.uniforms.hqKnownFloor={value:knownMask};
      shader.fragmentShader="uniform sampler2D hqKnownFloor;\n"+shader.fragmentShader;
      const map=T.ShaderChunk.map_fragment.replace("diffuseColor *= sampledDiffuseColor;",cleanPrintedBlood.replaceAll("vFloorUv","vMapUv")+"\ndiffuseColor *= sampledDiffuseColor;");
      shader.fragmentShader=shader.fragmentShader.replace("#include <map_fragment>","if(texture2D(hqKnownFloor,vMapUv).r>.5)discard;\n"+map);
    };
    material.customProgramCacheKey=()=>"heroquest-board-backdrop-v1";return material;
  };
})();

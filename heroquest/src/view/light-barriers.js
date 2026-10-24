(function () {
  "use strict";
  const HQ=window.HeroQuest,T=window.HQThree,Topo=HQ.topology;
  // Cached 2D visibility masks keep full-height walls opaque to every local
  // light, including lights without costly six-face shadow maps. View cutaway
  // never changes these barriers. This is scenery lighting, not game sight.
  HQ.createLightBarriers=function () {
    const columns=HQ.board.columns,rows=HQ.board.rows,resolution=8,slots=9;
    const width=columns*resolution,height=rows*resolution,pixels=new Uint8Array(width*height*slots);
    const texture=new T.DataTexture(pixels,width,height*slots,T.RedFormat);
    texture.minFilter=texture.magFilter=T.NearestFilter;texture.generateMipmaps=false;texture.unpackAlignment=1;texture.needsUpdate=true;
    const edges=new Uint8Array(columns*rows),known=new Set(),keys=Array(slots).fill(null),copies=new WeakMap(),patched=new WeakSet();
    const origins=Array.from({length:slots},()=>new T.Vector3(999,999,999)),viewToWorld=new T.Matrix4(),position=new T.Vector3();
    const uniforms={hqLightMasks:{value:texture},hqLightOrigins:{value:origins},hqLightViewToWorld:{value:viewToWorld}};
    let layout=null;
    const index=(x,y)=>y*columns+x,inside=(x,y)=>x>=0&&x<columns&&y>=0&&y<rows;
    function setProjection(projection) {
      const blocked=new Set(projection.blocked||HQ.quests.current.blocked);
      const key=[...blocked].join("|")+";"+projection.discoveredCells.join('|')+';'+projection.doors.map(d=>d.id+':'+d.open).join('|');
      if(key===layout)return;layout=key;known.clear();projection.discoveredCells.forEach(id=>known.add(id));edges.fill(15);keys.fill(null);
      const doors=new Map(projection.doors.map(door=>[Topo.edgeKey(...Topo.endpoints(door)),door]));
      for(const id of known){const [x,y]=Topo.parse(id);let bits=0;
        for(const [dx,dy,bit] of [[0,-1,1],[1,0,2],[0,1,4],[-1,0,8]]){
          const other=Topo.key(x+dx,y+dy),door=doors.get(Topo.edgeKey(id,other));
          if(!known.has(other)||blocked.has(id)||blocked.has(other)||(door?!door.open:Topo.regions.get(id)!==Topo.regions.get(other)))bits|=bit;
        }edges[index(x,y)]=bits;
      }
    }
    function clearRay(sx,sy,tx,ty) {
      let x=Math.floor(sx),y=Math.floor(sy);const endX=Math.floor(tx),endY=Math.floor(ty);
      if(!inside(x,y)||!inside(endX,endY)||!known.has(Topo.key(endX,endY)))return false;
      const dx=tx-sx,dy=ty-sy,stepX=Math.sign(dx),stepY=Math.sign(dy),deltaX=dx?1/Math.abs(dx):Infinity,deltaY=dy?1/Math.abs(dy):Infinity;
      let crossX=dx?((stepX>0?x+1-sx:sx-x)*deltaX):Infinity,crossY=dy?((stepY>0?y+1-sy:sy-y)*deltaY):Infinity;
      for(let step=0;step<columns+rows+2;step++) {
        if(x===endX&&y===endY)return true;
        const bits=edges[index(x,y)],bitX=stepX>0?2:8,bitY=stepY>0?4:1;
        if(Math.abs(crossX-crossY)<1e-8){
          // Both corner routes must be clear: no diagonal seam leaks.
          if(bits&bitX||bits&bitY||!inside(x+stepX,y+stepY)||edges[index(x+stepX,y)]&bitY||edges[index(x,y+stepY)]&bitX)return false;
          x+=stepX;y+=stepY;crossX+=deltaX;crossY+=deltaY;
        }else if(crossX<crossY){if(bits&bitX)return false;x+=stepX;crossX+=deltaX;}
        else{if(bits&bitY)return false;y+=stepY;crossY+=deltaY;}
        if(!inside(x,y))return false;
      }return false;
    }
    function bake(slot,x,z,radius) {
      const start=slot*width*height;pixels.fill(0,start,start+width*height);
      const sx=x+columns/2,sy=z+rows/2;
      const minX=Math.max(0,Math.floor((sx-radius)*resolution)),maxX=Math.min(width-1,Math.ceil((sx+radius)*resolution));
      const minY=Math.max(0,Math.floor((sy-radius)*resolution)),maxY=Math.min(height-1,Math.ceil((sy+radius)*resolution));
      for(let py=minY;py<=maxY;py++)for(let px=minX;px<=maxX;px++){
        const tx=(px+.5)/resolution,ty=(py+.5)/resolution;
        if((tx-sx)**2+(ty-sy)**2<=radius*radius&&clearRay(sx,sy,tx,ty))pixels[start+py*width+px]=255;
      }
    }
    function bind(scene) {
      // Board-local clones preserve existing floor/stone shader hooks without
      // changing shared factory materials used by portraits and the showroom.
      const clone=source=>{
        if(!source.isMeshStandardMaterial||patched.has(source))return source;
        if(copies.has(source))return copies.get(source);
        const material=source.clone(),compile=source.onBeforeCompile,cacheKey=source.customProgramCacheKey();
        // Wall animation owns these live planes. Material.clone duplicates the
        // planes, which would leave the rendered walls stuck at their old height.
        material.clippingPlanes=source.clippingPlanes;
        material.onBeforeCompile=function(shader,renderer){
          compile.call(this,shader,renderer);Object.assign(shader.uniforms,uniforms);
          shader.fragmentShader=`uniform sampler2D hqLightMasks;
            uniform vec3 hqLightOrigins[9]; uniform mat4 hqLightViewToWorld;
            float hqLightVisibility(vec3 viewLight,vec3 viewSurface){
              vec3 source=(hqLightViewToWorld*vec4(viewLight,1.0)).xyz;
              vec3 surface=(hqLightViewToWorld*vec4(viewSurface,1.0)).xyz;
              vec2 direction=source.xz-surface.xz;
              vec2 inset=direction/max(length(direction),.0001)*.045;
              vec2 uv=(surface.xz+inset+vec2(13.0,9.5))/vec2(26.0,19.0);
              if(any(lessThan(uv,vec2(0.0)))||any(greaterThanEqual(uv,vec2(1.0))))return 0.0;
              for(int slot=0;slot<9;slot++)if(distance(source,hqLightOrigins[slot])<.002)
                return texture2D(hqLightMasks,vec2(uv.x,(uv.y+float(slot))/9.0)).r;
              return 1.0;
            }\n`+shader.fragmentShader;
          shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_begin>',T.ShaderChunk.lights_fragment_begin.replace('getPointLightInfo( pointLight, geometryPosition, directLight );','getPointLightInfo( pointLight, geometryPosition, directLight );\n directLight.color *= hqLightVisibility(pointLight.position,geometryPosition);'));
        };
        material.customProgramCacheKey=()=>cacheKey+'-dungeon-light-barriers-v1';
        copies.set(source,material);patched.add(material);return material;
      };
      scene.traverse(object=>{if(object.material)object.material=Array.isArray(object.material)?object.material.map(clone):clone(object.material);
        if(object.userData.paintedMaterials)object.userData.paintedMaterials=object.userData.paintedMaterials.map(clone);
      });
    }
    function update(camera,lights) {
      viewToWorld.copy(camera.matrixWorld);let changed=false;
      for(let slot=0;slot<slots;slot++){
        const light=lights[slot];if(light)light.getWorldPosition(position);else position.set(999,999,999);
        origins[slot].copy(position);
        // Torch flames jitter inside their fixture; retain its static room mask
        // while uniforms still identify the actual displaced point-light source.
        const anchor=light?.userData.hqBarrierOrigin||position;
        const key=light?.intensity>0?Math.round(anchor.x*64)+':'+Math.round(anchor.z*64)+':'+light.distance:'off';
        if(keys[slot]===key)continue;keys[slot]=key;changed=true;
        if(key==='off')pixels.fill(0,slot*width*height,(slot+1)*width*height);else bake(slot,anchor.x,anchor.z,light.distance||5);
      }if(changed)texture.needsUpdate=true;
    }
    return Object.freeze({setProjection,bind,update});
  };
})();

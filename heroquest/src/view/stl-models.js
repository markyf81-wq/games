(function () {
  "use strict";
  const HQ=window.HeroQuest,T=window.HQThree;
  if(!HQ||!T)return;
  const geometries=new Map(),surfaces=new Map();
  const definitions=Object.freeze({
    "wall-one":{asset:"wall-one",width:1,rotation:0,colour:0xffffff},
    "wall-two":{asset:"wall-two",width:2,rotation:0,colour:0xffffff},
    "wall-join":{asset:"wall-join",width:.11,rotation:0,colour:0xffffff},
    "combat-die":{asset:"combat-die",width:1.5,rotation:0,colour:0xf0e7d2},
    "movement-die-body":{asset:"movement-die-body",width:1.5,rotation:0,colour:0xba1827,roughness:.3,metalness:.04},
    barbarian:{asset:"barbarian",baseWidth:.82,rotation:Math.PI/2,colour:0x9b2924},
    dwarf:{asset:"dwarf",baseWidth:.82,rotation:-Math.PI/2,colour:0x9e4134},
    elf:{asset:"elf",baseWidth:.82,rotation:Math.PI/2,colour:0xa74b3b},
    wizard:{asset:"wizard",baseWidth:.82,rotation:Math.PI/2,colour:0x8c3c39},
    goblin:{asset:"goblin-sword",baseWidth:.78,rotation:Math.PI,colour:0x5b7c43},
    skeleton:{asset:"skeleton",baseWidth:.8,rotation:-Math.PI/2,colour:0xc7c2a8},
    zombie:{asset:"zombie",baseWidth:.8,rotation:0,colour:0x9ca388},
    mummy:{asset:"mummy",baseWidth:.8,rotation:Math.PI/2,colour:0xc4baa0},
    fimir:{asset:"fimir",baseWidth:.82,rotation:0,colour:0x617d49},
    "chaos-warrior":{asset:"chaos-warrior",baseWidth:.82,rotation:0,colour:0x5e6564},
    gargoyle:{asset:"gargoyle",baseWidth:.82,rotation:Math.PI/2,colour:0x6f7470},
    "open-door":{asset:"open-door",width:1.23,rotation:0,colour:0x8b8777},
    "alchemists-bench":{asset:"alchemists-bench",width:2.86,rotation:0,colour:0x695240},
    "torture-rack":{asset:"torture-rack",width:2.86,rotation:0,colour:0x664630},
    "sorcerers-table":{asset:"sorcerers-table",width:2.86,rotation:0,colour:0x745444},
    "weapons-rack":{asset:"weapons-rack",width:2.86,rotation:Math.PI,colour:0x765438},
    bookcase:{asset:"bookcase",width:2.86,rotation:0,colour:0x623729},
    cupboard:{asset:"cupboard",width:2.86,rotation:0,colour:0x704530},
    fireplace:{asset:"fireplace",width:2.86,rotation:0,colour:0x817966},
    chest:{asset:"chest",width:.88,rotation:0,colour:0x795234},
    throne:{asset:"throne",width:.88,rotation:0,colour:0x805b40},
    tomb:{asset:"tomb-bottom",parts:["tomb-top"],width:2.86,rotation:Math.PI/2,colour:0x8e9289},
    blocked:{asset:"blocked-1x1",width:.99,rotation:0,colour:0x636d60},
    orc:{asset:"orc-cleaver",baseWidth:.82,rotation:Math.PI,colour:0x436940},
    table:{asset:"table",width:2.86,rotation:Math.PI/2,colour:0x75482e},
    door:{asset:"closed-door",width:1.23,rotation:0,colour:0x8b8777}
  });
  const miniatureAssets=new Set(Object.values(definitions).filter(definition=>definition.baseWidth).map(definition=>definition.asset));
  const baseColour=0x35383b;
  function buffer(encoded) {
    const binary=atob(encoded),bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    return new DataView(bytes.buffer);
  }
  function paintFor(asset) {
    if(asset.faceMaterials&&asset.materials)return asset;
    if(!["barbarian","combat-die"].includes(asset.id))return null;
    const paint=asset.id==="barbarian"?HQ.barbarianPaint:HQ.combatDiePaint;
    if(!paint)throw new Error("Missing colour asset for "+asset.id+".");
    if(paint.geometrySha256!==asset.geometrySha256||paint.vertices!==asset.vertices||paint.triangles!==asset.triangles)
      throw new Error("The "+asset.id+" colours and mesh versions do not match. Regenerate the colours after changing its mesh.");
    return paint;
  }
  function geometry(asset) {
    if(geometries.has(asset.id))return geometries.get(asset.id);
    const paint=paintFor(asset),surface=paint?.geometry||asset;
    const packed=buffer(surface.positions),normalData=buffer(surface.normals),indexData=buffer(surface.indices);
    const count=surface.vertices,positions=new Float32Array(count*3),normals=new Float32Array(count*3);
    for(let i=0;i<count*3;i++) {
      positions[i]=packed.getUint16(i*2,true)/65535*surface.extent[i%3]+surface.minimum[i%3];
      normals[i]=normalData.getInt16(i*2,true)/32767;
    }
    const indices=surface.indexBytes===2?new Uint16Array(surface.triangles*3):new Uint32Array(surface.triangles*3);
    for(let i=0;i<indices.length;i++)indices[i]=surface.indexBytes===2?indexData.getUint16(i*2,true):indexData.getUint32(i*4,true);
    const result=new T.BufferGeometry();
    result.setAttribute("position",new T.BufferAttribute(positions,3));
    result.setAttribute("normal",new T.BufferAttribute(normals,3));
    if(surface.uvs) {
      const data=buffer(surface.uvs),uvs=new Float32Array(count*2);
      if(data.byteLength!==uvs.byteLength)throw new Error("Incomplete surface UVs for "+asset.id+".");
      for(let i=0;i<uvs.length;i++)uvs[i]=data.getFloat32(i*4,true);
      result.setAttribute("uv",new T.BufferAttribute(uvs,2));
    }
    if(asset.colours) {
      const data=buffer(asset.colours),colours=new Float32Array(count*3),colour=new T.Color();
      if(data.byteLength!==count*3)throw new Error("Incomplete vertex colours for "+asset.id+".");
      for(let i=0;i<count;i++){colour.setRGB(data.getUint8(i*3)/255,data.getUint8(i*3+1)/255,data.getUint8(i*3+2)/255,T.SRGBColorSpace);colours.set(colour.toArray(),i*3);}
      result.setAttribute("color",new T.BufferAttribute(colours,3));
    }
    if(paint) {
      const labels=buffer(paint.faceMaterials);
      if(labels.byteLength!==surface.triangles)
        throw new Error("The "+asset.id+" colour data is incomplete.");
      // Batch by material rather than adding a draw call for every paint patch.
      const sorted=new indices.constructor(indices.length);let cursor=0;
      for(let m=0;m<paint.materials.length;m++) {
        const start=cursor;
        for(let f=0;f<surface.triangles;f++)if(labels.getUint8(f)===m)
          for(let j=0;j<3;j++)sorted[cursor++]=indices[f*3+j];
        if(cursor>start)result.addGroup(start,cursor-start,m);
      }
      if(cursor!==indices.length)throw new Error("The "+asset.id+" colours contain an unknown material.");
      result.setIndex(new T.BufferAttribute(sorted,1));
    } else if(miniatureAssets.has(asset.id)) {
      // Every supplied hero/monster uses the same two-unit replacement base.
      // Separate its complete top and rim from the sculpt's coloured material.
      const sorted=new indices.constructor(indices.length),baseFaces=[];let cursor=0;
      for(let f=0;f<surface.triangles;f++) {
        const start=f*3;
        if([0,1,2].every(j=>positions[indices[start+j]*3+1]<=2.025))baseFaces.push(start);
        else for(let j=0;j<3;j++)sorted[cursor++]=indices[start+j];
      }
      result.addGroup(0,cursor,0);const baseStart=cursor;
      for(const start of baseFaces)for(let j=0;j<3;j++)sorted[cursor++]=indices[start+j];
      if(cursor>baseStart)result.addGroup(baseStart,cursor-baseStart,1);
      result.setIndex(new T.BufferAttribute(sorted,1));
    } else result.setIndex(new T.BufferAttribute(indices,1));
    result.computeBoundingBox();result.computeBoundingSphere();
    geometries.set(asset.id,result);return result;
  }
  function material(definition,asset) {
    if(!surfaces.has(definition.asset)) {
      const paint=paintFor(asset);
      const materials=paint
        ? paint.materials.map(surface=>surface.finish?HQ.furnitureSurfaces.make(surface):new T.MeshStandardMaterial({
          name:surface.name,color:surface.colour,roughness:surface.roughness,
          metalness:surface.metalness
        }))
        : new T.MeshStandardMaterial({color:definition.colour,roughness:definition.roughness??.86,metalness:definition.metalness??0,vertexColors:Boolean(asset.colours)});
      surfaces.set(definition.asset,!paint&&definition.baseWidth
        ? [materials,new T.MeshStandardMaterial({name:"base",color:baseColour,roughness:.88})]
        : materials);
    }
    return surfaces.get(definition.asset);
  }
  HQ.stlModels=Object.freeze({make(kind,options={}) {
    const definition=definitions[kind];
    if(!definition)throw new Error("No miniature is configured for "+kind+".");
    const asset=HQ.stlAssets?.[definition.asset];
    if(!asset)throw new Error("Missing local miniature asset: "+definition.asset+". Keep assets/models/imported with this page.");
    const group=new T.Group(),sculpt=new T.Group();group.add(sculpt);sculpt.rotation.y=definition.rotation;
    const model=new T.Mesh(geometry(asset),material(definition,asset));
    model.castShadow=true;model.receiveShadow=true;sculpt.add(model);
    // Parts whose source coordinates already share an assembly frame (the tomb)
    // retain their original relative origins after the importer's recentering.
    for(const id of definition.parts||[]) {
      const part=HQ.stlAssets[id];if(!part)throw new Error("Missing compound-model part: "+id);
      const child=new T.Mesh(geometry(part),material(definition,asset));
      const centre=a=>[(a.sourceBaseBounds.min[0]+a.sourceBaseBounds.max[0])/2,(a.sourceBaseBounds.min[1]+a.sourceBaseBounds.max[1])/2];
      const a=centre(asset),b=centre(part);
      child.position.set(b[0]-a[0],part.sourceBounds.min[2]-asset.sourceBounds.min[2],a[1]-b[1]);
      child.castShadow=true;child.receiveShadow=true;sculpt.add(child);
    }
    // Scale uniformly. Base fitting never changes source body proportions, and
    // decorative overhang does not change authoritative grid footprints.
    const rotatedSize=new T.Box3().setFromObject(sculpt).getSize(new T.Vector3());
    const scale=options.width&&options.depth
      ? Math.min((options.width-.12)/rotatedSize.x,(options.depth-.12)/rotatedSize.z)
      : definition.baseWidth
      ? definition.baseWidth/Math.max(...asset.sourceBaseBounds.size.slice(0,2))
      : definition.width/rotatedSize.x;
    group.scale.setScalar(scale);
    group.name=kind+" · supplied miniature";
    if(Array.isArray(model.material))group.userData.paintedMaterials=model.material;
    group.userData.modelSource=asset.sourceFile;
    group.userData.modelTriangles=paintFor(asset)?.geometry?.triangles??asset.triangles;
    return group;
  }});
})();

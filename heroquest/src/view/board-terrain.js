(function () {
  "use strict";
  const HQ=window.HeroQuest,T=window.HQThree,Topo=HQ.topology;
  // Discovered floors and grid strips change only when discovery changes.
  HQ.createBoardTerrain=function({scene,renderer,world}) {
    const tile=new T.BoxGeometry(.985,.15,.985),texture=HQ.createFloorTexture();
    texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
    const material=HQ.floorMaterial(texture),colours=[];
    for(let i=0;i<tile.attributes.normal.count;i++){const shade=tile.attributes.normal.getY(i)>.5?1:.3;colours.push(shade,shade,shade);}
    tile.setAttribute("color",new T.Float32BufferAttribute(colours,3));tile.clearGroups();
    const regions=new Map(),dummy=new T.Object3D(),floors=[],slots=new Map();let known=new Set(),hole=null;
    for(const id of HQ.trial.floor){const region=Topo.regions.get(id);if(!regions.has(region))regions.set(region,[]);regions.get(region).push(id);}
    for(const cells of regions.values()) {
      const geometry=tile.clone();geometry.setAttribute("floorUvOffset",new T.InstancedBufferAttribute(new Float32Array(cells.flatMap(id=>{const [x,row]=Topo.parse(id);return [x,18-row];})),2));
      const mesh=new T.InstancedMesh(geometry,material,cells.length);mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.userData.cells=cells;
      cells.forEach((id,i)=>{slots.set(id,{mesh,index:i});dummy.position.set(0,0,0);dummy.scale.setScalar(0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,new T.Color(0xffffff));});
      mesh.instanceMatrix.needsUpdate=true;scene.add(mesh);floors.push(mesh);
    }
    tile.dispose();
    const gridMaterial=new T.MeshStandardMaterial({color:0xb4b9a4,roughness:1,metalness:0,transparent:true,opacity:.68,depthWrite:false});
    const empty=new T.BufferGeometry();empty.setAttribute("position",new T.Float32BufferAttribute([],3));
    const grid=new T.Mesh(empty,gridMaterial);grid.receiveShadow=true;scene.add(grid);
    let discoveryKey=null;
    function reveal(cells) {
      const key=cells.join("|");if(key===discoveryKey)return false;discoveryKey=key;
      known=new Set(cells);
      for(const mesh of floors){mesh.userData.cells.forEach((id,i)=>{dummy.position.copy(world(id));dummy.scale.setScalar(known.has(id)&&id!==hole?1:0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();}
      const positions=[],edges=new Set();
      for(const id of known) {
        const [x,row]=Topo.parse(id),left=x-13,top=row-9.5;
        for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]) {
          const other=Topo.key(x+dx,row+dy);
          const edge=Topo.edgeKey(id,other);if(edges.has(edge))continue;edges.add(edge);
          const a=dx?[left+(dx>0?1:0),top]:[left,top+(dy>0?1:0)],b=dx?[a[0],top+1]:[left+1,a[1]],sx=-(b[1]-a[1])*.012,sz=(b[0]-a[0])*.012;
          const corners=[[a[0]+sx,a[1]+sz],[a[0]-sx,a[1]-sz],[b[0]+sx,b[1]+sz],[b[0]-sx,b[1]-sz]];
          const height=Topo.stairs.has(id)&&Topo.stairs.has(other)?.205:.154;
          for(const index of [0,2,1,2,3,1])positions.push(corners[index][0],height,corners[index][1]);
        }
      }
      const geometry=new T.BufferGeometry();geometry.setAttribute("position",new T.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();
      grid.geometry.dispose();grid.geometry=geometry;return true;
    }
    function setHole(id) {
      if(id===hole)return;
      const previous=hole;hole=id;
      for(const key of [previous,hole]) {
        const slot=slots.get(key);if(!slot)continue;
        dummy.position.copy(world(key));dummy.scale.setScalar(known.has(key)&&key!==hole?1:0);dummy.updateMatrix();
        slot.mesh.setMatrixAt(slot.index,dummy.matrix);slot.mesh.instanceMatrix.needsUpdate=true;
        // Include a restored instance even if discovery was rebuilt mid-effect.
        slot.mesh.boundingSphere=null;
      }
      renderer.shadowMap.needsUpdate=true;
    }
    return Object.freeze({floors,reveal,setHole,setGrid(enabled){grid.visible=enabled;}});
  };
})();

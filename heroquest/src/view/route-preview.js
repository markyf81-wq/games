(function () {
  "use strict";
  const HQ=window.HeroQuest,T=window.HQThree;
  HQ.createRoutePreview=function({scene,world,requestRender}){
    const root=new T.Group();root.renderOrder=1000;scene.add(root);
    const capacity=HQ.board.columns*HQ.board.rows;
    const materials=[0x85d1ff,0xffc75e].map(color=>new T.MeshBasicMaterial({color,transparent:true,opacity:.95,depthTest:false,depthWrite:false}));
    // One fixed buffer per route colour and one endpoint; hovering only updates
    // coordinates/draw ranges, never allocates and disposes GPU geometry.
    const strips=materials.map(material=>{
      const geometry=new T.BufferGeometry(),positions=new T.BufferAttribute(new Float32Array(capacity*18),3);
      positions.setUsage(T.DynamicDrawUsage);geometry.setAttribute("position",positions);geometry.setDrawRange(0,0);
      const mesh=new T.Mesh(geometry,material);mesh.renderOrder=1000;mesh.frustumCulled=false;mesh.visible=false;root.add(mesh);
      return {mesh,positions};
    });
    const end=new T.Mesh(new T.CircleGeometry(.09,20),materials[0]);
    end.rotation.x=-Math.PI/2;end.renderOrder=1000;end.visible=false;root.add(end);
    const triangleCorners=[0,1,2,2,1,3];
    function set(route){
      for(const strip of strips)strip.mesh.visible=false;end.visible=false;
      if(!route?.cells.length){requestRender();return;}
      const points=route.cells.map(id=>world(id,HQ.topology.stairs.has(id)?.45:.215)),counts=[0,0];
      for(let i=1;i<points.length&&i<=capacity;i++){
        const a=points[i-1],b=points[i],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);
        const scale=length ? .032/length : 0,sx=dz*scale,sz=-dx*scale,colour=i<=route.reachableSteps?0:1;
        const positions=strips[colour].positions.array;
        for(const corner of triangleCorners){
          const point=corner<2?a:b,sign=corner%2===0?1:-1,offset=counts[colour]++*3;
          positions[offset]=point.x+sign*sx;positions[offset+1]=point.y;positions[offset+2]=point.z+sign*sz;
        }
      }
      strips.forEach((strip,i)=>{
        strip.mesh.visible=counts[i]>0;strip.mesh.geometry.setDrawRange(0,counts[i]);strip.positions.needsUpdate=true;
      });
      end.material=materials[route.reachableSteps===points.length-1?0:1];end.position.copy(points.at(-1));end.visible=true;requestRender();
    }
    return Object.freeze({set});
  };
})();

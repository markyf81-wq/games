(function () {
  "use strict";
  const HQ=window.HeroQuest,T=window.HQThree,Topo=HQ.topology;
  // Whole-tile sight uses the same centre-to-centre query as targeting.
  // Only public projection data enters this cosmetic, noninteractive layer.
  HQ.createSightOverlay=function({scene,world}) {
    const material=new T.MeshBasicMaterial({color:0x77cfff,transparent:true,opacity:.25,
      depthTest:true,depthWrite:false,side:T.DoubleSide,toneMapped:false});
    const mesh=new T.InstancedMesh(new T.PlaneGeometry(.985,.985).rotateX(-Math.PI/2),material,HQ.quests.current.floor.length);
    mesh.name="Hero line of sight";mesh.visible=false;mesh.count=0;mesh.frustumCulled=false;
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);mesh.renderOrder=20;mesh.raycast=()=>{};mesh.userData.visualEffect=true;scene.add(mesh);
    const pose=new T.Object3D();
    let enabled=false,displayed=true,current=null,maskKey=null,valid=false;
    function visibility(){mesh.visible=enabled&&displayed&&valid;}
    function refresh() {
      const hero=current?.activeHero;
      valid=Boolean(hero&&current.phase==="hero-turn"&&hero.body>0&&!hero.exit);
      if(!enabled||!valid){visibility();return;}
      const known=new Set(current.discoveredCells),blocked=new Set(current.blocked||[]),origin=Topo.key(hero.x,hero.row);
      valid=known.has(origin)&&!blocked.has(origin);
      if(!valid){visibility();return;}
      const key=current.discoveredCells.join("|")+";"+[...blocked].join("|")+";"+hero.id+":"+origin+";"+
        current.doors.map(door=>door.id+":"+door.open).join("|")+";"+
        [...current.heroes,...current.monsters].map(unit=>unit.id+":"+unit.x+","+unit.row+":"+unit.body+":"+unit.exit).join("|")+";"+
        (current.traps||[]).map(trap=>trap.id+":"+trap.status).join("|");
      if(key!==maskKey){
        maskKey=key;
        const sightState={heroes:current.heroes,monsters:current.monsters,
          openDoors:current.doors.filter(door=>door.open).map(door=>door.id),
          dungeon:{layout:current.dungeonLayout||"trial",traps:Object.fromEntries((current.traps||[]).map(trap=>[trap.id,trap]))}};
        const pits=new Set((current.traps||[]).filter(trap=>trap.kind==="pit"&&trap.status==="sprung").map(trap=>trap.cell));
        let count=0;
        for(const id of known){
          if(blocked.has(id)||!Topo.canSee(sightState,origin,id,true))continue;
          const height=Topo.stairs.has(id)?.216:pits.has(id)?-.084:.166;
          pose.position.copy(world(id,height));pose.updateMatrix();mesh.setMatrixAt(count++,pose.matrix);
        }
        mesh.count=count;mesh.instanceMatrix.needsUpdate=true;
      }
      visibility();
    }
    return Object.freeze({
      get enabled(){return enabled;},
      setProjection(projection){current=projection;refresh();},
      setEnabled(value){enabled=Boolean(value);refresh();},
      setVisible(value){displayed=Boolean(value);visibility();}
    });
  };
})();

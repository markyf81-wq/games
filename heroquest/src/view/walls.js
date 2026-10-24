(function () {
  "use strict";
  const HQ=window.HeroQuest,T=window.HQThree,Topo=HQ.topology;
  const modes=Object.freeze(["full","cutaway","low"]),labels={full:"Full walls",cutaway:"Automatic cutaway",low:"Low walls"};
  const floorHeight=.15,lowHeight=.27;
  function wallHash(key){
    let value=2166136261;for(const character of HQ.quests.current.id+":"+key)value=Math.imul(value^character.charCodeAt(0),16777619);
    value=Math.imul(value^(value>>>16),0x7feb352d);value=Math.imul(value^(value>>>15),0x846ca68b);return (value^(value>>>16))>>>0;
  }
  function stoneAttributes(geometry) {
    if(geometry.getAttribute("wallStoneId"))return;
    // Raised stone faces are separate islands above the recessed mortar. Weld
    // normal-crease duplicates for this lookup; keep the shared mesh untouched.
    const positions=geometry.getAttribute("position"),indices=geometry.index.array,lookup=new Map(),welded=new Int32Array(positions.count),points=[];
    for(let i=0;i<positions.count;i++) {
      const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i),key=x+":"+y+":"+z;
      if(!lookup.has(key)){lookup.set(key,points.length);points.push({z,parent:points.length});}welded[i]=lookup.get(key);
    }
    const root=i=>{while(points[i].parent!==i){points[i].parent=points[points[i].parent].parent;i=points[i].parent;}return i;};
    const join=(a,b)=>{a=welded[a];b=welded[b];if(Math.abs(points[a].z)>.03&&Math.abs(points[b].z)>.03&&points[a].z*points[b].z>0)points[root(a)].parent=root(b);};
    for(let i=0;i<indices.length;i+=3){join(indices[i],indices[i+1]);join(indices[i+1],indices[i+2]);join(indices[i+2],indices[i]);}
    const ids=new Float32Array(positions.count),mix=new Float32Array(positions.count);
    for(let i=0;i<positions.count;i++){ids[i]=root(welded[i]);mix[i]=T.MathUtils.smoothstep(Math.abs(positions.getZ(i)),.03,.047);}
    geometry.setAttribute("wallStoneId",new T.BufferAttribute(ids,1));geometry.setAttribute("wallStoneMix",new T.BufferAttribute(mix,1));
  }
  function colourStones(material,seed) {
    material.onBeforeCompile=shader=>{
      shader.uniforms.wallPaletteSeed={value:seed%8192};
      shader.vertexShader="attribute float wallStoneId; attribute float wallStoneMix; uniform float wallPaletteSeed;\n"+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace("#include <color_vertex>",`#include <color_vertex>
        float stoneRandom=fract(sin(wallStoneId*127.1+wallPaletteSeed*311.7)*43758.5453);
        float stoneShade=.995+fract(sin(wallStoneId*73.9+wallPaletteSeed*17.3)*19642.349)*.01;
        float stoneWarmth=(stoneRandom-.5)*.008;
        vec3 stoneTone=vec3(.76+stoneWarmth,.79,.85-stoneWarmth);
        // Flatten baked face-colour noise; retain the recessed mortar and sculpt lighting.
        vColor.rgb=mix(vColor.rgb,vec3(.371,.332,.258)*stoneTone*stoneShade,wallStoneMix)*.74;
      `);
    };
    material.customProgramCacheKey=()=>"heroquest-wall-stone-palette-v4";
  }
  HQ.createDungeonWalls=function () {
    const records=new Map(),secretRoots=new Map(),secretSections=new Map(),capGeometry=new T.BoxGeometry(1,.025,.15),blockedCapGeometry=new T.BoxGeometry(.99,.025,.99),footingGeometry=new T.BoxGeometry(1,.02,.28),coreGeometry=new T.BoxGeometry(1,1,1);
    const footingMaterial=HQ.models.material(0x535044,.98).clone();
    const capMaterial=HQ.models.material(0x7e796e,.94).clone(),nearPoint=new T.Vector3(),hit=new T.Vector3(),frustum=new T.Frustum(),viewProjection=new T.Matrix4(),rayPool=[];
    // Cast from the actual stone surface. The default back-face shadow pass
    // lets narrow relief edges escape their own shadow and flash like seams.
    footingMaterial.shadowSide=capMaterial.shadowSide=T.FrontSide;
    let mode="cutaway",lastTime=null,animate=false,exploredTargets=[],protectedCells=new Set(),layoutKey=null,layoutItems=null;
    let secretMarkMaterial=null;
    function addBlockedCore(model,plane,height){
      // Blocked-square scenery retains an internal plug to keep the rubble solid.
      const material=new T.MeshBasicMaterial({color:0x24221f,side:T.DoubleSide,shadowSide:T.FrontSide,clippingPlanes:[plane],clipShadows:true});
      const core=new T.Mesh(coreGeometry,material),coreHeight=Math.max(.01,height-.12);
      core.name="Solid blocked-square core";core.scale.set(.82,coreHeight,.82);core.position.y=coreHeight/2;
      core.castShadow=true;core.raycast=()=>{};model.add(core);
    }
    function itemsFor(projection,hero=projection.activeHero) {
      const known=new Set(projection.discoveredCells),blocked=new Set(HQ.quests.current.blocked),solid=new Set(projection.blocked||HQ.quests.current.blocked);
      // Fallen blocks add independent scenery. Keep the original masonry
      // partition so springing a trap cannot remove or regroup adjacent walls.
      // Keep concealed stone in the same masonry partition before/after a search.
      // Only discovered doors become interactive; reserved slots render as walls.
      const secrets=HQ.dungeonData.layouts[projection.dungeonLayout||"trial"].doors;
      const secretEdges=new Map(secrets.map(door=>[Topo.edgeKey(...Topo.endpoints(door)),door]));
      const foundSecrets=new Set(projection.doors.filter(door=>door.secret).map(door=>door.id));
      const doors=new Set(projection.doors.filter(door=>!door.secret).map(door=>Topo.edgeKey(...Topo.endpoints(door))));
      const heroCell=hero&&Topo.key(hero.x,hero.row),region=heroCell&&Topo.regions.get(heroCell),inRoom=region&&region!=="corridor";
      protectedCells=new Set(heroCell&&known.has(heroCell)?inRoom?[...known].filter(id=>Topo.regions.get(id)===region&&!solid.has(id)):[heroCell]:[]);
      // Only the current hero's room needs its floor opened up. A corridor
      // protects the hero point below, rather than every explored corridor tile.
      exploredTargets=inRoom?[...protectedCells].map(id=>{const [x,row]=Topo.parse(id);return new T.Vector3(x+.5-13,floorHeight+.03,row+.5-9.5);}):[];
      const key=(projection.dungeonLayout||"trial")+";"+projection.discoveredCells.join("|")+";"+projection.doors.map(door=>door.id).join("|")+";"+[...blocked].join("|");
      if(layoutKey===key)return layoutItems;
      const edges=new Map(),runs=new Map();
      for(const id of known) {
        // Revealed rubble supplies the corridor stop; do not back it with a
        // redundant tall wall. Rules already block entry and sight through it.
        if(blocked.has(id))continue;
        const [x,row]=Topo.parse(id);
        for(const [dx,dy] of [[0,-1],[1,0],[0,1],[-1,0]]) {
          const other=Topo.key(x+dx,row+dy),edge=Topo.edgeKey(id,other);
          // Only known boundaries: no unseen door or hidden-room metadata leaks.
          if(edges.has(edge)||doors.has(edge)||(known.has(other)&&blocked.has(other))||(Topo.floor.has(other)&&Topo.regions.get(id)===Topo.regions.get(other)))continue;
          const axis=dx?"v":"h",line=dx?x+(dx>0?1:0):row+(dy>0?1:0),start=dx?row:x;
          const cells=[id,...(known.has(other)?[other]:[])];
          const negative=axis==="h"?Topo.key(start,line-1):Topo.key(line-1,start),positive=axis==="h"?Topo.key(start,line):Topo.key(line,start);
          const sides=[negative,positive].map(cell=>known.has(cell)?Topo.regions.get(cell):"unexplored").join("|");
          edges.set(edge,{axis,line,start,cells,sides,secret:secretEdges.get(edge)});
        }
      }
      for(const edge of edges.values()) {
        const key=edge.axis+":"+edge.line;
        if(!runs.has(key))runs.set(key,[]);
        runs.get(key).push(edge);
      }
      const items=[];
      for(const edges of runs.values()) {
        edges.sort((a,b)=>a.start-b.start);
        let group=null,previous=null;
        for(const edge of edges) {
          if(!group||edge.start!==previous+1||edge.sides!==group.sides)group={id:edge.axis+":"+edge.line+":"+edge.start,sides:edge.sides};
          edge.cutawayGroup=group;previous=edge.start;
        }
        for(let i=0;i<edges.length;i++) {
          const first=edges[i],next=edges[i+1];
          const length=!first.secret&&!next?.secret&&next?.start===first.start+1&&next.cutawayGroup===first.cutawayGroup&&(wallHash(first.axis+":"+first.line+":"+first.start)&3)!==0?2:1;
          const cells=[...new Set([...first.cells,...(length===2?next.cells:[])])];
          const x=first.axis==="h"?first.start:first.line,row=first.axis==="v"?first.start:first.line;
          const item={id:"wall-"+first.axis+"-"+x+"-"+row+"-"+length,kind:"wall",name:"Stone wall",axis:first.axis,x,row,length,cells,cutawayGroup:first.cutawayGroup.id,secretId:first.secret?.id};
          if(records.has(item.id))records.get(item.id).item=item;
          items.push(item);
          if(length===2)i++;
        }
      }
      // A sculpt's bounding endpoint is only its outermost stone. Close the
      // recessed profile at actual section/corner/T joins with a narrow post.
      // Include midpoints so a perpendicular section can meet a two-space wall.
      const nodes=new Map();
      for(const item of items)for(let offset=0;offset<=item.length;offset++) {
        const x=item.x+(item.axis==="h"?offset:0),row=item.row+(item.axis==="v"?offset:0),key=Topo.key(x,row);
        if(!nodes.has(key))nodes.set(key,[]);
        nodes.get(key).push({item,offset});
      }
      for(const item of items)item.joints=[];
      for(const [key,connections] of nodes)if(connections.length>1) {
        const owner=connections.slice().sort((a,b)=>a.item.id.localeCompare(b.item.id))[0];
        owner.item.joints.push({key,offset:owner.offset-owner.item.length/2,walls:connections.map(c=>c.item.id)});
      }
      const replacements=new Map(items.filter(item=>item.secretId&&foundSecrets.has(item.secretId)).map(item=>[item.id,item.secretId]));
      for(const item of items){
        // Keep join ownership/position stable; only its active neighbour ID changes.
        for(const joint of item.joints)joint.walls=joint.walls.map(id=>replacements.get(id)||id);
        if(item.secretId)secretSections.set(item.secretId,{...item,id:item.secretId,appearanceId:item.id});
        if(records.has(item.id))syncJoints(records.get(item.id),item);
        if(item.secretId&&records.has(item.secretId)){
          records.get(item.secretId).item=secretSections.get(item.secretId);
          syncJoints(records.get(item.secretId),secretSections.get(item.secretId));
        }
      }
      layoutKey=key;layoutItems=items.filter(item=>!item.secretId||!foundSecrets.has(item.secretId));return layoutItems;
    }
    function syncJoints(record,item) {
      const wanted=new Set(item.joints.map(j=>j.key));
      for(const [key,mesh] of record.joints)if(!wanted.has(key)){record.model.remove(mesh);mesh.traverse(part=>{if(part.material)part.material.dispose();});record.joints.delete(key);}
      for(const joint of item.joints) {
        let mesh=record.joints.get(joint.key);
        if(!mesh){
          mesh=HQ.models.make("wall-join");
          const plane=new T.Plane(new T.Vector3(0,-1,0),10);mesh.userData.jointPlane=plane;
          mesh.traverse(part=>{
            if(!part.isMesh)return;
            part.material=part.material.clone();part.material.clippingPlanes=[plane];part.material.clipShadows=true;part.material.shadowSide=T.FrontSide;
            stoneAttributes(part.geometry);colourStones(part.material,wallHash("join:"+joint.key));
          });
          record.model.add(mesh);record.joints.set(joint.key,mesh);
        }
        mesh.position.x=item.axis==="v"?-joint.offset:joint.offset;mesh.userData.wallJoint=joint;
      }
    }
    function make(item) {
      if(records.has(item.id))return records.get(item.id).model;
      const model=HQ.models.make(item.length===2?"wall-two":"wall-one"),plane=new T.Plane(new T.Vector3(0,-1,0),10),seed=wallHash(item.appearanceId||item.id);
      // Transform only the sculpt: joins/caps retain their exact grid frame.
      // Mirroring and turning expose four versions of the original stonework.
      const sculpt=model.children[0];sculpt.rotation.y=(seed&1)?Math.PI:0;sculpt.scale.x=(seed&2)?-1:1;
      const warmth=((seed>>>12)&255)/255,shade=.985+((seed>>>20)&255)/255*.01;
      let height=0;
      model.traverse(mesh=>{
        if(!mesh.isMesh)return;
        mesh.material=mesh.material.clone();mesh.material.clippingPlanes=[plane];mesh.material.clipShadows=true;mesh.material.shadowSide=T.FrontSide;
        mesh.material.color.setRGB(shade,shade*(.998+warmth*.002),shade*(.994+warmth*.004));
        stoneAttributes(mesh.geometry);colourStones(mesh.material,seed);
        height=Math.max(height,mesh.geometry.boundingBox.max.y*model.scale.y);
      });
      // A stone section face closes the visual cut; the sculpt is clipped,
      // never compressed vertically. Full-height jagged tops retain their shape.
      const cap=new T.Mesh(capGeometry,capMaterial);cap.scale.x=item.length;cap.visible=false;cap.castShadow=true;cap.receiveShadow=true;model.add(cap);
      // Cover pale printed wall lines in the floor scan at the sculpt's feet.
      // Scenery only: retain known wall lengths and actual door openings.
      const footing=new T.Mesh(footingGeometry,footingMaterial);footing.scale.x=item.length;
      footing.position.y=.005;footing.receiveShadow=true;model.add(footing);
      const current=mode==="full"?height:lowHeight;
      const record={model,plane,cap,height,current,item,joints:new Map(),worldBounds:new T.Box3()};
      records.set(item.id,record);syncJoints(record,item);return model;
    }
    function makeSecretBorder(panel,record){
      const border=new T.Group(),bounds=new T.Box3().setFromObject(panel),geometry=new T.PlaneGeometry(1,1);
      // These opaque markings must write depth so later stone draws cannot
      // paint over them. Foreground scenery still occludes them normally.
      const material=new T.MeshBasicMaterial({color:0xffffff,toneMapped:false});
      if(!secretMarkMaterial){
        const canvas=document.createElement("canvas");canvas.width=canvas.height=128;
        const context=canvas.getContext("2d");context.fillStyle="#fff";context.font="bold 104px Georgia,serif";context.textAlign="center";context.textBaseline="middle";context.fillText("?",64,68);
        const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;
        secretMarkMaterial=new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,toneMapped:false});
      }
      border.name="Secret door inset borders";border.userData.faces=[];
      for(const sign of [-1,1]){
        const face=new T.Group();face.position.z=sign<0?bounds.min.z-.004:bounds.max.z+.004;face.rotation.y=sign<0?Math.PI:0;
        for(let i=0;i<4;i++){
          const stroke=new T.Mesh(geometry,material);stroke.userData.visualEffect=true;stroke.raycast=()=>{};face.add(stroke);
        }
        const mark=new T.Mesh(geometry,secretMarkMaterial);mark.name="Secret door question mark";mark.userData.visualEffect=true;mark.raycast=()=>{};face.add(mark);
        border.add(face);border.userData.faces.push(face);
      }
      record.secretBorder=border;return border;
    }
    function fitSecretBorder(record){
      const border=record.secretBorder;if(!border?.visible)return;
      const width=.78,thickness=.02,bottom=.08,top=Math.max(bottom+.04,record.current-.08),height=top-bottom;
      for(const face of border.userData.faces){
        const [lower,upper,left,right,mark]=face.children;
        lower.position.set(0,bottom,0);lower.scale.set(width,thickness,1);
        upper.position.set(0,top,0);upper.scale.set(width,thickness,1);
        left.position.set(-width/2,(top+bottom)/2,0);left.scale.set(thickness,height+thickness,1);
        right.position.set(width/2,(top+bottom)/2,0);right.scale.set(thickness,height+thickness,1);
        const markSize=Math.min(.32,height*.66);mark.position.set(0,(top+bottom)/2,.001);mark.scale.set(markSize,markSize,1);
      }
    }
    function makeSecret(item){
      let root=secretRoots.get(item.id);
      if(!root){
        const section=secretSections.get(item.id)||{...item,length:1,cutawayGroup:item.id,joints:[]};
        root=new T.Group();const panel=make({...section,kind:"wall"});
        const previous=records.get(section.appearanceId),record=records.get(item.id);
        if(previous?.model.visible)record.current=previous.current;
        // Only searched-for doors reach this factory; hidden walls stay unchanged.
        panel.traverse(mesh=>{if(mesh.material?.isMeshStandardMaterial){
          // Caps/footings are otherwise shared by ordinary walls.
          if(mesh.material===capMaterial||mesh.material===footingMaterial)mesh.material=mesh.material.clone();
          mesh.material.color.multiplyScalar(.48);mesh.material.roughness=1;
        }});
        panel.name="Discovered secret stone panel";root.add(panel);
        root.userData.border=makeSecretBorder(panel,record);root.add(root.userData.border);
        root.userData.panel=panel;panel.position.x=item.open?1.02:0;secretRoots.set(item.id,root);
      }
      // Cached panels may retain their open position after a sandbox reset.
      // Closed doors appear shut immediately; only opening is animated.
      if(!item.open)root.userData.panel.position.x=0;
      root.userData.border.visible=!item.open;fitSecretBorder(records.get(item.id));
      root.userData.open=Boolean(item.open);root.userData.panel.visible=!item.open||root.userData.panel.position.x<1.02;return root;
    }
    function makeBlocked(item) {
      if(records.has(item.id))return records.get(item.id).model;
      const model=HQ.models.make("blocked"),height=model.userData.blockedHeight,plane=new T.Plane(new T.Vector3(0,-1,0),10),seed=wallHash(item.id);
      model.traverse(mesh=>{
        if(!mesh.isMesh)return;
        const clone=surface=>{const copy=surface.clone();copy.clippingPlanes=[plane];copy.clipShadows=true;copy.shadowSide=T.FrontSide;
          if(mesh.userData.blockedStone)colourStones(copy,seed);return copy;};
        if(mesh.userData.blockedStone)stoneAttributes(mesh.geometry);
        mesh.material=Array.isArray(mesh.material)?mesh.material.map(clone):clone(mesh.material);
      });
      addBlockedCore(model,plane,height);
      const surface=HQ.models.material(0xffffff,1).clone();surface.map=HQ.componentTextures.get("falling-block");
      const cap=new T.Mesh(blockedCapGeometry,surface);cap.visible=false;cap.castShadow=true;cap.receiveShadow=true;model.add(cap);
      // Permanent blocked passages and sprung traps share the printed rubble
      // artwork on the full-height top and the lowered cutaway cap.
      const face=new T.Mesh(new T.PlaneGeometry(.94,.94),surface);face.rotation.x=-Math.PI/2;face.position.y=height+.002;face.receiveShadow=true;model.add(face);model.userData.blockedArtwork=face;
      const current=mode==="full"?height:lowHeight,block={...item,cutawayGroup:item.id};
      records.set(item.id,{model,plane,cap,height,current,item:block,joints:new Map(),worldBounds:new T.Box3()});return model;
    }
    function update(camera,focus,time,steady=false,figures=[]) {
      const dt=lastTime===null?1/60:Math.min(.05,Math.max(0,(time-lastTime)/1000));lastTime=time;
      let changed=false;animate=false;
      for(const root of secretRoots.values())if(root.visible){
        const panel=root.userData.panel,wanted=root.userData.open?1.02:0,previous=panel.position.x;
        panel.position.x=steady?wanted:previous+(wanted-previous)*(1-Math.exp(-dt*2.5));
        if(Math.abs(wanted-panel.position.x)<.002)panel.position.x=wanted;else animate=true;
        if(previous!==panel.position.x)changed=true;
        panel.visible=!root.userData.open||panel.position.x!==1.02;
      }
      frustum.setFromProjectionMatrix(viewProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
      const roomFigures=figures.filter(point=>protectedCells.has(Topo.key(Math.floor(point.x+13),Math.floor(point.z+9.5))));
      const sightTargets=[...exploredTargets,...roomFigures,...(focus?[focus]:[])].filter(point=>frustum.containsPoint(point));
      let rayCount=0;
      if(mode==="cutaway")for(const point of sightTargets) {
        // A target's camera ray is identical for every wall in this frame.
        // Reuse the pool and unproject once per target, not once per wall.
        nearPoint.copy(point).project(camera);nearPoint.z=-1;nearPoint.unproject(camera);
        if(!rayPool[rayCount])rayPool[rayCount]={ray:new T.Ray(),distanceSq:0};
        const entry=rayPool[rayCount];entry.ray.origin.copy(point);entry.ray.direction.subVectors(nearPoint,point);
        entry.distanceSq=entry.ray.direction.lengthSq();if(entry.distanceSq<.000001)continue;
        entry.ray.direction.normalize();rayCount++;
      }
      const groups=new Map();
      for(const record of records.values())if(record.model.visible) {
        const id=record.item.cutawayGroup;
        if(!groups.has(id))groups.set(id,{records:[],cut:mode==="low"});
        groups.get(id).records.push(record);
      }
      for(const group of groups.values())if(mode==="cutaway") {
        // Only cut for an actual camera ray from explored floor/a shown figure.
        // Facing the camera alone is not evidence of anything being obscured.
        for(const record of group.records) {
          const wall=record.item,blocked=wall.kind==="blocked";
          const cx=blocked?wall.x+.5-13:wall.axis==="h"?wall.x+wall.length/2-13:wall.x-13,cz=blocked?wall.row+.5-9.5:wall.axis==="v"?wall.row+wall.length/2-9.5:wall.row-9.5;
          const halfX=blocked?.5:wall.axis==="h"?wall.length/2:.09,halfZ=blocked?.5:wall.axis==="v"?wall.length/2:.09;
          record.worldBounds.min.set(cx-halfX,floorHeight,cz-halfZ);
          record.worldBounds.max.set(cx+halfX,floorHeight+record.height,cz+halfZ);
          for(let i=0;i<rayCount;i++) {
            const {ray,distanceSq}=rayPool[i];
            if(ray.intersectBox(record.worldBounds,hit)!==null&&hit.distanceToSquared(ray.origin)<=distanceSq){group.cut=true;break;}
          }
          if(group.cut)break;
        }
      }
      for(const record of records.values()) {
        const {model,item,height,plane,cap}=record;if(!model.visible)continue;
        const cut=groups.get(item.cutawayGroup).cut;
        const wanted=cut?lowHeight:height,previous=record.current;
        record.current=steady?wanted:previous+(wanted-previous)*(1-Math.exp(-dt*15));
        if(Math.abs(wanted-record.current)<.003)record.current=wanted;else animate=true;
        if(Math.abs(previous-record.current)>.0001)changed=true;
        plane.constant=floorHeight+record.current;
        cap.position.y=record.current;cap.visible=record.current<height-.04;
        if(model.userData.blockedArtwork)model.userData.blockedArtwork.visible=!cap.visible;
        fitSecretBorder(record);
      }
      for(const record of records.values())if(record.model.visible)for(const mesh of record.joints.values()) {
        const neighbours=mesh.userData.wallJoint.walls.map(id=>records.get(id)).filter(r=>r?.model.visible);
        const jointHeight=Math.max(...neighbours.map(r=>r.current>=r.height-.04?r.height-.035:r.current+.0125));
        const plane=mesh.userData.jointPlane;
        if(Math.abs(plane.constant-floorHeight-jointHeight)>.0001)changed=true;
        plane.constant=floorHeight+jointHeight;
      }
      return changed;
    }
    function setMode(value) {
      if(!modes.includes(value))return;
      mode=value;
      const button=document.getElementById("wall-mode");
      if(button){button.dataset.mode=mode;button.setAttribute("aria-label","Walls: "+labels[mode]+". Click to change.");button.title=labels[mode]+" (click to change)";}
    }
    setMode(mode);
    return Object.freeze({itemsFor,make,makeSecret,makeBlocked,update,setMode,
      get mode(){return mode;},get animating(){return animate;},modes
    });
  };
})();

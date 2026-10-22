(function () {
  "use strict";
  const HQ=window.HeroQuest,T=window.HQThree,textures=new Map();

  // Small deterministic, authored finishes. These are not scans or photographs.
  // Geometry supplies the grain direction and individual book-spine UV frames.
  function texture(surface) {
    const strength=surface.grainStrength??1;
    const key=surface.finish==="wood"?"wood:"+strength:surface.finish+":"+surface.colour;
    if(textures.has(key))return textures.get(key);
    const canvas=document.createElement("canvas");canvas.width=128;canvas.height=256;
    const context=canvas.getContext("2d");
    if(surface.finish==="wood") {
      const pixels=context.createImageData(canvas.width,canvas.height);
      for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++) {
        const u=x/canvas.width,v=y/canvas.height;
        const wave=Math.sin(v*Math.PI*2)*.4+Math.sin(v*Math.PI*4)*.16;
        const grain=Math.sin((u*26+wave)*Math.PI*2)*4+Math.sin((u*61+wave)*Math.PI*2)*2;
        const value=244+grain*strength,index=(y*canvas.width+x)*4;
        pixels.data[index]=pixels.data[index+1]=pixels.data[index+2]=value;pixels.data[index+3]=255;
      }
      context.putImageData(pixels,0,0);
    } else if(surface.finish==="stone"||surface.finish==="cloth") {
      const pixels=context.createImageData(canvas.width,canvas.height);
      for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
        // Subtle grain/weave only; the sculpt supplies joints and quilting.
        const detail=surface.finish==="cloth"?((x%4<2?1:-1)+(y%4<2?1:-1))*1.5:
          Math.sin(x*12.9898+y*78.233)*Math.cos(x*3.17-y*9.41)*5;
        const value=247+detail,index=(y*canvas.width+x)*4;
        pixels.data[index]=pixels.data[index+1]=pixels.data[index+2]=value;pixels.data[index+3]=255;
      }
      context.putImageData(pixels,0,0);
    } else {
      context.fillStyle=surface.colour;context.fillRect(0,0,canvas.width,canvas.height);
      // Restrained gilt tooling, with no invented words or card artwork.
      context.strokeStyle="#ab8c52";context.lineWidth=2;
      for(const y of [31,36,219,224]){context.beginPath();context.moveTo(8,y);context.lineTo(120,y);context.stroke();}
      context.lineWidth=1;context.strokeRect(40,96,48,53);context.strokeRect(46,102,36,41);
    }
    const result=new T.CanvasTexture(canvas);result.colorSpace=T.SRGBColorSpace;
    result.wrapS=result.wrapT=surface.finish==="book-spine"?T.ClampToEdgeWrapping:T.RepeatWrapping;
    textures.set(key,result);return result;
  }

  function make(surface) {
    return new T.MeshStandardMaterial({name:surface.name,
      color:surface.finish==="book-spine"?0xffffff:surface.colour,
      map:surface.finish?texture(surface):null,
      roughness:surface.roughness,metalness:surface.metalness,
      vertexColors:Boolean(surface.vertexColours)});
  }
  HQ.furnitureSurfaces=Object.freeze({make});
})();

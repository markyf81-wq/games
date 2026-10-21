(function () {
  "use strict";
  const HQ=window.HeroQuest,T=window.HQThree,cache=new Map();
  HQ.componentTextures=Object.freeze({get(id){
    if(cache.has(id))return cache.get(id);
    const asset=HQ.componentArtwork?.[id];if(!asset)throw new Error("Missing local component artwork: "+id);
    // Data URIs avoid runtime fetches and file-origin WebGL image restrictions.
    // GPU texture storage is immutable in the bundled renderer. Allocate the
    // final dimensions before first render, then update pixels in that canvas.
    const canvas=document.createElement("canvas");canvas.width=asset.width;canvas.height=asset.height;
    const ctx=canvas.getContext("2d");ctx.fillStyle="#8d8d7c";ctx.fillRect(0,0,canvas.width,canvas.height);
    const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.name="Component artwork · "+id;
    cache.set(id,texture);
    const image=new Image();image.addEventListener("load",()=>{
      ctx.drawImage(image,0,0,canvas.width,canvas.height);texture.needsUpdate=true;
      window.dispatchEvent(new CustomEvent("heroquest-artwork-ready"));
    });image.src=asset.image;
    return texture;
  }});
})();

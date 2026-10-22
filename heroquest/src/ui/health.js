(function () {
  "use strict";
  const HQ=window.HeroQuest,ns="http://www.w3.org/2000/svg";
  function body(current,maximum) {
    const max=Number.isFinite(maximum)?Math.max(0,Math.trunc(maximum)):0,full=Math.max(0,Math.min(max,Math.trunc(current)||0));
    const row=document.createElement("span"),label="Body: "+full+" of "+max;
    row.className="body-hearts";row.setAttribute("role","img");row.setAttribute("aria-label",label);row.title=label;
    for(let i=0;i<max;i++) {
      const heart=document.createElementNS(ns,"svg"),shape=document.createElementNS(ns,"path");
      heart.setAttribute("class","health-heart "+(i<full?"health-heart--full":"health-heart--empty"));heart.setAttribute("viewBox","0 0 24 24");heart.setAttribute("aria-hidden","true");heart.setAttribute("focusable","false");
      shape.setAttribute("d","M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z");heart.append(shape);row.append(heart);
    }
    return row;
  }
  HQ.health=Object.freeze({body});
})();

(function () {
  "use strict";
  const HQ=window.HeroQuest,ns="http://www.w3.org/2000/svg";
  const names={skull:"Skull","white-shield":"White shield","black-shield":"Black shield"};
  const pips={1:[[0,0]],2:[[-1,-1],[1,1]],3:[[-1,-1],[0,0],[1,1]],4:[[-1,-1],[1,-1],[-1,1],[1,1]],5:[[-1,-1],[1,-1],[0,0],[-1,1],[1,1]],6:[[-1,-1],[1,-1],[-1,0],[1,0],[-1,1],[1,1]]};
  function numbered(host,value) {
    host.replaceChildren();host.classList.add("numbered-die");host.removeAttribute("aria-hidden");host.setAttribute("role","img");host.setAttribute("aria-label",value?"Movement die: "+value:"Movement die: unrolled");
    const svg=document.createElementNS(ns,"svg");svg.setAttribute("viewBox","0 0 40 40");svg.setAttribute("aria-hidden","true");
    for(const [x,y] of pips[value]||[]) {const dot=document.createElementNS(ns,"circle");dot.setAttribute("cx",20+x*10);dot.setAttribute("cy",20+y*10);dot.setAttribute("r","3.2");svg.append(dot);}
    host.append(svg);return host;
  }
  function combat(kind) {
    const die=document.createElement("span"),icon=document.createElement("img");die.className="combat-die "+kind;die.setAttribute("role","img");die.setAttribute("aria-label",names[kind]);
    icon.src="assets/ui/dice/"+kind+".png";icon.alt="";icon.setAttribute("aria-hidden","true");die.append(icon);return die;
  }
  HQ.dieFaces=Object.freeze({numbered,combat});
})();

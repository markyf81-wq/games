(function () {
  "use strict";
  const HQ=window.HeroQuest;
  const turnControls="active-portrait roll-movement open-spellbook open-inventory open-quest-info open-search finish-attacks end-turn menu-button model-viewer-button restart-game sandbox-tools setting-fair-loot action-camera-mode show-sight".split(" ");
  // Both animation and board selection suspend the same global actions.
  function lock() {
    const states=turnControls.map(id=>document.getElementById(id)).filter(Boolean).map(button=>[button,button.disabled]);
    for(const [button] of states)button.disabled=true;
    let released=false;
    return ()=>{if(released)return;released=true;for(const [button,disabled] of states)button.disabled=disabled;};
  }
  HQ.turnControls=Object.freeze({lock});
})();

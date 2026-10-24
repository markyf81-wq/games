(function () {
  "use strict";
  const HQ=window.HeroQuest;
  const slot=HQ.sandbox?.active?"sandbox":"adventure",key=slot==="sandbox"?"heroquest.sandbox.v1":"heroquest.session.v1",version=1;
  const fileFormat="heroquest-save",fileVersion=1,maxFileBytes=2*1024*1024;
  const {object}=HQ.saveValidation;
  const validate=snapshot=>HQ.saveValidation.validate(snapshot,{slot,version});
  function load() {
    try {
      const text=window.localStorage.getItem(key);
      if(text===null)return {snapshot:null,error:""};
      try{return {snapshot:validate(JSON.parse(text)),error:""};}
      catch(error){return {snapshot:null,error:"The saved adventure could not be resumed. Start a new adventure to replace it."};}
    } catch(error){return {snapshot:null,error:"Browser storage is unavailable. Progress cannot be saved on this device."};}
  }
  const snapshot=({state,screen,dice,view})=>({version,savedAt:new Date().toISOString(),state,screen,dice:dice??null,view});
  function save(data) {
    try{window.localStorage.setItem(key,JSON.stringify(snapshot(data)));return "";}
    catch(error){return "Autosave unavailable — progress will be lost on refresh.";}
  }
  function exportText(data) {
    // Validate a detached copy: migrations must never mutate the live game.
    const saved=validate(JSON.parse(JSON.stringify(snapshot(data))));
    return JSON.stringify({format:fileFormat,version:fileVersion,slot,snapshot:saved},null,2);
  }
  function importText(text) {
    if(typeof text!=="string"||text.length>maxFileBytes)throw new Error("Choose a HeroQuest save file smaller than 2 MB.");
    let file;try{file=JSON.parse(text);}catch(error){throw new Error("This is not a readable HeroQuest save file.");}
    if(!object(file)||file.format!==fileFormat||file.version!==fileVersion||!["adventure","sandbox"].includes(file.slot))
      throw new Error("This save file uses an unsupported HeroQuest format.");
    if(file.slot!==slot)throw new Error(file.slot==="sandbox"?"Open Gameplay sandbox to import a sandbox save.":"Open the adventure to import this save; it is not a sandbox save.");
    try{return validate(file.snapshot);}catch(error){throw new Error("This save is incomplete or incompatible with the current game.");}
  }
  HQ.sessionStorage=Object.freeze({key,slot,maxFileBytes,load,save,exportText,importText});
})();

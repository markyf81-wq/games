(function () {
  "use strict";
  const HQ=window.HeroQuest,S=HQ.sessionStorage;
  HQ.createSaveFiles=function({getSnapshot,onImport}) {
    const input=document.createElement("input");input.type="file";input.accept=".json,application/json";input.hidden=true;document.body.append(input);
    const buttons=[...document.querySelectorAll("[data-import-save],[data-export-save]")];
    let status=null,busy=false;
    function notice(text){if(status){status.textContent=text;status.hidden=!text;}}
    function selectStatus(button){status=button.closest("dialog")?.querySelector("[data-save-status]");notice("");}
    function setBusy(value){busy=value;for(const button of buttons)button.disabled=value;input.value="";}
    for(const button of document.querySelectorAll("[data-export-save]"))button.addEventListener("click",()=>{
      if(busy)return;selectStatus(button);
      try {
        const data=getSnapshot();if(!data)throw new Error("Start or load an adventure first.");
        const text=S.exportText(data),url=URL.createObjectURL(new Blob([text],{type:"application/json"})),link=document.createElement("a");
        link.href=url;link.download="heroquest-"+S.slot+"-"+new Date().toISOString().replace(/[:.]/g,"-")+".json";
        document.body.append(link);
        try{link.click();}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
      } catch(error){notice(error.message||"The save file could not be exported.");}
    });
    for(const button of document.querySelectorAll("[data-import-save]"))button.addEventListener("click",()=>{
      if(busy)return;selectStatus(button);input.value="";input.click();
    });
    input.addEventListener("change",async()=>{
      const file=input.files[0];if(!file||busy)return;setBusy(true);
      try {
        if(file.size>S.maxFileBytes)throw new Error("Choose a HeroQuest save file smaller than 2 MB.");
        const saved=S.importText(await file.text()),s=saved.state,details=document.createElement("p"),party=document.createElement("p");
        const phase={"hero-turn":"Heroes’ turn","monster-turn":"Zargon’s turn",victory:"Quest completed",retreat:"Party retreated",defeat:"Party defeated"}[s.phase];
        details.textContent="The Trial · Round "+s.round+" · "+phase;
        party.textContent=s.heroes.map(hero=>hero.owner+" · "+hero.name).join(", ");
        const replacing=Boolean(getSnapshot()),confirmed=await HQ.dialogs.ask({title:replacing?"Replace this adventure?":"Load this adventure?",kicker:"IMPORT SAVE",
          description:"Replaces this browser’s save for this mode, if any, then reloads the game.",confirmLabel:"Import save",content:[details,party]});
        if(!confirmed)return;
        const error=onImport(saved);if(error)throw new Error(error);
      } catch(error){notice(error.message||"The save file could not be imported.");}
      finally{setBusy(false);}
    });
  };
})();

(function () {
  "use strict";
  const HQ=window.HeroQuest,list=Object.freeze([HQ.trial,HQ.ragnarQuest]),byId=new Map(list.map(quest=>[quest.id,quest]));
  const original=HQ.trial;
  const forState=state=>byId.get(state?.contentVersion);
  // Geometry/topology stay immutable throughout a page session. Importing or
  // embarking saves first, then reloads into the selected quest's scene.
  let current=original;
  try {
    const sandbox=new URLSearchParams(window.location.search).get("sandbox")==="1";
    if(!sandbox)current=forState(JSON.parse(window.localStorage.getItem("heroquest.session.v1"))?.state)||original;
  } catch(error){/* Storage/validation errors are reported by session/storage. */}
  HQ.quests=Object.freeze({list,forState,byId:id=>byId.get(id),first:original,current,
    next:state=>list[list.findIndex(quest=>quest.id===state.contentVersion)+1]||null});
})();

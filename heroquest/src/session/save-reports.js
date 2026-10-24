(function () {
  "use strict";
  const HQ=window.HeroQuest,Q=HQ.trial,T=HQ.topology,Data=HQ.combatData;
  const {object,integer,boolean,expect}=HQ.saveValidation;
  // Recorded results are checked without resolving a roll or changing a queue.
  HQ.validateSavedReports=function(s,{heroIds,monsterIds,doorIds,trapIds,trapDefinitions,roomIds,treasure,itemIds,oldEffects}){
    if(s.lastItemUse!==null) {
      const use=s.lastItemUse,owner=s.heroes.find(hero=>hero.id===use?.heroId);
      const definition=HQ.itemData.byId[use?.itemKind];
      expect(object(use)&&owner&&integer(use.id,1,s.nextCombatId-1)&&use.heroName===owner.name&&definition?.category==="potion"&&typeof use.itemId==="string"&&!itemIds.includes(use.itemId));
      expect(Array.isArray(use.redDice)&&use.maxBody===owner.maxBody&&integer(use.bodyBefore,0,use.maxBody));
      if(definition.healingDice) {
        expect(use.redDice.length===1&&integer(use.redDice[0],1,6)&&use.bodyBefore<use.maxBody);
        expect(use.bodyAfter===Math.min(use.maxBody,use.bodyBefore+use.redDice[0])&&use.healed===use.bodyAfter-use.bodyBefore);
      } else expect(use.redDice.length===0&&use.bodyBefore>0&&use.bodyAfter===use.bodyBefore&&use.healed===0&&use.detail===definition.summary);
    }
    if(s.lastReport!==null) {
      const r=s.lastReport,actors=new Set([...s.heroes.map(h=>h.id),...monsterIds]);
      expect(object(r)&&integer(r.id,1)&&actors.has(r.attackerId)&&typeof r.attackerName==="string");
      if(r.type==="combat") {
        expect(actors.has(r.defenderId)&&typeof r.defenderName==="string"&&["hero","monster"].includes(r.attackerSide));
        expect(["white-shield","black-shield"].includes(r.shield));
        for(const [rolls,max] of [[r.attackDice,8],[r.defendDice,9]])expect(Array.isArray(rolls)&&rolls.length<=max&&rolls.every(face=>Data.faces.includes(face)));
        for(const field of ["skulls","shields","damage","unblockedHits","bodyBefore","bodyAfter","maxBody"])expect(integer(r[field],0,12));
        expect(boolean(r.defeated));
        if(r.spellId!==undefined)expect(r.spellId==="genie"&&s.heroes.find(hero=>hero.id===r.attackerId)?.spellsUsed.includes("genie")&&r.attackDice.length===5);
        if(r.weaponId!==undefined)expect(r.attackerSide==="hero"&&r.spellId===undefined&&Object.hasOwn(Data.weapons,r.weaponId));
        if(r.thrownItemId!==undefined)expect(r.weaponId==="dagger"&&s.heroes.some(hero=>hero.id===r.attackerId)&&typeof r.thrownItemId==="string"&&/^[a-z0-9-]{1,80}$/.test(r.thrownItemId)&&!itemIds.includes(r.thrownItemId));
      } else if(r.type==="spell") {
        const card=HQ.spellData.byId[r.spellId],caster=s.heroes.find(hero=>hero.id===r.attackerId),target=[...s.heroes,...s.monsters].find(actor=>actor.id===r.defenderId);
        expect(card?.implemented&&caster&&target&&caster.spellsUsed.includes(card.id)&&typeof r.defenderName==="string"&&typeof r.detail==="string");
        const count=r.spellId==="swift-wind"&&r.redDice?.length?r.redDice.length:r.spellId==="ball-of-flame"?2:r.spellId==="fire-of-wrath"?1:r.spellId==="sleep"?target.mind:0;
        expect(Array.isArray(r.redDice)&&r.redDice.length===count&&r.redDice.every(d=>integer(d,1,6)));
        if(r.spellId==="swift-wind")expect([0,1,2].includes(r.redDice.length));
        for(const field of ["bodyBefore","bodyAfter","maxBody","damage","healed"])expect(integer(r[field],0,12));
        expect(boolean(r.defeated)&&r.maxBody===target.maxBody&&r.bodyAfter<=r.maxBody&&r.damage===Math.max(0,r.bodyBefore-r.bodyAfter)&&r.healed===Math.max(0,r.bodyAfter-r.bodyBefore));
        if(oldEffects){r.rollRole="monster";r.rollDescription=r.redDice.length?"Each 5 or 6 prevents one Body damage":"";}
        expect(["hero","monster"].includes(r.rollRole)&&typeof r.rollDescription==="string");
      } else if(r.type==="spell-door")expect(r.spellId==="genie"&&doorIds.has(r.doorId)&&s.openDoors.includes(r.doorId)&&s.heroes.find(hero=>hero.id===r.attackerId)?.spellsUsed.includes("genie")&&typeof r.detail==="string");
      else if(r.type==="sleep-check")expect(monsterIds.has(r.attackerId)&&r.defenderId===r.attackerId&&r.spellId==="sleep"&&Array.isArray(r.redDice)&&r.redDice.length===s.monsters.find(monster=>monster.id===r.attackerId).mind&&r.redDice.every(d=>integer(d,1,6))&&boolean(r.awake)&&r.awake===r.redDice.includes(6)&&r.rollRole==="monster"&&typeof r.rollDescription==="string"&&typeof r.detail==="string");
      else if(r.type==="stone-move")expect(heroIds.has(r.attackerId)&&r.defenderId===r.attackerId&&s.heroes.some(hero=>hero.id===r.attackerId)&&boolean(r.defeated)&&typeof r.detail==="string"&&integer(r.bodyBefore,1,12)&&integer(r.bodyAfter,0,12)&&integer(r.maxBody,1,12));
      else if(r.type==="treasure") {
        const owner=s.heroes.find(hero=>hero.id===r.attackerId);
        expect(owner&&r.defenderId===owner.id&&typeof r.defenderName==="string"&&typeof r.detail==="string"&&boolean(r.endTurn)&&boolean(r.defeated)&&r.maxBody===owner.maxBody&&integer(r.bodyBefore,1,owner.maxBody));
        expect(r.bodyAfter===r.bodyBefore-r.damage&&[0,1].includes(r.damage)&&r.defeated===(r.bodyAfter===0)&&r.endTurn===(r.damage===1));
        expect(object(r.search));
      }
      else if(r.type==="dungeon-search")expect(heroIds.has(r.attackerId)&&["traps","doors"].includes(r.searchKind)&&integer(r.found,0,trapIds.size+HQ.dungeon.layout(s).doors.length)&&typeof r.detail==="string");
      else if(r.type==="trap") {
        const owner=s.heroes.find(hero=>hero.id===r.attackerId),definition=trapDefinitions.find(trap=>trap.id===r.trapId);
        expect(owner&&(definition||r.operation==="jump"&&r.trapId===null&&r.trapKind==="clear")&&r.defenderId===owner.id&&r.defenderName===owner.name&&r.trapKind===(definition?.kind||"clear")&&["hidden","found","sprung","clear"].includes(r.statusBefore)&&["spring","jump","disarm"].includes(r.operation)&&typeof r.detail==="string");
        expect(Array.isArray(r.rolls)&&r.rolls.length<=2&&r.rolls.every(group=>object(group)&&typeof group.label==="string"&&typeof group.description==="string"&&Array.isArray(group.faces)&&group.faces.length>=1&&group.faces.length<=3&&group.faces.every(face=>Data.faces.includes(face))));
        expect(integer(r.bodyBefore,1,owner.maxBody)&&integer(r.bodyAfter,0,owner.maxBody)&&r.maxBody===owner.maxBody&&r.damage===r.bodyBefore-r.bodyAfter&&r.defeated===(r.bodyAfter===0)&&boolean(r.endTurn));
        if(r.jumpFrom!==undefined)expect(T.floor.has(r.jumpFrom)&&T.floor.has(r.jumpTo));
        if(r.fallingFrom!==undefined)expect(definition?.kind==="falling-block"&&T.neighbors(HQ.dungeon.cell(definition)).includes(r.fallingFrom)&&(r.escaped===undefined||boolean(r.escaped)));
      }
      else if(r.type==="monster-skip")expect(monsterIds.has(r.attackerId)&&r.reason==="Tempest · misses this turn");
      else expect(r.type==="monster-move"&&integer(r.steps,0,10));
      if(r.search!==undefined) {
        const find=r.search,owner=s.heroes.find(hero=>hero.id===find?.heroId),instance=HQ.treasureData.instancesById[find?.cardId],card=HQ.treasureData.byId[instance?.kind],special=Q.treasureRooms[find?.roomId];
        expect(["treasure","combat"].includes(r.type)&&object(find)&&owner&&roomIds.has(find.roomId)&&treasure.searched[owner.id].includes(find.roomId)&&integer(find.gold)&&boolean(find.immediateAttack));
        if(find.cardId===null)expect(special&&find.specialId===special.note&&treasure.claimed.includes(find.roomId)&&find.gold===(special.gold||0)&&find.itemId===null&&find.wanderingId===null&&!find.immediateAttack);
        else {
          expect(card&&find.specialId===null&&find.gold===(card.gold||0));
          expect((["gold","potion"].includes(card.category)?treasure.removed:treasure.deck).includes(find.cardId));
          expect(find.itemId===(card.category==="potion"?find.cardId:null));
          if(find.wanderingId!==null)expect(card.category==="monster"&&monsterIds.has(find.wanderingId)&&find.wanderingId.startsWith("wanderer-"));
          else expect(!find.immediateAttack);
          if(r.type==="treasure")expect(r.damage===(card.category==="hazard"?1:0));
        }
        if(r.type==="combat")expect(find.immediateAttack&&r.attackerSide==="monster"&&r.attackerId===find.wanderingId&&r.defenderId===owner.id);
      }
      if(r.recovery!==undefined) {
        const owner=s.heroes.find(hero=>hero.id===r.defenderId),use=s.lastItemUse;
        expect(["combat","treasure","trap"].includes(r.type)&&object(r.recovery)&&r.defeated&&r.bodyAfter===0&&owner&&integer(r.recovery.bodyAfter,1,owner.maxBody)&&r.recovery.healed===r.recovery.bodyAfter);
        if(r.recovery.spellId!==undefined){
          expect(r.recovery.itemUseId===undefined&&["heal-body","water-of-healing"].includes(r.recovery.spellId)&&HQ.spells.book(owner).some(card=>card.id===r.recovery.spellId)&&owner.spellsUsed.includes(r.recovery.spellId)&&integer(r.recovery.spellReportId,r.id+1,s.nextCombatId-1)&&r.recovery.bodyAfter===Math.min(4,owner.maxBody));
        }else{
          expect(integer(r.recovery.itemUseId,1,s.nextCombatId-1));
          if(use?.id===r.recovery.itemUseId)expect(use.heroId===owner.id&&use.bodyBefore===0&&use.bodyAfter===r.recovery.bodyAfter);
        }
      }
      if(r.belongings!==undefined){
        const record=r.belongings,owner=s.heroes.find(hero=>hero.id===r.defenderId);
        expect(object(record)&&owner?.deathResolved&&r.defeated&&!r.recovery&&["empty","claimed","lost","dropped"].includes(record.outcome)&&integer(record.items,0,HQ.inventory.limit)&&integer(record.gold));
        expect(record.outcome==="claimed"?s.heroes.some(hero=>hero.id===record.recipientId&&hero.id!==owner.id):record.recipientId===null);
      }
    }
  };
})();

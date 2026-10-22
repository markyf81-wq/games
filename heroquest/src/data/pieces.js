(function () {
  "use strict";
  const HQ=window.HeroQuest;
  // Reusable public model metadata only; never quest placements or hidden notes.
  const descriptions={
    stairs:"The stairway connects these catacombs to the world above.",torch:"An iron wall sconce holds a torch that casts warm light into the room.",bookcase:"A tall wooden bookcase stands against the dungeon wall.",
    "weapons-rack":"Weapons hang from this wooden rack.",cupboard:"Heavy wooden doors conceal the contents of this cupboard.","alchemists-bench":"Bottles and instruments cover this alchemist’s workbench.",
    "sorcerers-table":"A sorcerer’s table holds the tools of arcane study.","torture-rack":"A heavy wooden rack occupies this part of the dungeon.",
    table:"A sturdy wooden table takes up several floor squares.",chest:"A closed treasure chest rests on the dungeon floor.",
    throne:"An imposing throne stands in the chamber.",fireplace:"A stone fireplace is built into the room’s edge.",
    tomb:"A heavy stone tomb rests in this chamber.",blocked:"Fallen stone blocks passage through this square.",
    barbarian:"The Barbarian relies on strength and his broadsword in battle.",dwarf:"The Dwarf is a hardy warrior armed with a shortsword.",
    elf:"The Elf combines swordsmanship with knowledge of magic.",wizard:"The Wizard relies on magic and carries a small dagger.",
    orc:"A brutish Orc watches for intruders in the catacombs.",goblin:"A nimble Goblin lurks in the dungeon.",
    "orc-mace":"An Orc miniature carries a heavy mace.","orc-sword":"An Orc miniature brandishes a sword.",
    "goblin-dagger":"A Goblin miniature grips a short dagger.","goblin-axe":"A Goblin miniature carries an axe.",
    skeleton:"An animated skeleton guards this stretch of the catacombs.",zombie:"A shambling Zombie wanders the dungeon.",
    mummy:"An ancient Mummy guards the catacombs.",fimir:"A one-eyed Fimir stalks the dungeon halls.",
    "chaos-warrior":"A heavily armoured Chaos Warrior stands ready for battle.",gargoyle:"A fearsome Gargoyle guards the depths of the catacombs."
  };
  const catalog=[
    ["Heroes",[["barbarian","Barbarian"],["dwarf","Dwarf"],["elf","Elf"],["wizard","Wizard"]]],
    ["Monsters",[["orc","Orc · Cleaver"],["orc-mace","Orc · Mace"],["orc-sword","Orc · Sword"],["goblin","Goblin · Sword"],["goblin-dagger","Goblin · Dagger"],["goblin-axe","Goblin · Axe"],["skeleton","Skeleton"],["zombie","Zombie"],["mummy","Mummy"],["fimir","Fimir"],["chaos-warrior","Chaos Warrior"],["gargoyle","Gargoyle"]]],
    ["Furniture",[["table","Wooden table"],["alchemists-bench","Alchemist’s bench"],["torture-rack","Torture rack"],["sorcerers-table","Sorcerer’s table"],["fireplace","Fireplace"],["chest","Treasure chest"],["throne","Throne"],["tomb","Tomb"],["door","Closed door"],["open-door","Open door"],["stairs","Stairway"],["bookcase","Bookcase"],["cupboard","Cupboard"],["weapons-rack","Weapons rack"]]],
    ["Scenery",[["wall-one","Stone wall · one space"],["wall-two","Stone wall · two spaces"],["blocked","Blocked square"],["torch","Wall torch"]]],
    ["Dice",[["movement-die","Red movement die"],["combat-die","Combat die"]]]
  ];
  HQ.pieceCatalog=Object.freeze(catalog.map(([label,entries])=>Object.freeze({label,
    entries:Object.freeze(entries.map(([id,name])=>Object.freeze({id,name,description:descriptions[id]||""})))})));
  HQ.pieces=Object.freeze(Object.fromEntries(HQ.pieceCatalog.flatMap(group=>group.entries.map(piece=>[piece.id,piece]))));
  const variants={orc:["orc","orc-mace","orc-sword"],goblin:["goblin","goblin-dagger","goblin-axe"]};
  // Appearance only: stable quest order, no extra rule kinds or RNG/save fields.
  HQ.monsterModel=(kind,id)=>{const models=variants[kind];if(!models)return kind;
    const index=HQ.trial.monsters.filter(monster=>monster.kind===kind).findIndex(monster=>monster.id===id);
    return models[Math.max(0,index)%models.length];};
})();

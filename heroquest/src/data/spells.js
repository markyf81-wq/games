(function () {
  "use strict";
  const HQ=window.HeroQuest;
  // Original NA card wording, visually transcribed from each group's PDF p1.
  // Keep summaries separate from the full printed descriptions.
  const descriptions={
    "genie":"This spell conjures up a Genie who will do one of the following: open any door on the board (revealing what lies beyond), OR use 5 combat dice to attack any monster within your line of sight.",
    "tempest":"This spell creates a small whirlwind that envelops one monster of your choice. That monster will then miss its next turn.",
    "swift-wind":"This spell may be cast on any one Hero, including yourself. Its powerful burst of energy enables that Hero to roll twice as many red dice as normal the next time he moves.",
    "heal-body":"This spell may be cast on any one Hero, including yourself. Its magical power will immediately restore up to 4 lost Body Points, but does not give a Hero more than his starting number.",
    "rock-skin":"This spell may be cast on any one Hero, including yourself. That Hero may throw one extra combat die when defending. The spell is broken when the Hero suffers 1 point of Body damage.",
    "pass-through-rock":"This spell can be cast on any one Hero, including yourself. That Hero may then move through walls on his next move. He may move through as many walls as his die roll allows.\n\nCaution! There are shaded areas on each Quest Map which indicate solid rock. If a Hero ends his move in one of these areas, he is trapped forever!",
    "ball-of-flame":"This spell may be cast on any one monster, enveloping it in a ball of fire. It will inflict 2 Body Points of damage. The monster then rolls two red dice. For each 5 or 6 rolled, the damage is reduced by 1 point.",
    "fire-of-wrath":"This spell may be cast on any one monster, blasting it with flames. It will inflict 1 Body Point of damage, unless the monster can immediately roll a 5 or 6 using one red die.",
    "courage":"This spell may be cast on any one Hero, including yourself. The next time that Hero attacks, he may roll two extra combat dice. The spell is broken the moment the Hero can no longer “see” a monster.",
    "sleep":"This spell puts a monster into a deep sleep so it cannot move, attack, or defend itself. The spell can be broken at once or on a future turn by a monster rolling one red die for each of its Mind Points. If a 6 is rolled, the spell is broken.\n\nMay not be used against Mummies, Zombies or Skeletons.",
    "water-of-healing":"This spell may be cast on any one Hero, including yourself. Contact with this revitalizing water will restore up to 4 lost Body Points, but will not give a Hero more than his starting number.",
    "veil-of-mist":"This spell may be cast on any one Hero, including yourself. On the Hero’s next move, he may move unseen through spaces that are occupied by monsters."
  };
  const cards=[
    ["genie","Air","Genie","Open any door, or attack a visible monster with five combat dice.","monster",true],
    ["tempest","Air","Tempest","One visible monster misses its next turn.","monster",true],
    ["swift-wind","Air","Swift Wind","A hero rolls twice the normal red dice on their next move.","hero",true],
    ["heal-body","Earth","Heal Body","Restore up to four lost Body Points to a visible hero, including yourself.","hero",true],
    ["rock-skin","Earth","Rock Skin","A visible hero defends with one extra combat die until they suffer Body damage.","hero",true],
    ["pass-through-rock","Earth","Pass Through Rock","A hero may pass through walls on their next move. Ending in solid rock traps them forever.","hero",true],
    ["ball-of-flame","Fire","Ball of Flame","Deal two Body damage to a visible monster. It rolls two red dice; each 5 or 6 prevents one damage.","monster",true],
    ["fire-of-wrath","Fire","Fire of Wrath","Deal one Body damage to a visible monster unless it rolls 5 or 6 on one red die.","monster",true],
    ["courage","Fire","Courage","A hero gains two attack dice for their next attack. The spell breaks when they can no longer see a monster.","hero",true],
    ["sleep","Water","Sleep","A monster cannot move, attack or defend until it breaks the spell with its Mind dice. Undead are immune.","monster",true],
    ["water-of-healing","Water","Water of Healing","Restore up to four lost Body Points to a visible hero, including yourself.","hero",true],
    ["veil-of-mist","Water","Veil of Mist","A hero may pass through monster-occupied squares on their next move.","hero",true]
  ].map(([id,group,name,summary,target,implemented])=>Object.freeze({id,group,name,summary,description:descriptions[id],target,implemented,
    artwork:"assets/ui/spells/"+id+".jpg",source:Object.freeze({id:"system-"+group.toLowerCase()+"-spells",pdfPage:1,locator:name,review:"visually reviewed 2026-10-22"})}));
  HQ.spellData=Object.freeze({groups:Object.freeze(["Air","Earth","Fire","Water"]),cards:Object.freeze(cards),byId:Object.freeze(Object.fromEntries(cards.map(card=>[card.id,card])))});
})();

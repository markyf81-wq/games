/* Printed card artwork is authoritative. See RULES.md for tie and timing rulings. */
window.FKCards = (() => {
  'use strict';
  const rows = ['combat', 'ranged', 'siege'];
  const names = {
    combat: [
      'Mimic',
      'Peasant',
      'Cleric',
      'Footman',
      'Shield Bearer',
      'Pikeman',
      'Swordsman',
      'Assassin',
      'Executioner',
      'Mounted Cavalry',
      'Knight',
      'King’s Guard',
      'Commander',
      'Giant',
      'Crusader',
      'King Ethoroc'
    ],
    ranged: [
      'Target',
      'Farmer',
      'Druid',
      'Archer',
      'Spearman',
      'Engineer',
      'Elven Warrior',
      'The Spy',
      'Javelinist',
      'Axe Thrower',
      'Dwarven Shooter',
      'Mad Gasser',
      'Pyromaniac',
      'Wizard',
      'Queen’s Ranger',
      'Queen Krath'
    ],
    siege: [
      'Stone Wall',
      'Ladder Bearers',
      'Repair Men',
      'Battering Ram',
      'Arrow Launcher',
      'Stone Cannon',
      'Steam Cart',
      'Mechanical Men',
      'Wall Crusher',
      'Catapult',
      'Watchtower',
      'Trebuchet',
      'Zeplin',
      'Doom Cannon',
      'Siege Engine',
      'Dreadhold'
    ]
  };
  const abilityNames = {
    infiltration: 'Infiltration',
    restoration: 'Restoration',
    convert: 'Convert',
    accuracy: 'Accuracy',
    shielded: 'Shielded',
    bloodRage: 'Blood Rage',
    fortified: 'Fortified',
    deathGaze: 'Death Gaze'
  };
  const abilities = {
    infiltration:
      'Play on the enemy’s matching row, adding to their score. Then draw 2 cards from the shared deck.',
    restoration: 'When played, return 1 unit of this row type from your destroyed pile to your hand.',
    convert:
      'Swap this unit with the lowest-power enemy Combat unit. Choose one if tied. Neither unit can enter a row blocked by Dread.',
    accuracy:
      'Gain +1 power for every friendly Ranged unit, including Target itself. Recalculate after each turn.',
    shielded:
      'Friendly Siege units, including Stone Wall itself, cannot be destroyed while Stone Wall is in play, except by your own Sacrifice. Round cleanup still clears the row.',
    bloodRage: 'Gain +1 power for every enemy Combat unit in play. Recalculate after each turn.',
    fortified: 'Gain +1 power for every other friendly Siege unit. Recalculate after each turn.',
    deathGaze: 'When played, destroy 1 highest-power enemy Ranged unit. Choose one if tied.'
  };
  const cards = {};
  rows.forEach((row) =>
    names[row].forEach((name, power) => {
      let ability = null;
      if (power === 2) ability = 'restoration';
      if (power === 7) ability = 'infiltration';
      if (power === 0) ability = { combat: 'convert', ranged: 'accuracy', siege: 'shielded' }[row];
      if (power === 15) ability = { combat: 'bloodRage', ranged: 'deathGaze', siege: 'fortified' }[row];
      const id = `${row}-${power}`;
      cards[id] = {
        id,
        name,
        type: 'unit',
        row,
        power,
        ability,
        abilityName: abilityNames[ability] || '',
        text: abilities[ability] || `A ${power}-power ${row} unit.`,
        image: `assets/cards/${id}.jpg`
      };
    })
  );
  [
    [
      'decoy',
      'Decoy',
      'Return 1 friendly unit to your hand. Sanctuary blocks this Spell, including on your own units.'
    ],
    [
      'pridefall',
      'Pridefall',
      'Destroy the highest-power unprotected unit on each side, including all unprotected units tied at that power.'
    ],
    [
      'weakest-link',
      'Weakest Link',
      'Destroy up to 3 lowest-power unprotected units on each side. Choose between ties at the cutoff.'
    ],
    ['patience', 'Patience', 'Do nothing. Your turn ends, but you have not passed.'],
    [
      'sacrifice',
      'Sacrifice',
      'Destroy 1 friendly unit, ignoring Shielded. Sanctuary still blocks this Spell. Then bring up to 2 units already in your destroyed pile into your hand. You cannot return the unit sacrificed in this play. Returned units are not played and their abilities do not trigger.'
    ],
    [
      'catastrophe',
      'Catastrophe',
      'Destroy every card in play on both sides, except protected units. Protection is checked before anything is removed.'
    ],
    [
      'purge',
      'Purge',
      'Destroy all Omens in play, including weather and Omens on rows. May be played when no Omens are in play.'
    ]
  ].forEach(([slug, name, text]) => {
    const id = `spell-${slug}`;
    cards[id] = { id, name, type: 'spell', effect: slug, text, image: `assets/cards/${id}.jpg` };
  });
  [
    [
      'war-chant',
      'War Chant',
      null,
      'Add 2 power to each unit in one friendly row. This bonus is applied after weather.'
    ],
    [
      'dread',
      'Dread',
      null,
      'Place on an enemy row. No new unit cards can enter that row, including units moved by Convert. Omens can still enter. Ironward suppresses this restriction.'
    ],
    [
      'blizzard',
      'Blizzard',
      'combat',
      'Set all Combat units on both sides to 1 power before War Chant bonuses.'
    ],
    [
      'thunderstorm',
      'Thunderstorm',
      'ranged',
      'Set all Ranged units on both sides to 1 power before War Chant bonuses.'
    ],
    ['flood', 'Flood', 'siege', 'Set all Siege units on both sides to 1 power before War Chant bonuses.'],
    [
      'ironward',
      'Ironward',
      null,
      'Friendly units in this row ignore all Omens, including War Chant bonuses and weather. Suppress Dread’s restriction so new units can enter this row.'
    ],
    [
      'sanctuary',
      'Sanctuary',
      null,
      'Friendly units in this row are unaffected by Spells. Unit abilities still affect them.'
    ]
  ].forEach(([slug, name, weather, text]) => {
    const id = `omen-${slug}`;
    cards[id] = {
      id,
      name,
      type: 'omen',
      effect: slug,
      weather,
      text,
      image: `assets/cards/${id}.jpg${slug === 'dread' ? '?v=dread54' : ''}`
    };
  });
  return Object.freeze({
    cards: Object.freeze(cards),
    ids: Object.freeze(Object.keys(cards)),
    rows: Object.freeze(rows)
  });
})();

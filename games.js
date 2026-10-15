// The library catalog. Add a record only once the game's folder exists.
// Paths are relative to this repository's root, so the library also works offline.
const GAME_CATALOG = [
  {
    id: 'type-tails',
    title: 'Type & Tails',
    subtitle: 'A little practice. A lot of personality.',
    description: 'Practice touch typing with Pip, your playful cat. Try fresh word selections from home-row and keyboard-reach practice pools, unlock new difficulties by speed, earn coins, and decorate your cozy little room.',
    category: 'Learning',
    tags: ['Typing', 'Pets', 'Cozy'],
    path: 'type-tails/index.html',
    image: 'previews/type-tails.svg',
    imageAlt: 'Pip the cat in a sunny room with a sofa, window, and toys',
    accent: '#dce7d8',
    detail: '20 random words · 8 difficulties'
  },
  {
    id: 'bomb-major',
    title: 'Bomb Major',
    subtitle: 'A chasing bomb. A bouncing block. One more try.',
    description: 'Keep your characters safe with a bouncing block, helpful cats and cows, shields, banana peels and string. Collect coins for permanent marketplace upgrades between attempts and beat your local high scores.',
    category: 'Arcade',
    tags: ['Survival', 'Clicking', 'Coins'],
    path: 'bomb-major/index.html',
    image: 'previews/bomb-major.svg',
    imageAlt: 'An illustrated courtyard with a chasing bomb, sage block, characters, Pip the cat, and gold coins',
    accent: '#d3ddc3',
    detail: 'Dodge · collect · upgrade your abilities'
  }
];

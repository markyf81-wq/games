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
    description: 'Keep your characters out of trouble, send the block into the bomb to freeze it, and collect coins. Watch for magnets and a very helpful cat.',
    category: 'Arcade',
    tags: ['Survival', 'Clicking', 'Coins'],
    path: 'bomb-major/index.html',
    image: 'previews/bomb-major.svg',
    imageAlt: 'The Bomb Major arena with a bomb, blue block, human, cat, and coins',
    accent: '#99bc91',
    detail: 'Click to dodge · collect & survive'
  }
];
